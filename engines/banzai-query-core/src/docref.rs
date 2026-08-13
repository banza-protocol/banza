//! Protocol Document Registry + explicit-reference resolution (M2.10A).
//!
//! WHY THIS EXISTS
//! ---------------
//! Generic retrieval scores a chunk by counting how many query terms appear in it and keeps only
//! chunks scoring >= 3 (`crate::retrieve_doc_chunks`). That rule cannot retrieve a document the user
//! named explicitly: "Explica o ADR-002" normalizes to "explica o adr 002", whose content terms are
//! ["explica", "adr", "002"]. The real ADR-002 chunks contain "adr" and "002" but never "explica",
//! so they score 2 and are filtered out BEFORE ranking — every time, for every "Explica o ADR-N"
//! phrasing. The agent then answered from whatever else scored 3+ (the ADR index, CLAUDE.md) and
//! honestly reported "Não há fonte suficiente".
//!
//! An explicit documentary reference is not a similarity problem: it is a LOOKUP. This module
//! resolves such references directly against a registry derived from the real indexed documents, so
//! the canonical document is delivered to the language layer instead of being scored away.
//!
//! BOUNDARY
//! --------
//! Resolution decides WHICH SOURCES are true and relevant. It never decides the answer, never grants
//! authority to a document, and never runs before the safety gates: `route()` applies the
//! prompt-injection refusal and the critical-boundary answers FIRST, and only then asks this module.
//! An ADR is a decision record — never an operator authorisation.

use crate::answerplan::plan_answer;
use crate::obligations::{resolve_task, RequestedTask};
use crate::{doc_chunks, normalize, DocChunk};
use serde::Serialize;

/// A documentary reference detected in a question, in canonical form.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocRef {
    /// "ADR" | "RFC"
    pub kind: &'static str,
    /// Canonical id as the registry spells it, e.g. "ADR-002", "RFC-0001".
    pub id: String,
    /// How the reference was recognised: "numbered" (ADR-002 / adr002 / ADR 2) or "alias" (title).
    pub via: &'static str,
}

/// One canonical protocol document, assembled from its indexed chunks.
#[derive(Debug)]
pub struct RegistryDoc {
    pub id: String,
    pub kind: &'static str,
    /// Numeric part, for padding-insensitive lookup (ADR-2 == ADR-002).
    pub number: u32,
    pub title: String,
    pub path: String,
    pub status: String,
    pub date: String,
    /// Normalized title text without the "ADR-002 — " prefix, used as a natural-language alias.
    pub alias: String,
    /// Indices into `doc_chunks()` for this document, in document order.
    pub chunk_idx: Vec<usize>,
}

impl RegistryDoc {
    /// The document's chunks, in document order.
    pub fn chunks(&self) -> Vec<&'static DocChunk> {
        let all = doc_chunks();
        self.chunk_idx.iter().filter_map(|i| all.get(*i)).collect()
    }

    /// A stable content hash over the document's chunk text. Used as the cache-invalidation token:
    /// if the document changes, every cached answer keyed on it is invalid.
    pub fn content_hash(&self) -> String {
        // FNV-1a 64. Deterministic, dependency-free, and sufficient for cache keying (not security).
        let mut h: u64 = 0xcbf29ce484222325;
        for c in self.chunks() {
            for b in c.chunk.as_bytes() {
                h ^= *b as u64;
                h = h.wrapping_mul(0x100000001b3);
            }
        }
        format!("{h:016x}")
    }
}

/// Parse "ADR-002 — Ecosystem naming: BANZA, BanzAI and operators" → ("ADR", 2, "ADR-002", the alias).
fn parse_title(title: &str) -> Option<(&'static str, u32, String, String)> {
    let t = title.trim();
    let (kind, rest) = if let Some(r) = t.strip_prefix("ADR-") {
        ("ADR", r)
    } else {
        ("RFC", t.strip_prefix("RFC-")?)
    };
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    let number: u32 = digits.parse().ok()?;
    let id = format!("{kind}-{digits}");
    // Everything after the numeric id, minus the em/en dash separator, is the natural-language alias.
    let tail = rest[digits.len()..]
        .trim_start_matches([' ', '—', '–', '-'])
        .trim();
    Some((kind, number, id, normalize(tail)))
}

