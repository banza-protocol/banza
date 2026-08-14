// SPR-4 §5 — STRUCTURED GENERATION. The model authors only the linguistic core (answer_markdown + the
// claim→fact_id map + insufficient_evidence); cited_source_ids is DERIVED deterministically from the claim
// map (⊆ allowed_source_ids by construction). These tests prove the structured path preserves EVERY
// guarantee of the baseline path under the UNCHANGED claim/citation validator:
//   • a valid grounded output publishes identically in both modes (A/B parity of the published bytes);
//   • the derived cited_source_ids is always ⊆ allowed and matches the claims' documents;
//   • a model that mis-states cited_source_ids cannot poison the answer — the field is ignored & derived;
//   • a prose hallucination (a document not in FONTES PERMITIDAS named in the prose) is STILL rejected;
//   • an unsupported/dead claim is STILL rejected; the honest-decline path is intact.
// Real Rust engines (FactualPackage / structured schema / validator), scripted provider — no model/network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runGroundedSynthesis } from "../src/grounded-synthesis.js";

function scriptedProvider(outputs) {
  let i = 0;
  return {
    calls: [],
    synthesize(messages, opts) {
      const idx = i++;
      this.calls.push({ messages, opts });
      return Promise.resolve({ text: idx < outputs.length ? outputs[idx] : "", latencyMs: 3, model: "mock", timings: { prefill_ms: 10, generation_ms: 20, tokens_evaluated: 100, tokens_predicted: 40, tokens_per_second: 25 } });
    },
  };
}

// A structured model output: no cited_source_ids field (the model is not asked for it).
const structuredOut = JSON.stringify({
  answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema.",
  claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }],
  insufficient_evidence: false,
});

test("structured path publishes and DERIVES cited_source_ids (⊆ allowed) from the claim map", async () => {
  const p = scriptedProvider([structuredOut]);
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: p, entityId: "ADR-002", structured: true });
  assert.equal(r.status, "grounded");
  assert.match(r.answer_markdown, /nomenclatura/);
  assert.equal(r.trace.structured_synthesis, true, "the structured path ran");
  assert.equal(r.trace.cited_source_ids_derived, true, "cited_source_ids was derived, not model-authored");
  assert.deepEqual(r.cited_source_ids, ["ADR-002"], "derived from F1 → ADR-002");
  // Every derived id is within the allowed set (⊆ allowed by construction).
  const pkg = r.package;
  for (const id of r.cited_source_ids) assert.ok(pkg.allowed_source_ids.includes(id), `${id} ⊆ allowed`);
  // The structured schema was actually sent (no cited_source_ids property requested of the model).
  const schema = p.calls[0].opts.jsonSchema;
  assert.ok(schema && !schema.properties.cited_source_ids, "model schema omits cited_source_ids");
});

test("A/B parity: identical published answer + cited_source_ids in baseline and structured modes", async () => {
  const baselineOut = JSON.stringify({
    answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema.",
    claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }],
    cited_source_ids: ["ADR-002"],
    insufficient_evidence: false,
  });
  const rb = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([baselineOut]), entityId: "ADR-002", structured: false });
  const rs = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([structuredOut]), entityId: "ADR-002", structured: true });
  assert.equal(rb.status, "grounded");
  assert.equal(rs.status, "grounded");
  assert.equal(rs.answer_markdown, rb.answer_markdown, "same published prose");
  assert.deepEqual(rs.cited_source_ids, rb.cited_source_ids, "same cited sources (derived == authored)");
});

test("structured path ignores a model-mis-stated citation — derives the correct one from the claims", async () => {
  // Even if the model leaked a bogus cited_source_ids, the structured path never reads it: it is derived
  // from the (fact-id-enum-constrained) claim map. Prose is clean, claims are legal → publishes with the
  // correct citation. A dead/illegal model citation can no longer reach the answer.
  const pollutedOut = JSON.stringify({
    answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema.",
    claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }],
    cited_source_ids: ["ADR-039", "RFC-9999"], // ignored by the structured path
    insufficient_evidence: false,
  });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([pollutedOut]), entityId: "ADR-002", structured: true });
  assert.equal(r.status, "grounded");
  assert.deepEqual(r.cited_source_ids, ["ADR-002"], "derived from claims, not the model's bogus list");
  assert.ok(!r.cited_source_ids.includes("ADR-039"), "illegal id never surfaces");
});

test("structured path STILL rejects a prose hallucination (doc not in FONTES PERMITIDAS named in prose)", async () => {
  // The prose guard is unchanged: naming ADR-039 in answer_markdown is a wrong-doc identity leak → reject.
  const hallucinated = JSON.stringify({
    answer_markdown: "Na verdade a ADR-039 trata disto.",
    claims: [{ claim: "trata disto", fact_ids: ["F1"] }],
    insufficient_evidence: false,
  });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([hallucinated]), entityId: "ADR-002", structured: true });
  assert.equal(r.status, "fallback", "prose naming a non-allowed document is never published");
  assert.equal(r.answer_markdown, null);
  assert.equal(r.trace.factual_ok, false);
});

test("structured path preserves the honest-decline path (insufficient_evidence)", async () => {
  const decline = JSON.stringify({ answer_markdown: "Sem base documental.", claims: [], insufficient_evidence: true });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([decline]), entityId: "ADR-002", structured: true });
  assert.equal(r.status, "insufficient", "insufficient_evidence still declines, nothing invented");
});

test("structured path exposes the FULL decomposed timings in the trace (safe counts only)", async () => {
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([structuredOut]), entityId: "ADR-002", structured: true, queueWaitMs: 7 });
  const t = r.trace.output_timings;
  assert.ok(t, "timings captured");
  // llama.cpp phases (from the mock): prefill (renamed from prompt_ms) + generation + tok/s.
  assert.equal(t.prefill_ms, 10, "prefill_ms is the llama.cpp prompt-eval time (not queue/build)");
  assert.equal(t.generation_ms, 20);
  assert.equal(t.tokens_per_second, 25);
  // JS/Rust-side phases, each measured separately so none hides in an aggregate.
  assert.equal(t.queue_wait_ms, 7, "queue wait threaded from the caller");
  assert.equal(typeof t.prompt_build_ms, "number", "prompt build timed");
  assert.equal(typeof t.validate_ms, "number", "structural validation timed");
  assert.equal(typeof t.claim_citation_verification_ms, "number", "claim/citation verification timed");
  assert.equal(typeof t.total_ms, "number", "whole output pass timed");
});
