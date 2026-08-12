//! M2.1 CLI safety tests: the offline ceremony tool never writes a plaintext private key, refuses a Git
//! worktree destination, never exposes the private key, round-trips an ENCRYPTED backup, verifies the
//! 2-of-3 threshold and rejects 1-of-3 / duplicate custodian / forbidden scope via the Rust engine.

use banza_root_ceremony::sign::sign_root_metadata;
use banza_root_ceremony_cli as cli;
use serde_json::Value;

fn fixture(key: &str) -> Value {
    banza_root_ceremony::demo_fixtures()["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["key"] == key)
        .unwrap()["input"]
        .clone()
}

#[test]
fn refuses_missing_passphrase_no_plaintext() {
    let dir = std::env::temp_dir().join("banza-m21-keygen-test");
    let _ = std::fs::create_dir_all(&dir);
    let err = cli::keygen(&dir, "", true).unwrap_err();
    assert_eq!(err, cli::CliError::MissingPassphrase);
}

#[test]
fn refuses_git_worktree_destination() {
    // the repo root (this crate lives inside a Git worktree) must be refused, even test-only.
    let here = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    assert!(cli::is_in_git_worktree(here));
    let err = cli::keygen(here, "correct horse battery staple", true).unwrap_err();
    assert_eq!(
        err,
        cli::CliError::RefusedInGitWorktree(here.display().to_string())
    );
    let err2 = cli::keygen(here, "correct horse battery staple", false).unwrap_err();
    assert_eq!(
        err2,
        cli::CliError::RefusedInGitWorktree(here.display().to_string())
    );
}

#[test]
fn keygen_returns_only_public_material_and_encrypted_backup() {
    let dir = std::env::temp_dir().join("banza-m21-keygen-ok");
    let _ = std::fs::create_dir_all(&dir);
    let k = cli::keygen(&dir, "a-strong-test-passphrase", true).unwrap();
    assert!(!k.public_key_b64url.is_empty());
    assert_eq!(k.fingerprint.len(), 32);
    // the encrypted backup carries NO plaintext key — only kdf/cipher/salt/nonce/ciphertext.
    let blob = &k.encrypted_backup;
    assert_eq!(blob["cipher"], "chacha20poly1305");
    assert!(blob.get("ciphertext").and_then(|x| x.as_str()).is_some());
    let s = blob.to_string().to_lowercase();
    assert!(!s.contains("private_key") && !s.contains("seed_phrase") && !s.contains("mnemonic"));
    assert!(blob["note"]
        .as_str()
        .unwrap()
        .contains("Encrypted private key seed"));
}

#[test]
fn encrypted_backup_round_trips_only_with_correct_passphrase() {
    let seed = [7u8; 32];
    let blob = cli::encrypt_seed(&seed, "pass-1").unwrap();
    assert_eq!(cli::decrypt_seed(&blob, "pass-1").unwrap(), seed);
    assert_eq!(
        cli::decrypt_seed(&blob, "wrong").unwrap_err(),
        cli::CliError::BadPassphrase
    );
}

#[test]
fn recovery_test_confirms_public_key_and_signature() {
    let seed = [9u8; 32];
    let blob = cli::encrypt_seed(&seed, "pp").unwrap();
    let signing = ed25519_dalek::SigningKey::from_bytes(&seed);
    let pubk = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        signing.verifying_key().to_bytes(),
    );
    assert!(cli::recovery_test(&blob, "pp", &pubk).unwrap());
    assert!(!cli::recovery_test(&blob, "pp", "wrong-public-key").unwrap());
}

#[test]
fn verify_accepts_2of3_and_rejects_1of3() {
    assert_eq!(
        cli::verify_ceremony(&fixture("valid_2of3")),
        "M2_ROOT_CEREMONY_VALID"
    );
    assert_eq!(
        cli::verify_ceremony(&fixture("threshold_1of3")),
        "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD"
    );
}

#[test]
fn verify_rejects_duplicate_custodian_and_forbidden_scope() {
    assert_eq!(
        cli::verify_ceremony(&fixture("duplicate_custodian")),
        "M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP"
    );
    assert_eq!(
        cli::verify_ceremony(&fixture("forbidden_scope")),
        "M2_ROOT_CEREMONY_INVALID_SCOPE"
    );
}

#[test]
fn sign_produces_a_signature_that_the_engine_accepts() {
    // sign with two CLI-decrypted keys and confirm the ceremony verifies (2-of-3), end to end.
    let a = cli::test_keypair("BANZA-M2-ROOT-CEREMONY-TESTONLY-A");
    let b = cli::test_keypair("BANZA-M2-ROOT-CEREMONY-TESTONLY-B");
    // reuse the engine fixture's metadata (already signed by A+B); re-sign here to prove sign_root_metadata parity
    let mut input = fixture("valid_2of3");
    let meta = input["root_metadata"].clone();
    let sigs = sign_root_metadata(
        &meta,
        &[
            ("root-key-A", "custodian-A", &a),
            ("root-key-B", "custodian-B", &b),
        ],
    );
    input["root_metadata"]["signatures"] = sigs;
    assert_eq!(cli::verify_ceremony(&input), "M2_ROOT_CEREMONY_VALID");
}
