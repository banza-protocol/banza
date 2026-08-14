// BanzAI API — HTTP server.
//
// BanzAI is the native, non-authoritative protocol agent: it guides, invokes the
// engines and cites sources; it never decides, certifies, or invents operators. No
// framework, zero runtime dependencies. Providers: `mock` (default, offline), the
// hosted `deepseek`/`qwen` APIs, or `local_qwen` (ADR-036) — an internal-only llama.cpp
// OpenAI-compatible endpoint on the Docker network (no key, no GPU assumed, nothing
// leaves the host). local_qwen is benchmark-gated and never the effective default until
// the VPS XL+ benchmark approves it; mock/degraded stay available as fallback.

import http from "node:http";
import crypto from "node:crypto";
import { createProvider, ALLOWED_PROVIDERS, GUARDRAILS } from "./provider.js";
import { ENTRIES, SOURCES, retrieve, queuePublicMessage, answerType, singleContractSelfCheck, contractVersions, planTools, toolContracts } from "./knowledge.js";
import { createPipeline, progressDisposition } from "./pipeline.js";
// SPR-2 — the typed Safe-Progressive-Response transport (Rust-owned contract via the committed WASM).
import { makeTerminalEvent, sseFrame, PROGRESS_SCHEMA_TOKEN } from "./progressContract.js";
import { RateLimiter } from "./limits.js";
import { createInferenceQueue } from "./concurrency.js";
import { createToolRuntime } from "./toolRuntime.js";
import { createSlo } from "./slo.js";
import { buildObservabilityRecord } from "./observability.js";
import { deriveJourney, sanitizeUploadedArtifacts } from "./journey.js";
import { normalizeBanzaiAnswer, isPublicSource } from "./answerContract.js";
import { buildReasoningTrace } from "./reasoningTrace.js";
import { createValidator, STEP_ORDER } from "./validate.js";
import { createLiveArtifactTool } from "./liveArtifact.js";
import { createTelemetryTool } from "./telemetry.js";
import { createReceiptsTool } from "./receiptsTool.js";
import * as receiptStore from "./receipts/index.js";
import { createOnboarding } from "./onboarding/index.js";

const PORT = Number(process.env.PORT || 8091);

// ADR-036 local-inference flags. These NEVER auto-enable local_qwen — LLM_PROVIDER
// selects the provider. `benchmark_approved` records that the VPS XL+ benchmark endorsed
// local_qwen as the effective default; without it, local_qwen is opt-in/preview only.
const bool = (v) => /^(1|true|yes|on)$/i.test(String(v ?? "").trim());

// Increment 6 (§16-§17) — sanitize the client-carried conversation_context to the SAFE, technical-only
// fields. Each value is coerced to an id/enum token (letters, digits and `._:-`, capped) — NEVER free text,
// PII, secrets or the model's prose. Unknown keys are dropped; the shape is fixed. A non-object → {}.
const CONVERSATION_CONTEXT_FIELDS = [
  "operator_id",
  "implementation_id",
  "execution_id",
  "previous_execution_id",
  "artifact",
  "profile",
  "environment",
  "protocol_version",
  "last_intent",
  "last_family",
  // BZCI-2 (§2) — the documentary/conceptual dimension. `last_document_id` and `last_metric` are id/enum
  // shaped, so the strict token sanitizer fits them; `last_subject` (a short human subject label) and
  // `observed_at` (an ISO timestamp) get their own looser-but-still-safe sanitizers below.
  "last_document_id",
  "last_metric",
];
function safeCtxToken(v, max = 80) {
  return typeof v === "string" ? v.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, max) : "";
}
// A short human SUBJECT label ("RFC", "federação", "Action Boundary") — unicode letters/digits + spaces and a
// few punctuation marks only; NEVER prose, HTML, quotes or angle brackets. Capped short.
function safeCtxSubject(v, max = 48) {
  return typeof v === "string" ? v.replace(/[^\p{L}\p{N} ._:-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
}
// An ISO-8601 timestamp the client carries for freshness — digits + `TZ:-.` only, capped.
function safeCtxTimestamp(v, max = 32) {
  return typeof v === "string" ? v.replace(/[^0-9TZ:.+-]/g, "").slice(0, max) : "";
}
function sanitizeConversationContext(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const f of CONVERSATION_CONTEXT_FIELDS) {
    const t = safeCtxToken(raw[f]);
    if (t) out[f] = t;
  }
  const subject = safeCtxSubject(raw.last_subject);
  if (subject) out.last_subject = subject;
  const kind = safeCtxToken(raw.last_subject_kind, 20);
  if (kind) out.last_subject_kind = kind;
  const observedAt = safeCtxTimestamp(raw.observed_at);
  if (observedAt) out.observed_at = observedAt;
  return out;
}
const LOCAL_INFERENCE_ENABLED = bool(process.env.BANZAI_LOCAL_INFERENCE_ENABLED);
const BENCHMARK_APPROVED = bool(process.env.BANZAI_BENCHMARK_APPROVED);

// Fail fast and explicitly on a disallowed LLM_PROVIDER — no fallback, no guessing.
let provider;
try {
  provider = createProvider();
} catch (err) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "invalid LLM_PROVIDER — refusing to start",
      detail: err.message,
      allowed: ALLOWED_PROVIDERS,
    })
  );
  process.exit(1);
}

// M2.14E — the production inference queue guards ONLY the model-inference step (pipeline Tier 5).
// Deterministic answers, the action & financial boundaries, refusals and cache hits all resolve
// BEFORE Tier 5 and never enter the queue, so a busy local model never blocks them and the public
// surface never exposes a "one request at a time" architecture. Configurable concurrency + a
// priority-ordered pending queue + in-flight de-duplication + wait/inference timeouts.
const inferenceQueue = createInferenceQueue(process.env);
// BZC-2 — live secure-fetch tool for implementation artifacts. Reuses the CLOSED Technical Registry (Rust)
// + the SSRF-hardened Rust fetcher (banza-fetcher) via the on-host global fetch to reach the internal
// fetcher service ONLY (never an operator endpoint directly, never a user URL). Injected into the pipeline
// so an entity+artifact question ("o manifesto do Operador Zero") is answered from the LIVE artifact with
// origin/version/profile/environment/sha256/observed_at — never the Protocol Manifesto.
const liveArtifactTool = createLiveArtifactTool(process.env);
// ADR-036 — read-only operational telemetry tool (duration/metric of the validation journey, from the
// persisted receipt store). Fail-safe + env-gated inside; a disabled store degrades to an honest
// INSUFFICIENT_MEASUREMENTS answer, never an error.
const telemetryTool = createTelemetryTool(process.env);
// Increment 5 (§11/§13) — read-only receipts tool for the comparison + diagnosis question families. Fail-safe
// + env-gated inside the store (a disabled store degrades to an honest contextual fallback, never an error).
const receiptsTool = createReceiptsTool(process.env);
// Increment 8 (§21/§23) — the tool-robustness harness + the in-process SLO aggregator. The harness wraps
// each executable tool call (live-artifact fetch, telemetry query, the receipt reads the question families
// use) with the robustness each tool's DECLARED Inc.3 ToolContract specifies (per-tool timeout, bounded
// retry for idempotent reads only, a circuit breaker, freshness-scoped caching, per-tool concurrency caps,
// cancellation and FAULT ISOLATION). It reuses the SAME injected callables (no fork). A boundary/refusal is
// settled upstream at Tier 0 and is never wrapped/cached/retried. The SLO aggregator records per-request +
// per-tool metrics (p50/p95/p99, availability, fallback/error rate, %deterministic/%model) — numbers only.
const slo = createSlo(process.env);
const toolRuntime = createToolRuntime(process.env, { contracts: toolContracts(), slo });
const hardenedLiveArtifactTool = liveArtifactTool
  ? toolRuntime.wrapTool(liveArtifactTool, { fetchArtifact: "LIVE_ARTIFACT_FETCH" })
  : null;
const hardenedTelemetryTool = telemetryTool
  ? toolRuntime.wrapTool(telemetryTool, { getDuration: "METRICS_QUERY" })
  : null;
const hardenedReceiptsTool = receiptsTool
  ? toolRuntime.wrapTool(receiptsTool, { getExecution: "EXECUTION_LOOKUP", compareExecutions: "COMPARE_EXECUTIONS" })
  : null;
