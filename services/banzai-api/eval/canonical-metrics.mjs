#!/usr/bin/env node
// canonical-metrics.mjs — the CANONICAL eval metrics harness (Increment 7, §20).
//
// Reads the committed, versioned canonical-eval.jsonl and, driving ONLY the committed Rust WASM engine
// through canonical-checks.evaluate (no model, no network, no pg — hermetic), computes the eleven mandated
// accuracy metrics and the eight ZERO-TOLERANCE counters, then GATES on them: the harness exits non-zero if
// any zero-tolerance counter > 0, if any accuracy falls below its frozen floor, or if any mandated metric has
// no coverage. Because every committed expectation was engine-confirmed at generation time, the accuracy
// metrics measure 1.0 and the zero-tolerance counters 0 on HEAD — the value is REGRESSION protection: a
// future engine change that breaks any frozen expectation drops an accuracy below its floor (fail) and a
// change that lets a boundary/claim/metric through trips a zero-tolerance counter (fail). Emits the metrics
// report artifact (canonical-metrics-report.{json,md}).
//
// Usage:  node eval/canonical-metrics.mjs           # compute, write the report, gate (non-zero on breach)
//         node eval/canonical-metrics.mjs --check   # compute, gate, AND fail if the committed report drifted

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, ACC_METRICS, ZT_COUNTERS } from "./canonical-checks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "canonical-eval.jsonl");
const REPORT_JSON = join(__dirname, "canonical-metrics-report.json");
const REPORT_MD = join(__dirname, "canonical-metrics-report.md");

// Frozen floors. Every accuracy floor is 1.0 (the value measured on the engine-confirmed golden set); every
// zero-tolerance counter is a hard 0. A regression pushes a measured value below its floor → the gate fails.
const ACC_FLOOR = Object.fromEntries(ACC_METRICS.map((m) => [m, 1.0]));

function readCases() {
  return readFileSync(DATA, "utf8")
    .split("\n")
    .filter((l) => l.trim().length)
    .map((l) => JSON.parse(l));
}

export function computeMetrics(cases) {
  const acc = Object.fromEntries(ACC_METRICS.map((m) => [m, { num: 0, den: 0 }]));
  const zt = Object.fromEntries(ZT_COUNTERS.map((m) => [m, { violations: 0, applicable: 0 }]));
  for (const c of cases) {
    const r = evaluate(c);
    for (const m of ACC_METRICS) {
      const v = r.dims[m];
      if (v === null) continue;
      acc[m].den++;
      if (v === true) acc[m].num++;
    }
    for (const m of ZT_COUNTERS) {
      const v = r.zt[m];
      if (v === null) continue;
      zt[m].applicable++;
      if (v === 1) zt[m].violations++;
    }
  }
  const accuracy = {};
  for (const m of ACC_METRICS) {
    accuracy[m] = {
      value: acc[m].den ? acc[m].num / acc[m].den : null,
      passed: acc[m].den,
      total: acc[m].den,
      floor: ACC_FLOOR[m],
    };
  }
  const zeroTolerance = {};
  for (const m of ZT_COUNTERS) {
    zeroTolerance[m] = { violations: zt[m].violations, applicable: zt[m].applicable, rate: zt[m].applicable ? zt[m].violations / zt[m].applicable : 0 };
  }
  return { accuracy, zeroTolerance };
}

function gate(metrics) {
  const failures = [];
  for (const m of ACC_METRICS) {
    const a = metrics.accuracy[m];
    if (a.total === 0) { failures.push(`${m}: NO COVERAGE (0 applicable cases)`); continue; }
    if (a.value < a.floor) failures.push(`${m}: ${a.value.toFixed(4)} < floor ${a.floor}`);
  }
  for (const m of ZT_COUNTERS) {
    const z = metrics.zeroTolerance[m];
    if (z.violations > 0) failures.push(`${m}: ${z.violations} violation(s) — MUST be 0`);
  }
  return failures;
}

function classFamily(cases) {
  const byClass = {}, byFamily = {};
  for (const c of cases) {
    byClass[c.cls] = (byClass[c.cls] || 0) + 1;
    byFamily[c.family] = (byFamily[c.family] || 0) + 1;
  }
  return { byClass, byFamily };
}

