# Whitepaper Claim → Evidence Matrix (Gate-A)

> **Purpose.** Every MATERIAL claim the BANZA Whitepaper v1.0 will make, mapped to a grounded BANZA
> source (from the six prep audits and the real repo files they cite) or explicitly marked a stated
> limitation. This is the Gate-A evidence contract: nothing enters the paper that is not either
> **grounded** here or declared a **scoped limitation**. Any material claim that is currently
> **unsupported** or rests on a **contradictory** source is flagged **MUST-FIX-before-v1.0**.
>
> **Status.** Non-normative prep artifact. The Whitepaper is itself non-normative
> (no MUST/SHALL of its own except when quoting the Reference).
> **Date:** 2026-07-30. **Track:** claim-evidence / Gate-A.
> **Grounding corpus:** `docs/whitepaper/prep/audit/01..06-*.md` + the repo files those audits cite +
> `docs/whitepaper/prep/WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md`.

## Provenance note on "the program"

At the time of writing there is **no `program` file** in the repo (`docs/whitepaper/` contains only
`prep/` + `figures/`; verified). The **thesis** (TH-\*) and the **ten contributions** (C-01…C-10) in
this matrix are therefore **reconstructed from the grounded audit corpus**, not copied from a program
document. When a canonical whitepaper program/outline is authored, its §11 contributions and its thesis
MUST be reconciled against C-01…C-10 / TH-\* below; any divergence is a Gate-A open question.

---

## Legend

**type** — `definition` (what a thing *is*) · `mechanism` (how it *works*) · `architecture` (structural
separation/relationship) · `boundary` (what BANZA is *not* / what a step does *not* confer) ·
`limitation` (a scoped, honest limit).

**evidence_state** —
- `grounded` — supported by a real BANZA source read in the audit corpus; safe to assert as written.
- `needs-source` — the paper wants to assert this but no single consistent grounded source exists (or
  sources contradict). **→ MUST-FIX-before-v1.0.**
- `scoped-limitation` — true only as a bounded/honest limitation; must be framed as such, never as a
  capability claim.

**editorial_decision** — the binding instruction to the drafting pass. `MUST-FIX-before-v1.0` marks a
hard blocker (unsupported claim, contradictory source, or a conflation that would produce an unsupported
claim if not disambiguated).

**Source shorthand.** ADR ids resolve under `decisions/adr/`; governance docs under `docs/governance/`;
contracts under `contracts/`; engines under `engines/`. Full line/section grounding is in the cited audit
(A01…A06 = `prep/audit/0N-*.md`). External refs marked "(candidate — verify)" are real, well-known
standards named only where load-bearing; **all external refs require final bibliographic verification and
none may be an invented DOI/ISBN/ISSN.**

---

## A. Thesis (Abstract · §1)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| TH-01 | BANZA is an open financial protocol that defines rules, contracts, profiles and verifiable interoperability mechanisms between independent implementations. | Abstract §1 | definition | ADR-059 D-059-01; `BANZA_THREE_LAYER_ARCHITECTURE.md` §3 (A01 §0) | — | grounded | — | none | Use ADR-059 D-059-01 verbatim as the one-sentence spine. |
| TH-02 | Conformance, interoperability and trust are *demonstrated* by deterministic engines + reproducible evidence, not *granted* by a central authority. | Abstract §1 | mechanism | ADR-038 INV-OTE-*; ADR-040 INV-FEDEVAL-*; ADR-037 (A02 §8, A03 §3, A04 §1) | — | grounded | — | none | — |
| TH-03 | The protocol is operator-neutral and outlives any single operator (survival criterion). | Abstract §1 | architecture | ADR-001/003; ADR-059 D-059-07; `BANZAMI_OPERATIONAL_SCHEME.md` (A06 §2) | — | grounded | — | none | — |
| TH-04 | BANZA specifies financial invariants but is not itself a financial system: it holds no accounts and moves no funds. | Abstract §1 | boundary | ADR-042; `spec/overview.md:3` (A04 §5) | — | grounded | — | none | Pair with B-01. |

---

## B. Contributions (§11) — C-01…C-10

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| C-01 | A three-layer institutional architecture (Protocol / Certification / Operational Schemes) separated by responsibility, infrastructure and keys. | §11 | architecture | ADR-059; `BANZA_THREE_LAYER_ARCHITECTURE.md` (A01 §1) | — | grounded | — | Layer L1/L2/L3 vs level L0–L4 overload (see ARCH-04). | State "institutional Layer 1/2/3" on first use; reserve "Level 0–4" for conformance. |
| C-02 | A CA-less open trust model (Open Trust Evaluation): signed protocol metadata + reproducible evidence + fail-closed revocation; no certificate authority, no certificate chain. | §11 | mechanism | ADR-038/058; `contracts/invariants.json` INV-OTE-* (A03 §3, A04 §1) | — | grounded | — | none | — |
| C-03 | A per-implementation certification model: subject identified by `implementation_hash`, scoped to profile+version+environment+scope+evidence+validity, with a closed deterministic state machine. | §11 | mechanism | ADR-064/065/066; `certification-record.production.schema.json` (A01 §3, A04 §5) | — | grounded | — | Two meanings of "certification" (CERT-06). | — |
| C-04 | Endpoint-originated validation: every evaluated artifact is fetched exclusively from the implementation's public endpoints by an SSRF-hardened Rust fetcher. | §11 | mechanism | ADR-068; `engines/banza-artifact-fetcher`; `operator-validation.yaml` (A02 §11, A04 §2) | OWASP SSRF Prevention (candidate — verify) | grounded | — | none | — |
| C-05 | A deterministic nine-step validation journey in which Rust decides every verdict and there is no AI in the decision path. | §11 | mechanism | ADR-037/054/059; `validate.js`; `verdict.rs` (A02 §3/§8) | — | grounded | — | none | Anchor with const-0 model-call counters (EVD-04). |
| C-06 | A single machine-readable canonical invariant registry (financial + trust + structural), build-enforced as the source of truth. | §11 | mechanism | `contracts/invariants.json`; `make invariant-check` (A04 §1) | — | grounded | — | Stale `source` line numbers inside the registry (A04 R-2). | Cite invariant `statement` text, never registry line numbers. |
| C-07 | Explicit separation of three determinations — technical certification ≠ scheme admission ≠ regulatory authorisation — with non-propagation in any direction. | §11 | architecture | ADR-061 (A01 §6.1) | — | grounded | — | none | — |
| C-08 | A fail-closed regulatory-state boundary with a Rust-decided RealMoneyActivationGate that cannot be bypassed. | §11 | mechanism | ADR-062; `regulatory-state.production.schema.json` (A01 §6.2, A06 §6) | — | grounded | — | none | — |
| C-09 | Structural conflict-of-interest control (creator == first operator) via five separated infrastructures + eight domain-separated key domains, with no self-privilege. | §11 | architecture | ADR-063; `BANZA_SEPARATION_MATRIX.md` (A01 §6.3, A06 §7) | — | grounded | — | none | — |
| C-10 | A transversal human interface (BanzAI) that explains via a local model but never decides, certifies, admits, publishes or activates funds — not a fourth layer, not an authority. | §11 | architecture | ADR-054/041/059 D-059-04; ADR-055 (A06 §9) | — | grounded | — | none | Frame BanzAI as component, never author (ED-05). |

