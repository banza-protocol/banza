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
    // A REAL cross-concept tie, found by scanning the vocabulary rather than assumed: `authorizes` is
    // registered on ADR-005 (certification does not propagate) and `authorises` on ADR-007 (regulatory
    // authorisation). Two spellings, but in this repository they name DIFFERENT records — which is exactly
    // the case that must stay ambiguous, because picking one silently would answer a question about
    // certification with a record about regulators, or the reverse.
    //
    // `authorixes` differs from each only at the letter that distinguishes them, so it is exactly one edit
    // from both. The engine must not choose.
    let r = recover("authorixes");
    assert_eq!(
        r.band,
        Band::Ambiguous,
        "a tie across two different records must stay a question, not a guess: {r:?}"
    );
    assert!(r.requires_clarification);

    // And an ecosystem identity is never silently rewritten into another (ADR-001).
    let e = recover("banzam");
    assert!(
        e.corrections.first().map(|c| c.to.as_str()) != Some("banzai"),
        "an ecosystem identity must never be silently rewritten into another: {e:?}"
    );
}

#[test]
fn collapse_is_driven_by_concept_identity_not_by_counting_aliases() {
    // The guard against the opposite failure: if the resolver ever collapsed ties without comparing
    // concepts, this cross-concept tie would become a confident single answer. Asserting the ambiguous
    // band above already fails in that case — this states the reason so the intent survives a refactor.
    let tied = banzai_query_core::fuzzy::vocabulary_debug();
    let a = tied
        .iter()
        .find(|(t, _)| t == "authorizes")
        .map(|(_, c)| *c)
        .flatten();
    let b = tied
        .iter()
        .find(|(t, _)| t == "authorises")
        .map(|(_, c)| *c)
        .flatten();
    assert!(
        a.is_some() && b.is_some(),
        "the fixture pair must exist in the vocabulary"
    );
    assert_ne!(
        a, b,
        "the fixture pair must genuinely name different records: {a:?} vs {b:?}"
    );
}

// ── §9 + §10: both spellings are supported, and reach the same institutional record ────────────────

#[test]
fn both_portuguese_spellings_reach_the_same_record() {
    use banzai_query_core::retrieval::plan_retrieval;
    // Each phrasing carries ONLY its own spelling and no other ADR-004 alias, so removing one spelling
    // makes the corresponding case fail. A longer sentence would have been covered by a sibling alias —
    // which is how an earlier version of this test passed while the spelling it claimed to protect had
    // been deleted.
    for q in [
        "governação do protocolo",
        "governança do protocolo",
        "protocol governance",
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
