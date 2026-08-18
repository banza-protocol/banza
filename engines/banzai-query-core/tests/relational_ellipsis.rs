//! "São a mesma coisa?" — a question about a PAIR the conversation just established.
//!
//! ```text
//! O que é uma implementação?     definition(implementation)
//! E um operador?                 definition(operator)          via FRAME_CARRY
//! São a mesma coisa?             relation(implementation, operator)
//! ```
//!
//! This is not subject carry and it is not Turn 2. The turn names nothing — `sao`, `mesma` and `coisa` are
//! all refused as subjects, and keeping them refused is half the point — and it does not mean "the same as
//! the operator". It asks how two things relate, and both of them have to have been put on the table.
//!
//! Two design choices carry the safety, and both are structural rather than remembered:
//!
//!   * The pair is RECOMPUTED from the two immediately preceding turns on every question. There is no
//!     stored pair, so there is nothing to go stale: an unrelated turn in between simply means the last two
//!     turns are not a contrast, and the pair does not exist.
//!   * The operands are RESOLVED RECORDS (`def-implementation`, `def-operator`), and the relationship is
//!     looked up by the id the corpus already assigned it (`def-operator-vs-implementation`). A pair the
//!     corpus never related has no record, so the engine cannot answer "are they the same?" by reaching for
//!     the one comparison it happens to know.

use banzai_query_core::frame::frame_of;
use banzai_query_core::glossary::is_nameable_subject;
use banzai_query_core::route::route_with_context;

/// Ask a whole conversation and report the LAST turn.
fn conversation(turns: &[&str]) -> (String, String, Option<String>, bool) {
    let mut history: Vec<String> = vec![];
    let mut out = None;
    for q in turns {
        let cr = route_with_context(q, &history);
        out = Some((
            cr.merge_kind.to_string(),
            cr.route.action.to_string(),
            cr.route.entry_id.clone(),
            cr.context_used,
        ));
        history.push((*q).to_string());
    }
    out.expect("a conversation has at least one turn")
}

const REL: &str = "def-operator-vs-implementation";

// ── The property ──────────────────────────────────────────────────────────────────────────────────

#[test]
fn a_pair_established_by_the_conversation_answers_the_relation() {
    for turns in [
        [
            "O que é uma implementação?",
            "E um operador?",
            "São a mesma coisa?",
        ],
        [
            "What is an implementation?",
            "And an operator?",
            "Are they the same thing?",
        ],
    ] {
        let (kind, action, entry, used) = conversation(&turns);
        assert_eq!(kind, "RELATIONAL_PAIR", "{turns:?}");
        assert!(used, "{turns:?}: the pair came from the conversation");
        assert_eq!(
            action, "deterministic",
            "{turns:?}: no model for a settled relation"
        );
        assert_eq!(entry.as_deref(), Some(REL), "{turns:?}");
    }
}

#[test]
fn portuguese_and_english_reach_the_same_relation() {
    let pt = conversation(&[
        "O que é uma implementação?",
        "E um operador?",
        "São a mesma coisa?",
    ]);
    let en = conversation(&[
        "What is an implementation?",
        "And an operator?",
        "Are they the same thing?",
    ]);
    assert_eq!(pt.2, en.2, "same record");
    assert_eq!(pt.1, en.1, "same answer policy");
    assert_eq!(pt.0, en.0, "same merge decision");
}

#[test]
fn the_order_the_pair_was_introduced_in_does_not_matter() {
    // "Are they the same?" is symmetric, and the corpus should not need two records to say so. Both
    // orderings are tried against the one record it has.
    let (kind, _, entry, _) = conversation(&[
        "O que é um operador?",
        "E uma implementação?",
        "São a mesma coisa?",
    ]);
    assert_eq!(kind, "RELATIONAL_PAIR");
    assert_eq!(entry.as_deref(), Some(REL));
}

#[test]
fn the_subjects_are_the_two_concepts_and_never_the_words_of_the_question() {
    // Turn 3 succeeds because of the pair, not because its own words became nameable. If this ever
    // reverses, the eligibility work has been undone and the relation is right by accident.
    for w in ["coisa", "mesma", "sao", "same", "thing"] {
        assert!(!is_nameable_subject(w), "{w:?} must not be a subject");
    }
    assert!(
        !frame_of("São a mesma coisa?").has_own_subject(),
        "the turn names nothing of its own"
    );
    assert!(!frame_of("Are they the same thing?").has_own_subject());
}

// ── When there is no pair ─────────────────────────────────────────────────────────────────────────

#[test]
fn with_no_conversation_there_is_no_pair() {
    for q in ["São a mesma coisa?", "Are they the same thing?"] {
        let (kind, action, entry, used) = conversation(&[q]);
        assert_ne!(kind, "RELATIONAL_PAIR", "{q:?}");
        assert!(!used);
        assert_eq!(action, "insufficient");
        assert_ne!(
            entry.as_deref(),
            Some(REL),
            "{q:?} must not borrow a relation"
        );
    }
}

#[test]
fn a_pair_the_corpus_never_related_is_not_answered_by_the_one_it_did() {
    // implementation ↔ Root has no relationship record. The engine must not substitute the comparison it
    // knows — that is how "are they the same?" would come to mean one fixed answer.
    let (kind, action, entry, _) = conversation(&[
        "O que é uma implementação?",
        "E a Root?",
        "São a mesma coisa?",
    ]);
    assert_ne!(kind, "RELATIONAL_PAIR");
    assert_ne!(entry.as_deref(), Some(REL));
    assert_eq!(action, "insufficient");
}

