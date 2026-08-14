//! WASM (nodejs) exports for the onboarding security engine (ADR-037, M2.19G.3).
//!
//! JSON-in/JSON-out over the native library; every OTP/session/candidate/origin/rate-limit decision is
//! computed in Rust (see `crate`). Compiled only under the `wasm` feature; native builds exercise the
//! same logic via `crate::*`. `banzai-api` calls these so authentication, authorisation, verification
//! and state transitions stay in Rust — TypeScript never decides, and no code/token plaintext is ever
//! persisted (only HMAC digests leave the engine).

use crate::{
    candidate_transition_json, origin_issue_json, origin_verify_json, otp_issue_json,
    otp_verify_json, ratelimit_decide_json, session_issue_json, session_verify_json,
    tool_version_json,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn onboarding_otp_issue_json(input: &str) -> String {
    otp_issue_json(input)
}

#[wasm_bindgen]
pub fn onboarding_otp_verify_json(input: &str) -> String {
    otp_verify_json(input)
}

#[wasm_bindgen]
pub fn onboarding_session_issue_json(input: &str) -> String {
    session_issue_json(input)
}

#[wasm_bindgen]
pub fn onboarding_session_verify_json(input: &str) -> String {
    session_verify_json(input)
}

#[wasm_bindgen]
pub fn onboarding_candidate_transition_json(input: &str) -> String {
    candidate_transition_json(input)
}

#[wasm_bindgen]
pub fn onboarding_origin_issue_json(input: &str) -> String {
    origin_issue_json(input)
}

#[wasm_bindgen]
pub fn onboarding_origin_verify_json(input: &str) -> String {
    origin_verify_json(input)
}

#[wasm_bindgen]
pub fn onboarding_ratelimit_decide_json(input: &str) -> String {
    ratelimit_decide_json(input)
}

#[wasm_bindgen]
pub fn onboarding_tool_version_json() -> String {
    tool_version_json()
}
