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

/// The digest a vector carries for a given member, defaulting to a distinct placeholder so a vector
/// that omits one cannot accidentally collide with another artifact's digest.
fn dig(v: &Value, member: &str, fallback: &str) -> String {
    v.get(member)
        .and_then(|x| x.as_str())
        .unwrap_or(fallback)
        .to_string()
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
    // The conflict vectors detect equivocation only inside one verifier. The boundary must keep
    // saying so, or TF-011..TF-013 could be read as a transparency claim.
    assert!(
        b.contains("one verifier") && b.contains("across observers"),
        "the boundary must bound the conflict vectors to a single verifier"
    );
}

#[test]
fn engine_reproduces_every_vector() {
    let doc: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    let declared = doc["vector_count"].as_u64().expect("vector_count") as usize;
    let mut checked = 0;

    for v in doc["vectors"].as_array().expect("vectors array") {
        let id = v["id"].as_str().unwrap();
        let k = key(&v["key"]);
        let mut m = HighWaterMarks::new();

        // An independent authority's mark, where the vector sets one, must not interfere.
        if let Some(o) = v.get("other_key_mark") {
            m.offer(
                &key(o),
                o["mark"].as_str().unwrap(),
                &dig(o, "digest", "digest-other"),
            );
        }
        if let Some(p) = v["prior"].as_str() {
            m.offer(&k, p, &dig(v, "prior_digest", "digest-prior"));
        }

        // Concurrency vector: both interleavings must reach the same mark.
        if let Some(vals) = v.get("offered_concurrently").and_then(|x| x.as_array()) {
            let a = vals[0].as_str().unwrap();
            let b = vals[1].as_str().unwrap();
            for (x, y) in [(a, b), (b, a)] {
                let mut mm = HighWaterMarks::new();
                mm.offer(&k, x, "digest-x");
                mm.offer(&k, y, "digest-y");
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
                dig(v, "restore_digest", "digest-restored"),
            )]);
            assert_eq!(
                m.mark(&k),
                v["resulting_mark"].as_str(),
                "{id}: a restore from stale storage must not undo the defence"
            );
            if let Some(rd) = v.get("resulting_digest").and_then(|x| x.as_str()) {
                assert_eq!(
                    m.digest(&k),
                    Some(rd),
                    "{id}: a restore must not replace the digest held at the current mark"
                );
            }
            checked += 1;
            continue;
        }

        // Restart vector: export, drop the process state, restore, then offer.
        if v.get("restart").and_then(|x| x.as_bool()) == Some(true) {
            let persisted = m.export();
            m = HighWaterMarks::new();
            m.restore(&persisted);
        }

        let got = m.offer(
            &k,
            v["offered"].as_str().unwrap(),
            &dig(v, "offered_digest", "digest-offered"),
        );
        let want = match v["expect"].as_str().unwrap() {
            "FIRST_OBSERVATION" => RollbackVerdict::FirstObservation,
            "UNCHANGED" => RollbackVerdict::Unchanged,
            "ADVANCED" => RollbackVerdict::Advanced,
            "EQUIVOCATION" => RollbackVerdict::Equivocation,
            "ROLLBACK" => RollbackVerdict::Rollback,
            other => panic!("{id}: unknown expectation {other}"),
        };
        assert_eq!(got, want, "{id}: verdict differs from the published vector");

        // A vector that carries a reason code is a refusal; one that does not must be usable.
        match v.get("reason_code").and_then(|x| x.as_str()) {
            Some(rc) => {
                assert_eq!(got.reason_code(), Some(rc), "{id}: reason code differs");
                assert!(!got.accepted(), "{id}: a refusal must not be usable");
            }
            None => assert!(
                got.accepted(),
                "{id}: an outcome with no reason code must be acceptable"
            ),
        }
        if let Some(rm) = v.get("resulting_mark").and_then(|x| x.as_str()) {
            assert_eq!(m.mark(&k), Some(rm), "{id}: resulting mark differs");
        }
        if let Some(rd) = v.get("resulting_digest").and_then(|x| x.as_str()) {
            assert_eq!(m.digest(&k), Some(rd), "{id}: resulting digest differs");
        }
        checked += 1;
    }
    assert_eq!(
        checked, declared,
        "every published vector must be exercised"
    );
}

#[test]
fn the_reason_codes_are_published_in_the_registry() {
    // The rule emits core reason codes; a code with no published meaning is not a code
    // (spec/reason-codes.md).
    const REG: &str =
        include_str!("../../../contracts/production/reason-code-registry.production.json");
    let reg: Value = serde_json::from_str(REG).unwrap();
    let values = reg["vocabularies"]["fetch_reason_codes"]["values"]
        .as_array()
        .unwrap();
    for code in ["trust_version_rollback", "trust_version_equivocation"] {
        let found = values
            .iter()
            .find(|v| v["code"] == code)
            .unwrap_or_else(|| panic!("{code} must be published"));
        assert!(!found["meaning"].as_str().unwrap_or("").is_empty());
    }
}

#[test]
fn the_signing_input_exclusion_is_a_real_member_of_each_contract() {
    // §3.1 names the excluded member per artifact type because the three contracts do not share one.
    // A name that drifts from its contract would silently redefine which bytes the digest covers, so
    // each is checked against the production schema rather than trusted as prose.
    let doc: Value = serde_json::from_str(VECTORS).expect("vectors parse");
    let excl = doc["signing_input_exclusions"]
        .as_object()
        .expect("signing_input_exclusions present");

    const BRL: &str = include_str!("../../../contracts/production/brl.production.schema.json");
    const KM: &str =
        include_str!("../../../contracts/production/key-manifest.production.schema.json");
    const SPM: &str = include_str!(
        "../../../contracts/production/signed-protocol-metadata.production.schema.json"
    );

    // The Key Manifest carries its threshold signatures on the root metadata it is anchored to, not
    // at its own top level, so it is checked for absence rather than presence: naming a member the
    // manifest itself declares would be the drift this test is here to catch.
    for (artifact_type, schema_src, expect_declared) in [
        ("brl", BRL, true),
        ("key_manifest", KM, false),
        ("signed_protocol_metadata", SPM, true),
    ] {
        let member = excl[artifact_type].as_str().expect("exclusion is a string");
        let schema: Value = serde_json::from_str(schema_src).unwrap();
        let declared = schema["properties"].get(member).is_some();
        assert_eq!(
            declared, expect_declared,
            "{artifact_type}: `{member}` declared at the top level of its contract = {declared}, \
             expected {expect_declared}"
        );
        if expect_declared {
            assert!(
                schema["required"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|r| r == member),
                "{artifact_type}: `{member}` must be REQUIRED — an optional signature member would \
                 make the signing input depend on whether the publisher included it"
            );
        }
    }
}
