//! BX1.8 — L2 payment-flow readiness: status computed in Rust over the manifest/SimB/L0/L1 reports plus
//! the payment intent, idempotency, ledger, trace and settlement artifacts. Local (no network); boundary
//! flags; no fixture is a real payment. Fixtures drive the statuses.

use banza_l2_readiness::{demo_fixtures, validate_l2};
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
    validate_l2(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn ready_payment_flow_is_ready() {
    let r = validate_l2(&fixture_input("l2_ready_payment_flow"));
    assert_eq!(r["status"], "L2_READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(r["readiness"], "READY");
    assert!(r["missing_artifacts"].as_array().unwrap().is_empty());
    assert!(r["invalid_artifacts"].as_array().unwrap().is_empty());
    // boundary flags all present and true
    for f in [
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
    // ledger summary confirms zero-sum, computed in Rust
    assert_eq!(r["ledger_summary"]["zero_sum"], true);
    assert_eq!(r["ledger_summary"]["debit_minor"], 12345);
    assert_eq!(r["ledger_summary"]["credit_minor"], 12345);
    // trace id threaded through
    assert_eq!(r["trace_summary"]["trace_id"], "trace_test_0001");
}

#[test]
fn idempotency_divergence_blocks() {
    assert_eq!(status("idempotency_fail"), "L2_BLOCKED_BY_IDEMPOTENCY");
}

#[test]
fn ledger_not_zero_sum_blocks() {
    let r = validate_l2(&fixture_input("ledger_fail"));
    assert_eq!(r["status"], "L2_BLOCKED_BY_LEDGER");
    assert_eq!(r["ledger_summary"]["zero_sum"], false);
}

#[test]
fn trace_inconsistency_blocks() {
    assert_eq!(status("trace_fail"), "L2_BLOCKED_BY_TRACE");
}

#[test]
fn settlement_incoherence_blocks() {
    assert_eq!(status("settlement_fail"), "L2_BLOCKED_BY_SETTLEMENT");
}

#[test]
fn missing_l1_is_incomplete_or_blocked() {
    let s = status("missing_l1");
    assert!(
        s == "L2_INCOMPLETE" || s == "L2_BLOCKED_BY_L1",
        "missing L1 → INCOMPLETE or BLOCKED_BY_L1, got {s}"
    );
}

#[test]
fn production_claim_is_invalid() {
    assert_eq!(status("production_claim"), "L2_INVALID");
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("not an object"), json!(42), json!(["a"]), Value::Null] {
        let r = validate_l2(&bad);
        assert_eq!(
            r["status"], "L2_INVALID",
            "malformed input must fail closed"
        );
        assert_eq!(r["does_not_move_funds"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn float_amount_is_rejected() {
    // money must be integer minor units; a float amount is a payment-flow error
    let mut input = fixture_input("l2_ready_payment_flow");
    input["payment_intent"]["amount_minor"] = json!(123.45);
    let r = validate_l2(&input);
    assert_eq!(r["status"], "L2_BLOCKED_BY_PAYMENT_FLOW");
}

#[test]
fn manifest_precedes_payment_blockers() {
    // an invalid manifest blocks before any payment-flow check runs
    let mut input = fixture_input("ledger_fail");
    input["operator_manifest"] = json!({ "status": "INVALID" });
    assert_eq!(
        validate_l2(&input)["status"],
        "L2_BLOCKED_BY_MANIFEST",
        "manifest blocker must take precedence"
    );
}

#[test]
fn deterministic_hash_and_no_network() {
    let a = validate_l2(&fixture_input("l2_ready_payment_flow"));
    let b = validate_l2(&fixture_input("l2_ready_payment_flow"));
    assert_eq!(a["l2_report_hash"], b["l2_report_hash"]);
    assert!(a["l2_report_hash"].as_str().unwrap().len() == 64);
    // every fixture is test-only, zero llm, no external model
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_l2(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["not_a_payment"], true);
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
