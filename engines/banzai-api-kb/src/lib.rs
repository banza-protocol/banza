//! banzai-api-kb (ADR-038, R6) — the Rust retrieval engine for the live banzai-api.
//!
//! A faithful, byte-parity port of `services/banzai-api/src/knowledge.js`'s `normalize`,
//! `scoreEntry` and `retrieveTopK`, over the embedded entry keyword index (`entries-index.json`,
//! generated from `ENTRIES`). The JS module keeps `SOURCES`/`ENTRIES`/answers as DATA and maps the
//! ids this engine returns back to full entries — so JS no longer scores, normalizes or ranks.
//!
//! Deterministic; no LLM, no network. Native build powers the parity tests; the Node WASM build is
//! loaded synchronously by the live service.

// M2.18B.7 — the query logic (normalization, retrieval, the query ontology / intent taxonomy, the
// entity / attribute / alias registries, resolution, relation graph, retrieval + answer planning, the
// factual package, reason codes and coverage decisions) is the SINGLE authority in the
// banzai-query-core crate. This crate owns ONLY the WASM adaptation surface and re-exports the core's
// public API so the #[wasm_bindgen] wrappers below — and the sibling modules that reach it via
// `crate::…` while they migrate tier by tier — keep resolving against one implementation.
pub use banzai_query_core::*;

// ── WASM boundary (Node target; loaded synchronously by the live banzai-api) ────

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// Node WASM: return the retrieved entry ids as a JSON array string.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn retrieve_topk_ids_json(question: &str, k: usize) -> String {
    serde_json::to_string(&retrieve_topk_ids(question, k)).unwrap_or_else(|_| "[]".into())
}

/// Node WASM: normalization (exposed so JS keeps zero matching logic).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn normalize_query(q: &str) -> String {
    normalize(q)
}

/// Node WASM (M2.18B.7 scope B): the SINGLE typed scenario source — the canonical question classes
/// with their deterministic expectations (class + max Qwen calls + boundary flag). The JS evaluation
/// harness, guards and live-QA manifests read this so there is one scenario authority, never a
/// divergent copy in JS/scripts.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn scenarios_json() -> String {
    scenarios::scenarios_json()
}

/// Node WASM (ADR-036, M2.9A): top-k DOCUMENTARY chunks for a query, as a JSON array of
/// `{path,title,section,anchor,source_type,text}`. Used ONLY to enrich the grounded Qwen context with
/// real protocol-doc excerpts (additive citations); it never changes routing. Empty array if none
/// score high enough. Rust owns the scoring; JS is glue.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn retrieve_doc_chunks_json(query: &str, k: usize) -> String {
    let items: Vec<serde_json::Value> = retrieve_doc_chunks(query, k)
        .into_iter()
        // M2.18 — public-source policy: an INTERNAL document (CLAUDE.md and other governance/internal
        // files) is never fed into the grounded context nor cited. This is what stopped CLAUDE.md — a
        // file that contains an "Ecosystem Identity (ADR-001)" heading and so scored for ADR-001
        // queries — from leaking into the answer for "me fala sobre a ADR 002".
        .filter(|c| source_policy::is_public_source(&c.path, &c.source_type))
        .map(|c| {
            serde_json::json!({
                "path": c.path,
                "title": c.title,
                "section": c.section,
                "anchor": c.anchor,
                "source_type": c.source_type,
                "text": c.chunk,
            })
        })
        .collect();
    serde_json::to_string(&items).unwrap_or_else(|_| "[]".into())
}

/// Node WASM (M2.13B PR2): the top-k repository-wide chunks for a query, as a JSON array of
/// `{repo,path,file_name,category,title,heading,symbol,language,line_start,line_end,text}`. Optional
/// `categories_csv` restricts to those source categories (comma-separated). Used to enrich a grounded
/// local answer with real, citable repo sources — never changes routing.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn retrieve_repo_chunks_json(query: &str, k: usize, categories_csv: &str) -> String {
    let cats: Vec<&str> = categories_csv
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    let items: Vec<serde_json::Value> = retrieve_repo_chunks(query, k, &cats)
        .into_iter()
        // M2.18 — public-source policy applied at retrieval: internal categories (guard-ci/report/
        // infra/operator-zero) and internal paths (CLAUDE.md, CLAUDE_BASE.md, …) are never candidates
        // for a public citation, whatever `public_safe` says in the (all-true) index.
        .filter(|c| source_policy::is_public_source(&c.path, &c.source_category))
        .map(|c| {
            serde_json::json!({
                "repo": c.repo,
                "path": c.path,
                "file_name": c.file_name,
                "category": c.source_category,
                "title": c.title,
                "heading": c.heading,
                "symbol": c.symbol_name,
                "language": c.language,
                "line_start": c.line_start,
                "line_end": c.line_end,
                "text": c.content,
            })
        })
        .collect();
    serde_json::to_string(&items).unwrap_or_else(|_| "[]".into())
}

/// Node WASM (M2.13B PR2): the repo-index manifest JSON (counts, commits, index_hash, categories).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn repo_index_manifest_json() -> String {
    repo_index_manifest().to_string()
}

/// Node WASM (M2.13B PR2): the stable repo-index hash (for the JS cache key / staleness).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn repo_index_hash_str() -> String {
    repo_index_hash().to_string()
}

/// Node WASM (M2.18): the deterministic public-source policy. `true` when a repository source
/// (given its path + source_category) may be RETRIEVED as a candidate and CITED in a public answer;
/// `false` for internal governance/CI/infra/report/operator-zero sources (e.g. CLAUDE.md). This is
/// the one authority the JS presentation layer (answerContract.js) calls to drop internal sources.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn source_is_public(path: &str, category: &str) -> bool {
    source_policy::is_public_source(path, category)
}

