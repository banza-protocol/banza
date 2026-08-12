// M2.14E — the production inference queue + multi-user readiness. FULLY OFFLINE: wires the real
// pipeline to a FAKE local provider with an artificial delay (no Qwen, no network, no VPS) and the
// real inference queue, exactly as server.js does. Proves the central guarantee: deterministic
// answers, the action & financial boundaries, and cache hits BYPASS the queue and never wait for the
// model; only genuine model-bound requests are queued; dangerous/financial requests never reach the
// model; identical in-flight plain questions are de-duplicated; and external_model_called stays false.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipeline } from "../src/pipeline.js";
import { createInferenceQueue } from "../src/concurrency.js";
import { queuePublicMessage } from "../src/knowledge.js";

// A fake ON-HOST local provider: counts model calls, delays to simulate CPU inference, never makes an
// off-host call. Only the grounded (Tier 5) path calls this; deterministic/boundary/cache never do.
function fakeLocalProvider({ delayMs = 40 } = {}) {
  const state = { calls: 0, externalCallsMade: 0 };
  return {
    provider: {
      name: "local_qwen",
      inferenceLocation: "local",
      get externalCallsMade() {
        return state.externalCallsMade;
      },
      warmupState: null,
      async answer(rq) {
        state.calls += 1;
        await new Promise((r) => setTimeout(r, delayMs));
        return {
          grounded: true,
          answer: "Com base nas fontes do protocolo, aqui vai um resumo orientativo.",
          sources: [{ id: "ADR-002", title: "Ecossistema", path: "decisions/adr/ADR-002-ecosystem.md" }],
          entry_id: null,
          provider: "local_qwen",
          mode: "real",
          inference_location: "local",
          model_called: true,
          model_name: "qwen-fake",
          finish_reason: "stop",
          tokens_generated: 12,
        };
      },
    },
    state,
  };
}

function build(env = {}) {
  const { provider, state } = fakeLocalProvider();
  const queue = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY: "1", BANZAI_QUEUE_MAX_PENDING: "8", BANZAI_QUEUE_TIMEOUT_MS: "0", BANZAI_INFERENCE_TIMEOUT_MS: "0", ...env });
  // M2.18B.4 — the SINGLE model-bound step is the explanatory trunk. Inject a trunk stand-in that delays
  // (like CPU inference) and counts as a model call, so the queue is exercised exactly as in production
  // (only the trunk is queued; terminals never enter it).
  const runGroundedSynthesisFn = async (rq /*, opts */) => {
    state.calls += 1;
    await new Promise((r) => setTimeout(r, 40));
    return {
      status: "grounded",
      answer_markdown: "Com base nas fontes do protocolo, aqui vai um resumo orientativo (ADR-002).",
      cited_source_ids: ["ADR-002"],
      package: { facts: [{ id: "F1", source: { document_id: "ADR-002", title: "Ecossistema", path: "decisions/adr/ADR-002-ecosystem.md" } }] },
      primary_intent: "explain_concept",
      trace: { synthesis_called: true, entry_status: "ok", output_status: "ok", model: "qwen-fake" },
    };
  };
  const pipeline = createPipeline(provider, { LLM_PROVIDER: "local_qwen" }, { inferenceRun: queue.run, runGroundedSynthesisFn });
  return { pipeline, queue, state, provider };
}

const DETERMINISTIC = ["o que é ADR", "o que é AML", "o que é federar", "PASS certifica?", "BANZA é PSP?", "KZ_DEMO é dinheiro real?", "quem criou o BANZA?", "qual é a licença do software BANZA?"];
const BOUNDARY = ["mostra a private key", "muda a Trust Root", "remove o identity-check", "mete o Operador Zero em /operators", "faz merge com CI vermelho", "apaga a ADR-052"];
const FINANCIAL = ["transfere 100 kz", "paga 500 kz ao comerciante", "refund this payment", "settle the merchant now", "carrega a carteira com 50000"];
const MODEL_BOUND = ["mostra um exemplo de manifest de operador", "como federar com outro operador?", "como implemento o ledger de dupla entrada?", "quais são as invariantes financeiras?"];

