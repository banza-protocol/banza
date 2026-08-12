//! BX1.5 — the evidence-bundle assembler: readiness (Rust) over the required SimB + L0 artifacts,
//! deterministic SHA-256 integrity, fail-closed validation, and the non-certificate boundary flags.

use banza_evidence_bundle::{build_bundle, demo_bundle, validate_bundle};
use serde_json::{json, Value};

fn simb(pre: &str) -> Value {
    json!({
        "pre_review_status": pre,
        "status": if pre == "SIMB_PRE_REVIEW_PASS" { "PASS" } else { "FAIL" },
        "tool_version": "0.1.0", "scenario_id": "x"
    })
}
fn l0(status: &str) -> Value {
    json!({ "status": status, "tool_version": "0.1.0", "level": "L0" })
}

#[test]
fn complete_bundle_is_ready() {
    let b = build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_PASS"), "l0": l0("PASS") }));
    assert_eq!(b["readiness"], "READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(b["not_a_certificate"], true);
    assert_eq!(b["not_an_approval"], true);
    assert_eq!(b["requires_conformance_evidence_review"], true);
    assert_eq!(b["llm_calls"], 0);
    assert_eq!(b["external_model_called"], false);
    assert!(b["hashes"]["bundle_hash"].as_str().unwrap().len() == 64);
    assert!(b["bundle_id"].as_str().unwrap().starts_with("bundle-"));
}

#[test]
fn simb_fail_blocks_by_simb() {
    let b = build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_FAIL"), "l0": l0("PASS") }));
    assert_eq!(b["readiness"], "BLOCKED_BY_SIMB");
}

#[test]
fn l0_fail_blocks_by_conformance() {
    let b = build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_PASS"), "l0": l0("FAIL") }));
    assert_eq!(b["readiness"], "BLOCKED_BY_CONFORMANCE");
}

#[test]
fn missing_required_is_incomplete() {
    assert_eq!(
        build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_PASS") }))["readiness"],
        "INCOMPLETE"
    );
    assert_eq!(
        build_bundle(&json!({ "l0": l0("PASS") }))["readiness"],
        "INCOMPLETE"
    );
    let empty = build_bundle(&json!({}));
    assert_eq!(empty["readiness"], "INCOMPLETE");
    assert!(empty["missing_required"].as_array().unwrap().len() == 2);
}

#[test]
fn hashes_are_deterministic() {
    let inp = json!({ "simb": simb("SIMB_PRE_REVIEW_PASS"), "l0": l0("PASS"), "created_at": "2026-07-16T00:00:00Z" });
    let a = build_bundle(&inp);
    let b = build_bundle(&inp);
    assert_eq!(a["hashes"]["bundle_hash"], b["hashes"]["bundle_hash"]);
    assert_eq!(a["bundle_id"], b["bundle_id"]);
    // per-report hashes present for provided reports, null for absent ones
    assert!(a["hashes"]["simb_report_hash"].is_string());
    assert!(a["hashes"]["trace_report_hash"].is_null());
}

#[test]
fn build_then_validate_roundtrips() {
    let b = build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_PASS"), "l0": l0("PASS") }));
    let v = validate_bundle(&b.to_string());
    assert_eq!(v["ok"], true, "errors: {:?}", v["errors"]);
}

#[test]
fn tampered_bundle_fails_integrity() {
    let mut b = build_bundle(&json!({ "simb": simb("SIMB_PRE_REVIEW_PASS"), "l0": l0("PASS") }));
    b["operator_candidate"] = json!("tampered-after-hash");
    let v = validate_bundle(&b.to_string());
    assert_eq!(v["ok"], false);
    assert!(v["errors"]
        .as_array()
        .unwrap()
        .iter()
        .any(|e| e.as_str().unwrap().contains("integridade")));
}

#[test]
fn malformed_validate_fails_closed() {
    assert_eq!(validate_bundle("{not json")["ok"], false);
    assert_eq!(validate_bundle("{}")["ok"], false);
}

#[test]
fn demo_valid_is_ready_trust_present_trace_missing() {
    let d = demo_bundle(&json!({ "scenario": "valid_l0" }));
    assert_eq!(d["readiness"], "READY_FOR_TECHNICAL_REVIEW");
    assert_eq!(d["mode"], "demo");
    assert!(d["trust_engine_report"].is_object());
    assert!(d["operator_manifest_validation"].is_object());
    assert!(d["l1_readiness_report"].is_object());
    assert_eq!(
        d["l1_readiness_report"]["status"],
        "L1_READY_FOR_TECHNICAL_REVIEW"
    );
    assert!(d["l2_readiness_report"].is_object());
    assert_eq!(
        d["l2_readiness_report"]["status"],
        "L2_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(
        d["l2_readiness_summary"]["status"],
        "L2_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(d["l2_readiness_report"]["not_a_payment"], true);
    assert!(d["l3_readiness_report"].is_object());
    assert_eq!(
        d["l3_readiness_report"]["status"],
        "L3_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(
        d["l3_readiness_summary"]["status"],
        "L3_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(d["l3_readiness_report"]["not_active_federation"], true);
    assert!(d["l4_readiness_report"].is_object());
    assert_eq!(
        d["l4_readiness_report"]["status"],
        "L4_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(
        d["l4_readiness_summary"]["status"],
        "L4_READY_FOR_TECHNICAL_REVIEW"
    );
    assert_eq!(d["l4_readiness_report"]["not_external_integration"], true);
    assert_eq!(
        d["l4_readiness_report"]["does_not_make_banza_a_payment_service_provider"],
        true
    );
    assert!(d["security_assurance_report"].is_object());
    assert_eq!(
        d["security_assurance_report"]["status"],
        "ASSURANCE_READY_FOR_INTERNAL_REVIEW"
    );
    assert_eq!(
        d["security_assurance_summary"]["status"],
        "ASSURANCE_READY_FOR_INTERNAL_REVIEW"
    );
    assert_eq!(d["security_assurance_report"]["not_production"], true);
    assert_eq!(
        d["security_assurance_report"]["requires_external_audit_before_production_claims"],
        true
    );
    // Deep Assurance (BX2.1–BX2.4) is present, ready for PRE-AUDIT review, and carries its boundary flags.
    assert!(d["security_deep_assurance_report"].is_object());
    assert_eq!(
        d["security_deep_assurance_report"]["deep_assurance_status"],
        "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW"
    );
    assert_eq!(
        d["security_deep_assurance_summary"]["pre_audit_readiness"],
        "READY_FOR_PRE_AUDIT_REVIEW"
    );
    assert_eq!(
        d["security_deep_assurance_report"]["external_audit_not_performed"],
        true
    );
    assert_eq!(
        d["security_deep_assurance_report"]["production_trust_ceremony_not_executed"],
        true
    );
    assert_eq!(
        d["security_deep_assurance_report"]["does_not_make_banza_a_payment_service_provider"],
        true
    );
    // M2 protocol gate is present, implementation-ready, and never allows activation/certificates/PSP.
    assert!(d["m2_protocol_gate_report"].is_object());
    assert_eq!(
        d["m2_protocol_gate_report"]["status"],
        "M2_PROTOCOL_IMPLEMENTATION_READY"
    );
    assert_eq!(
        d["m2_protocol_gate_summary"]["protocol_production_prepared"],
        true
    );
    assert_eq!(
        d["m2_protocol_gate_report"]["operator_activation_allowed"],
        false
    );
    assert_eq!(
        d["m2_protocol_gate_report"]["production_certificates_allowed"],
        false
    );
    assert_eq!(
        d["m2_protocol_gate_report"]["does_not_make_banza_a_payment_service_provider"],
        true
    );
    // M2.1 root ceremony is present, valid 2-of-3, no forbidden material, and never authorises payments.
    assert!(d["m2_root_ceremony_report"].is_object());
    assert_eq!(
        d["m2_root_ceremony_report"]["status"],
        "M2_ROOT_CEREMONY_VALID"
    );
    assert_eq!(d["m2_root_ceremony_summary"]["threshold"], 2);
    assert_eq!(
        d["m2_root_ceremony_report"]["forbidden_private_key_material_detected"],
        false
    );
    assert_eq!(
        d["m2_root_ceremony_report"]["does_not_issue_payment_service_authorisation"],
        true
    );
    // M2.2 open governance: the package is valid, depends on no central human authority, and the bundle
    // itself never claims to authorise, certify or approve an operator.
    assert!(d["open_governance_report"].is_object());
    assert_eq!(
        d["open_governance_report"]["status"],
        "OPEN_GOVERNANCE_VALID"
    );
    assert_eq!(
        d["open_governance_summary"]["governance_model"],
        "OPEN_PROTOCOL_GOVERNANCE"
    );
    assert_eq!(
        d["open_governance_summary"]["ca_dependency_detected"],
        false
    );
    assert_eq!(
        d["open_governance_summary"]["human_operator_approval_detected"],
        false
    );
    assert_eq!(
        d["open_governance_summary"]["certificate_semantics_detected"],
        false
    );
    assert_eq!(
        d["open_governance_report"]["does_not_authorise_operators"],
        true
    );
    assert_eq!(
        d["open_governance_report"]["does_not_certify_operators"],
        true
    );
    assert_eq!(
        d["open_governance_report"]["operator_participation_permissionless"],
        true
    );
    assert!(d["open_governance_summary"]["disclaimer"]
        .as_str()
        .unwrap()
        .contains("Não é autorização de operador"));
    // The reference trust model: the protocol's trust rests on evidence — no central authority, no operator
    // approval step, no issued artifact standing in for verifiable evidence.
    assert!(d["reference_trust_model_report"].is_object());
    assert_eq!(
        d["reference_trust_model_report"]["status"],
        "REFERENCE_TRUST_MODEL_VALID"
    );
    assert_eq!(
        d["reference_trust_model_summary"]["central_authority_claim_detected"],
        false
    );
    assert_eq!(
        d["reference_trust_model_summary"]["invalid_trust_evidence_detected"],
        false
    );
    assert_eq!(
        d["reference_trust_model_summary"]["operator_approval_claim_detected"],
        false
    );
    assert_eq!(
        d["reference_trust_model_report"]["signed_metadata_based_trust"],
        true
    );
    assert!(d["reference_trust_model_summary"]["disclaimer"]
        .as_str()
        .unwrap()
        .contains("modelo activo"));
    assert_eq!(d["operator_manifest_validation"]["status"], "VALID");
    assert!(d["trace_verification"].is_null());
    assert!(d["missing_recommended"]
        .as_array()
        .unwrap()
        .iter()
        .any(|x| x == "trace_verification"));
    // a real demo bundle must self-validate (integrity + boundary flags)
    assert_eq!(
        validate_bundle(&d.to_string())["ok"],
        true,
        "errors: {:?}",
        validate_bundle(&d.to_string())["errors"]
    );
}

#[test]
fn demo_fault_is_blocked_by_simb() {
    assert_eq!(
        demo_bundle(&json!({ "scenario": "invalid_ledger" }))["readiness"],
        "BLOCKED_BY_SIMB"
    );
}
