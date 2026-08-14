#!/usr/bin/env bash
#
# M2.19G.1 (ADR-038 §31) — JourneyReceipt origin-fields schema guard (§37, invariant 22).
#
# The §31 JourneyReceipt binds the aggregate result to the inputs' origins: it carries the per-step
# receipts (endpoints-consulted + hashes live inside steps[]), the aggregate protocol_fetch_count, the
# canonical origin/host, the readiness/status distinction and the audit fields. Both the TS contract
# (ServerJourneyReceipt) and the server builder (validate.js journey_receipt) must declare them.
#
# Exit 1 on any missing field. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

RECEIPT=website/lib/operationReceipt.ts
VALIDATE=services/banzai-api/src/validate.js

# §31 JourneyReceipt field set. steps[] carries the endpoints-consulted + per-step hashes.
FIELDS="receipt_version journey_id request_id workflow operator_id implementation_id environment profile protocol_version canonical_origin resolved_host started_at finished_at duration_ms step_count steps overall_status certification_readiness certification_status certified reason_codes qwen_calls external_model_calls protocol_fetch_count audit_ref"

echo "== banzai-journey-receipt-origin-check (M2.19G.1 / ADR-038 §31) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '  protocol_fetch_count: number;' | grep -qE '^[[:space:]]*protocol_fetch_count[:,]' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. TS interface.
if [ -f "$RECEIPT" ]; then
  iface=$(awk '/interface ServerJourneyReceipt/{c=1} c{print} c&&/^}/{exit}' "$RECEIPT")
  miss=""
  for k in $FIELDS; do printf '%s\n' "$iface" | grep -qE "^[[:space:]]*$k[:?]" || miss="$miss $k"; done
  [ -z "$miss" ] && ok "ServerJourneyReceipt declares all §31 fields" || fl "ServerJourneyReceipt missing §31 field(s):$miss"
  # steps[] are the per-step receipts that carry endpoints + hashes.
  printf '%s\n' "$iface" | grep -qE 'steps:[[:space:]]*ServerOperationReceipt\[\]' \
    && ok "steps[] are ServerOperationReceipt (endpoints-consulted + hashes)" \
    || fl "ServerJourneyReceipt.steps must be ServerOperationReceipt[]"
else
  fl "$RECEIPT not found"
fi

# 2. Server builder (the journey_receipt object literal).
if [ -f "$VALIDATE" ]; then
  # ADR-042: the journey receipt is built as `const journeyReceipt = { … }` (so it can be persisted via
  # the durable receipt store) and returned as `journey_receipt: journeyReceipt`. Extract that block;
  # fall back to the older inline `journey_receipt: { … }` literal for backward compatibility.
  body=$(awk '/const journeyReceipt = \{/{c=1} c{print} c&&/^    \};/{exit}' "$VALIDATE")
  [ -n "$body" ] || body=$(awk '/journey_receipt: \{/{c=1} c{print} c&&/^      \},/{exit}' "$VALIDATE")
  miss=""
  for k in $FIELDS; do printf '%s\n' "$body" | grep -qE "^[[:space:]]*$k[:,]" || miss="$miss $k"; done
  [ -z "$miss" ] && ok "journey_receipt populates all §31 fields" || fl "journey_receipt missing §31 field(s):$miss"
  # protocol_fetch_count is aggregated (not external_model_calls).
  grep -qE 'protocol_fetch_count: protocolFetchCount' "$VALIDATE" && ok "protocol_fetch_count aggregated across steps" || fl "$VALIDATE must aggregate protocol_fetch_count"
else
  fl "$VALIDATE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-journey-receipt-origin-check: FAIL"; exit 1; fi
echo "banzai-journey-receipt-origin-check: ✓ JourneyReceipt carries all §31 fields incl. endpoints/hashes/protocol_fetch_count"
