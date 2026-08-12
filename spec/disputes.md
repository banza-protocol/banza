# Disputes

This document specifies the **minimum** protocol obligations for disputes. A dispute
is a claim, raised after a payment, that the payment was incorrect, unauthorized, or
not honoured. Disputes are distinct from refunds: a **refund** is a merchant-initiated
return of value (see ADR-017); a **dispute** is a claim whose resolution *may* result
in restitution.

> **Scope note.** This is a deliberately minimal, conservative specification. The
> richer dispute/chargeback model — evidence exchange protocol, representment,
> arbitration, cross-operator dispute routing, and time-bound liability shifts — is
> **deferred to a future ADR/RFC** and is intentionally not specified here. Operators
> MUST NOT assume any chargeback mechanics beyond what this document states.

## Lifecycle

A dispute follows a strict, minimal state machine:

```
OPENED → UNDER_REVIEW → ACCEPTED  → RESOLVED
                      → REJECTED  → RESOLVED
OPENED → CANCELLED
UNDER_REVIEW → EXPIRED
```

| State | Meaning |
|-------|---------|
| `OPENED` | A dispute has been raised against a specific payment. |
| `UNDER_REVIEW` | The dispute is being assessed (operator-defined process). |
| `ACCEPTED` | The dispute is upheld; restitution is owed. |
| `REJECTED` | The dispute is not upheld; no restitution. |
| `RESOLVED` | Terminal: the outcome (with or without restitution) is final. |
| `CANCELLED` | Terminal: withdrawn before review concluded; no accounting effect. |
| `EXPIRED` | Terminal: review window elapsed with no decision; no accounting effect. |

**Allowed transitions** are exactly those shown above. Any other transition MUST be
rejected. `RESOLVED`, `CANCELLED`, and `EXPIRED` are terminal.

## Normative obligations

1. **Bound to a typed payment source.** A dispute MUST reference a typed payment
   source — `ACQUIRING_PAYMENT` or `WALLET_PAYMENT` — exactly as refunds do
   (ADR-017 §2). A dispute MUST NOT reference a generic `TRANSFER`.
2. **Accounting effect only on resolution.** No ledger posting is made when a dispute
   is `OPENED` or `UNDER_REVIEW`. A balanced double-entry posting (ADR-006, ADR-007)
   is made **only** on a resolution that grants restitution (an `ACCEPTED` dispute).
   `REJECTED`, `CANCELLED`, and `EXPIRED` produce no posting.
3. **Source-aware restitution.** When restitution is granted, it follows the same
   source-aware model as refunds (ADR-017 §5): a wallet/account payment credits the
   original payer's wallet; an acquiring payment credits transit/restitution, with
   external-rail restitution handled as a separate, provider-agnostic step (ADR-009).
4. **Ceiling.** Total restitution (refunds + dispute restitutions) against a single
   payment MUST NOT exceed the original captured amount, aggregated by
   `(source_type, source_id)` (ADR-017 §4).
5. **Idempotency.** Dispute state transitions MUST be idempotent: re-applying a
   transition that already occurred is a no-op and MUST NOT create a duplicate
   posting (INV-IDEM-001).
6. **Traceability.** A dispute and any resulting restitution posting MUST carry a
   `trace_id` linking them to the original payment (INV-RECON-001).

## Events (minimum)

Where an implementation emits events, dispute state changes SHOULD be emitted as
conformant event envelopes (`contracts/events/`) carrying the dispute id, the
referenced `(source_type, source_id)`, the new state, and the `trace_id`. The exact
event type set is part of the deferred dispute RFC.

## Out of scope (deferred)

The following are explicitly **not** specified by this document and are reserved for a
future ADR/RFC: evidence submission/exchange format, representment and second
presentment, arbitration authority, cross-operator dispute routing and liability
assignment, time-bound liability shifts, and network-style chargeback reason codes.
