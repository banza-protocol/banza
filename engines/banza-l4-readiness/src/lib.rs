//! banza-l4-readiness (BX1.10) — L4 external-interoperability technical-preparation readiness.
//!
//! It aggregates the upstream readiness reports (Operator Manifest, SimB pre-review, Conformidade L0, L1,
//! L2 and L3 readiness) AND validates, locally, the minimum BANZA external-interoperability artifacts a
//! candidate must have structured before a later technical review: an external interoperability profile,
//! protocol version negotiation, an endpoint contract map, a capability matrix, a request/response
//! envelope, an error mapping, trust & BRL material and an interop evidence reference. The **L4
//! status/readiness is computed IN RUST** (never in TypeScript), together with SHA-256 hashes. Validation
//! is **local — no network**: operator interoperability endpoints/URLs are never contacted and no external
//! integration is performed.
//!
//! **Central rule:** L4 Readiness is preparation of external interoperability — it is NOT active external
//! integration, NOT production, NOT certification, NOT approval, NOT a licence; it does NOT create an
//! operator, does NOT move funds, and does NOT make BANZA a payment service provider. BANZA is an open
//! protocol; authorised operators provide financial services. Every report carries the boundary flags,
//! `llm_calls = 0` and `external_model_called = false`.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "L4 Readiness é preparação de interoperabilidade externa. Não é integração externa activa, não é produção, não é certificação, não é aprovação, não é licença, não cria operador, não move fundos e não transforma BANZA em prestador de serviços de pagamento.";
pub const PROTOCOL_STANCE: &str =
    "BANZA é um protocolo aberto. O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.";

/// Required L4 artifacts — the absence/invalidity of any of these blocks readiness.
pub const REQUIRED_ARTIFACTS: &[&str] = &[
    "operator_manifest",
    "simb_pre_review",
    "conformance_l0",
    "l1_readiness",
    "l2_readiness",
    "l3_readiness",
    "profile",
    "version_negotiation",
    "endpoint_contract",
    "capabilities",
    "envelope",
    "error_mapping",
    "trust",
    "brl",
    "evidence",
];
/// Recommended (absence → warning, not a blocker).
pub const RECOMMENDED_ARTIFACTS: &[&str] = &["failure_handling"];

/// Boolean flag keys that, if truthy on any interop artifact, mean the fixture is trying to declare an
/// active/real external integration, production, active federation, a real payment, a real operator or a
/// licence → L4_INVALID. String notes are NOT used here on purpose (fixtures carry "NOT PRODUCTION").
const PRODUCTION_FLAGS: &[&str] = &[
    "production",
    "external_live_validation",
    "external_integration_active",
    "active_integration",
    "real_integration",
    "real_operator",
    "federation_active",
    "real_payment",
    "moves_real_funds",
    "is_psp",
    "needs_licence",
    "licenca",
    "live",
];

fn str_at<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}
fn arr<'a>(v: &'a Value, k: &str) -> Option<&'a Vec<Value>> {
    v.get(k).and_then(|x| x.as_array())
}
fn canon(v: &Value) -> String {
    serde_json::to_string(v).unwrap_or_default()
}
fn sha256_hex(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}
fn present<'a>(input: &'a Value, k: &str) -> Option<&'a Value> {
    input
        .get(k)
        .filter(|v| !v.is_null() && (v.is_object() || v.is_array()))
}
fn claims_production(v: &Value) -> bool {
    PRODUCTION_FLAGS
        .iter()
        .any(|f| v.get(*f).and_then(|x| x.as_bool()) == Some(true))
}

#[derive(PartialEq, Clone, Copy)]
enum V {
    Ok,
    Invalid,
    Missing,
}
fn verdict_str(v: &V) -> &'static str {
    match v {
        V::Ok => "ok",
        V::Invalid => "invalid",
        V::Missing => "missing",
    }
}

// ── upstream report verdicts (read status only) ──────────────────────────────────

