#!/usr/bin/env bash
#
# BANZA Global Navigation Final Guard (M2.15B → M2.19G.2).
#
# The global menu routes to exactly THREE distinct public destinations — Registo técnico · BanzAI ·
# Ler a referência — and never works as a second index of the Reference. "Ler a referência" points
# DIRECTLY at /referencia (no redirect, never /o-que-e). This guard enforces the three-destination
# contract, the exact order, the mandatory absence of the former Protocolo / Confiança / Programadores
# dropdowns (and their duplicated chapter links), a single active state, and neutral operator language.
# Scope: the header component + the nav config ONLY — it never rejects reference chapters, the footer,
# or contextual page links. Comment-aware; self-tests on every run.
#
# Scope: website/components/SiteNav.tsx, website/lib/site.ts, "website/app/(pt)/registo-tecnico/page.tsx."
# Exit 1 on NEEDS_FIX, 2 on self-test failure.

# NOTE: no `pipefail` — a no-match grep inside `x="$(… | grep … | wc -l)"` is EXPECTED, not an error.
set -eu
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

NAV="website/components/SiteNav.tsx"
SITE="website/lib/site.ts"
REG="website/app/(pt)/registo-tecnico/page.tsx"

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }

# visible(): strip block + line comments (protect https://) + collapse whitespace. This is what the
# header RENDERS — code comments (which legitimately mention the removed dropdowns) never trigger a finding.
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g; s/\s+/ /g' "$1"; }

# ── Self-test: exercise the detectors on representative fixtures. ──
st=0
has() { printf '%s\n' "$2" | grep -qE "$1"; }
mf() { has "$2" "$3" || { echo "SELFTEST_FAIL not detected: $1"; st=1; }; }
mp() { has "$2" "$3" && { echo "SELFTEST_FAIL wrongly detected: $1"; st=1; } || true; }
mf "dropdown arrow"     '▾'                         'group ▾'
mp "arrow-free header"  '▾'                         'Registo técnico BanzAI Ler a referência'
mf "menu role"          'role="menu"'               '<div role="menu">'
mf "cert language"      'certificad|aprovad|licenciad' 'operadores certificados'
mp "neutral language"   'certificad|aprovad|licenciad' 'Registo público de operadores'
[ "$st" -eq 0 ] || { echo "global-navigation-final: guard self-test FAILED"; exit 2; }

navv="$(vis "$NAV")"
sitev="$(vis "$SITE")"
# `navPrimary` is a function call now, not an array literal, so slicing the config between two lines
# yielded a single line with no hrefs in it — every count and every destination check below read from an
# empty string and, being a config-shaped test, could only ever have covered Portuguese. The header is read
# as RESOLVED data instead: what each edition actually gives a reader.
# shellcheck source=tools/_chrome-resolved.sh
. tools/_chrome-resolved.sh

# ── 1. Exactly three primary destinations, in each edition. ──
for ed in pt en; do
  count="$(chrome_nav_hrefs "$ed" | grep -c . || true)"
  [ "$count" -eq 3 ] || flag "the $ed global nav must have exactly three destinations (found $count)"
done

# ── 2/3/4/5. The three destinations, their labels, and their exact order — per edition. ──
pt_order="$(chrome_nav_hrefs pt | tr '\n' ' ')"
en_order="$(chrome_nav_hrefs en | tr '\n' ' ')"
[ "$pt_order" = "/registo-tecnico /banzai /referencia " ] \
  || flag "the Portuguese nav order must be /registo-tecnico /banzai /referencia (got: $pt_order)"
[ "$en_order" = "/en/technical-registry /en/banzai /en/reference " ] \
  || flag "the English nav order must be /en/technical-registry /en/banzai /en/reference (got: $en_order)"
chrome_links pt nav "Registo técnico" "/registo-tecnico" || flag "Registo técnico missing from the Portuguese nav"
chrome_links pt nav "BanzAI" "/banzai"                   || flag "BanzAI missing from the Portuguese nav"
chrome_links pt nav "Ler a referência" "/referencia"     || flag "'Ler a referência' missing from the Portuguese nav"
chrome_links en nav "Technical registry" "/en/technical-registry" || flag "Technical registry missing from the English nav"
chrome_links en nav "BanzAI" "/en/banzai"                         || flag "BanzAI missing from the English nav"
chrome_links en nav "Read the Reference" "/en/reference"          || flag "'Read the Reference' missing from the English nav"
# The reference CTA points DIRECTLY at the Reference — never the retired /o-que-e route.
chrome_nav_hrefs pt | grep -q '^/o-que-e$' && flag "the nav must not link the retired /o-que-e route" || true
# `np` stays defined for the removed-item sweep below, now built from the resolved labels.
np="$(chrome_nav_labels pt; chrome_nav_labels en; chrome_nav_hrefs pt; chrome_nav_hrefs en)"

