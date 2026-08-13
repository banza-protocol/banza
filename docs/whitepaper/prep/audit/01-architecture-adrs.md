# Whitepaper Prep — Audit 01: Three-Layer Architecture + ADR Corpus

> **Scope.** Establishes, for the (non-normative, scientific-technical, operator-neutral) BANZA
> Whitepaper, the exact three-layer institutional model, the certification model, endpoint-originated
> validation, onboarding + origin proof, and every load-bearing separation, grounded in the ADR corpus
> and canonical governance documents. Every claim cites a real file + line/section read during this audit.
> **Date:** 2026-07-30. **Auditor:** architecture/ADR track.

---

## 0. What BANZA is (the one-sentence spine)

- **Canonical definition (D-059-01).** *"O BANZA é um protocolo financeiro aberto que define regras,
  contratos, perfis e mecanismos verificáveis de interoperabilidade entre implementações independentes."*
  — `decisions/adr/ADR-059-three-layer-institutional-architecture.md` §Canonical definitions L59;
  mirrored `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md` §3 L78-79.
- **BANZA is NOT** a bank, PSP, wallet, e-money institution or financial operator; it does not hold or
  move funds, run client accounts, settle, provide financial services, issue licences, or replace the
  regulator or any scheme (ADR-059 D-059-01; `BANZA_THREE_LAYER_ARCHITECTURE.md` §3 L86-89, boundary
  banner L12-16).
- **Institutional summary.** *"O BANZA fornece o protocolo, os perfis, os testes, a evidência e a
  certificação técnica. A Banzami administra o primeiro scheme operacional baseado no BANZA, condicionado
  ao enquadramento regulatório aplicável."* (ADR-059 §Canonical definitions L66-68).

---

## 1. The three-layer institutional architecture (ADR-059)

Source: `decisions/adr/ADR-059-three-layer-institutional-architecture.md` (Accepted, M2.19C);
canonical human-readable form `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md` (Status: Canónico).

**BANZA is a three-layer institutional architecture, with BanzAI as the transversal human interface
across all three layers. The layers are separated by responsibility, by infrastructure and by keys; the
separation is an architectural invariant, not a presentation choice** (ADR-059 Decision L32-34; D-059-06).

| Layer | Canonical name | What it is | What it is NOT |
|---|---|---|---|
| **L1** | **Protocolo BANZA** (BANZA Protocol) — *open, neutral* | Public rules, contracts, messages, schemas, APIs, invariants, reason codes, technical identity, manifests, signatures, discovery, compatibility, profiles, Signed Protocol Metadata, trust, revocation, the technical registry, federation, public verification (ADR-059 D-059-01; `BANZA_THREE_LAYER_ARCHITECTURE.md` §3 L81-84) | Bank/PSP/wallet/EMI/financial operator; holds no funds, no client accounts, no settlement, no licences (D-059-01) |
| **L2** | **Certificação de Conformidade e Interoperabilidade** (Conformance & Interoperability Certification) — *per-implementation, evidence-based, Rust-decided* | Certifies that an **independent implementation** demonstrated conformance + interoperability against a public, versioned profile; evidence-based, Rust-decided, reproducible, hash-bound, scoped, time-limited, subject to suspension/revocation (ADR-059 D-059-02; §4 L96-106) | A licence, scheme admission, or regulatory authorisation; never certifies an entity/operator/brand (D-059-02, §4 L108-111) |
| **L3** | **Banzami Operational Scheme** — *designated operator, regulated* | First operational scheme built on BANZA, promoted/designed/administered by **Banzami — Tecnologia e Serviços, Lda.** as designated operator, conditioned on the applicable regulatory framework; internal state `REGULATORY_AUTHORIZATION_IN_PROGRESS`; real funds/wallets/settlement/participants fail-closed (ADR-059 D-059-03; §5 L113-126) | The protocol, the certification, or a framework already obtained (§5 L122-124) |

**Dependency graph (permanent).** `Operadores → BanzAI → BANZA`; BANZA and BanzAI never depend on
operators (`BANZA_THREE_LAYER_ARCHITECTURE.md` §2 L72-73; ADR-059 diagram L43-44).

**BanzAI is transversal, NOT a fourth layer and NOT an authority** (D-059-04; §6 L128-137). It is the
canonical human interface for every human workflow across the three layers; it orients and executes **by
calling the Rust engines**; it never decides, certifies, admits, publishes or activates funds. Machine/SDK
consumers keep direct access to the public APIs — BanzAI is the human plane, not a mandatory machine gate
(ADR-054).

**Authority rule, permanent (D-059-05; §7 L139-151).** *"Rust understands, routes, executes, validates and
DECIDES."* The local **Qwen explains once** and never decides, certifies, admits, publishes, activates
funds, changes a state/reason code, or substitutes a regulator. **Rust validates before anything is
published** (ADR-037).

---

## 2. The institutional pipeline (ADR-059 §9)

Unidirectional across the layers; each step Rust-validated; the final step (scheme admission) is a
separate, later operational decision, conditioned on the regulator, and **never implied by any prior
technical step** (`BANZA_THREE_LAYER_ARCHITECTURE.md` §9 L174-201).

```
Manifest ─▶ SimB(pre-review) ─▶ Conformance ─▶ Interoperability ─▶ Signed Protocol Metadata ─▶ Trust
                                                                                          │
Scheme Admission ◀── Federation ◀── Registry ◀── Certification ◀── Evidence ◀────────────┘
└ L3 (operational decision, separate, regulator-conditioned) ┘   └──── L1 protocol · L2 certification ────┘
```

