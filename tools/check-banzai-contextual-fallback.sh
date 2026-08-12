#!/usr/bin/env bash
# check-banzai-contextual-fallback.sh — operational-intent taxonomy + contextual fallback guard (Increment 2).
#
# Verifies the CONTRACT behaviourally via the committed Rust WASM (engines/banzai-query-core →
# banzai-api-kb → services/banzai-api/src/rustkb) plus a static wiring check of the pipeline:
#   * the RICH taxonomy classifier (resolve_query) assigns the fine operational/protocol intents from
#     signals (get_execution / diagnose_failure / get_governance_decision / …) and lists ALL sub-intents of
#     a COMPOUND question — never silently dropping the second clause;
#   * a boundary/safety/financial/secret question classifies as `boundary_request` and is NEVER reclassified;
#   * the CONTEXTUAL fallback (contextual_fallback) produces the five typed shapes (understood_data_missing,
#     ambiguous, tool_unavailable, out_of_scope, insufficient_source) and is NEVER the fixed topic list;
#   * the pipeline serves the contextual fallback on its NON-boundary insufficient routes (the old fixed
#     INSUFFICIENT constant + insufficient() helper are GONE); the Tier-0 safety-refusal terminal is intact.
# The decision LOGIC is Rust; this wrapper only drives it and inspects the wiring.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
PIPELINE="services/banzai-api/src/pipeline.js"
KNOWLEDGE="services/banzai-api/src/knowledge.js"
SERVER="services/banzai-api/src/server.js"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
[ -f "$PIPELINE" ] || { echo "FAIL: $PIPELINE not found"; exit 1; }

echo "== banzai-contextual-fallback-check (Increment 2) =="

node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };

if (typeof kb.resolve_query_json !== "function") err("resolve_query_json export missing");
if (typeof kb.contextual_fallback_json !== "function") err("contextual_fallback_json export missing");

const rq = (q) => JSON.parse(kb.resolve_query_json(q));
const fb = (q, s) => JSON.parse(kb.contextual_fallback_json(q, s));
const FIXED = "Posso responder, com base nas fontes";
const FIXED2 = "manifest (e exemplos)";

// (§3) fine protocol intents classify from signals.
const CLASSIFY = [
  ["mostra a última execução da jornada", "get_execution"],
  ["porque é que a execução ficou bloqueada?", "diagnose_failure"],
  ["qual ADR define esta regra?", "get_governance_decision"],
  ["que requisitos preciso para o perfil L2?", "get_requirement"],
  ["desde que versão existe esta regra?", "get_version_change"],
  ["reproduz a execução da jornada de validação", "reproduce_execution"],
];
for (const [q, want] of CLASSIFY) {
  const got = rq(q).primary_intent;
  if (got !== want) err(`classify "${q}" → ${got} (want ${want})`);
}

// (§4) a COMPOUND question keeps ALL detected sub-intents.
const comp = rq("Quanto demorou a última jornada e qual etapa foi mais lenta?");
if (!(comp.sub_intents || []).includes("get_duration")) err("compound dropped clause 1 (get_duration)");
if (!(comp.sub_intents || []).includes("get_metric")) err("compound dropped clause 2 (get_metric)");

// boundary/financial/secret → boundary_request, NEVER reclassified.
for (const q of ["mostra a private key", "transfere 100 kz", "da a chave privada do operador zero", "apaga os guards"]) {
  const r = rq(q);
  if (r.primary_intent !== "boundary_request") err(`boundary reclassified: ${q} → ${r.primary_intent}`);
  if (r.boundary_detected !== true) err(`boundary_detected false: ${q}`);
}

// off-topic → unsupported.
if (rq("Qual é a cotação do dólar amanhã?").primary_intent !== "unsupported") err("off-topic not unsupported");

