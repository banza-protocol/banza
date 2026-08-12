//! banza-l3-readiness (BX1.9) — L3 federation technical-preparation readiness.
//!
//! It aggregates the upstream readiness reports (Operator Manifest, SimB pre-review, Conformidade L0, L1
//! and L2 readiness) AND validates, locally, the minimum BANZA federation artifacts between two SIMULATED
//! operators a candidate must have structured before a later technical review: a federation pair, a
//! federation intent (ADR-040/routing), a cross-operator trace linkage (INV-TRACE / INV-RECON), trust &
//! BRL material (ADR-040/INV-FEDEVAL-002 — the BRL is fail-closed: a revoked operator blocks) and a federation
//! settlement obligation (ADR-040 federation-obligation). The **L3 status/readiness is computed IN RUST**
//! (never in TypeScript), together with SHA-256 hashes. Validation is **local — no network**: operator
//! federation endpoints/URLs are never contacted.
//!
//! **Central rule:** L3 Readiness is technical preparation of federation — it is NOT active federation,
//! NOT production, NOT certification, NOT approval; it does NOT create an operator and does NOT move
//! funds. Every report carries the boundary flags, `llm_calls = 0` and `external_model_called = false`.
//! All amounts are integer minor units (never float).

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "L3 Readiness é preparação técnica de federação. Não é federação activa, não é produção, não é certificação, não é aprovação, não cria operador e não move fundos.";

/// Required L3 artifacts — the absence/invalidity of any of these blocks readiness.
pub const REQUIRED_ARTIFACTS: &[&str] = &[
    "operator_manifest",
    "simb_pre_review",
    "conformance_l0",
    "l1_readiness",
    "l2_readiness",
    "federation_pair",
    "federation_intent",
    "cross_operator_trace",
    "trust",
    "brl",
    "settlement",
    "evidence",
];
/// Recommended (absence → warning, not a blocker).
pub const RECOMMENDED_ARTIFACTS: &[&str] = &["failure_handling"];

