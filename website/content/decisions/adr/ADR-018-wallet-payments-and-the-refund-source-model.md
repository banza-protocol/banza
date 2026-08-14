# ADR-018 — Wallet payments and the refund source model

## Context

Two things a merchant does routinely turn out to depend on the same question. A merchant accepts a
payment from a customer's wallet, and later needs to refund it. To refund it, something must identify
*what is being refunded*.

The available identifiers are misleading. A payment session or link identifier is the handle the merchant
already has, and it is the wrong one: a session is an intent container that carries no value and may have
been presented through several surfaces. "Refund the session" has no well-defined financial meaning,
because the session never held anything.

The generic transfer identifier is equally wrong in the other direction: it identifies a movement without
saying what kind of settled payment produced it, so nothing constrains how much may be refunded or where
the money goes back to.

## Decision

**A wallet payment is a first-class payment object, and a refund references a typed source.**

A wallet-to-merchant payment is represented as a payment object in its own right, not as a generic
transfer that happens to end at a merchant. It references the transfer that settled it, the merchant, the
payer, the amount and the currency — everything needed to refund it correctly.

A refund references a **typed source**: an acquiring payment or a wallet payment, identified by its own
identifier. A generic transfer is never a refund source, and neither is a session or a link. Refunds are
cumulative and capped against the *source's* captured amount, and refund idempotency is scoped to the
source.

The source reference is opaque and merchant-scoped: it is exposed only to the principal that owns the
payment, only after the payment settles, and it reveals nothing about the payer, the wallet, the ledger
account or internal structure. A lookup for someone else's source is indistinguishable from not-found.

The same typed source governs disputes and any restitution they produce, so there is one model rather
than two.

## Rationale

Typing the source is what makes the refund cap correct. A cap has to be evaluated against the object that
actually captured value; evaluated against a session, it would be evaluated against something with no
captured amount at all. Aggregating by source is therefore not bookkeeping detail — it is the mechanism
that prevents refunding more than was taken.

Making the wallet payment first-class is what gives the source somewhere to point. If a wallet payment
were only a transfer, the protocol would have no object carrying the merchant, the payer and the captured
amount together, and every implementation would reconstruct one differently.

The opacity rules are a security decision with a specific target: an enumerable source identifier turns
the refund endpoint into an oracle for discovering other merchants' payments. Indistinguishable
not-found is what closes it, and it costs nothing.

## Alternatives considered

**Refund against the session or link identifier, which merchants already hold.** Rejected: it is
convenient and meaningless, since a session has no captured amount to cap against.

**Refund against the generic transfer identifier.** Rejected. It loses the type, so the cap and the
destination cannot be determined from the reference alone.

**Expose the internal payment identifier directly.** Acceptable only where that identifier is already
random and merchant-scoped; otherwise it leaks internal structure, which is why an opaque
merchant-bound reference resolved server-side is the general form.

## Consequences

- A refund is always evaluated against an object with a captured amount, so over-refunding is not
  expressible.
- Wallet payments and acquiring payments are refunded through one model with one set of rules.
- Merchants cannot refund a session, which occasionally surprises them and is the correct behaviour.
- Refund endpoints are not enumeration oracles, because a foreign source is indistinguishable from a
  missing one.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/refunds.md`](../../spec/refunds.md) — the typed refund source, cap, idempotency scope and opacity
- [`spec/disputes.md`](../../spec/disputes.md)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-LEDGER-*`, `INV-IDEM-*`
