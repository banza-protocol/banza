# BANZA Whitepaper v1.0 — Accessibility Report

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status:** COMPLETE
**Document under review:** BANZA Whitepaper v1.0 (WP1-FINAL)
**Release tag:** `banza-whitepaper-v1.0`
**Report type:** Non-normative. This report describes accessibility characteristics of the published whitepaper (web and PDF) as observed in the committed artifacts; it is not a protocol specification and creates no normative obligation.
**Language of report:** British / international English.

---

## 1. Scope

This report covers the accessibility of the two delivery surfaces of the BANZA Whitepaper v1.0:

- **Web** — the four static routes `/whitepaper`, `/whitepaper/en`, `/whitepaper/pt`, `/whitepaper/versions`, rendered by `website/components/whitepaper/WhitepaperEdition.tsx` from the shared content source `docs/whitepaper/content/<lang>.json`.
- **PDF** — the two released editions `banza-whitepaper-v1.0-en.pdf` and `banza-whitepaper-v1.0-pt.pdf`, each exactly ten A4 pages, produced by the pinned Typst 0.12.0 pipeline (`tools/whitepaper-build.sh`).

Both surfaces are generated from a **single content source per language**, so headings, body text, equations, figure alt text, figure captions, and references are identical in wording between the web edition and the PDF edition. This single-source design is the structural basis for accessibility parity across the two media.

The whitepaper is bilingual: the **canonical** edition is Portuguese — *"BANZA: Protocolo Aberto de Interoperabilidade Financeira"* — and the **official translation** is English — *"BANZA: An Open Protocol for Financial Interoperability"*. Both titles carry the `BANZA:` prefix. The two editions are structurally equivalent (shape-equality is asserted in the build).

---

## 2. Summary of findings

| Area | Web | PDF |
|---|---|---|
| Semantic document structure | Pass — landmark elements, single `h1`, ordered `h2` sections | Pass — tagged reading order via Typst headings |
| Alternative text on all 4 figures | Pass — every `<img>` carries a descriptive `alt`; SVGs additionally carry `role="img"`, `<title>`, `<desc>` | Pass — figures accompanied by numbered captions |
| Language selection & declaration | Pass — bidirectional EN/PT selector, `hreflang` en/pt/x-default | Pass — one edition per language, language recorded in metadata |
| Keyboard operability | Pass — native links only, logical tab order, no traps | N/A (static document) |
| Colour contrast | Pass — dark ink on light ground; palette meets normal-text ratios | Pass — monochrome-adjacent |
| No colour-only dependence | Pass — figures are monochrome and use labels/shape/position | Pass — identical monochrome figures |
| Mobile / responsive | Pass — fluid `clamp()` type, `max-width:100%` figures, single column | N/A |
| Selectable text | N/A (native HTML text) | Pass — real text, not raster |
| Embedded fonts | N/A | Pass — bundled fonts embedded |
| Reading order | Pass — DOM order equals visual order | Pass — linear top-to-bottom |

No accessibility blockers were identified. Observations and residual notes are recorded in §7.

---

## 3. Web accessibility

### 3.1 Semantic headings and landmarks

The edition template establishes a clear, single-`h1` outline. Each route renders content inside a `<main>` landmark. The edition body is an `<article>`, within which:

- The document title is the only `<h1>`.
- Every major division — Abstract, each numbered content section, References, and Recommended citation — is a `<section>` with an `aria-labelledby` reference to its own `<h2>` (`wp-abstract`, `sec-<id>`, `wp-refs`, `wp-cite`). This gives assistive technology a programmatic heading tree with no skipped levels.
- The language/return controls are grouped in a `<nav aria-label="edições">` landmark, so screen-reader users can locate and skip the navigation independently of the body.
- References are marked up as an ordered list (`<ol><li>`), conveying the enumerated citation order to assistive technology rather than relying on visual numbering alone.
- The recommended-citation block is a distinct labelled section, so the citation string is discoverable as a named region.

