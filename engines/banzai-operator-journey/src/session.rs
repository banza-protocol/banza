//! Operator-guidance navigation model (ADR-042 §D-076-01/02, Fase B).
//!
//! REGRA (ADR-042 §D-076-01)
//! -------------------------
//! Modelo A orienta o percurso; Modelo B avalia — existe uma única autoridade de estado técnico.
//!
//! WHAT THIS MODULE IS
//! -------------------
//! This is the GUIDANCE layer (historically "Model A"). It tracks WHERE an operator is in the guided
//! orientation path and nothing else. It is deliberately incapable of producing a technical verdict.
//! Its only vocabulary is NAVIGATION —
//!
//!   not_started | available | in_progress | completed
//!
//! — where `completed` means an orientation activity was visited/finished, and NEVER a technical
//! approval, conformance pass, readiness, quality score or certification.
//!
//! WHAT IT MUST NEVER DO (ADR-042 §D-076-02)
//! -----------------------------------------
//!   * emit verdict-like statuses (the retired `valid` / `evidence_ready`);
//!   * emit any score, points or 0–100 quality/readiness/conformance number;
//!   * recompute, duplicate or persist a Model B verdict.
//!
//! TYPED REFERENCE TO MODEL B (the only technical information it may carry)
//! ----------------------------------------------------------------------
//! The single channel through which technical state is surfaced is a TYPED REFERENCE to Model B —
//! `validation_execution_id`, `step_id`, `receipt_reference`, `evidence_reference` — echoed as an
//! opaque pointer, plus the referenced `model_b_state` read straight from Model B and never recomputed
//! here. Because this layer has no positive-technical state at all, a Model B `FAILED`/`BLOCKED`
//! reference can never render as a positive/technical-complete conclusion in it: navigation
//! `completed` is orientation only and is derived exclusively from whether an activity was visited,
//! never from any Model B state.

use serde_json::{json, Value};

use crate::STEPS;

/// Every NAVIGATION status a guidance activity may hold. There is no verdict here: `completed` means
/// the orientation activity was visited/finished, never a technical approval (ADR-042 §D-076-02).
/// Deliberately absent: `valid`, `evidence_ready`, and every score/points scale — the guidance layer
/// cannot express a technical conclusion.
pub const STATUSES: &[&str] = &["not_started", "available", "in_progress", "completed"];

/// The canonical six Model B per-step states (ADR-042 §D-076-04). Model A only ever REFERENCES these
/// (echoing what Model B decided); it never computes or alters them.
pub const MODEL_B_STATES: &[&str] = &[
    "NOT_EVALUATED",
    "RUNNING",
    "VERIFIED",
    "PENDING",
    "FAILED",
    "BLOCKED",
];

/// Portuguese label for a navigation status, used verbatim by the UI so the wording cannot drift
/// per-surface. `completed` is spelled out as orientation, not approval.
pub fn status_label(s: &str) -> &'static str {
    match s {
        "not_started" => "não iniciado",
        "available" => "disponível",
        "in_progress" => "em curso",
        "completed" => "concluído (orientação)",
        _ => "não iniciado",
    }
}

/// A typed, opaque reference to a Model B execution/step (ADR-042 §D-076-02). Ids only — never a body,
/// path, secret or recomputed verdict. `model_b_state` is the referenced Model B per-step state, read
/// from Model B (the single technical authority) and echoed verbatim; Model A never derives it.
#[derive(Clone, Default)]
pub struct ModelBReference {
    pub validation_execution_id: String,
    pub step_id: String,
    pub receipt_reference: String,
    pub evidence_reference: String,
    pub model_b_state: String,
}

impl ModelBReference {
    fn has_any(&self) -> bool {
        !self.validation_execution_id.is_empty()
            || !self.step_id.is_empty()
            || !self.receipt_reference.is_empty()
            || !self.evidence_reference.is_empty()
            || !self.model_b_state.is_empty()
    }

    fn to_json(&self) -> Value {
        json!({
            "validation_execution_id": opt(&self.validation_execution_id),
            "step_id": opt(&self.step_id),
            "receipt_reference": opt(&self.receipt_reference),
            "evidence_reference": opt(&self.evidence_reference),
            // Echoed from Model B (authoritative there); Model A never recomputes it.
            "model_b_state": opt(&self.model_b_state),
            "authority": "model-b",
        })
    }
}

