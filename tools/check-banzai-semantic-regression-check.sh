#!/usr/bin/env bash
#
# M2.19G.1 — M2.19G semantic non-regression guard (§37, invariant 25).
#
# The M2.19G.1 BanzAI rebuild must not silently regress the M2.19G three-layer PUBLIC surface. This spot-
# checks the canonical strings on the pages the M2.19G.1 change touches (the reference "o que é" page, the
# BanzAI page, the Operador Zero page): the three-layer vocabulary stays present, and NO retired framing is
# reintroduced as a positive claim (negation-aware). Hard gate: m2_19g_semantic_regressions = 0.
#
# Exit 1 on any regression. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

OQUEE=website/content/BANZA_REFERENCIA.md  # the canonical "o que é" intro — reference chapter 1 (/referencia/o-que-e); the standalone /o-que-e route was removed in M2.19G.2
BANZAI=website/app/banzai/page.tsx     # the BanzAI page
OZ=website/app/oz/page.tsx             # the Operador Zero page

TOUCHED="$OQUEE $BANZAI $OZ"

# Negation / prohibition / enumeration markers (a line carrying one is not a positive claim).
NEG='não|nao|nunca|never|\bnot\b|\bnem\b|\bsem\b|ausência|ausencia|ausente|absence|deixa de|does not|doesn'"'"'?t|proibid|forbidden|exemplo|example|«|»|\?'

# Retired framings that must never reappear as a POSITIVE claim on the touched pages.
FORBIDDEN='BANZA CA|autoridade certificadora|certificad[oa] de operador|certificação de operador|operadores? certificad|Validation Workbench|BanzAI Web|/banzai/validar'

m2_19g_semantic_regressions=0

echo "== banzai-semantic-regression-check (M2.19G.1) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'O BANZA opera a autoridade certificadora.' | grep -qiE "$FORBIDDEN" || { echo "SELF-TEST BROKEN: retired detector did not fire" >&2; st=1; }
printf '%s\n' 'O BANZA não é uma autoridade certificadora.' | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

for f in $TOUCHED; do [ -f "$f" ] && ok "present: $f" || fl "missing touched page: $f"; done

# 1. Three-layer canonical vocabulary present on the reference "o que é" page.
if [ -f "$OQUEE" ]; then
  present() { grep -qE "$2" "$OQUEE" && ok "o-que-e canonical: $1" || { fl "o-que-e missing canonical vocab: $1"; m2_19g_semantic_regressions=$((m2_19g_semantic_regressions+1)); }; }
  present 'três camadas'          'três camadas|3 camadas'
  present 'Camada 1 (Protocolo)'  'Camada 1[^.]{0,30}[Pp]rotocolo'
  present 'Camada 2 (Certificação de Conformidade e Interoperabilidade)' 'Camada 2[^.]{0,60}[Cc]ertifica'
  present 'Camada 3 (Esquema Operacional)' 'Camada 3[^.]{0,40}[Ee]squema'
  present 'Esquema Operacional'   'Esquema Operacional'
  present 'BanzAI transversal'    'transversal'
  present 'interface humana primária' 'interface humana (primária|única)|única interface'
fi

# 2. No retired framing as a positive claim on any touched page.
for f in $TOUCHED; do
  [ -f "$f" ] || continue
  hits=$(grep -niE "$FORBIDDEN" "$f" | grep -viE "$NEG" || true)
  if [ -z "$hits" ]; then
    ok "no retired framing as a positive claim: $f"
  else
    fl "retired framing reintroduced as a positive claim in $f:"; printf '%s\n' "$hits" | sed 's/^/      /'
    n=$(printf '%s\n' "$hits" | grep -c . )
    m2_19g_semantic_regressions=$((m2_19g_semantic_regressions+n))
  fi
done

echo "  metric: m2_19g_semantic_regressions=$m2_19g_semantic_regressions (must be 0)"
[ "$m2_19g_semantic_regressions" -eq 0 ] || fail=1

echo
if [ "$fail" -ne 0 ]; then echo "banzai-semantic-regression-check: FAIL"; exit 1; fi
echo "banzai-semantic-regression-check: ✓ M2.19G three-layer surface intact; 0 regressions"
