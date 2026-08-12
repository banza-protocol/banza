# ADR-056 — Definitive Query Core, Canonical Knowledge Coverage and Production Assurance for BanzAI

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.18B.7
- **Supersedes:** none (extends ADR-055 Rust-First Grounded Synthesis)
- **Related:** ADR-055 (Rust-first grounded synthesis), ADR-041 (BanzAI native protocol agent),
  ADR-054 (primary human-operator interface), ADR-049 (operational protocol agent),
  ADR-044 (Rust control engine), ADR-037 (Rust-first engines), ADR-002 (ecosystem naming),
  ADR-043 (licence & open governance), ADR-001 (open protocol)

---

## Context

Under ADR-055 BanzAI resolves, plans, grounds and validates in Rust and calls the local model exactly
once for an explanation. Live QA nonetheless surfaced a class of **coverage** failures that the
single-pass architecture did not, by itself, prevent:

- `o que é o BANZA?` / `fala-me sobre o BANZA` degraded to a generic "insufficient evidence" topic list,
  even though BANZA is a known entity with abundant canonical sources.
- `ano de criação do BANZA` returned the same generic list instead of an honest, precise answer.
- Some benign facts (`protocol-license`, `protocol-origin`) were labelled `critical_boundary` and rendered
  as a false safety refusal.

Root cause (proven by engine probes, not inferred): the router correctly sent the definition/explanation
to the grounded trunk, but the FactualPackage came back **empty** — the entity was named by a synthetic
route entry id (`what-is-banza`), not a document, and query-term retrieval found nothing because the sole
content term (the ubiquitous entity name) never cleared the retrieval threshold. An **existing canonical
source silently degraded into a generic answer** — the failure this ADR forbids.

These are not questions to patch one by one; they are symptoms of a missing structural layer that
guarantees coverage of every supported entity and attribute.

## Decision

Add a **definitive canonical-knowledge coverage layer** on top of the ADR-055 pipeline, entirely in Rust,
with the model still called at most once and only for explanations:

1. **Entity → primary-source coverage** (`coverage.rs`): each canonical entity (BANZA, BanzAI, Banzami)
   is bound to its declared primary source documents. When retrieval yields nothing for a known entity,
   the FactualPackage builder draws that entity's declared primary sources — a known entity can never
   yield an empty package. The pipeline seeds the trunk with the router's canonical-entity id (coverage-
   gated), so a bare definition/explanation grounds on the entity's own sources.
2. **Attribute registry** (`attribute.rs`): a DECLARED exact fact (the protocol creation date `01/08/2025`,
   read from NOTICE) is confirmed with its source (reason `EXACT_FACT_CONFIRMED`), consistent with the
   `protocol-origin` provenance entry. An attribute the canonical public documentation does not declare
   (e.g. a single protocol *version* — the protocol is defined by its ADRs/RFCs/specs) returns a
   **precise, contextual `NOT_DECLARED` message** naming the entity and attribute. Neither is ever inferred
   (never from Git/commit/file/deploy/domain/index/upload dates) and neither is ever the generic topic list.
3. **Reason codes** (`reason.rs`): a closed enum names *why* an answer took its class
   (`EXACT_FACT_CONFIRMED`, `CANONICAL_DEFINITION_RESOLVED`, `EXPLANATION_GROUNDED`, `ATTRIBUTE_NOT_DECLARED`,
   `ENTITY_NOT_FOUND`, `SOURCE_EXISTS_BUT_NOT_RESOLVED`, `FACTUAL_PACKAGE_EMPTY`, `BOUNDARY_BLOCKED`, runtime
   codes, …). A single generic reason never stands in for different causes; the reason is surfaced in the
   public reasoning trace.
4. **Internal coverage failure ≠ lack of evidence**: `SOURCE_EXISTS_BUT_NOT_RESOLVED` /
   `FACTUAL_PACKAGE_EMPTY` for a known entity are INTERNAL failures (a bug, a red test, an operational
   alert) — never a silent public generic answer.
5. **Honest labels**: benign canonical facts (`def-*`, `protocol-license`, `protocol-origin`) are
   `grounded`, not security boundaries.

The Query Core stays the single Rust authority for understanding, routing and grounding; JavaScript only
transports payloads. No model at input, for source/entity/ambiguity selection, or as a narrative fallback;
zero external providers.

## Canonical principle (unchanged)

