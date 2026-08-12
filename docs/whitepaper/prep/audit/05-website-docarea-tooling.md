# Audit 05 — Website, Doc Area, License & PDF Tooling (Whitepaper program)

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


Scope: the public website (`website/app/`, `website/components/home/`, `website/lib/site.ts`),
the canonical documentation tree (`docs/`), the licensing story (`docs/governance/licensing.md`,
`README.md`, `LICENSE`/`NOTICE`/`TRADEMARKS.md`), and any PDF pipeline. Every claim below cites a
real file + line/section that was read. The Whitepaper is **non-normative, scientific-technical,
operator-neutral**; nothing here proposes changing a protocol invariant, a contract, or a normative
surface.

---

## 1. Website route inventory (`website/app/`)

App-router directories present (one route each; `[slug]`/`[capitulo]`/`[...artifact]` are dynamic):

```
/                (page.tsx)          /decisoes  + /decisoes/[slug]
/arquitectura                        /estado
/banzai                              /faq
/certificacao                        /federacao
/confianca                           /glossario
/conformidade                        /governacao   /governanca
/licenca                             /operadores
/oz  + /oz/[...artifact]             /porque-existe
/programadores                       /roteiro
/referencia + /referencia/[capitulo] + /referencia/completa + /referencia/racional
/registo-tecnico
```

Top-level non-route files: `fonts.ts`, `globals.css`, `layout.tsx`, `not-found.tsx`,
`robots.ts`, `sitemap.ts`, `page.tsx`.

**There is NO `/whitepaper` route today.** Confirmed by directory listing (`website/app/` has no
`whitepaper/` folder) and by `website/app/sitemap.ts:14-30` (the `ROUTES` array does not contain
`/whitepaper`). A new route + sitemap entry must be created for the "Ler o Whitepaper" CTA to resolve
(otherwise it 404s via `not-found.tsx`).

---

## 2. The HOME hero — EXACT captured contract (`website/app/page.tsx`)

The home is the M2.19G.2 canonical narrative: exactly five bands (page.tsx:17-22 comment). The hero
lives in the first `<section aria-labelledby="hero-title">` (page.tsx:74-159), a two-column grid
`[data-hero-grid]` (page.tsx:82): `gridTemplateColumns: "minmax(0,1fr) minmax(340px,0.72fr)"`. LEFT
= copy (`[data-hero-copy]`, page.tsx:85), RIGHT = the illustration card (page.tsx:118-157).

Captured verbatim (must NOT be touched by the CTA change):

- **Eyebrow** (page.tsx:90): mono pill text `PROTOCOLO FINANCEIRO ABERTO · v1.0` (a middot `·`,
  not a period), inside `#FBF0EE` rounded chip, colour `#8B1428`.
- **3-line title** `<h1 id="hero-title">` (page.tsx:93-97), font `F_DISPLAY` (Spectral):
  1. "Protocolo aberto e" (delay .14s)
  2. "verificável de" (delay .24s)
  3. "interoperabilidade financeira." (delay .34s, `color:#8B1428`, italic)
- **Paragraph** (page.tsx:99, `data-rise`): "O BANZA cria uma linguagem comum para que operadores
  financeiros independentes interoperem através de regras públicas, conformidade demonstrável e
  evidência verificável — sem depender de integrações técnicas fechadas entre cada par de operadores."
- **HERO_INDICATORS** (defined page.tsx:49-68; rendered as `<ul data-rise>` page.tsx:101-109), three
  items: "Endpoints públicos", "Motores Rust determinísticos", "Resultados rastreáveis por evidência".
- **Single primary CTA** (page.tsx:111-115): a `<div data-rise style={{ animationDelay: ".64s" }}>`
  wrapping ONE `<Link href="/banzai?mode=validation">` — filled bordô gradient
  (`linear-gradient(180deg,#9C1B2F 0%,#7A1023 100%)`), white text, shield-check SVG, label
  "Validar operador no BanzAI", trailing mono `→`. Radius 13, padding `15px 28px`.