/// Node WASM (M2.18B.2): deterministic candidate generation. For a natural-language question with no
/// exact identifier, returns up to `max` REAL candidate documents (id/kind/title/score) the interpreter
/// may SELECT among — it never invents an id. Empty when nothing scores above the floor.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_candidates_json(question: &str, max: usize) -> String {
    let cands: Vec<_> = catalogue::generate_candidates(question, max)
        .into_iter()
        .map(|c| serde_json::json!({ "id": c.id, "kind": c.kind, "title": c.title, "score": c.score }))
        .collect();
    serde_json::Value::Array(cands).to_string()
}

/// Node WASM (M2.18B.6 — Rust-First Grounded Synthesis): the deterministic, model-free understanding of a
/// trunk question. Given a question and the router's authoritative seed (empty ⇒ deterministic candidate
/// selection), returns a typed ResolvedIntent JSON (intent taxonomy, entity, depth, clarification, flags,
/// boundary status, expected_model_calls=1). No model is invoked.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_intent_json(question: &str, seeded_entity_id: &str) -> String {
    serde_json::to_string(&resolve::resolve_intent(question, seeded_entity_id))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (BZC-1 — entity + artifact + scope): the deterministic entity/artifact/scope decision for a
/// question, plus the Rust-authored honest answer to serve when `requires_live_tool` is set but the live
/// tool is not yet deployed. The pipeline calls this BEFORE the documental fast path — when
/// `requires_live_tool` is true it serves `live_required_answer` as a 0-model-call terminal and never
/// grounds on a generic protocol document (this is what stops "manifesto do operador zero" resolving to
/// the Protocol Manifesto). Rust decides; TS only transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_scope_json(question: &str) -> String {
    let d = artifact::resolve_scope(question);
    let answer = if d.requires_live_tool {
        artifact::live_required_answer(&d)
    } else {
        String::new()
    };
    serde_json::json!({
        "entity_id": d.entity_id,
        "entity_display": d.entity_display,
        "entity_type": d.entity_type,
        "protocol_scope": d.protocol_scope,
        "artifact_type": d.artifact_type,
        "requires_live_tool": d.requires_live_tool,
        "authority_requirement": d.authority_requirement,
        "resolution_method": d.resolution_method,
        "live_required_answer": answer,
    })
    .to_string()
}

/// Node WASM (ADR-036 — operational reasoning): the deterministic classification of a question about a
/// MEASURED/OBSERVED operational property (duration, metric, live state) of the validation journey, plus
/// the Rust-authored honest, request-oriented fallback to serve when telemetry has no comparable data. The
/// pipeline calls this in the operational tier (after every safety/boundary tier). When `is_operational`
/// is true it routes to the read-only telemetry tool and renders a deterministic, source-bound answer with
/// 0 model calls — or serves `honest_fallback` (never the fixed topic list, never an invented number).
/// Rust decides; TS transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_operational_metric_json(question: &str) -> String {
    serde_json::to_string(&operational::resolve_operational_metric(question))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 2 — operational-intent taxonomy §3): the RICH typed classification of a question.
/// Returns the [`taxonomy::QueryResolution`] JSON (primary_intent + sub_intents + entities + subject +
/// artifact/metric/aggregation/time/comparison/execution descriptors + profile/environment/version +
/// requires_live_data/calculation/documentation/formal_evidence + ambiguities + confidence + resolution
/// state + boundary flag). Boundary questions classify as `boundary_request` and are never reclassified.
/// Rust decides; TS transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_query_json(question: &str) -> String {
    serde_json::to_string(&taxonomy::resolve_query(question)).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 2 — contextual fallback §2/§4): the engine-decided, request-oriented fallback that
/// REPLACES the fixed topic list for an understood-but-unmapped, NON-boundary question. `situation` lets the
/// pipeline report what physically happened ("tool_unavailable" | "insufficient_source" | "" = auto). Returns
/// `{kind, interpreted_intent, sub_intents, message}` — never a generic topic list. The boundary/refusal
/// path never calls this. Rust authors the copy; TS only transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn contextual_fallback_json(question: &str, situation: &str) -> String {
    serde_json::to_string(&taxonomy::contextual_fallback(question, situation))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 6 — multi-turn conversational context §16-§17): resolve the conversational
/// references in a follow-up turn against the small, SAFE, technical-only prior context the client carried
/// forward. `prior_context_json` is a JSON object with `{operator_id, implementation_id, execution_id,
/// previous_execution_id, artifact, profile, environment, protocol_version, last_intent, last_family}` (all
/// optional; a first turn carries `{}`). Returns the [`context::ResolvedContext`] JSON: the enriched
/// `resolved_query` + `referent_kind` + `resolved_intent` + `execution_id`/`comparison_targets`/`artifact`
/// + carry-forward operator/implementation/profile/environment/version + resolution_state (RESOLVED |
/// NO_ANAPHORA | NO_REFERENT | BOUNDARY) + requires_clarification + clarification + boundary_detected.
/// SAFETY: a boundary turn is never resolved (resolution_state=BOUNDARY, no referent); an anaphor with no
/// bindable prior context asks to clarify (never a guessed referent). Rust decides; TS transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_references_json(question: &str, prior_context_json: &str) -> String {
    let prior: context::PriorContext = serde_json::from_str(prior_context_json).unwrap_or_default();
    serde_json::to_string(&context::resolve_references(question, &prior))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 3 — the typed ToolPlanner §6): the deterministic, ordered ToolPlan for a question.
