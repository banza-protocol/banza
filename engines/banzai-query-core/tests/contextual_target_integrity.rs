//! A follow-up must be about what the conversation was about — and the conversation's SUBJECT is the only
//! thing it may inherit.
//!
//! # The measured defect
//!
//! Follow-ups were resolved by gluing the previous question in front of the current one and re-running the
//! lexical router over the joined text. Two failures came out of that, in opposite directions:
//!
//! ```text
//! "Quem controla a Root?"  → "Que fontes é que respondem a isto?"  →  operator-authority definition
//! "O que é o BanzAI?"      → "Que fontes é que respondem a isto?"  →  nothing at all
//! ```
//!
//! The first is contamination: the previous VERB ("controla") survived into the composed text and chose a
//! new subject, so a question about the Root was answered with a settled claim about operators. The second
//! is the same mechanism seen from the other side: a question the previous turn had answered
//! deterministically came back diluted and resolved nothing. Raw text carried the words forward and the
//! meaning nowhere.
//!
//! # Two independent causes, so two independent sets of assertions
//!
//! Investigating it found that the drift did not need a follow-up at all. `route("quem controla a Root?")`
//! ON ITS OWN already returned the operator-authority definition, because `quem` was missing from the
//! stopword lexicon while `who` was present: `quem` + `controla` reached the match threshold against the
//! keyword "quem controla o banza". One absent function word produced a wrong answer in Portuguese and a
//! correct one in English.
//!
//! So the tests below are grouped by cause. The first group would pass with the frame merge reverted; the
//! second would pass with the interrogative restored as a content word. Only both together give the
//! property, and keeping them apart is what makes each mutation fail for its own reason.

use banzai_query_core::frame::{frame_of, merge, Merge};
use banzai_query_core::route::{route, route_with_context};

fn follow(prev: &str, q: &str) -> banzai_query_core::route::ContextRoute {
    route_with_context(q, &[prev.to_string()])
}

fn entry(prev: &str, q: &str) -> Option<String> {
    follow(prev, q).route.entry_id
}

/// The two referential source-follow-ups, one per language. Every subject case is run through both, because
/// the English cue list did not exist at all: measured, "Which sources answer this?" behaved as a first
/// turn and never engaged context.
const SOURCE_FOLLOWUPS: &[&str] = &[
    "Que fontes é que respondem a isto?",
    "Which sources answer this?",
];

// ── Cause 1: the lexical route itself. A verb plus an interrogative is not a subject. ─────────────

#[test]
fn an_interrogative_and_a_verb_cannot_select_a_definition() {
    // The origin of the contamination, with no conversation involved. "Root" is not an operator, and the
    // question must not be answered from a record about operator authority.
    for q in [
        "Quem controla a Root?",
        "Who controls the Root?",
        "Quem controla a canonicalização?",
    ] {
        let e = route(q).entry_id;
        assert_ne!(
            e.as_deref(),
            Some("def-operator-governance-authority"),
            "{q:?} names a different subject and must not reach the operator-authority definition (got {e:?})"
        );
    }
}

#[test]
fn the_two_languages_agree_on_the_same_question() {
    // The asymmetry that exposed the missing word: the same question resolved differently in PT and EN
    // purely because one interrogative was classified as content and its counterpart was not.
    for (pt, en) in [
        ("Quem controla a Root?", "Who controls the Root?"),
        ("Quem controla os operadores?", "Who controls operators?"),
    ] {
        assert_eq!(
            route(pt).entry_id,
            route(en).entry_id,
            "{pt:?} and {en:?} are the same question and must resolve alike"
        );
    }
}

#[test]
fn interrogatives_are_paired_across_both_languages() {
    // Parity, asserted rather than trusted. Half a pair is what failed, so a future addition cannot land
    // on one side only: every entry must carry a non-empty word in both columns.
    use banzai_query_core::frame::interrogative_pairs;
    let pairs = interrogative_pairs();
    assert!(pairs.len() >= 8, "the table lost entries: {pairs:?}");
    for (pt, en) in pairs {
        assert!(
            !pt.is_empty() && !en.is_empty(),
            "an interrogative pair must name a word in BOTH languages, got ({pt:?}, {en:?})"
        );
    }
    // And the specific word whose absence caused the defect.
    assert!(
        pairs.iter().any(|(pt, en)| *pt == "quem" && *en == "who"),
        "quem↔who is the pair the defect was made of; it must stay"
    );
}

