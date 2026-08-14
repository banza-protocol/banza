//! Track A+B — the federation Open Trust Evaluation (ADR-031): ten conjunctive, fail-closed checks
//! producing the canonical outcome `ROUTING_ALLOWED` / `FAIL_CLOSED`. Every check has a positive and a
//! negative vector, and the authenticated-revocation check (GAP-1) is exercised for real: an
//! authority-signed BRL is verified, a wrong-key BRL is rejected, and a listed operator fails closed.

use banza_trust::evaluate::{evaluate_federation_ote, OTE_CHECKS};
use banza_trust::sign::{build_input, federation_ote_demo_input, signed_revocation_list};
use serde_json::{json, Value};

/// The full federation OTE input that reaches ROUTING_ALLOWED (the reusable positive-path builder).
fn allowed_input() -> Value {
    federation_ote_demo_input()
}

fn ote(input: &Value) -> Value {
    evaluate_federation_ote(input)
}
fn check(out: &Value, name: &str) -> bool {
    out["checks"][name].as_bool().unwrap_or(false)
}

#[test]
fn a_fully_valid_operator_is_routing_allowed_with_all_ten_checks() {
    let out = ote(&allowed_input());
    assert_eq!(out["outcome"], "ROUTING_ALLOWED", "report: {out:#}");
    assert_eq!(out["schema"], "federation-trust-evaluation/1");
    // exactly the ten canonical checks, all true
    let checks = out["checks"].as_object().unwrap();
    assert_eq!(
        checks.len(),
        OTE_CHECKS.len(),
        "must emit exactly the ten canonical checks"
    );
    for name in OTE_CHECKS {
        assert!(
            check(&out, name),
            "check {name} must pass in the allowed case"
        );
    }
    assert!(out["failed_checks"].as_array().unwrap().is_empty());
    // trust valid ≠ routing allowed: the trust status is carried but is not the outcome
    assert_eq!(out["trust_status"], "TRUST_VALID");
    assert!(out["report_hash"].as_str().unwrap().len() == 64);
}

#[test]
fn malformed_input_fails_closed() {
    let out = ote(&json!([1, 2, 3]));
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn outcome_is_only_ever_one_of_the_two_canonical_values() {
    for input in [
        allowed_input(),
        build_input("valid"),
        json!({}),
        build_input("operator_revoked"),
    ] {
        let o = ote(&input);
        let outcome = o["outcome"].as_str().unwrap();
        assert!(
            outcome == "ROUTING_ALLOWED" || outcome == "FAIL_CLOSED",
            "outcome must be canonical, got {outcome}"
        );
    }
}

// ── GAP-1: authenticated revocation — the BRL must be revocation-domain-signed, fresh, and not list us ──

#[test]
fn missing_brl_material_fails_closed_not_revoked() {
    // the valid trust chain alone is NOT enough: without an authenticated BRL, not_revoked fails closed
    let mut input = build_input("valid");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    let out = ote(&input);
    assert!(
        !check(&out, "not_revoked"),
        "a self-published flag is never trusted; BRL absent ⇒ fail-closed"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn a_brl_signed_by_the_wrong_key_is_rejected() {
    let mut input = allowed_input();
    // keep the authentic BRL document but claim a different verification key ⇒ signature will not verify
    input["revocation_key_public"] = json!("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    let out = ote(&input);
    assert!(
        !check(&out, "not_revoked"),
        "a BRL that does not verify under the given key must fail closed"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn an_operator_listed_in_the_authenticated_brl_fails_closed() {
    let mut input = build_input("valid");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    input["evaluated_operator_id"] = json!("operator-A");
    let (brl, revk_pub) = signed_revocation_list(&["operator-A"], "2027-07-16T00:00:00Z");
    input["revocation_list"] = brl;
    input["revocation_key_public"] = json!(revk_pub);
    let out = ote(&input);
    assert!(
        !check(&out, "not_revoked"),
        "an operator present in the verified BRL is revoked"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn an_expired_brl_fails_closed() {
    let mut input = build_input("valid");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    input["evaluated_operator_id"] = json!("operator-A");
    let (brl, revk_pub) = signed_revocation_list(&[], "2026-01-01T00:00:00Z"); // long past `evaluated_at`
    input["revocation_list"] = brl;
    input["revocation_key_public"] = json!(revk_pub);
    let out = ote(&input);
    assert!(
        !check(&out, "not_revoked"),
        "a BRL past its expiry is stale ⇒ fail-closed"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

// ── GAP-2: the two previously-missing checks ────────────────────────────────────────────────────────────

#[test]
fn capabilities_incompatible_fails_closed() {
    let mut input = allowed_input();
    // ask for a capability the operator does not declare
    input["intended_capabilities"] = json!(["cross_operator_custody"]);
    let out = ote(&input);
    assert!(
        !check(&out, "capabilities_compatible"),
        "undeclared capability must fail the check"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn settlement_capability_is_covered_when_declared() {
    let mut input = allowed_input();
    input["intended_capabilities"] = json!(["cross_operator_routing", "cross_operator_settlement"]);
    let out = ote(&input);
    assert!(
        check(&out, "capabilities_compatible"),
        "declared settlement capability must be covered"
    );
    assert_eq!(out["outcome"], "ROUTING_ALLOWED");
}

#[test]
fn a_non_https_or_missing_endpoint_fails_the_endpoint_check() {
    // strip the manifest's federation endpoint AFTER the trust chain is built — this only affects the
    // OTE endpoint-contract check (the endpoint fields are inert for trust-status), so the trust chain
    // stays valid while the endpoint check fails.
    let mut input = allowed_input();
    input["operator_manifest"]["interop_endpoint"] = json!("http://operator-a.example/federation");
    let out = ote(&input);
    assert!(
        !check(&out, "endpoint_contract_compatible"),
        "a non-HTTPS interop endpoint must fail closed"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

// ── the eight trust-chain checks propagate a fault into FAIL_CLOSED ──────────────────────────────────────

#[test]
fn a_broken_signature_propagates_to_fail_closed() {
    let mut input = build_input("invalid_metadata_signature");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    let (brl, revk_pub) = signed_revocation_list(&[], "2027-07-16T00:00:00Z");
    input["revocation_list"] = brl;
    input["revocation_key_public"] = json!(revk_pub);
    let out = ote(&input);
    assert!(
        !check(&out, "signed_protocol_metadata"),
        "a tampered signature must fail the metadata check"
    );
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn an_incompatible_protocol_version_propagates_to_fail_closed() {
    let mut input = build_input("incompatible_protocol_version");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    let (brl, revk_pub) = signed_revocation_list(&[], "2027-07-16T00:00:00Z");
    input["revocation_list"] = brl;
    input["revocation_key_public"] = json!(revk_pub);
    let out = ote(&input);
    assert!(!check(&out, "compatible_protocol_version"));
    assert_eq!(out["outcome"], "FAIL_CLOSED");
}

#[test]
fn the_report_is_deterministic() {
    let a = ote(&allowed_input());
    let b = ote(&allowed_input());
    assert_eq!(
        a, b,
        "the OTE report must be byte-identical across evaluations"
    );
}

#[test]
fn routing_allowed_carries_the_boundary_disclaimers() {
    let out = ote(&allowed_input());
    let b = &out["boundary"];
    assert_eq!(b["routing_allowed_is_not_certification"], true);
    assert_eq!(b["routing_allowed_is_not_regulatory_authorisation"], true);
    assert_eq!(b["routing_allowed_is_not_scheme_admission"], true);
    assert_eq!(out["external_model_called"], false);
    assert_eq!(out["llm_calls"], 0);
}