fn opt(s: &str) -> Value {
    if s.is_empty() {
        Value::Null
    } else {
        json!(s)
    }
}

/// Whether a referenced Model B state is the authority's POSITIVE technical outcome. This READS Model
/// B's own state; it never lets Model A recompute one. It exists so the UI/tests can prove that a
/// FAILED/BLOCKED reference is never treated as positive — navigation status ignores it entirely.
pub fn model_b_reference_is_positive(model_b_state: &str) -> bool {
    model_b_state == "VERIFIED"
}

/// The per-activity input the browser records, all normalised. NAVIGATION ONLY: the sole thing that
/// moves an activity forward is having been visited. No artifact, tone, engine verdict, error or
/// warning count can enter here — those belong to Model B.
#[derive(Clone, Default)]
pub struct StepInput {
    /// The operator opened this activity. This is the ONLY thing that advances the guidance path.
    pub visited: bool,
    /// An opaque, typed pointer to the Model B execution/step for this activity (ids + echoed state).
    pub reference: ModelBReference,
}

fn norm_bool(v: Option<&Value>) -> bool {
    v.and_then(|x| x.as_bool()).unwrap_or(false)
}

/// A SAFE id/reference token: `[A-Za-z0-9._:-]`, capped. A reference is a pointer, so it may never
/// carry a path segment (`/`), whitespace, or free text that could break a context line or inject.
fn safe_ref(v: Option<&Value>) -> String {
    let raw = v.and_then(|x| x.as_str()).unwrap_or("");
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | ':'))
        .take(96)
        .collect()
}

/// Normalise a referenced Model B state to the canonical six (ADR-042 §D-076-04) or empty. An
/// unrecognised value is dropped — Model A never invents a Model B state.
fn norm_model_b_state(v: Option<&Value>) -> String {
    match v.and_then(|x| x.as_str()) {
        Some(s) if MODEL_B_STATES.contains(&s) => s.to_string(),
        _ => String::new(),
    }
}

fn read_reference(node: Option<&Value>) -> ModelBReference {
    let r = node.and_then(|n| n.get("technical_reference"));
    let g = |k: &str| r.and_then(|x| x.get(k));
    ModelBReference {
        validation_execution_id: safe_ref(g("validation_execution_id")),
        step_id: safe_ref(g("step_id")),
        receipt_reference: safe_ref(g("receipt_reference")),
        evidence_reference: safe_ref(g("evidence_reference")),
        model_b_state: norm_model_b_state(g("model_b_state")),
    }
}

/// The legacy flat shape (`<step>_status`) predates the navigation model. Its VALUE was a verdict, so
/// under ADR-042 §D-076-02 it is deliberately NOT interpreted as one: its mere PRESENCE is read as
/// "the operator visited this activity" (navigation), and the value itself is discarded.
fn legacy_key(step: &str) -> &'static str {
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

fn read_step_input(state: &Value, step: &str, explicit_current: &str) -> StepInput {
    let node = state.get("steps").and_then(|s| s.get(step));
    // Explicit navigation: a `steps.<step>.visited` flag, or a `<step>_visited` flat flag.
    let mut visited = norm_bool(node.and_then(|n| n.get("visited")));
    let flat_visited = state
        .get(format!("{step}_visited").as_str())
        .and_then(|x| x.as_bool())
        .unwrap_or(false);
    visited = visited || flat_visited;
    // Legacy flat verdict field: presence ⇒ visited (value discarded — never a verdict here).
    if !visited {
        let key = legacy_key(step);
        if !key.is_empty() && state.get(key).and_then(|x| x.as_str()).is_some() {
            visited = true;
        }
    }
    // Being ON an EXPLICIT current activity means it has been opened. An untouched session (no
    // `current_step`) has visited nothing, even though it displays on the guide.
    if !explicit_current.is_empty() && step == explicit_current {
        visited = true;
    }
    StepInput {
        visited,
        reference: read_reference(node),
    }
}

/// Derive an activity's NAVIGATION status. It depends ONLY on whether the activity was visited, whether
/// it is the current one, and whether it is reachable (its predecessor was visited). It reads NOTHING
/// technical — no Model B reference, state, artifact or verdict influences it (ADR-042 §D-076-02).
pub fn derive_status(visited: bool, is_current: bool, reachable: bool) -> &'static str {
    if visited {
        if is_current {
            "in_progress"
        } else {
            "completed"
        }
    } else if reachable {
        "available"
    } else {
        "not_started"
    }
}

