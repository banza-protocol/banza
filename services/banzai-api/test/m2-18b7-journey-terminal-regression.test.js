// M2.18B.7 (REOPEN) — regression for the public "erro temporário" the user reproduced with a screenshot.
//
// ROOT CAUSE: the deterministic terminals (Tier 1b attribute, 1c tasked example/procedure/template, 1d
// document-lookup) were gated on `!onJourneyStep` — i.e. SKIPPED whenever ANY journey step happened to be
// active. So a concrete task asked while working a journey step ("dá-me um exemplo de federação" on the
// `federacao` step) bypassed its deterministic terminal, fell through to the slow synthesis trunk, and the
// Task-Completion validator degraded it → `synthesis_task_incomplete` → the public "Fallback seguro · erro
// temporário" banner + a task mismatch (an EXAMPLE served as a BANZA DEFINITION).
//
// FIX: the journey owns ONLY a genuine next-step turn (`decisionEffective.action === "journey_next_step"`),
// not every turn. The terminals now gate on `journeyOwnsTurn`, so a task/lookup/attribute question is
// answered by its deterministic terminal EVEN mid-journey — never demoted to synthesis, never degraded.
//
// These tests inject a trunk that ALWAYS degrades (task_incomplete). If any terminal were still skipped the
// question would reach that trunk and the assertions (deterministic, 0 model calls, not degraded) would fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";

function localProvider(env = {}) {
  return createProvider({ LLM_PROVIDER: "local_qwen", ...env }, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) });
}
// A trunk that would DEGRADE every question it receives (task_incomplete). Records each call so a test can
// assert the trunk was NEVER reached for a deterministic-answerable task.
function degradingTrunk() {
  const calls = [];
  const fn = async (rq, opts) => {
    calls.push({ rq, opts });
    return {
      status: "task_incomplete",
      answer_markdown: "A BANZA é um protocolo financeiro aberto e neutro em relação a operadores.",
      cited_source_ids: ["ADR-001"],
      package: { facts: [{ id: "F1", source: { document_id: "ADR-001", title: "ADR-001", path: "decisions/adr/ADR-001-open-protocol.md" } }] },
      primary_intent: "explain_concept",
      clarification_candidates: [],
      trace: { synthesis_called: true, entry_status: "ok", output_status: "task_incomplete", model: "qwen2.5-7b", facts_count: 1 },
    };
  };
  fn.calls = calls;
  return fn;
}
function pipe(env = {}) {
  const stub = degradingTrunk();
  return { pipeline: createPipeline(localProvider(env), env, { runGroundedSynthesisFn: stub }), stub };
}

// The active-journey condition the browser sends: a real step slug + the journey's own next-action sentence
// (both are required for the pipeline to even consider the journey route).
const ACTIVE_JOURNEY = { journeyStep: "federacao", journeyNextActionSentence: "Avança para a avaliação de federação." };

// Every task question a user could ask mid-journey MUST still be served by its deterministic terminal.
const TASK_CASES = [
  { q: "me da um exemplo de federação", kind: "tasked_terminal", desc: "federation example" },
  { q: "me da um exemplo de operador", kind: "tasked_terminal", desc: "operator example" },
  { q: "como federar um operador?", kind: "tasked_terminal", desc: "federation procedure" },
  { q: "me da exemplo de um manifest valido", kind: "tasked_terminal", desc: "manifest template" },
  { q: "ADR 002", kind: "document_lookup", desc: "bare document lookup" },
  { q: "ano de criação do banza", kind: "exact_fact", desc: "attribute exact-fact" },
];

for (const c of TASK_CASES) {
  test(`mid-journey, "${c.q}" (${c.desc}) is served by its deterministic terminal — never degraded`, async () => {
    const { pipeline, stub } = pipe();
    const { result, meta } = await pipeline.answer(c.q, ACTIVE_JOURNEY);
    assert.equal(stub.calls.length, 0, "the synthesis trunk must NOT be reached for a deterministic task");
    assert.equal(meta.llm_called, false, "0 model calls");
    assert.equal(meta.deterministic, true, "deterministic terminal");
    assert.equal(meta.terminal_kind, c.kind, `terminal_kind is ${c.kind}`);
    assert.ok(!meta.fallback_reason, `no fallback_reason (got ${meta.fallback_reason})`);
    assert.ok(result.grounded === true || c.kind === "exact_fact", "grounded (or a declared exact fact)");
  });
}

test('mid-journey, the federation EXAMPLE is an example — never re-labelled as a BANZA definition', async () => {
  const { pipeline } = pipe();
  const { result, meta } = await pipeline.answer("me da um exemplo de federação", ACTIVE_JOURNEY);
  assert.equal(meta.terminal_kind, "tasked_terminal");
  assert.equal(meta.requested_task, "example", "the task is an example, not a definition");
  assert.match(result.answer, /[Ee]xemplo/, "the answer presents an illustrative example");
});

test("a GENUINE next-step question mid-journey is still answered by the journey (Tier 2), not a terminal", async () => {
  const { pipeline, stub } = pipe();
  const { result, meta } = await pipeline.answer("o que faço agora?", ACTIVE_JOURNEY);
  assert.equal(stub.calls.length, 0, "the trunk is not reached");
  assert.equal(meta.terminal_kind, "journey", "the journey owns a genuine next-step turn");
  assert.equal(result.answer, ACTIVE_JOURNEY.journeyNextActionSentence);
});

test("off-journey behaviour is unchanged — the same task questions still hit their terminals", async () => {
  const { pipeline, stub } = pipe();
  const { meta } = await pipeline.answer("me da um exemplo de federação");
  assert.equal(stub.calls.length, 0);
  assert.equal(meta.terminal_kind, "tasked_terminal");
  assert.ok(!meta.fallback_reason);
});
