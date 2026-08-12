---
rfc: 0003
title: Wallet Capabilities
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: []
---

## Summary

Define a capability flag model for wallets so that operators can declare which
wallet features they support without the protocol core assuming all wallets support all
flows.

## Motivation

The current `WalletEngine` assumes a fixed feature set: reserve, release, settle,
credit, debit. As the ecosystem grows, wallets will vary significantly:

- Consumer wallets (full features)
- Merchant wallets (no withdraw, limited reserve)
- CBDC wallets (government-controlled, compliance-gated)
- Escrow wallets (locked funds, time-release only)
- Custodial wallets (operator-controlled keys)
- Non-custodial wallets (user-controlled keys, offline-capable)

Each wallet type supports a different subset of operations. The protocol core must not
assume every wallet supports every flow.

## Problem statement

Currently:
- The protocol core calls `wallet.reserve()` without knowing if the wallet supports
  reserve semantics.
- If an operator deploys a wallet type that does not support `reserve`, there is
  no formal mechanism to signal this — the call will fail at runtime.
- There is no way for routing or orchestration code to check wallet capabilities
  before initiating a flow.

## Proposed solution

Define a `WalletCapabilitySet` struct that wallets declare at creation time:

```text
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WalletCapabilitySet {
    /// Wallet can hold a reserved (locked) balance pending confirmation.
    pub reserve:           bool,
    /// Wallet can release a reserved balance back to available.
    pub release:           bool,
    /// Wallet can settle a reserved balance to the counterparty.
    pub settle:            bool,
    /// Wallet can receive inbound credits.
    pub credit:            bool,
    /// Wallet can send outbound debits.
    pub debit:             bool,
    /// Wallet supports QR payment flows.
    pub qr_payments:       bool,
    /// Wallet supports P2P transfer flows.
    pub p2p_transfers:     bool,
    /// Wallet can be used as a payout destination.
    pub payout_target:     bool,
    /// Wallet supports refund operations.
    pub refunds:           bool,
    /// Maximum balance the wallet is permitted to hold (None = unlimited).
    pub max_balance_minor: Option<i64>,
    /// Currency restriction (None = any supported currency).
    pub currency_lock:     Option<Currency>,
}
```

The protocol core checks capabilities before initiating any flow:

```text
if !wallet.capabilities().reserve {
    return Err(WalletError::CapabilityNotSupported("reserve"));
}
```

### Capability version

Capability sets carry a `version: u32` field so future additions are
backwards-compatible. Existing capability sets with a lower version are
assumed to have `false` for any fields added in a higher version.

## Alternatives considered

**Trait-per-capability**: Define separate traits (`Reservable`, `Creditable`,
etc.) that wallet implementations opt into. More type-safe but creates a
combinatorial explosion of trait bounds in orchestration code.

**Runtime enum**: A `Vec<WalletFeature>` where each variant is a named feature.
Extensible but not zero-cost to check, and requires exhaustive matching on
every use.

**Struct of booleans (proposed)**: Simple, serializable, declarative. Trade-off:
adding a field in a later version requires a default value. Mitigated by the
`version` field and a `Default::default()` that conservatively returns `false`
for all capabilities.

## Compatibility impact

- `WalletCapabilitySet` is new. Existing wallets that do not declare capabilities
  get a minimal default set (credit + debit only) until they upgrade.
- The protocol core currently does not check capabilities — this RFC adds those checks,
  which may cause previously-silent runtime failures to surface as explicit
  `CapabilityNotSupported` errors. This is a breaking change for operators that
  rely on un-declared capabilities.

## Security considerations

- Capability declarations must not be user-modifiable at runtime.
- An operator must not be able to elevate a wallet's capabilities beyond what
  the operator has implemented.
- Compliance wallets (e.g., CBDC) must be able to declare capability restrictions
  that are enforced protocol core-side.

## Operational considerations

- Capability sets should be stored with the wallet record in the operator's ledger.
- Capability changes (e.g., a wallet being frozen) must trigger re-validation of
  any pending reserves.

## Migration concerns

Operators must declare capability sets for their wallet types. A migration guide
will map current wallet behaviour to capability flags. Operators that
do not migrate default to a restricted capability set.

## Unresolved questions

- Should capability checks be protocol core-enforced or advisory?
- How are capability sets versioned across operator upgrades?
- Can a wallet's capability set change after creation? Under what authority?