#[test]
fn two_concepts_the_corpus_never_related_are_not_forced_into_a_relation() {
    // The discriminating control, and the reason it exists: in the Root case above BOTH guards would have
    // fired, because the Root never resolves at all — so hard-coding the answer to the one comparison this
    // engine knows would have survived that test. Here implementation and BanzAI BOTH resolve, the pair is
    // real, and the corpus simply relates no such pair. That is the case where only the relationship
    // lookup can refuse.
    for turns in [
        [
            "O que é uma implementação?",
            "E o BanzAI?",
            "São a mesma coisa?",
        ],
        [
            "What is an implementation?",
            "And BanzAI?",
            "Are they the same thing?",
        ],
    ] {
        let (kind, action, entry, _) = conversation(&turns);
        assert_ne!(kind, "RELATIONAL_PAIR", "{turns:?}");
        assert_ne!(
            entry.as_deref(),
            Some(REL),
            "{turns:?}: an unrelated pair must not be answered with the relation the engine happens to know"
        );
        assert_eq!(action, "insufficient", "{turns:?}");
    }
}

#[test]
fn a_turn_in_between_ends_the_contrast() {
    // The pair is recomputed from the last two turns, so a new subject in between is not a pair with
    // anything — the earlier contrast is simply no longer the last two turns.
    let (kind, action, entry, _) = conversation(&[
        "O que é uma implementação?",
        "E um operador?",
        "O que é o BanzAI?",
        "São a mesma coisa?",
    ]);
    assert_ne!(kind, "RELATIONAL_PAIR", "the old pair must not be reused");
    assert_ne!(entry.as_deref(), Some(REL));
    assert_eq!(action, "insufficient");
}

#[test]
fn two_independent_questions_are_not_a_contrast_even_about_the_right_concepts() {
    // The control that isolates the CONTINUATION requirement, and it took a survived mutation to find it.
    // Both turns here resolve to exactly the two concepts the relation record joins, so every other guard
    // is satisfied — the operands resolve, the relationship exists — and only the contrast requirement
    // refuses. Dropping that requirement passes every other control in this file.
    //
    // The rule is deliberately conservative: a pair is established by asking about B *under A's question*,
    // which is what makes them contrasted rather than merely both asked about. Two complete, independent
    // questions are two topics. Widening this is a decision to take on purpose, not by omission.
    let (kind, action, entry, _) = conversation(&[
        "O que é uma implementação?",
        "O que é um operador?",
        "São a mesma coisa?",
    ]);
    assert_ne!(
        kind, "RELATIONAL_PAIR",
        "two independent questions are not a contrast"
    );
    assert_ne!(entry.as_deref(), Some(REL));
    assert_eq!(action, "insufficient");
}

#[test]
fn adjacency_is_not_contrast() {
    // Two entities near each other are not a comparison. The second turn must have CONTINUED the first
    // under its question frame; a lifecycle question about something else did not.
    let (kind, entry) = {
        let (k, _, e, _) = conversation(&[
            "O que é uma implementação?",
            "O BANZA está em produção?",
            "São a mesma coisa?",
        ]);
        (k, e)
    };
    assert_ne!(kind, "RELATIONAL_PAIR");
    assert_ne!(entry.as_deref(), Some(REL));
}

// ── What must keep working ────────────────────────────────────────────────────────────────────────

#[test]
fn the_explicit_comparison_still_resolves_without_any_context() {
    // The ellipsis SUPPLEMENTS the question asked in full; it must not become the only way to ask it.
    for q in [
        "Um operador e uma implementação são a mesma coisa?",
        "Are an operator and an implementation the same thing?",
    ] {
        let (kind, action, entry, used) = conversation(&[q]);
        assert_eq!(kind, "STANDALONE", "{q:?} needs no context");
        assert!(!used);
        assert_eq!(action, "deterministic");
        assert_eq!(entry.as_deref(), Some(REL), "{q:?}");
    }
}

#[test]
fn turn_two_is_unchanged_by_any_of_this() {
    // The Turn-2 matrix, re-run here because Turn 3 edits the same path. Reversed definition is included
    // deliberately: it was BROKEN before this file existed — "que implementacao" resolved to the procedure
    // that shares the noun — and only a relational sequence in the other order exposed it.
    let cases: &[(&[&str], &str, Option<&str>)] = &[
        (
            &["O que é uma implementação?", "E um operador?"],
            "FRAME_CARRY",
            Some("def-operator"),
        ),
        (
            &["What is an implementation?", "And an operator?"],
            "FRAME_CARRY",
            Some("def-operator"),
        ),
        (
            &["What is an implementation?", "And BanzAI?"],
            "FRAME_CARRY",
            Some("def-banzai-agent"),
        ),
        (
            &["O que é um operador?", "E uma implementação?"],
            "FRAME_CARRY",
            Some("def-implementation"),
        ),
        (
            &["Como demonstrar conformidade?", "E um operador?"],
            "STANDALONE",
            None,
        ),
        (
            &["O BANZA está em produção?", "E um operador?"],
            "STANDALONE",
            None,
        ),
        (
            &["O que é a certification?", "E um operador?"],
            "FRAME_CARRY_DECLINED",
            None,
        ),
    ];
    for (turns, kind, entry) in cases {
        let (k, _, e, _) = conversation(turns);
        assert_eq!(&k, kind, "{turns:?}");
        assert_eq!(e.as_deref(), *entry, "{turns:?}");
    }
}
