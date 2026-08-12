# BANZA — Conformance

> This document describes: **BANZA** — the Open Financial Protocol.
> For other layers: BanzAI — the Native Protocol Agent.

**Version:** 1.0  
**Date:** 2026-05-30  
**Status:** Official  
**Authority:** ADR-021 (conformance level capability alignment), ADR-002 (ecosystem naming)

---

> **⚠ Pre-production status.** This document specifies the protocol's **conformance
> readiness levels** and how protocol trust is evaluated. Production trust metadata
> is **not open**: it depends on milestones M2 (root trust ceremony) and M3 (first
> operator to publish verifiable conformance evidence). No operator has published
> today; the public protocol registry is empty (`/operators = []`,
> `production_certificates = false`). The conformance suite is available now and
> produces technical **evidence** — a PASS is a conformance result, not an
> authorisation. Trust is evaluated by **Open Trust Evaluation** over self-published
> material; **there is no BANZA CA, and no central authority reviews, approves,
> issues or certifies an operator**. Everything below describing publication,
> evaluation and registry listing describes how the model **will operate once
> production trust metadata opens**.

---

## Overview

BANZA conformance is the verifiable demonstration that a concrete operator implementation satisfies the BANZA protocol at a given readiness level; the operator is the organisational entity that publishes the implementation and its evidence. Conformance is:

- **Earned** — by passing the conformance suite, not by self-declaration
- **Level-bound** — five readiness levels (0–4) with increasing protocol depth
- **Version-bound** — tied to a specific protocol version
- **Evidence-based** — a conformance run produces an Evidence Bundle; trust in that evidence is assessed by Open Trust Evaluation, and stale or revoked material fails closed (fecho por omissão)
- **Tool-verified** — conformance tests are deterministic; AI inference is not a substitute
- **Self-published** — operators publish their own manifest, Evidence Bundle and signed protocol metadata; no central authority accepts, approves, issues or certifies anything

> An operator with published conformance evidence is one whose conformance suite results, financial invariants, and manifest are consistent and independently verifiable — assessed by Open Trust Evaluation, not certified by any authority.

BanzAI can guide operators through preparing and publishing conformance evidence — but only the conformance suite determines the result. Operators run conformance in the BanzAI. See the BanzAI capabilities documentation.

---

## Universal Conformance Rules

The following rules apply at **all conformance readiness levels** (0–4). Violation of any universal rule is an immediate conformance blocker regardless of level.

### MON-001 — Monetary Integer Representation

| Field | Value |
|-------|-------|
| ID | `MON-001` |
| Name | Monetary Integer Representation |
| Applies to | All levels (0–4) |
| Severity | CRITICAL |

**Definition:** All monetary values MUST be represented as integer minor units. Floating-point monetary representation is prohibited across the entire protocol surface.

| Violation | Result |
|-----------|--------|
| Float values in API request/response | Conformance FAIL |
| Float values in traces or structured logs | Conformance FAIL |
| Float values in operator manifests | Conformance FAIL |
| Float values in settlement messages | Conformance FAIL |
| Float values in wallet balances | Conformance FAIL |
| `gross_minor ≠ net_minor + fee_minor` | Conformance FAIL |
| `balance_minor ≠ available_minor + reserved_minor` | Conformance FAIL |

See [docs/reference/en/complete.md §9 — Normative: Monetary Representation](../reference/en/complete.md) for the full monetary representation specification.

---

## Conformance Readiness Levels

Conformance readiness levels are cumulative and capability-oriented. Each level represents a set of demonstrated protocol capabilities — not a technology stack or product type. Operators implement capabilities in any language, database, or runtime they choose.

### Canonical level names (authoritative)

This document defines the **canonical, authoritative** names for the five levels.
All BANZA materials use these names:

| Level | Canonical name |
|-------|----------------|
| L0 | Protocol Sandbox |
| L1 | Core Payment Capability |
| L2 | Payment Initiation Capability |
| L3 | Inter-Operator Interoperability |
| L4 | External Interoperability |

**Deprecated names — crosswalk.** Earlier drafts and historical readiness
reports use an older operator-type naming. Those names are **deprecated**. They
are retained inside dated reports as historical record (their text is not
rewritten); everywhere else, use the canonical names above. The mapping is:

| Deprecated name | Canonical name |
|-----------------|----------------|
| Sandbox Operator / Protocol Foundation | Protocol Sandbox (L0) |
| Payment Operator / Core Operator | Core Payment Capability (L1) |
| Settlement Operator / Full Operator | Payment Initiation Capability (L2) |
| Federation Operator | Inter-Operator Interoperability (L3) |
| Infrastructure Operator | External Interoperability (L4) |

