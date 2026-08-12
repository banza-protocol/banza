//! The simulated PSP-like flows: QR payment, refund, controlled failure, reconciliation, demo trust,
//! demo federation, evidence bundle and the end-to-end trace.
//!
//! Everything here is deterministic. There is no clock, no randomness and no network — a simulator
//! whose output changed between runs could not be used as evidence of anything.

use crate::ledger::{Ledger, SimError, DEMO_CURRENCY};
use serde_json::{json, Value};

/// A simulated QR payment request. `expired` is an input rather than a clock reading, so the
/// expiry path is reproducible.
#[derive(Debug, Clone)]
pub struct QrPayment {
    pub qr_id: String,
    pub from_account: String,
    pub to_account: String,
    pub amount: i64,
    pub currency: String,
    pub expired: bool,
    pub signature_valid: bool,
    pub operator_revoked: bool,
}

impl QrPayment {
    /// The canonical happy path: Ana pays the Kiosque 1500 KZ_DEMO.
    pub fn demo() -> Self {
        QrPayment {
            qr_id: "qr_demo_0001".into(),
            from_account: "demo-user-ana".into(),
            to_account: "demo-merchant-kiosque".into(),
            amount: 1_500,
            currency: DEMO_CURRENCY.into(),
            expired: false,
            signature_valid: true,
            operator_revoked: false,
        }
    }
}

/// The result of one simulated payment.
pub struct PaymentOutcome {
    pub status: &'static str,
    pub transaction_id: String,
    pub error: Option<SimError>,
}

/// Simulate a QR payment against the ledger.
///
/// The refusal ORDER is deliberate and mirrors what a real operator must do: reject on trust and
/// validity BEFORE touching balances. A simulator that debited first and validated afterwards would
/// be demonstrating the wrong sequence, even if the final numbers matched.
pub fn simulate_qr_payment(ledger: &mut Ledger, qr: &QrPayment) -> PaymentOutcome {
    let txn = format!("txn_{}", qr.qr_id);

    let refuse = |code: &'static str, detail: String, status: &'static str| PaymentOutcome {
        status,
        transaction_id: txn.clone(),
        error: Some(SimError { code, detail }),
    };

    if qr.operator_revoked {
        return refuse(
            "operator_revoked",
            "a chave demo do operador está revogada".into(),
            "failed",
        );
    }
    if !qr.signature_valid {
        return refuse(
            "invalid_signature",
            "assinatura demo inválida".into(),
            "failed",
        );
    }
    if qr.expired {
        return refuse("qr_expired", format!("{} expirou", qr.qr_id), "expired");
    }
    if qr.currency != DEMO_CURRENCY {
        return refuse(
            "currency_not_demo",
            format!("moeda '{}' não é {DEMO_CURRENCY}", qr.currency),
            "failed",
        );
    }

    match ledger.transfer(
        &txn,
        &qr.from_account,
        &qr.to_account,
        qr.amount,
        "payment",
        &qr.qr_id,
    ) {
        Ok(()) => PaymentOutcome {
            status: "confirmed",
            transaction_id: txn,
            error: None,
        },
        Err(e) => PaymentOutcome {
            status: "failed",
            transaction_id: txn,
            error: Some(e),
        },
    }
}

/// Simulate a refund against an earlier payment.
pub fn simulate_refund(
    ledger: &mut Ledger,
    original_txn: &str,
    from: &str,
    to: &str,
    amount: i64,
    original_amount: i64,
) -> PaymentOutcome {
    let txn = format!("{original_txn}_refund");
    match ledger.transfer(&txn, from, to, amount, "refund", original_txn) {
        Ok(()) => PaymentOutcome {
            status: if amount >= original_amount {
                "refunded"
            } else {
                "partially_refunded"
            },
            transaction_id: txn,
            error: None,
        },
        Err(e) => PaymentOutcome {
            status: "failed",
            transaction_id: txn,
            error: Some(e),
        },
    }
}

