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

# The chrome stopped carrying literal hrefs when it became locale-aware, so the destination checks below
# read the RESOLVED chrome — the pathname a reader is actually given, in each edition — instead of grepping
# site.ts for a form it no longer writes. See tools/_chrome-resolved.sh.
# shellcheck source=tools/_chrome-resolved.sh
. tools/_chrome-resolved.sh

# ── Self-test ──
st=0
tmp="$(mktemp)"; printf '%s\n' 'href: "/banzai", label: "BanzAI"' > "$tmp"
grep -qF 'label: "BanzAI"' "$tmp" || { echo "SELFTEST_FAIL detector"; st=1; }
grep -qF 'Operador Zero' "$tmp" && { echo "SELFTEST_FAIL false-positive"; st=1; }
rm -f "$tmp"
# The resolved-chrome reader must answer, and must answer NO for a destination that is not there —
# otherwise every check built on it would pass vacuously. This runs against a SYNTHETIC chrome, never
# against the real one: a self-test that reads production data cannot tell "the reader is broken" from
# "the site is wrong", and would report a genuine regression as a broken guard.
fixture="$(mktemp)"
cat > "$fixture" <<'CHROME_FIXTURE'
{"editions":{"pt":{"nav":[{"key":"n","label":"Nav","href":"/nav"}],
  "footer":[{"title":"G","items":[{"key":"f","label":"Fixture","href":"/fixture","external":true}]}]},
 "en":{"nav":[{"key":"n","label":"Nav","href":"/en/nav"}],
  "footer":[{"title":"G","items":[{"key":"f","label":"Fixture","href":"/en/fixture","external":true}]}]}}}
CHROME_FIXTURE
CHROME_RESOLVED="$fixture" chrome_links pt footer "Fixture" "/fixture" \
  || { echo "SELFTEST_FAIL chrome reader cannot find a destination that is present"; st=1; }
CHROME_RESOLVED="$fixture" chrome_links pt footer "Fixture" "/outra" \
  && { echo "SELFTEST_FAIL chrome reader accepts a wrong href"; st=1; }
CHROME_RESOLVED="$fixture" chrome_links pt footer "Outra" "/fixture" \
  && { echo "SELFTEST_FAIL chrome reader accepts a wrong label"; st=1; }
[ "$(CHROME_RESOLVED="$fixture" chrome_nav_labels en)" = "Nav" ] \
  || { echo "SELFTEST_FAIL chrome reader does not read the English edition"; st=1; }
rm -f "$fixture"
[ "$st" -eq 0 ] || { echo "footer-banzai-zero-navigation: SELF-TEST FAILED" >&2; exit 2; }

echo "check-footer-banzai-zero-navigation: verifying the G2 footer BanzAI + Operador Zero navigation…"

for f in "$SITE" "$FOOTER" "$NAV"; do [ -f "$f" ] || flag "missing file: $f"; done

# ── 1/2. Exactly one BanzAI footer entry — "BanzAI" → /banzai — inside "Implementar e validar". ──
chrome_links pt footer "BanzAI" "/banzai" || flag "the Portuguese footer must offer a single 'BanzAI' → /banzai entry"
chrome_links en footer "BanzAI" "/en/banzai" || flag "the English footer must offer a single 'BanzAI' → /en/banzai entry"
[ "$(chrome_footer_labels pt | grep -cx 'BanzAI')" = 1 ] || flag "the footer must offer exactly one BanzAI entry"
chrome_footer_titles pt | grep -qx 'Implementar e validar' || flag "footer must carry the 'Implementar e validar' group"
chrome_footer_titles en | grep -qx 'Implement and validate' || flag "the English footer must carry the same group"

# ── 3. The retired two-path BanzAI model must NOT return. ──
has "$SITE" 'label: "Abrir o BanzAI"'      && flag "retired footer entry 'Abrir o BanzAI' must not return — $SITE" || true
has "$SITE" 'label: "Analisar um artefacto"' && flag "retired footer entry 'Analisar um artefacto' must not return — $SITE" || true
has "$SITE" '/banzai?view=guia'            && flag "retired ?view=guia deep link must not return in the footer — $SITE" || true
chrome_footer_labels pt | grep -qx 'Perguntar ao BanzAI' && flag "'Perguntar ao BanzAI' must not be a footer link" || true

# ── 4. The Technical Registry is a footer destination (/registo-tecnico). ──
chrome_links pt footer "Registo técnico" "/registo-tecnico" || flag "the Portuguese footer must link the Technical Registry"
chrome_links en footer "Technical registry" "/en/technical-registry" || flag "the English footer must link the Technical Registry"

# ── 5/6/7. Operador Zero SIMULATOR present, correct URL, and framed as demo STRUCTURALLY. ──
# The visible label is simply "Operador Zero"; its demo nature is carried by the chromeless zero.* subdomain
# destination + the beaker icon + the dev-resources column + absence from the registry/header (checks below).
chrome_links pt footer "Operador Zero" "https://zero.banza.network/" || flag "footer must offer the 'Operador Zero' demo link"
# Its own host is not this site's page: the English edition must reach the same URL, never a rewritten one.
chrome_links en footer "Operator Zero" "https://zero.banza.network/" || flag "the English footer must reach the same Operador Zero host"
# Its demo nature is carried structurally: an external destination on its own chromeless host, in
# every edition. Read from the resolved chrome rather than from the config's literal form.
for ed in pt en; do
  CR_LOCALE="$ed" python3 - "$CHROME_RESOLVED" <<'CHROME_EOF' || flag "the Operador Zero footer link must be external in the $ed edition (zero.* demo subdomain)"
import json, os, sys
e = json.load(open(sys.argv[1]))["editions"][os.environ["CR_LOCALE"]]
items = [i for c in e["footer"] for i in c["items"] if i["href"].startswith("https://zero.banza.network")]
sys.exit(0 if items and all(i.get("external") for i in items) else 1)
CHROME_EOF
done

# ── 8/9. External link opens in a new tab with noopener + noreferrer. ──
has "$FOOTER" '"_blank"'                     || flag "external footer links must open in a new tab (target=_blank) — $FOOTER"
has "$FOOTER" 'noopener noreferrer'          || flag "external footer links must set rel=\"noopener noreferrer\" — $FOOTER"

# ── 10. Operador Zero must NOT be in the header (navPrimary / SiteNav). Comment-aware: the chromeless
#        onZeroSurface guard legitimately NAMES the surface in a code comment — strip comments first. ──
chrome_nav_labels pt | grep -qiF "Operador Zero" && flag "Operador Zero must not appear in the Portuguese header" || true
chrome_nav_labels en | grep -qiF "Operator Zero" && flag "Operator Zero must not appear in the English header" || true
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
