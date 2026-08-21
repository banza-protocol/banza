/* @ts-self-types="./banzai_api_kb.d.ts" */

/**
 * Node WASM (M2.18B.5 §25): the canonical alias TRUTH TABLE + any silent collisions, for the
 * alias-integrity guard and the report appendix. `{ rows: [{id, alias, normalized, source}], collisions:
 * [[alias, [ids...]]], count }`. A non-empty `collisions` means an alias resolves to two ids (a bug).
 * @returns {string}
 */
function alias_truth_table_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.alias_truth_table_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.alias_truth_table_json = alias_truth_table_json;

/**
 * Node WASM (M2.18B.4): the exact-vs-explanatory classifier as a typed JSON verdict
 * `{"class":"exact_fact|comparison|impact|explanation|safety_refusal","exact_kind":"...","escalated":bool,"reason":"..."}`.
 * The single router uses it to choose a typed EXACT Rust terminal vs the explanatory trunk; the UI never decides.
 * @param {string} question
 * @returns {string}
 */
function answer_class_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.answer_class_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.answer_class_json = answer_class_json;

/**
 * The resolved AnswerObligationSet for a question (task ontology + what a fulfilling answer must deliver).
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function answer_obligations_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.answer_obligations_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.answer_obligations_json = answer_obligations_json;

/**
 * Node WASM (M2.18B.6 §10): the deterministic AnswerPlan for a question + router seed (answer type,
 * primary + secondary operations, ordered sections, foci, citation requirement, expected model calls,
 * length, locale, checksum). A mixed request preserves every part. No model.
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function answer_plan_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.answer_plan_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.answer_plan_json = answer_plan_json;

/**
 * Node WASM (M2.13C-A): the INTENT FAMILY for an ambiguous protocol question (label only; never
 * changes routing). One of software_license_query, financial_authorization_query,
 * operator_certification_query, trademark_usage_query, protocol_rule_query, implementation_query,
 * route_state_query, security_action_query, general_query.
 * Node WASM (M2.14F): the ANSWER TYPE a question expects (capabilities_and_limits, yes_no_with_boundary,
 * comparison, how_it_works, example_safe, implementation_stack, governance_explanation,
 * operator_zero_guidance, financial_concept, safe_refusal, definition, follow_up_expansion,
 * fallback_clarification) — telemetry + composition label; never changes routing/safety.
 * @param {string} question
 * @returns {string}
 */
