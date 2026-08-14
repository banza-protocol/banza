// M2.18B.1 — reasoning-trace observability contract. Proves the public trace is present on every path,
// carries the fields the eval harness needs, buckets confidence to a band, and NEVER leaks the prompt,
// raw model output, exact numeric confidence, retrieval scores or internal paths (PART 4/5/6/26).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReasoningTrace, confidenceBand, PUBLIC_TRACE_KEYS } from "../src/reasoningTrace.js";
import { createPipeline } from "../src/pipeline.js";

// controllable fake provider (same shape as the M2.18B test)
function fakeProvider(queue) {
  return {
    name: "local_qwen",
    inferenceLocation: "local",
    get externalCallsMade() { return 0; },
    get localCallsMade() { return 0; },
    async synthesize() {
      const n = queue.shift();
      if (n && n.throw) throw new Error("unreachable");
      return { text: (n && n.text) || "", latencyMs: 4, model: "qwen2.5-7b" };
    },
    async answer(_q, opts = {}) {
      const g = opts.context || {};
      return { grounded: true, answer: "Resposta ancorada.", sources: g.sources || [], entry_id: g.entry_id || null, provider: "local_qwen", mode: "real", inference_location: "local", model_called: true, guardrails: {} };
    },
  };
}
test("confidenceBand buckets and never leaks the number", () => {
  assert.equal(confidenceBand(0.9), "high");
  assert.equal(confidenceBand(0.5), "medium");
  assert.equal(confidenceBand(0.1), "low");
  assert.equal(confidenceBand(undefined), "unavailable");
  assert.equal(confidenceBand("0.9"), "unavailable");
});

test("public trace exposes only the allowlisted keys (no prompt/raw/numeric-confidence/paths)", () => {
  const t = buildReasoningTrace(
    { synthesis_called: true, synthesis_status: "ok", confidence: 0.82, routing_result: "resolved_document", resolved_document_id: "ADR-002", synthesis_model: "qwen2.5-7b" },
    { inference_location: "local" },
    "req-1",
    false,
  );
  assert.deepEqual(Object.keys(t).sort(), [...PUBLIC_TRACE_KEYS].sort());
  assert.equal(t.confidence_band, "high");
  assert.ok(!("confidence" in t), "must not expose numeric confidence");
  const blob = JSON.stringify(t).toLowerCase();
  for (const forbidden of ["prompt", "system", "raw", "you are", "<pergunta>", "content"]) {
    assert.ok(!blob.includes(forbidden), `trace must not contain ${forbidden}`);
  }
});

test("boundary_detected is true on the deterministic spine (meta.intent), not only interpreter routing", () => {
  // deterministic financial-action refusal (flag OFF) signals via meta.intent, no routing_result
  const fin = buildReasoningTrace({ intent: "action_boundary" }, {}, "r");
  assert.equal(fin.boundary_detected, true);
  // safety refusal
  const safe = buildReasoningTrace({ intent: "safety_refusal" }, {}, "r");
  assert.equal(safe.boundary_detected, true);
  // interpreter routing path
  const routed = buildReasoningTrace({ routing_result: "boundary" }, {}, "r");
  assert.equal(routed.boundary_detected, true);
  // a normal grounded answer is NOT a boundary
  const ok = buildReasoningTrace({ intent: "grounded" }, {}, "r");
  assert.equal(ok.boundary_detected, false);
});

test("diagnostic mode adds a safe extra block only when enabled", () => {
  const norm = buildReasoningTrace({}, {}, "r", false);
  assert.ok(!("diagnostic" in norm));
  const diag = buildReasoningTrace({ confidence: 0.3, resolver_result: "ADR-002", fallback_reason: "x" }, {}, "r", true);
  assert.ok(diag.diagnostic && typeof diag.diagnostic === "object");
  assert.equal(diag.diagnostic.confidence_present, true);
});

test("trace is present + correct on every routing path (via the pipeline meta)", async () => {
  // M2.18B.6 — the single router: terminals (fast-path, no model) and the ONE grounded synthesis. Rust
  // understands every question; the model runs only for a grounded explanation, so synthesis_called is
  // false on terminals and true on the trunk. The public trace stays present + correct on every path.
  const OFF = { LLM_PROVIDER: "local_qwen" };
  const groundedTrunk = async () => ({
    status: "grounded",
    answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema (ADR-002).",
    cited_source_ids: ["ADR-002"],
    package: { facts: [{ id: "F1", source: { document_id: "ADR-002", title: "ADR-002", path: "decisions/adr/ADR-002-ecosystem-naming-banza-banzai-and-operators.md" } }] },
    primary_intent: "explain_document",
    trace: { synthesis_called: true, resolution_method: "rust_deterministic", output_status: "ok", model: "qwen2.5-7b", factual_ok: true },
  });
  // an exact document lookup → an exact-fact terminal (fast-path, no model), source-bound
  {
    const { meta } = await createPipeline(fakeProvider([]), OFF).answer("qual é o estado da ADR-002?");
    const t = buildReasoningTrace(meta, {}, "r");
    assert.equal(t.synthesis_called, false);
    assert.equal(t.resolution_method, "rust_deterministic");
    assert.equal(t.fast_path_used, true);
    assert.equal(t.resolved_canonical_id, "ADR-002");
  }
  // a genuine explanation → the single grounded synthesis (one model call)
  {
    const { meta } = await createPipeline(fakeProvider([]), OFF, { runGroundedSynthesisFn: groundedTrunk }).answer("explica o ADR-002");
    const t = buildReasoningTrace(meta, {}, "r");
    assert.equal(t.synthesis_called, true, "the trunk runs the single grounded synthesis");
    assert.equal(t.fast_path_used, false, "the trunk is not a fast-path terminal");
    assert.equal(t.routing_result, "synthesis_grounded");
  }
  // deterministic financial-action boundary → boundary_detected must be observable
  {
    const { result, meta } = await createPipeline(fakeProvider([]), OFF).answer("transfere 100 kz");
    const t = buildReasoningTrace(meta, result, "r");
    assert.equal(t.synthesis_called, false);
    assert.equal(t.boundary_detected, true, "deterministic financial boundary must be observable");
  }
});
