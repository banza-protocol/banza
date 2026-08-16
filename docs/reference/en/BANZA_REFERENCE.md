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

![BANZA Protocol boundary — humans and operators use BanzAI (the primary human-operator interface) to interact with BANZA (public rules, verifiable engines, evidence) inside the boundary; outside the boundary sit the independent operators, the external financial infrastructure and the competent authorities; no funds flow through BANZA and BanzAI does not authorise regulated activity](../../../website/public/diagrams/protocol/banza-boundary-protocol-operator-infra-v1.svg)

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

![Bilateral integration and common protocol — on the left, five independent operators (A to E) connected pairwise, ten distinct technical relationships (n operators give n(n−1)/2 relationships); on the right, the same five operators independently implementing the same set of public rules, five implementations (n operators give n implementations); the two quantities — relationships and implementations — are different, and the common protocol is neither a single platform nor a central operator](../../../website/public/diagrams/protocol/banza-bilateral-mesh-vs-common-protocol-v1.svg)

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

## 3. Protocol Structural Properties

BANZA was designed so that technical interoperability can be demonstrated without depending on implicit rules or on a privileged implementation. From that choice follows a set of properties that condition the protocol's architecture, validation and evolution.

These properties describe neither components nor technologies. They describe qualities that must remain true independently of the implementation, the versions and the tools used to realise the protocol. That is the difference between a structural property and an implementation decision: the implementation may change; the property has to survive the change.

**Properties are not principles.** BANZA's **Fundamental Principles** are four — **Robust · Resilient · Secure · Simple**, the **R²S²** set — and they are the criterion by which decisions are taken ([§1 What BANZA Is](#1-what-banza-is)). The properties in this chapter are what the protocol must possess; the principles are how one decides to build it so that it possesses them. The distinction exists because a document that calls both things *principle* can protect neither.

Each property is presented through its **meaning**, the structural **consequence** it produces and the **boundary** that delimits it.

### Financial correctness

Where the protocol defines financial behaviour, correctness is not optional. Monetary values, the integrity of postings and the safe repetition of operations are specified as invariants, so that every operation is auditable and reproducible by a third party.

The consequence is that an implementation cannot trade correctness for convenience: the applicable financial guarantees are enforced by conformance verification, not left to each operator's discretion. The formal detail — which invariants apply, and under which profile or capability — belongs to [§4 Protocol Architecture](#4-protocol-architecture) and [§7 Conformance and Certification](#7-conformance-and-certification).