---

## C. Architecture — the three institutional layers (§ Architecture)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| ARCH-01 | **L1 = BANZA Protocol** (open, neutral): rules, contracts, schemas, APIs, invariants, identity, manifests, signatures, discovery, profiles, signed metadata, trust, revocation, technical registry, federation, public verification. | Arch | definition | ADR-059 D-059-01 (A01 §1) | — | grounded | — | none | — |
| ARCH-02 | **L2 = Conformance & Interoperability Certification of an implementation** (evidence-based, Rust-decided, reproducible, hash-bound, scoped, time-limited, suspendable/revocable). | Arch | definition | ADR-059 D-059-02; ADR-064 (A01 §1/§3) | — | grounded | — | "certification" overload (CERT-06). | Always "certification **of an implementation**". |
| ARCH-03 | **L3 = Banzami Operational Scheme** — first operational scheme, Banzami designated operator, conditioned on the applicable regulatory framework. | Arch | definition | ADR-059 D-059-03; ADR-060 (A01 §1/§7) | — | grounded | — | none | Use "designated operator of the first operational scheme", not ADR-052's "future reference operator" (A06 §12). |
| ARCH-04 | The institutional Layers 1/2/3 are DISTINCT from the conformance profiles L0–L4 (ADR-021/038) and from the `banza-lN-readiness` engines; they must never be conflated. | Arch | boundary | ADR-021; `certification-boundary.md`; A01 §9.3; A02 §9/§13 | — | grounded | — | **HIGH** — same tokens, two axes ("L2" = Certification layer *and* Payment-Initiation level). | **MUST-FIX-before-v1.0**: explicit disambiguation paragraph; "Layer 1/2/3" vs "Level 0–4 / L0–L4". |
| ARCH-05 | Dependency graph is permanent: Operadores → BanzAI → BANZA; BANZA and BanzAI never depend on operators. | Arch | architecture | `BANZA_THREE_LAYER_ARCHITECTURE.md` §2; CLAUDE.md (A06 §2) | — | grounded | — | none | — |
| ARCH-06 | The institutional pipeline is unidirectional and each step is Rust-validated; scheme admission is a separate, later, regulator-conditioned decision never implied by any prior technical step. | Arch | mechanism | ADR-059 §9 (A01 §2) | — | grounded | — | none | Pair with B-02. |

---

