# Whitepaper — Related-Work Matrix (concept comparison)

**Program:** WP1-FINAL · **Feeds:** Page 3 (*Motivation, related work, contribution*) and Fig. 1
(*bilateral integrations vs a common protocol*). · **Status:** Gate-A prep artifact, **non-normative**.
· **Date:** 2026-07-30. · **Grounding:** `docs/whitepaper/prep/audit/01..06-*.md` and the real repo
files they cite (ADRs, `contracts/**`, `contracts/invariants.json`, `engines/**`).

This matrix compares **concepts** only. It states, for each established approach, what it provides, and
how BANZA's mechanism *relates or differs* — **neutrally and scoped**. It makes **no** competitive or
superiority claim: BANZA's choices are described as *different design points*, never as *better*, and any
qualitative comparison in the paper must be backed by evaluation, not adjectives. It is descriptive prose
in the indicative mood; it introduces no MUST/SHALL of its own (charter §7).

---

## Guardrails carried into every row (binding — do not conflate)

- **Institutional Layers (ADR-059) ≠ conformance Levels (ADR-021/038) ≠ `banza-lN-readiness` engines.**
  *Layers* = L1 Protocol / L2 Conformance & Interoperability Certification / L3 Operational Schemes
  (Banzami Operational Scheme = first *intended* scheme). *Levels* = L0–L4 conformance profiles. The
  matrix uses **"Layer 1/2/3"** for the institutional axis and **"Level L0–L4"** for the profile axis.
- **Two meanings of "certification":** the nine-step journey's step-9 Certification **Readiness**
  (`banza-target-registry`; aggregates, **never** returns `CERTIFIED`) vs the `banza-certification`
  **authority** engine (closed state machine that *can* emit `CERTIFIED`). The journey never certifies.
- **Three "registry" surfaces, named explicitly:** (a) the **closed BANZA Technical Registry** —
  validation targets / public read-only state, `banza-target-registry`, feeds `/operators`; (b) the
  **Public Protocol Registry** anchor referenced by INV-FEDEVAL-008 (a listing, *not* a trust check);
  (c) the **private Candidate Registry** — onboarding only, **not** protocol core (ADR-069).
- **operator (entity) ≠ implementation (technical system).** Certification is **per-implementation**,
  bound to `implementation_hash`, scoped to profile+version+environment+scope+evidence+validity; it is
  **not** a CA signature and involves **no certificate chain** (ADR-064/066).
- **Rust EXECUTES + DECIDES; local Qwen only EXPLAINS** (never certifies/publishes/revokes/approves/
  decides). BanzAI is a **transversal interface**, not a fourth layer and not an authority (ADR-054/059).
