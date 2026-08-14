//! Integration tests for the Rust-first policy guard (ADR-043).

use rust_rule_guard::{allowlist_covers, classify, ext_of, normalize_path, Verdict};
use std::collections::BTreeSet;
use std::fs;

fn fixture(name: &str) -> String {
    fs::read_to_string(format!(
        "{}/tests/fixtures/{}",
        env!("CARGO_MANIFEST_DIR"),
        name
    ))
    .unwrap_or_else(|e| panic!("read fixture {name}: {e}"))
}

fn allow_with(paths: &[&str]) -> BTreeSet<String> {
    paths.iter().map(|p| normalize_path(p)).collect()
}

#[test]
fn ui_tsx_is_allowed_even_when_referencing_engine() {
    let allow = allow_with(&[]);
    let r = classify(
        "website/components/banzai/Chat.tsx",
        &fixture("ui_component.tsx"),
        &allow,
    );
    assert_eq!(r.verdict, Verdict::UiAllowed, "tsx UI must be allowed");
}

#[test]
fn policy_guard_scripts_naming_engines_are_allowed() {
    let allow = allow_with(&[]);
    // A tools/check-*.sh guard references an engine by name (marker) to DETECT it — allowed.
    let r = classify(
        "tools/check-banzai-public-interface.sh",
        "KB=website/components/home/banzaiKb.ts\ngrep evidence_bundle \"$KB\"\n",
        &allow,
    );
    assert!(
        !r.verdict.is_blocked(),
        "policy guard script wrongly blocked: {:?}",
        r.verdict
    );
    // But a real non-Rust engine shell script elsewhere (not a check-*.sh guard) is still blocked.
    let r2 = classify("tools/sign.sh", "sign_canonical with ed25519\n", &allow);
    assert!(
        r2.verdict.is_blocked(),
        "a real non-Rust shell engine must still be blocked"
    );
}

#[test]
fn new_ts_engine_is_blocked() {
    let allow = allow_with(&[]);
    let r = classify(
        "website/components/home/newSearch.ts",
        &fixture("new_ts_engine.ts"),
        &allow,
    );
    assert_eq!(
        r.verdict,
        Verdict::BlockedNewEngine,
        "new .ts engine must be blocked"
    );
    assert!(r
        .markers
        .iter()
        .any(|m| m.contains("tokenize") || m.contains("scoreentry")));
}

#[test]
fn new_python_engine_is_blocked() {
    let allow = allow_with(&[]);
    let r = classify("tools/new_crypto.py", &fixture("new_py_engine.py"), &allow);
    assert_eq!(
        r.verdict,
        Verdict::BlockedNewEngine,
        "new .py crypto engine must be blocked"
    );
    assert!(r.markers.iter().any(|m| m == "ed25519"));
}

#[test]
fn shell_wrapper_is_allowed() {
    let allow = allow_with(&[]);
    let r = classify("tools/run.sh", &fixture("shell_wrapper.sh"), &allow);
    assert_eq!(
        r.verdict,
        Verdict::NotEngine,
        "shell that only invokes a binary is allowed"
    );
}

#[test]
fn shell_inline_crypto_is_blocked() {
    let allow = allow_with(&[]);
    let r = classify("tools/sign.sh", &fixture("shell_algorithm.sh"), &allow);
    assert_eq!(
        r.verdict,
        Verdict::BlockedNewEngine,
        "shell with inline openssl signing must be blocked"
    );
    assert!(r.markers.iter().any(|m| m == "openssl dgst"));
}

#[test]
fn legacy_allowlisted_engine_is_allowed_but_pending() {
    let path = "website/components/home/banzaiKb.ts";
    let allow = allow_with(&[path]);
    let r = classify(path, &fixture("legacy_engine.ts"), &allow);
    assert_eq!(
        r.verdict,
        Verdict::LegacyAllowlisted,
        "allowlisted legacy engine is allowed (pending)"
    );
}

#[test]
fn plain_data_with_domain_words_is_not_flagged() {
    let allow = allow_with(&[]);
    let r = classify(
        "website/lib/decisions.ts",
        &fixture("plain_data.ts"),
        &allow,
    );
    assert_eq!(
        r.verdict,
        Verdict::NotEngine,
        "data mentioning domain words must not be an engine"
    );
    assert!(r.markers.is_empty(), "no strong markers expected in data");
}

#[test]
fn non_allowlisted_engine_path_is_blocked() {
    // Same engine content, but NOT in the allowlist → blocked.
    let allow = allow_with(&["some/other/path.ts"]);
    let r = classify(
        "website/components/home/banzaiKb.ts",
        &fixture("legacy_engine.ts"),
        &allow,
    );
    assert_eq!(r.verdict, Verdict::BlockedNewEngine);
}

#[test]
fn rust_wrapper_only_marker_is_allowed_without_allowlist() {
    // R6: a thin wrapper carrying the RUST_WRAPPER_ONLY marker passes even with engine markers,
    // and without any allowlist entry.
    let allow = allow_with(&[]);
    let r = classify(
        "services/banzai-api/src/knowledge.js",
        &fixture("wrapper_marked.js"),
        &allow,
    );
    assert_eq!(r.verdict, Verdict::WrapperMarked);
}

#[test]
fn test_file_exercising_engine_is_allowed_without_allowlist() {
    // R10: a `*.test.js` that names an engine symbol is a test, not an engine — allowed with no
    // allowlist entry, and reported as TestAllowed (not pending migration).
    let allow = allow_with(&[]);
    let r = classify(
        "services/banzai-api/test/pipeline.test.js",
        &fixture("legacy_engine.ts"),
        &allow,
    );
    assert_eq!(r.verdict, Verdict::TestAllowed);
}

#[test]
fn non_test_engine_file_is_still_blocked() {
    // The test exemption must not leak to non-test files with the same content.
    let allow = allow_with(&[]);
    let r = classify(
        "services/banzai-api/src/pipeline.js",
        &fixture("legacy_engine.ts"),
        &allow,
    );
    assert_eq!(r.verdict, Verdict::BlockedNewEngine);
}

#[test]
fn allowlist_glob_and_prefix_matching() {
    let allow = allow_with(&["src/api/src/__tests__/*.test.ts", "engines/legacy/**"]);
    assert!(allowlist_covers(
        &allow,
        "src/api/src/__tests__/router.test.ts"
    ));
    assert!(allowlist_covers(&allow, "engines/legacy/deep/mod.ts"));
    assert!(!allowlist_covers(&allow, "src/api/src/tools/router.ts"));
}

#[test]
fn path_and_ext_helpers() {
    assert_eq!(normalize_path("./a/b.ts"), "a/b.ts");
    assert_eq!(ext_of("a/b.MJS"), "mjs");
}

#[test]
fn r9_python_conformance_or_signer_is_blocked() {
    let allow = allow_with(&[]);
    let r = classify(
        "tools/new_conf.py",
        &fixture("new_py_conformance.py"),
        &allow,
    );
    assert_eq!(
        r.verdict,
        Verdict::BlockedNewEngine,
        "new Python conformance/signer must be blocked"
    );
    assert!(r
        .markers
        .iter()
        .any(|m| m == "sign_certificate" || m == "run_federation"));
}