/// Pull "**Status:** Accepted" / "**Date:** 2026-05-29" style fields out of the opening chunk.
fn field_after(text: &str, label: &str) -> String {
    let hay = text;
    let Some(pos) = hay.find(label) else {
        return String::new();
    };
    let after = &hay[pos + label.len()..];
    // The label is written as "**Status:**", so the closing bold markers sit BETWEEN the label and
    // the value — skip that punctuation first, then read until the next marker/newline/cell edge.
    let after = after.trim_start_matches(['*', ':', ' ']);
    let val: String = after
        .chars()
        .take_while(|c| *c != '\n' && *c != '*' && *c != '|')
        .collect();
    // Some records use a list layout ("- **Status:** Accepted" followed by "- **Date:** …"), which
    // leaves the next bullet's dash glued to the value; trim trailing separators too.
    val.trim()
        .trim_matches(':')
        .trim_end_matches(['-', ' ', ',', ';'])
        .trim()
        .to_string()
}

/// The registry, derived from the SAME generated doc-index the retriever uses — no second source of
/// truth, no hand-maintained duplicate list. A document exists here iff its chunks are indexed.
pub fn registry() -> &'static Vec<RegistryDoc> {
    static R: std::sync::OnceLock<Vec<RegistryDoc>> = std::sync::OnceLock::new();
    R.get_or_init(|| {
        let mut docs: Vec<RegistryDoc> = Vec::new();
        for (i, c) in doc_chunks().iter().enumerate() {
            // Only the canonical decision records — not the website snapshots, not prose that merely
            // mentions an ADR (e.g. the "Ecosystem Identity (ADR-002)" heading inside CLAUDE.md).
            if !(c.path.starts_with("decisions/adr/") || c.path.starts_with("decisions/rfc/")) {
                continue;
            }
            let Some((kind, number, id, alias)) = parse_title(&c.title) else {
                continue;
            };
            match docs.iter_mut().find(|d| d.path == c.path) {
                Some(d) => d.chunk_idx.push(i),
                None => docs.push(RegistryDoc {
                    id,
                    kind,
                    number,
                    title: c.title.clone(),
                    path: c.path.clone(),
                    status: field_after(&c.chunk, "Status:"),
                    date: field_after(&c.chunk, "Date:"),
                    alias,
                    chunk_idx: vec![i],
                }),
            }
        }
        docs.sort_by(|a, b| (a.kind, a.number).cmp(&(b.kind, b.number)));
        docs
    })
}

/// Resolve a canonical id ("ADR-002"), padding-insensitively ("ADR-2" and "adr002" resolve too).
pub fn resolve(id: &str) -> Option<&'static RegistryDoc> {
    let up = id.trim().to_uppercase();
    // "ADR-002" and "ADR002" both strip to a numeric tail once the separator is trimmed below, so a
    // single prefix per kind covers every written form.
    let (kind, digits) = if let Some(r) = up.strip_prefix("ADR") {
        ("ADR", r)
    } else {
        ("RFC", up.strip_prefix("RFC")?)
    };
    let n: u32 = digits.trim().trim_start_matches('-').parse().ok()?;
    registry().iter().find(|d| d.kind == kind && d.number == n)
}

/// Detect explicit documentary references in a question.
///
/// Handles every separator the normalizer can produce plus the glued form, because `normalize`
/// turns "ADR-002" into "adr 002" but leaves "adr002" glued:
///   "ADR-002" / "ADR 002" / "ADR-2" / "adr 2"  → token "adr" + following numeric token
///   "adr002"                                    → single glued token
/// It also matches a document's own title as a natural-language alias ("ecosystem naming inversion").
/// Map a single-word ordinal (PT + EN, deaccented as `normalize` produces) to its number, 1–10. Used to
/// resolve "a segunda ADR" / "the second ADR" against the registry. Deliberately single-word and bounded:
/// realistic "Nth ADR/RFC" references are small ordinals; anyone meaning a larger one writes the number.
fn ordinal_value(tok: &str) -> Option<u32> {
    Some(match tok {
        "primeiro" | "primeira" | "first" => 1,
        "segundo" | "segunda" | "second" => 2,
        "terceiro" | "terceira" | "third" => 3,
        "quarto" | "quarta" | "fourth" => 4,
        "quinto" | "quinta" | "fifth" => 5,
        "sexto" | "sexta" | "sixth" => 6,
        "setimo" | "setima" | "seventh" => 7,
        "oitavo" | "oitava" | "eighth" => 8,
        "nono" | "nona" | "ninth" => 9,
        "decimo" | "decima" | "tenth" => 10,
        _ => return None,
    })
}

