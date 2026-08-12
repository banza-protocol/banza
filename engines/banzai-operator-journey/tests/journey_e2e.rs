//! END-TO-END operator-guidance path, through the real engine (ADR-076 §D-076-01/02).
//!
//! This is the engine half of the end-to-end test. It walks the SAME seven orientation activities a
//! person walks in the browser — land on Guia, move activity by activity, attach a typed reference to a
//! Model B execution, reach the end — and asserts what that person SEES: the navigation status of each
//! activity, the navigation progress (activities visited — NOT a score), and that a Model B FAILED
//! reference never renders as a positive here.
//!
//! The payloads below are the ones `website/lib/banzaOperatorJourney.ts::buildNavigationState` builds;
//! `website/lib/operatorJourneyE2E.test.ts` pins them, so if the browser's builder ever drifts from
//! what is tested here, that test fails first. Together the two halves cover the whole path.

use banzai_operator_journey::{evaluate, session::evaluate_session};
use serde_json::{json, Value};

const ORDER: [&str; 7] = [
    "guia",
    "manifest",
    "conformidade",
    "trust",
    "federacao",
    "evidence_bundle",
    "traces",
];

/// The operator's in-memory session — the browser's React state, and nothing else.
#[derive(Default)]
struct Session {
    current: String,
    steps: serde_json::Map<String, Value>,
}

impl Session {
    fn new() -> Self {
        Session {
            current: "guia".into(),
            steps: serde_json::Map::new(),
        }
    }

    /// Open (navigate to) an activity. Navigation marks it visited and NOTHING else.
    fn open(&mut self, step: &str) -> &mut Self {
        self.current = step.into();
        let e = self.steps.entry(step).or_insert_with(|| json!({}));
        e["visited"] = json!(true);
        self
    }

    /// Attach a TYPED REFERENCE to a Model B execution/step (ids + the echoed Model B state). This is
    /// a pointer, never a recomputed verdict.
    fn reference(&mut self, step: &str, exec: &str, model_b_state: &str) -> &mut Self {
        self.open(step);
        let e = self.steps.get_mut(step).unwrap();
        e["technical_reference"] = json!({
            "validation_execution_id": exec,
            "step_id": step,
            "receipt_reference": format!("receipt:{exec}"),
            "evidence_reference": format!("evidence:{exec}"),
            "model_b_state": model_b_state,
        });
        self
    }

    fn state(&self) -> Value {
        json!({ "current_step": self.current, "steps": Value::Object(self.steps.clone()) })
    }

    fn evaluate(&self) -> Value {
        evaluate_session(&self.state())
    }
}

/// What the guidance card renders for one activity: (is a navigation-positive tick, status, label).
/// The only navigation-positive state is `completed`; it is orientation, never a technical conclusion.
fn rendered(e: &Value, step: &str) -> (bool, String, String) {
    let s = e["steps"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["step"] == step)
        .unwrap_or_else(|| panic!("step {step} missing from the session view"));
    let status = s["status"].as_str().unwrap().to_string();
    let completed = status == "completed";
    (
        completed,
        status,
        s["status_label"].as_str().unwrap().into(),
    )
}

fn visited(e: &Value) -> i64 {
    e["navigation_progress"]["activities_visited"]
        .as_i64()
        .unwrap()
}

#[test]
fn a_freshly_opened_session_claims_nothing_technical() {
    let e = Session::new().evaluate();

    // Landing on the guide starts the JOURNEY (navigation), and is honest about it.
    assert_eq!(visited(&e), 1, "only the guide has been opened");
    // But there is NO score and NO verdict anywhere in the output.
    let blob = e.to_string();
    assert!(!blob.contains("\"points\""), "no score may be emitted");
    assert!(!blob.contains("evidence_ready") && !blob.contains("technical_evidence"));
    assert_eq!(e["authority"], "model-b");
    for step in ORDER {
        let (_, status, label) = rendered(&e, step);
        assert!(
            ["not_started", "available", "in_progress", "completed"].contains(&status.as_str()),
            "{step} must render a navigation status, got {status}"
        );
        assert!(!label.is_empty(), "{step} must render a human badge");
    }
    assert_eq!(e["next_action_step"], "manifest");
}

