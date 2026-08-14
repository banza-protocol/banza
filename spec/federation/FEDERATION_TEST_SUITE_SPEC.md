# BANZA Federation Test Suite Specification

**Document ID:** FEDERATION-CONFORMANCE-DESIGN-001  
**Date:** 2026-05-31  
**Status:** Canonical — 79 test case definitions across 9 suites.  
**Authority:** FEDERATION_CONFORMANCE_MODEL.md, ADR-025, ADR-031, ADR-025

---

## Test Case Format

Each test case specifies:

| Field | Meaning |
|-------|---------|
| Purpose | What behavior or invariant this test verifies |
| Preconditions | State that must exist before the test runs |
| Fixture | Which fixture(s) from FEDERATION_FIXTURE_CATALOG.md to use |
| Input | What the runner sends to the operator under test |
| Expected Output | What the operator must return |
| Evidence | What the runner captures for the evidence package |
| Pass | Conditions that must ALL be true for PASS |
| Fail | Any condition that produces FAIL |
| Severity | CRITICAL (immediate FAIL_CLOSED) or STANDARD |
| Invariant | Which protocol invariant this tests |
| Contract | Which contract this tests |
| L3 Req | Which FED-L3-* requirement this satisfies |

---

## Suite: FED-SPM — Signed Protocol Metadata Validation

Tests that the operator's published signed protocol metadata and conformance evidence are present, structurally valid, cryptographically sound under the trust root (or a delegated signing key resolved from the active Key Manifest), and correctly bound to the operator's manifest.

---

### FED-SPM-001 — Signed Protocol Metadata Present at Well-Known URL

| Field | Value |
|-------|-------|
| Purpose | Verify the signed-protocol-metadata endpoint exists and returns valid content |
| Preconditions | Operator is running; signed protocol metadata published, signed under the test trust root |
| Fixture | `CERT-A-VALID` |
| Input | `GET /.well-known/banza/signed-protocol-metadata.json` (no auth) |
| Expected Output | HTTP 200; body is valid JSON matching `signed-protocol-metadata.production.schema.json` |
| Evidence | Full HTTP response (headers + body); schema validation result |
| Pass | HTTP status 200 AND schema valid AND Content-Type is application/json |
| Fail | HTTP status != 200 OR body fails schema validation OR endpoint requires auth |
| Severity | STANDARD |
| Invariant | — |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-001, FED-L3-003 |

---

### FED-SPM-002 — Signed Protocol Metadata Signature Verifies Against the Test Trust Root

| Field | Value |
|-------|-------|
| Purpose | Verify the signed protocol metadata's signature verifies against the public key resolved from the active Key Manifest for its issuer_key_id — the test trust root, or a delegated signing key under it (INV-FEDEVAL-004) |
| Preconditions | Test trust root keypair generated; signed protocol metadata signed by it (or by a delegated signing key) |
| Fixture | `CERT-A-VALID` |
| Input | Signed protocol metadata from FED-SPM-001; public key resolved from the test Key Manifest for issuer_key_id |
| Expected Output | ed25519_verify(resolved_public_key, canonical_json, signature) = true |
| Evidence | Canonical JSON produced by runner; signature bytes; verification result |
| Pass | Verification returns true; canonical JSON excludes "signature" field; fields sorted lexicographically |
| Fail | Verification returns false; canonical JSON construction error; signature field included in signed content |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-004 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-001 |

---

### FED-SPM-003 — Signed Protocol Metadata Not Expired

| Field | Value |
|-------|-------|
| Purpose | Verify expires_at > runner's current time (INV-FEDEVAL-006) |
| Preconditions | Fixture: signed protocol metadata with expires_at 89 days from test start |
| Fixture | `CERT-A-VALID` |
| Input | Signed protocol metadata from FED-SPM-001; runner wall clock |
| Expected Output | metadata.expires_at > now(); metadata.issued_at <= now() |
| Evidence | expires_at value; runner timestamp; comparison result |
| Pass | expires_at - now() > 0 seconds AND now() - issued_at > 0 seconds |
| Fail | expires_at <= now() OR issued_at > now() (future-dated) |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-006 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-002 |

---

### FED-SPM-004 — operator_id Matches Declared Format

| Field | Value |
|-------|-------|
| Purpose | operator_id conforms to the kebab-case format constraint |
| Preconditions | Signed protocol metadata / conformance evidence present |
| Fixture | `CERT-A-VALID` |
| Input | `operator_id` from the published conformance evidence |
| Expected Output | Matches regex `^[a-z0-9][a-z0-9\-]{2,62}[a-z0-9]$` |
| Evidence | operator_id value; regex match result |
| Pass | Regex matches |
| Fail | Regex does not match; operator_id empty; operator_id contains uppercase |
| Severity | STANDARD |
| Invariant | — |
| Contract | `conformance-evidence.production.schema.json` |
| L3 Req | FED-L3-001 |

---

### FED-SPM-005 — public_key Format Correct

| Field | Value |
|-------|-------|
| Purpose | The signing key referenced by the metadata uses the ed25519 prefix and correct base64url encoding |
| Preconditions | Signed protocol metadata present; issuer key resolved from the Key Manifest |
| Fixture | `CERT-A-VALID` |
| Input | The public key resolved from the Key Manifest for the metadata's issuer_key_id |
| Expected Output | Matches `^ed25519:[A-Za-z0-9_-]{43}$` (43 base64url chars = 32 bytes) |
| Evidence | public_key value; regex match; decoded length in bytes |
| Pass | Regex matches AND base64url-decoded length == 32 bytes |
| Fail | Regex fails OR decoded length != 32 OR prefix not "ed25519:" |
| Severity | STANDARD |
| Invariant | — |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-001 |

---

### FED-SPM-006 — issuer_key_id Resolves to the Trust Root or an Authorized Delegated Key

| Field | Value |
|-------|-------|
| Purpose | The signature must be produced under a key the active Key Manifest resolves to the trust root, or to a signing key the trust root explicitly delegates for protocol metadata; any unresolved or out-of-scope key id is structurally invalid (INV-FEDEVAL-004, bounded by INV-ROOT-008) |
| Preconditions | Signed protocol metadata present; active test Key Manifest available |
| Fixture | `CERT-A-VALID` |
| Input | `issuer_key_id` from the signature; active test Key Manifest |
| Expected Output | issuer_key_id resolves within the active Key Manifest to the trust root key, or to a delegated signing key whose delegated authority covers signing protocol metadata |
| Evidence | issuer_key_id value; Key Manifest resolution result; delegated-authority scope |
| Pass | issuer_key_id resolves to the trust root, or to a delegated key acting within its delegated scope |
| Fail | issuer_key_id absent from the active Key Manifest; resolves to a key with no delegated authority to sign protocol metadata |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-004 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-001 |

---

### FED-SPM-007 — Validity Window ≤ 90 Days for L3+

| Field | Value |
|-------|-------|
| Purpose | For a federation-capable conformance scope, the validity window of signed protocol metadata and conformance evidence must not exceed 90 days (INV-FED-006, INV-FEDEVAL-006) |
| Preconditions | Trust material for a conformance scope of L3 or higher |
| Fixture | `CERT-A-VALID` |
| Input | `metadata.expires_at` and `metadata.issued_at` |
| Expected Output | expires_at - issued_at ≤ 7,776,000 seconds (90 days) |
| Evidence | issued_at; expires_at; computed validity window in seconds |
| Pass | validity window ≤ 7,776,000 seconds |
| Fail | window > 7,776,000 seconds; issued_at or expires_at missing or malformed |
| Severity | STANDARD |
| Invariant | INV-FED-006 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | FED-L3-001 |

---

### FED-SPM-008 — Expired Signed Protocol Metadata Fails the Freshness Check

