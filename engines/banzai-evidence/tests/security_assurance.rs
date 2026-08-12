//! BX2.0 — Security & Risk Assurance knowledge. The Assistente answers (never `uncertain`, never a
//! forbidden claim) that assurance is an INTERNAL security/risk evaluation: it does not mean BANZA is
//! production-ready, is not an external audit, not certification, not a licence, and does not turn BANZA
//! into a PSP; BANZA stays an open protocol and the licence belongs to the operator. No "corpus" / no
//! public "KB".

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

const ASSURANCE_QUESTIONS: &[&str] = &[
    "o que é Security & Risk Assurance?",
    "o que é threat model?",
    "o que é risk register?",
    "o que é controls matrix?",
    "o que falta antes de produção?",
];

#[test]
fn assurance_questions_are_answered_as_internal_evaluation() {
    for &q in ASSURANCE_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("avaliação interna"),
            "`{q}` must frame assurance as an internal evaluation"
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
fn assurance_does_not_mean_production_ready() {
    let (text, a) = full("isto significa que BANZA está pronto para produção?");
    assert_eq!(a.intent, "security_assurance");
    assert!(
        text.contains("não significa") || text.contains("não é produção"),
        "must deny production readiness"
    );
    assert!(
        text.contains("auditoria externa"),
        "must point to external audit before production"
    );
}

#[test]
fn assurance_is_not_external_audit_certificate_or_licence() {
    let (text, _) = full("isto é auditoria externa?");
    assert!(text.contains("não é auditoria externa"));
    assert!(text.contains("não é certificação"));
    assert!(text.contains("não é licença"));
}

#[test]
fn assurance_does_not_make_banza_a_psp() {
    let (text, a) = full("BANZA vira PSP com assurance?");
    assert_eq!(a.intent, "security_assurance");
    assert!(
        text.contains("não transforma") && (text.contains("psp") || text.contains("prestador")),
        "must deny that assurance makes BANZA a PSP"
    );
    assert!(text.contains("protocolo aberto"));
    assert!(text.contains("pertence ao operador"));
}
