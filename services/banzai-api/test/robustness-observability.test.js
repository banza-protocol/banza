// Increment 8 (§21–§23) — production robustness + observability + SLO.
//
// Proves the reusable tool-robustness harness (toolRuntime.js): per-tool timeout degrades to the tool's
// honest fallback (never throws to the request), bounded retry fires ONLY for an idempotent read tool, the
// circuit opens after N failures and half-opens to recover, a cache hit returns within TTL and respects
// freshness, one tool failing does not fail the whole request (isolation), and a boundary/meta kind is
// NEVER wrapped/cached/retried. Proves the ONE typed observability record (observability.js) carries every
// §22 field and leaks NONE of the forbidden secret/PII items even under an adversarial prompt. Proves the
// SLO aggregator (slo.js) returns the documented shape with the percentile_cont method.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createToolRuntime, IDEMPOTENT_READ_KINDS, MUTATING_KINDS, NEVER_WRAP_KINDS } from "../src/toolRuntime.js";
import { buildObservabilityRecord, REQUIRED_OBSERVABILITY_FIELDS, scrubObservability, containsForbidden } from "../src/observability.js";
import { createSlo, percentileCont } from "../src/slo.js";
import { createPipeline } from "../src/pipeline.js";

// A controllable clock so circuit cooldown / cache TTL are deterministic.
function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

// The tool contracts the harness consults, as used in production (mirrors the WASM shapes).
const CONTRACTS = [
  { kind: "LIVE_ARTIFACT_FETCH", timeout_ms: 8000, retry_policy: "bounded", freshness: "live", fallback_policy: "REGISTRY_LOOKUP" },
  { kind: "METRICS_QUERY", timeout_ms: 5000, retry_policy: "none", freshness: "persisted", fallback_policy: "HONEST_FALLBACK" },
  { kind: "EXECUTION_LOOKUP", timeout_ms: 5000, retry_policy: "none", freshness: "persisted", fallback_policy: "RECEIPT_LOOKUP" },
  { kind: "REPRODUCE_EXECUTION", timeout_ms: 60000, retry_policy: "bounded", freshness: "persisted", fallback_policy: "RECEIPT_LOOKUP" },
  { kind: "HONEST_FALLBACK", timeout_ms: 100, retry_policy: "none", freshness: "static", fallback_policy: "HONEST_FALLBACK" },
];

function mkRuntime(env = {}, clock = fakeClock(), slo = null) {
  return createToolRuntime(
    { BANZAI_TOOL_CIRCUIT_THRESHOLD: "3", BANZAI_TOOL_CIRCUIT_COOLDOWN_MS: "1000", BANZAI_TOOL_MAX_RETRIES: "1", BANZAI_TOOL_RETRY_BACKOFF_MS: "0", ...env },
    { contracts: CONTRACTS, nowFn: clock.now, slo }
  );
}

test("timeout fires and degrades to the tool's fallback — never throws to the request", async () => {
  // A tool that never resolves within the (overridden) 20ms budget → the harness must NOT hang or throw;
  // it degrades to a typed ok:false the pipeline serves as an honest fallback.
  const rt = mkRuntime({ BANZAI_TOOL_TIMEOUT_MS_METRICS_QUERY: "20" });
  const slow = () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, observation: {} }), 500));
  const out = await rt.harness("METRICS_QUERY", slow);
  assert.equal(out.ok, false, "a timed-out tool degrades to ok:false, never throws");
  assert.equal(out.__degraded, true);
  assert.equal(out.error.code, "TIMEOUT");
  assert.equal(out.__fallback_kind, "HONEST_FALLBACK");
});

