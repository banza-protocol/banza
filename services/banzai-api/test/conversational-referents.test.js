// Follow-ups resolve from STRUCTURED SEMANTIC STATE, not from re-reading the previous answer.
//
// The previous approach was a growing list of pronouns. It could not survive contact with the
// phrasings readers actually use — "Compara-os.", "Que fonte o diz?", "What has higher authority?" —
// because there is always another one, and each addition risked capturing a question that already had
// a route. What travels between turns now is IDENTITY: the semantic ids routing decided, carried in
// the conversation context and consumed by the follow-up.
//
// `last_subject` was already carried and is a human LABEL — "ledger", "federação". Two entries can
// share a label, a label can be truncated, and resolving against one means guessing at something the
// engine already knew exactly. These are the ids.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

/** A conversation threaded the way `server.js` threads it, in a stated locale. */
async function converse(turns, locale) {
  const c = canaryProvider("MODEL PROSE");
  const h = harness({ provider: c.provider });
  const out = [];
  let ctx;
  const prior = [];
  for (const q of turns) {
    const r = await h.pipeline.answer(q, {
      locale,
      contextQuestions: prior.slice(-2),
      conversationContext: ctx,
    });
    const meta = r.meta || {};
    out.push({ q, result: r.result || {}, meta, ctx: meta.conversation_context || {} });
    prior.push(q);
    ctx = meta.conversation_context;
  }
  return out;
}

test("a resolved turn establishes a semantic identity, not just a label", async () => {
  const [a] = await converse(["O que é um ledger?"], "pt-PT");
  assert.equal(a.ctx.last_subject_id, "def-ledger", "the identity travels, not only the label");
  assert.ok(a.ctx.last_subject, "and the human label is still there for a trace");
});

test("a comparison establishes BOTH sides, and a follow-up consumes both", async () => {
  // "Compare them." names neither side. Keeping only the most recent identity makes it unanswerable.
  const turns = await converse(["What is L2?", "And L3?", "Compare them."], "en");
  assert.equal(turns[1].ctx.previous_subject_id, "def-profile-l2", "the earlier subject is retained");
  assert.equal(turns[1].ctx.last_subject_id, "def-profile-l3");
  assert.equal(turns[2].meta.terminal_kind, "comparison", "the follow-up is served as a comparison");
  assert.equal(turns[2].meta.comparison_left, "def-profile-l2");
  assert.equal(turns[2].meta.comparison_right, "def-profile-l3");
  assert.equal(turns[2].meta.referent_source, "conversation", "resolved from state, not from the question");
  const answer = String(turns[2].result.answer || "");
  for (const p of ["L2", "L3"]) assert.ok(answer.includes(p), `${p} missing from the comparison`);
});

test("the Portuguese enclitic form is the same follow-up", async () => {
  // `normalize` strips the hyphen, so "Compara-os." arrives as "compara os". The English twin worked
  // and this did not, for that reason alone.
  const turns = await converse(["O que é L2?", "E L3?", "Compara-os."], "pt-PT");
  assert.equal(turns[2].meta.terminal_kind, "comparison");
  assert.equal(turns[2].meta.comparison_left, "def-profile-l2");
  assert.equal(turns[2].meta.comparison_right, "def-profile-l3");
});

test("a document follow-up asks about the document's standing, not its contents again", async () => {
  const turns = await converse(["What does ADR-025 say?", "Is it normative?"], "en");
  assert.equal(turns[0].ctx.last_document_id, "ADR-025", "the document identity travels");
  assert.equal(turns[1].meta.terminal_kind, "authority_followup");
  assert.equal(turns[1].meta.referent_document, "ADR-025");
  assert.match(
    String(turns[1].result.answer || ""),
    /normative|Normative Manifest/i,
    "the answer states the normative hierarchy",
  );
});

test("a hybrid keeps its relation active for the next turn", async () => {
  const [a] = await converse(["Como é que settlement se relaciona com o BANZA?"], "pt-PT");
  assert.equal(a.ctx.hybrid_subject_id, "def-settlement");
  assert.equal(a.ctx.hybrid_relation, "relates");
});

// ── the protected intents ────────────────────────────────────────────────────────────────────────

test("an evidence request stays an evidence request", async () => {
  // The regression this architecture must not reintroduce: "Que fontes é que respondem a isto?" refers
  // to the previous ANSWER. Substituting the previous subject turns it into a different question.
  const turns = await converse(["Quem controla a Root?", "Que fontes é que respondem a isto?"], "pt-PT");
  assert.notEqual(turns[1].meta.reference_turn_type, "PRONOMINAL_FOLLOWUP");
  assert.ok((turns[1].result.sources || []).length > 0, "it is answered with evidence");
});

test("an explicitly named target beats the inherited one", async () => {
  // "Que fontes explicam a Root?" asks about Root. Source-followup context is not sticky, and serving
  // the previous answer's evidence here would answer a different question with right-looking citations.
  const turns = await converse(["quem controla os operadores ?", "Que fontes explicam a Root?"], "pt-PT");
  assert.notEqual(turns[1].meta.intent, "source_followup", "an explicit subject is not a backward reference");
  assert.ok(
    !(turns[1].result.sources || []).map((s) => s.id).includes("ADR-004"),
    "the prior operator evidence must not be served",
  );
});

test("a follow-up with no conversation behind it is an underspecified first turn", async () => {
  const [a] = await converse(["Which source says so?"], "en");
  assert.notEqual(a.meta.intent, "source_followup", "there is nothing to point at");
});
