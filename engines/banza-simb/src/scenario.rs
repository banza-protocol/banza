//! banza-simb Workbench scenario layer (BX1.3).
//!
//! Deterministic, TEST-ONLY demo scenarios for the BanzAI Workbench SimB tool. Each scenario runs the
//! same valid L0 flow on a fresh [`SimOperator`] (a transfer, an idempotent replay, a second transfer,
//! and a settlement), then the fault scenarios inject exactly ONE deterministic fault into the produced
//! artifacts so that exactly one financial invariant fails. The invariant checker ([`check_bundle`]) is
//! the single source of truth for the technical PASS/FAIL — computed HERE, in Rust, never in TypeScript.
//!
//! No real funds, no network, no operator added to `/operators`, no production certificate. Every output
//! carries the [`SIMB_MARKER`] and `test_only = true`.

use crate::{LedgerEntry, Settlement, SimOperator, SIMB_MARKER};
use serde::Serialize;
use serde_json::{json, Value};

pub const TOOL_VERSION: &str = "0.1.0";

/// A single idempotency observation: the key, the transfer it mapped to, whether it was a replay, and
/// a deterministic signature of the response the operator returned for it.
#[derive(Serialize, Clone, Debug)]
pub struct IdemRecord {
    pub key: String,
    pub transfer_id: String,
    pub replay: bool,
    pub response: String,
}

/// A technical invariant check result (PASS/FAIL only — this is evidence, not certification).
#[derive(Serialize, Clone, Debug)]
pub struct Check {
    pub id: String,
    pub name: String,
    pub status: String, // "PASS" | "FAIL"
    pub reason: String,
}

/// The artifacts a scenario run produced, over which [`check_bundle`] evaluates the L0 invariants.
#[derive(Serialize, Clone, Debug)]
pub struct Bundle {
    pub operator_id: String,
    pub events: Vec<String>,
    pub ledger_entries: Vec<LedgerEntry>,
    pub balances: Vec<(String, i64)>,
    pub idempotency: Vec<IdemRecord>,
    pub settlements: Vec<Settlement>,
    pub injected_fault: Option<String>,
}

/// The demo scenarios exposed to the browser. Keys are stable (the UI selects by key).
pub const SCENARIOS: &[(&str, &str, &str)] = &[
    ("valid_l0", "Operador válido L0", "PASS técnico esperado"),
    (
        "invalid_ledger",
        "Falha de ledger (double-entry)",
        "FAIL técnico esperado",
    ),
    (
        "idempotency_fail",
        "Falha de idempotência",
        "FAIL técnico esperado",
    ),
    (
        "settlement_fail",
        "Falha de settlement",
        "FAIL técnico esperado",
    ),
];

/// The DURABLE idempotent result signature: `ok` + `transfer_id`. It deliberately excludes the
/// new-entries count, because a correct replay posts zero new entries while the original posts two —
/// the idempotency contract is a stable durable result, not an identical entry count.
fn resp_sig(r: &crate::TransferResult) -> String {
    format!("ok={};tid={}", r.ok, r.transfer_id)
}

/// Run the canonical valid L0 flow on a fresh operator and collect the produced artifacts. `currency`
/// is stamped on every ledger entry and settlement (default callers pass "AOA"; the OZ demo passes
/// KZ_DEMO) — the flow itself is identical.
fn valid_flow(currency: &str) -> Bundle {
    let mut op = SimOperator::new_with_currency("SIM-A", currency);
    let mut events = Vec::new();
    let mut idem = Vec::new();

    events.push("Operador simulado SIM-A criado (wallets sandbox seed, determinístico)".into());

    let t1 = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "k1");
    events
        .push("Transferência sandbox-consumer-1 → sandbox-merchant-1 (1000 minor), idem=k1".into());
    idem.push(IdemRecord {
        key: "k1".into(),
        transfer_id: t1.transfer_id.clone(),
        replay: false,
        response: resp_sig(&t1),
    });

    let r1 = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "k1");
    events.push("Replay idem=k1 (deve devolver a mesma resposta, sem novo posting)".into());
    idem.push(IdemRecord {
        key: "k1".into(),
        transfer_id: r1.transfer_id.clone(),
        replay: r1.idempotent_replay,
        response: resp_sig(&r1),
    });

    let t2 = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-2", 100_000, "k2");
    events.push(
        "Transferência sandbox-consumer-1 → sandbox-merchant-2 (100000 minor), idem=k2".into(),
    );
    idem.push(IdemRecord {
        key: "k2".into(),
        transfer_id: t2.transfer_id.clone(),
        replay: false,
        response: resp_sig(&t2),
    });

    let s = op.create_settlement("sandbox-merchant-2");
    events.push("Settlement da wallet sandbox-merchant-2 (net + fee == gross)".into());

    let ledger_entries: Vec<LedgerEntry> = op
        .ledger_for("sandbox-consumer-1")
        .into_iter()
        .chain(op.ledger_for("sandbox-merchant-1"))
        .chain(op.ledger_for("sandbox-merchant-2"))
        .cloned()
        .collect();
    let balances = vec![
        (
            "sandbox-consumer-1".to_string(),
            op.balance("sandbox-consumer-1").unwrap_or(0),
        ),
        (
            "sandbox-merchant-1".to_string(),
            op.balance("sandbox-merchant-1").unwrap_or(0),
        ),
        (
            "sandbox-merchant-2".to_string(),
            op.balance("sandbox-merchant-2").unwrap_or(0),
        ),
    ];

    Bundle {
        operator_id: op.id.clone(),
        events,
        ledger_entries,
        balances,
        idempotency: idem,
        settlements: vec![s],
        injected_fault: None,
    }
}

