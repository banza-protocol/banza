# BANZA Federation Conformance Evidence Model

**Document ID:** FEDERATION-CONFORMANCE-DESIGN-001  
**Status:** Canonical — defines what an operator publishes as reproducible conformance evidence for L3 Federation.  
**Authority:** ADR-025, ADR-031, ADR-025; `FEDERATION_CONFORMANCE_MODEL.md`

---

## Evidence Philosophy

Evidence is the reproducible record that conformance was **measured** on verifiable facts, not
assertions. Every pass or fail decision in the conformance runner is accompanied by machine-readable
evidence that any third party can independently recompute from published bytes. Conformance is
measured, never granted — a `pass` is a fact about the implementation, not a status conferred on the
operator.

**Evidence collection is automatic.** The conformance runner collects all required evidence as a
side effect of running tests. Operators do not describe their conformance in prose — they run the
runner and publish the generated Evidence Bundle at a URL they control.

**Evidence is tamper-evident.** The operator signs its own Evidence Bundle with its own key (the
trust root never signs operator evidence — INV-FEDEVAL-009). Any modification after generation
invalidates the signature and is detectable by recomputing `conformance_report_hash` and
`evidence_bundle_hash` over the published artifacts.

---

## 1. Automated Evidence — Collected by Runner

The following evidence items are captured automatically for every conformance run. No manual
description required.

### 1.1 Signed Protocol Metadata & Conformance Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `metadata.raw_json` | `GET /.well-known/banza/signed-protocol-metadata.json` | Raw HTTP response body | All SPM tests |
| `metadata.http_status` | HTTP status code | Integer | FED-SPM-001 |
| `metadata.http_headers` | HTTP response headers | Key-value map | FED-SPM-001 |
| `metadata.schema_validation_result` | Runner schema validation | `{valid: bool, errors: []}` | FED-SPM-001 |
| `metadata.canonical_json` | Runner canonical form computation | String | FED-SPM-002 |
| `metadata.signature_verification_result` | ed25519_verify against trust root / delegated key | `{verified: bool, key_id: string}` | FED-SPM-002 |
| `metadata.freshness_check` | `{expires_at, checked_at, valid: bool}` | JSON | FED-SPM-003 |
| `metadata.validity_window_days` | `(expires_at - issued_at) in seconds / 86400` | Float | FED-SPM-007 |
| `metadata.operator_id_match` | metadata.operator_id vs manifest.operator_id | `{metadata_id, manifest_id, match: bool}` | FED-SPM-010 |

### 1.2 Manifest Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `manifest.raw_json` | `GET /.well-known/banza/operator.json` | Raw HTTP response body | All DISC tests |
| `manifest.http_status` | HTTP status | Integer | FED-DISC-001 |
| `manifest.base_schema_valid` | Validation against conformance/manifests/schema.json | `{valid: bool}` | FED-DISC-001 |
| `manifest.fed_schema_valid` | Validation against federation-manifest.json | `{valid: bool}` | FED-DISC-001 |
| `manifest.protocol_metadata_url_check` | HTTP GET to protocol_metadata_url | `{status, valid_metadata: bool}` | FED-DISC-004 |
| `manifest.interop_endpoint_check` | TCP/HTTP to interop_endpoint | `{reachable: bool, latency_ms}` | FED-DISC-005 |

### 1.3 Trust Evaluation Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `trust.brl_fetch_log` | BRL fetch attempt | `{url, status, fetched_at, expires_at}` | FED-TRUST-001 |
| `trust.brl_signature_verified` | BRL signature check | `{verified: bool}` | FED-TRUST-003 |
| `trust.brl_staleness_check` | BRL age computation | `{age_seconds, limit_seconds=21600, ok: bool}` | FED-TRUST-009 |
| `trust.check_results` | Per-check evaluation log (Open Trust Evaluation) | `[{check: 1-10, result: pass/fail, reason}]` | FED-TRUST-001 through FED-TRUST-008 |
| `trust.final_result` | `ROUTING_ALLOWED` or `FAIL_CLOSED` | String | All trust tests |

