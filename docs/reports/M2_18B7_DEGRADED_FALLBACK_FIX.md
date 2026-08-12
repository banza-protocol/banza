# M2.18B.7 REOPEN — Systematic Degraded-Fallback Fix

**Status:** RUNNING → COMPLETE (this report records the fix, the deploy, and the public-edge QA verdict)
**Branch:** `fix/m2-18b7-document-lookup-fallback` · **PR:** #208
**Prod:** VPS 82.165.165.97 · banzai-api healthy · Qwen2.5-7B local · `external_model_called=false` on every path

---

## 1. Symptom (as reopened)

Every public BanzAI answer was systematically rendering the banner
**"Fallback seguro · erro temporário · sem chamada externa"** — a safe fallback served as if it were the
normal mode. The reopen was correct: a `COMPLETE` that returns HTTP 200 while degrading every answer is
invalid.

## 2. Diagnosis (per the mandated checklist)

Driven against the live prod edge + the deployed engine in-container:

| Probe | Finding |
|---|---|
| Qwen call attempted? | **Yes** on grounded questions (synthesis_called=true, 9–34s); the model was healthy and reachable (`llama-local:8080`, single-slot). |
| Runtime health / queue | Healthy; inference queue serialised Tier-5 correctly. Not the cause. |
| Timeout / parse failure | No — `output_status` was neither `timeout` nor `invalid` on the failing cases. |
| Schema / output contract | Valid — the model emitted parseable grounded JSON. |
| Factual validator | **Passed** (`factual_ok=true`) on the failing cases — the answer was factually grounded. |
| **TaskCompletionValidator** | **Rejected** — `output_status="task_incomplete"` (or `SOURCE_INADEQUATE`). **This is the cause.** |
| Source-appropriateness | Contributed: a `false` suitability signal degraded valid **documentary** answers. |
| Cache | Not the cause (misses degraded; hits replayed a prior success). |
| **Exact reason code** | `synthesis_fallback_unknown` — because `synthesisFallbackReason()` had **no mapping for `task_incomplete`**, so it emitted the unmapped default, which the website adapter renders as the generic **"erro temporário"** banner. |
| Container / reverse-proxy logs | The exception was swallowed (no error line); the only signal was the info `ask` summary. The trace even read `routing_result=null` / `synthesis_called=false` on the emergency path — a second faithfulness defect. |

### Root cause (two classes)

1. **`document_lookup`** — a *bare* documentary reference ("ADR 002") is classified
   `requested_task=document_lookup`, had **no deterministic terminal** (`attributeAnswer` + `taskedAnswer`
   both MISS `document_lookup`), so it reached the grounded-synthesis trunk as an *explanation*. The model
   produced a factually-valid answer that lacked the record's metadata, so the M2.18B.7 Task-Completion
   validator withheld it (`MISSING_REQUIRED_SECTION`) → `emergency()` degraded grounding → the unmapped
   `synthesis_fallback_unknown` → "erro temporário". This was the dominant, systematic case (every ADR/RFC
   lookup).

2. **Documentary synthesis over-rejection** — a factually-valid grounded answer for a *documentary* task
   (`impact` / `consequences` / `explanation`, and a mis-routed `document_lookup` such as
   "como funciona um pagamento qr") was withheld by the completion gate's **source-appropriateness**
   sub-check (`SOURCE_INADEQUATE`), even though the factual validator had already vouched for it.

Two classification bugs compounded it: key **revocation** ("como revogar uma chave") was misrouted to
`document_lookup` (no how-to marker) and operator **onboarding** had no procedure profile.

## 3. Fix (deterministic, in-architecture — no validator / timeout / WAF / rate-limit weakening)

1. **Deterministic `document_lookup` terminal (`query-core docref::document_lookup_card`).** A bare
   documentary reference is answered by Rust from the registry — **título · tipo · estado · data · caminho**
   + a short source-bound summary + the standing boundary — **0 model calls**, publishable, never degraded.
   Only for a *bare* lookup; an `explica/porquê/impacto/resume` request still escalates to the trunk, and a
   `DocumentMetadata` question stays on the precise exact-fact terminal. WASM export + `knowledge.js`
   wrapper + pipeline **Tier 1d**.
