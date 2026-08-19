// The reader's language must survive the trip to the model.
//
// Every other terminal is composed in JavaScript, so its locale is decided where the request is read.
// The explanatory trunk is different: a model writes it, and what language it writes in is decided by a
// sentence inside the PROMPT — which is built in Rust. The resolved locale never travelled there. It was
// lost at the API boundary, and the prompt said "Responde em português (se a pergunta o for)": the model
// was told to infer the language from the question text, which is a SECOND language decision, taken by a
// component that cannot see what the caller asked for.
//
// So an explicit `locale: "en"` request reached a prompt instructing Portuguese, and nothing could
// observe the disagreement — the request said English, the prompt said Portuguese, and the metadata said
// whatever it liked.
//
// WHAT THIS FILE PROVES, AND WHAT IT DOES NOT. It proves the chain: resolved locale → the prompt's
// output-language rule. That is a propagation property. It does NOT prove every generated token is in
// that language — no property can, short of the model itself — and `answer_locale` is therefore read as
// "this was COMPOSED under the English contract", never as "this text is English".

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildFactualPackagePlanned, buildOutputPrompt, buildOutputPromptStructured } from "../src/knowledge.js";

const kb = createRequire(import.meta.url)("../src/rustkb/banzai_api_kb.js");

/**
 * A REAL package from the engine.
 *
 * Hand-rolling this JSON is a trap that already caught me: `FactualPackage` requires fields like
 * `version` and `trace_id`, the WASM export answers `{"error":"bad package: …"}`, and the JS wrapper
 * turns that into `null`. Every assertion about "the prompt" then passes against nothing at all.
 */
function realPackage(question) {
  const pkg = buildFactualPackagePlanned("trace-locale-test", question, "", "brief");
  assert.ok(pkg, "the engine must build a real factual package — otherwise every prompt here is null");
  return pkg;
}

const QUESTION = "o que é o BANZA?";

/** The clause the locale controls, extracted from the built prompt. */
function languageRule(prompt) {
  assert.ok(prompt && typeof prompt.system === "string", "the builder must return a real prompt");
  const m = prompt.system.match(/em prosa \(NUNCA vazio\), ([^,]+),/);
  assert.ok(m, `the prompt must carry an output-language rule:\n${String(prompt.system).slice(0, 400)}`);
  return m[1].trim();
}

test("the witness package and prompt are real, else every property here is vacuous", () => {
  const pkg = realPackage(QUESTION);
  const p = buildOutputPrompt(QUESTION, pkg, "brief", "pt-PT");
  assert.ok(p, "buildOutputPrompt returned null — the package was rejected and nothing is under test");
  assert.ok(p.system.length > 500, `prompt looks truncated (${p.system.length} chars)`);
  assert.ok(p.user.includes("PERGUNTA"), "the prompt must actually carry the question section");
});

// ── PROPAGATION ───────────────────────────────────────────────────────────────────────────────────

test("a Portuguese locale produces a Portuguese output-language rule", () => {
  const pkg = realPackage(QUESTION);
  for (const build of [buildOutputPrompt, buildOutputPromptStructured]) {
    const rule = languageRule(build(QUESTION, pkg, "brief", "pt-PT"));
    assert.match(rule, /português/, `pt-PT must instruct Portuguese, got "${rule}"`);
    assert.doesNotMatch(rule, /English/, `pt-PT must not instruct English, got "${rule}"`);
  }
});

test("an English locale produces an English output-language rule", () => {
  // The direct regression for the measured defect.
  const pkg = realPackage(QUESTION);
  for (const build of [buildOutputPrompt, buildOutputPromptStructured]) {
    const rule = languageRule(build(QUESTION, pkg, "brief", "en"));
    assert.match(rule, /English/, `en must instruct English, got "${rule}"`);
    assert.doesNotMatch(rule, /português/, `en must not instruct Portuguese, got "${rule}"`);
  }
});

test("the SAME question in two locales yields two different language rules", () => {
  // The strongest statement of the property: the question text is identical and Portuguese, so anything
  // that still reads the question to pick a language cannot pass this.
  const pkg = realPackage(QUESTION);
  const pt = languageRule(buildOutputPrompt(QUESTION, pkg, "brief", "pt-PT"));
  const en = languageRule(buildOutputPrompt(QUESTION, pkg, "brief", "en"));
  assert.notEqual(pt, en, "one Portuguese question produced the same rule for both locales");
});

test("no prompt asks the model to infer the language from the question", () => {
  // The retired clause. It is the mechanism by which the locale could be silently overridden downstream
  // of every check, so its absence is asserted rather than assumed.
  const pkg = realPackage(QUESTION);
  for (const loc of ["pt-PT", "en"]) {
    const p = buildOutputPrompt(QUESTION, pkg, "brief", loc);
    assert.doesNotMatch(
      p.system,
      /se a pergunta o for|na língua da pergunta|language of the question/i,
      `${loc}: the prompt still delegates the language decision to the question text`,
    );
  }
});

// ── FAIL CLOSED ───────────────────────────────────────────────────────────────────────────────────

test("an unsupported locale is refused by the engine, not silently answered in Portuguese", () => {
  // Defaulting belongs to exactly ONE place — the API boundary, which records `legacy-default` as its
  // reason. A second silent default here would let an invalid locale reach a model prompt and come back
  // in Portuguese as though it had been asked for.
  const pkg = realPackage(QUESTION);
  for (const bad of ["fr", "en-US", "pt", "", "PT-PT"]) {
    const raw = kb.build_output_prompt_json(QUESTION, JSON.stringify(pkg), "brief", bad);
    const out = JSON.parse(raw);
    assert.ok(
      out.error && /unsupported locale/.test(out.error),
      `locale "${bad}" must be refused, got ${JSON.stringify(out).slice(0, 120)}`,
    );
  }
});

test("both supported locales are accepted by that same strict parser", () => {
  // Non-vacuity for the test above: a parser that refused EVERYTHING would pass it.
  const pkg = realPackage(QUESTION);
  for (const good of ["pt-PT", "en"]) {
    const out = JSON.parse(kb.build_output_prompt_json(QUESTION, JSON.stringify(pkg), "brief", good));
    assert.ok(!out.error, `locale "${good}" must be accepted, got ${out.error}`);
    assert.ok(out.system, `locale "${good}" must produce a prompt`);
  }
});
