//! BX1.10 — L4 external-interoperability readiness knowledge. The Assistente answers (never `uncertain`,
//! never a forbidden claim) that L4 readiness is technical preparation of external interoperability: it is
//! not active external integration, not a licence, does not turn BANZA into a PSP, does not move funds, is
//! not certification; BANZA stays an open protocol and the licence belongs to the operator. No "corpus" /
//! no public "KB".

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

const L4_QUESTIONS: &[&str] = &[
    "o que é L4 readiness?",
    "que artefactos preciso para L4?",
    "o que é external interoperability profile?",
    "o que é version negotiation?",
    "o que é endpoint contract map?",
    "o que é error mapping?",
    "o que bloqueia L4?",
];

#[test]
fn l4_questions_are_answered_as_interop_preparation() {
    for &q in L4_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("preparação técnica"),
            "`{q}` must frame L4 as technical preparation"
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
fn l4_is_not_active_external_integration() {
    let (text, a) = full("L4 readiness é integração externa activa?");
    assert_eq!(a.intent, "l4_readiness");
    assert!(
        text.contains("não é integração externa activa"),
        "must deny active external integration"
    );
}

#[test]
fn l4_is_not_a_licence() {
    let (text, _) = full("L4 readiness é licença?");
    assert!(text.contains("não é licença"));
}

#[test]
fn l4_does_not_make_banza_a_psp() {
    let (text, a) = full("L4 transforma BANZA em PSP?");
    assert_eq!(a.intent, "l4_readiness");
    assert!(
        text.contains("não transforma") && (text.contains("psp") || text.contains("prestador")),
        "must deny that L4 turns BANZA into a PSP"
    );
    assert!(text.contains("protocolo aberto"));
    assert!(
        text.contains("licença pertence ao operador") || text.contains("pertence ao operador"),
        "must place the licence on the operator"
    );
}

#[test]
fn l4_real_integration_is_gated() {
    let (text, _) = full("posso validar integração externa real?");
    assert!(
        text.contains("local") || text.contains("fase futura") || text.contains("sem rede"),
        "real integration must be described as local/gated/future"
    );
}
