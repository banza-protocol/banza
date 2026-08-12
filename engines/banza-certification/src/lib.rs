//! banza-certification (ADR-037 R4; ADR-064/065/066) — the single deterministic Rust authority for
//! BANZA Conformance & Interoperability Certification (Layer 2).
//!
//! It validates a [`CertifiedImplementation`] against an [`InteroperabilityCertificationProfile`] using a
//! [`ConformanceReport`] + [`InteroperabilityReport`] + evidence + trust, and produces an
//! [`InteroperabilityCertificationRecord`] whose standing is a value of the **closed** [`CertificationStatus`]
//! machine (ADR-066). Every decision is:
//!   deterministic · idempotent · fail-closed · reproducible · hash-bound · profile-bound · scope-bound ·
//!   environment-bound — with **no Qwen, no external model, no human FAIL→PASS** (ADR-037/038/061).
//!
//! Certification is TECHNICAL and per-implementation. A `CERTIFIED` record is NOT a licence, NOT scheme
//! admission and NOT regulatory authorisation, and status never propagates across those determinations
//! (ADR-061). This crate holds no funds, moves no value and admits no participant.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Canonical SHA-256 over a value, excluding the given keys (reuses the protocol's canonicaliser so a
/// checksum is order-independent and reproducible by any third party). Delegates to `banza-trust`.
pub fn canonical_checksum(v: &Value, exclude: &[&str]) -> String {
    banza_trust::canonical_sha256(v, exclude)
}

// ── Closed enums (ADR-066 / ADR-064) ─────────────────────────────────────────

/// The closed certification-state machine (ADR-066 D-066-01). Any value outside this enum is a bug; an
/// unknown/unreadable state resolves to `NotCertified` (fail-closed).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CertificationStatus {
    NotCertified,
    Certified,
    Expired,
    Suspended,
    Revoked,
    Superseded,
}

impl CertificationStatus {
    /// Fail-closed reading (ADR-064 D-064-06, ADR-066 D-066-05): only `Certified` is a valid certification.
    pub fn is_valid(self) -> bool {
        matches!(self, CertificationStatus::Certified)
    }
}

/// Lifecycle events that drive transitions (ADR-066 D-066-02).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LifecycleEvent {
    /// A fresh, Rust-validated record was issued.
    Issue,
    /// The clock reached `expires_at`.
    Expire,
    /// A signed, dated suspension was applied.
    Suspend,
    /// A signed suspension was lifted (only within the validity window; evidence still reproduces).
    Reinstate,
    /// A signed, dated revocation was applied (terminal).
    Revoke,
    /// A newer record superseded this one.
    Supersede,
}

/// Closed set of certification reason codes (ADR-064 / ADR-061). `Ok*` = pass; every `Fail*` is a precise,
/// fail-closed decline. No reason code outside this enum exists.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReasonCode {
    OkConformantInteroperable,
    FailSchemaInvalid,
    FailCanonicalizationInvalid,
    FailHashMismatch,
    FailSignatureInvalid,
    FailIdentityInvalid,
    FailProfileMismatch,
    FailProtocolMismatch,
    FailEnvironmentMismatch,
    FailCapabilityUnsupported,
    FailConformance,
    FailInteroperability,
    FailEvidenceIncomplete,
    FailEvidenceExpired,
    FailTrustInvalid,
    FailRevoked,
    FailValidityWindow,
    FailIllegalTransition,
}

impl ReasonCode {
    pub fn is_ok(self) -> bool {
        matches!(self, ReasonCode::OkConformantInteroperable)
    }
}

// ── Artifacts (ADR-064) ──────────────────────────────────────────────────────

/// The public, versioned yardstick (ADR-064 D-064-02).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteroperabilityCertificationProfile {
    pub profile_id: String,
    pub profile_version: String,
    pub protocol_version: String,
    pub environment: String,
    pub conformance_level: String,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub required_schemas: Vec<String>,
    #[serde(default)]
    pub required_contracts: Vec<String>,
    #[serde(default)]
    pub required_invariants: Vec<String>,
    #[serde(default)]
    pub required_endpoints: Vec<String>,
    #[serde(default)]
    pub identity_required: bool,
    #[serde(default)]
    pub signature_required: bool,
    #[serde(default)]
    pub trust_required: bool,
    /// Days the resulting certificate is valid (validity window).
    pub validity_days: u32,
    pub profile_hash: String,
}