/// The next orientation activity to open: the first not-yet-visited step, as an `abrir_<step>` slug.
/// When every activity has been visited the path is complete.
fn next_action(visited: &[(&str, bool)]) -> &'static str {
    for (step, v) in visited {
        if !v {
            return open_action(step);
        }
    }
    "percurso_concluido"
}

fn open_action(step: &str) -> &'static str {
    match step {
        "guia" => "abrir_guia",
        "manifest" => "abrir_manifest",
        "conformidade" => "abrir_conformidade",
        "trust" => "abrir_trust",
        "federacao" => "abrir_federacao",
        "evidence_bundle" => "abrir_evidence_bundle",
        "traces" => "abrir_traces",
        _ => "abrir_guia",
    }
}

/// The step an action points at. The UI routes by STEP, never by parsing the action slug.
pub fn next_action_step(action: &str) -> &'static str {
    match action {
        "abrir_guia" => "guia",
        "abrir_manifest" => "manifest",
        "abrir_conformidade" => "conformidade",
        "abrir_trust" => "trust",
        "abrir_federacao" => "federacao",
        "abrir_evidence_bundle" => "evidence_bundle",
        "abrir_traces" | "percurso_concluido" => "traces",
        _ => "guia",
    }
}

/// The overall NAVIGATION headline. Three states, all navigation: nothing here is a technical outcome.
fn overall_state(visited: &[(&str, bool)]) -> &'static str {
    let any = visited.iter().any(|(_, v)| *v);
    let all = visited.iter().all(|(_, v)| *v);
    if all {
        "percurso_concluido"
    } else if any {
        "percurso_em_curso"
    } else {
        "percurso_por_iniciar"
    }
}

/// Evaluate the whole guidance session: per-activity NAVIGATION status, navigation progress (activities
/// visited — explicitly NOT a score), the next orientation activity, and any typed Model B references.
/// This is the single source of truth the guidance surface renders and `/ask` re-derives. It contains
/// no verdict and no score by construction.
pub fn evaluate_session(state: &Value) -> Value {
    let current = crate::current_step_pub(state); // display default (guia)
    let explicit_current = crate::explicit_current_pub(state); // only this counts as visited
    let inputs: Vec<(&str, StepInput)> = STEPS
        .iter()
        .map(|s| (*s, read_step_input(state, s, &explicit_current)))
        .collect();

    let visited: Vec<(&str, bool)> = inputs.iter().map(|(s, i)| (*s, i.visited)).collect();

    let mut step_views: Vec<Value> = Vec::new();
    for (idx, (step, i)) in inputs.iter().enumerate() {
        let is_current = *step == current;
        let reachable = idx == 0 || inputs[idx - 1].1.visited;
        let status = derive_status(i.visited, is_current, reachable);
        step_views.push(json!({
            "step": step,
            "label": crate::step_label_pub(step),
            "status": status,
            "status_label": status_label(status),
            // The ONLY technical information here: an opaque typed pointer to Model B, or null.
            "technical_reference": if i.reference.has_any() { i.reference.to_json() } else { Value::Null },
        }));
    }

    let activities_visited = visited.iter().filter(|(_, v)| *v).count() as i64;
    let activities_total = STEPS.len() as i64;
    let action = next_action(&visited);
    let overall = overall_state(&visited);

    json!({
        // ADR-042 §D-076-02 markers: this is the guidance layer, and Model B is the state authority.
        "model": "operator-guidance",
        "authority": "model-b",
        "authority_note": "Modelo A orienta o percurso; Modelo B avalia — existe uma única autoridade de estado técnico",
        "overall_state": overall,
        "navigation": {
            "activities_visited": activities_visited,
            "activities_total": activities_total,
            "current_step": current,
        },
        // Navigation progress — activities visited. Explicitly NOT a conformance/readiness/quality score.
        "navigation_progress": {
            "activities_visited": activities_visited,
            "activities_total": activities_total,
            "kind": "navigation_only",
            "is_technical_score": false,
        },
        "steps": step_views,
        "next_recommended_action": action,
        "next_action_step": next_action_step(action),
        "journey_complete": action == "percurso_concluido",
        "can_continue": true,
        "session_scope": "browser_memory_only",
    })
}