## D. Open trust model — no CA (§ Trust)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| TRUST-01 | Trust is verified from signed protocol metadata + delegated keys + operator manifest + conformance evidence + public protocol registry + fail-closed revocation — never an operator certificate, a CA signature or a human approval. | Trust | mechanism | ADR-038; `banza-trust/src/lib.rs`; INV-OTE-* (A03 §3) | — | grounded | — | none | — |
| TRUST-02 | Signatures are Ed25519 over an ADR-038 canonical-JSON form (all fields except `signature`, sorted keys, compact JSON, base64url-no-pad), verified with `verify_strict`. | Trust | mechanism | ADR-038; `banza-trust` `canonical_bytes`/`verify_ed25519` (A03 §3) | RFC 8032 Ed25519 (candidate — verify); cf. RFC 8785 JCS (*related, not identical* — verify) | grounded | — | Canonical JSON is BANZA-defined, not asserted equal to JCS. | Do not claim RFC 8785 conformance; cite ADR-038 as the definition. |
| TRUST-03 | The trust root is threshold-controlled — no single entity may solely control it (2-of-2 M2 bootstrap → future 3-of-5 Shamir); offline root + delegated keys never reside on serving infrastructure. | Trust | mechanism | INV-ROOT-007; ADR-028; ADR-063 D-063-04 (A03 §3, A04 §4) | Shamir secret sharing (candidate — verify) | grounded | Future 3-of-5 is planned, not current — state as roadmap. | none | Frame the 3-of-5 Shamir step as future, 2-of-2 as current bootstrap. |
| TRUST-04 | Trust-root signing **scope**: the root signs *only* Key Manifests; delegated domain keys (issuing, revocation) sign protocol metadata, evidence and the BRL. | Trust | mechanism | INV-ROOT-004/005 (`invariants.json`, `complete.md:690`) **vs** `trust-root-metadata`/`signed-protocol-metadata`/`revocation-entry` production schemas (A04 R-1) | — | needs-source | Two active production schema vocabularies contradict the invariant registry on who signs what. | **HIGH** — a "who signs what" claim is currently unsupported by a single consistent source. | **MUST-FIX-before-v1.0**: adopt INV-ROOT-004/005 (registry precedence, `invariants.json:6`) as the governing statement AND reconcile the Model-B production schemas, or the paper must not assert a single signing scope. |
| TRUST-05 | Revocation is fail-closed and is a cryptographic security signal only — never a regulatory sanction, licence withdrawal or legal judgment. | Trust | boundary | INV-OTE-006; INV-FEDEVAL-005/010; `revocation-list.json:52` (A03 §3, A04 §4) | — | grounded | — | none | — |
| TRUST-06 | Federation trust evaluation is ten conjunctive, locally-executed, fail-closed checks a routing party runs over a peer's published material; BANZA is not in the trust path. | Trust | mechanism | ADR-040; INV-FEDEVAL-001..010 (A04 §1) | — | grounded | — | none | — |
| TRUST-07 | No BANZA-issued artifact about an operator and no human decision may be an input to the trust evaluation; registry *listing* is not a check. | Trust | boundary | INV-OTE-007/008; INV-FEDEVAL-008 (A03 §5, A04 §1) | — | grounded | Active-model verifier treats a missing published registry entry as a fail-closed status; reconcilable but distinct from ADR-040 routing. | MEDIUM — "listing is not a check" vs `TRUST_MISSING_REGISTRY_ENTRY` (A03 R-1). | State precisely *which* evaluation (M2 active-model trust vs ADR-040 federation routing) when leaning on "listing is not a check". |

---

## E. Invariants (§ Invariants)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| INV-01 | `contracts/invariants.json` is the single machine-readable source of truth for every financial, trust and structural invariant; the build fails on any cited-but-unregistered ID. | Inv | mechanism | `invariants.json:4`; `make invariant-check` (A04 §1) | — | grounded | — | Stale `source` line numbers (A04 R-2). | Cite `statement` text, not line numbers. |
| INV-02 | Financial invariants: double-entry (debits=credits), append-only immutability, integer minor-unit precision (no float), atomic postings, no double settlement. | Inv | definition | INV-LEDGER-*, INV-STL-*, MON-001 (A04 §1) | double-entry accounting (general concept — no citation needed) | grounded | — | `INV-SETTLE-*`/`INV-RECON-*` are advertised aliases of `INV-STL-*`/`INV-FED-RECON-001`. | Use canonical ids; note the aliases once. |
| INV-03 | Wallet balances are ledger-derived and never negative; `balance = available + reserved`. | Inv | definition | INV-WALLET-001 (A04 §1) | — | grounded | — | none | — |
| INV-04 | Idempotency/replay safety: same key + same body → same result; same key + different body → 409. | Inv | definition | INV-IDEM-001 (A04 §1) | — | grounded | — | none | — |
| INV-05 | QR integrity: dynamic single-use, expiry enforcement, terminal-state rejection, ledger↔status atomicity, server-side HMAC, environment binding. | Inv | definition | INV-QR-* (A04 §1) | HMAC RFC 2104 / SHA-256 FIPS 180-4 (candidate — verify) | grounded | — | none | — |
| INV-06 | These financial invariants are rules the protocol DEFINES, not a ledger it OPERATES; PostgreSQL stores protocol-state (hashes, trust artifacts, registry, audit log), never funds/balances/PII/private keys. | Inv | boundary | ADR-042 (A01 §8, A04 §5) | — | grounded | — | none | Pair with B-01. |

---

## F. Certification — Layer 2 (§ Certification)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| CERT-01 | The subject of certification is an **implementation** (`implementation_hash` of the exact artifact set tested), never an entity, brand or operator; a different build is a different subject. | Cert | definition | ADR-064 D-064-01; `certified-implementation.production.schema.json` (A04 §3) | — | grounded | — | none | Pair with B-08. |
| CERT-02 | A certification **profile** is a public, versioned yardstick derived only from L1 contracts, immutable once published, with a bounded (never open-ended) validity. | Cert | definition | ADR-064 D-064-02; `certification-profile.production.schema.json` (A04 §5) | — | grounded | — | none | — |
| CERT-03 | A **CertificationRecord** is the Rust-decided verdict binding hash-bound reproducible evidence, a scope never broader than the evidence, a validity window, the state, and a `record_hash`. | Cert | mechanism | ADR-064 D-064-03; `certification-record.production.schema.json` (A01 §3, A04 §5) | — | grounded | — | none | — |
| CERT-04 | Certification is not a CA signature and involves no certificate chain; a third party re-runs the profile's public vectors and MUST reproduce the hashes. | Cert | boundary | ADR-064 D-064-05 (A01 §3) | — | grounded | — | none | — |
| CERT-05 | The certification state machine is closed, total, deterministic: NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED; only CERTIFIED (in scope, in window, reproducible) reads valid; REVOKED is terminal; renewal = a new record. | Cert | mechanism | ADR-066 (A01 §3.3) | — | grounded | — | none | — |
| CERT-06 | Two distinct meanings of "certification": step-9 Certification **Readiness** (`banza-target-registry`, NEVER returns CERTIFIED) vs the `banza-certification` **authority** engine (can emit CERTIFIED). The journey never certifies. | Cert | boundary | A02 §10; `verdict.rs`; `banza-certification/Cargo.toml`; unit test `certification_readiness_never_certifies` | — | grounded | — | **HIGH** — a reader can wrongly infer the journey certifies. | **MUST-FIX-before-v1.0**: name both explicitly and state the journey stops at readiness. |
| CERT-07 | The **BANZA Technical Registry** is the single public, append-mostly, root-verifiable index of L2 artifacts, verifiable with no account, holding no funds/accounts/PII/scheme membership. | Cert | definition | ADR-065 (A01 §3.2) | — | grounded | Baseline is empty + honest (see B-09). | Registry ≠ scheme directory (B-06); three registries (B-07). | Name the surface "BANZA Technical Registry" explicitly. |