# ── 6/7/8. No dropdown / submenu / arrow / popup machinery in the header. ──
printf '%s' "$navv" | grep -q "▾" && flag "dropdown arrow (▾) must not appear in the header — $NAV" || true
printf '%s' "$navv" | grep -q 'role="menu"' && flag "dropdown menu role must not appear in the header — $NAV" || true
printf '%s' "$navv" | grep -q "aria-haspopup" && flag "aria-haspopup (dropdown) must not appear in the header — $NAV" || true
printf '%s' "$navv" | grep -qE "openKey|DropdownItem|groupActive|navGroups" && flag "dropdown machinery (openKey/DropdownItem/groupActive/navGroups) must be removed — $NAV" || true

# ── 9/10/11. Protocolo / Confiança / Programadores no longer exist as nav groups. ──
printf '%s' "$sitev" | grep -qE "navGroups|navDirect|NavGroup" && flag "the dropdown-group config (navGroups/navDirect/NavGroup) must be removed — $SITE" || true

# ── 12-15/24/25. Removed items must not render in the header (labels come from navPrimary). ──
for tok in "Operador Zero" "GitHub" "FAQ" "ADRs e RFCs" "Protocolo" "Programadores" "Referência completa" "Recursos para programadores" "Abrir o BanzAI"; do
  printf '%s' "$np" | grep -qF "$tok" && flag "removed header item must not appear in navPrimary: $tok — $SITE" || true
  printf '%s' "$navv" | grep -qF "$tok" && flag "removed header item must not render in the header: $tok — $NAV" || true
done

# ── 16/17. Exactly one BanzAI link and one Reference link in the header. ──
# Counted on the resolved hrefs, per edition. `grep -c` returns non-zero on a count of zero, which under
# `set -e` would end the guard at the assignment instead of reporting the miss — so each count tolerates it.
b="$(chrome_nav_hrefs pt | grep -cx '/banzai' || true)"
[ "$b" -eq 1 ] || flag "the Portuguese header must have exactly one BanzAI link (found $b)"
r="$(chrome_nav_hrefs pt | grep -cx '/referencia' || true)"
[ "$r" -eq 1 ] || flag "the Portuguese header must have exactly one Reference link (found $r)"
be="$(chrome_nav_hrefs en | grep -cx '/en/banzai' || true)"
[ "$be" -eq 1 ] || flag "the English header must have exactly one BanzAI link (found $be)"
re_="$(chrome_nav_hrefs en | grep -cx '/en/reference' || true)"
[ "$re_" -eq 1 ] || flag "the English header must have exactly one Reference link (found $re_)"

# ── 18-22. A single, unambiguous active state keyed on the three exclusive prefixes. ──
printf '%s' "$navv" | grep -q "sectionActive" || flag "the header must compute a single active state (sectionActive) — $NAV"
printf '%s' "$navv" | grep -qE 'path === href \|\| path.startsWith\(href \+ "/"\)' || flag "active state must match a destination and its subroutes only (prefix match) — $NAV"
printf '%s' "$navv" | grep -q 'aria-current={active ? "page"' || flag "the active destination must set aria-current=page — $NAV"

# ── 23. Mobile mirrors desktop: both render from navPrimary; the mobile menu exists. ──
maps="$(printf '%s' "$navv" | grep -oE 'navPrimary.map' | wc -l | tr -d ' ')"
[ "$maps" -ge 2 ] || flag "desktop and mobile must both render navPrimary (found $maps navPrimary.map, expected ≥2) — $NAV"
printf '%s' "$navv" | grep -q 'id="mobile-menu"' || flag "the mobile menu container (#mobile-menu) is missing — $NAV"

# ── 26. No certified/approved/licensed operator language in the header. ──
printf '%s' "$navv" | grep -qiE 'operadores? (certificad|aprovad|licenciad)|operadores oficiais|certificação banza' && flag "operator-certification language must not appear in the header — $NAV" || true
printf '%s' "$np"   | grep -qiE 'certificad|aprovad|licenciad|oficial' && flag "operator-certification language must not appear in navPrimary — $SITE" || true

# ── Registo técnico destination is a real Technical Registry page, not a redirect, honest about the empty state. ──
if [ -f "$REG" ]; then
  grep -q "redirect(" "$REG" && flag "Registo técnico must be a real page, not a redirect — $REG" || true
  grep -q 'canonical: "/registo-tecnico"' "$REG" || flag "Registo técnico page must be canonical at /registo-tecnico — $REG"
  grep -q "nenhuma implementação está indexada" "$REG" || flag "Registo técnico page must state the empty registry honestly — $REG"
else
  flag "the Registo técnico destination page is missing — $REG"
fi

if [ "$fail" -eq 0 ]; then
  echo "global-navigation-final: ✓ three destinations (Registo técnico · BanzAI · Ler a referência), exact order, no dropdowns, single active state, neutral operator language."
fi
exit "$fail"
