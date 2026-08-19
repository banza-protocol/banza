// One answer, one language.
//
// Before the locale layer existed, fifteen entries stored Portuguese and English glued together with a
// separator and served both to everyone. That defect had an obvious signature, and the obvious guard —
// "the answer must not contain `\n\n---\n\n`" — is exactly the guard that would let it back in. Delete
// the separator, keep the two paragraphs, and the reader still gets both languages.
//
// So this pins the SEMANTIC property: a reader-facing answer carries the content of at most one
// realization. It checks that by asking the corpus itself. For a bilingual entry both realizations are
// known, so "did this answer contain BOTH" is a question with a real answer — no language detector, no
// separator heuristic, no guessing from the prose.
//
// WHAT DOES NOT COUNT AS A SECOND REALIZATION. Canonical technical names (BANZA, L0, BCJ/1), artifact
// identifiers, document paths, source titles and catalogue term spellings are not explanatory prose in
// another language. They are names, and they read the same in every locale. A guard that flagged them
// would be deleted by the first person it inconvenienced, which is worse than not having it.

import test from "node:test";
import assert from "node:assert/strict";
import { ENTRIES, realizedLocales, answerFor } from "../src/knowledge.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

const BILINGUAL = ENTRIES.filter((e) => realizedLocales(e).includes("en"));

function pipe() {
  const provider = createProvider(
    { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
    { fetchImpl: async () => { throw new Error("no model in tests"); } },
  );
  return createPipeline(
    { provider, env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(), budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}) },
    {},
    { runGroundedSynthesisFn: async () => ({ status: "insufficient", answer_markdown: "", cited_source_ids: [], package: { facts: [] }, primary_intent: "explain_concept", clarification_candidates: [], trace: {} }) },
  );
}

/**
 * A fingerprint of a realization that survives light editing but not wholesale inclusion.
 *
 * The longest sentences of a realization, normalised. If an answer contains one of these it contains
 * that realization's actual prose — not a shared technical term, and not a coincidence.
 */
function fingerprints(text) {
  return String(text || "")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 60)
    .slice(0, 3);
}

/** Does `answer` contain the substance of this realization? */
function contains(answer, realizationText) {
  const a = String(answer || "").replace(/\*\*/g, "").replace(/\s+/g, " ");
  const fps = fingerprints(realizationText);
  if (!fps.length) return false;
  return fps.some((f) => a.includes(f));
}

test("the witnesses are genuinely two-language, else this proves nothing", () => {
  assert.ok(BILINGUAL.length >= 15, `only ${BILINGUAL.length} bilingual entries`);
  for (const e of BILINGUAL.slice(0, 5)) {
    const pt = answerFor(e, "pt-PT").text;
    const en = answerFor(e, "en").text;
    assert.ok(fingerprints(pt).length, `${e.id}: Portuguese realization has no long sentence to fingerprint`);
    assert.ok(fingerprints(en).length, `${e.id}: English realization has no long sentence to fingerprint`);
    assert.ok(!contains(pt, en), `${e.id}: the two realizations are not distinguishable by fingerprint`);
  }
});

test("no served answer carries the substance of two realizations", async () => {
  // A2's owning assertion, stated over the corpus rather than one witness. This is deliberately NOT a
  // separator check: an answer that concatenates the two realizations with a blank line, a heading, or
  // nothing at all fails here exactly the same way.
  const failures = [];
  for (const e of BILINGUAL) {
    const pt = answerFor(e, "pt-PT").text;
    const en = answerFor(e, "en").text;
    for (const [locale, own, other] of [["pt-PT", pt, en], ["en", en, pt]]) {
      const served = answerFor(e, locale).text;
      if (!contains(served, own)) failures.push(`${e.id} [${locale}]: served text is not the ${locale} realization`);
      if (contains(served, other)) {
        failures.push(`${e.id} [${locale}]: served text ALSO contains the other locale's realization`);
      }
    }
  }
  assert.deepEqual(failures, [], `${failures.length} realization(s) carry more than one language of prose`);
});

test("the same rule holds on the live serving path, not just in the corpus", async () => {
  // The corpus can be clean while the pipeline composes two realizations together on the way out.
  const e = ENTRIES.find((x) => x.id === "def-profile-l0");
  assert.ok(e && realizedLocales(e).includes("en"), "def-profile-l0 must be bilingual for this witness");
  const pt = answerFor(e, "pt-PT").text;
  const en = answerFor(e, "en").text;
  for (const [locale, other] of [["pt-PT", en], ["en", pt]]) {
    const r = await pipe().answer("o que é L0?", { locale });
    const served = String(r.result?.answer ?? "");
    assert.ok(served.length > 0, `${locale}: no answer served`);
    assert.ok(!contains(served, other), `${locale}: the served answer also carries the other locale's prose`);
  }
});

test("canonical names shared by both locales are not counted as a second realization", () => {
  // The rule that keeps this guard ownable. `BANZA`, `L0`, `BCJ/1`, ADR ids and paths appear in both
  // realizations by design; a fingerprint built from them would flag every correct answer.
  for (const token of ["BANZA", "L0", "BCJ/1", "ADR-001", "decisions/adr/ADR-001.md", "Protocol Sandbox"]) {
    assert.deepEqual(fingerprints(token), [], `"${token}" must not be fingerprintable as prose`);
  }
});
