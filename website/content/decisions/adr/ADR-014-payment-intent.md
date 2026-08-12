# ADR-014 — Payment Intent: the canonical payment-initiation primitive

**Status:** Accepted  
**Date:** 2026-06-28  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None  
**Extends:** ADR-012 (QR payment system), ADR-013 (Payment Links), ADR-017 (Wallet/account payments & refund source)  
**See also:** ADR-005 (Protocol-first), ADR-016 (Payment Collections), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

BANZA already specifies three ways a payee asks to be paid: **Payment Links**
(ADR-013), **QR codes** (ADR-012), and **Payment Requests** (`payment_request`
aggregate). Each is a distinct surface, but they share one underlying meaning: *an
intent to receive a specific (or open) amount, which — when fulfilled by a real
payer — produces a Transfer that posts to the Ledger.*

Until now there was no **named** concept for that shared meaning. ADR-016
(Collections) needs to reference "the payment-initiation artifact a share points
to" without re-inventing one per surface, and without binding Collections to a
single concrete surface. Introducing that named concept *before* Collections is
the protocol-first sequencing the founder selected (ADR-005): the primitive is
ratified first, then Collections consumes it.

## Decision

Introduce **PaymentIntent** as the canonical payment-initiation primitive. A
PaymentIntent is an *intent to receive value into a payee wallet*. Payment Links,
QR codes, and Payment Requests are **surfaces (realizations)** of a PaymentIntent
— the concrete way the intent is presented to a payer. Fulfilment of any surface
settles the same PaymentIntent.

**A PaymentIntent never holds or moves money.** It coordinates initiation only.
Value moves exactly once, when the intent is fulfilled, through the existing path:

```
PaymentIntent  →  Transfer  →  Ledger
```

The Ledger has no knowledge of PaymentIntent (or of any surface). This keeps the
ledger primitive untouched (ADR-017, double-entry invariants).

### Model

**PaymentIntent** (aggregate root)
- `id`
- `operator_id`
- `payee_wallet_id` (and `merchant_id?` when the payee is a merchant)
- `amount_minor` (`null` for open-amount intents), `currency` (ISO 4217, integer minor units)
- `surface`: `LINK | QR | REQUEST` (which realization presents it) — extensible
- `surface_ref`: the concrete artifact id (payment-link slug, qr_id, pr_id)
- `status`: see lifecycle
- `transfer_id?` (the Transfer that fulfilled it — reconciliation anchor)
- `idempotency_key`, `expires_at?`, `metadata`, `version`
- `created_at`, `updated_at`

### Lifecycle

```
CREATED ──(surfaced as link/qr/request)──▶ REQUESTED ──(real payer pays)──▶ PAID
   │                                            │
   └──────────────(expiry)──────────────────────┴──▶ EXPIRED
   └──────────────(cancel)──────────────────────┴──▶ CANCELLED
                                                 └──▶ FAILED  (terminal error)
```
A PaymentIntent reaches `PAID` **only** on a real, confirmed settling Transfer —
never optimistically, never simulated.

### Events (added to `contracts/events/types.json`)

- `payment_intent.created`
- `payment_intent.requested`
- `payment_intent.paid` (carries `payment_intent_id`, `transfer_id`, `amount_minor`)
- `payment_intent.expired` / `payment_intent.cancelled` / `payment_intent.failed`

The resulting Transfer's `causation_id` MUST equal the `payment_intent_id`
(mirrors the `payment_request.paid` rule, INV-TRACE-001).

### Backward compatibility

- Existing Payment Links / QR / Payment Requests are **surfaces** of a
  PaymentIntent. Their existing contracts, events (`qr.paid`, `payment_request.paid`)
  and vectors are unchanged; PaymentIntent is the unifying concept above them.
- No existing contract is broken. Operators MAY expose PaymentIntent directly
  (`supports_payment_intents`) and/or continue exposing the concrete surfaces.

### Certification

`supports_payment_intents` is a Level-2 capability (it generalizes Level-1
surfaces and underpins Collections). Not required for L0/L1.

## Consequences

- Collections (ADR-016) references a share's settlement via `payment_intent_id`,
  with no new per-surface invention and no coupling to one concrete surface.
- Future initiation surfaces (e.g. NFC, recurring) realize PaymentIntent without a
  new top-level concept.
- The ledger and Transfer primitives are untouched; PaymentIntent lives entirely
  in the initiation domain.

### Forbidden / Permitted (per ADR-005)

- **Forbidden:** an operator/SDK/app inventing initiation objects/fields/events
  outside this contract; a PaymentIntent that holds a balance or posts to the
  ledger.
- **Permitted:** operators implementing PaymentIntent + its surfaces; SDKs
  exposing it; apps consuming it for UX.

## Open questions (non-blocking)

- Recurring / mandate intents (out of scope for v1).
- Multi-currency intents (out of scope; one currency per intent).
