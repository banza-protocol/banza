# ADR-025 — Trust without a certificate authority

## Context

An open protocol has to answer how one operator decides to interoperate with another. The conventional
answer is a certificate: a central body inspects a participant, issues a signed artifact saying it is
acceptable, and peers check for that artifact before routing.

Applied here, that design fails on four independent grounds, any one of which is sufficient.

It makes participation depend on a central decision — a conformant implementation could pass every
public vector and still be unable to participate, because participation waits on one team. The defect is
the existence of the gate, not how well it is operated; the same gate is available to a successor, an
acquirer, a court order or an attacker.

It puts one team permanently on the critical path of every new participant, so the protocol cannot
survive its founders.

It reads as regulatory permission. An artifact issued by a central body, required before an entity may
handle other people's money, will be understood as authorisation, which BANZA cannot grant.

And it destroys information. Conformance is a reproducible property of published artifacts: run the
public vectors and the result is deterministic, obtainable by anyone. Compressing that into a signature
over a claim yields something strictly *less* verifiable than the evidence it replaced — a holder can
check only that a key signed it, never that the implementation conforms.

## Decision

**There is no certificate authority over operators. A verifier reaches its own conclusion from public
material, offline, without contacting anyone and without asking permission.**

The evaluation is a conjunction of published inputs: registry metadata locating the participant, signed
protocol metadata establishing which rules and vectors are genuine, the participant's own signed
manifest, conformance evidence bound to that manifest by digest, compatibility between what is offered
and what is needed, and a signed revocation list. Any part missing, invalid, expired, revoked or
incompatible ends the evaluation: it is fail-closed throughout, with no grace period, no default-allow
and no override.

For federation routing the same evaluation is specified as ten concrete, independently testable checks
covering manifest validity, protocol-version compatibility, signed metadata, evidence, signature
verification, revocation, capability compatibility, endpoint compatibility, evidence freshness and the
fail-closed rule itself.

The root's own scope is unchanged by removing the certificate authority, and is worth stating because it
is what keeps the root small: the Trust Root signs **only the Key Manifest**, the root metadata that
endorses the delegated signing keys. Protocol metadata, releases, the revocation list and conformance
evidence are signed by those delegated keys within their domains — never by the root directly.
The Trust Root signs only the Key Manifest that endorses the delegated signing keys, and signs no
statement about any operator's identity, status, eligibility or right to participate.

Four properties hold throughout. No artifact issued by BANZA about an operator is ever an input — a
verifier requiring one is not implementing this protocol. No human decision is an input, and none can
convert a negative conformance result into a positive one. Any verifier may re-execute the public
vectors and must obtain the same result, which is the property a certificate never had. And the verdict
belongs to the evaluating party: it decides, under its own policy and its own obligations, and its
decision is re-derivable by any third party from the same public artifacts.

A registry entry locates; it does not vouch. Listing grants nothing and absence forbids nothing.
Revocation is a security signal about cryptographic material, never a sanction or a judgment about an
entity. Fail-closed is a decision about an interaction, and is never recorded or communicated as a
rejection of anyone.

## Rationale

Replacing an assertion with a reproducible measurement is the whole design. The certificate answered
"did the authority say yes?"; the evaluation answers "does the implementation actually conform?", and
the second question is the one a counterparty cares about. It is also the only one that can be
re-checked later, by anyone, without the original party's cooperation.

Removing the issuing authority removes a high-value key — one that could mint trust directly, and whose
compromise would have been catastrophic. Deleting a mechanism deletes its attack surface, which is a
stronger security result than protecting it well.

Locality of the verdict matters as much as its content. Operator A carries the regulatory obligations of
interoperating with Operator B, so Operator A must make that decision. A protocol that made it centrally
would be assuming a liability it cannot hold.

Simplicity: the participation cost for the hundredth implementation equals the cost for the second,
because there is no queue and no server.

## Alternatives considered

**A central certificate authority.** Rejected on the four grounds above, of which the fourth is
decisive: it produces less verifiable evidence than the measurement it replaces.

**A web of trust between operators.** Rejected: it recreates vouching in distributed form, so trust
still flows from opinion rather than from a re-runnable measurement, with the added problem that
opinions have no fixed meaning.

**Certificate transparency over issued artifacts.** Rejected as solving a problem the design no longer
has — there is no issued artifact to make transparent (ADR-028).

**A shorter evaluation, dropping capability and endpoint compatibility.** Rejected. Those two are what
make the result actionable: evidence that an implementation conforms in general does not establish that
the specific interaction can be performed.

## Consequences

- No party is on the critical path of participation, and the protocol outlives its maintainers.
- A peer verifies the claim itself rather than that someone signed one.
- The evaluating party owns the work and the outcome. This is a real transfer of responsibility, and it
  is honest: the certificate never carried that responsibility, it only appeared to.
- Evidence is larger than a signature, so verification costs more bandwidth and caching.
- Freshness policy is per-verifier rather than a single ecosystem-wide expiry. More correct, since
  staleness tolerance belongs to the party at risk, and no longer uniform.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/federation/federation-trust.json`](../../contracts/federation/federation-trust.json) — the checks and their identifiers
- [`spec/federation/FEDERATION_TRUST_MODEL.md`](../../spec/federation/FEDERATION_TRUST_MODEL.md)
- [`spec/federation/FEDERATION_INVARIANTS.md`](../../spec/federation/FEDERATION_INVARIANTS.md) — `INV-OTE-*`, `INV-FEDEVAL-*`
- [`contracts/production/federation-trust-evaluation.production.schema.json`](../../contracts/production/federation-trust-evaluation.production.schema.json)
