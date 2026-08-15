//! The state-update path: what *accepting* does to trusted state, and what every other outcome does not.
//!
//! `classify_ordering` says where a candidate sits. It cannot, by itself, stop a caller from writing the
//! new digest anyway — and every dangerous resolution of a conflict (first arrival wins, last arrival
//! wins, lower digest wins, this source wins) lives in exactly that step. `observe` is that step, so the
//! property is tested where it is decided rather than modelled in a test.

use banza_trust::authority_set::{
    observe, set_digest, verify_genesis_set, Observation, TrustedSet,
};
use banza_trust::sign::TestKeypair;
use serde_json::{json, Value};

fn kp(name: &str) -> TestKeypair {
    TestKeypair::from_seed(name.as_bytes())
}

fn build_set(
    sequence: u64,
    members: &[(&str, &TestKeypair)],
    predecessor: Option<&Value>,
    signers: &[(&str, &TestKeypair)],
) -> Value {
    let mut set = json!({
        "schema_version": "1",
        "set_sequence": sequence,
        "predecessor_digest": match predecessor {
            Some(p) => Value::String(set_digest(p).unwrap()),
            None => Value::Null,
        },
        "threshold": 2,
        "authorities": members.iter().map(|(id, k)| json!({
            "authority_id": id,
            "public_key": format!("ed25519:{}", k.public_b64url),
            "active_since": "2026-01-01T00:00:00Z",
        })).collect::<Vec<_>>(),
        "issued_at": "2026-01-01T00:00:00Z",
        "expires_at": "2028-01-01T00:00:00Z",
        "predecessor_signatures": [],
    });
    let msg = banza_trust::canonical_bytes(&set, &["predecessor_signatures"]).unwrap();
    set["predecessor_signatures"] = Value::Array(
        signers
            .iter()
            .map(|(id, k)| json!({ "authority_id": id, "signature": k.sign_bytes(&msg) }))
            .collect(),
    );
    set
}

/// The scenario the gate exists for, end to end through the state-update path.
#[test]
fn an_equivocating_successor_never_replaces_trusted_state() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);

    // Trusted state established by PINNING, never by first sight.
    let pinned = set_digest(&genesis).unwrap();
    assert!(verify_genesis_set(&genesis, &pinned).verified);
    let state = TrustedSet::at_genesis(&genesis).unwrap();
    assert_eq!(state.sequence, 0);

    // N+1 with digest X, authorised by A+B → state becomes X.
    let x = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a), ("b", &b)],
    );
    let (state, outcome) = observe(&state, &genesis, &x);
    assert_eq!(outcome, Observation::Advanced);
    assert_eq!(state.sequence, 1);
    assert_eq!(state.digest, set_digest(&x).unwrap());

    // N+1 with digest Y ≠ X, itself validly authorised by A+C → equivocation, state stays X.
    let y = build_set(
        1,
        &[("a", &a), ("c", &c), ("e", &e)],
        Some(&genesis),
        &[("a", &a), ("c", &c)],
    );
    assert_ne!(set_digest(&x).unwrap(), set_digest(&y).unwrap());
    let before = state.clone();
    let (after, outcome) = observe(&state, &genesis, &y);
    assert_eq!(outcome, Observation::Equivocation);
    assert_eq!(
        after, before,
        "trusted state must be byte-identical after a conflict"
    );

    // Showing Y repeatedly does not wear the verifier down.
    let mut s = after;
    for _ in 0..10 {
        let (next, outcome) = observe(&s, &genesis, &y);
        assert_eq!(outcome, Observation::Equivocation);
        assert_eq!(next, before);
        s = next;
    }

    // And X itself is now a replay, not a second write.
    let (s2, outcome) = observe(&s, &genesis, &x);
    assert_eq!(outcome, Observation::Replay);
    assert_eq!(s2, before);
}

