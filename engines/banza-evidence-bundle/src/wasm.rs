//! WASM (browser) exports for the BanzAI Evidence Bundle tool (BX1.5).
//!
//! JSON-in/JSON-out over the assembler; readiness, hashes and the verdict are computed in Rust (see
//! `crate`). No operator, no network, no certificate, no approval. Compiled only under the `wasm`
//! feature; native builds skip this module and exercise the same logic via `crate::*` and `cargo test`.

use crate::*;
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn evidence_bundle_build_json(input: &str) -> String {
    build_bundle(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn evidence_bundle_validate_json(input: &str) -> String {
    validate_bundle(input).to_string()
}

#[wasm_bindgen]
pub fn evidence_bundle_demo_json(input: &str) -> String {
    demo_bundle(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn evidence_bundle_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn evidence_bundle_tool_version_json() -> String {
    tool_version().to_string()
}