---

## G. Endpoint-originated validation & the nine-step journey (§ Validation)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| VAL-01 | Official validation is endpoint-originated: "the operator publishes; BanzAI obtains; Rust verifies; the receipt fixes the result; the Technical Registry publishes the verifiable state." | Val | mechanism | ADR-068; `operator-validation.yaml:13` (A02 §1, A04 §2) | — | grounded | — | none | Quote verbatim; attribute to `operator-validation.yaml`. |
| VAL-02 | The nine steps are Discovery, Manifest, Keys, Conformance, Interoperability, Trust, Federation, Evidence Bundle, Certification Readiness; the eight technical steps always run first so readiness derives from real endpoint evidence. | Val | mechanism | `validate.js` STEP_ORDER; `verdict.rs` (A02 §3) | — | grounded | — | `banza-trust` runs twice (keys + trust) — one engine (A02 R-3). | Note the two trust steps use one engine with different endpoint sets. |
| VAL-03 | The only component that reaches operator endpoints is an SSRF-hardened Rust fetcher: HTTPS-only, host pinned to the registry, blocks private/loopback/link-local/CGNAT/cloud-metadata, no cross-host redirect, size/time bounds, media-type + TLS validation, per-IP DNS-rebinding defence. | Val | mechanism | `engines/banza-artifact-fetcher` `policy.rs`/`fetch.rs` (A02 §11) | OWASP SSRF Prevention (candidate — verify) | grounded | — | none | — |
| VAL-04 | No pasted content, uploaded file, user URL, local fixture or pre-computed result may enter the official journey; upload/paste lives only in a local, non-authoritative DRAFT tool (`DRAFT_VALIDATION_RESULT`). | Val | boundary | ADR-068 §4.5; `operator-validation.yaml:22-25` (A02 §1, A04 §2) | — | grounded | — | none | — |
| VAL-05 | The closed Technical Registry is the ONLY source of validation targets; resolution decides eligibility over a closed set before any fetch, with typed ineligibility reasons; eligibility ≠ admission. | Val | boundary | `banza-target-registry` `registry.rs`; `model.rs::ResolutionReason` (A02 §5, A03 §4.1) | — | grounded | Closed production registry currently = one operator (`operator-zero`) + one implementation. | none | Frame the single entry as the reference/sandbox example, not a privileged trust position (A03 R-4). |
| VAL-06 | Certification Readiness aggregates the eight receipts but hard-sets `certification_status=NOT_CERTIFIED`, `certified/authorised/licensed=false`, `readiness=READY|BLOCKED`; it never issues a Certification Record and never returns CERTIFIED. | Val | boundary | `verdict.rs`; `journey-receipt.production.schema.json`; test `certification_readiness_never_certifies` (A02 §10, A03 §2.2) | — | grounded | — | none | — |

---

## H. Evidence & receipts (§ Evidence)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| EVD-01 | The Evidence Bundle is a verifiable technical evidence assembler, not a certificate and not an approval; every bundle carries `not_a_certificate=true`, `requires_conformance_evidence_review=true`, `llm_calls=0`, `external_model_called=false`. | Evd | definition | `engines/banza-evidence-bundle/src/lib.rs`; `evidence-bundle.production.schema.json` (A03 §1) | — | grounded | — | none | — |
| EVD-02 | Integrity is by SHA-256 content hashing, not signature or authority; `bundle_hash` is recomputed + matched on validation (fail-closed), with a forbidden-claim scan rejecting "certified"/"approved"/`production_ready`/`operator_certified`. | Evd | mechanism | `banza-evidence-bundle/src/lib.rs` (A03 §1) | SHA-256 FIPS 180-4 (candidate — verify) | grounded | — | none | — |
| EVD-03 | Each OperationReceipt binds a step's verdict to the exact origin of its inputs (`canonical_origin`, `endpoint`, `resolved_host`, `input_hash` sha256, `output_hash`, `engine`, `engine_version`, `reason_codes`); a receipt is not a certificate. | Evd | mechanism | `operation-receipt.production.schema.json`; `validate.js:167-207` (A03 §2.1) | — | grounded | `engine_version` may be `"unknown"`/`"n/a"` on some steps (A02 R-4). | none | Do not claim every receipt carries a numeric engine version. |
| EVD-04 | `qwen_calls` and `external_model_calls` are `const 0` on every OperationReceipt and JourneyReceipt; protocol fetches are counted separately as `protocol_fetch_count`, never as model calls. | Evd | mechanism | schemas + `validate.js:202-203,371-372` (A02 §8, A03 §2) | — | grounded | — | none | — |
| EVD-05 | Conformance evidence is reproducible and independently checkable by any third party; "evidence that cannot be reproduced is not evidence." | Evd | mechanism | INV-FEDEVAL-003; ADR-040:282 (A03 §5) | — | grounded | — | none | — |
| EVD-06 | A live Operador Zero journey (2026-07-30) ran honestly: `step_count=9`, `overall_status=FAILED`, `certification_status=NOT_CERTIFIED`, `certification_readiness=BLOCKED`, `external_model_calls=0`, `qwen_calls=0`. | Evd | mechanism | `docs/reports/M2_19G3A_…CLOSURE.md` (A03 §2.2) | — | grounded | Demonstration/sandbox evidence, not authorisation or production. | none | Frame explicitly as demonstration evidence (LIM-02). |

