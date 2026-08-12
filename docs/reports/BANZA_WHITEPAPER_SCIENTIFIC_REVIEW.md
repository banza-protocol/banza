# BANZA Whitepaper v1.0 — Scientific Review

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


> **Status: COMPLETE**
> **Subject.** BANZA Whitepaper v1.0 (WP1-FINAL) — official English translation and canonical Portuguese
> edition.
> **Document type.** Non-normative scientific review report. It assesses the Whitepaper as a *foundational,
> citable reference document*. It does not modify any protocol invariant, contract, specification or public
> surface, and it defines no `MUST`/`SHALL` of its own.
> **Date.** 2026-07-30. **British/international English.**
> **Grounding.** Read against the committed artifacts under `docs/whitepaper/` (content, manifest, checksums,
> figures, prep) and the public web surface under `website/app/whitepaper/`, `website/components/whitepaper/`
> and `website/app/page.tsx`. All facts below are drawn from those artifacts; nothing is fabricated.

---

## 0. Summary judgement

The BANZA Whitepaper v1.0 is a **well-scoped foundational paper**. It states a clear problem, makes a
bounded and defensible contribution, and gives that contribution a stable, quotable anchor (title, authors,
publisher, edition, licence) that later work can cite. It carries a compact formal model, an honest
related-work positioning, explicit assumptions and limitations, and a reproducibility posture grounded in
hash-bound artifacts rather than in narrative assurance.

Critically for a scientific review, the Whitepaper is **candid about what it is not**: it makes **no claim of
peer review, journal acceptance, DOI, ISBN, ISSN or regulatory authorisation**, and it avoids the family of
over-claim superlatives. It is a *reference to be cited*, not an experimental result to be believed. The
research programme that would carry empirical claims is deliberately deferred to follow-on articles, and the
repository records that deferral explicitly in the Scientific Publication Readiness prep artifact
(`docs/whitepaper/prep/WHITEPAPER_SCIENTIFIC_PUBLICATION_READINESS.md`).

**This review confirms the Whitepaper is foundational and non-normative, and that it makes no
peer-review / DOI / journal / regulatory claim.**

---

## 1. Bibliographic identity (as reviewed)

| Field | Value |
|---|---|
| Official title (EN) | *BANZA: An Open Protocol for Financial Interoperability* |
| Canonical title (PT) | *BANZA: Protocolo Aberto de Interoperabilidade Financeira* |
| Authors (locked order) | Fidel R. Monteiro (Fidel Rodrigues Monteiro); Jesus R. Monteiro (Jesus Rodrigues Monteiro) |
| Author relation | Co-founders of Banzami |
| Affiliation / Publisher | Banzami — BANZAMI – Tecnologia e Serviços, Lda. |
| Version / Date | 1.0 / August 2026 |
| Licence | CC BY 4.0 |
| Genre | Non-normative foundational whitepaper |
| Editions | Official English translation + canonical Portuguese edition, published simultaneously; both carry the `BANZA:` title prefix |
| Extent | Each edition builds to exactly 10 A4 pages (pinned Typst 0.12.0 pipeline, bundled embedded fonts, selectable text) |
| Figures | 4 monochrome, mechanism-first figures; shared geometry, text localised per language |
| Equations | 4 (one complexity equation in §1; three system-model) |
| Body length | EN body ≈ 2.95k words; PT structurally equivalent (shape-equality asserted across the two editions) |
| References | 8, all verified against primary sources (ISO / IETF / W3C / NIST / ACM / IEEE / publishers) and cited inline |
| Released PDF SHA-256 | EN `56c38656…02f54dc`; PT `48247062…dee540` (see `docs/whitepaper/manifest.json`, `CHECKSUMS.txt`) |

There is **no** equal-contribution note, **no** corresponding-author designation and **no** ORCID — the
authorship model is a simple locked two-author order, consistent with the Author and Affiliation Record.
Tools that appear in the system (including BanzAI) are **components, never authors**.

The single content source (`docs/whitepaper/content/<lang>.json`) drives both the PDF and the web renderings,
so the reviewed prose, equations, figures and references are identical across the two surfaces by
construction.

---

## 2. Problem

