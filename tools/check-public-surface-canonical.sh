#!/usr/bin/env bash
#
# M2.19G capstone — public-surface canonicalization guard.
#
# An AGGREGATE sweep over the whole rendered public surface:
#   website/app/**/page.tsx · website/components/** · docs/reference/pt/BANZA_REFERENCIA.md ·
#   website/lib/{site,reference,decisions}.ts
# (banzai-agent.ts — which lists the forbidden phrases verbatim as agent config — and *.test.*/*.spec.*
#  are excluded, exactly like check-three-layer-architecture.sh.)
#
# It asserts three things:
#   [A] ZERO occurrences of the retired-framing list as a POSITIVE claim (negation-aware: "não é …"/
#       "nunca …"/"sem …" lines are allowed). The "/certificates" scan ignores the operator well-known
#       endpoint (path:/rel:), and "simulador" is only forbidden when it frames Operador Zero.
#   [B] the current three-layer vocabulary is present (L1/L2/L3 + "Esquema Operacional" + BanzAI
#       "transversal"/"interface humana única").
#   [C] the G2 hero positioning ("interoperabilidade financeira" verificável) is present, and the
#       ABSOLUTE over-claim "sem acordos bilaterais" is never made.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok()   { printf 'PASS  %s\n' "$1"; }
fl()   { printf 'FAIL  %s\n' "$1"; fail=1; }

# ── build the rendered public-surface file set ──────────────────────────────────────────────────────
FILES=()
while IFS= read -r f; do [ -n "$f" ] && FILES+=("$f"); done < <(
  {
    find website/app -type f -name 'page.tsx'
    find website/components -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.md' \)
    printf '%s\n' \
      docs/reference/pt/BANZA_REFERENCIA.md \
      website/lib/site.ts \
      website/lib/reference.ts \
      website/lib/decisions.ts
  } | grep -vE 'banzai-agent\.ts|\.test\.|\.spec\.' | sort -u
)
[ "${#FILES[@]}" -gt 0 ] || { echo "m2-19g-public-surface: no surface files found — repo layout changed"; exit 2; }

# Negation / prohibition / enumeration markers.
NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|\bwithout\b|\bfree of\b|ausência|ausencia|deixa de|isn'"'"'?t|does not|doesn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'
# Lines that are operator well-known endpoint data (path:/rel:) or explicit well-known refs are not a
# BANZA-website route claim; they are excluded from the /certificates positive-claim scan.
WELLKNOWN='path:|well-known|rel:'

