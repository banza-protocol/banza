# BANZA

**An Open Protocol for Financial Interoperability.**

BANZA is a public, versioned specification that lets independent financial implementations interoperate
without each pair of participants negotiating its own contracts, identity model, trust rules and test
procedure. The specification is the shared element — not a central implementation, and not a service
operated by the protocol maintainer.

![Protocol version](https://img.shields.io/badge/protocol-v1.0.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-lightgrey)

> This README is **informative**. Normative requirements are defined by the versioned artifacts
> identified in the [Normative Manifest](contracts/production/normative-manifest.json).

---

## Current status

| | |
|---|---|
| Protocol version | **1.0.0** |
| Stage | **Pre-production** |
| Normative surface | **Complete for clean-room implementation testing** |
| Independent implementation | **Not yet demonstrated** |
| Production operators | 0 |
| Active technical certifications | 0 |
| Real-money operation | Disabled |

The published surface is sufficient to implement BANZA without reading the reference implementation.
Whether an external team can in fact do so has not yet been demonstrated experimentally — that is the
next validation, not a claim this repository makes today.

## Why BANZA exists

Financial operators rarely function in isolation. To move value or exchange messages, two
implementations must agree on formats, identity, keys, discovery, failure semantics and how correctness
is tested.

Those elements are usually settled privately — in a bilateral integration, or in the rulebook of a
shared infrastructure. Both work. What neither reliably produces is a *public, versioned* definition
that a third party can read, implement and verify against without being party to the arrangement.

BANZA makes that definition public within the scope it defines. It does not attempt to replace
switches, clearing, settlement infrastructure, payment schemes or central banks. Those continue to
exist, and an implementation that adopts BANZA remains subject to their rules.

## The core idea

```
                    Public BANZA specification
                    (contracts · profiles · trust · semantics)
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      Implementation A  Implementation B  Implementation C
        (independent)    (independent)     (independent)
```

The shared element is the specification. Nothing above requires a common runtime, a common vendor, or a
BANZA-operated service in the path between two implementations.

## Architecture

BANZA is organised in three institutional layers, separated by responsibility, infrastructure and keys.

**Layer 1 — Open protocol.** Specifications, contracts, profiles and common mechanisms for discovery,
identity, trust, revocation and federation, together with the execution semantics interoperability
requires. This repository.

**Layer 2 — Conformance and interoperability certification.** Conformance evaluation and, where
applicable, technical certification of implementations against public profiles and versions, based on
deterministic engines and verifiable evidence. It evaluates an *implementation*, never an entity.

**Layer 3 — Independent operational schemes.** Infrastructures, networks and schemes that may adopt
BANZA. They remain subject to their own legal, commercial and regulatory rules, and remain
**operationally independent from BANZA**.

The L0–L4 profiles are distinct from these layers.

## Five architectural invariants

1. **Open specification** — the applicable rules, contracts and profiles are public and versioned.
2. **Implementation independence** — no particular implementation constitutes the protocol; the
   reference implementation realises BANZA but does not define it.
3. **Independent verification** — published artifacts must allow a party to evaluate the applicable
   technical conditions without depending on a private decision of the evaluated operator or of the
   protocol maintainer.
4. **Operational independence** — BANZA does not require a central infrastructure to carry messages or
   funds.
5. **Separation of decisions** — conformance evaluation, technical certification, scheme admission,
   operational agreements and regulatory authorisation belong to distinct processes.

## What BANZA defines

The normative surface identified by the manifest contains **154 artifacts**, of which **93 must be
satisfied by an implementation**. Concretely, BANZA defines:

| | |
|---|---|
| **Protocol identity and versioning** | Version in force, wire compatibility, breaking-change policy — [`protocol-version.json`](contracts/production/protocol-version.json) |
| **Canonical representation** | `BCJ/1` — the exact bytes that are signed and hashed, language-independent — [`spec/canonicalization.md`](spec/canonicalization.md) |
| **Signing and hashing** | Ed25519 over `BCJ/1` bytes, base64url without padding; SHA-256 digests with a per-artifact exclusion table |
| **Contracts and schemas** | 21 contracts, 24 domain schemas, 4 operator-implemented API surfaces — [`contracts/`](contracts/) |
| **Discovery** | A canonical origin controlled by the operator, with artifacts at fixed paths under `/.well-known/banza/` |
| **Implementation identity** | Operator and implementation are distinct; a result binds to the implementation evaluated, not to the entity |
| **Keys and delegation** | Key manifests, domain-separated delegated signing keys, and the trust chain a verifier walks |
| **Revocation** | Revocation entries and the BANZA Revocation List, with freshness rules and fail-closed evaluation |
| **Trust evaluation** | Thirteen published, conjunctive checks producing `ROUTING_ALLOWED` or `FAIL_CLOSED` — [`federation-trust.json`](contracts/federation/federation-trust.json) |
| **Conformance profiles** | Five cumulative levels, L0–L4 |
| **Payment contracts** | Payment intents and sessions, transfers, collections, QR payloads, settlements, wallet accounts, fees, proofs, events and webhooks |
| **Reason-code semantics** | Five separate vocabularies, published with their meanings, a reserved extension namespace, and defined handling of unknown codes — [`spec/reason-codes.md`](spec/reason-codes.md) |
| **Idempotency semantics** | Key scope, request identity, retry and conflict behaviour, retention, concurrency — [`spec/idempotency.md`](spec/idempotency.md) |
| **Federation and routing conditions** | What must hold before one implementation routes to another, and the contract surface it routes over — [`spec/federation/`](spec/federation/) |
| **Evidence and receipts** | Evidence bundles, journey and operation receipts, content digests binding a result to its inputs |
| **Semantic equivalence** | When two results from different implementations count as the same result, and what may differ between them |
| **Invariants** | 74 published financial and federation invariants — [`contracts/invariants.json`](contracts/invariants.json) |
| **Conformance vectors** | Public vectors for canonicalization, trust signing, reason codes, idempotency and every payment domain — [`conformance/vectors/`](conformance/vectors/) |

## What BANZA does not define

BANZA does not determine, by itself:

- regulatory authorisation, or any licence to provide financial services;
- commercial agreements between participants;
- admission to an operational scheme;
- internal ledger implementation, liquidity management, clearing policy or operational settlement
  policy;
- an implementation's internal risk controls;
- technology stack, programming language, database or hosting.

An implementation satisfies BANZA by exhibiting the required *behaviour*. How it does so is its own
decision.

## The normative surface

The Whitepaper is descriptive. The **normative** requirements live in versioned public artifacts, and
the Normative Manifest identifies exactly which ones.

```
README                     orientation — this document
  ↓
Whitepaper                 model and architecture
  ↓
Normative Manifest         which artifacts are requirements
  ↓
Specifications · Contracts · Schemas · Registries · Vectors
```

### The Normative Manifest

[`contracts/production/normative-manifest.json`](contracts/production/normative-manifest.json) lists
every published artifact with a SHA-256 digest and two classifications: what kind of artifact it is, and
what an implementer must do with it.

| Tier | Meaning |
|---|---|
| `implementation` | An independent implementation must satisfy this. **This is the reading list.** |
| `conformance` | Material for *demonstrating* conformance; it expresses requirements defined elsewhere |
| `legal` | The legal basis for implementing at all |
| `informative` | Published and stable, but imposes no conformance obligation |

**Being listed does not make an artifact a requirement** — only `tier: implementation` does. The manifest
also states what is *outside* the published surface entirely, including the reference implementation, the
website, the Whitepaper, and the decision records.

### BANZA Canonical JSON (`BCJ/1`)

BANZA does not define signed and hashed inputs through a language-specific JSON serialization. It
defines them through a canonicalization profile that any language can implement.

`BCJ/1` is RFC 8785 (JCS) restricted by a BANZA profile: integers only within a stated range, duplicate
members rejected, unknown members preserved and signed, no Unicode normalisation, member ordering by
UTF-16 code units. Every signature and content digest in the protocol is computed over these bytes.

- Specification: [`spec/canonicalization.md`](spec/canonicalization.md)
- Public vectors: [`conformance/vectors/canonicalization.json`](conformance/vectors/canonicalization.json)

### Execution semantics

Two behaviours matter to any pair of implementations that exchange messages, and both are published:

- **Reason codes** — [`spec/reason-codes.md`](spec/reason-codes.md) and the registry
  [`reason-code-registry.production.json`](contracts/production/reason-code-registry.production.json).
  A status decides an outcome; a reason code explains it. Decisional statuses are closed enums;
  explanatory codes are extensible through a reserved namespace and are never allowed to change a
  verdict.
- **Idempotency** — [`spec/idempotency.md`](spec/idempotency.md). Key scope, what makes two requests the
  same request, retry and conflict behaviour, the retention window and its declaration, and the
  observable behaviour of concurrent requests carrying the same key.

## Conformance profiles

| Level | Name | Adds |
|---|---|---|
| **L0** | Protocol Sandbox | Secure protocol configuration in a test environment; valid manifest; correct monetary representation |
| **L1** | Core Payment Capability | Essential payment and traceability capabilities |
| **L2** | Payment Initiation Capability | Payment initiation by request or dynamic QR code |
| **L3** | Inter-Operator Interoperability | Routing, settlement and reconciliation conditions between operators; requires evidence involving more than one operator |
| **L4** | External Interoperability | Integration with external networks; defined by profile |

The levels are cumulative. L0–L2 can be assessed within a single operator; L3 and L4 require evidence
involving more than one operator and evidence of external integration respectively.

A certification profile is distinct from a level: it fixes a level together with the capabilities,
contracts and endpoints required.

**A conformance level is not a certification, and a certification is not a regulatory authorisation.**
A positive result at a level is evidence that the technical conditions for that level are satisfied — it
is not, in itself, certification, admission or authorisation.

## Discovery and trust

Each implementation publishes its artifacts at a **canonical origin it controls**. Discovery begins at a
fixed path under `/.well-known/banza/`, from which a verifier resolves the operator manifest, the key
manifest and signed protocol metadata.

Trust is evaluated from that published material:

```
Root Authority Set    three authorities, threshold two — a lineage, not a key
    ↓                 genesis pinned; each later set authorised by the one it succeeds
Key Manifest          signed by two distinct authorities of the active set
    ↓
Delegated signing keys      domain-separated, each valid for one purpose
    ↓
Signed protocol metadata · Revocation List
    ↓
Operator-published manifests and conformance evidence
```

The Root is a set of **three independent authorities**, and any authorised Root action requires **two
distinct** ones. A single authority never acts alone.

A verifier pins the **genesis set**, and the lineage carries trust from there: each successor names its
predecessor by digest and is authorised by the threshold of that predecessor. A set signed only by its
own keys authorises nothing — it proves that two keys named in the document agree with each other, which
anyone can produce about keys they generated a moment earlier. Trust on first use is refused.

This is what makes continuity real rather than declared: if one authority is lost, compromised or
obstructive, the surviving two replace it without its participation. Below the threshold, canonical
continuity blocks — there is no emergency master key, no hidden recovery key and no single-signer break
glass, because any of those would be a one-party route to the maximum authority in the protocol.

Evaluation is **fail-closed**: missing, malformed, expired, revoked or incompatible material produces a
refusal, never a default acceptance. A superseded set presented again is a rollback; two different sets
at the same position are a conflict, not a race — the outcome never depends on which arrived first.

The Root is not an operational hub. It signs key material; it does not authorise operators, issue
licences, admit participants or take part in any payment.

Cryptographic distinctness is not institutional independence. Three key identities do not by themselves
prove three independent control domains — that is a **production gate**, evidenced before the first
production ceremony, and it is not a claim this protocol makes today.

Normative definition: [`spec/root-authority-set.md`](spec/root-authority-set.md).

## Operational independence

BANZA does not require payments, funds or protocol messages to transit a central BANZA transaction
service. Two implementations that have evaluated each other's published material exchange directly.

Two planes must be distinguished, and BANZA's position differs between them:

- **Transaction / data plane** — no BANZA infrastructure is involved. This is what operational
  independence means.
- **Trust / governance plane** — trust material is normatively required and is currently published at a
  single canonical origin maintained by the project. Alternative distribution is not specified. This is
  stated rather than omitted: it is a real dependency, it sits outside the message and funds path, and
  it cannot prevent anyone from implementing a published version.

## Conformance

Conformance is established by deterministic evaluation against public contracts and vectors — not by
self-declaration and not by human approval. The same inputs produce the same verdict for any party
running the evaluation, and every refusal names the check that refused it.

Conformance is an important part of BANZA. It is not the whole of it: what conformance evaluates is the
protocol described above.

## Evidence and receipts

A validation produces a result, its reason codes, and a receipt binding that result to the exact inputs
that produced it through content digests. Receipts and reports aggregate into an **evidence bundle** —
an integrity-checked artifact an operator publishes and a third party can re-verify.

`spec/reason-codes.md` §8 defines when two results from different implementations are **semantically
equivalent**, and what may legitimately differ between them. Byte-identical receipts are explicitly not
the criterion.

Independent reproduction by a second *complete* BANZA implementation has not been demonstrated, because
no such implementation exists yet.

## Implementation independence

**The reference implementation implements BANZA; it does not define BANZA.**

The normative surface is published, classified and digest-verified, and the trust plane — canonicalization,
signing, hashing, keys, revocation, trust evaluation and the vectors that validate them — is implementable
from published text alone.

What follows from that, precisely:

- Specification readiness: **ready for clean-room implementation testing**
- Complete independent implementation: **not yet demonstrated**

A demonstrated independent implementation would be evidence of the first claim. It is the next
validation, and this repository does not anticipate its result.

## Getting started for implementers

This is the path for building a BANZA implementation. It starts at the normative surface, and it does
not require the reference implementation.

1. Read the [Normative Manifest](contracts/production/normative-manifest.json) — it identifies the
   artifacts that are requirements.
2. Fix the protocol version (**1.0.0**) and choose a target profile (L0–L4).
3. Read the applicable specifications and contracts for that profile — [`spec/`](spec/),
   [`contracts/`](contracts/).
4. Implement [`BCJ/1`](spec/canonicalization.md) and validate it against
   [its vectors](conformance/vectors/canonicalization.json). Nothing in the trust plane works until this
   is exact.
5. Implement discovery and the trust requirements; validate signature verification against
   [`trust-signing.json`](conformance/vectors/trust-signing.json), which carries real signatures.
6. Implement the [reason-code](spec/reason-codes.md) and [idempotency](spec/idempotency.md) semantics.
7. Implement the capability contracts for your profile.
8. Validate against the public [conformance vectors](conformance/vectors/).
9. Produce and publish the evidence your profile requires at your canonical origin.

Maintainer and transparency tooling in this repository, useful for inspecting the rules and reproducing
results:

```bash
make conformance-check                    # conformance vectors, offline and against a simulator
make crypto-check                         # cryptographic integrity of the trust engine
make normative-surface-integrity-check    # the manifest matches the surface it identifies
make execution-semantics-check            # reason-code registry and idempotency parity
```

An **operator** is not necessarily an implementer. An operator that runs an existing BANZA
implementation does not need to work through this path.

## Reference implementation

This repository contains a reference implementation in [`engines/`](engines/), used to exercise the
specification, generate fixtures and validate that the published rules are implementable.

It carries no normative authority. Its internal technology choices do not define conformance, and
implementing BANZA does not require forking or reusing it. Where the reference implementation and a
specification disagree, the specification governs and the implementation is wrong.

**Operator Zero** is the canonical demonstration implementation, used to exercise the validation journey
end to end. It is a demonstration target with no privileged path, and it is not a production operator.

## BanzAI

BanzAI is the **primary human-operator interface** to BANZA (ADR-036): optional assistance for
navigating the documentation and understanding technical results.

Primary *for humans* is not the same as required. BanzAI is **not part of the normative implementation
path and does not determine conformance.** It is not a normative source, and it does not certify,
approve or license anything.

| BanzAI does | BanzAI does not |
|---|---|
| Explain protocol rules with citations | Define or change rules |
| Explain conformance criteria and gaps | Decide, alter or override a verdict |
| Help navigate specifications, contracts and decisions | Certify, admit, approve or authorise anything |
| Present results produced by the deterministic engines | Hold production keys or move funds |

The protocol functions without it, and automated consumers use the public interfaces directly.
Documentation: [`docs/banzai/`](docs/banzai/).

## Security

The security model rests on published, verifiable material rather than on trusted intermediaries:

- signed artifacts with domain-separated delegated keys;
- revocation with freshness rules;
- fail-closed validation — an evaluation that cannot complete refuses;
- a canonicalization that rejects ambiguity (non-integer numbers, out-of-range integers, duplicate
  members) rather than resolving it silently;
- hardened remote fetching for endpoint-originated validation: HTTPS only, host pinning, no redirects,
  blocked private, loopback, link-local and cloud-metadata addresses, bounded responses;
- evidence integrity through content digests that bind a result to its inputs.

No external security audit has been performed. Report vulnerabilities to
[security@banza.network](mailto:security@banza.network) — see [`SECURITY.md`](SECURITY.md) and
[`docs/security/`](docs/security/).

## Repository structure

| Path | Contents |
|---|---|
| [`spec/`](spec/) | Normative specifications — canonicalization, execution semantics, federation, invariants |
| [`contracts/`](contracts/) | Machine-readable contracts, schemas, registries and API surfaces |
| [`conformance/`](conformance/) | Public conformance vectors, suites and fixtures |
| [`decisions/`](decisions/) | Governance record — 39 ADRs and 7 RFCs |
| [`engines/`](engines/) | Reference implementation (Rust) — non-normative |
| [`docs/`](docs/) | Whitepaper, reference material, governance, security and guides |
| [`website/`](website/) | The public protocol website |

Directories not listed here are supporting material. The protocol-only boundary is documented in
[`REPOSITORY_STRUCTURE.md`](docs/governance/REPOSITORY_STRUCTURE.md) and enforced in CI.

## Documentation

| | |
|---|---|
| **Whitepaper** | [PT (canonical)](docs/whitepaper/pdf/banza-whitepaper-v1.0-pt.pdf) · [EN (translation)](docs/whitepaper/pdf/banza-whitepaper-v1.0-en.pdf) |
| **Normative Manifest** | [`contracts/production/normative-manifest.json`](contracts/production/normative-manifest.json) |
| **Canonicalization** | [`spec/canonicalization.md`](spec/canonicalization.md) |
| **Execution semantics** | [reason codes](spec/reason-codes.md) · [idempotency](spec/idempotency.md) |
| **Federation and trust** | [`spec/federation/`](spec/federation/) · [invariants](spec/federation/FEDERATION_INVARIANTS.md) |
| **Validation journey** | [`spec/validation-journey.md`](spec/validation-journey.md) |
| **Contracts** | [`contracts/`](contracts/) · [API surfaces](contracts/openapi/) |
| **Conformance vectors** | [`conformance/vectors/`](conformance/vectors/) |
| **Reference material** | [PT (canonical)](docs/reference/pt/completa.md) · [EN](docs/reference/en/complete.md) |
| **Certification boundary** | [`docs/governance/certification-boundary.md`](docs/governance/certification-boundary.md) |
| **Governance** | [`GOVERNANCE.md`](GOVERNANCE.md) · [`MAINTAINERS.md`](MAINTAINERS.md) · [`docs/governance/`](docs/governance/) |
| **Contributing** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| **BanzAI** | [`docs/banzai/`](docs/banzai/) |

The Portuguese edition of the Whitepaper is the canonical one; the English edition is its official
translation.

## Governance and versioning

The protocol evolves through a public process. **RFCs** ([`decisions/rfc/`](decisions/rfc/)) propose
changes for open comment; accepted decisions are recorded as **ADRs**
([`decisions/adr/`](decisions/adr/)). Anyone may propose a change — see
[`CONTRIBUTING.md`](CONTRIBUTING.md).

The process is public and open to participation. Maintainer responsibilities and how decisions are taken
are defined in [`GOVERNANCE.md`](GOVERNANCE.md); this repository does not claim decentralised governance.

**Origin.** BANZA was created on **01/08/2025** (1 de agosto de 2025) by **BANZAMI — TECNOLOGIA E
SERVIÇOS, LDA.**, its original creator and initial institutional maintainer. That date records the
protocol's creation and initial availability — not a production, certification or authorisation date —
and the creator holds no operational authority over implementations. See [`NOTICE`](NOTICE) and
[`MAINTAINERS.md`](MAINTAINERS.md).

The current protocol version is **BANZA 1.0.0**. Compatibility and breaking-change policy are declared in
[`protocol-version.json`](contracts/production/protocol-version.json). Canonicalization carries its own
identifier (`BCJ/1`) so it can evolve without being confused with the protocol version.

## Current limitations

Stated plainly, and not qualified elsewhere in this document:

- The protocol and the reference implementation are in **pre-production**.
- There are **no production operators** and **no active technical certifications**.
- **Real-money operation is disabled.**
- A **complete independent implementation has not been demonstrated**.
- **Interoperability between two fully independent implementations** has not been demonstrated
  experimentally.
- No **performance or scalability** evidence has been published.
- **External interoperability (L4)** has not been demonstrated experimentally, and its profile content
  is not yet published.
- No **external security audit** has been performed.
- Adoption has not been demonstrated.

## Next validation

The next technical step is an **independent clean-room implementation and interoperability validation**:
an external team implementing BANZA from the published surface alone, and two independent
implementations interoperating.

No date is committed. This is a technical validation plan, not a commercial roadmap, and this repository
makes no claim about integrations that have not been formally decided and documented here.

## Licence and trademarks

Code, contracts and specifications in this repository are licensed under the **Apache License 2.0** —
see [`LICENSE`](LICENSE) (standard, unmodified terms) and [`NOTICE`](NOTICE) (copyright and
attribution). Public documentation is published under **Creative Commons Attribution 4.0 International
(CC BY 4.0)**.

The licensing policy is [`docs/governance/licensing.md`](docs/governance/licensing.md), which states the
terms and their instruments. This README cites that policy; it does not define it.

Nothing in the licensing requires prior authorisation to build an implementation.

The licence does **not** grant trademark rights to the **BANZA**, **BanzAI** or **Banzami** names and
logos. Those are governed separately by [`TRADEMARKS.md`](TRADEMARKS.md), which permits describing a
conformant implementation as an *"Independent implementation of the BANZA protocol"*. The right to
implement the protocol and the right to use the marks are distinct.

BANZA is not a bank, payment service provider, wallet, payment operator or financial service provider.
Any authorisation to operate comes from the competent regulator, never from BANZA.
