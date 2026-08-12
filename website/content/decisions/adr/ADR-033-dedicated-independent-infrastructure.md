# ADR-033 — Dedicated infrastructure, independent of any operator

- **Status:** Accepted
- **Date:** 2026-07
- **Supersedes/relates:** ADR-001 (implementation independence), ADR-003 (operator separation), ADR-002 (ecosystem hierarchy)

## Context
BANZA is an open protocol. Its public surface (`banza.network`, the site, the verification
anchors) must not be hosted **as a guest tenant on any operator's VM**: sharing an operator's
reverse proxy, TLS certificates and Docker networks would couple the protocol's availability and
blast radius to a single operator's banking stack — contradicting the operator-neutrality
invariant (BANZA must never depend on any operator).

## Decision
BANZA and BanzAI run on a **dedicated VM/VPS used exclusively for the protocol**, with its own
reverse proxy, TLS, network and database. The VM contains **only** protocol artifacts and BanzAI —
no operator code, wallet, ledger, KYC/KYB, payments, accounts, or commercial operator names.

## Consequences
- The protocol's availability no longer depends on any operator.
- Clear separation: operator infrastructure and protocol infrastructure never share a host.
- Slightly higher operational cost (a dedicated VM) — accepted as the price of neutrality.
- All examples remain neutral (Operador A/B/C); the reference operator has no privileged position.
