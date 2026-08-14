# ADR-020 — Wallet payments and the refund source model

BANZA recognises two distinct ways real value moves into a merchant's balance:

1. **Acquiring payments** — value enters from an external rail (card, bank, or
   another licensed provider; see ADR-013). The payer may be external and may not
   hold a wallet/account in an operator's implementation. These are represented as a typed acquiring payment /
   transaction object.

2. **Wallet/account payments** — a wallet/account holder pays a merchant from their
   own wallet/account (e.g. by scanning a merchant QR; see ADR-016) in an operator
   implementation. The payer is a first-class wallet/account holder.

A reference-operator audit (2026-06-18) found that wallet/account merchant
payments were being represented **only** as generic wallet-to-wallet **transfers**,
with no object distinguishing a merchant payment from a person-to-person (P2P)
transfer. This made safe refunds impossible:

- A generic transfer does not necessarily mean a merchant payment — the same table
  carries P2P movements.
- Refunding "an arbitrary transfer" risks reversing a P2P transfer that was never
  a merchant sale.
- Refund **authorization** requires knowing *which merchant* owns the payment;
  a generic transfer carries no merchant identity.
- Crediting the payer on refund requires knowing the *original payer wallet*.
- Cross-path refund **ceilings** (a payment may be refunded across several partial
  refunds) require a stable, typed payment source to aggregate against.
- Acquiring and wallet/account payments have **different refund destinations**
  (transit/restitution vs. the payer's wallet), so the refund engine must know the
  source type.

A generic transfer is therefore **not** a sufficient representation of a
refundable merchant payment. This is a protocol-level modelling rule, not an
operator implementation detail: it governs how any BANZA implementation must
represent payments and refunds. **BANZA defines the model; operators (including
the reference operator) implement it.**

---

## Decision

### 1. Wallet/account merchant payments are first-class payment objects

BANZA requires every wallet/account merchant payment to be represented by a
**first-class payment object, separate from generic transfers**. A generic
transfer alone MUST NOT be treated as a refundable merchant payment.

A wallet/account merchant payment object MUST reference:

- payment id
- the underlying transfer id (or ledger movement id) that settled it
- merchant id
- payer / consumer id
- amount (integer minor units)
- currency
- status
- trace id
- environment (`LIVE` | `SANDBOX`; see ADR-025)
- optional QR / payment-link reference

P2P transfers are **not** merchant payments and are not refundable as such.

### 2. Refunds reference a typed payment source

A refund MUST reference a **typed source**, never an arbitrary transfer:

```
source_type:
  - ACQUIRING_PAYMENT   (a.k.a. TRANSACTION)   — external-rail payment
  - WALLET_PAYMENT                              — wallet/account merchant payment

source_id:
  - id of the corresponding typed payment object
```

Using a generic `TRANSFER` as a refund source is **prohibited**.

### 3. Refund accounting by source

Refund postings remain balanced double-entry (ADR-011, ADR-011) — no money is
created, the original payment object is never mutated, and traceability is
preserved.

**Wallet/account merchant payment:**
```
DR merchant.available
CR consumer.available          (the original payer's wallet)
```

**Acquiring / external-rail payment:**
```
DR merchant.available
CR transit / refund account
→ restitution to the external rail is a separate, provider-specific step
  (provider-agnostic; see ADR-013 — never assumes a specific rail)
```

### 4. Ceilings and idempotency are scoped to the source

- Refund **ceiling** (sum of refunds ≤ original captured amount) MUST aggregate by
  `(source_type, source_id)`, so refunds against the same payment cannot exceed it
  regardless of how many partial refunds occur.
- Refund **idempotency** MUST be scoped to the refund source.

### 5. Dispute resolution is source-aware

Dispute resolution that issues restitution (e.g. a consumer-win chargeback) MUST
follow the same source-aware model: a wallet/account payment credits the payer's
wallet; an acquiring payment credits transit/restitution.

---

## Consequences

- P2P transfers are **not** refundable merchant payments by default.
- Merchant refunds require a typed merchant payment object to exist.
- Operators MUST NOT infer merchant payments from generic transfers unless a
  transfer is explicitly linked to a wallet payment object.
- **Historical transfers without merchant metadata cannot be safely backfilled**
  unless additional evidence exists; wallet/account refunds apply only to payments
  created after the payment object exists.
- Refund ceilings aggregate by typed payment source.
- Idempotency is scoped to the refund source.
- Dispute resolution follows the same source-aware model.
- The model is provider-agnostic for acquiring restitution (ADR-013): no specific
  external rail (EMIS, partner bank, etc.) is assumed.

---

## Alternatives considered

1. **Refund directly against generic transfers.**
   *Rejected* — transfers include P2P movements and carry no merchant-payment
   semantics, so refunds could accidentally reverse P2P transfers and could not be
   authorized to a merchant.

2. **Add merchant metadata directly to the transfers table.**
   *Possible but weaker* — it mixes transfer mechanics with payment-product
   semantics and leaves "is this a merchant payment?" as an overloaded column on a
   shared table. Acceptable as a constrained operator shortcut, but not the
   protocol model.

3. **Introduce a first-class wallet payment object.**
   *Accepted* — preserves semantic clarity, refund safety, authorization,
   auditability, and future extensibility, and mirrors how acquiring payments are
   already modelled as typed objects.

---

## Operator implementation note (non-normative)

A reference operator should later implement this ADR by:

- introducing a `wallet_payments` object/table written atomically in the
  QR / wallet/account payment transaction, linking `transfer_id`, `merchant_id`,
  `consumer_id`, optional `qr_code_id`, amount, currency, status, trace id, and
  environment;
- extending `refunds` to carry `source_type` (`ACQUIRING_PAYMENT` |
  `WALLET_PAYMENT`) + `source_id`, with the over-refund ceiling aggregating by
  source;
- keeping acquiring refunds as `merchant.available DR → transit CR`.

This implementation is **not** part of this ADR. It is tracked separately as
out-of-protocol implementation evidence in the relevant operator's own validation
matrix (non-normative; operator-internal identifiers are not part of this
specification). No operator code, migration, or validation status changes
accompany this ADR.

---

## Erratum — 2026-07

This ADR previously used wallet-native wording ("a BANZA wallet holder") that could
be read as implying that BANZA provides or operates wallets. For the BANZA v1.0
protocol boundary this is clarified: **BANZA is not a wallet, does not custody funds,
does not move funds and does not settle refunds.** The payment and refund behaviour
described here is protocol-level modelling for operator or application
implementations, not an operational action performed by BANZA itself. BANZA defines
the model; operators implement it. The ADR status, date and number are unchanged.

---

## Merchant-facing refundable-source reference on paid payment events

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

ADR-020 made refunds operate on an **explicit typed source**:
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

## 8. Relation to ADR-020 and the TRANSACTION vs ACQUIRING_PAYMENT question

ADR-020 currently treats `ACQUIRING_PAYMENT` as the **public alias** of the Core
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
  (ADR-022 unchanged: a source proof stays CONFIRMED after a partial restitution
  and becomes REVERSED only when cumulative restitution equals the captured amount).
- **No** exposure of payer identity or any Core-internal id.
- **No** claim that the field is protocol-normative until governance decides.

## 11. Open governance questions

1. Standardise (A) or leave as operator extension (B)?
2. Opaque merchant-scoped reference vs the raw (random, merchant-scoped) source id?
3. Interaction with disputes, which today reference `transaction_id`?
4. If normative, what conformance/certification coverage is required?
5. Resolve the ADR-020 `TRANSACTION` vs `ACQUIRING_PAYMENT` terminology?
