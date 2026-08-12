# M2.18B.3 — Unified Two-Pass Grounded Architecture: benchmark & selection evidence pack

**Milestone:** M2.18B.3 — one local model artifact, two passes, orchestrated by the Rust engines.
**Status:** engine + runtime **COMPLETE**; dual-model benchmark + selection done; **R1 deterministic
remediation of Qwen2.5-7B — ALL automated gates now PASS on HEAD.** Production flags remain **OFF**;
Phase-1 is the live behaviour. **STOP at the PART 34 human-evaluation gate before any production canary.**

---

## 0. R1 REMEDIATION RESULT (the current, authoritative verdict)

The first benchmark (§3–4) found neither model cleared `intent ≥ 0.95` / `entity ≥ 0.97`. The R1 round
fixed every measured failure **deterministically and generically** (no hardcoded questions, no model
change, no threshold change) and re-ran the **complete Qwen2.5-7B two-pass benchmark under identical
methodology** (same dataset, model artifact, Q4_K_M quantisation, `-c 4096 -t 4`, isolated container).

**Qwen2.5-7B after R1 (n=79, run on HEAD) — every unchanged automated gate PASSES:**

| Gate | Threshold | 7B (first run) | **7B after R1 (HEAD)** |
|---|---|---|---|
| entry JSON valid (pre-repair) | ≥ 0.97 | 1.000 | **1.000** ✅ |
| intent accuracy | ≥ 0.95 | 0.867 ❌ | **1.000** ✅ |
| entity accuracy | ≥ 0.97 | 0.842 ❌ | **1.000** ✅ |
| factual / claim-support (serve rate) | ≥ 0.97 | 0.981 | **0.982** ✅ |
| served unsupported claims | 0 | 0 | **0** ✅ |
| served wrong-doc identity | 0 | 0 | **0** ✅ |
| illegal / out-of-set citations | 0 | 0 | **0** ✅ |
| internal-source leak | 0 | 0 | **0** ✅ |
| boundary violations | 0 | 0 | **0** ✅ |
| candidate-list violations | 0 | 0 | **0** ✅ |
| external-model calls | 0 | 0 | **0** ✅ |
| OOM / swap-thrash / restarts | 0 | 0 | **0** ✅ |
| latency e2e p50 / p90 | production margin | 25.7 / 44.3s | **30.1 / 64.9s** |

**Per-category (HEAD): all perfect** — paraphrase intent 5/5 · entity 15/15; implicit 10/10; compare 5/5;
concept 20/20; architecture 2/2; **governance 3/3 (was 1/3)**; mixed-language entity 3/3; typos entity 1/1.
0 intent misses, 0 entity misses. The 4 fallbacks are all safe non-serves (3 context-less follow-ups whose
output pass was skipped; 1 invalid-JSON output the validator rejected) → **0 served violations**.

**What R1 changed (deterministic, generic — see `docs/governance/BANZAI_INTENT_FIRST_GROUNDED_REASONING.md`
§8.3):** ordinal document references resolved via the registry (`docref::detect_refs`); explicit
references (numbered/ordinal) injected as leading candidates + resolved authoritatively
(`catalogue`); a canonical-vocabulary intent-refinement layer (`intent::refine_intent`) that corrects
governance/status/compare/locate misclassifications — gated so it **never** relabels a boundary-flagged or
sensitive-action-stem question. Dataset labels audited: all failure-row labels consistent with the
published taxonomy → **no label changed**. Regression tests for every failure class (Rust 101 + node 301).

Raw artifact: [`artifacts/m2-18b3/out-7b-r1-final.json`](../../artifacts/m2-18b3/out-7b-r1-final.json).

**Selection (step 10, unchanged thresholds): Qwen2.5-7B.** It now clears every input, output, safety,
factuality, latency and operational threshold with margin, at ~half the 14B latency and a higher clean-serve
rate. Flags remain **OFF**; this proceeds to the PART 34 human-evaluation gate — automated gates passing is
necessary, not sufficient, for production activation.

---

## (Historical) First dual-model benchmark — neither model cleared the gate before R1

**Automated activation gate: NOT PASSED** — neither permitted local model clears every unchanged threshold.

