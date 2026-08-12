//! WASM (browser) exports for the BanzAI Workbench Security & Risk Assurance validator (BX2.0).
//!
//! JSON-in/JSON-out over the local, no-network validator; the assurance status, the critical/high risk
//! counts, the missing evidence, the control gaps and the hashes are all computed in Rust (see `crate`).
//! No production, no external audit, no certification, no licence, no operator created, no `/operators`
//! change, no network, and BANZA is not turned into a payment service provider. Compiled only under the
//! `wasm` feature; native builds exercise the same logic via `crate::*`.

use crate::{
    deep_demo_fixtures, deep_schema, deep_tool_version, demo_fixtures, schema, tool_version,
    validate_assurance, validate_deep_assurance,
};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn security_assurance_validate_json(input: &str) -> String {
    validate_assurance(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn security_assurance_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn security_assurance_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn security_assurance_tool_version_json() -> String {
    tool_version().to_string()
}

// ── BX2.1–BX2.4 deep-assurance exports ──────────────────────────────────────────

#[wasm_bindgen]
pub fn security_deep_assurance_validate_json(input: &str) -> String {
    validate_deep_assurance(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn security_deep_assurance_demo_fixtures_json() -> String {
    deep_demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn security_deep_assurance_schema_json() -> String {
    deep_schema().to_string()
}

#[wasm_bindgen]
pub fn security_deep_assurance_tool_version_json() -> String {
    deep_tool_version().to_string()
}