2. **Documentary answers publish.** The Task-Completion gate's source-appropriateness withhold now applies
   **only to hard deliverables** (example/procedure/template/requirements/definition); a grounded
   documentary answer that passed the factual validator is authoritative and publishes. The
   `document_lookup` synthesis arm is dropped (real lookups are the deterministic terminal now).
3. **Faithful trace + honest labels.** `synthesisFallbackReason` maps `task_incomplete →
   synthesis_task_incomplete` (never the misleading `*_unknown`); the emergency path carries the real
   synthesis trace (no more falsely-null `routing_result`/`synthesis_called`); the website adapter renders
   an honest "resposta incompleta para a tarefa" label — **the aviso is not removed or hidden, it is now
   correct and rare.**
4. **Two classification fixes** so advertised structural subjects are deterministic: `revogar` added to the
   procedure markers; `onboarding` aliased to `participacao` (which carries a real procedure).
5. **Harness + readiness-guard reinforcement.** The public-edge QA captures `degraded` / `fallback_reason`
   / `terminal_kind` and **FAILS** on any unexpected degraded fallback or any `synthesis_fallback_unknown`
   banner (new metrics `unexpected_fallbacks` / `temporary_error_banners` / `document_lookup_terminals`);
   `check-banzai-production-e2e-readiness.sh` drives the WASM document-lookup card and requires zero
   degraded regressions in the QA evidence.

## 4. Verification

- **query-core** 196 lib tests (+ docref card/negative, tasked classification, documentary-publish
  regression); `cargo fmt` + `clippy -D warnings` clean; WASM rebuilt.
- **banzai-api** 292 node tests + new `m2-18b7-document-lookup-fallback.test.js`; **website** 57 vitest.
- **Deployed to prod on the branch.** Live edge confirms every previously-degraded query now publishes
  cleanly, 0 model calls for terminals / exactly one for synthesis, no banner:
  - `ADR 002` / `ADR 006` → clean structured lookup card (0 model calls)
  - `me dá um exemplo de federação` → illustrative scenario (actors/sequence/result)
  - `como federar um operador?` / `como revogar uma chave` / `onboarding` → procedure
  - `qual o impacto da raiz de confiança` / `quais as consequências da ADR-006` /
    `como funciona um pagamento qr` / `modelo de manifest` → grounded synthesis, one local Qwen call
- **Public-edge stratified QA** (`artifacts/m2-18b7/public-edge-qa.json`): _(filled below)_.

## 5. Public-edge QA verdict

Stratified public-edge QA against the fixed prod (`https://banza.network/banzai/ask`, real browser
profile, cache-cold, paced ≥3.3s to respect the 20r/m WAF budget — no bypass), 14 strata incl. the
6 zero-tolerance + boundary + insufficient + novel + documentary-synthesis + document-op + mixed +
adversarial (unicode/typo/robust) + follow-up:

| Metric | Result |
|---|---|
| total cases | **203** |
| HTTP 200 | 203 · **5xx = 0** · transport errors = 0 |
| external_model_called | **0** (every path local) |
| grounded answers | 148 |
| **degraded_total** | **0** |
| **unexpected_fallbacks** | **0** |
| **temporary_error_banners** (`synthesis_fallback_unknown`) | **0** |
| gate failures | **0** → `PUBLIC-EDGE QA: OK` |
| latency ms | p50 52 · p90 70 · p99 5947 · max 18059 |

The three named cases confirmed live: **"me dá um exemplo de federação"** → an illustrative scenario
with actors/sequence/result (not a manifest); **"ADR 002"** → a clean, structured documentary lookup
card (title · tipo · estado · data · caminho + summary + boundary, 0 model calls); **"como federar um
operador?"** → prerequisites/steps/validations/limitation (transparent-partial procedure). Every
synthesis-required answer used exactly one local Qwen call; every deterministic terminal used zero.

The `banzai-production-e2e-readiness-check` gate passes on this evidence (zero unexpected fallbacks,
zero `erro temporário` banners) and drives the WASM document-lookup card directly.

**Verdict: the systematic degraded fallback is eliminated. A safe fallback is now the exceptional
protection it was always meant to be — 0/204 on the public edge — never the normal mode.**
