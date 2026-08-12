//! BX2.1–BX2.4 — Deep Assurance knowledge. The Assistente answers (never `uncertain`, never a forbidden
//! positive claim) that Deep Assurance is the DEEPENING of an INTERNAL security/risk evaluation across
//! four tracks: it does not mean an external audit is complete, is not certification, not a licence, does
//! not activate federation or external integration, does not move funds, and does not turn BANZA into a
//! PSP. BANZA stays an open protocol and the licence belongs to the operator. Deep queries must route to
//! `deep_assurance`, not to the BX2.0 `security_assurance` intent nor to the trust/BRL/federation intents.

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

const DEEP_QUERIES: &[&str] = &[
    "o que é deep assurance?",
    "explica os abuse cases",
    "o que são attack scenarios?",
    "o que é a trust ceremony?",
    "o que é a política de gestão de chaves?",
    "o que é o BRL revocation playbook?",
    "o que é o incident response plan?",
    "o que é a matriz de severidade SEV-1?",
    "o que é o registo de risco operacional?",
    "o que é deployment drift?",
    "o que é external audit readiness?",
    "o que é o audit evidence index?",
    "o que é a revisão pré-auditoria?",
];

#[test]
fn deep_queries_route_to_deep_assurance() {
    for &q in DEEP_QUERIES {
        let (_text, a) = full(q);
        assert_eq!(
            a.intent, "deep_assurance",
            "`{q}` must route to deep_assurance"
        );
        assert_eq!(a.kind, "answer", "`{q}` must be answered");
        assert!(!a.links.is_empty());
        assert_eq!(a.llm_calls, 0);
        assert!(!a.external_model_called);
    }
}

#[test]
fn deep_assurance_denies_completed_audit_and_production() {
    let (text, a) = full("Deep Assurance significa que a auditoria externa está concluída?");
    assert_eq!(a.intent, "deep_assurance");
    assert!(
        text.contains("não é auditoria externa concluída")
            || text.contains("auditoria externa não foi realizada"),
        "must deny a completed external audit"
    );
    assert!(text.contains("não é produção") || text.contains("nao e producao"));
}

#[test]
fn deep_assurance_does_not_certify_or_licence_or_psp() {
    let (text, _) = full("o que é deep assurance?");
    assert!(text.contains("não é certificação"));
    assert!(text.contains("não é licença"));
    assert!(
        text.contains("não transforma") && (text.contains("psp") || text.contains("prestador"))
    );
    assert!(text.contains("protocolo aberto"));
    assert!(text.contains("pertence ao operador"));
    assert!(!text.contains("corpus"));
}

#[test]
fn deep_assurance_mentions_rust_and_pre_audit() {
    let (text, _) = full("o que é a revisão pré-auditoria?");
    assert!(text.contains("rust") || text.contains("validate_deep_assurance"));
    assert!(text.contains("pré-auditoria") || text.contains("pre-auditoria"));
}

#[test]
fn bx20_assurance_still_routes_to_security_assurance() {
    // adding the deep intent must NOT steal the BX2.0 assurance questions.
    for &q in &[
        "o que é Security & Risk Assurance?",
        "o que é threat model?",
        "o que falta antes de produção?",
        "isto é auditoria externa?",
    ] {
        assert_eq!(
            answer(q).intent,
            "security_assurance",
            "`{q}` must stay on security_assurance"
        );
    }
}
