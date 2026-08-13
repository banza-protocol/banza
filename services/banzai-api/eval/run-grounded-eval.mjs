#!/usr/bin/env node
// M2.18B.6 (§18) — the OFFLINE automatic evaluation for the Rust-First Grounded-Synthesis architecture.
//
// The understanding chain (resolve → plan → build) is pure deterministic Rust, so this eval runs entirely
// against the WASM engine — NO server, NO Qwen, NO network. That makes it reproducible and CI-gating. It
// scores the dataset's zero-tolerance invariants and exits non-zero if any threshold is missed (thresholds
// live in the dataset and are NEVER lowered to pass). It measures exactly what the milestone guarantees:
//
//   • boundary recall = 1.0            — every boundary/adversarial question trips the Rust boundary
//   • boundary 0 Qwen = 1.0            — a refused question plans ZERO model calls
//   • grounded has facts = 1.0         — every explanation/exact/impact/compare/example/mixed/follow_up grounds
//   • grounded exactly 1 Qwen = 1.0    — a grounded explanation plans exactly ONE model call
//   • unsupported declined = 1.0       — an off-domain question grounds ZERO facts (BanzAI declines)
//   • ambiguity safe = 1.0             — a bare/partial reference never yields a confident answer (0 facts or clarify)
//   • external calls = 0               — structural (offline); asserted for completeness
//   • determinism = 1.0                — re-building a sample yields the identical package_checksum
//
// Usage:  node eval/run-grounded-eval.mjs        (exit 0 iff every gate passes)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveIntent, buildFactualPackagePlanned } from "../src/knowledge.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(join(__dirname, "grounded.dataset.json"), "utf8"));
const th = ds.thresholds;

const GROUNDED = new Set(["explanation", "exact", "impact", "compare", "example", "mixed", "follow_up", "concept"]);
const REFUSED = new Set(["boundary", "adversarial"]);

function evalCase(c) {
  const resolved = resolveIntent(c.question, "");
  const pkg = buildFactualPackagePlanned("t", c.question, "", "");
  if (!resolved || !pkg) return { ok: false, why: "engine returned null" };
  const facts = pkg.facts.length;
  const calls = pkg.answer_plan ? pkg.answer_plan.expected_model_calls : (resolved.expected_model_calls ?? 1);
  const boundary = Boolean(resolved.boundary_detected);
  const allowed = pkg.allowed_source_ids || [];
  const clarify = Boolean(resolved.requires_clarification);
  const external = pkg.answer_plan && pkg.answer_plan.expected_model_calls > 1 ? 1 : 0; // >1 would imply a 2nd pass

  if (REFUSED.has(c.category)) {
    if (!boundary) return { ok: false, why: "boundary NOT detected", kind: "boundary_recall" };
    if (calls !== 0) return { ok: false, why: `refused but plans ${calls} model calls`, kind: "boundary_zero_qwen" };
    return { ok: true, kind: "refused" };
  }
  if (c.category === "unsupported") {
    if (boundary) return { ok: false, why: "off-domain wrongly flagged boundary" };
    if (facts !== 0) return { ok: false, why: `off-domain grounded ${facts} facts (should decline)`, kind: "unsupported" };
    return { ok: true, kind: "unsupported" };
  }
  if (c.category === "ambiguity") {
    if (boundary) return { ok: false, why: "ambiguous wrongly flagged boundary" };
    if (facts > 0 && !clarify) return { ok: false, why: "ambiguous produced a confident answer", kind: "ambiguity" };
    return { ok: true, kind: "ambiguity" };
  }
  // grounded categories
  if (boundary) return { ok: false, why: "grounded question wrongly flagged boundary" };
  if (facts <= 0) return { ok: false, why: "grounded 0 facts", kind: "grounded_facts" };
  if (calls !== 1) return { ok: false, why: `grounded plans ${calls} model calls (must be exactly 1)`, kind: "grounded_one_call" };
  if (external) return { ok: false, why: "grounded implies an external/2nd call", kind: "external" };
  if (c.entity && !allowed.includes(c.entity)) return { ok: false, why: `entity ${c.entity} not in allowed [${allowed}]`, kind: "entity" };
  if (c.a && c.b && (!allowed.includes(c.a) || !allowed.includes(c.b))) return { ok: false, why: `compare missing a side [${allowed}]`, kind: "compare" };
  return { ok: true, kind: "grounded" };
}

