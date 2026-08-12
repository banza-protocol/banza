//! banza-m2-protocol-gate (M2) — validates the BANZA **production PROTOCOL implementation** package.
//!
//! From M2 on, L0–L4 "readiness" is historical/evidence; M2 implements the production components of the
//! protocol itself: the production state model, the production contract baseline, protocol release
//! governance, the protocol governance role, the operator self-publication flow and the production trust path —
//! plus the security & deep assurance reports and a regulatory-boundary confirmation. This engine computes
//! the **M2 status IN RUST** (never in TypeScript): the production-protocol gates, the missing artifacts,
//! the blocked items, any forbidden-activation attempts and the SHA-256 report hash. Validation is
//! **local — no network**.
//!
//! **Central rule:** M2 implements the BANZA protocol for production **as an open protocol**. It does NOT
//! transform BANZA into a payment service provider, does NOT process/settle payments, does NOT move or
//! hold funds, does NOT create/activate a real operator, does NOT emit a real production certificate, does
//! NOT activate real federation or external integration, and does NOT issue payment-service authorisation.
//! `/operators` stays `[]` and `production_certificates` stays `false`. Any licence/authorisation belongs
//! to the operator, not to the protocol. Every report carries the boundary flags, `llm_calls = 0` and
//! `external_model_called = false`.

// The report literal carries the full boundary-flag set, which expands past the default `json!` depth.
#![recursion_limit = "512"]

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "M2 prepara o protocolo BANZA para produção enquanto protocolo financeiro aberto. M2 é produção do protocolo, não operação financeira do BANZA. M2 não activa prestação de serviços de pagamento pelo BANZA, não move fundos, não liquida valores, não cria operador financeiro, não emite certificado de produção real, não activa federação nem integração externa e não substitui licença/autorização do operador. O BANZA permanece protocolo financeiro aberto; os operadores autorizados são entidades separadas que implementam o protocolo.";
pub const PROTOCOL_STANCE: &str =
    "BANZA é um protocolo financeiro aberto. O BANZA não é prestador de serviços de pagamento, não é operador financeiro, não processa transacções, não liquida valores, não movimenta fundos e não detém fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.";

/// Required M2 input artifacts (each a summary object). Their absence maps to a specific block gate.
pub const REQUIRED_INPUTS: &[&str] = &[
    "production_state_model_summary",
    "production_contract_baseline_summary",
    "protocol_release_governance_summary",
    "protocol_governance_summary",
    "operator_self_publication_summary",
    "production_trust_path_summary",
    "security_assurance_report",
    "deep_assurance_report",
    "regulatory_boundary_confirmation",
];

pub const STATUS_VALUES: &[&str] = &[
    "M2_PROTOCOL_IMPLEMENTATION_READY",
    "M2_BLOCKED_BY_MISSING_CONTRACTS",
    "M2_BLOCKED_BY_GOVERNANCE_GAP",
    "M2_BLOCKED_BY_TRUST_PATH_GAP",
    "M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP",
    "M2_BLOCKED_BY_ASSURANCE_GAP",
    "M2_INVALID_FORBIDDEN_ACTIVATION",
    "M2_INVALID_REGULATORY_BOUNDARY",
];

/// Boolean flags that, if truthy on the regulatory-boundary confirmation, mean the package is (wrongly)
/// claiming BANZA is a PSP / needs a licence / processes payments / moves funds → INVALID_REGULATORY_BOUNDARY.
const REGULATORY_FAIL_FLAGS: &[&str] = &[
    "banza_is_psp",
    "banza_needs_licence",
    "banza_provides_payment_services",
    "banza_processes_payments",
    "banza_settles_payments",
    "banza_moves_funds",
    "banza_holds_funds",
    "production_ready",
    "certified",
    "licensed",
    "payment_service_authorised",
    "regulator_approved",
];

