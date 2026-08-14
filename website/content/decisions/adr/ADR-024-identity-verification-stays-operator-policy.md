# ADR-024 — Identity verification stays operator policy

## Context

Every operator verifies who its participants are, and the pressure to standardise it is constant.
Operators ask what documents to accept, what tiers to define and what evidence to keep, and a protocol
that answers looks helpful.

Answering would be a mistake in a specific, expensive way. Identity-verification requirements are set by
each operator's regulator, differ by jurisdiction and by activity, and change on the regulator's
schedule. A protocol that defined them would be publishing regulatory guidance it has no standing to
give, and would need to change whenever any operator's regulator changed anything.

The genuine question is narrower and does need an answer: when two operators interoperate, what crosses
between them?

## Decision

**The protocol does not define how an operator verifies identity. Only trust assertions federate.**

Operators own exclusively: which documents are acceptable, what evidence is collected, how it is
captured, verified, scored and retained, what tiers exist, what limits attach to them, and every
storage and retention decision. None of that appears in a contract, a schema or a conformance
criterion.

What crosses an operator boundary is an **assertion** — that a participant satisfies a stated condition
under the asserting operator's policy — not the evidence behind it. The receiving operator decides,
under its own obligations, whether that assertion is sufficient for what it is about to do. It is never
obliged to accept one.

Personal data of end users does not enter the protocol's own state store (ADR-013), and identity
evidence does not travel between operators.

## Rationale

This is the litmus test of ADR-002 applied to its hardest case. A concept belongs to the protocol only
if it touches a shared surface — a wire contract, a capability, a conformance criterion, a financial
invariant, or federation. Identity-verification mechanics touch none: two operators interoperate
correctly while verifying identity entirely differently, because what they exchange is the conclusion.

Federating assertions rather than evidence is also the better privacy design, and by a wide margin. An
assertion is small, purpose-bound and reveals one fact; the evidence behind it is a passport photograph
and a face. Moving evidence between operators would multiply the number of parties holding the most
sensitive data any of them holds, in exchange for no interoperability benefit — the receiving operator
would still apply its own policy.

Leaving acceptance to the receiver is what keeps each operator answerable to its own regulator. An
operator that had to accept a peer's assertion would have outsourced a decision it remains liable for.

## Alternatives considered

**Define standard verification tiers so assertions are comparable.** Superficially attractive and
rejected: tiers are defined by regulators, differ by jurisdiction, and a protocol-level tier would be
either wrong somewhere or so generic as to be uninformative.

**Federate the underlying evidence so the receiver can re-verify.** Rejected. It maximises exposure of
the most sensitive data in the system to obtain a capability the receiver does not want, since it will
apply its own policy anyway.

**Say nothing at all about identity verification.** Rejected: silence leaves operators to guess whether
identity evidence is supposed to federate, and the guess that it does is the damaging one.

## Consequences

- Operators satisfy their own regulators without protocol interference, and change policy freely.
- Identity evidence never crosses an operator boundary and never enters the protocol.
- A receiving operator always decides for itself, and may decline an assertion it does not trust.
- Comparing verification strength between operators is not something the protocol can do, which is
  accurate rather than a limitation.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/federation/FEDERATION_TRUST_MODEL.md`](../../spec/federation/FEDERATION_TRUST_MODEL.md)
- [`docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md`](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)