// Cost-optimized pipeline: deterministic → action/financial boundary → operational metric → question families
// → exact cache → semantic cache → budget gate → QUEUED limited RAG + LLM → post-validation. See pipeline.js.
// The pipeline receives the HARDENED tools — every tool call now flows through the robustness harness.
const pipeline = createPipeline(provider, process.env, {
  inferenceRun: inferenceQueue.run,
  liveArtifactTool: hardenedLiveArtifactTool,
  telemetryTool: hardenedTelemetryTool,
  receiptsTool: hardenedReceiptsTool,
});
const rateLimiter = new RateLimiter(process.env);

// M2.19G.1 (ADR-034) — endpoint-originated operator validation. Resolves a target from the CLOSED
// Technical Registry (Rust), fetches each artifact from the implementation's public endpoints via the
// secure Rust fetcher (banza-fetcher), runs the Rust decision engines on the FETCHED content, and emits
// origin-bound receipts. Uses the on-host global fetch to reach the internal fetcher service ONLY (never
// an operator endpoint directly, never a user URL); tests inject a hermetic fetcher stub.
const validator = createValidator(process.env);

// M2.19G.3 (ADR-037) — BanzAI-hosted operator onboarding: passwordless email-OTP login, a private
// Candidate Registry, and .well-known origin proof. Every security decision is computed in Rust
// (engines/banzai-onboarding); this service supplies entropy, time, Postgres persistence (banzai_rw),
// one Resend email and one secure fetch. OFF unless BANZAI_ONBOARDING_ENABLED — dark and unadvertised
// until the migration + secrets are installed at deploy.
const onboarding = createOnboarding(process.env);

// Steady-state engine label for /health. Per-request /ask may additionally report
// "degraded" (local model unavailable this request) — see ask().
function engineStateSteady() {
  if (provider.name === "mock") return "mock";
  if (provider.name === "local_qwen") return "local_qwen";
  return "external_hosted";
}

// Client id for rate limiting. Behind nginx (BANZAI_TRUST_PROXY=1) use the first
// X-Forwarded-For hop; otherwise the socket address. Never logged with the question.
function clientId(req) {
  if (process.env.BANZAI_TRUST_PROXY === "1") {
    const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (xff) return xff;
  }
  return req.socket.remoteAddress || "unknown";
}

function sendJson(res, code, body, extraHeaders = {}) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      data += c;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// GET /health
function health() {
  return {
    code: 200,
    body: {
      status: "ok",
      app: "banzai-api",
      mode: provider.name,
      llm_provider: provider.name,
      engine_state: engineStateSteady(),          // mock | local_qwen | external_hosted
      // external_model_called = an OFF-HOST model call was made. local_qwen inference
      // is on-host, so this stays false even when the local model answers.
      external_model_called: provider.externalCallsMade > 0,
      inference_location: provider.inferenceLocation ?? "none", // local | external | none
      local_inference: {                          // ADR-036 — benchmark-gated
        location: provider.inferenceLocation ?? "none",
        enabled: LOCAL_INFERENCE_ENABLED,
        benchmark_approved: BENCHMARK_APPROVED,
        default_effective: provider.name === "local_qwen" && BENCHMARK_APPROVED,
        // ADR-036 prefix warm-up: null = not attempted, true = system-prompt prefix primed,
        // false = llama.cpp never became ready in the window (best-effort; never blocks).
        warmed: provider.warmupState ?? null,
        // M2.14E queue telemetry (internal /health only): back-compat fields + richer counters
        // (running, pending, dedup hits, timeouts, avg wait/inference ms). No content, no secrets.
        concurrency: inferenceQueue.stats(),
      },
      authoritative: false,
      guardrails: GUARDRAILS,
      answer_mode_default: pipeline.defaultMode,
      usage: pipeline.usage(),   // budget + cache counters; no secrets, no content
      // M2.19G.3 — onboarding readiness (secret-free booleans only: enabled, provider, whether the
      // pepper/Resend key are configured). Never the pepper or key themselves.
      onboarding: onboarding.healthSync(),
    },
  };
}

// GET /runtime — M2.19G.5C (ADR-036). The PUBLIC runtime SSOT: a secret-free, versioned projection of
// the runtime facts the service already holds (the same sources /health reads), minus every internal-only
// field. A NEW handler — never a rename or public proxy of /health (which stays unproxied and 404s
// publicly). Every human page consumes this; where a page's prose and this route differ, the route wins.
// Non-authoritative telemetry (authoritative:false) — distinct from the signed, root-anchored
// /.well-known/banza/* trust artifacts. FORBIDDEN here (asserted by the guard): filesystem paths; the
// exact model id/version/quantisation/parameter-count/GGUF filename; hostnames/IPs/ports; tokens/keys/
// pepper; system prompts or chain-of-thought; concurrency-queue stats; usage/budget/onboarding internals;
// hardware; any question/answer content. `model_class` is a COARSE family/hosting label only.
function runtime() {
  const h = health().body;                    // reuse the exact source of truth /health reads
  const mode = engineStateSteady();           // mock | local_qwen | external_hosted
  const warmed = provider.warmupState;        // null (undetermined) | true (primed) | false (failed)
  // model_available mirrors the local_inference fields /health reads: the local_qwen provider, endorsed
  // as the effective default by the VPS benchmark, AND actually primed this boot. Coarse — never the id.
  const modelAvailable = provider.name === "local_qwen" && BENCHMARK_APPROVED && warmed === true;
  const modelClass =
    mode === "local_qwen" ? "local-qwen" : mode === "external_hosted" ? "external" : mode === "mock" ? "mock" : null;

  // status + degraded_capabilities. mock and external_hosted are legitimate steady modes that do NOT
  // depend on the on-host local model → "ok", no degraded capability. For local_qwen the model
  // capability is: ok when primed, degraded when warm-up failed, unknown while still undetermined.
  const degradedCapabilities = [];
  let status;
  if (provider.name === "local_qwen") {
    if (warmed === true) {
      status = "ok";
    } else if (warmed === false) {
      degradedCapabilities.push("model");
      status = "degraded";
    } else {
      status = "unknown"; // warm-up not yet resolved (pending or disabled) — cannot determine
    }
  } else {
    status = "ok";
  }

  return {
    code: 200,
    body: {
      schema_version: "banzai-runtime/1",
      service: h.app,
      release: process.env.BANZA_RELEASE || null,
      commit: process.env.BANZA_COMMIT || null,
      status,                                   // ok | degraded | unknown
      mode,                                     // local_qwen | external_hosted | mock | degraded
      model_available: modelAvailable,
      model_class: modelClass,                  // coarse family/hosting label only
      inference_location: h.inference_location, // local | external | none
      external_calls: Boolean(h.external_model_called),
      deterministic_engines_available: singleContractSelfCheck().ready,
      degraded_capabilities: degradedCapabilities,
      checked_at: new Date().toISOString(),
      authoritative: false,
    },
  };
}

// GET /slo — Increment 8 (§23). A lightweight, read-only, PUBLIC-safe SLO/metrics surface. It reports the
// in-process request + per-tool telemetry the SLO aggregator keeps (p50/p95/p99 request latency by
// percentile_cont linear interpolation — the SAME method as BZO-8/telemetry.js; availability; error_rate;
// fallback_rate; percent_deterministic (llm_called=false); percent_model; and per-tool availability + mean
// cost(ms) + outcome breakdown), plus the documented SLO targets and the rolling-window description. It
// carries NO secrets, NO content, NO question/answer, NO queue internals — only numbers. Distinct from the
// signed /.well-known trust artifacts (authoritative:false). A NEW handler, never a proxy of /health.
function sloSurface() {
  return { code: 200, body: slo.snapshot() };
}

// POST /ask  { "question": "...", "mode": "fast"|"deep" (optional) }
// `signal` (M2.14E) aborts a QUEUED inference when the client disconnects before we answer.
const INTENT_TRACE_DIAGNOSTIC = String(process.env.BANZAI_INTENT_TRACE_MODE || "normal").toLowerCase() === "diagnostic";

