# M2.19G.2 — Production Validation Report (PRIMARY)

> **Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup.**
> This is the primary M2.19G.2 record. It consolidates the change set, the source-verified §42 metrics, the
> rollback path, and the live gates the parent completes after deploy.

- **Milestone:** M2.19G.2 (submilestone of M2.19-FINAL — BANZA v1.0 launch)
- **Base commit:** `fffa9f7` (M2.19G.1 COMPLETE + LIVE — PR #228 `c06f7f8` + PR #229 `fffa9f7`)
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** **COMPLETE + LIVE — 2026-07-30**
- **PR / merge commit / deploy digests:** PR [#230](https://github.com/banza-protocol/banza/pull/230) → `main` `c7cbc4c` · CI **243/243** · website `sha256:139b365a…`

---

## 1. Entry gate (verified at start)

- M2.19G + M2.19G.1 are COMPLETE + LIVE; `origin/main` at `fffa9f7`.
- `/banzai/validar` → 404; "BanzAI Web" absent.
- `/registo-tecnico`, `/arquitectura`, `/estado`, `/confianca`, `/referencia`, `/referencia/o-que-e` all 200.

## 2. What M2.19G.2 did

The public Home is canonicalized to exactly five bands (Hero · institutional phrase + public status · "Quem faz
parte do protocolo" · "Três camadas. Uma interface." · Footer). The manifest-testing form, the extra
value-proposition line and the validation-journey section are removed; the hero carries one CTA
("Validar operador no BanzAI" → `/banzai?mode=validation`) and a conceptual operator≠implementation diagram;
the status bar and registry are rebuilt to honest, sourced values. The standalone `/o-que-e` route is deleted
(no redirect/rewrite/alias with `/o-que-e` as source), and `/referencia/o-que-e` becomes the single canonical
introductory definition. Navigation is simplified to three header destinations and a three-group footer.

## 3. Change set (working-tree diff vs. `fffa9f7`)

Diffstat (website + engines): **20 files changed, +428 / −675** (`git diff --stat HEAD`), plus the added files
below. (The branch was still advancing while this record was written; the parent confirms the final diffstat at
merge.)

**Modified**
- `website/app/page.tsx` — Home rebuilt to five bands (hero + status band + registry + three-layer).
- `website/components/home/HeroStatusBar.tsx` — honest sourced status bar (real build timestamp + registry).
- `website/components/home/OperatorRegistry.tsx` — boundary + registry-derived metrics + single OZ card.
- `website/components/SiteNav.tsx` — header renders "Registo técnico" (key `registo`) + the `/referencia` CTA.
- `website/lib/site.ts` — `navPrimary` (3 dest.) + `footerColumns` (3 groups).
- `website/components/SiteFooter.tsx` — GitHub icon, positional keys, boundary note, version line.
- `website/next.config.mjs` — inject `NEXT_PUBLIC_BANZA_BUILD_TIME`; retarget `/o-que-e-o-banza` + `/introduction` → `/referencia/o-que-e`.
- `website/app/sitemap.ts` — remove `/o-que-e`.
- `website/app/porque-existe/page.tsx` — repoint the "O que é o BANZA" link → `/referencia/o-que-e`.
- `engines/banza-repo-guards/src/lib.rs` — drop the deleted `website/app/o-que-e/page.tsx` allowlist entry.
- `engines/banzai-query-core/src/repoindex/*.json` — regenerated repo-wide index (index + manifest + coverage).
- Test fixtures converged to the G2 contract: `website/lib/m2_15b-global-navigation.test.ts`,
  `m2_16-home.test.ts`, `m2_17-homepage.test.ts`, `m2_17a-footer-navigation.test.ts`, `m2_19g-new-pages.test.ts`.
- `artifacts/m2-19-final/execution-state.json` — mark M2.19G.2 RUNNING.

**Added**
- `website/lib/protocolStatus.ts` — single-source status/registry truth.
- `website/lib/m2_19g2-home.test.ts` — the G2 home/route contract test (§6/§7/§9/§10/§12/§13/§14–19/§20–24/§26/§27/§28/§32).
- `artifacts/m2-19g2/home-current-surface-audit.json` + the 13 M2.19G.2 reports (this documentation set).

**Deleted**
- `website/app/o-que-e/page.tsx`
- `website/components/home/ManifestTester.tsx`

## 4. §42 metrics — source-verified vs. deploy-confirmed

**Source-verified (working-tree diff):**
`home_primary_ctas=1` · `home_manifest_forms=0` · `home_manual_url_inputs=0` ·
`home_value_proposition_extra_blocks=0` · `home_public_node_counts=0` ·
`home_operator_zero_production_counts=0` · `home_empty_operator_cards=0` ·
`home_validation_journey_sections=0` · `home_section_order_failures=0` ·
`reference_cta_wrong_targets=0` (shipped surfaces) · `legacy_o_que_e_route_files=0` ·
`legacy_o_que_e_redirects=0` · `legacy_o_que_e_rewrites=0` ·
`legacy_o_que_e_internal_links=0` (shipped pages/components/sitemap) ·
`legacy_o_que_e_sitemap_entries=0` · `legacy_o_que_e_service_worker_entries=0` (no service worker) ·
`canonical_o_que_e_sources=1` · `duplicated_banza_introductory_definitions=0` ·
`banzai_legacy_o_que_e_sources=0`.

**Deploy-confirmed (PENDING):**
`broken_public_links=0` · `accessibility_blockers=0` · `mobile_blockers=0` · `unexpected_public_fallbacks=0`.

## 5. Rollback

- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization` (→ `fffa9f7`).
- Revert path: redeploy the image built from `fffa9f7`; the deleted `/o-que-e` page and the PRE-G2 Home/nav
  return with it.

## 6. Guards / tests status

- **Guard alignment (done in source):** `engines/banza-repo-guards` Banzami-attribution allowlist no longer
  lists the deleted `website/app/o-que-e/page.tsx`; `website/app/page.tsx` stays allowlisted (Banzami named
  only as the L3 scheme operator).
- **Test convergence (done by the implementer, in parallel):** the prior home/nav/footer fixtures
  (`m2_15b-global-navigation.test.ts`, `m2_16-home.test.ts`, `m2_17-homepage.test.ts`,
  `m2_17a-footer-navigation.test.ts`, `m2_19g-new-pages.test.ts`) were updated to the G2 contract, and the new
  `website/lib/m2_19g2-home.test.ts` positively guards the G2 home + route removal. These are website/test files
  and were **not** edited by this documentation task.
- **OF-2 (cosmetic, still open):** `website/README.md:67` still lists `/o-que-e` in a human route inventory —
  flagged for a README sweep (out of documentation scope here).

---

## 7. PRODUCTION VALIDATION — PASS

- **PR number:** [#230](https://github.com/banza-protocol/banza/pull/230)
- **CI result:** **243/243 SUCCESS** (incl. the 3 new M2.19G2 guards + the new `m2_19g2-home.test.ts`; identity/contamination, rust-rule, three-layer, reference IA all green).
- **Merge commit → `main`:** `c7cbc4c` (admin squash-merge, branch deleted).
- **Deploy timestamp:** 2026-07-30; VPS repo synced to `c7cbc4c`; `docker compose build website` + `up -d`.
- **Deploy image digest (website):** `ghcr.io/banza-protocol/banza-website@sha256:139b365a…`. banzai-api / banza-fetcher / llama-local unchanged (the /o-que-e removal + BanzAI-evidence citation are vendored into the website bundle; the Node service never cited bare /o-que-e).
- **Container health:** website **healthy**; full stack up.

### 7.1 Public-edge crawl (banza.network) — PASS
- `GET /` → **200**; five-band Home; one primary CTA (`Validar operador no BanzAI` → `/banzai?mode=validation`); no manifest form; no journey section — confirmed on the live edge.
- `GET /o-que-e` → **404**, **no `Location`** (cf-cache-status DYNAMIC); `GET /o-que-e?x=1` → **404**.
- `GET /o-que-e-o-banza` → **308** → `/referencia/o-que-e`; `GET /introduction` → **308** → `/referencia/o-que-e`.
- `GET /referencia` → **200**; `GET /referencia/o-que-e` → **200** (single canonical introductory definition).
- `GET /registo-tecnico`, `/arquitectura`, `/estado`, `/confianca`, `/banzai` → **200**; `GET /banzai/validar` → **404** (gate intact).
- Live Home markers present: `Aberto. Auditável. Verificável.`, `Banzami Operational Scheme`, `Registo técnico`, `REGISTO TÉCNICO`, sourced status bar. Removed markers absent: `Testar um manifesto`, `PERCURSO DE VALIDAÇÃO`, `6 nós`, `PROTOCOLO ACTIVO`, `certificados emitidos`, `Aberto a todos`, `href="/o-que-e"` (0). `broken_public_links=0` / `unexpected_public_fallbacks=0`.

### 7.2 Rendered / browser evidence — PASS
- Local desktop + mobile (375px) screenshots of the built artifact + a live deployed-site mobile screenshot: the five bands render; the eyebrow pill fits (responsive clamp). Nav label parity desktop/mobile ("Registo técnico" · "BanzAI" · "Ler a referência").
- Status bar renders "última verificação pública há X" from the real build timestamp (observed "há 4 min" post-build).
- The SSR HTML is static and engine-independent; content verified via public-edge fetch across route + marker greps.

### 7.3 Accessibility / mobile — PASS
- Semantic landmarks + heading order + accessible indicator/CTA labels; 375px reflow with no horizontal scroll (root `overflowX:hidden`; eyebrow clamp fix).

### 7.4 BanzAI — PASS
- BanzAI grounding for "o que é o BANZA" cites `/referencia/o-que-e` (evidence-engine allowlist), never bare `/o-que-e`; the Node service grounds on repo docs/ADRs. `doc-index.json` carries zero `/o-que-e` records; the repo-wide index was regenerated (0 records for the deleted page) and the committed-index CI checks pass.

### 7.5 Rollback confirmation — PASS
- Rollback tag `rollback-pre-m2-19g2-home-reference-canonicalization` present → `fffa9f7`.
- Execution-state flipped to **COMPLETE + LIVE**.

- **Result:** **PASS** — M2.19G.2 **COMPLETE + LIVE**.
