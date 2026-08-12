# ADR-085 — Anti-rollback for versioned trust material

- **Status:** Accepted
- **Date:** 2026-08
- **Relates:** ADR-038 (trust model), ADR-079 (Model A signing), ADR-083 (reason codes), ADR-081 (versioning)
- **Normative specification:** [`spec/trust-freshness.md`](../../spec/trust-freshness.md)

## Context

The trust-availability audit measured the published surface against twenty questions. Most were already
answered normatively: manifests are cacheable with a stated TTL, the BRL has a six-hour staleness bound,
expired material is untrusted, and evaluation fails closed on missing or stale material.

Two came back empty, and they are different problems.

**No anti-rollback rule existed.** Trust artifacts carry issuance instants and validity windows, and a
verifier could accept an older but still validly signed and still unexpired artifact after having
already accepted a newer one. Nothing forbade it. An attacker able to control what a publication origin
returns — without any signing key — could serve a superseded Key Manifest or a superseded BRL, and a
conformant verifier had no defined reason to refuse.

**No redundant distribution exists.** Trust material is published at a single canonical origin.

## Decision

**Adopt monotonic anti-rollback. Do not adopt Certificate Transparency. Do not add mirrors.**

### D-085-01 · Acceptance is monotonic per object and authority

A verifier maintains the highest accepted ordering value per `(artifact_type, authority_identity)` and
rejects any artifact whose ordering value is lower, fail-closed, with `trust_version_rollback`. Equal is
accepted — re-fetching the current artifact is normal.

### D-085-02 · Order on members the artifacts already declare

`issued_at` for the BRL and for signed protocol metadata; `not_before` for the Key Manifest. Each is
already REQUIRED by its contract, already means "when this version came into force", and is already
inside the signed bytes, so it cannot be altered without invalidating the signature.

**No wire form changes and no field is added.** Introducing an integer sequence would change artifacts
under a protocol version that does not change (ADR-081). Where a future artifact declares an explicit
sequence, that sequence takes precedence.

### D-085-03 · Schema and format versions are out of scope

`schema_version` and `protocol_version` identify a document format, not a position in a sequence.
Applying monotonicity to them would be an invented constraint on values that legitimately do not
increase.

### D-085-04 · The mark survives restart and concurrency

Memory-only state is not conformant — restarting is the cheapest way to clear the defence. Concurrent
updates must be atomic per key. The specification defines observable behaviour; it prescribes no storage
technology.

### D-085-05 · What this does NOT provide is normative text, not a caveat

`spec/trust-freshness.md` §1 states that the rule does not address first-observation staleness, global
equivocation, suppression, or availability. That section is part of the specification and must survive
any restatement.

The failure mode this guards against is not technical: it is describing a stateful local defence as
though it were transparency.

## Alternatives considered

**Certificate Transparency (RFC 9162).** Rejected for the 1.0.0 core. CT would address precisely what
monotonicity does not — append-only history, inclusion and consistency proofs, cross-observer auditing.
That makes it the right technique for those threats and the wrong one to adopt now: it requires log
infrastructure, log operators, auditors and monitors, and BANZA has no operator, no certificate and no
production traffic for such a log to protect. Recorded as related work with the threats it would cover.

**Mirrors of the publication origin.** Rejected for this milestone, and kept separate from CT because it
solves a different problem. Redistributing already-signed artifacts would address availability; it would
not address history or equivocation, since a mirror can withhold or serve stale content exactly as an
origin can. No normative promise currently depends on redundant distribution.

**An integer sequence number on each artifact.** Rejected: it changes the wire form to obtain an ordering
that the existing required members already provide.

**A global `max(version)` across artifacts.** Rejected as incorrect. Independent objects from independent
authorities have independent sequences; comparing them would make one authority's publication suppress
another's.

## Consequences

- A verifier that has accepted a version will not later accept an older one for the same object.
- Verifiers must persist a small amount of state across restarts. This is the first BANZA rule requiring
  verifier-side durable state, and it is stated as observable behaviour rather than as storage.
- `trust_version_rollback` joins the core reason-code registry; adding a core code is backward
  compatible under ADR-081.
- The single-origin publication limitation is now recorded explicitly rather than left implicit.
- `protocol_version` does not change. No artifact changes shape, and no artifact that was valid becomes
  invalid. What changes is that a scenario previously without specified behaviour now has one — recorded
  honestly as a normative change to acceptance, not presented as a clarification.

## Boundary

This ADR constrains which trust artifacts a verifier may accept. It does not alter the Trust Root, the
custody model, the signing chain, key rotation, or what any artifact means. It confers no authority on
any party and changes no certification, admission or authorisation.
