//! Every published Root Authority Set vector is executed against the engine.
//!
//! A vector file that nobody runs is a documentation artifact with a checksum. This test is what makes
//! `conformance/vectors/root-authority-set.json` a claim: each vector's declared expectation is the
//! engine's actual verdict, so an independent implementation validating against the file is validating
//! against the same behaviour the reference implementation exhibits.

use banza_trust::authority_set::{
    classify_ordering, set_digest, verify_genesis_set, verify_key_manifest_under_set,
    verify_successor_set, Ordering,
};
use serde_json::Value;

const VECTORS: &str = include_str!("../../../conformance/vectors/root-authority-set.json");

/// `active` is either the literal string "genesis" or an inline set document.
fn resolve<'a>(field: &'a Value, genesis: &'a Value) -> &'a Value {
    match field.as_str() {
        Some("genesis") => genesis,
        _ => field,
    }
}

#[test]
fn every_published_vector_matches_the_engine() {
    let v: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    let genesis = &v["genesis"];
    let vectors = v["vectors"].as_array().expect("vectors array");
    assert!(
        vectors.len() >= 16,
        "the adversarial set must not shrink silently: {} vectors",
        vectors.len()
    );

    let mut seen_kinds = std::collections::BTreeSet::new();
    for vec in vectors {
        let id = vec["id"].as_str().expect("id");
        let kind = vec["kind"].as_str().expect("kind");
        let expect = vec["expect"].as_str().expect("expect");
        seen_kinds.insert(kind.to_string());

        match kind {
            "genesis" => {
                let pinned = vec["pinned_digest"].as_str().unwrap_or("");
                let got = verify_genesis_set(resolve(&vec["set"], genesis), pinned).verified;
                assert_eq!(got, expect == "accept", "{id}: {}", vec["title"]);
            }
            "successor" => {
                let active = resolve(&vec["active"], genesis);
                let got = verify_successor_set(&vec["candidate"], active).verified;
                assert_eq!(got, expect == "accept", "{id}: {}", vec["title"]);
            }
            "key_manifest" => {
                let active = resolve(&vec["active"], genesis);
                let got = verify_key_manifest_under_set(&vec["candidate"], active).verified;
                assert_eq!(got, expect == "accept", "{id}: {}", vec["title"]);
            }
            "ordering" => {
                let observed = &vec["observed"];
                let seq = observed["set_sequence"]
                    .as_u64()
                    .expect("observed sequence");
                let digest = set_digest(observed).expect("observed digest");
                let got = classify_ordering(&vec["candidate"], seq, &digest).expect("classifies");
                let want = match expect {
                    "replay" => Ordering::Replay,
                    "equivocation" => Ordering::Equivocation,
                    "rollback" => Ordering::Rollback,
                    "eligible" => Ordering::Eligible,
                    other => panic!("{id}: unknown ordering expectation {other}"),
                };
                assert_eq!(got, want, "{id}: {}", vec["title"]);
            }
            other => panic!("{id}: unknown vector kind {other}"),
        }
    }

    // Every part of the model an external implementation must get right is represented.
    for required in ["genesis", "successor", "ordering", "key_manifest"] {
        assert!(
            seen_kinds.contains(required),
            "the vector set no longer exercises {required}"
        );
    }
}

/// The pinned genesis digest published in the file is the digest of the genesis set in the same file.
/// If these drift, every implementer pins a value that anchors nothing.
#[test]
fn the_published_pinned_digest_matches_the_published_genesis_set() {
    let v: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    assert_eq!(
        v["pinned_genesis_digest"].as_str().unwrap(),
        set_digest(&v["genesis"]).unwrap(),
        "the pinned digest must be the digest of the genesis set it anchors"
    );
}
