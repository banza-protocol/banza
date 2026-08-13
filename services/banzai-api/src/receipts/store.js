// Durable, append-only validation receipt store (ADR-042 §D-076-08). DB operations over the
// validation_executions / validation_step_executions / operation_receipts / journey_receipts /
// evidence_bundles / validation_artifact_observations tables. The store PRESERVES what the Rust engines
// decided; it never recomputes, edits or replaces a verdict. It reuses the single shared pg pool.
//
// Design notes:
//  • A step is written straight to its TERMINAL sealed state (RUNNING is a transient UI state, never
//    sealed — ADR-042 §D-076-04), so there is no mid-flight UPDATE to fight the freeze trigger.
//  • The execution header is INSERTed at start (overall_status RUNNING) and UPDATEd exactly once at
//    finalize (sets completed_at → frozen thereafter by the DB trigger).
//  • Every write is idempotent: UNIQUE(execution_id, step_id) + ON CONFLICT DO NOTHING; a retry or
//    reproduction is a NEW execution_id linked via previous_execution_id / reproduction_of.
//  • Operador Zero uses these SAME functions with NO privileged path; reads are workspace-scoped.

import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../onboarding/db.js"; // shared generic pg wrapper (getPool/query/tx)
import { canonicalSha256, verifyReceiptDigest } from "./hash.js";

const TERMINAL = new Set(["VERIFIED", "PENDING", "FAILED", "BLOCKED"]);

function newId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

// ── Writes ─────────────────────────────────────────────────────────────────────────────────────

// Open a new journey execution (operational state RUNNING + heartbeat). Idempotent on idempotency_key:
// a repeated submit with the same key returns the existing execution_id instead of creating a duplicate.
// Returns { execution_id, reused }.
export async function createExecution(env, fields) {
  const executionId = fields.execution_id || newId("exec");
  const r = await query(
    `INSERT INTO validation_executions
       (execution_id, operator_id, implementation_id, protocol_version, profile, environment,
        snapshot_observed_at, overall_status, certification_status, orchestrator_version, started_by,
        workspace, previous_execution_id, reproduction_of, lock_owner, idempotency_key, attempt_number,
        execution_kind, trigger_source, measurement_campaign_id, initiated_by,
        execution_lifecycle, heartbeat_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'RUNNING','NOT_CERTIFIED',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'RUNNING',now())
     ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
     RETURNING execution_id`,
    [
      executionId, fields.operator_id, fields.implementation_id, fields.protocol_version || null,
      fields.profile || null, fields.environment || null, fields.snapshot_observed_at || null,
      fields.orchestrator_version || null, fields.started_by || "public", fields.workspace || "public",
      fields.previous_execution_id || null, fields.reproduction_of || null, fields.lock_owner || null,
      fields.idempotency_key || null, fields.attempt_number || 1,
      // BZO-9: a genuine journey defaults to USER_REQUESTED; a SYSTEM_E2E/BENCHMARK caller opts out explicitly.
      // Written at INSERT (completed_at NULL) so the freeze trigger never applies.
      fields.execution_kind || "USER_REQUESTED", fields.trigger_source || null,
      fields.measurement_campaign_id || null, fields.initiated_by || null,
    ],
    env,
  );
  if (r.rows.length > 0) return { execution_id: r.rows[0].execution_id, reused: false };
  // Conflict on idempotency_key → return the already-existing execution.
  const existing = await query(
    `SELECT execution_id FROM validation_executions WHERE idempotency_key = $1`,
    [fields.idempotency_key], env,
  );
  return { execution_id: existing.rows[0] ? existing.rows[0].execution_id : executionId, reused: true };
}

// Liveness heartbeat for an in-flight RUNNING execution (crash-detection support). No-op once terminal.
export async function heartbeat(env, executionId, lockOwner) {
  await query(
    `UPDATE validation_executions SET heartbeat_at = now(), lock_owner = COALESCE($2, lock_owner)
     WHERE execution_id = $1 AND completed_at IS NULL AND cancelled_at IS NULL AND interrupted_at IS NULL`,
    [executionId, lockOwner || null], env,
  );
}

