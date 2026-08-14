//! banzai-onboarding (M2.19G.3, ADR-040) — the pure Rust security-decision engine for BanzAI-hosted
//! operator onboarding.
//!
//! It answers, in Rust: *is this OTP request allowed, what is the code to email and the digest to
//! store, does a submitted code verify (single-use / expiry / attempts / constant-time), is a session
//! token valid, what is the next candidate state, is a `.well-known` ownership challenge satisfied,
//! and does a rate-limit window permit this action?*
//!
//! **Pure JSON-in / JSON-out. No I/O, no clock, no randomness inside.** The Node host supplies CSPRNG
//! entropy (`crypto.randomBytes` → hex) and the current time (`now_ms`), and performs ALL persistence
//! (Postgres) and transport (Resend); this crate only *decides*. OTP codes and session tokens are never
//! stored — only their HMAC-SHA256 digests (keyed by a server-side pepper) leave this engine for
//! storage. Verification uses the `hmac` crate's constant-time `verify_slice`. Onboarding is a hosted
//! BanzAI service, never a BANZA protocol rule (ADR-040): third parties need none of this to implement
//! the protocol, publish endpoints, run the engines, validate artifacts or generate receipts.

use hmac::{Hmac, Mac};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL: &str = "banzai-onboarding";
pub const TOOL_VERSION: &str = "0.1.0";
pub const OTP_DIGITS: usize = 6;
pub const WELL_KNOWN_PATH: &str = "/.well-known/banza/ownership-challenge.json";

/// The minimal candidate lifecycle (ADR-040 §17). A candidate is NEVER a published operator,
/// participant, certified entity, scheme member or authorised entity.
pub fn candidate_states() -> Vec<&'static str> {
    vec![
        "EMAIL_PENDING",
        "EMAIL_VERIFIED",
        "DRAFT",
        "ORIGIN_PENDING",
        "ORIGIN_VERIFIED",
        "VALIDATING",
        "BLOCKED",
        "VALIDATION_COMPLETED",
        "PUBLICATION_ELIGIBLE",
        "PUBLISHED",
        "EXPIRED",
    ]
}

// ─────────────────────────── helpers (no I/O, no clock, no RNG) ───────────────────────────

fn parse(input: &str) -> Value {
    serde_json::from_str(input).unwrap_or(Value::Null)
}

fn norm_email(e: &str) -> String {
    e.trim().to_lowercase()
}

fn hmac_hex(pepper: &str, msg: &[u8]) -> String {
    let mut m = HmacSha256::new_from_slice(pepper.as_bytes()).expect("HMAC accepts any key length");
    m.update(msg);
    hex::encode(m.finalize().into_bytes())
}

/// Constant-time HMAC verification (via `hmac::Mac::verify_slice`).
fn hmac_verify(pepper: &str, msg: &[u8], tag_hex: &str) -> bool {
    let tag = match hex::decode(tag_hex) {
        Ok(t) => t,
        Err(_) => return false,
    };
    let mut m = HmacSha256::new_from_slice(pepper.as_bytes()).expect("HMAC accepts any key length");
    m.update(msg);
    m.verify_slice(&tag).is_ok()
}

fn otp_msg(purpose: &str, email_norm: &str, code: &str) -> Vec<u8> {
    format!("{purpose}\u{0}{email_norm}\u{0}{code}").into_bytes()
}

/// Derive an unbiased `OTP_DIGITS`-digit code from host-supplied CSPRNG bytes via rejection sampling
/// over 4-byte windows (avoids modulo bias). Returns None only if the entropy is too short/exhausted.
fn derive_code(entropy: &[u8]) -> Option<String> {
    let bound: u32 = 1_000_000; // 10^6 → six digits
    let limit: u32 = (u32::MAX / bound) * bound; // largest multiple of bound ≤ 2^32
    let mut i = 0;
    while i + 4 <= entropy.len() {
        let v = u32::from_be_bytes([entropy[i], entropy[i + 1], entropy[i + 2], entropy[i + 3]]);
        if v < limit {
            return Some(format!("{:0width$}", v % bound, width = OTP_DIGITS));
        }
        i += 4;
    }
    None
}

// ─────────────────────────── OTP ───────────────────────────

