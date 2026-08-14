#!/usr/bin/env bash
#
# zero.banza.network — read-only reference-implementation design guard (ADR-041, M2.19E/F).
#
# M2.19E/F transformed the Operador Zero surface from an interactive lab into the PREMIUM READ-ONLY
# canonical reference implementation. This guard keeps that design intact: it fails the build if the
# surface stops being a single read-only page, loses its dark theme or its demo boundary, reintroduces
# any local simulation/execution, persists state to storage, reads like a real payment product, or
# stops sending validation to the canonical BanzAI validation mode (/banzai?mode=validation —
# M2.19E/F.2, the single BanzAI interface; the parallel /banzai/validar route is gone).
#
# It scans the read-only component + the route file (the page delegates to the component). Complements
# make operator-zero-read-only-surface-check + make operator-zero-public-hardening-check.
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

COMP="website/components/operador-zero/OperadorZeroReference.tsx"
PAGE="website/app/oz/page.tsx"
APPDIR="website/app/oz"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
[ -f "$COMP" ] || { echo "FAIL: missing $COMP"; exit 2; }
[ -f "$PAGE" ] || { echo "FAIL: missing $PAGE"; exit 2; }
cat "$COMP" "$PAGE" > "$TMP/all.txt"

echo "══════════════════════════════════════════════════════════════════════"
echo "zero.banza.network — read-only reference-implementation design"
echo "══════════════════════════════════════════════════════════════════════"

# ── 1. Single page: only the page + the JSON handler under /oz ──────────────
echo "design: single page…"
ROUTES=$(find "$APPDIR" -name "page.tsx" -o -name "route.ts" | sort)
EXTRA=$(echo "$ROUTES" | grep -vE "oz/page\.tsx$|oz/\[\.\.\.artifact\]/route\.ts$" || true)
if [ -z "$EXTRA" ]; then ok "single page — no extra routes"; else bad "extra route(s) under /oz: $EXTRA"; fi

# ── 2. Dark theme ───────────────────────────────────────────────────────────
echo "design: dark premium theme…"
grep -qE "#0[0-9a-b]" "$TMP/all.txt" && ok "dark (near-black) surface present" || bad "the surface must use a dark surface"

# ── 3. Reference identity + demo boundary tokens ────────────────────────────
echo "design: reference identity + demo boundary…"
grep -q "Implementação de referência" "$TMP/all.txt" && ok "reads as a reference implementation" || bad "must read as an 'Implementação de referência'"
for tok in "demo_only" "production_allowed" "operator_id" "KZ_DEMO" "real_money"; do
  grep -q "$tok" "$TMP/all.txt" && ok "boundary states: $tok" || bad "boundary missing: $tok"
done
grep -q "NOT_CERTIFIED" "$COMP" && ok "certification honestly NOT_CERTIFIED" || bad "certification state must be shown (NOT_CERTIFIED)"

# ── 4. Boundary copy, in words ──────────────────────────────────────────────
echo "design: boundary copy…"
for rx in "não movimenta (fundos|dinheiro)" "não é banco" "não é PSP" "não é carteira" "não executa"; do
  grep -qE "$rx" "$TMP/all.txt" && ok "boundary: $rx" || bad "boundary missing: $rx"
done

# ── 5. Validation is sent to the canonical BanzAI validation mode (deep link), NOT run here ──
echo "design: BanzAI validation deep link…"
grep -qE "/banzai\?mode=validation|workbenchDeepLink" "$TMP/all.txt" && ok "deep link to the canonical BanzAI validation mode (/banzai?mode=validation)" || bad "missing /banzai?mode=validation deep link"
if grep -qE "/banzai/validar" "$TMP/all.txt"; then bad "the retired /banzai/validar route is referenced"; else ok "no reference to the retired /banzai/validar route"; fi

# ── 6. Read-only artifact explorer ──────────────────────────────────────────
echo "design: read-only artifacts…"
grep -q "ARTIFACT_ROUTES" "$COMP" && ok "read-only artifact explorer present" || bad "missing artifact explorer (ARTIFACT_ROUTES)"

