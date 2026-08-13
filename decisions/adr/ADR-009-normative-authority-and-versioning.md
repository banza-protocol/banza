# ADR-009 — Normative authority and versioning

- **Status:** Accepted
- **Date:** 2026-08
- **Relates:** ADR-010 (BANZA Canonical JSON), ADR-027 (Canonical Trust Signing Model — Model A), ADR-027 (domain separation), ADR-001 (Open Financial Protocol)
- **Audit basis:** the v1.0 normative-completeness audit, finding **F-01 (P0)** — no single canonical byte form for signing and digesting. The audit record is not kept; this ADR is the durable outcome.

## Context

The normative-completeness audit established that the canonical byte form on which every BANZA signature
and digest depends is **not specified anywhere in the public surface**. It exists only as
`serde_json::to_string()` inside `engines/banza-trust/src/lib.rs`, and the production schemas
simultaneously promise that the resulting digests are *"recalculável por qualquer verificador
independente"*.

Specifying that rule for the first time changes the bytes that are signed and hashed. Before any code is
touched, this ADR determines **whether the remediation may remain BANZA v1.0 or requires a new protocol
version**, because the answer governs every subsequent phase.

The determination must not be made from generic SemVer intuition. The following facts were verified in
the repository and against the live surface at the time of writing:

| Fact | Value | Source |
|---|---|---|
| Declared protocol version | `1.0.0`, state `M2_PROTOCOL_IMPLEMENTATION` | `contracts/production/protocol-version.json` |
| Pre-production | `pre_production: true` | ibid. |
| Production operators | `operators: []` | ibid. |
| Active production certificates | `production_certificates: false` | ibid. |
| Repository's own policy | *"A new major protocol_version is required for any **wire-incompatible change to a production contract**. Minor versions are additive and backward compatible."* | ibid. |
| Live signed artifacts | Operator Zero publishes signed protocol metadata, `demo_only: true`, `monetary_value: false` | `https://zero.banza.network/.well-known/banza/signed-protocol-metadata.json` |
| Committed federation fixtures | Carry **placeholder** signatures (all-`A` base64) — they do not depend on real canonical bytes | `conformance/fixtures/federation/*` |
| Signed artifacts containing floats | **0** `type: number` fields across all signed artifact schemas | contracts audit |

## Decision

**The protocol version remains `1.0.0`. The canonicalization rule is published as a separately versioned
artifact, `BANZA Canonical JSON version 1` (`BCJ/1`), and signed artifacts declare which canonicalization
produced them.**

Three parts, each load-bearing:

1. **`protocol_version` stays `1.0.0`.** No production contract changes its wire shape. The JSON documents
   an implementation exchanges are byte-for-byte the same documents; what changes is the previously
   unpublished serialisation used to derive signing input. Under the repository's own policy the trigger
   for a major version is a *wire-incompatible change to a production contract*, and no such change occurs.

2. **Canonicalization is versioned independently as `BCJ/1`.** It is a distinct normative mechanism with a
   distinct lifecycle, and giving it its own identifier means a future change to canonicalization can be
   versioned precisely without moving the whole protocol version.

3. **Signed artifacts declare their canonicalization.** Artifacts produced under `BCJ/1` state so. This is
   what makes the transition non-silent: an artifact signed under the prior, undocumented reference
   behaviour is distinguishable from one signed under the published rule, rather than being ambiguously
   "a BANZA signature".

## Rationale

**You cannot break compatibility with a rule that was never published.** The audit's central finding is
that no third party could have implemented BANZA's signing correctly, because the required rule was absent
from the public surface. It follows that no *conforming* independent implementation can exist to be
treating the prior behaviour as an implementation artefact of an incomplete specification rather than as a
published commitment.

**The pre-production facts support, but do not by themselves justify, the decision.** Zero production
operators, zero active certifications and real money disabled mean nothing of value depends on the prior
bytes; the only live signed artifact is explicitly `demo_only`. These facts are recorded because they
bound the blast radius — but they are deliberately *not* the primary reason. Pre-production status does
not license silent versioning, and this ADR does not treat it as doing so.

**Bytes do change, and that is stated rather than minimised.** Every artifact signed or hashed under the
prior behaviour becomes unverifiable under `BCJ/1`. This ADR does not claim otherwise; it requires
regeneration and a migration note, and it introduces the canonicalization identifier precisely so that old
and new artifacts can never be silently mixed.

### Alternatives considered

**Bump to `2.0.0`.** Rejected. A major version asserts that a published contract was broken. Nothing that
was published is broken — what was published was *incomplete*. Declaring 2.0 would misdescribe the change
to any future reader and would falsely imply that v1.0 had a canonicalization to supersede.

**Bump to `1.1.0`.** Rejected, though closer. A minor version asserts additive, backward-compatible
change. The specification addition is indeed additive, but calling the byte change "backward compatible"
would be inaccurate, and moving the protocol version would also put the frozen canonical Whitepaper —
which states *"A versão actual do protocolo é a 1.0"* — immediately out of date for a reason unrelated to
its content.

**Patch `1.0.1`.** Rejected as insufficiently expressive: a patch is documentation or clarification only,
and this remediation adds a normative mechanism that did not exist.

**Keep `1.0.0` with no canonicalization identifier.** Rejected. It would leave old and new artifacts
indistinguishable, which is exactly the silent mixing the remediation is required to prevent.

## Consequences

- `contracts/production/protocol-version.json` keeps `protocol_version: 1.0.0`; a `canonicalization` field
  identifies `BCJ/1` as the canonicalization in force for the version.
- **Measured migration impact: none.** This ADR initially assumed that publishing the rule would change
  the bytes and require regenerating every signed artifact. That assumption was tested rather than
  trusted, and it is false for BANZA's actual artifacts. `BCJ/1` and the prior reference behaviour
  coincide whenever member names are ASCII, numbers are integers within ±(2⁵³−1) and no floats or control
  characters appear — which is true of every artifact BANZA produces. Evidence:
  `engines/banza-trust/tests/canonical_migration.rs` asserts byte-identity across signed protocol
  metadata, trust root metadata, operator manifest, conformance evidence, registry entry and the BRL, and
  asserts that a signature produced under the prior behaviour **still verifies** under `BCJ/1`; the live
  Operator Zero artifact was checked independently (19 members, all-ASCII names, all integers safe).
- **No artifact requires regeneration.** The transition is a specification change, not a data migration.
  The canonicalization identifier is therefore a forward-looking guard — it makes any *future* change
  detectable — rather than a marker separating two incompatible artifact generations.
- A migration note records the transition, the scope of the check and the conditions under which the
  equivalence would cease to hold (a non-ASCII member name, a float, or an out-of-range integer).
- The canonical Whitepaper remains accurate: the current protocol version is 1.0.
- Future canonicalization changes are versioned as `BCJ/2…` and are governed by their own compatibility
  analysis, independently of `protocol_version`.

## Boundary

This ADR decides versioning only. It does not choose the canonicalization algorithm — that is ADR-010 —
and it grants no authority to alter protocol semantics, contracts, profiles, trust model or governance.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/protocol-version.json`](../../contracts/production/protocol-version.json)
