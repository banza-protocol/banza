#!/usr/bin/env bash
#
# BanzAI Rust-First Grounded Synthesis architecture guard (M2.18B.6).
#
# The permanent invariant: Rust understands, routes and grounds; the model explains ONCE; Rust validates
# before publishing. There is exactly ONE model call per explanation (the grounded synthesis) and NO input
# model pass. This guard proves those invariants are present in the tree (it does NOT run a model):
#
#   A. ENGINE PRIMITIVES — the Rust modules + WASM exports the single pass needs exist: resolve.rs
#      (resolve_intent + classify_trunk_intent), catalogue.rs (select_entity), factpack.rs
#      (build_factual_package + FACTUAL_PACKAGE_VERSION), synth.rs (build_output_prompt + output_schema),
#      factcheck.rs (validate_output); lib.rs exports resolve_intent_json + the retrieval/synthesis JSON.
#   B. NO INPUT-MODEL CONTRACTS — the removed Qwen entry pass leaves NOTHING behind: no IntentEnvelope /
#      IntentEntry / intent_entry_schema / validate_intent_entry / refine_intent in intent.rs, no
#      build_interpretation_prompt in prompt.rs, no *_json for any of them in lib.rs.
#   C. SINGLE MODEL CALL — grounded-synthesis.js resolves intent deterministically (resolveIntent, Rust)
#      and makes exactly one model call (provider.synthesize); it has NO runEntryPass and never calls a
#      second model turn; the provider transport is `synthesize`, not the retired `interpret`.
#   D. CANDIDATE-CONSTRAINED OUTPUT — the output schema enumerates claims[].fact_ids AND cited_source_ids
#      from the FactualPackage.
#   E. FAIL-SAFE + VALIDATOR IS THE GATE — grounded-synthesis returns status "fallback" on failure; the
#      pipeline serves a grounded answer ONLY on status grounded; the Rust factual validator gates it.
#   F. NO ARCHITECTURE SELECTOR — there is NO BANZAI_UNIFIED_TWO_PASS / BANZAI_SINGLE_PASS selector and NO
#      BANZAI_INTENT_INTERPRETER anywhere in the service source; the synthesis gate configures the single
#      call via BANZAI_SYNTHESIS_MODEL / _TIMEOUT_MS / _AUTO_ROLLBACK only.
#   G. TESTS — the grounded-synthesis + publish tests are present.
#
# Comment-aware where it scans source. Self-tests its own detectors. set -eu (house style). Exit 1 on any
# NEEDS_FIX, exit 2 if the guard's own self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }

RESOLVE_RS="engines/banzai-query-core/src/resolve.rs"
INTENT_RS="engines/banzai-query-core/src/intent.rs"
PROMPT_RS="engines/banzai-query-core/src/prompt.rs"
CATALOGUE_RS="engines/banzai-query-core/src/catalogue.rs"
FACTPACK_RS="engines/banzai-query-core/src/factpack.rs"
SYNTH_RS="engines/banzai-query-core/src/synth.rs"
FACTCHECK_RS="engines/banzai-query-core/src/factcheck.rs"
LIB_RS="engines/banzai-api-kb/src/lib.rs"
SYNTH_JS="services/banzai-api/src/grounded-synthesis.js"
GATE_JS="services/banzai-api/src/synthesisGate.js"
PROVIDER_JS="services/banzai-api/src/provider.js"
PIPELINE_JS="services/banzai-api/src/pipeline.js"
KNOWLEDGE_JS="services/banzai-api/src/knowledge.js"
SYNTH_TEST="services/banzai-api/test/m2-18b6-grounded-synthesis.test.js"
PUBLISH_TEST="services/banzai-api/test/m2-18b6-synthesis-publish.test.js"

# Strip // and /* */ comments so a rule matches CODE, not prose/comments (Rust + JS).
strip() { perl -0777 -pe 's{//[^\n]*}{}g; s{/\*.*?\*/}{}gs' "$1" 2>/dev/null || cat "$1"; }
need_file() { [ -f "$1" ] || report "$2" "missing $1"; }
has() { grep -q "$2" <(strip "$1") 2>/dev/null; }

echo "BanzAI Rust-First Grounded Synthesis architecture (M2.18B.6)"

