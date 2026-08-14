# BANZA Federation Conformance Runner Design

**Document ID:** FEDERATION-CONFORMANCE-DESIGN-001  
**Date:** 2026-05-31  
**Status:** Canonical — runner architecture specification.  
**Authority:** ADR-025, ADR-031, ADR-025, FEDERATION_CONFORMANCE_MODEL.md, FEDERATION_TEST_SUITE_SPEC.md

---

## Overview

The federation conformance runner is the tool that runs L3 federation conformance tests against an operator and emits the operator's self-published signed protocol metadata + conformance evidence. It extends the existing `tools/banza-conformance/` single-operator runner with a federation mode that embeds a Simulated Operator B and a test trust root.

Conformance is measured, not granted: the runner produces reproducible, machine-verifiable evidence. Whether that evidence lets a peer route is a **local** decision each peer reaches by running the Open Trust Evaluation (ADR-025) over the published material.

This document specifies the runner's architecture, test environment, isolation model, and behavioral contracts. It does not implement the runner — it is the specification from which implementation proceeds.

---

## 1. Invocation Model

### 1.1 CLI Interface

```bash
# L0-L2 (existing, unchanged)
banza-conformance --operator-a https://api.operator.example --level 2

# L3 Federation (new)
banza-conformance --federation \
  --operator-a https://api.operator-a.example \
  --level 3 \
  --output ./evidence-package/ \
  [--suite FED-CERT,FED-DISC,FED-TRUST]    # optional: run subset
  [--fixture-override ./custom-fixtures/]   # optional: override specific fixtures
  [--sim-b-port 9090]                       # optional: Simulated Operator B port
```

### 1.2 Output

On success:
```
banza-conformance: L3 federation conformance run complete
Evidence package: ./evidence-package/
Overall result: PASS (79/79 tests passed)
Blocking suites: ALL PASS
Publish the evidence bundle at your protocol_metadata_url; peers evaluate it locally (no submission, no review).
```

On failure:
```
banza-conformance: L3 federation conformance run complete
Evidence package: ./evidence-package/
Overall result: FAIL
Critical failures: 2
  - FED-TRUST-002: FAIL (signed metadata tampered, signature check not enforced) [CRITICAL]
  - FED-ROUTE-004: FAIL (idempotency not enforced, double credit occurred) [CRITICAL]
Blocking suites: FED-TRUST FAIL, FED-ROUTE FAIL
Open Trust Evaluation outcome: FAIL_CLOSED. Fix the above failures and re-run.
```

---

## 2. Runner Components

```
┌────────────────────────────────────────────────────────────────┐
│                     Conformance Runner                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Test        │  │  Evidence    │  │  Report              │  │
│  │  Orchestrator│  │  Collector   │  │  Generator           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                      │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │                 Test HTTP Client                          │   │
│  │  (sends requests to Operator A; captures responses)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Test Trust Root                              │   │
│  │  - Generates test ed25519 keypair at startup              │   │
│  │  - Endorses a test metadata-domain delegated key          │   │
│  │  - Serves test BRL at embedded HTTP endpoint              │   │
│  │  - Serves trust-root key manifest at embedded endpoint    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Simulated Operator B                         │   │
│  │  - Full BANZA-compliant operator stub                     │   │
│  │  - Self-publishes test signed metadata + evidence         │   │
│  │  - Routes to pre-configured recipient wallets             │   │
│  │  - Records all interactions for evidence                  │   │
│  │  - Configurable failure injection per fixture             │   │
│  │  - Serves at localhost:{sim-b-port}                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Simulated Bank Rail                          │   │
│  │  - Returns configurable success/failure/timeout           │   │
│  │  - Records transfer initiation for evidence               │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Test Trust Root

### 3.1 Keypair Generation

The runner generates a fresh ed25519 keypair at startup:

```
test_root_private_key    = ed25519_generate_private_key()
test_root_public_key     = ed25519_derive_public_key(test_root_private_key)
test_root_key_id         = "test-root-key-" + date_stamp        // e.g. "test-root-key-2026-05"

