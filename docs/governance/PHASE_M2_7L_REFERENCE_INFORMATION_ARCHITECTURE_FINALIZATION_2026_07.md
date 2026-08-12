# Phase M2.7L — Reference Information Architecture, Public Copy, ADR Index and Legacy Language Finalization

- **Date:** 2026-07-19
- **Branch:** `feat/m2-7l-reference-information-architecture-finalization-2026-07`
- **Deploy:** website-only + a strictly-scoped `verification-api` redeploy (one JSON note changed).

## Problem observed

PostgreSQL had been appended as the **last** reference chapter (15), reading as an appendix rather than
occupying its architectural place. The chapter sequence had grown organically; "Racional Estratégico"
was a thin standalone chapter; several public cards and prose still carried internal roadmap language
(M2/M3), certificate-as-active phrasing, and a tool-list "anti-path" narrative; and ADR-037–042 existed
as files but were not all represented in the public `/decisoes` index.

## Chapter order — old → new

| # | Old | New |
|---|---|---|
| 1 | O Que É o BANZA | O Que É o BANZA |
| 2 | Por Que o BANZA Existe | Por Que o BANZA Existe *(now contains the Racional Estratégico section)* |
| 3 | Princípios Fundamentais | Princípios Fundamentais |
| 4 | Arquitectura do Protocolo | Arquitectura do Protocolo |
| 5 | Confiança | **PostgreSQL — Estado Protocolar** |
| 6 | Conformidade e Evidência | Confiança |
| 7 | Federação | Conformidade e Evidência |
| 8 | Operadores | Operadores |
| 9 | Governação | Federação |
| 10 | BanzAI — Agente do Protocolo | Governança |
| 11 | Racional Estratégico | BanzAI — Agente do Protocolo |
| 12 | Recursos para Programadores | Recursos para Programadores |
| 13 | Roteiro | Roteiro de Maturidade |
| 14 | Perguntas Frequentes | Perguntas Frequentes |
| 15 | PostgreSQL — Estado Protocolar | *(moved to 05)* |

### Why the new sequence
Definition → problem → principles → architecture → **protocol state (PostgreSQL)** → trust → evidence →
operators → federation → governance → **BanzAI (after rule provenance/governance)** → developers →
maturity roadmap → FAQ. PostgreSQL sits with architecture (it is where verifiable protocol state lives);
BanzAI follows governance so the reader meets rule-provenance before the agent; developers come after the
full model; the maturity roadmap precedes the FAQ.

- **PostgreSQL moved to chapter 05.** No longer an appendix.
- **Roteiro → "Roteiro de Maturidade"** (chapter 13), FAQ last (14). Exactly 14 chapters.
- **Racional Estratégico merged** into chapter 02 as a section; `/referencia/racional` now permanently
  redirects (308) to `/referencia/porque-existe#racional-estratégico`. No content deleted, no route
  broken.
- All in-page anchors and §-cross-references remapped; all 41 anchor targets resolve. Two pre-existing
  double-hyphen anchors were fixed in passing. SVG footer §-references remapped (18 diagrams).

## Public copy cleaned
- Card summaries (CHAPTER_DEFS) rewritten to the canonical descriptions — no roadmap language, no
  certificate-as-active, no `livro-razão de partidas dobradas` (architecture card) or `compensação
  bilateral` (federation card), `signed protocol metadata` → `metadata assinada do protocolo`.
- Reference prose: vague `M2/M3` production-gate phrasing softened to production-conditions language
  outside the maturity chapter (which legitimately defines M1–M6); `/estado` metadata cleaned.
- Homepage, README, EN mirror and the reference: **tool-list anti-path narrative removed** and replaced
  with positive, architectural framing.

## Legacy language removed
Foi removida linguagem negativa de tooling das superfícies activas e do repositório activo. A comunicação
passa a ser positiva e arquitectural: BanzAI guia; os motores verificam; a evidência prova. No residual
Workbench / chat / assistant public identity remains; `/banzai/chat` and `/banzai/workbench` return 404
without redirect; `/banzai` is the canonical public entry.

## ADR index
ADR-037–041 metadata added to `website/lib/decisions.ts`; ADR-037 mirrored to
`website/content/decisions/adr/`; ADR-042 confirmed. `/decisoes` lists them and each
`/decisoes/adr-0NN` route renders (verified).

## Guards
- **New:** `make reference-information-architecture-check`
  (`tools/check-reference-information-architecture.sh`, self-testing, CI job) — canonical chapter order,
  PostgreSQL=05, FAQ=14, clean public cards, stable routes, and fragment-based detection of the tool-list
  narrative (no literal old formulation stored).
- Existing guards (public-surface-clean, postgres-data-boundary, banzai-protocol-agent, home-minimal,
  governance-docs-clean, svg-visual-system, svg-visual-quality, reference-svg) all green against the new
  copy.

## Tests / build / E2E
- 164 vitest pass (incl. new `referenceIA.test.ts` — 18 assertions; `postgresqlBoundary`/`nativeAgent`
  updated for the new positions); `next build` green (racional redirect + all chapter/ADR routes
  generated); `banzai-evidence` engine tests pass with the reordered corpus (WASM rebuilt).
- Browser E2E: 14-card grid, PostgreSQL=05, prev(postgresql)=Arquitectura / next=Confiança,
  `/referencia/racional` 308 → porque-existe#racional-estratégico, `/decisoes/adr-037..042` render,
  `/banzai` 200, `/banzai/chat` + `/banzai/workbench` 404, `/estado` 200, zero console errors.

## Services touched / untouched
- **Website:** rebuilt + redeployed. **verification-api:** scoped redeploy (one JSON NOTE changed to the
  pre-production/evidence wording). **postgres / reverse-proxy / banzai-api:** untouched. No DNS/TLS/
  Cloudflare/secret/`.env`/runtime-data change.

## Mandatory negative confirmations
- No active surface keeps the tool-list anti-path narrative.
- No active surface presents BanzAI as chat, assistant or Workbench.
- No active surface presents BANZA CA / certified operator / certificates as the active model.
- No active surface presents internal roadmap (M2/M3) as public card copy.
- PostgreSQL is not the last chapter and is not presented as a financial database.
- `/banzai/chat` does not exist and does not redirect.
- ADR-037–042 are in the public decisions index.