### 1.4 Routing Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `routing.request_raw` | Raw HTTP request body + headers | Bytes | All ROUTE tests |
| `routing.request_timestamp` | Unix timestamp at send | Integer | FED-ROUTE-005 (signature) |
| `routing.response_raw` | Raw HTTP response | Bytes | All ROUTE tests |
| `routing.response_parsed` | Parsed RoutingResponse | JSON | All ROUTE tests |
| `routing.trace_id_check` | req.trace_id vs resp.trace_id | `{match: bool}` | FED-ROUTE-003 |
| `routing.routing_request_id_check` | req.routing_request_id vs resp.routing_request_id | `{match: bool}` | FED-ROUTE-002 |
| `routing.idempotency_check` | First vs second response comparison | `{identical: bool}` | FED-ROUTE-004 |
| `routing.interop_transfer_id_format` | Regex match on interop_transfer_id | `{matches: bool, value}` | FED-ROUTE-009 |

### 1.5 Execution Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `exec.payee_balance_before` | Wallet balance before routing request | Integer (minor) | FED-EXEC-001 |
| `exec.payee_balance_after` | Wallet balance immediately after acceptance | Integer (minor) | FED-EXEC-001 |
| `exec.payee_balance_delta` | after - before | Integer | FED-EXEC-001 |
| `exec.payer_balance_before` | Payer wallet before | Integer | FED-EXEC-003 |
| `exec.payer_balance_after` | Payer wallet after | Integer | FED-EXEC-003, FED-EXEC-008 |
| `exec.operator_a_ledger_entry` | DEBIT entry for payer_wallet | JSON | FED-EXEC-002 |
| `exec.operator_b_ledger_entry` | CREDIT entry for payee_wallet | JSON | FED-EXEC-002 |
| `exec.atomicity_check` | Debit and obligation co-exist or neither | `{debit_exists, obligation_exists, consistent: bool}` | FED-EXEC-004 |

### 1.6 Obligation Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `obligation.raw_json` | `GET /federation/obligations/{id}` | JSON | All OBL tests |
| `obligation.amount_match` | obligation.amount vs routing_request.amount | `{match: bool}` | FED-OBL-002 |
| `obligation.trace_id_match` | obligation.trace_id vs routing_request.trace_id | `{match: bool}` | FED-OBL-003 |
| `obligation.uniqueness_check` | Count of obligations with same routing_request_id | `{count: int}` | FED-OBL-004 |
| `obligation.signature_verification` | ed25519_verify with Operator A public key | `{verified: bool}` | FED-OBL-005 |
| `obligation.state_history` | Observed states in order | `[pending, in_netting, settled]` | FED-OBL-006 |

### 1.7 Event Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `events.federation_events` | All federation events from both operators | Array of event JSON | All EVT tests |
| `events.trace_id_cross_check` | trace_id in all events for same payment | `{all_match: bool, trace_id}` | FED-EVT-005 |
| `events.schema_validation_results` | Per-event schema validation | `[{event_id, valid: bool}]` | FED-EVT-006 |
| `events.event_types_observed` | Set of event_type values seen | Array of strings | FED-EVT-001 through FED-EVT-004 |

### 1.8 Settlement Evidence

