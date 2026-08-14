# ADR-006 — The designated operator and its conflict of interest

## Context

The party that designed BANZA also intends to run the first scheme built on it. That is how a protocol
gets a first real implementation, and it is a structural conflict of interest: the same party writes the
rules, operates the conformance system that applies them, and is measured by it.

The conflict cannot be resolved by good intentions, because the parties who need assurance — other
operators, counterparties, a regulator — have no way to verify intentions. It has to be resolved by
architecture, or it is not resolved.

## Decision

**Banzami — Tecnologia e Serviços, Lda. is the designated operator of the first operational scheme built
on BANZA, and receives no privilege of any kind from that position. The conflict is controlled
structurally, so that its control does not depend on Banzami's conduct and can be verified by anyone.**

Three controls, each independently checkable:

**No self-privilege.** Banzami's own implementation is certified through the same public versioned
profile, the same suites, the same engine, the same reason codes, the same validity window and the same
revocation path as any other implementation. No reduced profile, no private certification, no reserved
endpoint, no publication without evidence, no override of a negative result. A failing result for
Banzami's implementation is a failure exactly as for anyone else, and no human converts it.

**Separated infrastructure.** Protocol serving, certification and registry, the human interface, scheme
administration, and any future regulated-data domain are separate — separate databases, roles, keys,
secrets, logs, backups and pipelines. No component of one may read, write or grant a privilege in
another.

**Separated keys.** No key is reused across domains. Protocol metadata signing, certification records,
interface service keys, scheme administration and operator-held implementation keys are distinct, and a
key signs within exactly one domain.

Being the first scheme confers nothing on the protocol side: certification is never "certified for this
scheme", and other legally eligible entities may run independent schemes. The architecture assumes more
than one scheme will exist.

## Rationale

The controls are chosen so that the *absence* of privilege is observable. A third party can re-run the
public vectors and reproduce Banzami's result without an account; can see that the registry is not the
scheme's participant directory; and can see that a certification record verifies against root-signed
metadata rather than against the scheme. None of that requires believing anyone.

Key separation carries most of the weight. Shared infrastructure can be audited only by whoever has
access, but a key that signs in one domain and is absent from another is a cryptographic fact. It is
also the cheapest of the three controls to maintain and the hardest to erode accidentally.

Naming the designated operator explicitly, rather than leaving it implicit, is deliberate: an unnamed
conflict is not controlled, only unmentioned.

## Alternatives considered

**Do not name a first operator; let the ecosystem produce one.** Rejected as a fiction — the conflict
exists whether or not it is written down, and an unnamed conflict cannot be structurally controlled.

**Give the designated operator a privileged path to reach production faster.** Rejected outright: it
would make every subsequent certification meaningless, since a reader could not tell which results came
through the real path.

**Have an external body certify the designated operator.** Rejected because it reintroduces a central
authority over participation, which is the thing the trust model exists to remove (ADR-025).
Reproducible public vectors give a stronger property than an external opinion: anyone can check, not
just the appointed body.

## Consequences

- The ecosystem gets a real first scheme with an accountable, named operator.
- The designated operator carries the full cost of the public path, with no shortcut.
- Separated infrastructure and keys are permanent operational overhead, and that overhead is the
  guarantee.
- If the scheme changed, paused or ceased, the protocol, its engines, vectors, certification and
  registry remain available to everyone else.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json) — the profiles applied to every implementation alike
- [`contracts/production/certification-record.production.schema.json`](../../contracts/production/certification-record.production.schema.json)