| Field | Value |
|-------|-------|
| Purpose | When the routing peer's Open Trust Evaluation encounters expired signed protocol metadata, it must fail closed (negative test) |
| Preconditions | Runner serves expired signed protocol metadata for Simulated Operator B |
| Fixture | `CERT-EXPIRED` |
| Input | Runner instructs Simulated Operator B to serve `CERT-EXPIRED` at its protocol_metadata_url; Operator A runs the Open Trust Evaluation against Simulated Operator B |
| Expected Output | Operator A's evaluation returns FAIL_CLOSED and refuses to route to Simulated Operator B |
| Evidence | Open Trust Evaluation log from Operator A showing the evidence_freshness_within_policy check failing; routing attempt outcome |
| Pass | Operator A refuses to route; log or response indicates expired trust material as the reason |
| Fail | Operator A routes despite expired metadata; no freshness check evident |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-006 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-SPM-009 — Revoked Operator Rejected by BRL Check

| Field | Value |
|-------|-------|
| Purpose | An operator whose operator_id (or key/artifact id) is in a valid, non-expired BANZA Revocation List must be rejected by the not_revoked check (INV-FEDEVAL-002, INV-FED-007) |
| Preconditions | Runner adds Simulated Operator B's operator_id to the test BRL; serves BRL at test endpoint |
| Fixture | `CERT-B-VALID`, `BRL-CURRENT-WITH-OP-B-REVOKED` |
| Input | Operator A runs the Open Trust Evaluation and attempts to route to Simulated Operator B |
| Expected Output | Operator A returns FAIL_CLOSED; reports BRL hit |
| Evidence | BRL fetch log; BRL content showing operator_id; routing rejection |
| Pass | Routing rejected BEFORE routing request is sent; the validity of every other trust signal is irrelevant |
| Fail | Routing accepted despite operator in BRL; BRL not checked; stale BRL used |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-002, INV-FED-007 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-SPM-010 — Signed-Metadata / Manifest operator_id Binding

| Field | Value |
|-------|-------|
| Purpose | The operator_id in the published trust material must equal manifest.operator_id (part of the valid_operator_manifest check) |
| Preconditions | Simulated Operator B serves published material with a mismatched operator_id |
| Fixture | `CERT-MISMATCHED-OPERATOR-ID` |
| Input | Operator A runs the Open Trust Evaluation against Simulated Operator B |
| Expected Output | Evaluation fails the valid_operator_manifest check; routing refused (FAIL_CLOSED) |
| Evidence | Evaluation log showing the manifest-binding failure; operator_id values from both the published material and the manifest |
| Pass | Routing refused; operator_id mismatch logged |
| Fail | Operator A accepts the published material despite mismatch |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-004 |
| Contract | `signed-protocol-metadata.production.schema.json`, `federation-manifest.json` |
| L3 Req | FED-L3-005 |

---

### FED-SPM-011 — Unknown issuer_key_id Triggers Key Fetch

| Field | Value |
|-------|-------|
| Purpose | When the metadata's issuer_key_id is unknown, the operator must fetch the trust root's updated Key Manifest before deciding (F-604) |
| Preconditions | Runner signs metadata with an issuer_key_id not in Operator A's key registry; runner serves the updated Key Manifest at the test trust-root keys endpoint |
| Fixture | `CERT-UNKNOWN-ISSUER-KEY-ID`, `BANZA-KEY-MANIFEST` |
| Input | Open Trust Evaluation against metadata with an unknown issuer_key_id |
| Expected Output | Operator A fetches the test Key Manifest; discovers the new key; retries verification successfully |
| Evidence | Key fetch log; successful verification on retry |
| Pass | Key fetched, new issuer_key_id added to registry, verification succeeds |
| Fail | Operator treats an unknown issuer_key_id as invalid metadata without fetching; OR operator skips verification |
| Severity | STANDARD |
| Invariant | — |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — |

---

## Suite: FED-DISC — Discovery and Manifest Validation

Tests that the operator's manifest is correctly extended for federation and that all declared endpoints are reachable.

---

### FED-DISC-001 — Manifest Present at Well-Known URL

| Field | Value |
|-------|-------|
| Purpose | Verify manifest endpoint returns 200 with valid content |
| Preconditions | Operator running |
| Fixture | `MANIFEST-VALID` |
| Input | `GET /.well-known/banza/operator.json` |
| Expected Output | HTTP 200; body valid against base schema AND federation extension schema |
| Evidence | HTTP response; dual schema validation result |
| Pass | HTTP 200 AND valid against both schemas |
| Fail | HTTP != 200 OR schema invalid |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-003, FED-L3-004 |

---

### FED-DISC-002 — supports_federation == true

| Field | Value |
|-------|-------|
| Purpose | Federation participation requires explicit capability declaration |
| Preconditions | Manifest present |
| Fixture | `MANIFEST-VALID` |
| Input | `manifest.supports_federation` |
| Expected Output | `true` (boolean, not string) |
| Evidence | Field value and type |
| Pass | `manifest.supports_federation === true` |
| Fail | Missing; `false`; non-boolean type |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-007 |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-003 |

---

### FED-DISC-003 — cross_operator_routing == true

| Field | Value |
|-------|-------|
| Purpose | Routing capability declared |
| Preconditions | Manifest present |
| Fixture | `MANIFEST-VALID` |
| Input | `manifest.cross_operator_routing` |
| Expected Output | `true` |
| Evidence | Field value |
| Pass | `manifest.cross_operator_routing === true` |
| Fail | Missing; `false` |
| Severity | STANDARD |
| Invariant | INV-FED-003 |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-003 |

---

### FED-DISC-004 — protocol_metadata_url Accessible and Returns Valid Signed Protocol Metadata

| Field | Value |
|-------|-------|
| Purpose | protocol_metadata_url in the manifest must point to reachable, valid signed protocol metadata (and conformance evidence) |
| Preconditions | Manifest present with protocol_metadata_url; published material reachable |
| Fixture | `MANIFEST-VALID`, `CERT-A-VALID` |
| Input | `GET {manifest.protocol_metadata_url}` |
| Expected Output | HTTP 200; body is valid signed protocol metadata (`signed-protocol-metadata.production.schema.json`); operator_id matches manifest |
| Evidence | HTTP response from protocol_metadata_url; operator_id comparison |
| Pass | HTTP 200 AND valid metadata AND published operator_id == manifest.operator_id |
| Fail | HTTP != 200 OR metadata invalid OR operator_id mismatch |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-004 |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-005 |

---

### FED-DISC-005 — interop_endpoint Reachable

| Field | Value |
|-------|-------|
| Purpose | Federation routing endpoint must be reachable (INV-FED-003) |
| Preconditions | Manifest present with interop_endpoint |
| Fixture | `MANIFEST-VALID` |
| Input | `OPTIONS {manifest.interop_endpoint}/federation/route` OR `HEAD` |
| Expected Output | Any response (200, 405) — endpoint exists and responds |
| Evidence | HTTP response code and latency |
| Pass | TCP connection succeeds AND any HTTP response received (not connection refused) |
| Fail | Connection refused; DNS failure; TLS handshake failure; no response within 10s |
| Severity | STANDARD |
| Invariant | INV-FED-003 |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-004 |

---

### FED-DISC-006 — supported_currencies Non-Empty

| Field | Value |
|-------|-------|
| Purpose | Operator must declare at least one accepted currency for cross-operator payments |
| Preconditions | Manifest present |
| Fixture | `MANIFEST-VALID` |
| Input | `manifest.federation_capabilities.supported_currencies` |
| Expected Output | Array with ≥ 1 ISO 4217 code; each code matches `^[A-Z]{3}$` |
| Evidence | currencies array value; regex match per element |
| Pass | Array non-empty AND all elements match ISO 4217 pattern |
| Fail | Missing; empty array; any element fails pattern |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-manifest.json` |
| L3 Req | FED-L3-003 |

---

### FED-DISC-007 — supports_federation Cannot Be True Without Published L3+ Conformance Evidence (INV-FEDEVAL-007)

| Field | Value |
|-------|-------|
| Purpose | Negative test: an operator serving a manifest with supports_federation=true but no published L3+ conformance evidence that passes the Open Trust Evaluation is non-conformant |
| Preconditions | Runner configures Simulated Operator B with supports_federation=true but no conformance evidence (or evidence only for an L2 conformance scope) |
| Fixture | `MANIFEST-FEDERATION-NO-CERT` |
| Input | Operator A performs the Open Trust Evaluation against Simulated Operator B |
| Expected Output | Evaluation fails the conformance_evidence_valid / capabilities_compatible checks; routing refused (FAIL_CLOSED) |
| Evidence | Evaluation log showing the conformance / capability mismatch |
| Pass | Operator A refuses routing; logs INV-FEDEVAL-007 violation |
| Fail | Operator A routes despite missing/invalid conformance evidence |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-007 |
| Contract | `federation-manifest.json` |
| L3 Req | — (security test) |

---

### FED-DISC-008 — netting_interval_hours Within Bounds

| Field | Value |
|-------|-------|
| Purpose | Netting interval must be 1–168 hours per schema constraint |
| Preconditions | Manifest present |
| Fixture | `MANIFEST-VALID` |
| Input | `manifest.federation_capabilities.netting_interval_hours` |
| Expected Output | Integer in range [1, 168] |
| Evidence | field value |
| Pass | 1 ≤ value ≤ 168 AND type is integer |
| Fail | Out of range; not integer; missing |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-manifest.json` |
| L3 Req | — |

