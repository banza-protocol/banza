//! BX1.6 — operator manifest validator: status/readiness computed in Rust over the canonical manifest +
//! DRAFT submission extension; local (no network); boundary flags. Fixtures drive the four statuses.

use banza_operator_manifest::{demo_fixtures, validate_manifest, validate_manifest_str};
use serde_json::{json, Value};

fn fixture(key: &str) -> Value {
    let fx = demo_fixtures();
    fx["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["key"] == key)
        .unwrap_or_else(|| panic!("fixture {key} not found"))
        .clone()
}
fn validate_fixture(key: &str) -> Value {
    let f = fixture(key);
    if let Some(raw) = f.get("raw").and_then(|x| x.as_str()) {
        validate_manifest_str(raw)
    } else {
        validate_manifest(&f["manifest"])
    }
}

#[test]
fn valid_candidate_is_valid_and_ready() {
    let r = validate_fixture("valid_l0_candidate_manifest");
    assert_eq!(r["status"], "VALID", "errors: {:?}", r["errors"]);
    assert_eq!(r["readiness"], "READY_FOR_SIMB_PRE_REVIEW");
    assert_eq!(r["operator_id"], "operator-zero");
    assert_eq!(r["not_a_certificate"], true);
    assert_eq!(r["not_an_approval"], true);
    assert_eq!(r["does_not_create_operator"], true);
    assert_eq!(r["requires_simb_pre_review"], true);
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["key_manifest_reference"]["present"], true);
    // endpoint checks present but no network
    assert!(!r["endpoint_checks"].as_array().unwrap().is_empty());
    assert!(r["endpoint_checks"][0]["note"]
        .as_str()
        .unwrap()
        .contains("disabled"));
}

#[test]
fn missing_key_manifest_is_incomplete() {
    let r = validate_fixture("missing_key_manifest");
    assert_eq!(r["status"], "INCOMPLETE");
    let missing: Vec<String> = r["missing_fields"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x.as_str().unwrap().to_string())
        .collect();
    assert!(missing.contains(&"key_manifest_url".to_string()));
    assert_eq!(r["key_manifest_reference"]["present"], false);
    assert!(r["errors"].as_array().unwrap().is_empty());
}

#[test]
fn bad_protocol_version_is_invalid() {
    let r = validate_fixture("bad_protocol_version");
    assert_eq!(r["status"], "INVALID");
    assert!(r["errors"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e.as_str().unwrap().contains("protocol_version")));
}

#[test]
fn production_claim_is_invalid_with_boundary_error() {
    let r = validate_fixture("production_claim_manifest");
    assert_eq!(r["status"], "INVALID");
    let errs = r["errors"].as_array().unwrap();
    assert!(errs
        .iter()
        .any(|e| e.as_str().unwrap().contains("certificação/produção")
            || e.as_str().unwrap().contains("production_allowed")));
    assert_eq!(r["readiness"], "BLOCKED");
}

#[test]
fn malformed_json_is_malformed() {
    let r = validate_fixture("malformed_json");
    assert_eq!(r["status"], "MALFORMED");
    assert_eq!(r["readiness"], "NOT_READY");
    // a non-object also fails closed
    assert_eq!(validate_manifest_str("[1,2,3]")["status"], "MALFORMED");
    assert_eq!(
        validate_manifest_str("\"just a string\"")["status"],
        "MALFORMED"
    );
}

#[test]
fn accepts_wrapped_and_bare_manifest_and_hashes_are_deterministic() {
    let m = fixture("valid_l0_candidate_manifest")["manifest"].clone();
    let bare = validate_manifest_str(&m.to_string());
    let wrapped = validate_manifest_str(&json!({ "manifest": m }).to_string());
    assert_eq!(bare["status"], "VALID");
    assert_eq!(wrapped["status"], "VALID");
    assert_eq!(bare["manifest_hash"], wrapped["manifest_hash"]);
    assert_eq!(bare["manifest_id"], wrapped["manifest_id"]);
    assert!(bare["manifest_hash"].as_str().unwrap().len() == 64);
}

#[test]
fn all_fixtures_are_test_only_zero_llm() {
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_fixture(f["key"].as_str().unwrap());
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert!(r["boundary"]
            .as_str()
            .unwrap()
            .contains("Não é certificação"));
    }
}