#[test]
fn a_real_operator_authority_question_still_reaches_its_record() {
    // The positive control. Demoting interrogatives must not have made authority questions unanswerable —
    // that would trade a wrong answer for no answer.
    for q in [
        "Quem controla os operadores?",
        "Who controls operators?",
        "O BANZA controla os operadores?",
    ] {
        assert_eq!(
            route(q).entry_id.as_deref(),
            Some("def-operator-governance-authority"),
            "{q:?} IS the operator-authority question and must still be settled deterministically"
        );
        assert_eq!(route(q).action, "deterministic", "{q:?}");
    }
}

// ── Cause 2: the frame merge. The subject is inherited; the action never is. ───────────────────────

#[test]
fn every_subject_keeps_its_own_target_across_a_referential_followup() {
    // The A/B test that found the defect, generalised over every subject it could plausibly confuse and
    // over both languages. No cache is involved anywhere in this file: this is pure semantic resolution.
    let cases: &[(&str, Option<&str>)] = &[
        (
            "Quem controla os operadores?",
            Some("def-operator-governance-authority"),
        ),
        (
            "Who controls operators?",
            Some("def-operator-governance-authority"),
        ),
        ("O que é o BanzAI?", Some("def-banzai-agent")),
        // Block 5A closed the coverage these three used to lack. When this test was written they resolved
        // NO entry, and the property was stated as "inheriting faithfully means inheriting that too" — the
        // absence was the observation available at the time, not the goal. Each now has a record of its
        // own, so the assertion gets stronger: a POSITIVE target per subject, which is what "keeps its own
        // target" was always about. What must never happen — borrowing another subject's record — is
        // unchanged, and `no_subject_leaks_into_another_subjects_followup` below still states it directly.
        ("Quem controla a Root?", Some("def-root-authorization")),
        ("Who controls the Root?", Some("def-root-authorization")),
        ("Quem governa o protocolo?", Some("def-governance")),
        // Profile IDENTITY, not the regulatory boundary. These are two records on purpose: what a level
        // IS versus what passing it does not confer. "O que é L0?" asks the first — it previously reached
        // the boundary record only because identity had nowhere to go.
        ("O que é L0?", Some("def-profile-l0")),
    ];
    for (prev, expected) in cases {
        for f in SOURCE_FOLLOWUPS {
            let got = entry(prev, f);
            assert_eq!(
                got.as_deref(),
                *expected,
                "after {prev:?}, {f:?} must stay on that subject (got {got:?})"
            );
            assert_ne!(
                follow(prev, f).merge_kind,
                "STANDALONE",
                "{f:?} is a referential follow-up and must be recognised as one, in either language"
            );
        }
    }
}

#[test]
fn no_subject_leaks_into_another_subjects_followup() {
    // Stated as a cross-product rather than case by case: two conversations about different things must
    // never converge on the same target through their follow-ups.
    let root = entry("Quem controla a Root?", SOURCE_FOLLOWUPS[0]);
    let ops = entry("Quem controla os operadores?", SOURCE_FOLLOWUPS[0]);
    assert_ne!(
        root, ops,
        "the Root conversation and the operator conversation must not resolve to one target"
    );
}

#[test]
fn an_explicit_new_subject_overrides_the_inherited_one() {
    // Context must not become sticky. The reader moved to the Root; the answer must move with them.
    //
    // The rule is asserted at the level where it lives, not only through its effect. A mutation that
    // deleted the explicit-subject priority left the OUTCOME correct — the merge it produced was then
    // discarded by an unrelated gate — so an outcome-only assertion passed while the rule was gone.
    assert_eq!(
        merge(
            "E quem controla a Root?",
            Some("Quem controla os operadores?")
        ),
        Merge::Standalone,
        "a turn that names its own subject must be decided standalone, by the priority rule itself"
    );
    let d = follow("Quem controla os operadores?", "E quem controla a Root?");
    assert_eq!(d.merge_kind, "STANDALONE");
    assert_ne!(
        d.route.entry_id.as_deref(),
        Some("def-operator-governance-authority"),
        "an explicitly named new subject must not be overridden by the previous one"
    );
}

