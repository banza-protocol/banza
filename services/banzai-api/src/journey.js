// BanzAI operator-guidance backend glue (ADR-042; reframed by ADR-042 §D-076-01/02). RUST_WRAPPER_ONLY.
//
// REGRA (ADR-042 §D-076-01): Modelo A orienta o percurso; Modelo B avalia — existe uma única
// autoridade de estado técnico. This file belongs to Model A (the guidance layer). It surfaces ONLY
// navigation state and TYPED REFERENCES to Model B — never a verdict, never a score.
//
// The /ask endpoint receives a browser-supplied `journey_context` (+ `current_step`). This module
// RE-DERIVES the safe guidance view server-side through the SAME Rust engine
// (engines/banzai-operator-journey compiled to Node WASM) — it NEVER trusts the browser copy. All
// guidance logic (navigation statuses, transitions, next orientation activity, and the sanitized
// context summary) is computed in Rust; this file only shuttles JSON in/out (no scoring, no verdict, no
// state logic, no interpretation). No LLM, no network, no persistence — the session lives only in the
// browser's memory.

import { createRequire } from "node:module";

// Node WASM built from engines/banzai-operator-journey (`wasm-pack build --target nodejs`) and vendored
// under src/journeywasm/ (its own CJS package boundary, like src/rustkb).
const j = createRequire(import.meta.url)("./journeywasm/banzai_operator_journey.js");

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// The canonical orientation activities (Rust owns the order; mirrored here only to shape the input).
const CANON_STEPS = [
  "guia",
  "manifest",
  "conformidade",
  "trust",
  "federacao",
  "evidence_bundle",
  "traces",
];

// The legacy flat verdict fields. Under ADR-042 §D-076-02 only their PRESENCE is read (as "visited");
// the value is discarded and NEVER re-interpreted as a verdict.
const LEGACY_STATUS_KEYS = {
  guia: "guia_status",
  manifest: "manifest_status",
  conformidade: "conformance_status",
  trust: "trust_status",
  federacao: "federation_status",
  evidence_bundle: "evidence_bundle_status",
  traces: "trace_status",
};

// The ONLY technical fields Model A may carry: a typed, opaque pointer to a Model B execution/step.
const REFERENCE_FIELDS = [
  "validation_execution_id",
  "step_id",
  "receipt_reference",
  "evidence_reference",
  "model_b_state",
];

// A reference token is a pointer, not free text: keep `[A-Za-z0-9._:-]`, capped. Rust re-sanitizes too.
function safeRef(v) {
  return typeof v === "string" ? v.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 96) : "";
}

// Normalize the (untrusted) browser journey_context + current_step into the NAVIGATION state object the
// Rust engine reads: `{ current_step, steps: { <step>: { visited, technical_reference } }, last_error }`.
// No verdict/status VALUE is ever forwarded — only navigation (visited) + typed Model B references.
// Raw drafts, keys, secrets and verdict values are dropped here before they ever reach Rust.
function toState(journeyContext, currentStep) {
  const src = journeyContext && typeof journeyContext === "object" ? journeyContext : {};
  const state = {};
  if (typeof currentStep === "string" && currentStep) {
    state.current_step = currentStep.slice(0, 40);
  } else if (typeof src.current_step === "string") {
    state.current_step = src.current_step.slice(0, 40);
  }

  const srcSteps = src.steps && typeof src.steps === "object" ? src.steps : {};
  const steps = {};
  for (const step of CANON_STEPS) {
    const node = srcSteps[step] && typeof srcSteps[step] === "object" ? srcSteps[step] : {};
    let visited = node.visited === true || src[`${step}_visited`] === true;
    // Legacy flat field: presence ⇒ visited (navigation). The value is never read as a verdict.
    const legacyKey = LEGACY_STATUS_KEYS[step];
    if (!visited && legacyKey && typeof src[legacyKey] === "string" && src[legacyKey]) {
      visited = true;
    }
    const entry = {};
    if (visited) entry.visited = true;
    // A typed reference to Model B — ids only, everything else stripped.
    const ref =
      node.technical_reference && typeof node.technical_reference === "object"
        ? node.technical_reference
        : null;
    if (ref) {
      const tr = {};
      for (const f of REFERENCE_FIELDS) {
        if (typeof ref[f] === "string" && ref[f]) tr[f] = safeRef(ref[f]);
      }
      if (Object.keys(tr).length) entry.technical_reference = tr;
    }
    if (Object.keys(entry).length) steps[step] = entry;
  }
  if (Object.keys(steps).length) state.steps = steps;
  if (typeof src.last_error === "string" && src.last_error) state.last_error = src.last_error.slice(0, 200);
  return state;
}

