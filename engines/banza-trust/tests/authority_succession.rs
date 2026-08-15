//! The Root Authority Set lineage, tested as behaviour.
//!
//! v1.0.0 asserted seat continuity in an invariant (INV-ROOT-009) that nothing implemented, and its
//! ceremony validator accepted any set that signed itself. These tests pin the property that closes
//! both gaps: a set is trusted only when the threshold of the previously trusted set authorised it.
//!
//! The reject cases carry the weight. `a_self_signed_set_authorises_nothing` is the one that would have
//! caught the original defect, and `removed_authority_is_never_required` is the one that keeps the
//! recovery path at 2-of-3 instead of silently becoming 3-of-3.

use banza_trust::authority_set::{
    classify_ordering, continuity_available, set_digest, verify_genesis_set,
    verify_key_manifest_under_set, verify_successor_set, Ordering, AUTHORITY_COUNT, THRESHOLD,
};
use banza_trust::sign::TestKeypair;
use serde_json::{json, Value};

fn kp(name: &str) -> TestKeypair {
    TestKeypair::from_seed(name.as_bytes())
}

/// Build a set at `sequence` over the given authorities, signed by `signers` — whose keys must belong
/// to `signing_set` (the predecessor), never to the document itself.
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

fn genesis(members: &[(&str, &TestKeypair)]) -> Value {
    build_set(0, members, None, &[])
}

// ── the model ────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn the_model_is_three_authorities_threshold_two() {
    assert_eq!(AUTHORITY_COUNT, 3);
    assert_eq!(THRESHOLD, 2);
}

// ── genesis ──────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn genesis_is_accepted_only_against_the_pinned_digest() {
    let (a, b, c) = (kp("alpha"), kp("beta"), kp("gamma"));
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let pinned = set_digest(&g).unwrap();

    assert!(
        verify_genesis_set(&g, &pinned).verified,
        "the pinned genesis set is accepted"
    );

    // A different genesis set, equally well-formed, is not the pinned one.
    let (x, y, z) = (kp("x"), kp("y"), kp("z"));
    let other = genesis(&[("x", &x), ("y", &y), ("z", &z)]);
    assert!(
        !verify_genesis_set(&other, &pinned).verified,
        "a genesis set that is not the pinned one must be rejected"
    );
}

#[test]
fn trust_on_first_use_is_refused() {
    let (a, b, c) = (kp("alpha"), kp("beta"), kp("gamma"));
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    // No pinned digest at all: an unpinned root is not a root, it is whatever arrived first.
    assert!(!verify_genesis_set(&g, "").verified, "TOFU must be refused");
    assert!(!verify_genesis_set(&g, "   ").verified);
}

// ── the defect this design exists to remove ──────────────────────────────────────────────────────────

#[test]
fn a_self_signed_set_authorises_nothing() {
    let (a, b, c) = (kp("alpha"), kp("beta"), kp("gamma"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);

    // An unrelated set, signed by two of ITS OWN keys — exactly what v1.0.0's ceremony validator
    // accepted. It proves those keys agree with each other, which anyone can arrange.
    let (x, y, z) = (kp("x"), kp("y"), kp("z"));
    let mut rogue = build_set(1, &[("x", &x), ("y", &y), ("z", &z)], Some(&active), &[]);
    let msg = banza_trust::canonical_bytes(&rogue, &["predecessor_signatures"]).unwrap();
    rogue["predecessor_signatures"] = json!([
        { "authority_id": "x", "signature": x.sign_bytes(&msg) },
        { "authority_id": "y", "signature": y.sign_bytes(&msg) },
    ]);

    let r = verify_successor_set(&rogue, &active);
    assert!(
        !r.verified,
        "a set signed only by its own authorities must be rejected: {}",
        r.detail
    );
}

// ── succession: every authority replaceable by the surviving pair ────────────────────────────────────

#[test]
fn any_authority_is_replaced_by_the_surviving_two() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);

    // replace C, authorised by A+B
    let s1 = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("beta", &b)],
    );
    assert!(
        verify_successor_set(&s1, &active).verified,
        "A+B must be able to replace C"
    );

    // replace B, authorised by A+C
    let s2 = build_set(
        1,
        &[("alpha", &a), ("gamma", &c), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("gamma", &c)],
    );
    assert!(
        verify_successor_set(&s2, &active).verified,
        "A+C must be able to replace B"
    );

    // replace A, authorised by B+C
    let s3 = build_set(
        1,
        &[("beta", &b), ("gamma", &c), ("delta", &d)],
        Some(&active),
        &[("beta", &b), ("gamma", &c)],
    );
    assert!(
        verify_successor_set(&s3, &active).verified,
        "B+C must be able to replace A"
    );
}