> **Capability scope, not just naming.** The deprecated labels also carried an
> older per-level *capability* mapping (e.g. trace/settlement features were
> associated with "L2 Settlement Operator"). That older mapping has been
> **corrected**: the conformance suite and report schema now bind each capability
> to the level defined in the sections below (ADR-021). Traceability is L1; payment
> initiation (payment requests, dynamic QR, instant execution) is L2. This
> document's capability definitions are authoritative, and the conformance suite
> matches them.

### Conformance level model (single source)

This table is the authoritative summary of what each level proves and how it is
verified. The conformance vectors (`conformance/vectors/`), the runner
(`tools/banza-conformance/`), and the report schema (`conformance/report-schema.json`)
all conform to it (ADR-021).

| Level | Capability | Verified by | Sandbox-runner award |
|-------|-----------|-------------|----------------------|
| L0 | Protocol Sandbox — instantiate safely, declare `simulated`, valid manifest, MON-001 | L0 vectors; runner `health`, `manifest` | Yes |
| L1 | Core Payment Capability — wallets, transfers, ledger double-entry, idempotency, **traceability** | L1 vectors; runner `wallets`, `transfers`, `traces` | Yes |
| L2 | Payment Initiation Capability — payment requests, dynamic QR, instant execution, INV-QR | L2 vectors; runner `payment_initiation` | Yes |
| L3 | Inter-Operator Interoperability — federation routing, reconciliation, inter-operator settlement, published signed protocol metadata + L3 conformance evidence | Federation suite (`run_fed.py`, `--federation`) | No — multi-operator evidence |
| L4 | External Interoperability — external-rail acquiring | External Interoperability profile (external integration evidence) | No — profile-defined |

The single-operator **sandbox runner awards L0–L2**. L3 requires multi-operator
federation evidence; L4 requires external-rail evidence. Neither is awarded by the
sandbox runner, and no operator is certified, accepted or approved in this repository —
levels denote conformance readiness only.

---

### Level 0 — Protocol Sandbox

**Purpose:** Prove the operator can instantiate the BANZA protocol in a controlled test environment and that its core financial representation is correct.

**Requirements:**
- Valid Protocol Capability Manifest (certification level declared as 0)
- MON-001 — Monetary Integer Representation (universal rule)
- Sandbox environment reachable at declared endpoint
- Basic payment initiation and balance query pass in sandbox
- No live payment rails required

**What this level covers:** Safe sandbox operation, test event handling, and protocol developer resources. Exercised locally in the BanzAI — no central credential issuance.

---

### Level 1 — Core Payment Capability

**Purpose:** Consumer payment capability, merchant acceptance capability, transfer capability, and traceability capability.

**Required capabilities:**
- `consumer_payment` — consumer payment initiation and reception
- `merchant_acceptance` — merchant payment acceptance and balance management
- `transfer` — @handle-to-@handle value transfer
- `traceability` — trace propagation across the operator's payment surface

**Required invariants:**
- INV-LEDGER-001 — double-entry balance
- INV-LEDGER-002 — immutable entries
- INV-LEDGER-003 — no floating-point money
- INV-LEDGER-004 — atomic posting
- INV-WALLET-001 — balance consistency
- INV-STL-001 — no money creation
- INV-STL-002 — no negative balances
- INV-IDENT-001 — handle uniqueness
- INV-TRACE-001 — trace propagation

**Conformance assets:** L1 vectors in `conformance/vectors/` (transfers, ledger-postings, wallet-balances, core event-envelopes, traceability) + runner suites `wallets`, `transfers`, `traces` (`engines/banza-conformance`).

**What this level covers:** Core payment operations (wallets, transfers, ledger, traceability), operated at the operator's own declared limits. Conformance is demonstrated by published evidence; no central authority issues credentials or keys.

---

### Level 2 — Payment Initiation Capability

**Purpose:** Payment initiation capability, payment request capability, and instant execution capability.

**Includes:** All Level 1 requirements.

**Additional required capabilities:**
- `payment_request` — encoded payment request (QR or equivalent) with embedded amount
- `payment_initiation` — pull-payment initiation via URL or equivalent mechanism
- `instant_execution` — T+0 (instant) settlement to recipient

**Additional required invariants:**
- INV-QR-001 — payment request single-use enforcement
- INV-QR-002 — payment request amount immutability

**Conformance assets:** All L1 assets + L2 vectors in `conformance/vectors/` (payment-requests, qr-payloads, settlement-batches, payment/QR event-envelopes) + runner suite `payment_initiation`.

