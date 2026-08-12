# BANZA — Conformance Suite

> This document describes: **BANZA** — the Open Financial Protocol.
> For other layers: BanzAI — the native protocol agent; its canonical runtime lives in this repo ([services/banzai-api](../../services/banzai-api)). Active BanzAI development lives entirely in this monorepo (ADR-075).

**Version:** 1.0  
**Date:** 2026-05-30  
**Status:** Official  
**Authority:** ADR-002

---

The BANZA conformance system lets any operator, SDK, or integration verify that it correctly implements the BANZA protocol. Conformance is binary: either a behaviour matches the spec, or it doesn't.

## What conformance covers

- **Operators** — HTTP servers that implement wallets, transfers, QR, payment requests, events, settlement, and traces
- **SDKs** — Client libraries that parse QR payloads, event envelopes, and webhook signatures
- **QR runtimes** — Code that generates or scans `BANZA-SBX:` and `BANZA:` payloads
- **Event emitters** — Services that emit conformant event envelopes with trace fields
- **Ledger implementations** — Storage that satisfies double-entry and immutability invariants
- **Settlement providers** — Implementations that satisfy the no-money-creation invariant

## Conformance levels (L0–L4)

| Level | Name | Conformance-suite coverage |
|-------|------|----------------------------|
| L0 | Protocol Sandbox | Health, valid manifest, `simulated=true` sandbox-safety, MON-001, environment isolation |
| L1 | Core Payment Capability | All L0 + wallets, transfers, double-entry ledger, idempotency, **traceability** |
| L2 | Payment Initiation Capability | All L1 + payment requests, dynamic QR, instant execution, INV-QR |
| L3 | Inter-Operator Interoperability | All L2 + federation routing, reconciliation, inter-operator settlement, signed protocol metadata |
| L4 | External Interoperability | All L3 + external-rail acquiring (profile-defined) |

The level **names and per-level capabilities** above are canonical and match
[docs/governance/certification-boundary.md](../governance/certification-boundary.md) § Conformance level model and
ADR-021. The single-operator sandbox runner awards L0–L2; L3 (federation) is run
via `--federation`, and L4 (external) is profile-defined — neither is awarded by
the sandbox runner.

> **Deprecated names.** Earlier drafts named the levels *Sandbox Operator*,
> *Payment Operator*, *Settlement Operator*, *Federation Operator*, and
> *Infrastructure Operator*. Those names are deprecated and retained here only so
> older references resolve. Use the canonical L0–L4 names above.

The reference operator **targets Level 2** and can be evaluated against the
Level-2 suite. No certification is asserted here: a certification claim requires
committed conformance evidence (a `report.json` with provenance) issued under the
BANZA certification process, and no such evidence artifact is included in this
repository.

For full certification requirements per level, see [docs/governance/certification-boundary.md](../governance/certification-boundary.md).

## Running the conformance suite

Start your operator, then:

```bash
python3 tools/banza-conformance/run.py \
  --url http://localhost:3000 \
  --level 2 \
  --output report.json
```

See `tools/banza-conformance/README.md` for full options.

## Conformance vectors

All test vectors are deterministic JSON files in `conformance/vectors/`. Each vector specifies an input, the expected HTTP response, and the expected downstream effects (events, ledger entries, trace structure).

| File | Vectors | Covers |
|------|---------|--------|
| `vectors/transfers.json` | TRF-001 – TRF-009 | P2P transfers, idempotency, ledger, traces |
| `vectors/qr-payloads.json` | QR-001 – QR-007 | QR generation, open/fixed amount, single-use, trace |
| `vectors/payment-requests.json` | PR-001 – PR-006 | PR lifecycle, expiry, trace propagation |
| `vectors/settlement-batches.json` | STL-001 – STL-006 | Settlement batches, fee model, idempotency |
| `vectors/event-envelopes.json` | EVT-001 – EVT-008 | Event emission, envelope schema, trace fields |
| `vectors/ledger-postings.json` | LED-001 – LED-006 | Double-entry, balance, immutability, trace |
| `vectors/wallet-balances.json` | WLT-001 – WLT-005 | Wallet creation, seeding, balance after transfer |
| `vectors/operator-manifests.json` | MAN-001 – MAN-004 | Manifest schema, safety invariants |

