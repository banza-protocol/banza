# BanzAI Telemetry Correctness Audit + Statistics Formalization (BZO-8)

**Scope.** Before expanding the operational agent's capabilities, prove the Increment-1 duration/metric
answers are *mathematically and semantically* correct against the real persisted executions, fix any
instrumentation defect at source, and formally pin the statistical method. Read-only audit of the
production `validation_executions` / `validation_step_executions` tables (ADR-076), plus a code fix.
Governs: **ADR-078** (operational reasoning & telemetry). Golden rule: **fix the instrument and the
semantics, never the number.**

## 1. The executions behind the live answer

At audit time the live answer aggregated **11 COMPLETED public executions** of the single compatibility
tuple `operator-zero / operator-zero-ref-impl / L0 / sandbox / 1.0.0` (all `orchestrator_version=1.0.0`,
`started_by=public`, `attempt_number=1`; one is a reproduction).

| execution_id | status | total | started_at (UTC) | repro |
|---|---|---:|---|:--:|
| exec-22eba6ce…b7a7 | FAILED   | 1459 ms | 2026-08-05 02:02:10 | — |
| exec-aa24625a…bf3a | FAILED   | 1201 ms | 2026-08-05 02:02:29 | ✓ |
| exec-8acaf01a…12da | FAILED   | 1640 ms | 2026-08-05 10:17:27 | — |
| exec-69f62145…6f4f2 | FAILED   | 1602 ms | 2026-08-05 13:18:53 | — |
| exec-54fe44ff…071fc | FAILED   | 1751 ms | 2026-08-05 13:21:10 | — |
| exec-07898059…41a4 | FAILED   | 1624 ms | 2026-08-05 13:38:06 | — |
| exec-80113fcf…96ed | FAILED   | 1552 ms | 2026-08-05 13:38:31 | — |
| exec-9e5f0dc0…51bbb | FAILED  | 1532 ms | 2026-08-05 13:41:11 | — |
| exec-5d702361…4415 | VERIFIED | 1111 ms | 2026-08-05 16:23:08 | — |
| exec-78adc5eb…899f | VERIFIED | 1089 ms | 2026-08-05 16:25:42 | — |
| exec-473f55a8…09ef | VERIFIED | 1072 ms | 2026-08-05 16:44:03 | — |

**Journey-total invariants — all hold.** `completed_at ≥ started_at` for every row; zero negative
durations; only COMPLETED runs; workspace=`public` only; one compatibility tuple; no duplicate
execution_id. The reported numbers reconcile exactly: latest = 1072 ms (**1.1 s**); median of the 11 =
1532 ms (**1.5 s**); p95 by linear interpolation = 1695.5 ms (**1.7 s**). The journey-level answer was
**correct**.

## 2. Defect found — certification-step per-step duration (FIXED)

The per-step audit exposed a real instrumentation bug the journey total had masked. In every run, step 9
(`certification`) recorded `started_at ≈ the journey start` and `completed_at ≈ the journey end`, i.e. its
span was the **whole journey**:

```
step 9 certification  started 16:44:03.885  completed 16:44:04.954  → 1069 ms
journey header        started 16:44:03.885  completed 16:44:04.957  → 1072 ms
```

Steps 1–8 were correctly, sequentially timestamped. Root cause: `runCertificationStep` received the
whole-journey elapsed as its `durationMs` and set `startedAt = new Date(Date.now() − durationMs)` — the
journey t0. The certification step does only a Rust aggregation (`protocol_fetch_count = 0`) and is in
truth **near-instant**.

**Consequence corrected.** The aggregate "certification median ≈ 1.5 s" was a mis-attribution of the
journey span. The genuinely slowest *real* step is **keys** (median ≈ 391 ms), then **trust** (≈ 300 ms).
The earlier "slowest step = Prontidão de certificação" answer was therefore wrong and is now fixed.

