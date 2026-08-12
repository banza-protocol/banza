# BANZA Whitepaper v1.0 — Home CTA Report

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status: COMPLETE**

- **Programme:** BANZA Whitepaper v1.0 (WP1-FINAL)
- **Scope of this report:** the additive Home hero call-to-action linking to the whitepaper
- **Document class:** non-normative engineering report
- **Language:** British/international English
- **Date:** August 2026

---

## 1. Purpose

This report records the single, additive change made to the public Home hero to
surface the newly published BANZA Whitepaper v1.0, and documents the design
constraints that governed it. The guiding principle for WP1-FINAL's Home
integration was **strict additivity with zero redesign**: the whitepaper is
offered as a secondary reading path without disturbing the established primary
action, the hero narrative, or the approved dossier illustration.

The change is confined to the call-to-action row of the Home hero. Nothing else
on the Home page — eyebrow, title, paragraph, indicator list, illustration,
site header, or footer — was touched.

---

## 2. What changed

A second, secondary call-to-action, **"Ler o Whitepaper"**, was added beside the
existing primary action. It links to the in-repo whitepaper landing route
`/whitepaper`. The link is rendered as an outlined, neutral control that reads as
subordinate to the primary filled button:

- **Style:** transparent background, brand-red text (`#8B1428`), a 1px brand-red
  border at reduced opacity, and a document glyph — deliberately lighter weight
  than the primary's filled gradient and shield glyph.
- **Placement:** it sits in the same flex row as the primary, so on a wide
  viewport the two actions share a single line; the row wraps on narrow
  viewports.

The primary action, **"Validar operador no BanzAI"** → `/banzai?mode=validation`,
was left byte-for-byte unchanged and remains visually and semantically primary
(filled red gradient, shield glyph, trailing arrow).

The change lives in `website/app/page.tsx`, in the hero CTA block. The added link
is annotated in source as the additive WP1 secondary CTA, with an explicit note
that the primary above it is unchanged and stays primary.

---

## 3. Layout behaviour

The two actions live in a single flex container (`display: flex`,
`flexWrap: "wrap"`, `alignItems: "center"`, `gap: 14`) declared on the CTA row:

- **Desktop / wide viewport:** primary and secondary render on the **same line**,
  primary first (left), secondary second (right).
- **Mobile / narrow viewport:** the row wraps so the actions **stack**, with the
  **primary first** (on top) and the secondary below it.

This was verified in-browser at both desktop and mobile widths. The primary-first
ordering is preserved in both orientations because the primary link is authored
first in document order and the container relies on natural flex wrapping rather
than any reordering.

---

## 4. Change metrics

The Home integration was measured against a no-redesign budget. All targets met:

| Metric | Value |
|---|---|
| `hero_title_changes` | 0 |
| `hero_paragraph_changes` | 0 |
| `hero_illustration_changes` | 0 |
| `primary_cta_changes` | 0 |
| `secondary_whitepaper_ctas` | 1 |
| `home_redesigns` | 0 |

The hero eyebrow badge (`PROTOCOLO FINANCEIRO ABERTO · v1.0`), the three-line
display title, the supporting paragraph, the three hero indicators
(public endpoints, deterministic Rust engines, evidence-traceable results), and
the approved concentric-ring "INTEROPERABILIDADE / ILUSTRATIVO" dossier
illustration are all unchanged. The change is purely additive: one new link.

---

## 5. Destination surface

The secondary CTA resolves to the whitepaper web surface published in this
repository. The routes are static-prerendered and carry scholarly metadata:

- `/whitepaper` — landing page (edition chooser / overview)
- `/whitepaper/en` — official English translation
- `/whitepaper/pt` — canonical Portuguese edition
- `/whitepaper/versions` — version history

Each edition page carries `ScholarlyArticle` JSON-LD, `hreflang` alternates
(`en`, `pt`, `x-default`) and Highwire `citation_*` meta. The web editions and the
released PDFs are driven from the single source of truth in
`docs/whitepaper/content/<lang>.json`, so the on-page text and the PDF text are
generated from the same content.

### Published document (context)

| Field | Value |
|---|---|
| Version | 1.0 (non-normative) |
| Official title (EN) | BANZA: An Open Protocol for Financial Interoperability |
| Canonical title (PT) | BANZA: Protocolo Aberto de Interoperabilidade Financeira |
| Authors (locked order) | Fidel R. Monteiro; Jesus R. Monteiro (co-founders of Banzami) |
| Publisher | Banzami (BANZAMI – Tecnologia e Serviços, Lda.) |
| Licence | CC BY 4.0 |
| Extent | Exactly 10 A4 pages per edition (pinned Typst 0.12.0 pipeline, embedded fonts, selectable text) |
| Figures | 4 monochrome, mechanism-first (shared geometry, localised text only) |
| Equations | 3 compact system-model equations |
| References | 18, all web-verified against primary sources |
| Released PDF SHA-256 (EN) | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` |
| Released PDF SHA-256 (PT) | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |
| Release tag | `banza-whitepaper-v1.0` |

Checksums are recorded in `docs/whitepaper/manifest.json` and
`docs/whitepaper/CHECKSUMS.txt`.

---

## 6. Boundary discipline

The added CTA and its destination preserve BANZA's public-surface boundaries:

- BANZA is **not** a bank, PSP, wallet, or operator; it is an open protocol
  specification.
- Certification of an implementation is **not** scheme admission and **not**
  regulatory authorisation.
- BanzAI is a **transversal** query-and-validation interface, not a fourth layer
  and not an authority — the Rust engines decide, and the language model only
  explains.
- The environment is pre-production: 0 production operators, 0 issued
  certificates, `/operators` returns an empty set; Operador Zero is a sandbox that
  returns `NOT_CERTIFIED` and handles no real funds.

The whitepaper is explicitly non-normative and makes no regulatory or real-funds
claims. Adding a link to it does not introduce any product logic or operator
dependency into the Home page.

---

## 7. Verification

- **Build:** the Next.js production build is clean; the four whitepaper routes
  prerender as static pages.
- **Layout:** desktop same-line and mobile stacked (primary first) behaviour
  confirmed in-browser.
- **Guard:** `tools/check-banza-whitepaper.sh` (9 checks) passes, and the
  corresponding CI job is green.
- **Identity:** `make identity-check` exits 0 under the scoped Banzami allowlist.
- **No-redesign budget:** all six change metrics in §4 confirmed.

---

## 8. Conclusion

The BANZA Whitepaper v1.0 is surfaced from the Home hero through a single,
additive, secondary "Ler o Whitepaper" → `/whitepaper` call-to-action. The
primary "Validar operador no BanzAI" action is preserved unchanged and remains
primary; the two actions share one line on desktop and stack primary-first on
mobile. The hero title, paragraph, illustration, and the rest of the Home page
are untouched, and the no-redesign budget is met in full.