| # | Step | Layer | Decider |
|---|---|---|---|
| 1 | Manifest | L1 | Rust validates form + sandbox safety invariants |
| 2 | SimB (mandatory pre-review) | L2 | Rust |
| 3 | Conformance | L2 | Rust |
| 4 | Interoperability | L2 | Rust |
| 5 | Signed Protocol Metadata | L1 | Rust verifies; Trust Root signs metadata/keys — never operators/payments |
| 6 | Trust (Open Trust Evaluation) | L1 | Rust; no central approval |
| 7 | Evidence (reproducible, hash-bound) | L2 | Rust generates + recomputes |
| 8 | Certification (PASS/FAIL, scoped, dated) | L2 | Rust, deterministic |
| 9 | Registry (BANZA Technical Registry) | L2 | Rust validates before publishing; verify without account |
| 10 | Federation | L1 | Rust (fail-closed) |
| 11 | Scheme Admission | L3 | Scheme operator, separate + later, regulator-conditioned; never implied by certification |

---

## 3. The certification model (L2): ADR-064/065/066

### 3.1 Object model (ADR-064 — Accepted, M2.19D)

BANZA Conformance & Interoperability Certification is a **canonical, three-object, Rust-decided model**
(ADR-064 Decision L34-38; canonical doc `docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md`):

- **`CertifiedImplementation`** — the **subject** is an *implementation*, identified by a stable id + the
  **content hash of the exact artifact set tested** (`implementation_hash`). **Never** an entity, brand or
  operator; a different build is a different subject (D-064-01). The declaring party may be recorded for
  attribution only.
- **`InteroperabilityCertificationProfile`** — the **public, versioned yardstick**: conformance level +
  capabilities + pinned suites/vectors/required capabilities, immutable once published (a change is a new
  `profile_version`), derived only from L1 contracts, no operator-specific criteria (D-064-02).
- **`CertificationRecord`** (a.k.a. `InteroperabilityCertificationRecord`) — the **verdict**: evidence
  (conformance report + evidence bundle, each hash-bound + reproducible), the Rust-decided verdict, the
  scope (never broader than the evidence), a validity window (`issued_at`/`expires_at`), the state
  (ADR-066), and a `record_hash` over the whole (D-064-03). Object shapes at ADR-064 L52-68.

**Rust decides; no human or model override** (D-064-04): the verdict is computed only by the Rust engine
(`engines/banza-conformance` / `engines/banza-certification`); Qwen explains but never issues/changes/
widens/revokes; no human/config turns FAIL→PASS or widens scope (ADR-037; ADR-038 INV-OTE-008).
**Evidence-based, reproducible, hash-bound**: a third party re-runs the pinned profile's **public**
vectors and MUST reproduce the hashes; no BANZA-issued artifact about an operator is an input; **no CA
signature and no certificate chain** — trust is root-signed protocol metadata verified without any BANZA
account (D-064-05).

**A certificate is scoped + time-limited** and confers **no status beyond the technical fact**: it is not
a licence, not admission, not authorisation; no propagation (D-064-06/07).

### 3.2 The BANZA Technical Registry (ADR-065 — Accepted, M2.19D)

The single public, append-mostly, root-verifiable index of L2 artifacts — implementations, profiles,
records, revocations — verifiable by any third party **with no account**, and **strictly independent of
any scheme's participant directory (L3)** (ADR-065 Decision L26-27):

- Holds no funds, accounts, personal data or scheme membership — only technical certification facts
  (D-065-01).
- **Public verification, no account, no CA, no certificate chain** (D-065-02).
- **Registry ≠ scheme directory** (D-065-03): presence means "this implementation holds this record",
  never "admitted" or "authorised".
- **Fail-closed reads** (D-065-04): missing/unreadable/expired/suspended/revoked ⇒ not a valid
  certification.
- **Rust-owned, append-mostly, immutable records** (D-065-05): a change of standing is a new record or a
  revocation entry, never history mutation.
- **Neutral + operator-agnostic** (D-065-06): identical terms for any party; Banzami's own implementation
  goes through the same public path.
- **Baseline is empty and honest** (D-065-07): at v1.0 `production_certificates = false` and
  `/operators = []`; no placeholder/aspirational entry.

### 3.3 Closed certification-state machine (ADR-066 — Accepted, M2.19D)

A record's standing is a value of a **closed, total, deterministic, Rust-decided** state enum with a fixed
transition table (ADR-066):

- **States (closed enum, D-066-01):** `NOT_CERTIFIED` (baseline + fail-closed default) · `CERTIFIED` ·
  `EXPIRED` · `SUSPENDED` · `REVOKED` · `SUPERSEDED`. Any value outside is a bug; unknown resolves to
  `NOT_CERTIFIED`.
- **Fixed transition table (D-066-02).** `NOT_CERTIFIED→CERTIFIED` (fresh Rust-validated record);
  `CERTIFIED→EXPIRED` (clock); `CERTIFIED↔SUSPENDED` (signed suspend/lift, within window + evidence still
  reproduces); `CERTIFIED|SUSPENDED|EXPIRED→REVOKED` (signed, dated, terminal); `CERTIFIED|EXPIRED→
  SUPERSEDED`; renewal = `EXPIRED|CERTIFIED→CERTIFIED` **only via a brand-new record**.
- **`REVOKED` is terminal — no resurrection** (D-066-03). **Renewal is re-certification, never in-place
  extension** (D-066-04). **Fail-closed everywhere** — only `CERTIFIED` (in scope, in window, reproducible)
  reads as valid (D-066-05). **Rust decides; no override** (D-066-06). **No status propagation** to L3 or
  the regulator (D-066-07).

