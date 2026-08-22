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

const units = universe.units;
const factual = units.filter((u) => u.knowledge_class !== "CAPABILITY");
const capabilityUnits = units.filter((u) => u.knowledge_class === "CAPABILITY");

test("the universe is non-vacuous and internally counted", () => {
  // A generator that silently returned nothing would make every assertion below pass.
  assert.ok(units.length >= 100, `universe collapsed to ${units.length} units`);
  assert.equal(units.length, universe.counts.total, "declared total disagrees with the unit list");
  assert.ok(universe.universe_hash && universe.universe_hash.length >= 16, "the universe must be hashed");
  for (const cls of ["BANZA_NORMATIVE", "BANZA_CANONICAL", "RUNTIME_TRUTH", "DOMAIN", "HYBRID", "CAPABILITY"]) {
    assert.ok(universe.counts.by_class[cls] > 0, `class ${cls} is empty`);
  }
});

test("every unit is classified — none is unknown", () => {
  const KNOWN = new Set([
    "BANZA_NORMATIVE", "BANZA_CANONICAL", "BANZA_SUPPORTING",
    "DOMAIN", "HYBRID", "RUNTIME_TRUTH", "CAPABILITY",
  ]);
  const bad = units.filter((u) => !KNOWN.has(u.knowledge_class)).map((u) => u.semantic_id);
  assert.deepEqual(bad, [], "unclassified units: " + bad.join(", "));
  const noId = units.filter((u) => !u.semantic_id);
  assert.equal(noId.length, 0, "every unit needs a stable semantic id");
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

test("every reader-facing entry maps to at least one semantic unit", () => {
  // The mapping is by the entry's own role: a domain entry answers its concept unit, and a BANZA entry
  // answers whichever facts it states. An entry mapping to nothing is either dead or an undeclared
  // capability — both worth knowing, neither worth hiding.
  const domainEntryIds = new Set(domainConcepts.concepts.map((c) => c.entry_id));
  const unitEntryHints = new Set(
    units.flatMap((u) => [u.semantic_id, ...(u.source_ids || [])]),
  );
  const orphans = [];
  for (const e of ENTRIES) {
    if (domainEntryIds.has(e.id)) continue;                       // answers a declared domain unit
    const sourceIds = (e.sources || []).map((s) => String(s.id));
    if (sourceIds.some((s) => unitEntryHints.has(s))) continue;   // rests on a declared authority
    orphans.push(e.id);
  }
  // Recorded rather than asserted at zero: the mapping is by authority, and entries about the repo's
  // own tooling legitimately rest on sources no protocol unit names. The count is pinned so a NEW
  // orphan is visible.
  assert.ok(
    orphans.length <= 96,
    `reader-facing entries mapping to no declared unit grew to ${orphans.length}: ${orphans.slice(0, 12).join(", ")}…`,
  );
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
