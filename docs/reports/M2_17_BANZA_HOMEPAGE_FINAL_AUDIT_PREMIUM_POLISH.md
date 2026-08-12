# M2.17 — BANZA Homepage Final Audit, Route Integrity & Premium Polish

**Status:** COMPLETE · LIVE on banza.network
**Branch:** `feat/m2-17-homepage-final-audit-premium-polish-2026-07`
**Baseline (rollback ref):** `main` @ `04431c0` (the M2.16 dossier home)
**Scope:** the public homepage + its global chrome + the directly-linked public surfaces. No engine,
backend, provider, model, Postgres, Trust Root, manifest, schema, registry, infra or Operador Zero
change.

---

## 1. Objective
Audit the M2.16 homepage minutely — every route, link, button, interaction, text and state — fix all
functional errors, apply a robust premium finish, then declare the homepage validated. Order was
mandatory: audit → fix → content → a11y/perf/SEO → polish → re-audit → deploy → live QA → verdict.

## 2. Baseline
`main` @ `04431c0`. Live invariants confirmed before any change: home 200, `/operador-zero` 410,
`zero.banza.network` 200, `/operators=[]`, `production_certificates=false`, `GET /banzai/ask`→405,
BanzAI answering. Homepage components present: header (3 destinations), Hero, animation, BanzAI field,
BANZA/BanzAI card, footer.

## 3. Components audited
`app/page.tsx` · `components/home/HomeHeroDiagram.tsx` · `components/home/HomeAsk.tsx` ·
`components/SiteNav.tsx` · `components/SiteFooter.tsx` · `lib/site.ts` · `app/layout.tsx` ·
`app/globals.css`.

## 4. Inventory + 5. Links + 6. Routes
21 interactive links inventoried (header ×4, CTAs ×3, footer ×14) → `artifacts/m2-17/homepage-link-audit.json`.
Deterministic audit against the live routes: **every internal link 200, zero redirects, mailto ok**,
and each destination `<title>` semantically matches its label (e.g. Operadores → "Operadores — registo
público"; BanzAI → "BanzAI — Agente do Protocolo"; "Recursos para programadores" → "13. Recursos para
Programadores"). **No broken/empty/`#`/`javascript:`/retired routes, no circular redirects, no label
mismatch.** `/programadores` is a redirect to the canonical `/referencia/programadores`; the home and
footer both already point at the canonical route.

## 7. Header
Kept exactly `Operadores · BanzAI · Ler a referência`, no dropdowns. Rebuilt as **one component family
in three deliberate tiers**: Ler a referência = primary (bordô fill) · BanzAI = secondary (creme
outline chip) · Operadores = tertiary (ghost chip) — all sharing height, radius, padding, icon size
and a common focus ring; active state raises a destination to the tinted-active look. Single
prefix-based active state (`/` activates nothing; no two-active).

## 8. Hero
Eyebrow and H1 text unchanged. Removed the hard `<br>` breaks (which forced a 5-line overflow at 1366)
and let `text-wrap: balance` form ~3–4 even lines with the bordô "Interoperabilidade" leading; slightly
reduced the H1 scale/line-height and hero top padding. Result: on a common 1366×768 desktop the first
fold now shows eyebrow, H1, paragraph, the "Perguntar ao BanzAI" title + subtitle, the field and the
Perguntar button.

## 9. Copy (canonical model)
- Hero paragraph → "… **evidência verificável** … nem um sistema central, **com o apoio do BanzAI**."
- BANZA definition → "… **evidência verificável** … interoperem **em Angola** … nem **um sistema central**."
- BanzAI definition → "**O BanzAI é o agente de IA do protocolo BANZA.** Orienta, consulta a referência
  e encaminha pedidos para motores verificáveis, **sem certificar, aprovar operadores ou movimentar
  fundos.**" ("interface primária humano-operador" dropped as the public definition; it stays in
  /banzai + reference ch.12 + ADR-054.)
- BanzAI card subtitle → "Agente de IA do protocolo BANZA".
- Footer brand → "Regras públicas, motores verificáveis e evidência verificável …" (drops "A base para").
- SEO/OG/Twitter description → the canonical M2.17 sentence.

## 10. Animation
Semantics already correct (six independent operators, peer-to-peer chords with ping-pong exchange
packets, non-central flows, visible node activity). Reduced the central medallion so the crest reads as
protocol identity, not a dominant hub. **Technical:** the rAF loop now suspends off-viewport
(IntersectionObserver) and on tab-hide (visibilitychange); it already handled dpr≤2, resize,
StrictMode and `prefers-reduced-motion`. No new library.

## 11. BanzAI field + 12. quick prompts + 13. boundaries
Field wired to the live agent (`banzaiKb` → `/banzai/ask`, local Qwen) + `SafeMarkdown`. Added a
**synchronous in-flight ref lock** so a rapid Enter/click cannot double-submit (verified: two rapid
clicks → the question is sent once). Removed the **decorative attach/code icons** that looked like
buttons but had no behaviour. Placeholder, title, button and the four quick prompts preserved. Local
QA confirmed a single user bubble + graceful "temporariamente indisponível" fallback with no backend.

