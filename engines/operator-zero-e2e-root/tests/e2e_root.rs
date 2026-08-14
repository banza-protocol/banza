//! Tests for the Operador Zero E2E Demo Root (ADR-035, M2.13A). They load the COMMITTED public
//! artifacts and prove — using the public key alone — that signatures verify, a tampered payload
//! fails, revocation blocks trust fail-closed, the demo boundary holds, and no private-key material
//! leaked. No private key exists at test time; verification is public-key-only.

use operator_zero_e2e_root as e2e;
use serde_json::Value;
use std::path::PathBuf;

fn dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../examples/operators/zero/e2e-root")
}
fn load(name: &str) -> Value {
    let s =
        std::fs::read_to_string(dir().join(name)).unwrap_or_else(|e| panic!("read {name}: {e}"));
    serde_json::from_str(&s).unwrap()
}

const FILES: &[&str] = &[
    "operator-zero-e2e-root.public.json",
    "operator-zero-e2e-key-manifest.json",
    "operator-zero-e2e-key-fingerprint.txt",
    "operator-zero-e2e-signature-report.json",
    "operator-zero-e2e-revocation-list.json",
    "operator-zero-e2e-signed-manifest.json",
    "operator-zero-e2e-signed-evidence-bundle.json",
    "operator-zero-e2e-root-verification-trace.json",
];

#[test]
fn all_artifacts_exist() {
    for f in FILES {
        assert!(dir().join(f).exists(), "missing artifact {f}");
    }
}

#[test]
fn public_key_exists_and_is_valid_ed25519() {
    let pubj = load("operator-zero-e2e-root.public.json");
    let pk = e2e::unmb64(pubj["public_key_multibase"].as_str().unwrap()).unwrap();
    assert_eq!(pk.len(), 32, "Ed25519 public key must be 32 bytes");
    assert_eq!(pubj["algorithm"], "ed25519");
    assert_eq!(pubj["not_protocol_trust_root"], Value::Bool(true));
    assert_eq!(pubj["root_type"], "demo_operator_root");
}

#[test]
fn signed_manifest_verifies() {
    let pk = load("operator-zero-e2e-root.public.json")["public_key_multibase"]
        .as_str()
        .unwrap()
        .to_string();
    let sm = load("operator-zero-e2e-signed-manifest.json");
    assert!(
        e2e::verify_payload(
            &pk,
            &sm["payload"],
            sm["signature_multibase"].as_str().unwrap()
        ),
        "the committed signed manifest must verify against the committed public key"
    );
}

#[test]
fn tampered_payload_fails() {
    let pk = load("operator-zero-e2e-root.public.json")["public_key_multibase"]
        .as_str()
        .unwrap()
        .to_string();
    let sm = load("operator-zero-e2e-signed-manifest.json");
    let sig = sm["signature_multibase"].as_str().unwrap();
    let mut tampered = sm["payload"].clone();
    tampered
        .as_object_mut()
        .unwrap()
        .insert("currency".into(), Value::String("AOA".into()));
    assert!(
        !e2e::verify_payload(&pk, &tampered, sig),
        "a tampered payload must NOT verify"
    );
}

#[test]
fn signed_evidence_bundle_verifies() {
    let pk = load("operator-zero-e2e-root.public.json")["public_key_multibase"]
        .as_str()
        .unwrap()
        .to_string();
    let sb = load("operator-zero-e2e-signed-evidence-bundle.json");
    assert!(e2e::verify_payload(
        &pk,
        &sb["payload"],
        sb["signature_multibase"].as_str().unwrap()
    ));
}

#[test]
fn revocation_blocks_trust_fail_closed() {
    let pubj = load("operator-zero-e2e-root.public.json");
    let pk = pubj["public_key_multibase"].as_str().unwrap().to_string();
    let active = pubj["key_id"].as_str().unwrap();
    let rev = load("operator-zero-e2e-revocation-list.json");
    let sm = load("operator-zero-e2e-signed-manifest.json");
    let (payload, sig) = (&sm["payload"], sm["signature_multibase"].as_str().unwrap());

    assert!(
        !e2e::is_revoked(&rev, active),
        "active key must not be revoked"
    );
    assert!(
        e2e::is_revoked(&rev, e2e::REVOKED_DEMO_KEY_ID),
        "the revoked demo key must be listed"
    );
    assert_eq!(
        e2e::evaluate_trust(&pk, active, payload, sig, &rev),
        "valid_demo"
    );
    assert_eq!(
        e2e::evaluate_trust(&pk, e2e::REVOKED_DEMO_KEY_ID, payload, sig, &rev),
        "blocked_revoked",
        "a revoked key must block trust fail-closed"
    );
}

#[test]
fn demo_root_is_not_the_protocol_trust_root() {
    for f in FILES.iter().filter(|f| f.ends_with(".json")) {
        let v = load(f);
        assert_eq!(
            v["not_protocol_trust_root"],
            Value::Bool(true),
            "{f} must declare not_protocol_trust_root"
        );
        assert_eq!(
            v["root_type"], "demo_operator_root",
            "{f} must declare root_type demo_operator_root"
        );
    }
}

#[test]
fn no_private_key_material_in_any_artifact() {
    for f in FILES {
        let raw = std::fs::read_to_string(dir().join(f)).unwrap();
        let low = raw.to_lowercase();
        for needle in [
            "private_key",
            "signing_key",
            "secret",
            "seed",
            "mnemonic",
            "-----begin",
        ] {
            // leak blocklist pattern (test-only)
            assert!(
                !low.contains(needle),
                "artifact {f} must not contain '{needle}'"
            );
        }
    }
}

#[test]
fn demo_boundary_on_every_json_artifact() {
    for f in FILES.iter().filter(|f| f.ends_with(".json")) {
        let v = load(f);
        assert_eq!(v["demo_only"], Value::Bool(true), "{f}: demo_only");
        assert_eq!(
            v["production_allowed"],
            Value::Bool(false),
            "{f}: production_allowed"
        );
        assert_eq!(
            v["monetary_value"],
            Value::Bool(false),
            "{f}: monetary_value"
        );
        assert_eq!(v["operator_id"], "operator-zero", "{f}: operator_id");
    }
}

#[test]
fn verification_trace_is_complete() {
    let t = load("operator-zero-e2e-root-verification-trace.json");
    assert_eq!(t["complete"], Value::Bool(true));
    for step in t["steps"].as_array().unwrap() {
        assert_eq!(step["ok"], Value::Bool(true), "trace step failed: {step}");
    }
}
