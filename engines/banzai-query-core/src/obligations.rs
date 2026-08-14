//! M2.18B.7 (Semantic Task Fulfilment) — the task ontology + AnswerObligations authority.
//!
//! The confirmed structural defect: BanzAI grounds and cites, but frequently does not FULFIL the concrete
//! task asked (an "example" request answered with a definition, a "how-to" answered with an ADR list, a
//! "manifest example" answered with generic architecture). The [`crate::answerplan::AnswerPlan`] already
//! models the *components* a question asks for (example_requested, procedure_requested, comparison…); this
//! module adds the two missing pieces on top of it, additively (AnswerPlan's serialized shape is unchanged):
//!
//!   1. a closed [`RequestedTask`] taxonomy separating the SUBJECT (operator, manifest, ADR-001…) from the
//!      TASK the user asked for (define, explain, give-an-example, give-a-procedure, show-a-template, look
//!      up a document, summarize, compare, impact…). Not everything is "explain".
//!   2. a typed [`AnswerObligationSet`] — exactly what a fulfilling answer MUST deliver for that task: the
//!      mandatory sections, forbidden substitutions, required evidence, preferred source roles, the
//!      illustrative-example policy and the completion rule.
//!
//! Pure + total + reproducible: same question ⇒ same obligations. No model. The Qwen only fills the shape
//! these obligations define; the [`crate::taskcheck`] validator then proves the shape was actually filled.

use crate::answerplan::{plan_answer, AnswerPlan, AnswerType};
use crate::normalize;
use serde::{Deserialize, Serialize};

/// Bumped on any breaking change to the obligations contract.
pub const OBLIGATIONS_VERSION: u32 = 1;

/// The closed taxonomy of tasks a user can ask BanzAI to perform on a subject. This is the TASK axis; the
/// subject (operator/manifest/ADR-001/federation…) is orthogonal and lives on the AnswerPlan entities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RequestedTask {
    ExactFact,
    Definition,
    DocumentLookup,
    DocumentMetadata,
    DocumentSummary,
    Explanation,
    Motivation,
    Impact,
    Consequences,
    Comparison,
    Relationship,
    Requirements,
    Procedure,
    Example,
    Template,
    Validation,
    Troubleshooting,
    MixedTask,
    FollowUp,
    Clarification,
    Unsupported,
}

impl RequestedTask {
    pub fn as_str(&self) -> &'static str {
        use RequestedTask::*;
        match self {
            ExactFact => "exact_fact",
            Definition => "definition",
            DocumentLookup => "document_lookup",
            DocumentMetadata => "document_metadata",
            DocumentSummary => "document_summary",
            Explanation => "explanation",
            Motivation => "motivation",
            Impact => "impact",
            Consequences => "consequences",
            Comparison => "comparison",
            Relationship => "relationship",
            Requirements => "requirements",
            Procedure => "procedure",
            Example => "example",
            Template => "template",
            Validation => "validation",
            Troubleshooting => "troubleshooting",
            MixedTask => "mixed_task",
            FollowUp => "follow_up",
            Clarification => "clarification",
            Unsupported => "unsupported",
        }
    }
    /// A task that fundamentally requires the model to synthesise prose (vs a deterministic terminal).
    /// A document EXPLANATION is represented by `Explanation` with a document subject (the taxonomy stays
    /// closed and small — there is no separate document-explanation variant).
    pub fn wants_synthesis(&self) -> bool {
        use RequestedTask::*;
        matches!(
            self,
            Explanation
                | Motivation
                | Impact
                | Consequences
                | Comparison
                | Relationship
                | Requirements
                | Procedure
                | Example
                | MixedTask
        )
    }
}

// ─────────────────────────── task-detection vocabulary (accent-free, normalize()d) ─────────────────────

