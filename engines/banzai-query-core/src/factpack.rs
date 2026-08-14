//! M2.18B.6 (§11) — the single enriched Rust FactualPackage.
//!
//! This is the ordered, versioned, canonical evidence the ONE Grounded-Synthesis pass may synthesise
//! from — and nothing else. `build_factual_package_planned` is the single builder: Rust resolves the
//! intent, plans the answer and plans retrieval/reranking, then draws the facts from exactly the
//! RetrievalPlan's eligible, public sources (conflict-excluded/historical/ineligible sources are never
//! drawn; an unmapped concept falls back to the top reranked canonical corpus chunks). Every fact
//! carries a stable id such as `F1`, its exact canonical source anchor — document id, kind, title,
//! section, anchor, path — plus the plan role that selected it, a per-fact checksum and its citation
//! key, so the answer's claims can be mapped back by the citation map and checked by the factual
//! validator. The package embeds the ResolvedIntent, AnswerPlan and RetrievalPlan and every provenance
//! (states, conflicts, claims allowed/forbidden, information gaps, source/plan/package checksums) so the
//! model never has to interpret input, choose sources, resolve entities, rerank, decide currency, or
//! resolve conflicts. `allowed_source_ids` is the closed set of documents the answer may cite. The
//! function is pure and total: no model, no I/O; the corpus is the build-time `doc-index.json`.

use crate::answerplan::{plan_answer, AnswerPlan};
use crate::relation;
use crate::resolve::{resolve_intent, ResolvedIntent};
use crate::retrieval::{
    plan_retrieval, RelatedEdgeRef, RetrievalConflict, RetrievalPlan, SourceRole,
};
use crate::taxonomy::{resolve_query, QueryResolution};
use crate::toolplan::{plan_tools, ToolPlan};
use crate::{docref, normalize, retrieve_doc_chunks, DocChunk};
use serde::{Deserialize, Serialize};

/// FactualPackage schema version. Bump on any breaking change to the fact/source contract. v2 is the
/// M2.18B.6 single enriched contract: it embeds the Rust ResolvedIntent + AnswerPlan + RetrievalPlan and
/// carries the full provenance the factual validator and the one Grounded-Synthesis pass need.
pub const FACTUAL_PACKAGE_VERSION: u32 = 2;

/// The factual-validator policy version this package was built for (bumps when factcheck's rules change).
pub const VALIDATOR_POLICY_VERSION: &str = "m2.18b6.1";
/// The output/synthesis prompt-contract version this package targets.
pub const PROMPT_VERSION: &str = "m2.18b6.1";

/// M2.18B.3A Round B — depth profiles. The package size is the dominant lever on the output-pass prompt
/// (and thus latency): a normal public question needs only the few most relevant sections, not the whole
/// document. `brief` is the default for normal questions; `standard`/`deep` are used only for
/// impact/compare/explicitly-deep requests. Returns (max_facts, max_fact_chars).
fn depth_limits(depth: &str) -> (usize, usize) {
    match depth {
        "deep" => (10, 480),
        "standard" => (6, 360),
        // "brief" and any unknown value → the tight default.
        _ => (3, 260),
    }
}

/// The exact canonical location a fact came from.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SourceAnchor {
    /// Canonical citeable id — an ADR/RFC id when the source is one, else the document path.
    pub document_id: String,
    /// "adr" | "rfc" | "reference" | "spec" | "contract" | "conformance" | "governance" | "doc".
    pub kind: String,
    pub title: String,
    pub section: String,
    pub anchor: String,
    pub path: String,
}

/// One canonical fact the output pass may use. `id` is stable within the package. In the planned
/// (§11) contract each fact also carries the RetrievalPlan role that selected its source, a stable
/// per-fact checksum, and the citation key the answer must use to cite it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Fact {
    pub id: String,
    pub text: String,
    pub source: SourceAnchor,
    /// RetrievalPlan SourceRole that selected this fact's source ("" for the transitional builders).
    #[serde(default)]
    pub role: String,
    /// Stable FNV-1a token over (document_id, section, text) — per-fact cache/verification key.
    #[serde(default)]
    pub checksum: String,
    /// The exact citation key the answer must use for this fact (the citeable document id).
    #[serde(default)]
    pub citation_key: String,
    /// Whether the RetrievalPlan marked this fact's source eligible (true for the transitional builders).
    #[serde(default = "default_true")]
    pub eligible: bool,
}

fn default_true() -> bool {
    true
}

/// One (source_id → role) provenance entry with the reason the RetrievalPlan selected it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SourceRoleEntry {
    pub source_id: String,
    pub role: String,
    pub selection_reason: String,
}

/// Document state metadata the answer must respect (current vs historical; date/version when known).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocState {
    pub id: String,
    /// "current" | "historical" | "" (unknown).
    pub status: String,
    pub date: String,
    pub version: String,
}

/// One claim→source mapping row: which fact cites which source, at which section, with which key.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CitationEntry {
    pub fact_id: String,
    pub source_id: String,
    pub section: String,
    pub checksum: String,
    pub citation_key: String,
}

/// A per-source content checksum over the facts drawn from that source.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SourceChecksum {
    pub source_id: String,
    pub checksum: String,
}

/// Increment 4 (§7/§8) — one DERIVED calculation the answer may present. A DERIVED metric claim must
/// preserve + expose its data, formula, method, filters, period and sample_size (reuse the BZO-8
/// AGGREGATION_METHOD). Numbers come only from the deterministic tool (SQL); no model ever fills these.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct Calculation {
    pub id: String,
    /// The claim id/label this calculation backs (e.g. "median_total").
    pub claim: String,
    /// The data it was computed over (e.g. "execuções públicas comparáveis").
    pub data: String,
    /// The formula/expression (e.g. "percentile_cont(0.5, total_ms)").
    pub formula: String,
    /// The statistical method (median | p95 | average | latest | per_step).
    pub method: String,
    /// The scope filters applied (the compatibility tuple).
    pub filters: String,
    /// The observed period.
    pub period: String,
    /// The number of measurements the calculation aggregated.
    pub sample_size: u32,
    /// The computed value (units included), for provenance.
    pub value: String,
    /// The BZO-8 aggregation label.
    pub aggregation: String,
}

impl Calculation {
    /// §8 — a DERIVED calculation fully EXPOSES its derivation: data, formula, method, filters, period and
    /// a positive sample_size are all present. The claim/citation verifier requires this before a DERIVED
    /// claim may be published.
    pub fn exposes_derivation(&self) -> bool {
        !self.data.trim().is_empty()
            && !self.formula.trim().is_empty()
            && !self.method.trim().is_empty()
            && !self.filters.trim().is_empty()
            && !self.period.trim().is_empty()
            && self.sample_size > 0
    }
}

/// Increment 4 (§7) — one live/persisted source the answer may cite (an operator origin, a telemetry set,
/// an evidence bundle). Kept separate from the documentary `facts` so the citation verifier can resolve a
/// citation to documentary OR live OR tool provenance.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct LiveSource {
    pub id: String,
    pub title: String,
    pub origin: String,
    pub sha256: String,
    pub observed_at: String,
    /// "live" | "persisted".
    pub kind: String,
}

