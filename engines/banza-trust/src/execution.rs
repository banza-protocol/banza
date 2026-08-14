//! Execution semantics — reason codes and idempotency.
//!
//! **This module implements `spec/reason-codes.md` and `spec/idempotency.md`; it does not define
//! them.** The specifications are the authority. Conformance is proven against the public vectors in
//! `conformance/vectors/reason-codes.json` and `conformance/vectors/idempotency.json`, which were
//! derived from the specification text rather than from this code.
//!
//! It lives beside `canonical` because both rules rest on `BCJ/1`: request identity is a `BCJ/1`
//! digest, so an implementation cannot hold two disagreeing notions of "the same document".

use crate::canonical;
use serde_json::Value;

// ── reason codes (spec/reason-codes.md) ─────────────────────────────────────────────────────────

/// The classification of a reason-code string.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodeShape {
    /// Matches the core grammar (no dot). Whether it is *registered* is a separate question.
    Core,
    /// Matches the reserved extension namespace `x-<vendor>.<code>` (§5).
    Extension,
    /// Matches neither grammar and MUST be rejected.
    Invalid,
}

/// Classify a reason code by grammar alone (`spec/reason-codes.md` §5).
pub fn code_shape(code: &str) -> CodeShape {
    if let Some(rest) = code.strip_prefix("x-") {
        // x-<vendor>.<code> — vendor is a non-empty lowercase label not starting or ending with '-'
        let Some((vendor, suffix)) = rest.split_once('.') else {
            return CodeShape::Invalid;
        };
        let vendor_ok = !vendor.is_empty()
            && !vendor.starts_with('-')
            && !vendor.ends_with('-')
            && vendor
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
        let suffix_ok = !suffix.is_empty()
            && suffix
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-');
        return if vendor_ok && suffix_ok {
            CodeShape::Extension
        } else {
            CodeShape::Invalid
        };
    }
    if code.is_empty() || code.contains('.') {
        return CodeShape::Invalid;
    }
    let first = code.chars().next().unwrap();
    let upper = first.is_ascii_uppercase()
        && code
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_');
    let lower = first.is_ascii_lowercase()
        && code
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_');
    if upper || lower {
        CodeShape::Core
    } else {
        CodeShape::Invalid
    }
}

/// The core reason codes of a set, with extension codes removed and duplicates collapsed, sorted.
///
/// This is the projection `spec/reason-codes.md` §8.3 compares: reason codes are a *set*, ordering
/// is not significant, and extension codes are removed before comparison.
pub fn core_code_set(codes: &[String]) -> Vec<String> {
    let mut out: Vec<String> = codes
        .iter()
        .filter(|c| code_shape(c) == CodeShape::Core)
        .cloned()
        .collect();
    out.sort();
    out.dedup();
    out
}

/// Validate a reason-code array for an OPEN field (`reason_codes`).
///
/// Unknown core-shaped codes are accepted (§6): adding a core code is backward compatible, so
/// rejecting unknown ones would make every future addition breaking. Only a code matching neither
/// grammar is an error.
pub fn validate_reason_codes(codes: &[String]) -> Result<(), String> {
    for c in codes {
        if code_shape(c) == CodeShape::Invalid {
            return Err(format!(
                "reason code '{c}' matches neither the core grammar nor the reserved extension \
                 namespace x-<vendor>.<code> (spec/reason-codes.md §5)"
            ));
        }
    }
    Ok(())
}

/// Validate `failed_checks` against the published check ids (`spec/reason-codes.md` §4).
///
/// `outcome_allows_routing` is true for `ROUTING_ALLOWED`. The emptiness rule is an iff: an
/// evaluation that refuses must say which check refused it.
pub fn validate_failed_checks(
    failed: &[String],
    published_check_ids: &[String],
    outcome_allows_routing: bool,
) -> Result<(), String> {
    for c in failed {
        if !published_check_ids.iter().any(|p| p == c) {
            return Err(format!(
                "failed_checks value '{c}' is not a published check id (spec/reason-codes.md §4)"
            ));
        }
    }
    let mut seen = failed.to_vec();
    seen.sort();
    let before = seen.len();
    seen.dedup();
    if seen.len() != before {
        return Err("failed_checks contains a duplicate; it is a set expressed as an array".into());
    }
    if outcome_allows_routing && !failed.is_empty() {
        return Err("failed_checks MUST be empty when outcome = ROUTING_ALLOWED".into());
    }
    if !outcome_allows_routing && failed.is_empty() {
        return Err("failed_checks MUST be non-empty when outcome = FAIL_CLOSED".into());
    }
    Ok(())
}

// ── idempotency (spec/idempotency.md) ───────────────────────────────────────────────────────────

