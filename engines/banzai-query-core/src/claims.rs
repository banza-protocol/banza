//! GROUNDED SEMANTIC CLAIM CONTRACT — the propositions an answer must establish to be correct.
//!
//! The engine could already find knowledge, hold a conversation, compare, split authority and ground a
//! model. What it could not guarantee is the last link: *for this question these propositions are
//! obligatory, this evidence must support them, and generation may not succeed while omitting them.*
//!
//! Two kinds of variance produced the final three production failures, and they need different halves
//! of the same contract:
//!
//!   RETRIEVAL VARIANCE   V2-0040 was grounded on ADR-029 alone — a discovery document, which supports
//!                        DECLARATION and not VERIFICATION — and answered accordingly. Requiring the
//!                        claim is not enough; the evidence able to support it has to be present
//!                        BEFORE generation, or the model is being asked to improvise authority.
//!
//!   GENERATION VARIANCE  The Portuguese fail-closed answers had the right sources and lost the
//!                        proposition, then degraded to a fallback about trust evaluation — a different
//!                        subject entirely.
//!
//! WHERE CLAIMS COME FROM. From the semantic unit and its authority, never from the benchmark. There is
//! no question id in this file, and no pattern written against a corpus question. A claim is triggered
//! by the ROUTED ENTRY the engine chose, or by the declared vocabulary of the concept it is about —
//! both available at runtime, both derived from what the protocol says.
//!
//! WHY THE PREDICATES ARE NOT THE BENCHMARK'S. The V2 oracle is Python regexes over `unit-probes.json`;
//! these are Rust matchers written independently. They agree about the PROPOSITION and share nothing
//! else. If runtime and benchmark used one acceptance function, a bug in it would certify itself green.

use crate::normalize;

/// What a claim needs to be legitimately establishable.
pub struct Claim {
    pub id: &'static str,
    /// The semantic unit this refines. A claim is never free-floating.
    pub semantic_unit: &'static str,
    /// Routed entry ids that ALWAYS carry this obligation.
    pub trigger_entry: &'static [&'static str],
    /// Declared subject vocabulary, normalized. Needed where one entry answers several subjects:
    /// `how-trust-works` answers both "how does trust work?" and "what is fail-closed?", and only the
    /// second carries the fail-closed obligation.
    pub trigger_terms: &'static [&'static str],
    /// At least one of these sources must be in the grounded package for the claim to be supportable.
    /// Empty means the claim rests on the answer's own authority rather than on a specific document.
    pub evidence_any_of: &'static [&'static str],
    pub authority_class: &'static str,
    pub criticality: &'static str,
    /// How the obligation is stated TO THE MODEL, per locale. A statement of what must be established,
    /// never a sentence to copy: the model is asked to preserve a proposition, not to reproduce wording.
    pub obligation_pt: &'static str,
    pub obligation_en: &'static str,
}

pub const CLAIMS: &[Claim] = &[
    // Conformance is established by verifiable evidence, not by anyone's approval.
    // Authority: how-to-demonstrate-conformance, ADR-031/ADR-029. ADR-029 alone describes the discovery
    // document — a DECLARATION — which is why it may not stand in for the verification half.
    Claim {
        id: "claim.conformance.established_by_verification",
        semantic_unit: "banza.conformance.demonstrated_by_evidence",
        // Triggered by the QUESTION, not merely by the entry it lands on.
        //
        // `how-to-demonstrate-conformance` is also the grounding entry an operational classifier picks
        // for "o que conta como evidência técnica?" — a question about what evidence IS, which owes no
        // claim about how conformance is established. Binding the obligation to the entry made that
        // definitional question fail closed for omitting a proposition it was never asked about.
        trigger_entry: &[],
        trigger_terms: &[
            "demonstra conformidade",
            "demonstrar conformidade",
            "prova conformidade",
            "provar conformidade",
            "prove conformidade",
            "se prova conformidade",
            "demonstrate conformance",
            "demonstrates conformance",
            "prove conformance",
            "proves conformance",
            "conformance to the protocol proven",
            "conformance is proven",
            "conformidade com o protocolo",
        ],
        evidence_any_of: &["ADR-031", "CONFORMANCE"],
        authority_class: "BANZA",
        criticality: "P0",
        obligation_pt: "A resposta tem de estabelecer que a conformidade se demonstra por evidência \
verificável (execução da conformance suite, artefactos publicados, reverificação por terceiros) e não \
por aprovação central.",
        obligation_en: "The answer must establish that conformance is demonstrated by verifiable \
evidence — running the conformance suite, publishing artefacts, independent re-execution — and not by \
central approval.",
    },
    // An unsatisfied trust/security condition does not proceed. Authority: INV-FEDEVAL-002 and
    // INV-OTE-005 ("MUST fail closed", "no grace period, no default-allow, no override").
    Claim {
        id: "claim.failclosed.unsatisfied_condition_does_not_proceed",
        semantic_unit: "domain.fail-closed.definition",
        trigger_entry: &[],
        trigger_terms: &["fail closed", "failclosed", "fecho por omissao"],
        evidence_any_of: &["ADR-025", "invariants", "SPEC-FED-TRUST", "ANNEX"],
        authority_class: "BANZA",
        criticality: "P2",
        obligation_pt: "A resposta tem de estabelecer que, quando o material de confiança está em \
falta, inválido, expirado ou não verificável, a interação NÃO prossegue — é rejeitada em vez de \
continuar. A ausência de resposta nunca conta como resposta positiva.",
        obligation_en: "The answer must establish that when trust material is missing, invalid, \
expired or unverifiable, the interaction does NOT proceed — it is rejected rather than continued. An \
absent answer never counts as a passing one.",
    },
    // ── Generalization. The contract is not three special cases; these are other units whose central
    //    proposition is the thing a paraphrase most easily drops.
    Claim {
        id: "claim.certification.not_regulatory_authorisation",
        semantic_unit: "banza.certification.not_regulatory_authorisation",
        trigger_entry: &["def-l0-regulatory-boundary", "def-l2-certification"],
        trigger_terms: &[],
        evidence_any_of: &[],
        authority_class: "BANZA",
        criticality: "P0",
        obligation_pt: "A resposta tem de estabelecer que a certificação técnica não confere \
autorização regulatória.",
        obligation_en: "The answer must establish that technical certification confers no regulatory \
authorisation.",
    },
    Claim {
        id: "claim.reference_implementation.does_not_define",
        semantic_unit: "banza.reference_implementation.does_not_define",
        trigger_entry: &["norm-vs-implementation"],
        trigger_terms: &[],
        evidence_any_of: &[],
        authority_class: "BANZA",
        criticality: "P0",
        obligation_pt: "A resposta tem de estabelecer que é a norma que define o que é correcto, e que \
uma implementação (incluindo a de referência) demonstra a norma sem a definir.",
        obligation_en: "The answer must establish that the norm defines what is correct, and that an \
implementation — the reference one included — demonstrates the norm without defining it.",
    },
];

