//! The engine must never carry a protocol version of its own. It restates the one the normative
//! contract declares, and this test is the binding: bump `contracts/production/protocol-version.json`
//! without bumping the engine and CI fails here rather than in a verifier three releases later.

const CONTRACT: &str = include_str!("../../../contracts/production/protocol-version.json");

#[test]
fn protocol_version_matches_the_normative_contract() {
    let c: serde_json::Value = serde_json::from_str(CONTRACT).expect("contract parses");
    let declared = c["protocol_version"]
        .as_str()
        .expect("contract declares a version");
    assert_eq!(
        banza_trust::PROTOCOL_VERSION,
        declared,
        "the engine states a protocol version the normative contract does not declare"
    );
}
