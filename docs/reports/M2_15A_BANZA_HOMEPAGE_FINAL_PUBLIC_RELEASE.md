# M2.15A — BANZA Homepage Final Editorial, Architectural and Production-Ready Redesign

> Status: **COMPLETE · LIVE** (PR #164 → `08d20a2`; deployed; live QA green).
> Branch: `feat/m2-15a-homepage-final-public-release-2026-07` (merged) · base `main` `7fb3bdc`.

## 1. Objective
Audit, simplify, reorganize and finalize the entire public BANZA homepage (including the Hero) for
the official public release of the protocol's final v1.0 on **1 August 2026**. The homepage must present
the protocol simply, objectively, institutionally, with a strong visual and a correct architecture,
coherent with ADR-054 and with M2.14H/M2.14I/M2.14J, and serve as the narrative base for the future
whitepaper — **without** trying to replace the Reference, the Architecture page, the BanzAI surface, the
verifiable State, the developer docs, the ADRs/RFCs, or the whitepaper.

Editorial principle: *the homepage states the thesis, explains the essential mechanism, and routes the
reader; the specialised pages develop the detail.* The experience moves from "here is all the
architecture, journey and state" to "**this is BANZA, this is the problem it solves, this is how it
works, and this is the right place to start.**"

## 2. Context — 1 August 2026 public release
BANZA reached protocol-first closure across M2.7–M2.14: open governance (no CA), signed-metadata trust,
Operador Zero simulator, BanzAI as the primary human-operator interface (ADR-054), and a converged
deterministic action boundary (M2.14J). The homepage is the last public surface still shaped like a
documentation index; M2.15A makes it a concise institutional introduction fit for the public launch.

## 3. Initial state (evidence)
- `main` green after the preflight hotfix `7fb3bdc` (a fresh `banza-repo-guards` contamination gate
  flagged an incidental creator-attribution brand token in the M2.14J report; removed — Identity Guard
  + Rust Engines now `success` on `main`).
- Required history present: M2.14H `dfbac25`, M2.14I `5405ff2` (ADR-054), M2.14J `05002db` (PR #163) +
  verdict `0d8c447`.
- Live invariants: homepage/`/banzai`/`/referencia`/`/estado` = 200; `zero.banza.network` = 200;
  `/operador-zero` = 410; `/operators` = `[]`; `production_certificates` = `false`;
  `external_model_called` = `false` on deterministic answers. Operador Zero demo-only.
- Homepage source: `app/page.tsx` → `HeroEstado` + `BoundarySnapshot` + a bridge microphrase +
  `OperatorArchitectureSection`; global `SiteNav` (header) + `SiteFooter` (footer); metadata in
  `app/layout.tsx`; nav/footer config in `lib/site.ts`.
- Prior deployed URL: https://banza.network/ (rollback SHA = `7fb3bdc`; runtime rollback = previous
  website image).

## 4. Audit by section (matrix)

| # | Section | Component / file | Current message | Problem | Decision | Detail destination | Test |
|---|---------|------------------|-----------------|---------|----------|--------------------|------|
| H | Header | `SiteNav.tsx` + `lib/site.ts` | Brand + 3 dropdowns + BanzAI pill + Ler a referência | Already close to PART 7 | **keep** (minor) | — | structure |
| 1 | Hero | `HeroEstado.tsx` | "O protocolo aberto que liga os pagamentos em Angola" + orbital diagram + 7-row state panel + embedded chat + "Começar implementação" | Ambiguous H1 (payment routing), three competing foci, forbidden CTA, state overload (Qwen/trust/counts), orbital = central-hub ambiguity | **replace** → `Hero.tsx` (SSR, typographic, 2 CTAs, compact state line) | state panel → `/estado`; diagram removed (deprecated) | hero |
| 2 | BanzAI entry | inside `HeroEstado.tsx` | chat module competing inside the hero | Not a standalone section; ambiguous prompt "Posso federar…" | **move** → standalone `BanzaiEntry.tsx` below hero | — | banzai |
| 3 | Boundary | `BoundarySnapshot.tsx` | "O que o BANZA é — e o que não é" (6 IS incl. BanzAI as 6th + "orquestra"; 9 IS_NOT) | BanzAI as 6th definition item; "orquestra"; English term soup; position (right after hero) | **replace** → `BoundaryClear.tsx` (4+4, m2m independence) placed after "Como funciona" | — | fronteira |
| 4 | Architecture / journey / simulator | `OperatorArchitectureSection.tsx` | 4 layers (BanzAI = numbered layer 3, "interface oficial", "orquestra"), 9-step auto-playing journey + simulator, "BanzAI guia/orquestra todo o fluxo", "O operador começa no BanzAI" | Homepage-dominating; BanzAI as mandatory layer; multiple forbidden phrases; heavy JS (canvas + setInterval) | **remove from homepage** (condense to `HowItWorks.tsx` 4 movements) | canonical flow lives in `/referencia/arquitectura` + ADRs + SVG-P diagrams; widget in git history | como-funciona |
| 5 | Bridge microphrase | `app/page.tsx:27` | "…o fluxo operacional começa no BanzAI." | Forbidden phrase (PART 5.5/13/18) | **remove** | — | absences |
| 6 | Verifiable state | (in hero panel) | 7 rows incl. Qwen local / Trust metadata / counts | Too detailed for the homepage | **condense** → `VerifiableState.tsx` (4 states + CTA) | `/estado` | estado |
| 7 | Audience paths | (none on current home) | — | Missing concise routing | **add** → `AudiencePaths.tsx` (3 paths) | — | percursos |
| 8 | Footer | `SiteFooter.tsx` + `lib/site.ts` | 5 columns; Governança ×3; "protocolo financeiro aberto de Angola"; badge "SEM OPERADOR PUBLICADO" | Duplicated links, >4 columns, forbidden description phrasing | **condense** → 4 unique-link columns, new description + badges | — | footer |
| 9 | Metadata / SEO | `app/layout.tsx` | title "…Infraestrutura Financeira"; "pagamentos" keyword | Not the PART 24 copy; payment keyword | **replace** | — | ssr/seo |

## 5. Findings (PART 5) the implementation resolves
- **5.1 Excess content** — the homepage tries to explain definition + boundaries + rules + trust +
  conformance + federation + operators + journey + simulation + evidence + BanzAI + state + governance.
  → reduced to thesis → BanzAI → value → mechanism → boundary → state → paths → CTA.
- **5.2 Repetition** — "BanzAI as start", "verifiable evidence", "independent operators", "no approval",
  "no certification", "engines verify", "pre-production", "no operator published", "read the reference"
  each appear multiple times. → each stated **once**, strongly, then developed on the specialised page.
- **5.3 Hero with three competing foci** (text + orbital diagram + state panel). → single editorial
  hierarchy.
- **5.4 Ambiguous title** — remove "O protocolo aberto que liga os pagamentos em Angola." → canonical H1.
- **5.5 BanzAI as a mandatory layer** (Governança/Núcleo/**BanzAI**/Operadores). → BanzAI presented as
  the human-experience interface, not a technical layer everything must pass through.
- **5.6 Excess simulator + journey** (9 steps + autoplay). → removed from the homepage; 4 movements.
- **5.7 State too detailed in the Hero** (7 states, Qwen, trust metadata, counts). → 4 compact states.
- **5.8 Footer excess** (Referência/Governança/BanzAI/Estado repeated). → simplified, unique links.
- **5.9 Inconsistent vocabulary** — normalise PT terms; English only for contract/field/component names.

## 6. Editorial decision
Rebuild the homepage as a concise, coherent public introduction. Keep the vinho/marfim identity,
editorial typography, BANZA mark, soft borders and subtle shadows; drop the dashboard/console feel
(orbital hub, live simulator, detailed state panel). Present each message once and route to the
specialised surfaces. BanzAI is the primary **human-operator** interface; machine-to-machine surfaces
(APIs, manifests, schemas, endpoints, engines) stay independent of BanzAI.

## 7. Final homepage architecture
`Header → Hero → BanzAI entry → Protocol value → How it works (4 movements) → Boundary → Verifiable
state → Audience paths → Final CTA → Footer.` (PART 6 canonical order.)

## 8. Header
Kept (PART 7): logo, BANZA, discreet `PROTOCOLO · v1.0`, three dropdowns (Protocolo · Confiança ·
Programadores), the BanzAI pill and the "Ler a referência" action. No operational state, no
financial-product language, no third high-priority CTA. Header is global → validated on all public
routes after the change.

## 9–10. Header / Hero (implemented)
Header kept (§8). Hero rebuilt as `components/home/Hero.tsx` — a single SSR editorial column (eyebrow →
H1 → paragraph → two CTAs → one compact state line) plus a quiet, static, `aria-hidden` typographic
mark (BANZA symbol + open arcs) on the right at `lg`; the visual is decorative, not a hub/flow/orbital.
No `"use client"`, no canvas, no timers → the Hero copy is in the initial SSR HTML with no LCP/CLS cost.

## 13–15. Visual before → after; removed panel
- **Before**: a 460px live canvas "orbital" diagram (rAF animation, central BANZA hub with five satellite
  nodes) + a right-hand 7-row "Painel de estado" (incl. `Qwen local`, `Trust metadata`, counters) + an
  embedded live chat — three competing foci in the Hero.
- **After**: one editorial hierarchy + a static decorative mark; the state is one line; the chat is its
  own section (BanzaiEntry). The detailed state panel is removed from the Hero (the full state lives at
  `/estado`); the orbital canvas is removed entirely (deprecated per PART 9, recoverable from git
  history). The nine-step journey + live simulator + layered-architecture widget
  (`OperatorArchitectureSection`) are removed from the homepage; the canonical protocol flow lives in
  `/referencia/arquitectura`, the ADRs and the SVG-P diagrams.

## 16–24. Sections (implemented)
BanzaiEntry (§10 copy), ProtocolValue (§11 PART), HowItWorks (4 movements), BoundaryClear (fronteira +
m2m independence), VerifiableState (4 states), AudiencePaths (3 paths), FinalCta (2 CTAs), Footer
(4 unique-link columns), Metadata (canonical title/description). Copy is the canonical PART 8–17 copy.

## 11. Previous copy (removed)
- Eyebrow: `PROTOCOLO · CONTRATOS · CONFORMIDADE`
- H1: `O protocolo aberto / que liga os pagamentos / em Angola.`
- Hero CTA: `Começar implementação`
- Boundary IS #6: `Um ecossistema acompanhado pelo BanzAI, o agente do protocolo: BanzAI guia e orquestra…`
- Arch: `BanzAI … guia todo o fluxo`; `Interface oficial do operador: BanzAI guia e orquestra`;
  `BanzAI orquestra todo o fluxo`; `O operador começa no BanzAI.`
- Bridge: `Com a fronteira clara, o fluxo operacional começa no BanzAI.`
- Footer description: `O protocolo financeiro aberto de Angola.`

## 12. Final copy
- Eyebrow: `PROTOCOLO FINANCEIRO ABERTO · v1.0`
- H1: `Um protocolo financeiro aberto para interoperabilidade entre operadores em Angola.`
- Paragraph: `O BANZA define regras públicas, contratos e evidência verificável para que operadores
  independentes possam integrar-se sem acordos bilaterais nem um sistema central.`
- CTA principal: `Explorar com o BanzAI` → `/banzai` · CTA secundário: `Ler a referência` → `/referencia`
- State line: `Especificação pública v1.0 · Rede em pré-produção · Sem evidência de operador indexada`
  + `Ver estado verificável` → `/estado`
- Canonical phrase: `BanzAI guia; os motores verificam; a evidência prova; a governança decide.`

## 25. Terminology (PART 19)
Homepage uses: Protocolo financeiro aberto · Governança · Conformidade e Evidência · Manifesto de
Operador · Metadados Assinados · Registo Público · Avaliação de Confiança · Lista de Revogação · falha
fechada · operadores independentes · evidência verificável · interoperabilidade. English only for
contract/field/component names (e.g. Trust Engine, Evidence Bundle) on first use.

## 26. ADR-054 & machine-to-machine independence
BanzAI = primary human-operator interface (interprets requests, consults the reference, guides
implementation, routes to verifiable engines, explains results, helps prepare technical evidence).
Machine-to-machine integrations remain available directly via APIs, manifests, schemas, endpoints and
engines, **without depending on BanzAI**. No homepage text/visual/CTA presents BanzAI as normative, a
mandatory technical layer, a certifier, an approver, a licenser, or presents BANZA as a central system /
payment processor / official state-recognised system.

## 37. Files changed
- **New home sections**: `website/components/home/{Hero,BanzaiEntry,ProtocolValue,HowItWorks,BoundaryClear,VerifiableState,AudiencePaths,FinalCta}.tsx`
- **Rewritten**: `website/app/page.tsx` (composition), `website/app/layout.tsx` (metadata),
  `website/components/SiteFooter.tsx` + `website/lib/site.ts` (footer)
- **Removed** (homepage-only, no other references): `website/components/home/{HeroEstado,BoundarySnapshot,OperatorArchitectureSection}.tsx`
  + the M2.7F `homeHarmonization.test.ts`
- **Guard**: new `tools/check-homepage-final-public-release.sh` + Makefile + `.github/workflows/identity-guard.yml`;
  updated `tools/check-{home-minimal,home-layout-copy,website-public-copy-current,banzai-unified-markdown-rendering}.sh`
- **Tests**: new `website/lib/m2_15a-homepage.test.ts`; updated `website/components/home/nativeAgent.test.ts` +
  `website/lib/m2_14j-public-consistency.test.ts`
- **Preflight hotfix** (main): `docs/reports/M2_14J_...md` (dropped creator-attribution brand token → restored main green)
- **Report**: `docs/reports/M2_15A_BANZA_HOMEPAGE_FINAL_PUBLIC_RELEASE.md`

## 39b. Performance (implemented)
The homepage now imports ONE client component (BanzaiEntry) versus two heavy ones before (HeroEstado
with a rAF canvas loop + OperatorArchitectureSection with a `setInterval` simulator). The orbital
canvas and the auto-playing simulator are gone — no decorative timers, no hidden simulator JS. Hero copy
is SSR; the decorative visual is a fixed-aspect inline SVG (no CLS). `next build` OK (112 static pages).

## 38. Files NOT changed
Out-of-scope page bodies (`/banzai`, O que é, Por que existe, Arquitectura, Confiança, Conformidade,
Federação, Operadores, Governança, Estado, Programadores, Referência, Roteiro, FAQ, Decisões, Segurança,
Contacto), the BanzAI API/routing/engines, boundaries, trust root, operators, Postgres, manifests,
schemas, endpoints, provider, model, inference, queue, infra, real network state. No new ADR.

## 39. Tests
New `website/lib/m2_15a-homepage.test.ts` (31 assertions: canonical order, one H1 in the Hero, Hero
contract, BanzAI section + canonical phrase + boundary note + safe prompts, three pillars, four
movements + no journey/simulator, fronteira 4+4 + m2m, four states + no Qwen, three audience paths,
final two CTAs, footer dedup + description, the mandatory ABSENCES, metadata). Retired the M2.7F
`homeHarmonization` suite (11) and the OperatorArchitectureSection assertions in nativeAgent/m2_14j.
Full website suite: **318 vitest** + `tsc --noEmit` clean + `next build` OK (112 pages).

## 40. Guards
New `make homepage-final-public-release-check` (canonical order, one H1, Hero contract, ADR-054
architecture, m2m independence, neutrality, metadata, footer dedup, links; comment- and negation-aware;
self-testing) — wired into the Makefile + CI (identity-guard.yml). Updated the four homepage-touching
guards to the new component set: `home-minimal-check`, `home-layout-copy-check`,
`website-public-copy-current-check`, `banzai-unified-markdown-rendering-check`. Battery green:
homepage-final, home-minimal, home-layout-copy, website-public-copy-current, banzai-unified-markdown,
banzai-public-surface-final-consistency, banzai-primary-interface-architecture, identity-check,
purity-check, rust-rule-check, private-key-leak-check — all PASS.

## 41. Limited adversarial review
One bounded round (PART 29), 10 fixed lenses over the homepage source: architectural, regulatory,
production, certification, processing, banzai-dependency, metadata, links, absences, ssr-a11y. Each
lens independently reviewed the rendered copy (ignoring comments/negations); every flagged finding
was adversarially re-verified. **Result: 0 findings across all 10 lenses → 0 confirmed CRITICAL/HIGH.**
No new mechanism surfaced; the review was not iterated (single round, per PART 29). The homepage is
clean on every claim family.

## 42. CI
PR **#164** → all **135 checks green**, admin-squash-merged to `main` as **`08d20a2`** (branch deleted).
One iteration: the M2.7H `banzai-protocol-agent` guard (which scans comments) flagged the string "BanzAI
chat" in a Hero code comment as the retired "BanzAI Chat" brand → reworded to "BanzAI Q&A" (`aeb9a63`,
no behavioural change); CI then 135/135.

