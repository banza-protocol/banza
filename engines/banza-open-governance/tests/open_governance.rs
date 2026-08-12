//! banza-open-governance (M2.2) — the open protocol governance validator.
//!
//! Every status is decided in Rust. These tests pin the fixture→status contract, the four structural
//! detections, fail-closed behaviour on malformed input, and the boundary flags: no operator is created,
//! accepted, approved, certified or activated; no certificate is emitted; no licence is issued; no funds
//! move; no network; `llm_calls = 0`.

use banza_open_governance::{
    demo_fixtures, schema, tool_version, validate_open_governance, STATUS_VALUES,
};
use serde_json::{json, Value};

fn fixture(key: &str) -> Value {
    let f = demo_fixtures();
    f["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["key"] == key)
        .unwrap_or_else(|| panic!("fixture {key} not found"))
        .clone()
}

fn status_of(key: &str) -> String {
    let f = fixture(key);
    validate_open_governance(&f["input"])["status"]
        .as_str()
        .unwrap()
        .to_string()
}

// ── fixture → status contract (every fixture matches its declared `expected`) ──

#[test]
fn every_fixture_matches_its_expected_status() {
    let f = demo_fixtures();
    for fx in f["fixtures"].as_array().unwrap() {
        let key = fx["key"].as_str().unwrap();
        let expected = fx["expected"].as_str().unwrap();
        let got = validate_open_governance(&fx["input"])["status"]
            .as_str()
            .unwrap()
            .to_string();
        assert_eq!(got, expected, "fixture {key}");
    }
}

#[test]
fn nine_fixtures_cover_the_documented_statuses() {
    let f = demo_fixtures();
    assert_eq!(f["fixtures"].as_array().unwrap().len(), 9);
    assert_eq!(
        f["note"],
        "TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL"
    );
}

#[test]
fn valid_open_governance_is_valid() {
    assert_eq!(status_of("valid_open_governance"), "OPEN_GOVERNANCE_VALID");
}

#[test]
fn ca_dependency_is_blocked() {
    assert_eq!(
        status_of("ca_dependency"),
        "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY"
    );
}

#[test]
fn human_operator_approval_is_blocked() {
    assert_eq!(
        status_of("human_operator_approval"),
        "OPEN_GOVERNANCE_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL"
    );
}

#[test]
fn certificate_semantics_is_blocked() {
    assert_eq!(
        status_of("certificate_semantics"),
        "OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS"
    );
}

#[test]
fn missing_conformance_automation_is_blocked() {
    assert_eq!(
        status_of("missing_conformance_automation"),
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION"
    );
}

#[test]
fn missing_operator_self_publication_is_blocked() {
    assert_eq!(
        status_of("missing_operator_self_publication"),
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION"
    );
}

#[test]
fn missing_succession_model_is_blocked() {
    assert_eq!(
        status_of("missing_succession_model"),
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_SUCCESSION_MODEL"
    );
}

#[test]
fn regulatory_boundary_fail_is_invalid() {
    assert_eq!(
        status_of("regulatory_boundary_fail"),
        "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY"
    );
}

#[test]
fn permissioned_network_claim_is_invalid() {
    assert_eq!(
        status_of("permissioned_network_claim"),
        "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM"
    );
}

// ── the four structural detections ─────────────────────────────────────────────

#[test]
fn detections_are_off_on_the_valid_package() {
    let r = validate_open_governance(&fixture("valid_open_governance")["input"]);
    assert_eq!(r["ca_dependency_detected"], json!(false));
    assert_eq!(r["human_operator_approval_detected"], json!(false));
    assert_eq!(r["certificate_semantics_detected"], json!(false));
    assert_eq!(r["permissioned_network_claim_detected"], json!(false));
}

#[test]
fn each_fixture_lights_its_own_detection() {
    let ca = validate_open_governance(&fixture("ca_dependency")["input"]);
    assert_eq!(ca["ca_dependency_detected"], json!(true));

    let h = validate_open_governance(&fixture("human_operator_approval")["input"]);
    assert_eq!(h["human_operator_approval_detected"], json!(true));

    let c = validate_open_governance(&fixture("certificate_semantics")["input"]);
    assert_eq!(c["certificate_semantics_detected"], json!(true));

    let p = validate_open_governance(&fixture("permissioned_network_claim")["input"]);
    assert_eq!(p["permissioned_network_claim_detected"], json!(true));
}

/// The deprecation inventory names the removed terms on purpose — naming them there must NOT count as a
/// dependency. This is what lets the deprecation record coexist with a VALID package.
#[test]
fn deprecation_inventory_naming_old_terms_is_not_a_ca_dependency() {
    let input = fixture("valid_open_governance")["input"].clone();
    let inv = &input["deprecated_ca_inventory"]["entries"];
    let terms: Vec<&str> = inv
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|e| e["term"].as_str())
        .collect();
    assert!(terms.contains(&"BANZA CA"), "inventory names the old term");
    assert!(terms.contains(&"operador certificado"));
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_VALID");
    assert_eq!(r["ca_dependency_detected"], json!(false));
    assert_eq!(r["certificate_semantics_detected"], json!(false));
}

