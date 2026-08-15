//! gen_operator_zero (TEST-ONLY) — the deterministic generator for the CORRECTED Operador Zero (OZ)
//! validation-journey artifacts.
//!
//! It builds each artifact from the REAL BANZA engines (operator-manifest, conformance/SimB, trust
//! OTE, evidence-bundle), binds them by hash, verifies every one back through its own engine, and
//! writes the canonical JSON files in place.
//!
//! GOLDEN RULE: this fixes the ARTIFACTS so the real engines accept them. It never fakes a verdict and
//! never edits an engine. Deterministic: no randomness, no wall-clock — every timestamp is fixed, so
//! running it twice produces byte-identical files.
//!
//! Run: `cargo run -p banza-evidence-bundle --bin gen_operator_zero`

use banza_evidence_bundle::{build_bundle, validate_bundle};
use banza_trust::canonical_sha256;
use banza_trust::evaluate::evaluate_trust;
use banza_trust::sign::operator_zero_ote;
use serde_json::{json, Value};
use std::path::PathBuf;

const CREATED_AT: &str = "2026-08-05T00:00:00Z";
const EVALUATED_AT: &str = "2026-08-05T00:00:00Z";

/// The five demo-boundary marker fields required on every OZ artifact (operator-zero-core boundary).
fn add_markers(v: &mut Value) {
    let o = v.as_object_mut().expect("artifact must be a JSON object");
    o.insert("demo_only".into(), json!(true));
    o.insert("monetary_value".into(), json!(false));
    o.insert("production_allowed".into(), json!(false));
    o.insert("operator_id".into(), json!("operator-zero"));
    o.insert("operator_display_name".into(), json!("Operador Zero"));
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn write_pretty(rel: &str, v: &Value) -> PathBuf {
    let path = repo_root().join(rel);
    let mut s = serde_json::to_string_pretty(v).expect("pretty json");
    s.push('\n');
    std::fs::create_dir_all(path.parent().expect("parent dir")).expect("mkdir");
    std::fs::write(&path, s).unwrap_or_else(|e| panic!("write {}: {e}", path.display()));
    path
}

fn main() {
    // ── 1) OZ operator manifest BODY (demo-marked) — VALIDATES against banza-operator-manifest ──
    // operator_id and production_allowed are added by add_markers (production_allowed=false is also a
    // required canonical field for the operator-manifest validator, so the marker satisfies it).
    let mut manifest_body = json!({
        "name": "Operador Zero (simulador demo)",
        "environment": "sandbox",
        "simulated": true,
        "protocol_version": "1.0.0",
        "origin": "https://zero.banza.network",
        "base_url": "https://zero.banza.network",
        "key_manifest_url": "https://zero.banza.network/key-manifest.json",
        "brl_url": "https://zero.banza.network/revocation-list.json",
        "conformance_url": "https://zero.banza.network/conformance/evidence.json",
        "contact": "ops@zero.banza.network",
        "supported_levels": ["L0"],
        "capabilities": {
            "supports_wallets": true,
            "supports_qr": true,
            "supports_transfers": true,
            "supports_settlement_simulation": true,
            "supports_payment_requests": true
        },
        "endpoints": {
            "base_url": "https://zero.banza.network",
            "key_manifest_url": "https://zero.banza.network/key-manifest.json",
            "conformance_url": "https://zero.banza.network/conformance/evidence.json"
        },
        "public_keys": [
            { "key_id": "operator-zero-key-1", "public_key": "ed25519:AAAA", "algorithm": "ed25519" }
        ],
        "self_publication_statement": "self-published by the operator; not issued or approved by BANZA",
        "manifest_version": 1,
        "created_at": CREATED_AT
    });
    add_markers(&mut manifest_body);
    let mr = banza_operator_manifest::validate_manifest(&manifest_body);
    assert_eq!(
        mr["status"], "VALID",
        "OZ manifest body must validate VALID: {mr:#}"
    );

    // ── 2) Conformance report from the REAL L0 demo (PASS), demo-marked, WITHOUT evidence_hash ──
    // KZ_DEMO is operator-zero-core's DEMO_CURRENCY — the only currency the OZ demo boundary permits;
    // AOA (the default) is deliberately in FORBIDDEN_CURRENCIES, so the embedded simb report must use
    // the demo currency. The invariant checks are currency-agnostic, so the run is still PASS.
    let simb = banza_simb::scenario::run_scenario_with_currency("valid_l0", "KZ_DEMO");
    assert_eq!(simb["status"], "PASS", "SimB valid_l0 must be PASS");
    let mut conformance_body =
        banza_conformance::tool::run_l0_demo(&json!({ "run": simb.clone() }));
    assert_eq!(conformance_body["status"], "PASS", "L0 demo must be PASS");
    if let Some(o) = conformance_body.as_object_mut() {
        o.remove("evidence_hash");
    }
    add_markers(&mut conformance_body); // overwrites operator_id (was the SimB operator) to operator-zero
    banza_conformance::validate_report(&conformance_body.to_string())
        .expect("served conformance body must pass validate_report");

    // ── 3) Self-anchored OTE material binding the OZ manifest + conformance by hash ──
    let ote = operator_zero_ote(&manifest_body, &conformance_body);
    let manifest_hash = ote["manifest_hash"]
        .as_str()
        .expect("manifest_hash")
        .to_string();
    let evidence_hash = ote["evidence_hash"]
        .as_str()
        .expect("evidence_hash")
        .to_string();

    // ── 4) Served bodies = body + bound hash. Re-validate through the engines. ──
    let mut served_manifest = manifest_body.clone();
    served_manifest["manifest_hash"] = json!(manifest_hash);
    let mr2 = banza_operator_manifest::validate_manifest(&served_manifest);
    assert_eq!(
        mr2["status"], "VALID",
        "served manifest must remain VALID: {mr2:#}"
    );

    let mut served_conformance = conformance_body.clone();
    served_conformance["evidence_hash"] = json!(evidence_hash);
    banza_conformance::validate_report(&served_conformance.to_string())
        .expect("served conformance must pass validate_report");
    assert_eq!(served_conformance["status"], "PASS");

    // ── 5) Assemble the OTE evaluate input EXACTLY as banzai-api will → TRUST_VALID ──
    let km = &ote["key_manifest"];
    let eval_input = json!({
        "evaluated_at": EVALUATED_AT,
        "evaluator_protocol_version": "1.0.0",
        "trusted_root_public_keys": km["trusted_root_public_keys"].clone(),
        "trust_root_metadata": km["trust_root_metadata"].clone(),
        "delegated_signing_key": km["delegated_signing_key"].clone(),
        "signed_protocol_metadata": ote["signed_metadata"].clone(),
        "operator_manifest": served_manifest.clone(),
        "conformance_evidence": served_conformance.clone(),
        "public_registry_entry": km["public_registry_entry"].clone(),
        "revocation_status": ote["revocation"].clone()
    });
    let trust = evaluate_trust(&eval_input);
    assert_eq!(
        trust["trust_status"], "TRUST_VALID",
        "OZ trust must evaluate TRUST_VALID: {trust:#}"
    );

    // ── 6) Evidence bundle from the REAL engines (SimB PASS + served conformance) ──
    let mut bundle = build_bundle(&json!({
        "operator_candidate": "operator-zero",
        "created_at": CREATED_AT,
        "simb": simb.clone(),
        "l0": served_conformance.clone()
    }));
    add_markers(&mut bundle);
    // Recompute hashes.bundle_hash EXACTLY as validate_bundle does (over the bundle minus bundle_hash).
    {
        let mut b = bundle.clone();
        b["hashes"]
            .as_object_mut()
            .expect("hashes object")
            .remove("bundle_hash");
        // `canonical_sha256` returns a Result. Assigning it unwrapped serialised the hash as
        // `{"Ok": "<digest>"}`, so `validate_bundle` reported the field missing and this generator
        // could not complete — the reason the committed Operador Zero bundle went stale.
        let h = canonical_sha256(&b, &[]).expect("BCJ/1: the bundle must be canonicalizable");
        bundle["hashes"]["bundle_hash"] = json!(h);
    }
    let vb = validate_bundle(&bundle.to_string());
    assert_eq!(vb["ok"], true, "evidence bundle must validate: {vb:#}");
    assert_eq!(
        bundle["readiness"], "READY_FOR_TECHNICAL_REVIEW",
        "evidence bundle readiness must be READY_FOR_TECHNICAL_REVIEW"
    );

    // ── 7) Write the six canonical files (pretty JSON + trailing newline), overwriting in place ──
    let files: [(&str, &Value); 6] = [
        (
            "examples/operators/zero/manifest/operator-zero.manifest.valid.json",
            &served_manifest,
        ),
        (
            "examples/operators/zero/keys/demo-key-manifest.json",
            &ote["key_manifest"],
        ),
        (
            "examples/operators/zero/keys/revocation-list.demo.json",
            &ote["revocation"],
        ),
        (
            "examples/operators/zero/metadata/signed-metadata.json",
            &ote["signed_metadata"],
        ),
        (
            "examples/operators/zero/conformance/conformance-pass.json",
            &served_conformance,
        ),
        (
            "examples/operators/zero/evidence-bundle/evidence-bundle.complete.json",
            &bundle,
        ),
    ];
    for (rel, v) in files {
        let p = write_pretty(rel, v);
        println!("wrote {}", p.display());
    }

    println!("---");
    println!(
        "verification: manifest={} | conformance={} (validate_report ok) | trust={} | evidence readiness={} (validate_bundle ok)",
        mr2["status"].as_str().unwrap_or("?"),
        served_conformance["status"].as_str().unwrap_or("?"),
        trust["trust_status"].as_str().unwrap_or("?"),
        bundle["readiness"].as_str().unwrap_or("?"),
    );
    println!("manifest_hash={manifest_hash}");
    println!("evidence_hash={evidence_hash}");
}