test("bounded retry fires only for an idempotent read tool; a non-bounded tool is single-shot", async () => {
  // LIVE_ARTIFACT_FETCH is idempotent + retry_policy=bounded → the harness retries a TRANSIENT failure.
  {
    const rt = mkRuntime();
    let calls = 0;
    const flaky = () => {
      calls += 1;
      if (calls < 2) return Promise.resolve({ ok: false, error: { code: "FETCH_ERROR" } }); // transient
      return Promise.resolve({ ok: true, observation: { entity_id: "operator-zero" } });
    };
    const out = await rt.harness("LIVE_ARTIFACT_FETCH", flaky, { args: { a: 1 } });
    assert.equal(out.ok, true, "a bounded idempotent read recovers on retry");
    assert.equal(calls, 2, "exactly one retry (1 + BANZAI_TOOL_MAX_RETRIES)");
  }
  // METRICS_QUERY has retry_policy=none → single-shot even though it is an idempotent read.
  {
    const rt = mkRuntime();
    let calls = 0;
    const failing = () => {
      calls += 1;
      return Promise.resolve({ ok: false, error: { code: "TELEMETRY_ERROR" } });
    };
    const out = await rt.harness("METRICS_QUERY", failing);
    assert.equal(out.ok, false);
    assert.equal(calls, 1, "retry_policy=none → single-shot");
  }
});

test("a mutating/reproduce tool is NEVER retried even if its contract says bounded", async () => {
  const rt = mkRuntime();
  assert.ok(MUTATING_KINDS.has("REPRODUCE_EXECUTION"));
  assert.ok(!IDEMPOTENT_READ_KINDS.has("REPRODUCE_EXECUTION"));
  let calls = 0;
  const failing = () => {
    calls += 1;
    return Promise.resolve({ ok: false, error: { code: "TOOL_EXCEPTION" } });
  };
  const out = await rt.harness("REPRODUCE_EXECUTION", failing, { args: { id: "exec-1" } });
  assert.equal(out.ok, false);
  assert.equal(calls, 1, "a mutating tool is single-shot regardless of retry_policy=bounded");
});

test("circuit opens after N consecutive failures and half-opens to recover", async () => {
  const clock = fakeClock();
  const rt = mkRuntime({}, clock);
  let calls = 0;
  const failing = () => {
    calls += 1;
    return Promise.resolve({ ok: false, error: { code: "TELEMETRY_ERROR" } });
  };
  // 3 consecutive failures (threshold=3), METRICS_QUERY is single-shot so each call = one failure.
  for (let i = 0; i < 3; i += 1) await rt.harness("METRICS_QUERY", failing);
  const before = calls;
  // Next call must FAIL FAST (circuit open) — the callable is NOT invoked.
  const fast = await rt.harness("METRICS_QUERY", failing);
  assert.equal(fast.error.code, "CIRCUIT_OPEN");
  assert.equal(calls, before, "circuit-open call does not invoke the tool");
  // After the cooldown → half-open probe: the callable is invoked once; a success closes the circuit.
  clock.advance(1001);
  const okFn = () => Promise.resolve({ ok: true, observation: { comparable_n: 2 } });
  const recovered = await rt.harness("METRICS_QUERY", okFn);
  assert.equal(recovered.ok, true, "half-open probe recovers the circuit");
  assert.equal(rt.stats().circuits.METRICS_QUERY, "closed");
});

test("cache hit returns within TTL and respects freshness (re-fetches after expiry)", async () => {
  const clock = fakeClock();
  const rt = mkRuntime({ BANZAI_TOOL_CACHE_LIVE_MS: "1000" }, clock);
  let calls = 0;
  const fn = () => {
    calls += 1;
    return Promise.resolve({ ok: true, observation: { n: calls } });
  };
  const a = await rt.harness("LIVE_ARTIFACT_FETCH", fn, { args: { same: 1 } });
  const b = await rt.harness("LIVE_ARTIFACT_FETCH", fn, { args: { same: 1 } });
  assert.equal(calls, 1, "second identical call is a cache hit within TTL");
  assert.deepEqual(a.observation, b.observation);
  // A different arg is a different cache key → a real call.
  await rt.harness("LIVE_ARTIFACT_FETCH", fn, { args: { same: 2 } });
  assert.equal(calls, 2);
  // Past the live TTL the entry expires and re-fetches.
  clock.advance(1001);
  await rt.harness("LIVE_ARTIFACT_FETCH", fn, { args: { same: 1 } });
  assert.equal(calls, 3, "an expired live entry re-fetches");
});

