# BANZA Federation Contract Traceability

**Document ID:** FEDERATION-CONTRACTS-DESIGN-001  
**Date:** 2026-05-31  
**Status:** Canonical — read-only reference. Tracks relationships between federation contracts, ADRs, conformance requirements, conformance vectors, and invariants.  
**Authority:** ADR-025, ADR-031, ADR-025

---

## 1. Contract × ADR

Every contract traces to one or more ADRs that authorized its design. No contract exists without architectural authority.

| Contract | ADR-012 | ADR-022 | ADR-015 | ADR-001 | ADR-001 | ADR-001 | ADR-025 | RFC-0001 | RFC-0002 | RFC-0005 |
|----------|---------|---------|---------|---------|---------|---------|---------|----------|----------|----------|
| `signed-protocol-metadata` | | | | ✓ | ✓ | ✓ | ✓ (primary) | | | |
| `conformance-evidence` | | | | ✓ | ✓ | ✓ | ✓ (primary) | | | |
| `federation-routing` | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ (primary) | ✓ | ✓ |
| `federation-obligation` | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (primary) | |
| `federation-event` | | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `federation-manifest` | | | | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ (primary) |

**ADR mapping rationale:**

| ADR | Contribution to federation contracts |
|-----|--------------------------------------|
| ADR-012 | Double-entry invariant: `amount.minor` MUST be integer; obligation amounts are ledger entries |
| ADR-022 | Idempotency: `routing_request_id` is an idempotency key; INV-FED-004 mirrors INV-IDEM-001 |
| ADR-001 | BANZA as open protocol core: all contracts are operator-neutral, no operator names in schemas |
| ADR-001 | Operator separation: contracts define interfaces, not implementations |
| ADR-001 | Naming: `operator_id` terminology, self-asserted and key-bound |
| ADR-025 | Open protocol trust model: trust rests on signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys, revocation/fail-closed |
| ADR-031 | Operator self-publication: operators publish their own manifest, signed metadata and machine-verifiable conformance evidence on infrastructure they control |
| ADR-025 | Federation Trust Evaluation: the ten conjunctive, fail-closed checks; ed25519; BRL; 90-day freshness window; issuer_key_id; ROUTING_ALLOWED / FAIL_CLOSED outcome |
| RFC-0001 | Routing trait → `federation-routing` wire format |
| RFC-0002 | Settlement trait → `federation-obligation` record format |
| RFC-0005 | Discovery → `federation-manifest` well-known endpoint |

---

## 2. Contract × L3 conformance requirement

Maps each contract to the L3 conformance requirements it provides evidence for (from `FEDERATION_CONFORMANCE_PATH.md`).

### Per-Operator Requirements

| L3 Requirement | signed-protocol-metadata + conformance-evidence | federation-routing | federation-obligation | federation-event | federation-manifest |
|----------------|-------------------------------------------------|--------------------|-----------------------|-----------------|---------------------|
| FED-L3-001: Valid material at conformance level ≥ 3 (L3) | **Primary** | | | | |
| FED-L3-002: Trust material within freshness window | **Primary** | | | | |
| FED-L3-003: Material at published URL | **Primary** | | | | Supporting (protocol_metadata_url) |
| FED-L3-004: `supports_federation=true` | Supporting | | | | **Primary** |
| FED-L3-005: `metadata.operator_id == manifest.operator_id` | **Primary** | | | | **Primary** |
| FED-L3-006: Not in BRL | **Primary** | | | | |
| FED-L3-007: `POST /federation/route` works | | **Primary** | | | Supporting (interop_endpoint) |
| FED-L3-008: `GET /federation/obligations` works | | | **Primary** | | |

### Cross-Operator Requirements

| L3 Requirement | signed-protocol-metadata + conformance-evidence | federation-routing | federation-obligation | federation-event | federation-manifest |
|----------------|-------------------------------------------------|--------------------|-----------------------|-----------------|---------------------|
| FED-L3-009: A evaluates B (Open Trust Evaluation, ten checks) | **Primary** | Supporting (protocol_metadata_url) | | | Supporting |
| FED-L3-010: B evaluates A (bidirectional) | **Primary** | **Primary** (protocol_metadata_url in request) | | | Supporting |
| FED-L3-011: Payment completes on both sides | | **Primary** (acceptance) | Supporting | **Primary** (completed event) | |
| FED-L3-012: trace_id identical on both operators | | **Primary** (trace echo) | Supporting | **Primary** (INV-FED-001) | |
| FED-L3-013: Obligation recorded on acceptance | | Supporting (triggers) | **Primary** | Supporting | |
| FED-L3-014: No money created or destroyed | | **Primary** (amount field) | **Primary** (amount match) | | |

---

## 3. Contract × Planned Conformance Vectors

