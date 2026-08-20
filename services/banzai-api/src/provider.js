// LLM provider abstraction for BanzAI.
//
// Allowlist: `mock` | `deepseek` | `qwen` | `local_qwen`. Nothing else — any other
// LLM_PROVIDER value is rejected at startup with an explicit error (no fallback).
//
// `mock` is deterministic and offline (default when LLM_PROVIDER is unset).
// `deepseek` and `qwen` call the provider's HOSTED chat API (OpenAI-compatible) —
// inference happens off-host. `local_qwen` (ADR-036) calls a LOCAL, internal-only
// llama.cpp OpenAI-compatible endpoint on the Docker network: no key, no GPU assumed,
// nothing leaves the host (external_model_called stays false). It is benchmark-gated
// and never the effective default until the VPS XL+ benchmark approves it.
//
// The rigid system prompt, source-boundary injection defence and post-response
// validation are RUST (engines/banzai-api-kb → WASM); this file is I/O glue. Hosted
// adapters fail safe: if LLM_API_KEY is absent they throw BEFORE any network I/O.
// `local_qwen` needs no key. Every answer keeps the BanzAI guardrails: explanatory,
// cited, non-normative — never certifies, never decides.

import { retrieve, buildPrompt, answerFor, DEFAULT_LOCALE } from "./knowledge.js";

const GUARDRAILS = Object.freeze({
  authoritative: false,
  can_certify: false,
  decides: false,
  substitutes_conformance_suite: false,
  framing: "demo",
  principle: "BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide. O output de IA nunca é regra do protocolo.",
});

export const ALLOWED_PROVIDERS = Object.freeze(["mock", "deepseek", "qwen", "local_qwen"]);

// The rigid system prompt + injection defence are RUST (engines/banzai-api-kb →
// buildPrompt). No JS copy of the rules exists — single source of truth in Rust.

