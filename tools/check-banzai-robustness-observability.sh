#!/usr/bin/env bash
# check-banzai-robustness-observability.sh — Increment 8 guard (§21–§23).
#
# Verifies production robustness + observability + SLO for the BanzAI tool layer:
#   §21 — the reusable tool-robustness harness (services/banzai-api/src/toolRuntime.js) wraps each tool
#         call with per-tool timeout (AbortController), bounded retry (idempotent reads only; NEVER a
#         mutating/reproduce tool), a circuit breaker (opens after N failures → half-open probe recovers),
#         freshness-scoped caching, per-tool concurrency caps, cancellation and FAULT ISOLATION (never
#         throws). A boundary/refusal kind is NEVER wrapped/cached/retried (settled upstream at Tier 0).
#   §22 — ONE typed observability record per request (services/banzai-api/src/observability.js) that
#         EXTENDS the reasoning_trace and carries the §22 fields, excludes every secret/PII field name, and
#         leaks NONE of the forbidden items even under an adversarial prompt (behaviourally driven).
#   §23 — a lightweight in-process SLO aggregator (services/banzai-api/src/slo.js) exposing p50/p95/p99
#         (percentile_cont linear interpolation — the BZO-8 method), availability, fallback/error rate,
#         percent_deterministic/percent_model + per-tool availability & mean cost, via a read-only /slo
#         endpoint registered in server.js and proxied as /banzai/slo in the apex nginx conf.
#
# CI rule (like check-banzai-toolplanner.sh): the behavioural drive imports ONLY the hermetic, pg-free /
# WASM-free Inc.8 modules (they import solely Node built-ins + the crypto-only cache key helper). If even
# that import fails in a job without banzai-api node_modules, the guard DEGRADES to the static checks — it
# never fails on an uninstalled optional runtime dependency.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

RUNTIME="services/banzai-api/src/toolRuntime.js"
OBS="services/banzai-api/src/observability.js"
SLO="services/banzai-api/src/slo.js"
SERVER="services/banzai-api/src/server.js"

echo "== banzai-robustness-observability-check (Increment 8, §21–§23) =="

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'CIRCUIT_OPEN' | grep -q 'CIRCUIT_OPEN' || { echo "guard self-test FAILED" >&2; exit 2; }

for f in "$RUNTIME" "$OBS" "$SLO" "$SERVER"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
done

# ── static: §21 — the harness wraps tools with every robustness layer ─────────────────────────────────
grep -q "AbortController" "$RUNTIME" || fail "$RUNTIME must use AbortController for per-tool timeouts"
grep -qE "setTimeout" "$RUNTIME" || fail "$RUNTIME must enforce a per-tool timeout"
grep -q "IDEMPOTENT_READ_KINDS" "$RUNTIME" || fail "$RUNTIME must gate retry on idempotent read kinds"
grep -q "MUTATING_KINDS" "$RUNTIME" || fail "$RUNTIME must never retry a mutating/reproduce tool"
grep -q "NEVER_WRAP_KINDS" "$RUNTIME" || fail "$RUNTIME must never wrap a boundary/refusal kind"
grep -qE "retry_policy" "$RUNTIME" || fail "$RUNTIME must honour the contract retry_policy"
grep -qiE "circuit" "$RUNTIME" || fail "$RUNTIME must implement a circuit breaker"
grep -qE "half_open" "$RUNTIME" || fail "$RUNTIME circuit breaker must have a half-open probe"
grep -qiE "ttlFor|freshness" "$RUNTIME" || fail "$RUNTIME must cache with a freshness-scoped TTL"
grep -qE "acquire|MAX_CONCURRENCY" "$RUNTIME" || fail "$RUNTIME must apply a per-tool concurrency cap"
grep -q "__degraded" "$RUNTIME" || fail "$RUNTIME must return a typed degraded result (fault isolation)"
# HONEST_FALLBACK + REPRODUCE_EXECUTION must be named as the never-wrapped / never-retried kinds.
grep -q "HONEST_FALLBACK" "$RUNTIME" || fail "$RUNTIME must name HONEST_FALLBACK as a never-wrapped kind"
grep -q "REPRODUCE_EXECUTION" "$RUNTIME" || fail "$RUNTIME must name REPRODUCE_EXECUTION as a never-retried mutating kind"
[ "$FAILED" -eq 0 ] && ok "toolRuntime.js wraps tools with timeout + bounded-retry(idempotent) + circuit(half-open) + cache(freshness) + concurrency + isolation; boundary/mutating excluded"

