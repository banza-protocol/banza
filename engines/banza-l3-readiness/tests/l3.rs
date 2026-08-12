//! BX1.9 — L3 federation readiness: status computed in Rust over the manifest/SimB/L0/L1/L2 reports plus
//! the federation pair/intent, cross-operator trace, trust & BRL and federation settlement. Local (no
//! network); boundary flags; no fixture is a real federation or a real operator. Fixtures drive statuses.

use banza_l3_readiness::{demo_fixtures, validate_l3};
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
    validate_l3(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_federation_flow_is_ready() {
    let r = validate_l3(&fixture_input("l3_ready_federation_flow"));
    assert_eq!(r["status"], "L3_READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(r["readiness"], "READY");
    assert!(r["missing_artifacts"].as_array().unwrap().is_empty());
    assert!(r["invalid_artifacts"].as_array().unwrap().is_empty());
    for f in [
        "not_active_federation",
        "not_a_payment",
        "not_a_certificate",
        "not_an_approval",
        "does_not_move_funds",
        "does_not_create_operator",
        "requires_conformance_evidence_review",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["operator_url_validation"], "disabled");
    // two distinct operators, correlated cross-operator trace, empty BRL revoked
    assert_eq!(
        r["federation_summary"]["operators"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        r["cross_operator_trace_summary"]["correlation_id"],
        "corr_0001"
    );
    assert!(r["brl_summary"]["revoked_operators"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[test]
fn missing_l2_is_incomplete_or_blocked() {
    let s = status("missing_l2");
    assert!(
        s == "L3_INCOMPLETE" || s == "L3_BLOCKED_BY_L2",
        "missing L2 → INCOMPLETE or BLOCKED_BY_L2, got {s}"
    );
}

#[test]
fn trace_without_linkage_blocks() {
    assert_eq!(status("federation_trace_fail"), "L3_BLOCKED_BY_TRACE");
}

#[test]
fn settlement_incoherence_blocks() {
    assert_eq!(
        status("federation_settlement_fail"),
        "L3_BLOCKED_BY_SETTLEMENT"
    );
}

#[test]
fn revoked_operator_blocks_fail_closed() {
    let r = validate_l3(&fixture_input("brl_revoked_operator"));
    assert_eq!(r["status"], "L3_BLOCKED_BY_BRL");
    assert_eq!(
        r["brl_summary"]["revoked_operators"][0], "operator-B-test",
        "the revoked operator must be named"
    );
}

#[test]
fn trust_invalid_blocks() {
    assert_eq!(status("trust_fail"), "L3_BLOCKED_BY_TRUST");
}

#[test]
fn production_claim_is_invalid() {
    assert_eq!(status("production_claim"), "L3_INVALID");
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("not an object"), json!(7), json!(["x"]), Value::Null] {
        let r = validate_l3(&bad);
        assert_eq!(
            r["status"], "L3_INVALID",
            "malformed input must fail closed"
        );
        assert_eq!(r["not_active_federation"], true);
        assert_eq!(r["does_not_move_funds"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn trust_precedes_brl_and_manifest_precedes_all() {
    // trust invalid takes precedence over a BRL revocation
    let mut input = fixture_input("brl_revoked_operator");
    input["trust_and_brl"]["key_manifest"] = json!({ "schema_version": "1" });
    assert_eq!(validate_l3(&input)["status"], "L3_BLOCKED_BY_TRUST");
    // an invalid manifest blocks before any federation check
    let mut input2 = fixture_input("federation_trace_fail");
    input2["operator_manifest"] = json!({ "status": "INVALID" });
    assert_eq!(validate_l3(&input2)["status"], "L3_BLOCKED_BY_MANIFEST");
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_l3(&fixture_input("l3_ready_federation_flow"));
    let b = validate_l3(&fixture_input("l3_ready_federation_flow"));
    assert_eq!(a["l3_report_hash"], b["l3_report_hash"]);
    assert_eq!(a["l3_report_hash"].as_str().unwrap().len(), 64);
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_l3(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["not_active_federation"], true);
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
