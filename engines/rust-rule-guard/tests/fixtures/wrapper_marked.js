// RUST_WRAPPER_ONLY — thin wrapper: calls the Rust engine (WASM), no algorithm here.
const kb = require("./rustkb/banzai_api_kb.js");
export function retrieveTopK(q, k) { return JSON.parse(kb.retrieve_topk_ids_json(q, k)); }
