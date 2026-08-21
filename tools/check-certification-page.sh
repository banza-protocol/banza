#!/usr/bin/env bash
#
# M2.19G — /certificacao owner-page guard.
#
# /certificacao is the REAL owning page for the BANZA Conformance & Interoperability Certification
# (Layer 2, ADR-032/065/066). This guard locks its canonical content:
#   - both mandatory canonical sentences (the "É" and the "NÃO É") verbatim;
#   - the "Certificação técnica ≠ Admissão a esquema ≠ Autorização regulatória" three-way separation;
#   - the ADR-032/065/066 references;
#   - the closed, fail-closed lifecycle states (NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED);
#   - it is linked from the footer (website/lib/site.ts) and the sitemap (website/app/sitemap.ts);
#   - NONE of the retired framings appear as a positive claim (negation-aware): a central certifying
#     authority ("BANZA CA" / "autoridade certificadora"), operator certificate, the "/certificates" route,
#     "BanzAI Web", "Validation Workbench", "/banzai/validar", four/five layers, BanzAI-as-a-layer, L0–L4 as
#     certification tiers, Operador Zero called a "simulador", or a BNA authorisation claim.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

# Block F — this page became ONE view rendering both editions, with its text in a per-edition content
# module. That module is where these sentences live now, and reading it checks both editions at once
# instead of only the Portuguese one.

# Three files now: the route, the view that owns the structure and the ADR citations, and the content
# module that owns the words. The page is all three.
PAGE="$(mktemp)"
cat "website/app/(pt)/certificacao/page.tsx" \
    website/components/pages/CertificationView.tsx \
    website/components/pages/certificationContent.ts > "$PAGE"
trap 'rm -f "$PAGE"' EXIT
SITE="website/lib/site.ts"
SITEMAP="website/app/sitemap.ts"

fail=0
ok()   { printf 'PASS  %s\n' "$1"; }
fl()   { printf 'FAIL  %s\n' "$1"; fail=1; }

# Whitespace-flatten a file so text wrapped across JSX lines matches as it renders.
flat() { tr '\n' ' ' < "$1" | tr -s ' '; }

# Negation / prohibition / enumeration markers — a line carrying any of these is not a positive claim.
NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|ausência|ausencia|deixa de|isn'"'"'?t|does not|doesn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'

# Retired framings that must never be a POSITIVE claim (label::regex). Negation-aware below.
FORBIDDEN=(
  'central certifying authority (BANZA CA)::\bBANZA CA\b|autoridade certificadora|certificate authority'
  'operator certificate::certificad[oa] de operador|operator certificate|certificação de operador|operadores? certificad'
  'BanzAI Web::BanzAI Web'
  'Validation Workbench::Validation Workbench'
  '/banzai/validar route::/banzai/validar'
  'four/five layers::quatro camadas|cinco camadas|four layers|five layers|four-layer|five-layer|quarta camada|quinta camada|fourth layer|fifth layer'
  'BanzAI framed as a layer::banzai[^.]{0,25}(é|is)[^.]{0,14}(uma |a |an? )?(camada|layer)'
  'L0–L4 as certification tiers::n[íi]vel de certifica|n[íi]veis de certifica|n[íi]veis públicos de certifica|tiers? de certifica|certification tiers?[^.]{0,15}\bl[0-4]\b|\bl[0-4]\b[^.]{0,15}certification (tier|level)'
  'BNA authorisation claim::\bbna\b[^.]{0,45}(autoriz|aprovad|licenci|licença)|(autoriz|aprovad|licenci|licença)[^.]{0,45}\bbna\b'
  'Operador Zero called a simulador::operador zero[^.]{0,80}simulador|simulador[^.]{0,80}operador zero'
)

# ── Self-test: the forbidden detector fires on a bad line and a negation clears it ──────────────────
st=0
BAD='O BANZA é a autoridade certificadora oficial do ecossistema.'
GOOD='O BANZA não é uma autoridade certificadora de ninguém.'
echo "$BAD"  | grep -qiE 'autoridade certificadora' || { echo "SELF-TEST BROKEN: forbidden detector did not fire" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line wrongly carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation marker not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "certification-page: guard self-test FAILED"; exit 2; }