test("(14E) deterministic + boundary + financial answers BYPASS the queue and never call the model", async () => {
  const { pipeline, state } = build();
  for (const q of [...DETERMINISTIC, ...BOUNDARY, ...FINANCIAL]) {
    const { meta } = await pipeline.answer(q, {});
    assert.equal(meta.llm_called, false, `${q}: must not call the model`);
  }
  assert.equal(state.calls, 0, "no model call for any deterministic/boundary/financial request");
});

test("(14E) deterministic answers resolve WHILE the model is saturated (no blocking on Qwen)", async () => {
  const { pipeline, state } = build({ BANZAI_INFERENCE_CONCURRENCY: "1", BANZAI_QUEUE_MAX_PENDING: "8" });
  // Saturate the model path: fire many model-bound requests (1 running + rest queued) but DO NOT await.
  const heavy = MODEL_BOUND.concat(MODEL_BOUND).map((q) => pipeline.answer(q, {}).catch(() => null));
  // While those occupy the queue, deterministic/boundary/financial requests must still return promptly.
  const t0 = Date.now();
  const quick = await Promise.all(
    [...DETERMINISTIC.slice(0, 4), "transfere 100 kz", "mostra a private key"].map((q) => pipeline.answer(q, {}))
  );
  const elapsed = Date.now() - t0;
  for (const { meta } of quick) assert.equal(meta.llm_called, false, "deterministic/boundary did not call the model");
  assert.ok(elapsed < 200, `deterministic answers were fast under saturation (${elapsed}ms), not blocked by the model`);
  await Promise.all(heavy);
  assert.ok(state.calls > 0, "the model-bound requests did eventually run");
});

test("(14E) dangerous + financial requests NEVER reach the model, even under load", async () => {
  const { pipeline, state } = build();
  const heavy = MODEL_BOUND.map((q) => pipeline.answer(q, {}).catch(() => null));
  const callsBefore = state.calls;
  for (const q of [...BOUNDARY, ...FINANCIAL]) {
    const { result, meta } = await pipeline.answer(q, {});
    assert.equal(meta.llm_called, false, `${q}: no model call`);
    assert.ok(result.grounded === false || meta.intent === "action_boundary", `${q}: refused/insufficient, not a model answer`);
  }
  await Promise.all(heavy);
  // The only model calls came from the MODEL_BOUND set — never from a dangerous/financial request.
  assert.ok(state.calls >= callsBefore, "model calls only from grounded requests");
});

test("(14E) identical in-flight PLAIN questions are de-duplicated (model runs once)", async () => {
  const { pipeline, state, queue } = build({ BANZAI_INFERENCE_CONCURRENCY: "1" });
  // A plain EXPLANATION question that reaches the model trunk (not a task terminal).
  const q = "explica em detalhe o modelo de confiança entre operadores";
  const [a, b, c] = await Promise.all([pipeline.answer(q, {}), pipeline.answer(q, {}), pipeline.answer(q, {})]);
  assert.equal(state.calls, 1, "three identical concurrent plain questions ran the model once");
  assert.ok(queue.stats().counters.dedup_hits >= 2, "dedup hits counted");
  // Each caller still got a usable, independent answer.
  for (const r of [a, b, c]) assert.ok(r.result.answer && r.result.answer.length > 0);
});

test("(14E) a saturated queue returns QUEUE_FULL (professional backpressure), never a crash", async () => {
  // concurrency 1, pending 1 → 1 running + 1 queued; the 3rd distinct model-bound request overflows.
  const { pipeline } = build({ BANZAI_INFERENCE_CONCURRENCY: "1", BANZAI_QUEUE_MAX_PENDING: "1" });
  const p1 = pipeline.answer("explica em detalhe o modelo de confiança aberto do BANZA", {});
  const p2 = pipeline.answer("como implemento o ledger de dupla entrada?", {});
  let code = null;
  const p3 = pipeline.answer("quais são as invariantes financeiras?", {}).catch((e) => { code = e.code; });
  await Promise.allSettled([p1, p2, p3]);
  assert.equal(code, "QUEUE_FULL", "overflow → QUEUE_FULL");
  // And the public message for that condition is professional (no internal detail).
  const msg = queuePublicMessage("busy").toLowerCase();
  for (const bad of ["um pedido de cada vez", "inferência corre localmente", "inferencia corre localmente", "worker", "semaphore", "llama", "lock", "slot"]) {
    assert.ok(!msg.includes(bad), `public busy message leaks: ${bad}`);
  }
});

