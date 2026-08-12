# ADR-021 — BANZA v1.0 conformance level capability alignment

**Status:** Accepted
**Date:** 2026-06-19
**Author:** BANZA Protocol
**Deciders:** Fidel Monteiro (Founder)
**Relates to:** ADR-040 (Federation trust evaluation without certificates), ADR-030 (Environment isolation)
**Authoritative reference:** `docs/governance/certification-boundary.md` § Conformance level model

---

> **Pre-release correction.** BANZA v1.0 has not been officially released. This ADR
> corrects the v1.0 certification/conformance level model *before* release so the
> certification spec, the conformance vectors, the conformance runner, and the
> report schema all agree. It makes no certification or production-readiness claim.

## Context

BANZA v1.0 defines five conformance levels (L0–L4). An older per-level model —
using operator-type names (*Sandbox / Payment / Settlement / Federation /
Infrastructure Operator*) and an older per-level **capability** mapping — had been
implemented by the conformance suite. The current certification spec
(`docs/governance/certification-boundary.md`) uses a different canonical naming and capability model.
Before this ADR, the two disagreed on what L2–L4 *mean*: the conformance suite
implemented the older mapping (e.g. traceability checks were labelled "L2", the
generic operator manifest sat at "L3", L1 had no distinct coverage, and L4 was a
duplicate of L3). A reader comparing the certification spec with the conformance
suite got contradictory definitions of each level.

## Decision

### 1. Canonical level model (authoritative)

The canonical BANZA v1.0 certification/conformance levels are:

| Level | Name | Capability |
|-------|------|-----------|
| L0 | Protocol Sandbox | Instantiate the protocol safely in sandbox: reachable, valid manifest, `simulated=true`, MON-001 integer money. |
| L1 | Core Payment Capability | Wallets, transfers, double-entry ledger, idempotency, and **traceability**. |
| L2 | Payment Initiation Capability | Payment requests, dynamic QR, instant execution, INV-QR. |
| L3 | Inter-Operator Interoperability | Federation routing, reconciliation, inter-operator settlement, signed protocol metadata. |
| L4 | External Interoperability | External-rail acquiring. |

`docs/governance/certification-boundary.md` is the authoritative definition of each level's
capabilities. These names are canonical; the deprecated operator-type names are
retained only in a crosswalk and in historical records.

### 2. Capability bindings that were corrected

- **Traceability is L1**, not L2 (it is a Core Payment Capability).
- **Payment initiation is L2** (payment requests, dynamic QR, instant execution) —
  previously absent from the live runner and partly mislabelled L1.
- **The operator manifest sandbox-safety check is L0** (every sandbox operator must
  serve a valid `simulated=true` manifest), not L3. L3 federation is verified by the
  federation suite.
- **Single-operator settlement is L2**, not L4. L4 is reserved for *external-rail*
  acquiring.

### 3. The conformance suite conforms to the model

- `conformance/vectors/*.json` — every vector's `certification_level` is set to its
  canonical level.
- `tools/banza-conformance/run.py` — suites map to canonical levels; a real L2
  `payment_initiation` suite exercises `POST /payment-requests`,
  `POST /payment-requests/{id}/pay`, and `POST /qr`.
- `conformance/report-schema.json` — reports carry the canonical level name, suite
  version, and an `evidence` block.

### 4. What each level is verified by, and what is awarded where

The **single-operator sandbox runner awards L0–L2**. L3 requires multi-operator
federation evidence (the federation suite, `run_fed.py` / `--federation`) and is
not awarded by the sandbox runner. L4 (External Interoperability) is **profile-
defined**: external-rail acquiring cannot be proven against a simulated sandbox, so
it requires external integration evidence and is never auto-awarded. There are no
L4 sandbox vectors; this is an honest coverage boundary, not a defect.

## Consequences

- The certification spec, vectors, runner, and report schema are mutually
  consistent for v1.0. There is no remaining L2 capability mismatch.
- The older level *names* and *capability mapping* are superseded by this ADR and
  by `docs/governance/certification-boundary.md`; the deprecated operator-type names survive only as a
  crosswalk.
- **No certification is claimed.** A certification claim still requires a recorded
  conformance report with provenance per `docs/governance/certification-boundary.md`; none is included
  in this repository.
- **No production-readiness claim** and **no claim that any operator is certified**
  follow from this ADR. L4 external-rail conformance and L3 multi-operator
  federation remain evidence-gated.

## Alternatives considered

1. **Amend `docs/governance/certification-boundary.md` to match the old suite mapping.** Rejected — it
   would degrade the canonical capability model to fit an implementation artifact.
2. **Leave the mismatch as a documented caveat for v1.1.** Rejected — v1.0 is not
   released; shipping contradictory level semantics in the first release is worse
   than correcting them now.
3. **Re-map the suite to the canonical model (chosen).** The conformance assets were
   moved to their correct canonical levels and the missing L2 suite was added.
