# banzai-query-core

**The single Rust authority for the BanzAI Query Core** (ADR-038 Rust-first; M2.18B.7).

This crate owns the deterministic query logic that decides *what a question means* and *how it is
grounded* — so there is exactly one implementation, never a duplicate in JavaScript, a script, or the
WASM layer. `banzai-api-kb` depends on this crate by path and re-exports its public API; it owns only
the `#[wasm_bindgen]` adaptation surface the live Node service loads. The Node `banzai-api` service is
I/O glue on top of that WASM.

## Internal contract

- **Pure Rust.** No `wasm-bindgen` (that lives in `banzai-api-kb`), no HTTP service, no LLM, no network,
  no filesystem at runtime. Deterministic and natively testable.
- **Single authority, no duplication.** A symbol lives here or nowhere; consumers re-export, never
  re-implement. The dependency direction is permanent: `banzai-query-core → banzai-api-kb → WASM →
  service`. The core never depends on the service, the UI, the Qwen provider, the inference queue, or
  deploy code, and there is no cycle.
- **Sole owner of the canonical corpus.** The embedded indexes — `entries-index.json`, `doc-index.json`
  and `repoindex/*` — live in `src/` and are read only through this crate's loaders
  (`doc_chunks`, `repo_chunks`, `repo_index_manifest`, `repo_index_hash`). The doc/repo indexers write
  to `src/` here; the guards read from here.
- **The model explains once; Rust validates before publishing.** The core comprehends, routes and
  grounds the question and builds the factual package; a single Qwen synthesis (owned by the service)
  fills the shape; the core's factual validator is the last deterministic gate.

## Migration status (M2.18B.7 scope A)

The extraction is topological (see `artifacts/banzai/query-core-extraction-plan.md`). Step 1 (this
increment) moves the **retrieval + normalization foundation** and the **canonical corpus** here; the
higher tiers (reason/coverage/attribute/glossary/intent/fuzzy → docref/concept → catalogue/relation →
resolve → answerplan/retrieval → factpack → synth/factcheck → route/terminal) migrate in subsequent
increments, each proven at parity by the existing `banzai-api-kb` test suite (which now exercises the
moved code through the re-export) plus the WASM snapshot.

## Public API (current)

`normalize`, `retrieve_topk_ids`, `retrieve_doc_chunks`, `retrieve_repo_chunks`, `doc_chunks`,
`repo_chunks`, `repo_index_manifest`, `repo_index_hash`, `DocChunk`, `RepoChunk`.