---

## Suite: FED-TRUST — Trust Establishment

Tests the complete ten-check Open Trust Evaluation (ADR-025) — run locally and deterministically by the routing peer over the evaluated operator's published material — and BRL handling. All ten checks are conjunctive and fail-closed: any missing, invalid, expired, revoked, or incompatible signal yields FAIL_CLOSED. The result is a local decision about one interaction (ROUTING_ALLOWED / FAIL_CLOSED), never a status conferred on the operator.

---

### FED-TRUST-001 — Full Open Trust Evaluation Passes for Valid Operator

| Field | Value |
|-------|-------|
| Purpose | All ten checks pass when Operator B is correctly configured |
| Preconditions | Simulated Operator B publishes valid signed protocol metadata, conformance evidence, manifest, and a fresh BRL (no revocations) |
| Fixture | `CERT-B-VALID`, `MANIFEST-B-VALID`, `BRL-CURRENT-EMPTY` |
| Input | Operator A runs the Open Trust Evaluation against Simulated Operator B |
| Expected Output | All ten checks logged as PASS; outcome = ROUTING_ALLOWED |
| Evidence | Full evaluation log with check-by-check results |
| Pass | All ten checks pass; outcome = ROUTING_ALLOWED |
| Fail | Any check fails; outcome != ROUTING_ALLOWED |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-002, INV-FEDEVAL-004, INV-FEDEVAL-005, INV-FEDEVAL-006, INV-FEDEVAL-007, INV-ROOT-010 |
| Contract | All federation contracts |
| L3 Req | FED-L3-009, FED-L3-010 |

---

### FED-TRUST-002 — Signature Check Fails on Invalid Signed Protocol Metadata Signature

| Field | Value |
|-------|-------|
| Purpose | Tampered signed protocol metadata is rejected at the signature-validity check (INV-FEDEVAL-004) |
| Preconditions | Simulated Operator B serves `CERT-INVALID-SIGNATURE` |
| Fixture | `CERT-INVALID-SIGNATURE` |
| Input | Operator A runs the Open Trust Evaluation |
| Expected Output | The trust_root_or_delegated_signature_valid check fails; evaluation aborts; routing refused (FAIL_CLOSED) |
| Evidence | Evaluation log showing trust_root_or_delegated_signature_valid = FAIL |
| Pass | signature check = FAIL; outcome = FAIL_CLOSED; routing refused |
| Fail | Operator A proceeds past the signature check with an invalid signature |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-004 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-TRUST-003 — Freshness Check Fails on Expired Signed Protocol Metadata

| Field | Value |
|-------|-------|
| Purpose | Expired signed protocol metadata is rejected at the freshness check (INV-FEDEVAL-006) |
| Preconditions | Simulated Operator B serves `CERT-EXPIRED` (expires_at 10 days ago) |
| Fixture | `CERT-EXPIRED` |
| Input | Operator A runs the Open Trust Evaluation |
| Expected Output | evidence_freshness_within_policy fails; routing refused (FAIL_CLOSED) |
| Evidence | Evaluation log; expires_at value; runner clock value |
| Pass | freshness check = FAIL; reason = trust_material_expired |
| Fail | Operator A proceeds past the freshness check with expired material; grace period applied |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-006 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-TRUST-004 — conformance_evidence_valid Check Fails on a Conformance Scope Below L3

