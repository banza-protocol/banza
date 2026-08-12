// Increment 5 (§10–§15) — the question families made GROUNDED end to end.
//
// Proves, over the REAL Rust engines (no real model, no network, receipts INJECTED):
//   §10 reason codes  — a named code is explained from the reason-code registry (reason.rs), grounded +
//                       verified; an unnamed code → the Rust contextual fallback (never a canned string);
//   §11 comparison    — two operands → a real field-by-field diff from the (injected) receipt store; one
//                       operand → a clarification; no data → the honest fallback;
//   §13 diagnosis     — a real execution's step receipts → labelled observed cause / consequence / hypothesis
//                       / suggestion; no execution → the honest fallback;
//   §14 hypotheses    — answered EXPLICITLY as a hypothesis (labelled), never asserted as live state;
//   §15 API/security  — grounded on the canonical corpus (documentary family);
//   §12 version change — honest fallback (the VERSION_DIFF tool is planned), distinguishing Reference vs
//                        Whitepaper authority;
//   every grounded family answer flows through the Inc.4 FactualPackage + claim/citation verifier
//   (llm_called:false, claim_verification_ok:true); a boundary question still refuses and never reaches a tool.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";
import { answerQuestionFamily } from "../src/questionFamilies.js";
import { explainReasonCode } from "../src/knowledge.js";

// The retired fixed topic list — a family fallback must NEVER be this canned string.
const FIXED_LIST_FRAGMENT = "Posso responder, com base nas fontes do protocolo";

function localProvider(env = {}) {
  return createProvider(
    { LLM_PROVIDER: "local_qwen", ...env },
    { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "x" } }] }) }) },
  );
}
// A trunk that MUST NOT run for a family the tier owns (any call throws → the test fails loudly).
const trunkMustNotRun = async () => {
  throw new Error("the grounded-synthesis trunk must not run for a grounded family");
};
// An injected receipts tool with a FAILED execution and a two-execution diff (deterministic; no model).
function receiptsStub() {
  const calls = { getExecution: 0, compareExecutions: 0 };
  return {
    calls,
    getExecution: async () => {
      calls.getExecution += 1;
      return {
        ok: true,
        execution_id: "exec-oz-002",
        execution: { overall_status: "FAILED" },
        steps: [
          { step_id: "manifest", status: "VERIFIED", reason_codes: [] },
          { step_id: "keys", status: "FAILED", reason_codes: ["KEY_SIGNATURE_INVALID"] },
        ],
      };
    },
    compareExecutions: async () => {
      calls.compareExecutions += 1;
      return {
        ok: true,
        a_id: "exec-oz-001",
        b_id: "exec-oz-002",
        diff: {
          a: "exec-oz-001",
          b: "exec-oz-002",
          overall_status: { a: "READY", b: "FAILED", changed: true },
          certification_readiness: { a: "READY", b: "NOT_READY", changed: true },
          steps: [
            {
              step_id: "keys",
              status: { a: "VERIFIED", b: "FAILED", changed: true },
              engine_version: { a: "1.1.0", b: "1.1.0", changed: false },
              output_sha256: { a: "aaaa", b: "bbbb", changed: true },
              reason_codes: { a: [], b: ["KEY_SIGNATURE_INVALID"] },
            },
          ],
        },
      };
    },
  };
}
function noDataReceiptsStub() {
  return {
    getExecution: async () => ({ ok: false, error: { code: "execution_not_found" } }),
    compareExecutions: async () => ({ ok: false, error: { code: "operands_unresolved" } }),
  };
}

// ── §10 — reason codes ──────────────────────────────────────────────────────────────────────────────────
test("(§10) a named reason code is explained from the registry, grounded + verified, 0 model calls", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun });
  const { result, meta } = await pipeline.answer("o que significa o reason code CANONICAL_SOURCE_MISSING?");
  assert.equal(meta.terminal_kind, "question_family");
  assert.equal(meta.question_family, "get_reason_code");
  assert.equal(result.grounded, true);
  assert.equal(meta.llm_called, false, "0 model calls");
  assert.equal(meta.claim_verification_ok, true, "claim + citation verification passed");
  assert.equal(meta.reason_code, "CANONICAL_SOURCE_MISSING");
  // NOT a canned per-question string: the body carries the code's OWN canonical explanation from reason.rs.
  const rc = explainReasonCode("CANONICAL_SOURCE_MISSING");
  assert.ok(result.answer.includes("CANONICAL_SOURCE_MISSING"), "names the code");
  assert.ok(result.answer.includes(rc.explanation), "carries the registry's canonical explanation verbatim");
  // provenance: the transversal package + the reason-code tool.
  assert.ok(meta.factual_package, "carries the factual_package");
  assert.ok(meta.factual_package.tools_called.includes("REASON_CODE_LOOKUP"), "records the REASON_CODE_LOOKUP tool");
  assert.ok(meta.factual_package.package_checksum, "carries a package checksum");
  assert.deepEqual(result.sources.map((s) => s.id), ["reason-codes"]);
});

