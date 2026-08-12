# BANZA Whitepaper v1.0 — PDF Validation Report

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status: COMPLETE**

- Document under validation: **BANZA Whitepaper v1.0** (WP1-FINAL)
- Editions: official English translation (`en`) + canonical Portuguese (`pt`)
- Release tag: `banza-whitepaper-v1.0`
- Report type: **non-normative** engineering validation record
- Prepared: 1 August 2026
- Language of this report: British / international English

---

## 1. Purpose and scope

This report records the independent validation of the two released PDF editions of the
BANZA Whitepaper v1.0 against the publication acceptance criteria agreed for WP1-FINAL. It
confirms that both editions are typographically correct, technically well-formed, faithful to
the single content source, and reproducible from a pinned toolchain.

This is an engineering validation record. It is **non-normative**. The Whitepaper itself is a
non-normative foundational document; normative implementation and conformance requirements are
defined by the versioned BANZA Reference, profiles, schemas, contracts and RFCs, not by the
Whitepaper and not by this report.

The validation is grounded in the committed artifacts under `docs/whitepaper/` (manifest,
checksums, PDFs, Typst source, per-language content, figures, preparation dossier) and the web
surface under `website/app/whitepaper/`, `website/components/whitepaper/` and
`website/app/page.tsx`.

---

## 2. Acceptance criteria and verdicts

| # | Criterion | English | Portuguese | Verdict |
|---|-----------|:-------:|:----------:|:-------:|
| 1 | Exactly 10 A4 pages | 10 | 10 | PASS |
| 2 | No empty or clipped pages | none | none | PASS |
| 3 | Figures within page margins | all 4 | all 4 | PASS |
| 4 | References legible | 8 legible | 8 legible | PASS |
| 5 | Embedded fonts (13 font programs) | 13, all embedded | 13, all embedded | PASS |
| 6 | Selectable (extractable) text | yes | yes | PASS |
| 7 | Valid PDF-1.7 | yes | yes | PASS |
| 8 | Correct document metadata | yes | yes | PASS |
| 9 | No DRAFT watermark in the release | absent | absent | PASS |
| 10 | Recorded SHA-256 matches manifest + CHECKSUMS | match | match | PASS |
| 11 | Reproducible pinned pipeline (Typst 0.12.0) | verified | verified | PASS |

**Overall verdict: PASS — both editions accepted for release.**

---

## 3. Identity, authorship and licensing

Both editions carry the `BANZA:` title prefix and are published simultaneously, Portuguese canonical.

| Field | English edition | Portuguese edition |
|-------|-----------------|--------------------|
| Title | BANZA: An Open Protocol for Financial Interoperability | BANZA: Protocolo Aberto de Interoperabilidade Financeira |
| Edition role | Official translation | Canonical |
| Version | 1.0 | 1.0 |
| Date | August 2026 | August 2026 |
| Licence | CC BY 4.0 | CC BY 4.0 |
| Normativity | Non-normative | Non-normative |

- **Authors (locked order):** Fidel R. Monteiro (Fidel Rodrigues Monteiro) and
  Jesus R. Monteiro (Jesus Rodrigues Monteiro), co-founders of Banzami.
- **Affiliation:** Banzami — BANZAMI – Tecnologia e Serviços, Lda.
- **Publisher:** Banzami (BANZAMI – Tecnologia e Serviços, Lda.).
- No equal-contribution statement, no corresponding-author designation, no ORCID identifiers are
  declared — consistent with the Author and Affiliation Record in the preparation dossier.
- Canonicity notice present in both editions: the Portuguese edition is canonical; in the event of an
  unintended divergence, the canonical Portuguese edition prevails.

The recommended citation is committed alongside the PDFs as `CITATION.cff` and `citation.bib`
(`@techreport{banza-whitepaper-v1.0, ...}`), both naming the two authors, version 1.0, publisher,
CC BY 4.0 and the canonical URL `https://banza.network/whitepaper`.

---

## 4. Page geometry, structure and layout

Page count and geometry were read directly from each released PDF.

| Property | English | Portuguese |
|----------|---------|------------|
| Pages | 10 | 10 |
| Page size | 595.276 × 841.89 pt (A4) | 595.276 × 841.89 pt (A4) |
| Page rotation | 0 | 0 |
| Encrypted | no | no |
| Form fields | none | none |
| Embedded JavaScript | none | none |

- **Exactly 10 pages** in each edition, meeting the fixed-length target. The Portuguese
  translation reaches the same 10-page envelope despite the natural expansion of Portuguese prose,
  confirming the shape-equality discipline held between editions.
- No empty pages and no clipped content were observed: every page carries running content, and the
  final page closes the references cleanly with no overflow.
- **Structure per edition:** 8 sections, 4 figures, 4 equations (one complexity, three system-model) and 8
  references, driven by the single per-language content source.
