# BANZA Federation Failure Scenarios

**Document ID:** FEDERATION-PROTOCOL-FLOW-DESIGN-001  
**Status:** Canonical — failure taxonomy and recovery runbooks.  
**Authority:** FEDERATION_PROTOCOL_FLOW.md, FEDERATION_INVARIANTS.md, ADR-027, ADR-033, ADR-031

---

## Overview

This document catalogs every known failure mode in a federated transaction, classifies it, and defines the canonical recovery procedure. Each scenario is specified precisely enough to be executed manually without code.

**Design principle:** Every failure recovery is designed to maintain all invariants. When a scenario puts an invariant at risk, the recovery procedure explicitly restores the invariant.

---

## Failure Taxonomy

| Group | Code Range | Failure Class | Invariants at Risk |
|-------|------------|---------------|--------------------|
| Network | F-1xx | Transport failures: timeouts, connection refused, partial responses | INV-FED-004 (idempotency) |
| Trust | F-2xx | Signed-metadata, conformance-evidence, BRL, and signature failures | INV-FEDEVAL-002, INV-FEDEVAL-004–007, INV-ROOT-010, INV-FED-007 |
| Routing | F-3xx | Business validation failures during routing negotiation | INV-FED-002, INV-FED-004 |
| Execution | F-4xx | Failures during transfer execution and obligation recording | INV-FED-002, INV-FED-005, BC-003 |
| Settlement | F-5xx | Failures during netting, agreement, and bank transfer | INV-FED-LEDGER-001, INV-FED-005 |
| Operational | F-6xx | Configuration, clock, and infrastructure failures | INV-FEDEVAL-006, INV-FEDEVAL-005 |

---

## Group F-1xx: Network Failures

---

### F-101 — Routing Request Timeout

**Phase:** 3 (Routing Negotiation)  
**When:** Operator A sends `POST /federation/route`. No response received within 30 seconds.  
**Invariants at risk:** INV-FED-004 (idempotency must hold on retry)

**Detection:**
- HTTP client timeout fires after 30 seconds
- No response body received; connection may or may not have reached Operator B

**Ambiguity:** Operator A cannot know if Operator B received and processed the request. Operator B may have:
- Not received the request (safe to retry as if new)
- Received and processed it (payee may have been credited; must retry with same ID)
- Received but not yet processed it (idempotent retry is safe)

**Recovery Procedure:**
1. Do NOT debit payer. Do NOT record obligation.
2. Wait 2 seconds (first backoff)
3. Retry `POST /federation/route` with the **same** `routing_request_id` (`rr-abc`)
4. If response received: handle normally (accepted or rejected)
5. If timeout again: wait 8 seconds; retry (attempt 2)
6. If timeout again: wait 32 seconds; retry (attempt 3)
7. If all 3 retries time out: payment fails
   - `payment_state → "failed"`
   - Payer is NOT debited
   - No obligation is recorded
   - Notify consumer: "Payment could not be processed. Please try again."

**Idempotency guarantee (INV-FED-004):** If Operator B already processed `rr-abc` and credited the payee, the retry returns the original response. The payee is NOT credited twice. Operator A then proceeds to Phase 4 with the original `interop_transfer_id`.

**Operator B behavior on idempotent retry:**
- Finds `routing_request_id = "rr-abc"` in its routing store
- Returns the same response it originally returned (or would have returned)
- Takes no new action (no additional credit to payee)

---

### F-102 — Response Received but Unparseable

**Phase:** 3 (Routing Negotiation)  
**When:** Operator A receives an HTTP response but the body is malformed, truncated, or fails schema validation.  
**Invariants at risk:** INV-FED-004, BC-001 (no debit without acceptance)

**Detection:**
- HTTP 200 received but JSON parse fails
- JSON valid but fails `federation-routing.json` RoutingResponse schema validation
- `status` field missing or not in `["accepted", "rejected", "pending"]`

**Ambiguity:** Unknown whether Operator B accepted or rejected.

**Recovery Procedure:**
1. Treat as network failure (same as F-101)
2. Do NOT debit payer. Do NOT record obligation.
3. Retry with same `routing_request_id`
4. Operator B returns an idempotent response that Operator A can parse

