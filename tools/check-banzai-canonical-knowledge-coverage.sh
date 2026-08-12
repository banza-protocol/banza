#!/usr/bin/env bash
#
# BanzAI canonical-knowledge coverage guard (M2.18B.7).
#
# The permanent invariant: a KNOWN canonical entity is always answerable — grounded on its declared
# primary sources, or its attribute is explicitly declared / NOT_DECLARED — and an existing canonical
# source can NEVER degrade silently into the generic topic-list "insufficient evidence". This guard proves
# the coverage layer is present and wired (it does NOT run a model):
#
#   A. ENTITY COVERAGE — coverage.rs declares ENTITY_PRIMARY_SOURCES + entity_primary_docs/has_coverage/
#      covered_entities, and the three ecosystem entities (banza/banzai/banzami) are covered.
#   B. COVERAGE FALLBACK — factpack.rs draws the entity's declared primary sources when retrieval is empty
#      (selection_reason "entity_primary_source_coverage"), so a known entity never yields an empty package.
#   C. ATTRIBUTE REGISTRY — attribute.rs answers a DECLARED exact fact (the protocol creation date, from
#      NOTICE) as a fact with its source, and an UNDECLARED attribute (protocol version) with a PRECISE
#      NOT_DECLARED message — both deterministic, never inferred, and it states the no-inference rule.
#   D. REASON CODES — reason.rs defines the closed ReasonCode enum incl. ATTRIBUTE_NOT_DECLARED and the
#      internal-coverage-failure codes (SOURCE_EXISTS_BUT_NOT_RESOLVED / FACTUAL_PACKAGE_EMPTY) flagged as
#      internal (never a silent public generic answer).
#   E. WASM + JS WIRING — lib.rs exports covered_entities_json + attribute_answer_json; knowledge.js exports
#      coveredEntities + attributeAnswer; pipeline.js seeds the covered route entity + serves the attribute
#      terminal (attribute_not_declared) — never the generic list for a covered attribute.
#   F. NO SILENT DEGRADE — the generic topic-list FALLBACK message is NOT emitted for the attribute terminal
#      (the attribute answer carries its own precise message).
#
# set -eu (house style). Exit 1 on any NEEDS_FIX, exit 2 if the guard's own self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }
has() { grep -Eq -- "$2" "$1"; }

COVERAGE_RS="engines/banzai-query-core/src/coverage.rs"
ATTRIBUTE_RS="engines/banzai-query-core/src/attribute.rs"
REASON_RS="engines/banzai-query-core/src/reason.rs"
FACTPACK_RS="engines/banzai-query-core/src/factpack.rs"
LIB_RS="engines/banzai-api-kb/src/lib.rs"
KNOWLEDGE_JS="services/banzai-api/src/knowledge.js"
PIPELINE_JS="services/banzai-api/src/pipeline.js"

echo "BanzAI canonical-knowledge coverage (M2.18B.7)"

for f in "$COVERAGE_RS" "$ATTRIBUTE_RS" "$REASON_RS" "$FACTPACK_RS" "$LIB_RS" "$KNOWLEDGE_JS" "$PIPELINE_JS"; do
  [ -f "$f" ] || report "file present" "missing $f"
done

# A. entity coverage
has "$COVERAGE_RS" "ENTITY_PRIMARY_SOURCES" || report "A coverage table" "ENTITY_PRIMARY_SOURCES missing"
has "$COVERAGE_RS" "pub fn entity_primary_docs" || report "A entity_primary_docs" "missing"
has "$COVERAGE_RS" "pub fn covered_entities" || report "A covered_entities" "missing"
for e in "what-is-banza" "def-banzai-agent" "what-is-banzami"; do
  has "$COVERAGE_RS" "\"$e\"" || report "A core entity covered" "missing $e"
done

# B. coverage fallback in the builder
has "$FACTPACK_RS" "entity_primary_source_coverage" || report "B coverage fallback" "factpack.rs missing entity_primary_source_coverage"
has "$FACTPACK_RS" "crate::coverage::entity_primary_docs" || report "B builder uses coverage" "factpack.rs does not consult coverage"

# C. attribute registry
has "$ATTRIBUTE_RS" "pub fn resolve_attribute_query" || report "C resolve_attribute_query" "missing"
has "$ATTRIBUTE_RS" "Declared" || report "C DECLARED status" "missing"
has "$ATTRIBUTE_RS" "NotDeclared" || report "C NOT_DECLARED status" "missing"
has "$ATTRIBUTE_RS" "asks_creation_date" || report "C creation attribute" "missing creation detector"
# creation is DECLARED (from NOTICE), version is NOT_DECLARED — both exact-fact paths present.
has "$ATTRIBUTE_RS" "ExactFactConfirmed|EXACT_FACT_CONFIRMED" || report "C declared fact" "no DECLARED exact-fact"
has "$ATTRIBUTE_RS" "nao declara|não declara|not declared" || report "C precise message" "no NOT_DECLARED message"
grep -Eqi "never inferred|nunca (é )?inferid|Git history|commit dates" "$ATTRIBUTE_RS" || report "C no-inference rule" "attribute.rs must state values are never inferred"

# D. reason codes
has "$REASON_RS" "enum ReasonCode" || report "D ReasonCode enum" "missing"
has "$REASON_RS" "ATTRIBUTE_NOT_DECLARED" || report "D ATTRIBUTE_NOT_DECLARED" "missing"
has "$REASON_RS" "SOURCE_EXISTS_BUT_NOT_RESOLVED" || report "D internal-coverage code" "missing SOURCE_EXISTS_BUT_NOT_RESOLVED"
has "$REASON_RS" "FACTUAL_PACKAGE_EMPTY" || report "D internal-coverage code" "missing FACTUAL_PACKAGE_EMPTY"
has "$REASON_RS" "fn is_internal_coverage_failure" || report "D internal-failure flag" "missing"

# E. WASM + JS wiring
has "$LIB_RS" "pub fn covered_entities_json" || report "E WASM covered_entities" "missing"
has "$LIB_RS" "pub fn attribute_answer_json" || report "E WASM attribute_answer" "missing"
has "$KNOWLEDGE_JS" "export function coveredEntities" || report "E JS coveredEntities" "missing"
has "$KNOWLEDGE_JS" "export function attributeAnswer" || report "E JS attributeAnswer" "missing"
has "$PIPELINE_JS" "coveredEntities\(\)\.has" || report "E pipeline covered-entity seed" "missing"
has "$PIPELINE_JS" "attribute_not_declared" || report "E pipeline attribute terminal" "missing"

# F. no silent degrade — the attribute terminal uses the attribute's own answer, not the generic message.
if grep -n "attributeAnswer(correctedQuestion)" "$PIPELINE_JS" >/dev/null 2>&1; then
  ok "attribute terminal wired to the corrected question"
else
  report "F attribute terminal" "pipeline.js does not build the attribute terminal from attributeAnswer"
fi

# --- self-test: a detector must fire on a missing symbol ---
st=$(mktemp); printf '// empty\n' > "$st"
if has "$st" "ENTITY_PRIMARY_SOURCES"; then echo "SELF-TEST FAIL: has() detector" >&2; rm -f "$st"; exit 2; fi
rm -f "$st"

if [ "$fail" -eq 0 ]; then
  ok "canonical entity + attribute coverage present, wired, and never silently degraded"
  echo "banzai-canonical-knowledge-coverage-check: OK"
else
  echo "banzai-canonical-knowledge-coverage-check: NEEDS_FIX" >&2
  exit 1
fi
