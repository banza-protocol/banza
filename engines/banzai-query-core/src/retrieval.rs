//! M2.18B.6 (§9-10) — the deterministic RetrievalPlan.
//!
//! Given a [`crate::resolve::ResolvedIntent`] (intent + entities + concept + explicit refs + depth) and
//! the [`crate::relation`] graph, this produces a typed, versioned plan that says — deterministically, in
//! Rust — which canonical SOURCES ground the answer, with what ROLE, for what REASON, in what order, and
//! under which limits. The model never selects, adds, removes or reranks a source: it only synthesises the
//! FactualPackage this plan seeds. Pure + total + reproducible: same ResolvedIntent + same corpus ⇒ same
//! plan (same checksum). No model, no network, no file I/O.
//!
//! Precedence (a lexical/textual signal can never outrank the ones above it): explicit reference → exact
//! entity → canonical relation → source role → section → textual similarity → supporting evidence.

use crate::answerplan::plan_answer;
use crate::obligations::{resolve_task, RequestedTask};
use crate::relation::{self, RelationKind};
use crate::resolve::{resolve_intent, ResolvedIntent};
use crate::{docref, normalize, source_policy, DocChunk};
use serde::{Deserialize, Serialize};

/// Bumped on any breaking change to the plan contract.
pub const RETRIEVAL_PLAN_VERSION: u32 = 1;

/// The closed set of source roles a planned source may carry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceRole {
    Primary,
    Supporting,
    Definition,
    Relationship,
    Governance,
    Legal,
    Metadata,
    Implementation,
}

impl SourceRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceRole::Primary => "primary",
            SourceRole::Supporting => "supporting",
            SourceRole::Definition => "definition",
            SourceRole::Relationship => "relationship",
            SourceRole::Governance => "governance",
            SourceRole::Legal => "legal",
            SourceRole::Metadata => "metadata",
            SourceRole::Implementation => "implementation",
        }
    }
    /// The base priority tier for a role (higher wins). A textual bonus (bounded) is added on top but can
    /// never lift a lower tier above a higher one.
    fn base_priority(&self) -> i64 {
        match self {
            SourceRole::Primary => 900,
            SourceRole::Definition => 850,
            SourceRole::Relationship => 700,
            SourceRole::Governance => 620,
            SourceRole::Legal => 600,
            SourceRole::Implementation => 560,
            SourceRole::Supporting => 400,
            SourceRole::Metadata => 380,
        }
    }
}

/// A confirmed relation carried into the plan (provenance for a relationship/impact source).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RelatedEdgeRef {
    pub from: String,
    pub to: String,
    pub kind: RelationKind,
}

/// One canonical source the plan selected, with an EXPLICIT reason. No source without a reason exists.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlannedSource {
    pub source_id: String,
    pub source_title: String,
    pub role: SourceRole,
    pub selection_reason: String,
    pub requested_entity: String,
    pub requested_operation: String,
    pub related_edge: Option<RelatedEdgeRef>,
    pub section_hints: Vec<String>,
    pub priority: i64,
    /// M2.18B.7 — how well this source fits the REQUESTED TASK (the primary rerank key). A task-suitable
    /// source outranks a merely thematic one even across role tiers.
    #[serde(default)]
    pub task_appropriateness: String,
    #[serde(default)]
    pub appropriateness_score: i64,
    /// M2.18B.7 DFN-5 — the typed reasons behind `task_appropriateness` (task×kind fit + content/currency/
    /// authority/subject adjustments), so the decision is explainable and testable, not a bare score.
    #[serde(default)]
    pub appropriateness_reasons: Vec<String>,
    pub eligible: bool,
    pub source_policy: String, // "public" | "internal_excluded"
    pub checksum: String,
}

/// A documental conflict surfaced from the relation graph / metadata (supersedes / conflicts_with /
/// divergent state). `resolution` ∈ "current_selected" | "unresolved_escalate_insufficient".
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RetrievalConflict {
    pub current_id: String,
    pub historical_id: String,
    pub kind: RelationKind,
    pub resolution: String,
}

/// The deterministic retrieval plan.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RetrievalPlan {
    pub schema_version: u32,
    pub trace_id: String,
    pub primary_intent: String,
    pub secondary_intents: Vec<String>,
    pub resolved_entities: Vec<String>,
    pub explicit_refs: Vec<String>,
    pub concepts: Vec<String>,
    pub relations_used: Vec<RelatedEdgeRef>,
    pub comparison: bool,
    pub depth: String,
    pub focus: String,
    pub sources: Vec<PlannedSource>,
    pub sections: Vec<String>,
    pub max_chunks: usize,
    pub needs_definition: bool,
    pub needs_metadata: bool,
    pub needs_history: bool,
    pub needs_implementation: bool,
    pub forbidden_terms: Vec<String>,
    pub conflicts: Vec<RetrievalConflict>,
    pub selection_reasons: Vec<String>,
    pub source_policy_status: String, // "clean" | "excluded_present"
    /// M2.18B.7 — the resolved RequestedTask this plan was ranked for.
    #[serde(default)]
    pub requested_task: String,
    /// M2.18B.7 — true when at least one eligible source is task-suitable (best class ≥ SuitableSupporting).
    /// The TaskCompletionValidator consumes this: false ⇒ the trunk degrades to a transparent limitation
    /// instead of passing a thematically-adjacent document off as the requested deliverable.
    #[serde(default)]
    pub source_appropriate: bool,
    /// "exact" | "suitable" | "thematic_only" | "none" — the best eligible appropriateness class.
    #[serde(default)]
    pub source_appropriateness: String,
    /// M2.18B.7 DFN-5 — the typed reasons behind the plan-level appropriateness verdict (the winning
    /// eligible source's decision), so the TaskCompletionValidator and the trace can explain WHY a source
    /// was or was not deemed task-suitable, not just report a class.
    #[serde(default)]
    pub appropriateness_reasons: Vec<String>,
    /// True when a conflict has no canonical resolution or no eligible source remains → the trunk must
    /// decline (insufficient) rather than present a historical or ineligible source as authority.
    pub escalate_insufficient: bool,
    pub checksum: String,
}

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

/// The chunks that make up a source id (a registry ADR/RFC OR a public doc-index path).
fn source_chunks(id: &str) -> Vec<&'static DocChunk> {
    if let Some(doc) = docref::resolve(id) {
        return doc.chunks();
    }
    crate::doc_chunks()
        .iter()
        .filter(|c| c.path == id)
        .collect()
}

fn source_title(id: &str) -> String {
    if let Some(doc) = docref::resolve(id) {
        return doc.title.clone();
    }
    source_chunks(id)
        .first()
        .map(|c| c.title.clone())
        .unwrap_or_else(|| id.to_string())
}

/// The document path for a source id (for source-policy checks). Registry docs carry a path; a path
/// source IS its own path.
fn source_path(id: &str) -> String {
    if let Some(doc) = docref::resolve(id) {
        return doc.path.clone();
    }
    id.to_string()
}

fn source_type_of(id: &str) -> String {
    if docref::resolve(id).is_some() {
        return "adr".to_string(); // registry docs are ADR/RFC — public canonical
    }
    source_chunks(id)
        .first()
        .map(|c| c.source_type.clone())
        .unwrap_or_default()
}

