# Compatibility Policy

Version: 1.0 · Governance status: Ratified

This document defines what Banza considers a breaking change, how versions
are assigned, how deprecations are signalled, and what consumers can rely on.

---

## Stability levels

Every surface in Banza carries one of three stability levels. The level
determines the backward-compatibility guarantee.

### Stable

A stable surface will not have breaking changes in any minor or patch release.
Breaking changes require a new major version, an Architecture Decision Record,
and a minimum 90-day deprecation notice.

Stable surfaces:

- Double-entry ledger primitives — debit/credit semantics, entry structure
- Wallet primitives — balance model, wallet types, creation semantics
- Transaction FSM — state names (`pending`, `completed`, `failed`, `cancelled`)
- Transfer model — request/response fields (extensions allowed, removals not)
- QR payload format — `contracts/qr/` (adding new optional fields is allowed)
- Event type names — `wallet.created`, `payment.sent`, etc.
- Webhook signature scheme — HMAC-SHA256 + timestamp window
- Provider trait interfaces — `AcquirerProvider`, `SettlementProvider`, `NotificationProvider`, `RoutingProvider`
- SDK conformance contract — webhook signature and payload-parsing vectors in `conformance/sdk/` that any third-party SDK verifies against (BANZA ships no official SDK; see `docs/reference/en/BANZA_REFERENCE.md` § SDKs)
- OpenAPI contract — all `contracts/openapi/` schemas marked `x-stability: stable`

### Experimental

Experimental surfaces may change in any release. Changes are announced in
release notes but do not require an ADR or deprecation period.

Experimental surfaces:

- Operator discovery manifest (`/.well-known/banza/operator.json`)
- Cross-operator routing and settlement
- Offline payment modes
- Capability negotiation protocol
- `banza-capabilities` crate (capability set definitions)
- SDK conformance test vectors (new vectors may be added at any time)

### Internal

Internal surfaces are not part of the public API. They may change or disappear
without notice.

Internal surfaces:

- Sandbox seed wallet IDs and balances (reset on restart)
- Simulated provider internals (FakeAcquirer, SimulatedSettlement, etc.)
- Demo wallet UI HTML/CSS/JS
- `reference/` directory structures and implementation details
- Local ledger SQLite schema (used by banza-local-ledger only)
- In-memory state layout of the sandbox operator

---

## Version scheme

Banza follows Semantic Versioning 2.0 for all crates and SDKs:

```
MAJOR.MINOR.PATCH
```

| Increment | When |
|-----------|------|
| `PATCH` | Bug fixes with no API change |
| `MINOR` | New stable features, new experimental features, new optional fields, deprecation notices |
| `MAJOR` | Breaking changes to stable surfaces |

### What counts as a breaking change

- Removing a required request field
- Removing a response field that was previously always present
- Changing the type or format of an existing field
- Removing or renaming an event type
- Changing the QR payload structure in a non-additive way
- Removing an HTTP endpoint
- Changing a provider trait method signature
- Changing the HMAC webhook signature scheme

### What does NOT count as a breaking change

- Adding new optional request fields (with defaults)
- Adding new response fields
- Adding new event types
- Adding new HTTP endpoints
- Adding new provider trait methods (if given default implementations)
- Adding new enum variants (consumers must handle unknown variants)
- Improving error messages without changing error codes

---

## Deprecation process

1. **Announce** — a `MINOR` release adds a deprecation notice in the relevant
   docs and release notes. Deprecated fields/endpoints remain functional.

2. **Minimum notice** — stable surfaces get a minimum **90-day** deprecation
   period. Experimental surfaces may be removed in any release.

3. **Removal** — a `MAJOR` release removes the deprecated surface. The ADR for
   that major release references the original deprecation notice.

4. **SDK guidance** — deprecated SDK methods emit a runtime warning. The warning
   includes the version in which the method will be removed and the replacement.

---

## Contract files

The canonical specification for each protocol component lives in `contracts/`:

| Directory | Contents | Stability |
|-----------|----------|-----------|
| `contracts/openapi/` | REST API definitions | Stable fields marked `x-stability: stable` |
| `contracts/webhooks/` | Webhook payload schemas | Stable |
| `contracts/qr/` | QR payload format | Stable |
| `contracts/events/` | Event schemas | Stable |
| `conformance/` | Conformance test vectors | Experimental (additive) |

Changes to stable contract files require an ADR and a minimum 7-day review
period. See [docs/governance/README.md](../../docs/governance/README.md).

---

## Checking compatibility

The `tools/check-openapi-compatibility.sh` script compares two OpenAPI specs
and reports breaking changes:

```bash
./tools/check-openapi-compatibility.sh \
  contracts/openapi/reference-operator.yaml \
  contracts/openapi/reference-operator-previous.yaml
```

See `tools/check-openapi-compatibility.sh --help` for usage.
