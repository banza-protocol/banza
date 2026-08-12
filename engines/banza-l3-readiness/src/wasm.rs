//! WASM (browser) exports for the BanzAI Workbench L3 Federation Readiness validator (BX1.9).
//!
//! JSON-in/JSON-out over the local, no-network validator; the L3 status/readiness verdict, the federation
//! / cross-operator-trace / trust / BRL / settlement checks and the hashes are all computed in Rust (see
//! `crate`). No active federation, no payment, no fund movement, no operator created, no `/operators`
//! change, no network. Compiled only under the `wasm` feature; native builds exercise the same logic via
//! `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_l3};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn l3_readiness_validate_json(input: &str) -> String {
    validate_l3(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn l3_readiness_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn l3_readiness_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn l3_readiness_tool_version_json() -> String {
    tool_version().to_string()
}
