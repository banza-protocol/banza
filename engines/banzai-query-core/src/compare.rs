//! The generic comparison engine.
//!
//! A comparison names TWO subjects. Every term table in this crate names ONE, and matches the first it
//! recognises — so before this module existed, a two-sided question was answered with one side and
//! stopped, or fell to the model and was invented. Measured in production: `Qual é a diferença entre L2
//! e L3?` returned the L2 definition alone with `degraded: true`, and its English twin confabulated "L3
//! introduces a lineage that ties keys to a trusted set", citing reason-codes and root-authority ADRs.
//!
//! The first repair was a shortcut: a comparison of two profiles resolved to `def-profiles`, the entry
//! that happens to hold all five. That works for exactly one family and needs a hand-authored combined
//! entry for every other pair, which does not scale and is not an engine.
//!
//! This is the engine. Both sides are extracted, resolved INDEPENDENTLY through the same resolvers a
//! single-subject question uses, and carried separately for the rest of the pipeline. Nothing here
//! authors an answer: it produces a PLAN — two resolved targets, their knowledge classes and the
//! authority each side requires — and the composition happens downstream on that plan's evidence.
//!
//! The pair matrix in the assurance corpus is TEST DATA. It is not consulted here, and no pair is
//! enumerated: recognition is by shape and by the same alias resolution everything else uses.

use serde::Serialize;

/// What kind of authority a comparison needs, derived from what its two sides are.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum ComparisonClass {
    /// Both sides are general vocabulary — domain authority may support both.
    DomainDomain,
    /// Both sides are protocol subjects — BANZA authority is required for both.
    BanzaBanza,
    /// One general, one protocol. The general side may rest on domain authority; the BANZA-specific
    /// side may not. This is where a domain source is most likely to be asked to say what BANZA
    /// requires, and where it must not be allowed to.
    Hybrid,
}

impl ComparisonClass {
    pub fn as_str(&self) -> &'static str {
        match self {
            ComparisonClass::DomainDomain => "DOMAIN_DOMAIN",
            ComparisonClass::BanzaBanza => "BANZA_BANZA",
            ComparisonClass::Hybrid => "HYBRID",
        }
    }
}

/// One resolved side of a comparison.
#[derive(Debug, Clone, Serialize)]
pub struct ComparisonTarget {
    /// The phrase the reader used for this side, normalized.
    pub phrase: String,
    /// The semantic id it resolved to, or empty when it did not resolve.
    pub semantic_id: String,
    /// "domain" | "banza" | "" — which layer owns this side.
    pub knowledge_class: String,
}

impl ComparisonTarget {
    pub fn resolved(&self) -> bool {
        !self.semantic_id.is_empty()
    }
}

/// The plan a comparison produces. It is a plan, never an answer.
#[derive(Debug, Clone, Serialize)]
pub struct ComparisonPlan {
    pub is_comparison: bool,
    pub left: ComparisonTarget,
    pub right: ComparisonTarget,
    /// Both sides resolved — the only state in which a comparison may be composed.
    pub both_resolved: bool,
    pub class: &'static str,
    /// The source ids the composition is allowed to draw on, per side, in resolution order.
    pub required_authority: &'static str,
}

/// The connectives that separate the two sides of a comparison, longest first so that "vs." does not
/// match inside a longer word and " e " does not split before "entre" has been consumed.
const SPLITTERS: &[&str] = &[
    " versus ",
    " vs. ",
    " vs ",
    " comparado com ",
    " compared to ",
    " compared with ",
    " and ",
    " e ",
    " y ",
];

/// The frames that introduce a comparison, with what precedes the two targets.
const FRAMES: &[&str] = &[
    "qual e a diferenca entre ",
    "qual a diferenca entre ",
    "quais as diferencas entre ",
    "quais sao as diferencas entre ",
    "qual e a diferenca de ",
    "diferenca entre ",
    "diferencas entre ",
    "what is the difference between ",
    "what are the differences between ",
    "what's the difference between ",
    "difference between ",
    "differences between ",
    "distingue entre ",
    "distinguish between ",
    "compara ",
    "comparar ",
    "compare ",
];

/// Whether the query is shaped like a comparison at all.
pub fn is_comparison(nq: &str) -> bool {
    FRAMES.iter().any(|f| nq.contains(f))
        || SPLITTERS
            .iter()
            .filter(|s| matches!(**s, " versus " | " vs. " | " vs "))
            .any(|s| nq.contains(s))
}