/// Rust resolves the question (taxonomy::resolve_query) and maps the resolution to typed tool kinds — the
/// model NEVER selects a tool. Returns `{schema_version, primary_intent, steps:[{kind,reason,entity,scope,
/// required,executable}], notes}`. A boundary/refusal resolution yields exactly `[HONEST_FALLBACK]` (safety
/// golden rule). Rust decides; TS transports and (a later increment) invokes the existing callables by kind.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn plan_tools_json(question: &str) -> String {
    serde_json::to_string(&toolplan::plan_tools_for_question(question))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 3 — the typed ToolPlanner §5): the full static tool-contract registry — all 19
/// [`toolplan::ToolKind`]s with their complete [`toolplan::ToolContract`] (input/output contract, authority,
/// authorization, visibility, supported entities, freshness, timeout, error reason codes, retry + fallback
/// policy, executable). Inspectable/guardable; every fallback chain terminates at HONEST_FALLBACK.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn tool_contracts_json() -> String {
    serde_json::to_string(&toolplan::tool_contracts()).unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (Increment 3): the closed reason-code set (reason.rs wire forms) — the authority the
/// REASON_CODE_LOOKUP tool reuses. Thin adaptation surface over the existing `reason::ALL_REASON_CODES`
/// (no new logic). Returns a JSON array of `{code, is_internal_coverage_failure}`.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn reason_codes_json() -> String {
    let items: Vec<serde_json::Value> = reason::ALL_REASON_CODES
        .iter()
        .map(|c| {
            serde_json::json!({
                "code": c.as_str(),
                "is_internal_coverage_failure": c.is_internal_coverage_failure(),
            })
        })
        .collect();
    serde_json::to_string(&items).unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.6): the full typed protocol RelationGraph (nodes, edges, rejected, conflicts,
/// checksum) built deterministically from the canonical document registry's explicit relation fields.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn relation_graph_json() -> String {
    serde_json::to_string(relation::graph()).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.6): relations touching one document. `direction` ∈ "out" | "in" | "both".
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn relations_for_document_json(id: &str, direction: &str) -> String {
    serde_json::to_string(&relation::relations_for(id, direction))
        .unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.6): all relations of one kind (snake_case, e.g. "supersedes" | "related_to").
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn relations_of_kind_json(kind: &str) -> String {
    match relation::RelationKind::ALL
        .iter()
        .find(|k| k.as_str() == kind)
        .copied()
    {
        Some(k) => serde_json::to_string(&relation::relations_of_kind(k))
            .unwrap_or_else(|_| "[]".to_string()),
        None => "[]".to_string(),
    }
}

/// Node WASM (M2.18B.6): relations for the concept a question names (resolved to its canonical source id).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn relations_for_concept_json(question: &str, direction: &str) -> String {
    serde_json::to_string(&relation::relations_for_concept(question, direction))
        .unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.6 §9-10): the deterministic RetrievalPlan for a question + router seed (sources,
/// roles, reasons, section hints, chunk limit, conflicts, source-policy status, checksum). No model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn retrieval_plan_json(question: &str, seeded_entity_id: &str) -> String {
    serde_json::to_string(&retrieval::plan_retrieval(question, seeded_entity_id))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.6 §9-10): validate a RetrievalPlan JSON string against its invariants (every source
/// has a reason; no duplicate/orphan source; a comparison carries ≥2 primaries). Returns
/// `{"ok":bool,"errors":[...]}`.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn validate_retrieval_plan_json(question: &str, seeded_entity_id: &str) -> String {
    let plan = retrieval::plan_retrieval(question, seeded_entity_id);
    let errors = retrieval::validate_plan(&plan);
    serde_json::json!({ "ok": errors.is_empty(), "errors": errors }).to_string()
}

/// Node WASM (M2.18B.6 §10): the deterministic AnswerPlan for a question + router seed (answer type,
/// primary + secondary operations, ordered sections, foci, citation requirement, expected model calls,
/// length, locale, checksum). A mixed request preserves every part. No model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn answer_plan_json(question: &str, seeded_entity_id: &str) -> String {
    serde_json::to_string(&answerplan::plan_answer(question, seeded_entity_id))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.3 PART 9): deterministic candidate-only entity SELECTION + semantic coherence.
/// Runs AFTER the entry model over the SAME real candidates: confirms a model pick, drops an invented
/// id, backfills the single dominant candidate a document-directed question left empty, or asks to
/// clarify when several strong candidates compete. Returns {resolved_id, requires_clarification,
/// clarification_candidates, reason}. `primary_intent` is the model's declared intent.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn select_entity_json(
    model_proposed_id: &str,
    model_requires_clarification: bool,
    primary_intent: &str,
    question: &str,
    max: usize,
) -> String {
    let s = catalogue::select_entity(
        model_proposed_id,
        model_requires_clarification,
        primary_intent,
        question,
        max,
    );
    serde_json::to_string(&s).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.6 §11): build the SINGLE enriched FactualPackage from the Rust plans. Rust resolves
/// the intent, plans the answer, plans retrieval/reranking, and draws the facts from exactly the plan's
/// eligible, public sources — attaching each fact's role, checksum and citation key — then embeds the
/// three plans plus full provenance (states, conflicts, citation map, per-source + package checksums,
/// information gaps). This is the only builder the Grounded-Synthesis trunk uses. `seed` is an optional
/// pre-resolved entity id ("" for none); `depth_override` forces a depth ("" = the plan's own depth).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_factual_package_planned_json(
    trace_id: &str,
    question: &str,
    seed: &str,
    depth_override: &str,
) -> String {
    let p = factpack::build_factual_package_planned(trace_id, question, seed, depth_override);
    serde_json::to_string(&p).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.6 §14): the Rust-owned contract versions — the single source of truth for the
