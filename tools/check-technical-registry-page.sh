#!/usr/bin/env bash
#
# M2.19G — /registo-tecnico owner-page guard.
#
# /registo-tecnico is the REAL owning page for the BANZA Technical Registry (Camada 2, ADR-033): the single
# public, root-verifiable index of Camada 2 artifacts. This guard locks its canonical content:
#   - the canonical registry definition ("BANZA Technical Registry" / index of Camada 2 artifacts, root-verifiable);
#   - the closed certification states (NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED);
#   - the explicit boundary: it is NOT a scheme-participant directory — listed ≠ admission ≠ authorisation;
#   - the honest empty / pre-production state (registo vazio · /operators devolve []);
#   - it is linked from the footer (website/lib/site.ts) and the sitemap (website/app/sitemap.ts);
#   - NONE of the retired framings appear as a positive claim (negation-aware).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

PAGE="website/app/(pt)/registo-tecnico/page.tsx"
SITE="website/lib/site.ts"
SITEMAP="website/app/sitemap.ts"

fail=0
ok()   { printf 'PASS  %s\n' "$1"; }
fl()   { printf 'FAIL  %s\n' "$1"; fail=1; }
flat() { tr '\n' ' ' < "$1" | tr -s ' '; }

NEG='não|nao|nunca|never|\bnot\b|\bnem\b|neither|nor|\bsem\b|ausência|ausencia|deixa de|isn'"'"'?t|does not|doesn'"'"'?t|proibid|forbidden|evitar|avoid|exemplo|example|«|»|\?'

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

# ── Self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
BAD='O registo técnico é um directório de participantes admitidos ao esquema.'
GOOD='O registo técnico não é um directório de participantes admitidos.'
echo "$BAD"  | grep -qiE 'directório de participantes' || { echo "SELF-TEST BROKEN: detector did not fire" >&2; st=1; }
echo "$BAD"  | grep -qiE "$NEG" && { echo "SELF-TEST BROKEN: bad line carries a negation marker" >&2; st=1; }
echo "$GOOD" | grep -qiE "$NEG" || { echo "SELF-TEST BROKEN: negation not detected" >&2; st=1; }
# L2/L3-as-layer-name detector. Fires ONLY when a layer noun is directly abbreviated "(L2)"/"(L3)"
# (the layer descriptor sits immediately before the token) — e.g. "camada de certificação (L2)",
# "camada operacional (L3)", "esquema operacional (L3)", "Camada 2 (L2)". It must NOT fire on a genuine
# conformance PROFILE mention like "perfil (L2)"/"perfil de conformidade (L4)", which canon requires to
# stay usable. Anchoring on the layer noun (not a bare "camada"+proximity window) also removes the earlier
# byte-vs-char locale fragility. Only (L2)/(L3) — the certification/scheme layers — are in scope.
# ASCII stems only (no multibyte bracket classes — [çã] is unreliable in BSD grep); tight windows keep the
# token adjacent to the layer noun so profile mentions ("perfil (L2)") never match.
LAYER_ABBR='certifica[^.]{0,10}\(l[23]\)|operacional[[:space:]]*\(l[23]\)|esquemas?[^.]{0,12}\(l[23]\)|camada [0-9][[:space:]]*\(l[23]\)|\(l[23]\)[[:space:]]*(camada|esquema)'
echo 'a superfície da camada de certificação (L2)'                 | grep -qiE "$LAYER_ABBR" || { echo "SELF-TEST BROKEN: L2/L3 layer-abbreviation detector did not fire (certificação)" >&2; st=1; }
echo 'a camada operacional (L3) do esquema'                        | grep -qiE "$LAYER_ABBR" || { echo "SELF-TEST BROKEN: L2/L3 detector did not fire (operacional L3)" >&2; st=1; }
echo 'a superfície da camada de certificação (Camada 2)'          | grep -qiE "$LAYER_ABBR" && { echo "SELF-TEST BROKEN: L2/L3 detector false-fired on (Camada 2)" >&2; st=1; }
echo 'a Camada 2 verifica o perfil de conformidade (L2) da impl.' | grep -qiE "$LAYER_ABBR" && { echo "SELF-TEST BROKEN: L2/L3 detector false-fired on a profile mention (perfil (L2))" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "technical-registry-page: guard self-test FAILED"; exit 2; }

echo "== [1/7] page present =="
if [ -f "$PAGE" ]; then ok "$PAGE present"; else fl "missing required page: $PAGE"; fi

