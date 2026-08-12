# BANZA / BanzAI — Phase BX1.5A: Portuguese Copy Sweep (no "corpus") + Evidence Bundle Answer

**Date:** 2026-07-16
**Branch:** `fix/bx1-5a-banzai-portuguese-copy-no-corpus-2026-07`
**Scope:** Remove the word "corpus" from the public Portuguese copy of the BanzAI Workbench and make the
Assistente answer Evidence Bundle / Evidence Bundle Export questions correctly.

## Problem observed in production

Asking *"o que é Evidence Bundle Export?"* returned the fallback *"Não encontrei evidência suficiente no
corpus local do demo…"* — two issues: (1) "corpus" is not appropriate public Portuguese UI language, and
(2) the Assistente should already explain the Evidence Bundle (it is part of the Workbench).

## New language rule

**Do not use "corpus" in the public Portuguese UI.** Replacements:
`corpus` → `base de conhecimento`; `corpus local do demo` → `fontes locais da demonstração`.

## Occurrences found and classified

| Class | Location | Action |
|---|---|---|
| `PUBLIC_COPY_REPLACE` | `engines/banzai-evidence/src/lib.rs` (7 answer strings, incl. the fallback), `src/index.rs` (2 limit strings) | replaced → "base de conhecimento" / "fontes locais da demonstração" |
| `PUBLIC_COPY_REPLACE` | `website/app/banzai/page.tsx` (6), `website/content/BANZA_REFERENCIA.md` + `docs/reference/pt/completa.md` (6 each, kept in parity) | replaced |
| `INTERNAL_TECHNICAL_OK` | `load_corpus()` and `//!`/`///` comments in banzai-evidence; `CORPUS_HASH` and comments in `services/banzai-api` | kept (internal code identifiers, English) |
| `TEST_PATTERN_UPDATE` | `tests/kb.rs` fallback CASE phrase; new `no_answer_uses_the_word_corpus` test | updated / added |
| `SVG-EN / DOC-HIST` | English `<desc>`/`<text>` in `website/public/diagrams/banzai/*.svg`; English reference (`docs/reference/en/complete.md`); historical phase reports | kept (English term of art / out of PT scope / historical) |

**Result:** zero public **Portuguese** copy contains "corpus".

## Fallback fixed

`Não encontrei informação suficiente nas fontes locais da demonstração para responder com confiança.`
(serious tone, no "corpus", `llm_calls = 0`.)

## Evidence Bundle answer intent

The `evidence_bundle` intent (BX1.5) was enriched and its keywords broadened (`evidence bundle export`,
`para que serve`, `o que vai no`, `substitui a banza ca`, `usar evidence bundle`, `pacote de evidência`).
The answer now explicitly lists the components:

> O Evidence Bundle é um pacote de evidência técnica gerado pelo BanzAI Workbench para reunir os
> resultados de SimB pre-review, Conformidade L0, verificação de Traces e Trust & BRL, com as versões das
> ferramentas, hashes de integridade, citações, limitações e o estado de readiness. Serve para preparar
> uma submissão técnica para revisão pela BANZA CA. … Não é certificado, não é aprovação e não substitui
> a BANZA CA.

Citations: `bundle` (Evidence Bundle / Workbench), `simb`, `cert`, `estado`. The doc
[`EVIDENCE_BUNDLE.md`](EVIDENCE_BUNDLE.md) already exists (BX1.5).

## UI

`ASSISTANT_SUGGESTIONS` now leads with Evidence Bundle questions ("O que é Evidence Bundle?", "O que vai
no Evidence Bundle?", "Evidence Bundle é certificado?", "Estou pronto para revisão BANZA CA?"). The
Evidence Bundle tab keeps its boundary note ("Não é certificado. Não é aprovação. A revisão final
pertence à BANZA CA.") and Portuguese buttons ("Gerar bundle", "Exportar JSON").

## Tests

- `banzai-evidence`: `evidence_bundle_export_is_answered_not_fallback`,
  `evidence_bundle_answer_has_expected_shape`, `no_answer_uses_the_word_corpus`; updated the fallback CASE.
- website `workbench.test.ts`: public copy contains no "corpus"; suggestions include "Evidence Bundle".

## Verification

- Rust: `cargo fmt`/`clippy`/`test` (banzai-evidence 3+5+6+3) ✓; `rust-engine`/`rust-rule`/`final-closure`/
  `purity`/`identity`/`invariant`/`reference-svg` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (25) ✓.
- Live browser E2E: "o que é Evidence Bundle Export?" → answered (SimB/L0/hashes/BANZA CA), **no
  "corpus"**; "Evidence Bundle é certificado?" → *não é certificado / evidência técnica*; out-of-scope →
  "fontes locais da demonstração" fallback; **no "corpus" anywhere on the page**; `llm_calls=0`; zero
  external calls.

## Boundary

Evidence Bundle is presented as technical evidence, never a certificate or approval; BanzAI does not
certify/approve/emit. No provider, no external calls, `/operators=[]`, `production_certificates=false`.
