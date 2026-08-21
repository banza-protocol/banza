#!/usr/bin/env node
// Production BanzAI probe harness (READ-ONLY).
// Paces requests under the edge limit (20r/m => >=3.0s spacing; we use 3.4s).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";

const BASE = process.env.BANZAI_BASE || "https://banza.network";
const CORPUS = process.argv[2];
const OUT = process.argv[3];
const PACE = Number(process.env.PACE_MS || 3400);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const items = readFileSync(CORPUS, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

// resume support: skip ids already recorded
const done = new Set();
if (existsSync(OUT)) {
  for (const l of readFileSync(OUT, "utf8").split("\n")) {
    if (!l.trim()) continue;
    try { done.add(JSON.parse(l).question_id); } catch {}
  }
}

async function ask(body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/banzai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  let json = null, text = null;
  try { json = await res.json(); } catch { text = "<unparseable>"; }
  return { status: res.status, ms, json, text };
}

let n = 0;
for (const it of items) {
  n++;
  if (done.has(it.question_id)) { console.error(`[skip] ${it.question_id}`); continue; }
  // multi-turn: it.turns = [{question, ...}], else single question
  const turns = it.turns || [{ question: it.question }];
  const history = [];
  const records = [];
  let ctx = undefined;
  for (const t of turns) {
    let r;
    for (let attempt = 0; attempt < 4; attempt++) {
      r = await ask({
        question: t.question,
        locale: it.locale,
        ...(history.length ? { history: history.slice(-2) } : {}),
        ...(ctx ? { conversation_context: ctx } : {}),
      });
      if (r.status !== 429) break;
      const wait = (r.json && r.json.retry_after_ms) || 8000;
      console.error(`[429] ${it.question_id} wait ${wait}ms`);
      await sleep(wait + 500);
    }
    const j = r.json || {};
    records.push({
      question: t.question,
      status: r.status,
      latency_ms: r.ms,
      answer: j.answer ?? null,
      answer_locale: j.answer_locale ?? null,
      grounded: j.grounded ?? null,
      intent: j.intent ?? null,
      answer_type: j.answer_type ?? null,
      terminal_kind: j.terminal_kind ?? null,
      mode: j.mode ?? null,
      provider: j.provider ?? null,
      local_model_called: j.local_model_called ?? null,
      external_model_called: j.external_model_called ?? null,
      cached_local: j.cached_local ?? null,
      cache_hit: j.cache_hit ?? null,
      insufficient_sources: j.insufficient_sources ?? null,
      degraded: j.degraded ?? null,
      fallback: j.fallback ?? null,
      fallback_reason: j.fallback_reason ?? null,
      non_normative: j.non_normative ?? null,
      claim_verification_ok: j.claim_verification_ok ?? null,
      validation_status: j.validation_status ?? null,
      answer_source: j.answer_source ?? null,
      sources: (j.sources || []).map((s) => ({ id: s.id, path: s.path, kind: s.kind, title: s.title })),
      sources_count: j.sources_count ?? null,
      interpreted_intent: j.interpreted_intent ?? null,
      contextual_fallback_kind: j.contextual_fallback_kind ?? null,
      conversation_context_used: j.conversation_context_used ?? null,
      index_version: j.index_version ?? null,
      error: j.error ?? null,
    });
    history.push({ role: "user", text: t.question });
    if (j.conversation_context) ctx = j.conversation_context;
    await sleep(PACE);
  }
  appendFileSync(OUT, JSON.stringify({ ...it, turns: undefined, records, run_at: new Date().toISOString() }) + "\n");
  console.error(`[${n}/${items.length}] ${it.question_id} ${records.map((r) => r.status).join(",")}`);
}
console.error("DONE");
