# ADR-048 — BanzAI: Qwen-first Grounded Routing & Deterministic Fallback

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-037 (Rust-first engines), ADR-041 (native protocol agent), ADR-044 (local Qwen runtime), ADR-045 (latency tuning), ADR-046 (reasoning off + warm-up), ADR-047 (384-token default), `engines/banzai-api-kb` (`route.rs`), `services/banzai-api` (`pipeline.js`, `knowledge.js`).

## 1. Context

Local Qwen inference is live as the effective default (ADR-044…047, activated M2.8D), and per-answer
transparency (M2.8F) proves, for each answer, whether the model was actually called. That transparency
surfaced a routing defect: many **valid grounded questions never reached Qwen**. They fell into the
deterministic engine, the cache, or an "insufficient sources" refusal.

Two root causes:

1. **Routing was driven by the entry's `critical` flag, not the question's intent.** The pipeline did
   `if (hit.critical) return deterministic(...)`. Any retrieval that landed on a `critical` entry —
   including via the generic keyword scorer's **word over-match** ("banza" + "operador" both hit) —
   short-circuited to a canned answer. So "como funciona a federação entre operadores?" collapsed onto
   the *"BANZA is not an operator"* entry and answered deterministically.
2. **Missing grounding for common topics.** There were no knowledge entries for federation,
   conformance or trust, so "como federar um operador?" retrieved nothing and returned *"insufficient
   evidence"* — even though the protocol has ample sources on the subject.

This contradicted the approved objective: **`local_qwen` is the effective default for grounded
answers.** BanzAI was behaving like a deterministic FAQ.

## 2. Decision

**Separate the routing decision (intent) from retrieval, and make Qwen the default for grounded
questions.** The routing policy is a new Rust module — `engines/banzai-api-kb/route.rs` — exposed to
the JS pipeline as `route(question) → { action, entry_id, intent, reason }`. The JS pipeline only
*executes* the decision (ADR-037; TS/JS is glue).

Routing tiers:

1. **Tier 0 — safety refusal.** Prompt injection, requests to reveal the system prompt, and requests
   to reveal the model's internal reasoning (chain-of-thought) → **no model call**, safe refusal.
   (A step-by-step explanation of a *protocol procedure* is legitimate and is NOT a refusal.)
2. **Tier 1 — critical-boundary intent.** Only an **explicit** boundary/identity intent is
   deterministic: *"BANZA is an operator / processes payments / holds funds"*, *"BANZA emits
   certificates / are there certified operators"*, *"BanzAI/Qwen certifies / approves / licenses /
   decides rules"*, *"is a conformance PASS a certificate"*, and the institutional-identity question
   about the creator/maintainer organization (kept deterministic so the organization ≠ protocol ≠
   agent distinction stays exact — see ADR-002/ADR-043). These return a vetted canned answer; **no
   model call**.
3. **Tier 2 — grounded → Qwen (DEFAULT).** Any normal question with sufficient sources — federation,
   operators, participation, conformance, evidence, trust, manifest, revocation, ADRs, architecture,
   protocol state, "what is BANZA", root keys, `/operators` meaning, limits — calls the local model,
   grounded on the retrieved sources, validated by Rust, citing its sources.
4. **Tier 3 — post-validation fallback.** A completion that violates the guardrails (invents
   operators, claims certification/approval/licensing authority, leaks `<think>`, or drifts off the
   sources) is **replaced** by the deterministic grounded answer; llama.cpp failure/timeout → degraded.
5. **Tier 4 — cache.** A previously Qwen-generated answer served from cache is labelled as cache and
   is **not** reported as a new model call (M2.8F: `local_model_called` gates on the this-answer signal).

**Knowledge additions.** Three non-critical grounded entries were added (`how-to-federate`,
`how-to-demonstrate-conformance`, `how-trust-works`) with real citations (spec/federation, ADR-038/
039/040, conformance suite). Their `answer` is both the model's grounding excerpt and the deterministic
fallback. The `critical` flag was removed from informational entries (root keys, `/operators` meaning,
limits), which are now grounded.

The retrieval scorer is **unchanged** — the fix is that routing no longer trusts a bare keyword match
to decide between deterministic and model. Adding keywords alone would not have fixed it; separating
intent from retrieval does.

## 3. Boundaries (unchanged)

- Model, tokens (384), timeout (60 s), reasoning (off), warm-up — all unchanged from ADR-044…047.
- `external_model_called` stays `false`; llama.cpp and PostgreSQL are never exposed; no external
  provider is added.
- BanzAI stays non-normative; the model is only the local language layer. Rust remains responsible for
  retrieval, scoring, prompt construction, validation, **routing policy** and fallback.
- Per-answer metadata (M2.8F) is preserved and extended with the routing `intent`.

## 4. Consequences

- Grounded protocol questions reach Qwen by default; the deterministic engine is reserved for the
  cases above. BanzAI is a grounded agent again, not an FAQ.
- The routing contract is testable and guarded (`make banzai-qwen-routing-check`, Rust `route.rs`
  tests, backend pipeline tests): grounded intents must call Qwen; critical-boundary intents must not;
  no-source/injection must not.