Maps each contract to the conformance vectors that will test it. Vectors are defined here; the actual vector files (`conformance/vectors/federation-*.json`) are produced in a subsequent implementation step.

### signed-protocol-metadata + conformance-evidence (the operator's published trust material)

| Vector ID | Title | Contract Fields Tested | Pass Condition |
|-----------|-------|------------------------|----------------|
| FED-SPM-001 | Signed protocol metadata present at published URL | All | HTTP 200 at the operator's `protocol_metadata_url`; valid schema |
| FED-SPM-002 | Signed-metadata signature verifies | `signature`, `issuer_key_id` | `ed25519_verify(trust_root_or_delegated_pk, canonical_json, signature)` = true |
| FED-SPM-003 | Trust material within freshness window | `expires_at` | `expires_at > now()` at evaluation time |
| FED-SPM-004 | Relied-upon key/artifact not in BRL | `operator_id` | `operator_id` (and every relied-upon key id) absent from current BRL |
| FED-SPM-005 | Conformance level ≥ 3 (L3) | `conformance_level` | `conformance_level >= 3` |
| FED-SPM-006 | operator_id matches manifest | `operator_id` | Equals `manifest.operator_id` |
| FED-SPM-007 | Public key format correct | `public_key` | Matches `^ed25519:[A-Za-z0-9_-]{43}$` |
| FED-SPM-008 | Expired trust material is rejected (fail-closed) | `expires_at` | Test with expired metadata → routing FAIL_CLOSED by peer |
| FED-SPM-009 | Revoked material is rejected (fail-closed) | BRL | Add key/artifact to test BRL → routing FAIL_CLOSED |

### federation-routing.json

| Vector ID | Title | Contract Fields Tested | Pass Condition |
|-----------|-------|------------------------|----------------|
| FED-ROUTE-001 | Valid routing request accepted | All request fields | HTTP 200 with `status=accepted` |
| FED-ROUTE-002 | routing_request_id echoed in response | `routing_request_id` | Response `routing_request_id == request routing_request_id` |
| FED-ROUTE-003 | trace_id propagated unchanged | `trace_id` | Response `trace_id == request trace_id` |
| FED-ROUTE-004 | Idempotency: same request_id → same result | `routing_request_id` | Second identical request → same response |
| FED-ROUTE-005 | Invalid signature → rejected | Signature header | HTTP 401 when signature omitted or wrong |
| FED-ROUTE-006 | Wrong to_operator_id → rejected | `to_operator_id` | Request addressed to wrong operator → HTTP 400 |
| FED-ROUTE-007 | Unknown recipient → rejection_code | `recipient_identifier` | `rejection_code = "recipient_not_found"` |
| FED-ROUTE-008 | Unsupported currency → rejection_code | `amount.currency` | `rejection_code = "currency_not_supported"` |
| FED-ROUTE-009 | interop_transfer_id format on acceptance | `interop_transfer_id` | Matches `^itx-<uuid>$` |
| FED-ROUTE-010 | Non-positive amount → rejected | `amount.minor` | HTTP 400 when `amount.minor <= 0` |

### federation-obligation.json

| Vector ID | Title | Contract Fields Tested | Pass Condition |
|-----------|-------|------------------------|----------------|
| FED-OBL-001 | Obligation created after routing acceptance | All fields | `GET /federation/obligations` returns obligation |
| FED-OBL-002 | Obligation amount matches routing request | `amount` | `obligation.amount == routing_request.amount` |
| FED-OBL-003 | trace_id matches originating payment | `trace_id` | `obligation.trace_id == routing_request.trace_id` |
| FED-OBL-004 | One obligation per routing_request_id | `routing_request_id` | UNIQUE constraint enforced |
| FED-OBL-005 | obligor_signature verifies | `obligor_signature` | `ed25519_verify(operator_A_public_key, canonical, sig)` |
| FED-OBL-006 | settlement_state transitions are valid | `settlement_state` | `pending` → `in_netting` → `settled` only |
| FED-OBL-007 | settled obligation has settled_at and batch_id | `settled_at`, `settlement_batch_id` | Required fields present when `settlement_state=settled` |

### federation-event.json

| Vector ID | Title | Contract Fields Tested | Pass Condition |
|-----------|-------|------------------------|----------------|
| FED-EVT-001 | `federation.routing.accepted` event emitted | `event_type`, all fields | Event appears in Operator B's event stream |
| FED-EVT-002 | trace_id matches across both operators | `trace_id` | Operator A and B events share same trace_id |
| FED-EVT-003 | `federation.payment.completed` emitted after settlement | `event_type` | Event present in Operator B stream after payment |
| FED-EVT-004 | `federation.obligation.recorded` emitted | `event_type`, `obligation_id` | Event appears in Operator A stream with correct obligation_id |
| FED-EVT-005 | federation_version always "1" | `federation_version` | All federation events have `federation_version = "1"` |
| FED-EVT-006 | Event is valid base envelope | Inherited fields | Validates against `contracts/events/envelope.schema.json` |

