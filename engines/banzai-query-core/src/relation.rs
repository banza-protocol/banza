//! M2.18B.6 — the typed protocol RelationGraph over the canonical document registry.
//!
//! Nodes are exactly the canonical decision records in [`crate::docref::registry`] (ADR/RFC). Edges are
//! extracted DETERMINISTICALLY from EXPLICIT relation fields in each document's front-matter/sections —
//! `**Supersedes:**`, `**Superseded by:**`, `**See also:**`, `**Related ADRs**`, `**Depends on:**`,
//! `**Implements:**`, `**Constrains:**`, `**Governs:**`, `**Defines:**`, `**Applies to:**`,
//! `**Provides evidence for:**`, `**Conflicts with:**`, `**References:**` — never from lexical proximity or
//! a bare prose mention. Every referenced id is validated against the registry; a reference to an id that
//! does not resolve is REJECTED as an orphan (never silently kept). Exact duplicates dedupe; asymmetric
//! relations that point both ways (A supersedes B AND B supersedes A) are recorded as conflicts. The graph
//! is versioned and carries a deterministic FNV-1a checksum over its sorted edges, so any drift is visible.
//!
//! Pure + total + reproducible: no model, no network, no file I/O — it reads the same generated doc-index
//! the registry is built from. The single grounded synthesis never selects or reranks; this graph only
//! *grounds* comparison/impact/relationship answers with confirmed, cited relations.

use crate::docref::{registry, resolve};
use serde::{Deserialize, Serialize};

/// Bumped when the edge schema or extraction contract changes.
pub const RELATION_GRAPH_SCHEMA_VERSION: u32 = 1;

/// The typed protocol relations. `related_to`, `references` and `conflicts_with` are symmetric; the rest
/// are directional (from → to).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationKind {
    Defines,
    Governs,
    Supersedes,
    DependsOn,
    Implements,
    Constrains,
    ProvidesEvidenceFor,
    AppliesTo,
    References,
    RelatedTo,
    ConflictsWith,
}

impl RelationKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            RelationKind::Defines => "defines",
            RelationKind::Governs => "governs",
            RelationKind::Supersedes => "supersedes",
            RelationKind::DependsOn => "depends_on",
            RelationKind::Implements => "implements",
            RelationKind::Constrains => "constrains",
            RelationKind::ProvidesEvidenceFor => "provides_evidence_for",
            RelationKind::AppliesTo => "applies_to",
            RelationKind::References => "references",
            RelationKind::RelatedTo => "related_to",
            RelationKind::ConflictsWith => "conflicts_with",
        }
    }
    /// Symmetric relations are the same in both directions; a both-way declaration is NOT a conflict.
    pub fn is_symmetric(&self) -> bool {
        matches!(
            self,
            RelationKind::RelatedTo | RelationKind::References | RelationKind::ConflictsWith
        )
    }
    pub const ALL: &'static [RelationKind] = &[
        RelationKind::Defines,
        RelationKind::Governs,
        RelationKind::Supersedes,
        RelationKind::DependsOn,
        RelationKind::Implements,
        RelationKind::Constrains,
        RelationKind::ProvidesEvidenceFor,
        RelationKind::AppliesTo,
        RelationKind::References,
        RelationKind::RelatedTo,
        RelationKind::ConflictsWith,
    ];
}

/// A confirmed, registry-validated relation. `declared_in` + `field` are the provenance: which document's
/// which field declared it (so every edge is auditable back to a canonical source line).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct RelationEdge {
    pub from: String,
    pub to: String,
    pub kind: RelationKind,
    pub declared_in: String,
    pub field: String,
}

/// A relation field named a target that could not be validated (orphan) or was a self-reference.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct RejectedEdge {
    pub declared_in: String,
    pub field: String,
    pub raw_target: String,
    pub reason: String, // "unresolvable_id" | "self_reference"
}

/// An asymmetric relation asserted in both directions (e.g. a supersedes cycle).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct RelationConflict {
    pub a: String,
    pub b: String,
    pub kind: RelationKind,
    pub reason: String, // "bidirectional_asymmetric_relation"
}

/// The whole typed graph. Serialized to the JS layer as public-safe metadata.
#[derive(Debug, Clone, Serialize)]
pub struct RelationGraph {
    pub schema_version: u32,
    pub node_count: usize,
    pub node_ids: Vec<String>,
    pub edges: Vec<RelationEdge>,
    pub rejected: Vec<RejectedEdge>,
    pub duplicates_removed: usize,
    pub conflicts: Vec<RelationConflict>,
    pub checksum: String,
}

