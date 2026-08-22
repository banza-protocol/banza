//! Increment 2 — the complete typed operational-intent taxonomy + the contextual fallback (§2/§3/§4).
//!
//! This is the deterministic classifier that produces a RICH [`QueryResolution`] for any question, and the
//! engine-decided [`ContextualFallback`] that REPLACES the fixed topic list for understood-but-unmapped,
//! NON-boundary questions. It does not FORK the existing understanding stack — it composes it: boundary
//! ([`crate::boundary`]) is consulted FIRST and its verdict is never overridden; operational classification
//! reuses [`crate::operational`]; entity/artifact/scope reuse the BZC-1 [`crate::artifact`] resolver;
//! explanatory intents reuse [`crate::resolve`] and the canonical markers in [`crate::intent`]. The fine
//! operational/protocol intents added here (execution, reason-code, diagnose, compare/reproduce executions,
//! requirement, applicability, governance-decision, api-guidance, security-explanation, version-change,
//! evaluate-hypothesis, procedure, artifact) are classified from intent+entity+scope+metric+operation+time+
//! comparison+evidence SIGNALS — never a table of exact question strings.
//!
//! Pure + total + deterministic: no model, no I/O, no state. The same normalized question yields the same
//! resolution and the same fallback shape.
//!
//! Golden rule honoured here: a boundary/safety/financial/secret question classifies as `boundary_request`
//! and is NEVER reclassified into any operational/protocol intent, so the taxonomy can only change routing
//! for NON-boundary, understood-but-unmapped questions.

use crate::artifact;
use crate::intent::{
    any_hit, COMPARE_MARKERS, DURATION_MARKERS, LIVE_STATE_MARKERS, METRIC_MARKERS,
    VALIDATION_JOURNEY_MARKERS,
};
use serde::{Deserialize, Serialize};

// ── fine-intent classification vocabulary (accent-free, whole-substring, rare in unrelated prose) ────

/// "reproduce / re-run this execution" family.
const REPRODUCE_MARKERS: &[&str] = &[
    "reproduz",
    "reproduzir",
    "reproduza",
    "reproduce",
    "reproducao",
    "reexecuta",
    "re-executa",
    "voltar a executar",
    "repetir a execucao",
    "repetir a jornada",
    "correr de novo",
    "executar de novo",
    "run again",
    "re-run",
    "rerun",
];
/// "why did it fail / get blocked" — a diagnosis of a failed/blocked execution.
const DIAGNOSE_MARKERS: &[&str] = &[
    "porque falhou",
    "por que falhou",
    "porque bloqueou",
    "por que bloqueou",
    "porque ficou bloqueada",
    "por que ficou bloqueada",
    "porque ficou bloqueado",
    "ficou bloqueada",
    "ficou bloqueado",
    "esta bloqueada",
    "esta bloqueado",
    "o que correu mal",
    "o que falhou",
    "diagnostica",
    "diagnosticar",
    "diagnostico",
    "why did it fail",
    "why failed",
    "why blocked",
    "what went wrong",
    "root cause",
    "causa da falha",
];
/// reason-code family (the closed [`crate::reason`] set — WHY an answer took its class).
const REASON_CODE_MARKERS: &[&str] = &[
    "reason code",
    "reason_code",
    "codigo de razao",
    "codigo de motivo",
    "codigo da razao",
    "que reason",
    "qual reason",
    "qual o codigo",
    "que codigo",
    "codigo de decisao",
];
/// "show / list an execution (a journey run record)".
const EXECUTION_MARKERS: &[&str] = &[
    "execucao",
    "execucoes",
    "ultima execucao",
    "ultima jornada",
    "a jornada",
    "esta execucao",
    "essa execucao",
    "execution",
    "the run",
    "last run",
    "journey run",
    "exec-",
];
/// verbs that request a record be SHOWN/LISTED (distinguish get_execution from get_live_state).
const SHOW_MARKERS: &[&str] = &[
    "mostra",
    "mostre",
    "mostrar",
    "lista",
    "listar",
    "ver ",
    "ver a",
    "ver o",
    "detalhes",
    "detalhe",
    "show",
    "list",
    "display",
    "quais foram",
    "quais as",
];
/// requirement family ("what is required / needed").
const REQUIREMENT_MARKERS: &[&str] = &[
    "requisito",
    "requisitos",
    "o que e necessario",
    "o que e preciso",
    "o que preciso",
    "o que exige",
    "o que e exigido",
    "que requisitos",
    "quais requisitos",
    "quais os requisitos",
    "requirement",
    "requirements",
    "what is required",
    "what do i need",
    "prerequisito",
    "pre-requisito",
    "pre requisito",
];
/// applicability family ("does X apply to / applicable to this profile").
const APPLICABILITY_MARKERS: &[&str] = &[
    "aplica-se",
    "aplica se",
    "aplicavel",
    "aplicabilidade",
    "e aplicavel",
    "vale para",
    "aplica a",
    "aplica ao",
    "aplica aos",
    "em que perfis",
    "applies to",
    "applicable",
    "is applicable",
    "does it apply",
];
/// governance-decision family ("which ADR/RFC/decision defines / governs this").
const GOVERNANCE_DECISION_MARKERS: &[&str] = &[
    "qual adr",
    "que adr",
    "qual a adr",
    "qual e a adr",
    "qual rfc",
    "que rfc",
    "qual a rfc",
    "qual decisao",
    "que decisao",
    "qual a decisao",
    "que decisao define",
    "que documento define",
    "qual documento define",
    "que decisao governa",
    "define esta regra",
    "define essa regra",
    "which adr",
    "which rfc",
    "which decision",
    "what adr",
];
/// api-guidance family ("how to call an endpoint / the API / a webhook").
const API_GUIDANCE_MARKERS: &[&str] = &[
    "endpoint",
    "endpoints",
    "api ",
    " api",
    "webhook",
    "webhooks",
    "openapi",
    "como chamar",
    "como invocar",
    "que endpoint",
    "qual endpoint",
    "qual o endpoint",
    "rota da api",
    "chamada a api",
    "payload",
    "how to call",
    "call the api",
    "request body",
];
/// security-explanation family (EXPLAIN the security model — not a prohibited action; boundary runs first).
const SECURITY_EXPLANATION_MARKERS: &[&str] = &[
    "seguranca",
    "security",
    "ssrf",
    "injecao",
    "injection",
    "hardening",
    "vulnerabilidade",
    "vulnerabilidades",
    "ataque",
    "ataques",
    "como se protege",
    "como protege",
    "modelo de seguranca",
    "threat model",
    "superficie de ataque",
];
/// version-change family ("since which version / what changed in version X").
const VERSION_CHANGE_MARKERS: &[&str] = &[
    "desde que versao",
    "desde a versao",
    "em que versao",
    "que versao",
    "qual versao",
    "a partir de que versao",
    "mudou na versao",
    "o que mudou",
    "changelog",
    "since version",
    "which version",
    "what changed",
    "version change",
    "was introduced in",
    "introduzido na versao",
];
/// evaluate-hypothesis family ("is it true that / would it be valid if / suppose that").
const HYPOTHESIS_MARKERS: &[&str] = &[
    "e verdade que",
    "sera verdade que",
    "seria valido",
    "e valido dizer",
    "e correto dizer",
    "e correcto dizer",
    "faz sentido dizer",
    "e possivel que",
    "supondo que",
    "assumindo que",
    "e se ",
    "se eu ",
    "hipotese",
    "hipotetico",
    "is it true that",
    "would it be valid",
    "does it make sense to say",
    "suppose that",
];
/// procedure family ("how to do X" — a step-by-step operational how-to).
const PROCEDURE_MARKERS: &[&str] = &[
    "como federar",
    "como implementar",
    "como configurar",
    "como onboarding",
    "como fazer o onboarding",
    "como registar",
    "como submeter",
    "como faco para",
    "como posso fazer",
    "passos para",
    "passo a passo",
    "procedimento",
    "procedimento para",
    "how to federate",
    "how to implement",
    "how to onboard",
    "steps to",
    "step by step",
];
/// Past-tense / completed duration phrasings ("quanto demorou", "durou", "levou") — the operational
/// [`DURATION_MARKERS`] are present-tense; a clause about a COMPLETED run uses the past tense.
const DURATION_PAST_MARKERS: &[&str] = &[
    "demorou",
    "demoraram",
    "durou",
    "duraram",
    "levou",
    "levaram",
    "quanto demorou",
    "quanto durou",
    "quanto levou",
    "took",
];
/// artifact-request family (a named protocol/implementation artifact). Kept minimal — the authoritative
/// artifact classification is [`crate::artifact::resolve_scope`]; these catch a bare artifact ask.
const ARTIFACT_MARKERS: &[&str] = &[
    "manifesto",
    "manifest",
    "evidence bundle",
    "pacote de evidencia",
    "manifesto de chaves",
    "key manifest",
    "lista de revogacao",
    "revocation list",
    "metadata assinada",
    "discovery",
];

