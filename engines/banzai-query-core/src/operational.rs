//! Operational-reasoning classifier (ADR-036) — the deterministic understanding step for questions about a
//! MEASURED/OBSERVED operational property of a protocol subject (how long a validation journey takes, the
//! slowest step, the median/p95 duration, the last observed run).
//!
//! This is the fix for the demonstrated failure class: "Quanto tempo leva uma jornada completa de
//! validação?" must NOT fall to the fixed topic list. It is classified here as an operational question and
//! the pipeline answers it from REAL telemetry over persisted executions (read-only) — or declines honestly
//! with `INSUFFICIENT_MEASUREMENTS`. Never a fabricated number.
//!
//! Pure + total: no I/O, no state, no model call. Gating is conservative — a question is operational only
//! when it carries BOTH a duration/metric/live-state marker AND a validation-journey subject marker, so an
//! off-topic "quanto tempo tenho para pagar" (no protocol subject) is never mis-scoped as operational and a
//! boundary/safety question is deferred to the upstream tiers.

use crate::intent::{
    any_hit, DURATION_MARKERS, LIVE_STATE_MARKERS, METRIC_MARKERS, VALIDATION_JOURNEY_MARKERS,
};
use serde::{Deserialize, Serialize};

/// Per-step markers → the question is about a STEP of the journey, not the whole journey.
const PER_STEP_MARKERS: &[&str] = &[
    "por etapa",
    "por passo",
    "per step",
    "per-step",
    "cada etapa",
    "cada passo",
    "de cada etapa",
    "etapa mais",
    "passo mais",
];
/// "slowest step" family.
const SLOWEST_MARKERS: &[&str] = &[
    "mais lento",
    "mais lenta",
    "slowest",
    "etapa mais lenta",
    "passo mais lento",
    "demora mais",
    "leva mais tempo",
];
/// Comparison markers (reuse of the compare family, kept local to avoid coupling to the doc-compare set).
const COMPARISON_MARKERS: &[&str] = &[
    "compara",
    "comparar",
    " versus ",
    " vs ",
    "anterior",
    "em relacao a",
    "face a",
    "diferenca de tempo",
];

/// The deterministic operational decision serialized to the JS layer (Rust decides, TS transports).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OperationalDecision {
    /// True only when the question is classified as operational (both marker classes present).
    pub is_operational: bool,
    /// get_duration | get_metric | get_live_state | "" (not operational).
    pub intent: String,
    /// validation_journey | validation_step | "".
    pub subject: String,
    /// elapsed_time | per_step | slowest_step | "".
    pub metric: String,
    /// "" (summary) | latest | average | median | p95 | comparison.
    pub aggregation: String,
    /// The answer must come from real execution telemetry (read-only), never invented.
    pub requires_live_data: bool,
    /// none | telemetry — the class of authority the answer requires.
    pub authority_requirement: String,
    /// "" | INSUFFICIENT_MEASUREMENTS — set by the pipeline when telemetry has no comparable data.
    pub reason_code: String,
    /// RESOLVED | NOT_OPERATIONAL.
    pub resolution_state: String,
    /// A deterministic, honest, request-oriented fallback (PT markdown, 0 numbers) the pipeline serves when
    /// telemetry returns no comparable data — NEVER the fixed topic list.
    pub honest_fallback: String,
}

impl OperationalDecision {
    fn not_operational() -> Self {
        OperationalDecision {
            is_operational: false,
            intent: String::new(),
            subject: String::new(),
            metric: String::new(),
            aggregation: String::new(),
            requires_live_data: false,
            authority_requirement: "none".to_string(),
            reason_code: String::new(),
            resolution_state: "NOT_OPERATIONAL".to_string(),
            honest_fallback: String::new(),
        }
    }
}

