# ADR-076 — BanzAI validation-journey consolidation, single technical-state authority, and durable append-only receipts

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** BanzAI Workbench reconstruction (Fase B)
- **Related:** ADR-005 (protocol-first), ADR-008 (markdown-first content SSOT), ADR-042 (PostgreSQL
  data boundary), ADR-054 (BanzAI non-decisive primary interface), ADR-055 (Rust-first grounded
  synthesis), ADR-059..063 (three-layer architecture; certification ≠ admission ≠ authorisation;
  real-money gate), ADR-064..066 (conformance/interoperability certification; Technical Registry;
  certificate state machine), ADR-067 (Operador Zero read-only reference + validation workbench),
  ADR-068 (endpoint-originated operator validation; operator↔implementation model), ADR-069 (secure
  onboarding), ADR-070 (navigable contexts), ADR-071..073 (canonical runtime; runtime SSOT; mandatory
  post-synthesis validator), ADR-074 (SimB retirement), ADR-075 (monorepo consolidation)

---

## Context

The Fase A audit of the BanzAI validation surface (report
`docs/reports/BANZAI_WORKBENCH_FASE_A_AUDIT_2026-08-04.md`) established that the validation core is
**stronger than assumed**: all nine steps of the endpoint-originated journey (ADR-068) are backed by
real deterministic Rust engines, there are no mock or hardcoded verdicts on the validation path
(`qwen_calls=0`, `external_model_calls=0` by construction), and the secure fetcher `banza-artifact-fetcher`
implements the ADR-068 §19 SSRF controls to a high standard. The work of this milestone is therefore
**consolidation, an execution-contract layer, durable receipts, interface reconstruction, residual
hardening, cleanup, and the resolution of real canonical conflicts** — not the construction of missing
engines.

