# BanzAI — Routing & Per-Answer Response Paths

> How BanzAI decides how to answer, and how every answer honestly reports the path it took.

- **Governing decisions:** [ADR-042](../../decisions/adr/ADR-042-banzai-qwen-first-grounded-routing.md) (Qwen-first routing) · [ADR-042](../../decisions/adr/ADR-042-banzai-per-answer-execution-path-metadata.md) (per-answer metadata) · [ADR-042](../../decisions/adr/ADR-042-banzai-disable-qwen-reasoning-prefix-warmup.md) (reasoning disabled)
- **Where it lives:** the routing policy is **Rust** (`engines/banzai-api-kb` → `route.rs`), executed by `services/banzai-api` (`pipeline.js` is thin glue)
- **Status:** implemented and deployed

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

---

## 1. Routing tiers (decided in Rust, from the question intent)

For a normal grounded question with sufficient local sources, the **local model (Qwen) is the
default**. The deterministic path is reserved for the cases below (in order):

| # | Tier | When | Model call? |
|---|------|------|-------------|
| 0a | **safety refusal** | prompt-injection / system-prompt / chain-of-thought / jailbreak request | no |
| 0b | **no local source** | retrieval finds insufficient grounding | no |
| 1 | **critical boundary** | explicit protocol-identity/guardrail question (e.g. "BANZA is an operator?", "does a PASS certify?") | no — vetted deterministic answer |
| 2 | **exact cache** | identical prior question (same provider/lang/mode/corpus) | no — served from cache |
| 3 | **semantic cache** | near-duplicate question | no |
| 4 | **budget gate** | hosted USD ceiling only — `local_qwen` bypasses it (on-host, ~zero marginal cost) | — |
| 5 | **grounded → Qwen** | sufficient sources → the local model answers the grounded query | **yes (local)** |
| 6 | **post-validation** | a completion that violates the guardrails is replaced by the deterministic grounded fallback (never served) | model called, output discarded |

Short conversation context (the last user turns) resolves anaphoric follow-ups into the retrieval
query; it **never** bypasses a safety refusal. Journey context (the current step) can broaden the
grounded set but never changes routing or safety.

## 2. Per-answer execution paths (shown to the user)

Every `/banzai/ask` answer carries safe telemetry (no prompt, no reasoning, no keys) that resolves to
one honest status label:

| Label (pt) | Meaning |
|---|---|
| `Gerado por Qwen local` | the on-host model generated **this** answer (`local_model_called=true`) |
| `Resposta determinística` | a vetted / grounded deterministic answer — no model call |
| `Resposta em cache (Qwen local)` | a previously Qwen-generated answer served from cache — no new call |
| `Evidência insuficiente` | no sufficient local source — safe "insufficient" answer, no model call |
| `Fallback seguro` | the local model was unavailable — deterministic answer from the sources (degraded) |
| `resposta do modelo substituída pela validação` | the model was called but its output failed the validator and was replaced |

In all paths nothing leaves the host: `external_model_called=false`, and the count of external/billable
model calls is always zero on the local path.

## 3. What this guarantees

- The global "Qwen local por omissão" badge never stands in for a specific answer — the per-answer
  label is the truth for that answer.
- A cache hit is never mislabelled as a live generation (`local_model_called` is gated on the
  this-answer signal, not on the stored result).
- Nothing leaves the host on any path.
