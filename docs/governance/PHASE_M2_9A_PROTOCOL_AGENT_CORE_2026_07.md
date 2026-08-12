# Phase M2.9A — BanzAI Protocol Agent Core

**Date:** 2026-07 · **ADR:** [ADR-049](../../decisions/adr/ADR-049-banzai-protocol-agent-core.md) · **Scope:** `engines/banzai-api-kb`, `engines/banzai-doc-indexer` (new), `services/banzai-api`, `website`, guards — no protocol contract change, no infra change.

## 1. Root cause

After M2.8x, BanzAI still behaved like a deterministic FAQ. Legitimate **operational** questions fell to
*"evidência insuficiente"* — the reported example, `onde começo com o meu operador?`, had **no knowledge
entry and no keyword coverage**, so retrieval returned nothing → `no_source` → insufficient. The agent
could not guide an operator practically.

## 2. Operational intent (Part 2)

A fine-grained, LABEL-ONLY classifier in Rust (`route.rs` → `operational_intent`) tags grounded questions
(`operator_onboarding`, `operator_manifest`, `federation_how_to`, `conformance_evidence`,
`trust_evaluation`, `revocation`, `evidence_bundle`, `schema_example`, `implementation_steps`,
`state_check`, `governance_reference`, `banzami_banza_banzai_distinction`, `debugging`,
`concept_explanation`). It never changes the action — grounded questions still route to `qwen`;
`critical_boundary` / `safety_refusal` / `no_source` are decided BEFORE it runs. Purely additive, so it
carries zero routing-regression risk.

## 3. Operator onboarding playbook + operational entries (Parts 1, 3)

Two grounded entries were added to the curated KB, derived from real protocol sources (harvested from
`docs/reference/getting-started.md`, `spec/federation/*`, `conformance/README.md`, contracts):

- **`operator-onboarding`** — the six-step practical path (read spec → contracts → invariants → operator
  manifest at `/.well-known/banza/operator.json` → run the conformance suite → publish evidence), with
  broad keyword coverage (`onde começo`, `primeiros passos`, `quero implementar um operador`, …).
- **`implementation-steps`** — the financial invariants an operator implements (INV-LEDGER/WALLET/SETTLE/
  IDEM/RECON/QR, ADR-006 double-entry).

Both are practical (numbered steps) and non-normative: BanzAI guides — it never certifies, approves,
licenses or decides federation. `onde começo com o meu operador?` now grounds on Qwen with
`operator_onboarding` intent — the reported bug is fixed.

## 4. Documentary index (Part 4)

A build-time Rust indexer — **`engines/banzai-doc-indexer`** — walks a curated, operator-first set of doc
roots and emits a bounded, metadata-rich `doc-index.json` (path, title, section, anchor, source_type,
tags, lang, hash, chunk, schema/example/normative/operator-facing flags). It **excludes** secrets, `.env`,
private keys, backups, logs, GGUF, `node_modules`, `target`, `.git` and financial/operator data, and skips
any file with a private-key marker. ~578 chunks (~366 KB), balanced across reference/spec/federation/
contracts/ADR/RFC/governance. The index is embedded in the WASM engine (`include_str!`); Rust scores it
(`retrieve_doc_chunks`) and returns top-k chunks.

> Design note: the index is used ONLY to ENRICH the grounded Qwen context with real doc excerpts — it never
> drives routing, and the curated entries remain the primary grounding AND the deterministic fallback. This
> delivers "documentação completa" without destabilizing the carefully-tuned routing contract.

## 5. Protocol tools + source packing (Parts 5, 6)

The "protocol tools" (explain concept, onboarding plan, manifest/evidence example, federation/conformance/
trust steps, state check, boundary answer) are realized as the intent → source-selection → context → Qwen →
validate → metadata pipeline, keyed on the operational intent. Packing is intent-based: operational/example
intents pack a broader grounded set (≤5 excerpts); simple/concept questions keep the tight ≤3 (ADR-045). For
a **local grounded** answer, up to two real doc excerpts (own 600-char budget, latency-neutral) are appended
as extra citations — gated by `BANZAI_DOC_ENRICH` (default on), never for critical/safety/no-source.

## 6. Answers + UI (Parts 7, 8)

The compact system prompt (still < 1400 chars, reasoning off, 384 tokens) asks for practical,
numbered/checklist answers with a suggested next step for operational questions. The frontend derives
contextual follow-up SUGGESTIONS (questions, never claims) from the operational intent, rendered as
clickable chips; the per-answer execution-path label (M2.8F) is unchanged.

## 7. Verification

- Rust `route.rs` tests (onboarding→qwen/operator_onboarding; operational intents; boundaries hold) +
  `kb.rs` (doc index populated & secret-free; empty for off-topic) + prompt/validate: green.
- Backend node tests (78, incl. onboarding reaches the model, enrichment is additive, enrichment gated/off
  for critical): green.
- Website vitest (178, incl. operational suggestions + no suggestions on insufficient) + `next build`: green.
- New guard `make banzai-agent-quality-check` (drives the WASM; +CI) + full guard battery: green.
- Adversarial routing fuzz (359 probes) → round-6 hardening with Rust regression tests:
  - **Safety (H1/L2):** injection/jailbreak/exfil that rode on an operational tail now refuse —
    added role-break/"mode" jailbreaks (developer/god/DAN/no-filters/roleplay/pretend), more override
    verbs (forget/desconsidera/apaga/anula) + objects (the above / your rules / guidelines you follow),
    instruction/config exfil, and "thinking process" reasoning-reveal. (Bare "as regras" was
    deliberately NOT added — it is legit protocol content.)
  - **Boundaries (H2):** `banza_is_an_operator_q` tolerates neutral qualifiers (act/atua/payment/
    protocol) AND excludes onboarding verbs (build/implement/run/launch a BANZA operator → onboarding,
    not the identity boundary); existence questions tolerate an intervening adjective ("how many
    certified operators exist?"); authority verbs add decide-who-passes / grant-a-license / normative;
    the pass=certificate arm catches the "passing conformance" gerund.
  - **Scorer precision (M1):** `score_entry` now dedupes matched words, filters grammatical stopwords,
    and matches single-word keywords as whole words; the dangerous bare currency/common keywords
    (brl/qr/trust/saldo/carteira/…) were pruned — so off-topic questions ("BRL to USD", "chocolate
    cake", "jet engine") no longer ground.
  - **Coverage (M2/M4):** EN onboarding/conformance/ADR paraphrases ground; an onboarding-only
    intent fallback grounds recognized onboarding phrasings even when keyword retrieval misses.
  - Confirmation re-fuzz (round 7) run after the fixes.
- Live validation on `https://banza.network/banzai/ask` with llama-local generation correlation.

## 8. Boundaries preserved

Model, tokens (384), timeout (60 s), reasoning (off) unchanged. `external_model_called=false`; llama.cpp /
PostgreSQL never exposed; no external provider. BanzAI stays non-normative; guidance/examples never
certify/approve/license and never substitute conformance. Rust owns retrieval, routing, indexing, scoring,
source packing, validation, limits and fallback; TS/JS is glue/UI. No DNS/Cloudflare/TLS/Postgres/secrets/
trust-keys/operators/federation change.
