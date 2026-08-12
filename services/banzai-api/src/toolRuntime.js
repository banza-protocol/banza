// Increment 8 (§21) — the reusable tool-robustness harness. It wraps EACH executable tool call (the
// Inc.3 toolplan.js adapter targets: the live-artifact fetch, the telemetry/metrics query, the durable
// receipt reads used by the question families) with the robustness each tool's DECLARED Inc.3 ToolContract
// specifies — timeout_ms, retry_policy, fallback_policy, freshness. It does NOT fork or reimplement any
// tool: it calls the SAME injected callable, honouring the contract around it. One tool's failure/timeout
// degrades to that tool's honest fallback; it never crashes the request or the agent.
//
// Layers, in order (§21):
//   * cache with freshness — a short TTL keyed by tool+args+scope. live tools get a short freshness,
//     persisted/receipt tools a longer one, static documentary longer still. A refusal/boundary is NEVER
//     wrapped or cached (settled upstream at Tier 0). Only a successful result is cached.
//   * circuit breaker — opens after N consecutive failures within a window → fails fast to the tool's
//     declared fallback; a half-open probe after a cooldown recovers it.
//   * concurrency control + rate limiting — a per-tool concurrency cap (a small semaphore). The model
//     tier keeps its own production queue (concurrency.js / queue_policy); this bounds the read tools.
//   * timeout — an AbortController per attempt; the timeout fires the abort AND races the call so a hung
//     tool never blocks past its declared budget.
//   * bounded retry — ONLY for an idempotent READ tool whose contract says retry_policy="bounded". A
//     mutating/reproduce tool is NEVER retried (a repeat could double-execute), whatever a flag says.
//   * cancellation — the request AbortSignal (carried on the per-request record) is propagated to the
//     tool and aborts the attempt.
//   * fault isolation — the harness NEVER throws: on timeout / circuit-open / error it returns a typed
//     degraded result ({ ok:false, error:{code}, __degraded:true }) the existing pipeline already handles
//     by serving the tool's honest, contextual fallback — never a fabricated answer.
//
// Per-tool outcomes (ok|timeout|circuit_open|error|cache_hit) + durations are recorded on the per-request
// observability record (AsyncLocalStorage) and into the SLO aggregator. No content, no secrets, no PII.
//
// This module is hermetic (pg-free, WASM-free): it imports ONLY node built-ins (async_hooks) and the
// crypto-only cache key helper. Contracts are INJECTED (server passes toolContracts()); nothing here loads
// the Rust WASM or a DB driver, so the guard can drive it without banzai-api's node_modules installed.

import { AsyncLocalStorage } from "node:async_hooks";
import { cacheKey } from "./cache.js";

// The idempotent READ tools — the ONLY kinds a bounded retry may repeat. Everything else is single-shot.
export const IDEMPOTENT_READ_KINDS = new Set([
  "DOCUMENT_SEARCH", "CONTRACT_LOOKUP", "SPEC_LOOKUP", "ADR_LOOKUP", "RFC_LOOKUP",
  "LIVE_ARTIFACT_FETCH", "REGISTRY_LOOKUP", "RUNTIME_LOOKUP",
  "EXECUTION_LOOKUP", "RECEIPT_LOOKUP", "EVIDENCE_LOOKUP", "METRICS_QUERY",
  "COMPARE_EXECUTIONS", "REASON_CODE_LOOKUP",
]);

// A mutating/reproduce tool is NEVER retried — a repeat could double-execute. This wins over any contract
// retry flag: a kind here is single-shot regardless of retry_policy.
export const MUTATING_KINDS = new Set(["REPRODUCE_EXECUTION"]);

// Boundary / meta kinds are settled UPSTREAM at Tier 0 (safety golden rule). They are NEVER wrapped,
// cached, retried or circuit-tracked — wrap() and harness() pass them straight through unchanged.
export const NEVER_WRAP_KINDS = new Set(["HONEST_FALLBACK", "CLARIFICATION"]);

