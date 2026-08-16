# BANZA

**An open financial interoperability protocol.** Public, versioned rules — contracts, messages,
profiles, invariants and conformance mechanisms — that independent implementations adopt in order to
interoperate and produce evidence any third party can reproduce.

Financial interoperability already exists, through banks, shared settlement infrastructures and common
messaging standards. What is usually missing is a public basis on which that interoperability can be
*demonstrated*: specifications, tests and results that a third party can implement, compare and
reproduce without asking anyone's permission. BANZA is that basis.

BANZA is not a bank, a PSP, a wallet, a payment operator, a central switch, a settlement operator, an
operational scheme, a blockchain or a consensus network. It holds no funds, keeps no customer accounts,
executes no settlement and grants no regulatory authorisation. Operators do those things, on their own
infrastructure, under their own authorisations.

> This README is orientation, not a normative source. Normative authority is the
> [Normative Manifest](contracts/production/normative-manifest.json) and the artifacts it indexes.
> Where this page and a normative artifact diverge, the artifact prevails.

## Current status

| | |
|---|---|
| Protocol version | `1.0.0` |
| Lifecycle | **PRE-PRODUCTION** — not frozen, not released |
| Normative authority | [Normative Manifest](contracts/production/normative-manifest.json) + indexed specs and contracts |
| Independent external implementation | **Not demonstrated** |
| Final external L0 trial target | **Not selected, not frozen** |
| Independent trial | **Not started** |
| Production operators · active certifications | 0 · 0 — the empty registry is the expected state |
| Real-money operation | Disabled |

Merging a change does not release the protocol, and deploying does not freeze it. A release or freeze
is a deliberate decision about one exact candidate — see [GOVERNANCE.md](GOVERNANCE.md).

## BANZA R²S²

Four Fundamental Principles, and only four — the criterion by which design decisions are taken, not a
description of what the protocol does. ASCII form: `R2S2`.

| | |
|---|---|
| **Robust** | correct and deterministic under independent implementation, adversarial input and boundary conditions |
| **Resilient** | contains failures, preserves safe operation where possible and recovers deterministically without weakening the protocol's guarantees |
| **Secure** | critical properties enforced by construction, failing closed when they cannot be established |
| **Simple** | the smallest mechanism sufficient for the required property |

**Safety before availability.** Resilience never permits unsafe continuation: where trust,
authorisation, integrity or correctness cannot be established, refusing is the correct behaviour.

These sit above two other layers that are deliberately distinct — **8 Protocol Structural Properties**
(what the protocol must possess, [Reference §3](docs/reference/pt/BANZA_REFERENCIA.md)) and the **5
Architectural Invariants** below. Principles decide · properties characterise · invariants constrain ·
normative requirements define conformance · evidence supports what may be claimed. `Fail closed` is a
Structural Property, not a fifth principle.

## Core idea

The specification is shared. The implementation and the runtime are not.

Each operator implements the protocol on its own infrastructure. Two operators interoperate because
they respect the same public rules — not because they connect to a common BANZA system. The only
shared surfaces are discovery and trust anchoring, and none of them moves funds.

## Institutional layers

| Layer | Responsibility |
|---|---|
| **Layer 1 — Open protocol** | The public rules: contracts, messages, schemas, invariants, identity, discovery, trust, revocation, conformance and evidence |
| **Layer 2 — Conformance and Interoperability Certification** | Evaluates a bounded implementation against public versioned profiles, by evidence and deterministic decision |
| **Layer 3 — Independent operational schemes** | Schemes that may adopt the protocol in order to operate, under their own framework |

Simultaneous responsibilities, not stages. **Technical certification ≠ scheme admission ≠ regulatory
authorisation**, and none propagates to another. These layers are not the L0–L4 profiles: one axis
divides responsibility between institutions, the other measures one implementation's technical reach.

## Architectural invariants

1. **Open specification** — the applicable rules, contracts and profiles are public and versioned.
2. **Implementation independence** — no particular implementation constitutes the protocol.
3. **Independent verification** — published artifacts allow any party to evaluate the applicable claims.
4. **Operational independence** — no central infrastructure is required to carry messages or funds.
5. **Separation of decisions** — conformance, certification, scheme admission and regulatory authorisation stay distinct.

**The reference implementation implements BANZA; it does not define BANZA.**

## Conformance profiles

Cumulative technical capability demonstrated by one implementation — never a status of the entity.

| Profile | Name | What it adds |
|---|---|---|
| **L0** | Protocol Sandbox | Instantiate the protocol safely: reachable, valid manifest, integer monetary units |
| **L1** | Core Payment Capability | Wallets, transfers, double-entry ledger, idempotency, traceability |
| **L2** | Payment Initiation Capability | Payment requests, dynamic QR, instant execution |
| **L3** | Inter-Operator Interoperability | Routing and settlement between operators, reconciliation, signed metadata |
| **L4** | External Interoperability | Verifiable integration with external infrastructures, **defined by profile** |

L4 is profile-parameterized; no concrete external profile is published, so L4 remains unevaluated.

## Normative surface

The [Normative Manifest](contracts/production/normative-manifest.json) indexes every normative
artifact with its digest and classifies it by tier, so an implementer knows what must be implemented
rather than inferring it. Below it sit [`spec/`](spec/), [`contracts/`](contracts/) and the conformance
vectors in [`conformance/`](conformance/).