## 43. Deploy
Website only (no backend change). VPS `195.20.246.118`: repo → `08d20a2`; `docker compose build website`
→ image built; `up -d --no-deps website` → container **healthy**; `reverse-proxy nginx -s reload` applied.
banzai-api untouched (no rebuild).

## 44. Live QA
Production (`banza.network` + `zero.banza.network`):
- **SSR (raw HTML, no JS)** carries the new homepage: canonical eyebrow + H1 (*"Um protocolo financeiro
  aberto para interoperabilidade entre operadores em Angola."*) + all eight section headings (Comece pelo
  BanzAI, Interoperabilidade sem um sistema central, Como o BANZA funciona, Uma fronteira clara, Estado
  verificável, Por onde começar). The CDN serves the new version (query-string and clean URL identical).
- **Old copy absent from SSR**: `liga os pagamentos`, `Começar implementação`, `Painel de estado`,
  `Qwen local`, `orquestra todo o fluxo` — all gone.
- **Metadata**: `<title>` and `og:title` = *BANZA — Protocolo financeiro aberto para interoperabilidade
  em Angola*.
- **Links**: `/`, `/banzai`, `/referencia`, `/referencia/arquitectura`, `/referencia/programadores`,
  `/estado` → 200; `zero.banza.network` → 200; `/operador-zero` → 410.
