# BANZA Whitepaper v1.0 — Detailed Outline (ten pages, per edition)

Grounded in the §6 audit (`docs/whitepaper/prep/audit/`). Each page lists its content, the figure/equation
it carries, the word budget and the primary grounded sources. Geometry and structure are identical in EN and
PT; only text is localised. Total EN target 3,000–3,600 words.

---

## Page 1 — Cover & bibliographic identity  (~90 w)
- Title (official translation EN / canonical PT); "Whitepaper v1.0"; edition line (Official English
  Translation / Edição canónica (Português)).
- Authors: **Fidel R. Monteiro**, **Jesus R. Monteiro** — Co-founders of Banzami.
- Affiliation & publisher: Banzami — BANZAMI – Tecnologia e Serviços, Lda.
- Real date; protocol status (pre-production); licence (CC BY 4.0); canonical URL; "non-normative document";
  canonicity line. Restrained cover — no illustration.

## Page 2 — Abstract, keywords, problem  (~430 w)
- **Abstract (180–250 w):** context (independent operators must interoperate) → problem (pairwise closed
  integrations: O(n²) contracts, private validations, non-reproducible, no uniform evidence) → proposal
  (public rules + demonstrable conformance + verifiable evidence) → mechanism (canonical-origin artifacts →
  deterministic engines → receipts bound to inputs/hashes/versions) → contribution → boundaries → current
  state (pre-production).
- **Keywords (5–7):** financial interoperability; open financial protocol; deterministic validation;
  verifiable evidence; technical conformance; trust; protocol governance.
- **Problem framing** (short lead into Page 3).
- Canonical/translation prevalence declaration (both editions).

## Page 3 — Motivation, related work, contribution  (~430 w) · **Figure 1**
- Bilateral-integration complexity: duplicated contracts, private/opaque validation, weak reproducibility,
  no uniform evidence.
- Related work (concept-level, neutral): message standards (ISO 20022 / ISO 8583), interoperability
  protocols, conformance testing, technical identity + signed metadata, verifiable evidence/reproducibility,
  trust + revocation, technical registries. (From the Related-Work Matrix; no superiority claims.)
- BANZA's positioning + the 10 scoped contributions (compressed).
- **Fig. 1** Bilateral integrations vs a common protocol.
- Sources: audit 01/04; Related-Work Matrix; References.

## Page 4 — System model  (~360 w) · **3 equations**
- operator (o) vs implementation (i); one operator → many implementations; result applies to a specified
  implementation+version+profile+environment+scope+evidence+validity.
- Compact formal model (program §14): `I=(o,i,v,p,e,u)`; artifacts `A(I)={a₁…aₙ}`; validation
  `V_m(A(I), S_{v,p}) → (R,E,P)`; reproducibility statement (semantic equivalence of verdicts/reason codes
  given equivalent canonical inputs + same spec + same engine version; timestamps excluded).
- Sources: ADR-064/068 (implementation model, implementation_hash); audit 02/03.

## Page 5 — Three-layer architecture  (~380 w) · **Figure 2**
- **L1 BANZA Protocol:** profiles, contracts, schemas, discovery, identity, signed metadata, trust,
  revocation, federation (open, neutral; not a bank/PSP/wallet/operator; moves no funds).
- **L2 Conformance & Interoperability Certification:** per-implementation, evidence-based, Rust-decided;
  profile/version/environment/scope; not licence/admission/authorisation.
- **L3 Operational Schemes:** independent schemes may adopt BANZA; the Banzami Operational Scheme is the
  first intended scheme (designated operator: Banzami), separate from BANZA, under its own framework.
- **BanzAI transversal** (not a 4th layer, not an authority).
- Disambiguation note: institutional layers ≠ conformance profiles L0–L4 ≠ readiness engines.
- **Fig. 2** Three-layer architecture (+ BanzAI transversal).
- Sources: ADR-059/060/061; governance three-layer + scheme docs.

