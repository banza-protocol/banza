// Asking what supported an answer is a different question from the answer.
//
// In production it was not. "Que fontes é que respondem a isto?" after a settled fact returned that fact
// again, word for word — the evidence was available, the context was engaged, and the reader was handed the
// same paragraph a second time. The referent resolved correctly and the REQUEST was thrown away.
//
// So this file pins two things that fail independently, because collapsing them into one boolean is how the
// request came to be detected and then discarded:
//
//     OPERATION   the turn asks for evidence            (frame `source_evidence`)
//     REFERENT    the target comes from prior state     (frame `referential` → Merge::SourceFollowup)
//
// and one thing that is easy to get almost right: the RESPONSE MODE. Reusing the prior sources while
// rendering the prior answer is exactly the observed failure, and it would satisfy any assertion that only
// checked the entry or the source list. The terminal is therefore asserted everywhere, and a mutation that
// restores `canonical_definition` while keeping perfect sources must go red.
//
// Everything here is model-free by construction. The evidence already exists structurally; a model that had
// to name its own sources would be inventing citations, so the provider is the reachable canary and the
// call count is asserted at zero.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conversation } from "./_two-turn.mjs";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";
import { getEntry, ENTRIES } from "../src/knowledge.js";

const SOURCES_PT = "Que fontes é que respondem a isto?";
const SOURCES_EN = "Which sources support that?";

/** Registered first-turn phrasings ONLY. An unregistered opener makes the follow-up untestable. */
const TARGETS = [
  ["operator governance (PT)", "quem controla os operadores ?", SOURCES_PT, "def-operator-governance-authority"],
  ["operator governance (EN)", "who controls the operators?", SOURCES_EN, "def-operator-governance-authority"],
  ["certification (PT)", "Quem certifica uma implementação?", "Que fontes suportam isto?", "def-certification-actor"],
  // "O que é a Root?" and "Qual é a função da Root?" reach NO record — unregistered phrasings, measured.
  // A fixture that does not settle at turn 1 would test nothing at turn 2.
  ["Root authorization (PT)", "Quem controla a Root?", SOURCES_PT, "def-root-authorization"],
];

test("the first turns really do settle — else every follow-up below is untestable", async () => {
  for (const [label, q1, , expected] of TARGETS) {
    const { turns } = await conversation([q1]);
    assert.equal(turns[0].entry, expected, `${label}: "${q1}" must settle on ${expected}`);
    assert.ok(turns[0].sources.length > 0, `${label}: turn 1 must carry evidence`);
  }
});

// ── The property, target-generic and bilingual ────────────────────────────────────────────────────

for (const [label, q1, q2, expected] of TARGETS) {
  test(`source follow-up preserves target and returns evidence — ${label}`, async () => {
    const { turns, calls } = await conversation([q1, q2]);
    const [first, second] = turns;

    assert.equal(second.mergeKind, "SOURCE_FOLLOWUP", `${label}: the operation must survive the merge`);
    assert.equal(second.terminal, "source_evidence", `${label}: the response must BE the evidence`);
    assert.equal(second.entry, expected, `${label}: the target is inherited, not re-decided`);
    assert.equal(second.contextUsed, true);
    assert.equal(second.contextUsedFor, "source_evidence");
    assert.equal(calls(), 0, `${label}: evidence that already exists must not be asked of a model`);
    assert.equal(second.llm, false);

    // EXACT identities, not "at least one source". A generic search would also return sources.
    assert.deepEqual(
      [...second.sources].sort(),
      [...first.sources].sort(),
      `${label}: the evidence must be the prior fact's own evidence`,
    );

    // The failure this replaces: same sources, same entry, and the substantive answer again.
    assert.notEqual(second.answer, first.answer, `${label}: must not restate the previous answer`);
    assert.match(
      second.answer,
      /fontes que sustentam a resposta anterior|sources supporting the previous answer/i,
      `${label}: the answer must be source-focused`,
    );
  });
}