| Evidence Item | Source | Format | Required For |
|---------------|--------|--------|-------------|
| `settle.obligation_export_A_to_B` | Operator A's netting period export | JSON | FED-SETTLE-001 |
| `settle.obligation_export_B_to_A` | Simulated Operator B's netting period export | JSON | FED-SETTLE-001 |
| `settle.net_position_A` | Operator A's computed net | `{gross_A_to_B, gross_B_to_A, net}` | FED-SETTLE-002 |
| `settle.net_position_B` | Simulated Operator B's computed net | `{gross_A_to_B, gross_B_to_A, net}` | FED-SETTLE-003 |
| `settle.net_agreement` | Both nets compared | `{agree: bool}` | FED-SETTLE-003 |
| `settle.bank_transfer_log` | Bank transfer initiation | `{initiated: bool, amount, reference}` | FED-SETTLE-004 |
| `settle.obligations_settled` | Post-settlement obligation states | Array of obligation IDs with state=settled | FED-SETTLE-005 |
| `settle.reconciliation_report` | Cross-reference result | `{total_accepted, total_obligations, missing: [], mismatched: []}` | FED-SETTLE-006, FED-SETTLE-007 |

---

## 2. Evidence Package Structure

The runner generates a single Evidence Bundle per conformance run:

```
evidence-package/
  runner-version.txt
  run-id.txt                          # Unique run identifier
  operator-url.txt
  started-at.txt
  completed-at.txt
  
  protocol-metadata/
    metadata-A.json                   # Raw signed protocol metadata + conformance evidence from Operator A
    metadata-B.json                   # Metadata served by Simulated Operator B
    verification-results.json         # Per-artifact verification outcomes
    
  manifests/
    manifest-A.json                   # Raw manifest from Operator A
    validation-results.json
    
  trust-logs/
    brl-fetch.json                    # BRL fetch log
    trust-checks-op-b.json            # Ten-check Open Trust Evaluation against Sim Op B
    
  routing-logs/
    FED-ROUTE-001-request.json
    FED-ROUTE-001-response.json
    FED-ROUTE-001-result.json         # Pass/fail determination
    ... (one set per test case)
    
  execution-logs/
    payee-wallet-before.json
    payee-wallet-after.json
    payer-wallet-before.json
    payer-wallet-after.json
    operator-a-ledger-entry.json
    operator-b-ledger-entry.json
    
  obligations/
    obligation-001.json               # Raw obligation from Operator A
    obligation-verification.json      # Signature verification; amount match
    
  events/
    federation-events-A.json          # All federation events from Operator A
    federation-events-B.json          # All federation events from Sim Op B
    trace-cross-check.json
    
  settlement/
    netting-export-A.json
    netting-export-B.json
    net-position-comparison.json
    reconciliation-report.json
    
  suite-results/
    FED-SPM.json                     # Suite-level summary
    FED-DISC.json
    FED-TRUST.json
    FED-ROUTE.json
    FED-EXEC.json
    FED-OBL.json
    FED-EVT.json
    FED-SETTLE.json
    FED-FAIL.json
    
  report.json                         # Machine-readable conformance report
  package-signature.json             # Operator's ed25519 signature over all above
```

---

## 3. Facts outside machine-verifiable conformance

Some operational facts cannot be decided by a program over published bytes. They are **not part of
conformance** and are **not reviewed, approved or certified by any party**. Each is the operator's
own responsibility (ADR-031 §5), and where financial-services authorisation is required it is granted
by the competent regulator to the operator — never by BANZA.

| Fact | Why it is not machine-verifiable | Who is responsible |
|------|----------------------------------|--------------------|
| Production trust material | The runner uses the test trust root; production material verifies under the production trust root | Operator publishes production-signed protocol metadata + conformance evidence at its own URL |
| Key management procedures | Cannot be tested without access to the operator's HSM | Operator documents how its private key is stored and rotated |
| Bank account details for settlement | Real bank accounts are outside the test environment | Operator provides its own settlement bank details for production netting |
| Operational runbook | Organizational process | Operator documents how it responds to F-101 through F-602 failure scenarios |
| Network security | TLS configuration, firewall rules | Operator ensures federation endpoints use TLS 1.2+ |

None of the above is submitted anywhere, and none gates participation. They exist for the operator's
own soundness and its regulator's concern.

---

## 4. Independent Verification of Published Evidence