#[test]
fn walking_every_activity_completes_the_path_but_proves_nothing_technical() {
    let mut s = Session::new();
    for step in ORDER {
        s.open(step);
    }
    let e = s.evaluate();

    assert_eq!(visited(&e), ORDER.len() as i64);
    assert_eq!(e["overall_state"], "percurso_concluido");
    assert_eq!(e["journey_complete"], true);
    // Completing the orientation path is navigation, not evidence: no score, no verdict.
    assert!(!e.to_string().contains("\"points\""));
    for step in ORDER {
        let (completed, status, _) = rendered(&e, step);
        // Every visited-and-left activity is `completed`; the current one (traces) is `in_progress`.
        if step == "traces" {
            assert_eq!(status, "in_progress");
        } else {
            assert!(completed, "{step} should read completed after being walked");
        }
    }
}

#[test]
fn a_typed_reference_is_surfaced_and_a_model_b_negative_is_never_a_positive() {
    // Attach a FAILED Model B reference to the manifest activity while the operator is on the guide,
    // so the manifest activity is NOT visited.
    let mut s = Session::new();
    s.reference("manifest", "exec-1", "FAILED");
    // reference() calls open(), which set current=manifest; move the operator back to the guide so the
    // manifest is a visited activity carrying a FAILED reference.
    s.open("guia");
    let e = s.evaluate();

    let m = e["steps"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["step"] == "manifest")
        .unwrap()
        .clone();
    // The reference is surfaced verbatim as a typed pointer…
    assert_eq!(
        m["technical_reference"]["validation_execution_id"],
        "exec-1"
    );
    assert_eq!(m["technical_reference"]["model_b_state"], "FAILED");
    assert_eq!(m["technical_reference"]["authority"], "model-b");
    // …and the FAILED reference NEVER lifts the activity into a positive: navigation `completed` here
    // means the operator visited the orientation activity, and its label says so.
    let (_, status, label) = rendered(&e, "manifest");
    assert_eq!(status, "completed");
    assert!(
        label.contains("orientação"),
        "completed is orientation, not a verdict: {label}"
    );
    // There is no positive-technical navigation state at all.
    assert!(!["valid", "evidence_ready", "verified"].contains(&status.as_str()));
}

#[test]
fn the_session_never_claims_anything_outside_browser_memory() {
    let e = Session::new().open("manifest").evaluate();
    assert_eq!(e["session_scope"], "browser_memory_only");
}

#[test]
fn the_two_views_of_the_same_session_can_never_disagree() {
    // The compat view `/ask` consumes is DERIVED from the navigation model, so an activity cannot read
    // one status in the card and another to `/ask`.
    let mut s = Session::new();
    s.open("manifest").open("conformidade").open("trust");
    let session = s.evaluate();
    let legacy = evaluate(&s.state());

    for step in ORDER {
        let (_, rich, _) = rendered(&session, step);
        let flat = legacy["steps"]
            .as_array()
            .unwrap()
            .iter()
            .find(|x| x["step"] == step)
            .unwrap()["status"]
            .as_str()
            .unwrap()
            .to_string();
        assert_eq!(
            rich, flat,
            "{step} disagrees between the card and /ask: {rich} vs {flat}"
        );
    }
    assert_eq!(
        legacy["navigation_progress"]["activities_visited"],
        session["navigation_progress"]["activities_visited"]
    );
}

#[test]
fn the_full_walk_covers_every_activity_step_by_step() {
    let mut s = Session::new();
    let mut last = 0;
    for step in ORDER.iter() {
        let e = s.open(step).evaluate();
        // Navigation progress only ever grows as activities are opened.
        assert!(
            visited(&e) >= last,
            "{step} made navigation progress go down"
        );
        last = visited(&e);
    }
    let done = s.evaluate();
    assert_eq!(visited(&done), ORDER.len() as i64);
    assert_eq!(done["overall_state"], "percurso_concluido");
}
