//! banza-l2-readiness (BX1.8) — L2 payment-flow technical-preparation readiness.
//!
//! It aggregates the upstream readiness reports (Operator Manifest, SimB pre-review, Conformidade L0 and
//! L1 readiness) AND validates, locally, the minimum BANZA payment-flow artifacts a candidate operator
//! must have structured before a later technical review: a payment intent (ADR-015), idempotency handling
//! (INV-IDEM), double-entry ledger postings (ADR-012 / INV-LEDGER), trace linkage (INV-TRACE), a
//! settlement obligation (ADR-019) and an evidence reference. The **L2 status/readiness is computed IN
//! RUST** (never in TypeScript), together with SHA-256 hashes. Validation is **local — no network**:
//! payment endpoints/operator URLs are never contacted.
//!
//! **Central rule:** L2 Readiness is technical preparation of a payment flow — it is NOT a real payment,
//! NOT certification, NOT approval; it does NOT create an operator and does NOT move funds. Every report
//! carries the boundary flags, `llm_calls = 0` and `external_model_called = false`. All amounts are
//! integer minor units (never float).

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";
pub const BOUNDARY: &str =
    "L2 Readiness é preparação técnica de fluxo de pagamento. Não é pagamento real, não é certificação, não é aprovação, não cria operador e não move fundos.";

/// Required L2 artifacts — the absence/invalidity of any of these blocks readiness.
pub const REQUIRED_ARTIFACTS: &[&str] = &[
    "operator_manifest",
    "simb_pre_review",
    "conformance_l0",
    "l1_readiness",
    "payment_intent",
    "idempotency",
    "ledger",
    "trace",
    "settlement",
    "evidence",
];
/// Recommended (absence → warning, not a blocker).
pub const RECOMMENDED_ARTIFACTS: &[&str] = &["failure_handling"];

/// Boolean flag keys that, if truthy on any payment artifact, mean the fixture is trying to declare a
/// real/production payment or fund movement → L2_INVALID. String notes are NOT used here on purpose: the
/// test-only fixtures carry "NOT PRODUCTION", so we key on explicit boolean intent, never substrings.
const PRODUCTION_FLAGS: &[&str] = &[
    "real_payment",
    "real_funds",
    "moves_funds",
    "moves_real_funds",
    "production",
    "production_payment",
    "live_payment",
    "settles_real_money",
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
/// A JSON number that is a valid integer minor-unit amount (or null / absent). Floats are rejected —
/// money must never be a float.
fn amount_ok(v: &Value, k: &str) -> bool {
    match v.get(k) {
        None | Some(Value::Null) => true,
        Some(Value::Number(n)) => n.is_i64() || n.is_u64(),
        _ => false,
    }
}
fn claims_production(v: &Value) -> bool {
    PRODUCTION_FLAGS
        .iter()
        .any(|f| v.get(*f).and_then(|x| x.as_bool()) == Some(true))
}

/// Per-artifact verdict: "ok" | "invalid" | "missing".
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

// ── upstream report verdicts (read status only — the upstream engines already decided) ────────────

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
fn l1_verdict(v: Option<&Value>) -> V {
    match v {
        None => V::Missing,
        Some(r) => match str_at(r, "status") {
            Some("L1_READY_FOR_TECHNICAL_REVIEW") => V::Ok,
            _ => V::Invalid,
        },
    }
}

// ── payment-flow verdicts (validated here, in Rust) ───────────────────────────────────────────────

/// Payment intent: canonical PaymentIntent shape (ADR-015). Needs id + currency + status, an integer
/// (or null) `amount_minor`, an `idempotency_key`, and a trace handle (`trace_id` or `transfer_id`).
fn payment_intent_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(p) => {
            if str_at(p, "id").is_none() {
                errs.push("payment_intent sem id".into());
            }
            if str_at(p, "currency").is_none() {
                errs.push("payment_intent sem currency".into());
            }
            if str_at(p, "status").is_none() {
                errs.push("payment_intent sem status".into());
            }
            if !amount_ok(p, "amount_minor") {
                errs.push(
                    "payment_intent.amount_minor deve ser inteiro (minor units), nunca float"
                        .into(),
                );
            }
            if str_at(p, "idempotency_key").is_none() {
                errs.push("payment_intent sem idempotency_key".into());
            }
            if str_at(p, "trace_id").is_none() && str_at(p, "transfer_id").is_none() {
                errs.push("payment_intent sem ligação de trace (trace_id/transfer_id)".into());
            }
            if errs.is_empty() {
                (V::Ok, errs)
            } else {
                (V::Invalid, errs)
            }
        }
    }
}