The audit registered **eleven canonical conflicts** (contract-vs-contract, spec-vs-engine, doc-vs-doc).
Per ADR-005 / CLAUDE.md and the milestone's own §2, real conflicts are **registered and resolved by a
governed decision**, never patched silently and never worked around by a new ad-hoc rule. This ADR is
that registration. No financial invariant (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`,
`INV-RECON-*`, `INV-QR-*`) is weakened by any decision below.

Two conditions of the milestone are load-bearing and are recorded here as binding architectural
decisions: **(a)** two journeys coexist live — a 7-step in-browser guided tracker (Model A;
`engines/banzai-operator-journey` + `services/banzai-api/src/journey.js`, live via `/ask`) and the
9-step canonical verdict journey (Model B; `services/banzai-api/src/validate.js` +
`website/components/banzai/validationJourney.tsx`) — with divergent vocabularies and state models; and
**(b)** verdict receipts are ephemeral (HTTP-body only), so a completed run cannot be consulted,
compared or reproduced afterwards, which the milestone (§4/§5/§19) requires.

## Decision

### Single technical-state authority

**D-076-01 — There is exactly one authority of technical validation state: the deterministic nine-step
journey (Model B).** No other component may originate, recompute, alter, or persist a competing technical
verdict. `Model A orienta o percurso; Model B avalia a implementação.` The nine-step journey is
endpoint-originated (ADR-068): Rust engines decide every verdict from artefacts fetched by
`banza-artifact-fetcher`; TypeScript never decides a verdict.

**D-076-02 — Model A is reframed as guidance only, with no validation authority.** The guided operator
journey is retained as the **global-operator orientation layer** and is renamed to remove the "journey"
name collision (`operator-guidance` / `operator-path`; Model B keeps `validation-journey` /
`deterministic-validation`). Model A:
- carries only **navigation states** `not_started | available | in_progress | completed`, where
  `completed` marks that an orientation activity was visited/finished — **never** a technical approval;
- **must not** emit verdict-like states (`valid`, `evidence_ready`), scores, or any conformance/
  readiness/quality computation;
- **must not** duplicate the nine-step states, produce receipts or formal evidence, or persist a second
  copy of the technical result;
- surfaces technical information **only by typed reference** to Model B —
  `validation_execution_id`, `step_id`, `receipt_reference`, `evidence_reference` — never by copying or
  recomputing a verdict;
- a Model B `FAILED`/`BLOCKED` can **never** appear as a positive technical conclusion in Model A;
- uses the canonical protocol vocabulary throughout. Temporary compatibility shims are kept only where a
  real consumer exists, with explicit deprecation and tests, and are removed after migration.

**D-076-03 — Canonical nine-step labels (single set, PT/EN).** Descoberta/Discovery, Manifesto/Manifest,
Chaves/Keys, Conformidade/Conformance, Interoperabilidade/Interoperability, Confiança/Trust,
Federação/Federation, Pacote de Evidências/Evidence Bundle, Prontidão para Certificação/Certification
Readiness. All surfaces (engines, service, UI, docs) use these; divergent tokens
(`conformidade`↔`conformance`, `federacao`↔`federation`, `evidence_bundle`↔`evidence`, `traces`) are
reconciled to this set.

**D-076-04 — Canonical per-step state model: six states.** `NOT_EVALUATED, RUNNING, VERIFIED, PENDING,
FAILED, BLOCKED`. `RUNNING` is a transient execution state (emitted while a step runs; not a terminal
receipt seal). `NOT_EVALUATED` is added to the aggregate/overall vocabulary so an un-run aggregate is
expressible. The three divergent vocabularies (canon 6 / impl 5 / receipt-contract 4) are reconciled to
this single model; the certificate lifecycle of ADR-066 (`NOT_CERTIFIED, CERTIFIED, EXPIRED, SUSPENDED,
REVOKED, SUPERSEDED`) is a **different** state machine and is never conflated with per-step status.

### Authority hierarchy and step-9 attribution

**D-076-05 — Authority hierarchy (protocol-first).** Binding order when artefacts diverge:
(1) `contracts/` schemas and financial invariants, (2) `spec/` normative specs, (3) accepted ADRs/RFCs,
(4) Rust engine contracts, (5) signed protocol metadata, (6) the prose Reference, (7) informative docs,
(8) local-model output (never authoritative). The prose Reference is **explanatory**, not binding, where
it diverges from a contract/spec/invariant. The PT Reference's "O Que É Normativo" list and the N1-N5
"Hierarquia Normativa" table are corrected to this order and to **include** `contracts/` and
`conformance/` at the top; the EN Reference mirror is harmonised to the same hierarchy. This resolves
conflicts #1, #2, #3.

**D-076-06 — Step 9 is a deterministic readiness aggregation, not a certificate.** Certification
Readiness aggregates the eight technical verdicts (currently via `banza-target-registry`) into
`READY | BLOCKED`, fail-closed, always `NOT_CERTIFIED`. Readiness is **not** certification.
`banza-certification` is the **separate** Registo-de-Certificação authority (ADR-064/065/066), which is
**out of** the readiness journey and legitimately not wired into it. Engine attributions that mislabel
step 9 as `banza-certification` (`website/lib/operadorZeroStatus.ts`,
`contracts/openapi/interoperability-certification.yaml` where it names the readiness step) are corrected
to name the actual aggregating engine. This resolves conflicts #7 and #10; step-9 aggregation of
already-Rust-decided verdicts is **not** "deciding" and does not violate D-076-01.

### Receipts: shape, durability, immutability

**D-076-07 — Receipt shape reconciled to the milestone §4 field set.**
`contracts/production/operation-receipt.production.schema.json` and `journey-receipt.production.schema.json`
gain `started_at`, `completed_at`, `retryable`, `blocked_by`, and a structured per-artefact digest map;
field names are reconciled to the canonical set (`execution_id`, `step_id`, `engine_name`,
`engine_version`, `reason_codes`, `input_artifact_digests`, `output_digest`, `receipt_reference`,
`evidence_references`); the state enums adopt D-076-04. The **demo** receipt
(`website/lib/operationReceipt.ts`, `certification_readiness:'PRE_PRODUCTION'`, `external_calls`,
`demo_only`) is not an instance of the production schema and must not collide with it: it is either
validated against a clearly separate demo schema or aligned to the production contract. This resolves
conflict #4.

**D-076-08 — Durable, append-only, immutable, verifiable receipt persistence in PostgreSQL (ADR-042
boundary).** `OperationReceipt`, `JourneyReceipt` and `EvidenceBundle` references are persisted in the
existing `banza_protocol` database, within the ADR-042 data boundary, as the durable operational archive
of results already produced by the engines. The database **preserves**; it never recomputes, edits,
improves, or replaces a verdict. `Os motores decidem; os recibos registam; o PostgreSQL preserva; a
evidência permite reproduzir.` Rules:
- Entities (minimum): `validation_executions`, `validation_step_executions`, `operation_receipts`,
  `journey_receipts`, `evidence_bundles`, `validation_artifact_observations`.
- **Append-only / immutable:** completed receipts admit no `UPDATE` of content, no reason-code
  substitution, no retroactive state change, no normal `DELETE` via application APIs, no `execution_id`
  reuse, no snapshot mutation. Corrections and retries create **new** records linked to the prior; they
  never rewrite. Immutability is enforced **in the database** (triggers or equivalent), not only in the
  application layer.
- **Verifiable content:** canonical-JSON serialisation with `receipt_sha256`, `input_set_sha256`,
  `output_sha256`, `evidence_bundle_sha256`, computed before persistence and re-verified on read. Where a
  contract requires a signature, the canonical payload, signature, key id, algorithm, validity window and
  trust reference are stored. **No free BanzAI/Qwen text ever enters the formal (signed) receipt payload.**
- **Evidence Bundle:** stored in PostgreSQL initially (size-bounded, canonical JSONB/bytes,
  content-addressed, immutable, own hash, public artefacts referenced by origin+digest); if size later
  justifies object storage, the index/hashes/provenance/references remain in PostgreSQL — no informal
  filesystem outside the ADR-042 boundary is introduced.
- **Query / compare / reproduce:** authenticated, typed read paths list an implementation's executions,
  open an execution and each receipt, compare two executions (inputs/engines/states/reason-codes delta),
  fetch the Evidence Bundle, and start a reproduction. Reproduction creates a **new** execution from the
  original references+hashes and returns `SEMANTICALLY_EQUIVALENT | NOT_EQUIVALENT | INPUTS_UNAVAILABLE |
  ENGINE_VERSION_UNAVAILABLE | BLOCKED`; it never overwrites the original.
- **Authorisation / privacy:** public receipts (from public artefacts), private onboarding candidatures,
  session data and unpublished evidence are separated; workspace isolation and backend access control
  apply; browser-supplied ids are never trusted; anti-enumeration holds; logs carry no private payloads;
  public receipts expose no email/session/OTP/internal data.
- **Concurrency / idempotency:** at most one active execution per (implementation, profile, version,
  snapshot) where the contract requires; transactional locking; idempotency keys; no double receipt
  emission; the step-completion→receipt-persistence transaction is atomic; crash recovery is safe; a
  partially-completed execution is never presented as final.
- **Operador Zero uses the identical tables, APIs and authorisation as any external implementation.** No
  table, flag or privileged path exists for it.
- The PostgreSQL store is **not** a normative source or certification authority.
- **Migrations** are versioned SQL (idempotent `IF NOT EXISTS`, FKs, constraints, indexes, uniqueness,
  append-only triggers, explicit retention), tested on empty and populated databases, guarded by
  `make postgres-data-boundary-check`. **No production migration runs in this phase** — installation
  happens at the human-gated deploy after `APROVADO PARA MERGE — BANZAI WORKBENCH`.

**D-076-09 — Versioned journey state-machine contract.** A new versioned schema in `contracts/` encodes
the journey's states (D-076-04), transition table, per-step dependencies (`depends_on` / `blocked_by`),
retry policy, invalidation-of-dependents policy, reproduction policy, and relation-to-next — today these
live only in ADR-068 prose, engine code and a report. Journey capabilities are completed to nine:
`runOne`, `runAll`, `runFrom`, `cancel`, `reset`, **plus** from-first-unverified, invalidation of
dependents, reproduction from pinned artefacts, and comparison between runs.

### Runtime-derived state, residual hardening, doc reconciliation

**D-076-10 — All displayed runtime/provider state derives from the runtime SSOT (ADR-072).** The app
`/banzai` surface reuses `BanzaiRuntimeStrip` reading `GET /banzai/runtime`; the static green badges
("Sem chamadas externas", "Motor por omissão: Qwen local", "Pré-produção…") and the hardcoded
`operator-zero` default seed in `website/lib/banzaiState.ts` are removed; baked state claims in
`services/banzai-api/src/knowledge.js` (`/operators` empty, `production_certificates:false`, the OZ
"9/9, 6/6, 0 blockers" verdict) are replaced by live reads or covered by a consistency guard. The
repository's committed default provider is reconciled with the deployed one (repo-default `mock` vs
production `local_qwen`) and `BANZA_COMMIT` is derived from git at build/deploy so `/runtime.commit`
reflects `HEAD` (it currently reports the stale `356c01ef`).

**D-076-11 — Residual security hardening (defence in depth).** `banza-artifact-fetcher/src/policy.rs`
`classify_v6` unwraps NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`) and 6to4 (`2002::/16`) to classify the
embedded IPv4, and adds `192.88.99.0/24`; onboarding OTP uses `attempts = attempts + 1` with
`WHERE verified_at IS NULL RETURNING`; onboarding writes gain idempotency keys / row-locking; the origin
ingress is confirmed firewalled to Cloudflare ranges (or `CF-Connecting-IP` is no longer trusted for
rate-limiting off-CF); `services/banzai-api/Dockerfile` uses `npm ci` against the committed lockfile.

