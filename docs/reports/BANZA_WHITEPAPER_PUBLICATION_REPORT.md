# BANZA Whitepaper v1.0 — Publication Report (WP1-FINAL)

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status: COMPLETE**

Non-normative report. This document records how the BANZA Whitepaper v1.0 was prepared, gated,
built and published. It is not itself part of the protocol's normative sources (Reference,
profiles, schemas, contracts, RFCs) and it carries no normative force. British/international
English.

---

## 1. Summary

The **BANZA Whitepaper v1.0** is a foundational, citable, non-normative document that explains
what BANZA is — the problem it addresses, its system model, three-layer architecture, security
boundaries and evidence model — in a form on which future scientific articles can be built. It is
deliberately not the normative specification, not an implementation manual, not a certification
report, not a regulatory filing, and not a business or investor document.

It was produced under the **WP1-FINAL** program on branch `docs/banza-whitepaper-v1-0`, from base
commit `d912f51`, protected by rollback tag `rollback-pre-banza-whitepaper-v1-0`, and released
under tag `banza-whitepaper-v1.0`.

The whitepaper is published as two editions, simultaneously:

- **English (official translation):** *BANZA: An Open Protocol for Financial Interoperability*
- **Portuguese (canonical):** *BANZA: Protocolo Aberto de Interoperabilidade Financeira*

Both titles carry the `BANZA:` prefix. Both editions build to **exactly ten A4 pages** from a
single per-language content source through a pinned, reproducible Typst pipeline.

---

## 2. Independence from M2.19

WP1-FINAL is **independent of the M2.19 program**. It introduced **no** changes to M2.19 execution
state, milestones, engines, the Technical Registry, operator-validation behaviour, registry
contents, or any validation logic. The only change outside `docs/whitepaper/` and the new
`website/app/whitepaper/**` routes is a single **additive** secondary hero call-to-action on the
Home page (see §7). The existing Home design, primary CTA, and all other surfaces were left
unchanged (zero redesign).

---

## 3. Editorial gates

The program ran through three editorial gates. Gate A required explicit human approval before any
drafting began; Gates B and C were authorised together under the instruction *"termina tudo"* to
carry the approved charter through to a complete, published release.

| Gate | Purpose | Disposition |
|---|---|---|
| **A — Charter** | Fix scope, identity, thesis, structure, figures, licence and publication conditions *before* drafting | **Approved** (human sign-off on `WHITEPAPER_CHARTER.md` and the Author & Affiliation Record) |
| **B — Draft & bilingual completeness** | Author the official English translation and the structurally equivalent canonical Portuguese edition | **Authorised** via *"termina tudo"* |
| **C — Build, verify & publish** | Reproducible PDF build, figures, web routes, manifest/hashes, citation forms, guard + CI | **Authorised** via *"termina tudo"* |

The Gate-A charter fixed the central thesis: BANZA creates a common language through which
independent financial operators can interoperate using public rules, demonstrable conformance and
verifiable evidence, without relying on closed technical integrations between each pair of
operators. Depth was required to come from explaining the **mechanism**, not from adjectives; every
material claim is backed by a definition, a mechanism, a canonical BANZA source, a primary external
reference, reproducible evidence, or a stated limitation.

---

## 4. Identity, authorship and licence

**Authors (locked order):**

1. **Fidel R. Monteiro** (Fidel Rodrigues Monteiro)
2. **Jesus R. Monteiro** (Jesus Rodrigues Monteiro)

Both are **co-founders of Banzami**. Affiliation and publisher: **Banzami — BANZAMI – Tecnologia e
Serviços, Lda.** (one canonical casing throughout). There are no equal-contribution, joint-first,
or corresponding-author notes, and no ORCID identifiers.

- **Version:** 1.0
- **Date:** August 2026
- **Licence:** **CC BY 4.0** (non-normative; no IP transfer; no public-domain dedication). The
  cover/colophon carries an explicit CC BY 4.0 marker and the fixed attribution
  `© 2026 BANZAMI – Tecnologia e Serviços, Lda.`
- **Nature:** foundational, architectural, scientific-technical, non-normative, citable, versioned,
  public, bilingual.

**Language rule (binding).** Portuguese is the canonical edition; English is an official, integral,
structurally equivalent translation that never summarises, adds, removes, softens, reorders or
diverges. Neither edition was considered "published" until both editions (source, web page, PDF),
both metadata sets, both hashes, the manifest, the version history and the citation forms existed
simultaneously.

