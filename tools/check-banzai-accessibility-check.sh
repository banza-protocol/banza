#!/usr/bin/env bash
#
# M2.19G.1 — BanzAI validation UI accessibility guard (§37, invariant 26).
#
# Static a11y invariants on the BanzAI validation surface:
#   * exactly one <h1> on the BanzAI page;
#   * labelled controls (aria-label on free-text inputs; aria-pressed on the Fase 0 selectors);
#   * aria on the journey/step and results lists (aria-current on step + sub-view controls);
#   * the sidebar nav has an aria-label.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

PAGE="website/app/(pt)/banzai/page.tsx"
SHELL_TSX=website/components/banzai/BanzaiAgent.tsx
MODE=website/components/banzai/BanzaiValidationMode.tsx
DRAFT=website/components/banzai/DraftValidationTool.tsx

echo "== banzai-accessibility-check (M2.19G.1) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '<h1 className="sr-only">BanzAI</h1>' | grep -cE '<h1' | grep -qx 1 || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. Exactly one h1 on the BanzAI surface. M2.19G.4 (ADR-036): the single sr-only <h1> now lives in the
# shared app/(pt)/banzai/layout.tsx (it heads every navigable context — global/operator/implementation);
# page.tsx and the segment pages are thin binders and add no heading. Count across all /banzai route files
# so the total is exactly one, wherever it is declared.
LAYOUT="website/app/(pt)/banzai/layout.tsx"
h1n=$( { grep -roE '<h1' "website/app/(pt)/banzai" 2>/dev/null || true; } | wc -l | tr -d ' ')
[ "$h1n" = "1" ] && ok "exactly one <h1> across the /banzai route files (in the shared layout)" || fl "the /banzai surface must have exactly one <h1> across its route files (found $h1n)"
[ -f "$LAYOUT" ] && grep -qE '<h1' "$LAYOUT" && ok "the single <h1> lives in the shared app/(pt)/banzai/layout.tsx" || fl "$LAYOUT must carry the single BanzAI <h1> (ADR-036 shared layout)"

# 2. Sidebar nav is labelled.
[ -f "$SHELL_TSX" ] && grep -qE '<nav[^>]*aria-label=' "$SHELL_TSX" && ok "sidebar <nav> has aria-label" || fl "$SHELL_TSX sidebar nav must carry aria-label"

# 3. Fase 0 selectors + step/results controls carry aria state.
if [ -f "$MODE" ]; then
  grep -qE 'aria-pressed=' "$MODE" && ok "Fase 0 selectors use aria-pressed" || fl "$MODE selectors must use aria-pressed"
  grep -qE 'aria-current=' "$MODE" && ok "step / sub-view controls use aria-current" || fl "$MODE step/sub-view controls must use aria-current"
  grep -qE 'aria-current=\{active \? "step"' "$MODE" && ok "journey step list marks the current step (aria-current=step)" || fl "$MODE step nav must set aria-current=\"step\""
else
  fl "$MODE not found"
fi

# 4. The draft tool's free-text control is labelled.
if [ -f "$DRAFT" ]; then
  # The label is present but the element is written across several lines, and a line-oriented grep cannot
  # see an attribute that is not on the opening line. Read the whole element instead. The value is now a
  # catalogue id rather than a literal, so an accessible name in one edition only is no longer possible.
  # Scanning must stop at the element's own `/>`, not at the first `>`: an inline handler contains `=>`.
  perl -0777 -ne 'exit(/<textarea\b(?:(?!\/>).)*?\baria-label=/s ? 0 : 1)' "$DRAFT" \
    && ok "draft textarea has an aria-label" || fl "$DRAFT textarea must carry an aria-label"
  # A visually-hidden file input still needs an accessible name / hidden treatment.
  grep -qE 'type="file"' "$DRAFT" && grep -qE 'aria-hidden="true"|aria-label=' "$DRAFT" && ok "draft file input is a11y-annotated" || fl "$DRAFT file input must be a11y-annotated"
else
  fl "$DRAFT not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-accessibility-check: FAIL"; exit 1; fi
echo "banzai-accessibility-check: ✓ one h1, labelled controls, aria on the journey/results lists"
