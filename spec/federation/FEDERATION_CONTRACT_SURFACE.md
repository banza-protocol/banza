# BANZA Federation Contract Surface

**Document ID:** FEDERATION-CONTRACTS-DESIGN-001  
**Status:** Canonical — contract definitions. No implementation required to read this document.  
**Authority:** ADR-038 (open protocol trust model), ADR-039 (operator self-publication and machine-verifiable conformance), ADR-040 (federation trust evaluation)

---

## Overview

This document defines the five federation contracts that must exist before any L3 federation conformance work can begin. Each contract is a protocol-layer artifact — it specifies wire formats, field semantics, invariants, and validation requirements independently of any implementation.

**Contract set:**

| Contract | Path | Purpose |
|----------|------|---------|
| operator trust material | `contracts/production/signed-protocol-metadata.production.schema.json` + `contracts/production/conformance-evidence.production.schema.json` | Operator's self-published, machine-verifiable trust material, evaluated locally by each peer |
| `federation-routing` | `contracts/federation/federation-routing.json` | Cross-operator routing request/response wire format |
| `federation-obligation` | `contracts/federation/federation-obligation.json` | Obligation recorded per cross-operator payment |
| `federation-event` | `contracts/federation/federation-event.json` | Cross-operator event envelope |
| `federation-manifest` | `contracts/federation/federation-manifest.json` | Federation extension to the operator manifest |

These contracts are **prerequisites** for:
- Federation conformance vectors (GAP-005)
- Operator manifest signing implementation (GAP-008)
- InteropRoutingEngine implementation (GAP-003)
- L3 federation conformance (FED-L3-001 through FED-L3-014)

---

## Contract 1: signed protocol metadata + conformance evidence

### Purpose

In the BANZA open protocol, an operator earns interoperation by publishing verifiable material, not by receiving anything. The operator implements the Versioned Specifications, runs the Conformance Automation, and self-publishes two trust artifacts on infrastructure it controls:

- **Signed Protocol Metadata** (`contracts/production/signed-protocol-metadata.production.schema.json`) — authenticates the *measurement ruler*: which specification version, schemas, and conformance vectors are genuine, and their digests. Signed by the protocol-metadata delegated signing key, whose authority traces to the trust root through the root-signed Key Manifest (INV-ROOT-004; ADR-079). It asserts facts about protocol artifacts — never about the operator.
- **Conformance Evidence** (`contracts/production/conformance-evidence.production.schema.json`) — the deterministic, reproducible result of the Conformance Automation for a concrete `protocol_version`, bound by hashes to the operator's manifest and Evidence Bundle. Conformance is *measured*, never granted.

A federation peer fetches this material and runs the **Open Trust Evaluation** (ten conjunctive, fail-closed checks — ADR-040; normative shape in `contracts/production/federation-trust-evaluation.production.schema.json`) locally and deterministically before routing.

This is the material that answers: *"Does the operator's published material pass the Open Trust Evaluation at the conformance scope it claims — computed here, now, by the evaluating peer?"* The answer is a local decision about one interaction. It is never a status conferred on the operator.

### Ownership

| Role | Party | Responsibility |
|------|-------|----------------|
| Publisher | Operator | Runs the Conformance Automation; publishes its Operator Manifest, Signed Protocol Metadata, and Conformance Evidence at endpoints it controls; republishes before each validity window closes |
| Protocol-metadata signer | Trust root / delegated signing keys | Sign protocol metadata, releases, delegated keys, and the Revocation List — protocol artifacts, never participants |
| Evaluator | Any federation peer | Fetches the operator's published material and runs the Open Trust Evaluation locally and deterministically |
| Revocation | BANZA Revocation List (BRL) | A signed security signal over compromised or withdrawn cryptographic material; treated fail-closed. Never a sanction, a licence, or a judgement about an operator |

### Lifecycle

```
[Operator implements the Versioned Specifications]
      ↓
[Operator runs the Conformance Automation]  →  deterministic Conformance Evidence
      ↓
[Operator publishes Operator Manifest + Signed Protocol Metadata + Conformance Evidence
 on infrastructure it controls]  →  each artifact carries an explicit validity window
      ↓
[Any peer fetches the published material and runs the Open Trust Evaluation locally]
      ↓
  [ROUTING_ALLOWED]                    [FAIL_CLOSED]
  (all ten checks pass)    (missing / invalid / expired / revoked / incompatible)
```

The evaluation is a snapshot over one interaction. The same peer may return `FAIL_CLOSED` later if the material goes stale or a key is revoked, and `ROUTING_ALLOWED` again once the operator republishes fresh material. There is no admission and therefore no expulsion; recovery needs no one's permission.

**Freshness.** Every artifact declares a validity window. For a federation-capable conformance scope (L3+), the validity window of Signed Protocol Metadata and Conformance Evidence MUST NOT exceed 90 days (INV-FEDEVAL-006, INV-FED-006). Recovery belongs entirely to the operator: it re-runs the public automation and republishes.

### Signed Protocol Metadata — fields

