#!/usr/bin/env bash
# check-banzai-factual-package.sh — the transversal FactualPackage + claim/citation verifier guard (Inc.4, §7–§9).
#
# Verifies the CONTRACT behaviourally via the committed Rust WASM (engines/banzai-query-core →
# banzai-api-kb → services/banzai-api/src/rustkb) plus a static wiring check of the pipeline:
#   §7  ONE transversal FactualPackage, BUILT BEFORE any linguistic synthesis, for the documentary trunk
#       AND the operational/telemetry path: it carries the taxonomy resolution + sub-intents + the ToolPlan
#       (documentary) and the tool_results + calculations + sample_size + aggregation_method (operational);
#   §8  the 5-category claim taxonomy (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED) with the
#       label / derivation / causality / single-observation rules — an UNSUPPORTED claim never reaches the
#       answer, ESTIMATED/HYPOTHETICAL must be labelled, a DERIVED metric must expose data/formula/method/
#       filters/period/sample;
#   §9  the claim + citation verifier runs on the composed answer — a dead/invented citation → reject; and
#       the pipeline wires the flow (FactualPackage → template OR Qwen → claim verification → citation
#       verification → answer) with the Qwen constraints (grammar-constrained output; numbers only from the
#       tool/package, never the model).
# The decision LOGIC is Rust; this wrapper only drives it and inspects the wiring.
#
# CI gotcha: this guard drives ONLY the self-contained WASM (rustkb) — never a module that transitively
# loads `pg` — so it runs in the M2.13B guard job that does not install banzai-api node_modules.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
PIPELINE="services/banzai-api/src/pipeline.js"
SYNTH="services/banzai-api/src/grounded-synthesis.js"
KB="services/banzai-api/src/knowledge.js"
SERVER="services/banzai-api/src/server.js"
FACTPACK_RS="engines/banzai-query-core/src/factpack.rs"
FACTCHECK_RS="engines/banzai-query-core/src/factcheck.rs"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
for f in "$PIPELINE" "$SYNTH" "$KB" "$SERVER" "$FACTPACK_RS" "$FACTCHECK_RS"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-factual-package-check (Increment 4, §7–§9) =="

# ── self-test: the detectors must actually fire. ─────────────────────────────────────────────────────
printf '%s\n' 'UNSUPPORTED' | grep -q 'UNSUPPORTED' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── behavioural: drive the committed Rust WASM (verify_claims_json + the two package builders). ───────
node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };
const docPkg = JSON.parse(kb.build_factual_package_planned_json("t", "explica a ADR-002 sobre a inversao de nomes", "ADR-002", "brief"));
const verify = (pkg, out) => JSON.parse(kb.verify_claims_json(JSON.stringify(pkg), JSON.stringify(out)));
const cat = (claim, fact_ids = []) => verify(docPkg, { answer_markdown: `x ${claim} y`, claims: [{ claim, fact_ids }], cited_source_ids: [] }).classified[0].category;

// §7 — the documentary package is built (before any synthesis) and carries the transversal enrichment.
if (!docPkg.query_resolution) err("documentary package missing query_resolution (resolution before synthesis)");
if (!docPkg.tool_plan) err("documentary package missing tool_plan");
if (docPkg.freshness !== "static") err(`documentary freshness ${docPkg.freshness} (want static)`);
if (!Array.isArray(docPkg.query_resolution && docPkg.query_resolution.sub_intents)) err("query_resolution has no sub_intents");

// §7 — the operational package is built from the tool output, no model, and carries the calc/sample/tools.
const duration = { measure_type: "mediana", comparable_runs: 3, profile: "L0", environment: "sandbox", protocol_version: "1.0.0", implementation_id: "impl", median_ms: 12800, observed_from: "2026-08-01", observed_to: "2026-08-05", aggregation_method: "median", percentile_method: "percentile_cont" };
const opClaims = [{ claim: "latest_observed_total", category: "SUPPORTED", value_ms: 13200 }, { claim: "median_total", category: "DERIVED", value_ms: 12800 }];
const opSources = [{ id: "telemetry:impl:L0:sandbox:1.0.0", title: "Telemetria", path: "/x" }];
const opPkg = JSON.parse(kb.build_operational_package_json("t", "quanto demora a jornada de validação", JSON.stringify(duration), JSON.stringify(opClaims), JSON.stringify(opSources)));
if (opPkg.freshness !== "persisted") err(`operational freshness ${opPkg.freshness} (want persisted)`);
if (!(opPkg.tools_called || []).includes("METRICS_QUERY")) err("operational package does not record METRICS_QUERY");
if (!(opPkg.calculations || []).length) err("operational package exposes no calculation");
if (opPkg.sample_size !== 3) err(`operational sample_size ${opPkg.sample_size} (want 3)`);
if (opPkg.aggregation_method !== "median") err(`operational aggregation_method ${opPkg.aggregation_method}`);
const c0 = (opPkg.calculations || [])[0] || {};
for (const f of ["data", "formula", "method", "filters", "period"]) if (!c0[f]) err(`DERIVED calc missing ${f}`);
if (!(c0.sample_size >= 1)) err("DERIVED calc missing sample_size");

