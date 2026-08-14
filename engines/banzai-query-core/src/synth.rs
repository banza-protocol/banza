//! M2.18B.6 (§C) — the grounded output-synthesis contract + claim-source map (the single Qwen call).
//!
//! The one Grounded-Synthesis call runs the local model over the Rust `FactualPackage`. Rust owns the
//! contract: it builds the prompt (synthesize ONLY from the numbered facts) and the constrained output
//! schema, then parses the model's structured answer. The schema applies a candidate-constraint technique
//! — `claims[].fact_ids` is a grammar enum of the package's real fact ids and `cited_source_ids` a grammar
//! enum of `allowed_source_ids`, so the model can only attribute a claim to a real fact and only cite an
//! allowed document. The result is a claim→fact-id map the factual validator checks. Pure + total: no
//! model call, no I/O — this module only shapes and parses.

use crate::factpack::FactualPackage;
use serde::{Deserialize, Serialize};

/// The output-pass prompt (system + user), built from a FactualPackage.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct OutputPrompt {
    pub system: String,
    pub user: String,
}

/// One claim in the answer and the fact ids that support it (the claim-source map).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Claim {
    pub claim: String,
    #[serde(default)]
    pub fact_ids: Vec<String>,
}

/// The structured grounded answer the output model returns.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct GroundedOutput {
    /// The public answer in Markdown, synthesized only from the facts.
    pub answer_markdown: String,
    /// The claim-source map: every substantive claim with its supporting fact ids.
    #[serde(default)]
    pub claims: Vec<Claim>,
    /// The documents cited, a subset of the package's allowed_source_ids.
    #[serde(default)]
    pub cited_source_ids: Vec<String>,
    /// True when the facts do not support an answer (the model must decline rather than invent).
    #[serde(default)]
    pub insufficient_evidence: bool,
}

/// Build the output-pass prompt from a FactualPackage at a given `depth`. Strict grounding: the model may
/// use ONLY the numbered facts, must attribute every claim to fact ids, may cite only allowed sources, and
/// must set `insufficient_evidence` (not invent) when the facts do not answer the question. `depth`
/// (brief | standard | deep) sets a LENGTH directive — brief is the default for normal public questions
/// (M2.18B.3A Round B: shorter answers cut output-pass token generation, the dominant latency cost).
pub fn build_output_prompt(question: &str, pkg: &FactualPackage, depth: &str) -> OutputPrompt {
    let length_rule = match depth {
        "deep" => "6. Responde de forma completa mas objectiva; podes usar vários parágrafos e cobrir contexto, decisão e consequências quando os factos os suportarem.\n",
        "standard" => "6. Responde de forma objectiva em até ~6 pontos ou parágrafos curtos; cobre o essencial sem alongar.\n",
        // brief (default)
        _ => "6. Responde de forma BREVE: 3 a 5 pontos curtos (ou 2-3 frases), apenas o essencial directamente perguntado. Não incluas contexto, consequências ou relações não pedidos.\n",
    };
    let system = format!(
        "{}{}{}",
        concat!(
            "És o BanzAI a redigir uma resposta FUNDAMENTADA sobre o protocolo BANZA. ",
            "REGRAS OBRIGATÓRIAS:\n",
            "1. Usa APENAS os FACTOS numerados fornecidos. Não uses conhecimento externo nem memória.\n",
            "2. Cada afirmação substantiva da resposta tem de ser suportada por um ou mais fact_ids reais ",
            "(F1, F2, …) presentes na lista. Preenche o mapa claims com (claim, fact_ids).\n",
            "3. cited_source_ids só pode conter ids da lista FONTES PERMITIDAS. Nunca cites outra fonte, ",
            "nunca cites ficheiros internos, nunca inventes uma fonte. NUNCA menciones no answer_markdown ",
            "um identificador de documento (ADR-XXX, RFC-XXXX ou caminho de ficheiro) que NÃO esteja na ",
            "lista FONTES PERMITIDAS — se um facto de que precisas não está na lista, omite-o em vez de o ",
            "atribuir a um documento ausente.\n",
            "4. Se os factos não suportarem uma resposta, define insufficient_evidence=true e explica ",
            "brevemente que não há base documental — NÃO inventes.\n",
            "5. Preenche PRIMEIRO claims (as afirmações e os seus fact_ids) e SÓ DEPOIS escreve ",
            "answer_markdown. answer_markdown TEM de conter a resposta em prosa (NUNCA vazio), em ",
            "português e objectiva, fundamentada apenas nesses factos. Não incluas um cabeçalho de ",
            "fontes no answer_markdown (as fontes vêm de cited_source_ids).\n",
        ),
        length_rule,
        "Devolve APENAS o objecto JSON pedido."
    );

    let mut user = String::new();
    user.push_str("PERGUNTA:\n");
    user.push_str(question.trim());
    user.push_str("\n\nFACTOS (usa apenas estes; cita cada afirmação pelos fact_ids):\n");
    if pkg.facts.is_empty() {
        user.push_str("(nenhum facto disponível)\n");
    } else {
        for f in &pkg.facts {
            let sec = if f.source.section.is_empty() {
                String::new()
            } else {
                format!(" · {}", f.source.section)
            };
            user.push_str(&format!(
                "- {} [{}{}]: {}\n",
                f.id, f.source.document_id, sec, f.text
            ));
        }
    }
    user.push_str("\nFONTES PERMITIDAS (cited_source_ids só pode conter estes ids): ");
    if pkg.allowed_source_ids.is_empty() {
        user.push_str("(nenhuma)");
    } else {
        user.push_str(&pkg.allowed_source_ids.join(", "));
    }

    OutputPrompt { system, user }
}

