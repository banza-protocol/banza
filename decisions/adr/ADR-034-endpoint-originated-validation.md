# ADR-034 — Endpoint-originated validation

## Context

Validating an implementation means evaluating its artifacts. Where those artifacts come from decides
what the result means.

The convenient path is to let the implementer supply them: paste a manifest, upload an evidence bundle,
point at a file. Every step of that is easier to build and easier to use, and it produces a result about
a *document* rather than about a running system. An implementation can pass while serving something
entirely different at its actual endpoints, and nothing in the evaluation would notice.

## Decision

**Every artifact in an official validation is obtained from the public endpoints of the implementation
being validated. Nothing supplied by hand enters an official run.**

No pasted content, uploaded file, user-entered URL, local fixture, mock, embedded document or
pre-computed result. The target's origin is resolved from the registry rather than typed by whoever
started the run, so the run cannot be pointed at a different system.

The division of labour is fixed: **the implementation publishes; the validator fetches; engines decide;
receipts fix the result; the registry publishes the verifiable state.** No step of it is a human
judgement.

Every artifact is fetched over a hardened path — the resolved origin, with transport and address
validation — and every receipt binds the verdict to the exact bytes retrieved, by digest, together with
where they came from. A receipt is therefore a statement about a specific origin at a specific moment,
not about a document of unknown provenance.

A local draft tool may exist for pasting and inspecting an artifact while building one, and it is
non-authoritative by construction: it produces no receipt, touches no registry state, and its output is
never an input to an official run.

## Rationale

Origin binding is what makes the result mean what people will take it to mean. Anyone reading a passing
validation concludes that the running system behaves correctly; only endpoint-originated evidence
supports that conclusion. Document-originated evidence supports a much weaker claim that nobody reads it
as making.

Resolving the origin from the registry rather than from user input closes the obvious substitution: with
a typed URL, an implementer could validate a compliant instance and operate a different one. With
registry resolution, the origin evaluated is the origin published.

Hardening the fetch path matters because the fetcher is being aimed at addresses supplied by data. An
unhardened fetcher pointed at attacker-influenced targets is a request-forgery primitive inside
infrastructure that can reach internal services.

Keeping the draft tool is a deliberate concession, and keeping it authority-free is what makes the
concession safe. Implementers genuinely need to check a manifest while writing it; the requirement is
only that doing so produces no artifact anyone can present as a result.

## Alternatives considered

**Accept uploaded artifacts for convenience, marked as self-reported.** Rejected: the marking is
editorial and travels badly, and a result that is technically qualified but visually identical will be
read as a validation.

**Accept a user-entered origin.** Rejected. It permits validating one instance while operating another,
which defeats the purpose while appearing to serve it.

**Fetch from a cached copy for reliability.** Rejected: a cache decouples the verdict from what is
served now, which is the exact property being established.

## Consequences

- A passing validation is a statement about a running, reachable system at a known origin.
- An implementation must be publicly reachable to be validated, which excludes systems that are not yet
  deployed. That is accurate rather than restrictive.
- Fetch failures are ordinary outcomes and fail closed, distinct from decided failures.
- Receipts are reproducible: pinned digests allow a run to be repeated and compared.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/validation-journey.md`](../../spec/validation-journey.md)
- [`contracts/production/validation-journey-state-machine.production.json`](../../contracts/production/validation-journey-state-machine.production.json)
- [`contracts/production/operation-receipt.production.schema.json`](../../contracts/production/operation-receipt.production.schema.json)
- [`contracts/production/journey-receipt.production.schema.json`](../../contracts/production/journey-receipt.production.schema.json)
- [`contracts/openapi/operator-validation.yaml`](../../contracts/openapi/operator-validation.yaml)
