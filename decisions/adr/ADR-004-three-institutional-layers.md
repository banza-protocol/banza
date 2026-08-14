# ADR-004 — Three institutional layers

## Context

BANZA is not only a specification. Around it sit a conformance system that evaluates implementations and
an operational scheme that will one day move real money under a regulator. Described as one thing, they
are impossible to reason about: a reader cannot tell whether "BANZA says this implementation is fine"
means a test passed, a company was admitted somewhere, or a regulator approved something.

Worse, without a frame the layers leak into each other. The party that writes the rules is also the
party building the first scheme, so an unclear architecture would let scheme interests reach the rules
and let protocol authority be read as commercial permission.

## Decision

**BANZA is three separated layers, and the separation is architectural — by responsibility, by
infrastructure and by keys — not a presentational convenience.**

| Layer | What it is | What it is not |
|---|---|---|
| **Layer 1 — Protocol** | Open, neutral, verifiable rules: contracts, schemas, invariants, reason codes, manifests, signatures, discovery, profiles, trust, revocation, federation | Not a bank, PSP, wallet or operator; holds and moves nothing |
| **Layer 2 — Conformance and interoperability certification** | Per-implementation, evidence-based, engine-decided, reproducible, scoped and time-limited demonstration against a public versioned profile | Not a licence, not admission to anything, not regulatory authorisation |
| **Layer 3 — Operational scheme** | A scheme built on the protocol by a designated operator, subject to its own regulator | Not the protocol, not the certifier, and not privileged in either |

BanzAI runs across all three as a human interface and is an authority in none of them (ADR-036).

These institutional layers are **not** the conformance profiles. Profiles are named L0 to L4 and describe
what an implementation demonstrated (ADR-030); layers describe who is responsible for what. A profile is
never a layer, and neither numbering implies the other.

## Rationale

Separation by responsibility alone would be an editorial claim, and an editorial claim is exactly what
cannot be verified by the parties who most need to verify it. Separating infrastructure and keys as well
makes the boundary checkable: a third party can observe that the certification system and the scheme do
not share a signing key or a database, and does not have to take anyone's word for it.

Three layers is the smallest decomposition that keeps the three questions apart, and the questions
genuinely are distinct — they have different owners, different evidence and different failure modes. Two
layers would force certification and operation into one, which is precisely the conflation the whole
architecture is arranged to prevent.

## Alternatives considered

**One layer — "BANZA" as a single system.** Simplest to explain and impossible to keep honest: a reader
cannot distinguish a passing test from a permission, and the party running the scheme would inherit the
authority of the party writing the rules.

**Two layers — protocol and everything else.** Rejected because certification and operation have
different owners and different evidence. Merging them would make certification a scheme function, and
the first scheme's operator would then be certifying its competitors.

**More layers — separating governance, engineering and publication.** Rejected as decomposition without
a decision behind it: those are roles inside Layer 1, not separate institutions, and naming them as
layers would suggest independence that does not exist.

## Consequences

- Every public surface can state which layer it belongs to, and a claim that crosses layers is visibly
  wrong rather than merely unclear.
- The scheme can pause, change or cease without affecting Layers 1 and 2 (ADR-006).
- Separated infrastructure and keys cost real operational work, and that cost is what makes the
  separation verifiable.
- The L0–L4 profile numbering and the layer numbering coexist and will be confused unless surfaces name
  them explicitly. Every surface therefore says "profile" or "layer" and never a bare number.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json) — the profiles
- [`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json) — the normative surface
