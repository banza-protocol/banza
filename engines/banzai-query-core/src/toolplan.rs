//! Increment 3 — the typed, deterministic ToolPlanner (§5–§6).
//!
//! Given a [`crate::taxonomy::QueryResolution`] (Increment 2), this module produces an ordered
//! [`ToolPlan`]: which typed tools to call, in what order, with what declared contract. The mapping is
//! pure Rust — **the model NEVER selects a tool**. Rust decides; the JS layer only transports the plan
//! and, in a later increment (Inc.4/5), invokes the already-existing callables the plan names by kind.
//!
//! Golden rules honoured here:
//!   * SAFETY FIRST. A boundary/refusal resolution is settled BEFORE planning: it yields a plan of
//!     exactly `[HONEST_FALLBACK]` — never a tool that could read data or act. Boundary can only shrink
//!     the plan to the honest decline, never grow it.
//!   * NO DUPLICATION. This planner only NAMES existing tools by [`ToolKind`]; it declares their static
//!     [`ToolContract`]s and never re-implements a tool. Kinds a later increment wires but which are not
//!     yet executable are declared with `executable:false` (planned/deferred).
//!   * DETERMINISTIC + TOTAL. The same resolution yields the same plan. Every [`ToolKind`] has a complete
//!     [`ToolContract`]; every `fallback_policy` chain terminates at [`ToolKind::HonestFallback`] with no
//!     cycle.
//!
//! Pure + total + deterministic: no model, no I/O, no state.

use crate::taxonomy::QueryResolution;
use serde::{Deserialize, Serialize};

// ── §5 — the 19 typed tool kinds ─────────────────────────────────────────────────────────────────────

/// The exact, closed set of typed tools the planner may name. The wire form is SCREAMING_SNAKE_CASE and is
/// the ONLY identifier the JS adapter resolves to an existing callable — a tool kind is never a free string.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolKind {
    DocumentSearch,
    ContractLookup,
    SpecLookup,
    AdrLookup,
    RfcLookup,
    LiveArtifactFetch,
    RegistryLookup,
    RuntimeLookup,
    ExecutionLookup,
    ReceiptLookup,
    EvidenceLookup,
    MetricsQuery,
    CompareExecutions,
    ReproduceExecution,
    ReasonCodeLookup,
    VersionDiff,
    DeterministicCalculation,
    Clarification,
    HonestFallback,
}

impl ToolKind {
    /// The stable SCREAMING_SNAKE_CASE wire form (the JS ToolKind and the guard identifier).
    pub fn as_str(&self) -> &'static str {
        match self {
            ToolKind::DocumentSearch => "DOCUMENT_SEARCH",
            ToolKind::ContractLookup => "CONTRACT_LOOKUP",
            ToolKind::SpecLookup => "SPEC_LOOKUP",
            ToolKind::AdrLookup => "ADR_LOOKUP",
            ToolKind::RfcLookup => "RFC_LOOKUP",
            ToolKind::LiveArtifactFetch => "LIVE_ARTIFACT_FETCH",
            ToolKind::RegistryLookup => "REGISTRY_LOOKUP",
            ToolKind::RuntimeLookup => "RUNTIME_LOOKUP",
            ToolKind::ExecutionLookup => "EXECUTION_LOOKUP",
            ToolKind::ReceiptLookup => "RECEIPT_LOOKUP",
            ToolKind::EvidenceLookup => "EVIDENCE_LOOKUP",
            ToolKind::MetricsQuery => "METRICS_QUERY",
            ToolKind::CompareExecutions => "COMPARE_EXECUTIONS",
            ToolKind::ReproduceExecution => "REPRODUCE_EXECUTION",
            ToolKind::ReasonCodeLookup => "REASON_CODE_LOOKUP",
            ToolKind::VersionDiff => "VERSION_DIFF",
            ToolKind::DeterministicCalculation => "DETERMINISTIC_CALCULATION",
            ToolKind::Clarification => "CLARIFICATION",
            ToolKind::HonestFallback => "HONEST_FALLBACK",
        }
    }
}

/// Every tool kind, in a fixed order (for the contract registry, the guard and the tests). The exact set
/// is frozen at 19; add a variant deliberately (and give it a complete [`ToolContract`]).
pub const ALL_TOOL_KINDS: &[ToolKind] = &[
    ToolKind::DocumentSearch,
    ToolKind::ContractLookup,
    ToolKind::SpecLookup,
    ToolKind::AdrLookup,
    ToolKind::RfcLookup,
    ToolKind::LiveArtifactFetch,
    ToolKind::RegistryLookup,
    ToolKind::RuntimeLookup,
    ToolKind::ExecutionLookup,
    ToolKind::ReceiptLookup,
    ToolKind::EvidenceLookup,
    ToolKind::MetricsQuery,
    ToolKind::CompareExecutions,
    ToolKind::ReproduceExecution,
    ToolKind::ReasonCodeLookup,
    ToolKind::VersionDiff,
    ToolKind::DeterministicCalculation,
    ToolKind::Clarification,
    ToolKind::HonestFallback,
];