/// Increment 4 (§7) — one tool result the package carries (the record a planned tool produced at runtime).
/// The tool kind is a [`crate::toolplan::ToolKind`] wire form; the source_id is a citeable id.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct ToolResultRef {
    pub tool: String,
    pub source_id: String,
    pub summary: String,
}

/// The ordered, versioned evidence package handed to the one Grounded-Synthesis pass. v2 (§11) is the
/// single enriched contract: it embeds the Rust plans and every provenance the validator needs, so the
/// model never has to interpret input, choose sources, resolve entities, rerank, decide currency, or
/// resolve conflicts — Rust did all of that. The transitional builders leave the embedded plans `None`
/// and the enriched fields empty; `build_factual_package_planned` fills the whole contract. `Default`
/// exists only so tests and callers can spread `..Default::default()` when they construct a partial
/// package by hand — every real package is produced by a builder.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct FactualPackage {
    pub version: u32,
    pub trace_id: String,
    pub intent: String,
    /// Resolved document id, or "" for a concept question.
    pub entity_id: String,
    /// Stable content token over the facts (cache invalidation; changes iff the evidence changes).
    pub content_hash: String,
    pub facts: Vec<Fact>,
    /// The CLOSED set of document ids the answer may cite (first-appearance order).
    pub allowed_source_ids: Vec<String>,

    // ---- §11 enriched contract (None/empty for the transitional builders) ----
    /// The Rust resolver's typed intent (never re-derived by the model).
    #[serde(default)]
    pub resolved_intent: Option<ResolvedIntent>,
    /// The Rust answer shape (sections, foci, citation requirements, expected model calls).
    #[serde(default)]
    pub answer_plan: Option<AnswerPlan>,
    /// The Rust retrieval/reranking plan (eligible sources, roles, conflicts, checksums).
    #[serde(default)]
    pub retrieval_plan: Option<RetrievalPlan>,
    /// Canonical relation edges the plan used (from the RelationGraph).
    #[serde(default)]
    pub relation_edges: Vec<RelatedEdgeRef>,
    /// Per-source role + selection reason for every eligible source in the package.
    #[serde(default)]
    pub source_roles: Vec<SourceRoleEntry>,
    /// Every selection reason the RetrievalPlan recorded (audit trail).
    #[serde(default)]
    pub selection_reasons: Vec<String>,
    /// Section hints the plan surfaced (ordered).
    #[serde(default)]
    pub section_hints: Vec<String>,
    /// Document state metadata (current/historical, dates, versions).
    #[serde(default)]
    pub states: Vec<DocState>,
    /// Source ids the answer MAY assert about (== allowed_source_ids; explicit for the validator).
    #[serde(default)]
    pub claims_allowed: Vec<String>,
    /// Source ids the answer must NOT present as authority (historical/ineligible/forbidden).
    #[serde(default)]
    pub claims_forbidden: Vec<String>,
    /// Aspects the evidence cannot support (from AnswerPlan.unresolved_aspects + escalation).
    #[serde(default)]
    pub information_gaps: Vec<String>,
    /// Documental conflicts the plan resolved (supersession etc.).
    #[serde(default)]
    pub conflicts: Vec<RetrievalConflict>,
    /// "clean" | "excluded_present" — whether an internal/excluded source was demanded.
    #[serde(default)]
    pub source_policy_status: String,
    /// Claim→source map: one row per fact.
    #[serde(default)]
    pub citation_map: Vec<CitationEntry>,
    /// Canonical concept/terminology terms in scope.
    #[serde(default)]
    pub terminology: Vec<String>,
    /// Requested output format ("markdown").
    #[serde(default)]
    pub requested_format: String,
    /// Requested depth (brief | standard | deep).
    #[serde(default)]
    pub requested_depth: String,
    /// Whether an example was requested.
    #[serde(default)]
    pub requested_example: bool,
    /// Answer language (from the resolver).
    #[serde(default)]
    pub language: String,
    /// Per-source content checksums.
    #[serde(default)]
    pub source_checksums: Vec<SourceChecksum>,
    /// Checksum of the RelationGraph the plan drew from.
    #[serde(default)]
    pub relation_graph_checksum: String,
    /// Checksum of the embedded RetrievalPlan.
    #[serde(default)]
    pub retrieval_plan_checksum: String,
    /// Checksum of the embedded AnswerPlan.
    #[serde(default)]
    pub answer_plan_checksum: String,
    /// Checksum over the whole package (all constituent checksums + versions) — the cache key.
    #[serde(default)]
    pub package_checksum: String,
    /// The output/synthesis prompt-contract version this package targets.
    #[serde(default)]
    pub prompt_version: String,
    /// The factual-validator policy version this package was built for.
    #[serde(default)]
    pub validator_policy_version: String,

    // ---- Increment 4 (§7) — the TRANSVERSAL enrichment. Built BEFORE any linguistic synthesis, for the
    // documentary trunk AND the operational/telemetry path, so claim + citation verification is uniform.
    // Empty/None for the transitional builders; the documentary builder fills the resolution/plan/freshness,
    // the operational builder fills the tool_results/calculations/live_sources/sample_size. ----
    /// The normalized question this package answers.
    #[serde(default)]
    pub normalized_question: String,
    /// The rich taxonomy resolution (primary intent + sub-intents + scope + requirement flags). Rust-owned.
    #[serde(default)]
    pub query_resolution: Option<QueryResolution>,
    /// The deterministic ToolPlan the resolution mapped to (which typed tools, in what order). Rust-owned.
    #[serde(default)]
    pub tool_plan: Option<ToolPlan>,
    /// The tool kinds actually invoked to build this package (runtime; empty for the pure documentary build).
    #[serde(default)]
    pub tools_called: Vec<String>,
    /// The tool results the package carries (runtime).
    #[serde(default)]
    pub tool_results: Vec<ToolResultRef>,
    /// Live/persisted sources (telemetry sets, operator origins, evidence bundles) the answer may cite.
    #[serde(default)]
    pub live_sources: Vec<LiveSource>,
    /// Formal-evidence references (evidence bundles / reproducible executions).
    #[serde(default)]
    pub formal_evidence: Vec<String>,
    /// The derived calculations the answer may present (each exposes data/formula/method/filters/period/sample).
    #[serde(default)]
    pub calculations: Vec<Calculation>,
    /// The number of measurements behind an aggregated metric (0 for the documentary build).
    #[serde(default)]
    pub sample_size: u32,
    /// The BZO-8 aggregation method label ("" for documentary).
    #[serde(default)]
    pub aggregation_method: String,
    /// Data freshness: "static" (documentary corpus) | "live" | "persisted".
    #[serde(default)]
    pub freshness: String,
    /// Aspects the evidence cannot settle (mirrors information_gaps + any runtime uncertainty).
    #[serde(default)]
    pub uncertainties: Vec<String>,
    /// Inferences the answer must NOT make from this evidence (unsupported extrapolations, unsupported causes).
    #[serde(default)]
    pub unsupported_inferences: Vec<String>,
}

/// Count distinct query terms (len > 2) present in a chunk's normalized haystack. Deterministic.
fn overlap(terms: &[&str], c: &DocChunk) -> i64 {
    let hay = normalize(&format!("{} {} {}", c.title, c.section, c.chunk));
    terms
        .iter()
        .filter(|t| t.len() > 2 && hay.contains(**t))
        .count() as i64
}