/// Classify a question into an [`OperationalDecision`]. Conservative gate (see module docs). No model call.
pub fn resolve_operational_metric(question: &str) -> OperationalDecision {
    // Defer any boundary/safety question to the upstream tiers — naming "jornada de validação" must never
    // buy past a refusal.
    if crate::boundary::evaluate(question).boundary_detected {
        return OperationalDecision::not_operational();
    }
    let nq = crate::normalize(question);

    let has_duration = any_hit(&nq, DURATION_MARKERS);
    let has_metric = any_hit(&nq, METRIC_MARKERS);
    let has_live = any_hit(&nq, LIVE_STATE_MARKERS);
    let has_subject = any_hit(&nq, VALIDATION_JOURNEY_MARKERS);

    // BOTH classes required: a measurement marker AND a validation-journey subject.
    if !(has_subject && (has_duration || has_metric || has_live)) {
        return OperationalDecision::not_operational();
    }

    // subject: a step-scoped marker narrows to a single step of the journey.
    let per_step = any_hit(&nq, PER_STEP_MARKERS) || any_hit(&nq, SLOWEST_MARKERS);
    let subject = if per_step {
        "validation_step"
    } else {
        "validation_journey"
    };

    // metric
    let metric = if any_hit(&nq, SLOWEST_MARKERS) {
        "slowest_step"
    } else if any_hit(&nq, PER_STEP_MARKERS) {
        "per_step"
    } else {
        "elapsed_time"
    };

    // aggregation (order: explicit statistic > latest > comparison > summary)
    let aggregation = if nq.contains("mediana") || nq.contains("median") {
        "median"
    } else if nq.contains("percentil")
        || nq.contains("p95")
        || nq.contains("p99")
        || nq.contains("percentile")
    {
        "p95"
    } else if nq.contains("media") || nq.contains("average") || nq.contains("em media") {
        "average"
    } else if any_hit(&nq, LIVE_STATE_MARKERS) {
        "latest"
    } else if any_hit(&nq, COMPARISON_MARKERS) {
        "comparison"
    } else {
        ""
    };

    // intent: a statistical/step/comparison request is a METRIC; a plain "how long" is a DURATION; a bare
    // "what happened last" is LIVE_STATE.
    let intent = if has_metric
        || per_step
        || aggregation == "comparison"
        || aggregation == "median"
        || aggregation == "p95"
        || aggregation == "average"
    {
        "get_metric"
    } else if has_duration {
        "get_duration"
    } else {
        "get_live_state"
    };

    OperationalDecision {
        is_operational: true,
        intent: intent.to_string(),
        subject: subject.to_string(),
        metric: metric.to_string(),
        aggregation: aggregation.to_string(),
        requires_live_data: true,
        authority_requirement: "telemetry".to_string(),
        reason_code: String::new(),
        resolution_state: "RESOLVED".to_string(),
        honest_fallback: honest_fallback(intent, subject),
    }
}