---

## 5. Content and structure

The paper is one column, academic typography, monochrome, **ten A4 pages per edition** (cover,
abstract, figures, conclusion and references included; no separate table-of-contents page, no
annexes, no combined bilingual PDF). The fixed page plan runs: cover and bibliographic identity;
abstract, keywords and problem; motivation, related work and contribution; system model; three-layer
architecture; discovery, identity and canonical origin; deterministic validation; evidence,
receipts, trust and the Technical Registry; security, governance, limitations and current state;
discussion, conclusion, references and citation.

- **Sections** (single source): motivation, system model, architecture, discovery, validation,
  evidence, security, conclusion.
- **Keywords:** financial interoperability, open financial protocol, deterministic validation,
  verifiable evidence, technical conformance, trust, protocol governance.
- **Editorial budget met:** EN body ≈ 2.95k words; PT structurally equivalent (shape-equality
  asserted section-by-section by the guard).
- **Three compact equations** describe the system model.
- **18 references**, all web-verified against primary sources (ISO / IETF / W3C / NIST / ACM / IEEE
  / publishers). No invented DOI, ISBN or ISSN.

A single per-language content source (`docs/whitepaper/content/en.json`,
`docs/whitepaper/content/pt.json`) drives both the PDF and the web editions, guaranteeing that the
rendered PDF and the web page cannot drift from one another.

### 5.1 Figures

Four monochrome, mechanism-first figures, with **shared geometry** across both languages (only text
is localised):

| Fig. | Subject |
|---|---|
| 1 | Bilateral integrations versus a common protocol |
| 2 | Three-layer architecture (with BanzAI as a transversal aid, not a fourth layer) |
| 3 | Canonical origin and published artifacts |
| 4 | Deterministic validation and evidence |

Figures are vector SVG, with no gradients, shadows, 3D, colour-dependence, screenshots or mockups.

---

## 6. Boundaries and honest positioning

The whitepaper states its boundaries plainly and makes **no** regulatory or real-funds claims:

- BANZA is an open financial interoperability protocol — **not a bank, PSP, wallet, operator,
  payment network, settlement system, digital currency, or blockchain protocol**.
- Certification is the evaluation of a specific **implementation**, not absolute certification of an
  entity; certification is **not** scheme admission and **not** regulatory authorisation.
- **BanzAI is transversal** — an aid, not a layer, not an authority, and not a certifier. Rust
  decides; Qwen/BanzAI explains.
- Operador Zero is a sandbox example, `NOT_CERTIFIED`, with no real funds.
- The protocol is **pre-production**: zero production operators, zero certificates, and the public
  operator list is empty (`/operators` → `[]`).

The contract guard actively forbids superlative or unfounded claims (for example "BANZA CA",
"regulator-approved", "trustless", "production-proven", and any `doi:`/`isbn`/`issn` string) in the
published content.

### 6.1 Documented divergences

The Source Inventory recorded six divergences (D-1..D-6) between candidate sources, each resolved
editorially so that no divergence blocks a central thesis:

- **D-1** trust-root "who signs what" → resolved to **Model A** (INV-ROOT invariants take
  precedence); paper makes scoped, mechanistic claims only.
- **D-2** the Reference predates the three-layer model → three-layer content grounded on the ADRs,
  governance docs and contracts rather than the Reference chapters.
- **D-3 / D-5** cosmetic/informational build-metadata and example-origin strings → not quoted; framed
  to preserve operator neutrality.
- **D-4** a stale certificates table → superseded by the current schema and per-implementation
  record.
- **D-6** registry-entry-as-trust-check → disambiguated against the relevant invariants (a registry
  listing is not itself a check).

---

## 7. Home hero CTA (additive, zero redesign)

A single **additive** secondary, outlined call-to-action — **"Ler o Whitepaper" → `/whitepaper`** —
was placed beside the unchanged primary CTA **"Validar operador no BanzAI" →
`/banzai?mode=validation`**. Browser-verified: on desktop both CTAs sit on the same line; on mobile
they stack with the primary CTA first. Eyebrow, title, paragraph, indicators, illustration, header
and footer are all unchanged. The guard asserts the primary CTA is preserved and that exactly one
whitepaper CTA exists.

---

## 8. Web publication