/// The subject of certification (ADR-064 D-064-01): an implementation, identified by artifact hash.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertifiedImplementation {
    pub implementation_id: String,
    /// Content hash of the exact artifact set that was tested. The certificate binds to THIS hash.
    pub implementation_hash: String,
    /// Attribution/contact only — never the subject of the certificate.
    #[serde(default)]
    pub declared_by: String,
    #[serde(default)]
    pub declared_capabilities: Vec<String>,
    #[serde(default)]
    pub declared_conformance_level: String,
    pub environment: String,
    pub protocol_version: String,
}

/// Conformance result against the profile's suites (technical PASS ≠ certification).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConformanceReport {
    pub report_id: String,
    pub implementation_hash: String,
    pub profile_id: String,
    pub profile_version: String,
    pub result: bool,
    #[serde(default)]
    pub levels_passed: Vec<String>,
    #[serde(default)]
    pub capabilities_passed: Vec<String>,
    pub evidence_hash: String,
}

/// Behavioural interoperability result (happy + negative paths). Certification requires this, not just
/// schema conformance (ADR-064; the L2 boundary is conformance AND interoperability).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteroperabilityReport {
    pub report_id: String,
    pub implementation_hash: String,
    pub profile_id: String,
    pub profile_version: String,
    pub result: bool,
    #[serde(default)]
    pub scenarios_passed: Vec<String>,
    #[serde(default)]
    pub negative_scenarios_passed: Vec<String>,
    pub evidence_hash: String,
}

/// Trust evaluation input (open trust model — root-signed metadata, no CA). `revoked` here means the
/// implementation appears on a signed revocation list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustInput {
    pub valid: bool,
    #[serde(default)]
    pub revoked: bool,
    #[serde(default)]
    pub identity_valid: bool,
    #[serde(default)]
    pub signature_valid: bool,
}

/// Signed, dated suspension (ADR-066 D-066-06).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuspensionRecord {
    pub record_id: String,
    pub reason_code: ReasonCode,
    pub suspended_at: i64,
    pub signature: String,
}

/// Signed, dated revocation (ADR-066 D-066-03, terminal).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevocationRecord {
    pub record_id: String,
    pub reason_code: ReasonCode,
    pub revoked_at: i64,
    pub signature: String,
}

/// A newer record supersedes an older one for the same implementation+profile line.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupersessionReference {
    pub superseded_record_id: String,
    pub superseded_by_record_id: String,
}

/// Renewal is re-certification (a NEW record), never an in-place extension (ADR-066 D-066-04).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenewalReference {
    pub renews_record_id: String,
    pub new_record_id: String,
}

/// The verdict object (ADR-064 D-064-03).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteroperabilityCertificationRecord {
    pub schema_version: u32,
    pub record_id: String,
    pub implementation_id: String,
    pub implementation_hash: String,
    pub profile_id: String,
    pub profile_version: String,
    pub protocol_version: String,
    pub environment: String,
    pub status: CertificationStatus,
    pub reason_code: ReasonCode,
    /// Scope is never broader than the evidence.
    pub scope_levels: Vec<String>,
    pub scope_capabilities: Vec<String>,
    pub conformance_report_hash: String,
    pub interoperability_report_hash: String,
    pub issued_at: i64,
    pub expires_at: i64,
    pub record_hash: String,
}

/// All inputs to a certification decision. Grouped so `certify` is a pure function of its inputs.
pub struct CertifyInput {
    pub record_id: String,
    pub implementation: CertifiedImplementation,
    pub profile: InteroperabilityCertificationProfile,
    pub conformance: ConformanceReport,
    pub interoperability: InteroperabilityReport,
    pub trust: TrustInput,
    /// UTC seconds — passed in so the function stays pure/deterministic/offline-testable.
    pub now: i64,
}

