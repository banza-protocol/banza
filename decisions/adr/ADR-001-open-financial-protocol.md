# ADR-001 — BANZA as Open Financial Protocol

**Status:** Accepted  
**Date:** 2026-05-28  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None

---

## Context

The generic protocol-level models beneath a payment system — double-entry ledger, wallet/account implementation model, transaction FSM, routing, settlement semantics, QR protocol surface — have value beyond any single commercial deployment. When these models are built privately inside one operator's product, they become tightly coupled to that operator and inaccessible to contributors, researchers, and alternative operators.

That coupling creates:

- Invisible coupling: the protocol-level models are inseparable from a single product
- Contributor barrier: no way to experiment without access to private infrastructure
- Single-operator lock-in: the architecture cannot evolve to support multiple operators
- No external validation: invariants cannot be audited by the community

## Decision

BANZA is defined as an **open financial protocol**: a technology-neutral specification of protocol-level models for financial interoperability, published under Apache 2.0 at `github.com/banza-protocol/banza`.

The protocol is operator-neutral. It defines:
- Financial state-machine models (transactions, wallet/account models, settlement semantics)
- Invariant enforcement (zero-sum ledger, idempotency, atomicity)
- Provider interfaces (acquiring, routing, notification, risk)
- Protocol specifications (QR payload, webhook schemas, OpenAPI contracts)

The analogy is precise:
- BANZA = the open protocol standard
- The reference operator = the first independent implementation
- Future operators = further independent implementations

## Consequences

**Positive:**
- Community contribution is possible without access to private infrastructure
- Financial invariants are publicly auditable
- The architecture supports multiple independent operators
- No single operator is "the only possible implementation" — each operator is one implementation among many
- External trust increases: operators can inspect what they're running

**Negative:**
- Protocol evolution requires careful backwards-compatibility discipline (see ADR-003)
- Provider interfaces must be stable before operators build on them
- Maintaining separate repositories (public protocol + private operator implementations) adds coordination overhead

## Alternatives considered

**Keep everything private:** Rejected. Creates permanent contributor barrier and prevents ecosystem formation.

**Open-source an operator's entire product:** Rejected. An operator's implementation includes operational secrets, compliance rules, and provider credentials that cannot be public.

**Publish contracts only (no conformance suite):** Rejected. The value is in verifiable invariant enforcement and conformance test vectors, not prose specifications alone.
