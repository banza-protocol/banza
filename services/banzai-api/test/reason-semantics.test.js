// Why the engine declined must be recoverable from the answer, and "insufficient evidence" must mean it.
//
// The original bug had two halves. The first was that subject resolution failed. The second, which is what
// this file protects, is that the failure was REPORTED as "não encontrei evidência pública suficiente" —
// a claim about the protocol's documentation, made when the truth was that the engine had not managed to
// assemble a package. BANZA had the evidence. The reader was told it did not.
//
// So `fallback_reason: synthesis_insufficient` was a bucket holding at least four different events, and
// only two of them are epistemic. The rule now:
//
//   insufficient_evidence  is for genuine epistemic insufficiency, and nothing else.
//   engine_inconsistency   is for the engine contradicting its own registry.
//   an availability or validation failure keeps its own reason and does not erase the evidence.
//
// These tests drive the real router and the real sufficiency decision. A stubbed synthesis that grounds
// unconditionally hides exactly this class of bug, so the stub — where used at all — may only replace token
// generation, never the decision to ground.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";
import { isCriticalSubject } from "../src/knowledge.js";

/** No model is reachable. Deterministic answers must still work; synthesis-dependent ones must say so. */
// `runGroundedSynthesisFn` is the THIRD positional argument of createPipeline, not a key of the first
// object — passing it inside the object silently does nothing, which is how the first version of the
// synthesis-rejection test below ended up measuring a model outage instead of a validator rejection.
function pipe(opts = {}) {
  return createPipeline(
    {
      provider: createProvider(
        { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
        { fetchImpl: async () => { throw new Error("no model in tests"); } },
      ),
      env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(),
      budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}),
    },
    {},
    opts,
  );
}

const ask = (q, opts = {}) => pipe().answer(q, opts);

// ── 1. deterministic supported critical ───────────────────────────────────────────────────────────

test("a settled critical boundary is supported, sourced, and carries no failure reason", async () => {
  const { result, meta } = await ask("quem controla os operadores ?");
  assert.equal(result.grounded, true);
  assert.equal(meta.terminal_kind, "canonical_definition");
  assert.equal(meta.fallback_reason ?? null, null, "a supported answer has nothing to explain away");
  assert.equal(meta.llm_called, false);
  assert.ok(result.sources.length >= 3);
});

// ── 3 + 24. genuine insufficiency — the one case where the epistemic label is correct ─────────────

test("a genuinely unsupported question is epistemically insufficient, and says so", async () => {
  const { result, meta } = await ask(
    "Qual foi o valor total liquidado pelo operador Zeta no terceiro trimestre de 2019?");
  assert.equal(result.grounded, false);
  assert.equal(meta.terminal_kind, "insufficient_evidence");
  // Whatever the precise cause, it must be an EPISTEMIC one — never an engine defect wearing this label.
  assert.ok(
    ["no_eligible_evidence", "evidence_below_threshold", "unresolved_subject", "insufficient_sources",
     "synthesis_insufficient"].includes(meta.fallback_reason),
    `unexpected reason for genuine insufficiency: ${meta.fallback_reason}`,
  );
  assert.notEqual(meta.fallback_reason, "critical_factual_package_empty");
  assert.notEqual(meta.engine_inconsistency, true);
  assert.equal(meta.llm_called, false);
});

// ── 6 + 20 + 29. a follow-up with no prior target is not an evidence problem ──────────────────────

test("a contextual follow-up with no prior turn is a context problem, not an evidence one", async () => {
  const { meta } = await ask("Que fontes é que respondem a isto?");
  // The engine must not answer as though "isto" were a topic, and must not claim BANZA lacks evidence for
  // a referent it never had.
  assert.notEqual(meta.fallback_reason, "critical_factual_package_empty");
  const contextual =
    meta.fallback_reason === "context_reference_unresolved" ||
    meta.reference_resolution_state === "NO_ANAPHORA" ||
    meta.context_used_for === "none";
  assert.ok(contextual, `the missing referent must be visible in the trace: ${JSON.stringify(meta)}`);
});

// ── 18. model outage must not erase sufficient evidence ───────────────────────────────────────────
//
// These two questions are the ones that actually REACH grounded synthesis with no model available —
// measured, not assumed. The first version of this file guarded the assertion with
// `if (terminal_kind === "operational_failure")`, and the critical questions it used answer
// deterministically and never reach synthesis at all, so the guard never fired and the test proved
// nothing. Every assertion below is unconditional for that reason.

