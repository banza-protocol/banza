# BANZA Federation Conformance Model

**Document ID:** FEDERATION-CONFORMANCE-DESIGN-001  
**Date:** 2026-05-31  
**Status:** Canonical — conformance architecture. Executable once the runner implements this spec.  
**Authority:** ADR-038, ADR-039, ADR-040, FEDERATION_INVARIANTS.md, FEDERATION_CONTRACT_SURFACE.md, FEDERATION_PROTOCOL_FLOW.md

---

## Purpose

This document defines the executable conformance model for the L3 federation conformance scope. It maps
every federation requirement to at least one test, defines the nine test suites, specifies pass/fail
semantics, and establishes what makes a routing decision unambiguous. Conformance here is **measured**:
the runner produces reproducible, machine-verifiable evidence that any third party can re-check. Whether
that evidence lets a peer route is a **local** decision each peer reaches by running the Open Trust
Evaluation (ADR-040) — it is never a status conferred on the operator.

After this document: implementation of the conformance runner can begin without architectural ambiguity.

---

## 1. Conformance Architecture

### 1.1 Two-Operator Problem

L0–L2 conformance tests a single operator in isolation: `runner → Operator A`. Federation conformance must test cross-operator behavior: `runner → Operator A ↔ Operator B`. This requires a new runner invocation mode.

```
# L0-L2 mode (existing)
banza-conformance --operator-a https://api.operator-a.example --level 2

# L3 federation mode (new)
banza-conformance --federation \
  --operator-a https://api.operator-a.example \
  --level 3
```

In federation mode, the runner embeds a **Simulated Operator B** — a fully controlled BANZA-compliant stub that:
- Produces valid, trust-verifiable responses (self-published signed protocol metadata + conformance evidence)
- Records all interactions for evidence collection
- Can be configured to inject failures on demand
- Uses the test trust root (separate from production)

### 1.2 Test Environment Separation

**Production trust root ≠ Test trust root.**

The conformance runner generates its own ed25519 keypair at startup (the "test root"). This keypair:
- Signs test protocol metadata for both Operator A (the operator under test) and Simulated Operator B, against which each side's self-published conformance evidence is measured
- Serves a test BRL endpoint
- Is NOT the production trust-root signing key

This ensures:
- Conformance tests never depend on production trust infrastructure
- Tests can inject expired, revoked, and tampered trust material without touching real trust state
- Any operator can run a conformance test against itself at any time, with no submission and no one to ask

### 1.3 Suite Execution Order

Suites run in dependency order. A failing early suite may block later suites from producing meaningful results.

```
FED-SPM   (signed-metadata & evidence validation)
    ↓
FED-DISC   (discovery and manifest)
    ↓
FED-TRUST  (trust establishment)
    ↓
FED-ROUTE  (routing negotiation)
    ↓
FED-EXEC   (transfer execution)
    ↓
FED-OBL    (obligation creation)
    ↓
FED-EVT    (event emission)
    ↓
FED-SETTLE (netting and settlement)
    ↓
FED-FAIL   (failure and recovery)
```

FED-FAIL may be run in parallel with FED-SETTLE if both have independent fixture sets.

---

## 2. Suite Registry

| Suite ID | Name | Cases | Blocking | Description |
|----------|------|-------|----------|-------------|
| FED-SPM | Signed-Metadata & Evidence Validation | 11 | Yes | Signed protocol metadata & conformance evidence schema, signature, freshness, binding |
| FED-DISC | Discovery and Manifest | 8 | Yes | Federation manifest extension fields, well-known endpoints |
| FED-TRUST | Trust Establishment | 9 | Yes | The Open Trust Evaluation checks; BRL handling |
| FED-ROUTE | Routing Negotiation | 12 | Yes | Routing request/response; idempotency; rejection codes |
| FED-EXEC | Transfer Execution | 8 | Yes | Acceptance semantics; ledger entries; atomicity |
| FED-OBL | Obligation Lifecycle | 7 | Yes | Obligation creation, signature, state machine |
| FED-EVT | Event Emission | 6 | No | Federation event schema and trace propagation |
| FED-SETTLE | Settlement | 10 | No | Netting, net position, bank settlement, reconciliation |
| FED-FAIL | Failure Recovery | 8 | No | Retry behavior, crash recovery, revocation mid-flight |

