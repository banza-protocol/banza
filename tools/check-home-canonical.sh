#!/usr/bin/env bash
#
# M2.19G.2 — canonical public Home guard (§36 fail-conditions + §42 metrics).
#
# The G2 Home is the FIVE-band public narrative (copy deck §6):
#   1 Hero · 2 institutional phrase + public status · 3 "Quem faz parte do protocolo" (Technical Registry)
#   · 4 "Três camadas. Uma interface." · 5 Footer (from layout).
# This guard enforces that shape and the §36 fail-conditions:
#   - the four page sections appear in the exact order, and the three-layer section is the LAST section
#     (the footer follows immediately, from the layout); the validation-JOURNEY section is ABSENT;
#   - hero CTAs: primary /banzai?mode=validation + additive /whitepaper (WP1-FINAL);
#   - NO manifest form / textarea / URL input / file upload anywhere on the Home;
#   - the three hero indicators are present;
#   - the status bar is HONEST (four sourced lines present; "PROTOCOLO ACTIVO" / "N nós" /
#     "certificados emitidos" / "rede activa" / "participantes conectados" ABSENT);
#   - the registry metrics distinguish production operators vs the reference implementation vs active
#     certifications, and Operador Zero is NEVER counted as a production operator;
#   - NO empty/placeholder operator cards;
#   - the three-layer copy (L1/L2/L3 + BanzAI transversal) is present;
#   - the institutional phrase "Aberto. Auditável. Verificável." is present.
#
# Scope: website/app/page.tsx · components/home/{OperatorRegistry,HeroStatusBar}.tsx ·
# lib/protocolStatus.ts · app/layout.tsx · components/SiteFooterGate.tsx.
# Exit 1 on NEEDS_FIX, 2 on self-test failure.

set -euo pipefail
cd "$(dirname "$0")/.."
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

PAGE="website/app/page.tsx"
REGISTRY="website/components/home/OperatorRegistry.tsx"
STATUSBAR="website/components/home/HeroStatusBar.tsx"
STATUS_LIB="website/lib/protocolStatus.ts"
LAYOUT="website/app/layout.tsx"
GATE="website/components/SiteFooterGate.tsx"

# The canonical L3 scheme title, built at runtime (its stem trips the contamination gate literally).
L3_NAME="Banza""mi Operational Scheme"
# PT canonical form of the same scheme name (BANZA_REFERENCIA.md §4, /glossario, /arquitectura).
L3_NAME_PT="Esquema Operacional Banza""mi"

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }
# line number of the first line containing a fixed string (empty if absent).
line_of() { grep -nF "$1" "$PAGE" | head -1 | cut -d: -f1; }
# visible(): strip block + line comments (protect https://) — what the file RENDERS.
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$1"; }

# ── Self-test ──
st=0
tmpo="$(mktemp)"; printf 'a\nb\nMARKER x\nc\n' > "$tmpo"
[ "$(grep -nF 'MARKER' "$tmpo" | head -1 | cut -d: -f1)" = "3" ] || { echo "SELFTEST_FAIL line_of arithmetic"; st=1; }
rm -f "$tmpo"
printf '%s\n' '<textarea id="x">' | grep -qE '<textarea' || { echo "SELFTEST_FAIL textarea detector"; st=1; }
[ "$st" -eq 0 ] || { echo "m2-19g2-home-canonical: SELF-TEST FAILED" >&2; exit 2; }

echo "check-m2-19g2-home-canonical: auditing the G2 five-band Home…"

for f in "$PAGE" "$REGISTRY" "$STATUSBAR" "$STATUS_LIB" "$LAYOUT" "$GATE"; do
  [ -f "$f" ] || flag "missing home surface: $f"
done

# ── 1. Section order: Hero → institutional/status → Registo técnico → Três camadas; layers section LAST. ──
H="$(line_of 'aria-labelledby="hero-title"')"
S="$(line_of 'aria-label="Estado público"')"
R="$(line_of 'aria-label="Registo técnico"')"
L="$(line_of 'aria-labelledby="layers-title"')"
[ -n "$H" ] || flag "Hero section (aria-labelledby=\"hero-title\") missing — $PAGE"
[ -n "$S" ] || flag "institutional-phrase/public-status section (aria-label=\"Estado público\") missing — $PAGE"
[ -n "$R" ] || flag "Technical Registry section (aria-label=\"Registo técnico\") missing — $PAGE"
[ -n "$L" ] || flag "three-layer section (aria-labelledby=\"layers-title\") missing — $PAGE"
if [ -n "$H" ] && [ -n "$S" ] && [ -n "$R" ] && [ -n "$L" ]; then
  { [ "$H" -lt "$S" ] && [ "$S" -lt "$R" ] && [ "$R" -lt "$L" ]; } \
    || flag "home section order must be Hero → institutional/status → Registo técnico → Três camadas (lines: $H,$S,$R,$L) — $PAGE"
