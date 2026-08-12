# Whitepaper — Scientific Publication Readiness

> **Purpose.** Gate-A prep artifact for **BANZA Whitepaper v1.0**. It fixes the genre of the Whitepaper
> (a *foundational, citable* document — **not** an experimental scientific article) and maps the
> **future research programme** that will be *built on* the Whitepaper and must **not** be crammed into
> its ten pages. For every research element it records what already exists in the repository that a
> future study could build on, grounded in the six prep audits
> (`docs/whitepaper/prep/audit/01..06-*.md`) and the real repo files those audits cite.
>
> **Non-normative.** This document defines nothing normative and changes no invariant, contract or
> public surface. It is planning material. **Date:** 2026-07-30.

---

## 0. Boundary banner (carried from the audits, binding on the Whitepaper and every derived article)

- **BANZA is an open financial *protocol*** — not a bank, PSP, wallet, e-money institution or financial
  operator; it holds no accounts, moves/settles no funds, issues no licences, and replaces neither a
  regulator nor a scheme (Audit 01 §0; Audit 04 §5; `spec/overview.md:3`; every production `_boundary`).
- **Technical certification ≠ scheme admission ≠ regulatory authorisation** (ADR-061); none implies,
  grants or propagates to another (Audit 01 §6.1).
- **Rust engines execute and DECIDE; the local model (Qwen) only EXPLAINS, once; BanzAI is a transversal
  human interface — not a fourth layer and not an authority** (ADR-037/054/059; Audit 02 §8; Audit 06 §9).
