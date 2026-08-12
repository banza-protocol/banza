# BANZA — M2 Production Protocol Implementation (M2)

> **M2 prepara o protocolo BANZA para produção enquanto protocolo financeiro aberto. M2 é produção do protocolo, não operação financeira do BANZA. M2 não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo financeiro aberto.** Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O BANZA não é operador financeiro, não é PSP, não processa transacções, não liquida valores, não movimenta fundos e não detém fundos. Os serviços financeiros são prestados por operadores independentes que implementam o protocolo, entidades separadas do protocolo.

M2 is the phase in which the BANZA protocol — its governance, contracts, trust model, release process and
operator self-publication path — is implemented **for production as an open protocol**. "Production" here means
production *of the protocol itself*: a governed, versioned, publishable specification against which independent
operators self-publish. It does **not** mean financial operation. No payment is processed, no value is settled,
no fund is moved and no operator is activated by BANZA in M2.

This document is the objective and scope statement for M2. It sits above the state model
([`PROTOCOL_PRODUCTION_STATE_MODEL.md`](PROTOCOL_PRODUCTION_STATE_MODEL.md)), the release governance
([`PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md)) and the trust architecture
([`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md)).

## 1. Objective of M2

Bring the open protocol to a **production-grade implementation state**: a specification that is governed,
versioned, releasable and publishable, and against which independent operators can self-publish manifests and
demonstrate compatibility — while the protocol remains an open protocol and never becomes a payment-service
provider.

Concretely, M2 delivers:

- A **protocol production state model** with explicit allowed and forbidden transitions.
- A **release governance** process (versioning, release candidates, review, Trust Root signing, publication).
- A **trust model** in which signed protocol metadata and delegated signing keys anchor to a pinned Trust Root,
  and operators self-publish manifests demonstrating verifiable conformance evidence.
- An **operator self-publication** path — operators publish their own manifests and conformance evidence; BANZA
  neither admits, approves nor certifies any operator.
- A single **Rust gate engine** (`engines/banza-m2-protocol-gate`) that computes M2 status.

## 2. Scope (what M2 implements)

- Governance: roles, quorum and recorded governance decisions for **protocol** changes by the protocol
  maintainers and Trust Root custodians.
- Contracts: the canonical `contracts/` artifacts (OpenAPI, webhook schemas, QR payload, event and
  invariants contracts) governed under the release process.
- Trust model: signed protocol metadata, delegated signing keys, a pinned Trust Root, the public protocol
  registry and the revocation list — a **published framework**, planned and gated, not a real production key
  ceremony.
- Release process: DRAFT → REVIEW → RELEASE_CANDIDATE → APPROVED_FOR_PROTOCOL_PUBLICATION → PUBLISHED.
- Operator self-publication: operators publish their own manifest and conformance evidence against the
  published protocol — prepared.
- Assurance linkage: how L0–L4 readiness, Security Assurance and Deep Assurance become **evidence** feeding an
  operator's conformance demonstration, rather than the primary "readiness" claim.

## 3. Out of scope (forbidden in M2)

M2 does **not** do any of the following. These remain gated behind M3/M4, and any real financial service is the
independent operator's own responsibility under its own legal, regulatory, financial and operational framing:

- Transform BANZA into a PSP or make BANZA provide, process or settle payments.
- Hold, move or settle real funds.
- Create, admit, approve, accept or activate a real operator, or add any real operator to `/operators`
  (stays `[]`).
- Set `production_certificates=true` (stays `false`; the legacy `/certificates` route remains, reporting
  `production_certificates=false`).
- Activate real federation or real external integration.
- Generate real production keys or run a real Trust Root ceremony as an activation.
- Claim regulatory approval, banking authorisation or a licence for BANZA.

All production, ceremony and operator activities described anywhere in M2 are **PLANNED / prepared-but-gated**.

## 4. Relation to L0–L4 readiness

Before M2, L0–L4 readiness were the visible "readiness" surface for an operator. In M2 they are **repositioned
as historical / evidence inputs**, not the primary readiness claim. L0–L4 reports are collected into an
operator's own conformance evidence; they demonstrate technical preparation in a local/demo/test-only
environment. They remain what they always were — technical evidence, never a certificate, approval, licence or
production. The primary M2 question is no longer "is L4 ready?" but "is the **protocol** implemented, governed
and releasable for production as an open protocol?" See [`L4_READINESS.md`](L4_READINESS.md) and siblings.

## 5. Relation to Security Assurance and Deep Assurance

