// Service facade for the durable validation receipt store (ADR-042 §D-076-08).
//
// Persistence is a durable SIDE-EFFECT of validation: the receipt is always returned to the caller in
// the HTTP body; persisting it additionally makes the run consultable/comparable/reproducible later.
// Therefore the WRITE wrappers are FAIL-SAFE — a DB outage logs and returns {persisted:false} but never
// breaks a validation. READS require the store to be enabled and throw/return null on outage (the caller
// turns that into a safe JSON envelope). Env-gated OFF by default (BANZAI_RECEIPTS_ENABLED), like
// onboarding, so the routes 404 until the migration + config are installed at deploy.

import { randomUUID } from "node:crypto";
import * as store from "./store.js";
import * as outbox from "./outbox.js";
import { canonicalSha256, canonicalJson, verifyReceiptDigest } from "./hash.js";

export function isEnabled(env = process.env) {
  return env.BANZAI_RECEIPTS_ENABLED === "1" && !!env.DATABASE_URL;
}

// Persistence-status vocabulary (ADR-042 correction 1) — an execution is only "durably concluded" when
// PERSISTED. On DB failure the engine result still stands, but the caller MUST surface the honest status
// and MUST NOT present a receipt_reference / history / comparison / reproduction as available.
export const PersistenceStatus = {
  PERSISTED: "PERSISTED",
  PENDING: "PERSISTENCE_PENDING",              // durably queued in the outbox; retry will complete it
  FAILED: "PERSISTENCE_FAILED",                // no durable queue available — explicit failure
  DISABLED: "PERSISTENCE_DISABLED",            // store not enabled in this environment
  NOT_PERSISTED: "RESULT_AVAILABLE_NOT_PERSISTED", // engine result returned, persistence not confirmed
};

function log(level, msg, extra = {}) {
  console.log(JSON.stringify({ level, msg, component: "banzai-receipts", ...extra }));
}

function onFailure(kind, executionId, payload, sha256, env) {
  const enq = outbox.enqueue({ kind, execution_id: executionId, payload, sha256 }, env);
  return enq ? PersistenceStatus.PENDING : PersistenceStatus.FAILED;
}

// ── Fail-safe writes (never throw; validation continues regardless) ──────────────────────────────

export async function beginExecution(fields, env = process.env) {
  if (!isEnabled(env)) return { persisted: false, status: PersistenceStatus.DISABLED, execution_id: null };
  // Generate a stable execution_id up front so a persist failure can still be retried against it.
  const withId = { ...fields, execution_id: fields.execution_id || `exec-${randomUUID()}` };
  try {
    const { execution_id, reused } = await store.createExecution(env, withId);
    return { persisted: true, status: PersistenceStatus.PERSISTED, execution_id, reused };
  } catch (err) {
    log("error", "beginExecution failed", { error: err.message });
    const status = onFailure("execution", withId.execution_id, withId, null, env);
    return { persisted: false, status, execution_id: withId.execution_id };
  }
}

export async function saveStep(executionId, receipt, env = process.env) {
  if (!isEnabled(env) || !executionId) return { persisted: false, status: PersistenceStatus.DISABLED, receipt_reference: null };
  try {
    const r = await store.recordStep(env, executionId, receipt);
    return { persisted: true, status: PersistenceStatus.PERSISTED, receipt_reference: r.receiptId, ...r };
  } catch (err) {
    log("error", "saveStep failed", { error: err.message, step: receipt && receipt.step });
    const status = onFailure("step", executionId, receipt, canonicalSha256(receipt), env);
    return { persisted: false, status, receipt_reference: null }; // NEVER a fake reference
  }
}

export async function saveJourney(executionId, journeyReceipt, env = process.env) {
  if (!isEnabled(env) || !executionId) return { persisted: false, status: PersistenceStatus.DISABLED };
  try {
    const r = await store.finalizeJourney(env, executionId, journeyReceipt);
    return { persisted: true, status: PersistenceStatus.PERSISTED, ...r };
  } catch (err) {
    log("error", "saveJourney failed", { error: err.message });
    const status = onFailure("journey", executionId, journeyReceipt, canonicalSha256(journeyReceipt), env);
    return { persisted: false, status };
  }
}