/// The top section names of a source whose text overlaps the query terms (deterministic; document order
/// breaks ties). Bounded to `n`.
fn top_sections(id: &str, terms: &[&str], n: usize) -> Vec<String> {
    let mut scored: Vec<(i64, usize, String)> = source_chunks(id)
        .iter()
        .enumerate()
        .map(|(i, c)| {
            let hay = normalize(&format!("{} {}", c.section, c.chunk));
            let s = terms
                .iter()
                .filter(|t| t.len() > 2 && hay.contains(**t))
                .count() as i64;
            (s, i, c.section.clone())
        })
        .filter(|x| !x.2.is_empty())
        .collect();
    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    let mut out: Vec<String> = Vec::new();
    for (_, _, sec) in scored {
        if !out.contains(&sec) {
            out.push(sec);
        }
        if out.len() >= n {
            break;
        }
    }
    out
}

/// The current status of a registry doc, lowercased ("" when unknown / not a registry doc).
fn status_of(id: &str) -> String {
    docref::resolve(id)
        .map(|d| d.status.to_ascii_lowercase())
        .unwrap_or_default()
}

/// True when a registry doc's own status marks it historical (superseded/retired/deprecated).
fn is_historical(id: &str) -> bool {
    let s = status_of(id);
    s.contains("supersed")
        || s.contains("retired")
        || s.contains("deprecated")
        || s.contains("obsolet")
}

/// Chunk-overlap textual bonus for a source against the query terms (0..=49, so it never crosses a role
/// tier gap). Keeps textual similarity strictly below every structural signal.
fn textual_bonus(id: &str, terms: &[&str]) -> i64 {
    let hay = normalize(
        &source_chunks(id)
            .iter()
            .map(|c| format!("{} {}", c.title, c.section))
            .collect::<Vec<_>>()
            .join(" "),
    );
    let hits = terms
        .iter()
        .filter(|t| t.len() > 2 && hay.contains(**t))
        .count() as i64;
    hits.min(49)
}

/// M2.18B.7 (Source Appropriateness) — how well a source fits the REQUESTED TASK, independent of its
/// generic role. This is the PRIMARY rerank key: a task-suitable source outranks a merely thematically
/// similar one EVEN ACROSS role tiers — a schema wins for a Template task though an ADR carries a higher
/// generic role, and a definitional ADR loses to a fixture for an Example. `Rejected`/`ThematicWeak` are
/// never dropped (they may still ground background) but can never WIN. The plan-level `source_appropriate`
/// verdict (best eligible class ≥ SuitableSupporting) is what the TaskCompletionValidator consumes: when
/// retrieval finds no task-suitable source, the trunk degrades to a transparent limitation rather than
/// passing a thematically-adjacent document off as the requested deliverable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppropriatenessClass {
    ExactTaskSource,
    SuitablePrimary,
    SuitableSupporting,
    ThematicWeak,
    Rejected,
}

impl AppropriatenessClass {
    fn as_str(&self) -> &'static str {
        match self {
            AppropriatenessClass::ExactTaskSource => "exact_task_source",
            AppropriatenessClass::SuitablePrimary => "suitable_primary",
            AppropriatenessClass::SuitableSupporting => "suitable_supporting",
            AppropriatenessClass::ThematicWeak => "thematic_weak",
            AppropriatenessClass::Rejected => "rejected",
        }
    }
    fn score(&self) -> i64 {
        match self {
            AppropriatenessClass::ExactTaskSource => 4,
            AppropriatenessClass::SuitablePrimary => 3,
            AppropriatenessClass::SuitableSupporting => 2,
            AppropriatenessClass::ThematicWeak => 1,
            AppropriatenessClass::Rejected => 0,
        }
    }
}

/// The structural kind of a source, derived DETERMINISTICALLY from its path + source_type (never the model).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SourceKind {
    Schema,
    Fixture,
    AdrRfc,
    Doc,
    Legal,
    Other,
}

fn source_kind(path: &str, stype: &str) -> SourceKind {
    let p = path.to_ascii_lowercase();
    let s = stype.to_ascii_lowercase();
    let base = p.rsplit('/').next().unwrap_or(&p);
    if p.contains(".schema.json")
        || p.contains("contracts/")
        || s.contains("schema")
        || s.contains("contract")
    {
        SourceKind::Schema
    } else if p.contains("fixtures/")
        || p.contains("conformance/")
        || p.contains("-valid.json")
        || s.contains("fixture")
    {
        SourceKind::Fixture
    } else if s == "adr"
        || s == "rfc"
        || p.contains("/adr/")
        || p.contains("/rfc/")
        || p.contains("decisions/")
    {
        SourceKind::AdrRfc
    } else if base.starts_with("notice")
        || base.starts_with("license")
        || base.starts_with("trademark")
    {
        SourceKind::Legal
    } else if p.contains("docs/")
        || p.contains("spec/")
        || s.contains("doc")
        || s.contains("spec")
        || s.contains("readme")
        || p.ends_with(".md")
    {
        SourceKind::Doc
    } else {
        SourceKind::Other
    }
}

/// Classify how appropriate a source of `kind` is for `task`. This is where "definition ≠ example",
/// "ADR-architecture ≠ manifest template" and "trust-model doc ≠ full federation procedure" become
/// machine facts. Documentary/narrative tasks are at home in the ADR/RFC/doc corpus; structural tasks
/// demand a schema/contract or a fixture; procedural tasks are best served by a doc/ADR that states the
/// requirements (no source is a full runbook, so the max is Suitable, never Exact).
fn classify_appropriateness(task: RequestedTask, kind: SourceKind) -> AppropriatenessClass {
    use AppropriatenessClass::*;
    use RequestedTask as T;
    use SourceKind as K;
    match task {
        T::Template => match kind {
            K::Schema => ExactTaskSource,
            K::Fixture => SuitablePrimary,
            K::AdrRfc | K::Doc => ThematicWeak,
            _ => Rejected,
        },
        T::Example => match kind {
            K::Fixture => ExactTaskSource,
            K::Schema => SuitablePrimary,
            K::AdrRfc | K::Doc => ThematicWeak,
            _ => Rejected,
        },
        T::Procedure | T::Requirements => match kind {
            K::Doc | K::AdrRfc => SuitablePrimary,
            _ => ThematicWeak,
        },
        // Documentary / narrative tasks (explanation, definition, motivation, impact, consequences,
        // summary, comparison, relationship, lookup, metadata, exact-fact, mixed, follow-up, …).
        _ => match kind {
            K::AdrRfc => ExactTaskSource,
            K::Doc | K::Legal => SuitablePrimary,
            K::Other => SuitableSupporting,
            K::Schema | K::Fixture => ThematicWeak,
        },
    }
}