### 3.4 Conformance LEVELS (L0–L4) — a distinct axis (terminology hazard, see §9)

`docs/governance/certification-boundary.md` (v1.0, ADR-021/ADR-038) defines the **five conformance
readiness levels** — a *scope grouping*, not a status: **L0 Protocol Sandbox · L1 Core Payment Capability
· L2 Payment Initiation Capability · L3 Inter-Operator Interoperability · L4 External Interoperability**
(L83-89). These `L0–L4` "levels" are a **different meaning of the same tokens** used for the institutional
"Layers 1/2/3" of ADR-059. See §9 risk.

---

## 4. Endpoint-originated validation + operator↔implementation model (ADR-068)

Source: `decisions/adr/ADR-068-endpoint-originated-operator-validation-and-operator-implementation-model.md`
(Accepted, M2.19G.1).

**Core rule.** In BanzAI's official validation journey, **every evaluated artifact is obtained exclusively
from the public endpoints of the selected implementation.** No pasted content, uploaded file, drag-and-drop,
user-entered URL, local fixture, frontend mock, embedded JSON, pre-computed result or manually chosen
artifact may enter the official journey (Decision L40-45).

Operational rule: *"the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result;
the Technical Registry publishes the verifiable state."* Canonical flow (L50-53):
`operator → implementation → Technical Registry → canonical origin → discovery → public endpoints →
artifacts → Rust engines → evidence → receipts → Certification Readiness`.

- **Operator ≠ implementation (§4.2/§4.3).** The technical object evaluated is **a specific implementation
  published by that operator** — never the entity in the abstract. **One operator may publish many
  implementations** (demonstration, sandbox, pre-production, production; different versions, profiles,
  capabilities, deployments); selecting a target = choosing an operator **and one of its implementations**.
- **Human label = "Validar operador"** (§4.1) but means **evaluating an implementation** (§4.10) — it does
  NOT mean certifying the entity, authorising financial activity, admitting the operator into the Banzami
  Operational Scheme, or approving it commercially (ADR-061).
- **Security (§4.7).** Arbitrary URLs prohibited; official fetch is a secure Rust layer (`banza-fetcher`)
  that resolves host from the registry, enforces HTTPS, blocks private/loopback/link-local + cloud
  metadata, forbids cross-host redirects, bounds size/time, validates media types + TLS, and hash/
  timestamp/signature-binds each response.
- **Receipts (§4.8).** Each `OperationReceipt` + the `JourneyReceipt` bind the result to the exact origin;
  protocol fetches counted as `protocol_fetch_count`, never `external_model_calls`.
- **Drafts (§4.5).** Upload/paste allowed **only** in a local developer draft tool, separate from the
  official journey; a draft result is `DRAFT_VALIDATION_RESULT` — local, non-authoritative, never evidence.
- **Registry is the only source of targets (§4.6):** the closed Technical Registry provides eligible
  operators/implementations/canonical origins.
- **Operador Zero gets no shortcut (§4.9):** it exists in the registry with operator + implementation
  records, publishes its endpoints at `zero.banza.network`, and is validated through the same secure fetch
  + Rust engines, producing real receipts.
- **Rust decides every verdict; Qwen only explains; TypeScript never decides** (Consequences L129).

The nine-step journey: **Discovery, Manifest, Keys, Conformance, Interoperability, Trust, Federation,
Evidence Bundle, Certification Readiness**; Certification Readiness aggregates but **never issues a
Certification Record** and stays distinct from Certification Status (`NOT_CERTIFIED`) (L122-128).

---

## 5. Onboarding + origin proof (ADR-069) and the M2.19G.3A closure

Source: `decisions/adr/ADR-069-simple-secure-operator-onboarding.md` (Accepted, M2.19G.3);
closure .

**Core rule.** Operator onboarding is **a service hosted by BanzAI, not part of the BANZA protocol's
mandatory rules** (ADR-069 Decision, Core rule). It exists only to (a) protect the public validation
resources, (b) store private candidacies, (c) let a candidate resume progress, and (d) request publication
in the BANZA-operated Technical Registry. Canonical decomposition: *"The email authenticates the person.
The domain confirms the origin. The endpoints supply the artifacts. Rust verifies. The receipts fix the
results. The Technical Registry publishes the verifiable state — without closing the protocol."*

- **Passwordless email OTP only (§1).** 6-digit CSPRNG, 10-min validity, single-use, ≤5 attempts, ≥60s
  between requests, prior code invalidated on reissue, constant-time compare, **never stored in plaintext**
  (HMAC under a server pepper), email-existence never revealed. Opaque server-hashed `__Host-` cookie
  sessions. OTP/session/authorisation/rate-limiting are **Rust decisions**; **Resend is a replaceable
  delivery detail that never authenticates the user or determines any BANZA state**. The verified email
  authenticates a **contact person** — it does not verify the operator or the domain.
- **Private Candidate Registry vs public Technical Registry (§2).** The Candidate Registry is private,
  small, no public listing, no team/permissions model; the Technical Registry stays public + read-only.
  Publication is **technical state only — not scheme admission, licence, regulatory authorisation, or
  certification of an entity**.
- **Origin proof (§3).** One method: a fixed BANZA `.well-known` ownership challenge fetched by the
  SSRF-hardened Rust fetcher from `https://<domain>/.well-known/banza/ownership-challenge.json`
  (domain-only input; no arbitrary URL/path/port/IP/DNS-TXT). Verification emits an
  `OriginVerificationReceipt`; only then does the implementation run the **same** nine-step journey of
  ADR-068 — no separate/privileged journey for candidates.
