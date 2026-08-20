#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §27) — static header vs contextual right panel guard (§37, invariant 15).
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

# These labels are realized from the bilingual catalogues, so the component names an id rather than
# holding the sentence. The clauses below assert the id AT THE RENDER SITE and the wording in the
# catalogue, which is stronger than the literal grep they replace: it covers the English edition too.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

MODE=website/components/banzai/BanzaiValidationMode.tsx

echo "== banzai-contextual-right-panel-check (M2.19G.1 / ADR-034 §27) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'function ValidationHeader({ session }' | grep -q 'ValidationHeader' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$MODE" ] || { fl "$MODE not found"; echo "banzai-contextual-right-panel-check: FAIL"; exit 1; }

# 1. Header carries the static metadata fields (HeaderField grid).
hdr=$(awk '/function ValidationHeader/{c=1} c{print} c&&/^}/{exit}' "$MODE")
printf '%s\n' "$hdr" | grep -qE 'HeaderField' && ok "header uses HeaderField (static metadata)" || fl "ValidationHeader must render HeaderField metadata"
# Two of these fields are still literal keys and three are realized from the catalogue, so the header is
# checked by what it renders: a literal key, or a HeaderField whose key comes from a catalogue id whose
# Portuguese realization is that field name.
for k in operador ambiente perfil; do
  printf '%s\n' "$hdr" | grep -qE "HeaderField k=\"$k\"" && ok "header field: $k" || fl "header must carry static field: $k"
done
for pair in 'header.implementation::implementação' 'setup.protocolVersion::versão do protocolo'; do
  cid="${pair%%::*}"; want="${pair#*::}"
  # both header ids live in the validation catalogue
  cat=validation
  printf '%s\n' "$hdr" | grep -qF "HeaderField k={t(\"$cid\")}" \
    && copy_id_says "$cat" "$cid" pt "$want" \
    && ok "header field: $want (realized from $cid)" \
    || fl "header must carry static field: $want"
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
# The section headings are catalogue ids now. Assert the id at the render site AND its wording, so a
# renamed id cannot silently drop a section and a reworded heading cannot pass.
for pair in 'ctx.progress::PROGRESSO' 'ctx.nextAction::PRÓXIMA ACÇÃO' 'ctx.selectedEndpoint::ENDPOINT SELECCIONADO' 'ctx.blocks::BLOQUEIOS'; do
  cid="${pair%%::*}"; want="${pair#*::}"
  if printf '%s\n' "$ctx" | grep -qE "\"$cid\"" && copy_id_says validation "$cid" pt "$want"; then
    ok "right panel contextual section: $want"
  elif printf '%s\n' "$ctx" | grep -qE "$want"; then
    ok "right panel contextual section: $want (literal)"
  else
    fl "right panel must carry contextual section: $want"
  fi
done
grep -qiE 'CONTEXTUAL content only|CONTEXTUAL right panel' "$MODE" && ok "right panel documented as contextual only" || fl "right panel must be documented as contextual only (§27)"

echo
if [ "$fail" -ne 0 ]; then echo "banzai-contextual-right-panel-check: FAIL"; exit 1; fi
echo "banzai-contextual-right-panel-check: ✓ static header + contextual-only right panel (ADR-034 §27)"