/// Connectors that separate the clauses of a COMPOUND question (§4). Accent-free (matched on normalized
/// text). Order matters only in that longer connectors are tried first when splitting.
const CLAUSE_CONNECTORS: &[&str] = &[
    " e tambem ",
    " e depois ",
    " e ainda ",
    " e qual ",
    " e quais ",
    " e quanto ",
    " e quando ",
    " e porque ",
    " e por que ",
    " e como ",
    " e explique ",
    " e explica ",
    " e desde ",
    " e a partir ",
    " and then ",
    " and also ",
    " and explain ",
    " and which ",
    " and since ",
    "; ",
    " e ",
    " and ",
];

// ── the rich resolution object (§3) ─────────────────────────────────────────────────────────────────

/// The complete typed classification of a question. Serialized to the JS layer as public-safe metadata;
/// the model never produces or edits it. Populated deterministically by [`resolve_query`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QueryResolution {
    pub schema_version: u32,
    pub original_query: String,
    pub normalized_query: String,
    /// One canonical intent from [`crate::intent::PRIMARY_INTENTS`].
    pub primary_intent: String,
    /// Every distinct intent detected across the question's clauses (§4). Includes `primary_intent`.
    /// Empty for a single-intent question; length ≥ 2 for a compound one (never silently drops a clause).
    pub sub_intents: Vec<String>,
    /// Canonical ids/sources the question targets (explicit ADR/RFC refs, an ecosystem entity, a concept).
    pub entities: Vec<String>,
    /// A human, short subject label for the answer (concept/entity/journey), "" when none.
    pub subject: String,
    /// The requested artifact class (from [`crate::artifact::resolve_scope`]); "none" when none.
    pub artifact_type: String,
    /// elapsed_time | per_step | slowest_step | "" — the operational measure requested.
    pub metric_type: String,
    /// "" (summary) | latest | average | median | p95 | comparison — the aggregation requested.
    pub aggregation: String,
    /// "" | latest | historical — the time framing.
    pub time_scope: String,
    /// The comparison operands the question names (latest/previous/penultimate or explicit exec ids).
    pub comparison_targets: Vec<String>,
    /// "" | validation_journey | validation_step — the operational execution scope.
    pub execution_scope: String,
    /// A conformance profile the question scopes to (L0/L1/L2/L3), or "".
    pub profile: String,
    /// An environment the question scopes to (sandbox/staging/production), or "".
    pub environment: String,
    /// A protocol version the question scopes to (e.g. "1.0.0"), or "".
    pub protocol_version: String,
    /// The answer needs LIVE data (telemetry / a live artifact) rather than a static document.
    pub requires_live_data: bool,
    /// The answer needs a CALCULATION over data (an aggregation/metric), not a single lookup.
    pub requires_calculation: bool,
    /// The answer needs canonical DOCUMENTATION (an explanation/requirement/governance decision).
    pub requires_documentation: bool,
    /// The answer needs FORMAL EVIDENCE (an evidence bundle / a reproducible execution).
    pub requires_formal_evidence: bool,
    /// Named ambiguities the classifier could not settle deterministically (empty when confident).
    ///
    /// MIXED NAMESPACE, deliberately preserved for the existing prose path: machine-named semantic ids
    /// (`aggregation_unspecified`) sit beside the recovery layer's Portuguese spellings (`operador`).
    /// Do not treat this as a semantic-identifier collection — `ambiguity_candidates` is the typed one.
    pub ambiguities: Vec<String>,
    /// The same ambiguities as a typed, source-bound contract, built where each one is detected.
    pub ambiguity_candidates: Vec<AmbiguityCandidate>,
    /// 0.0..=1.0 — deterministic confidence in `primary_intent`.
    pub confidence: f32,
    /// RESOLVED | AMBIGUOUS | BOUNDARY | UNSUPPORTED — explicit, never silent.
    pub resolution_state: String,
    /// The verdict of [`crate::boundary`] — a boundary question is never reclassified.
    pub boundary_detected: bool,
}