/// FactualPackage schema, the output/synthesis prompt contract and the factual-validator policy. The
/// service binds these into the answer cache key so any contract change invalidates every cached answer,
/// and asserts them at startup (fail-closed). Returns {factual_package_version, prompt_version,
/// validator_policy_version}.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn contract_versions_json() -> String {
    serde_json::json!({
        "factual_package_version": factpack::FACTUAL_PACKAGE_VERSION,
        "prompt_version": factpack::PROMPT_VERSION,
        "validator_policy_version": factpack::VALIDATOR_POLICY_VERSION,
    })
    .to_string()
}

/// Node WASM (SPR-1): the versioned progressive-event contract — the family name, major version, schema
/// token (`banzai-progress/1`) and the closed, ordered set of 18 progressive-event kinds the future SSE
/// stream may emit. There is deliberately NO model-token/delta/partial-prose kind: no unvalidated model
/// text is ever streamed. The single source of truth `progressContract.js` re-exports; additive today
/// (the contract is defined, not yet wired into a stream).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn progress_event_contract_json() -> String {
    disposition::progress_event_contract().to_string()
}

/// Node WASM (SPR-1): the closed set of typed [`disposition::ResponseDisposition`] wire forms — the typed
/// FINAL disposition of an answer the UI reacts to (never the raw `grounded` boolean). JSON array.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn response_dispositions_json() -> String {
    serde_json::to_string(
        &disposition::ALL_RESPONSE_DISPOSITIONS
            .iter()
            .map(|d| d.as_str())
            .collect::<Vec<_>>(),
    )
    .unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (SPR-1): classify a DispositionInput (resolution facts as JSON) to its typed
/// [`disposition::ResponseDisposition`], echoing the normalized safe [`disposition::BoundaryContext`].
/// Safety first (a boundary → REFUSED). Returns `{disposition, boundary_context:{is_boundary,
/// boundary_kind,refused}}` — public-safe only, never a prompt/secret/echoed user text.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn response_disposition_json(input_json: &str) -> String {
    disposition::response_disposition_for_json(input_json)
}

/// Node WASM (SPR-1): the safe, public boundary facts for a raw question — `{is_boundary, boundary_kind,
/// refused}` derived from the deterministic boundary engine. DROPS every free-text/echo field of the
/// internal decision (matched action/object/target, trace codes); never a prompt, never a secret.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn boundary_context_json(question: &str) -> String {
    serde_json::to_string(&disposition::boundary_context_from(&boundary::evaluate(
        question,
    )))
    .unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.7): the canonical entity ids that carry declared primary-source coverage. The
/// pipeline seeds the grounded trunk with the router's canonical-entity entry id ONLY when it is one of
/// these, so a definition/explanation about a known entity ("o que é o BANZA?") grounds on the entity's
/// primary sources instead of degrading to a generic answer — without changing the seed for any
/// non-covered route. Returns a JSON array of entity ids.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn covered_entities_json() -> String {
    serde_json::to_string(&coverage::covered_entities()).unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.7): resolve an EXACT-FACT attribute question (creation year/date, …) about a
/// canonical entity to a deterministic answer (0 model calls) — or a precise NOT_DECLARED contextual
/// message when the canonical public documentation does not declare it (never inferred, never the generic
/// topic list). Returns the AttributeAnswer JSON; `matched:false` when this is not an attribute question
/// the registry owns (the pipeline then continues to normal grounding).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn attribute_answer_json(question: &str) -> String {
    attribute::resolve_attribute_query_json(question)
}

/// Node WASM (M2.18B.5): deterministic typo tolerance / intent recovery. Returns the Recovery JSON
/// (original, normalized, corrected_query, band, corrections[], clarification[], requires_clarification,
/// automatic, reason). The router applies a high-confidence corrected_query to a COPY of the question and
/// re-runs the exact resolvers + boundary on it; an ambiguous band drives a Rust clarification. No model,
/// no I/O. Fuzzy never overtakes an exact match — see fuzzy.rs.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn recover_query_json(question: &str) -> String {
    serde_json::to_string(&fuzzy::recover(question)).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (M2.18B.5 §25): the canonical alias TRUTH TABLE + any silent collisions, for the
/// alias-integrity guard and the report appendix. `{ rows: [{id, alias, normalized, source}], collisions:
/// [[alias, [ids...]]], count }`. A non-empty `collisions` means an alias resolves to two ids (a bug).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn alias_truth_table_json() -> String {
    serde_json::json!({
        "rows": fuzzy::alias_truth_table(),
        "collisions": fuzzy::alias_collisions(),
        "count": fuzzy::alias_truth_table().len(),
    })
    .to_string()
}

/// Node WASM (M2.18B.4-R2): the canonical ids of EVERY explicit documentary reference in a question, in
/// first-appearance order (["ADR-035","ADR-036"] for "compara a ADR-035 com a ADR-036"). Deterministic
/// registry match — the compare path uses it to package all named documents.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn detect_doc_refs_json(question: &str) -> String {
    let mut ids: Vec<String> = Vec::new();
    for r in docref::detect_refs(question) {
        if !ids.contains(&r.id) {
            ids.push(r.id);
        }
    }
    serde_json::to_string(&ids).unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.3 PART 11): build the output-pass prompt from a FactualPackage JSON. Returns
/// {system, user}. The system prompt enforces synthesis from the numbered facts only + the claim map.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_output_prompt_json(question: &str, package_json: &str, depth: &str) -> String {
    match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(pkg) => serde_json::to_string(&synth::build_output_prompt(question, &pkg, depth))
            .unwrap_or_else(|_| "{}".to_string()),
        Err(e) => serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    }
}