/// An inventory entry that is still *active* is a real dependency — retiring a term means marking it so.
#[test]
fn an_active_inventory_entry_counts_as_a_ca_dependency() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["deprecated_ca_inventory"]["entries"]
        .as_array_mut()
        .unwrap()
        .push(json!({ "term": "BANZA CA", "status": "active", "replacement": null }));
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY");
    assert_eq!(r["ca_dependency_detected"], json!(true));
}

/// The word-boundary scan must not fire on unrelated words that merely contain a term as a substring.
#[test]
fn term_scan_is_word_bounded_and_does_not_false_positive() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["architecture_summary"]["note"] =
        json!("As capabilities do operador e o cadastro público são verificáveis.");
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_VALID");
    assert_eq!(r["ca_dependency_detected"], json!(false));
}

/// A CA phrase in prose (outside the inventory) is an active reference, not just a field-name problem.
#[test]
fn a_ca_phrase_in_active_prose_is_detected() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["governance_model_summary"]["note"] =
        json!("A BANZA CA revê e aceita cada operador antes da entrada.");
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY");
}

// ── precedence ─────────────────────────────────────────────────────────────────

#[test]
fn regulatory_boundary_outranks_every_other_finding() {
    let mut input = fixture("ca_dependency")["input"].clone();
    input["boundary_confirmation"]["banza_is_psp"] = json!(true);
    assert_eq!(
        validate_open_governance(&input)["status"],
        "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY"
    );
}

#[test]
fn permissioned_claim_outranks_ca_dependency() {
    let mut input = fixture("ca_dependency")["input"].clone();
    input["architecture_summary"]["permissioned_network"] = json!(true);
    assert_eq!(
        validate_open_governance(&input)["status"],
        "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM"
    );
}

#[test]
fn incomplete_when_a_non_gated_artifact_is_missing() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input.as_object_mut().unwrap().remove("trust_root_summary");
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_INCOMPLETE");
    assert!(r["missing_artifacts"]
        .as_array()
        .unwrap()
        .iter()
        .any(|m| m == "trust_root_summary"));
}

// ── fail-closed ────────────────────────────────────────────────────────────────

#[test]
fn malformed_input_fails_closed_never_valid() {
    for bad in [
        json!(null),
        json!("string"),
        json!(42),
        json!([1, 2, 3]),
        json!(true),
    ] {
        let r = validate_open_governance(&bad);
        assert_eq!(
            r["status"], "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY",
            "malformed input must fail closed"
        );
        assert_ne!(r["status"], "OPEN_GOVERNANCE_VALID");
    }
}

#[test]
fn empty_object_is_never_valid() {
    let r = validate_open_governance(&json!({}));
    assert_ne!(r["status"], "OPEN_GOVERNANCE_VALID");
}

// ── boundary flags + determinism ───────────────────────────────────────────────

