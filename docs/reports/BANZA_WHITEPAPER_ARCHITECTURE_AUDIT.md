# BANZA Whitepaper v1.0 — Architecture Audit Report

> ⚠ **SUPERSEDED (motor de build).** O motor canónico de publicação dos PDFs do Whitepaper v1.0 é **LaTeX compilado com tectonic (xdvipdfmx)**, não Typst — ver `docs/whitepaper/BUILD.md`. O Typst é apenas um preview não canónico. Qualquer referência abaixo ao Typst como produtor das edições *publicadas* (ou a 10 páginas / hashes antigos) descreve um instantâneo de planeamento/lançamento anterior (pré-WP1.2) e é mantida apenas como registo histórico.


> **Status: COMPLETE.**
> **Deliverable:** WP1-FINAL — Architecture Audit for the *BANZA Whitepaper v1.0*.
> **Document class:** Non-normative engineering report. It records how the whitepaper's technical
> claims were grounded in the real repository; it introduces no MUST/SHALL and changes no protocol
> surface.
> **Language:** British/international English.
> **Grounding:** the six grounded audits in `docs/whitepaper/prep/audit/01..06-*.md`, the consolidated
> `docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md` (Canonical source list + Documented-Divergences
> register), the single-source content in `docs/whitepaper/content/{en,pt}.json`, the released artifacts
> under `docs/whitepaper/{pdf,manifest.json,CHECKSUMS.txt,CITATION.cff}`, the figures in
> `docs/whitepaper/figures/`, the web surface under `website/app/whitepaper/` and
> `website/components/whitepaper/`, and the home hero in `website/app/page.tsx`.

---

## 1. Purpose and scope

The *BANZA Whitepaper v1.0* is a foundational, scientific-technical, operator-neutral description of the
BANZA protocol: its system model, three-layer institutional architecture, canonical-origin discovery,
deterministic validation, evidence and receipts, and its security boundaries and limitations. Because the
paper is a **public, citable** document that makes concrete technical claims, every one of those claims
had to be traceable to a real artifact in the repository — an ADR, a governance document, a Rust engine, a
contract schema, an invariant statement, or a committed live-evidence report.

This report is the audit of that grounding exercise. It answers three questions:

1. **What did the whitepaper claim, and where did each claim come from?** (Sections 3–8.)
2. **Do those claims align with the code, schemas, contracts and ADRs as they actually exist today?**
   (Confirmed throughout; summarised in Section 9.)
3. **Where did the sources disagree with one another, and how was each disagreement handled editorially,
   without silently reconciling it?** (Section 10, divergences D-1…D-6.)

The audit was conducted under one binding constraint (the *WP1 rule*): **the whitepaper track authors
prose only.** It must not modify engines, contracts, `docs/reference/**`, or any M2.19 surface to make a
divergence disappear. Every divergence below is therefore a *documented* condition the paper writes
around — never a silent edit.

---

## 2. Method and evidence base

The grounding was performed in two passes.

**Pass 1 — six parallel grounded audits** (`docs/whitepaper/prep/audit/`), each covering one subsystem and
citing real files by repo-relative path plus line or section:

| Audit | File | Subsystem covered |
|---|---|---|
| 01 | `01-architecture-adrs.md` | Three-layer institutional model + full ADR corpus (001…069) + load-bearing separations |
| 02 | `02-engines-validation.md` | Rust decision engines + the endpoint-originated nine-step validation journey |
| 03 | `03-evidence-receipts-registry.md` | Evidence-bundle assembler, trust verifier, Technical Registry, onboarding/Candidate Registry |
| 04 | `04-contracts-profiles-invariants.md` | `contracts/**`, `spec/**`, invariant families, discovery/identity/key/revocation schemas, obsolete-term scan |
| 05 | `05-website-docarea-tooling.md` | Public website, documentation tree, licensing, PDF tooling |
| 06 | `06-institutional-oz-banzai-state.md` | Institutional identity, governance, Banzami affiliation, Operador Zero, BanzAI role, pre-production state |

**Pass 2 — consolidation into the Source Inventory** (`docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md`),
which fixes two things the whole paper depends on:

