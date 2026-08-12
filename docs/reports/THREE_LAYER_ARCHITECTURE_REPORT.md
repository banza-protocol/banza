# Three-Layer Institutional Architecture Report — M2.19C

**Milestone:** M2.19C — Three-Layer Institutional Architecture, a build submilestone of the
M2.19-FINAL v1 launch program.
**Branch:** `release/m2-19c-three-layer-architecture` · **Base:** `96f030e`.
**Decisions of record:** [ADR-059 — BANZA Three-Layer Institutional Architecture](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md)
and its companion [ADR-060 — Banzami Operational Scheme](../../decisions/adr/ADR-060-banzami-operational-scheme.md).
**Companion M2.19C decisions:** ADR-061 (certification ≠ admission ≠ authorisation), ADR-062
(regulatory-state boundary + RealMoneyActivationGate), ADR-063 (conflict-of-interest + infrastructure/key
separation).

## Why this ran

Approaching v1.0, BANZA needed one canonical **institutional architecture** that a reader, an operator, an
auditor, a regulator and BanzAI itself all reach the same way — so that "what is BANZA, what certifies, and
who operates" is never ambiguous, and so the pieces built later in M2.19D–I (certification, BanzAI
control plane, scheme readiness) attach to a stable frame. The frame had to introduce the first real
operational scheme (Banzami) **without** letting that scheme's existence contaminate the open protocol or
the certification layer — preserving the permanent ADR-001/003 invariant that the protocol is
operator-neutral and outlives any operator.

## What M2.19C delivered for this domain

**The canonical three layers (ADR-059).**

- **L1 — BANZA Protocol.** Open, neutral, verifiable financial protocol: rules, contracts, messages,
  schemas, APIs, invariants, reason codes, technical identity, manifests, signatures, discovery,
  compatibility, profiles, Signed Protocol Metadata, trust, revocation, the technical registry, federation
  and public verification. BANZA is **not** a bank, PSP, wallet, EMI or financial operator; it does not hold
  or move funds, run client accounts, settle, provide financial services, issue licences, or replace the
  regulator or any scheme (D-059-01).
- **L2 — BANZA Conformance & Interoperability Certification.** Per-implementation, evidence-based,
  Rust-decided, reproducible, hash-bound, scoped and time-limited with suspension/revocation. It certifies
  an **implementation**, never generically an entity, and is not a licence, not scheme admission and not
  regulatory authorisation (D-059-02).
- **L3 — Banzami Operational Scheme.** The first operational scheme built on BANZA, with
  **Banzami — Tecnologia e Serviços, Lda.** as the designated operator, conditioned on the applicable
  regulatory framework. Internal state `REGULATORY_AUTHORIZATION_IN_PROGRESS`; every real-money path
  fail-closed until formal evidence exists (D-059-03, ADR-060, ADR-062).

**BanzAI is transversal, not a fourth authority (D-059-04).** It is the canonical human interface across
all three layers; it orients and executes by calling the Rust engines and never decides. Machine/SDK
consumers keep direct API access.

**Authority rule, permanent (D-059-05).** The Rust engines understand, route, execute, validate and
**decide** every terminal, evaluation and state transition. The local Qwen model **explains once** and never
decides, certifies, admits, publishes, activates funds, changes a state or reason code, or substitutes a
regulator. Rust validates before anything is published.

**Separation is an invariant (D-059-06/07).** The layers are separated by responsibility, infrastructure,
databases, schemas, roles, keys, secrets, logs, backups, retention, pipelines, monitoring and permissions;
keys are never reused across domains. Load-bearing separations, canonical: **Technical Certification ≠ Scheme
Admission ≠ Regulatory Authorisation**; **BANZA ≠ Banzami**; **Technical Registry ≠ Scheme Participant
Directory**. Neutrality survives the scheme: certification is non-exclusive; an implementation may be
certified without scheme admission; public verification needs no scheme account; protocol continuity is
independent of scheme continuity.

**L3 machine-verifiable artifact (this slice).** The regulatory-state artifact that pins the L3 baseline is
delivered as a production contract:
- `contracts/production/regulatory-state.production.schema.json` — JSON Schema (draft 2020-12), fail-closed
  baseline (see the Regulatory-State Boundary report).
- `contracts/production/examples/regulatory-state.valid.json` — valid baseline instance.
- `contracts/production/examples/regulatory-state.invalid-authorised-claim.json` — an instance claiming
  authorisation / real money, rejected by the schema.

**Canonical documents.** ADR-059 and ADR-060 point to the governance documents
`docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md` and `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md` as
the canonical prose; those docs and the M2.19C separation/scheme guards are produced by the sibling M2.19C
slices and validated together in the final battery.

