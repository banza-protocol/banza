//! The closed Technical Registry (ADR-034 §4.6/§14): the ONLY source of validation targets.
//!
//! It resolves `operator_id -> implementation_id -> canonical_origin -> discovery` over a **closed
//! set** and decides eligibility in Rust. The production registry is seeded with exactly ONE operator
//! (`operator-zero`) and ONE implementation (`operator-zero-ref-impl`) — no fictional operators. The
//! resolution/eligibility LOGIC is generic over any `Registry`, so it can be unit-tested with
//! test-only records (multiple/duplicate/removed/revoked/mismatched) without seeding them into the
//! closed production registry.

use crate::model::*;

/// Protocol version this registry can validate targets for. There is a single protocol version (v1.0);
/// its canonical form is the semver string "1.0.0" (the form the reference implementation declares).
pub const SUPPORTED_PROTOCOL_VERSIONS: &[&str] = &["1.0.0"];
/// Environments eligible for endpoint-originated validation (never production / real-money).
pub const SUPPORTED_ENVIRONMENTS: &[&str] = &["sandbox", "demo"];
/// Conformance profiles the registry recognises.
pub const SUPPORTED_PROFILES: &[&str] = &["L0", "L1", "L2", "L3", "L4"];

/// The canonical reference operator's public origin (ADR-035). Not a hard protocol dependency — it is
/// the initial canonical *example* implementation, validated through the same secure path as any other.
pub const REFERENCE_ORIGIN: &str = "https://zero.banza.network";

/// A closed set of operator + implementation records.
#[derive(Debug, Clone)]
pub struct Registry {
    operators: Vec<OperatorRecord>,
    implementations: Vec<ImplementationRecord>,
}

impl Registry {
    pub fn from_records(
        operators: Vec<OperatorRecord>,
        implementations: Vec<ImplementationRecord>,
    ) -> Self {
        Registry {
            operators,
            implementations,
        }
    }

    pub fn operators(&self) -> &[OperatorRecord] {
        &self.operators
    }

    pub fn implementations(&self) -> &[ImplementationRecord] {
        &self.implementations
    }

    /// Resolve a target: operator_id -> implementation_id -> canonical_origin -> discovery, applying
    /// every eligibility rule (ADR-034 §14). Returns the resolved target or a typed reason.
    pub fn resolve(
        &self,
        operator_id: &str,
        implementation_id: &str,
    ) -> Result<ResolvedTarget, ResolutionReason> {
        // --- Operator resolution ---
        let ops: Vec<&OperatorRecord> = self
            .operators
            .iter()
            .filter(|o| o.operator_id == operator_id)
            .collect();
        if ops.is_empty() {
            return Err(ResolutionReason::UnknownOperator);
        }
        if ops.len() > 1 {
            return Err(ResolutionReason::DuplicateOperator);
        }
        let operator = ops[0];
        match operator.publication_status {
            PublicationStatus::Removed => return Err(ResolutionReason::OperatorRemoved),
            PublicationStatus::Revoked => return Err(ResolutionReason::OperatorRevoked),
            PublicationStatus::Unpublished => return Err(ResolutionReason::OperatorUnpublished),
            PublicationStatus::Published => {}
        }

        // --- Implementation resolution ---
        let impls: Vec<&ImplementationRecord> = self
            .implementations
            .iter()
            .filter(|i| i.implementation_id == implementation_id)
            .collect();
        if impls.is_empty() {
            return Err(ResolutionReason::UnknownImplementation);
        }
        if impls.len() > 1 {
            return Err(ResolutionReason::DuplicateImplementation);
        }
        let imp = impls[0];

        // The implementation must belong to the named operator (and be listed by it).
        if imp.operator_id != operator_id
            || !operator
                .implementation_ids
                .iter()
                .any(|id| id == implementation_id)
        {
            return Err(ResolutionReason::ImplementationOperatorMismatch);
        }

        match imp.publication_status {
            PublicationStatus::Removed => return Err(ResolutionReason::ImplementationRemoved),
            PublicationStatus::Revoked => return Err(ResolutionReason::ImplementationRevoked),
            PublicationStatus::Unpublished => {
                return Err(ResolutionReason::ImplementationUnpublished)
            }
            PublicationStatus::Published => {}
        }

        // --- Origin + compatibility eligibility ---
        let origin = imp.canonical_origin.trim();
        if origin.is_empty() {
            return Err(ResolutionReason::OriginMissing);
        }
        let expected_host = match host_of(origin) {
            Some(h) => h,
            None => return Err(ResolutionReason::OriginMissing),
        };
        if !SUPPORTED_PROTOCOL_VERSIONS.contains(&imp.protocol_version.as_str()) {
            return Err(ResolutionReason::IncompatibleProtocolVersion);
        }
        if !SUPPORTED_ENVIRONMENTS.contains(&imp.environment.as_str()) {
            return Err(ResolutionReason::UnsupportedEnvironment);
        }
        if !SUPPORTED_PROFILES.contains(&imp.profile.as_str()) {
            return Err(ResolutionReason::IncompatibleProfile);
        }

        // --- Build the resolved target (absolute URLs) ---
        let e = &imp.endpoints;
        let endpoints = ResolvedEndpoints {
            discovery: join(origin, &e.discovery),
            manifest: join(origin, &e.manifest),
            key_manifest: join(origin, &e.key_manifest),
            signed_metadata: join(origin, &e.signed_metadata),
            capabilities: join(origin, &e.capabilities),
            conformance: join(origin, &e.conformance),
            revocation: join(origin, &e.revocation),
            federation_metadata: join(origin, &e.federation_metadata),
            federation_manifest: join(origin, &e.federation_manifest),
            evidence_bundle: join(origin, &e.evidence_bundle),
            traces: join(origin, &e.traces),
            ledger: join(origin, &e.ledger),
            payment_qr: join(origin, &e.payment_qr),
            payment_refund: join(origin, &e.payment_refund),
        };

        Ok(ResolvedTarget {
            operator_id: operator.operator_id.clone(),
            operator_display_name: operator.display_name.clone(),
            implementation_id: imp.implementation_id.clone(),
            version: imp.version.clone(),
            protocol_version: imp.protocol_version.clone(),
            profile: imp.profile.clone(),
            environment: imp.environment.clone(),
            capabilities: imp.capabilities.clone(),
            canonical_origin: origin.to_string(),
            expected_host,
            discovery_url: endpoints.discovery.clone(),
            endpoints,
            publication_status: imp.publication_status,
            evidence_refs: imp.evidence_refs.clone(),
        })
    }
}

