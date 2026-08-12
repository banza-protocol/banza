#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §27) — static header vs contextual right panel guard (§37, invariant 15).
#
# The compact validation HEADER carries STATIC metadata (operador · implementação · ambiente · perfil ·
# versão do protocolo · jornada). The RIGHT PANEL is CONTEXTUAL only (progresso · próxima acção ·
# bloqueios · endpoint seleccionado · evidência da etapa) and must NOT permanently re-state the header
# metadata (no duplicate HeaderField grid of operador/perfil/ambiente/versão do protocolo).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

MODE=website/components/banzai/BanzaiValidationMode.tsx

echo "== banzai-contextual-right-panel-check (M2.19G.1 / ADR-068 §27) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'function ValidationHeader({ session }' | grep -q 'ValidationHeader' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$MODE" ] || { fl "$MODE not found"; echo "banzai-contextual-right-panel-check: FAIL"; exit 1; }

# 1. Header carries the static metadata fields (HeaderField grid).
hdr=$(awk '/function ValidationHeader/{c=1} c{print} c&&/^}/{exit}' "$MODE")
printf '%s\n' "$hdr" | grep -qE 'HeaderField' && ok "header uses HeaderField (static metadata)" || fl "ValidationHeader must render HeaderField metadata"
for k in operador implementação ambiente perfil 'versão do protocolo'; do
  printf '%s\n' "$hdr" | grep -qE "HeaderField k=\"$k\"" && ok "header field: $k" || fl "header must carry static field: $k"
done
grep -qiE 'STATIC metadata only' "$MODE" && ok "header documented as static metadata" || fl "header must be documented as static metadata (§27)"

# 2. The right panel (ValidationContextPanel) is contextual only — no HeaderField, no permanent header grid.
ctx=$(awk '/function ValidationContextPanel/{c=1} c{print} c&&/^}/{exit}' "$MODE")
if printf '%s\n' "$ctx" | grep -qE 'HeaderField'; then
  fl "right panel must not use HeaderField (that is header-only static metadata)"
else
  ok "right panel does not re-use HeaderField"
fi
# It must carry the contextual sections instead.
for s in PROGRESSO 'PRÓXIMA ACÇÃO' 'ENDPOINT SELECCIONADO' BLOQUEIOS; do
  printf '%s\n' "$ctx" | grep -qE "$s" && ok "right panel contextual section: $s" || fl "right panel must carry contextual section: $s"
done
grep -qiE 'CONTEXTUAL content only|CONTEXTUAL right panel' "$MODE" && ok "right panel documented as contextual only" || fl "right panel must be documented as contextual only (§27)"

echo
if [ "$fail" -ne 0 ]; then echo "banzai-contextual-right-panel-check: FAIL"; exit 1; fi
echo "banzai-contextual-right-panel-check: ✓ static header + contextual-only right panel (ADR-068 §27)"
