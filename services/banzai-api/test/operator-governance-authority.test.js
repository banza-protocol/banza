// The exact conversation that exposed the bug, kept as a permanent regression.
//
// Turn 1 "quem controla os operadores ?" returned EVIDÊNCIA INSUFICIENTE with 0 sources, while an
// immediate contextual follow-up produced a substantive — and wrong — answer saying public contracts
// "control" operators. The authority verbs resolved to no subject, so the factual package was built
// empty and grounded synthesis declined; the contextual route reached sources another way.
//
// These tests drive the REAL router and the REAL sufficiency decision. The synthesis stub below can only
// replace token generation, never the decision to ground: a stub that grounds unconditionally hides this
// exact bug, which is why the original local reproduction looked healthy while production declined.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as kb from "../src/rustkb/banzai_api_kb.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

function pipe() {
  return createPipeline({
    // No model is reachable. A stable authority boundary must answer anyway (BanzAI's model is optional).
    provider: createProvider(
      { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
      { fetchImpl: async () => { throw new Error("no model in tests"); } },
    ),
    env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}),
  });
}

const PT = "quem controla os operadores ?";
const EN = "Who controls operators?";

test("the authority question routes deterministically to the operator-governance entry", () => {
  for (const q of [
    PT, "Quem controla os operadores?", "quem controla os operadores",
    "quem manda nos operadores?", "quem governa os operadores?",
    "quem admite um operador?", "quem autoriza um operador?",
    EN, "Does BANZA control operators?", "Who admits an operator?", "Who authorizes an operator?",
  ]) {
    const r = JSON.parse(kb.route_question_json(q));
    assert.equal(r.entry_id, "def-operator-governance-authority", `entry for ${q}`);
    assert.equal(r.action, "deterministic", `a settled boundary must not need the model: ${q}`);
  }
});

test("a question that merely mentions authority words is NOT given the canned boundary", () => {
  // The false-positive class: same words, different question. A lexical super-route would answer these
  // with the operator-governance paragraph, which is worse than not answering.
  for (const q of [
    "O que faz o BanzAI quando um operador autoriza um pagamento?",
    "o modelo de participação autoriza operadores?",
  ]) {
    const r = JSON.parse(kb.route_question_json(q));
    assert.notEqual(r.action, "deterministic", `must not get a canned boundary: ${q}`);
  }
});

test("turn 1 is supported, sourced and model-free — not insufficient evidence", async () => {
  const { result, meta } = await pipe().answer(PT, {});
  assert.equal(result.grounded, true, "the direct question must be answerable");
  assert.notEqual(meta.terminal_kind, "insufficient_evidence", "this was the bug");
  assert.ok(result.sources.length >= 3, `expected establishing sources, got ${result.sources.length}`);
  const paths = result.sources.map((s) => s.path);
  // The records that actually establish the separation, not incidental infrastructure matches.
  assert.ok(paths.some((p) => p.includes("ADR-002")), "protocol/implementation/operator separation");
  assert.ok(paths.some((p) => p.includes("ADR-005")), "certification/admission/authorisation");
  assert.equal(meta.llm_called, false, "a settled boundary must not call the model");
});

test("the answer states the separation and refuses the control framings", async () => {
  const { result } = await pipe().answer(PT, {});
  const a = result.answer;
  // Positive architecture: banning bad sentences alone would let "nobody controls anything" pass.
  assert.match(a, /não estabelece uma autoridade central/i);
  assert.match(a, /requisitos que uma implementação tem de satisfazer/i);
  assert.match(a, /avalia uma implementação/i);
  assert.match(a, /esquema operacional aplicável/i);
  assert.match(a, /autoridades competentes/i);
  // And the framings the bug produced.
  assert.doesNotMatch(a, /contratos públicos (que )?controlam/i);
  assert.doesNotMatch(a, /operadores são controlados/i);
  assert.doesNotMatch(a, /o BANZA controla os operadores/i);
});

// MOVED — "the contextual follow-up keeps the same evidence — no epistemic contradiction" now lives in
// source-followup.test.js as "evidence continuity survives the conversation boundary".
//
// It asserted that turn 2 shares establishing evidence with turn 1, using a helper that sends only the
// prior QUESTION. Serving verified evidence now requires the round-tripped prior-evidence context: history
// carries the words of a conversation, not the relationship "these sources supported that answer", so the
// engine declines rather than implying a provenance it cannot check. The property is not weakened — it is
// asserted harder there, on exact source identities through the real client round trip.

test("an unsupported question still fails closed", async () => {
  const { result, meta } = await pipe().answer(
    "Qual foi o valor total liquidado pelo operador Zeta no terceiro trimestre de 2019?", {});
  assert.equal(result.grounded, false, "fail-closed must survive this fix");
  assert.equal(meta.llm_called, false);
});
