//! The semantic frame of a turn, and the deterministic rule for merging a follow-up into the one before it.
//!
//! # Why this exists
//!
//! A follow-up used to be resolved by gluing the previous question in front of the current one and running
//! the lexical router over the result:
//!
//! ```text
//! "Quem controla a Root?" + "Que fontes é que respondem a isto?"  →  lexical resolve
//! ```
//!
//! Measured, that produced the operator-authority definition — a settled claim about *operators* — for a
//! conversation about the *Root*. The previous turn's VERB survived into the composed text and chose a new
//! subject. And the reverse failure was just as real: after "O que é o BanzAI?", the same follow-up resolved
//! nothing at all, because the concatenation diluted a question that the previous turn had answered
//! deterministically. Raw text carried the words forward and the MEANING nowhere.
//!
//! So a turn is represented by three slots instead of by its prose:
//!
//!   INTERROGATIVE  who / which / how …            — the shape of the question
//!   ACTION         controls / authorises / …      — the authority dimension being asked about
//!   SUBJECT        operators / Root / L0 / …      — what the question is ABOUT
//!
//! The subject is the only slot that is ever inherited, and the previous turn's action is never inherited
//! into a turn that states its own. That single asymmetry is what stops a verb from choosing a subject.
//!
//! # What this is NOT
//!
//! Not a coreference resolver and not a parser. The three lexicons below are closed, small and bilingual,
//! and every word in them is a function word or one of the authority verbs the concept registry already
//! binds to an establishing record. A word this module cannot classify is treated as SUBJECT material,
//! which is the conservative direction: an unknown word keeps the turn standalone rather than silently
//! inheriting someone else's subject.

use crate::normalize;

/// Words that refer BACK to the previous turn instead of naming something. PT + EN.
///
/// Bilingual by construction: the previous cue list was Portuguese-only, so an English follow-up never
/// engaged context at all — measured, "Which sources answer this?" behaved as a first turn.
const REFERENTIAL: &[&str] = &[
    "isto",
    "isso",
    "disso",
    "nisso",
    "deste",
    "desta",
    "essa decisao",
    "esta decisao",
    "essa separacao",
    "esta separacao",
    "estas fontes",
    "essas fontes",
    "this",
    "that",
    "these",
    "those",
    "them",
    "it",
];

/// Words that describe what the reader wants DONE with the previous answer, not a new subject.
///
/// "Which sources answer this?" is a request to show the evidence behind the previous claim. Treating
/// "sources" as a subject is what turned it into a fresh search.
const TASK: &[&str] = &[
    "fonte",
    "fontes",
    "respondem",
    "responde",
    "provam",
    "prova",
    "suporta",
    "suportam",
    "sustenta",
    "sustentam",
    "define",
    "definem",
    "source",
    "sources",
    "answer",
    "answers",
    "prove",
    "proves",
    "support",
    "supports",
    "defines",
];

/// The authority verbs. Each one is a dimension the concept registry already binds to the record that
/// ESTABLISHES it (control → ADR-002, governance → ADR-004, certification → ADR-005, admission → ADR-006,
/// authorisation → ADR-007), so this is the same vocabulary read one word at a time — not a new taxonomy.
const ACTION: &[(&str, &str)] = &[
    ("controla", "controls"),
    ("controlam", "control"),
    ("governa", "governs"),
    ("governam", "govern"),
    ("autoriza", "authorizes"),
    ("autorizam", "authorise"),
    ("certifica", "certifies"),
    ("certificam", "certify"),
    ("admite", "admits"),
    ("admitem", "admit"),
    ("supervisiona", "supervises"),
    ("supervisionam", "supervise"),
    ("aprova", "approves"),
    ("aprovam", "approve"),
];

fn is_referential(tok: &str) -> bool {
    REFERENTIAL.contains(&tok)
}

fn is_task(tok: &str) -> bool {
    TASK.contains(&tok)
}

fn is_action(tok: &str) -> bool {
    ACTION.iter().any(|(pt, en)| *pt == tok || *en == tok)
}

fn is_interrogative(tok: &str) -> bool {
    crate::INTERROGATIVES
        .iter()
        .any(|(pt, en)| *pt == tok || *en == tok)
}

