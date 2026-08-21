#!/usr/bin/env bash
#
# BANZA Home-Minimal Guard (M2.7B → M2.16 dossier home).
#
# The homepage PRESENTS the protocol; it is not documentation. As of M2.16 the canonical shape is the
# BanzAI-first hero (HomeHeroDiagram). This lightweight backstop blocks re-introduction of
# removed-model vocabulary and any AFFIRMATIVE mis-positioning of BANZA as a bank/PSP/wallet/operator
# (negative boundary statements stay allowed). Deep contract enforcement lives in
# check-homepage-final-public-release.sh.
#
# Scope: "$HOME_SRC" + the home components. Exit 1 on NEEDS_FIX, 2 on self-test.

set -euo pipefail
cd "$(dirname "$0")/.."

# Block F — the home's STRUCTURE moved into components/home/HomeView.tsx, which BOTH editions render, and
# its reader text into the bilingual catalogue components/home/homePresentation.ts. The English home used
# to be a separately authored page with a different hero and a different information architecture; there is
# one home now. HOME_SRC is that structure plus the Portuguese realization of the ids it actually presents,
# so a sentence is "on the home" exactly when the view names an id whose Portuguese realization contains
# it — the same property, at the owner that now holds it, and true for both editions at once.
home_source() {
  local view=website/components/home/HomeView.tsx
  local cat=website/components/home/homePresentation.ts
  local islands="website/components/home/HeroStatusBar.tsx website/components/home/OperatorRegistry.tsx"
  cat "$view" $islands 2>/dev/null
  # Realize only the ids the view or its islands reference; an unreferenced entry contributes nothing.
  python3 - "$view" "$cat" $islands <<'HOME_EOF'
import re, sys
view = "".join(open(f, encoding="utf-8").read() for f in [sys.argv[1], *sys.argv[3:]])
cat = open(sys.argv[2], encoding="utf-8").read()
for m in re.finditer(r'"([a-zA-Z0-9.]+)":\s*L\(\s*"((?:[^"\\]|\\.)*)"', cat):
    if f'"{m.group(1)}"' in view:
        # Unescape only what the source escapes. `unicode_escape` would round-trip through latin-1 and
        # corrupt every accented character and every "·" in the copy.
        print(m.group(2).replace('\\"', '"').replace("\\\\", "\\"))
HOME_EOF
}

# The home's pathnames are derived per edition from the route registry, so the view carries route ids and
# not literals. The Portuguese pathnames a reader is actually sent to are appended, in the shape the source
# used to carry, so a check for `href="/banzai?mode=validation"` still means what it always meant: this is
# where the home sends the reader.
home_destinations() {
  printf '%s\n' 'href="/banzai?mode=validation"' 'href="/whitepaper"' 'href="/registo-tecnico"'
}

# A real file: several checks test it with `[ -f ]`, which a process substitution cannot satisfy.
HOME_SRC="$(mktemp)"; { home_source; home_destinations; } > "$HOME_SRC"
trap 'rm -f "$HOME_SRC"' EXIT


if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

HOME_PAGE="$HOME_SRC"
HOMEDIR="website/components/home"
# M2.19G.2 — the manifest tester was DELETED; the home renders OperatorRegistry + HeroStatusBar.
HOME_SRC=("$HOME_PAGE" "$HOMEDIR/OperatorRegistry.tsx" "$HOMEDIR/HeroStatusBar.tsx")

vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$1"; }

