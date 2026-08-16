# BANZA — Protocol Reference

**Version:** 1.0 · **Status:** pre-production · real payments disabled · no certified implementations in production

> **Official English translation.** This file is the official English translation of the
> [canonical Portuguese Reference](../pt/BANZA_REFERENCIA.md). It is not independently canonical: in
> the event of an unintended divergence, the Portuguese edition prevails.
>
> **The Reference is descriptive, not normative.** It organises and explains the normative surface; it
> does not define it. Normative authority lies with the
> [Normative Manifest](../../../contracts/production/normative-manifest.json) and the artifacts it
> indexes — specifications, contracts and registries. Where this Reference and a normative artifact
> diverge, the normative artifact prevails.
>
> The public surfaces — website and BanzAI — consume or derive from this file. They do not edit it, and
> they do not keep a competing editorial copy. See [`docs/reference/README.md`](../README.md).

---

## Executive Summary

BANZA is an open financial interoperability protocol. It defines the rules — contracts, messages, profiles, invariants (rules that may never be violated) and verifiable conformance mechanisms — that independent implementations use in order to interoperate and produce verifiable evidence, without rebuilding bilateral technical integrations between every pair of participants and without central human approval at the protocol level. Real operation in production depends on legal, regulatory, banking, KYC/KYB and AML/CFT obligations, which belong to the operator and to the competent authorities.

**What it is not:** BANZA is not a bank, a PSP, a wallet, a scheme, a financial operator or a financial service provider. It is not a running service and not a single endpoint. It does not hold funds, does not maintain customer accounts, does not perform settlement and does not grant regulatory authorisation. It is the set of rules that makes interoperability possible — the ability of different systems to process payments between one another in a verifiable way.

**How it is structured:** the ecosystem has three layers — **Layer 1**, the open protocol (open, neutral and verifiable rules); **Layer 2**, Conformance and Interoperability Certification (per implementation, evidence-based, decided in Rust); and **Layer 3**, the independent operational schemes — the first of which is the Banzami Operational Scheme, with Banzami as the scheme's designated operator (in regulatory preparation, with real payments disabled). **BanzAI** is the primary human interface, transversal to the three layers — it is neither a fourth layer nor an authority. See [§4](#4-protocol-architecture).

**Who participates:** *operators* are independent legal entities that implement the protocol and process payments. BANZA is an open financial protocol. An implementation's protocol conformance is demonstrated by verifiable evidence, not by central human approval at the protocol level. An operator implements the protocol, publishes its manifest, exposes compatible endpoints and produces conformance evidence that any party may verify. At the protocol level there are no minimum volumes, no prior bilateral technical integrations required and no discretionary decisions. See [§8](#8-operators).

