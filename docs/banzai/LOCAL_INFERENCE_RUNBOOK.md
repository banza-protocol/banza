# BanzAI Local Inference Runbook

Operations runbook for enabling, verifying, operating and rolling back the optional
on-host `local_qwen` language layer for BanzAI (ADR-036, latency-tuned per ADR-036).
Command-oriented; for internal operators only.

> BanzAI is the native, non-authoritative protocol agent. BanzAI guia; os motores
> verificam; a evidência prova. **BanzAI remains the native protocol agent; Qwen is only a
> local language generation layer** — it is not normative and cannot create, approve,
> certify, license or govern protocol rules. Rust (`engines/banzai-api-kb`) owns prompt
> building, source-boundary injection defence, post-response validation and fallback; the
> JS service (`services/banzai-api`) is I/O glue.

## Scope and prerequisites

- **Repo:** `~/banza`. **This document is an internal/dev surface** (`docs/banzai/`), so
  `docker` / `docker compose` commands appear here directly. They must never migrate to a
  public surface.
- **Runtime dir (VM):** the running stack (compose + `.env` + `models/`) lives at
  `/srv/banza-protocol/runtime`. Run every command below from there:
  ```bash
  cd /srv/banza-protocol/runtime
  ```
- **Compose service:** `llama-local` in `infra/banza-network/compose.yml` — profile-gated
  (`profiles: ["llama-local"]`, off by default), internal-only on `banza-data` (no published
  ports), `read_only`, `cap_drop: ALL`, `no-new-privileges`, CPU/memory limited, model
  bind-mounted read-only from `./models:/models:ro`.
- **Host envelope (VPS XL+):** 8 vCore, 16 GB RAM, 480 GB NVMe, **no GPU**. Leave headroom
  for the OS, Postgres, website and APIs, and keep swap enabled. The container memory limit
  (`LLAMA_MEM_LIMIT`, default `7g`) is what prevents a host OOM — do not remove it.
- **Model:** Qwen3-4B-GGUF, quantization **Q4_K_M**, CPU via **llama.cpp**, non-thinking
  mode. The GGUF is installed **manually**, is gitignored, and is **never** downloaded during
  build or deploy.

Related docs: [`LOCAL_QWEN_MODEL_SETUP.md`](./LOCAL_QWEN_MODEL_SETUP.md) (obtain, place and
license the model), [`LOCAL_INFERENCE_RUNTIME.md`](./LOCAL_INFERENCE_RUNTIME.md) (runtime
architecture), ADR-036 (local Qwen inference runtime), ADR-036 (local Qwen latency tuning) and
ADR-036 (the 384-token default). The individual benchmark records that produced those decisions are
not kept — the decisions are.

---

## 1. Prepare the model

Follow [`LOCAL_QWEN_MODEL_SETUP.md`](./LOCAL_QWEN_MODEL_SETUP.md) to download the
Qwen3-4B-GGUF Q4_K_M file, record its **source and licence**, and place it in the runtime
model directory that is bind-mounted read-only into the container:

```bash
cd /srv/banza-protocol/runtime
ls -lh models/                      # the .gguf must sit here (gitignored; never committed)
```

The container reads the model at `LLAMA_MODEL_PATH` (default `/models/model.gguf`). Either
name the file `model.gguf` or set `LLAMA_MODEL_PATH` to the actual in-container path in
`.env` (see §3).

## 2. Verify the checksum

Never start the service against an unverified file. Compare the SHA-256 you recorded in
`LOCAL_QWEN_MODEL_SETUP.md` against the file on disk:

```bash
cd /srv/banza-protocol/runtime
sha256sum models/*.gguf
# → compare byte-for-byte with the checksum recorded at download time
```

If the checksums differ, stop: re-download and re-verify before continuing. The
`banzai-local-inference-check` guard also blocks any GGUF from ever entering Git.

## 3. Configure the environment

All knobs live in `/srv/banza-protocol/runtime/.env` (copied from
`infra/banza-network/.env.example`, `chmod 600`, never committed). The defaults below match
`.env.example`; only change what you need.

Point BanzAI at the local model (keyless — no `LLM_API_KEY`, no external URL):

