//! Unit + property tests for the deterministic certification authority (ADR-034/065/066, M2.19D item 12).

use super::*;

fn profile() -> InteroperabilityCertificationProfile {
    InteroperabilityCertificationProfile {
        profile_id: "banza-l2-core".into(),
        profile_version: "1.0.0".into(),
        protocol_version: "1.0.0".into(),
        environment: "sandbox".into(),
        conformance_level: "L2".into(),
        capabilities: vec!["payments".into(), "settlement".into()],
        required_schemas: vec!["operator-manifest".into()],
        required_contracts: vec!["payment-intents".into()],
        required_invariants: vec!["INV-LEDGER-001".into()],
        required_endpoints: vec!["/manifest".into()],
        identity_required: true,
        signature_required: true,
        trust_required: true,
        validity_days: 365,
        profile_hash: "sha256:profile".into(),
    }
}

fn implementation() -> CertifiedImplementation {
    CertifiedImplementation {
        implementation_id: "impl-a".into(),
        implementation_hash: "sha256:artifact-a".into(),
        declared_by: "Operator A".into(),
        declared_capabilities: vec!["payments".into(), "settlement".into()],
        declared_conformance_level: "L2".into(),
        environment: "sandbox".into(),
        protocol_version: "1.0.0".into(),
    }
}

fn conformance() -> ConformanceReport {
    ConformanceReport {
        report_id: "conf-1".into(),
        implementation_hash: "sha256:artifact-a".into(),
        profile_id: "banza-l2-core".into(),
        profile_version: "1.0.0".into(),
        result: true,
        levels_passed: vec!["L0".into(), "L1".into(), "L2".into()],
        capabilities_passed: vec!["payments".into(), "settlement".into()],
        evidence_hash: "sha256:conf-ev".into(),
    }
}

fn interoperability() -> InteroperabilityReport {
    InteroperabilityReport {
        report_id: "interop-1".into(),
        implementation_hash: "sha256:artifact-a".into(),
        profile_id: "banza-l2-core".into(),
        profile_version: "1.0.0".into(),
        result: true,
        scenarios_passed: vec!["happy-path".into()],
        negative_scenarios_passed: vec![
            "malformed".into(),
            "invalid-signature".into(),
            "timeout".into(),
            "replay".into(),
            "idempotency".into(),
        ],
        evidence_hash: "sha256:interop-ev".into(),
    }
}

fn trust() -> TrustInput {
    TrustInput {
        valid: true,
        revoked: false,
        identity_valid: true,
        signature_valid: true,
    }
}

fn happy() -> CertifyInput {
    CertifyInput {
        record_id: "rec-1".into(),
        implementation: implementation(),
        profile: profile(),
        conformance: conformance(),
        interoperability: interoperability(),
        trust: trust(),
        now: 1_800_000_000,
    }
}

#[test]
fn happy_path_certifies_with_scope_and_ok_reason() {
    let r = certify(&happy());
    assert_eq!(r.status, CertificationStatus::Certified);
    assert_eq!(r.reason_code, ReasonCode::OkConformantInteroperable);
    assert_eq!(r.scope_levels, vec!["L0", "L1", "L2"]);
    assert!(r.expires_at > r.issued_at);
    assert!(verify_record(&r));
}

#[test]
fn same_inputs_produce_the_same_record() {
    // Determinism / idempotency (property).
    assert_eq!(certify(&happy()).record_hash, certify(&happy()).record_hash);
}

#[test]
fn changing_an_input_changes_the_hash() {
    let mut i = happy();
    i.implementation.implementation_hash = "sha256:artifact-DIFFERENT".into();
    // hash-binding: reports still reference artifact-a → mismatch → not certified, and a different hash.
    let a = certify(&happy());
    let b = certify(&i);
    assert_ne!(a.record_hash, b.record_hash);
    assert_eq!(b.status, CertificationStatus::NotCertified);
    assert_eq!(b.reason_code, ReasonCode::FailHashMismatch);
}

#[test]
fn one_implementation_does_not_inherit_another_certification() {
    // impl-B's declared hash differs from the reports' hash → hash mismatch, never inherits impl-A's cert.
    let mut i = happy();
    i.implementation.implementation_id = "impl-b".into();
    i.implementation.implementation_hash = "sha256:artifact-b".into();
    let r = certify(&i);
    assert_eq!(r.status, CertificationStatus::NotCertified);
    assert_eq!(r.reason_code, ReasonCode::FailHashMismatch);
}

#[test]
fn profile_and_protocol_and_environment_mismatch_fail() {
    let mut i = happy();
    i.conformance.profile_version = "9.9.9".into();
    assert_eq!(certify(&i).reason_code, ReasonCode::FailProfileMismatch);

    let mut i = happy();
    i.implementation.protocol_version = "2.0.0".into();
    assert_eq!(certify(&i).reason_code, ReasonCode::FailProtocolMismatch);

    let mut i = happy();
    i.implementation.environment = "production".into();
    assert_eq!(certify(&i).reason_code, ReasonCode::FailEnvironmentMismatch);
}