fn detect_profile(nq: &str) -> String {
    for p in ["l0", "l1", "l2", "l3", "l4"] {
        // whole-token match against the level tokens
        if nq.split(' ').any(|t| t == p) {
            return p.to_uppercase();
        }
    }
    String::new()
}

fn detect_environment(nq: &str) -> String {
    if nq.contains("sandbox") {
        "sandbox".into()
    } else if nq.contains("staging") {
        "staging".into()
    } else if nq.contains("producao") || nq.contains("production") || nq.contains("prod ") {
        "production".into()
    } else {
        String::new()
    }
}

/// Detect a semver-ish protocol version token ("1.0.0", "v1.2", "versao 2.0"). Deterministic + narrow.
fn detect_protocol_version(nq: &str) -> String {
    for tok in nq.split(|c: char| !(c.is_ascii_digit() || c == '.')) {
        let dots = tok.matches('.').count();
        if dots >= 1 && tok.chars().next().is_some_and(|c| c.is_ascii_digit()) {
            // strip a trailing dot
            let t = tok.trim_end_matches('.');
            if t.split('.')
                .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
            {
                return t.to_string();
            }
        }
    }
    String::new()
}

fn detect_comparison_targets(nq: &str) -> Vec<String> {
    let mut t: Vec<String> = Vec::new();
    if nq.contains("ultima") || nq.contains("latest") || nq.contains("last") {
        t.push("latest".into());
    }
    if nq.contains("anterior") || nq.contains("previous") {
        t.push("previous".into());
    }
    if nq.contains("penultima") || nq.contains("penultimate") {
        t.push("penultimate".into());
    }
    // explicit execution ids (exec-… tokens)
    for tok in nq.split(' ') {
        if tok.starts_with("exec-") && tok.len() > 5 && !t.contains(&tok.to_string()) {
            t.push(tok.to_string());
        }
    }
    t
}

/// Classify a single CLAUSE into one fine intent (most-specific-first). `scope` is the whole-question
/// entity/artifact decision (an artifact is a whole-question signal). No model.
fn classify_clause(nq: &str, scope: &artifact::ScopeDecision) -> &'static str {
    let has_journey = any_hit(nq, VALIDATION_JOURNEY_MARKERS);
    let has_execution = any_hit(nq, EXECUTION_MARKERS);
    let has_show = any_hit(nq, SHOW_MARKERS);
    let has_compare = any_hit(nq, COMPARE_MARKERS);

    // reproduce > diagnose > reason-code — the most specific execution operations.
    if any_hit(nq, REPRODUCE_MARKERS) {
        return "reproduce_execution";
    }
    if any_hit(nq, DIAGNOSE_MARKERS) {
        return "diagnose_failure";
    }
    if any_hit(nq, REASON_CODE_MARKERS) {
        return "get_reason_code";
    }
    // compare executions (a contrast marker scoped to executions/journeys).
    if has_compare && (has_execution || has_journey) {
        return "compare_executions";
    }
    // a slowest/per-step/statistical measurement is a metric.
    if any_hit(nq, METRIC_MARKERS) {
        return "get_metric";
    }
    // a duration ask (present or past tense).
    if any_hit(nq, DURATION_MARKERS) || any_hit(nq, DURATION_PAST_MARKERS) {
        return "get_duration";
    }
    // "show the (last) execution" — a record request (a SHOW verb over an execution/journey subject).
    if has_execution && (has_show || nq.contains("ultima")) {
        return "get_execution";
    }
    // bare live-state.
    if any_hit(nq, LIVE_STATE_MARKERS) {
        return "get_live_state";
    }
    if any_hit(nq, VERSION_CHANGE_MARKERS) {
        return "get_version_change";
    }
    // requirement before applicability — "que requisitos preciso para o perfil L2" is a requirement even
    // though it names a profile.
    if any_hit(nq, REQUIREMENT_MARKERS) {
        return "get_requirement";
    }
    if any_hit(nq, APPLICABILITY_MARKERS) {
        return "get_applicability";
    }
    if any_hit(nq, GOVERNANCE_DECISION_MARKERS) {
        return "get_governance_decision";
    }
    if any_hit(nq, API_GUIDANCE_MARKERS) {
        return "get_api_guidance";
    }
    if any_hit(nq, HYPOTHESIS_MARKERS) {
        return "evaluate_hypothesis";
    }
    if any_hit(nq, PROCEDURE_MARKERS) {
        return "explain_procedure";
    }
    if any_hit(nq, SECURITY_EXPLANATION_MARKERS) {
        return "get_security_explanation";
    }
    // an artifact request (authoritative scope, or a bare artifact marker).
    if scope.artifact_type != "none" || any_hit(nq, ARTIFACT_MARKERS) {
        return "get_artifact";
    }
    // fall through: the explanatory classifier owns the rest (concept/document/impact/governance/compare/
    // locate/summarize). Empty seed → deterministic.
    ""
}

/// Split a normalized question into clauses on the compound connectors (§4). Always returns ≥ 1 clause.
fn split_clauses(nq: &str) -> Vec<String> {
    // Try each connector; split on the FIRST that appears, then recurse on the tail. Deterministic.
    for c in CLAUSE_CONNECTORS {
        if let Some(idx) = nq.find(c) {
            let head = nq[..idx].trim().to_string();
            let tail = nq[idx + c.len()..].trim().to_string();
            let mut out = Vec::new();
            if !head.is_empty() {
                out.push(head);
            }
            for t in split_clauses(&tail) {
                if !t.is_empty() {
                    out.push(t);
                }
            }
            if out.len() >= 2 {
                return out;
            }
        }
    }
    vec![nq.trim().to_string()]
}