/// The PT↔EN interrogative table, for the parity test. Exposed read-only: the point is that a test can
/// assert both halves of every pair exist, because half a pair is exactly what failed.
pub fn interrogative_pairs() -> &'static [(&'static str, &'static str)] {
    crate::INTERROGATIVES
}

/// Grammatical filler that carries no slot: articles, prepositions, clitics, copulas.
///
/// Deliberately narrow. Anything not listed here and not classified above becomes SUBJECT material, so a
/// word this module has never seen makes a turn look standalone — never makes it inherit.
const FILLER: &[&str] = &[
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos", "e", "em",
    "no", "na", "nos", "nas", "ao", "aos", "que", "se", "sobre", "para", "por", "com", "the", "an",
    "of", "in", "on", "to", "for", "and", "is", "are", "does", "do", "about",
];

fn is_filler(tok: &str) -> bool {
    FILLER.contains(&tok)
}

/// A turn decomposed into the three slots that decide where it grounds.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Frame {
    /// The interrogative the CURRENT turn used ("quem", "which", …), or "".
    pub interrogative: String,
    /// The authority verb the turn asks about, or "".
    pub action: String,
    /// What the turn is about — the tokens that name something.
    pub subject: Vec<String>,
    /// The turn refers back to the previous one.
    pub referential: bool,
    /// The turn asks what supports the previous answer.
    pub task: bool,
    /// How the answer should be rendered ("em JSON"), rather than what it is about. Kept apart from
    /// `subject` because a format that happens to be resolvable vocabulary would otherwise be read as a
    /// change of topic.
    pub modifier: Vec<String>,
}

impl Frame {
    /// A turn that names nothing of its own and only points back at the previous one.
    ///
    /// This is the case that must INHERIT rather than re-resolve. It requires an actual backward reference:
    /// a bare "que fontes?" with no referent is not a follow-up, it is an underspecified first turn.
    pub fn is_pure_reference(&self) -> bool {
        self.referential && self.subject.is_empty() && self.action.is_empty()
    }

    /// A turn that states a NEW action over the PREVIOUS subject ("e quem os autoriza?").
    pub fn is_action_update(&self) -> bool {
        !self.action.is_empty() && self.subject.is_empty()
    }

    /// The turn names its own subject, so nothing may be inherited over it (§ explicit override).
    /// Does this turn name a subject the engine can actually RESOLVE?
    ///
    /// "An explicit new subject always wins" is the right rule; the defect was what counted as one. Every
    /// non-filler token landed in the subject slot, so "me da um exemplo aqui" claimed the subject
    /// "exemplo" and "são a mesma coisa?" claimed "coisa" — and both then short-circuited inheritance as
    /// though the speaker had changed topic. A turn that leans entirely on the previous one was read as
    /// standing alone, which is the opposite of what it does.
    ///
    /// Eligibility is decided by `glossary::is_nameable_subject`, which asks the resolvers rather than a
    /// word list. A word nobody can resolve is not a topic change; it is filler with a noun's shape.
    ///
    /// A token that only names a FORMAT does not count either, and that is a separate slot rather than a
    /// special case: "mostra em JSON" asks for the previous answer rendered differently, so treating JSON
    /// as the new topic loses the topic entirely.
    pub fn has_own_subject(&self) -> bool {
        self.subject
            .iter()
            .any(|t| crate::glossary::is_nameable_subject(t))
    }
}

/// Decompose a question into its frame. Deterministic and allocation-light; no registry lookups, so it
/// cannot disagree with retrieval about what a word means — it only decides which SLOT a word fills.
pub fn frame_of(question: &str) -> Frame {
    let nq = normalize(question);
    let mut f = Frame::default();
    // Multi-word referential phrases first: "essa decisão" must not be read as the subject "decisão".
    for phrase in REFERENTIAL.iter().filter(|p| p.contains(' ')) {
        if nq.contains(phrase) {
            f.referential = true;
        }
    }
    // A token introduced by "em"/"in" states HOW the answer should look, not WHAT it is about. Without
    // this, "mostra em JSON" claimed JSON as its subject the moment JSON became resolvable vocabulary, and
    // a request to re-render the previous answer read as a change of topic.
    let mut prev = "";
    for tok in nq.split_whitespace() {
        let t = tok.trim_matches(|c: char| !c.is_alphanumeric());
        if t.is_empty() {
            continue;
        }
        let is_modifier = matches!(prev, "em" | "in");
        prev = t;
        if is_modifier {
            f.modifier.push(t.to_string());
            continue;
        }
        if is_referential(t) {
            f.referential = true;
        } else if is_task(t) {
            f.task = true;
        } else if is_action(t) {
            if f.action.is_empty() {
                f.action = t.to_string();
            }
        } else if is_interrogative(t) {
            if f.interrogative.is_empty() {
                f.interrogative = t.to_string();
            }
        } else if !is_filler(t) {
            f.subject.push(t.to_string());
        }
    }
    f
}

