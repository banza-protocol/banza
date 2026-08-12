//! TEST-ONLY signing + fixtures for the root trust ceremony (M2.1).
//!
//! Keys are derived deterministically from a caller seed — **no randomness, no production keygen, no real
//! private key**. Every fixture is `TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS` and contains only
//! public material (public keys, signatures, declarations without secrets). This module is reused by the
//! offline CLI (native only) and by `demo_fixtures()`; it is never a place where a real key is generated.

use crate::{canonical_bytes, FIXTURE_NOTE};
use base64::Engine as _;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use serde_json::{json, Value};

fn b64url(b: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b)
}

/// A deterministic TEST-ONLY keypair derived from a 32-byte seed label. No randomness, no production key.
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
    /// Sign `msg`, returning the base64url signature. Never exposes the private key.
    pub fn sign_b64url(&self, msg: &[u8]) -> String {
        b64url(&self.signing.sign(msg).to_bytes())
    }
}

/// Sign a root-metadata object (without its `signatures`) with the given (key_id, custodian, keypair)
/// triples, returning the `signatures` array.
pub fn sign_root_metadata(
    meta_without_sigs: &Value,
    signers: &[(&str, &str, &TestKeypair)],
) -> Value {
    let msg = canonical_bytes(meta_without_sigs, &["signatures"]);
    Value::Array(
        signers
            .iter()
            .map(|(key_id, custodian, kp)| {
                json!({ "key_id": key_id, "custodian": custodian, "signature": kp.sign_b64url(&msg) })
            })
            .collect(),
    )
}

fn kp(label: &str) -> TestKeypair {
    TestKeypair::from_seed(label.as_bytes())
}

/// Build a base root-metadata object (WITHOUT signatures) from the three custodian public keys.
fn base_metadata(
    a: &TestKeypair,
    b: &TestKeypair,
    c: &TestKeypair,
    keys_override: Option<Value>,
) -> Value {
    let keys = keys_override.unwrap_or_else(|| {
        json!([
            { "key_id": "root-key-A", "custodian": "custodian-A", "public_key": a.public_b64url, "algorithm": "ed25519" },
            { "key_id": "root-key-B", "custodian": "custodian-B", "public_key": b.public_b64url, "algorithm": "ed25519" },
            { "key_id": "root-key-C", "custodian": "custodian-C", "public_key": c.public_b64url, "algorithm": "ed25519" },
        ])
    });
    json!({
        "protocol": "BANZA",
        "environment": "test-only",
        "root_id": "banza-root-m2-testonly",
        "threshold": 2,
        "total_root_keys": 3,
        "keys": keys,
        "delegations": [],
        "valid_from": "2026-07-17T00:00:00Z",
        "valid_until": "2036-07-17T00:00:00Z",
        "ceremony_id": "ceremony-testonly-0001",
        "ceremony_evidence_hash": "TEST_ONLY_evidence_hash",
        "policy": { "threshold": 2, "no_single_custodian_signs_alone": true },
        "scope": ["root_metadata", "delegation", "rotation", "revocation", "trust_policy"],
        "boundary": {
            "open_financial_protocol": true,
            "payment_service_authority": false,
            "operator_authorisation_authority": false,
            "moves_funds": false,
            "settles_funds": false,
            "holds_funds": false,
            "issues_payment_licence": false,
            "creates_operator": false,
            "requires_operator_regulatory_authorisation_if_used_for_real_services": true
        },
        "note": FIXTURE_NOTE
    })
}