fn claim(id: &str) -> Option<&'static Claim> {
    CLAIMS.iter().find(|c| c.id == id)
}

/// Every claim obligatory for this turn, from the routed entry and the question's declared subject.
pub fn required_claims(entry_id: &str, question: &str) -> Vec<&'static Claim> {
    let nq = normalize(question);
    CLAIMS
        .iter()
        .filter(|c| {
            c.trigger_entry.contains(&entry_id) || c.trigger_terms.iter().any(|t| nq.contains(t))
        })
        .collect()
}

/// Can this claim be legitimately established from the evidence actually in the package?
pub fn evidence_covers(c: &Claim, source_ids: &[String]) -> bool {
    if c.evidence_any_of.is_empty() {
        return true;
    }
    c.evidence_any_of
        .iter()
        .any(|need| source_ids.iter().any(|s| s == need))
}

/// Does the delivered text ESTABLISH the proposition?
///
/// Relational by construction: the noun alone never satisfies a claim, because "evidence is important
/// for conformance" contains the vocabulary and asserts nothing. Locale-independent — the same claim id
/// is checked in Portuguese and English, since a proposition is not a language.
pub fn claim_satisfied(id: &str, text: &str) -> bool {
    let t = strip_markup(text);
    match id {
        "claim.conformance.established_by_verification" => {
            let asserts = has_any(
                &t,
                &[
                    "demonstra",
                    "prova",
                    "provad",
                    "estabelec",
                    "comprova",
                    "demonstrat",
                    "prove",
                    "proven",
                    "establish",
                    "shown",
                ],
            );
            let by_verification = has_any(
                &t,
                &[
                    "verifica",
                    "verifi",
                    "evidencia",
                    "evidência",
                    "evidence",
                    "reverifica",
                    "re-execut",
                    "reexecut",
                    "auto-publica",
                    "self-publicat",
                    "conformance suite",
                ],
            );
            asserts && by_verification
        }
        "claim.failclosed.unsatisfied_condition_does_not_proceed" => {
            let condition = has_any(
                &t,
                &[
                    "falha",
                    "invalid",
                    "inválid",
                    "expir",
                    "ausen",
                    "absent",
                    "missing",
                    "fail",
                    "revogad",
                    "revoked",
                    "nao verific",
                    "não verific",
                    "cannot be verified",
                ],
            );
            let does_not_proceed = has_any(
                &t,
                &[
                    "nao prossegue",
                    "não prossegue",
                    "nao avanca",
                    "não avança",
                    "nao interoper",
                    "não interoper",
                    "does not proceed",
                    "non-interoperation",
                    "noninteroperation",
                    "rejeit",
                    "reject",
                    "bloque",
                    "block",
                    "impede",
                    "prevent",
                    "nao continua",
                    "não continua",
                    "does not continue",
                    "recusa",
                    "refuse",
                    "interromp",
                    "halt",
                    "stop",
                ],
            );
            condition && does_not_proceed
        }
        "claim.certification.not_regulatory_authorisation" => {
            has_any(
                &t,
                &[
                    "nao confere",
                    "não confere",
                    "nao da",
                    "não dá",
                    "confers no",
                    "does not confer",
                    "does not grant",
                    "nao autoriza",
                    "não autoriza",
                    "is not authoris",
                    "is not authoriz",
                    "nao e autoriza",
                    "não é autoriza",
                ],
            ) && has_any(
                &t,
                &["autoriza", "authoris", "authoriz", "regulad", "regulat"],
            )
        }
        "claim.reference_implementation.does_not_define" => {
            has_any(
                &t,
                &[
                    "nao define",
                    "não define",
                    "does not define",
                    "defines nothing",
                    "nao e normativ",
                    "não é normativ",
                    "is not normative",
                ],
            ) || (has_any(&t, &["norma", "norm"])
                && has_any(&t, &["define", "defines"])
                && has_any(&t, &["implementa", "implementation"]))
        }
        _ => true,
    }
}