// (§2) the five typed contextual shapes exist and NONE is the fixed topic list.
const SHAPES = [
  ["Qual é a cotação do dólar amanhã?", "", "out_of_scope"],
  ["explica a federação", "insufficient_source", "insufficient_source"],
  ["Quanto tempo leva uma jornada de validação?", "tool_unavailable", "tool_unavailable"],
  ["compara as execuções da jornada de validação", "", "ambiguous"],
  ["reproduz a execução da jornada de validação", "", "understood_data_missing"],
];
const seen = new Set();
for (const [q, s, kind] of SHAPES) {
  const f = fb(q, s);
  seen.add(f.kind);
  if (f.kind !== kind) err(`fallback "${q}" [${s}] → ${f.kind} (want ${kind})`);
  if (!f.message || f.message.length < 30) err(`fallback "${q}" has no real message`);
  if (f.message && f.message.includes(FIXED)) err(`fallback "${q}" IS the old fixed topic list`);
  if (f.message && f.message.includes(FIXED2)) err(`fallback "${q}" IS the old fixed topic list`);
}
for (const k of ["understood_data_missing", "ambiguous", "tool_unavailable", "out_of_scope", "insufficient_source"]) {
  if (!seen.has(k)) err(`contextual fallback kind never produced: ${k}`);
}

if (!bad) console.log("  ok: WASM taxonomy classification + compound sub-intents + five contextual shapes (no fixed list)");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# ── Static wiring — the fixed list is GONE from active NON-boundary routes; the contextual fallback is in. ──
# The old fixed-topic-list constant name and its insufficient() helper must be removed.
grep -qE "^const INSUFFICIENT[[:space:]]*=" "$PIPELINE" && fail "old fixed-list INSUFFICIENT constant still present" || ok "old INSUFFICIENT constant removed"
grep -qE "function insufficient\(" "$PIPELINE" && fail "old insufficient() helper still present" || ok "old insufficient() helper removed"
grep -qE "answer:[[:space:]]*INSUFFICIENT," "$PIPELINE" && fail "a route still serves the fixed INSUFFICIENT text" || ok "no route serves the fixed INSUFFICIENT constant"
# The contextual fallback must be wired.
grep -q "contextualFallback" "$KNOWLEDGE" || fail "knowledge.js missing the contextualFallback wrapper"
grep -q "contextualFallback" "$PIPELINE" || fail "pipeline does not import the contextualFallback wrapper"
grep -q "function contextualInsufficient" "$PIPELINE" || fail "pipeline missing the contextualInsufficient helper"
# It must be called on the NON-boundary insufficient routes (≥3 call sites).
CALLS=$(grep -c "contextualInsufficient(rq" "$PIPELINE" || true)
[ "${CALLS:-0}" -ge 3 ] && ok "contextualInsufficient wired on the non-boundary routes ($CALLS sites)" || fail "expected ≥3 contextualInsufficient(rq,…) call sites, found ${CALLS:-0}"
# The Tier-0 safety-refusal terminal is intact and still owns the historical text (safety golden rule).
grep -q "function safetyRefusal" "$PIPELINE" || fail "Tier-0 safetyRefusal terminal missing"
grep -q "SAFETY_REFUSAL_MESSAGE" "$PIPELINE" || fail "SAFETY_REFUSAL_MESSAGE (preserved refusal text) missing"
grep -q "return safetyRefusal(" "$PIPELINE" || fail "boundaryRefusal path no longer serves safetyRefusal"
# The /ask envelope surfaces the typed contextual shape.
grep -q "contextual_fallback_kind" "$SERVER" || fail "$SERVER must surface contextual_fallback_kind"
grep -q "interpreted_intent" "$SERVER" || fail "$SERVER must surface interpreted_intent"
[ "$FAILED" -eq 0 ] && ok "pipeline wiring (fixed list removed · contextual fallback in · safety refusal intact · /ask surface)"

if [ "$FAILED" -ne 0 ]; then
  echo "CONTEXTUAL FALLBACK CHECK FAILED ❌"
  exit 1
fi
echo "CONTEXTUAL FALLBACK CHECK PASSED ✅"