> O Rust compreende qualquer pergunta dentro do escopo suportado, confirma o que está documentado,
> identifica claramente o que não está declarado e nunca confunde uma falha interna de cobertura com
> falta legítima de evidência.

## Single Query Core authority (implemented)

The query logic is one Rust authority: the crate **`engines/banzai-query-core`** (pure rlib — serde +
unicode-normalization; **no** `wasm-bindgen`). It owns the whole deterministic pipeline —
normalization, typo recovery, the intent taxonomy, the entity/attribute/alias registries, resolution,
the relation graph, retrieval + answer planning, the factual package, the factual validator, reason
codes, coverage decisions, the shared scenario library — and the embedded canonical corpus
(`entries-index.json`, `doc-index.json`, `repoindex/*`). `engines/banzai-api-kb` now contains **only**
the WASM adaptation surface (`#[wasm_bindgen]` JSON wrappers) and `pub use banzai_query_core::*`; every
business decision is delegated, with no duplicated authority and no mirror modules. The dependency
direction is permanent and acyclic: `banzai-query-core → banzai-api-kb → WASM → banzai-api service`.

## Enforcement

`make banzai-canonical-knowledge-coverage-check` proves the coverage layer is present and wired (every
core entity bound to declared primary sources with a builder fallback; the attribute registry answers a
declared exact fact — creation date, from NOTICE — with its source and an undeclared attribute —
protocol version — as `NOT_DECLARED`, never inferred; reason codes flag internal coverage failures; the
WASM/JS/pipeline serve the attribute terminal, never the generic list). Three additional guards (CI-wired)
enforce the definitive architecture and behavior:

- `make banzai-query-core-contract-check` — the single-authority contract: core is wasm-free, api-kb
  depends on it with no cycle and is the shim (no mirror modules), the crate owns the modules + scenarios
  + corpus, and the compiled WASM executes the core.
- `make banzai-query-scenario-assurance-check` — **behavioral**: drives the compiled WASM over the single
  scenario source (`scenarios_json`) through route + boundary and asserts the boundary + routing truth
  table (boundary iff class = boundary; boundary/insufficient never call the model; grounded classes route
  grounded and never trip the boundary).
- `make banzai-production-e2e-readiness-check` — **behavioral** pre-deploy gate over the production-critical
  invariants (financial action refused/0-model, creation DECLARED 2025, version NOT_DECLARED, known
  entities answerable, off-topic insufficient, scenario source well-formed).

The crate's own test suite (`engines/banzai-query-core`, CI job) adds the coverage truth table + property
/ metamorphic / fuzz-smoke / failure-mode reason-code tests (`tests/assurance.rs`). The ADR-055 guards
(single-synthesis contract, intent-engine quality, grounded-synthesis architecture, old-architecture
clean) remain in force.

## Consequences

- Known entities and their exact attributes are always answerable — grounded on a canonical source, or
  explicitly `NOT_DECLARED` — and an existing source can never silently become a generic answer.
- BANZA, BanzAI and Banzami stay unambiguously separated; exact facts use zero model calls; explanations
  invoke the model exactly once; every published claim remains subject to the Rust factual validator.
- There is now exactly one Rust authority for understanding a question; the API only adapts. The scenario
  library, coverage truth table and property/metamorphic/fuzz/failure-injection suites are DELIVERED (in
  `banzai-query-core`), not deferred, and are enforced by the behavioral guards above.

---

## Addendum — M2.18B.7 Semantic Task Fulfilment (2026-07-27)

**Confirmed structural defect:** the Query Core found sources and produced grounded answers but frequently
did not FULFIL the concrete task — an *example* request answered with a definition, a *how-to* answered with
a list of ADR ids, a *manifest* request answered with generic architecture, and `document lookup` treated
identically to `explanation`. Grounding is necessary but not sufficient; the answer must also match the task.

**Decision (additive; the single Qwen call and every prior layer are preserved):**

1. **Task ontology** (`engines/banzai-query-core/src/obligations.rs`) — a closed `RequestedTask` taxonomy
   (21 tasks) that separates the SUBJECT (operator/manifest/ADR-005…) from the TASK (define, explain,
   give-an-example, give-a-procedure, show-a-template, look up a document, summarize, compare, impact…),
   derived deterministically from the existing `AnswerPlan`.
2. **AnswerObligations** (`obligations.rs`) — the typed contract of what a fulfilling answer MUST deliver
   per task: mandatory sections, forbidden substitutions, required evidence, preferred source roles,
   illustrative-example policy, completion rule, output shape.
