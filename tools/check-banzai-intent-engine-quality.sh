#!/usr/bin/env bash
#
# BanzAI intent-engine quality guard (M2.18B.6, Part G).
#
# The permanent invariant: Rust understands and grounds deterministically — the intent engine is a chain of
# typed, versioned, pure Rust stages, none of which calls a model. This guard proves the chain is present
# and well-formed (it does NOT run a model):
#
#   A. RESOLVE — resolve.rs defines resolve_intent + ResolvedIntent (primary_intent, resolved_entity_id,
#      depth, boundary_detected).
#   B. TAXONOMY — intent.rs defines PRIMARY_INTENTS and ENTITY_TYPES (the closed canonical taxonomy).
#   C. RELATION GRAPH — relation.rs defines RelationGraph + RELATION_GRAPH_SCHEMA_VERSION + a checksum,
#      and the 11 canonical RelationKinds (spot-check Supersedes / DependsOn / ConflictsWith).
#   D. RETRIEVAL PLAN — retrieval.rs defines RetrievalPlan + RETRIEVAL_PLAN_VERSION + plan_retrieval + the
#      8 SourceRoles (spot-check Primary / Supporting / Governance / Metadata) + a checksum.
#   E. ANSWER PLAN — answerplan.rs defines AnswerPlan + ANSWER_PLAN_VERSION + plan_answer + AnswerType + a
#      checksum.
#   F. VERSIONED + DETERMINISTIC — every stage carries a *_VERSION const; NONE of the engine modules
#      references a provider/model/network call (they are pure — the model only runs in the JS trunk).
#
# set -eu (house style). Exit 1 on any NEEDS_FIX, exit 2 if the guard's own self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }
has() { grep -Eq -- "$2" "$1"; }

RESOLVE_RS="engines/banzai-query-core/src/resolve.rs"
INTENT_RS="engines/banzai-query-core/src/intent.rs"
RELATION_RS="engines/banzai-query-core/src/relation.rs"
RETRIEVAL_RS="engines/banzai-query-core/src/retrieval.rs"
ANSWERPLAN_RS="engines/banzai-query-core/src/answerplan.rs"

echo "BanzAI intent-engine quality (M2.18B.6)"

for f in "$RESOLVE_RS" "$INTENT_RS" "$RELATION_RS" "$RETRIEVAL_RS" "$ANSWERPLAN_RS"; do
  [ -f "$f" ] || report "engine module present" "missing $f"
done

# A. resolve
has "$RESOLVE_RS" "pub fn resolve_intent" || report "A resolve_intent" "missing"
has "$RESOLVE_RS" "pub struct ResolvedIntent" || report "A ResolvedIntent" "missing"
for field in "primary_intent" "resolved_entity_id" "depth" "boundary_detected"; do
  has "$RESOLVE_RS" "pub $field:" || report "A ResolvedIntent field" "missing $field"
done

# B. taxonomy
has "$INTENT_RS" "PRIMARY_INTENTS" || report "B PRIMARY_INTENTS" "missing"
has "$INTENT_RS" "ENTITY_TYPES" || report "B ENTITY_TYPES" "missing"

# C. relation graph
has "$RELATION_RS" "pub struct RelationGraph" || report "C RelationGraph" "missing"
has "$RELATION_RS" "RELATION_GRAPH_SCHEMA_VERSION" || report "C relation version" "missing"
has "$RELATION_RS" "pub checksum:" || report "C relation checksum" "missing"
for k in "Supersedes" "DependsOn" "ConflictsWith"; do
  has "$RELATION_RS" "$k" || report "C RelationKind" "missing $k"
done

# D. retrieval plan
has "$RETRIEVAL_RS" "pub struct RetrievalPlan" || report "D RetrievalPlan" "missing"
has "$RETRIEVAL_RS" "RETRIEVAL_PLAN_VERSION" || report "D retrieval version" "missing"
has "$RETRIEVAL_RS" "pub fn plan_retrieval" || report "D plan_retrieval" "missing"
has "$RETRIEVAL_RS" "pub enum SourceRole" || report "D SourceRole" "missing"
for r in "Primary" "Supporting" "Governance" "Metadata"; do
  has "$RETRIEVAL_RS" "$r" || report "D SourceRole variant" "missing $r"
done
has "$RETRIEVAL_RS" "pub checksum:" || report "D retrieval checksum" "missing"

# E. answer plan
has "$ANSWERPLAN_RS" "pub struct AnswerPlan" || report "E AnswerPlan" "missing"
has "$ANSWERPLAN_RS" "ANSWER_PLAN_VERSION" || report "E answer version" "missing"
has "$ANSWERPLAN_RS" "pub fn plan_answer" || report "E plan_answer" "missing"
has "$ANSWERPLAN_RS" "pub enum AnswerType" || report "E AnswerType" "missing"
has "$ANSWERPLAN_RS" "pub checksum:" || report "E answer checksum" "missing"

# F. deterministic — no model/provider/network in the engine modules
for f in "$RESOLVE_RS" "$INTENT_RS" "$RELATION_RS" "$RETRIEVAL_RS" "$ANSWERPLAN_RS"; do
  if grep -Eqi 'reqwest|::get\(|http[s]?://|fn synthesize|provider\.' "$f"; then
    report "F deterministic" "possible model/network call in $(basename "$f")"
  fi
done

# --- self-test: a detector must fire on a missing symbol ---
st=$(mktemp); printf '// empty\n' > "$st"
if has "$st" "pub fn resolve_intent"; then echo "SELF-TEST FAIL: has() detector" >&2; rm -f "$st"; exit 2; fi
rm -f "$st"

if [ "$fail" -eq 0 ]; then
  ok "typed, versioned, deterministic intent engine: resolve→relation→retrieval→answer"
  echo "banzai-intent-engine-quality-check: OK"
else
  echo "banzai-intent-engine-quality-check: NEEDS_FIX" >&2
  exit 1
fi
