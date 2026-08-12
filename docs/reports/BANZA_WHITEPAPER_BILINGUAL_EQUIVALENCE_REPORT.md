# BANZA Whitepaper v1.0 — Bilingual Equivalence Report

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


**Status: COMPLETE**

| Field | Value |
|---|---|
| Programme | WP1-FINAL — BANZA Whitepaper v1.0 |
| Document type | Non-normative equivalence report |
| Report scope | Official English translation (EN) vs. canonical Portuguese edition (PT) |
| Version under review | Whitepaper v1.0 |
| Release tag | `banza-whitepaper-v1.0` |
| Publication date | August 2026 |
| Licence | CC BY 4.0 |
| Language of this report | International / British English |

This report is a non-normative assurance record. It asserts and evidences that the
two published editions of the BANZA Whitepaper v1.0 are structurally and substantively
equivalent: the same document expressed in two languages, published simultaneously,
with neither edition summarising, adding to, or removing from the other. The report is
grounded entirely in the committed artefacts under `docs/whitepaper/`, the website
whitepaper surfaces under `website/app/whitepaper/` and `website/components/whitepaper/`,
the home surface (`website/app/page.tsx`), and the preparation record under
`docs/whitepaper/prep/`. It defines no protocol rule and confers no certification.

---

## 1. Editions under review

Both editions are driven from a **single source of truth per language** —
`docs/whitepaper/content/en.json` and `docs/whitepaper/content/pt.json` — which drives
both the PDF (via the pinned Typst 0.12.0 pipeline in `tools/whitepaper-build.sh`) and
the web renderings. There is no separately hand-maintained prose that could drift.

| Attribute | EN (official translation) | PT (canonical) |
|---|---|---|
| Title | BANZA: An Open Protocol for Financial Interoperability | BANZA: Protocolo Aberto de Interoperabilidade Financeira |
| Subtitle | Whitepaper v1.0 — Official English Translation | Whitepaper v1.0 — Edição canónica (Português) |
| Role | Official translation | Canonical (`is_canonical: true`) |
| Released PDF | `banza-whitepaper-v1.0-en.pdf` | `banza-whitepaper-v1.0-pt.pdf` |
| PDF SHA-256 | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |

Both titles carry the `BANZA:` prefix. Checksums are recorded in
`docs/whitepaper/manifest.json` and `docs/whitepaper/CHECKSUMS.txt`.

Each edition states its own role explicitly. The canonicity notice is present, and
substantively identical, in both files:

> **EN —** "The Portuguese-language edition is the canonical version of the BANZA Whitepaper.
> The English-language edition is an official translation. In the event of an
> unintended divergence, the canonical Portuguese edition prevails."
>
> **PT —** "A edição em língua portuguesa constitui a versão canónica do Whitepaper do BANZA.
> A edição em língua inglesa é uma tradução oficial. Em caso de divergência não
> intencional, prevalece a edição canónica em português."

The two editions were **published simultaneously** as a single release. The manifest
history records one entry (version 1.0, August 2026): *"Initial publication — official
English translation + canonical Portuguese edition, published simultaneously."*

---

## 2. Page-count equivalence

Both editions build to **exactly 10 A4 pages**. This is asserted in the source
(`pages_per_language: 10` in the manifest) and produced deterministically by the pinned
Typst 0.12.0 pipeline, with bundled fonts embedded and selectable text in both PDFs.
No edition is padded or truncated to reach the page count: the page total emerges from
the shared section structure and the shape-equivalent body text (see §3, §7).

---

## 3. Section-by-section structural equivalence

Both editions contain **the same eight sections, in the same order**, each anchored to
the same section identifier and target page. There is no section present in one edition
and absent in the other.

