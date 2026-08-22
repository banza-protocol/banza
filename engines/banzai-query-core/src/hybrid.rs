//! HYBRID — a DOMAIN subject and a request about BANZA's relationship to it.
//!
//! This is NOT concept comparison, and conflating the two was the mistake that left one case looking
//! permanently unsupported. A comparison has two genuine semantic targets — `clearing` and
//! `settlement`, `L2` and `L3`. A hybrid has ONE subject and a RELATION request:
//!
//! ```text
//! "settlement vs what BANZA specifies"
//! "how does settlement relate to BANZA?"
//! "what is a ledger and how does it relate to BANZA?"
//! "does BANZA perform settlement?"
//! ```
//!
//! "what BANZA specifies" is not a concept and must not be forced into a concept table to make a
//! matrix read 22/22. It is a request for the protocol's position on the subject already named.
//!
//! The authority split is the whole point, and it is why this is a separate plan rather than a second
//! comparison side. DOMAIN evidence may establish what the subject means in general. Only BANZA
//! evidence may establish what BANZA requires, does, does not do, permits, or leaves to
//! implementations. A domain source may not say what the protocol demands, and neither may the model's
//! pretrained knowledge.

use serde::Serialize;

/// A hybrid plan: one subject, and the BANZA relation being asked about.
#[derive(Debug, Clone, Serialize)]
pub struct HybridPlan {
    pub is_hybrid: bool,
    /// The phrase naming the subject, normalized.
    pub subject_phrase: String,
    /// The semantic id the subject resolved to, or empty.
    pub subject_id: String,
    /// "domain" | "banza" | "" — which layer owns the subject itself.
    pub subject_class: String,
    /// What is being asked about BANZA's relation to it.
    pub relation: &'static str,
    /// The subject resolved and a relation was recognised — the only state a hybrid may be composed in.
    pub resolved: bool,
}

/// The relation being requested. Each is a different question about the same subject.
const RELATIONS: &[(&str, &[&str])] = &[
    // What the protocol SPECIFIES about it — the general "what does BANZA say" request.
    (
        "specifies",
        &[
            "o que o banza especifica",
            "o que e que o banza especifica",
            "que o banza especifica",
            "o que o banza define",
            "que o banza define",
            "what banza specifies",
            "what banza defines",
            "what does banza specify",
            "what does banza define",
        ],
    ),
    // How it RELATES to the protocol.
    (
        "relates",
        &[
            "como se relaciona com o banza",
            "como e que se relaciona com o banza",
            "relaciona com o banza",
            "relacao com o banza",
            "how does it relate to banza",
            "how does that relate to banza",
            "relate to banza",
            "relates to banza",
            // `no banza` and `in banza` are NOT relation phrases and are deliberately absent. They are
            // scope qualifiers that appear in ordinary questions asking about nothing of the sort: "o
            // que significa Resiliente no BANZA?" asks for a Fundamental Principle's meaning, and
            // reading it as a relation request took it away from `def-r2s2` and paired it with an
            // unrelated entry. A relation has to be asked for.
            "relationship with banza",
        ],
    ),
    // Whether the protocol PERFORMS it.
    (
        "performs",
        &[
            "o banza faz",
            "o banza executa",
            "o banza processa",
            "o banza realiza",
            "does banza perform",
            "does banza do",
            "does banza execute",
            "does banza process",
        ],
    ),
    // Whether the protocol REQUIRES it.
    (
        "requires",
        &[
            "o banza exige",
            "o banza requer",
            "o banza obriga",
            "does banza require",
            "does banza mandate",
            "is it required by banza",
        ],
    ),
];

/// The relation a query is asking about, longest match first.
fn relation_of(nq: &str) -> Option<&'static str> {
    let mut best: Option<(&'static str, usize)> = None;
    for (rel, pats) in RELATIONS {
        for p in *pats {
            if nq.contains(p) && best.map(|(_, l)| p.len() > l).unwrap_or(true) {
                best = Some((rel, p.len()));
            }
        }
    }
    best.map(|(r, _)| r)
}