| Field | Value |
|-------|-------|
| Purpose | Conformance evidence for a scope below L3 does not satisfy federation capabilities |
| Preconditions | Simulated Operator B serves `CERT-L2-LEVEL` (conformance_level=2) |
| Fixture | `CERT-L2-LEVEL` |
| Input | Operator A runs the Open Trust Evaluation |
| Expected Output | conformance_evidence_valid / capabilities_compatible fails; routing refused (FAIL_CLOSED) |
| Evidence | Evaluation log; conformance_level value |
| Pass | check = FAIL; reason = conformance_scope_insufficient |
| Fail | An L2 conformance scope accepted for federation routing |
| Severity | CRITICAL |
| Invariant | — |
| Contract | `conformance-evidence.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-TRUST-005 — not_revoked Check Fails When Operator in BRL (INV-FEDEVAL-002)

| Field | Value |
|-------|-------|
| Purpose | An operator in the BRL is rejected at the not_revoked check despite otherwise valid trust material |
| Preconditions | Test BRL contains Simulated Operator B's operator_id; BRL served by runner |
| Fixture | `CERT-B-VALID`, `BRL-CONTAINS-OP-B` |
| Input | Operator A fetches the test BRL; runs the Open Trust Evaluation against Simulated Operator B |
| Expected Output | not_revoked fails; routing refused (FAIL_CLOSED) |
| Evidence | BRL content; evaluation log showing the not_revoked result; validity of the signed metadata (should still pass the signature, freshness, and conformance checks) |
| Pass | signature / freshness / conformance checks PASS; not_revoked = FAIL; routing refused |
| Fail | Routing proceeds despite BRL entry; BRL not checked; BRL check happens after routing |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-002, INV-FED-007 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — (security test) |

---

### FED-TRUST-006 — capabilities_compatible Check Fails When supports_federation Missing

| Field | Value |
|-------|-------|
| Purpose | An operator that publishes valid trust material but doesn't declare federation support is rejected |
| Preconditions | Simulated Operator B manifest has supports_federation=false |
| Fixture | `MANIFEST-B-NO-FEDERATION` |
| Input | Open Trust Evaluation against Simulated Operator B |
| Expected Output | capabilities_compatible check fails |
| Evidence | Evaluation log; manifest supports_federation value |
| Pass | capabilities_compatible = FAIL |
| Fail | Routing accepted despite supports_federation=false |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-007 |
| Contract | `federation-manifest.json` |
| L3 Req | — |

---

### FED-TRUST-007 — capabilities_compatible Check Fails When cross_operator_routing Absent From Published Capabilities

| Field | Value |
|-------|-------|
| Purpose | The operator's published capabilities must include "cross_operator_routing" |
| Preconditions | Published material with an empty capabilities array |
| Fixture | `CERT-NO-ROUTING-CAPABILITY` |
| Input | Open Trust Evaluation |
| Expected Output | capabilities_compatible check fails |
| Evidence | Evaluation log; published capabilities value |
| Pass | capabilities_compatible = FAIL |
| Fail | Routing accepted despite missing capability |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-007 |
| Contract | `signed-protocol-metadata.production.schema.json` |
| L3 Req | — |

---

### FED-TRUST-008 — valid_operator_manifest Check Fails on metadata / manifest operator_id Mismatch

| Field | Value |
|-------|-------|
| Purpose | The signed protocol metadata and the manifest must describe the same operator |
| Preconditions | Simulated Operator B serves signed metadata with operator_id="other-operator" but manifest has operator_id="operator-b-test" |
| Fixture | `CERT-MISMATCHED-OPERATOR-ID` |
| Input | Open Trust Evaluation |
| Expected Output | valid_operator_manifest check fails |
| Evidence | published operator_id; manifest.operator_id; comparison result |
| Pass | valid_operator_manifest = FAIL; both values logged |
| Fail | Evaluation passes despite mismatch |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-004 |
| Contract | `signed-protocol-metadata.production.schema.json`, `federation-manifest.json` |
| L3 Req | FED-L3-005 |

---

### FED-TRUST-009 — BRL Staleness Enforcement (INV-FEDEVAL-005)

| Field | Value |
|-------|-------|
| Purpose | Routing must be refused when the BRL is older than 6 hours and cannot be refreshed |
| Preconditions | Runner serves a BRL with expires_at 7 hours ago (expired BRL); BRL fetch endpoint unavailable |
| Fixture | `BRL-EXPIRED` |
| Input | Operator A attempts to route; BRL endpoint returns 503 |
| Expected Output | Routing refused; staleness logged |
| Evidence | BRL fetch log (503 error); BRL age computation; routing refusal |
| Pass | Routing refused when BRL > 6h old AND cannot be refreshed |
| Fail | Routing accepted with stale BRL; no BRL check performed |
| Severity | CRITICAL |
| Invariant | INV-FEDEVAL-005 |
| Contract | — |
| L3 Req | — (security test) |

---

## Suite: FED-ROUTE — Routing Negotiation

Tests the RoutingRequest/RoutingResponse wire protocol.

---

### FED-ROUTE-001 — Valid Routing Request Accepted

| Field | Value |
|-------|-------|
| Purpose | Happy-path routing request results in acceptance |
| Preconditions | Trust established; recipient exists on Simulated Operator B; currency supported; amount in range |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | `POST {interop_endpoint}/federation/route` with ROUTING-REQUEST-VALID and valid Banza-Federation-Signature |
| Expected Output | HTTP 200; body: `{status:"accepted", routing_request_id:echo, trace_id:echo, interop_transfer_id:"itx-<uuid>", accepted_at:"..."}` |
| Evidence | Full request + response; timing |
| Pass | HTTP 200 AND status=accepted AND all required response fields present |
| Fail | HTTP != 200 OR status != accepted OR missing required fields |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-007 |

---

### FED-ROUTE-002 — routing_request_id Echoed Unchanged

| Field | Value |
|-------|-------|
| Purpose | Idempotency key must be echoed in response |
| Preconditions | Routing accepted (as per FED-ROUTE-001) |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | RoutingRequest with routing_request_id = "rr-00000000-0000-0000-0000-000000000001" |
| Expected Output | Response.routing_request_id === "rr-00000000-0000-0000-0000-000000000001" |
| Evidence | request routing_request_id; response routing_request_id; equality check |
| Pass | Exact string equality |
| Fail | Different value; missing field |
| Severity | STANDARD |
| Invariant | INV-FED-004 |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-007 |

---

### FED-ROUTE-003 — trace_id Propagated Unchanged (INV-FED-001)

| Field | Value |
|-------|-------|
| Purpose | trace_id must be echoed identically; no regeneration permitted |
| Preconditions | Routing accepted |
| Fixture | `ROUTING-REQUEST-VALID` (trace_id = "tr-test-trace-001") |
| Input | RoutingRequest with trace_id = "tr-test-trace-001" |
| Expected Output | Response.trace_id === "tr-test-trace-001" |
| Evidence | request trace_id; response trace_id; equality check |
| Pass | Exact string equality |
| Fail | Different value; trace_id regenerated; missing |
| Severity | CRITICAL |
| Invariant | INV-FED-001 |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-012 |

---

### FED-ROUTE-004 — Idempotent Retry Returns Same Response (INV-FED-004)

| Field | Value |
|-------|-------|
| Purpose | Sending the same routing_request_id twice must return the same response; payee credited only once |
| Preconditions | First request has been processed and accepted |
| Fixture | `ROUTING-REQUEST-VALID`, `ROUTING-REQUEST-DUPLICATE` (same content, same ID) |
| Input | POST routing request twice with identical routing_request_id |
| Expected Output | Second response is identical to first; interop_transfer_id unchanged; no additional ledger entries |
| Evidence | Both responses; interop_transfer_id equality; Operator B ledger state before and after second request |
| Pass | Second response == first response AND payee_wallet balance unchanged after second request |
| Fail | Second request creates new interop_transfer_id; payee credited twice; HTTP 409 without the original response body |
| Severity | CRITICAL |
| Invariant | INV-FED-004 |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-007 |

---

### FED-ROUTE-005 — Request Without Valid Signature Rejected

| Field | Value |
|-------|-------|
| Purpose | Unsigned or incorrectly signed routing requests must be rejected |
| Preconditions | Simulated Operator B running |
| Fixture | `ROUTING-REQUEST-NO-SIGNATURE`, `ROUTING-REQUEST-WRONG-SIGNATURE` |
| Input | POST routing request without Banza-Federation-Signature header |
| Expected Output | HTTP 401 |
| Evidence | Response status code |
| Pass | HTTP 401 on missing signature; HTTP 401 on wrong signature |
| Fail | Request accepted without signature; HTTP 400 used instead of 401; routing proceeds |
| Severity | CRITICAL |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-010 |

---

### FED-ROUTE-006 — Wrong to_operator_id Rejected

| Field | Value |
|-------|-------|
| Purpose | Routing request addressed to wrong operator is rejected |
| Preconditions | Simulated Operator B running |
| Fixture | `ROUTING-REQUEST-WRONG-DESTINATION` (to_operator_id = "some-other-operator") |
| Input | POST routing request with to_operator_id != Simulated Operator B's operator_id |
| Expected Output | HTTP 400 |
| Evidence | Response status; to_operator_id in request vs actual operator_id |
| Pass | HTTP 400 |
| Fail | Request accepted despite wrong to_operator_id |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-ROUTE-007 — Recipient Not Found Returns Structured Rejection

| Field | Value |
|-------|-------|
| Purpose | Unknown recipient produces rejection_code: recipient_not_found |
| Preconditions | Fixture uses a wallet_id that does not exist on Simulated Operator B |
| Fixture | `ROUTING-REQUEST-UNKNOWN-RECIPIENT` |
| Input | POST routing request with recipient_identifier = "wallet-does-not-exist" |
| Expected Output | HTTP 200; body: `{status:"rejected", rejection_code:"recipient_not_found"}` |
| Evidence | Full response |
| Pass | HTTP 200 AND status=rejected AND rejection_code=recipient_not_found |
| Fail | HTTP != 200; rejection_code missing; rejection_code wrong value; HTTP 404 used instead |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-ROUTE-008 — Unsupported Currency Returns Structured Rejection

| Field | Value |
|-------|-------|
| Purpose | Currency not in supported_currencies returns rejection_code: currency_not_supported |
| Preconditions | Simulated Operator B supports ["AOA"] only |
| Fixture | `ROUTING-REQUEST-WRONG-CURRENCY` (amount.currency = "EUR") |
| Input | POST routing request with unsupported currency |
| Expected Output | HTTP 200; status=rejected; rejection_code=currency_not_supported |
| Evidence | Full response |
| Pass | rejection_code=currency_not_supported |
| Fail | Request accepted; wrong rejection code |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-ROUTE-009 — Accepted Response Contains Valid interop_transfer_id

| Field | Value |
|-------|-------|
| Purpose | On acceptance, Operator B assigns an interop_transfer_id in the correct format |
| Preconditions | Routing accepted |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | POST valid routing request |
| Expected Output | Response.interop_transfer_id matches `^itx-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` |
| Evidence | interop_transfer_id value; regex match |
| Pass | Format matches |
| Fail | Format wrong; field missing; field not UUID-based |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-007 |

---

### FED-ROUTE-010 — Non-Positive amount.minor Rejected (INV-FED-LEDGER-002)

| Field | Value |
|-------|-------|
| Purpose | Zero or negative amounts must not be accepted |
| Preconditions | Simulated Operator B running |
| Fixture | `ROUTING-REQUEST-ZERO-AMOUNT`, `ROUTING-REQUEST-NEGATIVE-AMOUNT` |
| Input | POST routing request with amount.minor = 0 and amount.minor = -1000 |
| Expected Output | HTTP 400 or HTTP 200 with status=rejected |
| Evidence | Response |
| Pass | Amount ≤ 0 is rejected (HTTP 400 OR status=rejected) |
| Fail | Amount ≤ 0 accepted |
| Severity | CRITICAL |
| Invariant | INV-FED-LEDGER-002 |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-ROUTE-011 — Duplicate routing_request_id with Different Content Returns duplicate_request

| Field | Value |
|-------|-------|
| Purpose | Reusing an ID for a different payment is a protocol violation by Operator A; Operator B must detect it |
| Preconditions | First request (rr-abc) accepted with amount=1000; second request uses same rr-abc but amount=2000 |
| Fixture | `ROUTING-REQUEST-VALID`, `ROUTING-REQUEST-DUPLICATE-DIFFERENT-CONTENT` |
| Input | POST second request with same routing_request_id but different body |
| Expected Output | HTTP 200; status=rejected; rejection_code=duplicate_request |
| Evidence | Both requests; both responses |
| Pass | rejection_code=duplicate_request on second request; first request outcome unchanged |
| Fail | Second request accepted; second request processed as new routing; no duplicate detection |
| Severity | CRITICAL |
| Invariant | INV-FED-IDEM-001 |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-ROUTE-012 — Suspended Recipient Wallet Returns Structured Rejection

| Field | Value |
|-------|-------|
| Purpose | Suspended payee wallet results in rejection_code: recipient_suspended |
| Preconditions | Simulated Operator B has recipient wallet in suspended state |
| Fixture | `ROUTING-REQUEST-SUSPENDED-RECIPIENT` |
| Input | POST routing request to suspended wallet |
| Expected Output | status=rejected; rejection_code=recipient_suspended |
| Evidence | Response |
| Pass | rejection_code=recipient_suspended |
| Fail | Request accepted; wrong code; HTTP 4xx without structured response |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

## Suite: FED-EXEC — Transfer Execution

Tests the execution semantics: Operator B's credit is simultaneous with acceptance; Operator A's debit and obligation are atomic.

---

### FED-EXEC-001 — Payee Wallet Credited Simultaneously with Acceptance

| Field | Value |
|-------|-------|
| Purpose | When Operator B returns status=accepted, payee wallet is already credited |
| Preconditions | Simulated Operator B running with a resolvable recipient wallet |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | POST routing request; after receiving accepted response, query payee wallet balance |
| Expected Output | `GET /wallets/{payee_wallet_id}` on Simulated Operator B shows balance increased by amount.minor BEFORE any subsequent operation |
| Evidence | Payee wallet balance before routing; payee wallet balance immediately after acceptance response |
| Pass | balance_after - balance_before == amount.minor |
| Fail | Balance unchanged; balance changes only after a second message from Operator A; delay > 0ms after accepted response |
| Severity | CRITICAL |
| Invariant | INV-FED-LEDGER-001 |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-011 |

---

### FED-EXEC-002 — Ledger Entries Correct on Both Operators

| Field | Value |
|-------|-------|
| Purpose | Correct accounts debited/credited; amounts match; trace_id on both entries |
| Preconditions | Routing accepted; debit + obligation committed on Operator A |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | `GET /ledger/{payer_wallet_id}` on Operator A; `GET /ledger/{payee_wallet_id}` on Simulated Operator B |
| Expected Output | Operator A: DEBIT payer_wallet = amount.minor with trace_id. Operator B: CREDIT payee_wallet = amount.minor with trace_id |
| Evidence | Ledger entries from both operators; trace_id on each entry; amounts |
| Pass | Both entries present; amounts match routing request; trace_ids match; correct entry types |
| Fail | Missing entry; wrong amount; wrong trace_id; wrong entry type |
| Severity | CRITICAL |
| Invariant | INV-FED-LEDGER-001, INV-FED-005 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-011, FED-L3-014 |

---

### FED-EXEC-003 — No Debit Without Acceptance (BC-001)

| Field | Value |
|-------|-------|
| Purpose | If routing is rejected, payer wallet must not be debited |
| Preconditions | Simulated Operator B configured to reject |
| Fixture | `ROUTING-REQUEST-UNKNOWN-RECIPIENT` |
| Input | POST routing request; receive rejection; query payer wallet |
| Expected Output | Payer wallet balance unchanged |
| Evidence | Payer wallet balance before; payer wallet balance after rejection |
| Pass | balance_after == balance_before |
| Fail | Payer debited despite rejection |
| Severity | CRITICAL |
| Invariant | — |
| Contract | — |
| L3 Req | FED-L3-011 |

---

### FED-EXEC-004 — Debit and Obligation Are Atomic (BC-003)

| Field | Value |
|-------|-------|
| Purpose | No state exists where debit exists without obligation or vice versa |
| Preconditions | Routing accepted; Operator A completes Phase 4+5 |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | After acceptance: query `GET /ledger/{payer_wallet}` AND `GET /federation/obligations` on Operator A |
| Expected Output | If debit entry exists, corresponding obligation exists. If obligation exists, debit entry exists. |
| Evidence | Ledger entry; obligation; routing_request_id match between them |
| Pass | BOTH exist, linked by routing_request_id; neither exists without the other |
| Fail | Debit without obligation; obligation without debit; timing gap between the two |
| Severity | CRITICAL |
| Invariant | — (BC-003) |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-013 |

---

### FED-EXEC-005 — Acceptance Is Irrevocable on Operator B (BC-004)

| Field | Value |
|-------|-------|
| Purpose | Operator B cannot reverse an accepted routing request |
| Preconditions | Routing accepted; payee credited |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | Attempt to call `POST /federation/route/{routing_request_id}/cancel` or equivalent cancel endpoint |
| Expected Output | HTTP 404 (no cancel endpoint) OR HTTP 405 (method not allowed) OR HTTP 200 with status=rejected (re-routing refusal) — any response that demonstrates cancellation is impossible |
| Evidence | Payee wallet balance after attempted cancellation; balance must remain increased |
| Pass | Payee wallet balance unchanged after cancel attempt; no rollback occurs |
| Fail | Payee credit reversed; accepted routing can be cancelled |
| Severity | STANDARD |
| Invariant | — (BC-004) |
| Contract | — |
| L3 Req | — |

---

### FED-EXEC-006 — Operator B Internal Failure After Acceptance Does Not Affect Obligation

| Field | Value |
|-------|-------|
| Purpose | Even if Simulated Operator B has an internal inconsistency after accepting, Operator A's obligation remains valid |
| Preconditions | Simulated Operator B is configured to accept, then report internal error on follow-up status check |
| Fixture | `ROUTING-REQUEST-VALID`, `SIMULATED-B-INTERNAL-ERROR-AFTER-ACCEPT` |
| Input | After routing accepted, query obligation on Operator A |
| Expected Output | Obligation exists and is in settlement_state=pending regardless of Operator B's internal state |
| Evidence | Obligation record; settlement_state |
| Pass | Obligation exists; settlement_state=pending |
| Fail | Obligation missing; obligation reversed because Operator B reported error |
| Severity | STANDARD |
| Invariant | INV-FED-002 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-013 |

---

### FED-EXEC-007 — Provisional Completion: All 7 Criteria Met

| Field | Value |
|-------|-------|
| Purpose | Verify all 7 provisional completion criteria from FEDERATION_PROTOCOL_FLOW.md §10 are met |
| Preconditions | Full happy-path flow complete |
| Fixture | All previous fixtures combined |
| Input | Runner queries all completion evidence |
| Expected Output | (1) routing_request accepted ✓ (2) payer debited ✓ (3) payee credited ✓ (4) obligation pending ✓ (5) payment.initiated event ✓ (6) payment.completed event ✓ (7) both events share trace_id ✓ |
| Evidence | All 7 evidence items |
| Pass | All 7 checks = true |
| Fail | Any check = false |
| Severity | STANDARD |
| Invariant | INV-FED-001 |
| Contract | All |
| L3 Req | FED-L3-011, FED-L3-012, FED-L3-013, FED-L3-014 |

---

### FED-EXEC-008 — Double-Debit Prevention Via Posting Idempotency Key

| Field | Value |
|-------|-------|
| Purpose | Retrying Phase 4 (debit + obligation) with the same routing_request_id does not double-charge |
| Preconditions | Phase 4 completed once; runner triggers recovery path again |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | Operator A's recovery procedure runs Phase 4 again with same routing_request_id |
| Expected Output | Payer wallet balance decremented exactly once; obligation exists exactly once |
| Evidence | Payer wallet balance history; obligation count by routing_request_id |
| Pass | balance decremented once; exactly 1 obligation for routing_request_id |
| Fail | Balance decremented twice; 2 obligations for same routing_request_id |
| Severity | CRITICAL |
| Invariant | INV-FED-IDEM-001 |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

## Suite: FED-OBL — Obligation Lifecycle

---

### FED-OBL-001 — Obligation Created Immediately After Acceptance

| Field | Value |
|-------|-------|
| Purpose | Obligation exists in Operator A's obligation store after routing accepted |
| Preconditions | Routing accepted |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | `GET /federation/obligations?routing_request_id=rr-00000000-0000-0000-0000-000000000001` |
| Expected Output | HTTP 200; obligation in response; settlement_state=pending |
| Evidence | HTTP response; obligation JSON |
| Pass | Obligation found; settlement_state=pending; recorded within 5 seconds of acceptance |
| Fail | No obligation; wrong routing_request_id; settlement_state != pending |
| Severity | CRITICAL |
| Invariant | INV-FED-002 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-013 |

---

### FED-OBL-002 — Obligation Amount Equals Routing Request Amount (INV-FED-005)

| Field | Value |
|-------|-------|
| Purpose | Amount in obligation must match routing request exactly |
| Preconditions | Obligation exists |
| Fixture | `ROUTING-REQUEST-VALID` (amount.minor=50000, currency=AOA) |
| Input | Fetch obligation; compare amount to routing request |
| Expected Output | obligation.amount.minor == 50000 AND obligation.amount.currency == "AOA" |
| Evidence | routing request amount; obligation amount; comparison |
| Pass | Exact equality on both minor and currency |
| Fail | Any difference; rounding; currency changed |
| Severity | CRITICAL |
| Invariant | INV-FED-005 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-014 |

---

### FED-OBL-003 — Obligation trace_id Matches Routing Request (INV-FED-001)

| Field | Value |
|-------|-------|
| Purpose | trace_id propagated from routing request into obligation |
| Preconditions | Obligation exists |
| Fixture | `ROUTING-REQUEST-VALID` (trace_id = "tr-test-trace-001") |
| Input | Fetch obligation; compare trace_id |
| Expected Output | obligation.trace_id === "tr-test-trace-001" |
| Evidence | routing request trace_id; obligation trace_id; equality |
| Pass | Exact equality |
| Fail | Different value; missing |
| Severity | CRITICAL |
| Invariant | INV-FED-001 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-012 |

---

### FED-OBL-004 — One Obligation Per routing_request_id (INV-FED-002)

| Field | Value |
|-------|-------|
| Purpose | UNIQUE constraint enforced; duplicate obligation not possible |
| Preconditions | Obligation exists for routing_request_id = rr-abc |
| Fixture | `OBLIGATION-PENDING` |
| Input | Runner attempts to insert a second obligation with same routing_request_id via recovery path |
| Expected Output | No second obligation created; count remains 1 |
| Evidence | Count of obligations with routing_request_id = rr-abc before and after attempt |
| Pass | Count = 1 at all times |
| Fail | Count > 1; second obligation created |
| Severity | CRITICAL |
| Invariant | INV-FED-002 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-013 |

---

### FED-OBL-005 — obligor_signature Verifies Against Operator A Public Key

| Field | Value |
|-------|-------|
| Purpose | Obligation signed by Operator A; non-repudiable |
| Preconditions | Obligation exists; Operator A's published signed protocol metadata available |
| Fixture | `OBLIGATION-PENDING`, `CERT-A-VALID` |
| Input | Fetch obligation; extract obligor_signature; fetch Operator A's published signed protocol metadata; verify against its public key |
| Expected Output | ed25519_verify(op_a_public_key, canonical_obligation, obligor_signature) = true |
| Evidence | Canonical obligation JSON; signature bytes; verification result |
| Pass | Verification = true |
| Fail | Verification = false; signature missing; wrong key used |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-OBL-006 — Settlement State Transitions Are Valid

| Field | Value |
|-------|-------|
| Purpose | Obligation follows the correct state machine: pending → in_netting → settled only |
| Preconditions | Obligation in pending state; runner advances through netting cycle |
| Fixture | `OBLIGATION-PENDING`, `OBLIGATION-IN-NETTING`, `OBLIGATION-SETTLED` |
| Input | Observe state changes during runner-controlled netting cycle |
| Expected Output | States observed in order: pending, in_netting, settled |
| Evidence | State at each checkpoint |
| Pass | All three states observed in order; no backward transitions; no skipped states |
| Fail | Jumped from pending to settled without in_netting; went from settled to pending |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-OBL-007 — Settled Obligation Contains settled_at and settlement_batch_id

| Field | Value |
|-------|-------|
| Purpose | Settled obligations must have audit fields |
| Preconditions | Netting cycle completed; obligation in settled state |
| Fixture | `OBLIGATION-SETTLED` |
| Input | `GET /federation/obligations/{obligation_id}` |
| Expected Output | settlement_state=settled; settled_at present (ISO 8601); settlement_batch_id present |
| Evidence | Full obligation JSON |
| Pass | All three fields present and correctly typed |
| Fail | Any field missing; settled_at not ISO 8601; settlement_batch_id empty |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

## Suite: FED-EVT — Federation Event Emission

---

### FED-EVT-001 — federation.routing.accepted Emitted on Operator B

| Field | Value |
|-------|-------|
| Purpose | Operator B emits routing.accepted event on its event stream |
| Preconditions | Routing accepted |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | `GET {interop_endpoint}/federation/events` after routing; OR SSE subscription |
| Expected Output | Event with event_type=federation.routing.accepted; routing_request_id present; trace_id present |
| Evidence | Event JSON |
| Pass | Event found; all required federation fields present; event validates against schema |
| Fail | Event missing; wrong event_type; routing_request_id or trace_id absent |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-event.json` |
| L3 Req | — |