const EXAMPLE_MARKERS: &[&str] = &[
    "exemplo",
    "exemplos",
    "um exemplo",
    "caso pratico",
    "caso de uso",
    "cenario",
    "exemplifica",
    "da me um exemplo",
    "mostra um exemplo",
    "podes dar um exemplo",
    "quero ver um exemplo",
];
// Template / structural requests need a STRUCTURAL CUE — never a bare subject noun. A bare "manifest" must
// NOT force Template (else "explica o manifest" / "o que é um manifest" / "qual o impacto de um manifest"
// would all be hijacked to the JSON structure); those are narrative tasks. A structural subject asked with
// "exemplo de um manifest" is still served the structure via the Example→template fallback in tasked.rs,
// so removing the bare noun changes the task LABEL, not the deliverable. Structural cues only:
const TEMPLATE_MARKERS: &[&str] = &[
    "template",
    "schema",
    "esquema",
    "em json",
    "em yaml",
    "estrutura de",
    "estrutura do",
    "estrutura da",
    "estrutura de um",
    "estrutura dum",
    "modelo de ficheiro",
    "campos do",
    "campos de",
    "campos de um",
    "formato do",
    "formato de um",
];
const PROCEDURE_MARKERS: &[&str] = &[
    "como federar",
    "como faco",
    "como fazer",
    "como implementar",
    "como implemento",
    "como configuro",
    "como configurar",
    "como registo",
    "como registar",
    "como publico",
    "como publicar",
    "como crio",
    "como criar",
    "como adiro",
    "como aderir",
    "como demonstro",
    "como demonstrar",
    "como rodar",
    "como rodo",
    // M2.18B.7 (fallback fix) — key REVOCATION is a how-to. Without these, "como revogar uma chave"
    // fell through to the has_doc branch and misclassified as a document lookup (its subject resolves to
    // the key-manifest doc), starving it of both the deterministic revocation procedure and the trunk's
    // task shape → a rejected synthesis / degraded fallback. It is a Procedure.
    "como revogar",
    "como revogo",
    "como revoga",
    "passos para",
    "passo a passo",
    "procedimento para",
    "procedimento de",
    "how do i",
    "how to",
    "steps to",
];
const REQUIREMENTS_MARKERS: &[&str] = &[
    "requisito",
    "requisitos",
    "pre-requisito",
    "prerequisito",
    "o que preciso",
    "o que e preciso",
    "o que e necessario",
    "requirements",
    "what do i need",
];
// An explicit "explain" verb — turns a bare document reference into a document EXPLANATION.
const EXPLAIN_VERB_MARKERS: &[&str] = &[
    "explica",
    "explique",
    "explicar",
    "descreve",
    "descrever",
    "detalha",
    "o que diz",
    "o que estabelece",
    "o que decide",
    "o que define",
    "fala me",
    "fala-me",
    "fala sobre",
    "conta me",
    "me explica",
];
const SUMMARY_MARKERS: &[&str] = &[
    "resume",
    "resumo de",
    "resumo da",
    "resumo do",
    "faz um resumo",
    "um resumo",
    "resumir",
    "sumariza",
    "summary of",
    "tl;dr",
    "tldr",
];
const DEFINITION_MARKERS: &[&str] = &[
    "o que e",
    "o que sao",
    "que e ",
    "que sao ",
    "define ",
    "definicao de",
    "o que significa",
    "significado de",
    "what is",
];
const METADATA_MARKERS: &[&str] = &[
    "estado da",
    "estado do",
    "qual o estado",
    "versao da",
    "versao do",
    "status of",
];

fn any(nq: &str, set: &[&str]) -> bool {
    set.iter().any(|m| nq.contains(m))
}

/// Does the plan carry a document entity (an ADR/RFC/chapter reference)?
fn has_document_entity(plan: &AnswerPlan) -> bool {
    plan.entities.iter().any(|e| {
        let u = e.to_uppercase();
        u.starts_with("ADR-") || u.starts_with("RFC-") || u.contains("ADR-") || u.contains("RFC-")
    })
}

