# Regulatory-State Boundary Report — M2.19C

**Milestone:** M2.19C — Three-Layer Institutional Architecture, a build submilestone of the
M2.19-FINAL v1 launch program.
**Branch:** `release/m2-19c-three-layer-architecture` · **Base:** `96f030e`.
**Decision of record:** ADR-062 — regulatory-state boundary + RealMoneyActivationGate (companion M2.19C
decision), within the frame of
[ADR-059](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md) and
[ADR-060](../../decisions/adr/ADR-060-banzami-operational-scheme.md).

## Why this ran

Layer 3 introduces the first operational scheme, with Banzami as designated operator conditioned on the
applicable regulatory framework. The scheme's internal regulatory state is
`REGULATORY_AUTHORIZATION_IN_PROGRESS`. That state is easy to misread as "authorised". The launch needed a
**machine-verifiable, fail-closed** artifact that fixes the boundary structurally — so that no surface,
prose or code can present the operator as authorised, and so that real funds, wallets, settlement and
participants stay OFF until formal applicable evidence exists.

`REGULATORY_AUTHORIZATION_IN_PROGRESS` does **not** mean authorisation granted, BNA approval, a completed
licence, regulatory recognition, active financial operation, permission to move funds, real settlement or
active production participants.

## What M2.19C delivered for this domain

**The L3 regulatory-state contract (this slice).**

- `contracts/production/regulatory-state.production.schema.json` — JSON Schema (draft 2020-12), styled after
  the other `contracts/production/*.production.schema.json` (`_spec_version`, `_status`, `_authority`,
  `_boundary`, `additionalProperties:false`, const/enum assertions). Fields: `schema_version`, `scheme_id`,
  `operator`, `state`, `real_money_enabled`, `real_wallets_enabled`, `real_settlement_enabled`,
  `real_participants_active`, `bna_approval_claimed`, `evidence_refs`, `public_statement`, `notes` and a
  `boundary` object.
- `contracts/production/examples/regulatory-state.valid.json` — the current baseline instance:
  `state = REGULATORY_AUTHORIZATION_IN_PROGRESS`, all `real_*` false, `bna_approval_claimed` false,
  `evidence_refs` empty.
- `contracts/production/examples/regulatory-state.invalid-authorised-claim.json` — an instance claiming
  authorisation and real money, provided to be **rejected**.

**Fail-closed baseline, encoded as const (mirroring `root-metadata.production.schema.json`).**

- `real_money_enabled`, `real_wallets_enabled`, `real_settlement_enabled`, `real_participants_active` and
  `bna_approval_claimed` are all **const false** at this baseline. Real money stays OFF while no formal
  applicable evidence exists.
- `state` is a **closed enum** — `NOT_STARTED`, `REGULATORY_AUTHORIZATION_IN_PROGRESS`, `AUTHORISED_PILOT`,
  `AUTHORISED_PRODUCTION`. The future states are reserved so the same shape can describe the state machine,
  but at this baseline schema version they unlock nothing: the `real_*` flags stay const false regardless of
  `state`. Relaxing them requires a future, evidence-conditioned schema version, decided in Rust by the
  RealMoneyActivationGate — never in TypeScript, never by the model.
- The `boundary` object asserts the frontier explicitly: `not_authorised_yet`,
  `no_bna_claim_without_evidence` and `real_money_fail_closed` are **const true**; `authorisation_granted`,
  `banzami_presented_as_authorised`, `replaces_regulator`, `replaces_scheme` are **const false**;
  `certification_is_not_admission_is_not_authorisation` is **const true**.

**Prudent public phrasing.** The canonical baseline wording is carried by `public_statement`:
*"A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem desactivados."*
No "em processo de autorização junto do BNA" language is published: that phrasing is allowed only with
documentary evidence + founders' authorisation + reviewed wording + no confidential content and not readable
as authorisation granted — none of which exists yet.

## Gates

| Gate | Target | This slice |
|---|---|---|
| Baseline instance validates | pass | `regulatory-state.valid.json` → 0 errors |
| Authorised/real-money claim rejected | reject | `regulatory-state.invalid-authorised-claim.json` → 10 const/boundary violations |
| `real_*` + `bna_approval_claimed` fail-closed | const false | enforced in schema; violated by the invalid example (caught) |
| No BNA-approval claim | absent | `bna_approval_claimed` const false; no BNA language on any surface |
| Rust decides state (RealMoneyActivationGate) | held | schema documents Rust-only state decision; no TS/model authority |
| `regulatory-state-claim` guard (M2.19C) | pass | delivered by the sibling M2.19C slice; run in the final battery |

## Verification

- Schema + both examples are valid JSON — `node -e require`: **OK**.
- Contract check (draft-2020 keyword subset the schema uses): valid example **PASS** (0 errors); invalid
  example **REJECT** — `real_money_enabled`/`real_wallets_enabled`/`real_settlement_enabled`/
  `real_participants_active`/`bna_approval_claimed` const-false violations plus the four inverted `boundary`
  assertions.
- **Full guards battery + builds + CI + deploy + public-edge live-QA: pending.** Finalised to
  **COMPLETE + LIVE** by the orchestrator after the M2.19C final battery and production deploy.

## Status

**PENDING FINAL BATTERY + DEPLOY.** The fail-closed baseline is delivered and self-consistent on-branch;
full-battery, CI, deploy and live-QA verification is completed by the orchestrator.

## References

- ADR-062 — regulatory-state boundary + RealMoneyActivationGate (companion M2.19C decision)
- [ADR-059](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md),
  [ADR-060](../../decisions/adr/ADR-060-banzami-operational-scheme.md)
- `contracts/production/regulatory-state.production.schema.json`
- `contracts/production/examples/regulatory-state.valid.json`
- `contracts/production/examples/regulatory-state.invalid-authorised-claim.json`
- `contracts/production/root-metadata.production.schema.json` — the const/boundary style this artifact mirrors
