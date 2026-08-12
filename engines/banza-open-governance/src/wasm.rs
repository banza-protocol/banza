//! WASM (browser) exports for the open protocol governance validator.
//!
//! JSON-in/JSON-out over the local, no-network validator; the status, the CA-dependency /
//! human-operator-approval / certificate-semantics / permissioned-network detections, the blocked items
//! and the hash are all computed in Rust (see `crate`). No operator is created, accepted, approved,
//! certified or activated; no certificate is emitted; no licence is issued; no funds move; `/operators`
//! stays `[]` and `production_certificates` stays `false`. Compiled only under the `wasm` feature; native
//! builds exercise the same logic via `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_open_governance};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn open_governance_validate_json(input: &str) -> String {
    validate_open_governance(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn open_governance_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn open_governance_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn open_governance_tool_version_json() -> String {
    tool_version().to_string()
}
