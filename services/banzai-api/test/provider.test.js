// Automated tests for the BanzAI LLM provider layer. FULLY OFFLINE:
// every "network" interaction goes through an injected fetch stub — a real
// fetch here would be a bug. No API key, no GPU, no external model.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createProvider,
  readLlmConfig,
  buildChatRequest,
  ALLOWED_PROVIDERS,
  GUARDRAILS,
} from "../src/provider.js";

const QUESTION = "O que é BANZA?";
const OFF_TOPIC = "Qual é a cotação do dólar amanhã?";

// A fetch stub that records calls and fails the test if reached unexpectedly.
function fetchSpy(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (!response) throw new Error("unexpected network call in tests");
    return response;
  };
  return { impl, calls };
}

function okCompletion(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
  };
}

// ── allowlist ────────────────────────────────────────────────────────────────

test("allowlist is exactly mock, deepseek, qwen, local_qwen", () => {
  assert.deepEqual([...ALLOWED_PROVIDERS], ["mock", "deepseek", "qwen", "local_qwen"]);
});

test("empty/unset LLM_PROVIDER defaults to mock", () => {
  assert.equal(createProvider({}).name, "mock");
  assert.equal(createProvider({ LLM_PROVIDER: "" }).name, "mock");
  assert.equal(createProvider({ LLM_PROVIDER: "  mock " }).name, "mock");
});

test("deepseek and qwen are accepted", () => {
  assert.equal(createProvider({ LLM_PROVIDER: "deepseek" }).name, "deepseek");
  assert.equal(createProvider({ LLM_PROVIDER: "qwen" }).name, "qwen");
  assert.equal(createProvider({ LLM_PROVIDER: "QWEN" }).name, "qwen");
});

test("any non-approved provider is rejected with an explicit safe error", () => {
  for (const bad of ["mistral", "llama", "openai", "claude", "lighton", "gpt-oss", "local-gpu", "dry-run", "anything"]) {
    assert.throws(
      () => createProvider({ LLM_PROVIDER: bad }),
      (err) => err.code === "PROVIDER_NOT_ALLOWED" && err.message.includes(bad) && err.message.includes("mock, deepseek, qwen, local_qwen"),
      `provider "${bad}" must be rejected`
    );
  }
});

// ── mock provider ────────────────────────────────────────────────────────────

test("mock answers deterministically, grounded, cited, guardrailed, offline", async () => {
  const p = createProvider({ LLM_PROVIDER: "mock" });
  const r = await p.answer(QUESTION);
  assert.equal(r.provider, "mock");
  assert.equal(r.mode, "mock");
  assert.equal(r.grounded, true);
  assert.ok(r.sources.length >= 1, "must cite sources");
  assert.equal(r.guardrails.can_certify, false);
  assert.equal(r.guardrails.decides, false);
  assert.equal(p.externalCallsMade, 0, "mock never calls out");
});

test("mock says insufficient sources for off-topic questions (no invention)", async () => {
  const r = await createProvider({ LLM_PROVIDER: "mock" }).answer(OFF_TOPIC);
  assert.equal(r.grounded, false);
  assert.match(r.answer, /fonte suficiente/i);
  assert.deepEqual(r.sources, []);
});

// ── real adapters: safe failure without a key ────────────────────────────────

for (const name of ["deepseek", "qwen"]) {
  test(`${name} without LLM_API_KEY fails safely and makes NO network call`, async () => {
    const { impl, calls } = fetchSpy(null);
    const p = createProvider({ LLM_PROVIDER: name }, { fetchImpl: impl });
    await assert.rejects(
      () => p.answer(QUESTION),
      (err) => err.code === "LLM_KEY_MISSING" && err.message.includes(name)
    );
    assert.equal(calls.length, 0, "must not touch the network without a key");
    assert.equal(p.externalCallsMade, 0);
  });

  test(`${name} treats the change-me placeholder as an absent key`, async () => {
    const { impl, calls } = fetchSpy(null);
    const p = createProvider(
      { LLM_PROVIDER: name, LLM_API_KEY: "change-me" },
      { fetchImpl: impl }
    );
    await assert.rejects(() => p.answer(QUESTION), (err) => err.code === "LLM_KEY_MISSING");
    assert.equal(calls.length, 0);
  });
}

// ── real adapters: payload construction (HTTP stub, no real network) ─────────

