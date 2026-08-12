# BANZA Whitepaper v1.0 — Diagram Review

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status: COMPLETE**

**Document under review:** BANZA Whitepaper v1.0 (WP1-FINAL)
**Scope of this review:** the four monochrome mechanism-first figures shipped with the paper
**Nature of this report:** non-normative editorial review, grounded in the committed artifacts under `docs/whitepaper/`
**Language:** British / international English

---

## 1. Purpose and scope

This report reviews the four figures that accompany the BANZA Whitepaper v1.0 in both its official
English translation ("BANZA: An Open Protocol for Financial Interoperability") and its canonical
Portuguese edition ("BANZA: Protocolo Aberto de Interoperabilidade Financeira"). Both
editions carry the same `BANZA:` title prefix, are authored by Fidel R. Monteiro and Jesus R. Monteiro
(co-founders of Banzami), published by Banzami under CC BY 4.0, versioned 1.0, dated August 2026, and built
to exactly ten A4 pages each through a pinned Typst 0.12.0 pipeline from a single bilingual source.

The review confirms that each figure satisfies the discipline set out in the Figure Specification
(`docs/whitepaper/prep/WHITEPAPER_FIGURE_SPECIFICATION.md`): mechanism-first, monochrome, vector, no reliance
on colour, identical geometry across languages with text-only localisation, and no reproduction of any figure
from foundational protocol papers. It is a documentation deliverable only; it defines no protocol rule and
changes no artifact.

The figures reviewed are the committed SVG sources:

| Fig. | File stem (`docs/whitepaper/figures/`) | Placement |
|------|----------------------------------------|-----------|
| 1 | `fig1-bilateral-vs-protocol.{en,pt}.svg` | Page 3 |
| 2 | `fig2-three-layers.{en,pt}.svg` | Page 5 |
| 3 | `fig3-canonical-origin.{en,pt}.svg` | Page 6 |
| 4 | `fig4-validation-evidence.{en,pt}.svg` | Page 8 |

Each figure exists as a pair of SVG files — one per language — plus the shared caption/alt text held in the
Figure Specification and echoed in the paper's bilingual content source.

---

## 2. Shared visual discipline

All four figures observe a single, consistent visual grammar. This was verified directly against the SVG
sources:

- **Single ink.** Every fill and stroke is `#000` on a transparent/white ground; the only other declared
  fill values are `none` (open shapes) and the white page rectangle. No other colour appears in any of the
  eight SVG files.
- **No gradients, shadows, 3D, filters, icons-as-decoration, screenshots, mockups, or decorative
  backgrounds.** No `linearGradient`, `radialGradient`, `filter`, blur, or 3D transform is present in any
  file. Meaning is carried entirely by shape, position, arrow direction and label — never by colour, so the
  figures survive greyscale and monochrome print without loss.
- **Restrained construction.** Simple rectangles and circles, thin rules (stroke widths ~1.0–1.4), a single
  triangular arrowhead marker, one idea per figure, each readable in well under thirty seconds.
- **Vector throughout.** SVG source embeds cleanly into the PDF and scales for web without rasterisation.
- **Serif body face** (`Georgia`/`Times New Roman`) for labels with a monospace accent class for machine-ish
  tokens (`.well-known`, artifact names, `execute + decide`), matching the paper's academic typography.
- **Accessibility baked in.** Every SVG carries `role="img"`, a `<title>`, a `<desc>`, and an `aria-label`
  matching the specified alt text; every figure carries a number, title and caption.

This discipline is deliberately in the spirit of restrained, mechanism-first protocol papers, but the figures
are original constructions — none reproduces or traces any figure from the Bitcoin paper or any other source.

---

## 3. Bilingual equivalence (identical geometry, text-only localisation)

A core requirement is that the two language variants of each figure be geometrically identical, differing
only in their text. This was verified mechanically by extracting every coordinate, dimension, radius, corner
radius and `viewBox` from each EN/PT pair and comparing:

| Fig. | Geometry EN vs PT | Localised text example (EN → PT) |
|------|-------------------|----------------------------------|
| 1 | Identical | "Bilateral integrations versus a common protocol" → "Integrações bilaterais versus um protocolo comum" |
| 2 | Identical | "The three-layer architecture" → "A arquitectura em três camadas" |
| 3 | Identical | "Canonical origin and published artifacts" → "Origem canónica e artefactos publicados" |
| 4 | Identical | "Deterministic validation and evidence" → "Validação determinística e evidência" |

