//! M2.4 — the Trust Engine tool layer: the Rust-computed trust status over the active-model evaluator,
//! exercised through the TEST-ONLY demo fixtures. Every output reports llm_calls=0 and
//! external_model_called=false. Verification only — no production key, no certificate, no authorisation.

use banza_trust::tool::{demo_fixtures, schema, tool_version, trust_evaluate_tool};
use serde_json::Value;

fn fixtures() -> Vec<Value> {
    demo_fixtures()["fixtures"].as_array().unwrap().clone()
}

#[test]
fn every_demo_fixture_matches_its_expected_status() {
    for fx in fixtures() {
        let out = trust_evaluate_tool(&fx["input"]);
        assert_eq!(
            out["trust_status"].as_str(),
            fx["expected"].as_str(),
            "fixture {}",
            fx["key"]
        );
        assert_eq!(out["llm_calls"], 0);
        assert_eq!(out["external_model_called"], false);
        assert_eq!(out["test_only"], true);
    }
}

#[test]
fn there_are_twelve_fixtures_and_a_test_only_marker() {
    let fx = demo_fixtures();
    assert_eq!(fx["fixtures"].as_array().unwrap().len(), 12);
    assert!(fx["note"].as_str().unwrap().contains("TEST ONLY"));
    assert!(fx["note"]
        .as_str()
        .unwrap()
        .contains("NO REAL PRIVATE KEYS"));
}

#[test]
fn no_private_key_material_in_any_fixture() {
    let out = demo_fixtures().to_string().to_lowercase();
    for term in [
        "private_key",
        "secret_key",
        "seed",
        "mnemonic",
        "passphrase",
    ] {
        assert!(!out.contains(term), "fixtures must not contain '{term}'");
    }
}

#[test]
fn schema_lists_the_active_model() {
    let s = schema();
    let inputs = s["required_inputs"].as_array().unwrap();
    for req in [
        "trust_root_metadata",
        "delegated_signing_key",
        "signed_protocol_metadata",
        "operator_manifest",
        "conformance_evidence",
        "public_registry_entry",
        "revocation_status",
    ] {
        assert!(
            inputs.iter().any(|v| v.as_str() == Some(req)),
            "schema must require {req}"
        );
    }
    let statuses = s["status_values"].to_string();
    assert!(statuses.contains("TRUST_VALID"));
    assert!(!s
        .to_string()
        .to_lowercase()
        .contains("operator certificate"));
}

#[test]
fn tool_version_declares_the_signed_metadata_model() {
    let v = tool_version();
    assert_eq!(v["model"], "signed-protocol-metadata");
    assert_eq!(v["test_only"], true);
}
