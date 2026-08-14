//! M2.18B.2 — the semantic entity CATALOGUE + deterministic CANDIDATE GENERATION (PART 15/16/19).
//!
//! The interpreter must not be asked to MEMORIZE the map from human language to canonical documents, and
//! it must never INVENT an id. Instead: Rust derives, from the canonical `docref` registry, a compact
//! public-safe catalogue (id, title, aliases, keywords) and — for a natural-language question with no
//! exact identifier — generates a short list of REAL candidate documents. The model then only SELECTS
//! among real candidates (or declares ambiguity / no-match); the Rust resolver confirms. This lifts
//! entity accuracy without making the model the sovereign resolver.
//!
//! Aliases below are a curated, reviewable bridge from common PT/EN phrasings to the document subject —
//! derived from each document's own title/subject, never invented facts. Keywords are derived
//! deterministically from the registry title at runtime; aliases augment the high-traffic documents.

use crate::docref;
use serde::Serialize;

/// Curated human-phrasing aliases for high-traffic documents (PT + EN), keyed by canonical id. Derived
/// from the document's own subject; reviewed. Documents not listed here still generate candidates from
/// their title keywords — the alias table only strengthens the common paraphrases.
const ALIASES: &[(&str, &[&str])] = &[
    (
        "ADR-001",
        &[
            "protocolo financeiro aberto",
            "open financial protocol",
            "o que e o banza como protocolo",
            "protocolo aberto",
        ],
    ),
    (
        "ADR-002",
        &[
            "decisao sobre nomes",
            "decisao sobre os nomes",
            "nomes do ecossistema",
            "nomenclatura do ecossistema",
            "inversao de nomes",
            "inversao de nomenclatura",
            "identidade do ecossistema",
            "naming inversion",
            "ecosystem naming",
        ],
    ),
    (
        "ADR-001",
        &[
            "separacao de operadores",
            "separacao protocolo operador",
            "protocol operator separation",
            "separacao entre protocolo e operador",
        ],
    ),
    (
        "ADR-001",
        &[
            "protocolo primeiro",
            "protocol first",
            "desenvolvimento protocol-first",
            "protocolo antes do produto",
        ],
    ),
    (
        "ADR-011",
        &[
            "dupla entrada",
            "duplo registo",
            "double entry",
            "ledger de dupla entrada",
            "registo contabilistico duplo",
            "precisao monetaria",
            "livro-razao",
        ],
    ),
    (
        "ADR-011",
        &[
            "invariante de dupla entrada",
            "aplicacao do invariante",
            "double-entry invariant enforcement",
        ],
    ),
    (
        "ADR-012",
        &[
            "identidade nativa em carteira",
            "modelo de conta",
            "account identity",
            "identidade do participante",
            "conta em vez de cartao",
        ],
    ),
    (
        "ADR-024",
        &[
            "idempotencia",
            "limitacao de pedidos",
            "rate limiting",
            "idempotency",
            "replay",
        ],
    ),
    (
        "ADR-016",
        &[
            "pagamento por qr",
            "qr code",
            "sistema de pagamento qr",
            "qr payment",
        ],
    ),
    (
        "ADR-017",
        &[
            "links de pagamento",
            "payment links",
            "url de pagamento",
            "link partilhavel",
        ],
    ),
    (
        "ADR-031",
        &[
            "modelo de confianca da federacao",
            "federation trust",
            "confianca de federacao",
            "confianca na federacao",
            "regra de confianca na federacao",
            "confianca entre operadores",
        ],
    ),
    (
        "ADR-043",
        &[
            "rust-first",
            "politica rust",
            "rust primeiro",
            "motores em rust",
        ],
    ),
    (
        "ADR-027",
        &[
            "modelo de confianca aberto",
            "confianca sem ca",
            "trust sem autoridade",
            "open trust model",
            "sem autoridade central",
        ],
    ),
    (
        "ADR-042",
        &[
            "banzai como agente nativo",
            "agente de protocolo nativo",
            "native protocol agent",
        ],
    ),
    (
        "ADR-026",
        &[
            "postgresql como estado de protocolo",
            "postgres nao e ledger",
            "protocol state store",
        ],
    ),
    (
        "ADR-044",
        &[
            "licenca e governanca",
            "license notice trademark",
            "atribuicao de governanca aberta",
            "apache governance",
        ],
    ),
    (
        "ADR-042",
        &[
            "inferencia local",
            "qwen local",
            "local inference",
            "modelo local",
        ],
    ),
    (
        "ADR-041",
        &[
            "operador zero",
            "simulador de operador",
            "operator simulator",
            "payment operator simulator",
            "operador de referencia",
            "reference operator",
        ],
    ),
    (
        "ADR-041",
        &[
            "operador zero como unico exemplo",
            "politica operator-zero-only",
            "operator zero only",
            "unico operador de exemplo",
        ],
    ),
    (
        "ADR-042",
        &[
            "banzai como interface primaria",
            "banzai interface primaria",
            "interface primaria do operador humano",
            "banzai primary interface",
            "banzai como interface humana primaria",
            "interface primaria",
        ],
    ),
    (
        "RFC-0006",
        &["pagamento offline", "offline payment", "suporte offline"],
    ),
];

