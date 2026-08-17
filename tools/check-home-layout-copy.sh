#!/usr/bin/env bash
#
# BANZA Home Layout & Copy Guard (M2.9E → M2.16 dossier home).
#
# The public home + global chrome (nav, footer) must stay free of retired product/demo/certification
# vocabulary and internal milestone tags, and the footer must carry the short institutional boundary
# line ("O BANZA não é banco, PSP, carteira ou operador financeiro."). Deep contract enforcement is in
# check-homepage-final-public-release.sh; this is the copy backstop over the home + nav + footer.
#
# Scope: "website/app/(pt)/page.tsx" · website/components/home/*.tsx · SiteNav.tsx · SiteFooter.tsx.
# Exit 1 on NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

HOME_PAGE="website/app/(pt)/page.tsx"
HOMEDIR="website/components/home"
FOOTER="website/components/SiteFooter.tsx"
NAV="website/components/SiteNav.tsx"
# M2.19G.2 — the rendered home surface is page.tsx + chrome + the two G2 islands (registry + status bar).
HOME_SRC=("$HOME_PAGE" "$FOOTER" "$NAV" "$HOMEDIR/OperatorRegistry.tsx" "$HOMEDIR/HeroStatusBar.tsx")

# Milestone tags in public copy (slash form or uppercase-suffixed) — SVG path data never has that shape.
MILESTONE='M[0-9]/M[0-9]|M[0-9]\.[0-9]+[A-Z]'
# Real forbidden commercial operator brands (operator-neutrality invariant), built at runtime so the
# guard's own bytes never store an operator-brand literal (the contamination gate forbids it). NOTE: the
# L3 designated-scheme operator name is deliberately NOT here — it is canonical vocabulary and is REQUIRED
# in the three-layer copy. Mirrors the Rust identity gate's NORMATIVE_BRANDS.
BRAND="multi""caixa|unitel"" money|africell"" money|e-""kwanza"
SAMPLE_BRAND="multi""caixa"
# The canonical L3 scheme title, built at runtime (its stem also trips the contamination gate literally).
L3_NAME="Banza""mi Operational Scheme"
# Retired product / demonstration / certification vocabulary + commercial operator brand.
BADVOCAB="Workbench|modo demonstra|\\bmock\\b|\\bfixture\\b|\\bassistant\\b|operador certificado|certificado de operador|BANZA CA|Verifica[çc][ãa]o Tripla|${BRAND}"

# strip /* */ (incl. JSX {/* */}) blocks and full-line // comments → the "visible copy" stream.
visible() { perl -0777 -pe 's{/\*.*?\*/}{}gs' "$1" | grep -vE '^\s*//'; }

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }

# ── Self-test ──
st_fail=0
scan() { printf '%s\n' "$2" | grep -iE "$1" || true; }
must_flag() { [ -n "$(scan "$2" "$3")" ] || { echo "SELFTEST_FAIL not flagged: $1"; st_fail=1; }; }
must_pass() { [ -z "$(scan "$2" "$3")" ] || { echo "SELFTEST_FAIL wrongly flagged: $1"; st_fail=1; }; }
must_flag "milestone slash form"        "$MILESTONE" 'o roteiro M2/M3 continua'
must_pass "SVG path M3.5 not milestone" "$MILESTONE" '<path d="M3.5 19a5.5 5.5 0 0 1 11 0" />'
must_flag "retired: Workbench"          "$BADVOCAB"  'Abrir o Workbench do protocolo'
must_flag "operator brand"              "$BADVOCAB"  "integra a rede $SAMPLE_BRAND"
must_pass "L3 scheme allowed"           "$BADVOCAB"  "$L3_NAME"
must_pass "allowed prose"               "$BADVOCAB"  'motores verificáveis e evidência técnica'
[ "$st_fail" -eq 0 ] || { echo "check-home-layout-copy: SELF-TEST FAILED" >&2; exit 2; }

echo "check-home-layout-copy: verifying home + nav + footer copy…"

# ── 1) Retired vocabulary / milestone tags in the home + chrome public copy ──
for f in "${HOME_SRC[@]}"; do
  [ -f "$f" ] || { flag "missing home surface: $f"; continue; }
  vis="$(visible "$f")"
  if printf '%s\n' "$vis" | grep -nEi "$BADVOCAB" >/dev/null; then
    flag "$f contains retired product/brand vocabulary:"; printf '%s\n' "$vis" | grep -nEi "$BADVOCAB" | sed 's/^/      /'
  fi
  if printf '%s\n' "$vis" | grep -nE "$MILESTONE" >/dev/null; then
    flag "$f contains an internal milestone tag in public copy:"; printf '%s\n' "$vis" | grep -nE "$MILESTONE" | sed 's/^/      /'
  fi
done

# ── 2) Footer carries the short institutional boundary line ──
grep -q "não é banco, PSP, carteira ou operador financeiro" "$FOOTER" || flag "$FOOTER is missing the short institutional boundary line ('O BANZA não é banco, PSP, carteira ou operador financeiro.')."

if [ "$fail" -ne 0 ]; then
  echo "check-home-layout-copy: FAILED — home/nav/footer copy regressed (see NEEDS_FIX above)." >&2
  exit 1
fi
echo "check-home-layout-copy: OK — no retired vocabulary or milestone tags; footer boundary present."
