//! WASM (browser) exports for the M2.1 root trust ceremony validator.
//!
//! JSON-in/JSON-out over the local, no-network validator; the ceremony status, the Ed25519 signature
//! verification, the 2-of-3 threshold, the custody/backup/offline/recovery checks, the forbidden-material
//! detection and the hashes are all computed in Rust (see `crate`). No key generation, no signing of real
//! keys, no network, no operator activation, no `/operators` change, and BANZA is not turned into a PSP.
//! Compiled only under the `wasm` feature; native builds exercise the same logic via `crate::*`.

use crate::{demo_fixtures, schema, tool_version, validate_root_ceremony};
use serde_json::Value;
use wasm_bindgen::prelude::*;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

#[wasm_bindgen]
pub fn root_ceremony_validate_json(input: &str) -> String {
    validate_root_ceremony(&parse(input)).to_string()
}

#[wasm_bindgen]
pub fn root_ceremony_demo_fixtures_json() -> String {
    demo_fixtures().to_string()
}

#[wasm_bindgen]
pub fn root_ceremony_schema_json() -> String {
    schema().to_string()
}

#[wasm_bindgen]
pub fn root_ceremony_tool_version_json() -> String {
    tool_version().to_string()
}
