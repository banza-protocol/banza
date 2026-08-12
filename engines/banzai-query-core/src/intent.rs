//! Canonical intent taxonomy + the deterministic vocabulary markers the Rust resolver classifies with.
//!
//! M2.18B.6 — Rust-First Single-Pass Grounded Synthesis. Rust owns understanding: [`crate::resolve`]
//! classifies an explanatory question into the canonical [`PRIMARY_INTENTS`] taxonomy entirely
//! deterministically (no model interprets the question). This module holds the taxonomy constants and the
//! accent-free, whole-substring vocabulary markers that classification is built from. Pure + total: every
//! item here is a `const` or a stateless helper — no model call, no I/O, no state.

/// The canonical primary intents the resolver may assign. The single grounded synthesis (the one model
/// call) explains a FactualPackage that was already routed and grounded under one of these labels; it
/// never invents an intent.
pub const PRIMARY_INTENTS: &[&str] = &[
    "explain_document",
    "summarize_document",
    "locate_rule",
    "compare_documents",
    "explain_concept",
    "explain_architecture",
    "explain_governance",
    "check_document_status",
    "explain_impact",
    "inspect_manifest",
    "validate_artifact",
    "check_endpoint",
    "check_schema",
    "check_operator",
    // M2.20 (ADR-078) — operational reasoning: a question about a measured/observed operational
    // property (duration, metric, live state) of a protocol subject. Answered from real telemetry
    // over persisted executions (read-only) or declined honestly with INSUFFICIENT_MEASUREMENTS —
    // never a fabricated number and never the fixed topic list.
    "get_duration",
    "get_metric",
    "get_live_state",
    // Increment 2 (operational-intent taxonomy §3) — the complete typed taxonomy the rich
    // [`crate::taxonomy::resolve_query`] classifier may assign. Several of the labels above are reused;
    // these are the additional operational/protocol intents. Classification is derived from
    // intent+entity+scope+metric+operation+time+comparison+evidence signals — never a table of exact
    // question strings — and a question not yet ANSWERABLE for one of these still classifies correctly
    // and is served a contextual fallback (never the fixed topic list). Boundary questions are never
    // reclassified into any of these.
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
    "follow_up",
    "clarification_required",
    "boundary_request",
    "unsupported",
];

/// The canonical entity types a resolved intent may reference. Empty string = no entity (e.g. a pure
/// concept question).
pub const ENTITY_TYPES: &[&str] = &[
    "",
    "adr",
    "rfc",
    "reference_chapter",
    "endpoint",
    "schema",
    "manifest",
    "operator",
    "evidence",
    "trust_root",
    "revocation",
    "contract",
    "rule",
    "field",
    "artifact",
    "concept",
    "engine",
    "governance_decision",
];

// ─────────────────────────── deterministic classification vocabulary ───────────────────────────────
// Accent-free (matched against `crate::normalize`d text), whole-substring, rare in unrelated prose. The
// resolver in `crate::resolve` reuses these to originate a PRIMARY_INTENT from the raw question. A
// conceptual "difference between X and Y" (a compare marker with no document marker) stays a concept.

pub(crate) const COMPARE_MARKERS: &[&str] = &[
    "diferenca entre",
    "diferencas entre",
    "difference between",
    "compara ",
    "comparar",
    " versus ",
    " vs ",
    "distingue",
    "distinguir",
    "em que diferem",
];
pub(crate) const DOC_MARKERS: &[&str] = &[
    "decisao",
    "adr",
    "rfc",
    "documento",
    "norma",
    "regra",
    "politica",
    "especificacao",
    "contrato",
    "capitulo",
    "invariante",
];
pub(crate) const LOCATE_MARKERS: &[&str] = &[
    "qual a regra que",
    "qual e a regra que",
    "que regra ",
    "onde esta a regra",
    "onde fica a regra",
    "onde esta definida a regra",
    "a regra que ",
    "which rule",
    "where is the rule",
];
pub(crate) const GOVERNANCE_MARKERS: &[&str] = &[
    "quem pode propor",
    "quem propoe",
    "quem pode alterar",
    "quem decide",
    "quem governa",
    "quem mantem",
    "quem aprova mudancas",
    "como submeto",
    "como proponho",
    "como participo",
    "como contribuo",
    "submeter uma proposta",
    "propor mudancas",
    "propor uma mudanca",
    "proposta de rfc",
    "processo de governanca",
    "processo de decisao",
    "who can propose",
    "how do i submit",
    "how to propose",
];
pub(crate) const STATUS_MARKERS: &[&str] = &[
    "ja foi aceite",
    "foi aceite",
    "ja foi aprovada",
    "foi aprovada",
    "esta activa",
    "esta ativa",
    "continua em vigor",
    "ainda esta em vigor",
    "ainda em vigor",
    "ainda vale",
    "qual o estado",
    "qual e o estado",
    "continua valida",
    "still active",
    "still in force",
    "been accepted",
];

