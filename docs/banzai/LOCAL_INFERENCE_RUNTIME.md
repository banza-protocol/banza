# BanzAI Local Inference Runtime

> Conceptual and architecture reference for BanzAI's optional **local** language layer — Qwen3-4B-GGUF executed on-host by `llama.cpp`, controlled by Rust, with nothing leaving the machine. Governed by **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)**, with latency tuning under **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)**.

- **Milestone:** M2.8A (runtime) · M2.8B (latency tuning, ADR-036)
- **Status:** Accepted (ADR-036, ADR-036); local inference is opt-in and benchmark-gated
- **Audience:** protocol maintainers and operators of the reference deployment (`docs/banzai/` is an internal/dev surface; English is acceptable here)
- **Sibling docs:** `docs/banzai/LOCAL_QWEN_MODEL_SETUP.md` (install the GGUF), `docs/banzai/LOCAL_INFERENCE_RUNBOOK.md` (operations), `docs/governance/M2_8A_LOCAL_QWEN_VPS_XL_BENCHMARK.md` (the mandatory benchmark record)

---

## 1. What this is (and is not)

The local inference runtime lets BanzAI generate natural-language answers **on-host**, with **no external provider**, **no API key**, and **nothing leaving the machine**. It adds a fourth language-layer option (`local_qwen`) alongside the deterministic `mock`, the runtime `degraded` fallback, and the pre-existing hosted providers.

It does **not** change what BanzAI *is*, what it may do, or where the protocol's authority lives.

> **BanzAI is the native, non-authoritative protocol agent.**
> **BanzAI é o agente IA nativo do protocolo BANZA.**

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

**This runtime IS:**

- A local, CPU-only language generation layer for BanzAI's guidance answers.
- A sandboxed, internal-only `llama.cpp` server that Rust drives through an approved context.
- An opt-in, benchmark-gated capability that defaults to off.

**This runtime is NOT:**

- Not a source of protocol truth. The model never becomes normative.
- Not a decision-maker, certifier, approver, licensor, or governor of protocol rules.
- Not internet-exposed, and not a dependency of any protocol service.
- Not a replacement for the deterministic engines or the evidence they produce.

> **BanzAI remains the native protocol agent; Qwen is only a local language generation layer.**

---

## 2. The language layer: Qwen is not authoritative

Qwen3-4B is the **language** layer only. It drafts prose from an approved context that Rust hands it. It reads no protocol rules of its own, invents no facts, and holds no authority.

> **The model is not normative and cannot create, approve, certify, license or govern protocol rules. Qwen does not decide.**

- Qwen is **not** BanzAI. It is a component BanzAI may use to phrase an answer.
- No operator is approved by BanzAI. In BANZA, participation is not approved; it is **demonstrated** by verifiable evidence.
- The model produces text; the **deterministic engines verify** and the **evidence proves**. Nothing the model writes carries protocol weight.

There is no "powered by Qwen" branding, and no performance claims are made about the model here.

---

## 3. BanzAI as the native protocol agent

BanzAI's identity and boundary are unchanged by this runtime. BanzAI guides operators toward conformance, invokes the deterministic Rust engines, and cites protocol sources. Adding a local language layer adds phrasing capability, **not authority**. Every safety-relevant decision remains in Rust and in the engines — never in the model.

**Compact by design.** BanzAI answers are short — typically **3–6 sentences** — because it *guides*; it is not a long-form document generator. This is a deliberate design choice, not a limitation: concise, sourced guidance is what the agent is for. The compact default output budget (§7) reflects this directly.

---

## 4. The control layer: Rust owns safety (`engines/banzai-api-kb`)

All safety-critical control logic is **Rust** (`engines/banzai-api-kb`, compiled to native + WASM), per ADR-038. The TypeScript/JS service (`services/banzai-api`) is **I/O glue** only — it moves bytes, it does not decide.

> **Rust remains responsible for retrieval, source selection, prompt construction, limits, validation, fallback and safety.**

Rust owns, end to end:

1. **Retrieval & source selection (RAG).** Rust performs local retrieval over the protocol knowledge sources, selects the most relevant — **≤3 excerpts** for local inference — and packs them within a **≤2800-character context budget** (deterministic truncation in Rust). Retrieval is Rust; only **excerpts** are used, sources stay **mandatory**, and every answer **cites its sources**.
2. **Prompt construction.** `build_prompt_json` assembles the rules and wraps the approved context. The prompt is never model-authored. The Rust system prompt is **compact** (≈945 characters, reduced ~35% from ≈1450 to cut CPU prefill cost) while preserving **every** invariant and boundary rule.
3. **Source-boundary injection defence.** Retrieved excerpts and the user's question are treated as **data, not instructions** (see §8).
4. **Post-response validation.** `validate_response_json` inspects the draft and **blocks** forbidden claims before anything is served (see §8).
5. **Fallback selection.** When local generation is unavailable, times out, returns empty/invalid, or is blocked by the validator, Rust selects the deterministic grounded answer (see §6).