// ── field vocabulary ─────────────────────────────────────────────────────────────────────────────────
// Each entry: the field label (lowercased, without markdown), the relation kind, and whether the
// declaration is REVERSED (the field on doc D names the OTHER end; e.g. "superseded by: X" on D means X
// supersedes D). `heading` marks the no-colon markdown-section form ("## Related ADRs"). Longer / more
// specific labels come first so a match consumes the most specific form.
struct FieldRule {
    label: &'static str,
    kind: RelationKind,
    reversed: bool,
    heading: bool,
}

const FIELD_RULES: &[FieldRule] = &[
    FieldRule {
        label: "superseded in part by",
        kind: RelationKind::Supersedes,
        reversed: true,
        heading: false,
    },
    FieldRule {
        label: "superseded in part",
        kind: RelationKind::Supersedes,
        reversed: true,
        heading: false,
    },
    FieldRule {
        label: "superseded by",
        kind: RelationKind::Supersedes,
        reversed: true,
        heading: false,
    },
    FieldRule {
        label: "superseded",
        kind: RelationKind::Supersedes,
        reversed: true,
        heading: false,
    },
    FieldRule {
        label: "supersedes in part",
        kind: RelationKind::Supersedes,
        reversed: false,
        heading: false,
    },
    // "supersedes/relates" is an AMBIGUOUS compound (it does not cleanly supersede) → the safe,
    // non-authority-changing relation, never a supersession that could demote a current canonical doc.
    FieldRule {
        label: "supersedes/relates",
        kind: RelationKind::RelatedTo,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "supersedes",
        kind: RelationKind::Supersedes,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "replaced by",
        kind: RelationKind::Supersedes,
        reversed: true,
        heading: false,
    },
    FieldRule {
        label: "replaces",
        kind: RelationKind::Supersedes,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "depends on",
        kind: RelationKind::DependsOn,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "implements",
        kind: RelationKind::Implements,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "constrains",
        kind: RelationKind::Constrains,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "governs",
        kind: RelationKind::Governs,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "defines",
        kind: RelationKind::Defines,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "applies to",
        kind: RelationKind::AppliesTo,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "provides evidence for",
        kind: RelationKind::ProvidesEvidenceFor,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "evidence for",
        kind: RelationKind::ProvidesEvidenceFor,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "conflicts with",
        kind: RelationKind::ConflictsWith,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "references",
        kind: RelationKind::References,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "related adrs",
        kind: RelationKind::RelatedTo,
        reversed: false,
        heading: true,
    },
    FieldRule {
        label: "related rfcs",
        kind: RelationKind::RelatedTo,
        reversed: false,
        heading: true,
    },
    FieldRule {
        label: "related",
        kind: RelationKind::RelatedTo,
        reversed: false,
        heading: false,
    },
    FieldRule {
        label: "see also",
        kind: RelationKind::RelatedTo,
        reversed: false,
        heading: false,
    },
];

/// A parsed relation field: the rule that matched + the raw value text (up to the next marker).
struct ParsedField {
    kind: RelationKind,
    reversed: bool,
    field: &'static str,
    value: String,
}

/// The char immediately before `pos` in `s` (None at start). Used to require a field label to sit at a
/// boundary (after `**`, a bullet, whitespace, a paren or a heading `#`) so a substring inside a word or a
/// prose sentence never matches.
fn char_before(s: &str, pos: usize) -> Option<char> {
    s[..pos].chars().next_back()
}

/// Read a field's value starting at byte offset `start` in the ORIGINAL text: skip the closing bold /
/// colon / spaces, then read until the next bold marker `**`, a newline, or a `---` front-matter rule.
fn read_value_after(text: &str, start: usize) -> String {
    let rest = text[start..].trim_start_matches(['*', ':', ' ']);
    let b = rest.as_bytes();
    let mut end = rest.len();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'\n' {
            end = i;
            break;
        }
        if i + 1 < b.len() && b[i] == b'*' && b[i + 1] == b'*' {
            end = i;
            break;
        }
        if i + 2 < b.len() && b[i] == b'-' && b[i + 1] == b'-' && b[i + 2] == b'-' {
            end = i;
            break;
        }
        i += 1;
    }
    rest[..end].trim().to_string()
}

