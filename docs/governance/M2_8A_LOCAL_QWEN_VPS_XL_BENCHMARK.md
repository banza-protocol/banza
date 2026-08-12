# M2.8A — Local Qwen Benchmark on the VPS XL+ (mandatory before effective default)

`local_qwen` (ADR-044) may become BanzAI's **effective default** in production **only**
after a real benchmark on the VPS XL+ profile passes every criterion below and a maintainer
sets `BANZAI_BENCHMARK_APPROVED=true` + `LLM_PROVIDER=local_qwen`. This document is the record
of that benchmark — it ends in one explicit decision (A/B/C/D).

## Result (2026-07-20)

> **Option B — Qwen3-4B-GGUF Q4_K_M works in preview but is NOT approved as the effective default.**
> The model runs correctly and safely on the VPS XL+ (≈18 tokens/s, ample RAM, no service impact,
> boundaries + degraded fallback all hold), but a *full* pipeline answer (large Rust system prompt +
> up to 400 generated tokens) exceeds the 45s timeout on a cold CPU generation, so it is not yet
> reliable enough as the always-on default. It remains opt-in/preview; `mock`/`degraded` stay default.

Post-benchmark the model was **stopped** (`llama-local` Exited 0), `LLM_PROVIDER` remains `mock`,
`BANZAI_BENCHMARK_APPROVED=false`. Production untouched (`/operators=[]`, `production_certificates=false`,
`external_model_called=false`, `llm_calls=0`).

## Pre-benchmark checklist (Part 0)

- [x] VPS XL+ confirmed: 8 vCore / 16 GB RAM / 480 GB NVMe / no GPU.
- [ ] VM snapshot taken — *not taken (IONOS panel = operator action); mitigated by the post-migration backup + full reversibility (stop llama-local + remove model).*
- [x] PostgreSQL backup present (`backups/postmig-20260719T205429Z`).
- [x] Container state recorded (5 healthy).
- [x] `/operators=[]`, `production_certificates=false` confirmed.
- [x] Provider `mock`, `llm_calls=0`, `external_model_called=false`.
- [x] GGUF installed manually (checksum verified) into `runtime/models/` (outside Git).

## Environment

| Field | Value |
|---|---|
| Date (UTC) | 2026-07-20 |
| VM / host | VPS XL+ (195.20.246.118) |
| CPU / RAM / disk | 8 vCore / 16 GB / 480 GB NVMe (no GPU) |
| Model / quant | Qwen3-4B-GGUF / Q4_K_M (official `Qwen/Qwen3-4B-GGUF`) |
| Model file / size | `Qwen3-4B-Q4_K_M.gguf` / 2,497,280,256 bytes |
| Model sha256 | `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5` |
| Runtime | llama.cpp (`ghcr.io/ggml-org/llama.cpp:server`), CPU, `-t 4`, n_ctx 4096, n_slots 4 |
| BanzAI limits | max output 512 (fast mode caps 400) · concurrency 1 · queue 1 · timeout 45s · temp 0.2 · top_p 0.8 |

## Measurements

| Metric | Value |
|---|---|
| RAM before llama.cpp | 1024 MB used |
| RAM after model load | 3367 MB used (llama-local 2.27 GiB; +~2.3 GB) |
| RAM during generation | ~3.48 GB used / 12.5 GiB free |
| CPU during generation | llama-local ~400% (4 threads); host load ~2.8 of 8 |
| Prompt + first-token overhead (small prompt) | ~1.9 s |
| Approx generation rate | **~18.4 tokens/s** |
| Est. 512-token answer (small prompt) | ~30 s |
| Full pipeline grounded answer (large system prompt, cold) | **timed out at 45 s → degraded** |
| 3 consecutive (64-token) | 4.6 s / 4.1 s / 4.0 s (stable, no degradation) |
| Timeout behaviour | 45s abort → deterministic grounded fallback ✓ |
| Queue/concurrency | app gate 1/1 (server-layer; unit-tested) |
| Stop llama.cpp → fallback | `degraded=true`, `local_inference_unavailable`, grounded answer, `external_model_called=0` ✓ |
| Website latency during generation | 200 in 0.19 s (no impact) |
| PostgreSQL / verification-api / website / banzai-api | all healthy; 0 benchmark-induced restarts |
| OOM / swap | none; swap 0 B throughout |
| Cloudflare 5xx | none |

## Security validation

- Prompt injection, chain-of-thought request, and no-source questions → `insufficient_sources`
  (retrieval gate → **no model call**). Certification-implying question → deterministic critical
  answer (no model call). The Rust prompt/injection-defence + post-response validator remained the
  control layer; `external_model_called` stayed **0** (nothing left the host).
- `llama-local`: no published host port (8080 closed from the internet), own isolated internal
  network (`banza-inference`, no route to Postgres), read-only, cap_drop ALL, no-new-privileges.

## Acceptance criteria

- [x] No OOM · [x] no constant swap · [x] website stays fast · [x] Postgres unaffected
- [x] banzai-api no timeout (production stayed mock) · [x] verification-api unaffected
- [x] 3 questions in a row succeed (short) · [x] fallback works when llama.cpp is stopped
- [x] queue/concurrency handled · [x] timeout handled (→ degraded) · [x] validator blocks unsafe claims
- [ ] **A full grounded answer completes within the timeout** — FAILED (cold full answer > 45 s)

## Decision

- **Option B — Qwen3-4B-GGUF Q4_K_M works in preview but is not approved as effective default.**

### Path to default-ready (re-benchmark required)
The only failing criterion is end-to-end latency of a *full* answer. It is tunable, not a model
defect: (a) lower `LLM_MAX_TOKENS` to ~256 (est. ~16 s), (b) trim the Rust system prompt to cut
prefill, and/or (c) raise `LLM_TIMEOUT_MS` (e.g. 90s) if a longer wait is acceptable. After tuning,
re-run this benchmark; if a full answer completes reliably within the timeout, set
`BANZAI_BENCHMARK_APPROVED=true` + `LLM_PROVIDER=local_qwen` (with explicit operator approval).
