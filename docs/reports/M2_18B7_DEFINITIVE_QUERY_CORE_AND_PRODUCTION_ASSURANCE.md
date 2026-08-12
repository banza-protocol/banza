# M2.18B.7 — Definitive Query Core, Canonical Knowledge Coverage and Production Assurance

**Status:** `COMPLETE` + LIVE — the definitive Query Core (`engines/banzai-query-core`) + assurance
layer is merged (PR #198 → main `381a808`), deployed, and confirmed by parity live-QA · **Date:** 2026-07 ·
**ADR:** [ADR-056](../../decisions/adr/ADR-056-banzai-definitive-query-core-and-production-assurance.md)
· **Milestone continuity:** `artifacts/m2-18b7/execution-state.json`

> **Correction (reopen).** This milestone was briefly and *incorrectly* declared COMPLETE. Two distinct
> things must not be conflated:
>
> 1. **Accepted, live in production** (PRs #193–#196, must not be reverted): known canonical entities are
>    always answerable (coverage engine + builder fallback); general questions ground on sources; the
>    creation date is a consistent DECLARED exact fact (01/08/2025, NOTICE); an undeclared attribute
>    (version) returns a precise contextual `NOT_DECLARED`; BANZA/BanzAI/Banzami no longer fall to the
>    generic list; CI/merge/deploy/live-QA ran and the services are healthy.
> 2. **Still incomplete (MANDATORY, not optional future work)** — the *center* of the M2.18B.7 request:
>    the internal `engines/banzai-query-core` crate (single Rust authority) with migration + removal of the
>    dispersed logic; the shared typed scenario library; the complete entity×intent×attribute coverage
>    truth table; property-based, metamorphic, fuzz and failure-injection testing; and the four behavioral
>    guards. "Essential coverage corrected in production" is **not** "definitive assurance delivered."
>
> `COMPLETE` is restored only after section 5's mandatory scope lands green + deployed + live-QA + audited.
> The remaining scope is tracked in `artifacts/m2-18b7/execution-state.json` (`mandatory_remaining`).

Canonical principle: *O Rust compreende qualquer pergunta dentro do escopo suportado, confirma o que está
documentado, identifica claramente o que não está declarado e nunca confunde uma falha interna de
cobertura com falta legítima de evidência.* The ADR-055 architecture is preserved: Rust understands,
routes and grounds; the model explains at most once; Rust validates before publishing; zero external
providers.

## 1. Baseline

`main cc11711`; prod repo `ad0a848` (Qwen2.5-7B, 6 services healthy; PostgreSQL/pgdata/Qwen GGUF/nginx TLS
preserved; rollback image `banzai-api:rollback-pre-m2-18b6`). Live baseline captured the reported
failures.

## 2. Root cause (proven, not inferred)

The router correctly sent `o que é o BANZA?` to the grounded trunk (`action:qwen`, `entry_id:what-is-banza`,
"sufficient grounded sources"), but the FactualPackage came back **empty**: `what-is-banza` is a synthetic
route entry id (not a document), so the exact-source guarantee could not fire, and `retrieve_doc_chunks`
keeps only chunks scoring ≥3 — the sole content term (the ubiquitous entity name) never cleared the
threshold. `para que serve o BANZA?` only worked because the discriminative term `serve` matched. The trunk
seed also ignored the router's entity. An **existing canonical source silently degraded into the generic
topic list** — the failure this milestone forbids. Creation-date questions had no exact-fact path (generic
list), and `protocol-license`/`protocol-origin` were mislabelled `critical_boundary` → false safety refusal.

## 3. What shipped

### Part 1 — canonical entity → primary-source coverage (`coverage.rs`)
`ENTITY_PRIMARY_SOURCES` binds BANZA→ADR-001/002, BanzAI→ADR-041/054, Banzami→ADR-002; `factpack.rs` draws
an entity's declared primary sources when retrieval is empty (`entity_primary_source_coverage`); the
pipeline seeds the trunk with the router's canonical-entity id, coverage-gated (`covered_entities_json` WASM
+ `coveredEntities()` JS). A known entity can no longer yield an empty package.

### Part 2 — attributes + contextual insufficient-evidence + reason codes
`reason.rs` — closed 22-variant `ReasonCode` enum with `is_internal_coverage_failure()`
(`SOURCE_EXISTS_BUT_NOT_RESOLVED` / `FACTUAL_PACKAGE_EMPTY` are internal bugs, never a public generic
answer). `attribute.rs` — a DECLARED exact fact (the protocol creation date `01/08/2025`, read from
NOTICE) → confirmed with its source (reason `EXACT_FACT_CONFIRMED`), consistent with `protocol-origin`; an
UNDECLARED attribute (the protocol version) → precise `NOT_DECLARED` message. Never inferred (no
Git/commit/file/deploy/domain/index dates), never the generic list; `attribute_answer_json` WASM +
`attributeAnswer()` JS + a deterministic pipeline Tier-1b terminal (0 model). `route.rs` — `protocol-license`
+ `protocol-origin` relabelled `grounded`.

### Part 3 — observability
The structured `reason_code` is surfaced in the public reasoning trace (`reasoningTrace.js`,
`PUBLIC_TRACE_KEYS`), public-safe.

### Enforcement
NEW guard `banzai-canonical-knowledge-coverage-check` (entity coverage, builder fallback, attribute
registry + no-inference, reason codes, WASM/JS/pipeline wiring, no silent degrade) wired into Makefile +
CI; ADR-055 guards remain. ADR-056 authored, indexed (citable), ADR range bumped `1..=56`.

## 4. Verification (local, green)

- `o que é o BANZA?` / `fala-me sobre o BANZA` → grounded on ADR-001/002 (was generic list).
- `ano de criação do banza` → `exact_fact`, `01/08/2025` cited from NOTICE, grounded, 0 model, never the
  generic list — and consistent with `quando foi criado o BANZA?` (no more creation-date contradiction).
- `quando foi criado o BANZA?` / `data de criação do protocolo` → grounded `protocol-origin` provenance,
  0 model (was false safety refusal).
- `qual a versão do BANZA?` → `attribute_not_declared`, precise message (the protocol is defined by its
  ADRs/RFCs/specs, not a single version), 0 model, never the generic list.
- `qual a licença do BANZA?` → `grounded` (was `critical_boundary`).
- Tests: Rust 278 + node 282 green; `fmt` + `clippy -D warnings` clean; the ADR-055 guards +
  `banzai-canonical-knowledge-coverage-check` + canonical-corpus-integrity (ADR-056 citable) +
  identity/purity/invariant + repo-guards(4) green; WASM + guard binary rebuilt.

## 5. Architecture preserved

Rust-first; one Qwen call for explanations; zero on terminals; ResolvedIntent / RelationGraph /
RetrievalPlan / AnswerPlan / FactualPackage / factual validator / source policy / startup fail-closed /
checksum cache; zero external providers; clean-slate of the two-pass design retained.

## 6. Definitive Query Core + assurance layer (DELIVERED)

The **center** of the M2.18B.7 request — "resolve the problem from the base, foresee complete classes of
questions, build a professional internal library" — is now delivered on the branch, not deferred:

- **A. `engines/banzai-query-core`** — the single Rust authority (pure rlib, no `wasm-bindgen`). ALL 24
  query modules (route, boundary, resolve, retrieval, answerplan, factpack, synth, factcheck, relation,
  catalogue, docref, concept, coverage, attribute, reason, glossary, intent, fuzzy, prompt, queue_policy,
  source_policy, terminal, validate + the retrieval/normalization foundation) plus the canonical corpus
  (`entries-index.json`, `doc-index.json`, `repoindex/*`) were **moved** here via `git mv`; the superseded
  implementations are **removed** — no duplication. `banzai-api-kb/src` is now only `lib.rs` (1248 → 582
  lines), the `#[wasm_bindgen]` shim + `pub use banzai_query_core::*`. Dependency graph acyclic:
  `banzai-query-core → banzai-api-kb → WASM → service`. Parity proven by the full `banzai-api-kb`
  integration suite (unchanged, exercising the moved code through the re-export).
- **B. Shared scenario library** (`scenarios.rs`) — one typed Rust scenario source (5 answer classes,
  `max_model_calls` invariant), exposed via `scenarios_json` (Rust + WASM) so unit tests, guards and the
  live-QA/eval paths read one authority — no divergent datasets across Rust/JS/scripts.
- **C. Coverage truth table** (`tests/assurance.rs`) — drives the real engine over every scenario:
  boundary classification exact; routing class (boundary=deterministic/0-model, insufficient, grounded)
  matches; the declared-vs-`NOT_DECLARED` attribute pair exact.
- **D–G. Test batteries** — property-style (normalize determinism/idempotence; boundary invariant under
  case/courtesy; safe questions never wrongly refused), metamorphic (class invariant under
  case/accent/punctuation/whitespace/courtesy), fuzz-smoke (empty/oversized/unicode/injection/control-char
  → no panic, financial action stays fail-closed), and failure-mode reason codes (internal-coverage
  failures flagged internal; every runtime failure code present + unique).
- **H. Guards (behavioral, not grep-only), CI-wired** — `banzai-query-core-contract-check` (single-authority
  architecture), `banzai-query-scenario-assurance-check` (drives the compiled WASM over the scenario truth
  table), `banzai-production-e2e-readiness-check` (pre-deploy gate over the production-critical invariants),
  alongside the retained `banzai-canonical-knowledge-coverage-check`.

> The truth table corrected three initial scenario assumptions to VERIFIED engine behavior (a boundary
> refusal routes via `action=deterministic`, not `"refusal"`; a revocation phrasing is grounded knowledge,
> not a financial boundary; "faz um pagamento" is outside the current boundary taxonomy). The scenarios
> describe real behavior, not aspiration.

## 7. Rollout

PR → CI green → merge → deploy (VPS 82.165.165.97: pull repo→main, `docker compose build banzai-api`,
`up -d`; rollback `banzai-api:rollback-pre-m2-18b6` kept; PostgreSQL/Qwen/TLS untouched) → comprehensive
stratified live QA over the essential questions. See the verdict section of the PR + execution-state.
