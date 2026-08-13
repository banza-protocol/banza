// Onboarding decision engine wrapper (M2.19G.3, ADR-040). RUST_DECIDES.
//
// Every OTP/session/candidate/origin/rate-limit DECISION is computed in Rust (engine
// `engines/banzai-onboarding`, vendored WASM in ../onboardingwasm). This file is I/O glue only: it
// supplies the two things a pure engine cannot produce — CSPRNG entropy (crypto.randomBytes) and the
// current time (Date.now) — and shuttles JSON. It NEVER decides a verdict, NEVER derives a code, and
// NEVER stores a plaintext code/token: only HMAC digests come back out of Rust for the host to persist.

import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Flat vendored package (wasm-pack --target nodejs): one CJS entry per crate.
const wasm = require("../onboardingwasm/banzai_onboarding.js");
// M2.19G.3A — the CLOSED Technical Registry resolver (same vendored WASM the ADR-038 validator uses).
// Reconciliation BINDS a candidate to an ALREADY-registry-resident (operator_id, implementation_id);
// it never creates a registry row and never name-matches — the id must resolve in the closed registry.
const registry = require("../validatewasm/banza_target_registry/banza_target_registry.js");

// Resolve a closed-registry target. Returns {ok, reason?, ...target}. Used only to CONFIRM a target
// exists (eligibility) for reconciliation — never to publish or mutate the registry.
export function resolveRegistryTarget(operatorId, implementationId) {
  return JSON.parse(registry.registry_resolve_json(String(operatorId || ""), String(implementationId || "")));
}

// Host-supplied entropy as hex. 16 bytes is plenty for a 6-digit OTP (rejection sampling in Rust);
// 32 bytes for session tokens / origin nonces (≥256-bit).
function entropyHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function now() {
  return Date.now();
}

function call(fn, input) {
  return JSON.parse(fn(JSON.stringify(input)));
}

export function toolVersion() {
  return JSON.parse(wasm.onboarding_tool_version_json());
}

// Issue an OTP. Returns {ok, code, otp_hash, issued_at_ms, expires_at_ms} — `code` is emailed and
// NEVER persisted; only otp_hash is stored. `pepper` is the server secret; `lastIssuedAtMs` (optional)
// lets Rust enforce the min-reissue window.
export function otpIssue({ pepper, email, purpose, ttlMs, minReissueMs, lastIssuedAtMs }) {
  return call(wasm.onboarding_otp_issue_json, {
    pepper,
    email,
    purpose,
    entropy_hex: entropyHex(16),
    now_ms: now(),
    ...(ttlMs != null ? { ttl_ms: ttlMs } : {}),
    ...(minReissueMs != null ? { min_reissue_ms: minReissueMs } : {}),
    ...(lastIssuedAtMs != null ? { last_issued_at_ms: lastIssuedAtMs } : {}),
  });
}

// Verify a submitted OTP against the stored digest. Returns {ok, verdict, new_attempts, consume}.
export function otpVerify({ pepper, email, purpose, submittedCode, otpHash, expiresAtMs, attempts, maxAttempts, verifiedAtMs, invalidatedAtMs }) {
  return call(wasm.onboarding_otp_verify_json, {
    pepper,
    email,
    purpose,
    submitted_code: submittedCode,
    otp_hash: otpHash,
    expires_at_ms: expiresAtMs,
    attempts,
    now_ms: now(),
    ...(maxAttempts != null ? { max_attempts: maxAttempts } : {}),
    ...(verifiedAtMs != null ? { verified_at_ms: verifiedAtMs } : {}),
    ...(invalidatedAtMs != null ? { invalidated_at_ms: invalidatedAtMs } : {}),
  });
}

// Issue an opaque session. Returns {ok, token, session_hash, ...}. `token` goes in the __Host- cookie;
// only session_hash is stored.
export function sessionIssue({ pepper, absoluteMs }) {
  return call(wasm.onboarding_session_issue_json, {
    pepper,
    entropy_hex: entropyHex(32),
    now_ms: now(),
    ...(absoluteMs != null ? { absolute_ms: absoluteMs } : {}),
  });
}

// Verify a session cookie token against the stored digest + expiries. Returns {valid, reason, new_last_seen_ms?}.
export function sessionVerify({ pepper, token, sessionHash, lastSeenMs, absoluteExpiresAtMs, idleMs, revokedAtMs }) {
  return call(wasm.onboarding_session_verify_json, {
    pepper,
    token,
    session_hash: sessionHash,
    now_ms: now(),
    last_seen_ms: lastSeenMs,
    absolute_expires_at_ms: absoluteExpiresAtMs,
    ...(idleMs != null ? { idle_ms: idleMs } : {}),
    ...(revokedAtMs != null ? { revoked_at_ms: revokedAtMs } : {}),
  });
}

// Decide a candidate state transition. Returns {ok, next_state} or {ok:false, reason:"illegal_transition"}.
export function candidateTransition({ state, event }) {
  return call(wasm.onboarding_candidate_transition_json, { state, event });
}

// Issue a .well-known ownership challenge. Returns {ok, challenge_id, nonce, challenge_hash,
// well_known_path, challenge_document, ...}. Only challenge_hash is stored; nonce is published by the operator.
export function originIssue({ pepper, candidateId, candidateImplementationId, domain, ttlMs }) {
  return call(wasm.onboarding_origin_issue_json, {
    pepper,
    entropy_hex: entropyHex(32),
    candidate_id: candidateId,
    candidate_implementation_id: candidateImplementationId,
    domain,
    now_ms: now(),
    ...(ttlMs != null ? { ttl_ms: ttlMs } : {}),
  });
}

// Verify a fetched .well-known challenge document. Returns {ok, result, reason_code, receipt}.
export function originVerify({ pepper, fetchedContent, challengeHash, candidateId, candidateImplementationId, domain, issuedAtMs, expiresAtMs, responseSha256, engineVersion, consumedAtMs }) {
  return call(wasm.onboarding_origin_verify_json, {
    pepper,
    fetched_content: fetchedContent,
    challenge_hash: challengeHash,
    candidate_id: candidateId,
    candidate_implementation_id: candidateImplementationId,
    domain,
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
    now_ms: now(),
    ...(responseSha256 != null ? { response_sha256: responseSha256 } : {}),
    ...(engineVersion != null ? { engine_version: engineVersion } : {}),
    // M2.19G.3A single-use: a challenge already consumed (positively verified) cannot verify again.
    ...(consumedAtMs != null ? { consumed_at_ms: consumedAtMs } : {}),
  });
}

// Decide a rolling-window rate limit. Returns {allow} or {allow:false, retry_after_ms, reason}.
export function ratelimitDecide({ windowMs, max, countInWindow, oldestInWindowMs }) {
  return call(wasm.onboarding_ratelimit_decide_json, {
    now_ms: now(),
    window_ms: windowMs,
    max,
    count_in_window: countInWindow,
    ...(oldestInWindowMs != null ? { oldest_in_window_ms: oldestInWindowMs } : {}),
  });
}
