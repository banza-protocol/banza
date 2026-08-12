# M2.19G — Gate-0 Audit

**The pre-reconstruction inventory and semantic audit of the public BANZA surface**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`
**Artifacts:** `artifacts/m2-19g/{public-surface-inventory,svg-inventory,canonical-concept-matrix,public-content-semantic-audit,public-edge-crawl}.json`

Gate-0 is the "before" picture: the entire public surface enumerated and classified against the current
canonical architecture (M2.19A–F.2: three layers, single BanzAI interface, 9-step journey, read-only
Operador Zero) *before* any page was rewritten. Every artifact was grounded by reading the real source —
`page.tsx` routes, `website/lib/reference.ts`, `website/content/BANZA_REFERENCIA.md`, `website/lib/site.ts`,
`website/middleware.ts`, `website/app/sitemap.ts` — and by crawling the live edge.

---

## 1. Public-surface inventory (`public-surface-inventory.json`)

Two domains: **`banza.network`** (the apex protocol website — all `page.tsx` routes except `/oz`) and
**`zero.banza.network`** (the Operador Zero read-only reference, rewritten by middleware onto the internal
`/oz` route + `/oz/[...artifact]` JSON endpoints).

**26 surfaces enumerated:** 24 `page.tsx` app routes (9 real content pages, 12 redirect aliases, 2 dynamic,
3 machine routes) + the 15 reference chapters.

Treatment tally (of the 26 surfaces): KEEP 13 · KEEP_WITH_MINOR_REWRITE 6 · REWRITE 1 · REBUILD 2 · MERGE 2
· GENERATE_FROM_CANONICAL_SOURCE 2 (the two `/referencia` renderers — their fix is in the markdown). The 15
reference chapters carry their own treatments: REBUILD 1 (ch.9 Operador Zero), REWRITE 5 (ch.4, 7, 8, 12,
15), KEEP_WITH_MINOR_REWRITE 9.

### Duplicate / aliased pairs found

- **`/governacao` vs `/governanca`** — near-identical names, *different* targets (one redirects to the
  reference chapter, the other is the standalone open-governance page). The footer "ADRs e RFCs" link was
  mistakenly pointing at `/governacao` instead of `/decisoes`.
- **`/conformidade` vs `/certificacao`** — both redirected to the same chapter; `/certificacao` was flagged
  to be promoted into a real L2 page.
- **`/o-que-e` vs `/referencia/o-que-e`** — the home CTA used the alias (extra hop); retarget to `/referencia`.
- **`/porque-existe`, `/referencia/racional`, `/referencia/porque-existe`** — chained aliases (KEEP).
- **`/referencia/completa` vs `/referencia/[capitulo]`** — intentional full-doc aggregation (KEEP).

### Missing owner pages identified

`/certificacao` (real L2 page, ADR-064/065/066), `/arquitectura` (three-layer model, ADR-059),
`/registo` Technical Registry (ADR-065), `/glossario` (the 32 concepts), a certification-lifecycle/state
surface (ADR-066/061), and a regulatory-state/RealMoneyActivationGate surface (ADR-062). M2.19G delivered
`/certificacao`, `/registo-tecnico` and `/glossario`, and folded the three-layer, lifecycle and
regulatory-state presentations into `/arquitectura`, `/certificacao` and `/estado`.

### Terminology scan (LIVE source/content, excluding build mirrors + vendor)

Clean at Gate-0 (0 live hits): "bancos/fintechs integradas", "autorizado/aprovado/reconhecido pelo BNA",
"rede em directo". Present only in reports documenting their own removal (0 live website hits): `BanzAI Web`
(17 lines), `Validation Workbench` (9), `/banzai/validar` (22), the old 7-step journey (20). Live-surface
concerns to fix: the absolute "sem acordos bilaterais" (55 lines incl. `layout.tsx`, `page.tsx`,
reference), Operador Zero simulador/ledger/`100/100` (reference ch.9 + registry + glossary doc), BanzAI
"camada oficial" (reference ch.12/15), L0–L4 as levels (reference ch.7/8 + `banza-operators-v1.svg`),
residual `/certificates` route language, and a `cinco camadas` string in `banza-trust-v1.svg` `<desc>`.

---

## 2. SVG inventory (`svg-inventory.json`)

**42 SVGs** under `website/public/diagrams/**`, each with the embedding page/doc, the concept depicted, the
ADR it maps to, the forbidden legacy text visible in it, and a treatment. Gate-0 treatment tally: KEEP 14 ·
KEEP_WITH_REVIEW 8 · REWRITE 12 · REPLACE 3 · DELETE 5.

Forbidden visible text found: **L0–L4 as levels** in 5 diagrams (`banza-operators`, `banza-certification`,
`banza-reference-operator`, `banza-operator-l0-endpoints`, `banza-controlled-federation-gate`);
`/certificates` route in `postgresql-service-access`; absolute "sem acordos bilaterais" in
`banza-federation`; **simulador/ledger/lab/`100/100`** in 7 Operador Zero diagrams; `cinco camadas` in
`banza-trust` `<desc>`; a legacy "Validation Studio" label in `banza-roadmap-m1-m6`.

Canonical diagrams identified as needed: the three-layer institutional stack (ADR-059, then delivered as
the SVG-P-057 rewrite), a certification emission → registry + state-machine diagram (delivered as
SVG-P-092), and a cert ≠ admission ≠ authorisation diagram (delivered as SVG-P-093). The v2 read-only
Operador Zero set (proof-chain, separation-of-responsibilities, validation-journey) already existed but was
not embedded on any rendered page — Gate-0 flagged ch.9 to drop the v1 simulator embeds and adopt v2.

> Note: the Gate-0 *plan* (REWRITE 12 · REPLACE 3 · DELETE 5) resolved in execution to **12 rewrites, 2 new
> and 8 deletions** — the 3 "REPLACE" simulator diagrams were deleted rather than superseded in place,
> because the clean v2 set already covers them. See `M2_19G_SVG_REBUILD.md`.

---

## 3. Canonical concept matrix (`canonical-concept-matrix.json`)

**32 canonical concepts** of the current architecture, each grounded in the real ADR/schema/engine, with
the public route that should OWN its definition, the reference chapters that may repeat it, its forbidden
legacy terms, its states and its relations. Every `normative_source` was verified against
`decisions/adr/*.md` headers and `contracts/**/*.json`.

Concepts: BANZA · protocolo financeiro aberto · entidade operadora/operador · implementação · implementação
de referência · participante de scheme · Certification Profile · capability · Operator Manifest · discovery
· key manifest · Signed Protocol Metadata · conformance · interoperability · certification ·
CertifiedImplementation · Certification Record · certification lifecycle · trust · revocation · Evidence
Bundle · Technical Registry · federation · BanzAI · Operador Zero · Banzami Operational Scheme · scheme
admission · regulatory authorisation · pre-production · OperationReceipt · JourneyReceipt · reason code.

The matrix records the key clarification carried through the whole reconstruction: **L0–L4 remain valid as
conformance SCOPE levels** inside L2 (ADR-021; `certification-profile.conformance_level`;
`certification-record.scope_levels`); what M2.19G forbids is L0–L4 as public certification *levels/tiers*.
"Layer 2 (L2)" in ADR-064's title is the second institutional *layer*, not a level. The matrix is the
grounding source for the `/glossario` page.

---

## 4. Public content semantic audit (`public-content-semantic-audit.json`)

**25 public content blocks** classified against the current governing authority (ADR-052/053/054/057/059–067):
8 CANONICAL, 17 needing remediation. Classification counts: CONTRADICTORY 4 · OUTDATED 4 · OVERCLAIM 3 ·
ACCURATE_BUT_IMPRECISE 2 · UNSUPPORTED 1 · AMBIGUOUS 1 · MISPLACED 1 · STATE_DEPENDENT 1.

**Headline defect:** Operador Zero was still described as an *executing* "simulador" with a ledger,
trust/federation runs and a `100/100` score across six public surfaces (home marquee, reference index card,
reference chapter 9 on two routes, and ADR-052 on `/decisoes`) — directly contradicting the current
governing decision ADR-067 (read-only, no execution, no score), which was itself already served correctly
on `/decisoes`. Secondary defects: the absolute "sem acordos bilaterais" hero/overclaim; the L0–L4
conformance-level vs L1/L2/L3 three-layer naming collision; residual `/certificates` route language.

Hard-gate counts recorded (§9 of the audit): 17 unreviewed blocks, 4 outdated definitions, 4 contradictory
definitions, 3 protocol/scheme confusions, 6 operator/implementation confusions, 1 certification-entity
confusion, 3 permanent/temporary state confusions, 2 duplicated canonical definitions, 4 overclaims, 1
misplaced normative block.

---

## 5. Public edge crawl (`public-edge-crawl.json`)

**43 live pages** crawled from `https://banza.network` (+ `zero.banza.network`) with `curl -sS -L`, ~2s
pacing — the Gate-0 "before" edge state. `robots.txt` = 200 (AI bots disallowed: ClaudeBot, GPTBot,
Google-Extended, CCBot, Bytespider, Amazonbot, Applebot-Extended, meta-externalagent,
CloudflareBrowserRenderingCrawler). Sitemap declared and enumerated.

Edge findings: **3 orphan public routes** (`/operadores`, `/governanca`, `/licenca` — all 200 HTML but
absent from `sitemap.xml`; `/operators` is a machine JSON registry route intentionally excluded); **0
broken internal links**; **0 duplicate canonical pages** (the conformance chapter is reachable at three
URLs but all correctly set `canonical=/referencia/certificacao`); **1 wrong-canonical / cross-term issue**
(chapter titled "Conformidade e Evidência" but slug/canonical uses the retired term `certificacao`, and the
natural `/referencia/conformidade` 404s); **1 unexpected redirect** (`/conformidade` → `.../certificacao`,
a cross-term hop). These informed the sitemap rewiring and the ch.7 rename in the reconstruction.

---

## Verdict

Gate-0 established, from real source and the live edge, exactly where the public surface diverged from the
current architecture: a still-simulator Operador Zero as the dominant defect, L0–L4-as-levels, BanzAI-as-a-
layer, the absolute bilateral-agreements hero, and missing owner pages for L2 certification, the Technical
Registry and the glossary. Every one of these became a targeted treatment in the reconstruction.
