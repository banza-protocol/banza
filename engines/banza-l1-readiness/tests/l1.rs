//! BX1.7 — L1 readiness aggregator: status computed in Rust over the manifest/SimB/L0/key-manifest/
//! certificates/BRL surface; local (no network); boundary flags. Fixtures drive the statuses.

use banza_l1_readiness::{demo_fixtures, validate_l1};
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
    validate_l1(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_candidate_is_ready() {
    let r = validate_l1(&fixture_input("l1_ready_candidate"));
    assert_eq!(r["status"], "L1_READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(r["readiness"], "READY");
    assert!(r["missing_artifacts"].as_array().unwrap().is_empty());
    assert!(r["invalid_artifacts"].as_array().unwrap().is_empty());
    assert_eq!(r["not_a_certificate"], true);
    assert_eq!(r["not_an_approval"], true);
    assert_eq!(r["does_not_create_operator"], true);
    assert_eq!(r["requires_conformance_evidence_review"], true);
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    // endpoint paths present, no network
    assert_eq!(r["endpoint_paths"].as_array().unwrap().len(), 5);
    assert!(r["endpoint_paths"][0]["note"]
        .as_str()
        .unwrap()
        .contains("sem rede"));
    assert_eq!(r["operator_url_validation"], "disabled");
}

#[test]
fn missing_key_manifest_is_blocked_by_trust() {
    let r = validate_l1(&fixture_input("missing_key_manifest"));
    assert_eq!(r["status"], "L1_BLOCKED_BY_TRUST");
    assert!(r["missing_artifacts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|x| x == "key_manifest"));
    assert_eq!(r["trust_summary"]["key_manifest"], "missing");
}

#[test]
fn simb_fail_is_blocked_by_simb() {
    assert_eq!(status("simb_fail"), "L1_BLOCKED_BY_SIMB");
}

#[test]
fn l0_fail_is_blocked_by_l0() {
    assert_eq!(status("l0_fail"), "L1_BLOCKED_BY_L0");
}

#[test]
fn production_claim_is_invalid() {
    let r = validate_l1(&fixture_input("production_claim"));
    assert_eq!(r["status"], "L1_INVALID");
    assert_eq!(r["readiness"], "NOT_READY");
}

#[test]
fn malformed_input_fails_closed() {
    assert_eq!(validate_l1(&json!("not an object"))["status"], "L1_INVALID");
    assert_eq!(validate_l1(&json!([1, 2, 3]))["status"], "L1_INVALID");
    // empty object → everything missing → incomplete (manifest/simb/l0 missing; km/brl missing → trust)
    let empty = validate_l1(&json!({}));
    assert!(empty["status"].as_str().unwrap().starts_with("L1_"));
    assert_eq!(empty["not_a_certificate"], true);
}

#[test]
fn hashes_deterministic_and_manifest_invalid_blocks() {
    let inp = fixture_input("l1_ready_candidate");
    assert_eq!(
        validate_l1(&inp)["l1_report_hash"],
        validate_l1(&inp)["l1_report_hash"]
    );
    // present-but-invalid manifest → BLOCKED_BY_MANIFEST
    let mut bad = inp.clone();
    bad["operator_manifest"] = json!({ "status": "INVALID", "errors": ["campo em falta"] });
    assert_eq!(validate_l1(&bad)["status"], "L1_BLOCKED_BY_MANIFEST");
}

#[test]
fn every_fixture_is_test_only_zero_llm_no_network() {
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_l1(&f["input"]);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["operator_url_validation"], "disabled");
        assert!(r["boundary"]
            .as_str()
            .unwrap()
            .contains("Não é certificação"));
    }
}