---

## I. Determinism — Rust decides, the model explains (§ Rust/BanzAI)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| DET-01 | "Rust understands, routes, executes, validates and DECIDES"; the local Qwen explains once and never decides, certifies, admits, publishes, activates funds, or changes a state/reason code. | Det | mechanism | ADR-059 D-059-05; ADR-054 (A01 §11, A06 §9) | — | grounded | — | none | Quote D-059-05 verbatim. |
| DET-02 | BanzAI is the transversal human interface across all three layers — not a fourth layer, not an authority; machine/SDK consumers keep direct access to the public APIs (BanzAI is not a mandatory machine gate). | Det | boundary | ADR-054; ADR-059 D-059-04 (A06 §9) | — | grounded | — | none | Pair with B-03. |
| DET-03 | The model is on-host (local Qwen via llama.cpp); external model calls = 0 (`external_model_called=false`). | Det | mechanism | ADR-044; README runtime state (A06 §9) | — | grounded | — | none | — |
| DET-04 | BanzAI may only guide from existing normative sources, must say "not defined" when a source is missing, and may draft but never activate rules. | Det | boundary | ADR-041 §5 (A06 §9) | — | grounded | — | none | — |

---

## J. Regulatory posture & the L3 scheme (§ Regulatory)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| REG-01 | The L3 scheme's regulatory state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` — a preparation state conferring no operational permission; it does NOT mean authorisation granted, regulator/BNA approval, licence complete, or permission to move funds. | Reg | boundary | ADR-062 D-062-01; `regulatory-state.production.schema.json` (A06 §6) | — | grounded | — | none | Use the canonical negation list; never present the state as a status claim. |
| REG-02 | Real money is OFF by hard default — `real_money/wallets/settlement/participants/bna_approval_claimed` all `const false`. | Reg | boundary | ADR-062 D-062-02; `regulatory-state` schema (A04 §5, A06 §6) | — | grounded | — | none | — |
| REG-03 | The RealMoneyActivationGate is a single, hard, fail-closed, Rust-decided gate requiring ~18 conditions; it cannot be bypassed by config, flag, admin, API, CLI, natural language, or the model layer. | Reg | mechanism | ADR-062 D-062-05/06 (A01 §6.2, A06 §6) | — | grounded | — | none | — |
| REG-04 | The only admissible public regulatory phrasing today: "A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem desactivados." | Reg | mechanism | ADR-062 D-062-03; `BANZA_REGULATORY_CLAIM_POLICY.md` (A01 §11, A06 §6) | — | grounded | — | none | Reproduce verbatim; do not paraphrase into a stronger claim. |
| REG-05 | No BNA-specific language may be published today (all five gate conditions fail). | Reg | boundary | ADR-062 D-062-04; `BANZA_REGULATORY_CLAIM_POLICY.md:80-100` (A06 §6) | — | grounded | — | none | — |
| REG-06 | Banzami is the designated operator of the first operational scheme, conditioned on the regulatory framework; the designation does not make BANZA an operator, does not make certification exclusive to the scheme, and does not itself authorise any real-money operation. | Reg | definition | ADR-060 D-060-01 (A01 §7, A06 §5) | — | grounded | — | Do not collapse Banzami's "creator/maintainer" hat (ADR-043) with its "L3 operator" hat (A01 §7). | Keep the two Banzami roles distinct. |
| REG-07 | Certification is not exclusive to the scheme; other legally-eligible entities may run independent schemes; the architecture must not assume only one scheme/operator exists. | Reg | boundary | ADR-060 D-060-03/04 (A06 §5) | — | grounded | — | none | — |

---

## K. Conflict-of-interest controls (§ Conflict of Interest)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| COI-01 | Because BANZA's creator (Banzami) is also the first scheme operator, the conflict is controlled structurally, not by promise. | COI | architecture | ADR-063 D-063-01; `BANZA_CONFLICT_OF_INTEREST_POLICY.md` (A06 §7) | — | grounded | — | none | — |
| COI-02 | No self-privilege: Banzami's own implementation is certified through the same public profile, suites, Rust engine, reason codes, validity and revocation as any other; a FAIL is a FAIL — no human converts it. | COI | boundary | ADR-063 D-063-02; INV-OTE-008 (A06 §7) | — | grounded | — | none | — |
| COI-03 | Five separated infrastructures (Protocol / Certification+Registry / BanzAI / Banzami Scheme / Regulated data) and eight domain-separated key domains, never reused. | COI | architecture | ADR-063 D-063-03/04; `BANZA_SEPARATION_MATRIX.md` (A01 §6.3) | — | grounded | — | none | — |

---

## L. Operador Zero — the reference implementation (§ Operador Zero)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| OZ-01 | Operador Zero is a sandbox/demo reference implementation: `demo_only=true`, currency `KZ_DEMO`, moves no real money, holds no private keys, `production_allowed=false`. | OZ | definition | `engines/operator-zero-core/src/lib.rs`; ADR-052 (A06 §8) | — | grounded | — | none | — |
| OZ-02 | Operador Zero is a read-only reference surface: it exposes its identity/manifest/keys/metadata/evidence/status and runs nothing (no simulation, no mutable ledger, no self-certification). | OZ | definition | ADR-067; `OperadorZeroReference.tsx` (A06 §8) | — | grounded | — | none | — |
| OZ-03 | Its status is NOT_CERTIFIED / PRE_PRODUCTION; it is never a real operator, never appears in `/operators`, and represents no authorisation/certification/licence. | OZ | boundary | ADR-052 D-6/D-7; ADR-067 D-067-06; `operator-zero-validation-state.json` (A06 §8) | — | grounded | — | none | Pair with B-05. |
| OZ-04 | Operador Zero receives no shortcut: it is resolved and fetched through the same secure Rust path as any future published implementation, producing real receipts. | OZ | mechanism | ADR-068 §4.9; ADR-067 D-067-02 (A02 §12, A03 §7) | — | grounded | — | none | — |