// §8 — the five categories are assigned correctly.
if (cat("inverte a nomenclatura", ["F1"]) !== "SUPPORTED") err("grounded claim not SUPPORTED");
if (cat("a duracao e aproximadamente rapida") !== "ESTIMATED") err("estimate marker not ESTIMATED");
if (cat("a titulo de exemplo ilustrativo federa") !== "HYPOTHETICAL") err("hypothesis marker not HYPOTHETICAL");
if (cat("garante retorno certo") !== "UNSUPPORTED") err("ungrounded claim not UNSUPPORTED");
if (cat("inverte a nomenclatura", ["F99"]) !== "UNSUPPORTED") err("bad fact id not UNSUPPORTED");

// §8 — an UNSUPPORTED claim is blocked (never reaches the answer).
if (verify(docPkg, { answer_markdown: "garante lucro", claims: [{ claim: "garante lucro certo", fact_ids: [] }], cited_source_ids: [] }).ok) err("an unsupported claim was not blocked");
// §8 — ESTIMATED/HYPOTHETICAL must be labelled.
if (verify(docPkg, { answer_markdown: "a duracao e rapida", claims: [{ claim: "duracao aproximadamente rapida", category: "ESTIMATED" }], cited_source_ids: [] }).ok) err("an unlabelled estimate was not blocked");
if (!verify(docPkg, { answer_markdown: "a duracao e aproximadamente rapida (estimativa)", claims: [{ claim: "duracao aproximadamente rapida", category: "ESTIMATED" }], cited_source_ids: [] }).ok) err("a labelled estimate was wrongly blocked");
// §8 — a DERIVED metric must expose its calculation (operational ok; documentary reject).
if (!verify(opPkg, { answer_markdown: "a mediana foi 12.8 s", claims: [{ claim: "median_total", category: "DERIVED" }], cited_source_ids: ["telemetry:impl:L0:sandbox:1.0.0"] }).ok) err("exposed DERIVED calc wrongly blocked");
if (verify(docPkg, { answer_markdown: "a mediana foi X", claims: [{ claim: "median_total", category: "DERIVED" }], cited_source_ids: [] }).ok) err("an underived DERIVED claim was not blocked");

// §9 — citation verification: a real citation passes, a dead/invented one is rejected.
if (!verify(docPkg, { answer_markdown: "A ADR-002 inverte a nomenclatura.", claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }], cited_source_ids: ["ADR-002"] }).ok) err("a real citation was wrongly rejected");
const dead = verify(docPkg, { answer_markdown: "A ADR-002 inverte a nomenclatura.", claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }], cited_source_ids: ["ADR-039"] });
if (dead.ok || !(dead.dead_citations || []).includes("ADR-039")) err("a dead citation was not rejected");

// determinism — the same package is byte-identical across builds (no model, no state).
const a = kb.build_factual_package_planned_json("t", "o que e a inversao de nomes", "", "");
const b = kb.build_factual_package_planned_json("t", "o que e a inversao de nomes", "", "");
if (a !== b) err("the documentary package build is not deterministic");

