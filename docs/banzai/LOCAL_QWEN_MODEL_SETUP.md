# BanzAI Local Qwen Model Setup (VPS XL+)

> Manual, one-time install of the Qwen2.5-7B-Instruct-GGUF Q4_K_M weights for BanzAI's optional
> on-host language layer. The GGUF is installed by hand, verified, and kept out of Git.

BanzAI is the native, non-authoritative protocol agent: **BanzAI guia; os motores
verificam; a evidência prova.** This document only covers obtaining and placing the
local model file. It does **not** grant the model any authority: **BanzAI remains the
native protocol agent; Qwen is only a local language generation layer.** The model is not
normative and cannot create, approve, certify, license or govern protocol rules — it
drafts text from context the Rust control layer (`engines/banzai-api-kb`) hands it, and
nothing more.

- **Milestone:** M2.8A — BanzAI Local Qwen Inference Runtime; latency tuning in
  M2.8B — BanzAI Local Qwen Latency Tuning.
- **Governing decisions:** [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)
  (the runtime) and [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)
  (the tuned defaults recorded throughout this document).
- **Sibling docs:** `docs/banzai/LOCAL_INFERENCE_RUNTIME.md` (runtime behaviour, modes,
  endpoints) and `docs/banzai/LOCAL_INFERENCE_RUNBOOK.md` (operations). The benchmarks that chose the
  default are not kept; ADR-036, ADR-036 and ADR-036 carry the decisions they produced.

The install, checksum-verification and provenance-recording process is **unchanged** from
M2.8A: the same manual, keep-it-out-of-Git flow in Sections 2–5 and 9 still applies. M2.8B
only tunes the runtime defaults (output length, timeout, source packing, prompt size, an
optional warm-up ping, and the healthcheck), leaving the weights and how you obtain them
exactly as before. The GGUF still lives only in the runtime models directory on the VM's
disk, outside Git.

---

## 0. Three rules that never bend

1. **Manual install only.** The operator places the GGUF by hand. Nothing downloads it.
2. **No automatic download during build or deploy.** `docker compose build`, `up`, and the
   bootstrap script never fetch a model. If the file is not present, the `llama-local`
   service simply cannot start — and that is fine, because it is off by default.
3. **The GGUF never enters Git.** `infra/banza-network/models/` is gitignored (see the
   repo-root `.gitignore`) and the guard `make banzai-local-inference-check` fails the build
   if any `.gguf` is staged. The weights live only on the VM's disk.

If any of these three is in doubt, stop and re-read this section before continuing.

---

## 1. Target host: VPS XL+

| Resource | VPS XL+ |
|---|---|
| CPU | 8 vCore |
| RAM | 16 GB |
| Disk | 480 GB NVMe |
| GPU | **none** — CPU inference only |

The whole point of the local runtime is on-host, keyless, egress-free generation. This
box also runs the OS, PostgreSQL, the website and the protocol APIs, so the model must
share 16 GB with everything else. Section 6 covers the memory budget; the container's
hard memory limit (`LLAMA_MEM_LIMIT`, default `7g`) exists precisely so the model can
never OOM the host.

---

> **Which model, and why this one.** The selected model is **Qwen2.5-7B-Instruct, Q4_K_M**. It was
> chosen by benchmark against Qwen2.5-14B under unchanged thresholds: after the R1 remediation it
> cleared every input, output, safety, factuality, latency and operational gate, at roughly half the
> 14B latency and a higher clean-serve rate. That comparison decided the default model; the benchmark
> that produced it was a one-off and is not kept — the decision it informed is the durable part.
>
> This document previously described Qwen3-4B, which predates that selection. The model is a local
> language layer only: it is non-normative, it decides nothing, and BanzAI serves deterministic answers
> without it (ADR-036, ADR-036).

## 2. Where to obtain the weights

You need **Qwen2.5-7B-Instruct-GGUF, quantization Q4_K_M**. Choose a reputable GGUF publisher rather
than a hardcoded link (download URLs and filenames change and rot). Prefer, in order:

1. **The official Qwen GGUF repository on Hugging Face** (the `Qwen` organization's own
   `Qwen2.5-7B-Instruct-GGUF` release). This is the canonical, first-party source.
2. **A well-known, high-reputation community re-quantizer** (for example the widely used
   GGUF quantization publishers) **only if** the file's provenance and checksum are clearly
   documented on the model card.

How to choose the exact file:

- Search the publisher's model page for the `Q4_K_M` variant of `Qwen2.5-7B-Instruct`. The filename
  typically looks like `qwen2.5-7b-instruct-q4_k_m.gguf` (exact spelling varies by publisher — do not
  assume it).
- Confirm the **architecture is Qwen3** and the **parameter count is 4B**. Do not
  substitute a different size or generation without a new benchmark (ADR-036 §8 rejects an
  8B model as the initial default for the 16 GB no-GPU envelope).
- Prefer a **single-file** GGUF. If the publisher ships a split/sharded GGUF, either
  download the merged file or merge the shards with `llama.cpp`'s tooling before use;
  `LLAMA_MODEL_PATH` points at one file.
- Note the **published sha256 (or blob hash)** and the **licence** from the model card —
  you will need both in Section 4.

Never fetch weights from an anonymous mirror, a pastebin link, or anything without a
documented checksum and licence.

---

## 3. Why Q4_K_M (variant and quantization choice)

For a 16 GB, no-GPU host serving other production services alongside inference, **Q4_K_M is
the intended default** for these reasons:

- **Memory fit.** A 4B model at Q4_K_M is roughly ~2.3–2.7 GB of weights on disk and loads
  into a similar order of RAM, leaving comfortable headroom under the `7g` container limit
  for the KV cache and runtime, and leaving the rest of the 16 GB for the OS, Postgres and
  the APIs. Treat these figures as approximate — verify actual usage on the box (Section 6),
  never as a promise.
- **Quality/size balance.** `_K_M` ("medium") k-quants retain noticeably more quality than
  `Q4_0`/`Q4_K_S` at a small size cost, and cost far less memory than `Q5`/`Q6`/`Q8`.
  For a grounded, retrieval-fed drafting layer at low temperature, Q4_K_M is the pragmatic
  sweet spot.
- **CPU friendliness.** k-quants are well optimised in `llama.cpp` for CPU inference, which
  is the only option here (no GPU).

Do **not** reach for a larger quantization (Q5/Q6/Q8) or a larger model "to be safe" — that
erodes the host headroom the protocol services depend on. Any change to the model or
quantization must be justified by the VPS XL+ benchmark, not by intuition, and this
document makes no performance promises.

---

## 4. Verify the checksum and record provenance

Never trust a downloaded weights file until its hash matches the publisher's.

**Verify sha256** (macOS/Linux):

```bash
# Linux
sha256sum ./qwen2.5-7b-instruct-q4_k_m.gguf

# macOS
shasum -a 256 ./qwen2.5-7b-instruct-q4_k_m.gguf
```

Compare the output byte-for-byte against the sha256 (or blob hash) shown on the publisher's
model page. **If it does not match, delete the file and re-download.** A mismatch means a
truncated, corrupted, or tampered file — do not proceed.

**Record the provenance** in a small local note next to the model. Create
`infra/banza-network/models/MODEL_SOURCE.txt` (this directory is gitignored, so the note
stays on the VM and never enters Git):

```text
Model:        Qwen2.5-7B-Instruct-GGUF
Variant:      Q4_K_M
File:         qwen2.5-7b-instruct-q4_k_m.gguf
Source:       <publisher / Hugging Face repo URL you actually used>
Downloaded:   2026-07-19
sha256:       <the verified hash>
Licence:      <licence name from the model card, e.g. Apache-2.0>
Licence URL:  <link to the licence text on the model card>
Notes:        Installed manually per docs/banzai/LOCAL_QWEN_MODEL_SETUP.md (ADR-036).
```

This note is the auditable record of what is running and under what licence. Keep it
current whenever you replace the model (Section 9).

---

## 5. Where to place the file

Put the verified GGUF in the git-ignored models directory that the compose service
bind-mounts read-only:

