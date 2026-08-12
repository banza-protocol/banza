// Regression tests for the M2.19G.5C adversarial-review findings on cache key discipline (ADR-073).
// (1) cacheKey binds the post-validation policy + contract version + document/entity identity, so a
//     policy/contract bump evicts stale-policy answers and two distinct (entity, document) requests
//     never collide. (2) SemanticCache.find never returns a different entity's validated answer, even
//     for a >=threshold lexical paraphrase (cross-entity contamination).

import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheKey, SemanticCache } from "../src/cache.js";

const base = {
  question: "o que e a conformidade no protocolo banza",
  provider: "mock",
  lang: "pt",
  mode: "fast",
  sourcesHash: "corpus-1",
  repoIndexHash: "idx-1",
  safetyVersion: "safety-1",
  contractVersion: "contract-1",
  postValidationPolicy: "pv-1",
};

test("cacheKey binds the post-validation policy version (ADR-073 eviction)", () => {
  const a = cacheKey(base);
  const b = cacheKey({ ...base, postValidationPolicy: "pv-2" });
  assert.notEqual(a, b, "a policy bump must change the cache key so stale-policy answers are evicted");
});

test("cacheKey binds the contract version", () => {
  assert.notEqual(cacheKey(base), cacheKey({ ...base, contractVersion: "contract-2" }));
});

test("cacheKey binds document + entity identity", () => {
  const a = cacheKey({ ...base, document_id: "ADR-055", entity_id: "ADR-055" });
  const b = cacheKey({ ...base, document_id: "ADR-068", entity_id: "ADR-068" });
  assert.notEqual(a, b, "distinct (entity, document) requests must not share an exact-cache key");
});

test("cacheKey is insertion-order independent", () => {
  const a = cacheKey({ question: "q", provider: "mock", lang: "pt", mode: "fast", sourcesHash: "s" });
  const b = cacheKey({ sourcesHash: "s", mode: "fast", lang: "pt", provider: "mock", question: "q" });
  assert.equal(a, b);
});

test("SemanticCache never returns a different entity's answer (cross-entity contamination)", () => {
  const sc = new SemanticCache({ threshold: 0.5 });
  // Two near-identical-vocabulary questions about DIFFERENT entities.
  const qA = { ...base, question: "explica o estado e o impacto da adr 055 para operadores", entity_id: "ADR-055", document_id: "ADR-055" };
  const qB = { ...base, question: "explica o estado e o impacto da adr 068 para operadores", entity_id: "ADR-068", document_id: "ADR-068" };
  sc.add(qA, { answer: "ADR-055 answer", entity: "ADR-055" });
  // A query about entity ADR-068 must NOT return the ADR-055 entry even at high lexical similarity.
  const hit = sc.find(qB);
  assert.equal(hit, null, "a different entity_id must never match a stored entry");
  // The SAME entity paraphrase still hits.
  const same = sc.find({ ...qA, question: "explica o estado e impacto da adr 055 para os operadores" });
  assert.ok(same && same.value.entity === "ADR-055", "same-entity paraphrase still hits");
});

test("SemanticCache candidate is invalidated by a policy bump", () => {
  const sc = new SemanticCache({ threshold: 0.5 });
  sc.add(base, { answer: "x" });
  assert.equal(sc.find({ ...base, postValidationPolicy: "pv-2" }), null, "a policy bump invalidates the semantic candidate");
});
