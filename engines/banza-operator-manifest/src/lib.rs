//! banza-operator-manifest (BX1.6) — local, no-network technical validation of a candidate operator
//! manifest.
//!
//! It validates the **canonical** `OperatorManifest` (per `contracts/openapi/reference-operator.yaml`
//! and the `operator-manifests.json` conformance vectors MAN-001..004: required `operator_id`,
//! `environment`, `simulated`, `production_allowed`, `capabilities`; the sandbox safety invariant
//! `simulated = true`, `production_allowed = false`) plus a **DRAFT candidate-submission extension**
//! (non-normative until governed approval): `key_manifest_url`, `protocol_version`, `base_url`,
//! `supported_levels`. Status, readiness and the SHA-256 hashes are computed **in Rust** — never in
//! TypeScript.
//!
//! Validation is **local by default — no network**. Declared URLs are only checked for well-formedness;
//! their live contents are NOT fetched (`Operator URL validation disabled in this phase`).
//!
//! **Central rule:** Operator Manifest Validation is technical evidence — it is NOT certification, NOT
//! approval, and it does NOT create a real operator or change `/operators`.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const PROTOCOL_VERSION: &str = "1.0.0";
pub const WELL_KNOWN_PATH: &str = "/.well-known/banza/operator.json";
pub const BOUNDARY: &str =
    "Operator Manifest Validation é evidência técnica. Não é certificação, não é aprovação e não cria operador real.";

/// Canonical required fields (normative — conformance vectors MAN-001..003).
pub const CANONICAL_REQUIRED: &[&str] = &[
    "operator_id",
    "environment",
    "simulated",
    "production_allowed",
    "capabilities",
];
/// DRAFT candidate-submission fields (non-normative extension; absence → INCOMPLETE for submission).
pub const SUBMISSION_REQUIRED: &[&str] = &[
    "key_manifest_url",
    "protocol_version",
    "base_url",
    "supported_levels",
];
/// Recommended fields (absence → warning only).
pub const RECOMMENDED: &[&str] = &[
    "name",
    "brl_url",
    "conformance_url",
    "contact",
    "manifest_version",
    "created_at",
];

