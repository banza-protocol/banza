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
import { conversation } from "./_two-turn.mjs";
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