- **Rust authority, Postgres persistence, open-protocol boundary (§4).** All security logic in Rust
  (`engines/banzai-onboarding`, Rust→WASM); persistence in the dedicated PostgreSQL protocol-state store
  (ADR-042) with hash-only, secret-free columns. **Explicitly preserved openness:** implementing BANZA,
  publishing endpoints, running the engines, validating and generating receipts require **no BanzAI
  account, no email code, no Resend, no Candidate Registry, no BANZA-team authorisation**.
- **Out of scope (unchanged):** M2.19H, scheme workflows, KYB, AML/CFT, scheme admission, real funds,
  passkeys/passwords/magic links, operator API keys, Resend webhooks, DNS-TXT, federated registry.

**M2.19G.3A closure (live evidence, 2026-07-30, PR #238 → `61646a5`, CI 249/249).** The G.3 re-enrolment
attempt had stopped at `ORIGIN_PENDING` (domain never published the challenge); the corrective made it
**integral**: the OZ origin (the `zero.banza.network` nginx vhost) publishes the challenge from a static
read-only file — **not** served by `banzai-api`/website/DB (verifier never answers its own challenge, §2);
challenge is **single-use** (consumed on verify; replay → `already_used` before any refetch); the nine-step
journey ran **honestly** (`step_count=9`, `protocol_fetch_count=23`) with real blockers
(`TRUST_INVALID_ROOT_METADATA`, `CONFORMANCE_EVIDENCE_INCOMPLETE`, `EVIDENCE_BUNDLE_INVALID`), producing
`overall_status=FAILED`, `certification_status=NOT_CERTIFIED`, `certification_readiness=BLOCKED`,
**`external_model_calls=0`, `qwen_calls=0`**; reconciliation bound the candidate to the **existing** OZ
registry entry (**no duplicate**, never writes `/operators`), leaving `/operators = []`, 1 OZ public entry,
`operator_zero_public_entries=1`, `duplicates=0` (§5 metrics table L159-172). **Boundary reaffirmed (§7):**
OZ stays reference/sandbox — published, not production, real-money OFF, `NOT_CERTIFIED`.

---

## 6. The three load-bearing separations

### 6.1 Technical certification ≠ scheme admission ≠ regulatory authorisation (ADR-061)

Source: `decisions/adr/ADR-061-certification-admission-authorisation-separation.md` (Accepted, M2.19C).

**Three distinct determinations with distinct owners, evidence and effects; none implies, grants,
propagates to or substitutes for either of the others, and no surface may present them as equivalent or
as flowing automatically from one another** (Decision L30-33).

| Determination | Owner | What it is | Confers |
|---|---|---|---|
| **Technical Certification (L2)** | BANZA Governance, decided by the **Rust** conformance/interop engine on public profiles (D-061-08) | Per-implementation, evidence-based, Rust-decided, reproducible, hash-bound, scoped, time-limited (D-061-01) | *"this implementation passed this profile at this version with this evidence"* and **nothing more** — no status/licence/permission/authorisation |
| **Scheme Admission (L3)** | The **Banzami** (or any independent) scheme, under its own due diligence/eligibility/contracts (D-061-08) | A separate, later step (D-061-02) | Participation in *that* scheme; **may require** valid certification as prerequisite but is **never implied by** it |
| **Regulatory Authorisation** | The **competent regulator**, under the applicable legal framework (D-061-08) | The right to conduct regulated financial activity (D-061-03) | Authorisation; **BANZA is not a party** — does not grant/hold/represent/accelerate/substitute, issues no licence |

- **Certification never implies admission** (D-061-04); **admission never implies authorisation**
  (D-061-05); **non-propagation in ANY direction** — not forward, not backward (D-061-06).
- **No conflation on any surface** (D-061-07): no single "approved/verified" badge, no automatic pipeline.
  BanzAI explains the three separately; Rust validates the boundary before publishing.

### 6.2 Regulatory-state boundary + RealMoneyActivationGate (ADR-062)

Source: `decisions/adr/ADR-062-regulatory-state-boundary-and-real-money-gate.md` (Accepted, M2.19C).

- **State = `REGULATORY_AUTHORIZATION_IN_PROGRESS`** — internal, non-public-by-default, a **preparation**
  state that confers **no operational permission whatsoever** (D-062-01). It **does NOT mean**:
  authorisation granted; BNA approval; licence complete; regulatory recognition; active financial
  operation; permission to move funds; real settlement; active production participants (D-062-01;
  canonical negation list, `BANZAMI_OPERATIONAL_SCHEME.md` §6 L85-93).
- **Real money OFF (hard default, D-062-02):** real funds/wallets/settlement/participants/financial-clients
  all OFF while no applicable formal evidence exists.
- **Only sanctioned public phrasing (D-062-03):** *"A camada operacional encontra-se em preparação
  regulatória. Os pagamentos reais permanecem desactivados."*
- **No BNA-specific language today (D-062-04):** permitted only when all five conditions hold
  simultaneously — none holds at this milestone.
- **RealMoneyActivationGate (D-062-05):** a single, hard, **fail-closed**, **Rust-decided** gate; blocked
  unless ALL of ~18 conditions hold (regulatory authorisation, scope, environment, legal entity, eligible
  participants, contracts, AML/CFT, safeguarding, settlement, reconciliation, fraud controls, complaints,
  BCP, security, incident response, audit log, rollback, formal launch approval); any missing/unverified/
  unparsable condition keeps real money OFF.
- **The gate cannot be bypassed (D-062-06):** not via config, feature flag, admin action, direct API, CLI,
  natural-language instruction, or the Qwen layer; no back door / override endpoint / "test mode" /
  emergency flag. **State ≠ status claim** (D-062-07).

### 6.3 Conflict of interest + infrastructure/key separation (ADR-063)

Source: `decisions/adr/ADR-063-conflict-of-interest-and-domain-separation.md` (Accepted, M2.19C);
canonical matrix `docs/governance/BANZA_SEPARATION_MATRIX.md`.

Because BANZA's creator (Banzami, ADR-043) is also the first scheme operator (ADR-060), the conflict is
**controlled structurally, not by promise** (D-063-01):

- **No self-privilege (D-063-02, canonical form of D-060-05):** Banzami's own implementation is certified
  through the **same** public versioned profile, the **same** conformance/interop suites, the **same** Rust
  engine, reason codes, validity and revocation as any other, independently verifiable; **no** reduced
  profile, private certification, bypass, reserved endpoint, publication without evidence, FAIL→PASS
  override, or secret exception. A FAIL is a FAIL; no human converts it (ADR-038 INV-OTE-008).
- **Five separated infrastructures (D-063-03):** I1 Protocol (L1) · I2 Certification & Registry (L2) · I3
  BanzAI (transversal) · I4 Banzami Scheme (L3) · I5 Regulated data (L3, dormant/fail-closed until
  ADR-062). Each separates DB, schema, roles, keys, secrets, logs, backups, retention, pipelines,
  monitoring, permissions; no component of one domain may read/write/grant in another
  (`BANZA_SEPARATION_MATRIX.md` L20-58).
- **Eight domain-separated key domains, never reused (D-063-04; matrix K1–K8 L69-83):** K1 Protocol
  Metadata Signing (L1) · K2 Certification Registry Signing (L2) · K3 Certification Record Signing (L2) ·
  K4 BanzAI Service (I3) · K5 Banzami Scheme Administrative (L3) · K6 Banzami Scheme Operational (L3) · K7
  Operator Implementation Keys (operator-held, external) · K8 Future settlement keys (L3, dormant). The
  offline threshold trust root + delegated keys never reside on serving infrastructure (ADR-028); the root
  signs nothing about any operator (ADR-038 INV-OTE-009).
- **Same revocation/validity semantics for Banzami (D-063-05); independent verification needs no Banzami
  account (D-063-06).** Enforced by guards `banza-protocol-scheme-separation-check`,
  `banza-banzami-scheme-role-check`, `banza-regulatory-state-claim-check` + `identity-check` (D-063-07).

---

## 7. BANZA ≠ Banzami; the Banzami Operational Scheme (ADR-060)

Source: `decisions/adr/ADR-060-banzami-operational-scheme.md` (Accepted, M2.19C);
canonical doc `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md` (Status: Canónico).

- **Designated operator (D-060-01):** *"A Banzami é a operadora designada do Banzami Operational Scheme,
  condicionada à obtenção do enquadramento regulatório necessário para operações com fundos reais."* This
  designation does **not** make BANZA an operator, does **not** make certification exclusive to the scheme,
  and does **not**, by itself, authorise any real-money operation.
- **BANZA ≠ Banzami (D-060-02):** L1 + L2 are operator-neutral and are **not** the property, product or
  governance of Banzami; Banzami is an institutional/scheme role, **not added to `NORMATIVE_BRANDS`** and
  never presented as a BANZA payment operator (Consequences "Untouched" L58-60).
- **Certification not exclusive to the scheme (D-060-03):** certified against a public profile, never
  "certified for the Banzami scheme"; an implementation may be certified without ever being admitted.
- **Openness to other operators/schemes (D-060-04):** other legally-eligible entities may operate
  **independent** schemes; the architecture MUST NOT assume only one scheme or one operator can exist.
- **No self-privilege (D-060-05)** [→ ADR-063 §6.3]; **Registry ≠ directory (D-060-06)**; **protocol
  continuity independent of the scheme (D-060-07)**; **no unproven authorisation claim (D-060-08):** never
  presented as already authorised/licensed/approved; state `REGULATORY_AUTHORIZATION_IN_PROGRESS`, every
  real-money path fail-closed until ADR-062.
- **Neutrality survives the scheme (ADR-059 D-059-07):** BANZA certification is not exclusive to Banzami;
  if the scheme changed/paused/ceased, the protocol/specs/engines/vectors/certification/registry remain
  available to all — the ADR-001 survival criterion applies to the scheme relationship too.

**Attribution vs operation.** ADR-043 already names Banzami as **creator + initial institutional
maintainer** (a governance/attribution role); ADR-060 adds the distinct **L3 designated-operator** role.
These are different hats on one company; the whitepaper must not collapse them.

---

## 8. Foundational ADRs that the three-layer model rests on

| ADR | Role for the whitepaper |
|---|---|
| **ADR-001 / ADR-003** | Open financial protocol; operator neutrality/separation; the protocol **outlives any operator** — the permanent invariant the whole architecture preserves. |
| **ADR-037** (Accepted) | **Rust-first official engines.** Every official BANZA/BanzAI *engine* (conformance, crypto/trust, invariant checking, BanzAI retrieval/scoring/guards, provider routing, semantic validation, evidence-bundle generation) is Rust; TS/JS is UI/glue only; Python temporary legacy; Bash orchestration. **Operators stay technology-neutral** — the rule binds only official implementations. This is the technical basis of "Rust decides". |
| **ADR-038** (Accepted) | **Open trust model without a CA.** Removes CA/certificate-based operator trust; replaces it with **Open Trust Evaluation** = Public Registry metadata + signed protocol metadata + conformance evidence + manifest compatibility + trust-root/delegated-signature verification + revocation/fail-closed. `INV-OTE-001…010`. No BANZA-issued artifact about an operator; no human step; the Trust Root signs **protocol metadata/releases/delegated keys/revocations only**, never operators/payments (INV-OTE-009). Registry is an index (grants nothing; absence forbids nothing). |
| **ADR-040** (Accepted) | **Federation trust evaluation without certificates** — the ten-check normative application of ADR-038 to federation routing; `INV-FEDEVAL-001…010`; BANZA is not in the trust path at all. |
| **ADR-039** (Accepted) | Operator self-publication + machine-verifiable conformance (the publication side of the open trust model). |
| **ADR-058** (Accepted, M2.19B) | **Trust-invariant registry realignment** — retires the legacy trust-invariant namespace, re-homes statements to `INV-OTE-*`/`INV-FEDEVAL-*`/`INV-ROOT-*`, and **removes residual operator-certificate artifacts** (the `CERT-*.json` fixtures, `certificate_url`, `/certificates` route, and the `certificates` table + `certification_level`/`certificate_id` columns in the protocol-state schema, D-058-06). Confirms the "no CA / no operator certificate" boundary is now structural at every layer. |
| **ADR-042** (Accepted) | **PostgreSQL = protocol-state store, not a financial ledger.** Stores signed trust artifacts, public registry, conformance evidence **hashes**, the BanzAI document index, and an append-only audit log; **never** funds/balances/real transactions/PII/private keys. The financial invariants are rules the protocol *defines*, not a ledger it *operates*. |
| **ADR-054** (Accepted, M2.14I) | **BanzAI = primary human-operator interface**, **not** normative/authority/certifier/approver/licenser/PSP, **not** a mandatory machine gate. Canonical phrase: *"BanzAI guia; os motores verificam; a evidência prova; a governança decide."* |
| **ADR-041** (Accepted) | BanzAI = native, non-authoritative protocol agent; rule-provenance rule (may only guide from existing normative sources; must say "not defined" when a source is missing; may draft but never activate rules). |
| **ADR-055 / ADR-056** (Accepted) | BanzAI Rust-first grounded synthesis (ADR-055) and definitive query core + production assurance (ADR-056) — how BanzAI's *explanation* layer is built (one Qwen synthesis validated by Rust). Relevant only to substantiate "Qwen explains once; Rust validates". |
| **ADR-044…051** (Accepted) | BanzAI local-Qwen runtime + routing/latency/metadata detail — supporting evidence that the model is local and never external (`external_model_called=false`). |
| **ADR-052 / ADR-053** (Accepted) | **Operador Zero** = reference payment-operator **simulator**, `demo_only`, currency `KZ_DEMO`, moves no real funds, never appears in `/operators` as a real operator, represents no authorisation/certification/licence; and the **Operator-Zero-Only** demo/example policy (no parallel example operators). *"Operador Zero prova a arquitectura; Banzami prova o mundo real."* |
| **ADR-067** (Accepted, M2.19E/F) | **Operador Zero = read-only canonical reference implementation**, validated in BanzAI **validation mode** (`/banzai?mode=validation&target=operator-zero&workflow=full`). It **exposes** its surface (identity/manifest/keys/metadata/evidence/status) and **runs nothing** (no simulation, no mutable ledger, no self-certification); the nine steps are executed by Rust; every step → `OperationReceipt`, run → `JourneyReceipt`; honest categorical status; being demo (`production_allowed=false`) ⇒ **`NOT_CERTIFIED` / `PRE_PRODUCTION`**; **certification readiness is not certification issued**. |
| **ADR-021** | Conformance level (L0–L4) capability alignment — the *conformance-level* axis (see §9 hazard). |
| **ADR-057** (Accepted) | Current-only canonical ADR tree; numbering gaps (004/022/026/027/032) are intentional removals. |

---

## 9. Risks, ambiguities and obsolete terminology (for the whitepaper authors)

### 9.1 OBSOLETE terminology found on an active canonical surface

- **`docs/reference/pt/completa.md` L685** still lists a **`certificates` table** as public-registry
  content: *"`operators` (auto-publicado) e `certificates` (emissão condicionada às condições de
  produção)."* This is **obsolete**: ADR-058 D-058-06 removed the `certificates` table (and
  `certificate_id`/`certification_level` columns) from the protocol-state schema; the live schema
  `infra/banza-network/postgres/init/001_schema.sql` confirms **no `certificates` table** (its only
  "certificate" mention is the negation at L24: *"BANZA issues nothing to operators (ADR-038): no
  certificate"*). The whitepaper must **not** describe an "emitted certificate" table; L2 uses a
  per-implementation `CertificationRecord` in the Technical Registry.

*(Note: all `"BANZA CA"` / `"operator certificate"` hits elsewhere on active surfaces — ADR-038, ADR-057,
ADR-058, ADR-064 L30/L46, `BANZA_SVG_REGISTRY.md` L363 "não uma quarta camada" — are **negations or
historical references** describing the removed model, not live claims. They are correct.)*

### 9.2 The canonical Reference predates the three-layer architecture (divergence risk)

The canonical protocol Reference — `docs/reference/pt/completa.md` (Data 2026-06-07, última revisão
2026-07-11) and `docs/reference/en/complete.md` — was **last touched at M2.19B** (commit `b15851b`,
ADR-058), i.e. **before** M2.19C (three-layer, ADR-059..063) and M2.19D (L2 cert, ADR-064..066). It
contains **zero** occurrences of "three-layer / três camadas / Banzami Operational Scheme / Technical
Registry / scheme admission" (verified: `en/complete.md` = 0; the 7 "Banzami" hits in PT are
attribution/trademark/governance per ADR-043, **not** the L3 designated-operator scheme). It still frames
the architecture as the pre-M2.19 "protocolo · BanzAI · operadores + Public Protocol Registry + Open Trust
Evaluation" model (L118, L685, L1525). **Implication:** the whitepaper's three-layer / L2-certification /
L3-scheme material must be sourced from **ADR-059..066 + `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md`
+ `BANZAMI_OPERATIONAL_SCHEME.md` + `BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md` + `BANZA_SEPARATION_MATRIX.md`
+ `BANZA_RESPONSIBILITY_MATRIX.md`**, NOT from the reference chapters, which are stale on this topic. The
current three-layer public surface is the website (M2.19G, new `/certificacao`, `/registo-tecnico`,
`/glossario`), reported in `docs/reports/M2_19G_*`.

