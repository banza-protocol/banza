// "A public answer never rests on an internal-only source" is enforced TWICE, and that is why it was
// untested.
//
// Two independent choke points implement it: `publicSourcesOnly` at the evidence layer, where the answer
// object is built, and `normalizeBanzaiAnswer` at the presentation boundary, through which every /ask path
// passes. The end-to-end test asserted the result AFTER both had run, so removing either one changed
// nothing it could observe. Deleting the evidence-layer filter left the suite green.
//
// The redundancy is deliberate — defence in depth for a rule that must not fail — but redundancy is exactly
// what makes a single end-to-end assertion unfalsifiable. Each layer therefore gets its own oracle, and
// each oracle is stated as the property rather than as a rendering:
//
//     support(public + internal) === support(public)      internal material adds nothing
//     support(internal only)     === unsupported          internal material alone establishes nothing
//
// If either layer is removed, exactly one of these files goes red — which is the whole point.

import { test } from "node:test";
import assert from "node:assert/strict";
import { publicSourcesOnly } from "../src/pipeline.js";
import { normalizeBanzaiAnswer, isPublicSource } from "../src/answerContract.js";

const PUBLIC = [
  { id: "ADR-001", path: "decisions/adr/ADR-001-open-financial-protocol.md" },
  { id: "SPEC-OVERVIEW", path: "docs/reference/pt/BANZA_REFERENCIA.md" },
];
const INTERNAL = [
  { id: "CLAUDE.md", path: "CLAUDE.md" },
  { id: "CLAUDE_BASE", path: "docs/governance/CLAUDE_BASE.md" },
  { id: "memory", path: "memory/project_state.md" },
  { id: "env", path: "services/banzai-api/.env" },
];

const ids = (list) => list.map((s) => s.id);

// ── The evidence layer — where the answer object is built ─────────────────────────────────────────

test("evidence layer: internal material adds nothing to what a public answer rests on", () => {
  const withInternal = publicSourcesOnly([...PUBLIC, ...INTERNAL]);
  const withoutInternal = publicSourcesOnly([...PUBLIC]);
  assert.deepEqual(ids(withInternal), ids(withoutInternal), "support(public + internal) must equal support(public)");
  assert.deepEqual(ids(withInternal), ids(PUBLIC), "and must be exactly the public sources");
});

test("evidence layer: internal material alone establishes nothing", () => {
  assert.deepEqual(publicSourcesOnly(INTERNAL), [], "support(internal only) must be unsupported");
});

test("evidence layer: interleaving does not smuggle anything through", () => {
  // Order matters to a filter that tracks state; this one must not.
  const mixed = [INTERNAL[0], PUBLIC[0], INTERNAL[1], PUBLIC[1], INTERNAL[2], INTERNAL[3]];
  assert.deepEqual(ids(publicSourcesOnly(mixed)), ids(PUBLIC));
  assert.deepEqual(publicSourcesOnly(null), []);
  assert.deepEqual(publicSourcesOnly(undefined), []);
});

// ── The presentation boundary — the second, independent implementation ────────────────────────────

test("presentation boundary: internal material adds nothing to what is cited", () => {
  const body = "**BANZA** é um protocolo financeiro aberto.";
  const a = normalizeBanzaiAnswer(body, [...PUBLIC, ...INTERNAL]);
  const b = normalizeBanzaiAnswer(body, [...PUBLIC]);
  assert.deepEqual(ids(a.sources), ids(b.sources), "support(public + internal) must equal support(public)");
  assert.deepEqual(ids(a.sources), ids(PUBLIC));
});

test("presentation boundary: internal material alone cites nothing", () => {
  const out = normalizeBanzaiAnswer("**BANZA** é um protocolo financeiro aberto.", INTERNAL);
  assert.deepEqual(out.sources, [], "support(internal only) must be unsupported");
});

// ── The eligibility rule itself, in the forms that have been tried against it ─────────────────────

test("eligibility survives the path forms an attacker would reach for", () => {
  for (const path of [
    "CLAUDE.md", "claude.md", "CLAUDE.MD", "./CLAUDE.md", "docs\\CLAUDE.md",
    "CLAUDE.md?v=1", "CLAUDE.md#top", "docs/CLAUDE.md/", "docs/governance/CLAUDE_BASE.md",
    "memory/MEMORY.md", ".env", "services/banzai-api/.env",
  ]) {
    assert.equal(isPublicSource({ id: "x", path }), false, `${path} must not be citable`);
  }
  for (const src of PUBLIC) assert.equal(isPublicSource(src), true, `${src.path} must stay citable`);
});