test("deepseek adapter builds the correct OpenAI-compatible payload", async () => {
  const { impl, calls } = fetchSpy(okCompletion("BANZA é um protocolo aberto (ADR-001)."));
  const env = {
    LLM_PROVIDER: "deepseek",
    LLM_API_KEY: "test-key-not-real",
    LLM_MODEL: "deepseek-chat",
    LLM_API_BASE: "https://api.deepseek.example",
    LLM_TIMEOUT_MS: "5000",
    LLM_MAX_TOKENS: "321",
    LLM_TEMPERATURE: "0.1",
  };
  const p = createProvider(env, { fetchImpl: impl });
  const r = await p.answer(QUESTION);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.deepseek.example/chat/completions");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-key-not-real");

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "deepseek-chat");
  assert.equal(body.temperature, 0.1);
  assert.equal(body.max_tokens, 321);
  assert.equal(body.stream, false);
  assert.equal(body.messages[0].role, "system");
  assert.ok(body.messages[0].content.includes("agente nativo e não-normativo"), "system message carries the Rust-built rules");
  assert.ok(body.messages[0].content.includes("não certificas"), "system message encodes guardrails");
  assert.ok(body.messages[1].content.includes(QUESTION), "user message carries the question");
  assert.ok(body.messages[1].content.includes("<FONTES>"), "user message wraps sources as data (injection defence)");

  assert.equal(r.provider, "deepseek");
  assert.equal(r.mode, "real");
  assert.equal(r.grounded, true);
  assert.ok(r.sources.length >= 1, "real answers stay cited");
  assert.equal(r.guardrails.can_certify, false);
  assert.equal(p.externalCallsMade, 1);
});

test("qwen adapter uses its own default base and model", async () => {
  const { impl, calls } = fetchSpy(okCompletion("Resposta citada (ANNEX)."));
  const p = createProvider(
    { LLM_PROVIDER: "qwen", LLM_API_KEY: "test-key-not-real" },
    { fetchImpl: impl }
  );
  const r = await p.answer(QUESTION);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
  assert.equal(JSON.parse(calls[0].init.body).model, "qwen-plus");
  assert.equal(r.provider, "qwen");
  assert.equal(r.mode, "real");
});

test("real adapter does NOT call the model when there is no approved context", async () => {
  const { impl, calls } = fetchSpy(null);
  const p = createProvider(
    { LLM_PROVIDER: "deepseek", LLM_API_KEY: "test-key-not-real" },
    { fetchImpl: impl }
  );
  const r = await p.answer(OFF_TOPIC);
  assert.equal(r.grounded, false);
  assert.match(r.answer, /fonte suficiente/i);
  assert.equal(calls.length, 0, "ungrounded questions never reach the external model");
  assert.equal(p.externalCallsMade, 0);
});

test("upstream failure is a safe error that never leaks the key", async () => {
  const { impl } = fetchSpy({ ok: false, status: 500, json: async () => ({}) });
  const p = createProvider(
    { LLM_PROVIDER: "qwen", LLM_API_KEY: "super-secret-key" },
    { fetchImpl: impl }
  );
  await assert.rejects(
    () => p.answer(QUESTION),
    (err) => err.code === "LLM_UPSTREAM_ERROR" && !err.message.includes("super-secret-key")
  );
});

test("empty completion is rejected as upstream error (no silent fabrication)", async () => {
  const { impl } = fetchSpy(okCompletion(""));
  const p = createProvider(
    { LLM_PROVIDER: "deepseek", LLM_API_KEY: "test-key-not-real" },
    { fetchImpl: impl }
  );
  await assert.rejects(() => p.answer(QUESTION), (err) => err.code === "LLM_UPSTREAM_ERROR");
});

// ── local_qwen (ADR-042): internal llama.cpp, keyless, on-host ────────────────

test("local_qwen is accepted and reports inference_location=local", () => {
  const p = createProvider({ LLM_PROVIDER: "local_qwen" });
  assert.equal(p.name, "local_qwen");
  assert.equal(p.inferenceLocation, "local");
});

