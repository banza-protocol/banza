//! BX1.9 — L3 federation readiness knowledge. The Assistente answers (never `uncertain`, never a
//! forbidden claim) that L3 readiness is technical preparation of federation between two simulated
//! operators: it is not active federation, does not move funds, is not certification, lists the L3
//! artifacts, keeps validation local (no real federation by default), and defers the real decision to the
//! the M3 milestone plus verifiable evidence. No "corpus" / no public "KB".

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

const L3_QUESTIONS: &[&str] = &[
    "o que é L3 readiness?",
    "que artefactos preciso para L3?",
    "o que é federation intent?",
    "o que é cross-operator trace?",
    "o que bloqueia L3?",
];

#[test]
fn l3_questions_are_answered_as_federation_preparation() {
    for &q in L3_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("preparação técnica"),
            "`{q}` must frame L3 as technical preparation"
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
fn l3_is_not_active_federation() {
    let (text, a) = full("L3 readiness é federação activa?");
    assert_eq!(a.intent, "l3_readiness");
    assert!(
        text.contains("não é federação activa"),
        "must deny that L3 is active federation"
    );
    assert!(text.contains("não move fundos") || text.contains("não movimenta fundos"));
}

#[test]
fn l3_is_not_a_certificate() {
    let (text, _) = full("L3 readiness é certificado?");
    assert!(text.contains("não é certificação"));
    assert!(!text.contains("l3 é certificado."));
}

#[test]
fn l3_real_federation_is_gated() {
    let (text, _) = full("posso validar federação real?");
    assert!(
        text.contains("local")
            || text.contains("fase futura")
            || text.contains("sem rede")
            || text.contains("m3"),
        "real federation must be described as local/gated/future"
    );
}
