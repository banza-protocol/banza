# BanzAI — Safe Progressive Response, Structured Generation & Validated Cache (SPR)

> Engineering decision record for the SPR program's latency + delivery work. It documents SPR‑1/2/5
> (progressive delivery, already live), SPR‑4 (real final‑answer latency), SPR‑3 (validated cache +
> coverage) and SPR‑6 (production E2E). It is **not** a protocol ADR: SPR changes only *how* the single
> grounded synthesis is generated and cached — it changes **no protocol invariant** and does **not** touch
> the ADR‑073 claim/citation authority validator, whose guarantees remain byte‑for‑byte in force.

## The two latencies (why SPR‑4 exists)

Progressive delivery (SPR‑1/2/5) fixed **perceived** latency: the SSE contract `banzai-progress/1`
streams typed progress events (`REQUEST_ACCEPTED → INTENT_RESOLVED → FACTUAL_PACKAGE_READY →
SYNTHESIS_STARTED → SYNTHESIS_COMPLETED → FINAL_VALIDATED`) so the screen is never empty. Crucially there
is **no `MODEL_TOKEN` event**: not one character of model prose is streamed. The terminal event
(`FINAL_VALIDATED` | `HONEST_FALLBACK` | `REFUSED`) is emitted **after** `ask()` returns, carrying the
already‑validated envelope. Progressive delivery does **not** reduce the **real** metric,
`time_to_final_validated_answer` (~37–39 s on the 7B‑CPU profile).

SPR‑4 targets that real metric — under one rule: **optimise the quantity of generation, not the quantity
of truth.**

## SPR‑4 §5 — structured generation (the one safe generation trim)

A read‑only audit of the synthesis contract found the pipeline was **already** near‑minimal: the model
emits only `answer_markdown`, the `claims[]` map (`claim` + `fact_ids`) and `insufficient_evidence`.
Everything the naïve framing feared the model was generating — sources, hashes, provenance tables,
metadata, badges, the transparency panel, contextual suggestions, reason codes — is **already assembled
deterministically** from the Rust `FactualPackage` (`pipeline.js` / `server.js` / `answerContract.js`),
never authored by the model.

The single remaining piece of *restated data* the model was still generating was `cited_source_ids` — a
list mechanically derivable from `claims[].fact_ids → fact.source.document_id`. SPR‑4 §5 removes it from
the model's contract:

- **Rust** (`engines/banzai-query-core/src/synth.rs`):
  - `output_schema_structured(pkg)` — the baseline schema minus `cited_source_ids` (3 required fields:
    `answer_markdown`, `claims`, `insufficient_evidence`). `claims[].fact_ids` stays grammar‑bound to the
    package's real fact ids, so an invented fact reference is still structurally impossible.
  - `build_output_prompt_structured` / `build_output_prompt_obliged_structured` — the model is no longer
    asked to *fill* `cited_source_ids`; the prose‑guard half of the citation rule stays (never name a
    document outside `FONTES PERMITIDAS` in the prose). Every other rule is byte‑identical to the baseline.
  - `derive_cited_source_ids(pkg, out)` — the deterministic derivation: first‑appearance order, deduped,
    **intersected with `allowed_source_ids`** so the result is ⊆ allowed **by construction**.
- **Glue** (`services/banzai-api/src/knowledge.js`, `grounded-synthesis.js`): in the structured path the
  model output is parsed, then `output.cited_source_ids` is derived **before** any validation — so the
  structural validator, the task‑completion gate and the ADR‑073 claim/citation verifier all read the same
  derived, guaranteed‑valid citation set. The validator is unchanged.

**Consequence for safety:** the "model authored a dead / out‑of‑set citation" defect class becomes
**structurally impossible** in the structured path — a strengthening of the ADR‑073 guarantees, never a
weakening. The honest‑decline path (`insufficient_evidence`) and the claim→fact linkage (`claims[].fact_ids`)
are load‑bearing and are **never** trimmed.

**Honest latency scope.** This trim removes a small, non‑truth‑bearing field (~10–40 tokens) from
generation and slightly shrinks the constrained‑decoding grammar. It is a real, free reduction, but the
dominant cost of `time_to_final_validated_answer` remains generation‑bound: `prefill + output_tokens/tok‑s
+ verification + queue`, at ~25 tok/s on the resident 7B‑Q4_K_M CPU runtime. The token budgets
(`OUTPUT_BUDGET = {brief:512, standard:768, deep:1024}`) are **not** cut — reducing them would reduce
truth, which the rule forbids. No model, quantisation, or hardware change is made in this milestone.

