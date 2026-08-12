#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 core rule / §4.4/§4.5) — no manual input in the official flow (§37, invariant 4).
#
# The official operator-validation flow (BanzaiValidationMode.tsx + validationJourney.tsx) must contain
# NO manual-input affordance: no <textarea>, no file picker (type="file"), no drag-and-drop, no paste
# handler, no URL input (type="url"), no fixture loader. Those live ONLY in the developer draft tool
# (DraftValidationTool, under Programadores). Descriptive comments that NEGATE these are allowed; real
# JSX/DOM code tokens are not.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

FILES="website/components/banzai/BanzaiValidationMode.tsx website/components/banzai/validationJourney.tsx"

# Manual-input code tokens (JSX/DOM). These appear only in real input code, never in prose comments.
TOKENS='<textarea|type="file"|type=.url.|onDrop=|onDragOver=|onDragEnter=|onPaste=|accept=|FileReader|readAsText|\.files\b|scanUpload|input ref='

echo "== banzai-no-manual-input-official-flow-check (M2.19G.1 / ADR-068 §4.4/§4.5) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '<input type="file" accept=".json" />' | grep -qE "$TOKENS" || { echo "SELF-TEST BROKEN: manual-input detector did not fire" >&2; st=1; }
printf '%s\n' '// no textarea, upload, drag-drop or URL field here' | grep -qE "$TOKENS" && { echo "SELF-TEST BROKEN: detector fired on a prose comment" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

for f in $FILES; do
  if [ ! -f "$f" ]; then fl "$f not found"; continue; fi
  # Strip full-line comments (`//…`) before scanning so the ADR's negation prose is excluded.
  hits=$(grep -nE "$TOKENS" "$f" | grep -vE '^[0-9]+:[[:space:]]*//' || true)
  if [ -z "$hits" ]; then
    ok "$f — no manual-input affordance in the official flow"
  else
    fl "$f — manual input found in the official flow (must move to the draft tool):"
    printf '%s\n' "$hits" | sed 's/^/      /'
  fi
done

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-manual-input-official-flow-check: FAIL"; exit 1; fi
echo "banzai-no-manual-input-official-flow-check: ✓ official flow has no textarea/upload/drag-drop/URL/fixture input (ADR-068 §4.4)"