/// Resolve the single dominant [`RequestedTask`] for a question, given its deterministic AnswerPlan.
/// Deterministic priority: refusal/clarification/unsupported first, then the most structurally specific
/// deliverable (comparison > template > example > procedure > requirements > impact/consequences), then
/// document lookup-vs-explanation, then concept definition-vs-explanation.
pub fn resolve_task(question: &str, plan: &AnswerPlan) -> RequestedTask {
    match plan.answer_type {
        AnswerType::Refusal | AnswerType::Unsupported => return RequestedTask::Unsupported,
        AnswerType::Clarification => return RequestedTask::Clarification,
        _ => {}
    }
    let nq = normalize(question);
    let template = any(&nq, TEMPLATE_MARKERS);
    let example = plan.example_requested || any(&nq, EXAMPLE_MARKERS);
    let has_doc = has_document_entity(plan);
    let explain_verb = any(&nq, EXPLAIN_VERB_MARKERS);

    // Most structurally specific deliverables win.
    if plan.comparison_requested {
        return RequestedTask::Comparison;
    }
    // An explicit HOW-TO verb ("como publicar/federar/registar…") asks for a PROCEDURE even when the
    // subject is a template noun ("como publicar um manifest" is a how-to, not a request for the schema).
    // A bare structure question ("a estrutura de um manifest", "dá-me um exemplo de manifest") carries no
    // how-to verb and still falls through to Template below.
    let procedure = plan.procedure_requested || any(&nq, PROCEDURE_MARKERS);
    if procedure {
        return RequestedTask::Procedure;
    }
    // A manifest/schema/template subject wants a STRUCTURE even when phrased "dá-me um exemplo".
    if template {
        return RequestedTask::Template;
    }
    if example {
        return RequestedTask::Example;
    }
    if plan.requirements_requested || any(&nq, REQUIREMENTS_MARKERS) {
        return RequestedTask::Requirements;
    }
    if any(&nq, SUMMARY_MARKERS) && has_doc {
        return RequestedTask::DocumentSummary;
    }
    if plan.impact_requested {
        return RequestedTask::Impact;
    }
    if plan.consequences_requested {
        return RequestedTask::Consequences;
    }
    // A document reference: bare lookup vs an explicit explanation.
    if has_doc {
        // Whether the QUESTION TEXT itself names a document (vs the entity being a concept the router
        // merely resolved to a canonical doc source). "ADR 005" names one; "o que é a federação" does not.
        let text_names_doc = nq.contains("adr") || nq.contains("rfc");
        if any(&nq, METADATA_MARKERS) {
            return RequestedTask::DocumentMetadata;
        }
        if explain_verb || plan.motivation_requested {
            return RequestedTask::Explanation; // document explanation
        }
        // A concept question ("o que é X") whose entity was resolved to a canonical doc by the router is a
        // DEFINITION of the concept, not a bare document lookup — the user named no document in the text.
        if !text_names_doc && any(&nq, DEFINITION_MARKERS) {
            return RequestedTask::Definition;
        }
        return RequestedTask::DocumentLookup;
    }
    // A concept subject: definition vs general explanation.
    if any(&nq, DEFINITION_MARKERS) && !explain_verb {
        return RequestedTask::Definition;
    }
    if plan.motivation_requested && !explain_verb {
        return RequestedTask::Motivation;
    }
    RequestedTask::Explanation
}

/// The typed contract of what a FULFILLING answer must deliver for a task.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnswerObligationSet {
    pub schema_version: u32,
    pub requested_task: String,
    /// The subject (first entity or concept source), for transparency.
    pub subject: String,
    /// Sections the answer MUST contain (checked by the task-completion validator).
    pub mandatory_sections: Vec<String>,
    /// Substitutions that DO NOT count as fulfilling the task (e.g. a definition does not fulfil an example).
    pub forbidden_substitutions: Vec<String>,
    /// The kind of evidence the task needs.
    pub required_evidence: String, // definitional | explanatory | procedural | structural | comparative | none
    /// Source roles that best fulfil the task, most-preferred first.
    pub preferred_source_roles: Vec<String>,
    pub minimum_source_coverage: usize,
    pub citation_required: bool,
    /// Whether illustrative (hypothetical) content is allowed, and how it must be marked.
    pub illustrative_policy: String, // real_only | illustrative_allowed_marked | structural_from_schema | n/a
    /// The rule the completion validator applies.
    pub completion_rule: String,
    /// What to do when the task cannot be fully satisfied from the sources.
    pub failure_behaviour: String, // transparent_partial | insufficient | clarify | refuse
    /// The expected top-level output shape.
    pub output_shape: String, // prose | scenario | steps | structure | metadata | comparison_table | definition
    pub checksum: String,
}