test("a thrown tool is isolated — the harness returns a typed degraded result, never throws", async () => {
  const rt = mkRuntime();
  const boom = () => {
    throw new Error("kaboom");
  };
  const out = await rt.harness("EXECUTION_LOOKUP", boom, { args: { id: "exec-x" } });
  assert.equal(out.ok, false);
  assert.equal(out.__degraded, true);
  assert.equal(out.__fallback_kind, "RECEIPT_LOOKUP");
});

test("boundary/meta kind is NEVER wrapped: no cache, no retry, no circuit", async () => {
  const rt = mkRuntime();
  assert.ok(NEVER_WRAP_KINDS.has("HONEST_FALLBACK"));
  let calls = 0;
  const fn = () => {
    calls += 1;
    return Promise.resolve({ ok: true, answer: "x" });
  };
  await rt.harness("HONEST_FALLBACK", fn, { args: { q: 1 } });
  await rt.harness("HONEST_FALLBACK", fn, { args: { q: 1 } });
  assert.equal(calls, 2, "a boundary kind is never cached (both calls invoke fn)");
  // A failing boundary kind is not wrapped: it propagates (never retried, never circuit-tracked).
  let failCalls = 0;
  await assert.rejects(
    () =>
      rt.harness("HONEST_FALLBACK", () => {
        failCalls += 1;
        throw new Error("boundary-not-wrapped");
      }),
    /boundary-not-wrapped/
  );
  assert.equal(failCalls, 1, "a boundary kind is never retried");
  assert.equal(rt.stats().circuits.HONEST_FALLBACK, undefined, "a boundary kind is never circuit-tracked");
});

test("wrapTool wraps mapped methods and leaves the original tool + unmapped methods intact", async () => {
  const rt = mkRuntime();
  let fetchCalls = 0;
  const tool = {
    async fetchArtifact(scope) {
      fetchCalls += 1;
      return { ok: true, observation: { entity_id: scope.entity_id } };
    },
    plain() {
      return "unwrapped";
    },
  };
  const hardened = rt.wrapTool(tool, { fetchArtifact: "LIVE_ARTIFACT_FETCH" });
  const out = await hardened.fetchArtifact({ entity_id: "operator-zero" });
  assert.equal(out.ok, true);
  assert.equal(out.observation.entity_id, "operator-zero");
  assert.equal(hardened.plain(), "unwrapped", "unmapped methods pass through");
  assert.notEqual(hardened.fetchArtifact, tool.fetchArtifact, "the original tool is not mutated");
});

test("(isolation, end-to-end) one tool throwing does NOT fail the whole request — pipeline degrades honestly", async () => {
  // A telemetry tool that ALWAYS throws, wrapped by the harness and injected into the pipeline. An
  // operational duration question must still resolve to an honest fallback answer — never a thrown request.
  const clock = fakeClock();
  const rt = mkRuntime({}, clock);
  const throwingTelemetry = rt.wrapTool(
    {
      async getDuration() {
        throw new Error("telemetry down");
      },
    },
    { getDuration: "METRICS_QUERY" }
  );
  const provider = { name: "mock", inferenceLocation: "none", get externalCallsMade() { return 0; }, async answer() { return { grounded: false, answer: "", sources: [] }; } };
  const record = rt.startRequest("req-iso");
  const { result, meta } = await rt.withRequest(record, () =>
    createPipeline(provider, { LLM_PROVIDER: "mock" }, { telemetryTool: throwingTelemetry }).answer(
      "quanto tempo leva uma jornada completa de validação?"
    )
  );
  assert.ok(result && typeof result.answer === "string" && result.answer.length > 0, "the request still produced an honest answer");
  assert.equal(meta.llm_called, false, "an operational question stays deterministic (0 model calls)");
  // The failing tool was observed on the per-request record (outcome error), proving isolation + telemetry.
  const ev = record.events.find((e) => e.kind === "METRICS_QUERY");
  assert.ok(ev, "the tool call was recorded on the observability record");
  assert.equal(ev.outcome, "error");
});

