# ADR-035 — Operator Zero: the read-only reference implementation

## Context

A specification with no working implementation cannot be checked end to end. Its contracts have never
been served, its vectors have never run against a live system, and the first team to implement it
discovers every ambiguity at their own expense.

Building a reference implementation solves that and creates a different risk. A worked example
maintained by the protocol's authors becomes the answer to "how should this behave?", and its incidental
choices acquire the authority of the specification. Worse, in a financial protocol, a demonstration that
looks like a real operator will eventually be taken for one.

## Decision

**Operator Zero is a demonstration reference implementation: real engines, real artifacts, no value, and
no authority.**

It exists to be a complete, publicly reachable, end-to-end example — accounts, balances, initiation,
refunds, reconciliation, trust and federation — that anyone can watch work.

Four properties keep it from becoming something else. Everything it publishes is marked **demonstration
only**, with no monetary value and not permitted in production. Its currency is **fictional** — never a
real currency code — so its amounts cannot be misread as money (ADR-023). It is **read-only** with
respect to the protocol: it demonstrates behaviour and decides nothing about anyone else. And it is
**never a scheme participant**: it holds no membership of the Banzami Operational Scheme or of any
other scheme, and its presence in the registry is a demonstration record, not participation.

It is simulated PSP-like behaviour and is not a PSP. It is not a bank, a wallet or a licensed operator,
and it moves no real money.

It is also the **sole canonical demo operator**. Examples, fixtures and demonstrations use Operator Zero
rather than inventing further sample operators, because a family of half-maintained samples is how a
demonstration surface drifts out of conformance without anyone noticing: each sample is a second
implementation nobody runs the vectors against. Operator-neutral prose still names Operator A, B and C as
abstract parties — those are placeholders in text, not published implementations.

Above all it is **not normative**. Where Operator Zero and the specification disagree, Operator Zero is
wrong and is fixed. It is checked against the contracts; the contracts are never adjusted to match it.

## Rationale

The direction of correction is the whole decision. A reference implementation that could be "right" by
disagreeing with the specification would become the specification, and the published contracts would
degrade into documentation of whatever it happened to do. Fixing the implementation against the contract
is what keeps the contract the authority — and it is the rule that gets abandoned first under time
pressure, which is why it is written down.

A fictional currency does more work than a disclaimer. A demonstration in a real currency code is one
screenshot away from being presented as a real transaction; a code that exists nowhere cannot be, and
the property is carried by the data rather than by the surrounding text.

Keeping it read-only preserves the shape of the trust model. If the reference implementation could
validate or vouch for others, it would be a central authority wearing an example's clothes.

Robustness under independent implementation: the value of a reference is that an implementer can compare
against something running. That value survives only while the reference is known to be subordinate to
the specification.

## Alternatives considered

**No reference implementation; specification and vectors only.** Rejected: the vectors prove
conformance of an implementation but do not demonstrate that the whole surface composes into a working
system, and an implementer has nothing to compare against.

**A production-capable reference operator.** Rejected. It would make the protocol's authors an operator,
put them in competition with the operators they serve, and give one implementation privileged status.

**A private reference used only in testing.** Rejected: the demonstration value is in being publicly
watchable, and a private reference cannot be checked by the people who most need it.

**Demonstration in a real currency for realism.** Rejected — the realism gained is small and the risk of
a demonstration amount being read as money is permanent.

## Consequences

- Anyone can watch a complete implementation work before writing any code.
- Every disagreement with the specification is a bug in Operator Zero, resolved in one direction only.
- Its artifacts can never be presented as production evidence, structurally.
- Maintaining it is real ongoing cost, and that cost is what keeps the end-to-end surface honest.

---

## Normative authority

The decision above is explanatory, and this record is the case where that matters most: the reference
implementation binds nothing. What binds an implementation is the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
