//! WASM (browser) exports for the BanzAI Workbench Operator Manifest Validator (BX1.6).
//!
//! JSON-in/JSON-out over the local, no-network validator; the status/readiness verdict and the hashes
//! are computed in Rust (see `crate`). No operator is created, no `/operators` change, no network.
//! Compiled only under the `wasm` feature; native builds exercise the same logic via `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_manifest_str};
use wasm_bindgen::prelude::*;

/// input = the manifest JSON (object) or `{ "manifest": <object> }`; MALFORMED handled inside.
#[wasm_bindgen]
pub fn operator_manifest_validate_json(input: &str) -> String {
    validate_manifest_str(input).to_string()
}

#[wasm_bindgen]
pub fn operator_manifest_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn operator_manifest_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn operator_manifest_tool_version_json() -> String {
    tool_version().to_string()
}
