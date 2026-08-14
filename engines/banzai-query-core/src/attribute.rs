//! M2.18B.7 — canonical ATTRIBUTE registry + contextual exact-fact / insufficient-evidence.
//!
//! Exact facts about a canonical entity are answered deterministically (0 model calls) from a typed
//! registry: a value the canonical public documentation DECLARES is confirmed with its source; an
//! attribute the documentation does NOT declare returns a PRECISE contextual message naming the entity
//! and attribute — never inferred, never the generic topic list. Declared values are never inferred from
//! Git history, commit dates, file mtimes, deploy time, the domain, index time or upload time; they are
//! read from the canonical documents (e.g. NOTICE / MAINTAINERS).
//!
//! Scope (M2.18B.7): the BANZA protocol's creation year/date is DECLARED (NOTICE + MAINTAINERS:
//! 01/08/2025) — answered as an exact fact, consistent with the `protocol-origin` provenance entry. The
//! protocol version is NOT declared as a single value (the protocol is defined by its ADRs/RFCs/specs) —
//! answered as a precise NOT_DECLARED message. Pure, total, deterministic; no model, no I/O.

use crate::normalize;
use crate::reason::ReasonCode;
use serde::Serialize;

/// Declaration status of a canonical attribute (spec §1).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttributeStatus {
    Declared,
    NotDeclared,
    Conflicted,
    NotApplicable,
}

impl AttributeStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AttributeStatus::Declared => "DECLARED",
            AttributeStatus::NotDeclared => "NOT_DECLARED",
            AttributeStatus::Conflicted => "CONFLICTED",
            AttributeStatus::NotApplicable => "NOT_APPLICABLE",
        }
    }
}

/// The deterministic answer to an attribute question (serialised across the WASM boundary).
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AttributeAnswer {
    pub matched: bool,
    pub entity_id: String,
    pub attribute_id: String,
    pub status: String,
    pub answer: String,
    pub reason_code: String,
    /// Present for DECLARED attributes (the canonical document id); empty otherwise.
    pub source_id: String,
}

impl AttributeAnswer {
    fn none() -> Self {
        AttributeAnswer {
            matched: false,
            entity_id: String::new(),
            attribute_id: String::new(),
            status: String::new(),
            answer: String::new(),
            reason_code: String::new(),
            source_id: String::new(),
        }
    }
}

/// A covered ecosystem entity: (canonical entity id, display name used in the message).
fn detect_entity(nq: &str) -> Option<(&'static str, &'static str)> {
    // Order matters: "banzami" and "banzai" both contain "banza"; check the longer names first.
    if nq.contains("banzami") {
        return Some(("banzami", "a Banzami"));
    }
    if nq.contains("banzai") || nq.contains("banz ai") {
        return Some(("banzai", "o BanzAI"));
    }
    if nq.contains("banza") || nq.contains("protocolo") {
        return Some(("banza", "o BANZA"));
    }
    None
}

/// True when the normalized query asks for a CREATION date/year (PT/EN, accent-free after normalize).
/// Deliberately narrow — a definition/explanation ("o que é o BANZA?", "como funciona?") must NOT match.
fn asks_creation_date(nq: &str) -> bool {
    let has = |needles: &[&str]| needles.iter().any(|n| nq.contains(n));
    let quando_created = nq.contains("quando")
        && has(&[
            "criad", "fundad", "lancad", "lançad", "surgiu", "nasceu", "comecou", "começou",
            "created", "founded", "launched", "started",
        ]);
    let noun_created = has(&["ano", "data", "year", "date"])
        && has(&[
            "criac",
            "criaç",
            "fundac",
            "fundaç",
            "nasciment",
            "lancament",
            "lançament",
            "creation",
            "founding",
            "foundation",
            "inception",
        ]);
    let em_que_ano =
        nq.contains("em que ano") || nq.contains("in what year") || nq.contains("what year");
    quando_created || noun_created || em_que_ano
}

/// True when the normalized query asks for the protocol VERSION.
fn asks_version(nq: &str) -> bool {
    (nq.contains("versao") || nq.contains("versão") || nq.contains("version"))
        // exclude API/schema/OpenAPI/QR "compatible version" phrasings — those are different facts.
        && !nq.contains("api")
        && !nq.contains("schema")
        && !nq.contains("openapi")
        && !nq.contains("qr")
}

