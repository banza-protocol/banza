// M2.18B.6 — Rust-First SINGLE-PASS grounded runtime. Rust resolves intent+entity deterministically (no
// model); the model is called EXACTLY ONCE for the grounded output synthesis, then Rust validates. A
// scripted mock provider returns the single output-pass JSON; intent/entity come from the real Rust
// resolver, so the full flow (resolve_intent → FactualPackage → output → factual validation) is exercised
// with no real model. Boundary is cleared upstream by the router.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runGroundedSynthesis } from "../src/grounded-synthesis.js";

// A provider whose synthesize() replays a scripted list of raw model outputs, one per call, and counts
// calls — so a test can assert EXACTLY ONE model call per explanation (single grounded synthesis).
function scriptedProvider(outputs) {
  let i = 0;
  return {
    calls: [],
    synthesize(messages, opts) {
      const idx = i++;
      this.calls.push({ messages, opts });
      const text = idx < outputs.length ? outputs[idx] : "";
      return Promise.resolve({ text, latencyMs: 5, model: "mock-single" });
    },
  };
}

const groundedOutput = (answer, claims, cites) =>
  JSON.stringify({ answer_markdown: answer, claims, cited_source_ids: cites, insufficient_evidence: false });

test("grounded happy path: Rust resolves the entity, the ONE model call synthesises, validator passes", async () => {
  const output = groundedOutput(
    "A ADR-002 inverte a nomenclatura do ecossistema de forma canónica e permanente.",
    [{ claim: "inverte a nomenclatura do ecossistema", fact_ids: ["F1"] }],
    ["ADR-002"]
  );
  const provider = scriptedProvider([output]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider, traceId: "t1", entityId: "ADR-002" });
  assert.equal(r.status, "grounded");
  assert.match(r.answer_markdown, /nomenclatura/);
  assert.deepEqual(r.cited_source_ids, ["ADR-002"]);
  assert.equal(r.trace.output_status, "ok");
  assert.equal(r.trace.factual_ok, true);
  assert.equal(r.trace.resolved_entity_id, "ADR-002");
  assert.ok(r.trace.facts_count > 0);
  assert.equal(provider.calls.length, 1, "EXACTLY ONE model call — single pass, no input pass");
});

test("output-pass hallucination is rejected by the factual validator → fallback, never published", async () => {
  // A claim citing a source outside the FactualPackage's allowed set → validator rejects → fallback.
  const output = groundedOutput("A ADR-002 aprova operadores certificados (ADR-999).",
    [{ claim: "aprova operadores certificados", fact_ids: ["F1"] }], ["ADR-999"]);
  const provider = scriptedProvider([output]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider, traceId: "t2", entityId: "ADR-002" });
  assert.equal(r.status, "fallback");
  assert.equal(r.answer_markdown, null);
  assert.equal(r.trace.output_status, "rejected");
  assert.equal(provider.calls.length, 1);
});

test("honest insufficient_evidence output → insufficient status, nothing invented", async () => {
  const output = JSON.stringify({ answer_markdown: "", claims: [], cited_source_ids: [], insufficient_evidence: true });
  const provider = scriptedProvider([output]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider, traceId: "t3", entityId: "ADR-002" });
  assert.equal(r.status, "insufficient");
  assert.equal(provider.calls.length, 1);
});

test("malformed output JSON → fallback, output_status invalid, one model call", async () => {
  const provider = scriptedProvider(["not json at all"]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider, traceId: "t4", entityId: "ADR-002" });
  assert.equal(r.status, "fallback");
  assert.equal(r.trace.output_status, "invalid");
  assert.equal(provider.calls.length, 1);
});

test("empty answer_markdown but valid claims → composed deterministically from validated claims, grounded", async () => {
  const output = JSON.stringify({
    answer_markdown: "",
    claims: [{ claim: "A ADR-002 inverte a nomenclatura do ecossistema", fact_ids: ["F1"] }],
    cited_source_ids: ["ADR-002"],
    insufficient_evidence: false,
  });
  const provider = scriptedProvider([output]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider, traceId: "t5", entityId: "ADR-002" });
  assert.equal(r.status, "grounded");
  assert.match(r.answer_markdown, /nomenclatura/);
  assert.equal(r.trace.answer_composed_from_claims, true);
  assert.equal(provider.calls.length, 1);
});

test("no provider → fallback with no model call (fail-closed)", async () => {
  const r = await runGroundedSynthesis("explica a ADR-002", { traceId: "t6", entityId: "ADR-002" });
  assert.equal(r.status, "fallback");
});