/// Idempotency: the same key must map to consistent responses; a replay must be flagged. Divergent
/// responses for one key → invalid (INV-IDEM).
fn idempotency_verdict(v: Option<&Value>) -> (V, Vec<String>, bool) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs, false),
        Some(d) => {
            if str_at(d, "key").is_none() {
                errs.push("idempotency_result sem key".into());
            }
            let responses = d.get("responses").and_then(|r| r.as_array());
            let mut consistent = true;
            match responses {
                None => errs.push("idempotency_result sem responses".into()),
                Some(rs) if rs.is_empty() => {
                    errs.push("idempotency_result com responses vazio".into())
                }
                Some(rs) => {
                    // canonical-JSON equality: every response for the key must be identical
                    let first = canon(&rs[0]);
                    consistent = rs.iter().all(|r| canon(r) == first);
                    if !consistent {
                        errs.push(
                            "replay com resposta divergente para a mesma idempotency key".into(),
                        );
                    }
                    if rs.len() > 1
                        && d.get("replay_detected").and_then(|x| x.as_bool()) != Some(true)
                    {
                        errs.push("replay não sinalizado (replay_detected deve ser true)".into());
                    }
                }
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs, consistent)
        }
    }
}

/// Ledger: double-entry, zero-sum, single currency, entries linked to a trace_id (ADR-012 / INV-LEDGER).
fn ledger_verdict(v: Option<&Value>, trace_id: Option<&str>) -> (V, Vec<String>, i128, i128) {
    let mut errs = Vec::new();
    let entries = v
        .and_then(|d| d.get("entries").or(Some(d)))
        .and_then(|e| e.as_array());
    let entries = match (v, entries) {
        (None, _) => return (V::Missing, errs, 0, 0),
        (Some(_), None) => {
            errs.push("ledger sem entries".into());
            return (V::Invalid, errs, 0, 0);
        }
        (Some(_), Some(e)) => e,
    };
    if entries.is_empty() {
        errs.push("ledger com entries vazio".into());
        return (V::Invalid, errs, 0, 0);
    }
    let mut debit: i128 = 0;
    let mut credit: i128 = 0;
    let mut currencies = std::collections::BTreeSet::new();
    let mut has_debit = false;
    let mut has_credit = false;
    for e in entries {
        if let Some(c) = str_at(e, "currency") {
            currencies.insert(c.to_string());
        }
        // amount must be an integer minor-unit value
        let amt = match e.get("amount_minor") {
            Some(Value::Number(n)) if n.is_i64() || n.is_u64() => n.as_i64().unwrap_or(0) as i128,
            _ => {
                errs.push("ledger entry.amount_minor deve ser inteiro (minor units)".into());
                continue;
            }
        };
        match str_at(e, "kind") {
            Some("DEBIT") => {
                debit += amt;
                has_debit = true;
            }
            Some("CREDIT") => {
                credit += amt;
                has_credit = true;
            }
            _ => errs.push("ledger entry.kind deve ser DEBIT ou CREDIT".into()),
        }
        // entries must carry the trace linkage
        if let Some(t) = trace_id {
            if str_at(e, "trace_id") != Some(t) {
                errs.push("ledger entry sem trace_id coerente".into());
            }
        } else if str_at(e, "trace_id").is_none() {
            errs.push("ledger entry sem trace_id".into());
        }
    }
    if !has_debit || !has_credit {
        errs.push("ledger não é double-entry (falta DEBIT ou CREDIT)".into());
    }
    if currencies.len() > 1 {
        errs.push("ledger mistura currencies".into());
    }
    if debit != credit {
        errs.push(format!(
            "ledger não soma zero: DEBIT {debit} != CREDIT {credit}"
        ));
    }
    let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
    (verdict, errs, debit, credit)
}

