//! banza-l1-readiness (BX1.7) — L1 technical-preparation readiness aggregator.
//!
//! It aggregates the artifacts a candidate operator must have structured before a later technical review:
//! the Operator Manifest report (BX1.6), the SimB pre-review report (BX1.3/1.4), the Conformidade L0
//! report (BX1.3), the key manifest, certificates, BRL, conformance evidence and a well-known map. It
//! computes the **L1 readiness status IN RUST** (never in TypeScript) and SHA-256 hashes. Validation is
//! **local by default — no network**: declared endpoints/URLs are never fetched.
//!
//! **Central rule:** L1 Readiness is technical preparation — NOT certification, NOT approval; it does NOT
//! create a real operator and does NOT substitute verifiable conformance evidence. Every report carries the boundary flags,
//! `llm_calls = 0` and `external_model_called = false`.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "L1 Readiness é preparação técnica. Não é certificação, não é aprovação, não cria operador e não substitui evidência verificável de conformidade.";

/// Required L1 artifacts (their absence/invalidity blocks readiness).
pub const REQUIRED_ARTIFACTS: &[&str] = &[
    "operator_manifest",
    "simb_pre_review",
    "conformance_l0",
    "key_manifest",
    "certificates",
    "brl",
];
/// Recommended L1 artifacts (absence → warning, not a blocker).
pub const RECOMMENDED_ARTIFACTS: &[&str] =
    &["conformance_evidence", "evidence_bundle", "well_known"];

/// The well-known / endpoint paths an operator candidate is expected to expose.
pub const WELL_KNOWN_PATHS: &[&str] = &[
    "/.well-known/banza/operator.json",
    "/.well-known/banza/key-manifest.json",
    "/certificates",
    "/federation/revocation-list.json",
    "/conformance/evidence",
];

