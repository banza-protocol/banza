// M2.18B.7 DFN-8 — conversational context E2E (deterministic engine layer).
//
// Drives the COMPILED engine over three multi-turn sequences and asserts the SAFETY-critical context
// invariants: the CURRENT turn's task always governs (never a prior turn's), context is marked used ONLY
// when it is materially attached ("com contexto" honesty), an EXPLICIT subject/document in the current turn
// overrides prior context, and — the blocker — prior turns NEVER contaminate a later turn with the wrong
// subject or sources. A bare follow-up that the router answers standalone (no attachment) is SAFE (it
// declines rather than inventing) and is allowed; the forbidden state is contamination, not under-inheritance.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const kb = require("./src/rustkb/banzai_api_kb.js");

const routeCtx = (q, prior) =>
  prior.length ? JSON.parse(kb.route_with_context_json(q, JSON.stringify(prior))) : JSON.parse(kb.route_question_json(q));
const cuf = (raw, resolved, has) => JSON.parse(kb.context_used_for_json(raw, resolved, has));
const taskOf = (q, s = "") => JSON.parse(kb.answer_obligations_json(q, s)).requested_task;
const tasked = (q, s = "") => JSON.parse(kb.tasked_answer_json(q, s));

// run a sequence, returning a per-turn trace of the engine's context decisions.
function runSequence(turns) {
  const prior = [];
  const trace = [];
  for (const q of turns) {
    const r = routeCtx(q, prior);
    const resolved = r.resolved_query || q;
    const c = cuf(q, resolved, prior.length > 0);
    const taskQuestion = c.task_question || q;
    trace.push({
      q,
      contextUsed: r.context_used === true,
      resolved,
      intent: r.intent,
      contextUsedFor: c.context_used_for,
      taskQuestion,
      task: taskOf(taskQuestion),
      terminal: tasked(taskQuestion).matched === true,
    });
    prior.push(q);
  }
  return trace;
}

const SEQ_A = ["Explica a federação.", "Dá-me um exemplo.", "Agora mostra os requisitos.", "Qual é o impacto para operadores?"];
const SEQ_B = ["Abre a ADR-001.", "Resume.", "Explica a motivação.", "Mostra as consequências.", "Compara com a ADR-012."];
const SEQ_C = ["Explica o key manifest.", "Mostra a estrutura.", "Como é validado?", "E o que acontece quando expira?"];

const EXPECTED_TASK = {
  "Explica a federação.": "explanation",
  "Dá-me um exemplo.": "example",
  "Agora mostra os requisitos.": "requirements",
  "Qual é o impacto para operadores?": "impact",
  "Abre a ADR-001.": "document_lookup",
  "Explica a motivação.": "explanation",
  "Mostra as consequências.": "impact",
  "Compara com a ADR-012.": "comparison",
  "Explica o key manifest.": "explanation",
  "E o que acontece quando expira?": "consequences",
};

for (const [name, turns] of [["A", SEQ_A], ["B", SEQ_B], ["C", SEQ_C]]) {
  test(`DFN-8 context E2E sequence ${name}: current turn governs, context-used honest, no contamination`, () => {
    const trace = runSequence(turns);

    // 1. the CURRENT turn's task always governs (never a prior turn's task).
    for (const t of trace) {
      if (EXPECTED_TASK[t.q]) assert.equal(t.task, EXPECTED_TASK[t.q], `${name}: "${t.q}" task governed by current turn`);
    }

    // 2. context-used honesty: contextUsedFor is "none" exactly when the router did NOT attach context.
    for (const t of trace) {
      if (t.contextUsed) assert.notEqual(t.contextUsedFor, "none", `${name}: "${t.q}" marks context used → cuf must not be none`);
      else assert.equal(t.contextUsedFor, "none", `${name}: "${t.q}" no context attached → cuf must be none ("com contexto" only when material)`);
    }

    // 3. the first turn never uses context (no prior turns).
    assert.equal(trace[0].contextUsed, false, `${name}: first turn has no context`);

    // 4. NO CONTAMINATION: a turn that did not attach context must NOT resolve to a prior turn's text — its
    //    resolved query is its own question, so a later answer can never be built from a prior subject.
    for (let i = 1; i < trace.length; i++) {
      if (!trace[i].contextUsed) assert.equal(trace[i].resolved, trace[i].q, `${name}: standalone turn "${trace[i].q}" must not carry prior context`);
    }
  });
}

// EXPLICIT subject/document overrides prior context (blocker check for contamination in the other direction).
test("DFN-8 explicit subject/document in the current turn overrides prior context", () => {
  // after talking about federation, an explicit ADR reference must resolve to THAT document, not federation.
  const prior = ["Explica a federação.", "Dá-me um exemplo."];
  const r = routeCtx("Abre a ADR-012.", prior);
  assert.ok(/ADR-012/i.test(r.resolved_query || "Abre a ADR-012."), "explicit ADR-012 preserved over prior federation context");
  assert.equal(taskOf("Abre a ADR-012.", "ADR-012"), "document_lookup", "explicit document → lookup");

  // an explicit different subject overrides too.
  assert.equal(taskOf("o que é a conformidade", ""), "definition", "explicit new subject governs its own task");
});

// a bare follow-up must NEVER produce a deterministic deliverable terminal for a WRONG/absent subject.
test("DFN-8 bare follow-ups never produce a contaminated deliverable terminal", () => {
  for (const q of ["Dá-me um exemplo.", "Mostra a estrutura.", "Resume.", "E os requisitos?"]) {
    const t = tasked(q); // no seed, no subject in the phrase
    assert.equal(t.matched, false, `bare follow-up "${q}" must not deterministically fulfil (no subject in the turn itself)`);
  }
});
