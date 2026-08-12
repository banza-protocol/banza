# M2.7B — Home & Reference Consolidation Audit

**Date:** 2026-07-18 · **Phase:** M2.7B — Minimal Home & Complete Reference Consolidation

## Product decision
> A homepage **apresenta** o protocolo. A Referência Completa **explica** o protocolo. O BanzAI Workbench **executa** a verificação.

The homepage becomes minimal (hero → operator-architecture section → footer). All long
explanatory content is consolidated in the canonical reference (`website/content/BANZA_REFERENCIA.md`,
14 numbered chapters, served at `/referencia`, `/referencia/<capítulo>` and `/referencia/completa`).
The reference already covers every topic canonically; the bespoke top-level prose pages are the
"parallel long documentation" this phase eliminates by redirecting them to the reference.

## Homepage sections (website/app/page.tsx) → disposition

| Section | Disposition | Consolidated in reference |
|---|---|---|
| Hero (`<HeroEstado/>`) | **Keep** | — |
| `OperatorArchitectureSection` (após o hero) | **Keep** | — |
| `01 / DEFINIÇÃO` — O que o BANZA é | **Remove** | ch.1 O Que É o BANZA |
| `02 / ESTADO VERIFICÁVEL` + machine links | **Remove** | live page `/estado` (functional) + ch.6/13; footer keeps rotas |
| `03 / COMO FUNCIONA` — seis passos | **Remove** | ch.4 Arquitectura + operator-architecture section (home) |
| `04 / CONFIANÇA DO PROTOCOLO` | **Remove** | ch.5 Confiança |
| `05 / POR ONDE COMEÇAR` — audience cards | **Remove** | ch.1/8/9/12 + `/referencia` index |
| `06 / BANZAI` | **Remove** | ch.10 Sobre o BanzAI |
| `07 / ROTEIRO` | **Remove** | ch.13 Roteiro |
| Closing band (GitHub/Referência/Decisões/Estado) | **Remove** | global `SiteFooter` already renders on all non-`/banzai` routes |

Final homepage = **hero + operator-architecture section + global SiteFooter**.

## Top-level routes → disposition

**Redirect (bespoke prose page; topic covered canonically by the reference chapter):**

| Route | → Redirect to |
|---|---|
| `/o-que-e` | `/referencia/o-que-e` |
| `/porque-existe` | `/referencia/porque-existe` |
| `/arquitectura` | `/referencia/arquitectura` |
| `/confianca` | `/referencia/confianca` |
| `/conformidade` | `/referencia/certificacao` (ch.6 Conformidade e Evidência) |
| `/certificacao` | `/referencia/certificacao` (was → /conformidade; repointed direct) |
| `/federacao` | `/referencia/federacao` |
| `/operadores` | `/referencia/operadores` |
| `/governacao` | `/referencia/governacao` |
| `/roteiro` | `/referencia/roteiro` |
| `/programadores` | `/referencia/programadores` |
| `/faq` | `/referencia/faq` |

**Keep (functional surface, not parallel prose):**

| Route | Why kept |
|---|---|
| `/estado` | Live machine-route state mirror (verifiable, not prose) |
| `/decisoes` | ADR/RFC library (functional index; not duplicated prose) |
| `/banzai`, `/banzai/workbench` | The operational tool (Workbench-only verification) |
| `/referencia`, `/referencia/<cap>`, `/referencia/completa` | The reference itself — canonical |

No content is lost: every redirected page's topic is explained canonically in the reference chapter it
points to; the bespoke presentations are superseded by the single canonical reference (git history
preserves them). Redirect targets all exist (reference chapter routes) — no dead links.

## Navigation (website/lib/site.ts)
`navGroups` + `footerColumns` are repointed from the bespoke pages to the reference chapters and the
functional surfaces (`/estado`, `/decisoes`, `/banzai/workbench`, GitHub). Reference = official source;
Workbench = operational tool.

## Guard
New `make home-minimal-check` (`tools/check-home-minimal.sh`) + `identity-guard` CI job: the homepage
must contain only hero + the operator-architecture section (+ global footer), the single CTA
"Começar implementação", and none of the removed `NN / …` sections or audience cards; and none of the
removed-model vocabulary.

## Boundary
Static/deterministic; no BANZA CA / operator certificate / certified operator / central human approval /
certification-as-flow / CLI-Docker-GitHub-Actions as operator path. `/operators=[]`,
`production_certificates=false`, provider mock, `llm_calls=0` unchanged.