/// Issue an OTP. Input: `{pepper, email, purpose, entropy_hex, now_ms, ttl_ms?, min_reissue_ms?,
/// last_issued_at_ms?}`. Output on success: `{ok:true, code, otp_hash, issued_at_ms, expires_at_ms}` —
/// `code` is emailed and NEVER stored; only `otp_hash` is stored.
pub fn otp_issue_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let email = norm_email(v["email"].as_str().unwrap_or(""));
    let purpose = v["purpose"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let ttl = v["ttl_ms"].as_i64().unwrap_or(600_000); // 10 min
    let min_reissue = v["min_reissue_ms"].as_i64().unwrap_or(60_000); // 60 s
    if pepper.is_empty() || email.is_empty() || purpose.is_empty() {
        return json!({"ok":false,"reason":"invalid_input"}).to_string();
    }
    if let Some(last) = v["last_issued_at_ms"].as_i64() {
        if now - last < min_reissue {
            return json!({"ok":false,"reason":"reissue_too_soon","retry_after_ms":(min_reissue-(now-last)).max(0)}).to_string();
        }
    }
    let entropy = match hex::decode(v["entropy_hex"].as_str().unwrap_or("")) {
        Ok(b) => b,
        Err(_) => return json!({"ok":false,"reason":"bad_entropy"}).to_string(),
    };
    if entropy.len() < 8 {
        return json!({"ok":false,"reason":"insufficient_entropy"}).to_string();
    }
    let code = match derive_code(&entropy) {
        Some(c) => c,
        None => return json!({"ok":false,"reason":"entropy_exhausted"}).to_string(),
    };
    let otp_hash = hmac_hex(pepper, &otp_msg(purpose, &email, &code));
    json!({"ok":true,"code":code,"otp_hash":otp_hash,"issued_at_ms":now,"expires_at_ms":now+ttl,"digits":OTP_DIGITS}).to_string()
}

/// Verify a submitted OTP. Input: `{pepper, email, purpose, submitted_code, otp_hash, expires_at_ms,
/// attempts, max_attempts?, now_ms, verified_at_ms?, invalidated_at_ms?}`. Decides invalidated →
/// already-used → expired → attempts → constant-time match, and returns `{ok, verdict, new_attempts,
/// consume}` for the host to persist.
pub fn otp_verify_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let email = norm_email(v["email"].as_str().unwrap_or(""));
    let purpose = v["purpose"].as_str().unwrap_or("");
    let submitted = v["submitted_code"].as_str().unwrap_or("");
    let otp_hash = v["otp_hash"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let expires = v["expires_at_ms"].as_i64().unwrap_or(0);
    let attempts = v["attempts"].as_i64().unwrap_or(0);
    let max_attempts = v["max_attempts"].as_i64().unwrap_or(5);
    if !v["invalidated_at_ms"].is_null() {
        return json!({"ok":false,"verdict":"invalidated","new_attempts":attempts,"consume":false})
            .to_string();
    }
    if !v["verified_at_ms"].is_null() {
        return json!({"ok":false,"verdict":"already_used","new_attempts":attempts,"consume":false}).to_string();
    }
    if now > expires {
        return json!({"ok":false,"verdict":"expired","new_attempts":attempts,"consume":false})
            .to_string();
    }
    if attempts >= max_attempts {
        return json!({"ok":false,"verdict":"too_many_attempts","new_attempts":attempts,"consume":false}).to_string();
    }
    let ok = !submitted.is_empty()
        && hmac_verify(pepper, &otp_msg(purpose, &email, submitted), otp_hash);
    if ok {
        json!({"ok":true,"verdict":"verified","new_attempts":attempts+1,"consume":true}).to_string()
    } else {
        json!({"ok":false,"verdict":"mismatch","new_attempts":attempts+1,"consume":false})
            .to_string()
    }
}

// ─────────────────────────── Sessions (opaque; server stores only the hash) ───────────────────────────