The boundary is twofold. First, financial correctness does not mean that the protocol holds or moves money — non-custody is a boundary defined in [§1 What BANZA Is](#1-what-banza-is); what follows from it for this property is only that the protocol defines how postings must behave, but does not execute them: value moves in the operators' systems and on the competent settlement rails. Second, not all financial requirements are universal: some apply only from a specific profile or capability onwards and must not be read as requirements of the whole protocol.

### Neutrality

The protocol's rules apply without granting technical privilege to any implementation. The same contracts, profiles, criteria and evaluation mechanisms hold for any implementation within the same scope, including the reference implementation.

The consequence is that conformance is with the protocol, not with the code of any particular implementation. Two implementations in different languages or architectures may satisfy the same profile; the reference implementation is an open example, never a mandatory implementation. Value accumulates in the common layer of rules, not in an individual implementation.

The boundary is that neutrality does not mean the absence of governance, of responsible parties, of operators or of authorities. A protocol may be governed and remain technically neutral: neutrality limits technical privilege, not the existence of institutional responsibility.

### Public, explicit and versioned rules

No normative rule exists in prose alone. When implementation begins, the rule has to exist as a public artifact — contract, schema, invariant or conformance vector — and no implementation is evaluated against implicit or undeclared rules.

The consequence is a fixed order: the rule originates in the specification, then is implemented, then produces evidence, then is evaluated. What has no public contract cannot be tested; what cannot be tested can neither generate evidence nor be compared. And the version applicable to a result is always explicit, so that one can know which rules were in force when the result was produced.

The boundary is that this property fixes only that the rules are public and versioned — not how they evolve. The process of change, deprecation and compatibility belongs to [§11 Governance](#11-governance).

### Deterministic decision

Technical states are determined by rules and by deterministic engines, not by linguistic interpretation or by discretionary judgement at evaluation time. Given the same inputs and the same rules, the decision is the same.

The consequence is that results are reproducible and accompanied by machine-readable reasons, which allows them to be compared and automated without depending on natural language.

The boundary is that determinism does not mean the absence of explanation. An interface may guide, route and explain a result, but explaining is not deciding: the engines verify, the evidence proves and the competent authority decides — the protocol's human interface is treated in [§12 BanzAI — Protocol Agent](#12-banzai-protocol-agent). The property is that the normative decision be deterministic and controlled, not any specific implementation technology.

### Evidence and reproducibility

A result must be traceable back to the inputs that sustain it. The protocol's relevant claims are verifiable through public artifacts — machine-format routes, reproducible tests, signed documents — without requiring trust in a website, a company or a person.

The consequence is that independent audit becomes possible by construction: a competent authority or a third party finds the same artifacts as any participant and, given the same material, can re-run the evaluation and obtain an equivalent result. Verification ceases to depend on the active cooperation of the party being evaluated.

The boundary is that reproducing is not reproducing the whole result byte for byte: non-deterministic metadata — such as an instant or an execution identifier — may vary without invalidating semantic equivalence. And reproducibility is one of the guarantees of verifiability, not the whole of it; the distinction is in [§1 What BANZA Is](#1-what-banza-is).

### Explicit scope and no implicit authority

No technical result is universal. It applies to the subject, the version, the profile, the environment and the evidence actually evaluated — and the subject is the bounded implementation, never the entity or the brand.

The consequence is twofold. A result does not silently generalise beyond what was evaluated, which is what makes it meaningfully comparable. And a technical result does not acquire institutional meaning that the protocol does not assign to it: conformant is not certified, certified is not admitted to a scheme, admitted is not authorised by a regulator.

The boundary is that the protocol asserts only what it observes. A technically conformant implementation implies neither good internal governance, nor solvency, nor legal compliance, nor organisational security, nor authorisation — those properties are not observable by technical evaluation and are not deduced from it.

### Fail closed

The absence or inconsistency of proof of trust is not converted into approval. Faced with missing, invalid, expired or incompatible evidence, the correct behaviour is not to proceed: the system fails towards the safe side (*fail-closed*).

The consequence is that interoperability between operators is granted by deterministic verification — not open by default, and not granted by a human decision at routing time — and that removing trust has to be as fast as granting it. The concrete mechanism, with deterministic verifications and signed public revocation, is treated in [§6 Trust](#6-trust) and [§10 Federation](#10-federation).

The boundary is that failing closed describes the available evidence; it does not judge an entity. It is not an exclusion list, a sanction, a prohibition or a regulatory decision: it is a technical safety posture in the face of uncertainty.

### Separation of responsibilities

The protocol, the technical evaluation of conformance, operation and regulatory authority are distinct responsibilities, and none automatically inherits the decisions of the others. No participant holds unilateral authority over the protocol's trust layer.

The consequence is that different responsibilities do not collapse into a single authority — which is what allows operators, supervisors and competing implementations to coexist on the same common layer without any of them having privileged access. The concrete materialisation of this separation, in layers distinct by responsibility, infrastructure and keys, is the subject of [§4 Protocol Architecture](#4-protocol-architecture).

The boundary is that the separation is of responsibilities, not of cooperation: the layers continue to articulate with one another. And it does not eliminate governance — it distributes it, so that the capture of one participant does not capture the protocol.

![Structural properties and their consequence — each structural property of BANZA (financial correctness, neutrality, public versioned rules, deterministic decision, evidence, explicit scope, fail closed, separation of responsibilities) produces a verifiable design consequence, and together they condition the protocol's architecture, validation and evolution](../../../website/public/diagrams/protocol/banza-principios-consequencia-estrutural-v1.svg)

### Where to Continue

These properties condition everything that follows. How they materialise in components, layers and keys is the subject of [§4 Protocol Architecture](#4-protocol-architecture); how an implementation demonstrates conformance with them is in [§7 Conformance and Certification](#7-conformance-and-certification); and how the rules evolve without breaking these properties is in [§11 Governance](#11-governance).

---

## 4. Protocol Architecture

BANZA's architecture answers a simple question: who does what, and where each party's competence ends. It separates three responsibilities that must not inherit authority from one another — defining rules, evaluating implementations and operating services — and keeps them distinct by design, not by convention.

This chapter describes responsibilities and boundaries, not servers or software. It is a description that survives a change of language, database or infrastructure, because it fixes what has to remain true, not how it happens to be implemented today.

### Overview

The ecosystem has three institutional layers and one transversal interface. **Layer 1** is the open protocol, which defines the rules. **Layer 2** is certification, which evaluates implementations against those rules. **Layer 3** is the operational schemes, which adopt the protocol in order to operate. **BanzAI** crosses all three as the human interface — it guides and explains, but does not decide.

Two ideas support the rest of the chapter. First: each responsibility is separated from the others by design, and no determination passes automatically from one to the next. Second: the protocol does not execute itself — those who process payments are the operators, on their own infrastructures, under the protocol's rules but outside it.

### The three layers

The ecosystem is organised into three institutional layers, separated by responsibility, infrastructure and keys. The separation is an architectural invariant, not a presentational choice (ADR-004).

| Layer | Responsibility |
|---|---|
| **Layer 1 — Open protocol** | The common public rules: contracts, messages, schemas, invariants, technical identity, discovery, trust, revocation, conformance and evidence. It defines correct behaviour; it is not a bank, a PSP, a wallet, a scheme or an operator, and it neither holds nor moves funds. |
| **Layer 2 — Conformance and Interoperability Certification** | Evaluates a bounded implementation against public, versioned profiles, by evidence and deterministic decision. It certifies an implementation, never an entity; it is not a licence, scheme admission or regulatory authorisation (ADR-032). |
| **Layer 3 — Independent operational schemes** | Independent operational schemes that may adopt the protocol in order to operate, defining participation, operation and responsibilities under the applicable framework (ADR-006). The first is the Banzami Operational Scheme, promoted by **Banzami — Tecnologia e Serviços, Lda.** as designated operator. BANZA ≠ scheme: the protocol's continuity does not depend on any scheme. |

The three layers are simultaneous responsibilities, not stages of a process and not maturity levels. Each can exist, evolve and be audited without depending on the internal decisions of the others: an implementation may be certified at Layer 2 without belonging to any scheme, and a Layer 3 scheme may operate under its own framework without altering the Layer 1 protocol.

**The layers are not the conformance profiles.** Layers 1, 2 and 3 divide *responsibilities between institutions* — who defines, who evaluates, who operates. The L0–L4 conformance profiles measure something else: the *technical capabilities* that a single implementation has demonstrated and the scope of its evaluation. One axis divides competences between institutions; the other describes the reach of one implementation. They neither replace nor overlap one another — the detail of the profiles is in [§7 Conformance and Certification](#7-conformance-and-certification).

![BANZA institutional architecture in three layers separated by responsibility, infrastructure and keys — Layer 1 Open protocol (public, neutral and verifiable rules; moves no funds), Layer 2 Conformance and Interoperability Certification (certifies an implementation, never an entity, by evidence and deterministic decision; not a licence, admission or authorisation) and Layer 3 Independent operational schemes that may adopt the protocol — with BanzAI transversal to all three, the primary human interface, neither a fourth layer nor an authority; technical certification ≠ scheme admission ≠ regulatory authorisation, no determination propagates automatically, and BANZA moves no funds](../../../website/public/diagrams/protocol/banza-protocol-architecture-overview-v1.svg)

### BanzAI is transversal, not a layer

BanzAI crosses the three layers as the primary human interface: it guides, consults the protocol's sources, invokes the deterministic engines and explains the results with their sources cited. It is where a person works with the protocol, from the rules to validation.

Its position gives it no authority. The rule is constant across the whole architecture: **BanzAI guides, the deterministic engines verify, the evidence proves and the competent authority decides.** The explanation is never the decision.

BanzAI is therefore neither a fourth layer nor an authority: it does not define rules, does not decide conformance, does not certify, does not admit, does not authorise and does not move funds. Nor is it indispensable. The protocol works without it — conformance and interoperability are verifiable directly through the public interfaces, and an automated consumer can obtain the artifacts and reproduce the evaluation without going through the human interface ([§12 BanzAI — Protocol Agent](#12-banzai-protocol-agent)).

### The protocol's planes

Within Layer 1, the protocol exists as three planes of public artifacts — Normative, Verification and Trust. None of them processes payments; together they define correct behaviour, allow it to be verified, and sustain trust between independent implementations.

| Plane | Artifacts | Responsibility |
|---|---|---|
| **Normative** | Specification, ADRs, RFCs, contracts, schemas, invariants | Define correct behaviour — what a conformant implementation has to do. |
| **Verification** | Conformance vectors, conformance runner, reproducible evidence | Test implementations against the specification and produce evidence that third parties can reproduce. |
| **Trust** | Trust Root, Key Manifest, delegated keys, Revocation List (BRL), Technical Registry | Anchor, publish and revoke trust material cryptographically, with no human authority in the path. |
| **Execution** *(outside the protocol)* | Operators' implementations, on their own infrastructures | Process payments, hold balances and meet legal obligations — external to the protocol, under its rules. |

Execution is not a fourth plane of the protocol. Processing payments, holding balances and meeting legal obligations belongs to the operators, on their own infrastructures — under the protocol's rules, but outside it. It is this separation that keeps the protocol neutral: it defines correct behaviour without ever executing it.

The common surfaces — Technical Registry, signed metadata, Revocation List, manifests and conformance evidence — publish the state of these artifacts in machine format, so that any party may verify it without trusting presentational text. The Technical Registry is a public index of metadata and evidence: being in it is not a licence, an admission or an authorisation.

### Local execution, no central server

The protocol does not reside on a central server. Each operator implements it on its own infrastructure, and two operators interoperate because they respect the same public rules — not because they connect to a common BANZA infrastructure. Interoperability arises from common rules and verifiable conformance, not from a shared central point.

![Local execution model — two independent operators (Operator A and Operator B) implement the protocol on their own infrastructure and interoperate because they respect the same public BANZA rules, not because they connect to a central server; the protocol is the set of common rules, not a shared infrastructure, and each operator produces its own conformance evidence](../../../website/public/diagrams/protocol/banza-local-execution-model-v1.svg)

The path from an implementation to interoperation is a sequence of verifiable artifacts, with no human approval at any step:

1. **The specification defines behaviour** — public, versioned contracts, invariants and conformance criteria.
2. **The operator implements locally**, on its own infrastructure and technology, under its own authorisations.
3. **The tests verify the behaviour** against the official conformance vectors.
4. **The evidence is published**, reproducible by third parties — a technical result, not a legal authorisation.
5. **The operator self-publishes signed metadata** — manifest, version, capabilities, endpoints and evidence, anchored in the protocol's trust chain. The entry then appears in the Technical Registry through public indexing rules, not by anyone's decision.
6. **Interoperation is evaluated at each routing**, through Open Trust Evaluation — deterministic verifications over metadata, evidence, signatures and revocation, which fail closed in the face of any inconsistency ([§10 Federation](#10-federation)).

At no step is there an entity that decides who gets in: what changes from step to step is the available evidence, not an evaluator's will.

The figure below follows this path end to end — from the person or the automated consumer through to interoperation — and shows where each responsibility begins and ends. It is a flow of architecture, validation and evidence; it is not a flow of money, which never crosses the protocol.

![BANZA architectural flow end to end — a person works through BanzAI, the primary and optional human interface, which guides and explains but does not decide, while an automated consumer reaches the same public interfaces directly without going through BanzAI; the operator implements the protocol on its own infrastructure and self-publishes the public artifacts (discovery, manifest, key manifest, endpoints); the deterministic engines verify those artifacts and produce reproducible evidence and receipts; Layer 2 certifies the implementation from that evidence and the record enters the Technical Registry; the independent Layer 3 operational schemes may then adopt conformant implementations. The authority rule runs through the whole flow: BanzAI guides, the engines verify, the evidence proves and the competent authority decides. BANZA moves no funds — this is a flow of validation and evidence, not of money](../../../website/public/diagrams/protocol/banza-architectural-flow-v1.svg)

### Normative core: financial correctness

The Normative plane of Layer 1 is where *financial correctness* ([§3 Protocol Structural Properties](#3-protocol-structural-properties)) stops being a property and becomes structure. It fixes correct financial behaviour as invariants that any conformant implementation has to satisfy:

- monetary values in integer units, without floating point;
- a double-entry ledger, immutable and atomic;
- the settlement identity — the gross amount is the sum of the net and the fee, without creating or destroying money;
- balances derived from the ledger and never negative;
- idempotent operations, safe under repetition;
- complete traceability of every operation.

The protocol organises its invariants into families — those of financial correctness and the remainder, of trust, identity and federation — each with its own scope:

| Family | Scope |
|---|---|
| `INV-LEDGER-*` | Double entry, immutability, integer arithmetic, atomicity |
| `INV-WALLET-*` | Consistent balance, no negatives |
| `INV-STL-*` | Settlement identity (gross = net + fee), no creation of money |
| `INV-IDEM-*` | Idempotency key scope, replay safety |
| `INV-TRACE-*` | Completeness of traceability |
| `INV-QR-*` · `INV-IDENT-*` | QR lifecycle and unique resolution; identifier uniqueness |
| `INV-OTE-*` · `INV-FEDEVAL-*` | Open Trust Evaluation and routing trust |
| `INV-ROOT-*` | Trust Root, key manifest and validation of production keys |

Not all financial requirements are universal: some apply only from a specific profile or capability onwards. The complete enumeration of invariants, reason codes and monetary representation is fixed in the public contracts, and how an implementation is evaluated against them is the subject of [§7 Conformance and Certification](#7-conformance-and-certification).

### Authority boundaries

The architecture prevents a determination produced within one responsibility from automatically acquiring meaning within another. Demonstrating conformance is not obtaining technical certification for an implementation: the evidence is not the certificate (ADR-032). And **technical certification ≠ scheme admission ≠ regulatory authorisation** (ADR-005). Each boundary requires its own determination, and passing one does not grant the next.

The boundary between the protocol's environment and the operator's environment is a limit of responsibility:

- **The protocol's environment** publishes specification, registry, revocation, manifests and evidence. It does not touch money, does not store customer data and takes part in no transaction — compromising it moves no money, because there is no value in it to move.
- **The operator's environment** processes payments, maintains accounts and balances, stores customer data and meets KYC/KYB, AML/CFT and the remaining obligations, under its own licences. The protocol defines how that environment must behave in order to be conformant; it does not operate it, does not supervise it and does not answer for it.
- **Conformance evidence** attests verifiable technical behaviour, within a given scope and at a given moment. It is neither a licence nor a regulatory approval, and it transfers none of the operator's responsibility to the protocol. Authorisation, where required, comes from the competent regulator.

The separation extends to infrastructure and to keys: no layer acquires authority over another by sharing infrastructure, and no key exercises power beyond the scope the Trust Root explicitly delegates to it. The detail of the trust model is in [§6 Trust](#6-trust).

### Where to Continue

This chapter showed how the properties become structure: three separated institutional layers; three planes of protocol artifacts, plus the execution that is external to it; local execution with no central server; and authority boundaries that do not propagate. How protocol state is held verifiably — without the protocol holding financial value — is the subject of [§5 Protocol State](#5-protocol-state); how an implementation declares and demonstrates the conformance profile it satisfies is in [§7 Conformance and Certification](#7-conformance-and-certification).

---

## 5. Protocol State

The protocol does not merely define rules: it maintains a set of durable facts that make it inspectable and reproducible by third parties. We call that set **protocol state** — public artifacts, mostly signed, whose *semantics* are defined by the protocol, independently of the technology that stores them.

One boundary governs the whole chapter: **protocol state is state of the protocol, not financial value.** It is not a payments ledger, a wallet, a banking core or an operator database. The double-entry ledger, balances and settlement are each operator's responsibility, in its own environment; the protocol holds the *conformance evidence of a bounded implementation* — never its financial data.

This chapter describes the semantics of that state: what it contains, where its authority comes from, what is observed and what is current, what is derived and what is persisted, what is historical. The reference implementation's database choice is treated at the end, as what it is — an implementation decision.

### What constitutes protocol state

Protocol state divides into categories of distinct natures. None of them holds value: all of them hold facts, references and verifiable proofs.

| Category | What it contains |
|---|---|
| **Signed trust artifacts** | Trust root and key manifest (public keys and fingerprints only), revocation list. Never private key material ([§6](#6-trust)). |
| **Technical Registry** | Operators' self-publications and pointers to their public metadata. Empty in the current phase. |
| **Conformance evidence** | Report hashes and result markers, never the underlying financial data. A technical result, not a certification ([§7](#7-conformance-and-certification)). |
| **Agent index** | The index of the **public** reference text that BanzAI consults in order to explain the protocol — questions, answers and source identifiers, never secrets or user identifiers ([§12](#12-banzai-protocol-agent)). |
| **Audit log** | An append-only record of the governed writes. |
| **State markers** | Protocol phase flags. |
| **Validation receipts** | Append-only, content-addressed receipts of each validation journey; the authoritative artifact is the canonical form the response returns, not the stored row. |

Most of these categories are **verifiable without trusting the storage**: by recomputing hashes and checking signatures anchored to the root, a third party confirms them with no account and no privileged endpoint. That is why the technology holding them is invisible to whoever verifies.

### Source, derived state and persisted state

Not all state has the same authority. The decisive distinction is between the **source** of a fact and its stored *representation*.

**Authority comes from the rules, the canonical sources, the evidence and the applicable process — never from persistence.** A value does not become true by being stored in a database. Storing is convenience and performance; the truth of a fact is always recheckable from its source.

Hence three natures of state:

- **Canonical source** — the public, signed artifact (or the contract that defines it). This is the authority.
- **Derived state** — what is deterministically reconstructed from the sources, the evidence and the engines. A conformance verdict reconstructed this way gains no authority by being materialised; it continues to be worth whatever the sources say.
- **Persisted state** — the durable materialisation of one or the other, in order to serve and to audit. A cache, a snapshot or an index is persisted state: it speeds up reading, it does not decide truth.

The figure below follows this path: from a canonical source, through observation and deterministic evaluation, to a result with evidence, then materialised and published on a surface. It distinguishes what is source, what is derived, what is merely persisted and what is published.

![BANZA protocol state model — from a canonical source (signed public artifacts, contracts) through observation and deterministic evaluation to a result with reproducible evidence, then materialised (persistence) and published on a public surface; the legend distinguishes three natures — source (authority), derived state (recomputable) and persisted state (materialisation, without authority) — and the public surface where state is published; persistence creates no authority and the protocol holds no financial value](../../../website/public/diagrams/protocol/banza-estado-protocolar-modelo-v1.svg)

### Identity, scope and version of state

A state fact does not float free: it belongs to a subject and to a context.

**The subject of a technical state is a bounded implementation, not an entity.** A conformance result describes a build/implementation within a profile and environment, not "the operator". Representing `operator = certified` would collapse that distinction; technical state applies to what was evaluated ([§8](#8-operators)).

Each state fact is therefore bound to the **protocol version, the profile, the environment, the implementation and the evidence** that produced it. When the evaluated content changes — a new artifact hash — the subject of the evaluation changes: the earlier state describes the earlier version, not the new one.

And scope does not generalise silently: **no technical state holds beyond the scope in which it was produced.** A result under one profile is not a result under another; an evaluation in one environment does not speak for another.

### Persistence, history and revocation

Holding state over time requires distinguishing words that are not synonyms:

- **Immutable** — does not change once written (for example, the canonical form of a receipt).
- **Append-only** — never rewritten or deleted; only added to. This is the case for the audit log and the validation receipts.
- **Versioned** — successive versions coexist, each identifiable.
- **Superseded** — one version becomes current without deleting the previous one.
- **Revoked** — future trust is withdrawn.

Certain historical facts must not be silently rewritten: that is what append-only guarantees — in the protocol, at the level of semantics, and in the reference implementation, at the level of storage itself. It is neither an immutable ledger nor event sourcing: it is the simpler rule that governed history is not rewritten.

**Revoking is not deleting.** Withdrawing future trust from a key or an artifact does not eliminate past evidence: the history remains, and the new state only invalidates what follows ([§6](#6-trust)).

### Observed state and current state

This is the chapter's most important temporal distinction, and the easiest to lose.

A result or a receipt describes **state observed at an instant `t`** — what was verified when the sources had a given content. It is not, by itself, the **current state**. Sources change: an artifact is republished and its hash changes, metadata is updated, a key expires, a revocation appears.

Hence **persistence is not currency**. A stored state may become out of date without ceasing to be a faithful record of what was observed; its validity depends on the freshness of the canonical sources.

When the sources change, a **new evaluation** is necessary. The figure below shows that cycle: the artifacts change, a new observation and a re-evaluation are produced, and from them a new result — while the previous result is preserved, not deleted.

![Temporal cycle of protocol state — a result is state observed at the instant the sources were verified; when the artifacts change (new hash, new metadata, key expiry or revocation), a new observation and a re-evaluation produce a new result, while the previous result is preserved, not deleted; observed state is not the same as current state, and validity depends on the freshness of the canonical sources](../../../website/public/diagrams/protocol/banza-estado-protocolar-temporalidade-v1.svg)

### The boundary: state, not value

The boundary announced at the opening is the invariant that keeps the protocol neutral. **Protocol state holds facts and proofs, never value.**

Never — not in the model, not in storage, not in backups: balances, funds or wallets; real payment transactions, settlement, bank accounts, IBANs or cards; KYC/AML or personal data of users, customers or merchants; private keys, seed phrases or custody secrets. Those data belong — where they exist — to the operator's regulated environment, never to the protocol's neutral state.

**BANZA neither holds nor moves money**: it is not a banking core, it does not execute settlement and its database is not a ledger. The financial invariants (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`) remain rules that the protocol **defines and verifies** for the operators — the protocol measures ledgers; it does not keep one (ADR-013).

### Technical Registry

The Technical Registry is a **public surface of metadata and evidence** — a projection of part of the state, not the protocol's whole state, and still less a register of authorised participants.

Two consequences, which the conformance chapter develops ([§7](#7-conformance-and-certification)):

- **Appearing in the registry is not authorisation.** It is the verifiable publication of an implementation's metadata and evidence, not a licence, a scheme admission or a regulatory authorisation.
- **The absence of an entry is not prohibition.** The registry projects what has been published and verified; what is not listed is not thereby forbidden.

### Reference implementation

Nothing in the foregoing depends on a database technology. **Persisting protocol state is an implementation decision, not a protocol requirement.**

The BANZA reference implementation persists this state in a dedicated **PostgreSQL** database (with `pgvector` for the agent index), internal to the protocol's infrastructure, and enforces the data boundary there with a single schema, least-privilege roles and append-only constraints, verified by `make postgres-data-boundary-check`. This is the mechanism chosen for the protocol's *service* — it is not a condition of conformance.

**No BANZA implementation is required to use PostgreSQL.** An alternative implementation may use another persistence technology provided it preserves the same state semantics, the same observable contracts and the same boundary. The protocol is defined by its verifiable surfaces and contracts, not by how data are stored internally: for the same reason, verifying a state fact does not require access to the database.

### Where to Continue

This chapter defined protocol state by its semantics — categories, authority, identity, temporality and boundary — and put the database in its place: implementation, not protocol. How the trust artifacts that make up much of this state are anchored, published and revoked is the subject of [§6 Trust](#6-trust); how an implementation demonstrates the conformance whose evidence is held here is in [§7 Conformance and Certification](#7-conformance-and-certification).

---

## 6. Trust

### What trusting BANZA means

In BANZA, trust is a bounded, verifiable technical property — not a general approval of an entity. To say that something is trustworthy means that one can verify, with public material and without asking anyone's permission, where it came from, who signed it with a recognised key, whether it was altered, whether it is still valid, and whether trust in it has since been withdrawn. None of this asserts that the entity behind it is solvent, is licensed or may operate: those are questions of another domain.

The right question is therefore never simply "do I trust it?", but four narrower lenses: **trust in what, on what basis, valid when and valid for what.** The chapter keeps apart claims that are easily confused — that an artifact came from the expected origin, that a signature was produced by an authorised key, that this key was neither revoked nor expired at the relevant instant, that a result was computed over given inputs — from claims the protocol never makes: that an implementation satisfies a profile, that an entity may operate financially, that an authority has authorised it. The former are verifiable within the protocol; the latter belong to conformance ([§7](#7-conformance-and-certification)), to the operational scheme and to regulation.

BANZA does not eliminate trust. It transforms a set of claims that previously depended on someone's word — "this partner is reliable" — into properties that any party recomputes deterministically. What changes is not the absence of trust, but the fact that it now rests on a verifiable chain of signatures and rules, rather than on a physical infrastructure or on any particular participant.

### Each mechanism answers a different question

The model's strength lies in keeping apart questions that look like one. Each trust mechanism answers exactly one, and no answer converts automatically into the others:

- **Origin** — where was this artifact published? (the domain the operator controls)
- **Signature** — who signed it, with a key authorised for that domain?
- **Integrity** — has the content changed since it was signed?
- **Freshness** — is it still valid, or has it expired?
- **Revocation** — has trust in this material since been withdrawn?

These five questions are cryptographic and local: any party answers them offline, with the public artifacts, and two independent evaluators always reach the same result. Bringing them together into a single decision is the role of **Open Trust Evaluation**, which establishes trust only when all of them verify and, in any other case, fails closed — the absence, expiry or inconsistency of material never produces assumed trust. At the protocol level, no human entity decides the outcome of this evaluation: it is deterministic and executable by any party. The ten concrete verifications and their application to routing are in [§8 Operators](#open-trust-evaluation) (ADR-025); what matters here is the principle.

Two other questions are deliberately outside this set, because they are of another nature:

- **Conformance** — does this implementation satisfy the applicable rules? It is a reproducible measurement, treated in [§7](#7-conformance-and-certification).
- **Authorisation** — may this entity provide financial services? It is a decision of the competent authorities, entirely outside the protocol.

![Each trust mechanism answers a distinct question — origin, signature, integrity, freshness and revocation are verifiable within the protocol; conformance and authorisation belong to other domains and do not follow from a valid signature](../../../website/public/diagrams/protocol/banza-trust-questions-v1.svg)

Keeping these seven questions distinct is what prevents the commonest error: reading a valid signature as though it were a licence.

### Origin and technical identity

Each implementation publishes its artifacts at an **origin that the operator controls** — its own domain, at well-known paths. The origin answers a modest but essential question: where should I fetch this implementation's metadata, keys and evidence? Nobody issues that material on the operator's behalf; the operator publishes and signs it (ADR-031). Fetching that material securely is treated as a mechanism of its own; what matters here is only that the relationship with the origin — an artifact's technical provenance — is verifiable.

Controlling an origin demonstrates a technical relationship with that domain, and nothing more. It does not mean that the implementation is conformant, nor that it is certified, nor that the entity is authorised. The protocol verifies technical control of the origin; it does not verify legal identity and does not perform KYB. Where there is no mechanism, the chapter does not insinuate that there is one.

Technical trust always attaches to the **implementation and its artifacts**, not to the entity in the abstract. An operator may have several implementations, each with its own metadata, its own keys and its own evidence. "Technical identity" is that set of identifiers, origin, keys and artifacts which allows an implementation to be distinguished and verified — and it is not to be confused with the legal identity of the entity that operates it.

The Technical Registry may help to **locate** an implementation, its origin and its metadata, but it is a discovery index, not a root of trust: appearing in the registry creates no cryptographic trust, and verification may proceed from the origin and the published artifacts without depending on a registry entry.

### The Trust Root and the delegated keys

At the top of the chain is the **Trust Root**: the anchor that each conformant implementation pins and uses in order to verify all subsequent material. The root is generated offline, held in threshold-split custody — no single person reconstructs it — and never touches the operational path. Its scope is deliberately narrow: **it signs only the Key Manifest and the set of authorities that succeeds it.** It does not sign operator metadata, revocations or evidence, and — the point that governs the whole chapter — **it does not authorise operators, does not issue a licence and does not authorise payments.** The Trust Root is not a certificate authority over operators; it is the verifiable origin of a chain of signatures (ADR-025).

The root is not a single key held by someone. It is **three independent signing authorities**, and any authorised root action requires **two signatures from two of them**. A single signature never authorises. That is the practical meaning of a "distributed anchor": no party acts alone, the compromise of one key is not enough, and the unavailability of one of the three does not block the protocol.

The threshold is cryptographic and logical. How many devices exist, where they are held and how the material is transported are custody controls, which may change without redefining the protocol's authority.

What is pinned in the verifiers is not a key: it is the **genesis set** of authorities. From it, the root advances as a lineage — each set of authorities is authorised by the threshold of the predecessor set, which names it by digest. The distinction is not formal. A set signed by its own keys proves only that two keys named within it agree with one another, something anyone can produce over keys generated a moment ago; what has to be proved is that the **already trusted** set authorised this one.

Continuity follows from this. If an authority is lost, compromised or refuses to cooperate, the remaining two authorise a successor set that replaces it — without its participation, because requiring it would make the path three-of-three and would give it a veto. If fewer than the threshold remain, canonical continuity is blocked and so it stays: there is no emergency master key and no recovery path for a single party. Such a door would be a one-person path to the protocol's highest authority — exactly what the threshold exists to prevent — and would be more dangerous than the loss it would protect against.

From that root derive **delegated signing keys**, of short validity and limited scope, each restricted to a single domain:

- **protocol metadata signing**,
- **revocation**,
- **conformance evidence**.

Separation by domain is a trust principle, not a detail: a key authorised for one domain **gains no authority in another** — each key's scope is only what the protocol explicitly delegates to it. The compromise of a key is therefore contained: it affects one domain, not the whole chain, and the root, offline, remains intact so as to issue a new manifest with renewed keys. The concrete key identifiers follow an implementation naming convention; what is normative is the separation of domains and the limited validity, not the format of the name.

![The BANZA trust chain — the offline Trust Root signs only the Key Manifest; the manifest authorises delegated keys by domain; the delegated keys sign metadata, revocation and evidence; operators verify everything offline. The root never authorises operators.](../../../website/public/diagrams/protocol/banza-trust-v1.svg)

All this material rests on a single, documented and auditable signing mechanism, chosen to be replaceable. The protocol is designed to be able to migrate algorithm through governance — a new root ceremony, a new manifest, a period of coexistence — and not to depend indefinitely on a single cryptographic choice.

### The Key Manifest

The **Key Manifest** is the public document that the Trust Root signs in order to declare which delegated keys are active, each with its domain, its validity and its status. It is signed by two distinct authorities of the active set, and it is from it that any party decides whether a delegated key is recognised. It is deliberately separate from the set of authorities: delegated keys rotate frequently and authorities rarely, and joining the two in a single document would require convening the root threshold for every routine delegation. A threshold that has to be convened constantly ends up being circumvented, and the security property would erode through operational pressure rather than through attack. Its canonical location is a well-known path on `banza.network`; the source of truth is the signed manifest itself, not any library that copies it.

An implementation pins the manifest at release time and may keep it cached for offline verification. But the cache is convenience, not authority: an expired manifest ceases to be acceptable, and the implementation then rejects the trust material that depended on it until the manifest is renewed. Trusting a manifest is trusting the root's signature over it — never its mere presence on a server.

### The BRL — BANZA Revocation List

Not all trust lasts forever, and withdrawing it has to be as verifiable as granting it. The **BANZA Revocation List** (BRL) is the signed list of trust material that has ceased to be acceptable on the network. It is signed by the delegated key of the revocation domain — not by the root — and published at a canonical path, in short cycles, so that the withdrawal of trust propagates across the whole network without notifying each peer individually.

Revoking is a change in the trust status applicable to given material — it is not deleting, it is not sanctioning and it is not a judgement about the legality of anyone's activity. It withdraws the future cryptographic acceptability of a key or an artifact; **it does not eliminate past evidence**, which remains verifiable, and it does not affect authorisations, which live outside the protocol. A BRL entry always requires an objective ground, published with it: there is no revocation by discretionary judgement.

> **Three distinct "revocations", which share the informal name but not the mechanism:**
> 1. **Key revocation** — a delegated or operator key enters the BRL; metadata signed by it ceases to verify. A trust mechanism.
> 2. **Revocation of operator material** — an operator's self-published material enters the BRL; Open Trust Evaluation then fails closed for that operator. This is not "revocation of the operator" as an entity — it is the withdrawal of acceptability from its material. A trust mechanism.
> 3. **Suspension or revocation of a certification record** — a Layer 2 record transitions to `SUSPENDED` or `REVOKED` in the closed certification state machine (ADR-032). A certification mechanism, treated in [§7](#7-conformance-and-certification).
>
> None of these is a regulatory sanction: authorisation and sanctions belong to the competent authorities, outside the protocol.

### Freshness, expiry and trust over time

A valid signature answers "who signed this?" — not "should I trust this now?". The two questions separate over time. A key expires; it may be replaced; it may be revoked. An artifact correctly signed in the past may today be out of date, incompatible or revoked. Trust therefore also depends on **freshness**: on the material's temporal validity and its current status, and not only on the signature. Material signed by an expired, replaced or revoked key ceases to verify until it is republished under a valid key.

From this follows the lesson of temporality that [§5](#5-protocol-state) already established, now applied to trust: **a trust result represents the material observed at an instant.** When keys change, when revocation changes, when validity expires, the result of an earlier instant does not silently remain valid — it must be re-evaluated. Conformance evidence, in particular, is not revoked by anyone as it ages: it simply ceases to satisfy the freshness policy, and the evaluation fails closed from that moment on.

### What trust does not prove

It is worth stating the boundaries directly, because this is where language slips. A valid trust chain allows origin, key, signature, integrity and revocation status to be verified. By itself it produces none of the claims in the right-hand column:

| A valid trust chain **establishes** | A valid trust chain does **not** establish |
|---|---|
| That an artifact came from the expected origin and was not altered | That its content is correct or conformant in every sense |
| That it was signed by a recognised and still valid key | That the implementation satisfies a conformance profile ([§7](#7-conformance-and-certification)) |
| That trust in the material has not been withdrawn | That the entity is admitted to an operational scheme |
| A technical basis for a subsequent decision | That an authority has authorised it to operate |

Three planes coexist and none replaces another: **technical evidence** says what an implementation does; **cryptographic trust** says that this claim is authentic and current; **legal authorisation** says that the entity may carry on the activity. The protocol covers the first two and never the third. In particular, a valid signature is not a certification: Conformance and Interoperability Certification (Layer 2) is a process of its own, per implementation and evidence-based ([§7](#7-conformance-and-certification)). It is distinct both from trust evaluation and from admission to an operational scheme (Layer 3), which the scheme decides under its own policy, and from regulatory authorisation, which belongs to the competent authorities. These boundaries do not propagate from one to another (ADR-005).

### Where to continue

- [§7 Conformance and Certification](#7-conformance-and-certification) — how an implementation demonstrates that it satisfies the rules, and what Layer 2 Certification adds to trust.
- [§8 Operators](#open-trust-evaluation) — the ten verifications of Open Trust Evaluation and the distinction between entity, operator and implementation.
- [§10 Federation](#10-federation) — how verifiable trust sustains interoperability between operators.
- [§11 Governance](#11-governance) — the institutional architecture that governs the Trust Root: its split custody, recovery and continuity, detailed in [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

---
