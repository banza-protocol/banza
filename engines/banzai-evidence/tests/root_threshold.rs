//! The root authorization model is answered deterministically, and correctly.
//!
//! Live QA caught the model paraphrasing "three authorities, two signatures" as "two independent
//! authorities" — wrong about the most consequential number in the protocol, and wrong in the
//! direction that makes the root sound weaker than it is. A cardinality is a fact, not prose: it
//! belongs to a deterministic terminal, and these tests keep it there.

use banzai_evidence::answer;

fn a(q: &str) -> banzai_evidence::KbAnswer {
    answer(q)
}

#[test]
fn cardinality_and_threshold_are_a_deterministic_terminal() {
    for q in [
        "quantas autoridades independentes controlam a trust root",
        "quantas chaves raiz existem",
        "quantas assinaturas autorizam uma accao da raiz",
        "qual e o limiar da raiz",
    ] {
        let r = a(q);
        assert_eq!(r.intent, "root_threshold", "q={q}");
        assert_eq!(r.kind, "answer", "q={q}");
    }
}

#[test]
fn the_answer_says_three_authorities_and_two_signatures() {
    let t = a("quantas autoridades independentes controlam a trust root").text;
    assert!(
        t.contains("três autoridades"),
        "must state three authorities: {t}"
    );
    assert!(
        t.contains("duas assinaturas"),
        "must state two signatures: {t}"
    );
    assert!(t.contains("2-de-3"), "must name the model: {t}");
}

#[test]
fn it_never_says_two_authorities() {
    // The exact wrong answer observed in production before this terminal existed.
    for q in [
        "quantas autoridades independentes controlam a trust root",
        "uma unica chave raiz pode autorizar sozinha",
        "quantas assinaturas autorizam uma accao da raiz",
    ] {
        let t = a(q).text.to_lowercase();
        // "duas autoridades distintas" is correct — it describes who SIGNS. The defect is claiming the
        // root is CONTROLLED BY two, which is the threshold mistaken for the cardinality.
        for wrong in [
            "controlada por duas",
            "controlada por dois",
            "duas autoridades independentes",
            "dois custodiantes independentes",
        ] {
            assert!(!t.contains(wrong), "q={q} states {wrong:?}: {t}");
        }
    }
}

#[test]
fn a_lone_signature_is_stated_never_to_authorise() {
    let t = a("uma unica chave raiz pode autorizar sozinha").text;
    assert!(
        t.contains("nunca autoriza"),
        "must refuse the lone signature: {t}"
    );
    assert!(
        t.contains("mesma autoridade contam como uma"),
        "must state that a duplicated signer counts once: {t}"
    );
}

#[test]
fn the_threshold_is_not_derived_from_hardware() {
    let t = a("qual e o limiar da raiz").text;
    assert!(
        t.contains("nunca define o limiar"),
        "must separate authorization from custody hardware: {t}"
    );
}

// ── the guarantee boundary ────────────────────────────────────────────────────────────────────────
//
// Live QA found the model answering "o BANZA fornece transparência global" — a property the
// specification explicitly does not provide. Claiming a guarantee that does not exist is worse than
// refusing to answer, because a reader plans around it.

#[test]
fn global_transparency_is_denied_not_claimed() {
    for q in [
        "o banza fornece transparencia global",
        "does banza provide global transparency",
        "o banza detecta split-view",
    ] {
        let r = a(q);
        assert_eq!(r.intent, "trust_guarantee_boundary", "q={q}");
        let t = r.text.to_lowercase();
        assert!(t.starts_with("não"), "must open with a denial: {q}");
        assert!(
            t.contains("não fornece — consistência entre observadores")
                || t.contains("nao fornece"),
            "must name cross-observer consistency as absent: {q}"
        );
    }
}

#[test]
fn set_consistency_is_named_as_absent_and_not_confused_with_expiry() {
    let t = a("o banza garante consistencia de conjunto").text;
    assert!(
        t.contains("Não fornece — consistência de conjunto"),
        "set consistency must be stated as absent: {t}"
    );
    assert!(
        t.contains("não a coerência entre eles"),
        "expiry must not be presented as bounding set consistency: {t}"
    );
}

#[test]
fn the_two_guarantees_that_do_exist_are_still_stated() {
    let t = a("o banza fornece transparencia global").text;
    assert!(
        t.contains("frescura do artefacto"),
        "must keep artifact freshness: {t}"
    );
    assert!(
        t.contains("monotonicidade local"),
        "must keep local monotonicity: {t}"
    );
}
