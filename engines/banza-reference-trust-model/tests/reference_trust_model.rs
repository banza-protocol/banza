//! banza-reference-trust-model — the reference trust model validator.
//!
//! Every status is decided in Rust. These tests pin the fixture→status contract, the four structural
//! detections, the federation checks, fail-closed behaviour, and the boundary flags.
//!
//! They also carry regressions for each fail-open an adversarial review demonstrated against earlier
//! drafts of this engine family: bare strings inside arrays, keys used to hide a subtree from the scan,
//! empty summary objects reaching VALID, and flags that assert with a non-boolean value.

use banza_reference_trust_model::{
    demo_fixtures, schema, tool_version, validate_reference_trust_model, FEDERATION_CHECKS,
    STATUS_VALUES,
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
    validate_reference_trust_model(&fixture(key)["input"])["status"]
        .as_str()
        .unwrap()
        .to_string()
}

// ── fixture → status contract ─────────────────────────────────────────────────

#[test]
fn every_fixture_matches_its_expected_status() {
    let f = demo_fixtures();
    for fx in f["fixtures"].as_array().unwrap() {
        let key = fx["key"].as_str().unwrap();
        let expected = fx["expected"].as_str().unwrap();
        let got = validate_reference_trust_model(&fx["input"])["status"]
            .as_str()
            .unwrap()
            .to_string();
        assert_eq!(got, expected, "fixture {key}");
    }
}

#[test]
fn eleven_fixtures_cover_every_documented_status() {
    let f = demo_fixtures();
    let fixtures = f["fixtures"].as_array().unwrap();
    assert_eq!(fixtures.len(), 11);
    assert_eq!(
        f["note"],
        "TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL"
    );
    // Every status the engine can emit is exercised by a fixture.
    for st in STATUS_VALUES {
        assert!(
            fixtures.iter().any(|fx| fx["expected"] == *st),
            "no fixture covers {st}"
        );
    }
}

#[test]
fn valid_reference_trust_model_is_valid() {
    assert_eq!(
        status_of("valid_reference_trust_model"),
        "REFERENCE_TRUST_MODEL_VALID"
    );
}

#[test]
fn each_blocked_fixture_maps_to_its_own_status() {
    for (key, expected) in [
        (
            "central_authority_claim",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM",
        ),
        (
            "operator_approval_claim",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM",
        ),
        (
            "invalid_trust_evidence",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE",
        ),
        (
            "missing_signed_metadata",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_SIGNED_METADATA",
        ),
        (
            "missing_conformance_evidence",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_CONFORMANCE_EVIDENCE",
        ),
        (
            "missing_public_registry",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_PUBLIC_REGISTRY",
        ),
        (
            "missing_revocation_fail_closed",
            "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED",
        ),
        (
            "regulatory_boundary_fail",
            "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY",
        ),
        (
            "permissioned_network_claim",
            "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM",
        ),
        ("incomplete_reference", "REFERENCE_TRUST_MODEL_INCOMPLETE"),
    ] {
        assert_eq!(status_of(key), expected, "fixture {key}");
    }
}

// ── the four detections ───────────────────────────────────────────────────────

#[test]
fn detections_are_off_on_the_valid_model() {
    let r = validate_reference_trust_model(&fixture("valid_reference_trust_model")["input"]);
    assert_eq!(r["central_authority_claim_detected"], json!(false));
    assert_eq!(r["operator_approval_claim_detected"], json!(false));
    assert_eq!(r["invalid_trust_evidence_detected"], json!(false));
    assert_eq!(r["permissioned_network_claim_detected"], json!(false));
}

#[test]
fn each_fixture_lights_its_own_detection() {
    assert_eq!(
        validate_reference_trust_model(&fixture("central_authority_claim")["input"])
            ["central_authority_claim_detected"],
        json!(true)
    );
    assert_eq!(
        validate_reference_trust_model(&fixture("operator_approval_claim")["input"])
            ["operator_approval_claim_detected"],
        json!(true)
    );
    assert_eq!(
        validate_reference_trust_model(&fixture("invalid_trust_evidence")["input"])
            ["invalid_trust_evidence_detected"],
        json!(true)
    );
    assert_eq!(
        validate_reference_trust_model(&fixture("permissioned_network_claim")["input"])
            ["permissioned_network_claim_detected"],
        json!(true)
    );
}

