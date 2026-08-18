//! A new subject asked under the previous turn's question.
//!
//! ```text
//! O que é uma implementação?     subject = implementacao   interrogative = que
//! E um operador?                 subject = operador        interrogative = —
//! ```
//!
//! The second turn names something and asks nothing. Before this, it resolved STANDALONE and died as
//! `insufficient`: the subject was recognised, the question was not, and nothing joined them. It is one
//! question asked twice, with only the second half spoken aloud.
//!
//! What travels is the QUESTION FORM, and nothing else. The previous subject does not — that is Block 4B,
//! and `the_previous_subject_does_not_survive` pins it. The rendered query is built from structured fields
//! (`prior.interrogative` + `cur.subject`), so the previous subject is not merely dropped from the answer,
//! it is never in the string.
//!
//! Every gate is structural. None of them is length: "E um operador?" continues a question, "L0?" is short
//! and complete, and a token count cannot tell those apart.

use banzai_query_core::route::route_with_context;

fn follow(prev: &str, cur: &str) -> (String, String, Option<String>, bool) {
    let cr = route_with_context(cur, &[prev.to_string()]);
    (
        cr.merge_kind.to_string(),
        cr.route.action.to_string(),
        cr.route.entry_id.clone(),
        cr.context_used,
    )
}

// ── The property ──────────────────────────────────────────────────────────────────────────────────

#[test]
fn a_new_subject_inherits_the_previous_question_in_both_languages() {
    for (prev, cur) in [
        ("O que é uma implementação?", "E um operador?"),
        ("What is an implementation?", "And an operator?"),
    ] {
        let (kind, action, entry, used) = follow(prev, cur);
        assert_eq!(kind, "FRAME_CARRY", "{cur:?} after {prev:?}");
        assert!(used, "{cur:?}: the previous turn supplied the question");
        assert_eq!(action, "deterministic", "{cur:?} must not need a model");
        assert_eq!(entry.as_deref(), Some("def-operator"), "{cur:?}");
    }
}

#[test]
fn the_previous_subject_does_not_survive() {
    // Block 4B compatibility, stated as the thing that must NOT happen. An explicit current subject
    // replaces the previous one; it does not join it.
    let (_, _, entry, _) = follow("O que é uma implementação?", "E um operador?");
    assert_ne!(
        entry.as_deref(),
        Some("def-implementation"),
        "the previous subject must not survive an explicit new one"
    );
    assert_eq!(entry.as_deref(), Some("def-operator"));
}

#[test]
fn the_mechanism_is_not_specific_to_one_subject() {
    // A second real subject, so the rule cannot be a hard-coded pair. BanzAI is used rather than the Root
    // because the Root has no deterministic definition record to reach — and coverage is not invented here
    // just to give this test a second case.
    let (kind, action, entry, _) = follow("What is an implementation?", "And BanzAI?");
    assert_eq!(kind, "FRAME_CARRY");
    assert_eq!(action, "deterministic");
    assert_eq!(entry.as_deref(), Some("def-banzai-agent"));
}

#[test]
fn portuguese_and_english_reach_the_same_fact() {
    let pt = follow("O que é uma implementação?", "E um operador?");
    let en = follow("What is an implementation?", "And an operator?");
    assert_eq!(pt.2, en.2, "same record");
    assert_eq!(pt.1, en.1, "same answer policy");
    assert_eq!(pt.0, en.0, "same merge decision");
}

// ── What must NOT be inherited ────────────────────────────────────────────────────────────────────

#[test]
fn a_procedure_does_not_lend_its_shape_to_a_new_subject() {
    // "Como demonstrar conformidade?" → "E um operador?" must not become "how to demonstrate an operator".
    // A procedure is about doing something; a subject is not a way of doing it.
    let (kind, _, entry, used) = follow("Como demonstrar conformidade?", "E um operador?");
    assert_eq!(kind, "STANDALONE", "a procedure frame is not reusable");
    assert!(!used);
    assert_ne!(entry.as_deref(), Some("how-to-demonstrate-conformance"));
}

#[test]
fn a_lifecycle_question_does_not_lend_its_shape_either() {
    // "O BANZA está em produção?" → "E um operador?" must not become "is an operator in production?".
    let (kind, _, _, used) = follow("O BANZA está em produção?", "E um operador?");
    assert_eq!(kind, "STANDALONE");
    assert!(!used);
}

#[test]
fn with_no_prior_turn_nothing_is_inherited() {
    let cr = route_with_context("E um operador?", &[]);
    assert_eq!(cr.merge_kind, "STANDALONE");
    assert!(!cr.context_used);
    assert_eq!(cr.route.action, "insufficient", "no context, no frame");
}

#[test]
fn a_prior_that_resolved_nothing_has_no_frame_to_lend() {
    // "O que é a certification?" IS a definition question naming a real subject, and it still resolves
    // nothing. A question form that never produced an answer must not be handed to the next subject, so
    // this declines explicitly rather than silently behaving like STANDALONE — two different decisions
    // must not share one label.
    for prev in ["O que é a certification?", "What is certification?"] {
        let (kind, action, _, used) = follow(prev, "E um operador?");
        assert_eq!(kind, "FRAME_CARRY_DECLINED", "after {prev:?}");
        assert!(!used);
        assert_eq!(action, "insufficient");
    }
}

#[test]
fn ellipsis_is_structural_and_never_a_length_test() {
    // A short question that is COMPLETE must not be treated as a continuation. It carries its own
    // interrogative, so there is nothing to inherit, and it resolves on its own terms.
    let (kind, _, _, _) = follow("O que é uma implementação?", "O que é um operador?");
    assert_eq!(
        kind, "STANDALONE",
        "a complete question is not an ellipsis, however short"
    );
}

#[test]
fn a_format_request_is_still_a_format_request() {
    // The regression from the eligibility work, re-run here because this file changed the same merge path:
    // "mostra em JSON" asks for the previous answer rendered differently. JSON is nameable vocabulary, and
    // it must still not become the new topic.
    let (kind, _, entry, used) = follow(
        "me da um exemplo de um ficheiro manifesto",
        "mostra em JSON",
    );
    assert_eq!(kind, "SUBJECT_CARRY");
    assert!(used);
    assert_eq!(entry.as_deref(), Some("example-operator-manifest"));
}