Normative schema: `contracts/production/signed-protocol-metadata.production.schema.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metadata_id` | string | yes | Unique, immutable identifier of this signed metadata object |
| `metadata_type` | string | yes | One of `protocol_metadata`, `protocol_release`, `delegated_signing_key`, `revocation_list` — the four (and only) metadata classes signed within the trust chain (root-signed Key Manifest → domain delegated keys; the revocation list is signed by the revocation-domain key, INV-ROOT-005) |
| `protocol_version` | string | yes | Versioned Specifications version this metadata pins (e.g. `"1.0.0"`) |
| `content_hash` | object | yes | `sha-256` over the canonical bytes; recomputable by any independent verifier |
| `issued_at` | string (ISO 8601 UTC) | yes | Issuance time. Future-dated metadata is rejected |
| `expires_at` | string (ISO 8601 UTC) | yes | Expiry. Expired material is stale and MUST be treated as fail-closed (INV-FEDEVAL-006) |
| `trust_root_version` | string | yes | Trust root version this metadata must be verified under |
| `signatures` | array | yes | Detached ed25519 signatures over the canonical bytes, produced by the in-scope delegated signing key within its validity; authority is anchored in the root-signed Key Manifest — the root itself signs only the Key Manifest (INV-ROOT-004; threshold custody per INV-ROOT-007). Public material only |
| `revocation_status` | string \| null | no | State of this material against the Revocation List. `revoked` and `unknown` are treated as untrusted (fail-closed) |
| `boundary` | object | yes | Permanent boundary: not operator authorisation, not a certificate, not operator approval, not payment-service authorisation; open financial protocol |

### Conformance Evidence — fields

Normative schema: `contracts/production/conformance-evidence.production.schema.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operator_id` | string | yes | Operator identifier, chosen and published by the operator. Operator-agnostic; never a commercial brand; not assigned by any authority |
| `protocol_version` | string | yes | Versioned Specifications version conformance was demonstrated against |
| `conformance_report_hash` | string | yes | `sha-256` (lowercase hex) of the published conformance report; recomputable by any verifier |
| `evidence_bundle_hash` | string | yes | `sha-256` (lowercase hex) of the published Evidence Bundle; recomputable by any verifier |
| `verified_by_tool_version` | string | yes | Version of the Conformance Automation that produced the evidence — guarantees reproducibility |
| `trust_root_version` | string | yes | Trust root version under which `signed_protocol_metadata` was verified |
| `conformance_status` | string | yes | `pass` \| `fail` \| `not_run`. A `pass` is a verifiable fact about the implementation — not approval, acceptance, or authorisation |
| `signed_protocol_metadata` | object | yes | The Signed Protocol Metadata used in verification — authenticates the measurement ruler |
| `revocation_status` | string | no | State of the trust material against the Revocation List; `revoked`/`unknown` ⇒ fail-closed |
| `boundary` | object | yes | Permanent boundary: reproducible proof about an implementation, not a status granted to a participant |

### Signature Requirements

**Algorithm:** ed25519 (RFC 8032)  
**Signed content:** the canonical bytes of the Signed Protocol Metadata, over which `content_hash` is computed.  
**Signing parties:** the delegated signing key within its declared scope and validity, whose authority is anchored in the root-signed Key Manifest (the trust root signs only the Key Manifest, under offline threshold custody). Public key material only — no private key, seed, mnemonic, or passphrase ever appears in or is transmitted with these artifacts.  
**Verification:** any party, using the public key resolved from the active Key Manifest for the metadata's `issuer_key_id` (a delegated signing key listed in the root-signed Key Manifest). No party contacts BANZA at routing time.  

The operator's own artifacts — its Operator Manifest and Evidence Bundle — are signed by the operator with the key material declared in its Key Manifest. The trust root never signs an operator's manifest or evidence; it signs the protocol ruler those artifacts are measured against.

### Validation Requirements — the Open Trust Evaluation

The published material is accepted for a given interaction only when the Open Trust Evaluation returns `ROUTING_ALLOWED` — all ten conjunctive checks pass (ADR-040). The checks that bear on this trust material:

1. **Signed protocol metadata signature valid** — the metadata signature verifies against the public key resolved from the active Key Manifest for `issuer_key_id` (a delegated signing key listed in the root-signed Key Manifest). (INV-FEDEVAL-004)
2. **Trust-material freshness** — material MUST NOT be accepted after `expires_at`; for a federation-capable conformance scope (L3+), the validity window MUST NOT exceed 90 days. (INV-FEDEVAL-006, INV-FED-006)
3. **Conformance evidence valid** — `conformance_report_hash` and `evidence_bundle_hash` recompute, and the evidence re-executes with `verified_by_tool_version` against the vectors pinned by the signed metadata; `conformance_status == "pass"` for the negotiated `protocol_version`.
4. **Trust-root or delegated signature valid** — the signature chain resolves to the active trust root; no delegated key exercises authority beyond what the trust root delegates to it. (INV-ROOT-008)
5. **Not revoked** — no key, artifact, or implementation id the evaluation depends on appears in a valid, non-expired Revocation List. (INV-FEDEVAL-002, INV-FEDEVAL-005)
6. **Conformance scope sufficient** — the conformance scope is ≥ the scope the interaction requires (L3+ for federation routing). (INV-FEDEVAL-007)

Any missing, invalid, expired, revoked, or incompatible material ⇒ `FAIL_CLOSED`. Absence of a positive answer is never read as a positive answer.

### Conformance Evidence

| L3 Requirement | Evidence from this material |
|----------------|----------------------------|
| FED-L3-001 | Signed Protocol Metadata + Conformance Evidence published for a conformance scope of L3+ and passing the Open Trust Evaluation |
| FED-L3-002 | Material is within its validity window at evaluation time (`evidence_freshness_within_policy`) |
| FED-L3-005 | `conformance_evidence.operator_id == manifest.operator_id` |

### Served At

`GET /.well-known/banza/signed-protocol-metadata.json` — the operator's Signed Protocol Metadata  
`GET /.well-known/banza/conformance-evidence.json` — the operator's Conformance Evidence  
Both are served by the operator over TLS, no authentication required. Peers fetch this material and run the Open Trust Evaluation locally; nothing is fetched from BANZA at routing time.

---