// Deterministic crash recovery: RUNNING executions whose heartbeat is older than `staleSeconds` (or that
// never heartbeated and started long ago) are marked INTERRUPTED and their locks released. Never replaces a
// prior result; a subsequent retry is a NEW related execution. Returns the number recovered.
export async function recoverStaleExecutions(env, staleSeconds = 300) {
  const r = await query(
    `UPDATE validation_executions
        SET interrupted_at = now(), execution_lifecycle = 'INTERRUPTED', overall_status = 'BLOCKED', lock_owner = NULL
      WHERE execution_lifecycle = 'RUNNING'
        AND completed_at IS NULL AND cancelled_at IS NULL AND interrupted_at IS NULL
        AND COALESCE(heartbeat_at, started_at) < now() - ($1 || ' seconds')::interval
      RETURNING execution_id`,
    [String(staleSeconds)], env,
  );
  return r.rows.length;
}

// Re-persist one outbox record (correction 1): reuses the EXACT stored payload; never re-runs the engine.
export async function persistRecord(env, rec) {
  if (!rec || !rec.kind) return false;
  if (rec.kind === "execution") { await createExecution(env, rec.payload); return true; }
  if (rec.kind === "step") { await recordStep(env, rec.execution_id, rec.payload); return true; }
  if (rec.kind === "journey") { await finalizeJourney(env, rec.execution_id, rec.payload); return true; }
  if (rec.kind === "evidence") { await storeEvidenceBundle(env, rec.execution_id, rec.payload); return true; }
  return false;
}