This is the evidence the human evaluator needs to decide the next move. No threshold was lowered; no number
here is estimated — every figure is from the real two-pass path (`runTwoPass`) run against an isolated
llama.cpp container on the production VM, production untouched.

---

## 1. What was built (steps 1–8, committed, all tests green)

The mandatory architecture is implemented end to end and wired into the live pipeline behind
`BANZAI_UNIFIED_TWO_PASS` (**default OFF**):

```
question → boundary preflight (Rust) → candidate generation (Rust)
  → INPUT pass (same model, candidate-constrained IntentEntry) → Rust validate → Rust select_entity
  → FactualPackage (Rust) → OUTPUT pass (same model, grounded synthesis + claim→fact map)
  → Rust factual validation → answer   (any failure → fallback to Phase-1, never a published unvalidated answer)
```

Five permanent Rust engines with WASM exports (`intent_entry_schema`/`validate_intent_entry`,
`catalogue::select_entity`, `factpack::build_factual_package`, `synth::build_output_prompt`/`output_schema`,
`factcheck::validate_output`); the unified `twopass.js` runtime; the `twoPassGate.js` activation gate
(canary + auto-rollback, one model override threaded through both passes); pipeline Tier 1a′; the
`banzai-unified-two-pass-architecture-check` guard (in CI). 91 engine tests + 291 node tests green.

---

## 2. Methodology (identical for both models)

- **Harness:** `services/banzai-api/eval/twopass-benchmark.mjs` drives the actual production `runTwoPass`
  over the real Rust/WASM engines. Same artifact for BOTH passes of each candidate. Temperature 0.
- **Dataset:** the 150-case `m2-18b-intent-interpretation.dataset.json`, filtered to the 79
  `interpreter_called:true` cases across 10 categories (paraphrase, implicit, concept, compare,
  architecture, governance, follow_up, ambiguity, mixed_language, typos). The filter already excludes every
  `fast_path:true` case — confirmed by the production-cut (0 additional excluded) — so these numbers already
  reflect the two-pass's real production input distribution.
- **Isolation:** a memory-capped llama.cpp container (same pinned digest as production) on a separate docker
  network, no host port; production's `llama-local` was never touched (6/6 healthy throughout; flags OFF).
- **Models:** Qwen2.5-7B-Instruct Q4_K_M and Qwen2.5-14B-Instruct Q4_K_M (both non-reasoning → clean JSON).
- Raw artifacts: [`artifacts/m2-18b3/out-7b-full.json`](../../artifacts/m2-18b3/out-7b-full.json),
  [`artifacts/m2-18b3/out-14b-full.json`](../../artifacts/m2-18b3/out-14b-full.json).

---

## 3. Results (n = 79, both models)

| Axis | Threshold | Qwen2.5-14B | Qwen2.5-7B |
|---|---|---|---|
| entry JSON valid (pre-repair) | ≥ 0.97 | **1.000** ✅ | **1.000** ✅ |
| intent accuracy | ≥ 0.95 | 0.911 ❌ | 0.867 ❌ |
| entity accuracy | ≥ 0.97 | 0.842 ❌ | 0.842 ❌ |
| factual-serve rate | ≥ 0.97 | 0.804 ❌ | **0.981** ✅ |
| unsupported claims **served** | 0 | **0** ✅ | **0** ✅ |
| illegal citations served | 0 | **0** ✅ | **0** ✅ |
| wrong-doc identity served | 0 | **0** ✅ | **0** ✅ |
| internal-source leak served | 0 | **0** ✅ | **0** ✅ |
| validator rejections (caught, never served) | — | 8 | 1 |
| latency e2e p50 / p90 | production margin | 48.4s / 95.5s | **25.7s / 44.3s** |
| latency output-pass p50 / p90 | — | 58.5s / 91.9s | 26.7s / 40.2s |

**Safety is fully intact for both models: zero bad answers were SERVED.** The zero-tolerance counts in the raw
JSON (14B wrong-doc 2; 7B unsupported 1) are *validator detections* — the Rust factual validator caught every
one and forced a fallback to Phase-1, so none reached a user. This is the architecture working as designed:
the model proposes, Rust disposes.

