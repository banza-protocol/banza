//! WASM (browser) exports for the M2 protocol-gate validator.
//!
//! JSON-in/JSON-out over the local, no-network validator; the M2 status, the production-protocol gates,
//! the missing artifacts, the blocked items, the forbidden-activation attempts and the hash are all
//! computed in Rust (see `crate`). No production financial operation, no operator activation, no
//! production certificate, no `/operators` change, no network, and BANZA is not turned into a payment
//! service provider. Compiled only under the `wasm` feature; native builds exercise the same logic via
//! `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_m2_protocol_gate};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn m2_protocol_gate_validate_json(input: &str) -> String {
    validate_m2_protocol_gate(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn m2_protocol_gate_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn m2_protocol_gate_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn m2_protocol_gate_tool_version_json() -> String {
    tool_version().to_string()
}