/// Build the bundle for a scenario: the valid flow (in `currency`), then inject exactly one
/// deterministic fault.
fn build_bundle(key: &str, currency: &str) -> Bundle {
    let mut b = valid_flow(currency);
    match key {
        "valid_l0" => {}
        "invalid_ledger" => {
            // Drop one CREDIT entry → double-entry sums no longer balance (INV-LEDGER-001).
            if let Some(pos) = b.ledger_entries.iter().position(|e| e.kind == "CREDIT") {
                let dropped = b.ledger_entries.remove(pos);
                b.injected_fault = Some(format!(
                    "Entrada CREDIT removida do ledger (trace {}, {} minor) — double-entry quebrado",
                    dropped.trace_id, dropped.amount_minor
                ));
                b.events
                    .push("FALHA INJECTADA: entrada CREDIT removida do ledger".into());
            }
        }
        "idempotency_fail" => {
            // The replay of k1 returns a DIFFERENT response than the original (broken operator).
            if let Some(rec) = b.idempotency.iter_mut().find(|r| r.key == "k1" && r.replay) {
                rec.transfer_id = "transfer-SIM-A-DIVERGENTE".into();
                rec.response = "ok=true;tid=transfer-SIM-A-DIVERGENTE".into();
                b.injected_fault = Some(
                    "Mesma idempotency key (k1) produziu uma resposta diferente no replay — INV-IDEM quebrado".into(),
                );
                b.events
                    .push("FALHA INJECTADA: replay idem=k1 devolveu resposta divergente".into());
            }
        }
        "settlement_fail" => {
            // Break the settlement identity: net + fee != gross (money created/destroyed).
            if let Some(s) = b.settlements.first_mut() {
                s.net_minor -= 500;
                b.injected_fault = Some(format!(
                    "Settlement {} com net + fee != gross ({} + {} != {}) — INV-SETTLE quebrado",
                    s.id, s.net_minor, s.fee_minor, s.gross_minor
                ));
                b.events.push(
                    "FALHA INJECTADA: identidade de settlement quebrada (net + fee != gross)"
                        .into(),
                );
            }
        }
        _ => {
            b.injected_fault = Some(format!("cenário desconhecido: {key}"));
        }
    }
    b
}

