//! M2.18B.6 — Rust-First Single-Pass Grounded Synthesis: the deterministic intent+entity resolver.
//!
//! This is where BanzAI understands the question: it produces a typed [`ResolvedIntent`] entirely in
//! Rust — normalization + typo recovery + boundary status + a deterministic classification into the
//! canonical `PRIMARY_INTENTS` taxonomy + candidate-only entity resolution + depth + clarification. The
//! model no longer interprets the question, selects sources or controls routing; it is invoked once,
//! downstream, only to synthesise an explanation from the FactualPackage this resolution seeds.
//!
//! Pure + total + reproducible: the same normalized question with the same seeded entity and the same
//! document base yields the same intent, entity, depth and eligible sources. Entity resolution reuses the
//! already-Rust-sovereign [`crate::catalogue::select_entity`] (with an empty model id → fully
//! deterministic) and [`crate::docref`]; intent reuses the canonical vocabulary markers in
//! [`crate::intent`] plus the explanatory markers defined here. Boundaries remain owned by
//! [`crate::boundary`] / [`crate::route`] upstream; this resolver never softens one.

use crate::intent::{
    any_hit, COMPARE_MARKERS, DOC_MARKERS, GOVERNANCE_MARKERS, LOCATE_MARKERS, STATUS_MARKERS,
};
use serde::{Deserialize, Serialize};

// ── explanatory-operation markers (the ~half of PRIMARY_INTENTS the entry model used to own) ─────────
// Accent-free (matched against `normalize()`d text), whole-substring, rare in unrelated prose.
const IMPACT_MARKERS: &[&str] = &[
    "impacto",
    "impact",
    "o que muda",
    "que muda",
    "o que altera",
    "consequencia",
    "consequencias",
    "consequence",
    "consequences",
    "implicacao",
    "implicacoes",
    "implication",
    "implications",
    "o que significa para",
    "para os operadores",
    "para um operador",
];
const EXAMPLE_MARKERS: &[&str] = &[
    "exemplo",
    "exemplos",
    "example",
    "por exemplo",
    "da um exemplo",
    "de um exemplo",
    "mostra um exemplo",
    "sample",
];
// NOTE: "how it works" / "como funciona" questions intentionally have NO dedicated marker set — the
// canonical taxonomy has no "how_it_works" intent; they resolve to explain_concept (or explain_document
// when a document is explicitly named) via the default branch, which is the correct grounded behaviour.
const SUMMARIZE_MARKERS: &[&str] = &[
    "resume",
    "resumo",
    "resumir",
    "em resumo",
    "summarize",
    "summary",
    "tldr",
    "em poucas palavras",
];
const REASON_MARKERS: &[&str] = &[
    "porque",
    "por que",
    "porquê",
    "why",
    "razao",
    "razoes",
    "motivo",
    "motivos",
    "motivacao",
    "justificacao",
    "para que serve",
];

/// Map a classified intent to the FactualPackage depth (matches the historical `depthForIntent`:
/// comparison and impact need facts from more than one record; everything else is brief).
pub fn depth_for_intent(intent: &str) -> &'static str {
    match intent {
        "compare_documents" | "explain_impact" => "standard",
        _ => "brief",
    }
}

/// Deterministically classify an EXPLANATORY question (one the router already sent to the trunk) into the
/// canonical `PRIMARY_INTENTS` taxonomy. `has_explicit_doc` = the user explicitly named ≥1 real document;
/// `explicit_ref_count` = how many. Order is specificity-first; the default splits document vs concept.
pub fn classify_trunk_intent(
    nq: &str,
    has_explicit_doc: bool,
    explicit_ref_count: usize,
) -> String {
    // COMPARE — a contrast marker + (a document marker OR two explicit refs).
    if any_hit(nq, COMPARE_MARKERS) && (any_hit(nq, DOC_MARKERS) || explicit_ref_count >= 2) {
        return "compare_documents".into();
    }
    // IMPACT / consequences — the operator-facing "what changes".
    if any_hit(nq, IMPACT_MARKERS) {
        return "explain_impact".into();
    }
    // LOCATE — where a rule/guarantee lives.
    if any_hit(nq, LOCATE_MARKERS) {
        return "locate_rule".into();
    }
    // GOVERNANCE — process/agency questions.
    if any_hit(nq, GOVERNANCE_MARKERS) {
        return "explain_governance".into();
    }
    // SUMMARIZE — a document summary; only meaningful for an explicit document, else a concept explanation.
    if any_hit(nq, SUMMARIZE_MARKERS) {
        return if has_explicit_doc {
            "summarize_document".into()
        } else {
            "explain_concept".into()
        };
    }
    // STATUS that reached the trunk (a bare status question is a Rust terminal upstream): treat as an
    // explanation of the named document/concept — check_document_status rides along as a secondary intent.
    // Default explanatory split: an explicit document → explain_document; otherwise a concept.
    if has_explicit_doc {
        "explain_document".into()
    } else {
        "explain_concept".into()
    }
}

