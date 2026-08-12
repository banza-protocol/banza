// M2.19G.6 (ADR-075) — test for the separate-repo chunk purge + final micro-closure.
// Run: node --test tools/migrations/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fnv1a, indexHashOf, SIBLING, CONFORMANCE, CONF_OLD, CONF_NEW, EXCLUDED_HISTORICAL,
  OLD_REPO_TOKEN, OLD_REPO_URL,
} from "./remove-separate-banzai-repo-chunks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RI = join(ROOT, "engines", "banzai-query-core", "src", "repoindex");
const rd = (n) => JSON.parse(readFileSync(join(RI, `${n}.json`), "utf8"));

const chunk = (repo, path, cat, i, content = "x") => ({
  repo, path, source_category: cat, content, content_hash: fnv1a(content),
  source_priority: i, line_start: i,
});

test("purge removes only sibling chunks; banza chunks kept byte-identical and in order", () => {
  const banza = [
    chunk("banza-protocol/banza", "a.md", "normative", 1),
    chunk("banza-protocol/banza", "b.rs", "banzai-runtime", 2),
    chunk("banza-protocol/banza", "c.ts", "website", 4),
  ];
  const sibling = [chunk(SIBLING, "src/api/x.ts", "banzai-runtime", 3), chunk(SIBLING, "prompts/p.md", "banzai", 5)];
  const input = [...banza, ...sibling];
  const kept = input.filter((c) => c.repo !== SIBLING);
  assert.equal(kept.length, 3, "3 banza chunks kept");
  assert.equal(kept.filter((c) => c.repo === SIBLING).length, 0, "no sibling chunks remain");
  assert.deepEqual(kept, banza, "kept banza chunks are byte-identical and in original order");
});

test("micro-closure: excludes historical reports + sanitizes conformance (Option A + B)", () => {
  const other = chunk("banza-protocol/banza", "a.md", "normative", 1);
  const conf = chunk("banza-protocol/banza", CONFORMANCE, "infra", 2,
    `# BANZA — Conformance Suite ${CONF_OLD} rest`);
  const hist7x = chunk("banza-protocol/banza", EXCLUDED_HISTORICAL[0], "report", 3,
    "…component in banza-protocol/banzai (no website)…");
  const hist7y = chunk("banza-protocol/banza", EXCLUDED_HISTORICAL[1], "report", 4,
    "…read-only: banza-protocol/banzai…");
  const input = [other, conf, hist7x, hist7y];

  // Option A — historical reports removed from active retrieval.
  const kept = input.filter((c) => c.repo !== SIBLING && !EXCLUDED_HISTORICAL.includes(c.path));
  assert.equal(kept.length, 2, "historical reports excluded (other + conformance remain)");
  assert.ok(!kept.some((c) => EXCLUDED_HISTORICAL.includes(c.path)), "no historical-report chunk remains");

  // Option B — conformance sanitized: dead link gone, hash recomputed, whole-token/URL absent.
  for (const c of kept) if (c.path === CONFORMANCE && c.content.includes(CONF_OLD)) {
    c.content = c.content.split(CONF_OLD).join(CONF_NEW); c.content_hash = fnv1a(c.content);
  }
  const c = kept.find((x) => x.path === CONFORMANCE);
  assert.ok(!c.content.includes(OLD_REPO_URL), "conformance chunk no longer carries the dead URL");
  assert.ok(!OLD_REPO_TOKEN.test(c.content), "conformance chunk no longer carries the old-repo token");
  assert.equal(c.content_hash, fnv1a(c.content), "content_hash recomputed for the sanitized chunk");
  assert.equal(other.content_hash, fnv1a(other.content), "unrelated chunk untouched");
});

test("indexHashOf is deterministic + order-independent of input (sorts internally)", () => {
  const a = [chunk("banza-protocol/banza", "a", "x", 1), chunk("banza-protocol/banza", "b", "y", 2)];
  const b = [a[1], a[0]];
  assert.equal(indexHashOf(a).hash, indexHashOf(b).hash, "hash independent of input order");
  assert.match(indexHashOf(a).hash, /^[0-9a-f]{16}$/, "16-hex fnv1a");
});

test("fnv1a matches the Rust indexer seed/prime (known vector)", () => {
  assert.equal(fnv1a(""), "cbf29ce484222325");
});

test("whole-token matcher: repo ref matches; banzai-local / banzai-api do NOT", () => {
  assert.ok(OLD_REPO_TOKEN.test("see banza-protocol/banzai here"), "bare repo ref matches");
  assert.ok(OLD_REPO_TOKEN.test(`https://github.com/${SIBLING})`), "URL repo ref matches");
  assert.ok(!OLD_REPO_TOKEN.test("/srv/banza-protocol/banzai-local/"), "filesystem banzai-local NOT a ref");
  assert.ok(!OLD_REPO_TOKEN.test("ghcr.io/banza-protocol/banzai-api"), "container banzai-api NOT a ref");
});

test("the committed repo-index is fully clean & the migration is idempotent on it", () => {
  const idx = rd("banzai-repo-index");
  const man = rd("banzai-repo-index-manifest");
  assert.equal(idx.filter((c) => c.repo === SIBLING).length, 0, "zero sibling chunks");
  assert.equal(idx.filter((c) => EXCLUDED_HISTORICAL.includes(c.path)).length, 0, "zero historical-report chunks");
  assert.equal(idx.filter((c) => typeof c.content === "string" && c.content.includes(OLD_REPO_URL)).length, 0,
    "zero full-URL old-repo links in the active repo-index");
  assert.equal(idx.filter((c) => typeof c.content === "string" && OLD_REPO_TOKEN.test(c.content)).length, 0,
    "zero whole-token old-repo references in the active repo-index");
  assert.equal(man.banzai_in_monorepo, true, "manifest declares banzai_in_monorepo");
  assert.equal(man.banzai_repo_indexed, undefined, "manifest declares no separate indexed repo");
  assert.equal(man.index_hash, indexHashOf(idx).hash, "manifest index_hash matches a recompute");
  // exclusions record the two historical reports
  const excl = rd("banzai-repo-index-exclusions");
  for (const p of EXCLUDED_HISTORICAL)
    assert.ok(excl.some((e) => e.path === p), `exclusion recorded for ${p}`);
});
