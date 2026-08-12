//! WASM (browser) exports for the BanzAI Workbench L4 External-Interoperability Readiness validator
//! (BX1.10).
//!
//! JSON-in/JSON-out over the local, no-network validator; the L4 status/readiness verdict, the profile /
//! version-negotiation / endpoint-contract / capability / envelope / error-mapping / trust / BRL checks
//! and the hashes are all computed in Rust (see `crate`). No active external integration, no active
//! federation, no payment, no fund movement, no operator created, no `/operators` change, no network, and
//! BANZA is not turned into a payment service provider. Compiled only under the `wasm` feature; native
//! builds exercise the same logic via `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_l4};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn l4_readiness_validate_json(input: &str) -> String {
    validate_l4(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn l4_readiness_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn l4_readiness_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn l4_readiness_tool_version_json() -> String {
    tool_version().to_string()
}
