# BANZA Protocol Governance

## Overview

BANZA is governed as an **open protocol** — its rules, contracts, and conformance and certification-governance framework are defined by the RFC and ADR process, not by any single operator. The governance model separates **protocol decisions** (which affect all operator implementations) from **implementation decisions** (which are internal to each operator implementation or plugin).

> **Scope of these governance documents (pre-production).** These documents govern the protocol; they do **not** certify operators, do **not** approve production deployment, and do **not** replace applicable legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Currently there is no certified operator and no active production certificate; production certification and federation remain behind the offline root-key ceremony and the first published production conformance evidence.

## Operator Independence

**An operator is an independent commercial entity.** It is not the protocol's governing body. Key facts:

- BANZA is **not owned by any operator**
- BANZA is **not governed by any operator**
- No operator implementation **controls** the conformance or certification-governance framework
- This repository does **not** contain a reference operator; operator implementations live in their own repositories, separate from the BANZA protocol organization (`github.com/banza-protocol`)
- The BANZA protocol itself is maintained at `github.com/banza-protocol` and published at `banza.network`; operator infrastructure lives elsewhere
- Any operator may contribute to BANZA via the ADR process, on equal footing with any other operator
- The BANZA protocol continues to exist if any operator ceases operations

**No single operator governs the protocol.** See [docs/reference/en/complete.md](../reference/en/complete.md) for the canonical ecosystem hierarchy.

---

## Decision types

### Protocol decisions (ADR required)

Changes to the canonical protocol affect all SDK implementations worldwide and must follow the Architecture Decision Record process:

- Changes to `contracts/openapi/` — API shape changes
- Changes to `contracts/webhooks/` — webhook payload changes
- Changes to `contracts/qr/` — QR payload format changes
- Changes to `conformance/` — conformance vector changes
- New major SDK API surface changes
- Changes to the @handle identity system

**Process:** Open a GitHub Discussion → propose an ADR → review period (minimum 7 days) → merge with ADR.

### Implementation decisions

Improvements within existing protocol bounds (bug fixes, performance, ergonomics):

- SDK implementation details
- Plugin improvements
- Documentation updates
- Example additions

**Process:** Standard pull request review.

---

## Architecture Decision Records

All ADRs live in [`decisions/adr/`](../../decisions/adr/). Each ADR must include:

- **Context** — what problem this decision addresses
- **Decision** — what was decided
- **Rationale** — why this decision was made
- **Alternatives considered** — what else was evaluated
- **Consequences** — tradeoffs and downstream effects

ADR numbering is sequential and permanent. ADRs are never deleted — they are superseded by newer ADRs when decisions change.

---

## Versioning policy

Everything published in this repository is part of the **BANZA ecosystem contract surface**. Breaking changes affect every SDK implementation worldwide.

### Semantic versioning

| Change type | Version bump | Required |
|---|---|---|
| New feature, backwards compatible | Minor (`x.Y.0`) | No additional process |
| Bug fix, no API change | Patch (`x.y.Z`) | No additional process |
| Breaking API change | Major (`X.0.0`) | ADR required + deprecation notice |

### Breaking change requirements

A breaking change requires:

1. An ADR explaining the change and rationale
2. A **deprecation notice** in the previous minor version
3. A **migration guide** published alongside the new version
4. A minimum **90-day deprecation period** before removal

This applies to: SDKs · QR payload format · webhook schemas · OpenAPI contracts.

### Conformance suite stability

The conformance vectors (`conformance/`) are particularly stable. Changes to conformance vectors require:

- An ADR
- Coordination with all known SDK implementors
- A transition period where both old and new vectors are accepted

---

## SDK compatibility

BANZA maintains a compatibility guarantee for SDK consumers:

- Minor versions are backwards compatible
- Breaking changes require a major version bump, deprecation notice, and migration guide
- The conformance suite (`conformance/`) defines the minimum compatibility bar for any conformant implementation

Third-party SDK implementations that pass the conformance suite are considered **BANZA-compatible**.

---

## Ecosystem stewardship

The BANZA protocol is stewarded by its open governance process — RFCs, ADRs, and the conformance and certification-governance framework. Protocol evolution decisions are made with the following priorities:

1. **Backwards compatibility** — existing integrations must not break silently
2. **Developer experience** — protocol changes should reduce, not increase, integration complexity
3. **Financial correctness** — any change to payment flows must preserve financial invariants
4. **Security** — security improvements take precedence over API stability

---

## Maintainers

The BANZA protocol is maintained by its core engineering team. External maintainers may be added for specific SDK languages based on demonstrated sustained contribution. Contact: see `docs/governance/` for the full governance framework.

---

## Ecosystem boundaries

### BANZA (this repository) — protocol specification layer