---

## M. Governance & openness (§ Governance)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| GOV-01 | BANZA governance is open today via the public repository (issues, PRs, ADRs, RFCs, specs, releases, conformance tests, deterministic engines, public evidence) — not a future promise. | Gov | mechanism | `GOVERNANCE.md` (A06 §3) | — | grounded | — | none | — |
| GOV-02 | Governance does not license/approve/certify operators, issue financial licences, or replace regulators; central human approval is not a protocol requirement — participation is demonstrated by evidence, not granted by an admitter. | Gov | boundary | `GOVERNANCE.md`; README; ADR-041 §4 (A06 §3) | — | grounded | — | none | — |
| GOV-03 | Implementing BANZA, publishing endpoints, running the engines, validating and generating receipts require no BanzAI account, no email code, no Candidate Registry and no BANZA-team authorisation. | Gov | boundary | ADR-069 §4 (A01 §5) | — | grounded | — | none | — |
| GOV-04 | Onboarding (passwordless email-OTP + `.well-known` origin proof) is a hosted BanzAI service, not part of the protocol's mandatory rules; the Candidate Registry is private and NOT protocol core. | Gov | mechanism | ADR-069; `engines/banzai-onboarding` (A01 §5, A03 §4.2) | HMAC RFC 2104 (candidate — verify, OTP digest) | grounded | — | Three "registry" surfaces (B-07). | Do NOT expose OTP/session/Resend/infra detail — describe the boundary, not the delivery mechanism. |

---

## N. Boundary claims (explicit — required set)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| B-01 | BANZA is not a bank, PSP, wallet, e-money institution or financial operator; it holds/moves no funds, runs no client accounts, does not settle, issues no licences, and replaces neither regulator nor scheme. | Boundaries | boundary | ADR-059 D-059-01; `spec/overview.md:3`; every production `_boundary` (A04 §5, A06 §4) | — | grounded | — | none | Recurring banner; state on cover/abstract and in the boundaries section. |
| B-02 | Technical certification ≠ scheme admission ≠ regulatory authorisation; none implies, grants, propagates to or substitutes for the others (non-propagation in ANY direction). | Boundaries | boundary | ADR-061 (A01 §6.1) | — | grounded | — | none | No single "approved/verified" badge; explain the three separately. |
| B-03 | BanzAI is not an authority (not normative, not a certifier/approver/licenser/PSP) and not a fourth layer. | Boundaries | boundary | ADR-054; ADR-059 D-059-04 (A06 §9) | — | grounded | — | none | — |
| B-04 | The local model (Qwen) never decides — it only explains results already determined by the Rust engines. | Boundaries | boundary | ADR-059 D-059-05; `verdict.rs:1-7` (A02 §8) | — | grounded | — | none | — |
| B-05 | Operador Zero is not a production operator and not a real-money path. | Boundaries | boundary | ADR-052; ADR-067; `regulatory-state` schema (A06 §8) | — | grounded | — | none | — |
| B-06 | The closed Technical Registry is BANZA's own list of eligible validation targets — not a trust anchor and not a mandatory global directory operators must appear in to be trusted; independent parties reproduce conformance without consulting any BANZA registry (registry ≠ scheme directory). | Boundaries | boundary | ADR-065 D-065-03; INV-FEDEVAL-008; A03 §5 | — | grounded | — | none | Explicitly deny "global monopoly / mandatory global directory". |
| B-07 | Three distinct "registry" surfaces, each named explicitly: (1) the **closed BANZA Technical Registry** (validation targets / public read-only state, `banza-target-registry`, feeds `/operators`); (2) the **Public Protocol Registry** anchor (INV-FEDEVAL-008); (3) the **private Candidate Registry** (onboarding, NOT protocol core). | Boundaries | boundary | A03 §9.2; `registry.rs`; `invariants.json` INV-FEDEVAL-008; `banzai-onboarding/lib.rs` | — | grounded | — | MEDIUM — one word, three surfaces. | **MUST-FIX-before-v1.0**: name all three on first use; never let "registry" stand unqualified. |
| B-08 | Operator (entity) ≠ implementation (technical system); one operator may publish many implementations; certification is per-implementation, bound to `implementation_hash`. | Boundaries | boundary | ADR-068 §4.2; `operator-record`/`implementation-record` schemas (A04 §3) | — | grounded | — | none | Human label "Validar operador" means *evaluating an implementation* (A01 §4). |
| B-09 | At v1.0 the public surface is empty and honest: `production_certificates=false`, `/operators=[]`, no placeholder/aspirational entry; absence from the registry is not a regulatory prohibition. | Boundaries | boundary | ADR-065 D-065-07; `protocol-version.json`; README (A06 §10) | — | grounded | Pre-production baseline (LIM-01). | none | Never present the empty state as a defect or as prohibition. |

---

