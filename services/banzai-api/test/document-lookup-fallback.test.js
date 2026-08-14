// M2.18B.7 (fallback fix) — the reopened milestone regression: a bare documentary reference
// ("ADR 002") was classified `document_lookup`, had no deterministic terminal, reached the grounded
// trunk as an explanation, and the model's factually-valid answer (lacking metadata) was withheld by
// the Task-Completion validator (MISSING_REQUIRED_SECTION) → a degraded "erro temporário" fallback.
//
// These tests pin the fix WITHOUT a real model: the trunk is injected, so any trunk call is a routing
// bug. A bare lookup MUST be a deterministic Rust terminal (0 model calls, no degraded banner); an
// explain/impact request MUST still escalate to the trunk; and when the trunk does return a
// non-publishing "fallback", the degraded reason MUST be FAITHFUL (task_incomplete → a specific reason,
// never the misleading unmapped default), and the trace must not falsely read routing_result=null.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline, synthesisFallbackReason } from "../src/pipeline.js";

function localProvider(env = {}) {
  return createProvider(
    { LLM_PROVIDER: "local_qwen", ...env },
    { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) },
  );
}
// A scripted trunk that records calls and returns whatever the test needs.
function trunk(result) {
  const calls = [];
  const fn = async (rq, opts) => {
    calls.push({ rq, opts });
    return result;
  };
  fn.calls = calls;
  return fn;
}
function pipe(trunkResult) {
  const stub = trunk(trunkResult);
  return { pipeline: createPipeline(localProvider(), {}, { runGroundedSynthesisFn: stub }), stub };
}

test("a bare document reference is a deterministic lookup terminal (0 model calls, no degraded banner)", async () => {
  const { pipeline, stub } = pipe({ status: "grounded", answer_markdown: "SHOULD NOT BE USED", trace: {} });
  for (const q of ["ADR 002", "ADR-011", "adr002"]) {
    const { result, meta } = await pipeline.answer(q);
    assert.equal(meta.terminal_kind, "document_lookup", `${q} must be a document_lookup terminal`);
    assert.equal(meta.deterministic, true, `${q} must be deterministic`);
    assert.equal(meta.llm_called, false, `${q} must not call the model`);
    assert.equal(meta.fallback_reason, null, `${q} must not carry a fallback reason`);
    assert.notEqual(meta.degraded, true, `${q} must not be degraded`);
    assert.match(result.answer, /Estado:/, `${q} lost the status metadata`);
    assert.match(result.answer, /Caminho:/, `${q} lost the path metadata`);
    assert.ok(result.sources.length > 0 && result.sources[0].id, `${q} must cite the document`);
  }
  assert.equal(stub.calls.length, 0, "a bare lookup must never reach the grounded trunk");
});

test("an explain request about a document still escalates to the grounded trunk", async () => {
  const { pipeline, stub } = pipe({
    status: "grounded",
    answer_markdown: "O ADR-002 estabelece a inversão de nomes do ecossistema (ADR-002).",
    cited_source_ids: ["ADR-002"],
    package: { facts: [{ id: "F1", source: { document_id: "ADR-002", title: "ADR-002", path: "decisions/adr/ADR-002-ecosystem-naming-banza-banzai-and-operators.md" } }] },
    primary_intent: "explain_document",
    trace: { synthesis_called: true, output_status: "ok", model: "qwen2.5-7b" },
  });
  const { meta } = await pipeline.answer("explica o ADR-002 em detalhe");
  assert.notEqual(meta.terminal_kind, "document_lookup", "an explanation must NOT be a document_lookup terminal");
  assert.equal(stub.calls.length, 1, "an explanation must reach the grounded trunk exactly once");
});

test("a non-publishing task_incomplete synthesis degrades with a FAITHFUL reason + trace (not the erro-temporário default)", async () => {
  // A synthesis that ran (synthesis_called) but the Task-Completion validator withheld (task_incomplete)
  // must map to `synthesis_task_incomplete` — never the unmapped `synthesis_fallback_unknown` that renders
  // the misleading "erro temporário" banner — and the public trace must reflect that synthesis WAS called.
  const { pipeline } = pipe({
    status: "fallback",
    answer_markdown: null,
    primary_intent: "explain_concept",
    trace: { synthesis_called: true, output_status: "task_incomplete", model: "qwen2.5-7b", output_latency_ms: 12000 },
  });
  // "explica o ADR-002 em detalhe" is an EXPLANATION (reaches the trunk); the injected trunk returns the
  // non-publishing task_incomplete result above.
  const { meta } = await pipeline.answer("explica o ADR-002 em detalhe");
  assert.equal(meta.fallback_reason, "synthesis_task_incomplete");
  assert.notEqual(meta.fallback_reason, "synthesis_fallback_unknown");
  assert.equal(meta.synthesis_called, true, "the faithful trace must record that synthesis was attempted");
  assert.equal(meta.routing_result, "synthesis_fallback", "the trace must not falsely read routing_result=null");
});

test("synthesisFallbackReason maps every non-publishing status to an honest, mappable reason (no *_unknown for the real causes)", () => {
  const r = (trace, primary_intent = "explain_concept") => synthesisFallbackReason({ primary_intent, trace });
  assert.equal(r({ output_status: "task_incomplete" }), "synthesis_task_incomplete");
  assert.equal(r({ output_status: "rejected" }), "synthesis_output_unvalidated");
  assert.equal(r({ output_status: "invalid" }), "synthesis_output_unvalidated");
  assert.equal(r({ output_status: "timeout" }), "local_inference_timeout");
  assert.equal(r({ output_status: "failed" }), "local_inference_unavailable");
  assert.equal(r({ output_status: "unavailable" }), "local_inference_unavailable");
  // a boundary/unsupported deferral is not a failure at all.
  assert.equal(r({}, "boundary_request"), "intent_deferred");
});
