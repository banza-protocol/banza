# banzai-api

BanzAI is the **native, non-authoritative** protocol agent. It guides operators, invokes the
verifiable engines, explains protocol rules, documents and evidence, and **cites its sources**.
It never defines rules, emits certificates, confers status on an operator, or substitutes the
conformance suite.
*BanzAI guides; the engines verify; the evidence proves. AI output is never a protocol rule.*

> **Canonical runtime (ADR-036).** This service **is** the canonical BanzAI runtime: a thin
> TypeScript service/glue layer (I/O and transport only) over the Rust engines (`engines/banzai-*`,
> compiled to WASM) that make every decision — routing, resolution, retrieval, grounding and
> validation — plus a single local-model synthesis at the explanatory tier (ADR-036). This monorepo is
> **the sole active BanzAI source (ADR-036)** — there is no separate BanzAI repository. This service is
> the canonical BanzAI runtime (TypeScript glue over the Rust engines); it is not the
> deterministic core, and not a source of truth. In the public pre-production state no external model
> is called (`external_model_called = false`).

BanzAI supports **real LLM inference** in two shapes, both selected by `LLM_PROVIDER`:
**hosted APIs** (`deepseek` | `qwen`, off-host) and **`local_qwen`** (ADR-036) — an
internal, sandboxed `llama.cpp` model on the Docker network (on-host CPU, no GPU, no
key, nothing leaves the host; `external_model_called` stays false). local_qwen is
benchmark-gated: never the effective default until the VPS XL+ benchmark approves it,
and the GGUF is installed manually (never bundled in this image, never in Git). The
deterministic `mock` provider remains the default and the reference for all
local/automated tests, which make **no** external calls.

## Cost-optimized pipeline — the LLM is the LAST resort
Every `/ask` flows through tiers; DeepSeek/Qwen are only reached at the end:

1. **Deterministic critical answers** — the protocol's identity/guardrail questions
   ("BANZA é operador?", "BanzAI pode emitir certificado?", "PASS é certificado?",
   "/operators vazio?", "root keys?", "BANZA processa pagamentos?", "operadores
   certificados?", "limites do BANZA?") are answered from fixtures, **never** by a model.
2. **Exact cache** — normalized question + provider + lang + mode + corpus hash.
3. **Semantic cache** — near-duplicate questions via cosine similarity (deterministic
   lexical vectors in-process; the pgvector table `banzai_answer_cache` is the durable
   store activated on the VM with the real embedding indexer).
4. **Budget gate** — daily/monthly USD ceilings on estimated spend. Past budget BanzAI
   answers only from deterministic entries and caches; it **never** calls the LLM.
5. **Limited RAG + LLM** — few chunks (`LLM_MAX_CHUNKS`), char-capped context, per-mode
   token caps (`fast` default, `deep` opt-in per request).
6. **Post-validation** — a completion that claims to certify/decide or leaks key-like
   material is replaced by the deterministic grounded answer and never cached.

Ungrounded questions short-circuit before all of this: "insufficient sources", no LLM.
Each `/ask` emits a safe usage log (provider, cache hit/miss, estimated tokens/cost,
fallback reason — never keys, secrets or full payloads), and `/health.usage` exposes
budget + cache counters. `/ask` is rate-limited per client (`429 rate_limited`).

## Routes
| Route | Purpose |
|---|---|
| `GET /health` | Liveness + guardrails; `external_model_called` reflects real usage (always `false` in mock) |
| `POST /ask` | `{ "question": "..." }` → grounded answer + cited `sources` (or "insufficient sources") |
| `GET /sources` | The citable source corpus (fixtures) + known topics |
| `POST /index` | Indexer **dry-run**: reports what *would* be indexed; computes no embeddings |
| `POST /validate/step` | `{ operator_id, implementation_id, step }` → a §30 `OperationReceipt` (browser calls it same-origin at `/banzai/validate/step`) |
| `POST /validate/journey` | `{ operator_id, implementation_id }` → a §31 `JourneyReceipt` (browser: `/banzai/validate/journey`) |

### Endpoint-originated validation (ADR-034)
The validation routes run BanzAI's **official** operator-validation journey: validating an operator means
evaluating one of its **published implementations** (operator = responsible entity; implementation =
system evaluated). `validate.js` resolves the target from the **closed Technical Registry** in Rust
(`banza-target-registry`: `operator_id → implementation_id → canonical_origin → discovery`), fetches
**every artifact from the implementation's public endpoints** via the secure Rust fetcher
(`fetcherClient.js` → `engines/banza-artifact-fetcher`, never the browser, never a user-supplied URL),
runs the matching no-network Rust/WASM decision engine on the fetched content, and binds each verdict to
its exact public origin in a receipt (`qwen_calls=0`, `external_model_calls=0`, `protocol_fetch_count`
tracked). **Rust decides; TypeScript never decides.** Certification Readiness is `READY`/`BLOCKED` and
never `CERTIFIED`. Upload/paste is a local, non-authoritative **draft** tool only. See ADR-034 (§19 for the
SSRF policy) and the BANZA Reference (chapters 7–9 & 12).

## Guardrails (always enforced — mock and real alike)
`authoritative: false`, `can_certify: false`, `decides: false`,
`substitutes_conformance_suite: false`. Real calls carry a rigid system prompt:
BANZA is a protocol not an operator; BanzAI guides and explains, never decides or
certifies; PASS is verifiable evidence, not a certificate; an empty `/operators`
means no operator has published evidence; root/private keys never live on the serving VM; if the
approved context is insufficient, say so — never invent operators, certificates,
dates or production states. The model only ever receives approved doc excerpts —
never secrets, `.env`, dumps, logs or keys.

## LLM_PROVIDER allowlist
Only four values are accepted. **Anything else refuses to start** with an explicit
error (`PROVIDER_NOT_ALLOWED`) — OpenAI, Claude, gpt-oss, local-gpu and any generic
provider are rejected by design.

| Value | Behaviour |
|---|---|
| `mock` (default) | Deterministic offline answers from fixtures — the reference for tests. No key, no network. |
| `deepseek` | Real answers via the hosted DeepSeek chat API (OpenAI-compatible), off-host. |
| `qwen` | Real answers via the hosted Qwen (DashScope compatible-mode) chat API, off-host. |
| `local_qwen` | Real answers via an INTERNAL `llama.cpp` OpenAI-compatible endpoint (ADR-036): on-host CPU, no key, no GPU, nothing leaves the host. Benchmark-gated; never the effective default until the VPS XL+ benchmark approves it. See `docs/banzai/LOCAL_INFERENCE_RUNTIME.md`. |

Real adapters **fail safe**: with no `LLM_API_KEY` in the environment, `/ask`
returns JSON `503 llm_key_missing` **without any network I/O**. Upstream errors and
timeouts return `502 llm_upstream_error` — BanzAI degrades gracefully, never
fabricates. Ungrounded questions are answered locally ("insufficient sources")
and are **never** sent to the external model.

## Configuration (environment only — no hardcoded secrets)
| Variable | Default | Meaning |
|---|---|---|
| `LLM_PROVIDER` | `mock` | `mock` \| `deepseek` \| `qwen` |
| `LLM_API_KEY` | — | Required for real providers. Lives only in the VM's `.env` (600), never in Git or logs |
| `LLM_MODEL` | per provider | Chat model name (e.g. the provider's default chat model) |
| `LLM_API_BASE` | per provider | Provider public API base URL |
| `LLM_TIMEOUT_MS` | `30000` | Request timeout |
| `LLM_MAX_TOKENS` | `800` | Completion cap (`deep`); `fast` mode caps at min(this, 400) |
| `LLM_TEMPERATURE` | `0.2` | Sampling temperature |
| `BANZAI_ANSWER_MODE` | `fast` | Default answer mode (`fast` \| `deep`; per-request override via `{"mode":"deep"}`) |
| `LLM_MAX_CHUNKS` | `3` | Max retrieved excerpts per LLM call (`fast` uses at most 2) |
| `LLM_MAX_CONTEXT_CHARS` | `6000` | Hard cap on context characters |
| `LLM_DAILY_BUDGET_USD` / `LLM_MONTHLY_BUDGET_USD` | `1.00` / `15.00` | Spend ceilings — past them, no LLM calls |
| `LLM_COST_PER_1K_TOKENS_USD` | `0.0005` | Blended rate used for spend estimates |
| `BANZAI_CACHE_MAX_ENTRIES` / `BANZAI_CACHE_TTL_MS` | `500` / `86400000` | Answer cache size/TTL (corpus changes also invalidate) |
| `BANZAI_SEMANTIC_THRESHOLD` | `0.92` | Cosine similarity required for a semantic hit |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `60` / `60000` | Per-client `/ask` cap per window |
| `BANZAI_TRUST_PROXY` | unset | `1` = rate-limit by first `X-Forwarded-For` hop (set behind nginx) |

## Run & test
```bash
LLM_PROVIDER=mock node src/server.js
curl -s localhost:8091/health
curl -s -XPOST localhost:8091/ask -d '{"question":"O que é BANZA?"}'

npm test        # node --test: allowlist, safe failures, payload construction — all offline
```
Local validation: `infra/banza-network/tests/smoke-banzai-api.sh` and
`e2e-full-stack.sh` (both mock-only; they assert no external model is called).
Real-provider validation is **manual and opt-in only**:
`RUN_REAL_LLM_TEST=1` + `LLM_PROVIDER=deepseek|qwen` + `LLM_API_KEY` →
`infra/banza-network/tests/smoke-banzai-real-llm.sh` (otherwise it prints `SKIPPED`).
