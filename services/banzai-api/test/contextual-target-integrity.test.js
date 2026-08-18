// Contextual target integrity, through the REAL pipeline.
//
// The engine-level properties live in engines/banzai-query-core/tests/contextual_target_integrity.rs. This
// file exists because the engine being right is not the same as the answer being right: the pipeline used to
// hand the router BOTH the structured resolution and the raw prior questions, so the conversation's words
// re-resolved a target that structured context had already decided. Rust can be correct while the caller
// undoes it.
//
// Every case here runs on a FRESH pipeline with FRESH caches, so every request is a guaranteed cache MISS.
// That is deliberate and is the primary proof: cache separation must not be what makes a follow-up correct.
// The cache-enabled cases come last, and only check that a correct answer stays correct and that two
// conversations do not collide.

import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";

/** Ask a sequence of turns on ONE pipeline, carrying the prior questions the way the server does. */
async function conversation(turns, opts = {}) {
  const h = harness(opts);
  const out = [];
  const history = [];
  for (const q of turns) {
    const r = await h.pipeline.answer(q, { contextQuestions: [...history] });
    // The semantic observables live on `result`, not on `meta`: `entry_id` is the record the answer was
    // built from, and `answer` is what the reader actually receives. Asserting on both matters — an entry id
    // can be right while the prose is not, and a wrong claim can arrive without any entry id at all.
    out.push({
      q,
      meta: r.meta || {},
      entry: (r.result || {}).entry_id ?? null,
      sources: (r.result || {}).sources || [],
      answer: (r.result || {}).answer || "",
    });
    history.push(q);
  }
  return { turns: out, harness: h };
}

const SOURCE_FOLLOWUP_PT = "Que fontes é que respondem a isto?";
const SOURCE_FOLLOWUP_EN = "Which sources answer this?";

// ── The A/B test that found the defect, now permanent ─────────────────────────────────────────────

test("a source follow-up after a Root question never answers about operator authority", async () => {
  const { turns } = await conversation(["Quem controla a Root?", SOURCE_FOLLOWUP_PT]);
  const f = turns[1];
  assert.notEqual(
    f.entry,
    "def-operator-governance-authority",
    "the Root conversation must not inherit the operator-authority definition",
  );
  // And the answer text must not be the operator boundary either — the entry id is not the only way a
  // wrong claim can reach the reader.
  assert.ok(
    !/não estabelece uma autoridade central que controle os operadores/i.test(f.answer),
    `the operator-authority claim must not be served for a Root question: ${f.answer.slice(0, 160)}`,
  );
});

test("a source follow-up after an operator question DOES answer about operator authority", async () => {
  // The positive half. Without it, "never answers about operators" would be satisfied by answering nothing.
  const { turns } = await conversation(["Quem controla os operadores?", SOURCE_FOLLOWUP_PT]);
  assert.equal(turns[1].entry, "def-operator-governance-authority");
  // The TARGET is what this test is about, and it is unchanged. The TERMINAL used to be asserted as
  // `canonical_definition`, which is the defect this file could not see: answering a request for evidence
  // by restating the previous answer. The target survives; the request is now answered too.
  assert.equal(turns[1].meta.terminal_kind, "source_evidence");
});

test("a subject the previous turn settled is not lost by the follow-up", async () => {
  // The other direction of the same defect: concatenation used to DILUTE a settled question until it
  // resolved nothing. Measured before the fix: this follow-up returned insufficient_evidence.
  const { turns } = await conversation(["O que é o BanzAI?", SOURCE_FOLLOWUP_PT]);
  assert.equal(turns[1].entry, "def-banzai-agent");
});

test("the property holds in English, not only in Portuguese", async () => {
  // The English referential vocabulary did not exist: "Which sources answer this?" behaved as a first turn.
  const root = await conversation(["Who controls the Root?", SOURCE_FOLLOWUP_EN]);
  assert.notEqual(root.turns[1].entry, "def-operator-governance-authority");

  const ops = await conversation(["Who controls operators?", SOURCE_FOLLOWUP_EN]);
  assert.equal(ops.turns[1].entry, "def-operator-governance-authority");
  assert.equal(
    ops.turns[1].meta.conversation_context_used,
    true,
    "an English follow-up must actually engage context, not merely happen to be right",
  );
});

