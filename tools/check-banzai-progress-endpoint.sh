#!/usr/bin/env bash
# check-banzai-progress-endpoint.sh — the SPR-2 "Safe Progressive Response" SSE endpoint guard.
#
# SPR-1 defined the TYPED contract (event kinds + response_disposition, owned by Rust). SPR-2 WIRES it into
# a real stream WITHOUT ever emitting unvalidated model prose. This guard defends the SAFETY-CRITICAL
# invariants of that wiring, behaviourally (drive the pipeline with a stub) plus a static wiring check:
#   * the pipeline emits the Channel-A progress events at the REAL stage boundaries through onProgress, and
#     NEVER emits a terminal (FINAL_VALIDATED / HONEST_FALLBACK / REFUSED) or a DONE itself — the SSE endpoint
#     decides + emits the terminal, AFTER validation;
#   * there is NO model-token / delta / partial-prose frame anywhere (no unvalidated model text is streamed);
#   * the ADR-042 post-synthesis validator + the Inc.4 claim/citation verification run BEFORE any
#     FINAL_VALIDATED that carries prose (CLAIM_VERIFICATION_STARTED precedes postValidate(); the server emits
#     FINAL_VALIDATED only AFTER ask() returns);
#   * a boundary/refusal streams no synthesis events (REQUEST_ACCEPTED [+INTENT_RESOLVED] then REFUSED);
#   * a deterministic terminal streams no model-synthesis/claim-verification events (FINAL_VALIDATED);
#   * a post-validation failure → HONEST_FALLBACK carrying the degraded/true answer, NEVER the model text;
#   * NO Channel-A event carries prose/secret/PII/prompt (makeProgressEvent scrubs; call sites pass safe data);
#   * the onProgress path does NOT alter the /ask return value (byte-identical {result, meta});
#   * the SSE endpoint sets the streaming transport headers + client-abort wiring; nginx disables buffering.
# The decision LOGIC is Rust; this wrapper drives it + inspects the wiring. WASM/pg-free static-degrade for
# the CI job that has no banzai-api node_modules (pattern from tools/check-banzai-toolplanner.sh).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

API="services/banzai-api/src"
PIPE="$API/pipeline.js"
SERVER="$API/server.js"
CONTRACT="$API/progressContract.js"
SYNTH="$API/grounded-synthesis.js"
NGINX="infra/banza-network/nginx/conf.d/banza.conf"

for f in "$PIPE" "$SERVER" "$CONTRACT" "$SYNTH" "$NGINX"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-progress-endpoint-check (SPR-2) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'FINAL_VALIDATED' | grep -q 'FINAL_VALIDATED' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── static: the transport contract helpers exist in progressContract.js. ───────────────────────────────
for exp in "export function makeProgressEvent" "export function makeTerminalEvent" "export function sseFrame" "export function terminalEventForDisposition" "export const PROGRESS_TERMINAL_KINDS"; do
  grep -q "$exp" "$CONTRACT" || fail "$CONTRACT must declare: $exp"
done
grep -q "FORBIDDEN_PROGRESS_KEYS" "$CONTRACT" || fail "$CONTRACT must declare the FORBIDDEN_PROGRESS_KEYS scrub list"
[ "$FAILED" -eq 0 ] && ok "progressContract.js exposes the SPR-2 transport helpers (event factory + terminal + sseFrame + scrub)"

