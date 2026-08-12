# BANZA v1.0 — Normative Surface Inventory

> Companion to [`BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md`](BANZA_V1_OPEN_PROTOCOL_NORMATIVE_COMPLETENESS_AUDIT.md).
> Inventory only — nothing here changes any artifact. Classification is derived from each file's own
> declared fields (`_authority`, `_status`, `_source_of_truth`) and self-description.

## Classification key

| Value | Meaning |
|---|---|
| `normative` | Declares authority and does not defer to code as its source of truth |
| `mirror-of-code` | Declares `_source_of_truth` pointing at implementation code (see audit §5.4) |
| `documentary` | Self-describes as "documentary/reference contract — mirrors the Rust …" |

**Finding carried from the audit:** all five distinct code paths named as `_source_of_truth` are **absent
from this repository** — `tools/root-ceremony/ceremony_script.py`, `tools/banza-conformance/trust_root.py`,
`reference/sandbox-operator/src/events.rs`, `core/crates/banza-qr/src/qr_code.rs`,
`core/crates/banza-qr/src/engine.rs`.

## 1. Contracts

Total de artefactos JSON em contracts/: 72

| Path | Nome | Versão | Autoridade declarada | Classificação |
|---|---|---|---|---|
| `contracts/collections/collection-rule.schema.json` | CollectionRule | — | ADR-016 | normative |
| `contracts/collections/collection-share.schema.json` | CollectionShare | — | ADR-016 | normative |
| `contracts/collections/collection.schema.json` | Collection | — | ADR-016 | normative |
| `contracts/collections/state-machine.json` | BANZA Collections State Machine v1.0 | — | ADR-016 | normative |
| `contracts/events/envelope.schema.json` | BanzaEvent | — | ADR-002, INV-TRACE-001 | mirror-of-code |
| `contracts/events/types.json` | BANZA Internal Event Type Registry v1.0 | — | ADR-002 | mirror-of-code |
| `contracts/events/webhook-types.json` | BANZA Outbound Webhook Event Type Registry v1.0 | — | ADR-002 | normative |
| `contracts/federation/federation-event.json` | BanzaFederationEvent | — | ADR-040, INV-FED-001 | normative |
| `contracts/federation/federation-manifest.json` | BanzaFederationManifestExtension | — | ADR-040, RFC-0005, INV-FEDEVAL-007 | normative |
| `contracts/federation/federation-obligation.json` | BanzaFederationObligation | — | ADR-040, RFC-0002, INV-FED-002, IN | normative |
| `contracts/federation/federation-routing.json` | BanzaFederationRouting | — | ADR-040, RFC-0001, INV-FED-001, IN | normative |
| `contracts/federation/federation-trust.json` | BANZA Federation Trust Model Contract v1.0 | — | — | normative |
| `contracts/federation/key-manifest.json` | BanzaKeyManifest | — | ADR-038 | mirror-of-code |
| `contracts/federation/revocation-list.json` | BanzaRevocationList | — | ADR-038 | mirror-of-code |
| `contracts/fees/business-category.schema.json` | BusinessCategory | — | ADR-019 | normative |
| `contracts/fees/fee-policy-ref.schema.json` | FeePolicyRef | — | ADR-019 | normative |
| `contracts/fees/operator-fee.schema.json` | OperatorFee | — | ADR-019 | normative |
| `contracts/fees/pricing-profile.schema.json` | PricingProfile | — | ADR-019 | normative |
| `contracts/invariants.json` | BANZA Protocol — Canonical Invariant Registry | 1.0 | — | normative |
| `contracts/payment-intents/payment-intent.schema.json` | PaymentIntent | — | ADR-014 | normative |
| `contracts/payment-sessions/payment-session-interface.schema.json` | PaymentSessionInterface | — | ADR-015 | normative |
| `contracts/payment-sessions/payment-session.schema.json` | PaymentSession | — | ADR-015 | normative |
| `contracts/production/brl.production.schema.json` | BrlProduction | — | Production Trust; docs/security/BR | normative |
| `contracts/production/capabilities-document.production.schema.json` | CapabilitiesDocument | — | ADR-068 (§4.4 origin of inputs), A | documentary |
| `contracts/production/certification-profile.production.schema.json` | InteroperabilityCertificationProfile | — | engines/banza-certification (ADR-0 | normative |
| `contracts/production/certification-record.production.schema.json` | InteroperabilityCertificationRecord | — | engines/banza-certification (ADR-0 | normative |
| `contracts/production/certified-implementation.production.schema.json` | CertifiedImplementation | — | engines/banza-certification (ADR-0 | normative |
| `contracts/production/conformance-evidence.production.schema.json` | ConformanceEvidenceProduction | — | docs/governance/OPERATOR_SELF_PUBL | normative |
| `contracts/production/conformance-report.production.schema.json` | ConformanceReportProduction | — | conformance/ suite; ADR-007 (invar | normative |
| `contracts/production/delegated-signing-key.production.schema.json` | DelegatedSigningKeyProduction | — | docs/governance/PROTOCOL_GOVERNANC | normative |
| `contracts/production/discovery-document.production.schema.json` | DiscoveryDocument | — | ADR-068 (§4.4 origin of inputs, §2 | documentary |
| `contracts/production/evidence-bundle.production.schema.json` | EvidenceBundleProduction | — | Production Protocol Implementation | normative |
| `contracts/production/examples/certification-record.invalid-authorised-claim.json` | certification-record.invalid-authorised-claim.json | 1 | — | normative |
| `contracts/production/examples/certification-record.valid.json` | certification-record.valid.json | 1 | — | normative |
| `contracts/production/examples/regulatory-state.invalid-authorised-claim.json` | regulatory-state.invalid-authorised-claim.json | 1.0 | — | normative |
| `contracts/production/examples/regulatory-state.valid.json` | regulatory-state.valid.json | 1.0 | — | normative |
| `contracts/production/federation-trust-evaluation.production.schema.json` | FederationTrustEvaluationProduction | — | decisions/adr/ADR-040-federation-t | normative |
| `contracts/production/implementation-record.production.schema.json` | ImplementationRecord | — | ADR-068 (endpoint-originated opera | documentary |
| `contracts/production/interoperability-report.production.schema.json` | InteroperabilityReport | — | engines/banza-certification (ADR-0 | normative |
| `contracts/production/journey-receipt.production.schema.json` | JourneyReceipt | — | ADR-068 (§31 JourneyReceipt, §21 s | documentary |
| `contracts/production/key-manifest.production.schema.json` | KeyManifestProduction | — | Production Trust (PKI trust model, | normative |
| `contracts/production/operation-receipt.production.schema.json` | OperationReceipt | — | ADR-068 (§4.8 receipts, §30 Operat | documentary |
| `contracts/production/operator-manifest.production.schema.json` | OperatorCandidateSubmissionManifest | — | ADR-003 (operator separation), ADR | normative |
| `contracts/production/operator-record.production.schema.json` | OperatorRecord | — | ADR-068 (endpoint-originated opera | documentary |
| `contracts/production/operator-self-publication.production.schema.json` | OperatorSelfPublicationProduction | — | docs/governance/OPERATOR_SELF_PUBL | normative |
| `contracts/production/protocol-governance-event.production.schema.json` | ProtocolGovernanceEventProduction | — | docs/governance/PROTOCOL_GOVERNANC | normative |
| `contracts/production/protocol-release.production.schema.json` | ProtocolReleaseProduction | — | Production Protocol Implementation | normative |
| `contracts/production/protocol-version.json` | protocol-version.json | 1.0.0 | Production Protocol Implementation | normative |
| `contracts/production/public-protocol-registry.production.schema.json` | PublicProtocolRegistryProduction | — | docs/governance/OPERATOR_SELF_PUBL | normative |
| `contracts/production/regulatory-state.production.schema.json` | RegulatoryStateProduction | — | Three-Layer Institutional Architec | normative |
| `contracts/production/revocation-entry.production.schema.json` | RevocationEntryProduction | — | docs/governance/PROTOCOL_GOVERNANC | normative |
| `contracts/production/root-backup-declaration.production.schema.json` | RootBackupDeclarationProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-ceremony-evidence.production.schema.json` | RootCeremonyEvidenceProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-custody-declaration.production.schema.json` | RootCustodyDeclarationProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-delegation.production.schema.json` | RootDelegationProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-key.production.schema.json` | RootKeyProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-metadata.production.schema.json` | RootMetadataProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-recovery-test.production.schema.json` | RootRecoveryTestProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-revocation.production.schema.json` | RootRevocationProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/root-signature.production.schema.json` | RootSignatureProduction | — | Root Trust Ceremony (2-of-3 offlin | normative |
| `contracts/production/signed-protocol-metadata.production.schema.json` | SignedProtocolMetadataProduction | — | docs/governance/PROTOCOL_GOVERNANC | normative |
| `contracts/production/trust-root-metadata.production.schema.json` | TrustRootMetadataProduction | — | docs/governance/PROTOCOL_GOVERNANC | normative |
| `contracts/production/validation-journey-state-machine.production.json` | ValidationJourneyStateMachine | — | ADR-076 (§D-076-04 six-state model | normative |
| `contracts/proofs/transaction-proof.schema.json` | TransactionProof | — | ADR-023 | normative |
| `contracts/proofs/verification-response.schema.json` | VerificationResponse | — | ADR-023 | normative |
| `contracts/qr/lifecycle.json` | BANZA QR Code Lifecycle Specification v1.0 | — | ADR-012, INV-QR-001 | mirror-of-code |
| `contracts/qr/payload-format.json` | BANZA QR Payload Format Specification v1.0 | — | ADR-012, ADR-002, INV-QR-001 | mirror-of-code |
| `contracts/settlements/application-settlement.schema.json` | ApplicationSettlement | — | ADR-019 | normative |
| `contracts/settlements/state-machine.json` | ApplicationSettlement state machine | — | ADR-019 | normative |
| `contracts/wallet-accounts/wallet-account.schema.json` | WalletAccount | — | ADR-020 | normative |
| `contracts/webhooks/envelope.schema.json` | WebhookEvent | — | ADR-002 | normative |
| `contracts/webhooks/signature.json` | BANZA Webhook Signature Specification v1.0 | — | ADR-002 | normative |

## 2. Specification prose (`spec/`)

26 files. Normative *status* is not declared by these documents; they carry RFC-2119-style keywords (143
occurrences) without the convention being established anywhere (audit §5.2).

| Path | Role |
|---|---|
| `spec/README.md` | Protocol identity, technology neutrality, canonical payment model |
| `spec/invariants.md` | Invariant narrative (machine form: `contracts/invariants.json`) |
| `spec/overview.md`, `spec/payment-lifecycle.md`, `spec/qr-payment-lifecycle.md` | Lifecycle narratives |
| `spec/validation-journey.md` | Journey narrative (machine form: `contracts/production/validation-journey-state-machine.production.json`) |
| `spec/capability-negotiation.md`, `spec/provider-model.md`, `spec/collections.md`, `spec/disputes.md`, `spec/tracing.md` | Domain narratives |
| `spec/federation/*` (14 files) | Federation model, invariants (63 INV references), contract surface, traceability, failure scenarios, test-suite spec |

## 3. Conformance (`conformance/`)

| Artifact | Count | Note |
|---|---|---|
| Suites | 7 | events, federation, ledger, operators, qr, sdk, settlement |
| Vectors | 61 | across 9 vector files |
| Federation fixtures | 31 | executed as vectors by `banza-conformance` (37 fixture-backed cases) |
| Report schema | 1 | `conformance/report-schema.json` |

## 4. Decisions (`decisions/`)

| Type | Count | Status distribution |
|---|---|---|
| ADR | 76 | 73 Accepted · 1 Proposed · 1 DRAFT · 1 without status field |
| RFC | 6 | **6 Draft — none adopted** (`RFC-0001` routing, `RFC-0002` settlement, `RFC-0003` wallet capabilities, `RFC-0004` capability negotiation, `RFC-0005` discovery, `RFC-0006` offline payments) |

## 5. Governance and legal

| Path | Function | Audit status |
|---|---|---|
| `LICENSE` | Apache-2.0, incl. §3 patent grant | ALINHADO |
| `NOTICE` | Extends Apache-2.0 to **software and documentation**; separates marks | ALINHADO |
| `GOVERNANCE.md` | Decision process, participation, what governance does not do | ALINHADO (see §11 on maintainer record) |
| `CONTRIBUTING.md` | Inbound = outbound (Apache-2.0), SPDX; no CLA/DCO | P2 |
| `MAINTAINERS.md` | Institutional origin; **active maintainer list empty** | P2 |
| `TRADEMARKS.md` | Four-way separation; permits "Independent implementation of the BANZA protocol" | ALINHADO |
| `SECURITY.md` | Reporting process | Not separately assessed |

## 6. What is NOT in the normative surface

Recorded so the boundary is explicit:

- `engines/**` — reference implementation (Rust). Realises the protocol; does not define it.
- `services/**`, `website/**` — reference services and public surface.
- `docs/whitepaper/**` — descriptive, explicitly non-normative.
- `docs/reference/**`, `website/content/BANZA_REFERENCIA.md` — explanatory reference.
- `evidence/**` — executed evidence about the reference implementation.
- `tools/**` — build, guard and derivation tooling.
