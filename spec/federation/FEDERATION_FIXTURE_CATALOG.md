# BANZA Federation Fixture Catalog

**Document ID:** FEDERATION-CONFORMANCE-DESIGN-001  
**Status:** Canonical — all fixtures used by the federation conformance test suite.  
**Authority:** FEDERATION_TEST_SUITE_SPEC.md, FEDERATION_RUNNER_DESIGN.md

---

## Fixture Conventions

### Deterministic Values

All fixtures use deterministic identifiers so test results are reproducible across runs.

| Placeholder | Deterministic Value |
|-------------|---------------------|
| Operator A operator_id | `operator-a-test` |
| Operator B operator_id | `operator-b-test` |
| Test trace_id | `tr-00000000-0000-0000-0000-000000000001` |
| Test routing_request_id | `rr-00000000-0000-0000-0000-000000000001` |
| Test interop_transfer_id | `itx-00000000-0000-0000-0000-000000000001` |
| Test obligation_id | `ob-00000000-0000-0000-0000-000000000001` |
| Test payer_wallet_id | `wallet-payer-test-001` |
| Test payee_wallet_id | `wallet-payee-test-001` |
| Test settlement_batch_id | `stl-2026-06-01-0001` |
| Test amount.minor | `50000` (500.00 AOA) |
| Test currency | `AOA` |

### Signature Placeholders

Real ed25519 signatures cannot be specified in a design document — they depend on the actual keypair. The runner generates its test trust-root keypair (and its delegated signing keys) at startup and signs all test signed protocol metadata from it; each simulated operator signs its own conformance evidence with its own key. Fixture JSON uses `"<ed25519-base64url-64-bytes>"` as a placeholder where the runner substitutes the actual value.

### Timestamp Policy

All timestamps in fixtures are computed relative to the runner's start time:
- `ISSUED_NOW` = runner start time (ISO 8601 UTC)
- `ISSUED_YESTERDAY` = runner start time - 1 day
- `ISSUED_100_DAYS_AGO` = runner start time - 100 days
- `EXPIRES_89_DAYS` = runner start time + 89 days
- `EXPIRES_10_DAYS_AGO` = runner start time - 10 days

---

## Operator Trust Material Fixtures

Each operator publishes its own trust material — signed protocol metadata plus reproducible conformance evidence — on infrastructure it controls, and each peer fetches it from the operator's `protocol_metadata_url` and evaluates it locally before routing. Nothing here is issued to an operator: the `signature` (identified by `issuer_key_id`) is the trust root / delegated-key signature over the signed protocol metadata, resolvable in the Key Manifest; `conformance_status` and the two hashes are the reproducible conformance evidence any third party can recompute with `verified_by_tool_version`. `conformance_scope` (L0–L4) is the measured level the evidence covers, never a conferred badge. Fixture IDs keep the `CERT-` prefix as stable handles referenced by the conformance suite.

### CERT-A-VALID — Operator A Valid Trust Material

```json
{
  "schema_version": "1",
  "operator_id": "operator-a-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing", "cross_operator_settlement"],
  "public_key": "ed25519:<operator-a-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-CERT-001 through FED-CERT-007, FED-TRUST-001, FED-DISC-004, FED-EXEC-*, FED-OBL-005

**Properties:** Metadata signature resolves to the trust root / delegated key; within freshness window; conformance scope L3; conformance_status pass; reproducible hashes; validity window 90 days

---

### CERT-B-VALID — Simulated Operator B Valid Trust Material

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing", "cross_operator_settlement"],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-TRUST-001, FED-TRUST-005 (paired with BRL-CONTAINS-OP-B), FED-CERT-009

---

### CERT-EXPIRED — Stale Trust Material

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing"],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_100_DAYS_AGO>",
  "expires_at": "<EXPIRES_10_DAYS_AGO>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-CERT-008, FED-TRUST-003, FED-FAIL-004 (as CERT-A-EXPIRED variant)

**Properties:** Metadata signature is valid; but expires_at is 10 days before runner start, so the trust material is outside its freshness window. Trust Step 2.4 must catch this.

---

### CERT-INVALID-SIGNATURE — Valid Structure, Tampered Signature

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing"],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
}
```

