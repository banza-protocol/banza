//! Cross-implementation conformance for `BCJ/1` (`spec/canonicalization.md` §8).
//!
//! The vectors in `conformance/vectors/canonicalization.json` were produced by an implementation
//! written **from the specification text**, independently of this engine. This test asserts that the
//! Rust engine reproduces them exactly. Agreement between two implementations that share no code is
//! the evidence that the rule lives in the specification and not in either implementation.

use banza_trust::canonical;
use serde_json::Value;

const VECTORS: &str = include_str!("../../../conformance/vectors/canonicalization.json");

#[test]
fn engine_matches_the_published_vectors() {
    let doc: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    assert_eq!(doc["canonicalization"], "BCJ/1");

    let mut accepted = 0;
    let mut rejected = 0;

    for v in doc["vectors"].as_array().expect("vectors array") {
        let id = v["id"].as_str().unwrap();

        if v["expect"] == "accept" {
            let bytes = canonical::canonicalize(&v["input"], &[])
                .unwrap_or_else(|e| panic!("{id}: engine rejected an accept vector: {e}"));
            let got = String::from_utf8(bytes).unwrap();

            assert_eq!(
                got,
                v["canonical"].as_str().unwrap(),
                "{id} ({}): canonical form differs from the published vector",
                v["title"].as_str().unwrap()
            );
            assert_eq!(
                canonical::digest(&v["input"], &[]).unwrap(),
                v["sha256"].as_str().unwrap(),
                "{id}: digest differs from the published vector"
            );
            assert_eq!(
                got.len() as u64,
                v["canonical_bytes_len"].as_u64().unwrap(),
                "{id}: canonical byte length differs"
            );
            accepted += 1;
        } else {
            // Reject vectors carry raw text, because some of them (duplicate members) cannot be
            // expressed as a parsed value at all.
            let raw = v["input_raw"].as_str().unwrap();
            let rule = v["rule"].as_str().unwrap();
            let err = canonical::canonicalize_str(raw, &[]).expect_err(&format!(
                "{id} ({}): engine accepted a vector the specification rejects",
                v["title"].as_str().unwrap()
            ));
            assert!(
                err.contains(rule),
                "{id}: rejected for the wrong reason — expected {rule}, got: {err}"
            );
            rejected += 1;
        }
    }

    assert_eq!(accepted, 14, "expected 14 accept vectors");
    assert_eq!(rejected, 6, "expected 6 reject vectors");
}

#[test]
fn utf16_ordering_is_observable_in_the_vectors() {
    // BCJ-013 is the vector that distinguishes UTF-16 code-unit ordering from UTF-8 byte ordering:
    // U+00E9 sorts after 'z' under UTF-16, which a naive byte-ordered map would also do here — the
    // value of the vector is that it pins the rule explicitly for implementers.
    let doc: Value = serde_json::from_str(VECTORS).unwrap();
    let v = doc["vectors"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["id"] == "BCJ-013")
        .expect("BCJ-013 present");
    let got = String::from_utf8(canonical::canonicalize(&v["input"], &[]).unwrap()).unwrap();
    assert_eq!(got, v["canonical"].as_str().unwrap());
}

#[test]
fn p5_is_observable_in_the_vectors() {
    // BCJ-008 (decomposed) and BCJ-009 (precomposed) are the same text to a human and MUST digest
    // differently, because canonicalization does not normalise.
    let doc: Value = serde_json::from_str(VECTORS).unwrap();
    let get = |id: &str| -> String {
        doc["vectors"]
            .as_array()
            .unwrap()
            .iter()
            .find(|v| v["id"] == id)
            .map(|v| canonical::digest(&v["input"], &[]).unwrap())
            .unwrap()
    };
    assert_ne!(
        get("BCJ-008"),
        get("BCJ-009"),
        "P5: canonicalization must not normalise Unicode"
    );
}