async function ask(req, signal, onProgress) {
  const limit = rateLimiter.allow(clientId(req));
  if (!limit.allowed) {
    return {
      code: 429,
      body: {
        error: "rate_limited",
        // M2.14E — a professional, non-technical public message (Rust single source of truth). It
        // never exposes internal limits/architecture; the frontend can also render it directly.
        public_message: queuePublicMessage("rate_limited"),
        detail: "Too many requests in the current window.",
        retry_after_ms: limit.retry_after_ms,
      },
    };
  }
  let question = "";
  let documentId = "";
  let mode;
  let contextQuestions = [];
  let conversationContext = {};
  let journey = null;
  let uploadedArtifacts = [];
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    question = parsed.question || "";
    mode = parsed.mode;
    // M2.9C: a SAFE summary of uploaded artifacts — step + file name + size ONLY (never the raw file
    // body, which the frontend never sends). Sanitized here: known step, safe basename, numeric size.
    // The presence of artifacts frames guidance; it never bypasses safety and is never trusted as data.
    uploadedArtifacts = sanitizeUploadedArtifacts(parsed.uploaded_artifacts_summary);
    // M2.9B guided journey (ADR-036): the browser may send the SAFE, Rust-built `journey_context`
    // (whitelisted slugs/enums) + `current_step`. We RE-DERIVE our own view server-side through the same
    // Rust state machine and NEVER trust the browser copy. Absent/empty → a plain question.
    journey = deriveJourney(
      parsed.journey_context,
      typeof parsed.current_step === "string" ? parsed.current_step : undefined
    );
    // M2.10A structured documentary payload: when the operator arrives from a decision page (the
    // "Explicar com BanzAI" button), the client states WHICH document it is asking about instead of
    // hoping free text re-derives it. Sanitised to a canonical id shape here; the Rust registry is
    // still the only thing that decides whether that document exists.
    documentId = typeof parsed.document_id === "string" ? parsed.document_id.trim().slice(0, 32) : "";
    if (documentId && !/^(ADR|RFC)[- ]?\d{1,4}$/i.test(documentId)) documentId = "";

    // M2.8H short conversation context: accept the previous USER questions (most-recent last) so the
    // engine can resolve anaphoric follow-ups. Bounded & sanitized — only prior QUESTIONS are used
    // (never answers as a normative source), max 2 turns, each capped, never stored.
    const rawCtx = Array.isArray(parsed.context)
      ? parsed.context
      : Array.isArray(parsed.history)
      ? parsed.history
      : [];
    contextQuestions = rawCtx
      .map((t) => (typeof t === "string" ? t : t && (t.role === "user" || t.role === "tu") ? t.text || t.q || "" : ""))
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => String(s).slice(0, 400))
      .slice(-2);

    // Increment 6 (§16-§17) — the OPTIONAL, SAFE, technical-only conversation_context the client carries
    // forward from the previous turn's answer meta. It resolves anaphoric follow-ups ("essa execução",
    // "porquê?", "e as chaves?", "compare com a anterior", "agora reproduza", "mostre o recibo"). It is
    // sanitized here to the whitelisted TECHNICAL fields ONLY (ids/enums) — NEVER free text, PII, secrets or
    // the model's prose. There is NO server-side session store: the context is entirely client-carried, and
    // the deterministic Rust `resolve_references` (not the model) decides the referent. Absent → a plain turn.
    conversationContext = sanitizeConversationContext(parsed.conversation_context);
  } catch (e) {
    return { code: 400, body: { error: "bad_request", detail: e.message } };
  }
  if (!question || typeof question !== "string") {
    return { code: 400, body: { error: "missing_question", hint: 'POST {"question":"..."}' } };
  }
  question = String(question).slice(0, 2000);
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  // Increment 8 (§22) — the per-request observability collector. Wrapped tool calls (via toolRuntime)
  // record their { kind, outcome, duration_ms } here; the request AbortSignal is carried on it so a client
  // disconnect propagates to every in-flight tool. Runs the whole pipeline inside this context.
  const obsRecord = toolRuntime.startRequest(requestId, { signal });
  try {
    // M2.14E — call the pipeline DIRECTLY. The inference queue now lives INSIDE the pipeline and
    // wraps only the model-inference step (Tier 5); deterministic answers, the action & financial
    // boundaries, refusals and cache hits resolve before Tier 5 and never touch the queue. Only a
    // real model-bound request is queued (→ QUEUE_FULL/QUEUE_TIMEOUT/INFERENCE_TIMEOUT on overload).
    // M2.9B: pass the re-derived (Rust) journey step so source packing is step-influenced.
    const { result, meta } = await toolRuntime.withRequest(obsRecord, () =>
      pipeline.answer(question, {
        mode,
        contextQuestions,
        // Increment 6 — the SAFE, technical-only prior context the client carried forward (client-carried; no
        // server-side PII store). Rust `resolve_references` resolves the anaphora deterministically.
        conversationContext,
        journeyStep: journey?.current_step,
        documentId,
        // M2.11D (QA-2) — the journey's own answer to "what now?", already composed in Rust above.
        journeyNextActionSentence: journey?.next_action_sentence,
        // M2.14E — aborts a QUEUED inference if the client disconnects before we answer.
        signal,
        // M2.19G.5C (ADR-036) — request id for the safe post-validation audit line (never content).
        requestId,
        // SPR-2 — the Channel-A progress sink (only the SSE /ask/stream handler supplies it). Absent for
        // the plain /ask handler + every test + the eval, so pipeline behaviour is byte-identical there.
        onProgress,
      })
    );
    const elapsedMs = Date.now() - startedAt;
    const fallbackUsed = Boolean(meta.fallback_reason);
    // Per-request engine state: local_qwen degrades to "degraded" when the local model
    // was unavailable this request; otherwise the steady-state label.
    const engineState =
      result.provider === "local_qwen" && meta.degraded ? "degraded" : engineStateSteady();
    // The on-host local model was actually invoked FOR THIS answer only when the pipeline touched
    // the LLM tier this request (meta.llm_called) AND the destination was local. Cache hits set
    // meta.llm_called=false even though the stored result still carries model_called=true.
    const localGeneratedNow = Boolean(meta.llm_called) && result.inference_location === "local";
    // Served from cache and originally generated on-host by the local model (no new call now).
    const cachedLocal = Boolean(meta.cache) && result.inference_location === "local" && !meta.llm_called;
    // M2.14C — the global answer rendering contract (PRIMARY guarantee). Every response path is
    // normalized here at the single choke point: the body carries only the answer, sources live only in
    // `sources[]` (deduped; any residual in-body "Fonte(s):/Fontes citáveis:/Sources:" block is removed
    // and its real, known references folded into sources[]). Never removes an existing source. Computed
    // BEFORE the usage record so the honest, post-normalization grounded/validation state is logged too.
    const contract = normalizeBanzaiAnswer(result.answer, result.sources);
    // M2.19G.5C (ADR-036) — post-normalization re-assertion. normalizeBanzaiAnswer drops INTERNAL sources
    // (isPublicSource). If that leaves a grounded MODEL answer (the live/cached synthesis family — never a
    // deterministic terminal like the journey next-step, which is legitimately grounded without a document
    // citation) with ZERO public citations, it must NOT be published as grounded: a grounded claim with no
    // citation is not publishable. Demote to a safe non-grounded envelope.
    const groundedPublishable =
      Boolean(result.grounded) &&
      !(!meta.deterministic && (!Array.isArray(contract.sources) || contract.sources.length === 0));
    // M2.19G.5C (ADR-036) — honest three-state validation_status. `rejected` when the post-
    // validator blocked the model answer this turn; `passed` when a model answer actually passed the gate
    // (model called, grounded, no fallback); `n/a` otherwise (deterministic terminal, cache hit where
    // llm_called=false, insufficient, or any non-post-validation degrade). Never a disguised constant.
    // `passed` requires the gate to have actually passed: under the non-default enforce-OFF kill-switch a
    // gate-FAILED model answer is still published (observe-only) with post_validate_ok===false and no
    // fallback_reason — that must NOT be labelled `passed`; it reports `n/a` (honest: neither a clean pass
    // nor a block). Under the default (enforce ON) a failure degrades via emergency() → `rejected`.
    const validationStatus =
      meta.fallback_reason && String(meta.fallback_reason).startsWith("post_validation_")
        ? "rejected"
        : meta.llm_called === true &&
            groundedPublishable === true &&
            !meta.fallback_reason &&
            meta.post_validate_ok !== false
          ? "passed"
          : "n/a";
    // Safe usage record: no keys, no secrets, no full question/answer bodies.
    console.log(
      JSON.stringify({
        level: "info",
        msg: "ask",
        request_id: requestId,
        provider: result.provider,
        engine_state: engineState,
        inference_location: result.inference_location ?? provider.inferenceLocation ?? "none",
        grounded: result.grounded,
        entry_id: result.entry_id ?? null,
        cache: meta.cache,
        deterministic: meta.deterministic,
        llm_called: meta.llm_called,
        fallback: fallbackUsed,
        answer_mode: meta.answer_mode,
        fallback_reason: meta.fallback_reason ?? null,
        estimated_tokens: meta.estimated_tokens ?? 0,
        estimated_cost_usd: meta.estimated_cost_usd ?? 0,
        elapsed_ms: elapsedMs,
        question_chars: question.length,
        // M2.14E — queue telemetry (safe counts only, never content). `queued` = this answer went
        // through the model-inference step (the only queued path); running/pending are current depth.
        queued: Boolean(meta.llm_called),
        queue_running: inferenceQueue.stats().running,
        queue_pending: inferenceQueue.stats().pending,
        outcome: "ok",
        // external_model_called stays false for on-host local inference — the whole point of ADR-036.
        external_model_called: provider.externalCallsMade > 0,
        // M2.19G.5C (ADR-036) — safe post-synthesis-validator telemetry (enums/booleans only, never
        // content). post_validate_ran is true only on the grounded model publish path; validation_status
        // is the honest three-state derived above.
        post_validate_ran: Boolean(meta.post_validate_ran),
        post_validate_ok: meta.post_validate_ran ? Boolean(meta.post_validate_ok) : null,
        post_validate_reason: meta.post_validate_reason ?? null,
        validation_status: validationStatus,
      })
    );
    // Increment 8 (§22) — ONE typed observability record per request, EXTENDING the reasoning_trace with
    // the tool plan, per-tool durations + outcomes, total duration, sources, verification counts and the
    // typed error. Built from safe fields only (ids/enums/counts/band) + scrubbed (no secret/PII/prompt/
    // CoT/content). Surfaced in the /ask meta AND logged as structured JSON.
    const observability = buildObservabilityRecord(meta, result, {
      requestId,
      elapsedMs,
      toolEvents: obsRecord.events,
      sources: Array.isArray(contract.sources) ? contract.sources.map((s) => (s && s.id) || "").filter(Boolean) : [],
    });
    console.log(JSON.stringify({ level: "info", msg: "observability", ...observability }));
    // Increment 8 (§23) — record this request into the in-process SLO aggregator (numbers only). A clean
    // answer is available; a fallback/deterministic/model flag drives the SLO rates.
    slo.recordRequest({
      latency_ms: elapsedMs,
      error: false,
      fallback: fallbackUsed,
      deterministic: Boolean(meta.deterministic),
      model_called: Boolean(meta.llm_called),
    });
    return {
      code: 200,
      // SPR-2 — `result` + `meta` are returned ALONGSIDE {code, body} for the SSE /ask/stream handler only:
      // it classifies the typed response_disposition from them to pick + label the terminal event. The plain
      // /ask route uses unwrap({code, body}) and ignores these, so its envelope is byte-identical.
      result,
      meta,
      body: {
        request_id: requestId,
        question,
        answer: contract.answer,
        grounded: groundedPublishable,
        sources: contract.sources,
        sources_count: Array.isArray(contract.sources) ? contract.sources.length : 0,
        mode: result.mode,
        provider: result.provider,
        engine_state: engineState,                       // mock | local_qwen | degraded | external_hosted
        inference_location: result.inference_location ?? provider.inferenceLocation ?? "none",
        external_model_called: provider.externalCallsMade > 0,
        // Per-answer execution-path proof (ADR-036): whether THIS answer called the on-host
        // local model, or came from the deterministic/cache/insufficient path. Safe telemetry
        // only — never the prompt, system prompt, reasoning or content internals.
        //
        // Gate on meta.llm_called (the THIS-answer signal), NOT result.model_called: on a cache
        // hit `result` is a PREVIOUS generation's stored object (model_called still true), but no
        // model call happened this request — so it must NOT be labelled a live Qwen generation.
        local_model_called: localGeneratedNow,
        local_model_name: localGeneratedNow ? (result.model_name || null) : null,
        // A cached answer that was originally produced on-host by the local model, served WITHOUT
        // a new model call this request (distinct from a deterministic template).
        cache: meta.cache ?? null,
        cached_local: cachedLocal,
        insufficient_sources: groundedPublishable === false,
        // M2.8G routing intent (ADR-036): grounded | critical_boundary | safety_refusal | no_source.
        intent: meta.intent ?? null,
        // M2.14F answer-composition type (capabilities_and_limits | yes_no_with_boundary | comparison |
        // how_it_works | example_safe | implementation_stack | governance_explanation |
        // operator_zero_guidance | financial_concept | safe_refusal | definition | follow_up_expansion |
        // fallback_clarification). Telemetry/composition label re-derived in Rust — never alters routing.
        // ADR-036: a typed operational answer carries its own answer_type from the pipeline; prefer it.
        answer_type: meta.answer_type || answerType(question),
        // ADR-036 — operational reasoning surface: the deterministic terminal kind, the typed duration
        // view (measured numbers, for the UI's typed block) and the claim taxonomy. Passed through so the
        // UI renders the duration block + the honest measurement-gap label instead of the fixed list.
        terminal_kind: meta.terminal_kind ?? null,
        duration: meta.duration ?? null,
        operational_claims: Array.isArray(meta.claims) ? meta.claims : null,
        telemetry_scope: meta.telemetry_scope ?? null,
        // Increment 2 (§2/§4) — the CONTEXTUAL fallback surface. When an understood-but-unmapped, NON-boundary
        // question is declined, Rust authors a request-oriented message (never the fixed topic list) and this
        // reports its typed shape (understood_data_missing | ambiguous | tool_unavailable | out_of_scope |
        // insufficient_source), the interpreted primary intent, and any detected compound sub-intents. Null
        // when the answer is not a contextual decline. Safe labels only.
        contextual_fallback_kind: meta.contextual_fallback_kind ?? null,
        interpreted_intent: meta.interpreted_intent ?? null,
        interpreted_sub_intents: Array.isArray(meta.interpreted_sub_intents) ? meta.interpreted_sub_intents : [],
        // Increment 3 — the typed ToolPlanner (§5/§6). The deterministic, Rust-decided ordered tool plan
        // for this question (which typed tools to call, in what order, with what declared contract). The
        // model NEVER selects a tool; a boundary/refusal resolution yields exactly [HONEST_FALLBACK]. Public-
        // safe metadata only ({schema_version, primary_intent, steps:[{kind,reason,entity,scope,required,
        // executable}], notes}); a later increment (Inc.4/5) invokes the executable kinds via the toolplan.js
        // adapter. Prefer a plan the pipeline already computed; else derive it deterministically here.
        tool_plan: meta.tool_plan ?? planTools(question),
        // Increment 4 (§7) — the compact, transversal FactualPackage the answer was built from, BEFORE any
        // linguistic synthesis (documentary trunk AND the operational/telemetry path). Structured provenance
        // only (normalized question, resolved intents + sub-intents, scope, freshness, documentary/live/tool
        // source counts, tool plan + tools called, calculations/aggregation/sample, allowed/forbidden claims,
        // uncertainties, unsupported inferences, package checksum) — never secrets, PII or free model text.
        // Null on the terminal paths that build no package (safety refusal, canonical definition, clarify).
        factual_package: meta.factual_package ?? null,
        // Increment 5 (§10–§15) — the resolved question FAMILY (get_reason_code / compare_executions /
        // diagnose_failure / evaluate_hypothesis / get_requirement / get_applicability / get_api_guidance /
        // get_security_explanation / get_governance_decision / get_version_change) and the tool-result
        // provenance the family answer was built from. Null on the non-family paths. Public-safe metadata
        // only — the same tools_called / tool_plan / factual_package already prove the grounding.
        question_family: meta.question_family ?? null,
        family_tool_results: Array.isArray(meta.tool_results) ? meta.tool_results : null,
        claim_verification_ok: meta.claim_verification_ok ?? null,
        // M2.8H conversation-context telemetry (safe booleans/counts only — never conversation content).
        conversation_context_used: Boolean(meta.conversation_context_used),
        context_turns_used: meta.context_turns_used ?? 0,
        previous_sources_reused: Boolean(meta.previous_sources_reused),
        // Increment 6 (§16-§17) — the NEW, SAFE, technical-only conversation_context the CLIENT carries to the
        // next turn (client-carried; no server-side PII store). ONLY the whitelisted technical fields (ids/
        // enums) — never free text, PII, secrets or the model's prose. Plus the safe reference-resolution
        // trace (state/referent/intent/execution id) — deterministic Rust, never the model.
        conversation_context: meta.conversation_context ?? sanitizeConversationContext(conversationContext),
        reference_resolution_state: meta.reference_resolution_state ?? "NO_ANAPHORA",
        reference_referent_kind: meta.reference_referent_kind ?? "none",
        reference_resolved_intent: meta.reference_resolved_intent ?? "",
        reference_execution_id: meta.reference_execution_id ?? null,
        // BZCI-2 (§3/§25) — the typed turn class + inherited-intent / resolved-subject skeleton (safe labels).
        reference_turn_type: meta.reference_turn_type ?? "STANDALONE",
        reference_resolved_subject: meta.reference_resolved_subject ?? "",
        reference_inherited_intent: meta.reference_inherited_intent ?? "",
        // M2.9B guided-journey telemetry (ADR-036). All re-derived in Rust from the browser input; safe
        // slugs/enums only — never raw drafts, keys or secrets. `journey_context_used` is true only when
        // usable journey input arrived AND was re-derived; step_statuses/summary echo the Rust view.
        journey_context_used: Boolean(journey),
        current_step: journey?.current_step ?? null,
        journey_step: journey?.current_step ?? null,
        next_recommended_action: journey?.next_recommended_action ?? null,
        session_state_summary: journey?.session_state_summary ?? null,
        step_statuses: journey?.step_statuses ?? [],
        // M2.10A — documentary resolution telemetry. Safe metadata only: canonical id/type/title,
        // the repository-relative path of a PUBLIC decision record, and a content hash. It never
        // carries the prompt, the system rules, raw logs or any sensitive path.
        explicit_reference_detected: Boolean(meta.explicit_reference_detected),
        explicit_reference_source: meta.explicit_reference_source ?? null,
        resolved_document_id: meta.resolved_document_id ?? null,
        resolved_document_type: meta.resolved_document_type ?? null,
        resolved_document_path: meta.resolved_document_path ?? null,
        resolved_document_title: meta.resolved_document_title ?? null,
        resolved_document_status: meta.resolved_document_status ?? null,
        resolved_document_hash: meta.resolved_document_hash ?? null,
        document_not_found: Boolean(meta.document_not_found),
        tool: meta.tool ?? null,
        // BZC (Cobertura Integral) — entity + artifact + scope + authority + live-tool provenance. The
        // Rust resolver (artifact::resolve_scope) decides entity/artifact/scope; when an implementation
        // artifact is fetched live (BZC-2), the observed origin/version/profile/environment/sha256/
        // observed_at + authority are surfaced here so the interface can show WHICH entity, WHICH artifact,
        // WHOSE scope, WHICH tool and WHICH source proved the answer. Public-safe metadata only (all values
        // already appear in the answer body); null when the question resolved no ecosystem entity.
        scope_resolution: meta.entity_id
          ? {
              entity_id: meta.entity_id,
              entity_type: meta.entity_type ?? null,
              entity_display: meta.entity_display ?? null,
              operator_id: meta.operator_id ?? null,
              implementation_id: meta.implementation_id ?? null,
              protocol_scope: meta.protocol_scope ?? null,
              artifact_type: meta.artifact_type ?? null,
              requires_live_tool: Boolean(meta.requires_live_tool),
              authority_requirement: meta.authority_requirement ?? null,
              resolution_method: meta.resolution_method ?? null,
              tool: meta.requires_live_tool ? "banza-artifact-fetcher" : null,
              // live-fetched artifact observation (present only on the entity_artifact_live_fetched terminal)
              canonical_origin: meta.canonical_origin ?? null,
              artifact_url: meta.artifact_url ?? null,
              artifact_sha256: meta.artifact_sha256 ?? null,
              artifact_observed_at: meta.artifact_observed_at ?? null,
              artifact_version: meta.artifact_version ?? null,
              artifact_protocol_version: meta.artifact_protocol_version ?? null,
              artifact_profile: meta.artifact_profile ?? null,
              artifact_environment: meta.artifact_environment ?? null,
              authority_kind: meta.authority_kind ?? null,
              authority_scope: meta.authority_scope ?? null,
              tls_verified: meta.tls_verified ?? null,
              digest_matches: meta.digest_matches ?? null,
            }
          : null,
        // M2.10B — documentary answer shape + budget honesty.
        document_mode: meta.document_mode ?? null,
        document_answer_truncated: Boolean(meta.document_answer_truncated),
        cacheable: meta.cacheable ?? null,
        cache_invalidated_reason: meta.cache_invalidated_reason ?? null,
        index_version: meta.index_version ?? null,
        cache_hit: Boolean(meta.cache),
        // M2.19G.5C (ADR-036) — honest three-state validation_status (rejected | passed | n/a),
        // derived above from the real post-validation gate outcome. Never a disguised constant "passed".
        validation_status: validationStatus,
        // SPR-4 §5 / SPR-3 — structured-generation + latency-decomposition + coverage transparency
        // (safe counts/enums only): whether the model authored only the linguistic core (cited_source_ids
        // derived), the llama.cpp timings for a fresh synthesis, the answer source (fresh_synthesis |
        // validated_cache), and the validated-cache key dimensions. Null on paths that don't set them.
        synthesis_structured: Boolean(meta.synthesis_structured),
        synthesis_timings: meta.synthesis_timings ?? null,
        answer_source: meta.answer_source ?? null,
        cache_key_dimensions: meta.cache_key_dimensions ?? null,
        // M2.9C — SAFE upload telemetry (names/sizes only; never the raw file, never persisted).
        uploaded_artifacts_used: uploadedArtifacts.length > 0,
        uploaded_artifacts_count: uploadedArtifacts.length,
        uploaded_artifacts_summary: uploadedArtifacts,
        benchmark_approved: BENCHMARK_APPROVED,
        default_effective: provider.name === "local_qwen" && BENCHMARK_APPROVED,
        degraded: Boolean(meta.degraded),
        // Stale on a cache hit → surface only for a real this-answer generation.
        tokens_generated: localGeneratedNow ? (result.tokens_generated ?? null) : null,
        finish_reason: localGeneratedNow ? (result.finish_reason ?? null) : null,
        fallback: fallbackUsed,
        fallback_reason: meta.fallback_reason ?? null,
        non_normative: true,                             // BanzAI output is never a protocol rule
        elapsed_ms: elapsedMs,
        latency_ms: elapsedMs,
        guardrails: result.guardrails,
        meta: {
          answer_mode: meta.answer_mode,
          deterministic: meta.deterministic,
          cache: meta.cache,
          llm_called: meta.llm_called,
          ...(meta.degraded ? { degraded: true } : {}),
          ...(meta.fallback_reason ? { fallback_reason: meta.fallback_reason } : {}),
        },
        // M2.18B.1 — public-safe, versioned reasoning trace (present on EVERY path: fast-path,
        // grounded synthesis, clarification, boundary, fallback). Lets the eval harness + operators
        // measure BanzAI without leaking prompt/raw-output/exact-confidence/internal paths.
        reasoning_trace: buildReasoningTrace(meta, result, requestId, INTENT_TRACE_DIAGNOSTIC),
        // Increment 8 (§22) — the ONE typed observability record for this request (EXTENDS the trace with
        // the tool plan, per-tool durations + outcomes, total duration, sources, verification counts and
        // the typed error). Safe fields only — scrubbed of any secret/PII/prompt/CoT/content.
        observability,
        disclaimer:
          "BanzAI guia, invoca os motores e cita fontes; não certifica, não decide e não substitui a conformance suite. PASS é evidência verificável, não certificado.",
      },
    };
  } catch (err) {
    // Fail safe with JSON — never a crash, never a retry, never a key in the body.
    // M2.14E — the client disconnected while its inference was queued. The connection is gone; any
    // body is moot (sendJson to a closed socket is a harmless no-op). Do not count it as an error.
    if (err.code === "QUEUE_CANCELLED") {
      return { code: 499, body: { error: "client_closed", request_id: requestId } };
    }
    // Increment 8 (§23) — a real error path (busy / timeout / upstream / internal). Record it into the SLO
    // aggregator so error_rate + availability reflect it (numbers only; the client disconnect above is not
    // an error and is excluded).
    slo.recordRequest({ latency_ms: Date.now() - startedAt, error: true, fallback: false, deterministic: false, model_called: false });
    // M2.14E — the bounded inference queue is full (too many model-bound requests in flight). This is
    // professional backpressure, not a crash: a clean 503 with a safe, non-technical public message
    // (Rust single source of truth). Deterministic/boundary/cache answers never reach this path.
    if (err.code === "QUEUE_FULL") {
      return {
        code: 503,
        body: {
          error: "busy",
          request_id: requestId,
          public_message: queuePublicMessage("busy"),
          engine_state: engineStateSteady(),
          guardrails: GUARDRAILS,
        },
      };
    }
    // M2.14E — the request waited (queue) or ran (inference) longer than the configured budget.
    if (err.code === "QUEUE_TIMEOUT" || err.code === "INFERENCE_TIMEOUT") {
      return {
        code: 504,
        body: {
          error: "timeout",
          request_id: requestId,
          public_message: queuePublicMessage("timeout"),
          engine_state: engineStateSteady(),
          guardrails: GUARDRAILS,
        },
      };
    }
    if (err.code === "LLM_KEY_MISSING") {
      return {
        code: 503,
        body: {
          error: "llm_key_missing",
          request_id: requestId,
          detail: err.message,
          hint: "Set LLM_API_KEY for a hosted provider (never in Git), or use LLM_PROVIDER=mock / local_qwen.",
          guardrails: GUARDRAILS,
        },
      };
    }
    if (err.code === "LLM_UPSTREAM_ERROR") {
      return {
        code: 502,
        body: {
          error: "llm_upstream_error",
          request_id: requestId,
          detail: err.message,
          hint: "The hosted LLM provider did not answer. BanzAI degrades gracefully; it never fabricates.",
          guardrails: GUARDRAILS,
        },
      };
    }
    return { code: 500, body: { error: "internal_error", request_id: requestId } };
  }
}

