---
rfc: 0004
title: Provider Capability Negotiation
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: [0003]
---

## Summary

Define a protocol by which Banza operators declare their provider capabilities
at startup and how the protocol core uses those declarations to enable graceful
degradation and optional feature flows.

## Motivation

Provider traits today are binary: an operator either implements a trait (and thus
fully supports the feature) or does not. There is no mechanism for:

- Partial capability support (e.g., notifications work but only for push, not
  in-app).
- Version negotiation (e.g., supporting QR protocol v1 but not v2).
- Graceful degradation (e.g., if the notification provider is unavailable, the
  payment should still succeed — the notification is optional).
- Runtime capability changes (e.g., a provider going into maintenance mode).

Without this, operators either over-promise (implement stubs that silently fail)
or under-implement (skip optional features entirely).

## Problem statement

Consider an operator that supports QR payments but whose push notification
provider is temporarily unavailable. Under the current model:

1. The protocol core attempts `notification_provider.send(event)`.
2. The provider returns an error.
3. The protocol core propagates the error and the payment fails.

This is wrong. Notifications are not part of the financial invariant. A payment
should succeed even if the notification cannot be delivered.

The protocol core needs to know which provider failures are fatal and which are
degraded-but-acceptable.

## Proposed solution

Introduce a `ProviderCapabilityDescriptor` that operators attach to each provider:

```text
pub struct ProviderCapabilityDescriptor {
    /// Human-readable provider name.
    pub name: String,

    /// Semantic version of this provider implementation.
    pub version: String,

    /// Protocol versions this provider can handle (empty = no protocol version).
    pub supported_protocol_versions: Vec<u32>,

    /// Whether this provider is required for core payment flows to succeed.
    /// false = the protocol core may proceed without this provider on failure.
    pub required_for_payment_flow: bool,

    /// Whether this provider is a simulated/sandbox implementation.
    pub is_simulated: bool,

    /// Named capabilities this provider supports.
    pub features: Vec<String>,
}
```

Each provider trait gains a method:

```text
fn capability_descriptor(&self) -> ProviderCapabilityDescriptor;
```

At startup, the operator implementation validates all provider descriptors and builds a
`KernelCapabilityMap` that routing, settlement, and orchestration code consults
before initiating flows.

### Graceful degradation

When a non-required provider fails, the protocol core logs the failure, emits a
`provider.degraded` event, and continues the payment flow:

```
payment_flow → notification.send() → Err(Unavailable)
                   │
                   └──▶ [is_simulated=false, required_for_payment_flow=false]
                         log: "notification degraded — payment continues"
                         emit: ProviderDegraded { provider: "StdoutNotifications" }
                         continue → payment committed
```

## Alternatives considered

**Error classification on the trait**: Add `is_fatal(err: &ProviderError) -> bool`
to provider traits. Simpler but puts degradation logic inside the provider,
making it hard to override at the operator level.

**Configuration file**: Operators declare required/optional providers in TOML.
Simpler but loses the type safety of the descriptor being part of the provider
implementation.

**Descriptor on the provider (proposed)**: Capability is self-declared by the
implementation. The protocol core consults it without needing external configuration.
Operators can override for their deployment without changing protocol core code.

## Compatibility impact

- Adds `capability_descriptor()` to all provider traits.
- Simulated providers return `is_simulated: true` — this can be used to enforce
  that production operators do not accidentally ship simulated providers.
- Existing provider implementations require adding the method. A default
  implementation returning a minimal conservative descriptor could be provided.

## Security considerations

- A production operator must never ship a provider with `is_simulated: true`.
  The protocol core should emit a startup warning (or hard error) when `is_simulated`
  is true outside of a sandbox environment.
- Capability descriptors must not be user-modifiable at runtime.

## Operational considerations

- The `KernelCapabilityMap` should be logged at startup so operators can audit
  which capabilities are active.
- Provider degradation events should be observable via the event stream.

## Migration concerns

Existing provider implementations add `capability_descriptor()`. A blanket default
implementation on a new `ProviderCapabilities` helper trait reduces migration effort.

## Unresolved questions

- Who determines the environment (sandbox vs production)? An environment flag
  injected at startup, or derived from provider descriptors?
- Should the protocol core hard-block on `is_simulated` providers in a production context,
  or only warn?
- How are capability descriptors surfaced to external monitoring?