const ALLOWED_ENVIRONMENTS: &[&str] = &["demo", "sandbox", "pre-production"];
/// URL fields that get a well-formedness check (never fetched).
const URL_FIELDS: &[&str] = &[
    "base_url",
    "key_manifest_url",
    "certificates_url", // legacy field: still URL-checked if present, no longer recommended
    "brl_url",
    "conformance_url",
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
/// Form-only URL check (no network): scheme + a dotted host.
fn well_formed_url(u: &str) -> bool {
    let rest = u
        .strip_prefix("https://")
        .or_else(|| u.strip_prefix("http://"));
    match rest {
        Some(host) => host.len() > 3 && host.contains('.') && !host.contains(' '),
        None => false,
    }
}
/// A truthy signal that the manifest is trying to claim production/certification.
fn truthy(v: Option<&Value>) -> bool {
    match v {
        Some(Value::Bool(b)) => *b,
        Some(Value::String(s)) => {
            let l = s.to_lowercase();
            l == "true" || l == "yes" || l == "certified" || l == "approved"
        }
        _ => false,
    }
}
fn protocol_compatible(pv: &str) -> bool {
    // Accept the exact protocol version or any 1.x.
    pv == PROTOCOL_VERSION || pv.starts_with("1.") || pv == "1" || pv == "1.x"
}

/// Validate a manifest JSON string (the main, native-testable entry). Handles MALFORMED here.
/// `input` may be the manifest object directly, or `{ "manifest": <object> }`.
pub fn validate_manifest_str(input: &str) -> Value {
    let parsed: Value = match serde_json::from_str(input) {
        Ok(v) => v,
        Err(e) => return malformed(&format!("JSON inválido: {e}")),
    };
    let manifest = match parsed.get("manifest") {
        Some(m) if m.is_object() => m.clone(),
        _ => parsed,
    };
    if !manifest.is_object() {
        return malformed("o manifesto deve ser um objecto JSON");
    }
    validate_manifest(&manifest)
}

fn malformed(detail: &str) -> Value {
    envelope(
        "MALFORMED",
        "NOT_READY",
        "",
        "",
        "",
        vec![detail.to_string()],
        vec![],
        vec![],
        vec![],
        Value::Null,
        "",
        "Corrija o JSON do manifesto e revalide.",
    )
}

/// Validate a well-formed manifest object. Status + readiness computed here, in Rust.
pub fn validate_manifest(m: &Value) -> Value {
    let mut errors: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    // ── presence ──
    for f in CANONICAL_REQUIRED {
        if m.get(*f).is_none() {
            missing.push((*f).to_string());
        }
    }
    for f in SUBMISSION_REQUIRED {
        if m.get(*f).is_none() {
            missing.push((*f).to_string());
        }
    }
    for f in RECOMMENDED {
        if m.get(*f).is_none() {
            warnings.push(format!("campo recomendado em falta: {f}"));
        }
    }

    // ── safety / boundary invariants (only when the field is present) ──
    if m.get("production_allowed").and_then(|v| v.as_bool()) == Some(true) {
        errors.push("production_allowed deve ser false (candidato em pré-produção)".into());
    }
    if m.get("simulated").and_then(|v| v.as_bool()) == Some(false) {
        errors.push("simulated deve ser true para um candidato sandbox/demo".into());
    }
    if let Some(env) = str_at(m, "environment") {
        if !ALLOWED_ENVIRONMENTS.contains(&env) {
            errors.push(format!(
                "environment inválido: '{env}' (permitido: demo, sandbox, pre-production)"
            ));
        }
    }
    // production / certification claim → rejected (boundary)
    if truthy(m.get("certified"))
        || truthy(m.get("production_ready"))
        || m.get("production_certificate").is_some()
        || m.get("certificate").is_some()
    {
        errors.push(
            "o manifesto declara certificação/produção — rejeitado. O BanzAI não certifica e não cria operador de produção.".into(),
        );
    }

    // ── protocol version ──
    if let Some(pv) = str_at(m, "protocol_version") {
        if !protocol_compatible(pv) {
            errors.push(format!(
                "protocol_version incompatível: '{pv}' (esperado {PROTOCOL_VERSION} / 1.x)"
            ));
        }
    }

    // ── capabilities ──
    match m.get("capabilities") {
        Some(Value::Object(cap)) => {
            for k in ["supports_wallets", "supports_qr"] {
                if !cap.get(k).and_then(|v| v.as_bool()).unwrap_or(false) {
                    warnings.push(format!("capacidade '{k}' ausente ou false"));
                }
            }
            let settle = cap
                .get("supports_settlement")
                .and_then(|v| v.as_bool())
                .or_else(|| {
                    cap.get("supports_settlement_simulation")
                        .and_then(|v| v.as_bool())
                })
                .unwrap_or(false);
            let wants_l0 = m
                .get("supported_levels")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().any(|x| x.as_str() == Some("L0")))
                .unwrap_or(false);
            if wants_l0 && !settle {
                warnings.push(
                    "supported_levels inclui L0 mas capabilities não declara settlement".into(),
                );
            }
        }
        Some(_) => errors.push("capabilities deve ser um objecto".into()),
        None => {} // already recorded in missing
    }

    // ── URL well-formedness (NO network) ──
    let mut endpoint_checks: Vec<Value> = Vec::new();
    for f in URL_FIELDS {
        if let Some(u) = str_at(m, f) {
            let ok = well_formed_url(u);
            if !ok {
                errors.push(format!("URL malformada em '{f}': {u}"));
            }
            endpoint_checks.push(json!({
                "field": f, "url": u, "well_formed": ok,
                "note": "Operator URL validation disabled in this phase (no network)."
            }));
        }
    }
    if let Some(b) = str_at(m, "base_url") {
        if b.trim().is_empty() {
            errors.push("base_url não pode estar vazio".into());
        }
    }

    // key manifest reference (the trust root the operator points to)
    let km = str_at(m, "key_manifest_url");
    let key_manifest_reference = json!({
        "present": km.is_some(),
        "url": km,
        "well_formed": km.map(well_formed_url),
        "note": "A raiz de confiança do operador é referida por key_manifest_url; o seu conteúdo não é validado nesta fase (sem rede)."
    });

    // ── status (in Rust) ──
    let status = if !errors.is_empty() {
        "INVALID"
    } else if !missing.is_empty() {
        "INCOMPLETE"
    } else {
        "VALID"
    };
    let readiness = match status {
        "VALID" => "READY_FOR_SIMB_PRE_REVIEW",
        "INVALID" => "BLOCKED",
        _ => "NOT_READY",
    };
    let next_step = match status {
        "VALID" => "Manifesto válido (evidência técnica). Prossiga para o SimB Pre-Review Gate.",
        "INVALID" => "Corrija os erros listados e revalide o manifesto.",
        "INCOMPLETE" => "Adicione os campos obrigatórios em falta e revalide.",
        _ => "Corrija o JSON do manifesto e revalide.",
    };

    let required_fields: Vec<&str> = CANONICAL_REQUIRED
        .iter()
        .chain(SUBMISSION_REQUIRED)
        .copied()
        .collect();
    let operator_id = str_at(m, "operator_id").unwrap_or("");
    let environment = str_at(m, "environment").unwrap_or("");
    let protocol_version = str_at(m, "protocol_version").unwrap_or("");

    envelope(
        status,
        readiness,
        operator_id,
        environment,
        protocol_version,
        errors,
        warnings,
        required_fields.iter().map(|s| s.to_string()).collect(),
        missing,
        key_manifest_reference,
        &canon(m),
        next_step,
    )
    .as_object()
    .map(|o| {
        let mut o = o.clone();
        o.insert("endpoint_checks".into(), Value::Array(endpoint_checks));
        Value::Object(o)
    })
    .unwrap()
}

