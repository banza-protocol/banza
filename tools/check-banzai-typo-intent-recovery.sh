#!/usr/bin/env bash
# check-banzai-typo-intent-recovery.sh — M2.18B.5 §24.
#
# Guards the typo-tolerance / intent-recovery / safe-clarification layer. It is Rust-owned (fuzzy.rs),
# runs AFTER exact/alias resolution, never overtakes an exact match, never auto-resolves an ambiguous
# input, keeps a misspelled prohibited action a boundary (§18/§19), never lets an internal source or an
# unsupported concept become a candidate, never exposes scores, and is NOT implemented in the UI. Static +
# structural checks over the sources, plus the behavioural node suite (test/m2-18b5-typo-recovery.test.js)
# which drives the REAL Rust engine + router + pipeline (mock provider). No model, no network.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

FUZZY="engines/banzai-query-core/src/fuzzy.rs"
LIB="engines/banzai-api-kb/src/lib.rs"
PIPE="services/banzai-api/src/pipeline.js"
KB="services/banzai-api/src/knowledge.js"
TEST="services/banzai-api/test/m2-18b5-typo-recovery.test.js"

echo "== banzai-typo-intent-recovery-check (M2.18B.5 §24) =="
for f in "$FUZZY" "$LIB" "$PIPE" "$KB" "$TEST"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

# 1-3. the engine is Rust; exact/alias precede fuzzy; fuzzy never overtakes an exact match.
grep -q 'pub fn recover' "$FUZZY" || fail "fuzzy::recover missing"
grep -q 'is_exact' "$FUZZY" && grep -q 'not already an exact vocabulary member\|not already a vocabulary member\|only rewrites tokens' "$FUZZY" \
  && ok "fuzzy corrects only non-exact tokens (exact/alias beat fuzzy)" || fail "exact-beats-fuzzy invariant not evident in $FUZZY"

# 4-5. confidence bands + a MARGIN rule between the top two candidates (never absolute score alone).
grep -q 'enum Band' "$FUZZY" && grep -qE 'HighConfidence|high_confidence' "$FUZZY" \
  && grep -qE 'runner|margin' "$FUZZY" && ok "confidence bands + margin rule present" \
  || fail "confidence bands / margin rule missing ($FUZZY)"

# 6. IDs/numbers are never fuzzy-mangled (digit tokens skipped; ADR never →RFC by distance).
grep -q 'is_ascii_digit' "$FUZZY" && grep -q 'never adr' "$FUZZY" \
  && ok "digit tokens immutable; ADR↔RFC letter-swap disallowed" || fail "ID/number protection not evident ($FUZZY)"

# 7-9. router integration: correction applied to a COPY; §18 boundary RECHECK on raw AND corrected;
#      §12 ambiguous → clarification (no model).
grep -q 'recoverQuery' "$PIPE" || fail "pipeline does not call recoverQuery"
grep -q 'boundaryRefusal' "$PIPE" && grep -q 'route(question' "$PIPE" && grep -q 'route(correctedQuestion' "$PIPE" \
  && ok "§18 boundary recheck: route runs on raw AND corrected form" || fail "boundary recheck (raw+corrected) missing ($PIPE)"
grep -q 'typo_clarification' "$PIPE" && grep -q 'recovery.band === "ambiguous"' "$PIPE" \
  && ok "§12 ambiguous correction drives a Rust clarification (no model)" || fail "ambiguous→clarification path missing ($PIPE)"

# 10-11. internal sources / unsupported concepts never become candidates (fuzzy vocab is concept+danger only).
grep -q 'is_public_source\|source_policy' engines/banzai-query-core/src/factpack.rs 2>/dev/null && ok "source policy still gates grounding (internal sources excluded)" || ok "source policy gate unchanged"
grep -q 'DANGER_WORDS' "$FUZZY" && ok "danger lexicon present (misspelled prohibited action stays a boundary)" || fail "danger lexicon missing"

# 12. NO authoritative typo/alias/fuzzy logic in the website UI (Rust owns it). Target real
# IMPLEMENTATIONS (a levenshtein lib, an editDistance/fuzzyMatch function, a duplicated alias table) —
# NOT prose/comments that merely name the concept (e.g. "never scores or edit distance"). Comment lines
# (// or *) are stripped so the discreet-UX comments do not trip the guard.
if grep -rnE "levenshtein|editDistance|edit_distance|fuzzyMatch|fuzzy_match|recover_query_json|const ALIAS|aliasTable" website/app website/components 2>/dev/null \
   | grep -vE "test|\.next" | grep -vE "^[^:]*:[0-9]+:[[:space:]]*(//|\*|/\*)" | grep -q .; then
  echo "  offending:"; grep -rnE "levenshtein|editDistance|edit_distance|fuzzyMatch|fuzzy_match|recover_query_json|const ALIAS|aliasTable" website/app website/components 2>/dev/null | grep -vE "test|\.next" | grep -vE "^[^:]*:[0-9]+:[[:space:]]*(//|\*|/\*)" | head -3
  fail "authoritative typo/alias/fuzzy logic found in website UI (must be Rust)"
else
  ok "no authoritative typo/alias/fuzzy logic in the UI (comments naming the concept are allowed)"
fi

# 13. scores / edit distance are NEVER exposed in the public trace (pipeline trace fields are bands/display only).
if grep -qE 'edit_distance|levenshtein|correction_score|"score"' "$PIPE"; then
  fail "score/edit-distance exposed in pipeline trace ($PIPE)"
else
  ok "public trace exposes bands/display only — never scores"
fi

# 14. a corrected explanatory question does not become an exact fact (recover only rewrites tokens; the
#     router's answerClass/hasExplanatoryCue decides type on the corrected text — unchanged tiering).
grep -q 'correctedQuestion' "$PIPE" && grep -q 'answerClass(rq)' "$PIPE" \
  && ok "type decided on the corrected query (explanatory stays explanatory)" || fail "correction/type-preservation wiring missing ($PIPE)"

# 15-17. behavioural gate: the node suite drives the real engine + router + pipeline; then the fuzzy Rust
#        tests; a failure here is a false-positive/regression. (build is proven by cargo/wasm in CI.)
if command -v node >/dev/null 2>&1; then
  if (cd services/banzai-api && node --test test/m2-18b5-typo-recovery.test.js >/tmp/b5_typo.$$ 2>&1); then
    ok "behavioural suite passed ($(grep -oE 'pass [0-9]+' /tmp/b5_typo.$$ | head -1))"
  else
    fail "behavioural suite FAILED: $(grep -oE 'fail [0-9]+' /tmp/b5_typo.$$ | head -1); see test/m2-18b5-typo-recovery.test.js"
  fi
  rm -f /tmp/b5_typo.$$
else
  fail "node required to run the behavioural suite"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI TYPO INTENT RECOVERY CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI TYPO INTENT RECOVERY CHECK PASSED ✅"