/// Strip a leading article or filler from one extracted side.
fn clean_side(s: &str) -> String {
    let mut t = s.trim().trim_end_matches(['?', '.', '!']).trim();
    loop {
        let before = t;
        for lead in [
            "o ", "a ", "os ", "as ", "um ", "uma ", "uns ", "umas ", "de ", "do ", "da ", "the ",
            "an ", "of ",
        ] {
            if let Some(rest) = t.strip_prefix(lead) {
                t = rest.trim_start();
                break;
            }
        }
        if t == before {
            break;
        }
    }
    t.to_string()
}

/// Split the part of the query that carries the two targets.
fn split_targets(rest: &str) -> Option<(String, String)> {
    for sp in SPLITTERS {
        if let Some(i) = rest.find(sp) {
            let left = clean_side(&rest[..i]);
            let right = clean_side(&rest[i + sp.len()..]);
            if !left.is_empty() && !right.is_empty() {
                return Some((left, right));
            }
        }
    }
    None
}

/// Terms that name a comparison TARGET and nothing else.
///
/// These entries already existed and already answered correctly; the bare noun a reader uses in
/// "A versus B" simply reached none of them. They were first added to the shared critical-subject
/// table, and that was wrong: it changed single-subject routing everywhere. Measured, it broke two
/// properties immediately — "Isso dá admissão automática?" stopped declining an anaphor with no
/// referent and answered a definition instead, and a certification/operator frame-carry started
/// carrying where it used to decline.
///
/// So the aliases live HERE, consulted only when a comparison side is being resolved. A comparison
/// gains the vocabulary it needs; nothing else moves.
const COMPARISON_TARGET_ALIASES: &[(&str, &[&str])] = &[
    (
        "def-implementation",
        &[
            "implementacao",
            "implementacoes",
            "implementation",
            "implementations",
        ],
    ),
    (
        "def-protocol",
        &["protocolo", "protocolos", "protocol", "protocols"],
    ),
    (
        "def-operational-scheme",
        &[
            "esquema operacional",
            "operational scheme",
            "esquemas operacionais",
        ],
    ),
    (
        "def-l2-certification",
        &[
            "certificacao",
            "certification",
            "certificacao banza",
            "banza certification",
        ],
    ),
    (
        "def-admission",
        &[
            "admissao",
            "admissao operacional",
            "admission",
            "operational admission",
        ],
    ),
    (
        "def-reference",
        &[
            "referencia",
            "reference",
            "documento de referencia",
            "reference document",
        ],
    ),
    (
        "financial-authorization",
        &[
            "autorizacao regulatoria",
            "regulatory authorisation",
            "regulatory authorization",
            "autorizacao financeira",
            "financial authorisation",
        ],
    ),
    (
        "banzai-vs-engines",
        &[
            "motores deterministicos",
            "deterministic engines",
            "motores",
            "engines",
            "motores verificaveis",
        ],
    ),
    (
        "def-postgresql",
        &[
            "estado de protocolo",
            "protocol state",
            "estado do protocolo",
        ],
    ),
];

/// The comparison-target alias a side names, longest alias first.
fn comparison_target_alias(phrase: &str) -> Option<&'static str> {
    let mut best: Option<(&'static str, usize)> = None;
    for (id, aliases) in COMPARISON_TARGET_ALIASES {
        for a in *aliases {
            if phrase == *a && best.map(|(_, l)| a.len() > l).unwrap_or(true) {
                best = Some((id, a.len()));
            }
        }
    }
    best.map(|(id, _)| id)
}

/// Resolve one side through the SAME resolvers a single-subject question uses.
///
/// Order mirrors the router's own precedence: a BANZA term is a BANZA term wherever it appears, and only
/// a term BANZA does not define falls through to the domain layer. So a comparison cannot quietly answer
/// a protocol subject from general vocabulary.
fn resolve_side(phrase: &str) -> ComparisonTarget {
    // A bare phrase is asked of the glossary as a definition, which is what it is here.
    let as_question = format!("o que e {phrase}");
    if let Some(id) = crate::glossary::glossary_entry(&as_question) {
        return ComparisonTarget {
            phrase: phrase.to_string(),
            semantic_id: id.to_string(),
            knowledge_class: "banza".into(),
        };
    }
    if let Some(id) = crate::glossary::glossary_entry(phrase) {
        return ComparisonTarget {
            phrase: phrase.to_string(),
            semantic_id: id.to_string(),
            knowledge_class: "banza".into(),
        };
    }
    if let Some(id) = comparison_target_alias(phrase) {
        return ComparisonTarget {
            phrase: phrase.to_string(),
            semantic_id: id.to_string(),
            knowledge_class: "banza".into(),
        };
    }
    if let Some(id) = crate::domain::resolve_domain(phrase) {
        return ComparisonTarget {
            phrase: phrase.to_string(),
            semantic_id: id.to_string(),
            knowledge_class: "domain".into(),
        };
    }
    ComparisonTarget {
        phrase: phrase.to_string(),
        semantic_id: String::new(),
        knowledge_class: String::new(),
    }
}

