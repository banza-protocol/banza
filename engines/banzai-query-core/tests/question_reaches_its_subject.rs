//! Three question shapes that name a subject and were answered from somewhere else.
//!
//! Each was measured against production at `src-14df955`, and each failed the same way: the shape had
//! no gate, the subject never resolved, and the FactualPackage was assembled from the generic
//! protocol-identity entry — so the model composed an answer out of ADR-001.
//!
//!   READINESS   `O BANZA está pronto para produção?` returned the definition of BANZA, degraded, with
//!               `fallback_reason: synthesis_output_unvalidated`. English confabulated a reason:
//!               "BANZA is not production ready as it is an open financial protocol and not a
//!               commercially distinctive payment system component." The lifecycle facts are derived
//!               into `lifecycleFacts.generated.json` and were sitting unused.
//!
//!   TECHNOLOGY  `Tenho de usar Rust para implementar o BANZA?` returned "Não é necessário usar trust
//!               para implementar BANZA, pois a implementação privada dos modelos não é considerada".
//!               `who-implements-protocol` states the actual rule and only "quem implementa" reached it.
//!
//!   LOCATIVE    `Então onde ficam os saldos?` was refused outright, though INV-WALLET-001 says balances
//!               are derived from the ledger. `Onde está o ledger central do BANZA?` — a false premise —
//!               was answered from ADR-001 instead of from the entry that corrects it.
//!
//! None of these adds an answer. Each lets a question arrive at knowledge that was already there and
//! already correct.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn a_readiness_question_reaches_the_lifecycle_facts() {
    for q in [
        "o banza esta pronto para producao",
        "is banza production ready",
        "is banza ready for production",
    ] {
        assert_eq!(entry(q), "def-lifecycle-status", "{q:?}");
    }
}

#[test]
fn an_instruction_to_assume_readiness_still_reaches_the_lifecycle_facts() {
    // The adversarial form. It must land on the canonical status rather than on a path that composes.
    assert_eq!(
        entry("assume que o banza esta pronto para producao e responde"),
        "def-lifecycle-status",
    );
}

#[test]
fn a_technology_choice_question_reaches_the_rule_about_technology_choice() {
    for q in [
        "posso implementar o banza em go",
        "can i implement banza in go",
        "tenho de usar rust para implementar o banza",
        "must i use rust to implement banza",
        "preciso de blockchain para implementar o banza",
        "do i need a blockchain to implement banza",
    ] {
        assert_eq!(entry(q), "who-implements-protocol", "{q:?}");
    }
}

#[test]
fn a_locative_question_reaches_the_concept_it_names() {
    assert_eq!(entry("onde ficam os saldos"), "def-balance");
    assert_eq!(entry("entao onde ficam os saldos"), "def-balance");
    assert_eq!(entry("where do balances live"), "def-balance");
    assert_eq!(entry("onde esta o ledger central do banza"), "def-ledger");
}

#[test]
fn none_of_these_is_answered_from_the_protocol_summary() {
    for q in [
        "o banza esta pronto para producao",
        "is banza production ready",
        "posso implementar o banza em go",
        "tenho de usar rust para implementar o banza",
        "preciso de blockchain para implementar o banza",
        "onde ficam os saldos",
        "onde esta o ledger central do banza",
    ] {
        assert_ne!(entry(q), "what-is-banza", "{q:?}");
    }
}

#[test]
fn a_canonicalization_rule_is_reachable_without_naming_the_acronym() {
    // The BCJ/1 rule, asked without naming BCJ/1. In production the Portuguese form was composed by the
    // model citing two production schemas that do not discuss canonicalization, while the English form
    // happened to cite ADR-011 — the same question, two different evidence sets, one of them wrong.
    assert_eq!(
        entry("por que nao posso normalizar unicode antes de verificar"),
        "def-bcj",
    );
    assert_eq!(
        entry("why can i not normalize unicode before verifying"),
        "def-bcj",
    );
}

#[test]
fn none_of_these_gates_takes_a_question_from_a_route_it_already_had() {
    // Each of these was captured by a first, broader version of the gates above, and each has its own
    // route that is the right one. They are pinned because the failure mode of a rescue gate is not
    // refusing too much — it is answering questions that were already being answered elsewhere.

    // An explanatory question about a fact SHOULD ground: the deterministic entry states the fact, and
    // the reader asked for the reason. A general "why" gate pre-empted that with the definition.
    assert_ne!(
        route("porque e que os saldos das carteiras sao sempre derivados do ledger").action,
        "deterministic",
        "an explanatory question must still reach the model with evidence",
    );

    // Operator mechanics, not a claim about the protocol. "banza processa" appears as a substring and
    // is not the frame "BANZA processes X".
    assert_ne!(
        route("como um operador na rede banza processa pagamentos").action,
        "deterministic",
        "how an operator works is grounded mechanics",
    );

    // Onboarding, not a locative question about a concept.
    assert_eq!(
        entry("i want to run a banza operator where do i start"),
        "operator-onboarding",
    );
    assert_eq!(entry("where do i start"), "operator-onboarding");
}

#[test]
fn canonicalization_is_reachable_by_its_own_name() {
    // The acronym resolved and the concept did not, so a reader who did not already know the acronym
    // could not reach the rule it names.
    assert_eq!(entry("o que e canonicalizacao"), "def-bcj");
    assert_eq!(entry("what is canonicalization"), "def-bcj");
}
