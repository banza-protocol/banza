# ADR-010 — Account/Participant Identity Model (Account-Based, Not Card-First)

**Status:** Accepted  
**Date:** 2026-05-18  
**Supersedes:** None  
**Extends:** [ADR-012](ADR-012-qr-payment-system.md), [ADR-013](ADR-013-payment-links.md)

---

## Context

As the BANZA protocol's model matured — double-entry ledger, account model, QR payment system, payment links, deposits, @handle identity — a question of fundamental identity emerged for the **protocol**:

**What account and payment model should the BANZA protocol define for operator implementations?**

Concretely: should the protocol be shaped around cards (tokenization, card-entry, card-checkout) or around participant accounts addressable by QR and @handle?

Without a clear answer, implementations would drift toward the global default — the card-processor (Stripe) model — because it is the most documented, most imitated pattern in developer tooling. For the markets BANZA targets, that drift would be a structural misalignment.

Angola and similar markets are **not card-first economies**. The dominant transaction models are:

* Mobile money (M-Pesa, Orange Money, Airtel Money)
* Bank transfer via national rails (EMIS, Multicaixa Express)
* QR-based instant payment (growing, modeled on Pix, WeChat Pay, UPI)
* Cash — still large in absolute volume

Card ownership is low, contactless terminal density is low, and card fraud risk relative to transaction volume is high. The participants and merchants these operators serve need **account-to-account instant transfers** addressable by QR code or @handle — the model built by WhatsApp Pay, M-Pesa, WeChat Pay and Pix, not the card-first model.

BANZA is a **protocol**: it does not operate accounts, wallets or balances, does not authorize or complete payments, and does not itself move, hold or settle funds. This ADR fixes what the protocol *defines* for the operator implementations that do.

---

## Decision

**BANZA defines a protocol-level account and participant identity model that can be implemented by operators or applications using wallets, accounts, balances or equivalent account systems. BANZA itself is not a wallet, does not operate user accounts, does not authorize payments, does not complete payments and does not move, hold or settle funds.** The model the protocol defines is **account-based, wallet/account-compatible and QR/@handle-addressable, not card-first**: the canonical payment operation is a ledger transfer between two participant accounts in an operator implementation, not a card transaction.

### What this means, precisely (for an operator implementation of the protocol):

1. **The canonical payment operation is a ledger transfer between two participant accounts.**
   - Consumer account → Merchant account (payment)
   - Consumer account → Consumer account (transfer)
   - Merchant account → Consumer account (refund)
   - All other flows derive from this primitive.

2. **QR codes are the primary payment initiation mechanism.**
   - Every merchant payment surface exposes a QR code.
   - The QR payload encodes an account reference + optional amount + optional description.
   - Consumer scans → confirms → ledger transfer. No card data involved.

3. **@handles are the primary human-readable identity layer.**
   - `@shop.example.ao` is a payment address.
   - `@consumer_handle` is a transfer address.
   - Handles resolve to account identifiers internally.

4. **Cards (Visa/Mastercard) are funding rails only — never the core network.**
   - Cards are a mechanism for topping up a participant account from an external card account.
   - Once value lands in the account, the card is irrelevant to any subsequent payment.
   - Card credentials NEVER transit the core payment path.
   - Card tokenization, CVV handling and PCI DSS scope are isolated to a funding module, not the core model.

5. **Local rails are first-class integrations (e.g., EMIS, Multicaixa Express).**
   - These are the interoperability bridges to the national banking system.
   - Deposits via national rails → account credit.
   - Payouts via national rails → bank account.

---

## Rationale

### Why an account-based model (not card-first)?

In an operator implementation of the protocol, the participant account is the single account primitive. Every identity — consumer, merchant, operator — is represented by an account/wallet. The ledger tracks every debit and credit on every account immutably. Account-to-account transfer is the atomic operation from which every product feature (payment, transfer, refund, payout, settlement) is composed — in the operator's implementation, not in BANZA.

Defining the protocol this way means:

* **No card rails in the critical path.** Card networks add latency (authorization round-trip), cost (interchange fees), chargebacks and fraud surface. Keeping cards out of the payment flow makes an operator's core path faster, cheaper and more controlled.
* **Instant settlement by default.** When both sender and receiver are accounts in the same operator implementation, settlement is a ledger write — milliseconds, not T+2. This is structurally impossible for card networks.
* **Full auditability.** Every unit of value in an implementation exists in a ledger account. There is no card "authorization hold" ambiguity; the state is deterministic.
* **Market fit.** These markets are served by QR- and account-based money movement, not by replicating a card stack built for Western markets.

### Why explicitly rule out a card-first model?

Without an explicit constraint, implementers default to familiar patterns. The card-processor API is the most documented payment API in the world; left unconstrained, features drift toward card-shaped endpoints, data models and checkout UX.

Ruling this out explicitly forces every protocol and implementation decision to be evaluated against the account-based model. This is not anti-card; it is anti-drift.

---

## Alternatives Considered

### 1. Hybrid model: account-based for local, card for international

**Rejected.** This would split implementations into two incompatible mental models with no near-term benefit. International card acceptance is a later concern; the core model must be coherent first.

### 2. Card-first with accounts as an abstraction layer

**Rejected.** This is the card-processor model. It optimizes for Western card infrastructure and does not fit the target markets, populations or regulatory environment.

### 3. No explicit constraint — let implementations evolve

**Rejected.** Without constraint, architecture drifts. A protocol exists to prevent drift at decision points. This identity decision is encoded as a constraint, not a preference.

---

## Consequences

### Positive

* Implementers have a clear model for evaluating new features.
* Contracts and documentation converge on a coherent model (QR, accounts, @handles).
* An operator's core payment path stays card-free: no PCI DSS scope on the critical path.
* The protocol's differentiation is clear: an account-based instant-payment model, not a card gateway.

### Negative / Tradeoffs

* Merchants accustomed to card-first checkout need education (an operator concern).
* International card acceptance requires a card funding rail to be added later — deferred, operator-side.
* PCI DSS compliance is deferred (not eliminated — a future card funding module will require it, in the operator).

### Mitigations

* Clear onboarding materials explaining QR-first commerce (operator-side).
* A documented path for a card funding module as a funding rail (not a payment rail).
* Contracts that make QR/account flows the easiest path for integrations.

---

## Implementation Scope

This ADR does not introduce code. It:

1. Fixes the account/participant identity model as a protocol constraint.
2. Requires future ADRs, contracts and documentation to be evaluated against it.
3. Establishes the following priority order for the protocol surface:
   - **Tier 1:** QR payment generation, payment links, account transfer, @handle resolution, payment requests
   - **Tier 2:** Webhooks, refunds, disputes, merchant profiles
   - **Tier 3:** Settlement, payouts, reconciliation
   - **Future only:** Card funding, international rails

---

## References

* [ADR-012 — QR Payment System](ADR-012-qr-payment-system.md)
* [ADR-013 — Payment Links](ADR-013-payment-links.md)
* Pix (Brazil Central Bank) — architecture reference
* UPI (NPCI India) — architecture reference
* M-Pesa — market reference
* WeChat Pay — UX reference
