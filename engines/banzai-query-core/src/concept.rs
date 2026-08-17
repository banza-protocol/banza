//! M2.18B.4 — the concept → canonical-source resolver.
//!
//! Broad conceptual questions ("o que é a dupla entrada?", "como funciona a idempotência?") name a
//! protocol concept, not a document id. The generic concept-path retrieval scores them weakly (a short
//! query rarely reaches the term-overlap threshold), so the FactualPackage came back empty and the
//! explanatory trunk had nothing to synthesize from. This module maps a concept to the CANONICAL document
//! that defines it — a real registry ADR/RFC, verified to resolve — so the trunk grounds the explanation on
//! that source (exact-source, source-bound). It NEVER invents a definition: it only points a concept at the
//! canonical record that already defines it. Canonical sources are FIRST-CLASS of every public type: a
//! concept maps to a registry ADR/RFC id (double-entry→ADR-012, federation→ADR-025, revocation→ADR-025) OR
//! to a public Reference/spec/governance document PATH (governance→docs/reference/PROTOCOL_GOVERNANCE_
//! GLOSSARY.md, manifest→docs/reference/manifesto.md, conformance-evidence→spec/federation/…) — never forced
//! into an artificial ADR. A truly unmapped concept returns None and keeps corpus retrieval.
//!
//! Pure + total: alias match over the normalized query; no model, no I/O.

use crate::normalize;

