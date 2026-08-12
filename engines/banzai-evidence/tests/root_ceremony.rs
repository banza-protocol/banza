//! M2.1 — Root Trust Ceremony (2-of-3). The Assistente explains the ceremony (3 custodians, 1 root key
//! each, 2 signatures), the encrypted-pendrive backup rule, and denies that any private key goes to
//! GitHub/server/.env or that the root authorises payments / creates operators / issues licences / moves
//! funds. BANZA remains an open financial protocol. No "corpus" / no public "KB".

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

const CEREMONY_QUERIES: &[&str] = &[
    "o que é a root ceremony M2?",
    "por que 2-de-3?",
    "quem são os custodians?",
    "posso guardar root key em pendrive?",
    "a pendrive pode ter as 3 chaves?",
    "a root key pode ir para GitHub?",
    "a root key pode ir para servidor?",
    "a root key pode ficar em .env?",
    "a root key autoriza pagamentos?",
    "a root key cria operador?",
    "a root key emite licença?",
    "a root key move fundos?",
    "o que a root key assina?",
    "o que são chaves delegadas?",
    "qual é a diferença entre root key e release signing key?",
    "como testar recuperação?",
];

#[test]
fn ceremony_queries_route_to_root_ceremony() {
    for &q in CEREMONY_QUERIES {
        let (_t, a) = full(q);
        assert_eq!(
            a.intent, "root_ceremony",
            "`{q}` must route to root_ceremony"
        );
        assert_eq!(a.kind, "answer");
        assert!(!a.links.is_empty());
        assert_eq!(a.llm_calls, 0);
        assert!(!a.external_model_called);
    }
}

#[test]
fn explains_2of3_and_encrypted_pendrive() {
    let (t, _) = full("por que 2-de-3?");
    assert!(t.contains("2-de-3") || t.contains("2 assinaturas"));
    assert!(
        t.contains("três custodians") || t.contains("tres custodians") || t.contains("custodians")
    );
    assert!(t.contains("cifrado") || t.contains("cifrada"));
    assert!(!t.contains("corpus"));
}

#[test]
fn denies_private_key_in_github_server_env() {
    let (t, a) = full("a root key pode ir para GitHub?");
    assert_eq!(a.intent, "root_ceremony");
    assert!(t.contains("nunca") && t.contains("github"));
    assert!(t.contains("servidor") && t.contains(".env"));
    assert!(t.contains("público") || t.contains("publico"));
}

#[test]
fn denies_payment_operator_licence_fund_authority() {
    let (t, _) = full("a root key autoriza pagamentos?");
    assert!(t.contains("não autoriza pagamentos") || t.contains("nao autoriza pagamentos"));
    assert!(t.contains("não cria operador") || t.contains("nao cria operador"));
    assert!(
        t.contains("não emite licença")
            || t.contains("nao emite licenca")
            || t.contains("não emite licenca")
    );
    assert!(t.contains("protocolo financeiro aberto"));
}

#[test]
fn root_signs_metadata_delegated_keys_sign_releases() {
    let (t, _) = full("o que a root key assina?");
    assert!(t.contains("root metadata") && t.contains("revogação"));
    assert!(t.contains("delegadas") && (t.contains("releases") || t.contains("brl")));
}

#[test]
fn does_not_steal_trust_chain_question() {
    // the existing "chave raiz" trust-chain question must still route to trust_chain.
    assert_eq!(
        answer("Explica a cadeia de confiança e a chave raiz.").intent,
        "trust_chain"
    );
}
