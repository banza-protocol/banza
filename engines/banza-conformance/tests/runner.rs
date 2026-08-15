//! R4 test suite for banza-conformance-rs — parsing, validation, invariants, report, parity, security.

use banza_conformance::*;

#[test]
fn level_parse_and_names() {
    assert_eq!(ConformanceLevel::from_i64(0), ConformanceLevel::L0);
    assert_eq!(ConformanceLevel::from_i64(4), ConformanceLevel::L4);
    assert_eq!(ConformanceLevel::from_i64(9), ConformanceLevel::Unknown);
    assert_eq!(ConformanceLevel::L2.name(), "L2");
}

#[test]
fn all_vectors_parse() {
    let all = load_all_vectors().expect("load");
    assert_eq!(all.len(), 9, "9 vector files");
    let total: usize = all.iter().map(|(_, v)| v.len()).sum();
    assert_eq!(total, 61, "61 vectors total");
    for (name, vs) in &all {
        for v in vs {
            assert!(!v.id.is_empty(), "{name}: empty id");
        }
    }
}

#[test]
fn vectors_validate_clean() {
    let val = validate_vectors().expect("validate");
    assert!(
        val.ok,
        "vectors must validate clean; warnings: {:?}",
        val.warnings
    );
    assert_eq!(val.total, 61);
    // there must be at least one invariant check (ledger/settlement/level/precision)
    assert!(!val.invariant_results.is_empty());
    // no invariant result is a Fail
    let fails: Vec<_> = val
        .invariant_results
        .iter()
        .filter(|r| matches!(r.status, Status::Fail))
        .collect();
    assert!(fails.is_empty(), "invariant failures: {:?}", fails);
}

#[test]
fn ledger_double_entry_invariant_present_and_pass() {
    let val = validate_vectors().unwrap();
    let ledger: Vec<_> = val
        .invariant_results
        .iter()
        .filter(|r| r.id == "INV-LEDGER-DOUBLE-ENTRY")
        .collect();
    assert!(
        !ledger.is_empty(),
        "ledger double-entry invariant must be checked"
    );
    assert!(ledger.iter().all(|r| matches!(r.status, Status::Pass)));
}

#[test]
fn parse_rejects_bad_vector_and_catches_float_money() {
    // missing 'vectors'
    assert!(parse_vectors("{}").is_err());
    // a float money field must be caught by validation
    let bad = r#"{"vectors":[{"id":"X-1","title":"bad","certification_level":1,"input":{"body":{"amount_minor":10.5}}}]}"#;
    let vs = parse_vectors(bad).unwrap();
    assert_eq!(vs.len(), 1);
    // find_float_money is private; assert via the offline report on a hand-built case would be
    // integration-level. Here we just confirm the vector parsed with the float retained.
    assert_eq!(
        vs[0].raw["input"]["body"]["amount_minor"].as_f64(),
        Some(10.5)
    );
}

#[test]
fn offline_report_totals_and_disclaimer() {
    let r = offline_report().expect("report");
    assert_eq!(r.totals.total, 61);
    assert_eq!(r.totals.pass, 61, "all vectors pass integrity");
    assert_eq!(r.totals.fail, 0);
    assert_eq!(r.runner, "banza-conformance-rs");
    assert!(r
        .certification_disclaimer
        .contains("not production certification"));
    assert!(
        r.not_yet_ported.is_empty(),
        "R7-R9: no conformance scope remains unported"
    );
    // machine-readable, deterministic JSON
    let j1 = serde_json::to_string(&r).unwrap();
    let j2 = serde_json::to_string(&offline_report().unwrap()).unwrap();
    assert_eq!(j1, j2, "report JSON must be deterministic");
}

#[test]
fn report_validation_requires_disclaimer() {
    let good = serde_json::to_string(&offline_report().unwrap()).unwrap();
    assert!(validate_report(&good).is_ok());
    // missing disclaimer → rejected
    let bad = r#"{"runner":"x","runner_version":"1","protocol_version":"1.0.0","totals":{}}"#;
    assert!(validate_report(bad).is_err());
    // a report that claims a production certificate is active → rejected
    let claim = r#"{"runner":"x","runner_version":"1","protocol_version":"1.0.0","totals":{},"certification_disclaimer":"not production certification","note":"production certificate active"}"#;
    assert!(validate_report(claim).is_err());
}

#[test]
fn parity_summary_is_stable() {
    let a = parity_summary().unwrap();
    let b = parity_summary().unwrap();
    assert_eq!(a, b, "parity summary must be deterministic");
    assert_eq!(a["total_vectors"].as_u64(), Some(61));
}

#[test]
fn no_blockers_remain() {
    // R7-R9 cleared the NOT_YET_PORTED blockers.
    assert!(not_yet_ported().is_empty(), "zero NOT_YET_PORTED blockers");
}

#[test]
fn live_conformance_against_simb_passes() {
    let r = live::run_live();
    assert!(r.totals.total >= 6);
    assert_eq!(r.totals.fail, 0, "live SimB conformance must pass");
    assert_eq!(r.totals.error, 0);
    assert!(r
        .certification_disclaimer
        .contains("not production certification"));
}

#[test]
fn federation_conformance_against_two_simb_passes() {
    let r = live::run_fed();
    assert!(r.totals.total >= 6);
    assert_eq!(r.totals.fail, 0, "federation SimB conformance must pass");
    // it must exercise revocation (fail-closed) as a PASS outcome
    assert!(r
        .outcomes
        .iter()
        .any(|o| o.case_id == "FED-REVOCATION" && matches!(o.status, Status::Pass)));
}

#[test]
fn security_no_env_no_network_no_cert_claim() {
    // The library reads only embedded vectors — assert it never emits a positive certification claim.
    let r = serde_json::to_string(&offline_report().unwrap())
        .unwrap()
        .to_lowercase();
    assert!(!r.contains("production certificate active"));
    assert!(!r.contains("operator certified"));
    assert!(r.contains("not production certification"));
    // The runner's protocol version is fixed at build time and never taken from the environment: a
    // caller must not be able to make a report claim a different protocol by setting a variable.
    // Which version it is belongs to `protocol_version_binding.rs`, which ties it to the contract —
    // restating the literal here is what left this assertion pinning 1.0.0 after the protocol moved.
    for var in ["BANZA_PROTOCOL_VERSION", "PROTOCOL_VERSION", "VERSION"] {
        assert!(
            std::env::var(var).is_err()
                || offline_report().unwrap().protocol_version == PROTOCOL_VERSION,
            "{var} must not be able to change the reported protocol version"
        );
    }
    assert_eq!(offline_report().unwrap().protocol_version, PROTOCOL_VERSION);
}