The Whitepaper opens on a concrete, well-motivated problem. Independent financial operators increasingly
need to interoperate, yet interoperability is typically achieved through **closed, bilateral integrations**
negotiated separately for each pair of operators. The abstract names the failure modes of that approach
precisely:

- the number of private integrations grows **quadratically** with the number of operators;
- each integration is validated **privately and opaquely**;
- results are **hard to reproduce**; and
- no **uniform, checkable evidence of correctness** is produced.

This is a legitimate scientific-technical problem statement: it identifies a scaling pathology (pairwise
contracts), an epistemic pathology (private, non-reproducible validation) and a missing artifact (uniform
verifiable evidence). It is framed at the level of *protocol and evidence*, not of any product or operator,
which keeps the problem operator-neutral from the first paragraph.

---

## 3. Contribution

The stated contribution is bounded and matches the problem. BANZA replaces pairwise integration with a
**common language**:

1. **Public rules** expressed as versioned profiles and contracts.
2. **Demonstrable conformance** evaluated by **deterministic engines**.
3. **Verifiable evidence** bound to the inputs that produced it.

The mechanism is described end-to-end: an implementation publishes signed artifacts from a **canonical
origin**; deterministic engines retrieve those artifacts over a **hardened, server-side path**; the engines
evaluate them against a stated protocol version and profile; and they emit **receipts** that bind each result
to the observed inputs, hashes, engine version and reason codes. The paper then lays out the system model,
the three-layer architecture, the canonical-origin discovery and identity model, the nine-step validation
sequence, and the evidence and trust model.

The contribution is **architectural and definitional**, not empirical. The Whitepaper poses the thesis —
open, verifiable financial interoperability governed by public rules and reproducible evidence, without a
central certificate authority — and describes the machinery that instantiates it. It does **not** claim to
have measured that the machinery outperforms alternatives; that is correctly left to future work (see §8).

---

## 4. Compact formal model

The paper carries a deliberately small formal core. Beyond the §1 complexity comparison (Equation 1), three system-model equations (numbered (2)–(4)) fix the objects a verdict is *about*
and thereby make scope explicit rather than implied.

**Equation (2) — implementation tuple.**

```
I = (o, i, v, p, e, u)
```

An implementation is modelled as a six-tuple: `o` the operator, `i` the implementation, `v` the protocol
version, `p` the conformance profile, `e` the environment, and `u` the canonical origin. This encodes the
load-bearing **operator ≠ implementation** distinction directly in the notation: one operator `o` may publish
several implementations `i`, and every result applies only to a specified implementation under a specified
profile, version and environment.

**Equation (3) — observed artifact set.**

```
A(I) = { a_1, a_2, …, a_n }
```

The artifacts observed at the canonical origin `u` of implementation `I` form a finite set. This is the
measurable input surface: validation reasons only over what is actually published and retrieved, not over
claims made about the operator.

**Equation (4) — validation map.**

```
V_m(A(I), S_{v,p}) → (R, E, P)
```

Validation `V_m` takes the observed artifact set and the applicable specification `S` for version `v` and
profile `p`, and produces a verdict `R`, evidence `E` and a set of receipts `P`. Two properties fall directly
out of this model and are stated in the paper:

- **Explicit scope.** A result declares the profile it was measured against, the protocol version it assumed,
  the environment it ran in and the evidence it consumed, and it is valid **only for that combination**.
- **Reproducibility as a first-class property.** Given equivalent canonical inputs, the same applicable
  specification and the same engine version, independent executions should produce **semantically equivalent
  verdicts and reason codes**. Non-deterministic metadata (e.g. execution timestamps) is excluded from what
  must match.

This is the right altitude for a ten-page foundational paper: the model is compact, it is faithful to the
implemented engines, and it makes the paper's central invariants (scope-boundedness, reproducibility) legible
without pretending to a full formalisation or proof apparatus.

---

## 5. Related-work positioning

