# Phase R2 — Rust BanzAI Evidence Engine (2026-07)

**Program:** R1–R6 Rust-first engine migration (ADR-037). **Base:** main `4ed4c6a` (post-R1).
**Branch:** `feat/r2-rust-banzai-evidence-engine-2026-07`. **Repo:** `banza-protocol/banza`.

## Objective

Migrate the BanzAI Chat engine from TypeScript (`website/components/home/banzaiKb.ts`) to **Rust**,
compiled to **WASM**, so the live chat computes its answers in Rust. TypeScript is reduced to a thin
adapter that loads the engine and renders its JSON. No LLM, no network, no GPU (`llmCalls=0`,
`externalModelCalled=false`).

## What shipped

**`engines/banzai-evidence`** (Rust crate, native + WASM):

- `src/lib.rs` — the ported engine: normalization (NFD + diacritic strip), guardrails (bypass,
  certification-refusal, production-code, external-approval, market, legal), ~40 intents, the decision
  library (ADR-002/003/004/026/027/028/029) with separator-agnostic `find_decision`, citation
  composition, the "insufficient evidence" fallback, and the `KbAnswer` model (intent, kind, text,
  cites, links, limits, followUps, evidence, engine, engineVersion, llmCalls=0, externalModelCalled=false).
- `src/index.rs` — the **static evidence index** (PART 4): the canonical PT reference is embedded via
  `include_str!` (self-contained in WASM); source classification, chunking, keyword extraction,
  deterministic auditable scoring (`exact_adr_match`, `technical_token_match`, `title_match`,
  `tag_match`, `body_match`, `status_route_boost`), retrieval and evidence-bundle generation, plus a
  negation-aware forbidden-claim validator and a citation allowlist.
- `src/bin/cli.rs` — CLI: `answer`, `search`, `build-index`, `check`, `stats`.
- `tests/kb.rs` — the R2 eval suite (ports the H7 battery + retrieval cases + global gates): intent,
  kind, required phrase, required citation, link allowlist, forbidden-positive-claim, `llmCalls=0`.
- WASM boundary: `#[wasm_bindgen] answer_query(query) -> JSON`. Built with `wasm-pack --target web`
  to `website/lib/wasm/` (476 KB `.wasm`, embeds the corpus).

**Website adapter** (`website/components/home/banzaiKb.ts`): reduced from a 379-line engine to a
~70-line adapter — lazily loads the WASM module and parses `answer_query`. No matching, normalization,
scoring, decision selection or eval logic remains in TypeScript. `BanzaiChat.tsx` and `HeroEstado.tsx`
now `await banzaiKb(q)`.

**Eval scripts**: the two Node evals (`banzaiKb.check.mjs`, `banzaiKb.eval.mjs`) are **superseded** by
the Rust `cargo test` suite (proven parity) and removed; `package.json` `check:kb`/`check:kb:eval`/
`check:banzai` now invoke `cargo test` on the crate (Node is a wrapper). CI: `.github/workflows/rust-engines.yml`.

## Integration decision (WASM canonical)

Per the approved plan, the engine compiles to WASM and the website calls it at runtime. Next 15
(webpack 5, `output: standalone`) emits the `.wasm` to `.next/static/media/…` via
`new URL(..., import.meta.url)`; the standalone node server serves it same-origin. No Rust toolchain is
needed in the website Docker image (the prebuilt `.wasm`/glue are committed).

## Verification

- **Rust**: `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` (engine eval suite: intents,
  refusals, ADR parsing variants, retrieval, gates) — all PASS. `banzai-evidence check` PASS.
- **Website**: `npm run build` PASS (chat routes build; wasm asset emitted). `tsc --noEmit` clean.
- **Browser (dev preview)**: loaded `/banzai/chat`; asked "Certifica o meu operador." → the Rust engine
  returned the certification **refusal** ("não certifica, não aprova") with citations `/certificates`,
  `/operators`, `/referencia/certificacao`, `/referencia/banzai`. Network log: the WASM glue + binary
  load from same-origin `/_next/static`; **no external/model call** (llmCalls=0 at the wire).
- **Guard**: `make rust-rule-check` PASS — `banzaiKb.ts` is now a permitted adapter; no new non-Rust
  engine. `purity`/`identity`/`invariant`/`reference-svg` PASS.

## Confirmations

- `llmCalls=0`, `externalModelCalled=false` — no LLM/provider/Qwen/DeepSeek/GPU/external call.
- No VERSION change (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` untouched. No contracts/OpenAPI/conformance change. No secrets/`.env`.
- **No `banza-protocol/banzai` change.** Operators remain technology-neutral.
- The TS engine was **replaced**, not merely hidden: `banzaiKb.ts` no longer contains any algorithm.

## Follow-ups (next phases)

- **R3** — standalone Rust eval crate + the BanzAI-repo Rust core (orchestrator/routing/guards) +
  migrate `services/banzai-api/knowledge.js`.
- The website evidence panel ("Fontes encontradas") can surface `KbAnswer.evidence` (already produced by
  the engine) in a later UI pass — R2 keeps the existing panel behaviour to minimise risk.
