//! What counts as a SUBJECT a turn names for itself.
//!
//! This decides whether a follow-up changes topic or leans on the previous one, so being wrong in either
//! direction breaks a conversation. Four rules were tried and three were too broad, each for the same
//! reason — they asked whether a word APPEARS somewhere rather than whether it NAMES something:
//!
//! ```text
//! !subject.is_empty()          "me da um exemplo aqui" claimed the subject "exemplo"
//! registered surface forms     built from every word of every keyword: "coisa", "mesma" pass
//! critical_subject_words()     splits multi-word aliases, so the comparison phrase donates "coisa"
//! id.contains(word)            def-operator-governance-authority donates "governance", "authority"
//! ```
//!
//! The rule that holds is three narrow derivations over tables that already exist, never a new list:
//!
//!   1. the production term resolver, asked with the candidate ALONE ("operador");
//!   2. the head noun of a DEFINITIONAL alias — "o que e uma implementacao" is about implementations,
//!      while "operador e uma implementacao sao a mesma coisa" is a comparison and donates nothing;
//!   3. the CANONICAL NAME the corpus gave the concept: the first segment after `def-`, the one position
//!      these ids encode ownership unambiguously. Later segments qualify a record; they never rename it.
//!
//! Both directions are pinned here because a fix for one that breaks the other looks identical from inside
//! a single test — which is exactly how the first three rules got shipped.

use banzai_query_core::glossary::is_nameable_subject;

#[test]
fn the_concepts_this_repository_owns_are_nameable_on_their_own() {
    // A turn that says only this much HAS named its topic, and must move there rather than inherit.
    for s in [
        "operador",
        "operator",
        "implementacao",
        "implementation",
        "root",
        "banzai",
        "l0",
        "banza",
    ] {
        assert!(
            is_nameable_subject(s),
            "{s:?} is a concept this repository owns and must be a nameable subject"
        );
    }
}

#[test]
fn grammar_holding_a_phrase_together_is_not_a_subject() {
    // Every one of these occurs inside a registered alias. None of them names anything, and each was
    // accepted by at least one of the discarded rules.
    for s in ["coisa", "mesma", "sao", "thing", "same", "exemplo", "aqui"] {
        assert!(
            !is_nameable_subject(s),
            "{s:?} only occurs inside a longer alias and must not be a subject"
        );
    }
}

#[test]
fn a_qualifier_inside_a_compound_id_is_not_the_subject_of_that_record() {
    // The precise failure the positional rule exists to prevent. `def-operator-governance-authority` is
    // about the OPERATOR; "governance" and "authority" qualify the record. `def-root-authorization` is
    // about the ROOT; "authorization" qualifies it. A containment rule would hand out all four.
    //
    // The first four below are rejected by BOTH the positional rule and the requirement that a candidate
    // also be a spoken alias token, so on their own they do not test the position at all — a containment
    // rule passes them too. "independent" and "freeze" are the cases that actually discriminate: each is a
    // later segment of an id AND a whole token in that record's own alias ("independent implementation",
    // "l0 freeze"), so containment accepts them and only position refuses. Without those two this test was
    // green under the exact rule it claims to forbid, which is measured below in the block report.
    for s in [
        "authority",
        "autoridade",
        "authorization",
        "autorizacao",
        "actor",
        "independent",
        "freeze",
    ] {
        assert!(
            !is_nameable_subject(s),
            "{s:?} qualifies a record rather than naming it, and must not be a subject"
        );
    }
}

#[test]
fn a_canonical_name_is_still_a_subject_even_when_it_looks_like_a_qualifier() {
    // The other side of the same rule, and the reason it is positional rather than a denylist:
    // `def-governance` and `def-certification-actor` ARE about governance and certification, so those
    // words name their records and stay eligible. Rejecting them because they resemble qualifiers
    // elsewhere would be a denylist pretending to be a structure.
    for s in ["governance", "certification"] {
        assert!(
            is_nameable_subject(s),
            "{s:?} is the canonical name of a record and must stay a subject"
        );
    }
}

#[test]
fn the_comparison_phrase_still_resolves_as_a_phrase() {
    // Non-vacuity for the exclusions above: refusing "coisa" as a subject must not cost the corpus the
    // sentence it came from. If this ever fails, the eligibility rule has eaten real coverage rather than
    // just the grammar.
    for q in [
        "operador e uma implementacao sao a mesma coisa",
        "operator and an implementation the same",
    ] {
        let r = banzai_query_core::route::route(q);
        assert_eq!(
            r.entry_id.as_deref(),
            Some("def-operator-vs-implementation"),
            "{q:?} must still reach the relationship record"
        );
    }
}
