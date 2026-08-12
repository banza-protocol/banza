# Phase Report — M2.8C: Disable Qwen Reasoning & Prefix Warm-up

**Date:** 2026-07-20 · **ADR:** [ADR-046](../../decisions/adr/ADR-046-banzai-disable-qwen-reasoning-prefix-warmup.md)
**Merged:** [`perf(banzai): disable Qwen reasoning for BanzAI + prefix warm-up (#94)`](https://github.com/banza-protocol/banza/pull/94) → `main@5d5d03f`
**Re-benchmark:** [M2_8C_LOCAL_QWEN_VPS_XL_REBENCHMARK.md](./M2_8C_LOCAL_QWEN_VPS_XL_REBENCHMARK.md)
**Verdict: Option A — local_qwen is DEFAULT-READY. Activation is PENDING explicit maintainer approval (not activated).**

## Goal

Make `local_qwen` default-ready by disabling Qwen3 reasoning mode for BanzAI and warming the
system-prompt prefix, then re-benchmarking on the VPS XL+ — without weakening any boundary.

## Root cause addressed

M2.8B (Option B): Qwen3-4B is a reasoning model that spent the compact 256-token budget inside
`<think>` (`reasoning_content`), returning empty `content` on cold/complex prompts → degrade.

## What shipped (ADR-046)

- **Reasoning disabled for the local runtime** via `chat_template_kwargs.enable_thinking=false`.
  Mechanism chosen after an empirical probe of the pinned image (it works cleanly; `reasoning_format:
  none` was rejected — it leaks `<think></think>` into content).
- **Rust owns the policy, JS maps the transport (ADR-037):** the prompt builder returns
  `disable_reasoning:true`; `buildChatRequest` and `warmup()` both derive the transport from that
  single Rust flag, scoped to the on-host local runtime (hosted providers unchanged).
- **Prefix warm-up:** primes the real system-prompt prefix (reasoning disabled, 1 token) after
  `/health` is ready; `/health` reports `local_inference.warmed`.
- Compact M2.8B defaults kept (256 / 60 s / ≤3 / ≤2800; concurrency 1; queue 1; mandatory degraded
  fallback).

## Verification

10 Rust tests, 63 node tests (new: reasoning-disabled payload sent for local & not hosted; warm-up
primes the real prefix; reasoning-only empty content degrades safely; validator still blocks
`<think>`/certification). Guards: banzai-local-inference (incl. ADR-046 wiring, self-tested),
banzai-protocol-agent, rust-rule, purity (ADR→46), identity, public-surface, governance-docs,
private-key-leak, validate-compose — all green. Full CI on #94 green (73 checks). WASM rebuilt.

## Adversarial review (4 lenses)

3 low findings, all fixed: warm-up now reads the Rust `disable_reasoning` flag (single source of
truth); ADR-046 "See also" no longer dangles; guard ADR-range comment corrected.

## Re-benchmark (controlled, live VPS XL+ — not CI)

Deployed the M2.8C build (mock default — safe), started llama-local under its profile with the
digest-pinned image, benchmarked, then stopped it and returned to the safe state.

- **Cold** grounded answer: real, cited, 19.4 s, **not degraded** (M2.8B blocker resolved).
- **Warm** grounded answer: real, cited, 15.6 s.
- **5 distinct direct generations:** all `finish_reason=stop`, non-empty, **`reasoning_content=0`**,
  avg 6.3 s, ~12 tok/s.
- **No `<think>`/reasoning leak** anywhere; prompt-injection & off-topic → "insufficient sources";
  chain-of-thought *request* → normal answer, no reasoning exposed; certification question → correct
  non-certifying answer.
- **Stop llama.cpp → graceful degrade** (grounded, cited).
- `external_model_called=0`; **no public port**; website/verification-api/postgres unaffected during
  generation; **swap 0 B, no OOM, no service restarts**.

## Decision — Option A (activation pending approval)

Every named Option A criterion is met (real cold+warm content, cited, within timeout, no degradation
on normal questions, all security/resource criteria pass). Per ADR-046 §5 and the M2.8C phase rule,
**`local_qwen` is NOT activated**: `mock` stays the default and `BANZAI_BENCHMARK_APPROVED=false`.
Promotion requires **explicit maintainer approval** to set `LLM_PROVIDER=local_qwen` +
`BANZAI_BENCHMARK_APPROVED=true`.

Latency note (honest): LLM-backed novel answers take ~5–8 s (tight context) to ~13–19 s (full
2800-char context); deterministic/critical/cached answers are instant. All within the 60 s timeout.
Optional non-blocking follow-up (M2.8D): a 256→~384 `max_tokens` bump so the largest complex answers
finish without truncation (needs its own re-benchmark; does not change the gated default).

## Final safe state

VPS: `main@5d5d03f`; banzai-api mock/healthy; llama-local Exited; `benchmark_approved=false`;
`default_effective=false`; `external_model_called=false`; `warmed=null`; DNS/Cloudflare/TLS/Postgres
/secrets/trust-keys/protocol-state untouched.