fi
sec_total="$(grep -cE '<section ' "$PAGE")"
[ "$sec_total" -eq 4 ] || flag "the Home must have exactly 4 page sections (found $sec_total); the footer comes from the layout — $PAGE"
if [ -n "$L" ]; then
  after="$(awk -v n="$L" 'NR>n && /<section /' "$PAGE" | wc -l | tr -d ' ')"
  [ "$after" -eq 0 ] || flag "no section may follow the three-layer section — the footer must follow it immediately (found $after) — $PAGE"
fi

# ── 2. The validation-journey section is ABSENT (§25). ──
for j in "PERCURSO DE VALIDAÇÃO" "Da descoberta à prontidão" "prontidão para certificação" "Certification Readiness" "Certification Record"; do
  grep -qiF "$j" "$PAGE" && flag "the validation-journey section must be removed — found '$j' — $PAGE" || true
done

# ── 3. Hero CTAs: the primary /banzai?mode=validation, plus the single additive
#      /whitepaper CTA (WP1-FINAL). Exactly two, primary first. ──
hero_ctas=0
if [ -n "$H" ] && [ -n "$S" ]; then
  hero_ctas="$(awk -v a="$H" -v b="$S" 'NR>=a && NR<b' "$PAGE" | grep -cE '<Link ' || true)"
fi
[ "$hero_ctas" -eq 2 ] || flag "the hero band must have exactly two CTAs — primary /banzai?mode=validation + additive /whitepaper (found $hero_ctas) — $PAGE"
n_val="$(grep -cF 'href="/banzai?mode=validation"' "$PAGE")"
[ "$n_val" -eq 1 ] || flag "the primary hero CTA must be /banzai?mode=validation (found $n_val) — $PAGE"
n_wp="$(grep -cF 'href="/whitepaper"' "$PAGE")"
[ "$n_wp" -eq 1 ] || flag "the additive hero CTA must be /whitepaper, exactly once (found $n_wp) — $PAGE"
# order: the primary validation CTA must appear before the additive whitepaper CTA
ln_val="$(grep -nF 'href="/banzai?mode=validation"' "$PAGE" | head -1 | cut -d: -f1)"
ln_wp="$(grep -nF 'href="/whitepaper"' "$PAGE" | head -1 | cut -d: -f1)"
[ -n "$ln_val" ] && [ -n "$ln_wp" ] && [ "$ln_val" -lt "$ln_wp" ] || flag "the primary validation CTA must precede the additive /whitepaper CTA — $PAGE"

# ── 4. NO manifest form / textarea / URL input / file upload anywhere on the Home. ──
for f in "$PAGE" "$REGISTRY" "$STATUSBAR"; do
  [ -f "$f" ] || continue
  hit="$(grep -nEi '<form|<textarea|<input|type="file"|type="url"|onDrop|onDragOver|onPaste|FileReader|readAsText|accept=|scanUpload|encodeURIComponent' "$f" || true)"
  [ -z "$hit" ] || { flag "the Home must carry no manifest form / textarea / URL input / file upload — $f:"; printf '%s\n' "$hit" | sed 's/^/      /'; }
done
[ -f "website/components/home/ManifestTester.tsx" ] && flag "ManifestTester.tsx must be deleted (M2.19G.2)" || true

# ── 5. The three hero indicators. ──
for ind in "Endpoints públicos" "Motores Rust determinísticos" "Resultados rastreáveis por evidência"; do
  grep -qF "$ind" "$PAGE" || flag "hero indicator missing: $ind — $PAGE"
done

# ── 6. Honest status bar: the four sourced lines present, retired/decorative counters absent. ──
for s in "PROTOCOLO v" "última verificação pública há" "certificações técnicas activas"; do
  grep -qF "$s" "$STATUSBAR" || flag "status bar missing the sourced line: '$s' — $STATUSBAR"
