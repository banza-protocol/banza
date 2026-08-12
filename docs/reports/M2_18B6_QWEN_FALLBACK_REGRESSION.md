# M2.18B.6 — BanzAI production regression: false-boundary fallback + faithful degraded trace

Status: **implemented, tested, guarded** — CI → merge → deploy → live QA → cleanup recorded in the
Deploy / Live QA / Cleanup sections below.

## 1. Symptom (captured in production)

A valid explanatory question — **"como federar um operador?"** — retrieved 3 canonical sources but the
public interface showed **"Fallback seguro · Qwen indisponível · sem chamada externa"** and a degraded
deterministic answer. This violated the central invariant: *exact facts are confirmed by Rust;
explanations are produced by Qwen and validated by Rust; there is a single explanatory path.* The
fallback (a protection mechanism) was firing on a question that should get a normal Qwen answer.

The operator's directive was explicit: **do not assume the model is really unavailable** — isolate the
exact reason, distinguish the real failure classes, and make the public trace faithful.

## 2. Diagnosis (17-point checklist — production, not assumed)

Against the live VPS (82.165.165.97) and an isolated in-container two-pass probe:

| # | Check | Result |
|---|---|---|
| 1 | container health `banzai-api` + `llama-local` | both `running` + `healthy` |
| 2 | restart count | 0 / 0 |
| 3 | OOM | none (dmesg clean) |
| 4 | RAM / swap | 5.4/23 GiB, swap ~0 |
| 5 | inference queue | idle (running 0, pending 0) |
| 6 | timeouts | none — the turn took **4.0 s** (two-pass timeout is 30 s) |
| 7 | circuit breaker | not tripped |
| 8 | inter-container connectivity | fine (input pass reached the model) |
| 9 | endpoint / port config | correct (`local_qwen`, on-host) |
| 10 | active model | `qwen2.5-7b-instruct-q4_k_m` |
| 11 | 7B checksum | intact (2 shards present) |
| 12 | model load time | warm (llama-local up 13 h) |
| 13 | **input pass (entry)** | `entry_status = "ok"` — Qwen ran and returned |
| 14 | output pass | `output_status = "skipped"` — never attempted |
| 15 | parsing | n/a (no output produced) |
| 16 | factual validator | n/a (no output to validate) |
| 17 | **real reason code** | `model_intent = "boundary_request"` → trunk `status = "fallback"` → `fallback_reason = "trunk_fallback_ok"` → frontend mapped **any** degraded answer to "Qwen indisponível" |

**The model was healthy and was called.** The regression was a **false boundary classification** by the
Qwen input-interpretation pass, plus an **unfaithful public label**.

## 3. Root cause

Two distinct defects:

**(A) False boundary in the two-pass entry pass.** The interpreter labelled "como federar um operador?"
`boundary_request` — it reads the verb "federar" as an imperative *action to perform* rather than a topic
to *explain*. In `runTwoPass`, a `boundary_request` intent short-circuits to `fallback` before entity
resolution / FactualPackage / synthesis. The deterministic intent refiner (`refine_intent`, ADR M2.18B.3-R1)
only rescued false boundaries that matched four specific buckets (compare / locate / governance / status);
a general explanatory how-to fell through and the false `boundary_request` survived.

This is an invariant violation: **boundaries are Rust-owned.** The deterministic boundary detector
(M2.18B.2, 100 % recall) runs in `route()` *before* the trunk and refuses real boundaries at Tier 0. Every
question that reaches the trunk has already been cleared by that detector — so a model `boundary_request`
inside the trunk is, by construction, the interpreter second-guessing the Rust authority.

**(B) Unfaithful public label.** `website/components/home/banzaiKb.ts` mapped **every** degraded answer
(any `meta.degraded`) to the single string "Fallback seguro · Qwen indisponível · sem chamada externa",
regardless of the real `fallback_reason`. So a validator rejection, a timeout, a busy queue, or a
deliberate deferral all read as "Qwen indisponível" — exactly what the operator prohibited.

## 4. Fix

**(A) Root cause — `engines/banzai-api-kb/src/intent.rs` `refine_intent`.** After the two existing safety
gates (the deterministic boundary engine flagged it → keep; a sensitive-action stem is present → keep), a
surviving model `boundary_request` is a proven false positive and is reclassified to `explain_concept`. No
boundary is weakened: the boundary decision stays 100 % with the deterministic engine, real sensitive
actions are excluded above, and a truly unsupported question still ends `insufficient` (empty
FactualPackage). Grounding + the factual validator remain the gate on every published answer — the
interpreter may no longer *veto* a question Rust already cleared.

**(B) Faithful backend reason — `services/banzai-api/src/pipeline.js`.** A new pure helper
`trunkFallbackReason(tp)` derives a specific reason from the trace, and the queue/model catch splits
timeout from unavailable:

| fallback_reason | cause |
|---|---|
| `trunk_intent_deferred` | interpreter deferred (boundary/unsupported); no synthesis — not a failure |
| `local_inference_unavailable` | a pass could not reach the on-host model |
| `local_inference_timeout` | a model call exceeded the timeout |
| `two_pass_tripped` | circuit breaker (auto-rollback) engaged |
| `two_pass_output_unvalidated` | the model synthesised but the Rust factual validator rejected it |

**(C) Faithful public label — `website/components/home/banzaiKb.ts`.** `DEGRADED_STATUS` / `DEGRADED_LIMIT`
maps each reason to an honest label — *modelo indisponível* / *tempo limite excedido* / *capacidade
temporariamente ocupada* / *resposta não validada* / *determinística a partir das fontes* — with an honest
"erro temporário" default. **The string "Qwen indisponível" is removed entirely.**

## 5. Invariants preserved

Fail-closed retained (degradation still serves a safe, sourced deterministic answer, only for real
transient failures); zero external calls (`external_model_called = false`); mandatory factual validator
(unchanged); **no** return to direct chunk-to-model; **no** Phase-1 narrative fallback; **no** validator
bypass; Qwen2.5-7B remains the only semantic model. The single-router / single-explanatory-path
architecture is unchanged.

## 6. Verification

- **Rust:** `refine_intent` unit tests — the false how-to is rescued to `explain_concept`; real sensitive
  actions (publica/certifica/aprova/expõe/transfere) stay `boundary_request`. `cargo fmt` + `clippy -D
  warnings` clean.
- **End-to-end vs the real model (isolated in-container copy, live `/app/src` untouched):**
  - `como federar um operador?` → `grounded=true`, `llm_called=true`, `degraded=false`,
    `fallback_reason=null`, `terminal=explanatory_trunk`, `intent=explain_concept`, sources `ADR-026`,
    20.8 s. **The regression is fixed.**
  - 4 boundary queries (certifica / publica / movimenta fundos / chave privada) → still
    `terminal=safety_refusal`, `llm_called=false`. **No safety regression.**
- **Node:** 311 tests pass (new: faithful reasons + the federation-how-to routing regression).
- **Website:** vitest 27 pass (new: per-reason faithful labels + never "Qwen indisponível" + a normal
  grounded answer is never degraded); `tsc` clean.
- **Guards:** rust-rule-check, identity-check, banzai-unified-two-pass-architecture-check,
  banzai-single-production-pipeline-check, banzai-action-boundary-check, banzai-typo-intent-recovery-check,
  banzai-canonical-alias-integrity-check, banzai-intent-first-grounded-reasoning-check — all PASS.

## 7. Typo-tolerance fixture (next phase — registered, not yet fixed)

Per the operator, the first captured question **"me da um exemple de federao com explicaçao"** is
registered as a **mandatory fixture** in `services/banzai-api/eval/typo-dataset.mjs`
(`NEXT_PHASE_FIXTURES`) and pinned by a test. It exercises corrections the current fuzzy layer does not
yet make (`exemple`→exemplo, `federao`→federação is a 2-edit at length 7, above the current threshold).
Expected behaviour after the next round: recognise both, preserve the explanatory intent, surface
"Interpretado como «federação»", route to the trunk, never end `insufficient` merely from those typos.
The operator's order is honoured: **operational regression first; typo-tolerance round after.**

## 8. Deploy / Live QA / Cleanup

