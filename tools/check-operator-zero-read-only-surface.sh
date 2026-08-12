#!/usr/bin/env bash
#
# Operador Zero read-only surface guard (M2.19E/F, §23). Consolidates the read-only invariants:
# no-local-simulation, no-local-ledger, no-local-validation, status-honesty, no-score-as-certification,
# machine-endpoints. The surface EXPOSES; it never executes. Every human-initiated validation is a deep
# link into the canonical BanzAI validation mode (/banzai?mode=validation — M2.19E/F.2, the single BanzAI
# interface; the parallel /banzai/validar route is gone). The single-interface invariants are checked by
# banzai-single-interface-check.
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

COMP="website/components/operador-zero/OperadorZeroReference.tsx"
PAGE="website/app/oz/page.tsx"
ROUTE="website/app/oz/[...artifact]/route.ts"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }
for f in "$COMP" "$PAGE" "$ROUTE"; do [ -f "$f" ] || { echo "FAIL: missing $f"; exit 2; }; done
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
cat "$COMP" "$PAGE" > "$TMP"

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero — read-only reference surface (M2.19E/F)"
echo "══════════════════════════════════════════════════════════════════════"

# 1. No local simulation entrypoints (metric: operator_zero_simulation_entrypoints = 0)
SIM=$(grep -noiE "Iniciar simulação|Executar fluxo|fluxo feliz|fluxo negativo|Resetar|Clonar no BanzAI|runOperadorZeroE2E|operadorZeroEngine|onClick=\{[^}]*(run|execute|simular)" "$TMP" || true)
if [ -z "$SIM" ]; then ok "operator_zero_simulation_entrypoints = 0"; else bad "local simulation entrypoint(s): $SIM"; fi

# 2. No mutable/local ledger (metric: operator_zero_mutable_ledger = 0)
LEDGER=$(grep -noiE "LedgerSection|setBalance|mutableLedger|openLedger|saldo mutável|débito|crédito" "$TMP" || true)
if [ -z "$LEDGER" ]; then ok "operator_zero_mutable_ledger = 0"; else bad "mutable ledger surface: $LEDGER"; fi

# 3. No local validation execution (metric: operator_zero_local_workflows = 0) — verdicts are not
#    computed on this page; it renders published state.
VAL=$(grep -noiE "runConformance|runTrust|runFederation|buildEvidenceBundle|validate[A-Z]|conformance_run|simb_run" "$TMP" || true)
if [ -z "$VAL" ]; then ok "operator_zero_local_workflows = 0"; else bad "local validation execution: $VAL"; fi

# 4. Status honesty: categorical states, NOT a score (metric: operator_zero_score_approval_confusions = 0)
# Actual score artifacts only — the copy "não apresenta pontuação agregada" is the correct NEGATION.
SCORE=$(grep -noiE "100/100|PASS demo|evidenceScore|score: *[0-9]|pontuação de [0-9]" "$TMP" || true)
if [ -z "$SCORE" ]; then ok "operator_zero_score_approval_confusions = 0 (no score-as-certification)"; else bad "score-as-certification: $SCORE"; fi
grep -q "NOT_CERTIFIED" "$COMP" && ok "certification shown honestly (NOT_CERTIFIED)" || bad "certification state must be shown honestly"

# 5. Read-only artifact explorer + validation is delegated to the canonical BanzAI validation mode
grep -q "ARTIFACT_ROUTES" "$COMP" && ok "read-only artifact explorer present" || bad "missing read-only artifact explorer"
grep -qE "/banzai\?mode=validation|workbenchDeepLink" "$TMP" && ok "validation delegated to the canonical BanzAI validation mode (deep link)" || bad "missing BanzAI validation-mode deep link (/banzai?mode=validation)"
# The retired parallel route must NOT reappear on the surface.
if grep -qE "/banzai/validar" "$TMP"; then bad "the retired /banzai/validar route is referenced — validation lives at /banzai?mode=validation"; else ok "no reference to the retired /banzai/validar route"; fi

# 6. Machine endpoints stay read-only: GET + 405 write + 404 unknown
grep -qE "export async function GET" "$ROUTE" && ok "machine endpoints: GET present" || bad "machine endpoints must serve GET"
grep -qE "status: 405|method_not_allowed" "$ROUTE" && ok "machine endpoints: writes → 405" || bad "machine endpoints must refuse writes (405)"
grep -qE "status: 404|not_found" "$ROUTE" && ok "machine endpoints: unknown → 404" || bad "machine endpoints must 404 unknown"
if grep -qE "export (async function|const) (POST|PUT|PATCH|DELETE)\b.*=>.*(insert|update|write|persist)" "$ROUTE"; then bad "machine endpoint performs a write"; else ok "no write side-effects on machine endpoints"; fi

# Self-test
printf 'Iniciar simulação onClick={run}\n' > "$TMP.st"
grep -qoiE "Iniciar simulação|onClick=\{[^}]*run" "$TMP.st" || { echo "    SELFTEST_FAIL sim"; fail=1; }
rm -f "$TMP.st"

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "operator-zero-read-only-surface-check: PASS"; else echo "operator-zero-read-only-surface-check: FAIL"; fi
exit "$fail"
