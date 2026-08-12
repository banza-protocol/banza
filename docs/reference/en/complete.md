# BANZA — Protocol Reference

**Version:** 1.0  
**Date:** 2026-06-07  
**Status:** Official v1.0 protocol reference · pre-production  
**Authority:** ADR-002, ADR-038, ADR-039, ADR-040, ADR-021

> **Public v1.0 status:** This reference defines the BANZA v1.0 protocol in pre-production. The Public Protocol Registry returns an empty list. The Key Manifest and the BRL (BANZA Revocation List) have specified canonical locations, but production publication depends on milestone M2. Production federation depends on milestone M3. Technical conformance does not replace applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Operational status is defined in the [Roadmap](#11-roadmap).

> **How trust is established:** By signed protocol metadata, conformance evidence, a verifiable public index, a Trust Root, delegated signing keys, and revocation with fail-closed behaviour. No human entity decides who participates: the evaluation is deterministic and executable by any party. See [Conformance and Evidence](#4-conformance-and-evidence) and [Trust](#6-trust).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Why BANZA Exists](#2-why-banza-exists)
3. [Core Principles](#3-core-principles)
4. [Conformance and Evidence](#4-conformance-and-evidence)
5. [Federation](#5-federation)
6. [Trust](#6-trust)
7. [BanzAI](#7-banzai)
8. [Operators](#8-operators)
9. [Developer Resources](#9-developer-resources)
10. [Governance](#10-governance)
11. [Roadmap](#11-roadmap)
12. [FAQ](#12-faq)

---

## 1. Introduction

**BANZA is the Open Financial Protocol for Angola** — the rules, contracts, and conformance framework that any operator can implement to process payments, and that any operator can use to exchange payments with any other operator.

BANZA is an open financial protocol. Operator participation is demonstrated by verifiable protocol conformance, not by central human approval.

BANZA is not a bank. Not a product. Not an API. It is the protocol layer beneath all of those: the set of open rules that make interoperability possible without bilateral agreements.

### The Four Protocol Properties

| Property | What the protocol guarantees |
|----------|------------------------------|
| **Public rules** | The specification — RFCs, ADRs, conformance test set — is publicly available. No documentation is behind an NDA. |
| **Open participation** | Any entity may implement the protocol, publish signed protocol metadata and produce verifiable conformance evidence. The criteria are public, deterministic and auditable, and no entity reviews, admits or accepts an operator. Technical conformance does not replace applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations. |
| **Verifiable invariants** | Financial properties are defined by the protocol and verifiable by any independent auditor. Instant settlement is a conformance requirement every conformant operator must meet — a core invariant, not a contractual promise. |
| **Federation** | Conformant operators can route payments between each other without bilateral agreements, because both implement the same open protocol and both pass the same Open Trust Evaluation. |

### Ecosystem Hierarchy

```
BANZA    = Open Financial Protocol        ← THIS DOCUMENT
BanzAI   = Native Protocol Agent
Operators = independent entities that implement the protocol
```

The dependency runs in one direction only: operators depend on BANZA; BANZA never depends on any operator.

### Scope of This Document

This document defines the BANZA Open Financial Protocol — its rules, invariants, governance, conformance, and federation model. It is the English-language reference for operators, developers, and regulators; the **canonical** protocol reference is the Portuguese [docs/reference/pt/completa.md](../pt/completa.md), and the machine-readable source of truth for invariants is [contracts/invariants.json](../../../contracts/invariants.json).

For the BanzAI Native Protocol Agent: see `BANZAI_REFERENCE.md`.

---

## 2. Why BANZA Exists

### The Problem

Angola has banks, EMIS (the national interbank settlement system), ATM networks, Multicaixa, digital banking channels, and millions of mobile users. Programmatic, interoperable access to payments, however, remains dependent on integrations and institutional conditions.

Angola has the pieces. What Angola does not have is the layer that connects them.

To integrate payments, a company must establish a bilateral agreement with a bank. The process takes months. Documentation is private. Terms are negotiated case by case. Access is discretionary — there is no set of public rules that any entity can read and implement.

To operate payments in production, a fintech remains subject to legal, regulatory, banking and integration requirements that the protocol does not replace. And for wallets on different operators to communicate, no common mechanism exists today — each network is closed.

The symptoms are visible:

- **WhatsApp receipts.** Screenshots of bank transfers as proof of payment — because no protocol-guaranteed alternative exists.
- **Closed integrations.** A company integrates with one bank's system. That integration does not work with any other bank.
- **Small business exclusion.** A POS terminal requires an acquiring contract, hardware, and monthly fees.
- **Proprietary network dependency.** Each platform runs on its own rules. An operator can change fees, disable features, or shut down without warning.

The root cause: Angola has settlement rails — EMIS moves money between banks. EMIS does not resolve who can access the payment system, under what conditions, and according to what verifiable rules.

This layer has a name: **the protocol layer**. That is the gap BANZA fills. Not as a bank. Not as a fintech product. As a protocol.

### Two Models

**The closed model: M-Pesa**

M-Pesa belongs to Safaricom. The rules are the operator's rules. When Safaricom changes prices, all users are subject. When it exits a country, the service exits. A startup building on M-Pesa must accept whatever terms the operator decides.

M-Pesa is a remarkable product. But it is a product — not a protocol. The network belongs to the operator.

**The open model: Pix and UPI**

The Central Bank of Brazil launched Pix as public instant-payment infrastructure. Nubank implements Pix. Itaú implements Pix. Google Pay implements Pix. Hundreds of entities implement Pix — each with its own product, experience, and business model — but all under the same common rules. None of them owns Pix.

Pix became the most-used payment method in Brazil by frequency, according to recent official data.

NPCI launched UPI in India in 2016 as an interoperable layer for digital payments under regulatory supervision. Within a few years, UPI was processing a very high volume of transactions across many participants under common rules.

BANZA draws on this principle of common infrastructure but defines an open, operator-neutral protocol. Pix and UPI are **strategic references**, not technical equivalents of BANZA: BANZA is not Pix, not UPI, not a central-bank rail, and not yet a live national payment system — it is a protocol specification and a conformance framework. Participation in Pix and UPI is subject to regulatory authorization; BANZA conformance is a deterministic technical criterion demonstrated by verifiable evidence.

| | M-Pesa | Pix / UPI | BANZA |
|---|---|---|---|
| **Who defines the rules** | The operator | Governance entity | Open protocol (RFCs + ADRs) |
| **Who can participate** | Entities with operator agreement | Authorized participants under regulation | Any entity that implements the protocol and publishes verifiable conformance evidence — production trust depends on M2/M3 |
| **Can a third party become an independent operator?** | No | Yes | Yes |

### The Disappearing Operator Test

This is the definitive test.

In the closed model: if the primary operator disappears, the system disappears.

In the open model: if one operator disappears, the others continue. Pix does not belong to Nubank. If Nubank disappeared tomorrow, Pix would continue.

**BANZA follows the open model.**

The BANZA protocol rules are public. Illustrative examples may demonstrate protocol capabilities, but this repository does not contain a reference operator. Operator implementations are external to the protocol repository, do not own the protocol, and publish their own conformance evidence — nobody submits it to anyone, and nobody reviews it. If every future operator disappeared, the protocol rules, specification, and conformance test set would continue to exist. The infrastructure would remain.

This is not an accidental property. It is a deliberate architectural decision.

---

## 3. Core Principles

### Financial correctness is non-negotiable

Every engineering decision is evaluated against: "Does this preserve financial correctness?" Operational simplicity and auditability take precedence over convenience. A payment that cannot be fully audited by an independent party is not a valid payment under BANZA.

### The protocol is the product

Operators prove the protocol works. They are not the protocol. Operator implementations demonstrate protocol capabilities, but no operator owns the protocol any more than Nubank owns Pix. The protocol is what scales. Operators are what demonstrate it.

### The protocol defines invariants. Operators implement policy.

The BANZA protocol defines financial invariants. Operators apply their own business policies within the constraints the protocol imposes. These two layers never collapse. An operator cannot override a protocol invariant; the protocol never encodes an operator's business logic.

**In practice:** an operator may set its own fees — but the `gross = net + fee`
identity is enforced by the protocol, not by the operator. An operator may run its
own **KYC / KYB and AML** rules — but ledger-entry immutability is enforced by the
core, not by operator policy. Identity verification, sanctions/PEP screening, and
data-protection compliance are operator responsibilities; BANZA neither prescribes
a vendor nor carries raw identity data over its contracts (see *Privacy and
personal data* in `docs/security/README.md`).

### Traceability by default

Every financial event carries a `trace_id`. Every causal chain is reconstructible. No money moves without a ledger entry. No ledger entry is ever modified. Any auditor — independent of any operator — can reconstruct any payment from its `trace_id` alone.

### Open access

Technical conformance criteria are public, deterministic and auditable — not gated by institutional access, bilateral agreements or minimum transaction volumes. Any entity may implement the protocol, run the public tests and publish the resulting evidence. There is no admission function in the protocol: no queue, no reviewer, no gate. Technical conformance does not replace applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations — authorisation to carry out financial activity comes from the competent regulator, never from BANZA.

### Public evidence before trust

Trust is never asserted; it is demonstrated. An operator publishes its manifest, its signed protocol metadata and its conformance evidence, and every peer re-derives the verdict itself from those artifacts. Nothing in the path depends on a claim, a relationship, or anyone's opinion.

### Technical evidence is not legal authorisation

Conformance evidence proves what an implementation does. It does not authorise financial activity, and no BANZA artifact ever does. An operator can obtain a full PASS on the test set and still be unable to operate legally: the two planes are independent, and the protocol only ever covers the technical one.

### Protocol independence

The protocol exists independently of any operator. No single operator can shut it down, modify its rules, or restrict access to it. The specification, the conformance test set, and the conformance framework remain available to all operators regardless of what any individual operator does.

### Revocability and fail-closed

Interoperability is controlled by cryptographic verification — never open by default, never granted by human decision. The BRL is public and signed; the Open Trust Evaluation applies ten deterministic checks before any routing and fails closed on trust material that is missing, invalid, expired, revoked or incompatible. L3+ conformance evidence has short freshness (≤ 90 days), which forces active republication.

---

## 4. Conformance and Evidence

### What BANZA Conformance Is

BANZA is an open financial protocol. Operator participation is demonstrated by verifiable protocol conformance, not by central human approval.

Conformance is the mechanism by which an entity demonstrates that its implementation of the BANZA protocol is correct, complete and verifiable. There is no admission process, no entity that decides who gets in, and no artifact that anyone issues in an operator's favour: there is deterministic evidence, produced by public tests, which the operator publishes and any party reproduces.

An operator implements the protocol, publishes its manifest, exposes compatible endpoints, produces conformance evidence and signs its protocol metadata. Peers evaluate that material with the [Open Trust Evaluation](#open-trust-evaluation) and decide, deterministically and locally, whether to route. From L3 scope onward, it is this material — not an authorisation — that sustains federation without bilateral agreements. Production trust depends on the M2/M3 milestones.

### What Conformance Is Not

Before the process, the boundaries. BANZA conformance:

- **is not regulatory approval or a financial licence** — BANZA does not issue licences and no evidence authorises the provision of financial services; authorisation comes from the competent regulator;
- **does not replace** KYC/KYB, AML/CFT, risk management, operational security, banking obligations or supervision — those belong to the operator, under the competent authorities;
- **is not an admission** — no entity reviews, accepts or refuses an operator; evidence is published by the operator and evaluated by machine;
- **is not permanent** — evidence has freshness, and evidence outside policy stops sustaining federation until it is republished;
- **is not automatic entry into federation** — federation requires L3+ scope, verifiable signed metadata, fresh evidence, absence from the BRL, and production being open (M3).

**Current state:** no operator has published production metadata — `/operators = []` and `production_certificates = false` on the public routes.

### Conformance Overview

In simple terms: the operator implements BANZA, exposes a public URL with the required endpoints, and validates conformance in the **BanzAI**, which runs the checks in the browser and produces an **evidence report**. The operator publishes that report and signs its protocol metadata. From there, any peer or auditor verifies everything for itself, without asking anyone for anything.

![BANZA conformance pipeline — implementation, sandbox endpoint, banza-conformance and the report are available today; self-published signed metadata and registry indexing depend on M2/M3](/diagrams/protocol/banza-certification-pipeline-v1.svg)

### The Recommended Path for Operators

1. Implement the operator runtime against the protocol specification.
2. Expose a public sandbox endpoint.
3. Publish on that endpoint: `GET /health` and `GET /.well-known/banza/operator.json`.
4. Validate conformance in the **BanzAI** (**Conformidade** tab), against your public URL.
5. Review the evidence report and generate the **Evidence Bundle** in the BanzAI.
6. Publish the report and sign your protocol metadata at `/.well-known/banza/protocol-metadata.json`, on your own domain.
7. Keep the evidence fresh. Indexing in the Public Protocol Registry and evaluation by peers are automatic and deterministic — there is no further step, and nobody to ask.

To validate protocol compatibility, use the BanzAI. The BanzAI lets you prepare the manifest, run conformance validations, verify signed protocol metadata, evaluate revocation/fail-closed and generate an evidence bundle. The operator's implementation is validated by verifiable artifacts, not by any particular tool.

Validating in the BanzAI proves the endpoint exposes a valid L0 sandbox operator and generates an evidence report. It does **not** prove production trust or compliance with legal/regulatory obligations.

### What the Operator Must Expose

For level L0, the public sandbox endpoint must expose two read-only endpoints.

![L0 operator endpoints — /health and /.well-known/banza/operator.json with the sandbox safety properties](/diagrams/protocol/banza-operator-l0-endpoints-v1.svg)

**Endpoint 1 — health check:**

```http
GET /health
```

Expected sandbox properties: `status: "ok"`, `environment: "sandbox"`, `simulated: true`, `production_allowed: false`.

**Endpoint 2 — operator manifest:**

```http
GET /.well-known/banza/operator.json
```

Expected minimum manifest: `operator_id`, `operator_name`, `operator_url`, `protocol_version`, `certification_level`, `environment`, `simulated`, `production_allowed`, `capabilities`.

```json
{
  "operator_id": "your-sandbox-operator",
  "operator_name": "Your Operator (Sandbox)",
  "operator_url": "https://sandbox.operator.example",
  "protocol_version": "1.0",
  "certification_level": 0,
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "capabilities": {
    "supports_wallets": false,
    "supports_qr": false,
    "supports_settlement": false
  }
}
```

A sandbox endpoint that passes the L0 dry-run has demonstrated exactly that — an L0 sandbox. Production trust is a separate, M2/M3-gated matter.

### Why Conformance Exists

Open protocols require open verification. Any entity claiming to implement BANZA must be able to prove it. The conformance test set is that proof — a set of deterministic tests that produce evidence any third party can reproduce. No conformance, no federation. No exceptions.

### Conformance Levels

| Level | Name | What it evidences |
|-------|------|-------------------|
| **L0** | Protocol Sandbox | Sandbox environment operational; basic wallet and transfer operations |
| **L1** | Core Payment Capability | Consumer wallets, static QR, P2P transfers, merchant wallets |
| **L2** | Payment Initiation Capability | All L1 + dynamic QR, payment links, instant (T+0) settlement |
| **L3** | Inter-Operator Interoperability | All L2 + cross-operator routing, reconciliation, bank-rail payouts, signed protocol metadata, fresh evidence, BRL compliance |
| **L4** | External Interoperability | All L3 + external acquiring (`acquiring.external` — defined by profile; e.g. national rails such as EMIS, partner banks, or other approved providers) |

Each level is cumulative. L3 requires everything in L2, which requires everything in L1. In short: **L0** = public sandbox endpoint + manifest + safety flags; **L1/L2** = payment capabilities, which may involve state-changing POSTs; **L3** = federation and production trust, depending on signed metadata/evidence freshness/BRL/M2/M3; **L4** = profile-defined external interoperability.

> **Warning:** L1 and higher tests can perform **POST** requests (wallets, transfers, payments). Run them only against sandbox/test environments — never against production unless the operator has explicitly prepared a safe test environment.

**L3 — Inter-Operator Interoperability — full requirements:**
- Signed protocol metadata self-published at `/.well-known/banza/protocol-metadata.json` (ADR-039)
- Metadata signature verifies against the Trust Root or an active delegated key (INV-FEDEVAL-004)
- Conformance evidence freshness: 90 days maximum (INV-FEDEVAL-006)
- Operator not present in the BANZA Revocation List (BRL) (INV-FEDEVAL-002)
- `supports_federation: true` declared in operator manifest (INV-FEDEVAL-007)
- `POST /federation/route` endpoint operational
- `GET /federation/obligations` endpoint operational
- Metadata `issuer_key_id` must appear in the published BANZA Key Manifest (INV-FEDEVAL-004)
- Federation conformance test set: the deterministic FED-CERT through FED-FAIL groups

**L4 note:** The L4 conformance test set (card acquiring) is defined and will be available in Protocol v1.1. L4 is defined but not yet demonstrable in v1.0.

### The Open Access Principle

Access is defined by the protocol rules alone. Technical conformance criteria are public, deterministic and auditable. There is no bilateral agreement requirement, no minimum transaction volume, and no discretionary decision. Any entity that:
1. Implements the required capabilities
2. Passes the conformance test set for its target level
3. Publishes verifiable evidence and signs its protocol metadata

is evaluated by peers on exactly that material, on equal terms with every other operator. Nothing further is required of it by the protocol, and there is no step at which a person could decide otherwise. Operating in production remains subject to applicable legal, regulatory, banking, KYC/KYB and AML/CFT obligations, which BANZA neither assesses nor waives.

### Verification Modes

Conformance verification always produces an **evidence report** and an **achieved level** — never an authorisation and never a granted status. Three situations differ:

**A. Preparation and dry-run.** During development, the operator validates its implementation in the **BanzAI**, against its own sandbox endpoint. It produces an achieved level and an evidence report reproducible by third parties. It does **not** establish production trust and does **not** place the operator in the Public Protocol Registry — registry entries follow from self-published signed production metadata, which depends on M2/M3.

**B. Federation (L3) evidence in dry-run.** L3 federation evidence uses simulated trust material — never production keys. It is dry-run/fixture evidence: it does not establish production trust, which remains M2/M3 gated.

**C. Production trust.** Requires production trust material (M2) and production federation being open (M3). The operator self-publishes signed production metadata; peers evaluate it. Today no production metadata is published, and `/operators` returns an empty list.

> **Caution:** Running conformance verification against a domain that only serves documentation, such as the public website, must fail: an operator needs to expose an operator runtime with a manifest, `/health`, and the endpoints of its declared level.

### Run Conformance in the BanzAI

For operators, the public validation path is the **BanzAI**. To validate protocol compatibility, use the BanzAI. The BanzAI lets you prepare the manifest, run conformance validations, verify signed protocol metadata, evaluate revocation/fail-closed and generate an evidence bundle. The operator's implementation is validated by verifiable artifacts, not by any particular tool.

BanzAI flow: **open the BanzAI → Manifest → validate manifest → Conformidade → run validation → review report → generate Evidence Bundle → export/save.**

1. **Open the BanzAI.** [Open the BanzAI](/banzai).
2. **Manifest.** Load or paste the Operator Manifest and validate it structurally.
3. **Conformidade.** Run the conformance validation for the target level, against your public sandbox URL.
4. **Review the report.** Check the achieved level and the result of each check.
5. **Evidence Bundle.** Generate the Evidence Bundle and export/save the evidence report.

> The BanzAI runs the protocol's Rust/WASM engines in the browser. The result is deterministic and verifiable, but it is not a licence, certification or authorisation.

A PASS means technical conformance evidence for the requested level. A PASS does **not** mean production trust, which remains M2/M3-gated, and it does not authorise financial activity.

> **Maintainer transparency:** the protocol maintains Rust/WASM engines, contracts (`contracts/`) and conformance vectors (`conformance/`), used in maintaining and evolving the protocol. They are not a validation path required of the operator — the operator's path is the BanzAI.

### The Evidence Report

Verification produces a JSON report. The main fields are:

| Field | Meaning |
|---|---|
| `tool` | Identifier of the tool that produced the report |
| `runner_version` | Runner version |
| `operator_url` | Public URL tested |
| `requested_level` | Scope requested for the run |
| `certification_level_achieved` | Conformance scope reached by the evidence (field name inherited from the v1.0 contract) |
| `generated_at` | UTC timestamp — the basis for the freshness calculation |
| `summary` | Total / passed / failed |
| `statement` | "This report is conformance evidence, not a production certificate." |

```json
{
  "tool": "banza-conformance",
  "runner_version": "0.1.0",
  "operator_url": "https://sandbox.operator.example",
  "requested_level": 0,
  "certification_level_achieved": 0,
  "summary": { "total": 5, "passed": 5, "failed": 0 },
  "statement": "This report is conformance evidence, not a production certificate."
}
```

The operator stores the report, publishes it, and references it by hash in its signed protocol metadata. The report is reproducible by third parties from the public URL. The report does **not** prove legal or regulatory readiness.

![Conformance evidence and legal authorisation — a PASS demonstrates verifiable technical behaviour; authorisation comes from the competent regulator, outside the protocol](/diagrams/protocol/banza-evidence-vs-certificate-v1.svg)

### How to Publish Conformance

1. **Prepare your manifest.** Create a valid Protocol Capability Manifest declaring your conformance scope and capabilities. Validate it against the manifest schema in `contracts/` — structural validation is part of the deterministic conformance test set.
2. **Implement the capabilities.** Build your operator against the protocol specification. See [Developer Resources](#9-developer-resources).
3. **Run the conformance validation in the BanzAI.** In the **Conformidade** tab of the [BanzAI](/banzai), run the validation for your target level against your public URL. All tests must pass — a single failure means the scope is not demonstrated. Run only against your own operator or sandbox endpoint. Level 0 is a read-only check (manifest + `/health`); level 1 and above may POST to wallet, transfer and payment endpoints, so it should only be run against a safe test/sandbox environment. Generate the **Evidence Bundle** and save the evidence report.
4. **Publish the evidence.** Serve the report at a stable public URL on your own domain.
5. **Sign and publish your protocol metadata.** Reference the evidence by hash at `/.well-known/banza/protocol-metadata.json`, signed and anchored in the protocol trust chain (ADR-039). Nobody issues it for you.
6. **Keep it fresh.** Republish within the applicable freshness policy. From here there is nothing left to do: registry indexing and peer evaluation are automatic and deterministic.

### What Peers Verify

Evaluation is executed by machine, by each peer, on every routing. There is no human review at any point.

| The evaluation checks | The evaluation never does |
|---|---|
| Authenticity of the metadata signature | Alter conformance verification results |
| Integrity and consistency of the evidence hashes | Reinterpret test results |
| Presence of the mandatory artifacts | Add criteria not defined by the protocol |
| Anchoring of `issuer_key_id` in the Key Manifest | Refuse conformance demonstrated by the tests |
| Manifest consistency with the declared scope | Condition participation on factors outside technical conformance |
| Evidence freshness and absence from the BRL | Judge the operator's activity or legality |

**If the required tests pass and the trust material is valid, the evaluation passes — always, for any operator, at any peer.** The result is a deterministic function of the artifacts, not of a decision. Two independent peers always reach the same verdict because they evaluate the same artifacts under the same rules.

### Deterministic, Non-Discretionary Evaluation

Technical conformance is verified deterministically by the public protocol test suites, and trust material is evaluated deterministically by peers. No entity decides who may participate: there is no admission function in the protocol, and therefore no discretion to eliminate.

Refusal to route can only result from objective, auditable reasons, all verifiable from the public artifacts: incomplete or invalid evidence, a non-reproducible report, an inconsistent manifest, a signature that does not verify, an `issuer_key_id` absent from the Key Manifest, a declared scope incompatible with the request, evidence outside the freshness policy, material revoked in the BRL, or unavailability of production trust material (M2/M3).

Nobody can add private criteria, reinterpret passing results, require bilateral agreements, impose minimum volumes, favour specific operators, or replace the public tests with subjective judgment — not because it is forbidden, but because there is no point in the path where such a decision could be taken.

The protocol remains open because the rules, the tests, the contracts and the conformance criteria are public, and because the evaluation that applies them runs at each peer rather than at an authority.

### Protocol Capability Manifest

The operator manifest declares capabilities and conformance scope. It must be served at `/.well-known/banza/operator.json`.

```json
{
  "operator_id": "your-operator-id",
  "protocol_version": "1.0",
  "certification_level": 2,
  "environment": "production",
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_payment_requests": true,
    "supports_traces": true,
    "supports_settlement": true
  }
}
```

### Conformance Maintenance

- Conformance evidence goes stale after 12 months without re-verification (L0–L2)
- Protocol major version updates require new evidence
- Automated invariant spot-checks: monthly
- Conformance spot-checks: quarterly
- L3+ evidence goes stale after 90 days (must be republished)

#### Evidence Freshness

In the active model, freshness replaces the concept of administrative validity: evidence is not revoked by anyone when it ages — it simply stops satisfying the policy, and the Open Trust Evaluation fails closed from that moment (INV-FEDEVAL-006).

**For L0–L2** (annual freshness):

1. Re-run the conformance validation in the BanzAI (**Conformidade** tab) for the current scope
2. If the declared capabilities and scope have not changed, the manifest does not need updating
3. Republish the evidence and re-sign the protocol metadata with the new hash and `signed_at`

**For L3+** (90-day freshness):

1. Re-run federation conformance verification
2. Republish the updated conformance report at the public URL
3. Re-sign and republish the protocol metadata before the current evidence leaves the freshness policy

Republication does not require a new manifest if the declared capabilities and scope have not changed. A scope change (for example, from L2 to L3) requires complete new evidence for the target scope. None of these steps involves a third party: the operator publishes, peers evaluate.

### BanzAI and Conformance

BanzAI can guide you through conformance preparation: explain the criteria for each level, point to the relevant conformance vectors, and help you identify gaps. BanzAI does not evaluate trust and does not produce evidence. The conformance test set is the arbiter — deterministic tests, not AI inference. See [BanzAI](#7-banzai).

BanzAI can help interpret and review manifests, explain failures, and guide evidence preparation; it does not validate, approve or decide. Trust results from the deterministic evaluation of the artifacts by peers.

### Current Conformance State

| Item | State |
|------|-------|
| Conformance validation in the BanzAI (L0–L2) | Available |
| L3 federation validation in the BanzAI (FED-CERT to FED-FAIL) | Available (dry-run/fixture) |
| Public L0 dry-run against a sandbox endpoint | Possible today |
| Rust/WASM conformance engines (protocol maintenance) | Available |
| Production protocol metadata | None published |
| Public Protocol Registry entries | None |
| M2/M3 milestones | Not complete |
| Production trust material | Not available |

Any operator can run conformance verification today against its implementation and obtain an evidence report. Production trust awaits the M2/M3 milestones — today `/operators` returns an empty list.

---

## 5. Federation

### Why Federation Exists

Without federation, each operator is an island.

A customer with a wallet on Operator A can pay merchants on Operator A. That is all. A merchant on Operator B is out of reach — unless Operator A and Operator B negotiate a bilateral agreement, case by case, outside the protocol.

This is not a technical limitation. It is a trust limitation. Operator A has no way to know, verifiably, that Operator B's protocol metadata is authentic, current and not revoked. Without verifiable trust, there is no secure routing.

Federation solves this at the protocol level — without bilateral agreements, without intermediaries, without negotiation and without approval. Trust is established by the [Open Trust Evaluation](#open-trust-evaluation) over signed metadata and verifiable evidence. Routing follows protocol contracts. Settlement is carried out by operators according to open protocol rules — BANZA does not move or settle funds.

### Before Federation

```
Customer A               Customer B
    ↓                        ↓
Operator A               Operator B
(closed network)         (closed network)

Customer A cannot pay Merchant B.
Merchant B cannot receive from Customer A.
```

Two conformant operators. Two isolated networks. No connection between them.

### With Federation

```
Customer A                              Merchant B
    ↓                                       ↑
Operator A  ←—— BANZA protocol ——→  Operator B
    ↓                                       ↑
  (debits                            (credits
  Customer A)                       Merchant B)

The payment crosses the operator boundary.
Protocol guarantees apply across the entire chain.
```

Once operators are in production — production federation depends on milestone M3 — a payer on one operator will be able to pay a payee on any other operator that passes the Open Trust Evaluation. Each new conformant operator that joins the network makes all others more useful.

### How Federation Works

In the model defined by the protocol, federation occurs in five distinct moments (a description of the specified behaviour, not of a production network in operation):

**1. Trust**

Before any payment, Operator A runs the [Open Trust Evaluation](#open-trust-evaluation) over Operator B (ADR-040). This evaluation is cryptographic and local — it does not require a real-time call to BANZA and consults no authority.

The answer is the result of ten deterministic checks over artifacts Operator B published on its own domain: a valid manifest, a compatible protocol version, signed protocol metadata, conformance evidence present and valid, a signature verifying against the Trust Root or a delegated key, absence from the BRL, compatible capabilities, a compatible endpoint contract, evidence freshness within policy — failing closed in any other case.

In production, BANZA publishes a Revocation List (BRL — BANZA Revocation List) every six hours. The protocol requires that, before routing a payment, Operator A verify that Operator B's trust material is not revoked.

If the evaluation passes, protocol trust is established — and the operator proceeds subject to its own legal, operational, banking and regulatory controls. BANZA does not move funds, hold balances or execute settlement.

Trust is always bidirectional: Operator B also evaluates Operator A before accepting a routing request.

**2. Routing**

Operator A sends a routing request to Operator B, signed with its private key:

```
"I want to route a payment of 5,000 AOA from Customer A to Merchant B."
```

The request includes the unique transaction identifier (`trace_id`) that will be shared by all payment artifacts across both operators.

**3. Acceptance and Execution**

When Operator B accepts the request, the payment executes at that exact moment. Acceptance and execution are simultaneous — not two separate steps.

At the instant Operator B responds "accepted", it has — in the specified model — already credited Merchant B's wallet. Crediting the payee and funds availability are the receiving operator's responsibility; BANZA does not move or hold funds.

**4. Obligation**

Operator A receives the acceptance confirmation and, atomically (in a single database operation), does two things:
- Debits Customer A's wallet
- Records an obligation: "Operator A owes 5,000 AOA to Operator B"

The obligation is signed by Operator A. It is non-repudiable. Operator A cannot later deny owing Operator B.

**5. Settlement**

Obligations accumulate over a compensation cycle (typically 24 hours). At the end of the cycle, both operators independently calculate the net position:

```
Operator A owes Operator B:  150,000 AOA  (multiple payments)
Operator B owes Operator A:   40,000 AOA  (reverse-direction payments)
────────────────────────────────────────
Net position:                 110,000 AOA  (Operator A owes Operator B)
```

A single bank transfer settles all payments in the cycle. Not one transfer per payment — one per cycle. Settlement efficiency scales with volume.

The bank transfer is executed by the operators, through their competent banking and settlement channels, outside the protocol. BANZA defines the calculation rules, the obligation format and the reconciliation invariants — it does not move funds, hold positions, or guarantee any participant's solvency.

### Step-by-Step Example

**Situation:** Customer Ana has a wallet on Operator A. Merchant Bento has a wallet on Operator B. Ana wants to pay Bento 2,000 AOA.

```
1. Ana initiates the payment in Operator A's app.
   → Operator A identifies that Bento is on Operator B.

2. Operator A runs the Open Trust Evaluation over Operator B.
   → Signed metadata verifies. Evidence valid and fresh.
   → Operator B's trust material is not in the BRL. All ten checks pass.

3. Operator A sends a routing request to Operator B (signed):
   "Request rr-abc: pay 2,000 AOA to Bento (trace: tr-xyz)"

4. Operator B evaluates Operator A the same way (bidirectional trust).
   → Identifies Bento's wallet. Wallet active.
   → Credits 2,000 AOA to Bento's wallet.
   → Responds: "Accepted. Transfer ID: itx-def"

5. Operator A receives confirmation (atomic operation):
   → Debits 2,000 AOA from Ana's wallet.
   → Records obligation: "Operator A owes 2,000 AOA to Operator B (rr-abc)"

6. Bento receives payment notification. Balance up 2,000 AOA.
   Ana receives confirmation. Balance down 2,000 AOA.

7. At end of 24-hour cycle:
   → Both operators independently calculate bilateral net position.
   → Operator A executes a single bank transfer to Operator B.
   → All cycle obligations marked as settled.
```

Throughout the entire chain, the same `trace_id` (tr-xyz) appears on every artifact: the routing request, the response, the obligation, the ledger entries on both operators, and all emitted events. Any auditor can reconstruct the complete cross-operator payment from the `trace_id` — on both operators — without the cooperation of either.

### Obligations

An obligation is the formal record that one operator owes money to another.

When Operator B accepts a routing payment, it assumes a risk: it has credited the merchant but has not yet received the funds. Operator A's obligation — cryptographically signed — is the commitment that the payment will be settled.

Obligations have a lifecycle:

```
pending → in-compensation → settled
```

An obligation cannot transition from "settled" to "pending". Immutability is a protocol property, not a database property of any individual operator.

The fundamental invariant: the amount in the obligation always equals the amount in the routing request. No fees, no discounts, no rounding are applied within the inter-operator transfer amount. Fees are separate ledger entries.

### Compensation (Netting)

Compensation is the process by which operators calculate and settle net positions at the end of each cycle.

Without netting, every payment would require an immediate bank transfer. With bilateral netting, hundreds of opposing payments collapse into a single transfer.

```
Example 24-hour cycle between Operator A and Operator B:

  Operator A → Operator B:  842 payments  →  4,210,000 AOA gross
  Operator B → Operator A:  318 payments  →  1,590,000 AOA gross
  ──────────────────────────────────────────────────────────────
  Net position:                            →  2,620,000 AOA
  Bank transfers by operators:             →  1 (not 1,160)
```

Netting is always bilateral and independent: each operator calculates the net position autonomously. Both must arrive at the same result before any transfer executes. If they diverge, settlement is suspended until the discrepancy is identified and resolved.

### Why Federation Matters

**For merchants:** A merchant on any one operator can receive payments from customers on any other operator. No multiple networks, no multiple agreements. One wallet, full network reach.

**For customers:** A customer can pay any merchant on any conformant operator using only their own operator's app. The fragmentation where App A only works with merchants using App A is gone.

**For operators:** Each new conformant operator that joins the network makes all others more valuable. An operator with 100,000 customers that joins a network with a 500,000-customer partner does not add 600,000 to the network — it multiplies the payment capability of everyone. This is Metcalfe's law: network value grows with the square of its participants.

**For regulators:** Federation is auditable by design. The `trace_id` of any cross-operator payment exists on both operators, on all artifacts: routing request, obligation, ledger entries, events. A regulator can reconstruct any federated payment in full — on both operators — without the cooperation of either operator.

**For investors and banks:** The federation model specifies how independently operated implementations may interoperate under one open protocol, instead of remaining isolated networks — if production federation is opened through the applicable governance process. BANZA itself does not move funds, hold balances or execute settlement. The value of such a network belongs to the protocol — not to any single operator. Each operator that joins increases the value of all others. This growth model is structurally different from the proprietary model where value is captured by the dominant operator.

### Federation Status

The federation specification is complete and verified; production federation depends on published production trust material (milestone M3).

| Item | Status |
|------|--------|
| Architecture specification (ADR-038 + ADR-040) | COMPLETE |
| Federation contracts (5 schemas) | COMPLETE |
| Federation invariants (INV-OTE-*, INV-FEDEVAL-*, INV-ROOT-*, INV-FED-*) | COMPLETE |
| Conformance test set (FED-CERT through FED-FAIL groups) | COMPLETE |
| Two-operator interoperability verification (14/14 scenarios) | COMPLETE |
| M1 Protocol Complete | ACHIEVED — 2026-06-01 |
| First production operator federated (M3) | Pending M2 |

Federation is ready. The remaining work is operational: completing the root key ceremony (M2), and opening production federation over self-published production metadata (M3).

---

## 6. Trust

### Why Trust Infrastructure Exists

Operators in the federation verify each other's signed protocol metadata. This verification must be:
- **Cryptographic** — not based on a phone call or email
- **Offline** — not requiring a real-time call to BANZA on every payment
- **Unforgeable** — signed metadata must be impossible to fabricate without the corresponding private key

This requires a trust hierarchy with a root of trust that every operator pins once and uses to verify all subsequent trust material.

The Trust Root signs only the Key Manifest that endorses the delegated signing keys; protocol metadata, releases and revocations are signed by delegated keys, never by the root directly. It does not authorise operators, does not issue a licence, and does not authorise payments.

### The Trust Hierarchy

```
BANZA Trust Root (offline, ed25519, 24-month validity)
    │
    │  signs Key Manifests only
    ▼
Key Manifest (published at banza.network/.well-known/banza/key-manifest.json)
    │
    │  lists the active delegated signing keys
    │
    ├── Metadata-Signing Key (banza-meta-YYYYMM)     → anchors signed protocol metadata
    ├── BRL-Issuing Key      (banza-brl-YYYYMM)      → signs BANZA Revocation Lists
    └── Evidence-Issuing Key (banza-evidence-YYYYMM) → anchors conformance evidence
```

**The Trust Root signs only Key Manifests** — it never directly signs operator metadata, BRLs, or evidence, and it never authorises an operator. This limits the blast radius if a delegated key is ever compromised: the root (in offline custody) stays intact and can issue a new Key Manifest with renewed delegated keys.

No delegated key may exercise authority beyond the scope explicitly delegated by the active Trust Root (INV-ROOT-008); governance oversees that scope without exercising it.

**Trust Root custody (M2 bootstrap):** the approved custody model for the M2 bootstrap is **2-HSM / 2+ independent keyholders** (2-of-2 dual control): no single keyholder can reconstruct the key, delegate signing outside the process, or replace the protocol's maximum authority. The institutional **3-of-5 Shamir across five seats** model is a **future** target (post-institutionalization) — not in effect, and none of the five seats is constituted today. No production root key, Key Manifest, or BRL exists yet; production trust begins only after a successful ceremony (M2). See [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

### The Key Manifest

The Key Manifest is a signed JSON document listing all active BANZA delegated signing keys. Its specified canonical location is:

```
https://banza.network/.well-known/banza/key-manifest.json
```

It is signed by the Trust Root. Any operator can verify its authenticity using the root public key. The normative source is the signed Key Manifest itself, not the SDKs: an implementation may pin (cache) the key for offline use, but the Manifest is the source of truth.

The Key Manifest contains:
- `root_key_id` — identity of the Trust Root that signed this manifest
- `root_public_key` — root public key (ed25519, base64url)
- `expires_at` — manifest expiry (24 months from issuance)
- `manifest_signature` — ed25519 signature over the canonical JSON
- `keys` — array of active delegated keys, each with `key_id`, `domain` (metadata / revocation / conformance-evidence), `public_key`, `active_since`, `expires_at`, `status`

#### Trust anchor distribution

The federation trust anchor is the BANZA root public key. Its distribution model
is **protocol-owned**, not SDK-owned (full specification: ADR-038):

- **Normative source.** The canonical distribution channel is the protocol-owned
  signed Key Manifest at `https://banza.network/.well-known/banza/key-manifest.json`.
  This is the single source of truth for the root public key and active issuing keys.
- **Signing.** The Key Manifest MUST be signed by the offline Trust Root; the root
  signs Key Manifests only. Verifiers MUST check `manifest_signature` against
  `root_public_key` and reject an expired manifest (`expires_at`).
- **Versioning.** Manifests are versioned and supersede one another; a historical
  archive (`/.well-known/banza/key-archive.json`) lets verifiers validate artifacts
  signed under earlier manifests (ADR-038).
- **Pinning (implementation-specific).** Implementations MAY pin or cache the root
  key offline — bundled in an SDK, embedded in the conformance runner, or pinned in
  an application — for availability and offline verification. Such caches are a
  **convenience, never the normative source**: a pinned key that disagrees with a
  valid current Key Manifest MUST be treated as stale.
- **Rotation.** On root rotation or compromise, BANZA publishes a new root-signed
  Key Manifest (the new anchor) and all L3+ operators re-sign and republish their
  protocol metadata against it. Clients that fetch the Key Manifest pick up the new
  anchor automatically; clients pinning an old key MUST update before they can verify again.

> **Status (not a claim of availability).** The production Trust Root and its Key
> Manifest are published only after the production root ceremony (M2, see
> *Federation Status* above), which is not yet complete. Until then, only
> sandbox/test manifests exist; the production endpoint above is the **specified**
> canonical location, not an assertion that a production manifest is currently served.

### Signed Protocol Metadata

Each operator publishes and signs its own protocol metadata — nobody issues it on its behalf (ADR-039). The metadata is served on the operator's own domain at:

```
/.well-known/banza/protocol-metadata.json
```

Protocol metadata must contain:
- `operator_id` — must match the `operator_id` in the operator manifest
- `protocol_version` — the protocol version implemented, for compatibility evaluation
- `conformance_scope` — the demonstrated conformance scope (0–4)
- `evidence` — reference and hash of the evidence report, with `generated_at` for freshness evaluation
- `issuer_key_id` — the delegated evidence key anchoring the evidence in the BANZA chain
- `signed_at` — signing moment, the basis for the freshness calculation
- `signature` — cryptographic signature over the canonical JSON

Any peer operator can verify this metadata without contacting BANZA:
1. Fetch the metadata from the target operator's `/.well-known/banza/protocol-metadata.json`
2. Fetch the Key Manifest from `banza.network/.well-known/banza/key-manifest.json`
3. Verify that `issuer_key_id` appears in the Key Manifest and is active
4. Verify the metadata signature with the delegated key's public key
5. Verify the referenced evidence is valid and within the freshness policy
6. Verify the operator is not in the current BRL

Verification is deterministic: two independent peers, given the same artifacts, always reach the same result. No step consults an opinion.

### The BRL — BANZA Revocation List

The BRL is a signed list of the trust material that is no longer acceptable on the network. The Revocation List is a protocol security and trust mechanism. It is not a licence, a regulatory sanction, or a financial authorisation. Its specified canonical location is:

```
https://banza.network/federation/revocation-list.json
```

> This is the protocol-defined location, not a claim that the production BRL is already live. The production BRL is published after the Trust Root ceremony milestone (M2).

Updated every 6 hours. Signed by the BRL delegated key.

Before routing any federated payment, the sending operator must verify that the receiving operator is not in the current BRL. An operator on the BRL cannot receive routed payments from any other operator, regardless of the validity of the rest of its metadata.

An operator's entry in the BRL is a protocol security signal — compromised trust material, an improperly rotated key, inconsistent evidence, or behaviour incompatible with the invariants. It is not a pronouncement on the legality of the operator's activity, does not affect its authorisations, and is not communicable to third parties as a regulatory decision. Regulatory sanctions, where they exist, come from the competent authorities and follow their own processes, entirely outside the protocol.

### Root Key Invariants (in plain language)

| Invariant | What it means |
|-----------|---------------|
| INV-ROOT-001 | Production key IDs must not start with `test-`. Test keys are rejected in production. |
| INV-ROOT-002 | The Key Manifest must be root-signed. An unsigned manifest is invalid. |
| INV-ROOT-003 | An expired Key Manifest is invalid. Implementations must detect and reject stale manifests. |
| INV-ROOT-004 | The Trust Root signs only Key Manifests. It never signs operator metadata or BRLs directly, and never authorises an operator. |
| INV-ROOT-005 | The BRL must be signed by the designated BRL delegated key. |
| INV-ROOT-006 | Delegated keys have a maximum validity of 184 days. The Trust Root has a maximum validity of 24 months. |

### The Root Key Ceremony

The Trust Root is generated in an **offline ceremony** on an air-gapped machine with no network connectivity, in the presence of a Ceremony Officer and an independent Witness. The private key never touches a networked machine. It is held under **2-of-2 dual control** — the approved model for the M2 milestone: 2 HSMs / 2 independent keyholders, with two independent custody artifacts and a sealed, dated, tamper-evident paper recovery copy under governance control. No single keyholder or isolated secret reconstructs the key: activation requires both keyholders.

This procedure ensures that no single person and no networked system ever has access to the root private key alone.

The ceremony automation enforces all six INV-ROOT-* invariants and every deterministic cryptographic step. It was verified with a dry run: 10/10 verifications pass.

**Production status:** The Trust Root ceremony is scheduled. M2 Production Trust (Key Manifest + BRL live at `banza.network`) is the active milestone. See [Roadmap](#11-roadmap).

### Revocation Process

The Revocation List is a protocol security and trust mechanism. It is not a licence, a regulatory sanction, or a financial authorisation. Revocation takes no legal right away from an operator, does not affect its authorisations, and constitutes no judgment on its activity — it removes only the cryptographic acceptability of its trust material on the federated network, until that material is corrected and republished.

| Trigger | Effect | Reversible? |
|---|---|---|
| Compromised or improperly rotated trust material | Material listed in the BRL; evaluation fails closed | Yes — on rotation and republication |
| Loss of freshness (automatic) | Evidence outside the freshness policy; evaluation fails closed and federation is blocked | Yes — on republication of evidence |

The Public Protocol Registry reflects the new state by deterministic re-indexing. No entry is added or removed by anyone's decision.

---

## 7. BanzAI

> **Canonical chapter.** This mirrors the canonical BanzAI chapter, served in Portuguese as **[Reference §12 — BanzAI](/referencia/banzai)** (`website/content/BANZA_REFERENCIA.md`). For normative content, always consult the canonical chapter.

### BanzAI in one sentence

**BanzAI is the primary and transversal human interface and the non-authoritative cognitive engine of BANZA: it resolves context, consults public sources, invokes the deterministic engines through typed contracts and explains the evidence they produce — without deciding verdicts, certifications, admissions or authorisations.**

It is transversal to the three layers of the ecosystem — the protocol, conformance and interoperability certification, and the operational scheme — and it is **not a fourth layer**. Consulting, implementing and validating happen in one place, always over the BANZA Reference and the verifiable engines. Automated consumers do not depend on BanzAI: they reach the public interfaces directly — contracts, manifests, schemas, endpoints and machine routes — which stay verifiable independently of the human interface.

### Canonical architecture

One permanent principle organises the whole architecture: **Rust understands, routes, executes, validates and decides; the local model explains exactly once and never decides; open governance evolves the rules.** BanzAI guides the implementation of the existing protocol; it does not create new protocol.

There is **one router** and **one explanatory path**. The Rust router reads the intent of the question and chooses between exact terminals — canonical facts and definitions confirmed with no model call — and the explanatory trunk, the only path that invokes the model. All decision logic — routing, resolution, retrieval, grounding and validation — lives in deterministic Rust engines, with no network and no LLM in the core; the local model receives only the already-closed evidence and an output contract.

The canonical BanzAI runtime lives **in this repository** (`banza-protocol/banza`): a TypeScript service/glue layer responsible only for I/O and transport, over Rust engines compiled to WASM that make every decision. The single public web interface — `banza.network/banzai` (route `/banzai`) — is a pure renderer: it never decides the answer type, its value, the source or the routing.

### How a request is processed

Every question enters the Rust router, which decides between two destinations.

**Exact terminals (Rust, no model).** A canonical fact bound to its source — status, date, identifier, version, licence, origin — a canonical definition, a safety refusal, a clarification request, insufficient evidence, or a safe operational failure. They are concise, typed and source-bound; an exact fact with no canonical source fails safe to *insufficient evidence*, never a guess.

**The explanatory trunk (the only model path).** Every genuine explanation — meaning, why, how it works, implications, comparison — follows a fixed course: Rust boundary pre-check → Rust intent and entity resolution → Rust retrieval and re-ranking → **FactualPackage**, the closed evidence → **a single synthesis by the local model** (ADR-055) → **Rust validation before publishing**. Validation is dual and mandatory: the factual validator confirms the prose is anchored in the evidence, and the post-response validator rejects any text that claims normative authority, invents protocol state, or tries to expose the prompt, keys or internal reasoning. The model receives only the FactualPackage and the output contract — it never chooses sources, resolves entities, or publishes without the validators.

A mixed request escalates to the trunk — never a partial exact answer. Every response honestly declares the terminal it took and publishes its own state: **one model call per explanation and zero external calls, by construction.**

### How an implementation is validated

In validation mode, evaluating an implementation runs nine steps — **Discovery → Manifest → Keys → Conformance → Interoperability → Trust → Federation → Evidence Bundle → Certification Readiness** — started by a human and **executed by the Rust engines** (ADR-067). BanzAI initiates the journey (human-triggered) and explains each step; it does not execute it.

Official validation uses **exclusively artifacts fetched from the public endpoints of the selected implementation** (ADR-068). The target is resolved in the Technical Registry (`operator_id → implementation_id → canonical origin → discovery`) and, at each step, **the Rust engines fetch the artifacts** through a **secure fetch layer — never through the browser**; no user-supplied URL, file or content enters the official journey. Each step emits an *OperationReceipt* bound to the exact origin of the inputs (resolved host, `fetched_at`, HTTP status, hash, signature state, engine and version, result, reason codes), and the set is sealed into a *JourneyReceipt*. By construction, `qwen_calls = 0` and `external_model_calls = 0`.

**The validation journey produces verifiable technical evidence; it does not certify, admit or authorise.** The result is specific to the implementation, the profile, the version, the environment, the scope and the moment of evaluation. The operator is the responsible entity; the implementation is the technical system under evaluation. Operador Zero is the only demonstration implementation — read-only, NOT_CERTIFIED, no real money — and it runs exactly the same process applied to any future published implementation. A local draft tool, clearly separated from the official journey, checks a single piece of developer content and **never constitutes official evidence**.

### Authority and boundaries

BANZA's normative validity comes from the Reference, the specs, the contracts, accepted ADRs/RFCs and the verifiable engines — **never from AI output**. Model output is neither rule nor evidence: evidence comes from the artifacts and the engines.

By definition, BanzAI:

- is not a normative source, not a layer, and not an authority;
- does not decide verdicts — conformance and validation are computed by the engines;
- does not certify, does not admit to a scheme, does not authorise or license;
- does not approve or decide participation — participation is demonstrated, not granted;
- does not invent rules or make architectural decisions; a gap becomes an RFC/ADR proposal, never an active rule;
- does not change the trust, federation, certification or registry model;
- does not replace the Reference or the verifiable engines;
- does not move funds or process payments.

The authority matrix below distributes each action to its real owners. No single centre decides everything: the **Rust engines** decide verdicts, **open governance** decides rules (via RFC/ADR/spec/release), the **competent authorities** handle regulatory authorisation and scheme admission — outside the protocol — and the **operator** answers for moving funds within its own legal framework. BanzAI presents, orchestrates and explains; the local model only drafts a synthesis, once.

| Action | BanzAI | Local model (Qwen) | Rust engines | Open governance | External actor |
|---|---|---|---|---|---|
| Resolve intent and route the question | Presents (interface) | — | Decide (deterministic router) | — | — |
| Produce the explanatory prose | Orchestrates | Drafts a single synthesis | Ground it (FactualPackage) | — | — |
| Validate the response before publishing | — | — | Decide (factual + post-response validators) | — | — |
| Refuse a forbidden action / financial boundary | Applies at the surface | — | Decide (deterministic, no model) | Sets the policy | — |
| Run an implementation's conformance validation | Starts (human) and explains | — (0 decision calls) | Fetch (secure) and verify | Defines profiles and vectors | Publishes the endpoints (the implementation) |
| Fix a step/journey verdict | Presents | — | Decide and seal (receipts) | — | — |
| Conformance and interoperability certification (L2) | Prepares and explains | — | Decide, per implementation, against a public profile | Defines the profile and criterion | — |
| Scheme admission / regulatory authorisation | — | — | — | — (outside the protocol) | Competent authorities (outside BANZA) |
| Create or change a protocol rule | May help draft the proposal | — | — | Decides (RFC/ADR/spec/release) | Anyone proposes (open governance) |
| Move funds / process payments | Never | Never | Never | — (not its role) | The operator, within its legal framework (outside BANZA) |

### Verifiable runtime state

Runtime state is **verifiable per response**, not a fixed assertion. Each response publishes its own state — the execution path, the cited sources, the effective engine, and whether an external model was called. In validation mode, model decision calls and external calls are **zero by construction**, and the runtime is **non-authoritative** (`authoritative: false`).

This page pins neither the provider, the model, nor counters: the effective engine, the inference location and the numbers are whatever the **runtime state machine route** (`GET /banzai/runtime`, ADR-072) reports at any moment. That route is the **single source** every page consumes; the `/estado` page is the human explanation, and where they diverge, **the machine route wins**. So any claim about BanzAI's state is confirmable directly at the source — without depending on trust in this text.

### Sources, code and repositories

BanzAI's sources are of two kinds.

**Normative (binding).** The Reference, the specs, the contracts (`contracts/` — the interfaces an operator must expose), the schemas, the invariants, accepted ADRs/RFCs where they define rules, and the outputs of the verifiable engines. This is where the protocol's validity comes from.

**Governance rationale (explanatory).** An ADR records a decision and its why; the binding artifact is the contract, spec or invariant it points to. **A proposed RFC is not a rule; an ADR is not a contract.** A gap becomes a public proposal, never an active rule.

**Canonical two-repository map.** The `banza-protocol/banza` repository (this one) holds the protocol, the public website, the **canonical BanzAI runtime** (TypeScript glue + Rust engines), the machine routes, governance, conformance and the contracts — it is the source of truth. Active BanzAI development lives entirely in this repository — there is no separate BanzAI repository (ADR-075). AI output is never a source of truth.

---

## 8. Operators

### What an Operator Is

An operator is any entity that implements the BANZA protocol to process payments. Operators:
- Declare their capabilities in a Protocol Capability Manifest
- Implement the requirements for their target conformance scope
- Operate within the protocol's invariant framework
- Keep their conformance evidence fresh (12 months; 90 days at L3+)

Operators are independent. Each carries its own legal, regulatory and financial responsibility; any authorisation comes from the competent regulator, never from BANZA.

There is no such thing as a privileged operator. Every operator — including any first production operator — is evaluated against the same published technical criteria by the same deterministic machine evaluation. There is no entity that could treat one differently.

### What Operators Implement

The protocol defines capabilities by conformance scope. Each level is cumulative.

| Level | What you build |
|-------|---------------|
| L0 | Health endpoint, basic wallet operations, sandbox environment |
| L1 | Consumer wallets, merchant wallets, static QR, P2P transfers, double-entry ledger, trace propagation |
| L2 | Payment requests, dynamic QR, payment links, T+0 (instant) execution, webhooks |
| L3 | Federation routing, obligations, reconciliation, bank-rail payouts, signed protocol metadata |
| L4 | All L3 + external card acquiring (v1.1 scope) |

At L3, the operator must also serve:
- `/.well-known/banza/operator.json` — operator manifest
- `/.well-known/banza/protocol-metadata.json` — self-published signed protocol metadata
- `POST /federation/route` — accept routing requests
- `GET /federation/obligations` — expose outstanding obligations

### How to Become an Operator

Implement the protocol, publish your manifest, expose compatible endpoints, produce conformance evidence, and sign and publish your protocol metadata. See [Conformance and Evidence](#4-conformance-and-evidence) for details.

The conformance test set is open source. There is no fee to run it. There is no application, no review, and no waiting period — the last step is the operator's own publication, after which indexing and peer evaluation are automatic and deterministic.

### Public Protocol Registry

The Public Protocol Registry is an index of verifiable metadata and evidence. It is not a list of operators licensed, approved or certified by BANZA.

The Registry indexes what operators publish on their own domains. It confers no status, attests no quality and represents no judgment about any participant: it is a discovery index whose value is that it is reproducible — any party can rebuild it from the same public sources and get the same result.

**Purpose**

The Registry serves three functions:
- **Discovery:** any party finds any operator's metadata and evidence without intermediaries
- **Auditability:** the history is verifiable and not retroactively modifiable
- **Interoperability:** operators use the Registry for discovery, and always evaluate the original artifacts on the peer's domain

**Entry format**

| Field | Description |
|---|---|
| `operator_id` | Unique operator identifier |
| `name` | Name declared by the operator in its manifest |
| `level` | Demonstrated conformance scope (L0–L4) |
| `status` | Derived state: `indexed`, `stale`, `revoked` |
| `metadata_url` | URL of the signed protocol metadata, on the operator's domain |
| `evidence_hash` | Hash of the evidence report referenced by the metadata |
| `signed_at` | Signing moment of the indexed metadata |
| `evidence_generated_at` | Evidence generation moment — the basis for the freshness calculation |
| `last_indexed` | Moment of the last deterministic re-indexing |

**States**

| State | Meaning | Can federate? |
|---|---|---|
| `indexed` | Metadata verifies; evidence valid and within the freshness policy | Yes (L3+) |
| `stale` | Evidence outside the freshness policy, not republished | No |
| `revoked` | Trust material present in the BRL | No |

States are **derived**, not assigned: each is a function of the published artifacts and the BRL, recomputable by any party at any time.

#### Open Trust Evaluation

Before any federated routing, each operator evaluates its peer. The evaluation runs locally, by machine, and consists of exactly these ten checks:

1. **Valid operator manifest** — present, well-formed and conformant to the published schema
2. **Compatible protocol version** — the declared `protocol_version` is interoperable with the evaluator's
3. **Signed protocol metadata** — present, canonical and with an intact signature
4. **Conformance evidence present and valid** — retrievable, reproducible, and with a hash matching the declared one
5. **Valid Trust Root or delegated-key signature** — the `issuer_key_id` anchors in the active Key Manifest and the signature verifies
6. **Absence from the BRL** — neither the operator nor its trust material appears in the current Revocation List
7. **Compatible capabilities** — the declared capabilities cover the requested operation
8. **Compatible endpoint contract** — the endpoints required by the scope exist and respect the contract
9. **Evidence freshness within policy** — the evidence satisfies the freshness policy applicable to the scope (≤ 90 days for L3+)
10. **Fail-closed** — trust material that is missing, invalid, expired, revoked or incompatible forces refusal of the routing

The ten checks are conjunctive: any failure refuses the routing. The evaluation is deterministic — two independent peers, given the same artifacts, always produce the same verdict — and none of the checks consults an authority, a granted status, or a person's judgment. Each check applies to a public artifact that the evaluated operator itself published.

**Registry maintenance**

The Registry is a public verifiable index, generated by public indexing rules and replicable by any party. Nobody adds or removes operators by discretionary decision — there is no manual add or remove operation. An entry exists because the operator published signed metadata that verifies against the Key Manifest; it stops being `indexed` because the evidence lost freshness or because the material appears in the BRL.

Any party can run the indexing rules over the same sources and obtain the same Registry. A replica that diverges from the canonical publication is demonstrably wrong — and the canonical one holds no special authority: it merely has the convenience of sitting at a known location.

The Registry is public and queryable at `banza.network/operators` without authentication. **Current state:** the route returns an empty list (`[]`) — no operator has published production metadata. Presence in the Registry constitutes neither a financial licence nor regulatory authorisation: it indicates exclusively that verifiable metadata and evidence exist. Absence from the Registry likewise means nothing in regulatory terms: it is not a prohibition, not a rejection, and does not prevent any entity from operating under the authorisations it holds.

### Network Effects

Every conformant operator that joins the BANZA network makes every other operator more valuable. A 100,000-customer operator that joins a network with a 500,000-customer operator does not add 600,000 — it multiplies the payment capability of everyone in the network.

This is the structural difference between an open protocol network and a proprietary platform. In a proprietary platform, value accumulates with the dominant operator. In an open protocol network, value belongs to the network — and every participant benefits from every other participant's growth.

---

## 9. Developer Resources

### SDKs

**BANZA is contract-first and does not ship official SDKs from this repository.**
There is no mandated SDK, language, or runtime: any implementation that satisfies
the contracts in `contracts/` and passes the conformance test set is a valid BANZA
implementation.

SDKs, where they exist, are one of:

- **Operator or third-party SDKs** — client libraries built by operators or the
  community against the BANZA contracts. These are not protocol artifacts; the only
  statement BANZA makes about them is the deterministic result of the SDK
  conformance vectors (`conformance/sdk/`).
- **Future protocol-owned SDKs** — should BANZA later publish first-party SDKs,
  they will appear in this repository and be listed here. None are published today.

Any SDK that pins the federation trust anchor SHOULD pin it from the protocol-owned
Key Manifest (see *Trust anchor distribution*, ADR-038) — SDK bundling is a
convenience cache, never the normative source of the root key.

### Contracts

All canonical protocol contracts live in `contracts/`:

| Area | Location | Contents |
|------|----------|----------|
| OpenAPI | `contracts/openapi/` | reference-operator.yaml, transfers.yaml, wallet-onboarding.yaml, activity.yaml |
| Federation | `contracts/federation/` | federation-routing.json, federation-obligation.json, federation-event.json, federation-manifest.json, federation-trust.json, key-manifest.json, revocation-list.json |
| Events | `contracts/events/` | envelope.schema.json, types.json, webhook-types.json |
| Webhooks | `contracts/webhooks/` | envelope.schema.json, signature.json |
| QR | `contracts/qr/` | payload-format.json, lifecycle.json |
| Conformance vectors | `conformance/` | Conformance test vectors |

### External-provider neutrality

BANZA is external-provider neutral. The protocol defines how an external integration must be declared, verified and audited; it does not mandate EMIS as the only provider. An operator may integrate with EMIS, partner banks, authorized proprietary infrastructure, or other approved providers/rails, provided it satisfies the applicable legal, regulatory, banking, KYC/KYB, AML/CFT and technical-profile requirements. The BNA must be treated as a regulatory/supervisory authority, not as an operational provider equivalent to EMIS or banks. External Interoperability (L4) is defined by profile — EMIS is one possible profile/provider/rail, not the only one — and no production external integration is claimed in this reference.

### Validate Conformance in the BanzAI

For operators, conformance validation happens in the **BanzAI**. To validate protocol compatibility, use the BanzAI. The BanzAI lets you prepare the manifest, run conformance validations, verify signed protocol metadata, evaluate revocation/fail-closed and generate an evidence bundle. The operator's implementation is validated by verifiable artifacts, not by any particular tool.

**What the operator must expose:** a public sandbox endpoint with `GET /health` and `GET /.well-known/banza/operator.json` (L0, read-only) and the endpoints of the target level (L1/L2/L3). **L0 is read-only; L1 and above may perform state-changing POST requests** (wallets, transfers, payments) — run them only against safe sandbox/test environments.

**BanzAI flow.** Open the [BanzAI](/banzai) → **Manifest** (validate) → **Conformidade** (run validation for the target level) → review report → **Evidence Bundle** (generate) → export/save.

> The BanzAI runs the protocol's Rust/WASM engines in the browser. The result is deterministic and verifiable, but it is not a licence, certification or authorisation.

**The evidence report.** Main fields: `tool`, `runner_version`, `operator_url`, `requested_level`, `certification_level_achieved` (field name inherited from the v1.0 contract — it carries the conformance scope reached), `generated_at` (the basis for the freshness calculation), `summary` (total/passed/failed) and `statement` (`"This report is conformance evidence, not a production certificate."`). The report is reproducible by third parties from the public URL; it does **not** prove legal, regulatory, KYC/KYB or banking readiness.

**Maintainer transparency.** The protocol maintains Rust/WASM engines, contracts (`contracts/`) and conformance vectors (`conformance/`), used in maintaining and evolving the protocol. They are not a validation path required of the operator — the operator's path is the BanzAI.

The result is binary: the implementation satisfies the vectors or it does not. A PASS produces **technical evidence** — the operator publishes it and peers evaluate it. Production trust depends on the M2/M3 milestones; today `/operators` returns an empty list.

### Normative: Monetary Representation

> **This section is normative.** All operators, SDKs, and protocol implementations MUST conform to these rules.

**The Integer Rule**

All monetary values in the BANZA protocol MUST be represented as integers. Floating-point monetary values are prohibited across the entire protocol surface: APIs, traces and logs, operator manifests, wallet balances, ledger entries, settlement batches, SDK contracts.

```json
// PROHIBITED
{ "amount": 10.50 }

// VALID
{ "amount_minor": 1050 }
```

**The `*_minor` convention**

| Field | Meaning |
|-------|---------|
| `amount_minor` | Generic payment amount |
| `gross_minor` | Gross amount paid by consumer |
| `fee_minor` | Fee retained by operator |
| `net_minor` | Net amount delivered to recipient |
| `available_minor` | Immediately available balance |
| `reserved_minor` | Temporarily held balance |
| `balance_minor` | Total wallet balance |

**Settlement amount invariant (INV-STL-001):**
```
gross_minor = net_minor + fee_minor
```

**Wallet balance invariant (INV-WALLET-001):**
```
balance_minor = available_minor + reserved_minor
```

Wallet balances are always derived from ledger entries — never directly mutated. A wallet balance can never be negative.

**Conformance rule MON-001:**

| Violation | Result |
|-----------|--------|
| Float values in API requests/responses | Conformance FAIL |
| Float values in traces or logs | Conformance FAIL |
| `gross_minor ≠ net_minor + fee_minor` | Conformance FAIL |
| `balance_minor ≠ available_minor + reserved_minor` | Conformance FAIL |

**Currency registry:**

| Currency | ISO 4217 | Minor units | Status |
|----------|----------|-------------|--------|
| Angolan Kwanza | AOA | 100 (1 AOA = 100 minor units) | Official BANZA currency |
| US Dollar | USD | 100 | Supported (test traces) |
| Euro | EUR | 100 | Supported (test traces) |

Any change to the precision policy requires an approved RFC.

### Financial Invariants

Financial invariants are non-negotiable assertions that can never be violated. They are enforced simultaneously at multiple layers.

#### Invariant Families

| Family | Scope |
|--------|-------|
| `INV-LEDGER-*` | Double-entry, immutability, no floating-point, atomicity |
| `INV-WALLET-*` | Consistent balance, no negatives |
| `INV-STL-*` | gross = net + fee, no money creation |
| `INV-IDEM-*` | Idempotency key scope, replay safety |
| `INV-TRACE-*` | Traceability completeness |
| `INV-QR-*` | QR lifecycle, uniqueness of resolution |
| `INV-IDENT-*` | Handle uniqueness |
| `INV-OTE-*` / `INV-FEDEVAL-*` | Open Trust Evaluation and federation-routing trust: signed-metadata validity, evidence freshness, revocation-list compliance, capability/version compatibility |
| `INV-FED-*` | Federation routing, settlement, reconciliation |
| `INV-ROOT-*` | Trust Root architecture, key manifest, production key validation |

#### Critical Invariants

| Invariant | Description | Severity |
|-----------|-------------|----------|
| INV-LEDGER-001 | Debits = Credits on every posting | CRITICAL |
| INV-LEDGER-002 | Ledger entries are immutable | CRITICAL |
| INV-LEDGER-003 | Amounts are i64 — never float | CRITICAL |
| INV-LEDGER-004 | Partial postings never persist (atomic) | CRITICAL |
| INV-STL-001 | gross = net + fee (no money creation) | CRITICAL |
| INV-STL-002 | No negative balances | CRITICAL |
| INV-WALLET-001 | balance = available + reserved | CRITICAL |
| INV-IDENT-001 | @handle uniqueness is global | CRITICAL |
| INV-FEDEVAL-004 | Operator protocol metadata must be signed, and the signature must verify to the Trust Root through an in-scope, unexpired, unrevoked delegated key resolved from the published Key Manifest (`issuer_key_id`) | CRITICAL |
| INV-FEDEVAL-006 | Conformance evidence freshness ≤ 90 days (L3+); trust material outside its freshness window is rejected with no grace period | CRITICAL |
| INV-FEDEVAL-002 | Missing, invalid, expired, revoked or incompatible trust material fails closed and is rejected from routing — including any operator present in the BRL | CRITICAL |
| INV-FEDEVAL-007 | An L3+ operator must declare `supports_federation: true`, backed by published, valid, fresh, non-revoked L3+ conformance evidence | CRITICAL |
| INV-FEDEVAL-005 | The BRL (Revocation List) must be BANZA-signed and within its freshness window — an unsigned, unverifiable or stale list is treated as absent (fail-closed) | CRITICAL |
| INV-ROOT-001 | Production key IDs must not start with `test-` | CRITICAL |
| INV-ROOT-002 | Key Manifest must be root-signed | CRITICAL |
| INV-ROOT-007 | No single entity solely controls the protocol's maximum authority | CRITICAL |
| INV-ROOT-008 | No delegated key may exercise authority beyond the scope explicitly delegated by the active Trust Root | CRITICAL |
| INV-ROOT-009 | The loss or replacement of an institutional seat occupant cannot compromise the continuity of the protocol's maximum authority | CRITICAL |
| MON-001 | All monetary values as integer minor units | CRITICAL |

#### The Double-Entry Ledger

The ledger is:
- **Append-only** — entries are never modified or deleted
- **Balanced** — every posting has equal debits and credits
- **Integer-only** — amounts are stored as `i64` minor units, never floating-point
- **Atomic** — partial postings never persist

Canonical QR payment posting:
```
Consumer wallet (DEBIT)
    ├── Merchant wallet (CREDIT) — net amount
    └── Fee wallet    (CREDIT) — fee

gross_minor = net_minor + fee_minor  [INV-STL-001]
```

### Implementation Guidance

The BANZA protocol is technology-neutral. Operators choose their own implementation stack. The protocol defines *what* must be true (invariants, contracts, conformance criteria) — not *how* it must be implemented.

Common implementation considerations:

| Concern | Protocol requirement | Implementation choice (operator's) |
|---------|---------------------|-------------------------------------|
| Monetary precision | Integer arithmetic, no floating-point | Any language with 64-bit integers |
| Ledger atomicity | Atomic postings, append-only | Any ACID-compliant database |
| Idempotency | Same key → same result | Any persistent store with unique constraints |
| Settlement | Protocol-defined rules | Operator's choice of infrastructure |

---

## 10. Governance

### How BANZA Evolves

BANZA uses two complementary governance mechanisms:

**RFCs (Requests for Comments)** govern protocol decisions: financial invariants, payment flows, API contracts, operator requirements, federation protocols. An RFC is required before any implementation that changes the protocol. RFCs are proposed, discussed, accepted, and then immutable.

An RFC is required for:
- Changes to financial invariants
- Changes to payment flow protocols
- New conformance levels
- New currencies in the official registry
- Federation protocol design

**ADRs (Architecture Decision Records)** record decisions after they are made: technology choices, service boundaries, SDK architecture, naming. ADRs are numbered sequentially and immutable after acceptance. ADR-002 defines the canonical BANZA/BanzAI/Operators hierarchy. ADR-038 defines the open protocol trust model, including the offline Trust Root and its delegated-key hierarchy. ADR-039 defines operator self-publication and machine-verifiable conformance. ADR-040 defines federation trust evaluation.

BANZA governance maintains the protocol; it does not control who may or may not implement the protocol.

### No Single Operator Governs BANZA

Operator independence is an architectural invariant:
- BANZA is not owned by any operator
- BANZA is not governed by any operator
- No operator implementation controls the conformance framework
- Any operator can contribute to the protocol via the ADR/RFC process, on equal footing with any other operator

The dependency graph is permanent:

```
     Operators   (any conformant operator)
         ↑
       BanzAI    (Native Protocol Agent)
         ↑
       BANZA     (the protocol itself)
```

BANZA and BanzAI never depend on operators. Operators depend on both.

### Protocol Development Status

Protocol design is frozen at M1 (achieved 2026-06-01). No new ADRs are required before production. No new contracts are required. Any operator can implement BANZA correctly today using only this document and the public specification.

Active work is now operational (M2–M6), not specification. See [Roadmap](#11-roadmap).

---

## 11. Roadmap

### Completed

| Milestone | Achieved | Evidence |
|-----------|:--------:|---------|
| M1 — Protocol Complete | **2026-06-01** | federation and interoperability conformance test set verified; the trust and federation model was later redesigned in M2.3 (ADR-038/ADR-039/ADR-040) |
| M5 (partial) — Validation Studio | **2026-06-01** | Three-matrix validation architecture established |

### Active

| Milestone | Status | Blocking |
|-----------|--------|---------|
| **M2 — Production Trust** | ACTIVE | Root key ceremony scheduled; Key Manifest + BRL endpoints pending. OPS-001 is the first unblocked action. |

### Planned

| Milestone | Blocked by | Description |
|-----------|-----------|-------------|
| M3 — Production Federation Open | M2 | Production trust material live; first operator self-publishing signed production metadata and passing the Open Trust Evaluation |
| M4 — BanzAI Operational | Nothing (parallel) | Qdrant + vLLM production deployment; knowledge indexed |
| M5 — Validation Studio Complete | GOV-001/002/003 | RFC status updates, roadmap accuracy, closure declaration |
| M6 — BANZA v1.0 Public Launch | M2 + M3 + M5 | Public announcement; external operators can publish L1–L3 conformance evidence |

### Future Versions

| Version | Scope |
|---------|-------|
| **v1.1** | L4 conformance test set (card acquiring), Key Manifest Contract, root multi-signature, DNS discovery mode (RFC-0005), Protocol Version Negotiation |
| **v1.2** | RFC-0006 Offline Payment Support, multi-operator registry |
| **v2.0** | Cross-border settlement (AOA ↔ other African currencies), advanced fee models |

---

## 12. FAQ

**Is BANZA a bank?**

No. BANZA is a protocol — a set of open rules. It does not hold funds, does not have a banking license, and does not process payments. Operators implement the protocol and process payments on their customers' behalf.

---

**If BANZA is open, who decides which operators may participate?**

Nobody. There is no admission function in the protocol. BANZA is an open financial protocol. Operator participation is demonstrated by verifiable protocol conformance, not by central human approval. An operator implements the protocol, publishes signed metadata and conformance evidence, and each peer runs the [Open Trust Evaluation](#open-trust-evaluation) locally and deterministically. The BANZA chain anchors **protocol artifacts**, never **participant statuses** — nothing in it says an operator is acceptable; it only makes the operator's own published material impossible to forge.

---

**How does an operator decide whether to route to another?**

By running the Open Trust Evaluation (ADR-040) locally. It applies ten deterministic checks over material the evaluated operator itself publishes: valid operator manifest, compatible protocol version, signed protocol metadata, conformance evidence present and valid, valid Trust Root or delegated-key signature, absence from the BRL, compatible capabilities, compatible endpoint contract, evidence freshness within policy, and fail-closed on trust material that is missing, invalid, expired, revoked or incompatible. The checks are conjunctive — any failure refuses the routing — and none of them consults an authority or a person's judgment. See [Open Trust Evaluation](#open-trust-evaluation).

---

**How do I validate conformance without cloning the BANZA repository?**

Use the BanzAI. It validates the manifest, runs the conformance validation against your operator's public URL, evaluates signed protocol metadata and revocation/fail-closed, and generates an Evidence Bundle — all in the browser, with the protocol's Rust/WASM engines. No repository to clone. [Open the BanzAI](/banzai).

---

**What does a conformance PASS mean?**

It means technical conformance evidence for the requested level. It does **not** mean production trust — that depends on the M2/M3 milestones — and it does not authorise financial activity.

---

**Is the report an authorisation?**

No. The report is an **evidence** artifact, reproducible by third parties from the public URL. It states what an implementation does, and nothing more. Technical conformance does not replace legal, regulatory, KYC/KYB or banking obligations — authorisation comes from the competent regulator, never from BANZA.

---

**How does an operator validate protocol compatibility?**

To validate protocol compatibility, use the BanzAI. The BanzAI lets you prepare the manifest, run conformance validations, verify signed protocol metadata, evaluate revocation/fail-closed and generate an evidence bundle. The operator's implementation is validated by verifiable artifacts, not by any particular tool.

---

**When can an operator actually federate?**

When its self-published material passes the [Open Trust Evaluation](#open-trust-evaluation) at the peer: L3+ scope, signed metadata that verifies, fresh evidence, absence from the BRL, and compatible capabilities and endpoints. Nobody grants this — the peer computes it. It also requires production trust material and production federation to be open (M2/M3). Today no operator has published production metadata, and `/operators` returns an empty list.

---

**Does BANZA require EMIS?**

No. EMIS may be a possible provider/rail in the Angolan context, but BANZA does not mandate it as the only provider. The protocol is external-provider neutral: operators may use EMIS, partner banks, authorized proprietary infrastructure, or other approved providers/rails, provided the integration is declared, verifiable, auditable and compliant with applicable legal, regulatory and technical requirements. The BNA is a regulatory/supervisory authority, not an operational provider.

---

**Is BANZA only for Angola?**

BANZA was designed for Angola — its founding context is the Angolan payment landscape, and the Kwanza (AOA) is the primary currency in the specification. The protocol is open: any entity worldwide can implement it. It does not depend on any specific payment rail. Angola is where it matters first.

---

**Can any company become a BANZA operator?**

Any entity can implement the protocol, run the public tests and publish the resulting evidence. The protocol asks nothing further and offers nobody to ask: there is no admission step. Operating in production remains subject to applicable legal, regulatory, banking, KYC/KYB and AML/CFT obligations — those belong to the operator, under the competent authorities, and no BANZA artifact waives them.

---

**What happens if an operator goes out of business?**

The protocol continues. Other operators continue to operate. The Key Manifest, the BRL, and the conformance test set remain available. The protocol is independent of any specific operator. This is the disappearing operator test — and the fundamental reason BANZA follows the open model.

---

**What is the difference between BANZA and BanzAI?**

BANZA is the protocol. It defines the rules and owns the conformance test set; the Trust Root signs only the Key Manifest that endorses the delegated signing keys, which sign protocol metadata, releases and revocations — it authorises no operator.

BanzAI is the Native Protocol Agent. It helps operators understand the rules, the conformance criteria and their traces, and prepare their evidence. BanzAI explains; the deterministic tests produce evidence; peers evaluate it.

---

**Does BanzAI decide whether an operator can participate?**

No — and neither does anything else. BanzAI produces readiness assessments, guidance, and simulation results. Evidence comes from the deterministic conformance test set, and the verdict comes from each peer's own Open Trust Evaluation over the published artifacts.

---

**How long does it take to be able to federate?**

Running the conformance test set takes minutes; publishing the evidence and signing the metadata is the operator's own step. There is no review and no waiting period — no queue exists because there is no reviewer. L3+ evidence must be republished every 90 days to stay within the freshness policy.

---

**What is the BRL?**

The BANZA Revocation List — a signed, public list of trust material that is no longer acceptable on the network, published every 6 hours at `banza.network/federation/revocation-list.json`. Before routing any federated payment, operators verify that the destination is not on the BRL. The Revocation List is a protocol security and trust mechanism. It is not a licence, a regulatory sanction, or a financial authorisation.

---

**How does an operator verify another's metadata without calling BANZA in real time?**

Using the Key Manifest. The Key Manifest has a specified canonical location at `https://banza.network/.well-known/banza/key-manifest.json`. This is the protocol-defined location, not a claim that a production Manifest is already published — the production Key Manifest is published only after the Trust Root ceremony milestone (M2). Implementations may cache or pin the signed Manifest for offline verification, but the signed Manifest itself is the normative source of truth, not any SDK. Signed protocol metadata is accepted if: (1) its `issuer_key_id` appears in the Key Manifest, (2) its signature verifies with the delegated key's public key, (3) the referenced evidence is valid and within the freshness policy, and (4) the operator is not in the current BRL. No real-time BANZA server call is required.

---

**What is federation?**

Federation is the mechanism by which conformant operators can route payments between each other without bilateral agreements. Once production federation opens (milestone M3), Customer A on Operator A can pay Merchant B on Operator B — crossing the operator boundary — using only the BANZA protocol. Trust is established by the Open Trust Evaluation, routing is protocol-defined, settlement is handled by bilateral netting.

---

**Does an L3 operator need a special agreement with BANZA to federate?**

No — and there is nothing to agree to, nor anyone to agree with. Federation is an automatic consequence of L3 material that passes the Open Trust Evaluation; there is no enrollment process. Any two L3+ operators can federate as soon as each verifies the other's published artifacts.

---

**What level should a new operator target first?**

Start at L0 or L1. L0 establishes that your sandbox environment is operational. L1 covers core wallets, static QR, and P2P transfers — the foundation of every higher level. Most operators target L2 (instant settlement) within their first implementation cycle.

---

**What is the root key ceremony?**

The root key ceremony is the offline process by which the BANZA Trust Root is generated and stored. It is performed on an air-gapped machine, in the presence of a Ceremony Officer and an independent Witness, following a documented procedure. The private key never touches a networked machine. The ceremony establishes the root of trust for the entire BANZA trust chain. The Trust Root signs only the Key Manifest that endorses the delegated signing keys; protocol metadata, releases and revocations are signed by delegated keys, never by the root directly. It does not authorise operators, does not issue a licence, and does not authorise payments.

---

## References

**ADRs:**
- ADR-006 — Double-entry ledger
- ADR-011 — Idempotency and rate limiting
- ADR-012 — QR payment system
- ADR-010 — Account/Participant Identity Model
- ADR-001 — Open financial protocol (implementation independence)
- ADR-003 — Operator separation
- ADR-002 — Ecosystem naming (canonical)
- ADR-038 — Open Protocol Trust Model Without CA
- ADR-039 — Operator Self-Publication and Machine-Verifiable Conformance
- ADR-040 — Federation Trust Evaluation Without Certificates

**Companion documents:**
- `docs/governance/certification-boundary.md` — Conformance levels, process, maintenance (authoritative)
- `docs/guides/conformance.md` — Conformance test set overview
- `docs/governance/README.md` — Governance framework
- `decisions/adr/` — All Architecture Decision Records
- `decisions/rfc/` — All Requests for Comments
- `spec/federation/` — Federation documentation
- `docs/governance/MATRIX_A_BANZA.md` — BANZA Validation Matrix (canonical)
- `docs/governance/BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md` — M1–M6 roadmap
