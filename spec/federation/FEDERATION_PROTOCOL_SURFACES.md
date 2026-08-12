# BANZA Federation Protocol Surfaces

**Status:** Canonical — the protocol surfaces a federation-capable operator (L3+) implements and publishes.  
**Authority:** ADR-038, ADR-039, ADR-040

---

## Currently Defined Federation Contracts

### Existing

| Contract | Path | Status | What It Covers |
|----------|------|--------|----------------|
| Protocol Capability Manifest Schema | `conformance/manifests/schema.json` | ✓ Complete | Operator identity, capabilities, safety invariants |
| Capability Schema | `conformance/capabilities/schema.json` | ✓ Complete | Per-capability conformance level (L0–L4) mapping |
| Webhook Signature Spec | `contracts/webhooks/signature.json` | ✓ Complete | Outbound event signing — reusable for federation |
| Event Envelope Schema | `contracts/events/envelope.schema.json` | ✓ Complete | Internal event format — reusable for federation |
| QR Payload Format | `contracts/qr/payload-format.json` | ✓ Complete | QR encoding — operator-agnostic by design |

---

## Federation Contracts

These are the protocol surfaces a federation-capable operator (L3+) relies on.

### Operator-published trust material — signed protocol metadata + conformance evidence

**Purpose:** A federation-capable operator publishes, on infrastructure it controls, its **signed protocol metadata** (`contracts/production/signed-protocol-metadata.production.schema.json`) and its **conformance evidence** (`contracts/production/conformance-evidence.production.schema.json`). A routing peer fetches both from the operator's `protocol_metadata_url` and evaluates them locally, before routing, as part of the Open Trust Evaluation (ADR-040; `contracts/production/federation-trust-evaluation.production.schema.json`).

**Signed protocol metadata** authenticates the *protocol material* the operator measured itself against. Its signatures chain to the trust root or a delegated signing key resolved from the Key Manifest (INV-FEDEVAL-004). It carries an explicit `expires_at`; material past that instant is treated as fail-closed (INV-FEDEVAL-006, INV-FED-006).

```json
{
  "metadata_id": "string — stable, unique identifier",
  "metadata_type": "protocol_metadata | protocol_release | delegated_signing_key | revocation_list",
  "protocol_version": "string — e.g. '1.0.0'",
  "content_hash": { "algorithm": "sha-256", "value": "hex over the canonical bytes" },
  "issued_at": "ISO 8601 timestamp",
  "expires_at": "ISO 8601 timestamp",
  "trust_root_version": "string — the trust root the signature verifies under",
  "signatures": [
    { "key_id": "string", "signer_type": "trust_root | delegated_signing_key", "signature": "ed25519 base64url", "algorithm": "ed25519" }
  ]
}
```

**Conformance evidence** is the reproducible result of running the public Conformance Automation against the operator's implementation at a stated `protocol_version`. Any third party recomputes `conformance_report_hash` and `evidence_bundle_hash`, re-executes with `verified_by_tool_version`, and reaches the same `conformance_status` independently. Conformance is measured, never granted, and the operator signs its own evidence with its own keys.

```json
{
  "operator_id": "string — stable, unique operator identifier chosen and published by the operator",
  "protocol_version": "string — e.g. '1.0.0'",
  "conformance_report_hash": "sha-256 hex — recomputable from the published report",
  "evidence_bundle_hash": "sha-256 hex — recomputable from the published Evidence Bundle",
  "verified_by_tool_version": "string — pins the Conformance Automation for reproducibility",
  "trust_root_version": "string — the trust root signed_protocol_metadata verifies under",
  "conformance_status": "pass | fail | not_run",
  "signed_protocol_metadata": { "…": "the signed metadata used in verification" }
}
```

**How peers use it:** the operator publishes; each peer evaluates locally. Nothing is issued to the operator, no signature is placed over the operator, and there is no onboarding step to complete — a peer either verifies the published material and routes, or fails closed.

---

### `contracts/federation/federation-routing.json`

**Purpose:** Wire format for the cross-operator routing request/response protocol. Defines how Operator A communicates a routing decision to Operator B.

**Minimum fields — request:**
```json
{
  "routing_request_id": "string — idempotency key",
  "trace_id": "string — must propagate to all artifacts",
  "from_operator_id": "string",
  "to_operator_id": "string",
  "amount": { "minor": "integer", "currency": "ISO 4217" },
  "sender_wallet_id": "string",
  "recipient_wallet_id": "string",
  "created_at": "ISO 8601"
}
```

**Minimum fields — response:**
```json
{
  "routing_request_id": "string — echo",
  "status": "accepted | rejected | pending",
  "rejection_reason": "string? — if rejected",
  "interop_transfer_id": "string? — if accepted",
  "trace_id": "string — same as request"
}
```

---

### `contracts/federation/federation-obligation.json`

**Purpose:** Schema for the obligation created when a payment crosses operator boundaries. Used by `InteropObligation` struct (RFC-0002).

