# BANZA — Website Institucional (`website`)

Official protocol website for **`banza.network`** (canonical domain) —
institutional, technical, premium, **Portuguese (pt-PT)**, built from the Claude
Design handoff and grounded in `docs/reference/pt/completa.md` as the source of truth.

> **BANZA is the protocol, not an operator.** BANZA is the open
> **protocol/infrastructure**; an operator is a separate **product** that
> implements it. Per the repository's operator-neutrality invariant, this site and
> its source name **no specific operator brand**. The site presents the protocol
> only — it never claims production certification, certified operators, or live
> production federation.

This is the **canonical public website** for `banza.network`. It replaced the
former `apps/docs` site and is deployed as the `website` service in the reproducible
stack under [`infra/banza-network/`](../infra/banza-network/README.md)
(`docker compose up -d website`, fixed image tags).

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3
- Fonts self-hosted via `next/font/local` from [`app/fonts/`](app/fonts/README.md): Source Serif 4,
  Public Sans, IBM Plex Mono, Spectral (all SIL OFL 1.1). The production build makes no font network
  request — `next/font/google` would fetch from `fonts.gstatic.com` at build time.
- No backend — fully static (SSG). No product dependencies or SDKs.

## Run locally

```bash
cd website
npm install
npm run dev        # http://localhost:3006
```

```bash
npm run build      # production build (static export of all routes)
npm run start      # serve the production build on :3006
npm run type-check # tsc --noEmit
npm run lint       # next lint
```

## Architecture

```
app/
  layout.tsx            ← root layout: fonts, pt-PT metadata, SiteNav + SiteFooter + ScrollReveal
  globals.css           ← design tokens + reusable component classes (handoff §2/§3)
  fonts.ts              ← next/font font definitions (CSS variables)
  page.tsx              ← Home (hero + protocol spine)
  porque-existe/ … faq/ ← one folder per editorial/protocol section (the introductory
                          definition is the reference chapter /referencia/o-que-e)
  not-found.tsx         ← 404
  sitemap.ts robots.ts  ← SEO
components/
  SiteNav.tsx           ← sticky nav, accessible "Mais" dropdown, mobile menu
  SiteFooter.tsx        ← sitemap + state disclaimers
  ScrollReveal.tsx      ← reveal-on-scroll observer (reduced-motion aware)
  ui.tsx                ← PageHero, Section, Container, StatusNote, MoreLink, Reveal
  home/HeroEstado.tsx   ← living-diagram canvas hero + status panel + BanzAI preview
  home/banzaiKb.ts      ← static BanzAI preview knowledge base (explains; never certifies)
  federacao/FederacaoStepper.tsx ← 5-moment federation stepper (auto-advance, pauses)
  faq/FaqAccordion.tsx  ← single-open accordion
lib/site.ts             ← route map (nav + footer)
public/                 ← BANZA marks + protocol diagrams (SVG)
tailwind.config.ts      ← design tokens (colours, fonts, widths, radii)
```

### Routes

`/` · `/porque-existe` · `/arquitectura` · `/confianca` ·
`/certificacao` · `/federacao` · `/operadores` · `/governacao` · `/banzai` ·
`/programadores` · `/roteiro` · `/faq`

### Design system

Light "norma técnica clara" base (`paper #F4F1EA`) with **bordô `#8E1326`** as the
single primary accent — institutional and protocolar, deliberately distinct from
an operator's softer product identity. Tokens live in `tailwind.config.ts`; reusable
classes (`.eyebrow`, `.h-section`, `.card-hair`, `.panel`, `.table-hair`,
`.terminal`, `.band`, …) in `app/globals.css`.

### Motion & accessibility

- Reveal-on-scroll, the hero canvas, and the federation stepper all honour
  `prefers-reduced-motion` (static single frame / no auto-advance).
- The hero `<canvas>` is decorative (`aria-hidden`); all state has a textual
  equivalent in the status cards. Skip-link, `:focus-visible`, `aria-*` on
  interactive controls, intrinsic responsive layout (no horizontal overflow).

## Claims guardrails (CRITICAL)

Every change must preserve the protocol's truth. The site is **pre-production**:

- BANZA is an open protocol — **not** a bank, app, wallet, payment processor, or
  central switch, and **not** an operator.
- Conformance is available; **PASS is evidence, not certification**.
- **No operator is certified today.** Conformance & Interoperability Certification
  (L2) is per-implementation, evidence-based and **decided by the Rust engines**
  against a public versioned profile (ADR-032) — BANZA is **not** a certificate
  authority and issues no operator certificate. Records are published to the Technical
  Registry, which is empty in pre-production; production certification and federation
  remain gated on milestones **M2/M3**. BanzAI **explains, it does not certify or decide**.
- Conformance does not replace legal/regulatory/KYC-KYB/AML-CFT/banking
  obligations. Never present any regulator (e.g. the BNA) as approving BANZA.

State disclaimers live in `SiteFooter` and in per-page callouts — keep them.

## Source

Design handoff: `~/Downloads/banza-design-handoff` (Claude Design).
Source of truth for copy/claims: `docs/reference/pt/completa.md` (repo root). On any
divergence, the reference — then ADRs/RFCs/contracts/conformance vectors — prevails.
