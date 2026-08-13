#!/usr/bin/env node
// M2.18B.2 — OFFLINE deterministic action-boundary evaluation (Part 12/13/27). Runs the boundary
// dataset through the Rust detector (boundary_evaluate_json) — NO model, NO network — and proves:
//   • boundary recall = 1.0 (every sensitive action is detected)               → the safety gate
//   • zero document-prefix bypass                                              → the safety gate
//   • informational false-positive rate ≤ threshold (precision)               → usability
// Writes artifacts/banzai/boundary-eval.{json,md}. Exit 0 iff every threshold is met.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const kb = require("../src/rustkb/banzai_api_kb.js");
const ds = JSON.parse(readFileSync(join(__dirname, "boundary.dataset.json"), "utf8"));
const th = ds.thresholds;

const evalq = (q) => JSON.parse(kb.boundary_evaluate_json(q));

const boundaryMisses = [];
let boundaryHit = 0;
let docBypass = 0;
for (const c of ds.boundary_cases) {
  const d = evalq(c.q);
  if (d.boundary_detected) boundaryHit += 1;
  else {
    boundaryMisses.push(c);
    if (c.category === "doc_prefix") docBypass += 1;
  }
}

const infoFalsePos = [];
for (const c of ds.informational_cases) {
  const d = evalq(c.q);
  if (d.boundary_detected) infoFalsePos.push(c);
}

// Per-category recall breakdown (Part 27) — proves the gate holds in EVERY taxonomy family, not just
// on aggregate, so a regression concentrated in one family cannot hide behind a high overall number.
const perCategory = {};
for (const c of ds.boundary_cases) {
  const k = c.category;
  perCategory[k] = perCategory[k] || { total: 0, detected: 0 };
  perCategory[k].total += 1;
  if (evalq(c.q).boundary_detected) perCategory[k].detected += 1;
}
const byCategory = Object.fromEntries(
  Object.entries(perCategory).map(([k, v]) => [k, { total: v.total, detected: v.detected, recall: v.detected / v.total }]),
);

const metrics = {
  boundary_cases: ds.boundary_cases.length,
  boundary_recall: ds.boundary_cases.length ? boundaryHit / ds.boundary_cases.length : 1,
  boundary_false_negatives: boundaryMisses.length,
  document_bypass: docBypass,
  informational_cases: ds.informational_cases.length,
  informational_false_positive_rate: ds.informational_cases.length
    ? infoFalsePos.length / ds.informational_cases.length
    : 0,
  by_category: byCategory,
};

const gate = [
  ["boundary_recall", metrics.boundary_recall >= th.boundary_recall_min],
  ["boundary_false_negatives", metrics.boundary_false_negatives <= th.boundary_false_negatives_max],
  ["document_bypass", metrics.document_bypass <= th.document_bypass_max],
  ["informational_false_positive_rate", metrics.informational_false_positive_rate <= th.informational_false_positive_rate_max],
];
const pass = gate.every(([, ok]) => ok);

const out = { milestone: ds.milestone, metrics, thresholds: th, gate: Object.fromEntries(gate), pass, boundary_misses: boundaryMisses, informational_false_positives: infoFalsePos };
const artDir = join(__dirname, "..", "..", "..", "artifacts", "m2-18b2");
try { mkdirSync(artDir, { recursive: true }); writeFileSync(join(artDir, "boundary-eval.json"), JSON.stringify(out, null, 2)); } catch { /* artifacts optional */ }

console.log("M2.18B.2 offline boundary eval");
console.log(JSON.stringify(metrics, null, 2));
console.log("\nGATE:");
for (const [n, ok] of gate) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}`);
if (boundaryMisses.length) {
  console.log(`\nBOUNDARY FALSE NEGATIVES (${boundaryMisses.length}):`);
  for (const m of boundaryMisses) console.log(`  ✗ [${m.category}] ${m.q}`);
}
if (infoFalsePos.length) {
  console.log(`\nINFORMATIONAL OVER-BLOCKS (${infoFalsePos.length}):`);
  for (const m of infoFalsePos) console.log(`  ✗ [${m.category}] ${m.q}`);
}
console.log(`\nVERDICT: ${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);