Any verifier — a routing peer, an auditor, a regulator, an automated system — independently verifies
an operator's published evidence from public bytes alone, without contacting BANZA and without any
BANZA-operated service being available. The steps below are what a peer performs as part of its Open
Trust Evaluation:

**Step 1 — Package integrity:**
```
ed25519_verify(operator_public_key_from_manifest, package_hash, package-signature.sig)
recompute conformance_report_hash and evidence_bundle_hash over the published artifacts
```
If verification fails or a hash does not match: the material is not the material that was attested →
fail closed.

**Step 2 — Freshness:**
The conformance evidence and signed protocol metadata must be within their declared validity windows
(INV-FEDEVAL-006; ≤ 90 days at L3+). Stale material is treated as absent → fail closed. Recovery is the
operator re-running the automation and re-publishing — it needs no one's permission.

**Step 3 — Identity binding:**
`operator_id` in the package must match the operator's published manifest and its
`protocol_metadata_url`.

**Step 4 — Suite result checks:**
```
for each blocking suite [FED-SPM, FED-DISC, FED-TRUST, FED-ROUTE, FED-EXEC, FED-OBL]:
  if suite.overall_result != "PASS": FAIL_CLOSED
```

**Step 5 — Critical invariant scan:**
Any test case with severity=CRITICAL and result=FAIL → FAIL_CLOSED.

**Step 6 — Spot verification:**
The verifier independently fetches and verifies:
- `{operator_url}/.well-known/banza/operator.json`
- `{operator_url}/.well-known/banza/signed-protocol-metadata.json`
- The signed protocol metadata signature against the active trust root or a delegated signing key (INV-FEDEVAL-004)

**Step 7 — Local decision:**
If all checks pass, the verifier's Open Trust Evaluation returns **ROUTING_ALLOWED** for this
interaction; otherwise **FAIL_CLOSED**. Nothing is issued and no status is conferred: the outcome is
a local decision about one interaction, and the same peer may reach a different outcome later if the
evidence goes stale or is revoked.

---

## 5. Evidence Retention

| Artifact | Retention | Reason |
|----------|-----------|--------|
| Evidence bundle | 3 years | Audit trail; dispute resolution |
| Suite results | 3 years | Conformance history |
| Obligation export | Until settled + 1 year | Settlement disputes |
| Routing logs | 90 days | Operational debugging |
| BRL fetch logs | 90 days | Trust audit |

---

## 6. L3 Federation Conformance Evidence Checklist

For a peer's Open Trust Evaluation to reach ROUTING_ALLOWED, ALL of the following must be present and
verifiable in the operator's published evidence:

```
☐ Evidence bundle signature verifies against the operator's public key in its manifest
☐ conformance_report_hash and evidence_bundle_hash recompute to the published values
☐ Conformance evidence and signed protocol metadata within their freshness window (INV-FEDEVAL-006)
☐ Signed protocol metadata verifies under the trust root or a delegated signing key (INV-FEDEVAL-004)
☐ FED-SPM: all 11 cases PASS
☐ FED-DISC: all 8 cases PASS
☐ FED-TRUST: all 9 cases PASS
☐ FED-ROUTE: cases 001-009 PASS; cases 010-012 PASS or non-blocking
☐ FED-EXEC: cases 001-005 PASS
☐ FED-OBL: cases 001-005 PASS
☐ FED-EVT: all 6 cases PASS or non-blocking
☐ FED-SETTLE: cases 001-008 PASS
☐ FED-FAIL: cases 001, 004, 005 PASS
☐ Zero CRITICAL-severity failures
☐ operator_id matches the published manifest and protocol_metadata_url
☐ Operator URL verified as publicly reachable
```

When this checklist is satisfiable from the published bytes, a peer's Open Trust Evaluation returns
**ROUTING_ALLOWED** for the interaction. Nothing is issued; the decision is local and
per-interaction, and any party can reproduce it from the same published artifacts.
