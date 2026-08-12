//! BX2.0 — security & risk assurance: status computed in Rust over the risk register, threat model,
//! controls matrix, L0–L4 reports, Evidence Bundle, trust/BRL and the regulatory-boundary confirmation.
//! Local (no network); boundary flags; no fixture is a real external audit / certification / production /
//! licence / real operator. Fixtures drive the statuses.

use banza_security_assurance::{demo_fixtures, validate_assurance};
use serde_json::{json, Value};

fn fixture_input(key: &str) -> Value {
    demo_fixtures()["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["key"] == key)
        .unwrap_or_else(|| panic!("fixture {key} not found"))["input"]
        .clone()
}
fn status(key: &str) -> String {
    validate_assurance(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_package_is_ready_for_internal_review() {
    let r = validate_assurance(&fixture_input("assurance_ready_internal_review"));
    assert_eq!(r["status"], "ASSURANCE_READY_FOR_INTERNAL_REVIEW");
    assert_eq!(r["assurance_level"], "READY_FOR_INTERNAL_REVIEW");
    assert!(r["critical_risks"].as_array().unwrap().is_empty());
    assert!(r["high_risks"].as_array().unwrap().is_empty());
    assert!(r["missing_evidence"].as_array().unwrap().is_empty());
    assert_eq!(r["readiness_summary"]["all_levels_ready"], true);
    for f in [
        "not_production",
        "not_a_certificate",
        "not_an_approval",
        "not_a_licence",
        "not_a_psp",
        "does_not_move_funds",
        "does_not_create_operator",
        "does_not_make_banza_a_payment_service_provider",
        "requires_external_audit_before_production_claims",
        "requires_operator_regulatory_authorisation_if_used_for_real_services",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    // regulatory boundary confirmed: open protocol, not a PSP
    assert_eq!(r["regulatory_boundary_summary"]["banza_is_psp"], false);
    assert_eq!(
        r["regulatory_boundary_summary"]["banza_is_open_protocol"],
        true
    );
}

#[test]
fn open_critical_risk_blocks() {
    let r = validate_assurance(&fixture_input("critical_risk_open"));
    assert_eq!(r["status"], "ASSURANCE_BLOCKED_BY_CRITICAL_RISK");
    assert_eq!(r["critical_risks"][0], "R-LEDGER-CRIT-001");
}

#[test]
fn high_risk_without_mitigation_blocks() {
    let r = validate_assurance(&fixture_input("high_risk_missing_mitigation"));
    assert_eq!(r["status"], "ASSURANCE_BLOCKED_BY_HIGH_RISK");
    assert_eq!(r["high_risks"][0], "R-REPLAY-HIGH-001");
}

#[test]
fn missing_evidence_bundle_blocks() {
    assert_eq!(
        status("missing_evidence_bundle"),
        "ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE"
    );
}

#[test]
fn regulatory_boundary_fail_is_invalid() {
    // a package that claims BANZA is a PSP / needs a licence / is production-ready is invalid.
    assert_eq!(status("regulatory_boundary_fail"), "ASSURANCE_INVALID");
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("no"), json!(3), json!(["z"]), Value::Null] {
        let r = validate_assurance(&bad);
        assert_eq!(
            r["status"], "ASSURANCE_INVALID",
            "malformed input must fail closed"
        );
        assert_eq!(r["not_production"], true);
        assert_eq!(r["not_a_licence"], true);
        assert_eq!(r["does_not_make_banza_a_payment_service_provider"], true);
        assert_eq!(r["requires_external_audit_before_production_claims"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn critical_precedes_high_and_missing_evidence() {
    // regulatory fail beats everything
    let mut input = fixture_input("critical_risk_open");
    input["regulatory_boundary"]["banza_is_psp"] = json!(true);
    assert_eq!(validate_assurance(&input)["status"], "ASSURANCE_INVALID");
    // a critical risk beats a missing evidence bundle
    let mut input2 = fixture_input("critical_risk_open");
    input2.as_object_mut().unwrap().remove("evidence_bundle");
    assert_eq!(
        validate_assurance(&input2)["status"],
        "ASSURANCE_BLOCKED_BY_CRITICAL_RISK"
    );
}

#[test]
fn missing_threat_model_is_incomplete() {
    let mut input = fixture_input("assurance_ready_internal_review");
    input.as_object_mut().unwrap().remove("threat_model");
    assert_eq!(validate_assurance(&input)["status"], "ASSURANCE_INCOMPLETE");
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_assurance(&fixture_input("assurance_ready_internal_review"));
    let b = validate_assurance(&fixture_input("assurance_ready_internal_review"));
    assert_eq!(a["assurance_report_hash"], b["assurance_report_hash"]);
    assert_eq!(a["assurance_report_hash"].as_str().unwrap().len(), 64);
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_assurance(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["not_production"], true);
    }
}

#[test]
fn every_fixture_matches_its_expected_status() {
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let key = f["key"].as_str().unwrap();
        let expected = f["expected"].as_str().unwrap();
        assert_eq!(status(key), expected, "fixture {key}");
    }
}