**Blocking:** A FAIL in a blocking suite means the operator's published material cannot yield a
ROUTING_ALLOWED outcome for the federation-capable conformance scope, regardless of other suite results.  
**Non-blocking:** A FAIL in a non-blocking suite is noted but does not block the core federation scope.
Because the Open Trust Evaluation is per-capability (ADR-040 check 7), a non-blocking failure fails closed
only for the affected capability; the capabilities whose evidence is complete still reach ROUTING_ALLOWED.
(FED-EVT, FED-SETTLE, FED-FAIL failures produce evidence with recorded remediation items.)

---

## 3. Requirement → Test Coverage Map

Every requirement from every federation artifact maps to at least one test. No requirement is untestable.

### 3.1 Trust Invariants (ADR-038, ADR-039, ADR-040)

| Invariant | Test(s) | Suite |
|-----------|---------|-------|
| INV-FEDEVAL-004 (signed-metadata signature) | FED-SPM-002, FED-TRUST-002 | SPM, TRUST |
| INV-FEDEVAL-006 (trust-material freshness) | FED-SPM-003, FED-SPM-007, FED-SPM-008, FED-TRUST-003 | SPM, TRUST |
| INV-FEDEVAL-002 (BRL = reject) | FED-TRUST-005, FED-SPM-009 | TRUST, SPM |
| INV-FEDEVAL-007 (fed flag needs published evidence) | FED-DISC-007 | DISC |
| INV-FEDEVAL-005 (BRL must be signed; BRL max 6h) | FED-TRUST-003, FED-TRUST-009, FED-FAIL-006 | TRUST, FAIL |
| INV-ROOT-010 (key rotation auth) | FED-SPM-010 | SPM |
| INV-FED-001 (trace_id invariant) | FED-ROUTE-003, FED-OBL-003, FED-EVT-005 | ROUTE, OBL, EVT |
| INV-FED-002 (obligation per routing) | FED-OBL-001, FED-OBL-004, FED-FAIL-005 | OBL, FAIL |
| INV-FED-003 (fed flag ⟹ endpoint) | FED-DISC-005 | DISC |
| INV-FED-004 (routing idempotency) | FED-ROUTE-004, FED-FAIL-001 | ROUTE, FAIL |
| INV-FED-005 (value conservation) | FED-OBL-002, FED-EXEC-002 | OBL, EXEC |
| INV-FED-006 (trust material must expire) | FED-SPM-007 | SPM |
| INV-FED-007 (revoked = rejected) | FED-TRUST-005, FED-SPM-009 | TRUST, SPM |
| INV-FED-LEDGER-001 (cross-op double-entry) | FED-EXEC-002, FED-SETTLE-004 | EXEC, SETTLE |
| INV-FED-LEDGER-002 (integer arithmetic) | FED-ROUTE-010 | ROUTE |
| INV-FED-IDEM-001 (global unique IDs) | FED-ROUTE-004, FED-ROUTE-011 | ROUTE |
| INV-FED-RECON-001 (cross-op reconcilability) | FED-SETTLE-006, FED-SETTLE-007 | SETTLE |

### 3.2 Contract Requirements