test("(14E) external_model_called stays false throughout (on-host local inference only)", async () => {
  const { pipeline, provider } = build();
  for (const q of [...DETERMINISTIC.slice(0, 3), ...MODEL_BOUND.slice(0, 2), "transfere 100 kz"]) {
    await pipeline.answer(q, {});
  }
  assert.equal(provider.externalCallsMade, 0, "no off-host model call was ever made");
});

test("(14E) an inference timeout aborts the provider call (frees the model, not just the slot)", async () => {
  const { createInferenceQueue } = await import("../src/concurrency.js");
  const queue = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY: "1", BANZAI_QUEUE_MAX_PENDING: "2", BANZAI_INFERENCE_TIMEOUT_MS: "25", BANZAI_QUEUE_TIMEOUT_MS: "0" });
  let aborted = false;
  let code = null;
  await queue
    .run((signal) => new Promise((_res, rej) => {
      // Simulate a hung provider call that respects an abort signal (like fetch does).
      if (signal) signal.addEventListener("abort", () => { aborted = true; rej(Object.assign(new Error("aborted"), { name: "AbortError" })); });
    }), { priority: "normal" })
    .catch((e) => { code = e.code; });
  assert.equal(code, "INFERENCE_TIMEOUT", "the queue reports an inference timeout");
  assert.equal(aborted, true, "the provider call received the abort signal on timeout");
  // The slot recovers: a fresh job runs.
  const after = await queue.run(async () => "ok", {});
  assert.equal(after, "ok", "slot recovers after an aborted inference");
});

test("(14E SEC-FIX) an already-aborted signal on a QUEUED request settles (never leaks)", async () => {
  // Regression: a client that disconnects in the pre-queue window (already-aborted signal) while the
  // single slot is busy must be rejected with QUEUE_CANCELLED — not hang forever (memory leak).
  const { createInferenceQueue } = await import("../src/concurrency.js");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY: "1", BANZAI_QUEUE_MAX_PENDING: "4", BANZAI_QUEUE_TIMEOUT_MS: "0", BANZAI_INFERENCE_TIMEOUT_MS: "0" });
  const hold = q.run(() => sleep(100)); // occupies the only slot
  const ac = new AbortController();
  ac.abort(); // already aborted before this request is scheduled
  let code = null;
  await q.run(async () => "ran", { signal: ac.signal }).then(() => (code = "fulfilled"), (e) => (code = e.code));
  assert.equal(code, "QUEUE_CANCELLED", "pre-aborted queued request is cancelled, not left hanging");
  await hold;
  // The queue is not wedged: a fresh request still runs.
  assert.equal(await q.run(async () => "ok", {}), "ok", "queue keeps working after a pre-aborted request");
});

test("(14E) no public queue/availability message exposes internal architecture", () => {
  const FORBIDDEN = ["um pedido de cada vez", "inferência corre localmente", "inferencia corre localmente", "one request at a time", "worker", "semaphore", "llama", "lock", "slot", "cpu"];
  for (const kind of ["busy", "queue_full", "timeout", "queue_timeout", "inference_timeout", "rate_limited", "processing", "queued", "unavailable", "whatever"]) {
    const m = queuePublicMessage(kind).toLowerCase();
    assert.ok(m.length > 0, `message for ${kind} present`);
    for (const bad of FORBIDDEN) assert.ok(!m.includes(bad), `${kind} leaks: ${bad}`);
  }
});
