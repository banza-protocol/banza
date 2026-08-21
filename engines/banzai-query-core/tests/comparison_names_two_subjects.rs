//! A comparison names two subjects, and one side is not the answer.
//!
//! Every arm of the term table names ONE subject and matches the first it recognises. So a two-sided
//! question was answered with one side and stopped. Measured in production at `src-2a01974`:
//!
//!   PT  `Qual é a diferença entre L2 e L3?` → the L2 definition alone, never mentioning L3, with
//!       `degraded: true` — while the reader saw a complete, confident answer to a question that had
//!       not been answered.
//!
//!   EN  `What is the difference between L2 and L3?` fell to the model and confabulated: "L2 and L3
//!       differ in their level of abstraction and coordination [...] L3 introduces a lineage that ties
//!       keys to a trusted set", citing ADR-021 (reason codes) and ADR-039 (root authority). Neither
//!       document discusses profiles at all.
//!
//! Two profiles now reach the entry that carries ALL of them — each profile's purpose and inheritance,
//! derived from the canonical registry, realized in both locales. Every other comparison resolves to
//! nothing rather than to one of its sides.
//!
//! That second half is not an improvement in what is known. It is the difference between an incomplete
//! answer a reader can see and a confident one they cannot.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn comparing_two_profiles_reaches_the_entry_that_holds_both() {
    for q in [
        "qual e a diferenca entre l2 e l3",
        "what is the difference between l2 and l3",
        "compare l1 and l4",
        "l2 vs l3",
        "qual a diferenca entre o l0 e o l4",
    ] {
        assert_eq!(entry(q), "def-profiles", "{q:?}");
    }
}

#[test]
fn a_comparison_is_never_answered_with_one_of_its_sides() {
    // The precise regression: `def-profile-l2` answering a question about L2 *and* L3.
    for q in [
        "qual e a diferenca entre l2 e l3",
        "what is the difference between l2 and l3",
    ] {
        assert_ne!(
            entry(q),
            "def-profile-l2",
            "{q:?} is not a question about L2 alone"
        );
        assert_ne!(
            entry(q),
            "def-profile-l3",
            "{q:?} is not a question about L3 alone"
        );
    }
    // And a comparison with no combined entry resolves to nothing rather than to one side.
    for q in [
        "qual a diferenca entre clearing e settlement",
        "what is the difference between clearing and settlement",
    ] {
        let e = entry(q);
        assert!(
            e != "def-clearing" && e != "def-settlement",
            "{q:?} was answered with one side: {e}"
        );
    }
}

#[test]
fn asking_about_one_profile_still_answers_about_that_profile() {
    // The other direction. A comparison gate that also captured single-subject questions would have
    // traded one wrong answer for a broader one.
    assert_eq!(entry("o que e l2"), "def-profile-l2");
    assert_eq!(entry("what is l2"), "def-profile-l2");
    assert_eq!(entry("o que e l3"), "def-profile-l3");
    assert_eq!(entry("quais sao os perfis de conformidade"), "def-profiles");
}