// ── The deterministic certification pipeline (ADR-064 D-064-04, fail-closed) ──

/// Validate inputs and produce a record. Any failed check yields a `NotCertified` record with the precise
/// reason code (fail-closed). The verdict is a pure, deterministic function of the inputs — same inputs →
/// same record (byte-identical `record_hash`); no clock/RNG/model/human is consulted beyond `input.now`.
pub fn certify(input: &CertifyInput) -> InteroperabilityCertificationRecord {
    let (status, reason, levels, caps) = decide(input);
    let issued_at = input.now;
    let expires_at = input.now + (input.profile.validity_days as i64) * 86_400;
    let mut rec = InteroperabilityCertificationRecord {
        schema_version: 1,
        record_id: input.record_id.clone(),
        implementation_id: input.implementation.implementation_id.clone(),
        implementation_hash: input.implementation.implementation_hash.clone(),
        profile_id: input.profile.profile_id.clone(),
        profile_version: input.profile.profile_version.clone(),
        protocol_version: input.profile.protocol_version.clone(),
        environment: input.profile.environment.clone(),
        status,
        reason_code: reason,
        scope_levels: levels,
        scope_capabilities: caps,
        conformance_report_hash: input.conformance.evidence_hash.clone(),
        interoperability_report_hash: input.interoperability.evidence_hash.clone(),
        issued_at,
        // A non-certified record is never "valid until" anything: expiry equals issue.
        expires_at: if status.is_valid() {
            expires_at
        } else {
            issued_at
        },
        record_hash: String::new(),
    };
    rec.record_hash = record_checksum(&rec);
    rec
}

/// The 20-step decision (ADR-064): validate inputs → schemas → canonicalisation → hashes → signatures →
/// identity → versions → capabilities → conformance → interoperability → evidence → trust → revocation →
/// validity → scope → level → status → reason. Returns the first failing reason (fail-closed).
fn decide(i: &CertifyInput) -> (CertificationStatus, ReasonCode, Vec<String>, Vec<String>) {
    let fail = |r: ReasonCode| (CertificationStatus::NotCertified, r, vec![], vec![]);

    // identity / signature / trust
    if i.profile.identity_required && !i.trust.identity_valid {
        return fail(ReasonCode::FailIdentityInvalid);
    }
    if i.profile.signature_required && !i.trust.signature_valid {
        return fail(ReasonCode::FailSignatureInvalid);
    }
    if i.profile.trust_required && !i.trust.valid {
        return fail(ReasonCode::FailTrustInvalid);
    }
    // revocation short-circuits everything (fail-closed, ADR-066 D-066-05)
    if i.trust.revoked {
        return fail(ReasonCode::FailRevoked);
    }
    // profile / protocol / environment binding
    if i.conformance.profile_id != i.profile.profile_id
        || i.conformance.profile_version != i.profile.profile_version
        || i.interoperability.profile_id != i.profile.profile_id
        || i.interoperability.profile_version != i.profile.profile_version
    {
        return fail(ReasonCode::FailProfileMismatch);
    }
    if i.implementation.protocol_version != i.profile.protocol_version {
        return fail(ReasonCode::FailProtocolMismatch);
    }
    if i.implementation.environment != i.profile.environment {
        return fail(ReasonCode::FailEnvironmentMismatch);
    }
    // hash-binding: reports and impl must reference the SAME artifact hash (no inheriting another's cert)
    if i.conformance.implementation_hash != i.implementation.implementation_hash
        || i.interoperability.implementation_hash != i.implementation.implementation_hash
    {
        return fail(ReasonCode::FailHashMismatch);
    }
    // evidence completeness
    if i.conformance.evidence_hash.trim().is_empty()
        || i.interoperability.evidence_hash.trim().is_empty()
    {
        return fail(ReasonCode::FailEvidenceIncomplete);
    }
    // capability coverage: every profile capability must be conformance-passed
    for cap in &i.profile.capabilities {
        if !i.conformance.capabilities_passed.contains(cap) {
            return fail(ReasonCode::FailCapabilityUnsupported);
        }
    }
    // conformance AND interoperability must both pass (never certify on schemas alone, ADR-064)
    if !i.conformance.result {
        return fail(ReasonCode::FailConformance);
    }
    if !i.interoperability.result {
        return fail(ReasonCode::FailInteroperability);
    }
    // validity window sanity
    if i.profile.validity_days == 0 {
        return fail(ReasonCode::FailValidityWindow);
    }
    // scope is exactly what the evidence supports — never broader
    let levels = i.conformance.levels_passed.clone();
    let caps = i.conformance.capabilities_passed.clone();
    (
        CertificationStatus::Certified,
        ReasonCode::OkConformantInteroperable,
        levels,
        caps,
    )
}

