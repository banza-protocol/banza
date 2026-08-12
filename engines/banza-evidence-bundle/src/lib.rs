//! banza-evidence-bundle (BX1.5) — the technical evidence-bundle assembler.
//!
//! An independent operator prepares an evidence bundle to publish verifiable conformance evidence. This engine gathers
//! the reports produced by the other BanzAI tools — the SimB Pre-Review Gate, Conformidade L0, Trace
//! verification, Trust & BRL — and computes, **in Rust**: the readiness verdict (required = SimB + L0;
//! recommended = Trace + Trust), the required/missing artifacts, SHA-256 integrity hashes, and the
//! output JSON. TypeScript must not decide readiness, compute a status, or hash.
//!
//! **Central rule:** the Evidence Bundle is technical evidence — NOT a certificate, NOT an approval, and
//! NOT an operator approval — no central human authority accepts operators. Every bundle carries `not_a_certificate = true`,
//! `not_an_approval = true`, `requires_conformance_evidence_review = true`, `llm_calls = 0`,
//! `external_model_called = false`.
#![recursion_limit = "512"]

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const SCHEMA_VERSION: &str = "banza-evidence-bundle/1";
pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "Evidence Bundle é evidência técnica verificável. Não é certificado. Não é aprovação. A conformidade demonstra-se por evidência verificável; não há aprovação humana central.";

/// The required artifacts (their absence makes the bundle INCOMPLETE) and the recommended ones.
pub const REQUIRED_ARTIFACTS: &[&str] = &["simb_pre_review", "conformance_l0"];
pub const RECOMMENDED_ARTIFACTS: &[&str] = &[
    "trace_verification",
    "trust_engine_report",
    "operator_manifest_validation",
    "l1_readiness_report",
    "l2_readiness_report",
    "l3_readiness_report",
    "l4_readiness_report",
    "security_assurance_report",
    "security_deep_assurance_report",
    "m2_protocol_gate_report",
    "m2_root_ceremony_report",
    "open_governance_report",
    "reference_trust_model_report",
];

// ── helpers ───────────────────────────────────────────────────────────────────

fn present<'a>(input: &'a Value, key: &str) -> Option<&'a Value> {
    input
        .get(key)
        .filter(|v| !v.is_null() && (v.is_object() || v.is_array()))
}
fn str_at<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}
/// Canonical bytes for hashing, in **BANZA Canonical JSON `BCJ/1`** (`spec/canonicalization.md`).
///
/// The specification applies `BCJ/1` wherever BANZA computes a signature or a **content digest**.
/// This helper previously used `serde_json::to_string` — the pre-BCJ/1 behaviour — which made this
/// crate a second, unpublished definition of the byte form. It now delegates.
///
/// Fail-closed: a value `BCJ/1` rejects has no canonical form.
/// substitute for one, so the caller gets a value that cannot be mistaken for a real digest input.
fn canon(v: &Value) -> String {
    match banza_trust::canonical_bytes(v, &[]) {
        Ok(b) => String::from_utf8(b).unwrap_or_default(),
        // A value BCJ/1 rejects has no canonical form, and this engine must still return a verdict
        // about it rather than abort. The marker below can never be valid canonical JSON — it opens
        // with NUL, which canonicalization never emits — so it cannot be mistaken for one, and it
        // carries the rejection reason so two different rejections never share a digest.
        Err(e) => format!("\u{0}BCJ/1-REJECTED\u{0}{e}"),
    }
}
fn sha256_hex(bytes: &str) -> String {
    format!("{:x}", Sha256::digest(bytes.as_bytes()))
}
fn hash_of(v: Option<&Value>) -> Value {
    match v {
        Some(x) => Value::String(sha256_hex(&canon(x))),
        None => Value::Null,
    }
}

/// The SimB verdict from a SimB report: pass / fail / incomplete / missing (computed in Rust).
fn simb_verdict(simb: Option<&Value>) -> &'static str {
    match simb {
        None => "missing",
        Some(s) => {
            if let Some(p) = str_at(s, "pre_review_status") {
                match p {
                    "SIMB_PRE_REVIEW_PASS" => "pass",
                    "SIMB_PRE_REVIEW_FAIL" => "fail",
                    _ => "incomplete",
                }
            } else {
                match str_at(s, "status") {
                    Some("PASS") => "pass",
                    Some("FAIL") => "fail",
                    _ => "incomplete",
                }
            }
        }
    }
}
fn l0_verdict(l0: Option<&Value>) -> &'static str {
    match l0 {
        None => "missing",
        Some(r) => match str_at(r, "status") {
            Some("PASS") => "pass",
            Some("FAIL") => "fail",
            _ => "incomplete",
        },
    }
}