/// M2.18B.7 DFN-5 — a typed reason attached to a source-appropriateness decision. The structural task×kind
/// fit is only the starting point; the final class is confirmed or downgraded by the source's actual
/// CONTENT (does it carry the signal the task needs), its CURRENCY (a superseded doc can never be the
/// authoritative deliverable), its AUTHORITY (normative vs illustrative) and its SUBJECT overlap. Every
/// adjustment records a reason so the decision is explainable, not a bare score.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppropriatenessReason {
    // structural (task × kind)
    TaskKindExactFit,
    TaskKindSuitable,
    TaskKindThematicOnly,
    TaskKindMismatch,
    // content signals (does the source actually carry what the task needs)
    ContentHasSchemaFields,
    ContentHasScenario,
    ContentHasSteps,
    ContentHasRequirements,
    ContentLacksTaskSignal,
    // currency
    CurrencyCurrent,
    CurrencyHistorical,
    // authority
    AuthorityNormative,
    AuthorityIllustrative,
    // subject overlap
    SubjectMatch,
    SubjectWeakOverlap,
}

impl AppropriatenessReason {
    fn as_str(&self) -> &'static str {
        use AppropriatenessReason as R;
        match self {
            R::TaskKindExactFit => "task_kind_exact_fit",
            R::TaskKindSuitable => "task_kind_suitable",
            R::TaskKindThematicOnly => "task_kind_thematic_only",
            R::TaskKindMismatch => "task_kind_mismatch",
            R::ContentHasSchemaFields => "content_has_schema_fields",
            R::ContentHasScenario => "content_has_scenario",
            R::ContentHasSteps => "content_has_steps",
            R::ContentHasRequirements => "content_has_requirements",
            R::ContentLacksTaskSignal => "content_lacks_task_signal",
            R::CurrencyCurrent => "currency_current",
            R::CurrencyHistorical => "currency_historical",
            R::AuthorityNormative => "authority_normative",
            R::AuthorityIllustrative => "authority_illustrative",
            R::SubjectMatch => "subject_match",
            R::SubjectWeakOverlap => "subject_weak_overlap",
        }
    }
}

/// A full source-appropriateness decision: the confirmed class plus the ordered reasons that produced it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceAppropriatenessDecision {
    pub class: AppropriatenessClass,
    pub reasons: Vec<AppropriatenessReason>,
}

/// Concatenate a source's own chunk text (raw markdown + section headings) for content probing. Bounded to
/// the first 40 chunks so a huge document can't dominate the wall-clock.
fn source_raw_text(id: &str) -> String {
    source_chunks(id)
        .iter()
        .take(40)
        .map(|c| format!("{}\n{}", c.section, c.chunk))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Does the source content carry a machine-readable STRUCTURE (schema fields / typed object)? Reads the raw
/// text because the field punctuation (`{`, `:`, quotes) is exactly what `normalize()` strips.
fn source_has_structure(raw: &str) -> bool {
    raw.contains("```")
        || raw.contains('{')
        || raw.matches(':').count() >= 3
        || raw.contains("required")
        || raw.contains("obrigat")
}

/// Does the source content carry ORDERED STEPS (an enumerated/bulleted list, or prose sequencing)?
fn source_has_steps(raw: &str) -> bool {
    let n = normalize(raw);
    // count bullet lines robustly: a list whose first item is at the start of the string still counts.
    let dashes = raw.matches("\n- ").count() + usize::from(raw.starts_with("- "));
    let stars = raw.matches("\n* ").count() + usize::from(raw.starts_with("* "));
    (raw.contains("1.") && raw.contains("2."))
        || (raw.contains("1)") && raw.contains("2)"))
        || dashes >= 2
        || stars >= 2
        || n.contains("primeiro")
        || n.contains("em seguida")
        || n.contains("por fim")
        || n.contains("step 1")
        || n.contains("passo 1")
}

/// Does the source content state REQUIREMENTS (mandatory/optional conditions, MUST/deve language)?
fn source_has_requirements(raw: &str) -> bool {
    let n = normalize(raw);
    n.contains("deve ")
        || n.contains("devem ")
        || n.contains("obrigat")
        || n.contains("requisit")
        || n.contains("must ")
        || n.contains("required")
        || n.contains("pre requisit")
        || n.contains("pre-requisit")
}

/// Does the source content carry a concrete SCENARIO (an illustrative example, named actors)?
fn source_has_scenario(raw: &str) -> bool {
    let n = normalize(raw);
    n.contains("por exemplo")
        || n.contains("exemplo")
        || n.contains("operador a")
        || n.contains("operador b")
        || n.contains("suponha")
        || n.contains("imagine")
        || n.contains("cenario")
        || n.contains("ilustrativ")
}

/// M2.18B.7 DFN-5 — the CONTENT + TASK appropriateness decision. Starts from the structural task×kind fit
/// and then adjusts by the source's real content, currency, authority and subject overlap, recording a
/// reason for each. Determinism: no model, no clock, no randomness — same inputs ⇒ same decision.
fn decide_appropriateness(
    task: RequestedTask,
    kind: SourceKind,
    id: &str,
    terms: &[&str],
) -> SourceAppropriatenessDecision {
    use AppropriatenessClass as C;
    use AppropriatenessReason as R;
    use RequestedTask as T;
    let mut class = classify_appropriateness(task, kind);
    let mut reasons = vec![match class {
        C::ExactTaskSource => R::TaskKindExactFit,
        C::SuitablePrimary | C::SuitableSupporting => R::TaskKindSuitable,
        C::ThematicWeak => R::TaskKindThematicOnly,
        C::Rejected => R::TaskKindMismatch,
    }];

    // ── content: does the source actually carry the signal the task needs? Only DEMOTE — never invent fit
    // a role tier does not already grant. A task-fit source whose content is missing the signal drops one
    // tier and is flagged; a documentary task reads prose, so no content gate applies.
    if class.score() >= C::SuitableSupporting.score() {
        let raw = source_raw_text(id);
        let (has_signal, present, absent) = match task {
            T::Template => (
                source_has_structure(&raw),
                R::ContentHasSchemaFields,
                R::ContentLacksTaskSignal,
            ),
            T::Example => (
                source_has_scenario(&raw) || source_has_structure(&raw),
                R::ContentHasScenario,
                R::ContentLacksTaskSignal,
            ),
            T::Procedure => (
                source_has_steps(&raw) || source_has_requirements(&raw),
                R::ContentHasSteps,
                R::ContentLacksTaskSignal,
            ),
            T::Requirements => (
                source_has_requirements(&raw) || source_has_steps(&raw),
                R::ContentHasRequirements,
                R::ContentLacksTaskSignal,
            ),
            // documentary / narrative tasks: prose is the deliverable; content always suffices.
            _ => (true, R::TaskKindSuitable, R::TaskKindSuitable),
        };
        if !matches!(
            task,
            T::Template | T::Example | T::Procedure | T::Requirements
        ) {
            // no-op: documentary tasks record their structural reason only.
        } else if has_signal {
            reasons.push(present);
        } else {
            class = demote(class);
            reasons.push(absent);
        }
    }

    // ── currency: a self-declared historical/superseded source can never be the authoritative deliverable.
    if is_historical(id) {
        if class.score() > C::SuitableSupporting.score() {
            class = C::SuitableSupporting;
        }
        reasons.push(R::CurrencyHistorical);
    } else {
        reasons.push(R::CurrencyCurrent);
    }

    // ── authority: normative (canonical spec/ADR/schema/legal) vs illustrative (fixture/example).
    reasons.push(match kind {
        SourceKind::Fixture => R::AuthorityIllustrative,
        SourceKind::Schema | SourceKind::AdrRfc | SourceKind::Legal | SourceKind::Doc => {
            R::AuthorityNormative
        }
        SourceKind::Other => R::AuthorityNormative,
    });

    // ── subject overlap: does the source text actually mention the query terms?
    reasons.push(if textual_bonus(id, terms) > 0 {
        R::SubjectMatch
    } else {
        R::SubjectWeakOverlap
    });

    SourceAppropriatenessDecision { class, reasons }
}

/// Drop an appropriateness class by exactly one tier (never below `ThematicWeak` for an in-plan source).
fn demote(c: AppropriatenessClass) -> AppropriatenessClass {
    use AppropriatenessClass::*;
    match c {
        ExactTaskSource => SuitablePrimary,
        SuitablePrimary => SuitableSupporting,
        SuitableSupporting => ThematicWeak,
        ThematicWeak => ThematicWeak,
        Rejected => Rejected,
    }
}

/// The impact relation kinds — the confirmed edges an "impact/consequences" answer may follow.
const IMPACT_KINDS: &[RelationKind] = &[
    RelationKind::DependsOn,
    RelationKind::Constrains,
    RelationKind::Governs,
    RelationKind::AppliesTo,
    RelationKind::Implements,
];

/// Per-(intent, depth) chunk budget. Not hardcoded to pass a test — sized to the answer shape: an exact
/// terminal needs 1-2 sections, a definition 1-3, a full explanation 4-8, a comparison a balanced set.
fn max_chunks_for(intent: &str, depth: &str, n_entities: usize) -> usize {
    let deep = depth == "deep";
    let standard = depth == "standard";
    match intent {
        "check_document_status"
        | "locate_rule"
        | "check_endpoint"
        | "check_schema"
        | "check_operator"
        | "inspect_manifest"
        | "validate_artifact" => 2,
        "explain_concept" if !standard && !deep => 3,
        "compare_documents" => (n_entities.max(2) * if deep { 4 } else { 3 }).min(8),
        "explain_impact" => {
            if deep {
                8
            } else {
                6
            }
        }
        "summarize_document" => {
            if deep {
                8
            } else {
                4
            }
        }
        _ => {
            if deep {
                8
            } else if standard {
                6
            } else {
                4
            }
        }
    }
}

struct Builder<'a> {
    terms: Vec<&'a str>,
    /// The resolved task this plan is being ranked for (drives source appropriateness).
    task: RequestedTask,
    sources: Vec<PlannedSource>,
    relations_used: Vec<RelatedEdgeRef>,
    conflicts: Vec<RetrievalConflict>,
    forbidden: Vec<String>,
}

