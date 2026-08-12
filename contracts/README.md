# contracts/

Canonical location for all public protocol contracts — the shared truth between BANZA protocol and its consumers.

## Purpose

A protocol contract is any artifact that defines a formal interface that operator implementations may expose or consume when implementing BANZA. Contracts are used by candidate operator implementations, conformance tooling, public verification services, and documentation and examples. Contracts must be versioned, reviewed as breaking changes, and must not live only in prose documentation once implementation begins.

## Subdirectories

| Directory | Contents |
|-----------|----------|
| `openapi/` | OpenAPI 3.x specifications for the public REST API |
| `webhooks/` | JSON Schema definitions for all webhook event payloads |
| `qr/` | QR payload format specification and encoding rules |
| `events/` | Internal and external domain event schemas |
| `payment-intents/` | PaymentIntent primitive schema (ADR-014) — the canonical payment-initiation concept |
| `collections/` | Collection, CollectionShare, CollectionRule schemas + state machine (ADR-016) |
| `fees/` | BusinessCategory, PricingProfile, FeePolicyRef + OperatorFee schemas (ADR-019) — reference-only fee concepts; **no percentages** |
| `settlements/` | ApplicationSettlement schema + state machine (ADR-019) — the deferred app-to-beneficiary settlement primitive |
| `wallet-accounts/` | WalletAccount schema (ADR-020) — segregated accounts inside a wallet; PRIMARY + purpose-tagged accounts (CAMPAIGN, ESCROW, …) with isolated balances |
| `payment-sessions/` | PaymentSession + PaymentSessionInterface schemas (ADR-015) — a PaymentIntent presented through one or more interfaces (Payment Link, Dynamic QR, Static QR, Deep Link), all resolving to the same session and destination. **Payment Link, QR and Deep Link are interfaces; the Payment Session is the financial object.** |

## Conformance vectors

Conformance test vectors (test suites and reference payloads) live in the top-level
[`conformance/`](../conformance/) directory — the authoritative source for conformance
testing and certification-governance review. They are protocol artifacts, not contracts, and are governed
by the same ADR process.

## Endpoint-originated operator validation (ADR-068)

Reference/documentary contracts for BanzAI's endpoint-originated validation surface (ADR-068). These
describe the operator/implementation model, the registry-resolved artifacts and the receipts; they add
**no** new financial invariant. See [ADR-068](../decisions/adr/ADR-068-endpoint-originated-operator-validation-and-operator-implementation-model.md)
and the BANZA Reference (chapters 7–9 & 12).

| Artifact | File |
|----------|------|
| Operator record (responsible entity) | `production/operator-record.production.schema.json` |
| Implementation record (system evaluated) | `production/implementation-record.production.schema.json` |
| Discovery document (step 1) | `production/discovery-document.production.schema.json` |
| Capabilities document | `production/capabilities-document.production.schema.json` |
| Signed protocol metadata (reused) | `production/signed-protocol-metadata.production.schema.json` |
| Federation manifest (reused) | `federation/federation-manifest.json` |
| OperationReceipt (§30) | `production/operation-receipt.production.schema.json` |
| JourneyReceipt (§31) | `production/journey-receipt.production.schema.json` |
| Validation surface (OpenAPI) | `openapi/operator-validation.yaml` — `POST /banzai/validate/step`, `POST /banzai/validate/journey` |

The operator is the responsible entity; the implementation is the technical system evaluated. Official
validation uses **exclusively artifacts obtained from the public endpoints** of the selected
implementation, resolved through the closed Technical Registry and fetched by the secure Rust fetcher
(`engines/banza-artifact-fetcher`). Presence in the registry is never certification, scheme admission, or
regulatory authorisation, and never moves funds.

## Rules

- Every new public protocol contract must land here first.
- Contracts must be versioned (`v1/`, `v2/`) if they can evolve independently.
- No protocol contract may exist only in prose documentation (`docs/`) once implementation begins.
- Breaking changes to a contract require an ADR.
