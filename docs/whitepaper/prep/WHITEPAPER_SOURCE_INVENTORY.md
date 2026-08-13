# Whitepaper Source Inventory & Documented-Divergences Register

> **Deliverable.** Gate-A prep artifact for the **BANZA Whitepaper v1.0** (non-normative,
> scientific-technical, operator-neutral). It fixes (a) the **canonical BANZA source list** the paper is
> allowed to draw on, each with a one-line relevance, and (b) a **Documented Divergences register** that
> captures every conflict the six prep audits found — **without reconciling any of them silently**.
>
> **WP1 (whitepaper track) constraint.** WP1 authors prose. WP1 **must not modify engines, contracts,
> `docs/reference/**`, or any M2.19 surface** to make a divergence disappear. Every divergence below is
> recorded as a *documented* condition the paper writes around; reconciliation, where warranted, belongs
> to the engines/contracts/reference tracks, not to the whitepaper.
>
> **Grounding.** Built from the six audits in `docs/whitepaper/prep/audit/01..06-*.md` and re-verified
> against the cited repo files (paths + lines below were opened for this inventory on 2026-07-30). Nothing
> here is fabricated.

---

## 0. Binding facts the paper enforces (disambiguations, never to be conflated)

These are the invariants the inventory is organised around; every source and every divergence is read
through them.

- **Three institutional LAYERS (ADR-059)** — **L1** BANZA Protocol · **L2** Conformance &
  Interoperability Certification · **L3** Operational Schemes (Banzami Operational Scheme = first
  intended scheme). These are **distinct** from the conformance **PROFILES L0–L4** (ADR-021/038) and from
  the `banza-lN-readiness` **engines**. The paper writes "Layer 1/2/3" for the institutional axis and
  "Level 0–4 / L0–L4" for the conformance axis, and never crosses them. (Hazard T-1 below.)
- **Two meanings of "certification"** — the nine-step journey's **step-9 Certification *Readiness***
  (`banza-target-registry`; **never returns `CERTIFIED`**) vs the **`banza-certification` authority
  engine** (can emit `CERTIFIED`). **The journey never certifies.** (Hazard T-2 below.)
- **Three distinct "registry" surfaces, each named explicitly** — (1) the **closed BANZA Technical
  Registry** (validation targets / public read-only state, `banza-target-registry`, feeds `/operators`);
  (2) the **Public Protocol Registry** anchor referenced by INV-FEDEVAL-008; (3) the **private Candidate
  Registry** (onboarding, `banzai-onboarding`, **not** protocol core). (Hazard T-3 + Divergence D-6.)
- **operator (entity) ≠ implementation (technical system).** Certification is **per-implementation**,
  bound to `implementation_hash`, scoped to profile+version+environment+scope+evidence+validity; it is
  **not** a CA signature and there is **no certificate chain** (ADR-064/066).
- **Rust EXECUTES + DECIDES; Qwen only EXPLAINS** (never certifies/publishes/revokes/approves/decides);
  **BanzAI is a transversal interface, not a 4th layer, not an authority** (ADR-054/059/041).
