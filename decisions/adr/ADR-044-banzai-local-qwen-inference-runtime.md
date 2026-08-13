# ADR-044 — BanzAI Local Qwen Inference Runtime

- **Status:** Accepted
- **Date:** 2026-07

## 1. Context

BanzAI is the native, non-authoritative protocol agent (ADR-041): it guides, invokes
the deterministic engines and cites sources; the engines verify and the evidence proves.
Its language layer has, until now, been either a deterministic offline `mock` or an
optional hosted API (`deepseek`/`qwen`). A hosted API means prompts, retrieved excerpts
and metadata leave the host and depend on an external vendor and key.

This ADR introduces a fourth option: a **local** language layer — Qwen3-4B-GGUF Q4_K_M
executed on-host by `llama.cpp` (CPU), so BanzAI can generate natural-language answers
with **no external provider** and nothing leaving the machine. It does not change what
BanzAI *is*, what it may do, or where the protocol's authority lives.

## 2. Problem

- The only way to get fluent natural-language answers today is a hosted API (external
  dependency, data egress, per-token cost, a key on the VM).
- A local model must be added **without** eroding any boundary: it must not become
  normative, must not decide, and must never be exposed to the Internet.
- CPU inference is memory- and latency-sensitive; enabling it blindly on the serving VM
  could degrade the protocol services (website, verification-api, Postgres).
- The rules that make a completion safe (prompt construction, source-boundary injection
  defence, post-response validation, fallback) must be **deterministic and testable**,
  not left to the model — and, per ADR-037, must be Rust.

## 3. Decision

BanzAI gains a `local_qwen` provider: an internal-only, OpenAI-compatible `llama.cpp`
server on the Docker network. All safety-critical control logic (prompt building,
injection defence, post-response validation, fallback selection) is Rust
(`engines/banzai-api-kb` → WASM); the TypeScript/JS service is I/O glue. `local_qwen`
becomes the **effective default only after a real benchmark on the VPS XL+** endorses it;
until then it is opt-in/preview and `mock`/`degraded` remain the default and fallback.

> **BanzAI remains the native protocol agent; Qwen is only a local language generation layer.**

> **Qwen3-4B-GGUF Q4_K_M is the intended default local language model, but production default activation is benchmark-gated on the VPS XL+ profile.**

## 4. What the local runtime is

- **Model:** Qwen3-4B-GGUF, quantization **Q4_K_M**, **CPU** via **llama.cpp**, non-thinking
  mode, initial context 4096 (8192 only if the benchmark proves stability), max output 512,
  temperature 0.1–0.2, conservative `top_p`, concurrency 1, queue 1, timeout 45s.
- **Deployment:** a separate `llama-local` compose service, gated behind a compose profile,
  on the internal `banza-data` network, **no published ports**, read-only container,
  `cap_drop: ALL`, `no-new-privileges`, bounded CPU/memory, model bind-mounted read-only
  from a git-ignored volume. The GGUF is installed **manually** and **never** downloaded
  during build or deploy.
- **Control:** Rust owns retrieval selection, prompt construction, the source-boundary
  injection defence, the post-response validator and fallback; the model only drafts text
  from the approved context Rust hands it.

## 5. What the model must never do

> **The model is not normative and cannot create, approve, certify, license or govern protocol rules.**

- Qwen is not BanzAI, not a normative source, and does not decide participation. No
  operator is approved by BanzAI; operators demonstrate compatibility by verifiable
  evidence. In BANZA, participation is not approved; it is demonstrated.
- The model has **no** access to a shell, the filesystem, the network, PostgreSQL,
  internal tools or secrets. Everything passes through the Rust control layer.
- The system prompt, environment, chain-of-thought and any content outside the approved
  sources are never revealed.

> **Rust remains responsible for retrieval, source selection, prompt construction, limits, validation, fallback and safety.**

## 6. Enforcement

- **Rust control engine:** `engines/banzai-api-kb` exports `build_prompt_json` (rules +
  injection defence) and `validate_response_json` (blocks forbidden claims: certified
  operator, "BANZA aprova/licencia", "BanzAI decide", model-as-normative, system-prompt /
  chain-of-thought / key-material leakage). Native + WASM tested.
- **Guard:** `make banzai-local-inference-check` (`tools/check-banzai-local-inference.sh`,
  self-testing, CI) blocks any GGUF in Git, any external-provider key/URL, any public
  llama.cpp port, a benchmark-ungated default, or docs treating the model as normative.
- **Compose validation:** `validate-compose.sh` asserts `llama-local` is profile-gated,
  publishes no host port, is on the internal network only, runs read-only, and mounts the
  model read-only.
- **Boundary/agent guards:** `banzai-protocol-agent-check`, `public-surface-clean-check`,
  `postgres-data-boundary-check`, `identity-check`, `rust-rule-check` remain green.

## 7. Consequences

- BanzAI can run fully offline with a local language layer — no vendor, no key, no egress.
  `external_model_called` stays **false** for local inference; the USD budget applies only
  to hosted providers.
- Enabling local inference is a deliberate, gated operation: profile off by default, model
  installed manually, effective default only after `BANZAI_BENCHMARK_APPROVED=true`.
- If llama.cpp is unavailable, times out, returns empty/invalid, or the validator blocks
  the output, BanzAI degrades to the deterministic grounded answer — never a fabrication,
  never a crash.

> **If benchmarks show instability, excessive memory pressure or service impact, local inference must remain disabled or degraded until resources or model choice are revised.**

## 8. Alternatives considered

- **Hosted API only (status quo).** Rejected as the *only* option: external dependency,
  data egress, per-token cost, key on the VM. Retained as an option, not the sole path.
- **In-process weights inside the Node service.** Rejected: breaks the zero-dependency /
  no-GPU service contract, couples inference to the API process, and complicates resource
  isolation. A separate, sandboxed llama.cpp service is safer.
- **A larger model (Qwen3-8B) as the initial default.** Rejected for the 16 GB no-GPU
  envelope; documented only as a future benchmark, never the initial choice.
- **Validation/prompt logic in TypeScript.** Rejected per ADR-037 — safety-critical logic
  is Rust; TS is glue.

## 9. Relationship to invariants and prior ADRs

- ADR-041: BanzAI stays the native, non-authoritative agent — this ADR adds a language
  layer, not authority. ADR-037: the control logic is Rust. ADR-042: no financial data;
  the model never touches protocol-state or Postgres. Operator neutrality and the trust
  model are untouched: the model cannot certify, approve, license or federate.

## 10. References

- ADR-037 — Rust-first policy for official engines; ADR-041 — BanzAI as native protocol
  agent; ADR-042 — PostgreSQL as protocol-state store.
- `engines/banzai-api-kb/src/{prompt.rs,validate.rs}` — the Rust control logic.
- `services/banzai-api/src/{provider.js,pipeline.js,server.js,concurrency.js}` — the glue.
- `infra/banza-network/compose.yml` — the `llama-local` service (profile-gated, internal-only).
- `docs/banzai/LOCAL_QWEN_MODEL_SETUP.md`, `docs/banzai/LOCAL_INFERENCE_RUNTIME.md`,
  `docs/banzai/LOCAL_INFERENCE_RUNBOOK.md` — setup, runtime and operations.