- **Part A — the canonical source list:** every ADR, governance document, invariant family, engine,
  contract/schema, the one permitted live-evidence report, and the author/licence sources the paper is
  *allowed* to draw on, each with a one-line relevance tag (**CORE / SUPP / PERIPH**).
- **Part B — the Documented-Divergences register:** every conflict the six audits surfaced (D-1…D-6),
  each recorded with the surfaces that disagree, which one the paper follows and why, and whether it blocks
  a central thesis — with **none reconciled silently**.

The single content source `docs/whitepaper/content/{en,pt}.json` drives both the PDF and the web editions,
so a claim grounded once is grounded in every rendering.

---

## 3. Three-layer institutional architecture (ADR-059…069)

**Claim in the paper.** BANZA is organised as three *distinct* institutional layers — **L1** the BANZA
Protocol (rules, contracts, profiles, verifiable mechanisms), **L2** Conformance & Interoperability
Certification (of an *implementation*), and **L3** Operational Schemes (with the Banzami Operational
Scheme as the first intended scheme) — with **BanzAI as a transversal interface, not a fourth layer and
not an authority**.

**Grounding.** Audit 01 establishes the one-sentence spine directly from ADR-059 and its canonical mirror
`docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md`, and confirms the boundary statement that BANZA is not
a bank, PSP, wallet, e-money institution or operator and holds/moves no funds. The layer set and each
load-bearing separation are grounded across the ADR-059…069 arc and the governance documents named in the
Source Inventory §A.2:

- ADR-059 — three-layer institutional architecture (the frame).
- ADR-060 / `BANZAMI_OPERATIONAL_SCHEME.md` — the L3 designated operator and scheme non-exclusivity
  ("BANZA ≠ Banzami").
- ADR-061 — **certification ≠ scheme admission ≠ regulatory authorisation** (three-way separation,
  non-propagation).
- ADR-062 / `BANZA_REGULATORY_CLAIM_POLICY.md` — the regulatory-state boundary and the Rust
  `RealMoneyActivationGate`; the Banzami L3 state is pinned `REGULATORY_AUTHORIZATION_IN_PROGRESS` with
  real money OFF.
- ADR-063 / `BANZA_SEPARATION_MATRIX.md` / `BANZA_CONFLICT_OF_INTEREST_POLICY.md` — the five
  infrastructure domains, eight key domains, and no-self-privilege controls.
- ADR-064…066 — the Layer-2 certification model, the Technical Registry, and the closed
  certification-state machine.
- ADR-067…069 — Operador Zero read-only reference, endpoint-originated validation with the
  operator↔implementation model, and simple/secure operator onboarding.

**Alignment.** Confirmed. The paper writes "Layer 1/2/3" for the institutional axis exclusively and never
uses it for the conformance-level axis (see terminology hazard T-1, Section 10). Figure 2
(`figures/fig2-three-layers.{en,pt}.svg`) renders the three layers with BanzAI shown transversally, using
shared geometry with only the text localised.

---

## 4. Deterministic engines and the nine-step validation journey (ADR-037, ADR-068)

**Claim in the paper.** Validation is *endpoint-originated* and *deterministic*: the protocol resolves a
target, fetches each artifact from the implementation's own public endpoints, runs a matching Rust/WASM
decision engine on the fetched content, and records receipts. **Rust executes and decides every verdict;
the language model only explains.**

**Grounding.** Audit 02 grounds the journey in a single orchestration file,
`services/banzai-api/src/validate.js`, whose header states the contract verbatim — *"Rust decides every
verdict … TypeScript never decides; it shuttles JSON … There is NO model call."* The canonical nine-step
spine is a Rust-named constant in that file. The Source Inventory §A.4 enumerates the on-journey engines
and confirms each is Rust per ADR-037 ("Rust-first official engines"):

- `banza-artifact-fetcher` — the only component that reaches operator public endpoints; SSRF-hardened.
- `banza-target-registry` — closed Technical Registry, resolution/eligibility, step-verdict mapping, and
  the Certification **Readiness** aggregate that **never returns `CERTIFIED`**.
- `banza-operator-manifest`, `banza-trust`, `banza-conformance`, `banza-l2-readiness`,
  `banza-l3-readiness`, `banza-evidence-bundle` — the per-step decision engines.

