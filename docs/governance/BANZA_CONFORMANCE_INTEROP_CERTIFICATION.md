# BANZA Conformance & Interoperability Certification (Layer 2)

> **Canonical L2 document.** This is the governing statement of BANZA's technical certification layer, fixed
> by **ADR-034** (certification model), **ADR-036** (Technical Registry) and **ADR-035** (closed
> certification-state machine), within the three-layer architecture of **ADR-003** and the separation of
> **ADR-004** (certification ≠ admission ≠ authorisation).

---

## What BANZA certification is

**A certificação BANZA é uma certificação técnica de uma implementação específica, limitada ao perfil,
versão, ambiente, capacidades, âmbito e validade indicados.**

Concretely, Layer 2 is a three-object, **Rust-decided** model:

- **`CertifiedImplementation`** — the subject, an *implementation* identified by the content hash of the
  exact artifact set tested (`implementation_hash`). Never an entity, brand or operator; a different build
  is a different subject (ADR-034 D-064-01).
- **`InteroperabilityCertificationProfile`** — the public, versioned yardstick: the conformance level,
  capabilities, required schemas/contracts/invariants/endpoints, identity/signature/trust requirements and
  the validity window, each pinned by hash and derived only from L1 protocol contracts (ADR-034 D-064-02).
- **`InteroperabilityCertificationRecord`** — the verdict: a `ConformanceReport` **and** an
  `InteroperabilityReport` (evidence, each reproducible and hash-bound), the Rust-decided
  `CertificationStatus` + `ReasonCode`, the scope (never broader than the evidence), the validity window
  and a `record_hash` over the whole (ADR-034 D-064-03).

The verdict is computed **only** by the Rust engine (`engines/banza-certification`) on verifiable evidence.
It is deterministic, idempotent, fail-closed, reproducible, and hash/profile/scope/environment-bound. The
local Qwen model explains a record; it never issues, changes, widens or revokes one. **No human and no
configuration may turn a FAIL into a PASS or widen a scope** (ADR-043, ADR-027 INV-OTE-008, ADR-034 D-064-04).

## What BANZA certification is NOT

**A certificação BANZA não constitui licença financeira, autorização regulatória, admissão automática num
scheme, aprovação comercial ou garantia institucional da entidade.**

- It is **not a licence** and **not regulatory authorisation** — that is granted by the competent regulator;
  BANZA is not a party to it and does not grant, hold, accelerate or substitute for it (ADR-004 D-061-03,
  ADR-005).
- It is **not scheme admission** — admission is a separate, later determination made by a scheme (e.g. the
  Banzami Operational Scheme, ADR-006) under its own rules; certification never implies admission, and
  admission never implies authorisation (ADR-004 D-061-04/05/06).
- Status **does not propagate** in any direction across certification, admission and authorisation; no
  surface presents them as a single "approved/verified" badge or a pipeline where one yields the next
  (ADR-004 D-061-07).

## Lifecycle (ADR-035)

A record's standing is a value of the **closed** state machine: `NOT_CERTIFIED` · `CERTIFIED` · `EXPIRED` ·
`SUSPENDED` · `REVOKED` · `SUPERSEDED`. The transition table is fixed; **`REVOKED` is terminal**; **renewal
is a brand-new record**, never an in-place extension; suspension and revocation are **signed, dated and
fail-closed**; and an expired, suspended, revoked, superseded or unverifiable record reads as **not a valid
certification** — never as certified (ADR-035 D-066-01..07).

## The BANZA Technical Registry (ADR-036)

Records are published to the **BANZA Technical Registry** — the public, root-verifiable index of L2 objects
(profiles, records, revocations). It is verifiable by any third party **with no BANZA account**: a reader
re-runs the profile's public vectors against the artifacts and reproduces the evidence hashes, and checks the
record against root-signed protocol metadata (there is no CA and no certificate chain). The Technical
Registry (L2) is **independent of** any scheme's participant directory (L3): presence in the registry means
"this implementation holds this certification record" and never "admitted" or "authorised". The registry
admits no participant and represents no regulatory authorisation. At v1.0 the production registry is empty
and honest: `production_certificates = false`, `/operators = []`.

## Verification & routes

Public verification is machine-readable and account-free. The Layer-2 routes are read-only on the public
edge and are exactly those of the OpenAPI contract
([`contracts/openapi/interoperability-certification.yaml`](../../contracts/openapi/interoperability-certification.yaml)):
`/interoperability-certifications`, `/interoperability-certifications/{record_id}`,
`/interoperability-certifications/{record_id}/verify`, `/technical-registry` and
`/technical-registry/{implementation_hash}`. While no certification records exist, the live served index is
`GET /operators` (the Technical Registry listing). The legacy `/certificates` route is **not** reintroduced
(ADR-037 / M2.19B).

## References

- ADR-034 (certification model), ADR-036 (Technical Registry), ADR-035 (state machine)
- ADR-003 (three-layer architecture), ADR-004 (certification ≠ admission ≠ authorisation), ADR-005
  (regulatory-state boundary), ADR-043 (Rust-first), ADR-027 (open trust model without a CA)
- `engines/banza-certification`, `contracts/production/certification-*.production.schema.json`, `conformance/`