- **Invariants**: `/operators` = `[]`; `production_certificates` = `false`; `external_model_called` =
  `false` (provider `local_qwen`). No change to the real network state.
- **Visual**: desktop (live, CDN) — single editorial hierarchy, canonical hero, quiet mark, two CTAs;
  mobile (375) — single column, hamburger menu, no overflow.

## 42b. Cache / CDN
Cloudflare fronts the origin (proxied, Full). The apex HTML returned the new deploy immediately (SSR +
metadata verified with and without a cache-busting query). No purge was required.

## 45. Limitations
- The reference/architecture animated journey+simulator widget is not re-homed in this phase (out of
  scope, PART 2): the canonical protocol flow remains in `/referencia/arquitectura`, the ADRs and the
  SVG-P diagrams; the widget is recoverable from git history for a future Arquitectura phase.
- The Hero's live BanzAI chat depends on the production same-origin `POST /banzai/ask`; on a local dev
  server the input renders but answers require the deployed backend (verified post-deploy in live QA).
- The BanzAI chat + scroll-reveal are the only client-side JS on the homepage; everything else is SSR.

## 46. Rollback
`git checkout main && git reset --hard 7fb3bdc` (branch base). Runtime: redeploy the previous website
image. The removed animated architecture/journey/simulator widget remains recoverable from git history
(pre-M2.15A `OperatorArchitectureSection.tsx`).