/// Plan a comparison from a normalized query.
///
/// Returns a plan whenever the query is comparison-shaped, even when a side fails to resolve — an
/// unresolved side is information the caller needs, not a reason to pretend the question was something
/// else. A one-sided comparison is never presented as complete; `both_resolved` is what gates that.
pub fn plan(nq: &str) -> ComparisonPlan {
    let empty = || ComparisonTarget {
        phrase: String::new(),
        semantic_id: String::new(),
        knowledge_class: String::new(),
    };
    if !is_comparison(nq) {
        return ComparisonPlan {
            is_comparison: false,
            left: empty(),
            right: empty(),
            both_resolved: false,
            class: "",
            required_authority: "",
        };
    }
    // Everything after the longest matching frame carries the targets; with no frame (the bare "A vs B"
    // shape) the whole query does.
    let rest = FRAMES
        .iter()
        .filter_map(|f| nq.find(f).map(|i| &nq[i + f.len()..]))
        .max_by_key(|s| nq.len() - s.len())
        .unwrap_or(nq);

    let (l, r) = match split_targets(rest) {
        Some(p) => p,
        None => {
            return ComparisonPlan {
                is_comparison: true,
                left: empty(),
                right: empty(),
                both_resolved: false,
                class: "",
                required_authority: "",
            }
        }
    };
    let left = resolve_side(&l);
    let right = resolve_side(&r);
    let both = left.resolved() && right.resolved();
    let class = if !both {
        ""
    } else {
        match (
            left.knowledge_class.as_str(),
            right.knowledge_class.as_str(),
        ) {
            ("domain", "domain") => ComparisonClass::DomainDomain.as_str(),
            ("banza", "banza") => ComparisonClass::BanzaBanza.as_str(),
            _ => ComparisonClass::Hybrid.as_str(),
        }
    };
    let required_authority = match class {
        "DOMAIN_DOMAIN" => "domain",
        "BANZA_BANZA" => "banza",
        "HYBRID" => "banza_for_banza_side",
        _ => "",
    };
    ComparisonPlan {
        is_comparison: true,
        left,
        right,
        both_resolved: both,
        class,
        required_authority,
    }
}

pub fn plan_json(nq: &str) -> String {
    serde_json::to_string(&plan(nq)).unwrap_or_else(|_| "{}".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(nq: &str) -> (String, String, &'static str) {
        let p = plan(nq);
        (p.left.semantic_id, p.right.semantic_id, p.class)
    }

    #[test]
    fn both_sides_resolve_independently_without_a_combined_entry() {
        let (l, r, c) = ids("qual a diferenca entre clearing e settlement");
        assert_eq!(l, "def-clearing");
        assert_eq!(r, "def-settlement");
        assert_eq!(c, "BANZA_BANZA");
    }

    #[test]
    fn the_english_twin_resolves_the_same_pair() {
        let (l, r, _) = ids("what is the difference between clearing and settlement");
        assert_eq!(l, "def-clearing");
        assert_eq!(r, "def-settlement");
    }

    #[test]
    fn a_domain_pair_is_classified_as_domain() {
        let (l, r, c) = ids("what is the difference between a hash and a digital signature");
        assert_eq!(l, "def-dom-hash");
        assert_eq!(r, "def-dom-digital-signature");
        assert_eq!(c, "DOMAIN_DOMAIN");
    }

    #[test]
    fn the_bare_vs_shape_is_a_comparison() {
        let (l, r, _) = ids("hash vs digital signature");
        assert_eq!(l, "def-dom-hash");
        assert_eq!(r, "def-dom-digital-signature");
    }

    #[test]
    fn an_unresolved_side_is_reported_not_hidden() {
        let p = plan("qual a diferenca entre clearing e zzzqqq");
        assert!(p.is_comparison);
        assert!(p.left.resolved());
        assert!(!p.right.resolved());
        assert!(!p.both_resolved, "a one-sided comparison is never complete");
        assert_eq!(p.class, "", "an incomplete plan has no authority class");
    }

    #[test]
    fn a_non_comparison_produces_no_plan() {
        let p = plan("o que e um ledger");
        assert!(!p.is_comparison);
        assert!(!p.both_resolved);
    }
}
