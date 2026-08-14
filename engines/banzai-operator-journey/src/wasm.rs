//! WASM (browser + Node) exports for the BanzAI operator-journey state machine (M2.9B).
//!
//! JSON-in/JSON-out over the deterministic Rust journey logic (see `crate`). The website (web target)
//! drives the guided UI; the banzai-api `/ask` (nodejs target) re-derives the SAFE session context here
//! so it never trusts the raw browser state. No LLM, no network, no persistence. Compiled only under the
//! `wasm` feature; native builds exercise the same logic via `crate::*` and `cargo test`.

use crate::session::{evaluate_session, safe_session_summary};
use crate::{
    can_advance, evaluate, next_step, prev_step, safe_context, safe_context_line, scan_upload_json,
    steps_json,
};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

/// Ordered journey steps + labels: `[{step,label},…]`.
#[wasm_bindgen]
pub fn journey_steps_json() -> String {
    steps_json().to_string()
}

/// Evaluate the guidance path from the session state (NAVIGATION vocabulary only):
/// `{current_step, steps:[{step,label,status,technical_reference}], visited_steps, navigation_progress,
/// next_recommended_action, warnings, last_error}` (ADR-036). No verdict, no score.
#[wasm_bindgen]
pub fn journey_evaluate_json(state: &str) -> String {
    evaluate(&parse(state)).to_string()
}

/// `{allowed, warning}` for a forward/backward transition given the session state.
#[wasm_bindgen]
pub fn journey_can_advance_json(from: &str, to: &str, state: &str) -> String {
    can_advance(from, to, &parse(state)).to_string()
}

/// The next / previous step (clamped).
#[wasm_bindgen]
pub fn journey_next_step(current: &str) -> String {
    next_step(current)
}
#[wasm_bindgen]
pub fn journey_prev_step(current: &str) -> String {
    prev_step(current)
}

/// The SAFE, normalized session context (object) for the local Qwen — no raw browser state.
#[wasm_bindgen]
pub fn journey_safe_context_json(state: &str) -> String {
    safe_context(&parse(state)).to_string()
}

/// The SAFE session context as a single slug-only line (for the prompt / telemetry).
#[wasm_bindgen]
pub fn journey_safe_context_line(state: &str) -> String {
    safe_context_line(&parse(state))
}

/// Scan an uploaded JSON artifact (M2.9C): `{ok, parsed_ok, has_secret, marker, error}`. Rejects empty,
/// oversized, malformed, or secret/credential-bearing uploads — never echoes the file content.
#[wasm_bindgen]
pub fn journey_scan_upload_json(text: &str) -> String {
    scan_upload_json(text).to_string()
}

/// ADR-036 — evaluate the guidance NAVIGATION model from the browser's in-memory state.
///
/// Returns `{model:"operator-guidance", authority:"model-b", overall_state,
/// navigation:{activities_visited,activities_total,current_step},
/// navigation_progress:{activities_visited,activities_total,kind,is_technical_score},
/// steps:[{step,label,status,status_label,technical_reference}], next_recommended_action,
/// next_action_step, journey_complete}`. No verdict, no score; technical state is referenced (typed
/// pointer to Model B), never recomputed.
#[wasm_bindgen]
pub fn journey_session_json(state: &str) -> String {
    evaluate_session(&parse(state)).to_string()
}

/// ADR-036 — the SAFE one-line session summary for the local model: navigation slugs and counts only,
/// never a file body, a path, a key, free browser text or a score.
#[wasm_bindgen]
pub fn journey_session_summary(state: &str) -> String {
    safe_session_summary(&parse(state))
}

/// ADR-036 — the one-sentence answer to "o que faço agora?", from the same next orientation activity
/// the guidance panel renders. Non-technical: it defers every technical claim to Model B.
#[wasm_bindgen]
pub fn journey_next_action_sentence(state: &str) -> String {
    crate::session::next_action_sentence(&parse(state))
}

/// ADR-036 — the canonical slug vocabulary this guidance engine can emit: steps, navigation statuses,
/// actions, overall states, the referenced Model B states, and the typed reference fields. Published so
/// the UI's label maps can be PROVEN complete against it instead of kept in sync by hand.
#[wasm_bindgen]
pub fn journey_vocabulary_json() -> String {
    crate::session::vocabulary().to_string()
}
