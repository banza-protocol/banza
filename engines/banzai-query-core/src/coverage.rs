//! M2.18B.7 — canonical entity → primary-source coverage.
//!
//! A canonical PUBLIC entity must always be answerable from its DECLARED primary source document(s).
//! Some entities are named by a synthetic route entry id (e.g. "what-is-banza") rather than by a document
//! id, so retrieval by query terms can return NOTHING when the only content term is the ubiquitous entity
//! name ("o que é o BANZA?" → the single term "banza" appears everywhere and never clears the retrieval
//! threshold). This table is the single authority that binds each such entity to the canonical documents
//! that define it, so the FactualPackage builder grounds the answer on the entity's own primary sources
//! instead of degrading silently to a generic insufficient-evidence reply.
//!
//! This is the M2.18B.7 coverage seed: an existing canonical source can no longer become an empty package
//! (the FACTUAL_PACKAGE_EMPTY / SOURCE_EXISTS_BUT_NOT_RESOLVED failure must never be a silent public
//! answer — it is an internal coverage failure, caught by tests + the coverage guard). Every document id
//! on the right MUST resolve to a real document (proven by the tests below + the coverage guard). Pure,
//! total, deterministic; no model, no network.

/// (canonical entity id / bare normalized alias) → declared primary source document ids, most-canonical
/// first. Both the synthetic route entry id and the bare alias are listed so coverage fires whether the
/// router seeded the entry id or the resolver kept the bare entity name.
pub const ENTITY_PRIMARY_SOURCES: &[(&str, &[&str])] = &[
    // BANZA — the open financial protocol. ADR-001 defines it (open protocol / implementation
    // independence); ADR-002 fixes the ecosystem naming (BANZA / BanzAI / Banzami).
    ("what-is-banza", &["ADR-001", "ADR-002"]),
    ("banza", &["ADR-001", "ADR-002"]),
    // BanzAI — the native protocol agent and primary human-operator interface.
    ("def-banzai-agent", &["ADR-041", "ADR-054"]),
    ("banzai", &["ADR-041", "ADR-054"]),
    // Banzami — creator / initial institutional maintainer; the naming-inversion record carries the
    // BANZA/BanzAI/Banzami identity distinction (attribution, not a payment operator).
    ("what-is-banzami", &["ADR-002"]),
    ("banzami", &["ADR-002"]),
];

/// The declared primary source document ids for a canonical entity id (empty slice if none is declared).
pub fn entity_primary_docs(entity_id: &str) -> &'static [&'static str] {
    let key = entity_id.trim();
    ENTITY_PRIMARY_SOURCES
        .iter()
        .find(|(id, _)| *id == key)
        .map(|(_, docs)| *docs)
        .unwrap_or(&[])
}

/// True when the entity has at least one declared primary source (used by the coverage guard/tests).
pub fn has_coverage(entity_id: &str) -> bool {
    !entity_primary_docs(entity_id).is_empty()
}

/// Every distinct entity id declared in the coverage table (for the coverage guard / truth table).
pub fn covered_entities() -> Vec<&'static str> {
    ENTITY_PRIMARY_SOURCES.iter().map(|(id, _)| *id).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_primary_source_resolves_to_a_real_document() {
        for (entity, docs) in ENTITY_PRIMARY_SOURCES {
            assert!(
                !docs.is_empty(),
                "entity {entity} must declare >=1 primary source"
            );
            for d in *docs {
                assert!(
                    crate::docref::resolve(d).is_some(),
                    "coverage source {d} (entity {entity}) must resolve to a real document"
                );
            }
        }
    }

    #[test]
    fn core_entities_are_covered() {
        for e in [
            "what-is-banza",
            "banza",
            "def-banzai-agent",
            "banzai",
            "what-is-banzami",
            "banzami",
        ] {
            assert!(
                has_coverage(e),
                "core entity {e} must have primary-source coverage"
            );
        }
    }
}
