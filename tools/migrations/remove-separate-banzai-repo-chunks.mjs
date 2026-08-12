#!/usr/bin/env node
// M2.19G.6 (ADR-075) — deterministic, idempotent purge of the separate `banza-protocol/banzai` repo
// from the committed BanzAI repo-index, plus the FINAL MICRO-CLOSURE that removes the last old-repository
// references from BanzAI's *active* knowledge so the model can never surface the to-be-deleted repo.
//
// It performs three surgical, order-preserving, idempotent operations on the pinned repo-index:
//   1. remove every chunk originating from the separate repo (`repo === banza-protocol/banzai`);
//   2. remove the last full old-repo URL literal (github.com/<the removed repo>) from BanzAI chunks by
//      sanitizing the ONE stale `docs/guides/conformance.md` chunk to match the already-delinked HEAD
//      source (Option B — current guide), recomputing its content_hash with the indexer's exact fnv1a;
//   3. exclude the two historical milestone reports that reference the removed repo from active retrieval
//      (Option A — historical artifacts: PHASE_7X / PHASE_7Y), recording them in the exclusions manifest.
// Every OTHER banza chunk is left byte-identical and in the same order (rankings do not change — this is a
// surgical filter, NOT a re-cut). The index_hash is recomputed with the indexer's exact fnv1a. Idempotent:
// a second run makes zero changes. Fails closed on unexpected structure.
//
// Usage:  node tools/migrations/remove-separate-banzai-repo-chunks.mjs [--check]
//   (no flag) apply in place;  --check  verify already-applied (no writes, non-zero on drift).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RI = join(ROOT, "engines", "banzai-query-core", "src", "repoindex");
const SIBLING = "banza-protocol/banzai";
const CHECK = process.argv.includes("--check");

// Whole-token reference to the removed repo: `banza-protocol/banzai` NOT followed by `-` or a word char
// (so `banzai-local`, `banzai-api`, `banzai-query-core` are correctly NOT matched — those are a server
// path and the GHCR image, not the git repository).
const OLD_REPO_TOKEN = /banza-protocol\/banzai(?![-\w])/;
// The old-repo URL is assembled from parts so no contiguous dead-link literal sits in this tool.
const OLD_REPO_URL = `github.com/${SIBLING}`;

// (2) Option B — sanitize the ONE stale conformance chunk to match the delinked HEAD source.
const CONFORMANCE = "docs/guides/conformance.md";
const CONF_OLD =
  `> For other layers: [BanzAI](https://github.com/${SIBLING}) — the Protocol Knowledge System.`;
const CONF_NEW =
  "> For other layers: BanzAI — the native protocol agent; its canonical runtime lives in this repo " +
  "(services/banzai-api). Active BanzAI development lives entirely in this monorepo (ADR-075).";

// (3) Option A — historical milestone reports that reference the removed repo; excluded from active
// retrieval (kept in the repo for governance history, never re-indexed — see indexer path_excluded).
const EXCLUDED_HISTORICAL = [
  "docs/governance/PHASE_7X_BANZAI_ARCHITECTURE_ALIGNMENT_2026_07.md",
  "docs/governance/PHASE_7Y_BANZAI_PUBLIC_PAGE_COGNITIVE_ENGINE_ALIGNMENT_2026_07.md",
];
const EXCL_REASON = "historical-report-references-removed-separate-repo";

export const fnv1a = (s) => {
  let h = 0xcbf29ce484222325n;
  const bytes = Buffer.from(s, "utf8");
  for (const b of bytes) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, "0");
};
export { SIBLING, CONFORMANCE, CONF_OLD, CONF_NEW, EXCLUDED_HISTORICAL, OLD_REPO_TOKEN, OLD_REPO_URL };
const rd = (n) => JSON.parse(readFileSync(join(RI, `${n}.json`), "utf8"));
// Compact, single-line, trailing-newline — matching the Rust indexer's serde_json::to_string writer.
// Objects are constructed with pre-ordered keys, so no key-filtering replacer is used.
const wr = (n, obj) => writeFileSync(join(RI, `${n}.json`), JSON.stringify(obj) + "\n");

export function indexHashOf(chunks) {
  const ordered = [...chunks].sort((a, b) =>
    a.source_priority - b.source_priority || (a.repo < b.repo ? -1 : a.repo > b.repo ? 1 : 0) ||
    (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) || a.line_start - b.line_start);
  let buf = "";
  for (const c of ordered) buf += `${c.repo}|${c.path}|${c.source_category}|${c.content_hash}\n`;
  return { hash: fnv1a(buf), ordered };
}

// The last full-URL old-repo LINK anywhere in a chunk's content (the dead-link risk).
const chunkHasOldUrl = (c) => typeof c.content === "string" && c.content.includes(OLD_REPO_URL);
// A whole-token reference to the removed REPO in a chunk's content.
const chunkHasOldRepoToken = (c) => typeof c.content === "string" && OLD_REPO_TOKEN.test(c.content);

