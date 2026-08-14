//! WASM (nodejs) exports for the closed Technical Registry (ADR-034, M2.19G.1).
//!
//! JSON-in/JSON-out over the native library; every resolution, eligibility decision, discovery
//! validation, step-status mapping and Certification Readiness aggregation is computed in Rust
//! (see `crate`). Compiled only under the `wasm` feature; native builds exercise the same logic via
//! `crate::*`. `banzai-api` calls these to keep resolution + eligibility + verdicts in Rust — TS
//! never decides.

use crate::{
    catalogue_json, certification_readiness_json, profile_applicability_json, resolve_json,
    step_status_json, tool_version_json, validate_discovery_json,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn registry_resolve_json(operator_id: &str, implementation_id: &str) -> String {
    resolve_json(operator_id, implementation_id)
}

#[wasm_bindgen]
pub fn registry_catalogue_json() -> String {
    catalogue_json()
}

#[wasm_bindgen]
pub fn registry_validate_discovery_json(
    resolved_target_json: &str,
    discovery_json: &str,
) -> String {
    validate_discovery_json(resolved_target_json, discovery_json)
}

#[wasm_bindgen]
pub fn registry_step_status_json(step: &str, engine_output_json: &str) -> String {
    step_status_json(step, engine_output_json)
}

#[wasm_bindgen]
pub fn registry_certification_readiness_json(step_verdicts_json: &str, profile: &str) -> String {
    certification_readiness_json(step_verdicts_json, profile)
}

/// The profile→step applicability map (REQUIRED / OPTIONAL / NOT_APPLICABLE) — Rust-decided.
#[wasm_bindgen]
pub fn registry_profile_applicability_json(profile: &str) -> String {
    profile_applicability_json(profile)
}

#[wasm_bindgen]
pub fn registry_tool_version_json() -> String {
    tool_version_json()
}