// POST /ask/stream — SPR-2, the Safe Progressive Response SSE endpoint.
//
// It runs the SAME production pipeline as /ask (identical routing, validation and envelope) with a Channel-A
// progress sink, and streams typed progress events as `event: <KIND>\ndata: <json>\n\n`. Every progress
// event carries ONLY public-safe data (ids/enums/counts/hashes/durations) — NEVER a prompt, chain-of-thought,
// secret, cookie, token, private content or a raw model token. There is NO model-token/delta event: the
// validated answer arrives ONCE, whole, inside the terminal FINAL_VALIDATED event — AFTER generation →
// candidate → ADR-036 post-synthesis validator → normalizeBanzaiAnswer → Inc.4 claim + citation verification
// → boundaries confirmed. The terminal event is chosen from the typed response_disposition (never from the
// raw `grounded`): a boundary/refusal → REFUSED (REQUEST_ACCEPTED [+INTENT_RESOLVED] then REFUSED, NO
// synthesis events); a deterministic terminal → FINAL_VALIDATED (only the stages that ran, NO model-synthesis
// /claim-verification events); a validated synthesis → FINAL_VALIDATED (the ONLY place prose is emitted); a
// post-validation failure → HONEST_FALLBACK (the degraded/true answer, NEVER the rejected model text). The
// stream always ends with a DONE event. Client disconnect → CANCELLED (server-side state); the in-flight
// llama.cpp inference is cancelled, its M2.14E queue slot freed, and NOTHING is persisted or cached.
async function askStream(req, res) {
  // SSE transport headers — text/event-stream, no store, no proxy buffering, keep-alive.
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
  });

  // Cooperative cancellation (Inc.8 wiring): a client disconnect BEFORE we finish aborts the request signal
  // so a QUEUED inference is dropped and its slot freed — no orphaned generation. A `close` after a normal
  // end has writableEnded=true, so this never aborts an already-answered stream.
  const ac = new AbortController();
  let clientGone = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientGone = true;
      ac.abort();
    }
  });

  let seq = 0;
  let requestId = null;
  // The SSE write sink — serialize each event to a frame. A write to a closed socket is a harmless no-op.
  const write = (evt) => {
    try {
      if (evt && evt.request_id && !requestId) requestId = evt.request_id;
      res.write(sseFrame(evt));
      if (evt && Number.isFinite(evt.seq) && evt.seq >= seq) seq = evt.seq + 1;
    } catch {
      /* socket closed — no-op */
    }
  };
  // onProgress receives the FULL, already-scrubbed Channel-A event from the pipeline (no prose/secret).
  const onProgress = (evt) => write(evt);

  let out;
  try {
    out = await ask(req, ac.signal, onProgress);
  } catch (err) {
    // ask() is itself fail-safe; this is defence in depth. Never a stack/secret on the wire.
    out = { code: 500, body: { error: "internal_error" } };
  }

  const rid = requestId || (out && out.body && out.body.request_id) || null;
  const term = (kind, { final = null, disposition = null, boundaryContext = null } = {}) =>
    write(makeTerminalEvent(kind, final, { seq: seq++, requestId: rid, disposition, boundaryContext }));
  const done = () => write({ kind: "DONE", schema: PROGRESS_SCHEMA_TOKEN, seq: seq++, request_id: rid });

  // Client already gone → server-side CANCELLED. The pipeline threw QUEUE_CANCELLED before any cache/persist,
  // so nothing is stored. The terminal frames are no-ops on the closed socket but keep the state honest.
  if (clientGone || (out && out.code === 499)) {
    term("CANCELLED");
    done();
    if (!res.writableEnded) res.end();
    return;
  }

  if (out && out.code === 200 && out.body) {
    // React to the typed response_disposition (never the raw `grounded`). The terminal carries the SAME
    // finished /ask envelope. Validated model prose is emitted ONLY here, after the whole validation chain.
    const { disposition, boundary_context, event } = progressDisposition(out.result, out.meta);
    term(event, { final: out.body, disposition, boundaryContext: event === "REFUSED" ? boundary_context : null });
    done();
    if (!res.writableEnded) res.end();
    return;
  }

  // Any non-200, non-cancel outcome (rate limit / busy / timeout / upstream / internal). SSE headers are
  // already committed (200), so the failure rides in-band as a safe ERROR event (a code + the professional
  // public message — never a stack trace or secret), then DONE. Deterministic/boundary answers never reach
  // an error terminal; this is the queue-capacity / provider-outage / internal path only.
  const b = (out && out.body) || {};
  term("ERROR", {
    final: {
      error: b.error || "error",
      public_message: b.public_message || null,
      request_id: rid,
      guardrails: GUARDRAILS,
    },
  });
  done();
  if (!res.writableEnded) res.end();
}