---

### FED-EVT-002 — federation.payment.initiated Emitted on Operator A

| Field | Value |
|-------|-------|
| Purpose | Operator A emits payment.initiated after debit |
| Preconditions | Debit and obligation committed |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | `GET /events` or `GET /federation/events` on Operator A |
| Expected Output | Event with event_type=federation.payment.initiated; trace_id; routing_request_id; interop_transfer_id |
| Evidence | Event JSON |
| Pass | Event found; fields present |
| Fail | Event missing |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-event.json` |
| L3 Req | — |

---

### FED-EVT-003 — federation.payment.completed Emitted on Operator B

| Field | Value |
|-------|-------|
| Purpose | Operator B emits payment.completed after crediting payee |
| Preconditions | Payee credited |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | Federation event stream on Simulated Operator B |
| Expected Output | Event with event_type=federation.payment.completed; trace_id; interop_transfer_id |
| Evidence | Event JSON |
| Pass | Event found |
| Fail | Event missing |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-event.json` |
| L3 Req | FED-L3-011 |

---

### FED-EVT-004 — federation.obligation.recorded Emitted on Operator A

| Field | Value |
|-------|-------|
| Purpose | Operator A emits obligation event after recording obligation |
| Preconditions | Obligation recorded |
| Fixture | `ROUTING-REQUEST-VALID` |
| Input | Event stream on Operator A |
| Expected Output | Event with event_type=federation.obligation.recorded; obligation_id; trace_id |
| Evidence | Event JSON |
| Pass | Event found; obligation_id matches recorded obligation |
| Fail | Event missing; wrong obligation_id |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-event.json` |
| L3 Req | — |

---

### FED-EVT-005 — All Federation Events for Same Payment Share trace_id (INV-FED-001)

| Field | Value |
|-------|-------|
| Purpose | trace_id invariant verified across all four event types for one payment |
| Preconditions | Full happy-path complete; all four events exist |
| Fixture | `ROUTING-REQUEST-VALID` (trace_id = "tr-test-trace-001") |
| Input | Collect all federation events related to this payment from both operators |
| Expected Output | ALL events have trace_id == "tr-test-trace-001" |
| Evidence | All event trace_ids; equality check |
| Pass | All trace_ids identical |
| Fail | Any event has different trace_id |
| Severity | CRITICAL |
| Invariant | INV-FED-001 |
| Contract | `federation-event.json` |
| L3 Req | FED-L3-012 |

---

### FED-EVT-006 — Federation Events Validate Against Schema

| Field | Value |
|-------|-------|
| Purpose | All federation events comply with federation-event.json schema |
| Preconditions | Events emitted |
| Fixture | All event fixtures |
| Input | All collected federation events |
| Expected Output | Each event validates against both base envelope schema AND federation-event.json extension |
| Evidence | Schema validation result per event |
| Pass | All events validate |
| Fail | Any event fails validation |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-event.json` |
| L3 Req | — |

