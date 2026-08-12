//! `BCJ/1` profile closure — the properties that make the profile a boundary rather than a suggestion.
//!
//! Two of these tests exist because the corresponding property was **false** when the final
//! verification pass of the normative-completeness remediation looked for it:
//!
//!   * `rejection_is_not_degradation` — `canonical_bytes` collapsed every rejected document to an
//!     empty byte vector, so two different invalid artifacts shared one signing input and one digest.
//!   * `p3_is_enforced_where_it_is_observable` — P3 was unreachable on the production verification
//!     path, which takes an already-parsed value.

//!
//! The rest pin P4's closure: extensibility must not be a way around P1/P2/P3.

use banza_trust::{canonical, canonical_bytes, canonical_sha256, verify_signed_doc_bytes};
use serde_json::{json, Value};

// ── extensibility does not relax the profile (spec §3 P4) ───────────────────────────────────────

#[test]
fn unknown_member_may_not_carry_a_fractional_number() {
    let v = json!({"known": 1, "vendor_ext": 0.5});
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P1"));
}

#[test]
fn unknown_member_may_not_carry_an_exponent_number() {
    let v: Value = serde_json::from_str(r#"{"known":1,"vendor_ext":1e2}"#).unwrap();
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P1"));
}

#[test]
fn unknown_member_may_not_carry_an_out_of_range_integer() {
    let v: Value = serde_json::from_str(r#"{"known":1,"vendor_ext":9007199254740992}"#).unwrap();
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P2"));
    // and at the negative bound
    let v: Value = serde_json::from_str(r#"{"known":1,"vendor_ext":-9007199254740992}"#).unwrap();
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P2"));
}

#[test]
fn nesting_does_not_escape_the_profile() {
    // deep inside an unknown object
    let v = json!({"ext": {"a": {"b": {"c": 1.25}}}});
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P1"));
    // and inside an array inside an unknown object
    let v: Value =
        serde_json::from_str(r#"{"ext":{"list":[1,2,{"deep":9007199254740992}]}}"#).unwrap();
    assert!(canonical_bytes(&v, &[]).unwrap_err().contains("P2"));
}

#[test]
fn a_duplicate_inside_an_unknown_member_is_rejected() {
    let e = canonical::canonicalize_str(r#"{"known":1,"ext":{"k":1,"k":2}}"#, &[]).unwrap_err();
    assert!(e.contains("P3"), "{e}");
}

#[test]
fn a_well_formed_unknown_member_is_preserved_and_signed() {
    // P4's positive half: extensions that obey the profile are kept, in canonical position.
    let v = json!({"b": 1, "vendor_ext": {"z": 1, "a": [1, 2]}});
    let out = String::from_utf8(canonical_bytes(&v, &[]).unwrap()).unwrap();
    assert_eq!(out, r#"{"b":1,"vendor_ext":{"a":[1,2],"z":1}}"#);
}

// ── rejection is not degradation (spec §7 step 1) ───────────────────────────────────────────────

#[test]
fn rejection_is_not_degradation() {
    let a = json!({"amount": 1.5});
    let b = json!({"something_else": 2.5});

    // Both are rejected...
    assert!(canonical_bytes(&a, &[]).is_err());
    assert!(canonical_bytes(&b, &[]).is_err());
    assert!(canonical_sha256(&a, &[]).is_err());

    // ...and rejection yields no bytes at all. If a rejected document produced a value instead —
    // empty bytes were the previous behaviour — these two different documents would share one
    // signing input, and any signature over that input would verify for both.
    assert!(
        canonical_bytes(&a, &[]).ok().is_none() && canonical_bytes(&b, &[]).ok().is_none(),
        "a rejected artifact must yield no signing input"
    );
}

#[test]
fn a_rejected_document_cannot_verify() {
    // A syntactically valid signed document whose payload violates P1 must fail closed rather than
    // being verified over a substituted input.
    let doc = json!({"amount": 1.5, "key_id": "k1", "signature": "AAAA"});
    let r = banza_trust::verify_signed_doc(
        "probe",
        &doc,
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    assert!(!r.verified, "a P1-violating document must not verify");
}

// ── P3 where it is observable (spec §7 step 1) ──────────────────────────────────────────────────

#[test]
fn p3_is_enforced_where_it_is_observable() {
    let raw = r#"{"a":1,"a":2,"signature":"AAAA"}"#;

    // On the wire-bytes path the duplicate is visible and MUST be rejected.
    let r = verify_signed_doc_bytes("probe", raw, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    assert!(!r.verified);
    assert!(
        r.detail.contains("P3"),
        "expected a P3 rejection, got: {}",
        r.detail
    );

    // And the parsed-value path genuinely cannot see it — which is why the bytes path exists.
    let parsed: Value = serde_json::from_str(raw).unwrap();
    assert_eq!(
        parsed["a"],
        json!(2),
        "the parser resolved the duplicate before we saw it"
    );
}
