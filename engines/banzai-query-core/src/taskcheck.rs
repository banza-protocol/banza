//! M2.18B.7 (Semantic Task Fulfilment) — the deterministic Task-Completion validator.
//!
//! The [`crate::validate`] factual validator proves an answer is GROUNDED (every claim has a fact, no
//! invented authority/keys). This second validator proves the answer FULFILS THE TASK: an `example`
//! request actually contains an example (scenario), a `procedure` request contains ordered steps or an
//! explicit "no complete procedure is published" limitation, a `template` request shows real structure
//! (not generic architecture), a `comparison` covers both sides, a `document_lookup` returns metadata.
//!
//! Deterministic and text-signal based (no model, no I/O). It runs AFTER the single Qwen synthesis and
//! BEFORE publishing. An `Incomplete` / `TaskMismatch` verdict means the pipeline must NOT publish the
//! answer as a success — it serves a transparent Rust terminal or a limitation instead. It never triggers
//! another model call.

use crate::normalize;
use crate::obligations::AnswerObligationSet;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskCompletionStatus {
    Complete,
    CompleteWithLimitations,
    Incomplete,
    SourceInadequate,
    MissingRequiredSection,
    TaskMismatch,
    UnsupportedDeliverable,
}

impl TaskCompletionStatus {
    pub fn as_str(&self) -> &'static str {
        use TaskCompletionStatus::*;
        match self {
            Complete => "COMPLETE",
            CompleteWithLimitations => "COMPLETE_WITH_LIMITATIONS",
            Incomplete => "INCOMPLETE",
            SourceInadequate => "SOURCE_INADEQUATE",
            MissingRequiredSection => "MISSING_REQUIRED_SECTION",
            TaskMismatch => "TASK_MISMATCH",
            UnsupportedDeliverable => "UNSUPPORTED_DELIVERABLE",
        }
    }
    /// True when the answer is fit to publish as a success (possibly with declared limitations).
    pub fn publishable(&self) -> bool {
        matches!(
            self,
            TaskCompletionStatus::Complete | TaskCompletionStatus::CompleteWithLimitations
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskCompletionVerdict {
    pub status: String,
    pub requested_task: String,
    pub publishable: bool,
    pub missing: Vec<String>,
    pub note: String,
}

fn any(t: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| t.contains(n))
}

/// Signals that an answer is the generic "I found no specific source, I can answer about: …" list — the
/// exact non-answer M2.18B.7 forbids for a concrete task.
fn is_generic_insufficient(t: &str) -> bool {
    t.contains("nao encontrei uma fonte especifica")
        || (t.contains("posso responder")
            && t.contains("sobre")
            && t.contains("manifest")
            && t.contains("federacao"))
}

/// A transparent, SUBJECT-SPECIFIC limitation (acceptable partial fulfilment), distinct from the generic list.
fn has_transparent_limitation(t: &str) -> bool {
    any(
        t,
        &[
            "nao publica",
            "nao existe um procedimento",
            "nao ha um procedimento",
            "nao disponibiliza um schema",
            "nao existe um schema",
            "nao ha um schema",
            "nao existe um manifest",
            "documentacao publica descreve os requisitos",
            "nao identificam um operador",
            "nao identifica um operador",
            "apenas os passos",
            "passos parciais",
            "procedimento completo",
            "de forma parcial",
            // generalized publish-negation: an honest "X is not published" limitation.
            "nao e publicado",
            "nao esta publicado",
            "nao publicam",
            "nao e disponibilizado",
            "runbook operacional completo",
        ],
    )
}

fn has_scenario(t: &str) -> bool {
    any(
        t,
        &[
            "por exemplo",
            "suponha",
            "imagine",
            "considere",
            "cenario",
            "operador a",
            "operador b",
            "empresa de",
            "uma empresa",
            "ilustrativo",
            "exemplo ilustrativo",
            "exemplo:",
            "neste exemplo",
        ],
    )
}

fn has_steps(t: &str, raw: &str) -> bool {
    // Enumerators ("1.", "1)", "- ", "* ") rely on punctuation that normalize() strips to spaces, so
    // detect an ordered/bulleted list on the RAW markdown (requiring ≥2 enumerators so a lone "1.0"
    // version string does not count); detect prose sequencing on the normalized text.
    let ordered_list = (raw.contains("1.") && raw.contains("2."))
        || (raw.contains("1)") && raw.contains("2)"))
        || raw.matches("\n- ").count() >= 2
        || raw.matches("\n* ").count() >= 2;
    ordered_list
        || any(
            t,
            &[
                "primeiro,",
                "primeiro ",
                "em seguida",
                "de seguida",
                "por fim",
                "seguidamente",
                "passo 1",
                "os passos sao",
                "step 1",
            ],
        )
}

fn has_structure(t: &str, raw: &str) -> bool {
    raw.contains("```")
        || raw.contains('{')
        || any(
            t,
            &[
                "campo obrigatorio",
                "campos obrigatorios",
                "campo opcional",
                "obrigatorio",
                "opcional",
                "tipo:",
                "\"",
            ],
        )
        || raw.matches(':').count() >= 3
}

/// M2.18B.7 DFN-6 / fallback fix — the STRUCTURAL "hard deliverable" tasks whose answer must have a
/// specific SHAPE and substance (a scenario / ordered steps / real fields / a requirements list), and for
/// which a task-unsuitable source genuinely matters. These are the only tasks the completion gate may
/// WITHHOLD (degrade). Documentary/soft tasks (definition, comparison, explanation, impact, consequences,
/// motivation, summary, document lookup) are prose whose correctness is the FACTUAL validator's job: a
/// grounded answer PUBLISHES — a shape/appropriateness heuristic must never degrade it to a safe fallback.
fn is_hard_deliverable(task: &str) -> bool {
    matches!(task, "example" | "procedure" | "template" | "requirements")
}

/// DFN-6 — the number of list ENTRIES that actually carry content (an enumerator/bullet followed by ≥2
/// words), read on the RAW markdown. A "1." / "2." with nothing after it is NOT a step. This is what makes
/// the procedure/requirements substance check semantic, not a token count.
fn content_list_entries(raw: &str) -> usize {
    raw.lines()
        .filter_map(|l| {
            let l = l.trim_start();
            let rest = l
                .strip_prefix("- ")
                .or_else(|| l.strip_prefix("* "))
                .or_else(|| {
                    // "1." / "1)" / "12." style enumerators
                    let digits: String = l.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if digits.is_empty() {
                        return None;
                    }
                    let after = &l[digits.len()..];
                    after
                        .strip_prefix(". ")
                        .or_else(|| after.strip_prefix(") "))
                        .or_else(|| after.strip_prefix(".").filter(|s| !s.is_empty()))
                })?;
            Some(rest.split_whitespace().count())
        })
        .filter(|words| *words >= 2)
        .count()
}

/// DFN-6 — the number of field-like tokens in the RAW text: `"key"` JSON keys, `key: value` lines. Empty
/// braces `{}` carry zero fields, so a hollow "structure" cannot satisfy a template.
fn content_field_tokens(raw: &str) -> usize {
    let json_keys = raw.matches("\":").count() + raw.matches("\" :").count();
    let yaml_fields = raw
        .lines()
        .filter(|l| {
            let l = l.trim();
            l.contains(':')
                && !l.ends_with(':')
                && l.split(':').next().is_some_and(|k| {
                    let k = k.trim();
                    !k.is_empty() && k.len() <= 40 && !k.contains(' ')
                })
        })
        .count();
    json_keys.max(yaml_fields)
}

/// DFN-6 SUBSTANCE — the deliverable carries real, task-appropriate content, not a lone structural token
/// ("1.", "exemplo:", "{}"). This is the SEMANTIC half of the validator: the shape check proves the answer
/// has the right form, this proves the form is actually filled in.
fn has_substance(task: &str, t: &str, raw: &str) -> bool {
    let words = t.split_whitespace().filter(|w| w.len() > 1).count();
    match task {
        // a scenario needs the marker AND enough narrative to be a real example.
        "example" => words >= 12,
        // steps must be ≥2 filled entries, or genuine prose sequencing with enough words.
        "procedure" | "requirements" => content_list_entries(raw) >= 2 || words >= 12,
        // a template needs ≥2 real fields — an empty `{}` or a lone `:` does not qualify.
        "template" => content_field_tokens(raw) >= 2 || (raw.contains("```") && words >= 8),
        "definition" => words >= 6,
        _ => true,
    }
}

/// Validate that `answer_markdown` fulfils the obligations. `cited_source_ids` are the sources the answer
/// cited; `facts_available` is the FactualPackage fact count; `source_appropriate` is the retrieval
/// task-suitability verdict (true when at least one selected source suits the task).
pub fn check_completion(
    obligations: &AnswerObligationSet,
    answer_markdown: &str,
    cited_source_ids: &[String],
    facts_available: usize,
    source_appropriate: bool,
) -> TaskCompletionVerdict {
    use TaskCompletionStatus::*;
    let raw = answer_markdown;
    let t = normalize(answer_markdown);
    let task = obligations.requested_task.as_str();
    let mut missing: Vec<String> = Vec::new();

    let verdict =
        |status: TaskCompletionStatus, missing: Vec<String>, note: &str| TaskCompletionVerdict {
            status: status.as_str().to_string(),
            requested_task: obligations.requested_task.clone(),
            publishable: status.publishable(),
            missing,
            note: note.to_string(),
        };

    // Clarification / Unsupported answers are terminals; nothing to fulfil.
    if task == "clarification" || task == "unsupported" {
        return verdict(Complete, missing, "terminal");
    }

    // Empty or generic-insufficient answers never fulfil a concrete task.
    if t.trim().is_empty() {
        missing.push("answer".into());
        return verdict(Incomplete, missing, "empty answer");
    }
    if is_generic_insufficient(&t) {
        missing.push("subject_specific_content".into());
        return verdict(
            Incomplete,
            missing,
            "generic insufficient list is not a task-specific answer",
        );
    }

    // Grounding: a task that needs citations but has none (and is not an honest limitation) is incomplete.
    if obligations.citation_required
        && cited_source_ids.is_empty()
        && facts_available == 0
        && !has_transparent_limitation(&t)
    {
        missing.push("citations".into());
        return verdict(Incomplete, missing, "citation required but none present");
    }

    // Per-task shape checks.
    match task {
        "example" => {
            if !has_scenario(&t) && !has_transparent_limitation(&t) {
                missing.push("example".into());
                return verdict(
                    Incomplete,
                    missing,
                    "an example request must contain a concrete scenario, not a definition/description",
                );
            }
        }
        "procedure" => {
            if !has_steps(&t, raw) && !has_transparent_limitation(&t) {
                missing.push("procedure".into());
                return verdict(
                    Incomplete,
                    missing,
                    "a procedure request must contain ordered steps OR an explicit no-complete-procedure limitation",
                );
            }
            if !has_steps(&t, raw) && has_transparent_limitation(&t) {
                return verdict(
                    CompleteWithLimitations,
                    missing,
                    "no complete procedure published; requirements/limitation stated transparently",
                );
            }
        }
        "template" => {
            if !has_structure(&t, raw) && !has_transparent_limitation(&t) {
                missing.push("structure".into());
                return verdict(
                    if source_appropriate { Incomplete } else { SourceInadequate },
                    missing,
                    "a template/manifest request must show real structure/fields OR state no schema is available — never generic architecture",
                );
            }
            if !has_structure(&t, raw) && has_transparent_limitation(&t) {
                return verdict(
                    CompleteWithLimitations,
                    missing,
                    "no public schema available; stated transparently",
                );
            }
        }
        "comparison" => {
            // M2.18B.7 (fallback fix) — a comparison is documentary prose, not a structural deliverable.
            // A factually-grounded comparison PUBLISHES; the both-sides signal is advisory (recorded for the
            // trace) and never degrades a valid grounded answer to a safe-fallback banner. (Correctly, e.g.,
            // "manifest vs certificação" explains that the open trust model has no certification authority.)
            let both = cited_source_ids.len() >= 2
                || any(&t, &["por um lado", "ambos", "enquanto que", "diferenca"]);
            if !both {
                missing.push("second_side".into());
            }
        }
        // M2.18B.7 (fallback fix) — a BARE document lookup is now served by the deterministic Tier-1d
        // registry card (title/estado/data/caminho, 0 model calls) BEFORE synthesis. Any document_lookup
        // that still reaches SYNTHESIS is a documentary explanation in disguise (e.g. "como funciona o QR
        // entre operadores"): a factually-validated grounded answer is a legitimate reply, so it is NOT
        // withheld here. (The metadata card is proven separately, in docref.)
        "document_lookup" | "document_metadata" => {}
        "requirements" => {
            let has_list = t.matches("\n- ").count() >= 1
                || any(
                    &t,
                    &[
                        "requisito",
                        "requisitos",
                        "necessario",
                        "obrigatorio",
                        "pre-requisito",
                    ],
                )
                || has_transparent_limitation(&t);
            if !has_list {
                missing.push("requirements".into());
                return verdict(
                    Incomplete,
                    missing,
                    "a requirements request must list the requirements",
                );
            }
        }
        "definition" => {
            // M2.18B.7 (fallback fix) — a definition is documentary prose. A factually-grounded definition
            // PUBLISHES; the "states directly what it is" signal is advisory (recorded for the trace) and
            // never degrades a valid grounded answer — the factual validator already vouches for it. This
            // also covers compound questions ("o que é o manifest E qual a estrutura") that resolve to a
            // single definition task.
            let is_def = any(
                &t,
                &[
                    " e um",
                    " e uma",
                    " e o ",
                    " e a ",
                    "significa",
                    "refere-se",
                    "consiste em",
                    "designa",
                ],
            );
            if !is_def {
                missing.push("definition".into());
            }
        }
        _ => {}
    }

    // DFN-6 — SEMANTIC layer (beyond the structural shape): a hard-deliverable answer must be SUBSTANTIVE —
    // real fields for a template, ≥2 filled steps for a procedure, a narrated scenario for an example. This
    // is what stops a structurally-valid-but-hollow answer (a lone "1.", an empty "{}", "exemplo:") from
    // passing the shape check. Grounding (the factual validator) already anchors the answer to its sources,
    // so this layer proves the deliverable is FILLED IN, not merely shaped. An honest limitation is exempt.
    if is_hard_deliverable(task) && !has_transparent_limitation(&t) && !has_substance(task, &t, raw)
    {
        missing.push("substance".into());
        return verdict(
            Incomplete,
            missing,
            "the deliverable has the shape but lacks substantive content (a bare structural token)",
        );
    }

    // Source appropriateness (grounding-independent): a topically-grounded but task-unsuitable source set.
    // M2.18B.7 (fallback fix) — this withhold applies ONLY to the STRUCTURAL HARD DELIVERABLES (an
    // example/procedure/template/requirements genuinely needs a task-suitable source). For a DOCUMENTARY
    // answer (definition / comparison / impact / consequences / explanation / motivation / summary) that
    // already PASSED the factual validator, a task-suitability heuristic must NOT degrade a valid grounded
    // reply to a "Fallback seguro" banner — grounding is the authority. Publishing a true, sourced answer
    // is the normal mode.
    if is_hard_deliverable(task)
        && obligations.citation_required
        && !source_appropriate
        && !has_transparent_limitation(&t)
    {
        return verdict(
            SourceInadequate,
            missing,
            "sources are on-topic but do not suit the task (e.g. trust model for a procedure)",
        );
    }

    verdict(Complete, missing, "task obligations satisfied")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::obligations::obligations_for;

    fn ob(q: &str) -> AnswerObligationSet {
        obligations_for(q, "")
    }
    fn src(n: usize) -> Vec<String> {
        (0..n).map(|i| format!("ADR-{:03}", i + 1)).collect()
    }

    #[test]
    fn example_answered_with_a_definition_is_incomplete() {
        let o = ob("me da um exemplo de federacao");
        let v = check_completion(
            &o,
            "Um exemplo de federação pode ser encontrado na ADR-031, que descreve avaliação de confiança sem certificados.",
            &src(1),
            2,
            true,
        );
        assert_eq!(v.status, "INCOMPLETE");
        assert!(!v.publishable);
    }

    #[test]
    fn example_with_a_scenario_is_complete() {
        let o = ob("me da um exemplo de federacao");
        let v = check_completion(
            &o,
            "Exemplo ilustrativo: suponha o operador A que publica o seu manifest; o operador B obtém-no por fonte autorizada, verifica integridade e estado, e a avaliação de confiança aplica as regras vigentes.",
            &src(1),
            2,
            true,
        );
        assert_eq!(v.status, "COMPLETE");
        assert!(v.publishable);
    }

    #[test]
    fn procedure_answered_with_an_adr_list_is_incomplete() {
        let o = ob("como federar um operador?");
        let v = check_completion(
            &o,
            "Para federar um operador, deve-se seguir o modelo de confiança aberto sem CA (ADR-027) ou a avaliação de confiança sem certificados (ADR-031).",
            &src(2),
            2,
            true,
        );
        assert_eq!(v.status, "INCOMPLETE");
    }

    #[test]
    fn procedure_with_steps_is_complete() {
        let o = ob("como federar um operador?");
        let v = check_completion(
            &o,
            "Primeiro, prepara o manifest do operador. Em seguida, publica-o numa fonte autorizada. Por fim, a avaliação de confiança verifica integridade e estado.",
            &src(2),
            2,
            true,
        );
        assert_eq!(v.status, "COMPLETE");
    }

    #[test]
    fn procedure_with_transparent_limitation_is_complete_with_limitations() {
        let o = ob("como federar um operador?");
        let v = check_completion(
            &o,
            "A documentação pública descreve os requisitos e o modelo de confiança, mas não publica um procedimento completo passo a passo para federar um operador. Os requisitos confirmados são manifest, identidade e evidência.",
            &src(2),
            2,
            true,
        );
        assert_eq!(v.status, "COMPLETE_WITH_LIMITATIONS");
        assert!(v.publishable);
    }

    #[test]
    fn manifest_answered_with_architecture_is_incomplete() {
        let o = ob("me da exemplo de um manifest valido");
        let v = check_completion(
            &o,
            "Um manifesto válido deve incluir modelos gerais de protocolo, como ledger duplo, implementação de carteira, FSM de transação, roteamento e liquidação.",
            &src(1),
            1,
            true,
        );
        assert!(v.status == "INCOMPLETE" || v.status == "SOURCE_INADEQUATE");
        assert!(!v.publishable);
    }

    #[test]
    fn manifest_with_structure_is_complete() {
        let o = ob("mostra a estrutura de um manifest valido");
        let v = check_completion(
            &o,
            "Estrutura ilustrativa de um manifest de operador:\n```json\n{\n  \"operator_id\": \"op-exemplo\",\n  \"version\": \"1\",\n  \"endpoints\": {}\n}\n```",
            &src(1),
            1,
            true,
        );
        assert_eq!(v.status, "COMPLETE");
    }

    #[test]
    fn generic_insufficient_list_never_fulfils_a_task() {
        let o = ob("me da um exemplo de operador");
        let v = check_completion(
            &o,
            "Não encontrei uma fonte específica para esse pedido. Posso responder, com base nas fontes do protocolo, sobre: manifest, federação, participação.",
            &[],
            0,
            false,
        );
        assert_eq!(v.status, "INCOMPLETE");
    }

    // ── M2.18B.7 DFN-6 — the SEMANTIC substance layer (the shape must be FILLED IN, not just present) ──
    #[test]
    fn dfn6_content_list_entries_counts_only_filled_steps() {
        // bare enumerators carry no content; filled ones do.
        assert_eq!(content_list_entries("1.\n2.\n3."), 0);
        assert_eq!(
            content_list_entries("1. publica o manifesto\n2. submete a avaliacao de confianca"),
            2
        );
        assert_eq!(
            content_list_entries("- primeiro passo real\n- segundo passo real"),
            2
        );
    }

    #[test]
    fn dfn6_content_field_tokens_counts_real_fields_not_empty_braces() {
        assert_eq!(content_field_tokens("{}"), 0);
        assert!(content_field_tokens("{ \"operator_id\": \"x\", \"version\": \"1\" }") >= 2);
        assert!(content_field_tokens("operator_id: x\nversion: 1\nendpoints: {}") >= 2);
    }

    #[test]
    fn dfn6_bare_structural_token_lacks_substance() {
        // a procedure whose "steps" are just enumerator tokens with no content is INCOMPLETE, not COMPLETE.
        let o = ob("como federar um operador");
        let v = check_completion(&o, "Passos para federar:\n1.\n2.", &src(1), 1, true);
        assert_eq!(v.status, "INCOMPLETE", "note={}", v.note);
        assert!(v
            .missing
            .iter()
            .any(|m| m == "substance" || m == "procedure"));
    }

    #[test]
    fn dfn6_empty_object_template_lacks_substance() {
        // a template whose "structure" is an empty object has the shape but no fields → INCOMPLETE.
        let o = ob("mostra a estrutura de um manifest valido");
        let v = check_completion(&o, "Estrutura:\n```json\n{}\n```", &src(1), 1, true);
        assert!(
            v.status == "INCOMPLETE" || v.status == "SOURCE_INADEQUATE",
            "note={} status={}",
            v.note,
            v.status
        );
        assert!(!v.publishable);
    }

    // M2.18B.7 (fallback fix) — a factually-grounded DOCUMENTARY answer publishes even when the retrieval
    // task-suitability signal is false; only the HARD deliverables are withheld for source appropriateness.
    #[test]
    fn a_grounded_documentary_answer_publishes_despite_source_appropriateness() {
        let grounded = "No BANZA a confiança é avaliada por evidência verificável, sem autoridade certificadora central; a raiz de confiança ancora a metadata assinada que cada participante avalia localmente.";
        for q in [
            "qual o impacto da raiz de confiança",
            "quais as consequências do ledger duplo",
            "como funciona um pagamento qr entre operadores",
        ] {
            let o = ob(q);
            let v = check_completion(&o, grounded, &src(1), 2, false); // source_appropriate = false
            assert_eq!(
                v.status, "COMPLETE",
                "{q} → a grounded documentary answer must publish (got {} / {})",
                v.status, v.note
            );
            assert!(v.publishable);
        }
        // but a HARD deliverable (template) with an unsuitable source is still withheld.
        let o = ob("mostra a estrutura de um manifest valido");
        let v = check_completion(
            &o,
            "Um manifesto envolve modelos gerais de arquitetura do protocolo.",
            &src(1),
            1,
            false,
        );
        assert!(
            !v.publishable,
            "a template with an unsuitable source must still be withheld: {}",
            v.status
        );
    }

    #[test]
    fn dfn6_real_substantive_answers_still_complete() {
        // regression: a genuine, substantive procedure AND a real-field template still pass.
        let o = ob("como federar um operador");
        let v = check_completion(
            &o,
            "Para federar um operador:\n1. Publicar o manifesto do operador com os endpoints e a chave pública.\n2. Submeter a avaliação de confiança segundo a ADR-031.\n3. Aguardar a inclusão no conjunto de confiança federado.",
            &src(2),
            3,
            true,
        );
        assert_eq!(v.status, "COMPLETE", "note={}", v.note);

        let o2 = ob("mostra a estrutura de um manifest valido");
        let v2 = check_completion(
            &o2,
            "Estrutura ilustrativa:\n```json\n{\n  \"operator_id\": \"op-x\",\n  \"version\": \"1\",\n  \"endpoints\": {}\n}\n```",
            &src(1),
            1,
            true,
        );
        assert_eq!(v2.status, "COMPLETE", "note={}", v2.note);
    }
}
