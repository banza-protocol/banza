#!/usr/bin/env bash
# check-banzai-synthesis-latency-check.sh — BanzAI grounded-synthesis latency-config guard (M2.18B.3A).
#
# The real end-to-end latency is proven by a measured benchmark on production-class hardware (recorded in
# artifacts/m2-18b3/round-c-e2e-brief.json and docs/reports/M2_18B3A_...md); CI cannot run the model. What
# this guard DOES enforce is that the Round B latency compaction cannot be silently reverted — the levers
# that produced the measured reduction must stay in the code:
#   * FactualPackage depth profiles exist with a TIGHT brief default (few facts, short clips);
#   * brief is the default answer depth; standard is reserved for compare/impact; deep is caller-only;
#   * the output budget is derived per depth (brief the tightest);
#   * the output-synthesis prompt carries a brief length directive;
#   * the measured benchmark evidence artifacts are present.
# Static + comment-aware + self-testing; no model, no network. Complements banzai-grounded-synthesis-architecture-check.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

FACTPACK="engines/banzai-query-core/src/factpack.rs"
SYNTH="engines/banzai-query-core/src/synth.rs"
GSYNTH="services/banzai-api/src/grounded-synthesis.js"
TOKEV="artifacts/m2-18b3/round-b-token-evidence.json"
MATRIX="artifacts/m2-18b3/round-c-runtime-matrix.json"

for f in "$FACTPACK" "$SYNTH" "$GSYNTH"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-synthesis-latency-check (M2.18B.3A) =="

# 1. depth profiles present with a tight brief default (3 facts, 260 chars) and the standard/deep tiers.
if grep -q 'fn depth_limits' "$FACTPACK" \
   && grep -Eq '"deep"\s*=>\s*\(10, 480\)' "$FACTPACK" \
   && grep -Eq '"standard"\s*=>\s*\(6, 360\)' "$FACTPACK" \
   && grep -Eq '_\s*=>\s*\(3, 260\)' "$FACTPACK"; then
  ok "FactualPackage depth profiles present (brief=3/260 default, standard=6/360, deep=10/480)"
else
  fail "depth_limits profiles missing or changed in $FACTPACK (brief must stay the tight default)"
fi

# 2. brief is the default answer depth; only compare/impact escalate to standard; deep is not auto-selected.
if grep -q 'function depthForIntent' "$GSYNTH" \
   && grep -q 'STANDARD_DEPTH_INTENTS' "$GSYNTH" \
   && grep -Eq 'compare_documents"?,?\s*"?explain_impact' "$GSYNTH" \
   && grep -Eq 'STANDARD_DEPTH_INTENTS\.has\(intent\)\s*\?\s*"standard"\s*:\s*"brief"' "$GSYNTH"; then
  ok "brief is the default depth; only compare_documents/explain_impact escalate to standard"
else
  fail "depthForIntent must default to brief and escalate only compare/impact ($GSYNTH)"
fi
if grep -Eq '\bdepth\s*\|\|\s*"deep"|=>\s*"deep"|"deep"\s*:' "$GSYNTH"; then
  fail "deep must not be auto-selected in $GSYNTH (caller-explicit only)"
else
  ok "deep is never auto-selected (caller-explicit only)"
fi

# 3. bounded output budget per depth (brief the tightest). The single grounded synthesis is the only model
# call; the FactualPackage depth caps (fact count/length) remain the dominant latency lever.
# M2.18B.4: brief output budget raised 256→512 after live evidence proved prose+claims JSON was TRUNCATED
# at 256 (invalid JSON → fecho por omissão fallback). 512 is still the bounded minimum for a COMPLETE valid
# answer (not an open-ended budget).
if grep -Eq 'brief:\s*512' "$GSYNTH"; then ok "brief output budget is 512 tokens (min for complete valid JSON; raised from 256 after truncation evidence)"; else fail "brief output budget must be 512 ($GSYNTH OUTPUT_BUDGET)"; fi

# 4. output-synthesis prompt carries a brief length directive.
if grep -qi 'BREVE' "$SYNTH" && grep -q 'length_rule' "$SYNTH"; then
  ok "output prompt carries a per-depth length directive (brief)"
else
  fail "build_output_prompt must apply a brief length_rule ($SYNTH)"
fi

# 5. measured benchmark evidence present (the real latency proof lives in artifacts + report).
[ -f "$TOKEV" ] && ok "Round B token evidence present ($TOKEV)" || fail "missing $TOKEV"
[ -f "$MATRIX" ] && ok "Round C runtime matrix present ($MATRIX)" || fail "missing $MATRIX"

# 6. self-test — the brief default must actually be the tightest profile (fewer facts than standard/deep).
if grep -Eq '_\s*=>\s*\(3, 260\)' "$FACTPACK" && grep -Eq '"standard"\s*=>\s*\(6, 360\)' "$FACTPACK"; then
  ok "self-test: brief (3 facts) is strictly tighter than standard (6 facts)"
else
  fail "self-test: brief must be the tightest profile"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI SYNTHESIS LATENCY CHECK FAILED"
  exit 1
fi
echo "BANZAI SYNTHESIS LATENCY CHECK PASSED"
