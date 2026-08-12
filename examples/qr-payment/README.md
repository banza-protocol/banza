# Example — QR Payment (conceptual)

Illustrative only. Normative: [`contracts/qr/`](../../contracts/qr/),
[`contracts/openapi/`](../../contracts/openapi/).

## Flow

1. **Merchant creates a QR.** A static QR encodes a merchant wallet; a dynamic
   QR (`POST /qr/dynamic`) encodes a single-use, fixed-amount payment and
   carries a `trace_id` (`INV-TRACE-001`).
2. **Consumer scans and confirms.** The consumer's operator resolves the QR
   payload (`contracts/qr/payload-format.json`) and presents the amount.
3. **Operator executes the transfer.** A ledger posting debits the consumer
   wallet and credits the merchant (and fee) wallet. `gross = net + fee`
   (`INV-STL-001`); the posting sums to zero (`INV-LEDGER-001`); amounts are
   integer minor units (`INV-LEDGER-003`).
4. **Idempotency.** The create call carries an `idempotency_key`
   (`INV-IDEM-001`); a replay returns the same result, never a second posting.

## Invariants exercised

`INV-LEDGER-001` · `INV-LEDGER-003` · `INV-STL-001` · `INV-IDEM-001` ·
`INV-TRACE-001` · `INV-QR-*` (unique resolution, single-use dynamic, expiry).

Conformance vectors: see [`conformance/`](../../conformance/).