/// Map a chunk's `source_type`/path to a stable citeable (document_id, kind). ADR/RFC chunks map to
/// their canonical id (via the registry by path); everything else cites its path with a coarse kind.
fn cite_identity(c: &DocChunk) -> (String, String) {
    if let Some(doc) = docref::registry().iter().find(|d| d.path == c.path) {
        return (doc.id.clone(), doc.kind.to_lowercase());
    }
    let kind = match c.source_type.as_str() {
        "" => "doc",
        other => other,
    };
    (c.path.clone(), kind.to_string())
}

fn anchor_of(c: &DocChunk) -> SourceAnchor {
    let (document_id, kind) = cite_identity(c);
    SourceAnchor {
        document_id,
        kind,
        title: c.title.clone(),
        section: c.section.clone(),
        anchor: c.anchor.clone(),
        path: c.path.clone(),
    }
}

fn clip(s: &str, max_chars: usize) -> String {
    let t = s.trim();
    if t.chars().count() <= max_chars {
        return t.to_string();
    }
    let mut out: String = t.chars().take(max_chars).collect();
    out.push('…');
    out
}

/// FNV-1a 64 over the facts' (document_id, section, text) — deterministic, dependency-free, sufficient
/// for cache keying (not security). Any change to the evidence changes the token.
fn hash_facts(facts: &[Fact]) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    let mut feed = |bytes: &[u8]| {
        for b in bytes {
            h ^= *b as u64;
            h = h.wrapping_mul(0x0000_0100_0000_01b3);
        }
    };
    for f in facts {
        feed(f.source.document_id.as_bytes());
        feed(f.source.section.as_bytes());
        feed(f.text.as_bytes());
        feed(b"|");
    }
    format!("{h:016x}")
}

/// FNV-1a 64 over one fact's (document_id, section, text) — a stable per-fact verification token.
fn fact_checksum(anchor: &SourceAnchor, text: &str) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for bytes in [
        anchor.document_id.as_bytes(),
        anchor.section.as_bytes(),
        text.as_bytes(),
    ] {
        for b in bytes {
            h ^= *b as u64;
            h = h.wrapping_mul(0x0000_0100_0000_01b3);
        }
        h ^= b'|' as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{h:016x}")
}

/// FNV-1a 64 over every constituent checksum + the prompt/validator versions — the package cache key.
/// Any change to the evidence, the plans, or the contract versions changes this token.
fn package_checksum(parts: &[&str]) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for p in parts {
        for b in p.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(0x0000_0100_0000_01b3);
        }
        h ^= b'|' as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{h:016x}")
}

