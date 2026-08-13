# BanzAI — the Native Protocol Agent

> BanzAI is the **native, non-authoritative AI agent of the BANZA protocol** (ADR-041) and the **primary
> human-operator interface** for interacting with the protocol (ADR-054). It interprets requests,
> consults the reference, guides operators, routes to the verifiable Rust/WASM engines, explains the
> rules and helps prepare evidence. It never becomes the rules, and it is not mandatory for
> machine-to-machine integration — APIs, manifests, schemas and endpoints stay verifiable without it.

- **Governing decision:** [ADR-041](../../decisions/adr/ADR-041-banzai-native-protocol-agent.md) (identity) · [ADR-049](../../decisions/adr/ADR-049-banzai-protocol-agent-core.md) (agent core)
- **Public interface:** a single route — `banza.network/banzai` (ADR-050) — served same-origin
- **Status:** implemented and deployed on the reference deployment; **pre-production**
- **Audience:** protocol maintainers + operators of the reference deployment (English is fine on this dev surface)

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

---

## 1. What BanzAI is

BanzAI is a guidance and orchestration agent. It:

- explains protocol rules, ADRs, RFCs, contracts and schemas **with citations** to local sources;
- prepares illustrative examples (operator manifest, evidence, trace);
- invokes the deterministic **Rust/WASM engines** (manifest validator, conformance L0, trust, SimB
  federation simulator, evidence bundle, trace verifier) that actually decide correctness;
- interprets their results, helps correct failures, and organises verifiable evidence;
- suggests the next step along the operator journey.

## 2. What BanzAI is NOT

BanzAI is **non-normative**. It does **not**:

- define, add or change protocol rules or architectural decisions;
- certify, approve, license, admit or accept an operator;
- decide federation, or perform Open Trust Evaluation on a counterparty's behalf;
- execute the authoritative conformance suite, or replace the BANZA Reference;
- hold production keys, move funds, or represent a financial service.

A `PASS` / `valid` from an engine is **verifiable technical evidence**, never approval, certification
or a licence. Humans maintain and evolve the protocol; they do not centrally authorise operators.

## 3. Deployed execution state (reference deployment)

| Property | Value |
|---|---|
| Public interface | `banza.network/banzai` — the single public route (no separate subdomain) |
| Backend call | same-origin `POST /banzai/ask` → internal `banzai-api` (nginx proxies that one path) |
| Default engine (effective) | `local_qwen` — on-host Qwen3-4B-GGUF via `llama.cpp` |
| Reasoning | disabled (no `<think>`; `enable_thinking=false`) |
| Max tokens / timeout | 384 / 60 s |
| Concurrency / queue | 1 / 1 |
| External model calls | **0** — `external_model_called=false`, no API key, nothing leaves the host |
| `llama.cpp` | internal only — no published host port |
| PostgreSQL | internal only — never exposed; not used for BanzAI sessions |

Local inference is **benchmark-gated in code** (ships off by default) and **activated on the reference
deployment** via the runtime `.env` (ADR-044/045, which carry the benchmark gate). See
[LOCAL_INFERENCE_RUNTIME.md](LOCAL_INFERENCE_RUNTIME.md) and
[LOCAL_INFERENCE_RUNBOOK.md](LOCAL_INFERENCE_RUNBOOK.md).

## 4. Rust controls everything that matters

TypeScript/JS is UI and I/O glue only. The **Rust/WASM engines** own retrieval, the compact prompt,
Qwen-first routing, injection defence, the post-response validator, the operator-journey state machine
and the safe upload scan (ADR-037). Qwen is only a **local language-generation layer** — it is never a
source of protocol truth.

## 5. Related docs

- [RESPONSE_PATHS.md](RESPONSE_PATHS.md) — routing + the per-answer execution paths
- [OPERATOR_JOURNEY.md](OPERATOR_JOURNEY.md) — the guided journey + session model
- [KNOWLEDGE_INDEX.md](KNOWLEDGE_INDEX.md) — the local knowledge / doc-index
- [SESSION_STATE.md](SESSION_STATE.md) — in-memory session + safe context to `/ask`
- [LOCAL_INFERENCE_RUNTIME.md](LOCAL_INFERENCE_RUNTIME.md) · [LOCAL_INFERENCE_RUNBOOK.md](LOCAL_INFERENCE_RUNBOOK.md)
