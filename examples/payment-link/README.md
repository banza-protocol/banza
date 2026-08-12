# Example — Payment Link (conceptual)

Illustrative only. Normative: [`contracts/openapi/`](../../contracts/openapi/).

## Flow

1. **Merchant creates a payment request** (`POST /payment-requests`) with an
   amount in minor units and an `idempotency_key`. The operator returns a
   shareable URL.
2. **Payer opens the link** and confirms in their own operator's app.
3. **Settlement** follows the same ledger rules as any transfer: a balanced,
   atomic, idempotent posting with a propagated `trace_id`.

A payment link is a discovery/initiation convenience — the money movement is an
ordinary protocol transfer. The link itself holds no funds.

## Invariants exercised

`INV-LEDGER-*` · `INV-STL-001` · `INV-IDEM-001` · `INV-TRACE-001`.
