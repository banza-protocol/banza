//! Conformance for `spec/trust-freshness.md` against its published vectors.
//!
//! The vectors describe a **stateful local** anti-rollback defence. They do not demonstrate
//! transparency, cross-observer consistency, or detection of first-observation staleness — the
//! specification's §1 says so, and so does the vector file's own boundary statement. This test
//! asserts the engine reproduces the stated outcomes and nothing more.

use banza_trust::freshness::{HighWaterMarks, MonotonicKey, RollbackVerdict};
use serde_json::Value;

const VECTORS: &str = include_str!("../../../conformance/vectors/trust-freshness.json");

fn key(v: &Value) -> MonotonicKey {
    MonotonicKey::new(
        v["artifact_type"].as_str().unwrap(),
        v["authority_identity"].as_str().unwrap(),
    )
}

#[test]
fn the_vector_file_states_what_the_rule_does_not_provide() {
    // The boundary is part of the published material, not a footnote in prose. If it is ever
    // dropped, this fails — because a reader of the vectors alone must not conclude more than the
    // rule delivers.
    let doc: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    let b = doc["_boundary"].as_str().expect("_boundary present");
    for needle in [
        "STATEFUL LOCAL",
        "transparency",
        "cross-observer",
        "first-observation",
    ] {
        assert!(b.contains(needle), "the boundary must still name: {needle}");
    }
}

#[test]
fn engine_reproduces_every_vector() {
    let doc: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    let mut checked = 0;

    for v in doc["vectors"].as_array().expect("vectors array") {
        let id = v["id"].as_str().unwrap();
        let k = key(&v["key"]);
        let mut m = HighWaterMarks::new();

        // An independent authority's mark, where the vector sets one, must not interfere.
        if let Some(o) = v.get("other_key_mark") {
            m.offer(&key(o), o["mark"].as_str().unwrap());
        }
        if let Some(p) = v["prior"].as_str() {
            m.offer(&k, p);
        }

        // Concurrency vector: both interleavings must reach the same mark.
        if let Some(vals) = v.get("offered_concurrently").and_then(|x| x.as_array()) {
            let a = vals[0].as_str().unwrap();
            let b = vals[1].as_str().unwrap();
            for (x, y) in [(a, b), (b, a)] {
                let mut mm = HighWaterMarks::new();
                mm.offer(&k, x);
                mm.offer(&k, y);
                assert_eq!(
                    mm.mark(&k),
                    v["resulting_mark"].as_str(),
                    "{id}: concurrent acceptance must keep the maximum in either interleaving"
                );
            }
            checked += 1;
            continue;
        }

        // Restore vector: restoring stale storage must not move the mark backwards.
        if let Some(r) = v.get("restore_value").and_then(|x| x.as_str()) {
            m.restore(&[(
                k.artifact_type.clone(),
                k.authority_identity.clone(),
                r.to_string(),
            )]);
            assert_eq!(
                m.mark(&k),
                v["resulting_mark"].as_str(),
                "{id}: a restore from stale storage must not undo the defence"
            );
            checked += 1;
            continue;
        }

        // Restart vector: export, drop the process state, restore, then offer.
        if v.get("restart").and_then(|x| x.as_bool()) == Some(true) {
            let persisted = m.export();
            m = HighWaterMarks::new();
            m.restore(&persisted);
        }

        let got = m.offer(&k, v["offered"].as_str().unwrap());
        let want = match v["expect"].as_str().unwrap() {
            "FIRST_OBSERVATION" => RollbackVerdict::FirstObservation,
            "UNCHANGED" => RollbackVerdict::Unchanged,
            "ADVANCED" => RollbackVerdict::Advanced,
            "ROLLBACK" => RollbackVerdict::Rollback,
            other => panic!("{id}: unknown expectation {other}"),
        };
        assert_eq!(got, want, "{id}: verdict differs from the published vector");

        if let Some(rc) = v.get("reason_code").and_then(|x| x.as_str()) {
            assert_eq!(got.reason_code(), Some(rc), "{id}: reason code differs");
        }
        if let Some(rm) = v.get("resulting_mark").and_then(|x| x.as_str()) {
            assert_eq!(m.mark(&k), Some(rm), "{id}: resulting mark differs");
        }
        checked += 1;
    }
    assert_eq!(checked, 10, "every published vector must be exercised");
}

#[test]
fn the_reason_code_is_published_in_the_registry() {
    // The rule emits a core reason code; a code with no published meaning is not a code
    // (spec/reason-codes.md).
    const REG: &str =
        include_str!("../../../contracts/production/reason-code-registry.production.json");
    let reg: Value = serde_json::from_str(REG).unwrap();
    let found = reg["vocabularies"]["fetch_reason_codes"]["values"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["code"] == "trust_version_rollback")
        .expect("trust_version_rollback must be published");
    assert!(!found["meaning"].as_str().unwrap_or("").is_empty());
}