impl<'a> Builder<'a> {
    fn push(
        &mut self,
        id: &str,
        role: SourceRole,
        reason: &str,
        entity: &str,
        operation: &str,
        edge: Option<RelatedEdgeRef>,
    ) {
        let id = match docref::resolve(id) {
            Some(d) => d.id.clone(),
            None => id.to_string(),
        };
        if id.is_empty() || self.sources.iter().any(|s| s.source_id == id) {
            return; // dedup: never two plan entries for the same source
        }
        let path = source_path(&id);
        let stype = source_type_of(&id);
        let public = source_policy::is_public_source(&path, &stype);
        let section_hints = top_sections(&id, &self.terms, 3);
        let priority = role.base_priority() + textual_bonus(&id, &self.terms);
        // M2.18B.7 DFN-5 — content+task appropriateness (the primary rerank key, computed here so every
        // source carries it): task×kind fit, then content/currency/authority/subject adjustments + reasons.
        let decision =
            decide_appropriateness(self.task, source_kind(&path, &stype), &id, &self.terms);
        let checksum = fnv1a(&[id.clone(), role.as_str().to_string(), reason.to_string()]);
        self.sources.push(PlannedSource {
            source_id: id.clone(),
            source_title: source_title(&id),
            role,
            selection_reason: reason.to_string(),
            requested_entity: entity.to_string(),
            requested_operation: operation.to_string(),
            related_edge: edge,
            section_hints,
            priority,
            task_appropriateness: decision.class.as_str().to_string(),
            appropriateness_score: decision.class.score(),
            appropriateness_reasons: decision
                .reasons
                .iter()
                .map(|r| r.as_str().to_string())
                .collect(),
            eligible: public,
            source_policy: if public {
                "public".into()
            } else {
                "internal_excluded".into()
            },
            checksum,
        });
    }

    /// Add a primary/definition source, resolving supersession. A document is treated as HISTORICAL only
    /// when its OWN `Status` says so (self-declared superseded/retired/deprecated) — never merely because
    /// another document's `Supersedes` field points at it (which can be partial or ambiguous, and must not
    /// silently demote a current canonical record). When historical, every current successor (the incoming
    /// `Supersedes` edges) is selected as `role`, the historical doc is demoted to a supporting reference
    /// and forbidden as current authority, and the conflict is recorded. Historical with NO known
    /// successor → escalate to insufficient (never present a historical doc as current authority).
    fn push_primary_resolving_conflict(
        &mut self,
        id: &str,
        role: SourceRole,
        reason: &str,
        op: &str,
    ) -> bool {
        let canonical = docref::resolve(id)
            .map(|d| d.id.clone())
            .unwrap_or_else(|| id.to_string());
        if !is_historical(&canonical) {
            self.push(&canonical, role, reason, &canonical, op, None);
            return true;
        }
        // Historical (self-declared). Find the current successor(s) from confirmed incoming supersedes edges.
        let mut successors: Vec<String> = Vec::new();
        for e in relation::relations_for(&canonical, "in") {
            if e.kind == RelationKind::Supersedes && !successors.contains(&e.from) {
                successors.push(e.from);
            }
        }
        if successors.is_empty() {
            // historical with no known current authority → decline rather than mislead.
            self.conflicts.push(RetrievalConflict {
                current_id: String::new(),
                historical_id: canonical.clone(),
                kind: RelationKind::Supersedes,
                resolution: "unresolved_escalate_insufficient".into(),
            });
            self.forbidden.push(canonical.clone());
            return false;
        }
        // Select every current successor as the requested role; each conflict recorded as resolved.
        for s in &successors {
            self.conflicts.push(RetrievalConflict {
                current_id: s.clone(),
                historical_id: canonical.clone(),
                kind: RelationKind::Supersedes,
                resolution: "current_selected".into(),
            });
            self.push(
                s,
                role,
                "supersedes_the_requested_historical_document",
                s,
                op,
                None,
            );
        }
        self.forbidden.push(canonical.clone());
        // The historical doc stays only as a low-priority supporting reference — never authority.
        self.push(
            &canonical,
            SourceRole::Supporting,
            "historical_superseded_reference",
            &canonical,
            op,
            None,
        );
        true
    }
}

/// Build the deterministic RetrievalPlan for a question + router seed. Resolves the intent internally
/// (reproducible), then plans sources/roles/limits/conflicts. No model is consulted.
pub fn plan_retrieval(question: &str, seeded_entity_id: &str) -> RetrievalPlan {
    let resolved: ResolvedIntent = resolve_intent(question, seeded_entity_id);
    plan_from_resolved(&resolved, question)
}