/// Node WASM (M2.18B.3 PART 11): the candidate-constrained OUTPUT schema for a FactualPackage JSON —
/// claims[].fact_ids and cited_source_ids are grammar-bound to the package's real ids, so an invented
/// fact reference or out-of-set citation is structurally impossible. Fed as response_format.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn output_schema_json(package_json: &str) -> String {
    match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(pkg) => synth::output_schema(&pkg).to_string(),
        Err(e) => serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    }
}

/// SPR-4 §5 — the STRUCTURED-generation output prompt: the model authors only the linguistic core; it is
/// not asked to fill `cited_source_ids` (derived deterministically downstream). See
/// [`synth::build_output_prompt_structured`].
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_output_prompt_structured_json(
    question: &str,
    package_json: &str,
    depth: &str,
) -> String {
    match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(pkg) => serde_json::to_string(&synth::build_output_prompt_structured(
            question, &pkg, depth,
        ))
        .unwrap_or_else(|_| "{}".to_string()),
        Err(e) => serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    }
}

/// SPR-4 §5 — the STRUCTURED-generation output schema (no `cited_source_ids`). See
/// [`synth::output_schema_structured`].
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn output_schema_structured_json(package_json: &str) -> String {
    match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(pkg) => synth::output_schema_structured(&pkg).to_string(),
        Err(e) => serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    }
}

/// SPR-4 §5 — derive `cited_source_ids` deterministically from a grounded-output JSON's claim map
/// against the FactualPackage (⊆ allowed_source_ids by construction). Returns a JSON string array.
/// This is the deterministic replacement for the model-authored citation list in the structured path.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn derive_cited_source_ids_json(package_json: &str, output_json: &str) -> String {
    let pkg = match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(p) => p,
        Err(e) => return serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    };
    let out = match synth::parse_output(output_json) {
        Ok(o) => o,
        Err(e) => return serde_json::json!({ "error": format!("bad output: {e}") }).to_string(),
    };
    serde_json::to_string(&synth::derive_cited_source_ids(&pkg, &out))
        .unwrap_or_else(|_| "[]".to_string())
}

/// Node WASM (M2.18B.3 PART 12): the last deterministic gate. Validates a grounded-output JSON against
/// the FactualPackage JSON it was built from — unsupported claims, illegal/out-of-set citations,
/// wrong-doc identity in prose, internal-source leak, insufficient-evidence coherence. Returns the full
/// FactualVerdict; `ok:false` means the answer must NOT be published (fall back to the safe path).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn validate_output_json(package_json: &str, output_json: &str) -> String {
    let pkg = match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(p) => p,
        Err(e) => {
            return serde_json::json!({ "ok": false, "errors": [format!("bad package: {e}")] })
                .to_string()
        }
    };
    let out = match synth::parse_output(output_json) {
        Ok(o) => o,
        Err(e) => {
            return serde_json::json!({ "ok": false, "errors": [e] }).to_string();
        }
    };
    serde_json::to_string(&factcheck::validate_output(&pkg, &out))
        .unwrap_or_else(|_| "{\"ok\":false}".to_string())
}

/// Node WASM (Increment 4 §7/§9): build the TRANSVERSAL FactualPackage for an operational (telemetry)
/// question from the SAME Rust resolution + ToolPlan the documentary trunk uses plus the deterministic tool
/// output (`duration_json` = the typed DurationAnswer view, `claims_json` = the [{claim,category,value_ms}]
/// map, `sources_json` = the citeable [{id,title,path}] set). Numbers are copied verbatim from the tool
/// (SQL) — no model. This routes the operational path through the same package the documentary trunk uses so
/// claim + citation verification is uniform. Returns the FactualPackage JSON.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_operational_package_json(
    trace_id: &str,
    question: &str,
    duration_json: &str,
    claims_json: &str,
    sources_json: &str,
) -> String {
    let p = factpack::build_operational_package(
        trace_id,
        question,
        duration_json,
        claims_json,
        sources_json,
    );
    serde_json::to_string(&p).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 4 §8/§9): the claim taxonomy + claim/citation VERIFIER that runs on the composed
/// answer BEFORE it is returned — documentary trunk AND operational path, uniformly. Classifies every claim
/// (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED) and enforces: an UNSUPPORTED claim, an
/// unlabelled ESTIMATED/HYPOTHETICAL claim, an underived DERIVED calculation, unsupported causality, a single
/// observation dressed as an average (BZO-9), or a dead/invented citation ⇒ `ok:false` (the pipeline serves
/// the deterministic/contextual fallback and never publishes). `output_json` is a {answer_markdown, claims:
/// [{claim,fact_ids?,category?}], cited_source_ids} object (a GroundedOutput is accepted directly). Returns
/// the full ClaimVerdict; `ok:false` means DO NOT publish.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn verify_claims_json(package_json: &str, output_json: &str) -> String {
    let pkg = match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(p) => p,
        Err(e) => {
            return serde_json::json!({ "ok": false, "errors": [format!("bad package: {e}")] })
                .to_string()
        }
    };
    let input = match serde_json::from_str::<factcheck::VerifInput>(output_json) {
        Ok(i) => i,
        Err(e) => {
            return serde_json::json!({ "ok": false, "errors": [format!("bad output: {e}")] })
                .to_string()
        }
    };
    serde_json::to_string(&factcheck::classify_and_verify(&pkg, &input))
        .unwrap_or_else(|_| "{\"ok\":false}".to_string())
}

// ─────────────────────────── Increment 5 (§10–§15) — the question families (Node WASM) ───────────────

