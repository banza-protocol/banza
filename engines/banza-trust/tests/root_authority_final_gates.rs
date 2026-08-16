//! The mandatory pre-freeze gates for the BANZA v1.0.0 Root Authority model.
//!
//! `authority_succession.rs` establishes the lineage as behaviour. This file is the gate that must pass
//! before the architecture is frozen for external implementation, and it deliberately tests the
//! scenarios where a *plausible* implementation goes wrong rather than the ones where an obviously
//! broken one does:
//!
//!   * two successors that are each individually valid, published at the same position (§109)
//!   * a Key Manifest presented to a set that has already moved on (§110)
//!   * an authority that keeps trying after it was removed (§16, §111)
//!   * a lineage that survives a verifier restart (§88)
//!   * hostile and out-of-domain input (§13, §86)
//!
//! None of these is caught by "does a valid set validate?". Each is caught here.

use banza_trust::authority_set::{
    classify_ordering, continuity_available, set_digest, verify_key_manifest_under_set,
    verify_successor_set, Ordering, THRESHOLD,
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

fn manifest_signed_by(set: &Value, signers: &[(&str, &TestKeypair)]) -> Value {
    let mut m = json!({
        "manifest_version": "1",
        "protocol_version": "1.0.0",
        "root_authority_set": {
            "set_sequence": set["set_sequence"].clone(),
            "digest": set_digest(set).unwrap()
        },
        "keys": [],
        "marker": "TEST ONLY",
        "root_signatures": []
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

/// The verifier's carried state for one lineage: the highest sequence it has accepted and the digest it
/// accepted there. Nothing else is retained, which is what makes a restart expressible as a test.
struct Observed {
    sequence: u64,
    digest: String,
}

impl Observed {
    fn of(set: &Value) -> Self {
        Observed {
            sequence: set["set_sequence"].as_u64().unwrap(),
            digest: set_digest(set).unwrap(),
        }
    }
    fn classify(&self, candidate: &Value) -> Ordering {
        classify_ordering(candidate, self.sequence, &self.digest).unwrap()
    }
}

// ── §109 — successor equivocation ────────────────────────────────────────────────────────────────────

/// Two successors, each individually authorised by the predecessor threshold, published at the same
/// position with different content.
///
/// This is the scenario a threshold alone does not defend against: both documents are well-formed, both
/// carry two valid signatures from genuinely current authorities, and both name the correct predecessor.
/// An implementation that verifies each candidate in isolation accepts whichever it happened to fetch,
/// and two verifiers that fetched differently diverge permanently while both believe they are correct.
#[test]
fn two_valid_successors_at_the_same_position_are_a_conflict_not_a_race() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);

    // S1: C replaced by D, authorised by A+B.
    let s1 = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );
    // S2: B replaced by E, authorised by A+C. Same predecessor, same sequence.
    let s2 = build_set(
        1,
        &[("a", &a), ("c", &c), ("e", &e)],
        Some(&n),
        &[("a", &a), ("c", &c)],
    );

    // Each is individually authorised — that is precisely why the conflict is dangerous.
    assert!(
        verify_successor_set(&s1, &n).verified,
        "S1 must be individually valid"
    );
    assert!(
        verify_successor_set(&s2, &n).verified,
        "S2 must be individually valid"
    );
    assert_ne!(
        set_digest(&s1).unwrap(),
        set_digest(&s2).unwrap(),
        "the two successors must genuinely differ"
    );

    // A verifier that accepted S1 and is then shown S2 must not switch, and must not silently pick.
    let state = Observed::of(&s1);
    assert_eq!(
        state.classify(&s2),
        Ordering::Equivocation,
        "same position, different content → equivocation"
    );

    // Symmetric: whichever arrived first, the other is the conflict. The outcome must not depend on
    // fetch order, which is what "no first-arrival-wins" means (§19).
    let mirrored = Observed::of(&s2);
    assert_eq!(mirrored.classify(&s1), Ordering::Equivocation);

    // And the trusted state is unchanged by observing the conflict: `classify_ordering` reports, it
    // does not mutate, so there is nowhere for a silent switch to happen.
    assert_eq!(state.sequence, 1);
    assert_eq!(state.digest, set_digest(&s1).unwrap());
}

/// The same successor observed twice is idempotent, not a conflict. Without this, an ordinary re-fetch
/// would fail closed and the lineage could never be re-observed.
#[test]
fn the_same_successor_observed_again_is_a_replay() {
    let (a, b, c, d) = (kp("a"), kp("b"), kp("c"), kp("d"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let s1 = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );
    let state = Observed::of(&s1);
    assert_eq!(state.classify(&s1), Ordering::Replay);

    // A byte-for-byte re-serialisation is the same document: the digest is over canonical bytes, so
    // member order must not turn a replay into a conflict.
    let reordered: Value = serde_json::from_str(&serde_json::to_string(&s1).unwrap()).unwrap();
    assert_eq!(state.classify(&reordered), Ordering::Replay);
}

// ── §88 — the lineage survives a restart ─────────────────────────────────────────────────────────────

/// A verifier retains only the sequence and the digest it accepted. Restarting is therefore expressible
/// as reconstructing that pair — and the classification afterwards must be identical, or trust would
/// depend on process lifetime.
#[test]
fn a_restart_preserves_rollback_and_conflict_detection() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let s1 = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );

    // Restart: state rebuilt from persisted values only.
    let persisted = (
        s1["set_sequence"].as_u64().unwrap(),
        set_digest(&s1).unwrap(),
    );
    let after_restart = Observed {
        sequence: persisted.0,
        digest: persisted.1,
    };

    // The superseded set arrives again after the restart → still a rollback.
    assert_eq!(after_restart.classify(&n), Ordering::Rollback);

    // A different successor at the accepted position arrives after the restart → still a conflict.
    let s2 = build_set(
        1,
        &[("a", &a), ("c", &c), ("e", &e)],
        Some(&n),
        &[("a", &a), ("c", &c)],
    );
    assert_eq!(after_restart.classify(&s2), Ordering::Equivocation);

    // And the lineage still advances normally.
    let s3 = build_set(
        2,
        &[("a", &a), ("b", &b), ("e", &e)],
        Some(&s1),
        &[("a", &a), ("d", &d)],
    );
    assert_eq!(after_restart.classify(&s3), Ordering::Eligible);
    assert!(verify_successor_set(&s3, &s1).verified);
}