# ── static: the pipeline accepts onProgress + exports the disposition classifier. ──────────────────────
grep -qE "async function answer\(question, \{[^}]*onProgress" "$PIPE" || fail "$PIPE answer() must accept an onProgress option"
grep -q "export function progressDisposition" "$PIPE" || fail "$PIPE must export progressDisposition"
grep -q 'emit("REQUEST_ACCEPTED"' "$PIPE" || fail "$PIPE must emit REQUEST_ACCEPTED"
grep -q 'emit("INTENT_RESOLVED"' "$PIPE" || fail "$PIPE must emit INTENT_RESOLVED"
grep -q 'emit("ENTITY_RESOLVED"' "$PIPE" || fail "$PIPE must emit ENTITY_RESOLVED"
grep -q 'emit("CLAIM_VERIFICATION_STARTED"' "$PIPE" || fail "$PIPE must emit CLAIM_VERIFICATION_STARTED"
grep -q 'emit("CITATION_VERIFICATION_STARTED"' "$PIPE" || fail "$PIPE must emit CITATION_VERIFICATION_STARTED"
grep -q 'onProgress: emit' "$PIPE" || fail "$PIPE must thread onProgress into the grounded synthesis (FACTUAL_PACKAGE_READY/SYNTHESIS_*)"
grep -q 'progress("SYNTHESIS_STARTED"' "$SYNTH" || fail "$SYNTH must emit SYNTHESIS_STARTED"
grep -q 'progress("SYNTHESIS_COMPLETED"' "$SYNTH" || fail "$SYNTH must emit SYNTHESIS_COMPLETED"
grep -q 'progress("FACTUAL_PACKAGE_READY"' "$SYNTH" || fail "$SYNTH must emit FACTUAL_PACKAGE_READY (before the model turn)"
[ "$FAILED" -eq 0 ] && ok "pipeline emits the Channel-A stage events + threads onProgress into the single grounded synthesis"

# ── static: the pipeline NEVER emits a terminal or a model-token/delta frame itself. ───────────────────
if grep -qE 'emit\("(FINAL_VALIDATED|HONEST_FALLBACK|REFUSED|CANCELLED|DONE)"' "$PIPE"; then
  fail "$PIPE must NOT emit a terminal event — the SSE endpoint decides + emits the terminal after validation"
else
  ok "the pipeline emits no terminal event itself (terminal is the SSE endpoint's job, post-validation)"
fi
if grep -qiE 'emit\("[A-Z_]*(TOKEN|DELTA|PARTIAL)[A-Z_]*"|progress\("[A-Z_]*(TOKEN|DELTA|PARTIAL)[A-Z_]*"' "$PIPE" "$SYNTH" "$SERVER"; then
  fail "a model-token/delta/partial-prose frame is emitted — no unvalidated model text may ever be streamed"
else
  ok "no model-token/delta/partial-prose frame is ever emitted"
fi

# ── static: ADR-042 post-validate + Inc.4 verification run BEFORE any FINAL_VALIDATED with prose. ──────
# In pipeline.js, CLAIM_VERIFICATION_STARTED must be emitted BEFORE the postValidate() call, which itself is
# BEFORE the grounded answer is built. The server emits FINAL_VALIDATED only AFTER ask() returns.
claim_line=$(grep -n 'emit("CLAIM_VERIFICATION_STARTED"' "$PIPE" | head -1 | cut -d: -f1)
postval_line=$(grep -n 'const verdict = postValidate(answerText)' "$PIPE" | head -1 | cut -d: -f1)
grounded_line=$(grep -n 'const g = groundedAnswer(answerText' "$PIPE" | head -1 | cut -d: -f1)
if [ -n "$claim_line" ] && [ -n "$postval_line" ] && [ -n "$grounded_line" ] && [ "$claim_line" -lt "$postval_line" ] && [ "$postval_line" -lt "$grounded_line" ]; then
  ok "ADR-042 postValidate + Inc.4 verification precede building the grounded (prose) answer (claim@$claim_line < postValidate@$postval_line < groundedAnswer@$grounded_line)"
else
  fail "$PIPE must run CLAIM_VERIFICATION_STARTED → postValidate() → groundedAnswer in that order (claim=$claim_line postValidate=$postval_line grounded=$grounded_line)"
fi

