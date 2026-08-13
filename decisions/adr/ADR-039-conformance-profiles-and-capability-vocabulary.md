# ADR-039 — Conformance profiles and capability vocabulary

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
- `engines/banza-conformance` (`banza-conformance-rs`) — suites map to canonical levels; a real L2
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

---

## Profile applicability model for the validation journey (REQUIRED / OPTIONAL / NOT_APPLICABLE)

- **Status:** Accepted
- **Date:** 2026-08
- **Related:** ADR-039 (conformance profiles / levels L0–L4), ADR-003..063 (three-layer architecture;
  certification ≠ admission ≠ authorisation), ADR-034..066 (conformance & interoperability
  certification; Technical Registry; closed certificate state machine), ADR-038 (endpoint-originated
  operator validation; operator↔implementation model; nine-step journey §21), ADR-042 (validation-journey
  consolidation; single technical-state authority; durable append-only receipts)

---

## Context

The endpoint-originated validation journey (ADR-038 §21) runs the same **nine canonical steps** for
every target: discovery, manifest, keys, conformance, interoperability, trust, federation, evidence,
certification. The eight technical steps each run a deterministic Rust engine on artifacts fetched from
the implementation's public endpoints; step 9 aggregates their verdicts into a **Certification
Readiness** record (`READY` / `BLOCKED`, never `CERTIFIED`).

Every published implementation declares a **conformance profile** (an ADR-039 level: L0, L1, L2, L3,
L4). The profile bounds *which capabilities the implementation claims to demonstrate*:

- **L0 / L1** — single-operator sandbox readiness (manifest, keys/trust, offline conformance, evidence
  bundle for technical review). Cross-operator payment interoperability and inter-operator federation
  are **outside the declared scope**.
- **L2** — adds payment **interoperability**.
- **L3** — adds inter-operator **federation**.
- **L4** — the full surface.

Before this ADR the journey was **profile-blind** at two points:

1. The `interoperability` step (engine `banza-l2-readiness`) and the `federation` step (engine
   `banza-l3-readiness`) were **always** fetched and evaluated, even for an L0 implementation that does
   not publish L2/L3 endpoints and does not claim those capabilities. Fed the raw L0 artifacts, those
   engines correctly returned `L2_BLOCKED_BY_MANIFEST` / `L3_BLOCKED_BY_MANIFEST`, which the verdict
   mapper turned into `FAILED`.
2. `certification_readiness` required **all eight** technical steps to be `VERIFIED`. Two structurally
   inapplicable steps therefore dragged an otherwise-complete L0 implementation to `BLOCKED`.

The result was a journey that reported an L0 implementation as *failing* two steps that its profile
never claimed — a **category error**: it conflated "out of scope for this profile" with "evaluated and
failed". The Operador Zero reference implementation (profile L0) surfaced exactly this on the live
journey.

## Decision

Introduce an explicit **applicability model**, orthogonal to step state, decided in Rust
(`banza-target-registry`). Every technical step, for a given profile, is one of:

| Applicability | Meaning |
|---|---|
| `REQUIRED` | In scope for the profile and must be evaluated; contributes to readiness. |
| `OPTIONAL` | In scope but non-blocking; evaluated if published, never blocks readiness. |
| `NOT_APPLICABLE` | **Out of scope** for the profile — not fetched, not evaluated, never a failure. |

The canonical, data-driven profile→step map (`banza_target_registry::verdict::step_applicability`):

| Step | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| discovery, manifest, keys, conformance, trust, evidence | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| **interoperability** (L2) | NOT_APPLICABLE | NOT_APPLICABLE | REQUIRED | REQUIRED | REQUIRED |
| **federation** (L3) | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | REQUIRED | REQUIRED |

An unknown or empty profile is conservative: **every step `REQUIRED`** (prior behaviour — never widens
scope silently).

### Consequences for the journey