**Fix (source, not result).** `runCertificationStep` now brackets **only its own aggregation**
(`services/banzai-api/src/validate.js`). `RECEIPT_VERSION` is bumped **1.0.0 → 1.1.0** to mark the changed
timing semantics. Historical receipts are immutable (ADR-076 freeze) and are **not** rewritten; instead
the telemetry pins aggregates to `orchestrator_version` so pre-1.1.0 measurements are never mixed with the
corrected instrumentation. A fresh 1.1.0 measurement set is generated post-deploy and the E2E re-run.

## 3. Statistics formalized (single implementation)

Durations are computed by exactly one implementation — the SQL in `receipts/store.js::queryDurationMetrics`
— exported as `AGGREGATION_METHOD` so no two paths can disagree:

- **mean** = SQL `avg`; **median** = `percentile_cont(0.5)`; **p95** = `percentile_cont(0.95)` — both
  *continuous percentiles*, **linear interpolation between adjacent ranks** (the method is fixed and
  stated, never left ambiguous); **min/max** = SQL `min`/`max`; unit = **ms**.
- total = `completed_at − started_at` (header); per-step = `completed_at − started_at` (step row).
- sample = COMPLETED public executions of one `(operator, implementation, profile, environment,
  protocol_version, orchestrator_version)` tuple; **reproductions excluded** and their count reported.
- Every answer now states **n, observed period, filters (scope), method, unit, freshness, and the
  reproductions-excluded note** — surfaced in the answer text and the typed duration object.

## 4. Verification

- `services/banzai-api` test suite: **377 pass / 0 fail** (incl. 3 new BZO-8 tests: certification step no
  longer spans the journey; slowest-step names *Keys* not certification; the provenance/method line and
  claim taxonomy).
- Website `tsc` 0 errors; banzai vitest 46 pass.
- Guards `check-banzai-operational-telemetry.sh` and `check-banzai-semantic-answer-composition.sh` green.
- No Rust/WASM change, no doc-index/vocabulary recut (surgical, low-risk).

## 5. BZO-9 — execution-kind classification + monotonic sub-ms duration

Two precisions closed before expanding the taxonomy (mandate §1.1–§1.2):

**§1.1 execution-kind.** Duration aggregates must not treat an instrumentation campaign as user
journeys. Added `execution_kind` / `trigger_source` / `measurement_campaign_id` / `initiated_by` columns
(set at INSERT; a genuine journey defaults `USER_REQUESTED`, a `SYSTEM_E2E`/`BENCHMARK` caller opts out).
Historical rows stay NULL = **UNCLASSIFIED** (never assumed to be user runs). Because a COMPLETED row is
frozen (ADR-076 immutability — never weakened), the 12 BZO-8 campaign runs are classified via an **append-only
side table** `validation_execution_kind_attestations` (evidence-bearing, immutable), not by mutating the
frozen rows. `queryDurationMetrics` now aggregates only `effective_kind='USER_REQUESTED'` by default,
returns **observed / comparable / excluded{system_e2e,benchmark,reproduction,unclassified}** with a machine
reason each, and — when no user journey exists but non-user samples do — falls back to those with an explicit
`only_non_user_samples` label so the answer reads *"Não há jornadas de utilizador comparáveis; as únicas
medições disponíveis são N execuções de teste do sistema —"*. Never a silent drop, never a fabricated value.

**§1.2 monotonic + sub-ms.** Steps and the journey are now timed with `process.hrtime.bigint()` (monotonic)
persisted as `duration_us`; reads use `COALESCE(duration_us/1000, wall-clock)` so historical 1.0.0/early-1.1.0
receipts fall back cleanly and a backwards system clock can never yield a negative duration. `fmtDuration`
renders a sub-millisecond step as **`< 1 ms`**, never `0 ms` (the certification step is genuinely sub-ms).

**Verified:** banzai-api **382 pass** (+5 BZO-9 tests: sub-ms formatting, monotonic-preferred/​wall-clock
fallback/​backwards-clock, non-user-only labelling, observed/comparable/excluded); `operational-telemetry`,
`semantic-answer-composition`, `postgres-data-boundary` guards green. Migration validated in a throwaway
container (idempotent; freeze + append-only immutability upheld). No Rust/WASM/doc-index change.