/// Node WASM (Increment 5 §10): resolve + explain the reason code a question NAMES. Returns
/// `{found, code, explanation, answer_class, is_internal_coverage_failure}` — the canonical definition from
/// the reason-code registry (reason.rs), not a per-question canned string. `found:false` when the question
/// names no known code (→ the family serves an honest fallback). Rust decides; TS transports.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn explain_reason_code_json(question: &str) -> String {
    match reason::resolve_reason_code(question) {
        Some(c) => serde_json::json!({
            "found": true,
            "code": c.as_str(),
            "explanation": c.explanation(),
            "answer_class": c.answer_class(),
            "is_internal_coverage_failure": c.is_internal_coverage_failure(),
        })
        .to_string(),
        None => serde_json::json!({ "found": false }).to_string(),
    }
}

/// Node WASM (Increment 5 §10–§13): build the TRANSVERSAL FactualPackage for a TOOL-BACKED question family
/// (reason code / execution comparison / diagnosis) from the SAME Rust resolution + ToolPlan plus the
/// deterministic tool output. `tool_results_json` is `[{tool,source_id,title,path,text,kind,observed_at,
/// sha256}]`; every fact's text is copied verbatim from a tool result — no model. Returns the FactualPackage
/// JSON, verified by the SAME claim/citation verifier as the documentary + operational packages.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_family_package_json(
    trace_id: &str,
    question: &str,
    tool_results_json: &str,
) -> String {
    let p = factpack::build_family_package(trace_id, question, tool_results_json);
    serde_json::to_string(&p).unwrap_or_else(|_| "{}".to_string())
}

/// Node WASM (Increment 5 §13): the deterministic diagnosis classifier — separate observed cause /
/// consequence / hypothesis / suggestion from a persisted execution's own step receipts + reason codes.
/// Causality is asserted ONLY where a receipt supports it (a failed step carrying a reason code); a failed
/// step with no reason code yields a marked HYPOTHESIS, never a fabricated cause. `input_json` is
/// `{execution_id, overall_status, steps:[{step_id,status,reason_codes}]}` from `receipts.readExecution`.
/// Returns `{execution_id, overall_status, has_failure, lines:[{label,text,supported,step_id,reason_code}]}`.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn classify_diagnosis_json(input_json: &str) -> String {
    let input = match serde_json::from_str::<diagnose::DiagnosisInput>(input_json) {
        Ok(i) => i,
        Err(e) => {
            return serde_json::json!({ "execution_id": "", "overall_status": "", "has_failure": false, "lines": [], "error": format!("bad input: {e}") }).to_string()
        }
    };
    serde_json::to_string(&diagnose::classify_diagnosis(&input))
        .unwrap_or_else(|_| "{\"lines\":[]}".to_string())
}

// ─────────────────────────── M2.18B.7 Semantic Task Fulfilment (Node WASM) ───────────────────────────

/// The resolved AnswerObligationSet for a question (task ontology + what a fulfilling answer must deliver).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn answer_obligations_json(question: &str, seeded_entity_id: &str) -> String {
    serde_json::to_string(&obligations::obligations_for(question, seeded_entity_id))
        .unwrap_or_else(|_| "{}".to_string())
}

/// A deterministic tasked terminal (0-model) for the structural/example/procedure cases, or
/// `{"matched":false}` when the grounded trunk should handle the question.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn tasked_answer_json(question: &str, seeded_entity_id: &str) -> String {
    match tasked::tasked_answer(question, seeded_entity_id) {
        Some(a) => serde_json::to_string(&a).unwrap_or_else(|_| "{\"matched\":false}".to_string()),
        None => "{\"matched\":false}".to_string(),
    }
}

/// M2.18B.7 (fallback fix) — a deterministic DOCUMENT-LOOKUP card (title · type · status · date · path +
/// a short source-bound summary + the standing boundary) for a bare document reference, 0 model calls.
/// Returns `{"matched":false}` when the question is NOT a lookup (an explain/impact/summary request
/// escalates to the grounded trunk) or the document does not resolve. `document_id` is the optional
/// structured id from the "Explicar com BanzAI" button; empty means "detect from the question".
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn document_lookup_card_json(question: &str, document_id: &str) -> String {
    match docref::document_lookup_card(question, document_id) {
        Some(c) => serde_json::to_string(&c).unwrap_or_else(|_| "{\"matched\":false}".to_string()),
        None => "{\"matched\":false}".to_string(),
    }
}

/// The obligations-aware output-synthesis prompt: the base grounding prompt PLUS the per-task output-shape
/// directive so the model FULFILS the task (example→scenario, procedure→steps, template→fields).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_output_prompt_obliged_json(
    question: &str,
    package_json: &str,
    depth: &str,
    obligations_json: &str,
) -> String {
    let pkg = match serde_json::from_str::<factpack::FactualPackage>(package_json) {
        Ok(p) => p,
        Err(e) => return serde_json::json!({ "error": format!("bad package: {e}") }).to_string(),
    };
    let ob = match serde_json::from_str::<obligations::AnswerObligationSet>(obligations_json) {
        Ok(o) => o,
        Err(_) => {
            return serde_json::to_string(&synth::build_output_prompt(question, &pkg, depth))
                .unwrap_or_else(|_| "{}".to_string())
        }
    };
    serde_json::to_string(&synth::build_output_prompt_obliged(
        question, &pkg, depth, &ob,
    ))
    .unwrap_or_else(|_| "{}".to_string())
}

/// The deterministic Task-Completion validator: does the produced answer FULFIL the task's obligations?
/// `cited_source_ids_json` is a JSON string array. Returns the TaskCompletionVerdict; `publishable:false`
/// means the pipeline must NOT publish it as a success.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn task_completion_json(
    obligations_json: &str,
    answer_markdown: &str,
    cited_source_ids_json: &str,
    facts_available: usize,
    source_appropriate: bool,
) -> String {
    let ob = match serde_json::from_str::<obligations::AnswerObligationSet>(obligations_json) {
        Ok(o) => o,
        Err(e) => {
            return serde_json::json!({ "error": format!("bad obligations: {e}") }).to_string()
        }
    };
    let cited: Vec<String> = serde_json::from_str(cited_source_ids_json).unwrap_or_default();
    serde_json::to_string(&taskcheck::check_completion(
        &ob,
        answer_markdown,
        &cited,
        facts_available,
        source_appropriate,
    ))
    .unwrap_or_else(|_| "{}".to_string())
}