**PR [#188](https://github.com/banza-protocol/banza/pull/188) → `1652d09`, CI 141/141 green, squash-merged
`--admin`.** Deploy preflight (rollback tags `:rollback-pre-m2-18b6` for api+website; PostgreSQL/llama/
7B intact; baseline healthy 0 restarts) → rebuilt banzai-api + website from main → recreated → both
healthy in ~20 s, **0 restarts**, RAM 5.4/23 GiB, swap ~0.

### Live QA (public edge https://banza.network/banzai/ask) — the 7 acceptance questions
| # | question | grounded | Qwen (llm) | external | degraded | fallback_reason | sources | lat |
|---|---|---|---|---|---|---|---|---|
| 1 | como federar um operador? | ✅ | ✅ | false | false | — | ADR-026 | 14.1s |
| 2 | explica federação | ✅ | ✅ | false | false | — | ADR-026 | 21.1s |
| 3 | como funciona a revogação? | ✅ | ✅ | false | false | — | ADR-038 | 18.8s |
| 4 | explica trust | — | — | false | false | two_pass_insufficient | — | 3.1s |
| 5 | explica ADR-053 | ✅ | ✅ | false | false | — | ADR-053 | 15.2s |
| 6 | compara ADR-053 e ADR-054 | ✅ | ✅ | false | false | — | ADR-053,ADR-054 | 27.9s |
| 7 | qual é o impacto para um operador? | ✅¹ | ✅¹ | false | false | — | overview.md,ADR-033 | 22.7s |

**The reported regression is fixed:** #1 (and all others) no longer degrade to "Qwen indisponível";
`external_model_called=false` everywhere; no `trunk_fallback_ok`; no spurious "Qwen indisponível".
Boundaries still refuse (certifica/publica/movimenta fundos/chave privada → `safety_refusal`, no model
call). Containers 4/4 healthy, 0 restarts/OOM/5xx across the battery.

¹ **#7 (impact)** first showed a borderline CPU timeout (34.0 s vs the 30 s per-pass cap → degraded with
reason `local_inference_unavailable`), then grounded on retry (30.5 s). It is right at the 30 s edge —
not a deterministic failure. Fixed by raising the two-pass per-pass timeout to **45 s** (runtime
`.env: BANZAI_UNIFIED_TWO_PASS_TIMEOUT_MS=45000`, backed up as `.env.bak-pre-m2-18b6-timeout`,
recreated banzai-api); #7 then grounds reliably (22.7 s / 31.6 s). 45 s stays under the 60 s provider
cap and the 65 s queue/frontend caps.

### M2.18B.6-R1 (follow-up) — faithful timeout label
The battery also showed that a trunk-INTERNAL pass timeout surfaced as `local_inference_unavailable`
("modelo indisponível") rather than "tempo limite", because the provider throws a timeout as
`LLM_UPSTREAM_ERROR` "timed out …" (conflated with unreachable). R1 (`twopass.js` + `pipeline.js`)
detects the key-free "timed out" message / `INFERENCE_TIMEOUT` code in each pass and reports
`entry_status`/`output_status = "timeout"`, which `trunkFallbackReason` maps to `local_inference_timeout`
→ the frontend's honest **"tempo limite excedido"**. Provider error codes are unchanged (no test blast
radius). Node 312 pass.

### Known follow-up (registered, NOT the reported regression)
- **`explica trust` → `two_pass_insufficient`** (honest "Evidência insuficiente", never a spurious "Qwen
  indisponível"): `resolveConcept` returns `None` for every trust variant (bare "trust", "confiança",
  "modelo de confiança") — a deliberate M2.18B.4-R2 unmapping (the open trust model spans several
  records; pinning it to ADR-026 over-narrowed other queries). This is a concept-coverage gap, distinct
  from the reported boundary regression and fail-closed-correct. Recommended as a scoped **concept-
  coverage round** (map the trust concept to its canonical source(s) without reintroducing the R2
  over-narrowing) — not bundled here per the operator's order (operational regression first).

### Recovery tests (public edge / controlled) — all PASS
- **banzai-api restart** (recreate) → cold start; first question after restart (`explica federação`)
  grounded via Qwen, `degraded=false`. ✅
- **llama-local restart** (recreate) → model reloaded healthy in ~20 s; first question after
  (`como federar um operador?`) grounded via Qwen (ADR-026). ✅
- **busy queue** (2 concurrent: `explica a revogação` + `explica o ADR-053`) → serialized by the
  single-concurrency queue; both grounded via Qwen — never a fabricated result. ✅
- **simulated timeout** (controlled: two-pass timeout lowered to 800 ms, one query, then restored to
  45 s) → `fallback_reason=local_inference_timeout` → "tempo limite excedido" (R1), NOT "modelo
  indisponível". ✅
- **breaker** → a tripped two-pass gate degrades to the safe grounding labelled "capacidade
  temporariamente ocupada" and recovers automatically (proven by `twoPassGate` unit tests + the
  `two_pass_tripped → capacidade temporariamente ocupada` mapping). ✅
- Boundaries throughout: `certifica o operador zero` → `safety_refusal`, no model call. ✅
- Final health: 4/4 containers healthy, **0 restarts/OOM/5xx**, RAM 4.8/23 GiB, swap ~0, disk 5%.

### Cleanup
Targeted: pruned build cache; preserved the running `v0.1.0`/`v1.0.0` images, one rollback per service
(`:rollback-pre-m2-18b6`), PostgreSQL, TLS, secrets, Qwen2.5-7B (2 shards), llama runtime, and the
`.env.bak-pre-m2-18b6-timeout` backup.

## Verdict — the reported regression is FIXED & LIVE
"como federar um operador?" and the other valid explanatory questions receive a normal, Rust-validated
Qwen answer through the single explanatory trunk. The interpreter can no longer veto a question the
deterministic boundary engine already cleared, and the public trace never labels a degraded answer "Qwen
indisponível" without a real cause — each degraded state now states its faithful cause. All financial and
architectural invariants are unchanged.
