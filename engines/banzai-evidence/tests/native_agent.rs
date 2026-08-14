//! M2.7H — BanzAI as native protocol agent. The engine must present BanzAI as the guidance/
//! orchestration agent (never authority/rule-source), answer the "quem faz o quê" questions to the
//! active model, and enforce rule provenance (no invented rules; a missing rule is declared, not
//! filled; a suggestion is a proposal, not an active rule). Deterministic: llm_calls = 0,
//! external_model_called = false for every case.

use banzai_evidence::answer;

fn lc(s: &str) -> String {
    s.to_lowercase()
}
fn full(q: &str) -> (String, banzai_evidence::KbAnswer) {
    let a = answer(q);
    let mut t = a.text.clone();
    if let Some(l) = &a.limits {
        t.push(' ');
        t.push_str(&l.join(" "));
    }
    (lc(&t), a)
}

fn assert_deterministic(a: &banzai_evidence::KbAnswer) {
    assert_eq!(a.llm_calls, 0, "llm_calls must be 0");
    assert!(
        !a.external_model_called,
        "external_model_called must be false"
    );
    assert_ne!(a.kind, "uncertain", "agent questions must not be uncertain");
}

#[test]
fn banzai_is_the_native_protocol_agent() {
    let (t, a) = full("BanzAI é agente do protocolo?");
    assert_deterministic(&a);
    assert!(t.contains("agente"), "should affirm agent role: {t}");
    assert!(
        t.contains("não") && (t.contains("normativa") || t.contains("autoridade")),
        "should deny normative/authority: {t}"
    );
}

#[test]
fn banzai_is_not_an_adjacent_system() {
    // The retired pre-ADR-042 framing must be corrected, not affirmed.
    let (t, a) = full("BanzAI é um sistema adjacente?");
    assert_deterministic(&a);
    assert_eq!(
        a.intent, "banzai_not_adjacent",
        "must hit the correction intent: {t}"
    );
    assert!(
        t.contains("não") && (t.contains("adjacente")),
        "should deny the adjacent-system framing: {t}"
    );
    assert!(
        t.contains("agente") && (t.contains("nativo") || t.contains("orquestra")),
        "should reaffirm native agent role: {t}"
    );
}

#[test]
fn who_approves_operators_no_central_authority() {
    let (t, a) = full("Quem aprova operadores?");
    assert_deterministic(&a);
    assert!(
        t.contains("não são aprovados")
            || t.contains("nao sao aprovados")
            || t.contains("demonstram"),
        "no central approval: {t}"
    );
    assert!(
        t.contains("evidência verificável") || t.contains("evidencia verificavel"),
        "evidence: {t}"
    );
}

#[test]
fn who_verifies_is_the_engines() {
    let (t, a) = full("Quem verifica os resultados?");
    assert_deterministic(&a);
    assert!(
        t.contains("rust") && t.contains("wasm"),
        "engines verify: {t}"
    );
}

#[test]
fn who_licenses_is_outside_the_protocol() {
    let (t, a) = full("Quem licencia operadores?");
    assert_deterministic(&a);
    assert!(
        t.contains("entidades competentes") || t.contains("enquadramento legal"),
        "licence external: {t}"
    );
    assert!(
        t.contains("fora do") || t.contains("não é emitida") || t.contains("nao e emitida"),
        "outside protocol: {t}"
    );
}

#[test]
fn who_decides_federation_is_local_peers() {
    let (t, a) = full("Quem decide a federação?");
    assert_deterministic(&a);
    assert!(
        t.contains("localmente") || t.contains("par"),
        "peers decide locally: {t}"
    );
    assert!(
        t.contains("sem permissão central")
            || t.contains("sem permissao central")
            || t.contains("não há permissão")
            || t.contains("nao ha permissao"),
        "no central permission: {t}"
    );
}

#[test]
fn banzai_cannot_create_rules() {
    let (t, a) = full("BanzAI pode criar regras?");
    assert_deterministic(&a);
    assert!(
        t.contains("não") && t.contains("regras"),
        "denies creating rules: {t}"
    );
    assert!(
        t.contains("rfc") || t.contains("adr"),
        "points to RFC/ADR: {t}"
    );
}

#[test]
fn banzai_cannot_add_architectural_decision() {
    let (t, a) = full("BanzAI pode adicionar uma decisão arquitectural?");
    assert_deterministic(&a);
    assert!(t.contains("não"), "denies: {t}");
    assert!(
        t.contains("governança")
            || t.contains("governanca")
            || t.contains("adr")
            || t.contains("rfc"),
        "formal governance: {t}"
    );
}

#[test]
fn no_rule_fallback_declares_and_suggests() {
    let (t, a) = full("E se o protocolo não tiver regra para esse caso?");
    assert_deterministic(&a);
    assert!(
        t.contains("não está definida")
            || t.contains("nao esta definida")
            || t.contains("não há regra")
            || t.contains("nao ha regra"),
        "declares undefined: {t}"
    );
    assert!(
        t.contains("rfc") || t.contains("adr") || t.contains("proposta"),
        "suggests proposal: {t}"
    );
}

#[test]
fn suggestion_is_not_an_active_rule() {
    let (t, a) = full("Uma sugestão do BanzAI vira regra?");
    assert_deterministic(&a);
    assert!(t.contains("proposta"), "is a proposal: {t}");
    assert!(t.contains("não"), "not automatically a rule: {t}");
}

#[test]
fn who_creates_rules_is_governance() {
    let (t, a) = full("Quem cria regras do protocolo?");
    assert_deterministic(&a);
    assert!(
        t.contains("governança") || t.contains("governanca"),
        "governance: {t}"
    );
    assert!(t.contains("rfc") || t.contains("adr"), "via RFC/ADR: {t}");
}

#[test]
fn banzai_does_not_change_trust_model() {
    let (t, a) = full("BanzAI pode mudar o trust model?");
    assert_deterministic(&a);
    assert!(t.contains("não"), "denies: {t}");
    assert!(
        t.contains("governança")
            || t.contains("governanca")
            || t.contains("adr")
            || t.contains("rfc"),
        "formal process: {t}"
    );
}