/// The CLOSED production registry: exactly one operator (`operator-zero`) and one implementation
/// (`operator-zero-ref-impl`). No fictional operators (ADR-034 §4.9).
pub fn production_registry() -> Registry {
    let operator = OperatorRecord {
        operator_id: "operator-zero".into(),
        display_name: "Operador Zero".into(),
        publication_status: PublicationStatus::Published,
        implementation_ids: vec!["operator-zero-ref-impl".into()],
        registry_ref: "banza-technical-registry:operator-zero".into(),
    };
    let implementation = ImplementationRecord {
        implementation_id: "operator-zero-ref-impl".into(),
        operator_id: "operator-zero".into(),
        display_name: "Implementação de referência do Operador Zero".into(),
        version: "0.1.0".into(),
        protocol_version: "1.0.0".into(),
        profile: "L0".into(),
        environment: "sandbox".into(),
        capabilities: vec![
            "qr_payment_demo".into(),
            "refund_demo".into(),
            "reconciliation_demo".into(),
        ],
        canonical_origin: REFERENCE_ORIGIN.into(),
        endpoints: Endpoints::reference(),
        publication_status: PublicationStatus::Published,
        evidence_refs: vec!["adr-067".into(), "adr-068".into()],
    };
    Registry::from_records(vec![operator], vec![implementation])
}

/// Extract the host (no scheme, no port, no path) from an `https://…` origin. Returns `None` for a
/// non-HTTPS or malformed origin (an origin-less/ineligible record). Keeps the crate dependency-free.
pub fn host_of(origin: &str) -> Option<String> {
    let rest = origin.strip_prefix("https://")?;
    let host_port = rest.split('/').next().unwrap_or("");
    // Strip userinfo if any (never expected here) and the port.
    let host_port = host_port.rsplit('@').next().unwrap_or(host_port);
    let host = host_port.split(':').next().unwrap_or("");
    if host.is_empty() {
        return None;
    }
    Some(host.to_string())
}

/// Join an origin with a leading-slash path into an absolute URL.
fn join(origin: &str, path: &str) -> String {
    format!("{}{}", origin.trim_end_matches('/'), path)
}
