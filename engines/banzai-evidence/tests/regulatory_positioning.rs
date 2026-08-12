//! BX1.8A — protocol boundary & regulatory positioning. The Assistente answers (never `uncertain`,
//! never a forbidden claim) that BANZA is an open protocol, NOT a PSP / payment service provider; that it
//! does not process/settle/move/hold funds; that any licence/authorisation belongs to the operator that
//! provides real financial services; and that BANZA does not authorise operators. No "corpus" / no public
//! "KB".

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
fn banza_does_not_need_a_psp_licence() {
    let (text, a) = full("BANZA precisa de licença?");
    assert_eq!(a.kind, "answer");
    assert_ne!(a.intent, "unknown");
    assert!(
        text.contains("protocolo financeiro aberto"),
        "must frame BANZA as an open financial protocol"
    );
    assert!(
        text.contains("pertence ao operador"),
        "must say the licence belongs to the operator"
    );
    assert!(!text.contains("corpus"));
    assert!(!a.text.contains(" KB "));
    assert_eq!(a.llm_calls, 0);
    assert!(!a.external_model_called);
}

#[test]
fn banza_is_not_a_psp() {
    let (text, _) = full("BANZA é PSP?");
    assert!(text.contains("não é psp"), "must deny BANZA is a PSP");
    assert!(text.contains("protocolo"));
}

#[test]
fn banza_does_not_process_payments() {
    let (text, _) = full("BANZA processa pagamentos?");
    assert!(text.starts_with("não") || text.contains("não processa"));
    assert!(
        text.contains("operadores") || text.contains("operador"),
        "must point processing to operators"
    );
}

#[test]
fn who_needs_a_licence_points_to_operators() {
    let (text, _) = full("Quem precisa de licença?");
    assert!(
        text.contains("operador")
            && (text.contains("serviços financeiros") || text.contains("servicos financeiros")),
        "must point the licence to operators providing real financial services"
    );
}

/// M2.2 — BANZA authorises operators neither technically nor regulatorily: the central authority concept
/// is gone, and real financial authorisation belongs to the competent regulator.
#[test]
fn banza_does_not_authorise_operators() {
    let (text, a) = full("BANZA CA autoriza operadores?");
    assert_eq!(a.intent, "banza_ca_not_regulator");
    assert!(
        text.contains("não") && text.contains("regulat"),
        "must deny regulatory authority"
    );
    assert!(
        text.contains("não autoriza operadores"),
        "must deny authorising operators outright"
    );
    assert!(
        text.contains("autoridade humana central"),
        "must state participation needs no central human authority"
    );
    assert!(
        text.contains("regulador competente"),
        "must point real authorisation at the competent regulator"
    );
}

#[test]
fn l2_readiness_is_not_a_real_payment() {
    // BX1.8 intent still answers correctly under the hardened language.
    let (text, _) = full("L2 readiness é pagamento real?");
    assert!(text.contains("não é pagamento real") || text.contains("não move fundos"));
}

#[test]
fn banza_does_not_move_or_hold_funds() {
    let (text, _) = full("BANZA movimenta fundos?");
    assert!(text.contains("não movimenta fundos") || text.contains("não move fundos"));
    let (text2, _) = full("BANZA detém fundos?");
    assert!(
        text2.contains("não detém fundos") || text2.contains("não") && text2.contains("fundos")
    );
}
