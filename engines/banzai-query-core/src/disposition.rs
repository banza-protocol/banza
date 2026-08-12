//! SPR-1 — the typed foundation for the BanzAI "Safe Progressive Response" (additive; wires no runtime).
//!
//! This module defines TWO typed, versioned contracts and a pure classifier, so a later increment can
//! stream deterministic progress + verified facts to the UI WITHOUT ever emitting unvalidated model prose:
//!
//!   1. [`ResponseDisposition`] — the typed FINAL disposition of an answer, derived from the existing
//!      resolution/intent (a boundary/refusal, a deterministic terminal, a validated model synthesis, an
//!      honest fallback, a clarification, or an insufficient-data outcome). The UI reacts to this typed
//!      disposition — never to the raw `grounded` boolean — so the "is this a model answer?" decision is
//!      one Rust classification, not scattered JS.
//!   2. [`ProgressEventKind`] — the versioned, closed set of progress-event kinds the future SSE stream
//!      may emit. The schema token is [`PROGRESS_SCHEMA_TOKEN`] (`banzai-progress/1`).
//!
//! SAFETY / PRIVACY INVARIANTS (enforced by tools/check-banzai-progress-contract.sh):
//!   * There is deliberately NO model-token / delta / partial-prose event kind. The whole point of Safe
//!     Progressive Response is that raw model text NEVER reaches the client before the mandatory claim +
//!     citation validation. Progress is deterministic (ids/enums/counts/hashes/durations) up to the
//!     terminal `FINAL_VALIDATED` / `HONEST_FALLBACK` / `REFUSED` event — the validated answer only ever
//!     arrives once, whole and checked.
//!   * Every progress event carries ONLY public-safe data: stable ids, closed enums, counts, content
//!     hashes and durations. It NEVER carries a prompt, chain-of-thought, secrets, cookies, access
//!     tokens, private content, or raw model text.
//!   * [`BoundaryContext`] carries only the safe, public boundary FACTS — an `is_boundary` flag, a coarse
//!     `boundary_kind` enum and a `refused` flag. It never echoes the user's text (no matched verb/object),
//!     never a prompt, never a secret. The UI can render "recusa de segurança" from the enum alone.
//!
//! Pure + total + deterministic: no model, no I/O, no state.

use crate::boundary::BoundaryDecision;
use serde::{Deserialize, Serialize};

// ── The versioned progressive-event contract ─────────────────────────────────────────────────────────

/// The contract family name (stable across minor additions within a major version).
pub const PROGRESS_CONTRACT_NAME: &str = "banzai-progress";
/// The contract MAJOR version. Bump only on a breaking change to the event-kind set or event payload.
pub const PROGRESS_CONTRACT_VERSION: u32 = 1;
/// The schema version TOKEN the SSE stream stamps on every event (`banzai-progress/1`).
pub const PROGRESS_SCHEMA_TOKEN: &str = "banzai-progress/1";

/// The exact, closed set of progressive-event kinds the SSE stream may emit. The wire form is
/// SCREAMING_SNAKE_CASE. There is intentionally NO model-token / delta / partial-prose kind: no
/// unvalidated model text is ever streamed — the validated answer arrives once, at the terminal event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProgressEventKind {
    /// The request was accepted and normalized (an id + timestamp).
    RequestAccepted,
    /// The deterministic intent taxonomy resolved the primary intent (+ sub-intents).
    IntentResolved,
    /// The entity/artifact/scope resolver settled the subject entity.
    EntityResolved,
    /// The deterministic tool plan (typed ToolKinds, in order) is ready.
    ToolPlanReady,
    /// A planned tool started executing.
    ToolStarted,
    /// A planned tool completed (a count/hash/duration, never its raw payload).
    ToolCompleted,
    /// A source (doc/registry/live artifact) was resolved (path/id/sha256, never its content).
    SourceResolved,
    /// The transversal FactualPackage is assembled (checksums + counts).
    FactualPackageReady,
    /// The single grounded synthesis (the only model call) started.
    SynthesisStarted,
    /// The single grounded synthesis finished producing text — held server-side, NOT streamed.
    SynthesisCompleted,
    /// Claim verification over the synthesized text started.
    ClaimVerificationStarted,
    /// Citation verification over the synthesized text started.
    CitationVerificationStarted,
    /// The answer passed the mandatory post-synthesis validator — the validated answer may now be sent.
    FinalValidated,
    /// The pipeline produced an honest, request-oriented fallback instead of a model answer.
    HonestFallback,
    /// The request was refused at the safety/action/publication boundary.
    Refused,
    /// The request was cancelled by the client.
    Cancelled,
    /// A terminal error occurred (a reason code, never a stack trace or secret).
    Error,
    /// The stream is complete.
    Done,
}

