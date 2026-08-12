# BANZA Whitepaper — Authorship Report

**Status: COMPLETE**

Document: BANZA Whitepaper v1.0 (WP1-FINAL)
Scope: authorship, author order, affiliation, publisher, and the handling of private
company-registration data.
Nature: **non-normative**. This report records editorial identity facts; it does not create
protocol rules or obligations. It is grounded in the committed whitepaper artifacts referenced
throughout.

---

## 1. Summary

The BANZA Whitepaper v1.0 is authored by **two named individuals**, in a **locked order** with
Fidel first, both **co-founders of Banzami**, sharing a **single common affiliation and legal
entity**, and **published by Banzami**. There is **no equal-contribution statement, no
corresponding-author designation, and no ORCID**. No third parties are credited as authors, and
**no AI system is an author** — BanzAI is referenced only as a technical component of the system.
Private company-registration data is **excluded** from the paper and every public whitepaper
surface.

All fields below are consistent across the authoritative editorial record
(`docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`), the single-source content
(`docs/whitepaper/content/en.json`, `pt.json`), the release manifest
(`docs/whitepaper/manifest.json`), the citation metadata (`docs/whitepaper/CITATION.cff`,
`citation.bib`), and the web editions (`website/app/whitepaper/`,
`website/components/whitepaper/WhitepaperEdition.tsx`).

---

## 2. Authors and locked order

Two authors, in a fixed order that must not be inverted without express human approval:

| # | Display name (cover, citations, web) | Full name (machine-readable) |
|---|---|---|
| 1 | **Fidel R. Monteiro** | Fidel Rodrigues Monteiro |
| 2 | **Jesus R. Monteiro** | Jesus Rodrigues Monteiro |

- **Fidel R. Monteiro appears first.** The order is locked across every artifact — cover page,
  citations, JSON-LD, manifest, and both language editions.
- The preferred public short form everywhere is **Fidel R. Monteiro** and **Jesus R. Monteiro**.
- The full machine-readable names (**Fidel Rodrigues Monteiro**, **Jesus Rodrigues Monteiro**)
  are carried in the structured content source.

---

## 3. Relationship, affiliation, and publisher

- **Author relationship:** Co-founders of Banzami (Portuguese: *Cofundadores da Banzami*).
- **Affiliation (both authors):** Banzami — full legal name **BANZAMI – Tecnologia e Serviços,
  Lda.** A single common affiliation applies to both authors; there are no secondary or
  institutional co-affiliations.
- **Institutional publisher:** Banzami (**BANZAMI – Tecnologia e Serviços, Lda.**).

---

## 4. Deliberate omissions

The following are **not asserted** anywhere in the paper or its metadata:

- **No equal-contribution statement** (no "contributed equally" / "joint first authors").
- **No corresponding-author designation.**
- **No ORCID** (none provided).
- No academic titles, universities, research centres, or departments in the authorship or
  affiliation blocks.
- No phone numbers, personal addresses, or personal e-mails.

---

## 5. No third parties; AI is not an author

- No third party is credited as an author or editorial collaborator.
- **No AI system is an author** — this includes BanzAI, Claude, and any other model or tool.
- BanzAI (and other tooling) may be described **only as a technical component of the system**
  — never as an author, editor, or editorial collaborator. This is consistent with the
  ecosystem architecture in which BanzAI is transversal and non-authoritative (Rust decides,
  the model explains).

---

## 6. Private company-registration data excluded — confirmed

**Confirmed:** private company-registration data is excluded from the scientific body, the
bibliography, and every public whitepaper page. Specifically excluded: NIF, certidão numbers,
personal addresses, identity documents, marital data, quotas, share capital, and any statutory
private details.

Only the following identity facts are used, and only to the extent the editorial record permits:
the legal name of the entity, the two authors' identity, their co-founder status, the common
affiliation, the institutional publisher, and the BANZA ↔ Banzami separation.

---

## 7. Recommended citation

**Portuguese (canonical):**

> Fidel R. Monteiro and Jesus R. Monteiro. «BANZA: Protocolo Aberto de
> Interoperabilidade Financeira.» Versão 1.0. Banzami, 2026.

No DOI, ISBN, or ISSN is claimed (none exists). The English edition is identified as an
**official translation** of the canonical Portuguese edition; both carry the `BANZA:` title prefix.
Machine-readable citation metadata is provided in Citation File Format
(`docs/whitepaper/CITATION.cff`) and BibTeX (`docs/whitepaper/citation.bib`), each listing the
two authors in locked order with the common affiliation and publisher.

---

## 8. Release identity (for cross-reference)

- **Titles:** EN (official translation) — "BANZA: An Open Protocol for Financial
  Interoperability"; PT (canonical) — "BANZA: Protocolo Aberto de
  Interoperabilidade Financeira".
- **Version / date:** 1.0 — August 2026. Tag `banza-whitepaper-v1.0`.
- **Licence:** CC BY 4.0. Non-normative.
- **Released PDF checksums** (`docs/whitepaper/manifest.json`, `docs/whitepaper/CHECKSUMS.txt`):
  - EN — `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc`
  - PT — `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540`

---

## 9. Consistency check across artifacts

| Field | Editorial record | content/*.json | manifest.json | CITATION.cff / citation.bib | Web editions |
|---|---|---|---|---|---|
| Author 1 (first) | Fidel R. Monteiro | ✓ | ✓ | ✓ | ✓ |
| Author 2 | Jesus R. Monteiro | ✓ | ✓ | ✓ | ✓ |
| Locked order (Fidel first) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Co-founders of Banzami | ✓ | ✓ | ✓ | — | ✓ |
| Affiliation (legal) | BANZAMI – Tecnologia e Serviços, Lda. | ✓ | ✓ | ✓ | ✓ |
| Publisher | Banzami | ✓ | ✓ | ✓ | ✓ |
| Equal contribution / corresponding author / ORCID | none | none | none | none | none |
| AI / third party as author | excluded | excluded | excluded | excluded | excluded |
| Private registration data | excluded | excluded | excluded | excluded | excluded |

All artifacts agree. No divergence in authorship identity was found.

---

*Non-normative report. This document records editorial identity and does not modify any BANZA
protocol specification, contract, or invariant.*
