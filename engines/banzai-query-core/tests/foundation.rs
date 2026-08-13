//! Native parity/contract tests for the banzai-query-core foundation (M2.18B.7 scope A, step 1).
//!
//! These assert the deterministic invariants of the moved normalization + retrieval foundation. The
//! full byte-parity suite (against the JS port and the WASM boundary) continues to run in
//! `banzai-api-kb`, now exercising this crate through its re-export — so any drift is caught there too.

use banzai_query_core::{
    doc_chunks, normalize, repo_chunks, repo_index_hash, repo_index_manifest, retrieve_topk_ids,
};

#[test]
fn normalize_lowercases_strips_accents_and_symbols() {
    // NFD accent stripping + lowercase + non-[a-z0-9/space] → space + whitespace collapse + trim.
    assert_eq!(normalize("  Ãção,  ÉPÍCO! "), "acao epico");
    assert_eq!(normalize("ADR-042"), "adr 055");
    assert_eq!(normalize("BANZA"), "banza");
}

#[test]
fn normalize_is_deterministic_and_idempotent_on_clean_input() {
    let q = "o que e o banza";
    assert_eq!(normalize(q), normalize(q));
    // A normalized string is a fixed point of normalize (no further folding).
    let once = normalize("o que é o BANZA?");
    assert_eq!(normalize(&once), once);
}

#[test]
fn normalize_folds_homoglyphs_and_deleets() {
    // Cyrillic 'а' → 'a' (homoglyph fold) and a leet word is de-leeted.
    assert_eq!(normalize("b\u{0430}nza"), "banza");
    assert_eq!(normalize("tr4nsfere"), "transfere");
}

#[test]
fn retrieve_topk_ids_empty_query_is_empty() {
    assert!(retrieve_topk_ids("", 5).is_empty());
    assert!(retrieve_topk_ids("   ", 5).is_empty());
}

#[test]
fn retrieve_topk_ids_is_deterministic_and_bounded() {
    let a = retrieve_topk_ids("o que e a dupla entrada no banza", 3);
    let b = retrieve_topk_ids("o que e a dupla entrada no banza", 3);
    assert_eq!(a, b, "retrieval is deterministic");
    assert!(a.len() <= 3, "respects k");
}

#[test]
fn embedded_corpus_loads_without_panic() {
    // The include_str! assets parse (the crate is the sole data owner); non-empty proves the move
    // preserved real content, not an empty/placeholder file.
    assert!(!doc_chunks().is_empty(), "doc-index.json loaded");
    assert!(
        !repo_chunks().is_empty(),
        "repoindex/banzai-repo-index.json loaded"
    );
    assert!(!repo_index_manifest().is_empty(), "manifest loaded");
    // The manifest exposes a stable index hash used by the JS cache key.
    assert!(
        !repo_index_hash().is_empty(),
        "index_hash present in manifest"
    );
}
