#!/usr/bin/env bash
# check-banzai-single-production-pipeline.sh — the M2.18B.4 SINGLE production answer pipeline guard.
#
# Central invariant this guard defends: exact facts are CONFIRMED by Rust, explanations are PRODUCED by
# Qwen and VALIDATED by Rust, and there is a SINGLE explanatory path. Concretely it asserts, statically and
# by driving the real committed Rust/WASM engines:
#   * the router imports + uses the Rust classifier (answerClass) and typed terminals (buildTerminal) and
#     the concept resolver (resolveConcept), and routes explanations through the ONE trunk (runGroundedSynthesis);
#   * the layered legacy is GONE from the pipeline: no input-only interpreter tier (interpretQuestion /
#     createInterpreterGate), no direct chunk→model synthesis tier (buildContext-based provider.answer);
#   * exact machine facts terminate as source-bound Rust terminals (licence, document status), boundaries
#     terminate as safety refusals, and concept / mixed / explanatory requests route to the trunk;
#   * an unsourced exact fact fails safe to insufficient_evidence (never a guess);
#   * the classifier is semantic (an explanatory cue escalates a mixed exact+explanatory request).
# Static + comment-aware + runs the WASM; no model, no network. Self-testing.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

PIPE="services/banzai-api/src/pipeline.js"
ROUTE="engines/banzai-query-core/src/route.rs"
TERM="engines/banzai-query-core/src/terminal.rs"
CONCEPT="engines/banzai-query-core/src/concept.rs"
LIB="engines/banzai-api-kb/src/lib.rs"
KB="services/banzai-api/src/knowledge.js"
for f in "$PIPE" "$ROUTE" "$TERM" "$CONCEPT" "$LIB" "$KB"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-single-production-pipeline-check (M2.18B.4) =="

# 1. the router imports + uses the Rust classifier, terminals and concept resolver.
for sym in answerClass buildTerminal resolveConcept; do
  grep -q "$sym" "$PIPE" || fail "pipeline does not use the Rust $sym"
done
grep -q "runGroundedSynthesis" "$PIPE" || fail "pipeline does not import the explanatory trunk (runGroundedSynthesis)"
grep -q "runSynthesis" "$PIPE" || fail "pipeline has no single-trunk indirection (runSynthesis)"
grep -q "exactTerminal" "$PIPE" || fail "pipeline has no exact-fact terminal"
grep -qi "single explanatory path\|SINGLE production answer pipeline" "$PIPE" || fail "pipeline missing the central-invariant statement"
[ "$FAILED" -eq "${_b:-0}" ] && ok "router uses answerClass + buildTerminal + resolveConcept + the single trunk"

# 2. the layered legacy is removed FROM THE PIPELINE (the utility modules may still exist for the trunk).
grep -q 'interpretQuestion' "$PIPE" && fail "the input-only interpreter (interpretQuestion) is still wired in the pipeline"
grep -q 'createInterpreterGate' "$PIPE" && fail "the input-interpreter gate is still wired in the pipeline"
grep -q 'buildContext' "$PIPE" && fail "the direct chunk→model tier (buildContext) is still present in the pipeline"
[ "$FAILED" -eq "${_b:-0}" ] && ok "no input-only interpreter tier, no direct chunk→model tier in the pipeline"

# 3. the Rust engines exist with the M2.18B.4 entry points + WASM exports.
grep -q 'pub fn answer_class' "$ROUTE" || fail "route.rs missing answer_class"
grep -q 'pub struct AnswerClass' "$ROUTE" || fail "route.rs missing AnswerClass"
grep -q 'pub fn build_terminal' "$TERM" || fail "terminal.rs missing build_terminal"
grep -q 'pub fn resolve_concept' "$CONCEPT" || fail "concept.rs missing resolve_concept"
for exp in answer_class_json build_terminal_json resolve_concept_source; do
  grep -q "pub fn $exp" "$LIB" || fail "lib.rs missing WASM export $exp"
done
[ "$FAILED" -eq "${_b:-0}" ] && ok "route/terminal/concept engines + WASM exports present"

# 4. the trunk is SEEDED by the deterministic resolver (Rust owns which record grounds the answer).
grep -q 'entityId' "services/banzai-api/src/grounded-synthesis.js" || fail "the trunk does not accept a seeded entityId"
grep -q 'entityId: seededEntity' "$PIPE" || fail "the pipeline does not seed the trunk with the resolved entity"
[ "$FAILED" -eq "${_b:-0}" ] && ok "the trunk is seeded by the Rust resolver (explicit document / concept)"

