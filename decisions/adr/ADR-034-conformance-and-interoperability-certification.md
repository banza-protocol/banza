# ADR-034 — Conformance and interoperability certification

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-003 (three-layer institutional architecture — L2), ADR-004 (certification ≠ admission ≠
  authorisation), ADR-043 (Rust-first engines), ADR-027 (open trust model without a central CA), ADR-033
  (operator self-publication and machine-verifiable conformance), ADR-001 (protocol-first), ADR-039
  (conformance levels L0–L4)
  machine)

---

## Context

ADR-003 names **Layer 2 — BANZA Conformance & Interoperability Certification** and ADR-004 fixes what it *is*
(a per-implementation, evidence-based, **Rust-decided**, reproducible, hash-bound, scoped, time-limited
determination that is **not** a licence, **not** scheme admission and **not** regulatory authorisation). The
protocol already has the raw materials — the `conformance/` suites and vectors, the Rust `banza-conformance`
engine, the `conformance-report` / `conformance-evidence` production schemas, and the public protocol
registry — but no **canonical certification model** that binds them into a single object with an
identity, a profile, evidence, a verdict, a scope, a validity window and a lifecycle. Approaching v1.0, L2
needs that model so an operator, an auditor and BanzAI all reach the same answer to "is this implementation
certified, against what, on what evidence, until when, and who decided?".

The model must honour the permanent invariants: **Rust decides** (the local Qwen never certifies, ADR-043/059);
certification is of an **implementation**, never an entity (ADR-004 D-061-01); **no status propagation** to
admission or authorisation (ADR-004 D-061-06); and the whole determination is **reproducible by any third
party** from public vectors and root-signed metadata, with no BANZA CA (ADR-027).

## Decision

**BANZA Conformance & Interoperability Certification is a canonical, three-object, Rust-decided model — a
`CertifiedImplementation` measured against an `InteroperabilityCertificationProfile`, yielding a
`CertificationRecord` — published to the BANZA Technical Registry (ADR-036) and governed by a closed
certification-state machine (ADR-035). It certifies an implementation, never an entity, and confers no
status beyond "this implementation passed this profile at this version with this evidence".**

| ID | Decision |
|----|----------|
| **D-064-01** | **CertifiedImplementation — the subject.** The subject of certification is an **implementation**, identified by a stable implementation id plus the **content hash of the exact artifact set** that was tested (`implementation_hash`). It is never an entity, brand or operator. The declaring party (the implementer) MAY be recorded for contact/attribution, but the certificate is bound to the *artifact hash*, so a different build is a different subject and needs its own certification. |
| **D-064-02** | **InteroperabilityCertificationProfile — the yardstick.** A profile is a **public, versioned** document that names, for a given conformance level and capability set, the exact conformance suites, interoperability vectors and required capabilities an implementation must satisfy, each pinned by content hash. Profiles are immutable once published (a change is a new `profile_version`). The profile is derived only from L1 protocol contracts (ADR-003 D-059-01); it introduces no operator-specific criteria (ADR-001). |
| **D-064-03** | **CertificationRecord — the verdict.** A record binds a `CertifiedImplementation` to an `InteroperabilityCertificationProfile` and carries: the **evidence** (conformance report + evidence bundle, each hash-bound and reproducible), the **Rust-decided verdict**, the **scope** (which capabilities/levels the verdict covers — never broader than the evidence), a **validity window** (`issued_at` / `expires_at`), the certification **state** (ADR-035) and a **record hash** over the whole. A record asserts exactly "this implementation passed this profile version with this evidence, in this scope, until this date" — and nothing more (ADR-004 D-061-01). |
| **D-064-04** | **Rust decides; no human or model override.** The verdict is computed **only** by the Rust conformance/interoperability engine (`banza-conformance`) from the evidence against the profile. The local Qwen model explains a record but never issues, changes, widens or revokes one; no human and no configuration may convert a FAIL into a PASS or widen a scope (ADR-043, ADR-027 INV-OTE-008). Rust validates a record before it is published. |
| **D-064-05** | **Evidence-based, reproducible, hash-bound.** Every record is reproducible: a third party re-runs the **public** vectors of the pinned profile against the implementation's artifacts and MUST reproduce the report/evidence hashes; a result that does not reproduce is invalid (ADR-027 INV-OTE-004, ADR-033). No BANZA-issued artifact about an operator is an input to the verdict (ADR-027 INV-OTE-007). There is no CA signature and no certificate chain — trust is root-signed protocol metadata verified without any BANZA account. |
| **D-064-06** | **Scoped and time-limited; suspension/revocation.** A certificate is **never** open-ended: it covers only the levels/capabilities its evidence supports and expires at `expires_at`. It is subject to **suspension** (temporarily not-valid) and **revocation** (permanently withdrawn), each **signed, dated and fail-closed** — an unreadable, expired, suspended or revoked record is treated as *not certified*, never as certified (ADR-027 INV-OTE-005/006). The lifecycle is the closed state machine of ADR-035. |
| **D-064-07** | **Certification is not licence, admission or authorisation — no propagation.** A `CERTIFIED` record confers no status beyond the technical fact. It is **not** a licence, **not** admission to any scheme and **not** regulatory authorisation; certification never implies admission and admission never implies authorisation (ADR-004 D-061-04/05/06). No surface may present certification as an "approved/verified" badge that yields the next determination (ADR-004 D-061-07). The record is published to the L2 **Technical Registry**, which is independent of any scheme's participant directory and needs no account to verify (ADR-036). |

