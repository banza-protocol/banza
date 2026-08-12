# Provider Model

Version: 1.0 · Status: Stable

The BANZA protocol core is infrastructure. It does not know about any specific bank,
payment rail, SMS gateway, or risk engine. Every environment-specific integration
is injected through a **provider trait** at startup time.

---

## Provider traits

Four provider traits are defined by the protocol core. The sandbox implements all four
with simulated providers. Production operators implement them with real services.

### AcquirerProvider

Handles card-present or card-not-present acquisition (POS, e-commerce).

```text
pub trait AcquirerProvider: Send + Sync {
    async fn authorise(&self, req: AcquireRequest) -> Result<AcquireResponse, AcquireError>;
    async fn capture(&self, ref: &str) -> Result<(), AcquireError>;
    async fn refund(&self, ref: &str, amount: Money) -> Result<(), AcquireError>;
}
```

Sandbox: `FakeAcquirer` — returns HMAC-signed references, always succeeds.
Production: implement against EMIS/Multicaixa or any acquiring gateway.

### SettlementProvider

Executes the actual bank disbursement for a settled batch.

```text
pub trait SettlementProvider: Send + Sync {
    async fn execute_batch(
        &self,
        wallet_id: &str,
        net_minor: i64,
        currency:  Currency,
    ) -> Result<String, SettlementError>; // returns provider_ref
}
```

Sandbox: `SimulatedSettlement` — always succeeds, returns `SBX-SETTLE-{uuid}`.
Production: implement against RTGS/ACH/SEPA rails.

### NotificationProvider

Delivers push notifications and webhooks to wallet holders and merchant backends.

```text
pub trait NotificationProvider: Send + Sync {
    async fn notify_wallet(&self, wallet_id: &str, event: &SandboxEvent) -> Result<(), NotifyError>;
    async fn deliver_webhook(&self, url: &str, payload: &[u8], sig: &str) -> Result<(), NotifyError>;
}
```

Sandbox: `StdoutNotifications` — prints to stdout via tracing. `NullNotifications` — discards.
Production: implement against FCM (Android), APNs (iOS), and HTTP webhook delivery.

### RoutingProvider

Decides which payment rail to use for a given payment instruction.

```text
pub trait RoutingProvider: Send + Sync {
    async fn select_rail(&self, req: RoutingRequest) -> Result<Rail, RoutingError>;
}
```

Sandbox: `MockRouting` — supports `verbose` (always succeeds), `failing` (always fails),
and `degraded` (intermittent) modes for testing error paths.
Production: implement against EMIS routing tables and operator rail registry.

---

## Provider composition

The sandbox operator wires all four providers at startup:

```text
let state = AppState {
    acquirer:     Arc::new(FakeAcquirer::new()),
    settlement:   Arc::new(SimulatedSettlement::new()),
    notifications: Arc::new(StdoutNotifications::new()),
    routing:      Arc::new(MockRouting::verbose()),
    // ... rest of state
};
```

A production operator swaps each provider for its production implementation:

```text
let state = AppState {
    acquirer:     Arc::new(EmisAcquirer::from_config(&config)),
    settlement:   Arc::new(BicssSettlement::from_config(&config)),
    notifications: Arc::new(FcmApnsWebhook::from_config(&config)),
    routing:      Arc::new(EmisRoutingTable::from_config(&config)),
    // ...
};
```

No protocol core code changes. The protocol core only calls through the trait interfaces.

---

## Why this model

**Testability**: the sandbox runs without any external services. `cargo test`
never touches a bank, SMS gateway, or cloud service.

**Operator independence**: two operators can use completely different banking
rails, notification providers, and routing strategies — both conforming to the
same BANZA protocol.

**Progressive integration**: an operator can start with simulated providers and
swap one at a time as production infrastructure is onboarded.

---

## Sandbox provider locations

| Provider | Crate |
|----------|-------|
| FakeAcquirer | `reference/fake-acquirer/` |
| SimulatedSettlement | `reference/simulated-settlement/` |
| StdoutNotifications / NullNotifications | `reference/local-notifications/` |
| MockRouting | `reference/mock-routing/` |