The separate `banza-certification` **authority** engine (ADR-064/065/066), which *can* emit `CERTIFIED`
through a closed six-state machine, is explicitly **off** the nine-step journey — a distinct authority
path, not part of the readiness flow.

**Alignment.** Confirmed. The "Rust decides, the model explains" claim maps to real engine boundaries, and
the "journey never certifies" claim is enforced by the readiness aggregate never returning `CERTIFIED`.
Figure 4 (`figures/fig4-validation-evidence.{en,pt}.svg`) depicts the fetch → decide → receipt flow. Two
disambiguations that the paper must maintain — journey *readiness* vs authority *certification* (T-2), and
"Level 0–4" engines vs "Layer 2" (T-1) — are handled in Section 10.

---

## 5. Evidence, receipts and the boundary flags (ADR-064)

**Claim in the paper.** The protocol produces **evidence and receipts**, not approvals. An evidence bundle
is a reproducible, independently checkable assembly of inputs — never a certificate; and receipts fix each
step's outcome without any model or external call.

**Grounding.** Audit 03 grounds this in `engines/banza-evidence-bundle/src/lib.rs`: every bundle carries
`not_a_certificate = true`, `not_an_approval = true`, `requires_conformance_evidence_review = true`,
`llm_calls = 0`, `external_model_called = false`, and readiness is computed in Rust with a fixed precedence
ladder. The contract side (Source Inventory §A.5) confirms it in the production schemas:

- `evidence-bundle.production.schema.json` — `not_a_certificate` const true; grants nothing on its own.
- `operation-receipt` / `journey-receipt.production.schema.json` — `qwen_calls` and
  `external_model_calls` **const 0**; the journey's `certification_status` **const `NOT_CERTIFIED`** and
  `certified` **const false**.
- `certification-record.production.schema.json` — the L2 verdict, bound to
  `implementation_hash` + profile + scope + validity + `record_hash`; explicitly **not** a licence,
  admission or authorisation.

**Alignment.** Confirmed. The paper describes L2 output as a **per-implementation `CertificationRecord`**
and never as an "emitted certificate table" — a point that also resolves divergence D-4 (Section 10). The
one live end-to-end evidence source the paper cites is the M2.19G.3A closure report (Source Inventory
§A.6), which records a real Operador Zero nine-step run ending honestly in `FAILED` /
`NOT_CERTIFIED` / readiness `BLOCKED`, with `external_model_calls = 0` and `qwen_calls = 0`, and no write
to the Technical Registry (`/operators` stayed `[]`). The paper cites only the technical outcome, omitting
infrastructure and deployment specifics.

---

## 6. Technical Registry and canonical-origin discovery (ADR-065, ADR-068)

**Claim in the paper.** Discovery is anchored to a **canonical origin**: the closed **BANZA Technical
Registry** resolves a validation target to its canonical public origin, and every artifact is then fetched
from that origin through the secure Rust fetcher. Registry listing is an index of eligible *targets*, not
a trust anchor.

**Grounding.** Source Inventory §A.5 grounds discovery in
`discovery-document.production.schema.json` (endpoints host-bound to the canonical origin) and the
`operator-record` / `implementation-record` schemas (operator entity ≠ implementation system; presence ≠
admission; `environment` sandbox|demo only). Audit 03 grounds the closed Technical Registry in
`banza-target-registry`, which feeds the public read-only `/operators` surface. The paper carefully
separates the three registry surfaces it could otherwise conflate (terminology hazard T-3): the closed
**Technical Registry**, the **Public Protocol Registry** anchor referenced by INV-FEDEVAL-008, and the
**private Candidate Registry** used by onboarding.

**Alignment.** Confirmed, with two scoped precision requirements handled editorially: the single hardcoded
reference origin (`zero.banza.network`) is framed as an *example* target, not a privileged trust position
(D-5); and "registry listing is not a trust check" is stated with explicit reference to *which* registry
and *which* evaluation each time (D-6). Both are in Section 10. Figure 3
(`figures/fig3-canonical-origin.{en,pt}.svg`) illustrates canonical-origin discovery.

---

## 7. Canonical trust root — Model A (ADR-038, ADR-058)

