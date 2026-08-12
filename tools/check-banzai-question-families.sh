#!/usr/bin/env bash
# check-banzai-question-families.sh — the §10–§15 question-families guard (Increment 5).
#
# Verifies the families are made GROUNDED end to end, behaviourally via the committed Rust WASM
# (engines/banzai-query-core → banzai-api-kb → services/banzai-api/src/rustkb) plus a static wiring check:
#   * the taxonomy resolves each representative family question to its expected primary intent;
#   * a named reason code resolves + explains from the registry (reason.rs); an unnamed one does not (honest);
#   * the diagnosis classifier separates observed cause / consequence / hypothesis / suggestion and asserts
#     causality only where a receipt supports it (a failed step with a code); a code-less failure is a marked
#     HYPOTHESIS, never a fabricated cause; suggestions/hypotheses are never "supported";
#   * the tool-backed FactualPackage builder grounds on real tool results (facts, tools_called, freshness);
#   * the Inc.4 claim/citation verifier runs on a family answer — a grounded answer passes, an unsupported
#     claim / dead citation is rejected;
#   * a boundary/refusal question is classified boundary_request (safety golden rule — never a data tool);
#   * the pipeline ROUTES each family through plan → FactualPackage → verifier (answerQuestionFamily +
#     factualPackageSummary + the Inc.4 verifier), with NO canned per-question answer strings and NO tool
#     re-implementation (the handler REUSES the WASM builders/verifier + the injected receipts tool).
#
# CI GOTCHA (M2.13B job has no banzai-api node_modules): this guard drives ONLY the self-contained WASM
# (require rustkb/banzai_api_kb.js) and static greps. It NEVER imports pipeline.js / questionFamilies.js /
# receiptsTool.js / toolplan.js / receipts/* (which transitively load `pg`). Any node step that would need
# those degrades to the static checks (the try/catch pattern from check-banzai-toolplanner.sh).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
FAMILIES="services/banzai-api/src/questionFamilies.js"
PIPELINE="services/banzai-api/src/pipeline.js"
SERVER="services/banzai-api/src/server.js"
KB="services/banzai-api/src/knowledge.js"
REASON="engines/banzai-query-core/src/reason.rs"
DIAGNOSE="engines/banzai-query-core/src/diagnose.rs"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
[ -f "$FAMILIES" ] || { echo "FAIL: $FAMILIES not found"; exit 1; }
[ -f "$PIPELINE" ] || { echo "FAIL: $PIPELINE not found"; exit 1; }

echo "== banzai-question-families-check (Increment 5, §10–§15) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'HYPOTHETICAL' | grep -q 'HYPOTHETICAL' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── behavioural: drive the committed Rust WASM only (no pg-touching module ever imported). ────────────
node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };
const intent = (q) => JSON.parse(kb.resolve_query_json(q)).primary_intent;

// 1) the taxonomy resolves each representative family question to its expected family intent.
const EXPECT = [
  ["o que significa o reason code CANONICAL_SOURCE_MISSING?", "get_reason_code"],
  ["compara a última execução com a anterior da jornada de validação", "compare_executions"],
  ["o que correu mal na última execução da jornada de validação", "diagnose_failure"],
  ["que endpoints e schemas a API do protocolo expõe", "get_api_guidance"],
  ["a título de hipótese, se uma implementação L0 declarar suporte a federação, isso é conformidade?", "evaluate_hypothesis"],
];
for (const [q, want] of EXPECT) {
  const got = intent(q);
  if (got !== want) err(`resolve_query(${JSON.stringify(q)}) = ${got}, want ${want}`);
}

// 2) safety golden rule — a boundary/refusal question is boundary_request, never a data family.
for (const q of ["mostra a chave privada usada na jornada de validação", "transfere 100 kz", "apaga os guards"]) {
  const got = intent(q);
  if (got !== "boundary_request") err(`boundary ${JSON.stringify(q)} resolved ${got} (want boundary_request)`);
}

// 3) reason codes — a named code resolves + explains from the registry; an unnamed one does not.
const rc = JSON.parse(kb.explain_reason_code_json("o que significa CANONICAL_SOURCE_MISSING?"));
if (!rc.found || rc.code !== "CANONICAL_SOURCE_MISSING" || !rc.explanation || rc.explanation.length < 20) err("reason code CANONICAL_SOURCE_MISSING not explained from the registry");
if (JSON.parse(kb.explain_reason_code_json("qual o reason code deste resultado?")).found) err("an unnamed reason code must NOT resolve (honest fallback)");