/// The typed intent Rust produces for a trunk question (M2.18B.6 §8). Serialized to the JS layer as
/// public-safe metadata; the model never produces or edits it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResolvedIntent {
    pub schema_version: u32,
    pub original_query: String,
    pub normalized_query: String,
    pub corrected_query: String,
    pub corrections: Vec<String>,
    pub language: String,
    pub primary_intent: String,
    pub secondary_intents: Vec<String>,
    /// "deterministic" (Rust terminal candidate) | "inferred" (needs the single Qwen synthesis).
    pub answer_type: String,
    pub resolved_entity_id: String,
    pub entity_selection_reason: String,
    pub explicit_refs: Vec<String>,
    pub concept_source: String,
    pub depth: String,
    pub example_requested: bool,
    pub comparison_requested: bool,
    pub impact_requested: bool,
    pub reason_requested: bool,
    pub requires_clarification: bool,
    pub clarification_candidates: Vec<String>,
    /// "exact" | "high_confidence" | "ambiguous" (from the recovery layer).
    pub confidence_band: String,
    pub resolution_method: String,
    pub boundary_detected: bool,
    /// Exactly 1 for an inferred explanation; the trunk calls the model once. (Terminals are 0, but they
    /// never reach this resolver — the router serves them before the trunk.)
    pub expected_model_calls: u32,

    // --- BZC-1 entity + artifact + scope ontology (from `crate::artifact::resolve_scope`) ---
    /// Canonical id of the ecosystem entity the question targets (e.g. "operator-zero"); "" = the protocol.
    pub entity_id: String,
    /// protocol | operator | implementation | organization | engine | "" (none).
    pub entity_type: String,
    /// Populated only when `entity_type == "operator"` — otherwise "".
    pub operator_id: String,
    /// Populated only when `entity_type == "implementation"` — otherwise "".
    pub implementation_id: String,
    /// protocol | operator | implementation — whose scope the answer belongs to.
    pub protocol_scope: String,
    /// The requested artifact class (protocol_manifest / implementation_manifest / key_manifest / …).
    pub artifact_type: String,
    /// SOVEREIGN signal: the answer must come from a specific implementation's LIVE artifact (fetched via
    /// the secure pipeline), NOT a generic protocol document. Set when an operator/implementation entity
    /// co-occurs with an implementation-scoped artifact. This is what stops entity+artifact questions from
    /// resolving to the Protocol Manifesto.
    pub requires_live_tool: bool,
    /// none | live_tool — the class of authority the answer requires.
    pub authority_requirement: String,
    /// RESOLVED | AMBIGUOUS | NOT_FOUND | UNSUPPORTED | FORBIDDEN — explicit, never silent.
    pub resolution_state: String,
    /// Named ambiguities the resolver could not settle deterministically (empty when RESOLVED).
    pub ambiguities: Vec<String>,
}

fn band_str(b: &crate::fuzzy::Band) -> &'static str {
    match b {
        crate::fuzzy::Band::Exact => "exact",
        crate::fuzzy::Band::HighConfidence => "high_confidence",
        crate::fuzzy::Band::Ambiguous => "ambiguous",
    }
}