## Contract 2: federation-routing.json

### Purpose

The routing contract defines the wire format for cross-operator routing — the mechanism by which Operator A instructs Operator B to accept a payment on behalf of a consumer on Operator A. This is the primary inter-operator protocol message.

This contract defines both:
- The **routing request**: Operator A → Operator B
- The **routing response**: Operator B → Operator A

### Ownership

| Role | Party | Responsibility |
|------|-------|----------------|
| Sender | Originating operator (Operator A) | Constructs and signs routing request; retries on network failure with same `routing_request_id` |
| Receiver | Destination operator (Operator B) | Validates request, runs the Open Trust Evaluation over Operator A's published material, accepts or rejects, returns idempotent response |
| Idempotency guarantor | Both operators | Same `routing_request_id` MUST produce same result on both sides (INV-FED-004) |

### Lifecycle

```
Operator A selects Operator B as destination
        ↓
Operator A constructs RoutingRequest
        ↓
POST /federation/route (signed)
        ↓
Operator B verifies:
  1. Operator A's signature on request
  2. Operator A's published material (the Open Trust Evaluation, ten checks — ADR-040)
  3. Amount within accepted range
  4. Recipient identifiable on Operator B
        ↓
     [accepted]             [rejected]
        ↓                      ↓
Operator B creates        Returns rejection_code
interop_transfer_id       + rejection_reason
        ↓
Obligation recorded by Operator A
        ↓
Payment completes on Operator B
```

States: `pending` (async processing) | `accepted` | `rejected`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | Always `"1"` |
| `routing_request_id` | string | yes | Globally unique idempotency key. Format: `"rr-<uuid>"`. Operator A assigns. MUST be stable across retries. |
| `trace_id` | string | yes | Causal trace identifier from originating transaction. MUST propagate unchanged (INV-FED-001). |
| `from_operator_id` | string | yes | `operator_id` of the originating operator (Operator A) |
| `to_operator_id` | string | yes | `operator_id` of the destination operator (Operator B) |
| `amount` | object | yes | Payment amount. See `Amount` schema. |
| `amount.minor` | integer | yes | Amount in currency minor units. MUST be > 0. MUST use integer arithmetic (INV-LEDGER-003). |
| `amount.currency` | string | yes | ISO 4217 currency code. e.g. `"AOA"`. |
| `sender_wallet_id` | string | yes | Wallet ID of the payer on Operator A. |
| `recipient_identifier` | string | yes | How to identify the payment recipient on Operator B. |
| `recipient_identifier_type` | string | yes | Type of identifier. Enum: `"wallet_id"` \| `"handle"` \| `"phone"` \| `"account_number"` |
| `created_at` | string (ISO 8601 UTC) | yes | When Operator A created this routing request. |
| `protocol_metadata_url` | string | yes | URL where Operator B fetches Operator A's published Signed Protocol Metadata + Conformance Evidence, to run the Open Trust Evaluation for bidirectional trust. |

### Response Fields

| Field | Type | Presence | Description |
|-------|------|----------|-------------|
| `schema_version` | string | always | Always `"1"` |
| `routing_request_id` | string | always | Echo of the request's `routing_request_id` |
| `status` | string | always | `"accepted"` \| `"rejected"` \| `"pending"` |
| `trace_id` | string | always | Echo of the request's `trace_id`. MUST be identical (INV-FED-001). |
| `interop_transfer_id` | string | if accepted | Operator B's internal transfer identifier. Format: `"itx-<uuid>"`. |
| `accepted_at` | string (ISO 8601 UTC) | if accepted | When Operator B accepted the routing request. |
| `rejection_code` | string | if rejected | Structured rejection reason. See rejection code registry. |
| `rejection_reason` | string | if rejected | Human-readable rejection explanation (English). |
| `estimated_completion_at` | string (ISO 8601 UTC) | if pending | Estimated completion time for async routing. |

### Rejection Code Registry

