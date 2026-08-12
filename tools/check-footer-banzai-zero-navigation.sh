#!/usr/bin/env bash
#
# BANZA Footer BanzAI + Operador Zero Navigation Guard (M2.17A → M2.19G.2).
#
# The G2 footer (copy deck §26) exposes ONE BanzAI entry ("BanzAI" → /banzai) inside the "Implementar e
# validar" group — alongside Programadores, the Technical Registry (/registo-tecnico) and a discoverable
# Operador Zero SIMULATOR external link — without presenting Operador Zero as a published/approved/
# production operator and without adding it to the header. The retired two-path model ("Abrir o BanzAI" +
# "Analisar um artefacto" via ?view=guia) is gone and must not come back.
#
# Scope: website/lib/site.ts (footerColumns + navPrimary) · SiteFooter.tsx · SiteNav.tsx.
# Deterministic; self-tests. No repo-wide grep.

set -eu
cd "$(dirname "$0")/.."
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

SITE="website/lib/site.ts"
FOOTER="website/components/SiteFooter.tsx"
NAV="website/components/SiteNav.tsx"

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }
has() { grep -qF "$2" "$1"; }

# ── Self-test ──
st=0
tmp="$(mktemp)"; printf '%s\n' 'href: "/banzai", label: "BanzAI"' > "$tmp"
grep -qF 'label: "BanzAI"' "$tmp" || { echo "SELFTEST_FAIL detector"; st=1; }
grep -qF 'Operador Zero' "$tmp" && { echo "SELFTEST_FAIL false-positive"; st=1; }
rm -f "$tmp"
[ "$st" -eq 0 ] || { echo "footer-banzai-zero-navigation: SELF-TEST FAILED" >&2; exit 2; }

echo "check-footer-banzai-zero-navigation: verifying the G2 footer BanzAI + Operador Zero navigation…"

for f in "$SITE" "$FOOTER" "$NAV"; do [ -f "$f" ] || flag "missing file: $f"; done

# ── 1/2. Exactly one BanzAI footer entry — "BanzAI" → /banzai — inside "Implementar e validar". ──
has "$SITE" 'href: "/banzai", label: "BanzAI"' || flag "footer must offer a single 'BanzAI' → /banzai entry — $SITE"
has "$SITE" 'title: "Implementar e validar"'   || flag "footer must carry the 'Implementar e validar' group — $SITE"

# ── 3. The retired two-path BanzAI model must NOT return. ──
has "$SITE" 'label: "Abrir o BanzAI"'      && flag "retired footer entry 'Abrir o BanzAI' must not return — $SITE" || true
has "$SITE" 'label: "Analisar um artefacto"' && flag "retired footer entry 'Analisar um artefacto' must not return — $SITE" || true
has "$SITE" '/banzai?view=guia'            && flag "retired ?view=guia deep link must not return in the footer — $SITE" || true
grep -qE 'label: "Perguntar ao BanzAI"' "$SITE" && flag "'Perguntar ao BanzAI' must not be a footer link — $SITE" || true

# ── 4. The Technical Registry is a footer destination (/registo-tecnico). ──
has "$SITE" 'href: "/registo-tecnico", label: "Registo técnico"' || flag "footer must link the Technical Registry (/registo-tecnico) — $SITE"

# ── 5/6/7. Operador Zero SIMULATOR present, correct URL, and framed as demo STRUCTURALLY. ──
# The visible label is simply "Operador Zero"; its demo nature is carried by the chromeless zero.* subdomain
# destination + the beaker icon + the dev-resources column + absence from the registry/header (checks below).
has "$SITE" 'label: "Operador Zero"'        || flag "footer must offer the 'Operador Zero' simulator link — $SITE"
has "$SITE" 'https://zero.banza.network/'   || flag "Operador Zero must link to https://zero.banza.network/ — $SITE"
grep -qE 'label: "Operador Zero",[^}]*external: true' "$SITE" || flag "the Operador Zero footer link must be external (zero.* demo subdomain) — $SITE"

# ── 8/9. External link opens in a new tab with noopener + noreferrer. ──
has "$FOOTER" '"_blank"'                     || flag "external footer links must open in a new tab (target=_blank) — $FOOTER"
has "$FOOTER" 'noopener noreferrer'          || flag "external footer links must set rel=\"noopener noreferrer\" — $FOOTER"

# ── 10. Operador Zero must NOT be in the header (navPrimary / SiteNav). Comment-aware: the chromeless
#        onZeroSurface guard legitimately NAMES the surface in a code comment — strip comments first. ──
np="$(perl -0777 -ne 'print $1 if /navPrimary:\s*NavItem\[\]\s*=\s*\[(.*?)\];/s' "$SITE")"
printf '%s' "$np" | grep -qiF "Operador Zero" && flag "Operador Zero must not appear in navPrimary (header) — $SITE" || true
navvis="$(perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$NAV")"
printf '%s' "$navvis" | grep -qiF "Operador Zero" && flag "Operador Zero must not render in the header component — $NAV" || true

# ── 11/12. Demo-only framing: no published/approved/certified language attached to Operador Zero. ──
ozline="$(grep -iE 'Operador Zero' "$SITE" | grep -viE '^\s*//' || true)"
printf '%s' "$ozline" | grep -qiE 'certificad|aprovad|publicad|em produção|operador oficial|operador activo' \
  && flag "Operador Zero must be framed as a simulator, never as a published/approved/certified/production operator — $SITE" || true

if [ "$fail" -ne 0 ]; then
  echo "check-footer-banzai-zero-navigation: FAILED (see NEEDS_FIX above)." >&2
  exit 1
fi
echo "check-footer-banzai-zero-navigation: OK — single 'BanzAI' footer entry, Technical Registry linked, Operador Zero simulator discoverable, demo-only, not in the header."