- **BANZA is not a bank/PSP/wallet/operator; moves no funds.** Certification ≠ scheme admission ≠
  regulatory authorisation (ADR-061). The L3 Banzami Operational Scheme is
  `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money OFF (ADR-062).
- **Forbidden in every cell:** *first / only / revolutionary / unprecedented / fully-decentralised /
  trustless / guaranteed / regulator-approved / production-proven / real-funds.* BANZA has a **rooted,
  threshold** trust model — it is *not* "trustless" or "fully decentralised."

---

## Part A — Concept comparison (twelve rows)

| # | Concept | Established approach (real world / standards) | What it provides | How BANZA relates / differs (neutral, scoped) | Ref? |
|---|---|---|---|---|---|
| 1 | **Bilateral / point-to-point integrations** | Each pair of operators negotiates a private technical integration (classic enterprise integration; O(n²) pairwise effort). | Direct connectivity between two parties; bespoke per-pair contracts and testing; no shared conformance yardstick. | BANZA's thesis is a **common protocol** — public rules, versioned profiles, and verifiable evidence — so independent implementations interoperate against a shared specification rather than a per-pair integration (charter §3; Fig. 1). Stated as a *structural* difference, not a superiority claim. | Context |
| 2 | **Financial message standards** (ISO 20022, ISO 8583) | Standardised syntax/semantics for financial messages on existing rails (payments, cards, clearing). | Common wire vocabulary + data dictionaries enabling message exchange across systems. | **Different scope.** BANZA is a protocol + conformance layer, *not* a wire-format body or a clearing network. It defines its **own** contract schemas and financial invariants for the flows in scope — `contracts/openapi/*`, `contracts/events/*`, `contracts/qr/payload-format.json`, and `contracts/invariants.json` (LEDGER/WALLET/SETTLE/IDEM/QR/MON families) — and does not claim adoption of ISO message formats (audit 04 §1, §7). | **Yes** |
| 3 | **Interoperability protocols / open-banking API standards** | Standardised API surfaces + rulebooks for cross-institution interoperability (open-banking / access-to-account frameworks). | Common API contracts and participation rules within a defined regulatory or scheme context. | BANZA specifies operator-neutral OpenAPI contracts + capability/manifest discovery for interoperability between independent implementations, decoupled from any single scheme or jurisdiction; scheme/regulatory context sits at L3, separately (ADR-059/061; `contracts/openapi/operator-validation.yaml`; audit 04 §2). | **Yes** |
| 4 | **Conformance & interoperability testing** | Conformance-test methodology + certification test suites (e.g., the OSI conformance-testing framework; W3C-style test suites). | A defined method to declare and check whether an implementation meets a specification; test vectors and verdicts. | BANZA runs an **offline, deterministic Rust conformance runner** (`engines/banza-conformance`) over pinned public vectors + invariant checks, plus an interoperability/federation-readiness path; verdicts are `PASS/WARN/FAIL`, evidence is reproducible and hash-bound, and a third party re-runs the same public vectors to reproduce the hashes (audit 02 §2–§4; audit 03 §5; INV-FEDEVAL-003). | **Yes** |
| 5 | **Technical identity & signed metadata** (discovery / `.well-known`) | Self-published, signed metadata at well-known locations (well-known URIs; discovery/metadata documents; signed federation metadata). | Machine-discoverable identity + endpoint/capability descriptors, optionally signed for authenticity. | An implementation publishes a **DiscoveryDocument + operator manifest + Signed Protocol Metadata** at its canonical origin (`.well-known/banza/*`); every endpoint URL is host-bound to that origin, and signatures are Ed25519 over the ADR-038 canonical-JSON form. Identity is of an **implementation**, not a brand (ADR-068; `contracts/production/discovery-document*.schema.json`; audit 04 §2–§3; audit 02 §11). | **Yes** |
| 6 | **Verifiable evidence & reproducibility** | Content-addressed hashing + reproducible builds + supply-chain attestations (Merkle hashing; in-toto/SLSA-style attestations; reproducible-builds practice). | Tamper-evident, independently re-checkable artifacts and provenance. | The **Evidence Bundle** is a technical evidence assembler (SHA-256 per-artifact + whole-bundle hashes; `not_a_certificate=true`, `external_model_called=false`); "evidence that cannot be reproduced is not evidence." Integrity is by **hash, not signature/authority** (`engines/banza-evidence-bundle`; `contracts/production/evidence-bundle.production.schema.json`; INV-FEDEVAL-003; audit 03 §1, §5). | **Yes** |
| 7 | **Trust models & key management** (PKI / CA vs alternatives) | Certificate-authority PKI issuing X.509 certificates and certificate chains; alternative models (web-of-trust; update-framework / transparency-based trust). | A way to bind keys to identities and distribute trust from an anchor. | BANZA uses **Open Trust Evaluation (ADR-038): no CA, no operator certificate, no certificate chain.** Trust is derived locally by each party from root-signed protocol metadata + published conformance evidence + manifest compatibility + fail-closed revocation; **no BANZA-issued artifact about an operator and no human decision is an input** (INV-OTE-007/008/009). Presented as a *different trust-distribution model*, not as superior; the model is **rooted and threshold-based**, not "trustless." (`engines/banza-trust`; audit 03 §3; audit 04 §1.) | **Yes** |
| 8 | **Root of trust & threshold key custody** | Offline root-key ceremonies + threshold/secret-sharing custody (DNSSEC root KSK ceremony; HSM ceremonies; secret-sharing; update-framework root roles). | A high-assurance anchor whose control is split so no single party holds it; delegation to operational keys. | An **offline threshold Trust Root** (M2 bootstrap 2-of-2 → future 3-of-5 Shamir) whose private keys never reside on serving infrastructure; the root **signs only Key Manifests** (canonical Model A, INV-ROOT-004) and delegated domain keys sign metadata/evidence/revocation. **Eight domain-separated key domains, never reused** (ADR-028/063; INV-ROOT-*; audit 01 §6.3; audit 03 §3; charter §16). | **Yes** |
| 9 | **Revocation & status** | Revocation lists + online status responders + short-lived credentials (CRLs; online status checking; short-lived certs). | A mechanism to withdraw trust from previously accepted material and to answer "is this still valid?" | A **signed, fresh Revocation List (BRL)** signed by the revocation-domain delegated key; unsigned/unverifiable/expired ⇒ treated as absent ⇒ **fail-closed**; a listed operator is excluded regardless of other signals. Revocation is a **cryptographic security signal only — never a regulatory sanction, licence withdrawal, or judgment** (INV-OTE-006, INV-FEDEVAL-005, INV-FED/OTE-010; `contracts/federation/revocation-list.json`; audit 03 §3; audit 04 §4). | **Yes (shared)** |
| 10 | **Certification lifecycle & status semantics** | Credential validity windows + status states (valid/expired/revoked/suspended) governing a certificate's standing over time. | A defined lifecycle so relying parties can interpret current standing, renewal and terminal states. | A **closed, total, deterministic, Rust-decided** state machine: `NOT_CERTIFIED` (fail-closed default) · `CERTIFIED` · `EXPIRED` · `SUSPENDED` · `REVOKED` · `SUPERSEDED`; `REVOKED` is terminal; renewal is **re-certification via a new record**, never in-place extension; the record is bound to `implementation_hash`, **not** a certificate chain (ADR-066/064; `contracts/production/certification-record*.schema.json`; audit 01 §3.3; audit 02 §10). *Disambiguate:* step-9 Certification **Readiness** ≠ the `banza-certification` authority. | **Yes (shared)** |
| 11 | **Technical registries / directories / transparency logs** | Directory services + append-only transparency logs + package/artifact registries (directory protocols; transparency logs; naming/number registries). | A discoverable, sometimes append-only, index of entities or artifacts that relying parties can query. | The **BANZA Technical Registry** (ADR-065) is a public, append-mostly, root-verifiable index of L2 artifacts (implementations, profiles, records, revocations), verifiable **without an account, no CA, no chain**; it is **not** a scheme participant directory (L3) and **not** a trust anchor — *registry listing is not a check* (INV-FEDEVAL-008). Baseline is honest-empty: `/operators=[]`, `production_certificates=false`. **Name all three registry surfaces** (see guardrails). (`engines/banza-target-registry`; audit 03 §4–§5; audit 06 §10.) | **Yes (shared)** |
| 12 | **Federation & cross-domain interoperability trust** | Identity/trust federation frameworks + interbank correspondent/clearing arrangements (federation metadata frameworks; trust-service regulation; correspondent networks). | Cross-domain trust so parties in different administrative domains can interoperate. | **Federation Trust Evaluation without certificates (ADR-040):** ten conjunctive, locally-executed, fail-closed checks a routing party runs over a peer's *published* material; **BANZA is not in the trust path**, and value-conservation/reconcilability invariants govern cross-operator flows (INV-FEDEVAL-*, INV-FED-*; `contracts/federation/*`; audit 04 §1; audit 03 §5). | **Yes** |

**Ref? key:** *Yes* = the row needs its own verified external reference in `REFERENCES.bib`. *Yes
(shared)* = covered by a reference already cited for another row's cluster (rows 9/10/11 largely reuse the
PKI/lifecycle/transparency cluster from row 7 + directory refs). *Context* = conceptual framing; an
external reference is optional (row 1 may cite an integration-patterns text or stand on the charter thesis).

---

## Part B — Candidate references (to VERIFY) + BANZA grounding

> **Caution.** Every entry below is a **candidate identifier to verify against the primary source
> before** it enters `REFERENCES.bib` (which does not yet exist). **No DOI/ISBN/ISSN is asserted here**;
> the drafter must confirm exact title, edition/version, year and identifiers. The whole paper's budget is
> **12–18 references total** (charter §9), so clusters are shared across rows.

| # | Concept | Candidate external reference(s) — VERIFY | Reference cluster | BANZA grounding (audit-cited) |
|---|---|---|---|---|
| 1 | Bilateral integrations | Enterprise integration / point-to-point integration patterns (textbook) — *optional* | EIP | Charter §3 thesis; Fig. 1 |
| 2 | Financial message standards | ISO 20022 (financial-industry message scheme); ISO 8583 (card-originated messages) | ISO-MSG | audit 04 §1, §7 (`contracts/**`, `invariants.json`) |
| 3 | Interoperability protocols | An open-banking / access-to-account API standard or rulebook (verify which; e.g., a regional PSD2-derived API standard) | OPENBANK | audit 04 §2 (`operator-validation.yaml`); ADR-059/061 |
| 4 | Conformance & interoperability testing | A conformance-testing methodology standard (verify; e.g., the OSI conformance-testing framework, ISO/IEC 9646 series) | CONF-TEST | audit 02 §2–§4; audit 03 §5; INV-FEDEVAL-003 |
| 5 | Technical identity & signed metadata | Well-Known URIs (RFC 8615); a discovery/metadata spec (OIDC Discovery and/or OAuth AS Metadata RFC 8414); signed federation-metadata spec | METADATA | ADR-068; `discovery-document*.schema.json`; audit 04 §2–§3 |
| 6 | Verifiable evidence & reproducibility | A supply-chain attestation / provenance framework (verify; e.g., in-toto, USENIX Security 2019, and/or the SLSA framework); reproducible-builds practice; Merkle hash trees | SUPPLY | `evidence-bundle.production.schema.json`; INV-FEDEVAL-003; audit 03 §1, §5 |
| 7 | Trust models & key management | X.509 PKI certificate/CRL profile (RFC 5280); an alternative-trust reference (verify; e.g., The Update Framework, CCS 2010) | PKI + TUF | ADR-038; INV-OTE-*; `engines/banza-trust`; audit 03 §3 |
| 8 | Root of trust & threshold custody | Shamir, "How to Share a Secret" (CACM 1979); a root-ceremony reference (verify; DNSSEC root KSK practice or update-framework root role) | THRESHOLD | ADR-028/063; INV-ROOT-*; audit 01 §6.3; charter §16 |
| 9 | Revocation & status | OCSP (RFC 6960); CRL profile (RFC 5280) | PKI/OCSP (shared) | INV-OTE-006 / INV-FEDEVAL-005 / INV-FED-010; `revocation-list.json`; audit 04 §4 |
| 10 | Certification lifecycle & status | Certificate validity/status model (RFC 5280) — *reused from row 7/9* | PKI (shared) | ADR-066/064; `certification-record*.schema.json`; audit 02 §10 |
| 11 | Technical registries / directories / transparency logs | A transparency-log reference (Certificate Transparency, RFC 6962); a directory reference (X.500 / LDAP, verify) | CT + DIR | ADR-065; `banza-target-registry`; INV-FEDEVAL-008; audit 03 §4–§5 |
| 12 | Federation & cross-domain trust | A federation-metadata / trust-service reference (verify; e.g., SAML 2.0 metadata, OpenID Federation, or the EU eIDAS trust-services regulation) | FED | ADR-040; INV-FEDEVAL-* / INV-FED-*; `contracts/federation/*`; audit 04 §1 |

**Reference clusters (for the 12–18 budget):** `ISO-MSG` · `OPENBANK` · `CONF-TEST` · `METADATA` ·
`SUPPLY` · `PKI` (RFC 5280, anchors rows 7/9/10) · `OCSP` (RFC 6960) · `CT` (RFC 6962) · `DIR`
(directory) · `TUF` · `THRESHOLD` (Shamir) · `FED` (federation/eIDAS) · `EIP` (optional). Twelve rows map
to roughly **twelve–fifteen** distinct external references once shared clusters are counted once — within
budget.

---

## Part C — Notes for the Page-3 drafter

- **Fig. 1 anchor.** Rows 1–3 carry the *bilateral-vs-common-protocol* framing that Fig. 1 illustrates;
  keep the figure caption a structural comparison (per-pair integration vs shared public rules), never a
  performance or superiority claim.
- **Scope discipline.** BANZA is presented as *an open financial interoperability protocol* — never a
  payment/settlement network, digital currency, blockchain protocol, or financial operator (charter §5).
  Row 2 in particular must not imply BANZA is a message-format standards body or carries scheme traffic.
- **Trust-root wording.** Follow **canonical Model A** (root signs only the Key Manifest; a delegated key
  signs the revocation list) in rows 7–9; do not silently reconcile the divergent production-schema
  wording (charter §16; audit 04 R-1).
- **Reference honesty.** Do not cite any identifier that has not been verified against its primary source;
  prefer citing an invariant `statement` over a possibly-stale `source` line number (audit 04 R-2).
- **Live baseline to cite where relevant.** Pre-production, honest-empty: `pre_production=true`,
  `production_certificates=false`, `/operators=[]`; a real Operador Zero journey ran with
  `overall_status=FAILED`, `certification_status=NOT_CERTIFIED`, `external_model_calls=0` — no `CERTIFIED`
  was ever forced (audit 03 §2.2, §7; audit 06 §10).
</content>
</invoke>