In every pair the shapes, arrows and layout are byte-for-byte the same on the geometry; only the `<title>`,
`<desc>`, `aria-label` and visible label strings change. This guarantees that an English and a Portuguese
reader see exactly the same mechanism, and that the figures cannot drift apart as the text evolves — the
localisation surface is confined to strings. The paper's structural-equivalence guard independently asserts
four figures per language and shape-equality of the two editions.

---

## 4. Figure-by-figure review

### Figure 1 — Bilateral integrations versus a common protocol (Page 3)

**What it shows.** Two side-by-side panels over the same four operators, A–D. Panel (a), "Pairwise
integrations", draws the four as a fully meshed graph — every pair joined by a private link — under the
label "every pair a private contract". Panel (b), "Common protocol", draws the same four operators each
connecting instead to one shared box labelled "BANZA / public rules", under "operators implement common
public rules".

**Mechanism communicated.** The pairwise mesh grows as n(n−1)/2 closed contracts, whereas a common protocol
lets independent operators implement one public rule-set. The contrast is structural, not aesthetic.

**Boundary discipline.** Correctly observed: BANZA is drawn as the shared *rules*, not as a hub or switch
that processes transactions. Operators point at the rules; no traffic is shown flowing through BANZA. This
keeps the figure faithful to the operator-neutral, non-PSP positioning of the protocol.

**Assessment.** Clear, immediately legible, and disciplined. The single-ink mesh reads well in greyscale.

### Figure 2 — The three-layer architecture (Page 5)

**What it shows.** Three stacked bands — L1 "BANZA Protocol (open, neutral)", L2 "Conformance &
Interoperability Certification", L3 "Operational Schemes" — with a fourth, visually distinct dashed rail to
the right labelled "BanzAI — transversal interface" spanning all three bands. A footnote line reads "BanzAI
is not a fourth layer and not an authority."

**Mechanism communicated.** L1 is the open, neutral protocol; L2 is per-implementation certification; L3 is
the independent operational schemes. BanzAI sits across all three as an interface, never as a layer.

**Boundary discipline.** Correctly observed on two counts. First, BanzAI is rendered as a side rail with a
dashed outline — deliberately *not* a stacked band — reinforced by the explicit footnote. Second, the L3
band is generic ("Operational Schemes"); the Banzami Scheme is named only in the caption as the first
intended scheme, so the architecture does not read as operator-specific.

**Assessment.** The dashed rail is an effective, colour-free way to distinguish "transversal interface" from
"layer". The stack ordering (L1 at the base, L3 at the top) matches the paper's dependency narrative.

### Figure 3 — Canonical origin and published artifacts (Page 6)

**What it shows.** A left-to-right flow: `operator → implementation → canonical origin (.well-known)`. The
canonical origin publishes a "signed artifacts" box enumerating "Manifest · metadata · keys · revocation ·
endpoints". A further arrow leads to "deterministic engines", annotated "server-side fetch".

**Mechanism communicated.** An implementation publishes signed artifacts from its own canonical origin; a
hardened server-side fetcher retrieves them for evaluation. The pull direction is explicit — the engines
fetch; they do not receive pushed data, and never act on a caller-supplied URL.

**Boundary discipline.** Correctly observed. The arrow into the engines originates from the canonical origin
and is labelled as a server-side fetch, encoding the SSRF-hardened, origin-bound retrieval model. The figure
deliberately excludes onboarding operationals (no OTP, Candidate Registry, or forms), keeping it to the
canonical-origin mechanism.

**Assessment.** The flow is unambiguous and the "server-side fetch" annotation carries the key security
property without needing colour or embellishment. The operator/implementation distinction is preserved.

### Figure 4 — Deterministic validation and evidence (Page 8)

**What it shows.** Inputs "(artifacts, hashes)" feed the "Rust engines — nine steps" box, annotated "execute
+ decide" and grouped under an "execution" zone. Results flow right to "receipts + Evidence Bundle" ("bound
to inputs + versions", "publication" zone) and on to the "Technical Registry". A separate downward branch
leads to "BanzAI / Qwen — explains only", with the closing line "explanation never decides or publishes".