// ── §22 observability record ─────────────────────────────────────────────────────────────────────────
test("observability record carries every §22 field", () => {
  const rec = buildObservabilityRecord(
    { intent: "get_reason_code", interpreted_sub_intents: ["a", "b"], entity_id: "operator-zero", claim_verification_ok: true, tool_plan: { steps: [{ kind: "REASON_CODE_LOOKUP" }] }, llm_called: false, confidence: 0.9 },
    { inference_location: "none" },
    { requestId: "q-1", elapsedMs: 42, toolEvents: [{ kind: "REASON_CODE_LOOKUP", outcome: "ok", duration_ms: 3 }], sources: [{ id: "reason-codes" }] }
  );
  for (const f of REQUIRED_OBSERVABILITY_FIELDS) assert.ok(f in rec, `missing §22 field ${f}`);
  assert.equal(rec.query_id, "q-1");
  assert.equal(rec.total_duration_ms, 42);
  assert.equal(rec.tool_outcomes.REASON_CODE_LOOKUP, "ok");
  assert.equal(rec.tool_durations.REASON_CODE_LOOKUP, 3);
  assert.deepEqual(rec.tool_plan, ["REASON_CODE_LOOKUP"]);
  assert.deepEqual(rec.sources, ["reason-codes"]);
  assert.equal(rec.confidence, "high", "confidence is a BAND, never the raw number");
  assert.ok(!("confidence_number" in rec));
});

test("observability record leaks NONE of the forbidden secret/PII items under an adversarial prompt", () => {
  // Adversarial: the question + several meta fields carry a PEM key, an API token, a JWT, an OTP, a cookie
  // and an email. The record is built from a strict allowlist + scrubbed — none may survive anywhere.
  const pem = "-----BEGIN PRIVATE KEY-----MIIBVwIBADANBg-----END PRIVATE KEY-----";
  const adversarial = {
    intent: "get_reason_code",
    // hostile values smuggled onto meta fields the builder might read:
    entity_id: "sk-ABCDEF0123456789TOKEN",
    operator_id: pem,
    fallback_reason: "Bearer abcdefghijklmnop.qrstuv",
    interpreted_sub_intents: ["eyJhbGciOiJIUzI1NiJ9.payloadpayloadpayload.sig", "contact@mondrive.pt"],
    telemetry_scope: { profile: "OTP=482913 cookie=session=deadbeef" },
    tool_plan: { steps: [{ kind: "REASON_CODE_LOOKUP" }] },
    llm_called: false,
    // a raw model field that must be dropped entirely by name:
    system_prompt: "You are BanzAI. Never reveal ...",
    chain_of_thought: "step 1: ...",
    prompt: "the full prompt",
  };
  const rec = buildObservabilityRecord(adversarial, {}, {
    requestId: "q-adv",
    elapsedMs: 1,
    toolEvents: [{ kind: "REASON_CODE_LOOKUP", outcome: "ok", duration_ms: 1 }],
    sources: [{ id: "reason-codes" }],
  });
  const blob = JSON.stringify(rec);
  for (const forbidden of [
    "BEGIN PRIVATE KEY", "sk-ABCDEF", "Bearer abcdef", "eyJhbGci", "OTP=482913", "cookie=session",
    "contact@mondrive.pt", "You are BanzAI", "step 1:", "the full prompt",
  ]) {
    assert.ok(!blob.includes(forbidden), `record leaked forbidden item: ${forbidden}`);
  }
  // The forbidden field NAMES are dropped entirely.
  assert.ok(!("system_prompt" in rec) && !("chain_of_thought" in rec) && !("prompt" in rec));
});