/// Resolve an explanatory question to a typed [`ResolvedIntent`] — the single deterministic understanding
/// step. `seeded_entity_id` is the router's authoritative seed (an explicit document or a concept's
/// canonical source); when empty the resolver selects the entity deterministically from Rust candidates.
/// No model is invoked here.
pub fn resolve_intent(question: &str, seeded_entity_id: &str) -> ResolvedIntent {
    let rec = crate::fuzzy::recover(question);
    let nq = if rec.corrected_query.is_empty() {
        crate::normalize(question)
    } else {
        rec.corrected_query.clone()
    };
    let boundary = crate::boundary::evaluate(question);

    // explicit, registry-resolvable document references (deterministic, authoritative)
    let mut explicit_refs: Vec<String> = Vec::new();
    for r in crate::docref::detect_refs(question) {
        if crate::docref::resolve(&r.id).is_some() && !explicit_refs.contains(&r.id) {
            explicit_refs.push(r.id);
        }
    }
    let mut concept_source = crate::concept::resolve_concept(question)
        .unwrap_or("")
        .to_string();
    let seeded = seeded_entity_id.trim().to_string();

    // BZC-1 entity+artifact+scope resolution — runs BEFORE the documental fast path so an
    // operator/implementation artifact question can never fall through to a generic protocol document.
    let scope = crate::artifact::resolve_scope(question);
    let operator_id = if scope.entity_type == "operator" {
        scope.entity_id.clone()
    } else {
        String::new()
    };
    let implementation_id = if scope.entity_type == "implementation" {
        scope.entity_id.clone()
    } else {
        String::new()
    };

    // "explicit document" means the USER named a real ADR/RFC (docref::detect_refs). A seed that happens
    // to be a doc id is NOT enough: a concept's canonical source (e.g. federação → ADR-040) is still a
    // CONCEPT question and must classify as explain_concept, not explain_document.
    let has_explicit_doc = !explicit_refs.is_empty();
    let mut primary_intent = classify_trunk_intent(&nq, has_explicit_doc, explicit_refs.len());

    // entity: the router's seed is authoritative; otherwise deterministic candidate selection (empty
    // model id ⇒ fully Rust). compare keeps an empty single-entity id by design.
    let (mut resolved_entity_id, mut entity_selection_reason) = if !seeded.is_empty() {
        (seeded.clone(), "seeded_by_router".to_string())
    } else {
        let sel = crate::catalogue::select_entity("", false, &primary_intent, question, 5);
        (sel.resolved_id, sel.reason)
    };

    // BZC-1 SCOPE DOMINATION — runs before the documental fast path. When an operator/implementation
    // entity co-occurs with an implementation-scoped artifact, the entity scope OWNS the answer: the
    // request is for THAT implementation's live artifact, never a generic protocol document. We clear
    // `concept_source` (so nothing downstream grounds on docs/reference/manifesto.md), pin the entity as
    // the resolved id, and set a get_implementation_artifact intent that the pipeline serves as a
    // deterministic, honest live-routed terminal (0 model calls until the BZC-2 live tool lands).
    let mut answer_type = "inferred".to_string();
    let mut expected_model_calls: u32 = 1;
    if scope.requires_live_tool {
        concept_source = String::new();
        primary_intent = "get_implementation_artifact".to_string();
        resolved_entity_id = scope.entity_id.clone();
        entity_selection_reason = "entity_artifact_scope_domination".to_string();
        answer_type = "deterministic".to_string();
        expected_model_calls = 0;
    }

    // secondary intents (mixed questions): a status or reason component riding on an explanation.
    let mut secondary_intents: Vec<String> = Vec::new();
    if primary_intent != "check_document_status" && any_hit(&nq, STATUS_MARKERS) {
        secondary_intents.push("check_document_status".into());
    }

    let example_requested = any_hit(&nq, EXAMPLE_MARKERS);
    let comparison_requested =
        primary_intent == "compare_documents" || any_hit(&nq, COMPARE_MARKERS);
    let impact_requested = primary_intent == "explain_impact" || any_hit(&nq, IMPACT_MARKERS);
    let reason_requested = any_hit(&nq, REASON_MARKERS);

    let corrections: Vec<String> = rec.corrections.iter().map(|c| c.display.clone()).collect();
    let depth = depth_for_intent(&primary_intent).to_string();

    ResolvedIntent {
        schema_version: 1,
        original_query: question.to_string(),
        normalized_query: crate::normalize(question),
        corrected_query: nq,
        corrections,
        language: "pt".into(),
        primary_intent,
        secondary_intents,
        answer_type,
        resolved_entity_id,
        entity_selection_reason,
        explicit_refs,
        concept_source,
        depth,
        example_requested,
        comparison_requested,
        impact_requested,
        reason_requested,
        requires_clarification: rec.requires_clarification,
        clarification_candidates: rec.clarification.clone(),
        confidence_band: band_str(&rec.band).to_string(),
        resolution_method: if scope.requires_live_tool {
            "rust_entity_artifact_scope".into()
        } else {
            "rust_deterministic".into()
        },
        boundary_detected: boundary.boundary_detected,
        expected_model_calls,

        // BZC-1 entity + artifact + scope ontology
        entity_id: scope.entity_id.clone(),
        entity_type: scope.entity_type.clone(),
        operator_id,
        implementation_id,
        protocol_scope: scope.protocol_scope.clone(),
        artifact_type: scope.artifact_type.clone(),
        requires_live_tool: scope.requires_live_tool,
        authority_requirement: scope.authority_requirement.clone(),
        resolution_state: "RESOLVED".into(),
        ambiguities: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn intent(q: &str, seeded: &str) -> String {
        resolve_intent(q, seeded).primary_intent
    }

    #[test]
    fn bzc1_entity_artifact_scope_dominates_the_documental_fast_path() {
        // The reproduced acceptance query: entity+artifact must NOT resolve to the Protocol Manifesto.
        let ri = resolve_intent("me mostre o manifesto do operador zero", "");
        assert_eq!(ri.entity_id, "operator-zero");
        assert_eq!(ri.implementation_id, "operator-zero");
        assert_eq!(ri.operator_id, "");
        assert_eq!(ri.artifact_type, "implementation_manifest");
        assert!(ri.requires_live_tool);
        assert_eq!(ri.authority_requirement, "live_tool");
        assert_eq!(ri.primary_intent, "get_implementation_artifact");
        assert_eq!(ri.resolved_entity_id, "operator-zero");
        assert_eq!(ri.answer_type, "deterministic");
        assert_eq!(ri.expected_model_calls, 0);
        // CRITICAL: concept_source is cleared — nothing downstream can ground on the protocol doc.
        assert_eq!(ri.concept_source, "");
        assert_eq!(ri.resolution_method, "rust_entity_artifact_scope");
    }

    #[test]
    fn bzc1_seeded_router_id_is_overridden_by_scope_domination() {
        // Even if the router seeds the protocol manifesto doc, scope domination reclaims the entity.
        let ri = resolve_intent(
            "mostra o manifesto do operador zero",
            "docs/reference/manifesto.md",
        );
        assert_eq!(ri.resolved_entity_id, "operator-zero");
        assert_eq!(ri.concept_source, "");
        assert!(ri.requires_live_tool);
    }

    #[test]
    fn bzc1_protocol_manifest_question_is_untouched() {
        let ri = resolve_intent("o que é o manifesto do protocolo", "");
        assert!(!ri.requires_live_tool);
        assert_eq!(ri.entity_id, "");
        assert_eq!(ri.protocol_scope, "protocol");
        assert_eq!(ri.artifact_type, "protocol_manifest");
        // Ordinary concept path preserved (concept_source still resolvable to the protocol doc).
        assert_eq!(ri.primary_intent, "explain_concept");
    }

    #[test]
    fn concept_explanations_classify_as_explain_concept() {
        for q in [
            "explica a federação",
            "o que é a revogação",
            "explica trust",
            "explica governança",
            "como federar um operador?",
        ] {
            assert_eq!(intent(q, ""), "explain_concept", "q={q}");
        }
    }

    #[test]
    fn explicit_document_explanations_classify_as_explain_document() {
        for q in [
            "explica o ADR-053",
            "explica a RFC-0006",
            "resume a ADR-002",
        ] {
            let it = intent(q, "");
            assert!(
                it == "explain_document" || it == "summarize_document",
                "q={q} it={it}"
            );
        }
    }

    #[test]
    fn comparison_and_impact_and_governance_classify() {
        assert_eq!(intent("compara ADR-053 e ADR-054", ""), "compare_documents");
        assert_eq!(
            intent("qual é o impacto para um operador?", ""),
            "explain_impact"
        );
        assert_eq!(
            intent("o que muda para os operadores com a revogação?", ""),
            "explain_impact"
        );
        assert_eq!(
            intent("quem pode propor mudanças ao protocolo?", ""),
            "explain_governance"
        );
    }

    #[test]
    fn depth_is_standard_for_compare_and_impact_only() {
        assert_eq!(depth_for_intent("compare_documents"), "standard");
        assert_eq!(depth_for_intent("explain_impact"), "standard");
        assert_eq!(depth_for_intent("explain_concept"), "brief");
        assert_eq!(depth_for_intent("explain_document"), "brief");
    }

    #[test]
    fn resolved_intent_is_reproducible_and_single_model_call() {
        let a = resolve_intent("explica a federação", "ADR-040");
        let b = resolve_intent("explica a federação", "ADR-040");
        assert_eq!(a.primary_intent, b.primary_intent);
        assert_eq!(a.resolved_entity_id, b.resolved_entity_id);
        assert_eq!(a.resolved_entity_id, "ADR-040", "seed is authoritative");
        assert_eq!(a.expected_model_calls, 1);
        assert_eq!(a.answer_type, "inferred");
        assert_eq!(a.entity_selection_reason, "seeded_by_router");
    }

    #[test]
    fn example_and_reason_flags_are_detected() {
        let r = resolve_intent("explica a revogação com um exemplo", "");
        assert!(r.example_requested);
        let r2 = resolve_intent("porque foi aceite a ADR-053?", "ADR-053");
        assert!(r2.reason_requested);
    }

    #[test]
    fn mixed_status_plus_reason_keeps_status_as_secondary() {
        // "qual o estado da ADR-053 e porque foi aceite" → an explanation with a status secondary.
        let r = resolve_intent("qual o estado da ADR-053 e porque foi aceite", "ADR-053");
        assert!(r
            .secondary_intents
            .iter()
            .any(|s| s == "check_document_status"));
        assert!(r.reason_requested);
    }
}
