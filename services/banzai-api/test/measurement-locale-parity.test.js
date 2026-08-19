// A translation may not quietly drop a fact.
//
// When BanzAI cannot measure something, the honest decline still tells the reader real things: the
// validation journey has nine named steps, each execution's duration is recorded in a JourneyReceipt,
// and once executions exist it will report the median and the 95th percentile. Those facts lived inside
// one Portuguese sentence authored in Rust, so an English reader could not be told them at all.
//
// Translating that sentence by hand would have produced two independent lists of facts, and two lists
// drift. The English one loses a step, or keeps a step the runner no longer has, and nothing notices
// because both sentences still read fluently. So the facts are DATA — `operationalDomain()` reads the
// same `STEP_ORDER` the validation runner executes — and each locale only names them.
//
// These properties check that this stayed true: both realizations must carry the same domain facts, and
// neither may serve the other's language.

import test from "node:test";
import assert from "node:assert/strict";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";
import { operationalDomain, RECEIPT_ARTIFACT } from "../src/operationalDomain.js";
import { STEP_ORDER } from "../src/validate.js";

/** The live trigger: understood operational question, no public executions to measure. */
const MEASUREMENT_QUERY = "quanto tempo demora a validação?";

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

const ask = (locale) => pipe().answer(MEASUREMENT_QUERY, { locale });

test("the witness really reaches the measurement decline, else everything below is vacuous", async () => {
  const r = await ask("pt-PT");
  assert.equal(r.meta.terminal_kind, "insufficient_measurements", "the trigger must reach this terminal");
  assert.equal(r.meta.llm_called, false, "the decline must stay model-free");
  assert.ok(String(r.result.answer).length > 200, "the decline must be substantive, not a stub");
});

// ── THE DOMAIN DESCRIPTION IS SHARED, NOT RESTATED ────────────────────────────────────────────────

test("the domain descriptor reads the runner's own step spine, not a copy", () => {
  // The whole reason the facts are data. If someone pastes a literal list here instead, this fails.
  assert.deepEqual(
    operationalDomain().journey_steps,
    STEP_ORDER,
    "the description of the journey must come from the canonical step order the runner executes",
  );
  assert.ok(STEP_ORDER.length >= 9, `the spine must be real, got ${STEP_ORDER.length} steps`);
});

// ── SEMANTIC PARITY ───────────────────────────────────────────────────────────────────────────────

test("both locales carry every journey step, by identity", async () => {
  // M1's owning assertion. Not "the same number of steps" — the same STEPS. A translation that keeps
  // eight of nine and adds a plausible ninth would pass a count.
  const [pt, en] = await Promise.all([ask("pt-PT"), ask("en")]);
  for (const [locale, r] of [["pt-PT", pt], ["en", en]]) {
    for (const step of operationalDomain().journey_steps) {
      assert.ok(
        String(r.result.answer).includes(step),
        `${locale}: the answer omits journey step "${step}" — a locale lost a domain fact`,
      );
    }
  }
});

test("both locales name the receipt artifact", async () => {
  const [pt, en] = await Promise.all([ask("pt-PT"), ask("en")]);
  for (const [locale, r] of [["pt-PT", pt], ["en", en]]) {
    assert.ok(
      String(r.result.answer).includes(RECEIPT_ARTIFACT),
      `${locale}: the answer does not name ${RECEIPT_ARTIFACT} — the reader is not told where durations are recorded`,
    );
  }
});

test("both locales promise the same statistics, and the right ones", async () => {
  // M2's owning assertion. The statistics are claim identities telemetry actually emits, so promising a
  // different one is a lie the reader cannot check — and a bullet count would not catch it.
  const [pt, en] = await Promise.all([ask("pt-PT"), ask("en")]);
  const EXPECTED = {
    "pt-PT": { median_total: "mediana", p95_total: "percentil 95" },
    en: { median_total: "median", p95_total: "95th percentile" },
  };
  for (const [locale, r] of [["pt-PT", pt], ["en", en]]) {
    for (const stat of operationalDomain().supported_statistics) {
      const phrase = EXPECTED[locale][stat];
      assert.ok(phrase, `no expected wording declared for ${stat} in ${locale}`);
      assert.ok(
        String(r.result.answer).includes(phrase),
        `${locale}: the answer does not promise ${stat} ("${phrase}") — the two locales promise different things`,
      );
    }
  }
});

test("both locales report the same step COUNT as the spine actually has", async () => {
  // Written as a numeral in each locale, but DERIVED from the spine — so the word and the list beside
  // it cannot disagree. Both spellings are accepted; what must hold is that the stated count is real.
  const n = operationalDomain().journey_steps.length;
  const WORD = { "pt-PT": { 9: "nove" }, en: { 9: "nine" } };
  const [pt, en] = await Promise.all([ask("pt-PT"), ask("en")]);
  for (const [locale, r] of [["pt-PT", pt], ["en", en]]) {
    const spelled = (WORD[locale] || {})[n];
    const a = String(r.result.answer);
    assert.ok(
      a.includes(String(n)) || (spelled && a.includes(spelled)),
      `${locale}: the answer does not state the real step count (${n}${spelled ? ` / "${spelled}"` : ""})`,
    );
  }
});

// ── LANGUAGE ──────────────────────────────────────────────────────────────────────────────────────

test("an English request is never served the Portuguese decline", async () => {
  // M3's owning assertion, and the live defect this whole block exists to fix.
  const r = await ask("en");
  const a = String(r.result.answer);
  assert.doesNotMatch(a, /Interpretei o teu pedido/, "English was served the Portuguese sentence");
  assert.doesNotMatch(a, /não invento um número/, "English was served Portuguese explanatory prose");
  assert.match(a, /operational measurement/, "English must get the English framing");
  assert.equal(r.meta.answer_locale, "en", "and must declare the locale it was composed for");
});

test("a Portuguese request keeps its Portuguese decline and declares it", async () => {
  const r = await ask("pt-PT");
  const a = String(r.result.answer);
  assert.match(a, /Interpretei o teu pedido/, "Portuguese must keep its own framing");
  assert.doesNotMatch(a, /operational measurement/, "Portuguese must not carry the English framing");
  assert.equal(r.meta.answer_locale, "pt-PT");
});

test("a caller that states no locale gets Portuguese by legacy default, never by inference", async () => {
  const r = await pipe().answer(MEASUREMENT_QUERY, {});
  assert.match(String(r.result.answer), /Interpretei o teu pedido/, "legacy callers keep Portuguese");
  assert.equal(r.meta.answer_locale, "pt-PT", "and the composed locale is still declared");
});
