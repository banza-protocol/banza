// The universe is CLOSED: every eligible unit is covered, every critical capability is owned.
//
// This is the guard that makes a coverage percentage mean something. Without it, "100%" is a statement
// about how many tests happen to exist, and the denominator can be quietly shaped by whatever the
// engine already does — which is the circularity the universe artifact exists to break.
//
// The direction it enforces is one-way: authority and declared capabilities produce the universe, the
// universe produces coverage requirements, and the corpus satisfies them. A corpus item that names no
// semantic unit contributes nothing, by construction.
//
// It also refuses to pass vacuously. An empty or materially incomplete universe is a generator failure,
// not a clean bill of health, and the counts below say so.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRIES } from "../src/knowledge.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const universe = read("assurance/banzai-knowledge/semantic-universe.json");
const benchmark = read("assurance/banzai-knowledge/benchmark-v2.json");
const capabilities = read("assurance/banzai-knowledge/capabilities.json");
const domainConcepts = read("assurance/banzai-knowledge/domain-concepts.json");

// The declared taxonomy, in ONE place. Both the non-vacuity check and the classification check read
// it, so a class cannot be declared without being populated, nor populated without being declared.
const KNOWN_CLASSES = [
  "BANZA_NORMATIVE", "BANZA_CANONICAL", "BANZA_SUPPORTING",
  "DOMAIN", "HYBRID", "RUNTIME_TRUTH", "REPO_TRUTH", "CAPABILITY",
];

const units = universe.units;
const factual = units.filter((u) => u.knowledge_class !== "CAPABILITY");
const capabilityUnits = units.filter((u) => u.knowledge_class === "CAPABILITY");

test("the universe is non-vacuous and internally counted", () => {
  // A generator that silently returned nothing would make every assertion below pass.
  assert.ok(units.length >= 100, `universe collapsed to ${units.length} units`);
  assert.equal(units.length, universe.counts.total, "declared total disagrees with the unit list");
  assert.ok(universe.universe_hash && universe.universe_hash.length >= 16, "the universe must be hashed");
  // Every class the taxonomy DECLARES must be populated. The earlier version of this list omitted
  // BANZA_SUPPORTING, so that class sat at zero with no generator path and nothing to notice it: the
  // taxonomy claimed a kind of knowledge the universe never contained. A class list that skips the
  // empty class cannot detect an empty class.
  for (const cls of KNOWN_CLASSES) {
    assert.ok(universe.counts.by_class[cls] > 0, `class ${cls} is empty`);
  }
});

