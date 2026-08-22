// GENERATOR — the invariant registry, in the two forms the engine and the runtime each need.
//
// `contracts/invariants.json` is the authority. Nothing here restates it: the Rust side gets only what
// it needs to RECOGNISE an invariant by id, and the runtime side gets the record it needs to SERVE it.
// Both are derived, both are regenerated, neither is hand-edited.
//
// The normalized `key` exists because the query normalizer strips hyphens — "INV-LEDGER-003" reaches the
// router as "inv ledger 003". Matching the raw id would silently never fire, which is the kind of gate
// that opens and has nothing behind it.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const reg = JSON.parse(readFileSync(join(ROOT, "contracts/invariants.json"), "utf8"));

const norm = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const all = reg.invariants.map((i) => ({
  id: i.id,
  key: norm(i.id),
  family: i.family,
  severity: i.severity,
  title: i.title,
  statement: i.statement,
  source: i.source,
}));

// Longest key first: "inv fed ledger 001" must win over "inv fed" if a shorter id ever exists.
all.sort((a, b) => b.key.length - a.key.length || a.id.localeCompare(b.id));

writeFileSync(
  join(ROOT, "engines/banzai-query-core/src/invariants.json"),
  JSON.stringify({ _generated_by: "tools/gen-banzai-invariants.mjs",
                   invariants: all.map(({ id, key, severity }) => ({ id, key, severity })) }, null, 2) + "\n",
);
writeFileSync(
  join(ROOT, "services/banzai-api/src/invariantFacts.generated.json"),
  JSON.stringify({ _generated_by: "tools/gen-banzai-invariants.mjs",
                   canonical_source: reg.canonical_source, facts: all }, null, 2) + "\n",
);
console.log(`  invariants: ${all.length} (critical: ${all.filter((i) => i.severity === "critical").length})`);
console.log(`  wrote engines/banzai-query-core/src/invariants.json`);
console.log(`  wrote services/banzai-api/src/invariantFacts.generated.json`);