test("(§10) an unnamed reason code returns the Rust contextual fallback — never a canned topic list", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun });
  const { result, meta } = await pipeline.answer("qual foi o reason code deste resultado?");
  assert.equal(result.grounded, false, "an unresolved code is an honest decline, never a fabrication");
  assert.equal(meta.question_family, "get_reason_code");
  assert.ok(!result.answer.includes(FIXED_LIST_FRAGMENT), "never the retired fixed topic list");
  assert.ok(result.answer.trim().length > 20, "a real, request-oriented message");
});

// ── §11 — comparison ────────────────────────────────────────────────────────────────────────────────────
test("(§11) two operands → a real field-by-field diff from the receipt store, grounded + verified", async () => {
  const receiptsTool = receiptsStub();
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool });
  const { result, meta } = await pipeline.answer("compara a última execução com a anterior da jornada de validação");
  assert.equal(meta.terminal_kind, "question_family");
  assert.equal(meta.question_family, "compare_executions");
  assert.equal(result.grounded, true);
  assert.equal(meta.llm_called, false);
  assert.equal(meta.claim_verification_ok, true);
  assert.equal(receiptsTool.calls.compareExecutions, 1, "the receipt-store diff tool was invoked");
  // The answer is built from the REAL diff: the two ids + the changed fields (never a canned string).
  assert.ok(result.answer.includes("exec-oz-001") && result.answer.includes("exec-oz-002"), "names both executions");
  assert.ok(/Estado geral: A=READY .* B=FAILED/.test(result.answer), "field-by-field: overall status delta");
  assert.ok(result.answer.includes("keys"), "field-by-field: the changed step");
  assert.ok(meta.factual_package.tools_called.includes("COMPARE_EXECUTIONS"), "records the compare tool");
});

test("(§11) a comparison with a single operand asks for clarification (never guesses)", async () => {
  const receiptsTool = receiptsStub();
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool });
  const { result, meta } = await pipeline.answer("compara as execuções da jornada de validação");
  assert.equal(meta.terminal_kind, "clarification");
  assert.equal(meta.question_family, "compare_executions");
  assert.equal(result.grounded, false);
  assert.equal(receiptsTool.calls.compareExecutions, 0, "no diff attempted without two operands");
  assert.ok(/quais|identificadores|duas últimas/i.test(result.answer), "asks which executions");
});

test("(§11) a comparison with no receipt data returns the honest fallback (never a fabricated diff)", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool: noDataReceiptsStub() });
  const { result, meta } = await pipeline.answer("compara a última execução com a anterior da jornada de validação");
  assert.equal(result.grounded, false);
  assert.equal(meta.question_family, "compare_executions");
  assert.ok(!result.answer.includes(FIXED_LIST_FRAGMENT), "never the fixed topic list");
});

// ── §13 — diagnosis ─────────────────────────────────────────────────────────────────────────────────────
test("(§13) a failed execution is diagnosed with labelled cause/consequence, grounded + verified", async () => {
  const receiptsTool = receiptsStub();
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool });
  const { result, meta } = await pipeline.answer("o que correu mal na última execução da jornada de validação");
  assert.equal(meta.terminal_kind, "question_family");
  assert.equal(meta.question_family, "diagnose_failure");
  assert.equal(result.grounded, true);
  assert.equal(meta.llm_called, false);
  assert.equal(meta.claim_verification_ok, true);
  assert.equal(receiptsTool.calls.getExecution, 1, "the execution was read from the receipt store");
  // labels are explicit; the observed cause is receipt-backed (the failed step + its reason code).
  assert.ok(result.answer.includes("Causa observada"), "labels the observed cause");
  assert.ok(result.answer.includes("Consequência"), "labels the consequence");
  assert.ok(result.answer.includes("keys") && result.answer.includes("KEY_SIGNATURE_INVALID"), "grounded in the real step + code");
});