/// Resolve an attribute question to a deterministic answer, or None when it is not an attribute question
/// this registry owns (the caller then continues to normal grounding).
pub fn resolve_attribute_query(question: &str) -> Option<AttributeAnswer> {
    let nq = normalize(question);
    let (entity_id, display) = detect_entity(&nq)?;

    // Creation date/year — DECLARED for the BANZA protocol (NOTICE + MAINTAINERS: 01/08/2025). Answered
    // as an exact fact citing NOTICE, consistent with the protocol-origin provenance entry. For BanzAI /
    // Banzami there is no separate declared creation date, so defer to normal grounding (return None)
    // rather than assert a value.
    if asks_creation_date(&nq) {
        if entity_id == "banza" {
            return Some(AttributeAnswer {
                matched: true,
                entity_id: entity_id.to_string(),
                attribute_id: "creation_date".to_string(),
                status: AttributeStatus::Declared.as_str().to_string(),
                answer:
                    "O **BANZA** foi criado em **01/08/2025 (1 de agosto de 2025)** — a data de \
criação / disponibilização inicial declarada no NOTICE e no MAINTAINERS. É a origem histórica do \
protocolo, não uma data de produção, certificação ou autorização."
                        .to_string(),
                reason_code: ReasonCode::ExactFactConfirmed.as_str().to_string(),
                source_id: "NOTICE".to_string(),
            });
        }
        return None;
    }

    // Protocol version — DECLARED. This attribute answered NOT_DECLARED for as long as it was true: the
    // protocol was defined by its records and pinned no single value. It is now declared as
    // `protocol_version` in the normative manifest — the index of the whole normative surface — so the
    // honest answer inverted. Live QA still received the old one, which tells an implementer there is
    // nothing to pin against, in the one place where pinning is the whole point.
    //
    // Only the protocol has a declared version. BanzAI and Banzami do not, and asserting one for them
    // would repeat the original error in the opposite direction.
    if asks_version(&nq) {
        if entity_id == "banza" {
            return Some(AttributeAnswer {
                matched: true,
                entity_id: entity_id.to_string(),
                attribute_id: "version".to_string(),
                status: AttributeStatus::Declared.as_str().to_string(),
                answer:
                    "A versão do protocolo **BANZA** é **1.0.0** — o valor de `protocol_version` \
declarado no manifesto normativo (`contracts/production/normative-manifest.json`), que indexa toda a \
superfície normativa. É a versão do **protocolo**, distinta de qualquer versão de release de uma \
implementação ou serviço."
                        .to_string(),
                reason_code: ReasonCode::ExactFactConfirmed.as_str().to_string(),
                source_id: "normative-manifest".to_string(),
            });
        }
        // "para {display}" avoids the de+o/de+a contraction (never write "de o BANZA"); the display
        // strings carry their own article ("o BanzAI" / "a Banzami").
        let answer = format!(
            "A documentação pública canónica não declara uma versão única para {display}. \
A versão **1.0.0** é do **protocolo BANZA**, não desta camada.",
            display = display
        );
        return Some(AttributeAnswer {
            matched: true,
            entity_id: entity_id.to_string(),
            attribute_id: "version".to_string(),
            status: AttributeStatus::NotDeclared.as_str().to_string(),
            answer,
            reason_code: ReasonCode::AttributeNotDeclared.as_str().to_string(),
            source_id: String::new(),
        });
    }

    None
}

/// JSON for the WASM boundary: the AttributeAnswer, or `{"matched":false,...}` when not owned here.
pub fn resolve_attribute_query_json(question: &str) -> String {
    let ans = resolve_attribute_query(question).unwrap_or_else(AttributeAnswer::none);
    serde_json::to_string(&ans).unwrap_or_else(|_| "{\"matched\":false}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creation_of_banza_is_declared_from_notice() {
        for q in [
            "ano de criação do banza",
            "ano de criacao do banza",
            "qual o ano de criação do BANZA?",
            "em que ano foi criado o BANZA?",
            "quando foi criado o BANZA?",
            "data de criação do protocolo",
        ] {
            let a = resolve_attribute_query(q).unwrap_or_else(|| panic!("{q} must resolve"));
            assert_eq!(a.entity_id, "banza", "{q}");
            assert_eq!(a.status, "DECLARED", "{q}");
            assert_eq!(a.reason_code, "EXACT_FACT_CONFIRMED", "{q}");
            assert_eq!(a.source_id, "NOTICE", "{q}");
            assert!(a.answer.contains("2025"), "{q}: states the declared date");
            assert!(
                !a.answer.contains("manifest (e exemplos)"),
                "{q}: never the generic list"
            );
        }
    }

    #[test]
    fn protocol_version_is_declared_as_one_point_zero() {
        for q in [
            "qual a versão do BANZA?",
            "qual é a versão do protocolo BANZA?",
            "what is the BANZA protocol version?",
        ] {
            let a = resolve_attribute_query(q).unwrap();
            assert_eq!(a.entity_id, "banza", "{q}");
            assert_eq!(a.status, "DECLARED", "{q}");
            assert_eq!(a.reason_code, "EXACT_FACT_CONFIRMED", "{q}");
            assert!(
                a.answer.contains("1.0.0"),
                "{q}: states the declared version"
            );
            assert!(
                a.answer.contains("normative-manifest.json"),
                "{q}: cites where it is declared"
            );
            assert!(
                !a.answer.contains("não declara"),
                "{q}: the old NOT_DECLARED message must not survive"
            );
        }
    }

    #[test]
    fn only_the_protocol_has_a_declared_version() {
        // BanzAI and Banzami declare none, and the answer must not let 1.0.0 leak onto them.
        for q in ["qual a versão do BanzAI?", "qual a versão da Banzami?"] {
            let a = resolve_attribute_query(q).unwrap();
            assert_eq!(a.status, "NOT_DECLARED", "{q}");
            assert!(a.answer.contains("não declara"), "{q}");
            assert!(
                !a.answer
                    .contains("A versão do protocolo **BANZA** é **1.0.0**"),
                "{q}: must not assert a version for this layer"
            );
        }
    }

    #[test]
    fn definitions_and_explanations_do_not_match() {
        for q in [
            "o que é o BANZA?",
            "fala-me sobre o BANZA",
            "como funciona o BANZA?",
            "para que serve o BANZA?",
            "qual a licença do BANZA?",
        ] {
            assert!(
                resolve_attribute_query(q).is_none(),
                "{q} must NOT be an attribute query"
            );
        }
    }
}
