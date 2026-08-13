# ADR-025 — Environment isolation: sandbox and production

Financial systems must guarantee that sandbox/test payments never affect real money, and that production payments never use fake/simulated providers. Mixing environments is a critical failure mode:

- A simulated provider in production appears to process payments but credits no real funds
- A production provider in sandbox could trigger real bank transfers during testing
- QR codes generated in sandbox accepted in production create fraudulent credits

## Decision

Environment isolation is enforced at multiple levels:

### 1 — Startup guard (operator responsibility)

Operators must implement a boot-time check that refuses to start with mismatched environment and provider:

```text
if app_env == Environment::Production && provider.is_simulated() {
    panic!("Refusing to start: production environment requires a real provider");
}
```

This is the operator's responsibility, not the protocol core's. The protocol core does not enforce boot conditions — it provides the `AcquirerProvider` trait and `generate_test_callback()` method as the signal for "is this a test provider".

### 2 — QR payload environment field

Every QR code carries an `environment` field (`"sandbox"` | `"live"`). The QR engine validates this field during payment initiation. A `"sandbox"` QR cannot initiate a payment in a production context.

### 3 — API key prefix convention

API keys are prefixed to indicate environment:
- `bz_test_...` → sandbox keys → must route to simulated provider
- `bz_live_...` → production keys → must route to live provider

### 4 — Reference operator (sandbox only)

The `reference/sandbox-operator/` is explicitly labelled as sandbox-only. Its providers always return `environment: "sandbox"` and implement `generate_test_callback()`. It is structurally impossible to connect it to real payment rails.

### What the protocol core does NOT enforce

The protocol core does not contain environment-specific branching. Environment isolation is a concern of the operator deployment layer, not the financial primitives. This separation is intentional: the protocol core's job is financial correctness, not deployment policy.

## Consequences

**Positive:**
- Clear responsibility assignment: protocol core handles invariants, operators handle environment policy
- Reference operator cannot accidentally be used in production (structural constraint, not just documentation)
- API key prefix convention is visible to consumers without reading internal code

**Negative:**
- An operator who omits the startup guard could deploy a simulated provider to production (no protocol core enforcement)
- The protocol core cannot catch environment mismatches at the library level

## Alternatives considered

**Protocol core-level environment enforcement:** Rejected. Would require the protocol core to know about operator deployment topology, violating the protocol core/operator separation (ADR-001).

**Separate protocol core builds for sandbox/production:** Rejected. Adds build complexity with minimal safety benefit.