```bash
mkdir -p /srv/banza-protocol/repo/infra/banza-network/models
mv ./qwen2.5-7b-instruct-q4_k_m.gguf \
   /srv/banza-protocol/repo/infra/banza-network/models/model.gguf
```

- The directory `infra/banza-network/models/` is **gitignored** and must **never** contain
  a tracked file. Confirm with `git status --short infra/banza-network/models/` — it should
  show nothing.
- The default expected filename inside the container is `model.gguf`
  (`LLAMA_MODEL_PATH=/models/model.gguf`). You may keep the descriptive filename instead
  and point `LLAMA_MODEL_PATH` at it (Section 7); using `model.gguf` keeps `.env` at its
  default.
- Compose mounts this directory **read-only** (`./models:/models:ro`), so the container
  cannot modify or delete the weights.

---

## 6. RAM requirements and no-GPU limitations

**RAM.** Budget for: OS + PostgreSQL + website + verification-api + banzai-api **plus** the
model. The `llama-local` container is capped at `LLAMA_MEM_LIMIT` (default `7g`) so it
cannot starve the rest. Practical guidance:

- Keep meaningful headroom for the OS page cache and Postgres; do not raise
  `LLAMA_MEM_LIMIT` toward the full 16 GB.
- **Keep swap enabled** as a safety margin; the memory limit plus swap prevents a host OOM.
- Context length drives KV-cache memory. Start at `LLAMA_CTX_SIZE=4096`. Only raise to
  `8192` if the VPS XL+ benchmark proves it stable within the memory envelope.

**No GPU.** Inference is CPU-only via `llama.cpp`, which means it is comparatively slow and
latency-sensitive. The runtime is deliberately conservative to match, and M2.8B (ADR-036)
tunes these defaults to keep CPU prefill and generation bounded:

- `BANZAI_MAX_CONCURRENCY=1` — one request at a time.
- `BANZAI_QUEUE_SIZE=1` — a short queue; excess `/ask` requests fail fast rather than
  pile up.
- `LLM_TIMEOUT_MS=60000` — for `local_qwen` the default timeout is **60s**, the operational
  margin for CPU generation. 90s is documented only as an extreme fallback. Timeouts still
  degrade safely to the deterministic answer.
- `LLM_MAX_TOKENS=384` — for `local_qwen` the default output is **384 tokens** (ADR-036: a
  professional answer budget, benchmark-validated once reasoning was disabled per ADR-036).
  Lower to `256` or raise to `512` only by explicit config. Hosted providers keep `800`.
- `LLM_TEMPERATURE` 0.1–0.2, `LLM_TOP_P` ~0.8 — bounded, low-variance output.
- `LLAMA_THREADS=4`, `LLAMA_CPU_LIMIT=4.0` — bounded CPU so inference does not crowd out the
  protocol services.

**Source packing (local inference).** To keep the prompt short, local inference feeds at
most **3 excerpts** into a **≤2800-character context budget**, with deterministic truncation
performed in Rust (`engines/banzai-api-kb`). Sources remain **mandatory** — answers stay
grounded; the budget only bounds how much context the CPU has to prefill.

**Compact prompt and answers.** M2.8B trimmed the Rust system prompt by ~35% (≈1450 → ≈945
characters) purely to cut CPU prefill; every invariant and boundary in it is preserved.
BanzAI answers are short by design (about 3–6 sentences): it guides, it is not a long-form
document generator.

This document makes **no** latency or throughput promises. Measure on the box; the
benchmark record is authoritative.

---

## 7. Configure the path

The model path is set through the environment consumed by `infra/banza-network/compose.yml`
(see `.env.example`). Copy `.env.example` to `.env` (`chmod 600`) if you have not already,
then set the local-inference knobs:

```bash
# infra/banza-network/.env

# Start the internal llama.cpp service (off unless this profile is set)
COMPOSE_PROFILES=llama-local

# Point BanzAI at the internal, keyless local endpoint
LLM_PROVIDER=local_qwen          # keyless: leave LLM_API_KEY empty/unset
LLM_MODEL=qwen3-4b               # logical model name reported by /health and /ask
# LLM_API_BASE defaults to http://llama-local:8080/v1 for local_qwen (override only if needed)

# llama.cpp container knobs
LLAMA_LOCAL_IMAGE=ghcr.io/ggml-org/llama.cpp@sha256:b832a7b7252a90a79a1e8d23d9be3ac5261a33224f60682dff0cade412fa55d3   # digest-pinned (ADR-036); override only with another @sha256 pin, never a rolling tag
LLAMA_MODEL_PATH=/models/model.gguf   # path INSIDE the container; ./models is bind-mounted :ro
LLAMA_CTX_SIZE=4096
LLAMA_THREADS=4
LLAMA_CPU_LIMIT=4.0
LLAMA_MEM_LIMIT=7g

# Conservative CPU-inference limits (M2.8B tuned defaults, ADR-036)
LLM_TIMEOUT_MS=60000             # local_qwen default 60s; 90s only as an extreme fallback
LLM_MAX_TOKENS=384               # local_qwen default (ADR-036); 256/512 only by explicit config (hosted: 800)
LLM_TEMPERATURE=0.2
LLM_TOP_P=0.8
BANZAI_MAX_CONCURRENCY=1
BANZAI_QUEUE_SIZE=1
BANZAI_LOCAL_INFERENCE_ENABLED=true
BANZAI_WARMUP=1                  # optional best-effort local-only 1-token startup ping; set 0 to disable

# Benchmark gate — keep FALSE until the VPS XL+ benchmark endorses local_qwen
BANZAI_BENCHMARK_APPROVED=false
```

Notes:

- `LLAMA_MODEL_PATH` is the path **inside** the container. It always begins with `/models/`
  because compose mounts the host `./models` directory there. If you kept the descriptive
  filename, set e.g. `LLAMA_MODEL_PATH=/models/qwen2.5-7b-instruct-q4_k_m.gguf`.
- `local_qwen` is **keyless**: do not set `LLM_API_KEY`. For local inference,
  `external_model_called` stays **false** (nothing leaves the host) and the USD budget is
  bypassed (on-host generation is free).
- **Warm-up ping.** `BANZAI_WARMUP=1` (the default) sends one optional, best-effort,
  local-only 1-token request to the model at startup so the first real `/ask` is not paying
  the cold-load cost. It carries no user data, is not counted, and stays entirely on-host;
  set `BANZAI_WARMUP=0` to disable it.
- **Benchmark gate.** Setting `LLM_PROVIDER=local_qwen` makes it active for testing, but
  `local_qwen` becomes the **effective default** only after the VPS XL+ benchmark endorses
  it **and** `BANZAI_BENCHMARK_APPROVED=true`. Until then, `mock` remains the default and
  `degraded` remains the fallback.

---

## 8. Test that it loads

The `llama-local` service is internal-only (no published ports), so test it from
**inside** the Docker network — never expose a port to do so.

Start the profile:

```bash
cd /srv/banza-protocol/repo/infra/banza-network
COMPOSE_PROFILES=llama-local docker compose up -d llama-local
```

Watch it come up (CPU model load is slow; the healthcheck allows a 60s `start_period`):

```bash
docker compose logs -f llama-local
docker compose ps          # STATUS should reach "healthy"
```

Check llama.cpp's own health endpoint **internally** (from the banzai-api container, on the
internal network — the endpoint is not reachable from the host or the Internet):

```bash
docker compose exec banzai-api \
  curl -fsS http://llama-local:8080/health
```

> **M2.8B healthcheck note (ADR-036):** the `llama-local` container healthcheck uses
> `curl`, which is present in `ghcr.io/ggml-org/llama.cpp:server`; `wget` is **not** in that
> image, so the earlier `wget`-based probe never passed. The `/health` endpoint returns
> **503** while the model is still loading and **200** once it is ready — that is why the
> healthcheck allows a 60s `start_period`.

