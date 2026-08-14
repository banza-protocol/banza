# ADR-016 — Collections: a composite obligation, never money

## Context

People pay for things together: a bill split between friends, a shared gift, a group order, a fundraiser
with many contributors. Every payment product eventually meets this and the tempting implementation is a
container that receives the contributions and pays out when it is complete.

That container holds other people's money while it fills. It has a balance, a custody question, a
failure mode when the group never completes, and — depending on jurisdiction — a regulatory status. All
of that arrives with a feature that looked like grouping.

## Decision

**A collection is a composite financial obligation, not a financial container. It holds no balance and
never posts to the ledger.**

A collection groups shares under a rule. Each **share** is settled independently by its own payment
intent (ADR-015), which produces its own transfer and its own ledger postings, paid directly to the
destination. The collection is the structure that says which shares exist and when the obligation is
satisfied; it is never in the value path.

The rule expresses how the shares relate — a fixed split of a known total, or an open target where
contributions accumulate toward a goal. Whether a collection is complete is derived from the state of
its shares, not from a balance it keeps.

Scope is a single operator: a collection's shares are created and settled within the operator that
created it. Cross-operator share settlement is deferred, and the model is arranged not to preclude
it — a share references an intent, and an intent is already the protocol's generic initiation object.

## Rationale

Keeping the collection out of the value path is the entire decision, and everything good follows from
it. No balance means no custody, no float, no escrow semantics and no question about who owns
un-completed funds — because the money was never in the collection. Each payer's money goes where it was
always going, and if the group never completes, nothing is trapped: the shares that were paid are paid
and the ones that were not simply were not.

Modelling a share as an ordinary payment intent is what makes this nearly free. A share needs no new
settlement mechanism, inherits the existing lifecycle, events, idempotency and reconciliation, and
produces an ordinary receipt. The collection adds structure over primitives that already work rather
than a parallel money path.

Deferring cross-operator settlement is honest scoping rather than an omission: it needs federated
settlement semantics that do not exist yet, and pretending otherwise would put an untested path in the
specification.

## Alternatives considered

**A collection that receives funds and disburses on completion.** The obvious design, and rejected
because it makes the operator a custodian of pooled funds with a regulatory character that a payment
protocol should not confer by accident.

**Escrow semantics with a release condition.** Rejected for the same reason with more machinery: escrow
is a custody arrangement, and it would need dispute, timeout and reversal rules the protocol does not
define.

**No collection concept; let applications group links themselves.** Rejected — this is precisely the
inversion ADR-003 forbids. Grouping that exists only in an application means the protocol has no model
of it, no events, no evidence, and no way for another implementation to interoperate with it.

## Consequences

- No custody, no float and no pooled balance anywhere in the model.
- A share is an ordinary payment, so receipts, proofs, reconciliation and refunds work unchanged.
- Completion is a derived property, so it is always consistent with the shares.
- Cross-operator collections are not available in this version, and adding them is a federation
  decision rather than a change to this model.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/collections/`](../../contracts/collections/)
- [`spec/collections.md`](../../spec/collections.md)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-COLLECTION-*`