// ── §5 — the static typed tool contract ──────────────────────────────────────────────────────────────

/// The static, typed contract a tool declares. Serialized to the JS layer as public-safe metadata and
/// inspected by the guard. Every field is populated for every [`ToolKind`] (no field is ever empty).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolContract {
    /// The tool kind (wire form).
    pub kind: String,
    /// Typed shape of the tool's input.
    pub input_contract: String,
    /// Typed shape of the tool's output.
    pub output_contract: String,
    /// Who is AUTHORITATIVE for this data (never a model, never BanzAI's opinion).
    pub authority: String,
    /// Authorization required to call the tool: "public" (public read, no credentials) | "none"
    /// (pure engine, no external access).
    pub authorization: String,
    /// Answer visibility: always "public" (BanzAI never surfaces private data).
    pub visibility: String,
    /// Entity kinds this tool serves (["*"] = any).
    pub supported_entities: Vec<String>,
    /// Data freshness: "static" | "live" | "persisted".
    pub freshness: String,
    /// Bounded call budget in milliseconds.
    pub timeout_ms: u32,
    /// The closed-set reason codes ([`crate::reason`]) this tool may emit on decline/error.
    pub error_reason_codes: Vec<String>,
    /// Retry policy: "none" | "bounded".
    pub retry_policy: String,
    /// The kind to fall back to on failure. Chains terminate at [`ToolKind::HonestFallback`] (which
    /// falls back to itself — the terminal). Never a cycle.
    pub fallback_policy: String,
    /// Whether a REAL implementation exists that a later increment can invoke now (true), or the kind is
    /// planned/deferred (false). The planner still names planned kinds so the plan is complete.
    pub executable: bool,
}

/// One dense contract-table row (kept behind a `type` alias so the per-kind table reads cleanly and
/// clippy's type-complexity lint is satisfied): input, output, authority, authorization, entities,
/// freshness, timeout, reason codes, retry, fallback, executable.
type KindSpec = (
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static [&'static str],
    &'static str,
    u32,
    &'static [&'static str],
    &'static str,
    ToolKind,
    bool,
);