test("local_qwen answers WITHOUT a key and never counts as an external call", async () => {
  const { impl, calls } = fetchSpy(okCompletion("BANZA é um protocolo aberto (ADR-001)."));
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  const r = await p.answer(QUESTION);
  assert.equal(r.provider, "local_qwen");
  assert.equal(r.inference_location, "local");
  assert.equal(calls.length, 1, "the local model IS called");
  assert.equal(p.externalCallsMade, 0, "local inference is NOT an external/off-host call");
  assert.equal(p.localCallsMade, 1);
  // keyless: no Authorization header is sent to the local endpoint
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test("local_qwen answer carries per-answer telemetry: model_called, model_name, tokens_generated, finish_reason", async () => {
  const withUsage = {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: "BANZA é um protocolo aberto (ADR-001)." }, finish_reason: "stop" }],
      usage: { completion_tokens: 137 },
    }),
  };
  const { impl } = fetchSpy(withUsage);
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  const r = await p.answer(QUESTION);
  assert.equal(r.model_called, true, "a real local generation must report model_called=true");
  assert.equal(r.model_name, "qwen3-4b", "the model name is surfaced for the per-answer label");
  assert.equal(r.inference_location, "local");
  assert.equal(r.tokens_generated, 137, "completion_tokens is surfaced when the runtime reports it");
  assert.equal(r.finish_reason, "stop");
});

test("telemetry degrades safely when the runtime omits usage/finish_reason (null, never crashes)", async () => {
  const { impl } = fetchSpy(okCompletion("Resposta citada (ANNEX)."));
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  const r = await p.answer(QUESTION);
  assert.equal(r.model_called, true);
  assert.equal(r.tokens_generated, null, "missing usage → null, not 0 or undefined");
  assert.equal(r.finish_reason, null, "missing finish_reason → null");
});

test("a deterministic (ungrounded) local answer never sets model_called", async () => {
  const { impl, calls } = fetchSpy(null);
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  const r = await p.answer(OFF_TOPIC);
  assert.equal(r.grounded, false);
  assert.notEqual(r.model_called, true, "no generation ⇒ model_called is not true");
  assert.equal(calls.length, 0, "the local model is never touched for an ungrounded question");
});

test("local_qwen targets the internal llama.cpp endpoint + model by default", async () => {
  const { impl, calls } = fetchSpy(okCompletion("Resposta (ANNEX)."));
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  await p.answer(QUESTION);
  assert.equal(calls[0].url, "http://llama-local:8080/v1/chat/completions");
  assert.equal(JSON.parse(calls[0].init.body).model, "qwen3-4b");
});

test("LLM_TOP_P is forwarded when set (conservative sampling)", async () => {
  const { impl, calls } = fetchSpy(okCompletion("ok (ADR-001)."));
  const p = createProvider({ LLM_PROVIDER: "local_qwen", LLM_TOP_P: "0.8" }, { fetchImpl: impl });
  await p.answer(QUESTION);
  assert.equal(JSON.parse(calls[0].init.body).top_p, 0.8);
});

test("local_qwen REFUSES an off-host LLM_API_BASE — fail-closed, no exfiltration path", () => {
  assert.throws(
    () => createProvider({ LLM_PROVIDER: "local_qwen", LLM_API_BASE: "https://collector.attacker.example/v1" }),
    (err) => err.code === "LOCAL_ENDPOINT_OFF_HOST"
  );
});

test("local/external classification is DESTINATION-based, not name-based", () => {
  // local_qwen at a loopback base stays local.
  assert.equal(createProvider({ LLM_PROVIDER: "local_qwen", LLM_API_BASE: "http://127.0.0.1:8080/v1" }).inferenceLocation, "local");
  // a hosted provider at its public base is external.
  assert.equal(createProvider({ LLM_PROVIDER: "deepseek", LLM_API_KEY: "k" }).inferenceLocation, "external");
});

test("prototype-chain names are rejected, never misrouted as providers", () => {
  for (const bad of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
    assert.throws(() => createProvider({ LLM_PROVIDER: bad }), (err) => err.code === "PROVIDER_NOT_ALLOWED", `"${bad}" must be rejected`);
  }
});

test("local_qwen uses professional-but-bounded defaults (max_tokens 384, timeout 60s); hosted unchanged; env overrides", () => {
  const l = readLlmConfig("local_qwen", {});
  assert.equal(l.maxTokens, 384, "local default output is a professional 384 (ADR-042)");
  assert.equal(l.timeoutMs, 60000, "local default timeout is 60s margin");
  const d = readLlmConfig("deepseek", {});
  assert.equal(d.maxTokens, 800);
  assert.equal(d.timeoutMs, 30000);
  assert.equal(readLlmConfig("local_qwen", { LLM_MAX_TOKENS: "256" }).maxTokens, 256, "env override wins");
});