fn manifest_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(r) => match str_at(r, "status") {
            Some("VALID") => V::Ok,
            _ => V::Invalid,
        },
    }
}
fn pass_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(r) => {
            let ok = str_at(r, "pre_review_status")
                .map(|p| p == "SIMB_PRE_REVIEW_PASS")
                .or_else(|| str_at(r, "status").map(|s| s == "PASS"))
                .unwrap_or(false);
            if ok {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}
fn status_eq_verdict(v: Option<&Value>, want: &str) -> V {
    match v {
        None => V::Missing,
        Some(r) => {
            if str_at(r, "status") == Some(want) {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}

// ── interop verdicts (validated here, in Rust) ───────────────────────────────────

/// External interoperability profile: operator id, demo/pre-production environment, protocol_version,
/// supported_versions/capabilities/levels arrays, production false, external_live_validation false.
fn profile_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(p) => {
            if str_at(p, "operator_id").is_none() {
                errs.push("profile sem operator_id".into());
            }
            match str_at(p, "environment") {
                Some(e) if e == "demo" || e == "pre-production" => {}
                _ => errs.push("profile.environment deve ser demo/pre-production".into()),
            }
            if str_at(p, "protocol_version").is_none() {
                errs.push("profile sem protocol_version".into());
            }
            for k in [
                "supported_versions",
                "supported_capabilities",
                "supported_levels",
            ] {
                match arr(p, k) {
                    Some(a) if !a.is_empty() => {}
                    _ => errs.push(format!("profile sem {k}")),
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Version negotiation: the selected version must be in supported_versions and either equal the requested
/// version or a declared fallback; an incompatible selection fails.
fn version_verdict(v: Option<&Value>) -> (V, Vec<String>, Option<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs, None),
        Some(d) => {
            let requested = str_at(d, "requested_version").map(|s| s.to_string());
            let selected = str_at(d, "selected_version").map(|s| s.to_string());
            let supported: Vec<&str> = arr(d, "supported_versions")
                .map(|a| a.iter().filter_map(|x| x.as_str()).collect())
                .unwrap_or_default();
            if requested.is_none() || selected.is_none() || supported.is_empty() {
                errs.push("version_negotiation sem requested/selected/supported_versions".into());
            }
            if let Some(sel) = selected.as_deref() {
                if !supported.contains(&sel) {
                    errs.push(
                        "version_negotiation: selected_version não está em supported_versions"
                            .into(),
                    );
                }
                if requested.as_deref() != Some(sel)
                    && str_at(d, "fallback").is_none()
                    && d.get("fallback").is_none()
                {
                    errs.push(
                        "version_negotiation: selected != requested sem fallback declarado".into(),
                    );
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs, selected)
        }
    }
}

/// Endpoint contract map: each entry needs path, method, content_type, request/response/error schema
/// references and idempotency/trace requirements.
fn endpoint_verdict(v: Option<&Value>) -> (V, Vec<String>, usize) {
    let mut errs = Vec::new();
    let entries = v.and_then(|d| arr(d, "endpoints").or_else(|| d.as_array()));
    let entries = match (v, entries) {
        (None, _) => return (V::Missing, errs, 0),
        (Some(_), None) => {
            errs.push("endpoint_contract_map sem endpoints".into());
            return (V::Invalid, errs, 0);
        }
        (Some(_), Some(e)) => e,
    };
    if entries.is_empty() {
        errs.push("endpoint_contract_map vazio".into());
        return (V::Invalid, errs, 0);
    }
    for e in entries {
        for field in [
            "path",
            "method",
            "content_type",
            "request_schema",
            "response_schema",
            "error_schema",
        ] {
            if str_at(e, field).is_none() {
                errs.push(format!("endpoint sem {field}"));
            }
        }
        if e.get("idempotency").is_none() {
            errs.push("endpoint sem requisito de idempotency".into());
        }
        if e.get("trace").is_none() {
            errs.push("endpoint sem requisito de trace".into());
        }
    }
    let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
    (verdict, errs, entries.len())
}

/// Capability matrix: the interoperability capabilities the operator declares must be present and
/// coherent (each a boolean/string), plus the readiness levels supported.
fn capabilities_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(m) => {
            for cap in [
                "payments_flow_readiness",
                "federation_readiness",
                "trust",
                "brl",
                "evidence",
                "conformance",
            ] {
                if m.get(cap).is_none() {
                    errs.push(format!("capability_matrix sem {cap}"));
                }
            }
            match arr(m, "readiness_levels") {
                Some(a) if !a.is_empty() => {}
                _ => errs.push("capability_matrix sem readiness_levels".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Request/response envelope: request_id, trace_id, correlation_id, operator_id, counterpart_operator_id,
/// protocol_version and timestamp.
fn envelope_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(d) => {
            for field in [
                "request_id",
                "trace_id",
                "correlation_id",
                "operator_id",
                "counterpart_operator_id",
                "protocol_version",
                "timestamp",
            ] {
                if str_at(d, field).is_none() {
                    errs.push(format!("envelope sem {field}"));
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Error mapping: each entry maps a canonical BANZA error code to an operator-local code, with a
/// retryable flag and a traceable error reference.
fn error_mapping_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    let entries = v.and_then(|d| arr(d, "errors").or_else(|| d.as_array()));
    let entries = match (v, entries) {
        (None, _) => return (V::Missing, errs),
        (Some(_), None) => {
            errs.push("error_mapping sem errors".into());
            return (V::Invalid, errs);
        }
        (Some(_), Some(e)) => e,
    };
    if entries.is_empty() {
        errs.push("error_mapping vazio".into());
        return (V::Invalid, errs);
    }
    for e in entries {
        if str_at(e, "canonical_code").is_none() {
            errs.push("error_mapping entry sem canonical_code".into());
        }
        if str_at(e, "external_code").is_none() && str_at(e, "operator_code").is_none() {
            errs.push("error_mapping entry sem external/operator code".into());
        }
        if e.get("retryable").is_none() {
            errs.push("error_mapping entry sem retryable".into());
        }
        if str_at(e, "trace_reference").is_none() {
            errs.push("error_mapping entry sem trace_reference".into());
        }
    }
    let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
    (verdict, errs)
}

/// Trust: key manifest form (keys array + a root key), and, if present, certificate form.
fn trust_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(tb) => {
            match tb.get("key_manifest") {
                Some(k) if k.is_object() => {
                    let has_keys = k.get("keys").map(|a| a.is_array()).unwrap_or(false);
                    let has_root = str_at(k, "root_public_key").is_some()
                        || str_at(k, "root_key_id").is_some();
                    if !has_keys || !has_root {
                        errs.push("trust: key_manifest sem keys[]/root key".into());
                    }
                }
                _ => errs.push("trust sem key_manifest".into()),
            }
            if let Some(cert) = tb.get("certificate").filter(|c| c.is_object()) {
                if str_at(cert, "operator_id").is_none()
                    || str_at(cert, "issuer").is_none()
                    || str_at(cert, "signature").is_none()
                {
                    errs.push("trust: certificate mal formado".into());
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// BRL — fail-closed: well-formed (issuer "BANZA" + revoked array) and NO interop operator on it.
fn brl_verdict(v: Option<&Value>, operators: &BTreeSet<String>) -> (V, Vec<String>, Vec<String>) {
    let mut errs = Vec::new();
    let mut revoked_hits = Vec::new();
    let brl = v.and_then(|tb| tb.get("brl"));
    match brl {
        None => (V::Missing, errs, revoked_hits),
        Some(b) if b.is_object() => {
            if str_at(b, "issuer") != Some("BANZA") {
                errs.push("BRL com issuer != BANZA (fail-closed)".into());
            }
            match arr(b, "revoked") {
                None => errs.push("BRL sem lista revoked (fail-closed)".into()),
                Some(list) => {
                    for entry in list {
                        if let Some(id) = str_at(entry, "operator_id") {
                            if operators.contains(id) {
                                revoked_hits.push(id.to_string());
                            }
                        }
                    }
                }
            }
            if !revoked_hits.is_empty() {
                errs.push(format!(
                    "operador de interoperabilidade revogado na BRL: {} (fail-closed, INV-FEDEVAL-002)",
                    revoked_hits.join(", ")
                ));
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs, revoked_hits)
        }
        _ => {
            errs.push("BRL mal formada (fail-closed)".into());
            (V::Invalid, errs, revoked_hits)
        }
    }
}

fn evidence_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(d) => {
            let has_ref = str_at(d, "bundle_hash").is_some()
                || str_at(d, "bundle_id").is_some()
                || str_at(d, "hash").is_some()
                || str_at(d, "id").is_some();
            if has_ref {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}

/// Operator ids referenced by the interop surface (profile + envelope). Used by the BRL fail-closed check.
fn interop_operators(profile: Option<&Value>, envelope: Option<&Value>) -> BTreeSet<String> {
    let mut ids = BTreeSet::new();
    if let Some(p) = profile {
        if let Some(s) = str_at(p, "operator_id") {
            ids.insert(s.to_string());
        }
    }
    if let Some(e) = envelope {
        for k in ["operator_id", "counterpart_operator_id"] {
            if let Some(s) = str_at(e, k) {
                ids.insert(s.to_string());
            }
        }
    }
    ids
}

/// Validate the L4 external-interoperability readiness surface. `input` may be the object or a
/// `{ input: {...} }` fixture wrapper.
pub fn validate_l4(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do L4 readiness deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let manifest = present(src, "operator_manifest");
    let simb = present(src, "simb_pre_review").or_else(|| present(src, "simb"));
    let l0 = present(src, "conformance_l0").or_else(|| present(src, "l0"));
    let l1 = present(src, "l1_readiness").or_else(|| present(src, "l1"));
    let l2 = present(src, "l2_readiness").or_else(|| present(src, "l2"));
    let l3 = present(src, "l3_readiness").or_else(|| present(src, "l3"));
    let profile =
        present(src, "external_interoperability_profile").or_else(|| present(src, "profile"));
    let version = present(src, "version_negotiation");
    let endpoint =
        present(src, "endpoint_contract_map").or_else(|| present(src, "endpoint_contract"));
    let capabilities = present(src, "capability_matrix").or_else(|| present(src, "capabilities"));
    let envelope = present(src, "interop_envelope").or_else(|| present(src, "envelope"));
    let error_mapping = present(src, "error_mapping");
    let trust_brl = present(src, "trust_and_brl").or_else(|| present(src, "trust"));
    let evidence = present(src, "interop_evidence").or_else(|| present(src, "evidence_bundle"));

    let production_claim = [profile, envelope, version]
        .into_iter()
        .flatten()
        .any(claims_production);

    let man_v = manifest_verdict(manifest);
    let simb_v = pass_verdict(simb);
    let l0_v = pass_verdict(l0);
    let l1_v = status_eq_verdict(l1, "L1_READY_FOR_TECHNICAL_REVIEW");
    let l2_v = status_eq_verdict(l2, "L2_READY_FOR_TECHNICAL_REVIEW");
    let l3_v = status_eq_verdict(l3, "L3_READY_FOR_TECHNICAL_REVIEW");
    let (profile_v, profile_errs) = profile_verdict(profile);
    let (version_v, version_errs, selected_version) = version_verdict(version);
    let (endpoint_v, endpoint_errs, endpoint_count) = endpoint_verdict(endpoint);
    let (cap_v, cap_errs) = capabilities_verdict(capabilities);
    let (env_v, env_errs) = envelope_verdict(envelope);
    let (err_v, err_errs) = error_mapping_verdict(error_mapping);
    let (trust_v, trust_errs) = trust_verdict(trust_brl);
    let operators = interop_operators(profile, envelope);
    let (brl_v, brl_errs, revoked_hits) = brl_verdict(trust_brl, &operators);
    let ev_v = evidence_verdict(evidence);

    let pairs: [(&str, V); 15] = [
        ("operator_manifest", man_v),
        ("simb_pre_review", simb_v),
        ("conformance_l0", l0_v),
        ("l1_readiness", l1_v),
        ("l2_readiness", l2_v),
        ("l3_readiness", l3_v),
        ("profile", profile_v),
        ("version_negotiation", version_v),
        ("endpoint_contract", endpoint_v),
        ("capabilities", cap_v),
        ("envelope", env_v),
        ("error_mapping", err_v),
        ("trust", trust_v),
        ("brl", brl_v),
        ("evidence", ev_v),
    ];
    let mut invalid_artifacts: Vec<String> = Vec::new();
    let mut missing_artifacts: Vec<String> = Vec::new();
    for (name, v) in pairs.iter() {
        match v {
            V::Invalid => invalid_artifacts.push((*name).to_string()),
            V::Missing => missing_artifacts.push((*name).to_string()),
            V::Ok => {}
        }
    }

    // ── status precedence (computed in Rust) ──
    let status = if production_claim {
        "L4_INVALID"
    } else if man_v == V::Invalid {
        "L4_BLOCKED_BY_MANIFEST"
    } else if simb_v == V::Invalid {
        "L4_BLOCKED_BY_SIMB"
    } else if l0_v == V::Invalid {
        "L4_BLOCKED_BY_L0"
    } else if l1_v == V::Invalid {
        "L4_BLOCKED_BY_L1"
    } else if l2_v == V::Invalid {
        "L4_BLOCKED_BY_L2"
    } else if l3_v == V::Invalid {
        "L4_BLOCKED_BY_L3"
    } else if profile_v == V::Invalid {
        "L4_BLOCKED_BY_PROFILE"
    } else if version_v == V::Invalid {
        "L4_BLOCKED_BY_VERSION_NEGOTIATION"
    } else if endpoint_v == V::Invalid {
        "L4_BLOCKED_BY_ENDPOINT_CONTRACT"
    } else if cap_v == V::Invalid {
        "L4_BLOCKED_BY_CAPABILITIES"
    } else if env_v == V::Invalid {
        "L4_BLOCKED_BY_ENVELOPE"
    } else if err_v == V::Invalid {
        "L4_BLOCKED_BY_ERROR_MAPPING"
    } else if trust_v == V::Invalid {
        "L4_BLOCKED_BY_TRUST"
    } else if brl_v == V::Invalid {
        "L4_BLOCKED_BY_BRL"
    } else if !missing_artifacts.is_empty() {
        "L4_INCOMPLETE"
    } else {
        "L4_READY_FOR_TECHNICAL_REVIEW"
    };
    let readiness = if status == "L4_READY_FOR_TECHNICAL_REVIEW" {
        "READY"
    } else {
        "NOT_READY"
    };

    // ── summaries ──
    let interoperability_summary = json!({
        "profile": verdict_str(&profile_v),
        "operators": operators.iter().cloned().collect::<Vec<_>>(),
        "protocol_version": profile.and_then(|p| str_at(p, "protocol_version")),
        "errors": profile_errs,
        "note": "Interoperabilidade externa test-only entre operadores que implementam o protocolo; sem rede; sem integração activa; sem fundos."
    });
    let version_negotiation_summary = json!({
        "version_negotiation": verdict_str(&version_v),
        "selected_version": selected_version,
        "errors": version_errs,
    });
    let endpoint_contract_summary = json!({
        "endpoint_contract": verdict_str(&endpoint_v),
        "endpoint_count": endpoint_count,
        "errors": endpoint_errs,
    });
    let capability_summary = json!({
        "capabilities": verdict_str(&cap_v),
        "errors": cap_errs,
    });
    let envelope_summary = json!({
        "envelope": verdict_str(&env_v),
        "errors": env_errs,
    });
    let error_mapping_summary = json!({
        "error_mapping": verdict_str(&err_v),
        "errors": err_errs,
    });
    let trust_summary = json!({
        "trust": verdict_str(&trust_v),
        "errors": trust_errs,
        "note": "Verificação de forma; sem rede; sem chave de produção."
    });
    let brl_summary = json!({
        "brl": verdict_str(&brl_v),
        "revoked_operators": revoked_hits,
        "errors": brl_errs,
        "note": "BRL fail-closed: um operador revogado bloqueia (INV-FEDEVAL-002)."
    });
    let evidence_summary = json!({
        "evidence": verdict_str(&ev_v),
        "bundle_hash": evidence.and_then(|d| str_at(d, "bundle_hash").or_else(|| str_at(d, "hash"))),
        "bundle_id": evidence.and_then(|d| str_at(d, "bundle_id").or_else(|| str_at(d, "id"))),
        "disclaimer": "Evidência técnica — não é certificação, não é aprovação e não é licença.",
    });

    // ── warnings ──
    let mut warnings: Vec<String> = Vec::new();
    if present(src, "failure_handling").is_none() {
        warnings.push(
            "recomendado em falta: failure_handling (como a interoperabilidade trata falhas/retries/revogação)"
                .into(),
        );
    }
    if ev_v == V::Invalid {
        warnings.push(
            "interop_evidence sem hash/id técnico — adicione uma referência ao bundle".into(),
        );
    }

    let next_steps: Vec<String> = match status {
        "L4_READY_FOR_TECHNICAL_REVIEW" => vec!["Superfície de interoperabilidade externa L4 estruturada (preparação técnica, test-only). A integração e a produção pertencem aos operadores autorizados, que publicam evidência verificável de conformidade. Não houve integração externa activa nem movimentação de fundos.".into()],
        "L4_INVALID" => vec!["Remova a declaração de integração externa activa/produção/federação activa/pagamento real/operador real/licença — L4 é preparação técnica test-only.".into()],
        "L4_BLOCKED_BY_MANIFEST" => vec!["Corrija o Operator Manifest (deve ser VALID) e revalide.".into()],
        "L4_BLOCKED_BY_SIMB" => vec!["Obtenha um SimB PASS antes de preparar L4.".into()],
        "L4_BLOCKED_BY_L0" => vec!["Obtenha uma Conformidade L0 PASS antes de preparar L4.".into()],
        "L4_BLOCKED_BY_L1" => vec!["Obtenha uma L1 Readiness pronta antes de preparar L4.".into()],
        "L4_BLOCKED_BY_L2" => vec!["Obtenha uma L2 Readiness pronta antes de preparar L4.".into()],
        "L4_BLOCKED_BY_L3" => vec!["Obtenha uma L3 Readiness pronta antes de preparar L4.".into()],
        "L4_BLOCKED_BY_PROFILE" => vec!["Complete o external interoperability profile (operator_id, environment, protocol_version, supported_versions/capabilities/levels; production=false).".into()],
        "L4_BLOCKED_BY_VERSION_NEGOTIATION" => vec!["A selected_version deve estar em supported_versions e coincidir com a requested ou ter fallback declarado.".into()],
        "L4_BLOCKED_BY_ENDPOINT_CONTRACT" => vec!["Cada endpoint precisa de path, method, content_type, request/response/error schema e requisitos de idempotency/trace.".into()],
        "L4_BLOCKED_BY_CAPABILITIES" => vec!["A capability matrix deve declarar payments/federation/trust/brl/evidence/conformance e os readiness levels.".into()],
        "L4_BLOCKED_BY_ENVELOPE" => vec!["O envelope precisa de request_id, trace_id, correlation_id, operator_id, counterpart_operator_id, protocol_version e timestamp.".into()],
        "L4_BLOCKED_BY_ERROR_MAPPING" => vec!["Cada erro precisa de canonical_code, código externo, retryable e trace_reference.".into()],
        "L4_BLOCKED_BY_TRUST" => vec!["Forneça key manifest (e certificate, se aplicável) bem formados.".into()],
        "L4_BLOCKED_BY_BRL" => vec!["A BRL deve ser bem formada e nenhum operador da interoperabilidade pode estar revogado (fail-closed).".into()],
        _ => vec!["Adicione os artefactos em falta e revalide.".into()],
    };

    let mut report = json!({
        "status": status,
        "readiness": readiness,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "missing_artifacts": missing_artifacts,
        "invalid_artifacts": invalid_artifacts,
        "interoperability_summary": interoperability_summary,
        "version_negotiation_summary": version_negotiation_summary,
        "endpoint_contract_summary": endpoint_contract_summary,
        "capability_summary": capability_summary,
        "envelope_summary": envelope_summary,
        "error_mapping_summary": error_mapping_summary,
        "trust_summary": trust_summary,
        "brl_summary": brl_summary,
        "evidence_summary": evidence_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "operator_url_validation": "disabled",
        "external_integration": "disabled",
        "operator_url_note": "Validação por URL/integração externa real do operador desactivada nesta fase; será uma fase futura e exigirá confirmação explícita.",
        "tool": "banza-l4-readiness",
        "tool_version": TOOL_VERSION,
        "not_external_integration": true,
        "not_active_federation": true,
        "not_a_payment": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "not_a_licence": true,
        "not_a_psp": true,
        "does_not_move_funds": true,
        "does_not_create_operator": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "requires_conformance_evidence_review": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("l4-{}", &sha256_hex(&canon(src))[..12]));
    report["l4_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "L4_INVALID", "readiness": "NOT_READY",
        "required_artifacts": REQUIRED_ARTIFACTS, "missing_artifacts": REQUIRED_ARTIFACTS,
        "invalid_artifacts": [],
        "interoperability_summary": Value::Null, "version_negotiation_summary": Value::Null,
        "endpoint_contract_summary": Value::Null, "capability_summary": Value::Null,
        "envelope_summary": Value::Null, "error_mapping_summary": Value::Null,
        "trust_summary": Value::Null, "brl_summary": Value::Null, "evidence_summary": Value::Null,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "operator_url_validation": "disabled", "external_integration": "disabled",
        "tool": "banza-l4-readiness", "tool_version": TOOL_VERSION,
        "not_external_integration": true, "not_active_federation": true, "not_a_payment": true,
        "not_a_certificate": true, "not_an_approval": true, "not_a_licence": true, "not_a_psp": true,
        "does_not_move_funds": true, "does_not_create_operator": true,
        "does_not_make_banza_a_payment_service_provider": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "requires_conformance_evidence_review": true, "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION) ─────────────────────────────────────────

const NOTE: &str = "TEST ONLY — NOT PRODUCTION";

fn valid_input() -> Value {
    json!({
        "operator_manifest": { "status": "VALID", "operator_id": "operator-A-test" },
        "simb_pre_review": { "status": "PASS", "pre_review_status": "SIMB_PRE_REVIEW_PASS" },
        "conformance_l0": { "status": "PASS", "level": "L0" },
        "l1_readiness": { "status": "L1_READY_FOR_TECHNICAL_REVIEW", "readiness": "READY" },
        "l2_readiness": { "status": "L2_READY_FOR_TECHNICAL_REVIEW", "readiness": "READY" },
        "l3_readiness": { "status": "L3_READY_FOR_TECHNICAL_REVIEW", "readiness": "READY" },
        "external_interoperability_profile": {
            "operator_id": "operator-A-test", "environment": "pre-production", "protocol_version": "1.0",
            "supported_versions": ["1.0"], "supported_capabilities": ["payments", "federation", "trust", "evidence"],
            "supported_levels": ["L0", "L1", "L2", "L3", "L4"], "production": false, "external_live_validation": false, "note": NOTE
        },
        "version_negotiation": {
            "requested_version": "1.0", "supported_versions": ["1.0"], "selected_version": "1.0",
            "fallback": "none", "note": NOTE
        },
        "endpoint_contract_map": {
            "endpoints": [
                { "path": "/.well-known/banza/operator.json", "method": "GET", "content_type": "application/json", "request_schema": "none", "response_schema": "operator-manifest.schema.json", "error_schema": "error.schema.json", "idempotency": false, "trace": true },
                { "path": "/federation/routing", "method": "POST", "content_type": "application/json", "request_schema": "federation-routing.json", "response_schema": "federation-obligation.json", "error_schema": "error.schema.json", "idempotency": true, "trace": true }
            ], "note": NOTE
        },
        "capability_matrix": {
            "payments_flow_readiness": true, "federation_readiness": true, "trust": true, "brl": true,
            "evidence": true, "conformance": true, "readiness_levels": ["L0", "L1", "L2", "L3", "L4"], "note": NOTE
        },
        "interop_envelope": {
            "request_id": "req_test_0001", "trace_id": "itrace_0001", "correlation_id": "icorr_0001",
            "operator_id": "operator-A-test", "counterpart_operator_id": "operator-B-test",
            "protocol_version": "1.0", "timestamp": "2026-07-16T00:00:00Z", "signature": "TEST_ONLY_sig", "note": NOTE
        },
        "error_mapping": {
            "errors": [
                { "canonical_code": "BANZA_ERR_IDEMPOTENCY_CONFLICT", "external_code": "OP_409", "retryable": false, "trace_reference": "itrace_0001" },
                { "canonical_code": "BANZA_ERR_UNSUPPORTED_VERSION", "external_code": "OP_426", "retryable": false, "trace_reference": "itrace_0001" }
            ], "note": NOTE
        },
        "trust_and_brl": {
            "key_manifest": { "schema_version": "1", "root_key_id": "test-banza-root", "root_public_key": "TEST_ONLY_pk", "keys": [{ "key_id": "test-cert-key", "public_key": "TEST_ONLY_pk", "domain": "certification" }] },
            "certificate": { "schema_version": "1", "operator_id": "operator-A-test", "certification_level": 0, "issuer": "BANZA", "issuer_key_id": "test-banza-cert-202607", "signature": "TEST_ONLY_sig" },
            "brl": { "schema_version": "1", "issuer": "BANZA", "issuer_key_id": "test-banza-brl-202607", "issued_at": "2026-07-16T00:00:00Z", "expires_at": "2026-07-16T06:00:00Z", "revoked": [], "signature": "TEST_ONLY_sig" }
        },
        "interop_evidence": {
            "bundle_id": "eb_test_0001", "bundle_hash": "TEST_ONLY_hash_deadbeefcafe",
            "readiness": "READY_FOR_TECHNICAL_REVIEW",
            "disclaimer": "Evidência técnica — não é certificação, não é aprovação e não é licença.", "note": NOTE
        }
    })
}

/// TEST-ONLY demo fixtures for the L4 external-interoperability readiness validator. No fixture represents
/// a real integration, a real operator, a real payment, an active federation or a licence.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut missing_l3 = valid.clone();
    missing_l3.as_object_mut().unwrap().remove("l3_readiness");

    let mut version_fail = valid.clone();
    version_fail["version_negotiation"]["selected_version"] = json!("9.9"); // not in supported_versions

    let mut endpoint_fail = valid.clone();
    endpoint_fail["endpoint_contract_map"]["endpoints"][0]
        .as_object_mut()
        .unwrap()
        .remove("response_schema"); // required field missing

    let mut envelope_fail = valid.clone();
    envelope_fail["interop_envelope"]
        .as_object_mut()
        .unwrap()
        .remove("trace_id"); // required field missing

    let mut error_fail = valid.clone();
    error_fail["error_mapping"]["errors"][0]
        .as_object_mut()
        .unwrap()
        .remove("canonical_code"); // no canonical code

    let mut brl_revoked = valid.clone();
    brl_revoked["trust_and_brl"]["brl"]["revoked"] = json!([
        { "operator_id": "operator-B-test", "reason": "test-only", "permanent": false, "since": "2026-07-16T00:00:00Z" }
    ]);

    let mut production = valid.clone();
    production["external_interoperability_profile"]["production"] = json!(true);
    production["external_interoperability_profile"]["external_live_validation"] = json!(true);

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "l4_ready_external_interop", "label": "Interop L4 pronta", "expected": "L4_READY_FOR_TECHNICAL_REVIEW", "input": valid },
            { "key": "missing_l3", "label": "L3 Readiness ausente", "expected": "L4_INCOMPLETE", "input": missing_l3 },
            { "key": "version_negotiation_fail", "label": "Version negotiation incompatível", "expected": "L4_BLOCKED_BY_VERSION_NEGOTIATION", "input": version_fail },
            { "key": "endpoint_contract_fail", "label": "Endpoint contract incompleto", "expected": "L4_BLOCKED_BY_ENDPOINT_CONTRACT", "input": endpoint_fail },
            { "key": "envelope_fail", "label": "Envelope incompleto", "expected": "L4_BLOCKED_BY_ENVELOPE", "input": envelope_fail },
            { "key": "error_mapping_fail", "label": "Error mapping incompleto", "expected": "L4_BLOCKED_BY_ERROR_MAPPING", "input": error_fail },
            { "key": "brl_revoked", "label": "Operador revogado na BRL", "expected": "L4_BLOCKED_BY_BRL", "input": brl_revoked },
            { "key": "production_claim", "label": "Declara integração externa activa/produção", "expected": "L4_INVALID", "input": production },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-l4-readiness", "tool_version": TOOL_VERSION,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "profile_fields": ["operator_id", "environment", "protocol_version", "supported_versions", "supported_capabilities", "supported_levels", "production", "external_live_validation"],
        "status_values": [
            "L4_READY_FOR_TECHNICAL_REVIEW", "L4_BLOCKED_BY_MANIFEST", "L4_BLOCKED_BY_SIMB",
            "L4_BLOCKED_BY_L0", "L4_BLOCKED_BY_L1", "L4_BLOCKED_BY_L2", "L4_BLOCKED_BY_L3",
            "L4_BLOCKED_BY_PROFILE", "L4_BLOCKED_BY_VERSION_NEGOTIATION", "L4_BLOCKED_BY_ENDPOINT_CONTRACT",
            "L4_BLOCKED_BY_CAPABILITIES", "L4_BLOCKED_BY_ENVELOPE", "L4_BLOCKED_BY_ERROR_MAPPING",
            "L4_BLOCKED_BY_TRUST", "L4_BLOCKED_BY_BRL", "L4_INCOMPLETE", "L4_INVALID"
        ],
        "brl": "fail-closed: um operador revogado bloqueia (INV-FEDEVAL-002)",
        "network": "local por defeito — sem fetch; validação por URL/integração externa real desactivada nesta fase.",
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-l4-readiness", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
