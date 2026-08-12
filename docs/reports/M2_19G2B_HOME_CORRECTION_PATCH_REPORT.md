# M2.19G.2B — Home Correction Patch (strict no-redesign mode)

> **Surgical corrective patch.** M2.19G.2 over-reached: it replaced the approved right-hand hero
> illustration with a *new* conceptual interpretation. This patch restores the approved illustration
> verbatim and reconciles the three over-rigid guard/test assertions that had been written for the
> abandoned interpretation. **No redesign. No re-composition. No new illustration.**

- **Milestone:** M2.19G.2B (correction submilestone of M2.19-FINAL — BANZA v1.0 launch)
- **Base commit:** `6459f91` (M2.19G.2 COMPLETE + LIVE — PR #230 `c7cbc4c` + docs `6459f91`)
- **Branch:** `fix/m2-19g2b-home-correction-patch`
- **Rollback tag:** `rollback-pre-m2-19g2b-home-correction` (→ `6459f91`)
- **Date:** 2026-07-30
- **Status:** COMPLETE + LIVE — 2026-07-30 *(see §7)*
- **ADR:** none required (`next_free_adr` stays **ADR-069**)

---

## 1. The single defect this patch corrects (§1)

M2.19G.2 shipped a Home whose **section order, journey removal, honest status bar, single CTA,
navigation cleanup and `/o-que-e` removal were all correct** — and remain untouched here. Its one
unauthorized change was **visual**: the right-hand hero illustration was swapped for a *new*
3-column "conceptual" card diagram (`Operador A / Implementação A1` · `Perfil BANZA v1.0` ·
`Operador B / Implementação B1`, legend "Diagrama conceptual: …") that had never been approved.

Per the correction mandate — *"Não substituir a ilustração da direita por uma nova ilustração
conceptual diferente. Se a ilustração anterior tiver sido trocada, restaurar a versão visual aprovada
anteriormente ou a mais próxima dela."* — this patch **restores the approved illustration verbatim**
from the pre-G2 baseline (`fffa9f7`): the concentric-ring interoperability diagram with **REGRAS
PÚBLICAS** at the centre, the four corner operator cards (**Operador A/B/C/D**), the four edge chips
(`manifest.json`, `mensagem`, `signature valid ✓`, `trust: verified ✓`), the **ILUSTRATIVO** marker and
the legend *"Diagrama ilustrativo: troca entre operadores por regras e perfis comuns, sem reconstruir
integrações técnicas bilaterais entre cada par."*

## 2. What was changed — and what was deliberately NOT

**Changed (exactly 4 files, +/− balanced, no net growth):**

| File | Change |
|---|---|
| `website/app/page.tsx` | **Only the right-hand hero illustration block** — `PairNode`→`OperatorCard` helper + the 3-column conceptual grid → the approved concentric-ring diagram. 37 lines changed / 37 removed. |
| `tools/check-homepage-final-public-release.sh` | §5 diagram assertions retargeted from the abandoned conceptual diagram (`Perfil BANZA v1.0` / `Implementação A1/B1` / `Diagrama conceptual`) to the restored ring (`ILUSTRATIVO` / `REGRAS` / `Operador A–D` / `Diagrama ilustrativo`). |
| `website/lib/m2_16-home.test.ts` | The "conceptual interoperability diagram" case retargeted to the ring markers (`ILUSTRATIVO` / `REGRAS` / `Operador A` / `Operador B`). |
| `website/lib/m2_17-homepage.test.ts` | Removed `"sem reconstruir integrações técnicas bilaterais"` from the "retired copy" exclusion list — it is the **approved illustration's own legend**, not retired copy. The genuinely-retired lines stay excluded. |

**NOT changed (verified byte-identical to G.2 / main `6459f91`):** the hero eyebrow
(`PROTOCOLO FINANCEIRO ABERTO · v1.0`), the h1 (`Regras públicas para uma interoperabilidade
financeira verificável.`), the hero paragraph, the three indicators, the **single** CTA
(`Validar operador no BanzAI` → `/banzai?mode=validation`), the institutional phrase
(`Aberto. Auditável. Verificável.`), the honest sourced status bar, the "Quem faz parte" registry
section, the "Três camadas. Uma interface." architecture band, the footer, the navigation, the
`/o-que-e` removal, the sitemap, redirects, metadata, BanzAI grounding and every other route/page.
The section order (Hero → state → Quem faz parte → Três camadas → Footer) is unchanged; the retired
validation-journey section stays removed; `/o-que-e` stays 404; "Ler a referência" still points at
`/referencia`.

**No redesign. No re-composition. No new illustration. No copy changes. No new dependencies.** The
only image on the page returned to the version approved before G.2.

## 3. Before / After — mandatory visual evidence (§9)

Captured at desktop (1440×900) and mobile (375×812). BEFORE = the live production site
(`banza.network`, still serving the G.2 reinvented diagram at capture time); AFTER = the local
production build of this patch.

**Right-hand hero illustration:**

| | BEFORE (G.2 — unauthorized) | AFTER (this patch — approved, restored) |
|---|---|---|
| Marker | `INTEROPERABILIDADE` · **`CONCEPTUAL`** | `INTEROPERABILIDADE` · **`ILUSTRATIVO`** |
| Composition | 3-column card row | concentric-ring diagram |
| Centre | `Perfil BANZA v1.0` card | **`REGRAS PÚBLICAS`** |
| Operators | `Operador A/Implementação A1` · `Operador B/Implementação B1` | **`Operador A/B/C/D`** (four corner cards) |
| Chips | manifest verificado / assinatura válida / profile compatível / evidence ligada à origem (row) | `manifest.json` / `mensagem` / `signature valid` / `trust: verified` (on the ring edges) |
| Legend | "Diagrama **conceptual**: …" | "Diagrama **ilustrativo**: … sem reconstruir integrações técnicas bilaterais entre cada par." |

Everything **outside** the illustration is pixel-identical between BEFORE and AFTER at both
breakpoints (same eyebrow, h1, paragraph, three indicators, single CTA). This is the proof that the
patch is surgical: only the illustration moved, and it moved *back* to the approved version.

## 4. Verification battery (all green before merge)

- `tsc --noEmit`: **PASS**.
- `next build`: **PASS**.
- `vitest run`: **419/419 PASS** (incl. the three reconciled files: m2_16-home, m2_17-homepage,
  m2_19g2-home — 51/51 across those three).
- Home / public guard battery (13 guards): **PASS** — `check-homepage-final-public-release`,
  `check-m2-19g2-home-canonical`, `check-m2-19g2-o-que-e-removal`, `check-m2-19g2-readiness`,
  `check-home-minimal`, `check-homepage-final-validation`, `check-home-layout-copy`,
  `check-m2-19g-public-surface-canonical`, `check-public-surface-clean`,
  `check-website-public-copy-current`, `check-certification-page`, `check-glossary-page`,
  `check-banzai-m2-19g-semantic-regression-check`.
- `make identity-check` (contamination gate, fresh release binary): **PASS**.

## 5. Rollback

- **Rollback tag:** `rollback-pre-m2-19g2b-home-correction` (→ `6459f91`).
- Revert path: redeploy the image built from `6459f91`; the G.2 conceptual diagram returns with it.

## 6. Scope discipline (§10)

Touched only: the Home page illustration and the tests/guards that were over-fitted to the abandoned
interpretation. **Not touched:** the BanzAI validation flow, operator onboarding, the candidate
registry, or any unrelated internal page. No engine, contract, ADR, or BanzAI grounding change.

---

## 7. PRODUCTION VALIDATION — PASS

- **PR number:** [#232](https://github.com/banza-protocol/banza/pull/232).
- **CI result:** **all checks pass** (full identity/contamination, rust-rule, repo-guards, three-layer,
  reference IA, home guards, target registry, Operador Zero, BanzAI query-core — every job green).
- **Merge commit → `main`:** `78a0582` (admin squash-merge, branch deleted).
- **Deploy:** 2026-07-30; VPS `82.165.165.97` repo synced `c7cbc4c` → `78a0582`;
  `docker compose build website` + `up -d website`; **website container healthy**; banzai-api /
  banza-fetcher / llama-local unchanged (illustration is vendored in the website bundle).
- **Public-edge crawl (`banza.network`, cf-cache-status DYNAMIC, HTTP 200):**
  - Restored ring markers **present** (1 each): `ILUSTRATIVO`, `REGRAS`, `Operador A`, `Operador D`,
    `Diagrama ilustrativo`, `sem reconstruir integrações técnicas bilaterais`.
  - Abandoned conceptual markers **absent** (0 each): `CONCEPTUAL`, `Perfil BANZA v1.0`,
    `Implementação A1`, `Implementação B1`, `Diagrama conceptual`.
  - G.2 canonical markers **unchanged** (present): single CTA `Validar operador no BanzAI`
    (href count = 1), `Aberto. Auditável. Verificável.`, h1 `Regras públicas para uma`,
    `Banzami Operational Scheme`.
  - Live desktop (1440×900) + mobile (375×812) render confirmed: the concentric-ring illustration
    is back; everything outside it is identical to G.2; status bar reads a fresh build timestamp.
- **Result:** **PASS** — M2.19G.2B **COMPLETE + LIVE** (2026-07-30). The approved hero illustration
  is restored; no redesign. Rollback tag `rollback-pre-m2-19g2b-home-correction` → `6459f91`.
