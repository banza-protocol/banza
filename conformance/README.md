# BANZA Conformance and Certification Governance

Version: 1.0 · Status: Stable

> **Runner.** There is one, and it is Rust (ADR-038):
> [`engines/banza-conformance`](../engines/banza-conformance/README.md) (`banza-conformance-rs`). It covers
> offline vector integrity, invariant consistency, reports and golden parity, and also live-operator
> execution (`run-live`, `run-against-simb`), federation (`run-fed`) and end-to-end (`e2e`). The Python
> runner it replaced has been removed. **A PASS is technical conformance evidence, not production
> certification.**

This directory contains the canonical conformance system for the BANZA protocol
ecosystem. It defines how candidate operator implementations and protocol artifacts
are tested against BANZA contracts and invariants.

---

## What is conformance?

Conformance means an implementation correctly implements the BANZA protocol:

- **Protocol compatibility** — request/response shapes match the canonical schemas
- **Invariant correctness** — financial invariants hold (zero-sum ledger, no negative
  balance, idempotency, immutable postings, atomicity)
- **Interoperability readiness** — another conformant implementation can communicate
  with yours predictably

Conformance is tested against **canonical test vectors** — deterministic,
human-readable JSON descriptions of inputs, expected outputs, expected events,
expected ledger effects, and expected trace structures.

---

## What conformance is NOT

```
╔════════════════════════════════════════════════════════════╗
║  CONFORMANCE DOES NOT MEAN:                                ║
║                                                            ║
║  ✗ Regulatory approval                                     ║
║  ✗ Legal compliance                                        ║
║  ✗ Financial institution authorization                     ║
║  ✗ Production security certification                       ║
║  ✗ Banking license                                         ║
║                                                            ║
║  Conformance produces technical evidence of protocol interoperability. It does not certify an operator, approve an operator, or replace any legal, regulatory, banking, KYC or KYB obligation.     ║
╚════════════════════════════════════════════════════════════╝
```

Any operator implementation deploying BANZA-compatible services in production is
solely responsible for its own regulatory compliance, security posture, and legal
obligations.

---

## Conformance levels (scope)

These are conformance **scope levels** — they bound *what* an implementation was
tested for, not a public certification tier. Conformance & Interoperability
Certification (Layer 2) is a separate, per-implementation, evidence-based,
Rust-decided determination (ADR-032) that consumes this evidence; passing a level is
verifiable evidence, never certification, authorization or approval.

| Level | Name | What it evidences |
|-------|------|-------------------|
| **L0** | Protocol Sandbox | Health, valid manifest, `simulated=true` sandbox-safety, MON-001 |
| **L1** | Core Payment Capability | All L0 + wallets, transfers, double-entry ledger, idempotency, traceability (`trace_id`, `GET /traces`) |
| **L2** | Payment Initiation Capability | All L1 + payment requests, dynamic QR, instant execution, INV-QR |
| **L3** | Inter-Operator Interoperability | All L2 + federation routing, reconciliation, inter-operator settlement, conformance evidence |
| **L4** | External Interoperability | All L3 + external-rail acquiring (profile-defined) |

Levels are additive — every level requires all lower levels to pass.

The identifiers and names above come from
[`contracts/production/conformance-profiles.production.json`](../contracts/production/conformance-profiles.production.json),
which is their single normative source. Runtime and interface metadata derives from it or is checked
against it (`make profile-vocabulary-check`) — nothing maintains a second profile table by hand.

A profile is a **technical capability** an implementation demonstrates. It is never a certification
state, an operational status or a regulatory permission, and a profile name never encodes one — see
[`docs/governance/certification-boundary.md`](../docs/governance/certification-boundary.md).

The level **names and per-level capabilities** above are canonical and match
[docs/governance/certification-boundary.md](../docs/governance/certification-boundary.md) § Conformance level model and
ADR-030. Traceability is verified at L1; payment initiation (payment requests,
dynamic QR, instant execution) at L2. The single-operator conformance runner produces evidence at
L0–L2; L3 (federation) and L4 (external) require multi-operator / external-rail
evidence and are not produced by the single-operator runner. Conformance evidence at
any level is technical validation only and does not constitute certification,
authorization, or approval of an operator.

---

## Conformance targets

There is no reference operator in this repository. Conformance is validated against
published contracts, vectors, fixtures and candidate operator endpoints. Examples are
illustrative only and are not certification targets. Conformance produces technical
evidence; it does not create a certified operator.

---

## Directory structure

```
conformance/
├── README.md           This file
├── report-schema.json  Canonical report format for conformance results
├── vectors/            Canonical test vectors (deterministic, language-neutral)
│   ├── transfers.json
│   ├── qr-payloads.json
│   ├── payment-requests.json
│   ├── settlement-batches.json
│   ├── event-envelopes.json
│   ├── wallet-balances.json
│   ├── ledger-postings.json
│   └── operator-manifests.json
├── operators/          Operator conformance suite
│   └── suite.json
├── sdk/                SDK conformance suite
│   └── suite.json
├── qr/                 QR runtime conformance suite
│   └── suite.json
├── events/             Event schema validation suite
│   └── suite.json
├── ledger/             Ledger invariant suite
│   └── suite.json
├── settlement/         Settlement conformance suite
│   └── suite.json
├── manifests/          Operator manifest validation
│   └── schema.json
└── capabilities/       Capability descriptor validation
    └── schema.json
```

Run suites against any operator:

```bash
cd engines/banza-conformance
cargo run --release -- run-live --url http://localhost:3100
```

See [`engines/banza-conformance/README.md`](../engines/banza-conformance/README.md) for full usage.

---

## Suite authorship

Suites are authored in JSON and executed by the conformance runner. Each vector is:

- **Deterministic** — same input always produces the same expected output
- **Stable** — vectors are immutable once published; new cases get new IDs
- **Human-readable** — JSON, no binary formats
- **Language-neutral** — the runner is Python stdlib; vectors work against any HTTP operator

---

## Adding new vectors

1. Choose the correct vector file in `vectors/`
2. Assign a monotonically increasing ID (`TRF-010`, `QR-003`, etc.)
3. Fill all required fields: `id`, `title`, `certification_level`, `input`, `expected`
4. Add the vector to the relevant suite in `operators/suite.json` or domain-specific suite
5. Run the conformance runner to verify that the selected candidate endpoint or fixture satisfies the published vectors
6. Open a PR — vectors require review by one maintainer

Vector IDs are immutable. If a vector becomes invalid, mark it `deprecated: true`.

---

## Federation conformance

Federation conformance lives in [`federation/suite.json`](./federation/suite.json)
(Open Trust Evaluation, discovery, routing, obligations, settlement and failure
modes, over the fixtures in `fixtures/federation/`). Possible extension areas —
not commitments — include identity resolution, CBDC operator conformance,
government sandbox conformance and offline payment modes. While the repository
is pre-production, there is no certified operator and no active production
certificate.
