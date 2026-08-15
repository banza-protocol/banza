//! banza-trust (ADR-038, R5; M2.4) — the Rust BANZA trust verifier for the open financial protocol.
//!
//! The protocol's trust is verified by **signed protocol metadata, delegated signing keys, operator
//! manifests, conformance evidence, the public protocol registry, and revocation/fail-closed** — never
//! by an operator certificate, a CA signature, or a human approval. Ed25519 signatures cover the
//! **`BCJ/1`** canonical form defined by `spec/canonicalization.md`, base64url-no-pad. That
//! specification is the authority; this crate implements it (ADR-011).
//! Every check is **fail-closed**: missing, malformed, invalid, expired, revoked or incompatible trust
//! material rejects.
//!
//! This crate NEVER generates production keys, NEVER signs a production artifact, NEVER authorises,
//! certifies or approves an operator, and carries no real key. It verifies TEST-ONLY fixtures. The full
//! evaluation lives in [`evaluate`]; the deterministic TEST-ONLY signer lives in [`sign`].

pub mod authority_set;
pub mod canonical;
pub mod evaluate;
pub mod execution;
pub mod freshness;
pub mod sign;
pub mod tool;

#[cfg(feature = "wasm")]
mod wasm;

use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

/// The protocol version this verifier evaluates against. Bound to
/// `contracts/production/protocol-version.json` by `protocol_version_matches_the_normative_contract`
/// — the version must never be restated independently in an engine, which is how 1.0.0 and 2.0.0
/// would drift apart.
pub const PROTOCOL_VERSION: &str = "2.0.0";

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

// ── Canonicalization (BCJ/1 — spec/canonicalization.md, ADR-011) ─────────────

/// Canonical bytes under **BANZA Canonical JSON `BCJ/1`** — the normative form defined by
/// `spec/canonicalization.md` (ADR-011). This function implements that specification; it does not
/// define it.
///
/// Fail-closed per `spec/canonicalization.md` §7: a document that violates the profile is
/// **rejected**, never degraded. This returns `Err` rather than bytes.
///
/// It previously returned `Vec<u8>` and collapsed a rejection to an empty vector. That was a
/// divergence from the specification with a real consequence: every rejected document produced the
/// *same* bytes, so two different invalid artifacts shared one signing input and one digest. The
/// signature is required to be over the artifact, so there is no correct empty value to fall back
/// to, and the error must reach the caller.
pub fn canonical_bytes(doc: &Value, exclude: &[&str]) -> Result<Vec<u8>, String> {
    canonical::canonicalize(doc, exclude)
}

/// SHA-256 hex over the `BCJ/1` canonical bytes (`spec/canonicalization.md` §5). Fail-closed for the
/// same reason as [`canonical_bytes`]: a digest of a rejected document is not a digest of anything.
pub fn canonical_sha256(doc: &Value, exclude: &[&str]) -> Result<String, String> {
    Ok(format!(
        "{:x}",
        Sha256::digest(canonical_bytes(doc, exclude)?)
    ))
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

/// Verify a signed document **from its wire bytes**, which is the only form in which P3 can be
/// enforced (`spec/canonicalization.md` §3 P3, §7 step 1).
///
/// P3 rejects a document containing a repeated member name. By the time JSON text has become a
/// `Value`, the parser has already silently resolved the duplicate — `serde_json` keeps the last
/// occurrence — so [`verify_signed_doc`] cannot see it and cannot reject it. Any caller that holds
/// the fetched bytes MUST use this function; passing an already-parsed `Value` skips P3.
pub fn verify_signed_doc_bytes(kind: &str, raw: &str, public_key_b64url: &str) -> TrustResult {
    match canonical::parse_strict(raw) {
        Ok(doc) => verify_signed_doc(kind, &doc, public_key_b64url),
        Err(e) => TrustResult::fail(kind, &e),
    }
}

/// Verify a document whose signature covers all fields except `signature`, under a given public key.
///
/// **P3 is not checked here** and cannot be: see [`verify_signed_doc_bytes`]. Prefer that function
/// wherever the wire bytes are still available.
pub fn verify_signed_doc(kind: &str, doc: &Value, public_key_b64url: &str) -> TrustResult {
    let sig = match doc.get("signature").and_then(|s| s.as_str()) {
        Some(s) if !s.is_empty() => s,
        _ => return TrustResult::fail(kind, "missing signature field (fail-closed)"),
    };
    let msg = match canonical_bytes(doc, &["signature"]) {
        Ok(m) => m,
        Err(e) => return TrustResult::fail(kind, &e),
    };
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

/// Verify a Key Manifest under the **active Root Authority Set**.
///
/// v1.0.0 verified the manifest under a single root public key, which left the 2-of-3 model with no
/// runtime expression at all: the threshold existed in ceremony documents and nowhere in the chain a
/// verifier actually walks. The manifest is now authorised by at least `THRESHOLD` distinct authorities
/// of the active set (`INV-ROOT-002`), which is what makes "no single authority controls the Root" true
/// of the protocol rather than of a procedure.
pub fn verify_key_manifest(manifest: &Value, active_set: &Value) -> TrustResult {
    authority_set::verify_key_manifest_under_set(manifest, active_set)
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
    let msg = match canonical_bytes(report, &["package_signature", "evidence_hash"]) {
        Ok(m) => m,
        Err(e) => return TrustResult::fail("evidence", &e),
    };
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