/// Boolean flags that, if truthy anywhere in the input (top level or under `activation_attempts`), mean the
/// package is trying to ACTIVATE something M2 must never activate → INVALID_FORBIDDEN_ACTIVATION.
const ACTIVATION_FLAGS: &[&str] = &[
    "activate_operator",
    "activate_real_operator",
    "add_real_operator",
    "create_operator",
    "emit_production_certificate",
    "issue_production_certificate",
    "set_production_certificates_true",
    "production_certificates_true",
    "operators_non_empty",
    "activate_payments",
    "activate_real_payments",
    "process_real_payments",
    "move_funds",
    "move_real_funds",
    "activate_federation",
    "activate_external_integration",
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
fn flag_true(v: &Value, k: &str) -> bool {
    v.get(k).and_then(|x| x.as_bool()) == Some(true)
}
/// A documented sub-field is satisfied only when explicitly `true`. Missing/false ⇒ a gap.
fn documented(v: Option<&Value>, k: &str) -> bool {
    v.map(|o| flag_true(o, k)).unwrap_or(false)
}
fn claims_regulatory_fail(v: &Value) -> bool {
    REGULATORY_FAIL_FLAGS.iter().any(|f| flag_true(v, f))
}
/// Collect the activation flags found truthy on `v` (checked at top level and under `activation_attempts`).
fn activation_hits(v: &Value) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    let nested = v.get("activation_attempts");
    for f in ACTIVATION_FLAGS {
        let top = flag_true(v, f);
        let inner = nested.map(|n| flag_true(n, f)).unwrap_or(false);
        if top || inner {
            hits.push((*f).to_string());
        }
    }
    hits
}

