//! banza-conformance Workbench tool layer (BX1.3).
//!
//! Runs an **L0 demo against banza-simb** in-process and produces an L0 `ConformanceReport`-shaped
//! envelope. The technical PASS/FAIL is derived from the canonical BANZA invariant checker
//! (`banza_simb::scenario::check_bundle`, exercised via `run_scenario`) — computed in Rust, never in
//! TypeScript. L1–L4 are described as requirements/future phases; this layer never fakes their
//! execution, never emits a certificate, never adds an operator, never activates M2/M3.
//!
//! PASS is technical conformance evidence, not production certification.

use crate::canonical_profiles;
use crate::{CERTIFICATION_DISCLAIMER, PROTOCOL_VERSION, RUNNER, RUNNER_VERSION};
use serde_json::{json, Value};

const DISCLAIMER_PT: &str =
    "PASS técnico é evidência de conformidade, não é certificação. A certificação de produção depende \
     da cerimónia offline da chave raiz e da primeira evidência de conformidade de produção publicada; \
     nenhuma implementação tem evidência de conformidade de produção activa.";

/// SimB Pre-Review Gate (BX1.4): readiness is technical evidence, not an approval — nobody approves operators.
const READY_DISCLAIMER: &str = "Readiness is verifiable conformance evidence, not an approval.";

/// The SimB pre-review status of a run: its own `pre_review_status`, else derived from its `status`.
fn simb_pre_review_status(run: &Value) -> String {
    if let Some(s) = run.get("pre_review_status").and_then(|x| x.as_str()) {
        return s.to_string();
    }
    match run.get("status").and_then(|x| x.as_str()) {
        Some("PASS") => "SIMB_PRE_REVIEW_PASS".into(),
        Some("FAIL") => "SIMB_PRE_REVIEW_FAIL".into(),
        _ => "SIMB_PRE_REVIEW_INCOMPLETE".into(),
    }
}

/// Obtain a SimB run: either a run object passed from the SimB tab (`input.run`) or a scenario key
/// (`input.scenario`) which we execute against a fresh SimB operator.
fn resolve_run(input: &Value) -> Value {
    if let Some(run) = input.get("run") {
        if run.is_object() {
            return run.clone();
        }
    }
    let key = input
        .get("scenario")
        .and_then(|x| x.as_str())
        .unwrap_or("valid_l0");
    banza_simb::scenario::run_scenario(key)
}