**Note:** If Operator B consistently returns malformed responses, Operator A must flag Operator B as non-conformant and suspend routing to it pending investigation.

---

### F-103 — Response Lost in Transit (Operator A Received Nothing)

**Phase:** 3 (Routing Negotiation)  
**When:** Operator B processed and accepted the request (payee credited), sent a response, but the response was lost in transit. Operator A never received it.  
**Invariants at risk:** BC-003 (debit+obligation must be atomic), INV-FED-002

**Detection:**
- Same as F-101: Operator A sees a timeout
- Operator A cannot distinguish F-101 from F-103 without retrying

**Recovery:** Identical to F-101. The idempotent retry returns the original accepted response. Operator A then proceeds to Phase 4 as normal.

**Why this is safe:** INV-FED-004 ensures idempotency. The only risk would be if Operator A generated a new `routing_request_id` on retry (which BC-005 prohibits).

---

### F-104 — Operator B Offline During Routing

**Phase:** 3 (Routing Negotiation)  
**When:** Operator B's `/federation/route` endpoint is unreachable (connection refused, DNS failure, TLS handshake failure).  
**Invariants at risk:** None (payment not yet committed)

**Detection:**
- TCP connection refused
- DNS resolution fails
- TLS handshake error

**Recovery Procedure:**
1. Do NOT debit payer. Do NOT record obligation.
2. Retry up to 3× with backoff (same as F-101)
3. If all retries fail: payment fails
4. Operator A may attempt to route to an alternative operator if the payment supports multi-operator routing

---

### F-105 — Partial Response (Connection Cut Mid-Response)

**Phase:** 3 (Routing Negotiation)  
**When:** Operator B begins sending a response but the connection drops before the full body is received.  
**Invariants at risk:** Same as F-102

**Recovery:** Same as F-102. Treat as ambiguous; retry with same `routing_request_id`.

---

## Group F-2xx: Trust Failures

---

### F-201 — Operator B Signed Metadata / Conformance Evidence Stale

**Phase:** 2 (Trust Verification), Step 2.4  
**When:** At the time of routing, the evaluated operator's signed protocol metadata or conformance evidence is past its `expires_at` (outside the freshness window). The trust material has gone stale since the last evaluation.  
**Invariants at risk:** INV-FEDEVAL-006

**Detection:**
- Step 2.4 fires: the freshness check finds trust material with `expires_at < now()`
- Also detectable if Operator A is using a cached evaluation result past its `cache_until` time

**Recovery Procedure:**
1. Abort the trust evaluation. Operator B's published material is not trusted.
2. Do NOT send routing request.
3. Do NOT debit payer. Do NOT record obligation.
4. Payment fails with internal reason: "destination operator trust material stale"
5. Operator A notifies its operations team: Operator B's published trust material has expired
6. Operator A does NOT notify the consumer about trust-material status (internal detail)
7. Consumer message: "Payment unavailable. Please try another payment method."

**Operator B must:** Re-run the public Conformance Automation and re-publish fresh signed protocol metadata and conformance evidence before routing resumes. This depends on nobody else — the operator re-runs and re-publishes on its own.

**Note:** This is not an error in Operator A. Operator B has let its published trust material fall outside the freshness window.

---

### F-202 — Operator B Signed Metadata Signature Invalid

**Phase:** 2 (Trust Verification), Step 2.3  
**When:** `ed25519_verify()` returns false for Operator B's signed protocol metadata.  
**Invariants at risk:** INV-FEDEVAL-004

**Detection:**
- Step 2.3: signature verification fails

**Possible causes:**
- The signed protocol metadata was tampered with
- Operator B is serving signed metadata whose signature does not resolve to the trust root or a delegated signing key listed in the Key Manifest
- The delegated signing key referenced by `issuer_key_id` is not the one in the active Key Manifest (delegated key rotation)
- The signed-metadata file is corrupted

