//! Questions that ASSERT something the protocol forbids.
//!
//! ```text
//! Porque é que BANZA certifica empresas?              banza    + certifica → who certifies, and what scope
//! Porque é que a Root certifica implementações?       root     + certifica → the Root's role is cryptographic
//! Porque é que certificação autoriza a operação?      certif.  + autoriza  → neither admission nor authorization
//! ```
//!
//! "Why does X do Y?" does not ask whether X does Y — it takes it as given and asks for the reason. Left to
//! generic synthesis, the honest thing to do with a premise is find sources that appear to support it, and
//! the answer comes back explaining a relation that does not exist.
//!
//! The correction is NOT a refusal. Each of these has a registered record that already states the boundary
//! the premise gets wrong, and the answer is that record: what certification IS bound to, whose role the
//! Root actually has, which decisions certification does and does not confer. Declining to answer would be
//! less true and less useful than saying what is actually the case.
//!
//! The rule is keyed on the STRUCTURED FRAME — a subject the engine resolves plus the action dimension the
//! turn states — so it generalises to paraphrases instead of matching sentences. Scope is deliberately
//! narrow: relations BANZA already owns a corrective fact for. This is not a presupposition engine, and a
//! relation with no corrective record is left exactly as it was.

use banzai_query_core::route::route;

const CERT: &str = "def-certification-actor";

fn entry(q: &str) -> Option<String> {
    route(q).entry_id
}
fn action(q: &str) -> String {
    route(q).action.to_string()
}

// ── A–E, the required matrix ──────────────────────────────────────────────────────────────────────

#[test]
fn a_the_operator_implementation_premise_is_corrected() {
    for q in [
        "Porque é que um operador e uma implementação são a mesma coisa?",
        "Why are an operator and an implementation the same thing?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(
            entry(q).as_deref(),
            Some("def-operator-vs-implementation"),
            "{q:?}"
        );
    }
}

#[test]
fn b_the_protocol_does_not_certify_companies() {
    // Two boundaries at once, and the record carries both: BANZA defines the certification function and
    // designates no universal certifying organization, and certifying evaluates a determined
    // implementation identified by its artifact — never a company.
    for q in [
        "Porque é que BANZA certifica empresas?",
        "Why does BANZA certify companies?",
    ] {
        assert_eq!(
            action(q),
            "deterministic",
            "{q:?}: no model for a settled boundary"
        );
        assert_eq!(entry(q).as_deref(), Some(CERT), "{q:?}");
    }
}

#[test]
fn c_the_root_is_not_the_certification_actor() {
    // The claim under correction is narrow and stays narrow: the Root's role is cryptographic, and it is
    // not the certifier of implementations. Not "the Root has nothing to do with trust".
    for q in [
        "Porque é que a Root certifica implementações?",
        "Why does the Root certify implementations?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(entry(q).as_deref(), Some(CERT), "{q:?}");
    }
}

#[test]
fn d_banzai_does_not_certify() {
    for q in [
        "Porque é que BanzAI certifica implementações?",
        "Why does BanzAI certify implementations?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(entry(q).as_deref(), Some("banzai-cannot-certify"), "{q:?}");
    }
}

#[test]
fn e_certification_does_not_authorize_operation() {
    // The premise is generic — "authorises operation" — so the answer must keep both separations rather
    // than picking one. The record names operational admission and regulatory authorization under their
    // own ADRs, which is why one record answers it without collapsing the two decisions.
    for q in [
        "Porque é que certificação autoriza automaticamente a operação?",
        "Why does certification automatically authorize operation?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(entry(q).as_deref(), Some(CERT), "{q:?}");
    }
}

#[test]
fn the_correction_generalises_beyond_the_sentences_it_was_built_from() {
    // Keyed on the frame, not on text: the same relation asked another way is the same relation. If this
    // ever fails, the rule has decayed into a list of sentences.
    for q in [
        "A BANZA certifica operadores?",
        "Does BANZA certify operators?",
        "A Root certifica implementações?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(entry(q).as_deref(), Some(CERT), "{q:?}");
    }
}

// ── A question is not an assertion ────────────────────────────────────────────────────────────────

#[test]
fn a_neutral_question_about_the_certification_actor_is_answered_not_corrected() {
    // "Who certifies an implementation?" asks; it asserts nothing. It reaches the same record — that is
    // the truthful answer — but by the path that always answered it, because the rule keys on the
    // subject of the forbidden relation and this question names none of them.
    for q in [
        "Quem certifica uma implementação?",
        "Who certifies an implementation?",
    ] {
        assert_eq!(action(q), "deterministic", "{q:?}");
        assert_eq!(entry(q).as_deref(), Some(CERT), "{q:?}");
    }
}

#[test]
fn a_neutral_question_about_the_root_still_reaches_root_semantics() {
    // Mentioning the Root must not drag an answer about certification into view.
    assert_eq!(
        entry("What do Root authorities do?").as_deref(),
        Some("def-root-authorization")
    );
    assert_eq!(
        entry("Quem controla a Root?").as_deref(),
        Some("def-root-authorization")
    );
}

#[test]
fn unrelated_questions_are_untouched_by_any_of_this() {
    // The two records nearest the correction, kept where they were: the definition, and the procedure that
    // shares its noun.
    assert_eq!(
        entry("O que é uma implementação?").as_deref(),
        Some("def-implementation")
    );
    assert_eq!(
        entry("Como demonstrar conformidade?").as_deref(),
        Some("how-to-demonstrate-conformance")
    );
}

#[test]
fn asking_who_performs_the_action_is_never_a_premise() {
    // The control that the actor test exists for, and it was found by a regression rather than foresight.
    // "quem criou o BANZA e quem certifica operadores?" names BANZA and states the verb, but BANZA is the
    // object of "criou" and the actor of "certifica" is the interrogative — the sentence asks, twice. It
    // must keep reaching the origin record.
    assert_eq!(
        entry("quem criou o BANZA e quem certifica operadores?").as_deref(),
        Some("protocol-origin"),
        "a question about who certifies is not an assertion that BANZA does"
    );
}

#[test]
fn a_relation_with_no_corrective_record_is_left_alone() {
    // The scope limit, stated as a test. "Why does an operator certify implementations?" states a relation
    // this table does not own, and nothing here invents a correction for it — it resolves however it
    // resolved before, which is the point of a narrow rule.
    let r = route("Porque é que um operador certifica implementações?");
    assert_ne!(
        r.entry_id.as_deref(),
        Some(CERT),
        "an unregistered relation must not borrow another relation's correction"
    );
}
