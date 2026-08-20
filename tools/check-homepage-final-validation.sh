#!/usr/bin/env bash
#
# BANZA Homepage Final Validation Guard (M2.19G.2 — canonical public Home).
#
# The DEEP contract shape lives in check-homepage-final-public-release.sh; this guard pins the G2 audit
# outcomes: canonical H1/eyebrow/hero paragraph, the three-destination header (Registo técnico · BanzAI ·
# Ler a referência — no dropdowns, single active state), the single hero CTA → /banzai?mode=validation and
# the registry CTA → /registo-tecnico, the operator registry wired to the public GET /operators, calm
# animations (prefers-reduced-motion), the footer boundary statements + institutional line + note, and NO
# retired protocol vocabulary as an ACTIVE claim on the linked surfaces.
#
# Scope: the homepage + its chrome + the specific linked source files — never a naive repo-wide grep.
# Comment-aware and negation-aware. Self-tests on every run. Exit 1 on NEEDS_FIX, 2 on self-test.

# NOTE: no `pipefail` — a no-match grep inside `x="$(… | grep …)"` is EXPECTED, not an error.
set -eu
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

PAGE="website/app/(pt)/page.tsx"
REGISTRY="website/components/home/OperatorRegistry.tsx"
STATUSBAR="website/components/home/HeroStatusBar.tsx"
NAV="website/components/SiteNav.tsx"
FOOTER="website/components/SiteFooter.tsx"
SITE="website/lib/site.ts"
CSS="website/app/globals.css"

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }
# visible(): strip block + line comments (protect https://) + collapse whitespace — what the file RENDERS.
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g; s/\s+/ /g' "$1"; }
NEG='(não|nao|nunca|nem|sem|not |no )'

# ── Self-test ──
st=0
posclaim() { printf '%s\n' "$2" | grep -iE "$1" | grep -viE "$NEG" || true; }
mfp() { [ -n "$(posclaim "$2" "$3")" ] || { echo "SELFTEST_FAIL claim not flagged: $1"; st=1; }; }
mpp() { [ -z "$(posclaim "$2" "$3")" ] || { echo "SELFTEST_FAIL claim wrongly flagged: $1"; st=1; }; }
RETIRED_ACTIVE='BANZA CA|operador(es)? certificad|Verifica[çc][ãa]o Tripla|aprova[çc][ãa]o central|autoridade central'
mfp "retired active claim"   "$RETIRED_ACTIVE" "a BANZA CA emite o certificado do operador"
mpp "retired under negation" "$RETIRED_ACTIVE" "não existe autoridade central nem aprovação central"
[ "$st" -eq 0 ] || { echo "homepage-final-validation: SELF-TEST FAILED" >&2; exit 2; }

echo "check-homepage-final-validation: auditing the G2 homepage + chrome + linked surfaces…"

for f in "$PAGE" "$REGISTRY" "$STATUSBAR" "$NAV" "$FOOTER" "$SITE" "$CSS"; do
  [ -f "$f" ] || { flag "missing home surface: $f"; }
done
# The manifest tester was removed in G2 — it must NOT come back.
[ -f "website/components/home/ManifestTester.tsx" ] && flag "ManifestTester.tsx must stay deleted (M2.19G.2)" || true

pv="$(vis "$PAGE")"

# 1. Canonical H1 (exactly one, canonical fragments).
h1="$(printf '%s' "$pv" | grep -oE '<h1[ >]' | wc -l | tr -d ' ')"
[ "$h1" -eq 1 ] || flag "the home must have exactly one <h1> (found $h1)"
for s in "Protocolo aberto e" "interoperabilidade financeira"; do
  printf '%s' "$pv" | grep -qF "$s" || flag "H1 canonical fragment missing: $s"
done
# 2. Eyebrow + hero paragraph (G2 copy, verbatim).
printf '%s' "$pv" | grep -qF "PROTOCOLO FINANCEIRO ABERTO · v1.0" || flag "hero eyebrow missing"
printf '%s' "$pv" | grep -qF "O BANZA cria uma linguagem comum para que operadores financeiros independentes interoperem" || flag "hero paragraph drifted from the canonical copy"
# 3. "a base" must not return as an active positioning claim on the home or footer.
for f in "$PAGE" "$FOOTER"; do
  printf '%s' "$(vis "$f")" | grep -qiE '\ba base\b' && flag "'a base' returned on $f (retired positioning)" || true
done

