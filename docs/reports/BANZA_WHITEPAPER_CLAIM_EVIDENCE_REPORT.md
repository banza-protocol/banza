# BANZA Whitepaper v1.0 — Claim-Evidence Report

**Status: COMPLETE**

**Document under report:** BANZA Whitepaper v1.0 (WP1-FINAL)
**Release tag:** `banza-whitepaper-v1.0`
**Report type:** Non-normative programme report (British/international English)
**Date:** August 2026

---

## 1. Purpose

This report records the evidentiary basis of the BANZA Whitepaper v1.0. It summarises the
claim → evidence matrix that governed the drafting pass, the explicit boundary claims the paper is
required to carry, and the resolution of every MUST-FIX item raised during preparation — including the
trust-root signing wording, which adopts the canonical **Model A**.

The controlling result is simple and is stated plainly here: **no unsupported material claim shipped in
v1.0.** Every material claim in the published editions is either grounded in a real BANZA source or is
declared as a scoped limitation.

The Whitepaper is itself **non-normative**. It defines no MUST/SHALL of its own; where it states a
requirement it does so only when quoting the protocol Reference. This report is likewise non-normative and
does not create protocol obligations.

---

## 2. The published document (identity of the thing being evidenced)

Both editions are published simultaneously; the Portuguese edition is canonical and the English edition is
the official translation.

| Attribute | Value |
|---|---|
| Title (EN, official translation) | *BANZA: An Open Protocol for Financial Interoperability* |
| Title (PT, canonical) | *BANZA: Protocolo Aberto de Interoperabilidade Financeira* |
| Authors (order locked) | Fidel R. Monteiro (Fidel Rodrigues Monteiro); Jesus R. Monteiro (Jesus Rodrigues Monteiro) |
| Author relation | Co-founders of Banzami |
| Affiliation / publisher | Banzami — BANZAMI – Tecnologia e Serviços, Lda. |
| Licence | CC BY 4.0 (documentation) |
| Version / date | 1.0 / August 2026 |
| Length | Exactly 10 A4 pages per edition |
| Figures | 4 monochrome, mechanism-first (shared geometry; only text localised) |
| Equations | 3 compact system-model equations |
| Body length | EN ~2.95k words; PT structurally equivalent (shape-equality asserted) |
| References | 18, all web-verified against primary sources; no invented DOI/ISBN/ISSN |

Both editions build to exactly ten pages through a single pinned build pipeline (Typst 0.12.0), with
bundled fonts embedded and selectable text. A single localised source
(`docs/whitepaper/content/<lang>.json`) drives both the PDF and the web editions, which is what keeps the
web and PDF surfaces claim-for-claim identical.

**Released PDF integrity** (`docs/whitepaper/manifest.json`, `docs/whitepaper/CHECKSUMS.txt`):

| Edition | SHA-256 |
|---|---|
| EN | `56c38656ceebe28f391b937793227c80ba7c41ac8ab205e029407b3df02f54dc` |
| PT | `48247062346d317ab31bb15025a8f16d02f22ecfd82d6d023538d382c7dee540` |

Neither the author list, publisher legal name, licence, nor these hashes were fabricated for this report;
they are read directly from the committed manifest, checksum file, and `CITATION.cff`.

---

## 3. The claim → evidence contract

The drafting pass was bound by a Gate-A claim-evidence matrix
(`docs/whitepaper/prep/WHITEPAPER_CLAIM_EVIDENCE_MATRIX.md`). The matrix enumerates every material claim
the paper is permitted to make and assigns each one an **evidence state**:

- **grounded** — supported by a real, read BANZA source (an ADR, a governance document, a production
  contract/schema, or a deterministic Rust engine); safe to assert as written.
- **needs-source** — the paper wanted to assert it but no single consistent grounded source existed, or
  sources contradicted; a hard blocker (MUST-FIX-before-v1.0) until resolved.
- **scoped-limitation** — true only as a bounded, honest limit; must be framed as a limitation, never as a
  capability claim.

The binding rule was: nothing enters the paper unless it is grounded here or declared a scoped limitation.

