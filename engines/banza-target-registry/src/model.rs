//! Domain model for the closed Technical Registry (ADR-068 §13).
//!
//! Two records are modelled: the **operator** (the responsible entity) and the **implementation**
//! (the technical system actually evaluated). One operator may publish many implementations; the
//! validation target is always an operator **and** one of its published implementations — never the
//! entity in the abstract (ADR-068 §4.2/§4.3). Presence of a record NEVER implies admission,
//! authorisation, or the ability to move funds (ADR-068 §4.10, ADR-061).

use serde::{Deserialize, Serialize};

/// Lifecycle state of a record in the registry. Only `Published` is eligible; every other state is a
/// distinct, typed ineligibility reason during resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PublicationStatus {
    Published,
    Unpublished,
    Removed,
    Revoked,
}

impl PublicationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PublicationStatus::Published => "published",
            PublicationStatus::Unpublished => "unpublished",
            PublicationStatus::Removed => "removed",
            PublicationStatus::Revoked => "revoked",
        }
    }
}

/// The published artifact endpoint map — the 14 canonical paths of an implementation (ADR-068 §13).
/// Paths are stored relative (leading-slash); resolution joins them onto the `canonical_origin`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Endpoints {
    pub discovery: String,
    pub manifest: String,
    pub key_manifest: String,
    pub signed_metadata: String,
    pub capabilities: String,
    pub conformance: String,
    pub revocation: String,
    pub federation_metadata: String,
    pub federation_manifest: String,
    pub evidence_bundle: String,
    pub traces: String,
    pub ledger: String,
    pub payment_qr: String,
    pub payment_refund: String,
}

impl Endpoints {
    /// The canonical published paths of the reference implementation (ADR-067 served surface + the
    /// four endpoints ADR-068 requires: discovery, capabilities, signed-metadata, federation-manifest).
    /// The operator (discovery) manifest and the signed protocol metadata are published at their canonical
    /// `.well-known/banza/` discovery routes per ADR-080 (RFC-0005 / ADR-039); the remaining demo artefacts
    /// keep their reference-surface paths.
    pub fn reference() -> Self {
        Endpoints {
            discovery: "/discovery.json".into(),
            manifest: "/.well-known/banza/operator.json".into(),
            key_manifest: "/key-manifest.json".into(),
            signed_metadata: "/.well-known/banza/signed-protocol-metadata.json".into(),
            capabilities: "/capabilities.json".into(),
            conformance: "/conformance/evidence.json".into(),
            revocation: "/revocation-list.json".into(),
            federation_metadata: "/federation/metadata.json".into(),
            // Operador Zero publishes its federation manifest at /federation-metadata.json (the path its
            // discovery document declares as federation_metadata_url). The registry must only declare
            // endpoints the implementation actually serves (ADR-068 §4.6/§22), so this points at the
            // served artifact, not an unpublished /federation-manifest.json.
            federation_manifest: "/federation-metadata.json".into(),
            evidence_bundle: "/evidence-bundle.json".into(),
            traces: "/traces/full-e2e.json".into(),
            ledger: "/ledger/demo.json".into(),
            payment_qr: "/payments/demo-qr.json".into(),
            payment_refund: "/payments/demo-refund.json".into(),
        }
    }
}

/// An operator record — the responsible entity. It publishes zero or more implementations.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OperatorRecord {
    pub operator_id: String,
    pub display_name: String,
    pub publication_status: PublicationStatus,
    pub implementation_ids: Vec<String>,
    pub registry_ref: String,
}

/// An implementation record — the technical system actually evaluated (ADR-068 §4.2).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImplementationRecord {
    pub implementation_id: String,
    pub operator_id: String,
    /// Human-facing name of THIS implementation (distinct from the operator name). Canonical source
    /// for the "Validar operador" implementation cards — the UI never invents an implementation name.
    pub display_name: String,
    pub version: String,
    pub protocol_version: String,
    pub profile: String,
    pub environment: String,
    pub capabilities: Vec<String>,
    /// Empty string = origin-less (an ineligible target — ADR-068 Consequences).
    pub canonical_origin: String,
    pub endpoints: Endpoints,
    pub publication_status: PublicationStatus,
    pub evidence_refs: Vec<String>,
}

/// The endpoint map resolved to ABSOLUTE URLs (`canonical_origin` + path).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolvedEndpoints {
    pub discovery: String,
    pub manifest: String,
    pub key_manifest: String,
    pub signed_metadata: String,
    pub capabilities: String,
    pub conformance: String,
    pub revocation: String,
    pub federation_metadata: String,
    pub federation_manifest: String,
    pub evidence_bundle: String,
    pub traces: String,
    pub ledger: String,
    pub payment_qr: String,
    pub payment_refund: String,
}

/// A fully resolved, ELIGIBLE validation target. Every URL is bound to the canonical origin; the
/// `expected_host` is the SSRF-pin the secure fetcher validates against. Resolution proves eligibility
/// only — never admission, authorisation, or the ability to move funds (ADR-068 §4.10).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolvedTarget {
    pub operator_id: String,
    pub operator_display_name: String,
    pub implementation_id: String,
    pub version: String,
    pub protocol_version: String,
    pub profile: String,
    pub environment: String,
    pub capabilities: Vec<String>,
    pub canonical_origin: String,
    pub expected_host: String,
    pub discovery_url: String,
    pub endpoints: ResolvedEndpoints,
    pub publication_status: PublicationStatus,
    pub evidence_refs: Vec<String>,
}

/// Typed ineligibility / resolution-failure reasons (ADR-068 §14). Serialized as snake_case so the
/// receipt and the caller always know *why* a target is not eligible. Presence in the registry is not
/// admission; a non-published / revoked / origin-less / incompatible / wrong-environment record is
/// simply not an eligible target.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResolutionReason {
    UnknownOperator,
    DuplicateOperator,
    OperatorUnpublished,
    OperatorRemoved,
    OperatorRevoked,
    UnknownImplementation,
    DuplicateImplementation,
    ImplementationOperatorMismatch,
    ImplementationUnpublished,
    ImplementationRemoved,
    ImplementationRevoked,
    OriginMissing,
    IncompatibleProtocolVersion,
    UnsupportedEnvironment,
    IncompatibleProfile,
}

impl ResolutionReason {
    pub fn as_str(&self) -> &'static str {
        match self {
            ResolutionReason::UnknownOperator => "unknown_operator",
            ResolutionReason::DuplicateOperator => "duplicate_operator",
            ResolutionReason::OperatorUnpublished => "operator_unpublished",
            ResolutionReason::OperatorRemoved => "operator_removed",
            ResolutionReason::OperatorRevoked => "operator_revoked",
            ResolutionReason::UnknownImplementation => "unknown_implementation",
            ResolutionReason::DuplicateImplementation => "duplicate_implementation",
            ResolutionReason::ImplementationOperatorMismatch => "implementation_operator_mismatch",
            ResolutionReason::ImplementationUnpublished => "implementation_unpublished",
            ResolutionReason::ImplementationRemoved => "implementation_removed",
            ResolutionReason::ImplementationRevoked => "implementation_revoked",
            ResolutionReason::OriginMissing => "origin_missing",
            ResolutionReason::IncompatibleProtocolVersion => "incompatible_protocol_version",
            ResolutionReason::UnsupportedEnvironment => "unsupported_environment",
            ResolutionReason::IncompatibleProfile => "incompatible_profile",
        }
    }
}
