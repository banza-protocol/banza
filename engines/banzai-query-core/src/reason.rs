//! M2.18B.7 — the closed, versioned set of reason codes that explain WHY BanzAI produced a given public
//! answer class. A single generic "insufficient evidence" reason must never stand in for causes that are
//! semantically different (an undeclared attribute, an ambiguous entity, an absent document, an internal
//! coverage failure, a runtime failure …). Each variant maps to exactly one cause; the public message and
//! the answer class are derived from it, and an INTERNAL coverage failure (a known entity with an existing
//! source that still yields an empty package) is NEVER surfaced as a legitimate lack of evidence.
//!
//! Pure, total, deterministic. No model, no I/O.

/// The reason a public answer took the class it did. Fixed order; add variants deliberately.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReasonCode {
    // Answered outcomes
    ExactFactConfirmed,
    CanonicalDefinitionResolved,
    ExplanationGrounded,
    // ADR-078 — operational reasoning answered from real telemetry (read-only)
    OperationalMeasurementReported,
    // Under-specified — a clarification is the correct outcome
    AmbiguousEntity,
    AmbiguousAttribute,
    // Legitimate "cannot answer" — an honest, precise decline (never the generic topic list)
    EntityNotFound,
    AttributeNotDeclared,
    CanonicalSourceMissing,
    UnsupportedExternalFact,
    /// ADR-078 — an operational (duration/metric) question was understood but there are not enough
    /// comparable, completed public executions to compute a value. An honest, request-oriented decline —
    /// NEVER the generic topic list and NEVER a fabricated number.
    InsufficientMeasurements,
    // INTERNAL coverage failures — NEVER a silent public generic answer; a red test + operational alert
    SourceExistsButNotResolved,
    RetrievalNoEligibleSource,
    FactualPackageEmpty,
    SourceConflict,
    // Safety / input
    BoundaryBlocked,
    MalformedRequest,
    // Runtime
    ModelUnavailable,
    QueueFull,
    SynthesisTimeout,
    SynthesisInvalid,
    ValidationRejected,
    IndexVersionMismatch,
    CacheVersionMismatch,
}

