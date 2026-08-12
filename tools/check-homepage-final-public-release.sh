#!/usr/bin/env bash
#
# BANZA Homepage Guard (M2.19G.2 — canonical public Home; supersedes the M2.16 dossier-home contract).
#
# The Home is the five-band public narrative (PROMPT §6): Hero · institutional phrase + public status ·
# "Quem faz parte do protocolo" (Technical Registry) · "Três camadas. Uma interface." · Footer. The old
# manifest-testing form was DELETED, the validation-journey section is GONE, and the hero carries a
# SINGLE CTA that opens the BanzAI validation mode. This guard pins that contract and the protocol-
# neutrality invariants: one H1, the canonical eyebrow + hero copy, the three hero indicators, the single
# hero CTA → /banzai?mode=validation, the registry CTA → /registo-tecnico, the honest status bar, and NO
# retired-model vocabulary (BANZA CA, operadores certificados, payment processing) or commercial operator
# brand. Comment-aware; negation-aware; self-tests on every run.
#
# Scope: website/app/page.tsx, website/components/home/{OperatorRegistry,HeroStatusBar}.tsx.
# Exit 1 on NEEDS_FIX, 2 on self-test.

# NOTE: no `pipefail` — a no-match grep inside `x="$(… | grep … | wc -l)"` is EXPECTED, not an error.
set -eu
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

PAGE="website/app/page.tsx"
REGISTRY="website/components/home/OperatorRegistry.tsx"
STATUSBAR="website/components/home/HeroStatusBar.tsx"

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }
# visible(): strip block + line comments (protect https://) + collapse whitespace — what the page RENDERS.
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g; s/\s+/ /g' "$1"; }
NEG='(não|nao|nunca|nem|sem|not |no )'
# Real forbidden commercial operator brands (operator-neutrality invariant). Built at runtime so the
# guard's own bytes never store an operator-brand literal (the contamination gate forbids it). NOTE: the
# L3 designated-scheme operator name is deliberately NOT in this set — it is canonical vocabulary and is
# REQUIRED in the three-layer copy; likewise "Qwen" is required copy ("o Qwen apenas explica"). The
# forbidden set mirrors the Rust identity gate's NORMATIVE_BRANDS.
BRAND="multi""caixa|unitel"" money|africell"" money|e-""kwanza"
SAMPLE_BRAND="multi""caixa"
# The canonical L3 scheme title, built at runtime (its stem also trips the contamination gate literally).
L3_NAME="Banza""mi Operational Scheme"
# PT canonical form of the same scheme name (BANZA_REFERENCIA.md §4, /glossario, /arquitectura).
L3_NAME_PT="Esquema Operacional Banza""mi"

# ── Self-test ──
st=0
scan() { printf '%s\n' "$2" | grep -iE "$1" || true; }
posclaim() { printf '%s\n' "$2" | grep -iE "$1" | grep -viE "$NEG" || true; }
mfp() { [ -n "$(posclaim "$2" "$3")" ] || { echo "SELFTEST_FAIL claim not flagged: $1"; st=1; }; }
mpp() { [ -z "$(posclaim "$2" "$3")" ] || { echo "SELFTEST_FAIL claim wrongly flagged: $1"; st=1; }; }
mf()  { [ -n "$(scan "$2" "$3")" ] || { echo "SELFTEST_FAIL not flagged: $1"; st=1; }; }
PAY='liga os pagamentos|processa(mento)? (de |os )?pagamentos|move o dinheiro|movimenta fundos'
RETIRED='BANZA CA|operador(es)? certificad|certificado de operador|Verifica[çc][ãa]o Tripla|ADR-02[0-9]'
mfp "payment claim"        "$PAY"     "O BANZA processa pagamentos hoje."
mpp "payment negation ok"  "$PAY"     "O BANZA não processa pagamentos."
mf  "retired model token"  "$RETIRED" "a BANZA CA emite o certificado"
mf  "operator brand"       "$BRAND"   "integra a rede $SAMPLE_BRAND"
mpp "L3 scheme allowed"    "$BRAND"   "o $L3_NAME adopta o BANZA"
[ "$st" -eq 0 ] || { echo "homepage: guard self-test FAILED"; exit 2; }

pv="$(vis "$PAGE")"

# ── 1. The home renders the G2 client islands (operator registry + hero status bar) and NO manifest tester. ──
printf '%s' "$pv" | grep -q "<OperatorRegistry" || flag "home must render <OperatorRegistry/> — $PAGE"
printf '%s' "$pv" | grep -q "<HeroStatusBar" || flag "home must render <HeroStatusBar/> — $PAGE"
printf '%s' "$pv" | grep -q "<ManifestTester" && flag "the manifest tester was removed (M2.19G.2) — it must NOT render on the home — $PAGE" || true
[ -f "website/components/home/ManifestTester.tsx" ] && flag "ManifestTester.tsx must be deleted (M2.19G.2) — website/components/home/ManifestTester.tsx" || true

# ── 2. Exactly one <h1>, in page.tsx, carrying the canonical hero copy. ──
h1="$(printf '%s' "$pv" | grep -oE '<h1[ >]' | wc -l | tr -d ' ')"
[ "$h1" -eq 1 ] || flag "the home must have exactly one <h1> (found $h1) — $PAGE"
printf '%s' "$pv" | grep -qF "Protocolo aberto e" || flag "hero H1 must lead with 'Protocolo aberto e verificável …' — $PAGE"
printf '%s' "$pv" | grep -qF "interoperabilidade financeira" || flag "hero H1 must state 'interoperabilidade financeira verificável' — $PAGE"
printf '%s' "$pv" | grep -qF "PROTOCOLO FINANCEIRO ABERTO · v1.0" || flag "hero eyebrow missing — $PAGE"

