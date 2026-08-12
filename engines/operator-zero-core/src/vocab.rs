//! The canonical vocabulary of every slug this simulator can emit.
//!
//! M2.11B and M2.11D were both the same defect: TypeScript comparing or labelling a string the Rust
//! engine does not emit, with both sides self-consistent so every test passed. Operador Zero starts
//! with the contract instead of acquiring one after the second incident — Rust owns these words
//! (ADR-037), Rust publishes them, and `make operator-zero-vocabulary-contract-check` proves every
//! one has a UI representation and that the UI compares nothing else.
//!
//! The rule for what belongs here: **only values the engine can actually emit.** Publishing an
//! unreachable value forces a filler label into the UI, and filler labels are indistinguishable from
//! real ones — that is how a contract becomes busywork.

use serde_json::{json, Value};

/// The state of a simulated payment.
pub const PAYMENT_STATUS: &[&str] = &[
    "pending",
    "confirmed",
    "refunded",
    "partially_refunded",
    "failed",
    "expired",
];

/// The state of the fictional ledger after an operation.
pub const LEDGER_STATUS: &[&str] = &["balanced", "unbalanced", "empty"];

/// The verdict of a fictional reconciliation run.
pub const RECONCILIATION_STATUS: &[&str] = &["reconciled", "discrepancy", "not_run"];

/// The demo trust verdict. Deliberately NOT the protocol's TRUST_* vocabulary — a demo root must
/// never be mistakable for the protocol trust root, in code or on screen.
pub const TRUST_STATUS: &[&str] = &[
    "demo_trust_valid",
    "demo_trust_revoked",
    "demo_trust_invalid_signature",
    "demo_trust_missing_key_manifest",
    "demo_trust_fail_closed",
];

/// The demo federation verdict.
pub const FEDERATION_STATUS: &[&str] = &[
    "demo_federation_compatible",
    "demo_federation_incompatible",
    "demo_federation_peer_unreachable",
    "demo_federation_not_run",
];

/// The state of the simulated evidence bundle.
pub const EVIDENCE_STATUS: &[&str] = &[
    "evidence_complete",
    "evidence_partial",
    "evidence_invalid",
    "evidence_not_built",
];

/// Why a simulated operation failed. Every controlled failure the simulator can produce.
pub const SIMULATION_ERROR_CODE: &[&str] = &[
    "insufficient_balance",
    "qr_expired",
    "invalid_signature",
    "operator_revoked",
    "incompatible_endpoint",
    "unknown_account",
    "amount_not_positive",
    "currency_not_demo",
    "manifest_invalid",
    "secret_detected",
];

/// What the simulator suggests doing next.
pub const NEXT_ACTION: &[&str] = &[
    "carregar_template",
    "validar_manifest",
    "corrigir_manifest",
    "executar_conformidade",
    "avaliar_trust_demo",
    "simular_pagamento",
    "simular_federacao",
    "gerar_evidence_bundle",
    "gerar_trace",
    "simulacao_completa",
];

/// The kinds of artifact the simulator publishes.
pub const ARTIFACT_TYPE: &[&str] = &[
    "manifest",
    "ledger",
    "payment",
    "key_manifest",
    "revocation_list",
    "conformance_evidence",
    "trust_evidence",
    "federation_metadata",
    "evidence_bundle",
    "trace",
];

/// The demo boundary check — the one that must never read "ok" for the wrong reason.
pub const DEMO_BOUNDARY_STATUS: &[&str] = &[
    "demo_boundary_intact",
    "demo_boundary_missing_flag",
    "demo_boundary_real_currency",
    "demo_boundary_production_allowed",
    "demo_boundary_secret_present",
    "demo_boundary_status_claim",
];

/// Everything above, as one JSON document. The guard reads this by EXECUTING the engine.
pub fn vocabulary() -> Value {
    json!({
        "payment_status": PAYMENT_STATUS,
        "ledger_status": LEDGER_STATUS,
        "reconciliation_status": RECONCILIATION_STATUS,
        "trust_status": TRUST_STATUS,
        "federation_status": FEDERATION_STATUS,
        "evidence_status": EVIDENCE_STATUS,
        "simulation_error_code": SIMULATION_ERROR_CODE,
        "next_action": NEXT_ACTION,
        "artifact_type": ARTIFACT_TYPE,
        "demo_boundary_status": DEMO_BOUNDARY_STATUS,
    })
}

