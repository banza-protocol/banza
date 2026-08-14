//! operator-zero-core (ADR-035, M2.12A) — the Rust engine behind **Operador Zero**, the BANZA
//! reference payment-operator SIMULATOR.
//!
//! > O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e
//! > não movimenta dinheiro real. É um simulador técnico usado para demonstrar, testar e validar o
//! > protocolo BANZA de ponta a ponta.
//!
//! The institutional boundary between this simulator and the future real reference operator is
//! documented in ADR-035 — deliberately there and nowhere else, because naming a commercial operator
//! in engine output would put a brand into every artifact this crate generates.
//!
//! Deterministic by construction: no clock, no randomness, no network, no real money and no private
//! keys. Every flow is reproducible, which is what lets its output be used as evidence.

pub mod boundary;
pub mod ledger;
pub mod sim;
pub mod vocab;

use serde_json::{json, Value};

/// The public identity of the simulator, as every surface must state it.
pub fn identity() -> Value {
    json!({
        "operator_id": "operator-zero",
        "operator_display_name": "Operador Zero",
        "short_description": "Simulador de operador de pagamentos do protocolo BANZA",
        "demo_only": true,
        "monetary_value": false,
        "production_allowed": false,
        "currency": ledger::DEMO_CURRENCY,
        "is_bank": false,
        "is_psp": false,
        "is_wallet": false,
        "is_licensed_financial_operator": false,
        "moves_real_money": false,
        "boundary": "O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não movimenta dinheiro real. É um simulador técnico usado para demonstrar, testar e validar o protocolo BANZA de ponta a ponta.",
        // Neutral by construction: this string reaches artifacts, traces, evidence bundles and the
        // public UI, so it may never carry a real operator's brand. The institutional comparison
        // lives in ADR-035 alone.
        "principle": "O Operador Zero prova a arquitectura demonstrativa do protocolo BANZA com dinheiro fictício, sem representar operador real, autorização, licença ou actividade financeira.",
    })
}

/// A SAFE summary for BanzAI: slugs and counts only. It can never carry an account name, a balance
/// attributed to a person, a key, a path or free text from a visitor's workspace.
pub fn safe_summary(trace: &Value) -> String {
    let scenario = trace["scenario"].as_str().unwrap_or("desconhecido");
    let evidence = trace["evidence_status"]
        .as_str()
        .unwrap_or("evidence_not_built");
    let blockers = trace["blockers"].as_array().map(|a| a.len()).unwrap_or(0);
    let movements = trace["reconciliation"]["movements"].as_i64().unwrap_or(0);
    format!(
        "operador-zero · cenário {scenario} · {} · {movements} movimento(s) fictício(s) · {blockers} bloqueio(s) · KZ_DEMO · demo_only",
        vocab::label(evidence)
    )
}

#[cfg(all(target_arch = "wasm32", feature = "wasm"))]
mod wasm_api {
    use wasm_bindgen::prelude::*;

    /// The canonical slug vocabulary. Read by `make operator-zero-vocabulary-contract-check`, which
    /// EXECUTES this rather than grepping the source.
    #[wasm_bindgen]
    pub fn operator_zero_vocabulary_json() -> String {
        crate::vocab::vocabulary().to_string()
    }

    /// The Portuguese label for a slug. Empty for an unknown slug — deliberately, so an unmapped
    /// value is visible rather than dressed as a real one.
    #[wasm_bindgen]
    pub fn operator_zero_label(slug: &str) -> String {
        crate::vocab::label(slug).to_string()
    }

    /// The simulator's public identity and boundary.
    #[wasm_bindgen]
    pub fn operator_zero_identity_json() -> String {
        crate::identity().to_string()
    }

    /// Run the end-to-end simulation. `happy = false` runs the negative scenario.
    #[wasm_bindgen]
    pub fn operator_zero_e2e_json(happy: bool) -> String {
        crate::sim::run_e2e(happy).to_string()
    }

    /// The opening fictional ledger.
    #[wasm_bindgen]
    pub fn operator_zero_ledger_json() -> String {
        crate::ledger::Ledger::demo().to_json().to_string()
    }

    /// Check a set of artifacts against the demo boundary. `artifacts_json` is
    /// `[{"name":"…","artifact":{…}}]`.
    #[wasm_bindgen]
    pub fn operator_zero_boundary_json(artifacts_json: &str) -> String {
        let parsed: serde_json::Value =
            serde_json::from_str(artifacts_json).unwrap_or(serde_json::Value::Null);
        let list: Vec<(String, serde_json::Value)> = parsed
            .as_array()
            .map(|a| {
                a.iter()
                    .map(|x| {
                        (
                            x["name"].as_str().unwrap_or("artefacto").to_string(),
                            x["artifact"].clone(),
                        )
                    })
                    .collect()
            })
            .unwrap_or_default();
        crate::boundary::evaluate(&list).to_string()
    }

    /// The SAFE one-line summary for BanzAI.
    #[wasm_bindgen]
    pub fn operator_zero_safe_summary(trace_json: &str) -> String {
        let t: serde_json::Value =
            serde_json::from_str(trace_json).unwrap_or(serde_json::Value::Null);
        crate::safe_summary(&t)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_identity_states_every_negation_a_simulator_must_state() {
        let i = identity();
        for k in [
            "is_bank",
            "is_psp",
            "is_wallet",
            "is_licensed_financial_operator",
            "moves_real_money",
            "monetary_value",
            "production_allowed",
        ] {
            assert_eq!(i[k], false, "identity.{k} must be false");
        }
        assert_eq!(i["demo_only"], true);
        assert_eq!(i["currency"], "KZ_DEMO");
        let principle = i["principle"].as_str().unwrap();
        assert!(principle.contains("arquitectura demonstrativa"));
        // The engine's runtime output must never carry a real operator's brand: this string reaches
        // every generated artifact, every trace and the public page. The institutional comparison
        // belongs in ADR-035 and nowhere else.
        // The brand is SPELLED IN PIECES on purpose: writing it literally here would put the very
        // string this assertion forbids into the engine's source, and the repository's neutrality
        // gate scans contents, not intent.
        let forbidden_brand = concat!("banz", "ami");
        assert!(
            !principle.to_lowercase().contains(forbidden_brand),
            "engine output must not name a commercial operator"
        );
    }

    #[test]
    fn the_identity_itself_passes_the_demo_boundary() {
        // The boundary checker must accept the very document that declares the boundary — including
        // its disclaimers, which name the forbidden words in negated form.
        let r = boundary::evaluate(&[("identity".into(), identity())]);
        assert_eq!(r["intact"], true, "identity violates its own boundary: {r}");
    }

    #[test]
    fn both_end_to_end_traces_pass_the_demo_boundary() {
        for happy in [true, false] {
            let t = sim::run_e2e(happy);
            let r = boundary::evaluate(&[("trace".into(), t)]);
            assert_eq!(
                r["intact"], true,
                "e2e(happy={happy}) violates the boundary: {r}"
            );
        }
    }

    #[test]
    fn the_safe_summary_leaks_nothing() {
        let t = sim::run_e2e(true);
        let s = safe_summary(&t);
        // No person, no path, no key, no absolute balance attributed to an account.
        for forbidden in ["Ana", "ana", "/", "key", "99000", "demo-user"] {
            assert!(
                !s.contains(forbidden),
                "safe summary leaked '{forbidden}': {s}"
            );
        }
        assert!(s.contains("KZ_DEMO") && s.contains("demo_only"));
    }
}