**Recovery Procedure:**
1. Abort the trust evaluation immediately.
2. Do NOT route. Do NOT debit. Do NOT create obligation.
3. Log the failure with full metadata detail (metadata_id, issuer_key_id, expires_at)
4. Alert operations with severity: HIGH — possible security incident
5. Do NOT fall back to unverified routing
6. If `issuer_key_id` references a key not in the local Key Manifest: fetch the current Key Manifest and retry once (see F-604)
7. If it still fails after the Key Manifest refresh: treat as trust-material tampering; do not route and escalate as a protocol security incident (revocation domain).

---

### F-203 — Operator B Found in BRL

**Phase:** 2 (Trust Verification), Step 2.6  
**When:** the evaluated operator's `operator_id` appears in the current, valid BRL.  
**Invariants at risk:** INV-FEDEVAL-002, INV-FED-007

**Detection:**
- Step 2.6 check: `operator_id in BRL.revoked`
- Reason may be `"suspended"` or `"revoked"`

**Recovery Procedure:**
1. Abort the trust evaluation.
2. Do NOT route to Operator B.
3. Do NOT debit payer. Do NOT create obligation.
4. Log: Operator B's material is revoked; BRL check timestamp.
5. Mark Operator B as unavailable in the local routing table until a BRL refresh clears the entry.
6. If routing to other operators is possible: try alternative.
7. Consumer message: "Payment unavailable. Please try another method."

**Distinction:**
- If `permanent: false` (temporary revocation): the entry may clear on a later BRL. Re-check on the next BRL refresh and evaluate whatever material the operator currently publishes.
- If `permanent: true` (permanent revocation of that key/artifact): the revoked material never becomes trusted again. The operator republishes fresh material — new keys, new signed protocol metadata and conformance evidence — and peers evaluate that new material. Revocation is a protocol security signal, not a sanction: it withdraws trust from specific cryptographic material, and there is no admission to restore.

---

### F-204 — Operator A's Published Material Rejected by Operator B

**Phase:** 3 (Routing Negotiation), Step 3.8  
**When:** Operator B receives a routing request from Operator A, runs the Open Trust Evaluation over Operator A's published material, and it fails.  
**Invariants at risk:** INV-FEDEVAL-002, INV-FEDEVAL-004, INV-FEDEVAL-006

**Detection:**
- Operator B returns `rejection_code: "operator_trust_failure"`

**Possible causes on Operator A's side:**
- Operator A's signed protocol metadata or conformance evidence is outside its freshness window
- Operator A's published material is not reachable at its `protocol_metadata_url`
- A key or artifact Operator A relies on appears in the BRL
- Operator A's `protocol_metadata_url` in the routing request is wrong

**Recovery Procedure for Operator A:**
1. Receive rejection with `"operator_trust_failure"`
2. Do NOT debit payer. Do NOT create obligation.
3. Immediately check own published material:
   - Is `protocol_metadata_url` accessible? → `GET {own_protocol_metadata_url}` from an external vantage point
   - Is own signed metadata / conformance evidence still fresh? → check `expires_at`
   - Is any own key/artifact in the BRL? → check BRL
4. If trust material is stale: re-run conformance and re-publish; retry routing after publishing
5. If in the BRL: the affected cryptographic material is withdrawn from trust — rotate to new keys and re-publish fresh material (a revocation-domain security signal, never an operator-approval step)
6. If `protocol_metadata_url` misconfigured: fix the manifest and routing request
7. Alert operations; this blocks all outbound cross-operator payments

---

### F-205 — BRL Fetch Failure

**Phase:** 2 (Trust Verification), Step 2.1  
**When:** Operator A cannot fetch a fresh BRL from `banza.network/federation/revocation-list.json`.  
**Invariants at risk:** INV-FEDEVAL-005 (BRL must not be older than 6 hours)

**Detection:**
- HTTP error or timeout on BRL fetch
- TLS handshake failure on BANZA endpoint

**Recovery Procedure:**

| Cached BRL Age | Behavior |
|----------------|----------|
| < 6 hours | Use cached BRL; continue routing with warning logged |
| 6–12 hours | Use cached BRL for existing trusted partners only; do not accept new operators |
| > 12 hours | Fail-closed: reject all cross-operator routing until BRL is refreshed |

