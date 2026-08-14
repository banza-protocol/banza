# ADR-021 — Reason codes

## Context

Outcomes need names. A trust evaluation reaches a status, a fetch fails for a reason, a validation step
ends in a state, a check identifies itself. Independent implementations have to agree on those names or
they cannot compare results — and comparing results is the entire point of a conformance protocol.

The failure this addresses was specific and instructive: several vocabularies existed only inside the
reference implementation, including the field an entire trust verdict rests on. They appeared in no
contract. An independent implementation could not have produced or interpreted a single one of those
values, which meant the reference implementation was quietly the specification.

## Decision

**Publish a core registry with a reserved extension namespace, and keep the vocabularies separate.**

**Separate vocabularies, never one enum.** A trust status, a fetch failure, a step status and a check
identifier answer different questions for different producers at different layers. Merging them would
make each less precise and would create collisions between meanings that never meet.

**A status decides; a reason code explains.** This distinction is what makes the rest safe. Because a
reason code cannot change a verdict, an unknown one can be tolerated — carried, displayed, logged —
without any risk of it being acted upon.

**Decisional enums stay closed.** Trust status, step status and the failed-check list are acted upon, so
a value outside them is invalid: there is no safe way to act on a decision you cannot read. Explanatory
codes are open.

**Extensions are namespaced** as `vendor.code`. Core codes contain no separator, so collision is
impossible by construction rather than by convention. Extensions are preserved, never interpreted and
never verdict-affecting.

**Unknown core-shaped codes are preserved rather than rejected**, so adding a core code stays backward
compatible instead of breaking every existing consumer.

## Rationale

The decides-versus-explains split is the load-bearing idea, and it resolves what would otherwise be a
direct conflict. Closed enums are safe but unextendable; open vocabularies are extendable but unsafe to
act on. Splitting by role gets both: the small decisional set is closed because decisions must be
readable, and the large explanatory set is open because explanations cannot hurt.

Namespacing by a character that core codes never contain makes collision structurally impossible. A
convention — "vendors should prefix their codes" — is followed until someone does not, and then a
vendor meaning is permanently in the way of a core addition.

Publishing the vocabularies is what removes the reference implementation from the authority path
(ADR-008). It now emits these values; it no longer defines them.

## Alternatives considered

**One universal error taxonomy.** Rejected: it would require the protocol to have opinions about
transport errors, scheme declines and operator policy, none of which it defines, and it would make every
vocabulary less precise to accommodate the others.

**Leave the fields as free strings and describe the values in prose.** Rejected. Prose that is not a
registry cannot be validated, and no guard can hold an implementation to it — which is exactly how the
vocabularies came to live only in code.

**Open extension without a namespace.** Rejected: a consumer could not distinguish a core code from a
vendor code, and a future core addition could silently collide with a vendor meaning already in
production.

## Consequences

- Independent implementations produce comparable, machine-checkable outcomes.
- Adding a core code is backward compatible; consumers preserve what they do not recognise.
- Vendors extend without coordination and without ever affecting a verdict.
- Semantic equivalence between two receipts becomes definable and testable.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/reason-codes.md`](../../spec/reason-codes.md)
- [`contracts/production/reason-code-registry.production.json`](../../contracts/production/reason-code-registry.production.json)
- [`contracts/federation/federation-trust.json`](../../contracts/federation/federation-trust.json) — the check identifiers