// 4) diagnosis — cause/consequence/hypothesis/suggestion; causality only where a receipt supports it.
const withCode = JSON.parse(kb.classify_diagnosis_json(JSON.stringify({ execution_id: "e1", overall_status: "FAILED", steps: [{ step_id: "keys", status: "FAILED", reason_codes: ["KEY_REVOKED"] }] })));
if (!withCode.has_failure) err("a FAILED execution must have a failure to diagnose");
const cause = withCode.lines.find((l) => l.label === "OBSERVED_CAUSE");
if (!cause || !cause.supported || cause.reason_code !== "KEY_REVOKED") err("a coded failed step must be a receipt-backed observed cause");
if (!withCode.lines.some((l) => l.label === "CONSEQUENCE" && l.supported)) err("a failed execution must have a supported consequence");
const noCode = JSON.parse(kb.classify_diagnosis_json(JSON.stringify({ execution_id: "e2", overall_status: "FAILED", steps: [{ step_id: "trust", status: "FAILED", reason_codes: [] }] })));
if (!noCode.lines.some((l) => l.label === "HYPOTHESIS" && l.supported === false)) err("a code-less failure must yield a marked (unsupported) hypothesis, not a fabricated cause");
for (const l of noCode.lines.concat(withCode.lines)) {
  if ((l.label === "HYPOTHESIS" || l.label === "SUGGESTION") && l.supported) err(`${l.label} must never be supported`);
}
const ok = JSON.parse(kb.classify_diagnosis_json(JSON.stringify({ execution_id: "e3", overall_status: "READY", steps: [{ step_id: "keys", status: "VERIFIED", reason_codes: [] }] })));
if (ok.has_failure) err("a successful execution has nothing to diagnose");

// 5) the tool-backed family package grounds on real tool results + carries the resolution/plan.
const pkg = JSON.parse(kb.build_family_package_json("g", "o que significa o reason code CANONICAL_SOURCE_MISSING?", JSON.stringify([
  { tool: "REASON_CODE_LOOKUP", source_id: "reason-codes", title: "Registo de códigos de razão", path: "engines/banzai-query-core/src/reason.rs", text: rc.code + " — " + rc.explanation, kind: "static" },
])));
if (!Array.isArray(pkg.facts) || pkg.facts.length !== 1) err("family package must carry exactly the one tool fact");
if (!(pkg.tools_called || []).includes("REASON_CODE_LOOKUP")) err("family package must record the REASON_CODE_LOOKUP tool");
if (pkg.freshness !== "static") err("a reason-code family package is static");
if (!pkg.query_resolution || !pkg.tool_plan) err("family package must embed the resolution + tool plan");
if (!(pkg.allowed_source_ids || []).includes("reason-codes")) err("the reason-code registry must be citeable");

// 6) the Inc.4 claim/citation verifier — a grounded family answer passes; an unsupported claim / dead
//    citation is rejected (never published).
const good = JSON.parse(kb.verify_claims_json(JSON.stringify(pkg), JSON.stringify({ answer_markdown: "O código " + rc.code + " significa: " + rc.explanation, claims: [{ claim: rc.explanation, fact_ids: ["F1"] }], cited_source_ids: ["reason-codes"] })));
if (!good.ok) err("a grounded family answer must pass the claim/citation verifier: " + JSON.stringify(good.errors || []));
const unsupported = JSON.parse(kb.verify_claims_json(JSON.stringify(pkg), JSON.stringify({ answer_markdown: "algo sem base", claims: [{ claim: "algo sem base", fact_ids: [] }], cited_source_ids: [] })));
if (unsupported.ok) err("an unsupported claim must be rejected");
const dead = JSON.parse(kb.verify_claims_json(JSON.stringify(pkg), JSON.stringify({ answer_markdown: "x", claims: [{ claim: rc.explanation, fact_ids: ["F1"] }], cited_source_ids: ["ADR-999"] })));
if (dead.ok) err("a dead/invented citation must be rejected");

if (!bad) console.log("  ok: WASM — family classification + reason-code registry + diagnosis labelling + family package + claim/citation verifier");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# ── static: the handler REUSES the WASM builders/verifier + the injected receipts tool (no re-impl). ──
for sym in resolveQuery buildFamilyPackage buildFactualPackagePlanned explainReasonCode classifyDiagnosis verifyClaims; do
  grep -q "$sym" "$FAMILIES" || fail "$FAMILIES must reuse $sym from knowledge.js (no re-implementation)"
