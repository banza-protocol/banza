# ADR-018 — Merchant-facing refundable-source reference on paid payment events

**Status:** DRAFT / PROPOSED / NOT NORMATIVE / NOT SUBMITTED
**Date:** 2026-07-04
**Author:** BANZA Protocol
**Deciders:** BANZA Protocol governance (pending) — this draft decides nothing
**Supersedes:** None
**Relates to:** ADR-017 (Typed refund sources), ADR-015 (Payment Session interfaces), ADR-023 (Proof state after partial restitution)

> ⚠️ **This is an uncommitted DRAFT prepared by the reference operator for discussion.**
> It is **NOT** a BANZA protocol requirement, **NOT** approved, and **NOT** submitted
> through governance. It does **NOT** assume the field described here is protocol-normative.
> The reference operator has shipped the equivalent capability as a **backward-compatible operator
> extension**; this ADR asks whether BANZA should standardise it. Until governance
> decides, nothing here binds any operator.

---

## 1. Context & problem statement

A merchant that accepted a payment through a **Payment Link** or **Payment Session**
and later needs to issue a merchant-authorized refund (restitution) has **no
protocol-defined way to learn which typed source to refund.**

ADR-017 made refunds operate on an **explicit typed source**:
`source_type ∈ {ACQUIRING_PAYMENT, WALLET_PAYMENT}` plus `source_id`. But the
payment objects and paid events a merchant can observe expose only
`payment_session_id` / `payment_link_id` — initiation handles, not refund sources.
The merchant therefore cannot construct a valid refund request from anything the
protocol currently returns.

**Concrete instance.** A donation operator-consumer takes wallet/account
donations through Payment Sessions, stores the `payment_session_id`, and cannot
refund because that id is not an `ACQUIRING_PAYMENT` / `WALLET_PAYMENT` `source_id`.

## 2. Why Payment Session / Payment Link IDs are NOT financial refund sources

- A session/link is an **intent-to-pay container**. It carries no value, may be
  presented through several interfaces (link, deep link, dynamic/static QR), and
  is not itself a settled financial object.
- The refundable object is the **settled acquiring payment or wallet payment**
  produced when the session/link is paid. Its identifier is a distinct, typed
  source with its own captured amount.
- Refunds are **cumulative and capped against the source's captured amount**, not
  the session's. Mapping session → source is a server-side fact a merchant cannot
  derive from the handle.

Conflating the two would let a merchant "refund a session", which has no
well-defined financial meaning.

## 3. Proposed merchant-authorized `refund_source`

After a payment reaches a confirmed/paid terminal state, expose an **additive,
merchant-authorized** reference on the payment object and paid event:

```json
{
  "refund_source": {
    "source_type": "ACQUIRING_PAYMENT" | "WALLET_PAYMENT",
    "source_id": "<opaque, merchant-scoped>"
  }
}
```

- Present **only after** the payment is confirmed/paid; absent before.
- Visible **only to the owning merchant** (authenticated principal whose
  `merchant_id` matches the payment). Never on unauthenticated public pay pages;
  never to the payer.
- Delivered on paid events **only** to that merchant's own signed webhook
  subscription.
- The `source_id` MUST be directly acceptable by the public typed-source Refunds
  endpoint.

## 4. Source vocabulary

- Values MUST be the public vocabulary `ACQUIRING_PAYMENT` / `WALLET_PAYMENT`.
- The internal Core token `TRANSACTION` MUST NOT appear in any merchant-facing
  field, request, or response.

## 5. Privacy, opacity & enumeration requirements

- `source_id` MUST be **non-enumerable** (e.g. a random UUID or an opaque
  merchant-scoped reference). It MUST reveal no payer identity, wallet id, ledger
  account, balance, Core route, or internal database structure.
- Cross-tenant lookups MUST remain **indistinguishable from not-found** (a merchant
  probing another merchant's session/link learns nothing — consistent with the
  Refunds endpoint's indistinguishable-404).
- Two safe realisations exist; either satisfies this ADR:
  - **(a)** expose the underlying source id **iff** it is already a random,
    merchant-scoped, non-enumerable value that the Refunds endpoint accepts (so
    returning it to its owner is a round-trip of an already-public-by-contract
    value, not disclosure of a new internal id); or
  - **(b)** expose a merchant-bound **opaque** reference that the Refunds Gateway
    resolves server-side to the underlying source.

## 6. Webhook vs authenticated GET exposure

Expose `refund_source` on **both**:
- the **authenticated** merchant GET of the payment session / payment link, and
- the **paid webhook** payload (`*.paid`),

so the poll path and the webhook path converge (a merchant may use either). The
public/unauthenticated pay-page view MUST NOT include it.

## 7. Backward compatibility

Additive, optional field. Absence means "no refundable source available yet"
(e.g. unpaid). No existing consumer breaks; SDKs surface it as an optional field.

## 8. Relation to ADR-017 and the TRANSACTION vs ACQUIRING_PAYMENT question

ADR-017 currently treats `ACQUIRING_PAYMENT` as the **public alias** of the Core
`TRANSACTION` (a bounded compatibility token). This ADR does **not** resolve that
naming; it only requires that whatever reaches merchants uses the **public** term.
Governance should separately decide whether `ACQUIRING_PAYMENT` becomes the single
normative name and `TRANSACTION` is retired from all contracts.

## 9. Normative-protocol vs operator-extension — the actual decision

Two mutually exclusive paths; this ADR asks governance to choose:

- **(A) Protocol-normative** — `refund_source` becomes part of the canonical
  paid-event / payment-object contract for all BANZA operators, with conformance
  coverage. Pro: interoperable merchant refunds across operators. Con: broader
  surface to standardise + certify.
- **(B) Operator extension** — BANZA declines to standardise; each operator (e.g.
  Operator A) adds a backward-compatible operator-specific field, documented as
  operator-scoped. Pro: ships now, no protocol change. Con: risk of divergence
  between operators; not portable.

**Current reality:** The reference operator has implemented path (B) as a backward-compatible
operator extension (documented as non-normative). This ADR raises whether (A) is
warranted.

## 10. Non-goals

- **Not** a refund-by-idempotency-key lookup endpoint.
- **No** change to how refunds are posted, capped, or how proof state transitions
  (ADR-023 unchanged: a source proof stays CONFIRMED after a partial restitution
  and becomes REVERSED only when cumulative restitution equals the captured amount).
- **No** exposure of payer identity or any Core-internal id.
- **No** claim that the field is protocol-normative until governance decides.

## 11. Open governance questions

1. Standardise (A) or leave as operator extension (B)?
2. Opaque merchant-scoped reference vs the raw (random, merchant-scoped) source id?
3. Interaction with disputes, which today reference `transaction_id`?
4. If normative, what conformance/certification coverage is required?
5. Resolve the ADR-017 `TRANSACTION` vs `ACQUIRING_PAYMENT` terminology?