/// M2.18B.7 (DFN) — the whole tasked CATALOGUE as data (subject, aliases, deliverables, source ids/paths),
/// so the canonical-protocol-vocabulary derivation + guard can prove the Subject Registry is a projection of
/// the catalogue DATA, not a hand-maintained list. Deterministic, no model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn catalogue_subjects_json() -> String {
    serde_json::to_string(&tasked::catalogue_subjects()).unwrap_or_else(|_| "[]".to_string())
}

/// M2.18B.7 DFN-7 — the catalogue TEMPLATES as data (subject, schema id/path, body, required fields), so the
/// schema-validation harness proves each published template against its REAL canonical schema. No model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn catalogue_templates_json() -> String {
    serde_json::to_string(&tasked::catalogue_templates()).unwrap_or_else(|_| "[]".to_string())
}

/// M2.18B.7 DFN-7 — the single "schema validator" authority, callable at runtime and by the guard: validate
/// a JSON instance against a JSON schema. Returns a SchemaVerdict {ok, errors}. Deterministic, no model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn validate_against_schema_json(instance_json: &str, schema_json: &str) -> String {
    let inst: serde_json::Value = match serde_json::from_str(instance_json) {
        Ok(v) => v,
        Err(e) => return serde_json::json!({ "ok": false, "errors": [format!("bad instance json: {e}")] }).to_string(),
    };
    let sch: serde_json::Value = match serde_json::from_str(schema_json) {
        Ok(v) => v,
        Err(e) => {
            return serde_json::json!({ "ok": false, "errors": [format!("bad schema json: {e}")] })
                .to_string()
        }
    };
    serde_json::to_string(&schemacheck::validate_against_schema(&inst, &sch))
        .unwrap_or_else(|_| "{\"ok\":false,\"errors\":[\"serialize\"]}".to_string())
}

/// M2.18B.7 (TFG-3) — classify HOW conversation context resolved the current turn (typed trace) and the
/// question whose TASK governs the answer shape (the current turn always wins over a prior turn's verb).
/// Returns `{ context_used_for, task_question }`. Deterministic, no model.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn context_used_for_json(raw: &str, resolved: &str, has_context: bool) -> String {
    let role = obligations::classify_context_use(raw, resolved, has_context);
    let tq = obligations::task_from_current_turn(raw, resolved, has_context);
    serde_json::json!({ "context_used_for": role.as_str(), "task_question": tq }).to_string()
}

/// Node WASM (M2.18B.2): the deterministic action-boundary decision for a raw question — the
/// safety preflight the pipeline runs BEFORE any model call. Returns the explainable BoundaryDecision
/// (category, matched action/object/target, severity, informational_exception, negation, modal,
/// document_reference, uncertain, safe_response_id, trace_code). No model, no I/O.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn boundary_evaluate_json(question: &str) -> String {
    let d = boundary::evaluate(question);
    serde_json::json!({
        "boundary_detected": d.boundary_detected,
        "boundary_category": d.boundary_category,
        "matched_action": d.matched_action,
        "matched_object": d.matched_object,
        "matched_target": d.matched_target,
        "confidence": d.confidence,
        "severity": d.severity,
        "informational_exception": d.informational_exception,
        "negation_detected": d.negation_detected,
        "modal_detected": d.modal_detected,
        "document_reference_present": d.document_reference_present,
        "uncertain": d.uncertain,
        "safe_response_id": d.safe_response_id,
        "trace_code": d.trace_code,
    })
    .to_string()
}

/// Node WASM (ADR-036, M2.8G): the Qwen-first routing decision for a question. Returns
/// `{"action":"qwen|deterministic|refusal|insufficient","entry_id":<id|null>,"intent":"...","reason":"..."}`.
/// The JS pipeline executes this decision — it never decides the route itself.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn route_question_json(question: &str) -> String {
    route::route_json(question)
}

/// Node WASM: is this entry a NORMATIVE DENIAL that must be served verbatim, even when the question
/// carries an explanatory cue that would otherwise escalate a definition into the explanatory trunk?
/// Rust owns the list; the pipeline asks and executes. See `route::is_verbatim_entry`.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn is_verbatim_entry(entry_id: &str) -> bool {
    route::is_verbatim_entry(entry_id)
}

/// Node WASM (M2.11D, QA-2): the routing decision WITH the operator's current journey step.
/// Layered on top of `route_question_json` — safety and the critical boundary are decided first and
/// unchanged; this only rescues a next-step question that the base router already gave up on.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn route_question_with_journey_json(question: &str, journey_step: &str) -> String {
    route::route_with_journey_json(question, journey_step)
}

/// Node WASM (ADR-036, M2.8H): the routing decision WITH short conversation context. `context_json`
/// is a JSON array of previous USER questions (most-recent last). Returns the route plus
/// `context_used`, `turns_used`, `resolved_query`. Safety is never bypassed by context.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn route_with_context_json(question: &str, context_json: &str) -> String {
    route::route_with_context_json(question, context_json)
}

/// Node WASM (M2.18B.4): the exact-vs-explanatory classifier as a typed JSON verdict
/// `{"class":"exact_fact|comparison|impact|explanation|safety_refusal","exact_kind":"...","escalated":bool,"reason":"..."}`.
/// The single router uses it to choose a typed EXACT Rust terminal vs the explanatory trunk; the UI never decides.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn answer_class_json(question: &str) -> String {
    route::answer_class_json(question)
}