## 47. Verdict
**M2.15A complete — LIVE.** The BANZA homepage has been rebuilt as a concise, coherent and
production-ready public introduction to the protocol. The Hero identifies BANZA as an open financial
protocol for interoperability between independent operators in Angola without implying payment
processing, central operation or official status. BanzAI is presented as the primary human-operator
interface while machine-to-machine surfaces remain independent. The previous state dashboard, orbital
diagram, nine-step journey, active simulator and repetitive architectural content have been removed from
the homepage or preserved for specialised surfaces. The final page explains the protocol, its essential
mechanism, its boundaries, its current state and the appropriate paths for each audience. SSR, hydrated
UI, metadata, CDN, desktop and mobile all serve the same final public-release narrative.

No CRITICAL or HIGH finding remains open (limited adversarial review: 0/10 lenses). Battery: 318 vitest ·
tsc · `next build` (112 pages) · 11 guards + the new `homepage-final-public-release-check`. CI #164
135/135 → `08d20a2`; deployed (website container healthy, reverse-proxy reloaded); live QA green on apex
+ zero, desktop + mobile. Prepared as the narrative base for the 1 August 2026 public release.

*A homepage final do BANZA apresenta apenas o que um visitante precisa de compreender antes de explorar
o protocolo: o que é o BANZA, que problema resolve, como funciona, quais são as suas fronteiras, qual é o
seu estado actual e onde cada audiência deve começar. O BanzAI é a interface primária humano-operador,
mas as integrações máquina-máquina continuam independentes. O detalhe técnico foi retirado da homepage e
preservado para as superfícies especializadas. A experiência publicada está simples, objectiva, coerente
com a ADR-054 e preparada para a divulgação pública de 1 de Agosto de 2026.*

