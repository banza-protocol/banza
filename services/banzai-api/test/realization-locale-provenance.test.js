// `answer_locale` must come from the realization that was USED, never from the locale that was asked for.
//
// The two are the same whenever nothing has gone wrong, which is why the difference is easy to lose and
// costly to lose. The corpus is Portuguese-first: most deterministic entries have only a pt-PT
// realization, so `answerFor(entry, "en")` routinely returns something other than English, and the reader
// is told so honestly. If this field restated the request instead, every one of those answers would
// declare itself English while being composed in Portuguese — the label would attest to a composition
// nobody performed, and the client check built on it would pass on exactly the case it exists to catch.
//
// A mutation swapping `realization.locale` for `locale` here survived the existing provenance tests: they
// pin that provenance is present and that the two homes agree, not that it comes from the right side. It
// is pinned here.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { answerFor } from "../src/knowledge.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const pipeline = readFileSync(join(SRC, "pipeline.js"), "utf8");

test("the knowledge composer stamps the realization's locale, not the request's", () => {
  const region = pipeline.slice(
    pipeline.indexOf("const realization = isPrecomposedTerminal"),
    pipeline.indexOf("answer_locale_available"),
  );
  assert.ok(region.length > 0, "expected to find the knowledge realization site");
  assert.match(
    region,
    /answer_locale:\s*realization\.locale/,
    "answer_locale must be taken from the realization that was used",
  );
  assert.doesNotMatch(
    region,
    /answer_locale:\s*locale\s*,/,
    "answer_locale must not restate the requested locale",
  );
});

test("answerFor reports the locale of the prose it actually returned", () => {
  // The contract: a realization declares its own locale and whether the entry was available in it. For a
  // Portuguese-only entry asked for in English, `available` is false and the TEXT is the English way of
  // saying so — so `locale: "en"` is correct and important. The field describes the presentation that was
  // delivered, not the language of the underlying source entry. That distinction is the whole reason an
  // English reader gets an English "not available yet" instead of a Portuguese answer.
  const ptOnly = { realizations: { "pt-PT": "Resposta em português." } };
  const en = answerFor(ptOnly, "en");
  assert.equal(en.available, false, "a Portuguese-only entry is not available in English");
  assert.equal(en.locale, "en", "the delivered prose is English, so it declares English");
  assert.doesNotMatch(en.text, /Resposta em português/, "the Portuguese text must never be delivered");
  assert.match(en.text, /not yet available in English/i, "the English unavailable state must be delivered");
});

test("a Portuguese request gets the Portuguese realization, declared", () => {
  const ptOnly = { realizations: { "pt-PT": "Resposta em português." } };
  const pt = answerFor(ptOnly, "pt-PT");
  assert.equal(pt.available, true, "the entry exists in Portuguese");
  assert.match(pt.text, /Resposta em português/, "and the Portuguese reader gets it");
  assert.match(String(pt.locale), /^pt/, "declared as the Portuguese realization");
});