/// Trace linkage: a single trace_id ties the intent, the ledger and the settlement together, with the
/// minimum lifecycle events present (INV-TRACE / INV-RECON).
fn trace_verdict(v: Option<&Value>) -> (V, Vec<String>, Option<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs, None),
        Some(d) => {
            let trace_id = str_at(d, "trace_id").map(|s| s.to_string());
            if trace_id.is_none() {
                errs.push("trace_linkage sem trace_id".into());
            }
            if let Some(t) = trace_id.as_deref() {
                for (field, label) in [
                    ("intent_id", "intent"),
                    ("ledger_trace_id", "ledger"),
                    ("settlement_trace_id", "settlement"),
                ] {
                    // *_trace_id fields must equal the trace_id; intent_id must simply be present
                    if field == "intent_id" {
                        if str_at(d, field).is_none() {
                            errs.push(format!("trace_linkage sem ligação a {label}"));
                        }
                    } else if str_at(d, field) != Some(t) {
                        errs.push(format!("trace_linkage: {label} não liga ao mesmo trace_id"));
                    }
                }
            }
            let events = d.get("events").and_then(|e| e.as_array());
            match events {
                Some(e) if e.len() >= 2 => {}
                _ => errs.push("trace_linkage sem eventos mínimos".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs, trace_id)
        }
    }
}