| Code | Meaning |
|------|---------|
| `recipient_not_found` | No wallet matching `recipient_identifier` on Operator B |
| `recipient_suspended` | Recipient wallet is suspended |
| `currency_not_supported` | Operator B does not accept `amount.currency` in cross-operator payments |
| `amount_below_minimum` | Amount is below Operator B's cross-operator minimum |
| `amount_above_maximum` | Amount exceeds Operator B's cross-operator limit |
| `operator_trust_failure` | Operator B's Open Trust Evaluation over Operator A's published material returned FAIL_CLOSED |
| `capability_unavailable` | Operator B is temporarily unable to accept cross-operator payments |
| `duplicate_request` | `routing_request_id` already processed with different content (invariant violation by Operator A) |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "https://banza.network/contracts/federation/federation-routing.json",
  "title": "BanzaFederationRouting",
  "description": "Wire format for cross-operator routing requests and responses. Defines how Operator A initiates a payment on Operator B.",
  "_spec_version": "1",
  "_status": "canonical",
  "_authority": "ADR-038, ADR-039, ADR-040, RFC-0001, INV-FED-001, INV-FED-004",

  "$defs": {
    "Amount": {
      "type": "object",
      "required": ["minor", "currency"],
      "additionalProperties": false,
      "properties": {
        "minor": {
          "type": "integer",
          "minimum": 1,
          "description": "Amount in currency minor units. MUST be positive. INV-LEDGER-003: integer arithmetic only."
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$",
          "description": "ISO 4217 three-letter currency code."
        }
      }
    },

    "RoutingRequest": {
      "type": "object",
      "required": [
        "schema_version",
        "routing_request_id",
        "trace_id",
        "from_operator_id",
        "to_operator_id",
        "amount",
        "sender_wallet_id",
        "recipient_identifier",
        "recipient_identifier_type",
        "created_at",
        "protocol_metadata_url"
      ],
      "additionalProperties": false,
      "properties": {
        "schema_version": { "type": "string", "const": "1" },
        "routing_request_id": {
          "type": "string",
          "pattern": "^rr-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "Globally unique idempotency key. Stable across retries. INV-FED-004."
        },
        "trace_id": {
          "type": "string",
          "description": "Causal trace identifier. MUST propagate unchanged across all federation artifacts. INV-FED-001."
        },
        "from_operator_id": {
          "type": "string",
          "description": "operator_id of the originating operator."
        },
        "to_operator_id": {
          "type": "string",
          "description": "operator_id of the destination operator."
        },
        "amount": { "$ref": "#/$defs/Amount" },
        "sender_wallet_id": {
          "type": "string",
          "description": "Wallet ID of the payer on the originating operator."
        },
        "recipient_identifier": {
          "type": "string",
          "description": "Identifier for the payment recipient on the destination operator."
        },
        "recipient_identifier_type": {
          "type": "string",
          "enum": ["wallet_id", "handle", "phone", "account_number"],
          "description": "Type of recipient identifier."
        },
        "created_at": {
          "type": "string",
          "format": "date-time",
          "description": "UTC timestamp when Operator A created this routing request."
        },
        "protocol_metadata_url": {
          "type": "string",
          "format": "uri",
          "description": "URL where Operator B fetches Operator A's published Signed Protocol Metadata + Conformance Evidence, to run the Open Trust Evaluation for bidirectional trust."
        }
      }
    },

    "RoutingResponse": {
      "type": "object",
      "required": ["schema_version", "routing_request_id", "status", "trace_id"],
      "additionalProperties": false,
      "properties": {
        "schema_version": { "type": "string", "const": "1" },
        "routing_request_id": {
          "type": "string",
          "description": "Echo of the request routing_request_id."
        },
        "status": {
          "type": "string",
          "enum": ["accepted", "rejected", "pending"],
          "description": "Routing decision by Operator B."
        },
        "trace_id": {
          "type": "string",
          "description": "Echo of the request trace_id. MUST be identical to request. INV-FED-001."
        },
        "interop_transfer_id": {
          "type": "string",
          "pattern": "^itx-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "Operator B's internal transfer identifier. Present only if status=accepted."
        },
        "accepted_at": {
          "type": "string",
          "format": "date-time",
          "description": "UTC timestamp of acceptance. Present only if status=accepted."
        },
        "rejection_code": {
          "type": "string",
          "enum": [
            "recipient_not_found",
            "recipient_suspended",
            "currency_not_supported",
            "amount_below_minimum",
            "amount_above_maximum",
            "operator_trust_failure",
            "capability_unavailable",
            "duplicate_request"
          ],
          "description": "Structured rejection code. Present only if status=rejected."
        },
        "rejection_reason": {
          "type": "string",
          "description": "Human-readable rejection explanation. Present only if status=rejected."
        },
        "estimated_completion_at": {
          "type": "string",
          "format": "date-time",
          "description": "Estimated completion time. Present only if status=pending."
        }
      }
    }
  }
}
```

### Signature Requirements

**Purpose:** Authenticate the routing request. Operator B must verify that the request genuinely came from Operator A.  
**Algorithm:** ed25519  
**Signing party:** Operator A (using the private key corresponding to the public key it publishes in its Operator Manifest / Key Manifest)  
**HTTP Header:** `Banza-Federation-Signature: t=<unix_seconds>,v1=<ed25519_base64url>`  
**Signed payload:** `utf8(str(unix_seconds)) + "." + raw_request_body_bytes`

Operator B verifies:
1. Fetch Operator A's published Signed Protocol Metadata + Conformance Evidence from `protocol_metadata_url`
2. Run the Open Trust Evaluation over that material (ten checks — ADR-040)
3. Resolve Operator A's public key from its published Operator Manifest / Key Manifest
4. Reconstruct signed payload
5. Verify ed25519 signature against Operator A's published public key

### Validation Requirements

Operator B MUST reject the request if:
- Signature verification fails
- `to_operator_id != this operator's operator_id`
- The Open Trust Evaluation over `from_operator_id`'s published material returns `FAIL_CLOSED`
- `amount.minor <= 0`
- Same `routing_request_id` received with different content (report `duplicate_request`)
- `created_at` is more than 300 seconds in the past or future

### Conformance Evidence

| L3 Requirement | Evidence from this contract |
|----------------|----------------------------|
| FED-L3-007 | `POST /federation/route` returns valid RoutingResponse |
| FED-L3-009/010 | Bidirectional Open Trust Evaluation via `protocol_metadata_url` in request |
| FED-L3-011 | accepted routing request → payment completes on Operator B |
| FED-L3-012 | `trace_id` in response matches request (INV-FED-001) |

### Served At

`POST /federation/route` — on the destination operator's `interop_endpoint`  
Authentication: `Banza-Federation-Signature` header required  
TLS: required

---

## Contract 3: federation-obligation.json

### Purpose

The obligation contract defines the record created when a cross-operator payment is accepted. An obligation represents the debt that Operator A owes Operator B as a result of a routed payment. Obligations are the input to the cross-operator netting and settlement process (RFC-0002).

This is the answer to the question: *"How does Operator A discharge what it owes Operator B?"*

### Ownership

| Role | Party | Responsibility |
|------|-------|----------------|
| Creator | Originating operator (Operator A) | Records obligation upon receiving `status=accepted` response; signs it |
| Counterparty | Destination operator (Operator B) | Receives obligations during netting; disputes if amount mismatches |
| Netting authority | Both operators jointly | Exchange and reconcile obligation lists; compute net position |
| Verifier | Any auditor | Can verify obligation signatures without operator involvement |

