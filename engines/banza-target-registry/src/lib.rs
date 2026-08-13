//! banza-target-registry (M2.19G.1, ADR-038) — the CLOSED Technical Registry domain model plus the
//! resolution / eligibility / verdict logic for **endpoint-originated operator validation**.
//!
//! It answers, in Rust: *which operator+implementation is an eligible validation target, what is its
//! canonical origin and its published endpoint map, and — after the secure fetcher retrieves and the
//! decision engines judge each artifact — what is the aggregate Certification **Readiness**?*
//!
//! Boundaries (ADR-038 §4.10, ADR-004): resolution proves eligibility only. Presence in the registry
//! NEVER implies admission into any operational scheme, regulatory authorisation, or the ability to
//! move funds. Certification Readiness is `READY`/`BLOCKED` and is never a Certification Record and
//! never `CERTIFIED`. Rust decides; TypeScript never decides; there is no model call anywhere here.

use serde_json::{json, Value};

pub mod model;
pub mod registry;
pub mod verdict;

#[cfg(feature = "wasm")]
mod wasm;

pub use model::*;
pub use registry::{production_registry, Registry};

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "Resolução no Registo Técnico prova elegibilidade — não é admissão, não é autorização e não movimenta dinheiro real.";

fn parse(input: &str) -> Value {
    serde_json::from_str(input).unwrap_or(Value::Null)
}

/// Resolve a target against the CLOSED production registry. Returns `{ ok, target }` on success or
/// `{ ok:false, eligible:false, reason, … }` with a typed reason on any ineligibility.
pub fn resolve_json(operator_id: &str, implementation_id: &str) -> String {
    let reg = production_registry();
    match reg.resolve(operator_id, implementation_id) {
        Ok(target) => json!({
            "ok": true,
            "eligible": true,
            "target": target,
            "boundary": BOUNDARY,
            "tool": "banza-target-registry",
            "tool_version": TOOL_VERSION,
        })
        .to_string(),
        Err(reason) => json!({
            "ok": false,
            "eligible": false,
            "operator_id": operator_id,
            "implementation_id": implementation_id,
            "reason": reason.as_str(),
            "boundary": BOUNDARY,
            "tool": "banza-target-registry",
            "tool_version": TOOL_VERSION,
        })
        .to_string(),
    }
}

/// The closed catalogue: the operators + implementations available as validation targets. Eligibility
/// is annotated per implementation (a listing entry is not admission).
pub fn catalogue_json() -> String {
    let reg = production_registry();
    let operators: Vec<Value> = reg
        .operators()
        .iter()
        .map(|o| {
            let impls: Vec<Value> = reg
                .implementations()
                .iter()
                .filter(|i| i.operator_id == o.operator_id)
                .map(|i| {
                    let eligible = reg.resolve(&o.operator_id, &i.implementation_id).is_ok();
                    json!({
                        "implementation_id": i.implementation_id,
                        "display_name": i.display_name,
                        "version": i.version,
                        "protocol_version": i.protocol_version,
                        "profile": i.profile,
                        "environment": i.environment,
                        "capabilities": i.capabilities,
                        "canonical_origin": i.canonical_origin,
                        "publication_status": i.publication_status.as_str(),
                        "eligible": eligible,
                    })
                })
                .collect();
            json!({
                "operator_id": o.operator_id,
                "display_name": o.display_name,
                "publication_status": o.publication_status.as_str(),
                "registry_ref": o.registry_ref,
                "implementations": impls,
            })
        })
        .collect();
    json!({
        "registry": "banza-technical-registry",
        "closed": true,
        "operators": operators,
        "note": "Closed technical target registry. Presence is not admission, authorisation, or the ability to move funds.",
        "tool": "banza-target-registry",
        "tool_version": TOOL_VERSION,
    })
    .to_string()
}

/// Validate a fetched discovery document against a resolved target (step 1).
pub fn validate_discovery_json(resolved_target_json: &str, discovery_json: &str) -> String {
    verdict::validate_discovery(&parse(resolved_target_json), &parse(discovery_json)).to_string()
}

/// Map a decision engine's raw output onto the canonical step status + reason codes.
pub fn step_status_json(step: &str, engine_output_json: &str) -> String {
    verdict::step_status(step, &parse(engine_output_json)).to_string()
}