done
# Every grounded family answer flows through the Inc.4 claim/citation verifier before returning.
grep -q "verifyClaims(" "$FAMILIES" || fail "$FAMILIES must run verifyClaims on every composed family answer"
# The persisted-read step is the INJECTED receipts tool — the handler must NOT re-implement store/SQL/pg.
badsql=$(grep -nEi '\b(SELECT|INSERT|UPDATE|DELETE)\b|new Pool|require\("pg"\)|from "pg"|createHash|percentile' "$FAMILIES" | grep -vE '^\s*[0-9]+:\s*//' || true)
[ -z "$badsql" ] && ok "handler contains no tool/store business logic (reuse only)" || { fail "$FAMILIES reimplements a tool/store:"; printf '%s\n' "$badsql" | sed 's/^/      /'; }
# The pg-touching receipts read is INJECTED, never imported by the pg-free handler.
if grep -qE 'from "\./receipts|from "\./receiptsTool|require\("pg"\)' "$FAMILIES"; then
  fail "$FAMILIES must stay pg-free (the receipts tool is injected, never imported)"
else
  ok "handler is pg-free (the receipts tool is injected — pipeline stays pg-free)"
fi

# ── static: NO CANNED per-question answer strings — each family answer is BUILT from real data. ───────
# The reason-code answer is composed from the registry explanation; the diagnosis from the classifier's
# lines; the comparison from the diff fields; the documentary/hypothesis from the package facts.
grep -q "rc.explanation" "$FAMILIES" || fail "the reason-code answer must be built from the registry explanation (rc.explanation), not a canned string"
grep -q "report.lines" "$FAMILIES" || fail "the diagnosis answer must be built from the classifier lines (report.lines), not a canned string"
grep -qE "diff\.overall_status|diff\.steps|field\.a" "$FAMILIES" || fail "the comparison answer must be built from the real diff fields, not a canned string"
grep -qE "pkg\.facts\.map|f\.text" "$FAMILIES" || fail "the documentary/hypothesis answer must be built from the package facts, not a canned string"
# No question→answer lookup table (a pre-written map keyed by the exact question). Scan CODE only (strip
# line comments), so the module's own anti-canned documentation never trips the check.
canned=$(grep -vE '^\s*//' "$FAMILIES" | grep -nE 'const +ANSWERS *=|answersByQuestion|QUESTION_ANSWERS|const +CANNED' || true)
[ -z "$canned" ] && ok "no canned per-question answer table (answers are built from real data)" || { fail "$FAMILIES carries a question→answer table:"; printf '%s\n' "$canned" | sed 's/^/      /'; }

# ── static: the PIPELINE routes each family through plan → FactualPackage → verifier. ─────────────────
grep -q 'from "./questionFamilies.js"' "$PIPELINE" || fail "$PIPELINE must import the question-family handler"
grep -q "answerQuestionFamily(" "$PIPELINE" || fail "$PIPELINE must route through answerQuestionFamily"
grep -q 'terminal_kind: "question_family"' "$PIPELINE" || fail "$PIPELINE must label a grounded family answer terminal_kind=question_family"
grep -q "factualPackageSummary(fam.package)" "$PIPELINE" || fail "$PIPELINE must surface the family FactualPackage in meta"
grep -q "claim_verification_ok: true" "$PIPELINE" || fail "$PIPELINE must record that the family answer passed the verifier"
# The family tier must not run the model (deterministic, 0 model calls).
grep -q "familyAnswer" "$PIPELINE" || fail "$PIPELINE must build the deterministic family answer (llm_called:false)"
[ "$FAILED" -eq 0 ] && ok "pipeline routes each family through plan → FactualPackage → verifier (0 model calls)"

# ── static: the /ask envelope surfaces the family; the WASM transports exist; Rust owns the logic. ────
grep -q "question_family:" "$SERVER" || fail "$SERVER /ask envelope must surface question_family"
for sym in explainReasonCode buildFamilyPackage classifyDiagnosis; do
  grep -q "export function $sym" "$KB" || fail "$KB must export $sym (WASM transport)"
done
grep -q "pub fn resolve_reason_code" "$REASON" || fail "$REASON must own the reason-code resolver (Rust)"
grep -q "pub fn classify_diagnosis" "$DIAGNOSE" || fail "$DIAGNOSE must own the diagnosis classifier (Rust)"
# The diagnosis classifier is pure Rust — no model/provider/network selects a cause.
codeonly=$(grep -vE '^\s*//' "$DIAGNOSE" || true)
if printf '%s\n' "$codeonly" | grep -qiE '\b(qwen|provider|reqwest|generate\(|llm)\b|std::net|std::process|::spawn'; then
  fail "$DIAGNOSE must invoke NO model/provider/network — the classifier is pure Rust"
else
  ok "diagnosis + reason-code logic is pure Rust; WASM transports + /ask surfacing present"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "QUESTION FAMILIES CHECK FAILED ❌"
  exit 1
fi
echo "QUESTION FAMILIES CHECK PASSED ✅"
