// Increment 8 (§23) — a lightweight, in-process SLO / metrics aggregator. No external dependencies:
// plain counters plus a BOUNDED latency reservoir (a ring buffer of the most recent request latencies).
//
// It exposes, as machine JSON (non-secret, public-safe):
//   * p50 / p95 / p99 request latency — computed by `percentile_cont` (LINEAR INTERPOLATION between
//     adjacent ranks), the SAME method BZO-8 / telemetry.js use for the validation-journey percentiles,
//     so no two BanzAI surfaces disagree on how a percentile is derived;
//   * availability (fraction of requests that did NOT error), error_rate, fallback_rate;
//   * percent_deterministic (llm_called=false) and percent_model (llm_called=true);
//   * per-tool availability + mean cost (ms) + the outcome breakdown (ok|timeout|circuit_open|error|
//     cache_hit).
//
// It NEVER stores a question, an answer, a source body, a secret or any PII — only NUMBERS. The window is
// ROLLING: the reservoir keeps the most recent `max_samples` latencies (default 1024) and the rate
// counters are cumulative since process start (or the last reset()). snapshot() is a pure read; reset()
// clears everything and is used only by tests.

function num(value, fallback, { min = 0 } = {}) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

// percentile_cont — linear interpolation between adjacent ranks (identical to BZO-8 / telemetry.js).
// `p` is a percentile in [0,100]. Empty → 0; single sample → that sample.
export function percentileCont(sortedAsc, p) {
  const a = Array.isArray(sortedAsc) ? sortedAsc : [];
  const n = a.length;
  if (n === 0) return 0;
  if (n === 1) return a[0];
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (rank - lo);
}

// The documented SLO TARGETS (targets, not guarantees) — env-configurable. They describe what BanzAI aims
// for; the snapshot reports the observed values against them so an operator can see the gap. Most answers
// are deterministic (sub-second, 0 model calls); a model-grounded answer is bounded by the inference
// timeout. availability/error targets bound the fault-isolation behaviour of the tool layer (§21).
function sloTargets(env) {
  return Object.freeze({
    latency_p95_ms: num(env.BANZAI_SLO_TARGET_P95_MS, 3000, { min: 1 }),
    latency_p99_ms: num(env.BANZAI_SLO_TARGET_P99_MS, 8000, { min: 1 }),
    availability: num(env.BANZAI_SLO_TARGET_AVAILABILITY, 0.99),
    error_rate_max: num(env.BANZAI_SLO_TARGET_ERROR_RATE_MAX, 0.01),
    tool_availability: num(env.BANZAI_SLO_TARGET_TOOL_AVAILABILITY, 0.95),
  });
}

const PERCENTILE_METHOD = "percentile_cont — linear interpolation between adjacent ranks";
const TOOL_OUTCOMES = ["ok", "timeout", "circuit_open", "error", "cache_hit"];

export function createSlo(env = process.env, { nowFn = Date.now } = {}) {
  const maxSamples = Math.max(1, Math.floor(num(env.BANZAI_SLO_RESERVOIR, 1024, { min: 1 })));
  const targets = sloTargets(env);

  // Request-level counters (cumulative since start / last reset) + a bounded ring buffer of latencies.
  let requests = { total: 0, errors: 0, fallbacks: 0, deterministic: 0, model: 0 };
  let reservoir = []; // ring buffer of the most recent `maxSamples` latencies (ms)
  let ring = 0; // next write index
  // Per-tool aggregates: kind -> { calls, ok, timeout, circuit_open, error, cache_hit, total_ms }.
  let tools = new Map();

  function recordRequest({ latency_ms, error = false, fallback = false, deterministic = false, model_called = false } = {}) {
    requests.total += 1;
    if (error) requests.errors += 1;
    if (fallback) requests.fallbacks += 1;
    if (deterministic) requests.deterministic += 1;
    if (model_called) requests.model += 1;
    const ms = num(latency_ms, 0, { min: 0 });
    if (reservoir.length < maxSamples) reservoir.push(ms);
    else {
      reservoir[ring] = ms;
      ring = (ring + 1) % maxSamples;
    }
  }

  function recordTool(kind, { outcome = "ok", duration_ms = 0 } = {}) {
    const k = String(kind || "unknown");
    let t = tools.get(k);
    if (!t) {
      t = { calls: 0, ok: 0, timeout: 0, circuit_open: 0, error: 0, cache_hit: 0, total_ms: 0 };
      tools.set(k, t);
    }
    t.calls += 1;
    if (TOOL_OUTCOMES.includes(outcome)) t[outcome] += 1;
    else t.error += 1; // an unknown outcome is conservatively counted as unavailable
    t.total_ms += num(duration_ms, 0, { min: 0 });
  }

  function toolsSnapshot() {
    const out = {};
    for (const [kind, t] of tools) {
      const available = t.ok + t.cache_hit;
      out[kind] = {
        calls: t.calls,
        availability: t.calls ? round4(available / t.calls) : null,
        mean_cost_ms: t.calls ? Math.round(t.total_ms / t.calls) : 0,
        outcomes: { ok: t.ok, timeout: t.timeout, circuit_open: t.circuit_open, error: t.error, cache_hit: t.cache_hit },
      };
    }
    return out;
  }

  function snapshot() {
    const sorted = [...reservoir].sort((a, b) => a - b);
    const n = requests.total || 0;
    const div = n || 1;
    return {
      schema_version: "banzai-slo/1",
      checked_at: new Date(nowFn()).toISOString(),
      authoritative: false, // observed operational telemetry — NOT a signed/root-anchored trust artifact
      window: { kind: "rolling", max_samples: maxSamples, samples: sorted.length },
      requests_total: n,
      latency_ms: {
        method: PERCENTILE_METHOD,
        p50: Math.round(percentileCont(sorted, 50)),
        p95: Math.round(percentileCont(sorted, 95)),
        p99: Math.round(percentileCont(sorted, 99)),
        max: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0,
      },
      availability: round4((n - requests.errors) / div),
      error_rate: round4(requests.errors / div),
      fallback_rate: round4(requests.fallbacks / div),
      percent_deterministic: round4(requests.deterministic / div),
      percent_model: round4(requests.model / div),
      tools: toolsSnapshot(),
      slo_targets: targets,
    };
  }

  function reset() {
    requests = { total: 0, errors: 0, fallbacks: 0, deterministic: 0, model: 0 };
    reservoir = [];
    ring = 0;
    tools = new Map();
  }

  return { recordRequest, recordTool, snapshot, reset, targets, percentileMethod: PERCENTILE_METHOD };
}

function round4(x) {
  return Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null;
}