if (!bad) console.log("  ok: WASM transversal package (doc+operational) + 5-category taxonomy + UNSUPPORTED-block + citation verification");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# ── static: the ONE package is built BEFORE synthesis and the verifier runs on the composed answer. ───
grep -q "build_factual_package_planned" "$FACTPACK_RS" || fail "$FACTPACK_RS missing the single planned builder"
grep -q "pub fn build_operational_package" "$FACTPACK_RS" || fail "$FACTPACK_RS missing build_operational_package (transversal operational build)"
# the documentary package embeds the resolution + tool plan (transversal §7).
grep -q "pub query_resolution:" "$FACTPACK_RS" || fail "$FACTPACK_RS FactualPackage missing query_resolution"
grep -q "pub tool_plan:" "$FACTPACK_RS" || fail "$FACTPACK_RS FactualPackage missing tool_plan"
grep -q "pub calculations:" "$FACTPACK_RS" || fail "$FACTPACK_RS FactualPackage missing calculations"
grep -q "pub tool_results:" "$FACTPACK_RS" || fail "$FACTPACK_RS FactualPackage missing tool_results"
grep -q "pub live_sources:" "$FACTPACK_RS" || fail "$FACTPACK_RS FactualPackage missing live_sources"
# the 5-category taxonomy + verifier live in factcheck.rs (reuse the existing validator as the base).
grep -q "enum ClaimCategory" "$FACTCHECK_RS" || fail "$FACTCHECK_RS missing the 5-category ClaimCategory"
for wcat in Supported Derived Estimated Hypothetical Unsupported; do
  grep -q "$wcat" "$FACTCHECK_RS" || fail "$FACTCHECK_RS ClaimCategory missing $wcat"
done
grep -q "pub fn classify_and_verify" "$FACTCHECK_RS" || fail "$FACTCHECK_RS missing classify_and_verify (claim+citation verifier)"
grep -q "fn validate_output" "$FACTCHECK_RS" || fail "$FACTCHECK_RS must keep the base factual validator (reuse)"
[ "$FAILED" -eq 0 ] && ok "Rust: single builder + transversal fields + build_operational_package + 5-category verifier (reuses validate_output)"

# ── static: the pipeline wires the flow + Qwen constraints. ───────────────────────────────────────────
# §9 flow: the trunk builds the package (buildFactualPackagePlanned) BEFORE the single model call
# (provider.synthesize), then the claim/citation verifier runs on the composed answer (verifyClaims).
grep -q "verifyClaims" "$SYNTH" || fail "$SYNTH does not run the claim/citation verifier (verifyClaims)"
grep -q "buildFactualPackagePlanned" "$SYNTH" || fail "$SYNTH does not build the FactualPackage before synthesis"
# the package is built before the output pass runs the single Qwen call: in runGroundedSynthesis, the
# buildFactualPackagePlanned call precedes the `await runOutputPass(` call (which is where the model runs).
build_line=$(grep -n "buildFactualPackagePlanned(" "$SYNTH" | head -1 | cut -d: -f1)
pass_line=$(grep -n "await runOutputPass(" "$SYNTH" | head -1 | cut -d: -f1)
if [ -n "$build_line" ] && [ -n "$pass_line" ] && [ "$build_line" -lt "$pass_line" ]; then
  ok "the FactualPackage is built BEFORE the single Qwen call (§9 flow)"
else
  fail "$SYNTH must build the FactualPackage before the output pass / Qwen call (§9 flow order)"
fi
# Qwen constraint: the output is grammar-constrained to the package (the model cannot invent a fact ref or
# a citation; it never chooses the sample or the numbers — those are Rust/tool-owned).
grep -q "outputSchema" "$SYNTH" || fail "$SYNTH must constrain the model output to the package (outputSchema)"

# operational path: routed through the SAME package + verification (numbers from the tool, 0 model calls).
grep -q "buildOperationalPackage" "$PIPELINE" || fail "$PIPELINE does not build the transversal operational package"
grep -q "verifyClaims" "$PIPELINE" || fail "$PIPELINE does not verify the operational answer"
grep -q "factualPackageSummary" "$PIPELINE" || fail "$PIPELINE does not surface the compact factual_package summary"
# the operational number path never calls the model (deterministic terminal).
grep -q "resolveOperationalMetric" "$PIPELINE" || fail "$PIPELINE missing the operational classifier"

# transports + /ask surface.
grep -q "export function verifyClaims" "$KB" || fail "$KB must export verifyClaims"
grep -q "export function buildOperationalPackage" "$KB" || fail "$KB must export buildOperationalPackage"
grep -q "factual_package:" "$SERVER" || fail "$SERVER /ask envelope must surface factual_package"
[ "$FAILED" -eq 0 ] && ok "pipeline wiring (package before synthesis + verifier + operational-through-package + Qwen constraints + /ask surface)"

if [ "$FAILED" -ne 0 ]; then
  echo "FACTUAL PACKAGE CHECK FAILED ❌"
  exit 1
fi
echo "FACTUAL PACKAGE CHECK PASSED ✅"