---

## 5. Local sources and RAG

- Retrieval runs over BanzAI's **local** protocol knowledge sources — no network call, no external index.
- The Rust control layer selects **≤3 sources per answer** for local inference and passes only **excerpts** into the packed context, bounded by a **≤2800-character context budget** with deterministic truncation in Rust. Tighter packing keeps CPU prefill low without loosening grounding — **sources remain mandatory**.
- Every served answer **cites the sources** it drew from; `GET /sources` exposes the available source set, and `POST /index` (dry-run) reports how indexing would proceed.
- The model sees only the excerpts Rust approved — never the full corpus, never the raw filesystem.

---

## 6. Fallback and degraded operation

Local inference **never** produces a fabrication and **never** crashes the request. When any of the following occur, BanzAI degrades to a deterministic, grounded answer built from the retrieved sources:

- the local model is unavailable (service down, profile off, model missing);
- the request **times out** (`LLM_TIMEOUT_MS`, default 60000 ms / 60s);
- the model returns **empty or invalid** output;
- the **post-response validator blocks** the draft.

In all these cases the response is served with `fallback` set and `engine_state` reflecting the degraded path. `mock` and `degraded` are **always available**, so BanzAI answers even with no model installed.

---

## 7. Operational limits

Conservative defaults keep CPU inference safe on a no-GPU host. All are env-tunable (see §12).

| Limit | Default | Env knob |
|---|---|---|
| Context window (`n_ctx`) | 4096 (8192 only if the benchmark proves stability) | `LLAMA_CTX_SIZE` |
| Max output tokens (local_qwen) | 384 (ADR-036; 256/512 only by explicit config; hosted providers keep 800) | `LLM_MAX_TOKENS` |
| Temperature | 0.1–0.2 | `LLM_TEMPERATURE` |
| `top_p` | ~0.8 | `LLM_TOP_P` |
| Concurrency | 1 | `BANZAI_MAX_CONCURRENCY` |
| Queue size | 1 | `BANZAI_QUEUE_SIZE` |
| Request timeout (local_qwen) | 60000 ms / 60s (90s only as a documented extreme fallback) | `LLM_TIMEOUT_MS` |
| Sources per answer (local) | ≤3 | (control layer) |
| Context budget (local) | ≤2800 chars (deterministic truncation in Rust) | (control layer) |
| Reasoning mode (local Qwen3) | **disabled** (`enable_thinking:false`) — ADR-036 | (control layer) |
| Startup warm-up | on (best-effort; primes the real system-prompt prefix) | `BANZAI_WARMUP` |

Concurrency 1 + queue 1 means the runtime serves one generation at a time and shallow-queues at most one more; excess load degrades rather than piling up.

The **384-token** local default (ADR-036; raised from the original 256 once reasoning was disabled per ADR-036) gives BanzAI's answers professional headroom while keeping CPU decode time bounded — the VPS XL+ benchmark showed answers finish naturally at ~84–133 tokens with room to spare (~8.7s). 256/512 are available only by explicit config; hosted providers are unaffected (800). The **60s** local timeout is an operational margin for CPU prefill+decode on a no-GPU host (max observed ~20s at 384); 90s exists only as a documented extreme fallback, and timeouts still degrade safely (§6).

**Reasoning disabled (ADR-036).** Qwen3-4B is a reasoning model; left on, it spends the compact
256-token budget inside `<think>` (`reasoning_content`) and returns empty final content on cold/complex
prompts. BanzAI answers from sources in 3–6 sentences and must not leak chain-of-thought, so reasoning
is **disabled** for the local runtime via `chat_template_kwargs: { enable_thinking: false }`. The Rust
prompt builder owns the policy (`disable_reasoning`); the JS glue maps it to the transport, scoped to
the on-host local runtime (hosted providers are unchanged).

**Warm-up (optional).** On startup, after llama.cpp reports healthy, the runtime issues a single
**best-effort, local-only** prime that warms the **real system-prompt prefix** (reasoning disabled,
1-token completion) so the first real answer reuses the cached KV prefix and skips the cold
system-prompt prefill. It is enabled by default (`BANZAI_WARMUP=1`; set `0` to disable), carries **no
user data and no real documents**, and is **not counted** toward any budget or metric. If the local
model never becomes ready or the prime fails, startup proceeds normally and `/health` reports
`local_inference.warmed=false`.

---

## 8. Security model

**Model sandbox.** The model has **no** access to a shell, the filesystem, the network, PostgreSQL, internal tools, or secrets. Everything reaches the model through the Rust control layer, and only as approved context. At the container level the `llama-local` service is internal-only (no published ports), `read_only`, `cap_drop: ALL`, `no-new-privileges`, with a read-only model mount.

