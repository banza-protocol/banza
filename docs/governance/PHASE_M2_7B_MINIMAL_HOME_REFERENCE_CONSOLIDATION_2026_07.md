# Phase M2.7B — Minimal Home & Complete Reference Consolidation

**Date:** 2026-07-18 · **Branch:** `feat/m2-7b-minimal-home-reference-consolidation-2026-07`
**Type:** `refactor(website)` — information-architecture consolidation (website-only)

## Product decision
> A homepage **apresenta** o protocolo. A Referência Completa **explica** o protocolo. O BanzAI Workbench **executa** a verificação.

## Home — before / after
- **Before:** hero + `OperatorArchitectureSection` + seven long sections (`01/DEFINIÇÃO`, `02/ESTADO
  VERIFICÁVEL`, `03/COMO FUNCIONA`, `04/CONFIANÇA DO PROTOCOLO`, `05/POR ONDE COMEÇAR` audience cards,
  `06/BANZAI`, `07/ROTEIRO`) + a closing links band.
- **After:** **hero → operator-architecture section → global SiteFooter.** `website/app/page.tsx` renders
  only `<HeroEstado/>` + `<OperatorArchitectureSection/>`; the footer is the layout's `SiteFooter`.

## Sections removed from the home
`01/DEFINIÇÃO`, `02/ESTADO VERIFICÁVEL` (+ machine-links block), `03/COMO FUNCIONA` (seis passos),
`04/CONFIANÇA DO PROTOCOLO`, `05/POR ONDE COMEÇAR` (audience cards: auditores/operadores/programadores/
investidores/comunidade/decisões), `06/BANZAI`, `07/ROTEIRO`, closing band. All const data
(`IS`, `IS_NOT`, `HOW_IT_WORKS`, `AUDIENCES`, `ROADMAP`, `MACHINE_LINKS`) removed.

## Consolidation in the reference
The canonical reference (`website/content/BANZA_REFERENCIA.md`, 14 numbered chapters, served at
`/referencia`, `/referencia/<capítulo>`, `/referencia/completa`) already explains every removed topic:

| Removed home content | Canonical home in the reference |
|---|---|
| Definição / o que é | ch.1 O Que É o BANZA |
| Como funciona / seis passos | ch.4 Arquitectura + the home operator-architecture section |
| Confiança do protocolo | ch.5 Confiança (Trust Root, delegated keys, signed protocol metadata, registry, Open Trust Evaluation) |
| Conformidade / operadores | ch.6 Conformidade e Evidência, ch.8 Operadores |
| BanzAI | ch.10 Sobre o BanzAI |
| Roteiro | ch.13 Roteiro |
| Programadores / FAQ / governança / federação | ch.12 / ch.14 / ch.9 / ch.7 |
| Estado verificável / rotas públicas | live functional page `/estado` (kept) |
| Decisões (ADR/RFC) | live functional page `/decisoes` (kept) |

The 14-chapter structure was **not** renumbered (that would break existing anchors, chapter routes and
`CHAPTER_DEFS`); the reference is already the complete consolidated document.

## Pages redirected → reference (bespoke prose pages superseded)
`/o-que-e`→`/referencia/o-que-e`, `/porque-existe`→`/referencia/porque-existe`,
`/arquitectura`→`/referencia/arquitectura`, `/confianca`→`/referencia/confianca`,
`/conformidade`→`/referencia/certificacao`, `/certificacao`→`/referencia/certificacao`,
`/federacao`→`/referencia/federacao`, `/operadores`→`/referencia/operadores`,
`/governacao`→`/referencia/governacao`, `/roteiro`→`/referencia/roteiro`,
`/programadores`→`/referencia/programadores`, `/faq`→`/referencia/faq`.

**Kept (functional, not parallel prose):** `/estado` (live state), `/decisoes` (ADR/RFC library),
`/banzai` + `/banzai/workbench` (tool), `/referencia*` (the reference).

## New navigation
`website/lib/site.ts` `navGroups` + `footerColumns` repointed to reference chapters + functional
surfaces (Reference = official source; Workbench = operational tool). All in-site inbound links to the
redirected routes were repointed to their canonical targets (home architecture-section CTA, `/estado`,
`/decisoes`, `/banzai`, `not-found`, reference chapter cross-links). Sitemap drops the redirected routes
and lists only canonical/functional URLs + reference chapters. No dead links; internal links avoid the
redirect hop.

## Hero CTA
Single primary CTA **"Começar implementação"** (solid BANZA `btn-bordo`) → `/banzai/workbench` (M2.7A).

## Guard
New `make home-minimal-check` (`tools/check-home-minimal.sh`) + `identity-guard` CI job: self-testing;
the homepage must render only hero + operator-architecture section, keep the single CTA, and contain
none of the removed sections/cards or removed-model vocabulary.

## Tests / checks
- 17 make guards green (incl. new `home-minimal-check`, self-tested); `type-check`; vitest 115/115;
  `next build`.
- Browser E2E: home = hero + architecture + footer, removed sections absent, single CTA →
  `/banzai/workbench`, no overflow at 375px, zero console errors; `/confianca`→`/referencia/confianca`
  and `/programadores`→`/referencia/programadores` redirect; `/referencia/completa` renders all
  consolidated chapters with working anchors (`5-confiança`, `6-conformidade-e-evidência`, `13-roteiro`,
  `10-sobre-o-banzai`, `8-operadores`) and side nav.

## Adversarial review
Simplicity ✓ (home is hero + arch + footer). Consolidation ✓ (reference covers all topics; no dead
links; bespoke prose superseded, preserved in git). Navigation ✓ (all internal links canonical;
redirects for external/bookmarked; anchors resolve). Active model ✓ (no BANZA CA / operator certificate /
central approval / operator CLI-Docker path — home + site.ts clean, guards green). Workbench ✓ (CTA →
`/banzai/workbench`).

## Confirmações negativas
`/operators=[]`, `production_certificates=false`, provider mock, `llm_calls=0`, no external calls; no
BANZA CA / operator certificate / certified operator / central human approval / certification-as-flow;
no CLI/Python/Docker/GitHub-Actions as operator path; no operator created/accepted/approved/certified; no
certificate/licence issued; no real federation/external integration; no payments/settlement/funds;
`.env`/DNS/Cloudflare/TLS/Postgres/secrets untouched; deploy website-only.
