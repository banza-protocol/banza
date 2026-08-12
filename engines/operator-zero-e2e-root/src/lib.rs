//! operator-zero-e2e-root (ADR-052, M2.13A) — a DEMO-ONLY Ed25519 signing root for the Operador Zero
//! end-to-end protocol validation.
//!
//! WHAT THIS IS. A tiny, self-contained Rust crate that:
//!   - generates an EPHEMERAL Ed25519 keypair (the `gen` binary; the private key lives only in memory
//!     for the duration of that one run and is NEVER written to disk or committed);
//!   - signs the demo Operador Zero manifest and a demo evidence bundle;
//!   - emits ONLY public artifacts (public key, key manifest, fingerprint, signature report, revocation
//!     list, signed manifest, signed evidence bundle, verification trace);
//!   - verifies those artifacts using the PUBLIC key alone (`verify_*`, used by the tests + guard).
//!
//! WHAT THIS IS NOT. It is not the protocol Trust Root. It does not certify, authorise, license or
//! approve any operator, and it moves no real money. Every artifact carries `demo_only: true`,
//! `production_allowed: false`, `monetary_value: false`, `root_type: "demo_operator_root"` and
//! `not_protocol_trust_root: true`. Verification here proves signature integrity and revocation
//! fail-closed; it is technical evidence, never certification.
//!
//! Rust is the source of truth (ADR-037): signing, verification, canonicalisation, fingerprinting and
//! the revocation/fail-closed decision all happen here.

use base64::Engine as _;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub const OPERATOR_ID: &str = "operator-zero";
pub const OPERATOR_DISPLAY_NAME: &str = "Operador Zero";
/// A DIFFERENT demo key id that the revocation list marks revoked — used to prove revocation blocks
/// trust. It is NOT the active E2E root key.
pub const REVOKED_DEMO_KEY_ID: &str = "oz-e2e-revoked-demo-1";

// ── multibase (base64, prefix 'm' per the multibase table) ──────────────────────────────────────
fn b64() -> base64::engine::general_purpose::GeneralPurpose {
    base64::engine::general_purpose::STANDARD_NO_PAD
}
/// Encode bytes as multibase base64 (`m` + base64, no padding).
pub fn mb64(bytes: &[u8]) -> String {
    format!("m{}", b64().encode(bytes))
}
/// Decode a multibase base64 string (must start with `m`). Returns None on any malformed input.
pub fn unmb64(s: &str) -> Option<Vec<u8>> {
    let rest = s.strip_prefix('m')?;
    b64().decode(rest.as_bytes()).ok()
}

// ── deterministic canonical JSON + digest ───────────────────────────────────────────────────────
/// Canonical bytes of a JSON value: serde_json's object map is a sorted BTreeMap by default, so the
/// serialization is deterministic (sorted keys, compact). Enough for signing our string/bool payloads.
pub fn canonical(v: &Value) -> Vec<u8> {
    serde_json::to_vec(v).expect("Value serializes")
}
/// SHA-256 of arbitrary bytes.
pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().into()
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

// ── keys / signing / verification ───────────────────────────────────────────────────────────────
/// A key id derived from the public key (stable, non-secret).
pub fn key_id(public_key: &[u8]) -> String {
    format!("oz-e2e-root-{}", &hex(&sha256(public_key))[..16])
}
/// A fingerprint: `sha256:<hex>` of the public key bytes (non-secret).
pub fn fingerprint(public_key: &[u8]) -> String {
    format!("sha256:{}", hex(&sha256(public_key)))
}

/// Sign a payload: the signature is over the SHA-256 digest of the payload's canonical JSON bytes.
/// Returns the signature as multibase base64. Requires the (in-memory, ephemeral) signing key.
pub fn sign_payload(sk: &SigningKey, payload: &Value) -> String {
    let digest = sha256(&canonical(payload));
    mb64(&sk.sign(&digest).to_bytes())
}

