//! banzai-operator-journey (ADR-042; reframed by ADR-042 §D-076-01/02) — the Rust state machine for the
//! BanzAI GUIDED OPERATOR-ORIENTATION path (historically "Model A"). It owns the STEP ORDER, the NEXT
//! ORIENTATION ACTIVITY, per-activity NAVIGATION status, navigation progress, and a SAFE session-context
//! summary for the local Qwen. The browser keeps only visual React state (in memory, cleared on reload);
//! ALL guidance logic — navigation statuses, transitions, next action, the sanitized context sent to
//! `/ask` — is computed here (ADR-043; rules 15/16). Deterministic; no LLM, no network, no persistence.
//!
//! GUIDANCE ONLY (ADR-042 §D-076-01/02): this layer orients the percurso; it does NOT evaluate. Its
//! per-activity status is navigation only — not_started | available | in_progress | completed — where
//! `completed` means an orientation activity was visited/finished and is navigation only, never approval,
//! certification, a conformance pass or a score. There is exactly one authority of technical validation
//! state, and it is Model B (`services/banzai-api/src/validate.js`). The only technical information this
//! layer may carry is a TYPED REFERENCE to Model B (see `session::ModelBReference`), never a recomputed
//! verdict. Regra: `Modelo A orienta o percurso; Modelo B avalia — existe uma única autoridade de estado
//! técnico.`

use serde_json::{json, Value};

#[cfg(feature = "wasm")]
mod wasm;

pub mod session;

/// The ordered journey steps. `assistente`/`perguntar` is contextual support, NOT a journey step;
/// `referencia`/`programadores`/`repositorio` are secondary. This order is the canonical validation
/// journey and is asserted by the guard.
pub const STEPS: &[&str] = &[
    "guia",
    "manifest",
    "conformidade",
    "trust",
    "federacao",
    "evidence_bundle",
    "traces",
];

/// Human labels (pt) for each step.
fn step_label(step: &str) -> &'static str {
    match step {
        "guia" => "Guia",
        "manifest" => "Manifest",
        "conformidade" => "Conformidade",
        "trust" => "Trust",
        "federacao" => "Federação",
        "evidence_bundle" => "Evidence Bundle",
        "traces" => "Traces / Relatório",
        _ => "",
    }
}

fn step_index(step: &str) -> Option<usize> {
    STEPS.iter().position(|s| *s == step)
}

// The allowed per-activity NAVIGATION status values (ADR-042 §D-076-02) are owned by
// `session::STATUSES` — `completed` is orientation only, never approval, certification, a conformance
// pass or a score. The retired verdict statuses (`valid`, `evidence_ready`, …) and every points scale
// are gone: this layer cannot express a technical conclusion; that is Model B's sole authority.

/// Normalize a "current step" value to a known step, else "guia" (the display default — where an
/// operator lands).
fn norm_step(v: Option<&Value>) -> String {
    match v.and_then(|x| x.as_str()) {
        Some(s) if step_index(s).is_some() => s.to_string(),
        _ => "guia".to_string(),
    }
}

/// The EXPLICIT current step (a known step actually present in the state), or empty. Only an explicit
/// current step counts as "visited" — an untouched session (no `current_step`) has visited nothing,
/// even though it DISPLAYS on the guide.
fn explicit_current(state: &Value) -> String {
    match state.get("current_step").and_then(|x| x.as_str()) {
        Some(s) if step_index(s).is_some() => s.to_string(),
        _ => String::new(),
    }
}

pub(crate) fn explicit_current_pub(state: &Value) -> String {
    explicit_current(state)
}

/// Sanitize a free-text field to a safe SLUG (lowercase, `[a-z0-9_]`, capped) so a browser-supplied
/// `last_error` (or any label) can never carry a prompt-injection payload or sensitive data downstream.
fn safe_slug(v: Option<&Value>, max: usize) -> String {
    let raw = v.and_then(|x| x.as_str()).unwrap_or("");
    let mut out = String::new();
    for c in raw.to_lowercase().chars() {
        if out.len() >= max {
            break;
        }
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if (c == ' ' || c == '-' || c == '_') && !out.ends_with('_') && !out.is_empty() {
            out.push('_');
        }
    }
    while out.ends_with('_') {
        out.pop();
    }
    out
}