3. **TaskCompletionValidator** (`taskcheck.rs`) — a SECOND deterministic validator (beyond the factual
   validator): after the single synthesis and before publishing, it proves the answer has the task's shape
   (an example has a scenario, a procedure has steps or a transparent "no complete procedure is published",
   a template shows real fields). A grounded-but-unfulfilling answer is NOT published as success; no extra
   model call — the pipeline serves a deterministic terminal or degrades honestly.
4. **Tasked terminals** (`tasked.rs`) — deterministic, 0-model answers for the structural/example/procedure
   cases: the REAL operator-manifest structure (fields from `operator-manifest.production.schema.json`, never
   invented), a clearly-marked ILLUSTRATIVE operator/federation example (never a real operator; operator-
   neutral), and a TRANSPARENT-PARTIAL federation procedure (requirements + trust model are documented, a
   complete step-by-step is not).
5. **Obligations-aware prompt** (`synth.rs::build_output_prompt_obliged`) — the synthesis prompt now carries
   the per-task output-shape directive so the model fulfils the task instead of grounding generically.

**Pipeline wiring:** a new Tier 1c serves the tasked terminal (after safety + the attribute terminal,
before the trunk); the trunk uses the obliged prompt and runs the TaskCompletionValidator before publish.
**Enforcement:** `banzai-task-fulfilment-contract-check` (behavioral, drives the compiled WASM over the six
zero-tolerance regressions). **Invariant preserved:** one Qwen call per explanation; zero external providers;
Rust understands, grounds, and now also proves task fulfilment before publishing.

---

## Addendum — M2.18B.7 Task-Fulfilment & Source-Appropriateness Generalization (TFG)

The Semantic Task Fulfilment above corrected the six visible regressions but was still too oriented to
those cases: the tasked terminals were hard-coded to a few subjects, and source appropriateness was
deferred. This addendum makes the fulfilment contract GENERAL — the same guarantees hold for every
supported subject and task, not only the demonstrated ones.

1. **Registry/catalogue-driven engine** (`tasked.rs`) — the tasked layer is no longer subject-specific
   builders. It is a deterministic engine over a typed `KnowledgeCatalogue`: a `SubjectProfile` per subject
   (operator, federation, manifest, revocation, trust, evidence, conformance, participation, key-rotation),
   each carrying the DATA a fulfilling answer needs (an example scenario, a procedure with documented gaps,
   a template from a real schema), grounded in canonical sources. Generic renderers build the shape from the
   profile. Selection is **task-aware and specificity-ranked**: among profiles whose alias matches AND that
   hold data for the requested task, the most specific (longest) alias wins — so "como federar um operador"
   (a procedure) routes to `federacao`, not `operador`, and "key manifest" routes to `chave`, not the
   generic `manifest`.

2. **Source Appropriateness is ACTIVE in retrieval** (`retrieval.rs`) — every planned source carries a
   typed `task_appropriateness` class (`exact_task_source`/`suitable_primary`/`suitable_supporting`/
   `thematic_weak`/`rejected`) derived from `RequestedTask × source-kind`. Appropriateness is the PRIMARY
   rerank key: a task-suitable source outranks a merely thematically-similar one **even across role tiers**
   (a schema wins for a Template task though an ADR carries a higher generic role; a definitional ADR loses
   to a fixture for an Example). The plan exposes a `source_appropriate` verdict + class, which the
   `TaskCompletionValidator` now consumes for real (no longer hardcoded `true`): when retrieval finds no
   task-suitable source, the trunk degrades to a transparent limitation instead of passing a thematically-
   adjacent document off as the requested deliverable. The previously-deferred "deep reranking" is now a
   first-class, live retrieval signal — not a follow-up.

3. **Context control + typed trace** (`obligations.rs`, pipeline) — `classify_context_use` records HOW
   conversation context resolved a turn (`none`/`entity_reference`/`document_reference`/`comparison_target`/
   `follow_up_task`/`output_refinement`), and `task_from_current_turn` pins the TASK to the current turn:
   context may supply the subject (via the resolved query + seeded entity) but a prior turn's verb can never
   change the current turn's explicit task. The completion gate only applies the appropriateness verdict when
   the plan and the obligations agree on the task, so a context shift never wrongly rejects a valid answer.