```dotenv
# --- provider selection ---
LLM_PROVIDER=local_qwen          # mock | deepseek | qwen (hosted) | local_qwen (on-host llama.cpp)
LLM_MODEL=qwen3-4b               # chat model name reported to the llama.cpp server
# LLM_API_BASE defaults to http://llama-local:8080/v1 for local_qwen — leave unset unless overriding
# LLM_API_KEY — leave empty/unset for local_qwen (keyless; nothing leaves the host)

# --- generation limits (tuned for CPU inference — ADR-036) ---
LLM_TIMEOUT_MS=60000             # local_qwen default (60s operational margin); 90000 only as a documented extreme fallback
LLM_MAX_TOKENS=384               # local_qwen default (ADR-036; professional answers); 256/512 only by explicit config; hosted providers keep 800
LLM_TEMPERATURE=0.2              # 0.1–0.2
LLM_TOP_P=0.8                    # conservative sampling

# --- concurrency / queue (CPU: one at a time) ---
BANZAI_MAX_CONCURRENCY=1
BANZAI_QUEUE_SIZE=1              # excess /ask fails fast (503) rather than piling up
BANZAI_WARMUP=1                  # best-effort local-only single-token startup ping to warm the model; set 0 to disable (no user data, not counted)
```

Configure the `llama-local` container itself and turn on the profile:

```dotenv
# --- compose profile (turns the service on) ---
COMPOSE_PROFILES=llama-local     # set here so every compose command manages the service consistently

# --- llama.cpp container ---
LLAMA_LOCAL_IMAGE=ghcr.io/ggml-org/llama.cpp@sha256:b832a7b7252a90a79a1e8d23d9be3ac5261a33224f60682dff0cade412fa55d3   # digest-pinned (ADR-036); override only with another @sha256 pin, never a rolling tag
LLAMA_MODEL_PATH=/models/model.gguf                    # in-container path (bind mount ./models:ro)
LLAMA_CTX_SIZE=4096              # 8192 ONLY if the benchmark proves it stable
LLAMA_THREADS=4
LLAMA_CPU_LIMIT=4.0             # deploy.resources.limits.cpus
LLAMA_MEM_LIMIT=7g             # deploy.resources.limits.memory — the host-OOM guardrail

# --- benchmark gate (effective default) ---
BANZAI_LOCAL_INFERENCE_ENABLED=false   # opt-in flag
BANZAI_BENCHMARK_APPROVED=false        # flip to true ONLY after the VPS XL+ benchmark approves local_qwen
```

**Benchmark gate:** `local_qwen` becomes the *effective* default only after the VPS XL+
benchmark endorses it **and** `BANZAI_BENCHMARK_APPROVED=true`. Until then `mock` remains the
default and `degraded` remains the fallback. You may still run `local_qwen` in
opt-in/preview by setting `LLM_PROVIDER=local_qwen` explicitly.

### Tuning output length and timeout (ADR-036)

`local_qwen` ships CPU-tuned defaults: `LLM_MAX_TOKENS=384` (ADR-036) and `LLM_TIMEOUT_MS=60000`
(60s). Hosted providers keep their own default (800 tokens). Tune within these bounds:

- **`LLM_MAX_TOKENS`** — 384 is the local default (ADR-036: a professional answer budget; the VPS
  XL+ benchmark showed answers finish naturally at ~84–133 tokens with headroom). Lower to `256`
  or raise to `512` **only by explicit config**; a higher cap means more CPU decode time per
  request. BanzAI answers are intentionally short (3–6 sentences) — it guides,
  it is not a long-form document generator — so most tuning is downward, not up.
- **`LLM_TIMEOUT_MS`** — 60s is the default operational margin. `90000` (90s) is a documented
  *extreme* fallback only; do not exceed it. A timeout is never a hard failure: BanzAI degrades
  to a deterministic grounded answer (`fallback: true`, see §9) — never a crash, never a
  fabrication.

Two related limits are fixed in Rust (`engines/banzai-api-kb`) and are **not** env-tunable:
local inference packs **≤3 source excerpts** within a **≤2800-char context budget**
(deterministic truncation), and uses a compact system prompt (~35% smaller than the hosted
prompt, ≈945 vs ≈1450 chars, to cut CPU prefill). Every invariant is preserved and **sources
remain mandatory** — these limits trade prompt length for latency, never grounding.

### Re-benchmark after tuning (ADR-036)

Any change to `LLM_MAX_TOKENS`, `LLM_TIMEOUT_MS`, `LLAMA_CTX_SIZE`, `LLAMA_THREADS` or the
model file invalidates the prior benchmark. Re-run the VPS XL+ benchmark and record the result
with the change that invalidated it, so the result travels with the configuration it justifies,
before treating `local_qwen` as the effective default. Only flip
`BANZAI_BENCHMARK_APPROVED=true` after the new benchmark returns **Option A** *and* a maintainer
approves; until then `mock` stays the default and `degraded` stays the fallback. No latency
figures are promised here — the benchmark record, not this runbook, is the source of truth.

