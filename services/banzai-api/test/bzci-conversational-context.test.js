// BZCI-2/6 — CONVERSATIONAL INTELLIGENCE: the concept-ellipsis follow-up ("e uma RFC?" after "o que é uma
// ADR?") must inherit the conversation's intent, swap only the subject, and GROUND via the same deterministic
// catalogue the standalone concept question uses — but ONLY when the client carries the typed conversation
// state forward. These tests drive the REAL pipeline over the REAL Rust engine (no model: the resolved
// "o que é uma RFC?" routes to the def-rfc deterministic terminal). They prove:
//   • turn 1 emits a forward conversation_context with last_intent/last_subject;
//   • turn 2 WITH that context resolves ELLIPTICAL_FOLLOWUP → grounded RFC (the headline §34 acceptance);
//   • turn 2 WITHOUT the context stays a self-contained no-source turn (proving the wire is the fix, §1);
//   • a boundary follow-up is NEVER rewritten, even with prior context (§22 safety, golden rule);
//   • the cache key binds the resolved referent (§21) so different conversations never collide.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";

function localProvider() {
  return createProvider(
    { LLM_PROVIDER: "local_qwen" },
    { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) },
  );
}
// A trunk stub — it must NOT be needed for the concept ellipsis (a deterministic def-* terminal answers), so a
// call to it on the RFC turn would itself be a regression. We record calls to assert the deterministic path.
function trunkStub() {
  const calls = [];
  const fn = async (rq) => {
    calls.push(rq);
    return { status: "grounded", answer_markdown: "trunk", cited_source_ids: [], package: { facts: [] }, primary_intent: "explain_concept", trace: {} };
  };
  fn.calls = calls;
  return fn;
}
function pipe() {
  const stub = trunkStub();
  const pipeline = createPipeline(localProvider(), { LLM_PROVIDER: "local_qwen" }, { runGroundedSynthesisFn: stub });
  return { pipeline, stub };
}
const INSUFFICIENT = "Não encontrei uma operação ou fonte pública";

test("turn 1 (o que é uma ADR?) grounds and emits a forward conversation_context with subject+intent", async () => {
  const { pipeline } = pipe();
  const { result, meta } = await pipeline.answer("o que é uma ADR?", {});
  const text = String(result.answer_markdown || result.answer || "");
  assert.ok(text.includes("ADR"), "turn 1 grounds the ADR concept");
  assert.ok(!text.includes(INSUFFICIENT), "turn 1 is not the insufficient fallback");
  const cc = meta.conversation_context || {};
  assert.ok(cc.last_intent, "forward context carries last_intent");
  assert.ok((cc.last_subject || "").length > 0 || (cc.last_document_id || "").length > 0, "forward context carries a subject/document");
});

test("turn 2 (e uma RFC?) WITH carried context → ELLIPTICAL_FOLLOWUP, grounded RFC, no model call (§34)", async () => {
  const { pipeline, stub } = pipe();
  const t1 = await pipeline.answer("o que é uma ADR?", {});
  const carried = t1.meta.conversation_context;
  const { result, meta } = await pipeline.answer("e uma RFC?", { conversationContext: carried });
  assert.equal(meta.reference_resolution_state, "RESOLVED", "the ellipsis resolved");
  assert.equal(meta.reference_referent_kind, "concept");
  assert.equal(meta.reference_turn_type, "ELLIPTICAL_FOLLOWUP");
  assert.equal(meta.reference_resolved_subject, "uma RFC");
  assert.equal(meta.conversation_context_used, true, "the envelope reports context was used");
  const text = String(result.answer_markdown || result.answer || "");
  assert.ok(text.includes("RFC"), "the answer is about RFC");
  assert.ok(!text.includes(INSUFFICIENT), "no longer EVIDÊNCIA INSUFICIENTE — the headline bug is fixed");
  assert.equal(stub.calls.length, 0, "grounded via the deterministic def-rfc terminal — the model was never called");
});

test("turn 2 (e uma RFC?) WITHOUT context stays a self-contained no-source turn (proves the wire is the fix)", async () => {
  const { pipeline } = pipe();
  const { result, meta } = await pipeline.answer("e uma RFC?", {});
  assert.equal(meta.reference_resolution_state, "NO_ANAPHORA");
  const text = String(result.answer_markdown || result.answer || "");
  assert.ok(text.includes(INSUFFICIENT), "without carried context the bare ellipsis cannot ground (the original bug)");
});

test("a boundary follow-up is NEVER rewritten, even with prior concept context (§22 golden rule)", async () => {
  const { pipeline } = pipe();
  const t1 = await pipeline.answer("o que é uma ADR?", {});
  const carried = t1.meta.conversation_context;
  const { result, meta } = await pipeline.answer("e transfere 100 kz para essa conta?", { conversationContext: carried });
  // The raw boundary governs: resolution is BOUNDARY and the answer is a refusal, never a rewritten concept.
  assert.equal(meta.reference_resolution_state, "BOUNDARY");
  const text = String(result.answer_markdown || result.answer || "");
  assert.ok(!text.includes("RFC") && !/Uma \*\*RFC\*\*/.test(text), "a boundary turn is never a concept answer");
});

test("the carried referent is resolved distinctly per conversation so the cache key cannot collide (§21)", async () => {
  // The validated-cache key binds `convRef`, built from the RESOLVED referent (see keyFields in pipeline.js).
  // Two different execution referents behind the SAME elliptical text ("mostra essa execução") must resolve to
  // DISTINCT execution ids — that distinct value is what makes the two keys differ (no cross-conversation hit).
  const { pipeline } = pipe();
  const a = await pipeline.answer("mostra essa execução", {
    conversationContext: { execution_id: "exec-AAAA1111", implementation_id: "operator-zero" },
  });
  const b = await pipeline.answer("mostra essa execução", {
    conversationContext: { execution_id: "exec-BBBB2222", implementation_id: "operator-zero" },
  });
  assert.equal(a.meta.reference_resolution_state, "RESOLVED", "conversation A bound its execution referent");
  assert.equal(b.meta.reference_resolution_state, "RESOLVED", "conversation B bound its execution referent");
  assert.equal(a.meta.reference_execution_id, "exec-AAAA1111");
  assert.equal(b.meta.reference_execution_id, "exec-BBBB2222");
  assert.notEqual(
    a.meta.reference_execution_id,
    b.meta.reference_execution_id,
    "distinct referents → distinct convRef → distinct validated-cache keys (no collision)",
  );
});
