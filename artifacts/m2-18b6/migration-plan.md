# M2.18B.6 — Rust-First Single-Pass — audit + migration plan (from the design workflow)

Source: 7-agent audit+synthesis workflow (wf_ad476450-922, 952s, 0 errors). This file is the durable,
committed distillation used to drive the removal/rewire phases. Foundation already shipped on this branch
(`resolve.rs` + `resolve_intent_json`, additive, dormant).

## First increment (safe cutover path)
Ship a WORKING single-pass trunk behind an **additive flag `BANZAI_SINGLE_PASS` (default OFF)**, provable
offline in-container, deleting nothing. When on and a `resolvedIntent` is supplied, `runTwoPass` SKIPS
`runEntryPass` entirely and feeds `resolvedIntent.primary_intent` + seeded entity straight into the
UNCHANGED `buildFactualPackage → runOutputPass → validateOutput`. pipeline.js computes `resolveIntent`
(Rust) and passes it in. Prove parity → flip default → remove.

## Parity proof (before any removal)
Offline shadow harness (services/banzai-api/eval/, node:22-alpine beside the isolated llama-bench
container, per M2.18B.3 pattern). BRANCH A = current model entry pass (runEntryPass→validate_intent_entry→
refine_intent) vs local Qwen2.5-7B. BRANCH B = Rust `intent::resolve_intent` (no model). Over
eval/m2-18b-intent-interpretation.dataset.json + the PART34 human-labelled gold. Record
(primary_intent, resolved_entity_id, requires_clarification, boundary_detected). Gate: intent accuracy
B≥A; entity match B≥A (near-trivial — pipeline already seeds entity deterministically; divergence confined
to the unseeded tie-break slice); zero new safety/source-policy regressions. Fix defects before cutover.

## ResolvedIntent — target fields (extend the current struct)
Have now: schema_version, original/normalized/corrected_query, corrections, language, primary_intent,
secondary_intents, answer_type, resolved_entity_id, entity_selection_reason, explicit_refs, concept_source,
depth, example/comparison/impact/reason flags, requires_clarification, clarification_candidates,
confidence_band, resolution_method, boundary_detected, expected_model_calls.
ADD (§8 / synthesis): operation (explain/summarize/locate/compare/status/impact/inspect/validate…),
entity_type (docref kind or ""), entity_source (docref_explicit|concept_canonical|candidate_selected|none),
unsupported (empty candidates AND no concept AND no docref → decline before the model), scope
(protocol/governance/operator/development/unknown), compare_doc_ids (detect_refs ∪ resolved_entity_id when
compare), follow_up + conversation_reference (carried from route_with_context, never model-derived), reason
(which rule fired). confidence_band → high (explicit docref) | medium (curated alias) | low (keyword).

## Rust functions to add/repurpose
- `intent::classify_primary_intent(question, answer_class, resolved_entity_id, compare_doc_ids) -> String`
  — NEW. Originate a PRIMARY_INTENT from route::answer_class.class + seeded-entity presence. (Current
  `resolve::classify_trunk_intent` is the first-cut; fold in answer_class + operational map.)
- `intent::map_operational_to_primary(operational_intent) -> &str` — NEW. Unify route.rs operational
  labels → PRIMARY_INTENTS (mapping table below).
- `intent::refine_intent(deterministic_intent, question)` — REPURPOSE: first arg becomes the Rust intent
  (not a model value); keep the compare/locate/governance/status overrides + false-boundary rescue.
- `intent::resolve_intent(question, ctx{seeded_entity_id, answer_class, operational_intent, follow_up_ref,
  depth_override}) -> ResolvedIntent` — the one consolidated producer.
- `intent::depth_for_intent` (have it in resolve.rs) — Rust-owned depth.
- `lib.rs resolve_intent_json(question, ctx_json)` — evolve to take a ctx object (currently
  (question, seeded_entity_id)).
- KEEP model-free: `catalogue::select_entity("", …)`, `factpack::build_factual_package[_multi]`.
- REMOVE after cutover: intent_entry_schema, validate_intent_entry, intent_envelope_json_schema,
  validate_intent_envelope, IntentEntry, build_interpretation_prompt + JS wrappers.

