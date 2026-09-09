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

## Observed fact

This section states only what has been observed on a running deployment. It
carries no proposal and implies no protocol change.

An externally acquired payment **can** be financially settled by an operator, and
**can** credit the target Wallet Account correctly, while the Payment Session it
paid **cannot** reach its normative paid representation.

Measured on the Banzami reference operator's deployed Public Sandbox, through the
public Developer Platform and the unauthenticated payer surface only:

| Observation | Result |
|---|---|
| Payer confirms an externally acquired payment against a Session's payment link | accepted |
| Ledger posting | balanced, atomic, idempotent |
| Target Wallet Account credited | yes, gross, exactly once |
| Repeated and six-way parallel confirmation | one credit, one event |
| Operator's own interface-level event delivered and signed | yes |
| `payment_session.paid` emitted | **no** |
| Payment Session status | **remains `ACTIVE`** |

Thirteen Sessions were created and eleven were paid; the destination account held
exactly eleven credits, and all thirteen Sessions still read `ACTIVE`.

The mechanism is not an operator defect. It follows from two current normative
statements taken together:

`contracts/events/types.json`, `payment_session.paid` (certification level 2,
stability `stable`):

```json
"required": ["payment_session_id", "transfer_id", "amount_minor"],
"transfer_id": {
  "type": "string",
  "description": "The Transfer that settled the session. Its causation_id MUST equal payment_session_id."
}
```

`contracts/openapi/transfers.yaml` defines a Transfer as an instant P2P movement
**from the authenticated consumer's wallet** — "the JWT encodes the sender's
identity".

So:

```
Session reaches PAID  ⟸  a Transfer settled it        (events/types.json)
a Transfer exists     ⟸  a consumer wallet sent it     (openapi/transfers.yaml)
```

An externally acquired payer — a person with a bank card or an ATM reference — is
not a wallet on the network. The second implication has no satisfying term, so
the first cannot be reached. **BANZA does not currently model acquiring at all**;
`docs/reference/en/BANZA_REFERENCE.md` contains no acquiring concept.

The consequence is not cosmetic. The Session is the protocol's single financial
entry object, and `payment_session.paid` is what integrations observe. For every
payment whose payer is not already on the network — the normal case for a
donation platform, an e-commerce checkout, or any merchant acquiring its first
customers — that event never fires.

## Open protocol decision

**This RFC does not propose a resolution.** What follows is the decision space,
kept explicit so that it is decided by the protocol rather than inherited from
whichever operator implements first.

The question BANZA must answer:

> How should externally acquired value be represented normatively, such that the
> Payment Session it settles can reach a paid representation?

Three directions are visible. Each has consequences the protocol should weigh.

1. **Widen Transfer.** Allow a Transfer to originate from something other than a
   consumer wallet — an acquiring or external-funding origin. Leaves
   `payment_session.paid` untouched; changes what "Transfer" means everywhere
   else it appears, including invariants that presume two wallets.
2. **A second settlement anchor.** Allow `payment_session.paid` to name either a
   Transfer or an externally acquired payment. Leaves Transfer untouched; makes a
   stable, certification-level-2 payload polymorphic, which every existing
   consumer must be taught.
3. **A funding step before the Session.** Model the external payment as value
   entering the network first, then settle the Session by a Transfer from the
   resulting holding. Leaves both contracts intact; introduces a new financial
   object and a new moment at which value can be stranded between the two steps.

None is free, and none is endorsed here.

### Explicitly out of scope for any operator

Until BANZA decides, an operator MUST NOT:

* mark a Payment Session PAID without a protocol-defined basis;
* make `transfer_id` nullable, or emit `payment_session.paid` without one;
* fabricate a Consumer sender, or introduce an operator pseudo-consumer, to
  satisfy the Transfer contract;
* redefine "Transfer" locally;
* introduce a new wire field on a normative event.

An operator that did any of these would be defining how money enters the network,
which is the one authority an operator does not hold. Operator implementation
behaviour must not become de facto BANZA semantics.

## Interim operator position (informative)

Recorded so the observed fact above is reproducible, not as a proposal.

Until this is decided, the reference operator's behaviour on an externally
acquired Session payment is:

- the destination Wallet Account **is** credited, gross, atomically, once;
- the operator's own interface-level event **is** emitted, signed and delivered;
- the Session remains `ACTIVE` and `payment_session.paid` is **not** emitted;
- the operator surfaces its own acquiring state **separately from, and clearly
  labelled as distinct from**, the Session's protocol status — so an integrator
  can see that value arrived without being told the protocol says PAID.

That last point is operator observability, not a protocol state. `ACTIVE` remains
the Session's protocol representation; the acquiring state is operator truth
about execution. An operator that silently marked the Session PAID would assert a
protocol fact the protocol cannot express; one that silently dropped the credit
would lose money that arrived; one that showed neither would leave an integrator
with a balance it cannot reconcile.

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