**Mechanism communicated.** The Rust engines execute the nine steps and determine the results; receipts and
the Evidence Bundle bind those results to their inputs, hashes and engine versions; publication to the
Technical Registry is a separate step; BanzAI only explains.

**Boundary discipline.** Correctly observed — this is the most boundary-sensitive figure and it is handled
well. Execution, publication and explanation occupy three visually separated zones. The explanation branch
is a terminal leaf off the results: it never feeds back into the decision, faithfully encoding "Rust decides,
Qwen explains" and "BanzAI never decides or publishes".

**Assessment.** The three-zone separation is the clearest possible statement of the determinism-and-evidence
model. The figure uses a slightly taller canvas than the others to accommodate the branch, which is
appropriate and does not break the shared grammar.

---

## 5. Compliance summary

| Criterion | Fig 1 | Fig 2 | Fig 3 | Fig 4 |
|-----------|:-----:|:-----:|:-----:|:-----:|
| Monochrome, single ink (`#000`) | Yes | Yes | Yes | Yes |
| No gradient / shadow / 3D / filter | Yes | Yes | Yes | Yes |
| Meaning independent of colour | Yes | Yes | Yes | Yes |
| Vector (SVG source) | Yes | Yes | Yes | Yes |
| Identical geometry EN/PT (text-only localisation) | Yes | Yes | Yes | Yes |
| Number + title + caption + alt text | Yes | Yes | Yes | Yes |
| `role`/`title`/`desc`/`aria-label` present | Yes | Yes | Yes | Yes |
| Mechanism-first, one idea, < 30 s legibility | Yes | Yes | Yes | Yes |
| Boundary discipline observed | Yes | Yes | Yes | Yes |
| Original — not copied from the Bitcoin paper | Yes | Yes | Yes | Yes |

All ten criteria hold for all four figures.

---

## 6. Boundary and neutrality check

Across the figure set the paper's stated boundaries are respected and, in several cases, are the explicit
subject of the figure:

- **BANZA is not a bank, PSP, wallet, or operator.** Figure 1 renders BANZA as shared rules, not a
  transaction hub; Figure 2 labels L1 as "open, neutral".
- **Certification is not scheme admission and not regulatory authorisation.** Figure 2 keeps L2
  (certification) distinct from L3 (operational schemes); no regulatory or real-funds claim appears in any
  figure.
- **BanzAI is transversal, not a layer and not an authority.** Stated in Figure 2 (dashed side rail +
  footnote) and enforced in Figure 4 (explanation branch that never decides or publishes) — "Rust decides,
  Qwen explains".
- **Operator neutrality.** No commercial operator brand appears in any figure; operators are shown as
  A–D or as the generic "operator/implementation" pair. The Banzami Scheme is named only as the first
  intended L3 scheme, in caption prose, consistent with the operator-neutral protocol identity.
- **Pre-production honesty.** Nothing in the figures asserts production operators, issued certificates, or
  real-funds activity; they depict mechanism, not deployment status.

---

## 7. Integration with the paper and web editions

The figures are driven from the same single bilingual source that produces both the PDF and web editions,
so the diagrams a reader sees on the web (`/whitepaper`, `/whitepaper/en`, `/whitepaper/pt`) and in the
downloadable PDFs are the same vector artifacts, localised by text only. The released PDFs are pinned by
SHA-256 in `docs/whitepaper/manifest.json` and `docs/whitepaper/CHECKSUMS.txt`:

- English: `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc`
- Portuguese: `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540`

Both editions build to exactly ten A4 pages with embedded, bundled fonts and selectable text. The whitepaper
guard (`tools/check-banza-whitepaper.sh`) independently verifies "four monochrome SVGs per language (geometry
shared, text localised)" among its checks, and the identity check passes clean.

---

## 8. Conclusion

The four figures form a coherent, mechanism-first visual system that matches the Figure Specification exactly.
They are monochrome and colour-independent, vector, geometrically identical across English and Portuguese
with localisation confined to text, each fully captioned and described for accessibility, and each faithful
to the protocol's boundaries — BANZA as shared rules rather than a hub, the three layers with BanzAI as a
transversal interface, canonical-origin server-side retrieval, and deterministic Rust execution with a
non-deciding explanation branch. None reproduces a figure from any prior protocol paper. The diagram set is
publication-ready for BANZA Whitepaper v1.0.

**Status: COMPLETE.**
