# M2.18B.6 — Rust-First Grounded Synthesis

**Milestone:** M2.18B.6
**Status:** architecture complete on branch; deploy + live-QA pending
**ADR:** [ADR-055](../../decisions/adr/ADR-055-banzai-rust-first-grounded-synthesis.md)
**Scope:** BanzAI (services/banzai-api + engines/banzai-api-kb) — the protocol's native, non-authoritative
agent. Operator-neutral; no protocol contract changed.

---

## 1. The decision

BanzAI now answers with a **single Rust-first grounded-synthesis pipeline**. The canonical invariant:

> **O Rust compreende, encaminha e fundamenta. O Qwen explica uma única vez. O Rust valida antes de
> publicar.**

Rust understands, routes and grounds the question deterministically; the local Qwen model explains
exactly once, from a closed evidence set; the Rust factual validator gates the answer before it is
published. This retires the M2.18B.3 two-pass design, where a first model call *interpreted* the input —
a probabilistic decision on the critical path that is now made deterministically in Rust.

## 2. The pipeline

```
question
  → Rust boundary (original) → Rust normalization/typo recovery → Rust boundary (normalized)
  → ResolvedIntent (resolve.rs)         intent, entity, depth, clarification, flags
  → entity resolution (candidate-only)  never invents an id
  → RelationGraph (relation.rs)         typed, versioned, checksummed (11 relation kinds)
  → RetrievalPlan (retrieval.rs)        8 source roles, reranking, conflict resolution, eligibility
  → AnswerPlan (answerplan.rs)          sections, foci, citation requirements, expected model calls
  → FactualPackage (factpack.rs)        the single enriched contract (facts + provenance + checksums)
  → decision: Rust terminal  OR  ONE Qwen Grounded Synthesis
  → factual validator (factcheck.rs)    claims ⊆ facts, citations ⊆ allowed, no leak, coherence
  → publish
```

## 3. What changed

| Area | Before (two-pass) | After (M2.18B.6) |
|---|---|---|
| Input understanding | 1 Qwen "interpretation" call | Deterministic Rust (`resolve_intent`) |
| Model calls / explanation | 2 | **1** |
| Model calls / terminal, refusal, clarification, insufficient | ≥1 | **0** |
| Source selection, entity, currency, conflicts | model-influenced | **Rust, deterministic** |
| FactualPackage | two builders (single + multi) | **one** builder, one enriched v2 contract |
| Publication gate | validator | validator (unchanged; now on the single contract) |
| External calls | 0 | 0 |

### The single enriched FactualPackage (§11)

`FACTUAL_PACKAGE_VERSION = 2`. One builder, `build_factual_package_planned`, draws facts from exactly the
RetrievalPlan's eligible, public sources (conflict-excluded / historical / ineligible sources are never
drawn; an unmapped concept falls back to the top reranked corpus chunks). The package embeds the three
Rust plans and the full provenance the model and the validator need: per-fact role/checksum/citation_key,
source roles, document states, claims allowed/forbidden, information gaps, conflicts, citation map, and
the source/relation/retrieval/answer/package checksums. The retired dual builders (`build_factual_package`
/ `_multi`, their WASM exports and JS wrappers) are gone.

### Fail-closed startup + checksum-keyed cache (§13/§14)

At boot the service asserts the single-contract WASM exports are present and logs loudly if any is missing
(the trunk already degrades to deterministic grounding — it never publishes an unvalidated model output).
The FactualPackage schema, synthesis prompt contract and validator-policy versions are owned by Rust
(`contract_versions_json`) and bound into the grounded-answer cache key, so any contract or evidence
change invalidates cached answers.

## 4. Guards (exactly four)

CI enforces the architecture with exactly four guards (Makefile + `identity-guard.yml`):

- **banzai-grounded-synthesis-architecture-check** — the pipeline primitives + WASM exports are present;
  exactly one `provider.synthesize`; no input-model contracts; no architecture selector.
- **banzai-old-architecture-clean-check** — the retired two-pass / interpreter names are gone from active
  code, tests, tools, infra **and eval**.
- **banzai-single-synthesis-contract-check** — exactly one FactualPackage builder + one enriched contract;
  retired builders/exports/wrappers absent; validator gate present.
- **banzai-intent-engine-quality-check** — the Rust intent engine is a typed, versioned, checksummed,
  deterministic chain (resolve → taxonomy → relation → retrieval → answer) with no model/network call.

## 5. Dataset, evaluation and parity (§17-19)

- **Dataset** — `eval/m2-18b6-grounded.dataset.json`, **729** real-entity-grounded, category-balanced
  cases (explanation 100, exact 60, impact 60, compare 60, example 76, mixed 60, follow-up 60, concept 32,
  boundary 60, adversarial 55, unsupported 53, ambiguity 53). Built by a deterministic generator
  (`gen-m2-18b6-dataset.mjs`) that validates every case against the WASM engine and drops incoherent ones;
  `--check` is a CI drift guard.
- **Offline evaluation** — `run-m2-18b6-eval.mjs`, fully offline (no server, no Qwen, no network). All
  eight zero-tolerance gates PASS on 729/729: boundary recall 1.0, boundary 0 model calls, grounded has
  facts 1.0, grounded exactly 1 model call 1.0, unsupported declines 1.0, ambiguity safe 1.0, external
  calls 0, determinism 1.0.
- **Parity** — `parity-m2-18b6.mjs`: the Rust resolver (B) matches-or-exceeds the retired model-entry's
  required bar (A) — entity resolution 1.0 ≥ 0.97, intent family 1.0 ≥ 0.95, boundary recall 1.0. Removing
  the model-entry pass is not a regression.
- **Live QA** — `run-m2-18b6-live.mjs` samples the dataset against a running `/ask` and reads the
  single-contract reasoning trace (a refused question makes 0 model calls, a grounded one makes exactly 1,
  external is never called) for deploy-time verification.

## 6. Test status (branch)

- Rust: 136/0 lib + `clippy -D warnings` clean; WASM rebuilt.
- Node: 273/0; offline eval 729/729 PASS; parity PASS; M2.18B.2 boundary eval PASS.
- Guards: the four M2.18B.6 guards green; `single-production-pipeline`, `inference-queue-readiness`,
  `agent-quality` green.

## 7. Safety and neutrality

The action boundary, source selection, document currency and conflict resolution are deterministic Rust
decisions taken **before** any model call. Every published claim is checked against a closed, versioned
evidence set with a claim→source citation map. Inference is the local Qwen model on the host; no external
model is ever called. BanzAI remains **non-authoritative** (ADR-041/ADR-054) and operator-agnostic — the
protocol is verifiable by engines, schemas, manifests and endpoints independently of any AI.

## 8. Remaining to COMPLETE

Documentation surfaces (reference chapter, website BanzAI chapter, single-Qwen SVG) finalised alongside
this report; then PR → CI green → merge → deploy to the production VPS (on-host build, `rollback-pre-
m2-18b6` tag) → live QA battery → performance verification → VPS cleanup.