| # | EN heading | PT heading | Figure | Equations |
|---|---|---|---|---|
| 1 | Motivation, related work and contribution | Motivação, trabalho relacionado e contribuição | Fig. 1 | — |
| 2 | System model | Modelo de sistema | — | 3 |
| 3 | Three-layer architecture | Arquitectura em três camadas | Fig. 2 | — |
| 4 | Discovery, identity and canonical origin | Discovery, identidade e origem canónica | Fig. 3 | — |
| 5 | Deterministic validation | Validação determinística | — | — |
| 6 | Evidence, receipts, trust and the Technical Registry | Evidência, receipts, trust e o Registo Técnico | Fig. 4 | — |
| 7 | Security, governance, limitations and current state | Segurança, governação, limitações e estado actual | — | — |
| 8 | Discussion and conclusion | Discussão e conclusão | — | — |

Each section carries the same structural payload keys in both editions (`id`, `page`,
`body`, plus `figure` on §§1, 3, 4, 6 and `equations` on §2). The section-to-figure and
section-to-equation bindings are identical across editions.

---

## 4. Equation equivalence (3 equations)

Section 2 (System model) carries **three compact equations** in both editions. The
mathematical content is language-independent and is **byte-identical** across the two
source files (both the Typst source form and the HTML render form):

1. `I = (o, i, v, p, e, u)` — an implementation as a tuple.
2. `A(I) = { a_1, a_2, …, a_n }` — the artefact set exposed by an implementation.
3. `V_m(A(I), S_{v,p}) → (R, E, P)` — the validator mapping artefacts and a target
   profile to results, evidence and publication state.

Because the equations are shared verbatim, there is no risk of symbol, subscript, or
operator drift between editions.

---

## 5. Figure equivalence (4 figures)

Both editions carry **the same four monochrome, mechanism-first figures**, in the same
order, bound to the same sections. The figure assets share geometry across languages;
**only the text labels are localised** — confirmed by the paired SVG sources in
`docs/whitepaper/figures/` (`fig1..fig4` each present as `.en.svg` and `.pt.svg`).

| Fig. | Subject | EN / PT caption equivalence |
|---|---|---|
| 1 | Bilateral integrations vs. a common protocol | Pairwise integrations grow as n(n−1)/2 closed contracts; a common protocol lets independent operators implement the same public rules. |
| 2 | Three-layer architecture + transversal BanzAI | Layer 1 open protocol, Layer 2 per-implementation certification, Layer 3 independent operational schemes; BanzAI is a transversal interface across all three, not a fourth layer or an authority. |
| 3 | Canonical origin and hardened fetch | An implementation publishes signed artefacts from its canonical origin; a hardened server-side fetcher retrieves them for evaluation, never from a caller-supplied URL. |
| 4 | Validation, receipts and Evidence Bundle | Rust engines execute the nine steps and determine the results; receipts and the Evidence Bundle bind results to inputs, hashes and engine versions; publication is separate; BanzAI only explains. |

The captions convey the same claim, quantities and mechanism in each language; the PT
captions are direct translations, not summaries or elaborations.

---

## 6. Reference equivalence (18 references)

Both editions list **18 references, in the same order**, resolving to the same primary
sources. References are predominantly standards and primary literature whose
identifiers, titles, issuing bodies and years are language-independent and appear
identically in both editions; only descriptive connective text is rendered in the
edition's language. The reference set spans ISO, ISO/IEC, IETF, W3C, NIST, EMVCo, ACM,
IEEE and named publishers.

Representative anchors (identical across editions): ISO 20022; ISO 8583:2023; EMV QRCPS
v1.1; ISO/IEC 9646-1:1994; W3C DIDs v1.0; W3C Verifiable Credentials Data Model v2.0;
FIPS PUB 180-4 (SHS); RFC 8032 (EdDSA); RFC 2104 (HMAC); RFC 8785 (JCS); RFC 8446
(TLS 1.3); RFC 3161 (TSP); RFC 5280 (X.509); RFC 8615 (well-known URIs); Merkle (1980);
Shamir (1979); Nakamoto (2008); Peng (2011).

All 18 were web-verified against primary sources during preparation; no DOI, ISBN or
ISSN was invented (see `docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md` and
`WHITEPAPER_REFERENCES.bib`). The `references_verify_note` is present in both editions.

---