/// Trust must rest on evidence, not on an issued artifact. A federation check list naming a certificate is
/// the artifact standing in for the evidence.
#[test]
fn an_issued_artifact_in_the_federation_check_list_is_invalid_trust_evidence() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["federation_trust_model_summary"]["checks"] = json!([
        "valid_operator_manifest",
        "valid certificate",
        "not_revoked"
    ]);
    let r = validate_reference_trust_model(&input);
    assert_eq!(
        r["status"],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE"
    );
    assert_eq!(r["invalid_trust_evidence_detected"], json!(true));
}

/// Regression: bare strings that are DIRECT array elements must be scanned. `checks[]` is exactly where a
/// claim would hide, and an earlier draft's walk() never invoked its callback on array elements.
#[test]
fn a_claim_in_a_bare_array_element_is_detected() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["reference_summary"]["sections"] = json!([
        "confianca",
        "o encaminhamento exige um certificado válido de cada operador",
        "federacao"
    ]);
    let r = validate_reference_trust_model(&input);
    assert_ne!(r["status"], "REFERENCE_TRUST_MODEL_VALID");
    assert_eq!(r["invalid_trust_evidence_detected"], json!(true));
}

/// Regression: no key exempts a subtree. The engine scans everything, at every depth — an earlier draft
/// let a claim hide simply by nesting it under a key the scan skipped.
#[test]
fn no_key_can_hide_a_subtree_from_the_scan() {
    for key in [
        "deprecated_terms_inventory",
        "adr_supersession_summary",
        "notes",
        "appendix",
    ] {
        let mut input = fixture("valid_reference_trust_model")["input"].clone();
        input["federation_trust_model_summary"][key] = json!({
            "ca_role": "uma autoridade central aprova cada operador antes do encaminhamento",
            "human_approval_required": true,
            "certificate_id": "cert-0001"
        });
        let r = validate_reference_trust_model(&input);
        assert_ne!(
            r["status"], "REFERENCE_TRUST_MODEL_VALID",
            "nesting under `{key}` must not hide the claim"
        );
    }
}

/// Regression: a flag must assert with ANY meaningful value, not only a literal `true`. Demanding a bool
/// let `"human_approval_required": "yes"` pass unseen.
#[test]
fn a_flag_asserted_with_a_non_boolean_value_is_detected() {
    for val in [json!("yes"), json!("required"), json!({ "step": "review" })] {
        let mut input = fixture("valid_reference_trust_model")["input"].clone();
        input["federation_trust_model_summary"]["human_approval_required"] = val.clone();
        let r = validate_reference_trust_model(&input);
        assert_eq!(
            r["status"], "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM",
            "flag asserted as {val} must be detected"
        );
    }
}

/// …but a flag explicitly denied (`false`) or empty is not an assertion.
#[test]
fn a_flag_set_false_is_not_an_assertion() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["federation_trust_model_summary"]["human_approval_required"] = json!(false);
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_VALID"
    );
}

// ── federation checks ─────────────────────────────────────────────────────────

#[test]
fn all_ten_federation_checks_must_be_documented() {
    assert_eq!(FEDERATION_CHECKS.len(), 10);
    for drop in FEDERATION_CHECKS {
        let mut input = fixture("valid_reference_trust_model")["input"].clone();
        let kept: Vec<&str> = FEDERATION_CHECKS
            .iter()
            .filter(|c| c != &drop)
            .copied()
            .collect();
        input["federation_trust_model_summary"]["checks"] = json!(kept);
        assert_ne!(
            validate_reference_trust_model(&input)["status"],
            "REFERENCE_TRUST_MODEL_VALID",
            "dropping `{drop}` must not stay VALID"
        );
    }
}