# ── 7. NO local simulation / execution surface ──────────────────────────────
echo "design: no local simulation…"
SIM=$(grep -noiE "Iniciar simulação|Executar fluxo|fluxo feliz|fluxo negativo|Resetar|Clonar no BanzAI|Simulador demo|Simulador de operador|100/100|PASS demo|runOperadorZeroE2E|operadorZeroEngine|LedgerSection|PaymentSim|NegativeFlow" "$TMP/all.txt" || true)
if [ -z "$SIM" ]; then ok "no local simulation controls / execution glue"; else bad "local simulation reintroduced: $SIM"; fi

# ── 8. In-memory only: no web storage ───────────────────────────────────────
echo "design: no persistent storage…"
STORE=$(grep -noE "(localStorage|sessionStorage|indexedDB)[[:space:]]*[.[]|document\.cookie" "$TMP/all.txt" || true)
if [ -z "$STORE" ]; then ok "no localStorage/sessionStorage/IndexedDB/cookies"; else bad "persistent storage used: $STORE"; fi

# ── 9. No forbidden product copy / unqualified claims ───────────────────────
echo "design: no real-product copy…"
BADCOPY=$(grep -noiE "Pagar agora|Enviar dinheiro|Abrir conta|Criar carteira|pagamento real|liquidação real|transferência real|carregar saldo|levantar dinheiro" "$TMP/all.txt" || true)
if [ -z "$BADCOPY" ]; then ok "no real-payment CTAs/verbs"; else bad "forbidden product copy: $BADCOPY"; fi
CLAIM='certificad[oa]|aprovad[oa]|licenciad[oa]|autorizad[oa]'
NEG='não|nao|nunca|\bsem\b|not |NOT_CERTIFIED|certification'
claimhit=0
while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "$line" | grep -qiE "$NEG" && continue
  echo "  FAIL: unqualified status claim: ${line:0:80}"; claimhit=1
done < <(grep -inE "$CLAIM" "$TMP/all.txt" | grep -viE 'production_allowed|monetary_value|certification' || true)
[ "$claimhit" -eq 0 ] && ok "no unqualified certification/licence/authorisation claim" || fail=1

# ── 10. No commercial operator brand ────────────────────────────────────────
echo "design: brand containment…"
BRAND="$(printf 'banz'; printf 'ami')"
if grep -qi "$BRAND" "$TMP/all.txt"; then bad "a commercial operator brand appears on the surface"; else ok "no commercial operator brand"; fi

# ── Self-test — detectors fire ──────────────────────────────────────────────
echo "design: self-test…"
st=0
printf 'Iniciar simulação\n' > "$TMP/sim.tsx"
grep -qoiE "Iniciar simulação|Executar fluxo|100/100" "$TMP/sim.tsx" || { echo "    SELFTEST_FAIL sim-detector"; st=1; }
printf 'localStorage.setItem("x","y")\n' > "$TMP/s.tsx"
grep -qoE "(localStorage|sessionStorage)[[:space:]]*[.[]" "$TMP/s.tsx" || { echo "    SELFTEST_FAIL storage"; st=1; }
printf '// no localStorage or sessionStorage here\n' > "$TMP/s2.tsx"
grep -qoE "(localStorage|sessionStorage)[[:space:]]*[.[]|document\.cookie" "$TMP/s2.tsx" && { echo "    SELFTEST_FAIL storage-comment fp"; st=1; }
printf 'operador certificado\n' > "$TMP/cl.tsx"
if ! grep -inE "$CLAIM" "$TMP/cl.tsx" | grep -viE "$NEG" | grep -q .; then echo "    SELFTEST_FAIL claim"; st=1; fi
[ "$st" -eq 0 ] && ok "self-test: sim, storage, storage-comment, claim" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "zero-subdomain-design-check: PASS (read-only reference surface)"; else echo "zero-subdomain-design-check: FAIL"; fi
exit "$fail"