echo "== [2/7] canonical registry definition =="
if [ -f "$PAGE" ]; then
  grep -qF "Registo Técnico BANZA" "$PAGE" && ok 'names "Registo Técnico BANZA"' || fl 'missing "Registo Técnico BANZA"'
  grep -qiE 'verificáv(el|eis) por raiz' "$PAGE" && ok 'root-verifiable ("verificável por raiz")' || fl 'missing root-verifiable framing'
  grep -qiE 'camada de certificação \(camada 2\)|artefactos da camada 2' "$PAGE" && ok 'scoped to the Camada 2 certification layer' || fl 'missing Camada 2 certification-layer scoping'
fi

echo "== [3/7] closed certification states =="
if [ -f "$PAGE" ]; then
  for stt in NOT_CERTIFIED CERTIFIED EXPIRED SUSPENDED REVOKED SUPERSEDED; do
    grep -qF "$stt" "$PAGE" && ok "state $stt present" || fl "missing state: $stt"
  done
fi

echo "== [4/7] registry ≠ scheme directory + honest empty state =="
if [ -f "$PAGE" ]; then
  FLAT="$(flat "$PAGE")"
  grep -qiE 'directório de participantes' "$PAGE" && ok 'distinguishes the scheme participant directory' || fl 'missing "directório de participantes" distinction'
  # "listed ≠ admission ≠ authorisation" — the explicit boundary sentence.
  printf '%s' "$FLAT" | grep -qiE 'constar no registo não é|estar listado aqui[^.]*nunca|independente do[^.]*directório de participantes' \
    && ok 'states listed ≠ admission ≠ authorisation' || fl 'missing "listed is not admission/authorisation" boundary'
  grep -qiE 'admissão' "$PAGE" && grep -qiE 'autoriza' "$PAGE" && ok 'names both admission and authorisation' || fl 'must name admission AND authorisation'
  grep -qiE '\[\]|devolve \[\]|registo (está )?vazio|lista vazia|pré-produção|pre-produção' "$PAGE" \
    && ok 'honest empty / pre-production state' || fl 'missing honest empty / pre-production state'
fi

echo "== [5/7] no retired framing as a positive claim (negation-aware) =="
if [ -f "$PAGE" ]; then
  for entry in "${FORBIDDEN[@]}"; do
    label="${entry%%::*}"; rx="${entry#*::}"
    hits="$(grep -niE "$rx" "$PAGE" 2>/dev/null | grep -viE 'path:|well-known|rel:' | grep -viE "$NEG" || true)"
    if [ -n "$hits" ]; then fl "retired framing as a positive claim — $label:"; echo "$hits" | sed 's/^/      /'; else ok "no positive claim of: $label"; fi
  done
fi

echo "== [6/7] linked from footer + sitemap =="
grep -qE 'href:[[:space:]]*"/registo-tecnico"' "$SITE" && ok "footer links /registo-tecnico (site.ts)" || fl "footer (site.ts) does not link /registo-tecnico"
grep -qE '"/registo-tecnico"' "$SITEMAP" && ok "sitemap lists /registo-tecnico" || fl "sitemap does not list /registo-tecnico"

echo "== [7/7] layer written 'Camada N', never abbreviated (L2)/(L3) =="
# The architectural layers are Camada 1/2/3; L0–L4 are the conformance PROFILES (a different axis).
# Abbreviating the certification/scheme layer as "(L2)"/"(L3)" is the exact conflation BANZA_REFERENCIA.md §4
# forbids ("As camadas não são os perfis de conformidade"). L0–L4 must stay reserved for profiles.
if [ -f "$PAGE" ]; then
  bad="$(grep -niE "$LAYER_ABBR" "$PAGE" 2>/dev/null || true)"
  if [ -n "$bad" ]; then fl 'certification/scheme layer abbreviated as (L2)/(L3) — write "Camada N"; keep L0–L4 for profiles:'; echo "$bad" | sed 's/^/      /'; else ok 'layer written "Camada N"; L0–L4 reserved for conformance profiles'; fi
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "technical-registry-page: FAIL — /registo-tecnico canonical content drifted (M2.19G / ADR-033)."
  exit 1
fi
echo
echo "technical-registry-page: ✓ /registo-tecnico canonical (definition, states, not-a-scheme-directory, honest empty state, linked, no retired framing) (M2.19G)"
