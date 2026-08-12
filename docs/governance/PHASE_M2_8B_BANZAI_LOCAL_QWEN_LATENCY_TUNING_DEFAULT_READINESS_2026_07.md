# Phase Report — M2.8B: BanzAI Local Qwen Latency Tuning & Default Readiness

**Date:** 2026-07-20 · **ADR:** [ADR-045](../../decisions/adr/ADR-045-banzai-local-qwen-latency-tuning-default-readiness.md)
**Merged:** [`perf(banzai): tune local Qwen latency and default readiness (#92)`](https://github.com/banza-protocol/banza/pull/92) → `main@97e1a25`
**Re-benchmark:** [M2_8B_LOCAL_QWEN_VPS_XL_REBENCHMARK.md](./M2_8B_LOCAL_QWEN_VPS_XL_REBENCHMARK.md)
**Verdict: local Qwen latency tuning COMPLETE — DEFAULT STILL BLOCKED BY BENCHMARK (Option B).**

## Goal

Reduce BanzAI local (llama.cpp, CPU) inference latency toward Option A default-readiness
**without weakening any protocol boundary**, then re-benchmark honestly and decide.

## What shipped (Rust-controlled, ADR-037)

- **Compact system prompt** in Rust: 1948 → 1046 chars (**~46 % cut**); every boundary
  preserved, including a restored **key-custody clause**.
- **local_qwen** output default **256 tokens**, timeout **60 s** margin, tighter local context
  packing (≤3 excerpts / ≤2800 chars).
- **Warm-up** now polls llama.cpp `/health` with bounded backoff before priming (cold-boot safe).
- **Healthcheck** uses `curl` (present in the image); **image digest-pinned**.

## Adversarial review (4 lenses) — 7 confirmed findings, all fixed

| # | Sev | Fix | Regression test |
|---|-----|-----|-----------------|
| 1/2 | HIGH | compose/.env hardcoded `LLM_MAX_TOKENS=800` + `LLM_TIMEOUT_MS=30000` defeated the local defaults in every real deploy → now injected empty; runtime `.env` on the VPS also stripped | provider tests assert 256/60000 under the shipped empty-string env, not `{}` |
| 3 | MED | warm-up was a one-shot fire on cold boot → now polls `/health` | 2 warm-up tests (ready→prime; never-ready→no prime) |
| 4 | LOW | compaction dropped the key-custody boundary → restored in prompt + negation-aware validator rule | Rust test: custody claims blocked, grounded answer passes |
| 6 | MED | rolling `:server` image tag → digest-pinned; guard asserts a pin | guard self-test (rolling rejected, digest accepted) |
| 7 | LOW | guard self-tested only the key detector → now self-tests network/healthcheck/image detectors | known-bad + clean fixtures |
| 5 | LOW | dangling M2_8B benchmark-record reference → created + reconciled runbook/setup | — |

(2 findings dismissed on verification: leakage-denylist narrowing; `/operators`-empty prong.)

## Verification

13 Rust tests · 58 node tests · `banzai-local-inference-check` (self-tested) · `validate-compose`
· `rust-rule` · `purity` · `identity` · `public-surface` · `workbench-only` · `governance-docs`
· `license-notice` · `postgres-boundary` — all green. Full CI on #92 green. WASM rebuilt.

## Re-benchmark (controlled, live VPS XL+ — not CI)

Deployed the tuned build (mock default — safe), started llama-local under its profile with the
digest-pinned image, benchmarked in-process (real pipeline) + direct consecutive generations,
then stopped llama-local and returned to the safe state.

- Warm answers: **~22–25 s**, grounded, cited, validator active.
- 5 consecutive: **~19 s / 256 tok, ~13.2 t/s**, stable, no drift.
- Cold/complex answers: **degraded** (empty completion) → deterministic grounded fallback.
- `external_model_called = 0`; peak 2.6 GiB; **swap 0 B**; no OOM; no public port; all services healthy.

**Root cause of degradation (confirmed, not a timeout):** Qwen3-4B is a reasoning model; at the
compact 256-token cap it spends the whole budget in `<think>` (`reasoning_content = 1233`,
`content = 0`, `finish_reason = length`) and emits no final answer → `provider.answer` sees an
empty completion → graceful degrade. Simple queries answer normally; complex ones do not.

## Decision — Option B (default NOT activated)

`mock` stays the effective default; `local_qwen` stays preview/opt-in;
`BANZAI_BENCHMARK_APPROVED=false`. The tuning improved warm latency and stability and made the
local defaults actually take effect, but Option A (full grounded cold **and** warm within the
timeout, no latency-degraded on normal questions) is **not** met. Per the phase constraints,
the default was **not** flipped and no timeout was raised to mask latency.

## Recommendation → M2.8C

Disable Qwen3 reasoning for BanzAI (`enable_thinking:false`) — expected to remove the
empty-`content` degradation, sharply cut latency, and align with the no-chain-of-thought
boundary — plus warm the system-prompt KV prefix; then re-benchmark and, if Option A, **stop
and request explicit maintainer approval** before any default activation.

## Final safe state

VPS: `main@97e1a25`; banzai-api mock/healthy; llama-local Exited; `benchmark_approved=false`;
`default_effective=false`; `external_model_called=false`; DNS/Cloudflare/PostgreSQL untouched.
