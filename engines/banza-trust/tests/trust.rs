//! banza-trust M2.4 — the active-model trust evaluation: signed protocol metadata, delegated signing
//! keys, operator manifest, conformance evidence, public protocol registry, revocation/fail-closed.
//! Every trust decision is computed in Rust, fail-closed, offline, with no LLM.

use banza_trust::evaluate::evaluate_trust;
use banza_trust::sign::{build_input, scenarios};
use serde_json::{json, Value};

fn status(input: &Value) -> String {
    evaluate_trust(input)["trust_status"]
        .as_str()
        .unwrap_or("")
        .to_string()
}

#[test]
fn every_scenario_reaches_its_expected_status() {
    for (key, _label, expected, input) in scenarios() {
        assert_eq!(status(&input), expected, "scenario {key}");
    }
    assert_eq!(scenarios().len(), 12);
}

#[test]
fn valid_material_is_trust_valid() {
    assert_eq!(status(&build_input("valid")), "TRUST_VALID");
}

#[test]
fn tampered_metadata_fails_signature() {
    assert_eq!(
        status(&build_input("invalid_metadata_signature")),
        "TRUST_INVALID_SIGNATURE"
    );
}

#[test]
fn wrong_delegated_usage_is_invalid_delegated_key() {
    assert_eq!(
        status(&build_input("wrong_delegated_key_usage")),
        "TRUST_INVALID_DELEGATED_KEY"
    );
}

#[test]
fn revoked_delegated_key_fails() {
    assert_eq!(
        status(&build_input("revoked_delegated_key")),
        "TRUST_INVALID_DELEGATED_KEY"
    );
}

#[test]
fn missing_conformance_evidence_fails() {
    assert_eq!(
        status(&build_input("missing_conformance_evidence")),
        "TRUST_MISSING_CONFORMANCE_EVIDENCE"
    );
}

#[test]
fn missing_operator_manifest_fails() {
    assert_eq!(
        status(&build_input("missing_operator_manifest")),
        "TRUST_MISSING_OPERATOR_MANIFEST"
    );
}

#[test]
fn missing_registry_entry_fails() {
    assert_eq!(
        status(&build_input("missing_registry_entry")),
        "TRUST_MISSING_REGISTRY_ENTRY"
    );
}

#[test]
fn revoked_operator_is_trust_revoked() {
    assert_eq!(status(&build_input("operator_revoked")), "TRUST_REVOKED");
}

#[test]
fn expired_metadata_fails() {
    assert_eq!(
        status(&build_input("expired_metadata")),
        "TRUST_EXPIRED_METADATA"
    );
}

#[test]
fn incompatible_protocol_version_fails() {
    assert_eq!(
        status(&build_input("incompatible_protocol_version")),
        "TRUST_INCOMPATIBLE_PROTOCOL_VERSION"
    );
}

#[test]
fn boundary_claim_is_rejected_first() {
    // A metadata that claims to be an operator certificate is rejected even though its signature is valid.
    assert_eq!(
        status(&build_input("boundary_fail")),
        "TRUST_INVALID_BOUNDARY"
    );
}

#[test]
fn malformed_input_fails_closed() {
    assert_eq!(
        status(&Value::String("garbage".into())),
        "TRUST_FAIL_CLOSED"
    );
    assert_eq!(status(&json!([1, 2, 3])), "TRUST_FAIL_CLOSED");
}

#[test]
fn missing_revocation_material_fails_closed() {
    // A valid bundle whose revocation material is absent must NOT be trusted (fail-closed).
    let mut input = build_input("valid");
    input["revocation_status"] = json!({ "revoked": false });
    assert_eq!(status(&input), "TRUST_REVOKED");
}

#[test]
fn report_is_deterministic() {
    let a = evaluate_trust(&build_input("valid"));
    let b = evaluate_trust(&build_input("valid"));
    assert_eq!(a["report_hash"], b["report_hash"]);
    assert!(a["report_hash"].as_str().unwrap().len() == 64);
}