pub fn detect_refs(question: &str) -> Vec<DocRef> {
    let nq = normalize(question);
    let toks: Vec<&str> = nq.split(' ').filter(|t| !t.is_empty()).collect();
    let mut out: Vec<DocRef> = Vec::new();
    let push = |kind: &'static str, n: u32, via: &'static str, out: &mut Vec<DocRef>| {
        if let Some(d) = registry().iter().find(|d| d.kind == kind && d.number == n) {
            if !out.iter().any(|r| r.id == d.id) {
                out.push(DocRef {
                    kind,
                    id: d.id.clone(),
                    via,
                });
            }
        } else {
            // Referenced but absent: still report it, so the caller can say "not found" instead of
            // silently degrading into a generic retrieval miss.
            let id = if kind == "ADR" {
                format!("ADR-{n:03}")
            } else {
                format!("RFC-{n:04}")
            };
            if !out.iter().any(|r| r.id == id) {
                out.push(DocRef { kind, id, via });
            }
        }
    };

    for (i, t) in toks.iter().enumerate() {
        let kind = match *t {
            "adr" => Some("ADR"),
            "rfc" => Some("RFC"),
            _ => None,
        };
        if let Some(k) = kind {
            // "adr" followed by a numeric token.
            if let Some(next) = toks.get(i + 1) {
                if next.chars().all(|c| c.is_ascii_digit()) && !next.is_empty() {
                    if let Ok(n) = next.parse::<u32>() {
                        push(k, n, "numbered", &mut out);
                        continue;
                    }
                }
            }
            // M2.18B.3-R1 — ORDINAL reference: "a segunda ADR" / "the second ADR" → the ADR NUMBERED that
            // ordinal (ADR-002). Canonical: an ADR/RFC is referred to by its number, so "the Nth ADR" is
            // the record numbered N — resolved against the registry, never a special-cased id. We look at
            // the token immediately before the kind (the natural PT/EN order "segunda ADR"/"second ADR"),
            // then the token after.
            let ord = i
                .checked_sub(1)
                .and_then(|j| toks.get(j))
                .and_then(|t| ordinal_value(t))
                .or_else(|| toks.get(i + 1).and_then(|t| ordinal_value(t)));
            if let Some(n) = ord {
                push(k, n, "ordinal", &mut out);
                continue;
            }
        }
        // Glued: "adr002" / "rfc0001".
        for (pfx, k) in [("adr", "ADR"), ("rfc", "RFC")] {
            if let Some(rest) = t.strip_prefix(pfx) {
                if !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit()) {
                    if let Ok(n) = rest.parse::<u32>() {
                        push(k, n, "numbered", &mut out);
                    }
                }
            }
        }
    }

    // Title aliases — only for distinctive titles (>= 3 words), so a short generic title cannot
    // hijack an unrelated question.
    if out.is_empty() {
        for d in registry() {
            if d.alias.split(' ').filter(|w| w.len() > 2).count() >= 3 && nq.contains(&d.alias) {
                out.push(DocRef {
                    kind: d.kind,
                    id: d.id.clone(),
                    via: "alias",
                });
                break;
            }
        }
    }
    out
}

/// The internal tool that should answer, given the reference. These are INTERNAL planner labels —
/// not public API endpoints.
pub fn plan_tool(kind: &str) -> &'static str {
    match kind {
        "RFC" => "explain_rfc",
        _ => "explain_adr",
    }
}

/// The canonical documentary modes (M2.10B). Each one narrows BOTH the sections packed into the
/// context AND the answer template, so a focused question produces a focused answer instead of an
/// attempt to restate the whole record — which is what pushed generation to the 384-token cap.
pub const MODE_SUMMARY: &str = "document_summary";
pub const MODE_EXPLAIN: &str = "document_explain";
pub const MODE_DECISION: &str = "document_decision";
pub const MODE_CONSEQUENCES: &str = "document_consequences";
pub const MODE_IMPLEMENTATION: &str = "document_implementation";

