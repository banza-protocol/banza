#!/usr/bin/env node
// M2.18B.5 §25 — regenerate artifacts/m2-18b5/alias-truth-table.md from the Rust-derived truth table
// (fuzzy::alias_truth_table via aliasTruthTable()). Run: node tools/gen-alias-truth-table.mjs
import { aliasTruthTable } from "../services/banzai-api/src/knowledge.js";
import { writeFileSync, mkdirSync } from "node:fs";

const t = aliasTruthTable();
const rows = t.rows || [];
const byId = {};
for (const r of rows) (byId[r.id] ||= []).push(r);
let md = "# BANZAI Canonical Alias Truth Table (M2.18B.5)\n\n";
md += "Derived deterministically from `engines/banzai-query-core/src/concept.rs` + `catalogue.rs` via ";
md += "`fuzzy::alias_truth_table`. Regenerate: `node tools/gen-alias-truth-table.mjs`. ";
md += `**Silent collisions (one alias → two ids): ${(t.collisions || []).length}** (must be 0). `;
md += `Rows: ${rows.length}; canonical ids: ${Object.keys(byId).length}.\n\n`;
md += "| Canonical ID | Alias | Normalized | Source |\n|---|---|---|---|\n";
for (const id of Object.keys(byId).sort()) for (const r of byId[id]) md += `| ${r.id} | ${r.alias} | ${r.normalized} | ${r.source} |\n`;
if ((t.collisions || []).length > 0) {
  md += "\n## Collisions (MUST be empty)\n\n";
  for (const [a, ids] of t.collisions) md += `- \`${a}\` → ${ids.join(", ")}\n`;
}
mkdirSync("artifacts/m2-18b5", { recursive: true });
writeFileSync("artifacts/m2-18b5/alias-truth-table.md", md);
console.log(`wrote artifacts/m2-18b5/alias-truth-table.md — rows=${rows.length} ids=${Object.keys(byId).length} collisions=${(t.collisions || []).length}`);
