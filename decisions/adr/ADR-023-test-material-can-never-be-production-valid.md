# ADR-023 — Test material can never be production-valid

## Context

Every payment system runs a sandbox, and every sandbox eventually touches production. The failure modes
are specific and each has happened somewhere: a simulated provider deployed to production, where
payments appear to succeed and no money moves; a production provider reached from a test environment,
triggering real transfers during a test run; a code generated in sandbox accepted in production,
crediting funds that were never paid.

The common shape is that test material was *syntactically valid* in production. Nothing in the artifact
itself made it unusable — only the surrounding configuration, and configuration is what goes wrong.

## Decision

**Test and demonstration material is structurally incapable of being production-valid. The property is
carried by the artifact, not by its environment.**

An artifact that can be presented across an environment boundary declares its environment, and a
verifier checks that declaration rather than inferring it from where it arrived. A sandbox payload
cannot initiate a production payment because the payload says what it is.

Trust material follows the same rule at the key level: key material marked as test is rejected as
production-valid, regardless of how correct its signature is. A test key that verifies is still a test
key.

Demonstration material goes further and cannot express value at all. It carries an explicit
demonstration flag, states that it has no monetary value, is not permitted in production, and uses a
currency code that is not a real currency (ADR-035). There is no configuration under which it becomes
real.

Credentials indicate their environment in their own form, so routing a test credential to a live
provider is visibly wrong rather than a silent misconfiguration.

Environment enforcement at deployment — refusing to start a production service configured with a
simulated provider — is an operator responsibility. The protocol supplies the signal that makes the
check possible and does not enforce the operator's boot conditions.

## Rationale

Putting the property in the artifact is what makes it survive the failure. Environment separation
enforced only by configuration fails exactly when configuration is wrong, which is the only situation in
which it matters. An artifact that declares itself is checked at the point of use, by the party at risk,
with no dependence on either side's deployment being correct.

The demonstration case is stricter than the sandbox case for a reason: sandbox material is a copy of a
real flow and could conceivably be promoted, while demonstration material is published publicly and read
by people evaluating the protocol. A fictional currency code makes "this is not money" true at the level
of the data, not merely stated beside it.

Security by construction: the check is cheap, local and requires no coordination, so it is performed
where the consequence lands rather than where the configuration was written.

## Alternatives considered

**Separate deployments with no shared code path.** Genuinely safer for the sandbox case, and rejected as
insufficient: it does not help with material that travels — a QR payload or a signed artifact crosses
whatever boundary the deployment established.

**Environment enforcement in the protocol core.** Rejected: it would require the specification to know
about operator deployment topology, which is the coupling ADR-002 exists to prevent.

**A naming convention for test identifiers.** Rejected. A convention is not checked, and an identifier
that merely looks like a test identifier is not one.

## Consequences

- Test and demonstration material fails closed in production, on its own terms.
- Verifiers carry an environment check on every artifact that can cross a boundary.
- Demonstration material can never be mistaken for value, including by people who do not read the
  surrounding text.
- An operator that omits its boot-time check can still deploy a simulated provider to production; the
  protocol makes that detectable, not impossible.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-QR-ENV-*`, `INV-ROOT-*`
- [`docs/security/TRUST_TEST_ONLY_BOUNDARY.md`](../../docs/security/TRUST_TEST_ONLY_BOUNDARY.md)