fn str_at<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}
fn is_arr(v: Option<&Value>, k: &str) -> bool {
    v.and_then(|x| x.get(k))
        .map(|a| a.is_array())
        .unwrap_or(false)
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

/// Per-artifact verdict: "ok" | "invalid" | "missing".
#[derive(PartialEq)]
enum V {
    Ok,
    Invalid,
    Missing,
}

fn manifest_verdict(v: Option<&Value>) -> (V, bool) {
    // (verdict, production_claim)
    match v {
        None => (V::Missing, false),
        Some(r) => {
            let prod = r
                .get("errors")
                .and_then(|e| e.as_array())
                .map(|a| {
                    a.iter().any(|x| {
                        x.as_str()
                            .map(|s| s.contains("produção") || s.contains("certificação"))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            match str_at(r, "status") {
                Some("VALID") => (V::Ok, prod),
                Some(_) => (V::Invalid, prod),
                None => (V::Invalid, prod),
            }
        }
    }
}
fn report_pass_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(r) => {
            let s = str_at(r, "pre_review_status")
                .map(|p| p == "SIMB_PRE_REVIEW_PASS")
                .or_else(|| str_at(r, "status").map(|s| s == "PASS"))
                .unwrap_or(false);
            if s {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}
fn key_manifest_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        // form only (no signature check, no network): needs a `keys` array + a root public key.
        Some(d) => {
            if is_arr(Some(d), "keys")
                && (str_at(d, "root_public_key").is_some() || str_at(d, "root_key_id").is_some())
            {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}
fn brl_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(d) => {
            if is_arr(Some(d), "revoked") && str_at(d, "issuer").is_some() {
                V::Ok
            } else {
                V::Invalid
            }
        }
    }
}
/// Certificates doc: (verdict, production_claim). A demo/pre-production doc MUST have
/// production_certificates=false and no active production certificate.
fn certificates_verdict(v: Option<&Value>) -> (V, bool) {
    match v {
        None => (V::Missing, false),
        Some(d) => {
            let prod = d.get("production_certificates").and_then(|x| x.as_bool()) == Some(true)
                || d.get("operators")
                    .and_then(|o| o.as_array())
                    .map(|a| !a.is_empty())
                    .unwrap_or(false)
                || str_at(d, "status") == Some("active");
            if prod {
                (V::Invalid, true)
            } else {
                (V::Ok, false)
            }
        }
    }
}

/// Validate the L1 readiness surface. `input` may be the input object or `{ input: {...} }` / a fixture.
pub fn validate_l1(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do L1 readiness deve ser um objecto JSON");
    }
    // allow a fixture wrapper { input: {...} }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let manifest = present(src, "operator_manifest");
    let simb = present(src, "simb_pre_review").or_else(|| present(src, "simb"));
    let l0 = present(src, "conformance_l0").or_else(|| present(src, "l0"));
    let key_manifest = present(src, "key_manifest");
    let certificates = present(src, "certificates");
    let brl = present(src, "brl");
    let conformance_evidence = present(src, "conformance_evidence");
    let evidence_bundle = present(src, "evidence_bundle");
    let well_known = present(src, "well_known");

    let (man_v, man_prod) = manifest_verdict(manifest);
    let simb_v = report_pass_verdict(simb);
    let l0_v = report_pass_verdict(l0);
    let km_v = key_manifest_verdict(key_manifest);
    let (cert_v, cert_prod) = certificates_verdict(certificates);
    let brl_v = brl_verdict(brl);

    let mut invalid_artifacts: Vec<String> = Vec::new();
    let mut missing_artifacts: Vec<String> = Vec::new();
    let record = |name: &str, v: &V, invalid: &mut Vec<String>, missing: &mut Vec<String>| match v {
        V::Invalid => invalid.push(name.to_string()),
        V::Missing => missing.push(name.to_string()),
        V::Ok => {}
    };
    record(
        "operator_manifest",
        &man_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );
    record(
        "simb_pre_review",
        &simb_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );
    record(
        "conformance_l0",
        &l0_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );
    record(
        "key_manifest",
        &km_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );
    record(
        "certificates",
        &cert_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );
    record(
        "brl",
        &brl_v,
        &mut invalid_artifacts,
        &mut missing_artifacts,
    );

    let production_claim = man_prod || cert_prod;

    // ── status precedence (computed in Rust) ──
    let status = if production_claim {
        "L1_INVALID"
    } else if man_v == V::Invalid {
        "L1_BLOCKED_BY_MANIFEST"
    } else if simb_v == V::Invalid {
        "L1_BLOCKED_BY_SIMB"
    } else if l0_v == V::Invalid {
        "L1_BLOCKED_BY_L0"
    } else if km_v != V::Ok || brl_v != V::Ok {
        // key manifest or BRL missing/invalid → the trust surface is not structured
        "L1_BLOCKED_BY_TRUST"
    } else if !missing_artifacts.is_empty() {
        "L1_INCOMPLETE"
    } else {
        "L1_READY_FOR_TECHNICAL_REVIEW"
    };
    let readiness = if status == "L1_READY_FOR_TECHNICAL_REVIEW" {
        "READY"
    } else {
        "NOT_READY"
    };

    // ── recommended → warnings ──
    let mut warnings: Vec<String> = Vec::new();
    match conformance_evidence {
        None => warnings.push(
            "recomendado em falta: conformance_evidence (deve referenciar SimB/L0/evidence bundle)"
                .into(),
        ),
        Some(ce) => {
            let refs = ["simb", "l0", "references", "evidence_bundle"]
                .iter()
                .any(|k| ce.get(*k).is_some());
            if !refs {
                warnings.push("conformance_evidence não referencia SimB/L0/evidence bundle".into());
            }
        }
    }
    if evidence_bundle.is_none() {
        warnings.push("recomendado em falta: evidence_bundle".into());
    }

    // ── endpoint paths (no network) ──
    let declared: Vec<&str> = well_known
        .and_then(|m| m.get("paths").and_then(|p| p.as_array()))
        .map(|a| a.iter().filter_map(|x| x.as_str()).collect())
        .unwrap_or_default();
    let endpoint_paths: Vec<Value> = WELL_KNOWN_PATHS
        .iter()
        .map(|p| {
            let listed = declared.contains(p);
            if well_known.is_some() && !listed {
                warnings.push(format!("well-known: path esperado ausente do mapa: {p}"));
            }
            json!({
                "path": p,
                "declared": if well_known.is_some() { Value::Bool(listed) } else { Value::Null },
                "note": "Validação por URL desactivada nesta fase (sem rede)."
            })
        })
        .collect();
    if well_known.is_none() {
        warnings.push("recomendado em falta: well_known (mapa de paths)".into());
    }

    let trust_summary = json!({
        "key_manifest": verdict_str(&km_v),
        "brl": verdict_str(&brl_v),
        "note": "Verificação de forma; sem rede; sem chave de produção."
    });
    let conformance_summary = json!({
        "simb": simb.and_then(|r| str_at(r, "pre_review_status").or_else(|| str_at(r, "status"))).unwrap_or("missing"),
        "l0": l0.and_then(|r| str_at(r, "status")).unwrap_or("missing"),
        "evidence_bundle": evidence_bundle.and_then(|r| str_at(r, "readiness")).unwrap_or("—"),
    });

    let next_steps: Vec<String> = match status {
        "L1_READY_FOR_TECHNICAL_REVIEW" => vec!["Artefactos L1 estruturados (preparação técnica). A conformidade demonstra-se por evidência verificável; não há aprovação humana central.".into()],
        "L1_INVALID" => vec!["Remova a declaração de produção/certificado activo — em pré-produção production_certificates deve ser false.".into()],
        "L1_BLOCKED_BY_MANIFEST" => vec!["Corrija o Operator Manifest (deve ser VALID) e revalide.".into()],
        "L1_BLOCKED_BY_SIMB" => vec!["Obtenha um SimB PASS antes de preparar L1.".into()],
        "L1_BLOCKED_BY_L0" => vec!["Obtenha uma Conformidade L0 PASS antes de preparar L1.".into()],
        "L1_BLOCKED_BY_TRUST" => vec!["Forneça um key manifest e uma BRL bem formados (superfície de confiança).".into()],
        _ => vec!["Adicione os artefactos em falta e revalide.".into()],
    };

    // report body (without report_id/hash), then stamp them
    let mut report = json!({
        "status": status,
        "readiness": readiness,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "missing_artifacts": missing_artifacts,
        "invalid_artifacts": invalid_artifacts,
        "endpoint_paths": endpoint_paths,
        "well_known_paths": WELL_KNOWN_PATHS,
        "trust_summary": trust_summary,
        "conformance_summary": conformance_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": BOUNDARY,
        "operator_url_validation": "disabled",
        "operator_url_note": "Validação por URL será uma fase futura e exigirá confirmação explícita.",
        "tool": "banza-l1-readiness",
        "tool_version": TOOL_VERSION,
        "not_a_certificate": true,
        "not_an_approval": true,
        "does_not_create_operator": true,
        "requires_conformance_evidence_review": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("l1-{}", &sha256_hex(&canon(src))[..12]));
    report["l1_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn verdict_str(v: &V) -> &'static str {
    match v {
        V::Ok => "ok",
        V::Invalid => "invalid",
        V::Missing => "missing",
    }
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "L1_INVALID", "readiness": "NOT_READY",
        "required_artifacts": REQUIRED_ARTIFACTS, "missing_artifacts": REQUIRED_ARTIFACTS,
        "invalid_artifacts": [], "endpoint_paths": [], "well_known_paths": WELL_KNOWN_PATHS,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": BOUNDARY, "operator_url_validation": "disabled",
        "tool": "banza-l1-readiness", "tool_version": TOOL_VERSION,
        "not_a_certificate": true, "not_an_approval": true, "does_not_create_operator": true,
        "requires_conformance_evidence_review": true, "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures ──────────────────────────────────────────────────────────────────

fn valid_input() -> Value {
    json!({
        "operator_manifest": { "status": "VALID", "operator_id": "operator-zero", "tool_version": "0.1.0" },
        "simb_pre_review": { "status": "PASS", "pre_review_status": "SIMB_PRE_REVIEW_PASS", "tool_version": "0.1.0" },
        "conformance_l0": { "status": "PASS", "level": "L0", "tool_version": "0.1.0" },
        "key_manifest": { "schema_version": "1", "root_key_id": "test-banza-root", "root_public_key": "TEST_ONLY_pk", "keys": [{ "key_id": "test-cert-key", "public_key": "TEST_ONLY_pk", "domain": "cert" }] },
        "certificates": { "production_certificates": false, "operators": [], "note": "TEST ONLY — NOT PRODUCTION" },
        "brl": { "schema_version": "1", "issuer": "BANZA-TEST", "revoked": [] },
        "conformance_evidence": { "references": ["simb", "l0"], "evidence_bundle": true, "note": "TEST ONLY — NOT PRODUCTION" },
        "evidence_bundle": { "readiness": "READY_FOR_TECHNICAL_REVIEW", "tool_version": "0.1.0" },
        "well_known": { "paths": WELL_KNOWN_PATHS }
    })
}

/// TEST-ONLY demo fixtures for the L1 readiness validator.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();
    let mut missing_km = valid.clone();
    missing_km.as_object_mut().unwrap().remove("key_manifest");
    let mut simb_fail = valid.clone();
    simb_fail["simb_pre_review"] =
        json!({ "status": "FAIL", "pre_review_status": "SIMB_PRE_REVIEW_FAIL" });
    let mut l0_fail = valid.clone();
    l0_fail["conformance_l0"] = json!({ "status": "FAIL", "level": "L0" });
    let mut prod = valid.clone();
    prod["certificates"] =
        json!({ "production_certificates": true, "operators": ["operator-X"], "status": "active" });

    json!({
        "note": "TEST ONLY — NOT PRODUCTION",
        "fixtures": [
            { "key": "l1_ready_candidate", "label": "Candidato L1 pronto", "expected": "L1_READY_FOR_TECHNICAL_REVIEW", "input": valid },
            { "key": "missing_key_manifest", "label": "Sem key manifest", "expected": "L1_BLOCKED_BY_TRUST", "input": missing_km },
            { "key": "simb_fail", "label": "SimB FAIL", "expected": "L1_BLOCKED_BY_SIMB", "input": simb_fail },
            { "key": "l0_fail", "label": "L0 FAIL", "expected": "L1_BLOCKED_BY_L0", "input": l0_fail },
            { "key": "production_claim", "label": "Declara produção/certificado activo", "expected": "L1_INVALID", "input": prod },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-l1-readiness", "tool_version": TOOL_VERSION,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "well_known_paths": WELL_KNOWN_PATHS,
        "status_values": [
            "L1_READY_FOR_TECHNICAL_REVIEW", "L1_BLOCKED_BY_MANIFEST", "L1_BLOCKED_BY_SIMB",
            "L1_BLOCKED_BY_L0", "L1_BLOCKED_BY_TRUST", "L1_INCOMPLETE", "L1_INVALID"
        ],
        "network": "local por defeito — sem fetch; validação por URL desactivada nesta fase.",
        "boundary": BOUNDARY,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-l1-readiness", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
