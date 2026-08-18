//! Authority-aware evidence: an institutional question must be grounded in the record that ESTABLISHES
//! the property it asks about, not in whatever text happens to share its words.
//!
//! The defect this protects against was measured, not imagined. "como é que a autoridade sobre operadores
//! está separada no BANZA?" resolved no concept at all, so the retrieval plan came back EMPTY and a
//! role-free lexical fallback decided — returning an infrastructure annex and `spec/overview.md` ahead of
//! the decisions that actually create the separation. The `SourceRole` tiers were never the problem: the
//! question never reached them.
//!
//! So the fix is not a score constant and not a document-type hierarchy. Each ACTION DIMENSION of an
//! authority question is bound to the record that establishes that dimension:
//!
//!   technical requirements / operator vs implementation  → ADR-002
//!   institutional separation of authority, protocol governance → ADR-004
//!   certification does not propagate to admission or licence → ADR-005
//!   operational admission and scheme governance → ADR-006
//!   regulatory authorisation, supervision, real money → ADR-007
//!
//! The subject alone must never be enough: "quem controla a Root?" and "o que controla a
//! canonicalização?" share the verb and must NOT be pulled into operator authority.
//!
//! Both legitimate Portuguese spellings — *governança* and *governação* — are supported. Block 2B closed
//! the gap this benchmark briefly recorded: see tests/concept_ambiguity.rs for why the first attempt made
//! the typo "governaca" ambiguous, and for the two separate fixes that resolved it.

use banzai_query_core::retrieval::plan_retrieval;

/// The concept the plan resolved, if any.
fn concept_of(question: &str) -> Option<String> {
    let plan = plan_retrieval(question, "");
    plan.concepts.first().cloned()
}

/// Every source the plan is allowed to draw evidence from.
fn allowed(question: &str) -> Vec<String> {
    let plan = plan_retrieval(question, "");
    plan.sources.iter().map(|s| s.source_id.clone()).collect()
}

fn establishes(question: &str, expected_doc: &str) {
    let c = concept_of(question);
    assert_eq!(
        c.as_deref(),
        Some(expected_doc),
        "{question:?} must be grounded in the record that establishes it"
    );
}

// ── PT: one case per action dimension ─────────────────────────────────────────────────────────────

#[test]
fn pt_authority_dimensions_resolve_to_their_establishing_record() {
    establishes(
        "como é que a autoridade sobre operadores está separada no BANZA?",
        "ADR-002",
    );
    establishes("quem controla os operadores?", "ADR-002");
    establishes("O BANZA controla os operadores?", "ADR-002");
    establishes("quem governa os operadores?", "ADR-004");
    establishes("quem governa o protocolo?", "ADR-004");
    // Restored after Block 2B: both legitimate Portuguese spellings reach the same record.
    establishes(
        "a governação do protocolo dá poder sobre os operadores?",
        "ADR-004",
    );
    establishes(
        "a governança do protocolo dá poder sobre os operadores?",
        "ADR-004",
    );
    establishes("quem governa o protocolo?", "ADR-004");
    establishes("quem certifica uma implementação?", "ADR-005");
    establishes("a certificação permite operar?", "ADR-005");
    establishes("quem admite um operador?", "ADR-006");
    establishes(
        "de quem depende a admissão de um participante a um esquema operacional?",
        "ADR-006",
    );
    establishes("quem autoriza um operador?", "ADR-007");
    establishes("quem supervisiona legalmente um operador?", "ADR-007");
    establishes(
        "que entidade decide se um operador pode operar com dinheiro real?",
        "ADR-007",
    );
}

// ── EN: the same architecture, not a second one ───────────────────────────────────────────────────

#[test]
fn en_authority_dimensions_resolve_to_the_same_records() {
    establishes(
        "How is authority over operators separated in BANZA?",
        "ADR-002",
    );
    establishes("Who controls operators?", "ADR-002");
    establishes("Does BANZA control operators?", "ADR-002");
    establishes("Who governs the protocol?", "ADR-004");
    establishes("Who certifies an implementation?", "ADR-005");
    establishes("Who admits an operator?", "ADR-006");
    establishes("Who authorizes an operator?", "ADR-007");
    establishes("Who authorises an operator?", "ADR-007");
    establishes("Who supervises an operator?", "ADR-007");
}

// ── The subject is decisive: a shared verb must not activate operator authority ────────────────────

#[test]
fn control_is_not_a_super_route() {
    for q in [
        "quem controla a Root?",
        "o que controla a canonicalização?",
        "Who controls the Root?",
    ] {
        let c = concept_of(q);
        assert!(
            c.as_deref() != Some("ADR-002") && c.as_deref() != Some("ADR-006"),
            "{q:?} is about a different entity and must not resolve to operator authority (got {c:?})"
        );
    }
}

// ── §9: an incidental schema must never be the sole basis for an institutional claim ──────────────

#[test]
fn an_institutional_claim_is_never_established_by_a_schema_alone() {
    for q in [
        "como é que a autoridade sobre operadores está separada no BANZA?",
        "quem governa o protocolo?",
        "quem admite um operador?",
        "How is authority over operators separated in BANZA?",
        "Who authorizes an operator?",
    ] {
        let src = allowed(q);
        assert!(!src.is_empty(), "{q:?} produced no evidence at all");
        let only_schemas = src
            .iter()
            .all(|s| s.ends_with(".schema.json") || s.contains("/production/"));
        assert!(
            !only_schemas,
            "{q:?} would rest entirely on contract/schema material: {src:?}. A schema defines a \
             representation; it does not establish who holds authority."
        );
        let has_decision = src.iter().any(|s| s.starts_with("ADR-"));
        assert!(
            has_decision,
            "{q:?} has no establishing decision among its sources: {src:?}"
        );
    }
}

// ── Positive controls: this must NOT have become "governance documents always win" ─────────────────

#[test]
fn a_schema_question_still_prefers_the_schema() {
    // A question about a published representation must be answered from the contract that defines it,
    // not from a decision record about governance.
    for q in [
        "qual é o schema do operator manifest?",
        "what fields does the operator manifest schema require?",
    ] {
        let src = allowed(q);
        if src.is_empty() {
            continue; // resolved by another path; this test only forbids the wrong preference
        }
        assert!(
            !src.iter().all(|s| s.starts_with("ADR-")),
            "{q:?} is a representation question and must not be answered only from decisions: {src:?}"
        );
    }
}

#[test]
fn canonicalisation_is_still_a_specification_question() {
    // BCJ/1 is established by the specification, not by a governance decision.
    let c = concept_of("o que é a canonicalização BCJ/1?");
    assert!(
        c.as_deref() != Some("ADR-004") && c.as_deref() != Some("ADR-006"),
        "canonicalisation must not resolve to an institutional-governance record (got {c:?})"
    );
}
