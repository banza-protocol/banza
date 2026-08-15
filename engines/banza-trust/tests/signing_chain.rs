//! ADR-025 — Canonical Trust Signing Chain (Model A), proven at the domain-primitive level.
//!
//! The Trust Root signs ONLY the Key Manifest; the revocation-domain delegated key signs the BRL; a
//! root-signed BRL — or any wrong-key signature — is rejected. These tests exercise the domain
//! primitives (`verify_key_manifest` / `verify_revocation_list` / `verify_evidence_package`) that
//! encode the chain's key/domain separation, so a regression cannot quietly make Model B valid.

use banza_trust::sign::TestKeypair;
use banza_trust::{verify_key_manifest, verify_revocation_list};
use serde_json::{json, Value};

fn root() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-root-seed-00000000000000001")
}
fn revk() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-revocation-seed-00000000001")
}
fn meta() -> TestKeypair {
    TestKeypair::from_seed(b"adr079-metadata-seed-000000000001")
}

// ── Root Authority Set ↔ Key Manifest ─────────────────────────────────────────────────────────
//
// The manifest is authorised by the ACTIVE SET, not by a single root key. In v1.0.0 these two tests
// passed against one key, which is exactly why the declared 2-of-3 threshold had no runtime meaning.

/// A TEST-ONLY active set over three authorities.
fn active_set() -> (Value, TestKeypair, TestKeypair, TestKeypair) {
    let (a, b, c) = (
        TestKeypair::from_seed(b"ras-alpha"),
        TestKeypair::from_seed(b"ras-beta"),
        TestKeypair::from_seed(b"ras-gamma"),
    );
    let set = json!({
        "schema_version": "1",
        "set_sequence": 0,
        "predecessor_digest": Value::Null,
        "threshold": 2,
        "authorities": [
            { "authority_id": "alpha", "public_key": format!("ed25519:{}", a.public_b64url), "active_since": "2026-01-01T00:00:00Z" },
            { "authority_id": "beta",  "public_key": format!("ed25519:{}", b.public_b64url), "active_since": "2026-01-01T00:00:00Z" },
            { "authority_id": "gamma", "public_key": format!("ed25519:{}", c.public_b64url), "active_since": "2026-01-01T00:00:00Z" }
        ],
        "issued_at": "2026-01-01T00:00:00Z",
        "expires_at": "2028-01-01T00:00:00Z",
        "predecessor_signatures": []
    });
    (set, a, b, c)
}

fn manifest_signed_by(set: &Value, signers: &[(&str, &TestKeypair)]) -> Value {
    let mut m = json!({
        "manifest_version": "2",
        "protocol_version": "1.0.0",
        "root_authority_set": {
            "set_sequence": set["set_sequence"].clone(),
            "digest": banza_trust::authority_set::set_digest(set).unwrap()
        },
        "keys": [],
        "marker": "TEST ONLY",
        "root_signatures": []
    });
    let msg = banza_trust::canonical_bytes(&m, &["root_signatures"]).unwrap();
    m["root_signatures"] = Value::Array(
        signers
            .iter()
            .map(|(id, k)| json!({ "authority_id": id, "signature": k.sign_bytes(&msg) }))
            .collect(),
    );
    m
}

#[test]
fn two_distinct_root_authorities_sign_the_key_manifest() {
    let (set, a, b, _c) = active_set();
    let signed = manifest_signed_by(&set, &[("alpha", &a), ("beta", &b)]);
    assert!(
        verify_key_manifest(&signed, &set).verified,
        "a manifest authorised by two distinct active authorities must verify"
    );
}

#[test]
fn a_key_outside_the_active_set_cannot_authorise_the_key_manifest() {
    let (set, a, _b, _c) = active_set();
    let stranger = meta();
    // One genuine authority plus an outsider: the outsider contributes nothing, leaving one.
    let signed = manifest_signed_by(&set, &[("alpha", &a), ("beta", &stranger)]);
    assert!(
        !verify_key_manifest(&signed, &set).verified,
        "a key outside the active set MUST NOT count toward the threshold"
    );
}

#[test]
fn one_root_authority_cannot_authorise_the_key_manifest_alone() {
    let (set, a, _b, _c) = active_set();
    let signed = manifest_signed_by(&set, &[("alpha", &a)]);
    assert!(
        !verify_key_manifest(&signed, &set).verified,
        "a single authority MUST NOT authorise a delegation"
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
    // Model A (ADR-025 / INV-ROOT-004): the root never signs the BRL. A BRL bearing a root signature,
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