### 3.1 Coverage summary

| Measure | Count |
|---|---|
| Total material claims | 71 |
| Grounded | 69 |
| Scoped limitations | 6 (LIM-01…LIM-06) |
| Needs-source at Gate-A (now resolved) | 1 (TRUST-04, mirrored by LIM-05) |

Material claims are organised across the paper's structure: thesis (4), contributions C-01…C-10 (10),
architecture (6), open trust model (7), invariants (6), certification / Layer 2 (7), endpoint-originated
validation and the nine-step journey (6), evidence and receipts (6), determinism — Rust decides, the model
explains (4), regulatory posture and the Layer 3 scheme (7), conflict-of-interest controls (3), Operador
Zero (4), governance and openness (4), boundary claims (9), limitations (6), and editorial / identity /
licence (7).

Each grounded claim resolves to a concrete artifact — for example the three-layer architecture to ADR-059
and `BANZA_THREE_LAYER_ARCHITECTURE.md`; the open trust model to ADR-038/058 and `contracts/invariants.json`
(`INV-OTE-*`); endpoint-originated validation to ADR-068 and the SSRF-hardened Rust fetcher; the
determinism claim to ADR-059 D-059-05 and `verdict.rs`; the regulatory posture to ADR-062 and the
`regulatory-state` production schema. The financial invariants (double-entry, append-only immutability,
integer minor-unit precision, atomic postings, no double settlement, ledger-derived non-negative balances,
idempotency/replay safety, QR integrity) are cited from the canonical machine-readable registry
`contracts/invariants.json` by invariant statement text rather than by line number, so the citations do not
go stale.

### 3.2 The two claims that are not plain capability assertions

- **Sole needs-source claim at Gate-A:** TRUST-04 (trust-root "who signs what"). Its resolution is the
  subject of §5.1 below; it shipped grounded, in the canonical Model A form.
- **Six scoped limitations:** the pre-production baseline (no operator in production, no production
  certificate emitted); all live validation evidence to date being demonstration/technical evidence rather
  than authorisation; no real-money flow ever exercised (the RealMoneyActivationGate has never been
  opened); the canonical Reference predating the three-layer model (so three-layer/Layer-2/Layer-3 material
  is sourced from ADRs and governance documents, not the Reference chapters); the trust-schema
  reconciliation owed to the contracts track (see §5.1); and interoperability being specified and locally
  reproducible but not yet demonstrated across multiple production operators. Each is stated as an honest
  limit, never softened into a capability claim.

---

## 4. Boundary claims (the required set)

The paper is required to carry an explicit set of boundary claims — statements of what BANZA is *not* and
what a given step does *not* confer. All are grounded and all are present. They are stated on the cover and
abstract where load-bearing, and again in the dedicated boundaries and threat-model material.

| # | Boundary claim | Grounding |
|---|---|---|
| B-01 | BANZA is not a bank, PSP, wallet, e-money institution or financial operator; it holds and moves no funds, runs no client accounts, does not settle, issues no licences, and replaces neither regulator nor scheme. | ADR-059 D-059-01; `spec/overview.md`; every production `_boundary` |
| B-02 | Technical certification ≠ scheme admission ≠ regulatory authorisation; none implies, grants, propagates to or substitutes for the others (non-propagation in any direction). | ADR-061 |
| B-03 | BanzAI is not an authority (not normative, not a certifier/approver/licenser/PSP) and not a fourth layer. | ADR-054; ADR-059 D-059-04 |
| B-04 | The local model (Qwen) never decides — it only explains results already determined by the Rust engines. | ADR-059 D-059-05; `verdict.rs` |
| B-05 | Operador Zero is not a production operator and not a real-money path (sandbox, `NOT_CERTIFIED`, no real funds). | ADR-052; ADR-067; `regulatory-state` schema |
| B-06 | The closed Technical Registry is BANZA's own list of eligible validation targets — not a trust anchor and not a mandatory global directory operators must appear in to be trusted. | ADR-065 D-065-03; INV-FEDEVAL-008 |
| B-07 | Three distinct "registry" surfaces, each named explicitly (closed BANZA Technical Registry; Public Protocol Registry anchor; private Candidate Registry). | `banza-target-registry`; INV-FEDEVAL-008; `banzai-onboarding` |
| B-08 | Operator (entity) ≠ implementation (technical system); one operator may publish many implementations; certification is per-implementation, bound to `implementation_hash`. | ADR-068; operator/implementation record schemas |
| B-09 | At v1.0 the public surface is empty and honest: `production_certificates=false`, `/operators=[]`, no placeholder entry; absence from the registry is not a regulatory prohibition. | ADR-065 D-065-07; `protocol-version.json`; README |

