//! "Does BANZA require X?" is a question about X, and must be answered from X's own authority.
//!
//! This is the defect that produced the baseline's false claims. The frame has no definition lead and
//! five or six tokens, so every gate closed on it and it fell to grounding — where no subject resolved,
//! and the FactualPackage was assembled from the generic protocol-identity entry instead. The model
//! was then handed a normative question with ADR-001 in front of it, and answered from ADR-001.
//!
//! Measured against production at `src-14df955`:
//!
//!   `O BANZA exige um ledger?`   → "O BANZA não exige um ledger específico, pois os modelos
//!                                   subjacentes a qualquer sistema de pagamento [...] não são
//!                                   comercialmente distintivos"          (cites ADR-001)
//!   `Does BANZA require a ledger?` → "BANZA does not require a ledger as the underlying models are
//!                                     not commercially distinctive"      (cites ADR-001)
//!
//! Both contradict INV-LEDGER-001…005 and INV-WALLET-001 — every one of them severity `critical` — and
//! ADR-012. The corpus states the rule correctly in `financial-invariants`, and that entry was never
//! reached. Nine of the eighteen model answers in the baseline cited ADR-001 and nothing else, which is
//! what a subject that never resolved looks like from the outside.
//!
//! What is pinned here is the SUBJECT, not the wording of any answer: the question must reach the entry
//! that carries the concept's authority. What that entry says is the corpus's business, and it is
//! already right.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn a_requirement_question_reaches_the_concept_and_not_the_protocol_summary() {
    for (q, want) in [
        ("o banza exige um ledger", "def-ledger"),
        ("does banza require a ledger", "def-ledger"),
        ("o banza exige dupla entrada", "def-double-entry"),
        ("does banza require double entry", "def-double-entry"),
        ("o banza define idempotencia", "def-idempotency"),
        ("does banza define idempotency", "def-idempotency"),
    ] {
        assert_eq!(entry(q), want, "{q:?} is a question about {want}");
    }
}

#[test]
fn the_protocol_summary_is_never_the_answer_to_a_specific_claim() {
    // The precise regression. `what-is-banza` carries ADR-001, and ADR-001 has an answer for every
    // question and evidence for none of these.
    for q in [
        "o banza exige um ledger",
        "does banza require a ledger",
        "o banza faz settlement",
        "does banza do settlement",
        "o banza guarda saldos",
        "does banza store balances",
    ] {
        assert_ne!(
            entry(q),
            "what-is-banza",
            "{q:?} must not be answered from the protocol-identity entry"
        );
    }
}

#[test]
fn a_named_artifact_can_hold_the_same_frame() {
    // `o que é BCJ/1?` already answered, and its answer contains the duplicate-member rule. The
    // question that asks for exactly that rule was refused, because its shape had no gate.
    assert_eq!(entry("o bcj/i aceita chaves duplicadas"), "def-bcj");
    assert_eq!(entry("does bcj/i accept duplicate keys"), "def-bcj");
}

#[test]
fn a_term_does_not_depend_on_which_language_asks() {
    // `word("balance")` did not match "balances", while Portuguese "saldos" was caught by a substring
    // arm further down — so one language resolved and the other did not, for the same question.
    assert_eq!(entry("o banza guarda saldos"), "def-balance");
    assert_eq!(entry("does banza store balances"), "def-balance");
}
