# ADR-057 — Technical Interoperability Certification (without CA or discretionary operator approval)

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19
- **Amends:** ADR-040 (Federation Trust Evaluation Without Certificates) — adds a deterministic,
  evidence-based *technical-interoperability certification record* for a concrete implementation,
  still without a CA and without any operator/entity certificate
- **Preserves:** ADR-038 (Open Protocol Trust Model Without CA), ADR-039 (Operator Self-Publication and
  Machine-Verifiable Conformance), ADR-037 (Rust-first official engines), ADR-021 (conformance
  level/capability alignment). The CA parts of ADR-022/026/027 stay removed.
- **Requires:** RFC-0007 (public supersession of the ADR-040 "no certificate-adjacent term" decision,
  as mandated by ADR-040 §"reintroduction requires a public RFC")
- **Related:** ADR-032 / ADR-041 / ADR-044 / ADR-054 (BanzAI/Qwen are never in the decision path —
  cited here as the guarantee that certification is engine-computed, not model-decided),
  ADR-031 (canonical verification routes & pre-production), ADR-002 (ecosystem naming),
  ADR-001 (open protocol)

---

## Context

BANZA removed the certificate authority (ADR-038), moved operators to self-publication with
machine-verifiable conformance (ADR-039), and replaced operator certificates with an evidence-based,
re-derivable federation *trust evaluation* (ADR-040). Those decisions were correct and remain in force:
there is **no BANZA CA**, **no discretionary or human operator approval**, and a conformance PASS is
**verifiable technical evidence, not a licence**.

That architecture produced everything needed to state a stronger, still-safe fact that the protocol did
not previously name: given an operator's signed manifest, a conformance PASS bound to a specific level,
a signed evidence bundle, a trust evaluation and a revocation check, **a Rust engine can deterministically
decide whether a concrete implementation demonstrated conformance to a public, versioned interoperability
profile** — and can emit a signed, re-derivable, time-bounded, revocable record of that fact.

The gap this ADR closes is terminological and architectural at once:

- **Terminological.** The corpus asserts an *absolute* "BANZA nunca certifica". That absolute is stronger
  than the invariant it was meant to protect (no CA, no financial licence, no discretionary approval) and
  it makes the protocol unable to name the exact machine-checkable fact above. Operators and integrators
  read "no certification" as "no verifiable interoperability guarantee at all", which is false.
- **Architectural.** The evidence existed but was never assembled into a single, named, signed
  *certification record* with an explicit scope, profile, version and validity window. Trust and evidence
  were shown; certification was not.

M2.19 introduces **Technical Interoperability Certification** and aligns every surface to it.

## Decision

**BANZA technically certifies that a concrete implementation demonstrated conformance with a public,
versioned interoperability profile.** The certification is determined by verifiable Rust engines, from
public, reproducible, time-bounded evidence, and is subject to suspension or revocation. It does **not**
constitute a financial licence, regulatory authorisation, commercial approval or institutional guarantee
of the operator.

BANZA certifies **a concrete implementation** — bound to: an identified operator; a specific
implementation and environment; a specific interoperability profile; a specific protocol version; an
explicit capability scope; an exact set of evidence (manifest, conformance report, evidence bundle,
trust evaluation, signed protocol metadata, revocation state); and a determined validity window.

BANZA does **not** certify, generically: the company in all respects; financial solvency; commercial
fitness; total organisational security; a licence to move funds; authorisation to provide financial
services; or regulatory conformance before the BNA or any other authority.

The public label always carries its technical scope. Preferred forms: *Implementação certificada para
interoperabilidade BANZA v1.0*; *Certificação Técnica de Interoperabilidade BANZA v1.0*; *Certificação de
interoperabilidade activa*; *Conformidade técnica certificada para o perfil BANZA v1.0*. Never the bare
`operador certificado` / `certificado` / `certificação BANZA` without the interoperability-technical
qualifier.

### Removed (stays removed) vs New (introduced by this ADR)

