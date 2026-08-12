# BANZA L3 Federation — Operator Quickstart

**Document ID:** FEDERATION-OPERATOR-QUICKSTART-001  
**Status:** Canonical — operator-facing  
**Authority:** `FEDERATION_CONFORMANCE_PATH.md`, `docs/governance/FEDERATION_TRUST_MODEL.md`, ADR-038, ADR-039, ADR-040

---

## What is L3 Federation?

L3 Federation is the federation-capable conformance scope: it demonstrates that your operator
correctly implements the BANZA cross-operator payment protocol. An operator whose published
material passes a peer's **Open Trust Evaluation** can:

- Accept routing requests from any peer whose published material you have evaluated
- Route payments from your consumers to payees on any peer you route to
- Participate in bilateral netting and settlement
- Be evaluated by peers directly from your published signed protocol metadata and conformance evidence

Conformance is **measured** by passing 79 conformance tests across 9 suites. The result is
reproducible, machine-verifiable evidence you publish yourself — never a self-declaration, and never
a status conferred by review.

---

## What you must implement

Before running the conformance suite, your operator must expose these endpoints:

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/.well-known/banza/signed-protocol-metadata.json` | GET | None (public) | Serve your published signed protocol metadata + conformance evidence |
| `/.well-known/banza/operator.json` | GET | None (public) | Serve your operator manifest with federation fields |
| `/federation/route` | POST | `Banza-Federation-Signature` header | Accept routing requests from other operators |
| `/federation/obligations` | GET | `Banza-Federation-Signature` header | List recorded inter-operator obligations |
| `/federation/obligations/{id}` | GET | `Banza-Federation-Signature` header | Get a specific obligation |
| `/federation/events` | GET | `Banza-Federation-Signature` header | Serve federation event stream |

### Published trust material requirements

Your published trust material (`/.well-known/banza/signed-protocol-metadata.json`) must:
- Cover a federation-capable conformance scope (`conformance scope >= L3`)
- Have its signed protocol metadata verify under the trust root or a delegated signing key (INV-FEDEVAL-004)
- Be fresh — within its declared freshness window (≤ 90 days at L3+, INV-FEDEVAL-006)
- Have `operator_id` matching your manifest
- Cover `capabilities` including `"cross_operator_routing"`

See `contracts/production/signed-protocol-metadata.production.schema.json` and
`contracts/production/conformance-evidence.production.schema.json` for the full schemas.

### Manifest requirements

Your manifest (`/.well-known/banza/operator.json`) must include the federation extension fields:

```json
{
  "operator_id": "your-operator-id",
  "federation_version": "1",
  "protocol_metadata_url": "https://your-domain.example/.well-known/banza/signed-protocol-metadata.json",
  "interop_endpoint": "https://your-domain.example",
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

See `contracts/federation/federation-manifest.json` for the full schema.

### Routing endpoint requirements

`POST /federation/route` must:
1. Verify the `Banza-Federation-Signature` header (ed25519 — see ADR-040)
2. Run the Open Trust Evaluation (ten checks, ADR-040) over the sender's published material at its `protocol_metadata_url`
3. Validate `to_operator_id == this operator's operator_id`
4. Resolve the `recipient_identifier`
5. Accept (credit payee atomically) or return a structured rejection with a `rejection_code`
6. Return `routing_request_id` echoed, `trace_id` echoed, `interop_transfer_id` on acceptance
7. Be idempotent: same `routing_request_id` → same response

### Obligation recording requirements

After accepting a routing request, your operator (as Operator A sending money) must:
1. Atomically debit the payer wallet AND record an obligation in the same database transaction
2. Sign the obligation with your private key (`obligor_signature`)
3. The obligation must have `trace_id` matching the routing request

See `contracts/federation/federation-obligation.json` and `FEDERATION_PROTOCOL_FLOW.md` Phase 4–5.

---

## Running the conformance suite

### Prerequisites

```bash
pip install cryptography>=41.0.0  # for ed25519 signature tests
```

### Step 1 — Start the fixture server

The fixture server acts as the "Operator A" adapter in the conformance test infrastructure:

```bash
python3 tools/banza-conformance/fixture_server.py --port 8099
```

Leave this running in Terminal 1.

### Step 2 — Run the full suite

```bash
python3 tools/banza-conformance/run.py \
  --federation \
  --url http://localhost:8099 \
  --output l3-evidence.json
```

If your operator is running at a different URL, replace `http://localhost:8099` with your URL.

**Expected output (all pass):**
```
BANZA Federation Conformance Runner 1.1.0-slice10
Slice: 10 — FED-SPM-001–011, ..., FED-FAIL-001–008
...
[Suite] Trust Material Validation  → 11 passed, 0 failed
[Suite] Discovery and Manifest     → 8 passed, 0 failed
[Suite] Trust Establishment        → 9 passed, 0 failed
[Suite] Routing Negotiation        → 12 passed, 0 failed
[Suite] Transfer Execution         → 8 passed, 0 failed
[Suite] Obligation Lifecycle       → 7 passed, 0 failed
[Suite] Federation Event Emission  → 6 passed, 0 failed
[Suite] Netting and Settlement     → 10 passed, 0 failed
[Suite] Failure and Recovery       → 8 passed, 0 failed
============================================================
FED-SPM-001–011, ...: ALL PASS
```

### Step 3 — Diagnose failures

Run a single suite to isolate failures:

```bash
# Run only trust material validation
python3 tools/banza-conformance/run.py --federation --url http://localhost:8099 --fed-suite cert

# Available suite IDs: cert | disc | trust | route | exec | obl | evt | settle | fail
```

Failures print the specific assertion that failed:
```
✗ FED-SPM-002 — Signed Protocol Metadata Signature Verifies
  ✗ signature verifies against the active trust root (test) (expected: true, got: false)
```

### Step 4 — Publish your evidence

Once all tests pass, publish `l3-evidence.json` (your Evidence Bundle) together with your signed
protocol metadata at your own `protocol_metadata_url`:

```
GET https://your-domain.example/.well-known/banza/signed-protocol-metadata.json
→ { signed_protocol_metadata, conformance_evidence, evidence_bundle_hash, ... }
```

Optionally register the URL in the Public Protocol Registry so peers can discover it. The registry
is an index — it grants nothing and reviews nothing. Peers fetch your published material directly
and run the Open Trust Evaluation over it themselves. There is no submission, no portal, no review
and no one to contact: you publish, and peers evaluate.

---

## How peers reach a routing decision

A peer decides whether to route by running the Open Trust Evaluation locally over your published
material. The outcome is **ROUTING_ALLOWED** or **FAIL_CLOSED** — a local decision about one
interaction, never a status conferred on you.

**Your evidence supports ROUTING_ALLOWED when:**
- All blocking suites pass (FED-SPM through FED-OBL)
- FED-EVT: all 6 cases pass
- FED-SETTLE: cases 001–008 pass
- FED-FAIL: cases 001, 004, 005 pass
- No CRITICAL invariant violation in any suite
- Your signed protocol metadata and conformance evidence verify and are within their freshness window

**A peer fails closed (FAIL_CLOSED) when:**
- Any failure in FED-SPM, FED-DISC, or FED-TRUST
- FED-ROUTE: any failure in cases 001–009
- FED-EXEC: any failure in cases 001–005
- FED-OBL: any failure in cases 001–005
- Any CRITICAL invariant violation
- Trust material missing, invalid, expired, revoked, or incompatible

**Non-blocking cases** (routing is not gated on these; remediate and re-publish):
- FED-EVT cases 002 or 003 fail
- FED-SETTLE cases 009 or 010 fail
- FED-FAIL cases 002, 003, 006, 007, 008 fail

Recovery needs nobody's permission: fix the implementation, re-run the public automation, and
re-publish your evidence.

---

## Key invariants your implementation must enforce

| Invariant | What it means | Tested by |
|---|---|---|
| INV-FEDEVAL-004 | A peer's signed protocol metadata must verify against the public key resolved from the active Key Manifest (the trust root or a delegated signing key) | FED-TRUST-002 (negative) |
| INV-FED-001 | trace_id must be identical in all artifacts for a cross-operator payment | FED-ROUTE-003, FED-OBL-003, FED-EVT-005 |
| INV-FED-002 | Every accepted routing request produces exactly one obligation | FED-OBL-001, FED-OBL-004 |
| INV-FED-004 | Same routing_request_id must produce the same result (idempotency) | FED-ROUTE-004 |
| INV-FED-005 | Obligation amount == routing request amount exactly | FED-OBL-002 |
| INV-FED-LEDGER-002 | All monetary values must be integer minor units (no floats) | FED-ROUTE-010 |

---

## Where to go next

| Document | Purpose |
|---|---|
| `spec/federation/FEDERATION_PROTOCOL_FLOW.md` | Complete behavioral spec for all 10 phases |
| `spec/federation/FEDERATION_INVARIANTS.md` | Formal invariant definitions with implementation notes |
| `spec/federation/FEDERATION_CONTRACT_SURFACE.md` | Full field specifications for all federation contracts |
| `spec/federation/FEDERATION_FAILURE_SCENARIOS.md` | Recovery runbooks for all failure modes |
| `spec/federation/FEDERATION_CONFORMANCE_PATH.md` | The conformance path and federation-capable scope |
| `docs/governance/FEDERATION_TRUST_MODEL.md` | The Open Trust Evaluation and its boundary |
| `contracts/production/` | Signed protocol metadata, conformance evidence and trust-evaluation schemas |
| `contracts/federation/` | JSON Schema definitions for the federation routing/obligation/event contracts |
| `decisions/adr/ADR-038*.md`, `ADR-039*.md`, `ADR-040*.md` | Open trust model, self-publication, and the Open Trust Evaluation |
