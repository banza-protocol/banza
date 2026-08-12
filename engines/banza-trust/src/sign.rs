//! banza-trust TEST-ONLY signer + fixtures + ceremony simulator (ADR-037; M2.4).
//!
//! Signs and assembles the active-model trust material **for tests and fixtures only**: a TEST trust
//! root lists a TEST delegated signing key, which signs a TEST `signed_protocol_metadata` bound to a
//! TEST operator manifest and conformance evidence. It never uses a real key, never signs a production
//! artifact, never authorises/certifies/approves an operator, and never touches `/operators`,
//! `/certificates` or `/.well-known`. Keys are derived deterministically from a caller seed (no
//! randomness, no production keygen). Every artifact carries `TEST ONLY — NOT PRODUCTION`.

use crate::{canonical_bytes, canonical_sha256, evaluate::evaluate_trust};
use base64::Engine;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use serde::Serialize;
use serde_json::{json, Value};

pub const TEST_ONLY_MARKER: &str = "TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS";
const EVAL_AT: &str = "2026-07-17T00:00:00Z";

fn b64url(b: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b)
}

/// A deterministic TEST-ONLY keypair derived from a 32-byte seed. No randomness, no production key.
pub struct TestKeypair {
    signing: SigningKey,
    pub public_b64url: String,
}

impl TestKeypair {
    pub fn from_seed(seed: &[u8]) -> Self {
        let mut s = [0u8; 32];
        for (i, slot) in s.iter_mut().enumerate() {
            *slot = match seed.get(i) {
                Some(b) => *b,
                None => (i as u8).wrapping_mul(31).wrapping_add(7),
            };
        }
        let signing = SigningKey::from_bytes(&s);
        let vk: VerifyingKey = signing.verifying_key();
        TestKeypair {
            public_b64url: b64url(&vk.to_bytes()),
            signing,
        }
    }

    /// Sign a document over the ADR-038 canonical form (all fields except `sign_field`), returning the
    /// document with a base64url signature under `sign_field`. Symmetric with the verifier.
    pub fn sign_doc(&self, doc: &Value, sign_field: &str) -> Value {
        let msg = canonical_bytes(doc, &[sign_field])
            .expect("BCJ/1: a TEST fixture must be canonicalizable");
        let sig = self.signing.sign(&msg);
        let mut out = doc.clone();
        if let Value::Object(map) = &mut out {
            map.insert(
                sign_field.to_string(),
                Value::String(b64url(&sig.to_bytes())),
            );
        }
        out
    }

    /// Sign raw bytes, returning the base64url signature (for the root threshold-signature array).
    pub fn sign_bytes(&self, msg: &[u8]) -> String {
        b64url(&self.signing.sign(msg).to_bytes())
    }
}

struct Keys {
    root_a: TestKeypair,
    root_b: TestKeypair,
    root_c: TestKeypair,
    dkey: TestKeypair,
    revk: TestKeypair,
}
fn keys() -> Keys {
    Keys {
        root_a: TestKeypair::from_seed(b"banza-trust-m24-root-a-seed-000001"),
        root_b: TestKeypair::from_seed(b"banza-trust-m24-root-b-seed-000001"),
        root_c: TestKeypair::from_seed(b"banza-trust-m24-root-c-seed-000001"),
        dkey: TestKeypair::from_seed(b"banza-trust-m24-delegated-seed-001"),
        revk: TestKeypair::from_seed(b"banza-trust-m24-revocation-seed-01"),
    }
}

/// The revocation-domain delegated TEST keypair — the key the BANZA Revocation List is signed under in the
/// active model (ADR-079). Exposed so the federation OTE battery can mint an authentically-signed BRL.
pub fn revocation_keypair() -> TestKeypair {
    TestKeypair::from_seed(b"banza-trust-m24-revocation-seed-01")
}

/// A deterministic, authentically-signed BANZA Revocation List signed by the revocation-domain key. The
/// `revoked` operator ids are carried verbatim (empty ⇒ nobody revoked). Returns the signed doc and the
/// public key it verifies under.
pub fn signed_revocation_list(revoked: &[&str], expires_at: &str) -> (Value, String) {
    let revk = revocation_keypair();
    let body = json!({
        "list_id": "banza-revocation-list-2026-07",
        "issued_at": "2026-07-16T00:00:00Z",
        "expires_at": expires_at,
        "revoked": revoked.iter().map(|op| json!({ "operator_id": op })).collect::<Vec<Value>>(),
    });
    (revk.sign_doc(&body, "signature"), revk.public_b64url)
}