| Contract | Requirement | Test(s) |
|----------|-------------|---------|
| signed-protocol-metadata | Signed metadata at published URL | FED-SPM-001 |
| signed-protocol-metadata | Signature verifies | FED-SPM-002 |
| conformance-evidence | Within freshness window | FED-SPM-003 |
| signed-protocol-metadata | operator_id format | FED-SPM-004 |
| signed-protocol-metadata | public_key format | FED-SPM-005 |
| signed-protocol-metadata | Signature chains to trust root or delegated key | FED-SPM-006 |
| conformance-evidence | 90-day max freshness window for L3+ | FED-SPM-007 |
| federation-manifest | supports_federation | FED-DISC-002 |
| federation-manifest | cross_operator_routing | FED-DISC-003 |
| federation-manifest | protocol_metadata_url accessible | FED-DISC-004 |
| federation-manifest | interop_endpoint accessible | FED-DISC-005 |
| federation-manifest | supported_currencies non-empty | FED-DISC-006 |
| federation-manifest | INV-FEDEVAL-007 enforcement | FED-DISC-007 |
| federation-routing | Valid request accepted | FED-ROUTE-001 |
| federation-routing | routing_request_id echo | FED-ROUTE-002 |
| federation-routing | trace_id echo | FED-ROUTE-003 |
| federation-routing | Idempotency | FED-ROUTE-004 |
| federation-routing | Signature required | FED-ROUTE-005 |
| federation-routing | to_operator_id check | FED-ROUTE-006 |
| federation-routing | Recipient resolution | FED-ROUTE-007 |
| federation-routing | Currency check | FED-ROUTE-008 |
| federation-routing | interop_transfer_id format | FED-ROUTE-009 |
| federation-routing | Positive amount | FED-ROUTE-010 |
| federation-routing | Duplicate ID diff content | FED-ROUTE-011 |
| federation-routing | Suspended wallet | FED-ROUTE-012 |
| federation-obligation | Obligation created | FED-OBL-001 |
| federation-obligation | Amount equality | FED-OBL-002 |
| federation-obligation | trace_id propagation | FED-OBL-003 |
| federation-obligation | Uniqueness | FED-OBL-004 |
| federation-obligation | obligor_signature | FED-OBL-005 |
| federation-obligation | State transitions | FED-OBL-006 |
| federation-obligation | Settled fields | FED-OBL-007 |
| federation-event | routing.accepted emitted | FED-EVT-001 |
| federation-event | payment.initiated emitted | FED-EVT-002 |
| federation-event | payment.completed emitted | FED-EVT-003 |
| federation-event | obligation.recorded emitted | FED-EVT-004 |
| federation-event | trace_id propagation | FED-EVT-005 |
| federation-event | Schema validity | FED-EVT-006 |

### 3.3 Protocol Flow Requirements

| Phase | Behavioral Requirement | Test(s) |
|-------|----------------------|---------|
| Phase 1 | Manifest fetched and validated | FED-DISC-001 |
| Phase 1 | Currency checked against supported list | FED-DISC-006 |
| Phase 2 | All ten Open Trust Evaluation checks pass | FED-TRUST-001 |
| Phase 2 | BRL fetched and verified | FED-TRUST-003 |
| Phase 3 | routing_request_id assigned before send | FED-ROUTE-001 |
| Phase 3 | Same ID on retry | FED-ROUTE-004, FED-FAIL-001 |
| Phase 3 | Bidirectional trust evaluation | FED-ROUTE-005 |
| Phase 4 | Operator B credits payee on acceptance | FED-EXEC-001 |
| Phase 4 | Ledger entries correct on both sides | FED-EXEC-002 |
| Phase 5 | Operator A debit + obligation atomic | FED-EXEC-005, FED-OBL-001 |
| Phase 6 | Net position computed independently | FED-SETTLE-002 |
| Phase 6 | Both operators agree before settlement | FED-SETTLE-003 |
| Phase 7 | F-101 retry with same ID | FED-FAIL-001 |
| Phase 7 | F-402 crash recovery | FED-FAIL-005 |
| Phase 8 | Revocation before routing → abort | FED-TRUST-005 |
| Phase 8 | Revocation mid-flight → obligation survives | FED-FAIL-007 |
| Phase 9 | Obligation cross-reference | FED-SETTLE-006 |
| Phase 9 | Trace cross-check | FED-SETTLE-007 |
| BC-001 | No debit without acceptance | FED-EXEC-003 |
| BC-003 | Debit and obligation atomic | FED-EXEC-005 |
| BC-004 | Acceptance irrevocable | FED-EXEC-007 |
| BC-005 | Same routing_request_id on retry | FED-ROUTE-004 |
| BC-010 | Amount immutability | FED-OBL-002 |

### 3.4 Failure Scenario Requirements

