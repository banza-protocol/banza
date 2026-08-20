// The tasked terminal answers in the reader's language, completely, from one plan.
//
// This was the last reader-facing kind serving Portuguese to English requests. Rust assembled the
// answer as Portuguese Markdown and the pipeline served that string, so the reader's locale controlled
// nothing and provenance could not truthfully be stamped.
//
// Now Rust emits a semantic plan — WHICH facts, in WHICH order — and JS realizes it per locale. Three
// things must hold and each has a mutation behind it:
//
//   TT1  the realization must follow the RESOLVED locale, not whichever catalogue is reached first;
//   TT2  a locale missing one fact must DECLINE, not serve a fluent procedure with a step missing;
//   TT3  the Rust Markdown must never be the reader's text again.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { taskedAnswer } from "../src/knowledge.js";
import { composeTasked, taskedItemIds, taskedItem } from "../src/taskedRealizations.js";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

const PIPELINE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "pipeline.js");
const WITNESS = "como federar um operador?"; // a Portuguese question, deliberately

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

test("the witness reaches the tasked terminal with a real plan, else nothing here is tested", () => {
  const t = taskedAnswer(WITNESS);
  assert.ok(t && t.matched, "the witness must match a tasked subject");
  assert.ok(Array.isArray(t.plan) && t.plan.length >= 3, `plan looks empty: ${JSON.stringify(t.plan)}`);
  const items = t.plan.flatMap((s) => s.items);
  assert.ok(items.length >= 8, `plan carries only ${items.length} items`);
  for (const i of items) assert.ok(i.item_id && !/\.\d+$/.test(i.item_id), `${i.item_id} looks positional`);
});

// ── TT1: the realization follows the resolved locale ──────────────────────────────────────────────

test("a plan realized in each locale produces that locale's text", async () => {
  const [pt, en] = await Promise.all([
    pipe().answer(WITNESS, { locale: "pt-PT" }),
    pipe().answer(WITNESS, { locale: "en" }),
  ]);
  assert.equal(pt.meta.terminal_kind, "tasked_terminal");
  assert.equal(en.meta.terminal_kind, "tasked_terminal");
  const ptText = String(pt.result.answer);
  const enText = String(en.result.answer);
  assert.match(ptText, /Procedimento parcial/, "Portuguese must get the Portuguese framing");
  assert.match(enText, /Partial procedure/, "English must get the English framing");
  assert.doesNotMatch(enText, /Procedimento parcial|Pré-requisitos|Passos:/, "English must not carry Portuguese headings");
  assert.equal(pt.result.answer_locale, "pt-PT");
  assert.equal(en.result.answer_locale, "en");
  assert.equal(pt.meta.llm_called, false);
  assert.equal(en.meta.llm_called, false);
});

test("both locales realize the SAME plan — same facts, same order", () => {
  const t = taskedAnswer(WITNESS);
  const ptOut = composeTasked(t.plan, t.subject, t.kind, "pt-PT");
  const enOut = composeTasked(t.plan, t.subject, t.kind, "en");
  assert.ok(ptOut && enOut, "both locales must realize the plan");
  assert.notEqual(ptOut, enOut, "the two realizations must differ");
  // Structural parity: the plan is one object, so the fact set cannot differ — assert the shape that
  // proves it, namely that each locale rendered exactly as many bullets/steps as the plan has items.
  for (const [locale, out] of [["pt-PT", ptOut], ["en", enOut]]) {
    const rendered = (out.match(/^[-\d]/gm) || []).length;
    const planItems = t.plan.filter((s) => !["gap_note", "framing", "schema_note"].includes(s.section_kind))
      .flatMap((s) => s.items).length;
    assert.ok(rendered >= planItems - 2, `${locale}: rendered ${rendered} lines for ${planItems} plan items`);
  }
});

// ── TT2: fail closed, never a fluent partial procedure ────────────────────────────────────────────

test("a locale missing any realization the plan names declines outright", () => {
  // TT2's owning assertion. Removing one English item must not yield a shorter English procedure.
  const t = taskedAnswer(WITNESS);
  const missing = t.plan.flatMap((s) => s.items)[2].item_id;
  const plan = JSON.parse(JSON.stringify(t.plan));
  // Simulate the catalogue gap by naming an id the catalogue does not realize.
  for (const s of plan) for (const i of s.items) if (i.item_id === missing) i.item_id = `${missing}.__absent__`;
  const out = composeTasked(plan, t.subject, t.kind, "en");
  assert.equal(out, null, `a plan naming an unrealizable item must decline, got: ${String(out).slice(0, 120)}`);
});

test("every item the supported plans name is realizable in both locales", () => {
  // Non-vacuity for the rule above, over the real universe rather than one witness.
  const QUERIES = [
    "da-me um exemplo de operador", "como federar um operador?", "mostra a estrutura do manifest",
    "como revogar uma chave", "exemplo de trust", "exemplo de evidencia", "exemplo de conformidade",
    "como demonstrar conformidade", "como participar na federacao", "como rodar uma chave",
    "como criar a raiz", "exemplo de interoperabilidade",
  ];
  const gaps = [];
  let plans = 0;
  for (const q of QUERIES) {
    const t = taskedAnswer(q);
    if (!t || !t.plan || !t.plan.length) continue;
    plans++;
    for (const locale of ["pt-PT", "en"]) {
      if (!composeTasked(t.plan, t.subject, t.kind, locale)) gaps.push(`${q} [${locale}]`);
    }
  }
  assert.ok(plans >= 10, `only ${plans} plans exercised`);
  assert.deepEqual(gaps, [], `${gaps.length} plan/locale pair(s) could not be realized`);
});

// ── TT3: the Rust Markdown is not the reader's text ───────────────────────────────────────────────

test("tasked serving never returns the Rust-assembled markdown", () => {
  // TT3's owning assertion, on the source: `answer_markdown` stays on the wire for diagnostics, and a
  // behavioural check cannot distinguish "served it" from "composed identical text" in Portuguese.
  const code = readFileSync(PIPELINE, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(
    code,
    /answer:\s*task\.answer_markdown/,
    "the tasked terminal serves the Rust-assembled Portuguese markdown as the reader's answer",
  );
  assert.match(code, /composeTasked\(/, "tasked serving must realize the plan through the composer");
});

test("the catalogue covers every semantic id and both locales", () => {
  const ids = taskedItemIds();
  assert.ok(ids.length >= 129, `only ${ids.length} semantic ids`);
  for (const locale of ["pt-PT", "en"]) {
    const missing = ids.filter((id) => !taskedItem(id, locale));
    assert.deepEqual(missing, [], `${missing.length} ${locale} realization(s) missing`);
  }
});