impl ReasonCode {
    /// The stable SCREAMING_SNAKE_CASE wire form (telemetry + the public trace's reason field).
    pub fn as_str(&self) -> &'static str {
        match self {
            ReasonCode::ExactFactConfirmed => "EXACT_FACT_CONFIRMED",
            ReasonCode::CanonicalDefinitionResolved => "CANONICAL_DEFINITION_RESOLVED",
            ReasonCode::ExplanationGrounded => "EXPLANATION_GROUNDED",
            ReasonCode::OperationalMeasurementReported => "OPERATIONAL_MEASUREMENT_REPORTED",
            ReasonCode::AmbiguousEntity => "AMBIGUOUS_ENTITY",
            ReasonCode::AmbiguousAttribute => "AMBIGUOUS_ATTRIBUTE",
            ReasonCode::EntityNotFound => "ENTITY_NOT_FOUND",
            ReasonCode::AttributeNotDeclared => "ATTRIBUTE_NOT_DECLARED",
            ReasonCode::CanonicalSourceMissing => "CANONICAL_SOURCE_MISSING",
            ReasonCode::UnsupportedExternalFact => "UNSUPPORTED_EXTERNAL_FACT",
            ReasonCode::InsufficientMeasurements => "INSUFFICIENT_MEASUREMENTS",
            ReasonCode::SourceExistsButNotResolved => "SOURCE_EXISTS_BUT_NOT_RESOLVED",
            ReasonCode::RetrievalNoEligibleSource => "RETRIEVAL_NO_ELIGIBLE_SOURCE",
            ReasonCode::FactualPackageEmpty => "FACTUAL_PACKAGE_EMPTY",
            ReasonCode::SourceConflict => "SOURCE_CONFLICT",
            ReasonCode::BoundaryBlocked => "BOUNDARY_BLOCKED",
            ReasonCode::MalformedRequest => "MALFORMED_REQUEST",
            ReasonCode::ModelUnavailable => "MODEL_UNAVAILABLE",
            ReasonCode::QueueFull => "QUEUE_FULL",
            ReasonCode::SynthesisTimeout => "SYNTHESIS_TIMEOUT",
            ReasonCode::SynthesisInvalid => "SYNTHESIS_INVALID",
            ReasonCode::ValidationRejected => "VALIDATION_REJECTED",
            ReasonCode::IndexVersionMismatch => "INDEX_VERSION_MISMATCH",
            ReasonCode::CacheVersionMismatch => "CACHE_VERSION_MISMATCH",
        }
    }

    /// True for the INTERNAL coverage failures that must be caught as bugs, never shown as a legitimate
    /// lack of evidence. Used by the coverage engine/guard + tests.
    pub fn is_internal_coverage_failure(&self) -> bool {
        matches!(
            self,
            ReasonCode::SourceExistsButNotResolved
                | ReasonCode::RetrievalNoEligibleSource
                | ReasonCode::FactualPackageEmpty
        )
    }

    /// Increment 5 (§10) — the canonical, public-safe PT explanation of WHAT the code means. This is the
    /// code's OWN definition (drawn from its role above), not a per-question canned string: the get_reason_code
    /// family answers from exactly this text, grounded in the reason-code registry (reason.rs). Total: every
    /// variant has a definition.
    pub fn explanation(&self) -> &'static str {
        match self {
            ReasonCode::ExactFactConfirmed => {
                "Um facto exacto (estado, data, identificador, versão, licença ou origem) foi confirmado \
determinamente por Rust e ligado à sua fonte canónica — sem chamada ao modelo."
            }
            ReasonCode::CanonicalDefinitionResolved => {
                "Uma definição canónica, ligada à sua fonte, foi resolvida sem modelo (um terminal \
determinístico), em vez de uma explicação gerada."
            }
            ReasonCode::ExplanationGrounded => {
                "Uma explicação foi produzida a partir de um FactualPackage (evidência canónica) e validada \
pelo verificador factual antes de ser publicada."
            }
            ReasonCode::OperationalMeasurementReported => {
                "Uma medição operacional (duração/métrica) foi reportada a partir de telemetria de execuções \
persistidas, apenas leitura, sem qualquer número vindo do modelo."
            }
            ReasonCode::AmbiguousEntity => {
                "A entidade referida é ambígua — há mais do que um candidato possível — pelo que a resposta \
correcta é uma pergunta de clarificação, nunca uma escolha silenciosa."
            }
            ReasonCode::AmbiguousAttribute => {
                "O atributo pedido é ambíguo (por exemplo, sem agregação ou enquadramento temporal), pelo que \
se pede clarificação em vez de adivinhar."
            }
            ReasonCode::EntityNotFound => {
                "A entidade ou documento nomeado não existe no índice/registo actual — um declínio honesto que \
nomeia o alvo, nunca um documento inventado."
            }
            ReasonCode::AttributeNotDeclared => {
                "O atributo pedido não está declarado para a entidade; não é inferido de datas de git, commit, \
ficheiro, deploy ou domínio — declara-se honestamente que não está registado."
            }
            ReasonCode::CanonicalSourceMissing => {
                "Não existe fonte canónica pública suficiente para responder com segurança; prefere-se não \
adivinhar e pedir o identificador ou reformulação."
            }
            ReasonCode::UnsupportedExternalFact => {
                "O pedido depende de um facto externo ao protocolo BANZA (fora do âmbito das suas regras, \
decisões, contratos e execuções de validação)."
            }
            ReasonCode::InsufficientMeasurements => {
                "A pergunta operacional foi compreendida, mas não há execuções públicas comparáveis suficientes \
(mesmo perfil, ambiente e versão) para calcular um valor — um declínio honesto, nunca um número inventado."
            }
            ReasonCode::SourceExistsButNotResolved => {
                "FALHA INTERNA de cobertura: existe uma fonte canónica mas a resolução não a alcançou. É um \
defeito a corrigir, nunca apresentado como falta legítima de evidência."
            }
            ReasonCode::RetrievalNoEligibleSource => {
                "FALHA INTERNA de cobertura: a recuperação não encontrou nenhuma fonte elegível para uma \
pergunta que devia ter cobertura. É um defeito a corrigir, não uma falta legítima de evidência."
            }
            ReasonCode::FactualPackageEmpty => {
                "FALHA INTERNA de cobertura: o FactualPackage ficou vazio para uma entidade com fonte \
declarada. É um defeito a corrigir, não uma falta legítima de evidência."
            }
            ReasonCode::SourceConflict => {
                "Existe um conflito documental (por exemplo, uma decisão substituída por outra) que a resolução \
tratou, distinguindo a fonte vigente da histórica."
            }
            ReasonCode::BoundaryBlocked => {
                "O pedido cruzou um limite de segurança (acção financeira, exposição de segredo/chave, injeção \
ou pedido de autoridade normativa) — recusa honesta, decidida antes de qualquer ferramenta ou modelo."
            }
            ReasonCode::MalformedRequest => {
                "O pedido está malformado ou incompleto para a operação pretendida."
            }
            ReasonCode::ModelUnavailable => {
                "O modelo local de síntese não estava disponível; a resposta degrada para uma fundamentação \
determinística e sourced, nunca para um valor inventado."
            }
            ReasonCode::QueueFull => {
                "A fila de inferência está no limite de capacidade (backpressure); o pedido é recusado com uma \
mensagem profissional, nunca com um resultado fabricado."
            }
            ReasonCode::SynthesisTimeout => {
                "A síntese excedeu o tempo limite — distinto de um modelo indisponível — e degrada para a \
fundamentação determinística."
            }
            ReasonCode::SynthesisInvalid => {
                "A saída da síntese não passou o validador factual (afirmação sem suporte, estimativa/hipótese \
não rotulada, cálculo não derivado ou citação morta) e não foi publicada."
            }
            ReasonCode::ValidationRejected => {
                "A resposta foi rejeitada pelo validador de autoridade/conteúdo (por exemplo, uma alegação de \
autoridade normativa ou uma fuga de conteúdo interno) e não foi publicada."
            }
            ReasonCode::IndexVersionMismatch => {
                "A versão do índice do corpus não corresponde à esperada; a cache é invalidada em vez de servir \
uma resposta desactualizada."
            }
            ReasonCode::CacheVersionMismatch => {
                "A versão do contrato/cache não corresponde; a resposta em cache é invalidada em vez de servida."
            }
        }
    }

    /// Increment 5 (§10) — the public answer CLASS this code implies. Deterministic, total.
    pub fn answer_class(&self) -> &'static str {
        match self {
            ReasonCode::ExactFactConfirmed
            | ReasonCode::CanonicalDefinitionResolved
            | ReasonCode::ExplanationGrounded
            | ReasonCode::OperationalMeasurementReported => "answered",
            ReasonCode::AmbiguousEntity | ReasonCode::AmbiguousAttribute => "clarification",
            ReasonCode::EntityNotFound
            | ReasonCode::AttributeNotDeclared
            | ReasonCode::CanonicalSourceMissing
            | ReasonCode::UnsupportedExternalFact
            | ReasonCode::InsufficientMeasurements
            | ReasonCode::SourceConflict => "honest_decline",
            ReasonCode::SourceExistsButNotResolved
            | ReasonCode::RetrievalNoEligibleSource
            | ReasonCode::FactualPackageEmpty => "internal_failure",
            ReasonCode::BoundaryBlocked | ReasonCode::MalformedRequest => "safety",
            ReasonCode::ModelUnavailable
            | ReasonCode::QueueFull
            | ReasonCode::SynthesisTimeout
            | ReasonCode::SynthesisInvalid
            | ReasonCode::ValidationRejected
            | ReasonCode::IndexVersionMismatch
            | ReasonCode::CacheVersionMismatch => "runtime",
        }
    }
}

