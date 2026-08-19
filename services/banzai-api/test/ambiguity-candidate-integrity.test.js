// An ambiguous decision's candidates are DATA, and they must be the decision's own.
//
// The engine sometimes understands a question but cannot choose between readings of it. Which reading
// it offers is a decision, and until recently that decision existed only inside a Portuguese sentence:
// "refere-se a operador ou operar?". A reader could act on it; nothing else could — not the frontend
// wanting to render buttons, not a test wanting to assert WHICH alternatives were offered.
//
// `ambiguity_candidates` carries that decision as typed data. This file pins it against the three ways
// it can quietly stop being true:
//
//   R1 — a candidate the decision made is DROPPED from the wire.
//   R2 — a candidate is REPLACED by another valid one (cardinality unchanged, meaning changed).
//   R3 — a candidate is INVENTED that the decision never produced.
//
// R3 is the one that needs saying out loud. `TermSpelling { term }` accepts any String at the type
// level, so nothing structurally prevents a localized phrase — or anything else — from being placed in
// the contract. The type cannot preclude it, so a property has to.
//
// WHY THE ASSERTIONS ARE SOURCE-BOUND, NOT LITERAL. Pinning the exact candidate list for a query would
// pass for the wrong reason the moment the vocabulary or the thresholds move — the property is not
// "these two words", it is "whatever the decision decided, unaltered". So each witness derives its
// expectation from the decision's OWN semantic source and compares against that.

import test from "node:test";
import assert from "node:assert/strict";
import { contextualFallback, recoverQuery } from "../src/knowledge.js";

/** The three live witnesses, one per production site of a candidate. Proven through Rust → WASM → JS. */
const SPELLING_QUERY = "o que e operadr?"; // fuzzy tie → TermSpelling, the generic/payload path
const COMPARISON_QUERY = "compara a execução"; // comparison_targets_unspecified → fixed expansion
const AGGREGATION_QUERY = "quanto tempo demora a validação?"; // aggregation_unspecified → fixed expansion

const fb = (q) => contextualFallback(q, "") || {};
const cands = (q) => fb(q).ambiguity_candidates || [];

test("the witnesses genuinely produce candidates, else every property below is vacuous", () => {
  // Non-vacuity FIRST. A rule about an empty array passes, and all three of these queries depend on
  // vocabulary and thresholds that can move underneath them.
  for (const [name, q] of [
    ["spelling", SPELLING_QUERY],
    ["comparison", COMPARISON_QUERY],
    ["aggregation", AGGREGATION_QUERY],
  ]) {
    assert.ok(cands(q).length > 0, `${name} witness produced no candidates — the property is vacuous`);
  }
});

// ── WIRE SHAPE ────────────────────────────────────────────────────────────────────────────────────

test("every candidate is a tagged object — the array is never a String|Object union", () => {
  // The first implementation serialized unit variants as bare strings and the payload variant as an
  // object. A consumer then had to typeof-branch before it could read anything, and the heterogeneity
  // was load-bearing for exactly the variant that was already wrong.
  for (const q of [SPELLING_QUERY, COMPARISON_QUERY, AGGREGATION_QUERY]) {
    for (const c of cands(q)) {
      assert.equal(typeof c, "object", `${q}: candidate must be an object, got ${typeof c}`);
      assert.ok(c !== null && !Array.isArray(c), `${q}: candidate must be a plain object`);
      assert.equal(typeof c.candidate, "string", `${q}: every candidate must carry a 'candidate' tag`);
      assert.ok(c.candidate.length > 0, `${q}: the tag must not be empty`);
    }
  }
});

// ── FIXED EXPANSIONS: CLOSED WORLD ────────────────────────────────────────────────────────────────

/** The declared expansion of each semantic ambiguity id — the closed world, mirrored from the engine. */
const FIXED_EXPANSION = {
  aggregation_unspecified: ["last_execution", "comparable_executions_median", "configured_timeout_limit"],
  comparison_targets_unspecified: ["last_two_executions", "specific_execution_ids"],
};