/// Issue an opaque session. Input: `{pepper, entropy_hex(>=32B), now_ms, absolute_ms?}`. Output:
/// `{token, session_hash, issued_at_ms, last_seen_ms, absolute_expires_at_ms}` — `token` goes in the
/// `__Host-` cookie; only `session_hash` is stored.
pub fn session_issue_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let absolute = v["absolute_ms"].as_i64().unwrap_or(7 * 24 * 3600 * 1000); // 7 days
    if pepper.is_empty() {
        return json!({"ok":false,"reason":"invalid_input"}).to_string();
    }
    let entropy = match hex::decode(v["entropy_hex"].as_str().unwrap_or("")) {
        Ok(b) => b,
        Err(_) => return json!({"ok":false,"reason":"bad_entropy"}).to_string(),
    };
    if entropy.len() < 32 {
        return json!({"ok":false,"reason":"insufficient_entropy"}).to_string();
    }
    let token = hex::encode(&entropy); // ≥256-bit opaque token
    let session_hash = hmac_hex(pepper, token.as_bytes());
    json!({"ok":true,"token":token,"session_hash":session_hash,"issued_at_ms":now,"last_seen_ms":now,"absolute_expires_at_ms":now+absolute}).to_string()
}

/// Verify a session. Input: `{pepper, token, session_hash, now_ms, last_seen_ms, absolute_expires_at_ms,
/// idle_ms?, revoked_at_ms?}`. Output `{valid, reason, new_last_seen_ms?}`.
pub fn session_verify_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let token = v["token"].as_str().unwrap_or("");
    let session_hash = v["session_hash"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let last_seen = v["last_seen_ms"].as_i64().unwrap_or(0);
    let absolute_expires = v["absolute_expires_at_ms"].as_i64().unwrap_or(0);
    let idle = v["idle_ms"].as_i64().unwrap_or(12 * 3600 * 1000); // 12 h
    if !v["revoked_at_ms"].is_null() {
        return json!({"valid":false,"reason":"revoked"}).to_string();
    }
    if token.is_empty() || !hmac_verify(pepper, token.as_bytes(), session_hash) {
        return json!({"valid":false,"reason":"bad_token"}).to_string();
    }
    if now > absolute_expires {
        return json!({"valid":false,"reason":"absolute_expired"}).to_string();
    }
    if now - last_seen > idle {
        return json!({"valid":false,"reason":"idle_expired"}).to_string();
    }
    json!({"valid":true,"reason":"ok","new_last_seen_ms":now}).to_string()
}

// ─────────────────────────── Candidate state machine ───────────────────────────

fn next_state(state: &str, event: &str) -> Option<&'static str> {
    Some(match (state, event) {
        ("EMAIL_PENDING", "email_verified") => "EMAIL_VERIFIED",
        ("EMAIL_VERIFIED", "candidate_created") => "DRAFT",
        ("DRAFT", "origin_challenge_issued") => "ORIGIN_PENDING",
        ("ORIGIN_PENDING", "origin_verified") => "ORIGIN_VERIFIED",
        ("ORIGIN_PENDING", "origin_failed") => "ORIGIN_PENDING", // stays; retry allowed
        ("ORIGIN_VERIFIED", "validation_started") => "VALIDATING",
        ("VALIDATING", "validation_blocked") => "BLOCKED",
        ("BLOCKED", "validation_started") => "VALIDATING",
        ("VALIDATING", "validation_completed") => "VALIDATION_COMPLETED",
        ("VALIDATION_COMPLETED", "publication_eligible") => "PUBLICATION_ELIGIBLE",
        ("PUBLICATION_ELIGIBLE", "published") => "PUBLISHED",
        (_, "expired") => "EXPIRED",
        _ => return None,
    })
}

/// Decide a candidate transition. Input `{state, event}` → `{ok, next_state}` or
/// `{ok:false, reason:"illegal_transition"}`.
pub fn candidate_transition_json(input: &str) -> String {
    let v = parse(input);
    let state = v["state"].as_str().unwrap_or("");
    let event = v["event"].as_str().unwrap_or("");
    match next_state(state, event) {
        Some(n) => json!({"ok":true,"next_state":n}).to_string(),
        None => json!({"ok":false,"reason":"illegal_transition","state":state,"event":event})
            .to_string(),
    }
}

// ─────────────────────────── Origin ownership challenge (.well-known) ───────────────────────────

