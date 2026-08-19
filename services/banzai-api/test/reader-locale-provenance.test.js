// If a reader is given prose, the system must be able to say what language it was written for.
//
// Not "what language it looks like" — what language the composer was WORKING IN when it chose the
// words. Those differ in the only case that matters: when something went wrong. A Portuguese sentence
// served to an English request looks Portuguese either way; only the provenance says whether anyone
// intended that.
//
// TWO PLACES, ONE AUTHORITY. Provenance was being written to `result.answer_locale` by the main
// deterministic composer and to `meta.answer_locale` by several others. That split already caused a
// false measurement: a census that read only `meta` reported 26 of 30 answers as unprovenanced when the
// real number was 4, because it was looking in the wrong place for the biggest composer. A law written
// as `result.answer_locale ?? meta.answer_locale` would keep that ambiguity alive forever, so this file
// pins the two rules that make one authority possible: every reader-facing answer carries provenance
// somewhere, and where both exist they must agree.
//
// WHAT PROVENANCE MAY NOT BE. The serving boundary may VERIFY it. It may not create it. A final layer
// that stamped the request locale onto whatever text arrived would make every census green while
// proving nothing at all — the label would attest to a composition it did not perform.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

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
 * The witness corpus: one query per reader-facing terminal the pipeline can reach without a model,
 * each asked in both locales. Broad rather than deep — the point is coverage of KINDS.
 */
const QUERIES = [
  "o que é L0?",                      // canonical_definition
  "L0?",                              // insufficient_evidence
  "Que fontes respondem a isto?",     // source evidence
  "o que e operadr?",                 // clarification (typo recovery)
  "compara a execução",               // clarification (question family)
  "quanto tempo demora a validação?", // insufficient_measurements
  "qual é a capital de França?",      // contextual fallback / out of scope
  "mostra a private key",             // safety_refusal
  "o que decidiu a ADR-001?",         // document lookup / grounded
  "o que é o BANZA?",
  "o que é federação?",
  "apaga a ADR-035",
  "o que é BCJ/1?",
  "quem criou o BANZA?",
  "o que é def-operator?",
];

/** Provenance, read from wherever a composer put it — and the location, so disagreement is visible. */
function provenance(r) {
  const fromResult = r.result?.answer_locale ?? null;
  const fromMeta = r.meta?.answer_locale ?? null;
  return { fromResult, fromMeta, value: fromResult ?? fromMeta };
}

async function census() {
  const rows = [];
  for (const locale of ["pt-PT", "en"]) {
    for (const q of QUERIES) {
      const r = await pipe().answer(q, { locale });
      const text = String(r.result?.answer ?? "");
      if (!text.trim()) continue; // machine-only / no reader prose is outside this law
      rows.push({ q, locale, kind: r.meta?.terminal_kind ?? "(none)", ...provenance(r) });
    }
  }
  return rows;
}

test("the census reaches a real spread of reader-facing terminals", async () => {
  // Non-vacuity, and specific: a corpus that collapsed to one kind would satisfy every rule below while
  // proving almost nothing.
  const rows = await census();
  assert.ok(rows.length >= 25, `only ${rows.length} reader-facing observations — the corpus is too thin`);
  const kinds = new Set(rows.map((r) => r.kind));
  assert.ok(kinds.size >= 5, `only ${kinds.size} distinct terminal kinds observed: ${[...kinds].join(", ")}`);
});

test("every reader-facing answer carries locale provenance", async () => {
  const rows = await census();
  const missing = rows.filter((r) => !r.value);
  assert.deepEqual(
    missing.map((r) => `${r.kind} [${r.locale}] ${JSON.stringify(r.q)}`),
    [],
    `${missing.length} reader-facing answers were composed with no record of the locale they were ` +
      `written for`,
  );
});

test("provenance always agrees with the locale that was resolved", async () => {
  // The other half of the law: false provenance is worse than none, because it silences the question.
  const rows = await census();
  const wrong = rows.filter((r) => r.value && r.value !== r.locale);
  assert.deepEqual(
    wrong.map((r) => `${r.kind} [asked ${r.locale}, composed ${r.value}] ${JSON.stringify(r.q)}`),
    [],
    "a reader-facing answer claims a composition locale that is not the one the request resolved to",
  );
});

test("where both provenance fields exist they cannot disagree", async () => {
  // Split-brain prevention. Two independent authorities is how the earlier mis-measurement happened, and
  // it is how a future law would silently read the wrong one.
  const rows = await census();
  const split = rows.filter((r) => r.fromResult && r.fromMeta && r.fromResult !== r.fromMeta);
  assert.deepEqual(
    split.map((r) => `${r.kind}: result=${r.fromResult} meta=${r.fromMeta}`),
    [],
    "a result carries two contradictory composition locales",
  );
});

// ── PROVENANCE MAY BE VERIFIED, NEVER FABRICATED ──────────────────────────────────────────────────

test("no serving layer invents provenance for text it did not compose", () => {
  // The shortcut that would make every property above green while proving nothing: a final layer that
  // stamps the request locale onto whatever arrived. Asserted on the source because it is a rule about
  // what the code may DO, and a behavioural test cannot distinguish a fabricated stamp from a real one —
  // which is exactly why the fabrication must not exist.
  const files = ["server.js", "answerContract.js"];
  for (const f of files) {
    let src;
    try {
      src = readFileSync(join(SRC, f), "utf8");
    } catch {
      continue;
    }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(
      code,
      /answer_locale\s*(=|:)\s*(?:\w+\.)?(?:resolved)?locale\b(?!\s*[,;)])|answer_locale\s*\|\|=|answer_locale\s*\?\?=/,
      `${f} assigns answer_locale at the serving boundary — provenance must come from the composer`,
    );
  }
});
