//! M2 — production protocol gate: status computed in Rust over the production state model, contract
//! baseline, release governance, protocol governance role, operator self-publication, production trust path, plus the
//! security & deep assurance reports and a regulatory-boundary confirmation. Local (no network); boundary
//! flags; no fixture activates an operator, emits a real production certificate, moves funds, or represents
//! real payment-service operation. Fixtures drive the statuses.

use banza_production_gate::{demo_fixtures, validate_m2_protocol_gate};
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
    validate_m2_protocol_gate(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_package_is_implementation_ready() {
    let r = validate_m2_protocol_gate(&fixture_input("m2_protocol_implementation_ready"));
    assert_eq!(r["status"], "M2_PROTOCOL_IMPLEMENTATION_READY");
    assert_eq!(r["m2_state"], "M2_PROTOCOL_IMPLEMENTATION");
    assert_eq!(r["protocol_production_prepared"], true);
    assert!(r["missing_artifacts"].as_array().unwrap().is_empty());
    assert!(r["blocked_items"].as_array().unwrap().is_empty());
    assert!(r["forbidden_activation_attempts"]
        .as_array()
        .unwrap()
        .is_empty());
    for g in [
        "contracts",
        "governance",
        "trust_path",
        "operator_self_publication",
        "assurance",
        "regulatory_boundary",
    ] {
        assert_eq!(
            r["production_protocol_gates"][g], "ok",
            "gate {g} must be ok"
        );
    }
    for f in [
        "operator_activation_allowed",
        "production_certificates_allowed",
        "payment_service_operation_allowed",
    ] {
        assert_eq!(r[f], false, "{f} must be false even when ready");
    }
    for f in [
        "not_a_psp",
        "does_not_move_funds",
        "does_not_create_operator",
        "does_not_issue_payment_service_authorisation",
        "does_not_make_banza_a_payment_service_provider",
        "requires_operator_regulatory_authorisation_if_used_for_real_services",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true even when ready");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["regulatory_boundary_summary"]["banza_is_psp"], false);
}

#[test]
fn missing_contracts_blocks() {
    let r = validate_m2_protocol_gate(&fixture_input("missing_contracts"));
    assert_eq!(r["status"], "M2_BLOCKED_BY_MISSING_CONTRACTS");
    assert_eq!(r["production_protocol_gates"]["contracts"], "missing");
    assert!(r["missing_artifacts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|d| d == "production_contract_baseline_summary"));
}

#[test]
fn governance_gap_blocks() {
    assert_eq!(status("governance_gap"), "M2_BLOCKED_BY_GOVERNANCE_GAP");
}

#[test]
fn trust_path_gap_blocks() {
    assert_eq!(status("trust_path_gap"), "M2_BLOCKED_BY_TRUST_PATH_GAP");
}

#[test]
fn operator_self_publication_gap_blocks() {
    assert_eq!(
        status("operator_self_publication_gap"),
        "M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP"
    );
}

#[test]
fn assurance_gap_blocks() {
    let r = validate_m2_protocol_gate(&fixture_input("assurance_gap"));
    assert_eq!(r["status"], "M2_BLOCKED_BY_ASSURANCE_GAP");
    assert_eq!(r["production_protocol_gates"]["assurance"], "gap");
}

#[test]
fn forbidden_activation_is_invalid() {
    let r = validate_m2_protocol_gate(&fixture_input("forbidden_activation_attempt"));
    assert_eq!(r["status"], "M2_INVALID_FORBIDDEN_ACTIVATION");
    assert_eq!(r["m2_state"], "PRE_PRODUCTION");
    let hits = r["forbidden_activation_attempts"].as_array().unwrap();
    assert!(hits.iter().any(|h| h == "activate_operator"));
    assert!(hits.iter().any(|h| h == "set_production_certificates_true"));
    // even invalid, activation stays disallowed and boundary flags hold
    assert_eq!(r["operator_activation_allowed"], false);
    assert_eq!(r["production_certificates_allowed"], false);
    assert_eq!(r["does_not_make_banza_a_payment_service_provider"], true);
}

#[test]
fn regulatory_boundary_fail_is_invalid() {
    let r = validate_m2_protocol_gate(&fixture_input("regulatory_boundary_fail"));
    assert_eq!(r["status"], "M2_INVALID_REGULATORY_BOUNDARY");
    assert_eq!(r["m2_state"], "PRE_PRODUCTION");
}

#[test]
fn regulatory_fail_precedes_forbidden_and_blocks() {
    // a regulatory boundary failure beats a simultaneous forbidden activation and missing contracts
    let mut input = fixture_input("forbidden_activation_attempt");
    input["regulatory_boundary_confirmation"]["banza_is_psp"] = json!(true);
    input
        .as_object_mut()
        .unwrap()
        .remove("production_contract_baseline_summary");
    assert_eq!(
        validate_m2_protocol_gate(&input)["status"],
        "M2_INVALID_REGULATORY_BOUNDARY"
    );
}

#[test]
fn forbidden_precedes_block_gates() {
    // a forbidden activation beats a missing-contracts block
    let mut input = fixture_input("missing_contracts");
    input["activation_attempts"] = json!({ "add_real_operator": true });
    assert_eq!(
        validate_m2_protocol_gate(&input)["status"],
        "M2_INVALID_FORBIDDEN_ACTIVATION"
    );
}

#[test]
fn top_level_activation_flag_is_detected() {
    // activation flags are detected at the top level too, not only under activation_attempts
    let mut input = fixture_input("m2_protocol_implementation_ready");
    input["emit_production_certificate"] = json!(true);
    let r = validate_m2_protocol_gate(&input);
    assert_eq!(r["status"], "M2_INVALID_FORBIDDEN_ACTIVATION");
    assert!(r["forbidden_activation_attempts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|h| h == "emit_production_certificate"));
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("no"), json!(3), json!(["z"]), Value::Null] {
        let r = validate_m2_protocol_gate(&bad);
        assert_eq!(
            r["status"], "M2_INVALID_REGULATORY_BOUNDARY",
            "malformed must fail closed"
        );
        assert_eq!(r["operator_activation_allowed"], false);
        assert_eq!(r["production_certificates_allowed"], false);
        assert_eq!(r["not_a_psp"], true);
        assert_eq!(r["does_not_make_banza_a_payment_service_provider"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_m2_protocol_gate(&fixture_input("m2_protocol_implementation_ready"));
    let b = validate_m2_protocol_gate(&fixture_input("m2_protocol_implementation_ready"));
    assert_eq!(a["m2_report_hash"], b["m2_report_hash"]);
    assert_eq!(a["m2_report_hash"].as_str().unwrap().len(), 64);
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_m2_protocol_gate(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["operator_activation_allowed"], false);
        assert_eq!(r["production_certificates_allowed"], false);
        assert_eq!(r["payment_service_operation_allowed"], false);
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
