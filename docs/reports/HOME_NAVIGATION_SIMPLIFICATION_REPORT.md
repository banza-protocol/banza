# HOME — Navigation Simplification Report (M2.19G.2 §7, §27–28)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary file:** `website/lib/site.ts` (`navPrimary`)

---

## 1. The header now

Exactly three distinct public destinations, one consistent label each (desktop + mobile), no dropdowns/submenus.
Array order is the exact left→right desktop order and top→bottom mobile order.

| Order | Label | Target | Key |
|---|---|---|---|
| 1 | `Registo técnico` | `/registo-tecnico` | `registo` |
| 2 | `BanzAI` | `/banzai` | `banzai` (feature) |
| 3 | `Ler a referência` | `/referencia` | `referencia` (cta) |

## 2. What changed (PRE-G2 → after)

| Slot | Before (`fffa9f7`) | After |
|---|---|---|
| 1 | `Operadores` → `/operadores` | `Registo técnico` → `/registo-tecnico` |
| 2 | `BanzAI` → `/banzai` | unchanged |
| 3 | `Ler a referência` → `/o-que-e` | `Ler a referência` → `/referencia` (direct — no redirect, not a chapter) |

## 3. Route rules honoured

- Every "Ler a referência" affordance points at `/referencia` **directly** — not `/o-que-e`, not
  `/referencia/o-que-e`, not `/referencia/completa`, not a chapter (§7, §27).
- The label is "Registo técnico" (NOT "Operadores"), one consistent string for desktop and mobile.

## 4. §42 metrics carried here

`reference_cta_wrong_targets=0` for the **shipped** nav — source-verified.

## 5. Guards / tests

- `website/lib/m2_15b-global-navigation.test.ts` was converged to the G2 contract by the implementer: it now
  asserts the header is `["/registo-tecnico","/banzai","/referencia"]` and that `navPrimary` contains **zero**
  items with href `/o-que-e`.
- `website/lib/m2_19g2-home.test.ts` §7 additionally guards the header navigation.
- `website/components/SiteNav.tsx` (the header renderer) was updated: chip key `operadores` → `registo`,
  label "Operadores" → "Registo técnico" (registry/list icon), CTA → `/referencia`.

## 6. PENDING (finalized at deploy)

- Rendered desktop + mobile nav (label parity, target 200s) · PR number · merge commit · deploy image digests ·
  screenshots · browser matrix · request-ids · cache/CDN state · service-worker state (none) ·
  rollback confirmation.