# Retired framings that must never be a POSITIVE claim (label::regex), negation-aware.
FORBIDDEN=(
  'central certifying authority (BANZA CA)::\bBANZA CA\b|autoridade certificadora|certificate authority'
  'operator certificate::certificad[oa] de operador|operator certificate|certificação de operador|operadores? certificad'
  '/certificates route::href=["'"'"']/certificates|/certificates\b'
  'BanzAI Web::BanzAI Web'
  'Validation Workbench::Validation Workbench'
  '/banzai/validar route::/banzai/validar'
  'four/five layers::quatro camadas|cinco camadas|four layers|five layers|four-layer|five-layer|quarta camada|quinta camada|fourth layer|fifth layer'
  'BanzAI framed as a layer::banzai[^.]{0,25}(é|is)[^.]{0,14}(uma |a |an? )?(camada|layer)'
  'L0–L4 as certification tiers::n[íi]vel de certifica|n[íi]veis de certifica|n[íi]veis públicos de certifica|tiers? de certifica|certification tiers?[^.]{0,15}\bl[0-4]\b|\bl[0-4]\b[^.]{0,15}certification (tier|level)'
  'BNA authorisation claim::\bbna\b[^.]{0,45}(autoriz|aprovad|licenci|licença)|(autoriz|aprovad|licenci|licença)[^.]{0,45}\bbna\b'
  'Operador Zero framed as a simulador::operador zero[^.]{0,80}simulador|simulador[^.]{0,80}operador zero'
)

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
BAD='O BANZA opera a autoridade certificadora e emite certificado de operador.'
GOOD='O BANZA não é uma autoridade certificadora e não emite certificado de operador.'
echo "$BAD"  | grep -qiE 'autoridade certificadora' || { echo "SELF-TEST BROKEN: detector did not fire" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation not detected" >&2; st=1; }
# the well-known endpoint line must be treated as NOT a /certificates route claim
echo '{ path: "/certificates", rel: "Certificates document" }' | grep -qiE "$WELLKNOWN" || { echo "SELF-TEST BROKEN: well-known exclusion not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "m2-19g-public-surface: guard self-test FAILED"; exit 2; }

# ── [A] no retired framing as a positive claim ──────────────────────────────────────────────────────
echo "== [A] no retired framing as a positive claim across ${#FILES[@]} public-surface files =="
for entry in "${FORBIDDEN[@]}"; do
  label="${entry%%::*}"; rx="${entry#*::}"
  hits="$(grep -HniE "$rx" "${FILES[@]}" 2>/dev/null | grep -viE "$WELLKNOWN" | grep -viE "$NEG" || true)"
  if [ -n "$hits" ]; then
    fl "positive claim of a retired framing — $label:"; echo "$hits" | sed 's/^/      /'
  else
    ok "no positive claim of: $label"
  fi
done

# ── [B] current three-layer vocabulary present ──────────────────────────────────────────────────────
echo "== [B] current three-layer vocabulary present =="
present() { # label regex
  grep -qHE "$2" "${FILES[@]}" 2>/dev/null && ok "$1" || fl "missing from public surface: $1"
}
present 'Camada 1 — Protocolo'         'Camada 1[^.]{0,30}[Pp]rotocolo'
present 'Camada 2 — Certificação de Conformidade e Interoperabilidade' 'Camada 2[^.]{0,60}[Cc]ertifica'
present 'Camada 3 — Esquema operacional' 'Camada 3[^.]{0,60}[Ee]squema'
present '"Esquema Operacional"'        'Esquema Operacional'
present 'BanzAI "transversal"'         'transversal'
present 'BanzAI primary human interface' 'interface humana primária|interface humana única|interface única'

# ── [C] G2 hero positioning + no absolute over-claim (HERO surface) ─────────────────────────────────
# M2.19G.2 retired the qualified "sem reconstruir integrações …" hero. The G2 hero positioning is
# "interoperabilidade financeira verificável" ("verificável" is a separate H1 span, so the contiguous
# fragment is "interoperabilidade financeira"). The ABSOLUTE over-claim "sem acordos bilaterais" must
# still never be made. This is a property of the hero, so it is scoped to the home/hero surface
# (app/(pt)/page.tsx + components/home/**), not the whole reference corpus.
echo "== [C] G2 hero positioning present + no absolute 'sem acordos bilaterais' (hero surface) =="
HERO_FILES=()
while IFS= read -r f; do [ -n "$f" ] && HERO_FILES+=("$f"); done < <(
  { printf '%s\n' "website/app/(pt)/page.tsx"
    find website/components/home -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null
  } | grep -vE '\.test\.|\.spec\.' | sort -u
)
[ "${#HERO_FILES[@]}" -gt 0 ] || { echo "m2-19g-public-surface: no hero files found — repo layout changed"; exit 2; }
grep -qHF 'interoperabilidade financeira' "${HERO_FILES[@]}" 2>/dev/null \
  && ok 'G2 hero "interoperabilidade financeira verificável" present' || fl 'missing G2 hero "interoperabilidade financeira verificável"'
# absolute over-claim — a direct-absence check (NOT negation-aware: the phrase itself starts with "sem").
abshits="$(grep -HniE 'sem (quaisquer )?acordos? bilate?rais?|no bilateral agreements|sem contratos? bilate?rais?' "${HERO_FILES[@]}" 2>/dev/null || true)"
if [ -n "$abshits" ]; then
  fl 'absolute "sem acordos bilaterais" over-claim on the hero (use the qualified "sem reconstruir integrações …"):'
  echo "$abshits" | sed 's/^/      /'
else
  ok 'no absolute "sem acordos bilaterais" over-claim on the hero'
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "m2-19g-public-surface: FAIL — the rendered public surface drifted from the M2.19G canonical model."
  exit 1
fi
echo
echo "m2-19g-public-surface: ✓ capstone clean — no retired framing as a positive claim; three-layer vocabulary present; qualified hero, no absolute over-claim (M2.19G)"