test("a semantic ambiguity expands to exactly its declared candidates, in order", () => {
  // R1 and R2 both land here: a dropped candidate changes the array, and a swapped one changes it too,
  // because the assertion is a deep equality against the declared expansion rather than a membership or
  // length check. `deepEqual` on the tags is what makes "wrong but same size" fail.
  for (const [q, id] of [
    [COMPARISON_QUERY, "comparison_targets_unspecified"],
    [AGGREGATION_QUERY, "aggregation_unspecified"],
  ]) {
    const observed = cands(q).map((c) => c.candidate);
    assert.deepEqual(
      observed,
      FIXED_EXPANSION[id],
      `${q}: candidates must be exactly the declared expansion of ${id}`,
    );
  }
});

test("a fixed expansion carries no payload — its identity IS the tag", () => {
  for (const q of [COMPARISON_QUERY, AGGREGATION_QUERY]) {
    for (const c of cands(q)) {
      assert.deepEqual(
        Object.keys(c),
        ["candidate"],
        `${q}: a declared candidate must carry nothing but its tag, got ${JSON.stringify(c)}`,
      );
    }
  }
});

// ── SPELLING CANDIDATES: SOURCE-BOUND ─────────────────────────────────────────────────────────────

test("every spelling candidate comes from the decision's own recovery layer", () => {
  // R3's owning assertion. The expectation is DERIVED from the same query's recovery result, so the
  // property says "these came from the decision" rather than "these are the two words I saw once".
  const rec = recoverQuery(SPELLING_QUERY) || {};
  const source = rec.clarification || [];
  assert.ok(
    rec.requires_clarification && source.length >= 2,
    `the spelling witness must actually require clarification, got ${JSON.stringify(rec.clarification)}`,
  );
  const observed = cands(SPELLING_QUERY);
  for (const c of observed) {
    assert.equal(c.candidate, "term_spelling", "a fuzzy tie must produce spelling candidates");
    assert.ok(
      source.includes(c.term),
      `candidate "${c.term}" is not in the decision's clarification set ${JSON.stringify(source)} — ` +
        `a candidate was invented downstream of the decision that produced it`,
    );
  }
  // …and the converse: nothing the decision produced may be silently dropped.
  assert.deepEqual(
    observed.map((c) => c.term),
    source,
    "the spelling candidates must be the decision's clarification set, complete and in order",
  );
});

test("a spelling candidate declares that it carries a term — it does not pose as a semantic id", () => {
  // The defect this variant was renamed to fix: the payload is Portuguese reader vocabulary, and the
  // previous shape (`{"ambiguity":"operador"}`) presented it as though it were language-neutral.
  for (const c of cands(SPELLING_QUERY)) {
    assert.deepEqual(
      Object.keys(c).slice().sort(),
      ["candidate", "term"],
      `a spelling candidate must carry its tag and its term, got ${JSON.stringify(c)}`,
    );
    assert.equal(typeof c.term, "string");
    assert.ok(c.term.length > 0, "a spelling candidate must name a term");
  }
});

// ── INDEPENDENCE ──────────────────────────────────────────────────────────────────────────────────

test("candidates are not sub_intents, and neither borrows the other's contract", () => {
  // `sub_intents` decomposes a multi-clause question. It is a different decision with a different
  // meaning, and reusing it for alternatives was explicitly ruled out — so the two must be observably
  // independent rather than merely differently named.
  const r = fb(SPELLING_QUERY);
  assert.ok(Array.isArray(r.sub_intents), "sub_intents must remain its own array");
  assert.deepEqual(r.sub_intents, [], "the spelling witness decomposes into no sub-intents");
  assert.ok(cands(SPELLING_QUERY).length > 0, "…while still offering candidates — they are independent");
});

test("an unambiguous question offers no candidates at all", () => {
  // The converse of every property above: candidates must be produced BY ambiguity, not attached to
  // every fallback. Without this, an implementation that always emitted the same list would pass.
  const r = fb("o que é o BANZA?");
  assert.deepEqual(
    r.ambiguity_candidates || [],
    [],
    "a question the engine resolved must not carry ambiguity candidates",
  );
});
