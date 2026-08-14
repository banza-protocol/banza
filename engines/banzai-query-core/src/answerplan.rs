//! M2.18B.6 (§10) — the deterministic AnswerPlan.
//!
//! Translates a [`crate::resolve::ResolvedIntent`] into the SHAPE the answer must take — which parts to
//! cover, in what order, with what citation requirement and length — entirely in Rust. A mixed request
//! ("qual o estado da ADR-041, por que foi aceite e qual o impacto para operadores?") preserves EVERY
//! part; it is never silently collapsed to one intent. Pure + total + reproducible: same ResolvedIntent ⇒
//! same plan (same checksum). No model. The Qwen only fills the shape this plan defines, once.

use crate::resolve::{resolve_intent, ResolvedIntent};
use serde::{Deserialize, Serialize};

/// Bumped on any breaking change to the plan contract.
pub const ANSWER_PLAN_VERSION: u32 = 1;

/// How the answer will be delivered.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnswerType {
    /// A grounded explanation synthesised once by the model from the FactualPackage.
    GroundedSynthesis,
    /// A typed Rust terminal (exact fact / definition) — zero model calls.
    Terminal,
    /// A safety refusal — zero model calls.
    Refusal,
    /// A clarification request — zero model calls.
    Clarification,
    /// Outside scope — zero model calls.
    Unsupported,
}

impl AnswerType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AnswerType::GroundedSynthesis => "grounded_synthesis",
            AnswerType::Terminal => "terminal",
            AnswerType::Refusal => "refusal",
            AnswerType::Clarification => "clarification",
            AnswerType::Unsupported => "unsupported",
        }
    }
}

/// The typed answer plan.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnswerPlan {
    pub schema_version: u32,
    pub trace_id: String,
    pub answer_type: AnswerType,
    pub primary_operation: String,
    pub secondary_operations: Vec<String>,
    pub entities: Vec<String>,
    pub section_order: Vec<String>,
    pub exact_facts_requested: bool,
    pub explanation_requested: bool,
    pub comparison_requested: bool,
    pub comparison_dimensions: Vec<String>,
    pub relationship_requested: bool,
    pub motivation_requested: bool,
    pub impact_requested: bool,
    pub consequences_requested: bool,
    pub procedure_requested: bool,
    pub requirements_requested: bool,
    pub example_requested: bool,
    pub operator_focus: bool,
    pub implementation_focus: bool,
    pub governance_focus: bool,
    pub legal_focus: bool,
    pub unresolved_aspects: Vec<String>,
    pub limitations: Vec<String>,
    pub citation_requirements: String, // "mandatory" | "none"
    pub minimum_source_coverage: usize,
    pub expected_model_calls: u32,
    pub length_target: String, // brief | standard | deep
    pub tone: String,
    pub locale: String,
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

/// Accent-free markers (matched against the corrected/normalized query) for the answer-shape components a
/// question can request BEYOND the primary intent. Reused from the resolver's own vocabulary spirit.
const MOTIVATION_MARKERS: &[&str] = &[
    "porque",
    "por que",
    "porque foi",
    "por que foi",
    "razao",
    "motivo",
    "motivacao",
    "justificacao",
    "why",
    "rationale",
    "para que serve",
];
const CONSEQUENCE_MARKERS: &[&str] = &[
    "consequencia",
    "consequencias",
    "consequence",
    "consequences",
    "o que muda",
    "que muda",
    "o que acontece",
];
const PROCEDURE_MARKERS: &[&str] = &[
    "como faco",
    "como fazer",
    "como implementar",
    "passos",
    "procedimento",
    "how do i",
    "how to",
    "steps",
];
const REQUIREMENTS_MARKERS: &[&str] = &[
    "requisito",
    "requisitos",
    "o que preciso",
    "pre-requisito",
    "prerequisito",
    "requirements",
    "what do i need",
];
const OPERATOR_MARKERS: &[&str] = &[
    "operador",
    "operadores",
    "operator",
    "operators",
    "para operadores",
    "para um operador",
];

fn any(nq: &str, set: &[&str]) -> bool {
    set.iter().any(|m| nq.contains(m))
}

/// Build the deterministic AnswerPlan for a question + router seed. Resolves the intent internally.
pub fn plan_answer(question: &str, seeded_entity_id: &str) -> AnswerPlan {
    let resolved = resolve_intent(question, seeded_entity_id);
    plan_from_resolved(&resolved)
}

