# Reference CTA Alignment Report (M2.19G.2 §27)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**

---

## 1. Rule

Every "Ler a referência" (and every reference entry-point affordance) targets `/referencia` **directly** — never
`/o-que-e`, never a chapter, never `/referencia/completa`. The **introductory definition** cross-links target the
canonical chapter `/referencia/o-que-e`.

## 2. Aligned surfaces (source-verified)

| Surface | File | Before (`fffa9f7`) | After |
|---|---|---|---|
| Header "Ler a referência" | `website/lib/site.ts` (`navPrimary`) | `/o-que-e` | `/referencia` |
| Footer "O que é o BANZA" | `website/lib/site.ts` (`footerColumns`) | `/o-que-e` ("Ler a referência") | `/referencia/o-que-e` |
| Footer "Referência" | `website/lib/site.ts` | (n/a) | `/referencia` |
| Home registry CTA | `website/app/page.tsx` | trailing "Ler a referência" → `/o-que-e` | replaced by "Consultar o Technical Registry" → `/registo-tecnico` |
| `/porque-existe` cross-link | `website/app/porque-existe/page.tsx` | `MoreLink /o-que-e "O que é o BANZA"` | `MoreLink /referencia/o-que-e "O que é o BANZA"` |
| Legacy redirect `/o-que-e-o-banza` | `website/next.config.mjs` | → `/o-que-e` | → `/referencia/o-que-e` |
| Legacy EN redirect `/introduction` | `website/next.config.mjs` | → `/o-que-e` | → `/referencia/o-que-e` |

## 3. §42 metric

`reference_cta_wrong_targets=0` for the **shipped** header/footer/page/redirect surfaces — source-verified.

## 4. Test convergence + remaining follow-up

- **RESOLVED (by the implementer):** the reference-CTA test fixtures now assert the G2 targets —
  `website/lib/m2_15b-global-navigation.test.ts` (header `["/registo-tecnico","/banzai","/referencia"]`,
  zero items with href `/o-que-e`), `m2_17-homepage.test.ts` (Home does not contain `href="/o-que-e"`), and the
  new `m2_19g2-home.test.ts` §7/§26/§27.
- **OF-2 (still open, cosmetic):** `website/README.md:67` route inventory still lists `/o-que-e`. Out of scope
  here (website file); flagged for a README sweep.

## 5. PENDING (finalized at deploy)

- Live click-through of each "Ler a referência" affordance (→ `/referencia` 200) · PR number · merge commit ·
  deploy image digests · screenshots · browser matrix · request-ids · cache/CDN state ·
  service-worker state (none) · rollback confirmation.