/// The L0 financial-invariant checker — the single source of technical truth (computed in Rust).
pub fn check_bundle(b: &Bundle) -> Vec<Check> {
    let mut checks = Vec::new();

    // INV-LEDGER-001 — double-entry: per trace one DEBIT + one CREDIT of equal amount; sums balance.
    let debit: i64 = b
        .ledger_entries
        .iter()
        .filter(|e| e.kind == "DEBIT")
        .map(|e| e.amount_minor)
        .sum();
    let credit: i64 = b
        .ledger_entries
        .iter()
        .filter(|e| e.kind == "CREDIT")
        .map(|e| e.amount_minor)
        .sum();
    let mut per_trace_ok = true;
    let traces: Vec<String> = trace_ids(b);
    for tr in &traces {
        let d: Vec<&LedgerEntry> = b
            .ledger_entries
            .iter()
            .filter(|e| &e.trace_id == tr && e.kind == "DEBIT")
            .collect();
        let c: Vec<&LedgerEntry> = b
            .ledger_entries
            .iter()
            .filter(|e| &e.trace_id == tr && e.kind == "CREDIT")
            .collect();
        let dsum: i64 = d.iter().map(|e| e.amount_minor).sum();
        let csum: i64 = c.iter().map(|e| e.amount_minor).sum();
        if d.len() != 1 || c.len() != 1 || dsum != csum {
            per_trace_ok = false;
        }
    }
    let ledger_ok = debit == credit && per_trace_ok;
    checks.push(Check {
        id: "INV-LEDGER-001".into(),
        name: "Double-entry".into(),
        status: pf(ledger_ok),
        reason: if ledger_ok {
            format!("débitos {debit} == créditos {credit}; cada trace tem 1 DEBIT + 1 CREDIT")
        } else {
            format!("débitos {debit} != créditos {credit} (ou trace sem par DEBIT/CREDIT)")
        },
    });

    // INV-IDEM-001 — same idempotency key ⇒ same response, replay posts nothing new.
    let mut idem_ok = true;
    let mut idem_reason = "cada idempotency key mapeia a uma única resposta estável".to_string();
    for rec in &b.idempotency {
        let first = b.idempotency.iter().find(|r| r.key == rec.key);
        if let Some(f) = first {
            if f.response != rec.response || f.transfer_id != rec.transfer_id {
                idem_ok = false;
                idem_reason = format!(
                    "idempotency key '{}' produziu respostas diferentes",
                    rec.key
                );
            }
        }
    }
    checks.push(Check {
        id: "INV-IDEM-001".into(),
        name: "Idempotência".into(),
        status: pf(idem_ok),
        reason: idem_reason,
    });

    // INV-SETTLE-001 — settlement identity: net + fee == gross.
    let mut settle_ok = true;
    let mut settle_reason = "net + fee == gross em todas as settlements".to_string();
    for s in &b.settlements {
        if s.net_minor + s.fee_minor != s.gross_minor {
            settle_ok = false;
            settle_reason = format!(
                "settlement {}: net {} + fee {} = {} != gross {}",
                s.id,
                s.net_minor,
                s.fee_minor,
                s.net_minor + s.fee_minor,
                s.gross_minor
            );
        }
    }
    checks.push(Check {
        id: "INV-SETTLE-001".into(),
        name: "Identidade de settlement".into(),
        status: pf(settle_ok),
        reason: settle_reason,
    });

    // INV-WALLET-001 — no negative balance (ledger-derived).
    let neg: Vec<&(String, i64)> = b.balances.iter().filter(|(_, v)| *v < 0).collect();
    let wallet_ok = neg.is_empty();
    checks.push(Check {
        id: "INV-WALLET-001".into(),
        name: "Sem saldo negativo".into(),
        status: pf(wallet_ok),
        reason: if wallet_ok {
            "todos os saldos derivados do ledger são >= 0".into()
        } else {
            format!(
                "saldo negativo em {}",
                neg.iter()
                    .map(|(w, _)| w.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        },
    });

    checks
}

fn pf(ok: bool) -> String {
    if ok {
        "PASS".into()
    } else {
        "FAIL".into()
    }
}

fn trace_ids(b: &Bundle) -> Vec<String> {
    let mut v: Vec<String> = b
        .ledger_entries
        .iter()
        .map(|e| e.trace_id.clone())
        .collect();
    v.sort();
    v.dedup();
    v
}

/// The SimB Pre-Review Gate disclaimer (see docs/governance/SIMB_PRE_REVIEW_GATE.md). Never weaken.
pub const SIMB_PRE_REVIEW_DISCLAIMER: &str =
    "SimB PASS é evidência técnica de pré-revisão. Não é certificação; SimB não certifica, não aprova e \
     não cria operador real. A conformidade demonstra-se por evidência verificável, não por aprovação humana central.";

/// Map a scenario run to its SimB Pre-Review Gate status (computed in Rust). Unknown/malformed → INCOMPLETE.
pub fn pre_review_status(status: &str, incomplete: bool) -> &'static str {
    if incomplete {
        "SIMB_PRE_REVIEW_INCOMPLETE"
    } else if status == "PASS" {
        "SIMB_PRE_REVIEW_PASS"
    } else {
        "SIMB_PRE_REVIEW_FAIL"
    }
}

/// Run a demo scenario and return the full UI envelope (status computed in Rust). Currency defaults to
/// "AOA" — backward-compatible with every existing caller; use [`run_scenario_with_currency`] to pick
/// a different one (the Operador Zero demo uses KZ_DEMO).
pub fn run_scenario(key: &str) -> Value {
    run_scenario_with_currency(key, "AOA")
}

/// Run a demo scenario stamping `currency` on every ledger entry and settlement. Identical to
/// [`run_scenario`] in every other respect (same invariant checks, same status computed in Rust).
pub fn run_scenario_with_currency(key: &str, currency: &str) -> Value {
    let b = build_bundle(key, currency);
    let checks = check_bundle(&b);
    let status = if checks.iter().all(|c| c.status == "PASS") {
        "PASS"
    } else {
        "FAIL"
    };
    // An unknown scenario has no real invariant evidence for a pre-review verdict → INCOMPLETE.
    let incomplete = b
        .injected_fault
        .as_deref()
        .map(|f| f.contains("desconhecido"))
        .unwrap_or(false);
    let pre_status = pre_review_status(status, incomplete);
    let mut warnings: Vec<String> = Vec::new();
    if let Some(f) = &b.injected_fault {
        warnings.push(format!("Falha injectada (cenário demo): {f}"));
    }
    let label = SCENARIOS
        .iter()
        .find(|(k, _, _)| *k == key)
        .map(|(_, l, _)| *l)
        .unwrap_or(key);

    let settlement_summary = b.settlements.first().map(|s| {
        json!({
            "id": s.id, "wallet_id": s.wallet_id, "gross_minor": s.gross_minor,
            "fee_minor": s.fee_minor, "net_minor": s.net_minor, "currency": s.currency,
            "tx_count": s.tx_count, "identity_ok": s.net_minor + s.fee_minor == s.gross_minor
        })
    });
    let traces = trace_ids(&b);

    json!({
        "scenario_id": key,
        "label": label,
        "mode": "demo · test-only",
        "operator_id": b.operator_id,
        "test_only": true,
        "marker": SIMB_MARKER,
        "injected_fault": b.injected_fault,
        "events": b.events,
        "ledger_entries": b.ledger_entries,
        "balances": b.balances.iter().map(|(w, v)| json!({"wallet_id": w, "balance_minor": v})).collect::<Vec<_>>(),
        "idempotency_results": b.idempotency,
        "settlement_summary": settlement_summary,
        "trace_summary": { "trace_ids": traces, "count": trace_ids(&b).len() },
        "invariant_checks": checks,
        "status": status,
        "pre_review_gate": true,
        "pre_review_status": pre_status,
        "not_a_certificate": true,
        "required_before_banza_ca_review": true,
        "disclaimer": SIMB_PRE_REVIEW_DISCLAIMER,
        "warnings": warnings,
        "tool": "banza-simb",
        "tool_version": TOOL_VERSION,
        "llm_calls": 0,
        "external_model_called": false,
    })
}

/// The list of demo scenarios (key + label + expectation) for the UI selector.
pub fn demo_scenarios() -> Value {
    json!({
        "marker": SIMB_MARKER,
        "scenarios": SCENARIOS.iter().map(|(k, l, e)| json!({"key": k, "label": l, "expected": e})).collect::<Vec<_>>(),
    })
}

/// A TEST-ONLY operator manifest for a simulated operator id.
pub fn operator_manifest(id: &str) -> Value {
    let op = SimOperator::new(if id.is_empty() { "SIM-A" } else { id });
    let mut m = op.manifest();
    if let Value::Object(map) = &mut m {
        map.insert("marker".into(), json!(SIMB_MARKER));
        map.insert("tool".into(), json!("banza-simb"));
        map.insert("tool_version".into(), json!(TOOL_VERSION));
        map.insert("llm_calls".into(), json!(0));
        map.insert("external_model_called".into(), json!(false));
    }
    m
}

/// A safe federation demo: route A→B, replay (idempotent), net the bilateral obligation. No trust/keys.
pub fn federation_demo() -> Value {
    let mut fed = crate::Federation::new();
    let r = fed.route(5000, "fed-route-1");
    let replay = fed.route(5000, "fed-route-1");
    let net = fed.net_position();
    json!({
        "mode": "demo · test-only",
        "marker": SIMB_MARKER,
        "peers": [fed.a.id, fed.b.id],
        "route": { "ok": r.ok, "transfer_id": r.transfer_id, "amount_minor": 5000 },
        "replay": { "idempotent_replay": replay.idempotent_replay },
        "net_position_minor": net,
        "invariant_checks": [
            {"id": "INV-IDEM-001", "name": "Idempotência de routing", "status": pf(replay.idempotent_replay), "reason": "replay do route não cria nova obrigação"},
            {"id": "INV-RECON-001", "name": "Netting", "status": pf(net == 5000), "reason": "posição líquida == soma das obrigações"}
        ],
        "status": if replay.idempotent_replay && net == 5000 { "PASS" } else { "FAIL" },
        "note": "Simulação de federação test-only — sem operador real, sem fundos, sem rede.",
        "tool": "banza-simb",
        "tool_version": TOOL_VERSION,
        "llm_calls": 0,
        "external_model_called": false,
    })
}

pub fn tool_version() -> Value {
    json!({
        "tool": "banza-simb", "tool_version": TOOL_VERSION, "marker": SIMB_MARKER,
        "test_only": true, "kind": "local operator/federation simulator (deterministic, no funds, no network)"
    })
}
