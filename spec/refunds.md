# Refunds — the typed refund source

- **Status:** Normative
- **Protocol version:** 1.0.0
- **Why this exists:** [ADR-018](../decisions/adr/ADR-018-wallet-payments-and-the-refund-source-model.md)

No v1.0.0 conformance profile requires refunds. An implementation that does not offer them is unaffected
by this document. An implementation that **does** offer them MUST follow the rules below, because a refund
addresses a settled financial object and getting that reference wrong is how money is refunded twice.

---

## 1. A refund references a typed source

A refund MUST reference a **typed source**:

```
{ "source_type": "ACQUIRING_PAYMENT" | "WALLET_PAYMENT", "source_id": "<opaque>" }
```

`source_type` MUST be one of exactly those two values. An implementation MUST NOT accept a generic
transfer identifier as a refund source, and MUST NOT accept a payment-session or payment-link identifier:
a session is an intent container that carries no value and may be presented through several interfaces,
so "refund the session" has no well-defined financial meaning. The refundable object is the settled
payment the session produced, which has its own captured amount.

## 2. Cumulative refunds are capped at the source

The sum of refunds against a source MUST NOT exceed that source's captured amount, aggregated by
`(source_type, source_id)`. The cap is a property of the source, never of the session, link or intent
that produced it.

## 3. Idempotency is scoped to the source

Refund idempotency (`INV-IDEM-001`, [`spec/idempotency.md`](idempotency.md)) is scoped to the refund
source. The same idempotency key against the same source is the same refund; the same key against a
different source is a different operation.

## 4. The source reference is opaque and merchant-scoped

`source_id` MUST be non-enumerable — a random or opaque merchant-scoped reference — and MUST reveal no
payer identity, wallet id, ledger account, balance or internal structure. It is exposed only to the
authenticated principal that owns the payment, only after the payment reaches a confirmed terminal state,
and never on an unauthenticated page or to the payer.

A lookup for a source belonging to another principal MUST be indistinguishable from not-found. Returning
a distinguishable error would turn the endpoint into an enumeration oracle.

## 5. Disputes use the same model

A dispute MUST reference the same typed source under the same rules, and restitution MUST post through
the same source-aware path. See [`spec/disputes.md`](disputes.md).

---

## Where this is enforced

The rules above are the requirement. `contracts/invariants.json` carries the ledger, wallet and
idempotency invariants a refund posting must also satisfy; nothing in this document weakens them. A
refund is an ordinary ledger movement and obeys `INV-LEDGER-*` and `INV-WALLET-*` in full.
