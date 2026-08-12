# ADR-051 — BanzAI: Per-Answer Execution-Path Metadata

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-044 (local Qwen runtime), ADR-048 (Qwen-first grounded routing & deterministic fallback), `services/banzai-api`, `website/components/home/banzaiKb.ts`. Shipped in M2.8F.

## 1. Context

With multiple answer paths (local Qwen, deterministic, cache, insufficient, degraded fallback,
post-validation replacement), a single global "Qwen local por omissão" badge cannot tell a user how a
**specific** answer was produced. Conflating them would over-state per-answer state (e.g. labelling a
cache hit or a deterministic answer as a live model generation).

## 2. Decision

Every `/banzai/ask` response carries **safe per-answer telemetry** (no prompt, no reasoning, no keys,
no bodies) that resolves to one honest status label shown next to the answer:

`Gerado por Qwen local` · `Resposta determinística` · `Resposta em cache (Qwen local)` ·
`Evidência insuficiente` · `Fallback seguro` · `resposta do modelo substituída pela validação`.

`local_model_called` is gated on the **this-answer** signal (`meta.llm_called`), never on a stored
cache object; `external_model_called` stays `false` and `llm_calls` counts external/billable calls only
(always 0 on the local path).

## 3. Consequences

- The per-answer label is the source of truth for that answer; the standing badge never stands in for it.
- A cache hit is never mislabelled as a live generation.
- Full behaviour is documented in [`docs/banzai/RESPONSE_PATHS.md`](../../docs/banzai/RESPONSE_PATHS.md).

> **BanzAI guia; os motores verificam; a evidência prova.**