## O. Limitations (scoped — honest limits)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| LIM-01 | The protocol is at pre-production baseline (`state=M2_PROTOCOL_IMPLEMENTATION`, `pre_production=true`); no operator is in production and no production certificate has been emitted. | Limitations | limitation | `protocol-version.json`; README (A06 §10) | — | scoped-limitation | This is the state, not a shortcoming to hide. | none | State plainly in Limitations; do not soften into a capability claim. |
| LIM-02 | All live validation evidence to date is demonstration/technical evidence (e.g. Operador Zero), not authorisation and not production-proven. | Limitations | limitation | `M2_19G3A_…CLOSURE.md`; README (A03 §7) | — | scoped-limitation | — | none | Forbidden word "production-proven" must not appear (ED-07). |
| LIM-03 | No real-money flow has been exercised; the RealMoneyActivationGate has never been opened. | Limitations | limitation | ADR-062; `regulatory-state` schema (A06 §6) | — | scoped-limitation | — | none | — |
| LIM-04 | The canonical protocol Reference (`completa.md`/`complete.md`) predates the three-layer model and does not describe L2/L3; three-layer/certification material is sourced from ADR-059..066 + governance docs, not the Reference chapters. | Limitations | limitation | A01 §9.2 (Reference last touched M2.19B) | — | scoped-limitation | Reference has 0 occurrences of three-layer/Technical Registry/scheme admission. | none | **MUST-FIX-source**: do NOT cite the Reference for any three-layer/L2/L3 claim; cite the ADRs + governance docs. |
| LIM-05 | Two production trust-schema vocabularies coexist on what the trust root signs; the paper adopts INV-ROOT-004/005 as governing pending reconciliation (see TRUST-04). | Limitations | limitation | A04 R-1 | — | scoped-limitation | — | HIGH (see TRUST-04). | **MUST-FIX-before-v1.0** (linked to TRUST-04). |
| LIM-06 | Federation trust evaluation is specified and locally reproducible, but no cross-operator production federation has occurred (no second production operator exists). | Limitations | limitation | ADR-040; `protocol-version.json` `operators=[]` (A04 §1, A06 §10) | — | scoped-limitation | Interoperability is specified + demonstrable, not yet demonstrated across multiple production operators. | none | Frame interoperability as specified/demonstrable, never as multi-operator-proven. |

---

## P. Editorial · identity · licence (§ Colophon)

| claim_id | claim (concise) | page/section | type | BANZA source (path/ADR) | external ref | evidence_state | limitation | ambiguity_risk | editorial_decision |
|---|---|---|---|---|---|---|---|---|---|
| ED-01 | Authors: **Fidel R. Monteiro** (first, order locked) and **Jesus R. Monteiro**, co-founders of Banzami. | Colophon | definition | `WHITEPAPER_AUTHOR_AND_AFFILIATION_RECORD.md` | — | grounded | "equal contribution"/"joint first"/"corresponding author" NOT asserted without human decision. | none | Do not invert order; do not add unclaimed authorship relations. |
| ED-02 | Publisher & affiliation: **Banzami** — legal name **"BANZAMI – Tecnologia e Serviços, Lda."** (canonical en-dash mixed-case form). | Colophon | definition | author record; `NOTICE`; A06 §1/§12 | — | grounded | — | Casing inconsistent across surfaces (all-caps `LDA.` vs `Lda.`). | Use the task's exact form verbatim; note both renderings exist. |
| ED-03 | The protocol was originally created on 01/08/2025 by Banzami — historical creation / initial availability ONLY; NOT a production, certification, authorisation, active-operator, Trust-Root-issuance or federation date. | Colophon | boundary | `GOVERNANCE.md`; `NOTICE`; `MAINTAINERS.md` (A06 §1) | — | grounded | — | none | Never present the creation date as an operational/authorisation milestone. |
| ED-04 | The Whitepaper is non-normative (no MUST/SHALL of its own except when quoting the Reference); documentation licence is **CC BY 4.0**; no DOI/ISBN/ISSN is claimed. | Colophon | boundary | `docs/governance/licensing.md`; `README.md:511`; author record (A05 §6) | Apache-2.0 (code); CC BY 4.0 (docs) | grounded | — | none | Declare CC BY 4.0 on the cover; do not relicense Apache-2.0; imply no trademark grant. |
| ED-05 | BanzAI and other tools are described as technical components of the system, never as authors or editorial collaborators. | Colophon | boundary | author record | — | grounded | — | none | — |
| ED-06 | Examples use **Operador A / B / C / D** placeholders; no real commercial operator brand may appear; Banzami is the only permitted named creator/publisher/first-scheme entity. | Colophon | boundary | CLAUDE.md `identity-check`; A05 §5 | — | grounded | Once committed, `docs/whitepaper` is scanned by contamination guard. | none | Enforce A–D placeholders; keep Banzami as allowed entity. |
| ED-07 | Forbidden claim vocabulary the paper must never use: *first / only / revolutionary / unprecedented / fully-decentralised / trustless / guaranteed / regulator-approved / production-proven / real-funds(active)*; plus obsolete terms *"BANZA CA" / operator X.509 / operator certificate / general/entity/company certificate / BANZA-as-bank-or-PSP / BanzAI-as-authority / Qwen-as-decider / Operador-Zero-as-production*. | All | boundary | task binding facts; A01 §9, A02 §13, A03 §8, A04 §6, A05 §9, A06 §11 | — | grounded | — | none | Drafting-pass denylist; a hit is a Gate blocker. |

---

## Q. MUST-FIX-before-v1.0 register (consolidated)

Every item below must be resolved before v1.0 sign-off. Each links to its claim row.