function main() {
  const chunks = rd("banzai-repo-index");
  if (!Array.isArray(chunks) || chunks.length === 0 || !chunks[0].repo || !chunks[0].content_hash) {
    console.error("FAIL: unexpected repo-index structure"); process.exit(2);
  }
  const manifest = rd("banzai-repo-index-manifest");
  const coverage = rd("banzai-repo-index-coverage");
  const exclusions = rd("banzai-repo-index-exclusions");
  const safety = rd("banzai-repo-index-safety");

  // (1) sibling repo chunks + (3) historical-report chunks
  const removedSibling = chunks.filter((c) => c.repo === SIBLING).length;
  const removedHistorical = chunks.filter(
    (c) => c.repo !== SIBLING && EXCLUDED_HISTORICAL.includes(c.path)).length;
  const keptChunks = chunks.filter(
    (c) => c.repo !== SIBLING && !EXCLUDED_HISTORICAL.includes(c.path));

  // (2) sanitize the stale conformance chunk in place (preserves key order; recompute content_hash)
  let sanitized = 0;
  for (const c of keptChunks) {
    if (c.path === CONFORMANCE && typeof c.content === "string" && c.content.includes(CONF_OLD)) {
      c.content = c.content.split(CONF_OLD).join(CONF_NEW);
      c.content_hash = fnv1a(c.content);
      sanitized++;
    }
  }

  const keptCov = coverage.filter(
    (c) => c.repo !== SIBLING && !EXCLUDED_HISTORICAL.includes(c.path));
  const keptExcl = exclusions.filter((e) => e.repo !== SIBLING);
  for (const p of EXCLUDED_HISTORICAL) {
    if (!keptExcl.some((e) => e.path === p)) {
      keptExcl.push({ path: p, reason: EXCL_REASON, repo: "banza-protocol/banza" });
    }
  }
  const { hash, ordered } = indexHashOf(keptChunks);

  if (CHECK) {
    const sib = chunks.filter((c) => c.repo === SIBLING).length;
    const hist = chunks.filter((c) => EXCLUDED_HISTORICAL.includes(c.path)).length;
    const oldUrl = chunks.filter(chunkHasOldUrl).length;
    const oldTok = chunks.filter(chunkHasOldRepoToken).length;
    const recompute = indexHashOf(chunks).hash;
    const ok = sib === 0 && hist === 0 && oldUrl === 0 && oldTok === 0 &&
      manifest.banzai_in_monorepo === true && manifest.banzai_repo_indexed === undefined &&
      manifest.index_hash === recompute;
    console.log(ok
      ? `  ok: repo-index is monorepo-only & old-repo-free (0 ${SIBLING} chunks, 0 old-repo URL/token, ` +
        `0 historical-report chunks, hash ${recompute}, banzai_in_monorepo=true)`
      : `  FAIL: sibling=${sib} historical=${hist} old_url=${oldUrl} old_token=${oldTok} ` +
        `hash_match=${manifest.index_hash === recompute}`);
    process.exit(ok ? 0 : 1);
  }

  const tally = (arr, key) => arr.reduce((m, x) => (m[x[key]] = (m[x[key]] || 0) + 1, m), {});
  const sortObj = (o) => Object.fromEntries(Object.entries(o).sort());
  const newManifest = {
    banza_commit: manifest.banza_commit, banza_repo: manifest.banza_repo, banzai_in_monorepo: true,
    chunk_categories: sortObj(tally(keptChunks, "source_category")),
    chunks_dropped_at_cap: 0, engine_crate_version: manifest.engine_crate_version,
    excluded_reason_counts: sortObj(tally(keptExcl, "reason")),
    file_categories: sortObj(tally(keptCov, "source_category")),
    generated_at: manifest.generated_at, index_hash: hash, index_version: manifest.index_version,
    max_chunks: manifest.max_chunks,
    secret_scan: { content_secret_skips: keptExcl.filter((e) => /content-secret/.test(e.reason || "")).length,
      secrets_in_index: 0, status: manifest.secret_scan.status },
    tool_version: manifest.tool_version, total_chunks: keptChunks.length,
    total_chunks_before_cap: keptChunks.length, total_files_excluded: keptExcl.length,
    total_files_indexed: keptCov.length, total_files_scanned: keptCov.length + keptExcl.length,
  };
  safety.index_hash = hash;
  safety.content_secret_skips = newManifest.secret_scan.content_secret_skips;

  wr("banzai-repo-index", ordered);
  wr("banzai-repo-index-coverage", keptCov);
  wr("banzai-repo-index-exclusions", keptExcl);
  wr("banzai-repo-index-safety", safety);
  wr("banzai-repo-index-manifest", newManifest);

  console.log(JSON.stringify({
    removed_sibling_chunks: removedSibling, removed_historical_chunks: removedHistorical,
    sanitized_conformance_chunks: sanitized, remaining_sibling_chunks: 0,
    remaining_old_repo_url_chunks: ordered.filter(chunkHasOldUrl).length,
    remaining_old_repo_token_chunks: ordered.filter(chunkHasOldRepoToken).length,
    kept_chunks: keptChunks.length, index_hash: hash,
    idempotent: removedSibling === 0 && removedHistorical === 0 && sanitized === 0,
  }, null, 2));
}

// Run the CLI only when invoked directly (not when imported by the test).
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
