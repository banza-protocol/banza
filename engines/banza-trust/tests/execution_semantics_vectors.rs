//! Cross-implementation conformance for the execution semantics (X-04 and X-05).
//!
//! The vectors in `conformance/vectors/reason-codes.json` and `conformance/vectors/idempotency.json`
//! were derived from the specification text. The idempotency request-identity digests in particular
//! were computed by an implementation written from `spec/idempotency.md` §3 and `BCJ/1`, sharing no
//! code with this engine. This test asserts the engine reproduces them.
//!
//! Agreement between two implementations that share no code is the evidence that the rules live in
//! the specifications and not in either implementation.

use banza_trust::execution::{self, CodeShape, IdempotencyOutcome, IdempotencyScope};
use serde_json::Value;

const RC: &str = include_str!("../../../conformance/vectors/reason-codes.json");
const IDEM: &str = include_str!("../../../conformance/vectors/idempotency.json");
const REGISTRY: &str =
    include_str!("../../../contracts/production/reason-code-registry.production.json");

fn arr(v: &Value) -> Vec<String> {
    v.as_array()
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

// ── X-04 ────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn the_registry_matches_what_the_engine_emits() {
    // The registry is the authority; this asserts the engine has not drifted away from it.
    let reg: Value = serde_json::from_str(REGISTRY).expect("registry parses");
    let published: Vec<String> = reg["vocabularies"]["trust_status"]["values"]
        .as_array()
        .expect("trust_status values")
        .iter()
        .map(|v| v["code"].as_str().unwrap().to_string())
        .collect();
    let emitted: Vec<String> = banza_trust::evaluate::STATUS_VALUES
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(
        published, emitted,
        "the published trust_status vocabulary and the engine's must be identical"
    );
    // and every published value carries a meaning and a verdict
    for v in reg["vocabularies"]["trust_status"]["values"]
        .as_array()
        .unwrap()
    {
        assert!(!v["meaning"].as_str().unwrap_or("").is_empty());
        assert!(matches!(
            v["verdict"].as_str().unwrap_or(""),
            "VERIFIED" | "PENDING" | "FAILED"
        ));
    }
}

#[test]
fn reason_code_vectors_hold() {
    let doc: Value = serde_json::from_str(RC).expect("vectors parse");
    let check_ids = arr(&doc["published_check_ids"]);
    assert_eq!(check_ids.len(), 13, "the OTE publishes thirteen check ids");

    let mut checked = 0;
    for v in doc["vectors"].as_array().expect("vectors") {
        let id = v["id"].as_str().unwrap();
        let field = v["field"].as_str().unwrap_or("");
        let expect = v["expect"].as_str().unwrap();

        match (field, expect) {
            ("reason_codes", "accept") => {
                execution::validate_reason_codes(&arr(&v["input"]))
                    .unwrap_or_else(|e| panic!("{id}: engine rejected an accept vector: {e}"));
                checked += 1;
            }
            ("reason_codes", "reject") => {
                assert!(
                    execution::validate_reason_codes(&arr(&v["input"])).is_err(),
                    "{id}: engine accepted a vector the specification rejects"
                );
                checked += 1;
            }
            ("failed_checks", _) => {
                let allows = v["outcome"].as_str().unwrap_or("FAIL_CLOSED") == "ROUTING_ALLOWED";
                let r = execution::validate_failed_checks(&arr(&v["input"]), &check_ids, allows);
                if expect == "accept" {
                    r.unwrap_or_else(|e| panic!("{id}: engine rejected an accept vector: {e}"));
                } else {
                    assert!(
                        r.is_err(),
                        "{id}: engine accepted what the specification rejects"
                    );
                }
                checked += 1;
            }
            ("trust_status", "reject") => {
                // A closed enum: the value must not be in the published vocabulary.
                let reg: Value = serde_json::from_str(REGISTRY).unwrap();
                let published: Vec<&str> = reg["vocabularies"]["trust_status"]["values"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|x| x["code"].as_str().unwrap())
                    .collect();
                let val = v["input"].as_str().unwrap();
                assert!(
                    !published.contains(&val),
                    "{id}: a value the vectors reject is in the closed enum"
                );
                checked += 1;
            }
            _ => {}
        }

        // Equivalence vectors, whichever shape they take.
        if expect == "EQUIVALENT" || expect == "NOT_EQUIVALENT" {
            if let (Some(a), Some(b)) = (v.get("input_a"), v.get("input_b")) {
                let eq = execution::core_code_set(&arr(a)) == execution::core_code_set(&arr(b));
                assert_eq!(
                    eq,
                    expect == "EQUIVALENT",
                    "{id}: equivalence verdict differs"
                );
                checked += 1;
            } else if let (Some(a), Some(b)) = (v.get("a"), v.get("b")) {
                if let (Some(ra), Some(rb)) = (a.get("reason_codes"), b.get("reason_codes")) {
                    let eq =
                        execution::core_code_set(&arr(ra)) == execution::core_code_set(&arr(rb));
                    assert_eq!(
                        eq,
                        expect == "EQUIVALENT",
                        "{id}: equivalence verdict differs"
                    );
                    checked += 1;
                }
            }
        }
    }
    assert!(
        checked >= 15,
        "expected the vectors to exercise the engine, checked {checked}"
    );
}