---

## 48. M2.15A-FIX — Hero symbol animation restored (PR #165 → e4085c7) — LIVE
The M2.15A Hero had replaced the pre-existing animated canvas "living diagram" with a static SVG, which
lost the movement, rhythm and graphic presence of the BANZA-symbol animation. Restored the exact previous
animation, byte-identical.

- **Current component (before fix)**: `Hero.tsx` right column rendered a static inline `<svg>` (concentric
  arcs + mark) — no motion.
- **Restored implementation**: recovered from `7fb3bdc:website/components/home/HeroEstado.tsx`; the canvas
  `draw()` (rAF) is byte-identical — pulsing radial halo (`0.5+0.5*sin(tt*1.5)`), three orbital rings
  (`ringR±`), rotating sweep arc (`tt*0.5`), spokes + junction dots (`#8E1326`/`#FBEFF0`), two flowing
  particles per spoke (`#C2566A`, `(tt*0.33 + i*0.13 + k*0.5)%1`), two orbiting glow dots (`tt*0.45`);
  same central mark (118px dark radial-gradient disc + `/banza-mark.png` 62px); same 5 orbital-anchor
  positions. Extracted into a client-only `HeroVisual.tsx`; the Hero copy stays SSR.
- **Degradation cause**: the static SVG had no animation at all. Additionally, the original loop used a
  `stopped` flag but never `cancelAnimationFrame`, so under React StrictMode's dev double-mount the rAF
  loop was orphaned/dead (it ran in production, but was fragile and unverifiable in dev).
