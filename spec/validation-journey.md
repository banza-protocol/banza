# BANZA Validation Journey — Normative Specification

> **Status:** Normative · **Introduced:** M2.19 (BanzAI validation journey) · **Governs:** ADR-034 (endpoint-originated validation), ADR-036 (journey consolidation + durable receipts), ADR-013 (PostgreSQL protocol-state boundary).

This specification defines the **nine-step technical validation journey** that any certified operator's BanzAI runs against an operator *implementation*. It is operator-neutral: it names the operator *role*, never a commercial brand. The reference demonstration uses **Operator Zero** as an ordinary external operator with **no privileged path** (ADR-035/053).

The journey is **endpoint-originated**: every input is fetched from the implementation's own published origin through the SSRF-hardened protocol fetcher, hashed, and handed to a deterministic Rust engine. **The engines decide; the receipts record; PostgreSQL preserves; the evidence enables reproduction.**

---

## 1. Two journeys, one authority

BanzAI presents two distinct journeys that MUST NOT be conflated:

| | **Model A — Guidance** | **Model B — Technical validation** |
|---|---|---|
| Purpose | Orient a human through the path | Evaluate an implementation |
| States | `not_started` · `available` · `in_progress` · `completed` | 6-state model (§2) |
| Emits | navigation only | verdicts, reason codes, receipts, evidence |
| Authority | none | **sole authority on technical state** |

**Rule (normative):** *Model A orients the path; Model B evaluates — and is the single authority on technical state.* Model A MUST NOT show a positive technical outcome. It carries technical information **only by typed reference** to a Model B result. If a Model B step is `FAILED` or `BLOCKED`, Model A MUST NOT render it as anything positive.

---

## 2. The six-state model

Every technical step and the aggregate journey use exactly these states:

- `NOT_EVALUATED` — no evaluation has run.
- `RUNNING` — an evaluation is in flight (a *persisted operational* state, §6; never a sealed verdict).
- `VERIFIED` — the engine confirmed the property against fetched, hashed inputs.
- `PENDING` — the engine ran but the property is not yet satisfiable (e.g. an input is absent but the step is not a hard failure).
- `FAILED` — the engine evaluated and the property does not hold.
- `BLOCKED` — the step could not be evaluated because a dependency is not `VERIFIED`, an input origin was unavailable, or a safety boundary refused it.

`RUNNING` is transient and is never sealed into a receipt. A step is written straight to its terminal state (`VERIFIED` / `PENDING` / `FAILED` / `BLOCKED`).

---

## 3. The nine steps

Steps 1–8 are **independent technical evaluations**; step 9 is a pure **aggregation** (it computes no new verdict — it reflects the others).

| # | Step (`step_id`) | Deciding engine | Evaluates |
|---|---|---|---|
| 1 | `discovery` | `banza-target-registry` | the implementation is a resolvable registry target with a canonical origin |
| 2 | `manifest` | `banza-operator-manifest` | the published operator manifest is well-formed and origin-bound |
| 3 | `keys` | `banza-trust` (key-material input) | key material is present, well-formed, unexpired, unrevoked |
| 4 | `conformance` | `banza-conformance` | L1 protocol conformance against fetched conformance evidence |
| 5 | `interoperability` | `banza-l2-readiness` | L2 interoperability readiness |
| 6 | `trust` | `banza-trust` (trust input) | Open Trust Evaluation over the manifest + keys |
| 7 | `federation` | `banza-l3-readiness` | L3 federation readiness |
| 8 | `evidence` | `banza-evidence-bundle` | a content-addressed evidence bundle can be produced |
| 9 | `certification` | `banza-target-registry` (aggregation) | **readiness** aggregate — `BLOCKED` by any non-`VERIFIED` step |

**Step 9 is readiness, not a certificate.** `certification_status` is always `NOT_CERTIFIED`; `certification_readiness` is `READY` only when every technical step is `VERIFIED`, otherwise `BLOCKED` with the blocking step ids listed in `blocked_by`.

