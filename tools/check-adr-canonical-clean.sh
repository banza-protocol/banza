#!/usr/bin/env bash
# check-adr-canonical-clean.sh — M2.19A regression guard for the Current-Only Canonical ADR Tree (ADR-057).
#
# Locks in the clean-slate: the removed CA-era / operator-era ADRs stay removed, the policy ADR stays
# present, and no CURRENT surface reintroduces a reference to a deleted ADR. Historical records
# (PHASE_*, *_2026_07.md, artifacts/, ceremony-records) are the honest audit trail and are
# exempt — Git history preserves the removed decisions (ADR-057 D-057-02).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DELETED=(ADR-004 ADR-022 ADR-026 ADR-027 ADR-032)
fail=0
say(){ echo "  $*"; }

# 1) deleted ADRs must NOT exist as canonical files (intentional gaps)
for id in "${DELETED[@]}"; do
  if ls decisions/adr/${id}-*.md >/dev/null 2>&1; then
    say "FAIL: removed ADR reappeared in the tree: decisions/adr/${id}-*"; fail=1
  fi
done

# 2) the policy ADR must exist
[ -f decisions/adr/ADR-057-current-only-canonical-adr-tree.md ] || { say "FAIL: ADR-057 (clean-slate policy) missing"; fail=1; }

# 3) no CURRENT surface may reference a deleted ADR (ADR-057 itself may, in its self-contained 'removed' table)
PAT="ADR-0(04|22|26|27|32)"
leaks="$(git grep -lIE "$PAT" -- . 2>/dev/null \
  | grep -vE 'artifacts/|/target/|node_modules|\.git/' \
  | grep -vE 'docs/governance/PHASE_|docs/governance/.*MATRIX|_2026_07\.md|ceremony-records|BANZA_ROOT_CUSTODY_FUTURE|M2_2_ARCHITECTURE_REFACTOR|M2_3_|M2_4_' \
  | grep -vE 'doc-index\.json|banzai-repo-index|entries-index\.json|rustkb/|website/lib/wasm/|alias-truth-table|task-fulfilment' \
  | grep -vE 'decisions/adr/ADR-057-current-only|decisions/adr/README\.md|tools/check-adr-canonical-clean\.sh' \
  || true)"
if [ -n "$leaks" ]; then
  say "FAIL: deleted-ADR reference on current surface(s):"; echo "$leaks" | sed 's/^/    /'; fail=1
fi

if [ "$fail" = 0 ]; then
  echo "adr-canonical-clean: ✓ removed ADRs stay removed; ADR-057 present; no deleted-ADR reference on current surfaces"
else
  echo "adr-canonical-clean: NEEDS_FIX"; exit 1
fi