# Model A (ADR-025): the root signs only the test Key Manifest; a metadata-domain
# delegated key — endorsed by that Key Manifest — signs the test protocol metadata.
test_metadata_private_key = ed25519_generate_private_key()
test_metadata_public_key  = ed25519_derive_public_key(test_metadata_private_key)
test_metadata_key_id      = "test-banza-metadata-" + date_stamp
```

Both keypairs are ephemeral — new ones are generated per run. This ensures no test run depends on a previous run's keypair state.

### 3.2 Protocol Metadata Signing

The test trust chain signs **test protocol metadata** — the yardstick each side is measured against (specification version, vector digests, validator versions, compatibility rules). Model A applies in tests exactly as in production (ADR-025): the ephemeral test root signs only the test Key Manifest, which endorses an ephemeral protocol-metadata-domain delegated key; that delegated key signs the test protocol metadata. It never signs anything about an operator: operators sign their own conformance evidence with their own keys (INV-FEDEVAL-009).

```python
def sign_protocol_metadata(protocol_version, content_hash, lifetime_days=89):
    metadata = {
        "metadata_id": "spm-" + uuid4(),
        "metadata_type": "protocol_metadata",
        "protocol_version": protocol_version,
        "content_hash": content_hash,           # hash of the specification refs / vector digests
        "issued_at": now_iso8601(),
        "expires_at": (now() + timedelta(days=lifetime_days)).iso8601(),
        "trust_root_version": test_root_key_id
    }
    canonical = canonical_json(metadata)  # sorted keys, no whitespace
    metadata["signatures"] = [{
        "issuer_key_id": test_metadata_key_id,
        "signature": base64url(ed25519_sign(test_metadata_private_key, canonical))
    }]
    return metadata
```

The operator's **conformance evidence** references this signed metadata (`conformance_report_hash`, `evidence_bundle_hash`, `verified_by_tool_version`, `trust_root_version`) and is signed by the operator's own key. Any third party recomputes the hashes and re-runs the automation to reach the same state independently.

### 3.3 Test Root Endpoint

The runner serves the following at `http://localhost:{root-port}`:

```
GET /federation/public-keys.json  → trust-root key manifest (signed by test root)
GET /federation/revocation-list.json → current test BRL (configurable per test)
```

### 3.4 Operator A Trust-Material Setup

Before running tests, the runner:
1. Generates an Operator A test keypair (separate from the test trust-root keypair)
2. Signs test protocol metadata for Operator A's `protocol_version` (METADATA-A-VALID) with the test metadata-domain delegated key, and records Operator A's self-signed conformance evidence (EVIDENCE-A-VALID) against it
3. Configures Operator A with the test trust material and the corresponding private key (via environment variable or config endpoint — operator-specific)
4. Configures Operator A to use `http://localhost:{root-port}/federation/revocation-list.json` as its BRL endpoint

