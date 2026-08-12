//! Emit the vocabulary contract by EXECUTING the engine — the single source
//! `make operator-zero-vocabulary-contract-check` reads. It never greps source: a slug that exists
//! only in a comment, or a label that was deleted, must not be able to pass the guard.
//!
//! Output is one JSON document:
//!   { "vocabulary": {group: [slug…]}, "labels": {slug: label}, "identity": {…}, "e2e_slugs": [slug…] }
//! `labels` maps EVERY published slug to what `vocab::label` returns for it (possibly ""), so the
//! guard can prove every slug has a non-empty label and that the label map holds no invented default.

use operator_zero_core::{identity, sim, vocab};
use serde_json::{json, Map, Value};

fn main() {
    let vocabulary = vocab::vocabulary();

    // Every published slug → its label, straight from the engine.
    let mut labels = Map::new();
    if let Value::Object(groups) = &vocabulary {
        for (_group, arr) in groups {
            if let Some(list) = arr.as_array() {
                for s in list {
                    if let Some(slug) = s.as_str() {
                        labels.insert(
                            slug.to_string(),
                            Value::String(vocab::label(slug).to_string()),
                        );
                    }
                }
            }
        }
    }

    // The slugs an actual run emits — so the guard can prove the vocabulary COVERS reality, not just
    // that the constants label themselves. Both scenarios, every status-bearing field.
    let mut e2e = std::collections::BTreeSet::new();
    for happy in [true, false] {
        let t = sim::run_e2e(happy);
        collect_slugs(&t, &mut e2e);
    }

    let out = json!({
        "vocabulary": vocabulary,
        "labels": Value::Object(labels),
        "identity": identity(),
        "e2e_slugs": e2e.into_iter().collect::<Vec<_>>(),
    });
    println!("{}", serde_json::to_string(&out).unwrap());
}

/// Walk the trace and collect every value under a status/next_action/*_status key, plus artifact_type
/// and error codes — the fields whose values are slugs the UI will label.
fn collect_slugs(v: &Value, out: &mut std::collections::BTreeSet<String>) {
    const SLUG_KEYS: &[&str] = &[
        "status",
        "next_action",
        "evidence_status",
        "payment_status",
        "refund_status",
        "artifact_type",
        "ledger_status",
        "code",
    ];
    match v {
        Value::Object(m) => {
            for (k, child) in m {
                if SLUG_KEYS.contains(&k.as_str()) {
                    if let Some(s) = child.as_str() {
                        // reconciliation status "reconciled" et al. are slugs; free-text notes are not,
                        // and they never sit under these keys.
                        out.insert(s.to_string());
                    }
                }
                collect_slugs(child, out);
            }
        }
        Value::Array(a) => a.iter().for_each(|c| collect_slugs(c, out)),
        _ => {}
    }
}