fn declarations() -> (Value, Value, Value, Value) {
    let custody = json!([
        { "custodian": "custodian-A", "key_id": "root-key-A", "holds_single_root_key": true, "device_holds_more_than_one_root_key": false, "offline_only": true },
        { "custodian": "custodian-B", "key_id": "root-key-B", "holds_single_root_key": true, "device_holds_more_than_one_root_key": false, "offline_only": true },
        { "custodian": "custodian-C", "key_id": "root-key-C", "holds_single_root_key": true, "device_holds_more_than_one_root_key": false, "offline_only": true }
    ]);
    let backup = json!([
        { "custodian": "custodian-A", "key_id": "root-key-A", "encrypted_backup": true, "passphrase_stored_off_device": true, "plaintext_private_key": false, "backup_medium": "usb" },
        { "custodian": "custodian-B", "key_id": "root-key-B", "encrypted_backup": true, "passphrase_stored_off_device": true, "plaintext_private_key": false, "backup_medium": "usb" },
        { "custodian": "custodian-C", "key_id": "root-key-C", "encrypted_backup": true, "passphrase_stored_off_device": true, "plaintext_private_key": false, "backup_medium": "usb" }
    ]);
    let offline = json!([
        { "custodian": "custodian-A", "offline_confirmed": true, "wifi_off": true, "bluetooth_off": true, "cloud_sync_off": true },
        { "custodian": "custodian-B", "offline_confirmed": true, "wifi_off": true, "bluetooth_off": true, "cloud_sync_off": true },
        { "custodian": "custodian-C", "offline_confirmed": true, "wifi_off": true, "bluetooth_off": true, "cloud_sync_off": true }
    ]);
    let recovery = json!([
        { "custodian": "custodian-A", "key_id": "root-key-A", "recovery_tested": true, "public_key_matches_after_restore": true, "test_only": true },
        { "custodian": "custodian-B", "key_id": "root-key-B", "recovery_tested": true, "public_key_matches_after_restore": true, "test_only": true },
        { "custodian": "custodian-C", "key_id": "root-key-C", "recovery_tested": true, "public_key_matches_after_restore": true, "test_only": true }
    ]);
    (custody, backup, offline, recovery)
}

fn envelope(meta: Value, custody: Value, backup: Value, offline: Value, recovery: Value) -> Value {
    json!({
        "root_metadata": meta,
        "custody_declarations": custody,
        "backup_declarations": backup,
        "offline_computer_declarations": offline,
        "recovery_test_declarations": recovery,
        "ceremony_evidence": { "ceremony_id": "ceremony-testonly-0001", "custodians_present": ["custodian-A", "custodian-B", "custodian-C"], "note": FIXTURE_NOTE },
        "regulatory_boundary_confirmation": { "open_financial_protocol": true, "banza_is_psp": false, "banza_is_operator": false, "banza_moves_funds": false, "note": FIXTURE_NOTE },
        "note": FIXTURE_NOTE
    })
}

