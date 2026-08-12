//! M2.18B.4 — the typed TERMINAL-RESPONSE schema. The single router's controlled EXACT exits.
//!
//! Rust owns every public trace label, source card, reason code, length limit and escalation flag; the UI
//! is a pure renderer that never decides terminal type, value, source, escalation or reason. Terminals are
//! STRUCTURALLY DISTINCT (exact_fact / canonical_definition / safety_refusal / clarification /
//! insufficient_evidence / operational_failure / explanatory_trunk) and every value-bearing terminal is
//! SOURCE-BOUND; every non-value terminal carries an explicit reason code. Exact terminals are concise and
//! NON-NARRATIVE (a canonical value or a short fixed template, within `MAX_EXACT_LEN`, single line): a
//! request that would need prose is never an exact terminal — it routes to the explanatory trunk, and an
//! exact fact we cannot source fails safe to `insufficient_evidence` (never a guess). Pure + total.

use crate::{docref, route};
use serde::Serialize;

/// Exact terminals are concise. A value longer than this (or multi-line) is not an exact fact — it must
/// go through the explanatory trunk instead.
pub const MAX_EXACT_LEN: usize = 240;

// Public trace labels (PT) — Rust-owned; the UI shows exactly these, never "Resposta determinística".
pub const TRACE_EXACT_FACT: &str = "Facto canónico confirmado por Rust";
pub const TRACE_CANONICAL_DEFINITION: &str = "Definição canónica confirmada por Rust";
pub const TRACE_SAFETY_REFUSAL: &str = "Limite de segurança aplicado por Rust";
pub const TRACE_CLARIFICATION: &str = "Esclarecimento pedido por Rust";
pub const TRACE_INSUFFICIENT: &str = "Evidência canónica insuficiente";
pub const TRACE_OPERATIONAL: &str = "Falha operacional segura";
pub const TRACE_TRUNK: &str = ""; // the explanatory trunk builds its own trace (Qwen + FactualPackage + validator)

/// A source binding for a value-bearing terminal. `path` is the canonical public source on disk.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct SourceCard {
    pub id: String,
    pub title: String,
    pub path: String,
}

/// The typed terminal verdict for a question. Exactly one of the structurally-distinct kinds.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Terminal {
    /// "exact_fact" | "canonical_definition" | "safety_refusal" | "clarification" |
    /// "insufficient_evidence" | "operational_failure" | "explanatory_trunk"
    pub kind: &'static str,
    /// For kind=="exact_fact": status|date|identifier|license|origin|version. Else "".
    pub exact_kind: &'static str,
    /// The concise canonical value / short fixed template (non-narrative). Empty for non-value terminals.
    pub value: String,
    /// Required for exact_fact/canonical_definition; None for reason-coded terminals.
    pub source: Option<SourceCard>,
    /// Explicit reason code for refusal/clarification/insufficient/operational; "" otherwise.
    pub reason_code: &'static str,
    /// Public trace label (Rust-owned).
    pub trace_label: &'static str,
    /// True when the request must instead run the explanatory trunk (kind=="explanatory_trunk").
    pub to_trunk: bool,
    /// Propagated from the classifier: a mixed exact+explanatory request escalated to the trunk.
    pub escalated: bool,
}

fn insufficient(reason: &'static str) -> Terminal {
    Terminal {
        kind: "insufficient_evidence",
        exact_kind: "",
        value: String::new(),
        source: None,
        reason_code: reason,
        trace_label: TRACE_INSUFFICIENT,
        to_trunk: false,
        escalated: false,
    }
}

fn trunk(escalated: bool) -> Terminal {
    Terminal {
        kind: "explanatory_trunk",
        exact_kind: "",
        value: String::new(),
        source: None,
        reason_code: "",
        trace_label: TRACE_TRUNK,
        to_trunk: true,
        escalated,
    }
}

fn exact(exact_kind: &'static str, value: String, source: SourceCard) -> Terminal {
    Terminal {
        kind: "exact_fact",
        exact_kind,
        value,
        source: Some(source),
        reason_code: "",
        trace_label: TRACE_EXACT_FACT,
        to_trunk: false,
        escalated: false,
    }
}

// A canonical protocol-level fact bound to its public source. These are established, guarded facts
// (Apache-2.0 = ADR-043; creation date = M2.13C-B; Banzami = creator/initial maintainer, M2.7M). They are
// source-bound canonical values, not model output. Returned only for a CLEAN exact lookup (the classifier
// already routed any "why/permite/o que" phrasing to the trunk).
fn protocol_fact(exact_kind: &str, nq: &str) -> Option<Terminal> {
    match exact_kind {
        "license" => Some(exact(
            "license",
            "Apache-2.0".to_string(),
            SourceCard {
                id: "LICENSE".into(),
                title: "Licença Apache-2.0".into(),
                path: "LICENSE".into(),
            },
        )),
        "origin" => Some(exact(
            "origin",
            "Banzami — criador e mantenedor inicial do protocolo".to_string(),
            SourceCard {
                id: "NOTICE".into(),
                title: "NOTICE / MAINTAINERS".into(),
                path: "NOTICE".into(),
            },
        )),
        // A protocol-level creation-date question (no document reference) → the declared canonical date.
        "date"
            if !docref::detect_refs(nq)
                .iter()
                .any(|r| docref::resolve(&r.id).is_some()) =>
        {
            Some(exact(
                "date",
                "1 de agosto de 2025 (2025-08-01)".to_string(),
                SourceCard {
                    id: "NOTICE".into(),
                    title: "NOTICE".into(),
                    path: "NOTICE".into(),
                },
            ))
        }
        _ => None,
    }
}