**Fail-closed definition:** If the BRL is older than 12 hours and a new BRL cannot be fetched, Operator A MUST NOT route to any operator not already in its trusted-and-verified state from before the BRL staleness began. This prevents a compromised BANZA endpoint from disabling revocation globally.

**Note:** BRL staleness is an operational emergency. Alert operations immediately at 6 hours; escalate at 12 hours.

---

### F-206 — Conformance Evidence and Manifest operator_id Mismatch

**Phase:** 2 (Trust Verification), Step 2.9  
**When:** the `operator_id` in the operator's published conformance evidence does not match the `operator_id` in its manifest.  
**Invariants at risk:** INV-FEDEVAL-004 (trust binding is broken)

**Detection:**
- Step 2.9: field comparison fails

**Possible causes:**
- Operator B is serving conformance evidence bound to a different `operator_id` (misconfiguration)
- Man-in-the-middle substituted the published material
- Operator B rotated `operator_id` (which is forbidden — operator_id is permanent)

**Recovery Procedure:**
1. Abort the trust evaluation.
2. Log the mismatch: manifest operator_id vs. evidence operator_id.
3. Alert operations with severity: HIGH — possible misconfiguration or active attack.
4. Do NOT route. Do NOT debit. Do NOT create obligation.
5. Escalate as a security incident if the mismatch persists after 24 hours (could indicate active substitution of published material).

---

## Group F-3xx: Routing Validation Failures

---

### F-301 — Recipient Not Found on Operator B

**Phase:** 3 (Routing Negotiation), Step 3.9  
**When:** Operator B cannot resolve `recipient_identifier` to an active wallet.  
**Invariants at risk:** None (routing not yet accepted)

**Detection:**
- Operator B returns `rejection_code: "recipient_not_found"`

**Recovery Procedure:**
1. Do NOT debit payer. Do NOT record obligation.
2. `payment_state → "failed"`
3. Notify consumer: "Recipient not found. Please check the payment address."
4. Log: `recipient_identifier`, `recipient_identifier_type`, `to_operator_id` for debugging

**Consumer action required:** Verify the payee identifier (handle, phone, wallet ID) is correct.

---

### F-302 — Recipient Wallet Suspended

**Phase:** 3 (Routing Negotiation), Step 3.9  
**When:** Operator B found the recipient but the wallet is suspended.  
**Invariants at risk:** None

**Detection:**
- Operator B returns `rejection_code: "recipient_suspended"`

**Recovery Procedure:**
1. Same as F-301: payment fails.
2. Consumer message: "Recipient's account is unavailable."
3. This is Operator B's internal state; Operator A cannot resolve it.

---

### F-303 — Duplicate routing_request_id with Different Content

**Phase:** 3 (Routing Negotiation), Step 3.11  
**When:** Operator B receives a routing request with a `routing_request_id` that already exists in its store, but the request content differs from the original.  
**Invariants at risk:** INV-FED-004 (idempotency scope violated by Operator A)

**Detection:**
- Operator B: `routing_request_id` found in store, content hash mismatch
- Operator B returns `rejection_code: "duplicate_request"`

**This is a protocol violation by Operator A.** A new `routing_request_id` must be assigned for a different payment. Reusing an ID with different content is the only scenario where a retry must not happen.

**Recovery Procedure for Operator A:**
1. Receive `"duplicate_request"` rejection.
2. Investigate: why was the same `routing_request_id` used for different content?
3. This indicates a bug in Operator A's routing request construction.
4. Do NOT retry with the same ID.
5. Generate a new `routing_request_id` ONLY if this is genuinely a different payment.
6. Alert operations; this is a protocol implementation bug.

---

## Group F-4xx: Execution Failures

---

### F-401 — Operator B Accepts but Internal Ledger Fails

**Phase:** 3 (Routing Negotiation), Step 3.12  
**When:** Operator B's atomic transaction (credit payee + record routing as accepted) fails after returning `status: "accepted"` to Operator A. This should not occur if Step 3.12 is correctly atomic, but is included for completeness.  
**Invariants at risk:** INV-FED-LEDGER-001, INV-FED-002

