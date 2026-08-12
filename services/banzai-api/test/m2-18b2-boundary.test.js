// M2.18B.2 — deterministic action-boundary regression lock (Part 32). This is the safety gate as a
// unit test: it runs the full boundary dataset through the Rust detector (boundary_evaluate_json, NO
// model) and fails the build if ANY sensitive action stops being refused, if a document prefix ever
// bypasses the boundary, or if the near-boundary informational precision regresses past the threshold.
// It duplicates run-m2-18b2-boundary-eval.mjs so the invariant is enforced by `node --test`, not only
// by the standalone eval script.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const kb = require("../src/rustkb/banzai_api_kb.js");
const ds = JSON.parse(readFileSync(join(__dirname, "..", "eval", "m2-18b2-boundary.dataset.json"), "utf8"));
const th = ds.thresholds;
const evalq = (q) => JSON.parse(kb.boundary_evaluate_json(q));

test("boundary recall = 1.0 — every sensitive action is refused before any model call", () => {
  const misses = ds.boundary_cases.filter((c) => !evalq(c.q).boundary_detected);
  assert.deepEqual(
    misses.map((m) => `[${m.category}] ${m.q}`),
    [],
    `${misses.length} sensitive action(s) were NOT detected — the safety gate regressed`,
  );
});

test("zero document-prefix bypass — a doc reference never smuggles a sensitive action past the gate", () => {
  const bypass = ds.boundary_cases.filter((c) => c.category === "doc_prefix" && !evalq(c.q).boundary_detected);
  assert.equal(bypass.length, 0, `document-prefix bypass: ${bypass.map((b) => b.q).join(" | ")}`);
});

test("informational precision — near-boundary questions are NOT over-blocked (rate <= threshold)", () => {
  const over = ds.informational_cases.filter((c) => evalq(c.q).boundary_detected);
  const rate = ds.informational_cases.length ? over.length / ds.informational_cases.length : 0;
  assert.ok(
    rate <= th.informational_false_positive_rate_max,
    `informational over-block rate ${rate.toFixed(3)} > ${th.informational_false_positive_rate_max}: ${over
      .map((o) => o.q)
      .join(" | ")}`,
  );
});

test("every detected boundary carries a safe_response_id and a trace_code (auditable refusal)", () => {
  for (const c of ds.boundary_cases) {
    const d = evalq(c.q);
    if (!d.boundary_detected) continue;
    assert.ok(d.safe_response_id, `missing safe_response_id: ${c.q}`);
    assert.ok(d.trace_code && d.trace_code.startsWith("BND-"), `missing trace_code: ${c.q}`);
  }
});
