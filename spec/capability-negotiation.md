# Capability Negotiation

Version: 1.0 · Status: Experimental

Capability negotiation is how Banza operators advertise what they support and
how integrating parties discover supported features before sending requests.

This is an **experimental** surface. The protocol may change without a deprecation
notice. Do not build production integrations against this spec until it reaches
Stable status.

---

## Operator manifest

Every operator exposes a discovery manifest at:

```
GET /.well-known/banza/operator.json
```

The manifest describes the operator's identity, environment, and capabilities.

```json
{
  "operator_id":        "banza-sandbox",
  "operator_version":   "0.1.0",
  "protocol_version":   "1.0",
  "environment":        "sandbox",
  "simulated":          true,
  "production_allowed": false,
  "capabilities": {
    "supports_wallets":        true,
    "supports_qr":             true,
    "supports_payment_links":  true,
    "supports_settlement":     true,
    "cross_operator_routing":  false,
    "offline_payments":        false
  },
  "providers": {
    "acquirer":      "fake-acquirer",
    "settlement":    "simulated",
    "notifications": "stdout",
    "routing":       "mock",
    "all_simulated": true
  },
  "currency_support": ["AOA"],
  "safety": {
    "simulation_mode":        true,
    "no_real_money_movement": true,
    "resets_on_restart":      true
  }
}
```

---

## Capability flags

| Flag | Meaning |
|------|---------|
| `supports_wallets` | Operator manages wallet creation and balance |
| `supports_qr` | QR generation and payment endpoint available |
| `supports_payment_links` | Payment link creation and payment endpoint available |
| `supports_settlement` | Settlement batches can be created and executed |
| `cross_operator_routing` | Operator can route payments to other Banza operators |
| `offline_payments` | Operator supports payment initiation without live API connection |

---

## Capability set negotiation (planned)

The `banza-capabilities` crate (experimental) defines a typed capability set
that operators advertise and integrators query at connection time:

```text
// Planned API — not yet stable
let caps = operator_client.negotiate_capabilities().await?;

if caps.supports(Capability::CrossOperatorRouting) {
    // Route payment to another operator
} else {
    // Fall back to direct wallet-to-wallet
}
```

This is analogous to TLS cipher suite negotiation: the integrator proposes a
capability set, the operator responds with the intersection it supports.

---

## Safety enforcement

The `production_allowed` field is a hard safety gate in the sandbox operator.
If `BANZA_ALLOW_PRODUCTION` is set in the environment, the operator refuses to
start:

```
FATAL: BANZA_ALLOW_PRODUCTION is set. This sandbox operator is not permitted
to run in a production context. Refusing to start.
```

This prevents the sandbox from being accidentally deployed as a production
operator. The manifest always reflects the current enforcement state.

---

## Future: cross-operator routing

When `cross_operator_routing` is `true`, operators participate in a federated
network. A payment to a wallet on a different operator is routed through the
Banza routing layer rather than rejected.

The routing layer:
1. Resolves the destination wallet's operator via the `@handle` identity system
2. Fetches the destination operator's manifest and negotiates capabilities
3. Executes a cross-operator transfer via the standardised inter-operator protocol

This feature is planned and tracked in the ADR backlog. It is not implemented
in the current sandbox operator.

---

## Sandbox implementation

The manifest is built in `reference/sandbox-operator/src/manifest.rs` by
`build_manifest()`. All capability flags and provider labels are set at compile
time for the sandbox. A production operator would compute these from its runtime
configuration.