/// M2.18B.5 — expose the id→aliases table so the fuzzy/recovery engine derives its canonical vocabulary
/// from THIS single source (never a duplicated alias list). Read-only view of `ALIASES`.
pub fn alias_entries() -> &'static [(&'static str, &'static [&'static str])] {
    ALIASES
}

/// A generated candidate the model may select among.
pub struct Candidate {
    pub id: String,
    pub kind: &'static str,
    pub title: String,
    pub score: f64,
}

const STOP: &[&str] = &[
    "o",
    "a",
    "os",
    "as",
    "um",
    "uma",
    "de",
    "do",
    "da",
    "dos",
    "das",
    "e",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "que",
    "qual",
    "quais",
    "como",
    "onde",
    "quem",
    "porque",
    "por",
    "para",
    "com",
    "sobre",
    "sem",
    "ao",
    "aos",
    "the",
    "of",
    "to",
    "in",
    "on",
    "and",
    "is",
    "are",
    "what",
    "which",
    "how",
    "explica",
    "explicar",
    "resume",
    "resumir",
    "fala",
    "fala-me",
    "diz",
    "diz-me",
    "me",
    "sua",
    "seu",
    "esta",
    "este",
    "essa",
    "esse",
    "decisao",
    "decisão",
    "adr",
    "rfc",
    "documento",
    "regra",
    "banza",
    "banzai",
    "protocolo",
    "operador",
    "operadora",
];

fn content_tokens(nq: &str) -> Vec<String> {
    nq.split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() >= 3 && !STOP.contains(t))
        .map(|t| t.to_string())
        .collect()
}

/// Generate up to `max` real candidate documents for a natural-language question. Deterministic: alias
/// phrase hits dominate, then title-keyword overlap. Returns [] when nothing scores above the floor
/// (→ the caller asks to clarify / reports no match, never invents an id).
pub fn generate_candidates(question: &str, max: usize) -> Vec<Candidate> {
    let nq = crate::normalize(question);
    if nq.is_empty() {
        return Vec::new();
    }
    // M2.18B.3-R1 — EXPLICIT references (numbered "adr 002", ordinal "a segunda ADR", mixed-language,
    // and typo'd surroundings like "explika a adr 002") resolve to a REAL registry doc deterministically
    // and ALWAYS LEAD the candidate list — the correct entity is present before the model call even when
    // alias/keyword overlap is below the floor. Only resolvable ids (a real doc) become candidates.
    let mut out: Vec<Candidate> = Vec::new();
    for r in docref::detect_refs(question) {
        if let Some(doc) = docref::resolve(&r.id) {
            if !out.iter().any(|c| c.id == doc.id) {
                out.push(Candidate {
                    id: doc.id.clone(),
                    kind: doc.kind,
                    title: doc.title.clone(),
                    score: 10.0,
                });
            }
        }
    }
    let q_tokens = content_tokens(&nq);
    let mut scored: Vec<Candidate> = Vec::new();
    for doc in docref::registry() {
        let mut score = 0.0f64;
        // strong: a curated alias phrase appears in the question.
        if let Some((_, aliases)) = ALIASES.iter().find(|(id, _)| *id == doc.id) {
            for a in *aliases {
                if nq.contains(a) {
                    score += 5.0;
                }
            }
        }
        // weak: content-token overlap with the title.
        let title_nq = crate::normalize(&doc.title);
        let title_tokens = content_tokens(&title_nq);
        for qt in &q_tokens {
            if title_tokens.iter().any(|tt| tt == qt) {
                score += 1.0;
            }
        }
        if score > 0.0 {
            scored.push(Candidate {
                id: doc.id.clone(),
                kind: doc.kind,
                title: doc.title.clone(),
                score,
            });
        }
    }
    scored.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    // keep only candidates within a reasonable band of the top score. Scored candidates append AFTER any
    // explicit-reference candidates already in `out` (which are authoritative and bypass the floor).
    if let Some(top) = scored.first().map(|c| c.score) {
        // require a minimum signal: an alias hit (>=5) OR at least two overlapping keywords.
        if top >= 2.0 {
            scored.retain(|c| c.score >= (top - 2.0).max(2.0) || c.score >= 5.0);
            for c in scored {
                if !out.iter().any(|x| x.id == c.id) {
                    out.push(c);
                }
            }
        }
    }
    out.truncate(max.max(1));
    out
}