/// SPR-4 §5 — the STRUCTURED-generation variant of [`build_output_prompt`]. The model emits only the
/// linguistic core it must actually author: `answer_markdown`, the `claims` map (claim + fact_ids) and
/// `insufficient_evidence`. It is NOT asked to fill `cited_source_ids` — that field is DERIVED
/// deterministically downstream from `claims[].fact_ids → fact.source.document_id` (always ⊆
/// allowed_source_ids by construction), so cutting it removes redundant, non-truth-bearing generation
/// without weakening any guarantee. The prose-guard half of the citation rule stays (never name a
/// document outside FONTES PERMITIDAS in the prose); only the "fill the cited_source_ids field"
/// instruction is dropped. Every other rule (facts-only grounding, claim map, decline-not-invent,
/// prose-never-empty, length) is byte-identical to the baseline so behaviour and quality are unchanged.
pub fn build_output_prompt_structured(
    question: &str,
    pkg: &FactualPackage,
    depth: &str,
) -> OutputPrompt {
    let length_rule = match depth {
        "deep" => "6. Responde de forma completa mas objectiva; podes usar vários parágrafos e cobrir contexto, decisão e consequências quando os factos os suportarem.\n",
        "standard" => "6. Responde de forma objectiva em até ~6 pontos ou parágrafos curtos; cobre o essencial sem alongar.\n",
        // brief (default)
        _ => "6. Responde de forma BREVE: 3 a 5 pontos curtos (ou 2-3 frases), apenas o essencial directamente perguntado. Não incluas contexto, consequências ou relações não pedidos.\n",
    };
    let system = format!(
        "{}{}{}",
        concat!(
            "És o BanzAI a redigir uma resposta FUNDAMENTADA sobre o protocolo BANZA. ",
            "REGRAS OBRIGATÓRIAS:\n",
            "1. Usa APENAS os FACTOS numerados fornecidos. Não uses conhecimento externo nem memória.\n",
            "2. Cada afirmação substantiva da resposta tem de ser suportada por um ou mais fact_ids reais ",
            "(F1, F2, …) presentes na lista. Preenche o mapa claims com (claim, fact_ids).\n",
            "3. NUNCA menciones no answer_markdown um identificador de documento (ADR-XXX, RFC-XXXX ou ",
            "caminho de ficheiro) que NÃO esteja na lista FONTES PERMITIDAS — se um facto de que precisas ",
            "não está na lista, omite-o em vez de o atribuir a um documento ausente. As fontes citadas são ",
            "derivadas automaticamente dos fact_ids; NÃO as listes nem escrevas um campo de fontes.\n",
            "4. Se os factos não suportarem uma resposta, define insufficient_evidence=true e explica ",
            "brevemente que não há base documental — NÃO inventes.\n",
            "5. Preenche PRIMEIRO claims (as afirmações e os seus fact_ids) e SÓ DEPOIS escreve ",
            "answer_markdown. answer_markdown TEM de conter a resposta em prosa (NUNCA vazio), em ",
            "português e objectiva, fundamentada apenas nesses factos. Não incluas um cabeçalho de ",
            "fontes no answer_markdown (as fontes são derivadas automaticamente dos fact_ids).\n",
        ),
        length_rule,
        "Devolve APENAS o objecto JSON pedido."
    );

    let mut user = String::new();
    user.push_str("PERGUNTA:\n");
    user.push_str(question.trim());
    user.push_str("\n\nFACTOS (usa apenas estes; cita cada afirmação pelos fact_ids):\n");
    if pkg.facts.is_empty() {
        user.push_str("(nenhum facto disponível)\n");
    } else {
        for f in &pkg.facts {
            let sec = if f.source.section.is_empty() {
                String::new()
            } else {
                format!(" · {}", f.source.section)
            };
            user.push_str(&format!(
                "- {} [{}{}]: {}\n",
                f.id, f.source.document_id, sec, f.text
            ));
        }
    }
    user.push_str("\nFONTES PERMITIDAS (não menciones no texto um documento fora desta lista): ");
    if pkg.allowed_source_ids.is_empty() {
        user.push_str("(nenhuma)");
    } else {
        user.push_str(&pkg.allowed_source_ids.join(", "));
    }

    OutputPrompt { system, user }
}