| Scope | Examples |
|-------|---------|
| Protocol specification domains | ledger, wallet/account model, routing semantics, acquiring, settlement boundary, QR |
| Protocol specifications | OpenAPI contracts, webhook schemas, QR payload format |
| Provider interface definitions | `AcquirerProvider`, `SettlementExecutionProvider`, `NotificationProvider` (operator-neutral abstractions) |
| Capability model | `WalletCapabilitySet`, `OperatorManifest`, `ProviderCapabilityDescriptor` |
| SDKs | None shipped from this repo — BANZA is contract-first; SDKs are operator/third-party or future protocol-owned artifacts |
| Illustrative examples | Conceptual examples in `examples/` — no reference operator and no sandbox operator ship from this repository |
| Conformance suite | SDK conformance vectors (`conformance/sdk/`) — technical evidence, not certification |
| Governance docs | ADRs, RFCs, this document |

### Operators (external repositories) — implementation layer

| Scope | Examples |
|-------|---------|
| Provider implementations | External acquirer and payment-rail adapters, real bank settlement |
| Compliance and KYC/AML | Identity verification, risk scoring, fraud detection |
| Consumer and merchant apps | Mobile apps, web dashboards, POS terminals |
| Production deployment | Infrastructure, CI/CD, monitoring, disaster recovery |
| Business logic | Fee structures, credit products, merchant agreements |
| Regulatory obligations | Licensing, reporting, audit trails |

**The protocol never contains operator business logic. Operators never modify protocol
invariants.** This boundary is permanent and enforced by the conformance suite and code review.

### Operators — independent participants in the protocol

An operator is an independent implementation of the BANZA protocol. An operator is not:

- A privileged operator with special protocol access
- The hidden center of the ecosystem
- The reference for how all operators must work

Any operator implements the same public protocol contracts as any other. Operator repositories
contain no code that belongs in the protocol specification, and the protocol specification
contains no code specific to any operator.

---

## RFC process

Significant changes to the BANZA protocol go through the RFC process before
implementation. See [`decisions/rfc/README.md`](../../decisions/rfc/README.md).

ADRs record decisions after they are made. RFCs propose changes before they are made.

---

## Contact

- Protocol questions: open a GitHub Discussion
- RFC proposals: open a PR to `decisions/rfc/`
- Security issues: security@banza.network (see [docs/security/README.md](../security/README.md))
- Code of conduct: conduct@banza.network

---

## Operator Neutrality Principle

Operator neutrality is an **architectural invariant** of BANZA — not a style preference, not a branding policy.

### Architectural dependency

```
     Operators   (Operator A, Operator B, Operator C, ...)
         ↑
       BanzAI    (Native Protocol Agent)
         ↑
       BANZA     (this repository — the protocol itself)
```

Operators build on BANZA and BanzAI. The arrows point upward. BANZA never has a downward dependency on any specific operator.

### What this means in practice

**BANZA defines:**
- Protocol rules and invariants (INV-LEDGER-*, INV-WALLET-*, INV-QR-*, ...)
- Contract specifications (OpenAPI, webhook schemas, event envelopes)
- Conformance criteria (what counts as a passing conformance test)
- Conformance levels and certification-governance framework (L0–L4, applicable to any operator)
- Federation protocol (any conformant operator may participate)
- Governance process (ADRs and RFCs — open to contributions from any operator)

**BANZA must never contain:**
- Specific operator brands, names, or domains
- Operator business logic (pricing models, product decisions)
- Operator ownership or governance claims over the protocol
- Certification rules or conformance tests written for one specific operator
- Assumptions that only a single operator exists or will ever exist
- Protocol extensions that only apply to one operator's product

### Violations

Any content that implies a specific operator has governance authority over BANZA is a protocol contamination:

| Forbidden pattern | Why it is wrong |
|-------------------|-----------------|
| `[Operator X] governs BANZA` | BANZA is governed by the ADR/RFC process |
| `[Operator X] defines the protocol` | BANZA defines the protocol |
| `[Operator X] certifies operators` | BANZA certification is operator-agnostic |
| `[Operator X]-specific extension` | Extensions belong in the operator's own repository |
| `[Operator X] is required for BANZA` | No operator is required; any operator may implement |

### Automated Enforcement

**Rule:** No specific commercial operator brand may appear in the BANZA repository.

BANZA is an open protocol. Candidate operator implementations may build on the public protocol materials, subject to applicable legal, regulatory, banking, KYC/KYB and governance requirements. No single operator's name, domain, or brand belongs in the protocol specifications, contracts, conformance tests, or documentation.

**Enforcement mechanism:**

| Check | Command | Trigger |
|-------|---------|---------|
| Local | `make identity-check` | Before every commit |
| CI | `identity-guard` workflow | Every push and pull request |
| Pre-commit | `scripts/check-operator-contamination.sh --staged` | Optional pre-commit hook |

**Replacement vocabulary:**

| Forbidden | Use instead |
|-----------|-------------|
| *(specific operator brand)* | conformant operator |
| *(specific operator brand)* | reference operator |
| *(specific operator brand)* | operator implementation |
| *(specific operator brand)* | federation member |

Violations fail both local checks and CI. No PR that introduces an operator brand can be merged.