| # | Item | Linked claim(s) | Nature | Required fix |
|---|---|---|---|---|
| MF-1 | **Trust-root signing scope is contradictory** across active production schemas vs the invariant registry. | TRUST-04, LIM-05 | Unsupported claim (contradiction R-1) | Adopt INV-ROOT-004/005 as governing (registry precedence, `invariants.json:6`) AND reconcile `trust-root-metadata`/`signed-protocol-metadata`/`revocation-entry` production schemas — or the paper must not assert a single "who signs what". |
| MF-2 | **L1/L2/L3 vs L0–L4 token overload** — institutional Layers vs conformance Levels vs `banza-lN-readiness` engines. | ARCH-04, C-01 | Conflation → would produce unsupported claims | Add an explicit disambiguation paragraph; use "Layer 1/2/3" for the institutional axis and "Level 0–4 / L0–L4" for the conformance axis, consistently. |
| MF-3 | **Two meanings of "certification"** — step-9 Certification Readiness (never CERTIFIED) vs the `banza-certification` authority engine (can emit CERTIFIED). | CERT-06 | Conflation → reader may infer the journey certifies | Name both explicitly; state the nine-step journey stops at *readiness* and never issues a Certification Record. |
| MF-4 | **Three "registry" surfaces share one word.** | B-07, CERT-07, GOV-04 | Ambiguity → unqualified "registry" is unsupported | Name all three on first use: closed BANZA Technical Registry / Public Protocol Registry / private Candidate Registry; never leave "registry" unqualified. |
| MF-5 | **Do not source three-layer / L2 / L3 material from the canonical Reference** (`completa.md`/`complete.md`) — it predates the model (0 occurrences). | LIM-04, ARCH-01..03 | Wrong source → unsupported if cited there | Cite ADR-059..066 + governance docs (`BANZA_THREE_LAYER_ARCHITECTURE.md`, `BANZAMI_OPERATIONAL_SCHEME.md`, `BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md`, `BANZA_SEPARATION_MATRIX.md`, `BANZA_RESPONSIBILITY_MATRIX.md`). |
| MF-6 | **Do not describe an emitted-"certificates" registry table** (obsolete `completa.md:685`, removed by ADR-058). | CERT-03, CERT-07 | Obsolete claim | L2 uses a per-implementation `CertificationRecord` in the Technical Registry; there is no `certificates` table and no `/certificates` route. |
| MF-7 | **External references need bibliographic verification.** | TRUST-02, INV-05, EVD-02, VAL-03, GOV-04 | Unverified citations | Verify RFC 8032 / FIPS 180-4 / RFC 2104 / OWASP SSRF and Shamir; do NOT claim RFC 8785 (JCS) conformance for the ADR-038 canonical form; invent no DOI/ISBN/ISSN. |
| MF-8 | **Program reconciliation.** No canonical program/§11 file exists; C-01…C-10 + TH-\* are reconstructed. | C-01..C-10, TH-01..04 | Provenance gap | When the program is authored, reconcile its §11 + thesis against this matrix; divergence is a Gate-A open question. |

---

## R. Ambiguity / disambiguation register (quick index)

| risk | claims touched | severity | disposition |
|---|---|---|---|
| Layer L1/L2/L3 vs Level L0–L4 vs `lN-readiness` engines | ARCH-04, C-01, C-03 | HIGH | MF-2 |
| "Certification" = Readiness vs Authority engine | CERT-06, VAL-06, C-03 | HIGH | MF-3 |
| "Registry" = three surfaces | B-07, CERT-07, VAL-05, GOV-04 | MEDIUM | MF-4 |
| Trust-root "who signs what" (R-1) | TRUST-04, LIM-05 | HIGH | MF-1 |
| "registry listing is not a check" vs `TRUST_MISSING_REGISTRY_ENTRY` (R-1/A03) | TRUST-07 | MEDIUM | Name the exact evaluation when leaning on it. |
| Reference predates three-layer model | LIM-04, ARCH-01..03 | MEDIUM | MF-5 |
| Stale `source` line numbers in `invariants.json` (R-2) | INV-01, C-06 | LOW | Cite statement text, not line numbers. |
| Banzami two hats (creator/maintainer vs L3 operator) | REG-06 | LOW | Keep the roles distinct (A01 §7). |
| Legal-name casing inconsistency | ED-02 | LOW | Use the task's exact en-dash form; note both. |
| `spec/overview.md` "5 conceptual layers / 4-layer signature hierarchy" (R-3) | ARCH-01..06 | LOW | Do not conflate with the 3 institutional layers; treat overview certification framing as incomplete. |
| `engine_version` may be "unknown"/"n/a" (R-4) | EVD-03 | LOW | Do not claim every receipt carries a numeric version. |
| "BANZA CA" in two `Cargo.toml` descriptions (package metadata only) | EVD-01, ED-07 | LOW | Not a public claim; do not quote those descriptions; prefer the corrected `lib.rs`/output wording. |

---

## S. Coverage summary

- **Total material claims:** 71 (TH ×4, C ×10, ARCH ×6, TRUST ×7, INV ×6, CERT ×7, VAL ×6, EVD ×6,
  DET ×4, REG ×7, COI ×3, OZ ×4, GOV ×4, B ×9, LIM ×6, ED ×7).
- **grounded:** 69 · **needs-source:** 1 (TRUST-04) · **scoped-limitation:** 6 (LIM-01..06; TRUST-04 is
  also mirrored by LIM-05).
- **Boundary claims explicitly present (all required):** BANZA ≠ bank/PSP/wallet/operator (B-01);
  certification ≠ admission ≠ authorisation (B-02, C-07); BanzAI not authority (B-03); Qwen not decider
  (B-04); Operador Zero not production (B-05); registry not a global monopoly / mandatory directory
  (B-06); three registries named (B-07); operator ≠ implementation (B-08); honest empty baseline (B-09).
- **MUST-FIX-before-v1.0:** 8 (MF-1…MF-8); the only genuinely *unsupported* claim is TRUST-04 (trust-root
  signing scope). All others are conflation/sourcing/verification blockers that would *become*
  unsupported if left unresolved.
- **Rule satisfied:** every claim maps to a grounded BANZA source **or** is marked a scoped limitation.
