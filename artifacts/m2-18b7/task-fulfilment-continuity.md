# M2.18B.7 — Semantic Task Fulfilment — continuity

**Status: COMPLETE + LIVE (generalized).** The generalization round (PR #203 → main `ff40041`, deployed,
live-QA PASS) removed every earlier gap: `tasked.rs` is now a **registry/catalogue engine** over 9 subjects
(operator/federation/manifest/revocation/trust/evidence/conformance/participation/key-rotation) with
task-aware specificity-ranked selection; **Source Appropriateness is ACTIVE** in retrieval reranking (task
suitability outranks lexical similarity; appropriateness-first ordering; verdict fed to the completion
validator for real, no longer hardcoded); **context is controlled** (typed `context_used_for`; the current
turn's explicit task always wins). Assurance: truth-table test + 58-row golden dataset + two new behavioral
guards (`banzai-source-appropriateness-check`, `banzai-golden-answer-quality-check`) + retained
task-fulfilment guard; CI green (143 checks). The previously-deferred "deep reranking" is now live — no
mandatory item remains a follow-up. See `docs/reports/M2_18B7_TASK_FULFILMENT_GENERALIZATION.md`.

The first Semantic Task Fulfilment increment (PR #201 → `bb92034`) remains accepted and is superseded by the
generalization above. The historical delivery record below is kept for reference.

## Root cause (diagnosed, proven on baseline `/tmp/diag-baseline.json` capture)
BanzAI grounds + cites but does not FULFIL the concrete task. The router (`route.rs::route`, Route at
`route.rs:27`) and the trunk resolver (`resolve.rs::resolve_intent`, ResolvedIntent at `resolve.rs:131`)
emit a SINGLE fused intent (subject+task conflated); there is no RequestedTask/Deliverable axis. The
AnswerPlan (`answerplan.rs`) already models task components (example_requested/procedure_requested/
comparison_requested/section_order) **but** the grounded-synthesis prompt `synth.rs::build_output_prompt`
(`synth.rs:51`) receives only `(question, pkg, depth)` — it NEVER receives the plan/obligations, so the
shape is discarded and the model writes a generic grounded blurb (validate.rs:22 documents this: "on paths
with no output-shape instruction, a small instruct model sometimes continues it"). No completion validator.
Retrieval ranks by topic/similarity, not task-suitability (trust-model ADRs returned for a "how to
federate" procedure).

## Landed (green, tested — 162 lib tests, 14 new)
- `engines/banzai-query-core/src/obligations.rs` — `RequestedTask` (21-task closed taxonomy),
  `AnswerObligationSet`, `resolve_task(question,&AnswerPlan)`, `obligations_for/obligations_from_plan`.
  The 6 cases classify: operador→Example, federar→Procedure, federação→Example, "ADR 005"→DocumentLookup,
  "me explica o ADR 005"→Explanation, "manifest valido"→Template.
- `engines/banzai-query-core/src/taskcheck.rs` — deterministic `TaskCompletionValidator`
  `check_completion(obligations, answer, cited, facts, source_appropriate)`; 7 states; catches
  example-as-definition / procedure-as-ADR-list / manifest-as-architecture / generic-insufficient;
  accepts scenario/steps/structure/transparent-limitation.
- lib.rs registers both modules. execution-state → RUNNING with the reopen record.

## Key surface (from codemap wf_55c88f5b-a12; full map in tasks/w1jj9imqw.output)
- Route `route.rs:27` {action,entry_id,intent,reason}; ResolvedIntent `resolve.rs:131` (example_requested
  149 / comparison 150 / impact 151 / reason 152 booleans + primary_intent).
- AnswerPlan `answerplan.rs:44` (rich flags + section_order); AnswerType `answerplan.rs:18`.
- synth `build_output_prompt` `synth.rs:51`; GroundedOutput `synth.rs:32` (answer_markdown/claims/
  cited_source_ids/insufficient_evidence); output_schema `synth.rs:114`.
- factual validator `validate.rs::validate_response` (authority/keys/CoT only — not completion).
- retrieval SourceRole (8) + rerank + RetrievalPlan + FactualPackage builder — see codemap `retrMap`.
- pipeline tiers + WASM call sites + the "com contexto" flag — see codemap `pipeMap`; WASM wrappers in
  `engines/banzai-api-kb/src/lib.rs`.
- **Manifest schemas EXIST** (so Template can serve a REAL structure, not just transparent-unavailability):
  `contracts/production/operator-manifest.production.schema.json`, `contracts/federation/{federation-manifest,key-manifest}.json`,
  `conformance/fixtures/federation/MANIFEST-VALID.json` (+ KEY-MANIFEST-VALID.json).

## Remaining to COMPLETE (precise next steps)
1. synth.rs: `build_output_prompt` takes the AnswerObligationSet → prompt states the mandatory output shape
   per task (Example→scenario/actors/steps/marked illustrative; Procedure→ordered steps or explicit
   no-complete-procedure; Template→real fields from schema; Lookup→metadata; Comparison→both sides).
   Extend GroundedOutput with optional produced_sections/task_type/example_type/procedural_completeness.
2. WASM exports (api-kb lib.rs): `answer_obligations_json(question, seed)`, `task_completion_json(...)`;
   fresh `wasm-pack build --target nodejs --out-dir services/banzai-api/src/rustkb --release`.
3. pipeline.js: compute obligations, inject into the synthesis prompt, run TaskCompletionValidator AFTER
   synthesis + BEFORE publish; on INCOMPLETE/SOURCE_INADEQUATE/TASK_MISMATCH do NOT publish as success —
   serve a Rust terminal / transparent limitation (no extra Qwen call).
3b. retrieval.rs: add task-suitability to the rerank so it outranks lexical similarity (procedure→procedure
   sources; template→schema sources). Source-appropriateness feeds taskcheck's `source_appropriate`.
4. Manifest/example/operator policies (TF-5): deterministic manifest example from the schema/fixture;
   operator example marked illustrative (never invent a real operator); federation example = scenario.
5. Context fix: context never changes an explicit subject/task; add `context_used_for` to the trace.
6. Truth tables (subject×task×deliverable×output×evidence×source-role×suitability×context) + golden dataset
   + property/metamorphic tests (example≠definition, procedure≠explanation, template needs structure,
   lookup≠explanation, context-invariance, mixed preserved, validator rejects incomplete).
7. Guards: banzai-task-fulfilment-contract-check, banzai-source-appropriateness-check,
   banzai-answer-obligation-quality-check, banzai-definitive-truth-table-check; extend
   production-e2e-readiness to FAIL on any of the 6 regressions. ADR-056 + docs + website/SVG (single Qwen).
8. PR → CI green → merge → deploy banzai-api + website → reindex/cache-invalidate → stratified live QA
   (6 cases + variants) → performance → cleanup → audit → restore COMPLETE.

## Invariants preserved
Single Qwen box; no extra repair call; Rust understands/grounds/validates; the completion validator gates
before publish; zero external providers.
