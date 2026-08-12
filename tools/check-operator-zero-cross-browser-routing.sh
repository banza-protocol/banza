#!/usr/bin/env bash
#
# Operador Zero cross-browser routing guard (M2.19E/F, §19).
#
# The Chrome/edge redirect issue was a HISTORICAL client-cached permanent redirect. This guard keeps the
# server from ever re-introducing one: the Zero apex ("/") must be a REWRITE (200), never a redirect;
# /banzai on the subdomain must be a TEMPORARY (307) redirect to the apex, never 301/308; the retired
# /operador-zero must be 410 Gone, never redirected. It scans the pure routing brain (zeroSubdomain.ts)
# and the middleware wrapper. Live HTTP behaviour is validated separately in public-edge QA.
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

MOD="website/lib/zeroSubdomain.ts"
MW="website/middleware.ts"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

[ -f "$MOD" ] || { echo "FAIL: missing $MOD"; exit 2; }
[ -f "$MW" ]  || { echo "FAIL: missing $MW"; exit 2; }

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero — cross-browser routing (no permanent cross-host redirect)"
echo "══════════════════════════════════════════════════════════════════════"

# 1. The Zero apex "/" is a REWRITE onto the internal lab route — never a redirect.
grep -qE 'pathname === "/".*rewrite|type: "rewrite", to: ZERO_LAB_ROUTE' "$MOD" \
  && ok 'zero apex "/" resolves to a rewrite (200), not a redirect' \
  || bad 'zero apex "/" must resolve to a rewrite (200)'

# 2. The middleware only ever issues a TEMPORARY (307) redirect — no 301/308 permanent redirects.
if grep -qE 'redirect\([^)]*,\s*30[18]\s*\)|NextResponse\.redirect\([^)]*30[18]' "$MW"; then
  bad "middleware issues a permanent (301/308) redirect — forbidden (clients cache it forever)"
else
  ok "no permanent (301/308) redirect in the middleware"
fi
grep -qE 'NextResponse\.redirect\([^)]*307\)' "$MW" && ok "redirects are temporary (307)" || ok "no redirect emitted (rewrite-only)"

# 3. The retired apex /operador-zero is 410 Gone, never redirected to the subdomain.
grep -qE 'RETIRED_APEX_ROUTE' "$MOD" && grep -qE 'type: "gone"' "$MOD" \
  && ok "/operador-zero is 410 Gone" \
  || bad "/operador-zero must be 410 Gone"
if grep -oE 'RETIRED_APEX_ROUTE[^\n]*redirect|redirect[^\n]*RETIRED_APEX_ROUTE' "$MOD" | grep -q .; then
  bad "the retired apex route must NOT be redirected"
else
  ok "the retired apex route is not redirected"
fi

# 4. /banzai on the subdomain is a redirect to the apex — and (per #2) it is 307, not permanent.
grep -qE '/banzai' "$MOD" && grep -qE 'type: "redirect"' "$MOD" \
  && ok "subdomain /banzai redirects to the apex" \
  || bad "subdomain /banzai must redirect to the apex"

# Self-test — the permanent-redirect detector fires.
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
printf 'return NextResponse.redirect(url, 308)\n' > "$TMP"
grep -qE 'redirect\([^)]*,\s*30[18]\s*\)|NextResponse\.redirect\([^)]*30[18]' "$TMP" || { echo "    SELFTEST_FAIL permanent-redirect detector"; fail=1; }

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "operator-zero-cross-browser-routing-check: PASS"; else echo "operator-zero-cross-browser-routing-check: FAIL"; fi
exit "$fail"
