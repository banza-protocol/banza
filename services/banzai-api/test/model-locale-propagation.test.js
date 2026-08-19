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

// ── THE BOUNDARY THE LOCALE WAS ACTUALLY LOST AT ──────────────────────────────────────────────────
//
// Everything above proves the BUILDERS honour a locale they are handed. That is not the same as proving
// the locale reaches them, and the difference is not academic: the first attempt at this change threaded
// the parameter into `runGroundedSynthesis` and stopped there. The prompt is built one function further
// in, in `runOutputPass`, so the value never arrived — 28 tests went red on an undefined variable, and
// had the parameter merely had a default instead, English would have quietly been answered in Portuguese
// with every check green.
//
// A mutation confirmed the gap: dropping `locale` at the `runOutputPass` call site left every property
// above passing. So the boundary itself is exercised here, with a provider that captures the prompt the
// model would actually have received.

import { _internal } from "../src/grounded-synthesis.js";

/** A provider that answers nothing and records the messages it was handed. */
function capturingProvider(sink) {
  return {
    async synthesize(messages) {
      sink.messages = messages;
      throw new Error("no model in tests — the prompt is what is under test");
    },
  };
}

async function promptThroughOutputPass(locale) {
  const sink = {};
  const pkg = realPackage(QUESTION);
  try {
    await _internal.runOutputPass(
      QUESTION,
      pkg,
      { provider: capturingProvider(sink), timeoutMs: 1000, signal: undefined, maxTokens: 256, model: "m", depth: "brief", taskQuestion: QUESTION, locale },
      {},
    );
  } catch {
    /* the provider always throws; the captured prompt is the evidence */
  }
  return sink.messages;
}

test("the locale survives the call into the function that builds the prompt", async () => {
  // ML2's owning assertion. Exercises runOutputPass, not the builder, so a locale dropped between the
  // pipeline and the prompt is observable rather than silently defaulted.
  const en = await promptThroughOutputPass("en");
  assert.ok(Array.isArray(en) && en.length >= 1, "the provider must have received messages to inspect");
  const system = String(en[0].content);
  assert.ok(system.length > 500, `captured prompt looks truncated (${system.length} chars)`);
  assert.match(
    system,
    /in English and objective/,
    "an English request reached the model under a Portuguese instruction — the locale was lost between " +
      "the pipeline and the prompt builder",
  );
  assert.doesNotMatch(system, /em português e objectiva/, "the Portuguese rule must not be active for en");
});

test("…and Portuguese still arrives as Portuguese through that same boundary", async () => {
  // Non-vacuity: a boundary that dropped BOTH locales would satisfy the assertion above only by luck.
  const pt = await promptThroughOutputPass("pt-PT");
  const system = String(pt[0].content);
  assert.match(system, /em português e objectiva/, "pt-PT must arrive as Portuguese");
  assert.doesNotMatch(system, /in English and objective/, "the English rule must not be active for pt-PT");
});

// ── THE WHOLE CHAIN, NOT ITS LINKS ────────────────────────────────────────────────────────────────
//
// The two tests above call `runOutputPass` directly, which proves that function honours a locale it is
// handed. It does NOT prove the locale ARRIVES there, and a mutation showed the difference matters:
// dropping `locale` at the `runGroundedSynthesis` → `runOutputPass` call site left every property in
// this file green. The suite failed elsewhere, so the loss was caught — but not by the property that
// owns locale, which is the one that would have to say WHY.
//
// This exercises the public entry point instead, so the boundary that actually lost the locale in the
// first implementation is inside the chain under test rather than beside it.

import { runGroundedSynthesis } from "../src/grounded-synthesis.js";

/** Run the real synthesis entry point with a provider that captures the prompt and then declines. */
const GROUNDED_QUESTION = "o que decidiu a ADR-001?";

async function promptThroughPublicEntry(locale) {
  const sink = {};
  await runGroundedSynthesis(GROUNDED_QUESTION, {
    provider: capturingProvider(sink),
    traceId: "trace-locale-e2e",
    timeoutMs: 1000,
    depth: "brief",
    model: "m",
    taskQuestion: GROUNDED_QUESTION,
    locale,
  }).catch(() => {});
  return sink.messages;
}

test("the locale reaches the prompt through the PUBLIC synthesis entry point", async () => {
  // ML2's owning assertion. If any boundary between here and the builder drops the value — or quietly
  // substitutes a default for it — the English request arrives under a Portuguese instruction and this
  // is the assertion that says so.
  const messages = await promptThroughPublicEntry("en");
  assert.ok(
    Array.isArray(messages) && messages.length >= 1,
    "the prompt never reached the provider. Either the resolved locale did not survive the chain — " +
      "with no internal defaults left to absorb it, a lost locale makes the strict builder refuse and " +
      "no prompt is produced — or the witness question stopped grounding and short-circuited as " +
      "`insufficient` before the model. Check the locale first: that is the failure this owns.",
  );
  const system = String(messages[0].content);
  assert.ok(system.length > 500, `captured prompt looks truncated (${system.length} chars)`);
  assert.match(
    system,
    /in English and objective/,
    "an English request reached the model under a Portuguese instruction — the resolved locale was " +
      "lost or defaulted somewhere between the synthesis entry point and the prompt builder",
  );
  assert.doesNotMatch(system, /em português e objectiva/, "the Portuguese rule must not be active for en");
});

test("…and Portuguese reaches it as Portuguese through that same entry point", async () => {
  // Non-vacuity: a chain that dropped BOTH locales would satisfy the assertion above by accident.
  const messages = await promptThroughPublicEntry("pt-PT");
  const system = String(messages[0].content);
  assert.match(system, /em português e objectiva/, "pt-PT must arrive as Portuguese");
  assert.doesNotMatch(system, /in English and objective/, "the English rule must not be active for pt-PT");
});