impl ProgressEventKind {
    /// The stable SCREAMING_SNAKE_CASE wire form (the JS mirror + the guard identifier).
    pub fn as_str(&self) -> &'static str {
        match self {
            ProgressEventKind::RequestAccepted => "REQUEST_ACCEPTED",
            ProgressEventKind::IntentResolved => "INTENT_RESOLVED",
            ProgressEventKind::EntityResolved => "ENTITY_RESOLVED",
            ProgressEventKind::ToolPlanReady => "TOOL_PLAN_READY",
            ProgressEventKind::ToolStarted => "TOOL_STARTED",
            ProgressEventKind::ToolCompleted => "TOOL_COMPLETED",
            ProgressEventKind::SourceResolved => "SOURCE_RESOLVED",
            ProgressEventKind::FactualPackageReady => "FACTUAL_PACKAGE_READY",
            ProgressEventKind::SynthesisStarted => "SYNTHESIS_STARTED",
            ProgressEventKind::SynthesisCompleted => "SYNTHESIS_COMPLETED",
            ProgressEventKind::ClaimVerificationStarted => "CLAIM_VERIFICATION_STARTED",
            ProgressEventKind::CitationVerificationStarted => "CITATION_VERIFICATION_STARTED",
            ProgressEventKind::FinalValidated => "FINAL_VALIDATED",
            ProgressEventKind::HonestFallback => "HONEST_FALLBACK",
            ProgressEventKind::Refused => "REFUSED",
            ProgressEventKind::Cancelled => "CANCELLED",
            ProgressEventKind::Error => "ERROR",
            ProgressEventKind::Done => "DONE",
        }
    }
}

/// Every progress-event kind, in fixed stream order. The set is frozen at 18; add a kind deliberately
/// (and NEVER a model-token/delta kind — see the module invariants).
pub const ALL_PROGRESS_EVENT_KINDS: &[ProgressEventKind] = &[
    ProgressEventKind::RequestAccepted,
    ProgressEventKind::IntentResolved,
    ProgressEventKind::EntityResolved,
    ProgressEventKind::ToolPlanReady,
    ProgressEventKind::ToolStarted,
    ProgressEventKind::ToolCompleted,
    ProgressEventKind::SourceResolved,
    ProgressEventKind::FactualPackageReady,
    ProgressEventKind::SynthesisStarted,
    ProgressEventKind::SynthesisCompleted,
    ProgressEventKind::ClaimVerificationStarted,
    ProgressEventKind::CitationVerificationStarted,
    ProgressEventKind::FinalValidated,
    ProgressEventKind::HonestFallback,
    ProgressEventKind::Refused,
    ProgressEventKind::Cancelled,
    ProgressEventKind::Error,
    ProgressEventKind::Done,
];

/// The full progressive-event contract as a JSON value: the family name, the major version, the schema
/// token and the ordered, closed kind set. The single source of truth the JS mirror re-exports.
pub fn progress_event_contract() -> serde_json::Value {
    serde_json::json!({
        "contract": PROGRESS_CONTRACT_NAME,
        "version": PROGRESS_CONTRACT_VERSION,
        "schema_version": PROGRESS_SCHEMA_TOKEN,
        "kinds": ALL_PROGRESS_EVENT_KINDS
            .iter()
            .map(|k| k.as_str())
            .collect::<Vec<_>>(),
    })
}