#[test]
fn boundary_flags_hold_on_every_fixture() {
    let f = demo_fixtures();
    for fx in f["fixtures"].as_array().unwrap() {
        let r = validate_open_governance(&fx["input"]);
        let key = fx["key"].as_str().unwrap();
        assert_eq!(r["open_financial_protocol"], json!(true), "{key}");
        assert_eq!(r["central_operator_authority"], json!(false), "{key}");
        assert_eq!(r["human_operator_approval_required"], json!(false), "{key}");
        assert_eq!(
            r["operator_participation_permissionless"],
            json!(true),
            "{key}"
        );
        assert_eq!(r["conformance_is_machine_verifiable"], json!(true), "{key}");
        assert_eq!(
            r["humans_maintain_protocol_not_operators"],
            json!(true),
            "{key}"
        );
        assert_eq!(r["not_a_psp"], json!(true), "{key}");
        assert_eq!(r["does_not_authorise_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_certify_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_accept_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_approve_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_issue_payment_licence"], json!(true), "{key}");
        assert_eq!(r["does_not_move_funds"], json!(true), "{key}");
        assert_eq!(r["operator_activation_allowed"], json!(false), "{key}");
        assert_eq!(r["production_certificates_allowed"], json!(false), "{key}");
        assert_eq!(r["llm_calls"], json!(0), "{key}");
        assert_eq!(r["external_model_called"], json!(false), "{key}");
        assert_eq!(r["test_only"], json!(true), "{key}");
        assert_eq!(r["governance_model"], "OPEN_PROTOCOL_GOVERNANCE", "{key}");
    }
}

#[test]
fn fail_closed_report_also_carries_the_boundary_flags() {
    let r = validate_open_governance(&json!("nonsense"));
    assert_eq!(r["open_financial_protocol"], json!(true));
    assert_eq!(r["does_not_authorise_operators"], json!(true));
    assert_eq!(r["production_certificates_allowed"], json!(false));
    assert_eq!(r["llm_calls"], json!(0));
    assert_eq!(r["external_model_called"], json!(false));
}

#[test]
fn report_is_deterministic_and_hashed() {
    let input = fixture("valid_open_governance")["input"].clone();
    let a = validate_open_governance(&input);
    let b = validate_open_governance(&input);
    assert_eq!(a, b, "same input → identical report");
    let h = a["open_governance_report_hash"].as_str().unwrap();
    assert_eq!(h.len(), 64, "sha-256 hex");
    assert!(a["report_id"].as_str().unwrap().starts_with("open-gov-"));

    // A different package must hash differently.
    let other = validate_open_governance(&fixture("ca_dependency")["input"]);
    assert_ne!(h, other["open_governance_report_hash"].as_str().unwrap());
}

#[test]
fn blocked_fixtures_report_blocked_items_and_next_steps() {
    for key in [
        "ca_dependency",
        "human_operator_approval",
        "certificate_semantics",
        "missing_conformance_automation",
        "missing_operator_self_publication",
        "missing_succession_model",
    ] {
        let r = validate_open_governance(&fixture(key)["input"]);
        assert!(
            !r["blocked_items"].as_array().unwrap().is_empty(),
            "{key} must explain what is blocked"
        );
        assert!(!r["next_steps"].as_array().unwrap().is_empty(), "{key}");
    }
}

// ── schema / tool version ──────────────────────────────────────────────────────

