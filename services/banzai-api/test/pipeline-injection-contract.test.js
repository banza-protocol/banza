// The synthesis stub must be injected where the pipeline reads it, and a test that gets this wrong must
// fail rather than pass quietly.
//
// This was measured, not deduced: `createPipeline(firstObject, env, options)` reads
// `runGroundedSynthesisFn` from the THIRD positional argument. Sixteen test files passed it inside the
// first object, where it is ignored — so the real synthesis ran, the stub never did, and the tests were
// green while asserting things about a path they never exercised. One of them appeared to prove that a
// validator rejection was classified correctly when it had actually measured a model outage.
//
// Static detection of the mistake is unreliable, because a helper can construct the call in one place and
// name the property in another. So the contract is pinned behaviourally here, and `test/_pipeline-harness.mjs`
// gives tests a path that cannot get it wrong.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipeline } from "../src/pipeline.js";
import { harness, unreachableProvider } from "./_pipeline-harness.mjs";
import { ExactCache, SemanticCache } from "../src/cache.js";
import { BudgetTracker, RateLimiter } from "../src/limits.js";

// A question that genuinely reaches grounded synthesis — measured, not assumed.
const REACHES_SYNTHESIS = "explica a relação entre conformidade e federação no BANZA";

const stubResult = (args) => ({
  status: "grounded",
  answer_markdown: "STUB",
  cited_source_ids: [],
  package: (args && args.package) || { facts: [] },
  primary_intent: "explain_concept",
  clarification_candidates: [],
  trace: { synthesis_called: true, entry_status: "ok", output_status: "ok" },
});

test("a stub inside the first object is NEVER invoked — the inert-stub trap", async () => {
  let ran = 0;
  const p = createPipeline({
    provider: unreachableProvider(),
    env: {},
    exactCache: new ExactCache(),
    semanticCache: new SemanticCache(),
    budget: new BudgetTracker({}),
    rateLimiter: new RateLimiter({}),
    // The mistake, reproduced deliberately.
    runGroundedSynthesisFn: async (args) => { ran += 1; return stubResult(args); },
  });
  await p.answer(REACHES_SYNTHESIS, {});
  assert.equal(ran, 0,
    "if this ever becomes non-zero the injection convention changed — update the harness and this note");
});

test("a stub in the third positional argument IS invoked", async () => {
  const h = harness({ synthesis: stubResult });
  await h.pipeline.answer(REACHES_SYNTHESIS, {});
  h.assertSynthesisRan(assert);
  assert.equal(h.synthesisRuns.length, 1);
});

test("assertSynthesisRan fails when the stub was not reached", async () => {
  // A deterministic critical question answers before synthesis, so the stub must not run — and a test
  // that believed otherwise must be told.
  const h = harness({ synthesis: stubResult });
  await h.pipeline.answer("quem controla os operadores ?", {});
  assert.equal(h.synthesisRuns.length, 0, "a settled critical boundary must not reach synthesis");
  assert.throws(
    () => h.assertSynthesisRan(assert),
    /never invoked/,
    "the harness must refuse to let an unexercised stub pass as coverage",
  );
});