// ── The typed response disposition ───────────────────────────────────────────────────────────────────

/// The typed FINAL disposition of an answer. The UI reacts to THIS — never to the raw `grounded` boolean.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResponseDisposition {
    /// A model-synthesised answer that PASSED claim + citation validation (the single grounded trunk).
    GroundedAnswer,
    /// A deterministic terminal answer — produced by Rust, no model call.
    DeterministicAnswer,
    /// An honest, request-oriented fallback (out of scope, tool unavailable, degraded source).
    HonestFallback,
    /// A boundary/safety/action/publication refusal.
    Refused,
    /// The request is ambiguous and a concrete clarification is the correct outcome.
    Clarification,
    /// The request was understood but there is no comparable/sufficient data to answer.
    Insufficient,
}

impl ResponseDisposition {
    /// The stable SCREAMING_SNAKE_CASE wire form.
    pub fn as_str(&self) -> &'static str {
        match self {
            ResponseDisposition::GroundedAnswer => "GROUNDED_ANSWER",
            ResponseDisposition::DeterministicAnswer => "DETERMINISTIC_ANSWER",
            ResponseDisposition::HonestFallback => "HONEST_FALLBACK",
            ResponseDisposition::Refused => "REFUSED",
            ResponseDisposition::Clarification => "CLARIFICATION",
            ResponseDisposition::Insufficient => "INSUFFICIENT",
        }
    }
}

/// Every response disposition, in a fixed order (for the mirror, the guard and the tests).
pub const ALL_RESPONSE_DISPOSITIONS: &[ResponseDisposition] = &[
    ResponseDisposition::GroundedAnswer,
    ResponseDisposition::DeterministicAnswer,
    ResponseDisposition::HonestFallback,
    ResponseDisposition::Refused,
    ResponseDisposition::Clarification,
    ResponseDisposition::Insufficient,
];

// ── The safe, public boundary context ────────────────────────────────────────────────────────────────

/// A coarse boundary classification — safe to render publicly. Never echoes the user's text.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BoundaryKind {
    /// No boundary.
    #[default]
    None,
    /// A sensitive action (funds/key/governance/delete).
    Action,
    /// A general safety boundary.
    Safety,
    /// An operator publication/approval boundary (BanzAI never publishes or certifies an operator).
    OperatorPublication,
    /// A critical-severity boundary.
    Critical,
}

impl BoundaryKind {
    /// The stable snake_case wire form.
    pub fn as_str(&self) -> &'static str {
        match self {
            BoundaryKind::None => "none",
            BoundaryKind::Action => "action",
            BoundaryKind::Safety => "safety",
            BoundaryKind::OperatorPublication => "operator_publication",
            BoundaryKind::Critical => "critical",
        }
    }
}

/// The safe, public boundary facts. NO free text, NO prompt, NO secrets, NO echoed user input — only a
/// flag, a coarse kind and the refusal decision. The typed struct the UI (and the disposition) consume.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct BoundaryContext {
    /// Whether a boundary was detected.
    pub is_boundary: bool,
    /// The coarse, public boundary classification.
    pub boundary_kind: BoundaryKind,
    /// Whether the request was refused (a boundary is always a refusal).
    pub refused: bool,
}

/// Build the safe [`BoundaryContext`] from the (verbose, internal) [`BoundaryDecision`]. Deliberately
/// DROPS every free-text/echo field of the decision (matched action/object/target, trace codes) and keeps
/// only the safe flags + a coarse kind derived from the category + severity.
pub fn boundary_context_from(d: &BoundaryDecision) -> BoundaryContext {
    if !d.boundary_detected {
        return BoundaryContext::default();
    }
    let cat = d.boundary_category.as_str();
    let critical = d.severity == "critical";
    // Operator publication/approval is the most specific class; then funds/key/governance/delete →
    // Action; a critical residual → Critical; anything else detected → Safety.
    let boundary_kind = if cat.contains("publication")
        || cat.contains("approval")
        || cat.contains("certif")
        || cat.contains("aprova")
        || cat.contains("admit")
    {
        BoundaryKind::OperatorPublication
    } else if cat.contains("fund")
        || cat.contains("transfer")
        || cat.contains("pag")
        || cat.contains("key")
        || cat.contains("chave")
        || cat.contains("governance")
        || cat.contains("guard")
        || cat.contains("delete")
        || cat.contains("apaga")
        || cat.contains("remove")
    {
        BoundaryKind::Action
    } else if critical {
        BoundaryKind::Critical
    } else {
        BoundaryKind::Safety
    };
    BoundaryContext {
        is_boundary: true,
        boundary_kind,
        refused: true,
    }
}