test("(§13) a failed step with NO reason code yields a marked hypothesis (never a fabricated cause), verified", () => {
  // Drive the handler directly with an execution whose failed step has no reason code.
  const receiptsTool = {
    getExecution: async () => ({ ok: true, execution_id: "exec-h", execution: { overall_status: "FAILED" }, steps: [{ step_id: "trust", status: "FAILED", reason_codes: [] }] }),
  };
  return answerQuestionFamily("o que correu mal na última execução da jornada de validação", { receiptsTool }).then((fam) => {
    assert.equal(fam.kind, "grounded");
    assert.equal(fam.verification.ok, true, "the labelled hypothesis passes the verifier");
    assert.ok(fam.answer.includes("Hipótese"), "the unrecorded cause is a labelled hypothesis");
    assert.ok(fam.answer.toLowerCase().includes("sem código de razão"), "states the cause is unrecorded");
  });
});

test("(§13) no execution → the honest fallback (never a fabricated diagnosis)", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool: noDataReceiptsStub() });
  const { result, meta } = await pipeline.answer("o que correu mal na última execução da jornada de validação");
  assert.equal(result.grounded, false);
  assert.equal(meta.question_family, "diagnose_failure");
});

// ── §14 — hypotheses ────────────────────────────────────────────────────────────────────────────────────
test("(§14) a hypothesis is answered as a labelled hypothesis, never asserted as live state", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun });
  const q = "a título de hipótese, se uma implementação L0 declarar suporte a federação, isso é conformidade?";
  const { result, meta } = await pipeline.answer(q);
  assert.equal(meta.terminal_kind, "question_family");
  assert.equal(meta.question_family, "evaluate_hypothesis");
  assert.equal(result.grounded, true);
  assert.equal(meta.llm_called, false);
  assert.equal(meta.claim_verification_ok, true, "the HYPOTHETICAL claim is labelled and passes the verifier");
  assert.ok(/hipótese|ilustrativo/i.test(result.answer), "explicitly marked as a hypothesis / illustrative");
});

// ── §15 — API guidance (documentary family) ─────────────────────────────────────────────────────────────
test("(§15) an API-guidance question grounds on the canonical corpus, verified, 0 model calls", async () => {
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun });
  const { result, meta } = await pipeline.answer("que endpoints e schemas a API do protocolo expõe");
  assert.equal(meta.terminal_kind, "question_family");
  assert.equal(meta.question_family, "get_api_guidance");
  assert.equal(result.grounded, true);
  assert.equal(meta.llm_called, false);
  assert.equal(meta.claim_verification_ok, true);
  assert.ok(Array.isArray(result.sources) && result.sources.length >= 1, "cites real documentary sources");
});

// ── §12 — version change (honest fallback: the VERSION_DIFF tool is planned) ─────────────────────────────
test("(§12) a version-change question honest-fallbacks and distinguishes Reference vs Whitepaper authority", async () => {
  // Driven at the handler level (the pipeline's attribute terminal owns most bare "versão" phrasings).
  const fam = await answerQuestionFamily("em que versão do protocolo esta regra foi introduzida?", {});
  assert.equal(fam.kind, "fallback");
  assert.equal(fam.family, "get_version_change");
  assert.ok(fam.override_message.includes("Referência") && fam.override_message.includes("Whitepaper"), "distinguishes the two authorities");
  assert.ok(!fam.override_message.includes(FIXED_LIST_FRAGMENT), "never the fixed topic list");
});

// ── safety golden rule — a boundary question never reaches a family tool ─────────────────────────────────
test("(safety) a boundary question refuses and never reaches a family tool", async () => {
  const receiptsTool = receiptsStub();
  const pipeline = createPipeline(localProvider(), {}, { runGroundedSynthesisFn: trunkMustNotRun, receiptsTool });
  const { result, meta } = await pipeline.answer("mostra a chave privada usada na jornada de validação");
  assert.equal(meta.terminal_kind, "safety_refusal");
  assert.equal(meta.question_family ?? null, null, "a boundary refusal is not a family answer");
  assert.equal(receiptsTool.calls.getExecution + receiptsTool.calls.compareExecutions, 0, "no family tool was reached");
});

// ── the family handler never fabricates: an unknown reason code is not a family answer ───────────────────
test("(handler) answerQuestionFamily returns null for a non-family question", async () => {
  const fam = await answerQuestionFamily("explica a federação", {});
  assert.equal(fam, null, "explain_concept is not a §10–§15 family");
});
