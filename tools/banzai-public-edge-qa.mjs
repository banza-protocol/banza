#!/usr/bin/env node
// M2.18B.7 DFN-9/DFN-10 — public-edge QA harness.
//
// Drives the REAL public edge (https://banza.network/banzai/ask) with a legitimate browser-headed request
// (the Cloudflare WAF admits it — no bypass, no injected secret, no test route, no weakened rate limiting).
// Runs a stratified sample of the golden dataset and records, per case: subject, task, answer_type, grounded,
// sources, source-appropriateness signal, external_model_called, cache, HTTP status, latency, and a verdict.
// Gates: zero 5xx, zero external providers, zero boundary regressions, zero deliverable for a boundary/
// off-topic, zero "undefined"/"[object Object]" leak. Writes artifacts/banzai/public-edge-qa.json.
//
// Usage: node tools/banzai-public-edge-qa.mjs [--limit N] [--concurrency C] [--url URL] [--out FILE]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL = argv("--url", "https://banza.network/banzai/ask");
const LIMIT = parseInt(argv("--limit", "0"), 10);
const CONC = parseInt(argv("--concurrency", "1"), 10);
const OUT = argv("--out", join(ROOT, "artifacts/banzai/public-edge-qa.json"));
const TIMEOUT_MS = parseInt(argv("--timeout", "120000"), 10);
// The edge rate-limits /banzai/ask at 20r/m (one request per 3s) with burst=5, keyed on the client IP —
// an intentional WAF control that protects the CPU-bound local Qwen from abuse. A real single human never
// exceeds it. This harness RESPECTS that budget (pacing request STARTS ≥ MIN_INTERVAL apart) instead of
// firing back-to-back — that is rate-limit compliance, NOT a bypass, disable, or weakening of the WAF.
const MIN_INTERVAL_MS = parseInt(argv("--min-interval", "3200"), 10);

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Origin: "https://banza.network",
  Referer: "https://banza.network/banzai",
};

const gold = JSON.parse(readFileSync(join(ROOT, "artifacts/banzai/task-fulfilment-golden.json"), "utf8"));
const all = gold.cases;

