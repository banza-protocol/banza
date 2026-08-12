//! BX1.6 — Operator Manifest knowledge. The Assistente answers (never `uncertain`, never a forbidden
//! claim) that manifest validation is technical evidence, does not create an operator and does not
//! certify. Deterministic: llm_calls = 0, no "corpus".

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

const MANIFEST_QUESTIONS: &[&str] = &[
    "o que é operator manifest?",
    "como validar o manifesto do operador?",
    "que campos são obrigatórios no manifest?",
    "porque key_manifest_url é necessário?",
];

#[test]
fn manifest_questions_are_answered() {
    for &q in MANIFEST_QUESTIONS {
        let (text, a) = full(q);
        assert_eq!(a.kind, "answer", "`{q}` must be answered, got {}", a.kind);
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
        assert!(
            text.contains("evidência técnica"),
            "`{q}` must frame as technical evidence"
        );
        assert!(
            text.contains("não cria operador"),
            "`{q}` must state it does not create an operator"
        );
        assert!(!text.contains("corpus"), "`{q}` must not use 'corpus'");
        assert!(!a.links.is_empty());
        assert_eq!(a.llm_calls, 0);
        assert!(!a.external_model_called);
    }
}

#[test]
fn valid_manifest_is_not_certification_nor_creates_operator() {
    let (text, _) = full("manifesto válido significa operador certificado?");
    assert!(text.contains("não certifica") || text.contains("evidência técnica"));
    assert!(text.contains("não cria operador"));
    // must not affirm certification
    assert!(!text.contains("manifesto certificado"));
    assert!(!text.contains("operador aprovado"));

    let (text2, _) = full("o manifesto cria operador em /operators?");
    assert!(text2.contains("não cria operador") || text2.contains("não altera /operators"));
}
