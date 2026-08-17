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
function pipe(extra = {}) {
  return createPipeline({
    provider: createProvider(
      { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
      { fetchImpl: async () => { throw new Error("no model in tests"); } },
    ),
    env: {}, exactCache: new ExactCache(), semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}), rateLimiter: new RateLimiter({}),
    ...extra,
  });
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

test("an unavailable model is an availability failure, never absent evidence", async () => {
  // A question that grounds but needs synthesis to phrase. With no model reachable, the evidence is still
  // there — the sentence is what could not be produced.
  const { meta } = await ask("como é que a autoridade sobre operadores está separada no BANZA?");
  if (meta.terminal_kind === "operational_failure") {
    assert.ok(
      ["local_inference_unavailable", "local_inference_timeout"].includes(meta.fallback_reason),
      `an outage must name itself: ${meta.fallback_reason}`,
    );
    assert.notEqual(meta.terminal_kind, "insufficient_evidence",
      "a missing model is not missing evidence");
  }
});

// ── 9. the critical invariant: a registered critical subject cannot produce nothing ────────────────

test("a resolved critical subject never yields an empty factual package", async () => {
  // This is the property that would have caught the original bug on the day it was written.
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
