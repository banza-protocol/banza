# BANZA Federation Conformance Path

**Authority:** ADR-027, ADR-033, ADR-031; `docs/governance/FEDERATION_TRUST_MODEL.md`

---

## How an operator reaches federation

```
An operator implements the federation protocol
    ↓
The operator runs the Conformance Automation (deterministic, reproducible)
    ↓
The operator self-publishes its Operator Manifest, signed protocol metadata and
conformance evidence on infrastructure it controls
    ↓
Each peer runs the Open Trust Evaluation LOCALLY over that published material,
before routing
```

An operator implements the protocol, runs the deterministic conformance suite over its own
implementation, and publishes its Operator Manifest, signed protocol metadata and conformance
evidence at URLs it controls. Nothing is issued to the operator, and there is no submission,
queue, application or review anywhere on this path. Before routing to a peer, an operator runs
the **Open Trust Evaluation** — ten conjunctive, fail-closed checks (ADR-031) — over that peer's
published material and decides for itself.

This is the same path used for L0–L2: **conformance is measured, never granted.** The federation
scope adds cross-operator capabilities to the material an operator publishes; it does not add a
gate. Every operator, first or hundredth, follows the identical path.

---

## Federation conformance scope

Federation capability lives at a **federation-capable conformance scope (L3+)**. The level names
L0–L4 describe conformance scope — measured and self-demonstrated — not a badge conferred on an
operator. Per `docs/governance/certification-boundary.md`, the federation-capable scope requires:

- All lower-scope requirements
- `payout.batch` — batch payouts to bank accounts
- `reconciliation` — automated ledger reconciliation
- `cross_operator_routing` and `cross_operator_settlement` — the cross-operator capabilities
  exercised by the federation suite

An operator declares this scope in its manifest and demonstrates it through published conformance
evidence at that scope. The scope is a property of the evidence — reproducible by any third party
— not a status held by the entity.

---

## L3 Federation Conformance Requirements

The following is what a federation-capable conformance scope requires. Each requirement maps to a
protocol artifact, a contract, a conformance case, and the reproducible evidence it produces.

### Requirements Table

| Requirement | Protocol Artifact | Contract | Conformance Suite | Evidence |
|-------------|------------------|----------|-------------------|---------|
| **FED-L3-001** Operator identity | `operator_id` in manifest | `contracts/production/operator-manifest.production.schema.json` | FED-001 — manifest with published trust material | Valid manifest + published signed protocol metadata + conformance evidence |
| **FED-L3-002** Protocol material signing | ed25519 signature | `contracts/production/signed-protocol-metadata.production.schema.json`, `contracts/federation/federation-trust.json` | FED-002 — signature verification | Signed protocol metadata verifies under the trust root or a delegated signing key (INV-FEDEVAL-004) |
| **FED-L3-003** Capability declaration | `supports_federation: true` in manifest | `conformance/capabilities/schema.json` | CAP-FED-001 | Manifest declares federation capability |
| **FED-L3-004** Federation endpoint | `GET /federation/route` available | `contracts/federation/federation-routing.json` | FED-003 — routing request | Returns valid routing response |
| **FED-L3-005** Trace propagation | `trace_id` in all federation artifacts | `contracts/events/envelope.schema.json` | FED-004 — trace consistency | Federation transaction carries same trace_id across both operators |
| **FED-L3-006** Obligation recording | `POST /federation/obligations` | `contracts/federation/federation-obligation.json` | FED-005 — obligation creation | Obligation created per cross-operator payment |
| **FED-L3-007** Cross-operator payment end-to-end | Full flow: Operator A → Operator B | All above | FED-006 — end-to-end | Consumer on A pays merchant on B; both ledgers correct |

---

## Minimum Conformance Suite for L3 Federation

The minimum set of test vectors an operator runs to demonstrate the federation-capable conformance
scope over its own implementation:

```
Suite: federation-core

FED-001: Operator manifest is valid and self-published
  - GET /.well-known/banza/operator.json → 200, valid schema
  - manifest.protocol_metadata_url resolves to published signed protocol metadata + conformance evidence
  - Conformance scope L3+ present in the published conformance evidence

FED-002: Published trust material is present and valid
  - GET manifest.protocol_metadata_url → 200
  - Signed protocol metadata verifies under the active Key Manifest (trust root or delegated key), INV-FEDEVAL-004
  - Conformance evidence within its freshness window (INV-FEDEVAL-006)
  - operator_id matches manifest

FED-003: Federation capability declared
  - manifest.capabilities.supports_federation == true
  - manifest.capabilities.cross_operator_routing == true

FED-004: Routing endpoint accepts federation request
  - POST /federation/route with valid OperatorRouteRequest → 200
  - Response includes interop_transfer_id
  - trace_id in response matches request

FED-005: Obligation created for accepted routing request
  - GET /federation/obligations → includes obligation from FED-004
  - Obligation: from_operator_id, to_operator_id, amount, trace_id

FED-006: Cross-operator payment completes correctly
  - End-to-end flow: Operator A routes to Operator B
  - Operator B ledger shows CREDIT for correct amount
  - Operator A ledger shows DEBIT
  - INV-FED-001: same trace_id in both operators
  - INV-FED-005: total value conserved (no creation, no destruction)
```

---

## Cross-Operator Conformance (Interoperability Test)

