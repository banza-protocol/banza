//! Totality at the untrusted-input boundary.
//!
//! The truth reset found a case where a `BCJ/1` rejection had been turned into `panic!`, so a
//! readiness engine aborted instead of returning the blocked verdict it owed the caller. Counting
//! `unwrap`s does not prove that cannot recur — behaviour does.
//!
//! Every function here receives material an attacker controls: fetched artifacts, request bodies,
//! reason codes. Each must return a structured rejection. None may abort the process.

use banza_trust::{canonical, execution};
use serde_json::{json, Value};

/// Inputs chosen to attack the parser, the profile and the string handling at once.
fn hostile_texts() -> Vec<String> {
    let mut v: Vec<String> = [
        "",
        " ",
        "null",
        "true",
        "0",
        "[]",
        "\"\"",
        "{",
        "}",
        "{\"a\":",
        "{\"a\":}",
        "{,}",
        "{\"a\":1,}",
        r#"{"a":1,"a":2}"#,       // P3 duplicate
        r#"{"o":{"k":1,"k":2}}"#, // P3 nested
        r#"{"n":1.5}"#,
        r#"{"n":1e2}"#,
        r#"{"n":-0}"#,
        r#"{"n":9007199254740992}"#,  // P2 above the bound
        r#"{"n":-9007199254740992}"#, // P2 below the bound
        r#"{"n":1e400}"#,             // overflow
        r#"{"n":99999999999999999999999999}"#,
        r#"{"s":"\ud800"}"#, // lone surrogate escape
        r#"{"deep":{"deep":{"deep":{"deep":{"n":1.5}}}}}"#,
        r#"{"a":[[[[[[[[[[1.5]]]]]]]]]]}"#,
        "{\"a\":1}trailing",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect();
    v.push(format!("\u{feff}{}", r#"{"a":1}"#)); // byte-order mark
    v.push(format!("{{\"s\":\"{}\"}}", '\u{7f}')); // DEL inside a string
    v.push("\n".to_string());
    v
}

#[test]
fn parse_and_canonicalize_never_abort() {
    for t in hostile_texts() {
        // Whatever the input, these return — Ok or Err — and never unwind.
        let _ = canonical::parse_strict(&t);
        let _ = canonical::canonicalize_str(&t, &[]);
        let _ = canonical::canonicalize_str(&t, &["signature"]);
        let _ = execution::request_identity_from_bytes(&t);
    }
}

#[test]
fn canonicalize_never_aborts_on_hostile_values() {
    let values: Vec<Value> = vec![
        json!(null),
        json!(true),
        json!(0),
        json!([]),
        json!(""),
        json!({"n": 1.5}),
        json!({"n": -1.5}),
        json!({"n": f64::MAX}),
        json!({"n": 9007199254740992i64}),
        json!({"n": -9007199254740992i64}),
        json!({"a": {"b": {"c": {"d": {"e": 0.1}}}}}),
        json!({"arr": [1, 2, {"bad": 0.5}]}),
        json!([1, 2, 3]), // non-object top level
        json!({"s": "café"}),
        json!({"s": "cafe\u{0301}"}),
        json!({"": 1}),
        json!({"\u{0}": 1}),
    ];
    for v in &values {
        let _ = canonical::canonicalize(v, &[]);
        let _ = canonical::digest(v, &[]);
        let _ = execution::request_identity(v);
    }
}

#[test]
fn reason_code_classification_never_aborts() {
    // `code_shape` reads the first character after an emptiness guard; prove the guard holds for
    // every shape an attacker can send, including multi-byte and control characters.
    let long = "A".repeat(4096);
    let codes: Vec<String> = [
        "",
        " ",
        ".",
        "..",
        "x-",
        "x-.",
        "x-.a",
        "-",
        "_",
        "0",
        "A",
        "a",
        "x-acme.",
        "x-.acme",
        "x--acme.c",
        "x-acme-.c",
        "x-ACME.c",
        "TRUST_VALID",
        "trust_valid",
        "Mixed_Case",
        "with space",
        "\u{0}",
        "é",
        "日本",
        "\u{feff}",
        "x-é.c",
    ]
    .iter()
    .map(|s| s.to_string())
    .chain(std::iter::once(long))
    .collect();

    for c in &codes {
        let _ = execution::code_shape(c);
        let _ = execution::validate_reason_codes(std::slice::from_ref(c));
    }
    let _ = execution::core_code_set(&codes);
    let _ = execution::validate_failed_checks(&codes, &["not_revoked".to_string()], false);
}

#[test]
fn signature_verification_never_aborts_on_hostile_material() {
    let huge_sig = "A".repeat(100_000);
    let docs = [
        json!({}),
        json!({"signature": ""}),
        json!({"signature": null}),
        json!({"signature": "not-base64!!"}),
        json!({"signature": "AAAA"}),
        json!({"signature": huge_sig}),
        json!({"amount": 1.5, "signature": "AAAA"}),
    ];
    let huge_key = "A".repeat(10_000);
    let keys = ["", "AAAA", "not-base64!!", huge_key.as_str()];
    for d in &docs {
        for k in keys {
            let r = banza_trust::verify_signed_doc("probe", d, k);
            assert!(!r.verified, "hostile material must never verify");
        }
    }
    for t in hostile_texts() {
        let r = banza_trust::verify_signed_doc_bytes("probe", &t, "AAAA");
        assert!(!r.verified);
    }
}

#[test]
fn the_declared_numeric_domain_is_exactly_the_profile_bound() {
    // The schemas now declare maximum/minimum at the BCJ/1 bound. Prove the two agree, so a
    // document that validates against a schema cannot then be rejected by canonicalization.
    let max = canonical::MAX_SAFE_INTEGER;
    assert_eq!(max, 9_007_199_254_740_991);
    assert!(canonical::canonicalize(&json!({"n": max}), &[]).is_ok());
    assert!(canonical::canonicalize(&json!({"n": -max}), &[]).is_ok());
    assert!(canonical::canonicalize(&json!({"n": max + 1}), &[]).is_err());
    assert!(canonical::canonicalize(&json!({"n": -max - 1}), &[]).is_err());
}
