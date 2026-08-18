// A pipeline for tests whose injected synthesis stub is PROVEN to run.
//
// `createPipeline(firstObject, env, options)` reads `runGroundedSynthesisFn` from its THIRD positional
// argument. Passing it inside the first object does nothing — silently. Sixteen test files did that, and
// the effect is worse than a broken test: the stub never runs, the real synthesis path executes instead,
// and the test passes while claiming to exercise something it never touched. That is how a
// validator-rejection test ended up measuring a model outage.
//
// Static detection of the mistake is unreliable — a helper can build the call in one place and name the
// property in another — so the protection here is behavioural: `assertSynthesisRan()` fails when the stub
// was never invoked. A test that means to exercise synthesis calls it and finds out.

import { createPipeline } from "../src/pipeline.js";
import { createProvider } from "../src/provider.js";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

/**
 * A supported, open-ended question that legitimately requires grounded synthesis.
 *
 * Tests of the synthesis MECHANISM — cache, budget, post-validation, usage counters, emergency
 * degradation — need a query that reaches the trunk. Seventeen call sites used "O que é BANZA?" for that,
 * which worked only because the most basic question the engine answers happened to be model-backed. That
 * is an accident, not a precondition: the moment BANZA identity becomes stable deterministic knowledge —
 * which is what it should be — every one of those tests loses the path it was written to exercise, and
 * they fail for a reason that has nothing to do with what they assert.
 *
 * So the fixture is requested by ROLE. It has admissible evidence, is not registered deterministic-critical,
 * is not a negative control, and states no institutional authority fact — it explains a relationship, which
 * is what grounded synthesis is for.
 */
export const SUPPORTED_SYNTHESIS_QUERY =
  "explica a relação entre conformidade e federação no BANZA";

/** A provider whose model is unreachable: deterministic answers must still work. */
export function unreachableProvider() {
  return createProvider(
    { LLM_PROVIDER: "local_qwen", LLM_BASE_URL: "http://127.0.0.1:1" },
    { fetchImpl: async () => { throw new Error("no model in tests"); } },
  );
}

/**
 * Build a pipeline, optionally with a synthesis stub that is injected where the pipeline actually reads
 * it. Returns `{ pipeline, synthesisRuns, assertSynthesisRan }`.
 *
 * The stub may only replace TOKEN GENERATION. It must never decide whether the answer grounds: a stub
 * that grounds unconditionally hides exactly the class of bug this engine has been hardened against.
 */
export function harness({ synthesis = null, caches = null, provider = null } = {}) {
  const first = {
    provider: provider || unreachableProvider(),
    env: {},
    exactCache: (caches && caches.exact) || new ExactCache(),
    semanticCache: (caches && caches.semantic) || new SemanticCache(),
    budget: new BudgetTracker({}),
    rateLimiter: new RateLimiter({}),
  };

  const synthesisRuns = [];
  const options = {};
  if (synthesis) {
    options.runGroundedSynthesisFn = async (args) => {
      synthesisRuns.push(args || {});
      return synthesis(args);
    };
  }

  return {
    pipeline: createPipeline(first, {}, options),
    caches: { exact: first.exactCache, semantic: first.semanticCache },
    synthesisRuns,
    /** Fails when an injected stub was never reached — the inert-stub failure, made loud. */
    assertSynthesisRan(assert, why = "the injected synthesis stub was never invoked") {
      assert.ok(synthesis, "assertSynthesisRan is meaningless without a stub");
      assert.ok(
        synthesisRuns.length > 0,
        `${why}. Either the question does not reach synthesis, or the stub was injected where the` +
          " pipeline does not read it (it is the THIRD positional argument of createPipeline).",
      );
    },
  };
}