- **Right-side illustration** (page.tsx:118-157): the M2.19G.2B approved dossier concentric-ring
  card. Header row "INTEROPERABILIDADE" + "ILUSTRATIVO" dot (page.tsx:121-122); two dashed rings +
  centre "Perfil BANZA v1.0 / Regras públicas e versionadas"; four `OperatorCard`s **Operador A/B/C/D**
  (`impl. A1..D1`); flow-dot connectors; `manifest.json` / `mensagem` / `signature valid` /
  `trust: verified` chips; footer caption "Diagrama ilustrativo: operadores interoperam por regras e
  perfis comuns." (page.tsx:155). This is illustrative-only and operator-neutral (A–D, not real brands).

Other bands (untouched by this task, for context): institutional phrase + `HeroStatusBar`
(page.tsx:161-170); "Quem faz parte do protocolo" Technical Registry with `OperatorRegistry`
(page.tsx:172-183); "Três camadas. Uma interface." L1/L2/L3 cards + BanzAI note (page.tsx:185-214).

### Fonts / next/font

`website/app/fonts.ts:1-31` loads four Google fonts via `next/font/google` — Source Serif 4
(`--font-serif`), Public Sans (`--font-sans`), IBM Plex Mono (`--font-mono`), Spectral
(`--font-display`), all `display:"swap"`. `layout.tsx:93` attaches the four `.variable` classes to
`<html>`. `page.tsx:24-27` maps them to `F_DISPLAY/F_SERIF/F_SANS/F_MONO` = `var(--font-*)`.
**GOTCHA (from repo memory + this code): always reference `var(--font-*)`, never a literal family
name** — next/font self-hosts under generated names, so a literal "Public Sans" would not resolve.
The new CTA must use `F_SANS` / `F_MONO` (already defined in page.tsx), needing no new import
(`Link` is already imported at page.tsx:2).

### Responsive behaviour that drives "desktop same-line / mobile stacked"

`globals.css:429-435`:
- `@media (max-width:1279px)` → hero grid keeps 2 columns but tighter.
- `@media (max-width:900px)` → `[data-hero-grid]` collapses to a **single column**
  (`grid-template-columns: minmax(0,1fr)`), so the copy column (and its CTA row) becomes full-width;
  `[data-hero-copy]` `max-width:640px`.

The hero copy column max width is 620 (page.tsx:85) / 640 (mobile). A CTA row using
`display:flex; flex-wrap:wrap; gap` will naturally sit both buttons on one line when the column is
wide (desktop) and wrap the second button to its own line when the column narrows (mobile) — no new
media query required. This is the exact pattern already used **in this same file** at page.tsx:177
for the registry CTA row (`display:"flex", flexWrap:"wrap", alignItems:"center", gap:14`).

---

## 3. Header nav & the "Ler a referência" CTA (`website/lib/site.ts`, `website/components/SiteNav.tsx`)

`site.ts:21-25` — `navPrimary` is exactly THREE destinations, left→right = mobile top→bottom:
1. `/registo-tecnico` — "Registo técnico" (`key:"registo"`)
2. `/banzai` — "BanzAI" (`feature:true`)
3. `/referencia` — "Ler a referência" (`cta:true`, direct, never `/o-que-e`)

`SiteNav.tsx` renders these: items 1-2 as equal outline chips, item 3 (`cta`) as the filled bordô
header CTA (SiteNav.tsx:60-66 desktop, :119-129 mobile). Desktop nav hides below 820px
(`globals.css:436-438`: `.site-nav-desktop{display:none}`, `.site-nav-toggle{display:inline-flex}`);
the mobile menu mirrors the same three in the same order (SiteNav.tsx:116-131). The header CTA
("Ler a referência") is a DIFFERENT control from the hero primary CTA and is out of scope for the
whitepaper change — do not confuse the two.

Footer (`site.ts:29-62`) has three groups (Protocolo · Implementar e validar · Governança). If the
whitepaper should also be discoverable from the footer, the natural home is the **Protocolo** group
(alongside `/referencia`, `/arquitectura`, `/estado`) — but the task only asked for the hero CTA, so
that is left as an explicit optional follow-up, not done here.

---

## 4. sitemap / robots / metadata patterns

- `robots.ts:1-8` — allows all (`userAgent:"*", allow:"/"`), points at
  `https://banza.network/sitemap.xml`. A new `/whitepaper` needs no robots change.
