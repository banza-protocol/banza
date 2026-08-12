# BANZA RFC Process

RFCs (Request for Comments) are the mechanism for proposing, discussing, and
tracking significant changes to the BANZA ecosystem.

---

## ADR vs RFC

| | ADR | RFC |
|-|-----|-----|
| Purpose | Records decisions already made | Proposes changes not yet decided |
| Tense | Past ("we decided…") | Future ("we propose…") |
| State | Accepted / Superseded | Draft → Proposed → Accepted / Rejected |
| Audience | Maintainers, contributors | Maintainers, operators, community |
| Traceability | Architectural history | Protocol evolution |

Use an **ADR** when a decision is already made and you are documenting it.
Use an **RFC** when you are proposing something for ecosystem discussion.

---

## When is an RFC required?

An RFC is required for:

- New protocol messages or payload formats (QR, webhook, event schemas)
- New protocol core traits or provider interfaces
- Changes to financial invariants
- Changes to settlement or reconciliation models
- Changes to wallet lifecycle semantics
- Multi-operator interoperability protocols
- Capability negotiation models
- Operator discovery mechanisms
- Any change that would break existing operator implementations

An RFC is **not** required for:

- Bug fixes
- Documentation improvements
- Internal refactoring that does not change a public interface
- New reference implementations (fake providers, mock routing, etc.)
- New language SDK features that mirror an already-accepted interface

---

## RFC lifecycle

```
Draft
  │
  ▼
Proposed ──────────── rejected → Rejected
  │
  ▼
Accepted ──────────── not yet built → (implementation pending)
  │
  ▼
Implemented ──────────── later obsoleted → Superseded
```

| State | Meaning |
|-------|---------|
| `Draft` | Work in progress — not yet ready for ecosystem review |
| `Proposed` | Formally submitted for ecosystem review (minimum 14-day comment period) |
| `Accepted` | Approved by maintainers — implementation may begin |
| `Rejected` | Declined with documented rationale |
| `Implemented` | RFC is fully implemented and merged |
| `Superseded` | Replaced by a later RFC (link provided) |

---

## Approval process

1. **Author** opens a draft RFC in `decisions/rfc/` as `RFC-XXXX-short-title.md`.
2. Author changes status from `Draft` to `Proposed` when ready.
3. A **minimum 14-day comment period** applies for all proposed RFCs.
4. Maintainers vote `Accept` / `Reject` with documented rationale.
5. Accepted RFCs are tracked in the implementation matrix.
6. On completion, status changes to `Implemented` with a reference to the
   implementing commit(s).

---

## RFC template

```markdown
---
rfc: XXXX
title: Short Title
status: Draft
created: YYYY-MM-DD
authors: ["Your Name"]
requires: []   # RFC numbers this depends on
---

## Summary

One paragraph.

## Motivation

Why is this needed? What problem does it solve?

## Problem statement

Precise description of the problem.

## Proposed solution

Detailed description of the proposed change.

## Alternatives considered

What was considered and why it was not chosen.

## Compatibility impact

Breaking changes, deprecations, migration steps.

## Security considerations

Threat model, attack vectors, mitigations.

## Operational considerations

Deployment, rollout, monitoring.

## Migration concerns

How existing operators upgrade.

## Unresolved questions

What must be decided before implementation.
```

---

## RFC index

| RFC | Title | Status |
|-----|-------|--------|
| [RFC-0001](RFC-0001-multi-operator-routing.md) | Multi-Operator Routing | Draft |
| [RFC-0002](RFC-0002-cross-operator-settlement.md) | Cross-Operator Settlement | Draft |
| [RFC-0003](RFC-0003-wallet-capabilities.md) | Wallet Capabilities | Draft |
| [RFC-0004](RFC-0004-provider-capability-negotiation.md) | Provider Capability Negotiation | Draft |
| [RFC-0005](RFC-0005-operator-discovery.md) | Operator Discovery | Draft |
| [RFC-0006](RFC-0006-offline-payment-support.md) | Offline Payment Support | Draft |

---

## Relationship to the ADR system

Accepted RFCs that describe architectural decisions are additionally
recorded as ADRs once implemented, providing a permanent historical
record of what was built and why.

See [`decisions/adr/`](../adr/) for the ADR index.
