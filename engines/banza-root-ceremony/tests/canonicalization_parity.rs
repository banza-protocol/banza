//! The ceremony engine must not derive its own canonical bytes.
//!
//! It signs trust root metadata, which `spec/canonicalization.md` §6 covers. Before the final
//! verification pass of the normative-completeness remediation it used `serde_json::to_vec` — the
//! pre-remediation behaviour — which made this crate a second, unpublished definition of the byte
//! form. This test pins the delegation.

use banza_root_ceremony::canonical_bytes;
use serde_json::json;

#[test]
fn the_ceremony_engine_agrees_byte_for_byte() {
    // banza-root-ceremony signs trust root metadata, which spec/canonicalization.md §6 covers. It
    // must not derive its own bytes.
    let doc = json!({
        "z": 1, "a": {"y": 2, "x": [3, 2, 1]}, "s": "caf\u{00e9}", "n": -9007199254740991i64,
        "signatures": ["removed"]
    });
    assert_eq!(
        canonical_bytes(&doc, &["signatures"]).unwrap(),
        banza_trust::canonical_bytes(&doc, &["signatures"]).unwrap(),
        "every engine that signs must derive the same bytes"
    );
    // and it must fail closed on the same input
    assert!(canonical_bytes(&json!({"n": 1.5}), &[]).is_err());
}
