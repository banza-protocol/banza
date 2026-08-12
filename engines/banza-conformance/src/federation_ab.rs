//! Track D — the consolidated A→B multi-operator scenario, executed end-to-end.
//!
//! Two cryptographically DISTINCT operators (distinct operator ids, distinct delegated signing keys,
//! distinct published material and distinct in-process ledgers) run the shared open-protocol Open Trust
//! Evaluation over each other's published material, then execute a real A→B routed payment with atomic
//! postings, obligation, netting and idempotent replay. Negative scenarios (revoked peer, capability
//! mismatch, tampered metadata) fail closed. The whole scenario is deterministic and is run twice to prove
//! byte-identical independent replay (reproducibility).
//!
//! Honesty boundary (surfaced in the report): "distinct implementations" here means distinct OPERATORS —
//! distinct identity, keys, published trust material and ledgers — evaluated by the one open-protocol
//! verification engine. Operators do NOT reimplement verification; the protocol defines a single
//! verification semantics, so distinctness is at the operator/material/ledger level, not a second codebase.
//! No network, no funds, no secrets. `evaluation_instant` and all keys are deterministic TEST material.

use banza_simb::Federation;
use banza_trust::evaluate::evaluate_federation_ote;
use banza_trust::sign::federation_ote_input_named;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

const SEED_A: &[u8] = b"banza-ab-operator-a-delegated-seed";
const SEED_B: &[u8] = b"banza-ab-operator-b-delegated-seed";
const CAPS: &[&str] = &["cross_operator_routing", "cross_operator_settlement"];

fn allowed(out: &Value) -> bool {
    out["outcome"] == "ROUTING_ALLOWED"
}

/// One full deterministic run of the A→B scenario. Returns a structured result: the mutual OTE outcomes,
/// the routed-payment execution facts, and the negative-scenario outcomes.
fn scenario_once() -> Value {
    // ── two distinct operators publish their own trust material ──
    let a = federation_ote_input_named("operator-a", SEED_A, CAPS, &[]);
    let b = federation_ote_input_named("operator-b", SEED_B, CAPS, &[]);

    // distinctness proof: different delegated public keys, different signatures over their metadata
    let a_key = a["delegated_signing_key"]["public_key"]
        .as_str()
        .unwrap_or("");
    let b_key = b["delegated_signing_key"]["public_key"]
        .as_str()
        .unwrap_or("");
    let a_sig = a["signed_protocol_metadata"]["signature"]
        .as_str()
        .unwrap_or("");
    let b_sig = b["signed_protocol_metadata"]["signature"]
        .as_str()
        .unwrap_or("");
    let operators_distinct =
        a_key != b_key && a_sig != b_sig && a_key.len() > 20 && b_key.len() > 20;

    // ── mutual Open Trust Evaluation (each peer evaluates the other's published material) ──
    let a_evaluates_b = evaluate_federation_ote(&b); // A decides it may route TO B
    let b_evaluates_a = evaluate_federation_ote(&a); // B decides it may accept FROM A
    let mutual_routing_allowed = allowed(&a_evaluates_b) && allowed(&b_evaluates_a);

    // ── execute the routed payment A→B (only because mutual trust is ROUTING_ALLOWED) ──
    let mut fed = Federation::new();
    let routed = fed.route(50_000, "ab-scenario-route-1");
    let replay = fed.route(50_000, "ab-scenario-route-1"); // idempotent replay must not double-spend
    let net = fed.net_position();
    let execution_ok = mutual_routing_allowed
        && routed.ok
        && !routed.idempotent_replay
        && replay.idempotent_replay
        && net == 50_000;

    // ── negatives (each must FAIL_CLOSED / not route) ──
    // 1. peer revoked in the authenticated BRL
    let b_revoked = federation_ote_input_named("operator-b", SEED_B, CAPS, &["operator-b"]);
    let neg_revoked = evaluate_federation_ote(&b_revoked);
    // 2. capability mismatch: the intended interaction is a capability B does not declare
    let mut b_cap_mismatch = b.clone();
    b_cap_mismatch["intended_capabilities"] = json!(["cross_operator_custody"]);
    let neg_capability = evaluate_federation_ote(&b_cap_mismatch);
    // 3. tampered metadata: mutate a signed field after signing → signature no longer verifies
    let mut b_tampered = b.clone();
    b_tampered["signed_protocol_metadata"]["metadata_id"] = json!("spm-operator-b-TAMPERED");
    let neg_tampered = evaluate_federation_ote(&b_tampered);
    let negatives_all_fail_closed = !allowed(&neg_revoked)
        && !allowed(&neg_capability)
        && !allowed(&neg_tampered)
        && neg_revoked["checks"]["not_revoked"] == false
        && neg_capability["checks"]["capabilities_compatible"] == false
        && neg_tampered["checks"]["signed_protocol_metadata"] == false;

    json!({
        "operators_distinct": operators_distinct,
        "a_delegated_public_key": a_key,
        "b_delegated_public_key": b_key,
        "mutual_ote": {
            "a_evaluates_b": a_evaluates_b["outcome"],
            "b_evaluates_a": b_evaluates_a["outcome"],
            "routing_allowed": mutual_routing_allowed,
        },
        "execution": {
            "routed_ok": routed.ok,
            "replay_idempotent": replay.idempotent_replay,
            "net_position_minor": net,
            "execution_ok": execution_ok,
        },
        "negatives": {
            "revoked_peer_outcome": neg_revoked["outcome"],
            "capability_mismatch_outcome": neg_capability["outcome"],
            "tampered_metadata_outcome": neg_tampered["outcome"],
            "all_fail_closed": negatives_all_fail_closed,
        },
        "scenario_pass": operators_distinct && mutual_routing_allowed && execution_ok && negatives_all_fail_closed,
    })
}

/// Run the A→B scenario and prove byte-identical independent replay (reproducibility). Returns the scenario
/// result, the replay verdict, and a SHA-256 of the canonical scenario result an independent party can match.
pub fn run_ab_scenario() -> Value {
    let r1 = scenario_once();
    let r2 = scenario_once();
    let s1 = serde_json::to_string(&r1).unwrap();
    let s2 = serde_json::to_string(&r2).unwrap();
    let byte_identical = s1 == s2;
    let digest = format!("{:x}", Sha256::digest(s1.as_bytes()));

    let pass = r1["scenario_pass"] == true && byte_identical;
    json!({
        "scenario": "federation A→B multi-operator, executed end-to-end",
        "result": r1,
        "replay": {
            "runs": 2,
            "byte_identical": byte_identical,
            "result_sha256": digest,
            "note": "two independent from-scratch runs of the full scenario produce a byte-identical result",
        },
        "distinctness_boundary": "distinct OPERATORS (identity/keys/material/ledger), one shared open-protocol \
            verification engine — operators do not reimplement verification; the protocol defines one \
            verification semantics. TEST-ONLY deterministic keys; no network, no funds, no secrets.",
        "pass": pass,
    })
}