## 4. Start the service

With `COMPOSE_PROFILES=llama-local` in `.env`, start the model container:

```bash
cd /srv/banza-protocol/runtime
COMPOSE_PROFILES=llama-local docker compose up -d llama-local
```

CPU model load is slow; the healthcheck has a 60s `start_period`. Watch it settle:

```bash
docker compose ps llama-local          # STATUS should progress to "healthy"
```

`llama-local` is **not** in `banzai-api`'s `depends_on` (that would auto-enable the profile
and defeat the gate). After changing any `LLM_*` / `BANZAI_*` value in `.env`, recreate the
API so it picks up the new environment:

```bash
docker compose up -d --no-deps banzai-api
```

With `BANZAI_WARMUP=1` (default) the API, once llama.cpp is healthy, fires one best-effort,
local-only prime that warms the **real system-prompt prefix** (reasoning disabled; 1-token) so the
first real answer reuses the cached KV prefix. It carries no user data and no real documents and is
not counted; set `BANZAI_WARMUP=0` to disable. `/health` reports `local_inference.warmed`.

**Reasoning disabled (ADR-036).** For the local Qwen3 runtime, BanzAI disables the model's thinking
mode (`chat_template_kwargs.enable_thinking=false`) so the completion budget produces the
final answer instead of `<think>` reasoning — this removes the empty-content degradation seen in
M2.8B on cold/complex prompts. Rust owns the policy; the JS glue maps it to the local transport.

## 5. Verify health

**a) llama.cpp server health** (internal only — there are no published ports):

```bash
# from the model container itself — its image (ghcr.io/ggml-org/llama.cpp:server) ships
# curl, NOT wget; this is exactly the container healthcheck command. /health returns 503
# while the model is still loading and 200 once it is ready.
docker compose exec llama-local curl -fsS http://127.0.0.1:8080/health

# or from banzai-api, which shares the internal banza-data network, by service name
docker compose exec banzai-api sh -c 'wget -qO- http://llama-local:8080/v1/models || true'
```

**b) BanzAI engine state** — `GET /health` on `banzai-api` (port `8091`, internal):

```bash
docker compose exec banzai-api sh -c 'wget -qO- http://127.0.0.1:8091/health'
```

Confirm in the JSON:

- `engine_state` → `local_qwen` (values: `mock` | `local_qwen` | `external_hosted`)
- `external_model_called` → `false` (nothing leaves the host for local inference)
- `inference_location` → on-host
- `local_inference` → `{ location, enabled, benchmark_approved, default_effective, concurrency }`
  — check `enabled`, `benchmark_approved` and `default_effective` reflect your intent.

> If `wget`/`curl` is not present in a container, run the check from `llama-local` (which
> ships `curl`) or attach a throwaway curl container to the `banza-data` network.

## 6. Test /ask

Send a real question through the pipeline and inspect the response envelope:

```bash
docker compose exec banzai-api sh -c 'wget -qO- \
  --header="Content-Type: application/json" \
  --post-data="{\"question\":\"O que e o protocolo BANZA?\"}" \
  http://127.0.0.1:8091/ask'
```

Expected fields on the `POST /ask` response:

- `request_id`, `engine_state` (`local_qwen`), `inference_location`
- `fallback` — `false` on a healthy local completion; `true` when it degraded (see §9)
- `sources_count` — cited sources per answer; **≤3** for local inference (ADR-036 source
  packing — ≤3 excerpts within a ≤2800-char budget). Sources remain mandatory.
- `non_normative: true` — always; BanzAI never certifies or decides
- `elapsed_ms`

Local answers are compact by design (3–6 sentences) — BanzAI guides; it is not a long-form
document generator. Short output is expected, not a truncation bug.

Related read-only endpoints: `GET /sources` (corpus) and `POST /index` (dry-run indexing).

## 7. Observe logs

Logs are **structured** and do **not** include prompt/answer content by default. The system
prompt, chain-of-thought, environment variables, stack traces and internal paths are never
emitted.

```bash
docker compose logs -f --tail=100 llama-local     # model server (load, health, errors)
docker compose logs -f --tail=100 banzai-api      # engine_state, fallback events, queue/timeout
```

## 8. Stop the service

