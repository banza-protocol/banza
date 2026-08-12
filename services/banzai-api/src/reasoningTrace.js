// M2.18B.6 — the public-safe, versioned reasoning trace. Extracted into its own module so it is
// import-safe (server.js starts an HTTP listener on import; tests must not). It states WHAT the
// pipeline decided (fast-path, how intent was resolved, the single grounded synthesis status, routing,
// resolved id) so the eval harness and operators can measure BanzAI — WITHOUT leaking the prompt, the
// raw model output, the exact numeric confidence, retrieval scores or internal paths. Pure functions.

// The intents that ARE a boundary/refusal outcome, regardless of how routing got there. The
// deterministic router signals a boundary through `meta.intent` (e.g. a financial-action refusal is
// `action_boundary`) and may also set `routing_result`. The public `boundary_detected` must be true on
// every such path so the safety signal is never under-reported.
const BOUNDARY_INTENTS = new Set([
  "action_boundary",
  "critical_boundary",
  "safety_refusal",
  "safety_boundary",
  "operator_publication_boundary",
]);

// Bucket a numeric confidence into a public band (never expose the exact number — PART 4).
export function confidenceBand(c) {
  if (typeof c !== "number" || Number.isNaN(c)) return "unavailable";
  if (c >= 0.75) return "high";
  if (c >= 0.4) return "medium";
  return "low";
}

// Build the public reasoning trace from the pipeline meta + provider result. Present on EVERY path
// (fast-path, interpretation, clarification, boundary, fallback). `diagnostic` (config-gated, never a
// public query param) adds a few internal-but-safe fields — still no prompt / raw output / secrets.
export function buildReasoningTrace(meta = {}, result = {}, requestId = null, diagnostic = false) {
  const t = {
    version: 1,
    trace_id: requestId,
    fast_path_used: meta.fast_path_used !== undefined ? Boolean(meta.fast_path_used) : true,
    // How Rust resolved the question's meaning (always deterministic) + the single grounded synthesis
    // (the only model call). synthesis_status ∈ n/a | skipped | ok | rejected | invalid | failed |
    // timeout | unavailable.
    resolution_method: meta.resolution_method || "rust_deterministic",
    synthesis_called: Boolean(meta.synthesis_called),
    synthesis_status: meta.synthesis_status ?? "skipped",
    synthesis_model: meta.synthesis_model || null,
    synthesis_latency_ms: Number(meta.synthesis_latency_ms) || 0,
    fallback_used: Boolean(meta.fallback_used),
    primary_intent: meta.intent ?? null,
    // M2.18B.7 — the structured reason code for this answer class (EXACT_FACT_CONFIRMED /
    // ATTRIBUTE_NOT_DECLARED / EXPLANATION_GROUNDED / …). A single generic reason never stands in for
    // different causes; an internal coverage failure is caught as a bug, never shown as a legitimate
    // lack of evidence. Present when the terminal set it; null otherwise (public-safe — no scores/paths).
    reason_code: meta.reason_code ?? null,
    proposed_canonical_id: meta.resolver_result ?? null,
    resolved_canonical_id: meta.resolved_document_id ?? null,
    confidence_band: confidenceBand(meta.confidence),
    requires_clarification:
      meta.routing_result === "clarification" ||
      meta.routing_result === "unconfirmed_entity" ||
      meta.routing_result === "fallback_clarification",
    routing_result: meta.routing_result ?? null,
    boundary_detected:
      meta.routing_result === "boundary" ||
      meta.fallback_reason === "boundary_interpreted" ||
      BOUNDARY_INTENTS.has(meta.intent),
    local_model_called: Boolean(meta.llm_called) && result.inference_location === "local",
    external_model_called: result.inference_location === "external" && Boolean(meta.llm_called),
    // M2.18B.5 — typo tolerance / intent recovery (safe subset; NEVER edit distance or scores). `band`
    // ∈ exact|high_confidence|ambiguous; `correction_display` are accented canonical forms the UI shows
    // discreetly ("Interpretado como …"); `correction_clarification` are the options to offer on ambiguity.
    recovery_band: meta.recovery_band || "exact",
    correction_applied: Boolean(meta.correction_applied),
    correction_display: Array.isArray(meta.correction_display) ? meta.correction_display : [],
    correction_clarification: Array.isArray(meta.correction_clarification) ? meta.correction_clarification : [],
  };
  if (diagnostic) {
    t.diagnostic = {
      confidence_present: typeof meta.confidence === "number",
      resolver_result: meta.resolver_result ?? null,
      fallback_reason: meta.fallback_reason ?? null,
    };
  }
  return t;
}

// The exact set of keys the PUBLIC (non-diagnostic) trace may contain — used by the guard/tests to
// prove nothing sensitive leaks. Any new field must be added here deliberately.
export const PUBLIC_TRACE_KEYS = Object.freeze([
  "version",
  "trace_id",
  "fast_path_used",
  "resolution_method",
  "synthesis_called",
  "synthesis_status",
  "synthesis_model",
  "synthesis_latency_ms",
  "fallback_used",
  "primary_intent",
  "reason_code",
  "proposed_canonical_id",
  "resolved_canonical_id",
  "confidence_band",
  "requires_clarification",
  "routing_result",
  "boundary_detected",
  "local_model_called",
  "external_model_called",
  "recovery_band",
  "correction_applied",
  "correction_display",
  "correction_clarification",
]);