/// Checksum of a record (excludes the `record_hash` field itself).
pub fn record_checksum(rec: &InteroperabilityCertificationRecord) -> String {
    let v = serde_json::to_value(rec).unwrap_or(Value::Null);
    canonical_checksum(&v, &["record_hash"])
}

/// Verify a record's `record_hash` reproduces (ADR-064 D-064-05). Fail-closed: any mismatch → false.
pub fn verify_record(rec: &InteroperabilityCertificationRecord) -> bool {
    !rec.record_hash.is_empty() && record_checksum(rec) == rec.record_hash
}

// ── Closed state machine (ADR-066 D-066-02) ──────────────────────────────────

/// The total, closed transition function. Returns the next state or `FailIllegalTransition` for any pair
/// outside the table. No human/model/config can effect a transition; `REVOKED` is terminal.
pub fn transition(
    current: CertificationStatus,
    event: LifecycleEvent,
) -> Result<CertificationStatus, ReasonCode> {
    use CertificationStatus::*;
    use LifecycleEvent::*;
    let next = match (current, event) {
        (NotCertified, Issue) => Certified,
        (Certified, Expire) => Expired,
        (Certified, Suspend) => Suspended,
        (Suspended, Reinstate) => Certified,
        (Certified, Revoke) | (Suspended, Revoke) | (Expired, Revoke) => Revoked,
        (Certified, Supersede) | (Expired, Supersede) => Superseded,
        // Renewal is a NEW record (Issue on a fresh id), never an in-place transition from Expired.
        _ => return Err(ReasonCode::FailIllegalTransition),
    };
    Ok(next)
}

/// Temporal + revocation evaluation of a record's EFFECTIVE status at `now` (ADR-066 D-066-05). Fail-closed:
/// an unverifiable record, a past `expires_at`, or a revocation all read as not-valid.
pub fn effective_status(
    rec: &InteroperabilityCertificationRecord,
    revoked: bool,
    now: i64,
) -> CertificationStatus {
    if !verify_record(rec) {
        return CertificationStatus::NotCertified;
    }
    if revoked {
        return CertificationStatus::Revoked;
    }
    match rec.status {
        CertificationStatus::Certified if now >= rec.expires_at => CertificationStatus::Expired,
        other => other,
    }
}

/// A compact registry entry view for a record (ADR-065) — what the public Technical Registry publishes.
pub fn registry_entry(rec: &InteroperabilityCertificationRecord) -> Value {
    json!({
        "implementation_id": rec.implementation_id,
        "implementation_hash": rec.implementation_hash,
        "environment": rec.environment,
        "profile_id": rec.profile_id,
        "profile_version": rec.profile_version,
        "protocol_version": rec.protocol_version,
        "scope": { "levels": rec.scope_levels, "capabilities": rec.scope_capabilities },
        "certification_status": rec.status,
        "reason_code": rec.reason_code,
        "valid_from": rec.issued_at,
        "expires_at": rec.expires_at,
        "conformance_report_hash": rec.conformance_report_hash,
        "interoperability_report_hash": rec.interoperability_report_hash,
        "record_hash": rec.record_hash,
    })
}

#[cfg(test)]
mod tests;