/// M2.18B.6 (§11) — build the SINGLE enriched FactualPackage from the Rust plans. This is the only
/// path the Grounded-Synthesis trunk uses: Rust resolves the intent, plans the answer, plans retrieval
/// and reranking, and this function draws the facts from exactly the plan's eligible, public sources
/// (conflict-excluded/historical/ineligible sources are never drawn), attaching each fact's role,
/// checksum and citation key. The result embeds the three plans plus full provenance (states, conflicts,
/// citation map, per-source + package checksums, information gaps) so the one model call never has to
/// interpret input, choose sources, resolve entities, rerank, decide currency, or resolve conflicts —
/// and the factual validator can check every claim against a closed, versioned contract. Pure + total:
/// no model, no I/O; the corpus is the build-time `doc-index.json`. Empty facts ⇒ the trunk declines.
pub fn build_factual_package_planned(
    trace_id: &str,
    question: &str,
    seed: &str,
    depth_override: &str,
) -> FactualPackage {
    let resolved = resolve_intent(question, seed);
    let answer = plan_answer(question, seed);
    let retrieval = plan_retrieval(question, seed);

    // Depth: an explicit override wins; else the plan's depth; else the answer's length target.
    let depth: String = if !depth_override.is_empty() {
        depth_override.to_string()
    } else if !retrieval.depth.is_empty() {
        retrieval.depth.clone()
    } else {
        answer.length_target.clone()
    };
    let (max_facts_depth, max_fact_chars) = depth_limits(&depth);
    // Respect the plan's own chunk ceiling when it is tighter.
    let max_facts = if retrieval.max_chunks > 0 {
        max_facts_depth.min(retrieval.max_chunks)
    } else {
        max_facts_depth
    };

    let nq = normalize(question);
    let terms: Vec<&str> = nq.split(' ').filter(|w| w.len() > 2).collect();

    // Eligible, public sources in priority order (stable sort keeps plan order within equal priority).
    let mut eligible: Vec<_> = retrieval
        .sources
        .iter()
        .filter(|s| s.eligible && s.source_policy == "public")
        .collect();
    eligible.sort_by_key(|s| std::cmp::Reverse(s.priority));

    let per_source = if eligible.is_empty() {
        max_facts
    } else {
        max_facts.div_ceil(eligible.len()).max(1)
    };

    let mut facts: Vec<Fact> = Vec::new();
    let mut source_roles: Vec<SourceRoleEntry> = Vec::new();
    for ps in &eligible {
        if facts.len() >= max_facts {
            break;
        }
        // This source's own chunks: a registry ADR/RFC, or a public doc-index path.
        let candidate: Vec<&'static DocChunk> = match docref::resolve(&ps.source_id) {
            Some(doc) => doc.chunks(),
            None => crate::doc_chunks()
                .iter()
                .filter(|c| {
                    c.path == ps.source_id
                        && crate::source_policy::is_public_source(&c.path, &c.source_type)
                })
                .collect(),
        };
        if candidate.is_empty() {
            continue;
        }
        let mut chunks: Vec<(i64, usize, &'static DocChunk)> = candidate
            .into_iter()
            .enumerate()
            .map(|(i, c)| (overlap(&terms, c), i, c))
            .collect();
        // best overlap first; original document order breaks ties (deterministic).
        chunks.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
        let role = ps.role.as_str().to_string();
        let mut taken = 0usize;
        for (_, _, c) in chunks {
            if taken >= per_source || facts.len() >= max_facts {
                break;
            }
            let source = anchor_of(c);
            let text = clip(&c.chunk, max_fact_chars);
            let checksum = fact_checksum(&source, &text);
            let citation_key = source.document_id.clone();
            facts.push(Fact {
                id: format!("F{}", facts.len() + 1),
                text,
                source,
                role: role.clone(),
                checksum,
                citation_key,
                eligible: true,
            });
            taken += 1;
        }
        if taken > 0 {
            source_roles.push(SourceRoleEntry {
                source_id: ps.source_id.clone(),
                role: role.clone(),
                selection_reason: ps.selection_reason.clone(),
            });
        }
    }

    // Exact-source guarantee: when the resolver resolved an EXPLICIT document but the plan surfaced no
    // eligible facts for it — e.g. a SUPERSEDED ADR that conflict-resolution correctly demotes for
    // concept/impact retrieval — an explicit request for that document must still be answerable from the
    // document's OWN chunks (the answer explains it, noting its status). This preserves the retired
    // single-document builder's exact-source path; the supersession is surfaced via `states`/`conflicts`,
    // never hidden. Draws only the named record's own chunks, reranked by the query.
    if facts.is_empty() && !resolved.resolved_entity_id.is_empty() {
        if let Some(doc) = docref::resolve(&resolved.resolved_entity_id) {
            let mut chunks: Vec<(i64, usize, &'static DocChunk)> = doc
                .chunks()
                .into_iter()
                .enumerate()
                .map(|(i, c)| (overlap(&terms, c), i, c))
                .collect();
            chunks.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
            let mut taken = 0usize;
            for (_, _, c) in chunks {
                if taken >= max_facts {
                    break;
                }
                let source = anchor_of(c);
                let text = clip(&c.chunk, max_fact_chars);
                let checksum = fact_checksum(&source, &text);
                let citation_key = source.document_id.clone();
                facts.push(Fact {
                    id: format!("F{}", facts.len() + 1),
                    text,
                    source,
                    role: SourceRole::Primary.as_str().to_string(),
                    checksum,
                    citation_key,
                    eligible: true,
                });
                taken += 1;
            }
            if taken > 0 {
                source_roles.push(SourceRoleEntry {
                    source_id: resolved.resolved_entity_id.clone(),
                    role: SourceRole::Primary.as_str().to_string(),
                    selection_reason: "exact_source_explicit_document".to_string(),
                });
            }
        }
    }

    // M2.18B.7 — canonical entity coverage. A synthetic canonical-entity id (a route entry id such as
    // "what-is-banza") is NOT a document, so the exact-source guarantee above cannot fire; and a bare
    // definition/explanation query whose only content term is the ubiquitous entity name ("o que é o
    // BANZA?") retrieves nothing (its single term appears everywhere and never clears the retrieval
    // threshold). A KNOWN entity must still ground on its DECLARED primary source document(s) — an existing
    // canonical source must never degrade into a silent generic answer. Draws each mapped primary
    // document's own chunks, reranked by the query; Primary role.
    if facts.is_empty() && !resolved.resolved_entity_id.is_empty() {
        let mapped = crate::coverage::entity_primary_docs(&resolved.resolved_entity_id);
        if !mapped.is_empty() {
            let per_doc = max_facts.div_ceil(mapped.len()).max(1);
            for doc_id in mapped {
                if facts.len() >= max_facts {
                    break;
                }
                if let Some(doc) = docref::resolve(doc_id) {
                    let mut chunks: Vec<(i64, usize, &'static DocChunk)> = doc
                        .chunks()
                        .into_iter()
                        .enumerate()
                        .map(|(i, c)| (overlap(&terms, c), i, c))
                        .collect();
                    chunks.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
                    let mut taken = 0usize;
                    for (_, _, c) in chunks {
                        if taken >= per_doc || facts.len() >= max_facts {
                            break;
                        }
                        let source = anchor_of(c);
                        let text = clip(&c.chunk, max_fact_chars);
                        let checksum = fact_checksum(&source, &text);
                        let citation_key = source.document_id.clone();
                        facts.push(Fact {
                            id: format!("F{}", facts.len() + 1),
                            text,
                            source,
                            role: SourceRole::Primary.as_str().to_string(),
                            checksum,
                            citation_key,
                            eligible: true,
                        });
                        taken += 1;
                    }
                    if taken > 0 {
                        source_roles.push(SourceRoleEntry {
                            source_id: (*doc_id).to_string(),
                            role: SourceRole::Primary.as_str().to_string(),
                            selection_reason: "entity_primary_source_coverage".to_string(),
                        });
                    }
                }
            }
        }
    }

    // Corpus fallback: when the plan surfaced no eligible canonical source (an unmapped concept), draw the
    // top reranked canonical chunks across the corpus — the same deterministic strategy the retired
    // single-document builder used as its last resort. Still Rust-only, still no model; the facts take the
    // Supporting role. This guarantees the single builder's coverage is never below the retired builders'.
    if facts.is_empty() {
        let picked = retrieve_doc_chunks(question, max_facts);
        let mut fallback_sources: Vec<String> = Vec::new();
        for c in picked {
            if facts.len() >= max_facts {
                break;
            }
            let source = anchor_of(c);
            let text = clip(&c.chunk, max_fact_chars);
            let checksum = fact_checksum(&source, &text);
            let citation_key = source.document_id.clone();
            if !fallback_sources.contains(&source.document_id) {
                fallback_sources.push(source.document_id.clone());
            }
            facts.push(Fact {
                id: format!("F{}", facts.len() + 1),
                text,
                source,
                role: SourceRole::Supporting.as_str().to_string(),
                checksum,
                citation_key,
                eligible: true,
            });
        }
        for id in fallback_sources {
            source_roles.push(SourceRoleEntry {
                source_id: id,
                role: SourceRole::Supporting.as_str().to_string(),
                selection_reason: "corpus_fallback_no_eligible_plan_source".to_string(),
            });
        }
    }

    // Closed citeable set (first-appearance order).
    let mut allowed: Vec<String> = Vec::new();
    for f in &facts {
        if !allowed.contains(&f.source.document_id) {
            allowed.push(f.source.document_id.clone());
        }
    }

    // Forbidden: historical ids from conflicts + plan forbidden terms, minus anything actually allowed.
    let mut forbidden: Vec<String> = Vec::new();
    for c in &retrieval.conflicts {
        if !c.historical_id.is_empty() && !forbidden.contains(&c.historical_id) {
            forbidden.push(c.historical_id.clone());
        }
    }
    for t in &retrieval.forbidden_terms {
        if !forbidden.contains(t) {
            forbidden.push(t.clone());
        }
    }
    forbidden.retain(|f| !allowed.contains(f));

    // Document states: conflicts mark current/historical; every allowed source is current by default.
    let mut states: Vec<DocState> = Vec::new();
    for c in &retrieval.conflicts {
        if !c.current_id.is_empty() && !states.iter().any(|s| s.id == c.current_id) {
            states.push(DocState {
                id: c.current_id.clone(),
                status: "current".to_string(),
                date: String::new(),
                version: String::new(),
            });
        }
        if !c.historical_id.is_empty() && !states.iter().any(|s| s.id == c.historical_id) {
            states.push(DocState {
                id: c.historical_id.clone(),
                status: "historical".to_string(),
                date: String::new(),
                version: String::new(),
            });
        }
    }
    for id in &allowed {
        if !states.iter().any(|s| s.id == *id) {
            states.push(DocState {
                id: id.clone(),
                status: "current".to_string(),
                date: String::new(),
                version: String::new(),
            });
        }
    }

    // Claim→source map (one row per fact).
    let citation_map: Vec<CitationEntry> = facts
        .iter()
        .map(|f| CitationEntry {
            fact_id: f.id.clone(),
            source_id: f.source.document_id.clone(),
            section: f.source.section.clone(),
            checksum: f.checksum.clone(),
            citation_key: f.citation_key.clone(),
        })
        .collect();

    // Per-source content checksum (over that source's fact checksums).
    let mut source_checksums: Vec<SourceChecksum> = Vec::new();
    for id in &allowed {
        let parts: Vec<&str> = facts
            .iter()
            .filter(|f| &f.source.document_id == id)
            .map(|f| f.checksum.as_str())
            .collect();
        source_checksums.push(SourceChecksum {
            source_id: id.clone(),
            checksum: package_checksum(&parts),
        });
    }

    // Information gaps: unresolved aspects the answer plan already knows about, plus escalation.
    let mut information_gaps = answer.unresolved_aspects.clone();
    if retrieval.escalate_insufficient
        && !information_gaps
            .iter()
            .any(|g| g == "retrieval_escalate_insufficient")
    {
        information_gaps.push("retrieval_escalate_insufficient".to_string());
    }

    // Precompute everything borrowed from the plans BEFORE moving them into the embedded Options.
    let content_hash = hash_facts(&facts);
    let relation_graph_checksum = relation::graph().checksum.clone();
    let retrieval_plan_checksum = retrieval.checksum.clone();
    let answer_plan_checksum = answer.checksum.clone();
    let package_checksum = package_checksum(&[
        &content_hash,
        &relation_graph_checksum,
        &retrieval_plan_checksum,
        &answer_plan_checksum,
        PROMPT_VERSION,
        VALIDATOR_POLICY_VERSION,
    ]);
    let intent = resolved.primary_intent.clone();
    let entity_id = resolved.resolved_entity_id.clone();
    let language = resolved.language.clone();
    let requested_example = answer.example_requested || resolved.example_requested;
    let relation_edges = retrieval.relations_used.clone();
    let selection_reasons = retrieval.selection_reasons.clone();
    let section_hints = retrieval.sections.clone();
    let source_policy_status = retrieval.source_policy_status.clone();
    let conflicts = retrieval.conflicts.clone();
    let terminology = retrieval.concepts.clone();
    let claims_allowed = allowed.clone();

    // Increment 4 (§7) — the transversal enrichment for the documentary trunk. The rich taxonomy resolution
    // (primary + sub-intents + scope) and the deterministic ToolPlan are the SAME Rust authorities the
    // operational path uses, so both paths carry one uniform package. A documentary answer draws from the
    // static canonical corpus, so freshness is "static" and there are no calculations/live sources.
    let normalized_question = normalize(question);
    let query_resolution = resolve_query(question);
    let tool_plan = plan_tools(&query_resolution);
    let uncertainties = information_gaps.clone();

    FactualPackage {
        version: FACTUAL_PACKAGE_VERSION,
        trace_id: trace_id.to_string(),
        intent,
        entity_id,
        content_hash,
        facts,
        allowed_source_ids: allowed,
        resolved_intent: Some(resolved),
        answer_plan: Some(answer),
        retrieval_plan: Some(retrieval),
        relation_edges,
        source_roles,
        selection_reasons,
        section_hints,
        states,
        claims_allowed,
        claims_forbidden: forbidden,
        information_gaps,
        conflicts,
        source_policy_status,
        citation_map,
        terminology,
        requested_format: "markdown".to_string(),
        requested_depth: depth,
        requested_example,
        language,
        source_checksums,
        relation_graph_checksum,
        retrieval_plan_checksum,
        answer_plan_checksum,
        package_checksum,
        prompt_version: PROMPT_VERSION.to_string(),
        validator_policy_version: VALIDATOR_POLICY_VERSION.to_string(),
        // Increment 4 (§7) transversal enrichment (documentary trunk).
        normalized_question,
        query_resolution: Some(query_resolution),
        tool_plan: Some(tool_plan),
        tools_called: Vec::new(),
        tool_results: Vec::new(),
        live_sources: Vec::new(),
        formal_evidence: Vec::new(),
        calculations: Vec::new(),
        sample_size: 0,
        aggregation_method: String::new(),
        freshness: "static".to_string(),
        uncertainties,
        unsupported_inferences: Vec::new(),
    }
}

/// Increment 4 (§7/§9) — build the TRANSVERSAL FactualPackage for an operational (telemetry) question, from
/// the SAME Rust resolution + ToolPlan the documentary trunk uses plus the deterministic tool output. Numbers
/// come ONLY from the tool (SQL over persisted receipts, ADR-036/BZO-8/9) — never a model — so this routes
/// the operational path through the same package + verification, uniformly. `duration_json` is the typed
/// DurationAnswer view, `claims_json` the `[{claim,category,value_ms}]` map, `sources_json` the citeable
/// `[{id,title,path}]` set the tool produced. Pure + total: no model, no I/O; every number is copied verbatim.
pub fn build_operational_package(
    trace_id: &str,
    question: &str,
    duration_json: &str,
    claims_json: &str,
    sources_json: &str,
) -> FactualPackage {
    let resolution = resolve_query(question);
    let tool_plan = plan_tools(&resolution);
    let op = crate::operational::resolve_operational_metric(question);
    let normalized_question = normalize(question);
    let intent = if !op.intent.is_empty() {
        op.intent.clone()
    } else {
        resolution.primary_intent.clone()
    };
    let tools_called: Vec<String> = tool_plan.steps.iter().map(|s| s.kind.clone()).collect();

    let duration: serde_json::Value = serde_json::from_str(duration_json).unwrap_or_default();
    let claims: Vec<serde_json::Value> = serde_json::from_str(claims_json).unwrap_or_default();
    let sources: Vec<serde_json::Value> = serde_json::from_str(sources_json).unwrap_or_default();
    let dstr = |k: &str| -> String {
        duration
            .get(k)
            .and_then(|v| {
                v.as_str()
                    .map(|s| s.to_string())
                    .or_else(|| v.as_u64().map(|n| n.to_string()))
                    .or_else(|| v.as_f64().map(|n| n.to_string()))
            })
            .unwrap_or_default()
    };
    let sample_size: u32 = duration
        .get("comparable_runs")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let aggregation_method = {
        let am = dstr("aggregation_method");
        if am.is_empty() {
            dstr("measure_type")
        } else {
            am
        }
    };
    let filters = format!(
        "implementation={} · profile={} · environment={} · protocol_version={}",
        {
            let s = dstr("implementation_id");
            if s.is_empty() {
                "—".to_string()
            } else {
                s
            }
        },
        {
            let s = dstr("profile");
            if s.is_empty() {
                "—".to_string()
            } else {
                s
            }
        },
        {
            let s = dstr("environment");
            if s.is_empty() {
                "—".to_string()
            } else {
                s
            }
        },
        {
            let s = dstr("protocol_version");
            if s.is_empty() {
                "—".to_string()
            } else {
                s
            }
        },
    );
    let period = {
        let from = dstr("observed_from");
        let to = dstr("observed_to");
        match (from.is_empty(), to.is_empty()) {
            (false, false) if from == to => from,
            (false, false) => format!("{from} → {to}"),
            _ => "n/d".to_string(),
        }
    };
    let pmethod = {
        let s = dstr("percentile_method");
        if s.is_empty() {
            "percentile_cont — interpolação linear".to_string()
        } else {
            s
        }
    };

    // One Calculation per DERIVED claim (a SUPPORTED latest observation is a measured value, not a
    // derivation, so it needs no calculation). Every field is exposed so the DERIVED claim is publishable.
    let mut calculations: Vec<Calculation> = Vec::new();
    for c in &claims {
        let category = c
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_uppercase();
        if category != "DERIVED" {
            continue;
        }
        let claim = c
            .get("claim")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let value = c
            .get("value_ms")
            .and_then(|v| v.as_f64())
            .map(|n| format!("{n} ms"))
            .unwrap_or_default();
        let method = if claim.contains("median") {
            "median"
        } else if claim.contains("p95") {
            "p95"
        } else if claim.contains("average") || claim.contains("avg") {
            "average"
        } else if claim.starts_with("step_") {
            "per_step"
        } else {
            aggregation_method.as_str()
        }
        .to_string();
        calculations.push(Calculation {
            id: format!("C{}", calculations.len() + 1),
            claim,
            data: "execuções públicas comparáveis (telemetria de receipts persistidos)".to_string(),
            formula: format!("{pmethod} sobre total_ms"),
            method,
            filters: filters.clone(),
            period: period.clone(),
            sample_size,
            value,
            aggregation: aggregation_method.clone(),
        });
    }

    // Tool results + live (persisted) sources + citeable ids from the tool's own source set.
    let observed_at = dstr("observed_to");
    let mut tool_results: Vec<ToolResultRef> = Vec::new();
    let mut live_sources: Vec<LiveSource> = Vec::new();
    let mut allowed_source_ids: Vec<String> = Vec::new();
    for s in &sources {
        let id = s
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        let title = s
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let path = s
            .get("path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        tool_results.push(ToolResultRef {
            tool: "METRICS_QUERY".to_string(),
            source_id: id.clone(),
            summary: title.clone(),
        });
        live_sources.push(LiveSource {
            id: id.clone(),
            title,
            origin: path,
            sha256: String::new(),
            observed_at: observed_at.clone(),
            kind: "persisted".to_string(),
        });
        if !allowed_source_ids.contains(&id) {
            allowed_source_ids.push(id);
        }
    }

    let unsupported_inferences = vec![
        "não apresentar uma observação individual como média geral".to_string(),
        "não extrapolar para perfis, ambientes ou versões de protocolo não medidos".to_string(),
        "não inferir a causa de uma duração sem evidência".to_string(),
    ];
    let claims_allowed = allowed_source_ids.clone();

    FactualPackage {
        version: FACTUAL_PACKAGE_VERSION,
        trace_id: trace_id.to_string(),
        intent,
        entity_id: String::new(),
        content_hash: String::new(),
        facts: Vec::new(),
        allowed_source_ids,
        claims_allowed,
        requested_format: "markdown".to_string(),
        prompt_version: PROMPT_VERSION.to_string(),
        validator_policy_version: VALIDATOR_POLICY_VERSION.to_string(),
        normalized_question,
        query_resolution: Some(resolution),
        tool_plan: Some(tool_plan),
        tools_called,
        tool_results,
        live_sources,
        calculations,
        sample_size,
        aggregation_method,
        freshness: "persisted".to_string(),
        unsupported_inferences,
        ..Default::default()
    }
}

/// Increment 5 (§10–§13) — build the TRANSVERSAL FactualPackage for a TOOL-BACKED question family
/// (reason code, execution comparison, diagnosis) from the SAME Rust resolution + ToolPlan the documentary
/// trunk uses plus the deterministic tool output. It carries the SAME contract as the documentary and
/// operational packages so the ONE claim/citation verifier runs uniformly. Every fact's text comes verbatim
/// from a tool result (the reason-code registry, the receipt store's execution/diff) — never a model.
///
/// `tool_results_json` is a JSON array of `[{tool, source_id, title, path, text, kind, observed_at, sha256}]`.
/// An entry with non-empty `text` becomes a citeable Fact; every entry is recorded as a ToolResultRef, and a
/// "persisted"/"live" entry is also a LiveSource so a persisted execution id is citeable even without a fact.
/// `freshness` is derived from the entries (persisted > live > static). Pure + total: no model, no I/O.
pub fn build_family_package(
    trace_id: &str,
    question: &str,
    tool_results_json: &str,
) -> FactualPackage {
    let resolution = resolve_query(question);
    let tool_plan = plan_tools(&resolution);
    let normalized_question = normalize(question);
    let intent = resolution.primary_intent.clone();

    let entries: Vec<serde_json::Value> =
        serde_json::from_str(tool_results_json).unwrap_or_default();
    let sstr = |v: &serde_json::Value, k: &str| -> String {
        v.get(k)
            .and_then(|x| x.as_str())
            .unwrap_or_default()
            .to_string()
    };

    let mut facts: Vec<Fact> = Vec::new();
    let mut tool_results: Vec<ToolResultRef> = Vec::new();
    let mut live_sources: Vec<LiveSource> = Vec::new();
    let mut allowed_source_ids: Vec<String> = Vec::new();
    let mut tools_called: Vec<String> = Vec::new();
    let mut any_persisted = false;
    let mut any_live = false;

    for e in &entries {
        let tool = sstr(e, "tool");
        let source_id = sstr(e, "source_id");
        if source_id.is_empty() {
            continue;
        }
        let title = sstr(e, "title");
        let path = sstr(e, "path");
        let text = sstr(e, "text");
        let kind = {
            let k = sstr(e, "kind");
            if k.is_empty() {
                "static".to_string()
            } else {
                k
            }
        };
        if kind == "persisted" {
            any_persisted = true;
        } else if kind == "live" {
            any_live = true;
        }
        if !tool.is_empty() && !tools_called.contains(&tool) {
            tools_called.push(tool.clone());
        }
        tool_results.push(ToolResultRef {
            tool: if tool.is_empty() {
                "HONEST_FALLBACK".to_string()
            } else {
                tool.clone()
            },
            source_id: source_id.clone(),
            summary: if title.is_empty() {
                clip(&text, 120)
            } else {
                title.clone()
            },
        });
        if kind == "persisted" || kind == "live" {
            live_sources.push(LiveSource {
                id: source_id.clone(),
                title: title.clone(),
                origin: path.clone(),
                sha256: sstr(e, "sha256"),
                observed_at: sstr(e, "observed_at"),
                kind: kind.clone(),
            });
        }
        if !text.trim().is_empty() {
            let source = SourceAnchor {
                document_id: source_id.clone(),
                kind: "tool".to_string(),
                title: title.clone(),
                section: String::new(),
                anchor: String::new(),
                path: path.clone(),
            };
            let clipped = clip(&text, 480);
            let checksum = fact_checksum(&source, &clipped);
            facts.push(Fact {
                id: format!("F{}", facts.len() + 1),
                text: clipped,
                source,
                role: "primary".to_string(),
                checksum,
                citation_key: source_id.clone(),
                eligible: true,
            });
        }
        if !allowed_source_ids.contains(&source_id) {
            allowed_source_ids.push(source_id);
        }
    }

    let citation_map: Vec<CitationEntry> = facts
        .iter()
        .map(|f| CitationEntry {
            fact_id: f.id.clone(),
            source_id: f.source.document_id.clone(),
            section: f.source.section.clone(),
            checksum: f.checksum.clone(),
            citation_key: f.citation_key.clone(),
        })
        .collect();
    let mut source_checksums: Vec<SourceChecksum> = Vec::new();
    for id in &allowed_source_ids {
        let parts: Vec<&str> = facts
            .iter()
            .filter(|f| &f.source.document_id == id)
            .map(|f| f.checksum.as_str())
            .collect();
        source_checksums.push(SourceChecksum {
            source_id: id.clone(),
            checksum: package_checksum(&parts),
        });
    }

    let freshness = if any_persisted {
        "persisted"
    } else if any_live {
        "live"
    } else {
        "static"
    }
    .to_string();

    let content_hash = hash_facts(&facts);
    let package_checksum = package_checksum(&[
        &content_hash,
        &normalized_question,
        &intent,
        PROMPT_VERSION,
        VALIDATOR_POLICY_VERSION,
    ]);
    let claims_allowed = allowed_source_ids.clone();

    FactualPackage {
        version: FACTUAL_PACKAGE_VERSION,
        trace_id: trace_id.to_string(),
        intent,
        entity_id: resolution.subject.clone(),
        content_hash,
        facts,
        allowed_source_ids,
        claims_allowed,
        citation_map,
        source_checksums,
        package_checksum,
        requested_format: "markdown".to_string(),
        prompt_version: PROMPT_VERSION.to_string(),
        validator_policy_version: VALIDATOR_POLICY_VERSION.to_string(),
        normalized_question,
        query_resolution: Some(resolution),
        tool_plan: Some(tool_plan),
        tools_called,
        tool_results,
        live_sources,
        freshness,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn planned_entity_package_cites_only_that_document() {
        let p = build_factual_package_planned(
            "t1",
            "explica a ADR-001 sobre a inversao de nomes do ecossistema",
            "ADR-001",
            "brief",
        );
        assert_eq!(p.version, FACTUAL_PACKAGE_VERSION);
        assert!(!p.facts.is_empty(), "ADR-001 must yield facts");
        assert_eq!(p.allowed_source_ids, vec!["ADR-001".to_string()]);
        // brief profile: at most 3 facts, each within the brief char cap.
        assert!(
            p.facts.len() <= 3,
            "brief caps facts at 3, got {}",
            p.facts.len()
        );
        for f in &p.facts {
            assert_eq!(f.source.document_id, "ADR-001");
            assert!(f.text.chars().count() <= 260 + 1);
            assert_eq!(f.citation_key, "ADR-001");
            assert_eq!(f.role, "primary");
        }
        // stable fact ids F1..Fn
        assert_eq!(p.facts[0].id, "F1");
    }

    #[test]
    fn planned_content_hash_changes_with_entity() {
        let a = build_factual_package_planned("t", "explica a ADR-012", "ADR-012", "brief");
        let b = build_factual_package_planned("t", "explica a ADR-001", "ADR-001", "brief");
        assert_ne!(a.content_hash, b.content_hash);
    }

    #[test]
    fn planned_concept_package_draws_real_sources() {
        // a concept query grounds on a canonical source with real anchors, no duplicate allowed ids.
        let p = build_factual_package_planned(
            "t",
            "o que e a dupla entrada debito credito ledger",
            "",
            "standard",
        );
        for f in &p.facts {
            assert!(!f.source.document_id.is_empty());
            assert!(!f.source.title.is_empty());
            assert!(!f.checksum.is_empty());
        }
        let mut seen = std::collections::BTreeSet::new();
        for id in &p.allowed_source_ids {
            assert!(seen.insert(id.clone()), "dup source id {id}");
        }
    }

    #[test]
    fn planned_compare_package_spans_both_named_documents() {
        // A comparison must contain BOTH named documents so the answer can cite each side without the
        // validator rejecting an out-of-package citation. The RetrievalPlan makes each a primary source.
        let p =
            build_factual_package_planned("t", "compara a ADR-035 com a ADR-036", "", "standard");
        assert!(
            !p.facts.is_empty(),
            "must yield facts from the two documents"
        );
        assert!(
            p.allowed_source_ids.contains(&"ADR-035".to_string()),
            "ADR-035 must be citeable"
        );
        assert!(
            p.allowed_source_ids.contains(&"ADR-036".to_string()),
            "ADR-036 must be citeable"
        );
        assert!(p.facts.len() <= 6 + 1, "standard depth cap respected");
    }

    #[test]
    fn planned_unknown_reference_does_not_panic() {
        // A nonexistent id resolves to no eligible plan source; the corpus fallback keeps it total.
        let p = build_factual_package_planned("t", "explica a ADR-999", "ADR-999", "brief");
        // no panic; a package is always returned (facts may come from the corpus fallback or be empty).
        assert_eq!(p.version, FACTUAL_PACKAGE_VERSION);
    }

    // ---- M2.18B.6 §11 — the single enriched contract ----

    #[test]
    fn planned_package_is_the_enriched_v2_contract() {
        let p = build_factual_package_planned(
            "tp",
            "explica a ADR-012 sobre dupla entrada",
            "ADR-012",
            "",
        );
        // v2 contract with the three plans embedded.
        assert_eq!(p.version, FACTUAL_PACKAGE_VERSION);
        assert_eq!(p.version, 2);
        assert!(p.resolved_intent.is_some(), "embeds the resolver");
        assert!(p.answer_plan.is_some(), "embeds the answer plan");
        assert!(p.retrieval_plan.is_some(), "embeds the retrieval plan");
        // contract metadata is always stamped.
        assert_eq!(p.prompt_version, PROMPT_VERSION);
        assert_eq!(p.validator_policy_version, VALIDATOR_POLICY_VERSION);
        assert!(!p.package_checksum.is_empty(), "package checksum present");
        assert!(!p.relation_graph_checksum.is_empty());
        assert_eq!(
            p.retrieval_plan_checksum,
            p.retrieval_plan.as_ref().unwrap().checksum
        );
        assert_eq!(
            p.answer_plan_checksum,
            p.answer_plan.as_ref().unwrap().checksum
        );
        // ADR-012 must ground and be citeable; every fact carries the enriched anchor.
        assert!(!p.facts.is_empty(), "ADR-012 must yield facts");
        assert!(p.allowed_source_ids.contains(&"ADR-012".to_string()));
        assert_eq!(p.claims_allowed, p.allowed_source_ids);
        assert_eq!(p.requested_format, "markdown");
        for f in &p.facts {
            assert!(!f.checksum.is_empty(), "fact {} needs a checksum", f.id);
            assert!(
                !f.citation_key.is_empty(),
                "fact {} needs a citation key",
                f.id
            );
            assert!(f.eligible, "planned facts come from eligible sources");
        }
        // the citation map has one row per fact, keyed identically.
        assert_eq!(p.citation_map.len(), p.facts.len());
        for (row, f) in p.citation_map.iter().zip(p.facts.iter()) {
            assert_eq!(row.fact_id, f.id);
            assert_eq!(row.checksum, f.checksum);
            assert_eq!(row.source_id, f.source.document_id);
        }
    }

    #[test]
    fn planned_package_is_deterministic() {
        let a = build_factual_package_planned("t", "o que e a inversao de nomes", "", "");
        let b = build_factual_package_planned("t", "o que e a inversao de nomes", "", "");
        assert_eq!(a, b);
        assert_eq!(a.package_checksum, b.package_checksum);
    }

    #[test]
    fn planned_package_never_draws_forbidden_or_ineligible_sources() {
        // Whatever the plan forbids (historical/ineligible) must never appear as a citeable source.
        let p = build_factual_package_planned(
            "t",
            "explica a inversao de nomes do ecossistema",
            "",
            "",
        );
        for forbidden in &p.claims_forbidden {
            assert!(
                !p.allowed_source_ids.contains(forbidden),
                "forbidden source {forbidden} must not be citeable"
            );
        }
        // every drawn fact's source is in the closed allowed set.
        for f in &p.facts {
            assert!(
                p.allowed_source_ids.contains(&f.source.document_id),
                "fact source {} must be in allowed set",
                f.source.document_id
            );
        }
    }

    // ---- Increment 4 (§7) — the transversal package carries the resolution + plan + provenance ----

    #[test]
    fn documentary_package_carries_the_transversal_fields() {
        let p = build_factual_package_planned(
            "t4",
            "explica a ADR-012 sobre dupla entrada",
            "ADR-012",
            "",
        );
        // §7 fields are populated for the documentary trunk.
        assert!(!p.normalized_question.is_empty());
        assert!(
            p.query_resolution.is_some(),
            "carries the taxonomy resolution"
        );
        assert!(p.tool_plan.is_some(), "carries the deterministic tool plan");
        let qr = p.query_resolution.as_ref().unwrap();
        assert!(!qr.primary_intent.is_empty());
        assert_eq!(p.freshness, "static", "documentary corpus is static");
        // documentary answers have no calculations / live sources / sample.
        assert!(p.calculations.is_empty());
        assert!(p.live_sources.is_empty());
        assert_eq!(p.sample_size, 0);
        // allowed_claims / forbidden_claims / citations reuse the existing fields.
        assert_eq!(p.claims_allowed, p.allowed_source_ids);
        assert_eq!(p.citation_map.len(), p.facts.len());
    }

    #[test]
    fn operational_package_carries_all_transversal_fields() {
        // A representative telemetry observation (mirrors telemetry.js output shape).
        let duration = r#"{"measure_type":"mediana","comparable_runs":3,"profile":"L0","environment":"sandbox","protocol_version":"1.0.0","implementation_id":"operator-zero-ref-impl","median_ms":12800,"p95_ms":18400,"latest_ms":13200,"observed_from":"2026-08-01","observed_to":"2026-08-05","aggregation_method":"median","percentile_method":"percentile_cont — linear"}"#;
        let claims = r#"[{"claim":"latest_observed_total","category":"SUPPORTED","value_ms":13200},{"claim":"median_total","category":"DERIVED","value_ms":12800}]"#;
        let sources = r#"[{"id":"telemetry:operator-zero-ref-impl:L0:sandbox:1.0.0","title":"Telemetria de execuções públicas","path":"/banzai/validate/executions"}]"#;
        let p = build_operational_package(
            "t4op",
            "Quanto tempo leva uma jornada completa de validação?",
            duration,
            claims,
            sources,
        );
        assert_eq!(p.version, FACTUAL_PACKAGE_VERSION);
        assert_eq!(p.intent, "get_duration");
        assert!(p.query_resolution.is_some(), "carries the resolution");
        assert!(p.tool_plan.is_some(), "carries the tool plan");
        assert!(
            p.tools_called.contains(&"METRICS_QUERY".to_string()),
            "records the telemetry tool"
        );
        assert_eq!(p.freshness, "persisted");
        assert_eq!(p.aggregation_method, "median");
        assert_eq!(p.sample_size, 3);
        assert!(!p.live_sources.is_empty(), "carries the telemetry source");
        assert!(!p.tool_results.is_empty(), "carries the tool result");
        assert!(
            !p.unsupported_inferences.is_empty(),
            "declares the inference boundary"
        );
        // the DERIVED calculation exposes data/formula/method/filters/period/sample.
        assert_eq!(p.calculations.len(), 1, "one DERIVED calc (median)");
        let c = &p.calculations[0];
        assert!(
            c.exposes_derivation(),
            "DERIVED calc exposes all fields: {c:?}"
        );
        assert_eq!(c.method, "median");
        assert_eq!(c.sample_size, 3);
        assert!(c.filters.contains("L0"));
        assert!(c.period.contains("2026-08"));
    }

    // ---- Increment 5 (§10–§13) — the tool-backed family package ----

    #[test]
    fn family_package_grounds_on_a_static_tool_result() {
        let tr = r#"[{"tool":"REASON_CODE_LOOKUP","source_id":"reason-codes","title":"Registo de códigos de razão","path":"engines/banzai-query-core/src/reason.rs","text":"CANONICAL_SOURCE_MISSING — não existe fonte canónica pública suficiente.","kind":"static"}]"#;
        let p = build_family_package(
            "t5",
            "o que significa o reason code CANONICAL_SOURCE_MISSING?",
            tr,
        );
        assert_eq!(p.version, FACTUAL_PACKAGE_VERSION);
        assert_eq!(p.intent, "get_reason_code");
        assert_eq!(p.facts.len(), 1);
        assert_eq!(p.facts[0].id, "F1");
        assert_eq!(p.facts[0].citation_key, "reason-codes");
        assert!(p.allowed_source_ids.contains(&"reason-codes".to_string()));
        assert!(p.tools_called.contains(&"REASON_CODE_LOOKUP".to_string()));
        assert_eq!(p.freshness, "static");
        assert_eq!(p.citation_map.len(), 1);
        assert!(p.query_resolution.is_some());
        assert!(p.tool_plan.is_some());
    }

    #[test]
    fn family_package_persisted_execution_id_is_citeable_without_a_fact() {
        // A comparison names two execution ids as persisted sources plus one fact carrying the diff text.
        let tr = r#"[
          {"tool":"EXECUTION_LOOKUP","source_id":"exec-a","title":"Execução A","path":"/banzai/validate/executions/exec-a","kind":"persisted"},
          {"tool":"EXECUTION_LOOKUP","source_id":"exec-b","title":"Execução B","path":"/banzai/validate/executions/exec-b","kind":"persisted"},
          {"tool":"COMPARE_EXECUTIONS","source_id":"compare:exec-a:exec-b","title":"Diferença","path":"","text":"overall_status: a=READY b=FAILED (alterado).","kind":"persisted"}
        ]"#;
        let p = build_family_package("t5", "compara a última execução com a anterior", tr);
        assert_eq!(p.freshness, "persisted");
        // exec-a/exec-b are live/persisted sources → citeable even though they carry no documentary fact.
        assert!(p.live_sources.iter().any(|s| s.id == "exec-a"));
        assert!(p.live_sources.iter().any(|s| s.id == "exec-b"));
        assert!(p
            .tool_results
            .iter()
            .any(|t| t.source_id == "compare:exec-a:exec-b"));
        assert_eq!(p.facts.len(), 1, "only the diff carries a documentary fact");
    }

    #[test]
    fn family_package_is_deterministic() {
        let tr = r#"[{"tool":"REASON_CODE_LOOKUP","source_id":"reason-codes","text":"x","kind":"static"}]"#;
        let a = build_family_package("t", "explica BOUNDARY_BLOCKED", tr);
        let b = build_family_package("t", "explica BOUNDARY_BLOCKED", tr);
        assert_eq!(a, b);
        assert_eq!(a.package_checksum, b.package_checksum);
    }

    #[test]
    fn planned_corpus_fallback_when_no_eligible_plan_source() {
        // An unmapped concept with corpus overlap must still ground (Supporting role) — never below the
        // retired builders' coverage. The fallback source_roles carry the corpus-fallback reason.
        let p = build_factual_package_planned(
            "t",
            "dupla entrada debito credito ledger razao contabilistico",
            "",
            "standard",
        );
        for f in &p.facts {
            assert!(!f.source.document_id.is_empty());
            assert!(!f.checksum.is_empty());
        }
        // whatever grounds, every drawn fact is in the closed allowed set.
        for f in &p.facts {
            assert!(p.allowed_source_ids.contains(&f.source.document_id));
        }
    }
}