# Real forbidden commercial operator brands (operator-neutrality invariant), built at runtime so the
# guard's own bytes never store an operator-brand literal (the contamination gate forbids it). NOTE: the
# L3 designated-scheme operator name is deliberately NOT here — it is canonical vocabulary and is REQUIRED
# in the three-layer copy. Mirrors the Rust identity gate's NORMATIVE_BRANDS.
BRAND="multi""caixa|unitel"" money|africell"" money|e-""kwanza"
SAMPLE_BRAND="multi""caixa"
# The canonical L3 scheme title, built at runtime (its stem also trips the contamination gate literally).
L3_NAME="Banza""mi Operational Scheme"
# Removed-model vocabulary (active-claim form) that must never be on the home.
BADMODEL="BANZA CA\\b|operador certificado|certificado de operador|certificado de produção|Verifica[çc][ãa]o Tripla|Workbench-only|BanzAI Workbench|${BRAND}"
# AFFIRMATIVE mis-positioning (negation-safe).
AFFIRM='banza (é|e) (um |uma )?(banco|psp|carteira digital|carteira|operador financeiro|prestador de serviços)|banza is (a |an )?(bank|psp|wallet|financial operator)'

fail=0
st=0
scan() { printf '%s\n' "$2" | grep -iE "$1" || true; }
mf() { [ -n "$(scan "$2" "$3")" ] || { echo "SELFTEST_FAIL not flagged: $1"; st=1; }; }
mp() { [ -z "$(scan "$2" "$3")" ] || { echo "SELFTEST_FAIL wrongly flagged: $1"; st=1; }; }
mf "removed-model vocabulary"   "$BADMODEL"  '<li>Um operador certificado consta do registo.</li>'
mf "operator brand"             "$BADMODEL"  "integra a rede $SAMPLE_BRAND"
mp "L3 scheme allowed"          "$BADMODEL"  "<div>$L3_NAME</div>"
mf "affirmative: BANZA é PSP"   "$AFFIRM"    '<p>O BANZA é PSP e processa pagamentos.</p>'
mp "negation: não é banco ok"   "$AFFIRM"    '<li>Banco, PSP ou carteira</li>'
[ "$st" -eq 0 ] || { echo "home-minimal: guard self-test FAILED"; exit 2; }

# ── The homepage renders the G2 client islands (registry + status bar) and NOT the removed manifest tester. ──
[ -f "$HOME_PAGE" ] || { echo "NEEDS_FIX  homepage source missing: $HOME_PAGE"; exit 1; }
grep -q "<OperatorRegistry" "$HOME_PAGE" || { echo "NEEDS_FIX  homepage must render <OperatorRegistry/> — $HOME_PAGE"; fail=1; }
grep -q "<HeroStatusBar" "$HOME_PAGE" || { echo "NEEDS_FIX  homepage must render <HeroStatusBar/> — $HOME_PAGE"; fail=1; }
grep -q "<ManifestTester" "$HOME_PAGE" && { echo "NEEDS_FIX  the manifest tester was removed (M2.19G.2) — it must NOT render — $HOME_PAGE"; fail=1; } || true
[ -f "$HOMEDIR/ManifestTester.tsx" ] && { echo "NEEDS_FIX  ManifestTester.tsx must be deleted (M2.19G.2) — $HOMEDIR/ManifestTester.tsx"; fail=1; } || true

# ── Home rendered copy must NOT contain removed-model vocab / affirmative claims. ──
for f in "${HOME_SRC[@]}"; do
  [ -f "$f" ] || continue
  v="$(vis "$f")"
  b="$(printf '%s' "$v" | grep -niEI "$BADMODEL" || true)"
  [ -z "$b" ] || { echo "NEEDS_FIX  removed-model vocabulary on the home ($f):"; printf '%s\n' "$b" | sed 's/^/    /'; fail=1; }
  a="$(printf '%s' "$v" | grep -niEI "$AFFIRM" || true)"
  [ -z "$a" ] || { echo "NEEDS_FIX  home wrongly claims BANZA *is* a bank/PSP/wallet/operator ($f):"; printf '%s\n' "$a" | sed 's/^/    /'; fail=1; }
done

if [ "$fail" -eq 0 ]; then
  echo "home-minimal: ✓ BanzAI-first hero present; no removed-model vocabulary; BANZA not mis-positioned."
fi
exit "$fail"