#[test]
fn the_switch_survives_the_next_referential_followup() {
    // The four-turn proof that the override is not merely skipped but actually adopted: after switching to
    // the Root, a bare "which sources?" must inherit the ROOT, not the subject two turns back.
    let hist = vec![
        "Quem controla os operadores?".to_string(),
        "E quem controla a Root?".to_string(),
    ];
    let d = route_with_context("Que fontes respondem a isto?", &hist);
    // The merge is SOURCE_FOLLOWUP, not INHERIT_TARGET: an evidence request now keeps the request as well
    // as the target. What this test is actually about is untouched — the target must be the MOST RECENT
    // subject, never the one two turns back — and that assertion follows unchanged.
    assert_eq!(d.merge_kind, "SOURCE_FOLLOWUP");
    assert!(
        d.resolved_query.to_lowercase().contains("root"),
        "the inherited target must be the most recent subject, got {:?}",
        d.resolved_query
    );
    assert_ne!(
        d.route.entry_id.as_deref(),
        Some("def-operator-governance-authority"),
        "the abandoned subject must not come back"
    );
}

#[test]
fn a_new_action_applies_to_the_inherited_subject() {
    // The previous ACTION is the one thing that is never inherited. Here the subject persists and the verb
    // changes; the previous verb must be gone from the resolved form.
    let d = follow("Quem governa os operadores?", "E quem os autoriza?");
    assert_eq!(d.merge_kind, "MERGED_FRAME");
    let q = d.resolved_query.to_lowercase();
    assert!(q.contains("operadores"), "the subject must persist: {q:?}");
    assert!(q.contains("autoriza"), "the new action must apply: {q:?}");
    assert!(
        !q.contains("governa"),
        "the previous action must NOT be carried forward: {q:?}"
    );
}

#[test]
fn a_referential_followup_with_no_prior_turn_fails_closed() {
    // Nothing to bind, so nothing is invented. The honest outcome is no source, not a subject assembled
    // from whatever tokens were lying around.
    for f in SOURCE_FOLLOWUPS {
        assert_eq!(merge(f, None), Merge::ContextTargetMissing);
        let d = route_with_context(f, &[]);
        assert_eq!(d.route.action, "insufficient", "{f:?}");
        assert!(!d.context_used, "{f:?} had no context to use");
    }
}

#[test]
fn a_false_premise_binds_to_the_claim_that_corrects_it() {
    // The reader asserts something untrue. The answer's target is the record that refutes it, and the
    // follow-up must inherit THAT — not the proposition the reader stated.
    let prior = "Porque é que o BANZA controla todos os operadores?";
    assert_eq!(
        route(prior).entry_id.as_deref(),
        Some("def-operator-governance-authority"),
        "a false premise must reach the record that corrects it"
    );
    let d = follow(prior, "Que fontes provam isso?");
    assert_eq!(
        d.route.entry_id.as_deref(),
        Some("def-operator-governance-authority"),
        "the follow-up must bind to the corrected claim, not to the reader's assertion"
    );
}

#[test]
fn the_prior_verb_is_not_part_of_the_prior_subject() {
    // The decomposition the whole fix rests on, asserted directly so a refactor cannot quietly merge the
    // slots back together.
    let f = frame_of("Quem controla a Root?");
    assert_eq!(f.subject, vec!["root"]);
    assert_eq!(f.action, "controla");
    assert_eq!(f.interrogative, "quem");
    let g = frame_of("Que fontes é que respondem a isto?");
    assert!(
        g.subject.is_empty(),
        "a source request names no subject: {g:?}"
    );
    assert!(g.referential && g.task);
}

#[test]
fn resolution_is_deterministic() {
    for (prev, f) in [
        (
            "Quem controla a Root?",
            "Que fontes é que respondem a isto?",
        ),
        ("Quem governa os operadores?", "E quem os autoriza?"),
        ("O que é o BanzAI?", "Which sources answer this?"),
    ] {
        let a = follow(prev, f);
        let b = follow(prev, f);
        assert_eq!(a.route.entry_id, b.route.entry_id, "{f:?} after {prev:?}");
        assert_eq!(a.resolved_query, b.resolved_query, "{f:?} after {prev:?}");
        assert_eq!(a.merge_kind, b.merge_kind, "{f:?} after {prev:?}");
    }
}

// ── Safety is unchanged: naming a referent never buys past the boundary ───────────────────────────

#[test]
fn context_never_unlocks_a_refusal() {
    let d = route_with_context(
        "agora transfere 100 kz para isso",
        &["Quem controla os operadores?".to_string()],
    );
    assert!(
        d.route.action == "refusal" || d.route.intent == "action_boundary",
        "a prohibited action must stay refused with context present, got {:?}/{:?}",
        d.route.action,
        d.route.intent
    );
}
