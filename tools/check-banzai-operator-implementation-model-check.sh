#!/usr/bin/env bash
#
# M2.19G.1 (ADR-038 §4.2/§4.3/§13) — operator → implementation target model guard (§37, invariant 2).
#
# Fase 0 selects an OPERATOR first, then one of its published IMPLEMENTATIONS. The two records are
# modelled distinctly — OperatorRecord (the responsible entity) and ImplementationRecord (the technical
# system evaluated) — in the Rust Technical Registry AND in the UI registry that mirrors it for display.
# One operator may publish many implementations; a target is always an operator AND one implementation.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

MODEL=engines/banza-target-registry/src/model.rs
UILIB=website/lib/banzaiValidation.ts
MODE_TSX=website/components/banzai/BanzaiValidationMode.tsx
SESSION=website/components/banzai/validationJourney.tsx

echo "== banzai-operator-implementation-model-check (M2.19G.1 / ADR-038 §4.2/§4.3) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'pub struct OperatorRecord {' | grep -q 'OperatorRecord' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The Rust registry models BOTH records distinctly.
if [ -f "$MODEL" ]; then
  grep -qE 'struct OperatorRecord' "$MODEL"        && ok "OperatorRecord modelled (Rust)"        || fl "$MODEL must define OperatorRecord"
  grep -qE 'struct ImplementationRecord' "$MODEL"  && ok "ImplementationRecord modelled (Rust)"  || fl "$MODEL must define ImplementationRecord"
  # An operator lists its implementations (one-to-many).
  grep -qE 'implementation_ids' "$MODEL"           && ok "OperatorRecord lists implementation_ids" || fl "$MODEL OperatorRecord must carry implementation_ids"
  grep -qE 'operator_id' "$MODEL"                  && ok "ImplementationRecord binds operator_id"  || fl "$MODEL ImplementationRecord must carry operator_id"
else
  fl "$MODEL not found"
fi

# 2. The UI registry mirrors operator + implementation records.
if [ -f "$UILIB" ]; then
  grep -qE 'interface ValidationOperator'        "$UILIB" && ok "UI ValidationOperator model present"        || fl "$UILIB must define ValidationOperator"
  grep -qE 'interface ValidationImplementation'  "$UILIB" && ok "UI ValidationImplementation model present"  || fl "$UILIB must define ValidationImplementation"
  # M2.19G.3B — the operator→implementation MODEL is now built from the canonical Rust catalogue by a
  # pure mapper (mapCatalogueToOperators) into the ValidationOperator/ValidationImplementation types; the
  # hardcoded OPERATOR_REGISTRY const was removed. The model + operator↔implementation binding remain.
  grep -qE 'mapCatalogueToOperators'                     "$UILIB" && ok "UI builds the operator→implementation model from the canonical catalogue" || fl "$UILIB must expose mapCatalogueToOperators"
  grep -qE 'implementations: ValidationImplementation\[\]' "$UILIB" && ok "operator type carries an implementations[] list" || fl "$UILIB operator type must carry implementations: ValidationImplementation[]"
  grep -qE 'resolveImplementationIn'                     "$UILIB" && ok "resolveImplementationIn (must belong to operator)" || fl "$UILIB must expose resolveImplementationIn"
else
  fl "$UILIB not found"
fi

# 3. Fase 0 selects OPERATOR then IMPLEMENTATION (operator step precedes implementation step).
if [ -f "$MODE_TSX" ]; then
  op_line=$(grep -nE '1 · Operador' "$MODE_TSX" | head -1 | cut -d: -f1 || true)
  impl_line=$(grep -nE '2 · Implementação' "$MODE_TSX" | head -1 | cut -d: -f1 || true)
  if [ -n "$op_line" ] && [ -n "$impl_line" ] && [ "$op_line" -lt "$impl_line" ]; then
    ok "Fase 0 renders Operador (step 1) BEFORE Implementação (step 2)"
  else
    fl "Fase 0 must render the operator selector (1 · Operador) before the implementation selector (2 · Implementação)"
  fi
else
  fl "$MODE_TSX not found"
fi

# 4. The session exposes the two selection actions.
if [ -f "$SESSION" ]; then
  grep -qE 'selectOperator'       "$SESSION" && ok "session exposes selectOperator"       || fl "$SESSION must expose selectOperator"
  grep -qE 'selectImplementation' "$SESSION" && ok "session exposes selectImplementation" || fl "$SESSION must expose selectImplementation"
else
  fl "$SESSION not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-operator-implementation-model-check: FAIL"; exit 1; fi
echo "banzai-operator-implementation-model-check: ✓ operator→implementation model present (ADR-038 §4.2/§4.3)"