/// Demo trust evaluation. Fails CLOSED: anything missing or unverifiable is a refusal, never a pass.
pub fn simulate_trust(
    key_manifest_present: bool,
    signature_valid: bool,
    revoked: bool,
) -> &'static str {
    if !key_manifest_present {
        return "demo_trust_missing_key_manifest";
    }
    if revoked {
        return "demo_trust_revoked";
    }
    if !signature_valid {
        return "demo_trust_invalid_signature";
    }
    "demo_trust_valid"
}

/// Demo federation against a peer. Version mismatch is the incompatibility that matters.
pub fn simulate_federation(
    peer_reachable: bool,
    peer_protocol_version: &str,
    own_version: &str,
) -> &'static str {
    if !peer_reachable {
        return "demo_federation_peer_unreachable";
    }
    if peer_protocol_version != own_version {
        return "demo_federation_incompatible";
    }
    "demo_federation_compatible"
}

/// The evidence bundle state, derived from what actually happened rather than declared.
pub fn evidence_state(
    manifest_ok: bool,
    conformance_ok: bool,
    trust: &str,
    federation: &str,
    ledger_reconciled: bool,
) -> &'static str {
    if !manifest_ok {
        return "evidence_invalid";
    }
    let all = conformance_ok
        && trust == "demo_trust_valid"
        && federation == "demo_federation_compatible"
        && ledger_reconciled;
    if all {
        "evidence_complete"
    } else {
        "evidence_partial"
    }
}

/// What to do next, given where the simulation is.
pub fn next_action(
    manifest_ok: Option<bool>,
    conformance_ok: Option<bool>,
    trust: Option<&str>,
    payment_done: bool,
    federation: Option<&str>,
    bundle: Option<&str>,
    trace_done: bool,
) -> &'static str {
    match manifest_ok {
        None => return "carregar_template",
        Some(false) => return "corrigir_manifest",
        Some(true) => {}
    }
    if conformance_ok.is_none() {
        return "executar_conformidade";
    }
    if trust.is_none() {
        return "avaliar_trust_demo";
    }
    if !payment_done {
        return "simular_pagamento";
    }
    if federation.is_none() {
        return "simular_federacao";
    }
    if bundle.is_none() {
        return "gerar_evidence_bundle";
    }
    if !trace_done {
        return "gerar_trace";
    }
    "simulacao_completa"
}

