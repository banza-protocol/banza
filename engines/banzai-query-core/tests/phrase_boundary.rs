//! A keyword phrase matches at a WORD boundary, and "word" here means letters.
//!
//! The multi-word path scored a phrase hit on raw substring containment while the single-word path had
//! always required a whole word. Adding the Portuguese surface form "o que e o banza" to the BANZA identity
//! entry made it a substring of "o que e o banzami", worth a five-word phrase hit, and the Banzami question
//! stopped reaching the Banzami entry — the exact collision `kb.rs` has a test to forbid, arriving through
//! the one path that was not checking.
//!
//! Two stricter rules were tried first and each moved 313 probes: aligning on space-separated tokens, and
//! then on alphanumeric boundaries. Both broke `"adr 0"`, which the index carries deliberately so that
//! "explain ADR-001" reaches the decision record index. A digit continuing the match is the intent; a letter
//! continuing it is the bug. Both directions are pinned here, because a fix for one that breaks the other
//! looks identical from inside a single test.

use banzai_query_core::retrieve_topk_ids;

#[test]
fn a_longer_word_does_not_satisfy_a_phrase_keyword() {
    assert_eq!(
        retrieve_topk_ids("o que e o banzami", 1),
        vec!["what-is-banzami".to_string()],
        "\"o que e o banza\" must not match inside \"banzami\""
    );
    assert_eq!(
        retrieve_topk_ids("o que e o banza", 1),
        vec!["what-is-banza".to_string()],
        "and the keyword must still match its own question"
    );
}

#[test]
fn a_numeric_reference_still_extends_its_prefix_keyword() {
    // `"adr 0"` exists so a numbered reference reaches the decision index. A boundary rule that treats a
    // digit as a word character silently retires that keyword for every ADR in the corpus.
    for q in [
        "explica a adr 001",
        "explain adr 012",
        "qual o impacto da adr 038",
    ] {
        assert!(
            retrieve_topk_ids(q, 1) == vec!["protocol-decisions-adrs".to_string()],
            "{q:?} must still reach the decision index"
        );
    }
}