/// Does the delivered text assert the claim's INVERSION? A forbidden proposition, not a banned word.
pub fn claim_violated(id: &str, text: &str) -> bool {
    let t = strip_markup(text);
    match id {
        "claim.conformance.established_by_verification" => {
            // "não por aprovação central" is the CORRECT answer; only the affirmative is forbidden.
            affirmative_near(
                &t,
                &["aprovacao central", "aprovação central", "central approval"],
            )
        }
        "claim.failclosed.unsatisfied_condition_does_not_proceed" => {
            has_any(
                &t,
                &[
                    "transparencia global",
                    "transparência global",
                    "global transparency",
                ],
            ) || affirmative_near(&t, &["continua", "continue", "prossegue", "proceed"])
                && has_any(&t, &["disponibilidade", "availability"])
        }
        _ => false,
    }
}

fn strip_markup(t: &str) -> String {
    normalize(&t.replace(['*', '_', '`'], ""))
}

fn has_any(t: &str, pats: &[&str]) -> bool {
    pats.iter().any(|p| t.contains(&normalize(p)))
}

/// True when the phrase appears WITHOUT a negation immediately governing it. The correct conformance
/// answer contains "não por aprovação central"; forbidding the bare phrase would reject it.
fn affirmative_near(t: &str, phrases: &[&str]) -> bool {
    for p in phrases {
        let np = normalize(p);
        let mut from = 0usize;
        while let Some(i) = t[from..].find(&np) {
            let at = from + i;
            let lead = &t[at.saturating_sub(24)..at];
            if !lead.contains("nao ")
                && !lead.contains("nem ")
                && !lead.contains("not ")
                && !lead.contains("never ")
                && !lead.contains("sem ")
            {
                return true;
            }
            from = at + np.len();
        }
    }
    false
}

/// JSON for the WASM boundary: the claims this turn owes, with their evidence requirements.
pub fn required_claims_json(entry_id: &str, question: &str) -> String {
    let v: Vec<String> = required_claims(entry_id, question)
        .iter()
        .map(|c| {
            format!(
                "{{\"id\":\"{}\",\"semantic_unit\":\"{}\",\"criticality\":\"{}\",\"authority_class\":\"{}\",\"evidence_any_of\":[{}]}}",
                c.id, c.semantic_unit, c.criticality, c.authority_class,
                c.evidence_any_of.iter().map(|e| format!("\"{e}\"")).collect::<Vec<_>>().join(",")
            )
        })
        .collect();
    format!("[{}]", v.join(","))
}

/// JSON verdict: which required claims the delivered text establishes, which it violates, and which
/// lack the evidence that could support them.
pub fn validate_claims_json(
    entry_id: &str,
    question: &str,
    text: &str,
    sources: &[String],
) -> String {
    let req = required_claims(entry_id, question);
    let mut missing = Vec::new();
    let mut violated = Vec::new();
    let mut unsupported = Vec::new();
    for c in &req {
        if !evidence_covers(c, sources) {
            unsupported.push(c.id);
        }
        if !claim_satisfied(c.id, text) {
            missing.push(c.id);
        }
        if claim_violated(c.id, text) {
            violated.push(c.id);
        }
    }
    let j = |v: &Vec<&str>| {
        v.iter()
            .map(|s| format!("\"{s}\""))
            .collect::<Vec<_>>()
            .join(",")
    };
    format!(
        "{{\"required\":[{}],\"missing\":[{}],\"violated\":[{}],\"unsupported\":[{}],\"ok\":{}}}",
        j(&req.iter().map(|c| c.id).collect()),
        j(&missing),
        j(&violated),
        j(&unsupported),
        missing.is_empty() && violated.is_empty() && unsupported.is_empty()
    )
}

/// The obligation text for the prompt, in the reader's locale.
pub fn obligation_text(c: &Claim, locale: &str) -> &'static str {
    if locale.eq_ignore_ascii_case("en") || locale.to_ascii_lowercase().starts_with("en-") {
        c.obligation_en
    } else {
        c.obligation_pt
    }
}

/// Every claim id, for the closed-world guard.
pub fn claim_ids() -> Vec<&'static str> {
    CLAIMS.iter().map(|c| c.id).collect()
}

/// The semantic unit a claim refines, for the closed-world guard.
pub fn claim_unit(id: &str) -> Option<&'static str> {
    claim(id).map(|c| c.semantic_unit)
}
