#!/usr/bin/env bash
#
# BanzAI Intent-First Grounded Reasoning guard (M2.18, Phase 1).
#
# M2.18 redesigns the BanzAI answer pipeline so that it INTERPRETS first, RESOLVES the exact record,
# retrieves only PUBLIC canonical sources, and never lets a generic definition or an internal file
# stand in for a specific answer. Phase 1 ships the deterministic spine + the permanent contracts. This
# guard proves those Phase-1 invariants are present in the tree (it does not run the model):
#
#   A. EXACT-DOCUMENT RESOLVER (defect A) — route.rs bridges to docref BEFORE the glossary/critical
#      tier, so a bare NUMBERED reference ("ADR 002") resolves the specific record (explain_document)
#      instead of the generic def-* definition.
#   B. PUBLIC-SOURCE POLICY (defect B) — the Rust source_policy module is the one authority; it is
#      applied at retrieval (lib.rs) AND at presentation (answerContract.js), and it excludes the
#      assistant-instruction file CLAUDE.md. `public_safe` is NOT trusted as the filter.
#   C. ANSWER SYMBOL (defect C) — the home answer card no longer renders the ◭ hazard-triangle glyph.
#   D. CONTRACTS + DOC — the permanent source_policy contract + the canonical architecture document.
#
# Comment-aware where it scans source. Self-tests its own detectors. set -eu (no pipefail — the house
# style; explicit checks below). Exit 1 on any NEEDS_FIX, exit 2 if the guard's own self-test fails.

set -eu
cd "$(dirname "$0")/.."

fail=0
report() { printf "  ✗  %-58s %s\n" "$1" "$2" >&2; fail=1; }
ok() { printf "  ✓  %s\n" "$1"; }

ROUTE_RS="engines/banzai-query-core/src/route.rs"
LIB_RS="engines/banzai-api-kb/src/lib.rs"
POLICY_RS="engines/banzai-query-core/src/source_policy.rs"
ANSWER_JS="services/banzai-api/src/answerContract.js"
HOME_ASK="website/components/home/HomeAsk.tsx"
ROUTE_TESTS="engines/banzai-api-kb/tests/route.rs"
POLICY_TEST="services/banzai-api/test/source-policy.test.js"

# Strip // and /* */ comments so a rule matches CODE, not prose/comments (Rust + JS).
strip() { perl -0777 -pe 's{//[^\n]*}{}g; s{/\*.*?\*/}{}gs' "$1" 2>/dev/null || cat "$1"; }

need_file() { [ -f "$1" ] || report "$2" "missing $1"; }

echo "BanzAI Intent-First Grounded Reasoning (M2.18 Phase 1)"

# ── D. contracts + doc present ─────────────────────────────────────────────────────────────────────
need_file "$POLICY_RS"   "D1 source_policy contract"
need_file "$ROUTE_TESTS" "D3 route tests"
need_file "$POLICY_TEST" "D4 source-policy node test"

# ── A. exact-document resolver (defect A), scanned over CODE ────────────────────────────────────────
if [ -f "$ROUTE_RS" ]; then
  rs="$(strip "$ROUTE_RS")"
  case "$rs" in
    *"docref::detect_refs"*) ;;
    *) report "A1 resolver bridge" "route.rs must call docref::detect_refs (resolver-first)";;
  esac
  case "$rs" in
    *'"explain_document"'*) ;;
    *) report "A2 document intent" "route.rs must emit the explain_document intent";;
  esac
  # The resolver must run BEFORE the critical_entry/glossary tier: detect_refs appears earlier in route().
  d_line="$(grep -n "docref::detect_refs" "$ROUTE_RS" | tail -1 | cut -d: -f1 || true)"
  c_line="$(awk '/if let Some\(id\) = critical_entry\(&nq\)/{print NR; exit}' "$ROUTE_RS" || true)"
  if [ -n "${d_line:-}" ] && [ -n "${c_line:-}" ] && [ "$d_line" -lt "$c_line" ]; then
    ok "A resolver-first ordering (detect_refs before critical_entry)"
  else
    report "A3 resolver-first ordering" "detect_refs must precede critical_entry in route()"
  fi