/// The legacy flat verdict field name for a step. Under ADR-042 §D-076-02 only its PRESENCE is read
/// (as "visited"); its value is discarded — the flat field never re-enters as a verdict.
fn legacy_status_key(step: &str) -> &'static str {
    match step {
        "manifest" => "manifest_status",
        "conformidade" => "conformance_status",
        "trust" => "trust_status",
        "federacao" => "federation_status",
        "evidence_bundle" => "evidence_bundle_status",
        "traces" => "trace_status",
        "guia" => "guia_status",
        _ => "",
    }
}

/// Whether the operator has visited an activity — the ONLY navigation signal. Read from an explicit
/// `steps.<step>.visited` / `<step>_visited` flag, from being the current step, or from the mere
/// presence of a legacy flat field (value discarded). No verdict is ever read here.
fn step_visited(state: &Value, step: &str, current: &str) -> bool {
    if step == current {
        return true;
    }
    if state
        .get("steps")
        .and_then(|s| s.get(step))
        .and_then(|n| n.get("visited"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return true;
    }
    if state
        .get(format!("{step}_visited").as_str())
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return true;
    }
    let key = legacy_status_key(step);
    !key.is_empty() && state.get(key).and_then(|x| x.as_str()).is_some()
}

/// The per-activity NAVIGATION state read from the (untrusted) session state.
struct NavState {
    current: String,
    visited: Vec<(String, bool)>, // (step, visited) in STEPS order
    last_error: String,
}

fn read_state(state: &Value) -> NavState {
    let current = norm_step(state.get("current_step")); // display default (guia)
    let explicit = explicit_current(state); // only an explicit current step counts as visited
    let visited = STEPS
        .iter()
        .map(|s| (s.to_string(), step_visited(state, s, &explicit)))
        .collect();
    NavState {
        current,
        visited,
        last_error: safe_slug(state.get("last_error"), 48),
    }
}

fn visited_of(st: &NavState, step: &str) -> bool {
    st.visited
        .iter()
        .find(|(s, _)| s == step)
        .map(|(_, v)| *v)
        .unwrap_or(false)
}

// The pre-M2.11A status/blocking/next-action logic, and the M2.11A evidence-scoring model that
// replaced it, are both gone (ADR-042 §D-076-02): this layer no longer computes any verdict or score.
// `session::legacy_evaluation` derives the `/ask` compatibility view from the single navigation model.

/// Evaluate the guidance path — a COMPATIBILITY VIEW over the navigation model, in navigation
/// vocabulary only. Derived from `session::evaluate_session` so the two can never disagree; the shape
/// `/ask` (`services/banzai-api/src/journey.js`) consumes is stable.
pub fn evaluate(state: &Value) -> Value {
    crate::session::legacy_evaluation(state)
}

/// Can the operator navigate from `from` to `to`? Manual navigation is always permitted; a warning slug
/// is returned when an activity in between has not been VISITED yet (navigation only — never a verdict).
/// Backward navigation and same-step are always allowed with no warning.
pub fn can_advance(from: &str, to: &str, state: &Value) -> Value {
    let st = read_state(state);
    let (fi, ti) = match (step_index(from), step_index(to)) {
        (Some(a), Some(b)) => (a, b),
        _ => return json!({ "allowed": false, "warning": "unknown_step" }),
    };
    if ti <= fi {
        return json!({ "allowed": true, "warning": Value::Null });
    }
    // Advancing forward: warn if any activity from `from`..`to` (exclusive of `to`) is not visited.
    let mut warning: Value = Value::Null;
    for s in &STEPS[fi..ti] {
        if !visited_of(&st, s) {
            warning = json!(format!("{s}_por_visitar"));
            break;
        }
    }
    json!({ "allowed": true, "warning": warning })
}