/// (canonical_doc_id, aliases). Aliases are normalized substrings (accent-free, lowercase) matched against
/// the normalized query. Ordered most-specific first so a multi-word alias wins over a bare token.
const CONCEPTS: &[(&str, &[&str])] = &[
    (
        "ADR-012",
        &[
            "dupla entrada",
            "double entry",
            "double-entry",
            "partida dobrada",
            "debito e credito",
            "debito credito",
            "precisao monetaria",
        ],
    ),
    (
        "ADR-012",
        &[
            "invariante de dupla entrada",
            "invariante financeiro",
            "financial invariant",
            "enforcement da dupla entrada",
        ],
    ),
    (
        "ADR-022",
        &[
            "idempotencia",
            "idempotency",
            "idempotente",
            "chave de idempotencia",
            "rate limit",
            "limitacao de taxa",
        ],
    ),
    (
        "ADR-015",
        &[
            "pagamento qr",
            "codigo qr",
            "qr code",
            "pagamento por qr",
            "qr payment",
        ],
    ),
    (
        "ADR-015",
        &[
            "payment link",
            "payment links",
            "link de pagamento",
            "links de pagamento",
            "url de pagamento",
        ],
    ),
    (
        "ADR-014",
        &[
            "identidade da carteira",
            "wallet native",
            "wallet-native",
            "identidade nativa",
            "modelo de conta",
            "account identity",
            "identidade do participante",
        ],
    ),
    ("ADR-035", &["operador de referencia", "reference operator"]),
    (
        "ADR-002",
        &[
            "autoridade sobre operadores",
            "autoridade sobre os operadores",
            "authority over operators",
            "quem controla os operadores",
            "quem controla o operador",
            "who controls operators",
            "controla os operadores",
            "control operators",
            "controlo dos operadores",
            "operador e implementacao",
            "operator and implementation",
            "operador vs implementacao",
            "separacao de operadores",
            "separacao operador",
            "separacao entre protocolo e operador",
            "separacao entre o protocolo e o operador",
            "protocolo operador",
            "operator separation",
            "protocol operator separation",
            // M2.18B.4-R2 — the operator DEFINITION itself ("o que é um operador?") had no canonical
            // anchor, so the concept gate declined it even though ADR-002 defines the operator↔protocol
            // boundary. Precise multi-word aliases only (never the bare token "operador", which would
            // shadow federation/manifesto/reference-operator questions); longest-alias wins keeps
            // "operador de referencia" (ADR-035) and "manifesto de operador" ahead of these.
            "que e um operador",
            "um operador no protocolo",
            "papel do operador",
            "papel de um operador",
            "funcao do operador",
            "o que faz um operador",
            "what is an operator",
            "operator role",
        ],
    ),
    (
        "ADR-001",
        &[
            "protocolo aberto",
            "open financial protocol",
            "protocolo financeiro aberto",
            "independencia de implementacao",
        ],
    ),
    // ── M2.18B.4 — concepts whose canonical source is a real ADR (not forced) ─────────────────────
    (
        "ADR-025",
        &[
            "revogacao",
            "revocation",
            "revoga",
            "revogar",
            "lista de revogacao",
            "revocation list",
        ],
    ),
    (
        // ADR-025 is FEDERATION (trust evaluation). The generic "trust model" is NOT a single-document
        // concept: in BANZA the open trust model spans several records (federation, key revocation, the
        // evidence model), so pinning "modelo de confiança" to ADR-025 alone gave the output pass too few
        // facts — it then either over-reached to other ADRs (validator-rejected) or honestly declined
        // (M2.18B.4-R2). Keep only the FEDERATION aliases here; a trust-model question carries an
        // explanatory cue, so it reaches the trunk anyway and grounds on broad corpus retrieval (proven to
        // publish, cites the Reference).
        "ADR-025",
        &["federacao", "federation", "federar", "confianca federada"],
    ),
    (
        "ADR-030",
        &[
            "nivel de conformidade",
            "conformance level",
            "conformidade",
            "conformance",
            "suite de conformidade",
        ],
    ),
    (
        "ADR-031",
        &[
            "auto publicacao",
            "self publication",
            "self-publication",
            "operador publica",
            "operator self publication",
        ],
    ),
    // ── M2.18B.4 — concepts whose canonical source is a public Reference/spec/governance document.
    // Non-ADR canonical sources are FIRST-CLASS: build_factual_package grounds on the doc-index chunks
    // for the path exactly as it does for a registry ADR/RFC.
    (
        "docs/reference/manifesto.md",
        &[
            "manifesto de operador",
            "operator manifest",
            "manifesto",
            "manifest de operador",
        ],
    ),
    (
        "docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md",
        &[
            "governanca",
            "governance",
            "como e governado",
            "quem governa",
            "processo de governanca",
            "governado o protocolo",
        ],
    ),
    (
        "spec/federation/FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md",
        &[
            "evidencia de conformidade",
            "conformance evidence",
            "pacote de evidencia",
            "modelo de evidencia",
        ],
    ),
    // ── M2.19C — the three-layer institutional architecture concepts. Each maps to the canonical
    // ADR that DEFINES it (ADR-004..063), so a conceptual question grounds on the right record instead
    // of falling to weak corpus retrieval (which mis-synthesised "as três camadas" from ADR-001/002).
    // Multi-word aliases only — never bare tokens like "arquitectura"/"camadas"/"autoriza" (nor any
    // operator brand, which repo-guards forbids in engine source); those would shadow
    // federation/naming/boundary questions. Longest-alias-wins keeps precise
    // concepts ahead of broad ones. These NEVER invent a definition — they point a concept at its record.
    (
        "ADR-004",
        &[
            "governacao do protocolo",
            "protocol governance",
            "quem governa o protocolo",
            "who governs the protocol",
            "poder sobre os operadores",
            "power over operators",
            "poder sobre operadores",
            "governacao do protocolo da poder",
            "protocol governance grants power",
            "autoridade separada",
            "separacao de autoridade",
            "separation of authority",
            "autoridade esta separada",
            "authority is separated",
            "como esta separada a autoridade",
            "quem governa os operadores",
            "who governs operators",
            "governacao dos operadores",
            "tres camadas",
            "arquitectura institucional",
            "arquitetura institucional",
            "arquitectura de tres camadas",
            "arquitetura de tres camadas",
            "arquitetura em tres camadas",
            "camadas institucionais",
            "three layer",
            "three-layer",
            "trilayer",
            "tri layer",
            "l1 l2 l3",
        ],
    ),
    (
        // Brand-free aliases only (the repo-guards contamination check forbids the operator brand in
        // engine source): "operational scheme" already matches an "Operational Scheme" question.
        "ADR-006",
        &[
            "quem admite um operador",
            "quem admite operadores",
            "who admits an operator",
            "who admits operators",
            "admissao de um participante",
            "admissao a um esquema",
            "admission to a scheme",
            "quem decide quem pode operar",
            "who decides who may operate",
            "operational scheme",
            "scheme operacional",
            "esquema operacional",
            "operador designado",
            "designated operator",
        ],
    ),
    (
        "ADR-005",
        &[
            "quem certifica uma implementacao",
            "who certifies an implementation",
            "certificacao permite operar",
            "certification grants permission",
            "certificacao autoriza",
            "certification authorizes",
            "depois da certificacao",
            "certificacao nao e autorizacao",
            "certificacao vs autorizacao",
            "certificacao admissao autorizacao",
            "certificacao e admissao",
            "diferenca entre certificacao e admissao",
            "admissao a scheme",
            "scheme admission",
        ],
    ),
    (
        "ADR-007",
        &[
            "quem autoriza um operador",
            "quem autoriza operadores",
            "who authorizes an operator",
            "who authorises an operator",
            "quem supervisiona um operador",
            "who supervises an operator",
            "supervisiona legalmente",
            "legally supervises",
            "operar com dinheiro real",
            "operate with real money",
            "pode operar com dinheiro real",
            "quem decide se um operador pode operar",
            "autoriza operar com dinheiro real",
            "estado regulatorio",
            "regulatory state",
            "autorizacao regulatoria",
            "regulatory authorization",
            "regulatory authorisation",
            "preparacao regulatoria",
            "fundos reais",
            "real money",
            "real funds",
            "realmoneyactivationgate",
            "real money activation gate",
            "gate de fundos reais",
            "esta autorizada",
            "esta autorizado",
            "ja esta autorizada",
            "ja esta autorizado",
            "autorizada pelo regulador",
            "autorizado pelo regulador",
            "autorizacao do regulador",
        ],
    ),
    (
        "ADR-006",
        &[
            "conflito de interesses",
            "conflict of interest",
            "separacao de infraestruturas",
            "separacao de chaves",
            "key separation",
            "infrastructure separation",
            "criador e operador",
            "creator and operator",
        ],
    ),
    // ── M2.19D — Layer-2 conformance & interoperability certification concepts (ADR-032/065/066).
    // Brand-free, multi-word aliases only.
    (
        "ADR-032",
        &[
            "certificacao de conformidade e interoperabilidade",
            "certificacao de conformidade",
            "certificacao de interoperabilidade",
            "certificacao tecnica",
            "certified implementation",
            "certification profile",
            "certification record",
            "conformidade e interoperabilidade",
            "interoperabilidade verificada",
        ],
    ),
    (
        "ADR-033",
        &[
            "technical registry",
            "registo tecnico",
            "registry tecnico",
            "registo de certificacao",
        ],
    ),
    (
        "ADR-032",
        &[
            "estados de certificacao",
            "ciclo de vida da certificacao",
            "expiracao da certificacao",
            "suspensao da certificacao",
            "revogacao da certificacao",
            "supersession",
            "renovacao da certificacao",
        ],
    ),
];

