// Increment 7 (§18-§20) — the CANONICAL BanzAI eval: a fast node --test smoke over the committed suite.
// The heavy full-suite scoring lives in eval/canonical-metrics.mjs (run by `npm run eval:canonical` and the
// tools/check-banzai-canonical-eval.sh guard); this keeps `npm test` fast by asserting only the invariants
// on the committed JSONL + a validated sample: ≥2500 structured cases, every one of the six classes present,
// and — on a sample scored against the committed Rust WASM — perfect accuracy + every zero-tolerance
// counter 0. Deterministic; no model, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, ACC_METRICS, ZT_COUNTERS } from "../eval/canonical-checks.mjs";
import { computeMetrics } from "../eval/canonical-metrics.mjs";
import { CLASSES } from "../eval/gen-canonical-eval.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = readFileSync(join(__dirname, "../eval/canonical-eval.jsonl"), "utf8")
  .split("\n").filter((l) => l.trim().length).map((l) => JSON.parse(l));

test("canonical suite holds ≥2500 structured cases with every class populated", () => {
  assert.ok(cases.length >= 2500, `expected ≥2500 cases, got ${cases.length}`);
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  for (const c of cases) {
    assert.ok(c.id && c.family && c.kind, `malformed case ${JSON.stringify(c).slice(0, 80)}`);
    byClass[c.cls] = (byClass[c.cls] || 0) + 1;
  }
  for (const cls of CLASSES) assert.ok(byClass[cls] > 0, `class "${cls}" is empty`);
});

test("a sample of the committed suite scores 1.0 accuracy + 0 zero-tolerance on the WASM engine", () => {
  // stride the whole suite so the sample spans every class/family, kept fast (~280 cases).
  const stride = Math.ceil(cases.length / 280);
  const sample = cases.filter((_, i) => i % stride === 0);
  const m = computeMetrics(sample);
  for (const name of ACC_METRICS) {
    const a = m.accuracy[name];
    if (a.total === 0) continue; // this metric may not be represented in the strided sample
    assert.equal(a.value, 1.0, `${name} = ${a.value} on the sample (expected 1.0)`);
  }
  for (const name of ZT_COUNTERS) {
    assert.equal(m.zeroTolerance[name].violations, 0, `${name} tripped on the sample`);
  }
});

test("the committed metrics report records verdict PASS", () => {
  const report = JSON.parse(readFileSync(join(__dirname, "../eval/canonical-metrics-report.json"), "utf8"));
  assert.equal(report.verdict, "PASS");
  for (const name of ZT_COUNTERS) assert.equal(report.zeroTolerance[name].violations, 0, `${name} > 0 in report`);
});

test("the reconciliation ties 709 and 1564 to the canonical classes", () => {
  const rec = JSON.parse(readFileSync(join(__dirname, "../eval/canonical-reconciliation.json"), "utf8"));
  assert.ok(rec.how_709_1564_map["709"].length > 0);
  assert.ok(rec.how_709_1564_map["1564"].length > 0);
  const bzc = rec.prior_suites.find((p) => p.key === "bzc-4-coverage");
  assert.equal(bzc.count, 1564);
  const m2 = rec.prior_suites.find((p) => p.key === "m2-18b6-grounded");
  assert.equal(m2.count, 709);
});