### Activation gate (default OFF until proven)

Structured generation is **default‑OFF** (`BANZAI_STRUCTURED_SYNTHESIS` unset ⇒ baseline). It is
activated with `BANZAI_STRUCTURED_SYNTHESIS=1` **only after** the live A/B harness proves, on an identical
sample:

- `invalid_citation_rate = 0` (derived cited ⊆ allowed — structurally guaranteed);
- no status regression (structured never fails where baseline grounded);
- no information / reason‑code / limitation lost (answer not materially shorter, claims preserved);
- existing quality evals pass;
- a **measurable** latency reduction (median output tokens ↓ and/or median generation_ms ↓).

A merge therefore changes **nothing at runtime** until the flag is flipped on the host — the M2.8D
activation pattern. Rollback = unset the flag and recreate `banzai-api` (no rebuild).

### A/B regression harness

`tools/spr4-ab-harness.mjs` drives the real trunk (`runGroundedSynthesis`) over the real Rust engines and
the real local model, running each question twice (baseline vs structured via the explicit `structured`
override) and measuring the full decomposition — input/output tokens, tok/s, prefill (`prefill_ms`),
`generation_ms`, non‑generation overhead, and `time_to_final_validated_answer` — plus the gates above. It
exits non‑zero unless every gate holds. Run on the host with a reachable model:

**Latency decomposition (SPR‑4 §1) — every phase timed separately so none hides.** `synthesis_timings`
carries: `queue_wait_ms` (inference‑queue wait, measured in the pipeline), `prompt_build_ms` (JS/Rust
obligations + prompt + schema), `prefill_ms` (llama.cpp prompt‑eval; scales linearly with
`tokens_evaluated` at the CPU prefill rate ~63–66 tok/s — a warm KV‑cache prefix collapses it to ~1
token; prompt tokenization is folded in by llama.cpp and not separable via the OpenAI‑compatible
endpoint), `generation_ms` (+`tokens_predicted`, `tokens_per_second`), `validate_ms` (the structural
validator), `claim_citation_verification_ms` (the ADR‑073 claim + citation verifier — a single Rust call,
reported as one field rather than a fabricated split), and `total_ms` (the whole output pass;
`queue_wait_ms` sits outside it). A large `prefill_ms` on a fresh multi‑document answer is a big prompt at
the CPU prefill rate, **not** a regression — it is prompt‑size‑driven and drops to ~1 token on a warm
prefix. All fields are surfaced on `/ask`.

```bash
BANZAI_LLM_PROVIDER=local_qwen node tools/spr4-ab-harness.mjs --reps 2 --out spr4-ab.json
```

## SPR‑3 — validated cache + deterministic coverage

- **Validated‑only caching** is already structural: `exact`/`semantic` cache writes sit **downstream** of
  the ADR‑073 post‑synthesis gate, so only `FINAL_VALIDATED` answers are ever cached and a cache hit can
  only ever return a policy‑passing answer.
- **Cache‑key invalidation** now binds the synthesis‑generation contract (`synthesisContract`:
  `baseline/1` ↔ `structured/2`) alongside the existing corpus / repo‑index / safety / contract /
  post‑validation‑policy dimensions. Switching the output contract opens a **fresh** validated‑cache
  namespace — a validated answer produced under one contract can never be served under the other.
- **Transparency**: the `/ask` meta carries `answer_source` (`fresh_synthesis` | `validated_cache`) and
  `cache_key_dimensions` (the bound dimension names + the contract / post‑validation / synthesis‑contract
  versions — never values), so deterministic coverage (validated‑cache + deterministic terminals vs fresh
  synthesis) is measurable from the envelope alone.

## SPR‑6 — production E2E

`tools/spr6-prod-e2e.mjs` runs a 20‑scenario production sweep against the live edge and asserts the SPR
invariants hold on real traffic: `unvalidated_model_content_exposed = 0`, no `MODEL_TOKEN` in the SSE
stream, deterministic refusals for boundary/financial‑action questions, and every published
`cited_source_ids ⊆ allowed_source_ids`. It is the acceptance evidence for activation.

## Invariants preserved

- The single grounded synthesis remains the only model call; Rust resolves, the model explains once, Rust
  validates before publish.
- ADR‑073's post‑synthesis authority validator and the Inc.4 claim/citation verifier are **unchanged**.
- No model prose appears before final claim + citation validation; no `MODEL_TOKEN` event exists.
- Operator‑neutral, Rust‑first (engines Rust; TS glue).
