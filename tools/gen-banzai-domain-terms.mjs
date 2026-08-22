// GENERATOR — the DOMAIN concept alias table the Rust router reads.
//
// Derived from the entries marked `domain: true` in services/banzai-api/src/knowledge.js, which own
// the concepts and their keywords. Two hand-maintained lists that must agree eventually disagree, and
// the one that goes stale is always the one a reader hits — so the router reads this instead, and this
// file is written by nobody.
//
// Longest alias first, so a specific phrase wins over a bare token that is a substring of it.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { ENTRIES } = await import(join(ROOT, "services/banzai-api/src/knowledge.js"));

/** Mirror of the Rust `normalize` for the subset alias keywords use (lowercase, de-accent, [a-z0-9/ ]). */
function normalize(q) {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const rows = [];
for (const e of ENTRIES) {
  if (!e.domain) continue;
  const aliases = [...new Set((e.keywords || []).map(normalize).filter(Boolean))];
  aliases.sort((a, b) => b.length - a.length || a.localeCompare(b));
  rows.push({ id: e.id, aliases });
}
rows.sort((a, b) => a.id.localeCompare(b.id));

const out = join(ROOT, "engines/banzai-query-core/src/domain-terms.json");
writeFileSync(out, JSON.stringify({ _generated_by: "tools/gen-banzai-domain-terms.mjs", concepts: rows }, null, 2) + "\n");
console.log(`  wrote ${out}  (${rows.length} domain concepts, ${rows.reduce((n, r) => n + r.aliases.length, 0)} aliases)`);