#[test]
fn removed_authority_is_never_required() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);

    // Each replacement is authorised WITHOUT any signature from the authority being removed. If any of
    // these needed the removed authority, the recovery path would be 3-of-3 and an obstructive or
    // compromised authority would hold a veto over its own replacement.
    for (removed, incoming, signers) in [
        ("gamma", ("delta", &d), vec![("alpha", &a), ("beta", &b)]),
        ("beta", ("delta", &d), vec![("alpha", &a), ("gamma", &c)]),
        ("alpha", ("delta", &d), vec![("beta", &b), ("gamma", &c)]),
    ] {
        let members: Vec<(&str, &TestKeypair)> = [("alpha", &a), ("beta", &b), ("gamma", &c)]
            .into_iter()
            .filter(|(id, _)| *id != removed)
            .chain(std::iter::once(incoming))
            .collect();
        let s = build_set(1, &members, Some(&active), &signers);
        let r = verify_successor_set(&s, &active);
        assert!(
            r.verified,
            "replacing {removed} without its signature must succeed: {}",
            r.detail
        );
        assert!(
            !s["predecessor_signatures"]
                .as_array()
                .unwrap()
                .iter()
                .any(|x| x["authority_id"] == removed),
            "the removed authority must not have signed"
        );
    }
}

// ── threshold arithmetic ─────────────────────────────────────────────────────────────────────────────

#[test]
fn one_authority_is_never_enough() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&active),
        &[("alpha", &a)],
    );
    assert!(
        !verify_successor_set(&s, &active).verified,
        "one signature must not authorise a successor"
    );
}

#[test]
fn a_duplicate_signer_counts_once() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    // One custodian, signing twice, presented as two approvals.
    let s = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("alpha", &a)],
    );
    let r = verify_successor_set(&s, &active);
    assert!(
        !r.verified,
        "one authority signing twice is one approval: {}",
        r.detail
    );
}

#[test]
fn an_unknown_signer_contributes_nothing() {
    let (a, b, c, d, stranger) = (
        kp("alpha"),
        kp("beta"),
        kp("gamma"),
        kp("delta"),
        kp("stranger"),
    );
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("stranger", &stranger)],
    );
    assert!(
        !verify_successor_set(&s, &active).verified,
        "an id outside the predecessor set adds nothing"
    );
}

#[test]
fn two_authorities_may_not_share_a_key() {
    let (a, b, c) = (kp("alpha"), kp("beta"), kp("gamma"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    // "delta" is alpha wearing a second label — one custodian would then hold two of three seats.
    let s = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &a)],
        Some(&active),
        &[("alpha", &a), ("beta", &b)],
    );
    assert!(
        !verify_successor_set(&s, &active).verified,
        "one key may not occupy two seats"
    );
}

#[test]
fn the_set_must_carry_exactly_three_authorities() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let four = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("gamma", &c), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("beta", &b)],
    );
    assert!(
        !verify_successor_set(&four, &active).verified,
        "four authorities is a different model"
    );
}

// ── lineage ──────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn a_successor_must_name_its_actual_predecessor() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let mut s = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&active),
        &[("alpha", &a), ("beta", &b)],
    );
    s["predecessor_digest"] = json!("0".repeat(64));
    assert!(
        !verify_successor_set(&s, &active).verified,
        "a wrong predecessor digest must reject"
    );
}

#[test]
fn sequence_must_advance_by_exactly_one() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    for seq in [0u64, 2, 7] {
        let s = build_set(
            seq,
            &[("alpha", &a), ("beta", &b), ("delta", &d)],
            Some(&active),
            &[("alpha", &a), ("beta", &b)],
        );
        assert!(
            !verify_successor_set(&s, &active).verified,
            "sequence {seq} must reject"
        );
    }
}

#[test]
fn the_chain_extends_across_several_successions() {
    let (a, b, c, d, e) = (
        kp("alpha"),
        kp("beta"),
        kp("gamma"),
        kp("delta"),
        kp("epsilon"),
    );
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s1 = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&g),
        &[("alpha", &a), ("beta", &b)],
    );
    assert!(verify_successor_set(&s1, &g).verified);
    // set 2 is authorised by set 1 — including by D, which set 1 introduced
    let s2 = build_set(
        2,
        &[("beta", &b), ("delta", &d), ("epsilon", &e)],
        Some(&s1),
        &[("beta", &b), ("delta", &d)],
    );
    assert!(
        verify_successor_set(&s2, &s1).verified,
        "an incoming authority may authorise the next set"
    );
    // and the removed authority from step 1 cannot authorise against set 1
    let bad = build_set(
        2,
        &[("beta", &b), ("delta", &d), ("epsilon", &e)],
        Some(&s1),
        &[("gamma", &c), ("beta", &b)],
    );
    let r = verify_successor_set(&bad, &s1);
    assert!(
        !r.verified,
        "an authority removed at step 1 must no longer count: {}",
        r.detail
    );
}

// ── rollback and equivocation ────────────────────────────────────────────────────────────────────────

#[test]
fn rollback_to_a_superseded_set_is_rejected() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s1 = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&g),
        &[("alpha", &a), ("beta", &b)],
    );
    let d1 = set_digest(&s1).unwrap();
    // The old set is re-served after the successor is active.
    assert_eq!(classify_ordering(&g, 1, &d1).unwrap(), Ordering::Rollback);
}

