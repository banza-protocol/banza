//! DOMAIN_KNOWLEDGE — the finance, security and distributed-systems vocabulary a reader needs in
//! order to understand BANZA.
//!
//! The concepts and their aliases are OWNED by the entries marked `domain: true` in
//! `services/banzai-api/src/knowledge.js` and read here through the generated `domain-terms.json`.
//! Two hand-maintained lists that must agree eventually disagree, and the one that goes stale is
//! always the one a reader hits.
//!
//! The class travels with the resolution. A domain concept is a domain concept wherever it is named,
//! and a DOMAIN source may support a DOMAIN claim and never a BANZA-specific one — what a payment
//! scheme is in general is not what BANZA requires, and the two must not be able to borrow each
//! other's authority.
//!
//! Resolution is deliberately conservative in two ways. A bare token has to be a WHOLE token, so
//! "conta" cannot match inside "contabilidade"; and a multi-word alias has to appear as a phrase.
//! Longest alias wins, so "assinatura digital" beats "assinatura" and "chave publica" beats "chave".

use serde::Deserialize;
use std::sync::OnceLock;

const DOMAIN_TERMS_JSON: &str = include_str!("domain-terms.json");

#[derive(Deserialize)]
struct DomainFile {
    concepts: Vec<DomainConcept>,
}

#[derive(Deserialize)]
pub struct DomainConcept {
    pub id: String,
    /// Normalized aliases, longest first (the generator sorts them).
    pub aliases: Vec<String>,
}

fn concepts() -> &'static [DomainConcept] {
    static C: OnceLock<Vec<DomainConcept>> = OnceLock::new();
    &C.get_or_init(|| {
        serde_json::from_str::<DomainFile>(DOMAIN_TERMS_JSON)
            .expect("domain-terms.json")
            .concepts
    })[..]
}

/// Every declared domain concept id, for coverage reporting and the closure guard.
pub fn concept_ids() -> Vec<&'static str> {
    concepts().iter().map(|c| c.id.as_str()).collect()
}

/// Whether a normalized token is a WHOLE token of the query.
fn whole_token(nq: &str, tok: &str) -> bool {
    nq.split_whitespace().any(|t| t == tok)
}

/// Whether a multi-word alias appears as a contiguous phrase on token boundaries.
fn phrase(nq: &str, p: &str) -> bool {
    let hay: Vec<&str> = nq.split_whitespace().collect();
    let needle: Vec<&str> = p.split_whitespace().collect();
    if needle.is_empty() || needle.len() > hay.len() {
        return false;
    }
    hay.windows(needle.len()).any(|w| w == needle.as_slice())
}

/// The domain concept a normalized query names, longest alias first, or None.
///
/// This answers "which domain concept is named here", NOT "should this be answered from the domain
/// layer". The caller decides that: a query naming a domain concept inside a BANZA question is a
/// hybrid, and a comparison naming two of them is a comparison.
pub fn resolve_domain(nq: &str) -> Option<&'static str> {
    let mut best: Option<(&'static str, usize)> = None;
    for c in concepts() {
        for a in &c.aliases {
            let hit = if a.contains(' ') {
                phrase(nq, a)
            } else {
                whole_token(nq, a)
            };
            if hit && best.map(|(_, len)| a.len() > len).unwrap_or(true) {
                best = Some((c.id.as_str(), a.len()));
            }
        }
    }
    best.map(|(id, _)| id)
}

/// Whether the query names a declared domain concept at all.
pub fn names_domain_concept(nq: &str) -> bool {
    resolve_domain(nq).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_generated_table_is_populated() {
        assert!(
            concepts().len() >= 25,
            "expected the declared domain universe, saw {}",
            concepts().len()
        );
        assert!(concepts().iter().all(|c| !c.aliases.is_empty()));
    }

    #[test]
    fn a_bare_alias_matches_only_as_a_whole_token() {
        assert_eq!(resolve_domain("o que e uma conta"), Some("def-dom-account"));
        // "conta" must not match inside another word.
        assert_eq!(resolve_domain("o que e contabilidade"), None);
    }

    #[test]
    fn the_longest_alias_wins() {
        // "assinatura digital" must beat any shorter alias that also matches.
        assert_eq!(
            resolve_domain("o que e uma assinatura digital"),
            Some("def-dom-digital-signature")
        );
        assert_eq!(
            resolve_domain("o que e uma chave publica"),
            Some("def-dom-keypair")
        );
    }

    #[test]
    fn both_languages_reach_the_same_concept() {
        for (pt, en) in [
            ("o que e um hash", "what is a hash"),
            ("o que e um nonce", "what is a nonce"),
            ("o que e uma maquina de estados", "what is a state machine"),
            ("o que e serializacao", "what is serialization"),
        ] {
            assert_eq!(resolve_domain(pt), resolve_domain(en), "pt={pt} en={en}");
            assert!(resolve_domain(pt).is_some(), "{pt} must resolve");
        }
    }
}
