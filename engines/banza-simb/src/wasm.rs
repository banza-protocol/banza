//! WASM (browser) exports for the BanzAI Workbench SimB tool (BX1.3).
//!
//! JSON-in/JSON-out over the deterministic scenario runner; the technical PASS/FAIL is computed in Rust
//! (see [`crate::scenario`]). No real funds, no operator, no network. Native builds skip this module; the
//! same logic is exercised through `crate::scenario::*` and `cargo test`. Compiled only under the
//! `wasm` feature (standalone `wasm-pack build --features wasm`), so it never leaks into a bundle that
//! depends on banza-simb (e.g. banza-conformance).

use crate::scenario;
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

fn str_field<'a>(v: &'a Value, k: &str) -> &'a str {
    v.get(k).and_then(|x| x.as_str()).unwrap_or("")
}

#[wasm_bindgen]
pub fn simb_demo_scenarios_json() -> String {
    scenario::demo_scenarios().to_string()
}

/// input = `{ "scenario": "<key>" }`
#[wasm_bindgen]
pub fn simb_run_scenario_json(input: &str) -> String {
    let v = parse(input);
    let key = str_field(&v, "scenario");
    scenario::run_scenario(if key.is_empty() { "valid_l0" } else { key }).to_string()
}

/// input = `{ "operator_id": "<id>" }`
#[wasm_bindgen]
pub fn simb_operator_manifest_json(input: &str) -> String {
    let v = parse(input);
    scenario::operator_manifest(str_field(&v, "operator_id")).to_string()
}

#[wasm_bindgen]
pub fn simb_federation_demo_json(_input: &str) -> String {
    scenario::federation_demo().to_string()
}

#[wasm_bindgen]
pub fn simb_tool_version_json() -> String {
    scenario::tool_version().to_string()
}
