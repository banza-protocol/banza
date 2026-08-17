// Knowledge that exists but cannot be reached is knowledge the system does not have.
//
// The deployment that shipped R²S² found `def-r2s2` present in the knowledge base and nothing routing
// to it, so "quais são os princípios fundamentais do BANZA?" was answered from an unrelated entry. A
// wrong answer, confidently given, is worse than a refusal — and no test caught it, because the tests
// that existed inspected the index and the term table rather than asking the question.
//
// So these tests ask the question. They drive the SAME pipeline the live /ask endpoint drives, with the
// model stubbed to a marker: if the marker reaches an answer, prose replaced a fact. Each canonical fact
// is asked in Portuguese and in English, in the shapes a reader would actually type.
//
// Three things must hold for every fact below, and each fails differently:
//   • it is REACHED         — the router selects the entry that answers it, not an adjacent one
//   • it is ANSWERED        — the served text actually states the fact, asserted on its substance
//   • it costs NO model call — a canonical fact is looked up, never composed
//
// The last one is not an optimisation. A model asked to restate a bounded guarantee will round the
// bound off, and "resilience never overrides security" is exactly the sentence that must not soften.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

const MODEL = "MODEL-COMPOSED-THIS";

// A fresh pipeline per question: shared caches would let the second phrasing pass on the first one's
// answer, which is the opposite of what these tests are for.
function pipe() {
  const provider = createProvider(
    { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
    { fetchImpl: async () => { throw new Error("no model in tests"); } },
  );
  return createPipeline({
    provider, env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}),
  },
    {},
    { runGroundedSynthesisFn: async () => ({
      status: "grounded", answer_markdown: MODEL, cited_source_ids: [], package: { facts: [] },
      primary_intent: "explain_concept", clarification_candidates: [], trace: {},
    }) },
  );
}

const routed = (q) => JSON.parse(kb.route_question_json(q)).entry_id;

// The canonical facts, the entry that answers each, and what the answer must actually say. Representative
// phrasings only — two per language. A paraphrase corpus would be a maintenance burden pretending to be
// coverage; what these need to prove is that the path exists at all, in both languages.
const FACTS = [
  {
    what: "the four Fundamental Principles",
    entry: "def-r2s2",
    pt: ["quais são os princípios fundamentais do BANZA?", "o que é o R2S2?"],
    en: ["what are the fundamental principles of BANZA?", "what is R2S2?"],
    // Exactly four, named, in canonical order — the drift a guard protects on the public surface must
    // not be reintroduced at answer time.
    says: [/Robusto/, /Resiliente/, /Seguro/, /Simples/, /quatro/i],
  },
  {
    what: "Robust",
    entry: "def-r2s2",
    pt: ["o que significa Robusto no BANZA?"],
    en: ["what does robust mean in BANZA?"],
    says: [/Robusto/, /determin/i],
  },
  {
    what: "Resilient",
    entry: "def-r2s2",
    pt: ["o que significa Resiliente no BANZA?"],
    en: ["what does resilient mean in BANZA?"],
    says: [/Resiliente/, /falha/i],
  },
  {
    what: "Secure",
    entry: "def-r2s2",
    pt: ["o que significa Seguro no BANZA?"],
    en: ["what does secure mean in BANZA?"],
    says: [/Seguro/, /constru/i],
  },
  {
    what: "Simple",
    entry: "def-r2s2",
    pt: ["o que significa Simples no BANZA?"],
    en: ["what does simple mean in BANZA?"],
    says: [/Simples/, /menor mecanismo/i],
  },
  {
    what: "resilience does not override security",
    entry: "def-resilience-boundary",
    pt: ["a resiliência sobrepõe-se à segurança?", "a resiliência está acima da segurança no BANZA?"],
    en: ["does resilience override security?", "is resilience more important than security in BANZA?"],
    says: [/^\*\*Não\.\*\*/, /segurança antes de disponibilidade/i, /falha ou degrada em segurança/i],
  },
  {
    what: "resilience does not mean zero downtime",
    entry: "def-resilience-boundary",
    pt: ["a resiliência do BANZA significa zero downtime?", "resiliência significa ausência de indisponibilidade?"],
    en: ["does resilience mean zero downtime?", "does resilience mean the protocol is always available?"],
    says: [/não significa ausência de indisponibilidade/i, /contida, explícita e recuperável/i],
  },
  {
    what: "BanzAI is optional and non-authoritative",
    entry: null, // two role entries answer this legitimately; assert the substance, not the id
    pt: ["o BanzAI é opcional?", "o BanzAI é autoritativo?"],
    en: ["is BanzAI optional?", "is BanzAI authoritative?"],
    says: [/não/i],
    // Whichever role entry answers, it must deny normative authority or mandatory use.
    saysAny: [/não.{0,40}(fonte normativa|obrigat)/i, /não dependem obrigatoriamente|não.{0,30}gatekeeper/i],
  },
  {
    what: "BANZA execution is federated / local, with no central processor and no global consensus",
    entry: "def-local-execution",
    pt: [
      "a execução do BANZA é federada?",
      "o BANZA precisa de um processador central de transacções?",
      "o BANZA usa consenso global?",
    ],
    en: [
      "is BANZA execution federated?",
      "does BANZA require a central transaction processor?",
      "does BANZA use global consensus?",
    ],
    says: [/^\*\*Não\.\*\*/, /processador central/i, /consenso global/i, /local a cada operador/i],
  },
];