**What this level covers:** Payment request issuance, payment link initiation, and instant settlement for merchants.

---

### Level 3 — Inter-Operator Interoperability Capability

**Purpose:** Inter-operator interoperability capability — cross-operator routing, inter-operator settlement, and automated reconciliation. This is the federation eligibility threshold. No operator below L3 may participate in BANZA federation. *(Authority: ADR-021, ADR-040)*

**Includes:** All Level 1–2 requirements.

**Additional required capabilities:**
- `cross_operator_routing` — participation in BANZA federation routing table
- `reconciliation` — automated ledger reconciliation across operator boundaries
- `inter_operator_settlement` — batch net settlement between conformant operators (operators with published L3 conformance evidence)

**Required operator infrastructure:**
- Published **operator manifest** with `certification_level >= 3`, `supports_federation: true` declared (INV-FEDEVAL-007) and `cross_operator_routing: true` declared, served at the operator's own well-known location (self-publication)
- Published **signed protocol metadata** for the operator
- Published **L3 conformance evidence** (Evidence Bundle) consistent with the manifest
- Trust assessed by **Open Trust Evaluation**: delegated signing keys → signed protocol metadata → operator manifest + conformance evidence + public protocol registry + revocation/fail-closed. There is no BANZA CA and no operator certificate
- `POST /federation/route` endpoint operational
- `GET /federation/obligations` endpoint operational
- Operator not present in the BANZA Revocation List (BRL)

**Conformance assets:** All L2 assets + the federation suite (`conformance/federation/`, run via `banza-conformance-rs run-fed`: FED-CERT, FED-DISC, FED-TRUST, FED-ROUTE, FED-EXEC, FED-OBL, FED-EVT, FED-SETTLE, FED-FAIL). L3 requires multi-operator evidence and is not awarded by the single-operator sandbox runner.

**What this level covers:** Cross-operator payment routing, inter-operator settlement and reconciliation, indexing in the public protocol registry once verifiable evidence is published, and higher operator-declared limits.

---

### Level 4 — External Interoperability Capability

**Purpose:** External interoperability capability — integration with external payment networks and highest-tier protocol participation. Includes all Level 3 federation capabilities.

**Includes:** All Level 1–3 requirements (including full federation).

