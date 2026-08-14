# ADR-028 — Anti-rollback for versioned trust material

## Context

Trust material is republished: keys rotate, revocation lists grow, protocol metadata is reissued. Every
version is correctly signed, which creates an attack that needs no cryptographic break at all. An
adversary positioned between a verifier and a publisher serves an *older* valid artifact — a revocation
list from before a key was revoked, metadata from before a compromise was recorded. Every signature
checks out, and the verifier is looking at a true statement about the past.

Signature verification cannot detect this, because nothing is forged. The verifier needs to know that
what it is seeing is not older than what it has already seen.

## Decision

**Adopt monotonic anti-rollback. Do not adopt certificate transparency, and do not add mirrors.**

A verifier keeps, per artifact type and per signing authority, the highest ordering marker it has
accepted. An artifact whose marker is lower is rejected, fail-closed, with a rollback reason code.

Because ordering markers are timestamps whose granularity may be whole seconds, an equal marker does not
by itself mean the same artifact. The verifier therefore records the artifact's canonical content digest
alongside the marker. An equal marker with an equal digest is an idempotent re-observation and is
accepted. An equal marker with a *different* digest is equivocation — one authority publishing two
different artifacts as the same version — and fails closed.

The publisher carries the matching obligation: an authority does not publish two distinct artifacts of
the same type under the same ordering marker.

What this provides, and does not, is stated precisely because the distinction is easy to blur:

| Guarantee | Provided |
|---|---|
| Artifact freshness — an expired artifact is not accepted | Yes |
| Local monotonicity — no rollback within an observed scope | Yes |
| Set consistency — several valid, fresh artifacts belong to one publication state | **No** |
| Cross-observer consistency — no split-view, no global transparency | **No** |

Expiry bounds the age of each artifact. It does not bound the coherence between them.

## Rationale

Monotonicity is the smallest mechanism that closes the rollback attack. It requires one stored value per
authority per type, no network, no third party and no coordination — a verifier that has seen an
artifact once is protected from that moment, and one that has never seen any is in the position it was
in anyway.

The digest-at-equal-marker rule closes the gap that second-granularity timestamps would otherwise leave
open. Without it, an authority could publish two different artifacts in the same second and a verifier
would accept whichever arrived, silently. Treating that as equivocation rather than as a tie makes a
publisher error loud instead of exploitable.

Certificate transparency is rejected because it addresses a problem this architecture does not have.
Transparency logs exist to make *issued certificates* auditable, and there is no issuing authority here
(ADR-025). Adopting it would add log servers, monitors, gossip and inclusion proofs — a substantial
distributed system — to detect misissuance by an issuer that does not exist.

Mirrors are rejected on the same principle. They would improve availability, and availability failures
here already fail closed, so a mirror would add infrastructure, key distribution and a new class of
disagreement between copies in exchange for turning a safe outcome into a convenient one.

Stating the two absent guarantees explicitly is deliberate. A verifier that believes it has set
consistency will design around a property it does not have, and finding out when two artifacts disagree
is the worst moment to learn it.

## Alternatives considered

**Certificate transparency with public logs.** Rejected: it solves misissuance by a central issuer, and
there is no central issuer.

**Mirrors for availability.** Rejected. Unavailability already fails closed; mirrors trade real
complexity for convenience.

**Reject any equal marker outright.** Simpler and wrong: legitimate re-observation of the same artifact
would fail, so caching and retries would break.

**Accept the newest artifact by wall-clock time.** Rejected — it depends on the verifier's clock and on
the adversary not controlling delivery order, and the adversary controls delivery order.

## Consequences

- Serving an older valid artifact fails closed once the verifier has seen a newer one.
- Publisher equivocation at a single marker is detected rather than silently resolved.
- A first-time verifier with no prior state cannot know it is being shown an old version, and this is a
  real limit rather than an implementation gap.
- Verifiers must persist a small amount of state, which is the entire cost.
- Set consistency and cross-observer consistency remain unprovided, and are stated as absent wherever
  the trust model is described.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/trust-freshness.md`](../../spec/trust-freshness.md)
- [`conformance/vectors/trust-freshness.json`](../../conformance/vectors/trust-freshness.json)
- [`spec/federation/FEDERATION_INVARIANTS.md`](../../spec/federation/FEDERATION_INVARIANTS.md)
