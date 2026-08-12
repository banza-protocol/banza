//! BX1.4 — SimB Pre-Review Gate knowledge. The Assistente must answer (never `uncertain`, never a
//! forbidden claim) that SimB is a mandatory technical pre-validation step, that a SimB PASS is
//! technical evidence and not certification, and that nobody approves operators centrally.
//! Deterministic: llm_calls = 0, external_model_called = false.

use banzai_evidence::answer;

fn full(q: &str) -> (String, banzai_evidence::KbAnswer) {
    let a = answer(q);
    let mut t = a.text.to_lowercase();
    if let Some(l) = &a.limits {
        t.push(' ');
        t.push_str(&l.join(" ").to_lowercase());
    }
    (t, a)
}

const OBLIGATION_QUESTIONS: &[&str] = &[
    "SimB é obrigatório?",
    "Posso ir para revisão sem SimB?",
    "O operador pode publicar evidência de conformidade sem passar por SimB?",
    "Se SimB falhar posso continuar?",
    "O que preciso antes de publicar evidência?",
    "O que é o SimB Pre-Review Gate?",
];

#[test]
fn obligation_questions_are_answered_with_the_gate_rule() {
    for &q in OBLIGATION_QUESTIONS {
        let (text, a) = full(q);
        assert_ne!(
            a.kind, "uncertain",
            "`{q}` must not be uncertain (kind={})",
            a.kind
        );
        assert!(
            text.contains("obrigat"),
            "`{q}` must state SimB is mandatory"
        );
        assert!(
            !text.contains("banza ca"),
            "`{q}` must not present a removed central authority as the decider"
        );
        assert!(
            text.contains("não é certificação") || text.contains("evidência técnica"),
            "`{q}` must state SimB PASS is technical evidence, not certification"
        );
        assert!(!a.links.is_empty(), "`{q}` must carry a citation");
    }
}

#[test]
fn simb_pass_is_not_a_certificate() {
    let (text, a) = full("SimB PASS é certificado?");
    assert_ne!(a.kind, "uncertain");
    assert!(text.contains("não é certificação") || text.contains("evidência técnica"));
    assert!(!text.contains("banza ca"));
    // must not affirm certification / approval
    assert!(!text.contains("simb certifica o operador"));
    assert!(!a.links.is_empty());
}

#[test]
fn gate_answers_are_deterministic_zero_llm() {
    for &q in OBLIGATION_QUESTIONS
        .iter()
        .chain(&["SimB PASS é certificado?"])
    {
        let a = answer(q);
        assert_eq!(a.llm_calls, 0, "`{q}`");
        assert!(!a.external_model_called, "`{q}`");
    }
}
