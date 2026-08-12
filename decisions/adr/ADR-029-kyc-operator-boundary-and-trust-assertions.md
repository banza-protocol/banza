# ADR-029 — KYC stays operator policy; only Trust Assertions may federate

**Status:** Accepted  
**Date:** 2026-06-28  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None  
**Extends:** ADR-001 (Open protocol), ADR-003 (Operator separation), ADR-052 (Reference operator simulator), ADR-005 (Protocol-first)  
**See also:** ADR-040 (Federation trust evaluation without certificates), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

An operator is building its first official consumer identity-verification (KYC)
implementation — document capture, selfie, evidence storage, review workflow,
approval/rejection. The question arose whether KYC should be defined in the BANZA
protocol.

The protocol's authoritative boundary already answers this. `BANZA-PROTOCOL-VS-
OPERATOR-POLICY` places *"KYC/AML tiers, identity verification, risk scoring,
fraud detection"* squarely in the **operator** column, and records a standing
determination that progressive KYC is implemented in an operator's own stack with
its own API error codes — **no protocol ADR**. `docs/reference/pt/completa.md` §3 states an
operator "may have its own KYC rules," while the ledger's immutability is enforced
by the core, not by operator policy.

This ADR makes that boundary explicit for identity verification so it is not
re-litigated, and isolates the one aspect that *is* potentially protocol-level.

## Decision

**KYC is operator policy. The BANZA protocol does not define how an operator
verifies identity.** Per ADR-005's litmus test, a concept belongs in the protocol
only if it touches a shared surface (a wire contract, a manifest capability, a
certification criterion, a financial invariant, or federation). Identity
verification mechanics do not:

The protocol **does NOT** define, and operators **own exclusively**:

- documents, document types, sides (front/back/main page)
- evidence (document images, selfies, liveness video, proof of address)
- OCR, liveness, vendor integrations (SumSub/Veriff/Onfido/Stripe Identity/…)
- the verification case lifecycle and review workflow
- approval/rejection/needs-more-info decisions and reason codes
- AML/CFT screening and risk scoring
- document/evidence storage (e.g. R2), retention and PII handling
- the mapping from a verification outcome to a wallet's KYC level and limits

The protocol already governs the **consequence** of KYC only indirectly: a
wallet's KYC level is operator policy layered over the ledger invariants the core
enforces (it does not change any `INV-LEDGER-*`).

### The one protocol-level aspect — Trust Assertions (future)

The **only** KYC-adjacent concern that is genuinely protocol-level is
**cross-operator trust**: should operator B be able to trust that operator A has
verified a subject, without re-running KYC? That is a **federation** problem
(ADR-040), not an identity-mechanics problem.

If/when this is pursued, BANZA may define a minimal, signed **Trust Assertion**
that federates — carrying *claims about a verification outcome*, never the
underlying evidence:

```
TrustAssertion (illustrative — NOT yet specified)
  subject_ref            (opaque, privacy-preserving)
  verified               (bool)
  assurance_level        (a federated scale, e.g. AAL/IAL-like)
  identity_provider      (operator/vendor identifier)
  issuer_operator        (the asserting operator)
  verified_at, expires_at
  signature              (operator's delegated signing key, verifiable against signed protocol metadata)
```

A Trust Assertion would carry **no** documents, images, OCR, selfies, review
notes, or workflow — those remain exclusively in the issuing operator. This ADR
**does not** specify Trust Assertions; it reserves the concept and the boundary.
A future ADR (extending ADR-040) would define the wire contract if pursued.

## Consequences

- The protocol surface is **unchanged**: no KYC contracts, schemas, events,
  capabilities, or invariants are added. This ADR is a boundary record.
- Operators implement KYC entirely in their own stack (domain, storage, APIs,
  admin review, events), free to choose vendors and flows.
- Cross-operator KYC portability, if ever wanted, is a separate federation ADR
  defining **Trust Assertions only** (claims, signed; never evidence).

### Forbidden / Permitted (per ADR-005)

- **Forbidden:** moving KYC documents/evidence/OCR/selfie/review/workflow into the
  protocol; an operator emitting a "protocol KYC event" no contract defines.
- **Permitted:** an operator implementing KYC end-to-end as operator policy; a
  future federation ADR defining signed Trust Assertions (outcome claims only).