/// Run the L0 conformance demo against SimB. `input = { scenario?: key, run?: <simb run> }`.
pub fn run_l0_demo(input: &Value) -> Value {
    let run = resolve_run(input);
    let checks = run
        .get("invariant_checks")
        .and_then(|x| x.as_array())
        .cloned()
        .unwrap_or_default();

    // Fail-closed: a run with no invariant evidence cannot be declared conformant.
    if checks.is_empty() {
        return json!({
            "level": "L0", "mode": "demo-simb", "status": "FAIL",
            "runner": RUNNER, "runner_version": RUNNER_VERSION, "protocol_version": PROTOCOL_VERSION,
            "tool": RUNNER, "tool_version": RUNNER_VERSION,
            "report_id": "l0-empty-FAIL",
            "totals": {"total": 0, "pass": 0, "fail": 1},
            "cases": [], "invariants": [],
            "failures": ["a execução SimB não produziu invariantes verificáveis (fail-closed)"],
            "evidence": [],
            "pre_review_gate": true,
            "simb_pre_review_status": simb_pre_review_status(&run),
            "ready_for_conformance_evidence_review": false,
            "ready_disclaimer": READY_DISCLAIMER,
            "certification_disclaimer": CERTIFICATION_DISCLAIMER, "disclaimer_pt": DISCLAIMER_PT,
            "test_only": true, "llm_calls": 0, "external_model_called": false,
        });
    }

    let mut cases = Vec::new();
    let mut failures = Vec::new();
    let (mut pass, mut fail) = (0usize, 0usize);
    for c in &checks {
        let id = c.get("id").and_then(|x| x.as_str()).unwrap_or("INV-?");
        let reason = c.get("reason").and_then(|x| x.as_str()).unwrap_or("");
        let ok = c.get("status").and_then(|x| x.as_str()) == Some("PASS");
        if ok {
            pass += 1;
        } else {
            fail += 1;
            failures.push(format!("{id}: {reason}"));
        }
        cases.push(json!({
            "case_id": format!("L0-{id}"),
            "invariant_id": id,
            "status": if ok { "PASS" } else { "FAIL" },
            "reason": reason,
        }));
    }
    let status = if fail == 0 { "PASS" } else { "FAIL" };
    // SimB Pre-Review Gate: L0 conformance runs against SimB; readiness requires SimB PASS + L0 PASS.
    let simb_pre = simb_pre_review_status(&run);
    let ready = simb_pre == "SIMB_PRE_REVIEW_PASS" && status == "PASS";
    let scenario_id = run
        .get("scenario_id")
        .and_then(|x| x.as_str())
        .unwrap_or("run");
    let operator_id = run
        .get("operator_id")
        .and_then(|x| x.as_str())
        .unwrap_or("SIM-A");
    let ledger_n = run
        .get("ledger_entries")
        .and_then(|x| x.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    let mut evidence = vec![
        format!("simb-scenario:{scenario_id}"),
        format!("operator:{operator_id} (test-only)"),
        format!("ledger_entries:{ledger_n}"),
    ];
    if let Some(f) = run.get("injected_fault").and_then(|x| x.as_str()) {
        evidence.push(format!("injected_fault:{f}"));
    }

    json!({
        "level": "L0",
        "mode": "demo-simb",
        "status": status,
        "runner": RUNNER,
        "runner_version": RUNNER_VERSION,
        "protocol_version": PROTOCOL_VERSION,
        "tool": RUNNER,
        "tool_version": RUNNER_VERSION,
        "scenario_id": scenario_id,
        "operator_id": operator_id,
        "report_id": format!("l0-{scenario_id}-{status}"),
        "totals": {"total": pass + fail, "pass": pass, "fail": fail},
        "cases": cases,
        "invariants": checks,
        "failures": failures,
        "evidence": evidence,
        "injected_fault": run.get("injected_fault").cloned().unwrap_or(Value::Null),
        "pre_review_gate": true,
        "simb_pre_review_status": simb_pre,
        "ready_for_conformance_evidence_review": ready,
        "ready_disclaimer": READY_DISCLAIMER,
        "certification_disclaimer": CERTIFICATION_DISCLAIMER,
        "disclaimer_pt": DISCLAIMER_PT,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    })
}

/// Validate a conformance report JSON (fields + disclaimer + no forbidden certification claim) and
/// echo the verdict DERIVED FROM ITS OWN TOTALS. The overall `status` is computed here from the real
/// `totals` the report carries — PASS only when there are zero failing and zero errored cases — never
/// trusting a self-declared `status` field and never forcing green. The downstream verdict mapper
/// (banza-target-registry) reads this `status`, so a validated report with clean totals maps to
/// VERIFIED and any failing/errored total maps to FAIL. `reason` records how the status was reached.
pub fn validate_report_tool(json_str: &str) -> Value {
    match crate::validate_report(json_str) {
        Ok(()) => {
            let report: Value = serde_json::from_str(json_str).unwrap_or(Value::Null);
            let totals = report.get("totals");
            let count = |k: &str| {
                totals
                    .and_then(|t| t.get(k))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0)
            };
            let fail = count("fail");
            let error = count("error");
            let (status, reason) = if fail == 0 && error == 0 {
                (
                    "PASS",
                    format!("totals.fail={fail} totals.error={error} — derived PASS"),
                )
            } else {
                (
                    "FAIL",
                    format!("totals.fail={fail} totals.error={error} — derived FAIL"),
                )
            };
            json!({
                "ok": true,
                "status": status,
                "reason": reason,
                "totals": totals.cloned().unwrap_or(Value::Null),
                "tool": RUNNER,
                "tool_version": RUNNER_VERSION,
            })
        }
        Err(e) => json!({"ok": false, "error": e, "tool": RUNNER, "tool_version": RUNNER_VERSION}),
    }
}