The published text carries these faithfully. The regulatory posture uses only the admissible public
phrasing — the operational layer is in regulatory preparation and real payments remain deactivated — and no
regulator-specific (e.g. central-bank) language is published, consistent with the fail-closed
RealMoneyActivationGate and the regulatory-claim policy. No real-funds or regulatory-authorisation claim
appears anywhere in either edition.

A drafting-pass denylist further enforced the boundary posture: forbidden claim vocabulary
(*first / only / revolutionary / unprecedented / fully-decentralised / trustless / guaranteed /
regulator-approved / production-proven / real-funds-active*) and obsolete terms (*BANZA CA*, operator
X.509, operator certificate, BANZA-as-bank-or-PSP, BanzAI-as-authority, Qwen-as-decider,
Operador-Zero-as-production) are excluded, and a hit is a gate blocker.

---

## 5. Resolution of the MUST-FIX items

Eight MUST-FIX-before-v1.0 items were registered at Gate-A. Of these, exactly one (MF-1 / TRUST-04) was a
genuinely *unsupported* claim; the remainder were conflation, sourcing, or verification blockers that would
have *become* unsupported claims if left unaddressed. All eight are resolved in the shipped document.

### 5.1 MF-1 — Trust-root signing scope → canonical Model A (the headline resolution)

**The problem.** Two active production-schema vocabularies contradicted the invariant registry on *who
signs what* at the trust root:

- **Model A (canonical — Key Manifest model).** The Trust Root signs *only* the Key Manifest; delegated,
  domain-separated keys sign protocol metadata, evidence and the revocation list. This is the model
  declared by the invariant registry (`INV-ROOT-004`, `INV-ROOT-005`) and reflected in
  `contracts/federation/{key-manifest,revocation-list}.json`.
- **Model B (production trust schemas).** Several `contracts/production/*` schemas described the Trust Root
  directly signing multiple artifact classes.

A "who signs what" statement resting on two contradictory sources is unsupported, so at Gate-A TRUST-04 was
the paper's only `needs-source` claim.

**The resolution adopted.** The paper adopts **Model A** as governing, on the declared precedence rule that
the invariant registry (`contracts/invariants.json`) is the single machine-readable source of truth. The
published trust text states the canonical form directly: the Trust Root signs the Key Manifest and a
delegated authorised key signs the revocation list; the root does not sign every artifact directly. The
paper narrows to this mechanistic, registry-grounded sub-claim and does not assert the broader Model-B
framing. The Model-A/Model-B schema divergence is recorded as an implementation-surface reconciliation owed
to the contracts/engines track (LIM-05), so the paper makes a scoped, precise, grounded claim rather than a
blanket one. With this, TRUST-04 ships **grounded**, not unsupported.

### 5.2 The remaining MUST-FIX items

