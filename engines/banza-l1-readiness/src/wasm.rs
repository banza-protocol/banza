//! WASM (browser) exports for the BanzAI Workbench L1 Readiness validator (BX1.7).
//!
//! JSON-in/JSON-out over the local, no-network aggregator; the L1 status/readiness verdict and hashes are
//! computed in Rust (see `crate`). No operator created, no `/operators` change, no network. Compiled only
//! under the `wasm` feature; native builds exercise the same logic via `crate::*` and `cargo test`.

use crate::{demo_fixtures, schema, tool_version, validate_l1};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn l1_readiness_validate_json(input: &str) -> String {
    validate_l1(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn l1_readiness_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn l1_readiness_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn l1_readiness_tool_version_json() -> String {
    tool_version().to_string()
}