/// Deterministic, honest, request-oriented fallback (PT markdown, ZERO numbers) — the replacement for the
/// fixed topic list. States: (1) interpreted intent, (2) data needed, (3) sources consulted, (4) what can
/// be affirmed without a measurement, (5) which tool would obtain it, (6) the remaining limitation.
pub fn honest_fallback(intent: &str, subject: &str) -> String {
    let interp = match (intent, subject) {
        ("get_metric", "validation_step") => {
            "a duração das etapas de uma jornada de validação (uma medição operacional)"
        }
        ("get_metric", _) => {
            "uma métrica de desempenho da jornada de validação (uma medição operacional)"
        }
        ("get_live_state", _) => "o estado observado da última execução de validação",
        _ => "a duração de uma jornada de validação (uma medição operacional, não um conceito do protocolo)",
    };
    format!(
        "Interpretei o teu pedido como uma pergunta sobre **{interp}**.\n\n\
Para responder com um valor fiável preciso de **execuções de validação concluídas** no mesmo perfil, \
ambiente e versão do protocolo — a duração depende da disponibilidade dos artefactos, da latência da \
origem canónica, dos *timeouts* e dos passos aplicáveis ao perfil.\n\n\
Consultei a **telemetria de execuções persistidas** (apenas leitura, execuções públicas). Ainda **não \
existem execuções públicas comparáveis suficientes** para calcular um valor representativo, por isso \
**não invento um número**.\n\n\
O que posso afirmar sem medição: a jornada tem **nove etapas** (discovery, manifest, keys, conformidade, \
interoperabilidade, confiança, federação, evidence bundle e prontidão de certificação) e a duração \
observada de cada execução fica registada no respectivo **JourneyReceipt**.\n\n\
Assim que existir uma execução pública concluída, mostro a **duração observada** dessa execução e, com \
várias execuções comparáveis, a **mediana** e o **percentil 95** — distinguindo sempre uma observação \
individual de uma média."
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reproduced_bug_classifies_as_duration() {
        let d = resolve_operational_metric("Quanto tempo leva uma jornada completa de validação?");
        assert!(d.is_operational);
        assert_eq!(d.intent, "get_duration");
        assert_eq!(d.subject, "validation_journey");
        assert_eq!(d.metric, "elapsed_time");
        assert!(d.requires_live_data);
        assert_eq!(d.authority_requirement, "telemetry");
        assert_eq!(d.resolution_state, "RESOLVED");
        // honest fallback is request-oriented, names nine steps, invents no number, is NOT the fixed list
        assert!(d.honest_fallback.contains("nove etapas"));
        assert!(!d
            .honest_fallback
            .contains("Posso responder, com base nas fontes"));
    }

    #[test]
    fn slowest_step_is_metric_step_scoped() {
        let d = resolve_operational_metric("Qual a etapa mais lenta da validação e quanto demora?");
        assert!(d.is_operational);
        assert_eq!(d.intent, "get_metric");
        assert_eq!(d.subject, "validation_step");
        assert_eq!(d.metric, "slowest_step");
    }

    #[test]
    fn comparison_of_last_two_runs() {
        let d = resolve_operational_metric(
            "Compara a duração da última execução da jornada de validação com a anterior.",
        );
        assert!(d.is_operational);
        // "última" → latest wins in the aggregation ladder, but it is still a comparison-shaped ask.
        assert!(d.aggregation == "comparison" || d.aggregation == "latest");
        assert!(d.requires_live_data);
    }

    #[test]
    fn median_and_percentile() {
        assert_eq!(
            resolve_operational_metric("Qual a duração mediana de uma jornada de validação?")
                .aggregation,
            "median"
        );
        assert_eq!(
            resolve_operational_metric("Qual o percentil 95 da duração da jornada de validação?")
                .aggregation,
            "p95"
        );
    }

    #[test]
    fn per_step_duration() {
        let d = resolve_operational_metric("Mostra a duração por etapa da jornada de validação.");
        assert!(d.is_operational);
        assert_eq!(d.subject, "validation_step");
        assert_eq!(d.metric, "per_step");
    }

    #[test]
    fn english_variant() {
        let d = resolve_operational_metric("How long does a full validation journey take?");
        assert!(d.is_operational);
        assert_eq!(d.intent, "get_duration");
    }

    #[test]
    fn off_topic_duration_is_not_operational() {
        // duration marker but NO validation-journey subject → declines honestly upstream, never operational
        for q in [
            "Quanto tempo tenho para pagar uma fatura?",
            "Quanto tempo demora uma transferência bancária?",
            "How long is the ADR review process?",
        ] {
            let d = resolve_operational_metric(q);
            assert!(!d.is_operational, "{q} must not be operational");
            assert_eq!(d.resolution_state, "NOT_OPERATIONAL", "{q}");
        }
    }

    #[test]
    fn subject_without_measurement_is_not_operational() {
        // "o que é a jornada de validação" is a concept question, not operational
        let d = resolve_operational_metric("O que é a jornada de validação?");
        assert!(!d.is_operational);
    }
}