## 7. Body, claims, limitations and numbers

**Shape equality of body text.** The EN canonical body is approximately 2.95k words
(measured ≈ 2,976). The PT body is structurally equivalent — the same paragraphs in the
same sections making the same points — with the modestly higher token count (≈ 3,289)
attributable to the normal expansion of English into Portuguese, not to added material.
The abstract likewise corresponds one-to-one (EN ≈ 220 words; PT ≈ 255). No paragraph
exists in one edition without its counterpart in the other.

**Same claims.** Both editions advance the same contribution and the same architectural
and mechanism claims — the n(n−1)/2 integration argument, the system model, the
three-layer separation with a transversal BanzAI, canonical-origin discovery with a
hardened server-side fetcher, deterministic nine-step validation with Rust engines
determining results, and evidence/receipts/Evidence Bundle binding results to inputs,
hashes and engine versions.

**Same limitations and current state.** Section 7 carries the same limitations and the
same honest current-state disclosure in both editions: pre-production, with no
production operators and no production certificates ("at time of writing the Technical
Registry lists no production ..." / the PT equivalent). Neither edition softens or omits
a limitation stated by the other. The `status` field is equivalent: EN
"Pre-production. Non-normative foundational document." / PT "Pré-produção. Documento
fundacional não normativo." `normative: false` in both.

**Same numbers.** The load-bearing quantities are identical across editions: 3
equations, 4 figures, 18 references, 8 sections, 10 pages, the nine validation steps,
the L0–L4 profile range, and the three registry surfaces. No edition states a figure
the other contradicts.

---

## 8. Terminology consistency

Terminology is applied consistently within each edition and mapped one-to-one across
editions. The controlled vocabulary is recorded in
`docs/whitepaper/prep/WHITEPAPER_BILINGUAL_GLOSSARY.md`. Spot-verification against the
content sources confirms the mappings below.

| Concept | EN (official translation) | PT (canonical) | Notes |
|---|---|---|---|
| Architectural layers | Layer 1 / Layer 2 / Layer 3 | Camada 1 / Camada 2 / Camada 3 | Counts match: Layer 1 ×6, Layer 2 ×7, Layer 3 ×5 mirrored by Camada 1 ×6, Camada 2 ×7, Camada 3 ×5. |
| Conformance profiles | Profile L0–L4 | Perfil L0–L4 | The L0–L4 range and "Profile L0" appear once each in both editions; profile is used consistently throughout. |
| Certification framing | Certification Readiness / certification (technical) | Certification Readiness / certificação técnica | "Certification Readiness" is kept in English in both editions (×3 each); the PT edition also uses "certificação técnica" as the localised descriptive term. |
| Technical Registry | Technical Registry (×6) | Registo Técnico (×6) | Counts match exactly. |

**Three named registries kept distinct.** Both editions explicitly separate the three
surfaces that share the word "registry", and name all three:

1. the BANZA-operated **Technical Registry** (public, read-only) — PT **Registo Técnico**;
2. the **Public Protocol Registry** anchor (a protocol mechanism) — retained in English
   in both editions;
3. the private **Candidate Registry** used during onboarding (not part of the public
   surface) — retained in English in both editions.

The PT edition deliberately retains certain protocol-native English terms (for example
`trust`, `receipts`, `Public Protocol Registry`, `Candidate Registry`) where they are
the established protocol vocabulary; this is a consistency choice, applied uniformly, not
a divergence.

---

## 9. Neither edition summarises, adds or removes

On the combined evidence of §§3–8:

- **No summarisation** — the PT edition renders the same paragraphs, not a condensed
  précis; body shape is equal section-by-section.
- **No additions** — no section, figure, equation, reference, claim, limitation or
  number exists in one edition without its counterpart in the other.
- **No removals** — the eight sections, four figures, three equations and eighteen
  references are all present in both editions, in the same order and bindings.

Documented, intentional editorial handling of source divergences (register D-1..D-6 in
`docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md`, e.g. the trust-root Model A
choice and the three-layer grounding on ADRs) was applied **identically to both
editions** during authoring, and therefore does not introduce EN/PT divergence.

---

## 10. Shared metadata and provenance

The following are equivalent across the two editions (translated where language-bound,
identical where not):

| Field | Value (both editions) |
|---|---|
| Version | 1.0 |
| Normative | No (non-normative) |
| Date | August 2026 (`date_iso: 2026-08-01`) |
| Authors (locked order) | Fidel R. Monteiro (Fidel Rodrigues Monteiro); Jesus R. Monteiro (Jesus Rodrigues Monteiro) |
| Author relation | Co-founders of Banzami / Cofundadores da Banzami |
| Affiliation | Banzami — BANZAMI – Tecnologia e Serviços, Lda. |
| Publisher | Banzami — BANZAMI – Tecnologia e Serviços, Lda. |
| Licence | CC BY 4.0 |
| Keywords | 7 keywords, one-to-one mapped (e.g. financial interoperability → interoperabilidade financeira; trust → trust) |

No equal-contribution note, corresponding-author designation, or ORCID appears in
either edition. Author order is locked and identical.

---

## 11. Boundary statements (equivalent in both editions)

Both editions carry the same boundary discipline, with no regulatory or real-funds
claim in either:

- BANZA is not a bank, PSP, wallet or operator.
- Certification ≠ scheme admission ≠ regulatory authorisation.
- BanzAI is transversal — not a layer, not an authority, not a certifier;
  "Rust decides, Qwen explains".
- Operador Zero is a sandbox that is `NOT_CERTIFIED` and handles no real funds.
- Pre-production: 0 production operators, 0 production certificates, `/operators` empty.

---

## 12. Publication surfaces and assurance

**Web surfaces.** The whitepaper is exposed at `/whitepaper`, `/whitepaper/en`,
`/whitepaper/pt` and `/whitepaper/versions`, rendered from the same per-language content
sources via `website/app/whitepaper/` and `website/components/whitepaper/WhitepaperEdition.tsx`.
The pages carry `ScholarlyArticle` JSON-LD, `hreflang` (en / pt / x-default) and Highwire
`citation_*` metadata; all four routes prerender statically.

**Home surface.** `website/app/page.tsx` adds a single additive, outlined secondary CTA
"Ler o Whitepaper" → `/whitepaper`, beside the unchanged primary "Validar operador no
BanzAI" → `/banzai?mode=validation`. The remainder of the home surface (eyebrow, title,
paragraph, indicators, illustration, header, footer) is unchanged — zero redesign.

