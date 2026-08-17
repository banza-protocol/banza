//! Typo recovery repairs UNKNOWN surface forms. It must not rewrite vocabulary the resolver already
//! recognises.
//!
//! # The measured defect
//!
//! "What are the BANZA profiles?" had `profiles` rewritten to `profile` as a HIGH-CONFIDENCE correction,
//! because the fuzzy vocabulary happened to carry the singular and not the plural. The router only ever
//! sees the corrected query, so a legitimate English plural was normalised out of its own alias — and the
//! question reached the generic BANZA description while its Portuguese twin resolved correctly. Another
//! PT/EN asymmetry produced by one list being incomplete rather than by any rule about language.
//!
//! The fix is not a rule about plurals and not an entry for `profiles`. A token the resolver matches on is
//! by definition not an unknown surface form, so recovery leaves it alone: keywords of indexed entries,
//! words of critical-subject aliases, and canonical profile identifiers.
//!
//! Both directions are asserted here, because either alone is a plausible bug: protecting everything would
//! disable recovery, and protecting nothing is what happened.

use banzai_query_core::fuzzy::{recover, Band};

fn corrections(q: &str) -> Vec<String> {
    recover(q)
        .corrections
        .iter()
        .map(|c| format!("{}->{}", c.from, c.to))
        .collect()
}

#[test]
fn registered_vocabulary_is_never_rewritten() {
    // The exact defect, plus the neighbours it would have had. Each of these is a surface form the
    // resolver matches on, in one language or the other.
    for q in [
        "What are the BANZA profiles?",
        "profiles",
        "profile",
        "operadores",
        "operador",
        "governanca",
        "governacao",
        "implementacao",
        "conformidade",
    ] {
        let r = recover(q);
        assert_eq!(
            r.band,
            Band::Exact,
            "{q:?} is vocabulary the resolver recognises and must not be corrected: {:?}",
            corrections(q)
        );
        assert!(r.corrections.is_empty(), "{q:?}: {:?}", corrections(q));
    }
}

#[test]
fn a_real_misspelling_still_recovers() {
    // The other half. Without this the protection above is satisfied by disabling recovery, which would
    // trade one silent failure for a louder one.
    for (typo, expected) in [
        ("governaca", "governanca"),
        ("conformidde", "conformidade"),
        ("interoperbilidade", "interoperabilidade"),
    ] {
        let r = recover(typo);
        assert_eq!(r.band, Band::HighConfidence, "{typo:?} must still recover");
        assert_eq!(
            r.corrections.first().map(|c| c.to.as_str()),
            Some(expected),
            "{typo:?} must recover to {expected:?}"
        );
    }
}

#[test]
fn an_unregistered_profile_identifier_is_never_corrected_into_a_real_one() {
    // Recovery must not become a back door into the closed profile set: "L7" is not a misspelling of
    // "L4", it is a question about something that does not exist. If this ever fails, the negative
    // controls fail with it.
    for q in [
        "What is the L7 conformance profile?",
        "o que exige o perfil L99?",
        "Is there an L5 profile?",
    ] {
        let r = recover(q);
        for lvl in ["l0", "l1", "l2", "l3", "l4"] {
            assert!(
                !r.corrections.iter().any(|c| c.to == lvl),
                "{q:?} must not be corrected into a registered profile: {:?}",
                corrections(q)
            );
        }
    }
}

#[test]
fn the_two_languages_are_treated_alike() {
    // Registered vocabulary in either language is left alone. The defect was an asymmetry, so the
    // property is asserted as one.
    for (pt, en) in [("perfis", "profiles"), ("operador", "operator")] {
        assert!(
            recover(pt).corrections.is_empty(),
            "{pt:?}: {:?}",
            corrections(pt)
        );
        assert!(
            recover(en).corrections.is_empty(),
            "{en:?}: {:?}",
            corrections(en)
        );
    }
}