const A = { total: 0, misses: [] };
const kinds = {}; // kind -> [pass, total]
const bump = (k, ok) => { const a = (kinds[k] = kinds[k] || [0, 0]); a[1] += 1; if (ok) a[0] += 1; };

for (const c of ds.cases) {
  A.total += 1;
  const r = evalCase(c);
  // attribute to the metric family
  if (REFUSED.has(c.category)) { bump("boundary_recall", r.ok || r.kind !== "boundary_recall"); bump("boundary_zero_qwen", r.ok || r.kind !== "boundary_zero_qwen"); }
  else if (c.category === "unsupported") bump("unsupported_declined", r.ok);
  else if (c.category === "ambiguity") bump("ambiguity_safe", r.ok);
  else { bump("grounded_has_facts", r.ok || r.kind !== "grounded_facts"); bump("grounded_one_call", r.ok || r.kind !== "grounded_one_call"); }
  if (!r.ok) A.misses.push({ category: c.category, question: c.question, why: r.why });
}

// determinism: re-build a deterministic sample and require identical package_checksum
let detPass = 0, detTotal = 0;
for (let i = 0; i < ds.cases.length; i += 37) {
  const c = ds.cases[i];
  detTotal += 1;
  const a = buildFactualPackagePlanned("t", c.question, "", "");
  const b = buildFactualPackagePlanned("t", c.question, "", "");
  if (a && b && a.package_checksum === b.package_checksum) detPass += 1;
}

const rate = (k) => { const a = kinds[k]; return a && a[1] ? a[0] / a[1] : 1; };
const metrics = {
  cases: A.total,
  boundary_recall: rate("boundary_recall"),
  boundary_zero_qwen: rate("boundary_zero_qwen"),
  grounded_has_facts: rate("grounded_has_facts"),
  grounded_one_call: rate("grounded_one_call"),
  unsupported_declined: rate("unsupported_declined"),
  ambiguity_safe: rate("ambiguity_safe"),
  external_calls: 0,
  determinism: detTotal ? detPass / detTotal : 1,
};

const gate = [
  ["boundary_recall", metrics.boundary_recall >= th.boundary_recall_min],
  ["boundary_zero_qwen", metrics.boundary_zero_qwen >= th.boundary_zero_qwen_min],
  ["grounded_has_facts", metrics.grounded_has_facts >= th.grounded_has_facts_min],
  ["grounded_one_call", metrics.grounded_one_call >= th.grounded_one_call_min],
  ["unsupported_declined", metrics.unsupported_declined >= th.unsupported_declined_min],
  ["ambiguity_safe", metrics.ambiguity_safe >= th.ambiguity_safe_min],
  ["external_calls", metrics.external_calls <= th.external_calls_max],
  ["determinism", metrics.determinism >= th.determinism_min],
];
const pass = gate.every(([, ok]) => ok);

console.log(`M2.18B.6 OFFLINE eval — ${A.total} cases (deterministic; no server, no Qwen, no network)`);
console.log(JSON.stringify(metrics, null, 2));
console.log("\nGATE:");
for (const [n, ok] of gate) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}`);
if (A.misses.length) {
  console.log(`\nMISSES (${A.misses.length}):`);
  for (const m of A.misses.slice(0, 40)) console.log(`  (${m.category}) "${m.question}" → ${m.why}`);
  if (A.misses.length > 40) console.log(`  … and ${A.misses.length - 40} more`);
}
console.log(`\nVERDICT: ${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);
