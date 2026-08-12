#!/usr/bin/env bash
# Static validation of the public security-headers nginx config. No server, no deploy.
# Asserts the 5 baseline headers plus the Phase-7K Content-Security-Policy-Report-Only,
# and that NO enforcing Content-Security-Policy is set (this phase is Report-Only only).
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
CONF="nginx/conf.d/00-security-headers.conf"
fail() { echo "FAIL: $*" >&2; exit 1; }
[ -f "$CONF" ] || fail "$CONF missing"

echo "== required response headers present =="
for h in \
  "Strict-Transport-Security" \
  "X-Content-Type-Options" \
  "X-Frame-Options" \
  "Referrer-Policy" \
  "Permissions-Policy" \
  "Content-Security-Policy-Report-Only"; do
  grep -qE "add_header[[:space:]]+$h" "$CONF" || fail "missing header: $h"
  echo "  $h ✅"
done

echo "== CSP is Report-Only (observation), never enforcing this phase =="
# An enforcing header is `add_header Content-Security-Policy "..."` (name followed by
# a space or quote). The Report-Only name is followed by '-', so it does not match.
if grep -qE 'add_header[[:space:]]+Content-Security-Policy["[:space:]]' "$CONF"; then
  fail "an ENFORCING Content-Security-Policy is set — this phase is Report-Only only"
fi
echo "  Report-Only only ✅"

echo "== no fabricated CSP report endpoint =="
if grep -qiE 'report-uri|report-to' "$CONF"; then
  fail "a CSP report endpoint is configured — none should be (no fake endpoint)"
fi
echo "  no report endpoint ✅"

echo "ALL SECURITY-HEADER CHECKS PASSED ✅"
