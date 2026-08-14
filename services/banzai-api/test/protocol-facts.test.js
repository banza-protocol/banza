// Two protocol facts that must never be composed by a model.
//
// Production QA asked how many authorities control the Trust Root and was told "uma autoridade" — the
// most consequential fact in the protocol, stated wrongly, and wrongly in the direction that makes the
// root look weaker than it is. Asked for the protocol version, it said the canonical documentation
// declares none — which would tell an implementer there is nothing to pin against.
//
// Both are fixed facts with one correct answer, so both are decided by routing into a canonical entry
// rather than assembled from retrieval. These tests pin the route (what the live endpoint acts on) and
// the content, in the phrasings QA actually used.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

const routed = (q) => JSON.parse(kb.route_question_json(q)).entry_id;

// Routing is not the whole answer path. The typo-tolerance layer runs BEFORE the router and rewrites
// the question — it "corrected" the correctly spelled "autoridades" to "autoridade", after which the
// router no longer recognised the question and production served a model composition. Asserting the
// router alone passed throughout. So the pipeline is what these tests drive, with the model stubbed to
// a marker string: if the marker ever appears in an answer, a fact was composed instead of decided.
const MODEL = "MODEL-COMPOSED-THIS";
function pipe() {
  const provider = createProvider(
    { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
    { fetchImpl: async () => { throw new Error("no model in tests"); } },
  );
  return createPipeline({
    provider,
    env: {},
    exactCache: new ExactCache(),
    semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}),
    rateLimiter: new RateLimiter({}),
    runGroundedSynthesisFn: async () => ({
      status: "grounded",
      answer_markdown: MODEL,
      cited_source_ids: [],
      package: { facts: [] },
      primary_intent: "explain_concept",
      clarification_candidates: [],
      trace: {},
    }),
  });
}

const entry = async (id) => {
  const mod = await import("../src/knowledge.js");
  const entries = mod.ENTRIES ?? [];
  const list = Array.isArray(entries) ? entries : Object.values(entries).flat();
  const e = list.find((x) => x && x.id === id);
  assert.ok(e, `${id} must exist in the knowledge base`);
  return e.answer;
};

const ROOT_QUESTIONS = [
  "Quantas autoridades controlam a Trust Root do BANZA?",
  "How many authorities control the BANZA Trust Root?",
  "Qual é o threshold da Trust Root do BANZA?",
  "What is the BANZA root threshold?",
  "qual é o quorum da raiz?",
];

test("root cardinality and threshold route to the canonical answer", () => {
  for (const q of ROOT_QUESTIONS) {
    assert.equal(routed(q), "def-root-authorization", `composed instead of decided: ${q}`);
  }
});

test("the pipeline serves the canonical root answer, not a composition", async () => {
  for (const q of ROOT_QUESTIONS) {
    const { result, meta } = await pipe().answer(q);
    assert.equal(meta.llm_called, false, `${q}: a fixed fact must cost 0 model calls`);
    assert.doesNotMatch(result.answer, new RegExp(MODEL), `${q}: composed by the model`);
    assert.match(result.answer, /três autoridades/, `${q}: must state the cardinality`);
    assert.match(result.answer, /quaisquer duas das três/, `${q}: must state the threshold`);
  }
});

test("the root answer states three authorities, threshold two, counted as distinct", async () => {
  const a = await entry("def-root-authorization");
  assert.match(a, /três autoridades/, "cardinality must be three");
  assert.match(a, /quaisquer duas das três/, "threshold must be any two of the three");
  assert.match(a, /autoridades distintas/, "the threshold counts distinct authorities");
  assert.match(
    a,
    /nenhuma chave de raiz autoriza sozinha/i,
    "no single key authorises alone",
  );
  // Authorization is not hardware — the conflation this milestone removed from the documents must not
  // reappear in the answer.
  assert.match(a, /controlos de custódia/, "custody must be named as separate from authorization");
  assert.doesNotMatch(
    a,
    /porque (existem|há) (dois|três) (HSM|módulos)/i,
    "the threshold is never derived from the number of devices",
  );
  // The root does not exist yet, and an answer that omits this implies a live production root.
  assert.match(a, /Nenhuma cerimónia de produção foi realizada/, "the gate state must be stated");
});

// The protocol version is asserted where it is decided — engines/banzai-query-core/src/attribute.rs,
// which owns declared-attribute facts and answers it before the glossary is consulted. Duplicating the
// assertion here would create a second place to keep in step with the manifest.