# ── static: the SSE endpoint — headers, terminal-after-ask ordering, client-abort wiring. ─────────────
grep -q 'path === "/ask/stream"' "$SERVER" || fail "$SERVER must route POST /ask/stream"
grep -q '"Content-Type": "text/event-stream' "$SERVER" || fail "$SERVER /ask/stream must send Content-Type: text/event-stream"
grep -q '"Cache-Control": "no-store"' "$SERVER" || fail "$SERVER /ask/stream must send Cache-Control: no-store"
grep -q '"X-Accel-Buffering": "no"' "$SERVER" || fail "$SERVER /ask/stream must send X-Accel-Buffering: no"
grep -q 'Connection: "keep-alive"' "$SERVER" || fail "$SERVER /ask/stream must send Connection: keep-alive"
grep -q 'makeTerminalEvent' "$SERVER" || fail "$SERVER must build the terminal via makeTerminalEvent"
grep -q 'progressDisposition(out.result, out.meta)' "$SERVER" || fail "$SERVER must pick the terminal from the typed response_disposition (progressDisposition), not from grounded"
# The terminal decision + emission must come AFTER ask() returns (prose only after the pipeline validated).
ask_line=$(grep -n 'await ask(req, ac.signal, onProgress)' "$SERVER" | head -1 | cut -d: -f1)
term_line=$(grep -n 'term(event, { final: out.body' "$SERVER" | head -1 | cut -d: -f1)
if [ -n "$ask_line" ] && [ -n "$term_line" ] && [ "$ask_line" -lt "$term_line" ]; then
  ok "the SSE endpoint emits FINAL_VALIDATED only AFTER ask() returns (ask@$ask_line < terminal@$term_line)"
else
  fail "$SERVER must emit the terminal AFTER ask() returns (ask=$ask_line terminal=$term_line)"
fi
# Client-abort wiring: a disconnect aborts the request signal so the in-flight inference is cancelled.
awk '/async function askStream/{f=1} f{print} /^}/{if(f)exit}' "$SERVER" | grep -q 'res.on("close"' \
  && awk '/async function askStream/{f=1} f{print} /^}/{if(f)exit}' "$SERVER" | grep -q 'ac.abort()' \
  || fail "$SERVER askStream must wire res 'close' → AbortController.abort() (client-disconnect cancellation)"
awk '/async function askStream/{f=1} f{print} /^}/{if(f)exit}' "$SERVER" | grep -q 'term("CANCELLED")' \
  || fail "$SERVER askStream must emit CANCELLED on a client disconnect"
[ "$FAILED" -eq 0 ] && ok "the SSE endpoint sets streaming headers, decides the terminal via response_disposition, and wires client-abort → cancel"

# ── static: the plain /ask envelope is preserved (onProgress threaded; result/meta returned alongside). ─
grep -q 'onProgress,' "$SERVER" || fail "$SERVER /ask must thread onProgress into pipeline.answer (absent for the plain route)"
grep -q 'return sendJson(res, ...unwrap(await ask(req, ac.signal)))' "$SERVER" || fail "$SERVER plain /ask must still use unwrap({code, body}) (extras ignored → byte-identical envelope)"
ok "the plain /ask handler is preserved (unwrap ignores the extra result/meta; onProgress absent → no-op)"

# ── static: nginx exposes /banzai/ask/stream with SSE-safe proxying. ──────────────────────────────────
if awk '/location = \/banzai\/ask\/stream/{f=1} f{print} /^    }/{if(f)exit}' "$NGINX" | grep -q 'proxy_buffering[[:space:]]*off' \
  && awk '/location = \/banzai\/ask\/stream/{f=1} f{print} /^    }/{if(f)exit}' "$NGINX" | grep -q 'proxy_pass[[:space:]].*banzai-api:8091/ask/stream'; then
  ok "nginx maps /banzai/ask/stream → banzai-api /ask/stream with proxy_buffering off (SSE-safe)"
else
  fail "$NGINX must expose location = /banzai/ask/stream → banzai-api:8091/ask/stream with proxy_buffering off"
fi