/// Classify a section heading into a coarse kind, so mode→section selection works across the
/// idiosyncratic headings real records use (PT and EN, "Introdução"/"Context"/"Decision"/…).
fn section_kind(section: &str) -> &'static str {
    let n = normalize(section);
    if n.contains("introdu") || n.is_empty() {
        "intro"
    } else if n.contains("context") || n.contains("contexto") {
        "context"
    } else if n.contains("decision") || n.contains("decisao") {
        "decision"
    } else if n.contains("consequen") {
        "consequences"
    } else if n.contains("implement") {
        "implementation"
    } else {
        "other"
    }
}

/// Which section kinds a mode needs. The opening chunk ("intro") is always included: it carries the
/// title, Status and Date, which every answer must be able to state accurately.
fn wanted_kinds(mode: &str) -> &'static [&'static str] {
    match mode {
        MODE_SUMMARY => &["intro", "decision"],
        MODE_DECISION => &["intro", "decision"],
        MODE_CONSEQUENCES => &["intro", "consequences", "decision"],
        MODE_IMPLEMENTATION => &["intro", "decision", "consequences", "implementation"],
        // explain is the broad default
        _ => &["intro", "context", "decision", "consequences"],
    }
}

/// True when this section belongs in the context for `mode`.
pub fn section_wanted(mode: &str, section: &str) -> bool {
    wanted_kinds(mode).contains(&section_kind(section))
}

/// Which facet of the document the question asks for. Drives context assembly and answer shape.
pub fn plan_mode(question: &str) -> &'static str {
    let nq = normalize(question);
    let has = |w: &str| nq.split(' ').any(|t| t == w) || nq.contains(w);
    // Order matters: an "implementation" question often also says "afecta"/"impacto", and a
    // "consequences" question often names the decision — the most specific intent wins first.
    if has("implementa") || has("implement") {
        MODE_IMPLEMENTATION
    } else if has("consequencia") || has("consequences") || has("impacto") || has("impact") {
        MODE_CONSEQUENCES
    } else if has("resume") || has("resumo") || has("summary") || has("summarize") {
        MODE_SUMMARY
    } else if has("decisao") || has("decision") || has("decidiu") {
        MODE_DECISION
    } else {
        MODE_EXPLAIN
    }
}

/// Full resolution for a question: the reference (if any), whether it exists, and its sources.
pub struct Resolution {
    pub detected: bool,
    pub id: String,
    pub found: bool,
    pub tool: &'static str,
    pub mode: &'static str,
}

pub fn resolve_question(question: &str) -> Resolution {
    let refs = detect_refs(question);
    match refs.first() {
        None => Resolution {
            detected: false,
            id: String::new(),
            found: false,
            tool: "",
            mode: "",
        },
        Some(r) => {
            let found = resolve(&r.id).is_some();
            Resolution {
                detected: true,
                id: r.id.clone(),
                found,
                tool: plan_tool(r.kind),
                mode: plan_mode(question),
            }
        }
    }
}

/// JSON view for the WASM boundary. Shape is stable and consumed by services/banzai-api.
pub fn resolve_question_json(question: &str) -> String {
    let r = resolve_question(question);
    if !r.detected {
        return "{\"detected\":false}".to_string();
    }
    let Some(d) = resolve(&r.id) else {
        return format!(
            "{{\"detected\":true,\"found\":false,\"id\":{},\"tool\":{},\"mode\":{}}}",
            json_str(&r.id),
            json_str(r.tool),
            json_str(r.mode)
        );
    };
    // M2.10B — pack ONLY the sections this mode needs. A "decision" question does not need the
    // full record, and every section we omit is prefill we do not pay for and output the model is
    // not tempted to restate. Fall back to the whole document if the filter matched nothing, so a
    // record with unusual headings is never starved of context.
    let all = d.chunks();
    let filtered: Vec<&&'static DocChunk> = all
        .iter()
        .filter(|c| section_wanted(r.mode, &c.section))
        .collect();
    let selected: Vec<&'static DocChunk> = if filtered.is_empty() {
        all.clone()
    } else {
        filtered.into_iter().copied().collect()
    };
    let sources: Vec<String> = selected
        .iter()
        .map(|c| {
            format!(
                "{{\"path\":{},\"title\":{},\"section\":{},\"anchor\":{},\"chunk\":{}}}",
                json_str(&c.path),
                json_str(&c.title),
                json_str(&c.section),
                json_str(&c.anchor),
                json_str(&c.chunk)
            )
        })
        .collect();
    format!(
        "{{\"detected\":true,\"found\":true,\"id\":{},\"kind\":{},\"title\":{},\"path\":{},\"status\":{},\"date\":{},\"tool\":{},\"mode\":{},\"content_hash\":{},\"sources\":[{}]}}",
        json_str(&d.id),
        json_str(d.kind),
        json_str(&d.title),
        json_str(&d.path),
        json_str(&d.status),
        json_str(&d.date),
        json_str(r.tool),
        json_str(r.mode),
        json_str(&d.content_hash()),
        sources.join(",")
    )
}

