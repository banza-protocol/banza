# BanzAI — Local Knowledge & Documentary Index

> Where BanzAI's answers are grounded. Everything is local to the host; there is no external retrieval.

- **Governing decisions:** [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md) (grounded routing + conversational context) · [ADR-036](../../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md) (documentary index)
- **Where it lives:** retrieval/normalization/scoring are **Rust** (`engines/banzai-api-kb`); the documentary indexer is **Rust** (`engines/banzai-doc-indexer`); `services/banzai-api/src/knowledge.js` holds only curated DATA + thin glue
- **Status:** implemented and deployed

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

---

## 1. Two grounding sources

1. **Curated entries** (`knowledge.js`): source-anchored answers for the questions BanzAI must answer
   correctly, each citing real protocol documents (ADRs, contracts, invariants, reference, schemas).
   These are the primary grounding and the deterministic fallback.
2. **Documentary index** (`engines/banzai-doc-indexer`, M2.9A): real protocol-doc excerpts (chunked)
   that **additively** enrich a grounded local answer — the curated top entry stays primary. Gated by
   env; only approved chunks (the indexer excludes secrets and forbidden operator brands).

## 2. What is indexed

ADRs, RFCs, protocol contracts, the reference (BANZA_REFERENCIA), invariants, schemas and curated
illustrative examples (operator manifest, evidence, trace). Examples are **illustrative and
non-normative** and use the fictitious `operator.example` domain.

## 3. Exclusions (never indexed / never accepted as evidence)

- secrets, private keys, credentials, tokens, financial data;
- specific commercial operator brands (contamination filter);
- anything that would make the model a normative source.

## 4. Conversational context (M2.8H)

The last few **user questions** (bounded, capped, never stored) are sent so the Rust router can resolve
anaphoric follow-ups ("dá um exemplo aqui", "e em JSON?") into a retrieval query. Context never bypasses
a safety refusal, and prior answers are never treated as a normative source.

## 5. Grounding outcome

If retrieval finds sufficient sources, the grounded query goes to the local model (Qwen-first). If not,
BanzAI returns a safe "insufficient sources" answer — it does not invent protocol state. See
[RESPONSE_PATHS.md](RESPONSE_PATHS.md).
