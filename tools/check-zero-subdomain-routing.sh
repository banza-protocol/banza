#!/usr/bin/env bash
#
# zero.banza.network — host-aware routing guard (ADR-052, M2.12E).
#
# M2.12E prepares zero.banza.network to serve the SAME single-page Operador Zero lab already shipped
# at /operador-zero, plus the SAME ten demo JSON artifacts at clean root paths — with NO redesign and
# NO duplication. The routing decision lives in one pure module (website/lib/zeroSubdomain.ts), driven
# by a thin Next middleware (website/middleware.ts). This guard keeps that contract intact:
#
#   * host-aware support for zero.banza.network exists (module + middleware);
#   * `/` on the subdomain maps to the lab (/operador-zero);
#   * the ten root JSON endpoints map onto the canonical apex handler (so POST→405 and unknown→404
#     are inherited, never reimplemented);
#   * the subdomain endpoint list and the apex artifact list DO NOT diverge (single source of truth);
#   * the apex /operador-zero page + handler are intact (subdomain reuse must not break the apex);
#   * Operador Zero is never published in an operators list;
#   * the routing layer carries no storage / database / private-key dependency, no commercial operator
#     brand, no forbidden certification claim and no real-payment CTA;
#   * the page does not claim the subdomain is live unless a controlled activation flag is set, and,
#     while dormant, still states it is prepared/not-active.
#
# Activation flag (the "controlled flag"): infra/banza-network/ZERO_SUBDOMAIN_ACTIVE. Absent → dormant
# (the shipping state): the page MUST say prepared/not-active and MUST NOT claim live. Present → the
# maintainer has activated the subdomain: the page MUST NOT still say "não activo".
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite file is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

MOD="website/lib/zeroSubdomain.ts"
MW="website/middleware.ts"
APEX_ARTIFACTS="website/lib/operadorZero.ts"
STANDALONE_PAGE="website/app/oz/page.tsx"
LAB_HANDLER="website/app/oz/[...artifact]/route.ts"
OLD_APEX_DIR="website/app/operador-zero"
NGINX="infra/banza-network/nginx/conf.d/banza.conf"
ACTIVE_FLAG="infra/banza-network/ZERO_SUBDOMAIN_ACTIVE"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
for f in "$MOD" "$MW" "$APEX_ARTIFACTS" "$STANDALONE_PAGE" "$LAB_HANDLER"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 2; }
done

echo "══════════════════════════════════════════════════════════════════════"
echo "zero.banza.network — host-aware routing"
echo "══════════════════════════════════════════════════════════════════════"

# ── 1. Host-aware support exists ─────────────────────────────────────────────
echo "routing: host-aware support…"
grep -q 'zero\.banza\.network' "$MOD" && ok "zeroSubdomain.ts targets zero.banza.network" || bad "zeroSubdomain.ts must target zero.banza.network"
grep -qE 'resolveZeroRoute' "$MW"     && ok "middleware.ts drives resolveZeroRoute"       || bad "middleware.ts must call resolveZeroRoute"
grep -qE 'export const config' "$MW" && grep -q 'matcher' "$MW" && ok "middleware has a matcher" || bad "middleware.ts must export a matcher config"

# ── 2. `/` maps to the internal lab route ────────────────────────────────────
echo "routing: root → lab…"
grep -qE 'ZERO_LAB_ROUTE *= *"/oz"' "$MOD" && ok "ZERO_LAB_ROUTE = /oz (internal; public entry is /)" || bad "ZERO_LAB_ROUTE must be the internal /oz route"
# `/` (and empty path) rewrites to the lab route.
grep -qE 'pathname *=== *"/"' "$MOD" && grep -q 'ZERO_LAB_ROUTE' "$MOD" && ok "'/' rewrites to the lab" || bad "'/' must rewrite to ZERO_LAB_ROUTE"

# ── 3. Root JSON endpoints map onto the internal handler ─────────────────────
echo "routing: root endpoints → canonical handler…"
grep -qE 'endsWith\(".json"\)' "$MOD" && ok "*.json is routed" || bad "*.json paths must be routed"
grep -qE '\$\{ZERO_LAB_ROUTE\}\$\{pathname\}' "$MOD" \
  && ok "*.json rewrites onto /oz<path> (same handler → 405/404 inherited)" \
  || bad "*.json must rewrite onto the /oz handler, not a reimplementation"

