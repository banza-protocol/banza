# ADR-031 — Operator self-publication and machine-verifiable conformance

## Context

Removing the certificate authority (ADR-025) leaves a practical question. If no central body inspects an
implementation and pronounces it acceptable, how does an implementation become known and checkable at
all?

The answer cannot be a lighter-weight approval process, because a lighter gate is still a gate: it puts
someone on the critical path of every participant, which is the property that was removed for four
independent reasons.

## Decision

**An implementation publishes its own material, and automation verifies it. Nothing is accepted,
approved or certified by a central human decision.**

The path has four steps and one actor for the first three: an implementer implements the versioned
specifications in any technology, satisfying the invariants; publishes a manifest declaring identity,
endpoints, keys, capabilities and protocol version; runs the public conformance vectors and publishes
the resulting evidence bundle, bound by digest to the exact manifest and the exact report; and
automation verifies the whole chain from public material.

The registry then **indexes** what was published — verifiable metadata and evidence digests. It grants
nothing. Presence means material was published and verified as internally consistent; it does not mean
anyone was approved, admitted or authorised (ADR-005).

Two properties make this stronger than an approval it replaces. Evidence binds to artifacts by digest,
so a bundle cannot be transplanted onto a different manifest or a different build. And any third party
may re-execute the public vectors and must obtain the same report — the claim is re-derivable rather
than asserted.

## Rationale

Self-publication with automated verification inverts where the work sits, and that inversion is the
point. Under an approval model the reviewing party does work proportional to the number of participants,
so it becomes a bottleneck at exactly the moment adoption succeeds. Here the implementer does the work
for their own implementation and everyone else does a cheap check, so cost per participant is constant
and the hundredth costs what the second did.

Digest binding is what stops self-publication from being self-assertion. Without it, an implementer
could publish anyone's evidence bundle; with it, the bundle names the exact bytes it was produced
against, and a mismatch is arithmetic rather than judgement.

Re-execution is the property that makes the whole model verifiable rather than merely open. A reader who
distrusts the published report can run the vectors, and must get the same answer. That is a stronger
guarantee than any signature over a claim, because it does not require trusting the signer.

## Alternatives considered

**A lightweight approval step to catch obvious problems.** Rejected: it reintroduces the central
decision, and "obvious problems" are exactly what the vectors catch mechanically.

**Publication with no verification.** Rejected. Unverified declarations are claims, and a registry of
unchecked claims tells a reader nothing they could not have got from the implementer directly.

**A trusted-third-party auditor performing the verification.** Rejected: it puts a party on the critical
path again, and it produces a weaker artifact than public re-execution, since a reader must trust the
auditor rather than check.

## Consequences

- Participation scales without maintainer effort, and no queue exists because no server does.
- Implementers carry the burden of running vectors and publishing evidence, which is where the knowledge
  of their own system is.
- The registry is an index, not a list of approved entities, and must be described that way everywhere.
- Weak evidence is possible: anyone may publish a bundle covering a narrow scope. That is not a defect,
  because compatibility checking reads the scope and thin evidence simply cannot support a rich
  interaction.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/operator-self-publication.production.schema.json`](../../contracts/production/operator-self-publication.production.schema.json)
- [`contracts/production/evidence-bundle.production.schema.json`](../../contracts/production/evidence-bundle.production.schema.json)
- [`contracts/production/conformance-evidence.production.schema.json`](../../contracts/production/conformance-evidence.production.schema.json)
- [`conformance/`](../../conformance/) — the public vectors
