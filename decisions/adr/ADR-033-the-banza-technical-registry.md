# ADR-033 — The BANZA Technical Registry

## Context

Certification records and profiles are only useful if they can be found and checked by someone who did
not receive them directly. That needs a published index.

An index of this kind is read as more than it is. A list published by the party that defines the
protocol, naming implementations and their certification standing, looks like a list of approved
participants — and in a financial context, like a list of institutions someone has vetted. Whatever the
accompanying text says, the shape of the artifact carries that meaning unless the architecture prevents
it.

## Decision

**The registry is the single public, append-mostly, root-verifiable index of technical certification
facts, verifiable by anyone with no account, and independent of any scheme's participant directory.**

It holds published certification profiles, certification records, and the signed, dated revocation list.
It holds no funds, no accounts, no personal data and no scheme membership.

**Verification needs no account and no privileged endpoint.** A reader re-runs the profile's public
vectors against the implementation's artifacts, reproduces the evidence digests, and checks the record
against root-signed protocol metadata. There is no certificate chain and no authority to consult.

**The registry is not a participant directory.** Presence means "this implementation holds this
certification record" and never "this entity is admitted to a scheme" or "authorised by a regulator".
The technical registry and any scheme's directory are separate artifacts with separate owners, and
neither is derivable from the other.

**Append-mostly.** Records are added and superseded rather than rewritten; withdrawal is expressed as a
signed, dated revocation rather than a deletion, so the absence of a record and the revocation of one
are different, visible facts.

## Rationale

Independent verifiability is what stops the registry from being an authority. If a reader had to trust
the registry's contents, the registry would be making the claim — and would then be the central body
this architecture removed. Because every entry can be re-derived from public material, the registry is
an index of things a reader can check for themselves, and its failure mode is being out of date rather
than being believed wrongly.

Append-mostly is what makes revocation legible. If withdrawal were deletion, a revoked implementation
and one that never registered would look identical, and a peer could not distinguish "no evidence" from
"evidence withdrawn" — which are very different signals.

The separation from any scheme directory is the structural half of ADR-005. Non-propagation stated in
prose is a policy; two artifacts with different owners, neither derivable from the other, is an
architecture.

Simplicity: an index that vouches for nothing needs no governance process for admission, no appeals, and
no criteria beyond the ones the vectors already encode.

## Alternatives considered

**No registry; let implementations publish and be found by discovery alone.** Coherent, and rejected
because a verifier resolving an identifier needs somewhere to start, and without a common index that
starting point becomes bilateral arrangement.

**A registry that also records scheme membership.** Rejected: it would merge two determinations with
different owners into one artifact, which is exactly the conflation ADR-005 forbids.

**Mutable records updated in place.** Rejected. It erases the difference between never-registered and
revoked, and removes the audit trail that makes the index checkable over time.

**Access-controlled registry access.** Rejected: the reader who most needs to verify is a stranger to
everyone involved.

## Consequences

- Anyone can verify any entry without an account, a credential or permission.
- The registry can be replicated by anyone, so it is not a control point.
- Revocation and absence remain distinguishable permanently.
- Being listed confers nothing, which must be restated wherever the registry is presented.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/public-protocol-registry.production.schema.json`](../../contracts/production/public-protocol-registry.production.schema.json)
- [`contracts/production/implementation-record.production.schema.json`](../../contracts/production/implementation-record.production.schema.json)
- [`contracts/production/operator-record.production.schema.json`](../../contracts/production/operator-record.production.schema.json)
- [`contracts/production/brl.production.schema.json`](../../contracts/production/brl.production.schema.json) — the revocation list
