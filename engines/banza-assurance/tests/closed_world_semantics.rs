//! The assurance engine proving its own semantics, in a sandbox of its own making.
//!
//! These tests do NOT use the repository as their baseline. That was the trap: with the milestone
//! incomplete, `assurance-check` is red, so every mutation of it is red too, and a red-under-mutation
//! result proves nothing. The engine's semantics can and must be proven independently — a synthetic
//! registry that is genuinely green, then one required thing removed at a time.
//!
//! What is proven here is the property the engine exists for: **absence of required evidence is never
//! PASS.** Not that BANZA is correct — that a system claiming BANZA is correct can tell when it does not
//! have enough evidence to say so.

use banza_assurance::*;
use std::fs;
use std::path::{Path, PathBuf};

/// A synthetic tree with one CRITICAL property whose every required stage is present and resolvable.
fn fixture() -> (PathBuf, serde_json::Value) {
    let root = std::env::temp_dir().join(format!(
        "banza-assurance-fixture-{}",
        std::process::id() as u64 + rand_suffix()
    ));
    let _ = fs::remove_dir_all(&root);
    for d in ["spec", "tests", "tools", "assurance", "docs"] {
        fs::create_dir_all(root.join(d)).unwrap();
    }
    fs::write(root.join("spec/rule.md"), "# The rule\nA MUST hold.\n").unwrap();
    fs::write(root.join("tests/t.rs"), "fn holds() {}\nfn rejects() {}\nfn attacked() {}\n").unwrap();
    fs::write(root.join("tools/guard.sh"), "#!/bin/sh\nexit 0\n").unwrap();
    fs::write(root.join("assurance/mutations.json"), "{\"mutations\":[{\"id\":\"m\"}]}").unwrap();
    // The AG-9 surfaces, each stating all four principles.
    for f in ["README.md", "docs/reference.md"] {
        fs::write(root.join(f), "BANZA R²S² — Robust · Resilient · Secure · Simple\n").unwrap();
    }
    // AG-10's conditions, all met.
    fs::write(
        root.join("assurance/release-readiness.json"),
        serde_json::json!({
            "all_applicable_gates_pass": true,
            "all_mandatory_guards_green": true,
            "clean_source_tree": true
        })
        .to_string(),
    )
    .unwrap();

    let registry = serde_json::json!({
        "properties": [{
            "property_id": "SYNTHETIC_CRITICAL",
            "r2s2_dimensions": ["Secure"],
            "domain": "test",
            "criticality": "CRITICAL",
            "scope": "GLOBAL",
            "normative_authority": ["spec/rule.md"],
            "wire_representation": "a field",
            "implementation": "tests/t.rs",
            "positive_evidence": ["tests/t.rs::holds"],
            "negative_evidence": ["tests/t.rs::rejects"],
            "adversarial_evidence": ["tests/t.rs::attacked"],
            "state_test": null,
            "resilience_test": null,
            "property_guard": "tools/guard.sh",
            "mutation_proof": "assurance/mutations.json#m",
            "clean_room_requirement": true,
            "public_claims": ["README.md"],
            "gate_status": "PASS"
        }],
        "gate_requirements": {
            "AG-9": {
                "mandatory_surfaces": ["README.md", "docs/reference.md"],
                "must_state_principles": ["README.md"]
            },
            "AG-10": {
                "required_conditions": ["all_applicable_gates_pass", "all_mandatory_guards_green", "clean_source_tree"],
                "conditions_report": "assurance/release-readiness.json"
            },
            "per_property_required_stages": {
                "CRITICAL": ["normative_authority", "positive_evidence", "negative_evidence",
                             "adversarial_evidence", "property_guard", "mutation_proof"],
                "REQUIRED": ["normative_authority", "positive_evidence", "property_guard"]
            }
        }
    });
    (root, registry)
}

fn rand_suffix() -> u64 {
    // Deterministic per test binary invocation is enough; the directory is removed either way.
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0)
}

fn run(root: &Path, registry: &serde_json::Value) -> Report {
    let reg: Registry = serde_json::from_value(registry.clone()).expect("registry parses");
    evaluate(root, &reg)
}

fn gate<'a>(r: &'a Report, g: &str) -> &'a str {
    r.gates.get(g).map(|s| s.as_str()).unwrap_or("MISSING")
}

/// The baseline must be genuinely green, or nothing below proves anything.
#[test]
fn the_synthetic_baseline_is_green() {
    let (root, reg) = fixture();
    let r = run(&root, &reg);
    assert!(r.findings.is_empty(), "baseline findings: {:?}", r.findings);
    assert!(r.properties[0].property_complete, "baseline property must be complete");
    assert!(r.properties[0].property_passed, "baseline property must pass");
    for g in ["AG-0", "AG-2", "AG-6", "AG-7", "AG-9", "AG-10"] {
        assert_eq!(gate(&r, g), "PASS", "baseline {g}");
    }
    assert!(r.ok, "the baseline run must be OK");
    let _ = fs::remove_dir_all(&root);
}