/// The declared contract for one tool kind. Total: every kind returns a fully-populated contract.
pub fn tool_contract(kind: ToolKind) -> ToolContract {
    use ToolKind::*;
    // Small helpers keep the table dense and consistent.
    let s = |x: &str| x.to_string();
    let v = |xs: &[&str]| xs.iter().map(|x| x.to_string()).collect::<Vec<_>>();
    let (
        input_contract,
        output_contract,
        authority,
        authorization,
        supported_entities,
        freshness,
        timeout_ms,
        error_reason_codes,
        retry_policy,
        fallback,
        executable,
    ): KindSpec = match kind {
        DocumentSearch => (
            "QueryResolution{normalized_query,entities,subject}",
            "DocChunk[]{path,title,section,anchor,text}",
            "canonical protocol documentation (doc + repo index)",
            "public",
            &["concept", "document"],
            "static",
            1000,
            &["RETRIEVAL_NO_ELIGIBLE_SOURCE", "CANONICAL_SOURCE_MISSING"],
            "none",
            HonestFallback,
            true,
        ),
        ContractLookup => (
            "QueryResolution{entities,subject}",
            "DocumentResolution{id,title,path,status}",
            "contracts/ — canonical protocol contracts",
            "public",
            &["contract"],
            "static",
            1000,
            &["ENTITY_NOT_FOUND", "CANONICAL_SOURCE_MISSING"],
            "none",
            DocumentSearch,
            true,
        ),
        SpecLookup => (
            "QueryResolution{entities,subject}",
            "DocumentResolution{id,title,path,status}",
            "contracts/ + spec/ — OpenAPI, QR-payload, webhook, event specs",
            "public",
            &["spec", "schema"],
            "static",
            1000,
            &["ENTITY_NOT_FOUND", "CANONICAL_SOURCE_MISSING"],
            "none",
            DocumentSearch,
            true,
        ),
        AdrLookup => (
            "QueryResolution{entities}",
            "DocumentResolution{id,title,path,status}",
            "decisions/adr/ — governance decision records",
            "public",
            &["adr"],
            "static",
            1000,
            &["ENTITY_NOT_FOUND", "CANONICAL_SOURCE_MISSING"],
            "none",
            DocumentSearch,
            true,
        ),
        RfcLookup => (
            "QueryResolution{entities}",
            "DocumentResolution{id,title,path,status}",
            "RFCs — governance proposals",
            "public",
            &["rfc"],
            "static",
            1000,
            &["ENTITY_NOT_FOUND", "CANONICAL_SOURCE_MISSING"],
            "none",
            DocumentSearch,
            true,
        ),
        LiveArtifactFetch => (
            "ScopeDecision{entity_id,artifact_type,origin}",
            "LiveArtifactObservation{origin,url,sha256,version,profile,environment,observed_at}",
            "the operator's published origin (endpoint-originated, ADR-034)",
            "public",
            &["operator", "implementation", "artifact"],
            "live",
            8000,
            &["ENTITY_NOT_FOUND", "CANONICAL_SOURCE_MISSING"],
            "bounded",
            RegistryLookup,
            true,
        ),
        RegistryLookup => (
            "TargetRef{operator_id,implementation_id}",
            "RegistryEntry{operator_id,implementation_id,origin,profile,status}",
            "the BANZA Technical Registry (banza-target-registry)",
            "public",
            &["operator", "implementation"],
            "live",
            2000,
            &["ENTITY_NOT_FOUND"],
            "bounded",
            HonestFallback,
            true,
        ),
        RuntimeLookup => (
            "()",
            "RuntimeState{engine_state,version,inference_location,degraded}",
            "the runtime SSOT (/banzai/runtime, ADR-036)",
            "public",
            &["runtime"],
            "live",
            2000,
            &["CANONICAL_SOURCE_MISSING"],
            "bounded",
            HonestFallback,
            true,
        ),
        ExecutionLookup => (
            "ExecutionRef{execution_id|latest,workspace=public}",
            "Execution{execution_id,status,steps[],journey_receipt}",
            "the durable receipt store (ADR-036)",
            "public",
            &[
                "validation_execution",
                "validation_journey",
                "validation_step",
            ],
            "persisted",
            5000,
            &["ENTITY_NOT_FOUND"],
            "none",
            ReceiptLookup,
            true,
        ),
        ReceiptLookup => (
            "ReceiptRef{implementation_id?,workspace=public,limit}",
            "JourneyReceipt[]{execution_id,status,started_at,finished_at}",
            "the durable receipt store — operation/journey receipts (ADR-036)",
            "public",
            &["validation_execution", "validation_journey"],
            "persisted",
            5000,
            &["ENTITY_NOT_FOUND"],
            "none",
            HonestFallback,
            true,
        ),
        EvidenceLookup => (
            "ExecutionRef{execution_id,workspace=public}",
            "EvidenceObservation[]{step_id,artifact_role,endpoint,content_sha256}",
            "the durable evidence store — pinned artifacts / evidence bundles (ADR-036)",
            "public",
            &["validation_execution", "artifact"],
            "persisted",
            5000,
            &["ENTITY_NOT_FOUND"],
            "none",
            ReceiptLookup,
            true,
        ),
        MetricsQuery => (
            "OperationalDecision{subject,metric,aggregation,scope}",
            "DurationMetrics{latest,median,p95,per_step,claims,sources}",
            "the durable receipt store — SQL telemetry aggregates (ADR-036)",
            "public",
            &[
                "validation_execution",
                "validation_journey",
                "validation_step",
            ],
            "persisted",
            5000,
            &["INSUFFICIENT_MEASUREMENTS"],
            "none",
            HonestFallback,
            true,
        ),
        CompareExecutions => (
            "ComparePair{a_execution_id,b_execution_id,workspace=public}",
            "ExecutionDiff{a,b,step_deltas[],status_delta}",
            "the durable receipt store (ADR-036)",
            "public",
            &["validation_execution", "validation_journey"],
            "persisted",
            5000,
            &["ENTITY_NOT_FOUND", "AMBIGUOUS_ENTITY"],
            "none",
            HonestFallback,
            true,
        ),
        ReproduceExecution => (
            "ReproduceRef{reproduction_of,workspace=public}",
            "Execution{execution_id,status,reproduction_of,reproduction_result}",
            "the validation orchestrator + durable receipt store (ADR-036)",
            "public",
            &["validation_execution", "validation_journey"],
            "persisted",
            60000,
            &["ENTITY_NOT_FOUND"],
            "none",
            ReceiptLookup,
            true,
        ),
        ReasonCodeLookup => (
            "ReasonCodeRef{code|context}",
            "ReasonCode{wire_form,is_internal_coverage_failure}",
            "the reason-code registry (banzai-query-core reason.rs)",
            "public",
            &["reason_code"],
            "static",
            200,
            &["ENTITY_NOT_FOUND"],
            "none",
            HonestFallback,
            true,
        ),
        VersionDiff => (
            "VersionRange{from_version,to_version,entity}",
            "VersionChange[]{version,change,path}",
            "the protocol version history (planned — wired by a later increment)",
            "public",
            &["document", "protocol_version"],
            "static",
            1000,
            &["CANONICAL_SOURCE_MISSING"],
            "none",
            DocumentSearch,
            false,
        ),
        DeterministicCalculation => (
            "Calculation{expression,operands}",
            "CalculationResult{value,units}",
            "a pure Rust calculator (planned — wired by a later increment)",
            "none",
            &["number"],
            "static",
            1000,
            &["MALFORMED_REQUEST"],
            "none",
            HonestFallback,
            false,
        ),
        Clarification => (
            "QueryResolution{ambiguities,sub_intents}",
            "ClarificationRequest{question,candidates}",
            "the query resolver (taxonomy.rs contextual fallback)",
            "none",
            &["*"],
            "static",
            100,
            &["AMBIGUOUS_ENTITY", "AMBIGUOUS_ATTRIBUTE"],
            "none",
            HonestFallback,
            true,
        ),
        HonestFallback => (
            "QueryResolution{primary_intent,sub_intents}",
            "ContextualFallback{kind,interpreted_intent,message}",
            "the contextual fallback (taxonomy.rs) — an honest, request-oriented decline",
            "none",
            &["*"],
            "static",
            100,
            &[
                "UNSUPPORTED_EXTERNAL_FACT",
                "CANONICAL_SOURCE_MISSING",
                "BOUNDARY_BLOCKED",
            ],
            "none",
            // The terminal falls back to itself — the chain stops here.
            HonestFallback,
            true,
        ),
    };

    ToolContract {
        kind: s(kind.as_str()),
        input_contract: s(input_contract),
        output_contract: s(output_contract),
        authority: s(authority),
        authorization: s(authorization),
        visibility: s("public"),
        supported_entities: v(supported_entities),
        freshness: s(freshness),
        timeout_ms,
        error_reason_codes: v(error_reason_codes),
        retry_policy: s(retry_policy),
        fallback_policy: s(fallback.as_str()),
        executable,
    }
}