### federation-manifest.json

| Vector ID | Title | Contract Fields Tested | Pass Condition |
|-----------|-------|------------------------|----------------|
| FED-MAN-001 | Federation fields present in manifest | All extension fields | HTTP 200 at `/.well-known/banza/operator.json`; federation fields present |
| FED-MAN-002 | `supports_federation=true` | `supports_federation` | Present and `true` |
| FED-MAN-003 | `cross_operator_routing=true` | `cross_operator_routing` | Present and `true` when `supports_federation=true` |
| FED-MAN-004 | `protocol_metadata_url` accessible | `protocol_metadata_url` | HTTP 200 at `protocol_metadata_url`; valid signed metadata + conformance evidence |
| FED-MAN-005 | `interop_endpoint` accessible | `interop_endpoint` | `POST {interop_endpoint}/federation/route` reachable |
| FED-MAN-006 | `supported_currencies` non-empty | `federation_capabilities.supported_currencies` | Array has ≥ 1 ISO 4217 code |
| FED-MAN-007 | `supports_federation` false without published evidence | `supports_federation` (negative) | INV-FEDEVAL-007: setting true without published conformance evidence = FAIL |

---

## 4. Contract × Invariant

Maps each contract to the invariants it enforces or depends on.

| Invariant | signed-protocol-metadata + conformance-evidence | federation-routing | federation-obligation | federation-event | federation-manifest |
|-----------|-------------------------------------------------|--------------------|-----------------------|-----------------|---------------------|
| INV-FEDEVAL-004 (signed-metadata signature valid) | **owns** | verifies | | | |
| INV-FEDEVAL-006 (trust-material freshness) | **owns** | enforces | | | |
| INV-FEDEVAL-002 (revoked = reject all) | via BRL | enforces | | | |
| INV-FEDEVAL-007 (fed flag needs published evidence) | | | | | **owns** |
| INV-FEDEVAL-005 (BRL must be signed; BRL max 6h old) | via BRL | checks / enforces | | | |
| INV-ROOT-010 (key rotation auth) | **owns** | | | | |
| INV-FED-001 (trace_id invariant) | | **owns** | **owns** | **owns** | |
| INV-FED-002 (obligation per routing) | | triggers | **owns** | | |
| INV-FED-003 (no false federation flag) | | | | | **owns** |
| INV-FED-004 (routing idempotency) | | **owns** | | | |
| INV-FED-005 (no value creation/destruction) | | **owns** | **owns** | | |
| INV-FED-006 (trust material must expire) | **owns** | | | | |
| INV-FED-007 (revoked = rejected) | via BRL | **owns** | | | |
| INV-LEDGER-001 (zero-sum) | | extends to federation | extends to federation | | |
| INV-LEDGER-003 (integer arithmetic) | | **owns** (`amount.minor`) | **owns** (`amount.minor`) | | |
| INV-IDEM-001 (idempotency) | | extends (`routing_request_id`) | extends (`obligation_id`) | | |

Legend: **owns** = this contract is where the invariant is primarily enforced; extends = applies an existing invariant to a new context; enforces = checks but does not originate; verifies = validates as a consumer

---

## 5. Contract × Inter-Contract Dependency

### Data flow dependencies

```
federation-manifest.json
    └── (declares) protocol_metadata_url → signed-protocol-metadata + conformance-evidence
    └── (declares) interop_endpoint → federation-routing.json

signed-protocol-metadata + conformance-evidence
    └── (enables trust evaluation for) → federation-routing.json

operator signing key (bound in manifest + signed metadata)
    └── (signs) obligor in → federation-obligation.json

federation-routing.json
    └── (generates) routing_request_id used in → federation-obligation.json
    └── (generates) interop_transfer_id used in → federation-obligation.json
    └── (emits trigger for) → federation-event.json (routing.accepted)

federation-obligation.json
    └── (generates) obligation_id used in → federation-event.json (obligation.recorded)

federation-event.json
    └── (references all artifacts via) trace_id
```

### Blocking dependencies (cannot be implemented without)

| Contract | Blocked Until |
|----------|---------------|
| `federation-routing.json` | `signed-protocol-metadata` + `conformance-evidence` defined (trust evaluation in request handler) |
| `federation-obligation.json` | `federation-routing.json` defined (obligation references routing_request_id) |
| `federation-event.json` | `federation-obligation.json` defined (obligation events reference obligation_id) |
| `federation-manifest.json` | `signed-protocol-metadata` defined (protocol_metadata_url field) |
| Conformance suite | All 6 contracts defined |

### Creation sequence (strict order)