- `sitemap.ts:14-30` — hand-maintained `ROUTES` array of canonical surfaces (redirect aliases
  deliberately excluded), then reference chapters appended (sitemap.ts:33-41). **`/whitepaper` must be
  added to `ROUTES`** for it to appear in the sitemap; priority default 0.7 (non-home, non-reference).
- `layout.tsx:10-56` — root metadata: `metadataBase = https://banza.network`, title template
  `"%s · BANZA"`, OG/Twitter cards, neutral robots. Structured data (`layout.tsx:58-83`) is
  deliberately **Organization + WebSite only, NOT FinancialService/Bank/PaymentService** — a hard
  boundary the whitepaper's own web page must preserve (no Bank/PSP schema.org types).
- Home metadata (`page.tsx:10-15`) uses an **absolute** title override + `alternates.canonical:"/"`.
  A `/whitepaper` page should follow the same pattern: its own `metadata` export with a scoped title
  and `alternates.canonical:"/whitepaper"`.

---

## 5. Canonical doc area — is `docs/whitepaper/` the right NEW home?

`docs/` subdirectories (read via listing): `banzai/`, `diagrams/`, `governance/`, `guides/`,
`images/`, `migration/`, `quality/`, `reference/`, `reports/`, `security/`, `whitepaper/`.

- `docs/reports/` — internal engineering/phase reports (e.g. `THREE_LAYER_ARCHITECTURE_REPORT.md`,
  `SECURE_ARTIFACT_FETCHER_REPORT.md`). Not a publications area.
- `docs/reference/` — normative-ish reference content (`en/`, `pt/`, glossaries, SVG registry). NOT a
  place for a non-normative paper.
- `docs/governance/` — ADR-adjacent governance docs + licensing.
- `docs/guides/` — only two how-to files (`conformance.md`, `OPERADOR_ZERO_SUBDOMAIN_ACTIVATION.md`).

**There is NO pre-existing publications / papers / whitepaper area** other than the freshly created
`docs/whitepaper/` (confirmed: `find docs -iname "*paper*|*publication*|*whitepaper*"` returns only
`docs/whitepaper`). `docs/whitepaper/` already contains `figures/`, `prep/` (with
`WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md` and this `prep/audit/`). **Conclusion:
`docs/whitepaper/` is the correct, clean NEW canonical home** — it does not collide with an existing
convention, and it keeps the non-normative paper out of the normative `reference/` and internal
`reports/` trees.

Guard interaction to note for the program (verified scan roots):
- `check-public-surface-clean.sh:237` scans `website/app website/components website/lib
  docs/reference` — it does **NOT** scan `docs/whitepaper`. Good: whitepaper prose won't trip it
  unless copied into `docs/reference`.
- `check-governance-docs-clean.sh:61-64` scans `docs/governance docs/security docs/reference
  docs/guides` — also does **NOT** include `docs/whitepaper`.
- `identity-check` = `tools/check-operator-contamination.sh` → Rust `banza-repo-guards contamination`,
  which walks **tracked files** (repo memory GOTCHA). Once the whitepaper is committed it IS scanned
  for commercial operator brands. `Banzami` / `BANZAMI – Tecnologia e Serviços, Lda.` are the
  allowed creator/publisher/first-scheme entity; any OTHER real commercial operator brand is
  forbidden and examples must use Operador A/B/C/D (as the home illustration already does).

---

## 6. License story for the paper

- `LICENSE` (root, 11368 B) = standard unmodified Apache-2.0; `NOTICE` (root) = attribution;
  `TRADEMARKS.md` (root) = name/logo governance.
- `docs/governance/licensing.md:20-27,33-35` — **Documentation is published under Creative Commons
  Attribution 4.0 International (CC BY 4.0)**, as stated in the README; code/`contracts/`/`spec/`/
  `conformance/` are Apache-2.0. Per-file markers govern where present.
- `README.md:511` — "Public documentation is published under **Creative Commons CC BY 4.0**."
- `README.md:514-515` — the licence grants **no trademark rights** to BANZA / BanzAI / Banzami.
- `README.md:517` — "BANZA is not a bank, PSP, wallet, payment operator or financial service provider."