**Additional required capabilities:**
- `external_acquiring` — integration with an external payment network or acquiring infrastructure (operator's choice of network)

**Conformance assets:** All L3 assets + the External Interoperability profile. External-rail acquiring cannot be proven against a simulated sandbox, so L4 is **profile-defined**: it requires external integration evidence (and external-rail vectors) and is never auto-awarded by the sandbox runner. No production external-rail integration is claimed in this repository.

**What this level covers:** External payment network integration, highest operator-declared limits, and full protocol network participation.

---

## Conformance Evidence Process

### Step 1: Prepare your manifest

Create a valid manifest for your target level. Run the Manifest Validator to verify it passes structural and semantic validation. See the BanzAI capabilities documentation for the BanzAI Operator Builder and Manifest Validator tools.

### Step 2: Implement the capabilities

Build your operator implementation against the BANZA protocol contracts in `contracts/`. The protocol is technology-neutral — implement in any language, database, or runtime that satisfies the invariants. See [spec/overview.md](../../spec/overview.md) for the protocol layer model.

### Step 3: Run the conformance suite

Operators run conformance in the **BanzAI**. The CLI shown below is a
maintainer / development tool that runs the same conformance suite:

```bash
banza-conformance run \
  --level 1 \
  --api-key bz_test_... \
  --base-url https://sandbox-api.youroperator.ao \
  --output conformance-results.json
```

All tests must pass. A single failure blocks conformance for that level.

### Step 4: Publish your conformance evidence

Publish your **Evidence Bundle**, **operator manifest** and **signed protocol
metadata** at your own well-known location. This is **self-publication**: there is no
central authority, nothing to submit, and no step in which any human approves an operator.

### Step 5: Open Trust Evaluation

Any party (including BanzAI) evaluates the published material:
- Delegated signing keys verify against the pinned **Trust Root** (offline, threshold custody)
- Signed protocol metadata is valid and current
- Operator manifest and conformance evidence are consistent with each other
- The operator is absent from the BANZA Revocation List (BRL)

Missing, invalid, expired, revoked or incompatible material **fails closed** (fecho
por omissão). This is verification of published evidence — **not** authorisation,
licensing, approval or certification of the operator. Humans maintain and evolve the
protocol; they do not authorise, accept, approve or certify operators.

### Step 6: Public Protocol Registry

The public protocol registry (`/operators`) indexes operators that have published
verifiable evidence. Today `/operators = []` and `production_certificates = false` —
no operator has published; production trust metadata depends on milestones M2/M3.
When production trust metadata opens (M2/M3), operators will publish signed protocol
metadata and conformance evidence, and the registry will index that verifiable
evidence — **no central authority issues certificates**.

---

## Conformance Evidence Maintenance

Operators keep their published conformance evidence and signed protocol metadata
**current**. Open Trust Evaluation treats stale, expired or revoked material as
failing closed (fecho por omissão) — there is no certificate to renew and no
authority to re-issue one.

### Re-run triggers

| Trigger | Action required |
|---------|----------------|
| Protocol major version update | Re-run full conformance suite for your level and re-publish evidence |
| New capability added to manifest | Re-run conformance for the new capability and re-publish evidence |
| Signed protocol metadata approaching expiry | Refresh and re-publish before it becomes stale |
| Invariant failure detected in your own monitoring | Fix, re-run conformance and re-publish evidence |

### Keeping evidence verifiable

Published evidence is only useful while it stays verifiable. Operators are expected to:
- Re-run conformance and re-publish after protocol or capability changes
- Keep signed protocol metadata and delegated-key material current
- Track their own financial invariants via OTel attributes and structured traces

### Revocation and fail-closed

There is no suspension performed by an authority. Trust in published material simply
**fails closed** when:
- Signed protocol metadata or conformance evidence is missing, invalid, expired or inconsistent
- The operator appears on the BANZA Revocation List (BRL)

While material fails closed, Open Trust Evaluation does not treat the operator as
conformant. Restoring trust means re-publishing current, consistent, verifiable
evidence — not re-application to a central authority.

---

## Public Protocol Registry

The public protocol registry (`/operators`) indexes operators that have published
verifiable conformance evidence — **empty in pre-production** (`/operators = []`,
`production_certificates = false`), and that emptiness is the honest state. Once
operators publish, each entry will carry:
- Operator ID and name
- Conformance readiness level
- Published capabilities
- Reference to the operator's published evidence and signed protocol metadata
- Revocation status (present/absent from the BRL)
- Sandbox endpoint (if available)

---

## Conformance Level Labels

Each readiness level has a self-descriptive label. Labels describe the conformance a
level covers; they are not badges issued, granted or revoked by any authority — an
operator's label is only meaningful when backed by published, verifiable evidence:

| Label | Level | Name | Federation eligible |
|-------|-------|-------|---------------------|
| L0 | 0 | BANZA Protocol Sandbox | No |
| L1 | 1 | BANZA Core Payment Capability | No |
| L2 | 2 | BANZA Payment Initiation Capability | No |
| L3 | 3 | BANZA Inter-Operator Interoperability | **Yes** |
| L4 | 4 | BANZA External Interoperability | **Yes** |

---

## FAQ

**Can an operator demonstrate Level 2 conformance without passing Level 1?**

No. Each level is cumulative. Level 2 requires all Level 1 tests to pass, plus the additional Level 2 tests.

**Can an operator hold conformance evidence at multiple levels simultaneously?**

No. Conformance evidence is for a single level. Level 3 includes all Level 1 and 2 requirements.

**What happens if a conformance test fails?**

The operator does not meet conformance for that level. Fix the failure, re-run the suite, and re-publish your evidence. There is no application to reject — evaluation is over self-published evidence.

**Can AI replace the conformance suite?**

No. BanzAI can explain test failures and suggest fixes, but only the conformance suite determines conformance. AI inference is not a substitute. This is the deterministic-first principle — see the BanzAI reference (§7).

**Who accepts, approves or certifies an operator?**

No one. There is no BANZA CA and no approval step. Humans maintain and evolve the protocol; they do not authorise, accept, approve or certify operators. Trust is assessed by Open Trust Evaluation over self-published evidence, and missing, invalid, expired or revoked material fails closed.

---

**Referências:**

- [docs/guides/conformance.md](../guides/conformance.md) — Conformance suite specification
- [contracts/invariants.json](../../contracts/invariants.json) — Invariant registry (authoritative) · [docs/reference/en/complete.md §9](../reference/en/complete.md) — Financial invariants (prose)
- [docs/reference/en/complete.md §4](../reference/en/complete.md) — Certification model overview
- BanzAI capabilities documentation — BanzAI Certification Copilot
- [`contracts/invariants.json`](../../contracts/invariants.json) — Invariant registry