// ── §16 / §17 / §111 — life after a succession ───────────────────────────────────────────────────────

/// After `A+B+C → A+B+D`, C is no longer an authority and D is. Every combination is checked, because
/// the failure that matters is the one where a removed authority keeps working by accident.
#[test]
fn a_removed_authority_stops_counting_and_the_new_one_starts() {
    let (a, b, c, d, x) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("x"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let active = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );

    // A successor to the ACTIVE set, authorised by pairs drawn from it.
    let successor_signed_by = |signers: &[(&str, &TestKeypair)]| {
        build_set(
            2,
            &[("a", &a), ("b", &b), ("x", &x)],
            Some(&active),
            signers,
        )
    };

    for (label, signers, expected) in [
        ("A+B", vec![("a", &a), ("b", &b)], true),
        ("A+D", vec![("a", &a), ("d", &d)], true),
        ("B+D", vec![("b", &b), ("d", &d)], true),
        // C was removed at sequence 1. It authorises nothing afterwards, alone or paired.
        ("C alone", vec![("c", &c)], false),
        ("C+A", vec![("c", &c), ("a", &a)], false),
        ("C+B", vec![("c", &c), ("b", &b)], false),
        ("C+D", vec![("c", &c), ("d", &d)], false),
    ] {
        let candidate = successor_signed_by(&signers);
        assert_eq!(
            verify_successor_set(&candidate, &active).verified,
            expected,
            "successor signed by {label}"
        );
    }
}