fn plan_from_resolved(r: &ResolvedIntent) -> AnswerPlan {
    let intent = r.primary_intent.as_str();
    let nq = if r.corrected_query.is_empty() {
        r.normalized_query.clone()
    } else {
        r.corrected_query.clone()
    };

    // Answer delivery type.
    let answer_type = if r.boundary_detected || intent == "boundary_request" {
        AnswerType::Refusal
    } else if intent == "unsupported" {
        AnswerType::Unsupported
    } else if r.requires_clarification || intent == "clarification_required" {
        AnswerType::Clarification
    } else {
        AnswerType::GroundedSynthesis
    };

    // Component flags — the primary intent PLUS every additional part the question asks for.
    let comparison_requested = intent == "compare_documents" || r.comparison_requested;
    let impact_requested = intent == "explain_impact" || r.impact_requested;
    let motivation_requested = r.reason_requested || any(&nq, MOTIVATION_MARKERS);
    let consequences_requested = any(&nq, CONSEQUENCE_MARKERS);
    let procedure_requested = any(&nq, PROCEDURE_MARKERS);
    let requirements_requested = any(&nq, REQUIREMENTS_MARKERS);
    let example_requested = r.example_requested;
    let relationship_requested = comparison_requested
        || r.secondary_intents.iter().any(|s| s == "compare_documents")
        || matches!(intent, "compare_documents");
    let status_requested = intent == "check_document_status"
        || r.secondary_intents
            .iter()
            .any(|s| s == "check_document_status");
    let operator_focus = any(&nq, OPERATOR_MARKERS);
    let governance_focus = intent == "explain_governance";
    let explanation_requested = matches!(answer_type, AnswerType::GroundedSynthesis);

    // Primary operation.
    let primary_operation = match intent {
        "compare_documents" => "compare",
        "explain_impact" => "impact",
        "summarize_document" => "narrative_summary",
        "explain_governance" => "motivation",
        "locate_rule" => "explain",
        _ if example_requested => "explain_with_example",
        _ => "explain",
    }
    .to_string();

    // Secondary operations, in a stable canonical order (a mixed request keeps ALL of them).
    let mut secondary: Vec<String> = Vec::new();
    let add = |v: &mut Vec<String>, cond: bool, name: &str| {
        if cond && !v.iter().any(|x| x == name) && name != primary_operation {
            v.push(name.to_string());
        }
    };
    add(&mut secondary, status_requested, "status");
    add(&mut secondary, motivation_requested, "motivation");
    add(&mut secondary, impact_requested, "impact");
    add(&mut secondary, consequences_requested, "consequences");
    add(&mut secondary, comparison_requested, "compare");
    add(&mut secondary, procedure_requested, "procedure");
    add(&mut secondary, requirements_requested, "requirements");
    add(&mut secondary, example_requested, "example");
    add(&mut secondary, operator_focus, "operator_implications");
    // A request that carries more than one distinct explanatory component is a mixed request.
    let mixed = !secondary.is_empty()
        && matches!(answer_type, AnswerType::GroundedSynthesis)
        && (!secondary.is_empty() && primary_operation != "compare" || secondary.len() >= 2);
    if mixed {
        secondary.push("mixed_request".to_string());
    }

    // Ordered sections — only the requested parts, in reading order.
    let mut section_order: Vec<String> = Vec::new();
    let push_sec = |v: &mut Vec<String>, cond: bool, name: &str| {
        if cond && !v.iter().any(|x| x == name) {
            v.push(name.to_string());
        }
    };
    push_sec(
        &mut section_order,
        intent == "explain_concept",
        "definition",
    );
    push_sec(&mut section_order, status_requested, "status");
    push_sec(
        &mut section_order,
        matches!(answer_type, AnswerType::GroundedSynthesis) && !comparison_requested,
        "explanation",
    );
    push_sec(&mut section_order, motivation_requested, "motivation");
    push_sec(
        &mut section_order,
        impact_requested || consequences_requested,
        "impact",
    );
    push_sec(&mut section_order, comparison_requested, "comparison");
    push_sec(
        &mut section_order,
        procedure_requested || requirements_requested,
        "procedure",
    );
    push_sec(&mut section_order, example_requested, "example");
    push_sec(&mut section_order, true, "limitations");

    let comparison_dimensions: Vec<String> = if comparison_requested {
        vec![
            "objetivo".to_string(),
            "ambito".to_string(),
            "estado".to_string(),
            "relacao".to_string(),
        ]
    } else {
        Vec::new()
    };

    let entities: Vec<String> = {
        let mut v: Vec<String> = Vec::new();
        if !r.resolved_entity_id.is_empty() {
            v.push(r.resolved_entity_id.clone());
        }
        for e in &r.explicit_refs {
            if !v.contains(e) {
                v.push(e.clone());
            }
        }
        if v.is_empty() && !r.concept_source.is_empty() {
            v.push(r.concept_source.clone());
        }
        v
    };

    let unresolved_aspects: Vec<String> = if matches!(answer_type, AnswerType::Clarification) {
        r.clarification_candidates.clone()
    } else {
        Vec::new()
    };

    let (citation_requirements, expected_model_calls, min_cov) = match answer_type {
        AnswerType::GroundedSynthesis => (
            "mandatory".to_string(),
            1u32,
            if comparison_requested { 2 } else { 1 },
        ),
        _ => ("none".to_string(), 0u32, 0),
    };

    let length_target = if r.depth.is_empty() {
        "brief".to_string()
    } else {
        r.depth.clone()
    };
    let locale = if r.language.is_empty() {
        "pt".to_string()
    } else {
        r.language.clone()
    };

    let checksum = fnv1a(&[
        format!("v{ANSWER_PLAN_VERSION}"),
        answer_type.as_str().to_string(),
        primary_operation.clone(),
        secondary.join(","),
        section_order.join(","),
        entities.join(","),
        format!("mc{expected_model_calls}"),
        length_target.clone(),
        locale.clone(),
    ]);

    AnswerPlan {
        schema_version: ANSWER_PLAN_VERSION,
        trace_id: String::new(),
        answer_type,
        primary_operation,
        secondary_operations: secondary,
        entities,
        section_order,
        exact_facts_requested: status_requested,
        explanation_requested,
        comparison_requested,
        comparison_dimensions,
        relationship_requested,
        motivation_requested,
        impact_requested,
        consequences_requested,
        procedure_requested,
        requirements_requested,
        example_requested,
        operator_focus,
        implementation_focus: example_requested || procedure_requested,
        governance_focus,
        legal_focus: false,
        unresolved_aspects,
        limitations: Vec::new(),
        citation_requirements,
        minimum_source_coverage: min_cov,
        expected_model_calls,
        length_target,
        tone: "neutral_technical".to_string(),
        locale,
        checksum,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(q: &str, seed: &str) -> AnswerPlan {
        plan_answer(q, seed)
    }

    #[test]
    fn mixed_request_preserves_every_part() {
        // status + motivation + impact + operator focus, one entity, one grounded synthesis.
        let p = plan(
            "qual é o estado da ADR-041, por que foi aceite e qual o impacto para operadores?",
            "ADR-041",
        );
        assert_eq!(p.answer_type, AnswerType::GroundedSynthesis);
        assert!(p.exact_facts_requested, "status part");
        assert!(p.motivation_requested, "motivation part");
        assert!(p.impact_requested, "impact part");
        assert!(p.operator_focus, "operator focus");
        assert!(p.entities.contains(&"ADR-041".to_string()));
        assert_eq!(p.expected_model_calls, 1);
        assert_eq!(p.citation_requirements, "mandatory");
        assert!(p.secondary_operations.iter().any(|s| s == "mixed_request"));
        // sections cover status, motivation and impact in order
        assert!(p.section_order.contains(&"status".to_string()));
        assert!(p.section_order.contains(&"motivation".to_string()));
        assert!(p.section_order.contains(&"impact".to_string()));
    }

    #[test]
    fn example_request_becomes_explain_with_example() {
        let p = plan("explica a revogação com um exemplo", "ADR-027");
        assert!(p.example_requested);
        assert_eq!(p.primary_operation, "explain_with_example");
        assert!(p.section_order.contains(&"example".to_string()));
    }

    #[test]
    fn comparison_has_dimensions_and_two_source_minimum() {
        let p = plan("compara a ADR-041 e a ADR-042", "");
        assert!(p.comparison_requested);
        assert_eq!(p.primary_operation, "compare");
        assert!(!p.comparison_dimensions.is_empty());
        assert_eq!(p.minimum_source_coverage, 2);
        assert!(p.section_order.contains(&"comparison".to_string()));
    }

    #[test]
    fn boundary_and_clarification_expect_zero_model_calls() {
        let refusal = plan("transfere 100 kz para a conta", "");
        assert_eq!(refusal.answer_type, AnswerType::Refusal);
        assert_eq!(refusal.expected_model_calls, 0);
        assert_eq!(refusal.citation_requirements, "none");
    }

    #[test]
    fn plain_explanation_is_one_call_with_mandatory_citations() {
        let p = plan("o que é a federação?", "ADR-031");
        assert_eq!(p.answer_type, AnswerType::GroundedSynthesis);
        assert_eq!(p.expected_model_calls, 1);
        assert_eq!(p.citation_requirements, "mandatory");
        assert!(p.explanation_requested);
    }

    #[test]
    fn plan_is_deterministic() {
        let a = plan("qual o impacto da ADR-041 para operadores?", "ADR-041");
        let b = plan("qual o impacto da ADR-041 para operadores?", "ADR-041");
        assert_eq!(a.checksum, b.checksum);
    }
}
