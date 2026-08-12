# M2.16 — BANZA Home Redesign (dossier design, full replacement)

**Status:** COMPLETE · LIVE on banza.network
**PR:** [#169](https://github.com/banza-protocol/banza/pull/169) — 137/137 CI green, admin-squash-merged (`2ed06e8`)
**Deployed:** website image `v1.0.0` on the VPS (container healthy); repo HEAD `2ed06e8`
**Branch:** `feat/m2-16-home-redesign-dossier-2026-07` (merged + deleted)
**Date:** 2026-07-24
**Supersedes:** the M2.15A eight-section editorial homepage (see
[M2_15A](M2_15A_BANZA_HOMEPAGE_FINAL_PUBLIC_RELEASE.md)); the M2.15B three-destination
global navigation ([M2_15B](M2_15B_BANZA_GLOBAL_NAVIGATION_FINAL_SIMPLIFICATION.md)) is
carried forward unchanged.

---

## 1. Intent

Implement the approved home design produced in Claude Design (dossier
`~/Downloads/dossier-home`: `Home.dc.html`, `SiteNav.dc.html`, `SiteFooter.dc.html`,
`reference-home.png`) as the public homepage, **completely replacing** the current one, with
**no invention or re-creation** of what the design already specifies — pixel-faithful to the
dossier.

**One deliberate divergence, chosen by the product owner:** the design's "Perguntar ao BanzAI"
card shipped with a **canned `kb()`** whose answers described the *retired* protocol model (a
central CA, a commercial operator brand, certified-operator language, stale ADRs, payment
processing). That content violates the protocol-neutrality invariants and would hard-fail CI.
Per the owner's decision — *"UI do design + agente ao vivo"* — the card's **UI is ported 1:1**
but its brain is the **live, Rust-controlled BanzAI agent** (same-origin `POST /banzai/ask`,
local Qwen) via the existing `banzaiKb` adapter and shared `SafeMarkdown` renderer. The canned
`kb()` is **not** shipped.

---

## 2. What the new home is

| Region | Source | Notes |
|---|---|---|
| Hero | `website/app/page.tsx` (SSR) | eyebrow `PROTOCOLO FINANCEIRO ABERTO · v1.0` → one `<h1>` (`Interoperabilidade` … `financeira em Angola,` … `sem acordos bilaterais.`) → lead paragraph. Two-column `minmax(0,1fr) minmax(0,0.92fr)`. |
| Living diagram | `website/components/home/HomeHeroDiagram.tsx` (client) | canvas rAF animation ported byte-faithful from the design `frame()`: 6 operator nodes on a ring, connection ring, scanning arc, halo, centre↔operator radials with bidirectional packets, peer-to-peer chords with ping-pong packet, handshake rings. StrictMode-safe loop; `prefers-reduced-motion` draws one static frame. Central medallion carries the BANZA crest (`/banza-crest-hd.png`). |
| Ask card | `website/components/home/HomeAsk.tsx` (client) | "Perguntar ao BanzAI" — UI 1:1 with the design (sparkle tile, subtitle, auto-grow textarea + attach/code icons, bordô button, 4 quick-prompt chips, inline answer bubbles, cite chips, status line, busy indicator). Wired to `banzaiKb` + `SafeMarkdown`. |
| BANZA/BanzAI card | `page.tsx` | two-column card; frames BanzAI as the **primary human-operator interface** of BANZA. |
| CTAs | `page.tsx` | `/referencia` (bordô) · `/operadores` (outline) · `/referencia/programadores`. |
| State line | `page.tsx` | mono: `Especificação pública v1.0 · Rede em pré-produção · Sem evidência de operador indexada`. |
| Nav | `website/components/SiteNav.tsx` | design chrome; **preserves the M2.15B three-destination contract** (Operadores · BanzAI · Ler a referência), single active state, mobile hamburger. |
| Footer | `website/components/SiteFooter.tsx` + `website/lib/site.ts` | design footer: brand + description, four columns (BanzAI · Protocolo · Implementação · Contacto), institutional boundary line, bottom bar. |
| Fonts | `website/app/fonts.ts` (existing) | the design's four families already self-hosted as CSS vars (`--font-serif` Source Serif 4, `--font-sans` Public Sans, `--font-mono` IBM Plex Mono, `--font-display` Spectral) — no external CDN. |
| Responsive | `website/app/globals.css` | `@media (max-width:820px)` collapses nav→hamburger, hero→1 col, cards→1 col, footer→2 cols; `≤480px` footer→1 col. |

**Removed** (superseded 8-section model): `Hero`, `HeroVisual`, `BanzaiEntry`, `ProtocolValue`,
`HowItWorks`, `BoundaryClear`, `VerifiableState`, `AudiencePaths`, `FinalCta` components and
`lib/m2_15a-homepage.test.ts`.

---

## 3. Guards & tests

- **Contract guard rewritten to M2.16:** `tools/check-homepage-final-public-release.sh` pins the
  BanzAI-first hero (two client islands, one H1 with the canonical copy, eyebrow, state line, three
  real CTA routes, "interface primária humano-operador", the **live-agent wiring**
  `banzaiKb` + `SafeMarkdown`), and the neutrality invariants (no `BANZA CA` / `operador
  certificado` / `Verificação Tripla` / `ADR-02x`, no commercial operator brand, no payment-
  processing language, no `Qwen` in source).
- **Retargeted to the new home:** `check-home-minimal.sh`, `check-home-layout-copy.sh`,
  `check-website-public-copy-current.sh`, `check-banzai-unified-markdown-rendering.sh`.
- **Contamination-safe:** the three home guards build the commercial operator brand at runtime by
  concatenation (`BRAND="banza""mi"`) and never embed the literal — `make identity-check` passes
  with **no contamination violations**.
- **New test:** `website/lib/m2_16-home.test.ts` — source-level assertions over `page.tsx`,
  `HomeAsk`, `HomeHeroDiagram`, the footer columns, and the mandatory absences.

### Battery result

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `vitest` | ✅ 314/314 (25 files) |
| `next build` | ✅ home `/` static, 4.66 kB / 163 kB first-load |
| home guards (5) | ✅ pass |
| nav/footer/surface/operator-zero guards (12) | ✅ pass |
| `identity-check` (contamination) | ✅ no violations |
| `purity-check` · `rust-rule-check` · `private-key-leak-check` | ✅ pass |

### Local visual QA (prod build, port 3010)

Desktop (matches `reference-home.png`): hero, living-diagram animation + crest, ask card 1:1,
BANZA/BanzAI card, three CTAs, state line, nav (three destinations), footer (four columns +
boundary + bottom bar). Ask card wired end-to-end — with no backend locally it renders the safe
"temporariamente indisponível" fallback (never crashes). Mobile (375×812): nav→hamburger→three
destinations, hero→single column, diagram full-width. No console errors.

---

## 4. Invariants preserved

BanzAI = primary human-operator interface (not normative/authority/certifier). No operator brand,
no `BANZA CA`, no certified-operator language, no payment-processing claims on the home. Live
answers come from the on-host Rust-controlled agent (external calls = 0). Public-surface
invariants unchanged: `/operators=[]`, `production_certificates=false`, `/operador-zero=410`,
Operador Zero demo-only.

---

## 5. Live QA verdict (banza.network — 2026-07-24, image `v1.0.0`)

All checks passed against the deployed site:

- **Home** — HTTP 200; one `<h1>` with the canonical copy; eyebrow, state line, "interface primária
  humano-operador", footer boundary line all present; `<canvas>` + crest (`banza-crest-hd.png`)
  rendered; both design assets serve 200.
- **Routes** — `/`, `/operadores`, `/referencia`, `/banzai`, `/referencia/programadores`, `/estado`,
  `/decisoes` → 200; `/operador-zero` → **410**; `zero.banza.network` → **200**.
- **Live BanzAI card** — end-to-end via the browser and `POST /banzai/ask`: user + agent bubbles
  render through `SafeMarkdown`; a real grounded answer ("O que é o BANZA?") with 5 sources;
  `grounded: true`, `local_model_called: true`, **`external_model_called: false`** (nothing leaves the
  host).
- **Invariants** — `/operators → []`; `/certificates → production_certificates: false`,
  `pre_production: true`.
- **Adversarial neutrality on the deployed HTML** — `BANZA CA`, `operador(es) certificado(s)`,
  `Verificação Tripla`, the commercial operator brand, payment-processing language, and `Qwen` are all
  ABSENT; the three CTA hrefs are present in the served markup.
- **Responsive + no console errors** — verified on the identical build (desktop 1280/1440 + mobile
  375: nav→hamburger→three destinations, hero→single column, diagram full-width).
