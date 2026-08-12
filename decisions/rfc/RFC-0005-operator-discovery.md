---
rfc: 0005
title: Operator Discovery
status: Draft
created: 2026-05-28
authors: ["Banza Core Team"]
requires: [0001, 0004]
---

## Summary

Define a future mechanism by which Banza operators announce their capabilities
to the ecosystem, enabling routing, interoperability, and multi-operator
coordination without a central registry.

## Motivation

For the multi-operator routing model (RFC-0001) to work, routing engines must
know which operators exist and what capabilities they have. Today, operators are
configured statically. As the ecosystem grows:

- New operators appear without needing to update every other operator's config.
- Operators change their capabilities over time.
- Routing engines need up-to-date capability information.
- Interoperability is blocked if operators cannot find each other.

## Problem statement

In the current model, if Operator A wants to route a payment to a Merchant on
Operator B, Operator A must have Operator B's endpoint and capabilities
hard-coded in its configuration. This is:

- **Fragile**: Config updates required whenever Operator B changes.
- **Non-scalable**: Does not work with hundreds of operators.
- **Centralised**: Requires a shared configuration store or manual coordination.

## Proposed solution

### Protocol Capability Manifest

Each operator publishes an **Protocol Capability Manifest** — a signed JSON document
describing its identity and capabilities:

```json
{
  "operator_id": "banza-prod",
  "operator_version": "1.2.0",
  "banza_kernel_version": "0.1.x",
  "endpoint": "https://interop.banza.ao",
  "supported_protocols": ["qr-v1", "qr-v2", "transfer-v1"],
  "settlement_modes": ["bilateral-netting", "rtgs"],
  "supported_currencies": ["AOA", "USD"],
  "capabilities": {
    "qr_payments": true,
    "p2p_transfers": true,
    "cross_operator_settlement": true,
    "consumer_wallets": true,
    "merchant_wallets": true,
    "offline_payments": false,
    "cbdc": false
  },
  "public_key": "ed25519:base64...",
  "manifest_version": 1,
  "issued_at": "2026-05-28T00:00:00Z",
  "expires_at": "2026-08-28T00:00:00Z"
}
```

Manifests are:
- Cryptographically signed by the operator.
- Published at a well-known URL (`/.well-known/banza-operator.json`).
- Valid for a finite duration and renewed periodically.

### Discovery modes

**Mode A — Direct**: Routing config specifies an operator endpoint URL.
The routing engine fetches the manifest and caches it. Simple for small ecosystems.

**Mode B — DNS-based**: Operators publish a DNS TXT record:
`_banza.example.ao TXT "https://interop.example.ao/.well-known/banza-operator.json"`

**Mode C — Federated registry**: A community-operated registry indexes manifests.
The registry does not have authority — it is an index only. Operators are
authoritative for their own manifests.

This RFC does not mandate a specific mode. All three should be supportable by
the same manifest format.

### Routing announcements

Operators may optionally publish routing announcements — a signed list of
`(currency, min_amount, max_amount, supported_rail)` tuples — allowing remote
routing engines to make decisions without contacting the operator for each payment.

## Alternatives considered

**Central registry with write access**: All operators register with a single
authority. Simple but creates a centralised control point. Inconsistent with
the open-protocol core philosophy.

**Gossip protocol**: Operators broadcast capability updates to each other via
a peer-to-peer protocol. Decentralised but complex to implement and susceptible
to Sybil attacks.

**Well-known URL (proposed)**: Each operator is authoritative for its own
manifest. Discovery is as simple as fetching a URL. Compatible with existing
web infrastructure (CDN caching, DNS, TLS certificates). No protocol changes
required.

## Compatibility impact

This RFC is purely additive. Operators that do not publish a manifest are simply
not discoverable. Single-operator deployments are unaffected.

## Security considerations

- Manifests must be cryptographically signed. Unsigned manifests must be rejected.
- TLS must be required for manifest endpoints.
- Manifest expiry prevents stale capability data from causing routing errors.
- Public keys for verification should not be bundled in the manifest itself
  (circular trust problem) — a separate key distribution mechanism is required.

## Operational considerations

- Manifest renewal must be automated — manual renewal is a reliability risk.
- Routing engines must handle manifest fetch failures gracefully (fall back to
  cached manifest, then to degraded routing).

## Migration concerns

This is a future capability. No migration from existing deployments is required.
Operators opt in by publishing a manifest.

## Unresolved questions

- How are public keys distributed if not in the manifest?
- What is the governance process for adding a new capability flag to the manifest?
- How does a routing engine handle conflicting manifests (operator publishes
  conflicting capabilities at two endpoints)?
- Should manifests be human-readable YAML or machine-optimised binary?