function answer_type_str(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.answer_type_str(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.answer_type_str = answer_type_str;

/**
 * Node WASM (M2.18B.7): resolve an EXACT-FACT attribute question (creation year/date, …) about a
 * canonical entity to a deterministic answer (0 model calls) — or a precise NOT_DECLARED contextual
 * message when the canonical public documentation does not declare it (never inferred, never the generic
 * topic list). Returns the AttributeAnswer JSON; `matched:false` when this is not an attribute question
 * the registry owns (the pipeline then continues to normal grounding).
 * @param {string} question
 * @returns {string}
 */
function attribute_answer_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.attribute_answer_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.attribute_answer_json = attribute_answer_json;

/**
 * Node WASM (SPR-1): the safe, public boundary facts for a raw question — `{is_boundary, boundary_kind,
 * refused}` derived from the deterministic boundary engine. DROPS every free-text/echo field of the
 * internal decision (matched action/object/target, trace codes); never a prompt, never a secret.
 * @param {string} question
 * @returns {string}
 */
function boundary_context_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.boundary_context_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.boundary_context_json = boundary_context_json;

/**
 * Node WASM (M2.18B.2): the deterministic action-boundary decision for a raw question — the
 * safety preflight the pipeline runs BEFORE any model call. Returns the explainable BoundaryDecision
 * (category, matched action/object/target, severity, informational_exception, negation, modal,
 * document_reference, uncertain, safe_response_id, trace_code). No model, no I/O.
 * @param {string} question
 * @returns {string}
 */
function boundary_evaluate_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.boundary_evaluate_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.boundary_evaluate_json = boundary_evaluate_json;

/**
 * Node WASM (M2.18B.6 §11): build the SINGLE enriched FactualPackage from the Rust plans. Rust resolves
 * the intent, plans the answer, plans retrieval/reranking, and draws the facts from exactly the plan's
 * eligible, public sources — attaching each fact's role, checksum and citation key — then embeds the
 * three plans plus full provenance (states, conflicts, citation map, per-source + package checksums,
 * information gaps). This is the only builder the Grounded-Synthesis trunk uses. `seed` is an optional
 * pre-resolved entity id ("" for none); `depth_override` forces a depth ("" = the plan's own depth).
 * @param {string} trace_id
 * @param {string} question
 * @param {string} seed
 * @param {string} depth_override
 * @returns {string}
 */
function build_factual_package_planned_json(trace_id, question, seed, depth_override) {
    let deferred5_0;
    let deferred5_1;
    try {
        const ptr0 = passStringToWasm0(trace_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(depth_override, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.build_factual_package_planned_json(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        deferred5_0 = ret[0];
        deferred5_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
    }
}
exports.build_factual_package_planned_json = build_factual_package_planned_json;

/**
 * Node WASM (Increment 5 §10–§13): build the TRANSVERSAL FactualPackage for a TOOL-BACKED question family
 * (reason code / execution comparison / diagnosis) from the SAME Rust resolution + ToolPlan plus the
 * deterministic tool output. `tool_results_json` is `[{tool,source_id,title,path,text,kind,observed_at,
 * sha256}]`; every fact's text is copied verbatim from a tool result — no model. Returns the FactualPackage
 * JSON, verified by the SAME claim/citation verifier as the documentary + operational packages.
 * @param {string} trace_id
 * @param {string} question
 * @param {string} tool_results_json
 * @returns {string}
 */
function build_family_package_json(trace_id, question, tool_results_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(trace_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(tool_results_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.build_family_package_json(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.build_family_package_json = build_family_package_json;

/**
 * Node WASM (Increment 4 §7/§9): build the TRANSVERSAL FactualPackage for an operational (telemetry)
 * question from the SAME Rust resolution + ToolPlan the documentary trunk uses plus the deterministic tool
 * output (`duration_json` = the typed DurationAnswer view, `claims_json` = the [{claim,category,value_ms}]
 * map, `sources_json` = the citeable [{id,title,path}] set). Numbers are copied verbatim from the tool
 * (SQL) — no model. This routes the operational path through the same package the documentary trunk uses so
 * claim + citation verification is uniform. Returns the FactualPackage JSON.
 * @param {string} trace_id
 * @param {string} question
 * @param {string} duration_json
 * @param {string} claims_json
 * @param {string} sources_json
 * @returns {string}
 */
function build_operational_package_json(trace_id, question, duration_json, claims_json, sources_json) {
    let deferred6_0;
    let deferred6_1;
    try {
        const ptr0 = passStringToWasm0(trace_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(duration_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(claims_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(sources_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.build_operational_package_json(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        deferred6_0 = ret[0];
        deferred6_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
    }
}
exports.build_operational_package_json = build_operational_package_json;

/**
 * Node WASM (M2.18B.3 PART 11): build the output-pass prompt from a FactualPackage JSON. Returns
 * {system, user}. The system prompt enforces synthesis from the numbered facts only + the claim map.
 * @param {string} question
 * @param {string} package_json
 * @param {string} depth
 * @param {string} locale
 * @returns {string}
 */
function build_output_prompt_json(question, package_json, depth, locale) {
    let deferred5_0;
    let deferred5_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(depth, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.build_output_prompt_json(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        deferred5_0 = ret[0];
        deferred5_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
    }
}
exports.build_output_prompt_json = build_output_prompt_json;

/**
 * The obligations-aware output-synthesis prompt: the base grounding prompt PLUS the per-task output-shape
 * directive so the model FULFILS the task (example→scenario, procedure→steps, template→fields).
 * @param {string} question
 * @param {string} package_json
 * @param {string} depth
 * @param {string} obligations_json
 * @param {string} locale
 * @returns {string}
 */
function build_output_prompt_obliged_json(question, package_json, depth, obligations_json, locale) {
    let deferred6_0;
    let deferred6_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(depth, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(obligations_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.build_output_prompt_obliged_json(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        deferred6_0 = ret[0];
        deferred6_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
    }
}
exports.build_output_prompt_obliged_json = build_output_prompt_obliged_json;

/**
 * SPR-4 §5 — the STRUCTURED-generation output prompt: the model authors only the linguistic core; it is
 * not asked to fill `cited_source_ids` (derived deterministically downstream). See
 * [`synth::build_output_prompt_structured`].
 * @param {string} question
 * @param {string} package_json
 * @param {string} depth
 * @param {string} locale
 * @returns {string}
 */
function build_output_prompt_structured_json(question, package_json, depth, locale) {
    let deferred5_0;
    let deferred5_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(depth, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.build_output_prompt_structured_json(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        deferred5_0 = ret[0];
        deferred5_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
    }
}
exports.build_output_prompt_structured_json = build_output_prompt_structured_json;

/**
 * Node WASM (ADR-036): build the `{system, user}` prompt for a language model from the
 * approved retrieval context. Retrieved sources and the question are treated as data;
 * the rigid system rules and injection defence are defined in Rust.
 * @param {string} question
 * @param {string} context_json
 * @param {string} mode
 * @returns {string}
 */
function build_prompt_json(question, context_json, mode) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(context_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.build_prompt_json(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.build_prompt_json = build_prompt_json;

/**
 * Node WASM (M2.18B.4): the typed TERMINAL for a question — the single router's controlled exact exit.
 * `{"kind":"exact_fact|canonical_definition|safety_refusal|clarification|insufficient_evidence|operational_failure|explanatory_trunk","exact_kind":"...","value":"...","source":{...}|null,"reason_code":"...","trace_label":"...","to_trunk":bool,"escalated":bool}`.
 * `to_trunk` true ⇒ run the grounded synthesis; else serve the typed terminal. UI renders, never decides.
 * @param {string} question
 * @returns {string}
 */
function build_terminal_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.build_terminal_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.build_terminal_json = build_terminal_json;

/**
 * M2.18B.7 (DFN) — the whole tasked CATALOGUE as data (subject, aliases, deliverables, source ids/paths),
 * so the canonical-protocol-vocabulary derivation + guard can prove the Subject Registry is a projection of
 * the catalogue DATA, not a hand-maintained list. Deterministic, no model.
 * @returns {string}
 */
function catalogue_subjects_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.catalogue_subjects_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.catalogue_subjects_json = catalogue_subjects_json;

/**
 * M2.18B.7 DFN-7 — the catalogue TEMPLATES as data (subject, schema id/path, body, required fields), so the
 * schema-validation harness proves each published template against its REAL canonical schema. No model.
 * @returns {string}
 */
function catalogue_templates_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.catalogue_templates_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.catalogue_templates_json = catalogue_templates_json;

/**
 * Node WASM (Increment 5 §13): the deterministic diagnosis classifier — separate observed cause /
 * consequence / hypothesis / suggestion from a persisted execution's own step receipts + reason codes.
 * Causality is asserted ONLY where a receipt supports it (a failed step carrying a reason code); a failed
 * step with no reason code yields a marked HYPOTHESIS, never a fabricated cause. `input_json` is
 * `{execution_id, overall_status, steps:[{step_id,status,reason_codes}]}` from `receipts.readExecution`.
 * Returns `{execution_id, overall_status, has_failure, lines:[{label,text,supported,step_id,reason_code}]}`.
 * @param {string} input_json
 * @returns {string}
 */
function classify_diagnosis_json(input_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(input_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.classify_diagnosis_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.classify_diagnosis_json = classify_diagnosis_json;

/**
 * @param {string} question
 * @returns {string}
 */
function classify_query_intent_str(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.classify_query_intent_str(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.classify_query_intent_str = classify_query_intent_str;

/**
 * M2.18B.7 (TFG-3) — classify HOW conversation context resolved the current turn (typed trace) and the
 * question whose TASK governs the answer shape (the current turn always wins over a prior turn's verb).
 * Returns `{ context_used_for, task_question }`. Deterministic, no model.
 * @param {string} raw
 * @param {string} resolved
 * @param {boolean} has_context
 * @returns {string}
 */
function context_used_for_json(raw, resolved, has_context) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(raw, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(resolved, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.context_used_for_json(ptr0, len0, ptr1, len1, has_context);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.context_used_for_json = context_used_for_json;

/**
 * Node WASM (Increment 2 — contextual fallback §2/§4): the engine-decided, request-oriented fallback that
 * REPLACES the fixed topic list for an understood-but-unmapped, NON-boundary question. `situation` lets the
 * pipeline report what physically happened ("tool_unavailable" | "insufficient_source" | "" = auto). Returns
 * `{kind, interpreted_intent, sub_intents, message}` — never a generic topic list. The boundary/refusal
 * path never calls this. Rust authors the copy; TS only transports.
 * @param {string} question
 * @param {string} situation
 * @returns {string}
 */
function contextual_fallback_json(question, situation) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(situation, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.contextual_fallback_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.contextual_fallback_json = contextual_fallback_json;

/**
 * Node WASM (M2.18B.6 §14): the Rust-owned contract versions — the single source of truth for the
 * FactualPackage schema, the output/synthesis prompt contract and the factual-validator policy. The
 * service binds these into the answer cache key so any contract change invalidates every cached answer,
 * and asserts them at startup (fail-closed). Returns {factual_package_version, prompt_version,
 * validator_policy_version}.
 * @returns {string}
 */
function contract_versions_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.contract_versions_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.contract_versions_json = contract_versions_json;

/**
 * Node WASM (M2.18B.7): the canonical entity ids that carry declared primary-source coverage. The
 * pipeline seeds the grounded trunk with the router's canonical-entity entry id ONLY when it is one of
 * these, so a definition/explanation about a known entity ("o que é o BANZA?") grounds on the entity's
 * primary sources instead of degrading to a generic answer — without changing the seed for any
 * non-covered route. Returns a JSON array of entity ids.
 * @returns {string}
 */
function covered_entities_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.covered_entities_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.covered_entities_json = covered_entities_json;

/**
 * SPR-4 §5 — derive `cited_source_ids` deterministically from a grounded-output JSON's claim map
 * against the FactualPackage (⊆ allowed_source_ids by construction). Returns a JSON string array.
 * This is the deterministic replacement for the model-authored citation list in the structured path.
 * @param {string} package_json
 * @param {string} output_json
 * @returns {string}
 */
function derive_cited_source_ids_json(package_json, output_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(output_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.derive_cited_source_ids_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.derive_cited_source_ids_json = derive_cited_source_ids_json;

/**
 * Node WASM (M2.18B.4-R2): the canonical ids of EVERY explicit documentary reference in a question, in
 * first-appearance order (["ADR-035","ADR-036"] for "compara a ADR-035 com a ADR-036"). Deterministic
 * registry match — the compare path uses it to package all named documents.
 * @param {string} question
 * @returns {string}
 */
function detect_doc_refs_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.detect_doc_refs_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.detect_doc_refs_json = detect_doc_refs_json;

/**
 * M2.18B.7 (fallback fix) — a deterministic DOCUMENT-LOOKUP card (title · type · status · date · path +
 * a short source-bound summary + the standing boundary) for a bare document reference, 0 model calls.
 * Returns `{"matched":false}` when the question is NOT a lookup (an explain/impact/summary request
 * escalates to the grounded trunk) or the document does not resolve. `document_id` is the optional
 * structured id from the "Explicar com BanzAI" button; empty means "detect from the question".
 * @param {string} question
 * @param {string} document_id
 * @param {string} locale
 * @returns {string}
 */
function document_lookup_card_json(question, document_id, locale) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(document_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(locale, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.document_lookup_card_json(ptr0, len0, ptr1, len1, ptr2, len2);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.document_lookup_card_json = document_lookup_card_json;

/**
 * Node WASM: the routing source state this binary was built from, so a checker can prove the shipped
 * router IS the current source rather than merely behaving like it on a sample of questions.
 * @returns {string}
 */
function engine_source_fingerprint_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.engine_source_fingerprint_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.engine_source_fingerprint_json = engine_source_fingerprint_json;

/**
 * Node WASM (Increment 5 §10): resolve + explain the reason code a question NAMES. Returns
 * `{found, code, explanation, answer_class, is_internal_coverage_failure}` — the canonical definition from
 * the reason-code registry (reason.rs), not a per-question canned string. `found:false` when the question
 * names no known code (→ the family serves an honest fallback). Rust decides; TS transports.
 * @param {string} question
 * @returns {string}
 */
function explain_reason_code_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.explain_reason_code_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.explain_reason_code_json = explain_reason_code_json;

/**
 * Node WASM (M2.18B.2): deterministic candidate generation. For a natural-language question with no
 * exact identifier, returns up to `max` REAL candidate documents (id/kind/title/score) the interpreter
 * may SELECT among — it never invents an id. Empty when nothing scores above the floor.
 * @param {string} question
 * @param {number} max
 * @returns {string}
 */
function generate_candidates_json(question, max) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_candidates_json(ptr0, len0, max);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.generate_candidates_json = generate_candidates_json;

/**
 * Node WASM (M2.13C-A): the SOURCE-RANKING matrix for a question's intent. Returns
 * `{"intent":"...","primary":[..],"penalize":[..]}` — the repo-index categories to prioritise /
 * push down for that family's citations. Deterministic; no model, no network.
 * @param {string} question
 * @returns {string}
 */
function intent_source_ranking_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.intent_source_ranking_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.intent_source_ranking_json = intent_source_ranking_json;

/**
 * Node WASM: is this entry a NORMATIVE DENIAL that must be served verbatim, even when the question
 * carries an explanatory cue that would otherwise escalate a definition into the explanatory trunk?
 * Rust owns the list; the pipeline asks and executes. See `route::is_verbatim_entry`.
 * @param {string} entry_id
 * @returns {boolean}
 */
function is_verbatim_entry(entry_id) {
    const ptr0 = passStringToWasm0(entry_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.is_verbatim_entry(ptr0, len0);
    return ret !== 0;
}
exports.is_verbatim_entry = is_verbatim_entry;

/**
 * Node WASM: normalization (exposed so JS keeps zero matching logic).
 * @param {string} q
 * @returns {string}
 */
function normalize_query(q) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(q, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.normalize_query(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.normalize_query = normalize_query;

/**
 * Node WASM (M2.18B.3 PART 11): the candidate-constrained OUTPUT schema for a FactualPackage JSON —
 * claims[].fact_ids and cited_source_ids are grammar-bound to the package's real ids, so an invented
 * fact reference or out-of-set citation is structurally impossible. Fed as response_format.
 * @param {string} package_json
 * @returns {string}
 */
function output_schema_json(package_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.output_schema_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.output_schema_json = output_schema_json;

/**
 * SPR-4 §5 — the STRUCTURED-generation output schema (no `cited_source_ids`). See
 * [`synth::output_schema_structured`].
 * @param {string} package_json
 * @returns {string}
 */
function output_schema_structured_json(package_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.output_schema_structured_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.output_schema_structured_json = output_schema_structured_json;

/**
 * Node WASM (Increment 3 — the typed ToolPlanner §6): the deterministic, ordered ToolPlan for a question.
 * Rust resolves the question (taxonomy::resolve_query) and maps the resolution to typed tool kinds — the
 * model NEVER selects a tool. Returns `{schema_version, primary_intent, steps:[{kind,reason,entity,scope,
 * required,executable}], notes}`. A boundary/refusal resolution yields exactly `[HONEST_FALLBACK]` (safety
 * golden rule). Rust decides; TS transports and (a later increment) invokes the existing callables by kind.
 * @param {string} question
 * @returns {string}
 */
function plan_tools_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.plan_tools_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.plan_tools_json = plan_tools_json;

/**
 * @param {string} question
 * @returns {string}
 */
function primary_interface_intent_str(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.primary_interface_intent_str(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.primary_interface_intent_str = primary_interface_intent_str;

/**
 * Node WASM (SPR-1): the versioned progressive-event contract — the family name, major version, schema
 * token (`banzai-progress/1`) and the closed, ordered set of 18 progressive-event kinds the future SSE
 * stream may emit. There is deliberately NO model-token/delta/partial-prose kind: no unvalidated model
 * text is ever streamed. The single source of truth `progressContract.js` re-exports; additive today
 * (the contract is defined, not yet wired into a stream).
 * @returns {string}
 */
function progress_event_contract_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.progress_event_contract_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.progress_event_contract_json = progress_event_contract_json;

/**
 * Node WASM (M2.14E): inference-queue POLICY. `queue_priority_str` scores a model-bound request
 * (high | normal | low) so the queue can reorder without ever bypassing safety/cache/limits;
 * `queue_should_dedup_flag` ("1"/"0") says whether a plain question is safe to de-duplicate against
 * an identical in-flight one; `queue_public_message_str` is the single source of truth for the SAFE
 * public message (never leaks the retired one-request phrasing, workers, locks or internal detail).
 * @param {string} question
 * @returns {string}
 */
function queue_priority_str(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.queue_priority_str(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.queue_priority_str = queue_priority_str;

/**
 * @param {string} kind
 * @returns {string}
 */
function queue_public_message_str(kind) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.queue_public_message_str(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.queue_public_message_str = queue_public_message_str;

/**
 * @param {boolean} has_context
 * @param {boolean} has_journey
 * @param {boolean} has_document
 * @param {boolean} has_uploads
 * @returns {string}
 */
function queue_should_dedup_flag(has_context, has_journey, has_document, has_uploads) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.queue_should_dedup_flag(has_context, has_journey, has_document, has_uploads);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.queue_should_dedup_flag = queue_should_dedup_flag;

/**
 * Node WASM (Increment 3): the closed reason-code set (reason.rs wire forms) — the authority the
 * REASON_CODE_LOOKUP tool reuses. Thin adaptation surface over the existing `reason::ALL_REASON_CODES`
 * (no new logic). Returns a JSON array of `{code, is_internal_coverage_failure}`.
 * @returns {string}
 */
function reason_codes_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.reason_codes_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.reason_codes_json = reason_codes_json;

/**
 * Node WASM (M2.18B.5): deterministic typo tolerance / intent recovery. Returns the Recovery JSON
 * (original, normalized, corrected_query, band, corrections[], clarification[], requires_clarification,
 * automatic, reason). The router applies a high-confidence corrected_query to a COPY of the question and
 * re-runs the exact resolvers + boundary on it; an ambiguous band drives a Rust clarification. No model,
 * no I/O. Fuzzy never overtakes an exact match — see fuzzy.rs.
 * @param {string} question
 * @returns {string}
 */
function recover_query_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recover_query_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.recover_query_json = recover_query_json;

/**
 * Node WASM (M2.18B.6): the full typed protocol RelationGraph (nodes, edges, rejected, conflicts,
 * checksum) built deterministically from the canonical document registry's explicit relation fields.
 * @returns {string}
 */
function relation_graph_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.relation_graph_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.relation_graph_json = relation_graph_json;

/**
 * Node WASM (M2.18B.6): relations for the concept a question names (resolved to its canonical source id).
 * @param {string} question
 * @param {string} direction
 * @returns {string}
 */
function relations_for_concept_json(question, direction) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.relations_for_concept_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.relations_for_concept_json = relations_for_concept_json;

/**
 * Node WASM (M2.18B.6): relations touching one document. `direction` ∈ "out" | "in" | "both".
 * @param {string} id
 * @param {string} direction
 * @returns {string}
 */
function relations_for_document_json(id, direction) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.relations_for_document_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.relations_for_document_json = relations_for_document_json;

/**
 * Node WASM (M2.18B.6): all relations of one kind (snake_case, e.g. "supersedes" | "related_to").
 * @param {string} kind
 * @returns {string}
 */
function relations_of_kind_json(kind) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.relations_of_kind_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.relations_of_kind_json = relations_of_kind_json;

/**
 * Node WASM (M2.13B PR2): the stable repo-index hash (for the JS cache key / staleness).
 * @returns {string}
 */
function repo_index_hash_str() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.repo_index_hash_str();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.repo_index_hash_str = repo_index_hash_str;

/**
 * Node WASM (M2.13B PR2): the repo-index manifest JSON (counts, commits, index_hash, categories).
 * @returns {string}
 */
function repo_index_manifest_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.repo_index_manifest_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.repo_index_manifest_json = repo_index_manifest_json;

/**
 * Node WASM (M2.18B.4): resolve a broad concept question to its canonical source id — a registry
 * ADR/RFC id (federation→ADR-025) OR a public Reference/spec/governance document PATH
 * (governance→docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md). Empty string when the question names no
 * single-canonical concept. The single router uses it to SEED the trunk's resolver and to know a concept
 * has grounding before running the model. Pure; never invents a source.
 * @param {string} question
 * @returns {string}
 */
function resolve_concept_source(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_concept_source(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.resolve_concept_source = resolve_concept_source;

/**
 * Node WASM (M2.10A): resolve an explicit documentary reference (ADR/RFC) named in a question to
 * its canonical document and sources. Returns `{"detected":false}` when the question names no
 * document, and `{"detected":true,"found":false,...}` when it names one that does not exist — so
 * the caller can say "not found" instead of degrading into a generic retrieval miss.
 * @param {string} question
 * @returns {string}
 */
function resolve_document_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_document_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.resolve_document_json = resolve_document_json;

/**
 * Node WASM (M2.18B.6 — Rust-First Grounded Synthesis): the deterministic, model-free understanding of a
 * trunk question. Given a question and the router's authoritative seed (empty ⇒ deterministic candidate
 * selection), returns a typed ResolvedIntent JSON (intent taxonomy, entity, depth, clarification, flags,
 * boundary status, expected_model_calls=1). No model is invoked.
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function resolve_intent_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_intent_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.resolve_intent_json = resolve_intent_json;

/**
 * Node WASM (ADR-036 — operational reasoning): the deterministic classification of a question about a
 * MEASURED/OBSERVED operational property (duration, metric, live state) of the validation journey, plus
 * the Rust-authored honest, request-oriented fallback to serve when telemetry has no comparable data. The
 * pipeline calls this in the operational tier (after every safety/boundary tier). When `is_operational`
 * is true it routes to the read-only telemetry tool and renders a deterministic, source-bound answer with
 * 0 model calls — or serves `honest_fallback` (never the fixed topic list, never an invented number).
 * Rust decides; TS transports.
 * @param {string} question
 * @returns {string}
 */
function resolve_operational_metric_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_operational_metric_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.resolve_operational_metric_json = resolve_operational_metric_json;

/**
 * Node WASM (Increment 2 — operational-intent taxonomy §3): the RICH typed classification of a question.
 * Returns the [`taxonomy::QueryResolution`] JSON (primary_intent + sub_intents + entities + subject +
 * artifact/metric/aggregation/time/comparison/execution descriptors + profile/environment/version +
 * requires_live_data/calculation/documentation/formal_evidence + ambiguities + confidence + resolution
 * state + boundary flag). Boundary questions classify as `boundary_request` and are never reclassified.
 * Rust decides; TS transports.
 * @param {string} question
 * @returns {string}
 */
function resolve_query_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_query_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.resolve_query_json = resolve_query_json;

/**
 * Node WASM (Increment 6 — multi-turn conversational context §16-§17): resolve the conversational
 * references in a follow-up turn against the small, SAFE, technical-only prior context the client carried
 * forward. `prior_context_json` is a JSON object with `{operator_id, implementation_id, execution_id,
 * previous_execution_id, artifact, profile, environment, protocol_version, last_intent, last_family}` (all
 * optional; a first turn carries `{}`). Returns the [`context::ResolvedContext`] JSON: the enriched
 * `resolved_query` + `referent_kind` + `resolved_intent` + `execution_id`/`comparison_targets`/`artifact`
 * + carry-forward operator/implementation/profile/environment/version + resolution_state (RESOLVED |
 * NO_ANAPHORA | NO_REFERENT | BOUNDARY) + requires_clarification + clarification + boundary_detected.
 * SAFETY: a boundary turn is never resolved (resolution_state=BOUNDARY, no referent); an anaphor with no
 * bindable prior context asks to clarify (never a guessed referent). Rust decides; TS transports.
 * @param {string} question
 * @param {string} prior_context_json
 * @returns {string}
 */
function resolve_references_json(question, prior_context_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(prior_context_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_references_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.resolve_references_json = resolve_references_json;

/**
 * Node WASM (BZC-1 — entity + artifact + scope): the deterministic entity/artifact/scope decision for a
 * question, plus the Rust-authored honest answer to serve when `requires_live_tool` is set but the live
 * tool is not yet deployed. The pipeline calls this BEFORE the documental fast path — when
 * `requires_live_tool` is true it serves `live_required_answer` as a 0-model-call terminal and never
 * grounds on a generic protocol document (this is what stops "manifesto do operador zero" resolving to
 * the Protocol Manifesto). Rust decides; TS only transports.
 * @param {string} question
 * @returns {string}
 */
function resolve_scope_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.resolve_scope_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.resolve_scope_json = resolve_scope_json;

/**
 * Node WASM (SPR-1): classify a DispositionInput (resolution facts as JSON) to its typed
 * [`disposition::ResponseDisposition`], echoing the normalized safe [`disposition::BoundaryContext`].
 * Safety first (a boundary → REFUSED). Returns `{disposition, boundary_context:{is_boundary,
 * boundary_kind,refused}}` — public-safe only, never a prompt/secret/echoed user text.
 * @param {string} input_json
 * @returns {string}
 */
function response_disposition_json(input_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(input_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.response_disposition_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.response_disposition_json = response_disposition_json;

/**
 * Node WASM (SPR-1): the closed set of typed [`disposition::ResponseDisposition`] wire forms — the typed
 * FINAL disposition of an answer the UI reacts to (never the raw `grounded` boolean). JSON array.
 * @returns {string}
 */
function response_dispositions_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.response_dispositions_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.response_dispositions_json = response_dispositions_json;

/**
 * Node WASM (M2.18B.6 §9-10): the deterministic RetrievalPlan for a question + router seed (sources,
 * roles, reasons, section hints, chunk limit, conflicts, source-policy status, checksum). No model.
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function retrieval_plan_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.retrieval_plan_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.retrieval_plan_json = retrieval_plan_json;

/**
 * Node WASM (ADR-036, M2.9A): top-k DOCUMENTARY chunks for a query, as a JSON array of
 * `{path,title,section,anchor,source_type,text}`. Used ONLY to enrich the grounded Qwen context with
 * real protocol-doc excerpts (additive citations); it never changes routing. Empty array if none
 * score high enough. Rust owns the scoring; JS is glue.
 * @param {string} query
 * @param {number} k
 * @returns {string}
 */
function retrieve_doc_chunks_json(query, k) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(query, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.retrieve_doc_chunks_json(ptr0, len0, k);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.retrieve_doc_chunks_json = retrieve_doc_chunks_json;

/**
 * Node WASM (M2.13B PR2): the top-k repository-wide chunks for a query, as a JSON array of
 * `{repo,path,file_name,category,title,heading,symbol,language,line_start,line_end,text}`. Optional
 * `categories_csv` restricts to those source categories (comma-separated). Used to enrich a grounded
 * local answer with real, citable repo sources — never changes routing.
 * @param {string} query
 * @param {number} k
 * @param {string} categories_csv
 * @returns {string}
 */
function retrieve_repo_chunks_json(query, k, categories_csv) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(query, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(categories_csv, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.retrieve_repo_chunks_json(ptr0, len0, k, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.retrieve_repo_chunks_json = retrieve_repo_chunks_json;

/**
 * Node WASM: return the retrieved entry ids as a JSON array string.
 * @param {string} question
 * @param {number} k
 * @returns {string}
 */
function retrieve_topk_ids_json(question, k) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.retrieve_topk_ids_json(ptr0, len0, k);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.retrieve_topk_ids_json = retrieve_topk_ids_json;

/**
 * Node WASM (ADR-036, M2.8G): the Qwen-first routing decision for a question. Returns
 * `{"action":"qwen|deterministic|refusal|insufficient","entry_id":<id|null>,"intent":"...","reason":"..."}`.
 * The JS pipeline executes this decision — it never decides the route itself.
 * @param {string} question
 * @returns {string}
 */
function route_question_json(question) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.route_question_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.route_question_json = route_question_json;

/**
 * Node WASM (M2.11D, QA-2): the routing decision WITH the operator's current journey step.
 * Layered on top of `route_question_json` — safety and the critical boundary are decided first and
 * unchanged; this only rescues a next-step question that the base router already gave up on.
 * @param {string} question
 * @param {string} journey_step
 * @returns {string}
 */
function route_question_with_journey_json(question, journey_step) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(journey_step, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.route_question_with_journey_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.route_question_with_journey_json = route_question_with_journey_json;

/**
 * Node WASM (ADR-036, M2.8H): the routing decision WITH short conversation context. `context_json`
 * is a JSON array of previous USER questions (most-recent last). Returns the route plus
 * `context_used`, `turns_used`, `resolved_query`. Safety is never bypassed by context.
 * @param {string} question
 * @param {string} context_json
 * @returns {string}
 */
function route_with_context_json(question, context_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(context_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.route_with_context_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.route_with_context_json = route_with_context_json;

/**
 * Node WASM (M2.18B.7 scope B): the SINGLE typed scenario source — the canonical question classes
 * with their deterministic expectations (class + max Qwen calls + boundary flag). The JS evaluation
 * harness, guards and live-QA manifests read this so there is one scenario authority, never a
 * divergent copy in JS/scripts.
 * @returns {string}
 */
function scenarios_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.scenarios_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.scenarios_json = scenarios_json;

/**
 * Node WASM (M2.18B.3 PART 9): deterministic candidate-only entity SELECTION + semantic coherence.
 * Runs AFTER the entry model over the SAME real candidates: confirms a model pick, drops an invented
 * id, backfills the single dominant candidate a document-directed question left empty, or asks to
 * clarify when several strong candidates compete. Returns {resolved_id, requires_clarification,
 * clarification_candidates, reason}. `primary_intent` is the model's declared intent.
 * @param {string} model_proposed_id
 * @param {boolean} model_requires_clarification
 * @param {string} primary_intent
 * @param {string} question
 * @param {number} max
 * @returns {string}
 */
function select_entity_json(model_proposed_id, model_requires_clarification, primary_intent, question, max) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(model_proposed_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(primary_intent, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.select_entity_json(ptr0, len0, model_requires_clarification, ptr1, len1, ptr2, len2, max);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.select_entity_json = select_entity_json;

/**
 * Node WASM (M2.18): the deterministic public-source policy. `true` when a repository source
 * (given its path + source_category) may be RETRIEVED as a candidate and CITED in a public answer;
 * `false` for internal governance/CI/infra/report/operator-zero sources (e.g. CLAUDE.md). This is
 * the one authority the JS presentation layer (answerContract.js) calls to drop internal sources.
 * @param {string} path
 * @param {string} category
 * @returns {boolean}
 */
function source_is_public(path, category) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(category, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.source_is_public(ptr0, len0, ptr1, len1);
    return ret !== 0;
}
exports.source_is_public = source_is_public;

/**
 * Node WASM (ADR-036): strip a leading echo of the question from a completion (M2.11D, QA-3).
 * Deterministic and narrow — see `validate::strip_question_echo` for the exact rule and why it is
 * deliberately conservative.
 * @param {string} answer
 * @param {string} question
 * @returns {string}
 */
function strip_question_echo_text(answer, question) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(answer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.strip_question_echo_text(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.strip_question_echo_text = strip_question_echo_text;

/**
 * The deterministic Task-Completion validator: does the produced answer FULFIL the task's obligations?
 * `cited_source_ids_json` is a JSON string array. Returns the TaskCompletionVerdict; `publishable:false`
 * means the pipeline must NOT publish it as a success.
 * @param {string} obligations_json
 * @param {string} answer_markdown
 * @param {string} cited_source_ids_json
 * @param {number} facts_available
 * @param {boolean} source_appropriate
 * @returns {string}
 */
function task_completion_json(obligations_json, answer_markdown, cited_source_ids_json, facts_available, source_appropriate) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(obligations_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(answer_markdown, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(cited_source_ids_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.task_completion_json(ptr0, len0, ptr1, len1, ptr2, len2, facts_available, source_appropriate);
        deferred4_0 = ret[0];
        deferred4_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}
exports.task_completion_json = task_completion_json;

/**
 * A deterministic tasked terminal (0-model) for the structural/example/procedure cases, or
 * `{"matched":false}` when the grounded trunk should handle the question.
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function tasked_answer_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.tasked_answer_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.tasked_answer_json = tasked_answer_json;

/**
 * Node WASM (Increment 3 — the typed ToolPlanner §5): the full static tool-contract registry — all 19
 * [`toolplan::ToolKind`]s with their complete [`toolplan::ToolContract`] (input/output contract, authority,
 * authorization, visibility, supported entities, freshness, timeout, error reason codes, retry + fallback
 * policy, executable). Inspectable/guardable; every fallback chain terminates at HONEST_FALLBACK.
 * @returns {string}
 */
function tool_contracts_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.tool_contracts_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
exports.tool_contracts_json = tool_contracts_json;

/**
 * M2.18B.7 DFN-7 — the single "schema validator" authority, callable at runtime and by the guard: validate
 * a JSON instance against a JSON schema. Returns a SchemaVerdict {ok, errors}. Deterministic, no model.
 * @param {string} instance_json
 * @param {string} schema_json
 * @returns {string}
 */
function validate_against_schema_json(instance_json, schema_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(instance_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(schema_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.validate_against_schema_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.validate_against_schema_json = validate_against_schema_json;

/**
 * Node WASM (M2.18B.3 PART 12): the last deterministic gate. Validates a grounded-output JSON against
 * the FactualPackage JSON it was built from — unsupported claims, illegal/out-of-set citations,
 * wrong-doc identity in prose, internal-source leak, insufficient-evidence coherence. Returns the full
 * FactualVerdict; `ok:false` means the answer must NOT be published (fall back to the safe path).
 * @param {string} package_json
 * @param {string} output_json
 * @returns {string}
 */
function validate_output_json(package_json, output_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(output_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.validate_output_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.validate_output_json = validate_output_json;

/**
 * Node WASM (ADR-036): validate a language-model completion. Returns
 * `{"ok":bool,"reason":"..."}`. `ok=false` → the pipeline must serve the deterministic
 * grounded fallback instead of the model text.
 * @param {string} text
 * @returns {string}
 */
function validate_response_json(text) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.validate_response_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
exports.validate_response_json = validate_response_json;

/**
 * Node WASM (M2.18B.6 §9-10): validate a RetrievalPlan JSON string against its invariants (every source
 * has a reason; no duplicate/orphan source; a comparison carries ≥2 primaries). Returns
 * `{"ok":bool,"errors":[...]}`.
 * @param {string} question
 * @param {string} seeded_entity_id
 * @returns {string}
 */
function validate_retrieval_plan_json(question, seeded_entity_id) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(question, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(seeded_entity_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.validate_retrieval_plan_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.validate_retrieval_plan_json = validate_retrieval_plan_json;

/**
 * Node WASM (Increment 4 §8/§9): the claim taxonomy + claim/citation VERIFIER that runs on the composed
 * answer BEFORE it is returned — documentary trunk AND operational path, uniformly. Classifies every claim
 * (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED) and enforces: an UNSUPPORTED claim, an
 * unlabelled ESTIMATED/HYPOTHETICAL claim, an underived DERIVED calculation, unsupported causality, a single
 * observation dressed as an average (BZO-9), or a dead/invented citation ⇒ `ok:false` (the pipeline serves
 * the deterministic/contextual fallback and never publishes). `output_json` is a {answer_markdown, claims:
 * [{claim,fact_ids?,category?}], cited_source_ids} object (a GroundedOutput is accepted directly). Returns
 * the full ClaimVerdict; `ok:false` means DO NOT publish.
 * @param {string} package_json
 * @param {string} output_json
 * @returns {string}
 */
function verify_claims_json(package_json, output_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(package_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(output_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.verify_claims_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
exports.verify_claims_json = verify_claims_json;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./banzai_api_kb_bg.js": import0,
    };
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

const wasmPath = `${__dirname}/banzai_api_kb_bg.wasm`;
const wasmBytes = require('fs').readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
wasm.__wbindgen_start();
