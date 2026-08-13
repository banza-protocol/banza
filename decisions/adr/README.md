# BANZA — Architecture Decision Records

Why the current BANZA architecture looks the way it does. Each record states one decision, why BANZA
needs it, what was considered instead, and what it costs.

**ADRs are not normative.** They explain; they never bind. What binds an implementation is the
normative surface — `contracts/`, `spec/`, `conformance/` and the registries — indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
An implementer who never opens this directory can still implement BANZA completely and correctly.

| ADR | Decision |
|---|---|
| [ADR-001](ADR-001-open-financial-protocol-what-banza-is-and-is-not.md) | Open financial protocol: what BANZA is and is not |
| [ADR-002](ADR-002-ecosystem-naming-banza-banzai-and-operators.md) | Ecosystem naming: BANZA, BanzAI and operators |
| [ADR-003](ADR-003-three-institutional-layers.md) | Three institutional layers |
| [ADR-004](ADR-004-technical-certification-is-not-scheme-admission-and-not-regu.md) | Technical certification is not scheme admission and not regulatory authorisation |
| [ADR-005](ADR-005-regulatory-state-boundary-and-the-real-money-activation-gate.md) | Regulatory-state boundary and the real-money activation gate |
| [ADR-006](ADR-006-designated-operator-scheme.md) | Designated operator scheme |
| [ADR-007](ADR-007-conflict-of-interest-infrastructure-and-key-separation.md) | Conflict of interest: infrastructure and key separation |
| [ADR-008](ADR-008-protocol-infrastructure-independent-of-any-operator.md) | Protocol infrastructure independent of any operator |
| [ADR-009](ADR-009-normative-authority-and-versioning.md) | Normative authority and versioning |
| [ADR-010](ADR-010-banza-canonical-json-bcj-1.md) | BANZA Canonical JSON (BCJ/1) |
| [ADR-011](ADR-011-double-entry-ledger-and-monetary-precision.md) | Double-entry ledger and monetary precision |
| [ADR-012](ADR-012-account-and-participant-identity.md) | Account and participant identity |
| [ADR-013](ADR-013-provider-abstraction.md) | Provider abstraction |
| [ADR-014](ADR-014-payment-intent.md) | Payment intent |
| [ADR-015](ADR-015-payment-session.md) | Payment session |
| [ADR-016](ADR-016-qr-payments.md) | QR payments |
| [ADR-017](ADR-017-payment-links.md) | Payment links |
| [ADR-018](ADR-018-payment-collections.md) | Payment collections |
| [ADR-019](ADR-019-wallet-accounts.md) | Wallet accounts |
| [ADR-020](ADR-020-wallet-payments-and-the-refund-source-model.md) | Wallet payments and the refund source model |
| [ADR-021](ADR-021-fees-and-application-settlement.md) | Fees and application settlement |
| [ADR-022](ADR-022-transaction-proof-and-public-verification.md) | Transaction proof and public verification |
| [ADR-023](ADR-023-reason-codes.md) | Reason codes |
| [ADR-024](ADR-024-idempotency.md) | Idempotency |
| [ADR-025](ADR-025-environment-isolation-sandbox-and-production.md) | Environment isolation: sandbox and production |
| [ADR-026](ADR-026-postgresql-as-protocol-state-store-not-a-ledger.md) | PostgreSQL as protocol state store, not a ledger |
| [ADR-027](ADR-027-open-protocol-trust-model-without-a-certificate-authority.md) | Open protocol trust model without a certificate authority |
| [ADR-028](ADR-028-root-authorization-three-authorities-threshold-two.md) | Root authorization: three authorities, threshold two |
| [ADR-029](ADR-029-keys-never-on-serving-infrastructure.md) | Private keys never reside on serving infrastructure |
| [ADR-030](ADR-030-anti-rollback-for-versioned-trust-material.md) | Anti-rollback for versioned trust material |
| [ADR-031](ADR-031-federation-trust-evaluation-without-certificates.md) | Federation trust evaluation without certificates |
| [ADR-032](ADR-032-kyc-stays-operator-policy-only-trust-assertions-federate.md) | KYC stays operator policy; only trust assertions federate |
| [ADR-033](ADR-033-operator-self-publication-and-machine-verifiable-conformance.md) | Operator self-publication and machine-verifiable conformance |
| [ADR-034](ADR-034-conformance-and-interoperability-certification.md) | Conformance and interoperability certification |
| [ADR-035](ADR-035-closed-certification-state-machine.md) | Closed certification-state machine |
| [ADR-036](ADR-036-banza-technical-registry.md) | BANZA Technical Registry |
| [ADR-037](ADR-037-canonical-discovery-surface.md) | Canonical discovery surface |
| [ADR-038](ADR-038-endpoint-originated-operator-validation.md) | Endpoint-originated operator validation |
| [ADR-039](ADR-039-conformance-profiles-and-capability-vocabulary.md) | Conformance profiles and capability vocabulary |
| [ADR-040](ADR-040-operator-onboarding.md) | Operator onboarding |
| [ADR-041](ADR-041-operator-zero-the-read-only-reference-implementation.md) | Operator Zero: the read-only reference implementation |
| [ADR-042](ADR-042-banzai-a-non-authoritative-interface-to-the-protocol.md) | BanzAI: a non-authoritative interface to the protocol |
| [ADR-043](ADR-043-rust-first-official-engines.md) | Rust-first official engines |
| [ADR-044](ADR-044-licence-notice-trademark-and-open-governance.md) | Licence, notice, trademark and open governance |
| [ADR-045](ADR-045-current-only-canonical-adr-tree.md) | Current-only canonical ADR tree |