/// The next / previous step (clamped to the path ends).
pub fn next_step(current: &str) -> String {
    let i = step_index(current).unwrap_or(0);
    STEPS[(i + 1).min(STEPS.len() - 1)].to_string()
}
pub fn prev_step(current: &str) -> String {
    let i = step_index(current).unwrap_or(0);
    STEPS[i.saturating_sub(1)].to_string()
}

/// Build a SAFE, compact session-context summary for the local Qwen from the (untrusted) browser state.
/// NAVIGATION vocabulary only: a step→nav-status map, navigation progress and the next orientation
/// activity. No verdict, no score, no raw payload. This is what `/ask` re-derives server-side and passes
/// to the model — never the raw browser state.
pub fn safe_context(state: &Value) -> Value {
    let st = read_state(state);
    let e = crate::session::evaluate_session(state);
    let mut steps = serde_json::Map::new();
    if let Some(arr) = e["steps"].as_array() {
        for s in arr {
            if let (Some(step), Some(status)) = (s["step"].as_str(), s["status"].as_str()) {
                steps.insert(step.to_string(), Value::from(status));
            }
        }
    }
    json!({
        "model": "operator-guidance",
        "authority": "model-b",
        "current_step": st.current,
        "steps": Value::Object(steps),
        "navigation_progress": e["navigation_progress"].clone(),
        "next_action": e["next_recommended_action"].clone(),
        "last_error": st.last_error,
    })
}

/// A one-line, human-readable rendering of the safe context (for the prompt / telemetry). Slug-only:
/// step→nav-status pairs, the current step and the next orientation activity. No reference ids appear
/// here (a pointer could carry `:`/`/`), so the line stays free of structural characters.
pub fn safe_context_line(state: &Value) -> String {
    let st = read_state(state);
    let e = crate::session::evaluate_session(state);
    let status_of = |step: &str| -> String {
        e["steps"]
            .as_array()
            .and_then(|a| a.iter().find(|s| s["step"] == step))
            .and_then(|s| s["status"].as_str())
            .unwrap_or("not_started")
            .to_string()
    };
    let next = e["next_recommended_action"].as_str().unwrap_or("");
    let mut line = format!(
        "current_step={} guia={} manifest={} conformidade={} trust={} federacao={} evidence_bundle={} traces={} next_action={}",
        st.current,
        status_of("guia"), status_of("manifest"), status_of("conformidade"), status_of("trust"),
        status_of("federacao"), status_of("evidence_bundle"), status_of("traces"), next,
    );
    if !st.last_error.is_empty() {
        line.push_str(&format!(" last_error={}", st.last_error));
    }
    line
}

/// The ordered steps + labels (for the UI nav / tests).
pub fn steps_json() -> Value {
    json!(STEPS
        .iter()
        .map(|s| json!({ "step": s, "label": step_label(s) }))
        .collect::<Vec<_>>())
}

// ── Upload JSON scan (M2.9C, ADR-042) ────────────────────────────────────────
// When an operator uploads a real protocol JSON artifact in the guided journey, the SAFE gate runs
// HERE in Rust (rules 15/16/26): parse the JSON, enforce a size backstop, and REJECT anything that
// carries private keys / secrets / credentials. BanzAI never processes key material — public keys are
// fine (a protocol verifies signed metadata with them), private material and credential fields are not.

/// Hard backstop on the accepted upload size (the browser enforces a tighter 256 KB; this guards the
/// engine even if the JS layer is bypassed).
const MAX_UPLOAD_BYTES: usize = 512 * 1024;

/// Private-key MATERIAL markers — scanned in the raw text AND in string values (case-insensitive).
/// Only PRIVATE material: `BEGIN PUBLIC KEY` is intentionally NOT here (public keys are legitimate).
const SECRET_VALUE_MARKERS: &[&str] = &[
    "begin private key",
    "begin rsa private key",
    "begin ec private key",
    "begin dsa private key",
    "begin openssh private key",
    "begin pgp private key",
];