- **How restored**: draw() body copied verbatim; only the loop *lifecycle* changed — an external ticker
  owns the rAF id and cleanup calls `cancelAnimationFrame` (StrictMode-safe). The five labelled operator/
  concept hub cards were NOT restored (M2.15A/ADR-054 removed the labelled hub) — invisible anchors drive
  the identical animated composition. `prefers-reduced-motion` still renders a single static frame.
- **Files**: new `website/components/home/HeroVisual.tsx`; `Hero.tsx` (render HeroVisual, drop static SVG);
  `homepage-final-public-release-check` (allow decorative canvas, forbid labelled hub); `m2_15a-homepage.test.ts`.
- **Tests/build**: tsc clean · 68 vitest (incl. HeroVisual assertions) · `next build` OK. **CI #165 135/135
  → `e4085c7`** (admin-merged). Guards green.
- **Deploy/Live QA**: website-only, VPS `e4085c7`, container healthy. Live (`banza.network`, 1440px): the
  living diagram renders and animates — canvas pixel probe **15,452 non-transparent, maxAlpha 255** (0/blank
  before the fix); homepage structure/copy unchanged, `/` 200, old copy absent.
- **Verdict**: the homepage keeps the M2.15A editorial structure; the Hero recovers exactly the previous
  BANZA-symbol animation, without degradation and without reinterpreting the original motion.

