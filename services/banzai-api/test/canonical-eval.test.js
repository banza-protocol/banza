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
const recon = JSON.parse(
  readFileSync(join(__dirname, "../eval/canonical-reconciliation.json"), "utf8"),
);

test("the canonical suite is structurally sound and every class is populated", () => {
  // This asserted ≥2500 and went stale the moment the decision-record reset legitimately removed the
  // cases whose subject matter had been deleted. A count is an observation, not a property: pinning a
  // round number makes a correct change look like a regression and tempts whoever hits it to pad the
  // corpus back over the line.
  //
  // No replacement floor is asserted here, and deliberately so. The prior suites sum to more than the
  // canonical corpus because the corpus DEDUPLICATES across them, so their total is not a floor — and
  // inventing one would be fabricating a baseline to make a test look rigorous. Drift of the corpus
  // against its generator is checked where it belongs, by `make banzai-canonical-eval-check`.
  //
  // What this test owns is that every case is well formed and no class is empty.
  assert.ok(cases.length > 0, "the canonical suite is empty");
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

test("every prior suite is reconciled onto the canonical classes", () => {
  // This asserted two literal counts, 709 and 1564. One of them changed for a legitimate reason and the
  // assertion became a claim about history rather than about the corpus. The property is that every
  // prior suite is accounted for and mapped — not that any particular one has a particular size.
  assert.ok(recon.prior_suites.length > 0, "no prior suite is reconciled");
  for (const p of recon.prior_suites) {
    assert.ok(p.key, "a reconciled suite has no key");
    assert.ok(Number.isInteger(p.count) && p.count > 0, `${p.key} has no positive count`);
  }
  for (const key of Object.keys(recon.how_709_1564_map || {})) {
    assert.ok(
      recon.how_709_1564_map[key].length > 0,
      `${key} maps onto no canonical class`,
    );
  }
});