## Page 6 — Discovery, identity, canonical origin  (~360 w) · **Figure 3**
- Canonical domain; `.well-known`; Manifest; implementation identity; public keys; signed metadata;
  integrity; key rotation; revocation; origin control; server-side retrieval (SSRF-hardened fetcher); no
  arbitrary caller URLs.
- Trust-root wording follows canonical **Model A** (root signs the Key Manifest; a delegated key signs the
  revocation list).
- Excludes onboarding operationals (no Resend/OTP/Candidate Registry/website forms).
- **Fig. 3** Canonical origin & published artifacts.
- Sources: ADR-038/040/068; contracts/discovery + manifest + signed-metadata + key-manifest + revocation;
  audit 03/04.

## Page 7 — Deterministic validation  (~380 w)
- The nine steps, grounded in `services/banzai-api/src/validate.js`: 1 Discovery, 2 Manifest, 3 Keys,
  4 Conformance, 5 Interoperability, 6 Trust, 7 Federation, 8 Evidence Bundle, 9 Certification **Readiness**.
- Engine backing each step; inputs; reason codes; blockers; versions (`engine_version`, may be
  "unknown"/"n/a"); fail-closed; reproduction.
- Decision/explanation separation (verbatim): *The Rust engines execute and determine the results. Qwen may
  explain those results but does not alter, certify, publish, revoke or approve them.*
- Disambiguation: step-9 Readiness never returns CERTIFIED (distinct from the banza-certification authority
  engine).
- Sources: audit 02; validate.js; engines/banza-*.

## Page 8 — Evidence, receipts, trust, Technical Registry  (~380 w) · **Figure 4**
- Evidence Bundle (+ boundary flags: not_a_certificate, not_an_approval, llm_calls=0,
  external_model_called=false); OperationReceipts; JourneyReceipt; OriginVerificationReceipt (fields:
  hashes, versions, reason codes, response_sha256); trust; revocation.
- Registry clarity (three surfaces named): the **closed BANZA Technical Registry** (public read-only state,
  feeds BANZA surfaces / `/operators`); the **Public Protocol Registry** anchor (INV-FEDEVAL-008); the
  **private Candidate Registry** (onboarding, not protocol core). Third parties can validate independently;
  no mandatory single global registry.
- **Fig. 4** Deterministic validation & evidence (execution vs publication vs explanation separated).
- Sources: audit 03; engines/banza-evidence-bundle, banza-trust, banza-target-registry; M2.19G.3A report.

## Page 9 — Security, governance, limitations, current state  (~380 w)
- **Threats:** tampering, false origin, compromised keys, replay, expired metadata, downgrade, SSRF, DNS
  rebinding, incomplete evidence, registry unavailable, version divergence.
- **Governance:** profiles, versions, RFCs, deprecation, compatibility, open evolution, BANZA/scheme
  separation.
- **Current state (from canonical state at release, not hardcoded):** pre-production; current scope;
  Operador Zero; production operators (0); active technical certifications; real funds (off). No invented
  performance metrics.
- Sources: audit 02/03/06; ADR-062 (regulatory state / real-money gate); governance separation matrix.

## Page 10 — Discussion, conclusion, references, citation  (~360 w + refs)
- Contribution recap; implications; boundaries; limitations; future research (pointer to the Scientific
  Publication Readiness note — no over-claim); conclusion.
- References (12–18, verified); recommended citation; canonical URL; version; source commit; link to the
  manifest.
- Sources: References.bib; manifest; Scientific Publication Readiness.

---

### Cross-cutting acceptance checks (per program §42)
- authors=2 (Fidel first); affiliation = Banzami / BANZAMI – Tecnologia e Serviços, Lda.; non-normative;
  BANZA not an operator; BanzAI not an authority; Qwen does not decide; certification scoped; registry not a
  global monopoly; Operador Zero classified sandbox; real state accurate; no real-funds claims; 4 figures;
  3 equations; no invented DOIs; EN 3,000–3,600 w; PT structurally equivalent; 10 pages each.