// GET /sources — the source corpus BanzAI can cite (fixtures in this phase). M2.18: internal
// sources (assistant-instruction / secret files, e.g. CLAUDE.md) are filtered by the public-source
// policy, so no endpoint — not even this operator-internal one — presents them as citable.
function sources() {
  const pub = Object.values(SOURCES).filter(isPublicSource);
  return {
    code: 200,
    body: {
      mode: provider.name,
      count: pub.length,
      sources: pub,
      topics: ENTRIES.map((e) => e.id),
      note: "Local fixtures. The production indexer populates pgvector from the same protocol documents.",
    },
  };
}

// POST /index — indexer entry point. Dry-run in this phase: reports what WOULD be
// indexed without embeddings, GPU, model downloads, or DB writes.
function indexDryRun() {
  const pub = Object.values(SOURCES).filter(isPublicSource); // M2.18 public-source policy
  return {
    code: 200,
    body: {
      mode: "dry-run",
      would_index: pub,
      documents: pub.length,
      embeddings_computed: 0,
      note: "Dry-run only. No embeddings computed, no model loaded, no GPU used, no DB write. The real indexer runs separately against pgvector.",
    },
  };
}

// M2.19G.1 — sanitize a registry id to a safe closed shape. A validation target is ALWAYS an
// (operator_id, implementation_id) pair resolved against the closed registry — never a URL. Any URL,
// path, scheme or injection character is stripped here, so a caller can never smuggle a fetch target.
function safeId(v, max = 64) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, max);
}