/// How the current turn was resolved against the previous one — the §40 observability record.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Merge {
    /// The turn names its own subject (or there is no prior turn): resolve it alone.
    Standalone,
    /// A pure backward reference: inherit the previous turn's semantic target unchanged.
    InheritTarget,
    /// A new action over the inherited subject: resolve the rendered `{interrogative} {action} {subject}`.
    MergedFrame(String),
    /// A follow-up that leans on the previous topic but states no slot of its own ("e em JSON?",
    /// "explica melhor"): the previous SUBJECT is carried forward, never the previous action.
    SubjectCarry(String),
    /// An explicit NEW subject asked under the previous turn's question ("O que é uma implementação?" →
    /// "E um operador?"): the question form travels, the previous subject does not.
    FrameCarry(String),
    /// A backward reference with no prior turn to bind it — fail closed rather than invent a subject.
    ContextTargetMissing,
}

/// The deterministic merge policy. ONE place, so JS never needs a second copy of it.
///
/// Priority, highest first:
///
///   1. the CURRENT turn's own subject               — context must not trap the reader in a prior topic
///   2. the PREVIOUS turn's subject, under a new action
///   3. the PREVIOUS turn's target, for a pure reference
///   4. context-target-missing                       — a reference with nothing to bind
///
/// The previous turn's ACTION appears at no priority at all. That is the rule the concatenation broke.
/// An explicit new subject under the PREVIOUS turn's question — the only thing an ellipsis inherits.
///
/// Rendered from structured fields, never from prose: the prior frame's `interrogative` ("que", "what")
/// and the current frame's `subject`. Concatenating the two questions is what this replaces, and it is why
/// the previous subject cannot leak — it is never in the string.
///
/// Every condition is structural, and none of them is length. A short question can be complete, and a long
/// one can be elliptical; what marks the ellipsis is that the turn names something while asking nothing:
///
///   * the current turn has a nameable subject (checked by the caller),
///   * it carries no interrogative and no action of its own — it is not asking anything,
///   * it opens with a continuation ("E …?", "And …?"), so it is explicitly a second half,
///   * the prior turn ASKED FOR A DEFINITION, judged by the classifier the obligations taxonomy already
///     uses, so a procedure or a lifecycle question cannot lend its shape to a new subject,
///   * and the prior turn named a subject of its own, so there was a real question to continue.
fn definition_frame_carry(
    current: &str,
    cur: &Frame,
    prior: Option<&Frame>,
    prior_question: Option<&str>,
) -> Option<String> {
    let prior_frame = prior?;
    let prior_q = normalize(prior_question?);
    if !cur.interrogative.is_empty() || !cur.action.is_empty() {
        return None;
    }
    // Explicitly a second half. NOT a length test: "E um operador?" continues, while "L0?" is short and
    // complete, and a rule counting tokens cannot tell them apart.
    if !matches!(
        normalize(current).split(' ').next(),
        Some("e") | Some("and")
    ) {
        return None;
    }
    if prior_frame.interrogative.is_empty() || !prior_frame.has_own_subject() {
        return None;
    }
    if !crate::obligations::asks_for_a_definition(&prior_q) {
        return None;
    }
    let subject = cur
        .subject
        .iter()
        .filter(|t| crate::glossary::is_nameable_subject(t))
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");
    if subject.is_empty() {
        return None;
    }
    // Ask for the record the corpus registers for this subject, by a phrase it registers for it. Composing
    // "{interrogative} {subject}" instead produced "que implementacao", which resolved to the PROCEDURE
    // that shares the noun — a generated phrase can name something nobody registered, and then the router
    // is guessing. Where no definitional record exists the composed form still applies, because some
    // subjects are reached by the glossary rather than by a definitional alias.
    if let Some(record) = crate::glossary::definitional_record_of(&subject) {
        if let Some(alias) = crate::glossary::canonical_alias_of(record) {
            return Some(alias.to_string());
        }
    }
    Some(format!("{} {}", prior_frame.interrogative, subject))
}