#[test]
fn schema_lists_every_status_and_the_role_boundary() {
    let s = schema();
    let listed: Vec<&str> = s["status_values"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert_eq!(listed.len(), STATUS_VALUES.len());
    for st in STATUS_VALUES {
        assert!(listed.contains(st), "{st} missing from schema");
    }
    let forbidden: Vec<&str> = s["forbidden_roles"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    for role in [
        "Operator Approver",
        "Operator Certifier",
        "Payment Service Authoriser",
        "Regulatory Approver",
        "Human Gatekeeper",
    ] {
        assert!(forbidden.contains(&role), "{role} must be forbidden");
    }
    assert!(s["network"].as_str().unwrap().contains("local"));
}

#[test]
fn tool_version_carries_the_boundary() {
    let t = tool_version();
    assert_eq!(t["tool"], "banza-open-governance");
    assert_eq!(t["test_only"], json!(true));
    let b = t["boundary"].as_str().unwrap();
    assert!(b.contains("Não é autorização de operador"));
    assert!(b.contains("não é certificação"));
}

/// The governance statement itself must never read as BANZA authorising anyone.
#[test]
fn protocol_stance_states_the_open_protocol_decision() {
    let r = validate_open_governance(&fixture("valid_open_governance")["input"]);
    let stance = r["protocol_stance"].as_str().unwrap();
    assert!(stance.contains("protocolo financeiro aberto"));
    assert!(stance.contains("não depende de uma autoridade humana central"));
    assert!(stance.contains("evidência verificável de conformidade"));
}

// ── Regressions: fail-opens found by adversarial review (all reproduced before the fix) ─────────────

/// The scan must see bare strings that are DIRECT array elements. `roles[]`, `layers[]` and `fields[]` are
/// the schema's own idiomatic shape — and `roles[]` is exactly where a forbidden role would be declared.
/// Before the fix, walk() recursed into arrays but never invoked the callback on their elements, so every
/// phrase scan was blind to them and this package returned VALID.
#[test]
fn a_forbidden_role_declared_in_an_array_is_detected() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["protocol_maintainers_summary"]["roles"] = json!([
        "Human Gatekeeper",
        "Operator Approver",
        "Certificate Authority"
    ]);
    let r = validate_open_governance(&input);
    assert_ne!(
        r["status"], "OPEN_GOVERNANCE_VALID",
        "a gatekeeper role must never be VALID"
    );
    assert_eq!(r["human_operator_approval_detected"], json!(true));
}

#[test]
fn a_ca_phrase_in_an_array_element_is_detected() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["architecture_summary"]["layers"] = json!([
        "protocol",
        "BANZA CA — a autoridade central que aceita e aprova operadores",
        "operators"
    ]);
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY");
    assert_eq!(r["ca_dependency_detected"], json!(true));
}

/// The deprecation exemption applies to the TOP-LEVEL inventory only. Keyed at every depth, it would let
/// anyone hide live architecture under `architecture_summary.deprecated_ca_inventory`.
#[test]
fn a_nested_deprecated_inventory_key_does_not_exempt_a_subtree() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["architecture_summary"]["deprecated_ca_inventory"] = json!({
        "ca_role": "A BANZA CA revê, aceita e aprova cada operador antes da entrada em produção",
        "human_operator_approval_required": true,
        "certificate_id": "cert-real-0001",
        "permissioned_network": true
    });
    let r = validate_open_governance(&input);
    assert_ne!(
        r["status"], "OPEN_GOVERNANCE_VALID",
        "nesting the key must not buy exemption"
    );
    assert_eq!(r["ca_dependency_detected"], json!(true));
}

/// `present()` only proves the key holds an object — `{}` passes it. Empty summaries must not reach VALID.
#[test]
fn empty_summary_objects_are_incomplete_not_valid() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    for k in [
        "trust_root_summary",
        "revocation_model_summary",
        "protocol_maintainers_summary",
        "governance_model_summary",
        "architecture_summary",
    ] {
        input[k] = json!({});
    }
    let r = validate_open_governance(&input);
    assert_eq!(r["status"], "OPEN_GOVERNANCE_INCOMPLETE");
    assert!(
        !r["blocked_items"].as_array().unwrap().is_empty(),
        "must say which artifacts lack their documented facts"
    );
}

/// A trust root that does not disclaim authority over operators is not a trust root under M2.2.
#[test]
fn a_trust_root_that_claims_operator_authority_is_not_valid() {
    let mut input = fixture("valid_open_governance")["input"].clone();
    input["trust_root_summary"]["does_not_authorise_operators"] = json!(false);
    assert_ne!(
        validate_open_governance(&input)["status"],
        "OPEN_GOVERNANCE_VALID"
    );
}