# ── 4. Endpoint parity: subdomain list ≡ apex artifact list (no divergence) ──
echo "routing: apex ↔ subdomain parity…"
# ZERO_ENDPOINTS entries from the routing module.
# Route segments may be multi-part and dotted (ADR-080: .well-known/banza/operator), so the class
# includes '.' — otherwise the canonical .well-known routes are silently dropped from the parity set.
grep -oE '"[a-z0-9/.-]+"' <(sed -n '/ZERO_ENDPOINTS *= *\[/,/\] as const/p' "$MOD") \
  | tr -d '"' | sort -u > "$TMP/sub.txt"
# route: values from ARTIFACT_ROUTES on the apex.
grep -oE 'route: *"[a-z0-9/.-]+"' "$APEX_ARTIFACTS" | sed -E 's/route: *"([^"]+)"/\1/' | sort -u > "$TMP/apex.txt"
SUBN=$(grep -c . "$TMP/sub.txt" || true); APEXN=$(grep -c . "$TMP/apex.txt" || true)
if [ "$SUBN" -eq 14 ] && [ "$APEXN" -eq 14 ] && diff -q "$TMP/sub.txt" "$TMP/apex.txt" >/dev/null; then
  ok "the 14 subdomain endpoints match the 14 apex artifacts exactly"
else
  bad "subdomain ($SUBN) and apex ($APEXN) endpoint lists diverge:"; diff "$TMP/apex.txt" "$TMP/sub.txt" | sed 's/^/      /' || true
fi

# ── 5. POST→405 and unknown→404 guaranteed at the canonical handler ─────────
echo "routing: 405 / 404 preserved…"
grep -qE 'status: *405' "$LAB_HANDLER" && grep -qiE 'POST *=' "$LAB_HANDLER" && ok "handler refuses POST with 405" || bad "the /oz handler must refuse POST with 405"
grep -qE 'status: *404' "$LAB_HANDLER" && ok "handler 404s an unknown artifact" || bad "the /oz handler must 404 an unknown artifact"

# ── 6. The retired apex surface is 410 Gone, not redirected, and truly removed ──
echo "routing: apex /operador-zero retired (410 Gone)…"
grep -qE 'RETIRED_APEX_ROUTE *= *"/operador-zero"' "$MOD" && ok "routing declares /operador-zero retired" || bad "routing must declare /operador-zero as the retired route"
grep -qE 'type: *"gone"' "$MOD" && ok "the retired route resolves to gone (410)" || bad "the retired /operador-zero must resolve to a gone (410) response"
# It must NOT be redirected to the subdomain.
if grep -oE 'RETIRED_APEX_ROUTE[^\n]*redirect|redirect[^\n]*RETIRED_APEX_ROUTE' "$MOD" | grep -q .; then bad "the retired route must NOT redirect to the subdomain"; else ok "the retired route is not redirected"; fi
# The old apex route directory must be gone from the app tree.
[ -d "$OLD_APEX_DIR" ] && bad "the old apex route dir still exists: $OLD_APEX_DIR (it must be removed)" || ok "the old apex route dir is removed"
# The standalone surface + its handler exist.
[ -f "$STANDALONE_PAGE" ] && ok "standalone page present ($STANDALONE_PAGE)" || bad "standalone page missing"
[ -f "$LAB_HANDLER" ]     && ok "internal JSON handler present"             || bad "internal JSON handler missing"
# The middleware is a strict pass-through on the apex host (after the retired/internal cases).
grep -qE 'if *\(!zero\) *return *\{ *type: *"next" *\}' "$MOD" \
  && ok "apex host is a strict pass-through (next)" \
  || bad "the apex host must be an unconditional pass-through"
# The internal /oz name is blocked (404) at the apex — one surface only.
grep -qE 'type: *"notfound"' "$MOD" && ok "the internal /oz name is 404 at the apex" || bad "the internal /oz route must 404 at the apex"

# ── 7. Operador Zero never appears in a real operators list ──────────────────
echo "routing: never a real operator…"
OPS=$(grep -rniE 'operators?" *: *\[[^]]*operator-zero' website/lib contracts 2>/dev/null || true)
if [ -z "$OPS" ]; then ok "Operador Zero is not in any operators[] list"; else bad "Operador Zero appears in an operators list: $OPS"; fi