| # | Item | Resolution in v1.0 |
|---|---|---|
| MF-2 | Token overload: institutional Layers 1/2/3 vs conformance Levels L0–L4 vs `banza-lN-readiness` engines. | Disambiguated consistently: "Layer 1/2/3" for the institutional axis, "Level 0–4 / L0–L4" for the conformance axis; never conflated. |
| MF-3 | Two meanings of "certification": step-9 Certification **Readiness** (never returns CERTIFIED) vs the `banza-certification` **authority** engine. | Both named explicitly; the paper states the nine-step journey stops at *readiness* and never issues a Certification Record. |
| MF-4 | Three "registry" surfaces share one word. | All three named on first use (closed BANZA Technical Registry / Public Protocol Registry / private Candidate Registry); "registry" never left unqualified. |
| MF-5 | Do not source three-layer / Layer-2 / Layer-3 material from the canonical Reference (it predates the model). | Sourced from ADR-059…066 plus the governance documents and production contracts; the Reference is not cited for any three-layer claim (recorded as LIM-04). |
| MF-6 | Do not describe an obsolete emitted-"certificates" registry table (removed by ADR-058). | Layer 2 is described via the per-implementation `CertificationRecord` in the Technical Registry; no `certificates` table and no `/certificates` route are asserted. |
| MF-7 | External references need bibliographic verification. | All 18 references web-verified against primary sources (ISO / IETF / W3C / NIST / ACM / IEEE / publishers). The ADR-038 canonical-JSON form is cited as BANZA-defined and is *not* claimed to conform to RFC 8785 (JCS). No DOI/ISBN/ISSN invented. |
| MF-8 | Programme reconciliation (no canonical programme/§11 file existed; the thesis and contributions were reconstructed from the audit corpus). | The thesis and the ten contributions are reconciled against the matrix; the reconstruction provenance is recorded so any future divergence is a tracked open question rather than a hidden assumption. |

### 5.3 Divergence register

The source inventory (`docs/whitepaper/prep/WHITEPAPER_SOURCE_INVENTORY.md`) additionally carries a
six-item divergence register (D-1…D-6) covering the trust-root signing model (D-1 → Model A, as above), the
Reference predating the three-layer model (D-2), obsolete "BANZA CA" strings in two package descriptions
(D-3), a stale `certificates` table on an active Reference surface (D-4), a hardcoded reference origin (D-5,
framed as a reference/sandbox example, not a privileged position), and the "registry listing is not a
check" nuance (D-6, disambiguated by the exact evaluation being described). Each divergence was documented,
not silently reconciled, and none blocks a central thesis of the paper. D-1 and D-6 required scoped, precise
claims; D-2 and D-4 are sourcing/staleness constraints handled by choosing authoritative sources; D-3 and
D-5 are cosmetic or informational.

---

## 6. Automated enforcement and the public surface

- **Whitepaper guard.** `tools/check-banza-whitepaper.sh` (nine checks) and its CI job pass, covering the
  presence and consistency of the released editions, manifest, and identity constraints.
- **Identity check.** `make identity-check` exits 0; the whitepaper prep and content surfaces are within a
  scoped Banzami allowlist, and examples use Operador A / B / C / D placeholders — no real commercial
  operator brand appears.
- **Web editions.** The routes `/whitepaper`, `/whitepaper/en`, `/whitepaper/pt`, and `/whitepaper/versions`
  render from the same single localised source as the PDFs, carry `ScholarlyArticle` JSON-LD, `hreflang`
  (en / pt / x-default) and Highwire `citation_*` metadata, and prerender statically with a clean build.
- **Home entry point.** The home hero gains a single additive secondary outlined call-to-action, "Ler o
  Whitepaper" → `/whitepaper`, placed beside the unchanged primary "Validar operador no BanzAI" →
  `/banzai?mode=validation`. On desktop both sit on the same line; on mobile they stack with the primary
  first. Every other home element — eyebrow, title, paragraph, indicators, illustration, header and footer —
  is unchanged (zero redesign).

---

## 7. Conclusion

Every material claim in the BANZA Whitepaper v1.0 is either grounded in a real BANZA source or declared as
a scoped limitation, and this is enforced by the Gate-A claim-evidence matrix, the source inventory
divergence register, the whitepaper guard, and the identity check. All eight MUST-FIX-before-v1.0 items are
resolved: the trust-root signing wording adopts the canonical **Model A** (root signs only the Key Manifest;
a delegated key signs the revocation list), with the schema-level divergence recorded as an
implementation-track reconciliation. The required boundary claims are all present and faithful, and no
regulatory or real-funds claim appears.

**No unsupported material claim shipped in v1.0.**