Security & Risk Assurance (BX2.0, [`../security/ASSURANCE_READINESS.md`](../security/ASSURANCE_READINESS.md))
and the deeper assurance work (BX2.1–BX2.4) provide **internal** security and risk evaluation. In M2 their
outputs are **evidence** feeding an operator's conformance demonstration and the assurance gate of the M2
protocol-gate engine. `ASSURANCE_READY_FOR_INTERNAL_REVIEW` means ready for an internal review — not reviewed,
not audited, not certified, not licensed and never production. An open CRITICAL or HIGH risk blocks the M2 gate
via the `M2_BLOCKED_BY_ASSURANCE_GAP` state.

## 6. Relation to operators

Operators — not BANZA — provide financial services, hold and move funds, and serve end users. Independent
operators implement the protocol, **self-publish** their manifests and demonstrate compatibility through
verifiable conformance evidence. M2 **prepares** this path (publish a manifest, run conformance, publish the
evidence). M2 does **not** admit, activate, approve, accept or certify any operator. Each operator carries its
own legal, regulatory, financial and operational framing; BANZA carries only the protocol, its contracts,
conformance and the trust framework. See [`OPERATOR_MANIFEST_VALIDATION.md`](OPERATOR_MANIFEST_VALIDATION.md),
[`PUBLIC_PROTOCOL_REGISTRY.md`](PUBLIC_PROTOCOL_REGISTRY.md) and
[`WORKBENCH_ONLY_OPERATOR_VERIFICATION.md`](WORKBENCH_ONLY_OPERATOR_VERIFICATION.md).

## 7. Relation to the trust model

Trust in the open protocol is evaluated from **signed protocol metadata**, **delegated signing keys**,
**operator manifests**, **verifiable conformance evidence**, the **public protocol registry** and
**revocation / fail-closed** evaluation. A Trust Root held by three custodians under a **2-of-3** threshold
signs **protocol metadata, delegated signing keys, protocol releases and revocation lists — never operators,
payments or licences**. Humans maintain and evolve the protocol; they do **not** authorise, accept, approve or
certify operators. See [`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md),
[`OPEN_PROTOCOL_GOVERNANCE.md`](OPEN_PROTOCOL_GOVERNANCE.md), ADR-038, ADR-039 and ADR-040.

## 8. Relation to the Evidence Bundle

The Evidence Bundle ([`EVIDENCE_BUNDLE.md`](EVIDENCE_BUNDLE.md)) is the technical package an operator assembles
to demonstrate conformance. In M2 it is a **primary evidence artifact**: it aggregates SimB Pre-Review, L0
conformance, trace and trust results with tool versions and SHA-256 integrity hashes, computed in Rust. It is
**not** a certificate and **not** an approval; it is verifiable conformance evidence that any party can
re-check.

## 9. Relation to operator regulation

Any licence, authorisation or regulatory framing belongs to the independent operator that provides real
financial services using the protocol — never to the BANZA protocol itself. BANZA maintains and evolves the
protocol; it does not substitute the operator's regulator, licence or authorisation, and it does not authorise,
accept, approve or certify operators. Legal and regulatory clearance is satisfied **outside** the protocol by
the operator. See [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md) and
[`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md).

## 10. M2 protocol-gate engine

M2 status is computed **in Rust** by `engines/banza-m2-protocol-gate` (function `validate_m2_protocol_gate`),
never in TypeScript. It evaluates six production-protocol gates — contract baseline, release governance, trust
path, operator self-publication, assurance and regulatory boundary — and returns one status:

| Status | Meaning |
|---|---|
| `M2_PROTOCOL_IMPLEMENTATION_READY` | Contracts, governance, trust path, self-publication and assurance inputs present and boundary-clean. |
| `M2_BLOCKED_BY_MISSING_CONTRACTS` | A required `contracts/` artifact is missing. |
| `M2_BLOCKED_BY_GOVERNANCE_GAP` | Release governance / decision-record inputs incomplete. |
| `M2_BLOCKED_BY_TRUST_PATH_GAP` | Specified trust-path locations / framework incomplete. |
| `M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP` | Operator self-publication inputs incomplete. |
| `M2_BLOCKED_BY_ASSURANCE_GAP` | Open CRITICAL/HIGH risk or missing assurance evidence. |
| `M2_INVALID_FORBIDDEN_ACTIVATION` | A forbidden activation is asserted (real operator, funds, federation, or setting `production_certificates=true`). |
| `M2_INVALID_REGULATORY_BOUNDARY` | The package claims BANZA is a PSP / needs a licence / processes payments. |

The TypeScript layer only loads the engine and displays the result; it decides nothing.

## See also

- [`PROTOCOL_PRODUCTION_STATE_MODEL.md`](PROTOCOL_PRODUCTION_STATE_MODEL.md)
- [`PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md)
- [`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md)
- [`OPEN_PROTOCOL_GOVERNANCE.md`](OPEN_PROTOCOL_GOVERNANCE.md)
- [`M2_READINESS_HANDOFF_2026_07.md`](M2_READINESS_HANDOFF_2026_07.md)