/// M2.18B.7 — the per-task OUTPUT-SHAPE directive. Given the resolved [`AnswerObligationSet`], append the
/// mandatory shape the answer must take so the model FULFILS the task (an example gives a scenario, a
/// procedure gives steps, a template gives fields) instead of a generic grounded blurb. This is the fix
/// for the "grounds but does not fulfil" defect: the plan's obligations reach the prompt.
pub fn build_output_prompt_obliged(
    question: &str,
    pkg: &FactualPackage,
    depth: &str,
    obligations: &crate::obligations::AnswerObligationSet,
) -> OutputPrompt {
    let base = build_output_prompt(question, pkg, depth);
    let directive = match obligations.output_shape.as_str() {
        "scenario" => "FORMATO OBRIGATÓRIO (pergunta de EXEMPLO): dá um exemplo CONCRETO com cenário — actores, pré-condição, sequência e resultado. Marca claramente se é ilustrativo (\"exemplo ilustrativo\"). Uma definição ou descrição abstracta NÃO cumpre o pedido.",
        "steps" => "FORMATO OBRIGATÓRIO (pergunta de PROCEDIMENTO): dá PASSOS ordenados (pré-requisitos → passos → validação → resultado). Se as fontes não publicarem um procedimento completo, di-lo explicitamente e lista os requisitos confirmados. Enumerar documentos (ADR-X ou ADR-Y) NÃO é um procedimento.",
        "structure" => "FORMATO OBRIGATÓRIO (pergunta de ESTRUTURA/TEMPLATE): mostra os CAMPOS reais (nome, tipo, obrigatório/opcional) do schema, com valores ilustrativos. Se não houver schema público, di-lo. Arquitectura genérica (ledger, carteira, FSM) NÃO cumpre o pedido.",
        "comparison_table" => "FORMATO OBRIGATÓRIO (COMPARAÇÃO): cobre AMBOS os lados nas dimensões pedidas; não descrevas apenas um.",
        "metadata" => "FORMATO OBRIGATÓRIO (CONSULTA DOCUMENTAL): dá os metadados — id, título, estado, caminho e a decisão/finalidade em breve. Não é uma explicação completa.",
        "definition" => "FORMATO OBRIGATÓRIO (DEFINIÇÃO): começa por dizer directamente o que é o assunto (natureza + função), a partir da fonte canónica.",
        _ => "",
    };
    if directive.is_empty() && obligations.mandatory_sections.is_empty() {
        return base;
    }
    let sections = if obligations.mandatory_sections.is_empty() {
        String::new()
    } else {
        format!(
            " Secções obrigatórias: {}.",
            obligations.mandatory_sections.join(", ")
        )
    };
    OutputPrompt {
        system: format!("{}\n{}{}", base.system, directive, sections),
        user: base.user,
    }
}