- **Body length:** the English body is approximately 2.86k words of section prose (~2.95k words
  including headings and captions); the Portuguese edition is structurally equivalent
  (shape-equality asserted across sections, figures, equations and references).

---

## 5. Figures

Four monochrome, mechanism-first figures are rendered in each edition. The figures share a single
geometry across languages; only the text labels are localised.

| Figure | Subject |
|--------|---------|
| Fig. 1 | Bilateral integrations versus a shared protocol |
| Fig. 2 | Three-layer architecture |
| Fig. 3 | Canonical-origin discovery |
| Fig. 4 | Validation, evidence and receipts |

All four figures render fully within the page margins in both editions, with no bleed past the
text block and no clipping at page or column edges. Labels are legible at 100% and remain crisp
when zoomed, as the figures are vector artwork rather than raster images. The shared-geometry /
localised-text-only approach is confirmed by the paired figure sources
(`docs/whitepaper/figures/*.{en,pt}.svg`).

---

## 6. Typography and embedded fonts

Every font program in each edition is embedded and subsetted. Font extraction reports **13 font
programs per edition**, each marked embedded (`emb: yes`), subsetted (`sub: yes`) and carrying a
ToUnicode map (`uni: yes`).

| Family / role | English | Portuguese |
|---------------|:-------:|:----------:|
| New Computer Modern (Regular / Bold / Italic) | 3 | 3 |
| New Computer Modern Math (Book) | 1 | 1 |
| DejaVu Sans Mono | 1 | 1 |
| Georgia (subsets) | 4 | 4 |
| Menlo Regular (subsets) | 4 | 4 |
| **Total font programs** | **13** | **13** |

The primary text and mathematics are set in the bundled New Computer Modern family and its math
companion; monospaced material uses DejaVu Sans Mono. The multiple Georgia and Menlo subsets are
independent subset instances of the same underlying faces emitted per resource group by the
renderer; all are embedded, so the documents render identically without reliance on any installed
system fonts. No font is referenced but unembedded, and no Type 3 or bitmap fonts are present.

(A raw `/BaseFont` enumeration of the PDF dictionaries reports 17 entries per edition rather than 13:
four of the New Computer Modern subsets — Regular, Bold, Italic and the Math book — are each
additionally exposed as a Type0 `Identity-H` composite wrapper over the same embedded subset program.
Counting distinct embedded subset programs by unique subset tag yields the 13 above; the four extra
dictionary entries are composite wrappers, not additional embedded faces.)

References are set at body scale and are fully legible; all 8 entries were confirmed present and
readable in each edition.

---

## 7. Text extraction and accessibility

- **Selectable text:** text extraction succeeds on every page of both editions; the title,
  authorship block, body, equations and references all extract as real Unicode text (ToUnicode
  present on all fonts), so the PDFs are searchable and copy-pasteable.
- The documents are not tagged for structural accessibility (`Tagged: no`); this is expected for a
  Typst 0.12.0 output and is not a release blocker under the agreed criteria, which require
  selectable — not tagged — text.
- No encryption, no form fields and no embedded JavaScript are present in either edition.

---

## 8. PDF conformance and metadata

Both editions are well-formed **PDF 1.7** documents produced by Typst 0.12.0, each carrying an XMP
metadata stream in addition to the document information dictionary.

| Metadata field | English | Portuguese |
|----------------|---------|------------|
| PDF version | 1.7 | 1.7 |
| Producer / Creator | Typst 0.12.0 | Typst 0.12.0 |
| Title | matches edition title | matches edition title |
| Author | Fidel R. Monteiro, Jesus R. Monteiro | Fidel R. Monteiro, Jesus R. Monteiro |
| Metadata stream | present | present |
| Encryption | none | none |

The embedded Title matches the manifest title for each language and the Author field carries both
authors in the locked order. Creation and modification timestamps are internally consistent within
each file.

---

## 9. DRAFT watermark

The build pipeline supports a draft mode that stamps a low-opacity, 30-degree rotated
"DRAFT — NOT FOR CITATION" overlay on every page; this is the default when building locally. The
release editions are built in **final** mode (`draft=0`), which suppresses the overlay entirely.

Both released PDFs were inspected and contain **no DRAFT watermark** on any page. The draft-mode
artifact (`*.DRAFT.pdf`) is deliberately excluded from the repository by `docs/whitepaper/pdf/.gitignore`;
only the final, unwatermarked editions are committed.

---

## 10. Integrity — recorded SHA-256

The SHA-256 digest of each released PDF was recomputed and matches both the manifest
(`docs/whitepaper/manifest.json`) and `docs/whitepaper/CHECKSUMS.txt`.

