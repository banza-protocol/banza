# Phase Report — M2.8D: Local Qwen 384-token Default Readiness

**Date:** 2026-07-20 · **ADR:** [ADR-047](../../decisions/adr/ADR-047-banzai-local-qwen-384-token-default.md)
**Benchmark:** [M2_8D_LOCAL_QWEN_VPS_XL_384_BENCHMARK.md](./M2_8D_LOCAL_QWEN_VPS_XL_384_BENCHMARK.md)
**Verdict: Option A — 384 tokens approved as the effective-default output budget (with mandatory fallback). NOT activated; awaiting explicit maintainer approval.**

## Goal

Test whether `local_qwen` can run as the effective default with a professional 384-token output
budget while preserving every M2.8C safety boundary.

## Approach

Benchmarked 384 **first**, via an `LLM_MAX_TOKENS=384` env override against the deployed M2.8C build
(reasoning disabled + prefix warm-up), so the decision was made on real data before any code change.

## Result (Option A)

At 384: cold ~19.8 s and warm ~18.1 s grounded answers with real cited content; five distinct direct
generations **all `finish_reason=stop`** (fuller answers, not truncated), avg **8.7 s**, ~12.3 tok/s,
max ~10 s, **`reasoning_content=0`**. No `<think>`/reasoning leak; injection & off-topic → insufficient
sources; certification → correct non-certifying answer; stop llama.cpp → graceful degrade.
`external_model_called=0`; no public port; swap 0 B; no OOM; website/verification-api/postgres/banzai-api
all healthy during generation; no service restarts. Max latency ~20 s ≪ 60 s → **the 75 s upper margin
is not needed** (timeout stays 60 s).

## What shipped (ADR-047)

Raised the `local_qwen` default output budget **256 → 384** in `readLlmConfig`
(`services/banzai-api/src/provider.js`, `defaults.local ? 384 : 800`); all other M2.8C settings
unchanged (reasoning off, warm-up on, 60 s timeout, ≤3 sources, compact prompt, concurrency 1, queue 1,
mandatory Rust validation + degraded fallback). Tests updated (local default + effective-cap now 384;
override still honored). Docs updated (.env.example, RUNTIME, RUNBOOK, SETUP, ADR index). Purity ADR
range → 47.

## Verification

10 Rust + node test suites green; guards (banzai-local-inference, banzai-protocol-agent, rust-rule,
purity→47, identity, public-surface, governance-docs, private-key-leak) + validate-compose green.

## Decision & boundary

Option A. Per ADR-047 §4 and the M2.8D phase rule, **`local_qwen` is NOT activated**: `mock` stays the
effective default and `BANZAI_BENCHMARK_APPROVED=false`. Promotion requires **explicit maintainer
approval** to set `LLM_PROVIDER=local_qwen` + `BANZAI_BENCHMARK_APPROVED=true`.

## Rollback

Revert without code change: set `LLM_MAX_TOKENS=256` in the VPS runtime `.env` and
`docker compose up -d --no-deps banzai-api`. In code: restore `384`→`256` in provider.js and redeploy.

## Final safe state

VPS: banzai-api mock/healthy; llama-local Exited; `benchmark_approved=false`; `default_effective=false`;
`external_model_called=false`; DNS/Cloudflare/TLS/Postgres/secrets/trust-keys/protocol-state untouched.