/// Order of arrival must not decide anything. Y-then-X reaches the same place as X-then-Y.
#[test]
fn neither_first_nor_last_arrival_wins() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let base = TrustedSet::at_genesis(&genesis).unwrap();

    let x = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a), ("b", &b)],
    );
    let y = build_set(
        1,
        &[("a", &a), ("c", &c), ("e", &e)],
        Some(&genesis),
        &[("a", &a), ("c", &c)],
    );

    // X first: state = X, then Y conflicts.
    let (sx, _) = observe(&base, &genesis, &x);
    let (sx2, ox) = observe(&sx, &genesis, &y);
    assert_eq!(ox, Observation::Equivocation);
    assert_eq!(sx2, sx);

    // Y first: state = Y, then X conflicts. Symmetric — whichever was accepted stays accepted, and the
    // other never displaces it. Nothing prefers a lower digest, a longer set, or a particular source.
    let (sy, _) = observe(&base, &genesis, &y);
    let (sy2, oy) = observe(&sy, &genesis, &x);
    assert_eq!(oy, Observation::Equivocation);
    assert_eq!(sy2, sy);

    assert_ne!(
        sx.digest, sy.digest,
        "the two orders genuinely land on different states"
    );
}

/// Persisting two fields and restoring them must reproduce the same decisions.
#[test]
fn the_state_survives_a_restart() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let x = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a), ("b", &b)],
    );
    let (state, _) = observe(&TrustedSet::at_genesis(&genesis).unwrap(), &genesis, &x);

    // Persist → restore.
    let restored = TrustedSet {
        sequence: state.sequence,
        digest: state.digest.clone(),
    };
    assert_eq!(restored, state);

    // The conflict is still a conflict after the restart, and the state still does not move.
    let y = build_set(
        1,
        &[("a", &a), ("c", &c), ("e", &e)],
        Some(&genesis),
        &[("a", &a), ("c", &c)],
    );
    let (after, outcome) = observe(&restored, &genesis, &y);
    assert_eq!(outcome, Observation::Equivocation);
    assert_eq!(after, restored);

    // The superseded genesis is still a rollback.
    let (after, outcome) = observe(&restored, &genesis, &genesis);
    assert_eq!(outcome, Observation::Rollback);
    assert_eq!(after, restored);

    // And the lineage still advances when it legitimately should.
    let z = build_set(
        2,
        &[("a", &a), ("b", &b), ("e", &e)],
        Some(&x),
        &[("a", &a), ("d", &d)],
    );
    let (advanced, outcome) = observe(&restored, &x, &z);
    assert_eq!(outcome, Observation::Advanced);
    assert_eq!(advanced.sequence, 2);
}

/// Position alone never advances state: the candidate must also be authorised by the trusted set.
#[test]
fn an_unauthorised_successor_at_the_right_position_does_not_advance() {
    let (a, b, c, x, y, z) = (kp("a"), kp("b"), kp("c"), kp("x"), kp("y"), kp("z"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let state = TrustedSet::at_genesis(&genesis).unwrap();

    // A rogue set at the next position, signed by its own keys.
    let rogue = build_set(
        1,
        &[("x", &x), ("y", &y), ("z", &z)],
        Some(&genesis),
        &[("x", &x), ("y", &y)],
    );
    let (after, outcome) = observe(&state, &genesis, &rogue);
    assert!(matches!(outcome, Observation::Rejected(_)));
    assert_eq!(after, state);

    // One signature from a genuine authority is still not the threshold.
    let thin = build_set(
        1,
        &[("a", &a), ("b", &b), ("x", &x)],
        Some(&genesis),
        &[("a", &a)],
    );
    let (after, outcome) = observe(&state, &genesis, &thin);
    assert!(matches!(outcome, Observation::Rejected(_)));
    assert_eq!(after, state);
}

/// The active set handed in must be the one the trusted state was established at — otherwise a caller
/// could authorise a successor against a set it merely happens to be holding.
#[test]
fn the_active_set_must_match_the_trusted_state() {
    let (a, b, c, d, x, y, z) = (
        kp("a"),
        kp("b"),
        kp("c"),
        kp("d"),
        kp("x"),
        kp("y"),
        kp("z"),
    );
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let unrelated = build_set(0, &[("x", &x), ("y", &y), ("z", &z)], None, &[]);
    let state = TrustedSet::at_genesis(&genesis).unwrap();

    let candidate = build_set(
        1,
        &[("x", &x), ("y", &y), ("d", &d)],
        Some(&unrelated),
        &[("x", &x), ("y", &y)],
    );
    let (after, outcome) = observe(&state, &unrelated, &candidate);
    assert!(matches!(outcome, Observation::Rejected(_)));
    assert_eq!(after, state);
}