**Injection defence.** Retrieved sources and the user's question are **data, not instructions**. The Rust prompt wraps them inside explicit `FONTES` / `PERGUNTA` boundaries and **neutralises forged tags**, so text embedded in a source or question cannot escape its slot and issue commands.

**No leakage.** The following are **never** revealed in any response: the system prompt, chain-of-thought, environment variables, stack traces, and internal paths. `validate_response_json` blocks drafts that would leak them, and also blocks forbidden claims — e.g. asserting an operator is certified, "BANZA aprova/licencia", "BanzAI decide", or treating the model as normative.

---

## 9. Healthcheck states

`GET /health` reports the current engine and local-inference posture:

- `engine_state`: one of `mock` | `local_qwen` | `external_hosted`
- `external_model_called`: **false** for local inference (nothing leaves the host)
- `inference_location`: where generation runs
- `local_inference`: `{ location, enabled, benchmark_approved, default_effective, warmed, concurrency }`
  — `warmed` is `null` (not attempted), `true` (system-prompt prefix primed) or `false` (never ready)

At the container level, `llama-local` exposes a **`curl /health`** healthcheck so the runtime can tell whether the local server is live before routing to it. `curl` is used because it ships in `ghcr.io/ggml-org/llama.cpp:server` — **`wget` is not present** in that image. The server's `/health` returns **`503` while the model is loading** and **`200` once it is ready**, so the healthcheck flips to healthy only when generation can actually be served.

---

## 10. The four modes

| Mode | Meaning |
|---|---|
| `mock` | **Default.** Deterministic, offline answers. Always available. |
| `local_qwen` | On-host generation via `llama.cpp` (Qwen3-4B-GGUF, CPU). |
| `degraded` | Runtime fallback: local model unavailable/timeout/empty/invalid, or validator blocks → deterministic **grounded** answer. |
| `disabled` | Local inference is not active. |

`external_model_called` is **false** for `mock`, `local_qwen`, and `degraded`; the USD budget applies only to hosted providers and is bypassed for local (free, on-host).

---

## 11. Activation (opt-in)

Local inference is deliberately opt-in. To enable it:

1. **Install the model manually.** Place the GGUF into `infra/banza-network/models/` (git-ignored). It is **never** committed to Git and **never** auto-downloaded during build or deploy. Verify its `sha256` and record the model source and licence. See `LOCAL_QWEN_MODEL_SETUP.md`.
2. **Enable the compose profile.** Add `llama-local` to `COMPOSE_PROFILES` so the sandboxed `llama-local` service starts (off by default).
3. **Point BanzAI at it.** Set `LLM_PROVIDER=local_qwen`. The runtime is keyless (no `LLM_API_KEY`); the default endpoint is `http://llama-local:8080/v1` (override with `LLM_API_BASE`), model name `qwen3-4b` (`LLM_MODEL`).
4. **Redeploy `banzai-api`.**

---

## 12. Benchmark-gated default

`local_qwen` becomes the **effective default only after** the VPS XL+ benchmark endorses it **and** `BANZAI_BENCHMARK_APPROVED=true`. Until then, `mock` stays the default and `degraded` the fallback.

> **Qwen3-4B-GGUF Q4_K_M is the intended default local language model, but production default activation is benchmark-gated on the VPS XL+ profile.**

> **If benchmarks show instability, excessive memory pressure or service impact, local inference must remain disabled or degraded until resources or model choice are revised.**

The target host is a **VPS XL+**: 8 vCore, 16 GB RAM, 480 GB NVMe, **no GPU**. Keep memory headroom for the OS, Postgres, the website and the APIs; keep swap enabled. The container memory limit (`LLAMA_MEM_LIMIT`, default `7g`) prevents host OOM. The mandatory benchmark is recorded in `docs/governance/M2_8A_LOCAL_QWEN_VPS_XL_BENCHMARK.md`.

### Environment knobs

Configured in `infra/banza-network/.env.example`:

- **Compose / container:** `COMPOSE_PROFILES`, `LLAMA_LOCAL_IMAGE` (default digest-pinned `ghcr.io/ggml-org/llama.cpp@sha256:b832a7b7…` — ADR-036; never a rolling tag), `LLAMA_MODEL_PATH` (default `/models/model.gguf`), `LLAMA_CTX_SIZE` (default 4096), `LLAMA_THREADS` (default 4), `LLAMA_CPU_LIMIT` (default 4.0), `LLAMA_MEM_LIMIT` (default `7g`)
- **Provider / generation:** `LLM_PROVIDER`, `LLM_MODEL`, `LLM_TIMEOUT_MS` (local_qwen default 60000), `LLM_MAX_TOKENS` (local_qwen default 384 — ADR-036; hosted 800), `LLM_TEMPERATURE`, `LLM_TOP_P`
- **Concurrency:** `BANZAI_MAX_CONCURRENCY`, `BANZAI_QUEUE_SIZE`
- **Warm-up:** `BANZAI_WARMUP` (default `1`; set `0` to disable the startup ping)
- **Gating:** `BANZAI_LOCAL_INFERENCE_ENABLED`, `BANZAI_BENCHMARK_APPROVED`

