#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.8/§30) — fetch→receipt origin binding guard (§37, invariant 9).
#
# Each OperationReceipt binds the verdict to the EXACT origin of its inputs. The receipt builder in
# services/banzai-api/src/validate.js must populate: endpoint, resolved_host, fetched_at, http_status,
# content_type, input_hash and signature_status (plus the rest of the §30 origin set).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

VALIDATE=services/banzai-api/src/validate.js

echo "== banzai-fetch-receipt-binding-check (M2.19G.1 / ADR-034 §4.8/§30) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'function buildOperationReceipt(fields) {' | grep -q 'buildOperationReceipt' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -f "$VALIDATE" ] || { fl "$VALIDATE not found"; echo "banzai-fetch-receipt-binding-check: FAIL"; exit 1; }

grep -qE 'function buildOperationReceipt' "$VALIDATE" && ok "buildOperationReceipt present" || fl "$VALIDATE must define buildOperationReceipt"

# Isolate the buildOperationReceipt body so we assert the binding happens in the receipt itself.
body=$(awk '/function buildOperationReceipt/{c=1} c{print} c&&/^}/{n++} c&&n>=1&&/^}/{exit}' "$VALIDATE")

bind() { # field-key — matches both `key: value` and shorthand `key,` forms
  if printf '%s\n' "$body" | grep -qE "^[[:space:]]*$1[:,]"; then ok "receipt binds $1"; else fl "OperationReceipt must bind $1"; fi
}
bind "endpoint"
bind "resolved_host"
bind "fetched_at"
bind "http_status"
bind "content_type"
bind "content_length"
bind "etag"
bind "input_hash"
bind "signature_status"
bind "canonical_origin"
bind "engine_version"
bind "output_hash"
bind "protocol_fetch_count"

# The origin fields are sourced from the fetch response (primaryResp), not fabricated.
printf '%s\n' "$body" | grep -qE 'primaryResp|const p = primaryResp' \
  && ok "origin fields sourced from the fetch response (primaryResp)" \
  || fl "receipt origin fields must be sourced from the fetch response"

echo
if [ "$fail" -ne 0 ]; then echo "banzai-fetch-receipt-binding-check: FAIL"; exit 1; fi
echo "banzai-fetch-receipt-binding-check: ✓ each receipt binds endpoint/host/fetched_at/status/type/hash/signature (ADR-034 §4.8)"
