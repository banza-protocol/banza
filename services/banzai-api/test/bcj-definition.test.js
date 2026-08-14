// BCJ/1 must be explainable, and explaining must stay separable from deciding.
//
// Production QA found "O que é o BCJ/1?" refused as an out-of-scope OPERATION: the canonical byte form
// of the protocol, unanswerable by the protocol's own interface. It matters more than a typical gap —
// BCJ/1 is the first gate an external implementation must pass, so a broken support surface there sends
// an independent team into step one with nothing to read.
//
// These tests run the SAME resolution the live /banzai/ask path uses, and they pin both directions: a
// definitional question grounds, an operational request does not. Fixing the first by weakening the
// second would be worse than the original defect.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

// Routing is not the answer path — a rewrite layer sits above it. Drive the pipeline, model stubbed.
const MODEL = "MODEL-COMPOSED-THIS";
function pipe() {
  const provider = createProvider(
    { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
    { fetchImpl: async () => { throw new Error("no model in tests"); } },
  );
  return createPipeline({
    provider, env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}),
    runGroundedSynthesisFn: async () => ({
      status: "grounded", answer_markdown: MODEL, cited_source_ids: [], package: { facts: [] },
      primary_intent: "explain_concept", clarification_candidates: [], trace: {},
    }),
  });
}

const intent = (q) => JSON.parse(kb.resolve_query_json(q)).primary_intent;

const DEFINITIONAL = [
  "O que é o BCJ/1?",
  "What is BCJ/1?",
  "Explain BCJ/1",
  "What does BCJ/1 canonicalize?",
  "Why does BANZA use BCJ/1?",
  "o que e canonical json",
  "explica a canonicalizacao do BANZA",
];

const OPERATIONAL = [
  "certifica este artefacto",
  "assina isto por mim",
  "aprova esta implementacao",
];

test("a definitional question about BCJ/1 is grounded, in PT and EN", () => {
  for (const q of DEFINITIONAL) {
    assert.notEqual(intent(q), "unsupported", `refused as out of scope: ${q}`);
  }
});

test("an operational request is still not grounded by the glossary", () => {
  for (const q of OPERATIONAL) {
    assert.notEqual(
      intent(q),
      "explain_concept",
      `an operation must not be answered as a concept: ${q}`,
    );
  }
});

test("the definition carries the semantics an implementer needs", async () => {
  // The routing above only proves the question is answerable. This proves the ANSWER is the one an
  // implementer needs: the four properties that make two implementations agree on bytes.
  const mod = await import("../src/knowledge.js");
  const entries = mod.ENTRIES ?? [];
  const list = Array.isArray(entries) ? entries : Object.values(entries).flat();
  const def = list.find((e) => e && e.id === "def-bcj");
  assert.ok(def, "def-bcj must exist in the knowledge base");
  const a = def.answer;
  assert.match(a, /BANZA Canonical JSON/i, "must name what BCJ/1 stands for");
  assert.match(a, /8785/, "must name the profile it restricts");
  assert.match(a, /2\^53|2\^53−1|9007199254740991/, "must state the integer domain");
  assert.match(a, /duplicad|duplicate/i, "must state that duplicate members are rejected");
  assert.match(a, /normaliza(ç|c)(ã|a)o Unicode|Unicode normali/i, "must state the Unicode boundary");
});

test("the pipeline serves the BCJ/1 definition itself, not a composition", async () => {
  for (const q of ["O que é o BCJ/1?", "What is BCJ/1?"]) {
    const { result, meta } = await pipe().answer(q);
    assert.equal(meta.llm_called, false, `${q}: a definition must cost 0 model calls`);
    assert.doesNotMatch(result.answer, new RegExp(MODEL), `${q}: composed by the model`);
    assert.match(result.answer, /8785/, `${q}: must state the profile it restricts`);
  }
});