| Concept | Status |
|---|---|
| BANZA CA / `certificate authority` / X.509 as a governance mechanism | **Removed — stays removed** (ADR-038) |
| Discretionary or human, case-by-case operator approval; a committee that selects operators | **Removed — stays removed** (ADR-038/039) |
| Operator/entity certificate; "certified operator" as a status of the *company* | **Removed — stays removed** (ADR-040) |
| Financial licence / regulatory authorisation / commercial approval / institutional guarantee | **Never granted by BANZA** |
| Qwen (or any model) deciding, altering or granting certification | **Forbidden** (ADR-032/041/044/054) |
| Conformance PASS as a stand-alone claim | Still just **verifiable evidence, not a licence** |
| Deterministic technical certification that a **concrete implementation** conformed to a **public, versioned interoperability profile** | **New — active** |
| Signed, re-derivable, time-bounded, revocable **Interoperability Certification Record** | **New — active** |
| Public, versioned **Interoperability Certification Profile** | **New — active** |

The signature on a certification record confirms **integrity, provenance, version and status** of that
record. It does **not** turn BANZA into a regulatory authority or a CA, and it confers no status on the
operator beyond the technical fact stated in the record.

### Separation of responsibilities

- **Protocol Governance** defines interoperability profiles, versions requirements, publishes schemas,
  reason codes and the validity/suspension/revocation rules, and manages the signed protocol metadata and
  the technical-correction/contestation process. It does **not** approve companies manually.
- **Rust engines** are the **sole decision authority**: they validate manifest, schemas, signatures,
  identity, evidence bundle, invariants, endpoints/contracts, version compatibility, trust and revocation;
  compute the scope and the certification status; produce the Certification Record; and **refuse
  certification when any mandatory requirement is missing** (fail-closed).
- **BanzAI** guides, explains, prepares, simulates, locates sources, explains reason codes and *presents*
  the engine result. It **never** grants, alters, ignores failures in, or substitutes for the engine, and
  it never decides through Qwen. Public formulation: *"O BanzAI orienta e explica. A certificação é
  determinada pelos motores verificáveis do protocolo."*
- **The operator** implements the protocol, publishes the manifest, manages identity/keys, exposes
  endpoints, produces and renews evidence, fixes failures, and meets its own legal/regulatory obligations.
- **The regulator** licenses and authorises. BANZA does not.

### Certified object, profile, record, lifecycle, engine

- **`CertifiedImplementation`** — the certified object is an *implementation*, never a bare `operator_id`.
  The same operator may hold independent certifications for production and sandbox, for different versions
  and different capabilities, each with its own status. A certification of one implementation is never
  automatically applied to another.
- **`InteroperabilityCertificationProfile`** — a public, versioned artefact (schema:
  `contracts/production/interoperability-certification-profile.production.schema.json`; well-known:
  `/.well-known/banza/interoperability-certification-profile.json`) defining profile/protocol/profile
  version, environment, capabilities, mandatory and conditional requirements, applicable schemas,
  invariants, contracts, tests, endpoint/identity/signature/trust/revocation requirements, validity
  limits, reason codes, and renewal/suspension/revocation policy. It **references** the canonical
  conformance levels (ADR-021), the Open Trust Evaluation (ADR-038/040) and the Evidence Bundle
  (ADR-039) rather than re-defining them.
- **`InteroperabilityCertificationRecord`** — the machine artefact (schema:
  `contracts/production/interoperability-certification-record.production.schema.json`). Public name:
  *Registo de Certificação de Interoperabilidade*. **Not** a "digital certificate" and **not** an X.509
  certificate. It binds certification/operator/implementation/environment/profile ids, profile & protocol
  versions, status, scope, capabilities, timestamps (issued/valid_from/expires_at/evaluated_at), engine
  version, the input hashes (manifest, evidence bundle, conformance report, trust evaluation, protocol
  metadata), applicable reason codes, limitations, suspension/revocation references, `supersedes`, the
  public verification URL, the signature and the signing key id.
- **Lifecycle (closed enum, Rust):** `NOT_EVALUATED`, `EVIDENCE_INCOMPLETE`, `PENDING_EVALUATION`,
  `EVALUATION_FAILED`, `CERTIFIED`, `CERTIFIED_WITH_SCOPE`, `EXPIRED`, `SUSPENDED`, `REVOKED`,
  `SUPERSEDED`, `INCOMPATIBLE_PROFILE`. A failed **mandatory** requirement yields `EVALUATION_FAILED`,
  never a silent partial certification. `CERTIFIED_WITH_SCOPE` may only narrow to explicitly-certified
  capabilities under a profile that permits partial scope — never to hide a failed mandatory requirement.
  An expired/suspended/revoked record is never presented as active.