// ── Operation and referent are independent (§11's four states) ─────────────────────────────────────

test("an evidence request with no target to point at invents nothing", async () => {
  const { turns, calls } = await conversation([SOURCES_PT]);
  assert.notEqual(turns[0].mergeKind, "SOURCE_FOLLOWUP", "there is no prior target to bind");
  assert.equal(turns[0].terminal, "insufficient_evidence");
  assert.equal(turns[0].sources.length, 0, "no generic evidence search for an unresolved referent");
  assert.equal(calls(), 0);
});

test("a referent with no evidence word is an ordinary follow-up, not a source request", async () => {
  const { turns } = await conversation(["Quem certifica uma implementação?", "Porquê?"]);
  assert.notEqual(turns[1].mergeKind, "SOURCE_FOLLOWUP");
  assert.notEqual(turns[1].terminal, "source_evidence");
});

test("a format request stays a format request", async () => {
  // The modifier slot established earlier must not be absorbed: "mostra em JSON" asks for the previous
  // answer rendered differently, which is neither a new subject nor a request for provenance.
  const { turns } = await conversation(["Quem certifica uma implementação?", "mostra em JSON"]);
  assert.notEqual(turns[1].mergeKind, "SOURCE_FOLLOWUP");
  assert.equal(turns[1].contextUsedFor, "output_refinement");
});

// ── The current turn's explicit target always wins ────────────────────────────────────────────────

test("an explicitly named target is not overridden by the inherited one", async () => {
  // "Que fontes explicam a Root?" names Root. Whatever it resolves to, it must NOT be answered with the
  // operator-governance evidence from the previous turn — source-followup context is not sticky.
  const { turns } = await conversation(["quem controla os operadores ?", "Que fontes explicam a Root?"]);
  assert.notEqual(turns[1].mergeKind, "SOURCE_FOLLOWUP", "an explicit subject is not a backward reference");
  assert.ok(
    !turns[1].sources.includes("ADR-004"),
    `must not serve the prior operator evidence: ${turns[1].sources.join(",")}`,
  );
});

test("an unrelated new topic breaks the evidence pair", async () => {
  // Stale context: after moving on, a source request must bind to what is current, never to the older
  // answer still sitting in history.
  const { turns } = await conversation([
    "quem controla os operadores ?",
    "O que é uma implementação?",
    "Que fontes suportam isto?",
  ]);
  const last = turns[2];
  if (last.terminal === "source_evidence") {
    assert.equal(last.entry, "def-implementation", "the evidence must belong to the CURRENT target");
    assert.ok(!last.sources.includes("ADR-004"), "not the stale operator evidence");
  } else {
    assert.notEqual(last.entry, "def-operator-governance-authority", "must not reach back past the new topic");
  }
});

// ── A prior turn that established nothing ─────────────────────────────────────────────────────────

test("a follow-up after an unsupported question claims no reuse", async () => {
  const { turns, calls } = await conversation(["Como funciona um motor a jacto?", SOURCES_PT]);
  assert.equal(turns[0].terminal, "insufficient_evidence", "the fixture must actually be unsupported");
  assert.notEqual(turns[1].terminal, "source_evidence", "nothing was established to have evidence for");
  assert.equal(turns[1].previousSourcesReused, false, "and no reuse may be claimed");
  assert.equal(turns[1].sources.length, 0, "no invented sources");
  assert.equal(calls(), 0);
});

test("a settled record stripped of its public evidence declines instead of inventing", async () => {
  const live = ENTRIES.find((e) => e.id === "def-certification-actor");
  assert.ok(live, "the mutation must land on the entry the pipeline reads");
  const saved = live.sources;
  try {
    live.sources = [];
    const { turns, calls } = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
    assert.notEqual(turns[1].terminal, "source_evidence", "there is nothing to show");
    assert.equal(turns[1].previousSourcesReused, false);
    assert.equal(turns[1].sources.length, 0, "no repo-wide search stands in for missing evidence");
    assert.equal(calls(), 0, "and no model is asked to supply it");
  } finally {
    live.sources = saved;
  }
  const { turns } = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
  assert.equal(turns[1].terminal, "source_evidence", "baseline restored");
});

