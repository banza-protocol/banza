# ADR-035 — Closed certification-state machine

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-034 (Conformance & Interoperability Certification model), ADR-036 (BANZA Technical
  Registry), ADR-043 (Rust-first engines), ADR-027 (open trust model — signed, dated, fail-closed
  revocation), ADR-004 (certification ≠ admission ≠ authorisation)

---

## Context

ADR-034 requires each `CertificationRecord` to carry a lifecycle — validity, expiration, renewal,
suspension, revocation and supersession — and ADR-034 D-064-06 fixes that it must be scoped, time-limited and
fail-closed. To be verifiable and non-gameable, that lifecycle must be a **closed, total, deterministic state
machine** decided only by the Rust engine: a fixed set of states, a fixed set of transitions, no state
outside the enum, and no path that turns a negative into a positive without fresh evidence.

## Decision

**A CertificationRecord's standing is a value of a closed, Rust-decided state enum with a fixed transition
table. States and transitions outside the table do not exist; no human, model or configuration may effect a
transition, and no transition ever manufactures validity without fresh, reproducible evidence.**

| ID | Decision |
|----|----------|
| **D-066-01** | **Closed state enum.** A record is in exactly one of: **`NOT_CERTIFIED`** (no valid record — the baseline and the fail-closed default), **`CERTIFIED`** (a valid record within its scope and validity window), **`EXPIRED`** (past `expires_at`), **`SUSPENDED`** (temporarily withdrawn, signed+dated), **`REVOKED`** (permanently withdrawn, signed+dated), **`SUPERSEDED`** (replaced by a newer record for the same implementation+profile line). The enum is **closed**: any value outside it is a bug, and an unreadable/unknown state resolves to `NOT_CERTIFIED` (fail-closed). |
| **D-066-02** | **Fixed transition table.** The only permitted transitions are: `NOT_CERTIFIED → CERTIFIED` (on a fresh, Rust-validated record); `CERTIFIED → EXPIRED` (clock reaches `expires_at`); `CERTIFIED → SUSPENDED` and `SUSPENDED → CERTIFIED` (signed suspend / lift, only while within the validity window and evidence still reproduces); `CERTIFIED|SUSPENDED|EXPIRED → REVOKED` (signed, dated, terminal); `CERTIFIED|EXPIRED → SUPERSEDED` (a newer record supersedes); and renewal = `EXPIRED|CERTIFIED → CERTIFIED` **only via a brand-new record** (new evidence, new window, new `record_hash`). Every other pair is forbidden. |
| **D-066-03** | **`REVOKED` is terminal; no resurrection.** From `REVOKED` there is no transition back to `CERTIFIED`. A revoked implementation may only become certified again through an entirely **new** record with fresh evidence — never by reinstating the revoked one (ADR-027 INV-OTE-006). |
| **D-066-04** | **Renewal is re-certification, never extension.** A validity window is never extended in place. "Renewal" is a new `CertificationRecord` produced by re-running the profile against the (possibly new) artifacts; the prior record moves to `SUPERSEDED` (or stays `EXPIRED`). This keeps every certificate an honest statement about the evidence that produced it (ADR-034 D-064-01/03). |
| **D-066-05** | **Fail-closed everywhere.** `NOT_CERTIFIED`, `EXPIRED`, `SUSPENDED`, `REVOKED` and `SUPERSEDED` all read as **not a valid certification**. Only `CERTIFIED`, within scope and window and with reproducible evidence, reads as valid. An expired or unreadable record is never treated as certified (ADR-034 D-064-06, ADR-036 D-065-04). |
| **D-066-06** | **Rust decides; no override.** All transitions are computed by the Rust certification engine from evidence, signatures and the clock. No human and no model (local Qwen) may effect, widen or reverse a transition; no configuration or flag turns `NOT_CERTIFIED`/`SUSPENDED`/`REVOKED` into `CERTIFIED` (ADR-043, ADR-027 INV-OTE-008). Suspension and revocation are signed and dated; the engine validates the signature before applying them. |
| **D-066-07** | **No status propagation.** A record's state governs only L2 certification. `CERTIFIED` is not admission and not authorisation; a state transition on L2 never triggers, implies or announces a determination on L3 (scheme admission) or with the regulator (ADR-004 D-061-06). |

## State diagram (textual)

```
                 (fresh Rust-validated record)
   NOT_CERTIFIED ───────────────► CERTIFIED ──(clock ≥ expires_at)──► EXPIRED
        ▲                          │   ▲  │                              │
        │ (fail-closed default)    │   │  │ (signed suspend / lift)      │ (new record)
        │                          │   └──┴─────► SUSPENDED              ▼
        │                          │                 │            SUPERSEDED
        │                          ▼                 ▼                 ▲
        └───────────────────  REVOKED ◄───(signed, dated; terminal)───┘
              (only a NEW record ever certifies again)
```

## Consequences

**Positive.** A total, closed, deterministic lifecycle that a third party can re-derive and that no human or
model can game; suspension/revocation/expiry/supersession are all first-class and fail-closed; renewal can
never silently extend a stale certificate.

**Negative (accepted).** Renewal-as-new-record means slightly more record churn than an in-place extension —
deliberate, so a certificate never outlives its evidence.

**Untouched.** No financial invariant; ADR-043 (Rust decides), ADR-027 (signed/dated/fail-closed revocation)
and ADR-004 (no propagation) all stand.

## References

- ADR-034 (certification model), ADR-036 (Technical Registry)
- `docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md`
