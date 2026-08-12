# BanzAI Workbench Reconstruction (M2.19H / ADR-076) — Closure Report

> **Status:** COMPLETE + LIVE · **Deployed:** 2026-08-05 · **Prod:** https://banza.network/banzai (VPS 82.165.165.97) · **Merge:** PR #273 (feature), #274 (edge routing), #275 (post-deploy fixes).

Integral reconstruction of the BanzAI validation interface, a fully deterministic nine-step technical-validation journey backed by the Rust engines, and durable append-only receipts — with Operator Zero validated as an ordinary external operator carrying **zero privileged paths**. Operator-neutral throughout; no `Co-Authored-By`.

## Binding decisions honoured (ADR-076)

- **Model A → guidance-only.** Navigation states only (`not_started/available/in_progress/completed`); no verdicts, scores, receipts or evidence; technical info by typed reference to Model B. Rule: *Model A orients the path; Model B evaluates — and is the single authority on technical state.*
- **PostgreSQL durable receipt store** (ADR-042 boundary): six append-only tables, DB-enforced immutability, canonical-JSON digests verified on read, reproduction = a NEW execution, Operator Zero on the SAME tables/APIs/authz.

## What shipped

- **Contracts + backend (Fase B):** §4 receipt fields + versioned 6-state journey state-machine; six PG tables + immutability triggers + segregated grants; idempotent migration `M2_19H`; `validate.js` wired begin→saveStep(each)→saveJourney with **honest persistence status** (`PERSISTED` / `RESULT_AVAILABLE_NOT_PERSISTED` / `PERSISTENCE_PENDING` / `PERSISTENCE_FAILED`, never a fake reference); durable outbox retry (exact payload, never re-runs the engine); RUNNING persisted (heartbeat/lock/idempotency) + deterministic crash recovery; reproduction via the full secure pipeline; server routes `GET /validate/executions|execution|compare` + `POST /validate/reproduce|cancel`.
- **Interface (Fase C):** runtime-derived state on `/banzai`; registry-only operator selection; journey gated on an active session; collapsible rail + contextual inspector; three-block step layout + honest persistence badge; durable Execuções view; onboarding as a numbered sequence.
- **E2E + security (Fase D):** SSRF hardening in `banza-artifact-fetcher` (NAT64 / RFC8215 / 6to4 embedded-IPv4 + relay); `make receipts-e2e` — 24-assertion deterministic E2E vs an ephemeral pgvector container (happy path, append-only immutability, digest/tamper, reproduction lineage, compare, crash recovery, outbox drain, PG-down fail-safe).
- **Cleanup (Fase E):** proven-orphan WASM modules + dead TS removed.
- **Docs (Fase F):** ADR-076; normative `spec/validation-journey.md`; `docs/banzai/BANZAI_WORKBENCH.md` + threat model; `docs/guides/M2_19H_VALIDATION_RECEIPTS_RUNBOOK.md`; compose receipts enablement + durable outbox volume.

## Production evidence (Operator Zero, live edge)

A real endpoint-originated 9-step run against `zero.banza.network` produced an **honest** verdict (no forced pass): discovery + manifest `VERIFIED` (the pipeline genuinely fetched + validated the origin), keys/interoperability/trust/federation/evidence `FAILED`, conformance `PENDING`, certification `BLOCKED`. This is the strongest possible proof that no privileged path forces Operator Zero to certify.

- **Persistence:** `PERSISTED` (durable/consultable/comparable/reproducible); 9 operation receipts + journey receipt, **all `digest_ok=true`** on read.
- **Reproduction:** a NEW execution linked via `reproduction_of`, re-ran the full secure pipeline, verdict `SEMANTICALLY_EQUIVALENT`; compare showed **0 changed steps**.
- **Immutability (on real prod receipts):** `DELETE` blocked (`append-only ... forbidden, ADR-076 D-076-08`), the row survived; `UPDATE` forcing `VERIFIED` on the completed execution blocked (stayed `FAILED`).
- **Durability:** after a `banzai-api` restart the execution remained consultable with all digests intact.
- **Deploy discipline:** verified `pg_dump` backup (SHA-256 + `pg_restore -l` TOC) before the idempotent migration; append-only triggers + INSERT-only `banzai_rw` grant on sealed tables confirmed in prod.

## Verification

Local: Rust fmt/clippy/test (touched crates), banzai-api 350 tests, website tsc + 430 vitest + `next build` (129 pages), ephemeral-PG schema (23 tables + append-only), `make receipts-e2e` 24/24, all `make …-check` guards. Remote: CI `0 failing · 0 pending` on #273/#274/#275.

## Post-deploy fixes (#275)

- `finalizeJourney` now sets `execution_lifecycle='COMPLETED'` at finalize (documented state model).
- `reproduction_result` computed inside `validateJourney` before finalize → persisted immutably (was null in the DB).
- E2E harness moved out of `test/` so `node --test` no longer auto-runs the Docker/DB-dependent scripts.

**Live re-verification (post-#275, fresh prod run).** A fresh Operator Zero journey (`overall FAILED`, `PERSISTED`) confirmed `execution_lifecycle=COMPLETED` on the sealed row. Reproducing that execution then produced a **persisted** `reproduction_result` — the DB column, previously `null`, held the typed verdict `REPRODUCTION_BLOCKED` (correct: the fresh run had a `BLOCKED` step, and `computeReproductionVerdict` returns `REPRODUCTION_BLOCKED` whenever any step is blocked), identical in the API response and the stored row. This is the honest post-fix outcome: not a re-observation of the deploy-time `SEMANTICALLY_EQUIVALENT`, but proof the field is now computed, typed, and persisted rather than dropped.

## Rollback

Feature is env-gated: `BANZAI_RECEIPTS_ENABLED=0` + recreate `banzai-api` disables the store without dropping data (additive migration). Full schema rollback restores the verified backup — never without it. See the runbook.
