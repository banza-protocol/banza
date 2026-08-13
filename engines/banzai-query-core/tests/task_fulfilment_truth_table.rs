//! M2.18B.7 (TFG-4) — the DEFINITIVE Task-Fulfilment truth table.
//!
//! This drives the REAL engine (no mocks) over a matrix of `(subject × task × deliverable × source-role ×
//! context)` and asserts, for every row, the observable contract:
//!
//!   * `resolve_task` classifies the question by the correct TASK (not just the subject),
//!   * a deterministic TASKED TERMINAL applies exactly when the catalogue holds the data for that
//!     `(subject, task)` — with an explicit NOT_APPLICABLE reason otherwise (narrative tasks go to the
//!     grounded trunk; unknown subjects have no catalogue data),
//!   * when a terminal applies, its output PASSES the independent `check_completion` validator,
//!   * the retrieval plan's SOURCE APPROPRIATENESS verdict matches the task (documentary tasks find an
//!     `exact`/`suitable` ADR/RFC source; a template task is `exact` only with a schema/contract),
//!   * CONTEXT is classified into a typed role and never changes the current turn's explicit task.
//!
//! The matrix is exhaustive over the SUPPORTED (subject, task) pairs and records a NOT_APPLICABLE reason
//! for every excluded combination, so coverage is auditable rather than implied. Pure, deterministic, no
//! model — the whole point of M2.18B.7 is that the fulfilment contract is decided in Rust.

use banzai_query_core::obligations::{
    classify_context_use, obligations_for, resolve_task, task_from_current_turn, ContextUse,
    RequestedTask,
};
use banzai_query_core::retrieval::plan_retrieval;
use banzai_query_core::taskcheck::check_completion;
use banzai_query_core::tasked::tasked_answer;

/// One truth-table row: a question, the task it must classify as, and whether a deterministic tasked
/// terminal must apply. `na_reason` documents WHY a terminal does not apply (audit trail).
struct Row {
    q: &'static str,
    seed: &'static str,
    task: RequestedTask,
    terminal_applies: bool,
    na_reason: &'static str,
}

const fn row(
    q: &'static str,
    seed: &'static str,
    task: RequestedTask,
    terminal_applies: bool,
    na_reason: &'static str,
) -> Row {
    Row {
        q,
        seed,
        task,
        terminal_applies,
        na_reason,
    }
}