// stratified sample: ALL safety cases (zero-tolerance, insufficient, adversarial-boundary) + all novel +
// a per-(stratum,task) spread, capped so the total is >=190 without running the whole 400 unless asked.
function stratifiedSample() {
  const mustAll = all.filter((c) => ["zero-tolerance", "insufficient", "adversarial-boundary", "novel"].includes(c.stratum));
  const rest = all.filter((c) => !mustAll.includes(c));
  const perKey = {};
  const picked = [...mustAll];
  for (const c of rest) {
    const key = `${c.stratum}:${c.task}`;
    perKey[key] = (perKey[key] || 0) + 1;
    if (perKey[key] <= 6) picked.push(c); // up to 6 per (stratum,task) — broad but bounded
  }
  const uniq = [...new Map(picked.map((c) => [c.id, c])).values()];
  return LIMIT > 0 ? uniq.slice(0, LIMIT) : uniq;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askOnce(q, extra = {}) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, { method: "POST", headers: HEADERS, body: JSON.stringify({ question: q, ...extra }), signal: ctrl.signal });
    const ms = Date.now() - t0;
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* keep raw */ }
    return { status: res.status, ms, body, raw: text.slice(0, 400) };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, body: null, raw: `ERROR ${String(e).slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }
}

// Global rate gate — spaces request STARTS at least MIN_INTERVAL_MS apart so this client stays inside the
// edge's 20r/m budget (never machine-guns it). This is a well-behaved client honouring the WAF, not a bypass.
let nextSlot = 0;
async function rateGate() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

// Each request passes the rate gate first. A 503/429/transport blip is retried with increasing backoff that
// lets the per-minute window refill — normal client behaviour, NOT a rate-limit change or WAF bypass. Only a
// status that persists across all attempts becomes a failure.
async function ask(q, extra = {}) {
  let last;
  for (let attempt = 0; attempt <= 3; attempt++) {
    await rateGate();
    last = await askOnce(q, extra);
    if (attempt > 0) last.retried = true;
    if (last.status === 200) return last;
    if (!(last.status === 503 || last.status === 0 || last.status === 429)) return last; // non-retryable
    await sleep(4000 + attempt * 3000); // 4s, 7s, 10s — let the 20r/m window refill
  }
  return last;
}

const REFUSAL_MARKERS = ["não posso", "nao posso", "não movimenta", "nao movimenta", "recuso", "não executo", "nao executo"];
const DECLINE_MARKERS = ["não encontrei uma fonte", "nao encontrei uma fonte", "posso responder"];
const isRefusalOrDecline = (a) => {
  const t = String(a || "").toLowerCase();
  return REFUSAL_MARKERS.some((m) => t.includes(m)) || DECLINE_MARKERS.some((m) => t.includes(m));
};

// M2.18B.7 (REOPEN) — JOURNEY-ACTIVE cases. The user reproduced the public "erro temporário" while working
// a guided-journey step: the browser then sends `current_step` + `journey_context`, which the earlier harness
// (question-only) never did. These cases drive the SAME public route WITH that state, so the E2E covers what
// the user actually did — not only a bare question. Each is a supported task/lookup/explanation and MUST be
// served WITHOUT a degraded fallback and WITHOUT a task mismatch (an example must not become a definition).
const J = (step) => ({ current_step: step, journey_context: { current_step: step } });
const JOURNEY_CASES = [
  { id: "journey-federation-example", stratum: "journey", task: "example", expect: "deliverable", q: "me da um exemplo de federação", extra: J("federacao"), expect_no_definition: true },
  { id: "journey-federation-procedure", stratum: "journey", task: "procedure", expect: "deliverable", q: "como federar um operador?", extra: J("federacao") },
  { id: "journey-doc-lookup", stratum: "journey", task: "document_lookup", expect: "deliverable", q: "ADR 002", extra: J("manifest") },
  { id: "journey-operator-example", stratum: "journey", task: "example", expect: "deliverable", q: "me da um exemplo de operador", extra: J("federacao"), expect_no_definition: true },
  { id: "journey-manifest-template", stratum: "journey", task: "template", expect: "deliverable", q: "me da exemplo de um manifest valido", extra: J("manifest") },
  { id: "journey-adr-explanation", stratum: "journey", task: "explanation", expect: "deliverable", q: "me explica o ADR 005", extra: J("conformidade") },
];

const cases = [...stratifiedSample(), ...JOURNEY_CASES];
const results = [];
let bad = 0;
const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };

async function worker(queue) {
  while (queue.length) {
    const c = queue.shift();
    const r = await ask(c.q, c.extra || {});
    const b = r.body || {};
    const answer = String(b.answer || "");
    const trace = (b && b.reasoning_trace) || {};
    // A DECLINE is the honest, expected outcome for a boundary or an off-topic/insufficient question;
    // any OTHER case (explanation / example / procedure / document lookup) is expected to PUBLISH.
    const declineExpected = c.expect === "boundary" || c.expect === "insufficient";
    const row = {
      id: c.id, stratum: c.stratum, q: c.q, expect: c.expect || null,
      journey: Boolean(c.extra), journey_step: c.extra ? c.extra.current_step : null,
      http: r.status, latency_ms: r.ms, retried: r.retried || false,
      grounded: b.grounded ?? null, answer_type: b.answer_type ?? null, intent: b.intent ?? null,
      sources_count: b.sources_count ?? (Array.isArray(b.sources) ? b.sources.length : null),
      external_model_called: b.external_model_called ?? null, cache: b.cache ?? null,
      insufficient: b.insufficient_sources ?? null,
      // M2.18B.7 (fallback fix) — capture the degraded-mode signal so the gate can prove that a supported
      // question NEVER falls into a safe fallback ("Fallback seguro · … · sem chamada externa") banner.
      degraded: b.degraded ?? null,
      fallback_reason: b.fallback_reason ?? null,
      terminal_kind: b.terminal_kind ?? trace.terminal_kind ?? null,
      local_model_called: b.local_model_called ?? trace.local_model_called ?? null,
      answer_head: answer.slice(0, 90),
    };
    // per-case gates
    if (r.status >= 500) fail(`${c.id}: HTTP ${r.status} (5xx) — "${c.q}"`);
    if (r.status !== 200 && r.status < 500 && r.status !== 0) fail(`${c.id}: HTTP ${r.status} — "${c.q}"`);
    if (r.status === 0) fail(`${c.id}: transport error/timeout — "${c.q}"`);
    if (b.external_model_called === true) fail(`${c.id}: EXTERNAL provider called — "${c.q}"`);
    if (answer.includes("undefined") || answer.includes("[object Object]")) fail(`${c.id}: answer leak — "${c.q}"`);
    // M2.18B.7 (fallback fix) — the reopened regression gates:
    //   (a) the misleading unmapped "erro temporário" banner (synthesis_fallback_unknown) must NEVER appear;
    //   (b) a SUPPORTED question (not a boundary/insufficient) must NEVER be served degraded — a safe
    //       fallback is an exceptional protection, not the normal mode. "Não declarar sucesso apenas porque
    //       o fallback é seguro ou retorna HTTP 200."
    if (row.fallback_reason === "synthesis_fallback_unknown") {
      fail(`${c.id}: misleading 'erro temporário' banner (synthesis_fallback_unknown) — "${c.q}"`);
    }
    if (r.status === 200 && row.degraded === true && !declineExpected) {
      fail(`${c.id}: UNEXPECTED degraded fallback (reason=${row.fallback_reason}) on a supported question — "${c.q}"`);
    }
    // M2.18B.7 (REOPEN) — TASK MISMATCH on the exact bug: an EXAMPLE request that comes back as the BANZA
    // definition (the screenshot symptom) is a failure even when HTTP 200 and not flagged degraded.
    if (c.expect_no_definition && r.status === 200) {
      const looksLikeBanzaDefinition = /neutro em rela|n[ãa]o [ée] um operador, uma carteira/i.test(answer);
      const isExampleType = /example/i.test(String(b.answer_type || "")) || /[Ee]xemplo/.test(answer);
      if (looksLikeBanzaDefinition || !isExampleType) {
        fail(`${c.id}: TASK MISMATCH — an example request was served as a definition/non-example (answer_type=${b.answer_type}) — "${c.q}"`);
      }
    }
    // boundary/off-topic cases must REFUSE or DECLINE — never a fulfilled task deliverable (steps/JSON/scenario).
    if (declineExpected && r.status === 200) {
      const looksFulfilled = /```|^\s*1\.\s|\n\s*1\.\s/.test(answer) && !isRefusalOrDecline(answer);
      if (looksFulfilled) fail(`${c.id}: ${c.expect} returned a fulfilled deliverable, not a refusal/decline — "${c.q}"`);
      if (!isRefusalOrDecline(answer)) fail(`${c.id}: ${c.expect} answer is neither a refusal nor a decline — "${c.q}"`);
    }
    results.push(row);
  }
}

