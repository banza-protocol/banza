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
 * CLOSED WORLD — every reader-facing entry is realized in BOTH locales.
 *
 * This began as an exact count (178, of which 15 bilingual), then as a ratchet, and it is now the
 * property those two were approximating: a knowledge entry is an answer served to a reader, and a
 * reader asks in one of two languages. An entry realized in only one of them is an answer that exists
 * for some readers and not others — which is the defect the whole locale programme started from,
 * reproduced one entry at a time.
 *
 * There is no exclusion list, and that is deliberate. Every entry in this corpus is reader-facing
 * prose: the definitions, the refusals, the tool analyses and the illustrative examples alike. An
 * entry that genuinely did not require linguistic realization would have to be justified here
 * explicitly and falsifiably, and none does.
 */
test("every entry is realized in both locales — no reader loses an answer to their language", () => {
  const missing = { "pt-PT": [], en: [] };
  for (const e of ENTRIES) {
    for (const locale of ["pt-PT", "en"]) {
      const r = answerFor(e, locale);
      if (!r.available || !r.text) missing[locale].push(e.id);
    }
  }
  assert.deepEqual(
    missing,
    { "pt-PT": [], en: [] },
    `entries missing a realization:\n  pt-PT: ${missing["pt-PT"].join(", ")}\n  en: ${missing.en.join(", ")}`,
  );
  // Non-vacuity: the corpus is real and large enough that the assertion above means something.
  assert.ok(ENTRIES.length >= 200, `expected the full corpus, saw ${ENTRIES.length}`);
  assert.equal(BILINGUAL.length, ENTRIES.length, "every entry must be in the bilingual class");
  assert.equal(PT_ONLY.length, 0, "no entry may be Portuguese-only");
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

/**
 * The FAIL-CLOSED mechanism, exercised on a synthetic entry rather than on the corpus.
 *
 * These two properties used to sample the Portuguese-only class. That class is now empty — every entry
 * is realized in both locales — and a test that samples an empty class either passes vacuously or, as
 * this one did, fails on its own non-vacuity assertion.
 *
 * Emptying the class is the goal, not a reason to delete the guard. The machinery still has to fail
 * closed if a future entry arrives with one locale missing, so it is exercised directly, on an entry
 * built here for the purpose. The property survives its own success.
 */
const SYNTHETIC_PT_ONLY = Object.freeze({
  id: "synthetic-pt-only",
  realizations: { "pt-PT": "Uma resposta que existe apenas em português." },
});

test("a missing English realization fails closed — never the Portuguese text", () => {
  const pt = answerFor(SYNTHETIC_PT_ONLY, "pt-PT");
  const en = answerFor(SYNTHETIC_PT_ONLY, "en");
  assert.equal(pt.available, true, "the Portuguese realization is there");
  assert.equal(pt.locale, "pt-PT");
  assert.equal(en.available, false, "English must be reported as unavailable, not substituted");
  assert.equal(en.locale, "en", "the unavailable state declares the locale that asked");
  assert.ok(en.text, "the unavailable state must say something");
  assert.notEqual(en.text, pt.text, "an English request must never be served the Portuguese text");
});

test("the unavailable state is itself localized, not one shared sentence", () => {
  // A fail-closed path that answers in Portuguese is still answering in the wrong language.
  const en = answerFor(SYNTHETIC_PT_ONLY, "en");
  const ptMissing = answerFor({ id: "synthetic-en-only", realizations: { en: "An answer only in English." } }, "pt-PT");
  assert.equal(ptMissing.available, false);
  assert.equal(ptMissing.locale, "pt-PT");
  assert.notEqual(
    en.text,
    ptMissing.text,
    "the two unavailable states must be different sentences, one per locale",
  );
});
