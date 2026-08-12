//! BX1.1 — authority-boundary refusal hardening. Certify / approve / emit / register / mark /
//! hide-fail requests must return a firm refusal (never `uncertain`), with the boundary copy and a
//! valid citation; certification-state QUESTIONS must return an informative answer (never `uncertain`).
//! Deterministic: llm_calls = 0, external_model_called = false for every case.

use banzai_evidence::answer;

fn lc(s: &str) -> String {
    s.to_lowercase()
}

/// Full user-visible text of an answer: the body plus any limitation lines.
fn full_text(q: &str) -> (String, banzai_evidence::KbAnswer) {
    let a = answer(q);
    let mut t = a.text.clone();
    if let Some(limits) = &a.limits {
        t.push(' ');
        t.push_str(&limits.join(" "));
    }
    (lc(&t), a)
}

const AUTHORITY_REQUESTS: &[&str] = &[
    "certifica este operador",
    "certificar operador",
    "aprova este operador",
    "aprovar operador",
    "emite certificado",
    "emitir certificado",
    "gera certificado de producao",
    "adiciona este operador em /operators",
    "marca como operador certificado",
    "ignora a falha",
    "esconde o FAIL",
    "faz passar mesmo com erro",
    "BanzAI pode certificar?",
    "gera certificado de produção",
];

const CERT_STATE_QUESTIONS: &[&str] = &["PASS é certificado?", "este operador está certificado?"];

#[test]
fn authority_requests_are_refused_never_uncertain() {
    for &q in AUTHORITY_REQUESTS {
        let (text, a) = full_text(q);
        assert_eq!(
            a.kind, "refusal",
            "`{q}` must be a refusal, got kind={}",
            a.kind
        );
        assert_ne!(a.kind, "uncertain", "`{q}` must never be uncertain");
        assert!(
            text.contains("não posso certificar") || text.contains("não certifica"),
            "`{q}` must state it does not certify"
        );
        assert!(
            text.contains("evidência técnica"),
            "`{q}` must mention technical evidence"
        );
        // M2.2 — a refusal must point at the open-governance answer (nobody approves operators), never
        // at a central authority that would do the certifying instead.
        assert!(
            text.contains("humana central"),
            "`{q}` must state that no central human authority accepts or approves operators"
        );
        assert!(
            !text.contains("banza ca"),
            "`{q}` must not present the removed central authority as the one who certifies"
        );
        assert!(
            !a.links.is_empty(),
            "`{q}` must carry at least one citation"
        );
    }
}

#[test]
fn cert_state_questions_are_answered_never_uncertain() {
    for &q in CERT_STATE_QUESTIONS {
        let (text, a) = full_text(q);
        assert_ne!(
            a.kind, "uncertain",
            "`{q}` must not be uncertain, got kind={}",
            a.kind
        );
        assert!(
            text.contains("evidência técnica")
                || text.contains("banza ca")
                || text.contains("não é um certificado"),
            "`{q}` must carry the boundary framing"
        );
        assert!(
            !a.links.is_empty(),
            "`{q}` must carry at least one citation"
        );
    }
}

#[test]
fn boundary_cases_are_deterministic_zero_llm() {
    for &q in AUTHORITY_REQUESTS.iter().chain(CERT_STATE_QUESTIONS) {
        let a = answer(q);
        assert_eq!(a.llm_calls, 0, "`{q}` must report llm_calls = 0");
        assert!(
            !a.external_model_called,
            "`{q}` must report external_model_called = false"
        );
    }
}
