//! M2 — Production Protocol Implementation. The Assistente answers (never `uncertain`, never a forbidden
//! positive claim) that M2 implements the BANZA protocol for PRODUCTION as an OPEN PROTOCOL: it does not
//! activate operators, does not emit real production certificates, does not provide payment services, does
//! not move funds, and does not make BANZA a PSP; the licence belongs to the operator and protocol
//! confirms protocol conformance, not financial authorisation. M2 boundary/nature/gate queries route to
//! `m2_production` and must not steal the milestone question "Posso entrar em produção?" (m2_m3_status).
//! M2.5: the definitional/roadmap phrasing ("o que é M2?", "milestones M2/M3?") is reframed as a
//! roadmap/governance milestone and routes to `m2_m3_roadmap` (not an operator tool).

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

const M2_QUERIES: &[&str] = &[
    // "o que é M2?" is reframed as a roadmap milestone (m2_m3_roadmap) — see the dedicated test below.
    "M2 é produção?",
    "M2 activa operadores?",
    "M2 move fundos?",
    "o que falta para M2?",
    "o que é production protocol gate?",
    "qual é o papel da governação do protocolo em M2?",
    "quem precisa de licença em M2?",
    "M2 substitui auditoria externa?",
    "M2 substitui regulador?",
    "o que é a auto-publicação de operador em M2?",
    "o que é o production state model?",
];

#[test]
fn m2_queries_route_to_m2_production() {
    for &q in M2_QUERIES {
        let (_t, a) = full(q);
        assert_eq!(
            a.intent, "m2_production",
            "`{q}` must route to m2_production"
        );
        assert_eq!(a.kind, "answer", "`{q}` must be answered");
        assert!(!a.links.is_empty());
        assert_eq!(a.llm_calls, 0);
        assert!(!a.external_model_called);
    }
}

#[test]
fn m2_denies_psp_and_operator_activation_and_funds() {
    let (t, a) = full("M2 transforma BANZA em PSP?");
    assert_eq!(a.intent, "m2_production");
    // M2.0A: permanent-identity framing ("permanece protocolo financeiro aberto") over "não transforma".
    assert!(t.contains("permanece protocolo financeiro aberto"));
    assert!(t.contains("não activa operador"));
    assert!(t.contains("protocolo financeiro aberto"));
    assert!(t.contains("prestam os serviços financeiros") || t.contains("entidades separadas"));
    assert!(!t.contains("corpus"));
}

#[test]
fn m2_is_protocol_production_not_financial() {
    let (t, _) = full("M2 é produção?");
    assert!(t.contains("produção do protocolo") || t.contains("producao do protocolo"));
    assert!(
        t.contains("não")
            && (t.contains("operação financeira") || t.contains("serviços de pagamento"))
    );
    assert!(t.contains("rust") || t.contains("validate_m2_protocol_gate"));
}

#[test]
fn m2_keeps_operators_empty_and_certs_false() {
    let (t, _) = full("M2 activa operadores?");
    assert!(t.contains("/operators") && t.contains("[]"));
    assert!(t.contains("production_certificates"));
}

#[test]
fn milestone_question_still_routes_to_m2_m3_status() {
    // adding the m2_production intent must NOT steal the milestone question.
    assert_eq!(answer("Posso entrar em produção?").intent, "m2_m3_status");
}

/// M2.5 — "o que é M2?" / "milestones M2/M3?" are reframed as roadmap/governance milestones (not operator
/// tools), so they route to m2_m3_roadmap rather than m2_production; the boundary/nature/gate questions
/// above stay on m2_production, and "Posso entrar em produção?" stays on m2_m3_status.
#[test]
fn what_is_m2_is_reframed_as_a_roadmap_milestone() {
    assert_eq!(answer("o que é M2?").intent, "m2_m3_roadmap");
    assert_eq!(answer("milestones M2/M3?").intent, "m2_m3_roadmap");
}