/// SPR-4 §5 — the STRUCTURED-generation variant of [`build_output_prompt_obliged`]. Identical to the
/// baseline except the grounding base is [`build_output_prompt_structured`] (the model is not asked to
/// fill `cited_source_ids`). The per-task output-shape directive and mandatory sections are unchanged.
pub fn build_output_prompt_obliged_structured(
    question: &str,
    pkg: &FactualPackage,
    depth: &str,
    obligations: &crate::obligations::AnswerObligationSet,
) -> OutputPrompt {
    let base = build_output_prompt_structured(question, pkg, depth);
    let directive = match obligations.output_shape.as_str() {
        "scenario" => "FORMATO OBRIGATÓRIO (pergunta de EXEMPLO): dá um exemplo CONCRETO com cenário — actores, pré-condição, sequência e resultado. Marca claramente se é ilustrativo (\"exemplo ilustrativo\"). Uma definição ou descrição abstracta NÃO cumpre o pedido.",
        "steps" => "FORMATO OBRIGATÓRIO (pergunta de PROCEDIMENTO): dá PASSOS ordenados (pré-requisitos → passos → validação → resultado). Se as fontes não publicarem um procedimento completo, di-lo explicitamente e lista os requisitos confirmados. Enumerar documentos (ADR-X ou ADR-Y) NÃO é um procedimento.",
        "structure" => "FORMATO OBRIGATÓRIO (pergunta de ESTRUTURA/TEMPLATE): mostra os CAMPOS reais (nome, tipo, obrigatório/opcional) do schema, com valores ilustrativos. Se não houver schema público, di-lo. Arquitectura genérica (ledger, carteira, FSM) NÃO cumpre o pedido.",
        "comparison_table" => "FORMATO OBRIGATÓRIO (COMPARAÇÃO): cobre AMBOS os lados nas dimensões pedidas; não descrevas apenas um.",
        "metadata" => "FORMATO OBRIGATÓRIO (CONSULTA DOCUMENTAL): dá os metadados — id, título, estado, caminho e a decisão/finalidade em breve. Não é uma explicação completa.",
        "definition" => "FORMATO OBRIGATÓRIO (DEFINIÇÃO): começa por dizer directamente o que é o assunto (natureza + função), a partir da fonte canónica.",
        _ => "",
    };
    if directive.is_empty() && obligations.mandatory_sections.is_empty() {
        return base;
    }
    let sections = if obligations.mandatory_sections.is_empty() {
        String::new()
    } else {
        format!(
            " Secções obrigatórias: {}.",
            obligations.mandatory_sections.join(", ")
        )
    };
    OutputPrompt {
        system: format!("{}\n{}{}", base.system, directive, sections),
        user: base.user,
    }
}

/// The constrained output JSON Schema for a specific package: `claims[].fact_ids` is a grammar enum of
/// the package's real fact ids; `cited_source_ids` a grammar enum of allowed_source_ids. This makes an
/// invented fact reference or an out-of-set citation structurally impossible.
pub fn output_schema(pkg: &FactualPackage) -> serde_json::Value {
    let fact_ids: Vec<&str> = pkg.facts.iter().map(|f| f.id.as_str()).collect();
    let source_ids: Vec<&str> = pkg.allowed_source_ids.iter().map(|s| s.as_str()).collect();
    // JSON Schema `enum` must be non-empty; when a package has no facts/sources the fields stay empty
    // arrays (minItems/maxItems 0) so the model cannot cite anything.
    let fact_id_prop = if fact_ids.is_empty() {
        serde_json::json!({ "type": "array", "maxItems": 0, "items": { "type": "string" } })
    } else {
        serde_json::json!({ "type": "array", "items": { "type": "string", "enum": fact_ids } })
    };
    let source_prop = if source_ids.is_empty() {
        serde_json::json!({ "type": "array", "maxItems": 0, "items": { "type": "string" } })
    } else {
        serde_json::json!({ "type": "array", "items": { "type": "string", "enum": source_ids } })
    };
    serde_json::json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["answer_markdown", "claims", "cited_source_ids", "insufficient_evidence"],
        "properties": {
            "answer_markdown": { "type": "string", "minLength": 1 },
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["claim", "fact_ids"],
                    "properties": {
                        "claim": { "type": "string" },
                        "fact_ids": fact_id_prop
                    }
                }
            },
            "cited_source_ids": source_prop,
            "insufficient_evidence": { "type": "boolean" }
        }
    })
}