#[allow(clippy::too_many_arguments)]
fn envelope(
    status: &str,
    readiness: &str,
    operator_id: &str,
    environment: &str,
    protocol_version: &str,
    errors: Vec<String>,
    warnings: Vec<String>,
    required_fields: Vec<String>,
    missing_fields: Vec<String>,
    key_manifest_reference: Value,
    manifest_canon: &str,
    next_step: &str,
) -> Value {
    let manifest_hash = if manifest_canon.is_empty() {
        Value::Null
    } else {
        json!(sha256_hex(manifest_canon))
    };
    let manifest_id = if manifest_canon.is_empty() {
        json!(format!("manifest-{}", &sha256_hex("malformed")[..12]))
    } else {
        json!(format!(
            "manifest-{}",
            &sha256_hex(&format!("{operator_id}|{manifest_canon}"))[..12]
        ))
    };
    json!({
        "status": status,
        "manifest_id": manifest_id,
        "operator_id": operator_id,
        "environment": environment,
        "protocol_version": protocol_version,
        "errors": errors,
        "warnings": warnings,
        "required_fields": required_fields,
        "missing_fields": missing_fields,
        "endpoint_checks": Vec::<Value>::new(),
        "key_manifest_reference": key_manifest_reference,
        "manifest_hash": manifest_hash,
        "readiness": readiness,
        "next_step": next_step,
        "well_known_path": WELL_KNOWN_PATH,
        "boundary": BOUNDARY,
        "tool": "banza-operator-manifest",
        "tool_version": TOOL_VERSION,
        "not_a_certificate": true,
        "not_an_approval": true,
        "does_not_create_operator": true,
        "requires_simb_pre_review": true,
        "requires_conformance_evidence_review": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    })
}