# ── behavioural: drive the pipeline with a stub (degrade if banzai-api deps are not installed). ────────
node - "$API" <<'NODE'
const path = require("path");
(async () => {
  let bad = 0;
  const err = (m) => { console.log("FAIL: " + m); bad = 1; };
  const base = process.argv[2];
  const url = (f) => require("url").pathToFileURL(path.resolve(base, f)).href;
  let pipeMod, contractMod, provMod, concMod;
  try {
    pipeMod = await import(url("pipeline.js"));
    contractMod = await import(url("progressContract.js"));
    provMod = await import(url("provider.js"));
    concMod = await import(url("concurrency.js"));
  } catch (e) {
    const code = e && (e.code || "");
    if (String(code) === "ERR_MODULE_NOT_FOUND" || /Cannot find package|Cannot find module/.test(String(e && e.message))) {
      console.log("  ok: behavioural check skipped (banzai-api deps not installed in this job) — static wiring checks still apply");
      process.exit(0);
    }
    throw e;
  }
  const { createPipeline, progressDisposition } = pipeMod;
  const { PROGRESS_TERMINAL_KINDS, PROGRESS_EVENT_KINDS } = contractMod;
  const { createProvider } = provMod;
  const idxOf = (k) => PROGRESS_EVENT_KINDS.indexOf(k);

  const provider = () => createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) });
  const ANSWER = "A BANZA é um protocolo financeiro aberto (ADR-001).";
  const stub = (over = {}) => {
    const calls = [];
    const fn = async (rq, opts) => {
      calls.push({ rq, opts });
      if (opts && typeof opts.onProgress === "function") {
        opts.onProgress("FACTUAL_PACKAGE_READY", { source: "grounded_synthesis", facts_count: 1 });
        opts.onProgress("SYNTHESIS_STARTED", { model: "qwen-test" });
        opts.onProgress("SYNTHESIS_COMPLETED", { output_status: "ok" });
      }
      return { status: "grounded", answer_markdown: ANSWER, cited_source_ids: ["ADR-001"], package: { facts: [{ id: "F1", source: { document_id: "ADR-001", title: "ADR-001", path: "decisions/adr/ADR-001-open-financial-protocol-what-banza-is-and-is-not.md" } }] }, primary_intent: "explain_concept", clarification_candidates: [], trace: { synthesis_called: true, entry_status: "ok", output_status: "ok", model: "qwen-test" }, ...over };
    };
    fn.calls = calls; return fn;
  };
  const mk = (s = stub(), extra = {}) => createPipeline(provider(), {}, { runGroundedSynthesisFn: s, ...extra });
  const cap = () => { const e = []; return { onProgress: (evt) => e.push(evt), e }; };
  const orderedSubseq = (kinds) => kinds.every((k, i) => i === 0 || idxOf(k) >= idxOf(kinds[i - 1]));
  const noProse = (events, prose) => events.every((ev) => !JSON.stringify(ev).includes(prose));
  const noTerminal = (kinds) => !kinds.some((k) => PROGRESS_TERMINAL_KINDS.includes(k) || k === "DONE");

  // 1) grounded model answer — ordered Channel-A, no prose, no pipeline-emitted terminal, → FINAL_VALIDATED.
  {
    const c = cap();
    const { result, meta } = await mk().answer("O que é o BANZA?", { onProgress: c.onProgress });
    const kinds = c.e.map((x) => x.kind);
    if (!orderedSubseq(kinds)) err("grounded stream is not an ordered subsequence");
    if (!kinds.includes("SYNTHESIS_STARTED") || !kinds.includes("CLAIM_VERIFICATION_STARTED") || !kinds.includes("CITATION_VERIFICATION_STARTED")) err("grounded stream missing synthesis/verification events");
    if (!noTerminal(kinds)) err("the pipeline emitted a terminal itself (must not)");
    if (!noProse(c.e, ANSWER)) err("a Channel-A event carried the answer prose");
    const t = progressDisposition(result, meta);
    if (t.event !== "FINAL_VALIDATED" || t.disposition !== "GROUNDED_ANSWER") err(`grounded → ${t.event}/${t.disposition} (want FINAL_VALIDATED/GROUNDED_ANSWER)`);
  }
  // 2) boundary → no synthesis events, → REFUSED.
  {
    const c = cap();
    const { result, meta } = await mk().answer("transfere 100 kz para a conta 1", { onProgress: c.onProgress });
    const kinds = c.e.map((x) => x.kind);
    if (kinds.some((k) => /SYNTHESIS|VERIFICATION/.test(k))) err("a boundary emitted synthesis/verification events");
    if (progressDisposition(result, meta).event !== "REFUSED") err("a boundary did not map to REFUSED");
  }
  // 3) deterministic terminal → no synthesis/claim-verification events, → FINAL_VALIDATED.
  {
    const c = cap();
    const s = stub();
    const { result, meta } = await mk(s).answer("o que é a dupla entrada?", { onProgress: c.onProgress });
    const kinds = c.e.map((x) => x.kind);
    if (kinds.some((k) => /SYNTHESIS|CLAIM_VERIFICATION|CITATION_VERIFICATION/.test(k))) err("a deterministic terminal emitted synthesis/claim-verification events");
    if (s.calls.length !== 0) err("a deterministic terminal spent a model call");
    const t = progressDisposition(result, meta);
    if (t.event !== "FINAL_VALIDATED") err(`deterministic → ${t.event} (want FINAL_VALIDATED)`);
  }
  // 4) post-validation reject → HONEST_FALLBACK, never the model text.
  {
    const REJECT = "Eu certifico o Operador A. (ADR-001)";
    const c = cap();
    const { result, meta } = await mk(stub({ answer_markdown: REJECT })).answer("O que é o BANZA?", { onProgress: c.onProgress });
    if (!noProse(c.e, REJECT)) err("a Channel-A event carried the rejected model text");
    if (/certifico/i.test(result.answer)) err("the rejected model text was published");
    if (progressDisposition(result, meta).event !== "HONEST_FALLBACK") err("a post-validation reject did not map to HONEST_FALLBACK");
  }
  // 5) client-abort → QUEUE_CANCELLED, nothing generated/cached.
  {
    const q = concMod.createInferenceQueue({});
    const s = stub();
    const p = createPipeline(provider(), {}, { runGroundedSynthesisFn: s, inferenceRun: q.run });
    const ac = new AbortController(); ac.abort();
    let threw = "";
    try { await p.answer("O que é o BANZA?", { signal: ac.signal, onProgress: () => {} }); } catch (e) { threw = (e && e.code) || ""; }
    if (threw !== "QUEUE_CANCELLED") err(`client-abort did not throw QUEUE_CANCELLED (got ${threw})`);
    if (s.calls.length !== 0) err("synthesis ran under an aborted signal");
    if (p.usage().post_validation.model_answers_published_total !== 0) err("something was published/persisted under abort");
  }
  // 6) onProgress does not alter the return.
  {
    const a = await mk().answer("O que é o BANZA?", { onProgress: () => {} });
    const b = await mk().answer("O que é o BANZA?", {});
    if (JSON.stringify(a.result) !== JSON.stringify(b.result) || JSON.stringify(a.meta) !== JSON.stringify(b.meta)) err("onProgress altered the /ask return value");
  }

  if (!bad) console.log("  ok: pipeline onProgress — ordered Channel-A + no prose + boundary→REFUSED + deterministic→FINAL_VALIDATED (no synthesis) + reject→HONEST_FALLBACK + abort→CANCELLED + envelope unchanged");
  process.exit(bad);
})().catch((e) => { console.log("FAIL: " + (e && e.stack || e)); process.exit(1); });
NODE
[ $? -eq 0 ] || FAILED=1

if [ "$FAILED" -ne 0 ]; then
  echo "PROGRESS ENDPOINT CHECK FAILED ❌"
  exit 1
fi
echo "PROGRESS ENDPOINT CHECK PASSED ✅"