1. **NOT_APPLICABLE steps are never fetched or evaluated.** The orchestrator (`banzai-api`
   `validate.js`) seals an out-of-scope step as an OperationReceipt carrying `applicability:
   "NOT_APPLICABLE"`, `result.status: "NOT_EVALUATED"`, `reason_codes:
   ["STEP_NOT_APPLICABLE_FOR_PROFILE:<profile>"]`, and **zero protocol fetches**. No L2/L3 endpoint is
   contacted for an L0 target.
2. **Readiness aggregates only the steps that APPLY.** `certification_readiness(step_verdicts, profile)`
   filters to steps whose applicability ≠ `NOT_APPLICABLE`; readiness is `READY` iff every *applicable*
   step is `VERIFIED`, else `BLOCKED`. The record carries `profile`, `required_steps_evaluated`,
   `not_applicable_steps`, and `EXCLUDED_NOT_APPLICABLE:<steps>`.
3. **Overall status and blockers ignore NOT_APPLICABLE steps.** A NOT_APPLICABLE step never contributes
   `FAILED`/`BLOCKED`/`PENDING` to the journey's `overall_status` and never appears in the certification
   receipt's `blocked_by`.
4. **Applicability is orthogonal to state and to certification.** It changes *whether a step is in
   scope*, not the six-state result taxonomy of an evaluated step, and it never certifies: step 9 is
   still Readiness, `certification_status` is always `NOT_CERTIFIED`, and the aggregate never returns
   `CERTIFIED` (ADR-035).

### Boundary (what this ADR does NOT do)

- It does **not** weaken any evaluation. A `REQUIRED` step that is fetched and fails still fails; the
  same L0 artifacts evaluated under an L2 declaration make `interoperability` `REQUIRED` and therefore
  `BLOCKED`. Applicability follows the **declared** profile, never the convenience of a green result.
- It does **not** grant admission, authorisation, or the ability to move funds. Readiness over the
  applicable steps is still only technical readiness for review (ADR-038 §4.10, ADR-004).
- It is **not** a per-operator special case. The map is a pure function of the profile; Operador Zero
  is resolved and evaluated exactly like any future L0 implementation.

## Implementation

- **`engines/banza-target-registry/src/verdict.rs`** — `REQUIRED`/`OPTIONAL`/`NOT_APPLICABLE`
  constants, `step_applicability(profile, step)`, `profile_applicability(profile)`, and a
  profile-aware `certification_readiness(step_verdicts, profile)`.
- **`engines/banza-target-registry/src/{lib.rs,wasm.rs}`** — `certification_readiness_json(json,
  profile)` (profile arg) and the new `profile_applicability_json(profile)` /
  `registry_profile_applicability_json` WASM export.
- **`services/banzai-api/src/validate.js`** — the orchestrator reads the Rust applicability map, seals
  NOT_APPLICABLE steps without fetching, stamps `applicability` on every OperationReceipt, passes the
  profile to readiness, and excludes NOT_APPLICABLE steps from `overall_status` and `blocked_by`. The
  JourneyReceipt surfaces `applicability`, `not_applicable_steps`, and `required_steps_evaluated`.
- **Contracts** — `operation-receipt` and `journey-receipt` gain a top-level `applicability` enum
  (`REQUIRED` | `OPTIONAL` | `NOT_APPLICABLE`), and the state machine documents the
  `STEP_NOT_APPLICABLE_FOR_PROFILE` reason code.

## Alternatives considered

- **Keep running L2/L3 and re-label FAILED→NOT_APPLICABLE after the fact.** Rejected: it still contacts
  endpoints the implementation does not publish, and re-labelling a computed FAILED hides the real
  category error instead of fixing it.
- **Make the L2/L3 engines themselves profile-aware.** Rejected as the primary mechanism: those engines
  judge *artifacts*, not scope. Scope is a registry/profile concern and belongs in
  `banza-target-registry`, keeping each engine single-purpose. (They may still be profile-aware in
  future for OPTIONAL cases; this ADR does not require it.)
- **Drop the steps from the journey entirely for low profiles.** Rejected: the nine-step spine is
  canonical and the receipt set must be complete and auditable; a sealed NOT_APPLICABLE receipt is more
  honest and more reproducible than an absent step.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`conformance/report-schema.json`](../../conformance/report-schema.json)