The Whitepaper positions BANZA against the relevant standards and trust literature honestly, and — as a
foundational anchor — carries a *slim positioning* rather than a survey. The 18 references, all verified
against primary sources, span the correct neighbourhoods: financial message standards (ISO 20022, ISO 8583),
QR payment specifications (EMV QRCPS), conformance-testing methodology (ISO/IEC 9646-1), decentralized
identifiers and verifiable credentials (W3C DID / VC), cryptographic primitives and canonicalisation (FIPS
180-4, EdDSA / RFC 8032, HMAC / RFC 2104, JCS / RFC 8785, TLS 1.3 / RFC 8446), PKI and time-stamping (RFC
5280, RFC 3161), well-known URIs (RFC 8615), and foundational computer-science works (Merkle 1980, Shamir
1979, Nakamoto 2008, Peng 2011 on reproducible research).

The positioning is stated as *difference of scope*, never as a superiority claim:

- Against **financial message standards** (ISO 20022 / ISO 8583): BANZA is a protocol-plus-conformance layer,
  **not** a wire-format body or a clearing network; it defines its own contract schemas and financial
  invariants rather than claiming adoption of ISO message formats.
- Against **certificate-authority PKI** (X.509 / RFC 5280): BANZA uses an **Open Trust Evaluation** model with
  **no CA, no operator certificate and no certificate chain**; trust is derived locally by each party from
  root-signed protocol metadata plus published conformance evidence, with fail-closed revocation. This is
  presented as a *different trust-distribution model* — rooted and threshold-based, **not** "trustless".
- Against **open-banking / access-to-account regimes** and **transparency-log / directory** designs: framed as
  adjacent but distinct in purpose.

The related-work prep artifacts (`WHITEPAPER_RELATED_WORK_MATRIX.md`, `WHITEPAPER_REFERENCES.bib`) show a
deeper comparison exists behind the paper; the ten pages carry the compressed form, and the deeper survey is
correctly deferred (§8).

---

## 6. Assumptions

The Whitepaper's assumptions are explicit and internally consistent. The load-bearing ones a reader should
carry are:

- **Canonical origin.** An implementation publishes its artifacts from a single canonical origin `u`, and
  discovery / identity are anchored there. Validation reasons only over artifacts retrieved from that origin.
- **Deterministic decision.** The engines that decide verdicts are deterministic — their cores use no clock,
  network or randomness — so verdicts and reason codes are a pure function of the observed inputs and the
  applicable specification. This grounds the reproducibility property in Equation (3).
- **Rust decides; the model explains.** Verdicts are produced by the Rust engines; the local model only
  produces explanatory prose, once, and never on the decision path. No result is attributable to a model
  call.
- **Rooted, CA-less trust.** Trust is rooted in signed protocol metadata and evaluated locally; no BANZA-issued
  artifact about an operator, and no human decision, is an input to the trust evaluation. The model is
  CA-*less*, not trust-*less*.
- **Fail-closed behaviour.** Missing or malformed inputs resolve to a non-passing outcome rather than a false
  positive.

These assumptions are stated as properties of the described system, not as universal claims, which keeps them
falsifiable by future study rather than rhetorical.

---

## 7. Limitations (stated explicitly)

The paper states its security boundaries and current limitations openly, and the review confirms they are
carried honestly rather than minimised:

- **Pre-production state.** The protocol and the reference implementation remain in pre-production. The public
  honest baseline is zero production operators and zero production certificates (`/operators = []`,
  `production_certificates = false`); the operational layer is in **regulatory preparation** and real-money
  activity is disabled by a fail-closed gate.
- **Not a financial institution.** BANZA is an interoperability protocol — **not a bank, payment operator,
  wallet, e-money institution or settlement system**. It holds no accounts, moves and settles no funds,
  issues no licences, and replaces neither a regulator nor a scheme.
- **Certification is bounded.** Technical certification is **per-implementation** and scoped to
  profile + version + environment + scope + evidence + validity; it is **not** a CA signature, carries **no
  certificate chain**, and is explicitly distinct from scheme admission and from regulatory authorisation —
  none of the three implies, grants or propagates to another.
- **BanzAI is transversal.** BanzAI is a transversal human interface across the layers — **not a fourth
  layer, not an authority, not a certifier**. Rust decides; the model explains.
- **Operador Zero is a sandbox.** Operador Zero is a read-only, demo reference implementation using a demo
  currency with no real funds; it is `NOT_CERTIFIED` and pre-production, and is never presented as a
  production operator.
