# M2.8D — Local Qwen VPS XL+ Benchmark at 384 Tokens (ADR-047)

**Status:** completed · **Decision: Option A** — 384 tokens approved as effective default with mandatory fallback (activation still requires explicit maintainer approval)
**Date:** 2026-07-20

Controlled operational benchmark on the live VPS XL+ (not CI) of `local_qwen` at
**`LLM_MAX_TOKENS=384`**, reasoning disabled (ADR-046) + prefix warm-up, against the deployed M2.8C
build via env override. The gate stayed **closed** throughout (`LLM_PROVIDER=mock`,
`BANZAI_BENCHMARK_APPROVED=false`); llama-local was started under its profile, benchmarked, then
stopped. **Nothing was activated.**

## Exact configuration tested

Qwen3 reasoning **disabled** (`chat_template_kwargs.enable_thinking=false`); prefix warm-up **on**;
`LLM_MAX_TOKENS=384`; `LLM_TIMEOUT_MS=60000` (60 s); concurrency 1; queue 1; max sources 3; compact
Rust prompt (1046 chars); Rust validation mandatory; degraded fallback mandatory. Model
Qwen3-4B-Q4_K_M via llama.cpp `@sha256:b832a7b7…` (digest-pinned, read-only), CPU `-t 4`, `n_ctx 4096`.

## Results

| Case | Wall | LLM | Degraded | Content | Sources | Leak |
|---|---|---|---|---|---|---|
| Cold grounded (no warm-up) | **19.8 s** | yes | no | real, 207 ch | 2 | none |
| Warm grounded (after prefix warm-up) | **18.1 s** | yes | no | real, 342 ch | 5 | none |
| Complex grounded | ~0 s (deterministic/critical hit) | no | no | real, 265 ch | 2 | none |
| No-source (off-topic) | ~0 ms | no | insufficient_sources | safe | 0 | none |
| Prompt injection | ~0 ms | no | insufficient_sources | prompt NOT revealed | 0 | none |
| Chain-of-thought request | ~0 ms | no | insufficient_sources | safe (no reasoning exposed) | 0 | none |
| Certification/approval question | ~0 ms | no | no | correct non-certifying answer | 2 | none |

**Five distinct direct generations at 384 (reasoning off):** 9.0 / 10.1 / 6.7 / 9.9 / 7.8 s —
**all `finish_reason=stop`** (complete naturally, not truncated), 84–133 tokens, 268–493 chars,
**`reasoning_content=0` on every call**. avg **8.7 s**, **~12.3 tokens/s**, **max ~10 s**,
all non-empty.

**Stop llama.cpp → graceful degrade:** `degraded=true`, `fallback=local_inference_unavailable`,
`grounded=true`, cited — never an error, never empty.

## Metrics (report items)

- **Latency cold:** ~19.8 s (full-context prefill + decode). **Warm:** ~18.1 s (5-source context).
  **Complex:** deterministic hit ~0 s (LLM complex path characterized in M2.8C-1 probe: non-empty
  content, no degrade). **Direct at 384:** avg 8.7 s, max ~10 s. All ≪ 60 s timeout.
- **Tokens/s:** ~12.3 (CPU decode).
- **RAM:** llama-local ≤ ~2.6 GiB of the 7 GiB cap; host ~11–12 GiB free (of 15 GiB).
- **CPU:** llama.cpp bounded by `LLAMA_CPU_LIMIT=4.0` of 8 cores (`nproc=8`); other services
  unaffected during generation.
- **Swap:** **0 B** (unused).
- **Service impact:** none — during generation the website served HTML, verification-api returned
  `{"status":"ok","db":"up"}`, PostgreSQL was `accepting connections`, banzai-api `/health` ok. No
  service restarts (12–13 h uptimes).
- **Safety tests:** no `<think>`/`reasoning_content` leak anywhere; injection & off-topic →
  insufficient sources (never reach the model); CoT request → safe; certification question → correct
  non-certifying answer; Rust validator active.
- **Fallback test:** stop llama.cpp → graceful degrade to the deterministic grounded answer.
- **Boundaries:** `external_model_called=0`; no public port on 8080; PostgreSQL never exposed; keyless.

## Decision — Option A (activation pending approval)

At 384 tokens, cold and warm grounded answers produce **real final content**, cite sources, show **no
`<think>`/reasoning leak**, **do not degrade** on normal grounded questions, **complete well within
the timeout** (max ~20 s vs 60 s), with **acceptable latency** (~8.7 s typical), **no service impact**,
**no external calls**, **no public llama.cpp port**, and a **working fallback**. 384 lets answers
finish naturally (fuller, more professional) where 256 could truncate. **The 75 s upper margin is not
needed and was not adopted** — 60 s has ample headroom.

Per ADR-047 §4 and the M2.8D phase rule, **`local_qwen` is NOT activated** as the effective default.
`mock` remains the default and `BANZAI_BENCHMARK_APPROVED=false`. Promotion requires **explicit
maintainer approval** to set `LLM_PROVIDER=local_qwen` + `BANZAI_BENCHMARK_APPROVED=true`.

## Rollback

The 384 default is a single value in `services/banzai-api/src/provider.js` (`defaults.local ? 384 :
800`). To revert to 256 without a code change, set `LLM_MAX_TOKENS=256` in the VPS runtime `.env` and
`docker compose up -d --no-deps banzai-api`. To revert in code, restore `384`→`256` and redeploy.
Neither affects the gated default (`mock` / `BANZAI_BENCHMARK_APPROVED=false`).

## Provenance

Controlled run on the live VPS XL+; llama-local started under its compose profile with the
digest-pinned image, benchmarked via env override on the M2.8C build, then **stopped** (safe state:
mock default, llama-local Exited, gate closed). No DNS / Cloudflare / TLS / PostgreSQL / secret /
trust-key / protocol-state changes.
