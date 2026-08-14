#!/usr/bin/env bash
#
# Operador Zero standalone surface guard (ADR-035, M2.12G).
#
# After activation, zero.banza.network is the SINGLE, dedicated, standalone surface of the Operador
# Zero: its own shell (no global BANZA header/nav/footer), served from the internal /oz route; the old
# apex surface /operador-zero is RETIRED (410 Gone), not redirected. This guard keeps that intact. It
# fails if the standalone surface regrows the BANZA chrome, if the apex route comes back or starts
# redirecting to the subdomain, if the reference points at the old apex path, or if the surface reads
# like a real payment product / names a commercial operator.
#
# Static, source-based (live HTTP behaviour is validated separately in QA). Complements
# make zero-subdomain-routing-check (routing), make zero-subdomain-design-check (single-page design)
# and make operator-zero-public-hardening-check (chapter + boundary).
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

PAGE="website/app/oz/page.tsx"
LAB="website/components/operador-zero/OperadorZeroReference.tsx"
NAV="website/components/SiteNav.tsx"
FOOTER_GATE="website/components/SiteFooterGate.tsx"
MOD="website/lib/zeroSubdomain.ts"
SITE="website/lib/site.ts"
REF="website/content/BANZA_REFERENCIA.md"
OLD_APEX_DIR="website/app/operador-zero"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
for f in "$PAGE" "$LAB" "$NAV" "$FOOTER_GATE" "$MOD" "$SITE" "$REF"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 2; }
done
cat "$PAGE" "$LAB" > "$TMP/surface.txt"

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero — standalone surface (zero.banza.network)"
echo "══════════════════════════════════════════════════════════════════════"

# ── 1. The standalone page has its OWN shell, not the global BANZA chrome ─────
echo "surface: own Operador Zero shell…"
grep -q "OperadorZeroReference" "$PAGE" && ok "page renders the read-only reference surface" || bad "page must render <OperadorZeroReference/>"
# It must NOT IMPORT the global site chrome (a comment mentioning them is fine).
if grep -qE '^import .*(SiteNav|SiteFooter)|from ["'"'"']@/components/Site(Nav|Footer)' "$PAGE"; then bad "the standalone page must not import the global SiteNav/SiteFooter"; else ok "no global SiteNav/SiteFooter import on the standalone page"; fi
grep -qE "<header" "$PAGE" && ok "page has its own top bar" || bad "the standalone page must carry its own top bar"
grep -qE "<footer" "$PAGE" && ok "page has its own footer" || bad "the standalone page must carry its own footer"
grep -q "Operador Zero" "$PAGE" && ok "own identity present" || bad "the shell must state the Operador Zero identity"
# A few essential links, its own — not the global menu.
for l in "Artefactos" "BanzAI" "Referência" "GitHub"; do
  grep -q "$l" "$PAGE" && ok "shell link: $l" || bad "shell should carry the '$l' link"
done
# Demo badges in the shell.
grep -q "demo_only" "$PAGE" && grep -q "KZ_DEMO" "$PAGE" && ok "shell carries demo badges" || bad "shell must carry demo badges (demo_only, KZ_DEMO)"

# ── 2. The global chrome is gated off for the standalone surface ─────────────
echo "surface: global chrome gated off…"
for f in "$NAV" "$FOOTER_GATE"; do
  b="$(basename "$f")"
  grep -qE '/oz' "$f" && grep -qE 'zero\.banza\.network' "$f" \
    && ok "$b gates the /oz path AND the zero.banza.network host" \
    || bad "$b must gate off the chrome for /oz and the zero.banza.network host"
done