- **BANZA is not a bank/PSP/wallet/operator; moves no funds.** Certification ≠ scheme admission ≠
  regulatory authorisation (ADR-061). Banzami L3 regulatory state =
  `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money OFF (ADR-062).
- **Operador Zero** = sandbox reference implementation, read-only, `KZ_DEMO` currency, no real funds,
  `NOT_CERTIFIED`, not production (ADR-052/053/067).
- **Legal name canonical form:** `BANZAMI – Tecnologia e Serviços, Lda.` (public short form **Banzami**).
  **Authors:** Fidel R. Monteiro (first, locked), Jesus R. Monteiro; co-founders of Banzami. No
  DOI/ISBN/ISSN.
- **The Whitepaper is non-normative** — no MUST/SHALL of its own except when directly quoting the
  Reference/contracts. Forbidden self-claims: *first / only / revolutionary / unprecedented /
  fully-decentralised / trustless / guaranteed / regulator-approved / production-proven / real-funds.*

---

# PART A — Canonical source list

Everything the whitepaper is permitted to ground on. Ordering within each table follows the corpus, not
importance. **Relevance key:** **CORE** = central to the three-layer / certification / trust thesis ·
**SUPP** = supporting · **PERIPH** = payments/product detail, peripheral to the architecture chapter.

## A.1 ADR corpus (id → title → status → one-line relevance)

Statuses read from each ADR header on 2026-07-30. Numbering gaps 004/022/026/027/032 are intentional
removals under ADR-057. The ADR README table is **incomplete** (lists through ADR-067 only, omits 068/069,
both Accepted — audit 01 §9.4); this inventory uses the full corpus, not the README.

| ADR | Title | Status | Relevance (one line) |
|---|---|---|---|
| 001 | BANZA as Open Financial Protocol | Accepted | **CORE** — protocol independence; the survival criterion the whole architecture preserves |
| 002 | Ecosystem Naming Inversion | Accepted | SUPP — BANZA / BanzAI / operator naming |
| 003 | Protocol/Operator Separation | Accepted | **CORE** — operator neutrality is architectural, not branding |
| 005 | Protocol-first product development | Accepted | SUPP — specs ship before implementations |
| 006 | Double-Entry Ledger and Monetary Precision | Accepted | PERIPH — source of the financial invariants BANZA *defines* |
| 007 | Double-Entry Invariant Enforcement | Accepted | PERIPH |
| 008 | Markdown-First Content Architecture | Accepted | SUPP — reference as single source of truth |
| 009 | Provider Abstraction Model | Accepted | PERIPH |
| 010 | Account/Participant Identity Model | Accepted | PERIPH |
| 011 | Idempotency and Rate Limiting | Accepted | PERIPH — INV-IDEM-* |
| 012 | QR Code Payment System | Accepted | PERIPH — INV-QR-* |
| 013 | Payment Links | Accepted | PERIPH |
| 014 | Payment Intent | Accepted | PERIPH |
| 015 | Payment Session | Accepted | PERIPH |
| 016 | Payment Collections | Accepted | PERIPH — INV-COLLECTION-* |
| 017 | Wallet/account merchant payments + refund source | Accepted | PERIPH |
| 018 | Merchant refundable-source reference | **Draft/Proposed** | PERIPH — **not settled**; do not cite as architecture |
| 019 | Fee & Application-Settlement Architecture | Accepted | PERIPH |
| 020 | Wallet Accounts (segregated) | Accepted | PERIPH |
| 021 | Conformance level capability alignment (L0–L4) | Accepted | **CORE** — the conformance-**level** axis (see T-1) |
| 023 | Transaction Proof Standard | Accepted | PERIPH |
| 024 | Public Verification Pages | Accepted | SUPP |
| 025 | Interactive Financial Documents | Accepted | PERIPH |
| 028 | Private keys never on serving infrastructure | Accepted | **CORE** — key custody; offline root |
| 029 | KYC stays operator policy; only Trust Assertions federate | Accepted | SUPP — KYC boundary |
| 030 | Environment Isolation: Sandbox vs Production | Accepted | SUPP |
| 031 | Canonical verification routes + honest empty-state | Accepted | SUPP — `/operators=[]`, `production_certificates=false` |
| 033 | Dedicated independent infrastructure | Accepted | SUPP — infra independence |
| 034 | Dedicated PostgreSQL + encrypted backups | Accepted | SUPP |
| 035 | Deploy model (Docker Compose, pinned images) | **Proposed** | PERIPH — not settled |
| 036 | DNS and TLS | Accepted | PERIPH |
| 037 | Rust-first official engines | Accepted | **CORE** — technical basis of "Rust decides"; operator tech-neutrality |
| 038 | Open Protocol Trust Model Without CA | Accepted | **CORE** — Open Trust Evaluation, no CA, INV-OTE-* |
| 039 | Operator Self-Publication + machine-verifiable conformance | Accepted | **CORE** — the self-publication side of open trust |
| 040 | Federation Trust Evaluation Without Certificates | Accepted | **CORE** — ten fail-closed checks, INV-FEDEVAL-* |
| 041 | BanzAI as Native Protocol Agent | Accepted | **CORE** — non-authoritative agent; rule-provenance |
| 042 | PostgreSQL as Protocol-State Store, not a Ledger | Accepted | **CORE** — data boundary (no funds/balances/PII/keys) |
| 043 | License, Notice, Trademark, Open Governance Attribution | Accepted | **CORE** — Banzami = creator + initial maintainer (attribution role) |
| 044 | BanzAI Local Qwen Inference Runtime | Accepted | SUPP — local model, `external_model_called=false` |
| 045–051 | BanzAI Qwen latency / routing / execution-path metadata | Accepted | PERIPH/SUPP — substantiates "Qwen explains once; local; never external" |
| 052 | Operador Zero reference payment-operator simulator | Accepted | **CORE** — reference impl, `demo_only`, `KZ_DEMO`, moves no real funds |
| 053 | Operator-Zero-Only demo/example policy | Accepted | SUPP — no parallel example operators |
| 054 | BanzAI as Primary Human-Operator Interface | Accepted | **CORE** — interface role + boundary (not normative/authority) |
| 055 | Rust-First Grounded Synthesis for BanzAI | Accepted | SUPP — one Qwen synthesis validated by Rust |
| 056 | Definitive Query Core + Production Assurance for BanzAI | Accepted | SUPP |
| 057 | Current-Only Canonical ADR Tree | Accepted | SUPP — numbering gaps intentional; retirement map |
| 058 | Trust-Invariant Registry Realignment (retire the legacy trust-invariant family) | Accepted | **CORE** — no CA / no operator-cert; removed `certificates` table (D-058-06) |
| 059 | Three-Layer Institutional Architecture | Accepted | **CORE** — the frame (L1/L2/L3; BanzAI transversal) |
| 060 | Banzami Operational Scheme (BANZA ≠ Banzami) | Accepted | **CORE** — L3 designated operator; scheme non-exclusivity |
| 061 | Certification ≠ Admission ≠ Authorisation | Accepted | **CORE** — the three-way separation, non-propagation |
| 062 | Regulatory-State Boundary + RealMoneyActivationGate | Accepted | **CORE** — real-money gate, fail-closed; `REGULATORY_AUTHORIZATION_IN_PROGRESS` |
| 063 | Conflict of Interest + Infra/Key Separation | Accepted | **CORE** — five infra domains, eight key domains, no self-privilege |
| 064 | Conformance & Interoperability Certification (Layer 2) | Accepted | **CORE** — three-object model; per-implementation; no cert chain |
| 065 | BANZA Technical Registry | Accepted | **CORE** — closed public L2 index; registry ≠ scheme directory |
| 066 | Closed Certification-State Machine | Accepted | **CORE** — 6-state closed lifecycle; fail-closed; REVOKED terminal |
| 067 | Operador Zero read-only reference + BanzAI validation mode | Accepted | **CORE** — read-only reference impl; readiness ≠ certification |
| 068 | Endpoint-Originated Validation + Operator–Implementation Model | Accepted | **CORE** — operator ≠ impl; artifacts only from public endpoints |
| 069 | Simple & Secure Operator Onboarding | Accepted | **CORE** — hosted BanzAI service (not protocol rule); origin proof; open-boundary preserved |

## A.2 Governance / canonical human-readable docs

The three-layer, L2-certification, and L3-scheme material is sourced **from these + the ADRs + the
production contracts**, never from the Reference chapters (see Divergence D-2).

| Doc (`docs/governance/…`) | One-line relevance |
|---|---|
| `BANZA_THREE_LAYER_ARCHITECTURE.md` | Canonical human form of ADR-059; L1/L2/L3, the three load-bearing separations, dependency graph |
| `BANZAMI_OPERATIONAL_SCHEME.md` | Canonical form of ADR-060; L3 designated operator; scheme non-exclusivity; "BANZA ≠ Banzami" |
| `BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md` | Canonical form of ADR-064; the three-object certification model |
| `BANZA_SEPARATION_MATRIX.md` | ADR-063 five infrastructures (I1–I5) + eight key domains (K1–K8) |
| `BANZA_CONFLICT_OF_INTEREST_POLICY.md` | ADR-063 controls C1–C6; no self-privilege for Banzami's own implementation |
| `BANZA_REGULATORY_CLAIM_POLICY.md` | ADR-062 sanctioned public phrasing; five gate conditions (all fail today); no BNA language |
| `BANZA_RESPONSIBILITY_MATRIX.md` | Responsibility spine (governance defines · Rust decides · Registry publishes · BanzAI orients · Qwen explains · scheme operates · regulator authorises) |
| `BANZA_TRUST_ARCHITECTURE.md` | Active open trust model (Trust Root, delegated keys, signed metadata, evidence, registry, revocation/fail-closed) — no active "BANZA CA" claim |
| `BANZAI_NATIVE_PROTOCOL_AGENT.md` | ADR-041 rule-provenance; demonstration/pre-production posture (`llm_calls=0`) |
| `licensing.md` | Docs published under **CC BY 4.0**; code/contracts/spec/conformance Apache-2.0 — the paper's licence |
| `GOVERNANCE.md`, `MAINTAINERS.md`, `NOTICE`, `TRADEMARKS.md` (root) | Open governance; Banzami as creator + initial maintainer; legal name; marks grant no rights beyond attribution |

## A.3 `contracts/invariants.json` — invariant families (single source of truth)

`contracts/invariants.json` (schema_version 1, spec_version 1.0) is the single machine-readable source of
truth; where a prose doc and the registry disagree, "this registry's `statement` plus its cited `source`
govern" (`invariants.json:6`). Cite invariant **statements**, **not** the `source` line numbers — several
have rotted after the M2.19 Reference rewrite (Divergence-adjacent risk; audit 04 R-2).

| Family | One-line relevance |
|---|---|
| **LEDGER** (`INV-LEDGER-*`) | Double-entry integrity: balance, immutability, integer precision, atomicity — a rule BANZA *defines*, not a ledger it runs |
| **WALLET** (`INV-WALLET-*`) | Ledger-derived, non-negative balances; reserved/available identity |
| **SETTLE** (`INV-STL-*`; alias `INV-SETTLE-*`) | Amount identity `gross=net+fee`; no negative balances; immutable batches |
| **IDEM** (`INV-IDEM-*`) | Idempotency / replay safety |
| **RECON** (alias → `INV-FED-RECON-001`) | External reconcilability via `trace_id` |
| **QR** (`INV-QR-*`) | Single-use, expiry, atomicity, signature, environment binding |
| **TRACE** | Causal traceability across the event chain |
| **IDENT** | Wallet-native identity uniqueness |
| **EVENT** | Event-stream integrity: id uniqueness, timestamp immutability |
| **MON** (`MON-001` / `INV-MON-001`) | Integer minor units across the whole surface |
| **OTE** (`INV-OTE-001..010`, ADR-038) | Open Trust Evaluation without a CA; **INV-OTE-007** no BANZA-issued artifact is an input; **INV-OTE-008** no human decision is an input; **INV-OTE-009** root signs nothing about operators |
| **FEDEVAL** (`INV-FEDEVAL-001..010`, ADR-040) | Ten conjunctive, locally-executed, fail-closed federation-routing checks; **INV-FEDEVAL-008** registry listing is not a check |
| **ROOT** (`INV-ROOT-001..010`) | Key-management integrity; **INV-ROOT-004** root signs only Key Manifests; **INV-ROOT-005** BRL signed by the revocation-domain key; **INV-ROOT-007** threshold custody (see Divergence D-1) |
| **FED** (`INV-FED-*`) | Cross-operator trace identity, obligations, value conservation, revocation, reconcilability |
| **COLLECTION** (`INV-COLLECTION-001..008`) | Splits hold no value; amount identity; terminal shares; idempotent creation |

## A.4 Engines (`engines/**`, Rust — ADR-037)

The paper's "Rust executes + decides" claim rests on these. **On-journey** = imported by the
endpoint-originated validator (`services/banzai-api/src/validate.js`).

| Engine | One-line relevance | On 9-step journey |
|---|---|---|
| `banza-artifact-fetcher` (`banza-fetcher`) | The **only** component that reaches operator public endpoints; SSRF-hardened Rust | Yes (transport for every fetch) |
| `banza-target-registry` | Closed **Technical Registry** + resolution/eligibility + step-verdict mapper + **Certification *Readiness*** aggregate (never `CERTIFIED`) | Yes (discovery + certification steps) |
| `banza-operator-manifest` | Deterministic OperatorManifest validation (MAN-001..004) | Yes (manifest) |
| `banza-trust` | Ed25519 / ADR-038 canonical-JSON evaluation of signed metadata, keys, revocation; fail-closed | Yes (keys + trust) |
| `banza-conformance` | Offline conformance runner: vector-integrity + invariant + level + report | Yes (conformance) |
| `banza-l2-readiness` | L2 **payment-flow** profile prep (intent, idempotency, ledger, trace, settlement) — a **Level** engine, not "Layer 2" | Yes (interoperability) |
| `banza-l3-readiness` | L3 **federation** profile prep (pair, intent, cross-operator trace) — a **Level** engine, not "Layer 3" | Yes (federation) |
| `banza-evidence-bundle` | Assembles the technical evidence bundle; computes readiness + SHA-256; `not_a_certificate=true`; **never certifies** | Yes (evidence) |
| `banza-certification` | The deterministic Rust **authority** for L2 certification (ADR-064/065/066); closed 6-state machine; **can emit `CERTIFIED`** | **No** — separate authority path, not the journey |
| `banza-l1-readiness` / `banza-l4-readiness` | L1 / L4 conformance-profile preparation surfaces | No |
| `banzai-onboarding` | Pure-Rust onboarding security-decision engine (ADR-069); **private Candidate Registry**; not protocol core | No (adjacent) |
| `operator-zero-core` / `operator-zero-e2e-root` | Rust engine + demo-only ephemeral signing root behind the Operador Zero sandbox reference | No (produces the target's artifacts) |
| `banza-simb` | In-process Rust simulator of a peer; mandatory pre-review; test-only | No |
| `banza-root-ceremony` / `-cli` | Offline threshold root-ceremony verify (custodian air-gapped tool) | No |
| `banza-open-governance` / `banza-reference-trust-model` / `banza-m2-protocol-gate` / `banza-security-assurance` | Governance-package / trust-model-purity / protocol-package / security-baseline validators | No |
| `banza-repo-guards` / `rust-rule-guard` | Repo-hygiene gates + ADR-037 non-Rust-engine block | No |
| `banzai-api-kb` / `banzai-query-core` / `banzai-evidence` / `banzai-doc-indexer` / `banzai-repo-indexer` / `banzai-operator-journey` | BanzAI retrieval / query-core / evidence / indexers / guided-journey state machine (explanation plane) | No |

## A.5 Contracts & production schemas (`contracts/**`)

35 `*.production.schema.json` schemas plus OpenAPI, events, QR, and federation contracts. The
whitepaper's certification / trust / receipt / regulatory-state claims are grounded here.

| Schema / contract | One-line relevance |
|---|---|
| `certified-implementation.production.schema.json` | Subject is an **implementation** (`implementation_id` + content hash of tested artifacts); never an entity/brand |
| `certification-profile.production.schema.json` | Public, versioned yardstick; derived only from L1 contracts; `validity_days` never open-ended |
| `certification-record.production.schema.json` | The verdict; closed status enum, all-but-CERTIFIED fail-closed; bound to `implementation_hash`+profile+scope+validity+`record_hash`; **not a licence/admission/authorisation** |
| `operator-record` / `implementation-record.production.schema.json` | operator (entity) ≠ implementation (system evaluated); presence ≠ admission; `environment` = sandbox\|demo only |
| `discovery-document.production.schema.json` | First artifact of the endpoint-originated journey; endpoints host-bound to canonical origin |
| `operation-receipt` / `journey-receipt.production.schema.json` | Per-step + aggregate receipts; `qwen_calls`/`external_model_calls` **const 0**; journey `certification_status` **const NOT_CERTIFIED**, `certified` **const false** |
| `evidence-bundle.production.schema.json` | Reproducible, independently checkable inputs; `not_a_certificate` const true; grants nothing on its own |
| `regulatory-state.production.schema.json` | L3 state pinned `REGULATORY_AUTHORIZATION_IN_PROGRESS`; all real-money flags **const false**; decided by the Rust RealMoneyActivationGate |
| `trust-root-metadata` / `signed-protocol-metadata` / `delegated-signing-key` / `key-manifest` / `revocation-entry.production.schema.json` | Trust-anchor + key + revocation schemas (see Divergence D-1 — Model A vs Model B on "who signs what") |
| `conformance-report` / `-evidence` / `interoperability-report` / `federation-trust-evaluation` schemas | Evidence-based conformance/interop artifacts (reproducible, hash-bound) |
| `contracts/openapi/operator-validation.yaml` | "The operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result; the Technical Registry publishes." Rust decides; Qwen only explains |
| `contracts/openapi/interoperability-certification.yaml` | The L2 certification-authority surface (distinct from the readiness journey) |
| `contracts/federation/key-manifest.json` / `revocation-list.json` | Key Manifest (root-signed public keys) + BRL (signed by the revocation-domain **delegated** key — Model A) |
| `contracts/qr/`, `contracts/events/`, `contracts/webhooks/` | QR payload format, event envelope/types, webhook signature — the payment-message surface |

## A.6 Live evidence — the M2.19G.3A closure report

  evidence source the paper may cite.** Records a real Operador Zero nine-step run (`step_count=9`,
  `protocol_fetch_count=23`) with **honest blockers** (`TRUST_INVALID_ROOT_METADATA`,
  `CONFORMANCE_EVIDENCE_INCOMPLETE`, `EVIDENCE_BUNDLE_INVALID`) → `overall_status=FAILED`,
  `certification_status=NOT_CERTIFIED`, `certification_readiness=BLOCKED`, **`external_model_calls=0`,
  `qwen_calls=0`**; reconciliation bound the candidate to the **existing** OZ registry entry (no
  duplicate; `/operators` stayed `[]`). Demonstrates: the journey never forces `CERTIFIED`; onboarding
  never writes the Technical Registry; the boundary holds under a real run.
  *(Cite the technical outcome only; omit infrastructure, deployment, and change-management specifics per
  the paper's no-secrets/no-infra/no-milestone rule.)*

## A.7 Author, affiliation & licence sources

- `docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md` — binding editorial identity: authors
  **Fidel R. Monteiro** (first, locked) and **Jesus R. Monteiro**, co-founders of **Banzami**; publisher
  **Banzami / BANZAMI – Tecnologia e Serviços, Lda.**; BanzAI is a component, never an author; no
  DOI/ISBN/ISSN; canonical edition English, PT an official translation.
- Licence for the paper (documentation) = **CC BY 4.0** (`docs/governance/licensing.md`, `README.md`);
  no trademark grant.

---

# PART B — Documented Divergences register

**Rule for this register (binding on WP1).** Each divergence is *documented, not reconciled*. WP1 does
**not** edit engines, contracts, `docs/reference/**`, or any M2.19 surface to erase a conflict. For each:
which surfaces disagree · **which one the paper follows and why** · **does it block a central thesis**.

### Terminology hazards (must-disambiguate, not conflicts to resolve)

Recorded first because two of the six divergences (D-6) sit inside them. These are **token overloads**,
not contradictions; the paper resolves them by naming, not by choosing a "correct" surface.

- **T-1 — "L1/L2/L3" means two things.** Institutional **Layers** (ADR-059: Protocol / Certification /
  Operational Schemes) vs conformance **Levels** (ADR-021/038 `certification-boundary.md`: L0 Sandbox · L1
  Core Payment · L2 Payment Initiation · L3 Inter-Operator Interop · L4 External Interop), the latter also
  the naming of the `banza-lN-readiness` engines. **Paper convention:** "Layer 1/2/3" for the
  institutional axis, "Level 0–4 / L0–L4" for the conformance axis; the interoperability step uses the
  **L2 payment-flow *Level* engine**, never "Layer 2 = Certification".
- **T-2 — "certification" means two things.** Step-9 Certification **Readiness** (`banza-target-registry`,
  `READY`/`BLOCKED`, **never `CERTIFIED`**) vs the `banza-certification` **authority** engine (can emit
  `CERTIFIED`). **Paper convention:** the nine-step journey produces *readiness*; the authority engine
  issues *records*; the journey never certifies.
- **T-3 — "registry" names three surfaces.** Closed **Technical Registry** (`banza-target-registry`,
  feeds `/operators`) · **Public Protocol Registry** anchor (INV-FEDEVAL-008) · private **Candidate
  Registry** (`banzai-onboarding`). **Paper convention:** always name which one.

---

### D-1 — Trust-root signing model: "who signs what" (HIGH; audit 04 §8 R-1)

**The conflict.** Two trust-anchor vocabularies coexist on active surfaces and disagree on what the Trust
Root signs directly.

- **Model A (canonical — Key Manifest model).** The root signs **only** the Key Manifest; delegated
  domain keys sign everything else. Grounded: **INV-ROOT-004** "The root key signs only Key Manifests. It
  never signs protocol metadata, conformance evidence, or revocation lists directly"
  (`contracts/invariants.json:166-168`); **INV-ROOT-005** "The BRL MUST be signed by the designated
  BRL-issuing (revocation-domain) key" (`invariants.json:169-171`); **INV-OTE-009** root signs nothing
  about operators (`invariants.json:121-123`); `contracts/federation/revocation-list.json:5` "signed by
  the BANZA revocation-domain delegated key (NOT the root key)".
- **Model B (production trust schemas).** The Trust Root **directly** signs **four classes** — including
  protocol metadata **and** the revocation list — under 2-of-3 custody. Grounded:
  `contracts/production/trust-root-metadata.production.schema.json:5` ("A Trust Root assina exactamente
  quatro classes de objectos: metadados do protocolo, releases do protocolo, Delegated Signing Keys e
  Revocation List") and its `scope` enum `["protocol_metadata","protocol_release","delegated_signing_key",
  "revocation"]` (`:64-72`); `signed-protocol-metadata.production.schema.json` permits
  `signer_type: trust_root`; `revocation-entry.production.schema.json` requires ≥2 root-custodian
  signatures on the entry itself.

**Which surfaces disagree.** `invariants.json` (INV-ROOT-004/005, INV-OTE-009) + the Reference +
`contracts/federation/revocation-list.json` (**Model A**) vs `contracts/production/{trust-root-metadata,
signed-protocol-metadata,delegated-signing-key,revocation-entry}.production.schema.json` (**Model B**).

**Which the paper follows, and why.** **Model A.** The invariant registry is the declared single source of
truth and its own precedence rule (`invariants.json:6`) makes INV-ROOT-004/005 govern over any prose or
schema that disagrees. The paper describes the trust anchor at the **invariant level** — *root signs only
Key Manifests; delegated domain keys sign protocol metadata, evidence and the BRL; the root signs nothing
about operators; custody is threshold-based; there is no CA and no certificate chain* — and **does not
assert a single mechanistic "who signs what" that depends on the Model-B four-classes schema.**

**Blocks a central thesis?** **No — with one scoping caveat.** The trust chapter's central theses (CA-less
trust, threshold-custodied offline root, root never signs anything *about an operator*, fail-closed
revocation) hold identically under both models. The disagreement is a **narrower mechanistic sub-claim**
(does the root sign protocol-metadata/BRL directly, or only the Key Manifest?). The paper is non-normative,
so it states the invariant-level claim and **flags the schema-level Model-A/Model-B divergence as an
implementation-surface reconciliation owed to the contracts/engines track** — it must not pick Model B, and
must not present the two as one settled mechanism. WP1 changes **no** schema.

---

### D-2 — The Reference predates the three-layer model (MEDIUM; audit 01 §9.2, audit 04 R-3)

**The conflict.** The canonical protocol Reference (`docs/reference/pt/completa.md`,
`docs/reference/en/complete.md`) was last touched at M2.19B, **before** the three-layer model (ADR-059..063)
and L2 certification (ADR-064..066). It contains **zero** occurrences of "three-layer / três camadas /
Banzami Operational Scheme / Technical Registry / scheme admission" (the 7 "Banzami" hits in PT are
attribution/trademark/governance per ADR-043, not the L3 scheme). `spec/overview.md` (dated 2026-06-11)
independently uses a *different* taxonomy — five conceptual architecture layers + a four-layer signature
hierarchy — and predates the three institutional layers.

**Which surfaces disagree.** The **Reference** (`docs/reference/**`) and `spec/overview.md` (pre-three-layer)
vs **ADR-059..069 + `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md` + `BANZAMI_OPERATIONAL_SCHEME.md` +
`BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md` + `BANZA_SEPARATION_MATRIX.md` + the production contracts + the
M2.19G public website** (three-layer current).

**Which the paper follows, and why.** The paper grounds all three-layer / L2-certification / L3-scheme
material on **the ADRs + governance docs + production contracts**, **not** the Reference chapters, because
the Reference is simply stale on this topic — not wrong about payments, but silent about the institutional
frame. The paper may still cite the Reference for the payment/invariant/trust-primitive material it does
cover. It must **not** cite `spec/overview.md`'s "5 conceptual layers" / "4-layer signature hierarchy" as
the institutional architecture, nor conflate them with ADR-059's three layers.

**Blocks a central thesis?** **No.** Authoritative, current sources for the three-layer thesis exist and are
abundant; this is a **sourcing constraint**, not a gap. WP1 does **not** edit the Reference to add
three-layer vocab (out of scope; that is a reference-track task).

---

### D-3 — Obsolete "BANZA CA" strings in two `Cargo.toml` descriptions (LOW; audit 02 §13)

**The conflict.** The retired "BANZA CA" concept survives in **package metadata only**:

- `engines/banza-evidence-bundle/Cargo.toml:5` — "…the technical evidence bundle a candidate operator
  prepares before a real **BANZA CA** review…"
- `engines/banza-l1-readiness/Cargo.toml:5` — "…it does not run the **BANZA CA** review."

The BANZA CA was removed (M2.2–M2.5) in favour of the open trust model. The engines' **own decision logic,
`lib.rs`, receipts and output are correctly updated** — every evidence bundle carries `not_a_certificate =
true` and states "não há aprovação humana central"; the string is stale **only** in these two build/metadata
descriptions.

**Which surfaces disagree.** Two `Cargo.toml` `description` fields (stale) vs the entire live model
(ADR-038/058, the engines' `lib.rs` + emitted output, contracts, website) which correctly has no CA.

**Which the paper follows, and why.** The **corrected open-trust model (no CA)**. The paper must **not**
quote either Cargo description and must **not** describe any "BANZA CA review". The stale strings are
package metadata, not a normative or public surface, and carry no decision weight.

**Blocks a central thesis?** **No.** Cosmetic stale text in build metadata; the trust thesis is unaffected.
WP1 does **not** edit the Cargo files (engines are out of WP1 scope); flag for a separate engines-track
metadata cleanup.

---

### D-4 — Stale `certificates` table on an active Reference surface (MEDIUM; audit 01 §9.1)

**The conflict.** `docs/reference/pt/completa.md:685` still lists a **`certificates` table** as
public-registry content: *"`operators` (auto-publicado pelos operadores) e `certificates` (emissão
condicionada às condições de produção)."* This is obsolete: **ADR-058 D-058-06 removed the `certificates`
table** (and `certificate_id`/`certification_level` columns) from the protocol-state schema; the live
schema `infra/banza-network/postgres/init/001_schema.sql` has **no** `certificates` table (its only
"certificate" mention is the negation "BANZA issues nothing to operators … no certificate").

**Which surfaces disagree.** `docs/reference/pt/completa.md:685` (stale) vs ADR-058 + the live schema + the
per-implementation `CertificationRecord` model (ADR-064; `certification-record.production.schema.json`).

**Which the paper follows, and why.** **ADR-058 + the live model.** The paper describes L2 output as a
**per-implementation `CertificationRecord` in the Technical Registry**, and must **not** describe an
"emitted certificate table" or a "certificates" registry table. The Reference line is a stale artifact of
the pre-M2.19 model.

**Blocks a central thesis?** **No.** The correct model (no CA, no certificate table, per-implementation
records, `production_certificates=false` baseline) is fully grounded elsewhere. WP1 does **not** edit the
Reference (out of scope) — this is documented for a reference-track correction.

---

### D-5 — `REFERENCE_ORIGIN` hardcoded to `zero.banza.network` (INFORMATIONAL; audit 03 §9 R-4)

**The conflict.** `engines/banza-target-registry/src/registry.rs:21` hardcodes
`REFERENCE_ORIGIN = "https://zero.banza.network"`, and the closed production registry ships **exactly one**
operator/implementation (Operador Zero) with that origin. In-code it is explicitly framed (`registry.rs:19-20`)
as "the initial canonical *example* implementation, validated through the same secure path as any other …
**not a hard protocol dependency**." A reader could misread the single shipped origin as a privileged trust
position.

**Which surfaces disagree.** Not a true contradiction: the code comment already frames it correctly. The
tension is between the *literal single hardcoded origin* and the *operator-neutrality thesis*.

**Which the paper follows, and why.** The paper frames `zero.banza.network` as the **reference/sandbox
example origin** — the one target the closed registry ships at v1.0 — **not** a privileged or mandatory
trust anchor, and states honestly that the production registry is a closed set currently containing only
Operador Zero (`/operators = []`, `production_certificates = false`). This is exactly the code's own framing
and is consistent with operator-neutrality (any future implementation is resolved and fetched through the
identical secure path).

**Blocks a central thesis?** **No.** Framed as an example it *supports* the neutrality thesis rather than
threatening it. WP1 changes no code; it writes the honest "single sandbox reference target today" framing.

---

### D-6 — Registry entry as a trust check vs "registry listing is not a check" (MEDIUM; audit 03 §9 R-1)

**The conflict.** The active-model trust evaluator treats a missing/unbound published registry entry as a
non-`VALID`, fail-closed status: `banza-trust`'s `evaluate.rs` computes `registry_ok` from the operator's
own `public_registry_entry` bound by `operator_id` and, if absent/unbound, yields
`TRUST_MISSING_REGISTRY_ENTRY` (`engines/banza-trust/src/evaluate.rs` ~L333-339, L382-383, L469). Two
invariants say registry listing must **not** be a check/input: **INV-FEDEVAL-008** "No evaluation step may
be satisfied by … the presence of an entry in the Public Protocol Registry. Registry listing is not a
check." (`invariants.json:148-150`); **INV-OTE-007** "No artifact issued by BANZA about an operator may be
an input to the Open Trust Evaluation." (`invariants.json:115-116`).

**Reconciliation (grounded).** The two are reconcilable but only if the paper is precise:
1. The entry the evaluator checks is the operator's **own self-published** registry entry bound by
   `operator_id` — **not** a BANZA-issued verdict/artifact, so INV-OTE-007 (BANZA-issued artifacts) is not
   violated.
2. INV-FEDEVAL-008 governs **ADR-040 federation routing**; the `TRUST_MISSING_REGISTRY_ENTRY` status lives
   in the **M2.4 active-model trust evaluator** — a different evaluation. They are distinct paths.
3. In the live endpoint-originated journey, `assembleTrustInput` (`services/banzai-api/src/validate.js:78-94`)
   does **not** populate `public_registry_entry`, so the trust step **degrades to `PENDING`** rather than
   asserting trust from a listing — the journey never converts "listed" into "trusted".

**Which the paper follows, and why.** The paper follows the **invariants (INV-FEDEVAL-008 / INV-OTE-007)**
as the normative statement — "registry listing is not a trust check; no BANZA-issued artifact is an input" —
**and states precisely which evaluation and which registry it means each time**: the Public Protocol
Registry is not a BANZA-issued gate; the closed Technical Registry is BANZA's list of eligible validation
**targets**, not a trust anchor; the self-published operator entry bound by `operator_id` is the operator's
own artifact, not BANZA's. It does **not** make a blanket "a registry entry is never consulted in any
evaluation" claim.

**Blocks a central thesis?** **Conditionally — it would block the "no BANZA-issued artifact / no
registry-listing check" trust thesis IF the paper made the unqualified blanket claim; it does not block once
disambiguated** as above (which registry, which evaluation, whose artifact). Because the endpoint-originated
journey demonstrably degrades to `PENDING` without a listing, the live behaviour supports the disambiguated
claim. WP1 changes no engine; it writes the precise framing.

---

## C. Divergence summary

| ID | Divergence | Severity | Paper follows | Blocks a central thesis? |
|---|---|---|---|---|
| D-1 | Trust-root "who signs what" (Model A vs Model B) | HIGH | **Model A** (INV-ROOT-004/005, invariants precedence) | No — narrows to a mechanistic sub-claim; flag schema reconciliation to contracts track |
| D-2 | Reference predates three-layer model | MEDIUM | ADRs + governance docs + contracts (not the Reference) | No — sourcing constraint only |
| D-3 | "BANZA CA" in two `Cargo.toml` descriptions | LOW | Open-trust model (no CA); do not quote the metadata | No — cosmetic build-metadata string |
| D-4 | Stale `certificates` table (Reference L685) | MEDIUM | ADR-058 + live schema; per-impl `CertificationRecord` | No |
| D-5 | `REFERENCE_ORIGIN` hardcoded to `zero.banza.network` | INFO | Reference/sandbox **example** origin, not privileged | No — supports neutrality when framed |
| D-6 | Registry-entry-as-trust-check vs INV-FEDEVAL-008/INV-OTE-007 | MEDIUM | The invariants, **disambiguated** by registry + evaluation | No if disambiguated; would block if claimed as a blanket rule |

**Net Gate-A position.** No divergence blocks a central thesis of the whitepaper. D-1 and D-6 require the
paper to make *scoped, precise* claims rather than blanket mechanistic ones; D-2/D-4 are sourcing/staleness
constraints handled by choosing authoritative sources; D-3/D-5 are cosmetic/informational. **WP1 authors
prose around all six and modifies no engine, contract, Reference, or M2.19 surface.**