// ── The pure disposition classifier ──────────────────────────────────────────────────────────────────

/// The typed inputs to the disposition mapping — the existing resolution facts, deserializable from the
/// pipeline as JSON. Empty strings mean "absent" (no terminal / no contextual fallback).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DispositionInput {
    /// The resolved primary intent (echoed; the classifier does not branch on it today but a later
    /// increment may, and it keeps the input self-describing).
    #[serde(default)]
    pub intent: String,
    /// Whether the answer is a validated model synthesis (grounded trunk passed post-validation).
    #[serde(default)]
    pub grounded: bool,
    /// The deterministic terminal kind that fired ("" = none). Any non-empty value means "no model".
    #[serde(default)]
    pub terminal_kind: String,
    /// The contextual-fallback kind (taxonomy.rs) when no answer was produced ("" = none).
    #[serde(default)]
    pub contextual_fallback_kind: String,
    /// The safe boundary facts (only `is_boundary`/`refused` drive the decision).
    #[serde(default)]
    pub boundary: BoundaryContext,
}

/// Map the resolution facts to the typed [`ResponseDisposition`]. Total + deterministic; safety first.
///
/// Precedence:
///   1. a boundary/refusal → [`ResponseDisposition::Refused`] (settled before anything else);
///   2. a deterministic terminal fired → [`ResponseDisposition::DeterministicAnswer`] (no model);
///   3. a validated model synthesis → [`ResponseDisposition::GroundedAnswer`];
///   4. otherwise, classify the honest, no-answer outcome from the contextual-fallback kind:
///      `ambiguous` → [`ResponseDisposition::Clarification`]; a "no comparable data" kind →
///      [`ResponseDisposition::Insufficient`]; anything else (incl. absent) →
///      [`ResponseDisposition::HonestFallback`] (never a false claim of a grounded answer).
pub fn response_disposition(input: &DispositionInput) -> ResponseDisposition {
    // 1) SAFETY FIRST.
    if input.boundary.refused || input.boundary.is_boundary {
        return ResponseDisposition::Refused;
    }
    // 2) A deterministic terminal answer (produced by Rust, no model call).
    if !input.terminal_kind.is_empty() {
        return ResponseDisposition::DeterministicAnswer;
    }
    // 3) A validated model synthesis.
    if input.grounded {
        return ResponseDisposition::GroundedAnswer;
    }
    // 4) No answer produced — the honest outcome.
    match input.contextual_fallback_kind.as_str() {
        "ambiguous" => ResponseDisposition::Clarification,
        "no_comparable_data"
        | "not_comparable"
        | "insufficient_measurements"
        | "insufficient_data" => ResponseDisposition::Insufficient,
        // out_of_scope | tool_unavailable | understood_data_missing | insufficient_source | "" | …
        _ => ResponseDisposition::HonestFallback,
    }
}