pub fn merge(current: &str, prior_question: Option<&str>) -> Merge {
    let cur = frame_of(current);
    let prior = prior_question.map(frame_of);

    // 1. An explicit new subject always wins — even when the turn also refers backward
    //    ("e quem controla a Root?" states Root and must move there).
    if cur.has_own_subject() {
        // The turn names a NEW subject, so the previous subject is gone — that part is Block 4B and does
        // not change. What can still travel is the QUESTION the previous turn was asking: "O que é uma
        // implementação?" followed by "E um operador?" is one question asked twice, and only the second
        // half is spoken aloud.
        if let Some(q) = definition_frame_carry(current, &cur, prior.as_ref(), prior_question) {
            return Merge::FrameCarry(q);
        }
        return Merge::Standalone;
    }

    let prior_subject = match prior.as_ref() {
        Some(p) if !p.subject.is_empty() => p.subject.join(" "),
        _ => {
            // A backward reference with no bindable prior subject must say so, not guess one.
            return if cur.referential || cur.task {
                Merge::ContextTargetMissing
            } else {
                Merge::Standalone
            };
        }
    };

    // 2. A new action over the inherited subject: render the frame, do not concatenate the prose.
    if cur.is_action_update() {
        let q = format!("{} {} {}", cur.interrogative, cur.action, prior_subject)
            .trim()
            .to_string();
        return Merge::MergedFrame(q);
    }

    // 3. A pure backward reference (including "which sources answer this?") inherits the target itself.
    if cur.is_pure_reference() || (cur.task && cur.referential) {
        return Merge::InheritTarget;
    }

    // 4. Everything else that leans on the prior topic without naming a slot ("e em JSON?", "dá exemplo
    //    aqui") keeps working — but it carries the prior SUBJECT, not the prior sentence.
    Merge::SubjectCarry(format!("{current} {prior_subject}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_pure_source_reference_inherits_in_both_languages() {
        for (prev, follow) in [
            (
                "Quem controla a Root?",
                "Que fontes é que respondem a isto?",
            ),
            ("Who controls the Root?", "Which sources answer this?"),
        ] {
            assert_eq!(
                merge(follow, Some(prev)),
                Merge::InheritTarget,
                "{follow:?} after {prev:?}"
            );
        }
    }

    #[test]
    fn an_explicit_new_subject_is_never_overridden_by_context() {
        assert_eq!(
            merge(
                "E quem controla a Root?",
                Some("Quem controla os operadores?")
            ),
            Merge::Standalone
        );
    }

    #[test]
    fn a_new_action_keeps_the_prior_subject_and_drops_the_prior_verb() {
        let m = merge("E quem os autoriza?", Some("Quem governa os operadores?"));
        match m {
            Merge::MergedFrame(q) => {
                assert!(q.contains("operadores"), "subject must survive: {q:?}");
                assert!(q.contains("autoriza"), "new action must apply: {q:?}");
                assert!(
                    !q.contains("governa"),
                    "the prior action must NOT survive: {q:?}"
                );
            }
            other => panic!("expected a merged frame, got {other:?}"),
        }
    }

    #[test]
    fn a_reference_with_no_prior_turn_fails_closed() {
        assert_eq!(
            merge("Que fontes é que respondem a isto?", None),
            Merge::ContextTargetMissing
        );
    }

    #[test]
    fn the_prior_verb_alone_never_becomes_a_subject() {
        // The exact defect: the previous turn's "controla" must not appear in any resolved form of a
        // follow-up, because a verb cannot name what a question is about.
        let m = merge(
            "Que fontes é que respondem a isto?",
            Some("Quem controla a Root?"),
        );
        assert_eq!(m, Merge::InheritTarget);
        let p = frame_of("Quem controla a Root?");
        assert_eq!(p.subject, vec!["root"], "the subject is Root, not the verb");
        assert_eq!(p.action, "controla");
    }
}