/// Aggregate the technical step verdicts into a Certification Readiness record (READY/BLOCKED),
/// scoped to the declared `profile` — only REQUIRED-for-profile steps count; NOT_APPLICABLE excluded.
pub fn certification_readiness_json(step_verdicts_json: &str, profile: &str) -> String {
    verdict::certification_readiness(&parse(step_verdicts_json), profile).to_string()
}

/// The profile→step applicability map (REQUIRED / OPTIONAL / NOT_APPLICABLE) for the eight technical
/// steps. The single Rust-decided source for what a profile requires (ADR-039 levels, ADR-039).
pub fn profile_applicability_json(profile: &str) -> String {
    verdict::profile_applicability(profile).to_string()
}

pub fn tool_version_json() -> String {
    json!({
        "tool": "banza-target-registry",
        "tool_version": TOOL_VERSION,
        "supported_protocol_versions": registry::SUPPORTED_PROTOCOL_VERSIONS,
        "supported_environments": registry::SUPPORTED_ENVIRONMENTS,
        "supported_profiles": registry::SUPPORTED_PROFILES,
        "boundary": BOUNDARY,
    })
    .to_string()
}

// ---------------------------------------------------------------------------------------------------
// Unit tests (ADR-038 §38 — model + registry). Resolution/eligibility logic exercised over test-only
// registries; the closed production registry is asserted to hold exactly one operator + one impl.
// ---------------------------------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn ep() -> Endpoints {
        Endpoints::reference()
    }

    fn op(id: &str, status: PublicationStatus, impls: &[&str]) -> OperatorRecord {
        OperatorRecord {
            operator_id: id.into(),
            display_name: format!("Test {id}"),
            publication_status: status,
            implementation_ids: impls.iter().map(|s| s.to_string()).collect(),
            registry_ref: format!("test:{id}"),
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn imp(
        id: &str,
        operator: &str,
        status: PublicationStatus,
        origin: &str,
        proto: &str,
        env: &str,
        profile: &str,
    ) -> ImplementationRecord {
        ImplementationRecord {
            implementation_id: id.into(),
            operator_id: operator.into(),
            display_name: format!("Impl {id}"),
            version: "0.1.0".into(),
            protocol_version: proto.into(),
            profile: profile.into(),
            environment: env.into(),
            capabilities: vec!["qr_payment_demo".into()],
            canonical_origin: origin.into(),
            endpoints: ep(),
            publication_status: status,
            evidence_refs: vec![],
        }
    }

    #[test]
    fn resolves_single_implementation() {
        let reg = Registry::from_records(
            vec![op(
                "operator-zero",
                PublicationStatus::Published,
                &["impl-a"],
            )],
            vec![imp(
                "impl-a",
                "operator-zero",
                PublicationStatus::Published,
                "https://zero.banza.network",
                "1.0.0",
                "sandbox",
                "L0",
            )],
        );
        let t = reg.resolve("operator-zero", "impl-a").expect("eligible");
        assert_eq!(t.expected_host, "zero.banza.network");
        assert_eq!(t.canonical_origin, "https://zero.banza.network");
        assert_eq!(
            t.endpoints.manifest,
            "https://zero.banza.network/.well-known/banza/operator.json"
        );
        assert_eq!(t.discovery_url, "https://zero.banza.network/discovery.json");
    }

    #[test]
    fn resolves_correct_one_of_multiple_implementations() {
        let reg = Registry::from_records(
            vec![op(
                "operator-zero",
                PublicationStatus::Published,
                &["impl-a", "impl-b"],
            )],
            vec![
                imp(
                    "impl-a",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
                imp(
                    "impl-b",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://b.banza.network",
                    "1.0.0",
                    "demo",
                    "L2",
                ),
            ],
        );
        let a = reg.resolve("operator-zero", "impl-a").unwrap();
        assert_eq!(a.expected_host, "a.banza.network");
        let b = reg.resolve("operator-zero", "impl-b").unwrap();
        assert_eq!(b.expected_host, "b.banza.network");
        assert_eq!(b.profile, "L2");
    }

    #[test]
    fn duplicate_implementation_rejected() {
        let reg = Registry::from_records(
            vec![op("operator-zero", PublicationStatus::Published, &["dup"])],
            vec![
                imp(
                    "dup",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
                imp(
                    "dup",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://b.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
            ],
        );
        assert_eq!(
            reg.resolve("operator-zero", "dup").unwrap_err(),
            ResolutionReason::DuplicateImplementation
        );
    }

    #[test]
    fn implementation_wrong_operator_rejected() {
        let reg = Registry::from_records(
            vec![
                op("operator-zero", PublicationStatus::Published, &["impl-a"]),
                op("operator-two", PublicationStatus::Published, &["impl-b"]),
            ],
            vec![imp(
                "impl-b",
                "operator-two",
                PublicationStatus::Published,
                "https://b.banza.network",
                "1.0.0",
                "sandbox",
                "L0",
            )],
        );
        // impl-b belongs to operator-two; asking for it under operator-zero is a mismatch.
        assert_eq!(
            reg.resolve("operator-zero", "impl-b").unwrap_err(),
            ResolutionReason::ImplementationOperatorMismatch
        );
    }

    #[test]
    fn environment_and_profile_incompatible_rejected() {
        let reg = Registry::from_records(
            vec![op(
                "operator-zero",
                PublicationStatus::Published,
                &["prod", "badprofile"],
            )],
            vec![
                imp(
                    "prod",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "production",
                    "L0",
                ),
                imp(
                    "badprofile",
                    "operator-zero",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L9",
                ),
            ],
        );
        assert_eq!(
            reg.resolve("operator-zero", "prod").unwrap_err(),
            ResolutionReason::UnsupportedEnvironment
        );
        assert_eq!(
            reg.resolve("operator-zero", "badprofile").unwrap_err(),
            ResolutionReason::IncompatibleProfile
        );
    }

    #[test]
    fn incompatible_protocol_version_rejected() {
        let reg = Registry::from_records(
            vec![op("operator-zero", PublicationStatus::Published, &["old"])],
            vec![imp(
                "old",
                "operator-zero",
                PublicationStatus::Published,
                "https://a.banza.network",
                "0.9.0",
                "sandbox",
                "L0",
            )],
        );
        assert_eq!(
            reg.resolve("operator-zero", "old").unwrap_err(),
            ResolutionReason::IncompatibleProtocolVersion
        );
    }

    #[test]
    fn removed_revoked_unpublished_and_originless_rejected() {
        let reg = Registry::from_records(
            vec![
                op("removed-op", PublicationStatus::Removed, &["i"]),
                op("revoked-op", PublicationStatus::Revoked, &["i2"]),
                op(
                    "live-op",
                    PublicationStatus::Published,
                    &["revoked-impl", "noorigin"],
                ),
            ],
            vec![
                imp(
                    "i",
                    "removed-op",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
                imp(
                    "i2",
                    "revoked-op",
                    PublicationStatus::Published,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
                imp(
                    "revoked-impl",
                    "live-op",
                    PublicationStatus::Revoked,
                    "https://a.banza.network",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
                imp(
                    "noorigin",
                    "live-op",
                    PublicationStatus::Published,
                    "",
                    "1.0.0",
                    "sandbox",
                    "L0",
                ),
            ],
        );
        assert_eq!(
            reg.resolve("removed-op", "i").unwrap_err(),
            ResolutionReason::OperatorRemoved
        );
        assert_eq!(
            reg.resolve("revoked-op", "i2").unwrap_err(),
            ResolutionReason::OperatorRevoked
        );
        assert_eq!(
            reg.resolve("live-op", "revoked-impl").unwrap_err(),
            ResolutionReason::ImplementationRevoked
        );
        assert_eq!(
            reg.resolve("live-op", "noorigin").unwrap_err(),
            ResolutionReason::OriginMissing
        );
    }

    #[test]
    fn unknown_operator_and_implementation_rejected() {
        let reg = production_registry();
        assert_eq!(
            reg.resolve("nope", "operator-zero-ref-impl").unwrap_err(),
            ResolutionReason::UnknownOperator
        );
        assert_eq!(
            reg.resolve("operator-zero", "nope").unwrap_err(),
            ResolutionReason::UnknownImplementation
        );
    }

    #[test]
    fn closed_production_registry_is_operator_zero_only() {
        let reg = production_registry();
        assert_eq!(reg.operators().len(), 1);
        assert_eq!(reg.implementations().len(), 1);
        let t = reg
            .resolve("operator-zero", "operator-zero-ref-impl")
            .expect("reference target is eligible");
        assert_eq!(t.canonical_origin, "https://zero.banza.network");
        assert_eq!(t.expected_host, "zero.banza.network");
        assert_eq!(
            t.endpoints.discovery,
            "https://zero.banza.network/discovery.json"
        );
        assert_eq!(
            t.endpoints.federation_manifest,
            "https://zero.banza.network/federation-metadata.json"
        );
    }

    #[test]
    fn resolve_json_success_and_typed_failure() {
        let ok: Value =
            serde_json::from_str(&resolve_json("operator-zero", "operator-zero-ref-impl")).unwrap();
        assert_eq!(ok["ok"], true);
        assert_eq!(ok["target"]["expected_host"], "zero.banza.network");

        let bad: Value =
            serde_json::from_str(&resolve_json("ghost", "operator-zero-ref-impl")).unwrap();
        assert_eq!(bad["ok"], false);
        assert_eq!(bad["reason"], "unknown_operator");
        assert_eq!(bad["eligible"], false);
    }

    #[test]
    fn certification_readiness_never_certifies() {
        let all_ok = json!([
            {"step":"manifest","status":"VERIFIED"},
            {"step":"keys","status":"VERIFIED"},
            {"step":"conformance","status":"VERIFIED"},
            {"step":"interoperability","status":"VERIFIED"},
            {"step":"trust","status":"VERIFIED"},
            {"step":"federation","status":"VERIFIED"},
            {"step":"evidence","status":"VERIFIED"},
            {"step":"discovery","status":"VERIFIED"}
        ]);
        let r: Value =
            serde_json::from_str(&certification_readiness_json(&all_ok.to_string(), "L4")).unwrap();
        assert_eq!(r["readiness"], "READY");
        assert_eq!(r["certification_status"], "NOT_CERTIFIED");
        assert_eq!(r["certified"], false);
        assert_ne!(r["readiness"], "CERTIFIED");

        let mixed = json!([
            {"step":"manifest","status":"VERIFIED"},
            {"step":"conformance","status":"PENDING"},
            {"step":"trust","status":"FAILED"}
        ]);
        let r2: Value =
            serde_json::from_str(&certification_readiness_json(&mixed.to_string(), "L0")).unwrap();
        assert_eq!(r2["readiness"], "BLOCKED");
        assert_eq!(r2["certification_status"], "NOT_CERTIFIED");
    }

    #[test]
    fn l0_readiness_excludes_not_applicable_l2_l3_steps() {
        // OZ-3 (ADR-039): an L0 implementation whose REQUIRED steps are all VERIFIED is READY even when
        // the L2 (interoperability) and L3 (federation) steps are FAILED — those steps are NOT_APPLICABLE
        // to L0 and must never contribute a technical failure to readiness. Never a forced green: the
        // REQUIRED steps are genuinely VERIFIED.
        let l0 = json!([
            {"step":"discovery","status":"VERIFIED"},
            {"step":"manifest","status":"VERIFIED"},
            {"step":"keys","status":"VERIFIED"},
            {"step":"conformance","status":"VERIFIED"},
            {"step":"interoperability","status":"FAILED"},
            {"step":"trust","status":"VERIFIED"},
            {"step":"federation","status":"FAILED"},
            {"step":"evidence","status":"VERIFIED"}
        ]);
        let r: Value =
            serde_json::from_str(&certification_readiness_json(&l0.to_string(), "L0")).unwrap();
        assert_eq!(
            r["readiness"], "READY",
            "L0 required steps all VERIFIED ⇒ READY"
        );
        assert_eq!(r["certification_status"], "NOT_CERTIFIED");
        assert_eq!(r["required_steps_evaluated"], 6);
        let na = r["not_applicable_steps"].as_array().unwrap();
        assert!(na.iter().any(|s| s == "interoperability") && na.iter().any(|s| s == "federation"));
        // The SAME verdicts at L2 are NOT ready — interoperability becomes REQUIRED and is FAILED.
        let r2: Value =
            serde_json::from_str(&certification_readiness_json(&l0.to_string(), "L2")).unwrap();
        assert_eq!(
            r2["readiness"], "BLOCKED",
            "L2 requires interoperability, which is FAILED"
        );
    }

    #[test]
    fn profile_applicability_map_is_profile_scoped() {
        let l0: Value = serde_json::from_str(&profile_applicability_json("L0")).unwrap();
        assert_eq!(l0["applicability"]["interoperability"], "NOT_APPLICABLE");
        assert_eq!(l0["applicability"]["federation"], "NOT_APPLICABLE");
        assert_eq!(l0["applicability"]["keys"], "REQUIRED");
        assert_eq!(l0["applicability"]["evidence"], "REQUIRED");
        let l3: Value = serde_json::from_str(&profile_applicability_json("L3")).unwrap();
        assert_eq!(l3["applicability"]["interoperability"], "REQUIRED");
        assert_eq!(l3["applicability"]["federation"], "REQUIRED");
    }

    #[test]
    fn evidence_ready_for_technical_review_is_verified() {
        // A valid banza-evidence-bundle/1 declares readiness READY_FOR_TECHNICAL_REVIEW — the artifact
        // check is VERIFIED (valid + complete for review), NOT certification. Invalid stays FAILED.
        let ok: Value = serde_json::from_str(&step_status_json(
            "evidence",
            &json!({"ok":true,"readiness":"READY_FOR_TECHNICAL_REVIEW"}).to_string(),
        ))
        .unwrap();
        assert_eq!(ok["status"], "VERIFIED");
        let bad: Value = serde_json::from_str(&step_status_json(
            "evidence",
            &json!({"ok":false,"readiness":""}).to_string(),
        ))
        .unwrap();
        assert_eq!(bad["status"], "FAILED");
    }

    #[test]
    fn step_status_maps_engine_verdicts() {
        let m: Value = serde_json::from_str(&step_status_json(
            "manifest",
            &json!({"status":"VALID"}).to_string(),
        ))
        .unwrap();
        assert_eq!(m["status"], "VERIFIED");

        let tr: Value = serde_json::from_str(&step_status_json(
            "trust",
            &json!({"trust_status":"TRUST_MISSING_REGISTRY_ENTRY"}).to_string(),
        ))
        .unwrap();
        assert_eq!(tr["status"], "PENDING");

        let l2: Value = serde_json::from_str(&step_status_json(
            "interoperability",
            &json!({"status":"L2_INVALID"}).to_string(),
        ))
        .unwrap();
        assert_eq!(l2["status"], "FAILED");
    }

    #[test]
    fn validate_discovery_binds_to_origin() {
        let target = json!({
            "operator_id":"operator-zero",
            "implementation_id":"operator-zero-ref-impl",
            "canonical_origin":"https://zero.banza.network",
            "protocol_version":"1.0.0",
            "expected_host":"zero.banza.network"
        });
        let good = json!({
            "operator_id":"operator-zero",
            "implementation_id":"operator-zero-ref-impl",
            "canonical_origin":"https://zero.banza.network",
            "protocol_version":"1.0.0",
            "endpoints": {"manifest_url":"https://zero.banza.network/.well-known/banza/operator.json"}
        });
        let v: Value = serde_json::from_str(&validate_discovery_json(
            &target.to_string(),
            &good.to_string(),
        ))
        .unwrap();
        assert_eq!(v["ok"], true);
        assert_eq!(v["status"], "DISCOVERY_OK");

        let evil = json!({
            "operator_id":"operator-zero",
            "implementation_id":"operator-zero-ref-impl",
            "canonical_origin":"https://zero.banza.network",
            "protocol_version":"1.0.0",
            "endpoints": {"manifest_url":"https://evil.example.com/manifest.json"}
        });
        let v2: Value = serde_json::from_str(&validate_discovery_json(
            &target.to_string(),
            &evil.to_string(),
        ))
        .unwrap();
        assert_eq!(v2["ok"], false);
    }
}