### Lifecycle

```
[RoutingResponse.status = "accepted"]
        ↓
[Operator A records InteropObligation]
  obligation_id assigned
  settlement_state = "pending"
        ↓
[Netting cycle begins]
  settlement_state = "in_netting"
        ↓
[Net position computed and agreed]
        ↓
[Settlement executed via bank rail]
  settlement_state = "settled"
  settled_at = now()
  settlement_batch_id assigned
```

States: `pending` → `in_netting` → `settled`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | yes | Always `"1"` |
| `obligation_id` | string | yes | Globally unique obligation identifier. Format: `"ob-<uuid>"`. Assigned by Operator A. |
| `from_operator_id` | string | yes | Operator that owes the money (the routing requestor). |
| `to_operator_id` | string | yes | Operator that is owed the money (the routing acceptor). |
| `amount` | object | yes | Amount owed. Same schema as RoutingRequest.amount. MUST match exactly. |
| `routing_request_id` | string | yes | The routing request that created this obligation. One-to-one (UNIQUE). |
| `interop_transfer_id` | string | yes | Operator B's transfer ID from the RoutingResponse. |
| `trace_id` | string | yes | Causal trace identifier. MUST match the originating payment (INV-FED-001). |
| `recorded_at` | string (ISO 8601 UTC) | yes | When Operator A recorded this obligation. |
| `settlement_state` | string | yes | Enum: `"pending"` \| `"in_netting"` \| `"settled"` |
| `netting_period` | string | no | Identifier for the netting cycle (e.g., `"2026-06-01"`). Set when entering `in_netting`. |
| `settled_at` | string (ISO 8601 UTC) | no | When this obligation was settled. Present only when `settlement_state = "settled"`. |
| `settlement_batch_id` | string | no | Settlement batch identifier. Present only when `settlement_state = "settled"`. |
| `obligor_signature` | string | yes | ed25519 signature by Operator A over canonical JSON of obligation fields (excluding `obligor_signature`). Prevents Operator A from disputing the amount at netting time. |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "https://banza.network/contracts/federation/federation-obligation.json",
  "title": "BanzaFederationObligation",
  "description": "Obligation created by the originating operator when a cross-operator payment is accepted. Input to the cross-operator netting and settlement process.",
  "_spec_version": "1",
  "_status": "canonical",
  "_authority": "ADR-038, ADR-039, ADR-040, RFC-0002, INV-FED-002, INV-FED-005",

  "type": "object",
  "required": [
    "schema_version",
    "obligation_id",
    "from_operator_id",
    "to_operator_id",
    "amount",
    "routing_request_id",
    "interop_transfer_id",
    "trace_id",
    "recorded_at",
    "settlement_state",
    "obligor_signature"
  ],
  "additionalProperties": false,

  "properties": {
    "schema_version": { "type": "string", "const": "1" },

    "obligation_id": {
      "type": "string",
      "pattern": "^ob-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "description": "Globally unique obligation identifier. Assigned by Operator A."
    },

    "from_operator_id": {
      "type": "string",
      "description": "operator_id of the operator that owes the money."
    },

    "to_operator_id": {
      "type": "string",
      "description": "operator_id of the operator that is owed the money."
    },

    "amount": {
      "type": "object",
      "required": ["minor", "currency"],
      "additionalProperties": false,
      "properties": {
        "minor": {
          "type": "integer",
          "minimum": 1,
          "description": "Amount in minor units. MUST equal the amount in the routing request. INV-FED-005."
        },
        "currency": {
          "type": "string",
          "pattern": "^[A-Z]{3}$"
        }
      }
    },

    "routing_request_id": {
      "type": "string",
      "pattern": "^rr-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "description": "The routing request that generated this obligation. UNIQUE — one obligation per routing request."
    },

    "interop_transfer_id": {
      "type": "string",
      "pattern": "^itx-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "description": "Operator B's transfer ID from the RoutingResponse. Corroborates the obligation."
    },

    "trace_id": {
      "type": "string",
      "description": "Causal trace identifier. MUST match the originating payment trace_id. INV-FED-001."
    },

    "recorded_at": {
      "type": "string",
      "format": "date-time",
      "description": "UTC timestamp when Operator A recorded this obligation."
    },

    "settlement_state": {
      "type": "string",
      "enum": ["pending", "in_netting", "settled"],
      "description": "Current state in the obligation lifecycle."
    },

    "netting_period": {
      "type": "string",
      "description": "Netting cycle identifier. Set when settlement_state transitions to 'in_netting'. e.g. '2026-06-01'."
    },

    "settled_at": {
      "type": "string",
      "format": "date-time",
      "description": "UTC timestamp of settlement. Present only when settlement_state = 'settled'."
    },

    "settlement_batch_id": {
      "type": "string",
      "description": "Settlement batch identifier. Present only when settlement_state = 'settled'."
    },

    "obligor_signature": {
      "type": "string",
      "pattern": "^[A-Za-z0-9_-]{86}$",
      "description": "ed25519 signature by Operator A over canonical JSON of all fields except obligor_signature. Prevents amount disputes at netting time."
    }
  },

  "if": { "properties": { "settlement_state": { "const": "settled" } }, "required": ["settlement_state"] },
  "then": { "required": ["settled_at", "settlement_batch_id"] }
}
```

### Signature Requirements

**Algorithm:** ed25519  
**Signing party:** Operator A (`from_operator_id`) — using the private key corresponding to the public key it publishes in its Operator Manifest / Key Manifest  
**Signed content:** Canonical JSON of all fields except `obligor_signature`  
**Verification:** Counterparty (Operator B) or any auditor, using Operator A's published public key

This signature makes the obligation non-repudiable: Operator A cannot dispute the amount at netting time because it signed it when the obligation was recorded.

### Validation Requirements

Obligation is valid if:
1. `obligor_signature` verifies against Operator A's published `public_key`
2. `amount` exactly matches the `amount` in the referenced routing request
3. `routing_request_id` refers to a routing request that received `status=accepted`
4. `trace_id` matches the originating payment's `trace_id`
5. `from_operator_id` matches the routing request's `from_operator_id`
6. `to_operator_id` matches the routing request's `to_operator_id`
7. `settlement_state` follows valid transitions: `pending` → `in_netting` → `settled` only

### Conformance Evidence

| L3 Requirement | Evidence from this contract |
|----------------|----------------------------|
| FED-L3-008 | `GET /federation/obligations` returns valid obligations |
| FED-L3-013 | Obligation recorded immediately upon routing acceptance (INV-FED-002) |
| FED-L3-014 | `amount.minor` in obligation = `amount.minor` in routing request (INV-FED-005) |

### Served At

`GET /federation/obligations` — list all obligations (filterable by `settlement_state`, `to_operator_id`)  
`GET /federation/obligations/{obligation_id}` — get specific obligation  
Authentication: operator-to-operator mutual authentication (Banza-Federation-Signature)

---

## Contract 4: federation-event.json

### Purpose

Federation events are the protocol's cross-operator observability mechanism. When a payment crosses operator boundaries, events must be emitted on both sides — and the event on Operator B must be traceable to the event on Operator A via the shared `trace_id`. This contract extends the existing `contracts/events/envelope.schema.json` with federation-specific fields.

This contract does not replace the single-operator event envelope. It extends it: every federation event IS a valid base event envelope, with additional required fields.

### Ownership

| Role | Party | Responsibility |
|------|-------|----------------|
| Emitter | The operator where the state change occurred | Emits event on its own event stream; delivers to counterparty if applicable |
| Consumer | Counterparty operator or audit/observability consumer | Subscribes to `GET /federation/events` or receives pushed events |
| Authority | BANZA (protocol) | Defines event type registry; conformance tests verify event presence |

### Event Type Registry

All federation event types follow the namespace `federation.*`:

| Event Type | Emitted By | Trigger |
|------------|------------|---------|
| `federation.routing.received` | Operator B | Routing request received from Operator A |
| `federation.routing.accepted` | Operator B | Routing request accepted; `interop_transfer_id` assigned |
| `federation.routing.rejected` | Operator B | Routing request rejected; `rejection_code` set |
| `federation.payment.initiated` | Operator A | Cross-operator routing request sent |
| `federation.payment.completed` | Operator B | Payment credited on Operator B; obligation due |
| `federation.payment.failed` | Operator A or B | Payment failed mid-flight |
| `federation.obligation.recorded` | Operator A | Obligation recorded after routing acceptance |
| `federation.obligation.settled` | Operator A | Obligation settled in a batch |
| `federation.settlement.initiated` | Operator A | Netting cycle started |
| `federation.settlement.completed` | Operator A | Net settlement executed; obligations marked settled |

### Fields

All fields from `contracts/events/envelope.schema.json` (`id`, `event_type`, `aggregate_type`, `aggregate_id`, `trace_id`, `correlation_id`, `payload`, `created_at`) are inherited and remain required.

Additional required fields for federation events:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `federation_version` | string | yes | Always `"1"`. Marks this as a federation event. |
| `origin_operator_id` | string | yes | `operator_id` of the operator that emitted this event. |
| `destination_operator_id` | string | yes | `operator_id` of the operator this event concerns (may differ from origin). |
| `routing_request_id` | string | conditional | The routing request this event relates to. Required for `routing.*` and `payment.*` event types. |
| `interop_transfer_id` | string | conditional | The interop transfer this event relates to. Required after routing acceptance. |
| `obligation_id` | string | conditional | The obligation this event relates to. Required for `obligation.*` and `settlement.*` event types. |

The `aggregate_type` for all federation events is `"federation_payment"`.

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "https://banza.network/contracts/federation/federation-event.json",
  "title": "BanzaFederationEvent",
  "description": "Event envelope for events that cross operator boundaries. Extends contracts/events/envelope.schema.json with federation-specific fields. Every federation event is a valid base event envelope.",
  "_spec_version": "1",
  "_status": "canonical",
  "_authority": "ADR-038, ADR-039, ADR-040, INV-FED-001",
  "_extends": "contracts/events/envelope.schema.json",

  "allOf": [
    { "$ref": "https://banza.network/contracts/events/envelope.schema.json" },
    {
      "type": "object",
      "required": ["federation_version", "origin_operator_id", "destination_operator_id"],
      "properties": {
        "federation_version": {
          "type": "string",
          "const": "1",
          "description": "Federation protocol version. Always '1'. Marks this as a federation event."
        },
        "origin_operator_id": {
          "type": "string",
          "description": "operator_id of the operator that emitted this event."
        },
        "destination_operator_id": {
          "type": "string",
          "description": "operator_id of the operator this event concerns."
        },
        "routing_request_id": {
          "type": "string",
          "pattern": "^rr-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "Routing request this event relates to. Required for federation.routing.* and federation.payment.* event types."
        },
        "interop_transfer_id": {
          "type": "string",
          "pattern": "^itx-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "Interop transfer ID from Operator B. Required after routing acceptance."
        },
        "obligation_id": {
          "type": "string",
          "pattern": "^ob-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "Obligation this event relates to. Required for federation.obligation.* and federation.settlement.* event types."
        },
        "event_type": {
          "type": "string",
          "enum": [
            "federation.routing.received",
            "federation.routing.accepted",
            "federation.routing.rejected",
            "federation.payment.initiated",
            "federation.payment.completed",
            "federation.payment.failed",
            "federation.obligation.recorded",
            "federation.obligation.settled",
            "federation.settlement.initiated",
            "federation.settlement.completed"
          ],
          "description": "Federation event type. Overrides the base event_type to restrict to federation namespace."
        },
        "aggregate_type": {
          "type": "string",
          "const": "federation_payment",
          "description": "Aggregate type for all federation events."
        }
      }
    }
  ]
}
```