// M2.9C — sanitize the browser's uploaded-artifacts SUMMARY (never the raw file body, which is never
// sent). Keeps only a known-shaped step slug, a safe basename, and a bounded numeric size. Injection
// characters, newlines and oversize values are stripped; the list is capped. Never throws.
export function sanitizeUploadedArtifacts(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((a) => a && typeof a === "object")
    .map((a) => ({
      step: String(a.step || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40),
      file_name: String(a.file_name || "").replace(/[\r\n]/g, " ").replace(/[^\w.\- ]/g, "").slice(0, 160),
      size: Math.max(0, Math.min(Number(a.size) || 0, 1024 * 1024)),
    }))
    .filter((a) => a.step)
    .slice(0, 8);
}

// Re-derive the safe guidance view. Returns null when there is no usable journey input (so the caller
// can treat the request as a plain, non-journey question). NAVIGATION ONLY + typed Model B references —
// no verdict, no score. Never throws.
export function deriveJourney(journeyContext, currentStep) {
  const hasInput =
    (journeyContext && typeof journeyContext === "object" && Object.keys(journeyContext).length > 0) ||
    (typeof currentStep === "string" && currentStep.trim());
  if (!hasInput) return null;
  try {
    const state = toState(journeyContext, currentStep);
    const stateJson = JSON.stringify(state);
    const evaluation = safeParse(j.journey_evaluate_json(stateJson)) || {};
    const safeContext = safeParse(j.journey_safe_context_json(stateJson)) || {};
    const summaryLine = String(j.journey_safe_context_line(stateJson) || "");
    // Compact step→navigation-status list (+ the typed Model B reference, if any) for telemetry.
    const stepStatuses = Array.isArray(evaluation.steps)
      ? evaluation.steps.map((s) => ({
          step: s.step,
          status: s.status,
          technical_reference: s.technical_reference ?? null,
        }))
      : [];
    const nav = evaluation.navigation_progress || {};
    return {
      current_step: safeContext.current_step || evaluation.current_step || "guia",
      next_recommended_action: evaluation.next_recommended_action || "abrir_guia",
      // Navigation progress — activities visited. Explicitly NOT a conformance/readiness/quality score.
      navigation_progress: {
        activities_visited: Number(nav.activities_visited) || 0,
        activities_total: Number(nav.activities_total) || 0,
        kind: "navigation_only",
        is_technical_score: false,
      },
      step_statuses: stepStatuses,
      // The one-line, slug-only navigation summary the model/telemetry can safely see (Rust-derived).
      session_state_summary: summaryLine,
      // ADR-042 — the answer to "o que faço agora?", composed in Rust from the SAME next orientation
      // activity the guidance panel renders. It defers every technical claim to Model B.
      next_action_sentence: String(j.journey_next_action_sentence(stateJson) || ""),
      // There is exactly one authority of technical validation state, and it is Model B (ADR-042
      // §D-076-01). This layer only references it; it never originates a verdict.
      technical_state_authority: "model-b",
      safe_context: safeContext,
    };
  } catch {
    return null;
  }
}