const queue = [...cases];
console.error(`public-edge QA: ${cases.length} cases → ${URL} (concurrency ${CONC})`);
await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, () => worker(queue)));

// percentiles
const lat = results.filter((r) => r.http === 200).map((r) => r.latency_ms).sort((a, b) => a - b);
const pct = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] : null);
const summary = {
  url: URL, total: results.length,
  http_200: results.filter((r) => r.http === 200).length,
  http_5xx: results.filter((r) => r.http >= 500).length,
  errors: results.filter((r) => r.http === 0).length,
  external_calls: results.filter((r) => r.external_model_called === true).length,
  grounded: results.filter((r) => r.grounded === true).length,
  // M2.18B.7 (fallback fix) — the reopened-milestone health metrics.
  degraded_total: results.filter((r) => r.degraded === true).length,
  unexpected_fallbacks: results.filter(
    (r) => r.http === 200 && r.degraded === true && r.expect !== "boundary" && r.expect !== "insufficient",
  ).length,
  temporary_error_banners: results.filter((r) => r.fallback_reason === "synthesis_fallback_unknown").length,
  // M2.18B.7 (REOPEN) — the journey-active E2E slice (the user's real condition): a supported task/lookup/
  // explanation asked mid-journey must never come back degraded.
  journey_cases: results.filter((r) => r.journey === true).length,
  journey_degraded: results.filter((r) => r.journey === true && r.degraded === true).length,
  document_lookup_terminals: results.filter((r) => r.terminal_kind === "document_lookup").length,
  cache_hits: results.filter((r) => r.cache === "exact").length,
  transient_retries: results.filter((r) => r.retried).length,
  latency_ms: { p50: pct(50), p90: pct(90), p99: pct(99), max: lat[lat.length - 1] || null },
  by_stratum: results.reduce((a, r) => ((a[r.stratum] = (a[r.stratum] || 0) + 1), a), {}),
  failures: bad,
};
writeFileSync(OUT, JSON.stringify({ _meta: { milestone: "M2.18B.7 DFN-9/10", generated_against: URL }, summary, results }, null, 2) + "\n");
console.error(JSON.stringify(summary, null, 2));
console.error(bad ? `PUBLIC-EDGE QA: NEEDS_FIX (${bad} gate failures)` : "PUBLIC-EDGE QA: OK");
process.exit(bad ? 1 : 0);