/// Boolean flag keys that, if truthy on any federation artifact, mean the fixture is trying to declare an
/// active/real/production federation or fund movement → L3_INVALID. String notes are NOT used here on
/// purpose: the test-only fixtures carry "NOT PRODUCTION", so we key on explicit boolean intent.
const PRODUCTION_FLAGS: &[&str] = &[
    "production",
    "federation_active",
    "active_federation",
    "real_federation",
    "real_operator",
    "moves_real_funds",
    "live_federation",
    "live",
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
fn claims_production(v: &Value) -> bool {
    PRODUCTION_FLAGS
        .iter()
        .any(|f| v.get(*f).and_then(|x| x.as_bool()) == Some(true))
}
/// Integer minor amount from `amount.minor`, `amount_minor` or a named `*_minor` key. None if absent or
/// non-integer (float money is never accepted).
fn minor_of(v: &Value, keys: &[&str]) -> Option<Option<i128>> {
    if let Some(a) = v.get("amount").and_then(|a| a.get("minor")) {
        return Some(match a {
            Value::Number(n) if n.is_i64() || n.is_u64() => Some(n.as_i64().unwrap_or(0) as i128),
            _ => None,
        });
    }
    for k in keys {
        if let Some(x) = v.get(*k) {
            return Some(match x {
                Value::Number(n) if n.is_i64() || n.is_u64() => {
                    Some(n.as_i64().unwrap_or(0) as i128)
                }
                _ => None,
            });
        }
    }
    None
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

// ── federation verdicts (validated here, in Rust) ────────────────────────────────

/// The set of operator ids referenced by the federation (pair + intent). Used by the BRL fail-closed
/// check.
fn federation_operators(pair: Option<&Value>, intent: Option<&Value>) -> BTreeSet<String> {
    let mut ids = BTreeSet::new();
    if let Some(p) = pair {
        for k in ["operator_a", "operator_b"] {
            if let Some(s) = str_at(p, k) {
                ids.insert(s.to_string());
            }
        }
    }
    if let Some(i) = intent {
        for k in [
            "source_operator",
            "target_operator",
            "from_operator_id",
            "to_operator_id",
        ] {
            if let Some(s) = str_at(i, k) {
                ids.insert(s.to_string());
            }
        }
    }
    ids
}

/// Federation pair: two distinct simulated operators, a demo/pre-production environment, production false.
fn pair_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(p) => {
            let a = str_at(p, "operator_a");
            let b = str_at(p, "operator_b");
            if a.is_none() || b.is_none() {
                errs.push("federation_pair sem operator_a/operator_b".into());
            }
            if a.is_some() && a == b {
                errs.push("federation_pair: operator_a e operator_b devem ser distintos".into());
            }
            match str_at(p, "environment") {
                Some(e) if e == "demo" || e == "pre-production" => {}
                _ => errs.push("federation_pair.environment deve ser demo/pre-production".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Federation intent (ADR-040 routing): id, source/target operator (distinct), integer amount, currency,
/// trace_id, idempotency_key, status.
fn intent_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(i) => {
            if str_at(i, "id").is_none() && str_at(i, "federation_id").is_none() {
                errs.push("federation_intent sem id".into());
            }
            let src = str_at(i, "source_operator").or_else(|| str_at(i, "from_operator_id"));
            let tgt = str_at(i, "target_operator").or_else(|| str_at(i, "to_operator_id"));
            if src.is_none() || tgt.is_none() {
                errs.push("federation_intent sem source/target operator".into());
            }
            if src.is_some() && src == tgt {
                errs.push("federation_intent: source e target devem ser distintos".into());
            }
            if str_at(i, "currency").is_none() {
                errs.push("federation_intent sem currency".into());
            }
            match minor_of(i, &["amount_minor"]) {
                Some(Some(_)) => {}
                Some(None) => {
                    errs.push("federation_intent com amount não inteiro (minor units)".into())
                }
                None => errs.push("federation_intent sem amount (minor units)".into()),
            }
            if str_at(i, "trace_id").is_none() {
                errs.push("federation_intent sem trace_id".into());
            }
            if str_at(i, "idempotency_key").is_none() {
                errs.push("federation_intent sem idempotency_key".into());
            }
            if str_at(i, "status").is_none() {
                errs.push("federation_intent sem status".into());
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Cross-operator trace: a trace on each side (A and B) tied by a shared correlation, with minimum
/// events (INV-TRACE / INV-RECON).
fn cross_trace_verdict(v: Option<&Value>) -> (V, Vec<String>, Option<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs, None),
        Some(d) => {
            let a = str_at(d, "trace_a");
            let b = str_at(d, "trace_b");
            if a.is_none() || b.is_none() {
                errs.push("cross_operator_trace sem trace_a/trace_b".into());
            }
            let corr = str_at(d, "correlation_id")
                .or_else(|| str_at(d, "linkage"))
                .map(|s| s.to_string());
            if corr.as_deref().unwrap_or("").is_empty() {
                errs.push("cross_operator_trace sem linkage (correlation_id) entre A e B".into());
            }
            match d.get("events").and_then(|e| e.as_array()) {
                Some(e) if e.len() >= 2 => {}
                _ => errs.push("cross_operator_trace sem eventos mínimos".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs, corr)
        }
    }
}

/// Federation settlement obligation (ADR-040): gross/net/fee coherent (net = gross − fee, all ≥ 0),
/// linked to both operators and to the trace/correlation.
fn settlement_verdict(v: Option<&Value>, corr: Option<&str>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(d) => {
            if str_at(d, "settlement_id").is_none() && str_at(d, "obligation_id").is_none() {
                errs.push("federation_settlement sem id".into());
            }
            let from = str_at(d, "from_operator_id").or_else(|| str_at(d, "operator_a"));
            let to = str_at(d, "to_operator_id").or_else(|| str_at(d, "operator_b"));
            if from.is_none() || to.is_none() {
                errs.push("federation_settlement sem from/to operator".into());
            }
            if corr.is_some()
                && str_at(d, "correlation_id") != corr
                && str_at(d, "trace_id").is_none()
            {
                errs.push("federation_settlement sem ligação de trace/correlation".into());
            }
            let gross = minor_of(d, &["gross_minor", "amount_minor"]).and_then(|x| x);
            let net = match d.get("net_minor") {
                Some(Value::Number(n)) if n.is_i64() || n.is_u64() => {
                    Some(n.as_i64().unwrap_or(0) as i128)
                }
                _ => None,
            };
            let fee = match d.get("fee_minor") {
                None => Some(0),
                Some(Value::Number(n)) if n.is_i64() || n.is_u64() => {
                    Some(n.as_i64().unwrap_or(0) as i128)
                }
                _ => None,
            };
            match (gross, fee, net) {
                (Some(g), Some(f), Some(n)) => {
                    if g < 0 || f < 0 || n < 0 {
                        errs.push("federation_settlement com valor negativo".into());
                    }
                    if f > g {
                        errs.push("federation_settlement fee > gross".into());
                    }
                    if n != g - f {
                        errs.push(format!(
                            "federation_settlement incoerente: net {n} != gross {g} - fee {f}"
                        ));
                    }
                }
                _ => errs
                    .push("federation_settlement sem gross/net/fee coerentes (minor units)".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// Trust: key manifest form (keys array + a root key) and, if present, certificate form. No signature
/// check, no network.
fn trust_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(tb) => {
            let km = tb.get("key_manifest");
            match km {
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
                    errs.push(
                        "trust: certificate mal formado (operator_id/issuer/signature)".into(),
                    );
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}

/// BRL — fail-closed: the list must be well-formed (issuer "BANZA" + revoked array), and NO federation
/// operator may appear on it. A revoked operator blocks (INV-FEDEVAL-002).
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
            match b.get("revoked").and_then(|r| r.as_array()) {
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
                    "operador da federação revogado na BRL: {} (routing bloqueado, INV-FEDEVAL-002)",
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

/// Validate the L3 federation readiness surface. `input` may be the object or a `{ input: {...} }` fixture
/// wrapper.
pub fn validate_l3(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do L3 readiness deve ser um objecto JSON");
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
    let pair = present(src, "federation_pair");
    let intent = present(src, "federation_intent");
    let xtrace = present(src, "cross_operator_trace");
    let settlement = present(src, "federation_settlement").or_else(|| present(src, "settlement"));
    let trust_brl = present(src, "trust_and_brl").or_else(|| present(src, "trust"));
    let evidence = present(src, "federation_evidence").or_else(|| present(src, "evidence_bundle"));

    let production_claim = [pair, intent, settlement]
        .into_iter()
        .flatten()
        .any(claims_production);

    let man_v = manifest_verdict(manifest);
    let simb_v = pass_verdict(simb);
    let l0_v = pass_verdict(l0);
    let l1_v = status_eq_verdict(l1, "L1_READY_FOR_TECHNICAL_REVIEW");
    let l2_v = status_eq_verdict(l2, "L2_READY_FOR_TECHNICAL_REVIEW");
    let (pair_v, pair_errs) = pair_verdict(pair);
    let (intent_v, intent_errs) = intent_verdict(intent);
    let (xtrace_v, xtrace_errs, corr) = cross_trace_verdict(xtrace);
    let (stl_v, stl_errs) = settlement_verdict(settlement, corr.as_deref());
    let (trust_v, trust_errs) = trust_verdict(trust_brl);
    let operators = federation_operators(pair, intent);
    let (brl_v, brl_errs, revoked_hits) = brl_verdict(trust_brl, &operators);
    let ev_v = evidence_verdict(evidence);

    // combined federation-flow verdict (pair + intent)
    let fed_flow_invalid = pair_v == V::Invalid || intent_v == V::Invalid;

    // artifact accounting
    let pairs: [(&str, V); 12] = [
        ("operator_manifest", man_v),
        ("simb_pre_review", simb_v),
        ("conformance_l0", l0_v),
        ("l1_readiness", l1_v),
        ("l2_readiness", l2_v),
        ("federation_pair", pair_v),
        ("federation_intent", intent_v),
        ("cross_operator_trace", xtrace_v),
        ("trust", trust_v),
        ("brl", brl_v),
        ("settlement", stl_v),
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
        "L3_INVALID"
    } else if man_v == V::Invalid {
        "L3_BLOCKED_BY_MANIFEST"
    } else if simb_v == V::Invalid {
        "L3_BLOCKED_BY_SIMB"
    } else if l0_v == V::Invalid {
        "L3_BLOCKED_BY_L0"
    } else if l1_v == V::Invalid {
        "L3_BLOCKED_BY_L1"
    } else if l2_v == V::Invalid {
        "L3_BLOCKED_BY_L2"
    } else if trust_v == V::Invalid {
        "L3_BLOCKED_BY_TRUST"
    } else if brl_v == V::Invalid {
        "L3_BLOCKED_BY_BRL"
    } else if fed_flow_invalid {
        "L3_BLOCKED_BY_FEDERATION_FLOW"
    } else if xtrace_v == V::Invalid {
        "L3_BLOCKED_BY_TRACE"
    } else if stl_v == V::Invalid {
        "L3_BLOCKED_BY_SETTLEMENT"
    } else if !missing_artifacts.is_empty() {
        "L3_INCOMPLETE"
    } else {
        "L3_READY_FOR_TECHNICAL_REVIEW"
    };
    let readiness = if status == "L3_READY_FOR_TECHNICAL_REVIEW" {
        "READY"
    } else {
        "NOT_READY"
    };

    // ── summaries ──
    let fed_errors: Vec<String> = pair_errs.into_iter().chain(intent_errs).collect();
    let fed_operators: Vec<String> = operators.iter().cloned().collect();
    let federation_summary = json!({
        "pair": verdict_str(&pair_v),
        "intent": verdict_str(&intent_v),
        "operators": fed_operators,
        "federation_id": intent.and_then(|i| str_at(i, "id").or_else(|| str_at(i, "federation_id"))),
        "errors": fed_errors,
        "note": "Federação test-only entre operadores simulados; sem rede; sem federação activa; sem fundos."
    });
    let cross_operator_trace_summary = json!({
        "trace": verdict_str(&xtrace_v),
        "correlation_id": corr,
        "errors": xtrace_errs,
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
        "note": "BRL fail-closed: um operador revogado bloqueia o routing (INV-FEDEVAL-002)."
    });
    let settlement_summary = json!({
        "settlement": verdict_str(&stl_v),
        "gross_minor": settlement.and_then(|d| minor_of(d, &["gross_minor", "amount_minor"]).and_then(|x| x)).map(|x| x as i64),
        "net_minor": settlement.and_then(|d| d.get("net_minor")).and_then(|n| n.as_i64()),
        "fee_minor": settlement.and_then(|d| d.get("fee_minor")).and_then(|n| n.as_i64()),
        "errors": stl_errs,
    });
    let evidence_summary = json!({
        "evidence": verdict_str(&ev_v),
        "bundle_hash": evidence.and_then(|d| str_at(d, "bundle_hash").or_else(|| str_at(d, "hash"))),
        "bundle_id": evidence.and_then(|d| str_at(d, "bundle_id").or_else(|| str_at(d, "id"))),
        "disclaimer": "Evidência técnica — não é certificação nem federação activa.",
    });

    // ── warnings ──
    let mut warnings: Vec<String> = Vec::new();
    if present(src, "failure_handling").is_none() {
        warnings.push(
            "recomendado em falta: failure_handling (como a federação trata falhas/revogação)"
                .into(),
        );
    }
    if ev_v == V::Invalid {
        warnings.push(
            "federation_evidence sem hash/id técnico — adicione uma referência ao bundle".into(),
        );
    }

    let next_steps: Vec<String> = match status {
        "L3_READY_FOR_TECHNICAL_REVIEW" => vec!["Fluxo de federação L3 estruturado (preparação técnica, test-only). A federação de produção depende do marco M3 e de evidência verificável de conformidade. Não houve federação activa nem movimentação de fundos.".into()],
        "L3_INVALID" => vec!["Remova a declaração de federação activa/produção/movimentação de fundos — L3 é preparação técnica test-only.".into()],
        "L3_BLOCKED_BY_MANIFEST" => vec!["Corrija o Operator Manifest (deve ser VALID) e revalide.".into()],
        "L3_BLOCKED_BY_SIMB" => vec!["Obtenha um SimB PASS antes de preparar L3.".into()],
        "L3_BLOCKED_BY_L0" => vec!["Obtenha uma Conformidade L0 PASS antes de preparar L3.".into()],
        "L3_BLOCKED_BY_L1" => vec!["Obtenha uma L1 Readiness pronta antes de preparar L3.".into()],
        "L3_BLOCKED_BY_L2" => vec!["Obtenha uma L2 Readiness pronta antes de preparar L3.".into()],
        "L3_BLOCKED_BY_TRUST" => vec!["Forneça key manifest (e certificate, se aplicável) bem formados.".into()],
        "L3_BLOCKED_BY_BRL" => vec!["A BRL deve ser bem formada e nenhum operador da federação pode estar revogado (fail-closed).".into()],
        "L3_BLOCKED_BY_FEDERATION_FLOW" => vec!["Corrija o federation pair e o federation intent (dois operadores distintos, amount inteiro, trace, idempotency).".into()],
        "L3_BLOCKED_BY_TRACE" => vec!["Ligue as traces A e B por um correlation_id partilhado com os eventos mínimos.".into()],
        "L3_BLOCKED_BY_SETTLEMENT" => vec!["A settlement de federação deve ter net = gross - fee (todos ≥ 0) e ligar aos dois operadores e ao trace.".into()],
        _ => vec!["Adicione os artefactos em falta e revalide.".into()],
    };

    let mut report = json!({
        "status": status,
        "readiness": readiness,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "missing_artifacts": missing_artifacts,
        "invalid_artifacts": invalid_artifacts,
        "federation_summary": federation_summary,
        "cross_operator_trace_summary": cross_operator_trace_summary,
        "trust_summary": trust_summary,
        "brl_summary": brl_summary,
        "settlement_summary": settlement_summary,
        "evidence_summary": evidence_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": BOUNDARY,
        "operator_url_validation": "disabled",
        "operator_url_note": "Validação por URL/endpoint de federação do operador desactivada nesta fase; exigirá confirmação explícita.",
        "tool": "banza-l3-readiness",
        "tool_version": TOOL_VERSION,
        "not_active_federation": true,
        "not_a_payment": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "does_not_move_funds": true,
        "does_not_create_operator": true,
        "requires_conformance_evidence_review": true,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("l3-{}", &sha256_hex(&canon(src))[..12]));
    report["l3_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "L3_INVALID", "readiness": "NOT_READY",
        "required_artifacts": REQUIRED_ARTIFACTS, "missing_artifacts": REQUIRED_ARTIFACTS,
        "invalid_artifacts": [],
        "federation_summary": Value::Null, "cross_operator_trace_summary": Value::Null,
        "trust_summary": Value::Null, "brl_summary": Value::Null,
        "settlement_summary": Value::Null, "evidence_summary": Value::Null,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": BOUNDARY, "operator_url_validation": "disabled",
        "tool": "banza-l3-readiness", "tool_version": TOOL_VERSION,
        "not_active_federation": true, "not_a_payment": true, "not_a_certificate": true,
        "not_an_approval": true, "does_not_move_funds": true, "does_not_create_operator": true,
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
        "federation_pair": {
            "operator_a": "operator-A-test", "operator_b": "operator-B-test",
            "environment": "pre-production", "production": false, "note": NOTE
        },
        "federation_intent": {
            "id": "fed_test_0001", "source_operator": "operator-A-test", "target_operator": "operator-B-test",
            "amount": { "minor": 12345 }, "currency": "AOA", "trace_id": "ftrace_0001",
            "idempotency_key": "fidem_0001", "status": "REQUESTED", "created_at": "2026-07-16T00:00:00Z", "note": NOTE
        },
        "cross_operator_trace": {
            "trace_a": "trace_A_0001", "trace_b": "trace_B_0001", "correlation_id": "corr_0001",
            "causation_id": "fed_test_0001",
            "events": ["federation.routing.requested", "federation.obligation.created", "federation.settlement.created"], "note": NOTE
        },
        "federation_settlement": {
            "settlement_id": "fstl_0001", "from_operator_id": "operator-A-test", "to_operator_id": "operator-B-test",
            "gross_minor": 12345, "fee_minor": 345, "net_minor": 12000, "currency": "AOA",
            "correlation_id": "corr_0001", "trace_id": "ftrace_0001", "status": "CREATED", "note": NOTE
        },
        "trust_and_brl": {
            "key_manifest": { "schema_version": "1", "root_key_id": "test-banza-root", "root_public_key": "TEST_ONLY_pk", "keys": [{ "key_id": "test-cert-key", "public_key": "TEST_ONLY_pk", "domain": "certification" }] },
            "certificate": { "schema_version": "1", "operator_id": "operator-A-test", "certification_level": 0, "issuer": "BANZA", "issuer_key_id": "test-banza-cert-202607", "signature": "TEST_ONLY_sig" },
            "brl": { "schema_version": "1", "issuer": "BANZA", "issuer_key_id": "test-banza-brl-202607", "issued_at": "2026-07-16T00:00:00Z", "expires_at": "2026-07-16T06:00:00Z", "revoked": [], "signature": "TEST_ONLY_sig" }
        },
        "federation_evidence": {
            "bundle_id": "eb_test_0001", "bundle_hash": "TEST_ONLY_hash_deadbeefcafe",
            "readiness": "READY_FOR_TECHNICAL_REVIEW",
            "disclaimer": "Evidência técnica — não é certificação nem federação activa.", "note": NOTE
        }
    })
}

/// TEST-ONLY demo fixtures for the L3 federation readiness validator. No fixture represents a real
/// federation or a real operator.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut missing_l2 = valid.clone();
    missing_l2.as_object_mut().unwrap().remove("l2_readiness");

    let mut trace_fail = valid.clone();
    trace_fail["cross_operator_trace"]
        .as_object_mut()
        .unwrap()
        .remove("correlation_id"); // no linkage between A and B

    let mut settlement_fail = valid.clone();
    settlement_fail["federation_settlement"]["net_minor"] = json!(999); // net != gross - fee

    let mut brl_revoked = valid.clone();
    brl_revoked["trust_and_brl"]["brl"]["revoked"] = json!([
        { "operator_id": "operator-B-test", "reason": "test-only", "permanent": false, "since": "2026-07-16T00:00:00Z" }
    ]);

    let mut trust_fail = valid.clone();
    trust_fail["trust_and_brl"]["key_manifest"] = json!({ "schema_version": "1" }); // no keys[]/root

    let mut production = valid.clone();
    production["federation_pair"]["production"] = json!(true);
    production["federation_pair"]["federation_active"] = json!(true);

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "l3_ready_federation_flow", "label": "Federação L3 pronta", "expected": "L3_READY_FOR_TECHNICAL_REVIEW", "input": valid },
            { "key": "missing_l2", "label": "L2 Readiness ausente", "expected": "L3_INCOMPLETE", "input": missing_l2 },
            { "key": "federation_trace_fail", "label": "Trace A/B sem linkage", "expected": "L3_BLOCKED_BY_TRACE", "input": trace_fail },
            { "key": "federation_settlement_fail", "label": "Settlement incoerente", "expected": "L3_BLOCKED_BY_SETTLEMENT", "input": settlement_fail },
            { "key": "brl_revoked_operator", "label": "Operador revogado na BRL", "expected": "L3_BLOCKED_BY_BRL", "input": brl_revoked },
            { "key": "trust_fail", "label": "Trust inválido", "expected": "L3_BLOCKED_BY_TRUST", "input": trust_fail },
            { "key": "production_claim", "label": "Declara federação activa/produção", "expected": "L3_INVALID", "input": production },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-l3-readiness", "tool_version": TOOL_VERSION,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "federation_intent_fields": ["id", "source_operator", "target_operator", "amount.minor", "currency", "trace_id", "idempotency_key", "status", "created_at"],
        "status_values": [
            "L3_READY_FOR_TECHNICAL_REVIEW", "L3_BLOCKED_BY_MANIFEST", "L3_BLOCKED_BY_SIMB",
            "L3_BLOCKED_BY_L0", "L3_BLOCKED_BY_L1", "L3_BLOCKED_BY_L2", "L3_BLOCKED_BY_TRUST",
            "L3_BLOCKED_BY_BRL", "L3_BLOCKED_BY_FEDERATION_FLOW", "L3_BLOCKED_BY_TRACE",
            "L3_BLOCKED_BY_SETTLEMENT", "L3_INCOMPLETE", "L3_INVALID"
        ],
        "money": "inteiro em minor units, nunca float",
        "brl": "fail-closed: um operador revogado bloqueia o routing (INV-FEDEVAL-002)",
        "network": "local por defeito — sem fetch; validação por URL/endpoint de federação desactivada nesta fase.",
        "boundary": BOUNDARY,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-l3-readiness", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
