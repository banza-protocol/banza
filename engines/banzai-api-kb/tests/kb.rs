//! R6 tests for banzai-api-kb — the retrieval port used by the live banzai-api.
//! (Byte-parity vs the old JS is proven in Node; these guard the Rust side.)

use banzai_api_kb::{normalize, retrieve_doc_chunks, retrieve_topk_ids};

#[test]
fn normalize_matches_js_semantics() {
    assert_eq!(
        normalize("PAGAMENTOS QR dinâmico"),
        "pagamentos qr dinamico"
    );
    assert_eq!(normalize("  O que é o BANZA?  "), "o que e o banza");
    assert_eq!(normalize("a-b_c/d"), "a b c/d");
    assert_eq!(normalize(""), "");
    assert_eq!(normalize("çãé"), "cae");
}

#[test]
fn retrieval_is_deterministic_and_matches_known_entries() {
    // "o que e o banza" scores the what-is-banza entry (keyword words hit ≥ 2).
    let ids = retrieve_topk_ids("o que e o banza", 1);
    assert_eq!(ids, vec!["what-is-banza".to_string()]);
    // deterministic
    assert_eq!(retrieve_topk_ids("o que e o banza", 1), ids);
    // empty query → no results
    assert!(retrieve_topk_ids("", 3).is_empty());
    // k floors at 1
    assert!(retrieve_topk_ids("what is banza", 0).len() <= 1);
}

#[test]
fn no_match_returns_empty() {
    assert!(retrieve_topk_ids("xyzzy plugh random gibberish", 3).is_empty());
}

// ── M2.9A documentary index (ADR-036) ────────────────────────────────────────

#[test]
fn doc_index_is_populated_and_secret_free() {
    // The generated doc-index must be non-trivial and must never carry key material.
    let chunks = retrieve_doc_chunks("operador conformidade federacao manifest evidencia", 5);
    assert!(
        !chunks.is_empty(),
        "operational queries must retrieve real doc chunks"
    );
    for c in &chunks {
        let hay = c.chunk.to_uppercase();
        assert!(
            !hay.contains("BEGIN PRIVATE KEY"),
            "no private key material in the index"
        );
        assert!(
            !hay.contains("BEGIN OPENSSH PRIVATE KEY"),
            "no ssh key material"
        );
        assert!(!c.path.contains(".env"), "no .env in the index");
    }
}

#[test]
fn doc_chunks_are_empty_for_offtopic() {
    assert!(retrieve_doc_chunks("qual e a cotacao do dolar amanha", 2).is_empty());
    assert!(retrieve_doc_chunks("xyzzy plugh gibberish", 2).is_empty());
}

#[test]
fn banzami_question_retrieves_the_banzami_entry_not_banza() {
    // "o que é o Banzami?" must resolve to the distinct Banzami entry, never collapse to
    // what-is-banza (the substring "banza" inside "banzami" over-matches at score 2; the
    // "o que e o banzami" phrase must win at score 7). Company ≠ protocol ≠ agent.
    let ids = retrieve_topk_ids("o que e o banzami", 1);
    assert_eq!(ids, vec!["what-is-banzami".to_string()]);
    // the bare token still lands on the Banzami entry
    assert_eq!(
        retrieve_topk_ids("banzami", 1),
        vec!["what-is-banzami".to_string()]
    );
}
