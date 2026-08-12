//! BX2.1–BX2.4 — deep security assurance: status computed in Rust over the four tracks
//! (THREAT_AND_ABUSE, TRUST_AND_CRYPTO_CEREMONY, OPERATIONAL_RISK_AND_INCIDENT_RESPONSE,
//! EXTERNAL_AUDIT_READINESS) plus the regulatory-boundary confirmation. Local (no network); boundary
//! flags; no fixture is a real external audit / completed audit / production / certification / licence /
//! real ceremony / real operator. Fixtures drive the statuses.

use banza_security_assurance::{deep_demo_fixtures, validate_deep_assurance};
use serde_json::{json, Value};

fn fixture_input(key: &str) -> Value {
    deep_demo_fixtures()["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["key"] == key)
        .unwrap_or_else(|| panic!("fixture {key} not found"))["input"]
        .clone()
}
fn status(key: &str) -> String {
    validate_deep_assurance(&fixture_input(key))["deep_assurance_status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_pack_is_ready_for_pre_audit_review() {
    let r = validate_deep_assurance(&fixture_input("deep_assurance_ready_for_pre_audit_review"));
    assert_eq!(
        r["deep_assurance_status"],
        "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW"
    );
    assert_eq!(r["pre_audit_readiness"], "READY_FOR_PRE_AUDIT_REVIEW");
    assert!(r["open_critical_gaps"].as_array().unwrap().is_empty());
    assert!(r["missing_documents"].as_array().unwrap().is_empty());
    for t in [
        "threat_and_abuse",
        "trust_and_crypto_ceremony",
        "operational_risk_and_incident_response",
        "external_audit_readiness",
    ] {
        assert_eq!(r["tracks"][t]["status"], "ok", "track {t} must be ok");
    }
    for f in [
        "not_production",
        "not_a_certificate",
        "not_an_approval",
        "not_a_licence",
        "not_a_psp",
        "does_not_move_funds",
        "does_not_create_operator",
        "does_not_activate_federation",
        "does_not_activate_external_integration",
        "does_not_make_banza_a_payment_service_provider",
        "requires_external_audit_before_production_claims",
        "external_audit_not_performed",
        "production_trust_ceremony_not_executed",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true even when ready");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["regulatory_boundary_summary"]["banza_is_psp"], false);
    assert_eq!(
        r["regulatory_boundary_summary"]["banza_is_open_protocol"],
        true
    );
}

#[test]
fn missing_abuse_cases_is_incomplete() {
    let r = validate_deep_assurance(&fixture_input("missing_abuse_cases"));
    assert_eq!(r["deep_assurance_status"], "DEEP_ASSURANCE_INCOMPLETE");
    assert!(r["missing_documents"]
        .as_array()
        .unwrap()
        .iter()
        .any(|d| d == "abuse_cases_summary"));
}

#[test]
fn critical_threat_gap_blocks() {
    let r = validate_deep_assurance(&fixture_input("critical_threat_gap"));
    assert_eq!(
        r["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP"
    );
    assert_eq!(r["open_critical_gaps"][0], "T-DEEP-CRIT-001");
    assert_eq!(r["tracks"]["threat_and_abuse"]["status"], "gap");
}

#[test]
fn trust_ceremony_gap_blocks() {
    let r = validate_deep_assurance(&fixture_input("trust_ceremony_gap"));
    assert_eq!(
        r["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP"
    );
    assert_eq!(r["tracks"]["trust_and_crypto_ceremony"]["status"], "gap");
}

#[test]
fn incident_response_gap_blocks() {
    let r = validate_deep_assurance(&fixture_input("incident_response_gap"));
    assert_eq!(
        r["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP"
    );
    assert_eq!(
        r["tracks"]["operational_risk_and_incident_response"]["status"],
        "gap"
    );
}

#[test]
fn audit_evidence_gap_blocks() {
    let r = validate_deep_assurance(&fixture_input("audit_evidence_gap"));
    assert_eq!(
        r["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP"
    );
    assert_eq!(r["tracks"]["external_audit_readiness"]["status"], "gap");
}

#[test]
fn regulatory_boundary_fail_is_invalid() {
    // a pack that claims BANZA is a PSP / needs a licence / external audit is complete is invalid.
    assert_eq!(status("regulatory_boundary_fail"), "DEEP_ASSURANCE_INVALID");
}

#[test]
fn regulatory_fail_precedes_every_gap() {
    // regulatory fail beats a critical threat gap
    let mut input = fixture_input("critical_threat_gap");
    input["regulatory_boundary_confirmation"]["banza_is_psp"] = json!(true);
    assert_eq!(
        validate_deep_assurance(&input)["deep_assurance_status"],
        "DEEP_ASSURANCE_INVALID"
    );
}

#[test]
fn critical_threat_precedes_trust_incident_audit() {
    // a critical threat gap beats a simultaneous trust/incident/audit gap
    let mut input = fixture_input("critical_threat_gap");
    input["trust_ceremony_plan_summary"]["key_lifecycle_documented"] = json!(false);
    input["incident_response_summary"]["severity_matrix_documented"] = json!(false);
    input["audit_evidence_index_summary"]["all_evidence_linked"] = json!(false);
    assert_eq!(
        validate_deep_assurance(&input)["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP"
    );
}

#[test]
fn specific_gap_precedes_incomplete() {
    // a present-but-gapped trust track blocks even when another document is entirely missing.
    let mut input = fixture_input("trust_ceremony_gap");
    input.as_object_mut().unwrap().remove("abuse_cases_summary");
    assert_eq!(
        validate_deep_assurance(&input)["deep_assurance_status"],
        "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP"
    );
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("no"), json!(3), json!(["z"]), Value::Null] {
        let r = validate_deep_assurance(&bad);
        assert_eq!(
            r["deep_assurance_status"], "DEEP_ASSURANCE_INVALID",
            "malformed input must fail closed"
        );
        assert_eq!(r["not_production"], true);
        assert_eq!(r["not_a_licence"], true);
        assert_eq!(r["external_audit_not_performed"], true);
        assert_eq!(r["production_trust_ceremony_not_executed"], true);
        assert_eq!(r["does_not_make_banza_a_payment_service_provider"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_deep_assurance(&fixture_input("deep_assurance_ready_for_pre_audit_review"));
    let b = validate_deep_assurance(&fixture_input("deep_assurance_ready_for_pre_audit_review"));
    assert_eq!(
        a["deep_assurance_report_hash"],
        b["deep_assurance_report_hash"]
    );
    assert_eq!(a["deep_assurance_report_hash"].as_str().unwrap().len(), 64);
    for f in deep_demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_deep_assurance(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["not_production"], true);
        assert_eq!(r["external_audit_not_performed"], true);
    }
}

#[test]
fn every_fixture_matches_its_expected_status() {
    for f in deep_demo_fixtures()["fixtures"].as_array().unwrap() {
        let key = f["key"].as_str().unwrap();
        let expected = f["expected"].as_str().unwrap();
        assert_eq!(status(key), expected, "fixture {key}");
    }
}