### 9.3 "L2 / L3 / L4" token overload (load-bearing ambiguity)

The tokens **L1/L2/L3** mean **two different things** and both are current:
1. **Institutional Layers** (ADR-059): L1 = BANZA Protocol, L2 = Conformance & Interoperability
   Certification, L3 = Banzami Operational Scheme.
2. **Conformance readiness Levels** (ADR-021/038, `certification-boundary.md` L83-89): L0 Protocol Sandbox,
   L1 Core Payment Capability, **L2 Payment Initiation Capability**, L3 Inter-Operator Interoperability,
   L4 External Interoperability.

So "L2" is simultaneously the *Certification layer* and the *Payment Initiation Capability level*; "L3" is
both the *Operational-Scheme layer* and the *Inter-Operator Interoperability level*. The whitepaper MUST
disambiguate explicitly (suggest: "Layer 1/2/3" for the institutional axis, "Level 0–4 / L0–L4" for the
conformance axis) or readers will conflate them.

### 9.4 ADR index is incomplete (inventory-completeness risk)

`decisions/adr/README.md` "Active ADRs" table lists ADRs **only through ADR-067**; it **omits ADR-068 and
ADR-069**, both `Accepted`. The whitepaper's ADR inventory should use the full corpus (§10), not the README
table.

### 9.5 Minor status flags