/// Strip the relation phrasing and the comparison/connective scaffolding, leaving the subject.
fn subject_of(nq: &str, relation_pat_stripped: &str) -> String {
    let mut t = relation_pat_stripped.trim();
    // The comparison/definition FRAME first, because it is the longest and most specific thing here.
    // Stripping the short interrogative scaffolding first would eat "qual " out of "qual a diferença
    // entre …" and leave the frame unmatchable — measured, that turned the subject into "diferenca
    // entre settlement".
    for frame in [
        "qual e a diferenca entre ",
        "qual a diferenca entre ",
        "what is the difference between ",
        "difference between ",
        "o que e ",
        "what is ",
        "explica ",
        "explain ",
    ] {
        if let Some(rest) = t.strip_prefix(frame) {
            t = rest.trim();
            break;
        }
    }
    // Then the interrogative scaffolding that sits AROUND the subject once the relation phrase is gone.
    // "como é que settlement se relaciona com o BANZA" leaves "como e que settlement se" behind, and the
    // subject is the one word in the middle. Stripped from both ends, repeatedly, because the leads and
    // the tails combine.
    loop {
        let before = t;
        for lead in [
            "como e que ",
            "como ",
            "de que forma ",
            "how does ",
            "how do ",
            "how is ",
            "how ",
            "e que ",
            "qual e ",
            "qual ",
        ] {
            if let Some(rest) = t.strip_prefix(lead) {
                t = rest.trim();
                break;
            }
        }
        for tail in [
            " se", " is", " does", " do", " e", " and", " vs", " versus", " com", " with", ",",
        ] {
            if let Some(head) = t.strip_suffix(tail) {
                t = head.trim();
                break;
            }
        }
        if t == before {
            break;
        }
    }
    for lead in ["o ", "a ", "os ", "as ", "um ", "uma ", "the ", "an "] {
        if let Some(rest) = t.strip_prefix(lead) {
            t = rest.trim();
            break;
        }
    }
    let _ = nq;
    t.to_string()
}

/// Plan a hybrid relation question.
pub fn plan(nq: &str) -> HybridPlan {
    let none = |is: bool| HybridPlan {
        is_hybrid: is,
        subject_phrase: String::new(),
        subject_id: String::new(),
        subject_class: String::new(),
        relation: "",
        resolved: false,
    };
    let relation = match relation_of(nq) {
        Some(r) => r,
        None => return none(false),
    };
    // Remove the relation phrasing; whatever remains carries the subject.
    let mut rest = nq.to_string();
    for (rel, pats) in RELATIONS {
        if *rel != relation {
            continue;
        }
        for p in *pats {
            if let Some(i) = rest.find(p) {
                rest = format!("{}{}", &rest[..i], &rest[i + p.len()..]);
            }
        }
    }
    let phrase = subject_of(nq, rest.trim());
    if phrase.is_empty() {
        return none(true);
    }
    // The subject resolves through the same resolvers everything else uses, in the same order.
    let as_question = format!("o que e {phrase}");
    let (id, class) = if let Some(id) = crate::glossary::glossary_entry(&as_question) {
        (id.to_string(), "banza")
    } else if let Some(id) = crate::domain::resolve_domain(&phrase) {
        (id.to_string(), "domain")
    } else {
        (String::new(), "")
    };
    let resolved = !id.is_empty();
    HybridPlan {
        is_hybrid: true,
        subject_phrase: phrase,
        subject_id: id,
        subject_class: class.into(),
        relation,
        resolved,
    }
}

pub fn plan_json(nq: &str) -> String {
    serde_json::to_string(&plan(nq)).unwrap_or_else(|_| "{}".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_reference_case_is_a_hybrid_not_a_comparison() {
        // "settlement vs what BANZA specifies" — one subject, one relation request. Forcing the second
        // phrase into a concept table to make a comparison matrix read 22/22 would be inventing a
        // concept nobody named.
        let p = plan("qual a diferenca entre settlement e o que o banza especifica");
        assert!(p.is_hybrid);
        assert_eq!(p.subject_id, "def-settlement");
        assert_eq!(p.relation, "specifies");
        assert!(p.resolved);
    }

    #[test]
    fn the_english_twin_plans_the_same() {
        let p = plan("what is the difference between settlement and what banza specifies");
        assert_eq!(p.subject_id, "def-settlement");
        assert_eq!(p.relation, "specifies");
        assert!(p.resolved);
    }

    #[test]
    fn the_relation_family_shares_one_capability() {
        for (q, rel) in [
            ("como e que settlement se relaciona com o banza", "relates"),
            ("does banza perform settlement", "performs"),
            ("o banza exige um ledger", "requires"),
        ] {
            let p = plan(q);
            assert!(p.is_hybrid, "{q:?} must plan as a hybrid");
            assert_eq!(p.relation, rel, "{q:?}");
            assert!(p.resolved, "{q:?} subject must resolve");
        }
    }

    #[test]
    fn a_two_concept_comparison_is_not_a_hybrid() {
        assert!(!plan("qual a diferenca entre clearing e settlement").is_hybrid);
        assert!(!plan("what is the difference between l2 and l3").is_hybrid);
    }
}
