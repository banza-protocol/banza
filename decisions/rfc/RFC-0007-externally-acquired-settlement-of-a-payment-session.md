---
rfc: 0007
title: Externally Acquired Settlement of a Payment Session
status: Draft
created: 2026-09-09
authors: ["Banzami (reference operator)"]
requires: []
---

## Summary

A Payment Session can only be marked PAID by a Transfer, and a Transfer can only
originate from a consumer wallet. A payment that arrives from outside the network
— a card, an ATM reference, a Multicaixa Express confirmation relayed by an
acquirer — therefore has no protocol-legal way to settle a Session, even when the
money has demonstrably arrived and the correct Wallet Account has been credited.

This RFC does not propose the mechanism. It states the gap precisely, with the
evidence that found it, so that the protocol decides how externally acquired
value settles a Session rather than each operator deciding locally.

## Motivation

The gap was found by a real payment, not by reading the specification.

A payer opened a Payment Session's payment link on the reference operator's
public payer surface, confirmed a simulated Multicaixa Express payment, and was
shown a terminal CONFIRMED. Minutes later the Session was still `ACTIVE`, the
destination Wallet Account held nothing, and no event had been emitted. The
operator had four implementation defects on that path and has fixed three of
them: the credit now happens, it lands on the Wallet Account the interface
names, and the posting is atomic and idempotent.

The fourth is not an implementation defect. After the operator's fix the money
arrives correctly and the Session still cannot be marked PAID, because the
protocol has no way to describe what settled it.

## Problem statement

`contracts/events/types.json`, `payment_session.paid` (certification level 2,
stability `stable`):

```json
"required": ["payment_session_id", "transfer_id", "amount_minor"],
"transfer_id": {
  "type": "string",
  "description": "The Transfer that settled the session. Its causation_id MUST equal payment_session_id."
}
```

`transfer_id` is required and not nullable, and the Transfer it names is
constrained by `contracts/openapi/transfers.yaml`, which defines a Transfer as an
instant P2P movement **from the authenticated consumer's wallet** — "the JWT
encodes the sender's identity".

So the protocol's chain of reasoning is:

```
Session reaches PAID  ⟸  a Transfer settled it
a Transfer exists     ⟸  a consumer wallet sent it
```

An externally acquired payment breaks the second link. The payer is a person with
a bank card or an ATM reference, not a wallet on this network. There is no
consumer to be the sender, and inventing one would mean asserting that a wallet
sent money it never held.

The consequence is not cosmetic. The Session is the protocol's single financial
entry object: it is what binds a destination Wallet Account and what an
integrating application observes. An operator that accepts externally acquired
payments can credit the right account, balance the ledger and emit its own
interface-level event — and still cannot tell anyone, in the protocol's own
vocabulary, that the Session was fulfilled. Every integration built on
`payment_session.paid` is silent for that entire class of payment.

The reference operator reaches this state today for any Session paid through an
acquirer rather than by a Banzami wallet. It is the normal case for a donation
platform, an e-commerce checkout, or any merchant whose payers are not yet on the
network — which is to say, for most of the adoption the protocol exists to enable.

## What is NOT being proposed

This RFC deliberately stops at the statement of the gap.

Three directions are visible, and each has consequences the protocol should weigh
rather than inherit from whichever operator implements first:

1. **Widen Transfer.** Let a Transfer originate from something other than a
   consumer wallet — an acquiring or external-funding origin. This keeps
   `payment_session.paid` unchanged, and changes what the word Transfer means
   everywhere else it appears, including in invariants that assume two wallets.
2. **A second settlement anchor.** Let `payment_session.paid` name either a
   Transfer or an externally acquired payment. This leaves Transfer alone and
   makes a stable, certification-level-2 payload polymorphic, which every
   existing consumer would have to be taught.
3. **A funding step before the Session.** Model the external payment as value
   entering the network first, then settle the Session by a Transfer from the
   resulting holding. This keeps both existing contracts intact and introduces a
   new financial object plus a new moment at which value can be stranded between
   the two steps.

None of these is free, and the choice is a protocol choice. An operator picking
one locally would be defining how money enters the network, which is exactly the
authority an operator does not hold.

## Interim operator position

Until this is decided, the reference operator's behaviour on an externally
acquired Session payment is:

- the destination Wallet Account **is** credited, gross, atomically, once;
- the operator's own interface-level event **is** emitted and delivered;
- the Session remains `ACTIVE` and `payment_session.paid` is **not** emitted.

This is an honest incomplete state rather than a false one. It is recorded here
because an operator that silently marked the Session PAID would be asserting a
protocol fact the protocol cannot express, and one that silently dropped the
credit would be losing money that arrived.

## Open questions

- Does the protocol recognise externally acquired value as a first-class way for
  money to enter the network, or only as an operator-local concern that must be
  converted into wallet-native value before it can touch a Session?
- If `payment_session.paid` gains a second anchor shape, what happens to
  INV-TRACE-001's causation requirement, which is currently expressed in terms of
  a Transfer's `causation_id`?
- Is a partially settled Session (money credited, Session not PAID) a state the
  protocol should be able to name, independently of how this gap is closed?
- Does the answer differ between Sandbox and a production environment, or must it
  be identical so that an integration verified in Sandbox behaves the same in
  production?