**Recommendation for the Whitepaper:** it is documentation → **CC BY 4.0** is the correct licence to
declare on the cover / colophon / web page (consistent with README + licensing.md). Add an explicit
per-file / cover CC BY 4.0 marker (licensing.md:26-27 explicitly flags per-file markers as the
mechanism, and calls formalising doc licensing a governance follow-up). Attribution string should
follow the author record (§7 below). Do **not** relicense the paper Apache-2.0; do not imply any
trademark grant.

Author/publisher identity is already fixed in
`docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`: authors **Fidel R. Monteiro**
(first, locked) and **Jesus R. Monteiro**, cofounders of **Banzami**; institutional publisher
**Banzami / BANZAMI – Tecnologia e Serviços, Lda.**; BanzAI and other tools are components, **never
authors**; no DOI/ISBN/ISSN claimed; canonical edition English, PT is an official translation.

---

## 7. PDF tooling — NONE installed; reproducibility recommendation

Verified absent on PATH (all return NOT INSTALLED): `typst`, `tectonic`, `pdflatex`, `xelatex`,
`lualatex`, `pandoc`, `weasyprint`, `wkhtmltopdf`. There is **no PDF/typst/tectonic/latex/pandoc/
whitepaper target in `Makefile`** (grep returned nothing), and **no PDF-related dependency in any
`package.json`** (checked `website/package.json` and all others — none reference pdf/typst/tectonic/
latex/pandoc/puppeteer/playwright/weasyprint).

**Recommended reproducible choice — Typst (primary), Tectonic (fallback):**
- **Typst** — single self-contained binary, deterministic output, no giant TeX tree, fast, easy to
  pin by exact version and run inside a container. Best fit for a from-scratch scientific paper and
  aligns with this repo's reproducible-bundle discipline (`infra/banza-network/` uses fixed image
  tags per CLAUDE.md "Deployment"). Recommend pinning an exact Typst version and building in a pinned
  container image, mirroring how the site/services are already reproducibly built.
- **Tectonic** — Rust-based, self-contained LaTeX engine with a locked support bundle; choose this
  only if full LaTeX/heavy math ecosystem compatibility is required. Also reproducible/pinnable.
- **Avoid** a full TeX Live install (non-hermetic, large, version-drift) and HTML-print routes
  (`wkhtmltopdf` deprecated; a headless-browser/Puppeteer path adds a large non-deterministic
  dependency) for the canonical build.

Whichever is chosen, wire it as an explicit pinned `Makefile` target (e.g. `whitepaper-pdf`) that
runs in a version-locked container, so the build is reproducible and CI-checkable — and it does NOT
touch any protocol invariant (the paper is non-normative).

---

## 8. EXACT hero CTA map — add a secondary outlined "Ler o Whitepaper" → `/whitepaper`

Goal: a secondary **outlined** button beside the primary, **same line on desktop, stacked on
mobile**, WITHOUT changing the title, paragraph, HERO_INDICATORS, illustration, or the primary CTA.

**File:** `website/app/page.tsx`. **Only two surgical edits, both inside the existing hero CTA
wrapper at lines 111-115.** The primary `<Link>` (page.tsx:112-114) stays byte-identical.

### Edit A — turn the CTA wrapper into a wrapping flex row (page.tsx:111)

From:
```tsx
<div data-rise="" style={{ animationDelay: ".64s" }}>
```
To (adds flex + wrap + gap + alignment; keeps `data-rise` and the `.64s` delay):
```tsx
<div data-rise="" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, animationDelay: ".64s" }}>
```
This is the identical row pattern already proven in this file at page.tsx:177.

### Edit B — append the secondary Link AFTER the primary, before `</div>` (page.tsx:114→115)

Insert this sibling immediately after the existing primary `</Link>` (page.tsx:114) and before the
wrapper `</div>` (page.tsx:115):
```tsx
<Link href="/whitepaper" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#FFFCF7", color: "#8B1428", textDecoration: "none", fontFamily: F_SANS, fontSize: 15.5, fontWeight: 600, letterSpacing: "0.01em", padding: "14px 24px", borderRadius: 13, border: "1px solid #C8A96F", boxShadow: "0 1px 2px rgba(26,21,18,0.04)" }}>
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2 2 0 0 1 6 3.5h6v14H6a2 2 0 0 0-2 2z" /><path d="M20 5.5A2 2 0 0 0 18 3.5h-6v14h6a2 2 0 0 1 2 2z" /></svg>Ler o Whitepaper<span aria-hidden="true" style={{ fontFamily: F_MONO }}>→</span>
</Link>
```

