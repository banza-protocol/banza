//! Every engine that digests a JSON artifact derives the same bytes.
//!
//! Eleven engines carried their own `canon()` built on `serde_json::to_string`, with a comment
//! calling it "canonical JSON ... deterministic for hashing". `spec/canonicalization.md` §1 applies
//! `BCJ/1` wherever BANZA computes a signature **or a content digest**, and names evidence bundles
//! and receipts explicitly — so those helpers were a second, unpublished definition of the byte form.
//!
//! They now delegate. This test pins the two properties that matter: the bytes agree for the shapes
//! real artifacts take, and a value the profile rejects yields no usable digest input.

use banza_trust::canonical_bytes;
use serde_json::json;

#[test]
fn real_artifact_shapes_are_byte_identical_to_the_prior_behaviour() {
    // Every artifact BANZA emits: ASCII member names, integers in range, no fractional numbers.
    // For these, BCJ/1 and the prior `serde_json::to_string` coincide — which is why delegating
    // changed no digest anywhere and every engine's tests passed unaltered.
    for v in [
        json!({"operator_id":"op-a","amount_minor":150000,"currency":"AOA"}),
        json!({"z":1,"a":{"y":2,"x":[3,2,1]},"n":-9007199254740991i64}),
        json!({"report_id":"l2-abc","status":"L2_READY_FOR_TECHNICAL_REVIEW","checks":[]}),
        json!({"bundle":{"artifacts":[{"sha256":"0".repeat(64),"kind":"evidence"}]}}),
    ] {
        let prior = serde_json::to_string(&v).unwrap();
        let bcj = String::from_utf8(canonical_bytes(&v, &[]).unwrap()).unwrap();
        assert_eq!(
            prior, bcj,
            "delegation must not move the bytes for a real artifact shape"
        );
    }
}

#[test]
fn a_rejected_value_yields_no_usable_digest_input() {
    // The engines must still return a verdict about an artifact the profile rejects, so `canon`
    // is total — but what it returns can never be mistaken for a canonical form.
    for bad in [
        json!({"amount_minor": 123.45}),
        json!({"n": 9007199254740992i64}),
    ] {
        assert!(
            canonical_bytes(&bad, &[]).is_err(),
            "the profile must reject what the engines must not digest"
        );
    }
}