// Seal one technical step: insert the terminal step row + its append-only OperationReceipt + the artefact
// observations, atomically. `receipt` is the canonical OperationReceipt (operation-receipt.production).
export async function recordStep(env, executionId, receipt) {
  const status = (receipt.result && receipt.result.status) || "PENDING";
  const receiptId = receipt.operation_id || newId("op");
  const receiptSha = canonicalSha256(receipt);
  const digests = receipt.input_artifact_digests || {};
  const observations = [];
  for (const [role, d] of Object.entries(digests)) {
    if (d && d.sha256) observations.push({ role, endpoint: d.endpoint || receipt.endpoint || null, sha256: d.sha256 });
  }
  // Fallback single observation from the scalar receipt fields when no structured map is present.
  if (observations.length === 0 && receipt.endpoint) {
    observations.push({ role: receipt.step, endpoint: receipt.endpoint, sha256: receipt.input_hash || "sha256:" });
  }

  await withTransaction(async (c) => {
    await c.query(
      `INSERT INTO validation_step_executions
         (step_execution_id, execution_id, step_id, step_order, engine, engine_version, status,
          reason_codes, started_at, completed_at, retryable, blocked_by, input_set_sha256, output_sha256,
          receipt_reference, evidence_references, duration_us)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (execution_id, step_id) DO NOTHING`,
      [
        newId("stepexec"), executionId, receipt.step, stepOrder(receipt.step), receipt.engine || "unknown",
        receipt.engine_version || null, status, JSON.stringify(receipt.reason_codes || []),
        receipt.started_at || null, receipt.completed_at || receipt.fetched_at || null,
        receipt.retryable ?? null, JSON.stringify(receipt.blocked_by || []),
        receipt.input_hash || null, receipt.output_hash || null, receiptId,
        JSON.stringify(receipt.evidence_refs || []),
        receipt.duration_us ?? null, // BZO-9 monotonic µs; NULL for historical rows → wall-clock fallback at read
      ],
    );
    await c.query(
      `INSERT INTO operation_receipts (receipt_id, execution_id, step_id, receipt, receipt_sha256, input_set_sha256, output_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (execution_id, step_id) DO NOTHING`,
      [receiptId, executionId, receipt.step, JSON.stringify(receipt), receiptSha,
       receipt.input_hash || null, receipt.output_hash || null],
    );
    for (const o of observations) {
      await c.query(
        `INSERT INTO validation_artifact_observations
           (execution_id, step_id, artifact_role, endpoint, resolved_host, content_sha256, http_status, content_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [executionId, receipt.step, o.role, o.endpoint, receipt.resolved_host || null, o.sha256,
         receipt.http_status ?? null, receipt.content_type || null],
      );
    }
  }, env);
  return { receiptId, receiptSha };
}

// Seal the aggregate JourneyReceipt and freeze the execution header (single terminal UPDATE).
export async function finalizeJourney(env, executionId, journeyReceipt) {
  const jrSha = canonicalSha256(journeyReceipt);
  await withTransaction(async (c) => {
    await c.query(
      `INSERT INTO journey_receipts (journey_receipt_id, execution_id, receipt, receipt_sha256)
       VALUES ($1,$2,$3,$4) ON CONFLICT (execution_id) DO NOTHING`,
      [newId("journey"), executionId, JSON.stringify(journeyReceipt), jrSha],
    );
    await c.query(
      `UPDATE validation_executions
         SET overall_status = $2, certification_readiness = $3, completed_at = now(),
             execution_lifecycle = 'COMPLETED',
             journey_receipt_sha256 = $4, reproduction_result = COALESCE($5, reproduction_result),
             duration_us = COALESCE($6, duration_us)
       WHERE execution_id = $1 AND completed_at IS NULL AND cancelled_at IS NULL`,
      [executionId, journeyReceipt.overall_status || "PENDING",
       journeyReceipt.certification_readiness || null, jrSha, journeyReceipt.reproduction_result || null,
       // BZO-9: monotonic µs journey duration, set in the SAME terminal UPDATE (OLD.completed_at still NULL → allowed).
       journeyReceipt.duration_us ?? null],
    );
  }, env);
  return { jrSha };
}

// Store a content-addressed evidence bundle (append-only; id = canonical digest).
export async function storeEvidenceBundle(env, executionId, bundle) {
  const sha = canonicalSha256(bundle);
  await query(
    `INSERT INTO evidence_bundles (evidence_bundle_id, execution_id, bundle, bundle_sha256)
     VALUES ($1,$2,$3,$4) ON CONFLICT (evidence_bundle_id) DO NOTHING`,
    [sha, executionId, JSON.stringify(bundle), sha], env,
  );
  return { evidenceBundleId: sha, sha };
}

// Cancel an in-flight execution (allowed only while not already terminal).
export async function cancelExecution(env, executionId, workspace) {
  await query(
    `UPDATE validation_executions SET cancelled_at = now(), overall_status = 'BLOCKED'
     WHERE execution_id = $1 AND completed_at IS NULL AND cancelled_at IS NULL
       AND ($2::text IS NULL OR workspace = $2)`,
    [executionId, workspace || null], env,
  );
}

// ── Reads (workspace-scoped; digests verified on read) ───────────────────────────────────────────

export async function getExecution(env, executionId, workspace) {
  const ex = await query(
    `SELECT * FROM validation_executions WHERE execution_id = $1 AND ($2::text IS NULL OR workspace = $2)`,
    [executionId, workspace || null], env,
  );
  if (ex.rows.length === 0) return null;
  const steps = await query(
    `SELECT * FROM validation_step_executions WHERE execution_id = $1 ORDER BY step_order`,
    [executionId], env,
  );
  const receipts = await query(
    `SELECT step_id, receipt, receipt_sha256 FROM operation_receipts WHERE execution_id = $1`,
    [executionId], env,
  );
  const verifiedReceipts = receipts.rows.map((r) => {
    const v = verifyReceiptDigest(r.receipt, r.receipt_sha256);
    return { step_id: r.step_id, receipt: r.receipt, sha256: r.receipt_sha256, digest_ok: v.ok };
  });
  const jr = await query(`SELECT receipt, receipt_sha256 FROM journey_receipts WHERE execution_id = $1`, [executionId], env);
  const journey = jr.rows[0]
    ? (() => { const v = verifyReceiptDigest(jr.rows[0].receipt, jr.rows[0].receipt_sha256);
               return { receipt: jr.rows[0].receipt, sha256: jr.rows[0].receipt_sha256, digest_ok: v.ok }; })()
    : null;
  return { execution: ex.rows[0], steps: steps.rows, receipts: verifiedReceipts, journey };
}

export async function listExecutions(env, implementationId, workspace, limit = 50) {
  const r = await query(
    `SELECT execution_id, operator_id, implementation_id, overall_status, certification_readiness,
            certification_status, started_at, completed_at, cancelled_at, previous_execution_id, reproduction_of
       FROM validation_executions
      WHERE implementation_id = $1 AND ($2::text IS NULL OR workspace = $2)
      ORDER BY created_at DESC LIMIT $3`,
    [implementationId, workspace || null, Math.min(limit, 200)], env,
  );
  return r.rows;
}

// ── ADR-042 read-only telemetry: journey / per-step DURATION metrics over persisted executions ──────
//
// Durations prefer the monotonic microsecond measurement (BZO-9 duration_us, from process.hrtime): total =
// COALESCE(duration_us/1000, completed_at - started_at) on the execution header; per-step likewise on the
// step row (historical rows without duration_us fall back to wall-clock). Correctness invariants:
//  • only COMPLETED runs with a real completed_at contribute (RUNNING/CANCELLED/INTERRUPTED → NULL delta
//    would corrupt averages);
//  • aggregates are PINNED to one compatibility tuple (operator, implementation, profile, environment,
//    protocol_version, ORCHESTRATOR_VERSION) so a slow L3-prod run can never be averaged with a fast
//    L0-sandbox run — and a run from a DIFFERENT instrumentation version (e.g. the pre-1.1.0 build whose
//    step-9 span covered the whole journey) is never mixed with the corrected instrumentation. The tuple
//    is taken from the LATEST completed, non-reproduction USER_REQUESTED run (else the latest non-user run);
//  • only genuine USER_REQUESTED journeys are comparable by default (BZO-9): SYSTEM_E2E / BENCHMARK /
//    UNCLASSIFIED runs are excluded (a run's kind is its own execution_kind, else its immutable
//    attestation, else UNCLASSIFIED). When NO user journey exists but non-user samples do, the aggregate
//    falls back to those and flags only_non_user_samples + sample_kind so the renderer labels them honestly.
//    observed / comparable / excluded counts are always returned (never a silent drop);
//  • REPRODUCTIONS are excluded from the timing aggregate (a reproduction replays pinned artifacts — it is
//    a verification action, not a fresh journey) and their count is reported for transparency (ADR-042 §1);
//  • public visibility only: workspace is FORCED to 'public' and operator to the caller's scoped id — a
//    private candidature's timing is never aggregated;
//  • n is always returned alongside avg/median/p95; a single run is a single observation, never an average
//    (that distinction is enforced by the renderer, from `n`).
// Read-only: SELECT only. Returns numbers only — no free text, no secrets, no personal data.
//
// Statistics are FORMALLY DEFINED and computed by exactly ONE implementation (the SQL below), so no two
// call sites can ever disagree on the method (ADR-042 §2):
export const AGGREGATION_METHOD = Object.freeze({
  unit: "ms",
  mean: "arithmetic mean (SQL avg)",
  median: "percentile_cont(0.5) — continuous percentile, linear interpolation between adjacent ranks",
  p95: "percentile_cont(0.95) — continuous percentile, linear interpolation between adjacent ranks",
  min: "SQL min", max: "SQL max",
  total_duration: "COALESCE(duration_us/1000, completed_at − started_at) — monotonic µs, wall-clock fallback (execution header)",
  step_duration: "COALESCE(duration_us/1000, completed_at − started_at) — monotonic µs, wall-clock fallback (step row)",
  sample: "COMPLETED public executions of one (operator, implementation, profile, environment, protocol_version, orchestrator_version) tuple; only execution_kind='USER_REQUESTED' journeys are comparable by default (SYSTEM_E2E/BENCHMARK/UNCLASSIFIED kinds are excluded, and reproductions excluded); when no user journey exists the aggregate falls back to the available non-user samples, explicitly labelled",
});

// Machine reason for each excluded execution-kind category (BZO-9) — never a silent drop; surfaced in the
// provenance line so a reader sees exactly why a run was not counted as a comparable user journey.
export const EXCLUSION_REASONS = Object.freeze({
  system_e2e: "SYSTEM_E2E_NOT_USER_JOURNEY",
  benchmark: "BENCHMARK_NOT_USER_JOURNEY",
  reproduction: "REPRODUCTION_REPLAYS_PINNED_ARTIFACTS",
  unclassified: "UNCLASSIFIED_KIND_EXCLUDED_BY_DEFAULT",
});

// Duration selection, mirroring the SQL COALESCE so a JS caller/test agrees with the aggregate: a monotonic
// microsecond measurement (duration_us) is authoritative; wall-clock (completed_at − started_at) is the
// fallback for historical rows without it. A backwards wall clock never yields a negative duration.
export function effectiveDurationMs(row = {}) {
  const us = row.duration_us;
  if (us != null && Number.isFinite(Number(us)) && Number(us) > 0) return Number(us) / 1000.0;
  const a = row.started_at != null ? Date.parse(row.started_at) : NaN;
  const b = row.completed_at != null ? Date.parse(row.completed_at) : NaN;
  if (Number.isFinite(a) && Number.isFinite(b)) {
    const d = b - a;
    return d > 0 ? d : 0; // wall-clock fallback is never negative
  }
  return null;
}
export async function queryDurationMetrics(env, filters = {}) {
  const workspace = "public"; // forced — never client-supplied
  const operatorId = filters.operator_id || "operator-zero";
  const scope = {
    operator_id: operatorId,
    implementation_id: filters.implementation_id || null,
    profile: filters.profile || null,
    environment: filters.environment || null,
    protocol_version: filters.protocol_version || null,
    workspace,
  };
  const emptyExcluded = { system_e2e: 0, benchmark: 0, reproduction: 0, unclassified: 0 };

  // Effective kind: the execution's own classification, else its immutability-preserving attestation, else
  // UNCLASSIFIED (BZO-9). Historical (NULL, unattested) rows are UNCLASSIFIED — never assumed to be user runs.
  const EFF_KIND = "COALESCE(e.execution_kind, att.execution_kind, 'UNCLASSIFIED')";
  // Duration: monotonic µs when present, wall-clock fallback for historical rows (mirrors effectiveDurationMs).
  const TOTAL_MS = "COALESCE(e.duration_us / 1000.0, EXTRACT(EPOCH FROM (e.completed_at - e.started_at)) * 1000.0)";
  const STEP_MS = "COALESCE(s.duration_us / 1000.0, EXTRACT(EPOCH FROM (s.completed_at - s.started_at)) * 1000.0)";

  // Phase 1 — resolve the reference compatibility tuple. Prefer the latest COMPLETED, NON-REPRODUCTION
  // USER_REQUESTED run; if there is none, fall back to the latest non-user run of the operator so the renderer
  // can still surface an explicitly-labelled non-user measurement (mandate: never a fabricated value).
  const latestSql = (requireUser) => `
    SELECT e.execution_id, e.implementation_id, e.profile, e.environment, e.protocol_version, e.orchestrator_version,
           e.overall_status, e.started_at, e.completed_at,
           ${TOTAL_MS} AS total_ms, ${EFF_KIND} AS effective_kind
      FROM validation_executions e
      LEFT JOIN validation_execution_kind_attestations att ON att.execution_id = e.execution_id
     WHERE e.workspace = $1 AND e.operator_id = $2
       AND e.completed_at IS NOT NULL AND e.execution_lifecycle = 'COMPLETED'
       AND e.reproduction_of IS NULL
       AND ($3::text IS NULL OR e.implementation_id = $3)
       AND ($4::text IS NULL OR e.profile = $4)
       AND ($5::text IS NULL OR e.environment = $5)
       AND ($6::text IS NULL OR e.protocol_version = $6)
       ${requireUser ? `AND ${EFF_KIND} = 'USER_REQUESTED'` : ""}
     ORDER BY e.completed_at DESC
     LIMIT 1`;
  const latestParams = [workspace, operatorId, filters.implementation_id || null, filters.profile || null,
                        filters.environment || null, filters.protocol_version || null];
  let latestQ = await query(latestSql(true), latestParams, env);
  if (latestQ.rows.length === 0) latestQ = await query(latestSql(false), latestParams, env);

  if (latestQ.rows.length === 0) {
    return {
      n: 0, comparable_execution_count: 0, latest: null, avg_ms: null, min_ms: null,
      max_ms: null, median_ms: null, p95_ms: null, per_step: [], reproductions_excluded: 0,
      observed: 0, comparable: 0, excluded: { ...emptyExcluded }, exclusion_reasons: EXCLUSION_REASONS,
      execution_kind: null, sample_kind: null, only_non_user_samples: false,
      observed_from: null, observed_to: null, scope, aggregation_method: AGGREGATION_METHOD,
    };
  }
  const lr = latestQ.rows[0];
  // Pin the tuple to the latest run — INCLUDING orchestrator_version (so a different instrumentation is
  // never mixed in) — so the aggregate is over genuinely comparable runs only.
  const tuple = {
    implementation_id: lr.implementation_id,
    profile: lr.profile,
    environment: lr.environment,
    protocol_version: lr.protocol_version,
    orchestrator_version: lr.orchestrator_version,
  };
  const params = [workspace, operatorId, tuple.implementation_id, tuple.profile,
                  tuple.environment, tuple.protocol_version, tuple.orchestrator_version];

  // Counts over the tuple's COMPLETED, non-reproduction runs, grouped by effective kind (BZO-9 transparency).
  const countsQ = await query(
    `SELECT count(*)::int AS observed,
            count(*) FILTER (WHERE ${EFF_KIND} = 'USER_REQUESTED')::int AS comparable,
            count(*) FILTER (WHERE ${EFF_KIND} = 'SYSTEM_E2E')::int    AS system_e2e,
            count(*) FILTER (WHERE ${EFF_KIND} = 'BENCHMARK')::int     AS benchmark,
            count(*) FILTER (WHERE ${EFF_KIND} NOT IN ('USER_REQUESTED','SYSTEM_E2E','BENCHMARK'))::int AS unclassified
       FROM validation_executions e
       LEFT JOIN validation_execution_kind_attestations att ON att.execution_id = e.execution_id
      WHERE e.workspace = $1 AND e.operator_id = $2 AND e.implementation_id = $3
        AND e.profile IS NOT DISTINCT FROM $4 AND e.environment IS NOT DISTINCT FROM $5
        AND e.protocol_version IS NOT DISTINCT FROM $6
        AND e.orchestrator_version IS NOT DISTINCT FROM $7
        AND e.reproduction_of IS NULL
        AND e.completed_at IS NOT NULL AND e.execution_lifecycle = 'COMPLETED'`,
    params, env,
  );
  const c = countsQ.rows[0] || {};
  const observed = c.observed || 0;
  const comparable = c.comparable || 0;

  // Transparency: COMPLETED reproductions of this exact tuple, excluded from the aggregate (never silent).
  const reproQ = await query(
    `SELECT count(*)::int AS n
       FROM validation_executions e
      WHERE e.workspace = $1 AND e.operator_id = $2 AND e.implementation_id = $3
        AND e.profile IS NOT DISTINCT FROM $4 AND e.environment IS NOT DISTINCT FROM $5
        AND e.protocol_version IS NOT DISTINCT FROM $6
        AND e.orchestrator_version IS NOT DISTINCT FROM $7
        AND e.reproduction_of IS NOT NULL
        AND e.completed_at IS NOT NULL AND e.execution_lifecycle = 'COMPLETED'`,
    params, env,
  );
  const reproductionsExcluded = (reproQ.rows[0] && reproQ.rows[0].n) || 0;
  const excluded = {
    system_e2e: c.system_e2e || 0,
    benchmark: c.benchmark || 0,
    reproduction: reproductionsExcluded,
    unclassified: c.unclassified || 0,
  };

  // Sample selection (mandate): USER_REQUESTED by default; if there is NO comparable user journey but there
  // ARE non-user samples of the tuple, aggregate over those instead and label them explicitly.
  const onlyNonUser = comparable === 0 && observed > 0;
  let sampleKind;
  if (comparable > 0) {
    sampleKind = "USER_REQUESTED";
  } else if (onlyNonUser) {
    const present = [];
    if (excluded.system_e2e > 0) present.push("SYSTEM_E2E");
    if (excluded.benchmark > 0) present.push("BENCHMARK");
    if (excluded.unclassified > 0) present.push("UNCLASSIFIED");
    sampleKind = present.length === 1 ? present[0] : "MIXED_NON_USER";
  } else {
    sampleKind = null;
  }
  // The aggregate/per-step sample is either the USER_REQUESTED comparable set, or (fallback) all non-user
  // non-reproduction runs of the tuple.
  const sampleKindClause = comparable > 0 ? `AND ${EFF_KIND} = 'USER_REQUESTED'` : "";

  const aggQ = await query(
    `SELECT count(*)::int AS n,
            avg(${TOTAL_MS}) AS avg_ms, min(${TOTAL_MS}) AS min_ms, max(${TOTAL_MS}) AS max_ms,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY ${TOTAL_MS}) AS median_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY ${TOTAL_MS}) AS p95_ms,
            min(e.completed_at) AS observed_from, max(e.completed_at) AS observed_to
       FROM validation_executions e
       LEFT JOIN validation_execution_kind_attestations att ON att.execution_id = e.execution_id
      WHERE e.workspace = $1 AND e.operator_id = $2 AND e.implementation_id = $3
        AND e.profile IS NOT DISTINCT FROM $4 AND e.environment IS NOT DISTINCT FROM $5
        AND e.protocol_version IS NOT DISTINCT FROM $6
        AND e.orchestrator_version IS NOT DISTINCT FROM $7
        AND e.reproduction_of IS NULL
        AND e.completed_at IS NOT NULL AND e.execution_lifecycle = 'COMPLETED'
        ${sampleKindClause}`,
    params, env,
  );
  const a = aggQ.rows[0] || {};

  const stepQ = await query(
    `SELECT s.step_id, s.step_order, count(*)::int AS n,
            avg(${STEP_MS}) AS avg_ms, max(${STEP_MS}) AS max_ms,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ${STEP_MS}) AS median_ms
       FROM validation_step_executions s
       JOIN validation_executions e ON e.execution_id = s.execution_id
       LEFT JOIN validation_execution_kind_attestations att ON att.execution_id = e.execution_id
      WHERE e.workspace = $1 AND e.operator_id = $2 AND e.implementation_id = $3
        AND e.profile IS NOT DISTINCT FROM $4 AND e.environment IS NOT DISTINCT FROM $5
        AND e.protocol_version IS NOT DISTINCT FROM $6
        AND e.orchestrator_version IS NOT DISTINCT FROM $7
        AND e.reproduction_of IS NULL
        AND e.completed_at IS NOT NULL AND e.execution_lifecycle = 'COMPLETED'
        AND s.completed_at IS NOT NULL AND s.started_at IS NOT NULL
        ${sampleKindClause}
      GROUP BY s.step_id, s.step_order
      ORDER BY s.step_order`,
    params, env,
  );

  const num = (v) => (v == null ? null : Math.round(Number(v)));
  const sampleN = a.n || 0;
  return {
    // `n` / `comparable_execution_count` are the size of the sample ACTUALLY aggregated (comparable user runs,
    // or the fallback non-user sample) so the renderer's observação/média distinction and the tool gate work.
    n: sampleN,
    comparable_execution_count: sampleN,
    reproductions_excluded: reproductionsExcluded,
    // BZO-9 transparency counts + explicit sample labelling.
    observed,
    comparable,
    excluded,
    exclusion_reasons: EXCLUSION_REASONS,
    execution_kind: lr.effective_kind || null,
    sample_kind: sampleKind,
    only_non_user_samples: onlyNonUser,
    latest: {
      execution_id: lr.execution_id,
      total_ms: num(lr.total_ms),
      profile: lr.profile,
      environment: lr.environment,
      protocol_version: lr.protocol_version,
      implementation_id: lr.implementation_id,
      orchestrator_version: lr.orchestrator_version,
      execution_kind: lr.effective_kind || null,
      overall_status: lr.overall_status,
      completed_at: lr.completed_at,
    },
    avg_ms: num(a.avg_ms), min_ms: num(a.min_ms), max_ms: num(a.max_ms),
    median_ms: num(a.median_ms), p95_ms: num(a.p95_ms),
    per_step: stepQ.rows.map((r) => ({
      step_id: r.step_id, step_order: r.step_order, n: r.n,
      avg_ms: num(r.avg_ms), median_ms: num(r.median_ms), max_ms: num(r.max_ms),
    })),
    observed_from: a.observed_from || null,
    observed_to: a.observed_to || null,
    scope: { ...scope, ...tuple },
    aggregation_method: AGGREGATION_METHOD,
  };
}

// Deterministic field-by-field comparison of two executions of the same implementation.
export async function compareExecutions(env, aId, bId, workspace) {
  const a = await getExecution(env, aId, workspace);
  const b = await getExecution(env, bId, workspace);
  if (!a || !b) return { error: "execution_not_found" };
  const stepMap = (x) => Object.fromEntries(x.steps.map((s) => [s.step_id, s]));
  const sa = stepMap(a), sb = stepMap(b);
  const stepIds = [...new Set([...Object.keys(sa), ...Object.keys(sb)])];
  const steps = stepIds.map((id) => {
    const x = sa[id], y = sb[id];
    return {
      step_id: id,
      status: { a: x?.status ?? null, b: y?.status ?? null, changed: (x?.status ?? null) !== (y?.status ?? null) },
      engine_version: { a: x?.engine_version ?? null, b: y?.engine_version ?? null, changed: (x?.engine_version ?? null) !== (y?.engine_version ?? null) },
      output_sha256: { a: x?.output_sha256 ?? null, b: y?.output_sha256 ?? null, changed: (x?.output_sha256 ?? null) !== (y?.output_sha256 ?? null) },
      reason_codes: { a: x?.reason_codes ?? [], b: y?.reason_codes ?? [] },
    };
  });
  return {
    a: aId, b: bId,
    overall_status: { a: a.execution.overall_status, b: b.execution.overall_status, changed: a.execution.overall_status !== b.execution.overall_status },
    certification_readiness: { a: a.execution.certification_readiness, b: b.execution.certification_readiness, changed: a.execution.certification_readiness !== b.execution.certification_readiness },
    steps,
  };
}

// Load the pinned artefact observations of an execution — the inputs a reproduction replays against.
export async function getPinnedArtifacts(env, executionId, workspace) {
  const ex = await query(
    `SELECT execution_id FROM validation_executions WHERE execution_id = $1 AND ($2::text IS NULL OR workspace = $2)`,
    [executionId, workspace || null], env,
  );
  if (ex.rows.length === 0) return null;
  const obs = await query(
    `SELECT step_id, artifact_role, endpoint, content_sha256 FROM validation_artifact_observations
       WHERE execution_id = $1 ORDER BY step_id, artifact_role`,
    [executionId], env,
  );
  return obs.rows;
}

function stepOrder(step) {
  return ["discovery", "manifest", "keys", "conformance", "interoperability", "trust", "federation", "evidence", "certification"].indexOf(step) + 1;
}

export { TERMINAL };
