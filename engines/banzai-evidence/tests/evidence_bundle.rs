//! BX1.5 — Evidence Bundle knowledge. The Assistente must answer (never `uncertain`, never a forbidden
//! claim) that the bundle is technical evidence, explain readiness/blockers, and state it is not a
//! certificate/approval — nobody approves operators by central human decision. Deterministic: llm_calls = 0.

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

const BUNDLE_QUESTIONS: &[&str] = &[
    "Este bundle está pronto para revisão?",
    "O que falta no meu evidence bundle?",
    "Este bundle é certificado?",
    "O que é um evidence bundle?",
];

#[test]
fn bundle_questions_are_answered_as_technical_evidence() {
    for &q in BUNDLE_QUESTIONS {
        let (text, a) = full(q);
        assert_ne!(
            a.kind, "uncertain",
            "`{q}` must not be uncertain (kind={})",
            a.kind
        );
        assert!(
            text.contains("evidência técnica") || text.contains("não é certificado"),
            "`{q}` must frame the bundle as technical evidence, not a certificate"
        );
        // M2.2 — the bundle is verifiable evidence; no central human authority approves it.
        assert!(
            text.contains("humana central") || text.contains("evidência verificável"),
            "`{q}` must state no central human authority approves"
        );
        assert!(
            !text.contains("banza ca"),
            "`{q}` must not name the removed central authority as the decider"
        );
        assert!(!a.links.is_empty(), "`{q}` must carry a citation");
        assert_eq!(a.llm_calls, 0, "`{q}`");
        assert!(!a.external_model_called, "`{q}`");
    }
}

#[test]
fn bundle_answer_never_claims_certification() {
    let (text, _) = full("Este bundle é certificado?");
    // must not affirm the bundle IS a certificate / approved
    assert!(!text.contains("o bundle é certificado."));
    assert!(!text.contains("bundle aprovado"));
    assert!(
        text.contains("não é certificado")
            || text.contains("não é aprovação")
            || text.contains("evidência técnica")
    );
}

// ── BX1.5A — "Evidence Bundle Export" is answered (never fallback) and copy has no "corpus" ──

const BUNDLE_EXPORT_QUESTIONS: &[&str] = &[
    "o que é Evidence Bundle Export?",
    "o que é Evidence Bundle?",
    "para que serve o Evidence Bundle?",
    "o que vai no Evidence Bundle?",
    "Evidence Bundle é uma aprovação?",
    "posso usar Evidence Bundle para publicar evidência de conformidade?",
    "como preparar Evidence Bundle?",
];

#[test]
fn evidence_bundle_export_is_answered_not_fallback() {
    for &q in BUNDLE_EXPORT_QUESTIONS {
        let a = answer(q);
        assert_eq!(
            a.kind, "answer",
            "`{q}` must be answered, got kind={} intent={}",
            a.kind, a.intent
        );
        assert_ne!(a.intent, "unknown", "`{q}` must not hit the fallback");
    }
}

#[test]
fn evidence_bundle_answer_has_expected_shape() {
    let (text, a) = full("o que é Evidence Bundle Export?");
    assert!(
        text.contains("evidência técnica"),
        "must frame as technical evidence"
    );
    assert!(
        text.contains("humana central") || text.contains("evidência verificável"),
        "must state no central human authority approves"
    );
    assert!(
        text.contains("simb") && text.contains("l0"),
        "must list SimB + L0"
    );
    assert!(
        text.contains("trust") || text.contains("trace"),
        "must mention Trace/Trust"
    );
    assert!(text.contains("hash"), "must mention hashes");
    assert!(!a.links.is_empty());
    assert_eq!(a.llm_calls, 0);
    assert!(!a.external_model_called);
}

#[test]
fn no_answer_uses_the_word_corpus() {
    // BX1.5A language rule: the word "corpus" must not appear in any assistant answer text.
    let queries = [
        "Qual é a tua cor favorita?",       // fallback
        "O que é o BanzAI?",                // what-is-banzai
        "Qual é o preço do dólar?",         // out-of-scope market data
        "o que é Evidence Bundle Export?",  // bundle
        "Como funciona o fluxo do BanzAI?", // flow
    ];
    for q in queries {
        let (text, a) = full(q);
        assert!(
            !text.contains("corpus"),
            "`{q}` answer must not contain 'corpus': {}",
            a.text
        );
    }
}
