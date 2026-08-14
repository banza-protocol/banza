# ADR-008 — Normative authority and versioning

## Context

A repository that publishes specifications, contracts, schemas, vectors, decision records, governance
documents and a reference implementation has a problem it rarely admits: when two of them disagree, an
implementer has no way to know which one is wrong. Left unanswered, authority defaults to whatever the
reader happened to read first, and in practice to the reference implementation — the one artifact that
can be executed.

The second question is when the protocol's version changes, and the trap there is versioning by
activity rather than by compatibility: publishing something new feels like a change, so the number
moves, and consumers who were compatible are told they are not.

## Decision

**Normative authority is enumerated, not inferred. The protocol version is `1.0.0` and changes only on a
wire-incompatible change to a production contract.**

**The Normative Manifest** — [`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json) —
lists every artifact that defines a requirement, each with a digest. If a rule is not reachable from
that manifest, it is not normative, whatever the document containing it says about itself. Decision
records, governance documents, guides and the reference implementation are outside it by construction.

**Versioning follows compatibility.** Publishing a rule that was previously implicit completes the
existing surface rather than changing it: the documents on the wire are byte-for-byte what they were,
so consumers that were conformant remain conformant. A version change is reserved for a change that
would break them.

**Canonicalization is versioned separately** as `BCJ/1` (ADR-011), because it has its own lifecycle and
a future change to it should not move the protocol version. Signed artifacts declare which
canonicalization produced them, so an artifact produced under the published rule is distinguishable
from one produced under an implementation's undocumented behaviour rather than ambiguously "a BANZA
signature".

## Rationale

An enumerated manifest with digests is the smallest construction that answers "is this normative?"
mechanically. A convention — "everything in `contracts/` is normative" — sounds equivalent and is not:
it cannot express that one file in that directory is an example, and it silently absorbs whatever
anyone adds later.

Digests matter because the answer must survive editing. Without them the manifest identifies file names,
and a file's meaning can change entirely while its name does not.

The negative half — naming what is *not* normative, especially the reference implementation — is the
part that does real work. Executable code is the most persuasive artifact in any repository, and
without an explicit statement that it defines nothing, it becomes the specification by default.

Robustness under independent implementation: an implementer needs a finite, checkable list of what they
must satisfy. The manifest is that list, and the delete-the-records test (ADR-010) keeps it sufficient.

## Alternatives considered

**Authority by directory convention.** Rejected: it cannot distinguish an example from a requirement,
and it grows silently.

**Every document declares its own status.** Rejected — and it was tried. Self-declaration produces
documents that call themselves canonical because their author believed it, and nothing reconciles two
that both do.

**Version the protocol on every published change.** Rejected. It would signal incompatibility that does
not exist and train consumers to ignore the version.

## Consequences

- Any question of "does this bind me?" has one mechanical answer.
- Adding a normative artifact is a deliberate act: the manifest must be regenerated and digests change.
- Publishing an implicit rule is a completion, not a version change, so `1.0.0` remains stable while the
  surface is finished.
- Canonicalization can evolve to `BCJ/2` without touching the protocol version.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json)
- [`contracts/production/protocol-version.json`](../../contracts/production/protocol-version.json)
- [`spec/canonicalization.md`](../../spec/canonicalization.md)