// ── available vs reused: two different claims ─────────────────────────────────────────────────────

// ── The four-state truth table for the two flags ──────────────────────────────────────────────────
//
//   A  no prior source set                      available=false  reused=false
//   B  prior set exists, this turn does not use it   available=true   reused=false
//   C  source follow-up uses prior evidence      available=true   reused=true
//   D  context exists, prior turn had zero sources   available=false  reused=false
//
// D is the one that matters. `available` was computed from context presence, so it reported `true`
// whenever a conversation had history — which is what the old single boolean already did, under a better
// name. Renaming a loose measurement is not tightening it.

test("state A — no prior source set at all", async () => {
  const { turns } = await conversation([SOURCES_PT]);
  assert.equal(turns[0].previousSourcesAvailable, false, "no prior turn, no prior evidence");
  assert.equal(turns[0].previousSourcesReused, false);
});

test("state B — prior evidence exists and this turn does not reuse it", async () => {
  const { turns } = await conversation(["Quem certifica uma implementação?", "mostra em JSON"]);
  assert.ok(turns[0].sources.length > 0, "the prior turn really did carry evidence");
  assert.equal(turns[1].previousSourcesAvailable, true, "it is available to this turn");
  assert.equal(turns[1].previousSourcesReused, false, "but a re-render does not reuse those identities");
});

test("state C — a source follow-up uses prior evidence", async () => {
  const { turns } = await conversation(["quem controla os operadores ?", SOURCES_PT]);
  assert.equal(turns[1].previousSourcesAvailable, true);
  assert.equal(turns[1].previousSourcesReused, true);
  // reused ⇒ available. The converse does not hold, which is what state B shows.
  assert.ok(
    !turns[1].previousSourcesReused || turns[1].previousSourcesAvailable,
    "reused must imply available",
  );
});

test("state D — the general case is NOT yet sound, and this records why", async () => {
  // §6 asked for: context present, prior turn had zero sources ⇒ available=false. It is NOT closed for the
  // general case, and the honest thing is to say so rather than ship a test that passes vacuously.
  //
  // Measured: `previous_sources_available` is derived from `decision.entry_id`, which on a context-carrying
  // turn is the CURRENT turn's resolved target — not the previous one. After "Quem certifica uma
  // implementação?", "mostra em JSON" resolves to `implementation-steps`, a different record with its own
  // sources. So availability reports THAT record's evidence under a "previous" name. Tightening from
  // "context exists" to "the resolved target has evidence" removed one wrong meaning and introduced
  // another on paths where the two targets differ.
  //
  // On the SOURCE_FOLLOWUP path they coincide by construction — the resolved query IS the prior question —
  // so the flag is sound exactly where it is load-bearing, and that is what states B and C assert.
  //
  // Closing the general case needs the prior source ids carried in the forwarded conversation_context, so
  // availability is measured from actual prior evidence instead of re-resolved from a query. That is a
  // change to the client-carried context contract and is deliberately not made here.
  //
  // This test pins the sound half so the unsound half cannot be mistaken for working.
  const live = ENTRIES.find((e) => e.id === "def-certification-actor");
  const saved = live.sources;
  try {
    live.sources = [];
    const { turns } = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
    assert.equal(turns[0].sources.length, 0, "the prior turn carries no evidence");
    assert.equal(turns[1].previousSourcesAvailable, false, "on the follow-up path this IS correct");
    assert.equal(turns[1].previousSourcesReused, false);
    assert.notEqual(turns[1].terminal, "source_evidence", "and nothing is served");
  } finally {
    live.sources = saved;
  }
});

