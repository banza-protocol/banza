// Tests for the /ask inference queue (ADR-042 gate, upgraded in M2.14E). Protects the single-threaded
// local CPU inference path; excess requests fail fast and safe (never a crash). `createGate` is kept
// as a back-compat alias for `createInferenceQueue`, and the old back-compat env names
// (BANZAI_MAX_CONCURRENCY / BANZAI_QUEUE_SIZE) and stats fields still work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGate } from "../src/concurrency.js";

test("gate enforces concurrency 1 + queue 1; the third concurrent call fails fast (back-compat)", async () => {
  // With the explicit back-compat env names the queue behaves exactly as the M2.8 gate did.
  const gate = createGate({ BANZAI_MAX_CONCURRENCY: "1", BANZAI_QUEUE_SIZE: "1", BANZAI_QUEUE_TIMEOUT_MS: "0", BANZAI_INFERENCE_TIMEOUT_MS: "0" });
  let release1;
  const p1 = gate.run(() => new Promise((r) => { release1 = r; })); // occupies the slot
  let started2 = false;
  const p2 = gate.run(async () => { started2 = true; });             // queues (queue=1)
  await assert.rejects(() => gate.run(async () => {}), (e) => e.code === "QUEUE_FULL");
  assert.equal(started2, false, "queued task waits until the slot frees");
  // M2.14E stats() is richer, but the M2.8 back-compat fields keep their meaning.
  const s = gate.stats();
  assert.equal(s.max_concurrency, 1);
  assert.equal(s.max_queue, 1);
  assert.equal(s.active, 1);
  assert.equal(s.queued, 1);
  release1();
  await Promise.all([p1, p2]);
  assert.equal(started2, true, "queued task runs after the slot frees");
  assert.equal(gate.stats().active, 0);
  assert.equal(gate.stats().queued, 0);
});

test("concurrency never exceeds the limit under a burst", async () => {
  const gate = createGate({ BANZAI_MAX_CONCURRENCY: "1", BANZAI_QUEUE_SIZE: "5" });
  let peak = 0;
  let current = 0;
  const task = async () => {
    current += 1;
    peak = Math.max(peak, current);
    await new Promise((r) => setTimeout(r, 1));
    current -= 1;
  };
  await Promise.all([gate.run(task), gate.run(task), gate.run(task)]);
  assert.equal(peak, 1, "concurrency must never exceed 1");
});

test("a throwing task releases its slot (no leak)", async () => {
  const gate = createGate({ BANZAI_MAX_CONCURRENCY: "1", BANZAI_QUEUE_SIZE: "1" });
  await assert.rejects(() => gate.run(async () => { throw new Error("boom"); }));
  assert.equal(gate.stats().active, 0, "slot is freed even when the task throws");
  // a subsequent call still succeeds
  let ran = false;
  await gate.run(async () => { ran = true; });
  assert.equal(ran, true);
});