/// The full static contract registry (all 19 kinds, fixed order).
pub fn tool_contracts() -> Vec<ToolContract> {
    ALL_TOOL_KINDS.iter().map(|k| tool_contract(*k)).collect()
}

// ── §6 — the ordered plan ────────────────────────────────────────────────────────────────────────────

/// One ordered step of a tool plan: the tool to call, why, over which entity/scope, and whether it is
/// required for the plan to fulfil and executable now.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolStep {
    /// The tool kind (wire form).
    pub kind: String,
    /// A short, public-safe reason this step is in the plan.
    pub reason: String,
    /// The entity this step targets ("" when none).
    pub entity: String,
    /// A compact scope descriptor (profile/environment/version/execution scope; "" when none).
    pub scope: String,
    /// Whether the step must succeed for the plan to fulfil.
    pub required: bool,
    /// Whether the tool is executable now (its implementation exists). A planned/deferred tool or a step
    /// waiting on a clarification is `false` and carries the reason.
    pub executable: bool,
}

/// The ordered tool plan for a resolved question. Deterministic; the model never selects any of it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolPlan {
    pub schema_version: u32,
    /// The resolution's primary intent (echoed so the plan is self-describing).
    pub primary_intent: String,
    /// The ordered steps.
    pub steps: Vec<ToolStep>,
    /// Public-safe planner notes (compound handling, deferrals, hypothesis marking, boundary).
    pub notes: Vec<String>,
}

/// A compact scope descriptor from the resolution (profile/environment/version/execution scope).
fn scope_of(r: &QueryResolution) -> String {
    let mut parts: Vec<String> = Vec::new();
    if !r.profile.is_empty() {
        parts.push(format!("profile={}", r.profile));
    }
    if !r.environment.is_empty() {
        parts.push(format!("env={}", r.environment));
    }
    if !r.protocol_version.is_empty() {
        parts.push(format!("version={}", r.protocol_version));
    }
    if !r.execution_scope.is_empty() {
        parts.push(format!("execution={}", r.execution_scope));
    }
    if !r.time_scope.is_empty() {
        parts.push(format!("time={}", r.time_scope));
    }
    parts.join(",")
}

/// The primary entity a step should target (subject > first entity > "").
fn entity_of(r: &QueryResolution) -> String {
    if !r.subject.is_empty() {
        r.subject.clone()
    } else {
        r.entities.first().cloned().unwrap_or_default()
    }
}

/// Build one step for a kind, filling entity/scope from the resolution.
fn step(kind: ToolKind, reason: &str, r: &QueryResolution) -> ToolStep {
    ToolStep {
        kind: kind.as_str().to_string(),
        reason: reason.to_string(),
        entity: entity_of(r),
        scope: scope_of(r),
        required: true,
        executable: tool_contract(kind).executable,
    }
}