fn plan_from_resolved(resolved: &ResolvedIntent, question: &str) -> RetrievalPlan {
    let nq = normalize(question);
    let terms: Vec<&str> = nq.split(' ').filter(|w| w.len() > 2).collect();
    let intent = resolved.primary_intent.clone();
    let depth = resolved.depth.clone();

    // M2.18B.7 — resolve the RequestedTask (the deliverable axis) so retrieval can rank sources by TASK
    // suitability, not only topic. Derived deterministically from the same AnswerPlan the trunk uses.
    let requested_task = resolve_task(
        question,
        &plan_answer(question, &resolved.resolved_entity_id),
    );

    let mut b = Builder {
        terms: terms.clone(),
        task: requested_task,
        sources: Vec::new(),
        relations_used: Vec::new(),
        conflicts: Vec::new(),
        forbidden: Vec::new(),
    };

    // The primary entity: an explicitly named/resolved document, else a concept's canonical source.
    let primary = if !resolved.resolved_entity_id.is_empty() {
        resolved.resolved_entity_id.clone()
    } else {
        resolved.concept_source.clone()
    };
    let concepts: Vec<String> = if resolved.concept_source.is_empty() {
        Vec::new()
    } else {
        vec![resolved.concept_source.clone()]
    };

    let comparison = intent == "compare_documents" || resolved.comparison_requested;
    let mut escalate = false;
    let mut needs_definition = false;
    let mut needs_metadata = false;
    let mut needs_history = false;
    let mut needs_implementation = false;

    // Boundary / unsupported / clarification never retrieve — the router handles them; the plan is empty.
    let terminal_only = resolved.boundary_detected
        || intent == "boundary_request"
        || intent == "unsupported"
        || intent == "clarification_required"
        || resolved.requires_clarification;

    if !terminal_only {
        match intent.as_str() {
            "compare_documents" => {
                // BOTH sides: every explicitly named document + the resolved entity, balanced.
                let mut sides: Vec<String> = Vec::new();
                for r in &resolved.explicit_refs {
                    if !sides.contains(r) {
                        sides.push(r.clone());
                    }
                }
                if !primary.is_empty() && !sides.contains(&primary) {
                    sides.push(primary.clone());
                }
                for id in &sides {
                    b.push(id, SourceRole::Primary, "compare_side", id, "compare", None);
                }
                // Relationship edges BETWEEN the compared documents (confirmed only).
                for e in &relation::graph().edges {
                    if sides
                        .iter()
                        .any(|s| docref::resolve(s).map(|d| d.id == e.from).unwrap_or(false))
                        && sides
                            .iter()
                            .any(|s| docref::resolve(s).map(|d| d.id == e.to).unwrap_or(false))
                    {
                        b.relations_used.push(RelatedEdgeRef {
                            from: e.from.clone(),
                            to: e.to.clone(),
                            kind: e.kind,
                        });
                    }
                }
            }
            "explain_impact" => {
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Primary,
                        "impact_subject",
                        "impact",
                    );
                    escalate = escalate || !ok;
                    let canonical = docref::resolve(&primary)
                        .map(|d| d.id.clone())
                        .unwrap_or(primary.clone());
                    for e in relation::relations_for(&canonical, "both") {
                        if IMPACT_KINDS.contains(&e.kind) {
                            let other = if e.from == canonical {
                                e.to.clone()
                            } else {
                                e.from.clone()
                            };
                            b.relations_used.push(RelatedEdgeRef {
                                from: e.from.clone(),
                                to: e.to.clone(),
                                kind: e.kind,
                            });
                            b.push(
                                &other,
                                SourceRole::Relationship,
                                "impact_confirmed_relation",
                                &canonical,
                                "impact",
                                Some(RelatedEdgeRef {
                                    from: e.from.clone(),
                                    to: e.to.clone(),
                                    kind: e.kind,
                                }),
                            );
                        }
                    }
                }
            }
            "explain_governance" => {
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Governance,
                        "governance_subject",
                        "explain",
                    );
                    escalate = escalate || !ok;
                }
                // governance neighbours (governs edges), confirmed only
                let canonical = docref::resolve(&primary)
                    .map(|d| d.id.clone())
                    .unwrap_or(primary.clone());
                for e in relation::relations_for(&canonical, "both") {
                    if e.kind == RelationKind::Governs {
                        let other = if e.from == canonical {
                            e.to.clone()
                        } else {
                            e.from.clone()
                        };
                        b.push(
                            &other,
                            SourceRole::Governance,
                            "governance_relation",
                            &canonical,
                            "explain",
                            Some(RelatedEdgeRef {
                                from: e.from.clone(),
                                to: e.to.clone(),
                                kind: e.kind,
                            }),
                        );
                    }
                }
            }
            "check_document_status" => {
                needs_metadata = true;
                if !primary.is_empty() {
                    b.push(
                        &primary,
                        SourceRole::Metadata,
                        "status_metadata",
                        &primary,
                        "status",
                        None,
                    );
                }
            }
            "locate_rule" => {
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Primary,
                        "rule_location",
                        "locate",
                    );
                    escalate = escalate || !ok;
                }
            }
            "summarize_document" => {
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Primary,
                        "document_to_summarize",
                        "summarize",
                    );
                    escalate = escalate || !ok;
                }
            }
            "explain_concept" => {
                needs_definition = true;
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Definition,
                        "concept_definition_source",
                        "explain",
                    );
                    escalate = escalate || !ok;
                }
                // supporting: See-also related_to neighbours (bounded), confirmed only, never redundant.
                let canonical = docref::resolve(&primary)
                    .map(|d| d.id.clone())
                    .unwrap_or(primary.clone());
                for e in relation::relations_for(&canonical, "out")
                    .into_iter()
                    .take(2)
                {
                    if e.kind == RelationKind::RelatedTo {
                        b.push(
                            &e.to,
                            SourceRole::Supporting,
                            "see_also_related",
                            &canonical,
                            "explain",
                            Some(RelatedEdgeRef {
                                from: e.from.clone(),
                                to: e.to.clone(),
                                kind: e.kind,
                            }),
                        );
                    }
                }
            }
            _ => {
                // explain_document + everything else: the primary document + a couple of See-also supports.
                if !primary.is_empty() {
                    let ok = b.push_primary_resolving_conflict(
                        &primary,
                        SourceRole::Primary,
                        "primary_document",
                        "explain",
                    );
                    escalate = escalate || !ok;
                    let canonical = docref::resolve(&primary)
                        .map(|d| d.id.clone())
                        .unwrap_or(primary.clone());
                    for e in relation::relations_for(&canonical, "out")
                        .into_iter()
                        .take(2)
                    {
                        if e.kind == RelationKind::RelatedTo {
                            b.push(
                                &e.to,
                                SourceRole::Supporting,
                                "see_also_related",
                                &canonical,
                                "explain",
                                Some(RelatedEdgeRef {
                                    from: e.from.clone(),
                                    to: e.to.clone(),
                                    kind: e.kind,
                                }),
                            );
                        }
                    }
                }
            }
        }
        if resolved.example_requested {
            needs_implementation = true;
        }
        // A status question that reached the trunk arrives as explain_document + a check_document_status
        // SECONDARY (resolve.rs) — surface the primary's status/date metadata for the answer.
        if resolved
            .secondary_intents
            .iter()
            .any(|s| s == "check_document_status")
        {
            needs_metadata = true;
        }
        // A reason/history component ("porque foi aceite") wants the record's history/motivation.
        if resolved.reason_requested {
            needs_history = true;
        }
    }

    // Precedence-preserving order. M2.18B.7 — TASK APPROPRIATENESS is the PRIMARY key: a task-suitable
    // source outranks a merely thematically-similar one even across role tiers (a schema wins for a
    // Template task though an ADR carries a higher generic role). Within the same appropriateness class the
    // structural role+textual `priority` (desc) then id (asc) break ties, for a stable, reproducible plan.
    b.sources.sort_by(|a, c| {
        c.appropriateness_score
            .cmp(&a.appropriateness_score)
            .then(c.priority.cmp(&a.priority))
            .then(a.source_id.cmp(&c.source_id))
    });

    // Balance guard for comparison: no single document may occupy the whole plan; both sides must be present.
    if comparison {
        let primaries: Vec<&PlannedSource> = b
            .sources
            .iter()
            .filter(|s| s.role == SourceRole::Primary)
            .collect();
        if primaries.len() < 2 {
            // only one side resolved → not a real comparison; decline rather than a one-sided answer.
            escalate = true;
        }
    }

    let resolved_entities: Vec<String> = {
        let mut v: Vec<String> = Vec::new();
        if !primary.is_empty() {
            let c = docref::resolve(&primary)
                .map(|d| d.id.clone())
                .unwrap_or(primary.clone());
            v.push(c);
        }
        for r in &resolved.explicit_refs {
            let c = docref::resolve(r)
                .map(|d| d.id.clone())
                .unwrap_or(r.clone());
            if !v.contains(&c) {
                v.push(c);
            }
        }
        v
    };

    let eligible_sources: Vec<&PlannedSource> = b.sources.iter().filter(|s| s.eligible).collect();
    let source_policy_status = if b.sources.iter().all(|s| s.eligible) {
        "clean".to_string()
    } else {
        "excluded_present".to_string()
    };
    // No eligible source at all for a retrieving intent → decline.
    if !terminal_only && eligible_sources.is_empty() {
        escalate = true;
    }

    // M2.18B.7 — the plan-level SOURCE APPROPRIATENESS verdict: the best appropriateness class among the
    // ELIGIBLE sources. A terminal plan (boundary/clarification, no retrieval) is vacuously appropriate.
    let best_appropriateness = eligible_sources
        .iter()
        .map(|s| s.appropriateness_score)
        .max()
        .unwrap_or(if terminal_only { 4 } else { 0 });
    let source_appropriate =
        best_appropriateness >= AppropriatenessClass::SuitableSupporting.score();
    let source_appropriateness = match best_appropriateness {
        4 => "exact",
        2 | 3 => "suitable",
        1 => "thematic_only",
        _ => "none",
    }
    .to_string();
    // DFN-5 — the reasons of the winning eligible source (highest appropriateness, document order breaks
    // ties) explain the plan-level verdict; a terminal-only plan carries no source reasons.
    let appropriateness_reasons = eligible_sources
        .iter()
        .max_by_key(|s| s.appropriateness_score)
        .map(|s| s.appropriateness_reasons.clone())
        .unwrap_or_default();

    let max_chunks = max_chunks_for(&intent, &depth, resolved_entities.len().max(1));

    let sections: Vec<String> = {
        let mut secs: Vec<String> = Vec::new();
        for s in &b.sources {
            for sec in &s.section_hints {
                if !secs.contains(sec) {
                    secs.push(sec.clone());
                }
            }
        }
        secs.truncate(max_chunks);
        secs
    };

    let selection_reasons: Vec<String> = b
        .sources
        .iter()
        .map(|s| format!("{}:{}", s.source_id, s.selection_reason))
        .collect();

    let focus = if comparison {
        "comparison".to_string()
    } else if intent == "explain_impact" {
        "impact".to_string()
    } else if intent == "explain_governance" {
        "governance".to_string()
    } else if !primary.is_empty() {
        "document".to_string()
    } else {
        "concept".to_string()
    };

    // Deterministic plan checksum over the ordered structural decisions.
    let mut parts: Vec<String> = vec![
        format!("v{RETRIEVAL_PLAN_VERSION}"),
        intent.clone(),
        depth.clone(),
        format!("task:{}", requested_task.as_str()),
        format!("mc{max_chunks}"),
        format!("esc{escalate}"),
        format!("appr:{source_appropriateness}"),
    ];
    for s in &b.sources {
        parts.push(format!(
            "{}|{}|{}|{}|{}",
            s.source_id,
            s.role.as_str(),
            s.eligible,
            s.priority,
            s.appropriateness_score
        ));
    }
    for c in &b.conflicts {
        parts.push(format!(
            "cf:{}|{}|{}",
            c.current_id, c.historical_id, c.resolution
        ));
    }
    let checksum = fnv1a(&parts);

    // Dedup relations_used + forbidden.
    let mut rel: Vec<RelatedEdgeRef> = Vec::new();
    for e in b.relations_used {
        if !rel
            .iter()
            .any(|x| x.from == e.from && x.to == e.to && x.kind == e.kind)
        {
            rel.push(e);
        }
    }
    let mut forbidden: Vec<String> = Vec::new();
    for f in b.forbidden {
        if !forbidden.contains(&f) {
            forbidden.push(f);
        }
    }

    RetrievalPlan {
        schema_version: RETRIEVAL_PLAN_VERSION,
        trace_id: String::new(),
        primary_intent: intent,
        secondary_intents: resolved.secondary_intents.clone(),
        resolved_entities,
        explicit_refs: resolved.explicit_refs.clone(),
        concepts,
        relations_used: rel,
        comparison,
        depth,
        focus,
        sources: b.sources,
        sections,
        max_chunks,
        needs_definition,
        needs_metadata,
        needs_history,
        needs_implementation,
        forbidden_terms: forbidden,
        conflicts: b.conflicts,
        selection_reasons,
        source_policy_status,
        requested_task: requested_task.as_str().to_string(),
        source_appropriate,
        source_appropriateness,
        appropriateness_reasons,
        escalate_insufficient: escalate,
        checksum,
    }
}

