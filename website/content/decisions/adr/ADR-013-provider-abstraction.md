# ADR-013 — Provider abstraction

An operator implementing the BANZA protocol integrates with external systems: payment rails, notification services, risk engines, identity providers, routing databases. These integrations are operator-specific — each operator uses different services and holds different credentials. The protocol must express each integration point without binding to any one of them.

Baking specific provider implementations directly into the protocol core (for example, a named payment-rail provider as an enum variant) would create:

- Provider-specific code mixed into the operator-neutral protocol core
- Impossible to describe the protocol core without also describing one operator's business logic
- Contributors cannot exercise the model without private, operator-specific credentials
- No way to swap providers without modifying the shared protocol core

## Decision

Every external integration point is expressed as a **provider interface** defined by the protocol core. Operators implement each interface for the specific providers they use. The protocol core is generic over the interface and depends on no specific operator or provider.

The canonical pattern (illustrative — the protocol prescribes no implementation technology for operators):

```text
// The protocol core defines the integration point as a trait:
trait AcquirerProvider {
    fn provider_name(&self) -> &str;
    async fn initiate_payment(&self, req: InitiatePaymentRequest)
        -> Result<ExternalPaymentRef, AcquirerError>;
    async fn validate_callback(&self, raw_body: &[u8], signature: &str)
        -> Result<PaymentConfirmation, AcquirerError>;
}

// The protocol core engine is generic over the trait — it is
// parameterised by a provider without knowing the concrete one:
struct AcquiringEngine<P: AcquirerProvider> { provider: P, /* ... */ }

// Each operator implements the trait for the providers it uses:
//   Operator A: impl AcquirerProvider for its payment-rail integration
//   Operator B: impl AcquirerProvider for a different payment rail
```

### Provider trait inventory

| Trait | Integration point |
|---|---|
| `AcquirerProvider` | Payment rail integration |
| `RoutingProvider` | Payment rail selection |
| `NotificationProvider` | Push/event delivery |
| `RiskProvider` | Transaction risk assessment |
| `SettlementProvider` | Settlement execution |

### Simulated implementations

For each provider trait, an operator or contributor may supply a simulated implementation that:
- Works without external infrastructure
- Generates deterministic responses
- Is suitable for local development and testing
- Is clearly labelled as non-production

## Consequences

**Positive:**
- The protocol core describes each integration point with zero knowledge of any specific provider
- Operators can swap providers without modifying the shared protocol core
- Simulated implementations let operators and contributors exercise the traits locally
- Each provider implementation can be tested independently

**Negative:**
- More upfront design work to define stable trait interfaces
- Engines generic over a provider trait (`AcquiringEngine<P>`) carry more complex type signatures
- Trait objects require a `dyn` vs. monomorphisation decision per use case

## Alternatives considered

**Enum dispatch over named providers:** Rejected. Encodes specific providers into the protocol core; cannot be extended without modifying the protocol core.

**Configuration-based provider selection (strings):** Rejected for type safety. String dispatch loses compile-time verification.

**Dynamic trait objects everywhere (`Box<dyn AcquirerProvider>`):** Evaluated. Acceptable for some use cases (API servers); monomorphisation is preferred for performance-critical paths.