/// Remove one required stage. The property must not pass, and the gate that stage serves must not pass.
#[test]
fn a_missing_required_stage_never_passes() {
    for (stage, expected_gate) in [
        ("negative_evidence", "AG-2"),
        ("positive_evidence", "AG-2"),
        ("adversarial_evidence", "AG-6"),
        ("mutation_proof", "AG-7"),
        ("property_guard", "AG-7"),
        ("normative_authority", "AG-0"),
    ] {
        let (root, mut reg) = fixture();
        reg["properties"][0][stage] = serde_json::Value::Null;
        let r = run(&root, &reg);
        assert!(
            !r.properties[0].property_complete,
            "{stage} removed: the property must be INCOMPLETE"
        );
        assert_ne!(
            r.properties[0].status, "PASS",
            "{stage} removed: the property must not PASS"
        );
        assert_ne!(
            gate(&r, expected_gate),
            "PASS",
            "{stage} removed: {expected_gate} must not PASS"
        );
        assert!(!r.ok, "{stage} removed: the run must not be OK");
        let _ = fs::remove_dir_all(&root);
    }
}

/// An evidence pointer that names something which does not exist is not evidence.
#[test]
fn a_pointer_to_a_nonexistent_artifact_never_passes() {
    let (root, mut reg) = fixture();
    reg["properties"][0]["negative_evidence"] = serde_json::json!(["tests/does-not-exist.rs::rejects"]);
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-2"), "PASS", "a dangling pointer must not pass AG-2");
    assert!(!r.ok);
    let _ = fs::remove_dir_all(&root);

    // And a pointer to a real file naming a test that is not in it.
    let (root, mut reg) = fixture();
    reg["properties"][0]["negative_evidence"] = serde_json::json!(["tests/t.rs::renamed_away"]);
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-2"), "PASS", "a renamed test must not pass AG-2");
    let _ = fs::remove_dir_all(&root);
}

/// AG-9 must not pass by no longer looking.
#[test]
fn ag9_never_passes_by_requiring_nothing() {
    // A mandatory surface removed from disk.
    let (root, reg) = fixture();
    fs::remove_file(root.join("docs/reference.md")).unwrap();
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-9"), "PASS", "a missing mandatory surface must not pass");
    let _ = fs::remove_dir_all(&root);

    // A surface that exists but does not state the principles.
    let (root, reg) = fixture();
    fs::write(root.join("README.md"), "nothing about principles here\n").unwrap();
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-9"), "PASS", "an unreconciled surface must not pass");
    let _ = fs::remove_dir_all(&root);

    // The requirement list emptied — the easiest way to make a gate green.
    let (root, mut reg) = fixture();
    reg["gate_requirements"]["AG-9"]["mandatory_surfaces"] = serde_json::json!([]);
    reg["gate_requirements"]["AG-9"]["must_state_principles"] = serde_json::json!([]);
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-9"), "PASS", "a gate requiring nothing verifies nothing");
    let _ = fs::remove_dir_all(&root);
}

/// AG-10 must not pass without its conditions being reported by an actual run.
#[test]
fn ag10_never_passes_without_reported_conditions() {
    // The report absent entirely.
    let (root, reg) = fixture();
    fs::remove_file(root.join("assurance/release-readiness.json")).unwrap();
    let r = run(&root, &reg);
    assert_eq!(gate(&r, "AG-10"), "NOT_RUN", "an absent report is NOT_RUN, never PASS");
    let _ = fs::remove_dir_all(&root);

    // A condition reported false.
    let (root, reg) = fixture();
    fs::write(
        root.join("assurance/release-readiness.json"),
        serde_json::json!({
            "all_applicable_gates_pass": true,
            "all_mandatory_guards_green": false,
            "clean_source_tree": true
        })
        .to_string(),
    )
    .unwrap();
    let r = run(&root, &reg);
    assert_eq!(gate(&r, "AG-10"), "BLOCKED", "an unmet condition blocks the freeze");
    let _ = fs::remove_dir_all(&root);

    // A condition never reported at all — the silent-omission case.
    let (root, reg) = fixture();
    fs::write(
        root.join("assurance/release-readiness.json"),
        serde_json::json!({ "all_applicable_gates_pass": true }).to_string(),
    )
    .unwrap();
    let r = run(&root, &reg);
    assert_ne!(gate(&r, "AG-10"), "PASS", "an unreported condition must not pass");
    let _ = fs::remove_dir_all(&root);
}

/// An empty world is not a clean one: a gate with no property evaluated at it has verified nothing.
#[test]
fn a_gate_with_nothing_measured_never_passes() {
    let (root, mut reg) = fixture();
    reg["properties"] = serde_json::json!([]);
    let r = run(&root, &reg);
    for g in ["AG-0", "AG-2", "AG-3"] {
        assert_eq!(gate(&r, g), "NOT_RUN", "{g} with no properties must be NOT_RUN");
    }
    assert!(!r.ok, "a run measuring nothing must not be OK");
    let _ = fs::remove_dir_all(&root);
}

/// A higher gate never compensates for a lower one, and a downgrade never becomes an upgrade.
#[test]
fn a_gate_cannot_pass_while_a_gate_it_depends_on_has_not() {
    let (root, mut reg) = fixture();
    // Break AG-0 only. AG-3's own evidence stays intact.
    reg["properties"][0]["normative_authority"] = serde_json::json!(["spec/absent.md"]);
    let r = run(&root, &reg);
    assert_eq!(gate(&r, "AG-0"), "FAIL", "AG-0 fails on an unresolvable authority");
    assert_ne!(gate(&r, "AG-3"), "PASS", "AG-3 depends on AG-0 and must not pass");
    assert_ne!(gate(&r, "AG-10"), "PASS", "AG-10 depends on everything applicable");
    let _ = fs::remove_dir_all(&root);
}