**Minimum fields:**
```json
{
  "obligation_id": "string — globally unique",
  "from_operator_id": "string — operator that owes",
  "to_operator_id": "string — operator that is owed",
  "amount": { "minor": "integer", "currency": "ISO 4217" },
  "payment_ref": "string — originating payment or transfer ID",
  "trace_id": "string",
  "recorded_at": "ISO 8601",
  "settled_at": "ISO 8601? — null until settled",
  "settlement_batch_id": "string? — null until settled"
}
```

---

### `contracts/federation/federation-event.json`

**Purpose:** Schema for events that cross operator boundaries. Extends the existing event envelope with federation-specific fields.

**Minimum fields (extends `contracts/events/envelope.schema.json`):**
```json
{
  "type": "federation.payment.initiated | federation.payment.completed | ...",
  "origin_operator_id": "string",
  "destination_operator_id": "string",
  "trace_id": "string — same across both operators",
  "payload": { ... }
}
```

---

### `contracts/federation/federation-trust.json`

**Purpose:** Protocol spec for the trust model between operators. Defines how Operator A evaluates Operator B's published material locally — the Open Trust Evaluation — before routing to it. No operator confers "membership" on another; each peer verifies published material for one interaction and decides for itself.

**Minimum fields — trust evaluation result:**
```json
{
  "evaluator_operator_id": "string — the peer running the evaluation",
  "evaluated_operator_id": "string — the operator whose published material is evaluated",
  "operator_manifest_url": "string — /.well-known/banza/operator.json at the evaluated operator",
  "protocol_metadata_url": "string — where the peer fetches the evaluated operator's signed protocol metadata + conformance evidence",
  "outcome": "ROUTING_ALLOWED | FAIL_CLOSED",
  "evaluated_at": "ISO 8601",
  "conformance_status": "pass | fail | not_run — from the evaluated operator's conformance evidence",
  "conformance_scope": "string — the demonstrated conformance level (L0–L4)"
}
```

The normative shape is `contracts/production/federation-trust-evaluation.production.schema.json` (ADR-040). The `outcome` is a local, per-interaction decision — never a status conferred on the evaluated operator.

---

## Protocol Surfaces — Endpoint Map

These are the HTTP endpoints that must exist on a Federation Member (L3+) operator:

| Endpoint | Method | Required At | Purpose |
|----------|--------|-------------|---------|
| `/.well-known/banza/operator.json` | GET | L3 | Manifest — already required at L3 |
| `/.well-known/banza/signed-protocol-metadata.json` | GET | L3 | Published signed protocol metadata + conformance evidence, fetched at `protocol_metadata_url` (new) |
| `/federation/route` | POST | L3 | Accept cross-operator routing request (new) |
| `/federation/obligations` | GET | L3 | List outstanding cross-operator obligations (new) |
| `/federation/obligations/{id}` | GET | L3 | Get specific obligation (new) |
| `/federation/events` | POST/SSE | L3 | Receive/emit cross-operator events (new) |
| `/federation/net-position` | GET | L4 | Net settlement position per counterparty (new) |
| `/federation/settle` | POST | L4 | Initiate bilateral settlement (new) |

---

## Invariants for Federation

These invariants must hold across operator boundaries:

| Invariant | Definition |
|-----------|------------|
| **INV-FED-001** | A federation transaction MUST carry the same `trace_id` in both the originating and receiving operator |
| **INV-FED-002** | Every cross-operator payment MUST produce one `InteropObligation` in the originating operator |
| **INV-FED-003** | A federation member MUST NOT declare `supports_federation: true` unless it can actually service federation routing requests at the declared `interop_endpoint` |
| **INV-FED-004** | Cross-operator routing MUST be idempotent — same `routing_request_id` produces same result |
| **INV-FED-005** | No money may be created or destroyed in a federation transaction — INV-LEDGER-001 applies across federation boundaries |
| **INV-FED-006** | Trust material MUST expire — signed protocol metadata and conformance evidence without an expiry are structurally invalid |
| **INV-FED-007** | A revoked operator MUST be rejected from all routing decisions immediately |

---

## RFC Status for Federation Surfaces

| RFC | Surface | Status | ADR Required? |
|-----|---------|--------|---------------|
| RFC-0001 | Cross-operator routing | Draft | Yes — before implementation |
| RFC-0002 | Cross-operator settlement | Draft | Yes — before implementation |
| RFC-0003 | Wallet capabilities | Draft | No — already in use |
| RFC-0004 | Provider capability negotiation | Draft | No — already in use |
| RFC-0005 | Operator discovery | Draft | Yes — before signing implementation |
| RFC-0006 | Offline payment support | Draft | No — post-federation |
| — | Trust model (Open Trust Evaluation) | Specified — ADR-038, ADR-039, ADR-040 | Done |
| — | Federation event propagation | Not written | Yes |
| — | Federation conformance | Not written | Yes |