# ── static: §22 — the observability record excludes secret/PII field names ─────────────────────────────
grep -q "FORBIDDEN_FIELD_NAMES" "$OBS" || fail "$OBS must declare FORBIDDEN_FIELD_NAMES"
grep -q "scrubObservability" "$OBS" || fail "$OBS must scrub the record (defence in depth)"
grep -q "buildReasoningTrace" "$OBS" || fail "$OBS must EXTEND the existing reasoning_trace (not a parallel trace)"
for forbidden in cookie otp token secret pepper system_prompt chain_of_thought prompt; do
  grep -qE "\"$forbidden\"" "$OBS" || fail "$OBS FORBIDDEN_FIELD_NAMES must list '$forbidden'"
done
# The record must NOT surface the raw numeric confidence — a BAND only.
grep -qE "confidence_band|confidenceBand" "$OBS" || fail "$OBS must expose a confidence BAND, never the raw number"
[ "$FAILED" -eq 0 ] && ok "observability.js extends the reasoning_trace, forbids secret/PII field names, scrubs values, and exposes a confidence band"

# ── static: §23 — the SLO aggregator + endpoint ───────────────────────────────────────────────────────
grep -q "percentileCont" "$SLO" || fail "$SLO must compute percentiles (percentileCont)"
grep -qE "percentile_cont" "$SLO" || fail "$SLO must state the percentile_cont linear-interpolation method"
for field in p50 p95 p99 availability error_rate fallback_rate percent_deterministic percent_model; do
  grep -qE "$field" "$SLO" || fail "$SLO snapshot must expose $field"
done
grep -qE "schema_version:\s*\"banzai-slo/1\"" "$SLO" || fail "$SLO must carry schema_version banzai-slo/1"
grep -qE "authoritative:\s*false" "$SLO" || fail "$SLO must carry authoritative:false (non-signed telemetry)"
grep -qE "rolling" "$SLO" || fail "$SLO must document the rolling window"
grep -q "reset" "$SLO" || fail "$SLO must support reset() (documented window reset)"
[ "$FAILED" -eq 0 ] && ok "slo.js exposes p50/p95/p99 (percentile_cont) + availability/error/fallback + %deterministic/%model + reset + rolling window"

# ── static: server.js wiring — hardened tools + /slo route + observability surfaced ───────────────────
grep -q "createToolRuntime" "$SERVER" || fail "$SERVER must construct the tool runtime"
grep -q "wrapTool" "$SERVER" || fail "$SERVER must wrap the injected tools via the harness"
grep -q "createSlo" "$SERVER" || fail "$SERVER must construct the SLO aggregator"
grep -qE "path === \"/slo\"" "$SERVER" || fail "$SERVER must register the read-only /slo route"
grep -q "buildObservabilityRecord" "$SERVER" || fail "$SERVER must build the observability record"
grep -qE "observability," "$SERVER" || fail "$SERVER must surface the observability record in the /ask body"
grep -q "slo.recordRequest" "$SERVER" || fail "$SERVER must record each request into the SLO aggregator"
# The pipeline must receive the HARDENED tools (proof the wrapping is actually wired).
grep -qE "liveArtifactTool:\s*hardenedLiveArtifactTool" "$SERVER" || fail "$SERVER must pass the hardened live-artifact tool to the pipeline"
grep -qE "telemetryTool:\s*hardenedTelemetryTool" "$SERVER" || fail "$SERVER must pass the hardened telemetry tool to the pipeline"
grep -qE "receiptsTool:\s*hardenedReceiptsTool" "$SERVER" || fail "$SERVER must pass the hardened receipts tool to the pipeline"
[ "$FAILED" -eq 0 ] && ok "server.js wires the harness (hardened tools) + the SLO aggregator + the /slo route + the observability record"