## 14/15/16/17. BANZA · BanzAI · CTAs · state · footer
BANZA/BanzAI definitions per §9. Third CTA relabelled "Começar a implementar" → "Recursos para
programadores" (destination unchanged). State line preserved. Footer: brand text per §9; BanzAI column
deduplicated (three links to `/banzai` → "Abrir o BanzAI" + "Analisar artefacto técnico"); bottom bar
adds the BanzAI boundary line beneath the BANZA boundary line.

## 18. Directly-linked public surfaces (PART 21)
Swept /operadores, /banzai, /referencia, /referencia/programadores, /estado, /decisoes, /licenca,
/governanca for retired vocabulary as an active claim. **All clean** — the only matches were correct
negations ("SEM AUTORIDADE CENTRAL", "não é concedida por uma autoridade central") and a false match
("BANZA **Ca**minho para Produção"). No linked surface contradicts the homepage.

## 19-24. Premium polish · Responsive · A11y · SSR/hydration · Perf · SEO
- **Polish:** three-tier header family, consistent `:focus-visible` ring across links/buttons/textarea
  (0-specificity `:where`), nav hover/press states, calmer medallion, balanced H1, tightened hero
  rhythm. Brand palette preserved (vinho/marfim/preto/dourado). No new libraries, no glassmorphism.
- **Responsive:** verified 1366 (fold) + 375 (mobile). Nav→hamburger, H1 flows naturally below 820,
  full-width diagram, **0px horizontal overflow**.
- **A11y:** skip link, landmarks, single h1, aria-current/expanded/controls/live, decorative canvas
  aria-hidden, reduced-motion honoured, common focus ring, no clickable-without-name (fake icons
  removed).
- **SSR:** the ask card (client island) is server-rendered on first paint — title/subtitle/placeholder/
  chips are in the initial HTML.
- **Perf:** no BanzAI/model call on load; animation suspends off-viewport; listeners + observer cleaned
  up; fonts self-hosted.
- **SEO:** canonical `/`, robots index/follow, OG/Twitter + favicon present; neutral description (no
  operator/bank/PSP/certification/production claims).

## 25. Tests · 26. Guards
New `website/lib/m2_17-homepage.test.ts` (15); `m2_16-home` reframed to "agente de IA". New
`make homepage-final-validation-check` (self-testing, homepage-scoped) + CI job. Reframed the M2.16
homepage-final + website-public-copy guards to the new public framing.

### Battery
| Check | Result |
|---|---|
| tsc | ✅ clean |
| vitest | ✅ 329/329 (26 files) |
| next build | ✅ home `/` static 4.71 kB |
| home/nav/surface guards (11) | ✅ pass |
| homepage-final-validation (new) | ✅ pass |
| identity · purity · rust-rule · private-key | ✅ pass |

## Deploy · Live QA · Verdict
- **PR [#170](https://github.com/banza-protocol/banza/pull/170):** 139/139 CI green (incl. the new
  homepage-final-validation job); admin-squash-merged as `1d6bc8d` (only block was REVIEW_REQUIRED),
  branch deleted, main synced. VPS repo synced; website image `v1.0.0` rebuilt + restarted (healthy).
- **Live QA (banza.network, 2026-07-25):**
  - Home copy — all present, one `<h1>`; `interface primária humano-operador`, `Começar a implementar`,
    `evidência técnica`, `A base para` all ABSENT.
  - Routes — `/`, `/operadores`, `/banzai`, `/referencia`, `/referencia/programadores`, `/estado`,
    `/decisoes`, `/licenca` → 200; `/operador-zero` → **410**; `zero.banza.network` → **200**.
  - Live BanzAI card — `POST /banzai/ask` grounded, `local_model_called: true`,
    **`external_model_called: false`**, 9 sources, real answer; browser: single-submit (double-click →
    one bubble), SafeMarkdown render, three-tier nav, first fold reached at 1366×768.
  - Footer — both boundary lines live.
  - Invariants — `/operators=[]`, `production_certificates=false`, Operador Zero demo-only, no backend
    change, no external call on load.
  - Deployed HTML — `BANZA CA`, `operador(es) certificad`, `Verificação Tripla`, the operator brand and
    `Qwen` all ABSENT.

**Verdict:** M2.17 complete — the homepage is fully audited and validated across navigation, routes,
buttons, BanzAI interaction, protocol copy, responsive behaviour, accessibility, SSR, hydration,
performance and the directly-linked public surfaces.

## Limitations
- The /banzai page retains the architectural "interface primária humano-operador" framing (ADR-054);
  the public *home* definition now leads with "agente de IA". Not a contradiction — noted as a
  deliberate division between public copy and architectural docs.
- Runtime-only conditions (real BanzAI answers, cross-browser, zoom) are validated by browser QA + live
  QA, not by the static guard.

## Rollback
Redeploy the previous website image (pre-M2.17). Branch rollback ref: `04431c0`.
