# M2.18B.7 — banzai-query-core extraction plan (topological)

Produced by the 17-agent mapping workflow (wf_84892e25-3a2). Verbatim-move + re-export, parity via existing tests + WASM snapshot. This is the authoritative extraction plan for scope item A.

## Executive summary

Create engines/banzai-query-core as a pure Rust rlib (serde + unicode-normalization, no wasm-bindgen) that becomes the single authority for normalization, retrieval, intent taxonomy, entity/attribute/alias registries, typo recovery, resolution, answer-class/coverage/source-policy decisions, reason codes, and scenario generation — moving the logic out of banzai-api-kb, never duplicating it. banzai-api-kb is reduced to the ~45 cfg(target_arch=\"wasm32\") #[wasm_bindgen] JSON wrappers plus `pub use banzai_query_core::*` re-exports, so the WASM ABI and every downstream Rust path stay unchanged. The embedded corpus (entries-index.json, doc-index.json, repoindex/*) physically relocates to core/src with identical include_str! relative paths, making core the sole data owner. Migration is strictly topological — foundation primitives + data first (unblocking every `crate::normalize`/`doc_chunks` reference via re-export), then leaves (reason/source_policy/glossary/intent/queue_policy/prompt/boundary), then upward through docref/concept → catalogue/relation/fuzzy → resolve → answerplan/retrieval → factpack → synth/factcheck → route/terminal — each step independently compilable and green on `cargo test` for both crates. Parity is guaranteed by verbatim moves plus per-step golden tests, WASM JSON snapshot diffs, and the full fmt/clippy/rust-first guard suite. Chief risks: include_str path relativity, workspace/path-dependency setup, and pub(crate) items (doc_chunks, intent markers, intent_source_ranking) that must be promoted to pub to cross the new crate boundary.

## Core crate public API (single authority surface)

- pub mod boundary — evaluate, boundary_refusal, BoundaryDecision (all pub fields)
- pub mod source_policy — is_internal_source, is_public_source, category_visibility, INTERNAL_CATEGORIES
- pub mod reason — ReasonCode (+as_str, is_internal_coverage_failure), ALL_REASON_CODES
- pub mod glossary — glossary_entry, is_vocabulary_query, is_governance_vocabulary_query
- pub mod intent — PRIMARY_INTENTS, ENTITY_TYPES, *_MARKERS, any_hit (promote pub(crate) markers/any_hit to pub for cross-crate glue)
- pub mod queue_policy — priority, should_dedup, public_message
- pub mod prompt — SYSTEM_PROMPT, build_prompt
- pub mod concept — concept_entries, resolve_concept
- pub mod docref — DocRef, RegistryDoc (+chunks/content_hash), registry, resolve, detect_refs, plan_tool, plan_mode, section_wanted, Resolution, resolve_question(_json), MODE_* consts
- pub mod validate — Verdict, validate_response, strip_question_echo
- pub mod attribute — AttributeStatus, AttributeAnswer, resolve_attribute_query(_json)
- pub mod catalogue — Candidate, EntitySelection, alias_entries, generate_candidates, select_entity
- pub mod coverage — ENTITY_PRIMARY_SOURCES, entity_primary_docs, has_coverage, covered_entities
- pub mod relation — RelationKind, RelationEdge/Graph, graph, relations_for(_concept), relations_of_kind, neighbours, RELATION_GRAPH_SCHEMA_VERSION
- pub mod fuzzy — edit_distance, Correction, Band, Recovery, recover, AliasRow, alias_truth_table, alias_collisions
- pub mod resolve — depth_for_intent, classify_trunk_intent, ResolvedIntent, resolve_intent
- pub mod answerplan — AnswerType, AnswerPlan, plan_answer, ANSWER_PLAN_VERSION
- pub mod retrieval — SourceRole, PlannedSource, RetrievalPlan, plan_retrieval, validate_plan, RETRIEVAL_PLAN_VERSION
- pub mod factpack — FactualPackage + all sub-structs, build_factual_package_planned, FACTUAL_PACKAGE_VERSION/VALIDATOR_POLICY_VERSION/PROMPT_VERSION
- pub mod synth — OutputPrompt, Claim, GroundedOutput, build_output_prompt, output_schema, parse_output
- pub mod factcheck — FactualVerdict, validate_output
- pub mod route — Route, AnswerClass, ContextRoute, route(_json), route_with_journey(_json), route_with_context(_json), answer_class(_json), answer_type, classify_query_intent, primary_interface_intent, intent_source_ranking (promote to pub)
- pub mod terminal — SourceCard, Terminal, build_terminal(_json), TRACE_* consts, MAX_EXACT_LEN
- crate-root pure retrieval primitives (re-exported pub): normalize (+fold_homoglyph/deleet_token/collapse_elongation/contains_word/is_stopword), DocChunk, doc_chunks, retrieve_doc_chunks, RepoChunk, repo_chunks, retrieve_repo_chunks, retrieve_topk_ids, Entry, entries, score_entry, repo_index_hash — the SINGLE authority for normalization + embedded-corpus retrieval

## Migration order (each step independently compilable + `cargo test` green)

### Step 1 — risk: medium
**Modules:** crate-root primitives: normalize (+fold_homoglyph/deleet_token/collapse_elongation/contains_word/is_stopword), Entry/entries()/score_entry/retrieve_topk_ids, DocChunk/doc_chunks()/score_doc_chunk/retrieve_doc_chunks, RepoChunk/repo_chunks()/preferred_categories/score_repo_chunk/retrieve_repo_chunks/repo_index_hash, include_str assets: entries-index.json, doc-index.json, repoindex/banzai-repo-index.json, repoindex/banzai-repo-index-manifest.json

Foundation first. Nearly every module reaches these via `crate::normalize`/`crate::doc_chunks`/`crate::DocChunk`/`crate::retrieve_topk_ids`. Create banzai-query-core (rlib, serde+unicode-normalization, NO wasm-bindgen), physically relocate the 4 data files to core/src keeping identical include_str! relative paths, move the pure loaders/scorers, then in lib.rs replace the definitions with `pub use banzai_query_core::{...}` (pub(crate) use for doc_chunks) so every still-in-place module's `crate::` path keeps resolving. Add path dependency (introduce a [workspace] or path dep) from banzai-api-kb to banzai-query-core. This is the load-bearing step; doing it first makes every later move a leaf move.

### Step 2 — risk: low
**Modules:** reason, source_policy, glossary, intent, queue_policy, prompt, boundary

Zero-intra-crate-dependency leaves (only std/serde/self-tests). They compile against the foundation with no sibling deps. Move each, delete `pub mod X` and add `pub use banzai_query_core::X` in lib.rs so the gated wasm wrappers (boundary_evaluate_json, queue_*, build_prompt_json) keep compiling. Promote intent's pub(crate) markers/any_hit to pub since resolve will import them across the crate boundary later.

### Step 3 — risk: low
**Modules:** concept, docref, validate, attribute

First tier over the foundation: concept/validate need only crate-root normalize; docref needs normalize+DocChunk+doc_chunks (now in core); attribute needs normalize+reason (moved step 2). No sibling deps beyond already-migrated items. docref is a keystone many later modules need, so land it here.

### Step 4 — risk: low
**Modules:** catalogue, coverage, relation, fuzzy

Depend on step-3 modules: catalogue(docref,normalize), coverage(docref — its cfg(test) uses docref::resolve so docref must already be in core), relation(docref,concept), fuzzy(normalize,concept,catalogue,docref). All deps now present in core.

### Step 5 — risk: medium
**Modules:** resolve

The resolution orchestrator fans out to intent, fuzzy, boundary, docref, concept, catalogue and crate-root normalize — all migrated in steps 1–4. Moving it now keeps its `crate::` paths resolving. resolve_intent_json wasm wrapper stays in lib delegating to core.

### Step 6 — risk: medium
**Modules:** answerplan, retrieval

answerplan depends only on resolve (step 5). retrieval depends on relation, resolve, docref, source_policy + crate-root normalize/DocChunk/doc_chunks — all present. Both are pure plan-shapers.

### Step 7 — risk: medium
**Modules:** factpack

Depends on answerplan, relation, resolve, retrieval, docref, source_policy, coverage plus crate-root helpers (normalize, DocChunk, doc_chunks, retrieve_doc_chunks) — every one migrated in steps 1–6. It is the convergence node feeding synth/factcheck.

### Step 8 — risk: low
**Modules:** synth, factcheck

synth needs factpack::FactualPackage (step 7). factcheck needs factpack::FactualPackage + synth::GroundedOutput, so synth precedes it within the step. Both pure.

### Step 9 — risk: medium
**Modules:** route, terminal

route needs crate-root normalize/retrieve_topk_ids + boundary, docref, glossary — all migrated. terminal needs route + docref + normalize, so route precedes terminal. This drains the last logic out of the api-kb crate. Promote route::intent_source_ranking from pub(crate) to pub so lib.rs's intent_source_ranking_json glue can reach it across the crate boundary.

### Step 10 — risk: low
**Modules:** lib.rs final reduction / re-export cleanup

lib.rs now contains ONLY the ~45 cfg(target_arch="wasm32") #[wasm_bindgen] JSON wrappers, the cdylib crate-type, the wasm-bindgen dep, and `pub use banzai_query_core::*` re-exports for source compatibility. Verify no pure logic and no include_str! remain; every wrapper delegates to banzai_query_core::*. Run full native + wasm parity gates.

## Stays in banzai-api-kb/lib.rs

- The ~45 #[wasm_bindgen] JSON-string wrappers, each keeping its #[cfg(target_arch="wasm32")] gate, as thin glue delegating to banzai_query_core (retrieve_topk_ids_json, normalize_query, retrieve_doc_chunks_json, retrieve_repo_chunks_json, repo_index_manifest_json, repo_index_hash_str, source_is_public, generate_candidates_json, resolve_intent_json, relation_*_json, retrieval_plan_json, validate_retrieval_plan_json, answer_plan_json, select_entity_json, build_factual_package_planned_json, contract_versions_json, covered_entities_json, attribute_answer_json, recover_query_json, alias_truth_table_json, detect_doc_refs_json, resolve_document_json, build_output_prompt_json, output_schema_json, validate_output_json, boundary_evaluate_json, route_question_json, route_question_with_journey_json, route_with_context_json, answer_class_json, build_terminal_json, resolve_concept_source, answer_type_str, classify_query_intent_str, primary_interface_intent_str, intent_source_ranking_json, validate_response_json, strip_question_echo_text, build_prompt_json, queue_priority_str, queue_should_dedup_flag, queue_public_message_str)
- crate-type = ["cdylib", "rlib"] and the [target.'cfg(target_arch="wasm32")'.dependencies] wasm-bindgen entry — the WASM ABI is produced only here
- `use wasm_bindgen::prelude::*;` and all wasm-bindgen attribute machinery
- `pub use banzai_query_core::{...}` (and `pub(crate) use` for doc_chunks) re-exports of every moved module + crate-root primitive, so `crate::X` paths and downstream Rust consumers keep resolving during and after migration
- NO include_str! and NO pure logic — the embedded corpus and all deterministic query logic have left the crate

## Data ownership strategy

banzai-query-core becomes the SOLE owner of the embedded corpus. Physically relocate all four include_str! assets — entries-index.json, doc-index.json, repoindex/banzai-repo-index.json, repoindex/banzai-repo-index-manifest.json — from engines/banzai-api-kb/src/ into engines/banzai-query-core/src/, preserving the exact relative directory layout so the include_str!(\"…\") string literals move verbatim with the pure loaders (entries(), doc_chunks(), repo_chunks(), repo_index_hash()) and require zero edits. The loaders live only in core; both crates read one embedded copy — no duplication, no second const. lib.rs holds no data and no loader; it re-exports doc_chunks (pub(crate) use) / DocChunk / retrieve_* / repo_index_hash so its gated wasm wrappers still compile. The un-included companion files (repoindex/banzai-repo-index-{coverage,exclusions,safety}.json) move alongside for locality even though they are not include_str!'d. CRITICAL follow-through: repoint the reindex/index-generation pipeline and any path-based CI guards (generated-index clean guard, repo-guards path ranges) to the new core/src location so regeneration writes to the file the crate actually embeds.

## Parity strategy

Logic is MOVED verbatim (never reimplemented) and re-exported, so byte-identical output holds largely by construction; each step then proves it. (1) Per module, relocate its #[cfg(test)] block with the file; keep both `cargo test -p banzai-query-core` and `cargo test -p banzai-api-kb` green after every step. (2) Native rlib parity oracle = existing in-file golden tests (boundary taxonomy, attribute exact PT substrings \"2025\"/\"não declara\", synth prompt substrings \"APENAS os FACTOS\"/\"FONTES PERMITIDAS\", factpack golden, reason FORBIDDEN-phrase invariants). (3) WASM byte-behavior parity: before step 1 snapshot every #[wasm_bindgen] fn's JSON over a fixed question corpus (reuse eval/twopass-benchmark.mjs + offline suites / 729-case set); after each step rebuild wasm and diff — must be identical. (4) make rust-rule-check + repo-guards-rs-check + identity-check + cargo fmt --check + clippy -D warnings each step (CI enforces). (5) Snapshot-diff the JS twin answerContract.js normalizeBanzaiAnswer against moved source_policy so they stay identical.

## Risks

- include_str! path relativity is the top hazard: the 4 data files must move with the loaders keeping identical relative paths, or the crate fails to compile; also repoint the reindex pipeline + generated-index guards to the new core/src path.
- Crate is standalone today (no workspace): must introduce a [workspace] or a path dependency from banzai-api-kb to banzai-query-core, and ensure banzai-query-core does NOT depend on wasm-bindgen (wasm-bindgen stays a wasm32-only dep of api-kb) while both serde and unicode-normalization become core deps.
- pub(crate) visibility crossing the new crate boundary: doc_chunks, intent markers/any_hit, and route::intent_source_ranking are pub(crate) today; pub(crate) in core is invisible to api-kb glue — promote to pub (or add explicit re-exports) or the wasm wrappers (intent_source_ranking_json, retrieve_doc_chunks_json) fail to compile.
- `crate::normalize`/`crate::doc_chunks` are consumed by many modules while migration is in flight: a single missed `pub use`/`pub(crate) use` re-export in lib.rs breaks a still-in-place module — re-exports must be added the moment the definition leaves lib.rs.
- cfg(target_arch="wasm32") discipline: all wasm gating must remain solely in lib.rs; banzai-query-core must build cleanly for both native and wasm32 with no gated logic and no wasm-bindgen reference.
- Test relocation coupling: coverage.rs's cfg(test) uses docref::resolve, so docref must land in the same or earlier step or the coverage tests won't compile; generally tests move with their module.
- Ordering must stay strictly topological (terminal after route, factcheck after synth, everything after the foundation) to avoid a step referencing a `crate::X` still in the other crate; route→terminal is the one near-cycle to watch (acyclic: terminal→route only).
- JS mirror drift: answerContract.js normalizeBanzaiAnswer must remain behaviorally identical to the moved source_policy::internal_by_path (not a Rust fixup but a live-behavior regression risk).
- Rust-first / repo guards: adding a new crate + moving generated indexes may trip ADR-038 rust-rule-check allowlists, the generated-index clean guard, or repo-guards path ranges — update guard config in the same PR.
- Load-bearing exact strings (SYSTEM_PROMPT, PT answer strings, trace/reason labels, prompt schemas) must move byte-for-byte; any editor reflow silently breaks golden substring assertions and downstream WASM JSON parity.