/// Credential FIELD-NAME markers — matched against object KEYS (case-insensitive). Matching keys, not
/// values, avoids rejecting a value that merely mentions a word while still catching secret fields.
const SECRET_KEY_MARKERS: &[&str] = &[
    "private_key",
    "privatekey",
    "api_key",
    "apikey",
    "secret",
    "password",
    "passwd",
    "token",
    "mnemonic",
    "seed",
    "wallet_private_key",
    "client_secret",
    "secret_key",
    "access_token",
    "refresh_token",
];

/// Walk a parsed JSON value: any object key that looks like a credential, or any string value that
/// carries private-key material, is a hit. Returns the matched marker (namespaced by where it hit).
fn find_secret(value: &Value) -> Option<String> {
    match value {
        Value::Object(map) => {
            // JWK private material: a key object (`kty`) carrying a private member (`d`/`p`/`q`/…/`k`).
            // A PUBLIC JWK (kty + n/e or crv/x/y) has none of these, so it is not flagged.
            if map.contains_key("kty") {
                for pk in ["d", "p", "q", "dp", "dq", "qi", "k"] {
                    if map.contains_key(pk) {
                        return Some(format!("jwk_private_{pk}"));
                    }
                }
            }
            for (k, v) in map {
                let lk = k.to_lowercase();
                if let Some(m) = SECRET_KEY_MARKERS.iter().find(|m| lk.contains(**m)) {
                    return Some(format!("field_{m}"));
                }
                if let Some(hit) = find_secret(v) {
                    return Some(hit);
                }
            }
            None
        }
        Value::Array(arr) => arr.iter().find_map(find_secret),
        Value::String(s) => {
            let ls = s.to_lowercase();
            SECRET_VALUE_MARKERS
                .iter()
                .find(|m| ls.contains(**m))
                .map(|m| format!("material_{}", m.replace(' ', "_")))
        }
        _ => None,
    }
}

/// Scan an uploaded JSON artifact. Returns:
/// `{ ok, parsed_ok, has_secret, marker, error }` — a SAFE, typed verdict the UI/backend can act on.
/// `ok:true` only when the text is non-empty, within size, valid JSON, and carries no secret/credential.
/// Never echoes the file content (so a rejected secret is never reflected back).
pub fn scan_upload_json(text: &str) -> Value {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return json!({ "ok": false, "parsed_ok": false, "has_secret": false, "marker": Value::Null, "error": "empty" });
    }
    if text.len() > MAX_UPLOAD_BYTES {
        return json!({ "ok": false, "parsed_ok": false, "has_secret": false, "marker": Value::Null, "error": "too_large" });
    }
    // 1. Raw material scan first — catches private-key material even if the JSON is malformed.
    let lower = text.to_lowercase();
    if let Some(m) = SECRET_VALUE_MARKERS.iter().find(|m| lower.contains(**m)) {
        return json!({ "ok": false, "parsed_ok": false, "has_secret": true, "marker": format!("material_{}", m.replace(' ', "_")), "error": "secret_detected" });
    }
    // 2. Structural parse (generic error only — never reflect the file body).
    let value: Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => {
            return json!({ "ok": false, "parsed_ok": false, "has_secret": false, "marker": Value::Null, "error": "invalid_json" });
        }
    };
    // 3. Credential-field scan on the parsed tree.
    if let Some(marker) = find_secret(&value) {
        return json!({ "ok": false, "parsed_ok": true, "has_secret": true, "marker": marker, "error": "secret_detected" });
    }
    json!({ "ok": true, "parsed_ok": true, "has_secret": false, "marker": Value::Null, "error": Value::Null })
}

/// Public accessors used by `session` (M2.11A) so the evidence model can reuse the canonical
/// labels and the normalised current step without duplicating them.
pub fn step_label_pub(step: &str) -> &'static str {
    step_label(step)
}

pub fn current_step_pub(state: &Value) -> String {
    norm_step(state.get("current_step"))
}