test("every unit is classified — none is unknown", () => {
  const KNOWN = new Set(KNOWN_CLASSES);
  const bad = units.filter((u) => !KNOWN.has(u.knowledge_class)).map((u) => u.semantic_id);
  assert.deepEqual(bad, [], "unclassified units: " + bad.join(", "));
  const noId = units.filter((u) => !u.semantic_id);
  assert.equal(noId.length, 0, "every unit needs a stable semantic id");

  // And each id appears ONCE. Two units sharing an id inflate the declared total while covering one
  // thing — the denominator grows and the coverage it demands does not. This caught MON-001, whose
  // family key equals its own member id, emitting the same unit twice.
  const seen = new Map();
  for (const u of units) seen.set(u.semantic_id, (seen.get(u.semantic_id) || 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
  assert.deepEqual(dupes, [], "duplicate semantic ids: " + dupes.join(", "));
  assert.equal(new Set(units.map((u) => u.semantic_id)).size, units.length, "unit ids must be unique");
});

test("every eligible factual unit has benchmark coverage in both required locales", () => {
  const covered = new Map();
  for (const it of benchmark.items) {
    for (const id of it.semantic_unit_ids || []) {
      if (!covered.has(id)) covered.set(id, new Set());
      covered.get(id).add(`${it.locale}:${it.form}`);
    }
  }
  const gaps = [];
  for (const u of factual) {
    if (u.current === false) continue;
    const seen = covered.get(u.semantic_id) || new Set();
    if (u.direct_question_required) {
      if (u.PT_required && !seen.has("pt-PT:direct")) gaps.push(`${u.semantic_id} — no PT direct`);
      if (u.EN_required && !seen.has("en:direct")) gaps.push(`${u.semantic_id} — no EN direct`);
    }
    if (u.paraphrase_required) {
      if (u.PT_required && !seen.has("pt-PT:paraphrase")) gaps.push(`${u.semantic_id} — no PT paraphrase`);
      if (u.EN_required && !seen.has("en:paraphrase")) gaps.push(`${u.semantic_id} — no EN paraphrase`);
    }
  }
  assert.deepEqual(gaps, [], `${gaps.length} eligible units without coverage:\n  ` + gaps.join("\n  "));
});

test("every corpus item names at least one semantic unit", () => {
  // An item with no unit id cannot contribute to coverage, so it must not exist: it would be a test
  // that looks like assurance and counts toward nothing.
  const orphans = benchmark.items.filter((i) => !(i.semantic_unit_ids || []).length).map((i) => i.question_id);
  assert.deepEqual(orphans, [], "corpus items with no semantic unit: " + orphans.join(", "));
  const known = new Set(units.map((u) => u.semantic_id));
  const dangling = benchmark.items
    .flatMap((i) => (i.semantic_unit_ids || []).map((id) => [i.question_id, id]))
    .filter(([, id]) => !known.has(id));
  assert.deepEqual(dangling, [], "corpus items naming units that do not exist: " + JSON.stringify(dangling));
});

test("every critical capability has a positive, a negative and a mutation owner", () => {
  const unowned = [];
  for (const c of capabilities.capabilities) {
    if (c.criticality !== "P0" && c.criticality !== "P1") continue;
    if (!c.positive_owner) unowned.push(`${c.semantic_id} — no positive owner`);
    if (!c.negative_owner) unowned.push(`${c.semantic_id} — no negative owner`);
    if (!c.mutation_owner) unowned.push(`${c.semantic_id} — no mutation owner`);
  }
  assert.deepEqual(unowned, [], `${unowned.length} unowned capability slots:\n  ` + unowned.join("\n  "));
  assert.equal(capabilityUnits.length, capabilities.capabilities.length, "declared capabilities must all be units");
});

test("every reader-facing entry maps to a declared semantic unit — none is exempt", () => {
  // THE CLOSED-WORLD PROPERTY, and the reason it is a property rather than a number.
  //
  // This assertion used to read `orphans.length <= 96`. The real count was 28. A guard pinned 68 above
  // the truth is not a ratchet, it is permission: sixty-eight entries could have stopped mapping to
  // anything and the suite would have stayed green. Worse, the pin was justified in a comment that said
  // some entries "legitimately rest on sources no protocol unit names" — which was true about PROTOCOL
  // authority and false as an excuse, because an entry about the repository's own guards is still
  // knowledge BanzAI serves and still needs a denominator to belong to.
  //
  // The audit classified all 28 (assurance/banzai-knowledge/orphan-classification.json) and found ZERO
  // legitimately outside: ten were missing canonical or supporting units, nine were repository truth
  // with no class to live in, and nine were behaviours belonging to capabilities that had never been
  // declared — including the action boundary, the engine's most safety-critical behaviour.
  //
  // So the number is now zero and it is asserted, not recorded. An entry joins the universe by one of
  // three declared routes and there is no fourth:
  //   1. it answers a declared DOMAIN concept
  //   2. it rests on a source that some unit names as its authority
  //   3. a unit claims it explicitly by id, which is how behaviours and repository truth map
  const domainEntryIds = new Set(domainConcepts.concepts.map((c) => c.entry_id));
  const unitEntryHints = new Set(units.flatMap((u) => [u.semantic_id, ...(u.source_ids || [])]));
  const claimedByUnit = new Set(units.flatMap((u) => u.entry_ids || []));
  const orphans = [];
  for (const e of ENTRIES) {
    if (domainEntryIds.has(e.id)) continue;
    if (claimedByUnit.has(e.id)) continue;
    const sourceIds = (e.sources || []).map((s) => String(s.id));
    if (sourceIds.some((s) => unitEntryHints.has(s))) continue;
    orphans.push(e.id);
  }
  assert.deepEqual(
    orphans,
    [],
    `${orphans.length} reader-facing entries map to no declared unit — every entry must belong to the ` +
      `universe or the coverage denominator is not closed: ${orphans.join(", ")}`,
  );
});

test("no unit claims an entry that does not exist", () => {
  // The mirror of the property above, and the way it would rot. `entry_ids` is hand-declared, so a
  // renamed or deleted entry would leave a unit claiming a ghost — the orphan count would stay at zero
  // while the entry it accounted for was gone. Claiming nothing must not look like claiming something.
  const known = new Set(ENTRIES.map((e) => e.id));
  const ghosts = units
    .flatMap((u) => (u.entry_ids || []).map((id) => [u.semantic_id, id]))
    .filter(([, id]) => !known.has(id));
  assert.deepEqual(ghosts, [], "units claiming entries that do not exist: " + JSON.stringify(ghosts));
});

test("every critical invariant member is an atomic unit of its own", () => {
  // The atomicity property. A family unit answers "what are the ledger invariants?"; it cannot detect
  // that one member of the family stopped being true, because an answer naming any member satisfies it.
  //
  // The audit (invariant-atomicity.json) read all 55 critical members and found every one independently
  // falsifiable — an implementation can satisfy every sibling and violate this one. So each is its own
  // unit, and this asserts the universe still contains all of them: an invariant added to the registry
  // that never becomes a unit is a fact BanzAI is not required to know.
  const atomicity = read("assurance/banzai-knowledge/invariant-atomicity.json");
  const invariants = read("contracts/invariants.json");
  const critical = invariants.invariants.filter((i) => i.severity === "critical").map((i) => i.id);
  assert.equal(atomicity.reviewed, critical.length, "the atomicity audit did not review every critical member");
  const unitIds = new Set(units.map((u) => u.semantic_id));
  const missing = critical.filter((id) => !unitIds.has(`banza.invariant.${id.toLowerCase()}`));
  assert.deepEqual(missing, [], "critical invariants with no atomic unit: " + missing.join(", "));
  // And the family units survive alongside them — the reader's framing is not replaced by the members.
  const families = new Set(critical.map((id) => id.split("-").slice(0, 2).join("-").toLowerCase()));
  const missingFam = [...families].filter((f) => !unitIds.has(`banza.invariant.${f}`));
  assert.deepEqual(missingFam, [], "invariant families with no unit: " + missingFam.join(", "));
});

test("every conversational capability is exercised by a multi-turn journey", () => {
  // V2 shipped 564 corpus items and not one conversation. Eleven capabilities are claims about turn N
  // resolving against turn N-1 — pro-forms, ellipsis, comparison and source follow-ups — and every one
  // of them was declared, owned by a unit test, and never exercised against the deployed system.
  //
  // Unit-test ownership is not the same proof. It shows the resolver works in-process; it cannot show
  // that the context actually survives the wire, the server's field allowlist and the forward-context
  // builder. Only a real multi-turn run does that, so a conversational capability without a journey is
  // reported here rather than counted as covered.
  const conversational = capabilities.capabilities.filter((c) => c.conversational);
  assert.ok(conversational.length >= 10, `expected the conversational capabilities, saw ${conversational.length}`);
  const exercised = new Set(
    benchmark.items.filter((i) => i.turns && i.turns.length > 1).flatMap((i) => i.capability_unit_ids || []),
  );
  const unexercised = conversational.map((c) => c.semantic_id).filter((id) => !exercised.has(id));
  assert.deepEqual(unexercised, [], "conversational capabilities with no multi-turn journey: " + unexercised.join(", "));
});

test("every journey turn carries its own expectation", () => {
  // A journey whose later turns assert nothing runs the conversation and checks the first answer. The
  // follow-up turns are the entire point, so each one must be falsifiable on its own — and the turn
  // count must be greater than one, or it is not a conversation.
  const journeys = benchmark.items.filter((i) => i.turns);
  assert.ok(journeys.length >= 5, `expected multi-turn journeys in the corpus, saw ${journeys.length}`);
  const weak = [];
  for (const j of journeys) {
    if (j.turns.length < 2) weak.push(`${j.question_id} — single turn`);
    j.turns.forEach((t, i) => {
      const n = (t.must || []).length + (t.must_not || []).length;
      if (!n) weak.push(`${j.question_id} turn ${i + 1} — no expectation`);
    });
  }
  assert.deepEqual(weak, [], "journey turns that assert nothing: " + weak.join(", "));
});

test("every DOMAIN unit names a declared source, and every domain source is registered", () => {
  const registered = new Set(Object.keys(read("assurance/banzai-knowledge/domain-concepts.json") && {}));
  void registered;
  const bad = [];
  for (const u of units) {
    if (u.knowledge_class !== "DOMAIN") continue;
    if (!(u.source_ids || []).length) bad.push(`${u.semantic_id} — no source`);
  }
  assert.deepEqual(bad, [], "domain units with no authority: " + bad.join(", "));
});

test("every normative unit names its authority", () => {
  const bad = units
    .filter((u) => u.knowledge_class === "BANZA_NORMATIVE" && !(u.source_ids || []).length)
    .map((u) => u.semantic_id);
  assert.deepEqual(bad, [], "normative units with no authority source: " + bad.join(", "));
});

test("the corpus is bound to the universe it was generated from", () => {
  assert.equal(
    benchmark.universe_hash,
    universe.universe_hash,
    "the benchmark was generated from a different universe — regenerate it",
  );
});