/// SPR-4 §5 — the STRUCTURED-generation OUTPUT schema: identical to [`output_schema`] but WITHOUT
/// `cited_source_ids`. The model produces only the linguistic core (`answer_markdown`, the `claims`
/// map, `insufficient_evidence`); the cited documents are derived deterministically downstream from
/// `claims[].fact_ids`. `claims[].fact_ids` stays grammar-bound to the package's real fact ids, so an
/// invented fact reference is still structurally impossible and the claim/citation validator keeps
/// every input it needs. Removing one enum-array property shrinks the constrained-decoding grammar and
/// the generated payload without dropping any truth.
pub fn output_schema_structured(pkg: &FactualPackage) -> serde_json::Value {
    let fact_ids: Vec<&str> = pkg.facts.iter().map(|f| f.id.as_str()).collect();
    let fact_id_prop = if fact_ids.is_empty() {
        serde_json::json!({ "type": "array", "maxItems": 0, "items": { "type": "string" } })
    } else {
        serde_json::json!({ "type": "array", "items": { "type": "string", "enum": fact_ids } })
    };
    serde_json::json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["answer_markdown", "claims", "insufficient_evidence"],
        "properties": {
            "answer_markdown": { "type": "string", "minLength": 1 },
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["claim", "fact_ids"],
                    "properties": {
                        "claim": { "type": "string" },
                        "fact_ids": fact_id_prop
                    }
                }
            },
            "insufficient_evidence": { "type": "boolean" }
        }
    })
}

/// SPR-4 §5 — derive the cited document ids DETERMINISTICALLY from a grounded output's claim map, in
/// first-appearance order, deduped, and intersected with the package's `allowed_source_ids` (so the
/// result is ⊆ allowed by construction — a dead or out-of-set citation is impossible). This is the
/// deterministic replacement for the model-authored `cited_source_ids` in the structured path. Pure.
pub fn derive_cited_source_ids(pkg: &FactualPackage, out: &GroundedOutput) -> Vec<String> {
    use std::collections::HashSet;
    // fact id → its document id.
    let mut fact_doc: std::collections::HashMap<&str, &str> = std::collections::HashMap::new();
    for f in &pkg.facts {
        fact_doc.insert(f.id.as_str(), f.source.document_id.as_str());
    }
    let allowed: HashSet<&str> = pkg.allowed_source_ids.iter().map(|s| s.as_str()).collect();
    let mut seen: HashSet<String> = HashSet::new();
    let mut out_ids: Vec<String> = Vec::new();
    for c in &out.claims {
        for fid in &c.fact_ids {
            if let Some(&doc) = fact_doc.get(fid.as_str()) {
                if allowed.contains(doc) && seen.insert(doc.to_string()) {
                    out_ids.push(doc.to_string());
                }
            }
        }
    }
    out_ids
}