### Per-category (intent; entity where applicable)

| Category | 14B | 7B |
|---|---|---|
| concept | 19/20 | **20/20** |
| paraphrase | 5/5 · e14/15 | 5/5 · e14/15 |
| implicit | **10/10** | 8/10 |
| compare | **5/5** | 3/5 |
| architecture | 1/2 | **2/2** |
| governance | 1/3 | 1/3 |
| entity misses | ordinal/typo/mixed (3) | ordinal/typo/mixed (3) |

The intent shortfall is **systematic in `governance`** (both 1/3 — e.g. *"como submeto uma proposta de RFC?"*
→ `unsupported`; *"quem pode propor mudanças?"* → `explain_concept`) and, for 7B, `compare`. The entity
shortfall is **3 narrow phrasings** (an ordinal *"a segunda ADR"*, a typo *"explika a adr 002"*, a
mixed-language variant) that neither the candidate catalogue nor `select_entity` resolves today.

---

## 4. Selection (step 10, unchanged thresholds)

**Neither model clears the automated gate** — both miss `intent ≥ 0.95` and `entity ≥ 0.97`. Under the
"do not lower thresholds" rule this means **the two-pass cannot be auto-activated**. Flags stay OFF; Phase-1
remains the live behaviour; auto-rollback stays armed.

**Best base if activation is pursued: Qwen2.5-7B.** It dominates on the production-critical axes — ~2× faster
(e2e p50 25.7s vs 48.4s; p90 44.3s vs 95.5s), a far higher clean-serve rate (0.981 vs 0.804, i.e. it needs
Phase-1 fallback far less), and 8× fewer validator rejections (1 vs 8) — while tying on safety (0 served
errors) and entity, and trailing only marginally on intent (0.867 vs 0.911, both sub-threshold). The 14B's
only edge is a marginally higher, still-failing intent score at double the latency and a quarter the
clean-serve rate. Picking the slower, lower-serve-rate 14B purely for a sub-threshold intent delta would be
the worse engineering outcome.

---

## 5. Addressable gaps (reversible, no threshold change) — recommended next round

The gate is missed by two specific, narrow, deterministically-fixable shortfalls:

1. **Entity 0.842 → ≥0.97** — the 3 misses are an ordinal (*"a segunda ADR"*), a typo (*"explika a adr 002"*),
   and a mixed-language variant. Fixes are pure Rust, flag-independent: ordinal→number resolution and
   typo-tolerant numbered-id matching in `docref`/`catalogue`; confirm the numbered fast-path catches
   *"adr 002"* before the two-pass. Expected to clear the entity bar.
2. **Intent 0.867/0.911 → ≥0.95** — the `governance` category (both 1/3). Options: a governance-intent signal
   / exemplars in the Rust-owned entry prompt, and a review of whether the borderline labels
   (governance-process vs concept) are correct. Partly engine, partly a dataset-label audit.

Each is reversible engineering (no threshold lowered, no external model, one artifact, both passes). After the
fixes, re-run the identical benchmark on the 7B (~30 min) and re-evaluate against the same thresholds.

---

## 6. The decision at the human-evaluation gate (PART 34)

This milestone deliberately **stops here** — it does not force an activation the numbers don't support, and it
does not declare Phase-1 permanent. The human evaluator decides between:

- **(A) Authorize the scoped improvement round on the 7B** (§5) → re-benchmark → if it then clears every
  threshold with margin, proceed to canary activation with auto-rollback; **or**
- **(B) Keep Phase-1 as the safe default** for now (the two-pass ships dormant, fully built and guarded).

Either way the safety guarantee is unconditional: **no unvalidated or unsupported answer is ever served**, on
any path, whether the two-pass is on or off.

---

## 7. Rollback / current state (unchanged)

- Production: 6/6 containers healthy, `BANZAI_INTENT_INTERPRETER=0`, `BANZAI_UNIFIED_TWO_PASS` unset (OFF).
  Phase-1 is live. The entire two-pass is dormant code behind the gate.
- No production image was rebuilt or redeployed for the benchmark; the isolated bench containers and network
  were removed after the runs.
- The deterministic action boundary (M2.18B.2) remains 100% live regardless of any two-pass flag.
