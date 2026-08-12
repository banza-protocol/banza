//! M2.0A — Open Financial Protocol Identity. The Assistente affirms, by the positive, that BANZA is and
//! will remain an OPEN FINANCIAL PROTOCOL. It is not (and in the project's positioning cannot become) a
//! financial operator, PSP, bank, wallet or financial-services provider; it does not process/settle/move/
//! hold funds. Operators are separate entities that implement the protocol and provide the financial
//! services. "protocolo financeiro aberto" is the preferred framing; "técnico" is only a distinguishing
//! qualifier. No "corpus" / no public "KB".

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

#[test]
fn banza_is_not_a_financial_operator() {
    let (t, a) = full("BANZA é operador financeiro?");
    assert_eq!(a.intent, "banza_open_financial_protocol");
    assert_eq!(a.kind, "answer");
    assert!(t.contains("protocolo financeiro aberto"));
    assert!(t.contains("não é operador financeiro"));
    assert!(!t.contains("corpus"));
    assert!(!a.text.contains(" KB "));
    assert_eq!(a.llm_calls, 0);
}

#[test]
fn banza_cannot_become_a_financial_operator_in_the_positioning() {
    let (t, a) = full("BANZA pode virar operador financeiro?");
    assert_eq!(a.intent, "banza_open_financial_protocol");
    assert!(t.contains("permanente") || t.contains("continuará a ser"));
    assert!(t.contains("entidades separadas") || t.contains("entidade separada"));
    assert!(t.contains("protocolo financeiro aberto"));
}

#[test]
fn technical_is_only_a_distinguishing_qualifier() {
    let (t, a) = full("BANZA é protocolo técnico?");
    assert_eq!(a.intent, "banza_open_financial_protocol");
    assert!(t.contains("protocolo financeiro aberto"));
    assert!(t.contains("técnico"));
}

#[test]
fn who_provides_financial_services_points_to_operators() {
    let (t, a) = full("Quem presta os serviços financeiros?");
    assert_eq!(a.intent, "banza_open_financial_protocol");
    assert!(t.contains("operadores"));
    assert!(t.contains("implementam o protocolo"));
}

#[test]
fn m2_does_not_make_banza_a_psp() {
    let (t, a) = full("M2 transforma BANZA em PSP?");
    assert_eq!(a.intent, "m2_production");
    assert!(t.contains("protocolo financeiro aberto"));
    assert!(t.contains("produção do protocolo") || t.contains("producao do protocolo"));
    assert!(
        t.contains("não")
            && (t.contains("psp") || t.contains("prestador") || t.contains("operação financeira"))
    );
}

#[test]
fn what_is_banza_leads_with_open_financial_protocol() {
    let (t, a) = full("o que é o BANZA?");
    assert_eq!(a.intent, "what_is_banza");
    assert!(t.contains("protocolo financeiro aberto"));
}

#[test]
fn existing_regulatory_intents_are_not_stolen() {
    // the new identity intent must not steal the banza_not_psp / regulator questions.
    assert_eq!(answer("BANZA é PSP?").intent, "banza_not_psp");
    assert_eq!(answer("BANZA precisa de licença?").intent, "banza_not_psp");
    assert_eq!(answer("Quem precisa de licença?").intent, "banza_not_psp");
    assert_eq!(
        answer("BANZA CA autoriza operadores?").intent,
        "banza_ca_not_regulator"
    );
    assert_eq!(answer("Posso entrar em produção?").intent, "m2_m3_status");
}