Heading text, section ordering, and IDs come from the shared content source, so the on-screen outline matches the PDF's section outline exactly.

### 3.2 Alternative text on all four figures

The whitepaper contains **four** monochrome, mechanism-first figures. They share identical geometry across languages; only the embedded text is localised. Accessibility is provided at two layers:

1. **In the HTML edition**, each figure is rendered as `<figure>` → `<img … alt={f.alt}>` → `<figcaption>`. Every one of the four images carries a substantive, sentence-length `alt` value drawn from the content source. The captions are additionally rendered as visible `<figcaption>` text prefixed with the localised "Figure N." / "Figura N." label, so the descriptive information is available both programmatically (alt) and visibly (caption).

2. **In the SVG source files** (`docs/whitepaper/figures/*.svg`, served under `/whitepaper/figures/`), each graphic additionally declares `role="img"`, an `aria-label`, and inline `<title>` + `<desc>` elements. This means the figures remain described even when consumed directly as SVG rather than via the `<img>` alt.

The four figures and their alt text (English edition):

| # | File | Alt text (abridged) |
|---|---|---|
| 1 | `fig1-bilateral-vs-protocol` | Left: four operators A–D fully meshed by private links. Right: the same operators each implementing one shared public rule-set instead of connecting to each other. |
| 2 | `fig2-three-layers` | Three stacked layers — Layer 1 protocol, Layer 2 certification, Layer 3 operational schemes — with BanzAI drawn as a side rail spanning all three. |
| 3 | `fig3-canonical-origin` | Operator → implementation → canonical origin, which publishes signed artifacts that a hardened server-side fetcher pulls into the engines. |
| 4 | `fig4-validation-evidence` | Inputs enter the Rust engines, which decide and emit results; results become receipts and an Evidence Bundle and are separately published to the Technical Registry. |

The alt text describes each figure's **mechanism and relationships**, not merely its title, which is the correct level of detail for a conceptual diagram. Figures use only abstract, operator-neutral labels (Operator A–D, BANZA, BanzAI), consistent with operator neutrality.

### 3.3 Language selector and language declaration

- **Bidirectional selector.** Each edition renders a language control in the `edições` nav that names the current language and links to the other edition (`English ↔ Português`), plus a "← Whitepaper" return link to the language-neutral entry route. The switch is reachable from both editions in both directions.
- **`hreflang` / alternates.** Every route declares `alternates.languages` with `en → /whitepaper/en`, `pt → /whitepaper/pt`, and `x-default → /whitepaper`. Search engines and language-aware clients therefore receive an explicit language map, and the neutral entry route is correctly designated `x-default`.
- **Per-page language metadata.** The English route declares `citation_language: "en"` and `inLanguage: "en"` (ScholarlyArticle JSON-LD); the Portuguese route declares the Portuguese equivalents. This makes the content language machine-declared, not merely visually implied.
- The entry route (`/whitepaper`) presents both editions side by side with their canonical/translation tags, so a reader arriving without a language preference is offered an explicit choice rather than being auto-redirected.

### 3.4 Keyboard operability

The editions use only native, focusable HTML controls — `next/link` anchors and `<a>` elements for the PDF download and cross-language links. There are no custom click handlers, no `div`-as-button constructs, no modal traps, and no scripted focus management. Consequently:

- Tab order follows DOM order, which follows visual order (nav → header/download → abstract → sections → references → citation → version-history link).
- Every interactive element (language switch, back link, PDF download, versions link, reference/PDF links on the versions table) is reachable and actuatable by keyboard using the browser's native affordances.
- There are no keyboard traps and no off-screen focusable elements.

### 3.5 Colour contrast

The editions use a fixed dossier palette on a light ground: ink `#1A1512` for body text and headings, a muted `#5D5348` for secondary/metadata text, and bordô `#8B1428` for links and eyebrows. Body and heading text (near-black on cream/white) provide a high contrast ratio well above the 4.5:1 normal-text threshold. The bordô link colour on the light background likewise clears the normal-text threshold. The primary PDF-download control uses white text on a saturated bordô gradient, which clears the threshold for the button's large, bold label.