/// Verify a payload signature using ONLY the public key. No private key needed.
pub fn verify_payload(
    public_key_multibase: &str,
    payload: &Value,
    signature_multibase: &str,
) -> bool {
    let pk_bytes = match unmb64(public_key_multibase) {
        Some(b) if b.len() == 32 => b,
        _ => return false,
    };
    let sig_bytes = match unmb64(signature_multibase) {
        Some(b) if b.len() == 64 => b,
        _ => return false,
    };
    let vk = match VerifyingKey::from_bytes(&pk_bytes.try_into().unwrap()) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let sig = Signature::from_bytes(&sig_bytes.try_into().unwrap());
    let digest = sha256(&canonical(payload));
    vk.verify(&digest, &sig).is_ok()
}

/// Is a key id revoked according to a revocation-list artifact? (fail-closed helper)
pub fn is_revoked(revocation_list: &Value, key_id: &str) -> bool {
    revocation_list
        .get("revoked")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .any(|e| e.get("key_id").and_then(|k| k.as_str()) == Some(key_id))
        })
        .unwrap_or(false)
}

/// Fail-closed trust evaluation for the DEMO root: trust is `valid` only when the signature verifies
/// AND the signing key is not revoked. Anything else → `blocked`. Never a production authorisation.
pub fn evaluate_trust(
    public_key_multibase: &str,
    key_id: &str,
    payload: &Value,
    signature_multibase: &str,
    revocation_list: &Value,
) -> &'static str {
    if is_revoked(revocation_list, key_id) {
        return "blocked_revoked";
    }
    if !verify_payload(public_key_multibase, payload, signature_multibase) {
        return "blocked_signature";
    }
    "valid_demo"
}

// ── demo payloads + artifact builders (all carry the demo boundary) ─────────────────────────────
fn demo_fields() -> Value {
    json!({
        "demo_only": true,
        "operator_id": OPERATOR_ID,
        "operator_display_name": OPERATOR_DISPLAY_NAME,
        "production_allowed": false,
        "monetary_value": false,
        "root_type": "demo_operator_root",
        "not_protocol_trust_root": true,
    })
}
fn merge(base: Value, extra: Value) -> Value {
    let mut m = base.as_object().unwrap().clone();
    for (k, v) in extra.as_object().unwrap() {
        m.insert(k.clone(), v.clone());
    }
    Value::Object(m)
}

/// The demo manifest payload the root signs (a coherent Operador Zero demo operator manifest).
pub fn demo_manifest() -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": "operator_manifest",
            "currency": "KZ_DEMO",
            "environment": "sandbox",
            "protocol_version": "1.0",
            "capabilities": ["qr_payment_demo", "refund_demo", "reconciliation_demo"],
        }),
    )
}

/// A demo evidence bundle payload the root signs.
pub fn demo_evidence_bundle() -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": "evidence_bundle",
            "currency": "KZ_DEMO",
            "status": "complete",
            "includes": ["manifest", "conformance", "trust", "payment", "refund", "reconciliation", "federation", "traces"],
            "note": "Evidence técnica local da simulação. Não é certificação, licença nem autorização.",
        }),
    )
}

/// Build the public-key artifact (`operator-zero-e2e-root.public.json`).
pub fn public_key_artifact(public_key: &[u8]) -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": "demo_operator_root_public_key",
            "root_name": "Operator Zero E2E Demo Root",
            "algorithm": "ed25519",
            "public_key_multibase": mb64(public_key),
            "key_id": key_id(public_key),
            "fingerprint": fingerprint(public_key),
            "note": "Raiz demonstrativa E2E. Não é a Trust Root do protocolo BANZA. Nenhuma chave privada existe neste repositório; a verificação usa apenas a chave pública.",
        }),
    )
}

/// Build the key-manifest artifact.
pub fn key_manifest_artifact(public_key: &[u8]) -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": "key_manifest",
            "root_name": "Operator Zero E2E Demo Root",
            "keys": [{
                "key_id": key_id(public_key),
                "usage": "signing",
                "status": "active",
                "algorithm": "ed25519",
                "public_key_multibase": mb64(public_key),
            }],
        }),
    )
}

/// Build the revocation-list artifact — revokes a DIFFERENT demo key (not the active root), so trust
/// on the active root stays valid while the revoked key is blocked fail-closed.
pub fn revocation_list_artifact() -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": "revocation_list",
            "revoked": [{
                "key_id": REVOKED_DEMO_KEY_ID,
                "revoked_at": "2026-07-22T00:00:00Z",
                "reason": "demonstração de fail-closed do E2E",
            }],
        }),
    )
}