/// The one-sentence answer to "o que faço agora?", composed from the SAME next action the guidance
/// panel renders. Deliberately NON-technical: it names the next orientation activity and defers every
/// technical claim to Model B. It never mentions points, evidence, certification, approval or a verdict.
pub fn next_action_sentence(state: &Value) -> String {
    let e = evaluate_session(state);
    let action = e["next_recommended_action"].as_str().unwrap_or("");
    let step = e["next_action_step"].as_str().unwrap_or("guia");
    let label = crate::step_label_pub(step);

    if action == "percurso_concluido" {
        return "Percorreste todas as atividades de orientação. Isto é orientação de percurso: o \
                estado técnico é avaliado pelo Modelo B — a única autoridade de estado técnico — e \
                não aqui."
            .to_string();
    }

    format!(
        "Segue para {label}: abre a próxima atividade de orientação. Isto orienta o percurso; a \
         avaliação técnica pertence ao Modelo B (a única autoridade de estado técnico), não a esta \
         camada de orientação."
    )
}

/// The canonical vocabulary of every slug this guidance engine can emit. Rust owns these words
/// (ADR-043), so Rust publishes them and the vocabulary contract guard proves the UI matches. There
/// are no `blocker_reasons`/`evidence_items` here: the guidance layer has no verdict to block on and
/// no evidence to produce (ADR-042 §D-076-02).
pub fn vocabulary() -> Value {
    json!({
        "steps": crate::STEPS,
        "statuses": STATUSES,
        "model_b_states": MODEL_B_STATES,
        "actions": [
            "abrir_guia",
            "abrir_manifest",
            "abrir_conformidade",
            "abrir_trust",
            "abrir_federacao",
            "abrir_evidence_bundle",
            "abrir_traces",
            "percurso_concluido",
        ],
        "overall_states": [
            "percurso_por_iniciar",
            "percurso_em_curso",
            "percurso_concluido",
        ],
        "reference_fields": [
            "validation_execution_id",
            "step_id",
            "receipt_reference",
            "evidence_reference",
            "model_b_state",
        ],
    })
}

/// A SAFE one-line summary for the local model: slugs and counts only, NAVIGATION vocabulary only. It
/// can never carry a file body, a path, a key, free text or a score.
pub fn safe_session_summary(state: &Value) -> String {
    let e = evaluate_session(state);
    let nav = &e["navigation_progress"];
    format!(
        "modelo=orientacao estado={} atividades_visitadas={}/{} proxima={} autoridade_tecnica=modelo_b",
        e["overall_state"].as_str().unwrap_or(""),
        nav["activities_visited"].as_i64().unwrap_or(0),
        nav["activities_total"].as_i64().unwrap_or(0),
        e["next_recommended_action"].as_str().unwrap_or(""),
    )
}

// ── Compatibility view for `/ask` ────────────────────────────────────────────
//
// `crate::evaluate()` is the shape `services/banzai-api/src/journey.js` consumes. It DERIVES from the
// navigation model above (never recomputes anything) so the two can never disagree. It carries only
// navigation state and typed Model B references — no verdict, no score.

