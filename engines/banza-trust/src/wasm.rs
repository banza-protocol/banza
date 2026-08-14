//! WASM (browser) exports for the BanzAI Workbench Trust Engine tool (M2.4).
//!
//! JSON-in/JSON-out over the Rust evaluator; the trust status is computed in Rust (see `tool` /
//! `evaluate`). Verification only — no production signing, no key generation for production, no
//! `/operators` / `/certificates` change, no operator authorisation. Native builds skip this module;
//! the same logic is exercised through `crate::tool::*` and `cargo test`. Compiled only under the
//! `wasm` feature (standalone `wasm-pack build --features wasm`), so it never leaks into a bundle that
//! depends on banza-trust (e.g. banza-conformance).

use crate::tool;
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

/// Evaluate the operator's published signed protocol metadata and trust material (status in Rust).
#[wasm_bindgen]
pub fn trust_evaluate_signed_metadata_json(input: &str) -> String {
    tool::trust_evaluate_tool(&parse(input)).to_string()
}

/// Full federation Open Trust Evaluation (ADR-031): ten fail-closed checks → ROUTING_ALLOWED / FAIL_CLOSED.
#[wasm_bindgen]
pub fn trust_federation_ote_json(input: &str) -> String {
    tool::federation_ote_tool(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn trust_demo_fixtures_json() -> String {
    tool::demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn trust_schema_json() -> String {
    tool::schema().to_string()
}

#[wasm_bindgen]
pub fn trust_tool_version_json() -> String {
    tool::tool_version().to_string()
}