**Configuration delivery:** The runner sends a setup request to Operator A's conformance setup endpoint (if present) or uses environment variables documented by the operator. Operators must expose a mechanism for the runner to configure:
- Their own test signed protocol metadata (METADATA-A-VALID) and self-signed conformance evidence (EVIDENCE-A-VALID)
- Their own private key (for request signing and evidence signing)
- The BRL endpoint URL (pointing to runner's test BRL)
- The trust-root public key endpoint URL

---

## 4. Simulated Operator B

### 4.1 Embedded Implementation

The Simulated Operator B is a lightweight HTTP server embedded in the runner, implementing:

```
GET  /.well-known/banza/operator.json            → MANIFEST-B-VALID (or configured manifest)
GET  /.well-known/banza/signed-protocol-metadata.json   → METADATA-B-VALID (or configured metadata)
GET  /.well-known/banza/conformance-evidence.json → EVIDENCE-B-VALID (or configured evidence)
POST /federation/route                            → processes routing requests
GET  /federation/obligations                     → returns obligation store
GET  /federation/events                          → returns event log
GET  /wallets/{wallet_id}                        → wallet balance queries
GET  /ledger/{wallet_id}                         → ledger entry queries
```

### 4.2 Pre-Configured Wallets

Simulated Operator B pre-creates the following wallets at startup:

| Wallet ID | State | Balance | Purpose |
|-----------|-------|---------|---------|
| `wallet-payee-test-001` | active | 0 AOA | Happy-path recipient |
| `wallet-suspended-test-001` | suspended | 0 AOA | FED-ROUTE-012 |

All other wallet IDs resolve to "not found" (FED-ROUTE-007).

### 4.3 Routing Request Handling

The Simulated Operator B's routing handler:

```python
def handle_routing_request(request):
    # Step 1: Parse and validate schema
    # Step 2: Check to_operator_id
    # Step 3: Verify Banza-Federation-Signature
    #   - Fetch protocol_metadata_url from request
    #   - Run the Open Trust Evaluation checks on Operator A's published material
    #   - Verify ed25519 signature
    # Step 4: Check idempotency
    #   - If routing_request_id in store with SAME content: replay original response
    #   - If routing_request_id in store with DIFFERENT content: return duplicate_request
    # Step 5: Validate business rules (currency, amount, recipient)
    # Step 6: Apply fixture-configured behavior (drop, malformed, etc.)
    # Step 7: Credit payee and accept (atomically in Sim Op B's in-memory store)
    # Step 8: Return ROUTING-RESPONSE-ACCEPTED
```

### 4.4 Failure Injection

Per-test failure injection is specified in simulation control fixtures:

| Fixture | Injected Behavior |
|---------|------------------|
| SIMULATED-NETWORK-DROP-ONCE | Drop first request (no response); process second normally |
| SIMULATED-B-OFFLINE | Return connection refused for all requests |
| SIMULATED-MALFORMED-RESPONSE | Return HTTP 200 with invalid JSON body |
| SIMULATED-B-INTERNAL-ERROR-AFTER-ACCEPT | Accept routing; return 500 on follow-up status queries |

Failure injection is activated per-test by the Test Orchestrator configuring Sim Op B before each test case.

---

## 5. Network Assumptions

### 5.1 What the Runner Assumes

- Operator A is reachable at the URL provided via `--operator-a`
- Operator A can reach Simulated Operator B at `http://localhost:{sim-b-port}` or a configured URL
- Operator A can reach the runner's test BRL endpoint at `http://localhost:{root-port}/federation/revocation-list.json`
- All connections use TLS in production (HTTP allowed in test/sandbox environments)

### 5.2 What the Runner Does NOT Assume

- Operator A's database schema
- Operator A's internal implementation language
- Operator A's key storage mechanism
- Operator A's event delivery mechanism (polling or SSE are both accepted)

### 5.3 Firewall Considerations

For network-isolated operators, the runner can be configured to expose endpoints on a reachable address:

```bash
banza-conformance --federation \
  --operator-a https://api.operator.example \
  --sim-b-host 0.0.0.0 \
  --sim-b-port 9090 \
  --trust-root-host 0.0.0.0 \
  --trust-root-port 9091
```

The operator then configures:
- Simulated Operator B URL: `http://{runner-host}:9090`
- BRL endpoint: `http://{runner-host}:9091/federation/revocation-list.json`

---

## 6. Test Isolation

### 6.1 Per-Test State Reset

Before each test case, the runner:
1. Resets Simulated Operator B's in-memory state (wallet balances, obligation store, event log)
2. Restores fixture-default wallet states (payee wallet balance = 0)
3. Clears Simulated Operator B's routing request store (idempotency cache)
4. Configures the failure injection for the upcoming test (if any)
5. Resets the test BRL to `BRL-CURRENT-EMPTY` (unless overridden by the test)

### 6.2 Deterministic IDs

Routing request IDs, obligation IDs, and trace IDs are pre-assigned per test case (from the fixture catalog). This ensures:
- Test results are reproducible
- Evidence can be matched across multiple evidence packages (if the same test is run twice)
- Idempotency tests work correctly (Sim Op B recognizes the same routing_request_id on retry)

### 6.3 State Injection (FED-FAIL-005)

For FED-FAIL-005 (crash recovery), the runner injects a pre-existing state into Operator A. If Operator A exposes a conformance state-injection endpoint:

```
POST /conformance/inject-state
{
  "routing_requests": [
    { "routing_request_id": "rr-...", "state": "accepted", "interop_transfer_id": "itx-..." }
  ],
  "obligations": []
}
```

If Operator A does not expose this endpoint, FED-FAIL-005 is marked SKIPPED and a note is added to the evidence package.

---

## 7. Clock Control

### 7.1 Approach

The runner does NOT inject clocks into the operator under test. Instead, it calibrates fixtures relative to the runner's actual wall clock:

- **METADATA-A-VALID / EVIDENCE-A-VALID:** `issued_at = now - 1 day`, `expires_at = now + 89 days` → Always fresh
- **MATERIAL-EXPIRED:** `issued_at = now - 100 days`, `expires_at = now - 10 days` → Always expired
- **BRL-CURRENT-EMPTY:** `issued_at = now`, `expires_at = now + 7 hours` → Always fresh
- **BRL-EXPIRED:** `issued_at = now - 8 hours`, `expires_at = now - 1 hour` → Always expired

This means tests are time-invariant: they produce the same results regardless of when they run.

### 7.2 Clock Skew Test (FED-CERT-003)

To test that Operator A correctly rejects future-dated trust material (F-601), the runner signs protocol metadata with:
- `issued_at = now + 10 minutes` (future-dated, but only slightly)
- `expires_at = now + 89 days`

Operator A should reject this at the freshness/validity check (`issued_at > now`).

---

## 8. Replay Behavior

### 8.1 Routing Request Replay

For idempotency tests (FED-ROUTE-004), the runner sends the same routing request twice:
1. First request: Simulated Operator B processes normally, returns accepted
2. Second request (same routing_request_id, same body): Sim Op B returns original response without re-processing
3. Runner verifies: Sim Op B's payee wallet balance increased by exactly one payment

### 8.2 Evidence Replay

The evidence package is the immutable record of a run. If any third party needs to verify a specific step:
1. Extract the raw HTTP request from `routing-logs/FED-ROUTE-001-request.json`
2. Re-compute the ed25519 signature verification using the Operator A public key in the evidence
3. Compare to `routing-logs/FED-ROUTE-001-result.json`

This makes all verification steps independently reproducible by any third party without re-running the operator — the defining property of measured conformance.

---

## 9. Pass/Fail Determination

### 9.1 Per-Test Determination

Each test case has explicit pass and fail conditions defined in the test spec. The runner evaluates them in order:

```python
def evaluate_test(test_id, evidence):
    for fail_condition in test_spec[test_id].fail_conditions:
        if fail_condition.applies(evidence):
            return TestResult(
                id=test_id,
                result="FAIL",
                reason=fail_condition.description,
                severity=fail_condition.severity,
                evidence=evidence
            )
    for pass_condition in test_spec[test_id].pass_conditions:
        if not pass_condition.applies(evidence):
            return TestResult(id=test_id, result="FAIL", reason="Pass condition not met", ...)
    return TestResult(id=test_id, result="PASS", evidence=evidence)
```

### 9.2 Suite-Level Determination

```python
def evaluate_suite(suite_id, test_results):
    has_critical_fail = any(r.severity == "CRITICAL" and r.result == "FAIL" for r in test_results)
    has_any_fail = any(r.result == "FAIL" for r in test_results)
    
    if has_critical_fail:
        return SuiteResult(result="FAIL", blocking=True)
    elif has_any_fail:
        return SuiteResult(result="FAIL", blocking=(suite_id in BLOCKING_SUITES))
    else:
        return SuiteResult(result="PASS")
```

### 9.3 Routing Decision

The runner reports the reference Open Trust Evaluation outcome — the same ROUTING_ALLOWED / FAIL_CLOSED determination a peer reaches locally over the published material:

```
BLOCKING_SUITES = [FED-CERT, FED-DISC, FED-TRUST, FED-ROUTE, FED-EXEC, FED-OBL]

routing_outcome = "ROUTING_ALLOWED"
for suite in all_suites:
    if suite.result == "FAIL" and suite.id in BLOCKING_SUITES:
        routing_outcome = "FAIL_CLOSED"
        break

if any_critical_fail:
    routing_outcome = "FAIL_CLOSED"
```

### 9.4 Strict Outcome Table

| Condition | Reference outcome | Notes |
|-----------|-------------------|-------|
| All 79 tests PASS | ROUTING_ALLOWED | No conditions |
| FED-CERT: any FAIL | FAIL_CLOSED | |
| FED-DISC: any FAIL | FAIL_CLOSED | |
| FED-TRUST: any FAIL | FAIL_CLOSED | |
| FED-ROUTE: FAIL on 001-009 | FAIL_CLOSED | |
| FED-ROUTE: FAIL on 010-012 only | Capability-scoped | Core scope ROUTING_ALLOWED; re-run and re-publish to add coverage |
| FED-EXEC: FAIL on 001-005 | FAIL_CLOSED | |
| FED-EXEC: FAIL on 006-008 only | Capability-scoped | |
| FED-OBL: FAIL on 001-005 | FAIL_CLOSED | |
| FED-OBL: FAIL on 006-007 only | Capability-scoped | |
| FED-EVT: any FAIL | Capability-scoped | Event emission is non-financial |
| FED-SETTLE: FAIL on 001-008 | Capability-scoped | Settlement cannot be tested end-to-end without real bank |
| FED-FAIL: FAIL on 001, 004, 005 | FAIL_CLOSED | Critical recovery paths |
| FED-FAIL: FAIL on 002, 003, 006, 007, 008 | Capability-scoped | |
| Any CRITICAL severity FAIL | FAIL_CLOSED | Regardless of suite |

Capability-scoped means the peer's Open Trust Evaluation fails closed only for the affected capability (ADR-025 check 7, INV-FEDEVAL-007); the core federation routing capability still reaches ROUTING_ALLOWED. Recovery needs no one's permission: the operator re-runs the public automation and re-publishes the extended evidence.

---

## 10. Evidence Package Generation

### 10.1 Package Assembly

At run completion:
```python
def generate_evidence_package(output_dir, test_results, all_evidence):
    write_file(f"{output_dir}/run-id.txt", run_id)
    write_file(f"{output_dir}/report.json", generate_report(test_results))
    
    for suite, results in test_results_by_suite:
        write_file(f"{output_dir}/suite-results/{suite}.json", results)
    
    for evidence_item in all_evidence:
        write_file(f"{output_dir}/{evidence_item.path}", evidence_item.content)
    
    # Seal the package for tamper-evidence (run-integrity seal, not an operator endorsement)
    all_files_hash = sha256_of_all_files(output_dir)
    signature = ed25519_sign(test_root_private_key, all_files_hash)
    write_file(f"{output_dir}/package-signature.json", {
        "run_id": run_id,
        "files_hash": hex(all_files_hash),
        "runner_public_key": base64url(test_root_public_key),
        "runner_key_id": test_root_key_id,
        "signature": base64url(signature)
    })
```

The package seal makes the run tamper-evident; it is not an endorsement of the operator. The operator's conformance evidence inside the package is signed by the operator's own key (INV-FEDEVAL-009), and any third party re-runs the automation to reach the same state.

### 10.2 Report Format

The `report.json` follows the existing `conformance/report-schema.json` format, extended with federation fields:

```json
{
  "report_id": "rpt-fed-2026-06-01T10:00:00Z-operator-a-test",
  "generated_at": "2026-06-01T10:05:00Z",
  "runner_version": "2.0.0-federation",
  "operator_url": "https://api.operator-a-test.example",
  "operator_id": "operator-a-test",
  "protocol_version": "1.0",
  "federation_mode": true,
  "conformance_level": 3,
  "summary": {
    "total": 79,
    "passed": 79,
    "failed": 0,
    "skipped": 0,
    "warnings": 0
  },
  "suites": [
    {
      "suite_id": "FED-CERT",
      "overall_result": "PASS",
      "blocking": true,
      "tests": [...]
    }
  ]
}
```

---

## 11. Integration With Existing Runner

The federation runner is implemented as part of `engines/banza-conformance` (`run-fed`):

```
engines/banza-conformance/          # the runner (Rust); `run-fed` executes the federation suites
engines/banza-simb/                 # deterministic in-process Operator B simulator (no network)
engines/banza-trust/                # trust verification + TEST-ONLY signing and root-ceremony simulator

conformance/
  federation/                       # federation suites and trust configuration
  fixtures/                         # the committed federation fixtures
  vectors/                          # the conformance vectors the suites draw on
```

The layout above is the current one. Earlier drafts of this document described a Python tree under
`tools/banza-conformance/` with per-concern modules (`sim-b/server.py`, `trust-root/keygen.py`,
`evidence/signer.py`); that implementation was replaced by the Rust engines under ADR-038 and no longer
exists. The design below is unchanged by that move — it describes what the runner must do, not what it
is written in.

---

## 12. Simulated Bank Rail

The Simulated Bank Rail is a simple stub that logs settlement initiation:

```
POST /bank/transfer
  Body: { amount, currency, from_account, to_account, reference }
  Response (SETTLEMENT-BANK-SUCCESS): HTTP 200 { transfer_id, status: "accepted" }
  Response (SETTLEMENT-BANK-FAILURE): HTTP 200 { error: "nsf", status: "rejected" }
```

The runner configures which response the bank returns via the SETTLEMENT-BANK-SUCCESS or SETTLEMENT-BANK-FAILURE fixture. Operator A must be configured to point its `SettlementExecutionProvider` at `http://localhost:{bank-port}/bank/transfer` for testing.