/// Node WASM (M2.18B.4): the typed TERMINAL for a question — the single router's controlled exact exit.
/// `{"kind":"exact_fact|canonical_definition|safety_refusal|clarification|insufficient_evidence|operational_failure|explanatory_trunk","exact_kind":"...","value":"...","source":{...}|null,"reason_code":"...","trace_label":"...","to_trunk":bool,"escalated":bool}`.
/// `to_trunk` true ⇒ run the grounded synthesis; else serve the typed terminal. UI renders, never decides.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_terminal_json(question: &str) -> String {
    terminal::build_terminal_json(question)
}

/// Node WASM (M2.18B.4): resolve a broad concept question to its canonical source id — a registry
/// ADR/RFC id (federation→ADR-025) OR a public Reference/spec/governance document PATH
/// (governance→docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md). Empty string when the question names no
/// single-canonical concept. The single router uses it to SEED the trunk's resolver and to know a concept
/// has grounding before running the model. Pure; never invents a source.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_concept_source(question: &str) -> String {
    concept::resolve_concept(question).unwrap_or("").to_string()
}

/// Node WASM (M2.13C-A): the INTENT FAMILY for an ambiguous protocol question (label only; never
/// changes routing). One of software_license_query, financial_authorization_query,
/// operator_certification_query, trademark_usage_query, protocol_rule_query, implementation_query,
/// route_state_query, security_action_query, general_query.
/// Node WASM (M2.14F): the ANSWER TYPE a question expects (capabilities_and_limits, yes_no_with_boundary,
/// comparison, how_it_works, example_safe, implementation_stack, governance_explanation,
/// operator_zero_guidance, financial_concept, safe_refusal, definition, follow_up_expansion,
/// fallback_clarification) — telemetry + composition label; never changes routing/safety.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn answer_type_str(question: &str) -> String {
    crate::route::answer_type(question).to_string()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn classify_query_intent_str(question: &str) -> String {
    route::classify_query_intent(question).to_string()
}

// M2.14I (ADR-036) — the primary human-operator interface router: telemetry classification of a
// human/operator request into one of the 14 workbench intents. Label only; never changes routing.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn primary_interface_intent_str(question: &str) -> String {
    route::primary_interface_intent(question).to_string()
}

/// Node WASM (M2.13C-A): the SOURCE-RANKING matrix for a question's intent. Returns
/// `{"intent":"...","primary":[..],"penalize":[..]}` — the repo-index categories to prioritise /
/// push down for that family's citations. Deterministic; no model, no network.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn intent_source_ranking_json(question: &str) -> String {
    let intent = route::classify_query_intent(question);
    let (primary, penalize) = route::intent_source_ranking(intent);
    let primary = serde_json::to_string(&primary).unwrap_or_else(|_| "[]".into());
    let penalize = serde_json::to_string(&penalize).unwrap_or_else(|_| "[]".into());
    format!("{{\"intent\":\"{intent}\",\"primary\":{primary},\"penalize\":{penalize}}}")
}

/// Node WASM (ADR-036): validate a language-model completion. Returns
/// `{"ok":bool,"reason":"..."}`. `ok=false` → the pipeline must serve the deterministic
/// grounded fallback instead of the model text.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn validate_response_json(text: &str) -> String {
    let v = validate::validate_response(text);
    let reason = serde_json::to_string(v.reason).unwrap_or_else(|_| "\"\"".into());
    format!("{{\"ok\":{},\"reason\":{}}}", v.ok, reason)
}

/// Node WASM (ADR-036): strip a leading echo of the question from a completion (M2.11D, QA-3).
/// Deterministic and narrow — see `validate::strip_question_echo` for the exact rule and why it is
/// deliberately conservative.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn strip_question_echo_text(answer: &str, question: &str) -> String {
    validate::strip_question_echo(answer, question)
}

/// Node WASM (ADR-036): build the `{system, user}` prompt for a language model from the
/// approved retrieval context. Retrieved sources and the question are treated as data;
/// the rigid system rules and injection defence are defined in Rust.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_prompt_json(question: &str, context_json: &str, mode: &str) -> String {
    prompt::build_prompt(question, context_json, mode)
}

/// Node WASM (M2.10A): resolve an explicit documentary reference (ADR/RFC) named in a question to
/// its canonical document and sources. Returns `{"detected":false}` when the question names no
/// document, and `{"detected":true,"found":false,...}` when it names one that does not exist — so
/// the caller can say "not found" instead of degrading into a generic retrieval miss.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resolve_document_json(question: &str) -> String {
    crate::docref::resolve_question_json(question)
}

/// Node WASM (M2.14E): inference-queue POLICY. `queue_priority_str` scores a model-bound request
/// (high | normal | low) so the queue can reorder without ever bypassing safety/cache/limits;
/// `queue_should_dedup_flag` ("1"/"0") says whether a plain question is safe to de-duplicate against
/// an identical in-flight one; `queue_public_message_str` is the single source of truth for the SAFE
/// public message (never leaks the retired one-request phrasing, workers, locks or internal detail).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn queue_priority_str(question: &str) -> String {
    crate::queue_policy::priority(question).to_string()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn queue_should_dedup_flag(
    has_context: bool,
    has_journey: bool,
    has_document: bool,
    has_uploads: bool,
) -> String {
    if crate::queue_policy::should_dedup(has_context, has_journey, has_document, has_uploads) {
        "1".to_string()
    } else {
        "0".to_string()
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn queue_public_message_str(kind: &str) -> String {
    crate::queue_policy::public_message(kind).to_string()
}