No protocol feature exists in prose alone: what is implementable has an artifact in `contracts/` and a
vector in `conformance/`. Where prose and artifact diverge, the artifact prevails.

**Reference** — the descriptive companion that organises and explains that surface:
[Português (canonical)](docs/reference/pt/BANZA_REFERENCIA.md) ·
[English (official translation)](docs/reference/en/BANZA_REFERENCE.md).

## Critical semantics

| | |
|---|---|
| [**BCJ/1**](spec/canonicalization.md) | A restricted RFC 8785/JCS profile: UTF-8, UTF-16 code-unit ordering, integers within ±(2⁵³−1), duplicate members rejected before semantic interpretation, no Unicode normalization, unknown members preserved. Signatures and digests cover the canonical bytes. |
| [**Trust and Root**](spec/root-authority-set.md) | Three authorities, threshold two, distinct signers, pinned genesis with no trust on first use, succession authorised by the predecessor set. Below the threshold there is no unilateral recovery — no emergency key, no override. |
| [**Freshness**](spec/trust-freshness.md) | Monotonic per artifact class. Lower marker rejects; higher valid marker advances; same marker with the same authenticated content is replay; same marker with different content is equivocation and fails closed. Transport does not define trust. |
| [**Reason codes**](spec/reason-codes.md) | One state determines; reason codes explain. A reason code never overrides the verdict. |
| [**Idempotency**](spec/idempotency.md) | Scoped to receiving implementation, authenticated caller, operation and key. Request identity is the BCJ/1 digest: same identity replays, different identity conflicts. |
| **Evidence** | Each result is bound to the inputs that produced it, so a third party can re-run the evaluation and reach an equivalent verdict. |

## Assurance

A green test is evidence only if it demonstrates the claimed property **for the intended reason**. No
layer validates itself, a higher gate cannot compensate for a lower failure, and absence of evidence is
never a pass.

Normal change runs gates `AG-0…AG-9`. `AG-10` is a release/freeze gate, run deliberately for one exact
candidate — never a pull-request requirement. Mechanics live in [`assurance/`](assurance/) and
[`docs/quality/`](docs/quality/).

## BanzAI

BanzAI is the **primary human-operator interface** to BANZA — and it is **optional, transversal and
non-authoritative** (ADR-036). Both halves are the decision: primary human-facing interface is not a
mandatory protocol dependency.

It guides, consults the sources, invokes the deterministic engines and explains what they decide. It
does not define rules, decide conformance, certify, authorise or move funds, it is not required for
machine-to-machine operation, and its unavailability does not block the protocol. See
[`docs/banzai/`](docs/banzai/).

## What BANZA does not define

Custody or movement of funds · customer accounts · settlement and clearing · KYC/KYB and AML/CFT ·
scheme admission · regulatory authorisation · an operator's internal technology, language, database or
runtime · a mandatory SDK.

## What has and has not been demonstrated

| Claim level | Status |
|---|---|
| **Specified** | The normative surface is published, indexed and versioned |
| **Implemented** | A reference implementation exists — read-only, demonstration only, no real money |
| **Internally assured** | Gates `AG-0…AG-9` pass against collected evidence; clean-room material for L0 was derived and internally checked |
| **Independently implemented** | **Not demonstrated** — no external team has built a conformant implementation from the public specifications |
| **Operationally demonstrated** | **Not demonstrated** — no performance, scale, availability or adoption evidence in production |

Internal completeness is not external implementability, and these levels are not skipped silently.

## Where to start

| You are | Start at |
|---|---|
| **Implementer** | [Normative Manifest](contracts/production/normative-manifest.json) → [`docs/IMPLEMENTATION_SURFACE.md`](docs/IMPLEMENTATION_SURFACE.md) → [`spec/`](spec/) and [`contracts/`](contracts/) → [`conformance/`](conformance/) |
| **Reviewer** | [Reference PT](docs/reference/pt/BANZA_REFERENCIA.md) or [EN](docs/reference/en/BANZA_REFERENCE.md) → [`decisions/adr/`](decisions/adr/) → [`assurance/`](assurance/) |
| **Contributor** | [CONTRIBUTING.md](CONTRIBUTING.md) → [GOVERNANCE.md](GOVERNANCE.md) → [`decisions/`](decisions/) |
| **Researcher** | [Whitepaper PT](docs/whitepaper/pdf/banza-whitepaper-v1.0-pt.pdf) · [EN](docs/whitepaper/pdf/banza-whitepaper-v1.0-en.pdf) → [`docs/research/`](docs/research/) |
| **Security** | [SECURITY.md](SECURITY.md) → [`docs/security/`](docs/security/) |

## Commands

```bash
make reference-check
```

```bash
make current-doc-links-check
```

```bash
make assurance-check
```

```bash
make conformance-check
```

```bash
make whitepaper-verify
```

`make help` lists every target with its purpose.

## Licence and trademarks

Code, contracts and specifications are licensed under the **Apache License 2.0**
([LICENSE](LICENSE)); public documentation under **CC BY 4.0**. The open licence grants no rights over
the BANZA, BanzAI or Banzami names and logos — see [TRADEMARKS.md](TRADEMARKS.md) and
[NOTICE](NOTICE). Governance and the people who hold it:
[GOVERNANCE.md](GOVERNANCE.md) · [MAINTAINERS.md](MAINTAINERS.md).