fn fnv1a(parts: &[&str]) -> String {
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

fn s(v: &[&str]) -> Vec<String> {
    v.iter().map(|x| x.to_string()).collect()
}

/// Build the AnswerObligationSet for a question (resolves the plan + task internally).
pub fn obligations_for(question: &str, seeded_entity_id: &str) -> AnswerObligationSet {
    let plan = plan_answer(question, seeded_entity_id);
    obligations_from_plan(question, &plan)
}

// ─────────────────────────── M2.18B.7 (TFG-3) context control ───────────────────────────

/// The TYPED role short conversation context played in resolving the current turn. Conversation context
/// may supply the missing SUBJECT (anaphora) or refine the OUTPUT, but it must NEVER change the current
/// turn's explicit TASK (a prior "explain" turn must not turn the current "give an example" into an
/// explanation, and vice-versa). This is the observable trace of exactly how context was used.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContextUse {
    /// No context, or the resolved query is identical to the current turn — context was not material.
    None,
    /// Context supplied the SUBJECT the current turn referred to anaphorically ("e um exemplo?").
    EntityReference,
    /// Context supplied the DOCUMENT the current turn referred to ("e o estado dessa ADR?").
    DocumentReference,
    /// The current turn compares against a subject established by context.
    ComparisonTarget,
    /// The current turn asks a NEW explicit deliverable on the context subject (example/procedure/…).
    FollowUpTask,
    /// The current turn only refines the OUTPUT of the previous answer ("e em JSON?", "mais detalhe").
    OutputRefinement,
}

impl ContextUse {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContextUse::None => "none",
            ContextUse::EntityReference => "entity_reference",
            ContextUse::DocumentReference => "document_reference",
            ContextUse::ComparisonTarget => "comparison_target",
            ContextUse::FollowUpTask => "follow_up_task",
            ContextUse::OutputRefinement => "output_refinement",
        }
    }
}

/// Classify HOW conversation context was used to resolve the current turn, deterministically. `raw` is the
/// current turn (typo-corrected); `resolved` is the context-merged query the router produced; `has_context`
/// is whether any prior turn was actually available. Never changes behaviour — it is the typed trace that,
/// together with [`task_from_current_turn`], guarantees context supplies subject/refinement, never task.
pub fn classify_context_use(raw: &str, resolved: &str, has_context: bool) -> ContextUse {
    let nr = normalize(raw);
    if !has_context || nr == normalize(resolved) {
        return ContextUse::None;
    }
    // A pure output refinement ("e em json?", "mais detalhe", "resume isso") — no new subject/task.
    if any(
        &nr,
        &[
            "em json",
            "em formato",
            "mais detalhe",
            "mais detalhes",
            "resume isso",
            "encurta",
            "expande isso",
            "mais curto",
            "mais longo",
        ],
    ) {
        return ContextUse::OutputRefinement;
    }
    let raw_task = resolve_task(raw, &plan_answer(raw, ""));
    if raw_task == RequestedTask::Comparison
        || any(
            &nr,
            &[
                "compara",
                "versus",
                " vs ",
                "diferenca entre",
                "em relacao a",
            ],
        )
    {
        return ContextUse::ComparisonTarget;
    }
    // A NEW explicit deliverable on the context subject.
    if matches!(
        raw_task,
        RequestedTask::Example
            | RequestedTask::Template
            | RequestedTask::Procedure
            | RequestedTask::Requirements
            | RequestedTask::DocumentSummary
    ) {
        return ContextUse::FollowUpTask;
    }
    // A document the current turn refers to but only names via context (ADR/RFC appears in the merge).
    let merged = normalize(resolved);
    if (merged.contains("adr") || merged.contains("rfc"))
        && !(nr.contains("adr") || nr.contains("rfc"))
    {
        return ContextUse::DocumentReference;
    }
    ContextUse::EntityReference
}

/// The question whose TASK governs the answer's SHAPE. Context may supply the subject (via the seed /
/// resolved query used for retrieval) but the current turn's EXPLICIT task always wins: when the current
/// turn carries an explicit deliverable/verb, its own text drives `resolve_task`, so a prior turn's verb
/// can never hijack it. Returns `raw` (the current turn) whenever context was used, else `resolved`
/// (which equals `raw` when there is no context). This is what the trunk feeds to `obligations_for`.
pub fn task_from_current_turn<'a>(raw: &'a str, resolved: &'a str, has_context: bool) -> &'a str {
    if has_context {
        raw
    } else {
        resolved
    }
}

