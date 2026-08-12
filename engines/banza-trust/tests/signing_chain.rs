//! ADR-079 — Canonical Trust Signing Chain (Model A), proven at the domain-primitive level.
//!
//! The Trust Root signs ONLY the Key Manifest; the revocation-domain delegated key signs the BRL; a
//! root-signed BRL — or any wrong-key signature — is rejected. These tests exercise the domain
//! primitives (`verify_key_manifest` / `verify_revocation_list` / `verify_evidence_package`) that
//! encode the chain's key/domain separation, so a regression cannot quietly make Model B valid.

use banza_trust::sign::TestKeypair;
use banza_trust::{verify_key_manifest, verify_revocation_list};
use serde_json::json;

fn root() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-root-seed-00000000000000001")
}
fn revk() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-revocation-seed-00000000001")
}
fn meta() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-metadata-seed-000000000001")
}

// ── Root ↔ Key Manifest ───────────────────────────────────────────────────────────────────────
#[test]
fn root_signs_the_key_manifest() {
    let root = root();
    let manifest = json!({ "manifest_version": "1", "keys": [], "marker": "TEST ONLY" });
    let signed = root.sign_doc(&manifest, "signature");
    assert!(
        verify_key_manifest(&signed, &root.public_b64url).verified,
        "a root-signed Key Manifest must verify under the root key"
    );
}

#[test]
fn a_non_root_key_cannot_sign_the_key_manifest() {
    let root = root();
    let other = meta();
    let manifest = json!({ "manifest_version": "1", "keys": [] });
    let signed = other.sign_doc(&manifest, "signature");
    assert!(
        !verify_key_manifest(&signed, &root.public_b64url).verified,
        "a Key Manifest not signed by the root MUST be rejected"
    );
}

// ── Revocation domain ↔ BRL ──────────────────────────────────────────────────────────────────
#[test]
fn revocation_domain_key_signs_the_brl() {
    let revk = revk();
    let brl = json!({ "revocation_list_version": "1", "revoked": [] });
    let signed = revk.sign_doc(&brl, "signature");
    assert!(
        verify_revocation_list(&signed, &revk.public_b64url).verified,
        "a BRL signed by the revocation-domain delegated key must verify"
    );
}

#[test]
fn root_signed_brl_is_rejected() {
    // Model A (ADR-079 / INV-ROOT-004): the root never signs the BRL. A BRL bearing a root signature,
    // verified under the revocation-domain key, must fail — the root cannot stand in for it.
    let root = root();
    let revk = revk();
    let brl = json!({ "revocation_list_version": "1", "revoked": [] });
    let root_signed = root.sign_doc(&brl, "signature");
    assert!(
        !verify_revocation_list(&root_signed, &revk.public_b64url).verified,
        "a root-signed BRL MUST be rejected — only the revocation-domain delegated key signs the BRL"
    );
}

#[test]
fn cross_domain_brl_signature_is_rejected() {
    // Domain separation: a BRL signed by the metadata-domain key is not valid under the revocation key.
    let meta = meta();
    let revk = revk();
    let brl = json!({ "revocation_list_version": "1", "revoked": [] });
    let meta_signed = meta.sign_doc(&brl, "signature");
    assert!(
        !verify_revocation_list(&meta_signed, &revk.public_b64url).verified,
        "a BRL signed by a non-revocation-domain key MUST be rejected"
    );
}
