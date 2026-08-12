//! Track D — the consolidated A→B multi-operator scenario, executed end-to-end with independent replay.

use banza_conformance::federation_ab::run_ab_scenario;

#[test]
fn the_ab_scenario_passes_end_to_end() {
    let out = run_ab_scenario();
    assert_eq!(out["pass"], true, "scenario report: {out:#}");
}

#[test]
fn the_two_operators_use_distinct_crypto_keys() {
    let out = run_ab_scenario();
    let r = &out["result"];
    assert_eq!(r["operators_distinct"], true);
    assert_ne!(
        r["a_delegated_public_key"], r["b_delegated_public_key"],
        "A and B must hold different delegated signing keys"
    );
}

#[test]
fn mutual_trust_is_routing_allowed_both_directions() {
    let out = run_ab_scenario();
    let m = &out["result"]["mutual_ote"];
    assert_eq!(m["a_evaluates_b"], "ROUTING_ALLOWED");
    assert_eq!(m["b_evaluates_a"], "ROUTING_ALLOWED");
}

#[test]
fn the_routed_payment_executes_atomically_and_replays_idempotently() {
    let out = run_ab_scenario();
    let e = &out["result"]["execution"];
    assert_eq!(e["routed_ok"], true);
    assert_eq!(
        e["replay_idempotent"], true,
        "a replay must not double-spend"
    );
    assert_eq!(e["net_position_minor"], 50000);
}

#[test]
fn every_negative_scenario_fails_closed() {
    let out = run_ab_scenario();
    let n = &out["result"]["negatives"];
    assert_eq!(n["revoked_peer_outcome"], "FAIL_CLOSED");
    assert_eq!(n["capability_mismatch_outcome"], "FAIL_CLOSED");
    assert_eq!(n["tampered_metadata_outcome"], "FAIL_CLOSED");
    assert_eq!(n["all_fail_closed"], true);
}

#[test]
fn the_scenario_is_independently_reproducible() {
    let out = run_ab_scenario();
    assert_eq!(out["replay"]["byte_identical"], true);
    assert_eq!(out["replay"]["runs"], 2);
    let digest = out["replay"]["result_sha256"].as_str().unwrap();
    assert_eq!(digest.len(), 64, "a SHA-256 an independent party can match");
    // stability across separate top-level invocations, too
    let again = run_ab_scenario();
    assert_eq!(
        digest,
        again["replay"]["result_sha256"].as_str().unwrap(),
        "the scenario digest must be stable across invocations (E6 reproducibility)"
    );
}