/// The bundle readiness — computed in Rust. Required = SimB + L0.
/// SimB missing/incomplete → INCOMPLETE; SimB FAIL → BLOCKED_BY_SIMB; then L0 missing/incomplete →
/// INCOMPLETE; L0 FAIL → BLOCKED_BY_CONFORMANCE; SimB PASS + L0 PASS → READY_FOR_TECHNICAL_REVIEW.
pub fn compute_readiness(simb: Option<&Value>, l0: Option<&Value>) -> &'static str {
    match simb_verdict(simb) {
        "missing" | "incomplete" => return "INCOMPLETE",
        "fail" => return "BLOCKED_BY_SIMB",
        _ => {} // pass
    }
    match l0_verdict(l0) {
        "missing" | "incomplete" => "INCOMPLETE",
        "fail" => "BLOCKED_BY_CONFORMANCE",
        _ => "READY_FOR_TECHNICAL_REVIEW",
    }
}

fn tool_version_of(report: Option<&Value>) -> Value {
    report
        .and_then(|r| r.get("tool_version").cloned())
        .unwrap_or(Value::Null)
}

// ── build ─────────────────────────────────────────────────────────────────────

/// Build an evidence bundle from the BanzAI reports.
/// `input = { operator_candidate?, mode?, created_at?, simb?, conformance_l0?|l0?, trace?, trust? }`.
pub fn build_bundle(input: &Value) -> Value {
    let simb = present(input, "simb").or_else(|| present(input, "simb_pre_review"));
    let l0 = present(input, "l0").or_else(|| present(input, "conformance_l0"));
    let trace = present(input, "trace").or_else(|| present(input, "trace_verification"));
    let trust = present(input, "trust").or_else(|| present(input, "trust_engine_report"));
    let manifest = present(input, "operator_manifest")
        .or_else(|| present(input, "operator_manifest_validation"));
    let l1 = present(input, "l1_readiness").or_else(|| present(input, "l1_readiness_report"));
    let l2 = present(input, "l2_readiness").or_else(|| present(input, "l2_readiness_report"));
    let l3 = present(input, "l3_readiness").or_else(|| present(input, "l3_readiness_report"));
    let l4 = present(input, "l4_readiness").or_else(|| present(input, "l4_readiness_report"));
    let assurance = present(input, "security_assurance")
        .or_else(|| present(input, "security_assurance_report"));
    let deep_assurance = present(input, "security_deep_assurance")
        .or_else(|| present(input, "security_deep_assurance_report"));
    let m2_gate =
        present(input, "m2_protocol_gate").or_else(|| present(input, "m2_protocol_gate_report"));
    let root_ceremony =
        present(input, "m2_root_ceremony").or_else(|| present(input, "m2_root_ceremony_report"));
    let open_governance =
        present(input, "open_governance").or_else(|| present(input, "open_governance_report"));
    let reference_trust = present(input, "reference_trust_model")
        .or_else(|| present(input, "reference_trust_model_report"));

    let created_at = str_at(input, "created_at")
        .unwrap_or("1970-01-01T00:00:00Z")
        .to_string();
    let mode = str_at(input, "mode").unwrap_or("local").to_string();
    let operator = str_at(input, "operator_candidate")
        .unwrap_or("operator-zero (test-only)")
        .to_string();

    let readiness = compute_readiness(simb, l0);

    let mut missing_required: Vec<String> = Vec::new();
    if simb.is_none() {
        missing_required.push("simb_pre_review".into());
    }
    if l0.is_none() {
        missing_required.push("conformance_l0".into());
    }
    let mut missing_recommended: Vec<String> = Vec::new();
    if trace.is_none() {
        missing_recommended.push("trace_verification".into());
    }
    if trust.is_none() {
        missing_recommended.push("trust_engine_report".into());
    }
    if manifest.is_none() {
        missing_recommended.push("operator_manifest_validation".into());
    }
    if l1.is_none() {
        missing_recommended.push("l1_readiness_report".into());
    }
    if l2.is_none() {
        missing_recommended.push("l2_readiness_report".into());
    }
    if l3.is_none() {
        missing_recommended.push("l3_readiness_report".into());
    }
    if l4.is_none() {
        missing_recommended.push("l4_readiness_report".into());
    }
    if assurance.is_none() {
        missing_recommended.push("security_assurance_report".into());
    }
    if deep_assurance.is_none() {
        missing_recommended.push("security_deep_assurance_report".into());
    }
    if m2_gate.is_none() {
        missing_recommended.push("m2_protocol_gate_report".into());
    }
    if root_ceremony.is_none() {
        missing_recommended.push("m2_root_ceremony_report".into());
    }
    if open_governance.is_none() {
        missing_recommended.push("open_governance_report".into());
    }
    if reference_trust.is_none() {
        missing_recommended.push("reference_trust_model_report".into());
    }

    // Limitations are SCOPED to the reports the bundle actually carries: a bundle that contains no M2
    // gate / M2 root-ceremony / L2–L4 / security report must not state limitations about them (accuracy),
    // which also keeps a simb+l0-only bundle free of retired public-surface terminology (M2.5/M2.9F).
    let mut limitations = vec![
        "Pré-produção: inferência determinística offline, sem chamadas a modelo de linguagem e sem modelo externo (os campos estruturados de contagem de chamadas permanecem a zero).".to_string(),
        "Artefactos obrigatórios: SimB pre-review + Conformidade L0. Recomendados nesta fase: Trace, Trust & BRL, Operator Manifest Validation, L1, L2, L3, L4 Readiness e Security Assurance (preparação para os próximos níveis).".to_string(),
        "Readiness READY_FOR_TECHNICAL_REVIEW é evidência técnica de prontidão — não é certificação nem aprovação.".to_string(),
    ];
    if l2.is_some() {
        limitations.push("L2 readiness não é pagamento real nem certificação — é preparação técnica de fluxo de pagamento, sem movimentação de fundos.".to_string());
    }
    if l3.is_some() {
        limitations.push("L3 readiness não é federação activa nem certificação — é preparação técnica de federação entre operadores simulados, sem movimentação de fundos.".to_string());
    }
    if l4.is_some() {
        limitations.push("L4 readiness não é integração externa activa, não é certificação, não é licença e não transforma BANZA em prestador de serviços de pagamento — é preparação técnica de interoperabilidade externa, sem movimentação de fundos.".to_string());
    }
    if assurance.is_some() {
        limitations.push("Security & Risk Assurance não é auditoria externa, não é certificação, não é licença e não activa produção — é avaliação interna de segurança e risco.".to_string());
    }
    if deep_assurance.is_some() {
        limitations.push("Deep Assurance (BX2.1–BX2.4) é aprofundamento de assurance — não é auditoria externa concluída, não é certificação, não é licença, não activa federação, não activa integração externa e não move fundos; a auditoria externa não foi realizada e a cerimónia de confiança de produção não foi executada.".to_string());
    }
    if m2_gate.is_some() {
        limitations.push("M2 protocol gate é preparação de PRODUÇÃO DO PROTOCOLO (não produção financeira) — não activa operador, não emite certificado de produção, não presta serviços de pagamento, não move fundos e não transforma BANZA em prestador de serviços de pagamento; /operators permanece [] e production_certificates permanece false.".to_string());
    }
    if root_ceremony.is_some() {
        limitations.push("M2 root ceremony report estabelece evidência de confiança do protocolo financeiro aberto BANZA (2-de-3, test-only). Não é certificado de produção de operador, não é licença, não é autorização regulatória e não permite prestação de serviços financeiros pelo BANZA. Nenhuma chave privada real: apenas material público (chaves públicas, fingerprints, assinaturas, declarações sem segredo).".to_string());
    }
    limitations.push(
        "Os hashes são integridade técnica (SHA-256), não assinatura nem autoridade.".to_string(),
    );
    limitations.push("A conformidade é verificada por conformance automation e evidência verificável, não por decisão humana central.".to_string());

    // Report-specific summary disclaimers are emitted ONLY when the report is present — an absent report
    // carries no disclaimer (accurate) and never leaks its retired-terminology text onto public surfaces.
    let m2_gate_disclaimer: Value = if m2_gate.is_some() {
        json!("M2 protocol gate não é activação de operador, não é certificado de produção, não é licença e não transforma BANZA em prestador de serviços de pagamento.")
    } else {
        Value::Null
    };
    let m2_root_disclaimer: Value = if root_ceremony.is_some() {
        json!("M2 root ceremony report estabelece evidência de confiança do protocolo financeiro aberto BANZA. Não é certificado de produção de operador, não é licença, não é autorização regulatória e não permite prestação de serviços financeiros pelo BANZA.")
    } else {
        Value::Null
    };

    // Build the body WITHOUT bundle_id / bundle_hash first.
    let mut bundle = json!({
        "schema_version": SCHEMA_VERSION,
        "created_at": created_at,
        "mode": mode,
        "environment": "pre-production",
        "operator_candidate": operator,
        "simb_pre_review": simb.cloned().unwrap_or(Value::Null),
        "conformance_l0": l0.cloned().unwrap_or(Value::Null),
        "trace_verification": trace.cloned().unwrap_or(Value::Null),
        "trust_engine_report": trust.cloned().unwrap_or(Value::Null),
        "operator_manifest_validation": manifest.cloned().unwrap_or(Value::Null),
        "l1_readiness_report": l1.cloned().unwrap_or(Value::Null),
        "l2_readiness_report": l2.cloned().unwrap_or(Value::Null),
        "l3_readiness_report": l3.cloned().unwrap_or(Value::Null),
        "l4_readiness_report": l4.cloned().unwrap_or(Value::Null),
        "security_assurance_report": assurance.cloned().unwrap_or(Value::Null),
        "security_deep_assurance_report": deep_assurance.cloned().unwrap_or(Value::Null),
        "m2_protocol_gate_report": m2_gate.cloned().unwrap_or(Value::Null),
        "m2_root_ceremony_report": root_ceremony.cloned().unwrap_or(Value::Null),
        "open_governance_report": open_governance.cloned().unwrap_or(Value::Null),
        "reference_trust_model_report": reference_trust.cloned().unwrap_or(Value::Null),
        "tool_versions": {
            "banza-evidence-bundle": TOOL_VERSION,
            "banza-simb": tool_version_of(simb),
            "banza-conformance-rs": tool_version_of(l0),
            "banza-trust": tool_version_of(trust),
            "banza-operator-manifest": tool_version_of(manifest),
            "banza-l1-readiness": tool_version_of(l1),
            "banza-l2-readiness": tool_version_of(l2),
            "banza-l3-readiness": tool_version_of(l3),
            "banza-l4-readiness": tool_version_of(l4),
            "banza-security-assurance": tool_version_of(assurance),
            "banza-security-assurance-deep": tool_version_of(deep_assurance),
            "banza-m2-protocol-gate": tool_version_of(m2_gate),
            "banza-root-ceremony": tool_version_of(root_ceremony),
            "banza-open-governance": tool_version_of(open_governance),
            "banza-reference-trust-model": tool_version_of(reference_trust),
        },
        "hashes": {
            "simb_report_hash": hash_of(simb),
            "conformance_report_hash": hash_of(l0),
            "trace_report_hash": hash_of(trace),
            "trust_report_hash": hash_of(trust),
            "operator_manifest_hash": hash_of(manifest),
            "l1_readiness_hash": hash_of(l1),
            "l2_readiness_hash": hash_of(l2),
            "l3_readiness_hash": hash_of(l3),
            "l4_readiness_hash": hash_of(l4),
            "security_assurance_hash": hash_of(assurance),
            "security_deep_assurance_hash": hash_of(deep_assurance),
            "m2_protocol_gate_hash": hash_of(m2_gate),
            "m2_root_ceremony_hash": hash_of(root_ceremony),
            "open_governance_hash": hash_of(open_governance),
            "reference_trust_model_hash": hash_of(reference_trust),
        },
        "citations": [
            "docs/governance/EVIDENCE_BUNDLE.md",
            "docs/governance/SIMB_PRE_REVIEW_GATE.md",
            "/banzai",
        ],
        "limitations": limitations,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "missing_required": missing_required,
        "missing_recommended": missing_recommended,
        "readiness": readiness,
        "l2_readiness_summary": {
            "status": l2.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "readiness": l2.and_then(|r| r.get("readiness")).cloned().unwrap_or(Value::Null),
            "blockers": l2.and_then(|r| r.get("invalid_artifacts")).cloned().unwrap_or(Value::Null),
            "payment_flow_summary": l2.and_then(|r| r.get("payment_flow_summary")).cloned().unwrap_or(Value::Null),
            "disclaimer": "L2 readiness não é pagamento real nem certificação.",
        },
        "l3_readiness_summary": {
            "status": l3.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "readiness": l3.and_then(|r| r.get("readiness")).cloned().unwrap_or(Value::Null),
            "blockers": l3.and_then(|r| r.get("invalid_artifacts")).cloned().unwrap_or(Value::Null),
            "federation_summary": l3.and_then(|r| r.get("federation_summary")).cloned().unwrap_or(Value::Null),
            "disclaimer": "L3 readiness não é federação activa nem certificação.",
        },
        "l4_readiness_summary": {
            "status": l4.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "readiness": l4.and_then(|r| r.get("readiness")).cloned().unwrap_or(Value::Null),
            "blockers": l4.and_then(|r| r.get("invalid_artifacts")).cloned().unwrap_or(Value::Null),
            "interoperability_summary": l4.and_then(|r| r.get("interoperability_summary")).cloned().unwrap_or(Value::Null),
            "disclaimer": "L4 readiness não é integração externa activa, não é certificação, não é licença e não transforma BANZA em prestador de serviços de pagamento.",
        },
        "security_assurance_summary": {
            "status": assurance.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "critical_risks": assurance.and_then(|r| r.get("critical_risks")).cloned().unwrap_or(Value::Null),
            "high_risks": assurance.and_then(|r| r.get("high_risks")).cloned().unwrap_or(Value::Null),
            "missing_evidence": assurance.and_then(|r| r.get("missing_evidence")).cloned().unwrap_or(Value::Null),
            "control_gaps": assurance.and_then(|r| r.get("control_gaps")).cloned().unwrap_or(Value::Null),
            "disclaimer": "Security & Risk Assurance não é auditoria externa, não é certificação, não é licença e não activa produção.",
        },
        "security_deep_assurance_summary": {
            "status": deep_assurance.and_then(|r| r.get("deep_assurance_status")).cloned().unwrap_or(Value::Null),
            "pre_audit_readiness": deep_assurance.and_then(|r| r.get("pre_audit_readiness")).cloned().unwrap_or(Value::Null),
            "open_critical_gaps": deep_assurance.and_then(|r| r.get("open_critical_gaps")).cloned().unwrap_or(Value::Null),
            "missing_documents": deep_assurance.and_then(|r| r.get("missing_documents")).cloned().unwrap_or(Value::Null),
            "tracks": deep_assurance.and_then(|r| r.get("tracks")).cloned().unwrap_or(Value::Null),
            "disclaimer": "Deep Assurance (BX2.1–BX2.4) é aprofundamento de assurance — não é auditoria externa concluída, não é certificação, não é licença, não activa federação nem integração externa e não move fundos.",
        },
        "m2_protocol_gate_summary": {
            "status": m2_gate.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "m2_state": m2_gate.and_then(|r| r.get("m2_state")).cloned().unwrap_or(Value::Null),
            "protocol_production_prepared": m2_gate.and_then(|r| r.get("protocol_production_prepared")).cloned().unwrap_or(Value::Null),
            "missing_artifacts": m2_gate.and_then(|r| r.get("missing_artifacts")).cloned().unwrap_or(Value::Null),
            "blocked_items": m2_gate.and_then(|r| r.get("blocked_items")).cloned().unwrap_or(Value::Null),
            "forbidden_activation_attempts": m2_gate.and_then(|r| r.get("forbidden_activation_attempts")).cloned().unwrap_or(Value::Null),
            "disclaimer": m2_gate_disclaimer,
        },
        "m2_root_ceremony_summary": {
            "status": root_ceremony.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "threshold": root_ceremony.and_then(|r| r.get("threshold")).cloned().unwrap_or(Value::Null),
            "valid_signature_count": root_ceremony.and_then(|r| r.get("valid_signature_count")).cloned().unwrap_or(Value::Null),
            "custody_summary": root_ceremony.and_then(|r| r.get("custody_summary")).cloned().unwrap_or(Value::Null),
            "backup_summary": root_ceremony.and_then(|r| r.get("backup_summary")).cloned().unwrap_or(Value::Null),
            "offline_environment_summary": root_ceremony.and_then(|r| r.get("offline_environment_summary")).cloned().unwrap_or(Value::Null),
            "recovery_test_summary": root_ceremony.and_then(|r| r.get("recovery_test_summary")).cloned().unwrap_or(Value::Null),
            "forbidden_private_key_material_detected": root_ceremony.and_then(|r| r.get("forbidden_private_key_material_detected")).cloned().unwrap_or(Value::Null),
            "boundary_summary": root_ceremony.and_then(|r| r.get("boundary_summary")).cloned().unwrap_or(Value::Null),
            "disclaimer": m2_root_disclaimer,
        },
        "open_governance_summary": {
            "status": open_governance.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "governance_model": open_governance.and_then(|r| r.get("governance_model")).cloned().unwrap_or(Value::Null),
            "ca_dependency_detected": open_governance.and_then(|r| r.get("ca_dependency_detected")).cloned().unwrap_or(Value::Null),
            "human_operator_approval_detected": open_governance.and_then(|r| r.get("human_operator_approval_detected")).cloned().unwrap_or(Value::Null),
            "certificate_semantics_detected": open_governance.and_then(|r| r.get("certificate_semantics_detected")).cloned().unwrap_or(Value::Null),
            "conformance_automation_summary": open_governance.and_then(|r| r.get("conformance_automation_summary")).cloned().unwrap_or(Value::Null),
            "operator_self_publication_summary": open_governance.and_then(|r| r.get("operator_self_publication_summary")).cloned().unwrap_or(Value::Null),
            "trust_root_summary": open_governance.and_then(|r| r.get("trust_root_summary")).cloned().unwrap_or(Value::Null),
            "revocation_summary": open_governance.and_then(|r| r.get("revocation_summary")).cloned().unwrap_or(Value::Null),
            "succession_summary": open_governance.and_then(|r| r.get("succession_summary")).cloned().unwrap_or(Value::Null),
            "deprecated_terms": open_governance.and_then(|r| r.get("deprecated_terms")).cloned().unwrap_or(Value::Null),
            "blocked_items": open_governance.and_then(|r| r.get("blocked_items")).cloned().unwrap_or(Value::Null),
            "disclaimer": "Open governance report confirma a arquitectura de protocolo financeiro aberto. Não é autorização de operador, não é certificação, não é licença e não permite prestação de serviços financeiros pelo BANZA.",
        },
        "reference_trust_model_summary": {
            "status": reference_trust.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
            "central_authority_claim_detected": reference_trust.and_then(|r| r.get("central_authority_claim_detected")).cloned().unwrap_or(Value::Null),
            "invalid_trust_evidence_detected": reference_trust.and_then(|r| r.get("invalid_trust_evidence_detected")).cloned().unwrap_or(Value::Null),
            "operator_approval_claim_detected": reference_trust.and_then(|r| r.get("operator_approval_claim_detected")).cloned().unwrap_or(Value::Null),
            "signed_metadata_summary": reference_trust.and_then(|r| r.get("signed_metadata_summary")).cloned().unwrap_or(Value::Null),
            "conformance_evidence_summary": reference_trust.and_then(|r| r.get("conformance_evidence_summary")).cloned().unwrap_or(Value::Null),
            "public_registry_summary": reference_trust.and_then(|r| r.get("public_registry_summary")).cloned().unwrap_or(Value::Null),
            "revocation_fail_closed_summary": reference_trust.and_then(|r| r.get("revocation_fail_closed_summary")).cloned().unwrap_or(Value::Null),
            "trust_evaluation_summary": reference_trust.and_then(|r| r.get("trust_evaluation_summary")).cloned().unwrap_or(Value::Null),
            "active_trust_model_summary": reference_trust.and_then(|r| r.get("active_trust_model_summary")).cloned().unwrap_or(Value::Null),
            "boundary_summary": reference_trust.and_then(|r| r.get("boundary_summary")).cloned().unwrap_or(Value::Null),
            "blocked_items": reference_trust.and_then(|r| r.get("blocked_items")).cloned().unwrap_or(Value::Null),
            "disclaimer": "Este relatório descreve o modelo activo de trust do protocolo financeiro aberto BANZA. Não é autorização de operador, não é certificação, não é licença e não permite prestação de serviços financeiros pelo BANZA.",
        },
        "not_a_certificate": true,
        "not_an_approval": true,
        "requires_conformance_evidence_review": true,
        "boundary": BOUNDARY,
        "llm_calls": 0,
        "external_model_called": false,
    });

    // Deterministic bundle_id from created_at + the required-report hashes.
    let seed = format!(
        "{created_at}|{}|{}",
        canon(&hash_of(simb)),
        canon(&hash_of(l0))
    );
    bundle["bundle_id"] = json!(format!("bundle-{}", &sha256_hex(&seed)[..12]));

    // bundle_hash covers the whole bundle (including bundle_id) EXCEPT bundle_hash itself.
    let bundle_hash = sha256_hex(&canon(&bundle));
    bundle["hashes"]["bundle_hash"] = json!(bundle_hash);

    bundle
}