Keys (step 3) and Trust (step 6) share the `banza-trust` engine but consume **distinct inputs** (key material vs the trust bundle) and MUST be reported as distinct steps.

---

## 4. Receipts

Every step produces a canonical **OperationReceipt** (`operation-receipt.production.schema.json`); the journey produces one **JourneyReceipt** (`journey-receipt.production.schema.json`). Receipts bind the result to its inputs' origins: each carries the endpoints consulted, the per-input content digests (`input_artifact_digests`), the resolved host, the engine version, the timing (`started_at`/`completed_at`), retry/`blocked_by` fields, and the aggregate `protocol_fetch_count`. Receipts are **canonical-JSON SHA-256 hashed**; the digest is recomputed and verified on every read.

Receipts contain **no model-generated text**. They record what the deterministic engines decided.

---

## 5. Persistence, honestly (ADR-036)

Persistence is a durable *side-effect* of validation: the receipt is always returned to the caller in the HTTP body; persisting it additionally makes the run **consultable, comparable and reproducible** later. Persistence MUST be reported with an explicit status and MUST NOT be faked:

- `PERSISTED` — durably stored; history/comparison/reproduction are now available.
- `RESULT_AVAILABLE_NOT_PERSISTED` — the engine result stands but persistence is not confirmed.
- `PERSISTENCE_PENDING` — durably queued in the service outbox; a retry will complete it.
- `PERSISTENCE_FAILED` — no durable queue available; explicit failure.
- `PERSISTENCE_DISABLED` — the store is not enabled in this environment.

While not `PERSISTED`, the caller MUST NOT present a `receipt_reference`, history, comparison or reproduction as available, and MUST NOT emit a fake reference. A safe retry re-persists the **exact** queued payload (same hash, ids and original timestamps) — it never re-runs the engine.

Receipts are **append-only**: the store forbids `UPDATE`/`DELETE` on sealed rows at the database level; a completed execution and a sealed step are frozen; identity columns are immutable; ids are never reused. (See ADR-013 for the PostgreSQL protocol-state boundary — the store holds protocol state, never financial value.)

---

## 6. Operational state and crash recovery

An in-flight execution persists its operational state (`execution_lifecycle=RUNNING`, `heartbeat_at`, `lock_owner`, `attempt_number`, `idempotency_key`, `timeout_at`). A repeated submit with the same idempotency key returns the existing execution, never a duplicate. Deterministic recovery: a `RUNNING` execution whose heartbeat is stale is marked `INTERRUPTED` (`overall_status=BLOCKED`) and its lock released; recovery never rewrites a prior result — a subsequent attempt is a **new related execution**.

---

## 7. Retry, invalidation, reproduction, comparison

- **Retry** — a new execution linked by `previous_execution_id`; the prior run is never rewritten.
- **Reproduction** — a new execution linked by `reproduction_of`. Reproduction NEVER replays a stored URL or cached body: it re-runs the full secure pipeline (registry resolve → SSRF-hardened fetch → hash) against the current origin and compares. The typed outcome is one of `SEMANTICALLY_EQUIVALENT`, `NOT_EQUIVALENT`, `OBSERVED_INPUTS_CHANGED`, `ORIGINAL_INPUTS_UNAVAILABLE`, `ENGINE_VERSION_UNAVAILABLE`, `REPRODUCTION_BLOCKED`.
- **Comparison** — a deterministic field-by-field diff of two executions of the same implementation (status, engine version, output digest, reason codes per step).
- **Invalidation** — a prior result is never mutated; it is superseded by a newer execution.

Reads are **workspace-scoped**: the browser-supplied workspace is never trusted for cross-workspace access.

---

## 8. Operator neutrality and Operator Zero

The journey is identical for every operator. Operator Zero is validated through the **same** engines, endpoints, tables, APIs and authorization as any external operator, with **zero privileged paths**. Its inputs are fetched from its own published origin (`zero.banza.network`), exactly like any other implementation.