#[test]
fn dropping_fail_closed_blocks_on_revocation() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    let kept: Vec<&str> = FEDERATION_CHECKS
        .iter()
        .filter(|c| **c != "fail_closed_on_missing_or_invalid")
        .copied()
        .collect();
    input["federation_trust_model_summary"]["checks"] = json!(kept);
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED"
    );
}

// ── registry / revocation / legacy-route semantics ────────────────────────────

#[test]
fn a_registry_described_as_an_approval_list_is_invalid() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["public_protocol_registry_summary"]["registry_is_index_not_approval_list"] = json!(false);
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM"
    );
}

#[test]
fn revocation_presented_as_regulatory_blocks() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["revocation_model_summary"]["security_signal_not_regulatory"] = json!(false);
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED"
    );
}

/// Regression: `canonical_route_documented` is reported in the summary, so it must also be gated —
/// otherwise the report could contradict a VALID status.
#[test]
fn the_legacy_route_must_be_marked_and_point_at_the_canonical_route() {
    for field in ["marked_legacy_compatibility", "canonical_route_documented"] {
        let mut input = fixture("valid_reference_trust_model")["input"].clone();
        input["legacy_certificates_route_summary"][field] = json!(false);
        assert_eq!(
            validate_reference_trust_model(&input)["status"],
            "REFERENCE_TRUST_MODEL_INCOMPLETE",
            "`{field}` must be gated, not merely reported"
        );
    }
}

#[test]
fn the_legacy_route_must_never_flip_production_certificates() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["legacy_certificates_route_summary"]["production_certificates"] = json!(true);
    assert_ne!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_VALID"
    );
}

// ── precedence ────────────────────────────────────────────────────────────────

#[test]
fn regulatory_boundary_outranks_every_other_finding() {
    let mut input = fixture("central_authority_claim")["input"].clone();
    input["boundary_confirmation"]["banza_is_psp"] = json!(true);
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY"
    );
}

#[test]
fn a_central_authority_claim_outranks_invalid_evidence() {
    let mut input = fixture("invalid_trust_evidence")["input"].clone();
    input["reference_summary"]["ca_role"] = json!("uma autoridade central aprova operadores");
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM"
    );
}

// ── fail-closed ───────────────────────────────────────────────────────────────

#[test]
fn malformed_input_fails_closed_never_valid() {
    for bad in [
        json!(null),
        json!("string"),
        json!(42),
        json!([1, 2]),
        json!(true),
    ] {
        let r = validate_reference_trust_model(&bad);
        assert_eq!(
            r["status"],
            "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY"
        );
    }
}

#[test]
fn empty_object_is_never_valid() {
    assert_ne!(
        validate_reference_trust_model(&json!({}))["status"],
        "REFERENCE_TRUST_MODEL_VALID"
    );
}

/// Regression: `present()` accepts `{}` — empty summaries must not reach VALID.
#[test]
fn empty_summary_objects_are_not_valid() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    for k in [
        "signed_protocol_metadata_summary",
        "conformance_evidence_summary",
        "public_protocol_registry_summary",
        "revocation_model_summary",
        "reference_summary",
    ] {
        input[k] = json!({});
    }
    let r = validate_reference_trust_model(&input);
    assert_ne!(r["status"], "REFERENCE_TRUST_MODEL_VALID");
    assert!(!r["blocked_items"].as_array().unwrap().is_empty());
}

/// The word-boundary scan must not fire on unrelated words containing a term as a substring.
#[test]
fn term_scan_is_word_bounded() {
    let mut input = fixture("valid_reference_trust_model")["input"].clone();
    input["reference_summary"]["note"] =
        json!("As capabilities do operador e o cadastro público são verificáveis.");
    assert_eq!(
        validate_reference_trust_model(&input)["status"],
        "REFERENCE_TRUST_MODEL_VALID"
    );
}

// ── boundary flags + determinism ──────────────────────────────────────────────

