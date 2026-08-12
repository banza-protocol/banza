// Unit tests for the durable receipt outbox (ADR-076 §D-076-08, correction 1). Uses a temp dir; no DB.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as outbox from "../src/receipts/outbox.js";

function tmpEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "banzai-outbox-"));
  return { BANZAI_RECEIPTS_OUTBOX_DIR: dir };
}

test("isAvailable is true for a writable dir, false when unset", () => {
  assert.equal(outbox.isAvailable({}), false);
  assert.equal(outbox.isAvailable(tmpEnv()), true);
});

test("enqueue persists a record; readAll returns it", () => {
  const env = tmpEnv();
  assert.equal(outbox.enqueue({ kind: "step", execution_id: "exec-1", payload: { step: "manifest" }, sha256: "sha256:x" }, env), true);
  const all = outbox.readAll(env);
  assert.equal(all.length, 1);
  assert.equal(all[0].kind, "step");
  assert.equal(all[0].execution_id, "exec-1");
});

test("enqueue returns false (no fake durability) when no dir configured", () => {
  assert.equal(outbox.enqueue({ kind: "step", execution_id: "e", payload: {} }, {}), false);
});

test("drain removes successfully-persisted records and keeps failures with incremented attempts", async () => {
  const env = tmpEnv();
  outbox.enqueue({ kind: "step", execution_id: "ok", payload: {} }, env);
  outbox.enqueue({ kind: "step", execution_id: "fail", payload: {} }, env);
  assert.equal(outbox.pendingCount(env), 2);
  // persistOne succeeds only for execution_id 'ok'
  const res = await outbox.drain((rec) => rec.execution_id === "ok", env);
  assert.equal(res.drained, 1);
  assert.equal(res.remaining, 1);
  const left = outbox.readAll(env);
  assert.equal(left.length, 1);
  assert.equal(left[0].execution_id, "fail");
  assert.equal(left[0].attempts, 1); // incremented — safe retry, never re-runs the engine
});

test("drain is a no-op when the outbox is unavailable", async () => {
  const res = await outbox.drain(() => true, {});
  assert.equal(res.drained, 0);
});