### 3.6 No colour-only dependence

No information is conveyed by colour alone:

- The four figures are **monochrome** (black on white). They distinguish elements by **shape, position, text label, arrowheads, and line style** (solid vs dashed), never by hue. This is the strongest possible guarantee against colour-only dependence and against colour-vision-deficiency failure.
- Links are distinguishable in context by placement and wording (e.g. the reciprocal-language control names the target language), not solely by colour.
- Section structure is conveyed by heading text and hierarchy, not by colour coding.

### 3.7 Mobile and responsive layout

- The edition body is a single-column `<article>` capped at `max-width: 760px`, centred, with fluid padding via `clamp()`. Reading remains linear and single-column on narrow viewports.
- Typography scales fluidly: the `h1` uses `clamp(26px,3.4vw,40px)` and body copy is set at a comfortable base size with generous `line-height: 1.7`.
- Figures are constrained by `max-width: 100%; height: auto`, so they scale down to the viewport without horizontal overflow. The download/action row uses `flex-wrap`, and the entry route's edition cards use an auto-fit grid that collapses to one column on small screens.
- Because the layout reflows to a single column rather than requiring horizontal scrolling, content is usable at small widths and under zoom.

The home hero addition is consistent with this: an **additive** secondary outlined CTA "Ler o Whitepaper" → `/whitepaper` sits beside the unchanged primary "Validar operador no BanzAI" → `/banzai?mode=validation`. On desktop the two CTAs share a line; on mobile they stack with the primary first. The rest of the hero (eyebrow, title, paragraph, indicators, illustration, header, footer) is unchanged — a purely additive change with no redesign.

---

## 4. PDF accessibility

Both PDFs are built by the pinned Typst 0.12.0 pipeline from the same per-language content source that drives the web editions.

### 4.1 Selectable text

The PDFs are typeset from text, not scanned or rasterised. All body text, headings, equations, captions, and references are real, selectable, and copyable text — supporting reader-tool text extraction, search, and reflow/read-aloud in conforming PDF readers.

### 4.2 Reading order

The document is a linear, single-column A4 layout with a strict top-to-bottom flow: title block → abstract and keywords → numbered sections (with equations and figures inline at their point of reference) → references → recommended citation. Because there are no multi-column text runs or floating side content, the visual order and the extraction order coincide, giving a predictable reading order for assistive technology and text extraction.

### 4.3 Embedded fonts

The build embeds its bundled fonts in every PDF. Text therefore renders and extracts identically regardless of the fonts installed on the reader's system, and no font substitution can corrupt glyphs or the copy/extract layer. Font embedding is verified as part of the release build.

### 4.4 Figure captions

Each of the four figures appears inline with a numbered caption ("Figure N." / "Figura N.") describing its mechanism. The caption wording is identical to the web `<figcaption>` because both come from the shared content source, giving the PDF reader an in-line textual description of every figure without relying on a separate alt layer.

### 4.5 Language

Each edition is a single-language document: the English PDF is entirely English, the Portuguese PDF entirely Portuguese, with matching titles carrying the `BANZA:` prefix. The document language is recorded in the release manifest (`docs/whitepaper/manifest.json`), which records `canonical_language: pt` and `translation_language: en`, and in the per-edition citation metadata. The two editions are the same ten-page document in two languages, published simultaneously.

### 4.6 Integrity (supporting verifiability)

While not an accessibility requirement, the released PDFs are integrity-pinned, which supports readers who need to confirm they are reading the authentic document. The SHA-256 digests are published in `docs/whitepaper/manifest.json` and `docs/whitepaper/CHECKSUMS.txt`, and surfaced on `/whitepaper/versions`:

- EN — `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc`
- PT — `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540`

---

## 5. Cross-surface parity

Because a single content source per language feeds both the PDF and the web edition, the two surfaces share:

- the same section titles and section order;
- the same three compact system-model equations;
- the same four figures (same geometry; only text localised) and the same figure captions;
- the same 18 references (all web-verified against primary sources — ISO / IETF / W3C / NIST / ACM / IEEE / publishers — with no invented DOI, ISBN, or ISSN);
- the same abstract and keywords.

A reader who cannot use one surface can obtain the identical content, in the identical structure, from the other. This parity is itself an accessibility property: it provides an equivalent alternative delivery of the same information.

---

## 6. Content boundaries reflected in the surfaces

The accessible surfaces faithfully carry the whitepaper's boundary statements, which are visible in both editions (via the canonicity and scope notices) and in the metadata:

- BANZA is not a bank, PSP, wallet, or operator.
- Certification is not scheme admission and not regulatory authorisation.
- BanzAI is transversal — drawn as a side rail spanning all layers in Figure 2 — and is not itself a layer, an authority, or a certifier.
- Operador Zero is a sandbox that returns `NOT_CERTIFIED` and handles no real funds.
- The system is pre-production: zero production operators, zero certificates, `/operators` empty.

No regulatory or real-funds claim appears on any surface. The whitepaper is explicitly non-normative and foundational.

---

## 7. Observations and residual notes

- **SVG served via `<img>`.** Figures are embedded with `<img src=…svg alt=…>`. The `alt` attribute is the authoritative accessible name in this mode and is present on all four; the SVG-internal `<title>`/`<desc>` provide an additional description layer if a figure is opened directly. No action required.
- **Equations.** The three equations render as centred text with a monospace math layer and a visible equation number. They are readable in-line; there is no separate MathML layer. Given the small count (three) and their compact form, this is acceptable for a non-normative document; a future revision could add MathML or an equation-level textual description for richer screen-reader output.
- **Colour-scheme.** The editions commit to a single light dossier palette rather than offering a dark variant. Contrast is comfortably within range in that single scheme, so this is a design choice rather than an accessibility gap.
- **Divergence register.** Documented source divergences (D-1..D-6 in `docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md`) were handled editorially (e.g. trust-root Model A; three-layer model grounded on the governing ADRs) and do not affect accessibility.

---

## 8. Verification basis

This report is grounded in the committed artifacts:

- `website/components/whitepaper/WhitepaperEdition.tsx` (edition renderer: landmarks, headings, `<figure>`/alt, language nav).
- `website/app/whitepaper/page.tsx`, `website/app/whitepaper/en/page.tsx`, `website/app/whitepaper/pt/page.tsx`, `website/app/whitepaper/versions/page.tsx` (routes, `hreflang`/alternates, ScholarlyArticle JSON-LD, Highwire `citation_*` metadata).
- `website/app/page.tsx` (additive secondary whitepaper CTA on the home hero).
- `docs/whitepaper/content/en.json`, `docs/whitepaper/content/pt.json` (single content source: titles, abstract, sections, equations, figures with alt + caption, 18 references).
- `docs/whitepaper/figures/*.svg` (four monochrome figures; `role="img"`, `<title>`, `<desc>`).
- `docs/whitepaper/manifest.json`, `docs/whitepaper/CHECKSUMS.txt` (ten-page A4, embedded fonts, SHA-256, language mapping).
- `docs/whitepaper/prep/` (Charter, Outline, Glossary, Claim–Evidence Matrix, Source Inventory with divergence register, Related-Work Matrix, References, Scientific Publication Readiness, Author Record, Figure Specification).

The whitepaper build is checked by the release guard (`tools/check-banza-whitepaper.sh`, nine checks) and the corresponding CI job, and `make identity-check` exits clean under a scoped Banzami allowlist. The Next.js build is clean and all four whitepaper routes prerender statically.

---

*Prepared as a non-normative accessibility assessment of BANZA Whitepaper v1.0. Whitepaper licensed CC BY 4.0. Publisher: Banzami — BANZAMI – Tecnologia e Serviços, Lda.*