Stop only the model container; the rest of the stack (website, APIs, Postgres) is
unaffected. BanzAI falls back to `mock`/`degraded` automatically while it is down.

```bash
docker compose stop llama-local        # stop but keep the container
# or remove it entirely:
docker compose --profile llama-local down llama-local
```

To keep the profile off across future `docker compose up` invocations, clear
`COMPOSE_PROFILES` in `.env` (and, if you want BanzAI back on the safe default, set
`LLM_PROVIDER=mock` per §9).

## 9. Rollback to mock / degraded

`mock` and `degraded` are **always available** — deterministic, offline, grounded. Rollback
is simple and immediate:

```bash
# in /srv/banza-protocol/runtime/.env
LLM_PROVIDER=mock
```
```bash
docker compose up -d --no-deps banzai-api      # redeploy the API to pick up the change
docker compose stop llama-local                # (optional) stop the model container too
```

Verify with §5b that `engine_state` is back to `mock`. Note the difference:

- **mock** — deterministic offline provider selected explicitly (the safe default).
- **degraded** — the *runtime* fallback: when the local model is unavailable, times out,
  returns empty/invalid output, or the Rust validator blocks the draft, BanzAI serves a
  deterministic grounded answer instead. Never a fabrication, never a crash.
- **disabled** — local inference not active at all.

## 10. Remove the model

Only after the service is stopped (§8):

```bash
cd /srv/banza-protocol/runtime
docker compose stop llama-local
rm -i models/*.gguf                    # frees NVMe; the file is gitignored so nothing in Git changes
```

Re-installing later means repeating §1–§2 (place file, re-verify checksum).

---

## Common problems and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `llama-local` won't start; log says model **not found** / cannot open GGUF | File missing, wrong name, or `LLAMA_MODEL_PATH` mismatch | Confirm the `.gguf` is in `./models/` (§1); set `LLAMA_MODEL_PATH` to the real in-container path (`/models/<file>.gguf`); re-run §2 checksum, then §4. |
| Container **OOM-killed** / host under memory pressure | Model + context too large for the envelope | Lower `LLAMA_CTX_SIZE` (e.g. back to `4096`), keep/lower `LLAMA_MEM_LIMIT`, ensure swap is on, or choose a smaller model. Never raise the limit past the host headroom. The limit exists to protect the host, not to be widened. |
| **Slow first token** after start or idle | Cold model load / first-request warm-up on CPU (no GPU) | Expected on CPU — wait out the 60s `start_period`; confirm `healthy` before load-testing. Keep `BANZAI_MAX_CONCURRENCY=1`; `BANZAI_WARMUP=1` (default) sends a startup ping to reduce cold load. (No performance guarantees are made.) |
| `/ask` returns **503** | Queue full — concurrency 1, queue 1, and a request is already in flight | By design (fail fast, fail safe). Retry after the in-flight request finishes; do not raise `BANZAI_QUEUE_SIZE`/`BANZAI_MAX_CONCURRENCY` beyond what the benchmark endorsed. |
| Answers come back with `fallback: true` after a wait | **Timeout** — completion exceeded `LLM_TIMEOUT_MS` | Expected safety behaviour: BanzAI degraded to a deterministic grounded answer. If frequent, verify the model is `healthy` (§5), reduce `LLM_MAX_TOKENS`/`LLAMA_CTX_SIZE`, or raise `LLM_TIMEOUT_MS` toward the documented `90000` (90s) cap — 60s is the default; do not exceed 90s. Re-benchmark after any change (§3). |
| `engine_state` still `mock` after setting `local_qwen` | API not recreated, or benchmark gate | Run `docker compose up -d --no-deps banzai-api`; for effective-default behaviour set `BANZAI_BENCHMARK_APPROVED=true` only after the VPS XL+ benchmark approves. |
| `banzai-api` can't reach `llama-local` | Profile not active / service down | Ensure `COMPOSE_PROFILES=llama-local` in `.env` and the container is `healthy` (§4–§5); both share the internal `banza-data` network. |

If instability, excessive memory pressure or measurable impact on the other protocol
services appears, local inference must remain **disabled or degraded** until resources or the
model choice are revised (ADR-036 §7). Roll back per §9.

---

**See also:** ADR-036 (BanzAI Local Qwen Inference Runtime), ADR-036 (BanzAI Local Qwen
Latency Tuning), ADR-038 (Rust-first engines), ADR-036 (BanzAI as native protocol agent),
ADR-013 (PostgreSQL as protocol-state store).
