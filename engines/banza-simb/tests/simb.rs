//! R8 tests for banza-simb — the operator/federation simulator.

use banza_simb::*;

#[test]
fn transfer_creates_exactly_two_ledger_entries_double_entry() {
    let mut op = SimOperator::new("SIM-A");
    let r = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "k1");
    assert!(r.ok);
    assert_eq!(
        r.new_entries.len(),
        2,
        "double-entry: one DEBIT + one CREDIT"
    );
    let debit = r.new_entries.iter().find(|e| e.kind == "DEBIT").unwrap();
    let credit = r.new_entries.iter().find(|e| e.kind == "CREDIT").unwrap();
    assert_eq!(debit.amount_minor, 1000);
    assert_eq!(credit.amount_minor, 1000);
    assert_eq!(
        debit.trace_id, credit.trace_id,
        "INV-TRACE: shared trace_id"
    );
}

#[test]
fn idempotency_replay_creates_no_duplicate() {
    let mut op = SimOperator::new("SIM-A");
    let first = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "same");
    let replay = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "same");
    assert!(!first.idempotent_replay && replay.idempotent_replay);
    assert_eq!(first.transfer_id, replay.transfer_id);
    assert!(
        replay.new_entries.is_empty(),
        "replay must not post new entries"
    );
}

#[test]
fn no_negative_balance_and_positive_amounts() {
    let mut op = SimOperator::new("SIM-A");
    assert!(!op.create_transfer("sandbox-consumer-1", "x", -5, "neg").ok);
    assert!(
        !op.create_transfer("sandbox-merchant-1", "x", 100, "overdraw")
            .ok,
        "cannot overdraw a zero balance"
    );
}

#[test]
fn settlement_identity_net_plus_fee_equals_gross() {
    let mut op = SimOperator::new("SIM-A");
    op.create_transfer("sandbox-consumer-1", "sandbox-merchant-2", 100_000, "s1");
    let s = op.create_settlement("sandbox-merchant-2");
    assert_eq!(s.gross_minor, 100_000);
    assert_eq!(
        s.net_minor + s.fee_minor,
        s.gross_minor,
        "INV-SETTLE: net + fee == gross"
    );
    assert!(s.fee_minor > 0);
}

#[test]
fn federation_route_and_netting_deterministic() {
    let mut fed = Federation::new();
    let r = fed.route(5000, "f1");
    assert!(r.ok);
    let replay = fed.route(5000, "f1");
    assert!(replay.idempotent_replay);
    assert_eq!(fed.net_position(), 5000, "single obligation → net 5000");
    assert_eq!(fed.a.id, "SIM-A");
    assert_eq!(fed.b.id, "SIM-B");
}

#[test]
fn manifest_is_sandbox_and_not_production() {
    let op = SimOperator::new("SIM-A");
    let m = op.manifest();
    assert_eq!(m["environment"], "sandbox");
    assert_eq!(m["simulated"], true);
    assert_eq!(m["production_allowed"], false);
}
