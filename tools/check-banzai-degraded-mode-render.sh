#!/usr/bin/env bash
#
# BanzAI degraded-mode render guard (M2.19G.5C, ADR-036 CD-9 / ADR-036).
#
# When the local model is unavailable for a response, BanzAI answers on the deterministic/grounded path and
# must SAY SO honestly — a degraded (or unknown/unreported-engine) answer must state its real cause and must
# NEVER show a false "Qwen local confirmado" / "confirmado nesta resposta". This guard asserts that honesty:
#
#   BanzaiAgent.tsx — the runtime-truth engineLabel has a `degraded` branch keyed off telemetry
#   (engineInfo.degraded / engine === "degraded") that states an honest cause; the "confirmado nesta
#   resposta" label is reachable ONLY after the degraded + unknown early-returns (never on degraded/unknown).
#
#   banzaiKb.ts — the answer adapter reads the degraded / engine / externalModelCalled telemetry and, on a
#   degraded answer, renders the honest cause (never a blanket false confirmation).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

AGENT="website/components/banzai/BanzaiAgent.tsx"
KB="website/components/home/banzaiKb.ts"

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# Block E2 moved these sentences into the bilingual catalogues, so grepping the component for them
# stopped proving anything. They are read from the resolved copy instead, which also makes the English
# clause expressible — a guard grepping a Portuguese literal never could.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh
lineE() { grep -nE -- "$2" "$1" 2>/dev/null | head -1 | cut -d: -f1; }

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
echo 'return `Motor: ${name} · confirmado nesta resposta · degradado`;' | grep -qE 'confirmado.*degrad|degrad.*confirmado' || { echo "SELF-TEST BROKEN: false-confirm-on-degraded detector did not fire" >&2; st=1; }
echo 'return "Motor: Qwen local · confirmado nesta resposta";' | grep -qE 'confirmado.*degrad|degrad.*confirmado' && { echo "SELF-TEST BROKEN: detector false-fired on a clean confirmed label" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzai-degraded-mode-render: guard self-test FAILED"; exit 2; }

echo "== [1/3] BanzaiAgent.tsx engineLabel has a telemetry-keyed degraded branch =="
[ -f "$AGENT" ] || fl "missing $AGENT"
grep -qE 'const engineLabel' "$AGENT" && ok "engineLabel present" || fl "engineLabel missing in $AGENT"
# The degraded branch keys off telemetry and states an honest cause.
if grep -qE 'engineInfo\.engine === "degraded" \|\| engineInfo\.degraded' "$AGENT"; then
  ok "engineLabel branches on the degraded telemetry (engineInfo.degraded)"
else
  fl "engineLabel must branch on the degraded telemetry (engineInfo.degraded / engine === \"degraded\")"
fi
if copy_id_says agent engine.degraded pt 'degradado' && copy_id_says agent engine.degraded pt 'modelo local indisponível'; then
  ok "the degraded branch states an honest cause (degradado — modelo local indisponível)"
else
  fl "the degraded branch must state an honest cause (degradado / modelo local indisponível)"
fi

echo "== [2/3] no false 'confirmado' on degraded/unknown; confirmed label is guarded =="
# No single CODE line (comments excluded) may claim 'confirmado' next to a degraded cause.
coclaim="$(grep -nE 'confirmado.*degrad|degrad.*confirmado|confirmado.*indisponível|indisponível.*confirmado' "$AGENT" 2>/dev/null | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' || true)"
if [ -n "$coclaim" ]; then
  fl "a label asserts 'confirmado' alongside a degraded/unavailable cause:"; echo "$coclaim" | sed 's/^/      /'
else
  ok "no code label asserts 'confirmado' alongside a degraded/unavailable cause"
fi
# Ordering: the degraded and the unknown/unreported early-returns precede the 'confirmado' label, so the
# confirmed label is only reachable for a known, non-degraded engine.
# The component no longer decides this with ordered early-returns over literal labels; it computes a
# named verdict (engineVerdict) and realizes the wording from the catalogue. That is a stronger shape —
# "confirmed" is the final fallback, structurally reachable only once external, degraded and unreported
# are excluded — so the check reads the verdict chain rather than the label text it used to grep.
#
# Note on `set -e`: this used to assign from `lineE`, which returns non-zero when it finds nothing, so a
# moved literal killed the script mid-run with no message and exit 1. A guard that dies silently is worse
# than one that fails, because there is nothing to read. Every lookup below tolerates "not found" and
# reports it.
degraded_ret="$(lineE "$AGENT" 'engineInfo\.engine === "degraded" \|\| engineInfo\.degraded' || true)"
unknown_ret="$(lineE "$AGENT" '\? "unreported"' || true)"
confirmed_ret="$(lineE "$AGENT" ': "confirmed"' || true)"
if [ -n "$degraded_ret" ] && [ -n "$unknown_ret" ] && [ -n "$confirmed_ret" ] \
   && [ "$degraded_ret" -lt "$confirmed_ret" ] && [ "$unknown_ret" -lt "$confirmed_ret" ]; then
  ok "the 'confirmed' verdict (:$confirmed_ret) is reachable only after the degraded (:$degraded_ret) + unreported (:$unknown_ret) branches"
else
  fl "the 'confirmed' engine verdict must be guarded by the degraded + unreported branches"
fi
# And the wording each verdict realizes must never claim confirmation it does not have, in EITHER edition.
for ed in pt en; do
  copy_id_says agent engine.unreported "$ed" "$( [ "$ed" = pt ] && echo "por confirmar" || echo "unconfirmed" )" \
    && ok "the unreported verdict states its own uncertainty ($ed)" \
    || fl "the unreported verdict must state its own uncertainty ($ed)"
done

echo "== [3/3] banzaiKb.ts reads degraded telemetry and renders an honest cause =="
[ -f "$KB" ] || fl "missing $KB"
for tok in degraded engine externalModelCalled; do
  grep -qE "$tok" "$KB" && ok "banzaiKb telemetry field: $tok" || fl "banzaiKb.ts must read the '$tok' telemetry field"
done
if grep -qE 'if \(degraded\)' "$KB" && grep -qE 'DEGRADED_STATUS|DEGRADED_LIMIT' "$KB"; then
  ok "banzaiKb renders a degraded answer with a specific honest cause (DEGRADED_STATUS/LIMIT)"
else
  fl "banzaiKb.ts must render a degraded answer with a specific honest cause (DEGRADED_STATUS/LIMIT map)"
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "banzai-degraded-mode-render: FAIL — degraded-mode honesty drifted (ADR-036 CD-9)."
  exit 1
fi
echo
echo "banzai-degraded-mode-render: ✓ degraded/unknown answers state the honest cause and never falsely claim 'Qwen local confirmado' (ADR-036 CD-9)"