# ── A. engine primitives ────────────────────────────────────────────────────────────────────────
need_file "$RESOLVE_RS"   "A1 resolve.rs"
need_file "$CATALOGUE_RS" "A2 catalogue.rs"
need_file "$FACTPACK_RS"  "A3 factpack.rs"
need_file "$SYNTH_RS"     "A4 synth.rs"
need_file "$FACTCHECK_RS" "A5 factcheck.rs"
has "$RESOLVE_RS" "fn resolve_intent"          || report "A6 resolver"          "resolve_intent missing"
has "$RESOLVE_RS" "fn classify_trunk_intent"   || report "A7 classifier"        "classify_trunk_intent missing"
has "$CATALOGUE_RS" "fn select_entity"         || report "A8 entity selection"  "select_entity missing"
has "$FACTPACK_RS" "fn build_factual_package"  || report "A9 factual package"   "build_factual_package missing"
has "$FACTPACK_RS" "FACTUAL_PACKAGE_VERSION"   || report "A10 package version"  "FACTUAL_PACKAGE_VERSION missing"
has "$SYNTH_RS" "fn build_output_prompt"       || report "A11 output prompt"    "build_output_prompt missing"
has "$SYNTH_RS" "fn output_schema"             || report "A12 output schema"    "output_schema missing"
has "$FACTCHECK_RS" "fn validate_output"       || report "A13 factual validator" "validate_output missing"
# M2.18B.6 §11 single contract: the ONE builder is build_factual_package_planned_json (the retired
# build_factual_package_json / _multi_json exports are gone — the old-architecture-clean guard proves it).
for exp in resolve_intent_json select_entity_json build_factual_package_planned_json \
           build_output_prompt_json output_schema_json validate_output_json; do
  has "$LIB_RS" "pub fn $exp" || report "A14 wasm export" "missing export $exp"
done
[ "$fail" -eq 0 ] && ok "engine primitives + WASM exports present"

# ── B. no input-model contracts survive ───────────────────────────────────────────────────────────
b=0
for sym in IntentEnvelope IntentEntry intent_entry_schema validate_intent_entry refine_intent; do
  if has "$INTENT_RS" "$sym"; then report "B1 dead input contract" "intent.rs still defines $sym"; b=1; fi
done
if has "$PROMPT_RS" "build_interpretation_prompt"; then report "B2 dead prompt" "prompt.rs still builds the input interpreter prompt"; b=1; fi
for exp in validate_intent_envelope_json intent_envelope_json_schema_json intent_entry_schema_json \
           validate_intent_entry_json refine_intent_json build_interpretation_prompt_json; do
  if has "$LIB_RS" "pub fn $exp"; then report "B3 dead wasm export" "lib.rs still exports $exp"; b=1; fi
done
[ "$b" -eq 0 ] && ok "no input-model contracts survive (envelope/entry/prompt/refine gone)"