#[test]
fn an_extension_code_may_never_enter_a_closed_field() {
    assert_eq!(
        execution::code_shape("x-acme.trust_ok"),
        CodeShape::Extension
    );
    let reg: Value = serde_json::from_str(REGISTRY).unwrap();
    let published: Vec<&str> = reg["vocabularies"]["trust_status"]["values"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x["code"].as_str().unwrap())
        .collect();
    assert!(!published.iter().any(|c| c.contains('.')));
}

// ── X-05 ────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn idempotency_request_identity_matches_the_independent_implementation() {
    let doc: Value = serde_json::from_str(IDEM).expect("vectors parse");

    // The excluded-member list is normative and closed; the engine's must equal the published one.
    let published = arr(&doc["request_identity_excluded_members"]);
    let engine: Vec<String> = execution::REQUEST_IDENTITY_EXCLUDED
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(
        published, engine,
        "excluded members must match the specification"
    );

    let mut compared = 0;
    for v in doc["vectors"].as_array().unwrap() {
        let id = v["id"].as_str().unwrap();
        for (body_key, digest_key) in [("first", "first_digest"), ("second", "second_digest")] {
            if let (Some(body), Some(expected)) = (v.get(body_key), v.get(digest_key)) {
                let got = execution::request_identity(body)
                    .unwrap_or_else(|e| panic!("{id}: engine rejected a vector body: {e}"));
                assert_eq!(
                    got,
                    expected.as_str().unwrap(),
                    "{id}: request identity digest differs from the published vector"
                );
                compared += 1;
            }
        }
    }
    assert_eq!(
        compared, 8,
        "four vectors pin a digest for each of two bodies; a change here means the vector set moved"
    );
}

#[test]
fn idempotency_outcome_vectors_hold() {
    let doc: Value = serde_json::from_str(IDEM).expect("vectors parse");
    let sc = |v: &Value, key: &str| IdempotencyScope {
        receiving_implementation: v[key]["receiving_implementation"]
            .as_str()
            .unwrap_or("impl-a")
            .into(),
        authenticated_caller: v[key]["authenticated_caller"]
            .as_str()
            .unwrap_or("c")
            .into(),
        operation: v[key]["operation"].as_str().unwrap_or("op").into(),
        idempotency_key: "k".into(),
    };

    for v in doc["vectors"].as_array().unwrap() {
        let id = v["id"].as_str().unwrap();
        let expect = v["expect"].as_str().unwrap();

        // scope vectors
        if v.get("scope_a").is_some() && v.get("scope_b").is_some() {
            let out = execution::classify(
                &sc(v, "scope_a"),
                "d1",
                60,
                604_800,
                &sc(v, "scope_b"),
                "d1",
            );
            assert_eq!(
                out,
                IdempotencyOutcome::DistinctOperation,
                "{id}: a different scope tuple must be a distinct operation"
            );
            assert_eq!(expect, "DISTINCT_OPERATION");
        }

        // same-scope replay / conflict vectors
        if let (Some(a), Some(b)) = (v.get("first_digest"), v.get("second_digest")) {
            if v.get("scope").is_some() || expect == "CONFLICT" {
                let s = IdempotencyScope {
                    receiving_implementation: "impl-a".into(),
                    authenticated_caller: "caller-1".into(),
                    operation: "POST /v1/transfers".into(),
                    idempotency_key: "order-001".into(),
                };
                let out = execution::classify(
                    &s,
                    a.as_str().unwrap(),
                    60,
                    604_800,
                    &s,
                    b.as_str().unwrap(),
                );
                let want = if expect == "REPLAY" {
                    IdempotencyOutcome::Replay
                } else {
                    IdempotencyOutcome::Conflict
                };
                assert_eq!(out, want, "{id}: outcome differs from the published vector");
            }
        }

        // retention vectors
        if let (Some(r), Some(e)) = (
            v.get("declared_retention_seconds").and_then(|x| x.as_u64()),
            v.get("elapsed_seconds").and_then(|x| x.as_u64()),
        ) {
            let s = IdempotencyScope {
                receiving_implementation: "impl-a".into(),
                authenticated_caller: "caller-1".into(),
                operation: "op".into(),
                idempotency_key: "k".into(),
            };
            let out = execution::classify(&s, "d1", e, r, &s, "d1");
            let want = if expect == "REPLAY" {
                IdempotencyOutcome::Replay
            } else {
                IdempotencyOutcome::DistinctOperation
            };
            assert_eq!(out, want, "{id}: retention outcome differs");
        } else if let Some(r) = v.get("declared_retention_seconds").and_then(|x| x.as_u64()) {
            assert!(
                execution::validate_declared_retention(r).is_err(),
                "{id}: a retention below the floor must be rejected"
            );
            assert_eq!(expect, "REJECT");
        }

        // BCJ/1 rejection vectors
        if let Some(raw) = v.get("input_raw").and_then(|x| x.as_str()) {
            assert!(
                execution::request_identity_from_bytes(raw).is_err(),
                "{id}: a body BCJ/1 rejects must have no request identity"
            );
            assert_eq!(expect, "REJECT");
        }
    }
}