/// Validate the M2 production-protocol package. `input` may be the object or a `{ input: {...} }` wrapper.
/// The M2 status, the gates, the missing artifacts, the blocked items and the SHA-256 hash are all
/// computed here (Rust) — TypeScript only renders.
pub fn validate_m2_protocol_gate(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do M2 protocol gate deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let state_model = present(src, "production_state_model_summary");
    let contracts = present(src, "production_contract_baseline_summary");
    let governance = present(src, "protocol_release_governance_summary");
    let governance_role = present(src, "protocol_governance_summary");
    let self_pub = present(src, "operator_self_publication_summary");
    let trust_path = present(src, "production_trust_path_summary");
    let assurance = present(src, "security_assurance_report");
    let deep = present(src, "deep_assurance_report");
    let regulatory = present(src, "regulatory_boundary_confirmation");

    // ── regulatory boundary: an affirmative claim that BANZA is a PSP / needs a licence / processes /
    //    settles / moves funds is a boundary failure. ──
    let regulatory_fail = regulatory.map(claims_regulatory_fail).unwrap_or(false);
    let boundary_confirmed = regulatory
        .and_then(|r| r.get("banza_is_open_protocol").and_then(|x| x.as_bool()))
        == Some(true)
        && regulatory.and_then(|r| r.get("banza_is_psp").and_then(|x| x.as_bool())) != Some(true);

    // ── forbidden activation attempts (checked over the whole input) ──
    let forbidden_activation_attempts = activation_hits(src);

    // ── gates ──
    let contracts_gate = contracts.is_some() && documented(contracts, "schemas_present");
    let governance_gate = governance.is_some()
        && documented(governance, "versioning_documented")
        && documented(governance, "approvals_documented")
        && documented(governance, "compatibility_policy_documented")
        && state_model.is_some()
        && governance_role.is_some()
        && documented(governance_role, "is_not_regulator")
        && regulatory.is_some();
    let trust_path_gate = trust_path.is_some()
        && documented(trust_path, "ceremony_prereqs_documented")
        && documented(trust_path, "signing_flow_documented")
        && documented(trust_path, "revocation_documented")
        && !trust_path
            .map(|t| flag_true(t, "real_keys_generated"))
            .unwrap_or(false);
    let self_pub_gate = self_pub.is_some()
        && documented(self_pub, "manifest_documented")
        && documented(self_pub, "evidence_documented")
        && documented(self_pub, "operator_responsibility_documented");
    let assurance_ready =
        assurance.and_then(|r| str_at(r, "status")) == Some("ASSURANCE_READY_FOR_INTERNAL_REVIEW");
    let deep_ready = deep.and_then(|r| str_at(r, "deep_assurance_status"))
        == Some("DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW");
    let assurance_gate = assurance_ready && deep_ready;

    // ── missing required artifacts ──
    let checks: [(&str, bool); 9] = [
        ("production_state_model_summary", state_model.is_some()),
        ("production_contract_baseline_summary", contracts.is_some()),
        ("protocol_release_governance_summary", governance.is_some()),
        ("protocol_governance_summary", governance_role.is_some()),
        ("operator_self_publication_summary", self_pub.is_some()),
        ("production_trust_path_summary", trust_path.is_some()),
        ("security_assurance_report", assurance.is_some()),
        ("deep_assurance_report", deep.is_some()),
        ("regulatory_boundary_confirmation", regulatory.is_some()),
    ];
    let missing_artifacts: Vec<String> = checks
        .iter()
        .filter(|(_, ok)| !ok)
        .map(|(n, _)| (*n).to_string())
        .collect();

    // ── status precedence (computed in Rust) ──
    let status = if regulatory_fail {
        "M2_INVALID_REGULATORY_BOUNDARY"
    } else if !forbidden_activation_attempts.is_empty() {
        "M2_INVALID_FORBIDDEN_ACTIVATION"
    } else if !contracts_gate {
        "M2_BLOCKED_BY_MISSING_CONTRACTS"
    } else if !governance_gate {
        "M2_BLOCKED_BY_GOVERNANCE_GAP"
    } else if !trust_path_gate {
        "M2_BLOCKED_BY_TRUST_PATH_GAP"
    } else if !self_pub_gate {
        "M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP"
    } else if !assurance_gate {
        "M2_BLOCKED_BY_ASSURANCE_GAP"
    } else {
        "M2_PROTOCOL_IMPLEMENTATION_READY"
    };
    let protocol_production_prepared = status == "M2_PROTOCOL_IMPLEMENTATION_READY";
    let m2_state = if status == "M2_INVALID_REGULATORY_BOUNDARY"
        || status == "M2_INVALID_FORBIDDEN_ACTIVATION"
    {
        "PRE_PRODUCTION"
    } else {
        "M2_PROTOCOL_IMPLEMENTATION"
    };

    let gate = |ok: bool, present: bool| {
        if !present {
            "missing"
        } else if ok {
            "ok"
        } else {
            "gap"
        }
    };
    let production_protocol_gates = json!({
        "contracts": gate(contracts_gate, contracts.is_some()),
        "governance": gate(governance_gate, governance.is_some()),
        "trust_path": gate(trust_path_gate, trust_path.is_some()),
        "operator_self_publication": gate(self_pub_gate, self_pub.is_some()),
        "assurance": gate(assurance_gate, assurance.is_some() && deep.is_some()),
        "regulatory_boundary": if regulatory.is_none() { "missing" } else if boundary_confirmed { "ok" } else { "gap" },
    });

    let mut blocked_items: Vec<String> = Vec::new();
    if !contracts_gate {
        blocked_items.push("production_contract_baseline em falta ou incompleto".into());
    }
    if !governance_gate {
        blocked_items
            .push("protocol_release_governance / state_model / protocol governance role / regulatory boundary incompletos".into());
    }
    if !trust_path_gate {
        blocked_items.push("production_trust_path em falta ou incompleto".into());
    }
    if !self_pub_gate {
        blocked_items.push("operator_self_publication_summary em falta ou incompleto".into());
    }
    if !assurance_gate {
        blocked_items.push(
            "security assurance / deep assurance não prontos (ASSURANCE_READY_FOR_INTERNAL_REVIEW + DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW)".into(),
        );
    }

    let contract_summary = json!({
        "present": contracts.is_some(),
        "schemas_present": documented(contracts, "schemas_present"),
        "schema_count": contracts.and_then(|c| c.get("schema_count")).cloned().unwrap_or(Value::Null),
        "note": "Baseline de contratos de PRODUÇÃO DO PROTOCOLO — não produção financeira.",
    });
    let governance_summary = json!({
        "present": governance.is_some(),
        "state_model_present": state_model.is_some(),
        "protocol_governance_present": governance_role.is_some(),
        "governance_does_not_approve_operators": documented(governance_role, "is_not_regulator"),
        "note": "Publicação do protocolo não é autorização de serviços de pagamento.",
    });
    let trust_path_summary = json!({
        "present": trust_path.is_some(),
        "real_keys_generated": trust_path.map(|t| flag_true(t, "real_keys_generated")).unwrap_or(false),
        "note": "M2 prepara o caminho de trust de produção; não gera chaves reais nem assina certificados reais.",
    });
    let operator_self_publication_summary = json!({
        "present": self_pub.is_some(),
        "operator_responsibility_documented": documented(self_pub, "operator_responsibility_documented"),
        "note": "O operador é responsável por licença/autorização, serviços financeiros, fundos e utilizadores finais.",
    });
    let security_assurance_summary = json!({
        "security_assurance_status": assurance.and_then(|r| r.get("status")).cloned().unwrap_or(Value::Null),
        "deep_assurance_status": deep.and_then(|r| r.get("deep_assurance_status")).cloned().unwrap_or(Value::Null),
        "assurance_ready": assurance_ready,
        "deep_assurance_ready": deep_ready,
    });
    let regulatory_boundary_summary = json!({
        "confirmed": boundary_confirmed,
        "banza_is_open_protocol": true,
        "banza_is_psp": false,
        "licence_belongs_to": "operador autorizado que presta serviços financeiros reais",
        "stance": PROTOCOL_STANCE,
    });

    let next_steps: Vec<String> = match status {
        "M2_PROTOCOL_IMPLEMENTATION_READY" => vec!["Protocolo preparado para produção enquanto protocolo aberto (M2_PROTOCOL_IMPLEMENTATION). Passos seguintes internos: revisão (M2_PROTOCOL_REVIEW) e candidatura (M2_PROTOCOL_CANDIDATE) + auditoria externa. Nenhum operador é activado, nenhum certificado de produção é emitido, nenhum fundo é movido.".into()],
        "M2_INVALID_REGULATORY_BOUNDARY" => vec!["Remova qualquer afirmação de que BANZA é PSP / precisa de licença / processa/liquida/movimenta fundos — BANZA é um protocolo aberto e a licença pertence ao operador.".into()],
        "M2_INVALID_FORBIDDEN_ACTIVATION" => vec![format!("Remova as tentativas de activação proibidas em M2: {}. M2 não activa operador, não emite certificado de produção, não altera /operators nem production_certificates.", forbidden_activation_attempts.join(", "))],
        "M2_BLOCKED_BY_MISSING_CONTRACTS" => vec!["Adicione/complete o production contract baseline (contracts/production/*) e revalide.".into()],
        "M2_BLOCKED_BY_GOVERNANCE_GAP" => vec!["Complete a governação de release do protocolo, o state model, o papel da governação do protocolo e a confirmação de fronteira regulatória.".into()],
        "M2_BLOCKED_BY_TRUST_PATH_GAP" => vec!["Complete o production trust path (pré-requisitos de cerimónia, fluxo de assinatura, revogação) — sem gerar chaves reais.".into()],
        "M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP" => vec!["Complete a auto-publicação do operador (manifest, evidência de conformidade, responsabilidades do operador).".into()],
        _ => vec!["Conclua a Security & Risk Assurance (interna) e a Deep Assurance (pré-auditoria) antes de M2.".into()],
    };

    let mut report = json!({
        "status": status,
        "m2_state": m2_state,
        "required_inputs": REQUIRED_INPUTS,
        "production_protocol_gates": production_protocol_gates,
        "missing_artifacts": missing_artifacts,
        "blocked_items": blocked_items,
        "forbidden_activation_attempts": forbidden_activation_attempts,
        "contract_summary": contract_summary,
        "governance_summary": governance_summary,
        "trust_path_summary": trust_path_summary,
        "operator_self_publication_summary": operator_self_publication_summary,
        "security_assurance_summary": security_assurance_summary,
        "regulatory_boundary_summary": regulatory_boundary_summary,
        "next_steps": next_steps,
        "protocol_production_prepared": protocol_production_prepared,
        "operator_activation_allowed": false,
        "production_certificates_allowed": false,
        "payment_service_operation_allowed": false,
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-m2-protocol-gate",
        "tool_version": TOOL_VERSION,
        "not_production_financial": true,
        "not_a_psp": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "not_a_licence": true,
        "does_not_move_funds": true,
        "does_not_create_operator": true,
        "does_not_activate_federation": true,
        "does_not_activate_external_integration": true,
        "does_not_issue_payment_service_authorisation": true,
        "does_not_make_banza_a_payment_service_provider": true,
        // M2.2 — open protocol governance: participation needs no central human authority.
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "humans_maintain_protocol_not_operators": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "requires_external_audit_before_production_claims": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("m2-gate-{}", &sha256_hex(&canon(src))[..12]));
    report["m2_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "M2_INVALID_REGULATORY_BOUNDARY", "m2_state": "PRE_PRODUCTION",
        "required_inputs": REQUIRED_INPUTS,
        "production_protocol_gates": Value::Null, "missing_artifacts": REQUIRED_INPUTS,
        "blocked_items": [detail], "forbidden_activation_attempts": [],
        "contract_summary": Value::Null, "governance_summary": Value::Null, "trust_path_summary": Value::Null,
        "operator_self_publication_summary": Value::Null, "security_assurance_summary": Value::Null,
        "regulatory_boundary_summary": Value::Null,
        "next_steps": ["Corrija o input e revalide."],
        "protocol_production_prepared": false,
        "operator_activation_allowed": false, "production_certificates_allowed": false,
        "payment_service_operation_allowed": false,
        "boundary": BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-m2-protocol-gate", "tool_version": TOOL_VERSION,
        "not_production_financial": true, "not_a_psp": true, "not_a_certificate": true, "not_an_approval": true,
        "not_a_licence": true, "does_not_move_funds": true, "does_not_create_operator": true,
        "does_not_activate_federation": true, "does_not_activate_external_integration": true,
        "does_not_issue_payment_service_authorisation": true,
        "does_not_make_banza_a_payment_service_provider": true,
        // M2.2 — open protocol governance: participation needs no central human authority.
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "humans_maintain_protocol_not_operators": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "requires_external_audit_before_production_claims": true,
        "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION OPERATION) ───────────────────────────────

const NOTE: &str = "TEST ONLY — NOT PRODUCTION OPERATION";

fn valid_input() -> Value {
    json!({
        "production_state_model_summary": { "present": true, "current_state": "PRE_PRODUCTION", "states_defined": 6, "transitions_defined": true, "note": NOTE },
        "production_contract_baseline_summary": { "present": true, "schemas_present": true, "schema_count": 9, "note": NOTE },
        "protocol_release_governance_summary": { "present": true, "versioning_documented": true, "approvals_documented": true, "compatibility_policy_documented": true, "note": NOTE },
        "protocol_governance_summary": { "present": true, "is_not_regulator": true, "states_defined": true, "note": NOTE },
        "operator_self_publication_summary": { "present": true, "manifest_documented": true, "evidence_documented": true, "operator_responsibility_documented": true, "note": NOTE },
        "production_trust_path_summary": { "present": true, "ceremony_prereqs_documented": true, "signing_flow_documented": true, "revocation_documented": true, "real_keys_generated": false, "note": NOTE },
        "security_assurance_report": { "status": "ASSURANCE_READY_FOR_INTERNAL_REVIEW", "note": NOTE },
        "deep_assurance_report": { "deep_assurance_status": "DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW", "note": NOTE },
        "regulatory_boundary_confirmation": { "banza_is_open_protocol": true, "banza_is_psp": false, "banza_needs_licence": false, "banza_moves_funds": false, "production_ready": false, "licence_belongs_to_operator": true, "note": NOTE }
    })
}

/// TEST-ONLY demo fixtures — one per M2 status. No fixture activates an operator, emits a real production
/// certificate, moves funds, or represents real payment-service operation.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut missing_contracts = valid.clone();
    missing_contracts
        .as_object_mut()
        .unwrap()
        .remove("production_contract_baseline_summary");

    let mut governance_gap = valid.clone();
    governance_gap
        .as_object_mut()
        .unwrap()
        .remove("protocol_release_governance_summary");

    let mut trust_path_gap = valid.clone();
    trust_path_gap
        .as_object_mut()
        .unwrap()
        .remove("production_trust_path_summary");

    let mut operator_self_publication_gap = valid.clone();
    operator_self_publication_gap
        .as_object_mut()
        .unwrap()
        .remove("operator_self_publication_summary");

    let mut assurance_gap = valid.clone();
    assurance_gap["deep_assurance_report"]["deep_assurance_status"] =
        json!("DEEP_ASSURANCE_INCOMPLETE");

    let mut forbidden = valid.clone();
    forbidden["activation_attempts"] =
        json!({ "activate_operator": true, "set_production_certificates_true": true });

    let mut reg_fail = valid.clone();
    reg_fail["regulatory_boundary_confirmation"] = json!({ "banza_is_open_protocol": true, "banza_is_psp": true, "banza_needs_licence": true, "banza_moves_funds": true });

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "m2_protocol_implementation_ready", "label": "M2 pronto (implementação do protocolo)", "expected": "M2_PROTOCOL_IMPLEMENTATION_READY", "input": valid },
            { "key": "missing_contracts", "label": "Sem contract baseline", "expected": "M2_BLOCKED_BY_MISSING_CONTRACTS", "input": missing_contracts },
            { "key": "governance_gap", "label": "Sem release governance", "expected": "M2_BLOCKED_BY_GOVERNANCE_GAP", "input": governance_gap },
            { "key": "trust_path_gap", "label": "Sem production trust path", "expected": "M2_BLOCKED_BY_TRUST_PATH_GAP", "input": trust_path_gap },
            { "key": "operator_self_publication_gap", "label": "Sem operator self-publication", "expected": "M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP", "input": operator_self_publication_gap },
            { "key": "assurance_gap", "label": "Assurance/deep não prontos", "expected": "M2_BLOCKED_BY_ASSURANCE_GAP", "input": assurance_gap },
            { "key": "forbidden_activation_attempt", "label": "Tenta activar operador/certificado", "expected": "M2_INVALID_FORBIDDEN_ACTIVATION", "input": forbidden },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/licença/fundos", "expected": "M2_INVALID_REGULATORY_BOUNDARY", "input": reg_fail },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-m2-protocol-gate", "tool_version": TOOL_VERSION,
        "required_inputs": REQUIRED_INPUTS,
        "status_values": STATUS_VALUES,
        "production_state_model": ["PRE_PRODUCTION", "M2_PROTOCOL_IMPLEMENTATION", "M2_PROTOCOL_REVIEW", "M2_PROTOCOL_CANDIDATE", "M3_OPERATOR_CANDIDATE", "M4_PRODUCTION_NETWORK"],
        "network": "local por defeito — sem fetch; sem integração externa.",
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-m2-protocol-gate", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
