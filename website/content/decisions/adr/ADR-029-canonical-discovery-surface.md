# ADR-029 — Canonical discovery surface

## Context

Before a verifier can evaluate anything, it has to find the material. Discovery is the first step of
every trust evaluation, and it is the step where an ambiguous specification does the most damage: if two
implementations look in two places, they do not fail loudly — one simply concludes that no evidence
exists and declines to interoperate, which is indistinguishable from the peer being unreachable.

The ambiguity is easy to create. A path can be conventional or configured, singular or plural, at the
root or under a well-known prefix, and every one of those choices is defensible in isolation.

## Decision

**Discovery is at fixed, well-known paths under a single prefix, on the origin the implementation
controls.**

Two artifacts anchor it: an **operator discovery document**, which is the implementation's own
declaration of who it is, what it supports and where its endpoints are; and **signed protocol
metadata**, which establishes which specification versions, schemas and vectors are genuine, with their
digests. Both are served at canonical paths under `.well-known/banza/`.

There is one path per artifact. Alternative locations, root-level aliases and configurable overrides are
not part of the surface — a verifier looks in exactly one place and, finding nothing, concludes there is
nothing (which is fail-closed, and not a judgment about the peer).

Discovery locates material; it establishes nothing about it. The document is a claim by the party
serving it, and every property that matters is established afterwards by signature verification,
evidence checking and revocation (ADR-025).

The origin is the identity. An implementation is reached at the origin the registry resolves for it, and
artifacts are bound to that origin, so material collected from somewhere else is not evidence about this
implementation.

## Rationale

A single canonical path is the only choice that makes absence meaningful. With alternatives, a verifier
that finds nothing must decide whether to keep looking, and two verifiers will decide differently — so
the same peer is discoverable to one and not the other, with no error anywhere.

The well-known prefix is chosen over root paths because it is the established convention for
machine-readable metadata and keeps the protocol out of an implementation's own URL space, where it
would collide with whatever the operator serves at the root.

Serving discovery from the implementation's own origin, rather than from a central directory, is what
keeps the protocol out of the availability path (ADR-002). A central directory would make protocol
infrastructure a dependency of every interoperation.

Robustness under independent implementation: an implementer needs no configuration to be found. Serving
two documents at two fixed paths is the whole obligation.

## Alternatives considered

**Discovery through a central protocol directory.** Rejected: it makes every interoperation depend on
protocol infrastructure being reachable, and makes the directory a control point over participation.

**Configurable discovery paths declared in the registry.** Rejected. It moves an integration decision
into per-participant configuration, and any verifier that has not read that configuration fails to find
a peer that is present.

**DNS-based discovery.** Considered. It is a real option and adds a second resolution system with its
own failure and caching behaviour, for a lookup that HTTPS on a known origin already performs
adequately.

## Consequences

- Every implementation is discoverable identically, with no configuration and no negotiation.
- Absence of a document is unambiguous and fails closed.
- The path set is a permanent compatibility surface: adding an artifact means adding a path, and moving
  one would break every verifier.
- Protocol infrastructure is not in the path of interoperation between two operators.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/discovery-document.production.schema.json`](../../contracts/production/discovery-document.production.schema.json)
- [`contracts/production/capabilities-document.production.schema.json`](../../contracts/production/capabilities-document.production.schema.json)
- [`conformance/manifests/schema.json`](../../conformance/manifests/schema.json)
- [`contracts/federation/federation-manifest.json`](../../contracts/federation/federation-manifest.json)
