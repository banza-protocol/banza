# BanzAI — Durable Validation & Evidence

> **Scope:** the BanzAI interface for the nine-step technical validation journey, its durable append-only receipt store, and the compare/reproduce/evidence surfaces. **Normative source:** [spec/validation-journey.md](../../spec/validation-journey.md). **Decisions:** ADR-034 (endpoint-originated validation), ADR-036 (journey consolidation + durable receipts), ADR-013 (PostgreSQL protocol-state boundary), ADR-035/053 (Operator Zero).

BanzAI is the primary human-operator interface (ADR-036). It is where a human runs a validation against an operator implementation and consults the durable record afterwards. It never redefines protocol rules — it executes the Rust engines and records what they decide.

## Two journeys

- **Model A (guidance).** A navigation aid with states `not_started / available / in_progress / completed`. It emits no verdicts, scores, receipts or evidence, and surfaces technical information only by typed reference to Model B. A `FAILED`/`BLOCKED` Model B step can never appear positive in Model A.
- **Model B (technical validation).** The nine-step journey. **Sole authority on technical state.** See the normative spec for the 6-state model and per-step engine map.

Rule: *Model A orients the path; Model B evaluates — and is the single authority on technical state.*

## Durable receipts (ADR-036)

Each step returns a canonical OperationReceipt; the journey returns a JourneyReceipt. Both are canonical-JSON SHA-256 hashed and, when the store is enabled, persisted append-only to PostgreSQL:

| table | holds |
|---|---|
| `validation_executions` | the execution header + operational state (RUNNING/…); frozen once terminal |
| `validation_step_executions` | per-step terminal row (6-state), reason codes, blocked_by, digests |
| `operation_receipts` | the sealed per-step receipt + verified digest (append-only) |
| `journey_receipts` | the sealed aggregate receipt (append-only, one per execution) |
| `evidence_bundles` | content-addressed evidence bundle (append-only) |
| `validation_artifact_observations` | each observed artefact (endpoint + content digest) — the reproduction replay set |

Immutability is **database-enforced**: `UPDATE`/`DELETE` are rejected on the sealed tables by triggers; a completed execution and a sealed step are frozen; identity columns are immutable; the `banzai_rw` grant is `SELECT/INSERT` only on sealed tables. Digests are re-verified on read (`digest_ok`); an out-of-band change reads back `digest_ok=false`.

## Honest persistence status

Persistence never breaks a validation — the receipt is always in the HTTP body. But the caller surfaces an explicit status and never fakes a reference:

`PERSISTED` · `RESULT_AVAILABLE_NOT_PERSISTED` · `PERSISTENCE_PENDING` (outbox) · `PERSISTENCE_FAILED` · `PERSISTENCE_DISABLED`.

History, comparison and reproduction are offered only when `PERSISTED`. On a DB outage the exact payload (hash, ids, original timestamps) is appended to a service-local durable outbox and retried later; a retry re-persists the same payload and never re-runs the engine. If no writable outbox is configured, the status is the explicit `PERSISTENCE_FAILED` — never a silent success.

## Endpoints (public-workspace-scoped; 503 when the store is disabled)

- `POST /validate` / `POST /validate/step` — run the journey (or a single step); receipts returned in-body.
- `GET  /validate/executions?implementation_id=…` — history for an implementation.
- `GET  /validate/execution?execution_id=…` — one execution with digest-verified receipts.
- `GET  /validate/compare?a=…&b=…` — field-by-field diff of two executions.
- `POST /validate/reproduce` — a **new** execution that re-runs the full secure pipeline (never a stored URL) and reports a typed reproduction result.
- `POST /validate/cancel` — cancel an in-flight execution.

On boot the service recovers stale `RUNNING` executions (→ `INTERRUPTED`), drains the outbox, and starts a background loop for both.

## Configuration

The store is env-gated OFF by default. Enable in production with `BANZAI_RECEIPTS_ENABLED=1`, `DATABASE_URL` (the `banzai_rw` role), and `BANZAI_RECEIPTS_OUTBOX_DIR` (a writable volume for the durable outbox). See the [migration runbook](../guides/VALIDATION_RECEIPTS_RUNBOOK.md).

## Operator Zero

Operator Zero is validated as an ordinary external operator with zero privileged paths: same engines, endpoints, tables, authorization; inputs fetched from its own origin `zero.banza.network`.

## Reproducing the durability guarantees

`make receipts-e2e` runs the full durable-receipt E2E (24 assertions) against a throwaway pgvector container: happy path, append-only immutability, digest/tamper, reproduction lineage, compare, crash recovery, outbox drain, and the PG-down fail-safe path.
