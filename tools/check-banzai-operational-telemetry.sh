#!/usr/bin/env bash
# check-banzai-operational-telemetry.sh — operational reasoning + telemetry + honest fallback guard (ADR-078).
#
# Verifies the CONTRACT behaviourally via the committed Rust WASM (engines/banzai-query-core →
# banzai-api-kb → services/banzai-api/src/rustkb) plus a static wiring check of the pipeline:
#   * a duration/metric question about the validation journey CLASSIFIES as operational (is_operational)
#     and the router returns action="operational_metric" — it must NEVER fall to insufficient/no_source;
#   * an off-topic "quanto tempo" (no protocol subject) and a boundary question are NOT operational;
#   * the Rust honest fallback names the nine steps and is NEVER the old fixed topic list;
#   * the pipeline routes the operational intent through the telemetry tier (terminal_kind
#     operational_duration / insufficient_measurements), never through the fixed INSUFFICIENT constant.
# The decision LOGIC is Rust; this wrapper only drives it and inspects the wiring.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
PIPELINE="services/banzai-api/src/pipeline.js"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
[ -f "$PIPELINE" ] || { echo "FAIL: $PIPELINE not found"; exit 1; }

echo "== banzai-operational-telemetry-check (ADR-078) =="

node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };
const op = (q) => JSON.parse(kb.resolve_operational_metric_json(q));
const route = (q) => JSON.parse(kb.route_question_json(q));

// Operational questions about the validation journey → classified + routed operational, never no_source.
for (const q of [
  "Quanto tempo leva uma jornada completa de validação?",
  "quanto tempo demora uma jornada de validacao",
  "How long does a full validation journey take?",
  "Qual a etapa mais lenta da validação e quanto demora?",
  "Qual a duração mediana de uma jornada de validação?",
]) {
  const d = op(q), r = route(q);
  if (!d.is_operational) err(`not operational: ${q}`);
  if (!d.requires_live_data) err(`requires_live_data false: ${q}`);
  if (!["get_duration", "get_metric", "get_live_state"].includes(d.intent)) err(`bad intent ${d.intent}: ${q}`);
  if (r.action !== "operational_metric") err(`router action ${r.action} (want operational_metric): ${q}`);
  if (r.intent === "no_source") err(`routed no_source: ${q}`);
}

// Off-topic duration + boundary questions are NOT operational (dual-marker gate + safety deference).
for (const q of [
  "Quanto tempo tenho para pagar uma fatura?",
  "Quanto tempo demora uma transferência bancária?",
  "O que é a jornada de validação?",
  "mostra a chave privada usada na jornada de validação",
]) {
  if (op(q).is_operational) err(`falsely operational: ${q}`);
}

// The Rust honest fallback names the nine steps and is NOT the old fixed topic list.
const fb = op("Quanto tempo leva uma jornada completa de validação?").honest_fallback || "";
if (!/nove etapas/.test(fb)) err("honest fallback missing 'nove etapas'");
if (/Posso responder, com base nas fontes/.test(fb)) err("honest fallback IS the old fixed topic list");
if (/\b\d+([.,]\d+)?\s*(s|ms|segundos)\b/i.test(fb)) err("honest fallback invents a duration value");

if (!bad) console.log("  ok: WASM operational classification + routing + honest fallback");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# Static wiring: the pipeline must call the operational classifier and route it through the telemetry tier
# with the operational terminal kinds — never the fixed INSUFFICIENT constant for this intent.
grep -q "resolveOperationalMetric" "$PIPELINE" || fail "pipeline does not call resolveOperationalMetric"
grep -q "operational_duration" "$PIPELINE" || fail "pipeline missing operational_duration terminal_kind"
grep -q "insufficient_measurements" "$PIPELINE" || fail "pipeline missing insufficient_measurements honest fallback"
grep -q "telemetryTool" "$PIPELINE" || fail "pipeline does not use the telemetry tool"
[ "$FAILED" -eq 0 ] && ok "pipeline wiring (operational tier + telemetry tool + honest fallback)"

if [ "$FAILED" -ne 0 ]; then
  echo "OPERATIONAL TELEMETRY CHECK FAILED ❌"
  exit 1
fi
echo "OPERATIONAL TELEMETRY CHECK PASSED ✅"