**Detection:**
- Operator A: received `status: "accepted"` with valid `interop_transfer_id`
- Operator B: internal ledger inconsistency discovered on startup or reconciliation (payee not credited, but routing request marked accepted in store)

**Recovery Procedure for Operator B:**
1. This is an internal inconsistency on Operator B. Operator A has already committed (debit + obligation).
2. Operator B MUST credit the payee from its own reserves.
3. The obligation from Operator A is valid and will be settled. Operator B will receive the money.
4. Operator B must complete the ledger posting before the next reconciliation cycle.
5. If Operator B cannot complete (e.g., payee wallet deleted): BANZA dispute resolution.

**Why Operator B must cover this:** Operator B returned `status: "accepted"`, which is an irrevocable commitment (BC-004). The risk of internal execution failure is Operator B's operational responsibility.

---

### F-402 — Operator A Crashes After Acceptance, Before Obligation

**Phase:** 4+5 (Transfer Execution + Obligation Creation)  
**When:** Operator A received `status: "accepted"` from Operator B, began Phase 4 atomic transaction, but crashed before it committed.  
**Invariants at risk:** BC-003 (debit + obligation atomicity), INV-FED-002

**Detection:**
- On Operator A restart: payment in state `"routing_accepted"` with no corresponding obligation
- On reconciliation: Operator B accepted routing request with no obligation on Operator A

**State on restart:**
- If the database transaction committed: debit exists, obligation exists → Phase 4 is complete; proceed normally
- If the database transaction rolled back: neither debit nor obligation exists → re-execute Phase 4
- If partial commit (not possible with properly atomic transactions, but included for defense):
  - Debit exists, obligation does not: create obligation; no second debit needed
  - Obligation exists, debit does not: create debit; no second obligation needed (unique constraint prevents duplicate)

**Recovery Procedure:**
1. On restart, query: `SELECT * FROM payments WHERE state = 'routing_accepted' AND obligation_id IS NULL`
2. For each: execute Phase 4 atomic transaction
3. The debit posting idempotency key (`routing_request_id`) prevents double-debit
4. The obligation unique constraint on `routing_request_id` prevents duplicate obligation

**Idempotency of recovery:** Phase 4 is fully idempotent because:
- Ledger posting uses `routing_request_id` as idempotency key → second attempt returns existing posting
- Obligation has UNIQUE constraint on `routing_request_id` → second insert fails gracefully (return existing)

---

### F-403 — Payer Wallet Suspended Between Request and Execution

**Phase:** 4 (Transfer Execution)  
**When:** Operator A received routing acceptance from Operator B, but the payer's wallet was suspended between the routing request being sent and Phase 4 execution.  
**Invariants at risk:** BC-001 (no debit without acceptance — acceptance received, but debit blocked)

**Detection:**
- Phase 4 atomic transaction: ledger debit of payer wallet fails because wallet is suspended

