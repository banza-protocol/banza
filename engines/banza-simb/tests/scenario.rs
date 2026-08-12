//! BX1.3 — SimB demo scenarios: the Rust-computed technical PASS/FAIL over the injected-fault demos.
//! valid → PASS; each fault scenario → FAIL on exactly its one invariant; every output llm_calls=0.

use banza_simb::scenario::{demo_scenarios, run_scenario, SCENARIOS};
use serde_json::Value;

fn status(key: &str) -> String {
    run_scenario(key)["status"].as_str().unwrap().to_string()
}

fn failing_invariants(key: &str) -> Vec<String> {
    run_scenario(key)["invariant_checks"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|c| c["status"] == "FAIL")
        .map(|c| c["id"].as_str().unwrap().to_string())
        .collect()
}

#[test]
fn scenario_keys_are_stable() {
    let keys: Vec<&str> = SCENARIOS.iter().map(|(k, _, _)| *k).collect();
    assert_eq!(
        keys,
        [
            "valid_l0",
            "invalid_ledger",
            "idempotency_fail",
            "settlement_fail"
        ]
    );
    let ds = demo_scenarios();
    assert_eq!(ds["scenarios"].as_array().unwrap().len(), 4);
    assert!(ds["marker"].as_str().unwrap().contains("TEST ONLY"));
}

#[test]
fn valid_scenario_passes_all() {
    let r = run_scenario("valid_l0");
    assert_eq!(r["status"], "PASS");
    assert!(r["injected_fault"].is_null());
    for c in r["invariant_checks"].as_array().unwrap() {
        assert_eq!(c["status"], "PASS", "{} should pass", c["id"]);
    }
    // artifacts present
    assert!(!r["ledger_entries"].as_array().unwrap().is_empty());
    assert_eq!(r["settlement_summary"]["identity_ok"], true);
}

#[test]
fn invalid_ledger_fails_only_ledger() {
    assert_eq!(status("invalid_ledger"), "FAIL");
    assert_eq!(failing_invariants("invalid_ledger"), ["INV-LEDGER-001"]);
    assert!(run_scenario("invalid_ledger")["injected_fault"]
        .as_str()
        .unwrap()
        .contains("double-entry"));
}

#[test]
fn idempotency_fail_fails_only_idem() {
    assert_eq!(status("idempotency_fail"), "FAIL");
    assert_eq!(failing_invariants("idempotency_fail"), ["INV-IDEM-001"]);
}

#[test]
fn settlement_fail_fails_only_settle() {
    assert_eq!(status("settlement_fail"), "FAIL");
    assert_eq!(failing_invariants("settlement_fail"), ["INV-SETTLE-001"]);
}

#[test]
fn every_output_is_test_only_and_zero_llm() {
    for (key, _, _) in SCENARIOS {
        let r = run_scenario(key);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["test_only"], true);
        assert!(r["marker"].as_str().unwrap().contains("NOT PRODUCTION"));
    }
}

#[test]
fn federation_and_manifest_are_safe() {
    let f: Value = banza_simb::scenario::federation_demo();
    assert_eq!(f["status"], "PASS");
    assert_eq!(f["net_position_minor"], 5000);
    assert_eq!(f["llm_calls"], 0);
    let m: Value = banza_simb::scenario::operator_manifest("SIM-X");
    assert_eq!(m["production_allowed"], false);
    assert_eq!(m["test_only"], true);
}

#[test]
fn unknown_scenario_is_flagged() {
    let r = run_scenario("does_not_exist");
    assert!(r["injected_fault"]
        .as_str()
        .unwrap()
        .contains("desconhecido"));
}

// ── BX1.4 — SimB Pre-Review Gate ──────────────────────────────────────────────

#[test]
fn every_run_carries_the_pre_review_gate() {
    for (key, _, _) in SCENARIOS {
        let r = run_scenario(key);
        assert_eq!(r["pre_review_gate"], true, "{key}");
        assert_eq!(r["not_a_certificate"], true, "{key}");
        assert_eq!(r["required_before_banza_ca_review"], true, "{key}");
        assert!(
            r["disclaimer"]
                .as_str()
                .unwrap()
                .contains("não é certificação")
                || r["disclaimer"]
                    .as_str()
                    .unwrap()
                    .contains("Não é certificação")
        );
    }
}

#[test]
fn pre_review_status_maps_pass_and_fail() {
    assert_eq!(
        run_scenario("valid_l0")["pre_review_status"],
        "SIMB_PRE_REVIEW_PASS"
    );
    assert_eq!(
        run_scenario("invalid_ledger")["pre_review_status"],
        "SIMB_PRE_REVIEW_FAIL"
    );
    assert_eq!(
        run_scenario("settlement_fail")["pre_review_status"],
        "SIMB_PRE_REVIEW_FAIL"
    );
    // an unknown scenario has no real evidence → INCOMPLETE
    assert_eq!(
        run_scenario("does_not_exist")["pre_review_status"],
        "SIMB_PRE_REVIEW_INCOMPLETE"
    );
}