/// A removed authority cannot reinstate itself, even holding a valid key and naming the real
/// predecessor: it is simply not in the set that authorises the transition.
#[test]
fn a_removed_authority_cannot_reinstate_itself() {
    let (a, b, c, d) = (kp("a"), kp("b"), kp("c"), kp("d"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let active = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );
    // C tries to put itself back, signing with its own key plus a second copy of it.
    let reinstate = build_set(
        2,
        &[("a", &a), ("b", &b), ("c", &c)],
        Some(&active),
        &[("c", &c), ("c", &c)],
    );
    assert!(!verify_successor_set(&reinstate, &active).verified);
}

// ── §110 — the Key Manifest, against the set that is current now ─────────────────────────────────────

/// The full acceptance matrix against an active set that is itself the result of a succession — the
/// case where an implementation that cached the genesis authorities silently keeps accepting them.
#[test]
fn the_key_manifest_matrix_follows_the_current_set() {
    let (a, b, c, d, x, y) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("x"), kp("y"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let active = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );

    for (label, signers, expected) in [
        ("A+B", vec![("a", &a), ("b", &b)], true),
        ("A+D", vec![("a", &a), ("d", &d)], true),
        ("B+D", vec![("b", &b), ("d", &d)], true),
        ("A+B+D", vec![("a", &a), ("b", &b), ("d", &d)], true),
        ("A alone", vec![("a", &a)], false),
        ("A+A", vec![("a", &a), ("a", &a)], false),
        ("X+Y", vec![("x", &x), ("y", &y)], false),
        // C signed manifests yesterday. It does not sign them today.
        ("C+A", vec![("c", &c), ("a", &a)], false),
    ] {
        let m = manifest_signed_by(&active, &signers);
        assert_eq!(
            verify_key_manifest_under_set(&m, &active).verified,
            expected,
            "Key Manifest signed by {label}"
        );
    }
}

/// §25 — trust flows from the already-trusted set into the manifest, never the other way. A manifest
/// that names its own authorities establishes nothing.
#[test]
fn a_key_manifest_cannot_supply_its_own_trust_anchor() {
    let (a, b, d, x, y, z) = (kp("a"), kp("b"), kp("d"), kp("x"), kp("y"), kp("z"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("d", &d)], None, &[]);

    // A rogue set the attacker generated, and a manifest correctly signed under it.
    let rogue = build_set(
        0,
        &[("x", &x), ("y", &y), ("z", &z)],
        None,
        &[("x", &x), ("y", &y)],
    );
    let m = manifest_signed_by(&rogue, &[("x", &x), ("y", &y)]);

    // Internally consistent, and worth nothing against the set actually trusted.
    assert!(verify_key_manifest_under_set(&m, &rogue).verified);
    assert!(!verify_key_manifest_under_set(&m, &n).verified);

    // Carrying the rogue set INSIDE the manifest changes nothing either. The declared authorities are
    // embedded before signing, so the signatures are valid over the whole document — this is not tamper
    // detection, it is the verifier refusing to read a candidate's own claim about who may authorise it.
    let mut smuggled = json!({
        "manifest_version": "1",
        "protocol_version": "1.0.0",
        "root_authority_set": {
            "set_sequence": rogue["set_sequence"].clone(),
            "digest": set_digest(&rogue).unwrap()
        },
        "root_authority_set_document": rogue.clone(),
        "authorities": rogue["authorities"].clone(),
        "threshold": 2,
        "keys": [],
        "marker": "TEST ONLY",
        "root_signatures": []
    });
    let msg = banza_trust::canonical_bytes(&smuggled, &["root_signatures"]).unwrap();
    smuggled["root_signatures"] = Value::Array(
        [("x", &x), ("y", &y)]
            .iter()
            .map(|(id, k)| json!({ "authority_id": id, "signature": k.sign_bytes(&msg) }))
            .collect(),
    );
    // Self-consistent: its own embedded set would accept it.
    assert!(
        verify_key_manifest_under_set(&smuggled, &rogue).verified,
        "the smuggled manifest must be internally valid, or the test proves nothing"
    );
    // And worthless against the set the verifier actually trusts.
    assert!(
        !verify_key_manifest_under_set(&smuggled, &n).verified,
        "a manifest that declares its own authorities must not be validated against them"
    );
}

// ── §112 — quorum loss ───────────────────────────────────────────────────────────────────────────────

/// One lost is recoverable; two lost is not, and there is no third answer.
#[test]
fn quorum_loss_is_recoverable_at_two_survivors_and_never_at_one() {
    assert!(continuity_available(3));
    assert!(
        continuity_available(THRESHOLD),
        "two survivors restore the set"
    );
    assert!(!continuity_available(1), "one survivor cannot");
    assert!(!continuity_available(0));

    // The surviving two genuinely restore the count to three.
    let (a, b, c, d) = (kp("a"), kp("b"), kp("c"), kp("d"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let restored = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&n),
        &[("a", &a), ("b", &b)],
    );
    assert!(verify_successor_set(&restored, &n).verified);
    assert_eq!(restored["authorities"].as_array().unwrap().len(), 3);

    // A single survivor cannot, however the document is shaped.
    let alone = build_set(
        1,
        &[("a", &a), ("d", &d), ("c", &c)],
        Some(&n),
        &[("a", &a)],
    );
    assert!(!verify_successor_set(&alone, &n).verified);
}

// ── §13 / §86 — numeric domain and hostile input ─────────────────────────────────────────────────────

/// `set_sequence` lives in the BCJ/1 integer domain. Values outside it are rejected as input, not
/// wrapped, truncated or accepted as floats — and nothing panics.
#[test]
fn out_of_domain_sequences_are_rejected_without_panicking() {
    let (a, b, c, d) = (kp("a"), kp("b"), kp("c"), kp("d"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);

    for bad in [
        json!(-1),
        json!(1.5),
        json!("1"),
        json!(null),
        // beyond BCJ/1's ±(2^53 − 1) integer domain
        json!(9_007_199_254_740_992u64),
        json!(u64::MAX),
    ] {
        let mut candidate = build_set(
            1,
            &[("a", &a), ("b", &b), ("d", &d)],
            Some(&n),
            &[("a", &a), ("b", &b)],
        );
        candidate["set_sequence"] = bad.clone();
        assert!(
            !verify_successor_set(&candidate, &n).verified,
            "set_sequence {bad} must be rejected"
        );
    }
}

/// Malformed input produces a deterministic rejection, never a panic. Each of these arrived at a
/// verifier that had every reason to trust nothing about it.
#[test]
fn hostile_input_is_rejected_deterministically() {
    let (a, b, c) = (kp("a"), kp("b"), kp("c"));
    let n = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);

    for hostile in [
        json!(null),
        json!("not a set"),
        json!(42),
        json!([]),
        json!({}),
        json!({"set_sequence": 1}),
        json!({"authorities": []}),
        // signatures that are not base64url, and a threshold that lies
        json!({"set_sequence": 1, "threshold": 2, "authorities": [], "predecessor_signatures": ["!!!"]}),
        json!({"set_sequence": 1, "threshold": 0, "authorities": []}),
    ] {
        let r = verify_successor_set(&hostile, &n);
        assert!(!r.verified, "hostile input must be rejected: {hostile}");
        // Rejection must be reasoned, not incidental.
        assert!(!r.detail.is_empty(), "rejection must say why: {hostile}");
        // The same input twice gives the same answer — no hidden state, no ordering effect.
        assert_eq!(
            verify_successor_set(&hostile, &n).verified,
            r.verified,
            "rejection must be deterministic: {hostile}"
        );
    }
}

// ── positive demonstration of survival under hostile input ───────────────────────────────────────────
//
// The registry recorded rejection cases for hostile input but no POSITIVE demonstration of the property
// itself, which is not "a valid document is accepted" — it is that the verifier is still alive, still
// answering, and still correct after a hostile corpus has been thrown at it. Rejecting once proves the
// branch exists; surviving the corpus and then behaving normally proves the property.
#[test]
fn the_verifier_survives_a_hostile_corpus_and_still_decides_correctly() {
    let (a, b, c, d) = (kp("a"), kp("b"), kp("c"), kp("d"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let good = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a), ("b", &b)],
    );

    // A hostile corpus, spanning shape, type, domain and encoding.
    let mut hostile: Vec<Value> = vec![
        json!(null),
        json!(0),
        json!(-1),
        json!(1e308),
        json!("¯\\_(ツ)_/¯"),
        json!([]),
        json!({}),
        json!({"set_sequence": {}}),
        json!({"authorities": "three"}),
        json!({"set_sequence": 1, "threshold": "two", "authorities": []}),
        json!({"set_sequence": u64::MAX, "threshold": 2, "authorities": []}),
        json!({"predecessor_signatures": [{"authority_id": "\u{0}", "signature": "\u{feff}"}]}),
        json!({"authorities": [{"public_key": "ed25519:%%%%"}, {"public_key": ""}, {"public_key": "\u{202e}"}]}),
    ];
    // Deeply nested input, presented the way hostile input actually ARRIVES: as bytes. Building a
    // 2000-deep value in the test instead overflows the stack while constructing it, which measures the
    // test harness rather than the verifier. Parsing is where the depth limit belongs and where an
    // attacker's bytes meet the process.
    let deep_bytes = format!(
        "{}{}{}",
        "{\"nested\":".repeat(2_000),
        "{\"authorities\":[]}",
        "}".repeat(2_000)
    );
    match serde_json::from_str::<Value>(&deep_bytes) {
        Err(_) => {} // refused at the parser, before any protocol logic sees it — correct
        Ok(v) => hostile.push(v),
    }

    for h in &hostile {
        let r = verify_successor_set(h, &genesis);
        assert!(!r.verified, "hostile input must never verify: {h}");
        assert!(!r.detail.is_empty(), "every rejection carries a reason");
        // Twice, to show no hidden state was left behind by the first pass.
        assert_eq!(verify_successor_set(h, &genesis).verified, r.verified);
    }

    // THE POSITIVE HALF: after the whole corpus, the verifier still accepts what it should and still
    // refuses what it should. A verifier that survives by refusing everything has not survived.
    assert!(
        verify_successor_set(&good, &genesis).verified,
        "the verifier must still accept a valid successor after the hostile corpus"
    );
    let rogue = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a)],
    );
    assert!(
        !verify_successor_set(&rogue, &genesis).verified,
        "and must still refuse an unauthorised one"
    );
}

