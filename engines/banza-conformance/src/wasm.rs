//! WASM (browser) exports for the BanzAI Workbench Conformance L0 tool (BX1.3).
//!
//! JSON-in/JSON-out over the L0 demo runner (against banza-simb); the technical PASS/FAIL is computed in
//! Rust (see [`crate::tool`]). No operator, no network, no certificate, no M2/M3. Native builds skip this
//! module; the same logic is exercised through `crate::tool::*` and `cargo test`. Compiled only under
//! the `wasm` feature (standalone `wasm-pack build --features wasm`).

use crate::tool;
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

/// input = `{ scenario?: "<key>", run?: <simb run> }`
#[wasm_bindgen]
pub fn conformance_run_l0_demo_json(input: &str) -> String {
    tool::run_l0_demo(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn conformance_validate_report_json(input: &str) -> String {
    tool::validate_report_tool(input).to_string()
}

#[wasm_bindgen]
pub fn conformance_demo_fixtures_json() -> String {
    tool::demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn conformance_levels_info_json() -> String {
    tool::levels_info().to_string()
}

#[wasm_bindgen]
pub fn conformance_tool_version_json() -> String {
    tool::tool_version().to_string()
}