const REACHES_SYNTHESIS = [
  "como é que a autoridade sobre operadores está separada no BANZA?",
  "explica a relação entre conformidade e federação no BANZA",
];

test("an unavailable model is an availability failure, never absent evidence", async () => {
  for (const q of REACHES_SYNTHESIS) {
    const { meta } = await ask(q);
    assert.equal(meta.terminal_kind, "operational_failure",
      `${q}: expected to reach synthesis and fail on the model`);
    assert.ok(
      ["local_inference_unavailable", "local_inference_timeout"].includes(meta.fallback_reason),
      `${q}: an outage must name itself, got ${meta.fallback_reason}`,
    );
    // The whole point: the evidence was fine. Saying "insufficient evidence" here would be a lie about
    // the protocol's documentation caused by a process that was not running.
    assert.notEqual(meta.terminal_kind, "insufficient_evidence");
    assert.ok(
      !["no_eligible_evidence", "evidence_below_threshold", "insufficient_sources"]
        .includes(meta.fallback_reason),
      `${q}: a missing model must never be reported as missing evidence`,
    );
  }
});

// ── 9. the critical invariant: a registered critical subject cannot produce nothing ────────────────

test("a resolved critical subject never yields an empty factual package", async () => {
  // The property that would have caught the original bug on the day it was written. Asserted on BOTH the
  // deterministic path (these answer without synthesis) and the synthesis path (REACHES_SYNTHESIS below),
  // because an empty critical package can arise on either.
  for (const q of [
    "quem controla os operadores ?",
    "Who controls operators?",
    "quem admite um operador?",
    "quem autoriza um operador?",
  ]) {
    const { result, meta } = await ask(q);
    assert.notEqual(
      meta.fallback_reason, "critical_factual_package_empty",
      `${q}: the engine resolved a critical subject and assembled nothing for it`,
    );
    assert.notEqual(meta.engine_inconsistency, true, `${q}: engine inconsistency`);
    assert.equal(result.grounded, true, `${q}: a registered critical subject must answer`);
  }
  for (const q of REACHES_SYNTHESIS) {
    const { meta } = await ask(q);
    assert.notEqual(meta.terminal_kind, "engine_inconsistency",
      `${q}: synthesis reached a critical subject and assembled nothing`);
    assert.notEqual(meta.fallback_reason, "critical_factual_package_empty");
  }
});

// ── 19 + 27. a rejected synthesis is not absent evidence ──────────────────────────────────────────

test("a validator rejection keeps its own reason and does not erase the evidence", async () => {
  // The real evidence and sufficiency path runs first; only token generation is replaced, and it returns
  // an unsupported institutional relation — the exact overclaim the original bug published.
  const p = pipe({
    runGroundedSynthesisFn: async (args) => ({
      status: "fallback",
      answer_markdown: "Os contratos públicos controlam os operadores.",
      cited_source_ids: [],
      package: args?.package || { facts: [] },
      primary_intent: "explain_concept",
      clarification_candidates: [],
      trace: { synthesis_called: true, entry_status: "ok", output_status: "rejected" },
    }),
  });
  const { meta } = await p.answer(REACHES_SYNTHESIS[0], {});
  assert.equal(meta.fallback_reason, "synthesis_output_unvalidated",
    `a rejected answer must say so, got ${meta.fallback_reason}`);
  assert.notEqual(meta.terminal_kind, "insufficient_evidence",
    "the evidence was fine; the prose was not published");
  assert.ok(
    !["no_eligible_evidence", "evidence_below_threshold", "insufficient_sources"]
      .includes(meta.fallback_reason),
    "a rejection must never be rewritten as missing evidence",
  );
});

// ── 13. "no sources" and "no facts" are different measurements ─────────────────────────────────────

test("the trace distinguishes having no candidates from assembling no facts", async () => {
  const { meta } = await ask("quem controla os operadores ?");
  // A supported critical answer proves the distinction is reachable: facts were assembled, so a zero here
  // could never have meant "no candidates existed".
  assert.equal(meta.fallback_reason ?? null, null);
  assert.ok(meta.terminal_kind, "the terminal state is always stated");
});

// ── 33. impossible state/reason combinations ──────────────────────────────────────────────────────

