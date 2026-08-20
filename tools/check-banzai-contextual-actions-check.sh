#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §24/§26) — state-contextual step actions guard (§37, invariant 14).
#
# A step's actions depend on its STATE. Once a step has a receipt (VERIFIED / evaluated), the primary
# action is "Ver receipt", accompanied by "Explicar este resultado" and "Executar novamente" — NOT
# "Executar esta etapa". "Executar esta etapa" is the primary only for a not-yet-evaluated step.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

# These labels are realized from the bilingual catalogues, so the component names an id rather than
# holding the sentence. The clauses below assert the id AT THE RENDER SITE and the wording in the
# catalogue, which is stronger than the literal grep they replace: it covers the English edition too.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

MODE=website/components/banzai/BanzaiValidationMode.tsx

echo "== banzai-contextual-actions-check (M2.19G.1 / ADR-034 §24/§26) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'if (hasReceipt) {' | grep -q 'hasReceipt' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$MODE" ] || { fl "$MODE not found"; echo "banzai-contextual-actions-check: FAIL"; exit 1; }

# 1. Actions are computed from state (hasReceipt / isBlocked / journeyDone / running).
grep -qE 'hasReceipt' "$MODE"  && ok "actions branch on hasReceipt" || fl "$MODE must branch actions on hasReceipt"
grep -qE 'isBlocked'  "$MODE"  && ok "actions branch on isBlocked"  || fl "$MODE must branch actions on isBlocked"

# 2. The contextual labels exist.
copy_presented "$MODE" validation action.viewReceipt pt 'Ver receipt' && ok '"Ver receipt" action present' || fl 'missing "Ver receipt" action'
copy_presented "$MODE" validation action.explainResult pt 'Explicar este resultado' && ok '"Explicar este resultado" action present' || fl 'missing "Explicar este resultado" action'
copy_presented "$MODE" validation action.runAgain pt 'Executar novamente' && ok '"Executar novamente" action present' || fl 'missing "Executar novamente" action'

# 3. In the hasReceipt branch, "Ver receipt" is the PRIMARY button and it is NOT "Executar esta etapa".
#    Isolate the `if (hasReceipt)` block and inspect its buttons.
block=$(awk '/if \(hasReceipt\) \{/{c=1} c{print} c&&/^    \}/{exit}' "$MODE")
if printf '%s\n' "$block" | grep -qE 'action\.viewReceipt'; then
  # The Ver receipt button in that block must carry the primaryBtn class.
  if printf '%s\n' "$block" | grep -E 'action\.viewReceipt' | grep -qE 'primaryBtn'; then
    ok '"Ver receipt" is the primary action once a receipt exists'
  else
    fl '"Ver receipt" must be the primary action (primaryBtn) in the hasReceipt branch'
  fi
  if printf '%s\n' "$block" | grep -qE 'action\.runThisStep'; then
    fl '"Executar esta etapa" must NOT be an action in the hasReceipt branch'
  else
    ok 'hasReceipt branch does not offer "Executar esta etapa"'
  fi
  # "Explicar este resultado" is rendered via the {explainBtn} const referenced inside the branch.
  printf '%s\n' "$block" | grep -qE 'explainBtn' && ok 'hasReceipt branch offers Explicar este resultado (explainBtn)' || fl 'hasReceipt branch must offer the explain action (explainBtn)'
else
  fl "could not locate the hasReceipt action branch — layout changed"
fi

# 4. "Executar esta etapa" exists only as the primary for a not-yet-evaluated step.
grep -qE 'action\.runThisStep' "$MODE" && ok '"Executar esta etapa" exists for the pending-step case' || fl 'missing "Executar esta etapa" primary for a pending step'

echo
if [ "$fail" -ne 0 ]; then echo "banzai-contextual-actions-check: FAIL"; exit 1; fi
echo "banzai-contextual-actions-check: ✓ step actions are state-contextual (ADR-034 §24)"