/// Resolve a concept query to its canonical registry document id, or `None` when the query does not name a
/// concept with a single canonical document (those keep using corpus retrieval). The MOST-SPECIFIC alias
/// wins: when several aliases match (e.g. the bare token "conformidade" for ADR-030 and the phrase
/// "evidencia de conformidade" for the evidence spec), the longest matching alias decides, so a precise
/// multi-word concept is never shadowed by a broad token regardless of list order.
/// M2.18B.5 — expose the concept→aliases table so the fuzzy/recovery engine derives its canonical
/// vocabulary from THIS single source (never a duplicated alias list). Read-only view of `CONCEPTS`.
pub fn concept_entries() -> &'static [(&'static str, &'static [&'static str])] {
    CONCEPTS
}

pub fn resolve_concept(query: &str) -> Option<&'static str> {
    let nq = normalize(query);
    if nq.is_empty() {
        return None;
    }
    let mut best: Option<(&'static str, usize)> = None;
    for (doc, aliases) in CONCEPTS {
        for a in *aliases {
            if nq.contains(a) && best.map(|(_, len)| a.len() > len).unwrap_or(true) {
                best = Some((doc, a.len()));
            }
        }
    }
    best.map(|(doc, _)| doc)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_concepts_to_their_canonical_adr() {
        assert_eq!(
            resolve_concept("o que é a dupla entrada no ledger?"),
            Some("ADR-012")
        );
        assert_eq!(
            resolve_concept("como funciona a idempotência?"),
            Some("ADR-022")
        );
        assert_eq!(resolve_concept("o que é um payment link?"), Some("ADR-015"));
        assert_eq!(
            resolve_concept("explica o modelo de identidade da carteira"),
            Some("ADR-014")
        );
        assert_eq!(
            resolve_concept("o que é o operador de referência?"),
            Some("ADR-035")
        );
        // The generic operator definition anchors on the record that draws the operator↔protocol
        // boundary, which is the separation decision.
        assert_eq!(
            resolve_concept("o que é um operador no protocolo?"),
            Some("ADR-002")
        );
        assert_eq!(
            resolve_concept("qual o papel do operador?"),
            Some("ADR-002")
        );
        // … but the more specific reference-operator / manifest concepts still win (longest alias).
        assert_eq!(
            resolve_concept("o que é o operador de referência?"),
            Some("ADR-035")
        );
        assert_eq!(
            resolve_concept("o que é um manifesto de operador?"),
            Some("docs/reference/manifesto.md")
        );
    }

    #[test]
    fn non_adr_concepts_map_to_public_canonical_sources() {
        // First-class non-ADR canonical sources (Reference chapters, specs) + ADR-backed concepts.
        assert_eq!(
            resolve_concept("como funciona a federação?"),
            Some("ADR-025")
        );
        assert_eq!(
            resolve_concept("como funciona a revogação de uma chave?"),
            Some("ADR-025")
        );
        assert_eq!(
            resolve_concept("como é governado o protocolo?"),
            Some("docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md")
        );
        assert_eq!(
            resolve_concept("o que é um manifesto de operador?"),
            Some("docs/reference/manifesto.md")
        );
        assert_eq!(
            resolve_concept("o que é evidência de conformidade?"),
            Some("spec/federation/FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md")
        );
    }

    #[test]
    fn non_concept_returns_none() {
        assert_eq!(resolve_concept("qual é a licença?"), None); // exact-fact, handled by the terminal layer
        assert_eq!(resolve_concept(""), None);
    }

    #[test]
    fn m2_19c_three_layer_concepts_map_to_their_canonical_adr() {
        // ADR-004 — three-layer institutional architecture (the flagship v1 concept).
        assert_eq!(
            resolve_concept("Quais são as três camadas da arquitectura institucional do BANZA?"),
            Some("ADR-004")
        );
        assert_eq!(
            resolve_concept("explica a arquitetura de três camadas"),
            Some("ADR-004")
        );
        assert_eq!(
            resolve_concept("what is the three-layer architecture?"),
            Some("ADR-004")
        );
        // ADR-006 — the L3 Operational Scheme (brand-free queries; the operator brand must not appear
        // in engine source, but the resolver still catches the phrasings people use).
        assert_eq!(
            resolve_concept("o que é o Operational Scheme (L3)?"),
            Some("ADR-006")
        );
        assert_eq!(
            resolve_concept("o que é o scheme operacional?"),
            Some("ADR-006")
        );
        assert_eq!(
            resolve_concept("qual é o operador designado?"),
            Some("ADR-006")
        );
        // ADR-005 — certification ≠ admission ≠ authorisation.
        assert_eq!(
            resolve_concept("a certificação é a mesma coisa que admissão a scheme?"),
            Some("ADR-005")
        );
        // ADR-007 — regulatory state + real-money gate.
        assert_eq!(
            resolve_concept("o operador já está autorizado pelo regulador?"),
            Some("ADR-007")
        );
        assert_eq!(
            resolve_concept("os fundos reais já estão activos?"),
            Some("ADR-007")
        );
        // ADR-006 — conflict of interest + separation.
        assert_eq!(
            resolve_concept("como é gerido o conflito de interesses?"),
            Some("ADR-006")
        );
    }

    #[test]
    fn m2_19c_concepts_do_not_shadow_prior_concepts() {
        // The new multi-word aliases must not capture the pre-existing concept questions.
        assert_eq!(
            resolve_concept("como funciona a federação?"),
            Some("ADR-025")
        );
        assert_eq!(resolve_concept("o que é a dupla entrada?"), Some("ADR-012"));
        assert_eq!(
            resolve_concept("o que é evidência de conformidade?"),
            Some("spec/federation/FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md")
        );
        // The ecosystem-naming decision was removed from the tree: naming is not an architectural
        // decision, and a concept with no current record must resolve to nothing rather than to a
        // neighbouring record that does not decide it.
        assert_eq!(
            resolve_concept("o que é a inversão de nomes do ecossistema?"),
            None
        );
    }
}
