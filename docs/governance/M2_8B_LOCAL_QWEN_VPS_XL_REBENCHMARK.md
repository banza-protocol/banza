# M2.8B — Local Qwen VPS XL+ Re-benchmark (ADR-045)

**Status:** completed · **Decision: Option B** (local_qwen NOT promoted to effective default)
**Date:** 2026-07-20 · **Supersedes for the default gate:** [`M2_8A_LOCAL_QWEN_VPS_XL_BENCHMARK.md`](./M2_8A_LOCAL_QWEN_VPS_XL_BENCHMARK.md) (the pre-tuning baseline)

This is the mandatory re-benchmark that ADR-045 requires before `local_qwen` may be
considered for the effective default. It was run as a **controlled operational benchmark
on the live VPS XL+** (not in CI). The gate stays **closed**: `LLM_PROVIDER=mock`,
`BANZAI_BENCHMARK_APPROVED=false`, `default_effective=false`. Nothing was activated.

---

## 1. Environment

| Item | Value |
|---|---|
| Host | VPS XL+ (`195.20.246.118`), 15 GiB RAM, 8 GiB swap, 448 GB free disk |
| Runtime | llama.cpp `ghcr.io/ggml-org/llama.cpp@sha256:b832a7b7…` (digest-pinned, ADR-045 FIX-6), CPU, `-t 4`, `n_ctx 4096`, `n_slots 4` (`n_ctx_slot 4096`) |
| Model | Qwen3-4B-Q4_K_M.gguf (2,497,280,256 bytes; sha256 `7485fe6f…8534fdf5`), mounted read-only |
| Build | banzai-api on `main@97e1a25` (compact prompt 1046 chars; local defaults 256 tokens / 60 000 ms; tighter packing ≤3 excerpts / ≤2800 chars; `/health`-gated warm-up) |
| Isolation | llama-local internal-only (no host port), on `banza-inference` only; keyless |
| Method | in-process pipeline (real retrieval → Rust compact prompt → llama.cpp → Rust validator) + direct consecutive generations, run inside the banzai-api container |

## 2. Results

**Full pipeline answers (Part A):**

| Case | Wall time | Outcome | Sources |
|---|---|---|---|
| cold (first, no warm prefix) | 38.1 s | **degraded** — empty completion → deterministic grounded fallback | 3 |
| warm | 25.6 s | real grounded answer, cited | 2 |
| warm (2) | 22.6 s | real grounded answer, cited | 3 |

**Five consecutive full generations (Part B, 256 tokens each):** 19.9 / 19.7 / 19.1 / 19.0 / 19.0 s
→ **avg 19.3 s, ~13.2 tokens/s**, all 256 tokens, stable, no drift.

**llama.cpp internal timing:**
- Cold prefill (no KV prefix cache): ~636–649 tokens at ~35 t/s ≈ **18 s** just to ingest the prompt.
- Warm prefill (system-prompt prefix reused via LCP cache): ~24 tokens ≈ **0.8 s**.
- Generation: **~12.3 t/s cold, ~14.1 t/s warm** (CPU-bound; independent of prompt length).

**Boundary / resource telemetry:**
- `external_model_called = 0` (nothing left the host) — invariant held.
- Peak llama-local memory **2.3–2.6 GiB** of the 7 GiB cap; **swap stayed 0 B**; no OOM (`dmesg` clean).
- No host port published for llama-local; PostgreSQL never exposed; all 5 services stayed healthy throughout.
- Rust post-response validator active on every completion; degraded fallback returned a grounded, cited answer (never an error, never an invented one).

## 3. Root cause of the cold/complex degradation

The cold and complex-question degradation is **not a timeout** (resolved local timeout was
60 000 ms; the request finished at ~38–42 s). The raw llama.cpp response for a complex
prompt at the compact 256-token cap was:

```
finish_reason = "length"
content_len   = 0          ← empty final answer
reasoning_len = 1233       ← all 256 tokens spent inside <think> reasoning
completion_tokens = 256
```

**Qwen3-4B is a reasoning model.** On a non-trivial prompt it consumes the entire compact
256-token budget inside its `<think>` reasoning block (returned by llama.cpp as
`reasoning_content`) and never emits final-answer `content`. `provider.answer` reads
`message.content` (empty) → `LLM_UPSTREAM_ERROR: empty completion` → the pipeline degrades
gracefully to the deterministic grounded answer. Simple questions finish reasoning within
256 tokens and answer normally; complex ones do not.

This is the M2.8B compact-output tuning (256 tokens) interacting with the model's reasoning
mode — a real correctness/latency issue, surfaced precisely because the re-benchmark was run
honestly rather than by raising the timeout and declaring success.

## 4. Decision — Option B (not default-ready)

`local_qwen` **works** for warm, simple questions (~22–25 s, grounded, cited, validator
active, graceful degrade, 5-consecutive stable, no OOM/swap, no public port, zero external
calls) and is materially better than the M2.8A baseline (which timed out at 45 s cold). But
it does **not** meet the Option A default-readiness bar:

- **Cold/complex queries degrade** (empty `content` from reasoning-mode budget exhaustion).
- **Warm latency ~22–25 s** per answer is too high for a good default UX at the ~13–14 t/s
  CPU generation ceiling.

Therefore: **`mock` stays the effective default; `local_qwen` stays preview/opt-in.**
`BANZAI_BENCHMARK_APPROVED` remains `false`. Per ADR-045 §8 and the phase constraints, the
default is **not** activated and no timeout was raised to mask latency.

## 5. Recommendation → M2.8C (separate phase, its own benchmark + review)

1. **Disable Qwen3 reasoning for BanzAI** (`enable_thinking: false` via chat-template kwargs,
   or `/no_think`). BanzAI is a grounded, non-normative agent that answers in 3–6 sentences;
   it must **not** reason, and the post-response validator already **blocks `<think>` leakage**.
   Disabling reasoning should (a) eliminate the empty-`content` degradation, (b) sharply cut
   latency (no multi-hundred-token reasoning preamble before the answer), and (c) align with
   the no-chain-of-thought boundary.
2. **Warm the system-prompt prefix** in start-up warm-up (prime with the real system prompt so
   the first real request reuses the KV prefix and skips the ~18 s cold prefill).
3. Re-benchmark after (1)+(2); only then reconsider Option A — and even then, **stop and
   request explicit maintainer approval** before flipping the default (ADR-045 §7).

## 6. Provenance

Controlled run on the live VPS XL+; llama-local started under its compose profile with the
digest-pinned image, benchmarked, then **stopped** (returned to the safe state: mock default,
llama-local Exited, gate closed). No DNS/Cloudflare/PostgreSQL exposure changes were made.