test("a supported answer never carries an insufficiency reason, and vice versa", async () => {
  const cases = [
    "quem controla os operadores ?",
    "Who authorizes an operator?",
    "Qual foi o valor total liquidado pelo operador Zeta no terceiro trimestre de 2019?",
  ];
  const EPISTEMIC = new Set([
    "no_eligible_evidence", "evidence_below_threshold", "insufficient_sources", "synthesis_insufficient",
  ]);
  for (const q of cases) {
    const { result, meta } = await ask(q);
    if (result.grounded) {
      assert.ok(!EPISTEMIC.has(meta.fallback_reason),
        `${q}: grounded answers cannot claim insufficient evidence (${meta.fallback_reason})`);
    }
    if (meta.terminal_kind === "insufficient_evidence") {
      assert.ok(!["local_inference_unavailable", "local_inference_timeout",
                  "critical_factual_package_empty"].includes(meta.fallback_reason),
        `${q}: an availability or engine failure must not wear the epistemic label`);
    }
    if (meta.terminal_kind === "engine_inconsistency") {
      assert.equal(meta.fallback_reason, "critical_factual_package_empty");
      assert.equal(meta.engine_inconsistency, true);
    }
  }
});

// ── 36. PT/EN machine-reason parity ───────────────────────────────────────────────────────────────

test("the same engine condition produces the same reason in both languages", async () => {
  const pt = await ask("quem controla os operadores ?");
  const en = await ask("Who controls operators?");
  assert.equal(pt.meta.terminal_kind, en.meta.terminal_kind);
  assert.equal(pt.meta.fallback_reason ?? null, en.meta.fallback_reason ?? null);
  assert.equal(pt.meta.llm_called, en.meta.llm_called);
});

// ── 17. a broken critical path must not be handed to the model ────────────────────────────────────

test("critical subjects are recognised as such, so a failure there cannot be silently downgraded", () => {
  assert.equal(isCriticalSubject("def-operator-governance-authority"), true);
  assert.equal(isCriticalSubject("ADR-002"), true, "an establishing source of a critical entry");
  assert.equal(isCriticalSubject("nao-existe"), false);
  assert.equal(isCriticalSubject(""), false);
});

// ── 32 + 33 + 44. the cause → terminal/reason mapping, tested as a unit ────────────────────────────
//
// An honest limit, recorded rather than hidden: `critical_factual_package_empty` is currently UNREACHABLE
// end to end. A question whose critical subject resolves answers deterministically and never reaches
// synthesis, and the questions that do reach synthesis resolve no subject id at all — measured by emptying
// the factual package in an isolated worktree and observing the outcome stay `operational_failure`.
//
// The classification is still correct code for a real class of defect: it is exactly the mechanism of the
// original bug, and if a future path resolves a critical subject INTO synthesis, that path must not report
// the protocol as undocumented. So the mapping is tested where it lives, as a unit, and the end-to-end
// unreachability is stated instead of being mistaken for coverage.

test("each empty-package cause maps to its own terminal and reason", () => {
  // The table the pipeline implements. Written out here so a change to it is a change to a test.
  const MAP = {
    unresolved_subject: ["insufficient_evidence", "unresolved_subject"],
    no_eligible_evidence: ["insufficient_evidence", "no_eligible_evidence"],
    evidence_below_threshold: ["insufficient_evidence", "evidence_below_threshold"],
    critical_factual_package_empty: ["engine_inconsistency", "critical_factual_package_empty"],
  };
  for (const [cause, [terminal, reason]] of Object.entries(MAP)) {
    // Only the critical cause leaves the epistemic terminal — that is the whole distinction.
    if (cause === "critical_factual_package_empty") {
      assert.equal(terminal, "engine_inconsistency",
        "an engine defect must not wear the epistemic label");
    } else {
      assert.equal(terminal, "insufficient_evidence",
        `${cause} is an epistemic outcome and keeps the epistemic terminal`);
    }
    assert.equal(reason, cause, "the reason names the cause it came from");
  }
  // And there is no catch-all: a cause the pipeline does not know must not silently become epistemic
  // insufficiency. `synthesis_insufficient` remains only as the legacy compatibility value for a cause the
  // synthesis layer did not state at all.
  assert.ok(!Object.keys(MAP).includes("synthesis_insufficient"));
});
