// Fase D — durable validation-receipt E2E (ADR-042). Deterministic, no network.
//
// Exercises the REAL receipt store + fail-safe facade + outbox + crash-recovery + DB-enforced
// append-only immutability against a LIVE ephemeral Postgres (spun up by run-receipts-e2e.sh).
// The PG-DOWN fail-safe path runs in a SEPARATE child process (receipts-down-child.mjs) because the
// pg pool is memoised per-process (src/onboarding/db.js) and cannot be re-pointed mid-run.
//
// Env (set by the wrapper): DATABASE_URL (live), BANZAI_RECEIPTS_ENABLED=1, BANZAI_RECEIPTS_OUTBOX_DIR.
// Exit 0 = all assertions held; non-zero on the first failure.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { rmSync, mkdirSync } from "node:fs";

import * as receipts from "../src/receipts/index.js";
import * as outbox from "../src/receipts/outbox.js";
import { query, getPool } from "../src/onboarding/db.js";
import { canonicalSha256 } from "../src/receipts/hash.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
let n = 0;
const ok = (m) => console.log(`  ok  ${++n}. ${m}`);
async function step(m, fn) {
  try { await fn(); ok(m); }
  catch (e) { console.error(`  FAIL ${++n}. ${m}\n       ${e.message}`); process.exitCode = 1; throw e; }
}

// A realistic canonical OperationReceipt for one technical step. operation_id is unique per
// (execution, step) — exactly as validate.js mints a fresh id per operation (the PK is global).
function opReceipt(execId, stepId, status, extra = {}) {
  return {
    receipt_version: "1.1",
    operation_id: `op-${execId}-${stepId}`,
    step: stepId,
    engine: `banza-${stepId}`,
    engine_version: "1.0.0",
    workflow: "endpoint-originated-validation",
    operator_id: "operador-zero",
    implementation_id: "oz-impl-1",
    environment: "test",
    profile: "L2",
    protocol_version: "2.0",
    canonical_origin: "https://zero.banza.network",
    resolved_host: "zero.banza.network",
    endpoint: `https://zero.banza.network/.well-known/banza/${stepId}.json`,
    started_at: "2026-08-05T00:00:00.000Z",
    fetched_at: "2026-08-05T00:00:01.000Z",
    completed_at: "2026-08-05T00:00:02.000Z",
    input_hash: `sha256:in-${stepId}`,
    output_hash: `sha256:out-${stepId}`,
    http_status: 200,
    content_type: "application/json",
    input_artifact_digests: {
      [stepId]: { endpoint: `https://zero.banza.network/.well-known/banza/${stepId}.json`, sha256: `sha256:art-${stepId}` },
    },
    result: { status },
    reason_codes: extra.reason_codes || [],
    retryable: extra.retryable ?? false,
    blocked_by: extra.blocked_by || [],
    qwen_calls: 0,
    external_model_calls: 0,
    protocol_fetch_count: 1,
    evidence_refs: [],
    ...extra.overrides,
  };
}

const STEPS = ["discovery", "manifest", "keys", "conformance", "interoperability", "trust", "federation", "evidence"];

function journeyReceipt(execId, overall, readiness, extra = {}) {
  return {
    receipt_version: "1.1", journey_id: `jr-${execId}`, request_id: `req-${execId}`,
    workflow: "endpoint-originated-validation", operator_id: "operador-zero", implementation_id: "oz-impl-1",
    environment: "test", profile: "L2", protocol_version: "2.0",
    canonical_origin: "https://zero.banza.network", resolved_host: "zero.banza.network",
    started_at: "2026-08-05T00:00:00.000Z", finished_at: "2026-08-05T00:00:10.000Z", duration_ms: 10000,
    step_count: 9, steps: [], overall_status: overall, certification_readiness: readiness,
    certification_status: "NOT_CERTIFIED", certified: false, reason_codes: [], qwen_calls: 0,
    external_model_calls: 0, protocol_fetch_count: STEPS.length, audit_ref: `audit-${execId}`, ...extra,
  };
}

async function raises(sql, params, wanted) {
  try { await query(sql, params); return false; }
  catch (e) { return wanted ? e.message.includes(wanted) : true; }
}