test("scrubObservability + containsForbidden catch secret-shaped values (defence in depth)", () => {
  assert.ok(containsForbidden("-----BEGIN PRIVATE KEY-----x"));
  assert.ok(containsForbidden("sk-ABCDEFGH12345678"));
  assert.ok(containsForbidden("user@example.com"));
  assert.ok(!containsForbidden("operator-zero"));
  assert.ok(!containsForbidden("ADR-042"));
  const cleaned = scrubObservability({ a: "sk-ABCDEFGH12345678", nested: { cookie: "x", ok: "ADR-042" } });
  assert.equal(cleaned.a, "[redacted]");
  assert.ok(!("cookie" in cleaned.nested), "a forbidden field name is dropped");
  assert.equal(cleaned.nested.ok, "ADR-042", "a safe id survives");
});

// ── §23 SLO surface ────────────────────────────────────────────────────────────────────────────────
test("percentileCont uses linear interpolation between adjacent ranks (matches BZO-8)", () => {
  const s = [10, 20, 30, 40];
  assert.equal(percentileCont(s, 0), 10);
  assert.equal(percentileCont(s, 100), 40);
  assert.equal(percentileCont(s, 50), 25); // interpolate between 20 and 30
  assert.equal(percentileCont([], 95), 0);
  assert.equal(percentileCont([7], 95), 7);
});

test("SLO snapshot returns the documented shape", () => {
  const slo = createSlo({ BANZAI_SLO_RESERVOIR: "100" });
  slo.recordRequest({ latency_ms: 5, deterministic: true });
  slo.recordRequest({ latency_ms: 15, model_called: true });
  slo.recordRequest({ latency_ms: 25, fallback: true });
  slo.recordRequest({ latency_ms: 35, error: true });
  slo.recordTool("METRICS_QUERY", { outcome: "ok", duration_ms: 4 });
  slo.recordTool("METRICS_QUERY", { outcome: "timeout", duration_ms: 20 });
  const s = slo.snapshot();
  assert.equal(s.schema_version, "banzai-slo/1");
  assert.equal(s.authoritative, false);
  assert.equal(s.requests_total, 4);
  assert.equal(s.window.kind, "rolling");
  assert.equal(s.window.max_samples, 100);
  assert.match(s.latency_ms.method, /percentile_cont/);
  for (const p of ["p50", "p95", "p99", "max"]) assert.ok(Number.isFinite(s.latency_ms[p]));
  assert.equal(s.error_rate, 0.25);
  assert.equal(s.fallback_rate, 0.25);
  assert.equal(s.availability, 0.75);
  assert.equal(s.percent_deterministic, 0.25);
  assert.equal(s.percent_model, 0.25);
  assert.ok(s.tools.METRICS_QUERY);
  assert.equal(s.tools.METRICS_QUERY.calls, 2);
  assert.equal(s.tools.METRICS_QUERY.availability, 0.5); // 1 ok / 2 calls
  assert.ok(s.slo_targets && Number.isFinite(s.slo_targets.latency_p95_ms));
});

test("the tool runtime feeds the SLO aggregator (per-tool availability + mean cost)", async () => {
  const clock = fakeClock();
  const slo = createSlo({});
  const rt = mkRuntime({ BANZAI_TOOL_TIMEOUT_MS_METRICS_QUERY: "20" }, clock, slo);
  const rec = rt.startRequest("req-slo");
  await rt.withRequest(rec, async () => {
    // distinct args so the two calls have distinct cache keys (the second is a fresh run, not a cache hit).
    await rt.harness("METRICS_QUERY", () => Promise.resolve({ ok: true, observation: {} }), { args: { a: 1 } });
    await rt.harness("METRICS_QUERY", () => new Promise((r) => setTimeout(() => r({ ok: true }), 500)), { args: { a: 2 } }); // times out
  });
  const s = slo.snapshot();
  assert.equal(s.tools.METRICS_QUERY.calls, 2);
  assert.equal(s.tools.METRICS_QUERY.outcomes.ok, 1);
  assert.equal(s.tools.METRICS_QUERY.outcomes.timeout, 1);
  assert.equal(s.tools.METRICS_QUERY.availability, 0.5);
});