---

## Suite: FED-SETTLE — Netting and Settlement

---

### FED-SETTLE-001 — Obligation Export Includes All Pending Obligations

| Field | Value |
|-------|-------|
| Purpose | Obligation export for netting period is complete |
| Preconditions | Multiple obligations created; netting cycle triggered |
| Fixture | `3x ROUTING-REQUEST-VALID` (obligations ob-001, ob-002, ob-003) |
| Input | Operator A's obligation export at netting cutoff |
| Expected Output | Export includes all 3 pending obligations with correct amounts and routing_request_ids |
| Evidence | Export content; obligation count; per-obligation amount |
| Pass | All 3 obligations in export; amounts correct; settlement_state advanced to in_netting |
| Fail | Any obligation missing; wrong amounts |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-008 |

---

### FED-SETTLE-002 — Net Position Computed Correctly

| Field | Value |
|-------|-------|
| Purpose | Net position = gross_A_to_B - gross_B_to_A |
| Preconditions | A→B obligations: 3×50,000=150,000. B→A obligations: 1×40,000=40,000 |
| Fixture | Mixed A→B and B→A obligations |
| Input | Runner observes net position computation |
| Expected Output | net = 150,000 - 40,000 = 110,000 (A owes B) |
| Evidence | gross_A_to_B; gross_B_to_A; computed net |
| Pass | net == 110,000 (integer, no rounding) |
| Fail | Wrong net; floating point used; gross values incorrect |
| Severity | STANDARD |
| Invariant | INV-FED-LEDGER-001 |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-SETTLE-003 — Both Operators Independently Compute Same Net