`ADR-035` (Deploy model) is `Proposed`; `ADR-018` (merchant refundable-source reference) is
`DRAFT / PROPOSED / NOT NORMATIVE`. Both are peripheral to the whitepaper's architecture thesis; do not
cite them as settled architecture.

---

## 10. ADR inventory (id → title → status → relevance to the paper)

Relevance key: **CORE** = central to the three-layer / certification / trust thesis · **SUPP** = supporting
· **PERIPH** = payments/product detail, peripheral to the architecture chapter. All statuses read from each
file's header on 2026-07-30.

| ADR | Title | Status | Relevance |
|---|---|---|---|
| 001 | BANZA as Open Financial Protocol | Accepted | **CORE** — protocol independence, survival criterion |
| 002 | Ecosystem Naming Inversion | Accepted | SUPP — BANZA/BanzAI/operator naming |
| 003 | Protocol/Operator Separation | Accepted | **CORE** — operator neutrality |
| 005 | Protocol-first product development | Accepted | SUPP — specs ship before implementations |
| 006 | Double-Entry Ledger and Monetary Precision | Accepted | PERIPH — financial invariant source |
| 007 | Double-Entry Invariant: Enforcement | Accepted | PERIPH |
| 008 | Markdown-First Content Architecture | Accepted | SUPP — reference is single source of truth |
| 009 | Provider Abstraction Model | Accepted | PERIPH |
| 010 | Account/Participant Identity Model | Accepted | PERIPH |
| 011 | Idempotency and Rate Limiting | Accepted | PERIPH — INV-IDEM-* |
| 012 | QR Code Payment System | Accepted | PERIPH — INV-QR-* |
| 013 | Payment Links | Accepted | PERIPH |
| 014 | Payment Intent | Accepted | PERIPH |
| 015 | Payment Session (unified payment interface) | Accepted | PERIPH |
| 016 | Payment Collections | Accepted | PERIPH |
| 017 | Wallet/account merchant payments + refund source | Accepted | PERIPH |
| 018 | Merchant refundable-source reference | **Draft/Proposed** | PERIPH — not settled |
| 019 | Fee & Application-Settlement Architecture | Accepted | PERIPH |
| 020 | Wallet Accounts (segregated) | Accepted | PERIPH |
| 021 | Conformance level capability alignment (L0–L4) | Accepted | **CORE** — the conformance-level axis (see §9.3) |
| 023 | Transaction Proof Standard | Accepted | PERIPH |
| 024 | Public Verification Pages | Accepted | SUPP |
| 025 | Interactive Financial Documents | Accepted | PERIPH |
| 028 | Private keys never on serving infrastructure | Accepted | **CORE** — key custody, root offline |
| 029 | KYC stays operator policy; only Trust Assertions federate | Accepted | SUPP — KYC boundary |
| 030 | Environment Isolation: Sandbox vs Production | Accepted | SUPP |
| 031 | Canonical verification routes + honest empty-state | Accepted | SUPP — `/operators=[]`, `production_certificates=false` |
| 033 | Dedicated independent infrastructure | Accepted | SUPP — infra independence |
| 034 | Dedicated PostgreSQL + encrypted backups | Accepted | SUPP |
| 035 | Deploy model (Docker Compose, pinned images) | **Proposed** | PERIPH |
| 036 | DNS and TLS | Accepted | PERIPH |
| 037 | Rust-first official engines | Accepted | **CORE** — "Rust decides"; operator tech-neutrality |
| 038 | Open Protocol Trust Model Without CA | Accepted | **CORE** — Open Trust Evaluation, no CA, INV-OTE-* |
| 039 | Operator Self-Publication + machine-verifiable conformance | Accepted | **CORE** — self-publication side |
| 040 | Federation Trust Evaluation Without Certificates | Accepted | **CORE** — 10 checks, INV-FEDEVAL-* |
| 041 | BanzAI as Native Protocol Agent | Accepted | **CORE** — non-authoritative agent, rule provenance |
| 042 | PostgreSQL as Protocol State Store, not a Ledger | Accepted | **CORE** — data boundary |
| 043 | License, Notice, Trademark, Open Governance Attribution | Accepted | **CORE** — Banzami = creator/initial maintainer |
| 044 | BanzAI Local Qwen Inference Runtime | Accepted | SUPP — local model, external=false |
| 045 | BanzAI Local Qwen Latency Tuning | Accepted | PERIPH |
| 046 | BanzAI Disable Qwen Reasoning / Warmup | Accepted | PERIPH |
| 047 | BanzAI local_qwen 384-token default | Accepted | PERIPH |
| 048 | BanzAI Qwen-first Grounded Routing | Accepted | SUPP |
| 049 | BanzAI Protocol Agent Core | Accepted | SUPP |
| 050 | BanzAI Unified Same-Origin Public Interface | Accepted | SUPP |
| 051 | BanzAI Per-Answer Execution-Path Metadata | Accepted | SUPP — execution-path honesty |
| 052 | Operador Zero reference payment-operator simulator | Accepted | **CORE** — reference impl, demo-only |
| 053 | Operator Zero Only demo/example policy | Accepted | SUPP |
| 054 | BanzAI as Primary Human-Operator Interface | Accepted | **CORE** — BanzAI role + boundary |
| 055 | Rust-First Grounded Synthesis for BanzAI | Accepted | SUPP — Qwen explains, Rust validates |
| 056 | Definitive Query Core + Production Assurance for BanzAI | Accepted | SUPP |
| 057 | Current-Only Canonical ADR Tree | Accepted | SUPP — numbering gaps intentional |
| 058 | Trust Invariant Registry Realignment (retire the legacy trust-invariant family) | Accepted | **CORE** — no CA / no operator-cert, INV-OTE/FEDEVAL/ROOT |
| 059 | BANZA Three-Layer Institutional Architecture | Accepted | **CORE** — the frame |
| 060 | Banzami Operational Scheme (BANZA ≠ Banzami) | Accepted | **CORE** — L3, designated operator |
| 061 | Certification ≠ Admission ≠ Authorisation | Accepted | **CORE** — the three-way separation |
| 062 | Regulatory-State Boundary + RealMoneyActivationGate | Accepted | **CORE** — real-money gate, fail-closed |
| 063 | Conflict of Interest + Infra/Key Separation | Accepted | **CORE** — five infra, eight keys, no self-privilege |
| 064 | Conformance & Interoperability Certification (Layer 2) | Accepted | **CORE** — L2 object model |
| 065 | BANZA Technical Registry | Accepted | **CORE** — L2 public registry, ≠ scheme directory |
| 066 | Closed Certification-State Machine | Accepted | **CORE** — 6-state closed lifecycle |
| 067 | Operador Zero read-only reference + BanzAI validation mode | Accepted | **CORE** — read-only reference impl |
| 068 | Endpoint-Originated Validation + Operator–Implementation Model | Accepted | **CORE** — operator≠impl, endpoint-originated |
| 069 | Simple & Secure Operator Onboarding | Accepted | **CORE** — passwordless OTP + origin proof, open-boundary |