| Failure | Test |
|---------|------|
| F-101 (timeout + retry) | FED-FAIL-001 |
| F-102 (unparseable response) | FED-FAIL-002 |
| F-201 (trust material expired) | FED-SPM-008, FED-TRUST-003 |
| F-202 (invalid sig) | FED-SPM-002 (negative), FED-TRUST-002 |
| F-203 (BRL hit) | FED-TRUST-005, FED-SPM-009 |
| F-204 (A's material rejected by B) | FED-FAIL-004 |
| F-205 (BRL unavailable) | FED-TRUST-008, FED-FAIL-006 |
| F-301 (recipient not found) | FED-ROUTE-007 |
| F-302 (wallet suspended) | FED-ROUTE-012 |
| F-303 (duplicate diff content) | FED-ROUTE-011 |
| F-401 (B accepts but ledger fails) | FED-EXEC-006 |
| F-402 (A crash post-accept) | FED-FAIL-005 |
| F-404 (obligation amount mismatch) | FED-FAIL-008 |
| F-501 (netting disagreement) | FED-SETTLE-009 |
| F-502 (bank reject) | FED-SETTLE-010 |
| F-601 (clock skew) | FED-SPM-003 (clock-controlled) |
| F-602 (BRL extended outage) | FED-TRUST-009 |
| F-604 (unknown issuer_key_id) | FED-SPM-011 |

---

## 4. Routing decision rules (ROUTING_ALLOWED / FAIL_CLOSED)

Conformance is measured here; the decision is reached **locally** by each peer running the Open Trust
Evaluation (ADR-040) over the operator's published material. The rules below state, for the reference
evaluation, when the ten checks resolve to ROUTING_ALLOWED and when they fail closed.

### 4.1 ROUTING_ALLOWED

A peer's Open Trust Evaluation reaches ROUTING_ALLOWED for the L3 federation scope when ALL of the
following hold over the published signed protocol metadata + conformance evidence:

1. All blocking suite results are PASS (FED-SPM through FED-OBL)
2. FED-EVT: all 6 cases pass
3. FED-SETTLE: cases 001–008 pass (010 allowed as WARNING if zero-net scenario not tested)
4. FED-FAIL: cases 001, 004, 005 pass (mandatory recovery tests)
5. No CRITICAL invariant violation in any suite
6. Evidence package is complete and passes automated verification

### 4.2 FAIL_CLOSED

A peer fails closed (no routing for the affected interaction) if any of the following:

- Any FAIL in FED-SPM, FED-DISC, or FED-TRUST
- FED-ROUTE: any FAIL in cases 001–009 (core routing correctness)
- FED-EXEC: any FAIL in cases 001–005
- FED-OBL: any FAIL in cases 001–005
- Any CRITICAL invariant violation (INV-FEDEVAL-004, INV-FED-001, INV-FED-002, INV-FED-004, INV-FED-005)
- Evidence package missing required items (see FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md)
- Trust material absent, unsigned, signature-invalid, expired, revoked, or incompatible

Fail-closed is a local determination about one interaction. It is never a status conferred on the
operator, never an admission refused, never a licence denied.

### 4.3 Capability-scoped outcomes (non-blocking suites)

Because the Open Trust Evaluation is per-capability (ADR-040 check 7, INV-FEDEVAL-007), a failure in a
non-blocking suite fails closed only for the capability it evidences, while the core federation routing
capability still reaches ROUTING_ALLOWED:

- FED-EVT cases 002 or 003 fail (event emission — operational, not financial)
- FED-SETTLE cases 009 or 010 fail (netting edge cases)
- FED-FAIL cases 002, 003, 006, 007, 008 fail (non-critical recovery paths)

Recovery needs no one's permission: the operator re-runs the public conformance automation, re-publishes
the extended evidence, and peers re-evaluate. There is no submission and no review step.

---

## 5. Test ID Namespace

All federation test IDs follow the pattern: `FED-<SUITE>-<NNN>`

| Suite | ID Range | Count |
|-------|----------|-------|
| FED-SPM | FED-SPM-001 to FED-SPM-011 | 11 |
| FED-DISC | FED-DISC-001 to FED-DISC-008 | 8 |
| FED-TRUST | FED-TRUST-001 to FED-TRUST-009 | 9 |
| FED-ROUTE | FED-ROUTE-001 to FED-ROUTE-012 | 12 |
| FED-EXEC | FED-EXEC-001 to FED-EXEC-008 | 8 |
| FED-OBL | FED-OBL-001 to FED-OBL-007 | 7 |
| FED-EVT | FED-EVT-001 to FED-EVT-006 | 6 |
| FED-SETTLE | FED-SETTLE-001 to FED-SETTLE-010 | 10 |
| FED-FAIL | FED-FAIL-001 to FED-FAIL-008 | 8 |
| **Total** | | **79** |

---

## 6. Compliance Assertion

> After FEDERATION-CONFORMANCE-DESIGN-001, every L3 federation requirement has: a contract, an invariant, a test ID, a fixture reference, an evidence requirement, and explicit ROUTING_ALLOWED / FAIL_CLOSED criteria.
>
> Implementation of the conformance runner can begin. No architectural ambiguity remains.