- **Single-implementation external validity.** The clearest scientific limitation for future empirical work
  (surfaced in the readiness prep) is that cross-implementation interoperability is presently demonstrable
  only against a simulator, because there is not yet a second independent published implementation. The
  Whitepaper does not over-reach past this.

The Source Inventory prep artifact additionally records a set of documented divergences (D-1..D-6) — most
notably the trust-root "who signs what" description (D-1, resolved editorially by grounding the paper's claim
on the invariant registry, "Model A") and the fact that some canonical Reference chapters predate the
three-layer model (three-layer material is therefore sourced from the governing ADRs and governance docs, not
those older chapters). These were handled **editorially in the prose**, without silently changing any engine,
contract or reference surface — the correct discipline for a whitepaper track.

---

## 8. Reproducibility

Reproducibility is treated as a first-class property at two levels.

**Of the described protocol.** Equation (3) and the deterministic-engine assumption make reproducibility a
stated property of validation: equivalent canonical inputs plus the same applicable specification plus the
same engine version should yield semantically equivalent verdicts and reason codes, with non-deterministic
metadata excluded from the match. Results are hash-bound — receipts bind each verdict to the observed inputs,
their hashes, the engine version and closed reason codes, and evidence bundles are SHA-256 hash-bound and
independently checkable.

**Of the document itself.** The Whitepaper is reproducible as an artifact. Both editions build to exactly 10
A4 pages via a **pinned Typst 0.12.0 pipeline** (`tools/whitepaper-build.sh`) with bundled embedded fonts and
selectable text; a single content source drives PDF and web; and the released PDFs are pinned by SHA-256 in
`docs/whitepaper/manifest.json` and `docs/whitepaper/CHECKSUMS.txt` (EN `91e9d6b8…6195ed`, PT
`230c85fd…a5be79`). A dedicated guard (`tools/check-banza-whitepaper.sh`, nine checks) plus a CI job enforce
these properties, and `make identity-check` passes (exit 0, with a scoped Banzami allowlist), confirming the
operator-neutral constraint holds across the surface.

A *formal empirical* reproduction package (pinned container image, dataset snapshot, run scripts, archived
identifier) is **out of scope for the ten pages by design** and is deferred to a future empirical article;
the readiness prep records exactly which ingredients already exist (hash-bound evidence bundles, pinned engine
tool versions, conformance vectors as an input snapshot, deterministic engine cores) for that future package.

---

## 9. Absence of over-claims (confirmed)

The review confirms the Whitepaper avoids over-claiming, on two independent axes.