/// Extract every EXPLICIT relation field from a document's text (occurrence-based, since the generated
/// doc-index collapses several `**Label:** value` fields onto one line). Colon fields require a `<label>:`
/// at a boundary; heading fields ("## Related ADRs") require a `#` in the immediately preceding run.
fn extract_fields(text: &str) -> Vec<ParsedField> {
    let lower = text.to_ascii_lowercase();
    let mut out: Vec<ParsedField> = Vec::new();
    for rule in FIELD_RULES {
        let needle = if rule.heading {
            rule.label.to_string()
        } else {
            format!("{}:", rule.label)
        };
        let mut from = 0usize;
        while let Some(rel) = lower[from..].find(&needle) {
            let pos = from + rel;
            let key_end = pos + needle.len();
            let prev = char_before(&lower, pos);
            let boundary_ok = match prev {
                None => true,
                Some(c) => matches!(c, '*' | ' ' | '-' | '>' | '\n' | '#' | '(' | '\t'),
            };
            // A heading field must be an actual markdown heading: a '#' in the 6 chars before it.
            let heading_ok = !rule.heading || {
                let lo = pos.saturating_sub(6);
                // byte-scan the preceding window (char-boundary-safe) for a heading marker
                lower.as_bytes()[lo..pos].contains(&b'#')
            };
            if boundary_ok && heading_ok {
                out.push(ParsedField {
                    kind: rule.kind,
                    reversed: rule.reversed,
                    field: rule.label,
                    value: read_value_after(text, key_end),
                });
            }
            from = key_end;
        }
    }
    out
}