The `llama-local` service (`infra/banza-network/compose.yml`) runs:

```
command: --host 0.0.0.0 --port 8080 -m ${LLAMA_MODEL_PATH} -c ${LLAMA_CTX_SIZE} -t ${LLAMA_THREADS} --no-webui
```

profile-gated on `["llama-local"]`, on the internal `banza-data` network with **no published ports**, `read_only`, `cap_drop: ALL`, `no-new-privileges`, `deploy.resources.limits` bounded by `LLAMA_CPU_LIMIT`/`LLAMA_MEM_LIMIT`, a **`curl /health`** healthcheck (`curl` ships in the image; `wget` does not — `/health` is `503` while loading, `200` when ready), model bind-mounted `./models:/models:ro`.

---

## 13. Rollback

Rollback is simple and immediate. Set `LLM_PROVIDER=mock` (or stop the `llama-local` profile) and redeploy `banzai-api`. `mock`/`degraded` are always available, so BanzAI keeps answering with zero external dependency.

---

## 14. Request flow — `POST /ask`

```
  client
    │  POST /ask  { question }
    ▼
┌─────────────────────────────────────────────────────────────┐
│  services/banzai-api  (JS = I/O glue only)                    │
│                                                              │
│  1. VALIDATE request                                         │
│         │                                                    │
│         ▼                                                    │
│  2. Rust: RETRIEVE (local RAG) → SELECT ≤3 → PACK ≤2800ch   │  engines/
│         │                                                    │  banzai-api-kb
│         ▼                                                    │  (WASM)
│  3. Rust: BUILD PROMPT (rules + FONTES/PERGUNTA boundaries,  │
│           forged-tag neutralisation)                         │
│         │                                                    │
│         ▼                                                    │
│  4. llama.cpp  (local_qwen, CPU, sandboxed, internal-only)   │  llama-local
│         │  draft text                                        │
│         ▼                                                    │
│  5. Rust: VALIDATE response (block forbidden claims /        │
│           leakage; check grounding)                          │
│         │                                                    │
│    ┌────┴─────────────┐                                      │
│    ▼ ok               ▼ unavailable / timeout /              │
│  SERVE                  empty / invalid / blocked            │
│  (cites sources,        │                                    │
│   non_normative:true)   ▼                                    │
│                       DEGRADE → deterministic grounded answer│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
  response: { request_id, engine_state, inference_location,
              fallback, sources_count, non_normative: true, elapsed_ms }
```

Every `/ask` response carries `non_normative: true` — a structural reminder that the answer guides but does not decide.

---

## 15. Endpoints (summary)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Engine/local-inference posture (see §9). |
| `POST /ask` | Answer a question; returns `request_id`, `engine_state`, `inference_location`, `fallback`, `sources_count`, `non_normative: true`, `elapsed_ms`. |
| `GET /sources` | List available protocol knowledge sources. |
| `POST /index` | Dry-run index report. |

---

## 16. References

- **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)** — BanzAI Local Qwen Inference Runtime (this runtime's governing decision).
- **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)** — BanzAI Local Qwen latency tuning (M2.8B): compact Rust prompt, 256-token default output, ≤3 excerpts / ≤2800-char context budget, 60s timeout margin, optional warm-up, and the `curl` healthcheck fix.
- **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)** — BanzAI disables Qwen3 reasoning (`enable_thinking:false`) so the compact budget produces the answer, and warms the real system-prompt prefix on startup (M2.8C).
- **[ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)** — BanzAI local_qwen output default raised 256→384 for a professional answer budget (M2.8D); VPS XL+ benchmark validated (answers finish naturally, ~8.7s, 60s timeout ample).
- **ADR-038** — Rust-first policy for official engines (control logic is Rust).
- **ADR-036** — BanzAI as the native, non-authoritative protocol agent.
- **ADR-013** — PostgreSQL as protocol-state store (the model never touches it).
- `engines/banzai-api-kb/src/{prompt.rs,validate.rs}` — the Rust control logic.
- `services/banzai-api/` — the JS I/O glue.
- `infra/banza-network/compose.yml` — the `llama-local` service.
- `docs/banzai/LOCAL_QWEN_MODEL_SETUP.md`, `docs/banzai/LOCAL_INFERENCE_RUNBOOK.md` — setup and operations.
- ADR-036 / ADR-036 / ADR-036 — the benchmark gate and the defaults it fixed.