| Field | Value |
|-------|-------|
| Purpose | Net position agreement is bilateral and independent (prevents unilateral settlement) |
| Preconditions | Both operators have full obligation lists |
| Fixture | Same obligations on both sides |
| Input | Both operators compute net; Operator A sends signed net assertion |
| Expected Output | Simulated Operator B confirms identical net; settlement authorized |
| Evidence | Operator A's net; Operator B's net; confirmation |
| Pass | Both nets equal; settlement authorization issued |
| Fail | Nets differ; settlement proceeds without agreement; only one party computes |
| Severity | STANDARD |
| Invariant | INV-FED-LEDGER-001 |
| Contract | — |
| L3 Req | — |

---

### FED-SETTLE-004 — Settlement Execution: Ledger Entries Correct

| Field | Value |
|-------|-------|
| Purpose | Settlement bank transfer produces correct ledger entries on both operators |
| Preconditions | Net position agreed; runner simulates bank transfer success |
| Fixture | `SETTLEMENT-BANK-SUCCESS` |
| Input | Settlement execution; observe ledger entries |
| Expected Output | Operator A: DEBIT federation_payable:op-b (net), CREDIT federation_settlement_clearing (net). Operator B: DEBIT federation_settlement_clearing (net), CREDIT federation_receivable:op-a (net) |
| Evidence | Ledger entries with account names and amounts |
| Pass | All 4 entries present with correct amounts and accounts |
| Fail | Wrong accounts; wrong amounts; entries missing |
| Severity | STANDARD |
| Invariant | INV-FED-LEDGER-001 |
| Contract | — |
| L3 Req | — |

---

### FED-SETTLE-005 — Obligations Marked Settled With Required Fields

| Field | Value |
|-------|-------|
| Purpose | All obligations in the netting batch update to settled state with audit fields |
| Preconditions | Settlement executed |
| Fixture | `SETTLEMENT-BANK-SUCCESS` |
| Input | `GET /federation/obligations` after settlement; filter by settlement_batch_id |
| Expected Output | All obligations: settlement_state=settled, settled_at=ISO 8601, settlement_batch_id=stl-... |
| Evidence | Obligation states after settlement |
| Pass | All in batch have settlement_state=settled; settled_at and settlement_batch_id present |
| Fail | Any obligation still pending; missing fields |
| Severity | STANDARD |
| Invariant | — |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-SETTLE-006 — Reconciliation: All Accepted Routing Requests Have Obligations

| Field | Value |
|-------|-------|
| Purpose | No accepted routing request exists without a corresponding obligation (INV-FED-002) |
| Preconditions | 5 routing requests accepted; runner checks obligations |
| Fixture | `5x ROUTING-REQUEST-VALID` |
| Input | Cross-reference routing_request_ids of accepted requests against obligation store |
| Expected Output | Every accepted routing_request_id has exactly one obligation in the store |
| Evidence | List of accepted routing_request_ids; list of obligation routing_request_ids; cross-reference result |
| Pass | 1:1 match; no orphan routing requests |
| Fail | Any accepted request without obligation |
| Severity | CRITICAL |
| Invariant | INV-FED-RECON-001 |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-SETTLE-007 — Reconciliation: Trace Cross-Check Across Both Operators

| Field | Value |
|-------|-------|
| Purpose | For each payment, trace_id appears in both operators' artifacts (INV-FED-RECON-001) |
| Preconditions | Full happy-path complete with 3 payments |
| Fixture | `3x ROUTING-REQUEST-VALID` with distinct trace_ids |
| Input | Collect: Operator A ledger entries, obligations, events; Simulated Operator B ledger entries, events |
| Expected Output | For each trace_id T: ledger entry on A with T; obligation with T; ledger entry on B with T; event on B with T |
| Evidence | All artifacts per trace_id |
| Pass | All 4 artifact types found per trace_id |
| Fail | Any trace_id missing from any artifact type |
| Severity | STANDARD |
| Invariant | INV-FED-RECON-001 |
| Contract | All |
| L3 Req | FED-L3-012 |

---

### FED-SETTLE-008 — Settlement Blocked on Unresolved Discrepancy

| Field | Value |
|-------|-------|
| Purpose | Settlement MUST NOT proceed if reconciliation shows unresolved amount mismatch |
| Preconditions | Simulated Operator B reports a different amount for one obligation |
| Fixture | `NETTING-DISCREPANCY-AMOUNT-MISMATCH` |
| Input | Runner triggers netting with amount discrepancy; observes settlement |
| Expected Output | Settlement halted; discrepancy logged; no bank transfer initiated |
| Evidence | Settlement halt log; discrepancy details |
| Pass | No bank transfer; discrepancy logged with routing_request_id and differing amounts |
| Fail | Settlement proceeds despite discrepancy |
| Severity | CRITICAL |
| Invariant | INV-FED-LEDGER-001 |
| Contract | — |
| L3 Req | — |

---

### FED-SETTLE-009 — Netting Disagreement: Full Obligation Exchange Identifies Discrepancy

