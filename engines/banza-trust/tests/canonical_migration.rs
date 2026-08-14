//! Migration evidence for ADR-008/ADR-011: does adopting `BCJ/1` change the bytes of the artifacts
//! BANZA actually produces?
//!
//! The prior reference behaviour was `serde_json::to_string()` over the value minus excluded keys.
//! `BCJ/1` is a different *rule*, but for documents that use ASCII member names, integers within
//! ±(2^53−1) and no floats, the two coincide. These tests establish, on real artifacts rather than by
//! assertion, whether regeneration is required.

use banza_trust::canonical;
use banza_trust::sign::{build_input, federation_ote_demo_input, signed_revocation_list};
use serde_json::Value;

/// The exact behaviour the reference implementation had before ADR-011.
fn prior_behaviour(doc: &Value, exclude: &[&str]) -> Vec<u8> {
    let mut obj = doc.clone();
    if let Value::Object(map) = &mut obj {
        for k in exclude {
            map.remove(*k);
        }
    }
    serde_json::to_string(&obj).unwrap_or_default().into_bytes()
}

fn assert_same(label: &str, doc: &Value, exclude: &[&str]) {
    let before = prior_behaviour(doc, exclude);
    let after = canonical::canonicalize(doc, exclude).expect("BCJ/1 must accept a real artifact");
    assert_eq!(
        String::from_utf8_lossy(&before),
        String::from_utf8_lossy(&after),
        "{label}: BCJ/1 changed the bytes of a real artifact — regeneration would be required"
    );
}

#[test]
fn real_trust_artifacts_are_byte_identical_under_bcj1() {
    let input = build_input("valid");
    assert_same(
        "signed_protocol_metadata",
        &input["signed_protocol_metadata"],
        &["signature"],
    );
    assert_same(
        "trust_root_metadata",
        &input["trust_root_metadata"],
        &["root_signatures"],
    );
    assert_same(
        "operator_manifest",
        &input["operator_manifest"],
        &["manifest_hash"],
    );
    assert_same(
        "conformance_evidence",
        &input["conformance_evidence"],
        &["evidence_hash"],
    );
    assert_same(
        "public_registry_entry",
        &input["public_registry_entry"],
        &[],
    );

    let (brl, _) = signed_revocation_list(&["operator-x"], "2027-07-16T00:00:00Z");
    assert_same("revocation_list", &brl, &["signature"]);

    let ote = federation_ote_demo_input();
    assert_same("federation_ote_input", &ote["delegated_signing_key"], &[]);
}

#[test]
fn existing_signatures_still_verify_under_bcj1() {
    // The strongest migration evidence: signatures produced before ADR-011 must still verify, which
    // they can only do if the signing bytes are unchanged.
    let input = build_input("valid");
    let meta = &input["signed_protocol_metadata"];
    let key = input["delegated_signing_key"]["public_key"]
        .as_str()
        .unwrap();
    let r = banza_trust::verify_signed_doc("signed_protocol_metadata", meta, key);
    assert!(
        r.verified,
        "a signature produced under the prior behaviour must still verify under BCJ/1: {}",
        r.detail
    );
}

#[test]
fn bcj1_accepts_every_artifact_the_protocol_produces() {
    // P1/P2 are real constraints; prove no current artifact violates them.
    let input = build_input("valid");
    for (name, doc) in input.as_object().unwrap() {
        if doc.is_object() || doc.is_array() {
            assert!(
                canonical::canonicalize(doc, &[]).is_ok(),
                "BCJ/1 rejected a real protocol artifact: {name}"
            );
        }
    }
}