test("available and reused mean different things, and both are earned", async () => {
  // The old single field said "context was used somewhere", which is not reuse. This is the pair that
  // permanently separates them: a format request has prior evidence AVAILABLE and reuses none of it.
  const format = await conversation(["Quem certifica uma implementação?", "mostra em JSON"]);
  assert.equal(format.turns[1].previousSourcesReused, false, "a re-render reuses no evidence");

  const followup = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
  assert.equal(followup.turns[1].previousSourcesReused, true, "a source follow-up does");
  // And `reused: true` must be checkable against the sources actually served.
  const prior = followup.turns[0].sources;
  const shown = followup.turns[1].sources;
  assert.ok(shown.length > 0 && shown.every((id) => prior.includes(id)), "reuse means these exact identities");
});

// ── Source cards keep their Block 5B truth ────────────────────────────────────────────────────────

test("the new terminal reuses the existing source objects and their classes", async () => {
  const { turns } = await conversation(["quem controla os operadores ?", SOURCES_PT]);
  const kinds = turns[1].sourceKinds;
  assert.equal(kinds["ADR-002"], "adr", "an ADR is still an ADR");
  assert.equal(kinds["GOVERNANCE-GLOSSARY"], "doc");
  assert.ok(
    !Object.values(kinds).includes("reference"),
    "no document here is the canonical Reference, so none may claim to be",
  );
  for (const s of turns[1].sources) assert.ok(!/claude|memory\/|\.env/i.test(s), `${s}: internal material`);
});

test("the previous ANSWER's wording cannot change which sources are resolved", async () => {
  // §30 asked for a mutation that forces source resolution through the prior prose. No such code path
  // exists to mutate: `server.js` forwards only the prior USER questions and a sanitized technical context,
  // so the assistant's text never reaches the engine. Rather than fabricate the mutation, the property is
  // asserted directly — rewrite the previous answer beyond recognition and the resolved evidence is
  // identical, because it was never derived from those words.
  const live = ENTRIES.find((e) => e.id === "def-certification-actor");
  const saved = live.answer;
  const baseline = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
  try {
    live.answer = "Texto completamente diferente, sem qualquer palavra da resposta original. Lorem ipsum.";
    const mutated = await conversation(["Quem certifica uma implementação?", "Que fontes suportam isto?"]);
    assert.equal(mutated.turns[1].terminal, "source_evidence");
    assert.equal(mutated.turns[1].entry, baseline.turns[1].entry, "same target");
    assert.deepEqual(
      [...mutated.turns[1].sources].sort(),
      [...baseline.turns[1].sources].sort(),
      "the evidence must be identical — it comes from structured state, not from prose",
    );
  } finally {
    live.answer = saved;
  }
});

test("the evidence shown is the record's own, read from the registry", async () => {
  // Binds the served list to the registry rather than to whatever retrieval would have found, so a future
  // change that swaps in a search result fails here even if the count happens to match.
  const { turns } = await conversation(["quem controla os operadores ?", SOURCES_PT]);
  const entry = getEntry("def-operator-governance-authority");
  const registered = (entry.sources || []).map((s) => s.id);
  for (const id of turns[1].sources) assert.ok(registered.includes(id), `${id} is not this record's evidence`);
});

// ── Provenance context is INERT to reference resolution ───────────────────────────────────────────
//
// Two reference mechanisms coexist and are deliberately not unified: the frame merge (which owns
// SOURCE_FOLLOWUP) and the Increment-6 resolver (which owns execution/artifact/operator referents). They are
// coupled by one line — when Increment-6 resolves, `route()` is called with an EMPTY history, so the frame
// merge cannot run.
//
// That coupling turned prior-evidence metadata into a routing input. Increment-6 activates on
// `has_prior_context`, derived from whatever context object it is handed, so simply CARRYING
// `previous_semantic_target` + `previous_source_ids` made it activate on conversations it owns nothing in.
// Measured: MERGED_FRAME became STANDALONE, and an operator follow-up lost its entry.
//
// These tests pin the separation. They do not reconcile the two systems and must not be rewritten to.

