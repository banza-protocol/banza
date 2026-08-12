//! The contract between the simulator and the protocol it claims to demonstrate.
//!
//! ADR-052 says Operador Zero "passes the whole journey". That claim is only worth anything if the
//! PROTOCOL's engines accept its artifacts — a simulator that passes only its own checks demonstrates
//! nothing. This suite runs the canonical Operador Zero manifest through `banza-operator-manifest`,
//! the same engine the BanzAI Manifest step runs in the browser.
//!
//! M2.12B found this the hard way: the manifest shipped by M2.12A was INCOMPLETE against that engine
//! (no `simulated`, no `capabilities`, no `base_url`, no `key_manifest_url`, no `supported_levels`),
//! so the Manifest step could never have scored. Every check below exists because its absence hid
//! that.

use serde_json::Value;

fn read(rel: &str) -> String {
    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../examples/operators/zero")
        .join(rel);
    std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("cannot read {}: {e}", p.display()))
}

#[test]
fn the_canonical_manifest_is_valid_against_the_protocol_engine() {
    let raw = read("manifest/operator-zero.manifest.valid.json");
    let r: Value = banza_operator_manifest::validate_manifest_str(&raw);
    assert_eq!(
        r["status"], "VALID",
        "the canonical manifest is not VALID against banza-operator-manifest: missing={:?} errors={:?}",
        r["missing_fields"], r["errors"]
    );
    assert_eq!(r["readiness"], "READY_FOR_SIMB_PRE_REVIEW");
    assert_eq!(r["operator_id"], "operator-zero");
}

#[test]
fn the_valid_manifest_also_passes_this_crates_demo_boundary() {
    // Both directions matter: protocol-valid but unmarked would be the dangerous artifact.
    let raw = read("manifest/operator-zero.manifest.valid.json");
    let v: Value = serde_json::from_str(&raw).unwrap();
    let b = operator_zero_core::boundary::evaluate(&[("manifest".into(), v)]);
    assert_eq!(
        b["intact"], true,
        "manifest violates the demo boundary: {b}"
    );
}

#[test]
fn the_negative_manifests_are_actually_refused_by_the_protocol_engine() {
    // A "negative" example that quietly validates is worse than no negative example, because the
    // negative journey would then score like the happy one.
    for (file, why) in [
        (
            "manifest/operator-zero.manifest.invalid.missing-required-field.json",
            "missing required field",
        ),
        (
            "manifest/operator-zero.manifest.invalid-version.json",
            "incompatible protocol_version",
        ),
    ] {
        let raw = read(file);
        let r: Value = banza_operator_manifest::validate_manifest_str(&raw);
        assert_ne!(r["status"], "VALID", "{file} was accepted as VALID ({why})");
    }
}

#[test]
fn the_secret_leak_manifest_is_refused_by_the_demo_boundary() {
    let raw = read("manifest/operator-zero.manifest.invalid-secret-leak.json");
    let v: Value = serde_json::from_str(&raw).unwrap();
    let b = operator_zero_core::boundary::evaluate(&[("manifest".into(), v)]);
    assert_eq!(
        b["intact"], false,
        "a secret-leaking manifest passed the boundary"
    );
}