# ── 3. The apex /operador-zero surface is retired (gone), not rendered, not redirected ──
echo "surface: apex /operador-zero retired…"
[ -d "$OLD_APEX_DIR" ] && bad "the apex route dir $OLD_APEX_DIR still exists — the surface must be removed" || ok "apex /operador-zero route dir removed"
grep -qE 'RETIRED_APEX_ROUTE *= *"/operador-zero"' "$MOD" && grep -qE 'type: *"gone"' "$MOD" \
  && ok "routing resolves /operador-zero to 410 Gone" \
  || bad "routing must resolve /operador-zero to 410 Gone"
# The retired route must NOT be redirected to the subdomain.
if grep -oE 'RETIRED_APEX_ROUTE[^\n]*redirect|redirect[^\n]*RETIRED_APEX_ROUTE' "$MOD" | grep -q .; then bad "the retired apex route must NOT redirect to the subdomain"; else ok "the retired apex route is not redirected"; fi
# The internal /oz name is blocked at the apex (one public surface only).
grep -qE 'type: *"notfound"' "$MOD" && ok "the internal /oz name is 404 at the apex" || bad "the internal /oz route must 404 at the apex"

# ── 4. BanzAI stays on the apex — never proxied on the subdomain ─────────────
echo "surface: BanzAI apex-only…"
grep -qE 'https://banza\.network\$\{pathname\}' "$MOD" && grep -qE '/banzai' "$MOD" \
  && ok "the subdomain /banzai redirects to the apex" \
  || bad "the subdomain must redirect /banzai to the apex (BanzAI stays on the apex)"
# The read-only surface's BanzAI validation CTAs point at the canonical apex validation mode
# (banza.network/banzai?mode=validation — M2.19E/F.2, the single BanzAI interface; /banzai/validar is gone).
grep -qE 'banza\.network/banzai\?mode=validation|workbenchDeepLink' "$TMP/surface.txt" && ok "BanzAI validation deep links point at the apex validation mode (/banzai?mode=validation)" || bad "validation deep links must point at banza.network/banzai?mode=validation"
if grep -qE '/banzai/validar' "$TMP/surface.txt"; then bad "the retired /banzai/validar route is referenced on the surface"; else ok "no reference to the retired /banzai/validar route"; fi

# ── 5. The Reference points the interactive experience at the subdomain ──────
echo "surface: reference points at the subdomain…"
awk '/^## 9\. Operador Zero/{f=1} /^## 10\. /{f=0} f' "$REF" > "$TMP/ch09.md"
[ -s "$TMP/ch09.md" ] || { echo "FAIL: could not extract chapter 09"; exit 2; }
if grep -qE '\]\(/operador-zero' "$TMP/ch09.md"; then bad "the reference still links to the retired /operador-zero as a surface"; else ok "reference no longer links to /operador-zero"; fi
grep -q "zero.banza.network" "$TMP/ch09.md" && ok "reference points at zero.banza.network" || bad "reference should point the interactive experience at zero.banza.network"
# M2.15B — the global header was reduced to three destinations (Operadores · BanzAI · Ler a referência),
# so Operador Zero is no longer a nav item; it is discovered via the Reference chapter, which points at
# the subdomain (checked above). The nav config must still never link the RETIRED /operador-zero route.
if grep -qE 'href: *"/operador-zero"' "$SITE"; then bad "the nav config still points at the retired /operador-zero route"; else ok "nav config does not point at /operador-zero"; fi

# ── 6. No "prepared / not active" copy anywhere on the surface ───────────────
echo "surface: no prepared/not-active copy…"
STALE=$(grep -noiE "subdom[íi]nio preparado|preparado, mas não activo|preparado, mas nao activo|ainda não está activo|ainda nao esta activo|não activo|nao activo" "$TMP/surface.txt" || true)
if [ -z "$STALE" ]; then ok "no prepared/not-active copy"; else bad "prepared/not-active copy remains: $STALE"; fi

