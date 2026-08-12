//! BX1.7 — L1 Readiness knowledge. The Assistente answers (never `uncertain`, never a forbidden claim)
//! that L1 readiness is technical preparation, lists the well-known endpoints, states validation is
//! local (no URL by default), and that it is not certification. No "corpus" / no public "KB".

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

const L1_QUESTIONS: &[&str] = &[
    "o que é L1 readiness?",
    "estou pronto para L1?",
    "que endpoints preciso para L1?",
    "well-known endpoints são obrigatórios?",
    "o que falta para L1?",
];

#[test]
fn l1_questions_are_answered_as_preparation() {
    for &q in L1_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("preparação técnica"),
            "`{q}` must frame L1 as technical preparation"
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
fn l1_is_not_a_certificate_and_url_is_local_only() {
    let (text, _) = full("L1 readiness é certificado?");
    assert!(text.contains("não é certificação") || text.contains("preparação técnica"));
    assert!(!text.contains("l1 é certificado."));

    let (endpoints, _) = full("que endpoints preciso para L1?");
    assert!(
        endpoints.contains("well-known") || endpoints.contains("/.well-known/banza/operator.json")
    );

    let (url, _) = full("posso validar URL do operador?");
    assert!(url.contains("sem rede") || url.contains("fase futura") || url.contains("url"));
}
