//! banza-security-assurance (BX2.0) — the first formal security & risk assurance baseline.
//!
//! It validates, locally, an assurance package composed of a risk register summary, a threat model
//! summary, a controls matrix summary, the L0–L4 readiness reports, the Evidence Bundle report, the
//! trust/BRL report and a regulatory-boundary confirmation. It computes the **assurance status IN RUST**
//! (never in TypeScript) — the critical/high risk counts, the missing evidence, the control gaps and the
//! SHA-256 report hash. Validation is **local — no network**.
//!
//! **Central rule:** Security & Risk Assurance is an internal security/risk evaluation — it is NOT
//! production, NOT an external audit, NOT certification, NOT a licence; it does NOT create an operator,
//! does NOT move funds, and does NOT make BANZA a payment service provider. BANZA is an open protocol;
//! authorised operators provide financial services. Every report carries the boundary flags,
//! `llm_calls = 0` and `external_model_called = false`.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "Security & Risk Assurance é avaliação interna de segurança e risco. Não é produção, não é auditoria externa, não é certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não move fundos e não transforma BANZA em prestador de serviços de pagamento.";
pub const PROTOCOL_STANCE: &str =
    "BANZA é um protocolo aberto. O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.";

/// Required assurance inputs — the absence of any of these (except evidence, which has its own blocker)
/// makes the package INCOMPLETE.
pub const REQUIRED_INPUTS: &[&str] = &[
    "risk_register",
    "threat_model",
    "controls_matrix",
    "l0",
    "l1",
    "l2",
    "l3",
    "l4",
    "evidence_bundle",
    "regulatory_boundary",
];

/// Boolean flag keys that, if truthy on the regulatory-boundary confirmation or any input, mean the
/// package is (wrongly) claiming production/certification/licence or that BANZA is a PSP → ASSURANCE_INVALID.
const REGULATORY_FAIL_FLAGS: &[&str] = &[
    "banza_is_psp",
    "banza_needs_licence",
    "banza_provides_payment_services",
    "banza_processes_payments",
    "production_ready",
    "production",
    "certified",
    "licensed",
    "external_audit_complete",
    "regulatory_approved",
];

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
fn sha256_hex(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}
fn present<'a>(input: &'a Value, k: &str) -> Option<&'a Value> {
    input
        .get(k)
        .filter(|v| !v.is_null() && (v.is_object() || v.is_array()))
}
fn claims_regulatory_fail(v: &Value) -> bool {
    REGULATORY_FAIL_FLAGS
        .iter()
        .any(|f| v.get(*f).and_then(|x| x.as_bool()) == Some(true))
}

/// A readiness report is "ready" when its status is the level's READY status (or PASS for L0). We only
/// read the status string — the upstream engines already decided.
fn ready_status(v: Option<&Value>, wants: &[&str]) -> bool {
    match v.and_then(|r| str_at(r, "status")) {
        Some(s) => wants.contains(&s),
        None => false,
    }
}

/// Is a risk blocking? A CRITICAL or HIGH risk is blocking when it is still open and unmitigated
/// (status not "mitigated"/"accepted"/"closed" AND no non-empty mitigation).
fn risk_blocking_severity(r: &Value) -> Option<String> {
    let sev = str_at(r, "severity").unwrap_or("").to_uppercase();
    if sev != "CRITICAL" && sev != "HIGH" {
        return None;
    }
    let status = str_at(r, "status").unwrap_or("open").to_lowercase();
    let mitigated = matches!(status.as_str(), "mitigated" | "accepted" | "closed");
    let has_mitigation = str_at(r, "mitigation")
        .map(|m| !m.trim().is_empty() && m.trim().to_lowercase() != "none")
        .unwrap_or(false);
    if mitigated || has_mitigation {
        None
    } else {
        Some(sev)
    }
}