Then confirm BanzAI itself reports the local engine via its `/health` (proxied through the
edge), which should show `engine_state: local_qwen`, `external_model_called: false`, and an
`inference_location` of on-host, with `local_inference.enabled: true`. A `POST /ask`
response should carry `non_normative: true`, an `engine_state` of `local_qwen`, a
`sources_count` of up to 3 (local inference packs at most 3 excerpts — Section 6), and
`fallback` indicating whether the deterministic path was used.
See `docs/banzai/LOCAL_INFERENCE_RUNTIME.md` for the full endpoint contract.

If the model file is missing, corrupt, or the path is wrong, `llama-local` will fail its
healthcheck and BanzAI will **degrade** to the deterministic grounded answer — it will not
crash and it will not fabricate.

---

## 9. Remove or replace the model

**Replace** (new file / new quantization):

```bash
cd /srv/banza-protocol/repo/infra/banza-network
docker compose stop llama-local
# verify the new file's sha256 first (Section 4), then swap it in:
mv ./Qwen3-4B-Q4_K_M-new.gguf ./models/model.gguf
# update infra/banza-network/models/MODEL_SOURCE.txt with the new source/hash/licence
COMPOSE_PROFILES=llama-local docker compose up -d llama-local
```

Always re-verify the checksum before swapping, and always update `MODEL_SOURCE.txt` so the
provenance note matches what is actually running.

**Remove** (stop using the local model entirely):

```bash
cd /srv/banza-protocol/repo/infra/banza-network
docker compose stop llama-local
docker compose rm -f llama-local          # remove the container
rm -f ./models/model.gguf                 # delete the weights from the VM disk
```

Then fall back to a model-less mode (Section 10). Deleting the GGUF is safe: it exists only
on the VM's disk and was never in Git, so there is nothing to untrack.

---

## 10. Operating WITHOUT a model (the default)

**No model is required to run BanzAI.** The model-less path is the default and always
available:

- **`mock` (default).** Deterministic, offline, grounded answers with no model at all. This
  is the shipped default and remains so until the benchmark approves `local_qwen`.
- **`degraded` (runtime fallback).** If the local model is unavailable, times out, returns
  empty/invalid output, or the Rust post-response validator blocks it, BanzAI automatically
  returns the deterministic grounded answer instead. No fabrication, no crash.
- **`disabled`.** Local inference simply not active — the `llama-local` profile is off and
  `LLM_PROVIDER` is not `local_qwen`.

To run without a model (or to **roll back** from local inference immediately):

```bash
# Point BanzAI back at the deterministic default…
LLM_PROVIDER=mock            # in infra/banza-network/.env
# …and (optionally) stop the local model service:
docker compose stop llama-local
# then redeploy banzai-api
docker compose up -d banzai-api
```

Rollback is simple and immediate because `mock`/`degraded` are always present. Because the
`llama-local` service is behind a compose profile and is **not** in `banzai-api`'s
`depends_on`, leaving the profile off keeps the whole stack on the hosted/mock path with no
model on disk at all.

---

## 11. Security posture (why this is safe to run on-host)

- The model has **no** access to a shell, the filesystem, the network, PostgreSQL, internal
  tools, or secrets. Everything flows through the Rust control layer.
- The container is internal-only (`banza-data`, `internal: true`), publishes **no** ports,
  runs `read_only` with `cap_drop: ALL` and `no-new-privileges`, and mounts the weights
  read-only.
- **Injection defence:** retrieved sources and the user question are treated as **data, not
  instructions**. The Rust prompt builder wraps them in explicit `FONTES`/`PERGUNTA`
  boundaries and neutralises forged control tags. The system prompt, chain-of-thought,
  environment variables, stack traces and internal paths are never revealed.
- Enforcement: `make banzai-local-inference-check` (blocks any GGUF in Git, any external
  key/URL for local, any public llama.cpp port, a benchmark-ungated default) plus the
  compose validator and the standing boundary/agent guards.

---

*For runtime behaviour and the endpoint contract see `docs/banzai/LOCAL_INFERENCE_RUNTIME.md`;
for day-to-day operations see `docs/banzai/LOCAL_INFERENCE_RUNBOOK.md`; for the decision and
its rationale see [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md)
and [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md).*