#[test]
fn boundary_flags_hold_on_every_fixture() {
    let f = demo_fixtures();
    for fx in f["fixtures"].as_array().unwrap() {
        let r = validate_reference_trust_model(&fx["input"]);
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
        assert_eq!(r["signed_metadata_based_trust"], json!(true), "{key}");
        assert_eq!(r["not_a_psp"], json!(true), "{key}");
        assert_eq!(r["not_operator_certificate"], json!(true), "{key}");
        assert_eq!(r["not_licence"], json!(true), "{key}");
        assert_eq!(r["not_regulatory_approval"], json!(true), "{key}");
        assert_eq!(r["does_not_authorise_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_certify_operators"], json!(true), "{key}");
        assert_eq!(r["does_not_issue_payment_licence"], json!(true), "{key}");
        assert_eq!(r["does_not_move_funds"], json!(true), "{key}");
        assert_eq!(r["production_certificates_allowed"], json!(false), "{key}");
        assert_eq!(r["llm_calls"], json!(0), "{key}");
        assert_eq!(r["external_model_called"], json!(false), "{key}");
    }
}

#[test]
fn fail_closed_report_also_carries_the_boundary_flags() {
    let r = validate_reference_trust_model(&json!("nonsense"));
    assert_eq!(r["open_financial_protocol"], json!(true));
    assert_eq!(r["signed_metadata_based_trust"], json!(true));
    assert_eq!(r["does_not_authorise_operators"], json!(true));
    assert_eq!(r["llm_calls"], json!(0));
}

#[test]
fn report_is_deterministic_and_hashed() {
    let input = fixture("valid_reference_trust_model")["input"].clone();
    let a = validate_reference_trust_model(&input);
    let b = validate_reference_trust_model(&input);
    assert_eq!(a, b);
    let h = a["reference_trust_model_report_hash"].as_str().unwrap();
    assert_eq!(h.len(), 64);
    assert!(a["report_id"].as_str().unwrap().starts_with("ref-trust-"));
    let other = validate_reference_trust_model(&fixture("central_authority_claim")["input"]);
    assert_ne!(
        h,
        other["reference_trust_model_report_hash"].as_str().unwrap()
    );
}

// ── the report describes the ACTIVE model only ────────────────────────────────

/// The report is a product surface: it must state the active model, never narrate a transition.
#[test]
fn the_report_describes_the_active_model_and_narrates_no_transition() {
    let r = validate_reference_trust_model(&fixture("valid_reference_trust_model")["input"]);
    let text = r.to_string().to_lowercase();
    for banned in [
        "superseded",
        "supersession",
        "deprecated",
        "deprecation",
        "histórico",
        "historical",
        "foi removido",
        "foi removida",
        "foi substituído",
        "modelo antigo",
        "old model",
        "banza ca",
    ] {
        assert!(
            !text.contains(banned),
            "the report must not narrate a transition — found `{banned}`"
        );
    }
    assert!(r["active_trust_model_summary"].is_object());
    let stance = r["protocol_stance"].as_str().unwrap();
    assert!(stance.contains("protocolo financeiro aberto"));
    assert!(stance.contains("signed protocol metadata"));
    assert!(stance.contains("evidência verificável de conformidade"));
}

// ── schema / tool version ─────────────────────────────────────────────────────

#[test]
fn schema_lists_every_status_and_the_checks() {
    let s = schema();
    let listed: Vec<&str> = s["status_values"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert_eq!(listed.len(), STATUS_VALUES.len());
    for st in STATUS_VALUES {
        assert!(listed.contains(st), "{st} missing");
    }
    assert_eq!(s["federation_checks"].as_array().unwrap().len(), 10);
    assert!(s["network"].as_str().unwrap().contains("local"));
    assert!(s["active_trust_model"]
        .as_str()
        .unwrap()
        .contains("signed protocol metadata"));
}

#[test]
fn tool_version_carries_the_boundary() {
    let t = tool_version();
    assert_eq!(t["tool"], "banza-reference-trust-model");
    assert_eq!(t["test_only"], json!(true));
    let b = t["boundary"].as_str().unwrap();
    assert!(b.contains("modelo activo"));
    assert!(b.contains("Não é autorização de operador"));
}