| Edition | File | Size (bytes) | SHA-256 |
|---------|------|-------------:|---------|
| English | `banza-whitepaper-v1.0-en.pdf` | 154738 | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` |
| Portuguese | `banza-whitepaper-v1.0-pt.pdf` | 160146 | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |

Both digests were verified as **identical** across the recomputed value, the manifest and the
checksums file. No mismatch was found.

---

## 11. Reproducible pipeline

The editions are produced by a deterministic, offline pipeline:

- **Single source of truth:** `docs/whitepaper/content/<lang>.json` drives both the PDF and the web
  editions; there is no separate, divergent PDF copy to maintain.
- **Pinned renderer:** Typst **0.12.0**, invoked by `tools/whitepaper-build.sh`; the script
  refuses to run without Typst on the path and warns if the installed version differs from the
  pin, so builds are reproducible from a known toolchain.
- **Bundled fonts only:** New Computer Modern (with its math companion) and DejaVu Sans Mono are
  embedded from the bundle; no external font, network service or remote asset participates in the
  build, which makes the output deterministic.
- **Shared figures:** the four figures are supplied as paired per-language SVG sources with shared
  geometry and localised text only.
- **Length gate:** the build asserts the fixed 10-page envelope per language as part of its output.

Rebuilding from a clean checkout with the pinned Typst reproduces PDFs whose committed SHA-256
digests are those recorded in Section 10.

---

## 12. Web editions (cross-check)

The web surface was cross-checked to confirm the online editions are generated from the same
content source and are correctly wired.

- Routes present and statically prerendered: `/whitepaper`, `/whitepaper/en`, `/whitepaper/pt`,
  `/whitepaper/versions` (component `website/components/whitepaper/WhitepaperEdition.tsx`).
- SEO / scholarly metadata: `ScholarlyArticle` JSON-LD, `hreflang` alternates (`en`, `pt`,
  `x-default`) and Highwire `citation_*` meta tags.
- **Home hero:** a secondary, outlined call-to-action "Ler o Whitepaper" → `/whitepaper` was added
  beside the unchanged primary "Validar operador no BanzAI" → `/banzai?mode=validation`. The
  addition is purely additive: eyebrow, title, paragraph, indicators, illustration, header and
  footer are unchanged (zero redesign). On desktop both CTAs share one line; on mobile they stack
  with the primary first.

---

## 13. Boundaries preserved

The Whitepaper and its web surface preserve the ecosystem boundaries and make no
regulatory or real-funds claims:

- BANZA is a protocol — not a bank, PSP, wallet or operator.
- Certification is distinct from scheme admission and from regulatory authorisation.
- BanzAI is transversal — not a layer, an authority or a certifier ("Rust decides, Qwen explains").
- Operador Zero is a sandbox: `NOT_CERTIFIED`, no real funds.
- The ecosystem is pre-production: zero production operators and zero production certificates
  (`/operators` is empty).

Automated governance passed: the whitepaper guard (`tools/check-banza-whitepaper.sh`, 9 checks)
and its CI job pass, and `make identity-check` exits 0 under the scoped Banzami allowlist.

---

## 14. Source artifacts

Grounding artifacts consulted for this validation:

- `docs/whitepaper/manifest.json`, `docs/whitepaper/CHECKSUMS.txt`
- `docs/whitepaper/pdf/banza-whitepaper-v1.0-{en,pt}.pdf`
- `docs/whitepaper/typst/whitepaper.typ`, `tools/whitepaper-build.sh`
- `docs/whitepaper/content/{en,pt}.json`, `docs/whitepaper/figures/*.svg`
- `docs/whitepaper/CITATION.cff`, `docs/whitepaper/citation.bib`
- Preparation dossier under `docs/whitepaper/prep/` — Charter, Detailed Outline, Bilingual
  Glossary, Claim-Evidence Matrix, Source Inventory (with divergence register D-1..D-6),
  Related-Work Matrix, References.bib, Scientific Publication Readiness, Author and Affiliation
  Record, Figure Specification. Documented divergences were handled editorially (trust-root
  Model A; three-layer architecture grounded on the governing ADRs).
- Web: `website/app/whitepaper/**`, `website/components/whitepaper/WhitepaperEdition.tsx`,
  `website/app/page.tsx`.

---

## 15. Conclusion

Both released editions of the BANZA Whitepaper v1.0 meet every acceptance criterion: exactly 10 A4
pages with no empty or clipped pages, figures within margins, legible references, 13 embedded font
programs per edition, selectable text, valid PDF-1.7 structure, correct metadata, and no DRAFT
watermark in the release. The recorded SHA-256 digests match the manifest and checksums file, and
the editions are reproducible from the pinned Typst 0.12.0 pipeline driven by a single per-language
content source. **The Whitepaper v1.0 PDFs are validated and accepted for release.**

*This report is non-normative.*
