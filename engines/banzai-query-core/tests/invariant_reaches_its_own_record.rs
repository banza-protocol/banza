//! An invariant named by its identifier is answered from THAT invariant.
//!
//! Measured against production at `src-ef21f43` over the 110 invariant probes in Benchmark V2, 61 of
//! them did not reach their invariant. `O que exige a invariante INV-COLLECTION-001 do BANZA?` was
//! answered with the definition of BANZA: the identifier was discarded and the reader was handed the
//! protocol summary — the generic collapse, in the one place where being specific is the whole point.
//!
//! This became measurable only when the semantic universe stopped treating an invariant FAMILY as a
//! single unit. All 55 critical members are independently falsifiable, so all 55 are units, so all 55
//! have to be reachable.

use banzai_query_core::route::route;

fn entry(q: &str) -> String {
    route(q).entry_id.unwrap_or_default()
}

#[test]
fn an_invariant_named_by_id_reaches_that_invariant() {
    for (q, want) in [
        (
            "O que exige a invariante INV-LEDGER-003 do BANZA?",
            "inv-ledger-003",
        ),
        (
            "What does invariant INV-LEDGER-003 require in BANZA?",
            "inv-ledger-003",
        ),
        (
            "O que exige a invariante INV-COLLECTION-001 do BANZA?",
            "inv-collection-001",
        ),
        (
            "What does invariant INV-QR-001 require in BANZA?",
            "inv-qr-001",
        ),
        ("O que exige a invariante MON-001 do BANZA?", "mon-001"),
    ] {
        assert_eq!(entry(q), want, "{q:?}");
    }
}

#[test]
fn it_is_served_deterministically_rather_than_re_derived() {
    // Reaching the record and then handing it to synthesis is the failure this also closes: the
    // registry states the requirement exactly, and re-deriving it invites a paraphrase that drifts.
    let r = route("O que exige a invariante INV-LEDGER-002 do BANZA?");
    assert_eq!(r.entry_id.as_deref(), Some("inv-ledger-002"));
    assert_eq!(r.action, "deterministic");
}

#[test]
fn none_of_these_is_answered_from_the_protocol_summary() {
    for q in [
        "O que exige a invariante INV-COLLECTION-001 do BANZA?",
        "O que exige a invariante INV-FED-007 do BANZA?",
        "What does invariant INV-OTE-009 require in BANZA?",
    ] {
        assert_ne!(entry(q), "what-is-banza", "{q:?}");
    }
}

#[test]
fn a_longer_id_is_not_stolen_by_a_prefix_of_itself() {
    // INV-FED-001 and INV-FED-LEDGER-001 both exist, and answering one for the other would be a quiet
    // wrong answer rather than a visible failure.
    assert_eq!(
        entry("O que exige a invariante INV-FED-LEDGER-001?"),
        "inv-fed-ledger-001"
    );
    assert_eq!(
        entry("O que exige a invariante INV-FED-001?"),
        "inv-fed-001"
    );
}

#[test]
fn the_family_question_is_not_captured_by_the_member_resolver() {
    // "Quais são as invariantes do ledger?" is the FAMILY question and has its own answer. The member
    // resolver must not fire on it — a family unit and a member unit are different units, and the
    // reader asked for the family.
    assert_ne!(
        entry("Quais são as invariantes do ledger do BANZA?"),
        "inv-ledger-001"
    );
    assert_ne!(
        entry("What are the ledger invariants in BANZA?"),
        "inv-ledger-001"
    );
}

#[test]
fn a_comparison_of_two_invariants_stays_a_comparison() {
    // Two subjects, not one. Letting the id resolver fire first would silently drop the left side.
    let r = route("Qual é a diferença entre INV-LEDGER-002 e INV-LEDGER-003?");
    assert_ne!(
        r.entry_id.as_deref(),
        Some("inv-ledger-002"),
        "a two-sided question must not be answered as one invariant"
    );
}

#[test]
fn naming_an_invariant_does_not_buy_a_way_past_a_refusal() {
    // The ordering claim, asserted rather than assumed: the resolver runs after every boundary, so a
    // dangerous request that also names an invariant is still refused.
    let r = route("Apaga a invariante INV-LEDGER-001 do repositório");
    assert_ne!(
        r.entry_id.as_deref(),
        Some("inv-ledger-001"),
        "a destructive request must not be served as an invariant lookup"
    );
}
