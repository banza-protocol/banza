// Every entry in the corpus, not a sample of them.
//
// The locale work was proven so far on hand-picked witnesses: def-profile-l0 for the bilingual case,
// def-operator for the Portuguese-only case. Witnesses prove a mechanism works; they do not prove it was
// applied everywhere, and the failure this whole programme started from — an English question answered
// in Portuguese — is a per-entry failure. One entry that never got a realization, or one that quietly
// falls back across locales, reproduces the original defect for exactly the readers who ask about it.
//
// So this asserts the contract over all 178 entries. It runs at the realization layer rather than
// through natural-language queries, deliberately: not every entry has a phrasing that reliably routes to
// it, and inventing 178 questions would test the router's aim rather than the locale contract. The
// live-query evidence lives in the census; this is the exhaustive half.

import test from "node:test";
import assert from "node:assert/strict";
import { ENTRIES, realizedLocales, answerFor } from "../src/knowledge.js";

const BILINGUAL = ENTRIES.filter((e) => realizedLocales(e).includes("en"));
const PT_ONLY = ENTRIES.filter((e) => !realizedLocales(e).includes("en"));

/**
 * The bilingual floor. It RATCHETS: raise it when English realizations are added, never lower it.
 *
 * This was an exact equality at 15, and equality was the wrong instrument. The failure the comment
 * below names is a bilingual pair being LOST — a floor catches that. What equality also caught was a
 * pair being GAINED, so every English realization added to the corpus arrived as a red test, and the
 * corpus is 178 entries of which most still have no English. A guard that fails on the work it exists
 * to encourage gets read as noise, and then it gets weakened.
 */
const BILINGUAL_FLOOR = 30;

test("the corpus is the size the locale migration measured, and the bilingual set has not shrunk", () => {
  // Non-vacuity, and a drift alarm: if entries are added without realizations, or a bilingual pair is
  // lost, the counts move and this says so before the per-entry rules run against a changed world.
  assert.equal(ENTRIES.length, 178, "deterministic entry count changed");
  assert.ok(
    BILINGUAL.length >= BILINGUAL_FLOOR,
    `bilingual entries fell to ${BILINGUAL.length}, below the floor of ${BILINGUAL_FLOOR} — a realization was lost`,
  );
  assert.equal(BILINGUAL.length + PT_ONLY.length, ENTRIES.length, "every entry must fall in exactly one class");
});

test("every bilingual entry serves a real, distinct realization in both locales", () => {
  const failures = [];
  for (const e of BILINGUAL) {
    const pt = answerFor(e, "pt-PT");
    const en = answerFor(e, "en");
    const why = [];
    if (!pt.available || !pt.text) why.push("no Portuguese realization");
    if (!en.available || !en.text) why.push("no English realization");
    if (pt.text && pt.text === en.text) why.push("both locales returned the SAME text — one is not a realization");
    if (pt.locale !== "pt-PT") why.push(`Portuguese realization declares locale ${pt.locale}`);
    if (en.locale !== "en") why.push(`English realization declares locale ${en.locale}`);
    // The pre-migration shape: PT and EN glued into one string. A reader got both languages at once.
    for (const [tag, r] of [["pt-PT", pt], ["en", en]]) {
      if (String(r.text || "").includes("\n\n---\n\n")) why.push(`${tag} realization still concatenates two locales`);
    }
    if (why.length) failures.push(`${e.id}: ${why.join("; ")}`);
  }
  assert.deepEqual(failures, [], `${failures.length} of ${BILINGUAL.length} bilingual entries are not truly bilingual`);
});

test("every Portuguese-only entry fails closed in English, and never falls back", () => {
  // The rule that keeps the original defect from returning at scale: an English request for an entry
  // with no English realization must be TOLD SO, in English. Serving the Portuguese text instead is the
  // defect; serving a Portuguese "unavailable" message is the same defect with a shorter sentence.
  const failures = [];
  for (const e of PT_ONLY) {
    const pt = answerFor(e, "pt-PT");
    const en = answerFor(e, "en");
    const why = [];
    if (!pt.available || !pt.text) why.push("lost its Portuguese realization");
    if (pt.locale !== "pt-PT") why.push(`Portuguese realization declares locale ${pt.locale}`);
    if (en.available !== false) why.push("English reports AVAILABLE for an entry with no English realization");
    if (en.locale !== "en") why.push(`English unavailable state declares locale ${en.locale}`);
    if (!en.text) why.push("English unavailable state carries no text at all");
    if (en.text && en.text === pt.text) why.push("English request was served the Portuguese text — cross-locale fallback");
    if (why.length) failures.push(`${e.id}: ${why.join("; ")}`);
  }
  assert.deepEqual(failures, [], `${failures.length} of ${PT_ONLY.length} Portuguese-only entries mishandle an English request`);
});

test("the unavailable state is itself localized, not one shared sentence", () => {
  // A fail-closed path that answers in Portuguese is still answering in the wrong language. Sampled
  // across the class because the property is about the SHAPE of the unavailable state, which is shared.
  const sample = PT_ONLY.slice(0, 5);
  assert.ok(sample.length >= 5, "sample too small to mean anything");
  for (const e of sample) {
    const en = answerFor(e, "en");
    assert.equal(en.locale, "en");
    assert.notEqual(en.text, answerFor(e, "pt-PT").text);
  }
});