- **Engine:** `engines/banza-interoperability-certification` (Rust, ADR-037) is the single certification
  authority. It consumes the Operator Manifest, Signed Protocol Metadata, Evidence Bundle, Conformance
  Report, Trust Evaluation, Revocation State, the Certification Profile and the active protocol version;
  runs the fixed pipeline (validate inputs → versions → integrity → schemas → signatures → identity →
  requirements → invariants → trust → revocation → temporal validity → scope → status → reason codes →
  record → sign → publish); and is **deterministic, idempotent, reproducible, fail-closed, offline-
  testable, checksum-bound, with zero Qwen and zero unauthorised external calls**. Two runs on the same
  inputs produce the same result save for explicitly-controlled temporal fields. It **reuses**
  `engines/banza-trust` for canonical JSON / SHA-256 / ed25519 signing and verification — it does not
  reimplement them.

### Validity, renewal, suspension, revocation, independent verification

A certification has a start, an expiry, a profile version, a scope and the input hashes. A **new
evaluation** is required when the certification expires or when the manifest, keys, endpoints, evidence
bundle, implementation, profile version or protocol (incompatibly) change. **Suspension** and
**revocation** are permitted only by a public rule with a reason code, timestamp, reference and
signature, and revocation propagates in the registry, updates the trust status and makes any active
certified state unpresentable. An **expired** certification is never shown as valid. Any third party can
verify a record — signature, key id, profile, version, validity, hashes, evidence, revocation state,
reason codes and registry entry — **without authentication**, via the canonical routes
(`/interoperability-certifications`, `/interoperability-certifications/{id}`,
`/operators/{operator_id}/implementations/{implementation_id}/certification`, and the well-known profile).

### Registry & Operador Zero

The registry distinguishes: published operator; published implementation; implementation under
evaluation; certified implementation; expired/suspended/revoked certification; demonstration environment.
**Operador Zero is a demonstration environment**: it is never a published operator, never a certified
implementation, and is never counted in certification metrics. Public metrics: published operators,
published implementations, active interoperability certifications, evaluations in progress, expired
certifications, suspended/revoked certifications, demonstration environments.

## Invariants

Registered in `contracts/invariants.json` (family `ICERT`), extending — never contradicting — INV-OTE-*
(ADR-038) and INV-FEDEVAL-* (ADR-040):

- **INV-ICERT-001** — Certification is computed only by the Rust certification engine; no model, human or
  external service participates in the decision. (fail-closed)
- **INV-ICERT-002** — A missing or failing mandatory profile requirement MUST yield `EVALUATION_FAILED`;
  a partial/scoped certification MUST NOT mask a failed mandatory requirement.
- **INV-ICERT-003** — Every certification record MUST bind profile id, profile version, protocol version,
  capability scope, engine version and the input hashes; a record without them is invalid.
- **INV-ICERT-004** — Certification is time-bounded; an expired, suspended or revoked record MUST NOT be
  presented as an active certification.
- **INV-ICERT-005** — Certification is per implementation; a record for one implementation MUST NOT apply
  to another implementation, environment or version.
- **INV-ICERT-006** — Certification does not reintroduce a CA, a discretionary approval, an operator/entity
  certificate, or any financial/regulatory authorisation; the record's signature attests integrity,
  provenance, version and status only.
- **INV-ICERT-007** — Given identical inputs the engine produces an identical record save for explicitly
  controlled temporal fields (idempotent, reproducible, checksum-bound).
- **INV-ICERT-008** — Operador Zero (and any demonstration environment) is never counted as a published
  operator or a certified implementation and never appears in certification metrics.

## Consequences

- The public surface gains a truthful, verifiable interoperability-certification story ("uma
  certificação, múltiplas integrações") without granting any financial/regulatory status.
- The absolute "BANZA nunca certifica" framing is replaced by the qualified split above. The
  BanzAI/Qwen "não certifica" statements are **kept** (the agent still never decides). The footer moves
  from "não certifica operadores" to "não licencia nem autoriza operadores; certifica tecnicamente
  implementações para interoperabilidade com perfis públicos".
- Until the engine, schemas, record, registry, APIs, reason codes, revocation and guards are green and
  the docs aligned, the public surface shows *pré-produção* and **0 active certifications** — it never
  claims a live certification exists (M2.19 launch gate).
- New guards enforce this architecture; the guards that asserted the absolute stance are rewritten to the
  qualified stance. Historical/superseded records are preserved and marked, not rewritten.