/** A syntactically valid provenance context that names nothing Increment-6 owns. */
const PROVENANCE_ONLY = {
  previous_semantic_target: "def-certification-actor",
  previous_source_ids: ["ADR-002", "ADR-005"],
};

test("provenance context alone does not change a frame merge", async () => {
  const bare = await conversation(["Quem governa os operadores?", "E quem os autoriza?"]);
  const withProvenance = await conversation(["Quem governa os operadores?", "E quem os autoriza?"], {
    seedContext: PROVENANCE_ONLY,
  });
  // The property is A == B, not a particular label. Asserting MERGED_FRAME here was an assumption and it
  // was wrong: the production client also forwards `last_subject`/`last_intent`, which Increment-6
  // legitimately owns, so the resolver activates on this sequence with or without provenance. That is
  // pre-existing coupling between the two mechanisms and is NOT what this test governs — recorded rather
  // than papered over, because it means the frame-only fixtures and the production client already disagree
  // about who decides some multi-turn sequences.
  assert.equal(
    withProvenance.turns[1].mergeKind,
    bare.turns[1].mergeKind,
    "carrying evidence metadata must not change which mechanism decided the turn",
  );
  assert.equal(withProvenance.turns[1].entry, bare.turns[1].entry, "nor the target");
  assert.equal(withProvenance.turns[1].terminal, bare.turns[1].terminal, "nor the terminal");
});

test("provenance context alone does not cost an operator follow-up its target", async () => {
  // The second measured symptom, pinned separately: this follow-up lost its entry when provenance fields
  // reached the resolver.
  const bare = await conversation(["quem controla os operadores ?", "e a Root?"]);
  const withProvenance = await conversation(["quem controla os operadores ?", "e a Root?"], {
    seedContext: PROVENANCE_ONLY,
  });
  assert.equal(withProvenance.turns[1].entry, bare.turns[1].entry, "same target with and without provenance");
  assert.equal(withProvenance.turns[1].mergeKind, bare.turns[1].mergeKind, "same merge owner");
});

// ── Evidence continuity across the conversation boundary ──────────────────────────────────────────

test("evidence continuity survives the conversation boundary", async () => {
  // Moved here from operator-governance-authority.test.js, which could only assert it with history alone.
  // The full round trip is the point: turn 1's public source identities go out in the conversation context,
  // come back on turn 2, are revalidated against the record, and are what turn 2 serves. Nothing is
  // re-retrieved and no prose is parsed.
  const { turns, calls } = await conversation(["quem controla os operadores ?", SOURCES_PT]);
  const [first, second] = turns;
  assert.ok(first.sources.length > 0, "turn 1 must establish evidence");
  assert.equal(second.terminal, "source_evidence");
  assert.notEqual(second.terminal, "insufficient_evidence", "a supported answer must not be contradicted");
  assert.deepEqual([...second.sources].sort(), [...first.sources].sort(), "exact identity continuity");
  assert.equal(second.previousSourcesAvailable, true);
  assert.equal(second.previousSourcesReused, true);
  assert.equal(calls(), 0);
});

test("history alone cannot prove prior evidence — the intentional negative", async () => {
  // F1 as a contract, not a regression. The same two questions through the real pipeline, with the prior
  // QUESTION carried but no structured context: the frame may still recognise the evidence request, and the
  // engine must decline rather than imply a provenance it cannot verify.
  const c = canaryProvider("x");
  const h = harness({ provider: c.provider });
  const q1 = "quem controla os operadores ?";
  await h.pipeline.answer(q1, {});
  const r = await h.pipeline.answer(SOURCES_PT, { contextQuestions: [q1] });
  assert.equal(r.meta.context_merge, "SOURCE_FOLLOWUP", "the frame still recognises the request");
  assert.notEqual(r.meta.terminal_kind, "source_evidence", "but nothing verified can be served");
  assert.equal(r.meta.previous_sources_available, false);
  assert.equal(r.meta.previous_sources_reused, false);
  assert.equal(((r.result || {}).sources || []).length, 0, "no fabricated source list");
  assert.equal(c.calls(), 0, "and no model is asked to supply one");
});

