// M2.18B.3A Round A — canonical corpus truth-table audit. Discovers public docs from the filesystem and
// checks each across the layers the grounded synthesis depends on: doc-index (chunks), docref registry (resolvable),
// candidate generation. No model. Surfaces gaps (missing/orphan) + confirms ADR-053/054.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const kb = require("/Users/fm65/banza/services/banzai-api/src/rustkb/banzai_api_kb.js");
const root = "/Users/fm65/banza";
const jp = (s) => { try { return JSON.parse(s); } catch { return null; } };

// 1. discover ADR/RFC canonical files
function discover(dir, re) {
  const p = `${root}/${dir}`;
  if (!existsSync(p)) return [];
  return readdirSync(p).filter((f) => re.test(f)).map((f) => ({ file: `${dir}/${f}`, id: idOf(f) })).filter((x) => x.id);
}
function idOf(f) {
  let m = f.match(/^ADR-(\d+)/i); if (m) return `ADR-${String(+m[1]).padStart(3, "0")}`;
  m = f.match(/^RFC-(\d+)/i); if (m) return `RFC-${String(+m[1]).padStart(4, "0")}`;
  return null;
}
const adrs = discover("decisions/adr", /^ADR-\d+.*\.md$/i);
const rfcs = discover("decisions/rfc", /^RFC-\d+.*\.md$/i);
const all = [...adrs, ...rfcs];

// 2. doc-index membership (by canonical id appearing in a chunk path/title)
const docIndex = jp(readFileSync(`${root}/engines/banzai-query-core/src/doc-index.json`, "utf8")) || [];
const indexById = new Map();
for (const c of docIndex) {
  const id = idOf((c.path || "").split("/").pop() || "") || idOf(c.title || "");
  if (id) indexById.set(id, (indexById.get(id) || 0) + 1);
}

// 3. per-doc truth row
let gaps = [];
const rows = all.map(({ file, id }) => {
  const chunks = indexById.get(id) || 0;
  const cands = jp(kb.generate_candidates_json(`explica ${id}`, 4)) || [];
  const resolvable = cands.some((c) => c.id === id);
  const ok = chunks > 0 && resolvable;
  if (!ok) gaps.push({ id, file, chunks, resolvable });
  return { id, chunks, resolvable, ok };
});
console.log(`discovered: ${adrs.length} ADR + ${rfcs.length} RFC = ${all.length} canonical docs`);
console.log(`doc-index: ${docIndex.length} chunks covering ${indexById.size} ids`);
console.log(`truth-table OK: ${rows.filter((r) => r.ok).length}/${rows.length}`);
console.log(`GAPS (${gaps.length}):`);
gaps.forEach((g) => console.log(`  ${g.id} chunks=${g.chunks} resolvable=${g.resolvable} | ${g.file}`));
// explicit ADR-053/054 confirmation
for (const id of ["ADR-053", "ADR-054"]) {
  const row = rows.find((r) => r.id === id);
  console.log(`CONFIRM ${id}: ${row ? JSON.stringify(row) : "NOT DISCOVERED"}`);
}
// hardcoded-limit scan
const cat = readFileSync(`${root}/engines/banzai-query-core/src/catalogue.rs`, "utf8");
const dr = readFileSync(`${root}/engines/banzai-query-core/src/docref.rs`, "utf8");
console.log("hardcoded numeric ADR ranges in catalogue/docref:", (cat + dr).match(/1\.\.=?\s*\d\d/g) || "none");