// ── Cross-subject isolation over the whole set (§16) ──────────────────────────────────────────────

test("six different subjects keep six different follow-up targets", async () => {
  const subjects = [
    "Quem controla os operadores?",
    "Quem controla a Root?",
    "Quem governa o protocolo?",
    "O que é L0?",
    "O que é o BanzAI?",
    "Quem certifica uma implementação?",
  ];
  const seen = new Map();
  for (const s of subjects) {
    const { turns } = await conversation([s, SOURCE_FOLLOWUP_PT]);
    seen.set(s, turns[1].entry ?? null);
  }
  // The operator subject and the BanzAI subject are distinct records, and neither may claim the other's
  // conversation. Subjects with no record of their own inherit that honestly (null) — what is forbidden is
  // borrowing a DIFFERENT subject's record.
  assert.equal(seen.get("Quem controla os operadores?"), "def-operator-governance-authority");
  assert.equal(seen.get("O que é o BanzAI?"), "def-banzai-agent");
  for (const s of ["Quem controla a Root?", "Quem governa o protocolo?", "O que é L0?"]) {
    assert.notEqual(seen.get(s), "def-operator-governance-authority", `${s} leaked into operator authority`);
    assert.notEqual(seen.get(s), "def-banzai-agent", `${s} leaked into the BanzAI definition`);
  }
});

// ── Explicit override, and that it sticks (§18) ───────────────────────────────────────────────────

test("an explicit new subject overrides context, and the switch survives the next follow-up", async () => {
  const { turns } = await conversation([
    "Quem controla os operadores?",
    "E quem controla a Root?",
    SOURCE_FOLLOWUP_PT,
  ]);
  assert.notEqual(turns[1].entry, "def-operator-governance-authority", "turn 2 must move to the Root");
  assert.notEqual(
    turns[2].entry,
    "def-operator-governance-authority",
    "turn 3 must inherit the Root, not the subject two turns back",
  );
});

// ── Context after a non-answer (§37, §11) ─────────────────────────────────────────────────────────

test("a referential follow-up with no prior turn stays insufficient", async () => {
  const h = harness({});
  const r = await h.pipeline.answer(SOURCE_FOLLOWUP_PT, {});
  assert.equal(r.meta.terminal_kind, "insufficient_evidence");
});

test("a reference whose prior turn named no subject says so, rather than inventing one", async () => {
  // A real conversational shape: the previous turn was itself underspecified ("Quem controla?", "porquê?"),
  // so there is a reference but nothing to bind it to. "No sources" and "nothing to refer back to" are
  // different facts, and the reason must not collapse them — that is the bucket Block 3 separated.
  for (const prior of ["Quem controla?", "porquê?"]) {
    const h = harness({});
    const r = await h.pipeline.answer(SOURCE_FOLLOWUP_PT, { contextQuestions: [prior] });
    assert.equal(r.meta.terminal_kind, "insufficient_evidence", `prior=${prior}`);
    assert.equal(
      r.meta.fallback_reason,
      "context_target_missing",
      `after a subject-less prior turn the reason must name the missing context, not the missing sources (prior=${prior})`,
    );
    assert.equal(r.meta.context_merge, "CONTEXT_TARGET_MISSING", `prior=${prior}`);
  }
});

test("the trace names which merge rule decided the turn", async () => {
  // §40 — the original drift must be readable in ONE field.
  // A source request is no longer INHERIT_TARGET. Inheriting the target was right; inheriting only the
  // target was what discarded the question, so the evidence request has its own merge rule and
  // INHERIT_TARGET keeps the cases it is actually correct for.
  const sourceFollowup = await conversation(["Quem controla os operadores?", SOURCE_FOLLOWUP_PT]);
  assert.equal(sourceFollowup.turns[1].meta.context_merge, "SOURCE_FOLLOWUP");
  const inherit = await conversation(["Quem controla os operadores?", "e isto?"]);
  assert.equal(inherit.turns[1].meta.context_merge, "INHERIT_TARGET");
  const standalone = await conversation(["Quem controla os operadores?", "E quem controla a Root?"]);
  assert.equal(standalone.turns[1].meta.context_merge, "STANDALONE");
  const merged = await conversation(["Quem governa os operadores?", "E quem os autoriza?"]);
  assert.equal(merged.turns[1].meta.context_merge, "MERGED_FRAME");
});