/// Deterministically resolve a question into a rich [`QueryResolution`]. Boundary FIRST (never overridden);
/// then operational + entity/artifact + explanatory composition + compound sub-intents. No model, no I/O.
pub fn resolve_query(question: &str) -> QueryResolution {
    let original = question.to_string();
    let nq = crate::normalize(question);

    // 1) BOUNDARY — consulted first and never overridden. A safety/financial/secret/injection question is
    // `boundary_request` and is never reclassified into any operational/protocol intent. The boundary signal
    // is the SAME one the pipeline's Tier-0 refusal uses (`route(...).action == "refusal"`, i.e. the
    // action-boundary / safety-refusal / injection detectors) plus the [`crate::boundary`] evaluator — so
    // the taxonomy can never soften a refusal (golden rule).
    let boundary = crate::boundary::evaluate(question);
    let rd = crate::route::route(question);
    let route_refusal = rd.action == "refusal"
        || rd.intent == "action_boundary"
        || rd
            .entry_id
            .as_deref()
            .is_some_and(|e| e.starts_with("refuse-"));
    if boundary.boundary_detected || route_refusal {
        return QueryResolution {
            schema_version: 1,
            original_query: original,
            normalized_query: nq,
            primary_intent: "boundary_request".into(),
            sub_intents: Vec::new(),
            entities: Vec::new(),
            subject: String::new(),
            artifact_type: "none".into(),
            metric_type: String::new(),
            aggregation: String::new(),
            time_scope: String::new(),
            comparison_targets: Vec::new(),
            execution_scope: String::new(),
            profile: String::new(),
            environment: String::new(),
            protocol_version: String::new(),
            requires_live_data: false,
            requires_calculation: false,
            requires_documentation: false,
            requires_formal_evidence: false,
            ambiguities: Vec::new(),
            ambiguity_candidates: Vec::new(),
            confidence: 1.0,
            resolution_state: "BOUNDARY".into(),
            boundary_detected: true,
        };
    }

    // 2) reuse the existing understanding stack.
    let op = crate::operational::resolve_operational_metric(question);
    let scope = artifact::resolve_scope(question);
    let ri = crate::resolve::resolve_intent(question, "");

    // 3) per-clause classification (§4 compound support).
    let clauses = split_clauses(&nq);
    let mut clause_intents: Vec<String> = Vec::new();
    for cl in &clauses {
        let fine = classify_clause(cl, &scope);
        let intent = if fine.is_empty() {
            // explanatory fallback for this clause
            ri.primary_intent.clone()
        } else {
            fine.to_string()
        };
        if !clause_intents.contains(&intent) {
            clause_intents.push(intent);
        }
    }

    // 4) primary + sub-intents.
    // The fine whole-question classifier is authoritative when it fires — it recognises the fine protocol
    // intents (get_execution, diagnose_failure, …) that the operational classifier collapses into
    // get_live_state. For a pure duration/metric/live question the two agree, so operational parity holds.
    let whole_fine = classify_clause(&nq, &scope);
    let mut primary_intent = if !whole_fine.is_empty() {
        whole_fine.to_string()
    } else if op.is_operational {
        op.intent.clone()
    } else {
        clause_intents
            .first()
            .cloned()
            .unwrap_or_else(|| ri.primary_intent.clone())
    };
    // Ensure the primary is in the clause list (it always represents the first clause's meaning).
    if !clause_intents.contains(&primary_intent) {
        clause_intents.insert(0, primary_intent.clone());
    }
    let sub_intents = if clause_intents.len() >= 2 {
        clause_intents.clone()
    } else {
        Vec::new()
    };

    // 5) entities + subject.
    let mut entities: Vec<String> = ri.explicit_refs.clone();
    if !scope.entity_id.is_empty() && !entities.contains(&scope.entity_id) {
        entities.push(scope.entity_id.clone());
    }
    if !ri.concept_source.is_empty() && !entities.contains(&ri.concept_source) {
        entities.push(ri.concept_source.clone());
    }
    let subject = if !scope.entity_display.is_empty() {
        scope.entity_display.clone()
    } else if !ri.concept_source.is_empty() {
        ri.concept_source.clone()
    } else if op.is_operational {
        "jornada de validação".into()
    } else {
        String::new()
    };

    // 6) operational descriptors.
    let metric_type = op.metric.clone();
    let aggregation = op.aggregation.clone();
    let execution_scope = op.subject.clone();
    let comparison_targets = detect_comparison_targets(&nq);
    let time_scope = if nq.contains("ultima") || any_hit(&nq, LIVE_STATE_MARKERS) {
        "latest".into()
    } else if nq.contains("historico")
        || nq.contains("todas as execucoes")
        || nq.contains("ao longo do tempo")
    {
        "historical".into()
    } else {
        String::new()
    };

    // 7) requirement flags (what CLASS of authority a fulfilling answer needs).
    let live_intents = [
        "get_duration",
        "get_metric",
        "get_live_state",
        "get_execution",
        "compare_executions",
        "diagnose_failure",
        "reproduce_execution",
        "get_reason_code",
    ];
    let requires_live_data = op.requires_live_data
        || scope.requires_live_tool
        || live_intents.contains(&primary_intent.as_str());
    let requires_calculation = primary_intent == "get_metric"
        || primary_intent == "compare_executions"
        || (!aggregation.is_empty() && aggregation != "latest");
    let doc_intents = [
        "explain_concept",
        "explain_document",
        "explain_architecture",
        "explain_impact",
        "explain_governance",
        "explain_procedure",
        "summarize_document",
        "locate_rule",
        "get_requirement",
        "get_applicability",
        "get_governance_decision",
        "get_version_change",
        "get_api_guidance",
        "get_security_explanation",
        "compare_documents",
        "evaluate_hypothesis",
    ];
    let requires_documentation = doc_intents.contains(&primary_intent.as_str());
    let requires_formal_evidence = scope.artifact_type == "evidence_bundle"
        || primary_intent == "reproduce_execution"
        || nq.contains("evidencia formal")
        || nq.contains("prova formal");

    // 8) grounding signal + off-topic (UNSUPPORTED) detection.
    let has_marker_signal = !whole_fine.is_empty();
    // A term BANZA itself defines is grounding. Without this, "o que é o BCJ/1?" resolved to
    // UNSUPPORTED and was refused as an out-of-scope OPERATION — the canonical byte form of the
    // protocol, unanswerable by the protocol's own interface, because retrieval happened not to
    // surface it and no other signal fired.
    //
    // This distinguishes a DEFINITION from an OPERATION at the right level rather than by weakening
    // the boundary: asking what BCJ/1 is reaches the glossary; asking BanzAI to canonicalize a payload
    // as an authoritative decision, to certify an artifact or to determine conformance does not — those
    // resolve to no glossary term and remain refused, as they must.
    let names_a_defined_term = crate::glossary::glossary_entry(&nq).is_some();
    let has_grounding = has_marker_signal
        || op.is_operational
        || scope.requires_live_tool
        || !scope.entity_id.is_empty()
        || !ri.concept_source.is_empty()
        || !ri.explicit_refs.is_empty()
        || names_a_defined_term
        || !crate::retrieve_topk_ids(question, 1).is_empty();

    // 9) ambiguity (§2 — a single concrete clarifying question is the right outcome).
    let mut ambiguities: Vec<String> = Vec::new();
    // Candidates are built HERE, beside each push, not re-derived from the flattened list afterwards.
    // `ambiguities` mixes two namespaces — machine-named semantic ids and the recovery layer's Portuguese
    // spellings — and once flattened, the only way to tell them apart is the punctuation heuristic the
    // prose path uses (`!contains('_')`). Deriving the typed contract from that would promote a naming
    // accident into a wire contract. Provenance is free at the point of production, so it is taken here.
    let mut candidates: Vec<AmbiguityCandidate> = Vec::new();
    if ri.requires_clarification {
        for c in &ri.clarification_candidates {
            ambiguities.push(c.clone());
            push_candidate(
                &mut candidates,
                AmbiguityCandidate::TermSpelling { term: c.clone() },
            );
        }
    }
    if primary_intent == "compare_executions" && comparison_targets.len() < 2 {
        ambiguities.push("comparison_targets_unspecified".into());
        for c in ambiguity_expansion("comparison_targets_unspecified") {
            push_candidate(&mut candidates, c);
        }
    }
    // an operational duration/metric ask with no explicit aggregation nor time framing is genuinely
    // ambiguous between the latest observation, the median and the timeout limit.
    let op_ambiguous = op.is_operational
        && aggregation.is_empty()
        && time_scope.is_empty()
        && metric_type != "slowest_step";
    if op_ambiguous {
        ambiguities.push("aggregation_unspecified".into());
        for c in ambiguity_expansion("aggregation_unspecified") {
            push_candidate(&mut candidates, c);
        }
    }

    // 10) resolution state + confidence.
    let (resolution_state, confidence) = if !has_grounding {
        primary_intent = "unsupported".into();
        ("UNSUPPORTED".to_string(), 0.30_f32)
    } else if !ambiguities.is_empty() && ri.requires_clarification {
        // Only a fuzzy/entity ambiguity flips the PRIMARY to clarification_required; an operational
        // aggregation ambiguity is answered by the telemetry tier (a note, not a reclassification).
        primary_intent = "clarification_required".into();
        ("AMBIGUOUS".to_string(), 0.40_f32)
    } else {
        let conf = if op.is_operational || scope.requires_live_tool || !ri.explicit_refs.is_empty()
        {
            0.90
        } else if has_marker_signal || !ri.concept_source.is_empty() {
            0.80
        } else {
            0.60
        };
        ("RESOLVED".to_string(), conf)
    };

    QueryResolution {
        schema_version: 1,
        original_query: original,
        normalized_query: nq,
        primary_intent,
        sub_intents,
        entities,
        subject,
        artifact_type: scope.artifact_type.clone(),
        metric_type,
        aggregation,
        time_scope,
        comparison_targets,
        execution_scope,
        profile: detect_profile(&crate::normalize(question)),
        environment: detect_environment(&crate::normalize(question)),
        protocol_version: detect_protocol_version(&crate::normalize(question)),
        requires_live_data,
        requires_calculation,
        requires_documentation,
        requires_formal_evidence,
        ambiguities,
        ambiguity_candidates: candidates,
        confidence,
        resolution_state,
        boundary_detected: false,
    }
}

