#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.1) — "Validar operador" mode guard (§37, invariant 1).
#
# The human-facing BanzAI sidebar MODE for the endpoint-originated journey is "Validar operador"
# (Validate operator). The technical object evaluated remains a specific IMPLEMENTATION published by that
# operator (§4.2), but the visible feature label is "Validar operador". This guard locks that label into
# the agent config (banzai-agent.ts MODES + VALIDATION_COPY) and confirms the shell renders the modes.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

# Block E2 moved these sentences out of the module and into the bilingual catalogues, so grepping the
# module stopped proving anything about them. They are read from the resolved copy instead — which also
# lets the English edition be checked, which grepping a Portuguese literal never could.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

AGENT=website/components/banzai/banzai-agent.ts
SHELL_TSX=website/components/banzai/BanzaiAgent.tsx

echo "== banzai-operator-validation-mode-check (M2.19G.1 / ADR-034 §4.1) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '{ mode: "validation", name: "Validar operador" }' | grep -q 'Validar operador' \
  || { echo "SELF-TEST BROKEN: label detector did not fire" >&2; st=1; }
printf '%s\n' '{ mode: "validation", name: "Validar implementação" }' | grep -q 'Validar operador' \
  && { echo "SELF-TEST BROKEN: label detector over-fired" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$AGENT" ] || { fl "$AGENT not found"; }

if [ -f "$AGENT" ]; then
  # 1. The validation MODE carries the human label "Validar operador".
  if grep -nE 'mode:[[:space:]]*"validation"' "$AGENT" | grep -q .; then ok "MODES has a 'validation' mode"; else fl "MODES must define a 'validation' mode"; fi
  copy_id_is agent mode.validation pt "Validar operador" \
    && ok 'MODES validation label is "Validar operador"' \
    || fl 'MODES validation mode must be labelled "Validar operador"'
  copy_id_is agent mode.validation en "Validate operator" \
    && ok 'VALIDATION_COPY.modeLabel is "Validar operador"' \
    || fl 'the English validation mode must be labelled "Validate operator"'
  # The object evaluated is still an implementation (§4.2) — the header names "implementação".
  copy_id_is agent validation.header pt "Validação técnica de implementação" \
    && ok 'header names the technical object (implementação)' \
    || fl 'the validation header must be "Validação técnica de implementação"'
fi

# 2. The shell actually renders the modes group (so the label reaches the UI).
if [ -f "$SHELL_TSX" ]; then
  grep -qE 'MODES\.map' "$SHELL_TSX" \
    && ok "BanzaiAgent renders MODES" \
    || fl "BanzaiAgent must render MODES (MODES.map)"
else
  fl "$SHELL_TSX not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-operator-validation-mode-check: FAIL"; exit 1; fi
echo "banzai-operator-validation-mode-check: ✓ sidebar mode is 'Validar operador' (ADR-034 §4.1)"