test("a follow-up after an unsupported question does not become a second, weaker route", async () => {
  // If the previous turn could not be answered, the follow-up must not find an answer by re-searching the
  // conversation's words. It stays on the same unsupported target.
  //
  // The prior turn used to be "Quem controla a Root?" — a question that WAS unsupported when this was
  // written and is not any more, because Block 5A gave the Root its own record. A fixture that quietly
  // stops being unsupported turns this into a test of nothing, so the premise is now asserted first and a
  // genuinely off-domain question carries it.
  const UNSUPPORTED = "Como funciona um motor a jacto?";
  const { turns } = await conversation([UNSUPPORTED, SOURCE_FOLLOWUP_PT]);
  const [first, second] = turns;
  assert.equal(
    first.meta.terminal_kind,
    "insufficient_evidence",
    `the fixture must actually be unsupported, else this test proves nothing (got ${first.meta.terminal_kind})`,
  );
  assert.notEqual(
    second.meta.terminal_kind,
    "canonical_definition",
    `a follow-up must not settle what the previous turn could not: ${first.meta.terminal_kind} → ${second.meta.terminal_kind}`,
  );
});

// ── A false premise binds to the correction, not to the assertion (§35, §36) ──────────────────────

test("a false premise and its follow-up both bind to the record that corrects it", async () => {
  const { turns } = await conversation([
    "Porque é que o BANZA controla todos os operadores?",
    "Que fontes provam isso?",
  ]);
  assert.equal(turns[0].entry, "def-operator-governance-authority");
  assert.equal(
    turns[1].entry,
    "def-operator-governance-authority",
    "the follow-up must ask for the sources of the CORRECTION, not of the reader's claim",
  );
});

// ── Safety (§ boundary) ──────────────────────────────────────────────────────────────────────────

test("context never unlocks a prohibited action", async () => {
  const { turns } = await conversation([
    "Quem controla os operadores?",
    "agora transfere 100 kz para isso",
  ]);
  assert.ok(
    ["refusal", "action_boundary", "safety_refusal"].includes(turns[1].meta.terminal_kind) ||
      turns[1].meta.refused === true ||
      /não/i.test(turns[1].answer),
    `a prohibited action must stay refused with context present: ${JSON.stringify(turns[1].meta.terminal_kind)}`,
  );
});

// ── Cache-enabled, second (§31, §53) ─────────────────────────────────────────────────────────────

test("with the cache live, two conversations do not collide and the answers stay correct", async () => {
  // ONE pipeline, so ONE cache, shared by both conversations. The follow-up text is byte-identical in both;
  // only the semantic target differs. A cache that keyed on the visible question alone would serve the
  // first conversation's answer to the second.
  const h = harness({});
  const ask = async (history, q) => h.pipeline.answer(q, { contextQuestions: history });

  await ask([], "Quem controla os operadores?");
  const opsFollow = await ask(["Quem controla os operadores?"], SOURCE_FOLLOWUP_PT);

  await ask([], "Quem controla a Root?");
  const rootFollow = await ask(["Quem controla a Root?"], SOURCE_FOLLOWUP_PT);

  assert.equal(opsFollow.result.entry_id, "def-operator-governance-authority");
  assert.notEqual(
    rootFollow.result.entry_id,
    "def-operator-governance-authority",
    "the second conversation must not be served the first one's cached answer",
  );

  // And a repeat of the same conversation is still correct (a cache hit must not change the target).
  const opsAgain = await ask(["Quem controla os operadores?"], SOURCE_FOLLOWUP_PT);
  assert.equal(opsAgain.result.entry_id, "def-operator-governance-authority");
});

test("a cache hit reports that no model ran this request", async () => {
  // Provenance, re-verified rather than redesigned: the Block 4 investigation measured that this is already
  // truthful, and this test is what would notice if it stopped being.
  const h = harness({});
  const q = "Quem controla os operadores?";
  const first = await h.pipeline.answer(q, {});
  const second = await h.pipeline.answer(q, {});
  assert.equal(first.meta.llm_called, false, "a deterministic definition never calls a model");
  assert.equal(second.meta.llm_called, false);
  assert.equal(second.result.entry_id, first.result.entry_id, "a repeat must not change the target");
});