// ── The client carries identities; the server decides authority ───────────────────────────────────
//
// The prior-evidence context crosses a client-controlled boundary, so every id arriving on it is a HINT.
// The server resolves the prior record and keeps only ids that are genuinely that record's public evidence,
// bound to that target — otherwise valid identities could be replayed from one target into a follow-up
// about another. Both columns are asserted: a matrix that only checked `reused` would pass while
// `available` lied, which is exactly what happened before the terminal stopped writing it.

async function withPriorContext(patch) {
  const c = canaryProvider("x");
  const h = harness({ provider: c.provider });
  const q1 = "Quem certifica uma implementação?";
  const t1 = await h.pipeline.answer(q1, {});
  const ctx = { ...t1.meta.conversation_context, ...patch };
  const r = await h.pipeline.answer("Que fontes suportam isto?", { contextQuestions: [q1], conversationContext: ctx });
  return {
    available: r.meta.previous_sources_available === true,
    reused: r.meta.previous_sources_reused === true,
    terminal: r.meta.terminal_kind,
    sources: ((r.result || {}).sources || []).map((s) => s.id),
    calls: c.calls(),
  };
}

test("tamper matrix — honest context is the only one that reuses evidence", async () => {
  const honest = await withPriorContext({});
  assert.equal(honest.available, true, "honest: available");
  assert.equal(honest.reused, true, "honest: reused");
  assert.equal(honest.terminal, "source_evidence");
  assert.equal(honest.calls, 0);

  const TAMPERS = [
    ["foreign but legitimate public source", { previous_source_ids: ["ADR-036"] }],
    ["unknown source id", { previous_source_ids: ["NO-SUCH-SOURCE-9"] }],
    ["internal-only source id", { previous_source_ids: ["CLAUDE.md"] }],
    ["mismatched prior target", { previous_semantic_target: "def-root-authorization" }],
  ];
  for (const [label, patch] of TAMPERS) {
    const r = await withPriorContext(patch);
    assert.equal(r.available, false, `${label}: must not be reported available`);
    assert.equal(r.reused, false, `${label}: must not be reported reused`);
    assert.notEqual(r.terminal, "source_evidence", `${label}: must not serve a source list`);
    assert.equal(r.sources.length, 0, `${label}: no sources may be served`);
    assert.equal(r.calls, 0, `${label}: and no model is asked to supply any`);
  }
});

test("no terminal writes the prior-evidence flags", async () => {
  // Mutation H — forcing `previous_sources_available: true` inside the source_evidence terminal — cannot be
  // killed behaviourally any more, and that is a property of the fix rather than a gap: the terminal is only
  // reachable when the validated prior evidence set is non-empty, which is exactly when availability is
  // already true. The override has become unobservable.
  //
  // Unobservable is not harmless, though: reinstating it restores the trap that produced two false-green
  // tests in this milestone, and any change to the terminal's reachability would make it observable again.
  // So the class is closed structurally — each flag may be written in exactly one place, and a terminal
  // asserting either of them fails here.
  const src = readFileSync(new URL("../src/pipeline.js", import.meta.url), "utf8");
  const writes = (re) => (src.match(re) || []).length;
  assert.equal(writes(/previous_sources_available:/g), 1, "available has exactly one owner");
  assert.equal(writes(/previous_sources_reused:/g), 1, "reused is declared once, settled at the exit point");
  assert.match(src, /previous_sources_available: incomingPriorEvidence\.length > 0,/, "and its owner is revalidation");
});
