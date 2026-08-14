//! Verdict interpretation — the ONLY place a step verdict or the certification readiness is decided.
//!
//! ADR-034: **Rust decides every verdict; Qwen only explains; TypeScript never decides.** The decision
//! engines each return their own status (`VALID`, `TRUST_VALID`, `PASS`, `L2_READY_…`, …); this module
//! maps that engine status onto the canonical journey step status and aggregates the technical steps
//! into a Certification **Readiness** — which is `READY` or `BLOCKED` and is **never** a Certification
//! Record and **never** `CERTIFIED` (ADR-034 §21 step 9, §4.10).

use serde_json::{json, Value};

/// Canonical journey step status.
pub const VERIFIED: &str = "VERIFIED";
pub const PENDING: &str = "PENDING";
pub const FAILED: &str = "FAILED";
pub const BLOCKED: &str = "BLOCKED";

fn s<'a>(v: &'a Value, k: &str) -> &'a str {
    v.get(k).and_then(|x| x.as_str()).unwrap_or("")
}

/// Decide the canonical step status + reason codes from a decision engine's raw output. Pure and
/// deterministic — a lookup over the engine's own declared status, never a fresh judgement.
pub fn step_status(step: &str, engine_output: &Value) -> Value {
    let (status, engine_status, mut reasons): (&str, String, Vec<String>) = match step {
        "discovery" => {
            let st = s(engine_output, "status");
            let mapped = match st {
                "DISCOVERY_OK" => VERIFIED,
                "DISCOVERY_INCOMPLETE" => PENDING,
                _ => FAILED,
            };
            (mapped, st.to_string(), vec![format!("DISCOVERY:{st}")])
        }
        "manifest" => {
            let st = s(engine_output, "status");
            let mapped = match st {
                "VALID" => VERIFIED,
                "INCOMPLETE" => PENDING,
                _ => FAILED,
            };
            (mapped, st.to_string(), vec![format!("MANIFEST_{st}")])
        }
        "keys" | "trust" => {
            let st = s(engine_output, "trust_status");
            let mapped = match st {
                "TRUST_VALID" => VERIFIED,
                s if s.starts_with("TRUST_MISSING") || s == "TRUST_INCOMPLETE" => PENDING,
                _ => FAILED,
            };
            (mapped, st.to_string(), vec![st.to_string()])
        }
        "conformance" => {
            // A malformed / non-report published evidence document -> engine returns ok:false + error.
            if engine_output.get("ok").and_then(|v| v.as_bool()) == Some(false) {
                let err = s(engine_output, "error");
                (
                    PENDING,
                    "INCOMPLETE_EVIDENCE".to_string(),
                    vec![
                        "CONFORMANCE_EVIDENCE_INCOMPLETE".to_string(),
                        format!("ENGINE:{err}"),
                    ],
                )
            } else {
                let st = s(engine_output, "status");
                let mapped = match st {
                    "PASS" => VERIFIED,
                    "WARN" => PENDING,
                    _ => FAILED,
                };
                (mapped, st.to_string(), vec![format!("L0_{st}")])
            }
        }
        "interoperability" => {
            let st = s(engine_output, "status");
            let mapped = match st {
                "L2_READY_FOR_TECHNICAL_REVIEW" => VERIFIED,
                "L2_INCOMPLETE" => PENDING,
                _ => FAILED,
            };
            (mapped, st.to_string(), vec![st.to_string()])
        }
        "federation" => {
            let st = s(engine_output, "status");
            let mapped = match st {
                "L3_READY_FOR_TECHNICAL_REVIEW" => VERIFIED,
                "L3_INCOMPLETE" => PENDING,
                _ => FAILED,
            };
            (mapped, st.to_string(), vec![st.to_string()])
        }
        "evidence" => {
            let ok = engine_output.get("ok").and_then(|v| v.as_bool()) == Some(true);
            let readiness = s(engine_output, "readiness");
            // A well-formed banza-evidence-bundle/1 whose declared readiness is READY_FOR_TECHNICAL_REVIEW
            // (schema valid, hash integrity, no forbidden claims, all boundary flags) is a VERIFIED
            // artifact check — the bundle is complete and ready for review. This asserts artifact validity
            // ONLY; it is NOT certification (certification_status stays NOT_CERTIFIED, step 9 never
            // CERTIFIED). Bare "READY" is accepted too for forward-compat; the engine emits the fuller
            // READY_FOR_TECHNICAL_REVIEW. An invalid bundle (ok:false) is still FAILED — never forced green.
            let mapped = if !ok {
                FAILED
            } else if readiness == "READY" || readiness == "READY_FOR_TECHNICAL_REVIEW" {
                VERIFIED
            } else {
                PENDING
            };
            (
                mapped,
                readiness.to_string(),
                vec![
                    format!("EVIDENCE_BUNDLE_{}", if ok { "OK" } else { "INVALID" }),
                    format!("READINESS:{readiness}"),
                ],
            )
        }
        _ => (
            FAILED,
            "UNKNOWN_STEP".to_string(),
            vec!["UNKNOWN_STEP".to_string()],
        ),
    };

    // Surface any explicit engine error list into the reason codes.
    if let Some(errs) = engine_output.get("errors").and_then(|v| v.as_array()) {
        for e in errs.iter().filter_map(|v| v.as_str()) {
            reasons.push(format!("ERROR:{e}"));
        }
    }

    json!({
        "status": status,
        "engine_status": engine_status,
        "reason_codes": reasons,
    })
}

