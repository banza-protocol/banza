# M2.18B.7 — Task-Fulfilment & Source-Appropriateness Generalization (TFG)

**Status: delivered, pending CI/deploy/live-QA (execution-state RUNNING until prod parity is confirmed).**

## Why this round

The Semantic Task Fulfilment increment (PRs #201/#202, live) fixed the six visible regressions but the fix
was too oriented to those cases: the tasked terminals were hard-coded to a few subjects, and source
appropriateness was deferred. This round makes the fulfilment contract **general** and closes both gaps —
no mandatory requirement is left as a follow-up.

## What changed (all additive; single-Qwen invariant preserved; zero external providers)

### 1. `tasked.rs` is now a registry/catalogue engine (not case-specific builders)
- A typed `KnowledgeCatalogue` of `SubjectProfile`s covering **9 subjects**: operator, federation, manifest,
  revocation, trust, evidence, conformance, participation, key-rotation. Each profile carries the DATA a
  fulfilling answer needs (example scenario / procedure with documented gaps / template from a real schema),
  grounded in canonical sources (`decisions/adr/*`, `contracts/production/*.schema.json`).
- Generic renderers (`render_example`/`render_procedure`/`render_requirements`/`render_template`) build the
  shape from the profile.
- **Task-aware, specificity-ranked selection**: among profiles whose alias matches AND that hold data for the
  requested task, the most specific (longest) alias wins → "como federar um operador" (procedure) → `federacao`
  (not `operador`); "key manifest" → `chave` (not the generic `manifest`).

### 2. Source Appropriateness is ACTIVE in retrieval (`retrieval.rs`) — the deferred item is now live
- Every planned source carries a typed `task_appropriateness` class + score derived from
  `RequestedTask × source-kind` (schema / fixture / ADR-RFC / doc / legal).
- **Appropriateness is the primary rerank key** — a task-suitable source outranks a merely thematic one even
  across role tiers (a schema wins for a Template task though an ADR has a higher generic role; a definitional
  ADR loses to a fixture for an Example).
- The plan exposes `source_appropriate` + `source_appropriateness` (exact/suitable/thematic_only/none). The
  `TaskCompletionValidator` consumes the REAL verdict (no longer hardcoded `true`) in
  `grounded-synthesis.js` — when retrieval finds no task-suitable source, the trunk degrades to a transparent
  limitation instead of passing a thematically-adjacent document off as the deliverable.

### 3. Context control + typed trace (`obligations.rs`, pipeline)
- `classify_context_use` → typed `context_used_for` (none / entity_reference / document_reference /
  comparison_target / follow_up_task / output_refinement), surfaced on the trace.
- `task_from_current_turn` pins the TASK to the current turn: context may supply the subject (resolved query +
  seeded entity) but a prior turn's verb can never change the current turn's explicit task. The trunk computes
  obligations on the current turn; the appropriateness gate only applies when plan-task == obligations-task.

### 4. resolve_task correctness generalizations
- A how-to verb ("como publicar/demonstrar/rodar…") wins over a template noun → "como publicar um manifest" is
  a Procedure, not a Template.
- A concept question ("o que é a federação") whose entity the router resolved to a canonical doc is a
  Definition, not a bare document lookup.
- Broadened summary markers ("faz um resumo", "resumo da/do").

## Assurance

- **Truth table** (`engines/banzai-query-core/tests/task_fulfilment_truth_table.rs`): drives the real engine
  over `(subject × task × deliverable × source-role × context)` with explicit NOT_APPLICABLE reasons
  (narrative_trunk / no_catalogue_data). 5 tests, 20 rows.
- **Golden dataset** (`artifacts/m2-18b7/task-fulfilment-golden.json`): 58 human-reviewed rows spanning every
  catalogue subject×task cell + paraphrase variants + narrative + negative (unknown subject) + boundary rows.
- **Guards (behavioral, CI-wired)**: `banzai-source-appropriateness-check`, `banzai-golden-answer-quality-check`
  (both drive the compiled WASM), plus the retained `banzai-task-fulfilment-contract-check`.
- **Tests green**: query-core 173 lib + truth-table + fuzz + assurance; banzai-api 283 node; identity-check
  PASS; three fulfilment guards OK.

## Invariant

Rust understands the question, **ranks sources by task suitability**, grounds, and proves task fulfilment
before publishing; ONE Qwen call per explanation; ZERO Qwen on terminals/boundaries; ZERO external providers.
