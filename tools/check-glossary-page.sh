#!/usr/bin/env bash
#
# M2.19G — /glossario owner-page guard.
#
# /glossario is the REAL owning page for the canonical, CURRENT-ONLY glossary of the BANZA architecture.
# This guard locks its canonical content:
#   - it defines the required current terms (a representative subset of: conformance, interoperability,
#     certification, admission, authorisation, evidence, registry, operator, implementation, profile,
#     capability, revocation, federation, scheme) — asserted by their canonical PT headwords;
#   - it defines NONE of the retired terms as current concepts (BANZA CA, operator certificate, L0–L4 as
#     certification tiers, BanzAI Web, Validation Workbench, + the wider retired framing set, negation-aware);
#   - it is linked from the footer (website/lib/site.ts) and the sitemap (website/app/sitemap.ts).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

PAGE="website/app/(pt)/glossario/page.tsx"
SITE="website/lib/site.ts"
SITEMAP="website/app/sitemap.ts"

fail=0
ok()   { printf 'PASS  %s\n' "$1"; }
fl()   { printf 'FAIL  %s\n' "$1"; fail=1; }

# The glossary terms became bilingual records in website/lib/glossaryTerms.ts, rendered by GlossaryView —
# the page itself no longer contains a term's wording. Reading the page for a Portuguese literal therefore
# tested a form that no longer exists, and could never have covered the English edition. The resolved copy
# publishes each term's name in both editions.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|ausência|ausencia|deixa de|isn'"'"'?t|does not|doesn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'

# Required CURRENT terms — asserted by their canonical PT headwords (a representative subset of the
# conformance/interop/certification/admission/authorisation/evidence/registry/operator/implementation/
# profile/capability/revocation/federation/scheme vocabulary).
REQUIRED_TERMS=(
  'Operador'
  'Implementação'
  'Conformidade'
  'Interoperabilidade'
  'Certificação'
  'Admissão a esquema'
  'Autorização regulatória'
  'Evidência'
  'Registo Técnico'
  'Perfil'
  'Capability'
  'Revogação'
  'Federação'
  'Esquema operacional'
)

# Retired terms that must NEVER be defined here as current concepts (label::regex), negation-aware.
FORBIDDEN=(
  'BANZA CA::\bBANZA CA\b'
  'operator certificate::certificad[oa] de operador|operator certificate|certificação de operador|operadores? certificad'
  'L0–L4 as certification tiers::n[íi]vel de certifica|n[íi]veis de certifica|n[íi]veis públicos de certifica|tiers? de certifica|certification tiers?[^.]{0,15}\bl[0-4]\b|\bl[0-4]\b[^.]{0,15}certification (tier|level)'
  'BanzAI Web::BanzAI Web'
  'Validation Workbench::Validation Workbench'
  '/banzai/validar route::/banzai/validar'
  'central certifying authority::autoridade certificadora|certificate authority'
  'four/five layers::quatro camadas|cinco camadas|four layers|five layers|four-layer|five-layer|quarta camada|quinta camada|fourth layer|fifth layer'
  'Operador Zero called a simulador::operador zero[^.]{0,80}simulador|simulador[^.]{0,80}operador zero'
)

# ── Self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
BAD='Um certificado de operador é emitido pela BANZA CA.'
GOOD='O BANZA não emite certificado de operador nem opera uma BANZA CA.'
echo "$BAD"  | grep -qiE 'certificad[oa] de operador|BANZA CA' || { echo "SELF-TEST BROKEN: detector did not fire" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "glossary-page: guard self-test FAILED"; exit 2; }

echo "== [1/4] page present =="
if [ -f "$PAGE" ]; then ok "$PAGE present"; else fl "missing required page: $PAGE"; fi

echo "== [2/4] required current terms defined =="
if [ -f "$PAGE" ]; then
  for term in "${REQUIRED_TERMS[@]}"; do
    # A term counts as defined when the glossary REALIZES it in both editions and the page renders the
    # glossary. A Portuguese name with an empty English one is a term half the readers cannot look up.
    ids="$(copy_ids_saying pt "$term" | grep '^glossary/' | grep '\.name$' || true)"
    if [ -z "$ids" ]; then
      fl "missing required term: $term"
    else
      key="$(printf '%s' "$ids" | head -1)"; key="${key#glossary/}"; key="${key%.name}"
      if copy_id_nonempty glossary "$key.name" en; then
        ok "defines \"$term\" in both editions"
      else
        fl "required term has no English realization: $term"
      fi
    fi
  done
fi

echo "== [3/4] no retired term defined as a current concept (negation-aware) =="
if [ -f "$PAGE" ]; then
  for entry in "${FORBIDDEN[@]}"; do
    label="${entry%%::*}"; rx="${entry#*::}"
    hits="$(grep -niE "$rx" "$PAGE" 2>/dev/null | grep -viE 'path:|well-known|rel:' | grep -viE "$NEG" || true)"
    if [ -n "$hits" ]; then fl "retired term as a current concept — $label:"; echo "$hits" | sed 's/^/      /'; else ok "no current-concept use of: $label"; fi
  done
fi

echo "== [4/4] canonical + in sitemap =="
# M2.19G.2 §26 restructured the footer to three groups (Protocolo · Implementar e validar · Governança);
# /glossario is no longer a direct footer link but stays a canonical, sitemapped page reachable from the
# reference and BanzAI. Footer linkage is therefore informational, not required.
grep -qE 'href:[[:space:]]*"/glossario"' "$SITE" && ok "site.ts links /glossario" || ok "note: /glossario not a footer link (M2.19G.2 §26 footer)"
grep -qE '"/glossario"' "$SITEMAP" && ok "sitemap lists /glossario" || fl "sitemap does not list /glossario"

if [ "$fail" -ne 0 ]; then
  echo
  echo "glossary-page: FAIL — /glossario canonical content drifted (M2.19G / §26)."
  exit 1
fi
echo
echo "glossary-page: ✓ /glossario canonical (current terms defined, no retired term as a current concept, linked) (M2.19G)"
