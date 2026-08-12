//! BX1.3 — the L0 demo runner against banza-simb. valid scenario → L0 PASS; each fault → L0 FAIL on
//! exactly its invariant; a run with no invariants fails closed; the report round-trips validate_report;
//! L1–L4 are non-runnable; every output is test-only with llm_calls=0.

use banza_conformance::tool::{
    demo_fixtures, levels_info, run_l0_demo, tool_version, validate_report_tool,
};
use serde_json::json;

fn l0(scenario: &str) -> serde_json::Value {
    run_l0_demo(&json!({ "scenario": scenario }))
}

#[test]
fn valid_scenario_is_l0_pass() {
    let r = l0("valid_l0");
    assert_eq!(r["level"], "L0");
    assert_eq!(r["status"], "PASS");
    assert_eq!(r["totals"]["fail"], 0);
    assert!(r["failures"].as_array().unwrap().is_empty());
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["test_only"], true);
}

#[test]
fn faults_are_l0_fail_on_their_invariant() {
    let cases = [
        ("invalid_ledger", "INV-LEDGER-001"),
        ("idempotency_fail", "INV-IDEM-001"),
        ("settlement_fail", "INV-SETTLE-001"),
    ];
    for (scenario, inv) in cases {
        let r = l0(scenario);
        assert_eq!(r["status"], "FAIL", "{scenario} should FAIL");
        let failing: Vec<String> = r["cases"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|c| c["status"] == "FAIL")
            .map(|c| c["invariant_id"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(failing, [inv], "{scenario} should fail only {inv}");
    }
}

#[test]
fn passed_run_object_is_accepted() {
    // The SimB tab passes its run object directly ("usar cenário SimB actual").
    let run = banza_simb::scenario::run_scenario("valid_l0");
    let r = run_l0_demo(&json!({ "run": run }));
    assert_eq!(r["status"], "PASS");
}

#[test]
fn empty_run_fails_closed() {
    let r = run_l0_demo(&json!({ "run": { "scenario_id": "x", "invariant_checks": [] } }));
    assert_eq!(r["status"], "FAIL");
    assert!(r["failures"][0].as_str().unwrap().contains("fail-closed"));
}

#[test]
fn l0_report_roundtrips_validate_report() {
    let r = l0("valid_l0");
    let v = validate_report_tool(&r.to_string());
    assert_eq!(
        v["ok"], true,
        "generated L0 report must satisfy validate_report"
    );
    // carries the certification disclaimer (not production certification)
    assert!(r["certification_disclaimer"]
        .as_str()
        .unwrap()
        .contains("not production certification"));
}

#[test]
fn levels_l1_l4_are_not_runnable() {
    let li = levels_info();
    let levels = li["levels"].as_array().unwrap();
    assert_eq!(levels[0]["level"], "L0");
    assert_eq!(levels[0]["runnable"], true);
    for lvl in &levels[1..] {
        assert_eq!(
            lvl["runnable"], false,
            "{} must not be runnable",
            lvl["level"]
        );
    }
}

// ── BX1.4 — SimB Pre-Review Gate ──────────────────────────────────────────────

#[test]
fn l0_report_references_simb_pre_review_status() {
    let pass = l0("valid_l0");
    assert_eq!(pass["pre_review_gate"], true);
    assert_eq!(pass["simb_pre_review_status"], "SIMB_PRE_REVIEW_PASS");
    let fail = l0("invalid_ledger");
    assert_eq!(fail["simb_pre_review_status"], "SIMB_PRE_REVIEW_FAIL");
    assert!(pass["ready_disclaimer"]
        .as_str()
        .unwrap()
        .contains("not an approval"));
}

#[test]
fn readiness_only_when_simb_pass_and_l0_pass() {
    // valid: SimB PASS + L0 PASS → ready
    assert_eq!(
        l0("valid_l0")["ready_for_conformance_evidence_review"],
        true
    );
    // fault: SimB FAIL + L0 FAIL → not ready
    for s in ["invalid_ledger", "idempotency_fail", "settlement_fail"] {
        let r = l0(s);
        assert_eq!(
            r["ready_for_conformance_evidence_review"], false,
            "{s} must not be ready"
        );
    }
    // fail-closed empty run → not ready
    let empty = run_l0_demo(&json!({ "run": { "scenario_id": "x", "invariant_checks": [] } }));
    assert_eq!(empty["ready_for_conformance_evidence_review"], false);
    assert_eq!(
        empty["simb_pre_review_status"],
        "SIMB_PRE_REVIEW_INCOMPLETE"
    );
}

#[test]
fn fixtures_and_version() {
    let f = demo_fixtures();
    assert_eq!(f["fixtures"].as_array().unwrap().len(), 4);
    assert_eq!(f["fixtures"][0]["expected"], "PASS");
    assert_eq!(tool_version()["tool"], "banza-conformance-rs");
}
