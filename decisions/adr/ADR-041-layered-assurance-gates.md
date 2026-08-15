# ADR-041 — Layered assurance gates

## Context

BANZA accumulated a large amount of green: engines, guards, vectors, CI contexts. Green became the
answer to "is this correct?", and it is not one.

Three failures found while completing the Root model show why, and none of them was caught by a test
going red:

- **A property claimed with nothing implementing it.** `INV-ROOT-007` declared a three-authority
  threshold and `INV-ROOT-009` declared seat continuity. The runtime anchored one key. Every test
  passed, because no test asked the question the invariant answered.
- **A test that encoded the defect instead of catching it.** The freshness suite asserted that the Key
  Manifest did *not* declare `root_signatures` — pinning the exact mismatch between specification,
  contract and implementation as if it were the requirement.
- **A test that passed for the wrong reason.** A manifest carrying its own authority set was rejected —
  but because the fields were added after signing, so it was tamper detection. The property claimed was
  that a verifier refuses a self-supplied trust anchor. Both produce a rejection; only one is the
  property.

And one that a guard actively obstructed: the guard protecting `INV-ROOT-004` pinned the sentence rather
than the property, so correcting the invariant made the guard defending it fail.

The common shape is a layer certifying itself. An engine's tests are written by whoever wrote the
engine, against their understanding of the rule; if the rule is absent, wrong, or unrepresentable on the
wire, the tests pass anyway and prove only internal consistency.

## Decision

**No layer may validate itself. Every critical property must be demonstrated through a falsifiable chain
of evidence, and a higher gate never compensates for a lower one.**

Eleven gates, `AG-0` … `AG-10`, each asking a question the layer below cannot answer about itself:

| Gate | Question |
|---|---|
| **AG-0** | Is the required behaviour actually defined by the normative public surface? |
| **AG-1** | Can the protocol represent — and reject — the property on the wire? |
| **AG-2** | Does a conforming independent implementation know exactly what result is required? |
| **AG-3** | Does the implementation enforce it? |
| **AG-4** | Does it hold across state, persistence, restart and concurrency? |
| **AG-5** | What happens when a dependency or participant fails? |
| **AG-6** | Does it survive deliberate attempts to break it? |
| **AG-7** | Do all surfaces agree, with zero contradiction? |
| **AG-8** | Could a clean-room team derive it without the engines, records or authors? |
| **AG-9** | Does every public claim match its evidence class? |
| **AG-10** | Is it ready to freeze? |

The gates are not conformance profiles, institutional layers or payment states, and they do not
renumber anything.

**Three rules give them force.**

*A green test is not evidence of a property if it can pass for a reason different from the property being
claimed.* Where the distinction is material, the expected failure reason is asserted, not just the
failure.

*A higher gate cannot compensate for the failure of a lower one.* Thousands of engine tests do not
substitute for a missing normative rule. `AG-3` passing while `AG-0` fails means the implementation
enforces something the protocol never required.

*Counting is not passing.* Test counts, guard counts and coverage percentages are observations. A
`CRITICAL` property passes when every applicable link in its chain exists — positive case, negative
case, adversarial case, state and failure behaviour, a property guard, and a mutation proof that the
guard can actually go red.

Results are `PASS`, `FAIL`, `BLOCKED`, `NOT_APPLICABLE` or `NOT_RUN`. `NOT_APPLICABLE` requires a
recorded rationale. There is no *mostly*, *effectively*, *provisional* or *good enough*.

**Guards protect properties, not wording.** Executable behaviour, structured data and semantic conditions
first; an exact-sentence check only where the exact sentence genuinely is the property. A guard must also
be proven not to fire on text that merely describes, negates or rejects the forbidden condition — a
record stating that BANZA does not use a five-seat scheme must not trip the guard forbidding one.

**Mutation proofs run in an isolated worktree.** Never the primary tree: the property being proven is
that a guard goes red, and the cost of proving it must not be the working tree.

The registry that records all this is **non-normative**. It points at authorities; it never restates a
rule, because a second place where a rule is written is a second place for it to be wrong.

## Rationale

The gates are ordered by what each can falsify about the one before it, which is why a higher gate cannot
substitute for a lower one. `AG-0` is first because everything downstream is a claim about a rule; if the
rule is not on the public surface, an implementation cannot be wrong about it, only different.

Separating `AG-1` from `AG-0` is the lesson of the Root defect specifically. The specification named a
threshold, so `AG-0` would have passed. The schema could not express it and the wire carried a single
signature, so the property was unrepresentable — a distinct failure, at a distinct gate, invisible to any
amount of testing at `AG-3`.

`AG-5` exists because "what happens when it fails?" was the question nothing forced anyone to answer, and
it is the gate that makes *Resilient* (ADR-040) checkable rather than aspirational.

`AG-8` is where self-validation is hardest to see. A package can be self-contained in the sense that
every reference it includes resolves, and still be semantically incomplete because a globally required
dependency was never included — which is exactly what the L0 export did with the entire root trust plane.
Self-containment of what is present says nothing about what is absent.

Mutation proof is the cheapest defence against the most common failure of a guard, which is not being
wrong but being inert. A guard that has never been observed to fail is an untested assertion with a
Makefile target.

## Alternatives considered

**Rely on coverage and test counts.** Rejected: every defect above occurred at high coverage. Coverage
measures which lines ran, not which properties were demonstrated, and optimising it produces tests
written to be counted.

**One comprehensive audit before each freeze.** Rejected. An audit is a snapshot by people who already
share the authors' assumptions; the gaps found were exactly the ones nobody thought to question. Gates
that run continuously catch drift on the day it lands.

**Make the assurance registry normative.** Rejected, and it is the tempting error: a machine-readable
registry of properties looks like a specification. It would become a second source of truth that
disagrees with the first, and implementers would have to reconcile them. It points, and does not define.

**Trust the reference implementation as the oracle.** Rejected explicitly. An implementation producing an
expected answer and then verifying that same answer proves only that it is consistent with itself.
Tooling may produce signatures, digests and fixtures; it may not decide what the protocol means.

## Consequences

- A property may be true and still not claimable. `SPECIFIED`, `IMPLEMENTED`, `INTERNALLY ASSURED`,
  `INDEPENDENTLY IMPLEMENTED` and `OPERATIONALLY DEMONSTRATED` are distinct, and no level may be skipped.
- Adding a critical property now costs more than adding code: the chain must exist before the property
  may be claimed or frozen.
- Some properties will sit at `BLOCKED` or `NOT_RUN` and remain visible there. That is the intended
  behaviour of an honest gate, not a defect in it.
- Independent external implementation cannot pass any gate here. Until a real external team exists it is
  `NOT_DEMONSTRATED`, and no amount of internal assurance changes that.

---

## Normative authority

This record is explanatory, and the gates impose no requirement on an implementation. They constrain what
the project may claim and freeze. What binds an implementation is identified by the
[Normative Manifest](../../contracts/production/normative-manifest.json).

The principles these gates exist to make checkable are [ADR-040](ADR-040-r2s2-fundamental-principles.md).
