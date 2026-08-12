//! banza-trust Workbench tool layer (M2.4).
//!
//! JSON-in/JSON-out over the active-model evaluator ([`crate::evaluate::evaluate_trust`]). The trust
//! status is computed in Rust — never in TypeScript. Plus deterministic TEST-ONLY demo fixtures and a
//! machine schema. Verification only: no key generation for production, no signing of production
//! artifacts, no `/operators` / `/certificates` change, no operator authorisation.

use crate::evaluate::{evaluate_federation_ote, evaluate_trust, STATUS_VALUES};
use crate::sign;
use serde_json::{json, Value};

pub const TOOL_VERSION: &str = crate::VERIFIER_VERSION;

/// `input` = a full trust-evaluation object (see [`schema`]). Returns the Rust-computed report.
pub fn trust_evaluate_tool(input: &Value) -> Value {
    evaluate_trust(input)
}

/// `input` = a federation-evaluation object. Returns the Rust-computed federation Open Trust Evaluation
/// report (ten fail-closed checks → `ROUTING_ALLOWED` / `FAIL_CLOSED`; authenticated revocation).
pub fn federation_ote_tool(input: &Value) -> Value {
    evaluate_federation_ote(input)
}

/// Deterministic TEST-ONLY fixtures (the twelve scenarios).
pub fn demo_fixtures() -> Value {
    sign::demo_fixtures()
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-trust",
        "tool_version": TOOL_VERSION,
        "model": "signed protocol metadata + delegated signing keys + operator manifest + conformance evidence + public protocol registry + revocation/fail-closed",
        "required_inputs": [
            "trust_root_metadata", "delegated_signing_key", "signed_protocol_metadata",
            "operator_manifest", "conformance_evidence", "public_registry_entry", "revocation_status"
        ],
        "status_values": STATUS_VALUES,
        "check_fields": [
            "boundary_status", "root_metadata_status", "signed_metadata_status", "delegated_key_status",
            "signature_status", "metadata_freshness_status", "protocol_compatibility_status",
            "manifest_status", "conformance_evidence_status", "registry_status", "revocation_status",
            "fail_closed_required"
        ],
        "network": "none (local, offline)",
        "boundary": "A validação do trust não é autorização de operador, certificação, licença ou prestação de serviços financeiros."
    })
}

pub fn tool_version() -> Value {
    json!({
        "tool": "banza-trust",
        "tool_version": TOOL_VERSION,
        "scheme": "ed25519 + ADR-038 canonical-json",
        "model": "signed-protocol-metadata",
        "test_only": true,
        "production_disclaimer": "Verificação técnica test-only (TEST ONLY — NOT PRODUCTION). Não é certificado; o BanzAI não emite nem altera /certificates ou /operators."
    })
}
