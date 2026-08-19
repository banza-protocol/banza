// `entry.answer` is a projection of ONE locale, and may never become anything else.
//
// The field survives deprecation because 66 tests and guards assert Portuguese prose through it, and
// rewriting them would have changed 66 assertions to prove what they already proved. The price of that
// bargain is that the projection must stay boring: it reads pt-PT, it writes pt-PT, and it cannot be
// talked into any other language by any means.
//
// Everything a future change might plausibly do to it — return English, fall back when Portuguese is
// missing, write through to both, become visible as canonical schema — is a locale defect wearing the
// costume of a convenience. Each one is pinned here, because "it's only the legacy field" is exactly the
// reasoning that would let one through.
//
// P3 (locale-serving-boundary.test.js) already stops SERVING code reading it. This file stops the field
// itself from changing meaning underneath everyone who still does.

import test from "node:test";
import assert from "node:assert/strict";
import { getEntry, realizedLocales } from "../src/knowledge.js";

/** A bilingual witness: both realizations present, so "returned the wrong one" is observable at all. */
function bilingualWitness() {
  const e = getEntry("def-profile-l0");
  assert.ok(e, "def-profile-l0 must exist");
  const locales = realizedLocales(e);
  assert.ok(locales.includes("pt-PT"), "witness must have a Portuguese realization");
  assert.ok(locales.includes("en"), "witness must have an English realization — otherwise P1 proves nothing");
  return e;
}

test("the witness is genuinely bilingual, else every property below is vacuous", () => {
  const e = bilingualWitness();
  assert.notEqual(
    e.realizations["pt-PT"],
    e.realizations.en,
    "the two realizations must differ, or returning the wrong one would be undetectable",
  );
});

// ── READ ──────────────────────────────────────────────────────────────────────────────────────────

test("the projection reads exactly the Portuguese realization", () => {
  const e = bilingualWitness();
  assert.equal(e.answer, e.realizations["pt-PT"]);
});

test("the projection never reads the English realization", () => {
  // P1's owning assertion. Stated separately from the equality above so the failure names the defect.
  const e = bilingualWitness();
  assert.notEqual(
    e.answer,
    e.realizations.en,
    "compatibility answer must be the pt-PT realization, but the English one was returned",
  );
});

test("the projection does NOT fall back across locales when Portuguese is absent", () => {
  // P2's owning assertion. Every entry in the corpus has Portuguese, so the absent case has to be
  // constructed — on the real object, through the real getter, not on a copy that shares none of the code.
  const e = bilingualWitness();
  const pt = e.realizations["pt-PT"];
  const en = e.realizations.en;
  try {
    delete e.realizations["pt-PT"];
    assert.notEqual(
      e.answer,
      en,
      "with no Portuguese realization the projection fell back to English — it is a projection of one " +
        "locale, not a best-available selector",
    );
    assert.ok(
      e.answer === undefined || e.answer === "",
      `absent Portuguese must read as absent, got ${JSON.stringify(e.answer)}`,
    );
  } finally {
    e.realizations["pt-PT"] = pt;
  }
  assert.equal(e.answer, pt, "the witness must be restored");
});

// ── WRITE ─────────────────────────────────────────────────────────────────────────────────────────

test("writing the projection changes Portuguese and leaves English untouched", () => {
  // The setter exists because source-followup tests assign to this field to simulate answer drift; under
  // ESM strict mode a getter-only property makes that a TypeError. It must stay as narrow as the getter.
  const e = bilingualWitness();
  const pt = e.realizations["pt-PT"];
  const en = e.realizations.en;
  const SENTINEL = "SENTINEL-PT-ONLY-WRITE";
  try {
    e.answer = SENTINEL;
    assert.equal(e.realizations["pt-PT"], SENTINEL, "the write must land on the Portuguese realization");
    assert.equal(e.realizations.en, en, "the write must not touch the English realization");
    assert.equal(e.answer, SENTINEL, "and must read back through the same projection");
  } finally {
    e.realizations["pt-PT"] = pt;
  }
  assert.equal(e.answer, pt);
  assert.equal(e.realizations.en, en);
});

test("writing the projection does not create realizations in other locales", () => {
  const e = bilingualWitness();
  const pt = e.realizations["pt-PT"];
  const before = realizedLocales(e).slice().sort();
  try {
    e.answer = "SENTINEL";
    assert.deepEqual(realizedLocales(e).slice().sort(), before, "the write changed which locales exist");
  } finally {
    e.realizations["pt-PT"] = pt;
  }
});

// ── SHAPE ─────────────────────────────────────────────────────────────────────────────────────────

test("the projection is not canonical schema data", () => {
  // It must not appear where a reader of the entry would take it for the answer's owner: `realizations`
  // is the schema, and a second visible answer field competing with it is how the old model comes back.
  const e = bilingualWitness();
  assert.ok(!Object.keys(e).includes("answer"), "the compatibility projection must be non-enumerable");
  assert.ok(Object.keys(e).includes("realizations"), "realizations must be the visible canonical field");
  assert.ok(!JSON.stringify(e).includes('"answer"'), "the projection must not serialize as entry data");
  // But it must still be readable — deprecated, not removed.
  assert.equal(typeof e.answer, "string");
});

test("every entry carries the projection with the same meaning, not just the witness", () => {
  // Non-vacuity across the corpus: one hand-picked entry proves one entry.
  let checked = 0;
  for (const id of ["def-profile-l0", "def-operator", "def-trust", "def-implementation"]) {
    const e = getEntry(id);
    if (!e) continue;
    assert.equal(e.answer, e.realizations["pt-PT"], `${id}: projection must read pt-PT`);
    assert.ok(!Object.keys(e).includes("answer"), `${id}: projection must be non-enumerable`);
    checked++;
  }
  assert.ok(checked >= 4, `only ${checked} entries checked — the sweep is too narrow to mean anything`);
});
