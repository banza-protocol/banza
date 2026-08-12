#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §30) — OperationReceipt origin-fields schema guard (§37, invariant 21).
#
# The §30 OperationReceipt schema carries the full origin field set. Both the TypeScript contract
# (website/lib/operationReceipt.ts ServerOperationReceipt) and the server builder
# (services/banzai-api/src/validate.js buildOperationReceipt) must declare EVERY §30 field.
#
# Exit 1 on any missing field. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

RECEIPT=website/lib/operationReceipt.ts
VALIDATE=services/banzai-api/src/validate.js

# §30 origin field set (endpoint of inputs bound to the verdict).
FIELDS="receipt_version operation_id request_id workflow step operator_id implementation_id environment profile protocol_version canonical_origin endpoint resolved_host fetched_at http_status content_type content_length etag last_modified input_hash signature_status engine engine_version result reason_codes evidence_refs output_hash duration_ms qwen_calls external_model_calls protocol_fetch_count audit_ref"

echo "== banzai-receipt-origin-fields-check (M2.19G.1 / ADR-068 §30) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '  resolved_host: string | null;' | grep -qE '^[[:space:]]*resolved_host[:,]' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The TS interface declares each field.
if [ -f "$RECEIPT" ]; then
  iface=$(awk '/interface ServerOperationReceipt/{c=1} c{print} c&&/^}/{exit}' "$RECEIPT")
  miss=""
  for k in $FIELDS; do printf '%s\n' "$iface" | grep -qE "^[[:space:]]*$k[:?]" || miss="$miss $k"; done
  [ -z "$miss" ] && ok "ServerOperationReceipt declares all §30 fields" || fl "ServerOperationReceipt missing §30 field(s):$miss"
else
  fl "$RECEIPT not found"
fi

# 2. The server builder populates each field.
if [ -f "$VALIDATE" ]; then
  body=$(awk '/function buildOperationReceipt/{c=1} c{print} c&&/^}/{exit}' "$VALIDATE")
  miss=""
  for k in $FIELDS; do printf '%s\n' "$body" | grep -qE "^[[:space:]]*$k[:,]" || miss="$miss $k"; done
  [ -z "$miss" ] && ok "buildOperationReceipt populates all §30 fields" || fl "buildOperationReceipt missing §30 field(s):$miss"
else
  fl "$VALIDATE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-receipt-origin-fields-check: FAIL"; exit 1; fi
echo "banzai-receipt-origin-fields-check: ✓ OperationReceipt carries all §30 origin fields"