**Claim in the paper.** Trust is **CA-less**. There is no certificate authority and no certificate chain.
An offline, threshold-custodied **Trust Root** anchors a small set of delegated domain keys; the root
**signs nothing about any operator**; revocation is fail-closed. The paper describes the anchor at the
**invariant level** and adopts the **Key Manifest model (Model A)**.

**Grounding.** Audit 04 and the Source Inventory §A.3 ground this on `contracts/invariants.json` as the
declared single source of truth (its own precedence rule: where prose or a schema disagrees, the registry's
statement plus cited source govern). The load-bearing invariants are:

- **INV-ROOT-004** — the root key signs *only* Key Manifests; never protocol metadata, conformance
  evidence, or revocation lists directly.
- **INV-ROOT-005** — the Banzai Revocation List is signed by the designated revocation-domain
  (delegated) key.
- **INV-OTE-007 / INV-OTE-009** — no BANZA-issued artifact about an operator is an input to the Open Trust
  Evaluation; the root signs nothing about operators.
- **INV-OTE-\*** (ADR-038) — Open Trust Evaluation without a CA.
- **INV-FEDEVAL-\*** (ADR-040) — ten conjunctive, locally-executed, fail-closed federation checks;
  registry listing is *not* a check (INV-FEDEVAL-008).

ADR-058 realigned the trust-invariant registry, retiring the `INV-TRUST-*` family into
`INV-OTE-*` / `INV-FEDEVAL-*` / `INV-ROOT-*` and removing the operator-certificate residue.

**Alignment.** Confirmed at the invariant level. The one place the surfaces genuinely disagree — *which
objects the root signs directly* — is divergence D-1, the single HIGH-severity item, handled in Section 10.
The paper's four trust theses (CA-less trust; threshold-custodied offline root; root never signs anything
*about* an operator; fail-closed revocation) hold identically under both signing models, so the paper
states the invariant-level claim and flags the schema-level reconciliation as owed to the contracts track.

---

## 8. Public surface, editions and provenance

**Home hero (additive, zero redesign).** `website/app/page.tsx` gained a single additive secondary,
outlined call-to-action, **"Ler o Whitepaper" → `/whitepaper`**, placed beside the **unchanged** primary
**"Validar operador no BanzAI" → `/banzai?mode=validation`**. The eyebrow, title, paragraph, indicators,
illustration, header and footer are unchanged; on desktop the two CTAs share a line, and on mobile they
stack with the primary first.

**Web routes.** `/whitepaper`, `/whitepaper/en`, `/whitepaper/pt`, and `/whitepaper/versions` are served
from `website/app/whitepaper/` via the shared `website/components/whitepaper/WhitepaperEdition.tsx` island,
carrying `ScholarlyArticle` JSON-LD, `hreflang` (`en` / `pt` / `x-default`) and Highwire `citation_*`
meta; all four prerender static.

**Editions and provenance.** Both editions build to **exactly 10 A4 pages** through a pinned Typst 0.12.0
pipeline (`tools/whitepaper-build.sh`) with bundled fonts embedded and selectable text, from the single
source `docs/whitepaper/content/{en,pt}.json`. The paper carries **four monochrome, mechanism-first
figures** (shared geometry, text-only localisation), **three compact system-model equations**, an EN body
of roughly 2.95k words with a structurally equivalent PT edition, and **18 references, all web-verified
against primary sources** (ISO/IETF/W3C/NIST/ACM/IEEE/publishers) with no invented DOI/ISBN/ISSN. Released
provenance is fixed in `manifest.json` and `CHECKSUMS.txt`:

