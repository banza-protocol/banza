---
rfc: 0002
title: Cross-Operator Settlement
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: [0001]
---

## Summary

Define how settlement is handled when a payment crosses operator boundaries —
specifically, how two independent Banza operators net and settle obligations
between each other without a central counterparty.

## Motivation

In a single-operator deployment, settlement is internal: the operator moves money
from a consumer wallet to a merchant wallet within its own ledger, then settles
outward to the merchant's bank account via the `SettlementExecutionProvider`.

When a payment crosses operators (Consumer on Operator A pays a Merchant on Operator B),
the current model has no mechanism for:
- Recognising the cross-operator obligation.
- Netting multiple obligations in a session.
- Settling bilaterally between operators.
- Auditing the cross-operator flow.

## Problem statement

```
Consumer (Operator A) ──pays──▶ Merchant (Operator B)
                │                        │
         Operator A ledger        Operator B ledger
         (records payment)        (records receipt?)
                │
         How does Operator B know it is owed money?
         How does Operator A discharge the obligation?
```

There is currently no protocol for the above. The `SettlementExecutionProvider`
only handles operator-to-bank outbound flows, not operator-to-operator flows.

## Proposed solution

Introduce a **cross-operator settlement protocol** in three phases:

### Phase 1 — Obligation recording

When the routing decision identifies a cross-operator payment (RFC-0001,
`cross_operator: true`), the sending operator records an `InteropObligation`:

```text
pub struct InteropObligation {
    pub obligation_id:      String,
    pub from_operator_id:   String,
    pub to_operator_id:     String,
    pub amount:             Money,
    pub payment_ref:        String,
    pub recorded_at:        DateTime<Utc>,
}
```

### Phase 2 — Netting

At configurable intervals (e.g., daily), the two operators exchange obligation
lists and compute a net position. If Operator A owes Operator B 1 000 000 AOA
and Operator B owes Operator A 400 000 AOA, the net settlement is 600 000 AOA
from A to B.

### Phase 3 — Bilateral settlement

The net settlement is executed via the existing `SettlementExecutionProvider`
(one bank transfer), with both operators reconciling against the netting result.

### New trait

```text
#[allow(async_fn_in_trait)]
pub trait CrossOperatorSettlementProvider: Send + Sync {
    async fn record_obligation(&self, ob: InteropObligation) -> Result<(), SettlementProviderError>;
    async fn compute_net_position(&self, counterparty_id: &str) -> Result<NetPosition, SettlementProviderError>;
    async fn settle_net(&self, position: NetPosition) -> Result<SettlementSubmissionResult, SettlementProviderError>;
}
```

## Alternatives considered

**Real-time gross settlement (RTGS)**: Each cross-operator payment triggers an
immediate bank transfer. Simple but prohibitively expensive at volume and creates
liquidity pressure on operators.

**Central clearing house**: A trusted third party holds obligations and settles.
Introduces centralisation and a single point of failure. Inconsistent with the
open-protocol core model.

**Bilateral netting (proposed)**: Operators settle net positions bilaterally at
configurable intervals. This mirrors established interbank netting practice and
preserves operator independence.

## Compatibility impact

- Adds a new optional trait `CrossOperatorSettlementProvider`.
- Single-operator deployments are unaffected.
- Operators that do not implement this trait cannot receive cross-operator payments.

## Security considerations

- Obligation records must be cryptographically signed by the originating operator
  to prevent manipulation of netting calculations.
- Netting computations must be independently verifiable by both parties before
  settlement is executed.
- Double-counting and double-spending across operators must be structurally prevented.

## Operational considerations

- Both operators must agree on netting interval and currency pair.
- Time-zone and clock synchronisation matter for daily netting cutoffs.
- A dispute resolution mechanism for netting disagreements must be defined.

## Migration concerns

This is additive. Existing operators do not need to implement the trait until
they want to receive or send cross-operator payments.

## Unresolved questions

- What cryptographic mechanism secures inter-operator obligation records?
- How are netting intervals agreed upon? Static config or dynamic negotiation?
- What happens when an operator goes insolvent mid-netting-period?
- How are currency conversions handled in cross-currency cross-operator settlements?
