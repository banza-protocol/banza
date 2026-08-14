# Changelog

All notable changes to the **BANZA Open Financial Protocol specification** are
recorded here. The format is based on [Keep a Changelog](https://keepachangelog.com/),
and the protocol specification is versioned with [Semantic Versioning](https://semver.org/).

## Versioning model

- **`VERSION`** holds the version of the **protocol specification** as a whole
  (contracts, invariants, conformance levels and the conformance suite).
- **Individual artifacts are versioned independently.** Each OpenAPI contract
  (`contracts/openapi/*`) and federation schema carries its own `version` field
  (e.g. `1.0`, `1.1`); the federation wire protocol pins `"1"`. The specification
  version in `VERSION` is the umbrella version, not a claim that every artifact
  shares that number.
- **This is a specification version, not a maturity claim.** A protocol
  specification version does **not** imply that any operator has published
  conformance evidence, that the production trust root exists, or that the protocol
  is deployed in production. See the status note below.

> **Status (not a production claim).** Specification milestone M1 is complete. The
> production root-key ceremony (M2) and protocol production (M3) remain on the
> roadmap, with no promised dates. The Public Protocol Registry publishes no operator
> metadata (`/operators` returns `[]`) and `production_certificates` remains `false`;
> no production Key Manifest is published. "v1.0" denotes the frozen specification
> surface, not production readiness.

## [Unreleased]

### Added
- ADR-015 — Payment Intent: canonical payment-initiation primitive (Accepted).
  Payment Links/QR/Payment Requests are surfaces of a PaymentIntent. New
  capability `supports_payment_intents` (Level 2); events `payment_intent.*`.
- ADR-016 — Payment Collections (Accepted, was Proposed): Collection +
  CollectionShare aggregates, extensible CollectionRule, state machines,
  `collection.*` events, per-share settlement via PaymentIntent → Transfer →
  Ledger (Collection holds no money, never touches the ledger). New capability
  `supports_collections` (Level 2). Contracts: `contracts/collections/*`,
  `contracts/openapi/collections.yaml`; vectors: `conformance/vectors/collections.json`;
  architecture: `spec/collections.md`. Scope v1: single-operator.
- `VERSION` and this `CHANGELOG.md` as the single protocol-version anchor.
- ADR-018 — Wallet-native merchant payments and refund source model (Accepted).
- Canonical conformance-level (L0–L4) naming and a deprecated-name crosswalk
  (`docs/governance/certification-boundary.md`).
- Invariant ID crosswalk mapping section-local IDs to canonical families
  (`spec/invariants.md`).
- Explicit trust-anchor distribution model and privacy/personal-data stance.

### Changed
- Conformance and reference docs aligned to one canonical L0–L4 taxonomy.
- Conformance wording expressed as machine-verifiable evidence — a PASS is evidence
  for the tested level, not human approval.
- SDK references made contract-first accurate (no official SDKs ship from this repo).
- Trust-anchor key distribution made protocol-owned (Key Manifest), not SDK-owned.
- Financial-invariant rules separated into normative (technology-neutral) statements
  and non-normative reference-implementation notes.

## [1.0.0] — Specification baseline

The v1.0 BANZA Open Financial Protocol specification surface: financial invariants,
double-entry ledger model, wallet-native identity, QR payments, payment links,
settlement and routing behaviour, the open contracts in `contracts/`, the
conformance suite in `conformance/`, the conformance framework (`docs/governance/certification-boundary.md`),
and the open federation trust model (ADR-025, ADR-031, ADR-025). Governed by the ADRs
in `decisions/adr/`.

This baseline is the specification as frozen at milestone M1. It carries no
production-readiness or production-deployment claim.