## Gates

| Gate | Target | This slice |
|---|---|---|
| Three-layer frame is canonical (ADR-059 accepted; L1/L2/L3 + BanzAI-transversal + authority rule) | present | ADR-059/060 accepted and on-branch |
| Load-bearing separations stated (certification ≠ admission ≠ authorisation; BANZA ≠ Banzami; registry ≠ directory) | present | recorded in ADR-059/060 and mirrored in the L3 schema `boundary` |
| L3 artifact exists and is machine-verifiable | present | `regulatory-state.production.schema.json` + 2 examples |
| Neutrality preserved (no operator dependency in L1/L2; certification non-exclusive) | held | operator named only on L3 surfaces the identity-guard already allows |
| `identity-check` / `identity-guard` | pass | Banzami allowed only on ADR-059..063, `docs/governance/*.md`, `*_REPORT.md`, `regulatory-state.*` |

## Verification

- Schema is valid JSON — `node -e require` on all three JSON files: **OK**.
- Schema contract — valid example **passes**, invalid-authorised-claim example **rejected** (10 const/boundary
  violations) against the draft-2020 keyword subset the schema uses.
- **Full guards battery + builds + CI + deploy + public-edge live-QA: DONE** — see Status.

## Status

**COMPLETE + LIVE** (2026-07-29).

**Merged.** PR #217 → `main` `6dfbecd` (ADRs 059–063, six governance docs, `regulatory-state` schema +
examples, seven M2.19C guards wired into CI, website `decisions.ts` + five ADR mirrors, grounding indexes +
WASM regenerated). Two BanzAI grounding follow-ups closed the "make it groundable" requirement after
post-deploy live-QA exposed gaps: PR #218 (concept resolver maps the five M2.19C concepts to ADR-059..063,
brand-free) and PR #219 (deterministic `def-three-layer-architecture` + `def-operational-scheme` terminals in
`route.rs::critical_entry`, served at pipeline Tier 1 with 0 model). Along the way the M2.5/M2.6 public-surface
and governance-doc guards were reconciled with the L2 "Conformance & Interoperability Certification" vocabulary
(certification *of an implementation* is active; operator/entity certification stays blocked).

**Deployed** to `banza.network` (VPS 82.165.165.97) on 2026-07-29 — website + banzai-api rebuilt from `main`,
reverse-proxy restarted, all containers healthy.

**Live-QA (public edge) — PASS:**
- Website: `/decisoes` lists ADR-059..063; `/decisoes/adr-059..063` render the full L1/L2/L3 decision tables;
  `/o-que-e` + `/confianca` 307 → `/referencia/...` (200); `/certificates` 404.
- BanzAI `/banzai/ask` (0 model, deterministic, `external_model_called=false`, `degraded=false`):
  - "Quais são as três camadas … do BANZA?" → **ADR-059** card: **L1 Protocolo BANZA / L2 Certificação de
    Conformidade e Interoperabilidade / L3 Banzami Operational Scheme** + BanzAI-transversal + authority rule.
  - "O que é o Banzami Operational Scheme?" → **ADR-060/062** card: L3, designated operator,
    `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money fail-closed.
  - "o que é o Banzami?" → institutional-identity boundary intact (Banzami ≠ BANZA ≠ BanzAI).
  - "certificação = autorização regulatória?" and "a Banzami já está autorizada?" → **Não** (certification ≠
    authorisation; regulatory authorisation is the operator's responsibility, not granted by BANZA).
  - Regression: "como funciona a federação?" still grounds on ADR-040. Zero fabrication across the sweep.

**Verification:** 201 query-core + 119 api-kb + 301 banzai-api node tests, clippy `-D warnings`, rustfmt,
and the seven M2.19C guards plus repo-knowledge-safety / canonical-corpus-integrity / query-core-contract /
canonical-protocol-vocabulary — all green in CI (159/159 on the final PR).

**Deferred (M2.19E):** broader BanzAI answer-contract polish — e.g. routing "certificação vs autorização"
through ADR-061 rather than the generic license/boundary answer — rides in the M2.19E BanzAI control plane.

## References

- [ADR-059](../../decisions/adr/ADR-059-three-layer-institutional-architecture.md) — three-layer architecture
- [ADR-060](../../decisions/adr/ADR-060-banzami-operational-scheme.md) — Banzami Operational Scheme
- ADR-061/062/063 — companion M2.19C decisions
- `contracts/production/regulatory-state.production.schema.json` + `contracts/production/examples/`
- `docs/reports/REGULATORY_STATE_BOUNDARY_REPORT.md`, `docs/reports/CONFLICT_OF_INTEREST_REPORT.md`
