# Phase R3 — banzai-api knowledge engine → Rust (banza side) (2026-07)

**Program:** R1–R6 Rust-first engine migration (ADR-037). **Repo:** `banza-protocol/banza`.
**Branch:** `feat/r3-rust-banzai-api-knowledge-wrapper-2026-07`. **Companion:** the banzai-repo Rust core
(`banza-protocol/banzai` PR — `engines/banzai-core`).

## Context

R1's `rust-rule-guard` surfaced `services/banzai-api/src/knowledge.js` as a legacy JS retrieval engine
(`normalize`, `scoreEntry`, `retrieve`, `retrieveTopK`). R3 addresses it.

**Key finding:** `banzai-api` is a **live public service** — nginx routes `banzai.banza.network`
(`infra/banza-network/nginx/conf.d/banza.conf`) to `banzai-api:8091`, and its request pipeline
(`pipeline.js`, `provider.js`, `server.js`) uses `knowledge.js`'s `retrieve()`/`normalize()`/
`buildContext()`/`CORPUS_HASH` at runtime. It is mock-only (`llm_calls=0`, no external model), but it is
not dormant.

## Decision (honest, rule-compliant)

The canonical retrieval/normalization/scoring is now **Rust**:
- `banza engines/banzai-evidence` — the website chat engine (R2, WASM), and
- `banzai engines/banzai-core::search` — the BanzAI-repo core (R3).

Migrating the **live** `knowledge.js` to actually execute Rust would require rebuilding and
**redeploying the `banzai-api` container** (adding a Rust binary/WASM + a Node loader). The R3 rules
explicitly forbid recreating `banzai-api` without separate authorization ("não recriar banzai-api…";
"se `services/banzai-api` mudar: não recriar automaticamente sem autorização específica; se for
necessário, preparar plano separado"). Gutting a live service's source without the matching runtime is
also unsafe (a later rebuild from half-migrated source would break the live API).

Therefore R3 does the safe, honest thing:

1. **Deprecate** `knowledge.js` as an engine — a banner names the canonical Rust engines and forbids new
   scoring/matching logic.
2. **Reclassify** it in `docs/governance/rust-first-legacy-allowlist.json` as
   `LEGACY_ALLOWLIST_KEEP_TEMPORARY`, with the removal condition = an authorized `banzai-api` rebuild.
3. **Do not** rewrite the algorithm or redeploy `banzai-api` in R3.

This keeps the guard honest (the JS engine is tracked, not hidden or falsely "migrated"), prevents new
JS engines, and defers the live swap to its proper authorized-deploy plan.

## Separate deploy plan (for a future, authorized phase)

- Build `engines/banzai-evidence` (or a small nodejs-target WASM) into the `banzai-api` image.
- Replace `knowledge.js`'s `normalize`/`scoreEntry`/`retrieve*` with calls into the Rust engine; keep
  `SOURCES`/`ENTRIES` as data and `buildContext`/`CORPUS_HASH` as thin glue.
- Rebuild + redeploy **only** `banzai-api` (preserving reverse-proxy/verification-api/website/postgres),
  under explicit authorization.
- Then remove `knowledge.js`'s algorithm and drop the allowlist entry.

## Verification

- `make rust-rule-check` PASS (knowledge.js still allowlisted, now accurately classified; 0 blocked).
- `make purity-check` / `identity-check` / `invariant-check` PASS. The change is a comment banner +
  allowlist reason + this report — **no code logic changed, no service redeployed, no website change**.

## Confirmations

- No VERSION change (1.0.0). No M2, operator, certificate. `/operators=[]`,
  `production_certificates=false` untouched. No OpenAPI/contracts/conformance change.
- No provider real / Qwen / DeepSeek activated; `llm_calls=0`, `external_model_called=false`. No GPU.
- No secrets/`.env`. No DNS/Cloudflare/TLS/Postgres. **No `banzai-api` redeploy**; no website deploy
  (website unchanged). Operators remain technology-neutral.