// POST /validate/step  { operator_id, implementation_id, step }
async function validateStepReq(req) {
  const limit = rateLimiter.allow(clientId(req));
  if (!limit.allowed) {
    return {
      code: 429,
      body: { error: "rate_limited", public_message: queuePublicMessage("rate_limited"), retry_after_ms: limit.retry_after_ms },
    };
  }
  let operatorId = "";
  let implementationId = "";
  let step = "";
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    operatorId = safeId(parsed.operator_id);
    implementationId = safeId(parsed.implementation_id);
    step = String(parsed.step || "").trim().toLowerCase().replace(/[^a-z_]/g, "").slice(0, 40);
  } catch (e) {
    return { code: 400, body: { error: "bad_request", detail: e.message } };
  }
  if (!operatorId || !implementationId) {
    return { code: 400, body: { error: "missing_target", hint: 'POST {"operator_id":"...","implementation_id":"...","step":"..."}' } };
  }
  try {
    const out = await validator.validateStep(operatorId, implementationId, step);
    if (out.error === "unknown_step") return { code: 400, body: out };
    if (out.error === "target_not_resolved") return { code: 404, body: out };
    return { code: 200, body: out };
  } catch (err) {
    return { code: 502, body: { error: "validation_error", detail: err.message } };
  }
}