**D-076-12 — Documentary reconciliation.** ADR-067's conflation of the certificate lifecycle with the
per-step status vocabulary is corrected (per D-076-04). ADR-074 D-074-03's retention justification for
`banzaSimb.ts` + `banzaL{1,2,3,4}Readiness.ts` is corrected — the draft tool does not import them; they
are removed (see the cleanup phase) rather than retained on a false basis. `CLAUDE.md` and the five other
documents that still treat `~/banzai` as a live sibling repository are updated to the post-ADR-075
monorepo reality. This resolves conflicts #8, #9, #11.

**D-076-13 — Enforcement.** New guards assert: zero verdict-states/scores/technical-decisions in Model A;
zero persisted duplication of Model B state; Model-A→Model-B references are typed-id only; no free-model
text in a formal receipt; append-only receipt immutability; runtime-derived (not hardcoded) UI state; the
canonical nine-step labels and six-state model; and the reconciled authority hierarchy. The repo-guards
canonical ADR range (`engines/banza-repo-guards/src/lib.rs`) is bumped to include ADR-076, and
`make postgres-data-boundary-check` is extended for the new tables.

## Consequences

- One technical truth (Model B); the guided layer (Model A) can never present a browser navigation state
  as a technical verdict.
- Runs become durable, auditable, comparable and reproducible; the archive is immutable and verifiable,
  and carries no model-authored content.
- The receipt schema, state model, nine-step labels and authority hierarchy are reconciled to a single
  canonical form across contracts, engines, service, UI and docs.
- Operador Zero remains a validation *target* with **zero** privileged paths across resolution, fetching,
  engines, persistence and authorisation.
- No production migration or deploy occurs until the human gate; installation is reproducible from
  `infra/banza-network/postgres/`.

## Alternatives considered

1. **Retire Model A entirely.** Rejected: it removes the useful global-orientation layer that §3.1 of the
   milestone describes; reframing it as guidance-only removes the conflict without losing the guidance.
2. **Keep both journeys as-is.** Rejected: leaves two competing technical truths and lets a browser state
   masquerade as a verdict.
3. **Filesystem/artifact receipt store.** Rejected: introduces a second operational boundary outside
   ADR-042, with weaker query/compare and harder concurrency and recovery.
4. **Ephemeral + client-only receipts.** Rejected: fails the "consultable/reproducible after the run,
   across devices" requirement.
5. **Wire `banza-certification` as the step-9 engine.** Rejected: readiness is an aggregation, not a
   certificate; certification is a separate authority and state machine (ADR-064/066).