/// Map ONE intent to its ordered steps (no boundary, no compound — the caller handles those).
/// Deterministic: an intent always maps to the same kinds. Uses the resolution for the live/artifact and
/// governance-source branch decisions (which tool of a pair), never a model.
fn steps_for_intent(intent: &str, r: &QueryResolution, notes: &mut Vec<String>) -> Vec<ToolStep> {
    match intent {
        // Operational measurement → telemetry (the calculation lives in the tool's SQL aggregates).
        "get_duration" => vec![step(
            ToolKind::MetricsQuery,
            "medição de duração a partir de telemetria persistida",
            r,
        )],
        "get_metric" => vec![step(
            ToolKind::MetricsQuery,
            "métrica de desempenho a partir de telemetria persistida",
            r,
        )],
        // Live state → the runtime SSOT.
        "get_live_state" => vec![step(
            ToolKind::RuntimeLookup,
            "estado observado a partir do SSOT de runtime",
            r,
        )],
        // A single execution record.
        "get_execution" => vec![step(
            ToolKind::ExecutionLookup,
            "consulta de uma execução (jornada) persistida",
            r,
        )],
        // Compare executions → two lookups + the diff. When the operands are unspecified, clarify first.
        "compare_executions" => {
            let mut steps = Vec::new();
            if r.comparison_targets.len() < 2 {
                notes.push(
                    "comparação sem dois operandos explícitos — clarificação inserida antes da comparação"
                        .into(),
                );
                steps.push(step(
                    ToolKind::Clarification,
                    "faltam os dois operandos da comparação (quais execuções?)",
                    r,
                ));
                let mut a = step(
                    ToolKind::ExecutionLookup,
                    "primeira execução da comparação",
                    r,
                );
                a.executable = false;
                a.reason = "aguarda clarificação dos operandos".into();
                let mut b = step(
                    ToolKind::ExecutionLookup,
                    "segunda execução da comparação",
                    r,
                );
                b.executable = false;
                b.reason = "aguarda clarificação dos operandos".into();
                let mut c = step(
                    ToolKind::CompareExecutions,
                    "diferença entre as duas execuções",
                    r,
                );
                c.executable = false;
                c.reason = "aguarda clarificação dos operandos".into();
                steps.push(a);
                steps.push(b);
                steps.push(c);
                steps
            } else {
                let mut a = step(
                    ToolKind::ExecutionLookup,
                    "primeira execução da comparação",
                    r,
                );
                a.entity = r.comparison_targets[0].clone();
                let mut b = step(
                    ToolKind::ExecutionLookup,
                    "segunda execução da comparação",
                    r,
                );
                b.entity = r.comparison_targets[1].clone();
                steps.push(a);
                steps.push(b);
                steps.push(step(
                    ToolKind::CompareExecutions,
                    "diferença entre as duas execuções",
                    r,
                ));
                steps
            }
        }
        // Reproduce → read the source receipt, then re-run.
        "reproduce_execution" => vec![
            step(
                ToolKind::ReceiptLookup,
                "receita da execução a reproduzir",
                r,
            ),
            step(
                ToolKind::ReproduceExecution,
                "reprodução determinística da execução",
                r,
            ),
        ],
        // Diagnose a failure → the execution record + its reason code.
        "diagnose_failure" => vec![
            step(ToolKind::ExecutionLookup, "execução que falhou/bloqueou", r),
            step(
                ToolKind::ReasonCodeLookup,
                "código de razão que explica o resultado",
                r,
            ),
        ],
        "get_reason_code" => vec![step(
            ToolKind::ReasonCodeLookup,
            "código de razão do resultado",
            r,
        )],
        // Governance decision → ADR or RFC by the named entity.
        "get_governance_decision" => {
            let wants_rfc = r
                .entities
                .iter()
                .any(|e| e.to_uppercase().starts_with("RFC"))
                || r.normalized_query.contains("rfc");
            if wants_rfc {
                vec![step(
                    ToolKind::RfcLookup,
                    "decisão de governação (RFC) que define a regra",
                    r,
                )]
            } else {
                vec![step(
                    ToolKind::AdrLookup,
                    "decisão de governação (ADR) que define a regra",
                    r,
                )]
            }
        }
        // API guidance → the contract, or the spec when the question is schema/openapi-shaped.
        "get_api_guidance" => {
            let wants_spec = r.normalized_query.contains("openapi")
                || r.normalized_query.contains("schema")
                || r.normalized_query.contains("payload");
            if wants_spec {
                vec![step(
                    ToolKind::SpecLookup,
                    "especificação do endpoint/da API",
                    r,
                )]
            } else {
                vec![step(
                    ToolKind::ContractLookup,
                    "contrato do endpoint/da API",
                    r,
                )]
            }
        }
        // Artifact → live fetch when the answer needs live data, else the registry entry.
        "get_artifact" => {
            if r.requires_live_data {
                vec![step(
                    ToolKind::LiveArtifactFetch,
                    "artefacto obtido ao vivo da origem publicada",
                    r,
                )]
            } else {
                vec![step(
                    ToolKind::RegistryLookup,
                    "artefacto a partir do Registo Técnico",
                    r,
                )]
            }
        }
        // Evaluate a hypothesis → the contract/spec that governs it, marked hypothesis, NEVER live.
        "evaluate_hypothesis" => {
            notes.push(
                "hipótese: avaliada contra a fonte canónica (contrato/spec) — nunca contra dados ao vivo"
                    .into(),
            );
            let mut st = step(
                ToolKind::ContractLookup,
                "fonte canónica contra a qual a hipótese é avaliada (hipótese, nunca ao vivo)",
                r,
            );
            st.scope = if st.scope.is_empty() {
                "hypothesis".into()
            } else {
                format!("{},hypothesis", st.scope)
            };
            vec![st]
        }
        // Version change → the (planned) version diff.
        "get_version_change" => vec![step(
            ToolKind::VersionDiff,
            "diferença entre versões do protocolo",
            r,
        )],
        // Documentary intents → documentary search over the canonical corpus.
        "explain_concept"
        | "explain_document"
        | "explain_architecture"
        | "explain_impact"
        | "explain_governance"
        | "explain_procedure"
        | "summarize_document"
        | "locate_rule"
        | "get_requirement"
        | "get_applicability"
        | "get_security_explanation"
        | "compare_documents"
        | "follow_up" => vec![step(
            ToolKind::DocumentSearch,
            "documentação canónica que fundamenta a resposta",
            r,
        )],
        // Under-specified → a single concrete clarification.
        "clarification_required" | "request_clarification" => vec![step(
            ToolKind::Clarification,
            "pedido sub-especificado — uma pergunta concreta de clarificação",
            r,
        )],
        // Out of scope / unknown → the honest decline.
        "unsupported" => vec![step(
            ToolKind::HonestFallback,
            "fora do âmbito do protocolo — recusa honesta",
            r,
        )],
        // Workbench-style protocol intents (may arrive from other resolvers) — map to the closest tool.
        "inspect_manifest" | "validate_artifact" | "check_endpoint" => vec![step(
            ToolKind::LiveArtifactFetch,
            "artefacto/endpoint obtido ao vivo da origem publicada",
            r,
        )],
        "check_operator" => vec![step(
            ToolKind::RegistryLookup,
            "operador a partir do Registo Técnico",
            r,
        )],
        "check_schema" => vec![step(ToolKind::SpecLookup, "esquema/spec a validar", r)],
        "check_document_status" => vec![step(
            ToolKind::DocumentSearch,
            "estado do documento a partir do registo documental",
            r,
        )],
        // Any intent not explicitly mapped falls to the honest decline (never a data/act tool by default).
        _ => vec![step(
            ToolKind::HonestFallback,
            "intenção sem mapeamento determinístico — recusa honesta",
            r,
        )],
    }
}

