// Conversation state survives the SERVICE BOUNDARY, not just the engine.
//
// Every referent test before this one handed the pipeline a context object directly. All of them
// passed, and production still refused, because the defect was never in the referent engine: the
// pipeline emitted `previous_subject_id`, the server's inbound allowlist did not list it, and it was
// silently dropped on the way back in. Turn three of the profile journey reached the engine with one
// subject where it needed two.
//
// So the property here is not "the resolver works". It is that what the engine EMITS is what the next
// turn RECEIVES, across the same sanitizer production runs. A field that the pipeline populates and the
// server discards is invisible to every unit test and fatal in production.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

// The server's OWN sanitizer, loaded from the shipped source rather than reimplemented here. A second
// copy of the allowlist would drift from the real one and this test would guard a fiction.
const src = readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
const slice = src.slice(
  src.indexOf("const CONVERSATION_CONTEXT_FIELDS"),
  src.indexOf("const LOCAL_INFERENCE_ENABLED"),
);
const { sanitizeConversationContext: sanitize } = await import(
  `data:text/javascript,${encodeURIComponent(slice + "\nexport { sanitizeConversationContext };")}`
);

// One turn, exactly as production runs it: answer → forward context → sanitize → next request body.
async function converse(locale, questions) {
  const c = canaryProvider("MODEL PROSE");
  const h = harness({ provider: c.provider });
  const out = [];
  let wire;
  const history = [];
  for (const q of questions) {
    const r = await h.pipeline.answer(q, {
      locale,
      ...(history.length ? { history: history.slice(-2) } : {}),
      ...(wire ? { conversationContext: wire } : {}),
    });
    const res = r.result || {};
    const meta = r.meta || {};
    const emitted = meta.conversation_context || {};
    const survived = sanitize(emitted);
    out.push({ q, res, meta, emitted, survived });
    history.push({ role: "user", text: q });
    wire = survived;
  }
  return out;
}

const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").length > 0);

test("every field the engine emits survives the server boundary", async () => {
  // THE GENERAL PROPERTY. `previous_subject_id` was the field that happened to be missing; the reason it
  // could go missing is that nothing compared the two lists. Adding the next referent field without
  // adding it to the allowlist must fail here rather than in production three weeks later.
  const journeys = [
    ["pt-PT", ["O que é L2?", "E L3?", "Qual é a diferença entre os dois?"]],
    ["en", ["What is L2?", "And L3?", "What is the difference between them?"]],
    ["pt-PT", ["O que é settlement?", "E o BANZA faz isso centralmente?"]],
    ["pt-PT", ["Qual é o limiar da raiz do BANZA?", "Que fonte diz isso?"]],
  ];
  const dropped = [];
  for (const [locale, qs] of journeys) {
    for (const step of await converse(locale, qs)) {
      for (const [k, v] of Object.entries(step.emitted)) {
        if (nonEmpty(v) && !(k in step.survived)) dropped.push(`${locale} :: "${step.q}" :: ${k}`);
      }
    }
  }
  assert.deepEqual(
    [...new Set(dropped)],
    [],
    "the engine emitted these and the server discarded them:\n  " + [...new Set(dropped)].join("\n  "),
  );
});

test("the profile journey resolves a two-target comparison across the boundary", async () => {
  // The mandatory reference case, run through the transport rather than around it.
  const steps = await converse("pt-PT", ["O que é L2?", "E L3?", "Qual é a diferença entre os dois?"]);
  const [t1, t2, t3] = steps;

  // The state transition, asserted rather than assumed.
  assert.equal(t1.emitted.last_subject_id, "def-profile-l2", "turn 1 must establish L2");
  assert.equal(t2.emitted.last_subject_id, "def-profile-l3", "turn 2 must establish L3 as current");
  assert.equal(t2.emitted.previous_subject_id, "def-profile-l2", "turn 2 must keep L2 as previous");

  // And the plural referent consumes both, from structured identity — never from rendered prose.
  assert.equal(t3.meta.terminal_kind, "comparison", "turn 3 must be a comparison, not a refusal");
  assert.equal(t3.emitted.comparison_left, "def-profile-l2");
  assert.equal(t3.emitted.comparison_right, "def-profile-l3");
  assert.match(t3.res.answer, /L2/, "the answer must name both sides");
  assert.match(t3.res.answer, /L3/, "the answer must name both sides");
});

test("the same plural referent works in English", async () => {
  const steps = await converse("en", ["What is L2?", "And L3?", "What is the difference between them?"]);
  const t3 = steps[2];
  assert.equal(t3.meta.terminal_kind, "comparison", "English must resolve the pair too");
  assert.equal(t3.emitted.comparison_left, "def-profile-l2");
  assert.equal(t3.emitted.comparison_right, "def-profile-l3");
  assert.equal(t3.res.answer_locale, "en");
});
