//! One certification, three different questions about it.
//!
//! ```text
//! O que significa certificar uma implementação?   certification
//! Isso dá admissão automática?                    + operational admission   (ADR-006)
//! E autorização legal?                            + regulatory authorization (ADR-007)
//! ```
//!
//! This is the mirror image of the definition ellipsis, and keeping the two apart is the point. There, the
//! question stayed fixed and the SUBJECT moved. Here the subject stays fixed and the QUESTION moves: the
//! referent is the certification under discussion, and each turn asks about a different decision.
//!
//! It is also not the relational pair. Nothing is being compared; one thing is being asked about three
//! times. Three separate mechanisms, and a conversation that needed a single "context" feature would have
//! blurred all three into whichever one was written first.
//!
//! The protocol property underneath is non-propagation: certification confers neither operational
//! admission nor regulatory authorization, and those are separate decisions under separate records. A
//! context feature that let the answer drift from that would be worse than no context at all, which is why
//! the dimension is read from the CURRENT turn every time and never carried.

use banzai_query_core::route::route_with_context;

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

const PT1: &str = "O que significa certificar uma implementação?";
const EN1: &str = "What does certifying an implementation mean?";
const NON_PROPAGATION: &str = "def-certification-actor";

// ── The sequence ──────────────────────────────────────────────────────────────────────────────────

#[test]
fn certifying_an_implementation_is_answered_by_the_certification_fact() {
    // Not by the conformance procedure. The two share a domain noun, and before this the question about
    // what certifying MEANS was answered with instructions for demonstrating conformance.
    for q in [PT1, EN1] {
        let (_, action, entry, _) = conversation(&[q]);
        assert_eq!(action, "deterministic", "{q:?}");
        assert_eq!(entry.as_deref(), Some("def-l2-certification"), "{q:?}");
    }
}

#[test]
fn the_decision_dimension_changes_with_each_turn_in_both_languages() {
    for (first, admission, authorization) in [
        (PT1, "Isso dá admissão automática?", "E autorização legal?"),
        (
            EN1,
            "Does that automatically grant admission?",
            "And legal authorization?",
        ),
    ] {
        let (kind2, action2, entry2, used2) = conversation(&[first, admission]);
        assert_eq!(kind2, "CERT_DECISION_ADMISSION", "{admission:?}");
        assert!(
            used2,
            "{admission:?}: the referent came from the conversation"
        );
        assert_eq!(
            action2, "deterministic",
            "{admission:?}: no model for a settled boundary"
        );
        assert_eq!(entry2.as_deref(), Some(NON_PROPAGATION), "{admission:?}");

        let (kind3, action3, entry3, used3) = conversation(&[first, admission, authorization]);
        assert_eq!(
            kind3, "CERT_DECISION_AUTHORIZATION",
            "{authorization:?}: the previous decision must not carry"
        );
        assert!(used3);
        assert_eq!(action3, "deterministic");
        assert_eq!(entry3.as_deref(), Some(NON_PROPAGATION));
    }
}

#[test]
fn the_two_decisions_are_directional_and_never_inherited() {
    // Asked in either order, each turn reports the dimension IT states. This is the Block 4B rule for
    // actions: an explicit current action outranks the previous one, always.
    let after_admission =
        conversation(&[PT1, "Isso dá admissão automática?", "E autorização legal?"]);
    assert_eq!(after_admission.0, "CERT_DECISION_AUTHORIZATION");

    let after_authorization =
        conversation(&[PT1, "E autorização legal?", "Isso dá admissão automática?"]);
    assert_eq!(after_authorization.0, "CERT_DECISION_ADMISSION");
}

#[test]
fn the_answer_is_the_record_that_separates_the_two_decisions() {
    // Both dimensions resolve to the record that states non-propagation with each decision named under its
    // own ADR. Whatever the context layer does, it must land on the fact that keeps them apart.
    for turns in [
        vec![PT1, "Isso dá admissão automática?"],
        vec![PT1, "E autorização legal?"],
        vec![EN1, "Does that automatically grant admission?"],
        vec![EN1, "And legal authorization?"],
    ] {
        let (_, _, entry, _) = conversation(&turns);
        assert_eq!(entry.as_deref(), Some(NON_PROPAGATION), "{turns:?}");
    }
}

// ── When the referent is missing or wrong ─────────────────────────────────────────────────────────

#[test]
fn with_no_prior_turn_no_certification_is_invented() {
    for q in [
        "Isso dá admissão automática?",
        "Does that automatically grant admission?",
    ] {
        let (kind, action, entry, used) = conversation(&[q]);
        assert!(
            !kind.starts_with("CERT_DECISION"),
            "{q:?}: nothing to refer to"
        );
        assert!(!used);
        assert_eq!(action, "insufficient", "{q:?}");
        assert_ne!(entry.as_deref(), Some(NON_PROPAGATION));
    }
}

#[test]
fn a_prior_turn_about_something_else_is_not_a_certification_result() {
    // Lifecycle status is not a certification, however adjacent the conversation makes it. The referent
    // test asks what the previous turn RESOLVED TO, not what surrounded it.
    let (kind, _, entry, _) =
        conversation(&["O BANZA está em produção?", "Isso dá admissão automática?"]);
    assert!(
        !kind.starts_with("CERT_DECISION"),
        "lifecycle is not certification"
    );
    assert_ne!(entry.as_deref(), Some(NON_PROPAGATION));
}

#[test]
fn an_explicit_new_subject_still_outranks_the_referent() {
    // Block 4B, in the middle of a certification sequence: a turn that names a subject is about that
    // subject, and the certification referent does not hold it back.
    let (kind, _, entry, _) = conversation(&[PT1, "E um operador?"]);
    assert_eq!(kind, "FRAME_CARRY");
    assert_eq!(entry.as_deref(), Some("def-operator"));
}

// ── The other two mechanisms are untouched ────────────────────────────────────────────────────────

#[test]
fn the_definition_ellipsis_matrix_is_unchanged() {
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
        (
            &[
                "me da um exemplo de um ficheiro manifesto",
                "mostra em JSON",
            ],
            "SUBJECT_CARRY",
            Some("example-operator-manifest"),
        ),
    ];
    for (turns, kind, entry) in cases {
        let (k, _, e, _) = conversation(turns);
        assert_eq!(&k, kind, "{turns:?}");
        assert_eq!(e.as_deref(), *entry, "{turns:?}");
    }
}

#[test]
fn the_relational_pair_is_unchanged_and_stays_a_separate_mechanism() {
    let (kind, _, entry, _) = conversation(&[
        "O que é uma implementação?",
        "E um operador?",
        "São a mesma coisa?",
    ]);
    assert_eq!(
        kind, "RELATIONAL_PAIR",
        "a comparison is not a decision dimension"
    );
    assert_eq!(entry.as_deref(), Some("def-operator-vs-implementation"));

    // ...and a certification sequence never becomes one.
    let (cert_kind, _, _, _) = conversation(&[PT1, "Isso dá admissão automática?"]);
    assert_ne!(cert_kind, "RELATIONAL_PAIR");
}
