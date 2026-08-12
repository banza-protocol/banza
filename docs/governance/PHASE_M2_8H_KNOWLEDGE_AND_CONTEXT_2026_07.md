# Phase M2.8H — BanzAI Knowledge Expansion & Conversational Context

**Date:** 2026-07 · **ADR:** [ADR-048](../../decisions/adr/ADR-048-banzai-qwen-first-grounded-routing.md) (routing/context/examples) · **Scope:** `services/banzai-api`, `engines/banzai-api-kb`, `website`, guards — no protocol contract change, no infra change.

## 1. Root cause

After M2.8G (Qwen-first routing), the experience was still thin: answers were short, and follow-ups
like "me dá um exemplo aqui" fell to *insufficient* because (a) each question was routed in isolation
with **no conversation context**, and (b) the knowledge base had **no safe examples** (no manifest/
evidence/federation example to ground on). Qwen was active but under-fed.

## 2. Conversational context (Part 1)

A new context-aware route in Rust (`route.rs` → `route_with_context` / WASM `route_with_context_json`)
resolves anaphoric follow-ups. The frontend sends the last few turns; the backend extracts the previous
USER questions (max 2, capped, never stored); when the current question is a follow-up ("aqui", "isso",
"dá exemplo", "em JSON", "e em YAML", "explica melhor", "continua", "e para operador", "como ficaria"),
the engine merges the most-recent prior question into the retrieval query. **Safety is evaluated on the
raw current question first and again on the resolved query — context can never bypass a refusal, and
previous ANSWERS are never used as a normative source.** Per-answer metadata gains
`conversation_context_used`, `context_turns_used`, `previous_sources_reused`; the UI appends "· com
contexto" to the Qwen status line.

## 3. Knowledge expansion + safe examples (Parts 2–3)

Six illustrative, **non-normative** example entries were added, derived from the published contracts/
schemas and using the fictitious `operator.example` domain: operator manifest (JSON), federation
manifest extension, revocation list (BRL), key manifest, evidence bundle, and an *invalid* manifest
(with the reasons). Each answer is explicitly marked ILUSTRATIVO / NÃO-NORMATIVO and states it does not
certify, is not sufficient for production, and does not substitute the conformance suite. Prior M2.8G
grounded entries (federation, conformance, trust, invariants, ADRs) remain. `me dá um exemplo de um
ficheiro manifesto` now grounds on `example-operator-manifest` → Qwen; the follow-up `me dá um exemplo
aqui` resolves to it via context.

> The full auto-indexer over the entire doc corpus is deliberately **deferred** to a scoped follow-up:
> doing it safely (excluding secrets / operator / financial data / GGUF / logs, plus a chunk-scored
> retrieval redesign and a latency budget) warrants its own phase. This phase expands the curated,
> validator-checked knowledge — the safe, incremental path.

## 4. Source packing (Part 4)

An example/template request (`exemplo`, `example`, `json`, `yaml`, `manifest`) may pack up to **5**
local excerpts (schema snippet + supporting sources); other questions keep the tight ≤3 (ADR-045) to
bound CPU prefill. The char budget and deterministic (Rust) truncation are unchanged.

## 5. Prompt (Part 5)

Rule 4 of the compact system prompt now allows a **structured** answer (steps/bullets) and a **short
illustrative JSON/YAML example when the sources contain one**, always marked illustrative/non-normative
with `operator.example`. Reasoning stays disabled; tokens stay 384 (a 512 bump remains gated on its own
benchmark). The prompt stays compact (< 1400 chars).

## 6. Better insufficiency (Part 6)

The "insufficient" message now lists what BanzAI *can* answer and offers a concrete reformulation
("mostra um exemplo de manifest de operador", "como federar um operador?") instead of a bare refusal.

## 7. Verification

- Rust `route.rs` tests (18, incl. context + safety-not-bypassed) + `kb.rs` + prompt/validate: green.
- Backend node tests (75, incl. example grounds on Qwen, follow-up resolves via context, context never
  bypasses safety): green.
- Website vitest (176, incl. frontend sends history + "com contexto" label): green; `next build` green.
- New guard `make banzai-knowledge-quality-check` (drives the WASM; +CI) + full battery: green.
- Adversarial fuzz re-run to confirm no routing regression from the new example/context surface.
- Live validation on `https://banza.network/banzai/ask` with llama-local generation correlation.

## 8. Boundaries preserved

Model, tokens (384), timeout (60 s), reasoning (off) unchanged. `external_model_called=false`;
llama.cpp / PostgreSQL never exposed; no external provider. BanzAI stays non-normative; examples never
certify/approve/license and never substitute conformance. Rust still owns retrieval, routing, context,
source packing, validation, limits and fallback; TS/JS is glue/UI. No DNS/Cloudflare/TLS/Postgres/
secrets/trust-keys/operators/federation change.