#[test]
fn incomplete_evidence_and_missing_interoperability_fail() {
    let mut i = happy();
    i.interoperability.evidence_hash = "".into();
    assert_eq!(certify(&i).reason_code, ReasonCode::FailEvidenceIncomplete);

    let mut i = happy();
    i.interoperability.result = false;
    assert_eq!(certify(&i).reason_code, ReasonCode::FailInteroperability);

    // schemas alone (conformance) never certify without interoperability
    let mut i = happy();
    i.conformance.result = false;
    assert_eq!(certify(&i).reason_code, ReasonCode::FailConformance);
}

#[test]
fn unsupported_capability_and_trust_failures_fail() {
    let mut i = happy();
    i.conformance.capabilities_passed = vec!["payments".into()]; // missing "settlement"
    assert_eq!(
        certify(&i).reason_code,
        ReasonCode::FailCapabilityUnsupported
    );

    let mut i = happy();
    i.trust.revoked = true;
    assert_eq!(certify(&i).reason_code, ReasonCode::FailRevoked);
    assert_eq!(certify(&i).status, CertificationStatus::NotCertified);

    let mut i = happy();
    i.trust.identity_valid = false;
    assert_eq!(certify(&i).reason_code, ReasonCode::FailIdentityInvalid);
}

#[test]
fn state_machine_valid_transitions() {
    use CertificationStatus::*;
    use LifecycleEvent::*;
    assert_eq!(transition(NotCertified, Issue), Ok(Certified));
    assert_eq!(transition(Certified, Expire), Ok(Expired));
    assert_eq!(transition(Certified, Suspend), Ok(Suspended));
    assert_eq!(transition(Suspended, Reinstate), Ok(Certified));
    assert_eq!(transition(Certified, Revoke), Ok(Revoked));
    assert_eq!(transition(Expired, Revoke), Ok(Revoked));
    assert_eq!(transition(Certified, Supersede), Ok(Superseded));
}

#[test]
fn revoked_is_terminal_and_illegal_transitions_rejected() {
    use CertificationStatus::*;
    use LifecycleEvent::*;
    assert!(transition(Revoked, Reinstate).is_err());
    assert!(transition(Revoked, Issue).is_err());
    assert!(transition(NotCertified, Revoke).is_err());
    assert!(transition(Expired, Reinstate).is_err());
    assert_eq!(
        transition(Revoked, Issue),
        Err(ReasonCode::FailIllegalTransition)
    );
}

#[test]
fn expired_revoked_superseded_never_read_as_valid() {
    let now = 1_800_000_000;
    let mut r = certify(&happy());
    // expired
    let later = r.expires_at + 1;
    assert_eq!(
        effective_status(&r, false, later),
        CertificationStatus::Expired
    );
    assert!(!effective_status(&r, false, later).is_valid());
    // revoked (signed revocation present)
    assert_eq!(
        effective_status(&r, true, now),
        CertificationStatus::Revoked
    );
    assert!(!effective_status(&r, true, now).is_valid());
    // superseded record never reads current-valid
    r.status = CertificationStatus::Superseded;
    r.record_hash = record_checksum(&r);
    assert!(!effective_status(&r, false, now).is_valid());
}

#[test]
fn tampered_record_fails_verification_and_reads_not_certified() {
    let mut r = certify(&happy());
    r.scope_levels.push("L4".into()); // widen scope without recomputing hash
    assert!(!verify_record(&r));
    assert_eq!(
        effective_status(&r, false, r.issued_at),
        CertificationStatus::NotCertified
    );
}

#[test]
fn renewal_creates_a_new_record_never_extends_in_place() {
    let a = certify(&happy());
    let mut i = happy();
    i.record_id = "rec-2".into(); // renewal = a brand-new record id
    i.now = a.expires_at + 10;
    let b = certify(&i);
    assert_ne!(a.record_id, b.record_id);
    assert_ne!(a.record_hash, b.record_hash);
    assert!(b.expires_at > a.expires_at); // new window, not an in-place extension of `a`
                                          // Modelling supersession of the old line:
    let sup = SupersessionReference {
        superseded_record_id: a.record_id.clone(),
        superseded_by_record_id: b.record_id.clone(),
    };
    assert_eq!(sup.superseded_by_record_id, "rec-2");
}

#[test]
fn registry_entry_does_not_change_the_verdict() {
    let r = certify(&happy());
    let before = r.status;
    let _ = registry_entry(&r);
    assert_eq!(certify(&happy()).status, before); // publishing to the registry never mutates the result
}

#[test]
fn suspension_and_revocation_records_carry_signed_dated_reason() {
    let s = SuspensionRecord {
        record_id: "rec-1".into(),
        reason_code: ReasonCode::FailTrustInvalid,
        suspended_at: 1_800_000_100,
        signature: "sig".into(),
    };
    let v = RevocationRecord {
        record_id: "rec-1".into(),
        reason_code: ReasonCode::FailRevoked,
        revoked_at: 1_800_000_200,
        signature: "sig".into(),
    };
    assert!(s.suspended_at < v.revoked_at);
    assert!(!s.signature.is_empty() && !v.signature.is_empty());
}
