//! The claim contract, at the level it must hold: propositions, not words.

use banzai_query_core::claims::*;

fn sat(id: &str, t: &str) -> bool {
    claim_satisfied(id, t)
}

const CONF: &str = "claim.conformance.established_by_verification";
const FC: &str = "claim.failclosed.unsatisfied_condition_does_not_proceed";

#[test]
fn claims_are_triggered_by_the_routed_subject_never_by_a_question_id() {
    // The conformance obligation comes from the QUESTION's declared vocabulary, not from the entry.
    // That entry is also where an operational classifier sends "o que conta como evidência técnica?",
    // which asks what evidence IS and owes no claim about how conformance is established — binding the
    // obligation to the entry made that question fail closed for omitting something nobody asked for.
    for q in [
        "in what way is conformance to the protocol proven",
        "como e que um operador demonstra conformidade",
        "de que forma se prova conformidade com o protocolo",
        "how does an operator demonstrate conformance",
    ] {
        assert!(
            required_claims("how-to-demonstrate-conformance", q)
                .iter()
                .any(|c| c.id == CONF),
            "{q:?} owes the conformance claim"
        );
    }
    for q in [
        "o que conta como evidencia tecnica",
        "what counts as technical evidence",
    ] {
        assert!(
            !required_claims("how-to-demonstrate-conformance", q)
                .iter()
                .any(|c| c.id == CONF),
            "{q:?} owes no claim about how conformance is established"
        );
    }

    // fail-closed and general trust share ONE entry, and only one of them owes the fail-closed claim.
    let fc = required_claims("how-trust-works", "what is fail-closed");
    assert!(
        fc.iter().any(|c| c.id == FC),
        "the fail-closed question owes the claim"
    );
    let trust = required_claims("how-trust-works", "como funciona a confianca no banza");
    assert!(
        !trust.iter().any(|c| c.id == FC),
        "a general trust question does not"
    );
}

#[test]
fn a_paraphrase_without_the_preferred_word_satisfies_the_claim() {
    // G6. The proposition is what matters; "verification" need not appear literally.
    assert!(sat(CONF, "An operator demonstrates conformance by running the conformance suite and publishing results anyone can re-execute."));
    assert!(sat(CONF, "A conformidade prova-se por auto-publicação com verificação automatizada, não por aprovação central."));
    assert!(sat(
        FC,
        "If the trust material is missing or expired, the interaction simply does not proceed."
    ));
    assert!(sat(
        FC,
        "Quando a validação falha, o pedido é rejeitado em vez de continuar."
    ));
}

#[test]
fn the_keyword_without_the_proposition_does_not_satisfy_it() {
    // G5. This is the whole reason the predicate is relational.
    assert!(!sat(
        CONF,
        "Evidence is important for conformance and operators should keep good records."
    ));
    assert!(!sat(
        FC,
        "Fail-closed is a term used in security engineering and it appears in the specification."
    ));
}

#[test]
fn the_inverted_claim_is_detected_and_the_negated_form_is_not() {
    // G4, and the trap the oracle already fell into once: the correct answer CONTAINS the forbidden
    // phrase, negated.
    assert!(claim_violated(
        CONF,
        "Conformance is granted by central approval from the protocol authority."
    ));
    assert!(!claim_violated(
        CONF,
        "A conformidade demonstra-se por evidência verificável — não por aprovação central."
    ));
    assert!(claim_violated(
        FC,
        "Fail-closed means BANZA provides global transparency across operators."
    ));
}

#[test]
fn evidence_requirements_distinguish_declaration_from_verification() {
    // V2-0040 exactly. ADR-029 describes the discovery document — a DECLARATION — and may not stand in
    // for the verification half; ADR-031 can.
    let c = CLAIMS.iter().find(|c| c.id == CONF).unwrap();
    assert!(
        !evidence_covers(c, &["ADR-029".to_string()]),
        "a declaration source must not impersonate verification evidence"
    );
    assert!(evidence_covers(
        c,
        &["ADR-029".to_string(), "ADR-031".to_string()]
    ));
    assert!(evidence_covers(c, &["CONFORMANCE".to_string()]));
}

#[test]
fn one_claim_id_serves_both_locales() {
    // G10. A proposition is not a language; PT and EN must not diverge into different claim ids.
    for (pt, en) in [
        (
            "A conformidade prova-se por verificação automatizada.",
            "Conformance is proven by automated verification.",
        ),
        (
            "Se a validação falhar, o pedido não prossegue.",
            "If validation fails, the request does not proceed.",
        ),
    ] {
        let id = if pt.contains("conformidade") {
            CONF
        } else {
            FC
        };
        assert!(sat(id, pt), "PT: {pt}");
        assert!(sat(id, en), "EN: {en}");
    }
}

#[test]
fn every_claim_refines_a_real_semantic_unit_and_declares_its_authority() {
    assert!(
        !CLAIMS.is_empty(),
        "an empty registry would make every check above vacuous"
    );
    for c in CLAIMS {
        assert!(
            !c.semantic_unit.is_empty(),
            "{}: no owning semantic unit",
            c.id
        );
        assert!(
            !c.authority_class.is_empty(),
            "{}: no authority class",
            c.id
        );
        assert!(
            c.id.starts_with("claim."),
            "{}: claim ids are namespaced",
            c.id
        );
        assert!(
            !c.trigger_entry.is_empty() || !c.trigger_terms.is_empty(),
            "{}: a claim nothing can trigger is dead weight",
            c.id
        );
    }
    let mut ids: Vec<&str> = claim_ids();
    ids.sort();
    let n = ids.len();
    ids.dedup();
    assert_eq!(ids.len(), n, "duplicate claim ids");
}