#[test]
fn report_carries_the_active_model_boundary_flags() {
    let r = evaluate_trust(&build_input("valid"));
    let f = &r["flags"];
    assert_eq!(f["open_financial_protocol"], true);
    assert_eq!(f["certificate_based_trust"], false);
    assert_eq!(f["signed_metadata_based_trust"], true);
    assert_eq!(f["does_not_authorise_operators"], true);
    assert_eq!(f["does_not_certify_operators"], true);
    assert_eq!(f["does_not_issue_payment_licence"], true);
    assert_eq!(r["llm_calls"], 0);
    assert_eq!(r["external_model_called"], false);
    assert_eq!(r["test_only"], true);
}

const GOLDEN: &str = include_str!("../golden/vectors.json");

#[test]
fn golden_vectors_evaluate_to_their_expected_status() {
    let golden: Value = serde_json::from_str(GOLDEN).expect("golden parse");
    let cases = golden["cases"].as_array().expect("golden cases");
    assert_eq!(cases.len(), 12, "golden must hold twelve cases");
    for case in cases {
        assert_eq!(
            status(&case["input"]),
            case["expected"].as_str().unwrap(),
            "golden case {}",
            case["key"]
        );
    }
    // the golden file carries only public key material
    let blob = GOLDEN.to_lowercase();
    for term in ["private_key", "secret_key", "mnemonic", "passphrase"] {
        assert!(!blob.contains(term), "golden must not contain '{term}'");
    }
}

// ── Adversarial regressions (M2.4 review findings F1/F2/F3) ──────────────────

#[test]
fn f1_root_without_a_valid_threshold_signature_is_rejected() {
    // Remove the root signatures → no threshold → fail-closed.
    let mut a = build_input("valid");
    a["trust_root_metadata"]
        .as_object_mut()
        .unwrap()
        .remove("root_signatures");
    assert_eq!(status(&a), "TRUST_INVALID_ROOT_METADATA");
    // Garbage signatures → none verify → fail-closed.
    let mut b = build_input("valid");
    b["trust_root_metadata"]["root_signatures"] = json!(["AAAA", "BBBB"]);
    assert_eq!(status(&b), "TRUST_INVALID_ROOT_METADATA");
    // Attacker-chosen root keys not in the evaluator's pinned anchor → candidates empty → fail-closed.
    let mut c = build_input("valid");
    c["trust_root_metadata"]["active_root_public_keys"] =
        json!(["attacker-key-1", "attacker-key-2", "attacker-key-3"]);
    assert_eq!(status(&c), "TRUST_INVALID_ROOT_METADATA");
}

#[test]
fn f2_a_stray_negation_does_not_clear_an_affirmative_boundary_claim() {
    // "operator certificate … no disputes": the "no" is AFTER the phrase → not cleared → rejected.
    let mut a = build_input("valid");
    a["evaluator_note"] = json!("Holder is an operator certificate in good standing, no disputes");
    assert_eq!(status(&a), "TRUST_INVALID_BOUNDARY");
    // Control: a genuinely negated boundary sentence is allowed (clause-scoped negation precedes it).
    let mut b = build_input("valid");
    b["evaluator_note"] = json!("Este material não é um operator certificate");
    assert_eq!(status(&b), "TRUST_VALID");
}

#[test]
fn f3_a_non_boolean_truthy_claim_flag_is_rejected() {
    for truthy in [json!(1), json!("yes"), json!(1.0), json!("TRUE")] {
        let mut a = build_input("valid");
        a["is_operator_certificate"] = truthy.clone();
        assert_eq!(status(&a), "TRUST_INVALID_BOUNDARY", "flag value {truthy}");
    }
    // Control: an explicitly-false boundary flag is allowed.
    let mut b = build_input("valid");
    b["is_operator_certificate"] = json!(false);
    assert_eq!(status(&b), "TRUST_VALID");
}

#[test]
fn no_certificate_vocabulary_in_the_valid_report() {
    let out = evaluate_trust(&build_input("valid"))
        .to_string()
        .to_lowercase();
    for term in ["operator certificate", "ca signature", "certified operator"] {
        assert!(
            !out.contains(term),
            "engine output must not contain '{term}'"
        );
    }
}