// POST /validate/journey  { operator_id, implementation_id }
async function validateJourneyReq(req) {
  const limit = rateLimiter.allow(clientId(req));
  if (!limit.allowed) {
    return {
      code: 429,
      body: { error: "rate_limited", public_message: queuePublicMessage("rate_limited"), retry_after_ms: limit.retry_after_ms },
    };
  }
  let operatorId = "";
  let implementationId = "";
  try {
    const raw = await readBody(req, 16 * 1024);
    const parsed = raw ? JSON.parse(raw) : {};
    operatorId = safeId(parsed.operator_id);
    implementationId = safeId(parsed.implementation_id);
  } catch (e) {
    return { code: 400, body: { error: "bad_request", detail: e.message } };
  }
  if (!operatorId || !implementationId) {
    return { code: 400, body: { error: "missing_target", hint: 'POST {"operator_id":"...","implementation_id":"..."}' } };
  }
  try {
    const out = await validator.validateJourney(operatorId, implementationId);
    if (out.error === "target_not_resolved") return { code: 404, body: out };
    return { code: 200, body: out };
  } catch (err) {
    return { code: 502, body: { error: "validation_error", detail: err.message } };
  }
}

// ── ADR-036 durable receipt-store read/reproduce/cancel routes ───────────────────────────────────
// Reads are scoped to the PUBLIC workspace only — a browser-supplied workspace/owner is NEVER trusted
// (anti-enumeration). Every validation run today uses public artefacts (incl. Operador Zero, which has
// NO privileged path). When the store is disabled the surface self-describes with 503, never a fake.
const PUBLIC_WS = "public";

function receiptsDisabled() {
  return { code: 503, body: { error: "receipts_disabled", detail: "The durable validation receipt store is not enabled in this environment." } };
}

// GET /validate/executions?implementation_id=...
async function listExecutionsReq(req, url) {
  if (!receiptStore.isEnabled()) return receiptsDisabled();
  const implementationId = safeId(url.searchParams.get("implementation_id") || "");
  if (!implementationId) return { code: 400, body: { error: "missing_implementation_id" } };
  try {
    return { code: 200, body: { ok: true, executions: await validator.listExecutions(implementationId, PUBLIC_WS) } };
  } catch (err) {
    return { code: 502, body: { error: "receipts_read_error", detail: err.message } };
  }
}

// GET /validate/execution?execution_id=...  (verifies each stored receipt digest on read)
async function getExecutionReq(req, url) {
  if (!receiptStore.isEnabled()) return receiptsDisabled();
  const executionId = safeId(url.searchParams.get("execution_id") || "");
  if (!executionId) return { code: 400, body: { error: "missing_execution_id" } };
  try {
    const out = await validator.getExecution(executionId, PUBLIC_WS);
    if (!out) return { code: 404, body: { error: "execution_not_found" } };
    return { code: 200, body: { ok: true, ...out } };
  } catch (err) {
    return { code: 502, body: { error: "receipts_read_error", detail: err.message } };
  }
}

// GET /validate/compare?a=...&b=...
async function compareExecutionsReq(req, url) {
  if (!receiptStore.isEnabled()) return receiptsDisabled();
  const a = safeId(url.searchParams.get("a") || "");
  const b = safeId(url.searchParams.get("b") || "");
  if (!a || !b) return { code: 400, body: { error: "missing_execution_ids", hint: "?a=<execution_id>&b=<execution_id>" } };
  try {
    const out = await validator.compareExecutions(a, b, PUBLIC_WS);
    if (out && out.error === "execution_not_found") return { code: 404, body: out };
    return { code: 200, body: { ok: true, comparison: out } };
  } catch (err) {
    return { code: 502, body: { error: "receipts_read_error", detail: err.message } };
  }
}

// POST /validate/reproduce  { operator_id, implementation_id, original_execution_id }
async function reproduceReq(req) {
  const limit = rateLimiter.allow(clientId(req));
  if (!limit.allowed) return { code: 429, body: { error: "rate_limited", public_message: queuePublicMessage("rate_limited"), retry_after_ms: limit.retry_after_ms } };
  if (!receiptStore.isEnabled()) return receiptsDisabled();
  let operatorId = "", implementationId = "", originalExecutionId = "";
  try {
    const raw = await readBody(req, 16 * 1024);
    const parsed = raw ? JSON.parse(raw) : {};
    operatorId = safeId(parsed.operator_id);
    implementationId = safeId(parsed.implementation_id);
    originalExecutionId = safeId(parsed.original_execution_id);
  } catch (e) {
    return { code: 400, body: { error: "bad_request", detail: e.message } };
  }
  if (!operatorId || !implementationId || !originalExecutionId) {
    return { code: 400, body: { error: "missing_fields", hint: 'POST {"operator_id","implementation_id","original_execution_id"}' } };
  }
  try {
    const out = await validator.reproduceJourney(operatorId, implementationId, originalExecutionId, { workspace: PUBLIC_WS });
    if (out.error === "target_not_resolved") return { code: 404, body: out };
    return { code: 200, body: out };
  } catch (err) {
    return { code: 502, body: { error: "reproduction_error", detail: err.message } };
  }
}

