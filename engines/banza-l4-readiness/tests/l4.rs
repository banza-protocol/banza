//! BX1.10 — L4 external-interoperability readiness: status computed in Rust over the manifest/SimB/L0/L1/
//! L2/L3 reports plus the external interoperability profile, version negotiation, endpoint contract map,
//! capability matrix, envelope, error mapping and trust & BRL. Local (no network); boundary flags; no
//! fixture is a real integration/operator/payment/federation/licence. Fixtures drive the statuses.

use banza_l4_readiness::{demo_fixtures, validate_l4};
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
    validate_l4(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_external_interop_is_ready() {
    let r = validate_l4(&fixture_input("l4_ready_external_interop"));
    assert_eq!(r["status"], "L4_READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(r["readiness"], "READY");
    assert!(r["missing_artifacts"].as_array().unwrap().is_empty());
    assert!(r["invalid_artifacts"].as_array().unwrap().is_empty());
    for f in [
        "not_external_integration",
        "not_active_federation",
        "not_a_payment",
        "not_a_certificate",
        "not_an_approval",
        "not_a_licence",
        "not_a_psp",
        "does_not_move_funds",
        "does_not_create_operator",
        "does_not_make_banza_a_payment_service_provider",
        "requires_operator_regulatory_authorisation_if_used_for_real_services",
        "requires_conformance_evidence_review",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["operator_url_validation"], "disabled");
    assert_eq!(r["external_integration"], "disabled");
    assert_eq!(r["version_negotiation_summary"]["selected_version"], "1.0");
    assert_eq!(r["endpoint_contract_summary"]["endpoint_count"], 2);
    assert!(r["brl_summary"]["revoked_operators"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[test]
fn missing_l3_is_incomplete_or_blocked() {
    let s = status("missing_l3");
    assert!(
        s == "L4_INCOMPLETE" || s == "L4_BLOCKED_BY_L3",
        "missing L3 → INCOMPLETE or BLOCKED_BY_L3, got {s}"
    );
}

#[test]
fn version_negotiation_fail_blocks() {
    assert_eq!(
        status("version_negotiation_fail"),
        "L4_BLOCKED_BY_VERSION_NEGOTIATION"
    );
}

#[test]
fn endpoint_contract_fail_blocks() {
    assert_eq!(
        status("endpoint_contract_fail"),
        "L4_BLOCKED_BY_ENDPOINT_CONTRACT"
    );
}

#[test]
fn envelope_fail_blocks() {
    assert_eq!(status("envelope_fail"), "L4_BLOCKED_BY_ENVELOPE");
}

#[test]
fn error_mapping_fail_blocks() {
    assert_eq!(status("error_mapping_fail"), "L4_BLOCKED_BY_ERROR_MAPPING");
}

#[test]
fn revoked_operator_blocks_fail_closed() {
    let r = validate_l4(&fixture_input("brl_revoked"));
    assert_eq!(r["status"], "L4_BLOCKED_BY_BRL");
    assert_eq!(r["brl_summary"]["revoked_operators"][0], "operator-B-test");
}

#[test]
fn production_claim_is_invalid() {
    assert_eq!(status("production_claim"), "L4_INVALID");
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("nope"), json!(5), json!(["y"]), Value::Null] {
        let r = validate_l4(&bad);
        assert_eq!(
            r["status"], "L4_INVALID",
            "malformed input must fail closed"
        );
        assert_eq!(r["not_external_integration"], true);
        assert_eq!(r["not_a_licence"], true);
        assert_eq!(r["does_not_make_banza_a_payment_service_provider"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn upstream_precedence_holds() {
    // an invalid manifest blocks before any interop check
    let mut input = fixture_input("version_negotiation_fail");
    input["operator_manifest"] = json!({ "status": "INVALID" });
    assert_eq!(validate_l4(&input)["status"], "L4_BLOCKED_BY_MANIFEST");
    // L3 not ready blocks before the interop artifacts
    let mut input2 = fixture_input("endpoint_contract_fail");
    input2["l3_readiness"] = json!({ "status": "L3_BLOCKED_BY_TRACE" });
    assert_eq!(validate_l4(&input2)["status"], "L4_BLOCKED_BY_L3");
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_l4(&fixture_input("l4_ready_external_interop"));
    let b = validate_l4(&fixture_input("l4_ready_external_interop"));
    assert_eq!(a["l4_report_hash"], b["l4_report_hash"]);
    assert_eq!(a["l4_report_hash"].as_str().unwrap().len(), 64);
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_l4(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["not_external_integration"], true);
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