Federation conformance requires exercising **two operators together**. This is a fundamentally
different conformance model from L0–L2 (which tests a single operator in isolation).

### The Interoperability Problem

Single-operator conformance: `run_tests(Operator_A_URL)` → pass/fail

Cross-operator conformance: `run_tests(Operator_A_URL, Operator_B_URL)` → pass/fail

The conformance runner requires a two-operator invocation mode:

```bash
cd engines/banza-conformance
cargo run --release -- run-fed           # federation conformance across two peers
```

The runner exercises the federation suite across both operators and reports the interoperability
result as reproducible evidence. Each operator publishes that evidence at its own
`protocol_metadata_url`. A peer that intends to route reaches its own decision by running the Open
Trust Evaluation over that published material: **ROUTING_ALLOWED** when all ten checks pass,
**FAIL_CLOSED** otherwise. The result is a local decision about one interaction — it is not a
status the runner or any party confers on the operator.

---

## Conformance Path — Minimum Sequence

The **smallest possible implementation sequence** for an operator to reach a federation-capable
conformance scope without introducing any central authority:

```
Phase 1 — ADR (governance prerequisite)
  ADR-027: Open Protocol Trust Model Without CA
    → Establishes: trust rests on signed protocol metadata, conformance evidence,
      public protocol registry, trust root, delegated signing keys, revocation/fail-closed
  ADR-033: Operator Self-Publication and Machine-Verifiable Conformance
    → Establishes: operators publish; conformance is measured, never granted
  ADR-031: Federation Trust Evaluation Without Certificates
    → Establishes: the Open Trust Evaluation (ten checks), run locally by each routing peer

Phase 2 — Contracts (protocol specification)
  contracts/production/operator-manifest.production.schema.json
  contracts/production/signed-protocol-metadata.production.schema.json
  contracts/production/conformance-evidence.production.schema.json
  contracts/production/federation-trust-evaluation.production.schema.json
  contracts/federation/federation-routing.json
  contracts/federation/federation-obligation.json
  contracts/federation/federation-event.json
  contracts/federation/federation-trust.json

Phase 3 — Protocol core (operator modules — capabilities, routing, settlement)
  Implement manifest signing (ed25519, banza-capabilities crate)
  Implement InteropRoutingEngine trait (banza-routing crate)
  Implement InteropObligation + CrossOperatorSettlementProvider (banza-settlement crate)

Phase 4 — Conformance
  conformance/federation/suite.json
  conformance/vectors/federation-routing.json
  conformance/vectors/federation-settlement.json
  conformance/vectors/federation-discovery.json

Phase 5 — Reference operator
  Enable cross_operator_routing in sandbox manifest
  Implement /federation/* endpoints in reference/sandbox-operator
  Run federation conformance: Sandbox A ↔ Sandbox B

Phase 6 — Publication and evaluation
  Operator publishes signed protocol metadata + conformance evidence at its protocol_metadata_url
  Peers run the Open Trust Evaluation over that material and reach ROUTING_ALLOWED / FAIL_CLOSED locally
  BanzAI federation intelligence can evaluate any operator's published federation readiness
```

**Total estimated scope:** 3 ADRs, the production trust schemas plus the federation contracts,
3 crate extensions, 1 new conformance suite, 1 reference implementation extension, 1 conformance
runner extension.

---

## BanzAI's Role in Federation Conformance

| Task | Who Does It | Notes |
|------|-------------|-------|
| Define conformance requirements | Protocol Maintainers (ADRs, contracts) | Protocol maintenance — never operator approval |
| Publish signed protocol metadata + conformance evidence | Operator | Self-published on infrastructure the operator controls |
| Evaluate operator readiness | BanzAI | Runs the conformance suite; reports reproducible evidence |
| Run cross-operator conformance | BanzAI | Requires two-operator invocation mode |
| Verify signed protocol metadata & evidence signatures | Any peer / verifier | Cryptographic verification, reproducible over public bytes |
| Maintain federation topology map | BanzAI | Protocol Graph capability |
| Report on federation compatibility | BanzAI | Federation Intelligence capability |
| Reach ROUTING_ALLOWED / FAIL_CLOSED | Each routing peer, locally | Never BanzAI, never the Protocol Maintainers |

---

## Final Answer: What is the minimum to reach a federation-capable conformance scope?

**Minimum protocol artifacts:**
1. ADR-027, ADR-033, ADR-031 (open trust model, self-publication, Open Trust Evaluation)
2. `contracts/production/signed-protocol-metadata.production.schema.json`
3. `contracts/production/conformance-evidence.production.schema.json`
4. `contracts/federation/federation-routing.json`
5. `contracts/federation/federation-obligation.json`
6. Manifest signing implementation in `banza-capabilities`
7. `InteropRoutingEngine` skeleton in `banza-routing`
8. `InteropObligation` struct in `banza-settlement`
9. `conformance/federation/suite.json` with FED-001 through FED-006
10. Two operators publishing conformance evidence that passes FED-001 through FED-006

**The prerequisite that makes everything else possible:** the trust model itself (ADR-027, ADR-033,
ADR-031). Without it, manifests cannot be signed, published evidence cannot be verified, and peers
cannot evaluate trust between operators. With it, trust is a computation each peer runs locally —
not a decision anyone makes on an operator's behalf.