for (const fact of FACTS) {
  const questions = [...fact.pt, ...fact.en];

  test(`reachable through the real pipeline: ${fact.what}`, async () => {
    for (const q of questions) {
      // 1 — REACHED. A knowledge entry with no route is unreachable knowledge; that is the whole defect.
      if (fact.entry) {
        assert.equal(
          routed(q),
          fact.entry,
          `routed to the wrong family — an unrelated entry answering this is a WRONG answer, not a gap: ${q}`,
        );
      }

      const { result, meta } = await pipe().answer(q);
      const answer = String(result.answer || "");

      // 2 — NO MODEL CALL. A canonical fact is looked up. If this fails, the fact is being composed.
      assert.equal(meta.llm_called, false, `${q}: a canonical fact must cost 0 model calls`);
      assert.doesNotMatch(answer, new RegExp(MODEL), `${q}: the model composed this answer`);

      // 3 — ANSWERED. Asserting the substance is what separates "did not refuse" from "answered": an
      // earlier version of a sibling test asserted only the absence of a refusal, and passed for the
      // entire time production was serving the wrong entry.
      for (const re of fact.says || []) {
        assert.match(answer, re, `${q}: the served answer does not state the fact (${re})`);
      }
      if (fact.saysAny) {
        assert.ok(
          fact.saysAny.some((re) => re.test(answer)),
          `${q}: the served answer states none of the required denials`,
        );
      }
    }
  });
}

// The boundary answer must deny, and must not acquire the softer readings that make an unsafe fallback
// sound like resilience. Asserted on the entry itself: the served text is what a reader gets, and the
// failure mode here is an edit that reads well and means something weaker.
test("the resilience boundary denies without leaving a door open", async () => {
  const mod = await import("../src/knowledge.js");
  const list = Array.isArray(mod.ENTRIES) ? mod.ENTRIES : Object.values(mod.ENTRIES ?? {}).flat();
  const def = list.find((e) => e && e.id === "def-resilience-boundary");
  assert.ok(def, "def-resilience-boundary must exist in the knowledge base");
  const a = def.answer;

  assert.match(a, /^\*\*Não\.\*\*/, "must open with the denial, not bury it");
  assert.match(a, /segurança antes de disponibilidade/i, "the ordering must be stated, not implied");

  // Each of these is a real way availability gets bought with safety. The answer must name them as
  // refused, so no reader has to infer which side of the line they fall on.
  for (const [re, what] of [
    [/contornar a confiança/i, "trust bypass"],
    [/não assinado/i, "unsigned artifact"],
    [/estender.{0,30}validade expirada/i, "expiry extension"],
    [/limiar de assinaturas/i, "threshold lowering"],
  ]) {
    assert.match(a, re, `the answer must name ${what} as refused`);
  }

  assert.match(a, /recusar é um resultado correcto/i, "refusing must be stated as a correct outcome");
});

// A guard against the fix becoming a hijack: questions that merely contain "resiliência", "execução" or
// "segurança" must keep their own routing. The predicates require a second, disambiguating signal
// precisely so a word appearing mid-sentence does not capture an unrelated question.
test("the new arms do not capture unrelated questions", () => {
  const unrelated = [
    "como executo a conformance suite?",
    "o que é o BANZA?",
    "o que é uma execução de conformidade?",
    "quais são as garantias de confiança do BANZA?",
    "o que é federar?",
  ];
  for (const q of unrelated) {
    const id = routed(q);
    assert.ok(
      id !== "def-resilience-boundary" && id !== "def-local-execution",
      `hijacked an unrelated question (${id}): ${q}`,
    );
  }
});