/// Validate a fetched discovery document against the resolved target (ADR-034 §21 step 1). Checks the
/// identity fields and that the published endpoint map is host-bound to the canonical origin.
pub fn validate_discovery(resolved_target: &Value, discovery: &Value) -> Value {
    let mut checks: Vec<Value> = Vec::new();
    let mut reasons: Vec<String> = Vec::new();
    let mut ok = true;

    let mut check =
        |name: &str, expected: &str, got: &str, reasons: &mut Vec<String>, ok: &mut bool| {
            let pass = !expected.is_empty() && expected == got;
            if !pass {
                *ok = false;
                reasons.push(format!("DISCOVERY_MISMATCH:{name}"));
            }
            checks.push(json!({ "check": name, "expected": expected, "got": got, "pass": pass }));
        };

    check(
        "operator_id",
        s(resolved_target, "operator_id"),
        s(discovery, "operator_id"),
        &mut reasons,
        &mut ok,
    );
    check(
        "implementation_id",
        s(resolved_target, "implementation_id"),
        s(discovery, "implementation_id"),
        &mut reasons,
        &mut ok,
    );
    check(
        "canonical_origin",
        s(resolved_target, "canonical_origin"),
        s(discovery, "canonical_origin"),
        &mut reasons,
        &mut ok,
    );
    check(
        "protocol_version",
        s(resolved_target, "protocol_version"),
        s(discovery, "protocol_version"),
        &mut reasons,
        &mut ok,
    );

    // The discovery endpoint map must be present and host-bound to the expected host.
    let expected_host = s(resolved_target, "expected_host");
    let endpoints_present = discovery
        .get("endpoints")
        .and_then(|v| v.as_object())
        .map(|m| !m.is_empty())
        .unwrap_or(false);
    if !endpoints_present {
        ok = false;
        reasons.push("DISCOVERY_ENDPOINTS_MISSING".to_string());
    } else {
        let mut all_bound = true;
        if let Some(map) = discovery.get("endpoints").and_then(|v| v.as_object()) {
            for (k, v) in map.iter() {
                if let Some(url) = v.as_str() {
                    let bound = url.starts_with(&format!("https://{expected_host}/"))
                        || url == format!("https://{expected_host}");
                    if !bound {
                        all_bound = false;
                        reasons.push(format!("DISCOVERY_ENDPOINT_OFF_ORIGIN:{k}"));
                    }
                }
            }
        }
        checks.push(json!({ "check": "endpoints_host_bound", "expected_host": expected_host, "pass": all_bound }));
        if !all_bound {
            ok = false;
        }
    }

    let status = if ok {
        "DISCOVERY_OK"
    } else if reasons
        .iter()
        .all(|r| r.starts_with("DISCOVERY_ENDPOINT_OFF_ORIGIN"))
    {
        "DISCOVERY_INCOMPLETE"
    } else {
        "DISCOVERY_MISMATCH"
    };
    if ok {
        reasons.push("DISCOVERY_OK".to_string());
    }

    json!({
        "ok": ok,
        "status": status,
        "checks": checks,
        "reason_codes": reasons,
        "tool": "banza-target-registry",
        "tool_version": crate::TOOL_VERSION,
    })
}

/// Applicability of a step to a profile — a dimension ORTHOGONAL to the step's state (ADR-030).
pub const REQUIRED: &str = "REQUIRED";
pub const OPTIONAL: &str = "OPTIONAL";
pub const NOT_APPLICABLE: &str = "NOT_APPLICABLE";

/// The eight technical journey steps, in canonical order.
const TECHNICAL_STEPS: &[&str] = &[
    "discovery",
    "manifest",
    "keys",
    "conformance",
    "interoperability",
    "trust",
    "federation",
    "evidence",
];

/// Applicability of one technical step to a declared conformance profile (ADR-030 levels, ADR-030
/// applicability model). L0/L1 are single-operator sandbox readiness: the L2 (payment interoperability)
/// and L3 (inter-operator federation) steps are NOT_APPLICABLE — they are not a technical FAILURE of an
/// L0 implementation, they simply do not apply to that profile. L2 adds interoperability; L3 adds
/// federation; L4 requires all. Unknown/empty profile is conservative: every step REQUIRED (prior
/// behaviour). This is the canonical, data-driven profile→applicability rule — Rust decides.
pub fn step_applicability(profile: &str, step: &str) -> &'static str {
    match step {
        "interoperability" => match profile {
            "L2" | "L3" | "L4" => REQUIRED,
            "L0" | "L1" => NOT_APPLICABLE,
            _ => REQUIRED,
        },
        "federation" => match profile {
            "L3" | "L4" => REQUIRED,
            "L0" | "L1" | "L2" => NOT_APPLICABLE,
            _ => REQUIRED,
        },
        // discovery / manifest / keys / conformance / trust / evidence are required at every level.
        _ => REQUIRED,
    }
}

