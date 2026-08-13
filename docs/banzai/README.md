# BanzAI — Technical Documentation

> **BanzAI is the native, non-authoritative AI agent of the BANZA protocol** (ADR-041). It guides
> operators, invokes the deterministic Rust/WASM engines, explains the rules with citations and helps
> prepare verifiable evidence — it never becomes the rules.

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

This directory is an internal/dev documentation surface (English is fine here). The public,
operator-facing reference lives in the BANZA Reference, chapter 12 —
[`/referencia/banzai`](../../website/content/BANZA_REFERENCIA.md).

## Current deployed state (reference deployment)

- `banza.network/banzai` is the **single public interface**; the browser calls same-origin
  `POST /banzai/ask` → internal `banzai-api`.
- Default engine (effective): **`local_qwen`** — on-host Qwen3-4B-GGUF via `llama.cpp`; reasoning
  disabled; 384 tokens; 60 s timeout; concurrency/queue 1.
- **External model calls = 0** (`external_model_called=false`); no API key; nothing leaves the host.
- `llama.cpp` and PostgreSQL are internal only — never exposed.
- Rust/WASM owns retrieval, routing, the prompt, validation, the journey state machine and the upload
  scan. Qwen is only a local language layer — **non-normative**.
- **Official validation is endpoint-originated (ADR-068).** The nine-step journey validates a published
  **implementation** of an **operator** (operator = responsible entity; implementation = system
  evaluated). The target is resolved from the closed Technical Registry
  (`operator_id → implementation_id → canonical_origin → discovery`) and every artifact is fetched from
  the implementation's public endpoints by the secure Rust fetcher (`engines/banza-artifact-fetcher`) —
  never the browser, never a user-supplied URL. The browser calls same-origin
  `POST /banzai/validate/step` and `POST /banzai/validate/journey`; each verdict is bound to the exact
  origin of its inputs in an `OperationReceipt`/`JourneyReceipt` (`qwen_calls=0`,
  `external_model_calls=0`, `protocol_fetch_count` tracked). Upload/paste is a local, non-authoritative
  **draft** tool only. See [OPERATOR_JOURNEY.md](OPERATOR_JOURNEY.md) and
  ADR-068 (§19 for the SSRF policy), which `engines/banza-artifact-fetcher` implements.
- Public state is **pre-production**: `/operators=[]`, `production_certificates=false`.

## Documents

| Doc | Scope |
|---|---|
| [BANZAI_PROTOCOL_AGENT.md](BANZAI_PROTOCOL_AGENT.md) | Identity, unified interface, deployed state, boundary |
| [RESPONSE_PATHS.md](RESPONSE_PATHS.md) | Qwen-first routing + the per-answer execution paths |
| [OPERATOR_JOURNEY.md](OPERATOR_JOURNEY.md) | The guided journey + the Rust/WASM state machine |
| [SESSION_STATE.md](SESSION_STATE.md) | In-memory session + the safe context sent to `/ask` |
| [KNOWLEDGE_INDEX.md](KNOWLEDGE_INDEX.md) | Local knowledge, documentary index, conversational context |
| [LOCAL_INFERENCE_RUNTIME.md](LOCAL_INFERENCE_RUNTIME.md) | The local Qwen runtime (architecture) |
| [LOCAL_INFERENCE_RUNBOOK.md](LOCAL_INFERENCE_RUNBOOK.md) | Operating the local runtime (enable/verify/roll back) |
| [LOCAL_QWEN_MODEL_SETUP.md](LOCAL_QWEN_MODEL_SETUP.md) | Installing the GGUF (kept out of Git) |

## Governing decisions

ADR-041 (native protocol agent) · ADR-044 (local Qwen runtime + benchmark gate) · ADR-045 (latency
tuning) · ADR-046 (reasoning disabled + warm-up) · ADR-047 (384-token default) · ADR-048 (Qwen-first
routing) · ADR-049 (protocol-agent core, journey, session) · ADR-050 (unified `/banzai` interface) ·
ADR-051 (per-answer execution metadata) · ADR-067 (Operador Zero read-only reference + nine-step
validation journey) · ADR-068 (endpoint-originated operator validation + operator/implementation model).