/// Settlement obligation: gross/net/fee coherent (net = gross - fee, all ≥ 0), linked to the intent
/// (ADR-019). Amounts are integer minor units.
fn settlement_verdict(v: Option<&Value>) -> (V, Vec<String>) {
    let mut errs = Vec::new();
    match v {
        None => (V::Missing, errs),
        Some(d) => {
            // Normalize each to Option<i128> (None = absent or non-integer). Fee defaults to 0 when
            // the field is absent entirely.
            let gross = int_field(d, &["gross_minor", "amount_minor"]).flatten();
            let net = int_field(d, &["net_minor"]).flatten();
            let fee = match int_field(d, &["fee_minor", "application_fee_minor"]) {
                None => Some(0),
                Some(inner) => inner,
            };
            if str_at(d, "intent_id").is_none() {
                errs.push("settlement sem ligação ao payment intent (intent_id)".into());
            }
            match (gross, fee, net) {
                (Some(g), Some(f), Some(n)) => {
                    if g < 0 || f < 0 || n < 0 {
                        errs.push("settlement com valor negativo".into());
                    }
                    if f > g {
                        errs.push("settlement fee > gross".into());
                    }
                    if n != g - f {
                        errs.push(format!(
                            "settlement incoerente: net {n} != gross {g} - fee {f}"
                        ));
                    }
                }
                _ => errs
                    .push("settlement sem gross/net/fee coerentes (inteiros minor units)".into()),
            }
            let verdict = if errs.is_empty() { V::Ok } else { V::Invalid };
            (verdict, errs)
        }
    }
}
/// First present key → Some(Some(i)) if integer, Some(None) if present-but-not-integer, None if absent.
fn int_field(d: &Value, keys: &[&str]) -> Option<Option<i128>> {
    for k in keys {
        if let Some(x) = d.get(*k) {
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

/// Evidence reference: a technical reference (hash/id) to an Evidence Bundle. Recommended-ish; absence
/// counts as a missing required artifact (→ INCOMPLETE), an invalid shape is a warning only.
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

/// Validate the L2 payment-flow readiness surface. `input` may be the object or a `{ input: {...} }`
/// fixture wrapper.
pub fn validate_l2(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do L2 readiness deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let manifest = present(src, "operator_manifest");
    let simb = present(src, "simb_pre_review").or_else(|| present(src, "simb"));
    let l0 = present(src, "conformance_l0").or_else(|| present(src, "l0"));
    let l1 = present(src, "l1_readiness").or_else(|| present(src, "l1"));
    let payment_intent = present(src, "payment_intent");
    let idempotency = present(src, "idempotency_result").or_else(|| present(src, "idempotency"));
    let ledger = present(src, "ledger_postings").or_else(|| present(src, "ledger"));
    let trace = present(src, "trace_linkage").or_else(|| present(src, "trace"));
    let settlement = present(src, "settlement_obligation").or_else(|| present(src, "settlement"));
    let evidence = present(src, "evidence_reference").or_else(|| present(src, "evidence_bundle"));

    // production/real-payment claim → invalid (checked across the payment artifacts)
    let production_claim = [payment_intent, settlement, ledger, trace]
        .into_iter()
        .flatten()
        .any(claims_production);

    let man_v = manifest_verdict(manifest);
    let simb_v = pass_verdict(simb);
    let l0_v = pass_verdict(l0);
    let l1_v = l1_verdict(l1);
    let (pi_v, pi_errs) = payment_intent_verdict(payment_intent);
    let (idem_v, idem_errs, _consistent) = idempotency_verdict(idempotency);
    let (trace_v, trace_errs, trace_id) = trace_verdict(trace);
    let (ledger_v, ledger_errs, debit, credit) = ledger_verdict(ledger, trace_id.as_deref());
    let (stl_v, stl_errs) = settlement_verdict(settlement);
    let ev_v = evidence_verdict(evidence);

    // artifact accounting
    let pairs: [(&str, V); 10] = [
        ("operator_manifest", man_v),
        ("simb_pre_review", simb_v),
        ("conformance_l0", l0_v),
        ("l1_readiness", l1_v),
        ("payment_intent", pi_v),
        ("idempotency", idem_v),
        ("ledger", ledger_v),
        ("trace", trace_v),
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
        "L2_INVALID"
    } else if man_v == V::Invalid {
        "L2_BLOCKED_BY_MANIFEST"
    } else if simb_v == V::Invalid {
        "L2_BLOCKED_BY_SIMB"
    } else if l0_v == V::Invalid {
        "L2_BLOCKED_BY_L0"
    } else if l1_v == V::Invalid {
        "L2_BLOCKED_BY_L1"
    } else if pi_v == V::Invalid {
        "L2_BLOCKED_BY_PAYMENT_FLOW"
    } else if idem_v == V::Invalid {
        "L2_BLOCKED_BY_IDEMPOTENCY"
    } else if ledger_v == V::Invalid {
        "L2_BLOCKED_BY_LEDGER"
    } else if trace_v == V::Invalid {
        "L2_BLOCKED_BY_TRACE"
    } else if stl_v == V::Invalid {
        "L2_BLOCKED_BY_SETTLEMENT"
    } else if !missing_artifacts.is_empty() {
        "L2_INCOMPLETE"
    } else {
        "L2_READY_FOR_TECHNICAL_REVIEW"
    };
    let readiness = if status == "L2_READY_FOR_TECHNICAL_REVIEW" {
        "READY"
    } else {
        "NOT_READY"
    };

    // ── summaries ──
    let payment_flow_summary = json!({
        "payment_intent": verdict_str(&pi_v),
        "intent_id": payment_intent.and_then(|p| str_at(p, "id")),
        "amount_minor": payment_intent.and_then(|p| p.get("amount_minor")).cloned().unwrap_or(Value::Null),
        "currency": payment_intent.and_then(|p| str_at(p, "currency")),
        "errors": pi_errs,
        "note": "Fluxo test-only; sem rede; sem movimentação de fundos."
    });
    let idempotency_summary = json!({
        "idempotency": verdict_str(&idem_v),
        "key": idempotency.and_then(|d| str_at(d, "key")),
        "replay_detected": idempotency.and_then(|d| d.get("replay_detected")).cloned().unwrap_or(Value::Null),
        "errors": idem_errs,
    });
    let ledger_summary = json!({
        "ledger": verdict_str(&ledger_v),
        "debit_minor": debit as i64,
        "credit_minor": credit as i64,
        "zero_sum": debit == credit,
        "errors": ledger_errs,
    });
    let trace_summary = json!({
        "trace": verdict_str(&trace_v),
        "trace_id": trace_id,
        "errors": trace_errs,
    });
    let settlement_summary = json!({
        "settlement": verdict_str(&stl_v),
        "gross_minor": settlement.and_then(|d| int_field(d, &["gross_minor", "amount_minor"]).flatten()).map(|x| x as i64),
        "fee_minor": settlement.and_then(|d| int_field(d, &["fee_minor", "application_fee_minor"]).flatten()).map(|x| x as i64),
        "net_minor": settlement.and_then(|d| int_field(d, &["net_minor"]).flatten()).map(|x| x as i64),
        "errors": stl_errs,
    });
    let evidence_summary = json!({
        "evidence": verdict_str(&ev_v),
        "bundle_hash": evidence.and_then(|d| str_at(d, "bundle_hash").or_else(|| str_at(d, "hash"))),
        "bundle_id": evidence.and_then(|d| str_at(d, "bundle_id").or_else(|| str_at(d, "id"))),
        "disclaimer": "Evidência técnica — não é certificação nem pagamento real.",
    });

    // ── warnings ──
    let mut warnings: Vec<String> = Vec::new();
    if present(src, "failure_handling").is_none() {
        warnings.push(
            "recomendado em falta: failure_handling (como o fluxo trata falhas/replay)".into(),
        );
    }
    if ev_v == V::Invalid {
        warnings.push(
            "evidence_reference sem hash/id técnico — adicione uma referência ao bundle".into(),
        );
    }

    let next_steps: Vec<String> = match status {
        "L2_READY_FOR_TECHNICAL_REVIEW" => vec!["Fluxo de pagamento L2 estruturado (preparação técnica, test-only). A conformidade demonstra-se por evidência verificável; não há aprovação humana central. Não houve pagamento nem movimentação de fundos.".into()],
        "L2_INVALID" => vec!["Remova a declaração de pagamento real/produção/movimentação de fundos — L2 é preparação técnica test-only.".into()],
        "L2_BLOCKED_BY_MANIFEST" => vec!["Corrija o Operator Manifest (deve ser VALID) e revalide.".into()],
        "L2_BLOCKED_BY_SIMB" => vec!["Obtenha um SimB PASS antes de preparar L2.".into()],
        "L2_BLOCKED_BY_L0" => vec!["Obtenha uma Conformidade L0 PASS antes de preparar L2.".into()],
        "L2_BLOCKED_BY_L1" => vec!["Obtenha uma L1 Readiness pronta antes de preparar L2.".into()],
        "L2_BLOCKED_BY_PAYMENT_FLOW" => vec!["Corrija o payment intent (id, currency, status, amount_minor inteiro, idempotency_key, trace).".into()],
        "L2_BLOCKED_BY_IDEMPOTENCY" => vec!["A mesma idempotency key deve devolver resposta consistente; sinalize o replay.".into()],
        "L2_BLOCKED_BY_LEDGER" => vec!["As postings devem ser double-entry, somar zero, na mesma currency e ligadas ao trace_id.".into()],
        "L2_BLOCKED_BY_TRACE" => vec!["Ligue intent, ledger e settlement ao mesmo trace_id com os eventos mínimos.".into()],
        "L2_BLOCKED_BY_SETTLEMENT" => vec!["A settlement deve ter net = gross - fee (todos ≥ 0) e ligar ao payment intent.".into()],
        _ => vec!["Adicione os artefactos em falta e revalide.".into()],
    };

    let mut report = json!({
        "status": status,
        "readiness": readiness,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "missing_artifacts": missing_artifacts,
        "invalid_artifacts": invalid_artifacts,
        "payment_flow_summary": payment_flow_summary,
        "idempotency_summary": idempotency_summary,
        "ledger_summary": ledger_summary,
        "trace_summary": trace_summary,
        "settlement_summary": settlement_summary,
        "evidence_summary": evidence_summary,
        "warnings": warnings,
        "next_steps": next_steps,
        "boundary": BOUNDARY,
        "operator_url_validation": "disabled",
        "operator_url_note": "Validação por URL/endpoint de pagamento do operador desactivada nesta fase; exigirá confirmação explícita.",
        "tool": "banza-l2-readiness",
        "tool_version": TOOL_VERSION,
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
    report["report_id"] = json!(format!("l2-{}", &sha256_hex(&canon(src))[..12]));
    report["l2_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "L2_INVALID", "readiness": "NOT_READY",
        "required_artifacts": REQUIRED_ARTIFACTS, "missing_artifacts": REQUIRED_ARTIFACTS,
        "invalid_artifacts": [],
        "payment_flow_summary": Value::Null, "idempotency_summary": Value::Null,
        "ledger_summary": Value::Null, "trace_summary": Value::Null,
        "settlement_summary": Value::Null, "evidence_summary": Value::Null,
        "warnings": [detail], "next_steps": ["Corrija o input e revalide."],
        "boundary": BOUNDARY, "operator_url_validation": "disabled",
        "tool": "banza-l2-readiness", "tool_version": TOOL_VERSION,
        "not_a_payment": true, "not_a_certificate": true, "not_an_approval": true,
        "does_not_move_funds": true, "does_not_create_operator": true,
        "requires_conformance_evidence_review": true, "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION) ─────────────────────────────────────────────────────────

const NOTE: &str = "TEST ONLY — NOT PRODUCTION";

fn valid_input() -> Value {
    json!({
        "operator_manifest": { "status": "VALID", "operator_id": "operator-zero", "tool_version": "0.1.0" },
        "simb_pre_review": { "status": "PASS", "pre_review_status": "SIMB_PRE_REVIEW_PASS" },
        "conformance_l0": { "status": "PASS", "level": "L0" },
        "l1_readiness": { "status": "L1_READY_FOR_TECHNICAL_REVIEW", "readiness": "READY" },
        "payment_intent": {
            "id": "pi_test_0001", "operator_id": "operator-zero", "payee_wallet_id": "wlt_payee_test",
            "merchant_id": "mch_test", "amount_minor": 12345, "currency": "AOA", "surface": "QR",
            "surface_ref": "qr_test", "status": "REQUESTED", "transfer_id": "trf_test_0001",
            "idempotency_key": "idem_test_0001", "trace_id": "trace_test_0001", "version": 1,
            "created_at": "2026-07-16T00:00:00Z", "note": NOTE
        },
        "idempotency_result": {
            "key": "idem_test_0001",
            "responses": [ { "intent_id": "pi_test_0001", "status": "REQUESTED" }, { "intent_id": "pi_test_0001", "status": "REQUESTED" } ],
            "replay_detected": true, "note": NOTE
        },
        "ledger_postings": {
            "entries": [
                { "id": "led_d", "wallet_id": "wlt_payer_test", "kind": "DEBIT", "amount_minor": 12345, "currency": "AOA", "trace_id": "trace_test_0001", "correlation_id": "trf_test_0001", "reference": "pi_test_0001", "created_at": "2026-07-16T00:00:00Z" },
                { "id": "led_c", "wallet_id": "wlt_payee_test", "kind": "CREDIT", "amount_minor": 12345, "currency": "AOA", "trace_id": "trace_test_0001", "correlation_id": "trf_test_0001", "reference": "pi_test_0001", "created_at": "2026-07-16T00:00:00Z" }
            ], "note": NOTE
        },
        "trace_linkage": {
            "trace_id": "trace_test_0001", "intent_id": "pi_test_0001",
            "ledger_trace_id": "trace_test_0001", "settlement_trace_id": "trace_test_0001",
            "events": ["intent.created", "transfer.posted", "settlement.created"], "note": NOTE
        },
        "settlement_obligation": {
            "id": "stl_test_0001", "intent_id": "pi_test_0001", "trace_id": "trace_test_0001",
            "gross_minor": 12345, "fee_minor": 345, "net_minor": 12000, "currency": "AOA",
            "status": "CREATED", "note": NOTE
        },
        "evidence_reference": {
            "bundle_id": "eb_test_0001", "bundle_hash": "TEST_ONLY_hash_deadbeefcafe",
            "readiness": "READY_FOR_TECHNICAL_REVIEW",
            "disclaimer": "Evidência técnica — não é certificação nem pagamento real.", "note": NOTE
        }
    })
}

/// TEST-ONLY demo fixtures for the L2 payment-flow readiness validator. No fixture represents a real
/// payment.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut idem_fail = valid.clone();
    idem_fail["idempotency_result"] = json!({
        "key": "idem_test_0001",
        "responses": [ { "intent_id": "pi_test_0001", "status": "REQUESTED" }, { "intent_id": "pi_test_0001", "status": "PAID" } ],
        "replay_detected": true, "note": NOTE
    });

    let mut ledger_fail = valid.clone();
    ledger_fail["ledger_postings"]["entries"][1]["amount_minor"] = json!(12000); // credit != debit

    let mut trace_fail = valid.clone();
    trace_fail["trace_linkage"]["settlement_trace_id"] = json!("trace_OTHER_9999"); // inconsistent

    let mut settlement_fail = valid.clone();
    settlement_fail["settlement_obligation"]["net_minor"] = json!(999); // net != gross - fee

    let mut missing_l1 = valid.clone();
    missing_l1.as_object_mut().unwrap().remove("l1_readiness");

    let mut production = valid.clone();
    production["payment_intent"]["moves_real_funds"] = json!(true);
    production["settlement_obligation"]["production"] = json!(true);

    json!({
        "note": NOTE,
        "fixtures": [
            { "key": "l2_ready_payment_flow", "label": "Fluxo L2 pronto", "expected": "L2_READY_FOR_TECHNICAL_REVIEW", "input": valid },
            { "key": "idempotency_fail", "label": "Idempotência divergente", "expected": "L2_BLOCKED_BY_IDEMPOTENCY", "input": idem_fail },
            { "key": "ledger_fail", "label": "Ledger não soma zero", "expected": "L2_BLOCKED_BY_LEDGER", "input": ledger_fail },
            { "key": "trace_fail", "label": "Trace inconsistente", "expected": "L2_BLOCKED_BY_TRACE", "input": trace_fail },
            { "key": "settlement_fail", "label": "Settlement incoerente", "expected": "L2_BLOCKED_BY_SETTLEMENT", "input": settlement_fail },
            { "key": "missing_l1", "label": "L1 Readiness ausente", "expected": "L2_INCOMPLETE", "input": missing_l1 },
            { "key": "production_claim", "label": "Declara pagamento real/produção", "expected": "L2_INVALID", "input": production },
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-l2-readiness", "tool_version": TOOL_VERSION,
        "required_artifacts": REQUIRED_ARTIFACTS,
        "recommended_artifacts": RECOMMENDED_ARTIFACTS,
        "payment_intent_fields": ["id", "operator_id", "payee_wallet_id", "merchant_id", "amount_minor", "currency", "surface", "status", "transfer_id", "idempotency_key", "trace_id", "created_at"],
        "status_values": [
            "L2_READY_FOR_TECHNICAL_REVIEW", "L2_BLOCKED_BY_MANIFEST", "L2_BLOCKED_BY_SIMB",
            "L2_BLOCKED_BY_L0", "L2_BLOCKED_BY_L1", "L2_BLOCKED_BY_PAYMENT_FLOW",
            "L2_BLOCKED_BY_IDEMPOTENCY", "L2_BLOCKED_BY_LEDGER", "L2_BLOCKED_BY_TRACE",
            "L2_BLOCKED_BY_SETTLEMENT", "L2_INCOMPLETE", "L2_INVALID"
        ],
        "money": "inteiro em minor units, nunca float",
        "network": "local por defeito — sem fetch; validação por URL/endpoint de pagamento desactivada nesta fase.",
        "boundary": BOUNDARY,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-l2-readiness", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