/// Build the AnswerObligationSet from an already-computed AnswerPlan.
pub fn obligations_from_plan(question: &str, plan: &AnswerPlan) -> AnswerObligationSet {
    let task = resolve_task(question, plan);
    let subject = plan.entities.first().cloned().unwrap_or_default();

    // Per-task obligations. Keep sections small and checkable. (One local tuple destructure keeps the
    // per-task table compact and readable; the shape is intentionally wide, so the style lint is allowed.)
    use RequestedTask::*;
    #[allow(clippy::type_complexity)]
    let (mandatory, forbidden, evidence, roles, min_cov, illus, rule, fail, shape): (
        Vec<String>,
        Vec<String>,
        &str,
        Vec<String>,
        usize,
        &str,
        &str,
        &str,
        &str,
    ) = match task {
        Definition => (
            s(&["definition"]),
            s(&["history_only", "architecture_dump"]),
            "definitional",
            s(&["definition", "primary", "supporting"]),
            1,
            "n/a",
            "must state directly what the subject is (nature + function), from a canonical source",
            "insufficient",
            "definition",
        ),
        Explanation => (
            s(&["explanation"]),
            s(&[]),
            "explanatory",
            s(&["primary", "definition", "supporting", "governance"]),
            1,
            "n/a",
            "must explain what/how/why with the main elements, grounded",
            "insufficient",
            "prose",
        ),
        Motivation => (
            s(&["motivation"]),
            s(&[]),
            "explanatory",
            s(&["governance", "primary", "supporting"]),
            1,
            "n/a",
            "must give the rationale/why, grounded",
            "insufficient",
            "prose",
        ),
        Impact | Consequences => (
            s(&["impact"]),
            s(&[]),
            "explanatory",
            s(&["primary", "governance", "supporting"]),
            1,
            "n/a",
            "must state the concrete impact/consequences, grounded",
            "insufficient",
            "prose",
        ),
        Comparison | Relationship => (
            s(&["comparison"]),
            s(&["single_side_only"]),
            "comparative",
            s(&["primary", "relationship", "supporting"]),
            2,
            "n/a",
            "must cover BOTH sides across the comparison dimensions, grounded",
            "insufficient",
            "comparison_table",
        ),
        Requirements => (
            s(&["requirements"]),
            s(&["narrative_instead_of_list"]),
            "procedural",
            s(&["procedure", "implementation", "governance", "supporting"]),
            1,
            "n/a",
            "must list the requirements (mandatory/optional) with source, or state none are published",
            "transparent_partial",
            "structure",
        ),
        Procedure => (
            s(&["procedure"]),
            s(&["conceptual_description_instead_of_steps", "bare_document_list"]),
            "procedural",
            s(&["procedure", "implementation", "governance", "relationship", "supporting"]),
            1,
            "n/a",
            "must give ordered steps (prerequisites→steps→validation→result), OR explicitly state no complete step-by-step procedure is published and give only the confirmed requirements",
            "transparent_partial",
            "steps",
        ),
        Example => (
            s(&["example"]),
            s(&["definition_instead_of_example", "abstract_description_instead_of_scenario"]),
            "explanatory",
            s(&["primary", "implementation", "supporting", "definition"]),
            1,
            "illustrative_allowed_marked",
            "must give a concrete example (scenario/actors/precondition/action/result), clearly marked real or illustrative; a definition does NOT satisfy it",
            "transparent_partial",
            "scenario",
        ),
        Template => (
            s(&["structure"]),
            s(&["architecture_dump_instead_of_structure", "prose_instead_of_fields"]),
            "structural",
            s(&["schema", "definition", "implementation", "metadata"]),
            1,
            "structural_from_schema",
            "must show the real structure/fields (types, required/optional) from a schema, OR state transparently that no public schema is available — never generic architecture",
            "transparent_partial",
            "structure",
        ),
        DocumentLookup => (
            s(&["metadata"]),
            s(&["full_explanation_instead_of_lookup"]),
            "none",
            s(&["metadata", "primary"]),
            1,
            "n/a",
            "must give id, title, status, path and the decision/purpose in brief — the lookup, not a full explanation",
            "insufficient",
            "metadata",
        ),
        DocumentMetadata => (
            s(&["metadata"]),
            s(&[]),
            "none",
            s(&["metadata", "primary"]),
            1,
            "n/a",
            "must give the requested metadata (status/version/date) with source",
            "insufficient",
            "metadata",
        ),
        DocumentSummary => (
            s(&["explanation"]),
            s(&[]),
            "explanatory",
            s(&["primary", "supporting"]),
            1,
            "n/a",
            "must summarize the document's content",
            "insufficient",
            "prose",
        ),
        ExactFact => (
            s(&["exact_fact"]),
            s(&[]),
            "none",
            s(&["primary", "metadata", "legal"]),
            1,
            "n/a",
            "must state the exact fact with its source",
            "insufficient",
            "definition",
        ),
        Validation | Troubleshooting => (
            s(&["explanation"]),
            s(&[]),
            "explanatory",
            s(&["implementation", "primary", "supporting"]),
            1,
            "n/a",
            "must address the validation/troubleshooting concern, grounded",
            "insufficient",
            "prose",
        ),
        MixedTask => (
            s(&["explanation"]),
            s(&["dropping_a_requested_part"]),
            "explanatory",
            s(&["primary", "governance", "supporting"]),
            1,
            "n/a",
            "must cover every requested part; no part may be dropped",
            "insufficient",
            "prose",
        ),
        FollowUp => (
            s(&["explanation"]),
            s(&[]),
            "explanatory",
            s(&["primary", "supporting"]),
            1,
            "n/a",
            "must resolve the anaphoric follow-up against the established subject",
            "clarify",
            "prose",
        ),
        Clarification => (
            s(&["clarification"]),
            s(&[]),
            "none",
            s(&[]),
            0,
            "n/a",
            "must ask a single focused clarifying question",
            "clarify",
            "prose",
        ),
        Unsupported => (
            s(&["limitations"]),
            s(&[]),
            "none",
            s(&[]),
            0,
            "n/a",
            "must decline honestly (out of scope or refused), no fabrication",
            "refuse",
            "prose",
        ),
    };

    // Mixed requests (the plan flagged multiple parts) always add every extra requested section on top.
    let mut mandatory_sections = mandatory;
    if plan
        .secondary_operations
        .iter()
        .any(|x| x == "mixed_request")
    {
        for sec in &plan.section_order {
            if sec != "limitations" && !mandatory_sections.iter().any(|m| m == sec) {
                mandatory_sections.push(sec.clone());
            }
        }
    }

    let citation_required = plan.citation_requirements == "mandatory";
    let min_cov = plan.minimum_source_coverage.max(min_cov);
    let checksum = fnv1a(&[
        &format!("v{OBLIGATIONS_VERSION}"),
        task.as_str(),
        &subject,
        &mandatory_sections.join(","),
        evidence,
        illus,
        shape,
        &format!("mc{min_cov}"),
    ]);

    AnswerObligationSet {
        schema_version: OBLIGATIONS_VERSION,
        requested_task: task.as_str().to_string(),
        subject,
        mandatory_sections,
        forbidden_substitutions: forbidden,
        required_evidence: evidence.to_string(),
        preferred_source_roles: roles,
        minimum_source_coverage: min_cov,
        citation_required: citation_required && !matches!(task, Clarification | Unsupported),
        illustrative_policy: illus.to_string(),
        completion_rule: rule.to_string(),
        failure_behaviour: fail.to_string(),
        output_shape: shape.to_string(),
        checksum,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task(q: &str, seed: &str) -> RequestedTask {
        let p = plan_answer(q, seed);
        resolve_task(q, &p)
    }

    #[test]
    fn the_six_zero_tolerance_cases_classify_by_task() {
        assert_eq!(
            task("me da um exemplo de operador", ""),
            RequestedTask::Example
        );
        assert_eq!(
            task("como federar um operador?", ""),
            RequestedTask::Procedure
        );
        assert_eq!(
            task("me da um exemplo de federacao", ""),
            RequestedTask::Example
        );
        // a bare document reference is a lookup; an explicit "explica" is an explanation
        assert_eq!(task("ADR 005", "ADR-001"), RequestedTask::DocumentLookup);
        assert_eq!(
            task("me explica o ADR 005", "ADR-001"),
            RequestedTask::Explanation
        );
        // "exemplo de um manifest" (no structural cue) is an EXAMPLE task; the structure is still served
        // by the Example→template fallback in tasked.rs. A bare subject noun no longer forces Template —
        // only a structural cue ("estrutura de", "campos de", "em json") does.
        assert_eq!(
            task("me da exemplo de um manifest valido", ""),
            RequestedTask::Example
        );
        // A structural CUE makes it a Template task.
        assert_eq!(
            task("mostra a estrutura de um manifest", ""),
            RequestedTask::Template
        );
        // A narrative verb on a template-noun subject is NOT hijacked to Template.
        assert_eq!(task("explica o manifest", ""), RequestedTask::Explanation);
    }

    #[test]
    fn definition_and_explanation_are_distinct() {
        assert_eq!(task("o que e o BANZA?", "BANZA"), RequestedTask::Definition);
        assert_eq!(
            task("me fala sobre o banza", "BANZA"),
            RequestedTask::Explanation
        );
    }

    #[test]
    fn context_use_is_classified_and_never_changes_the_explicit_task() {
        // no context ⇒ None
        assert_eq!(
            classify_context_use("o que e um operador?", "o que e um operador?", false),
            ContextUse::None
        );
        // anaphoric follow-up asking for an EXAMPLE on the context subject ⇒ FollowUpTask
        assert_eq!(
            classify_context_use("e um exemplo?", "e um exemplo? o que e um operador", true),
            ContextUse::FollowUpTask
        );
        // pure output refinement ⇒ OutputRefinement
        assert_eq!(
            classify_context_use("e em json?", "e em json? o manifest", true),
            ContextUse::OutputRefinement
        );
        // comparison against a context subject ⇒ ComparisonTarget
        assert_eq!(
            classify_context_use(
                "compara com a federacao",
                "compara com a federacao a confianca",
                true
            ),
            ContextUse::ComparisonTarget
        );
        // The KEY invariant: the current turn's explicit task wins even when a prior turn injected another
        // verb. "explica" (Explanation) must never become Example because context carried "exemplo".
        let raw = "me explica o modelo de confianca";
        let hijacked = "me da um exemplo. me explica o modelo de confianca";
        let tq = task_from_current_turn(raw, hijacked, true);
        assert_eq!(tq, raw);
        assert_eq!(task(tq, ""), RequestedTask::Explanation);
        // and without context the resolved query is used verbatim
        assert_eq!(task_from_current_turn(raw, raw, false), raw);
    }

    #[test]
    fn example_never_collapses_to_definition_obligation() {
        let o = obligations_for("me da um exemplo de federacao", "");
        assert_eq!(o.requested_task, "example");
        assert!(o.mandatory_sections.iter().any(|s| s == "example"));
        assert!(o
            .forbidden_substitutions
            .iter()
            .any(|f| f.contains("definition_instead_of_example")));
        assert_eq!(o.output_shape, "scenario");
    }

    #[test]
    fn procedure_requires_steps_or_transparent_partial() {
        let o = obligations_for("como federar um operador?", "");
        assert_eq!(o.requested_task, "procedure");
        assert!(o.mandatory_sections.iter().any(|s| s == "procedure"));
        assert!(o.completion_rule.contains("ordered steps"));
        assert_eq!(o.failure_behaviour, "transparent_partial");
        assert!(o
            .preferred_source_roles
            .iter()
            .any(|r| r == "procedure" || r == "implementation"));
    }

    #[test]
    fn manifest_example_is_structural_not_architecture() {
        // A structural CUE ("estrutura de") makes a manifest request a Template with structure obligations.
        let o = obligations_for("mostra a estrutura de um manifest valido", "");
        assert_eq!(o.requested_task, "template");
        assert_eq!(o.output_shape, "structure");
        assert_eq!(o.illustrative_policy, "structural_from_schema");
        assert!(o
            .forbidden_substitutions
            .iter()
            .any(|f| f.contains("architecture_dump")));
    }

    #[test]
    fn obligations_are_deterministic() {
        let a = obligations_for("como federar um operador?", "");
        let b = obligations_for("como federar um operador?", "");
        assert_eq!(a.checksum, b.checksum);
    }

    #[test]
    fn task_classification_is_invariant_under_case_accent_courtesy() {
        // Metamorphic: the resolved task for each zero-tolerance case is stable under meaning-preserving
        // surface transforms (case, accent stripping, a courtesy prefix, a trailing "?").
        let cases = [
            ("me da um exemplo de operador", "", RequestedTask::Example),
            ("como federar um operador", "", RequestedTask::Procedure),
            (
                "mostra a estrutura de um manifest valido",
                "",
                RequestedTask::Template,
            ),
        ];
        for (q, seed, want) in cases {
            for variant in [
                q.to_string(),
                q.to_uppercase(),
                format!("por favor, {q}"),
                format!("{q}?"),
                q.replace('a', "á"), // an accent the normalizer folds back
            ] {
                let p = plan_answer(&variant, seed);
                assert_eq!(
                    resolve_task(&variant, &p),
                    want,
                    "task changed under transform {variant:?}"
                );
            }
        }
    }
}
