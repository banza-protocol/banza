// A guarantee is a fact. Claiming one BANZA does not have is worse than refusing to answer.
//
// Production QA asked whether BANZA provides global transparency and was told it does — "o BANZA
// fornece transparência global através de sua natureza como um protocolo financeiro aberto". The
// specification denies exactly that property in its first section. An operator reading the answer
// would plan a verification design around a guarantee that is not there, and would find out when the
// two states it cannot distinguish diverge.
//
// These tests run the SAME resolution the live /banzai/ask path uses. They pin the denial, and they
// pin the distinction the hotfix corrected everywhere else: expiry bounds the age of each artifact,
// never the coherence between them.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

// The router is not the answer path: a layer above it rewrites the question before routing. Drive the
// pipeline, with the model stubbed to a marker — if the marker reaches an answer, prose replaced a fact.
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

// The route is what the live endpoint acts on. An earlier version of this test asserted only that the
// question was not refused — which passed while production kept answering from the generic "what is
// BANZA" entry, i.e. while the bug was still live. Assert the entry that actually answers.
const routed = (q) => JSON.parse(kb.route_question_json(q)).entry_id;
const intent = (q) => JSON.parse(kb.resolve_query_json(q)).primary_intent;

const BOUNDARY = [
  "O BANZA fornece transparência global?",
  "Does BANZA provide global transparency?",
  "O BANZA detecta split-view?",
  "O BANZA garante consistência de conjunto entre artefactos?",
  "does BANZA guarantee set consistency",
  "o banza previne mix-and-match de artefactos?",
  "quais são as garantias de confiança do BANZA?",
];

test("a question about the trust guarantees routes to the guarantee answer", () => {
  for (const q of BOUNDARY) {
    assert.equal(
      routed(q),
      "def-trust-guarantees",
      `answered from the wrong entry — the generic BANZA description claims what this denies: ${q}`,
    );
    assert.notEqual(intent(q), "unsupported", `refused as out of scope: ${q}`);
  }
});

test("the pipeline serves the denial, not a composition", async () => {
  for (const q of BOUNDARY) {
    const { result, meta } = await pipe().answer(q);
    assert.equal(meta.llm_called, false, `${q}: a guarantee must cost 0 model calls`);
    assert.doesNotMatch(result.answer, new RegExp(MODEL), `${q}: composed by the model`);
    assert.match(result.answer, /^\*\*Não\.\*\*/, `${q}: must open with the denial`);
  }
});

test("the answer denies the two guarantees BANZA does not provide", async () => {
  const mod = await import("../src/knowledge.js");
  const entries = mod.ENTRIES ?? [];
  const list = Array.isArray(entries) ? entries : Object.values(entries).flat();
  const def = list.find((e) => e && e.id === "def-trust-guarantees");
  assert.ok(def, "def-trust-guarantees must exist in the knowledge base");
  const a = def.answer;

  assert.match(a, /^\*\*Não\.\*\*/, "must open with the denial, not bury it");
  assert.match(
    a,
    /não fornece — consistência de conjunto/,
    "set consistency must be named as absent",
  );
  assert.match(
    a,
    /não fornece — consistência entre observadores/,
    "cross-observer consistency must be named as absent",
  );

  // The conflation this hotfix corrected: expiry is a bound on freshness, never on set coherence.
  assert.match(
    a,
    /não a coerência entre eles/,
    "expiry must not be presented as bounding set consistency",
  );

  // Denying two guarantees must not quietly deny the two that do exist.
  assert.match(a, /fornece — frescura do artefacto/, "artifact freshness is provided");
  assert.match(a, /fornece — monotonicidade local/, "local monotonicity is provided");
});

test("an operational request is still not answered as a concept", () => {
  for (const q of ["certifica este artefacto", "aprova esta implementacao", "assina isto por mim"]) {
    assert.notEqual(intent(q), "explain_concept", `an operation must not be a concept: ${q}`);
  }
});