else
  report "A0 route.rs" "missing $ROUTE_RS"
fi

# ── B. public-source policy (defect B) ──────────────────────────────────────────────────────────────
if [ -f "$POLICY_RS" ]; then
  prs="$(strip "$POLICY_RS")"
  case "$prs" in
    *"CLAUDE.md"*) ok "B1 policy excludes CLAUDE.md" ;;
    *) report "B1 policy CLAUDE.md" "source_policy must exclude CLAUDE.md";;
  esac
  case "$prs" in
    *"pub fn is_public_source"*) ;;
    *) report "B2 policy api" "source_policy must export is_public_source";;
  esac
fi
if [ -f "$LIB_RS" ]; then
  lrs="$(strip "$LIB_RS")"
  # M2.18B.7: source_policy is a module of the banzai-query-core crate; api-kb re-exports the crate
  # (`pub use banzai_query_core::*`) so its WASM wrappers still reach source_policy::is_public_source.
  core_lib="$(strip engines/banzai-query-core/src/lib.rs 2>/dev/null || true)"
  case "$core_lib" in *"pub mod source_policy"*) ;; *) report "B3 core wiring" "banzai-query-core/src/lib.rs must declare pub mod source_policy";; esac
  case "$lrs" in *"pub use banzai_query_core::"*) ;; *) report "B3 lib re-export" "api-kb lib.rs must re-export banzai_query_core (pub use)";; esac
  # both retrieval exports must filter through the policy
  n_filters="$(grep -c "source_policy::is_public_source" "$LIB_RS" || true)"
  if [ "${n_filters:-0}" -ge 2 ]; then
    ok "B4 retrieval filtered (doc + repo chunks)"
  else
    report "B4 retrieval filter" "lib.rs must apply source_policy at both retrieval exports"
  fi
  case "$lrs" in
    *"pub fn source_is_public"*) ok "B5 WASM policy export" ;;
    *) report "B5 WASM export" "lib.rs must export source_is_public for the presentation layer";;
  esac
fi
if [ -f "$ANSWER_JS" ]; then
  ajs="$(strip "$ANSWER_JS")"
  case "$ajs" in
    *"export function isPublicSource"*) ;;
    *) report "B6 presentation policy" "answerContract.js must export isPublicSource";;
  esac
  case "$ajs" in
    *"if (!isPublicSource(src)) continue"*) ok "B7 presentation filter wired" ;;
    *) report "B7 presentation filter" "normalizeBanzaiAnswer must drop internal sources";;
  esac
fi

# ── C. answer symbol (defect C) — the hazard-triangle glyph is gone from the home card ───────────────
if [ -f "$HOME_ASK" ]; then
  # U+25ED (◭) must not be present as the AI avatar.
  if grep -q $'◭' "$HOME_ASK" 2>/dev/null || grep -q "◭" "$HOME_ASK"; then
    report "C1 answer symbol" "HomeAsk.tsx still uses the ◭ hazard-triangle glyph"
  else
    ok "C answer symbol corrected (no ◭ hazard glyph)"
  fi
fi

# ── self-test: the detectors actually fire ──────────────────────────────────────────────────────────
selftest_dir="$(mktemp -d)"
trap 'rm -rf "$selftest_dir"' EXIT
printf '%s\n' 'let x = 1; // docref::detect_refs in a comment must be ignored' > "$selftest_dir/c.rs"
st="$(strip "$selftest_dir/c.rs")"
case "$st" in
  *"docref::detect_refs"*) echo "SELF-TEST FAIL: comment strip did not remove a // comment" >&2; exit 2;;
  *) : ;;
esac
printf '%s\n' 'const g = "◭";' > "$selftest_dir/g.tsx"
grep -q "◭" "$selftest_dir/g.tsx" || { echo "SELF-TEST FAIL: cannot detect the ◭ glyph" >&2; exit 2; }

if [ "$fail" -ne 0 ]; then
  echo "BanzAI intent-first grounded reasoning: NEEDS_FIX" >&2
  exit 1
fi
echo "BanzAI intent-first grounded reasoning (M2.18 Phase 1): OK"
