// Unit tests for the canonical-JSON hashing of the durable receipt store (ADR-076 §D-076-08).
// No DB required — pure functions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, canonicalSha256, verifyReceiptDigest } from "../src/receipts/hash.js";

test("canonicalJson sorts object keys recursively (stable regardless of insertion order)", () => {
  const a = { b: 1, a: { z: 2, y: 3 }, c: [3, 1, 2] };
  const b = { c: [3, 1, 2], a: { y: 3, z: 2 }, b: 1 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  // arrays keep order; keys sorted
  assert.equal(canonicalJson(a), '{"a":{"y":3,"z":2},"b":1,"c":[3,1,2]}');
});

test("canonicalSha256 is identical for key-reordered equivalents and different for changed content", () => {
  const r1 = { step: "manifest", result: { status: "VERIFIED" }, reason_codes: ["ok"] };
  const r2 = { reason_codes: ["ok"], result: { status: "VERIFIED" }, step: "manifest" };
  assert.equal(canonicalSha256(r1), canonicalSha256(r2));
  const r3 = { ...r1, result: { status: "FAILED" } };
  assert.notEqual(canonicalSha256(r1), canonicalSha256(r3));
  assert.match(canonicalSha256(r1), /^sha256:[0-9a-f]{64}$/);
});

test("verifyReceiptDigest detects a tampered receipt on read", () => {
  const receipt = { step: "trust", result: { status: "VERIFIED" }, engine: "banza-trust" };
  const stored = canonicalSha256(receipt);
  assert.equal(verifyReceiptDigest(receipt, stored).ok, true);
  const tampered = { ...receipt, result: { status: "FAILED" } };
  const v = verifyReceiptDigest(tampered, stored);
  assert.equal(v.ok, false);
  assert.notEqual(v.recomputed, stored);
});

test("canonicalJson omits undefined/functions and rejects non-finite numbers", () => {
  assert.equal(canonicalJson({ a: 1, b: undefined, c: () => 1 }), '{"a":1}');
  assert.throws(() => canonicalJson({ n: Infinity }), /non-finite/);
});
