//! Track C — the committed federation fixtures executed as vectors.
//!
//! Proves every fixture-backed case in `conformance/federation/suite.json` runs against the committed
//! `conformance/fixtures/federation/*.json`, produces its declared outcome, the fixture set has no drift,
//! and the run is deterministic.

use banza_conformance::federation_fixtures::run_fed_fixtures;
use serde_json::Value;

fn outcome<'a>(run: &'a Value, id: &str) -> &'a Value {
    run["report"]["outcomes"]
        .as_array()
        .unwrap()
        .iter()
        .find(|o| o["case_id"] == id)
        .unwrap_or_else(|| panic!("case {id} not executed"))
}

#[test]
fn every_fixture_backed_case_reaches_its_expected_outcome() {
    let run = run_fed_fixtures();
    let t = &run["report"]["totals"];
    assert_eq!(
        t["fail"], 0,
        "no fixture case may fail: {:?}",
        run["report"]["outcomes"]
    );
    assert_eq!(t["error"], 0, "no fixture case may error");
    assert_eq!(
        t["total"], 37,
        "all 37 fixture-backed cases must be executed"
    );
    assert_eq!(t["pass"], 37);
}

#[test]
fn fixture_set_has_no_drift() {
    let run = run_fed_fixtures();
    let drift = &run["drift"];
    assert_eq!(drift["clean"], true, "referenced-but-missing must be empty");
    assert_eq!(drift["referenced_but_missing"].as_array().unwrap().len(), 0);
    assert_eq!(
        drift["unreferenced_fixtures"].as_array().unwrap().len(),
        0,
        "every committed fixture must be referenced by a case (or the A/B set): {:?}",
        drift["unreferenced_fixtures"]
    );
}

#[test]
fn positive_and_negative_vectors_are_both_present() {
    let run = run_fed_fixtures();
    // positive
    assert_eq!(outcome(&run, "FED-SPM-001")["status"], "pass"); // valid SPM accepted
    assert_eq!(outcome(&run, "FED-DISC-001")["status"], "pass"); // valid manifest accepted
    assert_eq!(outcome(&run, "FED-TRUST-001")["status"], "pass"); // valid key manifest accepted
    assert_eq!(outcome(&run, "FED-ROUTE-001")["status"], "pass"); // valid routing accepted
                                                                  // negative (each maps to its expected_error)
    for id in [
        "FED-SPM-002",   // expired
        "FED-SPM-005",   // operator_id_mismatch
        "FED-SPM-006",   // insufficient_conformance_level
        "FED-SPM-007",   // routing capability missing
        "FED-SPM-009",   // operator revoked in BRL
        "FED-DISC-002",  // federation not supported
        "FED-DISC-004",  // capability mismatch
        "FED-DISC-008",  // missing conformance evidence
        "FED-TRUST-002", // missing issuer key
        "FED-TRUST-004", // peer in revocation list
        "FED-ROUTE-004", // wrong currency
        "FED-ROUTE-005", // wrong destination
        "FED-ROUTE-006", // zero amount
        "FED-ROUTE-007", // idempotency conflict
    ] {
        assert_eq!(
            outcome(&run, id)["status"],
            "pass",
            "negative case {id} must pass"
        );
    }
}

#[test]
fn signature_case_is_executed_via_real_crypto() {
    let run = run_fed_fixtures();
    // FED-SPM-003 cannot be verified from the placeholder-signature fixture; it is executed against
    // banza-trust with real keypairs and must be classified as crypto-delegated (not structural).
    assert_eq!(outcome(&run, "FED-SPM-003")["status"], "pass");
    let delegated = run["classification"]["crypto_delegated_to_banza_trust"]
        .as_array()
        .unwrap();
    assert!(delegated.iter().any(|x| x == "FED-SPM-003"));
}

#[test]
fn fund_movement_terminals_are_driven_by_the_engine() {
    let run = run_fed_fixtures();
    let simb = run["classification"]["execution_driven_by_banza_simb"]
        .as_array()
        .unwrap();
    // payment completion + idempotent replay are proven by actually driving the SimB engine
    assert!(simb.iter().any(|x| x == "FED-EXEC-001"));
    assert_eq!(outcome(&run, "FED-EXEC-001")["status"], "pass");
    assert_eq!(outcome(&run, "FED-ROUTE-008")["status"], "pass"); // transfer_initiated
    assert_eq!(outcome(&run, "FED-EXEC-007")["status"], "pass"); // source_debit_reversed
}

#[test]
fn the_run_is_deterministic() {
    let a = serde_json::to_string(&run_fed_fixtures()).unwrap();
    let b = serde_json::to_string(&run_fed_fixtures()).unwrap();
    assert_eq!(
        a, b,
        "the fixture run must be byte-identical across invocations"
    );
}
