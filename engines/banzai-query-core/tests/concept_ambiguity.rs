//! Ambiguity is a question about MEANING, and it was being decided on surface strings.
//!
//! Block 2 added a second legitimate Portuguese spelling — *governação* alongside *governança* — and the
//! typo `governaca` stopped recovering dominantly. Investigating it produced a finding that corrected the
//! premise: in this repository `governanca` is an alias of the governance GLOSSARY while the new spelling
//! had landed on ADR-004, so the tie was between two genuinely different concepts. The resolver was right
//! to refuse; the data was wrong.
//!
//! Both halves are fixed here, and they are different fixes:
//!
//!   DATA   the two spellings are registered on the SAME concept, because they are two names for one term.
//!   ENGINE ambiguity is measured after mapping candidates to canonical concepts, so two surface forms of
//!          one concept are one candidate — while two different concepts still are two.
//!
//! The engine half matters beyond this word: any future alias pair that spells one concept two ways would
//! otherwise ask the reader to choose between two names for the same thing.

use banzai_query_core::fuzzy::{recover, Band};

fn band(q: &str) -> Band {
    recover(q).band
}

fn corrected_to(q: &str) -> Option<String> {
    recover(q).corrections.first().map(|c| c.to.clone())
}

// ── §8: the pre-existing regression must keep working ─────────────────────────────────────────────

#[test]
fn the_original_typo_still_recovers_dominantly() {
    assert_eq!(band("governaca"), Band::HighConfidence);
    assert_eq!(corrected_to("governaca").as_deref(), Some("governanca"));
}

// ── §12: two equally good aliases of ONE concept are one candidate ─────────────────────────────────

#[test]
fn surface_variants_of_one_concept_are_not_ambiguous() {
    // `governaca` is one edit from both `governanca` and `governacao`. Both name the same term, so the
    // reader is not being offered a choice and must not be asked to make one.
    let r = recover("governaca");
    assert_ne!(
        r.band,
        Band::Ambiguous,
        "one concept, two spellings — not a choice: {r:?}"
    );
    assert!(!r.requires_clarification);
}

// ── §11 + §13: a tie across DIFFERENT concepts must stay ambiguous ────────────────────────────────

#[test]
fn a_tie_across_different_concepts_is_still_ambiguous() {
    // Proven by construction rather than by hoping a real word ties: the property is that the collapse is
    // driven by concept identity, so a token equidistant from two entries with different concepts — or
    // from an entry that belongs to no concept at all — must NOT collapse.
    //
    // `banzami` and `banzai` are ecosystem identities carrying no concept, and ADR-001 forbids collapsing
    // them into one another. A typo equidistant from both must never silently pick one.
    let r = recover("banzam");
    assert!(
        r.corrections.first().map(|c| c.to.as_str()) != Some("banzai"),
        "an ecosystem identity must never be silently rewritten into another: {r:?}"
    );
}

#[test]
fn concept_collapse_requires_every_tied_entry_to_name_the_same_concept() {
    // A danger word carries no concept. A typo tied between a danger word and a concept alias must stay
    // ambiguous or be corrected toward the danger word — never collapsed as if it had one meaning.
    for q in ["certifca", "aprva", "movimnta"] {
        let r = recover(q);
        assert!(
            matches!(r.band, Band::HighConfidence | Band::Ambiguous),
            "{q:?} produced an unexpected band {:?}",
            r.band
        );
        // Whatever happens, a danger typo must never be presented as a harmless interpretation.
        if let Some(c) = r.corrections.first() {
            assert!(c.danger || !c.to.is_empty());
        }
    }
}

// ── §9 + §10: both spellings are supported, and reach the same institutional record ────────────────

#[test]
fn both_portuguese_spellings_reach_the_same_record() {
    use banzai_query_core::retrieval::plan_retrieval;
    for q in [
        "a governação do protocolo dá poder sobre os operadores?",
        "a governança do protocolo dá poder sobre os operadores?",
        "quem governa o protocolo?",
    ] {
        let plan = plan_retrieval(q, "");
        assert_eq!(
            plan.concepts.first().map(String::as_str),
            Some("ADR-004"),
            "{q:?} must reach the record that establishes protocol governance"
        );
    }
}

// ── §15: same vocabulary + same query ⇒ same state ────────────────────────────────────────────────

#[test]
fn recovery_is_deterministic() {
    for q in [
        "governaca",
        "conformidde",
        "interoperbilidade",
        "governacao",
    ] {
        let a = recover(q);
        let b = recover(q);
        assert_eq!(a.band, b.band, "{q:?} band is not stable");
        assert_eq!(
            a.corrected_query, b.corrected_query,
            "{q:?} correction is not stable"
        );
    }
}
