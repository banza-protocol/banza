// A question-family terminal declares the locale it composed for.
//
// Every other terminal in the pipeline stamps `answer_locale`. This one did not, and nothing noticed
// because no probe had ever reached it: the corpus that existed asked definitions and comparisons, and
// the question-family path answers a different shape of question entirely.
//
// Measured across the 572-item V2 baseline against production `src-ef21f43`, 58 answers came back with
// `answer_locale: null` — every one of them a question-family terminal, 57 of them Portuguese. The
// consequence is not cosmetic. `answer_locale` is what the locale contract is checked against, so an
// answer that never declares its language cannot be caught serving the wrong one; the whole EN/PT
// guarantee was simply inapplicable to this terminal.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

async function ask(q, locale) {
  const c = canaryProvider("MODEL PROSE");
  const h = harness({ provider: c.provider });
  const r = await h.pipeline.answer(q, { locale });
  return { res: r.result || {}, meta: r.meta || {} };
}

test("a question-family answer states which locale it was composed for", async () => {
  // HOW THIS FAILS IF THE FIX IS REVERTED: dropping `answer_locale` from familyAnswer restores exactly
  // the production defect — the answer still arrives, still reads correctly, and the field is null.
  // The assertion is on the delivered result rather than on the composer, because that is what the
  // contract layer and the caller actually read.
  const { res, meta } = await ask("A que se aplica a chave de idempotência?", "pt-PT");
  assert.equal(meta.terminal_kind, "question_family", "expected the question-family terminal");
  assert.equal(res.answer_locale, "pt-PT", "a question-family terminal must declare its locale");
});

test("no terminal serves an answer without declaring its locale", async () => {
  // The general property, over the shapes that reach different terminals. A terminal that answers and
  // says nothing about its language is the hole this closes, wherever it appears.
  const probes = [
    ["A que se aplica a chave de idempotência?", "pt-PT"],
    ["O que é um ledger?", "pt-PT"],
    ["What is a ledger?", "en"],
    ["O que exige a invariante INV-LEDGER-003 do BANZA?", "pt-PT"],
    ["What does invariant INV-LEDGER-003 require in BANZA?", "en"],
  ];
  const silent = [];
  for (const [q, loc] of probes) {
    const { res } = await ask(q, loc);
    if (res.answer && !res.answer_locale) silent.push(`${loc} :: ${q}`);
  }
  assert.deepEqual(silent, [], "answers served without an answer_locale: " + silent.join(" | "));
});