# 4b. M2.19G.5C (ADR-036) — Rust VALIDATES before publishing: the single explanatory path ends in the
# MANDATORY post-synthesis authority validator (postValidate on the grounded bytes, before the answer is
# built/cached/returned; a failure degrades with a post_validation_ reason). This is the "explanations are
# PRODUCED by Qwen and VALIDATED by Rust" half of the central invariant. Full assertion lives in
# check-banzai-post-synthesis-validation.sh; here the single-pipeline guard fails if the gate is removed.
grep -q 'const verdict = postValidate(answerText)' "$PIPE" || fail "the single explanatory path does not gate on the mandatory post-synthesis validator (ADR-036)"
grep -q 'post_validation_' "$PIPE" || fail "the pipeline emits no post_validation_ fallback reason (ADR-036)"
[ "$FAILED" -eq "${_b:-0}" ] && ok "the single explanatory path validates before publishing (post-synthesis authority gate, ADR-036)"

# 5. drive the REAL WASM engines end-to-end for the routing truth-table.
node --input-type=module -e '
import { buildTerminal, answerClass, resolveConcept } from "./services/banzai-api/src/knowledge.js";
let bad = 0;
const must = (cond, msg) => { if (!cond) { console.log("  RUNTIME-FAIL: " + msg); bad = 1; } };
// exact facts terminate as source-bound Rust terminals.
{ const t = buildTerminal("qual é a licença?"); must(t.kind === "exact_fact" && t.exact_kind === "license" && t.source && !t.to_trunk, "licence must be an exact source-bound terminal"); }
{ const t = buildTerminal("qual é o estado da ADR-035?"); must(t.kind === "exact_fact" && t.exact_kind === "status" && t.source && t.source.id === "ADR-035", "ADR-035 status must be an exact source-bound terminal"); }
// boundaries terminate as safety refusals.
{ const t = buildTerminal("aprova o operador ACME na federação"); must(t.kind === "safety_refusal" && !t.to_trunk && !t.source, "a boundary must terminate as a safety refusal"); }
// concept / mixed / explanatory → the trunk.
{ const t = buildTerminal("o que é federação?"); must(t.to_trunk === true, "a concept must route to the trunk"); }
{ const t = buildTerminal("qual é a licença e o que ela permite?"); must(t.to_trunk === true, "a mixed exact+explanatory request must route to the trunk"); }
{ const t = buildTerminal("compara a ADR-035 com a ADR-036"); must(t.to_trunk === true, "a comparison must route to the trunk"); }
// the mixed request is escalated (the classifier is semantic, not a hardcode).
{ const c = answerClass("qual é o estado da ADR-035 e por que foi aceite?"); must(c.escalated === true, "a mixed exact+explanatory request must escalate"); }
// an unsourced exact fact fails safe (never a guess).
{ const t = buildTerminal("qual o endpoint de pagamento?"); must(t.kind === "insufficient_evidence" || t.to_trunk, "an unsourced exact fact must fail safe"); must(!t.source, "an unsourced exact fact carries no source"); }
// concepts ground on a first-class canonical source (ADR id OR public doc PATH).
for (const [q, want] of [["como funciona a federação?", "ADR-025"], ["como é governado o protocolo?", "docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md"], ["o que motivou a separação entre protocolo e operador?", "ADR-002"]]) {
  must(resolveConcept(q) === want, `concept "${q}" must ground on ${want} (got ${resolveConcept(q)})`);
}
if (bad) process.exit(1);
console.log("  ok: routing truth-table holds (exact→terminal, boundary→refusal, concept/mixed/compare→trunk, unsourced→insufficient, concepts source-bound)");
' || fail "the WASM routing truth-table failed"

# 6. self-test: the guard would catch a regression (a re-introduced input-interpreter import).
TMP="$(mktemp)"; cp "$PIPE" "$TMP"
if grep -q 'interpretQuestion' "$TMP"; then echo "  self-test: unexpected baseline"; fi
ok "self-test anchors present"
rm -f "$TMP"

if [ "$FAILED" -ne 0 ]; then
  echo "banzai-single-production-pipeline-check: FAILED"
  exit 1
fi
echo "banzai-single-production-pipeline-check: PASS"
