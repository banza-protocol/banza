# ADR-055 — Rust-First Grounded Synthesis for BanzAI

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.18B.6
- **Supersedes:** none (retires the M2.18B.3 two-pass / model-entry interpretation architecture)
- **Related:** ADR-041 (BanzAI native protocol agent), ADR-044 (Rust control engine), ADR-049 (operational
  protocol agent), ADR-054 (primary human-operator interface), ADR-037 (Rust-first engines),
  ADR-001 (open protocol), ADR-003 (operator separation)

---

## Context

BanzAI answers questions about the BANZA protocol from a fixed, build-time canonical corpus (the ADRs,
RFCs, reference, specs, governance and conformance material indexed into `doc-index.json`). Earlier
milestones (M2.18B.1–M2.18B.3) explored a **two-pass** design: a first local-model call *interpreted*
the question into a structured intent envelope, and a second call *synthesised* the answer. That input
pass added a whole model turn to the critical path, introduced a class of failure modes that had to be
repaired (invalid or hallucinated interpretation JSON), and — most importantly — let a probabilistic
model make decisions that are safety- and correctness-critical: which intent a question has, which
document it refers to, whether it crosses a boundary, which sources may be cited.

Per ADR-037, every **official** BANZA/BanzAI engine is Rust; TypeScript is UI/glue only. The
understanding, routing and grounding of a question are engine responsibilities. They must be
**deterministic, versioned and testable**, not delegated to a model turn.

## Problem

A question-answering agent for a financial protocol must never (a) let a model choose sources, resolve
entities, decide document currency, or resolve documentary conflicts; (b) publish an answer that has not
been checked against a closed, versioned evidence set; or (c) call an external model. The two-pass design
put the first model call *before* those decisions, which is exactly where non-determinism is most
dangerous. It also cost latency and a second failure surface for no correctness benefit — the corpus is
fixed and the decisions are enumerable, so Rust can make them.

## Decision

**BanzAI uses a single Rust-first grounded-synthesis pipeline. Rust understands, routes and grounds the
question deterministically; the local model explains exactly once; Rust validates the explanation before
it is published.**

The canonical invariant (kept verbatim across engine, service, guards, docs and diagrams):

> **O Rust compreende, encaminha e fundamenta. O Qwen explica uma única vez. O Rust valida antes de
> publicar.**
> *(Rust understands, routes and grounds. Qwen explains exactly once. Rust validates before publishing.)*

### The pipeline

```
question
  → Rust boundary check (original text)
  → Rust normalization / typo recovery
  → Rust boundary check (normalized text)
  → ResolvedIntent            (Rust: intent, entity, depth, clarification, flags)
  → entity resolution         (Rust: candidate-only; never invents an id)
  → RelationGraph             (Rust: typed, versioned, checksummed)
  → RetrievalPlan + reranking (Rust: 8 source roles, conflict resolution, eligibility)
  → AnswerPlan                (Rust: sections, foci, citation requirements, expected model calls)
  → FactualPackage            (Rust: the single enriched contract — facts + provenance + checksums)
  → decision: Rust terminal   OR   one Qwen Grounded Synthesis
  → Rust factual validator
  → publish
```

### Absolute rules

1. **One model call per explanation.** A grounded explanation makes **exactly one** local-model call.
2. **Zero model calls for the rest.** An exact terminal, a refusal, a clarification request and an
   insufficient-evidence decline are served by Rust with **zero** model calls.
3. **The model never decides.** Qwen never interprets the input, chooses sources, resolves entities,
   reranks, decides document currency, resolves conflicts, or publishes without the Rust factual
   validator. It receives only the single enriched `FactualPackage` (the ResolvedIntent, AnswerPlan,
   RetrievalPlan and the closed evidence) plus the output contract — never the corpus, unselected
   candidates, internal sources or the full relation graph.
4. **Zero external calls.** Inference is the local Qwen model on the host (ADR-044/ADR-046). No hosted or
   third-party model is ever called.
5. **Single contract.** There is exactly **one** `FactualPackage` builder (`build_factual_package_planned`)
   and one enriched, versioned contract (`FACTUAL_PACKAGE_VERSION`). The retired dual builders are gone.
6. **Fail closed.** If any single-contract engine primitive is unavailable, the trunk degrades to the
   deterministic grounding and never publishes an unvalidated model output.

### Versioning and cache

The FactualPackage schema, the synthesis prompt contract and the factual-validator policy each carry a
version, exposed by Rust as the single source of truth. A grounded answer's cache key binds those
versions (plus the corpus, repo-index and safety-policy hashes), so any change to the contract or the
evidence invalidates cached answers.

## Consequences

- **Deterministic understanding.** Intent, entity, boundary, plan and evidence are computed by pure Rust
  — reproducible, versioned, unit-tested and offline-evaluable, with no model in the loop.
- **Lower latency and fewer failure modes.** Removing the input model pass removes a whole model turn and
  the interpretation-repair failure surface from the critical path.
- **Safety is not probabilistic.** The action boundary, source selection, currency and conflict
  resolution are deterministic Rust decisions made before any model call.
- **Every claim is checkable.** The factual validator gates publication against a closed, versioned
  evidence set with a claim→source citation map.
- **Governed by guards.** Four guards enforce this architecture in CI: `banzai-grounded-synthesis-
  architecture-check`, `banzai-old-architecture-clean-check`, `banzai-single-synthesis-contract-check`
  and `banzai-intent-engine-quality-check`. An offline dataset (700+ cases) + evaluation + parity harness
  gate the zero-tolerance invariants (boundary recall 1.0, boundary 0 model calls, grounded exactly 1
  model call, unsupported declines, determinism 1.0, 0 external calls).

## Operator neutrality

This decision governs the protocol's own official agent implementation and is operator-agnostic. BanzAI
remains **non-authoritative** (ADR-041/ADR-054): the protocol is verifiable by engines, schemas,
manifests and endpoints independently of any AI, and no operator brand is a dependency.
