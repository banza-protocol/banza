# Phase H3 — Public Website De-duplication and Reference Canon Split (2026-07)

**Base:** `main` `205514a` (post-H2.1) · **Branch:** `docs/phase-h3-public-website-dedup-reference-canon-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Establish, across the whole public website, the editorial hierarchy **"o website orienta; a referência
documenta"**. The homepage "Um caminho para cada leitor" cards send each reader to a public page; each
of those public pages should be a short doorway with a clear path to its canonical reference chapter —
so the reference is unambiguously the place for full technical/normative detail.

## Problem detected

The public chapter-mirror pages (`/certificacao`, `/confianca`, `/operadores`, `/federacao`,
`/arquitectura`, `/programadores`, `/porque-existe`, `/governacao`, `/o-que-e`) had **no link to their
corresponding reference chapter** — the public site and the reference told parallel stories with no
declared hierarchy between them. Public routes map 1:1 to reference slugs
(`/x` ↔ `/referencia/x`), so the canonical chapter for each page is unambiguous.

## Matrix — card → public page → reference canon → action

| Homepage card | Public page | Canonical chapter | Action |
|---|---|---|---|
| Auditores & Reguladores | `/estado` | `/referencia/confianca` | **KEEP** — verifiable-state tooling (machine routes/JSON); unique, not shortened |
| Operadores | `/certificacao` | `/referencia/certificacao` | + reference CTA |
| Programadores | `/programadores` | `/referencia/programadores` | + reference CTA |
| Investidores & Parceiros | `/porque-existe` | `/referencia/porque-existe` | + reference CTA |
| Comunidade Técnica | `/governacao` | `/referencia/governacao` | + reference CTA |
| Decisões do Protocolo | `/decisoes` | (ADR/RFC library) | **KEEP** — useful index, no chapter to duplicate |
| BanzAI | `/banzai` | `/referencia/banzai` | already H2/H2.1 (short landing + CTA) |

Additional chapter-mirror pages (audited in PART 5, not card-linked but they mirror a chapter):
`/confianca`, `/federacao`, `/operadores`, `/arquitectura`, `/o-que-e` → each **+ reference CTA**.

## Editorial mechanism

A new shared component `website/components/ReferenceCTA.tsx` renders one consistent closing band —
eyebrow **"A REFERÊNCIA COMPLETA"**, the sentence *"Esta página é uma porta de entrada. Para os
detalhes normativos e técnicos, leia o capítulo completo da referência — o website orienta; a
referência documenta."*, and a single bordô CTA **"Ler capítulo completo na referência →"** linking to
`/referencia/<slug>`. **At most one primary reference CTA per page.**

## Pages changed (9)

`certificacao`, `programadores`, `porque-existe`, `governacao`, `confianca`, `federacao`, `operadores`,
`arquitectura`, `o-que-e` — each gained the `ReferenceCTA` band pointing to its matching chapter
(verified in built HTML: exactly one `href="/referencia/<slug>"` per page).

## Pages NOT changed and why

- `/estado` — **verifiable-state tooling** (mirrors the public machine routes; JSON/data). Per the
  policy, real tooling/state is unique content and is not shortened.
- `/decisoes` — the ADR/RFC **library/index**; a useful entry that does not duplicate a chapter.
- `/banzai` — already a short landing with its own reference CTA (H2/H2.1).
- `/faq`, `/roteiro` — left as-is this pass (Q&A / roadmap timeline); consistent CTA candidates flagged
  as a follow-up.
- The homepage — the seven cards already have distinct destinations and short subtitles, and the global
  header **"Ler a referência"** CTA remains the site-wide reference entry; no change was needed.

## Scope note (no destructive rewrite)

H3 establishes the canonical hierarchy by giving every chapter-mirror page an explicit, consistent
path to its reference chapter. It deliberately does **not** gut the long public pages' content in one
pass — a mass rewrite of 400–800-line pages would be high-risk and would remove genuinely useful
public-facing explanation. Deeper per-page trimming (where duplication is heaviest, e.g. `/confianca`,
`/operadores`) is recommended as a follow-up micro-phase.

## CTAs added / removed

Added: one `ReferenceCTA` per changed page (9 total). Removed: none needed — no page had a pre-existing
link to its own reference chapter, so no duplicate CTA was introduced (each changed page now has
exactly one link to its `/referencia/<slug>`).

## Checks

`website` build **PASS**; each changed page has exactly one reference CTA (correct slug) in the built
HTML; tooling/index pages untouched; forbidden-claims sweep (`produção pronta`, `production ready`,
`M2 activo`, `BanzAI decide/certifica`, `model output is evidence`, `certificados de produção activos`)
**0 NEEDS_FIX**. `make reference-svg-check` (27/27) · `purity-check` · `identity-check` ·
`invariant-check` · `validate-compose.sh` · `validate-security-headers.sh` — all **PASS**. VERSION
stays `1.0.0`. Local preview confirms the CTA band renders as a clean closing band, no visual regression.

## Confirmations

- **No `VERSION` change** (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No real provider activation; no keys/`.env`/secrets.
- No services runtime, OpenAPI/schema, contracts, or conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.** No reference chapter content changed. No public page turned into a second
  reference and none redirects wholesale to the reference.
- Diff: 9 `page.tsx` + 1 new `ReferenceCTA.tsx` + this report.

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h3-public-dedup-reference-canon`.

## Risks remaining

The reference CTA declares the hierarchy but does not itself shorten the longest pages; a follow-up may
trim `/confianca`, `/operadores` and other long mirrors and extend the CTA to `/faq` and `/roteiro`.
