// M2.18 — public-source policy (presentation layer). The single /ask choke point
// `normalizeBanzaiAnswer` must drop every INTERNAL source (CLAUDE.md and other governance/CI/infra/
// report/operator-zero files) from the emitted sources[], whatever retrieval path surfaced it, while
// keeping canonical public sources (ADRs, RFCs, specs, website, license). This locks the fix for the
// M2.18 incident where CLAUDE.md leaked into the answer for "me fala sobre a ADR 002".

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizeBanzaiAnswer, isPublicSource } from "../src/answerContract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const kb = createRequire(import.meta.url)("../src/rustkb/banzai_api_kb.js");

test("isPublicSource — assistant-instruction and secret files are not public", () => {
  // Only files that are not protocol knowledge are excluded — matched by PATH (parity with the Rust
  // authority engines/banzai-query-core/src/source_policy.rs).
  assert.equal(isPublicSource({ id: "CLAUDE.md", path: "CLAUDE.md" }), false);
  assert.equal(
    isPublicSource({ id: "banza:implementation", path: "CLAUDE.md", category: "implementation" }),
    false,
  );
  assert.equal(isPublicSource({ path: "docs/governance/CLAUDE_BASE.md" }), false);
  assert.equal(isPublicSource({ path: "docs/governance/rust-first-legacy-allowlist.json" }), false);
  assert.equal(isPublicSource({ path: "memory/MEMORY.md" }), false);
  assert.equal(isPublicSource({ path: "services/banzai-api/.env.local" }), false);
});

test("isPublicSource — canonical public docs stay public", () => {
  assert.equal(isPublicSource({ id: "ADR-001", path: "decisions/adr/ADR-001-ecosystem-naming-banza-banzai-and-operators.md", category: "decision" }), true);
  assert.equal(isPublicSource({ id: "ADR-INDEX" }), true); // no path but a known public doc id
  assert.equal(isPublicSource({ path: "spec/federation/overview.md", category: "normative" }), true);
  assert.equal(isPublicSource({ path: "website/app/page.tsx", category: "website" }), true);
  assert.equal(isPublicSource({ path: "LICENSE", category: "legal-license" }), true);
  // M2.13B: real engine source stays citable for "how is X implemented".
  assert.equal(isPublicSource({ path: "engines/banzai-query-core/src/route.rs", category: "implementation" }), true);
});

test("isPublicSource — M2.13B-cited categories stay public (no category exclusion)", () => {
  // M2.13B deliberately cites guards/CI, reports, infra and Operador-Zero code — the policy must not
  // regress that; only instruction/secret PATHS are excluded.
  assert.equal(isPublicSource({ path: ".github/workflows/identity-guard.yml", category: "guard-ci" }), true);
  assert.equal(isPublicSource({ path: "tools/check-identity.sh", category: "guard-ci" }), true);
  assert.equal(isPublicSource({ path: "docs/reports/M2_17A.md", category: "report" }), true);
  assert.equal(isPublicSource({ path: "infra/banza-network/docker-compose.yml", category: "infra" }), true);
  assert.equal(isPublicSource({ path: "website/middleware.ts", category: "operator-zero" }), true);
});

test("normalizeBanzaiAnswer — drops CLAUDE.md, keeps the ADR (the incident)", () => {
  const sources = [
    { id: "ADR-001", title: "ADR-001 — Ecosystem Naming Inversion", path: "decisions/adr/ADR-001-ecosystem-naming-banza-banzai-and-operators.md", category: "decision" },
    { id: "ADR-INDEX", title: "Decisões (ADRs e RFCs)", path: "decisions/adr/README.md", category: "decision" },
    { id: "banza:implementation", title: "BANZA — Open Financial Protocol", path: "CLAUDE.md", category: "implementation" },
  ];
  const { sources: out } = normalizeBanzaiAnswer("O ADR-001 define a inversão de nomenclatura do ecossistema.", sources);
  const paths = out.map((s) => s.path);
  assert.ok(!paths.includes("CLAUDE.md"), "CLAUDE.md must be dropped from sources[]");
  assert.ok(paths.includes("decisions/adr/ADR-001-ecosystem-naming-banza-banzai-and-operators.md"), "ADR-001 must be kept");
  assert.equal(out.length, 2);
});

test("normalizeBanzaiAnswer — an all-internal source set yields empty sources[], never an internal citation", () => {
  const sources = [
    { id: "CLAUDE.md", path: "CLAUDE.md" },
    { path: "docs/governance/CLAUDE_BASE.md" },
    { path: "services/banzai-api/.env" },
  ];
  const { sources: out } = normalizeBanzaiAnswer("Resposta.", sources);
  assert.deepEqual(out, []);
});

// M2.18 SEC-FIX (adversarial) — path/case-format variants must not slip past the presentation filter.
test("isPublicSource — CLAUDE.md case/format variants are all internal", () => {
  for (const p of [
    "CLAUDE.MD",
    "claude.md",
    "docs/claude.md",
    "docs\\CLAUDE.md",
    "CLAUDE.md?x=1",
    "CLAUDE.md#frag",
    "docs/CLAUDE.md/",
    "./CLAUDE.md",
    " CLAUDE.md ",
    "Memory/notes.md",
    "services/banzai-api/.ENV",
  ]) {
    assert.equal(isPublicSource({ path: p }), false, `variant ${JSON.stringify(p)} must be internal`);
  }
});

// M2.18 SEC-FIX — the JS mirror must AGREE with the Rust authority (WASM) on every real index path.
test("isPublicSource (JS mirror) ↔ source_is_public (Rust WASM) parity on all real index paths", () => {
  const idx = JSON.parse(
    readFileSync(join(__dirname, "../../../engines/banzai-query-core/src/repoindex/banzai-repo-index.json"), "utf8"),
  );
  const seen = new Set();
  let checked = 0;
  const mism = [];
  for (const e of idx) {
    const path = String(e.path || "");
    const cat = String(e.source_category || "");
    const key = `${path}|${cat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const js = isPublicSource({ path, category: cat });
    const rs = kb.source_is_public(path, cat);
    if (js !== rs) mism.push(`${key}: js=${js} rs=${rs}`);
    checked++;
  }
  assert.ok(checked > 100, `expected to check many paths, got ${checked}`);
  assert.deepEqual(mism, [], `JS/Rust source-policy divergence on real paths:\n${mism.slice(0, 10).join("\n")}`);
  // And CLAUDE.md must be internal in both engines.
  assert.equal(kb.source_is_public("CLAUDE.md", "implementation"), false);
  assert.equal(isPublicSource({ path: "CLAUDE.md", category: "implementation" }), false);
});