// ADR-042 FIX-1/2: the SHIPPED compose injects an EMPTY string for these vars (so it does
// not force the hosted 800/30000 onto local). An empty string must be treated as unset so
// provider.js applies the per-destination local default — this is exactly the deployed path,
// not the artificial {} the earlier test used.
test("local_qwen keeps its default under the shipped empty-string env (deploy path)", () => {
  const shipped = { LLM_MAX_TOKENS: "", LLM_TIMEOUT_MS: "" }; // what compose ${VAR:-} yields
  const l = readLlmConfig("local_qwen", shipped);
  assert.equal(l.maxTokens, 384, "empty LLM_MAX_TOKENS must fall back to the local default 384 (ADR-042)");
  assert.equal(l.timeoutMs, 60000, "empty LLM_TIMEOUT_MS must fall back to the local 60s margin");
  const d = readLlmConfig("deepseek", shipped);
  assert.equal(d.maxTokens, 800, "empty env keeps hosted at 800");
  assert.equal(d.timeoutMs, 30000, "empty env keeps hosted at 30s");
  // An explicit override still flows through even alongside the empty compose default.
  assert.equal(readLlmConfig("local_qwen", { LLM_MAX_TOKENS: "512" }).maxTokens, 512);
});

// The effective request cap the local model actually receives, under the shipped env.
test("local_qwen effective request max_tokens is 384 (fast AND deep) under shipped env", () => {
  const shipped = { LLM_MAX_TOKENS: "" };
  const cfg = readLlmConfig("local_qwen", shipped);
  const grounded = { grounded: true, entry_id: "x", answer: "a", sources: [{ id: "ADR-001", title: "t", path: "p" }] };
  // pipeline passes fast=400 / deep=800; buildChatRequest clamps to cfg.maxTokens (384).
  const fast = buildChatRequest("local_qwen", QUESTION, grounded, cfg, { maxTokens: 400, mode: "fast" });
  const deep = buildChatRequest("local_qwen", QUESTION, grounded, cfg, { maxTokens: 800, mode: "deep" });
  assert.equal(fast.body.max_tokens, 384, "fast local completion capped at 384");
  assert.equal(deep.body.max_tokens, 384, "deep local completion capped at 384");
});

test("warmup() waits for /health to be ready, then primes with a 1-token request; not counted", async () => {
  const { impl, calls } = fetchSpy(okCompletion("ok")); // GET /health → ok, POST prime → ok
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  assert.equal(typeof p.warmup, "function");
  assert.equal(await p.warmup({ retries: 3, delayMs: 0 }), true);
  // ADR-042 FIX-3: first poll /health at the server root, then prime the model.
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://llama-local:8080/health");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[1].url, "http://llama-local:8080/v1/chat/completions");
  assert.equal(JSON.parse(calls[1].init.body).max_tokens, 1, "warmup uses a 1-token request");
  assert.equal(p.externalCallsMade, 0, "warmup is not a user call");
  assert.equal(p.localCallsMade, 0);
});

test("warmup() gives up (never primes) if /health never becomes ready", async () => {
  const notReady = { ok: false, status: 503, json: async () => ({}) };
  const { impl, calls } = fetchSpy(notReady);
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  assert.equal(await p.warmup({ retries: 2, delayMs: 0 }), false);
  assert.equal(calls.length, 2, "polled /health up to the retry cap");
  assert.ok(calls.every((c) => c.url.endsWith("/health")), "no prime is sent while the model is not ready");
  assert.equal(p.warmupState, false, "warmupState reflects a failed warm-up");
});

// ── ADR-042: reasoning disabled for local (Qwen3) + prefix warm-up ────────────

test("local_qwen requests disable Qwen3 reasoning (chat_template_kwargs.enable_thinking=false)", () => {
  const cfg = readLlmConfig("local_qwen", {});
  const grounded = { grounded: true, entry_id: "x", answer: "a", sources: [{ id: "ADR-001", title: "t", path: "p" }] };
  const body = buildChatRequest("local_qwen", QUESTION, grounded, cfg).body;
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false }, "reasoning must be disabled for the local Qwen runtime");
});

test("hosted requests are NOT reshaped with chat_template_kwargs (scoped to local)", () => {
  const cfg = readLlmConfig("deepseek", { LLM_API_KEY: "k" });
  const grounded = { grounded: true, entry_id: "x", answer: "a", sources: [{ id: "ADR-001", title: "t", path: "p" }] };
  const body = buildChatRequest("deepseek", QUESTION, grounded, cfg).body;
  assert.equal(body.chat_template_kwargs, undefined, "hosted providers keep their request shape unchanged");
});

