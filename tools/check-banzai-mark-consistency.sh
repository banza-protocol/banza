#!/usr/bin/env bash
#
# banzai-mark-consistency-check — one official BanzAI mark across the whole site.
#
# The /banzai surface renders the BanzAI mark as the two-part sparkle (components/banzai/banzaiUi.tsx
# <Ico name="sparkle">). Every other surface that needs the BanzAI icon (the global nav, the home
# surfaces) must render the SAME glyph via components/BanzaiMark.tsx — never a look-alike. This guard
# retires the old plain 4-point star and pins the canonical mark so the mismatch cannot return.
#
# Checks:
#   [1/3] the retired plain-star path ("M12 2l1.9 6.3…") appears nowhere in website source;
#   [2/3] components/BanzaiMark.tsx exists and carries the official sparkle path ("M12 3l1.7 5.1…"),
#         identical to the /banzai <Ico name="sparkle"> glyph in banzaiUi.tsx;
#   [3/3] the global nav (SiteNav.tsx) imports and uses <BanzaiMark> for its BanzAI icon.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

STAR='M12 2l1\.9 6\.3'                 # retired plain 4-point star (filled diamond-star)
OFFICIAL='M12 3l1\.7 5\.1'            # official two-part sparkle (BanzaiMark == banzaiUi Ico "sparkle")
MARK="website/components/BanzaiMark.tsx"
NAV="website/components/SiteNav.tsx"
UI="website/components/banzai/banzaiUi.tsx"

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# ── Self-test ────────────────────────────────────────────────────────────────
st=0
printf '%s' 'x M12 2l1.9 6.3L20 y' | grep -qE "$STAR" || { echo "SELF-TEST BROKEN: star detector did not fire" >&2; st=1; }
printf '%s' 'x M12 3l1.7 5.1a2 y'  | grep -qE "$OFFICIAL" || { echo "SELF-TEST BROKEN: official detector did not fire" >&2; st=1; }
printf '%s' 'x M12 3l1.7 5.1a2 y'  | grep -qE "$STAR" && { echo "SELF-TEST BROKEN: star detector false-fired on official glyph" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzai-mark-consistency: guard self-test FAILED"; exit 2; }

echo "== [1/3] retired plain-star glyph absent from website source =="
hits="$(grep -rlE "$STAR" website --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v '/node_modules/' | grep -v '/.next/' || true)"
if [ -n "$hits" ]; then
  fl "retired plain 4-point star still present — use <BanzaiMark> instead:"; echo "$hits" | sed 's/^/      /'
else
  ok "no plain 4-point star in website source (use the official BanzaiMark)"
fi

echo "== [2/3] canonical BanzaiMark carries the official sparkle =="
if [ -f "$MARK" ]; then
  grep -qE "$OFFICIAL" "$MARK" && ok "BanzaiMark.tsx carries the official sparkle path" || fl "BanzaiMark.tsx missing the official sparkle path ($OFFICIAL)"
  # The mark must match the /banzai <Ico name="sparkle"> glyph — banzaiUi.tsx must carry the same path.
  grep -qE "$OFFICIAL" "$UI" && ok "banzaiUi.tsx <Ico sparkle> uses the same official path" || fl "banzaiUi.tsx sparkle path drifted from BanzaiMark"
else
  fl "missing canonical mark component: $MARK"
fi

echo "== [3/3] global nav uses the official BanzaiMark =="
if [ -f "$NAV" ]; then
  grep -qE 'from "@/components/BanzaiMark"' "$NAV" && ok "SiteNav imports BanzaiMark" || fl "SiteNav does not import BanzaiMark"
  grep -qE '<BanzaiMark' "$NAV" && ok "SiteNav renders <BanzaiMark> for the BanzAI icon" || fl "SiteNav does not render <BanzaiMark>"
else
  fl "missing: $NAV"
fi

if [ "$fail" -ne 0 ]; then
  echo; echo "banzai-mark-consistency: FAIL — the BanzAI mark is inconsistent across the site."
  exit 1
fi
echo; echo "banzai-mark-consistency: ✓ one official BanzAI mark (BanzaiMark == /banzai Ico sparkle); plain star retired"