/// Members removed before computing the request identity digest (`spec/idempotency.md` §4).
///
/// This list is exhaustive and closed: an implementation MUST NOT exclude any other member. In
/// particular a signature over the request is deliberately NOT here — see §4 and ADR-022 D-2.
pub const REQUEST_IDENTITY_EXCLUDED: &[&str] = &[
    "idempotency_key",
    "trace_id",
    "correlation_id",
    "request_id",
    "timestamp",
    "requested_at",
    "client_time",
    "nonce",
];

/// The protocol floor for idempotency-record retention, in seconds (`spec/idempotency.md` §7).
pub const RETENTION_FLOOR_SECONDS: u64 = 86_400;

/// The request identity digest (`spec/idempotency.md` §3): the `BCJ/1` digest of the body with the
/// excluded members removed.
///
/// A body `BCJ/1` rejects has no request identity and MUST be rejected before any idempotency
/// processing — the `Err` here is that rejection, not a fallback value.
pub fn request_identity(body: &Value) -> Result<String, String> {
    canonical::digest(body, REQUEST_IDENTITY_EXCLUDED)
}

/// Request identity from wire bytes, which is the only form in which `BCJ/1` P3 (duplicate members)
/// can be enforced — see `crate::verify_signed_doc_bytes` for the same reasoning.
pub fn request_identity_from_bytes(raw: &str) -> Result<String, String> {
    request_identity(&canonical::parse_strict(raw)?)
}

/// The scope tuple that identifies an idempotency record (`spec/idempotency.md` §2).
///
/// Neither wider nor narrower: wider creates false conflicts across callers and operations, narrower
/// lets the same intent execute twice.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct IdempotencyScope {
    pub receiving_implementation: String,
    pub authenticated_caller: String,
    pub operation: String,
    pub idempotency_key: String,
}

/// What a repeated request is, relative to a stored record.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdempotencyOutcome {
    /// Same scope, same request identity → return the original result, perform nothing (§5).
    Replay,
    /// Same scope, different request identity → 409, no side effect, record untouched (§6).
    Conflict,
    /// A different scope tuple, or an expired record → a new operation, not a repeat (§2, §7).
    DistinctOperation,
}

/// Classify a repeated request (`spec/idempotency.md` §2, §3, §5, §6, §7).
///
/// `age_seconds` is the age of the stored record; `declared_retention_seconds` is what the
/// implementation published. Past the declared window the record is forgotten and the request is a
/// new operation — the honest consequence stated in §7.
pub fn classify(
    stored_scope: &IdempotencyScope,
    stored_digest: &str,
    stored_age_seconds: u64,
    declared_retention_seconds: u64,
    incoming_scope: &IdempotencyScope,
    incoming_digest: &str,
) -> IdempotencyOutcome {
    if stored_scope != incoming_scope || stored_age_seconds >= declared_retention_seconds {
        return IdempotencyOutcome::DistinctOperation;
    }
    if stored_digest == incoming_digest {
        IdempotencyOutcome::Replay
    } else {
        IdempotencyOutcome::Conflict
    }
}