/// The WASM/JS surface: classify a DispositionInput given as JSON and echo the normalized boundary
/// context, so the future SSE terminal event carries `{disposition, boundary_context}` and nothing else.
pub fn response_disposition_for_json(input_json: &str) -> String {
    let input: DispositionInput = serde_json::from_str(input_json).unwrap_or_default();
    let disposition = response_disposition(&input);
    serde_json::json!({
        "disposition": disposition.as_str(),
        "boundary_context": input.boundary,
    })
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── the progressive-event contract ──
    #[test]
    fn event_kind_set_is_exactly_the_eighteen_in_order() {
        let got: Vec<&str> = ALL_PROGRESS_EVENT_KINDS
            .iter()
            .map(|k| k.as_str())
            .collect();
        assert_eq!(
            got,
            vec![
                "REQUEST_ACCEPTED",
                "INTENT_RESOLVED",
                "ENTITY_RESOLVED",
                "TOOL_PLAN_READY",
                "TOOL_STARTED",
                "TOOL_COMPLETED",
                "SOURCE_RESOLVED",
                "FACTUAL_PACKAGE_READY",
                "SYNTHESIS_STARTED",
                "SYNTHESIS_COMPLETED",
                "CLAIM_VERIFICATION_STARTED",
                "CITATION_VERIFICATION_STARTED",
                "FINAL_VALIDATED",
                "HONEST_FALLBACK",
                "REFUSED",
                "CANCELLED",
                "ERROR",
                "DONE",
            ]
        );
        assert_eq!(ALL_PROGRESS_EVENT_KINDS.len(), 18);
    }

    #[test]
    fn there_is_no_model_token_or_delta_event_kind() {
        for k in ALL_PROGRESS_EVENT_KINDS {
            let w = k.as_str();
            assert!(!w.contains("TOKEN"), "forbidden token kind: {w}");
            assert!(!w.contains("DELTA"), "forbidden delta kind: {w}");
            assert!(!w.contains("PARTIAL"), "forbidden partial-prose kind: {w}");
        }
    }

    #[test]
    fn contract_carries_the_schema_token_and_version() {
        let c = progress_event_contract();
        assert_eq!(c["contract"], "banzai-progress");
        assert_eq!(c["version"], 1);
        assert_eq!(c["schema_version"], "banzai-progress/1");
        assert_eq!(c["kinds"].as_array().unwrap().len(), 18);
    }

    #[test]
    fn event_kind_serde_wire_form_matches_as_str() {
        for k in ALL_PROGRESS_EVENT_KINDS {
            let json = serde_json::to_string(k).unwrap();
            assert_eq!(json, format!("\"{}\"", k.as_str()));
        }
    }

    // ── the disposition mapping ──
    fn input() -> DispositionInput {
        DispositionInput::default()
    }

    #[test]
    fn a_boundary_maps_to_refused() {
        let mut i = input();
        i.boundary = BoundaryContext {
            is_boundary: true,
            boundary_kind: BoundaryKind::Action,
            refused: true,
        };
        assert_eq!(response_disposition(&i), ResponseDisposition::Refused);
        // …even if a later stage also claims grounded — safety wins.
        i.grounded = true;
        i.terminal_kind = "canonical_definition".into();
        assert_eq!(response_disposition(&i), ResponseDisposition::Refused);
    }

    #[test]
    fn a_deterministic_terminal_maps_to_deterministic_answer() {
        let mut i = input();
        i.terminal_kind = "journey_next_step".into();
        assert_eq!(
            response_disposition(&i),
            ResponseDisposition::DeterministicAnswer
        );
    }

    #[test]
    fn a_validated_model_synthesis_maps_to_grounded_answer() {
        let mut i = input();
        i.grounded = true;
        assert_eq!(
            response_disposition(&i),
            ResponseDisposition::GroundedAnswer
        );
    }

    #[test]
    fn an_ambiguous_fallback_maps_to_clarification() {
        let mut i = input();
        i.contextual_fallback_kind = "ambiguous".into();
        assert_eq!(response_disposition(&i), ResponseDisposition::Clarification);
    }

    #[test]
    fn no_comparable_data_maps_to_insufficient() {
        let mut i = input();
        i.contextual_fallback_kind = "no_comparable_data".into();
        assert_eq!(response_disposition(&i), ResponseDisposition::Insufficient);
    }

    #[test]
    fn a_generic_no_answer_maps_to_honest_fallback() {
        for cf in [
            "out_of_scope",
            "tool_unavailable",
            "insufficient_source",
            "",
        ] {
            let mut i = input();
            i.contextual_fallback_kind = cf.into();
            assert_eq!(
                response_disposition(&i),
                ResponseDisposition::HonestFallback,
                "cf={cf}"
            );
        }
    }

    #[test]
    fn every_disposition_is_reachable() {
        use std::collections::HashSet;
        let mut seen: HashSet<&str> = HashSet::new();
        // Refused
        let mut i = input();
        i.boundary.refused = true;
        seen.insert(response_disposition(&i).as_str());
        // DeterministicAnswer
        let mut i = input();
        i.terminal_kind = "t".into();
        seen.insert(response_disposition(&i).as_str());
        // GroundedAnswer
        let mut i = input();
        i.grounded = true;
        seen.insert(response_disposition(&i).as_str());
        // Clarification
        let mut i = input();
        i.contextual_fallback_kind = "ambiguous".into();
        seen.insert(response_disposition(&i).as_str());
        // Insufficient
        let mut i = input();
        i.contextual_fallback_kind = "no_comparable_data".into();
        seen.insert(response_disposition(&i).as_str());
        // HonestFallback
        seen.insert(response_disposition(&input()).as_str());
        for d in ALL_RESPONSE_DISPOSITIONS {
            assert!(seen.contains(d.as_str()), "unreachable: {}", d.as_str());
        }
    }

    #[test]
    fn json_surface_round_trips_disposition_and_boundary_context() {
        let out = response_disposition_for_json(
            r#"{"intent":"boundary_request","boundary":{"is_boundary":true,"boundary_kind":"action","refused":true}}"#,
        );
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["disposition"], "REFUSED");
        assert_eq!(v["boundary_context"]["is_boundary"], true);
        assert_eq!(v["boundary_context"]["boundary_kind"], "action");
        assert_eq!(v["boundary_context"]["refused"], true);
    }

    #[test]
    fn json_surface_defaults_to_honest_fallback_on_empty() {
        let out = response_disposition_for_json("{}");
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["disposition"], "HONEST_FALLBACK");
        assert_eq!(v["boundary_context"]["is_boundary"], false);
        assert_eq!(v["boundary_context"]["boundary_kind"], "none");
    }

    // ── the safe boundary context ──
    #[test]
    fn boundary_context_from_a_clean_decision_is_none() {
        let d = crate::boundary::evaluate("o que e a federacao?");
        let bc = boundary_context_from(&d);
        assert!(!bc.is_boundary);
        assert!(!bc.refused);
        assert_eq!(bc.boundary_kind, BoundaryKind::None);
    }

    #[test]
    fn boundary_context_from_an_action_is_refused_public_only() {
        let d = crate::boundary::evaluate("transfere 100 kz");
        let bc = boundary_context_from(&d);
        assert!(bc.is_boundary);
        assert!(bc.refused);
        assert_ne!(bc.boundary_kind, BoundaryKind::None);
        // the serialized context exposes ONLY the three safe fields — no echoed user text.
        let v: serde_json::Value = serde_json::to_value(bc).unwrap();
        let obj = v.as_object().unwrap();
        assert_eq!(obj.len(), 3);
        for k in ["is_boundary", "boundary_kind", "refused"] {
            assert!(obj.contains_key(k), "missing {k}");
        }
    }

    #[test]
    fn boundary_kind_serde_wire_form_matches_as_str() {
        for k in [
            BoundaryKind::None,
            BoundaryKind::Action,
            BoundaryKind::Safety,
            BoundaryKind::OperatorPublication,
            BoundaryKind::Critical,
        ] {
            let json = serde_json::to_string(&k).unwrap();
            assert_eq!(json, format!("\"{}\"", k.as_str()));
        }
    }

    #[test]
    fn disposition_serde_wire_form_matches_as_str() {
        for d in ALL_RESPONSE_DISPOSITIONS {
            let json = serde_json::to_string(d).unwrap();
            assert_eq!(json, format!("\"{}\"", d.as_str()));
        }
    }
}
