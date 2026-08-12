#!/usr/bin/env bash
#
# BanzAI single Grounded-Synthesis contract guard (M2.18B.6, Part G).
#
# The permanent invariant: there is exactly ONE FactualPackage builder and ONE enriched contract. Rust
# resolves → plans → builds → validates; the model synthesises once from that single package. This guard
# proves the single contract is present and the retired dual builders are gone (it does NOT run a model):
#
#   A. ONE BUILDER — factpack.rs defines build_factual_package_planned and NEITHER of the retired
#      build_factual_package( / build_factual_package_multi( builders.
#   B. ONE WASM EXPORT — lib.rs exports build_factual_package_planned_json and NEITHER
#      build_factual_package_json nor build_factual_package_multi_json.
#   C. ONE JS WRAPPER — knowledge.js exports buildFactualPackagePlanned and NEITHER buildFactualPackage
#      nor buildFactualPackageMulti; grounded-synthesis.js builds the package via buildFactualPackagePlanned.
#   D. ENRICHED CONTRACT — the FactualPackage embeds the three Rust plans + provenance
#      (resolved_intent, answer_plan, retrieval_plan, citation_map, claims_forbidden, package_checksum),
#      and FACTUAL_PACKAGE_VERSION is 2.
#   E. VALIDATOR IS THE GATE — factcheck.rs validate_output exists and the enriched contract exposes the
#      contract versions (contract_versions_json) the cache + startup self-check bind.
#
# set -eu (house style). Exit 1 on any NEEDS_FIX, exit 2 if the guard's own self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }
has() { grep -Eq -- "$2" "$1"; }
absent() { ! grep -Eq -- "$2" "$1"; }

FACTPACK_RS="engines/banzai-query-core/src/factpack.rs"
LIB_RS="engines/banzai-api-kb/src/lib.rs"
FACTCHECK_RS="engines/banzai-query-core/src/factcheck.rs"
KNOWLEDGE_JS="services/banzai-api/src/knowledge.js"
SYNTH_JS="services/banzai-api/src/grounded-synthesis.js"

echo "BanzAI single Grounded-Synthesis contract (M2.18B.6)"

for f in "$FACTPACK_RS" "$LIB_RS" "$FACTCHECK_RS" "$KNOWLEDGE_JS" "$SYNTH_JS"; do
  [ -f "$f" ] || report "file present" "missing $f"
done

# A. one builder
has "$FACTPACK_RS" "pub fn build_factual_package_planned" || report "A one builder" "build_factual_package_planned missing"
absent "$FACTPACK_RS" "pub fn build_factual_package\(" || report "A retired single builder" "build_factual_package( still present"
absent "$FACTPACK_RS" "pub fn build_factual_package_multi" || report "A retired multi builder" "build_factual_package_multi still present"

# B. one WASM export
has "$LIB_RS" "pub fn build_factual_package_planned_json" || report "B planned export" "missing build_factual_package_planned_json"
absent "$LIB_RS" "pub fn build_factual_package_json" || report "B retired export" "build_factual_package_json still present"
absent "$LIB_RS" "pub fn build_factual_package_multi_json" || report "B retired multi export" "build_factual_package_multi_json still present"

# C. one JS wrapper + the trunk uses it
has "$KNOWLEDGE_JS" "export function buildFactualPackagePlanned" || report "C planned wrapper" "buildFactualPackagePlanned missing"
absent "$KNOWLEDGE_JS" "export function buildFactualPackage\b" || report "C retired wrapper" "buildFactualPackage still exported"
absent "$KNOWLEDGE_JS" "export function buildFactualPackageMulti" || report "C retired multi wrapper" "buildFactualPackageMulti still exported"
has "$SYNTH_JS" "buildFactualPackagePlanned\(" || report "C trunk uses planned" "grounded-synthesis.js does not build via buildFactualPackagePlanned"

# D. enriched contract
for field in "resolved_intent" "answer_plan" "retrieval_plan" "citation_map" "claims_forbidden" "package_checksum"; do
  has "$FACTPACK_RS" "pub $field:" || report "D enriched field" "FactualPackage missing $field"
done
has "$FACTPACK_RS" "FACTUAL_PACKAGE_VERSION: u32 = 2" || report "D contract version" "FACTUAL_PACKAGE_VERSION is not 2"

# E. validator + contract versions
has "$FACTCHECK_RS" "fn validate_output" || report "E validator" "validate_output missing"
has "$LIB_RS" "pub fn contract_versions_json" || report "E contract versions" "contract_versions_json export missing"

# --- self-test: the detectors must actually fire ---
st=$(mktemp); printf 'pub fn build_factual_package(\n' > "$st"
if absent "$st" "pub fn build_factual_package\("; then echo "SELF-TEST FAIL: retired-builder detector" >&2; rm -f "$st"; exit 2; fi
rm -f "$st"

if [ "$fail" -eq 0 ]; then
  ok "exactly one FactualPackage builder + enriched contract + validator gate"
  echo "banzai-single-synthesis-contract-check: OK"
else
  echo "banzai-single-synthesis-contract-check: NEEDS_FIX" >&2
  exit 1
fi