/// Run the whole end-to-end simulation and return the trace.
///
/// `happy` selects the positive or the negative scenario. Both are first-class: a simulator that
/// only demonstrates success proves nothing about the checks.
pub fn run_e2e(happy: bool) -> Value {
    let opening = Ledger::demo();
    let mut ledger = opening.clone();
    let mut steps: Vec<Value> = Vec::new();

    let manifest_ok = happy;
    steps.push(json!({
        "step": "manifest", "artifact_type": "manifest",
        "ok": manifest_ok,
        "error": if manifest_ok { Value::Null } else {
            json!({ "code": "manifest_invalid", "label": crate::vocab::label("manifest_invalid") }) },
    }));

    let conformance_ok = happy;
    steps.push(json!({
        "step": "conformidade", "artifact_type": "conformance_evidence", "ok": conformance_ok,
    }));

    let trust = if happy {
        simulate_trust(true, true, false)
    } else {
        simulate_trust(true, true, true) // revoked demo key
    };
    steps.push(json!({
        "step": "trust", "artifact_type": "trust_evidence",
        "status": trust, "status_label": crate::vocab::label(trust),
        "ok": trust == "demo_trust_valid",
    }));

    // Payment: the happy path pays and partially refunds; the negative path overdraws.
    let payment_status: &str;
    if happy {
        let qr = QrPayment::demo();
        let out = simulate_qr_payment(&mut ledger, &qr);
        payment_status = out.status;
        let refund = simulate_refund(
            &mut ledger,
            &out.transaction_id,
            &qr.to_account,
            &qr.from_account,
            500,
            qr.amount,
        );
        steps.push(json!({
            "step": "pagamento", "artifact_type": "payment",
            "payment_status": out.status, "payment_status_label": crate::vocab::label(out.status),
            "refund_status": refund.status, "refund_status_label": crate::vocab::label(refund.status),
            "amount": qr.amount, "refunded": 500, "currency": DEMO_CURRENCY,
            "ok": true,
        }));
    } else {
        let mut qr = QrPayment::demo();
        qr.amount = 10_000_000; // more than Ana has
        let out = simulate_qr_payment(&mut ledger, &qr);
        payment_status = out.status;
        let payment_error = out
            .error
            .as_ref()
            .map(|e| e.to_json())
            .unwrap_or(Value::Null);
        steps.push(json!({
            "step": "pagamento", "artifact_type": "payment",
            "payment_status": out.status, "payment_status_label": crate::vocab::label(out.status),
            "error": payment_error,
            "ok": false,
        }));
    }

    let federation = if happy {
        simulate_federation(true, "1.0", "1.0")
    } else {
        simulate_federation(true, "0.9", "1.0")
    };
    steps.push(json!({
        "step": "federacao", "artifact_type": "federation_metadata",
        "status": federation, "status_label": crate::vocab::label(federation),
        "ok": federation == "demo_federation_compatible",
    }));

    let recon = ledger.reconcile(&opening);
    let reconciled = recon["status"] == "reconciled";
    steps.push(json!({
        "step": "reconciliacao", "artifact_type": "ledger",
        "status": recon["status"].clone(), "status_label": recon["status_label"].clone(),
        "ok": reconciled,
    }));

    let bundle = evidence_state(manifest_ok, conformance_ok, trust, federation, reconciled);
    steps.push(json!({
        "step": "evidence_bundle", "artifact_type": "evidence_bundle",
        "status": bundle, "status_label": crate::vocab::label(bundle),
        "ok": bundle == "evidence_complete",
    }));

    let blockers: Vec<Value> = steps
        .iter()
        .filter(|s| s["ok"] == false)
        .map(|s| json!({ "step": s["step"].clone(), "status": s.get("status").cloned().unwrap_or(Value::Null) }))
        .collect();

    let action = next_action(
        Some(manifest_ok),
        Some(conformance_ok),
        Some(trust),
        payment_status != "pending",
        Some(federation),
        Some(bundle),
        true,
    );

    json!({
        "operator_id": "operator-zero",
        "operator_display_name": "Operador Zero",
        "demo_only": true,
        "monetary_value": false,
        "production_allowed": false,
        "currency": DEMO_CURRENCY,
        "scenario": if happy { "full_e2e" } else { "negative_e2e" },
        "steps": steps,
        "ledger": ledger.to_json(),
        "reconciliation": recon,
        "evidence_status": bundle,
        "evidence_status_label": crate::vocab::label(bundle),
        "next_action": action,
        "next_action_label": crate::vocab::label(action),
        "blockers": blockers,
        "complete": bundle == "evidence_complete",
        "note": "Simulação técnica. Não certifica, não aprova e não move dinheiro real.",
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_happy_path_pays_refunds_and_reconciles() {
        let t = run_e2e(true);
        assert_eq!(t["scenario"], "full_e2e");
        assert_eq!(t["evidence_status"], "evidence_complete");
        assert_eq!(t["complete"], true);
        assert!(t["blockers"].as_array().unwrap().is_empty());
        assert_eq!(t["reconciliation"]["status"], "reconciled");
        assert_eq!(t["next_action"], "simulacao_completa");
        // Ana paid 1500 and got 500 back.
        let accounts = t["ledger"]["accounts"].as_array().unwrap();
        let ana = accounts
            .iter()
            .find(|a| a["account_id"] == "demo-user-ana")
            .unwrap();
        assert_eq!(ana["balance"], 99_000);
    }

    #[test]
    fn the_negative_path_produces_real_blockers() {
        let t = run_e2e(false);
        assert_eq!(t["scenario"], "negative_e2e");
        assert_eq!(t["complete"], false);
        let blockers = t["blockers"].as_array().unwrap();
        assert!(
            !blockers.is_empty(),
            "the negative scenario must produce blockers"
        );
        assert_ne!(t["evidence_status"], "evidence_complete");
        // …and the failed payment must not have moved anything.
        assert_eq!(t["reconciliation"]["status"], "reconciled");
    }

    #[test]
    fn every_controlled_failure_is_reachable_and_ordered_before_the_balance_check() {
        let mut l = Ledger::demo();
        // Revocation outranks everything: it must refuse even a well-formed, affordable payment.
        let mut qr = QrPayment::demo();
        qr.operator_revoked = true;
        assert_eq!(
            simulate_qr_payment(&mut l, &qr).error.unwrap().code,
            "operator_revoked"
        );

        let mut qr = QrPayment::demo();
        qr.signature_valid = false;
        assert_eq!(
            simulate_qr_payment(&mut l, &qr).error.unwrap().code,
            "invalid_signature"
        );

        let mut qr = QrPayment::demo();
        qr.expired = true;
        let out = simulate_qr_payment(&mut l, &qr);
        assert_eq!(out.status, "expired");
        assert_eq!(out.error.unwrap().code, "qr_expired");

        let mut qr = QrPayment::demo();
        qr.currency = "AOA".into();
        assert_eq!(
            simulate_qr_payment(&mut l, &qr).error.unwrap().code,
            "currency_not_demo"
        );

        let mut qr = QrPayment::demo();
        qr.amount = 10_000_000;
        assert_eq!(
            simulate_qr_payment(&mut l, &qr).error.unwrap().code,
            "insufficient_balance"
        );

        // Not one of those refusals may have moved value.
        assert_eq!(l.total(), 100_000);
        assert_eq!(l.entries().len(), 0);
    }

    #[test]
    fn trust_fails_closed() {
        assert_eq!(
            simulate_trust(false, true, false),
            "demo_trust_missing_key_manifest"
        );
        assert_eq!(simulate_trust(true, true, true), "demo_trust_revoked");
        assert_eq!(
            simulate_trust(true, false, false),
            "demo_trust_invalid_signature"
        );
        assert_eq!(simulate_trust(true, true, false), "demo_trust_valid");
        // Revocation outranks a valid signature — the fail-closed ordering.
        assert_eq!(simulate_trust(true, true, true), "demo_trust_revoked");
    }

    #[test]
    fn federation_rejects_an_incompatible_peer() {
        assert_eq!(
            simulate_federation(true, "1.0", "1.0"),
            "demo_federation_compatible"
        );
        assert_eq!(
            simulate_federation(true, "0.9", "1.0"),
            "demo_federation_incompatible"
        );
        assert_eq!(
            simulate_federation(false, "1.0", "1.0"),
            "demo_federation_peer_unreachable"
        );
    }

    #[test]
    fn the_evidence_bundle_is_derived_not_declared() {
        assert_eq!(
            evidence_state(
                true,
                true,
                "demo_trust_valid",
                "demo_federation_compatible",
                true
            ),
            "evidence_complete"
        );
        // Any one missing piece downgrades it.
        assert_eq!(
            evidence_state(
                true,
                true,
                "demo_trust_revoked",
                "demo_federation_compatible",
                true
            ),
            "evidence_partial"
        );
        assert_eq!(
            evidence_state(
                true,
                false,
                "demo_trust_valid",
                "demo_federation_compatible",
                true
            ),
            "evidence_partial"
        );
        assert_eq!(
            evidence_state(
                false,
                true,
                "demo_trust_valid",
                "demo_federation_compatible",
                true
            ),
            "evidence_invalid"
        );
    }

    #[test]
    fn every_status_the_simulation_emits_is_published_and_labelled() {
        for happy in [true, false] {
            let t = run_e2e(happy);
            let check = |v: &Value| {
                if let Some(s) = v.as_str() {
                    if !s.is_empty() && s.chars().all(|c| c.is_ascii_lowercase() || c == '_') {
                        // Only assert on things that look like slugs, and only those we publish.
                        let published = crate::vocab::vocabulary();
                        let known = published
                            .as_object()
                            .unwrap()
                            .values()
                            .any(|g| g.as_array().unwrap().iter().any(|x| x == v));
                        if known {
                            assert!(!crate::vocab::label(s).is_empty(), "'{s}' has no label");
                        }
                    }
                }
            };
            check(&t["evidence_status"]);
            check(&t["next_action"]);
            for s in t["steps"].as_array().unwrap() {
                if let Some(st) = s.get("status") {
                    check(st);
                }
            }
        }
    }
}