# ── 8. Routing layer has no storage / DB / private-key dependency ───────────
echo "routing: no storage/db/secret in the routing layer…"
DEP=$(grep -noE '(localStorage|sessionStorage|indexedDB)[[:space:]]*[.[]|document\.cookie|process\.env\.(DATABASE|PG|POSTGRES)|BEGIN [A-Z ]*PRIVATE KEY' "$MOD" "$MW" || true)
if [ -z "$DEP" ]; then ok "routing depends on host + path only"; else bad "routing must not depend on storage/db/secrets: $DEP"; fi

# ── 9. No brand / claim / real-payment CTA in the routing layer ─────────────
echo "routing: containment…"
BRAND="$(printf 'banz'; printf 'ami')"
if grep -qi "$BRAND" "$MOD" "$MW"; then bad "a commercial operator brand appears in the routing layer"; else ok "no commercial operator brand in routing"; fi
CTA=$(grep -noiE "Pagar agora|Enviar dinheiro|Abrir conta|Criar carteira" "$MOD" "$MW" || true)
[ -z "$CTA" ] && ok "no real-payment CTA in routing" || bad "forbidden CTA in routing: $CTA"

# ── 10. Live claim gated by the controlled activation flag ──────────────────
echo "routing: live claim vs activation flag…"
LIVE_RX='zero\.banza\.network (está|esta|is) (live|activo|active|ativa)'
PREP_RX='zero\.banza\.network (está|esta) preparado|zero\.banza\.network.*não activo|zero\.banza\.network.*nao activo'
if [ -f "$ACTIVE_FLAG" ]; then
  ok "activation flag present → subdomain declared active by the maintainer"
  if grep -qiE "$PREP_RX" "$STANDALONE_PAGE"; then bad "flag is ACTIVE but the standalone page still says prepared/not-active"; else ok "standalone page no longer says prepared/not-active"; fi
else
  ok "no activation flag → subdomain is dormant (the shipping state)"
  if grep -qiE "$LIVE_RX" "$STANDALONE_PAGE"; then bad "page claims zero.banza.network is live without the activation flag"; else ok "page makes no live claim"; fi
  if grep -qiE "preparado" "$STANDALONE_PAGE"; then ok "page states the subdomain is prepared"; else bad "dormant page must state zero.banza.network is prepared/not-active"; fi
fi

# ── 11. nginx block prepared (dormant) ──────────────────────────────────────
echo "routing: nginx server block prepared…"
if grep -qE 'server_name +zero\.banza\.network;' "$NGINX"; then
  ok "nginx has a zero.banza.network server block"
  grep -qE 'proxy_pass +http://website:3005;' <(sed -n '/server_name .*zero\.banza\.network;/,/^}/p' "$NGINX") \
    && ok "the block proxies to the website (middleware does the host-aware rewrite)" \
    || bad "the zero block must proxy_pass to http://website:3005"
else
  bad "nginx must carry a prepared zero.banza.network server block"
fi

# ── Self-test — the divergence + live-claim detectors actually fire ─────────
echo "routing: self-test…"
st=0
# parity detector: a mismatched pair must be caught by diff.
printf 'a\nb\n' > "$TMP/x"; printf 'a\nc\n' > "$TMP/y"
diff -q "$TMP/x" "$TMP/y" >/dev/null && { echo "    SELFTEST_FAIL parity-diff"; st=1; }
# live-claim detector fires on a real claim, not on a negated one.
printf 'zero.banza.network está live agora\n' > "$TMP/l"
grep -qiE "$LIVE_RX" "$TMP/l" || { echo "    SELFTEST_FAIL live-claim"; st=1; }
printf 'zero.banza.network está preparado, mas não activo\n' > "$TMP/p"
grep -qiE "$LIVE_RX" "$TMP/p" && { echo "    SELFTEST_FAIL live-claim false positive on prepared"; st=1; }
# storage detector in routing fires on real usage, not on a comment.
printf 'localStorage.getItem("x")\n' > "$TMP/s"
grep -qoE "(localStorage|sessionStorage)[[:space:]]*[.[]" "$TMP/s" || { echo "    SELFTEST_FAIL storage"; st=1; }
printf '// no localStorage here\n' > "$TMP/s2"
grep -qoE "(localStorage|sessionStorage)[[:space:]]*[.[]|document\.cookie" "$TMP/s2" && { echo "    SELFTEST_FAIL storage-comment false positive"; st=1; }
[ "$st" -eq 0 ] && ok "self-test: parity-diff, live-claim (+negation), storage (+comment)" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "zero-subdomain-routing-check: PASS"; else echo "zero-subdomain-routing-check: FAIL"; fi
exit "$fail"
