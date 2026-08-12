---
rfc: 0001
title: Multi-Operator Routing
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: []
---

## Summary

Define how payment routing decisions are made when the Banza ecosystem
contains multiple independent operators, each with different rail access
and geographic coverage.

## Motivation

The current `RoutingEngine` trait is designed for a single-operator deployment
where one entity controls all rails. As the ecosystem grows to include multiple
operators (bank-backed, CBDC, merchant-only, regional), routing decisions must
account for which operator can fulfill a given payment — not just which rail
within a single operator.

## Problem statement

In a single-operator model, routing selects the best rail from a fixed set owned
by that operator. In a multi-operator model:

- A payment may be fulfillable by more than one operator.
- Operators have different rail access, fees, and settlement capabilities.
- The protocol core must select both a **rail** and an **operator** without coupling
  to any specific operator's implementation.
- Routing decisions affect settlement flows — cross-operator payments require
  interoperability protocols not yet defined.

## Proposed solution

Introduce an `InteropRoutingEngine` trait that extends the current `RoutingEngine`
with operator-awareness:

```text
pub struct OperatorRouteRequest {
    pub base: RouteRequest,
    pub available_operators: Vec<OperatorDescriptor>,
}

pub struct OperatorRoutingDecision {
    pub base: RoutingDecision,
    pub selected_operator_id: String,
    pub cross_operator: bool,
}

#[allow(async_fn_in_trait)]
pub trait InteropRoutingEngine: Send + Sync {
    async fn route_with_operators(
        &self,
        req: OperatorRouteRequest,
    ) -> Result<OperatorRoutingDecision, RoutingError>;
}
```

The `selected_operator_id` identifies which registered operator should handle
the payment. If `cross_operator` is true, a cross-operator settlement protocol
must be initiated (see RFC-0002).

## Alternatives considered

**Option A — Route always within single operator**: Simple but prevents
interoperability. Rules out multi-operator scenarios permanently.

**Option B — Global rail registry**: A central registry maps rails to operators.
Rejected: creates centralisation and a single point of failure. Inconsistent
with the open-protocol core philosophy.

**Option C — Operator-scoped routing (proposed)**: Each operator declares which
rails it supports (via capability descriptor, see RFC-0004). The routing engine
selects the operator first, then the rail within that operator. This preserves
the existing `RoutingEngine` abstraction and adds interop as an opt-in layer.

## Compatibility impact

- The existing `RoutingEngine` trait is unchanged — single-operator deployments
  continue to work without modification.
- `InteropRoutingEngine` is a new optional trait. Operators that do not implement
  it cannot participate in multi-operator routing.
- No breaking changes to existing operators.

## Security considerations

- Operator identity must be cryptographically verifiable before routing to them
  to prevent spoofing.
- Cross-operator payments must carry a tamper-evident routing proof for audit.
- An operator must not be able to route payments to itself in a way that bypasses
  settlement obligations.

## Operational considerations

- Operators must be able to signal degraded rail availability dynamically (not
  just at startup).
- Routing decisions must be logged with full operator context for reconciliation.
- Timeout and retry policy for cross-operator routing requires definition.

## Migration concerns

Existing single-operator deployments upgrade by doing nothing. Multi-operator
routing is strictly additive. Operators opt in by implementing `InteropRoutingEngine`
and registering with an operator discovery mechanism (RFC-0005).

## Unresolved questions

- How is the list of `available_operators` assembled at routing time?
- Who arbitrates conflicts when two operators claim the same rail?
- How is operator routing priority expressed?
- What happens when the selected operator goes offline mid-payment?
