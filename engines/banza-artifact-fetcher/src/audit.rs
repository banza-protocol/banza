//! Per-fetch identifiers, timestamps, hashing and the one-line audit record (ADR-034 §4.8, §20).

use crate::types::FetchResponse;
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

static COUNTER: AtomicU64 = AtomicU64::new(0);

/// A process-unique request id, e.g. `af-1a2b3c4d5e6f-000000000001`. No external dependency; unique
/// enough to correlate an audit line with a receipt without being a security token.
pub fn new_request_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("af-{nanos:012x}-{n:012x}")
}

/// Current time as an RFC3339 UTC string.
pub fn now_rfc3339() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

/// Lowercase-hex SHA-256 of the given bytes.
pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    let digest = h.finalize();
    let mut out = String::with_capacity(digest.len() * 2);
    for b in digest {
        out.push(char::from_digit((b >> 4) as u32, 16).unwrap());
        out.push(char::from_digit((b & 0x0f) as u32, 16).unwrap());
    }
    out
}

/// Emit exactly one JSON audit line per fetch to stdout (ADR-034 §4.8: protocol fetches are counted
/// as `protocol_fetch`, never as external model calls). Deterministic single line; greppable.
pub fn audit_line(resp: &FetchResponse) {
    let reasons: Vec<&str> = resp.reason_codes.iter().map(|r| r.as_str()).collect();
    let record = serde_json::json!({
        "event": "protocol_fetch",
        "request_id": resp.request_id,
        "ok": resp.ok,
        "url": resp.url,
        "resolved_ip": resp.resolved_ip,
        "http_status": resp.http_status,
        "content_type": resp.content_type,
        "content_length": resp.content_length,
        "sha256": resp.sha256,
        "tls_ok": resp.tls_ok,
        "redirect_count": resp.redirect_count,
        "duration_ms": resp.duration_ms,
        "fetched_at": resp.fetched_at,
        "reason_codes": reasons,
    });
    println!("{record}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_ids_are_unique() {
        let a = new_request_id();
        let b = new_request_id();
        assert_ne!(a, b);
        assert!(a.starts_with("af-"));
    }

    #[test]
    fn sha256_matches_known_vector() {
        // SHA-256("") well-known digest.
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        // SHA-256("abc")
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn rfc3339_is_zulu() {
        let s = now_rfc3339();
        assert!(s.ends_with('Z') || s.contains('+'));
        assert!(s.contains('T'));
    }
}