// ── the contextual fallback (§2 — replaces the fixed topic list) ─────────────────────────────────────

/// The typed contextual fallback the pipeline serves for an understood-but-unmapped, NON-boundary question.
/// A semantic alternative the engine could not choose between, for a reader who must choose.
///
/// The ambiguity MESSAGE names these in Portuguese; this names them in no language at all. That split is
/// the point: the sentence is presentation and will move to the presentation layer, while the choice
/// itself is a decision the engine made and must survive serialization for any consumer to act on.
///
/// Deliberately NOT `Vec<String>` of reader fragments. The prose path builds exactly such a list (`opts`,
/// filtered to the entries a human can read) and it is unusable as a contract: it is Portuguese, and it
/// silently excludes every machine-named ambiguity.
///
/// TWO KINDS LIVE HERE, and conflating them was a real defect. A SEMANTIC ambiguity is a choice between
/// meanings the engine understood but could not rank (`LastExecution` vs the median). A TERM SPELLING is
/// something else entirely: the typo-recovery layer found one token equidistant from two vocabulary
/// words, and the "candidates" it produces are `fuzzy::recover`'s `display` spellings — Portuguese reader
/// vocabulary, e.g. `operador` / `operar`. An earlier version of this enum carried those through a generic
/// `Ambiguity(String)` documented as "a semantic id — never reader prose", which was measurably false:
/// `"o que e operadr?"` serialized `{"ambiguity":"operador"}` over the wire. A payload variant does not
/// become language-neutral by being described as such, so the spelling case now DECLARES what it carries.
///
/// The tag makes every variant serialize as an object. A `String | Object` union in one array is a
/// contract a consumer has to branch on before it can read anything, and the heterogeneity would have
/// been load-bearing for exactly the variant that was already wrong.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "candidate", rename_all = "snake_case")]
pub enum AmbiguityCandidate {
    /// The most recent validation execution.
    LastExecution,
    /// The median across comparable executions.
    ComparableExecutionsMedian,
    /// The limit configured by the timeouts, rather than an observed run.
    ConfiguredTimeoutLimit,
    /// The two most recent executions, as a pair.
    LastTwoExecutions,
    /// Executions the reader names explicitly by identifier.
    SpecificExecutionIds,
    /// A vocabulary spelling the recovery layer could not choose between. The payload IS Portuguese
    /// reader vocabulary — that is why the variant says so instead of posing as a semantic identifier.
    TermSpelling { term: String },
}