# 4. Header: exactly three destinations (Registo técnico · BanzAI · Ler a referência), no dropdowns, single active state.
# The header is read as RESOLVED data, in both editions. Its labels no longer sit beside a pathname in the
# config, so a literal grep tested a form that no longer exists — and an English reader was never covered
# by it at all.
# shellcheck source=tools/_chrome-resolved.sh
. tools/_chrome-resolved.sh
[ "$(chrome_nav_labels pt | tr '\n' '·')" = "Registo técnico·BanzAI·Ler a referência·" ] \
  || flag "the Portuguese header must be Registo técnico · BanzAI · Ler a referência"
[ "$(chrome_nav_labels en | tr '\n' '·')" = "Technical registry·BanzAI·Read the Reference·" ] \
  || flag "the English header must be Technical registry · BanzAI · Read the Reference"
for ed in pt en; do
  n="$(chrome_nav_hrefs "$ed" | grep -c . || true)"
  [ "$n" = "3" ] || flag "the $ed header must have exactly 3 destinations (found $n)"
done
for bad in "aria-haspopup" "role=\"menu\"" "openKey" "DropdownItem"; do
  grep -qF "$bad" "$NAV" && flag "the header reintroduced a dropdown ($bad) — $NAV" || true
done
grep -q 'sectionActive' "$NAV" || flag "the nav lost its single prefix-based active state (sectionActive) — $NAV"

# 5. CTAs point at real routes; no empty/#/javascript:.
for r in 'href="/banzai?mode=validation"' 'href="/registo-tecnico"'; do
  printf '%s' "$pv" | grep -qF "$r" || flag "home CTA route missing: $r"
done
printf '%s' "$pv" | grep -qE 'href=""|href="#"|href="javascript:' && flag "the home has an empty/#/javascript: link" || true
printf '%s' "$pv" | grep -qF 'href="/o-que-e"' && flag "the retired /o-que-e route must not be linked from the home" || true

# 6. The operator registry reads the public registry (GET /operators); the operator marquee is restored (M2.19G.2B).
grep -q "/operators" "$REGISTRY" || flag "the operator registry must read the public registry (GET /operators) — $REGISTRY"
grep -q "data-marquee" "$REGISTRY" || flag "the operator marquee must be present — $REGISTRY"

# 7. Calm animations: prefers-reduced-motion honoured for the home keyframes.
grep -q "prefers-reduced-motion" "$CSS" || flag "the home animations must honour prefers-reduced-motion — $CSS"

# 8. Footer: no 'A base para'; boundary statements + institutional line + note present.
grep -qiF "A base para" "$FOOTER" && flag "footer still starts with 'A base para' — $FOOTER" || true
grep -qF "não é banco, PSP, carteira ou operador financeiro" "$FOOTER" || flag "footer missing the BANZA boundary line — $FOOTER"
grep -qF "não certifica, não aprova operadores e não movimenta fundos" "$FOOTER" || flag "footer missing the BanzAI boundary line — $FOOTER"
# M2.19G.2B — the extra regulatory note was reverted; the two boundary lines above remain the neutrality note.
# Institutional line (rendered with &nbsp; — normalise before matching).
perl -0777 -pe 's/&nbsp;/ /g' "$FOOTER" | grep -qF "Banza · v1.0 · 2026" || flag "footer missing the institutional line 'Banza · v1.0 · 2026' — $FOOTER"

# 9. Directly-linked public surfaces carry NO retired vocabulary as an ACTIVE claim.
# One space-separated list, word-split at use. The paths contain parentheses because `(pt)` is a
# route group; `(` is literal in a glob, so splitting stays safe.
LINKED="website/app/(pt)/registo-tecnico/page.tsx website/app/(pt)/banzai/page.tsx website/app/(pt)/estado/page.tsx website/app/(pt)/licenca/page.tsx website/app/(pt)/referencia/page.tsx"
for f in $LINKED; do
  [ -f "$f" ] || continue
  v="$(vis "$f")"
  hit="$(posclaim "BANZA CA|operador(es)? certificad|Verifica[çc][ãa]o Tripla|processo humano de admiss|liga os pagamentos|processa(mento)? de pagamentos" "$v")"
  [ -z "$hit" ] || { flag "linked surface $f contains a retired active claim:"; printf '%s\n' "$hit" | sed 's/^/      /'; }
done

if [ "$fail" -ne 0 ]; then
  echo "check-homepage-final-validation: FAILED (see NEEDS_FIX above)." >&2
  exit 1
fi
echo "check-homepage-final-validation: OK — canonical copy, three-destination header, real CTAs (hero → /banzai?mode=validation, registry → /registo-tecnico), registry reads /operators, calm animations, coherent linked surfaces."