**Used by:** FED-CERT-002 (negative), FED-TRUST-002

**Properties:** All fields valid EXCEPT the metadata signature is 88 bytes of zeros (invalid ed25519), so it resolves to no key in the Key Manifest. Verification must fail at Step 2.3.

---

### CERT-L2-LEVEL — Valid Trust Material at Conformance Scope L2

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L2",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": [],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-TRUST-004

**Properties:** Metadata signature valid; within freshness window; but conformance_scope is L2, which is not federation-capable (L3+). Trust Step 2.5 must reject.

---

### CERT-MISMATCHED-OPERATOR-ID — operator_id Does Not Match Manifest

```json
{
  "schema_version": "1",
  "operator_id": "some-other-operator",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing"],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-CERT-010, FED-TRUST-008

**Properties:** The metadata signature is valid for THIS content; but the conformance evidence operator_id="some-other-operator" does not match the manifest's "operator-b-test". Step 2.9 must catch.

---

### CERT-NO-ROUTING-CAPABILITY — Trust Material Without cross_operator_routing

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": [],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2026-05",
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-TRUST-007

---

### CERT-UNKNOWN-ISSUER-KEY-ID — Trust Material Referencing Unknown Key

```json
{
  "schema_version": "1",
  "operator_id": "operator-b-test",
  "conformance_scope": "L3",
  "conformance_status": "pass",
  "protocol_version": "1.0",
  "capabilities": ["cross_operator_routing"],
  "public_key": "ed25519:<operator-b-ed25519-public-key-base64url>",
  "conformance_report_hash": "<sha256-hex-of-report>",
  "evidence_bundle_hash": "<sha256-hex-of-bundle>",
  "verified_by_tool_version": "conformance-automation-1.0.0",
  "issued_at": "<ISSUED_YESTERDAY>",
  "expires_at": "<EXPIRES_89_DAYS>",
  "trust_root_version": "test-trust-root-2026-05",
  "issuer_key_id": "test-banza-key-2027-01",
  "signature": "<ed25519-base64url-64-bytes-signed-with-NEW-key>"
}
```

**Used by:** FED-CERT-011

**Properties:** The `issuer_key_id` references a key not yet in the operator's local Key Manifest copy, but the runner serves it in the Key Manifest. The operator must fetch the updated Key Manifest and re-verify.

---

## Manifest Fixtures

### MANIFEST-VALID — Complete Federation-Capable Manifest

```json
{
  "operator_id": "operator-a-test",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "protocol_version": "1.0",
  "certification_level": 3,
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_settlement": true
  },
  "operator_name": "Operator A (Conformance Test)",
  "operator_url": "https://api.operator-a-test.example",
  "federation_version": "1",
  "protocol_metadata_url": "https://api.operator-a-test.example/.well-known/banza/signed-protocol-metadata.json",
  "interop_endpoint": "https://api.operator-a-test.example",
  "supports_federation": true,
  "cross_operator_routing": true,
  "cross_operator_settlement": true,
  "federation_capabilities": {
    "routing_version": "1",
    "settlement_version": "1",
    "supported_currencies": ["AOA"],
    "netting_interval_hours": 24
  }
}
```

**Used by:** FED-DISC-001 through FED-DISC-006, FED-DISC-008, all trust and routing tests

---

### MANIFEST-B-VALID — Simulated Operator B Valid Manifest

```json
{
  "operator_id": "operator-b-test",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "protocol_version": "1.0",
  "certification_level": 3,
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_settlement": true
  },
  "operator_name": "Simulated Operator B (Conformance Runner)",
  "operator_url": "https://sim-b.conformance.banza.internal",
  "federation_version": "1",
  "protocol_metadata_url": "https://sim-b.conformance.banza.internal/.well-known/banza/signed-protocol-metadata.json",
  "interop_endpoint": "https://sim-b.conformance.banza.internal",
  "supports_federation": true,
  "cross_operator_routing": true,
  "cross_operator_settlement": true,
  "federation_capabilities": {
    "routing_version": "1",
    "settlement_version": "1",
    "supported_currencies": ["AOA"],
    "netting_interval_hours": 24
  }
}
```

---

### MANIFEST-FEDERATION-NO-CERT — Declares Federation Without Published Conformance Evidence

```json
{
  "operator_id": "operator-b-test",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "supports_federation": true,
  "cross_operator_routing": true,
  "protocol_metadata_url": "https://sim-b.conformance.banza.internal/.well-known/banza/signed-protocol-metadata.json",
  "interop_endpoint": "https://sim-b.conformance.banza.internal",
  "federation_version": "1",
  "federation_capabilities": {
    "routing_version": "1",
    "settlement_version": "1",
    "supported_currencies": ["AOA"],
    "netting_interval_hours": 24
  }
}
```

**Used by:** FED-DISC-007

**Properties:** `supports_federation=true` but the `protocol_metadata_url` serves trust material for an L2 conformance scope (CERT-L2-LEVEL), which is not federation-capable (L3+). Trust Step 2.8 must fail.

---

### MANIFEST-B-NO-FEDERATION — Simulated Operator B Without Federation Support

```json
{
  "operator_id": "operator-b-test",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "supports_federation": false,
  "cross_operator_routing": false,
  "federation_version": "1",
  "federation_capabilities": {
    "routing_version": "1",
    "settlement_version": "1",
    "supported_currencies": ["AOA"],
    "netting_interval_hours": 24
  }
}
```

**Used by:** FED-TRUST-006

---

## BRL Fixtures

### BRL-CURRENT-EMPTY — Fresh BRL, No Revocations

```json
{
  "schema_version": "1",
  "issued_at": "<ISSUED_NOW>",
  "expires_at": "<ISSUED_NOW + 7 hours>",
  "revoked": [],
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-TRUST-001, all happy-path tests

**Properties:** Valid signature; issued now; expires in 7 hours; empty revocation list.

---

### BRL-CONTAINS-OP-B — Current BRL With Operator B Revoked

```json
{
  "schema_version": "1",
  "issued_at": "<ISSUED_NOW>",
  "expires_at": "<ISSUED_NOW + 7 hours>",
  "revoked": [
    {
      "operator_id": "operator-b-test",
      "reason": "revoked",
      "permanent": true,
      "since": "<ISSUED_NOW>"
    }
  ],
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-CERT-009, FED-TRUST-005

---

### BRL-EXPIRED — Expired BRL (Cannot Be Used for Routing)

```json
{
  "schema_version": "1",
  "issued_at": "<ISSUED_NOW - 8 hours>",
  "expires_at": "<ISSUED_NOW - 1 hour>",
  "revoked": [],
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-TRUST-009

**Properties:** Signature is valid; but expires_at is 1 hour ago. Operator must refuse routing when only this BRL is available.

---

### BRL-STALE-13H — BRL Expired 13 Hours Ago

```json
{
  "schema_version": "1",
  "issued_at": "<ISSUED_NOW - 14 hours>",
  "expires_at": "<ISSUED_NOW - 13 hours>",
  "revoked": [],
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Used by:** FED-FAIL-006

**Properties:** 13 hours past expiry; runner BRL endpoint returns 503. Fail-closed rule applies.

---

### BRL-EMERGENCY — Emergency BRL With 1-Hour Expiry

```json
{
  "schema_version": "1",
  "issued_at": "<ISSUED_NOW>",
  "expires_at": "<ISSUED_NOW + 1 hour>",
  "revoked": [
    {
      "operator_id": "operator-b-test",
      "reason": "revoked",
      "permanent": true,
      "since": "<ISSUED_NOW>"
    }
  ],
  "signature": "<ed25519-base64url-64-bytes>"
}
```

**Properties:** Short TTL forces operators to re-fetch within 1 hour. Tests accelerated refresh behavior.

---

### BANZA-KEY-MANIFEST — BANZA Public Key Manifest

```json
{
  "schema_version": "1",
  "published_at": "<ISSUED_NOW>",
  "keys": [
    {
      "key_id": "test-banza-key-2026-05",
      "public_key": "ed25519:<test-banza-root-public-key-base64url>",
      "active_since": "2026-05-01T00:00:00Z",
      "status": "active"
    },
    {
      "key_id": "test-banza-key-2027-01",
      "public_key": "ed25519:<test-banza-new-root-public-key-base64url>",
      "active_since": "<ISSUED_NOW>",
      "status": "active"
    }
  ],
  "signature": "<ed25519-base64url-signed-by-pinned-root-key>"
}
```

**Used by:** FED-CERT-011

---

## Routing Request Fixtures

### ROUTING-REQUEST-VALID — Happy-Path Routing Request

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000001",
  "trace_id": "tr-00000000-0000-0000-0000-000000000001",
  "from_operator_id": "operator-a-test",
  "to_operator_id": "operator-b-test",
  "amount": { "minor": 50000, "currency": "AOA" },
  "sender_wallet_id": "wallet-payer-test-001",
  "recipient_identifier": "wallet-payee-test-001",
  "recipient_identifier_type": "wallet_id",
  "created_at": "<ISSUED_NOW>",
  "protocol_metadata_url": "https://api.operator-a-test.example/.well-known/banza/signed-protocol-metadata.json"
}
```

**Signature header:** `Banza-Federation-Signature: t=<unix_ts>,v1=<ed25519_base64url>`  
Signed with Operator A's private key: `utf8(str(unix_ts)) + "." + raw_body_bytes`

**Used by:** FED-ROUTE-001 through FED-ROUTE-005, FED-EXEC-*, FED-OBL-*, FED-EVT-*, all happy-path tests

---

### ROUTING-REQUEST-DUPLICATE — Same ID, Same Content (Idempotent Retry)

Identical to ROUTING-REQUEST-VALID. Same routing_request_id, same content, sent a second time.

**Used by:** FED-ROUTE-004

---

### ROUTING-REQUEST-DUPLICATE-DIFFERENT-CONTENT — Same ID, Different Content

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000001",
  "trace_id": "tr-00000000-0000-0000-0000-000000000001",
  "from_operator_id": "operator-a-test",
  "to_operator_id": "operator-b-test",
  "amount": { "minor": 99999, "currency": "AOA" },
  "sender_wallet_id": "wallet-payer-test-001",
  "recipient_identifier": "wallet-payee-test-001",
  "recipient_identifier_type": "wallet_id",
  "created_at": "<ISSUED_NOW>",
  "protocol_metadata_url": "https://api.operator-a-test.example/.well-known/banza/signed-protocol-metadata.json"
}
```

**Properties:** Same routing_request_id as ROUTING-REQUEST-VALID but amount=99999 (was 50000). This is a protocol violation — must trigger rejection_code: duplicate_request.

**Used by:** FED-ROUTE-011

---

### ROUTING-REQUEST-UNKNOWN-RECIPIENT

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000002",
  "trace_id": "tr-00000000-0000-0000-0000-000000000002",
  "from_operator_id": "operator-a-test",
  "to_operator_id": "operator-b-test",
  "amount": { "minor": 50000, "currency": "AOA" },
  "sender_wallet_id": "wallet-payer-test-001",
  "recipient_identifier": "wallet-does-not-exist-xxxxxxxx",
  "recipient_identifier_type": "wallet_id",
  "created_at": "<ISSUED_NOW>",
  "protocol_metadata_url": "https://api.operator-a-test.example/.well-known/banza/signed-protocol-metadata.json"
}
```

**Used by:** FED-ROUTE-007, FED-EXEC-003

---

### ROUTING-REQUEST-WRONG-CURRENCY

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000003",
  "trace_id": "tr-00000000-0000-0000-0000-000000000003",
  "from_operator_id": "operator-a-test",
  "to_operator_id": "operator-b-test",
  "amount": { "minor": 50000, "currency": "EUR" },
  "sender_wallet_id": "wallet-payer-test-001",
  "recipient_identifier": "wallet-payee-test-001",
  "recipient_identifier_type": "wallet_id",
  "created_at": "<ISSUED_NOW>",
  "protocol_metadata_url": "https://api.operator-a-test.example/.well-known/banza/signed-protocol-metadata.json"
}
```

**Used by:** FED-ROUTE-008

---

### ROUTING-REQUEST-WRONG-DESTINATION

Same as ROUTING-REQUEST-VALID but `to_operator_id = "some-other-operator"`.

**Used by:** FED-ROUTE-006

---

### ROUTING-REQUEST-ZERO-AMOUNT

Same as ROUTING-REQUEST-VALID but `amount.minor = 0`.

**Used by:** FED-ROUTE-010

---

### ROUTING-REQUEST-NO-SIGNATURE

ROUTING-REQUEST-VALID body but with NO `Banza-Federation-Signature` header.

**Used by:** FED-ROUTE-005

---

### ROUTING-REQUEST-WRONG-SIGNATURE

ROUTING-REQUEST-VALID body with malformed signature header: `Banza-Federation-Signature: t=<unix_ts>,v1=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`

**Used by:** FED-ROUTE-005

---

### ROUTING-REQUEST-SUSPENDED-RECIPIENT

Same as ROUTING-REQUEST-VALID but recipient_identifier points to a suspended wallet on Simulated Operator B.

**Used by:** FED-ROUTE-012

---

## Routing Response Fixtures

### ROUTING-RESPONSE-ACCEPTED — Valid Acceptance

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000001",
  "status": "accepted",
  "trace_id": "tr-00000000-0000-0000-0000-000000000001",
  "interop_transfer_id": "itx-00000000-0000-0000-0000-000000000001",
  "accepted_at": "<ISSUED_NOW>"
}
```