/// Deterministically map a [`QueryResolution`] to an ordered [`ToolPlan`]. The model NEVER participates.
///
/// Order of decisions (each is settled before the next):
///   1. BOUNDARY — a boundary/refusal resolution yields exactly `[HONEST_FALLBACK]` (safety golden rule).
///   2. AMBIGUOUS — a resolution the classifier flagged for clarification yields `[CLARIFICATION]`.
///   3. COMPOUND — a question with ≥2 sub-intents plans one step-group per sub-intent, in stable order.
///   4. SINGLE — otherwise the primary intent's step-group.
pub fn plan_tools(r: &QueryResolution) -> ToolPlan {
    let mut notes: Vec<String> = Vec::new();

    // 1) BOUNDARY — settled first, never overridden. Exactly the honest fallback; no data/act tool.
    if r.boundary_detected
        || r.primary_intent == "boundary_request"
        || r.resolution_state == "BOUNDARY"
    {
        notes.push(
            "resolução de fronteira/segurança — plano reduzido à recusa honesta; nenhuma ferramenta de dados ou de acção"
                .into(),
        );
        return ToolPlan {
            schema_version: 1,
            primary_intent: r.primary_intent.clone(),
            steps: vec![ToolStep {
                kind: ToolKind::HonestFallback.as_str().to_string(),
                reason: "recusa honesta de segurança (fronteira decidida antes do planeamento)"
                    .into(),
                entity: String::new(),
                scope: String::new(),
                required: true,
                executable: true,
            }],
            notes,
        };
    }

    // 2) AMBIGUOUS — a clarification is the correct, single outcome.
    if r.resolution_state == "AMBIGUOUS" || r.primary_intent == "clarification_required" {
        notes.push(
            "resolução ambígua — uma clarificação concreta antes de qualquer ferramenta".into(),
        );
        return ToolPlan {
            schema_version: 1,
            primary_intent: r.primary_intent.clone(),
            steps: vec![step(
                ToolKind::Clarification,
                "pedido ambíguo — uma pergunta concreta de clarificação",
                r,
            )],
            notes,
        };
    }

    // 3) COMPOUND — a step-group per sub-intent, in first-appearance order (never drops a clause).
    if r.sub_intents.len() >= 2 {
        notes.push(format!(
            "pergunta composta: {} sub-intenções ({}) — uma etapa por parte, ordem estável",
            r.sub_intents.len(),
            r.sub_intents.join(" + ")
        ));
        let mut steps: Vec<ToolStep> = Vec::new();
        for si in &r.sub_intents {
            for st in steps_for_intent(si, r, &mut notes) {
                steps.push(st);
            }
        }
        return ToolPlan {
            schema_version: 1,
            primary_intent: r.primary_intent.clone(),
            steps,
            notes,
        };
    }

    // 4) SINGLE — the primary intent's step-group.
    let steps = steps_for_intent(&r.primary_intent, r, &mut notes);
    ToolPlan {
        schema_version: 1,
        primary_intent: r.primary_intent.clone(),
        steps,
        notes,
    }
}

