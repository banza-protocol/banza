//! The 2-of-3 authorization property, tested as behaviour rather than as documentation.
//!
//! BANZA's Trust Root is controlled by three independent signing authorities and a valid Root-authorised
//! action requires signatures from any two of the three. The tests below drive the accept and reject
//! sets of exactly that rule. They exist because the rule is what makes the Root safe: two-party
//! authorization, one-party failure tolerance, no single-party control.
//!
//! The reject cases matter more than the accept cases. `duplicate_signer_is_one_authority` in particular
//! pins the distinction between counting signature ENTRIES and counting distinct AUTHORITIES — one
//! custodian signing twice is one approval, not two.

use banza_root_ceremony::sign::{sign_root_metadata, TestKeypair};
use banza_root_ceremony::{demo_fixtures, validate_root_ceremony, THRESHOLD, TOTAL_ROOT_KEYS};
use serde_json::{json, Value};

fn valid_input() -> Value {
    demo_fixtures()["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["key"] == "valid_2of3")
        .expect("valid_2of3 fixture")["input"]
        .clone()
}

/// The two signatures the valid fixture carries, in order.
fn signatures() -> Vec<Value> {
    valid_input()["root_metadata"]["signatures"]
        .as_array()
        .expect("signatures array")
        .clone()
}

fn status_with(sigs: Vec<Value>) -> String {
    let mut v = valid_input();
    v["root_metadata"]["signatures"] = Value::Array(sigs);
    validate_root_ceremony(&v)["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn the_model_is_three_authorities_threshold_two() {
    assert_eq!(TOTAL_ROOT_KEYS, 3, "the Root has three signing authorities");
    assert_eq!(THRESHOLD, 2, "two of them authorise an action");
    let r = validate_root_ceremony(&valid_input());
    assert_eq!(r["total_root_keys"], 3);
    assert_eq!(r["threshold"], 2);
}

#[test]
fn two_distinct_authorities_authorise() {
    assert_eq!(status_with(signatures()), "M2_ROOT_CEREMONY_VALID");
}

#[test]
fn one_authority_never_authorises_alone() {
    for (i, s) in signatures().into_iter().enumerate() {
        assert_eq!(
            status_with(vec![s]),
            "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD",
            "signature {i} alone must not authorise"
        );
    }
}

#[test]
fn duplicate_signer_is_one_authority() {
    let first = signatures().remove(0);
    assert_eq!(
        status_with(vec![first.clone(), first]),
        "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD",
        "the same authority signing twice is one approval, not two"
    );
}

#[test]
fn no_signatures_do_not_authorise() {
    assert_eq!(status_with(vec![]), "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD");
}

#[test]
fn an_unknown_signer_fails_closed() {
    let mut sigs = signatures();
    sigs[1]["key_id"] = json!("root-key-not-declared");
    assert_eq!(status_with(sigs), "M2_ROOT_CEREMONY_INVALID_SIGNATURE");
}

#[test]
fn a_malformed_signature_fails_closed() {
    let mut sigs = signatures();
    sigs[1]["signature"] = json!("not-base64url-!!");
    assert_eq!(status_with(sigs), "M2_ROOT_CEREMONY_INVALID_SIGNATURE");
}

#[test]
fn a_valid_signature_beside_an_invalid_one_fails_closed() {
    let mut sigs = signatures();
    sigs.push(json!({"key_id": "root-key-not-declared", "signature": "AAAA"}));
    assert_eq!(
        status_with(sigs),
        "M2_ROOT_CEREMONY_INVALID_SIGNATURE",
        "reaching the threshold does not excuse a signature that does not verify"
    );
}

// ── every accepting combination, signed for real with TEST-ONLY keys ─────────────────────────────
//
// The fixture carries one pair. These cases rebuild the three declared authorities from deterministic
// test seeds and sign the actual canonical bytes, so each of A+B, A+C, B+C and A+B+C is exercised
// against real Ed25519 verification rather than asserted about.

fn three_authorities() -> (Vec<TestKeypair>, Value) {
    let kps: Vec<TestKeypair> = (0u8..3)
        .map(|i| TestKeypair::from_seed(&[i + 1; 32]))
        .collect();
    let mut input = valid_input();
    let keys: Vec<Value> = (0..3)
        .map(|i| {
            json!({
                "key_id": format!("root-key-{}", i + 1),
                "custodian": format!("custodian-{}", (b'A' + i as u8) as char),
                "public_key": kps[i].public_b64url,
            })
        })
        .collect();
    input["root_metadata"]["keys"] = Value::Array(keys);
    (kps, input)
}

fn status_signed_by(indices: &[usize]) -> String {
    let (kps, mut input) = three_authorities();
    let mut unsigned = input["root_metadata"].clone();
    unsigned["signatures"] = json!([]);
    let ids: Vec<(String, String)> = indices
        .iter()
        .map(|&i| {
            (
                format!("root-key-{}", i + 1),
                format!("custodian-{}", (b'A' + i as u8) as char),
            )
        })
        .collect();
    let signers: Vec<(&str, &str, &TestKeypair)> = indices
        .iter()
        .enumerate()
        .map(|(n, &i)| (ids[n].0.as_str(), ids[n].1.as_str(), &kps[i]))
        .collect();
    input["root_metadata"]["signatures"] = sign_root_metadata(&unsigned, &signers);
    validate_root_ceremony(&input)["status"]
        .as_str()
        .unwrap()
        .to_string()
}

#[test]
fn any_two_of_the_three_authorise() {
    for pair in [[0, 1], [0, 2], [1, 2]] {
        assert_eq!(
            status_signed_by(&pair),
            "M2_ROOT_CEREMONY_VALID",
            "authorities {pair:?} must authorise"
        );
    }
}

#[test]
fn all_three_authorise() {
    assert_eq!(status_signed_by(&[0, 1, 2]), "M2_ROOT_CEREMONY_VALID");
}

#[test]
fn each_one_alone_does_not_authorise() {
    for i in 0..3 {
        assert_eq!(
            status_signed_by(&[i]),
            "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD",
            "authority {i} alone must not authorise"
        );
    }
}