| Edition | SHA-256 |
|---|---|
| EN | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` |
| PT | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |

**Identity, licence and version.** Titles carry the `BANZA:` prefix in both languages — EN (official translation)
*"BANZA: An Open Protocol for Financial Interoperability"*; PT (canonical) *"BANZA:
Protocolo Aberto de Interoperabilidade Financeira"*. Authors, in locked order, are **Fidel
R. Monteiro** and **Jesus R. Monteiro**, co-founders of Banzami, affiliated to *BANZAMI – Tecnologia e
Serviços, Lda.*, published by Banzami; there is no equal-contribution note, corresponding author, or
ORCID (`manifest.json`, `CITATION.cff`, `docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`).
The document is version **1.0**, dated **August 2026**, tagged **`banza-whitepaper-v1.0`**, licensed
**CC BY 4.0**, and **non-normative**.

**Guardrails.** `tools/check-banza-whitepaper.sh` (nine checks) and its CI job PASS, and `make
identity-check` exits 0 under a scoped Banzami attribution allowlist — the paper carries no forbidden
commercial-operator brand as a protocol dependency.

---

## 9. Alignment summary

Across all six subsystems the whitepaper's technical claims align with the repository as it exists today:

- **Architecture** — the three institutional layers and every load-bearing separation are grounded in
  ADR-059…069 and the governance mirrors, not in prose alone.
- **Engines** — "Rust decides, the model explains" maps to the real Rust/WASM engines invoked by the
  endpoint-originated journey; the journey never certifies.
- **Evidence/receipts** — the boundary flags (`not_a_certificate`, `qwen_calls`/`external_model_calls` =
  0, `certified` = false, `NOT_CERTIFIED`) are const-enforced in the production schemas and the engine
  output.
- **Registry/discovery** — canonical-origin discovery and the closed Technical Registry match the schemas
  and `banza-target-registry`, with the three registry surfaces kept distinct.
- **Trust** — the CA-less, offline, threshold-custodied trust root is grounded on the invariant registry
  (Model A), the declared single source of truth.
- **Boundaries** — BANZA is not a bank/PSP/wallet/operator and moves no funds; certification ≠ admission ≠
  authorisation; BanzAI is transversal, not an authority; Operador Zero is a sandbox reference
  (`NOT_CERTIFIED`, no real funds); the system is pre-production (0 production operators, 0 production
  certificates, `/operators = []`). No regulatory or real-funds claim appears anywhere in the paper.

**Net position:** no divergence blocks a central thesis. The remaining work is editorial precision (D-1,
D-6) and source selection (D-2, D-4), with two cosmetic/informational items (D-3, D-5).

---

## 10. Documented divergences (D-1…D-6) and their editorial handling

Two terminology hazards frame the register. They are **token overloads**, not contradictions, and the
paper resolves them by *naming*, never by choosing a "correct" surface:

- **T-1 — "L1/L2/L3" means two things.** Institutional **Layers** (ADR-059) vs conformance **Levels**
  L0–L4 (ADR-021/038, also the `banza-lN-readiness` engine names). *Convention:* "Layer 1/2/3" for the
  institutional axis, "Level 0–4 / L0–L4" for the conformance axis; the interoperability step uses the
  **Level-2 payment-flow engine**, never "Layer 2 = Certification".
- **T-2 — "certification" means two things.** Step-9 Certification **Readiness** (`banza-target-registry`,
  never `CERTIFIED`) vs the `banza-certification` **authority** engine (can emit `CERTIFIED`).
  *Convention:* the nine-step journey produces *readiness*; the authority engine issues *records*; the
  journey never certifies.
- **T-3 — "registry" names three surfaces.** Closed **Technical Registry** vs **Public Protocol Registry**
  anchor vs private **Candidate Registry**. *Convention:* always name which one.

| ID | Divergence | Severity | Which the paper follows | Editorial handling | Blocks a thesis? |
|---|---|---|---|---|---|
| **D-1** | Trust-root "who signs what": Model A (root signs only Key Manifests) vs Model B (production schemas: root signs four object classes directly) | HIGH | **Model A** — the invariant registry (INV-ROOT-004/005, INV-OTE-009) is the declared single source of truth with its own precedence rule | Paper states the anchor at the **invariant level** (CA-less; delegated keys sign metadata/evidence/BRL; root signs nothing about operators; threshold custody) and does **not** assert a single mechanistic "who signs what" that depends on Model B; the schema-level Model-A/B reconciliation is flagged as owed to the contracts/engines track. WP1 changes no schema. | No — narrows to a mechanistic sub-claim |
| **D-2** | The canonical Reference (`docs/reference/**`) and `spec/overview.md` predate the three-layer model (M2.19B; no "three-layer / scheme / Technical Registry" vocab) | MEDIUM | **ADRs + governance docs + production contracts**, not the Reference chapters | All three-layer / L2-certification / L3-scheme material is sourced from ADR-059…069, the governance mirrors, and the production contracts; the Reference is still cited for the payment/invariant/trust-primitive material it *does* cover; `spec/overview.md`'s "5 conceptual layers"/"4-layer signature hierarchy" is **not** cited as the institutional architecture. A sourcing constraint, not a gap. WP1 does not edit the Reference. | No |
| **D-3** | Retired "BANZA CA" strings survive in two `Cargo.toml` `description` fields (`banza-evidence-bundle`, `banza-l1-readiness`) | LOW | The corrected **open-trust model (no CA)** | Paper does not quote either description and describes no "BANZA CA review"; the strings are package metadata with no decision weight (the engines' own `lib.rs`, receipts and output are correctly CA-free). Flagged for a separate engines-track metadata cleanup; WP1 edits no Cargo file. | No — cosmetic build metadata |
| **D-4** | Stale `certificates` table listed as public-registry content at `docs/reference/pt/completa.md:685`; ADR-058 removed that table (absent from the live schema) | MEDIUM | **ADR-058 + the live schema + the per-implementation model** | Paper describes L2 output as a **per-implementation `CertificationRecord` in the Technical Registry**, never an "emitted certificate table"; `production_certificates = false` baseline stated honestly. Documented for a reference-track correction; WP1 does not edit the Reference. | No |
| **D-5** | `REFERENCE_ORIGIN` hardcoded to `zero.banza.network`; the closed registry ships exactly one target at v1.0 | INFORMATIONAL | The code's own framing: a **reference/sandbox example origin**, not a privileged trust anchor | Paper frames `zero.banza.network` as the single sandbox reference target the closed registry ships today (`/operators = []`, `production_certificates = false`), resolved and fetched through the identical secure path as any future implementation — consistent with, and supportive of, operator-neutrality. WP1 changes no code. | No — supports neutrality when framed |
| **D-6** | The active-model trust evaluator computes `registry_ok` from the operator's self-published entry (`TRUST_MISSING_REGISTRY_ENTRY`), while INV-FEDEVAL-008 / INV-OTE-007 say "registry listing is not a check / no BANZA-issued artifact is an input" | MEDIUM | The **invariants**, stated with explicit disambiguation | Paper states "registry listing is not a trust check; no BANZA-issued artifact is an input" and specifies each time *which* registry and *which* evaluation: the checked entry is the operator's own self-published artifact bound by `operator_id` (not a BANZA-issued verdict); INV-FEDEVAL-008 governs ADR-040 federation routing, a path distinct from the active-model trust evaluator; and the live endpoint-originated journey does not populate `public_registry_entry`, so the trust step degrades to `PENDING` rather than converting "listed" into "trusted". No blanket "a registry entry is never consulted" claim is made. WP1 changes no engine. | No if disambiguated; would block only if claimed as a blanket rule |

**Register conclusion.** No divergence blocks a central thesis of the whitepaper. D-1 and D-6 require the
paper to make *scoped, precise* claims rather than blanket mechanistic ones; D-2 and D-4 are
sourcing/staleness constraints handled by choosing authoritative sources; D-3 and D-5 are
cosmetic/informational. In every case WP1 authored prose around the condition and modified **no** engine,
contract, Reference, or M2.19 surface.

---

## 11. Conclusion

The *BANZA Whitepaper v1.0* is fully grounded. Each technical claim — the three-layer institutional
architecture, the deterministic Rust engines and the endpoint-originated nine-step validation journey, the
evidence-and-receipts model with its const-enforced boundary flags, the Technical Registry with
canonical-origin discovery, and the CA-less canonical trust root under Model A — traces to a real ADR,
governance document, invariant, engine, contract schema, or committed live-evidence report, as catalogued
in the Source Inventory and the six prep audits. The six documented divergences were handled editorially,
each recorded and written around rather than silently reconciled, and none blocks a central thesis. The
released editions are provenance-fixed by SHA-256, guarded in CI, and consistent with the pre-production,
operator-neutral posture the protocol maintains.

**Status: COMPLETE.**

---

*Non-normative report. Prepared for the BANZA Whitepaper v1.0 (WP1-FINAL). Grounded in
`docs/whitepaper/prep/audit/01..06-*.md`, `docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md`, the
committed whitepaper artifacts under `docs/whitepaper/`, and the public surface under `website/`.*