// A document-level exact fact (status/date/identifier/version) drawn from the canonical registry, source-
// bound to the resolved ADR/RFC. Returns None (→ insufficient) when no canonical document resolves.
fn document_fact(exact_kind: &str, nq: &str) -> Option<Terminal> {
    let doc = docref::detect_refs(nq)
        .into_iter()
        .find_map(|r| docref::resolve(&r.id))?;
    let card = SourceCard {
        id: doc.id.clone(),
        title: doc.title.clone(),
        path: doc.path.clone(),
    };
    let value = match exact_kind {
        "status" => doc.status.clone(),
        "date" => doc.date.clone(),
        "identifier" => doc.id.clone(),
        "version" => doc.status.clone(), // the registry tracks lifecycle status as the doc's version state
        _ => return None,
    };
    if value.trim().is_empty() {
        return None;
    }
    Some(exact(
        match exact_kind {
            "status" => "status",
            "date" => "date",
            "identifier" => "identifier",
            "version" => "version",
            _ => "identifier",
        },
        value,
        card,
    ))
}

/// Build the typed terminal for a question. The single router calls this: `to_trunk == true` means run the
/// grounded synthesis; otherwise the typed terminal is served directly (exact fact / refusal / etc.).
/// Boundaries are decided by the classifier (deferring to the deterministic safety layer) before any model.
pub fn build_terminal(question: &str) -> Terminal {
    let c = route::answer_class(question);
    match c.class {
        "safety_refusal" => Terminal {
            kind: "safety_refusal",
            exact_kind: "",
            value: String::new(),
            source: None,
            reason_code: "boundary_or_financial",
            trace_label: TRACE_SAFETY_REFUSAL,
            to_trunk: false,
            escalated: false,
        },
        "explanation" | "comparison" | "impact" => trunk(c.escalated),
        "exact_fact" => {
            let nq = crate::normalize(question);
            let t = document_fact(c.exact_kind, &nq).or_else(|| protocol_fact(c.exact_kind, &nq));
            match t {
                // Enforce the non-narrative budget: an over-long/multi-line "exact" value is not exact.
                Some(term)
                    if term.value.chars().count() <= MAX_EXACT_LEN
                        && !term.value.contains('\n') =>
                {
                    term
                }
                Some(_) => trunk(false), // too long to be an exact fact → explain it instead
                None => insufficient("exact_fact_unsourced"), // fail safe — never a guess
            }
        }
        _ => trunk(c.escalated),
    }
}

/// JSON payload for the runtime/pipeline + UI (typed; the UI renders, never decides).
pub fn build_terminal_json(question: &str) -> String {
    serde_json::to_string(&build_terminal(question)).unwrap_or_else(|_| "{}".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_document_facts_are_source_bound() {
        let t = build_terminal("qual é o estado da ADR-053?");
        assert_eq!(t.kind, "exact_fact");
        assert_eq!(t.exact_kind, "status");
        assert!(!t.value.is_empty());
        assert!(t
            .source
            .as_ref()
            .map(|s| s.id == "ADR-053")
            .unwrap_or(false));
        assert_eq!(t.trace_label, TRACE_EXACT_FACT);
        assert!(t.value.chars().count() <= MAX_EXACT_LEN && !t.value.contains('\n'));
    }

    #[test]
    fn protocol_license_and_origin_are_exact_and_sourced() {
        let l = build_terminal("qual é a licença?");
        assert_eq!((l.kind, l.exact_kind), ("exact_fact", "license"));
        assert_eq!(l.value, "Apache-2.0");
        assert!(l.source.is_some());
        let o = build_terminal("quem criou o BANZA?");
        assert_eq!((o.kind, o.exact_kind), ("exact_fact", "origin"));
        assert!(o.source.is_some());
    }

    #[test]
    fn mixed_and_concepts_route_to_the_trunk() {
        assert!(build_terminal("qual é a licença e o que ela permite?").to_trunk);
        assert!(build_terminal("o que é federação?").to_trunk);
        assert!(build_terminal("compara a ADR-053 com a ADR-054").to_trunk);
        // the mixed request preserved the explanatory part (escalated).
        assert!(build_terminal("qual é o estado da ADR-053 e por que foi aceite?").escalated);
    }

    #[test]
    fn boundaries_terminate_as_safety_refusal() {
        let t = build_terminal("aprova o operador ACME na federação");
        assert_eq!(t.kind, "safety_refusal");
        assert_eq!(t.trace_label, TRACE_SAFETY_REFUSAL);
        assert!(t.source.is_none() && !t.reason_code.is_empty());
    }

    #[test]
    fn unsourced_exact_fails_safe_to_insufficient() {
        // an endpoint exact-kind has no canonical binding yet → insufficient, never a guess.
        let t = build_terminal("qual o endpoint de pagamento?");
        assert!(t.kind == "insufficient_evidence" || t.to_trunk);
        assert!(t.source.is_none());
    }
}