/// The full profile→applicability map for the eight technical steps (for the UI, receipts and trace).
pub fn profile_applicability(profile: &str) -> Value {
    let map: serde_json::Map<String, Value> = TECHNICAL_STEPS
        .iter()
        .map(|st| {
            (
                st.to_string(),
                Value::String(step_applicability(profile, st).to_string()),
            )
        })
        .collect();
    json!({
        "schema": "banza.profile.applicability",
        "profile": profile,
        "applicability": map,
        "note": "Applicability is orthogonal to step state: a NOT_APPLICABLE step is out of scope for the profile, NOT a technical failure. Readiness aggregates only REQUIRED-for-profile steps.",
        "tool": "banza-target-registry",
        "tool_version": crate::TOOL_VERSION,
    })
}

/// Aggregate the technical step verdicts into a Certification **Readiness** record (ADR-034 §21 step 9,
/// ADR-030 profile applicability). `step_verdicts` is an array of `{ "step": "...", "status": "..." }`.
/// Readiness aggregates ONLY the steps that are REQUIRED for `profile`; NOT_APPLICABLE steps are excluded
/// (never contribute FAILED/BLOCKED/PENDING). Output is `READY` or `BLOCKED` — never a Certification
/// Record, never `CERTIFIED`. Empty/unknown profile ⇒ every step REQUIRED (backward compatible).
pub fn certification_readiness(step_verdicts: &Value, profile: &str) -> Value {
    let steps = step_verdicts.as_array().cloned().unwrap_or_default();
    // Only the steps that APPLY to this profile count toward readiness.
    let technical: Vec<&Value> = steps
        .iter()
        .filter(|v| {
            let st = s(v, "step");
            st != "certification" && step_applicability(profile, st) != NOT_APPLICABLE
        })
        .collect();
    let not_applicable: Vec<String> = steps
        .iter()
        .map(|v| s(v, "step").to_string())
        .filter(|st| st != "certification" && step_applicability(profile, st) == NOT_APPLICABLE)
        .collect();

    let any_failed = technical.iter().any(|v| s(v, "status") == FAILED);
    let any_blocked = technical.iter().any(|v| s(v, "status") == BLOCKED);
    let any_pending = technical
        .iter()
        .any(|v| matches!(s(v, "status"), PENDING | "NOT_EVALUATED" | ""));
    let all_verified =
        !technical.is_empty() && technical.iter().all(|v| s(v, "status") == VERIFIED);

    let readiness = if all_verified { "READY" } else { "BLOCKED" };

    let mut reasons: Vec<String> = vec!["NOT_CERTIFIED".to_string()];
    if all_verified {
        reasons.push("READY_FOR_TECHNICAL_REVIEW".to_string());
    }
    if any_failed {
        reasons.push("PRECEDING_STEP_FAILED".to_string());
    }
    if any_blocked {
        reasons.push("PRECEDING_STEP_BLOCKED".to_string());
    }
    if any_pending {
        reasons.push("TECHNICAL_STEPS_INCOMPLETE".to_string());
    }
    if !not_applicable.is_empty() {
        reasons.push(format!(
            "EXCLUDED_NOT_APPLICABLE:{}",
            not_applicable.join(",")
        ));
    }

    // Verdicts carry applicability so the aggregate is self-describing (only REQUIRED steps are counted).
    let verdicts: Value = Value::Array(
        steps
            .iter()
            .filter(|v| s(v, "step") != "certification")
            .map(|v| {
                let st = s(v, "step");
                json!({ "step": st, "status": s(v, "status"), "applicability": step_applicability(profile, st) })
            })
            .collect(),
    );

    json!({
        "schema": "banza.certification.readiness",
        "record_kind": "READINESS_AGGREGATE",
        "profile": profile,
        "certification_status": "NOT_CERTIFIED",
        "certified": false,
        "authorised": false,
        "licensed": false,
        "readiness": readiness,
        "required_steps_evaluated": technical.len(),
        "not_applicable_steps": not_applicable,
        "reason_codes": reasons,
        "technical_step_verdicts": verdicts,
        "aggregated_in": "rust",
        "note": "Certification Readiness aggregates the endpoint-originated step verdicts. It is NOT a Certification Record; it never certifies, authorises, or admits an operator, and never returns CERTIFIED.",
        "qwen_calls": 0,
        "external_model_calls": 0,
        "tool": "banza-target-registry",
        "tool_version": crate::TOOL_VERSION,
    })
}