// The transient error codes an ok:false tool result may carry — a failure of the tool INFRASTRUCTURE
// (network / registry / DB / exception), which counts toward the circuit + is retry-eligible. Every OTHER
// ok:false code (ENTITY_NOT_FOUND, INSUFFICIENT_MEASUREMENTS, ARTIFACT_NOT_PUBLISHED, …) is a LEGITIMATE
// honest tool answer — never retried, never a circuit failure.
const TRANSIENT_CODES = new Set([
  "TOOL_EXCEPTION", "FETCH_ERROR", "REGISTRY_UNAVAILABLE", "REGISTRY_RESOLVE_FAILED",
  "TELEMETRY_ERROR", "TELEMETRY_UNAVAILABLE", "receipts_read_error", "compare_failed",
]);

function num(value, fallback, { min = 0 } = {}) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

// Deep clone a plain result so a cached value is never mutated by a caller (the pipeline mutates results).
function clone(v) {
  if (v == null || typeof v !== "object") return v;
  try {
    return structuredClone(v);
  } catch {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch {
      return v;
    }
  }
}

function codeOf(v) {
  return (v && v.error && v.error.code != null) ? String(v.error.code) : "";
}

// A stable, capped fingerprint of a tool's argument (scope / decision / targets) for the cache key.
function fingerprint(x) {
  if (x == null) return "";
  try {
    return JSON.stringify(x).slice(0, 512);
  } catch {
    return String(x).slice(0, 512);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createToolRuntime(env = process.env, { contracts = [], nowFn = Date.now, slo = null } = {}) {
  const DEFAULT_TIMEOUT_MS = num(env.BANZAI_TOOL_DEFAULT_TIMEOUT_MS, 5000, { min: 1 });
  const MAX_RETRIES = Math.floor(num(env.BANZAI_TOOL_MAX_RETRIES, 1, { min: 0 }));
  const RETRY_BACKOFF_MS = num(env.BANZAI_TOOL_RETRY_BACKOFF_MS, 50, { min: 0 });
  const THRESHOLD = Math.max(1, Math.floor(num(env.BANZAI_TOOL_CIRCUIT_THRESHOLD, 3, { min: 1 })));
  const WINDOW_MS = num(env.BANZAI_TOOL_CIRCUIT_WINDOW_MS, 30000, { min: 1 });
  const COOLDOWN_MS = num(env.BANZAI_TOOL_CIRCUIT_COOLDOWN_MS, 15000, { min: 1 });
  const MAX_CONCURRENCY = Math.max(1, Math.floor(num(env.BANZAI_TOOL_MAX_CONCURRENCY, 4, { min: 1 })));

  const contractByKind = new Map();
  for (const c of Array.isArray(contracts) ? contracts : []) {
    if (c && c.kind) contractByKind.set(String(c.kind), c);
  }

  // Freshness → cache TTL. A live tool gets a short freshness so it re-fetches soon; a persisted/receipt
  // tool caches longer; documentary static longest. All env-overridable.
  function ttlFor(freshness) {
    if (freshness === "live") return num(env.BANZAI_TOOL_CACHE_LIVE_MS, 2000, { min: 0 });
    if (freshness === "static") return num(env.BANZAI_TOOL_CACHE_STATIC_MS, 300000, { min: 0 });
    return num(env.BANZAI_TOOL_CACHE_PERSISTED_MS, 30000, { min: 0 }); // persisted (default)
  }

  const als = new AsyncLocalStorage();
  const cache = new Map(); // key -> { value, expiresAt }
  const circuits = new Map(); // kind -> { failures, state, openedAt, lastFailAt }
  const sems = new Map(); // kind -> { active, waiters:[] }

  function currentRecord() {
    return als.getStore() || null;
  }

  // Record a per-tool outcome + duration on the per-request observability record AND the SLO aggregator.
  // Safe telemetry only — the tool kind, an outcome enum and a millisecond duration. Never any content.
  function record(kind, outcome, durationMs) {
    const rec = currentRecord();
    const dt = Math.max(0, Math.round(num(durationMs, 0, { min: 0 })));
    if (rec && Array.isArray(rec.events)) rec.events.push({ kind, outcome, duration_ms: dt });
    if (slo && typeof slo.recordTool === "function") slo.recordTool(kind, { outcome, duration_ms: dt });
  }

  // ── cache ────────────────────────────────────────────────────────────────────────────────────────
  function cacheGet(key) {
    const e = cache.get(key);
    if (!e) return undefined;
    if (nowFn() >= e.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return e.value;
  }
  function cacheSet(key, value, freshness) {
    const ttl = ttlFor(freshness);
    if (ttl <= 0) return; // freshness disables caching for this class
    cache.set(key, { value: clone(value), expiresAt: nowFn() + ttl });
  }

  // ── circuit breaker ──────────────────────────────────────────────────────────────────────────────
  function circuitStatus(kind) {
    const c = circuits.get(kind);
    if (!c || c.state === "closed") return "closed";
    if (c.state === "open") {
      if (nowFn() - c.openedAt >= COOLDOWN_MS) {
        c.state = "half_open";
        return "half_open";
      }
      return "open";
    }
    return c.state; // half_open
  }
  function onSuccess(kind) {
    const c = circuits.get(kind);
    if (c) {
      c.failures = 0;
      c.state = "closed";
      c.openedAt = 0;
    }
  }
  function onFailure(kind) {
    let c = circuits.get(kind);
    if (!c) {
      c = { failures: 0, state: "closed", openedAt: 0, lastFailAt: 0 };
      circuits.set(kind, c);
    }
    const now = nowFn();
    if (c.lastFailAt && now - c.lastFailAt > WINDOW_MS) c.failures = 0; // window reset
    c.failures += 1;
    c.lastFailAt = now;
    if (c.state === "half_open") {
      c.state = "open"; // a failed probe re-opens immediately
      c.openedAt = now;
      return;
    }
    if (c.failures >= THRESHOLD) {
      c.state = "open";
      c.openedAt = now;
    }
  }

  // ── per-tool concurrency cap (a small semaphore; the slot is handed off directly on release) ───────
  function acquire(kind) {
    let s = sems.get(kind);
    if (!s) {
      s = { active: 0, waiters: [] };
      sems.set(kind, s);
    }
    if (s.active < MAX_CONCURRENCY) {
      s.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => s.waiters.push(resolve)); // resolves holding the handed-off slot
  }
  function release(kind) {
    const s = sems.get(kind);
    if (!s) return;
    const next = s.waiters.shift();
    if (next) next(); // hand the slot directly (active unchanged)
    else s.active = Math.max(0, s.active - 1);
  }

  // Run the callable ONCE under a timeout + cancellation. Returns a classified outcome; never throws.
  async function runOnce(fn, timeoutMs, parentSignal) {
    const ac = typeof AbortController === "function" ? new AbortController() : null;
    const onParentAbort = () => ac && ac.abort();
    if (parentSignal) {
      if (parentSignal.aborted) ac && ac.abort();
      else parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
    let timer = null;
    const timeoutP = new Promise((resolve) => {
      timer = setTimeout(() => {
        if (ac) ac.abort();
        resolve({ __timeout: true });
      }, timeoutMs);
    });
    try {
      const raced = await Promise.race([
        Promise.resolve()
          .then(() => fn(ac ? ac.signal : undefined))
          .then((v) => ({ __value: v }), (e) => ({ __error: e })),
        timeoutP,
      ]);
      if (raced.__timeout) return { outcome: "timeout", value: null, transient: true };
      if (raced.__error) return { outcome: "error", value: null, transient: true };
      const v = raced.__value;
      // A transient ok:false is an infrastructure failure (retry/circuit); any other ok:false is a
      // LEGITIMATE honest tool answer that the harness must return verbatim (never retried).
      if (v && v.ok === false && TRANSIENT_CODES.has(codeOf(v))) {
        return { outcome: "error", value: v, transient: true };
      }
      return { outcome: "ok", value: v, transient: false };
    } finally {
      if (timer) clearTimeout(timer);
      if (parentSignal && typeof parentSignal.removeEventListener === "function") {
        parentSignal.removeEventListener("abort", onParentAbort);
      }
    }
  }

  // A typed degraded result the pipeline already handles (ok:false → serve the tool's honest fallback).
  function degraded(kind, code, fallbackKind, lastVal) {
    if (lastVal && lastVal.ok === false && lastVal.error) {
      return { ...lastVal, __degraded: true, __fallback_kind: fallbackKind };
    }
    return { ok: false, error: { code }, __degraded: true, __fallback_kind: fallbackKind };
  }

  // The core: run `fn` for ToolKind `kind` under its declared contract. NEVER throws.
  async function harness(kind, fn, opts = {}) {
    const k = String(kind || "");
    const rec = currentRecord();
    const signal = opts.signal || (rec && rec.signal) || null;

    // Boundary / meta kinds: settled upstream — identity pass-through. No cache, retry, circuit, timeout.
    if (NEVER_WRAP_KINDS.has(k)) {
      return fn(signal);
    }

    const contract = contractByKind.get(k) || {};
    const timeoutMs = num(env[`BANZAI_TOOL_TIMEOUT_MS_${k}`], contract.timeout_ms > 0 ? contract.timeout_ms : DEFAULT_TIMEOUT_MS, { min: 1 });
    const freshness = contract.freshness || "persisted";
    const fallbackKind = contract.fallback_policy || "HONEST_FALLBACK";

    // 1) cache (never for a boundary — already excluded above).
    const key = cacheKey({ kind: k, args: fingerprint(opts.args), scope: fingerprint(opts.scope) });
    const cached = cacheGet(key);
    if (cached !== undefined) {
      record(k, "cache_hit", 0);
      return clone(cached);
    }

    // 2) circuit breaker.
    const status = circuitStatus(k);
    if (status === "open") {
      record(k, "circuit_open", 0);
      return degraded(k, "CIRCUIT_OPEN", fallbackKind);
    }
    const isProbe = status === "half_open";

    // 3) concurrency slot.
    await acquire(k);
    const started = nowFn();
    try {
      // 4) run with timeout + bounded retry (idempotent reads only; never a mutating/reproduce tool).
      const canRetry =
        !isProbe &&
        IDEMPOTENT_READ_KINDS.has(k) &&
        !MUTATING_KINDS.has(k) &&
        contract.retry_policy === "bounded";
      const maxAttempts = canRetry ? 1 + MAX_RETRIES : 1;

      let lastOutcome = "error";
      let lastVal = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const r = await runOnce(fn, timeoutMs, signal);
        if (r.outcome === "ok") {
          onSuccess(k);
          cacheSet(key, r.value, freshness);
          record(k, "ok", nowFn() - started);
          return r.value;
        }
        lastOutcome = r.outcome;
        lastVal = r.value;
        if (attempt < maxAttempts) await sleep(RETRY_BACKOFF_MS * attempt);
      }
      // exhausted → count the failure, degrade to the honest fallback (fault isolation).
      onFailure(k);
      record(k, lastOutcome, nowFn() - started);
      const code = lastOutcome === "timeout" ? "TIMEOUT" : codeOf(lastVal) || "TOOL_ERROR";
      return degraded(k, code, fallbackKind, lastVal);
    } finally {
      release(k);
    }
  }

  // Wrap an injected tool object's methods with the harness. `methodMap` is { methodName: ToolKind }.
  // Unmapped methods pass through unchanged. Returns a NEW object (never mutates the original tool).
  function wrapTool(tool, methodMap = {}) {
    if (!tool || typeof tool !== "object") return tool;
    const out = Object.create(Object.getPrototypeOf(tool));
    for (const key of Object.keys(tool)) out[key] = tool[key];
    for (const [method, kind] of Object.entries(methodMap)) {
      const original = tool[method];
      if (typeof original !== "function") continue;
      out[method] = (...callArgs) =>
        harness(kind, (sig) => original.apply(tool, [...callArgs, sig]), { args: callArgs[0] ?? null });
    }
    return out;
  }

  // Per-request observability collector. `signal` is the request AbortSignal (propagated to every tool).
  function startRequest(queryId, { signal = null } = {}) {
    return { query_id: queryId || null, signal: signal || null, events: [] };
  }
  // Run `fn` with `record` as the active per-request context so wrapped tool calls record their outcomes.
  function withRequest(record, fn) {
    return als.run(record, fn);
  }

  // Safe introspection (counts/states only — never content). Used by tests + optional health.
  function stats() {
    const circuitStates = {};
    for (const [kind, c] of circuits) circuitStates[kind] = c.state;
    return { cache_size: cache.size, circuits: circuitStates, max_concurrency: MAX_CONCURRENCY };
  }

  function reset() {
    cache.clear();
    circuits.clear();
    sems.clear();
  }

  return { harness, wrapTool, startRequest, withRequest, currentRecord, stats, reset };
}