| Field | Value |
|-------|-------|
| Purpose | When net positions differ, full obligation exchange enables discrepancy identification |
| Preconditions | Operator A is missing one obligation; Simulated Operator B has the corresponding accepted routing |
| Fixture | `NETTING-DISAGREEMENT` |
| Input | Netting disagreement triggers full export; cross-reference by routing_request_id |
| Expected Output | Missing obligation identified by routing_request_id; recovery procedure initiated |
| Evidence | Export comparison; identified discrepancy |
| Pass | Discrepancy identified by routing_request_id; recovery initiated |
| Fail | Disagreement not resolved; settlement attempted anyway |
| Severity | STANDARD |
| Invariant | INV-FED-RECON-001 |
| Contract | — |
| L3 Req | — |

---

### FED-SETTLE-010 — Zero-Net Case: No Bank Transfer; All Obligations Settled

| Field | Value |
|-------|-------|
| Purpose | When gross_A_to_B == gross_B_to_A, no bank transfer needed; obligations still marked settled |
| Preconditions | Equal obligations flowing in both directions |
| Fixture | `NETTING-ZERO-NET` |
| Input | Netting cycle with net = 0 |
| Expected Output | No bank transfer initiated; all obligations marked settled with settlement_batch_id |
| Evidence | Bank transfer log (empty); obligation states |
| Pass | No bank transfer; all obligations settled |
| Fail | Bank transfer attempted for 0; obligations left pending |
| Severity | STANDARD |
| Invariant | INV-FED-LEDGER-001 |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

## Suite: FED-FAIL — Failure and Recovery

---

### FED-FAIL-001 — Network Timeout Retry With Same routing_request_id Succeeds

| Field | Value |
|-------|-------|
| Purpose | F-101: timeout + idempotent retry completes successfully without double payment |
| Preconditions | Runner configures Simulated Operator B to drop first request; process second identically |
| Fixture | `ROUTING-REQUEST-VALID`, `SIMULATED-NETWORK-DROP-ONCE` |
| Input | Operator A sends routing request; first attempt times out after 30s; retry with same routing_request_id |
| Expected Output | Second attempt accepted; payee credited once only; obligation created once only |
| Evidence | Retry log; payee wallet balance (debited once); obligation count (= 1) |
| Pass | Payment succeeds on retry; no double payment |
| Fail | Operator A generates new routing_request_id on retry (BC-005 violation); double credit |
| Severity | CRITICAL |
| Invariant | INV-FED-004 |
| Contract | `federation-routing.json` |
| L3 Req | — |

---

### FED-FAIL-002 — All Retries Fail: Payment Fails, No Debit, No Obligation

| Field | Value |
|-------|-------|
| Purpose | When all retries are exhausted, payer is not debited and no obligation is recorded |
| Preconditions | Simulated Operator B offline; all 3 retry attempts time out |
| Fixture | `SIMULATED-B-OFFLINE` |
| Input | Operator A attempts routing; all 3 retries time out |
| Expected Output | Payment state = failed; payer wallet balance unchanged; obligation count = 0 |
| Evidence | Payment state; payer wallet balance; obligation store |
| Pass | No debit; no obligation; payment_state = failed |
| Fail | Payer debited despite failed routing; obligation created without acceptance |
| Severity | CRITICAL |
| Invariant | INV-FED-002 |
| Contract | — |
| L3 Req | — |

---

### FED-FAIL-003 — Unparseable Response Treated as Network Failure

| Field | Value |
|-------|-------|
| Purpose | F-102: malformed response triggers retry, not debit |
| Preconditions | Simulated Operator B returns HTTP 200 with invalid JSON body |
| Fixture | `SIMULATED-MALFORMED-RESPONSE` |
| Input | POST routing request; receive malformed response |
| Expected Output | Operator A treats as ambiguous; retries with same routing_request_id; no debit on malformed response |
| Evidence | Retry log; payer wallet balance after malformed response |
| Pass | No debit after malformed response; retry attempted |
| Fail | Debit executed on malformed response; new routing_request_id generated |
| Severity | STANDARD |
| Invariant | INV-FED-004 |
| Contract | — |
| L3 Req | — |

---

### FED-FAIL-004 — Operator A Trust Material Rejected by Operator B (F-204)

| Field | Value |
|-------|-------|
| Purpose | When Simulated Operator B runs the Open Trust Evaluation on Operator A and it fails, routing is rejected with operator_trust_failure |
| Preconditions | Runner configures Simulated Operator B to evaluate Operator A's published trust material; Operator A's signed protocol metadata has expired |
| Fixture | `CERT-A-EXPIRED` |
| Input | POST routing request from Operator A whose signed protocol metadata has expired |
| Expected Output | rejection_code = operator_trust_failure |
| Evidence | Routing response |
| Pass | rejection_code = operator_trust_failure |
| Fail | Request accepted despite Operator A's expired trust material |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-004 |
| Contract | `federation-routing.json` |
| L3 Req | FED-L3-010 |

---

### FED-FAIL-005 — Crash Recovery: Missing Obligation Recreated (F-402)

| Field | Value |
|-------|-------|
| Purpose | On restart, Operator A discovers and closes gap: accepted routing without obligation |
| Preconditions | Runner injects a state: routing_request accepted but obligation not recorded (simulating crash in Phase 5) |
| Fixture | `ACCEPTED-ROUTING-NO-OBLIGATION` |
| Input | Operator A's recovery process runs on startup |
| Expected Output | Obligation created for the accepted routing request; debit completed; states consistent |
| Evidence | Obligation store before and after recovery; ledger state |
| Pass | Obligation exists after recovery; debit exists; both linked by routing_request_id |
| Fail | Recovery not triggered; obligation still missing after restart |
| Severity | CRITICAL |
| Invariant | INV-FED-002 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-013 |

---

### FED-FAIL-006 — Extended BRL Outage: Fail-Closed After 12 Hours

| Field | Value |
|-------|-------|
| Purpose | F-602: when BRL is > 12h stale and endpoint is down, all routing must stop |
| Preconditions | Runner serves stale BRL (expires_at = 13 hours ago); BRL endpoint returns 503 |
| Fixture | `BRL-STALE-13H` |
| Input | Operator A attempts routing when BRL is 13h stale |
| Expected Output | Routing refused; error indicates BRL staleness |
| Evidence | Routing refusal; BRL age |
| Pass | Routing refused when BRL > 12h old AND endpoint unavailable |
| Fail | Routing accepted with 13h stale BRL |
| Severity | STANDARD |
| Invariant | INV-FEDEVAL-005 |
| Contract | — |
| L3 Req | — |

---

### FED-FAIL-007 — Revocation Mid-Flight: Obligation Survives Revocation

| Field | Value |
|-------|-------|
| Purpose | An obligation recorded before BRL propagation must survive after operator is revoked |
| Preconditions | Routing accepted and obligation recorded before revocation; runner then adds operator to BRL |
| Fixture | `OBLIGATION-PENDING`, `BRL-CONTAINS-OP-B-POST-OBLIGATION` |
| Input | Check obligation state after BRL updated to revoke Operator B |
| Expected Output | Obligation remains in settlement_state=pending; not deleted or cancelled |
| Evidence | Obligation state before and after BRL update |
| Pass | Obligation still exists and is pending; revocation does not delete obligations |
| Fail | Obligation deleted; obligation cancelled due to revocation |
| Severity | STANDARD |
| Invariant | INV-FED-002 |
| Contract | `federation-obligation.json` |
| L3 Req | — |

---

### FED-FAIL-008 — Obligation Amount Mismatch Detected Before Signing (F-404)

| Field | Value |
|-------|-------|
| Purpose | If obligation amount != routing request amount, obligation is never recorded |
| Preconditions | Runner injects a scenario where Operator A would have a mismatched amount at obligation creation |
| Fixture | `ROUTING-REQUEST-VALID` (amount=50000), `OBLIGATION-WRONG-AMOUNT` (amount=49999) |
| Input | Operator A's obligation creation with mismatched amount |
| Expected Output | Obligation NOT recorded; CRITICAL alert raised; no debit |
| Evidence | Obligation store (must be empty); alert log |
| Pass | No obligation created; error logged with INV-FED-005 reference |
| Fail | Obligation with wrong amount persisted; no error raised |
| Severity | CRITICAL |
| Invariant | INV-FED-005 |
| Contract | `federation-obligation.json` |
| L3 Req | FED-L3-014 |
