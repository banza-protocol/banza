# BANZA Federation Invariant Registry

**Document ID:** FEDERATION-CONTRACTS-DESIGN-001  
**Date:** 2026-05-31  
**Status:** Canonical — authoritative source for all federation-layer invariants.  
**Authority:** ADR-038, ADR-039, ADR-040 (Open protocol trust model without a CA)  
**Extends:** BANZA core invariant registry (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`)

---

## Invariant Taxonomy

The BANZA federation invariant set is organized into three groups:

| Group | Prefix | Origin | Concern |
|-------|--------|--------|---------|
| Federation Trust Evaluation invariants | `INV-FEDEVAL-*` | ADR-040 (federation-routing application of the ADR-038 trust model) | Signed protocol metadata & conformance evidence validity, revocation, freshness at routing time |
| Federation invariants | `INV-FED-*` | ADR-038, ADR-039, ADR-040 + this document | Cross-operator protocol correctness |
| Federation extensions of core invariants | `INV-FED-LEDGER-*` | This document | Core invariants extended to cross-operator scope |

**General trust model vs. federation application.** The general protocol trust model is the Open Trust Evaluation, whose invariants carry the `INV-OTE-*` prefix and are defined in ADR-038. This document covers the **federation-routing application** of that model, whose invariants carry the `INV-FEDEVAL-*` prefix and are defined in ADR-040. The `INV-FEDEVAL-*` checks are the `INV-OTE-*` model made explicit for routing between two operators; they do not redefine it. Both are recorded canonically in `contracts/invariants.json`.

**Root/key invariants (`INV-ROOT-*`).** Key-management guarantees — authenticated key rotation, bounded delegation, Key Manifest signature/expiry, threshold root custody, seat continuity — are root/key invariants (`INV-ROOT-*`), not federation-trust-evaluation checks. They are defined canonically in `contracts/invariants.json` (elaborated in `docs/governance/BANZA_TRUST_ARCHITECTURE.md`) and are not redefined here. Two of them are referenced from this document where the former trust series placed them: `INV-ROOT-010` (authenticated key rotation) and `INV-ROOT-008` (delegated authority is bounded).

**Invariant severity levels:**

- **CRITICAL** — Violation is a protocol error. Implementation MUST prevent it. Conformance FAIL.
- **HIGH** — Violation is a security or financial integrity risk. Implementation MUST prevent it. Conformance FAIL.
- **MEDIUM** — Violation degrades reliability or observability. Conformance WARNING or FAIL depending on context.

---

## The Trust Model in One Paragraph

BANZA is an open financial protocol. An operator independently implements the protocol and **publishes**, on infrastructure it controls, its Operator Manifest, its **signed protocol metadata** (`contracts/production/signed-protocol-metadata.production.schema.json`) and its **conformance evidence** (`contracts/production/conformance-evidence.production.schema.json`). Before routing to a peer, each operator runs the **Open Trust Evaluation** — ten conjunctive, fail-closed checks defined in ADR-040 (normative shape in `contracts/production/federation-trust-evaluation.production.schema.json`) — **locally and deterministically** over the evaluated operator's published material. Conformance is **measured** from reproducible, machine-verifiable evidence, never granted. The result is a local decision about a single interaction (`ROUTING_ALLOWED` / `FAIL_CLOSED`) — never a status conferred on the operator, never an admission, never a licence.

The ten checks of the Open Trust Evaluation:

| # | Check | What it verifies |
|---|-------|------------------|
| 1 | `valid_operator_manifest` | The evaluated operator's manifest resolves and is structurally valid |
| 2 | `compatible_protocol_version` | The declared protocol version is compatible with the evaluator's |
| 3 | `signed_protocol_metadata` | Signed protocol metadata is present and well-formed |
| 4 | `conformance_evidence_valid` | Conformance evidence is present, well-formed, and internally consistent |
| 5 | `trust_root_or_delegated_signature_valid` | The signature resolves to the trust root or a delegated signing key in the active Key Manifest |
| 6 | `not_revoked` | No key, artifact, or implementation id involved is in the current Revocation List |
| 7 | `capabilities_compatible` | Declared capabilities cover the intended interaction |
| 8 | `endpoint_contract_compatible` | The declared endpoint honors the routing contract |
| 9 | `evidence_freshness_within_policy` | Trust material is within its validity window (≤ 90 days for L3+) |
| 10 | `fail_closed_on_missing_or_invalid` | Anything missing / invalid / expired / revoked / incompatible → `FAIL_CLOSED` |

All ten must pass for `ROUTING_ALLOWED`. Any failure yields `FAIL_CLOSED`.

---

## Group 1: Federation Trust Evaluation Invariants (INV-FEDEVAL-*)

Defined in ADR-040 — the federation-routing application of the ADR-038 Open Trust Evaluation. Reproduced here with implementation notes and conformance vector mapping. Two guarantees the former trust series carried — authenticated key rotation and bounded delegation — are now root/key invariants (`INV-ROOT-*`) and are recorded at the end of this group as pointers into `contracts/invariants.json`, not redefined here.

---

### INV-FEDEVAL-004 — Signed Protocol Metadata Signature Validity

**Severity:** CRITICAL  
**Definition:** Signed protocol metadata is valid if and only if its `signature` field verifies against the public key resolved from the active Key Manifest for the corresponding `issuer_key_id` (the trust root or a delegated signing key).

**Formal statement:**
```
∀ signed protocol metadata M:
  M is valid ⟺ ed25519_verify(KEY_MANIFEST.public_key[M.issuer_key_id], canonical_json(M \ {signature}), base64url_decode(M.signature)) = true
  where KEY_MANIFEST.public_key[M.issuer_key_id] resolves to the trust root or a delegated signing key
```

**Violation consequence:** Signed protocol metadata that fails signature verification MUST be treated as if it does not exist. All routing decisions that relied on invalid metadata must be reversed if discovered post-facto.

**Implementation requirements:**
- Verification MUST use a constant-time ed25519 implementation
- The public key MUST be resolved from the active Key Manifest (loaded from a trusted, pinned source), never from the metadata itself
- Canonical JSON: all fields except `signature`, sorted lexicographically by key, no whitespace, UTF-8

**Enforced by:** `signed-protocol-metadata.production.schema.json` (structure); `federation-trust-evaluation.production.schema.json` (checks `signed_protocol_metadata` and `trust_root_or_delegated_signature_valid` at evaluation time); `federation-routing.json` (enforcement at routing time); BanzAI trust verification module

**Conformance vectors:** FED-SPM-002, FED-SPM-008

---

### INV-FEDEVAL-006 — Trust-Material Freshness

**Severity:** CRITICAL  
**Definition:** Trust material MUST NOT be accepted after its `expires_at` timestamp; no grace period is permitted. For a federation-capable conformance scope (L3+), the validity window of signed protocol metadata and conformance evidence MUST NOT exceed 90 days.

**Formal statement:**
```
∀ trust material X (signed protocol metadata or conformance evidence), time T:
  X is valid at T ⟺ X.issued_at ≤ T < X.expires_at

∀ trust material X at conformance scope ≥ L3:
  (X.expires_at - X.issued_at) ≤ 90 days
```

**Violation consequence:** Expired trust material MUST be treated as untrusted. Cached material must be checked against the current time at every use, not only at fetch time.

**Implementation requirements:**
- Clock source for time comparison must be monotonic and not manipulable by the remote party
- Freshness is verified by the `evidence_freshness_within_policy` check of the Open Trust Evaluation
- Implementations MUST NOT add tolerance windows to expiry (unlike TLS, which often adds a small grace)

**Enforced by:** `signed-protocol-metadata.production.schema.json` and `conformance-evidence.production.schema.json` (schema constraint); `federation-trust-evaluation.production.schema.json` (check `evidence_freshness_within_policy`); `federation-routing.json`; BanzAI trust module

**Conformance vectors:** FED-SPM-003, FED-SPM-008

---

### INV-FEDEVAL-002 — Revoked Material Rejection

**Severity:** CRITICAL  
**Definition:** Any key, artifact, or operator implementation whose id appears in a valid, non-expired Revocation List (the BANZA Revocation List, BRL) MUST be rejected from all routing decisions, regardless of any other trust signal.

**Formal statement:**
```
∀ routing decision R evaluating operator B:
  if any id in (B.issuer_key_id, B.metadata_id, B.evidence_id, B.operator_id) ∈ BRL.revoked → reject R
  (no other trust signal — signature, freshness, capabilities — can override a valid revocation)
```

**Violation consequence:** A revoked party that succeeds in receiving a routing decision has bypassed protocol enforcement. Any financial obligation created against revoked material is disputed and unenforceable under the protocol.

**Implementation requirements:**
- The `not_revoked` check follows signature verification (`trust_root_or_delegated_signature_valid`) and precedes the capability check (`capabilities_compatible`)
- If the BRL cannot be fetched and the cached BRL is older than 6 hours, reject all routing to un-cached operators (fail-closed)
- The BRL MUST itself be signature-verified (INV-FEDEVAL-005) before being applied

**Enforced by:** `federation-trust-evaluation.production.schema.json` (check `not_revoked`); `revocation-entry.production.schema.json` / `brl.production.schema.json`; `federation-routing.json`; BanzAI trust module

**Conformance vectors:** FED-SPM-009

---

### INV-FEDEVAL-007 — Federation Requires Published Conformance Evidence

**Severity:** HIGH  
**Definition:** An operator MUST NOT declare `supports_federation: true` in its manifest unless it publishes valid, fresh, non-revoked signed protocol metadata and conformance evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation.

**Formal statement:**
```
∀ operator O:
  O.manifest.supports_federation = true
  ⟹
  ∃ published signed protocol metadata M and conformance evidence E such that:
    M.operator_id = E.operator_id = O.operator_id
    ∧ conformance_scope(E) ≥ L3
    ∧ M.expires_at > now() ∧ E.expires_at > now()
    ∧ none of {M, E, O keys} ∈ BRL.revoked
    ∧ OpenTrustEvaluation(O) = ROUTING_ALLOWED
```

**Violation consequence:** An operator that declares federation capability without published, passing evidence is making a false protocol claim. Peers that relied on the claim may route payments to an operator whose conformance is not demonstrated. This is a protocol violation by the declaring operator.

**Implementation requirements:**
- BanzAI must flag this condition during manifest evaluation
- The conformance runner must test: if `supports_federation=true`, does the operator publish L3+ conformance evidence that passes the Open Trust Evaluation?
- Self-reporting is not enough — each peer independently runs the Open Trust Evaluation over the published material

**Enforced by:** `federation-manifest.json` (declarative constraint); `conformance-evidence.production.schema.json`; conformance vector FED-MAN-007; BanzAI manifest evaluation

**Conformance vectors:** FED-MAN-002, FED-MAN-007

---

### INV-FEDEVAL-005 — Revocation List Signed and Fresh

**Severity:** HIGH  
**Definition:** The Revocation List (BRL) MUST be signed by the trust root's designated revocation-domain delegated key **and** MUST be within its freshness window — a routing decision MUST NOT be made against a Revocation List older than 6 hours. An unsigned, unverifiable, unavailable or stale Revocation List MUST be treated as untrusted material — as if absent (fail-closed) — never as an empty list. (Merges the former revocation-list signature and revocation-list staleness invariants into one entry.)

**Formal statement:**
```
∀ Revocation List B:
  B is signature-valid ⟺ ed25519_verify(KEY_MANIFEST.public_key[B.issuer_key_id], canonical_json(B \ {signature}), B.signature) = true
  where B.issuer_key_id is the trust root's revocation-domain delegated key

∀ routing decision R at time T relying on Revocation List B:
  B is usable at T ⟺ (B is signature-valid ∧ T - B.fetched_at ≤ 6 hours)
```

**Violation consequence:** An attacker able to serve an unsigned BRL could clear the revocation list, allowing revoked material back into federation; a stale BRL may fail to reflect recent revocations and deliver money against revoked material. A BRL that fails verification or is stale MUST be treated as **absent** (no BRL), not as an **empty** revocation list.

**Implementation requirements:**
- BRL verification uses the same Key Manifest resolution as protocol-metadata verification
- The BRL cache MUST store `fetched_at` alongside the BRL content; staleness is computed at each routing decision, before the BRL is applied
- Failed BRL fetch or failed BRL signature → use cached BRL if within 6 hours; reject all routing if the cache is expired
- "No BRL" is not the same as "empty BRL" — an absent, unsigned or stale BRL is fail-closed for un-cached operators
- An emergency BRL (with `expires_at` set to 1 hour) triggers accelerated refresh

**Enforced by:** BRL fetch/cache logic; routing-engine pre-checks; `revocation-entry.production.schema.json` / `brl.production.schema.json`; `delegated-signing-key.production.schema.json`; `federation-trust-evaluation.production.schema.json` (check `not_revoked` depends on a fresh, signed BRL); BanzAI trust module

**Conformance vectors:** (BRL signing + staleness conformance vectors — TBD in BRL contract)

---

### Root/key invariants (INV-ROOT-*) — moved out of the trust-evaluation group

Two guarantees the former trust series carried — **authenticated key rotation** and **bounded delegated authority** — are key-management concerns, not federation-routing-evaluation checks. They are now root/key invariants, defined canonically in `contracts/invariants.json` (elaborated in `docs/governance/BANZA_TRUST_ARCHITECTURE.md`) and not redefined here:

- **INV-ROOT-010 — Authenticated key rotation.** A key rotation MUST be authenticated by signing the rotation request with the currently-bound private key; key rotation authenticated by any other means is invalid. The rotation request is an out-of-band process; this invariant governs its security requirement, and the operator controls its own keys. (Enforced by out-of-band key-rotation acceptance logic; `key-manifest.production.schema.json`; `delegated-signing-key.production.schema.json`.)
- **INV-ROOT-008 — Delegated authority is bounded.** No delegated signing key may exercise authority beyond the scope the active Trust Root explicitly delegates to it. Verification MUST check both that the signature is valid **and** that the signed artifact falls within the key's delegated scope, resolved from the active Trust Root / Key Manifest and never self-asserted — otherwise a single compromised delegation (e.g. a revocation-domain key signing protocol metadata, or vice versa) could impersonate the whole trust root. (Enforced by `key-manifest.production.schema.json`, `delegated-signing-key.production.schema.json`, `root-delegation.production.schema.json`; and, at routing time, the `trust_root_or_delegated_signature_valid` check of the Federation Trust Evaluation.)

The signature chain, delegated keys, signed Key Manifest, domain separation and fail-closed behaviour these invariants describe are unchanged; only their identifiers and their home registry changed.

---

## Group 2: Federation Protocol Invariants (INV-FED-*)

Defined in ADR-038, ADR-039 and ADR-040 and extended by this document.

---

### INV-FED-001 — Trace Identity Across Operator Boundaries

**Severity:** CRITICAL  
**Definition:** A federation transaction MUST carry the same `trace_id` in every artifact it produces on both the originating and receiving operator.

**Formal statement:**
```
∀ cross-operator payment P:
  ∀ artifacts A produced by P (routing_request, routing_response, obligation, events on A and B):
    A.trace_id = P.trace_id
```

**Violation consequence:** A federation payment with mismatched trace_ids cannot be audited or reconciled across operator boundaries. The obligation created by Operator A cannot be matched to the transfer created by Operator B. This breaks INV-RECON-* across the federation.

**Implementation requirements:**
- `trace_id` MUST be copied from the originating transaction (not regenerated) at every federation step
- Operator B MUST echo the `trace_id` from the RoutingRequest in the RoutingResponse
- All federation events emitted for a payment MUST use the same `trace_id`
- The obligation's `trace_id` MUST equal the routing request's `trace_id`

**Enforced by:** `federation-routing.json` (echo in response), `federation-obligation.json` (trace field), `federation-event.json` (trace field)

**Conformance vectors:** FED-ROUTE-003, FED-OBL-003, FED-EVT-002

---

### INV-FED-002 — Obligation Per Accepted Routing Request

**Severity:** CRITICAL  
**Definition:** Every accepted cross-operator routing request MUST produce exactly one `InteropObligation` in the originating operator. No accepted routing request may exist without a corresponding obligation. No obligation may exist without a corresponding accepted routing request.

**Formal statement:**
```
∀ routing_request R where R.status = "accepted":
  ∃! obligation O such that O.routing_request_id = R.routing_request_id

∀ obligation O:
  ∃ routing_request R such that R.routing_request_id = O.routing_request_id ∧ R.status = "accepted"
```

**Violation consequence:** A missing obligation means money has moved (Operator B has processed a payment) but Operator A has no record of what it owes. This is an undischarged financial liability — equivalent to an unbalanced ledger entry.

**Implementation requirements:**
- Obligation recording MUST be atomic with the routing request state transition to `accepted`
- If obligation recording fails, the routing request state MUST roll back to `pending` or the routing MUST be rejected
- The unique constraint on `routing_request_id` in the obligations store prevents duplicate obligations

**Enforced by:** `federation-obligation.json` (UNIQUE on routing_request_id); implementation must use atomic transaction

**Conformance vectors:** FED-OBL-001, FED-OBL-004

---

### INV-FED-003 — Federation Capability Declaration Integrity

**Severity:** HIGH  
**Definition:** A federation member MUST NOT declare `supports_federation: true` unless it can actually service federation routing requests at the declared `interop_endpoint`.

**Formal statement:**
```
∀ operator O where O.manifest.supports_federation = true:
  POST O.interop_endpoint + "/federation/route" with valid RoutingRequest
  ⟹ HTTP 200 | 202 (not 404, not 500, not connection refused)
```

**Violation consequence:** An operator that declares federation capability but cannot service routing requests will cause routing failures that are invisible until routing is attempted. This breaks the routing guarantee and wastes federation resources.

**Implementation requirements:**
- Before setting `supports_federation=true`, the operator MUST have a running, conformance-passing federation API
- The BanzAI conformance runner tests endpoint reachability as FED-MAN-005

**Enforced by:** `federation-manifest.json` (declarative; verified by conformance); FED-MAN-005 conformance vector

**Conformance vectors:** FED-MAN-003, FED-MAN-005

---

### INV-FED-004 — Cross-Operator Routing Idempotency

**Severity:** CRITICAL  
**Definition:** Cross-operator routing MUST be idempotent. The same `routing_request_id` MUST produce the same result regardless of how many times it is submitted.

**Formal statement:**
```
∀ routing_request R₁, R₂ where R₁.routing_request_id = R₂.routing_request_id:
  response(R₁) = response(R₂)

∀ routing_request R where n submissions with same routing_request_id:
  exactly 1 interop_transfer_id created on Operator B
  exactly 1 obligation created on Operator A
```

**Violation consequence:** Without idempotency, network retries (which are mandatory for reliability) could duplicate a payment. A consumer could be charged twice; a merchant could receive double credit.

**Implementation requirements:**
- `routing_request_id` MUST have a UNIQUE database constraint in Operator B's routing store
- On receiving a duplicate `routing_request_id` with identical content: return the original response
- On receiving a duplicate `routing_request_id` with different content: return `rejection_code = "duplicate_request"` (a protocol violation by Operator A — flagged, and surfaced in the peer's own Open Trust Evaluation of Operator A)
- The obligation store MUST also have a UNIQUE constraint on `routing_request_id` (Operator A side)

**Extends:** INV-IDEM-001 (single-operator idempotency) to cross-operator scope

**Enforced by:** `federation-routing.json` (`routing_request_id` field); `federation-obligation.json` (UNIQUE constraint); FED-ROUTE-004

**Conformance vectors:** FED-ROUTE-004

---

### INV-FED-005 — Value Conservation Across Operator Boundaries

**Severity:** CRITICAL  
**Definition:** No money may be created or destroyed in a federation transaction. The total value deducted from the payer's wallet on Operator A must equal the total value credited to the payee's wallet on Operator B.

**Formal statement:**
```
∀ cross-operator payment P:
  debit(Operator_A_ledger, P) = credit(Operator_B_ledger, P)
  = obligation(P).amount.minor
  = routing_request(P).amount.minor
```

**Violation consequence:** Value creation is financial fraud. Value destruction is financial loss with no legal basis. Both are catastrophic violations of the protocol's integrity guarantees.

**Implementation requirements:**
- Obligation `amount.minor` MUST be validated to equal routing request `amount.minor` before recording
- Operator B's ledger CREDIT must equal the routing request `amount.minor` (no fees taken from the transfer amount — fees are a separate ledger entry if applicable)
- Conformance test FED-OBL-002 verifies the obligation amount; the end-to-end vector FED-ROUTE-001 verifies both ledgers

**Extends:** INV-LEDGER-001 (zero-sum double-entry) to cross-operator scope

**Enforced by:** `federation-obligation.json` (amount equals routing request amount); `federation-routing.json` (amount field definition); conformance vector FED-OBL-002

**Conformance vectors:** FED-OBL-002, FED-ROUTE-001 (end-to-end)

---

### INV-FED-006 — Trust-Material Freshness Is Mandatory

**Severity:** HIGH  
**Definition:** Trust material MUST expire. Perpetual trust is forbidden. Signed protocol metadata and conformance evidence without an expiry are structurally invalid.

**Formal statement:**
```
∀ signed protocol metadata M, conformance evidence E:
  M.expires_at is defined ∧ M.expires_at > M.issued_at
  E.expires_at is defined ∧ E.expires_at > E.issued_at
  ∧ conformance_scope(E) ≥ L3 ⟹ (expires_at - issued_at) ≤ 90 days
```

**Violation consequence:** Trust material without an expiry cannot lapse by inaction. It would have to be explicitly revoked for every operator exit. Short-lived, self-published trust material makes inaction (not re-publishing fresh evidence) the natural path back to fail-closed.

**Implementation requirements:**
- The JSON Schemas for signed protocol metadata and conformance evidence enforce `expires_at` as required
- The 90-day maximum validity window for L3+ is enforced at publication and at evaluation time
- The conformance runner checks `expires_at` presence and validity (FED-SPM-003)

**Enforced by:** `signed-protocol-metadata.production.schema.json` and `conformance-evidence.production.schema.json` (required field, schema constraint)

**Conformance vectors:** FED-SPM-003

---

### INV-FED-007 — Revoked Operator Excluded from All Routing

**Severity:** CRITICAL  
**Definition:** An operator with revoked material MUST be rejected from all routing decisions immediately upon BRL propagation (within 6 hours).

**Formal statement:**
```
∀ operator O where any id of O ∈ BRL.revoked:
  ∀ routing decision R evaluating O: reject(R)
  propagation_delay ≤ 6 hours (from BRL publication to all peers applying rejection)
```

**Violation consequence:** An operator whose material is revoked but that continues to receive routed payments may be operating with compromised keys or invalidated conformance evidence. Any obligation created against revoked material is disputed and unenforceable under the protocol.

**Implementation requirements:**
- BRL refresh frequency must be at most 6 hours (INV-FEDEVAL-005 defines this as a complementary invariant)
- Emergency BRL issuance reduces propagation to ≤ 1 hour
- The routing engine must run the `not_revoked` check before every routing decision (not only at startup)

**Enforced by:** BRL check logic; `federation-trust-evaluation.production.schema.json` (check `not_revoked`); `federation-routing.json`

**Conformance vectors:** FED-SPM-009

---

## Group 3: Federation Extensions of Core Invariants (INV-FED-LEDGER-*)

These invariants extend existing BANZA core invariants to cover cross-operator scope. They do not replace the core invariants — they extend them.

---

### INV-FED-LEDGER-001 — Cross-Operator Double-Entry

**Severity:** CRITICAL  
**Extends:** INV-LEDGER-001 (zero-sum ledger)  
**Definition:** For every cross-operator payment, the combined ledger entries across both operators must sum to zero. The DEBIT on Operator A's settlement account and the CREDIT on Operator B's settlement account are the cross-operator counterparts.

**Formal statement:**
```
∀ cross-operator payment P:
  Operator_A_ledger.DEBIT(P) + Operator_B_ledger.CREDIT(P) = 0
  (in a unified accounting view of the federation)
```

**Violation consequence:** If DEBIT and CREDIT don't match across operators, money has been created or destroyed. This is equivalent to a single-operator posting that doesn't balance — a CRITICAL violation.

**Implementation requirements:**
- The obligation amount (what A owes B) is the accounting bridge between the two ledgers
- Settlement closes this open obligation: DEBIT on A's settlement account, CREDIT on B's settlement account
- Netting computation must be independently verifiable by both operators before settlement is executed

**Conformance vectors:** FED-OBL-002, end-to-end conformance (FED-ROUTE-001 extended)

---

### INV-FED-LEDGER-002 — Cross-Operator Integer Arithmetic

**Severity:** CRITICAL  
**Extends:** INV-LEDGER-003 (no floating point)  
**Definition:** All monetary values in federation artifacts MUST use integer minor units. No floating point representation at any stage of cross-operator communication.

**Formal statement:**
```
∀ federation artifact A with amount field:
  A.amount.minor ∈ ℤ (integer)
  floating_point(A.amount.minor) is forbidden
```

**Violation consequence:** Floating point representation of currency amounts introduces rounding errors. In cross-operator settlement, rounding errors accumulate and create irreconcilable net positions.

**Implementation requirements:**
- All schemas define `amount.minor` as `"type": "integer"` (never `"type": "number"`)
- Implementations MUST use 64-bit integer types for all amount fields
- No SDK or implementation may convert amount to float at any point in the federation pipeline

**Enforced by:** `federation-routing.json` (schema), `federation-obligation.json` (schema)

**Conformance vectors:** FED-ROUTE-010 (negative test: non-integer amount rejected)

---

### INV-FED-IDEM-001 — Federation Idempotency Scope

**Severity:** CRITICAL  
**Extends:** INV-IDEM-001 (single-operator idempotency key scope)  
**Definition:** Federation idempotency keys (`routing_request_id`) are globally unique across all operators and all time. No two routing requests from any operator may share a `routing_request_id`.

**Formal statement:**
```
∀ routing_request R₁ from Operator_X, R₂ from Operator_Y:
  R₁ ≠ R₂ ⟹ R₁.routing_request_id ≠ R₂.routing_request_id
```

**Violation consequence:** ID collision between operators would allow a routing request from Operator X to be confused with a routing request from Operator Y, enabling idempotency bypass attacks.

**Implementation requirements:**
- `routing_request_id` format: `rr-<uuid>` where uuid is UUIDv4 (128 bits of randomness)
- The probability of collision with UUIDv4 is negligible (1 in 5.3 × 10³⁶ per pair)
- The database constraint on `routing_request_id` at Operator B includes the `from_operator_id` to prevent cross-operator key collision attacks

**Enforced by:** `federation-routing.json` (UUID format), database constraint at Operator B

**Conformance vectors:** FED-ROUTE-004

---

### INV-FED-RECON-001 — Cross-Operator Reconcilability

**Severity:** HIGH  
**Extends:** INV-RECON-* (internal reconciliation)  
**Definition:** Every cross-operator payment must be traceable from Operator A's ledger entry through the obligation to Operator B's ledger entry via the shared `trace_id`. Cross-operator payments must be independently auditable without cooperation from either operator.

**Formal statement:**
```
∀ cross-operator payment P:
  ∃ ledger_entry_A where ledger_entry_A.trace_id = P.trace_id (on Operator A)
  ∃ routing_request where routing_request.trace_id = P.trace_id
  ∃ obligation where obligation.trace_id = P.trace_id
  ∃ ledger_entry_B where ledger_entry_B.trace_id = P.trace_id (on Operator B)
  
  These four artifacts form a verifiable audit chain.
```

**Violation consequence:** A payment that cannot be traced across operators is unauditable. In regulatory contexts (AML, financial reporting), unauditable cross-operator payments are a compliance failure.

**Implementation requirements:**
- `trace_id` must be present in all four artifact types (INV-FED-001 enforces propagation)
- Operators must expose `trace_id` in their obligation and event query APIs
- BanzAI's audit capability can reconstruct the cross-operator payment chain from `trace_id` alone

**Enforced by:** INV-FED-001 (trace propagation); all federation contracts (trace_id field)

**Conformance vectors:** FED-EVT-002, FED-OBL-003

---

## Invariant Quick Reference

| ID | Group | Severity | One-Line Definition |
|----|-------|----------|---------------------|
| INV-FEDEVAL-002 | FedEval | CRITICAL | Any revoked/missing/invalid trust material → fail-closed, rejected from all routing regardless of any other trust signal |
| INV-FEDEVAL-004 | FedEval | CRITICAL | Signed protocol metadata is valid only if its signature resolves to the trust root or a delegated key in the active Key Manifest |
| INV-FEDEVAL-005 | FedEval | HIGH | Revocation List must be signed by the trust root's revocation-domain delegated key **and** fresh (≤ 6 hours); unsigned or stale = absent |
| INV-FEDEVAL-006 | FedEval | CRITICAL | Trust material rejected past `expires_at`; no grace period; ≤ 90-day window for L3+ |
| INV-FEDEVAL-007 | FedEval | HIGH | `supports_federation=true` requires published, valid L3+ conformance evidence that passes the Open Trust Evaluation |
| INV-ROOT-008 | Root/key | HIGH | No delegated signing key may act beyond what the active Trust Root delegates to it (canonical in `contracts/invariants.json`) |
| INV-ROOT-010 | Root/key | HIGH | Key rotation authenticated only by the currently-bound private key signature (canonical in `contracts/invariants.json`) |
| INV-FED-001 | Federation | CRITICAL | `trace_id` is identical in every artifact for a given cross-operator payment |
| INV-FED-002 | Federation | CRITICAL | Every accepted routing request produces exactly one obligation |
| INV-FED-003 | Federation | HIGH | `supports_federation=true` ⟹ routing endpoint actually works |
| INV-FED-004 | Federation | CRITICAL | Same `routing_request_id` always produces the same result |
| INV-FED-005 | Federation | CRITICAL | Value deducted from Operator A = value credited on Operator B |
| INV-FED-006 | Federation | HIGH | Signed protocol metadata and conformance evidence must carry an expiry; perpetual trust material forbidden |
| INV-FED-007 | Federation | CRITICAL | Operator with revoked material rejected from routing within 6 hours of BRL publication |
| INV-FED-LEDGER-001 | Extension | CRITICAL | Cross-operator ledger entries sum to zero (double-entry extends across boundary) |
| INV-FED-LEDGER-002 | Extension | CRITICAL | All federation monetary values in integer minor units (no float) |
| INV-FED-IDEM-001 | Extension | CRITICAL | `routing_request_id` globally unique across all operators and all time |
| INV-FED-RECON-001 | Extension | HIGH | Every cross-operator payment traceable by `trace_id` across all four artifact types |

---

## Conformance Fail Criteria

A conformance run MUST produce FAIL (not warning), and the Open Trust Evaluation MUST return `FAIL_CLOSED`, if any of the following are true:

| Condition | Invariant | Contract |
|-----------|-----------|---------|
| A key/artifact/implementation id appears in the Revocation List (or trust material is missing/invalid) | INV-FEDEVAL-002 | revocation-entry / brl |
| Signed protocol metadata signature does not verify | INV-FEDEVAL-004 | signed-protocol-metadata |
| Revocation List is unsigned or stale (> 6 hours) | INV-FEDEVAL-005 | revocation-entry / brl |
| Trust material is past `expires_at` | INV-FEDEVAL-006 | signed-protocol-metadata / conformance-evidence |
| `supports_federation=true` without published, valid L3+ conformance evidence | INV-FEDEVAL-007 | federation-manifest / conformance-evidence |
| A delegated key signs outside its delegated scope | INV-ROOT-008 | key-manifest / delegated-signing-key |
| Routing accepted without obligation recorded | INV-FED-002 | federation-obligation |
| `routing_request_id` is not idempotent | INV-FED-004 | federation-routing |
| Obligation amount ≠ routing request amount | INV-FED-005 | federation-obligation |
| Ledger DEBIT on A ≠ Ledger CREDIT on B | INV-FED-LEDGER-001 | (end-to-end) |
| `trace_id` differs between Operator A and B artifacts | INV-FED-001 | all |
| `amount.minor` is floating point | INV-FED-LEDGER-002 | federation-routing, federation-obligation |

---

## Invariant Ownership Matrix

Each invariant is owned by the party responsible for enforcing it. **Governance (Protocol Maintainers)** maintains and evolves the protocol and the trust root / Key Manifest; it never authorises, certifies, accepts or approves operators. Each operator **publishes** its own trust material; each peer **evaluates** locally.

| Invariant | Governance (protocol) | Operator A (originator) | Operator B (destination) | BanzAI (evaluator) |
|-----------|-----------------------|-------------------------|--------------------------|--------------------|
| INV-FEDEVAL-002 | **publishes BRL** | verifies | **evaluates** (not_revoked) | tests |
| INV-FEDEVAL-004 | maintains Key Manifest | **publishes** signed metadata | **evaluates** locally | tests |
| INV-FEDEVAL-005 | **signs BRL** (revocation delegated key); defines staleness interval | verifies + enforces staleness | verifies + **enforces** (fresh, signed BRL) | tests |
| INV-FEDEVAL-006 | defines freshness policy | **publishes** fresh material | **evaluates** freshness | tests |
| INV-FEDEVAL-007 | defines L3+ scope policy | **publishes** L3+ evidence | evaluates | tests |
| INV-ROOT-008 | **delegates bounded scope** | verifies | **evaluates** (scope-bounded) | tests |
| INV-ROOT-010 | maintains Key Manifest | **enforces** (signs rotation with current key) | n/a | tests |
| INV-FED-001 | defines | **enforces** (propagates trace) | **enforces** (echoes trace) | tests |
| INV-FED-002 | defines | **enforces** (records obligation) | n/a | tests |
| INV-FED-003 | defines | n/a | **enforces** (endpoint must work) | tests |
| INV-FED-004 | defines | **enforces** (stable request_id) | **enforces** (idempotent handler) | tests |
| INV-FED-005 | defines | **enforces** (obligation amount) | **enforces** (credit amount) | tests |
| INV-FED-006 | defines freshness policy | **publishes** fresh material, re-publishes before expiry | evaluates before routing | tests |
| INV-FED-007 | **publishes BRL** | **enforces** (checks BRL) | **enforces** (checks BRL) | tests |
| INV-FED-LEDGER-001 | defines | **enforces** (DEBIT) | **enforces** (CREDIT) | tests end-to-end |
| INV-FED-LEDGER-002 | defines in schema | **enforces** | **enforces** | tests |
| INV-FED-IDEM-001 | defines format | **enforces** (generates UUIDs) | **enforces** (unique constraint) | tests |
| INV-FED-RECON-001 | defines | **enforces** (trace propagation) | **enforces** (trace propagation) | audits |