/// The declared expansion of a SEMANTIC ambiguity identifier into the choices a reader is offered.
///
/// Closed-world: only declared identifiers expand. An undeclared one yields NOTHING rather than wrapping
/// itself, because the wrapper variant no longer exists to hide it — an ambiguity that reaches serving
/// with no declared choices is a gap to close at the producer, not a value to pass through untyped.
pub fn ambiguity_expansion(id: &str) -> Vec<AmbiguityCandidate> {
    match id {
        "aggregation_unspecified" => vec![
            AmbiguityCandidate::LastExecution,
            AmbiguityCandidate::ComparableExecutionsMedian,
            AmbiguityCandidate::ConfiguredTimeoutLimit,
        ],
        "comparison_targets_unspecified" => vec![
            AmbiguityCandidate::LastTwoExecutions,
            AmbiguityCandidate::SpecificExecutionIds,
        ],
        _ => Vec::new(),
    }
}

/// Append `c` unless an equal candidate is already present, preserving detection order.
///
/// Order follows the resolution's ambiguity order and is deterministic, but it is DETECTION order, not
/// precedence: nothing here says the first candidate is likelier or preferred.
fn push_candidate(out: &mut Vec<AmbiguityCandidate>, c: AmbiguityCandidate) {
    if !out.contains(&c) {
        out.push(c);
    }
}

/// The `message` is engine-decided PT copy derived from the resolution — NEVER a generic topic list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContextualFallback {
    /// understood_data_missing | ambiguous | tool_unavailable | out_of_scope | insufficient_source.
    pub kind: String,
    /// The interpreted primary intent (public-safe label) the message names.
    pub interpreted_intent: String,
    /// The detected sub-intents (for a compound question; empty otherwise).
    pub sub_intents: Vec<String>,
    /// The engine-authored PT message.
    pub message: String,
    /// The semantic alternatives this decision offers the reader; empty when it offers none.
    ///
    /// Empty is meaningful: the four non-ambiguous branches state one condition and give no choice. A
    /// decision whose message names alternatives while this is empty is the defect the completeness
    /// property exists to catch.
    #[serde(default)]
    pub ambiguity_candidates: Vec<AmbiguityCandidate>,
}

/// A short PT phrase naming the interpreted intent, for the fallback prose.
fn intent_phrase(resolution: &QueryResolution) -> String {
    let subj = if resolution.subject.is_empty() {
        "".to_string()
    } else {
        format!(" sobre **{}**", resolution.subject)
    };
    let base = match resolution.primary_intent.as_str() {
        "get_duration" => "a duração de uma execução da jornada de validação".to_string(),
        "get_metric" => "uma métrica de desempenho da jornada de validação".to_string(),
        "get_live_state" => "o estado observado da última execução".to_string(),
        "get_execution" => "uma execução (jornada) específica".to_string(),
        "compare_executions" => "a comparação entre execuções da jornada".to_string(),
        "diagnose_failure" => {
            "o diagnóstico de uma execução que falhou ou ficou bloqueada".to_string()
        }
        "reproduce_execution" => "a reprodução de uma execução".to_string(),
        "get_reason_code" => "o código de razão de um resultado".to_string(),
        "get_artifact" => format!("um artefacto ({})", resolution.artifact_type),
        "get_requirement" => "os requisitos de um perfil ou operação".to_string(),
        "get_applicability" => "a aplicabilidade de uma regra a um perfil".to_string(),
        "get_governance_decision" => {
            "a decisão de governação (ADR/RFC) que define uma regra".to_string()
        }
        "get_api_guidance" => "a utilização de um endpoint/da API".to_string(),
        "get_security_explanation" => "o modelo de segurança".to_string(),
        "get_version_change" => "a versão em que algo mudou".to_string(),
        "evaluate_hypothesis" => "a avaliação de uma hipótese".to_string(),
        "explain_procedure" => "um procedimento (passo a passo)".to_string(),
        _ => "este pedido".to_string(),
    };
    format!("{base}{subj}")
}

/// A compound-note appended when the question carries a second, currently-unaddressed clause (§4).
fn compound_note(resolution: &QueryResolution) -> String {
    if resolution.sub_intents.len() < 2 {
        return String::new();
    }
    format!(
        "\n\nA tua pergunta tem mais do que uma parte (interpretei: {}). De momento consigo enquadrar a \
primeira; a(s) restante(s) ficam por responder até existir a fonte ou ferramenta necessária.",
        resolution.sub_intents.join(" + ")
    )
}

/// Decide the contextual fallback for a question. `situation` lets the PIPELINE report what physically
/// happened at the call site — "tool_unavailable" (a live tool/model could not run) or "insufficient_source"
/// (grounding was attempted and declined); "" lets the engine decide from the resolution alone. The
/// boundary/refusal path never calls this. The message is ALWAYS request-oriented and NEVER the topic list.
/// True when the WHOLE query is a referential fragment — a pro-form and nothing else.
///
/// This is the shape that has no subject to resolve and no subject to be out of scope: "E isso?",
/// "Isso?", "And that?". Anything with content after the pronoun ("Isso dá admissão automática?") is
/// not this, and keeps its existing handling.
fn is_bare_referential_fragment(nq: &str) -> bool {
    let toks: Vec<&str> = nq.split(' ').filter(|t| !t.is_empty()).collect();
    if toks.is_empty() || toks.len() > 3 {
        return false;
    }
    const PRO_FORMS: &[&str] = &[
        "isso", "isto", "esse", "essa", "aquilo", "that", "this", "it", "them", "these", "those",
    ];
    const FILLERS: &[&str] = &["e", "and", "o", "a", "so", "entao", "then", "ok"];
    let mut saw_pro = false;
    for t in &toks {
        if PRO_FORMS.contains(t) {
            saw_pro = true;
        } else if !FILLERS.contains(t) {
            return false;
        }
    }
    saw_pro
}