# ── static: the apex nginx conf proxies /banzai/slo → the internal /slo handler ───────────────────────
apex_found=0
for conf in $(find infra -type f -path '*/nginx/conf.d/*.conf' 2>/dev/null | sort -u); do
  [ -f "$conf" ] || continue
  grep -qE 'location = /banzai/ask' "$conf" || continue
  apex_found=1
  if grep -qE 'location = /banzai/slo' "$conf" && grep -A6 'location = /banzai/slo' "$conf" | grep -qE 'proxy_pass[^;]*/slo;'; then
    ok "$conf: /banzai/slo proxies to the internal /slo handler"
  else
    fail "$conf: must proxy /banzai/slo → the internal /slo handler"
  fi
  if grep -A6 'location = /banzai/slo' "$conf" | grep -qE 'proxy_pass[^;]*/health'; then fail "$conf: /banzai/slo must NOT proxy to /health"; fi
done
[ "$apex_found" -eq 1 ] || fail "no apex nginx conf (with location = /banzai/ask) found under infra/"

# ── behavioural: drive the hermetic Inc.8 modules (pg-free/WASM-free). Degrade to static if uninstalled. ─
node - "$RUNTIME" "$OBS" "$SLO" <<'NODE'
(async () => {
  const url = require("url");
  const path = require("path");
  const imp = (p) => import(url.pathToFileURL(path.resolve(p)).href);
  let rtMod, obsMod, sloMod;
  try {
    [rtMod, obsMod, sloMod] = await Promise.all([imp(process.argv[2]), imp(process.argv[3]), imp(process.argv[4])]);
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/Cannot find package|Cannot find module|ERR_MODULE_NOT_FOUND/.test(msg)) {
      console.log("  ok: behavioural drive skipped (banzai-api deps not installed in this job) — static checks still apply");
      process.exit(0);
    }
    console.log("FAIL: behavioural import threw: " + msg);
    process.exit(1);
  }
  let bad = 0;
  const err = (m) => { console.log("FAIL: " + m); bad = 1; };
  const { createToolRuntime } = rtMod;
  const { buildObservabilityRecord, REQUIRED_OBSERVABILITY_FIELDS } = obsMod;
  const { createSlo, percentileCont } = sloMod;

  const CONTRACTS = [
    { kind: "LIVE_ARTIFACT_FETCH", timeout_ms: 8000, retry_policy: "bounded", freshness: "live", fallback_policy: "REGISTRY_LOOKUP" },
    { kind: "METRICS_QUERY", timeout_ms: 5000, retry_policy: "none", freshness: "persisted", fallback_policy: "HONEST_FALLBACK" },
    { kind: "REPRODUCE_EXECUTION", timeout_ms: 60000, retry_policy: "bounded", freshness: "persisted", fallback_policy: "RECEIPT_LOOKUP" },
    { kind: "HONEST_FALLBACK", timeout_ms: 100, retry_policy: "none", freshness: "static", fallback_policy: "HONEST_FALLBACK" },
  ];
  let t = 1000000; const nowFn = () => t;
  const rt = createToolRuntime(
    { BANZAI_TOOL_CIRCUIT_THRESHOLD: "3", BANZAI_TOOL_CIRCUIT_COOLDOWN_MS: "1000", BANZAI_TOOL_MAX_RETRIES: "1", BANZAI_TOOL_RETRY_BACKOFF_MS: "0", BANZAI_TOOL_TIMEOUT_MS_METRICS_QUERY: "20" },
    { contracts: CONTRACTS, nowFn }
  );

  // timeout degrades to fallback, never throws
  const to = await rt.harness("METRICS_QUERY", () => new Promise((r) => setTimeout(() => r({ ok: true }), 300)), { args: { x: 1 } });
  if (!(to && to.ok === false && to.error.code === "TIMEOUT" && to.__degraded)) err("timeout did not degrade to a typed fallback");

  // bounded retry only for idempotent read; recovers on the 2nd attempt
  let calls = 0;
  const flaky = () => { calls += 1; return Promise.resolve(calls < 2 ? { ok: false, error: { code: "FETCH_ERROR" } } : { ok: true, observation: {} }); };
  const rec = await rt.harness("LIVE_ARTIFACT_FETCH", flaky, { args: { y: 1 } });
  if (!(rec && rec.ok === true && calls === 2)) err("bounded retry did not recover an idempotent read");

  // mutating never retried
  let mcalls = 0;
  await rt.harness("REPRODUCE_EXECUTION", () => { mcalls += 1; return Promise.resolve({ ok: false, error: { code: "TOOL_EXCEPTION" } }); }, { args: { id: "e" } });
  if (mcalls !== 1) err("a mutating tool must be single-shot");

  // circuit opens after 3 failures then half-opens to recover
  const fail3 = () => Promise.resolve({ ok: false, error: { code: "TELEMETRY_ERROR" } });
  for (let i = 0; i < 3; i++) await rt.harness("METRICS_QUERY", fail3, { args: { c: i } });
  const fast = await rt.harness("METRICS_QUERY", fail3, { args: { c: 9 } });
  if (fast.error.code !== "CIRCUIT_OPEN") err("circuit did not open after N failures");
  t += 1001;
  const back = await rt.harness("METRICS_QUERY", () => Promise.resolve({ ok: true, observation: {} }), { args: { c: 10 } });
  if (!(back && back.ok === true)) err("half-open probe did not recover the circuit");

  // cache hit within TTL (same args) — the callable runs once
  let ccalls = 0;
  const cfn = () => { ccalls += 1; return Promise.resolve({ ok: true, observation: { n: ccalls } }); };
  await rt.harness("LIVE_ARTIFACT_FETCH", cfn, { args: { same: 1 } });
  await rt.harness("LIVE_ARTIFACT_FETCH", cfn, { args: { same: 1 } });
  if (ccalls !== 1) err("a cache hit within TTL must not re-invoke the tool");

  // boundary/meta kind never wrapped: no cache (both calls run)
  let bcalls = 0;
  const bfn = () => { bcalls += 1; return Promise.resolve({ ok: true }); };
  await rt.harness("HONEST_FALLBACK", bfn, { args: { q: 1 } });
  await rt.harness("HONEST_FALLBACK", bfn, { args: { q: 1 } });
  if (bcalls !== 2) err("a boundary kind must never be cached/wrapped");

  // §22 record: all fields + NO forbidden leak under adversarial input
  const adv = buildObservabilityRecord(
    { intent: "get_reason_code", operator_id: "-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----", fallback_reason: "Bearer abcdefghijklmnop", system_prompt: "You are BanzAI", prompt: "raw", chain_of_thought: "cot", tool_plan: { steps: [{ kind: "REASON_CODE_LOOKUP" }] }, llm_called: false },
    {},
    { requestId: "q", elapsedMs: 3, toolEvents: [{ kind: "REASON_CODE_LOOKUP", outcome: "ok", duration_ms: 2 }], sources: [{ id: "reason-codes" }] }
  );
  for (const f of REQUIRED_OBSERVABILITY_FIELDS) if (!(f in adv)) err("observability record missing §22 field " + f);
  const blob = JSON.stringify(adv);
  for (const forbidden of ["BEGIN PRIVATE KEY", "Bearer abcdef", "You are BanzAI", "chain_of_thought", "system_prompt", "\"prompt\""]) {
    if (blob.includes(forbidden)) err("observability record leaked forbidden item: " + forbidden);
  }

  // §23 SLO shape + percentile_cont
  if (percentileCont([10, 20, 30, 40], 50) !== 25) err("percentileCont is not linear interpolation");
  const slo = createSlo({});
  slo.recordRequest({ latency_ms: 5, deterministic: true });
  slo.recordRequest({ latency_ms: 35, error: true });
  const s = slo.snapshot();
  for (const k of ["schema_version", "latency_ms", "availability", "error_rate", "fallback_rate", "percent_deterministic", "percent_model", "tools", "slo_targets", "window"]) {
    if (!(k in s)) err("SLO snapshot missing field " + k);
  }
  if (s.schema_version !== "banzai-slo/1") err("SLO schema_version wrong");
  if (!/percentile_cont/.test(s.latency_ms.method)) err("SLO must state the percentile_cont method");
  if (s.authoritative !== false) err("SLO must be authoritative:false");

  if (!bad) console.log("  ok: harness (timeout/retry/circuit/cache/isolation/boundary) + §22 no-leak record + §23 SLO shape verified behaviourally");
  process.exit(bad);
})();
NODE
[ $? -eq 0 ] || FAILED=1

if [ "$FAILED" -ne 0 ]; then
  echo "ROBUSTNESS-OBSERVABILITY CHECK FAILED ❌"
  exit 1
fi
echo "ROBUSTNESS-OBSERVABILITY CHECK PASSED ✅"