// POST /validate/cancel  { execution_id }
async function cancelReq(req) {
  if (!receiptStore.isEnabled()) return receiptsDisabled();
  let executionId = "";
  try {
    const raw = await readBody(req, 4 * 1024);
    const parsed = raw ? JSON.parse(raw) : {};
    executionId = safeId(parsed.execution_id);
  } catch (e) {
    return { code: 400, body: { error: "bad_request", detail: e.message } };
  }
  if (!executionId) return { code: 400, body: { error: "missing_execution_id" } };
  try {
    return { code: 200, body: { ok: true, ...(await validator.cancelExecution(executionId, PUBLIC_WS)) } };
  } catch (err) {
    return { code: 502, body: { error: "cancel_error", detail: err.message } };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (req.method === "GET" && path === "/health") return sendJson(res, ...unwrap(health()));
    if (req.method === "GET" && path === "/sources") return sendJson(res, ...unwrap(sources()));
    if (req.method === "POST" && path === "/ask") {
      // M2.14E — cooperative cancellation: if the client disconnects BEFORE we answer, abort so a
      // QUEUED inference is dropped and its slot freed. `res` "close" after a normal send has
      // writableEnded=true, so this never aborts an already-answered request.
      const ac = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) ac.abort();
      });
      return sendJson(res, ...unwrap(await ask(req, ac.signal)));
    }
    // SPR-2 — the Safe Progressive Response SSE endpoint. Same-origin under nginx `location = /banzai/ask/
    // stream`. askStream owns its own SSE response lifecycle (headers, streamed events, terminal, DONE, end)
    // and its own client-disconnect AbortController, so it does NOT go through sendJson/unwrap.
    if (req.method === "POST" && path === "/ask/stream") {
      await askStream(req, res);
      return;
    }
    if (path === "/ask/stream") return sendJson(res, 405, { error: "method_not_allowed", allow: "POST" });
    if (req.method === "POST" && path === "/index") return sendJson(res, ...unwrap(indexDryRun()));
    // M2.19G.3B — read-only CANONICAL registry catalogue (dynamic operator+implementation selection
    // source for "Validar operador") + option sets (supported protocol version/profile/environment for
    // the onboarding dropdowns). Rust-sourced (banza-target-registry WASM); 0 model calls; ETag +
    // short public cache. The browser reads these instead of any hardcoded TS registry/option arrays.
    if (req.method === "GET" && (path === "/validate/registry" || path === "/validate/options")) {
      const body = path === "/validate/registry" ? validator.catalogue() : validator.options();
      const etag = '"' + crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 32) + '"';
      const headers = { "Cache-Control": "public, max-age=300", ETag: etag };
      if ((req.headers["if-none-match"] || "") === etag) {
        res.writeHead(304, { ...headers, "X-Content-Type-Options": "nosniff" });
        return res.end();
      }
      return sendJson(res, 200, body, headers);
    }
    if (path === "/validate/registry" || path === "/validate/options") return sendJson(res, 405, { error: "method_not_allowed", allow: "GET" });
    // M2.19G.5C (ADR-036) — public runtime SSOT. nginx maps public /banzai/runtime → this internal
    // /runtime. GET only; secret-free projection; short public cache (state is volatile) + a weak
    // content-hash ETag. A NEW handler, not a public proxy of the internal /health.
    if (req.method === "GET" && path === "/runtime") {
      const { code, body } = runtime();
      const etag = 'W/"' + crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 32) + '"';
      return sendJson(res, code, body, { "Cache-Control": "public, max-age=15", ETag: etag });
    }
    if (path === "/runtime") return sendJson(res, 405, { error: "method_not_allowed", allow: "GET" });
    // Increment 8 (§23) — public, read-only SLO/metrics surface. nginx maps public /banzai/slo → this
    // internal /slo. GET only; secret-free numbers only (p50/p95/p99 latency, availability, error/fallback
    // rate, %deterministic/%model, per-tool availability + mean cost); short public cache (state is
    // volatile). A NEW handler — never a proxy of the internal /health.
    if (req.method === "GET" && path === "/slo") {
      const { code, body } = sloSurface();
      const etag = 'W/"' + crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 32) + '"';
      return sendJson(res, code, body, { "Cache-Control": "public, max-age=15", ETag: etag });
    }
    if (path === "/slo") return sendJson(res, 405, { error: "method_not_allowed", allow: "GET" });
    // M2.19G.1 (ADR-034) — endpoint-originated operator validation. Same-origin under nginx
    // `location /banzai/validate/` (like `/banzai/ask`). The browser calls these; the fetch happens
    // in the Rust fetcher. Explicit 405 for the wrong method on each so the surface self-describes.
    if (req.method === "POST" && path === "/validate/step") return sendJson(res, ...unwrap(await validateStepReq(req)));
    if (req.method === "POST" && path === "/validate/journey") return sendJson(res, ...unwrap(await validateJourneyReq(req)));
    if (path === "/validate/step" || path === "/validate/journey") return sendJson(res, 405, { error: "method_not_allowed", allow: "POST" });
    // ADR-036 — durable receipt store: history / open / compare / reproduce / cancel. Same-origin under
    // nginx `location /banzai/validate/`. Reads are GET + PUBLIC-workspace-scoped; reproduce/cancel POST.
    if (req.method === "GET" && path === "/validate/executions") return sendJson(res, ...unwrap(await listExecutionsReq(req, url)));
    if (req.method === "GET" && path === "/validate/execution") return sendJson(res, ...unwrap(await getExecutionReq(req, url)));
    if (req.method === "GET" && path === "/validate/compare") return sendJson(res, ...unwrap(await compareExecutionsReq(req, url)));
    if (path === "/validate/executions" || path === "/validate/execution" || path === "/validate/compare") return sendJson(res, 405, { error: "method_not_allowed", allow: "GET" });
    if (req.method === "POST" && path === "/validate/reproduce") return sendJson(res, ...unwrap(await reproduceReq(req)));
    if (req.method === "POST" && path === "/validate/cancel") return sendJson(res, ...unwrap(await cancelReq(req)));
    if (path === "/validate/reproduce" || path === "/validate/cancel") return sendJson(res, 405, { error: "method_not_allowed", allow: "POST" });
    // M2.19G.3 (ADR-037) — BanzAI-hosted operator onboarding. Same-origin under nginx
    // `location /banzai/onboarding/`. The router owns cookies, CSRF and per-IP limits; a null result
    // means onboarding is disabled → fall through to the generic 404 so the surface stays unadvertised.
    if (path === "/onboarding" || path.startsWith("/onboarding/")) {
      const out = await onboarding.handle(req, path, clientId(req));
      if (out) return sendJson(res, out.code, out.body, out.headers || {});
    }
    // `/ask` is the ONLY path proxied publicly (nginx `location = /banzai/ask`). Answer a wrong
    // method on it with an explicit 405 instead of letting it fall through to the catch-all, so the
    // public surface returns a correct, self-describing status for the one route it exposes.
    if (path === "/ask") return sendJson(res, 405, { error: "method_not_allowed", allow: "POST" });
    // Catch-all. It deliberately does NOT enumerate the internal routes: /health, /sources and
    // /index are operator-internal and must not be advertised on any publicly reachable response.
    return sendJson(res, 404, { error: "not_found" });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", path, error: err.message }));
    return sendJson(res, 500, { error: "internal_error", path });
  }
});

function unwrap({ code, body }) {
  return [code, body];
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", msg: "banzai-api listening", port: PORT, provider: provider.name, authoritative: false }));
  // M2.18B.6 (§13) — single-contract startup self-check (fecho por omissão). The Grounded-Synthesis trunk needs
  // the Rust/WASM single-contract exports (resolve → plan → build → validate) and the contract versions.
  // If any is missing the trunk already degrades to deterministic grounding (never publishes an unvalidated
  // model answer); we surface it LOUDLY at boot so the condition is never silent.
  // M2.19G.3 — surface onboarding readiness at boot (secret-free booleans only). When enabled without a
  // configured pepper the router fails closed; this log makes the misconfiguration visible immediately.
  console.log(JSON.stringify({ level: "info", msg: "onboarding", ...onboarding.healthSync() }));
  // ADR-036 — durable receipt store: on boot, deterministically recover crash-orphaned RUNNING
  // executions (stale heartbeat → INTERRUPTED, never left indefinitely active), drain any queued outbox
  // records into PostgreSQL (reusing the exact stored payload, never re-running an engine), then start the
  // periodic background loop. All no-ops when the store is disabled.
  if (receiptStore.isEnabled()) {
    receiptStore.recoverStale(300).then((n) => n && console.log(JSON.stringify({ level: "info", msg: "receipts crash recovery", interrupted: n }))).catch(() => {});
    receiptStore.drainOutbox().then((r) => r.drained && console.log(JSON.stringify({ level: "info", msg: "receipts outbox drained", ...r }))).catch(() => {});
    receiptStore.startBackgroundLoop(60000);
    console.log(JSON.stringify({ level: "info", msg: "receipts store enabled", outbox_pending: receiptStore.outboxPending() }));
  }
  const contract = singleContractSelfCheck();
  const cv = contractVersions();
  if (contract.ready) {
    console.log(JSON.stringify({ level: "info", msg: "grounded-synthesis single contract ready", contract_versions: cv }));
  } else {
    console.error(JSON.stringify({ level: "error", msg: "grounded-synthesis single contract NOT ready — trunk fails closed to deterministic grounding", missing: contract.missing, contract_versions: cv }));
  }
  // ADR-036: prime local inference on startup (best-effort) so the first real answer is
  // not cold. Runs in the background: it polls llama.cpp /health with bounded backoff
  // (covering the ~90s cold model load) before a tiny 1-token prime. Local-only, no user
  // data, not counted; disable with BANZAI_WARMUP=0.
  if (provider.inferenceLocation === "local" && typeof provider.warmup === "function" && !/^(0|false)$/i.test(String(process.env.BANZAI_WARMUP ?? ""))) {
    provider
      .warmup()
      .then((warmed) => console.log(JSON.stringify({ level: "info", msg: "local inference warm-up", warmed })))
      .catch(() => {});
  }
});

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}

// exported for potential unit use; retrieve is part of the public knowledge surface
export { retrieve };