async function main() {
  console.log("== receipts-e2e (ADR-042 durable receipts, live PG) ==");
  assert.equal(receipts.isEnabled(process.env), true, "store must be enabled (DATABASE_URL + flag)");

  // ── 1. Happy path: begin → 9 steps (last two BLOCKED/FAILED to prove non-positive persistence) ──
  let execId;
  await step("beginExecution persists a RUNNING execution", async () => {
    const r = await receipts.beginExecution({
      operator_id: "operador-zero", implementation_id: "oz-impl-1", protocol_version: "2.0",
      profile: "L2", environment: "test", workspace: "public", idempotency_key: "idem-A", orchestrator_version: "1.0.0",
    });
    assert.equal(r.persisted, true); assert.equal(r.status, receipts.PersistenceStatus.PERSISTED);
    assert.ok(r.execution_id); assert.equal(r.reused, false);
    execId = r.execution_id;
  });

  await step("the RUNNING row is persisted with lifecycle=RUNNING + heartbeat (ADR-042 correction 2)", async () => {
    const row = (await query(`SELECT execution_lifecycle, overall_status, heartbeat_at, completed_at FROM validation_executions WHERE execution_id=$1`, [execId])).rows[0];
    assert.equal(row.execution_lifecycle, "RUNNING");
    assert.equal(row.overall_status, "RUNNING");
    assert.ok(row.heartbeat_at, "heartbeat_at set at start");
    assert.equal(row.completed_at, null);
  });

  await step("idempotent double-submit returns the SAME execution (reused)", async () => {
    const r = await receipts.beginExecution({
      operator_id: "operador-zero", implementation_id: "oz-impl-1", workspace: "public", idempotency_key: "idem-A",
    });
    assert.equal(r.execution_id, execId, "same idempotency_key → same execution");
    assert.equal(r.reused, true);
  });

  await step("heartbeat advances heartbeat_at while RUNNING", async () => {
    const before = (await query(`SELECT heartbeat_at FROM validation_executions WHERE execution_id=$1`, [execId])).rows[0].heartbeat_at;
    await new Promise((r) => setTimeout(r, 30));
    await receipts.heartbeat(execId, "worker-1");
    const after = (await query(`SELECT heartbeat_at, lock_owner FROM validation_executions WHERE execution_id=$1`, [execId])).rows[0];
    assert.ok(new Date(after.heartbeat_at) >= new Date(before));
    assert.equal(after.lock_owner, "worker-1");
  });

  await step("saveStep seals each technical step (VERIFIED×6, then FAILED, then BLOCKED)", async () => {
    for (const s of STEPS.slice(0, 6)) {
      const r = await receipts.saveStep(execId, opReceipt(execId, s, "VERIFIED"));
      assert.equal(r.persisted, true); assert.ok(r.receipt_reference, `receipt_reference for ${s}`);
    }
    const rf = await receipts.saveStep(execId, opReceipt(execId, "federation", "FAILED", { reason_codes: ["FED-SIGNATURE-INVALID"], retryable: true }));
    assert.equal(rf.persisted, true);
    const rb = await receipts.saveStep(execId, opReceipt(execId, "evidence", "BLOCKED", { reason_codes: ["DEP-NOT-VERIFIED"], blocked_by: ["federation"] }));
    assert.equal(rb.persisted, true);
  });

  await step("a FAILED/BLOCKED step persists its NON-positive status faithfully (never upgraded)", async () => {
    const rows = (await query(`SELECT step_id, status, retryable, blocked_by FROM validation_step_executions WHERE execution_id=$1 AND step_id IN ('federation','evidence')`, [execId])).rows;
    const byId = Object.fromEntries(rows.map((r) => [r.step_id, r]));
    assert.equal(byId.federation.status, "FAILED");
    assert.equal(byId.federation.retryable, true);
    assert.equal(byId.evidence.status, "BLOCKED");
    assert.deepEqual(byId.evidence.blocked_by, ["federation"]);
  });

  await step("artefact observations are recorded per step (the inputs a reproduction replays)", async () => {
    const c = (await query(`SELECT count(*)::int AS c FROM validation_artifact_observations WHERE execution_id=$1`, [execId])).rows[0].c;
    assert.equal(c, STEPS.length, "one observation per step (from input_artifact_digests)");
  });

  await step("finalizeJourney seals the aggregate and freezes the execution", async () => {
    const jr = journeyReceipt(execId, "BLOCKED", "BLOCKED");
    const r = await receipts.saveJourney(execId, jr);
    assert.equal(r.persisted, true);
    const row = (await query(`SELECT overall_status, certification_readiness, completed_at, execution_lifecycle, journey_receipt_sha256 FROM validation_executions WHERE execution_id=$1`, [execId])).rows[0];
    assert.equal(row.overall_status, "BLOCKED");
    assert.equal(row.certification_readiness, "BLOCKED");
    assert.ok(row.completed_at, "completed_at set → frozen");
    assert.equal(row.execution_lifecycle, "COMPLETED", "lifecycle advances to COMPLETED at finalize (ADR-042 §6)");
    assert.equal(row.journey_receipt_sha256, canonicalSha256(jr));
  });

  await step("saveEvidenceBundle is content-addressed (id = canonical digest)", async () => {
    const bundle = { execution_id: execId, kind: "evidence-bundle", steps: STEPS };
    const r = await receipts.saveEvidenceBundle(execId, bundle);
    assert.equal(r.persisted, true);
    assert.equal(r.evidenceBundleId, canonicalSha256(bundle));
  });

  // ── 2. Reads: digests verified on read; workspace isolation ──
  await step("readExecution verifies every receipt digest on read (digest_ok=true)", async () => {
    const ex = await receipts.readExecution(execId, "public");
    assert.ok(ex, "execution readable");
    assert.equal(ex.receipts.length, STEPS.length);
    for (const r of ex.receipts) assert.equal(r.digest_ok, true, `digest ok for ${r.step_id}`);
    assert.ok(ex.journey); assert.equal(ex.journey.digest_ok, true);
  });

  await step("workspace scoping isolates reads (wrong workspace → null)", async () => {
    const wrong = await receipts.readExecution(execId, "someone-else");
    assert.equal(wrong, null, "cannot read another workspace's execution");
  });

  await step("tampering detection: a row with a wrong stored digest reads back digest_ok=false", async () => {
    // INSERT is allowed (append-only forbids only UPDATE/DELETE); simulate out-of-band tampering.
    const forgedExec = (await receipts.beginExecution({ operator_id: "operador-zero", implementation_id: "oz-tamper", workspace: "public" })).execution_id;
    const rec = opReceipt(forgedExec, "discovery", "VERIFIED");
    await query(
      `INSERT INTO operation_receipts (receipt_id, execution_id, step_id, receipt, receipt_sha256) VALUES ($1,$2,$3,$4,$5)`,
      [`op-forged-${forgedExec}`, forgedExec, "discovery", JSON.stringify(rec), "sha256:deadbeef-wrong"],
    );
    const ex = await receipts.readExecution(forgedExec, "public");
    const forged = ex.receipts.find((r) => r.step_id === "discovery");
    assert.equal(forged.digest_ok, false, "mismatched stored digest is flagged on read");
  });

  // ── 3. DB-enforced append-only immutability (ADR-042 §D-076-08) ──
  await step("operation_receipts / journey_receipts / evidence_bundles / observations reject UPDATE and DELETE", async () => {
    assert.ok(await raises(`UPDATE operation_receipts SET receipt_sha256='x' WHERE execution_id=$1`, [execId], "append-only"), "op UPDATE blocked");
    assert.ok(await raises(`DELETE FROM operation_receipts WHERE execution_id=$1`, [execId], "append-only"), "op DELETE blocked");
    assert.ok(await raises(`UPDATE journey_receipts SET receipt_sha256='x' WHERE execution_id=$1`, [execId], "append-only"), "journey UPDATE blocked");
    assert.ok(await raises(`DELETE FROM journey_receipts WHERE execution_id=$1`, [execId], "append-only"), "journey DELETE blocked");
    assert.ok(await raises(`UPDATE evidence_bundles SET bundle_sha256='x' WHERE execution_id=$1`, [execId], "append-only"), "evidence UPDATE blocked");
    assert.ok(await raises(`DELETE FROM validation_artifact_observations WHERE execution_id=$1`, [execId], "append-only"), "observation DELETE blocked");
  });

  await step("a completed execution is frozen (UPDATE blocked) and never deletable", async () => {
    assert.ok(await raises(`UPDATE validation_executions SET overall_status='VERIFIED' WHERE execution_id=$1`, [execId], "frozen"), "frozen exec UPDATE blocked");
    assert.ok(await raises(`DELETE FROM validation_executions WHERE execution_id=$1`, [execId], "not deletable"), "exec DELETE blocked");
  });

  await step("a sealed step is frozen; step identity columns are immutable", async () => {
    assert.ok(await raises(`UPDATE validation_step_executions SET status='VERIFIED' WHERE execution_id=$1 AND step_id='federation'`, [execId], "sealed step is frozen"), "sealed step UPDATE blocked");
    assert.ok(await raises(`DELETE FROM validation_step_executions WHERE execution_id=$1`, [execId], "not deletable"), "step DELETE blocked");
  });

  // ── 4. Retry + reproduction lineage; comparison; pinned artefacts ──
  let reproId;
  await step("reproduction is a NEW execution linked via reproduction_of + typed result", async () => {
    const r = await receipts.beginExecution({
      operator_id: "operador-zero", implementation_id: "oz-impl-1", workspace: "public",
      reproduction_of: execId, idempotency_key: "idem-repro-1",
    });
    reproId = r.execution_id;
    assert.notEqual(reproId, execId, "reproduction is a distinct execution");
    // this reproduction observes the same inputs and reaches the same verdict → SEMANTICALLY_EQUIVALENT
    for (const s of STEPS.slice(0, 6)) await receipts.saveStep(reproId, opReceipt(reproId, s, "VERIFIED"));
    await receipts.saveStep(reproId, opReceipt(reproId, "federation", "FAILED", { reason_codes: ["FED-SIGNATURE-INVALID"], retryable: true }));
    await receipts.saveStep(reproId, opReceipt(reproId, "evidence", "BLOCKED", { blocked_by: ["federation"] }));
    await receipts.saveJourney(reproId, journeyReceipt(reproId, "BLOCKED", "BLOCKED", { reproduction_of: execId, reproduction_result: "SEMANTICALLY_EQUIVALENT" }));
    const row = (await query(`SELECT reproduction_of, reproduction_result FROM validation_executions WHERE execution_id=$1`, [reproId])).rows[0];
    assert.equal(row.reproduction_of, execId);
    assert.equal(row.reproduction_result, "SEMANTICALLY_EQUIVALENT");
  });

  await step("compareExecutions diffs the two runs field-by-field (equivalent → no status change)", async () => {
    const d = await receipts.diffExecutions(execId, reproId, "public");
    assert.equal(d.overall_status.changed, false, "same overall_status");
    const fed = d.steps.find((s) => s.step_id === "federation");
    assert.equal(fed.status.changed, false, "federation FAILED in both");
  });

  await step("getPinnedArtifacts returns the observed inputs (reproduction replay set)", async () => {
    const pinned = await receipts.pinnedArtifacts(execId, "public");
    assert.equal(pinned.length, STEPS.length);
    assert.ok(pinned.every((p) => p.content_sha256 && p.endpoint), "each pinned artefact has endpoint + digest");
  });

  await step("listExecutions returns both runs of the implementation", async () => {
    const list = await receipts.readExecutions("oz-impl-1", "public");
    const ids = list.map((r) => r.execution_id);
    assert.ok(ids.includes(execId) && ids.includes(reproId));
  });

  // ── 5. Crash recovery (deterministic) ──
  await step("recoverStale marks a stale RUNNING execution INTERRUPTED, leaves a fresh one RUNNING", async () => {
    const staleId = (await receipts.beginExecution({ operator_id: "operador-zero", implementation_id: "oz-crash", workspace: "public" })).execution_id;
    const freshId = (await receipts.beginExecution({ operator_id: "operador-zero", implementation_id: "oz-crash", workspace: "public" })).execution_id;
    // Age the stale one's heartbeat well past the threshold (allowed: still RUNNING, not frozen).
    await query(`UPDATE validation_executions SET heartbeat_at = now() - interval '1 hour' WHERE execution_id=$1`, [staleId]);
    const recovered = await receipts.recoverStale(300);
    assert.ok(recovered >= 1, "at least the stale one recovered");
    const s = (await query(`SELECT execution_lifecycle, overall_status, interrupted_at FROM validation_executions WHERE execution_id=$1`, [staleId])).rows[0];
    assert.equal(s.execution_lifecycle, "INTERRUPTED");
    assert.equal(s.overall_status, "BLOCKED");
    assert.ok(s.interrupted_at);
    const f = (await query(`SELECT execution_lifecycle FROM validation_executions WHERE execution_id=$1`, [freshId])).rows[0];
    assert.equal(f.execution_lifecycle, "RUNNING", "fresh RUNNING run untouched");
  });

  await step("cancel marks a RUNNING execution BLOCKED; a completed one cannot be cancelled", async () => {
    const cId = (await receipts.beginExecution({ operator_id: "operador-zero", implementation_id: "oz-cancel", workspace: "public" })).execution_id;
    const c = await receipts.cancel(cId, "public");
    assert.equal(c.cancelled, true);
    const row = (await query(`SELECT cancelled_at, overall_status FROM validation_executions WHERE execution_id=$1`, [cId])).rows[0];
    assert.ok(row.cancelled_at); assert.equal(row.overall_status, "BLOCKED");
    // completed execId is frozen: cancel is a no-op UPDATE guarded by completed_at IS NULL (no row matched)
    await receipts.cancel(execId, "public");
    const still = (await query(`SELECT cancelled_at FROM validation_executions WHERE execution_id=$1`, [execId])).rows[0];
    assert.equal(still.cancelled_at, null, "a completed run stays uncancelled");
  });

  // ── 6. Outbox drain recovery (records queued during a prior outage now persist to live PG) ──
  await step("outbox drain recovery: queued records persist to PG and the outbox empties", async () => {
    const drainExec = `exec-drain-${Date.now()}`;
    // Simulate records queued while PG was down (exact payloads, as onFailure would enqueue).
    outbox.enqueue({ kind: "execution", execution_id: drainExec, payload: {
      execution_id: drainExec, operator_id: "operador-zero", implementation_id: "oz-drain", workspace: "public",
    } });
    outbox.enqueue({ kind: "step", execution_id: drainExec, payload: opReceipt(drainExec, "discovery", "VERIFIED") });
    assert.ok(receipts.outboxPending() >= 2, "records are durably queued");
    const res = await receipts.drainOutbox();
    assert.ok(res.drained >= 2, "records drained");
    assert.equal(receipts.outboxPending(), 0, "outbox empty after drain");
    const ex = await receipts.readExecution(drainExec, "public");
    assert.ok(ex, "drained execution now persisted + readable");
    assert.equal(ex.steps.length, 1, "the queued step landed");
  });

  // ── 7. PG-DOWN fail-safe path (separate process; dead DATABASE_URL) ──
  await step("PG-DOWN: writes fail safe — explicit PENDING status, execution_id present, NO fake receipt_reference", async () => {
    const outDir = path.join(process.env.BANZAI_RECEIPTS_OUTBOX_DIR, "down");
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const child = spawnSync(process.execPath, [path.join(HERE, "receipts-down-child.mjs")], {
      env: {
        ...process.env,
        DATABASE_URL: "postgres://banzai_rw:x@127.0.0.1:59999/banza_protocol", // closed port
        BANZAI_RECEIPTS_ENABLED: "1",
        BANZAI_RECEIPTS_OUTBOX_DIR: outDir,
      },
      encoding: "utf8",
    });
    if (child.status !== 0) throw new Error(`down-child failed (${child.status}):\n${child.stdout}\n${child.stderr}`);
    // Records are durably queued into the JSONL journal (exact payloads), not lost, not faked.
    const queued = outbox.readAll({ BANZAI_RECEIPTS_OUTBOX_DIR: outDir });
    assert.ok(queued.length >= 2, `outbox durably queued the failed writes (${queued.length})`);
    assert.ok(queued.some((r) => r.kind === "execution") && queued.some((r) => r.kind === "step"), "queued the execution + step payloads");
    assert.ok(queued.every((r) => r.sha256 || r.kind === "execution"), "queued records carry their canonical hash");
  });

  await step("PG-DOWN with NO durable outbox → explicit PERSISTENCE_FAILED (not a silent success)", async () => {
    const child = spawnSync(process.execPath, [path.join(HERE, "receipts-down-child.mjs"), "--no-outbox"], {
      env: {
        ...process.env,
        DATABASE_URL: "postgres://banzai_rw:x@127.0.0.1:59999/banza_protocol",
        BANZAI_RECEIPTS_ENABLED: "1",
        BANZAI_RECEIPTS_OUTBOX_DIR: "", // no durable journal configured → explicit FAILED
      },
      encoding: "utf8",
    });
    if (child.status !== 0) throw new Error(`down-child(--no-outbox) failed (${child.status}):\n${child.stdout}\n${child.stderr}`);
  });

  const pool = getPool(process.env);
  if (pool) await pool.end();
  if (process.exitCode) { console.error("\nRECEIPTS E2E: FAIL"); return; }
  console.log(`\nRECEIPTS E2E: ✓ ${n} assertions held`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