/// The L0 demo fixtures (from the SimB scenarios) for the UI source selector.
pub fn demo_fixtures() -> Value {
    let fixtures: Vec<Value> = banza_simb::scenario::SCENARIOS
        .iter()
        .map(|(k, label, expected)| {
            json!({
                "key": k,
                "label": label,
                "expected": if *k == "valid_l0" { "PASS" } else { "FAIL" },
                "note": expected,
            })
        })
        .collect();
    json!({
        "note": "TEST ONLY — NOT PRODUCTION",
        "level": "L0",
        "fixtures": fixtures,
    })
}

/// Level information: L0 is runnable (demo against SimB); L1–L4 are requirements/future phases.
/// The UI shows L1–L4 requirements WITHOUT a run button — this never fakes their execution.
///
/// The profile NAME is never written here. It comes from `canonical_profiles`, which is derived
/// from the normative registry, because a second hand-maintained table drifts: this function once
/// carried L4 as "Produção certificada" while the registry said "External Interoperability" —
/// a technical capability presented as a production certification.
///
/// Name, runnability and status are three separate fields on purpose. A profile is a technical
/// capability; whether the demo runner can execute it is an engine fact; and neither is a
/// certification state, an operational status or a regulatory permission
/// (docs/governance/certification-boundary.md).
pub fn levels_info() -> Value {
    // Per level: runnable by the sandbox runner, current status, and what it asks for. Names are
    // resolved from the canonical vocabulary below — never spelled out here.
    let rows: [(&str, bool, &str, &[&str]); 5] = [
        (
            "L0",
            true,
            "executável (demo contra SimB)",
            &[
                "double-entry (INV-LEDGER-001)",
                "idempotência (INV-IDEM-001)",
                "identidade de settlement (INV-SETTLE-001)",
                "sem saldo negativo (INV-WALLET-001)",
            ],
        ),
        (
            "L1",
            false,
            "requer operador live — fase futura",
            &[
                "endpoints live do operador",
                "health + transferência + idempotência reais",
            ],
        ),
        (
            "L2",
            false,
            "fase futura",
            &[
                "settlement batches reais",
                "reconciliação externa (INV-RECON)",
            ],
        ),
        (
            "L3",
            false,
            "fase futura",
            &[
                "peer certificado + BRL (banza-trust)",
                "routing federado real",
            ],
        ),
        (
            "L4",
            false,
            "definido por perfil externo — nenhum perfil externo publicado",
            &[
                "perfil de interoperabilidade externa publicado",
                "evidência verificável de conformidade",
            ],
        ),
    ];
    let levels: Vec<Value> = rows
        .iter()
        .map(|(level, runnable, status, requirements)| {
            json!({
                "level": level,
                // Fails loudly rather than inventing a label: an identifier the registry does not
                // define is not a profile, and guessing one would recreate the drift.
                "name": canonical_profiles::canonical_name(level)
                    .unwrap_or_else(|| panic!("{level} is not a profile in the canonical registry")),
                "runnable": runnable,
                "status": status,
                "requirements": requirements,
            })
        })
        .collect();
    json!({
        "levels": levels,
        "note": "Nesta fase apenas L0 corre como demo contra SimB. L1–L4 são requisitos/fases futuras — não executam e não certificam. Um perfil é capacidade técnica: não é certificação, admissão operacional, autorização regulatória nem aprovação para produção.",
        "profile_vocabulary_source": "contracts/production/conformance-profiles.production.json",
        "tool": RUNNER, "tool_version": RUNNER_VERSION,
    })
}

pub fn tool_version() -> Value {
    json!({
        "tool": RUNNER, "tool_version": RUNNER_VERSION, "protocol_version": PROTOCOL_VERSION,
        "scope": "L0 demo against banza-simb (offline, deterministic, no operator, no network)",
        "test_only": true,
    })
}
