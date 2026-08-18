// "This answer was produced by a model" and "a model was called just now" are different facts.
//
// An earlier audit read a cached answer reporting model provenance, saw no model call on that request, and
// filed it as a provenance mismatch. It is not one: the stored answer WAS model-produced, and serving it
// from cache correctly involves no new inference. The hypothesis was falsified then and is re-verified here
// after the Block 5A/5B contract changes, because a falsified hypothesis is only worth as much as its last
// re-test.
//
// The cache key is also checked against the implementation rather than against memory of it. Every field
// the pipeline binds is a field two otherwise-identical questions can differ on, and a binding that
// silently disappears would let one answer be served for a request it was never validated for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cacheKey } from "../src/cache.js";
import { normalizeBanzaiAnswer } from "../src/answerContract.js";
import { harness } from "./_pipeline-harness.mjs";

// ── §8 The key binds what it claims to bind ──────────────────────────────────────────────────────

test("every distinguishing dimension is bound into the cache key", () => {
  // Read from pipeline.js rather than restated here: a list maintained in a test is a second thing to
  // drift. If a field is dropped from the builder, this names the one that went missing.
  const pipeline = readFileSync(new URL("../src/pipeline.js", import.meta.url), "utf8");
  const decl = pipeline.match(/const keyFields = \{([^}]*)\}/);
  assert.ok(decl, "the cache-key field set must be a single readable declaration");
  const bound = decl[1];
  for (const field of [
    "question",            // the normalized question
    "provider",            // which engine answered
    "lang",
    "mode",
    "sourcesHash",         // corpus state
    "repoIndexHash",       // repository index state
    "safetyVersion",
    "contractVersion",
    "postValidationPolicy",
    "synthesisContract",
    "convRef",             // conversation reference / context identity
  ]) {
    assert.match(bound, new RegExp(`\\b${field}\\b`), `${field} must be bound into the cache key`);
  }
});

test("the key changes when a bound dimension changes", () => {
  // Non-vacuity for the list above. Same question, one dimension different, must not collide — otherwise
  // a cached answer could be served across a boundary it was never validated for.
  const base = {
    question: "o que e o banza",
    provider: "local_qwen",
    lang: "pt",
    mode: "fast",
    sourcesHash: "corpus-1",
    repoIndexHash: "idx-1",
    safetyVersion: "s1",
    contractVersion: "c1",
    postValidationPolicy: "p1",
    synthesisContract: "y1",
    convRef: null,
  };
  const baseline = cacheKey(base);
  for (const field of Object.keys(base)) {
    const changed = cacheKey({ ...base, [field]: `${base[field]}-changed` });
    assert.notEqual(changed, baseline, `changing ${field} must not reuse the cached answer`);
  }
  // ...and insertion order must not matter, or the same request could miss its own cache entry.
  const reordered = Object.fromEntries(Object.entries(base).reverse());
  assert.equal(cacheKey(reordered), baseline, "field order is irrelevant to identity");
});

// ── §7 Fresh vs cached, on one pipeline ──────────────────────────────────────────────────────────

test("a repeat request reuses the answer without calling the model again", async () => {
  // One harness, so the second request sees the first one's cache. The property under test is the pair of
  // observations, not either alone: same answer, and no second inference.
  const h = harness({});
  const q = "Como funciona a federação entre operadores?";

  const first = await h.pipeline.answer(q, {});
  const second = await h.pipeline.answer(q, {});

  assert.equal(
    (first.result || {}).answer,
    (second.result || {}).answer,
    "a cache hit must return the same answer, not a re-derivation",
  );
  assert.equal((first.result || {}).entry_id, (second.result || {}).entry_id);
  assert.equal(first.meta.terminal_kind, second.meta.terminal_kind);
  assert.equal(
    second.meta.llm_called,
    false,
    "the repeat must not call the model — that is what the cache is for",
  );
});

test("model provenance and a live model call are reported as separate facts", async () => {
  // The distinction the falsified hypothesis turned on. `llm_called` describes THIS request. Whatever the
  // stored answer records about its own origin is a different statement, and the two disagreeing is
  // correct behaviour rather than a bug.
  const h = harness({});
  const q = "Como funciona a federação entre operadores?";
  const first = await h.pipeline.answer(q, {});
  const second = await h.pipeline.answer(q, {});

  assert.equal(typeof first.meta.llm_called, "boolean");
  assert.equal(second.meta.llm_called, false);
  // A settled fact never calls a model on either request, so the pair is only meaningful for answers that
  // can involve one. This asserts the shape of the claim, not a particular provider being reachable here.
  assert.ok(
    "llm_called" in second.meta,
    "the per-request fact must always be present, so it can never be inferred from provenance",
  );
});

// ── §10 A cached answer from before the class existed ────────────────────────────────────────────

test("a legacy cached source with no class is honest, never Reference", () => {
  // The exact shape a pre-Block-5B cached answer carries: identity, title, path, and nothing else. It must
  // survive normalization unchanged rather than acquiring a class it never had — the frontend then labels
  // it FONTE/SOURCE, which is asserted in the website suite.
  const legacy = [
    { id: "ADR-002", title: "Protocol, implementation and operator separation", path: "decisions/adr/ADR-002-x.md" },
    { id: "SPEC-OVERVIEW", title: "BANZA protocol overview", path: "spec/overview.md" },
  ];
  const out = normalizeBanzaiAnswer("**BANZA** é um protocolo aberto.", legacy);
  assert.equal(out.sources.length, 2, "legacy sources still render");
  for (const s of out.sources) {
    assert.ok(!("kind" in s) || !s.kind, `${s.id}: a legacy source must not gain a class it never had`);
    assert.notEqual(s.kind, "reference", `${s.id}: and above all not the canonical Reference's label`);
  }
});

test("a fresh answer carries the real class, so the fallback is not the only path", async () => {
  // Positive control for the test above: without it, "no class" would pass against a build where the class
  // was never populated at all.
  const h = harness({});
  const r = await h.pipeline.answer("O que é uma implementação?", {});
  const kinds = ((r.result || {}).sources || []).map((s) => s.kind);
  assert.ok(kinds.includes("adr"), `fresh answers carry real classes, got ${JSON.stringify(kinds)}`);
  assert.ok(kinds.includes("spec"));
});
