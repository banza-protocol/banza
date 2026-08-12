# Reference Introductory Source Consolidation Report (M2.19G.2 §27, §42)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**

---

## 1. The single canonical introductory definition

There is now exactly **one** canonical introductory definition of BANZA: the reference chapter
`/referencia/o-que-e`.

- **Content source:** `website/content/BANZA_REFERENCIA.md`, chapter 1 — `## 1. O Que É o BANZA` (heading at
  line 97).
- **Renderer:** `website/app/referencia/[capitulo]/page.tsx` (chapter route).
- **Canonical URL:** `https://banza.network/referencia/o-que-e`.

## 2. The duplicate that was removed

The standalone `/o-que-e` editorial page (`website/app/o-que-e/page.tsx`) was a **second** introductory
definition ("Um protocolo financeiro aberto — regras, não um produto.", the "O QUE O BANZA NÃO É" cards, the
"TRÊS CAMADAS, UMA INTERFACE" intro). It is deleted. Its own copy already deferred to the reference chapter
("A definição canónica e completa … vive na Referência" + a `MoreLink` to `/referencia/o-que-e`), so removing it
eliminates the duplication without losing canonical content.

The Home now carries only the **short** definition (the hero paragraph, see `HOME_HERO_RECONSTRUCTION_REPORT.md`)
and links out to the canonical chapter; it does not restate the full definition.

## 3. Everything now points at the single source

| Consumer | Target |
|---|---|
| Footer "O que é o BANZA" | `/referencia/o-que-e` |
| `/porque-existe` cross-link | `/referencia/o-que-e` |
| Legacy redirect `/o-que-e-o-banza` | `/referencia/o-que-e` |
| Legacy EN redirect `/introduction` | `/referencia/o-que-e` |
| Header "Ler a referência" | `/referencia` (reference entry point; the chapter index links to chapter 1) |
| BanzAI evidence citations | `/referencia/o-que-e` (see `BANZAI_SOURCE_REALIGNMENT_REPORT.md`) |

## 4. §42 metrics carried here

- `canonical_o_que_e_sources=1` (value `/referencia/o-que-e`) — source-verified
- `duplicated_banza_introductory_definitions=0` (the standalone `/o-que-e` intro is deleted) — source-verified

## 5. Guards / tests

- The reference chapter set is unchanged; `/referencia/o-que-e` remains a valid chapter slug (`o-que-e` is the
  chapter-1 slug). No content was moved or rewritten inside `BANZA_REFERENCIA.md` by this submilestone.

## 6. PENDING (finalized at deploy)

- Live `GET /referencia/o-que-e` → 200 with `<link rel="canonical" href="https://banza.network/referencia/o-que-e">` ·
  PR number · merge commit · deploy image digests · request-ids · cache/CDN state · service-worker state (none) ·
  rollback confirmation.