## Objects (canonical shape)

```
InteroperabilityCertificationProfile
  profile_id · profile_version · conformance_level (L0–L4) · capabilities[]
  suites[]      (id + content_hash)      ← from conformance/
  vectors[]     (id + content_hash)      ← from conformance/vectors/
  required_capabilities[] · derived_from (L1 contracts) · profile_hash · published_at

CertifiedImplementation
  implementation_id · implementation_hash (artifact set) · declared_by (attribution only)
  declared_capabilities[] · declared_conformance_level

CertificationRecord
  record_id · implementation (ref) · profile (ref, pinned version+hash)
  evidence { conformance_report_hash · evidence_bundle_hash }   ← reproducible
  verdict (Rust-decided) · scope { levels[] · capabilities[] }
  issued_at · expires_at · state (ADR-035) · record_hash
```

## Authority & boundary

- **The Rust engine decides.** `banza-conformance` computes the verdict from evidence against the profile;
  `banza-l2-readiness` gates publishability. Qwen explains a record once; it never decides (ADR-043/059).
- **BANZA is not a party to admission or authorisation.** L2 answers only the technical question. Admission
  is the scheme's determination (ADR-006/061); authorisation is the regulator's (ADR-005).

## Consequences

**Positive.** L2 has one canonical, reproducible, hash-bound certification object that any third party can
re-verify without a BANZA account, and BanzAI can explain a record precisely without over-claiming. The
Technical Registry (ADR-036) and the state machine (ADR-035) attach cleanly.

**Negative (accepted).** Binding a certificate to an `implementation_hash` means a new build needs a new
certificate. This is deliberate: it keeps a certificate an honest statement about *the artifact that was
actually tested*, not a standing endorsement of a party.

**Untouched.** No financial invariant. The open trust model (ADR-027/040), Rust-sole-authority (ADR-043),
operator neutrality (ADR-001), and the certification ≠ admission ≠ authorisation separation (ADR-004) all
stand; this ADR makes L2's object model concrete without weakening any of them.

## References

- ADR-036 (BANZA Technical Registry), ADR-035 (closed certification-state machine)
- ADR-003 (L2 in the three-layer architecture), ADR-004 (certification ≠ admission ≠ authorisation)
- `engines/banza-conformance`, `engines/banza-l2-readiness`, `conformance/`, `contracts/production/conformance-*.schema.json`
- `docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md` — the canonical L2 certification document