// ── positive demonstration that unavailability does not bypass trust ─────────────────────────────────
//
// The registry checked for forbidden identifiers, which shows nobody WROTE a bypass. It did not show
// the safe behaviour actually happening. These two cases are the behaviour: material already validly
// authenticated keeps the standing it had when a refresh fails, and an operation whose trust cannot be
// established fails rather than proceeding.
#[test]
fn an_unavailable_refresh_neither_weakens_nor_destroys_established_trust() {
    let (a, b, c, d, e) = (kp("a"), kp("b"), kp("c"), kp("d"), kp("e"));
    let genesis = build_set(0, &[("a", &a), ("b", &b), ("c", &c)], None, &[]);
    let pinned = set_digest(&genesis).unwrap();
    assert!(banza_trust::authority_set::verify_genesis_set(&genesis, &pinned).verified);

    let state = banza_trust::authority_set::TrustedSet::at_genesis(&genesis).unwrap();
    let good = build_set(
        1,
        &[("a", &a), ("b", &b), ("d", &d)],
        Some(&genesis),
        &[("a", &a), ("b", &b)],
    );
    let (state, outcome) = banza_trust::authority_set::observe(&state, &genesis, &good);
    assert_eq!(outcome, banza_trust::authority_set::Observation::Advanced);
    let established = state.clone();

    // A refresh that returns nothing usable — the transport-failure shapes a fetcher produces.
    for failed_refresh in [
        json!(null),
        json!(""),
        json!({}),
        json!({"error": "connection reset"}),
        json!({"set_sequence": 1}),
    ] {
        let (after, outcome) =
            banza_trust::authority_set::observe(&state, &genesis, &failed_refresh);
        assert_ne!(
            outcome,
            banza_trust::authority_set::Observation::Advanced,
            "a failed refresh must never advance trust"
        );
        assert_eq!(
            after, established,
            "a failed refresh must not destroy the state that was validly established"
        );
    }

    // And an operation whose trust cannot be established fails, rather than proceeding on what is left.
    let unauthorised = build_set(
        2,
        &[("a", &a), ("b", &b), ("e", &e)],
        Some(&good),
        &[("e", &e)],
    );
    let (after, outcome) = banza_trust::authority_set::observe(&state, &good, &unauthorised);
    assert!(matches!(
        outcome,
        banza_trust::authority_set::Observation::Rejected(_)
    ));
    assert_eq!(after, established, "and the established state is untouched");

    // Below the threshold there is no fallback at all: continuity blocks rather than degrading.
    assert!(!banza_trust::authority_set::continuity_available(1));
}