/// Issue a `.well-known` ownership challenge. Input `{pepper, entropy_hex(>=32B), candidate_id,
/// candidate_implementation_id, domain, now_ms, ttl_ms?}`. Output includes the `challenge_document`
/// the operator must publish at `WELL_KNOWN_PATH`, plus `challenge_hash` (stored) and `nonce`.
pub fn origin_issue_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let candidate_id = v["candidate_id"].as_str().unwrap_or("");
    let implementation_id = v["candidate_implementation_id"].as_str().unwrap_or("");
    let domain = v["domain"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let ttl = v["ttl_ms"].as_i64().unwrap_or(24 * 3600 * 1000); // 24 h
    if pepper.is_empty()
        || candidate_id.is_empty()
        || implementation_id.is_empty()
        || domain.is_empty()
    {
        return json!({"ok":false,"reason":"invalid_input"}).to_string();
    }
    let entropy = match hex::decode(v["entropy_hex"].as_str().unwrap_or("")) {
        Ok(b) => b,
        Err(_) => return json!({"ok":false,"reason":"bad_entropy"}).to_string(),
    };
    if entropy.len() < 32 {
        return json!({"ok":false,"reason":"insufficient_entropy"}).to_string();
    }
    let nonce = hex::encode(&entropy);
    let cid_full = hex::encode(Sha256::digest(
        format!("{candidate_id}\u{0}{implementation_id}\u{0}{nonce}").as_bytes(),
    ));
    let challenge_id = cid_full[..32].to_string();
    let challenge_hash = hmac_hex(pepper, nonce.as_bytes());
    let challenge_document = json!({
        "banza_ownership_challenge": {
            "version": "1.0",
            "candidate_id": candidate_id,
            "implementation_id": implementation_id,
            "domain": domain,
            "nonce": nonce,
            "issued_at_ms": now,
            "expires_at_ms": now + ttl
        }
    });
    json!({
        "ok": true, "challenge_id": challenge_id, "nonce": nonce, "challenge_hash": challenge_hash,
        "issued_at_ms": now, "expires_at_ms": now + ttl, "well_known_path": WELL_KNOWN_PATH,
        "challenge_document": challenge_document
    })
    .to_string()
}

/// Verify a fetched ownership challenge. Input `{pepper, fetched_content, challenge_hash, candidate_id,
/// candidate_implementation_id, domain, issued_at_ms, expires_at_ms, now_ms, response_sha256?,
/// engine_version?, consumed_at_ms?}`. Output `{ok, result, reason_code, receipt}` (an
/// `OriginVerificationReceipt`, no email/otp/session inside). A challenge whose `consumed_at_ms` is set
/// (already positively verified) is refused (`already_used`) — single-use (M2.19G.3A).
pub fn origin_verify_json(input: &str) -> String {
    let v = parse(input);
    let pepper = v["pepper"].as_str().unwrap_or("");
    let fetched = v["fetched_content"].as_str().unwrap_or("");
    let challenge_hash = v["challenge_hash"].as_str().unwrap_or("");
    let candidate_id = v["candidate_id"].as_str().unwrap_or("");
    let implementation_id = v["candidate_implementation_id"].as_str().unwrap_or("");
    let domain = v["domain"].as_str().unwrap_or("");
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let expires = v["expires_at_ms"].as_i64().unwrap_or(0);
    let issued = v["issued_at_ms"].as_i64().unwrap_or(0);
    let response_sha256 = v["response_sha256"].as_str().unwrap_or("");
    let engine_version = v["engine_version"].as_str().unwrap_or(TOOL_VERSION);
    let receipt = |result: &str, reason: &str| -> Value {
        json!({
            "receipt_type": "OriginVerificationReceipt",
            "candidate_id": candidate_id, "candidate_implementation_id": implementation_id,
            "domain": domain, "method": ".well-known", "well_known_path": WELL_KNOWN_PATH,
            "issued_at_ms": issued, "verified_at_ms": now, "result": result, "reason_code": reason,
            "engine": TOOL, "engine_version": engine_version, "response_sha256": response_sha256
        })
    };
    // M2.19G.3A — single-use: a challenge already consumed by a positive verification cannot verify
    // again (replay/idempotency guard, mirroring the OTP already-used branch). The host passes
    // `consumed_at_ms` from the stored row; once set, re-verification is refused.
    if !v["consumed_at_ms"].is_null() {
        return json!({"ok":false,"result":"already_used","reason_code":"challenge_already_consumed","receipt":receipt("failed","challenge_already_consumed")}).to_string();
    }
    if now > expires {
        return json!({"ok":false,"result":"expired","reason_code":"challenge_expired","receipt":receipt("failed","challenge_expired")}).to_string();
    }
    let doc = parse(fetched);
    let published_nonce = doc["banza_ownership_challenge"]["nonce"]
        .as_str()
        .unwrap_or("");
    if published_nonce.is_empty() {
        return json!({"ok":false,"result":"malformed","reason_code":"challenge_document_malformed","receipt":receipt("failed","challenge_document_malformed")}).to_string();
    }
    let nonce_ok = hmac_verify(pepper, published_nonce.as_bytes(), challenge_hash);
    let bind_ok = doc["banza_ownership_challenge"]["domain"].as_str() == Some(domain)
        && doc["banza_ownership_challenge"]["candidate_id"].as_str() == Some(candidate_id)
        && doc["banza_ownership_challenge"]["implementation_id"].as_str()
            == Some(implementation_id);
    if nonce_ok && bind_ok {
        json!({"ok":true,"result":"verified","reason_code":"ok","receipt":receipt("verified","ok")})
            .to_string()
    } else {
        let reason = if !bind_ok {
            "challenge_binding_mismatch"
        } else {
            "nonce_mismatch"
        };
        json!({"ok":false,"result":"mismatch","reason_code":reason,"receipt":receipt("failed",reason)}).to_string()
    }
}