# ── C. single model call ──────────────────────────────────────────────────────────────────────────
c=0
need_file "$SYNTH_JS" "C0 grounded-synthesis.js"
has "$SYNTH_JS" "resolveIntent" || { report "C1 rust resolution" "grounded-synthesis does not use the Rust resolveIntent"; c=1; }
has "$SYNTH_JS" "runOutputPass" || { report "C2 synthesis pass" "runOutputPass missing"; c=1; }
if has "$SYNTH_JS" "runEntryPass"; then report "C3 no input pass" "grounded-synthesis still has an input pass (runEntryPass)"; c=1; fi
has "$SYNTH_JS" "provider.synthesize" || { report "C4 single call" "grounded-synthesis does not call provider.synthesize"; c=1; }
if has "$SYNTH_JS" "provider.interpret"; then report "C5 retired transport" "grounded-synthesis still calls the retired provider.interpret"; c=1; fi
# exactly one provider.synthesize call site in the synthesis module (the single model call)
n_calls="$(grep -c "provider.synthesize(" <(strip "$SYNTH_JS") || true)"
[ "${n_calls:-0}" = "1" ] || { report "C6 exactly one call" "expected exactly 1 provider.synthesize call, found ${n_calls:-0}"; c=1; }
has "$PROVIDER_JS" "async synthesize" || { report "C7 provider method" "provider has no synthesize() method"; c=1; }
[ "$c" -eq 0 ] && ok "one deterministic resolution + exactly one grounded synthesis call"

# ── D. candidate-constrained output ───────────────────────────────────────────────────────────────
d=0
has "$SYNTH_RS" "fact_ids"        || { report "D1 output claim map" "fact_ids not in output schema"; d=1; }
has "$SYNTH_RS" "cited_source_ids" || { report "D2 output citations" "cited_source_ids not in output schema"; d=1; }
# SPR-4 §5 — structured generation: the model authors only the linguistic core; cited_source_ids is
# DERIVED deterministically (⊆ allowed_source_ids by construction) under the UNCHANGED validator. Pin the
# structured schema builder + the derivation + its wiring so the contract can't silently regress.
has "$SYNTH_RS" "output_schema_structured"  || { report "D3 structured schema" "output_schema_structured (SPR-4 §5) missing from synth.rs"; d=1; }
has "$SYNTH_RS" "derive_cited_source_ids"   || { report "D4 deterministic derivation" "derive_cited_source_ids (SPR-4 §5) missing from synth.rs"; d=1; }
has "$SYNTH_JS" "deriveCitedSourceIds"      || { report "D5 derivation wired" "grounded-synthesis does not derive cited_source_ids in the structured path"; d=1; }
[ "$d" -eq 0 ] && ok "candidate-constrained output schema (fact_ids + cited_source_ids) + SPR-4 §5 structured derivation"

# ── E. fail-safe + validator is the gate ──────────────────────────────────────────────────────────
e=0
has "$SYNTH_JS" '"fallback"' || { report "E1 fail-safe" "grounded-synthesis has no fallback status"; e=1; }
has "$PIPELINE_JS" 'tp.status === "grounded"' || { report "E2 grounded gate" "pipeline does not gate on status grounded"; e=1; }
has "$KNOWLEDGE_JS" "validateOutput" || { report "E3 validator wrapper" "validateOutput wrapper missing"; e=1; }
has "$SYNTH_JS" "validateOutput"     || { report "E4 validator wired" "grounded-synthesis does not call validateOutput"; e=1; }
has "$SYNTH_JS" "factual_ok"         || { report "E5 factual signal" "factual_ok not tracked"; e=1; }
# M2.19G.5C (ADR-073) — the MANDATORY post-synthesis authority validator is a publish-gate step on the
# grounded path (postValidate on the exact bytes, before groundedAnswer/cache/return; a failure degrades
# with a post_validation_ reason). Full assertion lives in check-banzai-post-synthesis-validation.sh; here
# we assert the gate is present in the pipeline so this architecture guard fails if it is ever removed.
has "$PIPELINE_JS" "const verdict = postValidate(answerText)" || { report "E6 post-synthesis gate" "the mandatory ADR-073 post-synthesis validator is not wired on the grounded publish path"; e=1; }
has "$PIPELINE_JS" "post_validation_" || { report "E6 post-synthesis reason" "no post_validation_ fallback reason emitted"; e=1; }
[ "$e" -eq 0 ] && ok "fail-safe fallback + Rust factual validator + mandatory post-synthesis authority gate (ADR-073) before publish"

# ── F. no architecture selector ───────────────────────────────────────────────────────────────────
f=0
if grep -REl "BANZAI_UNIFIED_TWO_PASS|BANZAI_SINGLE_PASS|BANZAI_INTENT_INTERPRETER\b" services/banzai-api/src >/dev/null 2>&1; then
  report "F1 no selector" "an architecture selector / interpreter flag survives in services/banzai-api/src"; f=1
fi
has "$GATE_JS" "BANZAI_SYNTHESIS_MODEL" || { report "F2 synthesis config" "synthesisGate does not read BANZAI_SYNTHESIS_MODEL"; f=1; }
[ "$f" -eq 0 ] && ok "no architecture selector; the single call is configured via BANZAI_SYNTHESIS_*"

# ── G. tests ──────────────────────────────────────────────────────────────────────────────────────
need_file "$SYNTH_TEST"   "G1 grounded-synthesis tests"
need_file "$PUBLISH_TEST" "G2 synthesis publish tests"

# ── self-test: prove the detectors actually fire on a negative fixture ────────────────────────────
selftest_fail=0
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
printf 'export function runEntryPass(){}\n' > "$tmp/neg.js"
if ! has "$tmp/neg.js" "runEntryPass"; then
  echo "  ‼ self-test: C3 input-pass detector failed to fire" >&2; selftest_fail=1
fi
printf 'pub fn refine_intent(){}\n' > "$tmp/neg.rs"
if ! has "$tmp/neg.rs" "refine_intent"; then
  echo "  ‼ self-test: B1 dead-contract detector failed to fire" >&2; selftest_fail=1
fi
if [ "$selftest_fail" -ne 0 ]; then
  echo "GUARD SELF-TEST FAILED" >&2
  exit 2
fi

if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "banzai-grounded-synthesis-architecture-check: NEEDS_FIX" >&2
  exit 1
fi
echo "banzai-grounded-synthesis-architecture-check: OK"
