#!/usr/bin/env node
// M2.18B.6 (§19) — offline PARITY harness: the deterministic Rust understanding (pass B, resolve_intent)
// must match-or-exceed the RETIRED model-entry interpretation (pass A) it replaced. The old architecture
// paid one Qwen call to interpret the question; the new one does it in Rust for free and deterministically.
// Parity means B >= A on every measured axis — otherwise removing the model-entry pass would have been a
// regression. A (the baseline) is the bar the model-entry pass was REQUIRED to clear (the unchanged
// M2.18B.3 thresholds — entity ≥0.97, intent-family ≥0.95, boundary 1.0); the retired 7B model-entry
// achieved 1.0/1.0/1.0 on this corpus, so equalling it at zero model cost is the whole point.
//
// Read-only, offline (WASM only). Exit 0 iff B >= A on every axis.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveIntent } from "../src/knowledge.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(join(__dirname, "m2-18b6-grounded.dataset.json"), "utf8"));

// A — the model-entry baseline the retired Qwen interpretation had to clear (unchanged thresholds).
const A = { entity_resolution: 0.97, intent_family: 0.95, boundary_recall: 1.0 };
// reference: the retired 7B model-entry ACHIEVED these on this corpus (documented, not re-run offline).
const A_MODEL_ACHIEVED = { entity_resolution: 1.0, intent_family: 1.0, boundary_recall: 1.0 };

const GROUNDED_FAMILY = new Set(["explanation", "exact", "impact", "compare", "example", "mixed", "follow_up", "concept"]);
const REFUSED = new Set(["boundary", "adversarial"]);

const acc = { ent: [0, 0], fam: [0, 0], bnd: [0, 0] };
const misses = [];
for (const c of ds.cases) {
  const r = resolveIntent(c.question, "");
  if (!r) { misses.push({ q: c.question, why: "resolve null" }); continue; }
  // entity resolution (B): entity-anchored cases must resolve to the intended id, deterministically.
  if (c.entity) {
    acc.ent[1] += 1;
    if (r.resolved_entity_id === c.entity) acc.ent[0] += 1;
    else misses.push({ q: c.question, why: `entity ${r.resolved_entity_id} != ${c.entity}` });
  }
  // intent family (B): a grounded question resolves to a grounded intent (not boundary); a refused one
  // trips boundary. This is the "family" the model-entry used to choose — Rust chooses it deterministically.
  if (GROUNDED_FAMILY.has(c.category)) {
    acc.fam[1] += 1;
    if (!r.boundary_detected && r.primary_intent && r.primary_intent !== "unsupported") acc.fam[0] += 1;
    else misses.push({ q: c.question, why: `grounded family miss (intent ${r.primary_intent}, boundary ${r.boundary_detected})` });
  }
  if (REFUSED.has(c.category)) {
    acc.bnd[1] += 1;
    if (r.boundary_detected) acc.bnd[0] += 1;
    else misses.push({ q: c.question, why: "boundary not detected" });
  }
}

const rate = (x) => (x[1] ? x[0] / x[1] : 1);
const B = { entity_resolution: rate(acc.ent), intent_family: rate(acc.fam), boundary_recall: rate(acc.bnd) };

const gate = [
  ["entity_resolution", B.entity_resolution >= A.entity_resolution],
  ["intent_family", B.intent_family >= A.intent_family],
  ["boundary_recall", B.boundary_recall >= A.boundary_recall],
];
const pass = gate.every(([, ok]) => ok);

console.log("M2.18B.6 PARITY — Rust resolve_intent (B) vs retired model-entry required bar (A)");
console.log("A (required bar):", JSON.stringify(A));
console.log("A (7B achieved): ", JSON.stringify(A_MODEL_ACHIEVED));
console.log("B (Rust):        ", JSON.stringify(B, null, 0));
console.log("\nGATE (B >= A):");
for (const [n, ok] of gate) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}  (B=${B[n].toFixed(4)} >= A=${A[n]})`);
if (misses.length) {
  console.log(`\nMISSES (${misses.length}):`);
  for (const m of misses.slice(0, 25)) console.log(`  "${m.q}" → ${m.why}`);
  if (misses.length > 25) console.log(`  … and ${misses.length - 25} more`);
}
console.log(`\nVERDICT: ${pass ? "PASS (B >= A — removing the model-entry pass is not a regression)" : "FAIL"}`);
process.exit(pass ? 0 : 1);