/// Increment 5 (§10) — resolve the reason code a question NAMES (its exact wire form, case-insensitive,
/// underscores preserved). Returns the longest matching code so a wire form that is a prefix of another can
/// never mis-resolve. `None` when the question names no known code (→ the family serves an honest fallback
/// that names the missing code). Pure + total; no model.
pub fn resolve_reason_code(query: &str) -> Option<ReasonCode> {
    let up: String = query
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' {
                c.to_ascii_uppercase()
            } else {
                ' '
            }
        })
        .collect();
    // Whole-token match against the uppercased, separator-normalized query so a bare word never trips a code.
    let tokens: std::collections::BTreeSet<&str> = up.split_whitespace().collect();
    let mut best: Option<ReasonCode> = None;
    for c in ALL_REASON_CODES {
        if tokens.contains(c.as_str()) {
            match best {
                Some(b) if b.as_str().len() >= c.as_str().len() => {}
                _ => best = Some(*c),
            }
        }
    }
    best
}

/// Every reason code (for the guard / truth table / tests).
pub const ALL_REASON_CODES: &[ReasonCode] = &[
    ReasonCode::ExactFactConfirmed,
    ReasonCode::CanonicalDefinitionResolved,
    ReasonCode::ExplanationGrounded,
    ReasonCode::OperationalMeasurementReported,
    ReasonCode::AmbiguousEntity,
    ReasonCode::AmbiguousAttribute,
    ReasonCode::EntityNotFound,
    ReasonCode::AttributeNotDeclared,
    ReasonCode::CanonicalSourceMissing,
    ReasonCode::UnsupportedExternalFact,
    ReasonCode::InsufficientMeasurements,
    ReasonCode::SourceExistsButNotResolved,
    ReasonCode::RetrievalNoEligibleSource,
    ReasonCode::FactualPackageEmpty,
    ReasonCode::SourceConflict,
    ReasonCode::BoundaryBlocked,
    ReasonCode::MalformedRequest,
    ReasonCode::ModelUnavailable,
    ReasonCode::QueueFull,
    ReasonCode::SynthesisTimeout,
    ReasonCode::SynthesisInvalid,
    ReasonCode::ValidationRejected,
    ReasonCode::IndexVersionMismatch,
    ReasonCode::CacheVersionMismatch,
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_forms_are_unique_and_screaming_snake() {
        let mut seen = std::collections::BTreeSet::new();
        for c in ALL_REASON_CODES {
            let s = c.as_str();
            assert!(seen.insert(s), "duplicate wire form {s}");
            assert!(
                s.chars().all(|ch| ch.is_ascii_uppercase() || ch == '_'),
                "{s} must be SCREAMING_SNAKE_CASE"
            );
        }
    }

    #[test]
    fn internal_coverage_failures_are_flagged() {
        assert!(ReasonCode::FactualPackageEmpty.is_internal_coverage_failure());
        assert!(ReasonCode::SourceExistsButNotResolved.is_internal_coverage_failure());
        assert!(!ReasonCode::AttributeNotDeclared.is_internal_coverage_failure());
        assert!(!ReasonCode::EntityNotFound.is_internal_coverage_failure());
    }

    #[test]
    fn every_code_has_a_nonempty_explanation_and_a_valid_class() {
        let classes = [
            "answered",
            "clarification",
            "honest_decline",
            "internal_failure",
            "safety",
            "runtime",
        ];
        for c in ALL_REASON_CODES {
            assert!(
                c.explanation().chars().count() > 20,
                "{} needs a real explanation",
                c.as_str()
            );
            assert!(
                classes.contains(&c.answer_class()),
                "{} class {} out of range",
                c.as_str(),
                c.answer_class()
            );
        }
        // internal coverage failures are exactly the internal_failure class.
        for c in ALL_REASON_CODES {
            assert_eq!(
                c.is_internal_coverage_failure(),
                c.answer_class() == "internal_failure",
                "{} internal-failure class mismatch",
                c.as_str()
            );
        }
    }

    #[test]
    fn resolve_reason_code_matches_the_named_wire_form() {
        assert_eq!(
            resolve_reason_code("o que significa o reason code CANONICAL_SOURCE_MISSING?"),
            Some(ReasonCode::CanonicalSourceMissing)
        );
        assert_eq!(
            resolve_reason_code("explica INSUFFICIENT_MEASUREMENTS"),
            Some(ReasonCode::InsufficientMeasurements)
        );
        // case-insensitive, underscores preserved.
        assert_eq!(
            resolve_reason_code("boundary_blocked"),
            Some(ReasonCode::BoundaryBlocked)
        );
        // a question with no code names nothing.
        assert_eq!(
            resolve_reason_code("qual o reason code deste resultado?"),
            None
        );
        assert_eq!(resolve_reason_code("UNKNOWN_MADE_UP_CODE"), None);
    }
}