Four static routes were added, each pre-rendered at build time (the Next.js build is clean):

- `/whitepaper` — landing and edition chooser
- `/whitepaper/en` — official English translation
- `/whitepaper/pt` — canonical Portuguese edition
- `/whitepaper/versions` — version history and citation forms

The edition pages emit `ScholarlyArticle` JSON-LD, `hreflang` alternates (`en`, `pt`, `x-default`),
and Highwire `citation_*` meta tags for scholarly indexing. `/whitepaper` is registered in the
sitemap. The released PDFs are served from `website/public/whitepaper/`.

---

## 9. Reproducible build pipeline

The PDFs are produced by `tools/whitepaper-build.sh` from the per-language content source and shared
figures through a **pinned Typst 0.12.0** toolchain, using only bundled fonts (New Computer Modern +
DejaVu Sans Mono) embedded in the output — no external services, deterministic, with selectable
text. The build asserts **exactly ten pages** per language and warns if the local Typst version
differs from the pin. A `draft` mode stamps a "DRAFT — NOT FOR CITATION" watermark; the released
`final` mode omits it, and the guard verifies the released PDFs carry no draft watermark.

---

## 10. Released artifacts and integrity

Released PDF SHA-256 hashes (`docs/whitepaper/manifest.json`, `docs/whitepaper/CHECKSUMS.txt`):

| Edition | File | SHA-256 |
|---|---|---|
| EN (official translation) | `banza-whitepaper-v1.0-en.pdf` | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` |
| PT (canonical) | `banza-whitepaper-v1.0-pt.pdf` | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |

The manifest records version 1.0, both editions, their hashes and byte sizes, the canonical/
translation languages, publisher, licence, and the version history.

**Citation forms.** `docs/whitepaper/CITATION.cff` (CFF 1.2.0) and `docs/whitepaper/citation.bib`
(`@techreport`) both name the two authors in locked order, version 1.0, CC BY 4.0, publisher Banzami
(BANZAMI – Tecnologia e Serviços, Lda.), and the canonical URL `https://banza.network/whitepaper`.

---

## 11. Preparation artifacts

The Gate-A/B evidence base lives under `docs/whitepaper/prep/`:

- `WHITEPAPER_CHARTER.md` — editorial charter (Gate-A)
- `WHITEPAPER_DETAILED_OUTLINE.md` — fixed ten-page plan
- `WHITEPAPER_BILINGUAL_GLOSSARY.md` — institutional EN/PT terminology
- `WHITEPAPER_CLAIM_EVIDENCE_MATRIX.md` — claim → evidence traceability
- `WHITEPAPER_SOURCE_INVENTORY.md` — sources + divergence register D-1..D-6
- `WHITEPAPER_RELATED_WORK_MATRIX.md` — related work positioning
- `WHITEPAPER_REFERENCES.bib` — verified references
- `WHITEPAPER_SCIENTIFIC_PUBLICATION_READINESS.md` — readiness assessment
- `WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md` — binding authorship record
- `WHITEPAPER_FIGURE_SPECIFICATION.md` — figure specification

---

## 12. Quality gate: guard and CI

`tools/check-banza-whitepaper.sh` enforces the program's binding rules through nine content- and
committed-artifact checks: exact authorship, order and affiliation; the `BANZA:` title prefix in
both editions; bilingual structural equivalence with four figures, three equations, non-normative
flags and 12–18 references; four localised figures per language; released PDFs present with no draft
watermark; manifest integrity with SHA-256 and version history; absence of forbidden claims plus the
presence of the boundary statement; the additive Home hero CTA with the primary CTA preserved; and
the presence of all four web routes and the sitemap entry. The guard runs the same script locally
(`make banza-whitepaper-check`) and as the `banza-whitepaper` CI job — **PASS**. `make
identity-check` exits **0** (scoped Banzami allowlist).

---

## 13. Release tag

The published state is tagged **`banza-whitepaper-v1.0`**; the pre-program state is preserved at
**`rollback-pre-banza-whitepaper-v1-0`** (base `d912f51`).

---

## 14. Deploy and public-edge QA

_Final publication step — deploy the website bundle carrying the `/whitepaper` routes and released
PDFs, then run public-edge QA against `https://banza.network/whitepaper` (both editions load, PDFs
downloadable and hash-matching, JSON-LD/hreflang/citation meta present, Home hero shows both CTAs)._