**Used by:** Simulated Operator B returns this for happy-path tests.

---

### ROUTING-RESPONSE-REJECTED-RECIPIENT-NOT-FOUND

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000002",
  "status": "rejected",
  "trace_id": "tr-00000000-0000-0000-0000-000000000002",
  "rejection_code": "recipient_not_found",
  "rejection_reason": "No wallet matching identifier 'wallet-does-not-exist-xxxxxxxx'"
}
```

**Used by:** FED-ROUTE-007

---

### ROUTING-RESPONSE-REJECTED-TRUST-FAILURE

```json
{
  "schema_version": "1",
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000001",
  "status": "rejected",
  "trace_id": "tr-00000000-0000-0000-0000-000000000001",
  "rejection_code": "operator_trust_failure",
  "rejection_reason": "Operator A trust material failed the Open Trust Evaluation: signed protocol metadata / conformance evidence stale"
}
```

**Used by:** FED-FAIL-004

---

## Obligation Fixtures

### OBLIGATION-PENDING — Newly Recorded Obligation

```json
{
  "schema_version": "1",
  "obligation_id": "ob-00000000-0000-0000-0000-000000000001",
  "from_operator_id": "operator-a-test",
  "to_operator_id": "operator-b-test",
  "amount": { "minor": 50000, "currency": "AOA" },
  "routing_request_id": "rr-00000000-0000-0000-0000-000000000001",
  "interop_transfer_id": "itx-00000000-0000-0000-0000-000000000001",
  "trace_id": "tr-00000000-0000-0000-0000-000000000001",
  "recorded_at": "<ISSUED_NOW>",
  "settlement_state": "pending",
  "obligor_signature": "<ed25519-base64url-64-bytes-signed-by-operator-a>"
}
```

**Used by:** FED-OBL-001 through FED-OBL-005, FED-FAIL-007

---

### OBLIGATION-IN-NETTING — Obligation Entered Netting Cycle

Same as OBLIGATION-PENDING but with:
```json
{
  "settlement_state": "in_netting",
  "netting_period": "2026-06-01"
}
```

**Used by:** FED-OBL-006

---

### OBLIGATION-SETTLED — Fully Settled Obligation

Same as OBLIGATION-IN-NETTING but with:
```json
{
  "settlement_state": "settled",
  "netting_period": "2026-06-01",
  "settled_at": "<ISSUED_NOW>",
  "settlement_batch_id": "stl-2026-06-01-0001"
}
```

**Used by:** FED-OBL-006, FED-OBL-007, FED-SETTLE-005

---

### OBLIGATION-WRONG-AMOUNT — Obligation With Mismatched Amount

Same as OBLIGATION-PENDING but `amount.minor = 49999` (routing request was 50000).

**Used by:** FED-FAIL-008

---

## Settlement Fixtures

### NETTING-PERIOD-STANDARD — Standard Netting Exchange

Represents a netting period with 3 A→B obligations (total 150,000) and 1 B→A obligation (40,000):

```json
{
  "netting_period": "2026-06-01",
  "A_to_B": [
    { "obligation_id": "ob-00000000-0000-0000-0000-000000000001", "amount": { "minor": 50000, "currency": "AOA" } },
    { "obligation_id": "ob-00000000-0000-0000-0000-000000000002", "amount": { "minor": 50000, "currency": "AOA" } },
    { "obligation_id": "ob-00000000-0000-0000-0000-000000000003", "amount": { "minor": 50000, "currency": "AOA" } }
  ],
  "B_to_A": [
    { "obligation_id": "ob-00000000-0000-0000-0000-000000000004", "amount": { "minor": 40000, "currency": "AOA" } }
  ],
  "expected_gross_A_to_B": 150000,
  "expected_gross_B_to_A": 40000,
  "expected_net": 110000,
  "net_obligor": "operator-a-test"
}
```

**Used by:** FED-SETTLE-001, FED-SETTLE-002, FED-SETTLE-003

---

### NETTING-ZERO-NET — Equal Obligations Both Directions

```json
{
  "netting_period": "2026-06-01",
  "A_to_B": [
    { "obligation_id": "ob-A1", "amount": { "minor": 50000, "currency": "AOA" } }
  ],
  "B_to_A": [
    { "obligation_id": "ob-B1", "amount": { "minor": 50000, "currency": "AOA" } }
  ],
  "expected_gross_A_to_B": 50000,
  "expected_gross_B_to_A": 50000,
  "expected_net": 0,
  "net_obligor": null
}
```

**Used by:** FED-SETTLE-010

---

### NETTING-DISAGREEMENT — Operator A Missing One B→A Obligation

```json
{
  "operator_a_view": {
    "A_to_B": [{ "obligation_id": "ob-A1", "amount": { "minor": 100000 } }],
    "B_to_A": []
  },
  "operator_b_view": {
    "A_to_B": [{ "obligation_id": "ob-A1", "amount": { "minor": 100000 } }],
    "B_to_A": [{ "obligation_id": "ob-B1", "amount": { "minor": 50000 } }]
  },
  "operator_a_net": 100000,
  "operator_b_net": 50000,
  "discrepancy": "ob-B1 present in B's records but missing from A",
  "resolution": "Operator A must create obligation ob-B1 from routing request rr-B1"
}
```

**Used by:** FED-SETTLE-009

---

### NETTING-DISCREPANCY-AMOUNT-MISMATCH — Amount Mismatch in Obligation

```json
{
  "operator_a_view": {
    "A_to_B": [{ "obligation_id": "ob-A1", "amount": { "minor": 50000 } }]
  },
  "operator_b_view": {
    "A_to_B": [{ "obligation_id": "ob-A1", "amount": { "minor": 60000 } }]
  },
  "discrepancy_type": "amount_mismatch",
  "resolution": "HALT — escalate to BANZA. Do not proceed with settlement."
}
```

**Used by:** FED-SETTLE-008

---

## Simulation Control Fixtures

These fixtures configure the Simulated Operator B's behavior rather than specifying wire-format JSON.

### SIMULATED-NETWORK-DROP-ONCE
**Behavior:** Operator B drops the first routing request (returns no response); processes the second identically to a fresh request.  
**Used by:** FED-FAIL-001

### SIMULATED-B-OFFLINE
**Behavior:** All connection attempts to Operator B's routing endpoint return connection refused.  
**Used by:** FED-FAIL-002

### SIMULATED-MALFORMED-RESPONSE
**Behavior:** Operator B returns HTTP 200 with body `{"not": "valid routing response"` (invalid JSON — missing closing brace).  
**Used by:** FED-FAIL-003

### SIMULATED-B-INTERNAL-ERROR-AFTER-ACCEPT
**Behavior:** Operator B accepts the routing request (credits payee), then returns HTTP 500 on any follow-up status query.  
**Used by:** FED-EXEC-006

### ACCEPTED-ROUTING-NO-OBLIGATION
**State injection:** The runner directly writes into Operator A's database: a routing_request record with state=accepted, interop_transfer_id=itx-001, but NO corresponding obligation record. Simulates a crash in Phase 5.  
**Used by:** FED-FAIL-005

### SETTLEMENT-BANK-SUCCESS
**Behavior:** Simulated bank rail returns success immediately.  
**Used by:** FED-SETTLE-004, FED-SETTLE-005

---

## Fixture Summary

| Category | Count | IDs |
|----------|-------|-----|
| Operator trust material | 8 | CERT-A-VALID, CERT-B-VALID, CERT-EXPIRED, CERT-INVALID-SIGNATURE, CERT-L2-LEVEL, CERT-MISMATCHED-OPERATOR-ID, CERT-NO-ROUTING-CAPABILITY, CERT-UNKNOWN-ISSUER-KEY-ID |
| Manifests | 4 | MANIFEST-VALID, MANIFEST-B-VALID, MANIFEST-FEDERATION-NO-CERT, MANIFEST-B-NO-FEDERATION |
| BRL | 5 | BRL-CURRENT-EMPTY, BRL-CONTAINS-OP-B, BRL-EXPIRED, BRL-STALE-13H, BRL-EMERGENCY |
| Key manifest | 1 | BANZA-KEY-MANIFEST |
| Routing requests | 9 | ROUTING-REQUEST-VALID + 8 variants |
| Routing responses | 3 | ROUTING-RESPONSE-ACCEPTED, ROUTING-RESPONSE-REJECTED-* |
| Obligations | 4 | OBLIGATION-PENDING, OBLIGATION-IN-NETTING, OBLIGATION-SETTLED, OBLIGATION-WRONG-AMOUNT |
| Settlement | 4 | NETTING-PERIOD-STANDARD, NETTING-ZERO-NET, NETTING-DISAGREEMENT, NETTING-DISCREPANCY-AMOUNT-MISMATCH |
| Simulation controls | 6 | SIMULATED-NETWORK-DROP-ONCE, SIMULATED-B-OFFLINE, SIMULATED-MALFORMED-RESPONSE, SIMULATED-B-INTERNAL-ERROR-AFTER-ACCEPT, ACCEPTED-ROUTING-NO-OBLIGATION, SETTLEMENT-BANK-SUCCESS |
| **Total** | **44** | |