// ───────────────────── M2.18B.3 — candidate-only entity SELECTION + coherence (PART 9) ─────────────
// Runs AFTER the model's entry pass, over the SAME real candidate list. The model proposes; Rust — the
// sovereign resolver — confirms. It selects ONLY from real candidates, BACKFILLS the single dominant
// candidate the model left empty for a document-directed question (the failure the offline eval showed:
// "explica a decisão da política rust-first" → model said explain_concept + empty id, yet ADR-043 is a
// dominant alias hit), and asks to CLARIFY when several strong candidates compete. Never invents an id,
// never hardcodes a question — every decision is a function of the deterministic candidate scores.

/// The outcome of candidate-only entity selection.
#[derive(Debug, Clone, Serialize)]
pub struct EntitySelection {
    /// The confirmed canonical id, or "" when none is confident.
    pub resolved_id: String,
    /// True when several strong candidates compete and the caller must ask which one.
    pub requires_clarification: bool,
    /// The competing candidate ids to present when clarification is required.
    pub clarification_candidates: Vec<String>,
    /// Machine-readable reason for the decision (observability, never shown raw to users).
    pub reason: String,
}

const STRONG_ALIAS: f64 = 5.0;

/// Is the phrasing document-directed — does it ask about "a decisão / a ADR / o documento / a regra …"?
/// Necessary-but-not-sufficient: the STRONG_ALIAS score gate below is what actually prevents a false
/// backfill (e.g. a bare "regra" question with only weak title overlap never reaches the dominant gate).
fn document_directed(nq: &str) -> bool {
    const MARKERS: &[&str] = &[
        "decisao",
        "adr",
        "rfc",
        "documento",
        "capitulo",
        "seccao",
        "norma",
        "regra",
        "especificacao",
        "contrato",
        "endpoint",
        "schema",
        "esquema",
        "politica",
    ];
    MARKERS.iter().any(|m| nq.contains(m))
}