function renderMd(report) {
  const L = [];
  L.push("# BanzAI Canonical Eval — Metrics Report (Increment 7, §20)");
  L.push("");
  L.push(`- Schema version: ${report.schema_version}`);
  L.push(`- Total cases: **${report.total_cases}** (floor 2500)`);
  L.push(`- Driver: committed Rust WASM (query-core) via canonical-checks.evaluate — hermetic, 0 model calls, 0 network`);
  L.push(`- Verdict: **${report.verdict}**`);
  L.push("");
  L.push("## Accuracy metrics");
  L.push("");
  L.push("| metric | value | floor | applicable cases |");
  L.push("|---|---|---|---|");
  for (const m of ACC_METRICS) {
    const a = report.accuracy[m];
    L.push(`| ${m} | ${a.value === null ? "n/a" : a.value.toFixed(4)} | ${a.floor.toFixed(2)} | ${a.total} |`);
  }
  L.push("");
  L.push("## Zero-tolerance counters (every one MUST be 0)");
  L.push("");
  L.push("| counter | violations | applicable cases |");
  L.push("|---|---|---|");
  for (const m of ZT_COUNTERS) {
    const z = report.zeroTolerance[m];
    L.push(`| ${m} | ${z.violations} | ${z.applicable} |`);
  }
  L.push("");
  L.push("## Coverage");
  L.push("");
  L.push("By class: " + Object.entries(report.by_class).map(([k, v]) => `${k}=${v}`).join(" · "));
  L.push("");
  L.push("By family: " + Object.entries(report.by_family).map(([k, v]) => `${k}=${v}`).join(" · "));
  L.push("");
  return L.join("\n") + "\n";
}

function main() {
  const cases = readCases();
  const metrics = computeMetrics(cases);
  const failures = gate(metrics);
  const { byClass, byFamily } = classFamily(cases);
  const report = {
    schema_version: 1,
    milestone: "Increment 7 — canonical eval reconciliation + ≥2500 cases + final metrics (§18-§20)",
    generated_by: "eval/canonical-metrics.mjs (deterministic; committed Rust WASM; no model, no network)",
    total_cases: cases.length,
    verdict: failures.length ? "FAIL" : "PASS",
    accuracy: metrics.accuracy,
    zeroTolerance: metrics.zeroTolerance,
    by_class: byClass,
    by_family: byFamily,
  };
  const json = JSON.stringify(report, null, 2) + "\n";
  const md = renderMd(report);

  const check = process.argv.includes("--check");
  if (check) {
    let drift = 0;
    for (const [file, want] of [[REPORT_JSON, json], [REPORT_MD, md]]) {
      let cur = "";
      try { cur = readFileSync(file, "utf8"); } catch { /* fresh */ }
      if (cur !== want) { console.error(`DRIFT: ${file} is stale — run \`node eval/canonical-metrics.mjs\``); drift = 1; }
    }
    if (drift) process.exit(1);
  } else {
    writeFileSync(REPORT_JSON, json);
    writeFileSync(REPORT_MD, md);
  }

  // print the table
  console.log(`== canonical eval metrics — ${cases.length} cases — verdict ${report.verdict} ==`);
  console.log("accuracy:");
  for (const m of ACC_METRICS) {
    const a = metrics.accuracy[m];
    console.log(`  ${m.padEnd(30)} ${a.value === null ? "n/a" : a.value.toFixed(4)}  (floor ${a.floor}, n=${a.total})`);
  }
  console.log("zero-tolerance (must be 0):");
  for (const m of ZT_COUNTERS) {
    const z = metrics.zeroTolerance[m];
    console.log(`  ${m.padEnd(42)} ${z.violations}  (n=${z.applicable})`);
  }
  if (failures.length) {
    console.error("\nGATE FAILURES:");
    for (const f of failures) console.error("  ✗ " + f);
    process.exit(1);
  }
  console.log("\nALL METRICS PASS — every zero-tolerance counter = 0.");
}

// Executable entrypoint only — importing this module (for computeMetrics) is side-effect-free.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