**Guardrails.** The dedicated guard `tools/check-banza-whitepaper.sh` (9 checks) and its
CI job pass, and `make identity-check` exits 0 under a scoped Banzami allowlist. The
build is reproducible via `tools/whitepaper-build.sh` (pinned Typst 0.12.0, bundled
fonts). Preparation artefacts under `docs/whitepaper/prep/` (Charter, Detailed Outline,
Bilingual Glossary, Claim-Evidence Matrix, Source Inventory with divergence register,
Related-Work Matrix, References.bib, Scientific Publication Readiness, Author &
Affiliation Record, Figure Specification) provide the full authoring trail.

---

## 13. Conclusion

The official English translation and the canonical Portuguese edition of the BANZA
Whitepaper v1.0 are **equivalent**: the same eight sections in the same order, the same
three equations (byte-identical), the same four figures (shared geometry, localised
text), the same eighteen references, the same seven keywords, the same claims,
limitations and numbers, and a consistent, one-to-one terminology mapping (Camada 1/2/3
↔ Layer 1/2/3; Profile / Perfil L0–L4; Certification Readiness / certificação técnica;
the three named registries kept distinct). Neither edition summarises, adds to, or
removes from the other. Both build to exactly 10 A4 pages and were published
simultaneously as one release.

**Assessment: COMPLETE — bilingual equivalence asserted and evidenced.**

---

*Non-normative. This report defines no protocol rule and confers no certification. In
the event of an unintended divergence between editions, the canonical Portuguese edition
prevails.*