/// Validate a declared retention window against the protocol floor (`spec/idempotency.md` §7).
pub fn validate_declared_retention(seconds: u64) -> Result<(), String> {
    if seconds < RETENTION_FLOOR_SECONDS {
        return Err(format!(
            "declared idempotency retention {seconds}s is below the protocol floor of \
             {RETENTION_FLOOR_SECONDS}s (spec/idempotency.md §7)"
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn core_and_extension_grammars_cannot_collide() {
        assert_eq!(code_shape("TRUST_VALID"), CodeShape::Core);
        assert_eq!(code_shape("host_mismatch"), CodeShape::Core);
        assert_eq!(code_shape("x-acme.gateway_timeout"), CodeShape::Extension);
        // a core code can never contain a dot, which is what makes collision impossible
        assert_eq!(code_shape("acme.timeout"), CodeShape::Invalid);
        assert_eq!(code_shape("x-.oops"), CodeShape::Invalid);
        assert_eq!(code_shape("x-acme"), CodeShape::Invalid);
        assert_eq!(code_shape(""), CodeShape::Invalid);
        assert_eq!(code_shape("Mixed_Case"), CodeShape::Invalid);
    }

    #[test]
    fn an_unregistered_core_code_is_tolerated() {
        // §6: adding a core code is backward compatible, so unknown ones must not be rejected.
        assert!(validate_reason_codes(&["SOME_FUTURE_CODE".into()]).is_ok());
        assert!(validate_reason_codes(&["x-vendor.whatever".into()]).is_ok());
        assert!(validate_reason_codes(&["not a code".into()]).is_err());
    }

    #[test]
    fn equivalence_ignores_order_duplicates_and_extensions() {
        let a = vec![
            "B_CODE".to_string(),
            "A_CODE".to_string(),
            "x-acme.cache_hit".to_string(),
        ];
        let b = vec![
            "A_CODE".to_string(),
            "B_CODE".to_string(),
            "A_CODE".to_string(),
        ];
        assert_eq!(core_code_set(&a), core_code_set(&b));
    }

    #[test]
    fn failed_checks_is_a_set_of_published_ids_with_an_emptiness_rule() {
        let ids: Vec<String> = vec!["not_revoked".into(), "trust_root".into()];
        assert!(validate_failed_checks(&["not_revoked".into()], &ids, false).is_ok());
        assert!(validate_failed_checks(&[], &ids, true).is_ok());
        // unpublished id
        assert!(validate_failed_checks(&["nope".into()], &ids, false).is_err());
        // duplicate
        assert!(
            validate_failed_checks(&["not_revoked".into(), "not_revoked".into()], &ids, false)
                .is_err()
        );
        // non-empty while routing allowed, and empty while fail-closed
        assert!(validate_failed_checks(&["not_revoked".into()], &ids, true).is_err());
        assert!(validate_failed_checks(&[], &ids, false).is_err());
    }

    #[test]
    fn request_identity_ignores_formatting_and_excluded_members() {
        let a = json!({"amount_minor": 150000, "currency": "AOA", "idempotency_key": "k1",
                       "trace_id": "t-1"});
        let b = json!({"currency": "AOA", "amount_minor": 150000, "idempotency_key": "k1",
                       "trace_id": "t-999", "timestamp": "2026-08-12T10:00:00Z"});
        assert_eq!(request_identity(&a).unwrap(), request_identity(&b).unwrap());
    }

    #[test]
    fn request_identity_includes_signatures_and_unknown_members() {
        let base = json!({"amount_minor": 1, "idempotency_key": "k1"});
        let signed_a = json!({"amount_minor": 1, "idempotency_key": "k1", "signature": "AAAA"});
        let signed_b = json!({"amount_minor": 1, "idempotency_key": "k1", "signature": "BBBB"});
        let ext = json!({"amount_minor": 1, "idempotency_key": "k1", "vendor_note": "x"});
        assert_ne!(
            request_identity(&signed_a).unwrap(),
            request_identity(&signed_b).unwrap(),
            "a different signature over identical content is a different request (ADR-022 D-2)"
        );
        assert_ne!(
            request_identity(&base).unwrap(),
            request_identity(&ext).unwrap(),
            "an unknown member is part of the request (BCJ/1 P4)"
        );
    }

    #[test]
    fn a_body_bcj1_rejects_has_no_request_identity() {
        let bad = json!({"idempotency_key": "k1", "amount_minor": 1.5});
        assert!(request_identity(&bad).is_err());
        assert!(request_identity_from_bytes(r#"{"a":1,"a":2}"#).is_err());
    }

    fn scope(caller: &str, op: &str, key: &str) -> IdempotencyScope {
        IdempotencyScope {
            receiving_implementation: "impl-a".into(),
            authenticated_caller: caller.into(),
            operation: op.into(),
            idempotency_key: key.into(),
        }
    }

    #[test]
    fn classification_covers_replay_conflict_and_distinct() {
        let s = scope("caller-1", "POST /v1/transfers", "order-001");
        let r = 604_800;
        assert_eq!(
            classify(&s, "d1", 3600, r, &s, "d1"),
            IdempotencyOutcome::Replay
        );
        assert_eq!(
            classify(&s, "d1", 3600, r, &s, "d2"),
            IdempotencyOutcome::Conflict
        );
        // a different caller is a different record, not a conflict
        let other_caller = scope("caller-2", "POST /v1/transfers", "order-001");
        assert_eq!(
            classify(&s, "d1", 3600, r, &other_caller, "d1"),
            IdempotencyOutcome::DistinctOperation
        );
        // a different operation likewise
        let other_op = scope(
            "caller-1",
            "POST /v1/collections/x/shares/y/pay",
            "order-001",
        );
        assert_eq!(
            classify(&s, "d1", 3600, r, &other_op, "d1"),
            IdempotencyOutcome::DistinctOperation
        );
        // past the declared window the record is forgotten
        assert_eq!(
            classify(&s, "d1", 90_000, 86_400, &s, "d1"),
            IdempotencyOutcome::DistinctOperation
        );
    }

    #[test]
    fn declared_retention_must_meet_the_floor() {
        assert!(validate_declared_retention(86_400).is_ok());
        assert!(validate_declared_retention(604_800).is_ok());
        assert!(validate_declared_retention(3_600).is_err());
    }
}