/// Build a full, valid federation OTE input for a DISTINCT named operator with its OWN delegated signing
/// key (derived from `delegated_seed`), endorsed by the shared protocol trust root. Two operators built
/// with different `operator_id` + `delegated_seed` are cryptographically distinct — different keys, different
/// signatures, different material — yet both are evaluated by the same open-protocol OTE engine (operators
/// never reimplement verification). `capabilities` are declared in both the manifest and the signed
/// metadata; `revoked` seeds the authenticated BRL (empty ⇒ nobody revoked). Reaches `ROUTING_ALLOWED`.
pub fn federation_ote_input_named(
    operator_id: &str,
    delegated_seed: &[u8],
    capabilities: &[&str],
    revoked: &[&str],
) -> Value {
    let Keys {
        root_a,
        root_b,
        root_c,
        revk,
        ..
    } = keys();
    let dkey = TestKeypair::from_seed(delegated_seed);
    let dkey_id = format!("banza-protocol-metadata-{operator_id}");
    let endpoint = format!("https://{operator_id}.example/federation");
    let caps: Vec<Value> = capabilities.iter().map(|c| json!(c)).collect();

    let manifest_body = json!({
        "operator_id": operator_id,
        "manifest_url": format!("https://{operator_id}.example/.well-known/banza/operator-manifest.json"),
        "protocol_version": "1.0.0",
        "capabilities": caps,
        "supports_federation": true,
        "cross_operator_routing": capabilities.contains(&"cross_operator_routing"),
        "cross_operator_settlement": capabilities.contains(&"cross_operator_settlement"),
        "interop_endpoint": endpoint,
        "self_publication_statement": "self-published by the operator; not issued or approved by BANZA"
    });
    let manifest_hash = canonical_sha256(&manifest_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut operator_manifest = manifest_body;
    operator_manifest["manifest_hash"] = json!(manifest_hash);

    let evidence_body = json!({
        "evidence_url": format!("https://{operator_id}.example/conformance/evidence"),
        "tool_version": "banza-conformance-rs 0.2.0",
        "test_suite_version": "federation-1.0",
        "generated_at": "2026-07-15T00:00:00Z",
        "freshness_policy": "90d",
        "result_summary": { "level": "L3", "passed": 79, "failed": 0 }
    });
    let evidence_hash = canonical_sha256(&evidence_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut conformance_evidence = evidence_body;
    conformance_evidence["evidence_hash"] = json!(evidence_hash);

    let meta_body = json!({
        "metadata_id": format!("spm-{operator_id}-2026-07"),
        "operator_id": operator_id,
        "capabilities": caps,
        "protocol_version": "1.0.0",
        "release_id": "banza-protocol-1.0.0",
        "schema_versions": { "operator_manifest": "1.0", "conformance_evidence": "1.0" },
        "conformance_tool_version": "banza-conformance-rs 0.2.0",
        "registry_snapshot_hash": "sha256:registry-snapshot",
        "revocation_list_hash": "sha256:revocation-list",
        "operator_manifest_hash": manifest_hash,
        "conformance_evidence_hash": evidence_hash,
        "evidence_bundle_hash": "sha256:evidence-bundle",
        "capability_profile_hash": "sha256:capability-profile",
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2027-07-17T00:00:00Z"
    });
    let signed_protocol_metadata = dkey.sign_doc(&meta_body, "signature");

    let delegated_listing = json!({
        "delegated_key_id": dkey_id,
        "public_key": dkey.public_b64url,
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "revoked": false,
        "signed_by_root_threshold": true
    });
    let root_body = json!({
        "root_id": "banza-root-2026",
        "trust_root_version": "2026.07",
        "active_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "threshold_policy": { "min_signatures": 2, "total_keyholders": 3 },
        "delegated_signing_keys": [delegated_listing],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "scope": "signs only the Key Manifest that endorses the delegated signing keys (ADR-079)",
        "boundary": { "authorises_operators": false, "moves_funds": false }
    });
    let root_msg = canonical_bytes(&root_body, &["root_signatures"])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut trust_root_metadata = root_body;
    trust_root_metadata["root_signatures"] =
        json!([root_a.sign_bytes(&root_msg), root_b.sign_bytes(&root_msg)]);

    let delegated_signing_key = json!({
        "delegated_key_id": dkey_id,
        "public_key": dkey.public_b64url,
        "algorithm": "ed25519",
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "revoked": false,
        "signed_by_root_threshold": true,
        "key_scope": "protocol-metadata"
    });
    let public_registry_entry = json!({
        "operator_id": operator_id,
        "manifest_hash": manifest_hash,
        "signed_protocol_metadata_hash": canonical_sha256(&signed_protocol_metadata, &["signature"]).expect("BCJ/1: a TEST fixture must be canonicalizable"),
        "conformance_evidence_hash": evidence_hash,
        "revocation_status": "active",
        "trust_root_version": "2026.07",
        "delegated_key_id": dkey_id,
        "last_verified_at": "2026-07-16T00:00:00Z",
        "verified_by_tool_version": "banza-trust 0.2.0"
    });
    let revocation_status = json!({
        "revoked": false,
        "reason_code": Value::Null,
        "revocation_list_version": "2026.07-01",
        "revocation_entry_hash": Value::Null,
        "signed_by_revocation_key": revk.public_b64url,
        "fail_closed_required": true
    });
    let (brl, revk_pub) = signed_revocation_list(revoked, "2027-07-16T00:00:00Z");

    json!({
        "evaluated_at": EVAL_AT,
        "evaluator_protocol_version": "1.0.0",
        "trusted_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "trust_root_metadata": trust_root_metadata,
        "delegated_signing_key": delegated_signing_key,
        "signed_protocol_metadata": signed_protocol_metadata,
        "operator_manifest": operator_manifest,
        "conformance_evidence": conformance_evidence,
        "public_registry_entry": public_registry_entry,
        "revocation_status": revocation_status,
        "intended_capabilities": capabilities.iter().map(|c| json!(c)).collect::<Vec<Value>>(),
        "evaluated_operator_id": operator_id,
        "revocation_list": brl,
        "revocation_key_public": revk_pub
    })
}

/// A full, deterministic federation OTE input that reaches `ROUTING_ALLOWED`: the valid trust chain plus
/// the intended capabilities and an authenticated, non-revoked BRL. Reusable positive-path evidence for the
/// federation Open Trust Evaluation and the A/B scenario.
pub fn federation_ote_demo_input() -> Value {
    let mut input = build_input("valid");
    let (brl, revk_pub) = signed_revocation_list(&[], "2027-07-16T00:00:00Z");
    input["intended_capabilities"] = json!(["cross_operator_routing"]);
    input["evaluated_operator_id"] = json!("operator-A");
    input["revocation_list"] = brl;
    input["revocation_key_public"] = json!(revk_pub);
    input
}

/// Build the full `evaluate_trust` input for a scenario. `mutation` selects exactly one fault.
pub fn build_input(mutation: &str) -> Value {
    let Keys {
        root_a,
        root_b,
        root_c,
        dkey,
        revk,
    } = keys();

    // Operator manifest (self-published; no certificate, no conferred status). Carries the federation
    // surface (supports_federation + capability flags + interop endpoint) the OTE capability/endpoint checks
    // read; these fields are inert for the trust-status evaluation and only enrich the realistic manifest.
    let manifest_body = json!({
        "operator_id": "operator-A",
        "manifest_url": "https://operator-a.example/.well-known/banza/operator-manifest.json",
        "protocol_version": "1.0.0",
        "capabilities": ["cross_operator_routing", "cross_operator_settlement"],
        "public_keys": [{ "key_id": "operator-A-key-1", "public_key": "ed25519:AAAA", "algorithm": "ed25519" }],
        "endpoints": { "interop_endpoint": "https://operator-a.example/federation" },
        "supports_federation": true,
        "cross_operator_routing": true,
        "cross_operator_settlement": true,
        "interop_endpoint": "https://operator-a.example/federation",
        "self_publication_statement": "self-published by the operator; not issued or approved by BANZA"
    });
    let manifest_hash = canonical_sha256(&manifest_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut operator_manifest = manifest_body;
    operator_manifest["manifest_hash"] = json!(manifest_hash);

    // Conformance evidence (machine-verifiable; reproducible).
    let evidence_body = json!({
        "evidence_url": "https://operator-a.example/conformance/evidence",
        "tool_version": "banza-conformance-rs 0.2.0",
        "test_suite_version": "federation-1.0",
        "generated_at": "2026-07-15T00:00:00Z",
        "freshness_policy": "90d",
        "result_summary": { "level": "L3", "passed": 79, "failed": 0 }
    });
    let evidence_hash = canonical_sha256(&evidence_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut conformance_evidence = evidence_body;
    conformance_evidence["evidence_hash"] = json!(evidence_hash);

    // Signed protocol metadata content (pre-sign).
    let proto = if mutation == "incompatible_protocol_version" {
        "2.0.0"
    } else {
        "1.0.0"
    };
    let (m_from, m_until) = if mutation == "expired_metadata" {
        ("2026-05-01T00:00:00Z", "2026-06-01T00:00:00Z")
    } else {
        ("2026-07-01T00:00:00Z", "2027-07-17T00:00:00Z")
    };
    let mut meta_body = json!({
        "metadata_id": "spm-operator-A-2026-07",
        "operator_id": "operator-A",
        "capabilities": ["cross_operator_routing", "cross_operator_settlement"],
        "protocol_version": proto,
        "release_id": "banza-protocol-1.0.0",
        "schema_versions": { "operator_manifest": "1.0", "conformance_evidence": "1.0" },
        "conformance_tool_version": "banza-conformance-rs 0.2.0",
        "registry_snapshot_hash": "sha256:registry-snapshot",
        "revocation_list_hash": "sha256:revocation-list",
        "operator_manifest_hash": manifest_hash,
        "conformance_evidence_hash": evidence_hash,
        "evidence_bundle_hash": "sha256:evidence-bundle",
        "capability_profile_hash": "sha256:capability-profile",
        "valid_from": m_from,
        "valid_until": m_until
    });
    if mutation == "boundary_fail" {
        // An input that improperly claims to be an operator certificate — boundary must reject.
        meta_body["is_operator_certificate"] = json!(true);
    }
    let mut signed_protocol_metadata = dkey.sign_doc(&meta_body, "signature");
    if mutation == "invalid_metadata_signature" {
        // Tamper a field AFTER signing → signature no longer matches (nothing else changes).
        signed_protocol_metadata["metadata_id"] = json!("spm-operator-A-TAMPERED");
    }

    // Trust root metadata: lists the delegated key by id + public key.
    let delegated_listing = json!({
        "delegated_key_id": "banza-protocol-metadata-2026-07",
        "public_key": dkey.public_b64url,
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "revoked": false,
        "signed_by_root_threshold": true
    });
    // Trust root metadata, 2-of-3 threshold: three root keys listed, signed by root_a + root_b over the
    // canonical form (excluding root_signatures). This anchors the delegated-key listing cryptographically.
    let root_body = json!({
        "root_id": "banza-root-2026",
        "trust_root_version": "2026.07",
        "active_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "threshold_policy": { "min_signatures": 2, "total_keyholders": 3 },
        "delegated_signing_keys": [delegated_listing],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "scope": "signs only the Key Manifest that endorses the delegated signing keys (ADR-079)",
        "boundary": { "authorises_operators": false, "moves_funds": false }
    });
    let root_msg = canonical_bytes(&root_body, &["root_signatures"])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut trust_root_metadata = root_body;
    trust_root_metadata["root_signatures"] =
        json!([root_a.sign_bytes(&root_msg), root_b.sign_bytes(&root_msg)]);

    // Delegated signing key (its own declaration).
    let mut delegated_signing_key = json!({
        "delegated_key_id": "banza-protocol-metadata-2026-07",
        "public_key": dkey.public_b64url,
        "algorithm": "ed25519",
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": "2026-07-01T00:00:00Z",
        "valid_until": "2028-07-01T00:00:00Z",
        "revoked": false,
        "signed_by_root_threshold": true,
        "key_scope": "protocol-metadata"
    });
    if mutation == "wrong_delegated_key_usage" {
        delegated_signing_key["allowed_usages"] = json!(["revocation_list"]);
    }
    if mutation == "revoked_delegated_key" {
        delegated_signing_key["revoked"] = json!(true);
    }

    // Public protocol registry entry (index, not an admission list).
    let public_registry_entry = json!({
        "operator_id": "operator-A",
        "manifest_hash": manifest_hash,
        "signed_protocol_metadata_hash": canonical_sha256(&signed_protocol_metadata, &["signature"]).expect("BCJ/1: a TEST fixture must be canonicalizable"),
        "conformance_evidence_hash": evidence_hash,
        "revocation_status": "active",
        "trust_root_version": "2026.07",
        "delegated_key_id": "banza-protocol-metadata-2026-07",
        "last_verified_at": "2026-07-16T00:00:00Z",
        "verified_by_tool_version": "banza-trust 0.2.0"
    });

    // Revocation status (fail-closed; carries verifiable revocation material).
    let mut revocation_status = json!({
        "revoked": false,
        "reason_code": Value::Null,
        "revocation_list_version": "2026.07-01",
        "revocation_entry_hash": Value::Null,
        "signed_by_revocation_key": revk.public_b64url,
        "fail_closed_required": true
    });
    if mutation == "operator_revoked" {
        revocation_status["revoked"] = json!(true);
        revocation_status["reason_code"] = json!("key_compromise");
    }

    let mut input = json!({
        "evaluated_at": EVAL_AT,
        "evaluator_protocol_version": "1.0.0",
        "trusted_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "trust_root_metadata": trust_root_metadata,
        "delegated_signing_key": delegated_signing_key,
        "signed_protocol_metadata": signed_protocol_metadata,
        "operator_manifest": operator_manifest,
        "conformance_evidence": conformance_evidence,
        "public_registry_entry": public_registry_entry,
        "revocation_status": revocation_status
    });
    if let Value::Object(map) = &mut input {
        match mutation {
            "missing_conformance_evidence" => {
                map.remove("conformance_evidence");
            }
            "missing_operator_manifest" => {
                map.remove("operator_manifest");
            }
            "missing_registry_entry" => {
                map.remove("public_registry_entry");
            }
            _ => {}
        }
    }
    input
}

// ── Operador Zero (OZ) — the canonical DEMO operator OTE material (TEST ONLY) ────────────
//
// A self-anchored Open Trust Evaluation (OTE) key + metadata bundle for the canonical demo operator
// `operator-zero` (https://zero.banza.network, profile L0). It mirrors the VALID trust shape of
// `build_input`, but: uses OZ-specific deterministic seeds (distinct from the operator-A fixtures),
// binds OZ's own manifest + conformance evidence by hash, and uses a wide validity window. It NEVER
// uses a real key, NEVER signs a production artifact, and NEVER certifies/authorises/approves an
// operator. Every returned file-root also carries the demo-boundary markers (demo_only /
// monetary_value / production_allowed / operator_id / operator_display_name) — all boundary-safe.

/// The wide TEST-ONLY validity window for the Operador Zero demo trust material.
const OZ_VALID_FROM: &str = "2026-01-01T00:00:00Z";
const OZ_VALID_UNTIL: &str = "2030-01-01T00:00:00Z";
const OZ_DELEGATED_KEY_ID: &str = "banza-oz-protocol-metadata-2026-08";
const OZ_TRUST_ROOT_VERSION: &str = "2026.08";
const OZ_REVOCATION_LIST_VERSION: &str = "2026.08-01";

/// OZ-specific deterministic TEST-ONLY keys (distinct seeds from the operator-A `keys()` fixtures).
fn oz_keys() -> Keys {
    Keys {
        root_a: TestKeypair::from_seed(b"banza-oz-root-a-seed-0001"),
        root_b: TestKeypair::from_seed(b"banza-oz-root-b-seed-0001"),
        root_c: TestKeypair::from_seed(b"banza-oz-root-c-seed-0001"),
        dkey: TestKeypair::from_seed(b"banza-oz-delegated-seed-0001"),
        revk: TestKeypair::from_seed(b"banza-oz-revocation-seed-0001"),
    }
}

/// The five demo-boundary marker fields required on every Operador Zero artifact. All are
/// boundary-safe: none matches a trust boundary claim flag or affirmative phrase.
fn oz_markers() -> [(&'static str, Value); 5] {
    [
        ("demo_only", json!(true)),
        ("monetary_value", json!(false)),
        ("production_allowed", json!(false)),
        ("operator_id", json!("operator-zero")),
        ("operator_display_name", json!("Operador Zero")),
    ]
}

fn with_oz_markers(mut v: Value) -> Value {
    if let Value::Object(map) = &mut v {
        for (k, val) in oz_markers() {
            map.insert(k.to_string(), val);
        }
    }
    v
}

/// Build the self-anchored TEST-ONLY OTE material for Operador Zero.
///
/// `operator_manifest_body` and `conformance_report_body` are the served bodies **without** their
/// `manifest_hash` / `evidence_hash` (this fn computes and returns them). Both bodies MUST already
/// carry the demo-boundary markers, because the returned hashes bind the served bodies verbatim.
///
/// Returns `{ manifest_hash, evidence_hash, signed_metadata, revocation, key_manifest }`, where the
/// evaluate input is assembled from `key_manifest.{trusted_root_public_keys, trust_root_metadata,
/// delegated_signing_key, public_registry_entry}` + `signed_metadata` + `revocation` + the served
/// manifest (body + manifest_hash) + the served conformance (body + evidence_hash).
pub fn operator_zero_ote(operator_manifest_body: &Value, conformance_report_body: &Value) -> Value {
    let Keys {
        root_a,
        root_b,
        root_c,
        dkey,
        revk,
    } = oz_keys();

    let manifest_hash = canonical_sha256(operator_manifest_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let evidence_hash = canonical_sha256(conformance_report_body, &[])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");

    // Signed protocol metadata (pre-sign). The demo markers are added BEFORE signing so the signature
    // covers them; the placeholder hash fields mirror `build_input`.
    let meta_body = with_oz_markers(json!({
        "metadata_id": "spm-operator-zero-2026-08",
        "protocol_version": "1.0.0",
        "release_id": "banza-protocol-1.0.0",
        "schema_versions": { "operator_manifest": "1.0", "conformance_evidence": "1.0" },
        "conformance_tool_version": "banza-conformance-rs 0.1.0",
        "registry_snapshot_hash": "sha256:registry-snapshot",
        "revocation_list_hash": "sha256:revocation-list",
        "operator_manifest_hash": manifest_hash,
        "conformance_evidence_hash": evidence_hash,
        "evidence_bundle_hash": "sha256:evidence-bundle",
        "capability_profile_hash": "sha256:capability-profile",
        "valid_from": OZ_VALID_FROM,
        "valid_until": OZ_VALID_UNTIL
    }));
    let signed_protocol_metadata = dkey.sign_doc(&meta_body, "signature");

    // Trust root metadata (2-of-3 threshold) signed by root_a + root_b over its canonical form.
    let delegated_listing = json!({
        "delegated_key_id": OZ_DELEGATED_KEY_ID,
        "public_key": dkey.public_b64url,
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": OZ_VALID_FROM,
        "valid_until": OZ_VALID_UNTIL,
        "revoked": false,
        "signed_by_root_threshold": true
    });
    let root_body = json!({
        "root_id": "banza-oz-root-2026",
        "trust_root_version": OZ_TRUST_ROOT_VERSION,
        "active_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "threshold_policy": { "min_signatures": 2, "total_keyholders": 3 },
        "delegated_signing_keys": [delegated_listing],
        "valid_from": OZ_VALID_FROM,
        "valid_until": OZ_VALID_UNTIL,
        "scope": "signs only the Key Manifest that endorses the delegated signing keys (ADR-079)",
        "boundary": { "authorises_operators": false, "moves_funds": false }
    });
    let root_msg = canonical_bytes(&root_body, &["root_signatures"])
        .expect("BCJ/1: a TEST fixture must be canonicalizable");
    let mut trust_root_metadata = root_body;
    trust_root_metadata["root_signatures"] =
        json!([root_a.sign_bytes(&root_msg), root_b.sign_bytes(&root_msg)]);

    // Delegated signing key (its own declaration).
    let delegated_signing_key = json!({
        "delegated_key_id": OZ_DELEGATED_KEY_ID,
        "public_key": dkey.public_b64url,
        "algorithm": "ed25519",
        "allowed_usages": ["signed_protocol_metadata"],
        "valid_from": OZ_VALID_FROM,
        "valid_until": OZ_VALID_UNTIL,
        "revoked": false,
        "signed_by_root_threshold": true,
        "key_scope": "protocol-metadata"
    });

    // Public protocol registry entry (index, not an admission list). Hashes are informational.
    let public_registry_entry = json!({
        "operator_id": "operator-zero",
        "manifest_hash": manifest_hash,
        "signed_protocol_metadata_hash": canonical_sha256(&signed_protocol_metadata, &["signature"]).expect("BCJ/1: a TEST fixture must be canonicalizable"),
        "conformance_evidence_hash": evidence_hash,
        "revocation_status": "active",
        "trust_root_version": OZ_TRUST_ROOT_VERSION,
        "delegated_key_id": OZ_DELEGATED_KEY_ID,
        "last_verified_at": "2026-08-05T00:00:00Z",
        "verified_by_tool_version": "banza-trust 0.2.0"
    });

    // Revocation status (fail-closed; carries verifiable revocation material). Demo-marked.
    let revocation_status = with_oz_markers(json!({
        "revoked": false,
        "reason_code": Value::Null,
        "revocation_list_version": OZ_REVOCATION_LIST_VERSION,
        "revocation_entry_hash": Value::Null,
        "signed_by_revocation_key": revk.public_b64url,
        "fail_closed_required": true
    }));

    // Key material bundle (self-anchored). Demo-marked. Its sub-fields feed the evaluate input.
    let key_manifest = with_oz_markers(json!({
        "schema": "banza-ote-key-material/1",
        "test_only": true,
        "disclaimer": "Material de chaves OTE TEST-ONLY do Operador Zero (demo). Sem chaves privadas reais. Não é certificado, não é aprovação e não movimenta dinheiro real.",
        "trusted_root_public_keys": [root_a.public_b64url, root_b.public_b64url, root_c.public_b64url],
        "trust_root_metadata": trust_root_metadata,
        "delegated_signing_key": delegated_signing_key,
        "public_registry_entry": public_registry_entry,
        "keys": [ {
            "key_id": OZ_DELEGATED_KEY_ID,
            "usage": "signed_protocol_metadata",
            "status": "active",
            "public_key": dkey.public_b64url
        } ]
    }));

    json!({
        "manifest_hash": manifest_hash,
        "evidence_hash": evidence_hash,
        "signed_metadata": signed_protocol_metadata,
        "revocation": revocation_status,
        "key_manifest": key_manifest
    })
}

/// The twelve scenarios: key, label, expected status, and the full input. All TEST-ONLY.
pub fn scenarios() -> Vec<(&'static str, &'static str, &'static str, Value)> {
    vec![
        (
            "valid_signed_protocol_metadata",
            "Signed protocol metadata válida",
            "TRUST_VALID",
            build_input("valid"),
        ),
        (
            "invalid_metadata_signature",
            "Assinatura de metadata inválida",
            "TRUST_INVALID_SIGNATURE",
            build_input("invalid_metadata_signature"),
        ),
        (
            "wrong_delegated_key_usage",
            "Delegated key sem usage correcto",
            "TRUST_INVALID_DELEGATED_KEY",
            build_input("wrong_delegated_key_usage"),
        ),
        (
            "revoked_delegated_key",
            "Delegated key revogada",
            "TRUST_INVALID_DELEGATED_KEY",
            build_input("revoked_delegated_key"),
        ),
        (
            "missing_conformance_evidence",
            "Conformance evidence em falta",
            "TRUST_MISSING_CONFORMANCE_EVIDENCE",
            build_input("missing_conformance_evidence"),
        ),
        (
            "missing_operator_manifest",
            "Operator manifest em falta",
            "TRUST_MISSING_OPERATOR_MANIFEST",
            build_input("missing_operator_manifest"),
        ),
        (
            "missing_registry_entry",
            "Registry entry em falta",
            "TRUST_MISSING_REGISTRY_ENTRY",
            build_input("missing_registry_entry"),
        ),
        (
            "operator_revoked",
            "Operador revogado",
            "TRUST_REVOKED",
            build_input("operator_revoked"),
        ),
        (
            "expired_metadata",
            "Signed metadata expirada",
            "TRUST_EXPIRED_METADATA",
            build_input("expired_metadata"),
        ),
        (
            "incompatible_protocol_version",
            "Versão de protocolo incompatível",
            "TRUST_INCOMPATIBLE_PROTOCOL_VERSION",
            build_input("incompatible_protocol_version"),
        ),
        (
            "boundary_fail",
            "Metadata sugere certificado/aprovação/licença",
            "TRUST_INVALID_BOUNDARY",
            build_input("boundary_fail"),
        ),
        (
            "malformed_input",
            "Input malformado",
            "TRUST_FAIL_CLOSED",
            Value::String("malformed — not a trust object".into()),
        ),
    ]
}

/// Deterministic TEST-ONLY fixtures for the Workbench Trust Engine tool.
pub fn demo_fixtures() -> Value {
    let fixtures: Vec<Value> = scenarios()
        .into_iter()
        .map(|(key, label, expected, input)| json!({ "key": key, "label": label, "expected": expected, "input": input }))
        .collect();
    json!({ "note": TEST_ONLY_MARKER, "fixtures": fixtures })
}

// ── Ceremony simulator (TEST ONLY) — signs protocol metadata, not certificates ──────────

#[derive(Serialize)]
pub struct CeremonyReport {
    pub marker: String,
    pub test_only: bool,
    pub production: bool,
    pub operators_changed: bool,
    pub certificates_changed: bool,
    pub root_public_state_changed: bool,
    pub steps: Vec<String>,
    pub valid_status: String,
    pub revoked_status: String,
    pub tamper_status: String,
    pub chain_valid: bool,
    pub revoked_subject_rejected: bool,
    pub tamper_rejected: bool,
    pub disclaimer: String,
}

/// Simulate the active trust chain in memory: trust root → delegated key → signed protocol metadata →
/// evaluate; then revoke, then tamper. Deterministic. Touches no public state, no real keys.
pub fn ceremony_simulate() -> CeremonyReport {
    let mut steps = Vec::new();
    steps.push("built TEST trust root + delegated key (deterministic seeds)".into());
    steps.push("signed TEST signed_protocol_metadata with the delegated key".into());

    let valid = evaluate_trust(&build_input("valid"));
    let valid_status = valid["trust_status"].as_str().unwrap_or("").to_string();
    steps.push(format!("evaluated valid material: {valid_status}"));

    let revoked = evaluate_trust(&build_input("operator_revoked"));
    let revoked_status = revoked["trust_status"].as_str().unwrap_or("").to_string();
    steps.push(format!("evaluated revoked operator: {revoked_status}"));

    let tampered = evaluate_trust(&build_input("invalid_metadata_signature"));
    let tamper_status = tampered["trust_status"].as_str().unwrap_or("").to_string();
    steps.push(format!("evaluated tampered metadata: {tamper_status}"));

    CeremonyReport {
        marker: TEST_ONLY_MARKER.into(),
        test_only: true,
        production: false,
        operators_changed: false,
        certificates_changed: false,
        root_public_state_changed: false,
        steps,
        chain_valid: valid_status == "TRUST_VALID",
        revoked_subject_rejected: revoked_status == "TRUST_REVOKED",
        tamper_rejected: tamper_status == "TRUST_INVALID_SIGNATURE",
        valid_status,
        revoked_status,
        tamper_status,
        disclaimer: "Simulation only. No real key, no production artifact, no operator, no public \
            state change. Production ceremony (M2) remains offline and disabled."
            .into(),
    }
}

/// Verify a ceremony report is internally consistent and touches no production state.
pub fn ceremony_check(report: &CeremonyReport) -> crate::TrustResult {
    if !report.test_only
        || report.production
        || report.operators_changed
        || report.certificates_changed
        || report.root_public_state_changed
    {
        return crate::TrustResult::fail("ceremony", "report claims production state change");
    }
    if report.chain_valid && report.revoked_subject_rejected && report.tamper_rejected {
        crate::TrustResult::ok(
            "ceremony",
            "TEST ceremony consistent; no production state touched",
        )
    } else {
        crate::TrustResult::fail("ceremony", "ceremony invariants failed")
    }
}

#[cfg(test)]
mod oz_tests {
    use super::*;
    use crate::evaluate::evaluate_trust;

    /// A minimal OZ manifest body carrying the demo markers (the generator bin builds a fuller one;
    /// this only needs to satisfy the trust evaluator's manifest binding).
    fn oz_manifest_body() -> Value {
        with_oz_markers(json!({
            "name": "Operador Zero (simulador demo)",
            "environment": "sandbox",
            "simulated": true,
            "protocol_version": "1.0.0",
            "origin": "https://zero.banza.network",
            "base_url": "https://zero.banza.network",
            "key_manifest_url": "https://zero.banza.network/key-manifest.json",
            "conformance_url": "https://zero.banza.network/conformance/evidence.json",
            "supported_levels": ["L0"],
            "capabilities": { "supports_wallets": true, "supports_qr": true, "supports_settlement_simulation": true },
            "self_publication_statement": "self-published by the operator; not issued or approved by BANZA"
        }))
    }

    /// A minimal PASS conformance body carrying the demo markers.
    fn oz_conformance_body() -> Value {
        with_oz_markers(json!({
            "runner": "banza-conformance-rs",
            "runner_version": "0.1.0",
            "protocol_version": "1.0.0",
            "level": "L0",
            "status": "PASS",
            "totals": { "total": 4, "pass": 4, "fail": 0 },
            "certification_disclaimer": "PASS is technical conformance evidence, not production certification. Production certification depends on M2/M3 governance; no operator is certified and no production certificate is active."
        }))
    }

    /// Assemble the OTE evaluate input exactly as banzai-api will.
    fn assemble_input(with_pinned: bool) -> Value {
        let manifest_body = oz_manifest_body();
        let conformance_body = oz_conformance_body();
        let ote = operator_zero_ote(&manifest_body, &conformance_body);

        let mut operator_manifest = manifest_body;
        operator_manifest["manifest_hash"] = ote["manifest_hash"].clone();
        let mut conformance_evidence = conformance_body;
        conformance_evidence["evidence_hash"] = ote["evidence_hash"].clone();

        let km = &ote["key_manifest"];
        let mut input = json!({
            "evaluated_at": "2026-08-05T00:00:00Z",
            "evaluator_protocol_version": "1.0.0",
            "trust_root_metadata": km["trust_root_metadata"].clone(),
            "delegated_signing_key": km["delegated_signing_key"].clone(),
            "signed_protocol_metadata": ote["signed_metadata"].clone(),
            "operator_manifest": operator_manifest,
            "conformance_evidence": conformance_evidence,
            "public_registry_entry": km["public_registry_entry"].clone(),
            "revocation_status": ote["revocation"].clone()
        });
        if with_pinned {
            input["trusted_root_public_keys"] = km["trusted_root_public_keys"].clone();
        }
        input
    }

    #[test]
    fn operator_zero_ote_is_trust_valid_with_pinned_roots() {
        let input = assemble_input(true);
        assert_eq!(
            evaluate_trust(&input)["trust_status"],
            "TRUST_VALID",
            "OZ OTE (pinned) must be TRUST_VALID: {}",
            evaluate_trust(&input)
        );
    }

    #[test]
    fn operator_zero_ote_is_trust_valid_self_anchored() {
        // Without a pinned anchor, root_threshold_signatures_ok falls back to the root's own
        // active_root_public_keys — still TRUST_VALID.
        let input = assemble_input(false);
        assert_eq!(evaluate_trust(&input)["trust_status"], "TRUST_VALID");
    }

    #[test]
    fn operator_zero_ote_is_deterministic() {
        let a = operator_zero_ote(&oz_manifest_body(), &oz_conformance_body());
        let b = operator_zero_ote(&oz_manifest_body(), &oz_conformance_body());
        assert_eq!(a, b);
    }

    #[test]
    fn operator_zero_file_roots_carry_the_demo_markers() {
        let ote = operator_zero_ote(&oz_manifest_body(), &oz_conformance_body());
        for root in ["signed_metadata", "revocation", "key_manifest"] {
            for (k, v) in oz_markers() {
                assert_eq!(ote[root][k], v, "{root} missing marker {k}");
            }
        }
    }
}