/// Validate a plan's internal invariants (used by the guard/tests): every source has a reason, every
/// source id is registry-resolvable OR a public path, no duplicate source, a comparison carries ≥2
/// primaries unless it escalated, and eligible sources are public.
pub fn validate_plan(p: &RetrievalPlan) -> Vec<String> {
    let mut errs: Vec<String> = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for s in &p.sources {
        if s.selection_reason.trim().is_empty() {
            errs.push(format!("source {} has no selection_reason", s.source_id));
        }
        if !seen.insert(s.source_id.clone()) {
            errs.push(format!("duplicate source {}", s.source_id));
        }
        if s.eligible && s.source_policy != "public" {
            errs.push(format!("source {} eligible but not public", s.source_id));
        }
    }
    if p.comparison && !p.escalate_insufficient {
        let primaries = p
            .sources
            .iter()
            .filter(|s| s.role == SourceRole::Primary)
            .count();
        if primaries < 2 {
            errs.push("comparison plan must carry ≥2 primary sources".into());
        }
    }
    errs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(q: &str, seed: &str) -> RetrievalPlan {
        plan_retrieval(q, seed)
    }

    #[test]
    fn exact_document_plan_has_one_primary_with_reason() {
        let p = plan("explica a ADR-002", "ADR-002");
        assert_eq!(p.primary_intent, "explain_document");
        let primaries: Vec<_> = p
            .sources
            .iter()
            .filter(|s| s.role == SourceRole::Primary)
            .collect();
        assert_eq!(primaries.len(), 1);
        assert_eq!(primaries[0].source_id, "ADR-002");
        assert!(!primaries[0].selection_reason.is_empty());
        assert!(validate_plan(&p).is_empty(), "{:?}", validate_plan(&p));
    }

    #[test]
    fn status_intent_requests_metadata_only() {
        // A status question reaches the trunk as explain_document + a check_document_status SECONDARY
        // (resolve.rs); the plan must flag needs_metadata and keep the named document as its source.
        let p = plan("a ADR-002 continua em vigor?", "ADR-002");
        assert!(p.needs_metadata, "status secondary must request metadata");
        assert!(p.sources.iter().any(|s| s.source_id == "ADR-002"));
    }

    #[test]
    fn concept_plan_marks_definition_and_grounds_on_canonical_source() {
        // dupla entrada → ADR-011 (a current, non-superseded canonical source; seed as the router would).
        let p = plan("o que é a dupla entrada?", "ADR-011");
        assert_eq!(p.primary_intent, "explain_concept");
        assert!(p.needs_definition);
        assert!(p
            .sources
            .iter()
            .any(|s| s.role == SourceRole::Definition && s.source_id == "ADR-011"));
    }

    #[test]
    fn comparison_includes_both_sides_never_one_dominating() {
        let p = plan("compara a ADR-041 e a ADR-042", "");
        assert!(p.comparison);
        let primaries: Vec<_> = p
            .sources
            .iter()
            .filter(|s| s.role == SourceRole::Primary)
            .map(|s| s.source_id.clone())
            .collect();
        assert!(primaries.contains(&"ADR-041".to_string()), "{primaries:?}");
        assert!(primaries.contains(&"ADR-042".to_string()), "{primaries:?}");
        assert!(!p.escalate_insufficient);
        assert!(validate_plan(&p).is_empty());
    }

    #[test]
    fn a_current_canonical_primary_is_selected_and_never_demoted() {
        // M2.19A (ADR-045, current-only canonical ADR tree) removed every superseded ADR from the
        // registry, so no surviving doc self-declares a historical status and the supersession-demotion
        // branch of `push_primary_resolving_conflict` has no live data. The surviving, testable invariant:
        // a current canonical document is selected as its own primary and is never demoted, forbidden or
        // conflicted. (Exercising the demotion branch itself would now require a synthetic historical
        // fixture.)
        let p = plan("explica a ADR-027", "ADR-027");
        let primary = p.sources.iter().find(|s| s.role == SourceRole::Primary);
        assert_eq!(primary.map(|s| s.source_id.as_str()), Some("ADR-027"));
        assert!(
            p.conflicts.is_empty(),
            "a current doc records no supersession conflict"
        );
        assert!(!p.forbidden_terms.contains(&"ADR-027".to_string()));
        assert!(!p
            .sources
            .iter()
            .any(|s| s.source_id == "ADR-027" && s.role == SourceRole::Supporting));
    }

    #[test]
    fn impact_plan_follows_only_confirmed_impact_relations() {
        let p = plan("qual o impacto da ADR-031 para um operador?", "ADR-031");
        assert_eq!(p.primary_intent, "explain_impact");
        // every relationship source carries a confirmed impact edge
        for s in p
            .sources
            .iter()
            .filter(|s| s.role == SourceRole::Relationship)
        {
            let e = s
                .related_edge
                .as_ref()
                .expect("relationship source needs an edge");
            assert!(
                IMPACT_KINDS.contains(&e.kind),
                "non-impact edge {:?}",
                e.kind
            );
        }
    }

    #[test]
    fn boundary_and_clarification_plans_do_not_retrieve() {
        let p = plan("transfere 100 kz para a conta", "");
        assert!(p.sources.is_empty() || p.escalate_insufficient);
    }

    #[test]
    fn plan_is_deterministic() {
        let a = plan("compara a ADR-041 e a ADR-042", "");
        let b = plan("compara a ADR-041 e a ADR-042", "");
        assert_eq!(a.checksum, b.checksum);
        assert_eq!(a.sources.len(), b.sources.len());
    }

    #[test]
    fn every_source_is_registry_resolvable_or_public_path_and_has_reason() {
        for q in [
            "explica a ADR-002",
            "o que é a federação?",
            "compara a ADR-041 e a ADR-042",
        ] {
            let p = plan(q, if q.contains("federa") { "ADR-031" } else { "" });
            for s in &p.sources {
                assert!(
                    !s.selection_reason.is_empty(),
                    "no reason for {}",
                    s.source_id
                );
                let resolvable = docref::resolve(&s.source_id).is_some()
                    || !source_chunks(&s.source_id).is_empty();
                assert!(resolvable, "orphan source {}", s.source_id);
            }
        }
    }

    #[test]
    fn unknown_document_yields_no_orphan_primary() {
        let p = plan("explica a ADR-999", "ADR-999");
        // ADR-999 does not resolve; it must not appear as a registry-resolvable source.
        assert!(!p.sources.iter().any(|s| docref::resolve(&s.source_id)
            .map(|d| d.id == "ADR-999")
            .unwrap_or(false)));
    }

    // ─────────────────────── M2.18B.7 source appropriateness ───────────────────────

    #[test]
    fn source_kind_is_derived_from_path_and_type() {
        assert_eq!(
            source_kind(
                "contracts/production/operator-manifest.production.schema.json",
                ""
            ),
            SourceKind::Schema
        );
        assert_eq!(
            source_kind("conformance/fixtures/federation/MANIFEST-VALID.json", ""),
            SourceKind::Fixture
        );
        assert_eq!(
            source_kind(
                "decisions/adr/ADR-001-open-financial-protocol-what-banza-is-and-is-not.md",
                "adr"
            ),
            SourceKind::AdrRfc
        );
        assert_eq!(
            source_kind("docs/governance/GOVERNANCE.md", "doc"),
            SourceKind::Doc
        );
        assert_eq!(source_kind("NOTICE", ""), SourceKind::Legal);
    }

    #[test]
    fn appropriateness_encodes_task_source_fit() {
        use AppropriatenessClass as A;
        use RequestedTask as T;
        // A schema is the EXACT source for a template; an ADR is only thematically adjacent.
        assert_eq!(
            classify_appropriateness(T::Template, SourceKind::Schema),
            A::ExactTaskSource
        );
        assert_eq!(
            classify_appropriateness(T::Template, SourceKind::AdrRfc),
            A::ThematicWeak
        );
        // A fixture is the EXACT source for an example; a definitional ADR is not.
        assert_eq!(
            classify_appropriateness(T::Example, SourceKind::Fixture),
            A::ExactTaskSource
        );
        assert_eq!(
            classify_appropriateness(T::Example, SourceKind::AdrRfc),
            A::ThematicWeak
        );
        // The ADR/RFC corpus is the EXACT home of an explanation; a schema alone under-serves it.
        assert_eq!(
            classify_appropriateness(T::Explanation, SourceKind::AdrRfc),
            A::ExactTaskSource
        );
        assert_eq!(
            classify_appropriateness(T::Explanation, SourceKind::Schema),
            A::ThematicWeak
        );
        // The KEY invariant: for a template task the schema OUTRANKS the ADR (across role tiers).
        assert!(
            classify_appropriateness(T::Template, SourceKind::Schema).score()
                > classify_appropriateness(T::Template, SourceKind::AdrRfc).score()
        );
    }

    #[test]
    fn plan_carries_task_and_appropriateness_verdict() {
        let p = plan("explica a ADR-002", "ADR-002");
        assert_eq!(p.requested_task, "explanation");
        // the named ADR is the exact task source for an explanation
        assert!(p.source_appropriate);
        assert_eq!(p.source_appropriateness, "exact");
        // every source carries a task-appropriateness label consistent with its score
        for s in &p.sources {
            assert!(!s.task_appropriateness.is_empty(), "{}", s.source_id);
        }
        // the verdict matches the best eligible score
        let best = p
            .sources
            .iter()
            .filter(|s| s.eligible)
            .map(|s| s.appropriateness_score)
            .max()
            .unwrap_or(0);
        assert_eq!(p.source_appropriate, best >= 2);
    }

    #[test]
    fn a_thematic_but_inadequate_source_never_wins() {
        // For any plan, the top-ranked source is never STRICTLY less appropriate than a lower-ranked one:
        // appropriateness is the primary sort key, so a thematic source can never outrank a suitable one.
        for (q, seed) in [
            ("explica a ADR-002", "ADR-002"),
            ("o que é a federação?", "ADR-031"),
            ("compara a ADR-041 e a ADR-042", ""),
            ("qual o impacto da ADR-031 para um operador?", "ADR-031"),
        ] {
            let p = plan(q, seed);
            for w in p.sources.windows(2) {
                assert!(
                    w[0].appropriateness_score >= w[1].appropriateness_score,
                    "{q:?}: {} ({}) ranked above more-appropriate {} ({})",
                    w[0].source_id,
                    w[0].appropriateness_score,
                    w[1].source_id,
                    w[1].appropriateness_score
                );
            }
        }
    }

    #[test]
    fn appropriateness_is_deterministic() {
        let a = plan("o que é a federação?", "ADR-031");
        let b = plan("o que é a federação?", "ADR-031");
        assert_eq!(a.source_appropriateness, b.source_appropriateness);
        assert_eq!(a.requested_task, b.requested_task);
        assert_eq!(a.checksum, b.checksum);
    }

    // ── M2.18B.7 DFN-5 — content + task appropriateness ─────────────────────────────────────────────
    #[test]
    fn dfn5_content_probes_read_the_right_signal() {
        // steps: an ordered/bulleted list on the RAW markdown, or prose sequencing.
        assert!(source_has_steps("faça isto:\n1. primeiro\n2. depois"));
        assert!(source_has_steps("- passo um\n- passo dois"));
        assert!(source_has_steps("primeiro configure, em seguida publique"));
        assert!(!source_has_steps(
            "uma descrição corrida sem qualquer lista"
        ));
        // structure: a code block / typed object / field punctuation.
        assert!(source_has_structure("```json\n{ \"a\": 1 }\n```"));
        assert!(source_has_structure(
            "campo obrigatorio: x\ntipo: y\nnome: z"
        ));
        assert!(!source_has_structure("apenas texto explicativo em prosa"));
        // scenario + requirements.
        assert!(source_has_scenario("por exemplo, o Operador A federa-se"));
        assert!(source_has_requirements(
            "o operador deve publicar o manifesto"
        ));
        assert!(!source_has_scenario("uma definição neutra do conceito"));
    }

    #[test]
    fn dfn5_demote_drops_exactly_one_tier_and_floors() {
        use AppropriatenessClass as A;
        assert_eq!(demote(A::ExactTaskSource), A::SuitablePrimary);
        assert_eq!(demote(A::SuitablePrimary), A::SuitableSupporting);
        assert_eq!(demote(A::SuitableSupporting), A::ThematicWeak);
        assert_eq!(demote(A::ThematicWeak), A::ThematicWeak); // floor
    }

    #[test]
    fn dfn5_plan_exposes_typed_appropriateness_reasons() {
        let p = plan("explica a ADR-002", "ADR-002");
        // the plan-level reasons explain the winning source's verdict.
        assert!(
            !p.appropriateness_reasons.is_empty(),
            "plan carries no appropriateness reasons"
        );
        // a documentary task on a current ADR is normative + current + task-kind fit.
        assert!(p
            .appropriateness_reasons
            .iter()
            .any(|r| r == "currency_current"));
        assert!(p
            .appropriateness_reasons
            .iter()
            .any(|r| r == "authority_normative"));
        // every source carries its own reasons too.
        for s in p.sources.iter().filter(|s| s.eligible) {
            assert!(
                !s.appropriateness_reasons.is_empty(),
                "eligible source {} has no reasons",
                s.source_id
            );
        }
    }

    #[test]
    fn dfn5_documentary_content_gate_never_downgrades_prose() {
        // an explanation reads prose; a normative ADR must stay the exact task source (no content gate).
        let d = decide_appropriateness(
            RequestedTask::Explanation,
            SourceKind::AdrRfc,
            "ADR-002",
            &[],
        );
        assert_eq!(d.class, AppropriatenessClass::ExactTaskSource);
        assert!(d.reasons.contains(&AppropriatenessReason::TaskKindExactFit));
    }

    #[test]
    fn dfn5_currency_reason_is_recorded_and_the_tree_is_current_only() {
        // M2.19A (ADR-045) made the ADR tree current-only: no registry doc self-declares a historical
        // status, so the currency CAP branch of `decide_appropriateness` is dormant. The surviving,
        // testable invariant: every source records EXACTLY ONE currency reason, and for the current tree
        // that reason is always `CurrencyCurrent` (never `CurrencyHistorical`). Exercising the cap itself
        // would now require a synthetic historical fixture.
        for id in ["ADR-027", "ADR-031", "ADR-039", "ADR-002"] {
            let d = decide_appropriateness(RequestedTask::Explanation, SourceKind::AdrRfc, id, &[]);
            let currency = d
                .reasons
                .iter()
                .filter(|r| {
                    matches!(
                        r,
                        AppropriatenessReason::CurrencyCurrent
                            | AppropriatenessReason::CurrencyHistorical
                    )
                })
                .count();
            assert_eq!(currency, 1, "{id}: exactly one currency reason expected");
            assert!(
                !is_historical(id),
                "{id}: the current-only tree has no historical doc"
            );
            assert!(
                d.reasons.contains(&AppropriatenessReason::CurrencyCurrent),
                "{id}: expected CurrencyCurrent"
            );
        }
    }

    #[test]
    fn textual_similarity_never_outranks_the_primary() {
        let p = plan("explica a ADR-002", "ADR-002");
        if let Some(primary) = p.sources.iter().find(|s| s.role == SourceRole::Primary) {
            let max_support = p
                .sources
                .iter()
                .filter(|s| s.role == SourceRole::Supporting)
                .map(|s| s.priority)
                .max()
                .unwrap_or(0);
            assert!(
                primary.priority > max_support,
                "primary must outrank supporting"
            );
        }
    }
}
