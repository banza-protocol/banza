# ADR-002 — Protocol, implementation and operator separation

## Context

Declaring BANZA operator-neutral (ADR-001) does not keep it neutral. Coupling arrives quietly: a
function that assumes one country's rails, an enum listing the payment providers that happen to exist
today, a default that is only sensible for one company. Each is individually reasonable and
collectively fatal — after enough of them the specification can no longer be described without
describing one operator's business.

Three things are routinely conflated, and the architecture depends on keeping them apart: the
**protocol** (the rules), an **implementation** (a technical system that follows them), and an
**operator** (the responsible entity that runs an implementation).

## Decision

**The protocol defines interfaces and invariants. Operators implement them. The protocol contains no
operator.**

Concretely, the specification carries the ledger invariants, the transaction model, the wire contracts
and the integration *interfaces*; an operator carries its own rails, routing tables, risk policy,
compliance rules and credentials. Forbidden in the protocol: hardcoded provider names, country- or
currency-specific behaviour, and any rule that differs by operator.

Every external integration point is expressed as a **provider interface** — acquiring, routing,
notification, risk, settlement — rather than as a set of named providers. The protocol is generic over
the interface and never names who implements it. Illustrative implementations are conceptual examples
only; examples name Operator A, B and C and never a real commercial party.

Neutrality extends to infrastructure. The protocol's public surface is not hosted as a guest tenant of
any operator, because sharing an operator's serving stack would make protocol availability depend on
one operator's continued operation — which is the coupling this decision exists to prevent, arriving
through the back door.

## Rationale

An interface is the smallest construct that expresses "there is an integration point here" without
expressing "and this is who fills it". An enum of named providers would encode today's market into the
specification and make every new participant a change to shared rules.

The three-way distinction between protocol, implementation and operator is what later lets certification
mean something precise. A certificate is bound to an implementation — a specific artifact set — not to
an entity, because entities do not pass vectors, builds do. Without this separation the whole
conformance model collapses into vouching for companies.

Robustness under independent implementation: an implementer reads interfaces and invariants and supplies
their own providers. Nothing they must implement refers to anyone else's infrastructure, so two
implementations that never communicate can still be checked against the same rules.

## Alternatives considered

**One codebase with feature flags per operator.** Rejected: flags encode operator decisions into shared
rules and grow without bound, and the flag set becomes an undocumented specification of its own.

**A fork per operator.** Rejected. Forks diverge immediately and there is then no protocol, only a
family of resemblances.

**Configuration files for operator behaviour.** Accepted for values, rejected for behaviour. Config can
express a limit; it cannot express a routing strategy without becoming a programming language nobody
designed.

## Consequences

- Operators change rails, risk engines and providers without touching shared rules.
- Contributors can understand the protocol without understanding any operator.
- Interface design must be got right early, because interfaces are the compatibility surface.
- Some capability that would "just work" if written for one operator has to be expressed as an
  interface first. That is slower, and it is the mechanism by which neutrality is maintained rather
  than merely declared.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/`](../../contracts/) — the wire contracts and schemas
- [`contracts/invariants.json`](../../contracts/invariants.json) — the invariant registry
- [`spec/provider-model.md`](../../spec/provider-model.md) — the provider interfaces
