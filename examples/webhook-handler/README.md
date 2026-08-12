# Example — Webhook Handler (conceptual)

Illustrative only. Normative: [`contracts/webhooks/`](../../contracts/webhooks/),
[`contracts/events/`](../../contracts/events/).

## Flow

1. **Operator emits a signed event** (e.g. payment completed) to a registered
   webhook endpoint. The envelope follows
   `contracts/events/envelope.schema.json`; the signature follows
   `contracts/webhooks/signature.json`.
2. **Receiver verifies the signature** before trusting the payload — an
   unverified webhook is discarded.
3. **Receiver processes idempotently.** The same event id must not be applied
   twice (`INV-IDEM-001`).
4. **`trace_id` is preserved** end to end (`INV-TRACE-001`) so the event can be
   reconciled against the originating flow.

## Invariants exercised

`INV-IDEM-001` · `INV-TRACE-001` · `INV-RECON-*`.
