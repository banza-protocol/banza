//! `gen` — the Operador Zero E2E Demo Root tool (ADR-052, M2.13A).
//!
//!   cargo run -p operator-zero-e2e-root --bin gen            # (re)generate the public artifacts
//!   cargo run -p operator-zero-e2e-root --bin gen -- --verify # verify the committed public artifacts
//!
//! GENERATE creates an EPHEMERAL Ed25519 key (only in memory), signs the demo manifest and evidence
//! bundle, and writes ONLY public artifacts. The private key is never written to disk and never
//! returned — it is dropped when this process exits. VERIFY loads the committed artifacts and checks,
//! using the public key alone, that the signatures verify, a tampered payload fails, the active key is
//! not revoked while the revoked demo key is blocked, the demo boundary fields are present, and no
//! private-key material leaked into any artifact. Exit code 1 on any failure.

use operator_zero_e2e_root as e2e;
use serde_json::Value;
use std::path::PathBuf;

fn dir() -> PathBuf {
    // Resolve relative to the crate, so CWD does not matter (guards/tests run from anywhere).
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../examples/operators/zero/e2e-root")
}

const FILES: &[&str] = &[
    "operator-zero-e2e-root.public.json",
    "operator-zero-e2e-key-manifest.json",
    "operator-zero-e2e-key-fingerprint.txt",
    "operator-zero-e2e-signature-report.json",
    "operator-zero-e2e-revocation-list.json",
    "operator-zero-e2e-signed-manifest.json",
    "operator-zero-e2e-signed-evidence-bundle.json",
    "operator-zero-e2e-root-verification-trace.json",
];

fn write_json(dir: &std::path::Path, name: &str, v: &Value) {
    let mut s = serde_json::to_string_pretty(v).unwrap();
    s.push('\n');
    std::fs::write(dir.join(name), s).unwrap_or_else(|e| panic!("write {name}: {e}"));
}

fn generate() {
    let d = dir();
    std::fs::create_dir_all(&d).expect("mkdir e2e-root");

    // Ephemeral key: in memory only, never written to disk, dropped at end of scope.
    let sk = e2e::generate_ephemeral_key();
    let pk = sk.verifying_key().to_bytes();

    let manifest = e2e::demo_manifest();
    let bundle = e2e::demo_evidence_bundle();
    let manifest_sig = e2e::sign_payload(&sk, &manifest);
    let bundle_sig = e2e::sign_payload(&sk, &bundle);

    write_json(&d, FILES[0], &e2e::public_key_artifact(&pk));
    write_json(&d, FILES[1], &e2e::key_manifest_artifact(&pk));
    std::fs::write(d.join(FILES[2]), format!("{}\n", e2e::fingerprint(&pk))).unwrap();
    write_json(
        &d,
        FILES[3],
        &e2e::signature_report_artifact(
            &pk,
            &[
                ("manifest".into(), manifest.clone(), manifest_sig.clone()),
                ("evidence_bundle".into(), bundle.clone(), bundle_sig.clone()),
            ],
        ),
    );
    write_json(&d, FILES[4], &e2e::revocation_list_artifact());
    write_json(
        &d,
        FILES[5],
        &e2e::signed_artifact(&pk, "manifest", &manifest, &manifest_sig),
    );
    write_json(
        &d,
        FILES[6],
        &e2e::signed_artifact(&pk, "evidence_bundle", &bundle, &bundle_sig),
    );
    write_json(
        &d,
        FILES[7],
        &e2e::verification_trace_artifact(&pk, &manifest, &manifest_sig),
    );

    println!("generated 8 public artifacts in {}", d.display());
    println!("key_id      = {}", e2e::key_id(&pk));
    println!("fingerprint = {}", e2e::fingerprint(&pk));
    println!("NOTE: the ephemeral private key was kept only in memory and is now dropped — it was never written to disk or committed.");
    // sk is dropped here.
}

fn load(d: &std::path::Path, name: &str) -> Value {
    let s = std::fs::read_to_string(d.join(name)).unwrap_or_else(|e| panic!("read {name}: {e}"));
    serde_json::from_str(&s).unwrap_or_else(|e| panic!("parse {name}: {e}"))
}