/// Build a signed-payload artifact wrapping `payload` with its signature.
pub fn signed_artifact(
    public_key: &[u8],
    payload_type: &str,
    payload: &Value,
    signature_multibase: &str,
) -> Value {
    merge(
        demo_fields(),
        json!({
            "artifact_type": format!("signed_{payload_type}"),
            "algorithm": "ed25519",
            "key_id": key_id(public_key),
            "public_key_multibase": mb64(public_key),
            "payload_canonical_sha256": hex(&sha256(&canonical(payload))),
            "signature_multibase": signature_multibase,
            "payload": payload,
        }),
    )
}

/// Build the signature-report artifact: one entry per signed payload, each with its digest + signature,
/// self-verified at generation time.
pub fn signature_report_artifact(public_key: &[u8], entries: &[(String, Value, String)]) -> Value {
    let items: Vec<Value> = entries
        .iter()
        .map(|(name, payload, sig)| {
            json!({
                "payload_name": name,
                "payload_canonical_sha256": hex(&sha256(&canonical(payload))),
                "signature_multibase": sig,
                "verifies": verify_payload(&mb64(public_key), payload, sig),
            })
        })
        .collect();
    merge(
        demo_fields(),
        json!({
            "artifact_type": "signature_report",
            "algorithm": "ed25519",
            "key_id": key_id(public_key),
            "public_key_multibase": mb64(public_key),
            "signatures": items,
        }),
    )
}

/// Build the root-verification-trace artifact: the ordered E2E verification steps and their results —
/// keygen, sign, verify-valid, tamper→invalid, revocation active→not-revoked and revoked→blocked, and
/// the Trust-Root separation. This is the auditable trace of the demo root's own validation.
pub fn verification_trace_artifact(
    public_key: &[u8],
    manifest: &Value,
    manifest_sig: &str,
) -> Value {
    let pk = mb64(public_key);
    let mut tampered = manifest.clone();
    if let Some(obj) = tampered.as_object_mut() {
        obj.insert("protocol_version".into(), json!("tampered"));
    }
    let revocation = revocation_list_artifact();
    let steps = json!([
        {"step": "keygen", "detail": "Ed25519 efémero (só em memória, nunca em disco/Git)", "ok": true},
        {"step": "sign_manifest", "detail": "assinatura sobre sha256(canonical(manifest))", "ok": true},
        {"step": "verify_manifest_valid", "ok": verify_payload(&pk, manifest, manifest_sig)},
        {"step": "verify_manifest_tampered_must_fail", "ok": !verify_payload(&pk, &tampered, manifest_sig)},
        {"step": "revocation_active_key_not_revoked", "ok": !is_revoked(&revocation, &key_id(public_key))},
        {"step": "revocation_revoked_key_blocked", "ok": is_revoked(&revocation, REVOKED_DEMO_KEY_ID)},
        {"step": "trust_active_key_valid_demo", "ok": evaluate_trust(&pk, &key_id(public_key), manifest, manifest_sig, &revocation) == "valid_demo"},
        {"step": "not_protocol_trust_root", "detail": "esta raiz é demo_operator_root, não a Trust Root do protocolo BANZA", "ok": true},
    ]);
    let all_ok = steps
        .as_array()
        .unwrap()
        .iter()
        .all(|s| s.get("ok").and_then(|b| b.as_bool()).unwrap_or(false));
    merge(
        demo_fields(),
        json!({
            "artifact_type": "root_verification_trace",
            "algorithm": "ed25519",
            "key_id": key_id(public_key),
            "public_key_multibase": pk,
            "steps": steps,
            "complete": all_ok,
            "note": "Trace técnico da verificação da Demo Operator Root E2E. Evidência local, não certificação.",
        }),
    )
}

/// Generate a fresh EPHEMERAL signing key. The caller uses it in memory and drops it; it is never
/// returned in any artifact and never persisted. Verification later needs only the public key.
pub fn generate_ephemeral_key() -> SigningKey {
    use rand_core::OsRng;
    SigningKey::generate(&mut OsRng)
}
