# Phase M2.7F — Home Typography & Visual System Harmonization

**Date:** 2026-07-18 · **Branch:** `feat/m2-7f-home-typography-visual-harmonization-2026-07`
**Type:** `style(website)` — home typography/color harmonization (website-only)

## Problem observed (PARTE 1 audit)
The homepage read as three components with slightly different systems rather than one composition:
- The **boundary snapshot** cards had inverted/soft semantics — the "O BANZA é" card was **burgundy**
  and the "O BANZA não é" card was **gold/neutral** (`#8A6420` on `bg-tint-gold`), so the positive card
  looked like the accent and the negative card looked incidental.
- The **operator-architecture** header used a **larger** title (`clamp(27px,3.9vw,46px)`, weight 700)
  than the boundary title (`.h-section` = `clamp(22px,3vw,42px)`, weight 600), a differently-scaled
  subtitle, and — critically — **literal font families** (`'Source Serif 4'`, `'IBM Plex Mono'`,
  `'Public Sans'`) instead of the site's loaded webfont variables, so its titles fell back to generic
  fonts while the rest of the site rendered the optimized faces.

## Visual decisions
- **One section-header system**: both `.h-section`-scale titles (serif 600, `clamp(22px,3vw,42px)`,
  `line-height 1.1`, `letter-spacing -0.015em`, `#16191E`) and one subtitle spec
  (`clamp(15px,1.7vw,18px)`, `line-height 1.6`, `ink-3 #54595F`, `max-w-[60ch]`, centered) + `mb-9`/
  `mb-3` rhythm.
- **Semantic card colors**: "O BANZA é" → positive **green** (`bg-tint-green #EEF5EF`, `border-ok/25`,
  `text-ok #2E6A4E` on icon/label/bullets, check glyph); "O BANZA não é" → **red/bordo**
  (`bg-tint-bordo #FBEFF0`, `border-bordo/25`, full-strength `text-bordo #8E1326` on icon/label/bullets,
  cross glyph). Equal heights on desktop (`items-stretch`), stacked on mobile.
- **Palette (PARTE 5)**: bordo = protocol/boundary/CTAs; green = conformance/"é"/evidence; slate =
  BanzAI Workbench/trust; gold = governance (institutional only, never on a negative slot); warm-neutral
  paper background; charcoal titles / grey subtitles.
- **Fonts**: the arch section now renders via the site webfont variables (`var(--font-serif)` /
  `var(--font-mono)` / `var(--font-sans)`), with the literal family kept only as a fallback.

## Components changed
- `website/components/home/BoundarySnapshot.tsx` — card variants (green é / red não é), full `text-bordo`
  label, aligned subtitle.
- `website/components/home/OperatorArchitectureSection.tsx` — header title to `.h-section` scale/weight,
  aligned subtitle, `line-height`/`letter-spacing` matched to the base, and all 28 `fontFamily`
  declarations rewritten to `var(--font-*)`.
- `website/app/page.tsx` — unchanged composition (hero → boundary → bridge → arch); footer from layout.
- `website/components/home/homeHarmonization.test.ts` — new source-contract test (11 assertions).

## Tests (PARTE 8)
`homeHarmonization.test.ts` asserts: hero→boundary→arch order; boundary title uses `.h-section`; both
titles share the clamp(22px,3vw,42px)/weight-600 scale; the arch title resolves to `var(--font-serif)`
(not a literal fallback) and no literal-only family remains; the "é" card is green (`bg-tint-green`,
`text-ok`, `border-ok/25`); the "não é" card is full red (`bg-tint-bordo`, `border-bordo/25`, `text-bordo`
and **not** `text-bordo-soft`) and no longer gold; single hero CTA "Começar implementação"; bridge +
closing phrases present; no removed-model vocabulary on any home source (hero included).
Full suite: **126/126 vitest** · type-check ✓ · `next build` (81 pages) ✓ · `next lint` clean.

## Guards (PARTE 9)
home-minimal ✓ · public-surface-clean ✓ · workbench-only ✓ · governance-docs-clean ✓ · open-governance ✓
· regulatory ✓ · identity ✓ · purity ✓ · invariant ✓ · private-key-leak ✓ · rust-rule ✓ ·
reference-svg ✓ · svg-visual-quality ✓. (Rust-engine/conformance/crypto/simb suites are unaffected by a
website-CSS change and run in CI.)

## Visual QA
- **Computed styles (desktop + mobile):** "O BANZA é" card `background: rgb(238,245,239)` (#EEF5EF,
  green) + `border rgba(46,106,78,0.25)`; "O BANZA não é" card `background: rgb(251,239,240)` (#FBEFF0,
  bordo) + `border rgba(142,19,38,0.25)`. Both section `<h2>` compute to `22px / 600 / Source Serif 4`
  (identical scale/weight/family).
- **Mobile (375px):** screenshot confirmed the green "é" card (green icon/checks/label) and the red
  "não é" card (red icon/crosses/label), stacked with good spacing; the arch header pills wrap cleanly.
- **No horizontal overflow** at 375px or 1280px; **zero console errors**.
- The full-page desktop render screenshot was flaky in the browser-pane tool (IntersectionObserver reveal
  timing + a renderer timeout); the harmonization is confirmed instead by the computed-style probes, the
  mobile screenshots, the overflow/console checks, and the source-contract test.

## Adversarial review (PARTE 10)
An independent skeptic pass found and this phase then fixed: (#1) arch titles used literal
`'Source Serif 4'` instead of `var(--font-serif)` — the exact typography mismatch — now fixed for all
serif/mono/sans; (#2) the "não é" label was `text-bordo-soft`, now full `text-bordo`; (#3–#5) test gaps —
strengthened to assert the webfont variable, reject `text-bordo-soft`, and scan the hero for removed
vocabulary; (#6) minor `letter-spacing`/`line-height` drift, aligned to the base rule. Confirmed clean:
positive card green, negative card no longer gold, composition minimal, single CTA, bridge + closing
phrases present, no removed-model vocabulary.

## Deploy & public validation
Website-only. (See delivery summary for the live checks.)

## Confirmações negativas
No long sections re-introduced (Estado / Como funciona / Confiança / Roteiro / reader-profile cards); no
BANZA CA / operador certificado / certificado de operador / aprovação humana central / Assistente de
Certificação / M2 protocol gate; no CLI/Python/Docker/GitHub-Actions as a public operator path; single
hero CTA preserved; `/operators=[]` and `production_certificates=false` unchanged; provider mock,
`llm_calls=0`; no DNS/TLS/Cloudflare/Postgres/`.env`/secrets touched.