// Provider endpoints. LLM_API_BASE overrides. `deepseek`/`qwen` are hosted (off-host);
// `local_qwen` (ADR-036) is an internal-only llama.cpp OpenAI-compatible endpoint on
// the Docker network — reachable by service name, never published to host/internet.
const REAL_DEFAULTS = Object.freeze({
  deepseek: { apiBase: "https://api.deepseek.com", model: "deepseek-chat", local: false },
  qwen: { apiBase: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", local: false },
  local_qwen: { apiBase: "http://llama-local:8080/v1", model: "qwen3-4b", local: true },
});

// Compose a grounded, deterministic context from the retrieved knowledge entry.
// Shared by mock and real adapters so every provider cites the same sources.
function ground(question, locale = DEFAULT_LOCALE) {
  const hit = retrieve(question);
  if (!hit) {
    return {
      grounded: false,
      answer:
        "Não encontrei fonte suficiente para responder com segurança a esta pergunta. O BanzAI só responde quando pode ancorar a resposta em fontes do protocolo (ADRs, anexo, contratos, estado). Reformule ou consulte a documentação.",
      sources: [],
      entry_id: null,
    };
  }
  // Serving path: the realization is chosen by locale, never by reading the compatibility projection.
  const realization = answerFor(hit, locale);
  return {
    grounded: true,
    answer: realization.text,
    answer_locale: realization.locale,
    answer_locale_available: realization.available,
    sources: hit.sources,
    entry_id: hit.id,
  };
}

// mock: deterministic, offline. The reference provider for all local tests.
const mockProvider = {
  name: "mock",
  get externalCallsMade() {
    return 0; // mock NEVER performs network I/O
  },
  get localCallsMade() {
    return 0;
  },
  get inferenceLocation() {
    return "none"; // deterministic offline — no model call at all
  },
  async answer(question) {
    const g = ground(question);
    return { ...g, provider: "mock", mode: "mock", inference_location: "none", guardrails: GUARDRAILS };
  },
};

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// True when the resolved endpoint is on THIS host (loopback, RFC1918 private range,
// or a bare Docker service name like "llama-local" reachable only on an internal
// network). ADR-036: local/external classification is driven by the resolved
// DESTINATION, never by the provider name — so a "local" provider pointed off-host is
// correctly seen (and refused). A malformed base is treated as off-host (deny by default).
export function isOnHost(apiBase) {
  let host;
  try {
    host = new URL(apiBase).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host.startsWith("127.")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  // Bare single-label host (no dots) = a Docker service name on an internal network.
  if (!host.includes(".")) return true;
  return false;
}

// Runtime configuration for a real adapter — environment only, never hardcoded keys.
export function readLlmConfig(name, env = process.env) {
  const defaults = REAL_DEFAULTS[name];
  const clean = (v) => {
    const s = String(v ?? "").trim();
    return s && s !== "change-me" ? s : "";
  };
  const apiBase = clean(env.LLM_API_BASE) || defaults.apiBase;
  return {
    apiKey: clean(env.LLM_API_KEY),
    apiBase,
    model: clean(env.LLM_MODEL) || defaults.model,
    declaredLocal: Boolean(defaults.local),
    onHost: isOnHost(apiBase), // resolved-destination classification (ADR-036)
    // ADR-036/047 latency tuning: local inference defaults to a professional-but-bounded
    // output (384; was 256 in ADR-036 — with reasoning disabled per ADR-036 the budget goes
    // to the answer, and the VPS XL+ benchmark showed answers finish naturally at ~84-133
    // tokens with headroom, ~8.7s) and a 60s operational-margin timeout; hosted keep 800/30s.
    timeoutMs: num(env.LLM_TIMEOUT_MS, defaults.local ? 60000 : 30000),
    maxTokens: num(env.LLM_MAX_TOKENS, defaults.local ? 384 : 800),
    temperature: (() => {
      const t = Number(env.LLM_TEMPERATURE);
      return Number.isFinite(t) && t >= 0 && t <= 2 ? t : 0.2;
    })(),
    topP: (() => {
      const t = Number(env.LLM_TOP_P);
      return Number.isFinite(t) && t > 0 && t <= 1 ? t : null;
    })(),
  };
}

// Build the exact HTTP request a provider (hosted or local llama.cpp) receives —
// OpenAI-compatible chat completions. Pure function: no network, testable offline.
// The `{system, user}` messages come from the RUST prompt builder (single source of
// truth for the rules + source-boundary injection defence); context = approved
// excerpts only, never secrets, env or keys. A keyless local endpoint gets no
// Authorization header.
export function buildChatRequest(name, question, grounded, cfg, { maxTokens, mode } = {}) {
  const { system, user, disable_reasoning } = buildPrompt(question, grounded, mode || "fast");
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  const body = {
    model: cfg.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: cfg.temperature,
    max_tokens: Math.min(maxTokens || cfg.maxTokens, cfg.maxTokens),
    stream: false,
  };
  if (cfg.topP != null) body.top_p = cfg.topP;
  // ADR-036: Rust owns the policy (disable_reasoning); this glue maps it to the local
  // llama.cpp/Qwen3 transport. Scoped to the on-host local runtime (declaredLocal) so
  // hosted providers' request shape is unchanged. Disabling Qwen3 "thinking" makes the
  // completion budget produce the ANSWER (not <think>) and avoids empty content.
  if (disable_reasoning && cfg.declaredLocal) {
    body.chat_template_kwargs = { enable_thinking: false };
  }
  return {
    url: `${cfg.apiBase.replace(/\/+$/, "")}/chat/completions`,
    headers,
    body,
  };
}

function safeError(code, message) {
  const err = new Error(message); // message must never contain the API key
  err.code = code;
  return err;
}

// Real hosted adapter (deepseek | qwen). Same guardrails as mock: grounded-only,
// cited, non-normative. No key → explicit safe failure BEFORE any network call.
function createRealProvider(name, env, fetchImpl) {
  // Classify by the RESOLVED destination host, not the provider name (ADR-036): a
  // "local" provider pointed off-host is caught here so the on-host telemetry/budget
  // invariants can never be silently bypassed. Config is read once (env is fixed).
  const cfg0 = readLlmConfig(name, env);
  const isLocal = cfg0.onHost;
  if (cfg0.declaredLocal && !isLocal) {
    // Refuse (never silently fall back off-host): a local provider must reach only an
    // on-host endpoint, so the on-host telemetry/budget invariants always hold.
    throw safeError(
      "LOCAL_ENDPOINT_OFF_HOST",
      `LLM_PROVIDER=${name} requires an on-host endpoint; refusing off-host LLM_API_BASE`
    );
  }
  let externalCalls = 0; // OFF-HOST calls only — 0 for an on-host (local) destination
  let localCalls = 0;
  let warmedState = null; // null = not attempted, true = primed, false = attempted+failed
  return {
    name,
    get externalCallsMade() {
      return externalCalls; // stays 0 for local_qwen: nothing leaves the host
    },
    get localCallsMade() {
      return localCalls;
    },
    get inferenceLocation() {
      return isLocal ? "local" : "external";
    },
    // ADR-036: null until warm-up runs, then true (primed) / false (never got ready).
    get warmupState() {
      return warmedState;
    },
    // ADR-036: best-effort warm-up for local inference. On a cold full-stack boot the
    // llama.cpp model is NOT in banzai-api's depends_on and takes ~90s to load, so a
    // one-shot ping would fire against an unready endpoint and never retry (ADR-036
    // FIX-3). This first POLLS llama.cpp's /health (503 while loading → 200 ready) with
    // bounded backoff, THEN primes the prefill path with a trivial 1-token request so the
    // first real answer isn't cold. No user data, not counted as a call; failure ignored.
    async warmup({ retries = 24, delayMs = 5000, readyTimeoutMs = 4000 } = {}) {
      if (!isLocal) return false;
      const cfg = readLlmConfig(name, env);
      // /health lives at the server root, not under /v1 (the OpenAI-compatible base).
      const root = cfg.apiBase.replace(/\/+$/, "").replace(/\/v1$/, "");
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let ready = false;
      for (let i = 0; i < retries; i += 1) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), readyTimeoutMs);
        try {
          const h = await fetchImpl(`${root}/health`, { method: "GET", signal: ctl.signal });
          if (h && h.ok) {
            ready = true;
            break;
          }
        } catch {
          // llama-local not up yet — keep polling.
        } finally {
          clearTimeout(t);
        }
        if (i < retries - 1) await sleep(delayMs);
      }
      if (!ready) {
        warmedState = false; // model never became ready within the window — give up quietly
        return false;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(cfg.timeoutMs, 30000));
      try {
        // ADR-036: prime the REAL compact system-prompt prefix (from Rust) so the first
        // real answer reuses the cached KV prefix and skips the cold system-prompt prefill.
        // No user data, no real documents — a trivial user turn; reasoning disabled; 1 token.
        const { system, disable_reasoning } = buildPrompt("ok", { grounded: false }, "fast");
        const headers = { "Content-Type": "application/json" };
        if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
        const body = {
          model: cfg.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: "ok" },
          ],
          max_tokens: 1,
          temperature: 0,
          stream: false,
        };
        // Map the Rust-owned policy identically to buildChatRequest (single source of truth).
        if (disable_reasoning && cfg.declaredLocal) body.chat_template_kwargs = { enable_thinking: false };
        const res = await fetchImpl(`${cfg.apiBase.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        warmedState = Boolean(res && res.ok);
        return warmedState;
      } catch {
        warmedState = false;
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
    // opts.context: pre-built limited RAG context from the pipeline (top-K,
    // char-capped). opts.maxTokens: per-mode completion cap (never above config).
    async answer(question, opts = {}) {
      const cfg = readLlmConfig(name, env);
      if (!cfg.apiKey && !isLocal) {
        // Hosted providers require a key; local_qwen (llama.cpp) is keyless.
        throw safeError(
          "LLM_KEY_MISSING",
          `LLM_PROVIDER=${name} requires LLM_API_KEY in the environment; no external call was made`
        );
      }
      const g = opts.context || ground(question);
      if (!g.grounded) {
        // Insufficient approved context → say so; never send an ungrounded
        // question to the model, never let it invent.
        return { ...g, provider: name, mode: "real", inference_location: isLocal ? "local" : "external", guardrails: GUARDRAILS };
      }
      const req = buildChatRequest(name, question, g, cfg, { maxTokens: opts.maxTokens, mode: opts.mode });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
      // M2.14E — cooperative external cancellation. The inference queue passes a signal that fires when
      // the QUEUE's inference-timeout elapses, so the actual llama.cpp request is aborted and the model
      // resource is freed (not just the queue slot). Does NOT change the model, tokens or the config
      // timeout (cfg.timeoutMs still applies); it only lets an already-doomed request stop sooner.
      const extSignal = opts.signal;
      let onExtAbort;
      if (extSignal) {
        if (extSignal.aborted) controller.abort();
        else {
          onExtAbort = () => controller.abort();
          extSignal.addEventListener("abort", onExtAbort, { once: true });
        }
      }
      if (isLocal) localCalls += 1;
      else externalCalls += 1;
      let res;
      try {
        res = await fetchImpl(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(req.body),
          signal: controller.signal,
        });
      } catch (e) {
        throw safeError(
          "LLM_UPSTREAM_ERROR",
          e.name === "AbortError"
            ? `LLM provider "${name}" timed out after ${cfg.timeoutMs}ms`
            : `LLM provider "${name}" unreachable`
        );
      } finally {
        clearTimeout(timer);
        if (extSignal && onExtAbort) extSignal.removeEventListener("abort", onExtAbort);
      }
      if (!res.ok) {
        throw safeError("LLM_UPSTREAM_ERROR", `LLM provider "${name}" returned HTTP ${res.status}`);
      }
      let text = "";
      let tokensGenerated = null;
      let finishReason = null;
      try {
        const data = await res.json();
        text = String(data?.choices?.[0]?.message?.content ?? "").trim();
        // Safe telemetry only (counts/labels) — never the prompt, reasoning or content body.
        const ct = data?.usage?.completion_tokens;
        tokensGenerated = Number.isFinite(ct) ? ct : null;
        const fr = data?.choices?.[0]?.finish_reason;
        finishReason = typeof fr === "string" ? fr : null;
      } catch {
        text = "";
      }
      if (!text) {
        throw safeError("LLM_UPSTREAM_ERROR", `LLM provider "${name}" returned an empty completion`);
      }
      return {
        grounded: true,
        answer: text,
        sources: g.sources,
        entry_id: g.entry_id,
        provider: name,
        mode: "real",
        model: cfg.model,
        inference_location: isLocal ? "local" : "external",
        // Per-answer proof that this specific answer called the model (ADR-036 telemetry).
        model_called: true,
        model_name: cfg.model,
        tokens_generated: tokensGenerated,
        finish_reason: finishReason,
        guardrails: GUARDRAILS,
      };
    },
    // M2.18B.6 — GROUNDED SYNTHESIS call: the single model turn per explanation. Rust has already
    // resolved the intent, entity, depth, retrieval plan and FactualPackage; the model only synthesises a
    // constrained-JSON grounded answer from that package (messages come from the Rust output prompt).
    // Temperature 0, a bounded token budget and its own timeout. Returns the raw model text (JSON to
    // validate) + safe telemetry. Counted as a model call; a local endpoint stays on-host (externalCalls
    // stays 0). Throws on timeout/HTTP/unreachable so the caller can fall back to the safe grounding.
    async synthesize(messages, opts = {}) {
      const cfg = readLlmConfig(name, env);
      if (!cfg.apiKey && !isLocal) {
        throw safeError("LLM_KEY_MISSING", `LLM_PROVIDER=${name} requires LLM_API_KEY; no external call was made`);
      }
      const headers = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
      const body = {
        // An explicit per-call model override wins (the synthesis model is configurable); otherwise the
        // provider's configured model.
        model: (typeof opts.model === "string" && opts.model.trim()) || cfg.model,
        messages,
        temperature: 0,
        max_tokens: Math.min(num(opts.maxTokens, 220), cfg.maxTokens),
        stream: false,
      };
      if (opts.disableReasoning && cfg.declaredLocal) body.chat_template_kwargs = { enable_thinking: false };
      // STRUCTURED OUTPUT (the decisive reliability property). When the caller supplies the grounded-output
      // JSON Schema, ask the backend to CONSTRAIN decoding so the completion can only be schema-valid JSON —
      // malformed / out-of-enum / unknown-field output becomes impossible. The on-host llama.cpp server
      // converts the schema to a grammar (`response_format:{type:"json_schema"}`); a hosted OpenAI-
      // compatible endpoint gets the lighter `json_object` mode (schema grammars are not universally
      // supported there). The Rust factual validator still runs afterwards — every claim/citation checked
      // against the FactualPackage. Opt-out with BANZAI_INTENT_STRUCTURED_OUTPUT=0 for a backend that rejects it.
      const structuredOn = String(env.BANZAI_INTENT_STRUCTURED_OUTPUT ?? "1") !== "0";
      if (structuredOn && opts.jsonSchema && typeof opts.jsonSchema === "object") {
        body.response_format = cfg.declaredLocal
          ? { type: "json_schema", json_schema: { name: "grounded_output", schema: opts.jsonSchema } }
          : { type: "json_object" };
      } else if (structuredOn && opts.jsonMode) {
        body.response_format = { type: "json_object" };
      }
      const timeoutMs = Math.min(num(opts.timeoutMs, 20000), cfg.timeoutMs);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const extSignal = opts.signal;
      let onExtAbort;
      if (extSignal) {
        if (extSignal.aborted) controller.abort();
        else {
          onExtAbort = () => controller.abort();
          extSignal.addEventListener("abort", onExtAbort, { once: true });
        }
      }
      if (isLocal) localCalls += 1;
      else externalCalls += 1;
      const started = Date.now();
      let res;
      try {
        res = await fetchImpl(`${cfg.apiBase.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (e) {
        throw safeError(
          "LLM_UPSTREAM_ERROR",
          e.name === "AbortError" ? `synthesis timed out after ${timeoutMs}ms` : "synthesis model unreachable"
        );
      } finally {
        clearTimeout(timer);
        if (extSignal && onExtAbort) extSignal.removeEventListener("abort", onExtAbort);
      }
      if (!res.ok) throw safeError("LLM_UPSTREAM_ERROR", `synthesis model returned HTTP ${res.status}`);
      let text = "";
      let timings = null;
      try {
        const data = await res.json();
        text = String(data?.choices?.[0]?.message?.content ?? "").trim();
        // SPR-4 (§1) latency decomposition — SAFE telemetry ONLY: counts + milliseconds, never the prompt,
        // reasoning or content body. llama.cpp returns a `timings` block; a hosted endpoint returns `usage`.
        // `prefill_ms` is llama.cpp `timings.prompt_ms`: the PROMPT-EVAL (prefill) time ONLY — it scales
        // linearly with `tokens_evaluated` at the CPU prefill rate (~63-66 tok/s on the 7B; a warm KV-cache
        // prefix collapses it to ~1 token). It is NOT the queue wait, the JS/Rust prompt build, or the
        // claim/citation verification — those are timed separately in the grounded-synthesis decomposition.
        // The prompt→tokens step is folded into prefill by llama.cpp and is not separable via this endpoint.
        const tm = (data && data.timings) || {};
        const us = (data && data.usage) || {};
        const n = (v) => (Number.isFinite(v) ? v : null);
        timings = {
          prefill_ms: n(tm.prompt_ms),
          generation_ms: n(tm.predicted_ms),
          tokens_evaluated: n(tm.prompt_n) != null ? n(tm.prompt_n) : n(us.prompt_tokens),
          tokens_predicted: n(tm.predicted_n) != null ? n(tm.predicted_n) : n(us.completion_tokens),
          tokens_per_second: n(tm.predicted_per_second),
        };
      } catch {
        text = "";
      }
      return { text, latencyMs: Date.now() - started, model: cfg.model, timings };
    },
  };
}

// Factory: choose a provider from the environment. Defaults to `mock`.
// Any value outside the allowlist is an explicit, safe startup failure.
export function createProvider(env = process.env, { fetchImpl = globalThis.fetch } = {}) {
  const p = String(env.LLM_PROVIDER || "mock").toLowerCase().trim();
  if (p === "" || p === "mock") return mockProvider;
  // deepseek | qwen (hosted) and local_qwen (internal llama.cpp) share the OpenAI-
  // compatible adapter. Use hasOwnProperty so inherited Object.prototype members
  // ("constructor", "toString", …) can never be misrouted as providers.
  if (Object.prototype.hasOwnProperty.call(REAL_DEFAULTS, p)) return createRealProvider(p, env, fetchImpl);
  throw safeError(
    "PROVIDER_NOT_ALLOWED",
    `LLM_PROVIDER "${p}" is not allowed; allowed providers: ${ALLOWED_PROVIDERS.join(", ")}`
  );
}

export { GUARDRAILS };
