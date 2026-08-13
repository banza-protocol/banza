# ADR-016 — QR payments

The protocol must define a contactless payment mechanism for in-person and remote consumer-to-consumer payments that operators implement. The two canonical patterns in mobile payments are:

1. **Static QR** — a fixed code tied to a wallet owner; payer enters the amount at scan time.
2. **Dynamic QR** — a code generated for a specific payment request; amount is embedded and code expires.

Angola's market has a mix of use cases:
- Point-of-sale: merchant/individual displays a static QR on their phone or a printed card; customer scans and types the amount.
- Invoice payment: the payee generates a QR with a fixed amount for a specific transaction; the payer scans and confirms without typing.

Both patterns must coexist. Choosing one exclusively degrades the other use case significantly.

---

## Decision

**Implement both QR types in a single `qr_codes` domain with a shared scan flow.**

**Static QR:**
- Generated once per wallet owner; idempotent (`create_static_qr` always returns the same record for a given `owner_id`).
- No amount embedded — the scanning client collects the amount from the user.
- No expiry — persists indefinitely unless the owner is deactivated.
- Payload: `banza://pay/{owner_id}?type=static`

**Dynamic QR:**
- Generated per-request with `amount_minor`, optional `reference`, and mandatory `expires_at`.
- Single-use: marked `USED` atomically with the transfer creation.
- Expires automatically via a periodic expiry process once `expires_at` has passed.
- Payload: `banza://pay/{qr_code_id}?type=dynamic`

**Expiry process:**
An operator runs a periodic expiry process at a configurable interval (default 60 s) that marks every `ACTIVE` code with a non-null `expires_at` in the past as `EXPIRED`. The interval must skip missed ticks rather than replaying them in a burst after a slow cycle.

**Scan flow (client-side FSM):**
```
scanning → resolving → confirm → [success callback]
                     ↘ error  → retry or cancel
```
For dynamic QR, the gateway fetches the `qr_codes` record after decoding; the amount is displayed and the payer only taps confirm. For static QR, an amount input widget is presented before confirmation. Atomicity: for dynamic QR, the code is marked `USED` immediately after a successful transfer.

---

## Alternatives Considered

**Single type (dynamic-only):** Requires every recipient to generate a new QR for every payment — impractical for informal/street commerce where printing a static code on a card is the norm.

**Single type (static-only):** Cannot encode amounts; unsuitable for invoice and e-commerce flows where the payer must confirm an exact figure.

**External QR generation service:** Adds a third-party dependency, complicates audit trails, and adds latency. An operator generates QR payloads in-house, client-side, from the server-issued payload string.

---

## Consequences

- The `qr_codes` table carries both types; queries filter by `type` where necessary.
- `create_static_qr` is idempotent via `INSERT ... ON CONFLICT (owner_id) DO UPDATE` so repeated calls from a new device return the same QR.
- The scan FSM adds one DB round-trip for dynamic QR (fetch record) before the transfer. Acceptable latency for a human-confirmed flow.
- The expiry process is not a hard real-time guarantee — a dynamic QR may remain scannable for up to one expiry interval after its `expires_at`. Clients must validate `expires_at` in the confirm step as a second check.
