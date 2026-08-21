//! "Explain X" is a definition question, and asking for it simply does not make it a different question.
//!
//! The gate in `glossary_entry` opened for `starts_definition_lead && toks <= 6`, for a bare term, or
//! for a boundary query. Two things fell outside it, and both are ordinary phrasings:
//!
//!   * `explica X` / `explain X` were not definition leads at all — while `is_r2s2_acronym`, in the same
//!     file, already read them. So `Explica BCJ/1.` resolved through the two-token bare-term gate and
//!     `Explica BCJ/1 de forma simples.` was refused, which is the sentence a reader actually types.
//!   * a trailing request about STYLE ("de forma simples", "in simple terms") was counted against the
//!     six-token cap, so politeness pushed a question out of the gate.
//!
//! Measured against production before the fix: `Explica BCJ/1 de forma simples.` and
//! `Explain BCJ/1 simply.` both returned "I found no BANZA operation or public source that supports
//! this request" — for the protocol's own canonical byte form.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn explain_is_a_definition_lead_in_both_languages() {
    // `normalize` folds "BCJ/1" to "bcj/i" — a documented collision the term table matches in both
    // forms — so the fixtures here are already in normalized shape, like the rest of this crate's tests.
    assert_eq!(entry("explica bcj/i"), "def-bcj");
    assert_eq!(entry("explain bcj/i"), "def-bcj");
    assert_eq!(entry("explica idempotencia"), "def-idempotency");
    assert_eq!(entry("explain idempotency"), "def-idempotency");
}

#[test]
fn asking_for_a_simpler_answer_does_not_change_the_question() {
    for (q, want) in [
        ("explica bcj/i de forma simples", "def-bcj"),
        ("explain bcj/i simply", "def-bcj"),
        ("explain bcj/i in simple terms", "def-bcj"),
        ("explica idempotencia de forma simples", "def-idempotency"),
        ("explain idempotency in simple terms", "def-idempotency"),
        ("o que e um ledger de forma simples", "def-ledger"),
    ] {
        assert_eq!(entry(q), want, "{q:?} asks about {want}");
    }
}

#[test]
fn a_style_qualifier_is_not_read_as_a_subject() {
    // The stripping must remove the qualifier, never the subject. `def-r2s2` is the specific wrong
    // answer this question used to receive, because `simples` is also the name of a Fundamental
    // Principle — so it is the assertion worth pinning.
    assert_eq!(entry("explica o que e um ledger de forma simples"), "def-ledger");
}
