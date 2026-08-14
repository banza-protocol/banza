# ADR-038 — Rust-first official engines

## Context

The protocol prescribes no implementation technology for operators, and that neutrality is permanent
(ADR-002). It says nothing about what language the project's *own* official components are written in,
and that question needs its own answer.

Those components decide things: whether an evaluation passes, whether a signature verifies, whether an
invariant holds, whether material is revoked. A defect in one of them is not a wrong answer on a screen;
it is a wrong verdict that a counterparty acts on. They had accumulated across several languages, which
meant the same decision could be made in two places with two behaviours, and no way to tell which was
authoritative.

## Decision

**Every official BANZA engine is implemented in Rust.**

An engine is any component that computes or decides: conformance evaluation, cryptography, trust,
revocation, invariant checking, retrieval, scoring, guards, evaluation runners, routing, semantic
validation and evidence generation.

Other languages have defined, subordinate roles. TypeScript and JavaScript are for interface, rendering,
navigation and thin adapters that consume engine output — never for an algorithm. Python is a temporary
compatibility wrapper while something is migrated, and is not the canonical implementation once a Rust
engine exists. Shell orchestrates.

This governs the project's own official implementations only. It places no constraint on operators, who
may implement the protocol in any technology that satisfies the invariants — and the neutrality of
ADR-002 is orthogonal to this decision, not weakened by it.

New non-Rust engines are blocked mechanically rather than by review, and remaining legacy is tracked
explicitly and migrated.

## Rationale

One language for everything that decides means one implementation of each decision. That is the property
being bought, and it is worth more than any language feature: a second implementation of a verdict is a
second answer waiting to disagree, and the disagreement surfaces as two surfaces reporting different
results with no way to tell which is right.

Rust specifically, because these components are exactly where its guarantees pay: memory safety in code
that parses attacker-supplied artifacts, exhaustive matching in code that handles closed state enums,
and a type system that makes an unhandled case a compile error rather than a runtime default. Code that
decides trust outcomes while parsing hostile input is the strongest case for it.

Compiling the same engine to native and to WebAssembly is what keeps the property from eroding. A
browser surface and a server surface run the identical compiled artifact, so they cannot drift — which
is not achievable by discipline alone when the alternative is a convenient reimplementation in the
interface's own language.

Enforcing it with a guard rather than a review is deliberate. The rule fails by exception, and exceptions
are granted under deadline pressure by people who mean well.

## Alternatives considered

**No language policy; use whatever fits each component.** Rejected: it is how the situation arose, and
it produces duplicated decision logic that silently diverges.

**TypeScript throughout, for one language across engines and interface.** Genuinely simpler for
contributors and rejected on the merits: the components in question parse untrusted input and evaluate
closed state machines, where the type and memory guarantees are the point.

**A formally verified language for the trust core.** Considered and rejected as disproportionate — the
verification cost is large, the contributor pool is very small, and the defects this policy targets are
duplication and unhandled cases rather than deep logical error.

## Consequences

- Each decision has one implementation, and browser and server cannot disagree.
- Contributors need Rust for anything that decides, which narrows the contributor pool for engine work.
- Interface code stays thin by construction, because it has nowhere to put logic.
- Migration of remaining legacy is a tracked obligation rather than an aspiration.

---

## Normative authority

The decision above is explanatory and governs this project's own implementations. It binds no operator,
and nothing in it is part of the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
The policy itself is
[`docs/governance/RUST_FIRST_IMPLEMENTATION_POLICY.md`](../../docs/governance/RUST_FIRST_IMPLEMENTATION_POLICY.md).
