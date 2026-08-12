//! banza-trust (ADR-037, R5; M2.4) — the Rust BANZA trust verifier for the open financial protocol.
//!
//! The protocol's trust is verified by **signed protocol metadata, delegated signing keys, operator
//! manifests, conformance evidence, the public protocol registry, and revocation/fail-closed** — never
//! by an operator certificate, a CA signature, or a human approval. Ed25519 signatures cover the
//! ADR-038 canonical form (all fields except `signature`, sorted keys, compact JSON), base64url-no-pad.
//! Every check is **fail-closed**: missing, malformed, invalid, expired, revoked or incompatible trust
//! material rejects.
//!
//! This crate NEVER generates production keys, NEVER signs a production artifact, NEVER authorises,
//! certifies or approves an operator, and carries no real key. It verifies TEST-ONLY fixtures. The full
//! evaluation lives in [`evaluate`]; the deterministic TEST-ONLY signer lives in [`sign`].

pub mod evaluate;
pub mod sign;
pub mod tool;

#[cfg(feature = "wasm")]
mod wasm;

use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

pub const VERIFIER: &str = "banza-trust";
pub const VERIFIER_VERSION: &str = "0.2.0";

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct TrustResult {
    pub verified: bool,
    pub kind: String,
    pub detail: String,
}

impl TrustResult {
    pub fn ok(kind: &str, detail: &str) -> Self {
        TrustResult {
            verified: true,
            kind: kind.into(),
            detail: detail.into(),
        }
    }
    pub fn fail(kind: &str, detail: &str) -> Self {
        TrustResult {
            verified: false,
            kind: kind.into(),
            detail: detail.into(),
        }
    }
}

// ── Canonicalization (ADR-038) ───────────────────────────────────────────────

/// Canonical bytes: the value minus the excluded keys, serialized with sorted keys and compact
/// separators. `serde_json`'s Map is a BTreeMap (sorted) and `to_string` is compact, matching
/// Python `json.dumps(sort_keys=True, separators=(',',':'))` for ASCII payloads.
pub fn canonical_bytes(doc: &Value, exclude: &[&str]) -> Vec<u8> {
    let mut obj = doc.clone();
    if let Value::Object(map) = &mut obj {
        for k in exclude {
            map.remove(*k);
        }
    }
    serde_json::to_string(&obj).unwrap_or_default().into_bytes()
}

/// SHA-256 hex of the canonical form (excluding the given keys).
pub fn canonical_sha256(doc: &Value, exclude: &[&str]) -> String {
    format!("{:x}", Sha256::digest(canonical_bytes(doc, exclude)))
}

fn decode_b64url(s: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s.trim())
        .map_err(|e| format!("base64url decode: {e}"))
}

/// Verify a raw ed25519 signature (base64url) of `message` under a 32-byte public key (base64url).
pub fn verify_ed25519(
    public_key_b64url: &str,
    signature_b64url: &str,
    message: &[u8],
) -> Result<(), String> {
    let pk = decode_b64url(public_key_b64url)?;
    let pk: [u8; 32] = pk
        .as_slice()
        .try_into()
        .map_err(|_| "public key must be 32 bytes".to_string())?;
    let vk = VerifyingKey::from_bytes(&pk).map_err(|e| format!("bad public key: {e}"))?;
    let sig = decode_b64url(signature_b64url)?;
    let sig: [u8; 64] = sig
        .as_slice()
        .try_into()
        .map_err(|_| "signature must be 64 bytes".to_string())?;
    let sig = Signature::from_bytes(&sig);
    vk.verify_strict(message, &sig)
        .map_err(|_| "InvalidSignature".to_string())
}

/// Verify a document whose signature covers all fields except `signature`, under a given public key.
pub fn verify_signed_doc(kind: &str, doc: &Value, public_key_b64url: &str) -> TrustResult {
    let sig = match doc.get("signature").and_then(|s| s.as_str()) {
        Some(s) if !s.is_empty() => s,
        _ => return TrustResult::fail(kind, "missing signature field (fail-closed)"),
    };
    let msg = canonical_bytes(doc, &["signature"]);
    match verify_ed25519(public_key_b64url, sig, &msg) {
        Ok(()) => TrustResult::ok(kind, "signature valid"),
        Err(e) => TrustResult::fail(kind, &e),
    }
}

/// Verify the operator's **signed protocol metadata** under the delegated signing key's public key.
/// This authenticates PROTOCOL material — it never authorises, certifies or approves the operator.
pub fn verify_signed_protocol_metadata(
    metadata: &Value,
    delegated_key_public_b64url: &str,
) -> TrustResult {
    verify_signed_doc(
        "signed_protocol_metadata",
        metadata,
        delegated_key_public_b64url,
    )
}

/// Verify the Revocation List signature under the revocation-domain delegated key.
/// Fail-closed: an unsigned or unverifiable Revocation List is treated as absent (INV-FEDEVAL-005).
pub fn verify_revocation_list(list: &Value, revocation_key_public_b64url: &str) -> TrustResult {
    verify_signed_doc("revocation_list", list, revocation_key_public_b64url)
}

/// Verify a Key Manifest signature under the trust root's public key.
pub fn verify_key_manifest(manifest: &Value, root_public_key_b64url: &str) -> TrustResult {
    verify_signed_doc("key_manifest", manifest, root_public_key_b64url)
}

/// Verify a conformance-evidence package: signature nested at `package_signature.signature`; the signed
/// payload excludes `package_signature` and `evidence_hash`; `evidence_hash` = sha256(canonical).
pub fn verify_evidence_package(report: &Value, evidence_key_public_b64url: &str) -> TrustResult {
    let sig = match report
        .get("package_signature")
        .and_then(|p| p.get("signature"))
        .and_then(|s| s.as_str())
    {
        Some(s) if !s.is_empty() => s,
        _ => return TrustResult::fail("evidence", "no package_signature.signature (fail-closed)"),
    };
    let msg = canonical_bytes(report, &["package_signature", "evidence_hash"]);
    if let Err(e) = verify_ed25519(evidence_key_public_b64url, sig, &msg) {
        return TrustResult::fail("evidence", &e);
    }
    if let Some(reported) = report.get("evidence_hash").and_then(|h| h.as_str()) {
        let computed = format!("{:x}", Sha256::digest(&msg));
        if computed != reported {
            return TrustResult::fail("evidence", "evidence_hash mismatch");
        }
    }
    TrustResult::ok("evidence", "evidence package signature valid")
}