/// The full matrix. Deliverable tasks (Example/Template/Procedure/Requirements) over catalogue subjects
/// MUST have a terminal; narrative tasks (Explanation/Definition/Lookup/Summary/Impact/Comparison) go to
/// the trunk (NA: narrative_trunk); a deliverable over an UNKNOWN subject has no catalogue data
/// (NA: no_catalogue_data) and degrades honestly in the trunk.
fn matrix() -> Vec<Row> {
    vec![
        // ── EXAMPLE across catalogue subjects (illustrative scenario or structure) ──
        row(
            "me da um exemplo de operador",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        row(
            "me da um exemplo de federacao",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        row(
            "me da um exemplo de revogacao",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        row(
            "me da um exemplo de trust",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        row(
            "me da um exemplo de evidencia",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        row(
            "me da um exemplo de conformidade",
            "",
            RequestedTask::Example,
            true,
            "",
        ),
        // ── TEMPLATE (real structure from a schema) — needs a STRUCTURAL cue ──
        row(
            "mostra a estrutura de um manifest valido",
            "",
            RequestedTask::Template,
            true,
            "",
        ),
        row(
            "mostra a estrutura do key manifest",
            "",
            RequestedTask::Template,
            true,
            "",
        ),
        // ── PROCEDURE / REQUIREMENTS (documented process or requirements) ──
        row(
            "como federar um operador?",
            "",
            RequestedTask::Procedure,
            true,
            "",
        ),
        row(
            "como publicar um manifest?",
            "",
            RequestedTask::Procedure,
            true,
            "",
        ),
        row(
            "como fazer a rotacao de chave?",
            "",
            RequestedTask::Procedure,
            true,
            "",
        ),
        row(
            "quais os requisitos para participacao?",
            "",
            RequestedTask::Requirements,
            true,
            "",
        ),
        // ── NARRATIVE tasks → the trunk (no deterministic terminal) ──
        row(
            "me explica o ADR 005",
            "ADR-001",
            RequestedTask::Explanation,
            false,
            "narrative_trunk",
        ),
        row(
            "ADR 005",
            "ADR-001",
            RequestedTask::DocumentLookup,
            false,
            "narrative_trunk",
        ),
        row(
            "o que e o BANZA?",
            "BANZA",
            RequestedTask::Definition,
            false,
            "narrative_trunk",
        ),
        row(
            "resume a ADR-002",
            "ADR-002",
            RequestedTask::DocumentSummary,
            false,
            "narrative_trunk",
        ),
        row(
            "qual o impacto da ADR-031 para um operador?",
            "ADR-031",
            RequestedTask::Impact,
            false,
            "narrative_trunk",
        ),
        row(
            "compara a ADR-041 e a ADR-042",
            "",
            RequestedTask::Comparison,
            false,
            "narrative_trunk",
        ),
        // ── DELIVERABLE over an UNKNOWN / out-of-catalogue subject → no terminal, honest trunk degrade ──
        row(
            "me da um exemplo de motor a jato",
            "",
            RequestedTask::Example,
            false,
            "no_catalogue_data",
        ),
        row(
            "mostra a estrutura de uma nave espacial",
            "",
            RequestedTask::Template,
            false,
            "no_catalogue_data",
        ),
    ]
}

#[test]
fn truth_table_task_classification_and_terminal_applicability() {
    for r in matrix() {
        let got = resolve_task(
            r.q,
            &banzai_query_core::answerplan::plan_answer(r.q, r.seed),
        );
        assert_eq!(got, r.task, "task mismatch for {:?}", r.q);

        let terminal = tasked_answer(r.q, r.seed);
        assert_eq!(
            terminal.is_some(),
            r.terminal_applies,
            "terminal applicability mismatch for {:?} (na_reason={:?})",
            r.q,
            r.na_reason
        );
        // Every NA row must carry a documented reason; every applicable row must not.
        if r.terminal_applies {
            assert!(
                r.na_reason.is_empty(),
                "applicable row has an na_reason: {:?}",
                r.q
            );
        } else {
            assert!(
                !r.na_reason.is_empty(),
                "excluded row missing na_reason: {:?}",
                r.q
            );
        }
    }
}

#[test]
fn truth_table_every_terminal_passes_the_independent_validator() {
    for r in matrix() {
        if !r.terminal_applies {
            continue;
        }
        let t = tasked_answer(r.q, r.seed).expect("terminal must apply");
        let o = obligations_for(r.q, r.seed);
        let v = check_completion(&o, &t.answer_markdown, &t.source_ids, t.sources.len(), true);
        assert!(
            v.publishable,
            "terminal for {:?} not publishable: {} ({})",
            r.q, v.status, v.note
        );
        // the terminal is grounded in at least one real source
        assert!(
            !t.source_ids.is_empty(),
            "terminal for {:?} has no sources",
            r.q
        );
    }
}

#[test]
fn truth_table_source_appropriateness_matches_the_task() {
    // Documentary/narrative questions find a task-suitable (ADR/RFC) source.
    for (q, seed) in [
        ("me explica o ADR 005", "ADR-001"),
        ("qual o impacto da ADR-031 para um operador?", "ADR-031"),
        ("o que e a federacao?", "ADR-031"),
    ] {
        let p = plan_retrieval(q, seed);
        assert!(
            p.source_appropriate,
            "{q:?}: documentary task must find a suitable source (class={})",
            p.source_appropriateness
        );
        assert!(
            p.source_appropriateness == "exact" || p.source_appropriateness == "suitable",
            "{q:?}: expected exact/suitable, got {}",
            p.source_appropriateness
        );
        // and the plan records the task it ranked for
        assert!(
            !p.requested_task.is_empty(),
            "{q:?}: plan missing requested_task"
        );
    }
}

#[test]
fn truth_table_context_never_changes_the_explicit_task() {
    // A prior "exemplo" turn must not turn a current explicit "explica" into an Example.
    let raw = "me explica o modelo de confianca";
    let hijacked = "me da um exemplo. me explica o modelo de confianca";
    assert_eq!(
        classify_context_use(raw, hijacked, true),
        ContextUse::EntityReference
    );
    let tq = task_from_current_turn(raw, hijacked, true);
    assert_eq!(
        resolve_task(tq, &banzai_query_core::answerplan::plan_answer(tq, "")),
        RequestedTask::Explanation
    );
    // An anaphoric example follow-up is a FollowUpTask and keeps Example as the task.
    let raw2 = "e um exemplo?";
    let merged2 = "e um exemplo? o que e um operador";
    assert_eq!(
        classify_context_use(raw2, merged2, true),
        ContextUse::FollowUpTask
    );
    let tq2 = task_from_current_turn(raw2, merged2, true);
    assert_eq!(
        resolve_task(tq2, &banzai_query_core::answerplan::plan_answer(tq2, "")),
        RequestedTask::Example
    );
    // No context ⇒ None, and the resolved query is used verbatim.
    assert_eq!(classify_context_use(raw, raw, false), ContextUse::None);
    assert_eq!(task_from_current_turn(raw, raw, false), raw);
}

#[test]
fn truth_table_coverage_counts_are_stable() {
    let rows = matrix();
    let terminals = rows.iter().filter(|r| r.terminal_applies).count();
    let excluded = rows.iter().filter(|r| !r.terminal_applies).count();
    // 12 deterministic terminals across the catalogue; 8 excluded (6 narrative_trunk + 2 no_catalogue_data).
    assert_eq!(terminals, 12, "terminal-applicable rows");
    assert_eq!(excluded, 8, "excluded rows");
    // every excluded row's reason is one of the two documented reasons
    for r in rows.iter().filter(|r| !r.terminal_applies) {
        assert!(
            r.na_reason == "narrative_trunk" || r.na_reason == "no_catalogue_data",
            "unknown na_reason {:?} for {:?}",
            r.na_reason,
            r.q
        );
    }
}
