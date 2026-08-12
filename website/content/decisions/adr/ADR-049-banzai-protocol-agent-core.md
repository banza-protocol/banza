# ADR-049 — BanzAI: Protocol Agent Core (operational intents, onboarding, documentary index)

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.9A
- **Supersedes:** none
- **Related:** ADR-037 (Rust-first engines), ADR-041 (BanzAI native protocol agent),
  ADR-044 (local Qwen runtime), ADR-048 (Qwen-first grounded routing),
  ADR-055 (Rust-first grounded synthesis), ADR-056 (definitive query core),
  `engines/banzai-doc-indexer`, `engines/banzai-query-core`

---

## 1. Context

BanzAI must be more than a thin FAQ. Legitimate **operational** questions — the clearest example being
`onde começo com o meu operador?` (where does an operator start?) — had no grounding coverage, so
retrieval returned nothing and the agent answered *"evidência insuficiente"* instead of guiding the
operator practically through the protocol.

The goal is an **operational protocol agent**: it understands operator intentions, guides onboarding,
explains the protocol in theory and practice, retrieves real documentation, uses schemas/ADRs/specs/
contracts/examples, produces checklists and illustrative examples, keeps conversational context, and
answers with the local model — while staying **non-normative**: it never certifies, approves, licenses,
decides federation, or invents protocol rules.

## 2. Decision

Establish a **Protocol Agent Core**: BanzAI is an operational, non-normative protocol agent that
understands operator intentions, guides onboarding, explains theory and practice, retrieves real
documentation, produces checklists and illustrative examples, and keeps conversational context — while
never certifying, approving, licensing, deciding federation, or inventing protocol rules. Rust owns
retrieval, routing, indexing, scoring, source packing, validation and fallback (ADR-037);
TypeScript/JavaScript stays glue/UI.

1. **Operational grounding.** Operational questions — the motivating example
   `onde começo com o meu operador?` (where does an operator start?) — ground on the local model with a
   practical, source-cited answer (numbered steps) instead of falling to an "insufficient evidence"
   refusal. Answers stay practical and non-normative.

2. **Documentary index (`engines/banzai-doc-indexer` → `doc-index.json`).** A build-time Rust indexer
   walks a curated, operator-first set of documentation roots and emits a bounded, metadata-rich index
   (path, title, section, anchor, source_type, tags, lang, hash, chunk, and schema/example/normative/
   operator-facing flags). It **excludes** secrets, `.env`, private keys, backups, logs, GGUF,
   `node_modules`, `target`, `.git` and any financial/operator data, and skips any file carrying a
   private-key marker. The index is embedded in the WASM engine; Rust scores it and returns the top-k
   chunks.

3. **Documentary enrichment.** Grounded answers are augmented with real documentation excerpts as extra
   citations, so BanzAI draws on the full protocol documentation, not only curated entries — while
   curated grounding keeps answers accurate and provides the deterministic fallback. Enrichment never
   runs for critical-boundary, safety or no-source paths and never changes routing.

4. **Contextual UI suggestions.** The frontend derives non-normative follow-up SUGGESTIONS (questions,
   never claims) from the question's operational intent.

## 3. Consequences

- `onde começo com o meu operador?` now grounds on the local model with a practical, source-cited answer
  — the reported gap is closed.
- BanzAI draws on the full protocol documentation (real doc excerpts), while curated grounding keeps
  answers accurate and provides the deterministic fallback.
- The documentary index (`doc-index.json`) is a durable, secret-free artifact consumed by the BanzAI
  query core (ADR-056) and grounded synthesis (ADR-055).
- Boundaries preserved: `external_model_called=false`; the model, llama.cpp and PostgreSQL are never
  exposed; no external provider; BanzAI stays non-normative; examples and guidance never certify,
  approve or license. Enforced by `make banzai-agent-quality-check` (+ CI) and the Rust/backend/frontend
  tests.