## Operational-intent → PRIMARY_INTENT map (from synthesis)
comparison+≥2 doc refs→compare_documents; comparison+<2→explain_concept; impact→explain_impact;
explanation+doc entity→explain_document; explanation+concept→explain_concept; exact_fact→(terminal, not
trunk); safety_refusal→boundary_request (upstream). operator_onboarding→explain_concept;
operator_manifest→inspect_manifest; evidence_bundle/conformance_evidence→validate_artifact;
federation_how_to→explain_governance/explain_concept; trust_evaluation→explain_concept;
state_check→check_document_status; governance_reference→explain_governance; revocation→explain_concept;
tool_routing→explain_concept; banzai-role→explain_concept; default(entity)→explain_document /
default(no entity)→explain_concept.

## Removal order (§23 — only after parity)
1. ADDITIVE Rust (resolve_intent + classify + map + repurposed refine) — DONE (first cut).
2. ADDITIVE JS: knowledge.js `resolveIntent` wrapper; runTwoPass single-pass path gated by BANZAI_SINGLE_PASS.
3. REWRITE the CI blocker FIRST: tools/check-banzai-unified-two-pass-architecture.sh → single-output-pass
   guard (it currently MANDATES the input pass + asserts the `BANZAI_UNIFIED_TWO_PASS ?? "0"` string).
4. CUTOVER: make single-pass unconditional; delete runEntryPass + imports (buildInterpretationPrompt,
   intentEntrySchema, validateIntentEntry, generateCandidates), the ONE repair, entryMaxTokens, entry trace
   fields (entry_status/entry_latency_ms/entry_repair_attempted/candidates_generated/model_intent).
5. Re-derive breaker + faithful labels on OUTPUT-only signals: twoPassGate.classifyTwoPass (drop
   entry_status branches; output_status failed/invalid/rejected→failure); labels over output_status +
   isTimeoutError (M2.18B.6-R1) alone.
6. Remove dead standalone interpreter: interpret.js interpretQuestion, interpreterGate.js, IntentEnvelope path.
7. Remove Rust input contracts + WASM exports + JS wrappers (intent_entry_schema/validate_intent_entry/
   IntentEntry/intent_envelope*).
8. Tests: DELETE m2-18b-semantic-intent, m2-18b1-activation-gate, m2-18b2-candidates, m2-18b3-r1-remediation;
   REWRITE m2-18b3-twopass, m2-18b3-two-pass-gate, m2-18b4-two-pass-publish to single-pass.
9. Docs/SVG/UI: docs/governance/BANZAI_INTENT_FIRST_GROUNDED_REASONING.md (§1/2.1/4/8.3/8.4 → single-pass);
   the two-Qwen-box SVG(s) → one Qwen box after the FactualPackage; trace "interpretação Qwen" removed;
   website BanzAI chapter; ADR-055.
10. Deploy: reconcile compose.yml env allowlist — DROP BANZAI_INTENT_INTERPRETER + BANZAI_UNIFIED_TWO_PASS/
    _CANARY (tolerate/ignore retired vars, don't fail boot); KEEP _MODEL/_TIMEOUT_MS/_AUTO_ROLLBACK
    (output pass still a model call). Prod .env currently sets BANZAI_UNIFIED_TWO_PASS=1 — reconcile both.

## Top risks → mitigations
- New classifier under-covers the 11 intents refine_intent never handled → shadow parity gate (B≥A) before removal.
- Losing model requires_clarification → select_entity ties + fuzzy Ambiguous already clarify deterministically.
- Safety regression → deterministic boundary preflight runs upstream unchanged; refuses before the trunk.
- CI guard blocks removal → rewrite it FIRST (step 3).
- Faithful labels → re-express over output_status + isTimeoutError only.
- Prod boot breaks on retired env vars → keep allowlist tolerant; reconcile runtime + repo .env together.
- Follow-up/anaphora regression → route_with_context merges conversation context upstream (not model-derived).

## Also-GAP net-new subsystems (spec §12-15, build in parallel or after cutover)
- Typed relation graph (11 edge types); extractor parsing ADR/RFC front-matter ("Supersedes:", "Superseded
  by:", "See also:", "Related ADRs", prose "depends on"); nodes = docref registry. Needed for
  compare/impact/relationship grounding beyond build_factual_package_multi.
- Retrieval planner + 8 source roles (primary/supporting/definition/relationship/governance/legal/metadata/
  implementation); role-aware FactualPackage; reuse score_repo_chunk (multi-signal) — overlap() is single-signal.