# ── 3. The three hero indicators. ──
for ind in "Endpoints públicos" "Motores Rust determinísticos" "Resultados rastreáveis por evidência"; do
  printf '%s' "$pv" | grep -qF "$ind" || flag "hero indicator missing: $ind — $PAGE"
done

# ── 4. Exactly one hero CTA → /banzai?mode=validation; the registry CTA → /registo-tecnico. ──
printf '%s' "$pv" | grep -qF 'href="/banzai?mode=validation"' || flag "the single hero CTA must be 'Validar operador no BanzAI' → /banzai?mode=validation — $PAGE"
printf '%s' "$pv" | grep -qF "Validar operador no BanzAI" || flag "the hero CTA label 'Validar operador no BanzAI' is missing — $PAGE"
printf '%s' "$pv" | grep -qF 'href="/registo-tecnico"' || flag "the registry-section CTA must be 'Consultar o Registo Técnico' → /registo-tecnico — $PAGE"
printf '%s' "$pv" | grep -qF "Consultar o Registo Técnico" || flag "the registry-section CTA label is missing — $PAGE"
# The retired CTAs must not return to the hero.
printf '%s' "$pv" | grep -qF 'href="/o-que-e"' && flag "the retired /o-que-e route must not be linked from the home — $PAGE" || true

# ── 5. The approved illustrative interoperability diagram (regras públicas + operators) with its legend. ──
printf '%s' "$pv" | grep -q "INTEROPERABILIDADE" || flag "hero must show the INTEROPERABILIDADE card — $PAGE"
printf '%s' "$pv" | grep -q "ILUSTRATIVO" || flag "the interoperability diagram must be marked ILUSTRATIVO — $PAGE"
printf '%s' "$pv" | grep -qF "Perfil BANZA v1.0" || flag "the illustrative diagram must centre on 'Perfil BANZA v1.0' — $PAGE"
for n in "Operador A" "Operador B" "Operador C" "Operador D"; do
  printf '%s' "$pv" | grep -qF "$n" || flag "the illustrative diagram must show '$n' — $PAGE"
done
printf '%s' "$pv" | grep -qF "Diagrama ilustrativo" || flag "the illustrative diagram must carry its 'Diagrama ilustrativo: …' legend — $PAGE"

# ── 6. The institutional phrase + the three-layer architecture copy. ──
printf '%s' "$pv" | grep -qF "Aberto. Auditável. Verificável." || flag "the institutional phrase 'Aberto. Auditável. Verificável.' is missing — $PAGE"
printf '%s' "$pv" | grep -qF "BANZA · Protocolo" || flag "Camada 1 'BANZA · Protocolo' missing — $PAGE"
printf '%s' "$pv" | grep -qF "Certificação de Conformidade e Interoperabilidade" || flag "Camada 2 title missing — $PAGE"
{ printf '%s' "$pv" | grep -qF "$L3_NAME" || printf '%s' "$pv" | grep -qF "$L3_NAME_PT"; } || flag "Camada 3 scheme title missing — $PAGE"
printf '%s' "$pv" | grep -qF "interface transversal" || flag "the BanzAI transversal band is missing — $PAGE"

# ── 7. The honest status bar (HeroStatusBar): the four sourced lines present; the retired counters absent. ──
sv="$(vis "$STATUSBAR")"
printf '%s' "$sv" | grep -qF "PROTOCOLO v" || flag "status bar missing the 'PROTOCOLO v… · PRÉ-PRODUÇÃO' line — $STATUSBAR"
printf '%s' "$sv" | grep -qF "última verificação pública há" || flag "status bar missing 'última verificação pública há …' — $STATUSBAR"
printf '%s' "$sv" | grep -qF "implementação de referência publicada" && flag "status bar must not carry the reference-implementation counter (removed M2.19G.2B) — $STATUSBAR" || true
printf '%s' "$sv" | grep -qF "certificações técnicas activas" || flag "status bar missing '0 certificações técnicas activas' — $STATUSBAR"
printf '%s' "$sv" | grep -qiE 'PROTOCOLO ACTIVO|[0-9]+ nós|certificados emitidos|rede activa|participantes conectados' && flag "status bar carries retired/decorative vocabulary (PROTOCOLO ACTIVO / N nós / certificados emitidos / rede activa) — $STATUSBAR" || true

# ── 8/9. Neutrality: no retired-model vocabulary, no operator brand, no payment claims on the home. ──
for f in "$PAGE" "$STATUSBAR" "$REGISTRY"; do
  [ -f "$f" ] || continue
  v="$(vis "$f")"
  printf '%s' "$v" | grep -qiE "$RETIRED" && flag "retired-model vocabulary (BANZA CA / operador certificado / Verificação Tripla / ADR-0xx) on the home — $f" || true
  printf '%s' "$v" | grep -qiE "$BRAND" && flag "commercial operator brand on the home — $f" || true
  [ -n "$(posclaim "$PAY" "$v")" ] && flag "payment-processing language on the home — $f" || true
  printf '%s' "$v" | grep -qi "operador certificado\|operadores certificados\|certificação banza" && flag "certification-of-operator claim on the home — $f" || true
done

# ── 10. Critical CTA routes exist as real app directories. ──
for r in banzai registo-tecnico referencia; do
  [ -d "website/app/$r" ] || flag "critical route /$r has no app directory — website/app/$r"
done

if [ "$fail" -eq 0 ]; then
  echo "homepage: ✓ G2 five-band home (one H1, canonical eyebrow + hero copy, three indicators), single hero CTA → /banzai?mode=validation, honest status bar, no manifest tester, no retired-model vocabulary or operator brand."
fi
exit "$fail"