test("warmup() primes the REAL system-prompt prefix with reasoning disabled, 1 token, uncounted", async () => {
  const { impl, calls } = fetchSpy(okCompletion("ok"));
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  assert.equal(await p.warmup({ retries: 2, delayMs: 0 }), true);
  const prime = JSON.parse(calls[1].init.body); // calls[0] = /health, calls[1] = prime
  assert.equal(prime.messages[0].role, "system");
  assert.ok(prime.messages[0].content.includes("agente nativo"), "warm-up uses the real Rust system prompt (prefix caching)");
  assert.deepEqual(prime.chat_template_kwargs, { enable_thinking: false }, "warm-up also disables reasoning");
  assert.equal(prime.max_tokens, 1, "warm-up is a 1-token prime");
  assert.equal(p.externalCallsMade, 0);
  assert.equal(p.localCallsMade, 0);
  assert.equal(p.warmupState, true, "warmupState reflects a successful prime");
});

test("empty content with reasoning_content only is treated as an empty completion (safe)", async () => {
  // Regression for the M2.8B failure mode: reasoning-mode budget exhaustion leaves content
  // empty. provider.answer must NOT serve reasoning_content; it errors so the pipeline degrades.
  const reasoningOnly = {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: "", reasoning_content: "Okay, let me think..." }, finish_reason: "length" }] }),
  };
  const { impl } = fetchSpy(reasoningOnly);
  const p = createProvider({ LLM_PROVIDER: "local_qwen" }, { fetchImpl: impl });
  await assert.rejects(() => p.answer(QUESTION), (err) => err.code === "LLM_UPSTREAM_ERROR");
});

// ── system prompt / guardrails content (Rust-built) ──────────────────────────

test("the built system message encodes the mandatory guardrails (Rust prompt)", () => {
  const cfg = readLlmConfig("deepseek", { LLM_API_KEY: "k" });
  const grounded = {
    grounded: true,
    entry_id: "what-is-banza",
    answer: "BANZA é um protocolo.",
    sources: [{ id: "ADR-001", title: "t", path: "p" }],
  };
  const system = buildChatRequest("deepseek", QUESTION, grounded, cfg).body.messages[0].content.toLowerCase();
  for (const fragment of [
    "não é um operador",
    "não certificas, aprovas nem licencias",
    "não crias regras",
    "não há fonte suficiente",
    "não inventes operadores",
  ]) {
    assert.ok(system.includes(fragment), `system prompt must include: ${fragment}`);
  }
  assert.ok(system.includes("agente nativo"), "system prompt presents BanzAI as the native agent");
  assert.ok(system.includes("dados") && system.includes("ignora instruções"), "system prompt carries the injection defence");
  for (const banned of ["sistema de conhecimento", "determinam a verdade"]) {
    assert.ok(!system.includes(banned), `system prompt must not carry retired framing: ${banned}`);
  }
});

test("guardrails object is frozen and non-authoritative", () => {
  assert.ok(Object.isFrozen(GUARDRAILS));
  assert.equal(GUARDRAILS.authoritative, false);
  assert.equal(GUARDRAILS.can_certify, false);
  assert.equal(GUARDRAILS.decides, false);
  assert.equal(GUARDRAILS.substitutes_conformance_suite, false);
});

// ── config parsing ───────────────────────────────────────────────────────────

test("readLlmConfig applies documented defaults and env overrides", () => {
  const d = readLlmConfig("deepseek", {});
  assert.equal(d.apiBase, "https://api.deepseek.com");
  assert.equal(d.model, "deepseek-chat");
  assert.equal(d.timeoutMs, 30000);
  assert.equal(d.maxTokens, 800);
  assert.equal(d.temperature, 0.2);

  const q = readLlmConfig("qwen", { LLM_MODEL: "qwen-max", LLM_TIMEOUT_MS: "1234" });
  assert.equal(q.model, "qwen-max");
  assert.equal(q.timeoutMs, 1234);
});

test("buildChatRequest cites entry sources in the user content", () => {
  const cfg = readLlmConfig("deepseek", { LLM_API_KEY: "k" });
  const grounded = {
    grounded: true,
    entry_id: "what-is-banza",
    answer: "BANZA é um protocolo.",
    sources: [{ id: "ADR-001", title: "Implementation independence", path: "decisions/adr/ADR-001-*.md" }],
  };
  const req = buildChatRequest("deepseek", QUESTION, grounded, cfg);
  assert.ok(req.body.messages[1].content.includes("ADR-001"));
  assert.ok(req.body.messages[1].content.includes("what-is-banza"));
});