// ─────────────────────────── Rate-limit policy ───────────────────────────

/// Decide a rate-limit window. Input `{now_ms, window_ms, max, count_in_window, oldest_in_window_ms?}`
/// → `{allow}` or `{allow:false, retry_after_ms, reason}`. The host keeps the counters.
pub fn ratelimit_decide_json(input: &str) -> String {
    let v = parse(input);
    let now = v["now_ms"].as_i64().unwrap_or(0);
    let window = v["window_ms"].as_i64().unwrap_or(3_600_000);
    let max = v["max"].as_i64().unwrap_or(5);
    let count = v["count_in_window"].as_i64().unwrap_or(0);
    if count < max {
        json!({"allow":true}).to_string()
    } else {
        let retry = v["oldest_in_window_ms"]
            .as_i64()
            .map(|o| (o + window - now).max(0))
            .unwrap_or(window);
        json!({"allow":false,"retry_after_ms":retry,"reason":"rate_limited"}).to_string()
    }
}

pub fn tool_version_json() -> String {
    json!({
        "tool": TOOL, "tool_version": TOOL_VERSION, "otp_digits": OTP_DIGITS,
        "well_known_path": WELL_KNOWN_PATH, "candidate_states": candidate_states()
    })
    .to_string()
}

// ─────────────────────────── tests ───────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    const PEPPER: &str = "test-pepper-value-not-a-real-secret";
    // 16 bytes of fixed entropy for OTP; 32 bytes for sessions/challenges.
    const E16: &str = "000000010000000200000003ffffffff";
    const E32: &str = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

    fn field(s: &str, k: &str) -> String {
        parse(s)[k].as_str().unwrap_or("").to_string()
    }
    fn bfield(s: &str, k: &str) -> bool {
        parse(s)[k].as_bool().unwrap_or(false)
    }

    #[test]
    fn otp_issue_then_verify_ok_and_never_stores_plaintext() {
        let iss = otp_issue_json(&json!({"pepper":PEPPER,"email":"Contact@Banza.Network","purpose":"onboarding","entropy_hex":E16,"now_ms":1000}).to_string());
        assert!(bfield(&iss, "ok"));
        let code = field(&iss, "code");
        let otp_hash = field(&iss, "otp_hash");
        assert_eq!(code.len(), OTP_DIGITS);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
        assert_ne!(code, otp_hash); // digest is not the code
        assert!(!otp_hash.contains(&code)); // no plaintext leak into the digest
                                            // email normalisation: verify with lowercase email still works
        let ver = otp_verify_json(&json!({"pepper":PEPPER,"email":"contact@banza.network","purpose":"onboarding","submitted_code":code,"otp_hash":otp_hash,"expires_at_ms":601000,"attempts":0,"now_ms":2000}).to_string());
        assert!(bfield(&ver, "ok"));
        assert_eq!(field(&ver, "verdict"), "verified");
        assert!(parse(&ver)["consume"].as_bool().unwrap());
    }

    #[test]
    fn otp_mismatch_expired_attempts_singleuse() {
        let iss = otp_issue_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","entropy_hex":E16,"now_ms":0}).to_string());
        let h = field(&iss, "otp_hash");
        let mism = otp_verify_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","submitted_code":"000000","otp_hash":h,"expires_at_ms":600000,"attempts":0,"now_ms":1}).to_string());
        assert_eq!(field(&mism, "verdict"), "mismatch");
        assert_eq!(parse(&mism)["new_attempts"].as_i64().unwrap(), 1);
        let exp = otp_verify_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","submitted_code":"123456","otp_hash":h,"expires_at_ms":600000,"attempts":0,"now_ms":700000}).to_string());
        assert_eq!(field(&exp, "verdict"), "expired");
        let att = otp_verify_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","submitted_code":"123456","otp_hash":h,"expires_at_ms":600000,"attempts":5,"max_attempts":5,"now_ms":1}).to_string());
        assert_eq!(field(&att, "verdict"), "too_many_attempts");
        let used = otp_verify_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","submitted_code":"123456","otp_hash":h,"expires_at_ms":600000,"attempts":0,"now_ms":1,"verified_at_ms":5}).to_string());
        assert_eq!(field(&used, "verdict"), "already_used");
    }

    #[test]
    fn otp_reissue_too_soon() {
        let r = otp_issue_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","entropy_hex":E16,"now_ms":30000,"last_issued_at_ms":0}).to_string());
        assert!(!bfield(&r, "ok"));
        assert_eq!(field(&r, "reason"), "reissue_too_soon");
    }

    #[test]
    fn otp_wrong_pepper_fails() {
        let iss = otp_issue_json(&json!({"pepper":PEPPER,"email":"a@b.co","purpose":"onboarding","entropy_hex":E16,"now_ms":0}).to_string());
        let code = field(&iss, "code");
        let h = field(&iss, "otp_hash");
        let ver = otp_verify_json(&json!({"pepper":"other-pepper","email":"a@b.co","purpose":"onboarding","submitted_code":code,"otp_hash":h,"expires_at_ms":600000,"attempts":0,"now_ms":1}).to_string());
        assert_eq!(field(&ver, "verdict"), "mismatch");
    }

    #[test]
    fn session_issue_verify_paths() {
        let iss = session_issue_json(
            &json!({"pepper":PEPPER,"entropy_hex":E32,"now_ms":1000}).to_string(),
        );
        assert!(bfield(&iss, "ok"));
        let token = field(&iss, "token");
        let sh = field(&iss, "session_hash");
        assert_ne!(token, sh);
        let ok = session_verify_json(&json!({"pepper":PEPPER,"token":token,"session_hash":sh,"now_ms":2000,"last_seen_ms":1000,"absolute_expires_at_ms":604801000}).to_string());
        assert!(bfield(&ok, "valid"));
        let bad = session_verify_json(&json!({"pepper":PEPPER,"token":"deadbeef","session_hash":sh,"now_ms":2000,"last_seen_ms":1000,"absolute_expires_at_ms":604801000}).to_string());
        assert_eq!(field(&bad, "reason"), "bad_token");
        let idle = session_verify_json(&json!({"pepper":PEPPER,"token":token,"session_hash":sh,"now_ms":50000000,"last_seen_ms":1000,"absolute_expires_at_ms":604801000}).to_string());
        assert_eq!(field(&idle, "reason"), "idle_expired");
        let abs = session_verify_json(&json!({"pepper":PEPPER,"token":token,"session_hash":sh,"now_ms":700000000,"last_seen_ms":699999000,"absolute_expires_at_ms":604801000}).to_string());
        assert_eq!(field(&abs, "reason"), "absolute_expired");
        let rev = session_verify_json(&json!({"pepper":PEPPER,"token":token,"session_hash":sh,"now_ms":2000,"last_seen_ms":1000,"absolute_expires_at_ms":604801000,"revoked_at_ms":1500}).to_string());
        assert_eq!(field(&rev, "reason"), "revoked");
    }

    #[test]
    fn candidate_transitions() {
        assert_eq!(
            field(
                &candidate_transition_json(
                    &json!({"state":"EMAIL_PENDING","event":"email_verified"}).to_string()
                ),
                "next_state"
            ),
            "EMAIL_VERIFIED"
        );
        assert_eq!(
            field(
                &candidate_transition_json(
                    &json!({"state":"ORIGIN_VERIFIED","event":"validation_started"}).to_string()
                ),
                "next_state"
            ),
            "VALIDATING"
        );
        let bad =
            candidate_transition_json(&json!({"state":"DRAFT","event":"published"}).to_string());
        assert!(!bfield(&bad, "ok"));
        assert_eq!(field(&bad, "reason"), "illegal_transition");
        assert_eq!(
            field(
                &candidate_transition_json(
                    &json!({"state":"VALIDATING","event":"expired"}).to_string()
                ),
                "next_state"
            ),
            "EXPIRED"
        );
    }

    #[test]
    fn origin_issue_verify_roundtrip_and_failures() {
        let iss = origin_issue_json(&json!({"pepper":PEPPER,"entropy_hex":E32,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"operador.example","now_ms":1000}).to_string());
        assert!(bfield(&iss, "ok"));
        let ch = field(&iss, "challenge_hash");
        let doc = parse(&iss)["challenge_document"].clone();
        let ver = origin_verify_json(&json!({"pepper":PEPPER,"fetched_content":doc.to_string(),"challenge_hash":ch,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"operador.example","issued_at_ms":1000,"expires_at_ms":86401000,"now_ms":2000,"response_sha256":"abc"}).to_string());
        assert!(bfield(&ver, "ok"));
        assert_eq!(field(&ver, "result"), "verified");
        assert_eq!(
            parse(&ver)["receipt"]["receipt_type"].as_str().unwrap(),
            "OriginVerificationReceipt"
        );
        // wrong domain → binding mismatch
        let wd = origin_verify_json(&json!({"pepper":PEPPER,"fetched_content":doc.to_string(),"challenge_hash":ch,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"evil.example","issued_at_ms":1000,"expires_at_ms":86401000,"now_ms":2000}).to_string());
        assert_eq!(field(&wd, "result"), "mismatch");
        // expired
        let ex = origin_verify_json(&json!({"pepper":PEPPER,"fetched_content":doc.to_string(),"challenge_hash":ch,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"operador.example","issued_at_ms":1000,"expires_at_ms":86401000,"now_ms":99999999}).to_string());
        assert_eq!(field(&ex, "result"), "expired");
        // malformed
        let mal = origin_verify_json(&json!({"pepper":PEPPER,"fetched_content":"not json","challenge_hash":ch,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"operador.example","issued_at_ms":1000,"expires_at_ms":86401000,"now_ms":2000}).to_string());
        assert_eq!(field(&mal, "result"), "malformed");
        // M2.19G.3A single-use: a consumed challenge cannot verify again even with the correct document
        let used = origin_verify_json(&json!({"pepper":PEPPER,"fetched_content":doc.to_string(),"challenge_hash":ch,"candidate_id":"cand-1","candidate_implementation_id":"impl-1","domain":"operador.example","issued_at_ms":1000,"expires_at_ms":86401000,"now_ms":2000,"consumed_at_ms":1500}).to_string());
        assert_eq!(field(&used, "result"), "already_used");
        assert_eq!(field(&used, "reason_code"), "challenge_already_consumed");
    }

    #[test]
    fn ratelimit_policy() {
        assert!(bfield(
            &ratelimit_decide_json(
                &json!({"now_ms":1000,"window_ms":3600000,"max":5,"count_in_window":2}).to_string()
            ),
            "allow"
        ));
        let d = ratelimit_decide_json(&json!({"now_ms":1000,"window_ms":3600000,"max":5,"count_in_window":5,"oldest_in_window_ms":500}).to_string());
        assert!(!parse(&d)["allow"].as_bool().unwrap());
        assert_eq!(
            parse(&d)["retry_after_ms"].as_i64().unwrap(),
            500 + 3600000 - 1000
        );
    }

    #[test]
    fn derive_code_is_six_digits_and_unbiased_window() {
        let e = hex::decode(E16).unwrap();
        let c = derive_code(&e).unwrap();
        assert_eq!(c.len(), 6);
        // all-0xFF first window is rejected (>= limit), so it falls through to a later window
        assert!(c.chars().all(|ch| ch.is_ascii_digit()));
    }
}
