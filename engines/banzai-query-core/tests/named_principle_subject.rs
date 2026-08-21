//! A Fundamental Principle is answered when it is the SUBJECT, not when its name is a passing adjective.
//!
//! The four principles are named `robusto`, `resiliente`, `seguro` and `simples` (and their English
//! twins). Those are ordinary words, and the gate that recognised them only asked two things: does the
//! query contain one of the names, and is the query a definition question at all. Every definition
//! question containing the adjective therefore resolved to `def-r2s2` — deterministically, with
//! `grounded: true`, which is the shape of an answer a reader trusts.
//!
//! Measured against production before the fix: `o que e um canal seguro`, `o que e transporte seguro`,
//! `what is the secure boot` and `o que e um ledger simples` were all answered with the four
//! Fundamental Principles. None of them is a question about principles.
//!
//! Both directions are pinned. A fix that stops answering the hijacked questions by no longer answering
//! the real ones is not a fix, and from inside a single test the two look the same.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn an_adjective_inside_a_question_does_not_summon_the_principles() {
    for q in [
        "o que e um canal seguro",
        "o que e transporte seguro",
        "o que e uma ligacao segura",
        "what is the secure boot",
        "o que e um ledger simples",
        "o que e um protocolo simples",
        "o que e um sistema robusto",
    ] {
        assert_ne!(
            entry(q),
            "def-r2s2",
            "{q:?} asks about its own subject, not about the Fundamental Principles"
        );
    }
}

#[test]
fn the_principles_are_still_answered_when_they_are_the_subject() {
    // Named as principles — the framing fixes the subject wherever the name sits.
    for q in [
        "o que e o principio simples",
        "o que significa o principio robusto",
        "quais sao os principios fundamentais",
        "what are the fundamental principles",
        "o que e r2s2",
    ] {
        assert_eq!(
            entry(q),
            "def-r2s2",
            "{q:?} is a question about the Fundamental Principles"
        );
    }
}

#[test]
fn a_bare_principle_name_is_still_the_subject() {
    // No `princípio` framing, but the name IS what is being asked about.
    for q in ["o que e simples", "o que e seguro", "what is robust"] {
        assert_eq!(
            entry(q),
            "def-r2s2",
            "{q:?} names a principle and nothing else"
        );
    }
}