**Recovery Procedure:**
1. Do NOT complete the atomic transaction. Roll back.
2. The routing request has been accepted by Operator B. Operator B has credited the payee. This is irrevocable.
3. Operator A now has an accepted routing request with no debit and no obligation. This is a temporary inconsistency.
4. Operator A MUST immediately:
   a. Notify operations: accepted routing request with suspended payer wallet
   b. Either: lift the payer wallet suspension and retry Phase 4
   c. Or: record the obligation anyway (using Operator A's own reserve funds) and recover from the consumer through alternative means
5. Under no circumstances should Operator A: ignore the accepted routing request or allow Operator B to credit the payee without the obligation being recorded.

**Protocol note:** Operator B's credit to the payee is already irreversible. Operator A's internal problem does not void the obligation. Operator A must cover it.

---

### F-404 — Obligation Amount Mismatch (Internal Protocol Error)

**Phase:** 5 (Obligation Creation)  
**When:** Before signing the obligation, Operator A detects that `obligation.amount.minor != routing_request.amount.minor`.  
**Invariants at risk:** INV-FED-005 (value conservation)

**Detection:**
- Pre-signing assertion fails: amounts differ

**This is a bug in Operator A's implementation.** Under correct behavior, the obligation amount is copied directly from the routing request and cannot differ.

**Recovery Procedure:**
1. HALT. Do NOT record the obligation.
2. Roll back Phase 4 if in progress.
3. Alert operations: severity CRITICAL. This is a financial integrity bug.
4. The payment must be manually reviewed before proceeding.
5. Do NOT route any further cross-operator payments until the root cause is identified and fixed.

---

### F-405 — Double Debit Attempt (Idempotency Failure on Operator A)

**Phase:** 4 (Transfer Execution)  
**When:** Operator A attempts to debit a payer wallet twice for the same routing_request_id.  
**Invariants at risk:** INV-IDEM-001, INV-FED-LEDGER-001

**Detection:**
- Ledger posting with idempotency key `routing_request_id` already exists in the ledger
- Database returns the existing posting ID (idempotent replay)

**Recovery:**
1. The existing posting is returned. No second debit occurs.
2. Proceed with the existing posting as if it were just created.
3. This is the normal behavior for crash-recovery scenarios (F-402).

---

## Group F-5xx: Settlement Failures

---

### F-501 — Netting Disagreement

**Phase:** 6B (Net Position Computation)  
**When:** Operator A and Operator B independently compute different net positions for the same netting period.  
**Invariants at risk:** INV-FED-LEDGER-001, INV-FED-005

**Detection:**
- Operator A sends signed net position assertion to Operator B
- Operator B's computed net differs from Operator A's assertion
- Operator B responds with disagreement + its own computed net

**Possible causes:**

| Cause | Description |
|-------|-------------|
| Missing obligation on one side | Operator A failed to record one or more obligations (F-402) |
| Missing obligation export | Operator B has accepted routing requests that Operator A didn't know about (B→A direction) |
| Duplicate obligation | Idempotency failure produced two obligations for the same payment (should not occur) |
| Amount mismatch | An obligation on one side has a different amount than on the other (INV-FED-005 violation) |
| Netting period boundary dispute | A payment on the boundary of the netting period is counted by one side but not the other |

**Recovery Procedure:**
1. HALT settlement. Do NOT execute the bank transfer.
2. Exchange full obligation lists with obligation_ids, routing_request_ids, amounts, and `obligor_signature`
3. Cross-reference by `routing_request_id`:
   - For each routing_request_id: both sides agree on amount? If not → amount mismatch (critical)
   - Any routing_request_id on B's accepted list missing from A's obligation list? → F-402 recovery
   - Any routing_request_id on A's obligation list not on B's accepted list? → phantom obligation (critical)
4. For each resolvable discrepancy: apply recovery procedure
5. Re-compute net position; confirm agreement
6. If agreement reached: resume settlement

**If unresolvable within 24 hours:**
- Escalate to BANZA with full obligation exports and signature verification results
- BANZA arbitrates using cryptographic evidence (signed obligations and routing requests)
- Settlement suspended until BANZA decision

---

### F-502 — Bank Transfer Rejected

**Phase:** 6C (Settlement Execution)  
**When:** The net obligor initiates a bank transfer to the net creditor, but the bank rejects or fails the transfer.  
**Invariants at risk:** INV-FED-LEDGER-001 (settlement not complete)

**Detection:**
- `SettlementExecutionProvider` returns failure
- Bank confirms rejection (NSF, account closed, regulatory hold)

**Recovery Procedure:**
1. Revert ledger entries made at Phase 6C initiation:
   - Revert `DEBIT federation_payable:op-b` and `CREDIT federation_settlement_clearing`
2. Keep obligations at `settlement_state: "in_netting"` (do not mark settled)
3. Alert operations immediately: bank transfer rejected
4. Identify cause:
   - NSF: Operator A has insufficient reserves. Operator A must top up its bank settlement account.
   - Account closed/changed: Update Operator B's bank details (off-protocol coordination)
   - Regulatory hold: Legal/compliance team must resolve
5. Retry settlement within 24 hours with corrected parameters
6. If not resolved within 48 hours: escalate to BANZA

**Note:** Obligations remain valid throughout. Operator A's legal obligation to Operator B is not discharged until the bank transfer succeeds.

---

### F-503 — Settlement Bank Transfer Succeeds on A, Not Received by B

**Phase:** 6C (Settlement Execution)  
**When:** Operator A's bank confirms the transfer was sent, but Operator B's bank has not credited Operator B's account.  
**Invariants at risk:** INV-FED-LEDGER-001

**Detection:**
- Operator A has ledger entries showing transfer initiated and bank confirmation received
- Operator B: no bank credit received within expected clearing window (e.g., T+1)

**Recovery Procedure:**
1. Operator A: do NOT mark obligations as settled until Operator B confirms receipt.
2. Operator A retrieves the bank transfer reference from `SettlementExecutionProvider`
3. Both operators verify with their respective banks (off-protocol)
4. If transfer is in transit: wait for clearing (T+1 to T+2 for most rails)
5. If transfer was lost: initiate bank investigation; do not retry until investigation confirms no transfer received
6. Once confirmed received by Operator B: mark obligations as settled on both sides

---

## Group F-6xx: Operational Failures

---

### F-601 — Clock Skew: Trust Material Appears Stale to One Party

**Phase:** 2 (Trust Verification), Step 2.4  
**When:** Operator A's system clock is significantly ahead of true time, causing valid trust material to appear stale (past its freshness window).  
**Invariants at risk:** INV-FEDEVAL-006 (correct application requires correct clock)

**Detection:**
- Operator A's trust evaluation fails at Step 2.4 with `expires_at < now()`, but the trust material is genuinely within its window
- Discovery: Operator B's published metadata correctly shows `expires_at` in the future according to external time sources

**Indicators of clock skew vs. genuine staleness:**
- The trust material's `expires_at` is only a few minutes in the "past" relative to Operator A's clock
- Operator B is routing successfully with other operators
- Operator A receives `Banza-Federation-Signature` rejections citing future timestamps from Operator B

**Recovery Procedure:**
1. Immediately: synchronize Operator A's system clock via NTP
2. Do not implement clock skew tolerance in the trust protocol — the 0-second-grace rule is intentional
3. After clock synchronization: retry the routing flow
4. Root cause: NTP configuration or hardware clock failure on Operator A's infrastructure

**Prevention:** Both operators MUST operate with NTP synchronization. Maximum acceptable clock offset: ± 5 seconds.

---

### F-602 — BRL Endpoint Unreachable (Extended Outage)

**Phase:** 2 (Trust Verification), Step 2.1  
**When:** BANZA's BRL endpoint is unreachable for an extended period (> 6 hours).  
**Invariants at risk:** INV-FEDEVAL-005 (BRL must be < 6 hours old for routing decisions)

**Detection:**
- All attempts to fetch `banza.network/federation/revocation-list.json` fail
- Cached BRL age approaches or exceeds 6 hours

**Recovery Procedure:**

| BRL Cache Age | Action |
|---------------|--------|
| < 6 hours | Route normally; log warning; alert operations |
| 6–12 hours | Route ONLY to operators in the existing trust cache; refuse to add new operators |
| > 12 hours | STOP all cross-operator routing; emit operations alert with severity CRITICAL |

**When routing is stopped at 12 hours:**
- All pending payments fail with "payment temporarily unavailable"
- Do NOT fabricate trust decisions without a verified BRL
- Monitor BANZA endpoint; resume routing when BRL is successfully fetched

**BANZA responsibility:** Operate the BRL endpoint with SLA appropriate for financial infrastructure. Publish the BRL on a CDN with edge caching. Operators MAY pin a last-known-good BRL locally for the absolute worst case (subject to the fail-closed age limits above).

---

### F-603 — Manifest Expiry During Active Routing Period

**Phase:** 1 (Discovery), cache management  
**When:** Operator A cached Operator B's manifest. The manifest's `expires_at` passes during an active routing session.  
**Invariants at risk:** None directly, but routing decisions may be based on stale capability data

**Detection:**
- Operator A checks cache TTL before using cached manifest
- Cache is expired

**Recovery Procedure:**
1. Fetch fresh manifest: `GET /.well-known/banza/operator.json`
2. If manifest is renewed and valid: update cache; continue routing
3. If manifest fetch fails: treat as F-104 (Operator B offline)
4. If manifest shows `supports_federation: false` after refresh: stop routing to Operator B

**Note:** Manifest expiry does not affect in-flight payments that already have routing accepted. Those continue to completion.

---

### F-604 — Delegated Signing Key Rotation (issuer_key_id Unknown)

**Phase:** 2 (Trust Verification), Step 2.3  
**When:** The operator's signed protocol metadata references an `issuer_key_id` that Operator A cannot resolve to a public key in its local copy of the Key Manifest.  
**Invariants at risk:** INV-FEDEVAL-004

**Detection:**
- Step 2.3: the key for `issuer_key_id` is not present in the local copy of the Key Manifest

**This is a normal event during delegated signing key rotation.**

**Recovery Procedure:**
1. Fetch the current Key Manifest:
   ```
   GET https://banza.network/.well-known/banza/key-manifest.json
   ```
   This document lists all currently listed BANZA signing keys by `key_id` and domain.
2. The Key Manifest is itself signed by the offline Trust Root; the Trust Root public key is pinned at build time.
3. Verify the Key Manifest signature against the pinned Trust Root key
4. Add the newly listed key to the local Key Manifest copy
5. Retry signed-metadata verification (Step 2.3) with the newly fetched key
6. If verification now passes: continue normally
7. If verification still fails: treat as F-202 (signature invalid)

---

## Summary: Invariant Risk by Failure Code

| Failure | INV-FEDEVAL-004 | INV-FEDEVAL-006 | INV-FEDEVAL-002 | INV-FED-001 | INV-FED-002 | INV-FED-004 | INV-FED-005 | INV-FED-LEDGER-001 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| F-101 (timeout) | | | | | | **at risk** | | |
| F-102 (unparseable) | | | | | | **at risk** | | |
| F-201 (trust material stale) | | **at risk** | | | | | | |
| F-202 (invalid sig) | **at risk** | | | | | | | |
| F-203 (BRL hit) | | | **at risk** | | | | | |
| F-204 (A material rejected) | **at risk** | **at risk** | **at risk** | | | | | |
| F-205 (BRL unavailable) | | | **at risk** | | | | | |
| F-401 (B internal fail) | | | | | | | | **at risk** |
| F-402 (A crash post-accept) | | | | **at risk** | **at risk** | | | |
| F-404 (amount mismatch) | | | | | | | **at risk** | |
| F-501 (netting disagree) | | | | | | | **at risk** | **at risk** |
| F-502 (bank reject) | | | | | | | | **at risk** |

---

## Conformance Test Coverage

Each failure scenario must have a corresponding conformance test that can be executed against an operator's staging environment.

| Scenario | Conformance Test | Suite |
|----------|-----------------|-------|
| F-101 (timeout + retry) | FED-ROUTE-004 (idempotency) | federation-routing |
| F-201 (trust material stale) | FED-SPM-008 (stale trust material rejected) | federation-trust |
| F-202 (invalid signature) | FED-SPM-002 (signature verification) | federation-trust |
| F-203 (BRL revoked) | FED-SPM-009 (revoked operator rejected) | federation-trust |
| F-204 (A published material rejected by B) | FED-ROUTE-005 (invalid signature → 401) | federation-routing |
| F-301 (recipient not found) | FED-ROUTE-007 (recipient_not_found) | federation-routing |
| F-303 (duplicate ID different content) | (new vector: FED-ROUTE-011) | federation-routing |
| F-402 (obligation gap) | FED-OBL-001 (obligation existence) | federation-obligation |
| F-404 (amount mismatch) | FED-OBL-002 (obligation = routing amount) | federation-obligation |
| F-501 (netting disagreement) | (new vector: FED-SETTLE-001) | federation-settlement |
| F-601 (clock skew) | (new vector: FED-SPM-010 — future-dated trust material) | federation-trust |
| F-604 (unknown issuer_key_id) | (new vector: FED-SPM-011 — key rotation) | federation-trust |