/// The legacy `evaluate()` payload, derived entirely from `evaluate_session`, in navigation vocabulary.
pub fn legacy_evaluation(state: &Value) -> Value {
    let e = evaluate_session(state);
    let empty = vec![];
    let steps = e["steps"].as_array().unwrap_or(&empty);

    let mut views = Vec::new();
    let mut visited_steps = Vec::new();
    for s in steps {
        let step = s["step"].as_str().unwrap_or("");
        let status = s["status"].as_str().unwrap_or("not_started");
        if status == "completed" || status == "in_progress" {
            visited_steps.push(Value::from(step));
        }
        views.push(json!({
            "step": step,
            "label": s["label"].clone(),
            "status": status,
            "technical_reference": s["technical_reference"].clone(),
        }));
    }

    json!({
        "current_step": e["navigation"]["current_step"].clone(),
        "steps": views,
        "visited_steps": visited_steps,
        "navigation_progress": e["navigation_progress"].clone(),
        "next_recommended_action": e["next_recommended_action"].clone(),
        // Navigation has no verdict warnings; kept as an (empty) array for shape stability.
        "warnings": Value::Array(vec![]),
        "last_error": "",
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st(steps: Value) -> Value {
        json!({ "steps": steps })
    }
    fn ev(v: &Value) -> Value {
        evaluate_session(v)
    }
    fn status_of(e: &Value, step: &str) -> String {
        e["steps"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["step"] == step)
            .unwrap()["status"]
            .as_str()
            .unwrap()
            .to_string()
    }
    fn visited(e: &Value) -> i64 {
        e["navigation_progress"]["activities_visited"]
            .as_i64()
            .unwrap()
    }

    #[test]
    fn the_status_vocabulary_is_navigation_only() {
        // The retired verdict words are gone, and so is every score-like status.
        for banned in ["valid", "evidence_ready", "invalid", "warning"] {
            assert!(
                !STATUSES.contains(&banned),
                "navigation must not carry the verdict status {banned}"
            );
        }
        assert_eq!(
            STATUSES,
            &["not_started", "available", "in_progress", "completed"]
        );
    }

    #[test]
    fn an_empty_session_starts_at_zero_and_makes_no_technical_claim() {
        let e = ev(&st(json!({})));
        assert_eq!(visited(&e), 0);
        assert_eq!(e["navigation_progress"]["is_technical_score"], false);
        assert_eq!(e["authority"], "model-b");
        // No score/points key exists anywhere in the output.
        let blob = e.to_string();
        assert!(
            !blob.contains("\"points\""),
            "no score may be emitted: {blob}"
        );
        assert!(!blob.contains("evidence_ready"));
    }

    #[test]
    fn a_visited_activity_completes_as_navigation_never_as_a_verdict() {
        // Guia visited but not current → completed (orientation), and it is NOT a technical positive.
        let e =
            ev(&json!({ "current_step": "manifest", "steps": { "guia": { "visited": true } } }));
        assert_eq!(status_of(&e, "guia"), "completed");
        assert_eq!(status_label("completed"), "concluído (orientação)");
        assert_eq!(visited(&e), 2, "guia + current manifest are visited");
    }

    #[test]
    fn the_current_activity_is_in_progress() {
        let e = ev(&json!({ "current_step": "guia" }));
        assert_eq!(status_of(&e, "guia"), "in_progress");
    }

    #[test]
    fn an_unvisited_reachable_activity_is_available_and_the_rest_not_started() {
        let e = ev(&json!({ "current_step": "guia" }));
        // guia visited (current) → manifest reachable → available; conformidade not_started.
        assert_eq!(status_of(&e, "manifest"), "available");
        assert_eq!(status_of(&e, "conformidade"), "not_started");
    }

    #[test]
    fn navigation_progress_counts_visited_activities_not_a_score() {
        let e = ev(&json!({
            "current_step": "trust",
            "steps": { "guia": { "visited": true }, "manifest": { "visited": true } }
        }));
        // guia, manifest, and the current trust → 3 visited.
        assert_eq!(visited(&e), 3);
        assert_eq!(e["navigation_progress"]["kind"], "navigation_only");
    }

    #[test]
    fn a_model_b_reference_is_surfaced_as_a_typed_pointer_only() {
        let e = ev(&json!({
            "current_step": "manifest",
            "steps": { "manifest": { "visited": true, "technical_reference": {
                "validation_execution_id": "exec-123",
                "step_id": "manifest",
                "receipt_reference": "receipt:abc",
                "evidence_reference": "evidence:def",
                "model_b_state": "VERIFIED"
            }}}
        }));
        let m = e["steps"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["step"] == "manifest")
            .unwrap()
            .clone();
        let r = &m["technical_reference"];
        assert_eq!(r["validation_execution_id"], "exec-123");
        assert_eq!(r["receipt_reference"], "receipt:abc");
        assert_eq!(r["model_b_state"], "VERIFIED");
        assert_eq!(r["authority"], "model-b");
        // The reference does not change the navigation status — that is visited-driven only.
        assert_eq!(m["status"], "in_progress");
    }

    #[test]
    fn a_model_b_negative_never_becomes_a_model_a_positive() {
        for negative in ["FAILED", "BLOCKED"] {
            // An UNVISITED activity carrying a FAILED/BLOCKED Model B reference is still just
            // "available"/"not_started" — never a positive navigation state.
            let e = ev(&json!({
                "current_step": "guia",
                "steps": { "manifest": { "visited": false, "technical_reference": {
                    "validation_execution_id": "exec-x", "model_b_state": negative
                }}}
            }));
            let status = status_of(&e, "manifest");
            assert!(
                status == "available" || status == "not_started",
                "a {negative} reference must not lift an unvisited activity: got {status}"
            );
            // And the helper reading Model B's own state never calls a negative positive.
            assert!(!model_b_reference_is_positive(negative));
            // Model A has NO positive-technical status: `completed` is orientation, verified in its label.
            assert!(status_label("completed").contains("orientação"));
        }
    }

    #[test]
    fn a_full_walk_completes_the_path() {
        let mut steps = serde_json::Map::new();
        for s in STEPS.iter() {
            steps.insert((*s).into(), json!({ "visited": true }));
        }
        let e =
            evaluate_session(&json!({ "current_step": "traces", "steps": Value::Object(steps) }));
        assert_eq!(visited(&e), STEPS.len() as i64);
        assert_eq!(e["overall_state"], "percurso_concluido");
        assert_eq!(e["journey_complete"], true);
        assert_eq!(e["next_recommended_action"], "percurso_concluido");
    }

    #[test]
    fn the_next_action_names_the_first_unvisited_activity() {
        assert_eq!(
            ev(&json!({}))["next_recommended_action"],
            "abrir_guia",
            "an untouched path starts at the guide"
        );
        assert_eq!(
            ev(&json!({ "current_step": "guia" }))["next_recommended_action"],
            "abrir_manifest",
            "with the guide open, the next activity is the manifest"
        );
    }

    #[test]
    fn the_safe_summary_carries_only_slugs_and_counts_and_no_score() {
        let s = safe_session_summary(&json!({
            "current_step": "manifest",
            "steps": { "manifest": { "visited": true, "technical_reference": {
                "receipt_reference": "/etc/secret/key.pem", "model_b_state": "FAILED"
            }}}
        }));
        assert!(s.contains("atividades_visitadas="));
        assert!(s.contains("autoridade_tecnica=modelo_b"));
        assert!(!s.contains("etc"), "no path segments may leak: {s}");
        assert!(!s.contains(".pem"), "no key filenames may leak: {s}");
        assert!(
            !s.to_lowercase().contains("points"),
            "no score may leak: {s}"
        );
    }

    #[test]
    fn a_reference_is_reduced_to_a_safe_pointer() {
        let e = ev(&json!({
            "current_step": "manifest",
            "steps": { "manifest": { "visited": true, "technical_reference": {
                "receipt_reference": "../../etc/passwd", "model_b_state": "not-a-state"
            }}}
        }));
        let r = e["steps"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["step"] == "manifest")
            .unwrap()["technical_reference"]
            .clone();
        let rr = r["receipt_reference"].as_str().unwrap_or("");
        assert!(!rr.contains('/'), "path traversal must not survive: {rr}");
        // An unrecognised Model B state is dropped, never invented.
        assert_eq!(r["model_b_state"], Value::Null);
    }

    #[test]
    fn no_status_or_label_may_ever_claim_a_technical_conclusion() {
        for s in STATUSES {
            for banned in [
                "valid", "evidence", "certif", "aprov", "licen", "score", "point",
            ] {
                assert!(
                    !s.contains(banned),
                    "status {s} implies a technical conclusion"
                );
            }
        }
    }
}

#[cfg(test)]
mod next_action_sentence_tests {
    use super::*;

    #[test]
    fn the_sentence_defers_technical_state_to_model_b() {
        let s = next_action_sentence(&json!({ "current_step": "guia" }));
        assert!(s.contains("Modelo B") || s.contains("Modelo b"));
        // It names the next orientation step and claims nothing technical.
        for banned in [
            "certificad",
            "aprovad",
            "licenciad",
            "pontos",
            "evidência técnica",
            "válido",
        ] {
            assert!(
                !s.to_lowercase().contains(&banned.to_lowercase()),
                "sentence claims technical status: {s}"
            );
        }
    }

    #[test]
    fn the_completed_path_reports_orientation_completion_not_a_verdict() {
        let mut steps = serde_json::Map::new();
        for step in STEPS.iter() {
            steps.insert((*step).into(), json!({ "visited": true }));
        }
        let s = next_action_sentence(
            &json!({ "current_step": "traces", "steps": Value::Object(steps) }),
        );
        assert!(s.contains("orientação"));
        assert!(!s.contains("100"), "there is no score to report: {s}");
    }

    #[test]
    fn the_sentence_always_names_the_step_the_button_routes_to() {
        let mut steps = serde_json::Map::new();
        let mut state = json!({ "current_step": "guia", "steps": Value::Object(steps.clone()) });
        for _ in 0..STEPS.len() {
            let e = evaluate_session(&state);
            let target = e["next_action_step"].as_str().unwrap().to_string();
            let sentence = next_action_sentence(&state);
            let label = crate::step_label_pub(&target);
            assert!(
                sentence.contains(label) || sentence.contains("orientação"),
                "sentence must name the button's step '{label}': {sentence}"
            );
            // Advance one step and re-check.
            steps.insert(target.clone(), json!({ "visited": true }));
            state = json!({ "current_step": target, "steps": Value::Object(steps.clone()) });
        }
    }
}

#[cfg(test)]
mod vocabulary_tests {
    use super::*;

    fn vocab_list(key: &str) -> Vec<String> {
        vocabulary()[key]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect()
    }

    #[test]
    fn every_status_the_engine_emits_is_published_and_has_a_label() {
        for s in vocab_list("statuses") {
            assert!(!status_label(&s).is_empty(), "status {s} has no label");
        }
        assert_eq!(vocab_list("statuses").len(), STATUSES.len());
    }

    #[test]
    fn every_action_next_action_can_return_is_published_and_routes_somewhere() {
        let published = vocab_list("actions");
        for a in [
            "abrir_guia",
            "abrir_manifest",
            "abrir_conformidade",
            "abrir_trust",
            "abrir_federacao",
            "abrir_evidence_bundle",
            "abrir_traces",
            "percurso_concluido",
        ] {
            assert!(
                published.contains(&a.to_string()),
                "action {a} not published"
            );
            assert!(
                STEPS.contains(&next_action_step(a)),
                "action {a} routes nowhere"
            );
        }
    }

    #[test]
    fn no_verdict_or_score_vocabulary_is_published() {
        let blob = vocabulary().to_string();
        for banned in [
            "evidence_ready",
            "\"valid\"",
            "points",
            "blocker_reasons",
            "evidence_items",
        ] {
            assert!(
                !blob.contains(banned),
                "vocabulary must not publish {banned}: {blob}"
            );
        }
    }

    #[test]
    fn the_typed_reference_fields_are_the_four_model_b_pointers_plus_the_echoed_state() {
        let fields = vocab_list("reference_fields");
        for f in [
            "validation_execution_id",
            "step_id",
            "receipt_reference",
            "evidence_reference",
        ] {
            assert!(
                fields.contains(&f.to_string()),
                "reference field {f} missing"
            );
        }
    }
}

#[cfg(test)]
mod legacy_tests {
    use super::*;

    #[test]
    fn the_compat_view_is_navigation_only() {
        let e = legacy_evaluation(&json!({ "current_step": "manifest", "steps": {
            "guia": { "visited": true }, "manifest": { "visited": true } } }));
        // Every step status is a navigation status; the visited list carries guia + manifest.
        for s in e["steps"].as_array().unwrap() {
            let status = s["status"].as_str().unwrap();
            assert!(
                STATUSES.contains(&status),
                "compat view emitted non-navigation status {status}"
            );
        }
        let visited: Vec<&str> = e["visited_steps"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert!(visited.contains(&"guia") && visited.contains(&"manifest"));
        assert_eq!(e["next_recommended_action"], "abrir_conformidade");
    }

    #[test]
    fn the_flat_legacy_shape_is_read_as_navigation_not_as_a_verdict() {
        // A flat `<step>_status` field: its PRESENCE marks the activity visited; its VALUE is discarded.
        let e = legacy_evaluation(&json!({
            "current_step": "conformidade",
            "manifest_status": "valid",
        }));
        let m = e["steps"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["step"] == "manifest")
            .unwrap()
            .clone();
        assert_eq!(m["status"], "completed", "presence ⇒ visited (navigation)");
        // …and no verdict word leaks into the compat output.
        assert!(!e.to_string().contains("evidence_ready"));
    }

    #[test]
    fn an_untouched_compat_view_reports_no_progress() {
        let e = legacy_evaluation(&json!({}));
        assert_eq!(e["navigation_progress"]["activities_visited"], 0);
        assert!(e["visited_steps"].as_array().unwrap().is_empty());
    }
}
