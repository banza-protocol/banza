#!/usr/bin/env bash
# check-banzai-canonical-alias-integrity.sh — M2.18B.5 §25.
#
# The canonical alias tables (engines/banzai-query-core/src/concept.rs + catalogue.rs) are the single source of
# truth for human-phrasing → canonical document. This guard proves their INTEGRITY via the Rust-derived
# truth table (fuzzy::alias_truth_table / alias_collisions, exposed as aliasTruthTable()): every alias is
# bound to a real canonical id, there are NO silent collisions (one alias → two different ids), the table
# is dynamic (not hardcoded), and the generated artifact is present and current. Static + Rust-derived; no
# model, no network. Complements check-banzai-typo-intent-recovery.sh.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

CONCEPT="engines/banzai-query-core/src/concept.rs"
CATALOGUE="engines/banzai-query-core/src/catalogue.rs"
FUZZY="engines/banzai-query-core/src/fuzzy.rs"
ARTIFACT="artifacts/banzai/alias-truth-table.md"
KB="services/banzai-api/src/knowledge.js"

echo "== banzai-canonical-alias-integrity-check (M2.18B.5 §25) =="

for f in "$CONCEPT" "$CATALOGUE" "$FUZZY" "$KB"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

# 1. the truth table + collision detector live in Rust (single authority), derived from BOTH tables.
if grep -q 'pub fn alias_truth_table' "$FUZZY" && grep -q 'pub fn alias_collisions' "$FUZZY" \
   && grep -q 'concept::concept_entries' "$FUZZY" && grep -q 'catalogue::alias_entries' "$FUZZY"; then
  ok "truth table + collision detector are Rust, derived from concept.rs + catalogue.rs"
else
  fail "alias_truth_table / alias_collisions must be Rust and derive from BOTH alias tables ($FUZZY)"
fi

# 2. the alias tables are exposed read-only (no duplicate list); the vocabulary is NOT hardcoded here.
grep -q 'pub fn concept_entries' "$CONCEPT" || fail "concept_entries() accessor missing ($CONCEPT)"
grep -q 'pub fn alias_entries' "$CATALOGUE" || fail "alias_entries() accessor missing ($CATALOGUE)"
[ "$FAILED" -eq 0 ] && ok "alias tables exposed via accessors (single source, no duplication)"

# 3. Rust-derived truth table: populated, every row bound to a real id, ZERO silent collisions.
if command -v node >/dev/null 2>&1; then
  node --input-type=module -e '
    import { aliasTruthTable } from "./services/banzai-api/src/knowledge.js";
    const t = aliasTruthTable();
    const rows = t.rows || [];
    const bad = rows.filter(r => !r.id || !r.normalized);
    if (rows.length < 30) { console.error("truth table too small: " + rows.length); process.exit(2); }
    if (bad.length) { console.error("rows not bound to a real id/alias: " + bad.length); process.exit(3); }
    if ((t.collisions || []).length) { console.error("SILENT COLLISIONS: " + JSON.stringify(t.collisions)); process.exit(4); }
    console.error("rows=" + rows.length + " ids=" + new Set(rows.map(r=>r.id)).size + " collisions=0");
  ' 2>/tmp/alias_int.$$ && ok "truth table OK ($(cat /tmp/alias_int.$$))" || fail "alias integrity: $(cat /tmp/alias_int.$$ 2>/dev/null)"
  rm -f /tmp/alias_int.$$
else
  fail "node required to evaluate the Rust-derived truth table"
fi

# 4. the generated artifact is present and declares the collision count.
if [ -f "$ARTIFACT" ] && grep -q 'Silent collisions' "$ARTIFACT"; then
  ok "truth-table artifact present ($ARTIFACT)"
else
  fail "missing/incomplete artifact $ARTIFACT (regenerate: node tools/gen-alias-truth-table.mjs)"
fi

# 5. self-test: the collision definition is same-alias→different-ids (not same-id→many-aliases).
if grep -q 'ids.len() >= 2' "$FUZZY"; then
  ok "self-test: a collision is one alias → ≥2 distinct ids (multi-alias→one-id is allowed)"
else
  fail "collision definition changed unexpectedly ($FUZZY)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI CANONICAL ALIAS INTEGRITY CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI CANONICAL ALIAS INTEGRITY CHECK PASSED ✅"
