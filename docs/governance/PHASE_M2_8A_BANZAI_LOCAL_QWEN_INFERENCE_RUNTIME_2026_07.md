# Phase M2.8A — BanzAI Local Qwen Inference Runtime

- **Date:** 2026-07-19
- **Branch:** `feat/m2-8a-banzai-local-qwen-inference-runtime-2026-07`
- **Deploy:** banzai-api (rebuild) + compose update (llama-local profile defined but NOT started). Website prose unchanged — local inference is NOT presented as active (benchmark not approved); it stays documentation-only per ADR-044 (`docs/banzai/`). No DNS/TLS/Cloudflare/secrets change.

## Problem observed

BanzAI's only paths to fluent natural-language answers were a deterministic `mock` or a
**hosted** API (`deepseek`/`qwen`) — an external dependency with data egress, a vendor key
on the VM, and per-token cost. There was no way to run a language layer entirely on-host.
M2.8A adds one, without eroding any boundary: BanzAI stays the native, non-authoritative
protocol agent; the model is only a local language layer; Rust keeps control.

## Decisions

- **`local_qwen` provider** — an internal, OpenAI-compatible `llama.cpp` endpoint on the
  Docker network (ADR-044). Keyless; `external_model_called` stays `false`; the USD budget
  is bypassed (free on-host). Qwen3-4B-GGUF Q4_K_M is the intended model.
- **Rust owns the control logic** (ADR-037): `engines/banzai-api-kb` gains `prompt.rs`
  (system rules + source-boundary injection defence) and `validate.rs` (post-response
  validator blocking forbidden claims / prompt / chain-of-thought / key-material leaks),
  exported to WASM as `build_prompt_json` / `validate_response_json`. The JS service is glue.
- **Benchmark-gated default** — `local_qwen` is opt-in/preview until a real VPS XL+
  benchmark approves it and `BANZAI_BENCHMARK_APPROVED=true`; `mock`/`degraded` stay the
  default and fallback. Local model unavailable/timeout/empty/invalid or a validator block
  degrades to the deterministic grounded answer (never a 5xx, never a fabrication).
- **Sandboxed service** — `llama-local` compose service: profile-gated (off by default),
  internal-only (no published ports), read-only, `cap_drop: ALL`, `no-new-privileges`,
  bounded CPU/memory, model bind-mounted read-only from a git-ignored volume; GGUF installed
  manually, never downloaded at build/deploy, never in Git.
- **Concurrency** — a bounded gate (concurrency 1, queue 1) protects the single-threaded
  CPU path; excess `/ask` fails fast and safe (`503 busy`).

## Guards

- **New** `make banzai-local-inference-check` (`tools/check-banzai-local-inference.sh`,
  self-testing, CI job in `identity-guard.yml`): blocks GGUF in Git, committed external
  keys, a public llama.cpp port, an un-gated default, and enforces mock default + Rust
  control + non-normative docs.
- **validate-compose.sh** extended: asserts `llama-local` is profile-gated, publishes no
  host port, is internal-only, runs read-only and mounts the model read-only.
- **Purity ADR range** (`engines/banza-repo-guards`) bumped `1..=43` → `1..=44` for ADR-044;
  release binary rebuilt.
- **rust-rule-check / banzai-protocol-agent-check / public-surface-clean-check /
  postgres-data-boundary-check / identity-check** — unchanged and green (the JS llama.cpp
  client is pure I/O glue; the control logic is Rust; no retired framing introduced).

## Tests / build / E2E

- Rust `banzai-api-kb`: `cargo fmt` + `cargo clippy --all-targets -D warnings` clean;
  `cargo test` green (retrieval parity + validator + prompt/injection tests); WASM rebuilt
  with `wasm-pack --target nodejs` (baseline reproducibility verified) and smoke-tested in Node.
- banzai-api: `node --test` green — provider allowlist (+`local_qwen` keyless, endpoint,
  external-call-count 0), pipeline (local degraded fallback, budget bypass, Rust validation),
  concurrency gate (limit + queue + fail-fast), health/prompt content.
- Compose: `validate-compose.sh` all green including the new llama-local assertions.

## Services touched / untouched

- **Touched:** `engines/banzai-api-kb` (+ vendored WASM), `services/banzai-api/src/*`,
  `infra/banza-network/compose.yml` + `.env.example`, `.gitignore`, guards, docs
  (`docs/banzai/*`, ADR-044, benchmark record). Website prose unchanged.
- **Untouched:** postgres / verification-api / reverse-proxy / DNS / TLS / Cloudflare /
  secrets. `/operators=[]`, `production_certificates=false`, provider `mock`, `llm_calls=0`,
  `external_model_called=false`. Qwen NOT activated; `llama-local` profile NOT started.

## Mandatory negative confirmations

- ❌ No GGUF entered Git; no model downloaded during build/deploy.
- ❌ No external AI provider added; no OpenAI/Groq/Together/DeepSeek/Anthropic key required or committed.
- ❌ `llama.cpp` is not exposed publicly (internal-only, no host port); the model has no shell/filesystem/network/Postgres/tools/secrets access.
- ❌ Qwen is not normative; it does not decide, govern, approve, certify or license. BanzAI remains the native protocol agent; mock/degraded preserved.
- ❌ No operator activated; no federation; no production evidence; no Postgres runtime-data change.
- ❌ Local inference NOT declared effective default — benchmark on the VPS XL+ not yet executed (Option D); `BANZAI_BENCHMARK_APPROVED=false`.
