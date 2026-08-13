// M2.18B.3A — canonical corpus INTEGRITY audit + global truth-table.
//
// Every public canonical document (ADR + RFC) is checked across the four layers the grounded synthesis path
// depends on, so nothing the site can be asked about is silently unreachable:
//
//   discoverable — the document has chunks in the build-time doc-index (retrieval can find it);
//   resolvable   — Rust candidate generation proposes its canonical id for an explicit reference;
//   citable      — the Rust FactualPackage built for that id lists it in allowed_source_ids (the Round B
//                  exact-source path), so an answer about it can actually cite it;
//   guarded      — this audit runs in CI (make banzai-canonical-corpus-integrity-check), so a new or moved
//                  document that breaks any layer fails the build.
//
// Pure + deterministic: it drives the committed Rust/WASM engines (no model, no network). Run standalone to
// (re)generate the manifest artifact; imported by the guard to assert 100% integrity in-process.

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateCandidates, buildFactualPackagePlanned } from "../src/knowledge.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// Canonical id from a filename (ADR-NNN / RFC-NNNN), zero-padded to the registry's form.
export function idOf(name) {
  let m = String(name).match(/^ADR-(\d+)/i);
  if (m) return `ADR-${String(+m[1]).padStart(3, "0")}`;
  m = String(name).match(/^RFC-(\d+)/i);
  if (m) return `RFC-${String(+m[1]).padStart(4, "0")}`;
  return null;
}

// Discover the canonical corpus from the filesystem (source of truth: the .md files on disk).
export function discoverCanonicalDocs() {
  const scan = (dir, re) => {
    const p = path.join(ROOT, dir);
    if (!existsSync(p)) return [];
    return readdirSync(p)
      .filter((f) => re.test(f))
      .map((f) => ({ id: idOf(f), file: `${dir}/${f}`, kind: /adr/i.test(dir) ? "adr" : "rfc" }))
      .filter((x) => x.id);
  };
  const adrs = scan("decisions/adr", /^ADR-\d+.*\.md$/i);
  const rfcs = scan("decisions/rfc", /^RFC-\d+.*\.md$/i);
  return [...adrs, ...rfcs].sort((a, b) => a.id.localeCompare(b.id));
}

// Chunk counts per canonical id from the build-time doc-index (discoverability layer).
function indexCounts() {
  const idx = JSON.parse(readFileSync(path.join(ROOT, "engines/banzai-query-core/src/doc-index.json"), "utf8"));
  const byId = new Map();
  for (const c of idx) {
    const id = idOf((c.path || "").split("/").pop() || "") || idOf(c.title || "");
    if (id) byId.set(id, (byId.get(id) || 0) + 1);
  }
  return { byId, chunks: idx.length };
}

// The full truth-table over the discovered corpus.
export function runAudit() {
  const docs = discoverCanonicalDocs();
  const { byId, chunks } = indexCounts();
  const rows = docs.map(({ id, file, kind }) => {
    const discoverable = (byId.get(id) || 0) > 0;
    const cands = generateCandidates(`explica ${id}`, 6) || [];
    const resolvable = cands.some((c) => c.id === id);
    const pkg = buildFactualPackagePlanned("audit", `explica ${id}`, id, "brief");
    const citable = Boolean(pkg && Array.isArray(pkg.allowed_source_ids) && pkg.allowed_source_ids.includes(id));
    const ok = discoverable && resolvable && citable;
    return { id, kind, file, chunks: byId.get(id) || 0, discoverable, resolvable, citable, ok };
  });
  const gaps = rows.filter((r) => !r.ok);
  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.ok).length,
    discoverable: rows.filter((r) => r.discoverable).length,
    resolvable: rows.filter((r) => r.resolvable).length,
    citable: rows.filter((r) => r.citable).length,
    index_chunks: chunks,
    adr: rows.filter((r) => r.kind === "adr").length,
    rfc: rows.filter((r) => r.kind === "rfc").length,
  };
  return { summary, rows, gaps };
}

// Standalone: (re)generate the committed manifest artifact.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const audit = runAudit();
  const outDir = path.join(ROOT, "artifacts/banzai");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "corpus-truth-table.json");
  writeFileSync(out, JSON.stringify({ milestone: "M2.18B.3A canonical corpus integrity", ...audit }, null, 2) + "\n");
  console.log(`corpus truth-table: ${audit.summary.ok}/${audit.summary.total} ok → ${out}`);
  if (audit.gaps.length) {
    console.log("GAPS:");
    for (const g of audit.gaps) console.log(`  ${g.id} discoverable=${g.discoverable} resolvable=${g.resolvable} citable=${g.citable} | ${g.file}`);
    process.exit(1);
  }
}
