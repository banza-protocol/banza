# BANZA — Architecture Decision Records

This directory contains the active ADRs of the BANZA Open Financial Protocol.
Each record documents one architectural decision that governs the protocol. The
identifiers are preserved as canonical references and may be cited by documents,
diagrams and public pages. RFCs (see `../rfc/`) document proposals and
discussions; an accepted RFC may lead to an ADR.

## Active ADRs

| ADR | Subject |
|---|---|
| [ADR-001](ADR-001-open-financial-protocol.md) | BANZA as Open Financial Protocol |
| [ADR-002](ADR-002-ecosystem-naming-inversion.md) | Ecosystem Naming Inversion |
| [ADR-003](ADR-003-operator-separation.md) | Protocol/Operator Separation |
| [ADR-005](ADR-005-protocol-first-product-development.md) | Protocol-first product development |
| [ADR-006](ADR-006-double-entry-ledger.md) | Double-Entry Ledger and Monetary Precision |
| [ADR-007](ADR-007-double-entry-invariant-enforcement.md) | Double-Entry Invariant: Enforcement Strategy |
| [ADR-008](ADR-008-markdown-first-content-architecture.md) | ADR-008: Markdown-First Content Architecture — docs/reference/en/complete.md as Single Source of Truth |
| [ADR-009](ADR-009-provider-abstraction.md) | Provider Abstraction Model |
| [ADR-010](ADR-010-account-participant-identity.md) | Account/Participant Identity Model (Account-Based, Not Card-First) |
| [ADR-011](ADR-011-idempotency-and-rate-limiting.md) | Idempotency and Rate Limiting |
| [ADR-012](ADR-012-qr-payment-system.md) | QR Code Payment System |
| [ADR-013](ADR-013-payment-links.md) | Payment Links: Shareable URL Commerce Primitive |
| [ADR-014](ADR-014-payment-intent.md) | Payment Intent: the canonical payment-initiation primitive |
| [ADR-015](ADR-015-payment-session-unified-payment-interface.md) | Payment Session: the unified payment interface |
| [ADR-016](ADR-016-payment-collections.md) | Payment Collections (split / shared / group payments) |
| [ADR-017](ADR-017-wallet-native-payment-refund-source-model.md) | Wallet/account merchant payments and refund source model |
| [ADR-018](ADR-018-merchant-refundable-source-reference.md) | Merchant-facing refundable-source reference on paid payment events |
| [ADR-019](ADR-019-fee-and-application-settlement-architecture.md) | Generic Fee & Application-Settlement Architecture |
| [ADR-020](ADR-020-wallet-accounts-segregated-accounts.md) | Wallet Accounts (Segregated Accounts within a Wallet) |
| [ADR-021](ADR-021-conformance-suite-level-capability-alignment.md) | BANZA v1.0 conformance level capability alignment |
| [ADR-023](ADR-023-transaction-proof-standard.md) | Transaction Proof Standard |
| [ADR-024](ADR-024-public-verification-pages.md) | Public Verification Pages |
| [ADR-025](ADR-025-interactive-financial-documents.md) | Interactive Financial Documents |
| [ADR-028](ADR-028-keys-never-on-serving-infrastructure.md) | Private keys never reside on serving infrastructure |
| [ADR-029](ADR-029-kyc-operator-boundary-and-trust-assertions.md) | KYC stays operator policy; only Trust Assertions may federate |
| [ADR-030](ADR-030-environment-isolation.md) | Environment Isolation: Sandbox vs Production |
| [ADR-031](ADR-031-canonical-verification-routes-and-preproduction.md) | Canonical verification routes and honest empty-state behaviour |
| [ADR-033](ADR-033-dedicated-independent-infrastructure.md) | Dedicated infrastructure, independent of any operator |
| [ADR-034](ADR-034-dedicated-postgresql-and-backups.md) | Dedicated PostgreSQL and encrypted off-VM backups |
| [ADR-035](ADR-035-deploy-model.md) | Deploy model: Docker Compose, pinned images, secrets outside Git |
| [ADR-036](ADR-036-dns-and-tls.md) | DNS and TLS: Cloudflare proxied, Full (strict), Origin Certificate |
| [ADR-037](ADR-037-rust-first-official-engines.md) | Rust-first policy for official BANZA and BanzAI engines |
| [ADR-038](ADR-038-open-protocol-trust-model-without-ca.md) | Open Protocol Trust Model Without CA |
| [ADR-039](ADR-039-operator-self-publication-and-machine-verifiable-conformance.md) | Operator Self-Publication and Machine-Verifiable Conformance |
| [ADR-040](ADR-040-federation-trust-evaluation-without-certificates.md) | Federation Trust Evaluation Without Certificates |
| [ADR-041](ADR-041-banzai-native-protocol-agent.md) | BanzAI as Native Protocol Agent |
| [ADR-042](ADR-042-postgresql-as-protocol-state-store.md) | PostgreSQL as Protocol State Store, not a Financial Ledger |
| [ADR-043](ADR-043-license-notice-trademark-open-governance-attribution.md) | License, Notice, Trademark and Open Governance Attribution |
| [ADR-044](ADR-044-banzai-local-qwen-inference-runtime.md) | BanzAI Local Qwen Inference Runtime |
| [ADR-045](ADR-045-banzai-local-qwen-latency-tuning-default-readiness.md) | BanzAI Local Qwen Latency Tuning and Default Readiness |
| [ADR-046](ADR-046-banzai-disable-qwen-reasoning-prefix-warmup.md) | BanzAI: Disable Qwen Reasoning & Warm the System-Prompt Prefix |
| [ADR-047](ADR-047-banzai-local-qwen-384-token-default.md) | BanzAI: local_qwen 384-token Default Output Budget |
| [ADR-048](ADR-048-banzai-qwen-first-grounded-routing.md) | BanzAI: Qwen-first Grounded Routing & Deterministic Fallback |
| [ADR-049](ADR-049-banzai-protocol-agent-core.md) | BanzAI: Protocol Agent Core (operational intents, onboarding, documentary index) |
| [ADR-050](ADR-050-banzai-unified-public-interface.md) | BanzAI: Unified Same-Origin Public Interface |
| [ADR-051](ADR-051-banzai-per-answer-execution-path-metadata.md) | BanzAI: Per-Answer Execution-Path Metadata |
| [ADR-052](ADR-052-operador-zero-reference-payment-operator-simulator.md) | Operador Zero reference implementation (original decision; read-only framing updated by ADR-067) |
| [ADR-053](ADR-053-operator-zero-only-demo-and-example-policy.md) | Operator Zero Only demo and example policy |
| [ADR-054](ADR-054-banzai-primary-human-operator-interface.md) | BanzAI as the Primary Human-Operator Interface for the BANZA protocol |
| [ADR-055](ADR-055-banzai-rust-first-grounded-synthesis.md) | Rust-First Grounded Synthesis for BanzAI |
| [ADR-056](ADR-056-banzai-definitive-query-core-and-production-assurance.md) | Definitive Query Core, Canonical Knowledge Coverage and Production Assurance for BanzAI |
| [ADR-057](ADR-057-current-only-canonical-adr-tree.md) | Current-Only Canonical ADR Tree (Clean-Slate Governance Policy) |
| [ADR-058](ADR-058-trust-invariant-registry-realignment.md) | Trust Invariant Registry Realignment (retire the legacy trust-invariant namespace) |
| [ADR-059](ADR-059-three-layer-institutional-architecture.md) | BANZA Three-Layer Institutional Architecture |
| [ADR-060](ADR-060-banzami-operational-scheme.md) | Banzami Operational Scheme (designated operator; BANZA ≠ Banzami) |
| [ADR-061](ADR-061-certification-admission-authorisation-separation.md) | Technical Certification ≠ Scheme Admission ≠ Regulatory Authorisation |
| [ADR-062](ADR-062-regulatory-state-boundary-and-real-money-gate.md) | Regulatory-State Boundary and the RealMoneyActivationGate |
| [ADR-063](ADR-063-conflict-of-interest-and-domain-separation.md) | Conflict of Interest, Infrastructure and Key Separation |
| [ADR-064](ADR-064-conformance-interoperability-certification.md) | Conformance & Interoperability Certification (Layer 2) |
| [ADR-065](ADR-065-banza-technical-registry.md) | BANZA Technical Registry |
| [ADR-066](ADR-066-certification-state-machine.md) | Closed Certification-State Machine |
| [ADR-067](ADR-067-operador-zero-read-only-reference-and-banzai-validation-workbench.md) | Operador Zero: read-only canonical reference implementation, validated in BanzAI validation mode |
| [ADR-068](ADR-068-endpoint-originated-operator-validation-and-operator-implementation-model.md) | Endpoint-originated operator validation; operator↔implementation model |
| [ADR-069](ADR-069-simple-secure-operator-onboarding.md) | Simple, secure operator onboarding (passwordless email-OTP) |
| [ADR-070](ADR-070-banzai-navigable-contexts-single-interface.md) | BanzAI navigable contexts; single always-mounted interface |
| [ADR-071](ADR-071-banzai-canonical-runtime-and-reference-correction.md) | BanzAI canonical runtime and Reference correction |
| [ADR-072](ADR-072-banzai-runtime-ssot-route.md) | BanzAI runtime SSOT route (`/banzai/runtime`) |
| [ADR-073](ADR-073-banzai-mandatory-post-synthesis-validator.md) | Mandatory post-synthesis authority validator on the publish path |
| [ADR-074](ADR-074-simb-retirement-from-active-surfaces.md) | SimB retirement from active surfaces |
| [ADR-075](ADR-075-banzai-monorepo-consolidation-and-repository-removal.md) | BanzAI monorepo consolidation and separate-repository removal |
| [ADR-076](ADR-076-banzai-validation-journey-consolidation-and-durable-receipts.md) | BanzAI validation-journey consolidation, single technical-state authority, durable append-only receipts |
| [ADR-077](ADR-077-profile-applicability-model.md) | Profile applicability model for the validation journey (REQUIRED / OPTIONAL / NOT_APPLICABLE per conformance level) |
| [ADR-078](ADR-078-banzai-operational-reasoning-and-telemetry.md) | BanzAI operational reasoning + read-only telemetry over persisted executions + request-oriented honest fallback (INSUFFICIENT_MEASUREMENTS) |
| [ADR-079](ADR-079-canonical-trust-signing-model-reconciliation.md) | Canonical trust signing model reconciliation (the Trust Root signs only the Key Manifest — Model A) |
| [ADR-080](ADR-080-canonical-discovery-surface-reconciliation.md) | Canonical discovery-surface reconciliation (`.well-known/banza/operator.json` + `signed-protocol-metadata.json`) |
| [ADR-081](ADR-081-normative-completeness-versioning-decision.md) | Normative-completeness remediation: the protocol version stays 1.0.0 and the canonicalization is versioned separately |
| [ADR-082](ADR-082-banza-canonical-json.md) | BANZA Canonical JSON (`BCJ/1`) — a profile of RFC 8785 as the single byte form for signatures and digests |

> Gaps in the numbering (004, 022, 026, 027, 032) are intentional — those ADRs were removed under the clean-slate policy (ADR-057); numbers are stable identifiers, so survivors are never renumbered and history lives in Git.

## ADR and RFC

ADRs record architectural decisions already made. RFCs (`../rfc/`) record
proposals and discussions. An accepted RFC may lead to an ADR. Each ADR keeps
its identifier stable so that the Reference, diagrams and public pages can cite
it reliably.