// ── validate ────────────────────────────────────────────────────────────────

const READINESS_VALUES: &[&str] = &[
    "NOT_READY",
    "READY_FOR_TECHNICAL_REVIEW",
    "BLOCKED_BY_SIMB",
    "BLOCKED_BY_CONFORMANCE",
    "INCOMPLETE",
];

/// Validate a bundle JSON: required fields, boundary flags, readiness enum, no forbidden claim, and the
/// SHA-256 integrity (recomputed bundle_hash must match). Fail-closed on parse error.
pub fn validate_bundle(json_str: &str) -> Value {
    let v: Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            return json!({"ok": false, "errors": [format!("JSON inválido: {e}")], "tool": "banza-evidence-bundle", "tool_version": TOOL_VERSION})
        }
    };
    let mut errors: Vec<String> = Vec::new();

    for f in [
        "schema_version",
        "bundle_id",
        "readiness",
        "hashes",
        "boundary",
    ] {
        if v.get(f).is_none() {
            errors.push(format!("campo em falta: {f}"));
        }
    }
    for (f, want) in [
        ("not_a_certificate", true),
        ("not_an_approval", true),
        ("requires_conformance_evidence_review", true),
    ] {
        if v.get(f).and_then(|x| x.as_bool()) != Some(want) {
            errors.push(format!("{f} deve ser {want}"));
        }
    }
    if v.get("llm_calls").and_then(|x| x.as_i64()) != Some(0) {
        errors.push("llm_calls deve ser 0".into());
    }
    if v.get("external_model_called").and_then(|x| x.as_bool()) != Some(false) {
        errors.push("external_model_called deve ser false".into());
    }
    if let Some(r) = str_at(&v, "readiness") {
        if !READINESS_VALUES.contains(&r) {
            errors.push(format!("readiness inválido: {r}"));
        }
    }
    // Forbidden positive certification/approval claims (fail-closed).
    let low = json_str.to_lowercase();
    for bad in [
        "\"certified\"",
        "\"approved\"",
        "production_ready",
        "operator_certified",
    ] {
        if low.contains(bad) {
            errors.push(format!("claim proibido no bundle: {bad}"));
        }
    }
    // Integrity: recompute bundle_hash over the bundle minus hashes.bundle_hash.
    let stored = v
        .get("hashes")
        .and_then(|h| h.get("bundle_hash"))
        .and_then(|x| x.as_str());
    if let Some(stored) = stored {
        let mut b = v.clone();
        if let Some(h) = b.get_mut("hashes").and_then(|h| h.as_object_mut()) {
            h.remove("bundle_hash");
        }
        let recomputed = sha256_hex(&canon(&b));
        if recomputed != stored {
            errors.push("bundle_hash não corresponde (integridade falhou)".into());
        }
    } else {
        errors.push("hashes.bundle_hash em falta".into());
    }

    json!({
        "ok": errors.is_empty(),
        "errors": errors,
        "readiness": v.get("readiness").cloned().unwrap_or(Value::Null),
        "tool": "banza-evidence-bundle",
        "tool_version": TOOL_VERSION,
    })
}