### Signature Requirements

Federation events follow the same signing model as base events. They are served over the authenticated `/federation/events` endpoint. No additional per-event signature is required beyond the transport-level authentication (`Banza-Federation-Signature` header).

### Validation Requirements

A federation event is valid if:
1. It is a valid base event envelope (validates against `contracts/events/envelope.schema.json`)
2. `federation_version == "1"`
3. `trace_id` matches the `trace_id` of the originating payment on both operators (INV-FED-001)
4. `origin_operator_id` and `destination_operator_id` are non-empty
5. `routing_request_id` is present for `federation.routing.*` and `federation.payment.*` events
6. `obligation_id` is present for `federation.obligation.*` and `federation.settlement.*` events

### Conformance Evidence

| L3 Requirement | Evidence from this contract |
|----------------|----------------------------|
| FED-L3-012 | `trace_id` is identical across Operator A and Operator B events for the same payment (INV-FED-001) |
| FED-L3-011 | `federation.payment.completed` event on Operator B confirms receipt |

### Served At

`GET /federation/events` — SSE stream or polling endpoint for cross-operator events  
`POST /federation/events` — inbound event delivery from counterparty operator  
Authentication: `Banza-Federation-Signature` header required

---

## Contract 5: federation-manifest.json

### Purpose

The federation manifest contract defines the additional fields that must be present in an operator's manifest (`/.well-known/banza/operator.json`) for the operator to be a valid federation participant. It is an **extension** to the base manifest schema (`conformance/manifests/schema.json`), not a replacement.

