//! M2.1 — root trust ceremony (2-of-3): status computed in Rust over real Ed25519 signatures, the 2-of-3
//! threshold, custody/backup/offline/recovery declarations, root scope and the regulatory boundary, with
//! forbidden-private-key-material detection. Local (no network); boundary flags; no fixture contains a real
//! private key. Fixtures drive the statuses.

use banza_root_ceremony::{demo_fixtures, validate_root_ceremony};
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
    validate_root_ceremony(&fixture_input(key))["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn valid_2of3_is_valid() {
    let r = validate_root_ceremony(&fixture_input("valid_2of3"));
    assert_eq!(r["status"], "M2_ROOT_CEREMONY_VALID");
    assert_eq!(r["threshold"], 2);
    assert_eq!(r["total_root_keys"], 3);
    assert_eq!(r["custodian_count"], 3);
    assert_eq!(r["valid_signature_count"], 2);
    assert_eq!(r["protocol_root_established"], true);
    assert_eq!(r["forbidden_private_key_material_detected"], false);
    for f in [
        "operator_activation_allowed",
        "production_certificates_allowed",
        "payment_service_operation_allowed",
    ] {
        assert_eq!(r[f], false, "{f} must be false");
    }
    for f in [
        "not_a_psp",
        "open_financial_protocol",
        "does_not_move_funds",
        "does_not_settle_funds",
        "does_not_hold_funds",
        "does_not_create_operator",
        "does_not_issue_payment_service_authorisation",
        "requires_operator_regulatory_authorisation_if_used_for_real_services",
        "test_only",
    ] {
        assert_eq!(r[f], true, "flag {f} must be true even when valid");
    }
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["root_ceremony_report_hash"].as_str().unwrap().len(), 64);
}

#[test]
fn threshold_1of3_blocks() {
    let r = validate_root_ceremony(&fixture_input("threshold_1of3"));
    assert_eq!(r["status"], "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD");
    assert_eq!(r["valid_signature_count"], 1);
    assert_eq!(r["protocol_root_established"], false);
}

#[test]
fn duplicate_custodian_blocks() {
    assert_eq!(
        status("duplicate_custodian"),
        "M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP"
    );
}

#[test]
fn missing_backup_blocks() {
    assert_eq!(
        status("missing_backup"),
        "M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP"
    );
}

#[test]
fn online_environment_gap_blocks() {
    assert_eq!(
        status("online_environment_gap"),
        "M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP"
    );
}

#[test]
fn missing_recovery_test_blocks() {
    assert_eq!(
        status("missing_recovery_test"),
        "M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP"
    );
}

#[test]
fn invalid_signature_is_invalid() {
    assert_eq!(
        status("invalid_signature"),
        "M2_ROOT_CEREMONY_INVALID_SIGNATURE"
    );
}

#[test]
fn private_key_leak_is_forbidden_material() {
    let r = validate_root_ceremony(&fixture_input("private_key_leak"));
    assert_eq!(
        r["status"],
        "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL"
    );
    assert_eq!(r["forbidden_private_key_material_detected"], true);
}

#[test]
fn forbidden_scope_is_invalid_scope() {
    let r = validate_root_ceremony(&fixture_input("forbidden_scope"));
    assert_eq!(r["status"], "M2_ROOT_CEREMONY_INVALID_SCOPE");
    assert_eq!(r["forbidden_scope_detected"], true);
}

#[test]
fn regulatory_boundary_fail_is_invalid() {
    assert_eq!(
        status("regulatory_boundary_fail"),
        "M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY"
    );
}

#[test]
fn incomplete_when_evidence_missing() {
    assert_eq!(
        status("incomplete_missing_evidence"),
        "M2_ROOT_CEREMONY_INCOMPLETE"
    );
}

#[test]
fn forbidden_material_precedes_everything() {
    // even a threshold/scope problem is dominated by a private-key leak.
    let mut input = fixture_input("threshold_1of3");
    input["leak"] = json!({ "seed_phrase": "word word word word (test-only placeholder)" });
    assert_eq!(
        validate_root_ceremony(&input)["status"],
        "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL"
    );
}

#[test]
fn boolean_absence_declaration_is_not_a_leak() {
    // plaintext_private_key: false is a declaration of ABSENCE — must NOT be flagged as material.
    let r = validate_root_ceremony(&fixture_input("valid_2of3"));
    assert_eq!(r["status"], "M2_ROOT_CEREMONY_VALID");
    assert_eq!(r["forbidden_private_key_material_detected"], false);
}

#[test]
fn detects_pem_block_in_any_value() {
    let mut input = fixture_input("valid_2of3");
    input["evidence_note"] = json!("-----BEGIN OPENSSH PRIVATE KEY----- (test)");
    assert_eq!(
        validate_root_ceremony(&input)["status"],
        "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL"
    );
}

#[test]
fn malformed_input_fails_closed() {
    for bad in [json!("no"), json!(3), json!(["z"]), Value::Null] {
        let r = validate_root_ceremony(&bad);
        assert!(
            r["status"]
                .as_str()
                .unwrap()
                .starts_with("M2_ROOT_CEREMONY_INVALID"),
            "malformed must fail closed to an INVALID state, got {}",
            r["status"]
        );
        assert_eq!(r["protocol_root_established"], false);
        assert_eq!(r["not_a_psp"], true);
        assert_eq!(r["does_not_move_funds"], true);
        assert_eq!(r["llm_calls"], 0);
    }
}

#[test]
fn deterministic_and_no_network() {
    let a = validate_root_ceremony(&fixture_input("valid_2of3"));
    let b = validate_root_ceremony(&fixture_input("valid_2of3"));
    assert_eq!(
        a["root_ceremony_report_hash"],
        b["root_ceremony_report_hash"]
    );
    for f in demo_fixtures()["fixtures"].as_array().unwrap() {
        let r = validate_root_ceremony(&f["input"]);
        assert_eq!(r["test_only"], true);
        assert_eq!(r["llm_calls"], 0);
        assert_eq!(r["external_model_called"], false);
        assert_eq!(r["operator_activation_allowed"], false);
        assert_eq!(r["open_financial_protocol"], true);
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