```
1. signed-protocol-metadata + conformance-evidence   ← no dependencies (trust-material contracts)
2. federation-manifest.json      ← depends on (1) for protocol_metadata_url
3. federation-routing.json       ← depends on (1) for trust evaluation, (2) for interop_endpoint
4. federation-obligation.json    ← depends on (3) for routing_request_id
5. federation-event.json         ← depends on (3) and (4) for event types
```

---

## 6. Contract → Gap Analysis Cross-Reference

Resolves specific gaps identified during the federation readiness review.

| Gap | Gap Title | Resolving Contract(s) |
|-----|-----------|----------------------|
| GAP-001 | Federation Trust Infrastructure | `signed-protocol-metadata` + `conformance-evidence` (primary); `federation-manifest.json` (protocol_metadata_url) |
| GAP-002 | Operator-to-Operator Message Protocol | `federation-routing.json` (wire format + auth scheme) |
| GAP-003 | Cross-Operator Routing Implementation | `federation-routing.json` (contract prerequisite for implementation) |
| GAP-004 | Cross-Operator Settlement Implementation | `federation-obligation.json` (contract prerequisite for implementation) |
| GAP-005 | Federation Conformance Vectors | All 6 contracts → vectors defined in this document §3 |
| GAP-006 | Signed Protocol Metadata / Conformance Evidence | `signed-protocol-metadata` + `conformance-evidence` (complete resolution) |
| GAP-007 | Federation Event Schema | `federation-event.json` (complete resolution) |
| GAP-008 | Manifest Signing and Verification | `federation-manifest.json` (defines the extension; signing mechanism pending manifest-signing ADR) |
| GAP-009 | L4 Conformance Suite | `federation-obligation.json` (provides settlement contract L4 needs) |
| GAP-010 | Federation Registry | `federation-manifest.json` (protocol_metadata_url enables direct discovery; the Public Protocol Registry provides the index layer) |

---

## 7. ID Namespace Registry

All federation artifacts use prefixed identifiers. No two artifact types share a prefix.

| Prefix | Format | Contract | Example |
|--------|--------|----------|---------|
| `rr-` | `rr-<uuid>` | federation-routing (request) | `rr-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `itx-` | `itx-<uuid>` | federation-routing (response) | `itx-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `ob-` | `ob-<uuid>` | federation-obligation | `ob-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `evt-` | `evt-<uuid>` | federation-event (inherited from base) | `evt-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| (none) | operator_id | All (via signed metadata + manifest) | `operator-a`, `my-fintech` |

The `operator_id` namespace (no prefix, kebab-case) is self-asserted by the operator, bound to its public keys by the manifest and signed protocol metadata, and is globally unique across all operators and all time. No operator_id is ever reused.

---

## 8. Endpoint Inventory

All federation HTTP endpoints introduced by these contracts:

| Endpoint | Method | Contract | Required At | Auth |
|----------|--------|----------|-------------|------|
| `/.well-known/banza/signed-protocol-metadata.json` | GET | signed-protocol-metadata | L3 | None (public) |
| `/.well-known/banza/conformance-evidence.json` | GET | conformance-evidence | L3 | None (public) |
| `/.well-known/banza/operator.json` (federation fields) | GET | federation-manifest | L3 | None (public) |
| `/federation/route` | POST | federation-routing | L3 | Banza-Federation-Signature |
| `/federation/obligations` | GET | federation-obligation | L3 | Banza-Federation-Signature |
| `/federation/obligations/{id}` | GET | federation-obligation | L3 | Banza-Federation-Signature |
| `/federation/events` | GET | federation-event | L3 | Banza-Federation-Signature |
| `/federation/events` | POST | federation-event | L3 | Banza-Federation-Signature |

Protocol-published endpoints (trust root infrastructure, not operator-hosted):

| Endpoint | Method | Contract | Purpose |
|----------|--------|----------|---------|
| `banza.network/federation/revocation-list.json` | GET | (BRL — checked by every Open Trust Evaluation) | BANZA Revocation List |
| `banza.network/federation/public-keys.json` | GET | (Key distribution) | Trust root & delegated signing public keys by issuer_key_id |

---

## 9. Migration Impact on Existing Artifacts

These contracts must not break existing L0–L2 artifacts. Verification:

| Existing Artifact | Impact | Notes |
|-------------------|--------|-------|
| `conformance/manifests/schema.json` | None — additive | Federation extension adds fields; base schema unchanged |
| `contracts/events/envelope.schema.json` | None — additive | Federation event extends but does not modify base envelope |
| `contracts/webhooks/signature.json` | None | Webhook signing model reused conceptually for inter-operator auth |
| `conformance/vectors/operator-manifests.json` | None | MAN-001–004 remain valid; FED-MAN-001–007 are additive |
| `reference/sandbox-operator` | Additive | Federation endpoints added; existing endpoints unchanged |
| L0, L1, L2 conformance | None | Federation contracts are L3+ only; no L0–L2 operator needs them |