**How trust is established:** through signed protocol metadata, conformance evidence, a public registry with a verifiable index, a Trust Root, delegated signing keys, and revocation that fails closed. At the protocol level, no human entity decides the outcome of the trust evaluation: it is deterministic and executable by any party. See [§7](#7-conformance-and-certification) and [§6](#6-trust).

**Who governs:** BANZA governance, in its bootstrap phase, defines the process by which ADRs and RFCs are approved and maintains the protocol's neutrality. Governance evolves the protocol's rules — it does not admit, approve or authorise operators. The formal governance entity is defined by the institutionalisation process. The protocol evolves through a documented process — no operator decides unilaterally. See [§11](#11-governance).

**How it works at a high level:** once production federation is active, operators holding the applicable conformance profile and verifiable evidence will be able to exchange payments with one another through federation — with trust established by evaluation over signed metadata and verifiable evidence, without rebuilding bilateral technical integrations between every pair of operators; the capability to federate does not imply automatic operation. Conformance verification demonstrates that conformant implementations respect the same financial invariants. At present `/operators` returns an empty list; production federation depends on the federation production conditions. See [§10](#10-federation).

**Why it exists:** Angola has the components of a modern financial system and has operational interoperability between participants; what it does not yet have is an open layer that makes that interoperability public and reproducible by third parties. BANZA is that layer — open, verifiable, independent of any operator — and it complements the infrastructures already in use. The protocol outlives any individual operator, by design. See [§2](#2-why-banza-exists).

> **Recommended entry point for new readers:** [§15 — Frequently Asked Questions](#15-frequently-asked-questions) gives direct answers to the most common questions. To implement an operator: [§7 Conformance and Certification](#7-conformance-and-certification) → [§8 Operators](#8-operators) → [§13 Developer Resources](#13-developer-resources).

> **Public status v1.0:** this Reference describes the BANZA v1.0 protocol in pre-production. The Technical Registry returns an empty list. The Key Manifest and the BRL (BANZA Revocation List) have specified canonical locations, but production publication depends on the production conditions. Production federation depends on the federation production conditions. Technical conformance does not replace the applicable legal, regulatory, banking or KYC/KYB obligations. Operational status is documented in [§5 Protocol State](#5-protocol-state); protocol evolution in [§14](#14-protocol-evolution).

---

## Contents

1. [What BANZA Is](#1-what-banza-is)
2. [Why BANZA Exists](#2-why-banza-exists)
3. [Protocol Structural Properties](#3-protocol-structural-properties)
4. [Protocol Architecture](#4-protocol-architecture)
5. [Protocol State](#5-protocol-state)
6. [Trust](#6-trust)
7. [Conformance and Certification](#7-conformance-and-certification)
8. [Operators](#8-operators)
9. [Operator Zero](#9-operator-zero)
10. [Federation](#10-federation)
11. [Governance](#11-governance)
12. [BanzAI — Protocol Agent](#12-banzai-protocol-agent)
13. [Developer Resources](#13-developer-resources)
14. [Protocol Evolution](#14-protocol-evolution)
15. [Frequently Asked Questions](#15-frequently-asked-questions)

---

## Quick Navigation

### Conformance and Certification
- [Conformance profiles (L0–L4)](#conformance-profiles-l0l4) · §7
- [How an implementation is validated](#how-an-implementation-is-validated) · §7
- [Formal technical certification (Layer 2)](#formal-technical-certification-layer-2) · §7
- [What certification does not grant](#what-certification-does-not-grant) · §7
- [Revocation of trust material](#the-brl-banza-revocation-list) · §6

### Federation
- [Technical eligibility: the L3 profile](#technical-eligibility-the-l3-profile) · §10
- [How federation is evaluated](#how-federation-is-evaluated) · §10
- [What federation does not create](#what-federation-does-not-create) · §10

### Trust
- [What trusting means](#what-trusting-banza-means) · §6
- [The Key Manifest](#the-key-manifest) · §6
- [The BRL — Revocation List](#the-brl-banza-revocation-list) · §6
- [What trust does not prove](#what-trust-does-not-prove) · §6
- [Open Trust Evaluation](#open-trust-evaluation) · §8
- [Institutional trust architecture](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md) · dedicated document

### Governance
- [What governance governs](#what-governance-governs) · §11
- [What remains outside its authority](#what-remains-outside-its-authority) · §11
- [Who governs and how a change is decided](#who-governs-and-how-a-change-is-decided) · §11
- [Versioning and publication](#versioning-and-publication) · §11

### Developers
- [Normative sources and artifacts](#normative-sources-and-machine-readable-artifacts) · §13
- [Interfaces per profile](#interfaces-per-conformance-profile) · §13
- [Validation tooling](#validation-and-conformance-tooling) · §13
- [From implementation to validation](#from-implementation-to-validation) · §13
- [What is not a protocol requirement](#what-is-not-a-protocol-requirement) · §13

### Frequently Asked Questions
- [§15 — full FAQ](#15-frequently-asked-questions)

---

## 1. What BANZA Is

**BANZA is an open financial interoperability protocol: it defines public rules, contracts, messages, profiles and verifiable mechanisms that independent implementations may adopt in order to interoperate verifiably.** Two implementations that have never met interoperate because both respect the same public contracts and produce the same verifiable evidence.

BANZA is not a bank, a PSP, a wallet, a scheme, a financial operator or a financial service provider. It does not hold funds, does not maintain customer accounts, does not perform settlement and does not grant regulatory authorisation. It is the common layer of rules — contracts, messages, invariants, evidence and trust — that makes interoperability verifiable and reproducible, without each pair of participants having to rebuild the same technical integrations separately.

![BANZA Protocol boundary — humans and operators use BanzAI (the primary human-operator interface) to interact with BANZA (public rules, verifiable engines, evidence) inside the boundary; outside the boundary sit the independent operators, the external financial infrastructure and the competent authorities; no funds flow through BANZA and BanzAI does not authorise regulated activity](/diagrams/protocol/banza-boundary-protocol-operator-infra-v1.svg)

### A common, open and verifiable protocol

This section's title names four ideas — a protocol that is common, open, verifiable and about interoperability — which together define what kind of protocol BANZA is. Each is explained below, with its meaning, its reach and its boundary.

A **protocol** is a set of common rules that independent implementations follow in order to produce compatible behaviour and artifacts. In BANZA those rules cover contracts and formats, financial invariants, discovery and technical identity, trust mechanisms, evidence and conformance.

The purpose of a common protocol is to replace the repetition of the same technical decisions with public, versioned rules: each implementation adopts the same applicable contracts instead of redefining equivalent formats, semantics and validation criteria with every counterparty. This reduces bilateral technical integrations, but it does not remove the remaining relations between operators — connectivity, commercial agreements, participation in a scheme, settlement, support and regulatory obligations may still be necessary.

The protocol makes common only the technical part necessary for interoperability. Why that repetition exists, and what makes it avoidable, is the subject of [§2 Why BANZA Exists](#2-why-banza-exists).

**Open** means that the protocol's rules can be known and implemented without depending on private specifications negotiated between participants. The rules are public; the contracts are versioned; the evolution of the rules follows a documented governance process; and an independent party may study and implement the protocol.

Openness also permits scrutiny: the rules, the contracts and the evaluation mechanisms can be examined by third parties, and the reference implementation is made available as open source.

Open does not mean the absence of regulation, of operators, of conditions for participating in a scheme, or of institutional responsibility. A public protocol rule does not replace commercial, operational, legal or regulatory requirements — it only means that nobody needs private permission to read, implement or verify the rules.

**Verifiable** means that a technical claim about an implementation does not have to be accepted merely because whoever publishes it declares that it conforms.

The evaluation identifies the observed implementation, the protocol version, the profile, the environment, the artifacts consumed and the engine versions that produced the result; signatures, cryptographic digests (*hashes*), reason codes, evidence and receipts make it possible to relate those inputs to the result obtained. A third party can therefore inspect what was evaluated, under which rules, and with what outcome.

Given the same inputs, the same specification, the same profile and the same engine version, that third party can also re-run the evaluation and obtain a semantically equivalent result. Reproducibility is one of those guarantees, but it does not exhaust verifiability: verifying also implies knowing the provenance of the inputs, confirming their integrity and binding each result to the evidence that supports it.

This verifiability remains bounded. Demonstrating how a technical result was obtained does not turn BANZA into an authority, nor does it convert conformance into certification, admission to a scheme or regulatory authorisation.

The **interoperability** that BANZA makes common is, first of all, technical: independent implementations share contracts, formats, invariants, trust mechanisms, evidence and conformance profiles.

Operational interoperability is broader. The effective exchange of payments in production may still depend on connectivity, participation in a scheme, settlement, commercial agreements and the applicable regulatory authorisations; implementing the protocol does not remove those dependencies.

BANZA therefore does not seek to make operators alike. The products, interfaces, business models, risk policies and regulatory frameworks of implementations may remain different: the protocol standardises only what needs to be common and verifiable for interoperability.

### Protocol, operator and implementation

BANZA is the protocol — it is not an operator. These terms are not interchangeable, and the distinction runs through the whole Reference:

| Term | What it is |
|---|---|
| **Entity** | An independent legal person; legally and regulatorily answerable for its activity. |
| **Operator** | An entity that implements BANZA in order to process payments, under its own authorisations. |
| **Implementation** | The set of artifacts (the *build*) of an operator, identified by its *hash*; it is the subject of conformance and of technical certification. |

It is the **implementation**, and never the entity or the brand, that is subject to conformance and to technical certification. An operator may publish more than one implementation, and a technical result applies to a bounded implementation, not to the entity in the abstract. The full distinction — including certified implementation and scheme participant — is in [§8 Operators](#8-operators).

Three determinations remain distinct, with distinct owners, and none implies the others: **technical certification ≠ scheme admission ≠ regulatory authorisation** (ADR-005). Demonstrating conformance, obtaining technical certification for an implementation, being admitted to an operational scheme and obtaining regulatory authorisation are different steps — see [§7 Conformance and Certification](#7-conformance-and-certification).

### Properties

Four structural choices make BANZA this kind of protocol:

- **Separation of responsibilities.** The open protocol, conformance certification and the operational schemes are distinct layers, separated by responsibility, infrastructure and keys.
- **Evaluation of implementations, not of entities.** What is evaluated, tested and certified is a bounded implementation identified by its *hash* — never reputation, brand or entity.
- **Results bound to evidence.** Each technical result is bound to the observed inputs and is accompanied by verifiable, reproducible evidence: given the same canonical inputs and the same specification and profile version, independent executions produce equivalent verdicts.
- **Deterministic decision, subordinate explanation.** Decisions are deterministic and taken by engines written in Rust; a local language model may explain a result, but never decides it.

These properties are the protocol's identity; the structural properties that follow from them — neutrality, financial correctness, openness and separation of responsibilities — are developed in [§3 Protocol Structural Properties](#3-protocol-structural-properties). **Neutrality**, in particular, means that the protocol's rules grant no technical privilege to any implementation; it does not mean the absence of governance, of responsibility or of external policy.

### Fundamental Principles — BANZA R²S²

BANZA has **four** fundamental principles, and only four. Together they are called **BANZA R²S²** — *Robust · Resilient · Secure · Simple*.

| Principle | Meaning |
|---|---|
| **Robust** | deterministic and correct behaviour under independent implementation, adversarial input and boundary conditions |
| **Resilient** | contains failures, preserves safe operation where possible and recovers deterministically without weakening the protocol's guarantees |
| **Secure** | critical properties are enforced by construction and fail closed when they cannot be established |
| **Simple** | uses the smallest mechanism sufficient to provide the required property |

The order is canonical. The short form is **R²S²**; where the superscript is not technically suitable, write `R2S2`.

The principles are the **criterion by which decisions are taken** — not a description of what the protocol does. Every architectural decision answers four questions: does an independent implementer still obtain the same behaviour? what happens when this fails? can a failure, an attack or a fallback violate trust or an invariant? is there a smaller mechanism that provides the same property? A decision that does not survive all four is reconsidered.

**Resilience does not override security.** It preserves safe operation and deterministic recovery in the face of failures; it never permits trust, authorisation, integrity or any protocol invariant to be bypassed merely in order to stay available. Nor does resilience mean the absence of unavailability: it means that a failure is contained, explicit and recoverable, and that it does not turn into a violation of the protocol.

These principles are distinct from two other axes, and the distinction is deliberate: the **structural properties** ([§3](#3-protocol-structural-properties)) are what the protocol must possess, and the **invariants** ([§4](#4-protocol-architecture)) are constraints the architecture may not violate. Principles decide; properties characterise; invariants constrain.

### Scope and Boundaries

BANZA defines the rules (Layer 1); it does not execute financial activity. The boundary is explicit:

| BANZA defines (Layer 1) | BANZA never executes |
|---|---|
| Contracts, messages, schemas, profiles and versions | KYC/KYB, AML/CFT |
| Financial invariants and *reason codes* | Customer accounts and wallets |
| Technical identity, discovery and manifests | Holding or moving funds (*safeguarding*) |
| Keys, signed metadata, trust and revocation | Settlement and clearing of real funds |
| Conformance, interoperability and evidence | Admission to a scheme |
| Technical certification, technical registry and federation | Regulatory authorisation |

What BANZA defines is verifiable by any party; what it does not execute belongs to the operators and to the competent authorities and exists entirely outside the protocol. Each operator implements the protocol on its own infrastructure — the protocol does not reside on a central payment-execution server. The only common surfaces are those of discovery and trust anchoring — the Technical Registry, the signed trust metadata, the Revocation List and the Key Manifest — which neither move funds nor execute payments.

The ecosystem is organised into three layers, separated by responsibility, infrastructure and keys (ADR-004): **Layer 1**, the open protocol; **Layer 2**, Conformance and Interoperability Certification, per implementation and evidence-based; and **Layer 3**, the independent operational schemes — the first being the Banzami Operational Scheme, with **Banzami — Tecnologia e Serviços, Lda.** as the scheme's designated operator, in regulatory preparation and with real payments disabled. The detail is in [§4 Protocol Architecture](#4-protocol-architecture). **BanzAI** is the primary human interface, transversal to the three layers — it is neither a fourth layer nor an authority, and the protocol works without it: conformance and machine-to-machine verification remain possible independently of whether it is used ([§12](#12-banzai-protocol-agent)).

Dependency runs in a single permanent direction: operators depend on BANZA; BANZA and BanzAI never depend on any operator. This direction is an architectural invariant, not a design preference.

The v1.0 specification is published and the environment is pre-production: the Technical Registry returns an empty list, there are no production certifications and real payments are disabled. Published is not frozen — freezing is a deliberate decision about an exact candidate, and it has not been taken. This state is verifiable on the protocol's public routes and documented in [§5 Protocol State](#5-protocol-state).

---

## 2. Why BANZA Exists

Financial interoperability is not an unsolved problem: it happens every day. Independent operators exchange value and information through several models — direct integrations, networks and switches, schemes and shared infrastructures, common messaging standards. Those models work and may be appropriate to their context. BANZA's reason for existing is more specific, and this chapter delimits it.

### Financial interoperability already exists

Independent financial operators already interoperate. They may integrate directly with one another, participate in shared settlement and exchange infrastructures, or adopt common standards for messaging and operation. These mechanisms permit the exchange of value and information and continue to play an essential role — BANZA does not replace them.

The problem that motivates BANZA appears on another plane. The technical rules, the tests and the results needed in order to *demonstrate* interoperability tend to be specific to each relationship, or to be available only to authorised participants. When a third party cannot implement those rules, compare results and reproduce the validation independently, each participant repeatedly solves similar problems and produces results that are difficult to set against one another.

This chapter's thesis is therefore precise: **what is missing in certain contexts is not operational interoperability, but a common public basis that allows technical conformance to be implemented, compared, verified and reproduced independently.** That basis is what BANZA adds.

The protocol's context of origin and first application is Angola. As in other markets, operational interoperability between participants already exists — through banks, through shared settlement and exchange infrastructures and through digital channels. That context motivates the work but does not bound the problem: the gap the protocol addresses is technical and general, and the same analysis applies to other contexts.

### Bilateral integrations

The most direct way for two operators to interoperate is a bilateral integration: they agree between themselves the technical elements they need — message formats, identity, keys, error handling, acceptance tests, support and the specific operation of that link. It is a valid model and, for many relationships, sufficient.

The potential cost lies not in an isolated integration but in the repetition. When the same elements have to be defined afresh for each relationship, every pair rebuilds similar technical work, with slightly different rules each time. Bilateral is not in itself a defect; it is the possibility of repeating the technical integration as the number of participants grows.

#### The full mesh

This pattern of repetition has a familiar shape. If `n` operators all connect to one another, the number of distinct technical relationships is `n(n−1)/2`: five operators give ten relationships; ten operators give forty-five. What this expression counts is technical relationships between pairs — not implementations, not monetary costs, and not the number of APIs, contracts or transactions.

With a common set of public rules, the quantity changes in nature. Each operator implements the same set of rules once: `n` operators give `n` implementations. The second expression counts independent implementations, not relationships. The two formulas describe different growth patterns of different quantities — relationships against implementations — and it is that difference, and not a specific cost, that the comparison illustrates.

The full mesh is an illustrative model, not a description of every market. Real ecosystems frequently rely on hubs, networks, gateways, central systems or partially shared integrations, precisely so as not to multiply pairwise links. A new participant adds, at the limit of a full bilateral mesh, up to `n` new relationships; under a common set of rules, it adds one implementation.

### Shared infrastructures

The second model of interoperability is the shared infrastructure: a common system — a network, a switch, a scheme, a central infrastructure — through which several participants interoperate without negotiating a distinct link with every counterparty. This model solves precisely part of the bilateral multiplication problem; the full mesh is not the only way to contain the multiplication of pairwise links.

Centralisation is not, in itself, the problem. A central infrastructure may offer efficiency, security, operation, settlement, governance and supervision, and controlled participation — with membership and authorisation criteria — is a legitimate institutional characteristic of many systems. BANZA does not remove the need for institutional participation where it applies.

The question that matters for BANZA is a different one: to what extent a third party can independently observe, implement and reproduce the technical rules and evaluations. An infrastructure may solve operational interoperability very well and still keep its specifications, its tests and its results accessible only to participants — which leaves verification dependent on cooperation.

### The verifiability problem

This is the central gap. When the specifications, the inputs, the tests, the criteria, the versions, the reason codes and the results are not sufficiently available, a third party may be unable to reproduce the technical evaluation. This is not a matter of insecurity or of malfunction — the system may work perfectly; it is a matter of reduced comparability, auditability and independence of verification.

Comparability suffers for the same reason. Results produced under different criteria, different versions, private tests or unidentified artifacts are difficult to set against one another. A common basis makes explicit the evaluated subject, the version, the profile, the environment, the inputs, the engine and the evidence — so that two results can be placed side by side with the same meaning. The formal treatment of this binding between inputs, execution and result is developed in [§7 Conformance and Certification](#7-conformance-and-certification).

The practical difference is between *trusting* and *verifying*. In a verifiable model, a third party does not have to accept the mere declaration that an implementation passed a given test: it can inspect the technical basis of the result. This does not eliminate trust — which continues to exist in origins, governance, keys, institutions, operators and regulators — but it moves part of it from a declaration to the evidence.

### What BANZA adds

![Bilateral integration and common protocol — on the left, five independent operators (A to E) connected pairwise, ten distinct technical relationships (n operators give n(n−1)/2 relationships); on the right, the same five operators independently implementing the same set of public rules, five implementations (n operators give n implementations); the two quantities — relationships and implementations — are different, and the common protocol is neither a single platform nor a central operator](/diagrams/protocol/banza-bilateral-mesh-vs-common-protocol-v1.svg)

A common set of public rules changes the starting point. There now exist public rules, versioned contracts, comparable profiles, explicit invariants, common criteria, evidence bound to the inputs and reproducible evaluation. It is no longer necessary to redefine the same technical rules between every pair of participants: whoever implements the specification once is able to interoperate technically with any other conformant implementation.

BANZA adds — it does not replace. To the operational interoperability that already exists, it joins an open basis of common rules, public profiles, deterministic conformance and verifiable evidence. *Basis* is preferred here to *layer* so as not to confuse it with the three institutional layers described in [§4 Protocol Architecture](#4-protocol-architecture).

In summary, the gap is closed by four needs: common rules, comparable evaluation, verifiable evidence and independent reproduction. That — and only that — is what the protocol makes public and common. Reducing repeated technical integrations does not remove the remaining relations between operators — commercial, connectivity, settlement, scheme and regulatory ([§1](#1-what-banza-is)) — which may still be necessary.

### What remains outside

Making the technical rules explicit and conformance verifiable has a deliberate limit. BANZA does not replace operational infrastructures, settlement systems, existing standards or regulatory decisions. The following remain the responsibility of operators and of the competent entities:

- **adoption** — no protocol guarantees users, merchants or use cases;
- **regulation and authorisation** — operating financial services requires the applicable licences and authorisations, which only the competent entities grant;
- **liquidity and banking relationships** — funding operations and access to settlement rails are the operators' relationships;
- **KYC/KYB and AML/CFT** — identification, verification and prevention belong to the operators, under whatever legal framework applies to them;
- **operational risk** — availability, systems security and business continuity are the responsibility of whoever operates.

These determinations remain distinct, and with distinct owners: **demonstrating conformance, obtaining technical certification for an implementation, being admitted to an operational scheme and obtaining regulatory authorisation are different steps** (see [§7 Conformance and Certification](#7-conformance-and-certification)). The protocol gives a common verifiable basis; it does not confer institutional or legal status.

### Where to Continue

This chapter explained why an open and common protocol exists: financial interoperability already exists, but in certain contexts there is no public, common and reproducible basis on which it can be demonstrated and verified independently. What BANZA is was defined in [§1 What BANZA Is](#1-what-banza-is); the principles under which it was designed are the subject of [§3 Protocol Structural Properties](#3-protocol-structural-properties).

---
