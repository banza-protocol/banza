//! A future protocol version must not become trusted for starting with the right number.
//!
//! The rule is: **same major, and not ahead of the verifier.** Before this test the implementation
//! compared only the major, so a verifier at 1.0.0 accepted documents declaring 1.0.1, 1.5.0 and
//! 1.999.0 — releases that did not exist, whose contents it could not know, and whose acceptance it had
//! no basis for. It also accepted `"1"`, `"1.x"` and `"1.0.0-rc1"`, which are not versions at all.
//!
//! `wire_compatible_with` in the protocol contract is DECLARATIVE — no code reads it. That is checked
//! here too, because a field that looks like a runtime wildcard invites someone to make it one.

use banza_trust::{parse_protocol_version, protocol_version_compatible, PROTOCOL_VERSION};

const CONTRACT: &str = include_str!("../../../contracts/production/protocol-version.json");

#[test]
fn an_unknown_future_version_is_not_compatible() {
    for future in ["1.0.1", "1.0.99", "1.1.0", "1.5.0", "1.999.0"] {
        assert!(
            !protocol_version_compatible(future, "1.0.0"),
            "{future} is ahead of a 1.0.0 verifier and must not be accepted"
        );
    }
}

#[test]
fn the_backward_direction_stays_open() {
    // This is the direction SemVer actually promises: a later verifier reads earlier documents.
    for earlier in ["1.0.0", "1.0.1", "1.2.0"] {
        assert!(
            protocol_version_compatible(earlier, "1.5.0"),
            "a 1.5.0 verifier must accept {earlier}"
        );
    }
    assert!(protocol_version_compatible("1.0.0", "1.0.0"), "exact match");
}

#[test]
fn a_different_major_is_never_compatible() {
    for other in ["2.0.0", "0.9.9", "10.0.0"] {
        assert!(!protocol_version_compatible(other, "1.0.0"), "{other}");
    }
    // Not even a LOWER version of a different major, which the `<=` test alone would let through.
    assert!(!protocol_version_compatible("0.9.9", "1.0.0"));
}

#[test]
fn a_string_that_is_not_a_version_is_not_a_version() {
    for bad in [
        "1",
        "1.0",
        "1.x",
        "1.0.x",
        "1.0.0.0",
        "1.0.0-rc1",
        "v1.0.0",
        "",
        " 1.0.0",
        "1.0.0 ",
        "01.0.0-",
        "1..0",
        "-1.0.0",
        "+1.0.0",
        "1.0.0+build",
    ] {
        assert!(parse_protocol_version(bad).is_none(), "{bad:?} parses");
        assert!(
            !protocol_version_compatible(bad, "1.0.0"),
            "{bad:?} must not be compatible"
        );
        assert!(
            !protocol_version_compatible("1.0.0", bad),
            "{bad:?} must not work as a verifier version either"
        );
    }
}

#[test]
fn the_engine_accepts_the_version_the_contract_declares() {
    let c: serde_json::Value = serde_json::from_str(CONTRACT).expect("contract parses");
    let declared = c["protocol_version"].as_str().expect("declared");
    assert!(protocol_version_compatible(declared, PROTOCOL_VERSION));
    assert_eq!(PROTOCOL_VERSION, declared);
}

/// `wire_compatible_with` states the policy for readers. It must not become an operational allowlist:
/// no code may read it, because a verifier that trusts a self-declared range trusts the publisher's
/// claim about the future instead of its own knowledge of the present.
#[test]
fn wire_compatible_with_is_declarative_and_not_a_runtime_wildcard() {
    let c: serde_json::Value = serde_json::from_str(CONTRACT).expect("contract parses");
    let range = &c["compatibility"]["wire_compatible_with"];
    assert!(range.is_array(), "the field exists and is a list");

    // Whatever the field says, the decision is unchanged: the future is still refused.
    assert!(!protocol_version_compatible("1.0.1", PROTOCOL_VERSION));
    assert!(!protocol_version_compatible("1.9.9", PROTOCOL_VERSION));
}