4. **Definitive truth table + golden dataset + guards** — `engines/banzai-query-core/tests/
   task_fulfilment_truth_table.rs` drives the real engine over a `(subject × task × deliverable × source-role
   × context)` matrix with explicit NOT_APPLICABLE reasons; `artifacts/m2-18b7/task-fulfilment-golden.json`
   is a human-reviewed golden set spanning every catalogue subject×task plus narrative, negative and boundary
   rows. Two new behavioral guards — `banzai-source-appropriateness-check` and
   `banzai-golden-answer-quality-check` — drive the compiled WASM and are CI-wired alongside the existing
   task-fulfilment guard.

**Invariant preserved:** one Qwen call per explanation; zero external providers; Rust understands, ranks by
task suitability, grounds, and proves task fulfilment before publishing.

## M2.18B.7 Closure (DFN-5 … DFN-11) — definitive generalization

The definitive-generalization pass hardened the four layers above from "handles the visible cases" to
"generalizes and is proven on the public edge", under a strict scope freeze (no new phase / subject /
taxonomy / parallel validator):

1. **Canonical vocabulary as a semantic ontology** (`tools/gen-banzai-vocabulary.mjs`,
   `canonical-protocol-vocabulary.json`) — a two-phase pipeline: Phase 1 rejects lexical noise with typed
   reason codes; Phase 2 carries only real protocol terminology, fully typed (SUBJECT vs ALIAS, DOCUMENT_TYPE
   vs DOCUMENT_INSTANCE, ARTIFACT_TYPE, closed 11 RELATION_KINDs vs aliases). OUT_OF_SCOPE is curated (never a
   fallback); every term resolves by real resolution (`unresolved=0`); 21 subjects are bidirectionally
   reconciled with the truth table and the derived Subject Registry; all 191 engine aliases are mapped.

2. **DFN-5 content+task source appropriateness** (`retrieval.rs`) — `SourceAppropriatenessDecision` with typed
   reason codes: the structural task×kind fit is DEMOTED when the source content lacks the task signal, a
   self-declared historical source is capped, and authority + subject overlap are recorded — exposed per
   source and plan-level.

3. **DFN-6 semantic substance** (`taskcheck.rs`) — a hard-deliverable answer must be FILLED IN, not just
   shaped: `content_list_entries` counts only filled steps, `content_field_tokens` only real fields; a lone
   `1.`, an empty `{}`, or a bare `exemplo:` is `INCOMPLETE`.

4. **DFN-7 schema-validated templates** (`schemacheck.rs`) — a dependency-free JSON-Schema validator (type /
   required / properties / additionalProperties / enum / format / `$ref` / `const`) is the single schema
   authority (WASM `validate_against_schema_json`). Every published template is a deterministic instance
   validated against its REAL canonical schema (`template-schema-registry.json`, checksums recorded); invented
   fields and wrong types fail; the key-manifest template is a permanent regression. This caught and fixed
   real schema-invalid templates that had falsely claimed schema fidelity.

5. **DFN-3/DFN-4 stratified golden dataset + novel combinations** (`gen-banzai-golden-dataset.mjs`, 400 cases)
   — safety strata hand-specified (the engine must honour them); coverage strata engine-derived and
   rubric-checked; 40 novel far-from-profile combinations generalize through the same architecture with no
   dedicated code path.

6. **DFN-8 context E2E** (`test/context-e2e.test.js`) — three multi-turn sequences prove the current turn's
   task always governs, context is marked used only when materially attached, an explicit subject overrides
   prior context, and prior turns never contaminate a later turn.

7. **DFN-9/10 public-edge assurance** (`tools/banzai-public-edge-qa.mjs`) — a stratified public-edge run
   through `https://banza.network/banzai/ask` with a legitimate browser-headed request (no WAF bypass, no
   test route, no weakened rate limiting), recording per case HTTP status, latency, grounding, source
   appropriateness, `external_model_called`, and cache. Gates: zero 5xx, zero external providers, zero
   boundary regressions, zero invalid templates, zero `undefined` leak.

8. **DFN-11 consolidated readiness** — `banzai-production-e2e-readiness-check` aggregates the critical WASM
   invariants + the closure acceptance gates (vocabulary clean, templates schema-valid, golden ≥300, context
   E2E present, public-edge evidence clean) into one definitive pre-deploy gate.

**Closure invariant:** the same architecture answers NOVEL, unforeseen (subject × task × deliverable × context)
combinations correctly — proven on the public edge — with one Qwen call per explanation, zero external
providers, and every deliverable validated (grounding + task completion + schema) before publishing.