fn json_str(s: &str) -> String {
    let mut o = String::with_capacity(s.len() + 2);
    o.push('"');
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            '\n' => o.push_str("\\n"),
            '\r' => o.push_str("\\r"),
            '\t' => o.push_str("\\t"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o.push('"');
    o
}

// ─────────────────────────── document-lookup card (M2.18B.7 fallback fix) ───────────────────────────
//
// A bare documentary reference ("ADR-002", "RFC-0006", "o que é a ADR 6") is a LOOKUP, not an
// explanation. Before this, such a question routed to the grounded synthesis trunk (intent
// explain_document); the model produced a factually-valid explanation that did NOT state the record's
// metadata, so the deterministic Task-Completion validator (a document lookup must return
// title/status/date/path) returned MISSING_REQUIRED_SECTION and the turn degraded to the safe emergency
// grounding with a "erro temporário" banner. That is the M2.18B.7 systematic-fallback regression.
//
// The fix is deterministic and in-architecture: Rust composes the LOOKUP answer itself — the registry's
// structured metadata (title · type · status · date · path) plus a short, source-bound summary drawn
// from the record's own decision/context section, plus the standing boundary — with NO model call. It is
// returned ONLY when the question's task is a lookup/metadata; an "explica / porquê / impacto / resume"
// request is NOT a lookup and returns None so the grounded trunk explains it once (unchanged).

/// A deterministic document-lookup card. `matched:false` (via `None`) means "not a lookup / not found".
#[derive(Debug, Clone, Serialize)]
pub struct DocumentLookupCard {
    pub matched: bool,
    pub id: String,
    pub title: String,
    pub path: String,
    pub status: String,
    pub date: String,
    pub answer_markdown: String,
}

/// Flatten a markdown chunk into plain prose: drop headings and the metadata bullets we already render
/// (Status/Date/Author/Supersedes), strip blockquote/list/bold/code markers, collapse whitespace.
fn clean_prose(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for line in s.lines() {
        let l = line.trim();
        if l.starts_with('#') {
            continue;
        }
        let stripped = l
            .trim_start_matches('>')
            .trim_start()
            .trim_start_matches(['-', '*', ' '])
            .trim();
        let low = normalize(stripped);
        if low.starts_with("status")
            || low.starts_with("date")
            || low.starts_with("data")
            || low.starts_with("author")
            || low.starts_with("autor")
            || low.starts_with("supersede")
            || low.starts_with("superseded")
            || low.starts_with("substitui")
            || low.starts_with("substituido")
        {
            continue;
        }
        if stripped.is_empty() {
            continue;
        }
        out.push_str(stripped);
        out.push(' ');
    }
    let out = out.replace("**", "").replace('`', "");
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// The first ~`max_chars` characters of prose, truncated at a sentence boundary (char-safe).
fn first_sentences(s: &str, max_chars: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= max_chars {
        return s.trim().to_string();
    }
    let head: String = chars[..max_chars].iter().collect();
    if let Some(p) = head.rfind(['.', '!', '?']) {
        return head[..=p].trim().to_string();
    }
    if let Some(p) = head.rfind(' ') {
        return format!("{}…", head[..p].trim());
    }
    format!("{}…", head.trim())
}

/// A short, source-bound summary for a registry doc — prefers the decision, then context, then the
/// opening chunk (the opening chunk is mostly metadata + supersedes, so it is the last resort).
fn summary_for(doc: &RegistryDoc) -> String {
    let chunks = doc.chunks();
    let pick = |kind: &str| {
        chunks
            .iter()
            .find(|c| section_kind(&c.section) == kind)
            .map(|c| c.chunk.as_str())
    };
    let raw = pick("decision")
        .or_else(|| pick("context"))
        .or_else(|| chunks.first().map(|c| c.chunk.as_str()))
        .unwrap_or("");
    first_sentences(&clean_prose(raw), 360)
}

/// Compose the deterministic document-lookup card for a question that references a registry document AND
/// whose task is a lookup/metadata. Returns `None` for a non-lookup task or an unresolved reference.
pub fn document_lookup_card(question: &str, document_id: &str) -> Option<DocumentLookupCard> {
    // Resolve the referenced document first: an explicit structured id wins; else detect it in the text.
    let doc = if !document_id.trim().is_empty() {
        resolve(document_id.trim())
    } else {
        None
    }
    .or_else(|| {
        detect_refs(question)
            .into_iter()
            .find_map(|r| resolve(&r.id))
    })?;

    // Only a BARE document LOOKUP gets the deterministic card. A DocumentMetadata question ("qual é o
    // estado da ADR-041?") is served MORE precisely by the exact-fact terminal (status/date/… , also
    // deterministic and never degraded), so it is deliberately NOT intercepted here; and an explain/impact/
    // summary request is an EXPLANATION for the grounded trunk.
    let plan = plan_answer(question, &doc.id);
    let task = resolve_task(question, &plan);
    if !matches!(task, RequestedTask::DocumentLookup) {
        return None;
    }

    let kind_label = if doc.kind == "RFC" { "RFC" } else { "ADR" };
    // The ADR tree is current-only by policy: a record that is present is in force, and records that
    // stop being true are rewritten or removed rather than marked superseded. So an absent status line
    // is not missing information — it is the policy. Saying "não declarado" would invite the reader to
    // wonder whether the decision still stands.
    let status = if doc.status.is_empty() {
        if doc.kind == "RFC" {
            "publicada".to_string()
        } else {
            "em vigor".to_string()
        }
    } else {
        doc.status.clone()
    };
    let date = if doc.date.is_empty() {
        "não declarada".to_string()
    } else {
        doc.date.clone()
    };
    let summary = summary_for(doc);

    let mut md = String::new();
    md.push_str(&format!("**{}**\n\n", doc.title));
    md.push_str(&format!(
        "- **Tipo:** {kind_label} · **Estado:** {status} · **Data:** {date}\n"
    ));
    md.push_str(&format!("- **Caminho:** `{}`\n", doc.path));
    if !summary.is_empty() {
        md.push_str(&format!("\n{summary}\n"));
    }
    md.push_str(
        "\nEste documento regista uma decisão do protocolo: não aprova, não certifica e não confere estatuto a nenhum operador.",
    );

    Some(DocumentLookupCard {
        matched: true,
        id: doc.id.clone(),
        title: doc.title.clone(),
        path: doc.path.clone(),
        status,
        date,
        answer_markdown: md,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_is_built_from_the_real_indexed_decision_records() {
        let r = registry();
        assert!(
            r.iter().filter(|d| d.kind == "ADR").count() >= 40,
            "expected the ADR corpus to be indexed, got {}",
            r.len()
        );
        assert!(r.iter().all(|d| d.path.starts_with("decisions/")));
    }

    #[test]
    fn adr_002_resolves_with_its_canonical_path_and_status() {
        let d = resolve("ADR-002").expect("ADR-002 must resolve");
        assert_eq!(d.id, "ADR-002");
        assert_eq!(
            d.path,
            "decisions/adr/ADR-002-ecosystem-naming-banza-banzai-and-operators.md"
        );
        assert!(d.title.contains("Ecosystem naming"));
        assert!(!d.chunk_idx.is_empty(), "must carry its indexed chunks");
        // No status assertion: the current-only tree carries no status header, and a present record
        // is in force by policy (see the ADR on the current-only canonical tree).
    }

    #[test]
    fn ordinal_references_resolve_via_the_registry() {
        // M2.18B.3-R1 — "the Nth ADR" is the ADR NUMBERED N, resolved from the registry (not a special
        // ADR-002 rule). PT + EN + mixed surroundings + a typo'd verb (which does not touch the id token).
        for q in [
            "fala-me sobre a segunda ADR",
            "explain a segunda ADR please",
            "the second ADR",
        ] {
            let refs = detect_refs(q);
            assert!(
                refs.iter().any(|r| r.id == "ADR-002" && r.via == "ordinal"),
                "ordinal not resolved for {q:?}: {refs:?}"
            );
        }
        // a numbered id survives a typo'd surrounding verb (the id token is intact).
        assert!(detect_refs("explika a adr 002")
            .iter()
            .any(|r| r.id == "ADR-002"));
        // "a primeira ADR" → ADR-001.
        assert!(detect_refs("qual foi a primeira ADR?")
            .iter()
            .any(|r| r.id == "ADR-001"));
    }

    #[test]
    fn every_written_form_of_a_reference_is_detected() {
        for q in [
            "Explica o ADR-002",
            "Explica o ADR 002",
            "explica adr002",
            "Explica o ADR-2",
            "O que diz o ADR-002?",
            "Quais foram as consequências do ADR-002?",
        ] {
            let refs = detect_refs(q);
            assert_eq!(refs.first().map(|r| r.id.as_str()), Some("ADR-002"), "{q}");
        }
    }

    #[test]
    fn a_title_alias_resolves_without_a_number() {
        let refs = detect_refs("o que é o ecosystem naming: banza, banzai and operators?");
        assert_eq!(refs.first().map(|r| r.id.as_str()), Some("ADR-002"));
        assert_eq!(refs[0].via, "alias");
    }

    #[test]
    fn a_missing_document_is_reported_as_not_found_never_invented() {
        let r = resolve_question("Explica o ADR-999");
        assert!(r.detected, "the reference itself must be recognised");
        assert!(!r.found, "ADR-999 does not exist and must not resolve");
        assert!(resolve("ADR-999").is_none());
    }

    #[test]
    fn other_documents_resolve_too() {
        assert!(resolve("ADR-042").is_some(), "ADR-042 must resolve");
        assert!(resolve("ADR-1").is_some(), "padding-insensitive");
    }

    #[test]
    fn each_question_shape_selects_its_documentary_mode() {
        assert_eq!(plan_mode("Explica o ADR-002"), MODE_EXPLAIN);
        assert_eq!(plan_mode("Resume o ADR-002"), MODE_SUMMARY);
        assert_eq!(plan_mode("Qual foi a decisão do ADR-002?"), MODE_DECISION);
        assert_eq!(
            plan_mode("Quais foram as consequências do ADR-002?"),
            MODE_CONSEQUENCES
        );
        assert_eq!(
            plan_mode("Como implementar o ADR-002?"),
            MODE_IMPLEMENTATION
        );
        assert_eq!(
            plan_mode("Como o ADR-002 afecta implementadores?"),
            MODE_IMPLEMENTATION
        );
    }

    #[test]
    fn a_narrow_mode_packs_fewer_sections_than_explain() {
        let n = |q: &str| {
            let j = resolve_question_json(q);
            j.matches("\"section\":").count()
        };
        let explain = n("Explica o ADR-002");
        let decision = n("Qual foi a decisão do ADR-002?");
        assert!(explain > 0 && decision > 0);
        assert!(
            decision <= explain,
            "decision packed {decision} sections vs explain {explain} — a narrow mode must not cost more"
        );
    }

    #[test]
    fn the_intro_section_is_always_packed_so_status_and_date_stay_answerable() {
        for q in [
            "Explica o ADR-002",
            "Resume o ADR-002",
            "Qual foi a decisão do ADR-002?",
        ] {
            let j = resolve_question_json(q);
            assert!(j.contains("Introdu"), "{q} lost the opening section");
        }
    }

    #[test]
    fn section_selection_is_mode_aware() {
        assert!(section_wanted(MODE_EXPLAIN, "Context"));
        assert!(!section_wanted(MODE_DECISION, "Context"));
        assert!(section_wanted(MODE_DECISION, "Decision"));
        assert!(section_wanted(MODE_CONSEQUENCES, "Consequences"));
        // The opening section carries title/status/date and is always needed.
        for m in [MODE_SUMMARY, MODE_EXPLAIN, MODE_DECISION, MODE_CONSEQUENCES] {
            assert!(section_wanted(m, "Introdução"), "{m} dropped the intro");
        }
    }

    #[test]
    fn the_planner_picks_the_document_kind_tool() {
        assert_eq!(plan_tool("ADR"), "explain_adr");
        assert_eq!(plan_tool("RFC"), "explain_rfc");
    }

    #[test]
    fn a_question_with_no_documentary_reference_detects_nothing() {
        for q in [
            "como federar um operador?",
            "o que é o BANZA?",
            "quais são os invariantes financeiros?",
        ] {
            assert!(!resolve_question(q).detected, "{q}");
        }
    }

    #[test]
    fn resolution_json_carries_the_document_sources() {
        let j = resolve_question_json("Explica o ADR-002");
        assert!(j.contains("\"found\":true"));
        assert!(j.contains("ADR-002"));
        assert!(j.contains("decisions/adr/ADR-002-ecosystem-naming-banza-banzai-and-operators.md"));
        assert!(j.contains("\"sources\":[{"), "must carry canonical sources");
        assert!(j.contains("\"content_hash\""));
    }

    #[test]
    fn content_hash_is_stable_and_document_specific() {
        let a = resolve("ADR-002").unwrap().content_hash();
        let b = resolve("ADR-002").unwrap().content_hash();
        let c = resolve("ADR-001").unwrap().content_hash();
        assert_eq!(a, b, "stable across calls");
        assert_ne!(a, c, "distinct documents hash differently");
    }

    // ── M2.18B.7 fallback fix — deterministic document-lookup card ──────────────────────────────────
    #[test]
    fn a_bare_reference_yields_a_structured_lookup_card() {
        // The exact production-failing forms: a BARE documentary reference is a LOOKUP → a deterministic
        // metadata card, never the degraded trunk. The card MUST carry the real metadata the completion
        // validator requires (título/estado/data/caminho) so it is a clean, structured lookup — 0 model
        // calls. Every written form the resolver produces: "ADR 002" / "ADR-002" / "adr002" / "ADR-6".
        for (q, id, frag) in [
            ("ADR 002", "ADR-002", "Ecosystem naming"),
            ("ADR-002", "ADR-002", "Ecosystem naming"),
            ("adr002", "ADR-002", "Ecosystem naming"),
            ("ADR 006", "ADR-006", "ADR-006"),
            ("ADR-6", "ADR-006", "ADR-006"),
        ] {
            let c = document_lookup_card(q, "").unwrap_or_else(|| panic!("no card for {q:?}"));
            assert!(c.matched);
            assert_eq!(c.id, id, "{q}");
            assert!(c.answer_markdown.contains(frag), "{q} lost the title");
            assert!(c.answer_markdown.contains("Estado:"), "{q} lost estado");
            assert!(c.answer_markdown.contains("Caminho:"), "{q} lost caminho");
            assert!(
                c.answer_markdown.contains("não aprova, não certifica"),
                "{q} lost the standing boundary"
            );
        }
        // A structured document_id (the "Explicar com BanzAI" button flow) resolves too.
        let c = document_lookup_card("", "ADR-011").expect("card from a structured id");
        assert_eq!(c.id, "ADR-011");
    }

    #[test]
    fn the_lookup_card_satisfies_the_task_completion_metadata_check() {
        // The card must pass the deterministic Task-Completion validator's document_lookup metadata gate
        // (title/estado/decisão/versão/.md) — the exact check that used to REJECT the model's explanation.
        let c = document_lookup_card("ADR 002", "").expect("card");
        let ob = crate::obligations::obligations_for("ADR 002", "ADR-002");
        let v = crate::taskcheck::check_completion(
            &ob,
            &c.answer_markdown,
            &["ADR-002".into()],
            3,
            true,
        );
        assert!(
            v.publishable,
            "the deterministic lookup card must be publishable: {} ({})",
            v.status, v.note
        );
    }

    #[test]
    fn an_explain_request_is_not_a_lookup_and_escalates_to_the_trunk() {
        // "explica / porquê / impacto / resume" about a document is an EXPLANATION, not a lookup: no card,
        // so the grounded synthesis trunk explains it once (unchanged behaviour).
        for q in [
            "explica o ADR-002 em detalhe",
            "porque existe o ADR-002?",
            "qual o impacto do ADR-002 nos implementadores?",
            "resume o ADR-002",
        ] {
            assert!(
                document_lookup_card(q, "").is_none(),
                "{q} must escalate to the trunk, not the lookup card"
            );
        }
    }

    #[test]
    fn a_question_without_a_reference_yields_no_card() {
        for q in [
            "como federar um operador?",
            "o que é o BANZA?",
            "exemplo de manifest",
        ] {
            assert!(document_lookup_card(q, "").is_none(), "{q}");
        }
    }
}
