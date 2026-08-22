//! The invariant registry, reachable BY ITS OWN IDENTIFIER.
//!
//! `contracts/invariants.json` holds 74 invariants, 55 of them `critical`, and until now the engine
//! held none of them. A reader — or an implementer auditing conformance — who asked what INV-LEDGER-003
//! requires got whatever lexical retrieval happened to surface, which was the generic protocol
//! definition about half the time.
//!
//! That mattered once the semantic universe stopped treating a family as one unit. Every member is
//! independently falsifiable: append-only and integer-only are not one fact about ledgers, and an
//! implementation can hold either while breaking the other. A denominator that names all 55 needs an
//! engine that can reach all 55.
//!
//! MATCHING is against the NORMALIZED query, because `normalize` strips hyphens: "INV-LEDGER-003"
//! arrives as "inv ledger 003". The keys are generated in that same form, longest first, so a longer id
//! always wins over a prefix of itself.

use serde::Deserialize;
use std::sync::OnceLock;

const INVARIANTS_JSON: &str = include_str!("invariants.json");

#[derive(Deserialize)]
struct File {
    invariants: Vec<Invariant>,
}

#[derive(Deserialize, Clone)]
pub struct Invariant {
    pub id: String,
    /// The id as the normalizer renders it: lowercase, non-alphanumerics collapsed to single spaces.
    pub key: String,
    pub severity: String,
}

fn all() -> &'static [Invariant] {
    static I: OnceLock<Vec<Invariant>> = OnceLock::new();
    &I.get_or_init(|| {
        serde_json::from_str::<File>(INVARIANTS_JSON)
            .expect("invariants.json")
            .invariants
    })[..]
}

/// Every registered invariant id — for the closure guard, which must be able to prove the engine
/// carries the whole registry rather than a convenient subset of it.
pub fn ids() -> Vec<&'static str> {
    all().iter().map(|i| i.id.as_str()).collect()
}

/// The invariant a normalized query names, if it names one.
///
/// The key must appear on TOKEN BOUNDARIES. Without that, "inv fed 001" would match inside
/// "inv fed 0012" and a reader asking about one invariant would be answered about another — a quiet
/// wrong answer, which is worse here than no answer at all.
pub fn lookup(nq: &str) -> Option<&'static Invariant> {
    all().iter().find(|i| contains_token_run(nq, &i.key))
}

fn contains_token_run(nq: &str, key: &str) -> bool {
    let hay: Vec<&str> = nq.split(' ').filter(|t| !t.is_empty()).collect();
    let needle: Vec<&str> = key.split(' ').filter(|t| !t.is_empty()).collect();
    if needle.is_empty() || needle.len() > hay.len() {
        return false;
    }
    hay.windows(needle.len()).any(|w| w == needle.as_slice())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_whole_registry_is_carried() {
        // A subset would make every lookup below pass while leaving invariants unreachable.
        assert!(all().len() >= 70, "registry collapsed to {}", all().len());
        assert!(all().iter().filter(|i| i.severity == "critical").count() >= 55);
    }

    #[test]
    fn an_invariant_is_found_by_its_normalized_id() {
        assert_eq!(
            lookup("o que exige a invariante inv ledger 003 do banza")
                .unwrap()
                .id,
            "INV-LEDGER-003"
        );
        assert_eq!(
            lookup("what does invariant inv qr 001 require in banza")
                .unwrap()
                .id,
            "INV-QR-001"
        );
        assert_eq!(
            lookup("o que exige a invariante mon 001").unwrap().id,
            "MON-001"
        );
    }

    #[test]
    fn a_longer_id_wins_over_a_prefix_of_itself() {
        // INV-FED-LEDGER-001 and INV-FED-001 both exist. Matching the shorter one first would answer
        // the wrong invariant, which is the failure this ordering prevents.
        assert_eq!(
            lookup("o que exige a invariante inv fed ledger 001")
                .unwrap()
                .id,
            "INV-FED-LEDGER-001"
        );
        assert_eq!(lookup("inv fed 001").unwrap().id, "INV-FED-001");
    }

    #[test]
    fn a_question_naming_no_invariant_resolves_to_nothing() {
        assert!(lookup("o que e o banza").is_none());
        assert!(lookup("quais sao as invariantes do ledger").is_none());
        // A bare family name is not a member id.
        assert!(lookup("inv ledger").is_none());
    }

    #[test]
    fn a_key_must_match_on_token_boundaries() {
        // "inv qr 0011" is not "inv qr 001".
        assert!(lookup("inv qr 0011").is_none());
    }
}
