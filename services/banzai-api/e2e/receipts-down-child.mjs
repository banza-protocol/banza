// Fase D — PG-DOWN fail-safe child (ADR-042 correction 1). Runs in its OWN process because the pg pool
// is memoised per-process (src/onboarding/db.js): DATABASE_URL points at a closed port, so every write
// throws at connect() and the facade must fail SAFE — never crash, never fake a receipt_reference, and
// surface an EXPLICIT persistence status:
//   • a writable outbox configured → PERSISTENCE_PENDING (durably queued for retry);
//   • no writable outbox           → PERSISTENCE_FAILED  (explicit failure, not silent success).
//
// Usage: node receipts-down-child.mjs [--no-outbox]. Exit 0 iff the honest contract holds.

import assert from "node:assert/strict";
import * as receipts from "../src/receipts/index.js";

const noOutbox = process.argv.includes("--no-outbox");
const expected = noOutbox ? receipts.PersistenceStatus.FAILED : receipts.PersistenceStatus.PENDING;

const rec = {
  receipt_version: "1.1", operation_id: "op-down-fixed", step: "discovery", engine: "banza-discovery",
  engine_version: "1.0.0", result: { status: "VERIFIED" }, endpoint: "https://zero.banza.network/x.json",
  input_hash: "sha256:in", output_hash: "sha256:out", input_artifact_digests: {},
};

const jr = { receipt_version: "1.1", journey_id: "jr-down", overall_status: "PENDING", steps: [] };

const begin = await receipts.beginExecution({ operator_id: "operador-zero", implementation_id: "oz-down", workspace: "public" });
assert.equal(begin.persisted, false, "PG down → not persisted");
assert.equal(begin.status, expected, `beginExecution status ${begin.status} === ${expected}`);
assert.ok(begin.execution_id, "a stable execution_id is still returned so a retry can target it");

const stepR = await receipts.saveStep(begin.execution_id, rec);
assert.equal(stepR.persisted, false, "PG down → step not persisted");
assert.equal(stepR.status, expected, `saveStep status ${stepR.status} === ${expected}`);
assert.equal(stepR.receipt_reference, null, "NEVER a fake receipt_reference on failure");

const jrR = await receipts.saveJourney(begin.execution_id, jr);
assert.equal(jrR.persisted, false);
assert.equal(jrR.status, expected, `saveJourney status ${jrR.status} === ${expected}`);

if (noOutbox) {
  assert.equal(receipts.outboxPending(), 0, "no durable outbox → nothing queued (explicit FAILED)");
} else {
  assert.ok(receipts.outboxPending() >= 2, "durable outbox queued the failed writes for retry");
}

console.log(JSON.stringify({ mode: noOutbox ? "no-outbox" : "outbox", status: expected, pending: receipts.outboxPending() }));
process.exit(0);