pub fn contextual_fallback(question: &str, situation: &str) -> ContextualFallback {
    let r = resolve_query(question);
    let phrase = intent_phrase(&r);
    let note = compound_note(&r);

    // Ambiguity (§2) — a single concrete clarifying question.
    if r.resolution_state == "AMBIGUOUS" || (situation.is_empty() && !r.ambiguities.is_empty()) {
        let msg = if r.ambiguities.iter().any(|a| a == "aggregation_unspecified") {
            "Interpretei o teu pedido como uma pergunta sobre uma medição da jornada de validação, mas \
falta um detalhe: refere-se à **última execução**, à **mediana das execuções comparáveis** ou ao \
**limite definido pelos timeouts**?"
                .to_string()
        } else if r
            .ambiguities
            .iter()
            .any(|a| a == "comparison_targets_unspecified")
        {
            "Interpretei o teu pedido como uma **comparação entre execuções**, mas não indicou quais: \
refere-se às **duas últimas execuções**, ou a execuções específicas (indique os identificadores)?"
                .to_string()
        } else if !r.ambiguities.is_empty() && r.ambiguities.iter().any(|a| a.len() > 2) {
            let opts: Vec<String> = r
                .ambiguities
                .iter()
                .filter(|a| a.len() > 2 && !a.contains('_'))
                .cloned()
                .collect();
            if opts.len() >= 2 {
                format!(
                    "Não tenho a certeza de qual pretende — refere-se a {} ou {}?",
                    opts[..opts.len() - 1].join(", "),
                    opts[opts.len() - 1]
                )
            } else {
                "Não consegui determinar com segurança o que pretende. Pode reformular indicando o \
identificador (ex.: ADR-001) ou o alvo concreto?"
                    .to_string()
            }
        } else {
            "Não consegui determinar com segurança o que pretende. Pode reformular indicando o alvo \
concreto (por exemplo, o identificador do documento ou da execução)?"
                .to_string()
        };
        return ContextualFallback {
            kind: "ambiguous".into(),
            interpreted_intent: r.primary_intent.clone(),
            sub_intents: r.sub_intents.clone(),
            message: format!("{msg}{note}"),
            ambiguity_candidates: r.ambiguity_candidates.clone(),
        };
    }

    // Tool unavailable (a live tool / the model could not run) — named at the call site.
    if situation == "tool_unavailable" {
        let msg = format!(
            "Interpretei o teu pedido como uma pergunta sobre **{phrase}**. Para responder preciso de \
consultar dados ao vivo (telemetria de execuções persistidas ou um artefacto publicado), mas **essa \
ferramenta não está disponível neste momento**, por isso não invento a resposta.{note}"
        );
        return ContextualFallback {
            kind: "tool_unavailable".into(),
            interpreted_intent: r.primary_intent.clone(),
            sub_intents: r.sub_intents.clone(),
            message: msg,
            ambiguity_candidates: Vec::new(),
        };
    }

    // A BARE REFERENTIAL FRAGMENT is not out of scope — it is unresolved, and saying otherwise is a
    // false statement about what BanzAI covers.
    //
    // "E isso?" with nothing bound reached the out-of-scope terminal and was told that BanzAI "answers
    // about the BANZA protocol and not about subjects outside that scope". The reader asked about no
    // subject at all; there was nothing to be outside anything. The declared capability for this is
    // `ambiguous_clarification`, which asks rather than declines, and it was unreachable because the
    // fragment carries no entity for the resolver to fail on.
    //
    // Deliberately narrow: the whole query must be a pro-form fragment. "Isso dá admissão automática?"
    // has real content after the pronoun and keeps the existing behaviour, which the certification
    // context tests pin.
    if is_bare_referential_fragment(&crate::normalize(question)) {
        return ContextualFallback {
            kind: "ambiguous".into(),
            interpreted_intent: "unresolved_reference".into(),
            sub_intents: r.sub_intents.clone(),
            message: format!(
                "Não percebi a que se refere. Indique o assunto concreto — o conceito, o documento ou a \
decisão — e respondo.{note}"
            ),
            ambiguity_candidates: Vec::new(),
        };
    }

    // Out of protocol scope (no BANZA entity/operation/source recognised at all).
    if r.resolution_state == "UNSUPPORTED" || r.primary_intent == "unsupported" {
        return ContextualFallback {
            kind: "out_of_scope".into(),
            interpreted_intent: "unsupported".into(),
            sub_intents: r.sub_intents.clone(),
            message: format!(
                "Não encontrei uma operação ou fonte pública do BANZA que suporte este pedido. O BanzAI \
responde sobre o protocolo BANZA — as suas regras, decisões, contratos e execuções de validação — e \
não sobre assuntos fora desse âmbito.{note}"
            ),
            ambiguity_candidates: Vec::new(),
        };
    }

    // Understood, but the specific DATA is missing — a live/operational intent with no comparable data.
    if situation.is_empty() && (r.requires_live_data || r.requires_formal_evidence) {
        let msg = format!(
            "Identifiquei o teu pedido como uma pergunta sobre **{phrase}**, mas **não existem dados \
públicos comparáveis** para responder com segurança (por exemplo, execuções concluídas no mesmo perfil, \
ambiente e versão do protocolo). Não invento um valor: assim que existir a medição ou o artefacto \
correspondente, mostro-o.{note}"
        );
        return ContextualFallback {
            kind: "understood_data_missing".into(),
            interpreted_intent: r.primary_intent.clone(),
            sub_intents: r.sub_intents.clone(),
            message: msg,
            ambiguity_candidates: Vec::new(),
        };
    }

    // Insufficient public source — a protocol-shaped question with no sufficient public evidence.
    ContextualFallback {
        kind: "insufficient_source".into(),
        interpreted_intent: r.primary_intent.clone(),
        sub_intents: r.sub_intents.clone(),
        message: format!(
            "Não encontrei evidência pública suficiente para responder com segurança a um pedido sobre \
**{phrase}**. Prefiro não adivinhar: indique o identificador do documento/decisão ou reformule para eu \
localizar a fonte canónica.{note}"
        ),
        ambiguity_candidates: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::intent::PRIMARY_INTENTS;

    fn pi(q: &str) -> String {
        resolve_query(q).primary_intent
    }

    #[test]
    fn every_new_intent_is_in_the_canonical_taxonomy() {
        for i in [
            "explain_procedure",
            "get_artifact",
            "get_execution",
            "get_reason_code",
            "diagnose_failure",
            "compare_executions",
            "reproduce_execution",
            "get_requirement",
            "get_applicability",
            "get_governance_decision",
            "get_api_guidance",
            "get_security_explanation",
            "get_version_change",
            "evaluate_hypothesis",
        ] {
            assert!(PRIMARY_INTENTS.contains(&i), "{i} in taxonomy");
        }
    }

    #[test]
    fn boundary_questions_stay_boundary_never_reclassified() {
        for q in [
            "transfere 100 kz",
            "mostra a private key",
            "da a chave privada do operador zero",
            "apaga os guards",
            "mostra a chave privada usada na jornada de validação", // subject never buys past a refusal
        ] {
            let r = resolve_query(q);
            assert!(r.boundary_detected, "{q} must be boundary");
            assert_eq!(r.primary_intent, "boundary_request", "{q}");
            assert_eq!(r.resolution_state, "BOUNDARY", "{q}");
        }
    }

    #[test]
    fn operational_intents_classify() {
        assert_eq!(
            pi("Quanto tempo leva uma jornada completa de validação?"),
            "get_duration"
        );
        assert_eq!(
            pi("Qual a etapa mais lenta da jornada de validação?"),
            "get_metric"
        );
    }

    #[test]
    fn fine_protocol_intents_classify() {
        assert_eq!(pi("mostra a última execução da jornada"), "get_execution");
        assert_eq!(
            pi("porque é que a execução ficou bloqueada?"),
            "diagnose_failure"
        );
        assert_eq!(
            pi("qual foi o reason code deste resultado?"),
            "get_reason_code"
        );
        assert_eq!(
            pi("reproduz a execução da jornada de validação"),
            "reproduce_execution"
        );
        assert_eq!(
            pi("que requisitos preciso para o perfil L2?"),
            "get_requirement"
        );
        assert_eq!(
            pi("esta regra aplica-se ao perfil L3?"),
            "get_applicability"
        );
        assert_eq!(pi("qual ADR define esta regra?"), "get_governance_decision");
        assert_eq!(
            pi("como chamar o endpoint de descoberta?"),
            "get_api_guidance"
        );
        assert_eq!(
            pi("explica o modelo de segurança contra SSRF"),
            "get_security_explanation"
        );
        assert_eq!(
            pi("desde que versão existe esta regra?"),
            "get_version_change"
        );
        assert_eq!(
            pi("é verdade que o BanzAI certifica operadores?"),
            "evaluate_hypothesis"
        );
        assert_eq!(
            pi("como federar um operador passo a passo?"),
            "explain_procedure"
        );
    }

    #[test]
    fn artifact_requests_classify_as_get_artifact() {
        assert_eq!(pi("mostra o manifesto do operador zero"), "get_artifact");
    }

    #[test]
    fn compound_questions_yield_multiple_sub_intents() {
        let r = resolve_query("Quanto demorou a última jornada e qual etapa foi mais lenta?");
        assert!(r.sub_intents.len() >= 2, "sub_intents={:?}", r.sub_intents);
        assert!(r.sub_intents.contains(&"get_duration".to_string()));
        assert!(r.sub_intents.contains(&"get_metric".to_string()));

        let r2 = resolve_query("Mostre a última execução e explique por que ficou bloqueada");
        assert!(r2.sub_intents.contains(&"get_execution".to_string()));
        assert!(r2.sub_intents.contains(&"diagnose_failure".to_string()));

        let r3 = resolve_query("Qual ADR define esta regra e desde que versão?");
        assert!(r3
            .sub_intents
            .contains(&"get_governance_decision".to_string()));
        assert!(r3.sub_intents.contains(&"get_version_change".to_string()));
    }

    #[test]
    fn off_topic_is_unsupported() {
        for q in [
            "Qual é a cotação do dólar amanhã?",
            "Qual é a capital da França?",
            "Conta-me uma piada",
        ] {
            let r = resolve_query(q);
            assert_eq!(r.primary_intent, "unsupported", "{q}");
            assert_eq!(r.resolution_state, "UNSUPPORTED", "{q}");
        }
    }

    #[test]
    fn ambiguous_compare_executions_requests_clarification_kind() {
        // no explicit targets → the contextual fallback asks a single concrete question.
        let fb = contextual_fallback("compara as execuções da jornada de validação", "");
        assert_eq!(fb.kind, "ambiguous");
        assert!(fb.message.contains("comparar") || fb.message.contains("execuções"));
    }

    #[test]
    fn contextual_fallback_out_of_scope_starts_with_nao_encontrei() {
        let fb = contextual_fallback("Qual é a cotação do dólar amanhã?", "");
        assert_eq!(fb.kind, "out_of_scope");
        assert!(fb.message.starts_with("Não encontrei"));
        assert!(!fb.message.contains("Posso responder, com base nas fontes"));
    }

    #[test]
    fn contextual_fallback_tool_unavailable_names_intent() {
        let fb = contextual_fallback(
            "Quanto tempo leva uma jornada completa de validação?",
            "tool_unavailable",
        );
        assert_eq!(fb.kind, "tool_unavailable");
        assert!(fb.message.contains("não está disponível"));
        assert!(!fb.message.contains("Posso responder, com base nas fontes"));
    }

    #[test]
    fn contextual_fallback_insufficient_source_shape() {
        let fb = contextual_fallback("explica a federação", "insufficient_source");
        assert_eq!(fb.kind, "insufficient_source");
        assert!(fb.message.starts_with("Não encontrei"));
    }

    #[test]
    fn contextual_fallback_never_the_fixed_list() {
        for (q, s) in [
            ("Qual é a cotação do dólar amanhã?", ""),
            ("explica a federação", "insufficient_source"),
            (
                "Quanto tempo leva uma jornada de validação?",
                "tool_unavailable",
            ),
            ("compara as execuções da jornada", ""),
        ] {
            let fb = contextual_fallback(q, s);
            assert!(!fb.message.contains("manifest (e exemplos)"), "{q}");
            assert!(
                !fb.message.contains("Posso responder, com base nas fontes"),
                "{q}"
            );
        }
    }

    #[test]
    fn resolution_serializes() {
        let j = serde_json::to_string(&resolve_query("explica a federação")).unwrap();
        assert!(j.contains("\"primary_intent\""));
        assert!(j.contains("\"sub_intents\""));
        assert!(j.contains("\"confidence\""));
    }
}
