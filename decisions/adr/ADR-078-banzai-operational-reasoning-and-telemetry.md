# ADR-078 — BanzAI operational reasoning, read-only telemetry, and honest request-oriented fallback

- **Status:** Accepted
- **Date:** 2026-08-05
- **Milestone:** BanzAI operational reasoning — Increment 1 (operational/duration family)
- **Related:** ADR-042 (PostgreSQL data boundary), ADR-054 (BanzAI non-authoritative primary interface),
  ADR-055 (Rust-first grounded synthesis), ADR-068 (endpoint-originated operator validation; nine-step
  journey §21), ADR-076 (validation-journey consolidation; durable append-only receipts §D-076-08),
  ADR-077 (profile applicability model)

---

## Context

BanzAI is the **primary human-operator interface** and a **non-authoritative cognitive engine**: it
guides, the engines verify, the evidence proves, and the competent authority decides (ADR-054). Until now
BanzAI classified only **documentary** questions — a fact, a canonical definition, an explanation grounded
in the corpus. A question about a **measured / observed operational property** of a protocol subject —
"how long does a full validation journey take?", "which step is slowest?", "what is the median duration?"
— had no home in the intent taxonomy. It fell through to the generic **fixed topic list** ("Posso
responder sobre: manifest, federação, …"), which is both unhelpful and **dishonest**: the question was
understood, the data to answer it already existed, yet the reply pretended the topic was out of scope.

The data does exist. ADR-076 §D-076-08 made every run **durable, append-only, immutable** in the existing
`banza_protocol` database: `validation_executions` and `validation_step_executions` carry the timing
already produced by the engines — total elapsed from `completed_at − started_at`, per-step from the step
rows. The production contracts already model these fields:
`contracts/production/operation-receipt.production.schema.json` (`duration_ms`, `started_at`,
`completed_at`) and `contracts/production/journey-receipt.production.schema.json` (`duration_ms`,
`step_count`, `steps`). Nothing consumed them for reasoning.

This ADR authorises **operational reasoning as a first-class BanzAI capability**, answered from that
telemetry **read-only**, and replaces the fixed topic list with an **honest, request-oriented decline**
when the measurements are insufficient. **Read-only; no new financial invariant, no new table, no write
path.** No financial invariant (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`,
`INV-RECON-*`, `INV-QR-*`) is weakened by any decision below.

## Decision

**D-078-01 — Operational reasoning is a first-class capability.** BanzAI must classify a question about a
**measured / observed** operational property of a protocol subject, not only a documentary one. Three new
primary intents are added — `get_duration`, `get_metric`, `get_live_state`
(`engines/banzai-query-core/src/intent.rs`) — classified **deterministically in Rust**
(`engines/banzai-query-core/src/operational.rs`, `resolve_operational_metric`). The gate is
**conservative**: a question is operational only when it carries **both** a duration/metric/live-state
marker **and** a validation-journey **subject** marker, so an off-topic "quanto tempo tenho para pagar"
(no protocol subject) is never mis-scoped and a boundary question is never bought past a refusal. Safety
and boundary tiers still run **first**; operational classification is pure, total, and makes **zero model
calls**.

**D-078-02 — Read-only telemetry over persisted executions.** A duration/metric question about the
validation journey is answered from **real data** in the durable receipt store (`validation_executions` /
`validation_step_executions`, ADR-076 §D-076-08): total duration derived as
`completed_at − started_at`, per-step from the step rows. Every number comes **only** from SQL aggregates
(latest / average / median / p95 / min / max / per-step). **No model ever produces or edits a number** —
this is a deterministic terminal path with **0 model calls**. Reads are **SELECT only**: no new financial
invariant, no new table, no write path is introduced. `Os motores medem; os recibos registam; a telemetria
lê — nenhum modelo inventa um número.`

**D-078-03 — Compatibility and privacy invariants on every aggregate.**
- **Pinned compatibility tuple.** Aggregates are pinned to **one** `(operator, implementation, profile,
  environment, protocol_version)` tuple, taken from the **latest completed run**. Incompatible runs (e.g.
  L3-prod vs L0-sandbox) are **never** mixed — timings across profiles or environments are not comparable
  and are never averaged together.
- **Public visibility only.** Only `workspace = 'public'` runs within the public operator scope are
  aggregated. A private candidature's timing is **never** aggregated (ADR-076 authorisation/privacy rules
  hold unchanged).
- **A single run is one observation.** When only one comparable run exists it is reported as a single
  **observation**, never dressed up as an average.

**D-078-04 — Honesty taxonomy for every reported value.** Each value is categorised as one of
**SUPPORTED** (a measured value present in the data), **DERIVED** (a computed avg/median/p95/min/max),
**ESTIMATED**, **HYPOTHETICAL**, or **UNSUPPORTED**. On this deterministic path — no model, no inference —
**only SUPPORTED and DERIVED can arise**. ESTIMATED and HYPOTHETICAL values must be **prose-labelled** as
such and are **never** presented as measured; **UNSUPPORTED is never published**.

**D-078-05 — Request-oriented honest fallback replaces the fixed topic list.** When a question is
**understood** but there are not enough comparable public measurements (or telemetry is disabled), BanzAI
serves a **request-oriented decline** (reason code `INSUFFICIENT_MEASUREMENTS`) stating: the interpreted
intent, the data needed, the sources consulted, what can be affirmed **without** a measurement, which tool
could obtain it, and the remaining limitation. It is **never** a fabricated number and **never** the old
generic "Posso responder sobre: manifest, federação, …" fixed list. Two reason codes are added
(`engines/banzai-query-core/src/reason.rs`): `OPERATIONAL_MEASUREMENT_REPORTED` (answered from real
telemetry) and `INSUFFICIENT_MEASUREMENTS` (understood, but no comparable measurement).

**D-078-06 — Scope of Increment 1.** Increment 1 delivers **only** the operational/duration family for the
validation journey, via the deterministic terminal path above. The broader operational-agent program —
the full set of metric families, a general tool planner, a ≥2500-case evaluation, and auto-generated
question families — is **explicitly follow-on and out of scope** for this ADR's implementation. The
honesty taxonomy in D-078-04 deliberately **anticipates** that program (ESTIMATED / HYPOTHETICAL /
UNSUPPORTED exist for the model-mediated paths a later increment will add) without authorising it here.

### Boundary (what this ADR does NOT do)

- It **does not** introduce a financial invariant, a table, or any write path. Telemetry is `SELECT`-only
  over the ADR-076 store; the store still only preserves (ADR-042 boundary), never recomputes.
- It **does not** let a model produce or edit a number. The operational answer is a deterministic terminal
  path (`0` model calls); a value that cannot be measured or derived is declined, never invented.
- It **does not** widen scope silently. The conservative dual-marker gate keeps off-topic and boundary
  questions out; when in doubt the question is **not** operational and flows to the normal pipeline.

## Implementation

- **`engines/banzai-query-core/src/intent.rs`** — the `get_duration` / `get_metric` / `get_live_state`
  primary intents and the duration/metric/live-state and validation-journey marker sets.
- **`engines/banzai-query-core/src/operational.rs`** — `resolve_operational_metric(question)`: the pure,
  total, dual-marker classifier returning the deterministic `OperationalDecision` (intent, subject,
  metric, aggregation, `authority_requirement`, `reason_code`, and the request-oriented `honest_fallback`);
  no I/O, no state, no model call.
- **`engines/banzai-query-core/src/reason.rs`** — `OPERATIONAL_MEASUREMENT_REPORTED` and
  `INSUFFICIENT_MEASUREMENTS` added to the closed reason-code set; each maps to exactly one cause and to a
  public answer class.
- **Telemetry read path** — SQL aggregates (latest / average / median / p95 / min / max / per-step) over
  `validation_executions` / `validation_step_executions`, pinned to the compatibility tuple and filtered
  to the public workspace/scope; numbers flow from SQL to the answer without a model in the path.
- **Contracts reused (no new contract):** `operation-receipt.production.schema.json`
  (`duration_ms`, `started_at`, `completed_at`) and `journey-receipt.production.schema.json`
  (`duration_ms`, `step_count`, `steps`); the durable store is the ADR-076 §D-076-08 receipt persistence.

## Alternatives considered

- **Keep routing operational questions to the fixed topic list.** Rejected: the question is understood and
  the data exists; replying "I can answer about manifest, federation, …" is dishonest and unhelpful.
- **Let the model read the receipts and phrase a duration.** Rejected: a model in the numeric path can
  fabricate or drift a value. Numbers come only from SQL aggregates; the model never touches a number.
- **Aggregate across all runs regardless of profile/environment.** Rejected: L3-prod and L0-sandbox
  timings are not comparable; mixing them yields a number that is precise and wrong. Aggregates are pinned
  to one compatibility tuple.
- **Ship the full operational-agent program now.** Rejected: Increment 1 is the deterministic
  operational/duration family; the general planner, extended metric families and large-scale evaluation
  are follow-on, and the honesty taxonomy already leaves room for them.
