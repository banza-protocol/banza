# Stability Levels

Every public surface of the BANZA protocol core is marked with a stability level.
This tells you what you can safely depend on and what may still change.

---

## Stable

These surfaces are safe to depend on. Breaking changes require:

1. A major semver bump
2. A minimum 90-day deprecation period with a clear migration path
3. An ADR documenting the change and rationale

---

### Ledger primitives — `banza-ledger`

- `PostingBuilder`, `LedgerEntry`, `LedgerAccount`
- Double-entry invariant: every posting sums to zero
- Append-only semantics: entries are never modified or deleted
- Derived balance: `SUM(CREDIT) - SUM(DEBIT)`, never stored

### Wallet primitives — `banza-wallets`, `banza-types`

- `Wallet`, `WalletBalance`, `Money`, `Currency`
- No-negative-balance invariant
- Atomic balance updates

### Transaction FSM — `banza-transactions`

- Core state transitions and their invariants
- States: `initiated → authorised → captured → settled | failed | refunded`

### Transfer model — `banza-transfers`

- `TransferRequest`, `TransferResult`
- Idempotency semantics: same key, same result, always
- Double-entry guarantee on every transfer

### QR payload format — `banza-qr`, `contracts/qr/`

- `BANZA:{base64json}` payload structure and field names
- QR code lifecycle: `active → paid | expired`
- Sandbox variant uses `BANZA-SBX:` prefix

### Event types — `contracts/events/`

- Canonical event names: `payment.sent`, `payment.received`, `wallet.created`, etc.
- Payload schemas and required fields
- Ordering guarantees: events are emitted in operation order

### Webhook signature scheme — `contracts/webhooks/`

- HMAC-SHA256 over the raw request body
- `Banza-Signature` header format
- Key rotation protocol

### Provider trait interfaces — `banza-acquiring`, `banza-routing`, `banza-settlement`, `banza-notifications`

- `AcquirerProvider`, `RoutingEngine`, `SettlementExecutionProvider`, `NotificationProvider`
- Method signatures and error types
- These are the interfaces operators implement

---

## Experimental

These surfaces are under active design. Breaking changes may happen without a
deprecation period. Use them in exploratory or prototype code, not production systems.

Experimental surfaces are explicitly marked as **experimental** in the specifications and contracts that define them.

---

### Operator discovery — RFC-0005

- `/.well-known/banza/operator.json` manifest format
- Field names and capability flags may change
- Federation and multi-operator routing not yet ratified

### Cross-operator routing — RFC-0001

- `InteropRoutingEngine` trait
- `OperatorRouteRequest`, `OperatorRoutingDecision` structs
- The full multi-operator message flow is not yet defined

### Cross-operator settlement — RFC-0002

- `CrossOperatorSettlementProvider` trait
- `InteropObligation` struct
- Bilateral netting protocol not yet ratified

### Offline payments — RFC-0006

- Offline Payment Token (OPT) format
- `OfflineAllowance` reservation model
- Deferred settlement flow

### Capability negotiation — RFC-0004

- `ProviderCapabilityDescriptor` struct
- `KernelCapabilityMap`
- Graceful degradation semantics

### Wallet capability sets — RFC-0003

- `WalletCapabilitySet` flags
- `WalletOperation` enum
- `WalletKind` variants

### Conformance suite — `conformance/`

- Test vector format may change between releases
- Compliance pass/fail definitions are not yet frozen

### `banza-capabilities` crate

- The entire crate is experimental
- All types in it may change without notice

---

## Internal

These surfaces exist for sandbox/reference use or are annotated `#[doc(hidden)]`.
They are **not** public API surfaces and may change without any notice.

Do not depend on internal surfaces in production operators or SDKs.

---

### Sandbox seed data

- Wallet IDs (`sandbox-consumer-1`, etc.) and opening balances
- May change between sandbox releases

### Simulated provider internals

- `FakeAcquirer` implementation details
- `SimulatedSettlementProvider` internals
- `StdoutNotificationProvider` log format

### Demo wallet UI

- `reference/demo-wallet/index.html` is educational only
- Not a stable contract — may be rewritten at any time

### Local ledger SQLite schema

- `reference/local-ledger/` internal schema
- Used only in `reference/` — not a protocol contract

### Debug event formats

- stdout log lines from simulated providers
- Not machine-parseable contracts

---

## Stability in practice

### For contributors

If your PR changes a **Stable** surface:
1. Explain the breaking change in the PR description
2. Propose a migration path and deprecation timeline
3. The change requires an ADR and a minimum 7-day review period

If your PR changes an **Experimental** surface:
1. Document what changed and why in the PR description
2. Update the relevant RFC if the change is protocol-level
3. Normal review applies (no minimum period, but get 2 approvals)

If your PR changes an **Internal** surface:
1. Normal review applies
2. No deprecation path required

### For operators building on Banza

Depend only on **Stable** surfaces in production. Use **Experimental** surfaces
behind a feature flag and plan to upgrade when they are ratified.

### For SDK authors

Test against the **conformance suite** in `conformance/`,
but note that the suite is **Experimental** — its format may change. Pin to a
specific commit if you need reproducible certification runs.