### Why this satisfies every constraint

- **Desktop same-line:** the copy column is wide (maxWidth 620, page.tsx:85); `display:flex` puts
  both buttons on one row. Primary ≈ padding `15px 28px`, secondary ≈ `14px 24px`, `gap:14` — they
  fit comfortably on one line at desktop widths.
- **Mobile stacked:** below the 900px hero-grid breakpoint (`globals.css:432-434`) the copy column
  becomes full-width and narrows; `flex-wrap:wrap` drops the second button onto its own line — no new
  media query needed. Same mechanism as the existing registry CTA row (page.tsx:177).
- **Visual hierarchy correct:** the secondary is **outlined** — `#FFFCF7` fill, bordô `#8B1428`
  text, gold `#C8A96F` border — matching the site's existing outline-chip language (SiteNav outline
  chips use `#fff`/`#DDD1BE`→`#C8A96F`; hero indicator circles use the same gold hairline). It reads
  as clearly subordinate to the filled bordô primary.
- **Font correctness:** uses `F_SANS` (label) and `F_MONO` (arrow) = `var(--font-*)`, honouring the
  next/font GOTCHA. Both constants already exist (page.tsx:24-27); no new import (Link already
  imported page.tsx:2).
- **Untouched:** h1 (page.tsx:93-97), paragraph (page.tsx:99), HERO_INDICATORS ul
  (page.tsx:101-109), the whole right-side illustration (page.tsx:118-157) and the primary Link
  (page.tsx:112-114) are all unchanged.

### Companion changes REQUIRED for the CTA to work (not part of the hero copy)

1. **Create the `/whitepaper` route** — `website/app/whitepaper/page.tsx` (currently absent → the
   link 404s via `not-found.tsx`). Must carry operator-neutral, non-normative framing and its own
   scoped `metadata` (`alternates.canonical:"/whitepaper"`), NOT any Bank/PSP schema.org type.
2. **Add `"/whitepaper"` to `ROUTES`** in `website/app/sitemap.ts:14-30`.
3. Optional (not requested): add the whitepaper to the footer **Protocolo** group in
   `website/lib/site.ts:33-39`.

---

## 9. Boundary / obsolete-terminology check (enforcement)

All active surfaces read (page.tsx, site.ts, layout.tsx, SiteNav.tsx, licensing.md, README §License)
are consistent with the required model — **no obsolete/incompatible terminology found on any active
surface**:

- Three layers correct: L1 BANZA Protocol / L2 "Certificação de Conformidade e Interoperabilidade"
  (of an implementation) / L3 Banzami Operational Scheme, "Preparação regulatória em curso e
  pagamentos reais desactivados" (page.tsx:196-199).
- L2 card explicitly: "Não constitui licença, admissão num scheme ou autorização regulatória"
  (page.tsx:198) — matches certification ≠ admission ≠ authorisation.
- BANZA-is-not-a-bank stated: page.tsx:197 ("não é banco, PSP, carteira ou operador e não movimenta
  fundos") and README.md:517.
- BanzAI = transversal interface, **not a layer, not an authority**; "Os motores Rust executam e
  determinam os veredictos; o Qwen apenas explica" (page.tsx:211; layers intro page.tsx:193).
- Operator ≠ implementation reflected in the illustration (Operador A/B/C/D each with `impl. A1..D1`,
  page.tsx:136-145) and README.md:73 ("certifies an *implementation*, never an entity").
- Operador Zero appears only as an external read-only surface link
  (`https://zero.banza.network/`, site.ts:49) — not treated as production.
- The only "BANZA CA" strings in the repo are **negated/absence** statements inside guard fixtures
  and `docs/reference/en/complete.md:9` ("The BANZA CA concept was removed in M2.2"), already
  allow-listed by `check-public-surface-clean.sh:207-211` — not an active claim.

The whitepaper program must preserve all of the above and must not reintroduce: "BANZA CA", operator
X.509 / general company certificates, central human approval as a protocol requirement, BANZA as
operator/bank/PSP/wallet/settlement, BanzAI as authority, Qwen as decider, Operador Zero as
production, active real funds, or unlimited entity certification.