export async function saveEvidenceBundle(executionId, bundle, env = process.env) {
  if (!isEnabled(env) || !executionId) return { persisted: false, status: PersistenceStatus.DISABLED };
  try {
    const r = await store.storeEvidenceBundle(env, executionId, bundle);
    return { persisted: true, status: PersistenceStatus.PERSISTED, ...r };
  } catch (err) {
    log("error", "saveEvidenceBundle failed", { error: err.message });
    const status = onFailure("evidence", executionId, bundle, canonicalSha256(bundle), env);
    return { persisted: false, status };
  }
}

// ── Operational state: heartbeat, crash recovery, outbox drain ───────────────────────────────────

export async function heartbeat(executionId, lockOwner, env = process.env) {
  if (!isEnabled(env) || !executionId) return;
  try { await store.heartbeat(env, executionId, lockOwner); }
  catch (err) { log("warn", "heartbeat failed", { error: err.message }); }
}

export async function recoverStale(staleSeconds = 300, env = process.env) {
  if (!isEnabled(env)) return 0;
  try { return await store.recoverStaleExecutions(env, staleSeconds); }
  catch (err) { log("error", "recoverStale failed", { error: err.message }); return 0; }
}

export async function drainOutbox(env = process.env) {
  if (!isEnabled(env) || !outbox.isAvailable(env)) return { drained: 0, remaining: outbox.pendingCount(env) };
  return outbox.drain((rec) => store.persistRecord(env, rec), env);
}

// Start the background drain + stale-recovery loop. Returns a stop() to clear the timer (tests/shutdown).
export function startBackgroundLoop(intervalMs = 60000, env = process.env) {
  if (!isEnabled(env)) return () => {};
  const t = setInterval(() => {
    drainOutbox(env).catch(() => {});
    recoverStale(300, env).catch(() => {});
  }, intervalMs);
  if (t.unref) t.unref();
  return () => clearInterval(t);
}

export function outboxPending(env = process.env) {
  return outbox.pendingCount(env);
}

// ── Reads (workspace-scoped; require the store) ──────────────────────────────────────────────────

export async function readExecution(executionId, workspace, env = process.env) {
  if (!isEnabled(env)) return null;
  return store.getExecution(env, executionId, workspace);
}

export async function readExecutions(implementationId, workspace, env = process.env) {
  if (!isEnabled(env)) return [];
  return store.listExecutions(env, implementationId, workspace);
}

export async function diffExecutions(aId, bId, workspace, env = process.env) {
  if (!isEnabled(env)) return { error: "receipts_disabled" };
  return store.compareExecutions(env, aId, bId, workspace);
}

// ADR-042 read-only telemetry: journey/per-step duration metrics over persisted executions. FAIL-SAFE for
// the agent path — a disabled store or a DB outage returns an honest `receipts_disabled` shape (n:0), never
// throws, so the pipeline degrades to an honest INSUFFICIENT_MEASUREMENTS answer rather than an error.
export async function readDurationMetrics(filters, env = process.env) {
  if (!isEnabled(env)) return { receipts_disabled: true, n: 0, comparable_execution_count: 0, latest: null, per_step: [] };
  try {
    return await store.queryDurationMetrics(env, filters || {});
  } catch (err) {
    log("error", "readDurationMetrics failed", { error: err.message });
    return { receipts_disabled: false, error: "telemetry_unavailable", n: 0, comparable_execution_count: 0, latest: null, per_step: [] };
  }
}

export async function pinnedArtifacts(executionId, workspace, env = process.env) {
  if (!isEnabled(env)) return null;
  return store.getPinnedArtifacts(env, executionId, workspace);
}

export async function cancel(executionId, workspace, env = process.env) {
  if (!isEnabled(env)) return { cancelled: false };
  try {
    await store.cancelExecution(env, executionId, workspace);
    return { cancelled: true };
  } catch (err) {
    log("error", "cancel failed", { error: err.message });
    return { cancelled: false };
  }
}

export { canonicalSha256, canonicalJson, verifyReceiptDigest, store };