/// Validate the security & risk assurance package. `input` may be the object or a `{ input: {...} }`
/// fixture wrapper.
pub fn validate_assurance(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do security assurance deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let risk_register = present(src, "risk_register");
    let threat_model = present(src, "threat_model");
    let controls_matrix = present(src, "controls_matrix");
    let l0 = present(src, "l0").or_else(|| present(src, "conformance_l0"));
    let l1 = present(src, "l1").or_else(|| present(src, "l1_readiness"));
    let l2 = present(src, "l2").or_else(|| present(src, "l2_readiness"));
    let l3 = present(src, "l3").or_else(|| present(src, "l3_readiness"));
    let l4 = present(src, "l4").or_else(|| present(src, "l4_readiness"));
    let evidence = present(src, "evidence_bundle").or_else(|| present(src, "evidence"));
    let trust_brl = present(src, "trust_brl").or_else(|| present(src, "trust_and_brl"));
    let regulatory = present(src, "regulatory_boundary");

    // ── regulatory boundary: an explicit confirmation object; a claim that BANZA is a PSP / needs a
    //    licence / is production-ready / certified is a boundary failure. Absence of a positive
    //    confirmation is a warning, not an invalid.
    let regulatory_fail = [regulatory, risk_register, controls_matrix]
        .into_iter()
        .flatten()
        .any(claims_regulatory_fail);
    let boundary_confirmed = regulatory
        .and_then(|r| r.get("banza_is_open_protocol").and_then(|x| x.as_bool()))
        == Some(true)
        && regulatory.and_then(|r| r.get("banza_is_psp").and_then(|x| x.as_bool())) != Some(true);

    // ── readiness (read statuses only) ──
    let l0_ready = ready_status(l0, &["PASS"]);
    let l1_ready = ready_status(l1, &["L1_READY_FOR_TECHNICAL_REVIEW"]);
    let l2_ready = ready_status(l2, &["L2_READY_FOR_TECHNICAL_REVIEW"]);
    let l3_ready = ready_status(l3, &["L3_READY_FOR_TECHNICAL_REVIEW"]);
    let l4_ready = ready_status(l4, &["L4_READY_FOR_TECHNICAL_REVIEW"]);
    let all_levels_ready = l0_ready && l1_ready && l2_ready && l3_ready && l4_ready;

    // ── risks ──
    let risks: Vec<&Value> = risk_register
        .and_then(|rr| rr.get("risks").and_then(|a| a.as_array()))
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let mut critical_risks: Vec<String> = Vec::new();
    let mut high_risks: Vec<String> = Vec::new();
    for r in &risks {
        if let Some(sev) = risk_blocking_severity(r) {
            let id = str_at(r, "risk_id").unwrap_or("(sem id)").to_string();
            if sev == "CRITICAL" {
                critical_risks.push(id);
            } else {
                high_risks.push(id);
            }
        }
    }

    // ── control gaps (informational) ──
    let control_gaps: Vec<String> = controls_matrix
        .and_then(|cm| cm.get("controls").and_then(|a| a.as_array()))
        .map(|a| {
            a.iter()
                .filter(|c| {
                    matches!(
                        str_at(c, "status").unwrap_or("").to_lowercase().as_str(),
                        "gap" | "missing" | "partial"
                    )
                })
                .filter_map(|c| str_at(c, "control_id").map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    // ── missing required inputs ──
    let mut missing_evidence: Vec<String> = Vec::new();
    let checks: [(&str, bool); 10] = [
        ("risk_register", risk_register.is_some()),
        ("threat_model", threat_model.is_some()),
        ("controls_matrix", controls_matrix.is_some()),
        ("l0", l0.is_some()),
        ("l1", l1.is_some()),
        ("l2", l2.is_some()),
        ("l3", l3.is_some()),
        ("l4", l4.is_some()),
        ("evidence_bundle", evidence.is_some()),
        ("regulatory_boundary", regulatory.is_some()),
    ];
    for (name, ok) in checks.iter() {
        if !ok {
            missing_evidence.push((*name).to_string());
        }
    }

    // ── status precedence (computed in Rust) ──
    let status = if regulatory_fail {
        "ASSURANCE_INVALID"
    } else if !critical_risks.is_empty() {
        "ASSURANCE_BLOCKED_BY_CRITICAL_RISK"
    } else if !high_risks.is_empty() {
        "ASSURANCE_BLOCKED_BY_HIGH_RISK"
    } else if evidence.is_none() {
        "ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE"
    } else if !missing_evidence.is_empty() || !all_levels_ready {
        "ASSURANCE_INCOMPLETE"
    } else {
        "ASSURANCE_READY_FOR_INTERNAL_REVIEW"
    };
    let assurance_level = if status == "ASSURANCE_READY_FOR_INTERNAL_REVIEW" {
        "READY_FOR_INTERNAL_REVIEW"
    } else {
        "NOT_READY"
    };

    // ── summaries ──
    let readiness_summary = json!({
        "l0": l0.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "l1": l1.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "l2": l2.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "l3": l3.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "l4": l4.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "all_levels_ready": all_levels_ready,
    });
    let trust_summary = json!({
        "trust_brl": if trust_brl.is_some() { "present" } else { "missing" },
        "brl_fail_closed": trust_brl.and_then(|t| t.get("brl_fail_closed").and_then(|x| x.as_bool())).unwrap_or(true),
        "note": "BRL fail-closed é controlo obrigatório (INV-FEDEVAL-002)."
    });
    let evidence_summary = json!({
        "evidence_bundle": if evidence.is_some() { "present" } else { "missing" },
        "bundle_hash": evidence.and_then(|e| str_at(e, "bundle_hash").or_else(|| e.get("hashes").and_then(|h| h.get("bundle_hash")).and_then(|x| x.as_str()))),
        "disclaimer": "Evidence Bundle é evidência técnica — não é certificação, não é licença.",
    });
    let regulatory_boundary_summary = json!({
        "confirmed": boundary_confirmed,
        "banza_is_open_protocol": true,
        "banza_is_psp": false,
        "licence_belongs_to": "operador autorizado que presta serviços financeiros reais",
        "stance": PROTOCOL_STANCE,
    });
    let risk_counts = json!({
        "total": risks.len(),
        "blocking_critical": critical_risks.len(),
        "blocking_high": high_risks.len(),
        "control_gaps": control_gaps.len(),
    });

    // ── warnings ──
    let mut warnings: Vec<String> = Vec::new();
    if threat_model.is_none() {
        warnings.push("threat_model em falta — parte obrigatória do pacote de assurance".into());
    }
    if !boundary_confirmed && !regulatory_fail {
        warnings.push(
            "regulatory_boundary não confirma explicitamente banza_is_open_protocol=true".into(),
        );
    }
    if !control_gaps.is_empty() {
        warnings.push(format!(
            "controls com lacunas (informativo): {}",
            control_gaps.join(", ")
        ));
    }

    let next_steps: Vec<String> = match status {
        "ASSURANCE_READY_FOR_INTERNAL_REVIEW" => vec!["Pacote de assurance estruturado para REVISÃO INTERNA (test-only). Antes de qualquer afirmação de produção: auditoria externa independente, piloto controlado e operadores autorizados sob o seu enquadramento regulatório. Não é certificação, não é licença, não é produção.".into()],
        "ASSURANCE_INVALID" => vec!["Remova qualquer afirmação de que BANZA é PSP / precisa de licença / está pronto para produção / certificado — BANZA é um protocolo aberto e a licença pertence ao operador.".into()],
        "ASSURANCE_BLOCKED_BY_CRITICAL_RISK" => vec!["Mitigue ou aceite formalmente os riscos CRÍTICOS abertos antes da revisão interna.".into()],
        "ASSURANCE_BLOCKED_BY_HIGH_RISK" => vec!["Documente mitigação para os riscos HIGH abertos antes da revisão interna.".into()],
        "ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE" => vec!["Forneça o Evidence Bundle (evidência técnica dos níveis) para a revisão de assurance.".into()],
        _ => vec!["Adicione os artefactos em falta (risk register, threat model, controls matrix, L0–L4, regulatory boundary) e revalide.".into()],
    };

    let mut report = json!({
        "status": status,
        "assurance_level": assurance_level,
        "required_inputs": REQUIRED_INPUTS,
        "missing_evidence": missing_evidence,
        "critical_risks": critical_risks,
        "high_risks": high_risks,
        "control_gaps": control_gaps,
        "risk_counts": risk_counts,
        "readiness_summary": readiness_summary,
        "trust_summary": trust_summary,
        "evidence_summary": evidence_summary,
        "regulatory_boundary_summary": regulatory_boundary_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-security-assurance",
        "tool_version": TOOL_VERSION,
        "not_production": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "not_a_licence": true,
        "not_a_psp": true,
        "does_not_move_funds": true,
        "does_not_create_operator": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_external_audit_before_production_claims": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("assurance-{}", &sha256_hex(&canon(src))[..12]));
    report["assurance_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "ASSURANCE_INVALID", "assurance_level": "NOT_READY",
        "required_inputs": REQUIRED_INPUTS, "missing_evidence": REQUIRED_INPUTS,
        "critical_risks": [], "high_risks": [], "control_gaps": [],
        "readiness_summary": Value::Null, "trust_summary": Value::Null, "evidence_summary": Value::Null,
        "regulatory_boundary_summary": Value::Null,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-security-assurance", "tool_version": TOOL_VERSION,
        "not_production": true, "not_a_certificate": true, "not_an_approval": true, "not_a_licence": true,
        "not_a_psp": true, "does_not_move_funds": true, "does_not_create_operator": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_external_audit_before_production_claims": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION) ─────────────────────────────────────────

const NOTE: &str = "TEST ONLY — NOT PRODUCTION";

fn valid_input() -> Value {
    json!({
        "risk_register": {
            "count": 2,
            "risks": [
                { "risk_id": "R-TRUST-001", "category": "trust/key management", "severity": "HIGH", "status": "mitigated", "mitigation": "BRL fail-closed + domain-separated keys (ADR-027)" },
                { "risk_id": "R-EVID-001", "category": "evidence integrity", "severity": "MEDIUM", "status": "mitigated", "mitigation": "SHA-256 canonical hashing (tamper-detect)" }
            ], "note": NOTE
        },
        "threat_model": { "actors": 11, "assets": 14, "threats": 21, "trust_boundaries": 7, "note": NOTE },
        "controls_matrix": {
            "controls": [
                { "control_id": "C-RUST-FIRST", "status": "ok", "coverage": "engines em Rust; readiness nunca em TS" },
                { "control_id": "C-BRL-FAIL-CLOSED", "status": "ok", "coverage": "operador revogado bloqueia" },
                { "control_id": "C-REG-GUARD", "status": "ok", "coverage": "make regulatory-check" }
            ], "note": NOTE
        },
        "l0": { "status": "PASS", "level": "L0" },
        "l1": { "status": "L1_READY_FOR_TECHNICAL_REVIEW" },
        "l2": { "status": "L2_READY_FOR_TECHNICAL_REVIEW" },
        "l3": { "status": "L3_READY_FOR_TECHNICAL_REVIEW" },
        "l4": { "status": "L4_READY_FOR_TECHNICAL_REVIEW" },
        "evidence_bundle": { "readiness": "READY_FOR_TECHNICAL_REVIEW", "hashes": { "bundle_hash": "TEST_ONLY_bundle_hash_dead" }, "note": NOTE },
        "trust_brl": { "brl_fail_closed": true, "note": NOTE },
        "regulatory_boundary": {
            "banza_is_open_protocol": true, "banza_is_psp": false, "banza_needs_licence": false,
            "banza_provides_payment_services": false, "production_ready": false,
            "licence_belongs_to_operator": true, "note": NOTE
        }
    })
}

/// TEST-ONLY demo fixtures for the security & risk assurance validator. No fixture represents a real
/// external audit, real certification, production, a licence or a real operator.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut critical = valid.clone();
    critical["risk_register"]["risks"] = json!([
        { "risk_id": "R-LEDGER-CRIT-001", "category": "ledger consistency", "severity": "CRITICAL", "status": "open", "mitigation": "none" }
    ]);

    let mut high = valid.clone();
    high["risk_register"]["risks"] = json!([
        { "risk_id": "R-REPLAY-HIGH-001", "category": "replay/idempotency", "severity": "HIGH", "status": "open", "mitigation": "" }
    ]);

    let mut missing_ev = valid.clone();
    missing_ev
        .as_object_mut()
        .unwrap()
        .remove("evidence_bundle");

    let mut reg_fail = valid.clone();
    reg_fail["regulatory_boundary"] = json!({ "banza_is_open_protocol": true, "banza_is_psp": true, "banza_needs_licence": true, "production_ready": true });

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "assurance_ready_internal_review", "label": "Assurance pronto (revisão interna)", "expected": "ASSURANCE_READY_FOR_INTERNAL_REVIEW", "input": valid },
            { "key": "critical_risk_open", "label": "Risco CRÍTICO aberto", "expected": "ASSURANCE_BLOCKED_BY_CRITICAL_RISK", "input": critical },
            { "key": "high_risk_missing_mitigation", "label": "Risco HIGH sem mitigação", "expected": "ASSURANCE_BLOCKED_BY_HIGH_RISK", "input": high },
            { "key": "missing_evidence_bundle", "label": "Sem Evidence Bundle", "expected": "ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE", "input": missing_ev },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/licença/produção", "expected": "ASSURANCE_INVALID", "input": reg_fail },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-security-assurance", "tool_version": TOOL_VERSION,
        "required_inputs": REQUIRED_INPUTS,
        "severity_values": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
        "status_values": [
            "ASSURANCE_READY_FOR_INTERNAL_REVIEW", "ASSURANCE_INCOMPLETE",
            "ASSURANCE_BLOCKED_BY_CRITICAL_RISK", "ASSURANCE_BLOCKED_BY_HIGH_RISK",
            "ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE", "ASSURANCE_INVALID"
        ],
        "network": "local por defeito — sem fetch; sem integração externa.",
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-security-assurance", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}

// ══════════════════════════════════════════════════════════════════════════════════
// BX2.1–BX2.4 — Security Assurance Deepening Pack (deep assurance)
// ══════════════════════════════════════════════════════════════════════════════════
//
// `validate_deep_assurance` deepens the BX2.0 baseline across four internal tracks — THREAT_AND_ABUSE,
// TRUST_AND_CRYPTO_CEREMONY, OPERATIONAL_RISK_AND_INCIDENT_RESPONSE and EXTERNAL_AUDIT_READINESS — and
// computes a **deep-assurance status IN RUST** (never in TypeScript). It is *aprofundamento de assurance*:
// NOT production, NOT a completed external audit, NOT certification, NOT a licence; it does NOT create an
// operator, does NOT activate external integration, does NOT activate federation, does NOT move funds and
// does NOT make BANZA a payment service provider. Every report carries the boundary flags, `llm_calls = 0`
// and `external_model_called = false`.

pub const DEEP_TOOL_VERSION: &str = "0.1.0";
pub const DEEP_BOUNDARY: &str =
    "BX2.1–BX2.4 é aprofundamento de assurance. Não é produção, não é auditoria externa concluída, não é certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não move fundos e não transforma BANZA em prestador de serviços de pagamento.";

/// The deep-assurance track inputs — the absence of any of these (each is a track summary document)
/// makes the deep pack INCOMPLETE unless a more specific blocker fires first.
pub const REQUIRED_DEEP_INPUTS: &[&str] = &[
    "threat_model_deepening",
    "abuse_cases_summary",
    "trust_ceremony_plan_summary",
    "key_management_policy_summary",
    "brl_revocation_playbook_summary",
    "incident_response_summary",
    "operational_risk_summary",
    "external_audit_readiness_summary",
    "audit_evidence_index_summary",
    "regulatory_boundary_confirmation",
];

pub const DEEP_STATUS_VALUES: &[&str] = &[
    "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW",
    "DEEP_ASSURANCE_INCOMPLETE",
    "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP",
    "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP",
    "DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP",
    "DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP",
    "DEEP_ASSURANCE_INVALID",
];

fn flag_true(v: &Value, k: &str) -> bool {
    v.get(k).and_then(|x| x.as_bool()) == Some(true)
}
/// A documented sub-field is satisfied only when explicitly `true`. Missing/false ⇒ a gap.
fn documented(v: Option<&Value>, k: &str) -> bool {
    v.map(|o| flag_true(o, k)).unwrap_or(false)
}
fn str_ids(v: Option<&Value>, k: &str) -> Vec<String> {
    v.and_then(|o| o.get(k))
        .and_then(|a| a.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

/// Validate the Deep Assurance Pack. `input` may be the object or a `{ input: {...} }` fixture wrapper.
/// The deep-assurance status, the open critical/high gaps, the missing documents and the SHA-256 report
/// hash are all computed here (Rust) — TypeScript only renders.
pub fn validate_deep_assurance(input: &Value) -> Value {
    if !input.is_object() {
        return deep_fail_closed("input do deep assurance deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    // ── track documents ──
    let threat = present(src, "threat_model_deepening");
    let abuse = present(src, "abuse_cases_summary");
    let trust_plan = present(src, "trust_ceremony_plan_summary");
    let key_policy = present(src, "key_management_policy_summary");
    let brl_playbook = present(src, "brl_revocation_playbook_summary");
    let incident = present(src, "incident_response_summary");
    let op_risk = present(src, "operational_risk_summary");
    let audit_pack = present(src, "external_audit_readiness_summary");
    let audit_index = present(src, "audit_evidence_index_summary");
    let regulatory = present(src, "regulatory_boundary_confirmation")
        .or_else(|| present(src, "regulatory_boundary"));

    // ── regulatory boundary: a claim that BANZA is a PSP / needs a licence / is production-ready /
    //    certified / that an external audit is complete is a boundary failure. ──
    let regulatory_fail = [regulatory, threat, op_risk, audit_pack]
        .into_iter()
        .flatten()
        .any(claims_regulatory_fail);
    let boundary_confirmed = regulatory
        .and_then(|r| r.get("banza_is_open_protocol").and_then(|x| x.as_bool()))
        == Some(true)
        && regulatory.and_then(|r| r.get("banza_is_psp").and_then(|x| x.as_bool())) != Some(true);

    // ── TRACK 1: THREAT_AND_ABUSE — critical gaps come from open critical threat gaps and uncovered
    //    critical abuse paths. A present-but-critical-gapped threat model blocks. ──
    let mut threat_critical: Vec<String> = str_ids(threat, "open_critical_threat_gaps");
    threat_critical.extend(str_ids(abuse, "critical_uncovered"));
    let threat_high: Vec<String> = str_ids(threat, "open_high_threat_gaps");
    let threat_present = threat.is_some();
    let threat_critical_gap = threat_present && !threat_critical.is_empty();

    // ── TRACK 2: TRUST_AND_CRYPTO_CEREMONY — a present-but-incomplete plan / policy / playbook blocks. ──
    let trust_present = trust_plan.is_some() || key_policy.is_some() || brl_playbook.is_some();
    let trust_incomplete = (trust_plan.is_some()
        && (!documented(trust_plan, "key_lifecycle_documented")
            || !documented(trust_plan, "ceremony_roles_documented")
            || !documented(trust_plan, "test_only_boundary_documented")))
        || (key_policy.is_some()
            && (!documented(key_policy, "rotation_documented")
                || !documented(key_policy, "revocation_documented")))
        || (brl_playbook.is_some() && !documented(brl_playbook, "fail_closed_documented"));
    let trust_gap = trust_present && trust_incomplete;

    // ── TRACK 3: OPERATIONAL_RISK_AND_INCIDENT_RESPONSE — present-but-incomplete incident response, or an
    //    open critical operational risk, blocks. ──
    let op_critical: Vec<String> = str_ids(op_risk, "open_critical");
    let op_high: Vec<String> = str_ids(op_risk, "open_high");
    let incident_present = incident.is_some() || op_risk.is_some();
    let incident_incomplete = (incident.is_some()
        && (!documented(incident, "severity_matrix_documented")
            || !documented(incident, "containment_steps_documented")
            || !documented(incident, "roles_documented")))
        || !op_critical.is_empty();
    let incident_gap = incident_present && incident_incomplete;

    // ── TRACK 4: EXTERNAL_AUDIT_READINESS — a present audit-readiness pack with a missing/incomplete audit
    //    evidence index (or absent control-evidence map) blocks. ──
    let audit_present = audit_pack.is_some();
    let audit_index_incomplete = audit_index.is_none()
        || !documented(audit_index, "all_evidence_linked")
        || audit_index
            .and_then(|i| i.get("entries"))
            .and_then(|x| x.as_i64())
            .map(|n| n <= 0)
            .unwrap_or(true)
        || !documented(audit_pack, "control_evidence_map_present");
    let audit_evidence_gap = audit_present && audit_index_incomplete;

    // ── missing required track documents ──
    let checks: [(&str, bool); 10] = [
        ("threat_model_deepening", threat.is_some()),
        ("abuse_cases_summary", abuse.is_some()),
        ("trust_ceremony_plan_summary", trust_plan.is_some()),
        ("key_management_policy_summary", key_policy.is_some()),
        ("brl_revocation_playbook_summary", brl_playbook.is_some()),
        ("incident_response_summary", incident.is_some()),
        ("operational_risk_summary", op_risk.is_some()),
        ("external_audit_readiness_summary", audit_pack.is_some()),
        ("audit_evidence_index_summary", audit_index.is_some()),
        ("regulatory_boundary_confirmation", regulatory.is_some()),
    ];
    let missing_documents: Vec<String> = checks
        .iter()
        .filter(|(_, ok)| !ok)
        .map(|(n, _)| (*n).to_string())
        .collect();

    // ── aggregated gaps ──
    let mut open_critical_gaps: Vec<String> = threat_critical.clone();
    open_critical_gaps.extend(op_critical.clone());
    let mut open_high_gaps: Vec<String> = threat_high.clone();
    open_high_gaps.extend(op_high.clone());

    // ── status precedence (computed in Rust) ──
    let status = if regulatory_fail {
        "DEEP_ASSURANCE_INVALID"
    } else if threat_critical_gap {
        "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP"
    } else if trust_gap {
        "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP"
    } else if incident_gap {
        "DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP"
    } else if audit_evidence_gap {
        "DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP"
    } else if !missing_documents.is_empty() {
        "DEEP_ASSURANCE_INCOMPLETE"
    } else {
        "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW"
    };
    let pre_audit_readiness = if status == "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW" {
        "READY_FOR_PRE_AUDIT_REVIEW"
    } else {
        "NOT_READY"
    };

    let track_status = |present: bool, gapped: bool| {
        if !present {
            "missing"
        } else if gapped {
            "gap"
        } else {
            "ok"
        }
    };
    let tracks = json!({
        "threat_and_abuse": {
            "status": track_status(threat_present, threat_critical_gap),
            "critical_gaps": threat_critical,
            "high_gaps": threat_high,
            "documents": ["ABUSE_CASES.md", "ATTACK_SCENARIOS.md", "THREAT_COVERAGE_MATRIX.md", "THREAT_MODEL.md"],
            "abuse_cases_present": abuse.is_some(),
        },
        "trust_and_crypto_ceremony": {
            "status": track_status(trust_present, trust_gap),
            "documents": ["ROOT_KEY_CUSTODY_MODEL.md", "ROOT_KEY_CEREMONY_REQUIREMENTS.md", "KEY_MANAGEMENT_POLICY.md", "BRL_REVOCATION_PLAYBOOK.md", "TRUST_TEST_ONLY_BOUNDARY.md"],
            "production_trust_ceremony_not_executed": true,
        },
        "operational_risk_and_incident_response": {
            "status": track_status(incident_present, incident_gap),
            "open_critical": op_critical,
            "open_high": op_high,
            "documents": ["INCIDENT_RESPONSE_PLAN.md", "OPERATIONAL_RISK_REGISTER.md", "INCIDENT_SEVERITY_MATRIX.md", "SECURITY_EVENT_RUNBOOK.md", "DEPLOYMENT_DRIFT_PLAYBOOK.md"],
        },
        "external_audit_readiness": {
            "status": track_status(audit_present, audit_evidence_gap),
            "documents": ["EXTERNAL_AUDIT_READINESS_PACK.md", "AUDIT_SCOPE.md", "AUDIT_EVIDENCE_INDEX.md", "CONTROL_EVIDENCE_MAP.md", "AUDITOR_BRIEFING.md", "AUDIT_GAPS_AND_OPEN_ITEMS.md"],
            "external_audit_not_performed": true,
        },
    });

    let regulatory_boundary_summary = json!({
        "confirmed": boundary_confirmed,
        "banza_is_open_protocol": true,
        "banza_is_psp": false,
        "licence_belongs_to": "operador autorizado que presta serviços financeiros reais",
        "stance": PROTOCOL_STANCE,
    });

    let mut warnings: Vec<String> = Vec::new();
    if !boundary_confirmed && !regulatory_fail {
        warnings.push(
            "regulatory_boundary_confirmation não confirma explicitamente banza_is_open_protocol=true"
                .into(),
        );
    }
    if abuse.is_none() && threat.is_some() {
        warnings.push(
            "abuse_cases_summary em falta — parte obrigatória do track THREAT_AND_ABUSE".into(),
        );
    }
    if !open_high_gaps.is_empty() {
        warnings.push(format!(
            "lacunas HIGH abertas (informativo): {}",
            open_high_gaps.join(", ")
        ));
    }

    let next_steps: Vec<String> = match status {
        "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW" => vec!["Deep Assurance Pack estruturado para REVISÃO PRÉ-AUDITORIA (test-only). Antes de qualquer afirmação de produção: auditoria externa independente concluída, cerimónia de confiança de produção (M2) executada, piloto controlado e operadores autorizados sob o seu enquadramento regulatório. Não é auditoria concluída, não é certificação, não é licença, não é produção.".into()],
        "DEEP_ASSURANCE_INVALID" => vec!["Remova qualquer afirmação de que BANZA é PSP / precisa de licença / está pronto para produção / certificado / auditoria externa concluída — BANZA é um protocolo aberto e a licença pertence ao operador.".into()],
        "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP" => vec!["Cubra (ou aceite formalmente) as lacunas CRÍTICAS de ameaça/abuso antes da revisão pré-auditoria: ver ABUSE_CASES.md, ATTACK_SCENARIOS.md e THREAT_COVERAGE_MATRIX.md.".into()],
        "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP" => vec!["Complete o plano de cerimónia de confiança / política de gestão de chaves / playbook de revogação BRL (key lifecycle, papéis, fronteira test-only, rotação, revogação, fail-closed) antes da revisão pré-auditoria.".into()],
        "DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP" => vec!["Complete a resposta a incidentes (matriz de severidade, passos de contenção, papéis) e feche riscos operacionais CRÍTICOS abertos antes da revisão pré-auditoria.".into()],
        "DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP" => vec!["Complete o audit evidence index (todas as evidências ligadas) e o control evidence map antes da revisão pré-auditoria — ver AUDIT_EVIDENCE_INDEX.md e CONTROL_EVIDENCE_MAP.md.".into()],
        _ => vec!["Adicione os documentos de track em falta (threat/abuse, trust ceremony, incident response, audit readiness, regulatory boundary) e revalide.".into()],
    };

    let mut report = json!({
        "deep_assurance_status": status,
        "pre_audit_readiness": pre_audit_readiness,
        "required_tracks": ["THREAT_AND_ABUSE", "TRUST_AND_CRYPTO_CEREMONY", "OPERATIONAL_RISK_AND_INCIDENT_RESPONSE", "EXTERNAL_AUDIT_READINESS"],
        "required_inputs": REQUIRED_DEEP_INPUTS,
        "tracks": tracks,
        "open_critical_gaps": open_critical_gaps,
        "open_high_gaps": open_high_gaps,
        "missing_documents": missing_documents,
        "regulatory_boundary_summary": regulatory_boundary_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": DEEP_BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-security-assurance",
        "tool_version": DEEP_TOOL_VERSION,
        "not_production": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "not_a_licence": true,
        "not_a_psp": true,
        "does_not_move_funds": true,
        "does_not_create_operator": true,
        "does_not_activate_federation": true,
        "does_not_activate_external_integration": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_external_audit_before_production_claims": true,
        "external_audit_not_performed": true,
        "production_trust_ceremony_not_executed": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("deep-assurance-{}", &sha256_hex(&canon(src))[..12]));
    report["deep_assurance_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn deep_fail_closed(detail: &str) -> Value {
    json!({
        "deep_assurance_status": "DEEP_ASSURANCE_INVALID", "pre_audit_readiness": "NOT_READY",
        "required_tracks": ["THREAT_AND_ABUSE", "TRUST_AND_CRYPTO_CEREMONY", "OPERATIONAL_RISK_AND_INCIDENT_RESPONSE", "EXTERNAL_AUDIT_READINESS"],
        "required_inputs": REQUIRED_DEEP_INPUTS,
        "tracks": Value::Null, "open_critical_gaps": [], "open_high_gaps": [],
        "missing_documents": REQUIRED_DEEP_INPUTS,
        "regulatory_boundary_summary": Value::Null,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": DEEP_BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-security-assurance", "tool_version": DEEP_TOOL_VERSION,
        "not_production": true, "not_a_certificate": true, "not_an_approval": true, "not_a_licence": true,
        "not_a_psp": true, "does_not_move_funds": true, "does_not_create_operator": true,
        "does_not_activate_federation": true, "does_not_activate_external_integration": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_external_audit_before_production_claims": true,
        "external_audit_not_performed": true, "production_trust_ceremony_not_executed": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

fn valid_deep_input() -> Value {
    json!({
        "threat_model_deepening": { "abuse_cases_documented": true, "attack_scenarios_documented": true, "coverage_matrix_present": true, "open_critical_threat_gaps": [], "open_high_threat_gaps": [], "note": NOTE },
        "abuse_cases_summary": { "count": 12, "critical_uncovered": [], "note": NOTE },
        "trust_ceremony_plan_summary": { "present": true, "key_lifecycle_documented": true, "ceremony_roles_documented": true, "test_only_boundary_documented": true, "note": NOTE },
        "key_management_policy_summary": { "present": true, "rotation_documented": true, "revocation_documented": true, "note": NOTE },
        "brl_revocation_playbook_summary": { "present": true, "fail_closed_documented": true, "note": NOTE },
        "incident_response_summary": { "present": true, "severity_matrix_documented": true, "containment_steps_documented": true, "roles_documented": true, "note": NOTE },
        "operational_risk_summary": { "present": true, "open_critical": [], "open_high": [], "note": NOTE },
        "external_audit_readiness_summary": { "present": true, "scope_documented": true, "control_evidence_map_present": true, "note": NOTE },
        "audit_evidence_index_summary": { "present": true, "entries": 24, "all_evidence_linked": true, "note": NOTE },
        "regulatory_boundary_confirmation": { "banza_is_open_protocol": true, "banza_is_psp": false, "banza_needs_licence": false, "production_ready": false, "external_audit_complete": false, "licence_belongs_to_operator": true, "note": NOTE }
    })
}

/// TEST-ONLY demo fixtures for the deep-assurance validator — one per deep status. No fixture represents a
/// real external audit, real certification, production, a licence, a real ceremony or a real operator.
pub fn deep_demo_fixtures() -> Value {
    let valid = valid_deep_input();

    let mut missing_abuse = valid.clone();
    missing_abuse
        .as_object_mut()
        .unwrap()
        .remove("abuse_cases_summary");

    let mut critical_threat = valid.clone();
    critical_threat["threat_model_deepening"]["open_critical_threat_gaps"] =
        json!(["T-DEEP-CRIT-001"]);

    let mut trust_gap = valid.clone();
    trust_gap["trust_ceremony_plan_summary"]["key_lifecycle_documented"] = json!(false);

    let mut incident_gap = valid.clone();
    incident_gap["incident_response_summary"]["severity_matrix_documented"] = json!(false);

    let mut audit_gap = valid.clone();
    audit_gap["audit_evidence_index_summary"]["all_evidence_linked"] = json!(false);

    let mut reg_fail = valid.clone();
    reg_fail["regulatory_boundary_confirmation"] = json!({ "banza_is_open_protocol": true, "banza_is_psp": true, "banza_needs_licence": true, "external_audit_complete": true });

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "deep_assurance_ready_for_pre_audit_review", "label": "Deep assurance pronto (revisão pré-auditoria)", "expected": "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW", "input": valid },
            { "key": "missing_abuse_cases", "label": "Sem abuse cases (incompleto)", "expected": "DEEP_ASSURANCE_INCOMPLETE", "input": missing_abuse },
            { "key": "critical_threat_gap", "label": "Lacuna CRÍTICA de ameaça/abuso", "expected": "DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP", "input": critical_threat },
            { "key": "trust_ceremony_gap", "label": "Cerimónia de confiança incompleta", "expected": "DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP", "input": trust_gap },
            { "key": "incident_response_gap", "label": "Resposta a incidentes incompleta", "expected": "DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP", "input": incident_gap },
            { "key": "audit_evidence_gap", "label": "Audit evidence index incompleto", "expected": "DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP", "input": audit_gap },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/licença/produção/auditoria concluída", "expected": "DEEP_ASSURANCE_INVALID", "input": reg_fail },
        ]
    })
}

pub fn deep_schema() -> Value {
    json!({
        "tool": "banza-security-assurance", "tool_version": DEEP_TOOL_VERSION,
        "artifact": "security_deep_assurance_report",
        "required_inputs": REQUIRED_DEEP_INPUTS,
        "tracks": ["THREAT_AND_ABUSE", "TRUST_AND_CRYPTO_CEREMONY", "OPERATIONAL_RISK_AND_INCIDENT_RESPONSE", "EXTERNAL_AUDIT_READINESS"],
        "status_values": DEEP_STATUS_VALUES,
        "network": "local por defeito — sem fetch; sem integração externa.",
        "boundary": DEEP_BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn deep_tool_version() -> Value {
    json!({ "tool": "banza-security-assurance", "tool_version": DEEP_TOOL_VERSION, "artifact": "security_deep_assurance_report", "test_only": true, "boundary": DEEP_BOUNDARY })
}