/// Extract canonical-shaped document id tokens ("ADR-002", "RFC-0001") from a value string. Only the
/// ADR/RFC + digits shape is recognised — a parenthetical label ("(Federation trust model)") or a file
/// path never becomes an id. Case-insensitive; tolerates "ADR-002", "ADR 2", "adr002".
fn extract_id_tokens(value: &str) -> Vec<String> {
    let up = value.to_ascii_uppercase();
    let bytes = up.as_bytes();
    let mut out: Vec<String> = Vec::new();
    // Byte-based scan (the id shape is pure ASCII), so text with em-dashes / accented chars never trips a
    // char-boundary slice.
    let mut i = 0usize;
    while i + 3 <= bytes.len() {
        let k = if &bytes[i..i + 3] == b"ADR" {
            Some("ADR")
        } else if &bytes[i..i + 3] == b"RFC" {
            Some("RFC")
        } else {
            None
        };
        if let Some(k) = k {
            let mut j = i + 3;
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'-' || bytes[j] == b'_') {
                j += 1;
            }
            let start = j;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            if j > start {
                let digits = std::str::from_utf8(&bytes[start..j]).unwrap_or("");
                out.push(format!("{k}-{digits}"));
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

/// FNV-1a 64 over an ordered set of strings with a record separator. Deterministic, dependency-free.
fn fnv1a(parts: &[String]) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for p in parts {
        for b in p.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
        h ^= 0x1f;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

/// Build the graph over the live registry. Cached (pure + stable for a given doc-index).
pub fn graph() -> &'static RelationGraph {
    static G: std::sync::OnceLock<RelationGraph> = std::sync::OnceLock::new();
    G.get_or_init(build_graph)
}

fn build_graph() -> RelationGraph {
    let reg = registry();
    let node_ids: Vec<String> = reg.iter().map(|d| d.id.clone()).collect();

    let mut edges: Vec<RelationEdge> = Vec::new();
    let mut rejected: Vec<RejectedEdge> = Vec::new();

    for doc in reg.iter() {
        let text: String = doc
            .chunks()
            .iter()
            .map(|c| c.chunk.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        for field in extract_fields(&text) {
            for raw in extract_id_tokens(&field.value) {
                match resolve(&raw) {
                    Some(target) => {
                        let (from, to) = if field.reversed {
                            (target.id.clone(), doc.id.clone())
                        } else {
                            (doc.id.clone(), target.id.clone())
                        };
                        if from == to {
                            rejected.push(RejectedEdge {
                                declared_in: doc.id.clone(),
                                field: field.field.to_string(),
                                raw_target: raw,
                                reason: "self_reference".into(),
                            });
                        } else {
                            edges.push(RelationEdge {
                                from,
                                to,
                                kind: field.kind,
                                declared_in: doc.id.clone(),
                                field: field.field.to_string(),
                            });
                        }
                    }
                    None => rejected.push(RejectedEdge {
                        declared_in: doc.id.clone(),
                        field: field.field.to_string(),
                        raw_target: raw,
                        reason: "unresolvable_id".into(),
                    }),
                }
            }
        }
    }

    // Deterministic order + dedup on (from, kind, to). Provenance kept from the first declaration.
    edges.sort_by(|a, b| {
        (
            a.from.as_str(),
            a.kind.as_str(),
            a.to.as_str(),
            a.declared_in.as_str(),
        )
            .cmp(&(
                b.from.as_str(),
                b.kind.as_str(),
                b.to.as_str(),
                b.declared_in.as_str(),
            ))
    });
    let before = edges.len();
    edges.dedup_by(|a, b| a.from == b.from && a.to == b.to && a.kind == b.kind);
    let duplicates_removed = before - edges.len();

    // Conflicts: an ASYMMETRIC relation asserted both ways.
    let mut conflicts: Vec<RelationConflict> = Vec::new();
    let has = |from: &str, to: &str, kind: RelationKind| {
        edges
            .iter()
            .any(|e| e.from == from && e.to == to && e.kind == kind)
    };
    for e in &edges {
        if e.kind.is_symmetric() {
            continue;
        }
        if e.from < e.to && has(&e.to, &e.from, e.kind) {
            conflicts.push(RelationConflict {
                a: e.from.clone(),
                b: e.to.clone(),
                kind: e.kind,
                reason: "bidirectional_asymmetric_relation".into(),
            });
        }
    }

    let mut parts: Vec<String> = vec![format!("v{RELATION_GRAPH_SCHEMA_VERSION}")];
    for e in &edges {
        parts.push(format!("{}|{}|{}", e.from, e.kind.as_str(), e.to));
    }
    let checksum = fnv1a(&parts);

    RelationGraph {
        schema_version: RELATION_GRAPH_SCHEMA_VERSION,
        node_count: node_ids.len(),
        node_ids,
        edges,
        rejected,
        duplicates_removed,
        conflicts,
        checksum,
    }
}

// ── typed queries ──────────────────────────────────────────────────────────────────────────────────────

/// "out" (from == id) | "in" (to == id) | "both".
pub fn relations_for(id: &str, direction: &str) -> Vec<RelationEdge> {
    let g = graph();
    let canonical = resolve(id)
        .map(|d| d.id.clone())
        .unwrap_or_else(|| id.trim().to_string());
    g.edges
        .iter()
        .filter(|e| match direction {
            "out" => e.from == canonical,
            "in" => e.to == canonical,
            _ => e.from == canonical || e.to == canonical,
        })
        .cloned()
        .collect()
}

/// All edges of one relation kind.
pub fn relations_of_kind(kind: RelationKind) -> Vec<RelationEdge> {
    graph()
        .edges
        .iter()
        .filter(|e| e.kind == kind)
        .cloned()
        .collect()
}

/// Neighbour ids of a document (both directions), deduped + sorted.
pub fn neighbours(id: &str) -> Vec<String> {
    let canonical = resolve(id)
        .map(|d| d.id.clone())
        .unwrap_or_else(|| id.trim().to_string());
    let mut ns: Vec<String> = Vec::new();
    for e in &graph().edges {
        if e.from == canonical && !ns.contains(&e.to) {
            ns.push(e.to.clone());
        }
        if e.to == canonical && !ns.contains(&e.from) {
            ns.push(e.from.clone());
        }
    }
    ns.sort();
    ns
}

/// Resolve a concept question to its canonical source id, then return its relations. Empty when the
/// question names no single-canonical document/concept.
pub fn relations_for_concept(question: &str, direction: &str) -> Vec<RelationEdge> {
    let src = crate::concept::resolve_concept(question).unwrap_or("");
    if src.is_empty() {
        return Vec::new();
    }
    relations_for(src, direction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_edge_endpoint_is_a_real_registry_node() {
        let g = graph();
        let nodes: std::collections::BTreeSet<&str> =
            g.node_ids.iter().map(|s| s.as_str()).collect();
        for e in &g.edges {
            assert!(nodes.contains(e.from.as_str()), "orphan from {}", e.from);
            assert!(nodes.contains(e.to.as_str()), "orphan to {}", e.to);
        }
        assert!(
            !g.edges.is_empty(),
            "expected extracted edges from the corpus"
        );
    }

    #[test]
    fn superseded_by_field_is_parsed_as_a_reversed_supersedes_rule() {
        // A "**Superseded by: X**" field on document D is recorded REVERSED — X supersedes D — so
        // build_graph orients the edge (X → D). M2.19A (ADR-057, current-only canonical ADR tree) removed
        // every superseded ADR from the registry, so no SURVIVING doc self-declares "Superseded by"; the
        // reversed rule is therefore verified here at the extraction level, data-independently, on a
        // self-contained input that names a current document.
        let fields = extract_fields("**Superseded by:** ADR-001 (an earlier decision)");
        let sup = fields
            .iter()
            .find(|f| f.kind == RelationKind::Supersedes)
            .expect("a Superseded by field yields a supersedes rule");
        assert!(sup.reversed, "Superseded by must be recorded reversed");
        assert_eq!(extract_id_tokens(&sup.value), vec!["ADR-001".to_string()]);
    }

    #[test]
    fn see_also_produces_related_to_edges() {
        // Every "See also:" that names a real ADR/RFC becomes a related_to edge.
        let g = graph();
        assert!(
            g.edges.iter().any(|e| e.kind == RelationKind::RelatedTo),
            "expected related_to edges from See also fields"
        );
    }

    #[test]
    fn extract_ids_ignores_labels_and_paths_keeps_ids() {
        let v = "ADR-040 (Federation trust evaluation), [BANZA-POLICY](../../docs/governance/x.md), RFC-0005";
        let ids = extract_id_tokens(v);
        assert!(ids.contains(&"ADR-040".to_string()));
        assert!(ids.contains(&"RFC-0005".to_string()));
        // the parenthetical words and the path never become ids
        assert_eq!(ids.iter().filter(|s| s.starts_with("ADR")).count(), 1);
    }

    #[test]
    fn extract_fields_matches_inline_labels_not_prose() {
        let text = "**Supersedes:** None **See also:** ADR-001, ADR-009 ---";
        let fields = extract_fields(text);
        assert!(fields
            .iter()
            .any(|f| f.kind == RelationKind::Supersedes && f.value == "None"));
        let see = fields.iter().find(|f| f.field == "see also").unwrap();
        assert!(see.value.contains("ADR-001") && see.value.contains("ADR-009"));
        // "superseded by" wins its own reversed rule
        let rev = extract_fields("**Superseded by:** ADR-038 (open protocol trust model)");
        assert!(rev
            .iter()
            .any(|f| f.reversed && f.kind == RelationKind::Supersedes));
        // a prose mention is NOT a field
        assert!(extract_fields("as described in ADR-006 the ledger is double-entry").is_empty());
    }

    #[test]
    fn orphan_and_self_reference_are_rejected_not_kept() {
        let g = graph();
        // ADR-002 "See also: … ADR-002 …" is a self-reference → rejected, never a self-edge.
        assert!(
            !g.edges.iter().any(|e| e.from == e.to),
            "no self-edge may survive"
        );
        // every rejected entry has a concrete reason
        for r in &g.rejected {
            assert!(
                r.reason == "unresolvable_id" || r.reason == "self_reference",
                "reason {}",
                r.reason
            );
        }
        // and a synthetic orphan id does not resolve (so it would be rejected)
        assert!(resolve("ADR-99999").is_none());
    }

    #[test]
    fn graph_is_deterministic_and_dedupes() {
        let a = build_graph();
        let b = build_graph();
        assert_eq!(a.checksum, b.checksum, "checksum must be stable");
        assert_eq!(a.edges.len(), b.edges.len());
        let mut seen = std::collections::BTreeSet::new();
        for e in &a.edges {
            assert!(
                seen.insert((e.from.as_str(), e.kind.as_str(), e.to.as_str())),
                "duplicate edge {} {} {}",
                e.from,
                e.kind.as_str(),
                e.to
            );
        }
    }

    #[test]
    fn conflict_detection_flags_a_bidirectional_asymmetric_relation() {
        let edges = vec![
            RelationEdge {
                from: "ADR-A".into(),
                to: "ADR-B".into(),
                kind: RelationKind::Supersedes,
                declared_in: "ADR-A".into(),
                field: "supersedes".into(),
            },
            RelationEdge {
                from: "ADR-B".into(),
                to: "ADR-A".into(),
                kind: RelationKind::Supersedes,
                declared_in: "ADR-B".into(),
                field: "supersedes".into(),
            },
        ];
        let has = |from: &str, to: &str, kind: RelationKind| {
            edges
                .iter()
                .any(|e| e.from == from && e.to == to && e.kind == kind)
        };
        let mut conflicts = 0;
        for e in &edges {
            if !e.kind.is_symmetric() && e.from < e.to && has(&e.to, &e.from, e.kind) {
                conflicts += 1;
            }
        }
        assert_eq!(conflicts, 1);
    }

    #[test]
    fn queries_are_typed_and_direction_aware() {
        // ADR-040 carries confirmed relations in both directions in the current registry.
        let out = relations_for("ADR-040", "out");
        assert!(!out.is_empty(), "expected outgoing relations for ADR-040");
        assert!(
            out.iter().all(|e| e.from == "ADR-040"),
            "out edges must start at ADR-040"
        );
        let incoming = relations_for("ADR-040", "in");
        assert!(
            incoming.iter().all(|e| e.to == "ADR-040"),
            "in edges must end at ADR-040"
        );
        assert!(!relations_of_kind(RelationKind::RelatedTo).is_empty());
        assert!(!neighbours("ADR-040").is_empty());
    }
}
