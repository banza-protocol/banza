# M2.17A — Footer Navigation Refinement & Operador Zero Discovery

**Status:** COMPLETE · LIVE on banza.network
**Branch:** `fix/m2-17a-footer-banzai-guide-operator-zero-2026-07`
**Baseline (rollback ref):** `main` @ `f32c906` (M2.17)
**Scope:** the footer BanzAI + Implementação columns, the `?view=` deep-link into /banzai, and the
Operador Zero external link. No engine/backend/model/registry/infra/Operador-Zero-internals change. No ADR.

## 1. Objective
Two distinct BanzAI footer paths (Abrir o BanzAI → Perguntar; Analisar um artefacto → Guia via a stable
deep link) and make the Operador Zero **simulator** discoverable from the homepage — without presenting
it as a real/published/certified/production operator.

## 2. Prior state
Footer BanzAI column had "Abrir o BanzAI" and "Analisar artefacto técnico", **both → /banzai** (same
default view — redundant). Operador Zero was not discoverable from the homepage.

## 3. Redundancy found
The two BanzAI links resolved to the identical view. Fixed by giving "Analisar um artefacto" a distinct,
stable destination (the Guia tab).

## 4. Current tab system
`/banzai` renders `<BanzaiAgent>` — a grouped sidebar of tabs (`activeTool` state; default `assistente`
= "Perguntar ao BanzAI"; `guia` = the "Guia" panel). Pre-existing deep links: `#perguntar`/`#assistente`
hash and `?q=`/`?template=` query, all handled in client effects.

## 5. Deep-linking decision
Chose the **query param `?view=guia`, read SERVER-SIDE** in `app/banzai/page.tsx`, passed as `initialTab`
to `BanzaiAgent` (seeds `useState`). This is the only mechanism that renders the correct tab on first
paint with **no flash and no hydration divergence** (a hash is not sent to the server, so it would flash).
`app/banzai/page.tsx` became dynamic (`ƒ`) — correct for an interactive page. A `popstate` listener in
`BanzaiAgent` re-reads `?view=` so back/forward restore the view. Invalid/absent view → fallback to
Perguntar. Not React-temporary-state-only.

## 6. Abrir o BanzAI
`/banzai` → the default **Perguntar** (assistente) view.

## 7. Analisar um artefacto
Label renamed from "Analisar artefacto técnico" → **"Analisar um artefacto"**; destination
`/banzai?view=guia` → the **Guia** tab. Opening it starts nothing automatically (no model call, no
artifact injected) — it just lands the visitor in the artifact-analysis context.

## 8-14. Views · refresh · back/forward · new tab · SSR · hydration
Verified locally (prod build):
- `/banzai` → active tab **Perguntar ao BanzAI**.
- `/banzai?view=guia` → active tab **Guia**, Guia heading visible, **on first paint** (server-rendered).
- **No console errors / no hydration warning.**
- **Back** from /banzai to /banzai?view=guia → URL `/banzai?view=guia`, active tab **Guia** (popstate).
- Refresh / new tab / shared URL → server reads `?view=` → correct tab (deterministic).

## 15-16. Operador Zero
Added to **Implementação** (order: Recursos para programadores · Decisões · **Operador Zero — simulador**
· GitHub). `https://zero.banza.network/`, `target="_blank"`, `rel="noopener noreferrer"`, external-link
indicator icon + a screen-reader "(abre numa nova aba)" hint, a beaker/flask (simulator) pictogram.

## 17. Positioning / 18. Language
Labelled **"Operador Zero — simulador"** (the "— simulador" suffix is mandatory and guard-enforced). It is
absent from the header (navPrimary + SiteNav), the operators page, the state line and the registry. No
certified/approved/published/production language is attached to it.

## 19-20. Accessibility · Desktop/Mobile
Real `<a>` links; external new-tab announced via the sr-only hint; icons carry the label text; focus ring
inherited from the M2.17 `:focus-visible` rule; the BanzAI tab active state is exposed via
`aria-current="page"` (the sidebar is a grouped nav, not a formal ARIA tablist — converting it is out of
this surgical scope). Local: **0px horizontal overflow at 375**; Operador Zero visible.

## 21. Files changed
`website/lib/site.ts` · `website/components/SiteFooter.tsx` · `website/app/banzai/page.tsx` ·
`website/components/banzai/BanzaiAgent.tsx` · `tools/check-footer-banzai-zero-navigation.sh` (new) ·
`Makefile` · `.github/workflows/identity-guard.yml` · `website/lib/m2_17a-footer-navigation.test.ts` (new).

## 22. Tests · 23. Guard
New `website/lib/m2_17a-footer-navigation.test.ts` (9). Updated the M2.17 footer BanzAI label test. New
`make footer-banzai-zero-navigation-check` (self-testing, comment-aware, footer/nav/tab/route-scoped) +
CI job.

### Battery
tsc clean · **338/338 vitest** (27 files) · next build OK (/banzai now `ƒ` dynamic) · footer-banzai-zero
+ homepage-final-validation + homepage-final-public-release + global-navigation-final + operator-zero-* +
banzai-primary-interface + public-surface-clean + zero-subdomain-* + identity/purity/rust/private-key — all green.

## 24. CI · 25. Deploy · 26. Live QA · 29. Verdict
- **PR [#171](https://github.com/banza-protocol/banza/pull/171):** 141/141 CI green (incl. the new
  footer-banzai-zero-navigation job); admin-squash-merged as `ce439fb` (only block REVIEW_REQUIRED),
  branch deleted, main synced. CI initially caught the M2.14H nav-orchestration guard's literal default
  match (`useState<WbTab>("assistente")`) — loosened to `(initialTab ?? )?"assistente"` (default view
  unchanged), which unblocked the M2.13B + M2.14J aggregators.
- **Deploy:** website image `v1.0.0` rebuilt + restarted on the VPS (container healthy); repo HEAD `ce439fb`.
- **Live QA (banza.network, 2026-07-25):**
  - `/banzai?view=guia` → **Guia** tab active on first paint (server-rendered, no flash), Guia heading
    visible, both in the SSR HTML and in the live browser; back restores Guia via popstate (local, same build).
  - `/banzai` → Perguntar-first (default); the Guia panel is NOT server-rendered there.
  - Footer: `Analisar um artefacto` → `/banzai?view=guia` (old label gone); `Operador Zero — simulador`
    → `https://zero.banza.network/` with `target="_blank"` + `rel="noopener noreferrer"`; Operador Zero
    absent from the header.
  - Invariants: `/operators=[]`, `production_certificates=false`, `pre_production=true`,
    `/operador-zero=410`, `zero.banza.network` 200.

**Verdict:** M2.17A complete — the footer offers two distinct BanzAI entry paths (Perguntar + a stable,
shareable, refresh/back-forward-safe Guia deep link) and a discoverable, demo-only Operador Zero
simulator, without protocol-boundary changes or presenting Operador Zero as a real/published/production
operator.

## 27. Limitations
- `app/banzai/page.tsx` is now dynamically rendered (reads searchParams) — intended for this interactive page.
- The BanzAI tab widget keeps the grouped-nav `aria-current` active-state pattern (not a formal ARIA
  tablist) — a redesign was out of the M2.17A surgical scope.

## 28. Rollback
Redeploy the previous website image (pre-M2.17A). Branch rollback ref: `f32c906`.
