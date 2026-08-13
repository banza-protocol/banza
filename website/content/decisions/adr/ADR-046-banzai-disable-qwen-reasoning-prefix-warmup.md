# ADR-046 — BanzAI: Disable Qwen Reasoning & Warm the System-Prompt Prefix

- **Status:** Accepted
- **Date:** 2026-07

## 1. Context

returned **Option B**. Root cause: **Qwen3-4B is a reasoning model.** On cold or complex prompts it
spends the entire compact 256-token completion budget inside its `<think>` block (returned by
llama.cpp as `reasoning_content`) and emits **empty final `content`** (`finish_reason=length`,
`content=0`, `reasoning_content≈1200`). `provider.answer` then sees an empty completion, and the
pipeline degrades to the deterministic grounded answer. Even warm answers paid a full 256-token
reasoning preamble (~22–25 s).

BanzAI is a **grounded, non-normative agent**: it answers from the retrieved sources in 3–6
sentences. It has no use for a model reasoning mode — and the post-response validator (`validate.rs`)
already **blocks `<think>` / chain-of-thought leakage** on principle. So reasoning mode is both a
latency/correctness liability and a boundary risk.

## 2. Decision

1. **Disable Qwen3 reasoning for BanzAI.** The mechanism, verified empirically against the pinned
   llama.cpp image, is `chat_template_kwargs: { enable_thinking: false }` on the chat-completions
   request. (`reasoning_format: none` was rejected — it leaks an empty `<think></think>` into
   `content`.) With reasoning off, normal grounded answers finish early (`finish_reason=stop`) with
   real content and no `reasoning_content`.

2. **Rust owns the policy; JS maps the transport (ADR-037).** The Rust prompt builder declares
   `disable_reasoning: true` in its `{system, user, disable_reasoning}` contract — this is prompt
   *policy*. The JS I/O glue (`buildChatRequest`) maps it to the runtime's transport field, scoped to
   the on-host local runtime (`declaredLocal`) so hosted providers' request shape is unchanged.

3. **Warm the system-prompt prefix.** After llama.cpp reports healthy, the best-effort start-up
   warm-up primes the **real compact system prompt** (from Rust) with reasoning disabled and a 1-token
   completion, so the first real answer reuses the cached KV prefix and skips the cold system-prompt
   prefill. No user data, no real documents; failure never blocks production. `/health` reports
   `local_inference.warmed` (`null` = not attempted, `true` = primed, `false` = never became ready).

4. **Keep the M2.8B compact defaults:** max output 256, timeout 60 s, ≤3 sources, compact prompt,
   concurrency 1, queue 1, mandatory degraded fallback. Empty content (should it ever occur) still
   degrades safely — never served, never an error to the client.

## 3. Boundaries (unchanged)

- `mock` stays the effective default; `local_qwen` remains **benchmark-gated**
  (`BANZAI_BENCHMARK_APPROVED=false`) and is **not** activated by this ADR.
- BanzAI stays non-normative; Qwen is only the local language layer. Rust remains responsible for
  retrieval, prompt construction, validation, limits and fallback.
- No external AI provider; no public llama.cpp port; no GGUF in Git; no DNS/Cloudflare/Postgres/secret
  changes.

## 4. Consequences

- Normal grounded answers return real content well within the timeout; the reasoning-budget
  exhaustion that caused M2.8B's cold/complex degradation no longer occurs for grounded prompts.
- Latency drops substantially because the model stops when the answer is done instead of generating a
  reasoning preamble.
- The change is local-scoped; hosted providers are untouched.

## 5. Activation gate (unchanged)

Promotion of `local_qwen` to the effective default still requires a **new controlled VPS XL+
re-benchmark returning Option A** *and* **explicit maintainer approval** before setting
`LLM_PROVIDER=local_qwen` + `BANZAI_BENCHMARK_APPROVED=true`. Result recorded in
