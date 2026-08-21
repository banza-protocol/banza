//! A word the engine knows is never repaired into a different word.
//!
//! Recovery runs ABOVE the router: it rewrites the question, and the router then sees the rewritten
//! form. So a wrong correction does not degrade an answer — it silently replaces the question, and
//! nothing downstream can tell.
//!
//! `rust` is four characters. `fuzzy::vocabulary` admits only tokens of five or more, because that set
//! answers "what may a typo be corrected TO". The same set was also answering "which words are known",
//! and by that rule `rust` was an unknown word one edit away from `trust`. Measured in production at
//! `src-2a01974`:
//!
//!     "Tenho de usar Rust para implementar o BANZA?"
//!         → recovery: "tenho de usar trust para implementar o banza"   (HIGH CONFIDENCE)
//!         → answer:   "Não é necessário usar trust para implementar BANZA, pois a implementação
//!                      privada dos modelos é rejeitada devido à falta de alcance…"
//!
//! Two unrelated protocol concepts swapped before any router saw the question — and `rust` is not an
//! incidental word here: ADR-038 makes it the language of every official BANZA engine, and `def-rust` is
//! an entry the corpus answers.
//!
//! Both directions are pinned. A fix that protects known words by no longer repairing unknown ones has
//! disabled the feature, and from inside a one-sided test the two are indistinguishable.

use banzai_query_core::fuzzy::{recover, Band};
use banzai_query_core::route::route;

#[test]
fn a_declared_concept_word_survives_recovery() {
    for q in [
        "tenho de usar rust para implementar o banza",
        "o banza usa rust",
        "posso usar rust",
        "rust",
    ] {
        let r = recover(q);
        assert!(
            r.corrected_query.contains("rust") && !r.corrected_query.contains("trust"),
            "{q:?} was rewritten to {:?}",
            r.corrected_query
        );
        assert!(
            r.corrections.iter().all(|c| c.from != "rust"),
            "{q:?} corrected `rust` away: {:?}",
            r.corrections
        );
    }
}

#[test]
fn the_question_still_reaches_the_rule_about_language_choice() {
    // The end-to-end consequence, not just the token. This is what a reader asked and did not get.
    assert_eq!(
        route("tenho de usar rust para implementar o banza")
            .entry_id
            .as_deref(),
        Some("who-implements-protocol"),
    );
}

#[test]
fn genuine_typos_are_still_repaired() {
    // The other direction. Each of these is one edit from a declared term and none is a declared term.
    for (q, want) in [
        ("o que e fedaracao", "federacao"),
        ("explica a revogasao", "revogacao"),
        ("governaca do protocolo", "governanca"),
        ("o que e o ledgr", "ledger"),
    ] {
        let r = recover(q);
        assert_eq!(r.band, Band::HighConfidence, "q={q} r={r:?}");
        assert!(
            r.corrected_query.contains(want),
            "q={q} got={}",
            r.corrected_query
        );
    }
}