## Financial invariants

Every operator must satisfy these invariants at all times:

| Invariant | Description |
|-----------|-------------|
| `zero_sum_ledger` | Every transfer creates DEBIT and CREDIT of exactly equal amount |
| `no_negative_balance` | No wallet may reach a negative balance |
| `idempotency` | Same idempotency key always returns the same result |
| `trace_id_propagation` | All entities in a flow share the same `trace_id` |
| `causation_id_set` | Derived transfers carry `causation_id` pointing to the trigger |
| `ledger_immutability` | No ledger entry is modified after creation |
| `single_use_qr` | A paid QR code cannot be paid again |
| `single_use_pr` | A paid payment request cannot be paid again |
| `settlement_no_money_creation` | `net_minor + fee_minor` must equal `gross_minor` exactly |
| `settlement_idempotency` | A transfer appears in exactly one settlement batch |

For the authoritative invariant definitions, see the machine-readable [invariant registry](../../contracts/invariants.json) and [docs/reference/en/complete.md §9 — Financial Invariants](../reference/en/complete.md).

## Conformance report format

Reports follow `conformance/report-schema.json`. Each run produces:

```json
{
  "report_id": "rpt-20260528T100000Z",
  "certification_level_achieved": 2,
  "summary": { "total": 28, "passed": 28, "failed": 0 },
  "suites": [
    {
      "suite_id": "health",
      "certification_level": 0,
      "passed": 2,
      "failed": 0,
      "cases": [...]
    }
  ]
}
```

## Status badges (retired)

Status badge SVGs were retired: conformance is demonstrated by reproducible,
self-published evidence (a PASS is evidence, not a certificate or a status
mark) — see [docs/governance/certification-boundary.md](../governance/certification-boundary.md).

## Operator manifest

Operators at L3+ (Inter-Operator Interoperability) must serve a manifest at `/.well-known/banza/operator.json`:

```json
{
  "operator_id": "your-operator-id",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "protocol_version": "1.0",
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_settlement": true,
    "supports_payment_requests": true,
    "supports_events": true,
    "supports_traces": true
  }
}
```

The manifest schema is validated by `conformance/manifests/schema.json`.

**Safety invariant:** Any sandbox operator MUST declare `simulated: true` and `production_allowed: false`. The conformance runner will fail MAN-002 and ENV-001 if these are not set.

## Adding new vectors

1. Assign a stable ID (e.g. `TRF-010`) — IDs are never reused
2. Add the vector to the appropriate file in `conformance/vectors/`
3. Set `"stability": "experimental"` until it passes the reference operator
4. Reference the vector from the relevant suite's `vectors` array
5. Implement the test case in `tools/banza-conformance/run.py`

Deprecated vectors get `"deprecated": true` rather than being removed — this preserves history.

## CI integration

The `conformance` GitHub Actions workflow runs on every push to `main` and every pull request:

| Job | What it checks |
|-----|---------------|
| `validate-vectors` | All JSON files parse; vector IDs are unique |
| `openapi-compat` | No breaking changes in the OpenAPI spec |
| `schema-compat` | Report and manifest schemas are structurally valid |
| `qr-compat` | QR vectors decode to the expected payloads |
| `trace-contract` | All vector IDs referenced in suites exist in vector files |
| `manifest-validation` | Manifest schema has all required fields |
| `reference-conformance` | Exercises the reference operator against the L2 suite |

Any invariant, schema, QR, trace, or manifest contract violation fails the build.

---

**Referências:**

- [docs/governance/certification-boundary.md](../governance/certification-boundary.md) — Conformance level model (L0–L4)
- [contracts/invariants.json](../../contracts/invariants.json) — Invariant registry (authoritative) · [docs/reference/en/complete.md §9](../reference/en/complete.md) — Financial invariants (prose)
- `docs/reference/conformance.md` — Detailed conformance documentation
- `conformance/vectors/` — Test vector files