/// Convenience: resolve a raw question and plan in one call (used by the WASM surface).
pub fn plan_tools_for_question(question: &str) -> ToolPlan {
    plan_tools(&crate::taxonomy::resolve_query(question))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reason::ALL_REASON_CODES;
    use crate::taxonomy::resolve_query;

    fn kinds(q: &str) -> Vec<String> {
        plan_tools_for_question(q)
            .steps
            .iter()
            .map(|s| s.kind.clone())
            .collect()
    }

    #[test]
    fn exactly_nineteen_kinds() {
        assert_eq!(ALL_TOOL_KINDS.len(), 19, "the tool set is frozen at 19");
        let unique: std::collections::BTreeSet<&str> =
            ALL_TOOL_KINDS.iter().map(|k| k.as_str()).collect();
        assert_eq!(unique.len(), 19, "no duplicate kind");
    }

    #[test]
    fn every_kind_has_a_complete_contract() {
        for k in ALL_TOOL_KINDS {
            let c = tool_contract(*k);
            assert_eq!(c.kind, k.as_str());
            assert!(!c.input_contract.is_empty(), "{} input", k.as_str());
            assert!(!c.output_contract.is_empty(), "{} output", k.as_str());
            assert!(!c.authority.is_empty(), "{} authority", k.as_str());
            assert!(
                c.authorization == "public" || c.authorization == "none",
                "{} authorization",
                k.as_str()
            );
            assert_eq!(c.visibility, "public", "{} visibility", k.as_str());
            assert!(
                !c.supported_entities.is_empty(),
                "{} supported_entities",
                k.as_str()
            );
            assert!(
                ["static", "live", "persisted"].contains(&c.freshness.as_str()),
                "{} freshness",
                k.as_str()
            );
            assert!(c.timeout_ms > 0, "{} timeout", k.as_str());
            assert!(
                !c.error_reason_codes.is_empty(),
                "{} reason codes",
                k.as_str()
            );
            assert!(
                c.retry_policy == "none" || c.retry_policy == "bounded",
                "{} retry_policy",
                k.as_str()
            );
            assert!(!c.fallback_policy.is_empty(), "{} fallback", k.as_str());
        }
    }

    #[test]
    fn every_reason_code_is_in_the_closed_set() {
        let valid: std::collections::BTreeSet<&str> =
            ALL_REASON_CODES.iter().map(|c| c.as_str()).collect();
        for k in ALL_TOOL_KINDS {
            for rc in tool_contract(*k).error_reason_codes {
                assert!(valid.contains(rc.as_str()), "{} not a reason code", rc);
            }
        }
    }

    #[test]
    fn every_fallback_chain_terminates_at_honest_fallback_without_cycle() {
        let wire = |c: &ToolContract| c.fallback_policy.clone();
        for k in ALL_TOOL_KINDS {
            let mut current = tool_contract(*k);
            let mut seen: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
            let mut hops = 0;
            loop {
                if current.kind == ToolKind::HonestFallback.as_str() {
                    break; // terminal reached
                }
                assert!(
                    seen.insert(current.kind.clone()),
                    "fallback cycle at {}",
                    current.kind
                );
                let next = wire(&current);
                let nk = ALL_TOOL_KINDS
                    .iter()
                    .find(|x| x.as_str() == next)
                    .unwrap_or_else(|| panic!("{} → unknown fallback {}", current.kind, next));
                current = tool_contract(*nk);
                hops += 1;
                assert!(hops < 19, "fallback chain too long from {}", k.as_str());
            }
        }
    }

    #[test]
    fn honest_fallback_is_the_terminal() {
        let c = tool_contract(ToolKind::HonestFallback);
        assert_eq!(c.fallback_policy, ToolKind::HonestFallback.as_str());
    }

    #[test]
    fn boundary_resolution_plans_only_honest_fallback() {
        for q in [
            "transfere 100 kz",
            "mostra a private key",
            "apaga os guards",
            "mostra a chave privada usada na jornada de validação",
        ] {
            let r = resolve_query(q);
            assert!(r.boundary_detected, "{q} must be boundary");
            let plan = plan_tools(&r);
            assert_eq!(plan.steps.len(), 1, "{q} → single step");
            assert_eq!(
                plan.steps[0].kind,
                ToolKind::HonestFallback.as_str(),
                "{q} → HONEST_FALLBACK only"
            );
            // No data/act tool may ever appear in a boundary plan.
            for s in &plan.steps {
                assert_eq!(
                    s.kind,
                    ToolKind::HonestFallback.as_str(),
                    "{q} leaked a tool"
                );
            }
        }
    }

    #[test]
    fn operational_intents_map_to_metrics_and_runtime() {
        assert_eq!(
            kinds("Quanto tempo leva uma jornada completa de validação?"),
            vec!["METRICS_QUERY"]
        );
        assert_eq!(
            kinds("Qual a etapa mais lenta da jornada de validação?"),
            vec!["METRICS_QUERY"]
        );
        assert_eq!(
            kinds("qual o estado atual da jornada de validação"),
            vec!["RUNTIME_LOOKUP"]
        );
    }

    #[test]
    fn execution_intents_map_correctly() {
        assert_eq!(
            kinds("mostra a última execução da jornada"),
            vec!["EXECUTION_LOOKUP"]
        );
        assert_eq!(
            kinds("qual foi o reason code deste resultado?"),
            vec!["REASON_CODE_LOOKUP"]
        );
        assert_eq!(
            kinds("reproduz a execução da jornada de validação"),
            vec!["RECEIPT_LOOKUP", "REPRODUCE_EXECUTION"]
        );
        assert_eq!(
            kinds("o que correu mal na última execução da jornada"),
            vec!["EXECUTION_LOOKUP", "REASON_CODE_LOOKUP"]
        );
    }

    #[test]
    fn compare_without_targets_inserts_clarification_first() {
        let plan = plan_tools_for_question("compara as execuções da jornada de validação");
        assert_eq!(plan.steps[0].kind, "CLARIFICATION");
        assert!(plan.steps.iter().any(|s| s.kind == "COMPARE_EXECUTIONS"));
        // the compare/lookup steps are deferred until the operands are clarified.
        for s in &plan.steps {
            if s.kind == "COMPARE_EXECUTIONS" || s.kind == "EXECUTION_LOOKUP" {
                assert!(!s.executable, "deferred step must not be executable");
            }
        }
    }

    #[test]
    fn compare_with_two_targets_plans_two_lookups_and_a_diff() {
        let plan = plan_tools_for_question(
            "compara a última execução com a execução anterior da jornada de validação",
        );
        let ks: Vec<String> = plan.steps.iter().map(|s| s.kind.clone()).collect();
        assert_eq!(
            ks,
            vec!["EXECUTION_LOOKUP", "EXECUTION_LOOKUP", "COMPARE_EXECUTIONS"]
        );
    }

    #[test]
    fn governance_and_api_and_artifact_branches() {
        assert_eq!(kinds("qual ADR define esta regra?"), vec!["ADR_LOOKUP"]);
        assert_eq!(
            kinds("como chamar o endpoint de descoberta?"),
            vec!["CONTRACT_LOOKUP"]
        );
        // an explicit artifact request without live scope goes to the registry.
        let arte = kinds("mostra o manifesto do operador zero");
        assert!(
            arte == vec!["LIVE_ARTIFACT_FETCH"] || arte == vec!["REGISTRY_LOOKUP"],
            "artifact → live or registry, got {arte:?}"
        );
    }

    #[test]
    fn documentary_intents_map_to_document_search() {
        assert_eq!(kinds("explica a federação"), vec!["DOCUMENT_SEARCH"]);
        assert_eq!(
            kinds("que requisitos preciso para o perfil L2?"),
            vec!["DOCUMENT_SEARCH"]
        );
    }

    #[test]
    fn hypothesis_is_marked_and_never_live() {
        let plan = plan_tools_for_question("é verdade que o BanzAI certifica operadores?");
        assert_eq!(plan.steps.len(), 1);
        let st = &plan.steps[0];
        // never a live tool for a hypothesis.
        assert!(st.kind == "CONTRACT_LOOKUP" || st.kind == "SPEC_LOOKUP");
        assert_ne!(st.kind, "LIVE_ARTIFACT_FETCH");
        assert!(st.scope.contains("hypothesis"));
        assert!(plan.notes.iter().any(|n| n.contains("hipótese")));
    }

    #[test]
    fn compound_question_plans_one_group_per_sub_intent() {
        let plan =
            plan_tools_for_question("Quanto demorou a última jornada e qual etapa foi mais lenta?");
        let ks: Vec<String> = plan.steps.iter().map(|s| s.kind.clone()).collect();
        // both sub-intents are operational → two metrics steps, order stable.
        assert!(ks.len() >= 2, "compound plan has ≥2 steps, got {ks:?}");
        assert!(ks.iter().all(|k| k == "METRICS_QUERY"));

        let plan2 = plan_tools_for_question("Qual ADR define esta regra e desde que versão?");
        let ks2: Vec<String> = plan2.steps.iter().map(|s| s.kind.clone()).collect();
        assert!(ks2.contains(&"ADR_LOOKUP".to_string()));
        assert!(ks2.contains(&"VERSION_DIFF".to_string()));
    }

    #[test]
    fn out_of_scope_plans_honest_fallback() {
        for q in ["Qual é a capital da França?", "Conta-me uma piada"] {
            assert_eq!(kinds(q), vec!["HONEST_FALLBACK"], "{q}");
        }
    }

    #[test]
    fn planner_is_pure_rust_with_no_model_input() {
        // The planner's ONLY input is the deterministic resolution — no model handle, no I/O, no state.
        // Proven structurally: plan_tools takes &QueryResolution and returns a value; calling it twice on
        // the same resolution yields byte-identical plans.
        let r = resolve_query("Quanto tempo leva uma jornada completa de validação?");
        let a = serde_json::to_string(&plan_tools(&r)).unwrap();
        let b = serde_json::to_string(&plan_tools(&r)).unwrap();
        assert_eq!(a, b, "planner must be deterministic");
    }

    #[test]
    fn planned_kinds_are_marked_not_executable() {
        assert!(!tool_contract(ToolKind::VersionDiff).executable);
        assert!(!tool_contract(ToolKind::DeterministicCalculation).executable);
        // and the executable ones are marked executable.
        assert!(tool_contract(ToolKind::MetricsQuery).executable);
        assert!(tool_contract(ToolKind::HonestFallback).executable);
    }

    #[test]
    fn plan_serializes() {
        let j = serde_json::to_string(&plan_tools_for_question("explica a federação")).unwrap();
        assert!(j.contains("\"steps\""));
        assert!(j.contains("\"primary_intent\""));
        assert!(j.contains("\"kind\""));
    }
}