/// The Portuguese label for every slug, owned here so the wording cannot drift per surface.
/// A slug with no label is a build failure by way of the contract guard, not a silent "—".
pub fn label(slug: &str) -> &'static str {
    match slug {
        // payment_status
        "pending" => "pendente",
        "confirmed" => "confirmado",
        "refunded" => "reembolsado",
        "partially_refunded" => "parcialmente reembolsado",
        "failed" => "falhou",
        "expired" => "expirado",
        // ledger_status
        "balanced" => "saldos conservados",
        "unbalanced" => "saldos não conservados",
        "empty" => "sem movimentos",
        // reconciliation_status
        "reconciled" => "reconciliado",
        "discrepancy" => "discrepância",
        "not_run" => "não executado",
        // trust_status (demo)
        "demo_trust_valid" => "trust demo válido",
        "demo_trust_revoked" => "chave demo revogada",
        "demo_trust_invalid_signature" => "assinatura demo inválida",
        "demo_trust_missing_key_manifest" => "key manifest demo em falta",
        "demo_trust_fail_closed" => "trust demo fechado por omissão",
        // federation_status (demo)
        "demo_federation_compatible" => "federação demo compatível",
        "demo_federation_incompatible" => "federação demo incompatível",
        "demo_federation_peer_unreachable" => "peer demo inacessível",
        "demo_federation_not_run" => "federação demo não executada",
        // evidence_status
        "evidence_complete" => "evidência completa",
        "evidence_partial" => "evidência parcial",
        "evidence_invalid" => "evidência inválida",
        "evidence_not_built" => "evidência não gerada",
        // simulation_error_code
        "insufficient_balance" => "saldo fictício insuficiente",
        "qr_expired" => "QR expirado",
        "invalid_signature" => "assinatura inválida",
        "operator_revoked" => "operador demo revogado",
        "incompatible_endpoint" => "endpoint incompatível",
        "unknown_account" => "conta fictícia desconhecida",
        "amount_not_positive" => "montante não positivo",
        "currency_not_demo" => "moeda não é KZ_DEMO",
        "manifest_invalid" => "manifest inválido",
        "secret_detected" => "segredo detectado no artefacto",
        // next_action
        "carregar_template" => "Carregar o Operador Zero",
        "validar_manifest" => "Validar o manifest",
        "corrigir_manifest" => "Corrigir o manifest",
        "executar_conformidade" => "Executar a conformidade",
        "avaliar_trust_demo" => "Avaliar o trust demo",
        "simular_pagamento" => "Simular um pagamento",
        "simular_federacao" => "Simular a federação",
        "gerar_evidence_bundle" => "Gerar o evidence bundle",
        "gerar_trace" => "Gerar o trace",
        "simulacao_completa" => "Simulação completa",
        // artifact_type
        "manifest" => "manifest",
        "ledger" => "ledger fictício",
        "payment" => "pagamento fictício",
        "key_manifest" => "key manifest demo",
        "revocation_list" => "lista de revogação demo",
        "conformance_evidence" => "evidência de conformidade",
        "trust_evidence" => "evidência de trust demo",
        "federation_metadata" => "metadata de federação demo",
        "evidence_bundle" => "evidence bundle",
        "trace" => "trace",
        // demo_boundary_status
        "demo_boundary_intact" => "fronteira demo intacta",
        "demo_boundary_missing_flag" => "falta a marcação demo_only",
        "demo_boundary_real_currency" => "moeda real detectada",
        "demo_boundary_production_allowed" => "production_allowed indevido",
        "demo_boundary_secret_present" => "segredo presente no artefacto",
        "demo_boundary_status_claim" => "afirmação de estatuto proibida",
        _ => "",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn all_slugs() -> Vec<&'static str> {
        let mut v = Vec::new();
        for g in [
            PAYMENT_STATUS,
            LEDGER_STATUS,
            RECONCILIATION_STATUS,
            TRUST_STATUS,
            FEDERATION_STATUS,
            EVIDENCE_STATUS,
            SIMULATION_ERROR_CODE,
            NEXT_ACTION,
            ARTIFACT_TYPE,
            DEMO_BOUNDARY_STATUS,
        ] {
            v.extend_from_slice(g);
        }
        v
    }

    #[test]
    fn every_published_slug_has_a_portuguese_label() {
        for s in all_slugs() {
            assert!(!label(s).is_empty(), "slug '{s}' has no label");
        }
    }

    #[test]
    fn an_unknown_slug_returns_empty_so_the_guard_can_see_it() {
        // The label map must NOT invent a friendly default. A silent "—" is how an unmapped value
        // reaches a visitor looking like a real one.
        assert_eq!(label("something_a_future_engine_emits"), "");
    }

    #[test]
    fn the_vocabulary_document_contains_every_group() {
        let v = vocabulary();
        for key in [
            "payment_status",
            "ledger_status",
            "reconciliation_status",
            "trust_status",
            "federation_status",
            "evidence_status",
            "simulation_error_code",
            "next_action",
            "artifact_type",
            "demo_boundary_status",
        ] {
            assert!(
                v[key].as_array().map(|a| !a.is_empty()).unwrap_or(false),
                "vocabulary is missing '{key}'"
            );
        }
    }

    #[test]
    fn the_demo_trust_vocabulary_cannot_be_confused_with_the_protocol_trust_root() {
        // The protocol emits TRUST_VALID / TRUST_REVOKED / … . A demo verdict that shared those
        // words could be screenshotted as a protocol trust result.
        for s in TRUST_STATUS {
            assert!(
                s.starts_with("demo_"),
                "demo trust slug '{s}' must be demo-marked"
            );
            assert!(
                !s.starts_with("TRUST_"),
                "'{s}' collides with the protocol vocabulary"
            );
        }
        for s in FEDERATION_STATUS {
            assert!(
                s.starts_with("demo_"),
                "demo federation slug '{s}' must be demo-marked"
            );
        }
    }

    #[test]
    fn no_slug_or_label_claims_certification_or_authorisation() {
        let forbidden = [
            "certificad",
            "aprovad",
            "licenciad",
            "autorizad",
            "aceite",
            "certified",
            "approved",
        ];
        for s in all_slugs() {
            let joined = format!("{s} {}", label(s)).to_lowercase();
            for f in forbidden {
                assert!(
                    !joined.contains(f),
                    "slug/label '{s}' claims status ('{f}') — a simulator may never"
                );
            }
        }
    }
}
