# ADR-030 — Conformance profiles and the capability vocabulary

## Context

"Is this implementation conformant?" is not answerable as asked. An implementation that correctly runs a
sandbox with valid manifests and integer money is conformant to something real; so is one that federates
with peers and settles across operators. They are not conformant to the same thing, and a single
yes-or-no answer either excludes the first or overstates the second.

The second half of the problem is naming. Two implementations describe the same ability differently —
one says it supports payment intents, another says intents are supported — and a verifier comparing
declarations against requirements has to guess whether they mean the same thing.

## Decision

**Conformance is scoped by profile, and capabilities are named from one canonical registry with exact
matching.**

Five profiles, cumulative, each defined by what an implementation must demonstrate:

| Profile | What it demonstrates |
|---|---|
| **L0** | The protocol instantiated safely: reachable, valid manifest, simulated, integer money |
| **L1** | Core payment capability: accounts, transfers, double-entry ledger, idempotency, traceability |
| **L2** | Payment initiation: intents and their surfaces, dynamic QR, instant execution |
| **L3** | Inter-operator interoperability: federation routing, reconciliation, inter-operator settlement, signed protocol metadata |
| **L4** | The full surface at production strength |

A profile is a **scope of demonstration**, never a status, a grade or an entitlement. A higher profile
is not a better organisation; it is a larger set of vectors that passed.

**Capabilities** come from one registry, and matching is exact — no case folding, no hyphen or plural
normalisation, no aliases. A declaration satisfies a profile requirement when the identifiers are
identical.

These profile levels are **not** the institutional layers of ADR-004. A profile describes what an
implementation demonstrated; a layer describes who is responsible for what. Neither numbering implies
the other, and surfaces say which one they mean rather than using a bare number.

## Rationale

Profiles are cumulative because capability genuinely nests: federation is not meaningful without a
ledger underneath it, so a profile that permitted federation without core payments would certify
something that cannot exist. Cumulative profiles also mean a verifier needing a specific capability can
reason about a single level rather than a set.

Exact capability matching is the decision most likely to be softened, and it must not be. Every
normalisation rule — case, plural, separator — is a place where two implementations can disagree about
whether a requirement is met, and the disagreement surfaces as a failed interoperation with no error
attributable to either side. Exactness converts an ambiguity into a validation failure at declaration
time, which is where it can be fixed.

Keeping profiles descriptive rather than evaluative is what keeps them honest. A profile that reads as a
rank invites the conflation ADR-005 forbids, where a level becomes a proxy for trustworthiness rather
than a statement about which vectors ran.

## Alternatives considered

**A single conformance yes/no.** Rejected: it forces one threshold on implementations with different
purposes, and either excludes early implementations or claims too much for them.

**Free-form capability strings.** Rejected. It makes requirement matching a fuzzy comparison, and fuzzy
comparison in a trust evaluation is a way to accept something that was never declared.

**Capability aliases for convenience.** Rejected for the same reason with a friendlier face: an alias
table is a second vocabulary that must be maintained in every implementation, and disagreement between
alias tables is undetectable.

**Independent, non-cumulative capability badges.** Considered seriously. Rejected because capabilities
have real dependencies, and a badge set would let an implementation claim federation without the ledger
that federation assumes.

## Consequences

- An implementation states precisely what it demonstrated, and a verifier reads it without
  interpretation.
- Early implementations have a meaningful profile to reach rather than an all-or-nothing gate.
- Capability identifiers are permanent: renaming one breaks every declaration that used it.
- Profile numbering coexists with layer numbering and will be confused unless every surface names which
  it means.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json)
- [`contracts/production/capability-registry.production.json`](../../contracts/production/capability-registry.production.json)
- [`spec/capabilities.md`](../../spec/capabilities.md)
- [`spec/capability-negotiation.md`](../../spec/capability-negotiation.md)
