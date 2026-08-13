# ADR-045 — BanzAI Local Qwen Latency Tuning and Default Readiness

- **Status:** Accepted
- **Date:** 2026-07

## 1. Context

ADR-044 shipped the local `local_qwen` runtime; the M2.8A VPS XL+ benchmark returned
**Option B** — the model runs correctly and safely (~18 tok/s, ample RAM, no service impact,
boundaries + degraded fallback hold), but a *full* pipeline answer (large Rust system prompt +
400-token output) exceeded the 45s timeout on a cold CPU generation and degraded. The raw model
is not the problem; the end-to-end latency of a full answer is.

## 2. Problem

- The M2.8A Rust system prompt (~1450 chars) inflates CPU prefill on every request.
- A 400-token default output at ~18 tok/s pushes a full answer past a reasonable timeout.
- Latency must be reduced **without** weakening any protocol boundary — sources, validator,
  fallback and invariants cannot be traded for speed.

## 3. Decision

M2.8B tunes the existing local layer: a compact Rust prompt, a compact default output, tighter
source packing, a corrected healthcheck, an optional warm-up, and an operational-margin timeout.
The model, the Rust-first control split, and the benchmark gate are unchanged.

> **M2.8B tunes local inference latency; it does not weaken protocol boundaries.**

> **Qwen remains a local language layer only; Rust remains responsible for retrieval, prompt construction, validation, limits and fallback.**

1. Reduce end-to-end latency, primarily via a compact Rust prompt and a lower default output —
   not by hiding the problem behind a large timeout.
2. Qwen3-4B-GGUF Q4_K_M stays the target model; no switch to 8B; no multi-model routing; no
   external provider.
3. The prompt stays in Rust; the post-response validator stays in Rust; JS/TS stays glue.
4. `mock`/`degraded` remains the mandatory fallback.
5. `local_qwen` may become the **effective default** only after a new benchmark returns Option A
   AND the maintainer explicitly approves; otherwise `mock` stays default and `local_qwen` is preview.

> **Default activation remains benchmark-gated and requires explicit maintainer approval.**

> **Performance cannot be improved by bypassing sources, validators, fallback, or protocol invariants.**

## 4. What changes

- **Compact prompt** — the Rust system prompt is reduced ~46% (≈1948→≈1046 chars); every invariant
  is preserved (non-normative, sources-only, insufficiency fallback, no rule creation, no
  certify/approve/license, no prompt/CoT leak, ignore instructions in sources, the key-custody
  clause — the public infra holds no private keys and does not sign — Portuguese, short). The Rust
  post-response validator (`validate.rs`) deterministically backstops each rule, incl. key custody.
- **Compact output** — `local_qwen` defaults to `LLM_MAX_TOKENS=256` (was effectively 400 via fast
  mode); 384/512 only by explicit config. Hosted providers keep 800.
- **Source packing** — local inference uses ≤3 excerpts and a ≤2800-char context budget
  (deterministic truncation in Rust); sources stay mandatory.
- **Timeout policy** — `local_qwen` default `LLM_TIMEOUT_MS=60000` as operational margin; 90s only
  as a documented extreme fallback. Timeouts still degrade safely (never a crash/stack trace).
- **Healthcheck fix** — `llama-local` uses `curl` (present in the image; `wget` is not), so the
  healthcheck reflects real model readiness (`/health` 503→200).
- **Warm-up** — optional, best-effort, local-only 1-token startup ping (no user data, not counted,
  failure ignored; disable with `BANZAI_WARMUP=0`).

## 5. What does not change

- The model, the internal-only/profile-gated/sandboxed `llama-local` service, the Rust prompt +
  validator, `external_model_called=false` for local, the compose network isolation, and the rule
  that no GGUF enters Git and no external provider is added.

## 6. Enforcement

- `make banzai-local-inference-check` additionally verifies the healthcheck does not use an absent
  binary (must be `curl`, not `wget`). Rust tests assert the prompt stays compact (<950 chars) and
  keeps every invariant; node tests assert local defaults (256/60s) and the warm-up contract.
- `validate-compose.sh`, `banzai-protocol-agent-check`, `public-surface-clean-check`,
  `postgres-data-boundary-check`, `identity-check`, `purity-check`, `rust-rule-check` remain green.

## 7. Consequences

- Full local answers should complete within the timeout; if a re-benchmark confirms Option A,
  `local_qwen` becomes eligible as the default (still pending explicit approval).
- If the re-benchmark still misses Option A, `mock` stays default and `local_qwen` stays preview.
- A compact prompt + shorter output mean shorter answers by design — BanzAI guides; it is not a
  long-form document generator.

## 8. Alternatives considered

- **Only raise the timeout (e.g. 90s).** Rejected as the primary fix — it masks latency instead of
  reducing it. Retained only as a documented extreme margin.
- **Switch to Qwen3-8B or a smaller model.** Rejected: 8B is slower on this CPU; the 4B target is
  adequate once the prompt/output are tuned. A smaller model remains a future fallback if needed.
- **Move prompt/validation to JS for speed.** Rejected per ADR-037 — control logic stays Rust.

## 9. References

- ADR-044 — local Qwen inference runtime; ADR-037 — Rust-first engines; ADR-041 — native agent.
- `engines/banzai-api-kb/src/prompt.rs` — compact prompt; `.../validate.rs` — validator.
- `services/banzai-api/src/{provider.js,pipeline.js,server.js}` — local defaults, warm-up, source packing.