A federation-capable manifest is a base manifest that also satisfies this extension schema.

This contract answers: *"What must an operator declare in its manifest to participate in federation?"*

### Ownership

| Role | Party | Responsibility |
|------|-------|----------------|
| Author | Each operator | Publishes its own manifest including federation extension fields |
| Validator | Federation peers | Verify federation extension fields before establishing routing relationships |
| Schema authority | BANZA (protocol) | Defines which fields are required and their constraints |
| Conformance evaluator | BanzAI | Validates manifest against both base schema and federation extension |

### Lifecycle

The manifest lifecycle is inherited from the base manifest. The federation extension fields have additional constraints:

- `supports_federation` MUST be `false` unless the operator publishes valid, fresh, non-revoked Signed Protocol Metadata and Conformance Evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation (INV-FEDEVAL-007)
- `protocol_metadata_url` MUST point to accessible, valid Signed Protocol Metadata + Conformance Evidence before `supports_federation` is set to `true`
- `interop_endpoint` MUST be the base URL of a running federation API before `supports_federation` is set to `true`

### Fields

Fields are additional to the base manifest schema (`conformance/manifests/schema.json`):

| Field | Type | Required for L3 | Description |
|-------|------|-----------------|-------------|
| `federation_version` | string | yes | Federation protocol version supported. Always `"1"` for this protocol. |
| `protocol_metadata_url` | string (URI) | yes | URL where peers fetch this operator's published Signed Protocol Metadata + Conformance Evidence. Default: `{operator_url}/.well-known/banza/signed-protocol-metadata.json` |
| `interop_endpoint` | string (URI) | yes | Base URL for this operator's federation API endpoints (e.g., `POST /federation/route` is at `{interop_endpoint}/federation/route`) |
| `supports_federation` | boolean | yes | MUST be `true` for federation participation. MUST NOT be `true` unless the operator publishes valid, fresh, non-revoked Conformance Evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation. INV-FEDEVAL-007. |
| `cross_operator_routing` | boolean | yes | This operator can accept routing requests from other operators. |
| `cross_operator_settlement` | boolean | yes | This operator participates in cross-operator netting and settlement. |
| `federation_capabilities` | object | yes | Detailed federation capability declaration. |
| `federation_capabilities.routing_version` | string | yes | Which federation routing protocol version. Always `"1"`. |
| `federation_capabilities.settlement_version` | string | yes | Which federation settlement protocol version. Always `"1"`. |
| `federation_capabilities.supported_currencies` | array[string] | yes | ISO 4217 currency codes accepted in cross-operator payments. Must be non-empty. |
| `federation_capabilities.netting_interval_hours` | integer | yes | How often this operator runs netting cycles. e.g. `24` for daily netting. |
| `federation_capabilities.max_transaction_amount_minor` | integer | no | Per-transaction maximum for cross-operator payments in the primary currency's minor units. Absent = no limit declared. |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "https://banza.network/contracts/federation/federation-manifest.json",
  "title": "BanzaFederationManifestExtension",
  "description": "Extension schema for federation-capable operator manifests. A federation manifest is a base operator manifest that also validates against this extension. Served at /.well-known/banza/operator.json alongside the base manifest fields.",
  "_spec_version": "1",
  "_status": "canonical",
  "_authority": "ADR-038, ADR-039, ADR-040, RFC-0005, INV-FEDEVAL-007, INV-FED-003",
  "_extends": "conformance/manifests/schema.json",

  "type": "object",
  "required": [
    "federation_version",
    "protocol_metadata_url",
    "interop_endpoint",
    "supports_federation",
    "cross_operator_routing",
    "cross_operator_settlement",
    "federation_capabilities"
  ],

  "properties": {
    "federation_version": {
      "type": "string",
      "const": "1",
      "description": "Federation protocol version supported by this operator."
    },

    "protocol_metadata_url": {
      "type": "string",
      "format": "uri",
      "description": "URL where federation peers fetch this operator's published Signed Protocol Metadata + Conformance Evidence, to run the Open Trust Evaluation. MUST be accessible over TLS without authentication."
    },

    "interop_endpoint": {
      "type": "string",
      "format": "uri",
      "description": "Base URL for this operator's federation API. POST /federation/route, GET /federation/obligations, etc. are all relative to this base."
    },

    "supports_federation": {
      "type": "boolean",
      "description": "True if this operator participates in federation. INV-FEDEVAL-007: MUST NOT be true unless the operator publishes valid, fresh, non-revoked Conformance Evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation. INV-FED-003: setting this true without such published evidence is a protocol violation."
    },

    "cross_operator_routing": {
      "type": "boolean",
      "description": "True if this operator can accept POST /federation/route requests from other federation peers."
    },

    "cross_operator_settlement": {
      "type": "boolean",
      "description": "True if this operator participates in cross-operator netting and settlement (RFC-0002). Required for L4."
    },

    "federation_capabilities": {
      "type": "object",
      "required": [
        "routing_version",
        "settlement_version",
        "supported_currencies",
        "netting_interval_hours"
      ],
      "additionalProperties": false,
      "properties": {
        "routing_version": {
          "type": "string",
          "const": "1",
          "description": "Federation routing protocol version. Must be '1'."
        },
        "settlement_version": {
          "type": "string",
          "const": "1",
          "description": "Federation settlement protocol version. Must be '1'."
        },
        "supported_currencies": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Z]{3}$"
          },
          "minItems": 1,
          "uniqueItems": true,
          "description": "ISO 4217 currency codes accepted in cross-operator payments by this operator."
        },
        "netting_interval_hours": {
          "type": "integer",
          "minimum": 1,
          "maximum": 168,
          "description": "How often this operator runs netting cycles (in hours). Maximum 168h (7 days). e.g. 24 for daily netting."
        },
        "max_transaction_amount_minor": {
          "type": "integer",
          "minimum": 1,
          "description": "Per-transaction maximum for cross-operator payments in the primary currency's minor units. Absent means no per-transaction limit declared by this operator."
        }
      }
    }
  },

  "if": {
    "properties": { "supports_federation": { "const": true } },
    "required": ["supports_federation"]
  },
  "then": {
    "properties": {
      "cross_operator_routing": { "const": true }
    },
    "description": "If supports_federation is true, cross_operator_routing MUST also be true. A federation member that cannot route is not a federation member."
  }
}
```

### Signature Requirements

The manifest is signed by the **operator itself**, using the key material it declares in its Key Manifest — never by BANZA. The trust chain signs the protocol ruler (Contract 1) — through the protocol-metadata delegated key anchored in the root-signed Key Manifest — not operator manifests. Operator manifest signing is specified in GAP-008. The signing mechanism:
- Computes canonical JSON of the manifest (all fields, sorted lexicographically)
- Produces an ed25519 signature using the operator's own signing key
- Adds the signature as a `manifest_signature` field (spec defined in the operator manifest signing ADR)

Cryptographic trust does not rest on the manifest alone: peers run the Open Trust Evaluation (Contract 1) over the operator's published Signed Protocol Metadata + Conformance Evidence. The manifest declares; the evidence proves.

### Validation Requirements

A federation manifest is valid if:
1. It satisfies the base manifest schema (`conformance/manifests/schema.json`)
2. All federation extension fields listed above are present with correct types
3. `supports_federation == true` only if the operator publishes valid, fresh, non-revoked Conformance Evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation (INV-FEDEVAL-007)
4. `protocol_metadata_url` is accessible and returns valid Signed Protocol Metadata + Conformance Evidence
5. `interop_endpoint` is accessible and `POST /federation/route` returns HTTP 200 or 405 (endpoint exists)
6. If `cross_operator_settlement == true`, `cross_operator_routing` MUST also be true

### Conformance Evidence

| L3 Requirement | Evidence from this contract |
|----------------|----------------------------|
| FED-L3-003 | `supports_federation == true` and `cross_operator_routing == true` |
| FED-L3-004 | `interop_endpoint` points to working federation API |
| FED-L3-005 | `protocol_metadata_url` accessible and `conformance_evidence.operator_id == manifest.operator_id` |

### Served At

`GET /.well-known/banza/operator.json` — same endpoint as the base manifest  
The federation extension fields are merged into the single manifest document. No separate endpoint.

---

## Contract Dependency Map

```
federation-manifest.json
        │
        ├── references → signed protocol metadata + conformance evidence (protocol_metadata_url)
        └── enables → federation-routing.json (interop_endpoint)
                            │
                            ├── creates → federation-obligation.json
                            │                      │
                            │                      └── closes → federation-event.json
                            │                                   (obligation.settled)
                            └── emits → federation-event.json
                                        (routing.accepted/rejected)
```

All five contracts share:
- `operator_id` — operator-chosen stable identifier (operator-agnostic, never a commercial brand), the common key across all contracts
- ed25519 as the canonical signing algorithm
- `trace_id` — propagated across the routing, obligation, and event artifacts for a given cross-operator payment
- `schema_version: "1"` — the wire contracts start at version 1