// ── demo ──────────────────────────────────────────────────────────────────────

/// Build a real demo bundle from the actual engines. `input = { scenario?, created_at? }`.
/// The required artifacts (SimB + L0) and a Trust & BRL report are produced by the real engines; the
/// Trace report is intentionally left absent to demonstrate a missing RECOMMENDED artifact honestly.
pub fn demo_bundle(input: &Value) -> Value {
    let scenario = str_at(input, "scenario").unwrap_or("valid_l0");
    let created_at = str_at(input, "created_at").unwrap_or("2026-07-16T00:00:00Z");

    let simb = banza_simb::scenario::run_scenario(scenario);
    let l0 = banza_conformance::tool::run_l0_demo(&json!({ "run": simb.clone() }));

    // Trust engine: evaluate the TEST-ONLY valid signed-protocol-metadata fixture with the real engine.
    let fx = banza_trust::tool::demo_fixtures();
    let valid_input = fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("valid_signed_protocol_metadata")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let trust = banza_trust::tool::trust_evaluate_tool(&valid_input);

    // Operator manifest validation: validate the TEST-ONLY valid candidate fixture with the real engine.
    let mfx = banza_operator_manifest::demo_fixtures();
    let valid_manifest = mfx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("valid_l0_candidate_manifest")
            })
        })
        .and_then(|f| f.get("manifest"))
        .cloned()
        .unwrap_or(json!({}));
    let manifest = banza_operator_manifest::validate_manifest(&valid_manifest);

    // L1 readiness: validate the TEST-ONLY ready candidate surface with the real aggregator.
    let l1fx = banza_l1_readiness::demo_fixtures();
    let l1_input = l1fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter()
                .find(|f| f.get("key").and_then(|k| k.as_str()) == Some("l1_ready_candidate"))
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let l1 = banza_l1_readiness::validate_l1(&l1_input);

    // L2 readiness: validate the TEST-ONLY ready payment-flow surface with the real aggregator.
    let l2fx = banza_l2_readiness::demo_fixtures();
    let l2_input = l2fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter()
                .find(|f| f.get("key").and_then(|k| k.as_str()) == Some("l2_ready_payment_flow"))
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let l2 = banza_l2_readiness::validate_l2(&l2_input);

    // L3 readiness: validate the TEST-ONLY ready federation surface with the real aggregator.
    let l3fx = banza_l3_readiness::demo_fixtures();
    let l3_input = l3fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter()
                .find(|f| f.get("key").and_then(|k| k.as_str()) == Some("l3_ready_federation_flow"))
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let l3 = banza_l3_readiness::validate_l3(&l3_input);

    // L4 readiness: validate the TEST-ONLY ready external-interoperability surface with the real aggregator.
    let l4fx = banza_l4_readiness::demo_fixtures();
    let l4_input = l4fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("l4_ready_external_interop")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let l4 = banza_l4_readiness::validate_l4(&l4_input);

    // Security & Risk Assurance: validate the TEST-ONLY ready assurance package with the real aggregator.
    let afx = banza_security_assurance::demo_fixtures();
    let a_input = afx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("assurance_ready_internal_review")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let assurance = banza_security_assurance::validate_assurance(&a_input);

    // Deep Assurance (BX2.1–BX2.4): validate the TEST-ONLY ready deep-assurance pack with the real engine.
    let dfx = banza_security_assurance::deep_demo_fixtures();
    let d_input = dfx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str())
                    == Some("deep_assurance_ready_for_pre_audit_review")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let deep_assurance = banza_security_assurance::validate_deep_assurance(&d_input);

    // M2 protocol gate: validate the TEST-ONLY ready M2 production-protocol package with the real engine.
    let m2fx = banza_m2_protocol_gate::demo_fixtures();
    let m2_input = m2fx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("m2_protocol_implementation_ready")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let m2_gate = banza_m2_protocol_gate::validate_m2_protocol_gate(&m2_input);

    // M2.1 root ceremony: validate the TEST-ONLY valid 2-of-3 ceremony with the real engine.
    let rcfx = banza_root_ceremony::demo_fixtures();
    let rc_input = rcfx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter()
                .find(|f| f.get("key").and_then(|k| k.as_str()) == Some("valid_2of3"))
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let root_ceremony = banza_root_ceremony::validate_root_ceremony(&rc_input);

    // M2.2 open governance: validate the TEST-ONLY valid open-governance package with the real engine.
    let ogfx = banza_open_governance::demo_fixtures();
    let og_input = ogfx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter()
                .find(|f| f.get("key").and_then(|k| k.as_str()) == Some("valid_open_governance"))
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let open_governance = banza_open_governance::validate_open_governance(&og_input);

    // M2.3 reference trust model: validate the TEST-ONLY valid model with the real engine.
    let rtfx = banza_reference_trust_model::demo_fixtures();
    let rt_input = rtfx
        .get("fixtures")
        .and_then(|a| a.as_array())
        .and_then(|a| {
            a.iter().find(|f| {
                f.get("key").and_then(|k| k.as_str()) == Some("valid_reference_trust_model")
            })
        })
        .and_then(|f| f.get("input"))
        .cloned()
        .unwrap_or(json!({}));
    let reference_trust = banza_reference_trust_model::validate_reference_trust_model(&rt_input);

    build_bundle(&json!({
        "operator_candidate": "operator-A (demo, test-only)",
        "mode": "demo",
        "created_at": created_at,
        "simb": simb,
        "l0": l0,
        "trust": trust,
        "operator_manifest": manifest,
        "l1_readiness": l1,
        "l2_readiness": l2,
        "l3_readiness": l3,
        "l4_readiness": l4,
        "security_assurance": assurance,
        "security_deep_assurance": deep_assurance,
        "m2_protocol_gate": m2_gate,
        "m2_root_ceremony": root_ceremony,
        "open_governance": open_governance,
        "reference_trust_model": reference_trust,
        // trace intentionally omitted → recommended-missing, demonstrated honestly
    }))
}

// ── schema + version ──────────────────────────────────────────────────────────

pub fn schema() -> Value {
    json!({
        "schema_version": SCHEMA_VERSION,
        "tool": "banza-evidence-bundle",
        "tool_version": TOOL_VERSION,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "readiness_values": READINESS_VALUES,
        "fields": [
            "schema_version", "bundle_id", "created_at", "mode", "environment", "operator_candidate",
            "simb_pre_review", "conformance_l0", "trace_verification", "trust_engine_report",
            "tool_versions", "hashes", "citations", "limitations", "readiness",
            "not_a_certificate", "not_an_approval", "requires_conformance_evidence_review",
            "llm_calls", "external_model_called",
        ],
        "boundary": BOUNDARY,
        "not_a_certificate": true,
        "not_an_approval": true,
    })
}

pub fn tool_version() -> Value {
    json!({
        "tool": "banza-evidence-bundle",
        "tool_version": TOOL_VERSION,
        "schema_version": SCHEMA_VERSION,
        "hash": "sha256 (canonical JSON)",
        "boundary": BOUNDARY,
    })
}
