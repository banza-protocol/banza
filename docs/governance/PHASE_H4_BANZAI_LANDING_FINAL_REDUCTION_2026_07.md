# Phase H4 — BanzAI Landing Final Reduction and Reference Canon Enforcement (2026-07)

**Base:** `main` `91c1758` (post-H3) · **Branch:** `docs/phase-h4-banzai-landing-final-reduction-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Enforce definitively that `/banzai` is a short institutional landing and `/referencia/banzai` is the
complete canonical chapter — *"A página `/banzai` apresenta. A referência `/referencia/banzai` explica
em detalhe."*

## Problem detected & why H3 didn't finish `/banzai`

H3 established the canonical hierarchy across the chapter-mirror pages (per-page reference CTAs), but it
was a site-wide pass that did not re-open `/banzai`. The heavy reduction of `/banzai` had actually been
done earlier in **H2** (single cognitive-engine SVG, removed the provider/role/evidence SVGs and the
long profile/role/pipeline sections) and **H2.1** (removed the duplicate "Capítulo 10 · Sobre o BanzAI"
link). So on entry to H4 the landing was **already** compliant with almost every H4 hard limit — its
one gap was that its call-to-action was an **inline** block rather than the shared `ReferenceCTA`
component introduced in H3.

## Audit of `/banzai` on entry (post-H2/H2.1)

- Single SVG (`banzai-cognitive-engine-v1.svg`); no provider/role/evidence SVGs — **KEEP_LANDING**.
- 3 message cards + "o que não é" chips; 4-card minimal profile summary; 7-fact current-state grid +
  a mock/pre-production status note — **KEEP_LANDING / KEEP_STATUS_FACT**.
- One reference CTA link; no "Capítulo 10" secondary link — already compliant.
- Inline CTA (`<Link>` + `<h2>`) instead of the shared component — **COMPRESS → adopt `ReferenceCTA`**.

## Changes made (page.tsx only)

1. **Adopted the shared `ReferenceCTA` component** for the canonical CTA (replaced the inline
   `eyebrow + h2 + paragraph + <Link>` block), with the H4 lead text ("A arquitectura completa, os
   limites de autoridade, a evidência, os perfis de tarefa, os exemplos e os detalhes vivem no capítulo
   canónico da referência. Esta página é apenas a porta de entrada."). Removed the now-unused
   `next/link` import.
2. Kept the secondary links (Estado verificável, Começar a implementar, BanzAI Chat, GitHub — BanzAI,
   GitHub — protocolo BANZA) in a **separate block** below the CTA — all distinct destinations, none to
   `/referencia/banzai`.
3. Added the single **activation sentence** to the profiles section: *"A activação de providers reais é
   feita apenas no servidor, por variáveis de ambiente, sem chaves no Git."* (no env-var detail).

## Blocks removed vs preserved

Removed (already removed in H2, confirmed still absent): the `provider-boundary`, `role-boundary` and
`evidence-pipeline` SVGs; the long "Modelos por perfil de tarefa", "Fronteira de papel" and "Pipeline de
evidência" sections; the long question / refused-request lists; env-var detail. Preserved: hero (6
chips), 3 message cards, "o que não é" chips, the single cognitive-engine SVG, the minimal 4-profile
summary, the current-state grid, one strong reference CTA, and the distinct secondary links.

## Measurable limits (PART 5)

- SVGs used in the JSX: **1** (`banzai-cognitive-engine-v1.svg`) ✓
- Reference CTA in main content: **1** (visible "Ler capítulo completo na referência"; a second copy
  appears only in the RSC flight-data payload — not a visible CTA) ✓
- Secondary links to `/referencia/banzai`: **0** ✓
- Approx. visible words (main, excluding nav/footer and SVG alt text): **~390** — intentionally concise
  (slightly under the 450–750 "ideal" band; the page reads in ~30–60 s, which is the overriding goal).
  This is an approximate count as allowed by PART 5.
- No section over 2 paragraphs; no list over 8 items. ✓

## Checks

`website` build **PASS**. Built-HTML checks: cognitive-engine present (1); provider-boundary /
role-boundary / evidence-pipeline absent (0); "Capítulo 10 · Sobre o BanzAI" absent; one visible
reference CTA; one `href="/referencia/banzai"`; activation sentence present; all obligatory PART 7
phrases present as visible text; forbidden-claims sweep (`dois modelos`, `Qwen para raciocínio`,
`DeepSeek para verificação`, `último recurso`, `model output is evidence`, `BanzAI certifica`, `produção
pronta`) **0 NEEDS_FIX**. `make reference-svg-check` (27/27) · `purity-check` · `identity-check` ·
`invariant-check` · `validate-compose.sh` · `validate-security-headers.sh` — all **PASS**. VERSION stays
`1.0.0`. Local preview confirms a clean short landing, single SVG, single strong CTA, no visual
regression.

## `/referencia/banzai` preserved

The reference chapter and `docs/reference/{pt,en}` were **not touched** — the full cognitive engine,
provider task profiles, role boundary, evidence pipeline, authority limits, examples and repository
sections remain the canonical source.

## Confirmations

- **No `VERSION` change** (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No real provider / Qwen / DeepSeek activation; no keys/`.env`/secrets.
- No services runtime, OpenAPI/schema, contracts, or conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.** No SVG asset deleted; no reference-content change. Only
  `website/app/banzai/page.tsx` changed.

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h4-banzai-landing-final-reduction`.

## Risks remaining

None specific. The landing is now at ~390 words; if a slightly fuller entry is preferred, one or two of
the short card texts can be expanded without reintroducing reference-level detail.
