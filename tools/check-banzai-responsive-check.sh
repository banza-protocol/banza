#!/usr/bin/env bash
#
# M2.19G.1 — BanzAI validation UI responsive guard (§37, invariant 27).
#
# Static responsive invariants on the new validation components: the layout uses responsive units
# (max-w-[…], clamp(), responsive grid breakpoints, flex-wrap) and carries NO fixed multi-hundred-pixel
# width or w-screen that would overflow a small viewport. The shell grid uses clamp() column tracks.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

MODE=website/components/banzai/BanzaiValidationMode.tsx
JOURNEY=website/components/banzai/validationJourney.tsx
DRAFT=website/components/banzai/DraftValidationTool.tsx
SHELL_TSX=website/components/banzai/BanzaiAgent.tsx

# A fixed width of 4+ digits (e.g. w-[1024px] / width: 1200px) or w-screen risks horizontal overflow.
OVERFLOW='w-\[[0-9]{4,}px\]|min-w-\[[0-9]{4,}px\]|width:[[:space:]]*[0-9]{4,}px|w-screen'

echo "== banzai-responsive-check (M2.19G.1) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'className="w-[1400px]"' | grep -qE "$OVERFLOW" || { echo "SELF-TEST BROKEN: overflow detector did not fire" >&2; st=1; }
printf '%s\n' 'className="max-w-[820px]"' | grep -qE "$OVERFLOW" && { echo "SELF-TEST BROKEN: overflow detector over-fired on max-w" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. Each new PRESENTATIONAL component uses responsive units. (validationJourney.tsx is the session
#    state hook — it renders no markup — so it is scanned only for overflow, not for responsive units.)
for f in "$MODE" "$DRAFT"; do
  if [ ! -f "$f" ]; then fl "$f not found"; continue; fi
  if grep -qE 'max-w-\[|clamp\(|flex-wrap|sm:|lg:|grid-cols' "$f"; then
    ok "responsive units present: $f"
  else
    fl "$f uses no responsive units (max-w/clamp/flex-wrap/breakpoints)"
  fi
done

# 2. No fixed overflow width in the new components.
for f in "$MODE" "$JOURNEY" "$DRAFT"; do
  [ -f "$f" ] || continue
  bad=$(grep -nE "$OVERFLOW" "$f" || true)
  [ -z "$bad" ] && ok "no fixed-width overflow: $f" || { fl "$f has a fixed-width overflow risk:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
done

# 3. The shell grid uses clamp() column tracks (fluid three-pane → stacked layout).
if [ -f "$SHELL_TSX" ]; then
  grep -qE 'lg:grid-cols-\[clamp\(' "$SHELL_TSX" && ok "shell grid uses clamp() column tracks" || fl "$SHELL_TSX shell grid must use fluid clamp() tracks"
else
  fl "$SHELL_TSX not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-responsive-check: FAIL"; exit 1; fi
echo "banzai-responsive-check: ✓ responsive units; no fixed-width overflow in the validation UI"