- **Current honest state is pre-production:** `/operators = []`, `production_certificates = false`,
  `pre_production = true`; the L3 regulatory state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` with real
  money OFF (Audit 06 §6, §10; `contracts/production/protocol-version.json`).
- **Authors / publisher (fixed).** Authors: **Fidel R. Monteiro** (first) and **Jesus R. Monteiro**,
  co-founders of **Banzami**. Institutional publisher: **Banzami** — legal name
  **BANZAMI – Tecnologia e Serviços, Lda.** BanzAI and every other tool are *components of the system,
  never authors* (`docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`).

---

## 1. What the Whitepaper IS — and what it is NOT

### 1.1 Genre

The BANZA Whitepaper v1.0 is a **foundational, citable reference document**: it states the protocol's
purpose, the three-layer institutional model, the invariant families, the trust model, the certification
model and the load-bearing separations, and it gives them a **stable, quotable anchor** (a working title,
authors, publisher, edition and licence) that later work can cite. It is written to be *referenced*, not
to *report an experiment*.

It is **not**:

- an **experimental scientific article** — it reports no controlled experiment, dataset, measurement or
  statistical result of its own;
- a **normative specification** — it defines no `MUST`/`SHALL` of its own. It may only restate a normative
  rule when it is explicitly quoting the canonical Reference/contracts; the normative sources of truth
  remain `contracts/`, `conformance/`, `spec/` and the ADR corpus (Audit 04 §1);
- a **product, operator or scheme document** — it is operator-neutral (examples use Operador A/B/C/D and
  the read-only Operador Zero, never a third-party commercial brand; Audit 05 §5).

### 1.2 Claims the Whitepaper explicitly does NOT make

The Whitepaper makes **no** claim of:

- **peer review**, **journal acceptance**, or **publication as a refereed article**;
- a **DOI, ISBN or ISSN** — none exists and none is invented
  (`…WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`);
- any of the forbidden superlatives — *first / only / revolutionary / unprecedented / fully-decentralised
  / trustless / guaranteed / regulator-approved / production-proven / real-funds-handling*;
- **regulatory authorisation** of any kind — the operational layer is in regulatory preparation and real
  payments are disabled (ADR-062; Audit 06 §6).

Publishing this Whitepaper is an act of **making a citable reference available**, not of asserting a
peer-reviewed scientific finding. Any future article that *does* make an empirical claim is a separate
work that **cites** this Whitepaper — it is that article, not the Whitepaper, that must satisfy peer
review, reproduction and the full experimental apparatus catalogued in §4.

### 1.3 The ten-page budget principle

The Whitepaper is deliberately short (target ≈10 pages). A short foundational paper can carry the
**model, the invariants and the separations** with citations, but it **cannot** carry a research
programme. Every experimental, quantitative or survey-grade element below (§4) is therefore **out of
scope for the ten pages by design** and is deferred to follow-on articles that cite the Whitepaper. This
document is the register of that deferral.

---

## 2. The invariant-preservation contract (binding on the paper and on every derived article)

These disambiguations are load-bearing: the audits show the same tokens carry **two or three different
meanings** on active surfaces. The Whitepaper and *every* article built on it must preserve them exactly.
A future study that conflates any of these is measuring the wrong object.

### 2.1 Three axes that all read as "L1/L2/L3" — never conflate

| Axis | Values | Source | What it is |
|---|---|---|---|
| **Institutional Layers** | L1 / L2 / L3 | ADR-059 (Audit 01 §1) | L1 **BANZA Protocol** (open, neutral) · L2 **Conformance & Interoperability Certification** (per-implementation, evidence-based, Rust-decided) · L3 **Operational Schemes** — the **Banzami Operational Scheme** is the first *intended* scheme (ADR-060) |
| **Conformance readiness Levels** | L0–L4 | ADR-021/038; `docs/governance/certification-boundary.md` (Audit 01 §3.4) | A *scope grouping* of capability: L0 Protocol Sandbox · L1 Core Payment · L2 Payment Initiation · L3 Inter-Operator Interop · L4 External Interop |
| **`banza-lN-readiness` engines** | l1/l2/l3/l4 | `engines/banza-l{1,2,3,4}-readiness` (Audit 02 §9) | Local, no-network *preparation* engines for the conformance-level axis; explicitly "NOT certification, NOT approval, does not move funds" |

> Convention the Whitepaper should adopt (and every article inherit): write **"Layer 1/2/3"** for the
> institutional axis and **"Level 0–4 / L0–L4"** for the conformance axis (Audit 01 §9.3; Audit 02 §13).
> On the nine-step journey, the "interoperability" step runs the **L2 *payment-flow readiness engine***
> (`banza-l2-readiness`), which is the *Level-2 capability* axis — **not** "Layer 2 = Certification".

### 2.2 Two meanings of "certification" — the journey never certifies

- **Certification *Readiness*** — step 9 of the nine-step journey, produced by `banza-target-registry`
  (`verdict.rs::certification_readiness`). It is a `READINESS_AGGREGATE` that **hard-sets**
  `certification_status = "NOT_CERTIFIED"`, `certified = false`, and returns only `READY` or `BLOCKED`;
  a unit test (`certification_readiness_never_certifies`) asserts it **never** returns `CERTIFIED`
  (Audit 02 §10; Audit 03 §2.2).
- **Certification *authority*** — the separate `banza-certification` engine (ADR-064/065/066), which *can*
  emit an `InteroperabilityCertificationRecord` via a closed state machine
  (`NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED`). This engine is **not invoked by the
  nine-step journey** and is not among the WASM packages the journey vendors (Audit 02 §10).

A future study of "the journey" must state which object it measures; the journey aggregates verdicts and
**never issues a certificate**.

### 2.3 Three distinct "registry" surfaces — name each explicitly

1. **The closed BANZA Technical Registry** — validation targets + public read-only state
   (`banza-target-registry`), the *only* source of validation targets, closed to exactly one operator
   (`operator-zero`) and one implementation today; it feeds the public `/operators` surface (which is
   `[]`) and is **not** a trust anchor (Audit 03 §4.1, §5).
2. **The Public Protocol Registry anchor** — referenced by the trust invariants (INV-FEDEVAL-008): a
   registry *listing is not a trust check*, and no BANZA-issued artifact about an operator may be an
   input to the Open Trust Evaluation (Audit 03 §5; Audit 04 §1).
3. **The PRIVATE Candidate Registry** — the hosted-onboarding candidacy store (`banzai-onboarding`); it
   is private, session-gated, **not protocol core**, and never creates a Technical-Registry entry
   (Audit 03 §4.2).

### 2.4 operator ≠ implementation; certification is per-implementation

The **operator** is the responsible entity; the **implementation** is the technical system evaluated; one
operator may publish many implementations (Audit 04 §3). Certification's subject is the *implementation*,
identified by `implementation_id` **plus the content hash of the exact artifact set tested**
(`implementation_hash`); it is scoped to **profile + version + environment + scope + evidence + validity**
and is **not a CA signature and carries no certificate chain** (ADR-064/066; Audit 01 §3.1; Audit 04 §3).

### 2.5 What the paper may never assert

BANZA is not a bank/PSP/wallet/operator and moves no funds; certification is not admission and not
authorisation (ADR-061); the Banzami Operational Scheme's regulatory state is
`REGULATORY_AUTHORIZATION_IN_PROGRESS` with all real-money flags fail-closed `const false` (ADR-062;
Audit 06 §6). **Operador Zero** is a sandbox/demo **read-only reference implementation**, currency
`KZ_DEMO`, no real funds, `NOT_CERTIFIED`, `PRE_PRODUCTION` — never a production operator (ADR-052/067;
Audit 06 §8).

---

## 3. Pre-existing repository assets a future study can build on (inventory)

The repository already contains an unusually complete *experimental apparatus* for a pre-production
protocol. A future article does not start from zero; it starts from these grounded assets.

| Asset | Repo location | What a future study gets | Grounding |
|---|---|---|---|
| **Deterministic decision engines** | `engines/` (≈29 crates) | Rust engines that decide verdicts with no clock/network/randomness in their pure cores — a reproducible measurement target | Audit 02 §2; Audit 03 §6 |
| **The nine-step endpoint-originated journey** | `services/banzai-api/src/validate.js` + 7 WASM engines | A fixed step spine (`discovery→…→certification`) with per-step engine, endpoint, status mapping — an experimental pipeline | Audit 02 §1, §3 |
| **SSRF-hardened secure fetcher** | `engines/banza-artifact-fetcher` (`banza-fetcher`) | The only component reaching operator endpoints; fully unit-testable policy module — a controllable, auditable transport | Audit 02 §11 |
| **Conformance vectors + suites** | `conformance/` (49 JSON vectors; ledger/settlement/qr/federation/events/operators/sdk suites) | Ready-made, versioned test vectors and suites — seed datasets | Audit 04 §7; verified 2026-07-30 |
| **Production contracts (JSON Schema)** | `contracts/production/` (37 schemas incl. discovery, implementation-record, certification-{profile,record}, certified-implementation, evidence-bundle, conformance-{report,evidence}, interoperability-report, regulatory-state) | Machine-checkable object shapes with `const` boundary flags — the measurable output schema | Audit 03 §1–2; Audit 04 §5, §7 |
| **Receipts (per-step + journey + origin)** | `operation-receipt` / `journey-receipt` / `OriginVerificationReceipt` contracts + live builders | Origin-bound, hash-bound receipts carrying `duration_ms`, `input_hash`, `output_hash`, `reason_codes`, `protocol_fetch_count`, and `const 0` model-call counters — instrumented telemetry | Audit 03 §2 |
| **Evidence bundles** | `engines/banza-evidence-bundle` + `evidence-bundle.production.schema.json` | SHA-256 hash-bound, reproducible, `not_a_certificate` evidence packages with per-artifact hashes and tool versions — a reproduction unit | Audit 03 §1 |
| **Canonical invariant registry** | `contracts/invariants.json` (+ `spec/invariants.md` crosswalk) | A single machine-readable set of falsifiable statements (LEDGER/WALLET/SETTLE/IDEM/RECON/QR/TRACE/OTE/FEDEVAL/ROOT/FED/COLLECTION/MON) with a severity ladder — the hypothesis source | Audit 04 §1 |
| **Closed reason-code sets** | fetcher `ReasonCode`, verdict/step codes, 15 `ResolutionReason` variants | Closed, enumerable output taxonomies — countable outcome variables | Audit 02 §5 |
| **Operador Zero reference implementation** | `engines/operator-zero-core` + read-only surface | A deterministic, KZ_DEMO, no-real-funds reference target validated through the *same* path as any future implementation | Audit 06 §8 |
| **In-process peer simulator** | `engines/banza-simb` | A Rust simulator of a BANZA operator/federation peer (test-only) — apparatus for interop experiments before a second real implementation exists | Audit 02 §2 |
| **A recorded end-to-end journey run** | engineering reports under `docs/reports/` | One honest Operador Zero journey: `step_count = 9`, `protocol_fetch_count = 23`, `overall_status = FAILED`, `certification_status = NOT_CERTIFIED`, `external_model_calls = 0`, `qwen_calls = 0` — an existing data point (not a study) | Audit 01 §5; Audit 03 §2.2 |
| **ADR corpus** | `decisions/adr/` (ADRs 001–069, current-only tree) | The rationale and decision record that frames research questions and related work | Audit 01 §10 |

---

## 4. The future-article map — what belongs OUTSIDE the ten pages

For each element: **(what it is / why it is out of the paper)**, **(what already exists to build on)**,
**(binding constraint it inherits)**.

### 4.1 Research questions

- **Why out of the paper.** The Whitepaper *poses the thesis* (open, verifiable financial
  interoperability governed by public rules and reproducible evidence, without a central certificate
  authority). Enumerating precise, answerable research questions — and defending their answerability — is
  the job of each follow-on article, not the foundational anchor.
- **Build on.** The ADR corpus and the three-layer model supply the raw material for sharp RQs, e.g.
  *"Does Rust-decided, endpoint-originated validation reproduce bit-for-bit across independent
  re-execution?"* (grounded in the reproducibility invariants INV-OTE-004 / INV-FEDEVAL-003), or *"Can
  interoperability be demonstrated between independent implementations using only published artifacts and
  no shared secret or CA?"* (grounded in ADR-038/040).
- **Constraint.** Each RQ must be phrased against the correct object per §2 (e.g. *readiness* vs
  *certification*, *implementation* vs *operator*), or it measures the wrong thing.

### 4.2 Hypotheses

- **Why out of the paper.** A foundational paper states properties; it does not pre-register falsifiable
  hypotheses with predicted effect sizes.
- **Build on.** `contracts/invariants.json` is effectively a catalogue of falsifiable statements ready to
  be turned into hypotheses — e.g. INV-FEDEVAL-003 *"evidence that cannot be reproduced is not evidence"*
  → **H:** independent re-execution of a pinned profile's public vectors yields identical bundle/record
  hashes; the `const 0` model-call guarantees → **H:** no verdict on the validation path depends on a
  model call; the fail-closed precedence chains (trust, fetcher, aggregate) → **H:** any
  missing/malformed input yields a non-`VALID`/`BLOCKED` outcome, never a false positive (Audit 02 §6;
  Audit 03 §3).
- **Constraint.** Hypotheses must not smuggle in a forbidden claim (§1.2) as an assumption (e.g. "the
  system is trustless"); the trust model is CA-*less*, not trust-*less* (ADR-038).

### 4.3 Deeper related work

- **Why out of the paper.** The ten pages carry a slim positioning, not a survey. A rigorous comparison
  with ISO 20022, open-banking/PSD2 API regimes, X.509/PKI and certificate transparency, W3C Verifiable
  Credentials / self-sovereign identity, and federated-trust literature is a survey-scale effort.
- **Build on.** ADR-038 (open trust without a CA) and ADR-040 (federation trust evaluation without
  certificates) already articulate the *positioning against certificate-chain trust* — "no CA, no
  certificate chain; trust is root-signed protocol metadata verified without any BANZA account"
  (Audit 01 §3.1; Audit 03 §3). These ADRs seed a related-work section but are decision records, **not** a
  literature survey.
- **Constraint.** Related work must preserve the *no-CA / no-operator-certificate* boundary and must not
  reintroduce retired vocabulary ("BANZA CA", operator X.509) except as historical contrast (Audit 04 §6;
  Audit 06 §11).

### 4.4 Methodology

- **Why out of the paper.** A defensible methodology (sampling frame, controls, environment
  specification, statistical treatment, pre-registration) is longer than the whole Whitepaper.
- **Build on.** The **apparatus already exists**: the nine-step orchestration (`validate.js`), the
  deterministic engines, the SSRF-hardened fetcher, closed reason-code sets, and the receipt/evidence
  telemetry give a study concrete, instrumented measurement points (Audit 02 §1, §3, §5, §11; Audit 03
  §2). A methodology section describes *how to exercise* this apparatus rigorously; that description is
  absent today.
- **Constraint.** The methodology must record that **Rust decides and the model only explains** (const-0
  model calls on the validation path), so no result may be attributed to a model decision (Audit 02 §8).

### 4.5 Datasets

- **Why out of the paper.** Curated, versioned, provenance-documented datasets with licences and a data
  statement belong in a data paper or a dataset appendix, not the anchor.
- **Build on.** `conformance/` ships **49 test vectors** plus suites (ledger, settlement, qr, federation,
  events, operators, sdk), and `contracts/production/examples/` provides valid instances (e.g. the
  `regulatory-state` baseline). These are ready seed datasets (Audit 04 §7; verified 2026-07-30).
- **Constraint.** Datasets must stay operator-neutral (Operador A/B/C/D placeholders; the only real
  named target is the read-only Operador Zero) and must not embed real funds or PII — the protocol-state
  store excludes funds/balances/PII by design (ADR-042; Audit 04 §5).

### 4.6 Benchmarks

Three benchmark families are explicitly called out; all are **out of the ten pages** and all have partial
scaffolding already:

- **Determinism / reproducibility measurements.** *Build on:* SHA-256-bound evidence bundles
  (`bundle_hash`, per-artifact hashes), the `record_hash` over a certification record, and the
  reproducibility invariants (INV-OTE-004, INV-FEDEVAL-003: hashes recomputed + automation re-executed by
  an independent third party must yield the same state). A harness that measures **reproduction rate**
  across independent machines does not yet exist as a published study (Audit 03 §1, §5).
- **Latency profiles per step.** *Build on:* the `OperationReceipt` already carries `duration_ms` per step
  and the `JourneyReceipt` aggregates it; a recorded run shows `protocol_fetch_count = 23` over nine steps
  — so per-step latency is *already instrumented in the contract*. A latency-profiling study builds
  directly on `duration_ms`; no such profile is published (Audit 03 §2.1–2.2).
- **Cross-implementation interoperability suites.** *Build on:* `conformance/federation`, the
  `banza-l3-readiness` federation engine, the federation contracts, and the `banza-simb` in-process peer
  simulator. **Honest gap:** a *real* cross-implementation suite needs ≥2 independent published
  implementations; the closed Technical Registry contains **exactly one** implementation today
  (`operator-zero-ref-impl`), so cross-implementation interop is presently demonstrable only against a
  simulator — a first-order external-validity limitation (Audit 02 §2, §9; Audit 03 §4.1; see §4.9).
- **Constraint.** A receipt's `engine_version` may be `"unknown"` (engine omits `tool_version`) or `"n/a"`
  (fetch-blocked step); a benchmark must not assume every receipt carries a numeric engine version
  (Audit 02 §7, §13).

### 4.7 Experimental implementation

- **Why out of the paper.** Building and hardening an implementation is engineering work reported
  separately from the foundational model.
- **Build on.** **Operador Zero** (`operator-zero-core`) is a deterministic, read-only, KZ_DEMO reference
  implementation exercised through the same secure path as any future implementation; the reference
  engines and `banza-simb` complete the sandbox apparatus (Audit 06 §8; Audit 02 §2).
- **Constraint.** Operador Zero is **sandbox/demo, `NOT_CERTIFIED`, `PRE_PRODUCTION`, never a production
  operator, never in `/operators`, no real funds**; an experimental-implementation article must not
  present it as production or as evidence of authorisation (ADR-052/067; Audit 06 §8, §10).

### 4.8 Quantitative analysis

- **Why out of the paper.** Statistical analysis (distributions, confidence intervals, significance) is
  the payload of an empirical article, not a foundational reference.
- **Build on.** Receipts and evidence bundles emit structured, hashable outputs; reason codes are closed,
  countable sets; `duration_ms`, `protocol_fetch_count`, per-step status distributions and
  reproduction-hash matches are all quantifiable variables. The one recorded journey run is a **single
  data point**, not an analysis (Audit 02 §5; Audit 03 §2).
- **Constraint.** Any headline number must respect the honest baseline (`/operators = []`,
  `production_certificates = false`) and must not be dressed as a production or authorisation metric
  (Audit 06 §10).

### 4.9 Threats to validity

- **Why out of the paper.** A candid threats-to-validity treatment is expected of an empirical article and
  would overrun the anchor.
- **Build on (already surfaced by the audits — a future article must carry these):**
  - **Single-implementation external validity.** The production Technical Registry is closed to one
    operator + one implementation; interoperability across *independent* implementations is not yet
    demonstrable outside a simulator (Audit 03 §4.1; §4.6 above).
  - **Trust-anchor description divergence (R-1, HIGH).** Two active vocabularies coexist for *what the
    Trust Root signs* — the Key-Manifest model (root signs only Key Manifests; delegated keys sign
    metadata/evidence/revocation; INV-ROOT-004/005) vs the production-schema "root signs four classes
    under 2-of-3" model. The safe, grounded claim is the invariant registry's INV-ROOT-004/005
    (Audit 04 §8 R-1).
  - **Pre-three-layer surfaces.** The canonical Reference (`docs/reference/…/complete.md`) and
    `spec/overview.md` predate the three-layer model and use older taxonomies; three-layer/L2/L3 material
    must be sourced from ADR-059..066 + the governance docs, not those chapters (Audit 01 §9.2;
    Audit 04 §8 R-3).
  - **Registry-listing-as-check tension.** The active-model trust evaluator treats a missing published
    registry entry as fail-closed, while INV-FEDEVAL-008 says "registry listing is not a check" — a
    study must state which evaluation it means (Audit 03 §9.1).
  - **Stale `source` line numbers** in `contracts/invariants.json` after the Reference rewrite — cite the
    invariant *statement text*, not the line locator (Audit 04 §8 R-2).
  - **Obsolete term in package metadata.** "BANZA CA" survives in two `Cargo.toml` descriptions only
    (build metadata, not decision logic or public surface) — a wording watch-item, not a live claim
    (Audit 02 §13).
- **Constraint.** These are honest, grounded limitations; an article must not paper over them to reach a
  cleaner claim.

### 4.10 Reproduction packages

- **Why out of the paper.** A formal reproduction package (pinned container image, exact tool versions,
  dataset snapshot, run scripts, an archived identifier) is an artifact deliverable of the empirical
  article.
- **Build on.** The ingredients exist: **hash-bound, reproducible evidence bundles** (`not_a_certificate`,
  independently checkable), **pinned engine `tool_version`s** recorded per artifact, the **conformance
  vectors** as an input snapshot, **deterministic engine cores** (no clock/network/randomness), and the
  repository's existing **reproducible-bundle deployment discipline** (fixed image tags). A published,
  archived reproduction package is future work (Audit 03 §1, §5; Audit 05 §7).
- **Constraint.** No invented DOI/ISBN/ISSN may be attached to a reproduction package; archival
  identifiers, if later obtained, are recorded honestly (§1.2).

### 4.11 Ethics statement (where applicable)

- **Why out of the paper.** An ethics/data-governance statement is required only where a study touches
  human subjects, personal data, or real financial risk — it is scoped per article, not to the anchor.
- **Build on / current posture.** A study of the *current* system has minimal exposure: **no real funds
  move** (real-money gate fail-closed, ADR-062), the protocol-state store **excludes funds/balances/PII**
  (ADR-042), Operador Zero uses **KZ_DEMO** with no real money, and the hosted onboarding service persists
  **only hash-only, secret-free material** with no plaintext credentials (ADR-069; Audit 03 §4.2). So a
  present-state study can reasonably state "no human subjects, no personal financial data, no real funds"
  and remain grounded.
- **Constraint / trigger.** A **future** article that touches real-money L3 operation, KYB/AML processes,
  actual participant data, or human-operator behaviour **must** carry a full ethics and data-governance
  statement, and may make **no** regulatory-authorisation claim while the state is
  `REGULATORY_AUTHORIZATION_IN_PROGRESS` (ADR-061/062; Audit 06 §6).

---

## 5. What the ten pages keep vs. what they defer (summary map)

| The Whitepaper (v1.0, ~10 pp) **keeps** | Deferred to a future citing article (§4) |
|---|---|
| Purpose, thesis, operator-neutral framing | Formal research questions (§4.1), hypotheses (§4.2) |
| Three-layer institutional model + the three separations | Deeper related-work survey (§4.3) |
| Invariant families (named, cited) | Methodology + statistical design (§4.4, §4.8) |
| Trust model (open, CA-less) at a descriptive level | Determinism/latency/interop benchmarks (§4.6) |
| Certification model (per-implementation, scoped) — described | Experimental implementation report (§4.7) |
| The nine-step journey — described, with the readiness≠certification distinction | Threats to validity (§4.9), reproduction package (§4.10) |
| Honest pre-production state; author/publisher/licence colophon | Ethics statement where a study warrants it (§4.11) |

The Whitepaper is the **citable spine**; §4 is the **research programme that hangs off it**. Keeping them
separate is what lets the ten pages stay foundational and honest.

---

## 6. Constraints every derived article inherits from the Whitepaper

1. **Non-normative genre** — no article invents a `MUST`/`SHALL`; normative truth stays in
   `contracts/`, `conformance/`, `spec/`, ADRs (Audit 04 §1).
2. **Forbidden claims** — none of *first/only/revolutionary/unprecedented/fully-decentralised/trustless/
   guaranteed/regulator-approved/production-proven/real-funds* (§1.2).
3. **No peer-review / DOI / ISBN / ISSN claim** unless and until one genuinely exists (§1.2).
4. **Terminology discipline** — the three L1/L2/L3 axes (§2.1), the two "certifications" (§2.2), the three
   "registries" (§2.3), operator≠implementation (§2.4) — never conflated.
5. **Honest state** — pre-production, real money OFF, regulatory preparation in progress; Operador Zero is
   sandbox/read-only/`NOT_CERTIFIED` (§2.5; Audit 06 §6, §8, §10).
6. **Operator neutrality** — examples use Operador A/B/C/D or the read-only Operador Zero; no third-party
   commercial operator brand; Banzami appears only as creator / initial maintainer / L3 designated scheme
   operator, never as a BANZA payment operator (Audit 05 §5; Audit 06 §1–2).
7. **Attribution** — authors and publisher exactly as fixed in the author record; BanzAI and other tools
   are components, never authors (§0).

---

## 7. Open questions for Gate-A (human decisions)

1. **Publication year** in the recommended citation is `[year]` (real publication year) — must be fixed by
   a human before the citation string is frozen (`…WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`).
2. **Whether to declare a canonical working title verbatim** — the author record proposes *"BANZA: An Open
   and Verifiable Protocol for Financial Interoperability"*; confirm it is the locked title for the cover
   and citation.
3. **Documentation licence marker** — the audits recommend **CC BY 4.0** for the paper (consistent with
   the repo's documentation licensing) with an explicit per-file/cover marker; confirm and place it
   (Audit 05 §6).
4. **Trust-anchor "who signs what"** (R-1, HIGH) — decide whether the Whitepaper states the trust anchor
   only via the invariant registry (INV-ROOT-004/005) or reconciles both active vocabularies before
   publication (Audit 04 §8 R-1).
5. **Scope of the first follow-on article** — which §4 element (reproducibility benchmark, latency profile,
   or interop-with-simulator study) is authored first, given the single-implementation external-validity
   limitation (§4.6, §4.9).
6. **Legal-name rendering** — pick one canonical casing (`BANZAMI – Tecnologia e Serviços, Lda.` per the
   author record) and note the all-caps variant is also in use (Audit 06 §12).

---

*Grounding: `docs/whitepaper/prep/audit/01..06-*.md` and the repository files they cite; author identity
per `docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`. Engine, conformance-vector and
contract inventories verified against the working tree on 2026-07-30. This document is non-normative prep
material and asserts no peer-review, DOI, ISBN, ISSN or regulatory status.*
