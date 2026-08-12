//! BX1.8 — L2 payment-flow readiness knowledge. The Assistente answers (never `uncertain`, never a
//! forbidden claim) that L2 readiness is technical preparation of a payment flow: it does not move funds,
//! is not a real payment, is not certification, lists the L2 artifacts, keeps URL validation local/gated,
//! and that nobody approves operators centrally. No "corpus" / no public "KB".

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

// L2-specific questions that must route to the l2_readiness intent. (Idempotency in general is owned by
// the dedicated `idempotency` intent; L2 explains it in the payment-flow context but does not claim the
// bare keyword.)
const L2_QUESTIONS: &[&str] = &[
    "o que é L2 readiness?",
    "que artefactos preciso para L2?",
    "o que é payment intent?",
    "porque ledger double-entry é necessário?",
    "porque trace_id é obrigatório?",
    "o que bloqueia L2?",
];

#[test]
fn l2_questions_are_answered_as_payment_preparation() {
    for &q in L2_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("preparação técnica"),
            "`{q}` must frame L2 as technical preparation"
        );
        assert!(
            !text.contains("banza ca"),
            "`{q}` must not present a removed central authority as the decider"
        );
        assert!(!text.contains("corpus"), "`{q}` must not use 'corpus'");
        assert!(!a.text.contains(" KB "), "`{q}` must not use public 'KB'");
        assert!(!a.links.is_empty());
        assert_eq!(a.llm_calls, 0);
        assert!(!a.external_model_called);
    }
}

#[test]
fn l2_is_not_a_real_payment() {
    let (text, a) = full("L2 readiness é pagamento real?");
    assert_eq!(a.intent, "l2_readiness");
    assert!(
        text.contains("não é pagamento real") || text.contains("não move fundos"),
        "must deny that L2 is a real payment"
    );
    assert!(text.contains("não move fundos") || text.contains("não movimenta fundos"));
}

#[test]
fn l2_is_not_a_certificate() {
    let (text, _) = full("L2 readiness é certificado?");
    assert!(text.contains("não é certificação"));
    assert!(!text.contains("l2 é certificado."));
}

#[test]
fn l2_url_validation_is_local_by_default() {
    let (text, _) = full("posso validar URL de operador em L2?");
    assert!(
        text.contains("local") || text.contains("fase futura") || text.contains("sem rede"),
        "URL validation must be described as local/gated"
    );
}