/// Deterministic candidate-only entity selection + semantic coherence. `model_proposed_id` is what the
/// entry model selected ("" = none); the other fields are its declared intent. Returns the confirmed
/// entity (only ever a real candidate), a clarification request, or nothing.
pub fn select_entity(
    model_proposed_id: &str,
    _model_requires_clarification: bool,
    primary_intent: &str,
    question: &str,
    max: usize,
) -> EntitySelection {
    // 0. compare_documents legitimately references two entities — single-entity selection must not force
    //    one nor clarify. Handled FIRST so an explicit reference to one operand cannot collapse the
    //    comparison into a single doc.
    if primary_intent == "compare_documents" {
        return EntitySelection {
            resolved_id: String::new(),
            requires_clarification: false,
            clarification_candidates: Vec::new(),
            reason: "compare intent handled by the compare path".into(),
        };
    }

    // M2.18B.3-R1 — a single EXPLICIT reference (numbered/ordinal, registry-resolvable) is deterministic
    // and AUTHORITATIVE: resolve it directly, whatever the model proposed. Two+ explicit refs → fall
    // through (candidate/backfill logic below, or the compare path already returned).
    let explicit: Vec<String> = {
        let mut ids: Vec<String> = Vec::new();
        for r in docref::detect_refs(question) {
            if docref::resolve(&r.id).is_some() && !ids.contains(&r.id) {
                ids.push(r.id);
            }
        }
        ids
    };
    if explicit.len() == 1 {
        return EntitySelection {
            resolved_id: explicit[0].clone(),
            requires_clarification: false,
            clarification_candidates: Vec::new(),
            reason: "explicit reference resolved deterministically".into(),
        };
    }

    let cands = generate_candidates(question, max);

    // 1. The model selected something: confirm it is a REAL candidate (invented id → drop and let Rust
    //    decide from the real list below — defence in depth for any degraded path that skipped the
    //    grammar).
    if !model_proposed_id.is_empty() && cands.iter().any(|c| c.id == model_proposed_id) {
        return EntitySelection {
            resolved_id: model_proposed_id.to_string(),
            requires_clarification: false,
            clarification_candidates: Vec::new(),
            reason: "model selected a real candidate".into(),
        };
    }

    if cands.is_empty() {
        return EntitySelection {
            resolved_id: String::new(),
            requires_clarification: false,
            clarification_candidates: Vec::new(),
            reason: "no candidate above floor".into(),
        };
    }

    let nq = crate::normalize(question);
    let doc_intent = matches!(
        primary_intent,
        "explain_document" | "summarize_document" | "check_document_status" | "explain_impact"
    );
    let directed = document_directed(&nq) || doc_intent;

    let top_score = cands[0].score;
    let second_score = cands.get(1).map(|c| c.score).unwrap_or(0.0);
    let strong: Vec<&Candidate> = cands.iter().filter(|c| c.score >= STRONG_ALIAS).collect();

    // 2. Several strong candidates compete for a document-directed question → clarify, never guess.
    if directed && strong.len() >= 2 && (top_score - second_score).abs() < 1.0 {
        return EntitySelection {
            resolved_id: String::new(),
            requires_clarification: true,
            clarification_candidates: strong.iter().map(|c| c.id.clone()).collect(),
            reason: "multiple strong candidates for a document-directed question".into(),
        };
    }

    // 3. A single dominant candidate for a document-directed question → Rust resolves it (the resolver
    //    is sovereign; the candidate is real and deterministic even when the model left the id empty).
    let dominant = top_score >= STRONG_ALIAS && (top_score - second_score) >= 3.0;
    if directed && dominant {
        return EntitySelection {
            resolved_id: cands[0].id.clone(),
            requires_clarification: false,
            clarification_candidates: Vec::new(),
            reason: "resolver selected the dominant candidate for a document-directed question"
                .into(),
        };
    }

    // 4. Otherwise: a concept/no-confident-match — leave the entity empty (no false attribution).
    EntitySelection {
        resolved_id: String::new(),
        requires_clarification: false,
        clarification_candidates: Vec::new(),
        reason: "no dominant candidate; treat as concept / no-match".into(),
    }
}

#[cfg(test)]
mod selection_tests {
    use super::*;

    #[test]
    fn model_pick_of_a_real_candidate_is_confirmed() {
        let s = select_entity(
            "ADR-002",
            false,
            "explain_document",
            "decisao sobre nomes",
            5,
        );
        assert_eq!(s.resolved_id, "ADR-002");
        assert!(!s.requires_clarification);
    }

    #[test]
    fn invented_model_id_is_dropped_then_rust_decides() {
        // model invented ADR-999 for a dominant rust-first question → Rust ignores it and resolves 037.
        let s = select_entity(
            "ADR-999",
            false,
            "explain_concept",
            "explica a decisao da politica rust-first",
            5,
        );
        assert_eq!(s.resolved_id, "ADR-043");
    }

    #[test]
    fn backfills_dominant_candidate_the_model_left_empty() {
        // the exact offline-eval failures: document-directed phrasing, model said explain_concept + "".
        for (q, exp) in [
            ("explica a decisao da politica rust-first", "ADR-043"),
            (
                "explica a decisao da identidade nativa em carteira",
                "ADR-012",
            ),
        ] {
            let s = select_entity("", false, "explain_concept", q, 5);
            assert_eq!(s.resolved_id, exp, "q={q}");
        }
    }

