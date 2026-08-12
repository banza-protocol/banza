# ADR-083 — Reason-code model

- **Status:** Accepted
- **Date:** 2026-08
- **Relates:** ADR-081 (versioning), ADR-076 (journey receipts), ADR-068 (endpoint-originated validation), ADR-040 (Open Trust Evaluation)
- **Audit basis:** clean-room blocker **X-04**; audit finding **F-05**, and the field-level half of **F-07**
- **Normative specification:** [`spec/reason-codes.md`](../../spec/reason-codes.md)
- **Machine-readable registry:** [`contracts/production/reason-code-registry.production.json`](../../contracts/production/reason-code-registry.production.json)

## Context

The remediation milestone established that five BANZA vocabularies were already closed (certification
records, revocation entries, root revocation, the BRL, and the Open Trust Evaluation check ids) and that
three fields remained open string arrays: `failed_checks`, and `reason_codes` on the journey receipt and
the operation receipt.

The final verification pass then found the more serious part. Three vocabularies existed **only in the
reference implementation**:

| Vocabulary | Where it lived | Values |
|---|---|---|
| `trust_status` | `engines/banza-trust/src/evaluate.rs` | 13 |
| Artifact-fetch reason codes | `engines/banza-artifact-fetcher/src/types.rs` | 27 |
| Engine status → step status mapping | `engines/banza-target-registry/src/verdict.rs` | 6 steps |

None appeared in any contract. `trust_status` is the field the entire trust verdict rests on, and a
clean-room implementation could not have produced or interpreted a single one of these values.

## Decision

**Publish a core registry with a reserved extension namespace, and keep the vocabularies separate.**

1. **Five vocabularies, never one enum.** Merging a trust status, a fetch failure, a journey step status
   and a check identifier into one space would make each of them less precise and would invite exactly the
   universal-error-taxonomy expansion this milestone forbids.

2. **A status decides; a reason code explains.** This is not a new rule — it is what the reference
   implementation already does, where `verdict.rs` derives reason codes *from* the engine status. Stating
   it makes the rest follow: unknown reason codes are safe to tolerate precisely because they cannot
   change a verdict.

3. **Closed enums stay closed.** `trust_status`, journey step status and `failed_checks` are decisional.
   A value outside them is schema-invalid, because there is no safe way to act on a decision you cannot
   read.

4. **`failed_checks` references the existing check-id registry.** It does not define a second vocabulary.
   The check ids in `contracts/federation/federation-trust.json` are already published and closed; the
   field's defect was that its schema did not say so.

5. **Extensions are namespaced `x-vendor.code`.** Core codes contain no `.`, so collision is impossible by
   construction rather than by convention. Extensions are preserved, never interpreted, never
   verdict-affecting.

6. **Unknown core-shaped codes are preserved, not rejected.** Adding a core code is backward compatible
   under ADR-081; rejecting unknown codes would make every future addition a breaking change.

## Alternatives considered

**One universal BANZA error taxonomy.** Rejected. It would require BANZA to have an opinion about
transport errors, scheme declines and operator policy — none of which the protocol defines — and it is the
specific expansion the milestone prohibits.

**Leave `reason_codes` as a free string array and document the values in prose.** Rejected. It is what the
audit found and named a blocker: prose that is not a registry cannot be validated, and a guard cannot hold
the implementation to it.

**Open extension without a namespace.** Rejected. Arbitrary strings alongside core codes make it
impossible for a consumer to tell a BANZA code from a vendor code, and any future core addition could
silently collide with a vendor meaning already in production.

**Promote `trust_status` values into an existing enum such as the certification reason codes.** Rejected.
They answer a different question, for a different producer, at a different layer.

## Consequences

- `trust_status`, the fetch reason codes and the step mapping become normative published artifacts. The
  reference implementation emits them and no longer defines them.
- `failed_checks` and the two `reason_codes` fields gain published semantics; the schemas reference the
  registry rather than accepting free text.
- Semantic equivalence of receipts becomes definable and testable (`spec/reason-codes.md` §8), which
  closes the field-level half of F-07.
- A latent defect was recorded rather than silently fixed: `verdict.rs` maps `TRUST_INCOMPLETE`, which is
  not in `STATUS_VALUES` and therefore cannot occur. It is registered as a reference-implementation
  defect, not as a protocol value.
- `protocol_version` does not change. Publishing an implicit rule is completion of the 1.0.0 surface
  (ADR-081).

## Boundary

This ADR defines how outcomes are *named and explained*. It does not define what is evaluated, by whom, or
with what authority — those remain ADR-040, ADR-068 and ADR-076. It confers no certification meaning: a
reason code never certifies, admits, authorises or moves funds.