**No forbidden superlatives.** The paper does not describe itself or the protocol as *first*, *only*,
*revolutionary*, *unprecedented*, *fully-decentralised*, *trustless*, *guaranteed*, *regulator-approved*,
*production-proven* or *real-funds-handling*. The trust model is explicitly rooted and threshold-based ("no
CA" ≠ "no trust"), and interoperability is framed against a candidly stated single-implementation limitation
rather than asserted as demonstrated at scale.

**No scientific-status inflation.** The Whitepaper makes **no claim** of:

- **peer review**, **journal acceptance**, or publication as a **refereed article**;
- a **DOI, ISBN or ISSN** — none exists and none is invented;
- **regulatory authorisation** of any kind — the operational layer is in regulatory preparation and
  real-money activity is disabled.

Publishing this Whitepaper is an act of *making a citable reference available*, not of asserting a
peer-reviewed finding. The recommended citation string is a plain edition citation ("Version 1.0. Banzami,
2026."), carrying no fabricated identifier. This is the correct and honest posture for a foundational
document.

---

## 10. Non-normative and foundational — confirmation

The Whitepaper is **non-normative** and **foundational**, and this review confirms both:

- It defines **no** `MUST`/`SHALL` of its own. Where it states a normative rule, it does so only by restating
  the canonical sources; the normative sources of truth remain `contracts/`, `conformance/`, `spec/` and the
  ADR corpus. The manifest records `"normative": false`, and the content source records
  `normative: false` with status "Pre-production. Non-normative foundational document."
- It is a **citable spine**, not a research programme: it carries the purpose, the three-layer model, the
  invariant families (named and cited), the trust and certification models (described), and the honest
  pre-production state, and it defers every experimental, quantitative and survey-grade element to future
  citing articles.

---

## 11. Web and home-surface integration (as reviewed)

The Whitepaper is exposed on the public site without disturbing the existing home surface:

- **Routes.** `/whitepaper`, `/whitepaper/en`, `/whitepaper/pt` and `/whitepaper/versions`, each carrying
  `ScholarlyArticle` JSON-LD, `hreflang` (`en` / `pt` / `x-default`) and Highwire `citation_*` meta; the next
  build is clean and all four routes prerender static.
- **Home hero.** An additive **secondary, outlined** call-to-action, "Ler o Whitepaper" → `/whitepaper`, sits
  beside the **unchanged** primary "Validar operador no BanzAI" → `/banzai?mode=validation`. On desktop the two
  CTAs share a line; on mobile they stack with the primary first. The eyebrow, title, paragraph, indicators,
  illustration, header and footer are unchanged — a zero-redesign, additive integration.

This surfacing is consistent with the paper's genre: the Whitepaper is offered as a reference to read, and the
primary validation action remains the operator-validation flow.

---

## 12. Pointer to the Scientific Publication Readiness prep artifact

Everything a *future* article must carry — and must not cram into the ten pages — is catalogued in
`docs/whitepaper/prep/WHITEPAPER_SCIENTIFIC_PUBLICATION_READINESS.md`. That artifact fixes the Whitepaper's
genre (foundational, citable — not an experimental article), records the invariant-preservation contract that
every derived article inherits (the three L1/L2/L3 axes; the two meanings of "certification"; the three
distinct "registry" surfaces; operator ≠ implementation), inventories the pre-existing repository assets a
study can build on (deterministic engines, the nine-step journey, the SSRF-hardened fetcher, conformance
vectors, production contracts, receipts, evidence bundles, the invariant registry, Operador Zero, the peer
simulator), and maps the deferred research programme item by item: research questions, hypotheses, deeper
related work, methodology, datasets, benchmarks (determinism/reproducibility, latency, cross-implementation
interoperability), experimental implementation, quantitative analysis, threats to validity, reproduction
packages and — where a study warrants it — an ethics statement.

A future empirical article is a **separate work that cites this Whitepaper**; it is that article, not the
Whitepaper, that must satisfy peer review, reproduction and the full experimental apparatus. The readiness
artifact is the register of that boundary. The related supporting prep artifacts —
`WHITEPAPER_CHARTER.md`, `WHITEPAPER_DETAILED_OUTLINE.md`, `WHITEPAPER_BILINGUAL_GLOSSARY.md`,
`WHITEPAPER_CLAIM_EVIDENCE_MATRIX.md`, `WHITEPAPER_SOURCE_INVENTORY.md` (with the D-1..D-6 divergence
register), `WHITEPAPER_RELATED_WORK_MATRIX.md`, `WHITEPAPER_REFERENCES.bib`,
`WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md` and `WHITEPAPER_FIGURE_SPECIFICATION.md` — provide the evidence
trail behind the reviewed claims.

---

## 13. Review conclusion

The BANZA Whitepaper v1.0 is a sound, honest and well-bounded foundational paper. It states a real problem,
makes a matching architectural contribution, carries a compact and faithful formal model, positions itself
correctly against the standards and trust literature, and is explicit about its assumptions and limitations.
It is reproducible both as a described protocol (deterministic engines, hash-bound evidence) and as a document
(pinned build, checksummed PDFs, enforced by a guard and CI). It is **non-normative and foundational**, and it
**makes no peer-review, DOI, journal or regulatory claim**. The research programme that would carry empirical
claims is deliberately and transparently deferred to future citing articles, with the readiness prep artifact
serving as the register of what those articles must provide.

---

*Non-normative review report. Grounded in the committed artifacts under `docs/whitepaper/` and the public web
surface under `website/app/whitepaper/`, `website/components/whitepaper/` and `website/app/page.tsx`, verified
against the working tree on 2026-07-30. This report asserts no peer-review, DOI, ISBN, ISSN or regulatory
status, and changes no invariant, contract or public surface.*