# ── 7. Not a real payment product ────────────────────────────────────────────
echo "surface: not a PSP / bank / wallet / real product…"
CTA=$(grep -noiE "Pagar agora|Enviar dinheiro|Abrir conta|Criar carteira|carregar saldo|levantar dinheiro" "$TMP/surface.txt" || true)
[ -z "$CTA" ] && ok "no real-payment CTAs" || bad "forbidden real-payment CTA: $CTA"
# PSP/banco/carteira/operador financeiro are allowed ONLY when negated on the same line.
NEG='não|nao|nunca|\bsem\b|never|not '
prod_hit=0
while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "$line" | grep -qiE "$NEG" && continue
  echo "  FAIL: unqualified real-product term: ${line:0:80}"; prod_hit=1
done < <(grep -inE "\bPSP\b|operador financeiro|operador licenciado|serviço financeiro|servi[çc]o financeiro" "$TMP/surface.txt" || true)
[ "$prod_hit" -eq 0 ] && ok "no unqualified PSP/bank/wallet/licensed-operator language" || fail=1

# ── 8. No unqualified certification/licence claim ───────────────────────────
echo "surface: no certification/licence claim…"
CLAIM='certificad[oa]|aprovad[oa]|licenciad[oa]|autorizad[oa]'
claim_hit=0
while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "$line" | grep -qiE "$NEG" && continue
  echo "  FAIL: unqualified status claim: ${line:0:80}"; claim_hit=1
done < <(grep -inE "$CLAIM" "$TMP/surface.txt" | grep -viE 'production_allowed|monetary_value|certification:' || true)
[ "$claim_hit" -eq 0 ] && ok "no unqualified certification/licence/authorisation claim" || fail=1

# ── 9. No commercial operator brand ─────────────────────────────────────────
echo "surface: brand containment…"
BRAND="$(printf 'banz'; printf 'ami')"
if grep -qi "$BRAND" "$TMP/surface.txt"; then bad "a commercial operator brand appears on the standalone surface"; else ok "no commercial operator brand on the surface"; fi

# ── 10. Operador Zero never appears in a real operators list ─────────────────
echo "surface: never a real operator…"
OPS=$(grep -rniE 'operators?" *: *\[[^]]*operator-zero' website/lib contracts 2>/dev/null || true)
[ -z "$OPS" ] && ok "Operador Zero is not in any operators[] list" || bad "Operador Zero appears in an operators list: $OPS"

# ── Self-test — the detectors fire ──────────────────────────────────────────
echo "surface: self-test…"
st=0
printf 'SiteNav\n' > "$TMP/c.tsx"; grep -qE "SiteNav|SiteFooter" "$TMP/c.tsx" || { echo "    SELFTEST_FAIL chrome"; st=1; }
printf '](/operador-zero)\n' > "$TMP/r.md"; grep -qE '\]\(/operador-zero' "$TMP/r.md" || { echo "    SELFTEST_FAIL apex-link"; st=1; }
printf 'subdomínio preparado\n' > "$TMP/s.tsx"; grep -qoiE "subdom[íi]nio preparado" "$TMP/s.tsx" || { echo "    SELFTEST_FAIL prepared"; st=1; }
printf 'Pagar agora\n' > "$TMP/p.tsx"; grep -qoiE "Pagar agora" "$TMP/p.tsx" || { echo "    SELFTEST_FAIL cta"; st=1; }
printf 'somos um PSP\n' > "$TMP/pp.tsx"; if ! grep -inE "\bPSP\b" "$TMP/pp.tsx" | grep -viE "$NEG" | grep -q .; then echo "    SELFTEST_FAIL psp"; st=1; fi
printf 'não é PSP\n' > "$TMP/np.tsx"; if grep -inE "\bPSP\b" "$TMP/np.tsx" | grep -viE "$NEG" | grep -q .; then echo "    SELFTEST_FAIL psp-negation"; st=1; fi
[ "$st" -eq 0 ] && ok "self-test: chrome, apex-link, prepared, cta, psp (+negation)" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "operator-zero-standalone-surface-check: PASS"; else echo "operator-zero-standalone-surface-check: FAIL"; fi
exit "$fail"
