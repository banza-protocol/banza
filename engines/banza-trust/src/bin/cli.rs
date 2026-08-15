//! `banza-trust` CLI (ADR-038, R5; M2.4) — verification only. No key generation, no signing of
//! production artifacts, no issuance, no operator authorisation.
//! Commands: evaluate, verify-key-manifest, verify-revocation-list, verify-evidence, demo-fixtures,
//! schema, ceremony-simulate, ceremony-check, version.

use banza_trust::*;
use serde_json::Value;
use std::process::exit;

fn read(path: &str) -> Value {
    let s = std::fs::read_to_string(path).unwrap_or_else(|e| {
        eprintln!("error: read {path}: {e}");
        exit(2);
    });
    serde_json::from_str(&s).unwrap_or_else(|e| {
        eprintln!("error: parse {path}: {e}");
        exit(2);
    })
}

fn emit(r: TrustResult) -> ! {
    println!("{}", serde_json::to_string_pretty(&r).unwrap());
    exit(if r.verified { 0 } else { 1 });
}

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    let cmd = a.first().map(|s| s.as_str()).unwrap_or("help");
    match cmd {
        "version" => {
            println!("{VERIFIER} {VERIFIER_VERSION} — verification only (no signing of production artifacts, no issuance, no operator authorisation)");
        }
        // Active-model trust evaluation.
        "evaluate" => {
            let report = evaluate::evaluate_trust(&read(&arg(&a, 1)));
            let ok = report["trust_status"].as_str() == Some("TRUST_VALID");
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
            exit(if ok { 0 } else { 1 });
        }
        // Full federation Open Trust Evaluation (ADR-025): ten fail-closed checks → ROUTING_ALLOWED / FAIL_CLOSED.
        "federation-ote" => {
            let report = evaluate::evaluate_federation_ote(&read(&arg(&a, 1)));
            let allowed = report["outcome"].as_str() == Some("ROUTING_ALLOWED");
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
            exit(if allowed { 0 } else { 1 });
        }
        // Reproducible positive-path evidence: build the deterministic valid federation input and evaluate it.
        "federation-ote-demo" => {
            let report = evaluate::evaluate_federation_ote(&sign::federation_ote_demo_input());
            let allowed = report["outcome"].as_str() == Some("ROUTING_ALLOWED");
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
            exit(if allowed { 0 } else { 1 });
        }
        // The manifest is now authorised by the ACTIVE Root Authority Set, so the second argument is
        // that set rather than a single root public key.
        "verify-key-manifest" | "verify-manifest" | "verify-root" => {
            let (doc, set) = (read(&arg(&a, 1)), read(&arg(&a, 2)));
            emit(verify_key_manifest(&doc, &set));
        }
        // Root Authority Set lineage: a successor is authorised by the threshold of its predecessor,
        // and the genesis set is accepted only against an explicitly pinned digest.
        "verify-authority-successor" => {
            let (candidate, active) = (read(&arg(&a, 1)), read(&arg(&a, 2)));
            emit(banza_trust::authority_set::verify_successor_set(
                &candidate, &active,
            ));
        }
        "verify-authority-genesis" => {
            let (set, pinned) = (read(&arg(&a, 1)), arg(&a, 2));
            emit(banza_trust::authority_set::verify_genesis_set(
                &set, &pinned,
            ));
        }
        // Regenerate `conformance/vectors/trust-signing.json` from the same scenarios the engine tests
        // drive, so the published vectors can never describe material the engine does not produce.
        "signing-vectors" => {
            println!("{}", banza_trust::sign::signing_vectors());
        }
        "authority-set-vectors" => {
            println!("{}", banza_trust::sign::authority_set_vectors());
        }
        "authority-set-digest" => {
            match banza_trust::authority_set::set_digest(&read(&arg(&a, 1))) {
                Ok(d) => println!("{d}"),
                Err(e) => {
                    eprintln!("{e}");
                    exit(1);
                }
            }
        }
        "verify-revocation-list" => {
            let (doc, key) = (read(&arg(&a, 1)), arg(&a, 2));
            emit(verify_revocation_list(&doc, &key));
        }
        "verify-evidence" => {
            let (doc, key) = (read(&arg(&a, 1)), arg(&a, 2));
            emit(verify_evidence_package(&doc, &key));
        }
        "demo-fixtures" => {
            println!(
                "{}",
                serde_json::to_string_pretty(&sign::demo_fixtures()).unwrap()
            );
        }
        "schema" => {
            println!("{}", serde_json::to_string_pretty(&tool::schema()).unwrap());
        }
        // ── TEST-ONLY signing helper + ceremony simulator (active model) ──
        "generate-test-root" => {
            let kp = sign::TestKeypair::from_seed(arg(&a, 1).as_bytes());
            println!("{}", serde_json::to_string_pretty(&serde_json::json!({
                "test_only": true, "public_key_b64url": kp.public_b64url, "marker": sign::TEST_ONLY_MARKER
            })).unwrap());
        }
        "ceremony-simulate" => {
            let r = sign::ceremony_simulate();
            println!("{}", serde_json::to_string_pretty(&r).unwrap());
            exit(
                if r.chain_valid && r.revoked_subject_rejected && r.tamper_rejected {
                    0
                } else {
                    1
                },
            );
        }
        "ceremony-check" => {
            let r = sign::ceremony_simulate();
            emit(sign::ceremony_check(&r));
        }
        _ => {
            eprintln!("usage: banza-trust <evaluate <input.json> | federation-ote <input.json> | verify-key-manifest <doc.json> <root_pk> | verify-revocation-list <doc.json> <revocation_pk> | verify-evidence <doc.json> <evidence_pk> | demo-fixtures | schema | ceremony-simulate | ceremony-check | version>");
            exit(2);
        }
    }
}

fn arg(a: &[String], i: usize) -> String {
    a.get(i).cloned().unwrap_or_else(|| {
        eprintln!("error: missing argument {i}");
        exit(2);
    })
}
