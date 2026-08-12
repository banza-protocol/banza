# Conflict-of-Interest Report — M2.19C

**Milestone:** M2.19C — Three-Layer Institutional Architecture, a build submilestone of the
M2.19-FINAL v1 launch program.
**Branch:** `release/m2-19c-three-layer-architecture` · **Base:** `96f030e`.
**Decisions of record:** ADR-063 (conflict-of-interest + infrastructure/key separation, companion M2.19C
decision) and [ADR-060 D-060-05](../../decisions/adr/ADR-060-banzami-operational-scheme.md) (no
self-privilege), within the frame of
[ADR-059](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md).

## Why this ran

ADR-043 names **Banzami — Tecnologia e Serviços, Lda.** as the creator and initial maintainer of the open
protocol; ADR-060 names the same entity as the designated operator of the first operational scheme (L3). The
creator being also the first operator is a structural conflict of interest. Left unaddressed, it invites the
collapse of three distinct things into one brand — protocol (open), certification (non-exclusive) and scheme
(one operator) — and the appearance that Banzami's own implementation gets easier treatment. M2.19C had to
foreclose this **structurally**, not by promise.

## What M2.19C delivered for this domain

**No self-privilege, as a rule (ADR-060 D-060-05; ADR-063).** Banzami's own implementation is certified
through exactly the same public, versioned profile, the same conformance and interoperability suites, the
same Rust engine, the same reason codes, the same validity and the same revocation as any other
implementation, and is independently verifiable. Concretely, and canonical: **no reduced profile, no private
certification, no bypass, no reserved endpoint, no publication without evidence, no FAIL→PASS override, no
secret exception.**

**Separation as an invariant (ADR-059 D-059-06; ADR-063).** The three layers are separated by
responsibility, infrastructure, databases, schemas, roles, keys, secrets, logs, backups, retention,
pipelines, monitoring and permissions; keys are never reused across domains. Load-bearing separations,
canonical: **BANZA ≠ Banzami**; **Technical Certification (L2) ≠ Scheme Admission (L3) ≠ Regulatory
Authorisation**; **Technical Registry (L2) ≠ Scheme Participant Directory (L3)**.

**Neutrality preserved (ADR-059 D-059-07; ADR-060 D-060-03/04/06/07).** Certification is not exclusive to the
Banzami scheme; other legally-eligible entities may run independent schemes; an implementation may be
certified without scheme admission; the technical registry does not depend on any scheme's participant
directory; public verification requires no Banzami account; and protocol continuity is independent of scheme
continuity. Operador Zero is a demonstration reference implementation, never a scheme participant
(ADR-052/053).

**Anchored in the L3 artifact (this slice).** The conflict-of-interest and separation posture is not only
prose: the regulatory-state contract encodes the honest boundary in machine-verifiable form —
`certification_is_not_admission_is_not_authorisation` (const true), `banzami_presented_as_authorised` and
`authorisation_granted` (const false), and the `operator` field carries no privilege (naming an operator
there does not make BANZA an operator and does not make certification exclusive to the scheme). Files:
`contracts/production/regulatory-state.production.schema.json` +
`contracts/production/examples/regulatory-state.valid.json` +
`contracts/production/examples/regulatory-state.invalid-authorised-claim.json`.

## Gates

| Gate | Target | This slice |
|---|---|---|
| Same public profile / suites / engine for Banzami's implementation | held | recorded in ADR-060 D-060-05 / ADR-063; no reduced-profile path introduced |
| No reserved endpoint / private certification / bypass / FAIL→PASS / secret exception | none | none introduced by this slice; L3 artifact carries no privilege field |
| BANZA ≠ Banzami; registry ≠ scheme directory; certification ≠ admission ≠ authorisation | held | asserted in ADRs and in the schema `boundary` |
| No publication without evidence | held | `evidence_refs` empty at baseline; `real_*` + `bna_approval_claimed` const false |
| `protocol-scheme-separation` / `banzami-scheme-role` guards (M2.19C) | pass | delivered by the sibling M2.19C slices; run in the final battery |
| `identity-check` / `identity-guard` | pass | Banzami allowed only on ADR-059..063, `docs/governance/*.md`, `*_REPORT.md`, `regulatory-state.*`; payment-operator brands stay blocked everywhere |

## Verification

- Schema + both examples are valid JSON — `node -e require`: **OK**.
- The L3 artifact carries no self-privilege field and its `boundary` rejects an "authorised / real money"
  claim (the invalid example is rejected on 10 const/boundary violations).
- **Full guards battery + builds + CI + deploy + public-edge live-QA: pending.** Finalised to
  **COMPLETE + LIVE** by the orchestrator after the M2.19C final battery and production deploy.

## Status

**PENDING FINAL BATTERY + DEPLOY.** The conflict-of-interest boundary is delivered structurally on-branch;
full-battery, CI, deploy and live-QA verification is completed by the orchestrator.

## References

- ADR-063 — conflict-of-interest + infrastructure/key separation (companion M2.19C decision)
- [ADR-060](../../decisions/adr/ADR-060-banzami-operational-scheme.md) — Banzami Operational Scheme (D-060-05
  no self-privilege)
- [ADR-059](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md) — three-layer architecture
- ADR-043 — licence, NOTICE, trademark, open governance, attribution (creator/initial maintainer)
- `contracts/production/regulatory-state.production.schema.json` + `contracts/production/examples/`
