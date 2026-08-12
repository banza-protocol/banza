# Example — Merchant Checkout (conceptual)

Illustrative only. Normative: [`contracts/openapi/`](../../contracts/openapi/).

## Flow

1. **Consumer initiates payment** to a merchant wallet (via QR, link, or
   handle).
2. **Operator verifies balance and idempotency**, then posts the transfer.
3. **Settlement is T+0** within a single operator; across operators it follows
   the federation flow (see [`spec/federation/`](../../spec/federation/)).
4. **Both parties are notified** via the event/webhook contracts; balances are
   always derived from the ledger (`INV-WALLET-001`), never written directly.

## What this example is not

It is not a checkout UI, not an SDK, and not a specific operator's product. It
describes the protocol-level sequence any operator implements.

## Invariants exercised

`INV-WALLET-001` · `INV-LEDGER-*` · `INV-STL-001` · `INV-IDEM-001` ·
`INV-TRACE-001` · `INV-RECON-*`.