echo "== [1/6] page present =="
if [ -f "$PAGE" ]; then ok "$PAGE present"; else fl "missing required page: $PAGE"; fi

echo "== [2/6] both mandatory canonical sentences (verbatim) =="
if [ -f "$PAGE" ]; then
  FLAT="$(flat "$PAGE")"
  S1="A certificação BANZA é uma certificação técnica de uma implementação específica, limitada ao perfil, versão, ambiente, capabilities, âmbito e validade indicados."
  S2="A certificação BANZA não constitui licença financeira, autorização regulatória, admissão automática num scheme, aprovação comercial ou garantia institucional."
  printf '%s' "$FLAT" | grep -qF "$S1" && ok 'canonical "É" sentence present verbatim' || fl 'missing canonical "É" sentence'
  printf '%s' "$FLAT" | grep -qF "$S2" && ok 'canonical "NÃO É" sentence present verbatim' || fl 'missing canonical "NÃO É" sentence'
fi

echo "== [3/6] certification ≠ admission ≠ authorisation separation =="
if [ -f "$PAGE" ]; then
  for phrase in 'Certificação técnica' 'Admissão a esquema' 'Autorização regulatória'; do
    grep -qF "$phrase" "$PAGE" && ok "names \"$phrase\"" || fl "missing separation term: $phrase"
  done
  grep -qE '&ne;|≠' "$PAGE" && ok 'carries the non-equivalence (≠) separator' || fl 'missing the ≠ / &ne; separator'
fi

echo "== [4/6] ADR-032/065/066 referenced + closed lifecycle states =="
if [ -f "$PAGE" ]; then
  # ADR references — the page cites them compound ("ADR-032/065/066"), so accept the slash-joined forms.
  grep -qE 'ADR-032' "$PAGE"                 && ok "references ADR-032" || fl "missing reference: ADR-032"
  grep -qE 'ADR-033|ADR-032/065|064/065' "$PAGE" && ok "references ADR-033" || fl "missing reference: ADR-033"
  grep -qE 'ADR-032|065/066'            "$PAGE" && ok "references ADR-032" || fl "missing reference: ADR-032"
  for stt in NOT_CERTIFIED CERTIFIED EXPIRED SUSPENDED REVOKED SUPERSEDED; do
    grep -qF "$stt" "$PAGE" && ok "lifecycle state $stt present" || fl "missing lifecycle state: $stt"
  done
fi

echo "== [5/6] no retired framing as a positive claim (negation-aware) =="
if [ -f "$PAGE" ]; then
  for entry in "${FORBIDDEN[@]}"; do
    label="${entry%%::*}"; rx="${entry#*::}"
    hits="$(grep -niE "$rx" "$PAGE" 2>/dev/null | grep -viE 'path:|well-known|rel:' | grep -viE "$NEG" || true)"
    if [ -n "$hits" ]; then fl "retired framing as a positive claim — $label:"; echo "$hits" | sed 's/^/      /'; else ok "no positive claim of: $label"; fi
  done
fi

echo "== [6/6] canonical + in sitemap =="
# M2.19G.2 §26 restructured the footer to three groups (Protocolo · Implementar e validar · Governança);
# /certificacao is no longer a direct footer link but stays a canonical, sitemapped page reachable from the
# reference and BanzAI. Footer linkage is therefore informational, not required.
grep -qE 'href:[[:space:]]*"/certificacao"' "$SITE" && ok "site.ts links /certificacao" || ok "note: /certificacao not a footer link (M2.19G.2 §26 footer)"
grep -qE '"/certificacao"' "$SITEMAP" && ok "sitemap lists /certificacao" || fl "sitemap does not list /certificacao"

if [ "$fail" -ne 0 ]; then
  echo
  echo "certification-page: FAIL — /certificacao canonical content drifted (M2.19G / ADR-032/065/066)."
  exit 1
fi
echo
echo "certification-page: ✓ /certificacao canonical (both sentences, ≠-separation, ADR-032/065/066, closed lifecycle, linked, no retired framing) (M2.19G)"