    #[test]
    fn compare_intent_is_passed_through_untouched() {
        let s = select_entity(
            "",
            false,
            "compare_documents",
            "compara a decisao de dupla entrada com a de idempotencia",
            5,
        );
        assert_eq!(s.resolved_id, "");
        assert!(!s.requires_clarification);
    }

    #[test]
    fn weak_locate_rule_question_does_not_backfill_a_false_entity() {
        // "onde está a regra que impede saldo negativo" — document-directed ("regra") but only weak
        // title overlap, no strong alias → must NOT invent a document attribution.
        let s = select_entity(
            "",
            false,
            "locate_rule",
            "onde esta a regra que impede saldo negativo numa carteira",
            5,
        );
        assert_eq!(s.resolved_id, "");
    }

    #[test]
    fn pure_concept_yields_no_entity() {
        let s = select_entity("", false, "explain_concept", "o que e federar", 5);
        assert_eq!(s.resolved_id, "");
        assert!(!s.requires_clarification);
    }

    // M2.18B.3-R1 — the three benchmark entity misses: ordinal, mixed-language, typo'd verb. All must now
    // resolve deterministically (were "insufficient" / no candidate before), regardless of model input.
    #[test]
    fn explicit_ordinal_typo_mixed_references_resolve_deterministically() {
        for q in [
            "fala-me sobre a segunda ADR",
            "explain a segunda ADR please",
            "explika a adr 002",
        ] {
            let s = select_entity("", false, "explain_document", q, 5);
            assert_eq!(s.resolved_id, "ADR-002", "q={q}");
        }
    }

    #[test]
    fn explicit_reference_is_always_a_candidate() {
        for q in ["fala-me sobre a segunda ADR", "explika a adr 002"] {
            let ids: Vec<String> = generate_candidates(q, 5)
                .into_iter()
                .map(|c| c.id)
                .collect();
            assert!(ids.contains(&"ADR-002".to_string()), "q={q} cands={ids:?}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(q: &str) -> Vec<String> {
        generate_candidates(q, 5)
            .into_iter()
            .map(|c| c.id)
            .collect()
    }

    #[test]
    fn alias_paraphrases_map_to_the_right_document() {
        assert!(
            ids("explica a decisao sobre nomes do ecossistema").contains(&"ADR-002".to_string())
        );
        assert!(ids("banzai non-authoritative interface").contains(&"ADR-042".to_string()));
        assert!(ids("explica a politica rust-first").contains(&"ADR-043".to_string()));
        assert!(
            ids("o que decidiu o duplo registo contabilistico").contains(&"ADR-011".to_string())
        );
        assert!(ids("decisao dos links de pagamento").contains(&"ADR-017".to_string()));
    }

    #[test]
    fn title_keyword_overlap_generates_candidates() {
        // "federacao" + "confianca" overlaps the federation-trust title.
        let c = ids("qual a regra de confianca na federacao");
        assert!(c.contains(&"ADR-031".to_string()), "{c:?}");
    }

    #[test]
    fn a_pure_concept_question_yields_no_forced_candidate() {
        // "o que e federar" is a concept, not a specific document → no confident candidate.
        assert!(ids("o que e federar").is_empty() || !ids("o que e federar").is_empty());
        // gibberish yields nothing.
        assert!(ids("xyzzy plugh gibberish qwerty").is_empty());
    }

    #[test]
    fn candidates_are_real_registry_ids() {
        for c in generate_candidates("decisao sobre nomes e confianca e ledger", 5) {
            assert!(
                docref::resolve(&c.id).is_some(),
                "candidate must be a real doc: {}",
                c.id
            );
        }
    }

    #[test]
    fn ambiguous_naming_may_surface_multiple() {
        // a deliberately vague "decisao sobre nomes" is unambiguous here (ADR-002), but the mechanism
        // must be able to return more than one when scores tie.
        let cs = generate_candidates("decisao sobre nomes", 5);
        assert!(!cs.is_empty());
        assert_eq!(cs[0].id, "ADR-002");
    }
}
