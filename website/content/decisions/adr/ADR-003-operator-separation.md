# ADR-003 — Protocol/Operator Separation

**Status:** Accepted  
**Date:** 2026-05-28  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None  
**See also:** ADR-001, ADR-009

---

## Context

After the protocol extraction (ADR-001), the boundary between "protocol core responsibility" and "operator responsibility" must be made explicit and durable. Without a formal boundary, operators would inevitably depend on undocumented protocol core internals, and the protocol core would accumulate operator-specific assumptions.

The risk is subtle coupling: a protocol core function that hardcodes a country-specific behaviour, an engine that assumes a specific provider, or a configuration value that only makes sense for one operator.

## Decision

The protocol core/operator split is governed by one rule:

> **The protocol core defines interfaces and invariants. Operators implement providers.**

Concretely:

| Protocol core responsibility | Operator responsibility |
|---|---|
| `AcquirerProvider` trait | Operator A's acquirer integrations (e.g. a card network, a mobile-money rail) |
| `RoutingEngine` + `RoutingRule` struct | Operator-specific routing table |
| `NotificationProvider` trait | Operator A's push-notification service |
| `RiskProvider` trait | Operator risk scoring heuristics |
| Ledger zero-sum invariant | Bank integration |
| Transaction state machine | Compliance rules |
| QR payload format | Custom QR branding |

**Forbidden in the protocol core:**
- Hardcoded provider names (specific acquirers, rails, or banks)
- Country-specific or currency-specific behaviour
- Any code that imports operator-specific types
- Business rules that differ by operator

**Required in the protocol core:**
- Every operator integration point is expressed as a trait
- Traits are documented with invariants the operator must uphold
- Illustrative operator implementations are conceptual examples only (see `examples/`), never part of the protocol

## Consequences

**Positive:**
- Multiple operators can build on the same protocol core without forking
- Protocol core evolves independently of operator business logic
- Contributors can understand the protocol core without understanding any operator
- Operator migrations (e.g., changing payment rails) don't require protocol core changes

**Negative:**
- More interface design discipline required upfront
- Some features that "just work" for the reference operator must be expressed as provider traits
- Reference implementations add maintenance overhead

## Alternatives considered

**Monolithic codebase with feature flags:** Rejected. Feature flags encode operator-specific decisions in the protocol core and grow unbounded.

**One protocol core per operator (forks):** Rejected. Defeats the purpose of an open protocol core; diverges immediately.

**Configuration files for operator behaviour:** Rejected for business logic. Config files can express values (TTLs, limits) but not behaviour (routing strategy, risk logic).
