//! Every canonical artifact in `examples/operators/zero/` is loaded and checked against the demo
//! boundary by the engine itself.
//!
//! This is the test that makes the artifact tree trustworthy rather than merely present. It walks
//! the directory rather than listing files, so a NEW artifact is covered the moment it is added —
//! an author cannot add an unmarked file and have the suite stay green by omission.

use operator_zero_core::boundary;
use serde_json::Value;
use std::path::{Path, PathBuf};

fn artifact_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../examples/operators/zero")
}

fn all_json(dir: &Path, out: &mut Vec<PathBuf>) {
    for e in std::fs::read_dir(dir).unwrap_or_else(|e| panic!("read {}: {e}", dir.display())) {
        let p = e.unwrap().path();
        if p.is_dir() {
            // The E2E Demo Operator Root (M2.13A) is a SEPARATE signing layer: unlike the placeholder
            // keys of this core tree, it carries a REAL demo Ed25519 key so its signatures actually
            // verify. It has its own crate + tests (engines/operator-zero-e2e-root) and its own guard
            // (make operator-zero-full-e2e-check), so this core scan skips it.
            if p.file_name().map(|n| n == "e2e-root").unwrap_or(false) {
                continue;
            }
            all_json(&p, out);
        } else if p.extension().map(|x| x == "json").unwrap_or(false) {
            out.push(p);
        }
    }
}

fn load_all() -> Vec<(String, Value)> {
    let root = artifact_root();
    let mut files = Vec::new();
    all_json(&root, &mut files);
    files.sort();
    files
        .iter()
        .map(|p| {
            let name = p.strip_prefix(&root).unwrap().display().to_string();
            let text = std::fs::read_to_string(p).unwrap();
            let v: Value = serde_json::from_str(&text)
                .unwrap_or_else(|e| panic!("{name} is not valid JSON: {e}"));
            (name, v)
        })
        .collect()
}

#[test]
fn the_artifact_tree_is_not_empty() {
    let all = load_all();
    assert!(
        all.len() >= 30,
        "expected the full canonical tree, found {} artifacts",
        all.len()
    );
}

#[test]
fn every_artifact_carries_the_demo_marking() {
    for (name, v) in load_all() {
        for (key, expected) in [
            ("demo_only", Value::Bool(true)),
            ("monetary_value", Value::Bool(false)),
            ("production_allowed", Value::Bool(false)),
        ] {
            assert_eq!(
                v.get(key),
                Some(&expected),
                "{name}: {key} must be {expected}"
            );
        }
        assert_eq!(
            v["operator_id"], "operator-zero",
            "{name}: wrong operator_id"
        );
        assert_eq!(
            v["operator_display_name"], "Operador Zero",
            "{name}: wrong display name"
        );
    }
}

#[test]
fn every_artifact_that_names_a_currency_uses_the_demo_one() {
    for (name, v) in load_all() {
        if let Some(c) = v.get("currency").and_then(|c| c.as_str()) {
            assert_eq!(c, "KZ_DEMO", "{name}: currency must be KZ_DEMO");
        }
    }
}

/// The whole tree, through the engine's own boundary checker.
///
/// One artifact is a deliberate exception: the secret-leak manifest exists precisely to be caught,
/// so it must FAIL. A test that let it pass would be asserting the detector is broken.
#[test]
fn the_tree_passes_the_demo_boundary_except_the_artifact_designed_to_fail() {
    let all = load_all();
    let (should_fail, should_pass): (Vec<_>, Vec<_>) = all
        .into_iter()
        .partition(|(n, _)| n.contains("invalid-secret-leak"));

    assert_eq!(
        should_fail.len(),
        1,
        "the secret-leak fixture must exist — it is what proves the detector works"
    );
    let r = boundary::evaluate(&should_fail);
    assert_eq!(
        r["intact"], false,
        "the secret-leak manifest must be REFUSED by the boundary checker"
    );
    assert_eq!(r["status"], "demo_boundary_secret_present");

    let r = boundary::evaluate(&should_pass);
    assert_eq!(
        r["intact"],
        true,
        "canonical artifacts violate the demo boundary: {}",
        serde_json::to_string_pretty(&r["violations"]).unwrap()
    );
}

/// No real key material, anywhere. The one artifact that carries a secret MARKER carries an obvious
/// placeholder, and that is checked explicitly rather than assumed.
#[test]
fn no_artifact_contains_real_key_material() {
    for (name, v) in load_all() {
        let text = v.to_string();
        for marker in ["-----BEGIN", "PRIVATE KEY", "mnemonic", "seed_phrase"] {
            assert!(
                !text.contains(marker),
                "{name} contains '{marker}' — no private material may be committed"
            );
        }
        if text.contains("api_key") {
            assert!(
                text.contains("DO-NOT-USE") || text.contains("placeholder"),
                "{name} names a credential without marking it a placeholder"
            );
        }
        // Any public key must be a visible placeholder, not something that looks usable.
        if let Some(k) = v.get("public_key_multibase").and_then(|k| k.as_str()) {
            assert!(
                k.contains("DEMO") || k.contains("placeholder"),
                "{name}: public key '{k}' must be an obvious placeholder"
            );
        }
    }
}

#[test]
fn the_generated_traces_match_what_the_engine_produces_now() {
    // The committed traces are generated FROM the engine. If they drift, either the engine changed
    // without regenerating, or a trace was hand-edited — both are defects.
    let root = artifact_root();
    for (file, happy) in [
        ("traces/full-e2e-trace.json", true),
        ("traces/failed-e2e-trace.json", false),
    ] {
        let committed: Value =
            serde_json::from_str(&std::fs::read_to_string(root.join(file)).unwrap()).unwrap();
        let fresh = operator_zero_core::sim::run_e2e(happy);
        assert_eq!(
            committed, fresh,
            "{file} is stale — regenerate with `cargo run --example gen_artifacts`"
        );
    }
}

#[test]
fn the_committed_full_trace_reaches_complete_evidence_with_no_blockers() {
    let root = artifact_root();
    let t: Value = serde_json::from_str(
        &std::fs::read_to_string(root.join("traces/full-e2e-trace.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(t["evidence_status"], "evidence_complete");
    assert_eq!(t["complete"], true);
    assert!(t["blockers"].as_array().unwrap().is_empty());
    assert_eq!(t["reconciliation"]["status"], "reconciled");
}

#[test]
fn the_committed_negative_trace_produces_blockers() {
    let root = artifact_root();
    let t: Value = serde_json::from_str(
        &std::fs::read_to_string(root.join("traces/failed-e2e-trace.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(t["complete"], false);
    assert!(
        !t["blockers"].as_array().unwrap().is_empty(),
        "the negative scenario must produce blockers, or it proves nothing"
    );
}
