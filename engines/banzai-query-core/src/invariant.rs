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
    #[serde(default)]
    families: Vec<Family>,
}

#[derive(Deserialize, Clone)]
pub struct Family {
    pub family: String,
    pub members: Vec<String>,
    /// Normalized labels for this family, longest first — the id-derived form plus one declared
    /// bilingual label, because a Portuguese reader asks for "invariantes da RAIZ" and never "root".
    pub aliases: Vec<String>,
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

fn all_families() -> &'static [Family] {
    static F: OnceLock<Vec<Family>> = OnceLock::new();
    &F.get_or_init(|| {
        serde_json::from_str::<File>(INVARIANTS_JSON)
            .expect("invariants.json")
            .families
    })[..]
}

/// The invariant FAMILY a normalized query asks about, if it asks about one.
///
/// A family question — "quais são as invariantes de QR do BANZA?" — is a different unit from any of its
/// members, and it had no resolver at all: it fell through to lexical retrieval and came back as the
/// protocol summary. Measured across the V2 corpus, seven of the twelve critical families were answered
/// that way.
///
/// It requires BOTH an invariant cue and a family label, because the label alone is far too common:
/// "ledger", "qr" and "raiz" appear throughout the corpus in questions that are not about invariants.
/// A query naming a specific MEMBER is not a family question — the member resolver owns that, and it
/// runs first.
pub fn family_lookup(nq: &str) -> Option<&'static Family> {
    if lookup(nq).is_some() {
        return None;
    }
    let cue = nq
        .split(' ')
        .any(|t| matches!(t, "invariante" | "invariantes" | "invariant" | "invariants"));
    if !cue {
        return None;
    }
    all_families()
        .iter()
        .filter(|f| f.aliases.iter().any(|a| contains_token_run(nq, a)))
        .max_by_key(|f| {
            f.aliases
                .iter()
                .filter(|a| contains_token_run(nq, a))
                .map(|a| a.len())
                .max()
                .unwrap_or(0)
        })
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
    fn a_family_question_reaches_its_family() {
        assert_eq!(
            family_lookup("quais sao as invariantes de qr do banza")
                .unwrap()
                .family,
            "INV-QR"
        );
        assert_eq!(
            family_lookup("explica as invariantes da raiz")
                .unwrap()
                .family,
            "INV-ROOT"
        );
        assert_eq!(
            family_lookup("what are the wallet invariants in banza")
                .unwrap()
                .family,
            "INV-WALLET"
        );
        assert_eq!(
            family_lookup("explica as invariantes de cobranca")
                .unwrap()
                .family,
            "INV-COLLECTION"
        );
    }

    #[test]
    fn a_member_question_is_not_a_family_question() {
        // The member resolver owns an id. If both fired, "o que exige INV-QR-001" would be answered
        // with the whole QR family instead of the invariant the reader named.
        assert!(family_lookup("o que exige a invariante inv qr 001 do banza").is_none());
    }

    #[test]
    fn a_family_label_without_an_invariant_cue_is_not_a_family_question() {
        // "ledger", "qr" and "raiz" are ordinary words in this corpus. Without the cue this gate would
        // capture most of the domain layer.
        assert!(family_lookup("o que e um ledger").is_none());
        assert!(family_lookup("o que e uma raiz de confianca").is_none());
        assert!(family_lookup("como funciona o qr").is_none());
    }

    #[test]
    fn the_longest_family_label_wins() {
        // INV-FED and INV-FED-LEDGER both exist; the more specific one must win.
        assert_eq!(
            family_lookup("quais sao as invariantes de fed ledger")
                .unwrap()
                .family,
            "INV-FED-LEDGER"
        );
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