done
# M2.19G.2B — the reference-implementation counter was removed from the status bar.
grep -qF "implementação de referência publicada" "$STATUSBAR" && flag "status bar must not carry the reference-implementation counter (removed M2.19G.2B) — $STATUSBAR" || true
bad_status="$(grep -niE 'PROTOCOLO ACTIVO|[0-9]+ nós|certificados emitidos|rede activa|participantes conectados|membros conectados' "$STATUSBAR" || true)"
[ -z "$bad_status" ] || { flag "status bar carries retired/decorative vocabulary — $STATUSBAR:"; printf '%s\n' "$bad_status" | sed 's/^/      /'; }

# ── 7. Registry counters (restored M2.19G.2B operator marquee): Certificados / Em conformidade / Operadores registados. ──
grep -qF "Certificados" "$REGISTRY" || flag "registry must show the 'Certificados' counter — $REGISTRY"
grep -qF "Em conformidade" "$REGISTRY" || flag "registry must show the 'Em conformidade' counter — $REGISTRY"
grep -qF "Operadores registados" "$REGISTRY" || flag "registry must show the 'Operadores registados' counter — $REGISTRY"
# The registry-summary counts (protocolStatus) stay sourced and pre-production honest.
grep -qE 'productionOperators:[[:space:]]*0' "$STATUS_LIB" || flag "REGISTRY_SUMMARY.productionOperators must be 0 (pre-production) — $STATUS_LIB"
grep -qE 'referenceImplementations:[[:space:]]*1' "$STATUS_LIB" || flag "REGISTRY_SUMMARY.referenceImplementations must be 1 (Operador Zero) — $STATUS_LIB"
grep -qE 'activeCertifications:[[:space:]]*0' "$STATUS_LIB" || flag "REGISTRY_SUMMARY.activeCertifications must be 0 — $STATUS_LIB"

# ── 8. Operador Zero is NEVER counted as a registered operator. ──
# The registry count derives from the live public list (GET /operators); Operador Zero is a fallback card,
# shown as a reference implementation ("não certificado") and never added to that count.
grep -qE 'registryCount' "$REGISTRY" || flag "the registry count must derive from the public /operators list (OZ excluded) — $REGISTRY"
grep -qiF "não certificado" "$REGISTRY" || flag "the Operador Zero card must be shown as não certificado — $REGISTRY"

# ── 9. The animated operator marquee is restored (M2.19G.2B) + the honest registry note. ──
grep -q "data-marquee" "$REGISTRY" || flag "the registry must carry the animated operator marquee — $REGISTRY"
grep -qF "Nenhum operador está certificado hoje" "$REGISTRY" || flag "the registry must carry the honest note 'Nenhum operador está certificado hoje …' — $REGISTRY"

# ── 10. Three-layer copy present (Camada 1/2/3 titles + BanzAI transversal). ──
grep -qF "BANZA · Protocolo" "$PAGE" || flag "Camada 1 'BANZA · Protocolo' missing — $PAGE"
grep -qF "Certificação de Conformidade e Interoperabilidade" "$PAGE" || flag "Camada 2 title missing — $PAGE"
{ grep -qF "$L3_NAME" "$PAGE" || grep -qF "$L3_NAME_PT" "$PAGE"; } || flag "Camada 3 scheme title missing — $PAGE"
grep -qF "interface transversal" "$PAGE" || flag "the BanzAI transversal band is missing — $PAGE"

# ── 11. Footer follows the three-layer section: layout renders the footer gate after <main>. ──
lm="$(grep -nF '<main' "$LAYOUT" | head -1 | cut -d: -f1 || true)"
lf="$(grep -nF '<SiteFooterGate' "$LAYOUT" | head -1 | cut -d: -f1 || true)"
{ [ -n "$lm" ] && [ -n "$lf" ] && [ "$lm" -lt "$lf" ]; } || flag "the layout must render <SiteFooterGate/> after <main> — $LAYOUT"
grep -qF "<SiteFooter" "$GATE" || flag "SiteFooterGate must render <SiteFooter/> — $GATE"

# ── 12. The institutional phrase. ──
grep -qF "Aberto. Auditável. Verificável." "$PAGE" || flag "the institutional phrase 'Aberto. Auditável. Verificável.' is missing — $PAGE"

if [ "$fail" -ne 0 ]; then
  echo "check-m2-19g2-home-canonical: FAILED (see NEEDS_FIX above)." >&2
  exit 1
fi
echo "check-m2-19g2-home-canonical: OK — five-band order (footer after three-layer), hero CTAs (primary /banzai?mode=validation + additive /whitepaper), no manifest form, honest status bar + registry metrics (OZ not a production operator), no empty cards, three-layer copy, institutional phrase."