/// Parse a raw output-pass JSON string into a GroundedOutput (shape only; factual validation is PART 12).
pub fn parse_output(raw: &str) -> Result<GroundedOutput, String> {
    serde_json::from_str(raw).map_err(|e| format!("invalid grounded-output json: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::factpack::build_factual_package_planned;

    fn pkg() -> FactualPackage {
        build_factual_package_planned(
            "t",
            "explica a ADR-001 sobre a inversao de nomes",
            "ADR-001",
            "brief",
        )
    }

    #[test]
    fn prompt_lists_facts_and_allowed_sources() {
        let p = build_output_prompt("o que decidiu a ADR-001?", &pkg(), "brief");
        assert!(p.user.contains("F1 ["));
        assert!(p.user.contains("FONTES PERMITIDAS"));
        assert!(p.user.contains("ADR-001"));
        assert!(p.system.contains("APENAS os FACTOS"));
    }

    #[test]
    fn schema_constrains_fact_ids_and_sources_to_the_package() {
        let s = output_schema(&pkg());
        let fe = s["properties"]["claims"]["items"]["properties"]["fact_ids"]["items"]["enum"]
            .as_array()
            .unwrap();
        assert!(fe.iter().any(|v| v == "F1"));
        let se = s["properties"]["cited_source_ids"]["items"]["enum"]
            .as_array()
            .unwrap();
        assert_eq!(se, &vec![serde_json::json!("ADR-001")]);
    }

    #[test]
    fn empty_package_yields_uncitable_schema() {
        let empty = FactualPackage {
            version: 1,
            trace_id: "t".into(),
            intent: "explain_concept".into(),
            content_hash: "0".into(),
            facts: vec![],
            ..Default::default()
        };
        let s = output_schema(&empty);
        assert_eq!(s["properties"]["cited_source_ids"]["maxItems"], 0);
    }

    #[test]
    fn parse_round_trips_a_grounded_output() {
        let raw = r#"{"answer_markdown":"A ADR-001 inverte a nomenclatura.","claims":[{"claim":"inverte a nomenclatura","fact_ids":["F1"]}],"cited_source_ids":["ADR-001"],"insufficient_evidence":false}"#;
        let o = parse_output(raw).unwrap();
        assert_eq!(o.claims[0].fact_ids, vec!["F1".to_string()]);
        assert!(!o.insufficient_evidence);
    }

    #[test]
    fn parse_rejects_unknown_field() {
        assert!(parse_output(r#"{"answer_markdown":"x","evil":1}"#).is_err());
    }

    // ── SPR-4 §5 — structured generation ────────────────────────────────────────────────────────────

    #[test]
    fn structured_schema_omits_cited_source_ids() {
        let s = output_schema_structured(&pkg());
        // The model is no longer asked to author cited_source_ids.
        assert!(s["properties"]["cited_source_ids"].is_null());
        let required: Vec<String> = s["required"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();
        assert_eq!(
            required,
            vec![
                "answer_markdown".to_string(),
                "claims".to_string(),
                "insufficient_evidence".to_string()
            ]
        );
        // fact_ids stay grammar-bound to the package's real ids — the validator input is preserved.
        let fe = s["properties"]["claims"]["items"]["properties"]["fact_ids"]["items"]["enum"]
            .as_array()
            .unwrap();
        assert!(fe.iter().any(|v| v == "F1"));
    }

    #[test]
    fn structured_prompt_keeps_prose_guard_drops_fill_instruction() {
        let p = build_output_prompt_structured("o que decidiu a ADR-001?", &pkg(), "brief");
        // prose-guard half stays…
        assert!(p.system.contains("NUNCA menciones"));
        // …the "fill cited_source_ids" half is gone.
        assert!(!p.system.contains("cited_source_ids só pode conter"));
        // facts + allowed sources still listed for grounding.
        assert!(p.user.contains("F1 ["));
        assert!(p.user.contains("ADR-001"));
    }

    #[test]
    fn structured_parse_without_cited_field_defaults_empty() {
        // A structured payload has no cited_source_ids; parse_output must still accept it (serde default).
        let raw = r#"{"answer_markdown":"A ADR-001 inverte a nomenclatura.","claims":[{"claim":"inverte","fact_ids":["F1"]}],"insufficient_evidence":false}"#;
        let o = parse_output(raw).unwrap();
        assert!(o.cited_source_ids.is_empty());
        assert_eq!(o.claims[0].fact_ids, vec!["F1".to_string()]);
    }

    fn grounded(fact_ids: Vec<&str>) -> GroundedOutput {
        GroundedOutput {
            answer_markdown: "x".into(),
            claims: vec![Claim {
                claim: "c".into(),
                fact_ids: fact_ids.into_iter().map(String::from).collect(),
            }],
            cited_source_ids: vec![],
            insufficient_evidence: false,
        }
    }

    #[test]
    fn derive_cited_maps_claim_fact_ids_to_documents() {
        let out = grounded(vec!["F1"]);
        assert_eq!(
            derive_cited_source_ids(&pkg(), &out),
            vec!["ADR-001".to_string()]
        );
    }

    #[test]
    fn derive_cited_dedupes_and_drops_unknown_fact_ids() {
        // F1 repeated + an unknown fact id → a single ADR-001, unknown dropped.
        let out = GroundedOutput {
            answer_markdown: "x".into(),
            claims: vec![
                Claim {
                    claim: "a".into(),
                    fact_ids: vec!["F1".into(), "FZ".into()],
                },
                Claim {
                    claim: "b".into(),
                    fact_ids: vec!["F1".into()],
                },
            ],
            cited_source_ids: vec![],
            insufficient_evidence: false,
        };
        assert_eq!(
            derive_cited_source_ids(&pkg(), &out),
            vec!["ADR-001".to_string()]
        );
    }

    #[test]
    fn derive_cited_is_subset_of_allowed_by_construction() {
        // Even if a fact's document is not in allowed_source_ids, it is never emitted (⊆ allowed).
        let mut p = pkg();
        p.allowed_source_ids = vec![];
        assert!(derive_cited_source_ids(&p, &grounded(vec!["F1"])).is_empty());
    }
}