*(Numbering gaps 004/022/026/027/032 are intentional removals under ADR-057; survivors are never
renumbered — `decisions/adr/README.md` L76.)*

---

## 11. Canonical phrases the whitepaper can quote (verbatim, grounded)

- **Authority rule:** *"Rust understands, routes, executes, validates and DECIDES. Qwen (local) explains
  once. Rust validates before publishing."* (ADR-059 D-059-05).
- **BanzAI boundary:** *"BanzAI guia; os motores verificam; a evidência prova; a governança decide."*
  (ADR-054 L53).
- **Separation:** *"Certificação técnica ≠ admissão a scheme ≠ autorização regulatória. As três são
  determinações distintas, com donos distintos, e nenhuma implica as outras."* (ADR-061 §Canonical
  definitions).
- **BANZA ≠ Banzami:** *"O BANZA é um protocolo financeiro aberto — e BANZA ≠ Banzami."*
  (`BANZAMI_OPERATIONAL_SCHEME.md` L11).
- **Prudent public regulatory-state phrasing:** *"A camada operacional encontra-se em preparação
  regulatória. Os pagamentos reais permanecem desactivados."* (ADR-062 D-062-03).
- **Operador Zero vs Banzami:** *"Operador Zero prova a arquitectura; Banzami prova o mundo real."*
  (ADR-052 L73).
- **Responsibility spine:** *"A Governança define o protocolo; o Rust avalia e decide; o Registo publica;
  o BanzAI orienta; o Qwen explica uma vez; a Banzami opera o scheme; o regulador autoriza; os
  participantes prestam os serviços."* (`BANZA_RESPONSIBILITY_MATRIX.md` L6-7).