/// TEST-ONLY demo fixtures — one per ceremony status. Real Ed25519 signatures over deterministic TEST-ONLY
/// keys; no real private key material anywhere.
pub fn demo_fixtures() -> Value {
    let a = kp("BANZA-M2-ROOT-CEREMONY-TESTONLY-A");
    let b = kp("BANZA-M2-ROOT-CEREMONY-TESTONLY-B");
    let c = kp("BANZA-M2-ROOT-CEREMONY-TESTONLY-C");
    let (custody, backup, offline, recovery) = declarations();

    let sign_ab = |meta: &Value| {
        sign_root_metadata(
            meta,
            &[
                ("root-key-A", "custodian-A", &a),
                ("root-key-B", "custodian-B", &b),
            ],
        )
    };

    // 1. valid_2of3
    let mut meta = base_metadata(&a, &b, &c, None);
    meta["signatures"] = sign_ab(&meta);
    let valid = envelope(
        meta.clone(),
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery.clone(),
    );

    // 2. threshold_1of3 — only A signs
    let mut meta1 = base_metadata(&a, &b, &c, None);
    meta1["signatures"] = sign_root_metadata(&meta1, &[("root-key-A", "custodian-A", &a)]);
    let threshold = envelope(
        meta1,
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery.clone(),
    );

    // 3. duplicate_custodian — key B is held by custodian-A (re-signed so signatures stay valid)
    let dup_keys = json!([
        { "key_id": "root-key-A", "custodian": "custodian-A", "public_key": a.public_b64url, "algorithm": "ed25519" },
        { "key_id": "root-key-B", "custodian": "custodian-A", "public_key": b.public_b64url, "algorithm": "ed25519" },
        { "key_id": "root-key-C", "custodian": "custodian-C", "public_key": c.public_b64url, "algorithm": "ed25519" },
    ]);
    let mut meta_dup = base_metadata(&a, &b, &c, Some(dup_keys));
    meta_dup["signatures"] = sign_ab(&meta_dup);
    let duplicate = envelope(
        meta_dup,
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery.clone(),
    );

    // 4. missing_backup — remove custodian-C's backup declaration
    let backup_missing = json!([backup[0].clone(), backup[1].clone()]);
    let missing_backup = envelope(
        meta.clone(),
        custody.clone(),
        backup_missing,
        offline.clone(),
        recovery.clone(),
    );

    // 5. online_environment_gap — remove custodian-C's offline declaration
    let offline_missing = json!([offline[0].clone(), offline[1].clone()]);
    let online_gap = envelope(
        meta.clone(),
        custody.clone(),
        backup.clone(),
        offline_missing,
        recovery.clone(),
    );

    // 6. missing_recovery_test — remove custodian-C's recovery declaration
    let recovery_missing = json!([recovery[0].clone(), recovery[1].clone()]);
    let missing_recovery = envelope(
        meta.clone(),
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery_missing,
    );

    // 7. invalid_signature — tamper B's signature
    let mut meta_bad = meta.clone();
    if let Some(sig) = meta_bad["signatures"][1]["signature"].as_str() {
        let mut chars: Vec<char> = sig.chars().collect();
        let n = chars.len();
        chars[n - 1] = if chars[n - 1] == 'A' { 'B' } else { 'A' };
        meta_bad["signatures"][1]["signature"] = json!(chars.into_iter().collect::<String>());
    }
    let invalid_sig = envelope(
        meta_bad,
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery.clone(),
    );

    // 8. private_key_leak — input carries a forbidden field (TEST-ONLY placeholder, not a real key)
    let mut leak = valid.clone();
    leak["custodian_supplied_material"] =
        json!({ "root_private_key": "REDACTED-TEST-ONLY-not-a-real-key-000" });
    // 9. forbidden_scope — root metadata over-claims payment authority (re-signed)
    let mut meta_scope = base_metadata(&a, &b, &c, None);
    meta_scope["boundary"]["payment_service_authority"] = json!(true);
    meta_scope["signatures"] = sign_ab(&meta_scope);
    let forbidden_scope = envelope(
        meta_scope,
        custody.clone(),
        backup.clone(),
        offline.clone(),
        recovery.clone(),
    );

    // 10. regulatory_boundary_fail — confirmation claims BANZA is a PSP
    let mut reg_fail = valid.clone();
    reg_fail["regulatory_boundary_confirmation"] = json!({ "open_financial_protocol": true, "banza_is_psp": true, "banza_is_operator": true, "note": FIXTURE_NOTE });

    // 11. incomplete_missing_evidence — everything valid but ceremony_evidence absent
    let mut incomplete = valid.clone();
    incomplete
        .as_object_mut()
        .unwrap()
        .remove("ceremony_evidence");

    json!({
        "note": FIXTURE_NOTE,
        "fixtures": [
            { "key": "valid_2of3", "label": "Válido 2-de-3", "expected": "M2_ROOT_CEREMONY_VALID", "input": valid },
            { "key": "threshold_1of3", "label": "Apenas 1 assinatura", "expected": "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD", "input": threshold },
            { "key": "duplicate_custodian", "label": "Custodian repetido", "expected": "M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP", "input": duplicate },
            { "key": "missing_backup", "label": "Sem backup cifrado", "expected": "M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP", "input": missing_backup },
            { "key": "online_environment_gap", "label": "Sem declaração offline", "expected": "M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP", "input": online_gap },
            { "key": "missing_recovery_test", "label": "Sem teste de recuperação", "expected": "M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP", "input": missing_recovery },
            { "key": "invalid_signature", "label": "Assinatura inválida", "expected": "M2_ROOT_CEREMONY_INVALID_SIGNATURE", "input": invalid_sig },
            { "key": "private_key_leak", "label": "Material de chave privada", "expected": "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL", "input": leak },
            { "key": "forbidden_scope", "label": "Scope proibido (pagamento)", "expected": "M2_ROOT_CEREMONY_INVALID_SCOPE", "input": forbidden_scope },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/operador", "expected": "M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY", "input": reg_fail },
            { "key": "incomplete_missing_evidence", "label": "Sem ceremony evidence", "expected": "M2_ROOT_CEREMONY_INCOMPLETE", "input": incomplete },
        ]
    })
}
