# HOME — Accessibility & Mobile Report (M2.19G.2)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — structural facts source-grounded; the axe/AT/device passes are **PENDING (finalized at deploy)**
- **Primary files:** `website/app/page.tsx`, `website/components/home/HeroStatusBar.tsx`,
  `website/components/home/OperatorRegistry.tsx`, `website/components/SiteFooter.tsx`

---

## 1. Accessibility affordances present in source (verified)

- **Landmark labelling:** the hero `<section>` is `aria-labelledby="hero-title"` (the `<h1 id="hero-title">`);
  the status band is `aria-label="Estado público"`; the registry band is `aria-label="Registo técnico"`; the
  three-layer `<section>` is `aria-labelledby="layers-title"`.
- **Heading order:** one `<h1>` (hero), then `<h2>` for "Quem faz parte do protocolo" and "Três camadas. Uma
  interface." (no skipped levels on the Home).
- **Indicator list semantics:** the 3 hero indicators are a `<ul aria-label="O que o protocolo oferece">` with
  `<li>` items; icons and separators are `aria-hidden="true"` so AT reads only the labels.
- **Decorative graphics:** the hero background layers, glow, noise, flow dots, hairlines and the diagram glyphs
  are all `aria-hidden="true"`; the diagram legend is real text (not baked into an image).
- **External links:** footer external items render an `ExternalTabHint` with visually-hidden text
  "(abre numa nova aba)" and `rel="noopener noreferrer"`, `target="_blank"`.
- **Hydration honesty:** the status bar's elapsed value uses `suppressHydrationWarning` because the client
  refines it from the real timestamp after mount (no console hydration error, no fabricated value).

## 2. Mobile / responsive affordances present in source (verified)

- **No horizontal scroll:** the Home root sets `overflowX: "hidden"`; the hero section is `overflow: "hidden"`.
- **Fluid sizing:** headings, paddings and gaps use `clamp()`; the hero grid and the layer/registry card grids
  use `minmax`/`auto-fit`, so cards reflow to a single column on narrow viewports.
- **Wrapping rows:** the status bar, the registry metrics row and the footer bottom bar use `flexWrap` so no row
  overflows on mobile.
- **Nav parity:** the header renders the same three labels desktop and mobile (data-driven from `navPrimary`);
  the footer collapses its column grid on small screens.

## 3. Contrast (design intent; measurement pending)

The palette is the dossier bordô/ink system (`#8B1428`, `#1A1512`, `#5D5348`, `#7A7263` on paper
`#F1EBE0`/`#FFFCF7`). Indicator labels use `#514639`; status-bar text `#7A7263`. Formal WCAG AA contrast
measurement across all text/background pairs is part of the deploy-time axe pass.

## 4. §42 metrics (deploy-confirmed)

`accessibility_blockers=0` and `mobile_blockers=0` are **PENDING (finalized at deploy)** — confirmed by the
parent via an axe/AT pass and a 375px render. Structural affordances above indicate no known blocker in source.

## 5. Guards / tests

- No a11y-specific automated guard was added; the axe/AT pass is a deploy-time gate (§6). The behavioral home
  tests were converged to the G2 markup by the implementer (new `website/lib/m2_19g2-home.test.ts`), so they now
  serve as the structural regression signal for the Home.

## 6. PENDING (finalized at deploy)

- axe/Lighthouse a11y score · AT (VoiceOver/NVDA) read-through of hero → status → registry → three-layer →
  footer · 375px + tablet + desktop screenshots · focus-order and visible-focus check · reduced-motion check ·
  contrast measurement · browser matrix · PR number · merge commit · deploy image digests · request-ids ·
  cache/CDN state · service-worker state (none) · rollback confirmation.