// ── fixtures ──────────────────────────────────────────────────────────────────

/// Demo fixtures for the manifest validator, ALL derived from Operador Zero (ADR-041 — Operator Zero
/// Only demo/example policy). The single canonical demo operator is `operator-zero` on
/// `zero.banza.network`; there is no parallel fictional example operator. All variants stay demo-only
/// (simulated, production_allowed=false); the negative ones are Operador Zero scenarios by design.
pub fn demo_fixtures() -> Value {
    let base_caps = json!({
        "supports_wallets": true, "supports_qr": true, "supports_transfers": true,
        "supports_settlement_simulation": true, "supports_payment_requests": true
    });
    let valid = json!({
        "operator_id": "operator-zero", "name": "Operador Zero (simulador demo)",
        "environment": "sandbox", "simulated": true, "production_allowed": false,
        "protocol_version": "1.0.0", "base_url": "https://zero.banza.network",
        "key_manifest_url": "https://zero.banza.network/key-manifest.json",
        "brl_url": "https://zero.banza.network/revocation-list.json",
        "conformance_url": "https://zero.banza.network/conformance/evidence.json",
        "contact": "ops@zero.banza.network", "supported_levels": ["L0"],
        "capabilities": base_caps, "manifest_version": 1, "created_at": "2026-07-16T00:00:00Z"
    });
    let mut missing_km = valid.clone();
    missing_km
        .as_object_mut()
        .unwrap()
        .remove("key_manifest_url");
    let mut bad_pv = valid.clone();
    bad_pv["protocol_version"] = json!("9.9.9");
    let mut prod_claim = valid.clone();
    prod_claim["production_allowed"] = json!(true);
    prod_claim["environment"] = json!("production");
    prod_claim["certified"] = json!(true);

    json!({
        "note": "TEST ONLY — NOT PRODUCTION",
        "fixtures": [
            { "key": "valid_l0_candidate_manifest", "label": "Operador Zero · manifest válido", "expected": "VALID", "manifest": valid },
            { "key": "missing_key_manifest", "label": "Operador Zero · sem key manifest", "expected": "INCOMPLETE", "manifest": missing_km },
            { "key": "bad_protocol_version", "label": "Operador Zero · versão incompatível", "expected": "INVALID", "manifest": bad_pv },
            { "key": "production_claim_manifest", "label": "Operador Zero · produção indevida", "expected": "INVALID", "manifest": prod_claim },
            { "key": "malformed_json", "label": "Operador Zero · JSON malformado", "expected": "MALFORMED", "raw": "{ not valid json" },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-operator-manifest", "tool_version": TOOL_VERSION,
        "well_known_path": WELL_KNOWN_PATH,
        "canonical_required": CANONICAL_REQUIRED,
        "submission_required_draft": SUBMISSION_REQUIRED,
        "recommended": RECOMMENDED,
        "allowed_environments": ALLOWED_ENVIRONMENTS,
        "status_values": ["VALID", "INVALID", "INCOMPLETE", "MALFORMED"],
        "safety_invariant": "sandbox/demo: simulated=true, production_allowed=false; produção/certificação são rejeitadas.",
        "network": "local por defeito — URLs verificadas apenas na forma; conteúdo não é obtido (sem rede).",
        "boundary": BOUNDARY,
        "note": "O núcleo (canonical_required) é normativo (contracts/openapi + vectores MAN-001..004). A extensão de submissão (submission_required_draft) é DRAFT / não-normativa até aprovação governada.",
    })
}

pub fn tool_version() -> Value {
    json!({
        "tool": "banza-operator-manifest", "tool_version": TOOL_VERSION,
        "protocol_version": PROTOCOL_VERSION, "test_only": true, "boundary": BOUNDARY,
    })
}
