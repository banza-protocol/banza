// Increment 8 (§22) — ONE typed observability record per request. It EXTENDS the existing M2.18B.1
// reasoning_trace (reasoningTrace.js) — it is not a parallel trace: the record literally embeds the trace
// and adds the §22 operational fields (the tool plan, per-tool durations + outcomes, total duration,
// sources, calculations, verification counts, typed error). It is surfaced in the /ask meta AND logged as
// structured JSON.
//
// SAFETY (§22, hard invariant, guard- + test-enforced under adversarial input): the record MUST NEVER
// carry cookies, an OTP, a token, a secret, a PEM/private key, the system prompt, chain-of-thought or any
// end-user PII. It is built from a STRICT allowlist of safe meta fields (ids / enums / counts / a
// confidence BAND — never the raw number, never the question, never the answer, never a header). As
// defence in depth `scrubObservability` redacts any string value that still matches a secret pattern, so
// even a malformed upstream field can never leak.

import { buildReasoningTrace, confidenceBand } from "./reasoningTrace.js";

// The §22 fields this record MUST carry, on top of the embedded reasoning_trace. The guard + tests assert
// each is present on every path.
export const REQUIRED_OBSERVABILITY_FIELDS = Object.freeze([
  "query_id",
  "intent",
  "sub_intents",
  "entities",
  "scope",
  "tool_plan",
  "tool_durations",
  "tool_outcomes",
  "total_duration_ms",
  "sources",
  "calculations",
  "fallback",
  "model_called",
  "claim_verification",
  "citation_verification",
  "confidence",
  "typed_error",
]);

// Field NAMES that must never appear anywhere in the record (defence in depth — the allowlist build never
// emits them, and scrubObservability drops any that somehow appear).
export const FORBIDDEN_FIELD_NAMES = Object.freeze([
  "cookie", "otp", "token", "secret", "password", "passwd", "pepper", "api_key", "apikey",
  "authorization", "bearer", "private_key", "privatekey", "pem", "system_prompt", "systemprompt",
  "chain_of_thought", "chainofthought", "prompt", "raw_output", "raw",
]);

// A value that looks like a secret / credential / PII (defence in depth). Kept narrow to avoid redacting
// the legitimate ids/enums the record carries.
const SECRET_VALUE_RX =
  /(-----BEGIN[ A-Z]*PRIVATE KEY-----|-----BEGIN[ A-Z]*KEY-----|\bsk-[A-Za-z0-9]{12,}|\bBearer\s+[A-Za-z0-9._-]{12,}|\beyJ[A-Za-z0-9._-]{20,}|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/;

// True if `s` contains a forbidden secret/PII pattern.
export function containsForbidden(s) {
  return typeof s === "string" && SECRET_VALUE_RX.test(s);
}

// Deep-scrub: redact any string value that matches a secret pattern and drop any key whose NAME is
// forbidden. Returns a cleaned copy (never mutates the input).
export function scrubObservability(value) {
  if (Array.isArray(value)) return value.map(scrubObservability);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_FIELD_NAMES.includes(String(k).toLowerCase())) continue; // drop forbidden key name
      out[k] = scrubObservability(v);
    }
    return out;
  }
  if (typeof value === "string" && containsForbidden(value)) return "[redacted]";
  return value;
}

// A safe id/enum token — letters, digits and ._:- only, capped. Anything else → "".
function safeToken(v, max = 96) {
  return typeof v === "string" ? v.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, max) : "";
}

function safeIdList(arr, max = 24) {
  return (Array.isArray(arr) ? arr : [])
    .map((x) => safeToken(typeof x === "string" ? x : x && (x.id || x.kind) ? x.id || x.kind : ""))
    .filter(Boolean)
    .slice(0, max);
}

// Build the ONE observability record. `sources` is a list of already-public source ids (ids only — never
// bodies). `toolEvents` are the { kind, outcome, duration_ms } entries the tool runtime recorded.
export function buildObservabilityRecord(meta = {}, result = {}, opts = {}) {
  const { requestId = null, elapsedMs = 0, toolEvents = [], sources = [] } = opts;
  const trace = buildReasoningTrace(meta, result, requestId, false);

  // Per-tool durations + outcomes (one summary per kind — sum durations, keep the last outcome).
  const tool_durations = {};
  const tool_outcomes = {};
  for (const e of Array.isArray(toolEvents) ? toolEvents : []) {
    const kind = safeToken(e && e.kind);
    if (!kind) continue;
    tool_durations[kind] = (tool_durations[kind] || 0) + Math.max(0, Number(e.duration_ms) || 0);
    tool_outcomes[kind] = safeToken(e.outcome) || "ok";
  }

  const entities = {};
  for (const f of ["entity_id", "entity_type", "operator_id", "implementation_id"]) {
    const t = safeToken(meta[f]);
    if (t) entities[f] = t;
  }

  const scope = {};
  for (const f of ["protocol_scope", "artifact_type", "profile", "environment", "protocol_version"]) {
    const t = safeToken(meta[f] ?? (meta.telemetry_scope ? meta.telemetry_scope[f] : undefined));
    if (t) scope[f] = t;
  }

  const tool_plan = safeIdList(meta.tool_plan && Array.isArray(meta.tool_plan.steps) ? meta.tool_plan.steps : []);
  const sub_intents = safeIdList(meta.interpreted_sub_intents);

  // calculations — a safe SUMMARY only (never values): how many typed claims/calculations, the derivation
  // method (aggregation), and the sample size when the FactualPackage exposes them.
  const fp = meta.factual_package || {};
  const calculations = {
    count: Array.isArray(meta.claims) ? meta.claims.length : Array.isArray(meta.operational_claims) ? meta.operational_claims.length : 0,
    aggregation_method: safeToken(meta.duration && meta.duration.aggregation_method) || safeToken(fp.aggregation_method) || null,
    sample_size: Number.isFinite(Number(fp.sample_size)) ? Number(fp.sample_size) : null,
  };

  // claim/citation verification — ok + an error count. This codebase verifies claims AND citations in one
  // pass (verifyClaims), so citation_verification mirrors the same verdict unless a distinct signal exists.
  const claimOk = meta.claim_verification_ok ?? null;
  const claim_verification = { ok: claimOk, errors: claimOk === false ? Number(meta.claim_verification_errors) || 1 : 0 };
  const citationOk = meta.citation_verification_ok ?? claimOk;
  const citation_verification = { ok: citationOk, errors: citationOk === false ? Number(meta.citation_verification_errors) || 1 : 0 };

  const record = {
    schema_version: "banzai-observability/1",
    // EXTENDS the reasoning_trace (query_id/trace_id, resolution, synthesis, boundary_detected, band, …).
    ...trace,
    query_id: requestId,
    intent: trace.primary_intent ?? null,
    sub_intents,
    entities,
    scope,
    tool_plan,
    tool_durations,
    tool_outcomes,
    total_duration_ms: Math.max(0, Math.round(Number(elapsedMs) || 0)),
    sources: safeIdList(sources),
    calculations,
    fallback: safeToken(meta.contextual_fallback_kind) || null,
    model_called: Boolean(meta.llm_called),
    claim_verification,
    citation_verification,
    // A confidence BAND only — never the raw number (reuses reasoningTrace.confidenceBand).
    confidence: trace.confidence_band ?? confidenceBand(undefined),
    typed_error: safeToken(meta.fallback_reason) || null,
  };

  return scrubObservability(record);
}
