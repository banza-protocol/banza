# ADR-017 — Wallet/account merchant payments and refund source model

**Status:** Accepted  
**Date:** 2026-06-18  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None  
**Extends:** ADR-010 (Wallet/account identity), ADR-009 (Provider abstraction)  
**See also:** ADR-006 (Double-entry ledger), ADR-012 (QR payment system), ADR-007 (Double-entry invariant enforcement)

---

## Context

BANZA recognises two distinct ways real value moves into a merchant's balance:

1. **Acquiring payments** — value enters from an external rail (card, bank, or
   another licensed provider; see ADR-009). The payer may be external and may not
   hold a wallet/account in an operator's implementation. These are represented as a typed acquiring payment /
   transaction object.

2. **Wallet/account payments** — a wallet/account holder pays a merchant from their
   own wallet/account (e.g. by scanning a merchant QR; see ADR-012) in an operator
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
- environment (`LIVE` | `SANDBOX`; see ADR-030)
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

Refund postings remain balanced double-entry (ADR-006, ADR-007) — no money is
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
  (provider-agnostic; see ADR-009 — never assumes a specific rail)
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
- The model is provider-agnostic for acquiring restitution (ADR-009): no specific
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