#[test]
fn same_marker_same_content_is_a_replay_and_different_content_is_equivocation() {
    let (a, b, c, d, e) = (
        kp("alpha"),
        kp("beta"),
        kp("gamma"),
        kp("delta"),
        kp("epsilon"),
    );
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s1 = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&g),
        &[("alpha", &a), ("beta", &b)],
    );
    let d1 = set_digest(&s1).unwrap();

    assert_eq!(classify_ordering(&s1, 1, &d1).unwrap(), Ordering::Replay);

    // One lineage publishing two different sets at the same position.
    let other = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("epsilon", &e)],
        Some(&g),
        &[("alpha", &a), ("beta", &b)],
    );
    assert_eq!(
        classify_ordering(&other, 1, &d1).unwrap(),
        Ordering::Equivocation
    );
}

// ── the Key Manifest under the active set ────────────────────────────────────────────────────────────

fn manifest_signed_by(active: &Value, signers: &[(&str, &TestKeypair)]) -> Value {
    let mut m = json!({
        "manifest_version": "2",
        "protocol_version": "1.0.0",
        "root_authority_set": {
            "set_sequence": active["set_sequence"].clone(),
            "digest": set_digest(active).unwrap(),
        },
        "keys": [],
        "hash": "0".repeat(64),
        "not_before": "2026-01-01T00:00:00Z",
        "not_after": "2027-01-01T00:00:00Z",
        "root_signatures": [],
    });
    let msg = banza_trust::canonical_bytes(&m, &["root_signatures"]).unwrap();
    m["root_signatures"] = Value::Array(
        signers
            .iter()
            .map(|(id, k)| json!({ "authority_id": id, "signature": k.sign_bytes(&msg) }))
            .collect(),
    );
    m
}

#[test]
fn the_key_manifest_needs_two_distinct_active_authorities() {
    let (a, b, c) = (kp("alpha"), kp("beta"), kp("gamma"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);

    let ok = manifest_signed_by(&active, &[("alpha", &a), ("beta", &b)]);
    assert!(verify_key_manifest_under_set(&ok, &active).verified);

    let one = manifest_signed_by(&active, &[("alpha", &a)]);
    assert!(
        !verify_key_manifest_under_set(&one, &active).verified,
        "one authority may not delegate alone"
    );

    let dup = manifest_signed_by(&active, &[("alpha", &a), ("alpha", &a)]);
    assert!(
        !verify_key_manifest_under_set(&dup, &active).verified,
        "a duplicate signer counts once"
    );
}

#[test]
fn a_manifest_naming_a_stale_set_is_rejected() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let g = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    let s1 = build_set(
        1,
        &[("alpha", &a), ("beta", &b), ("delta", &d)],
        Some(&g),
        &[("alpha", &a), ("beta", &b)],
    );
    // signed correctly, but under the superseded set
    let stale = manifest_signed_by(&g, &[("alpha", &a), ("beta", &b)]);
    assert!(
        !verify_key_manifest_under_set(&stale, &s1).verified,
        "a manifest authorised by a superseded set must be rejected"
    );
}

// ── loss of quorum ───────────────────────────────────────────────────────────────────────────────────

#[test]
fn losing_two_authorities_blocks_continuity_with_no_bypass() {
    assert!(continuity_available(3));
    assert!(continuity_available(2));
    // One surviving authority cannot reach the threshold, and there is deliberately no other path:
    // an emergency key or override would be a one-party route to the maximum authority.
    assert!(
        !continuity_available(1),
        "one authority must not be able to continue the lineage"
    );
    assert!(!continuity_available(0));
}

#[test]
fn a_single_surviving_authority_cannot_authorise_a_successor() {
    let (a, b, c, d) = (kp("alpha"), kp("beta"), kp("gamma"), kp("delta"));
    let active = genesis(&[("alpha", &a), ("beta", &b), ("gamma", &c)]);
    // B and C are gone; A tries every shape it can produce alone.
    for signers in [vec![("alpha", &a)], vec![("alpha", &a), ("alpha", &a)]] {
        let s = build_set(
            1,
            &[("alpha", &a), ("delta", &d), ("beta", &b)],
            Some(&active),
            &signers,
        );
        assert!(
            !verify_successor_set(&s, &active).verified,
            "no unilateral recovery"
        );
    }
}

// ── the authority label is not an organisation ───────────────────────────────────────────────────────

#[test]
fn authority_identity_is_cryptographic_not_institutional() {
    // The same lineage works with arbitrary labels: nothing in validation reads an organisation name,
    // so replacing one institutional holder with another is a ceremony, not a protocol change.
    let (p, q, r, s) = (kp("p"), kp("q"), kp("r"), kp("s"));
    let g = genesis(&[
        ("authority-one", &p),
        ("authority-two", &q),
        ("authority-three", &r),
    ]);
    let next = build_set(
        1,
        &[
            ("authority-one", &p),
            ("authority-two", &q),
            ("authority-four", &s),
        ],
        Some(&g),
        &[("authority-one", &p), ("authority-two", &q)],
    );
    assert!(verify_successor_set(&next, &g).verified);
}