fn verify() -> bool {
    let d = dir();
    let mut ok = true;
    let mut check = |cond: bool, msg: &str| {
        println!("  {} {}", if cond { "ok:" } else { "FAIL:" }, msg);
        if !cond {
            ok = false;
        }
    };

    // All 8 files present.
    for f in FILES {
        check(d.join(f).exists(), &format!("artifact present: {f}"));
    }

    let pubj = load(&d, FILES[0]);
    let pk_mb = pubj["public_key_multibase"].as_str().unwrap_or("");
    let pk_bytes = e2e::unmb64(pk_mb).unwrap_or_default();
    check(
        pk_bytes.len() == 32,
        "public key is a valid 32-byte Ed25519 key",
    );
    check(
        pubj["not_protocol_trust_root"] == Value::Bool(true),
        "public key artifact: not_protocol_trust_root = true",
    );
    check(
        pubj["root_type"] == Value::String("demo_operator_root".into()),
        "public key artifact: root_type = demo_operator_root",
    );

    // Signed manifest: verifies, and a tampered payload does NOT verify.
    let sm = load(&d, FILES[5]);
    let m_payload = &sm["payload"];
    let m_sig = sm["signature_multibase"].as_str().unwrap_or("");
    check(
        e2e::verify_payload(pk_mb, m_payload, m_sig),
        "signed manifest signature verifies",
    );
    let mut tampered = m_payload.clone();
    tampered
        .as_object_mut()
        .unwrap()
        .insert("protocol_version".into(), Value::String("tampered".into()));
    check(
        !e2e::verify_payload(pk_mb, &tampered, m_sig),
        "tampered manifest payload FAILS verification",
    );

    // Signed evidence bundle verifies.
    let sb = load(&d, FILES[6]);
    check(
        e2e::verify_payload(
            pk_mb,
            &sb["payload"],
            sb["signature_multibase"].as_str().unwrap_or(""),
        ),
        "signed evidence bundle signature verifies",
    );

    // Revocation: the active root key is NOT revoked; the revoked demo key IS → trust blocked.
    let rev = load(&d, FILES[4]);
    let active_id = pubj["key_id"].as_str().unwrap_or("");
    check(
        !e2e::is_revoked(&rev, active_id),
        "active root key is not revoked",
    );
    check(
        e2e::is_revoked(&rev, e2e::REVOKED_DEMO_KEY_ID),
        "the revoked demo key is in the revocation list",
    );
    check(
        e2e::evaluate_trust(pk_mb, active_id, m_payload, m_sig, &rev) == "valid_demo",
        "trust(active key) = valid_demo",
    );
    check(
        e2e::evaluate_trust(pk_mb, e2e::REVOKED_DEMO_KEY_ID, m_payload, m_sig, &rev)
            == "blocked_revoked",
        "trust(revoked key) = blocked_revoked (fail-closed)",
    );

    // Verification trace is complete and internally consistent.
    let trace = load(&d, FILES[7]);
    check(
        trace["complete"] == Value::Bool(true),
        "verification trace: complete = true",
    );

    // Boundary fields on every JSON artifact; no private-key material anywhere.
    for f in FILES {
        let raw = std::fs::read_to_string(d.join(f)).unwrap();
        let low = raw.to_lowercase();
        let markers = ["private_key", "secret", "seed", "mnemonic", "signing_key"]; // leak blocklist pattern (test-only detector)
        let clean = !raw.contains("BEGIN") && !markers.iter().any(|m| low.contains(m));
        check(clean, &format!("no private-key material in {f}"));
        if f.ends_with(".json") {
            let v = load(&d, f);
            check(
                v["demo_only"] == Value::Bool(true),
                &format!("{f}: demo_only = true"),
            );
            check(
                v["production_allowed"] == Value::Bool(false),
                &format!("{f}: production_allowed = false"),
            );
            check(
                v["monetary_value"] == Value::Bool(false),
                &format!("{f}: monetary_value = false"),
            );
            check(
                v["operator_id"] == Value::String(e2e::OPERATOR_ID.into()),
                &format!("{f}: operator_id = operator-zero"),
            );
        }
    }

    ok
}

fn main() {
    let verify_mode = std::env::args().any(|a| a == "--verify");
    if verify_mode {
        println!("operator-zero-e2e-root: verifying committed public artifacts…");
        if verify() {
            println!("operator-zero-e2e-root: VERIFY PASS");
        } else {
            println!("operator-zero-e2e-root: VERIFY FAIL");
            std::process::exit(1);
        }
    } else {
        generate();
    }
}