// ─────────────────────────── operational reasoning vocabulary (ADR-078) ─────────────────────────────
// Accent-free, whole-substring markers for the OPERATIONAL family: questions about a measured/observed
// property of a protocol subject. `crate::operational::resolve_operational_metric` gates on
// (a duration/metric marker) AND (a subject marker) so an off-topic "quanto tempo" (with no protocol
// subject) never classifies as operational — it declines honestly instead.

/// Elapsed-time markers (the "quanto tempo / how long" family).
pub(crate) const DURATION_MARKERS: &[&str] = &[
    "quanto tempo",
    "quanto demora",
    "quanto leva",
    "tempo leva",
    "tempo demora",
    "tempo de execucao",
    "tempo de validacao",
    "duracao",
    "demora",
    "how long",
    "duration",
    "elapsed",
    "how much time",
    "time does it take",
    "takes to",
];

/// Aggregation / performance markers (média/mediana/percentil/mais lento/timeout).
pub(crate) const METRIC_MARKERS: &[&str] = &[
    "media",
    "mediana",
    "percentil",
    "p95",
    "p50",
    "p99",
    "mais lento",
    "mais lenta",
    "mais rapido",
    "mais rapida",
    "etapa mais",
    "passo mais",
    "slowest",
    "fastest",
    "average",
    "median",
    "percentile",
    "throughput",
    "por etapa",
    "por passo",
    "per step",
    "per-step",
    "timeout",
    "tempo limite",
];

/// Live-state markers (what is happening now / last observed).
pub(crate) const LIVE_STATE_MARKERS: &[&str] = &[
    "ultima execucao",
    "ultima jornada",
    "estado atual",
    "estado actual",
    "agora mesmo",
    "neste momento",
    "last execution",
    "last run",
    "latest run",
    "current state",
    "right now",
];

/// Subject markers that scope an operational question to the VALIDATION JOURNEY (or a step of it).
/// Required (alongside a duration/metric marker) for an operational classification — this is what makes
/// "quanto tempo leva uma jornada de validação" operational while "quanto tempo tenho para pagar" is not.
pub(crate) const VALIDATION_JOURNEY_MARKERS: &[&str] = &[
    "jornada de validacao",
    "jornada completa",
    "jornada de nove",
    "jornada dos nove",
    "nove passos",
    "9 passos",
    "nove etapas",
    "validation journey",
    "full journey",
    "nine step",
    "nine-step",
    "validacao completa",
    "uma jornada",
    "a jornada",
    "a validacao",
    "de validacao",
    "the validation",
];

/// True when the normalized text contains any marker in `set`.
pub(crate) fn any_hit(nq: &str, set: &[&str]) -> bool {
    set.iter().any(|m| nq.contains(m))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn taxonomy_is_unique_and_nonempty() {
        let unique: std::collections::BTreeSet<&&str> = PRIMARY_INTENTS.iter().collect();
        assert_eq!(unique.len(), PRIMARY_INTENTS.len(), "duplicate intent");
        assert!(unique.len() >= 21, "the canonical taxonomy is present");
        for op in ["get_duration", "get_metric", "get_live_state"] {
            assert!(
                PRIMARY_INTENTS.contains(&op),
                "operational intent {op} present"
            );
        }
        assert!(
            ENTITY_TYPES.contains(&""),
            "entity types include the no-entity value"
        );
    }

    #[test]
    fn markers_match_normalized_substrings() {
        assert!(any_hit(
            "diferenca entre a adr-002 e a adr-006",
            COMPARE_MARKERS
        ));
        assert!(any_hit("adr", DOC_MARKERS));
        assert!(any_hit(
            "qual a regra que impede saldo negativo",
            LOCATE_MARKERS
        ));
        assert!(any_hit(
            "quem pode propor mudancas ao protocolo",
            GOVERNANCE_MARKERS
        ));
        assert!(any_hit("a decisao ja foi aceite", STATUS_MARKERS));
        assert!(!any_hit("o que e a federacao", LOCATE_MARKERS));
    }
}