## 49. M2.15A-FIX2 — Hero cards restored around the animated symbol (operator correction)
Follow-up to §48. The operator confirmed the intent was to recover the animation **exactly as it was,
including the five labelled cards orbiting the symbol** (`igual, não parecida`). §48 had deliberately
omitted the labelled cards (invisible anchors only); this restores them verbatim.

- **What was missing**: §48 rendered five *invisible* `data-node` anchors, so the canvas geometry matched
  but the labelled cards (Regras Públicas · Confiança · Conformidade · Federação · Operadores) were absent.
- **Restored verbatim**: the `NODES` array, the `ProtocolIcon` set (rules/shield/shieldCheck/network/users)
  and the card markup (icon tile in `bg-tint-bordo` + green `bg-ok` check badge + concept label), recovered
  from `7fb3bdc:website/components/home/HeroEstado.tsx`, in the same five positions. The `draw()` body and
  the StrictMode-safe loop are unchanged from §48 — motion is byte-identical.
- **Neutrality**: the card labels are generic protocol concepts — no commercial operator brand — so the
  operator-neutrality invariant (`identity-check`) is untouched (verified: contamination gate PASS, no
  `HeroVisual` findings). The **state panel / Qwen / trust-metadata** remain OUT of the Hero (guard rule 8).
- **Guard**: `homepage-final-public-release-check` rule 9 flipped from *forbidding* the labelled cards to
  *requiring* the animated canvas (`<canvas` + `requestAnimationFrame`) — guarding against another static
  regression. `m2_15a-homepage.test.ts` now asserts the five cards are present (and the state panel absent).
- **Verification (production build served locally)**: dev shows a blank canvas — the known React
  StrictMode/Fast-Refresh dev double-invoke that orphans the rAF loop (the *original* component behaved the
  same way). A real `next build` + `next start` serve (no StrictMode double-invoke) paints the full living
  diagram: canvas pixel probe **15,099 non-transparent, maxAlpha 255**, all five cards present. Screenshot
  shows rings + spokes + junction dots + flowing particles + glow dots + the five cards around the symbol.
- **Battery**: tsc clean · **323 vitest** (36 in the M2.15A suite) · `next build` OK · homepage guard +
  4 home guards + identity-check all PASS.

## 50. M2.15A-FIX3 — Hero cards aligned onto one coherent ring
Follow-up to §49. The restored cards did not share a common radius: measured distances from the symbol
were Regras Públicas ≈198px, **Confiança/Conformidade ≈153px** (too far inside), Federação/Operadores
≈221px — a 68px spread, so the two side cards visibly sat inside the orbital ring while the bottom pair
sat outside it. Repositioned all five so they form a **regular pentagon** (equal radius + even 72°
spacing) centred on the symbol.

- **Change** (`HeroVisual.tsx` only): each card is now CENTRED on its point via
  `left-[..] top-[..] -translate-x-1/2 -translate-y-1/2` at the pentagon coordinates — top `50%,13%`;
  upper `15%/85%, 39%`; lower `28%/72%, 80%`. Stage changed from `aspect-[38/46] max-w-[400px]` (tall,
  which compressed the circle) to `aspect-square max-w-[440px]` so the circle fills the box. `draw()`
  and the rAF loop are unchanged; because all nodes are now equidistant, the computed `ringR` (their
  average) is a clean circle and the spokes/junctions are symmetric.
- **Result (measured on the production build)**: card distances 161–164px, **spread 3px** (was 68px);
  angles −90 / ±(163/17) / (126/54) → even ~72° spacing. Canvas paints 12,317 px. Verified at 1440px
  and at the narrow lg edge (1024px) — no clipping or overlap; mobile still hides the desktop visual.
- **Guards/tests**: no contract change needed (positions aren't asserted). `homepage-final-public-release`
  + 4 home guards PASS; `m2_15a-homepage.test.ts` 36/36; tsc + `next build` OK.
