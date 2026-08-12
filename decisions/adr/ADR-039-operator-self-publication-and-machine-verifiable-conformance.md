# ADR-039 — Operator Self-Publication and Machine-Verifiable Conformance

- **Status:** Accepted
- **Date:** 2026-07
- **Companion:** ADR-038 — Open Protocol Trust and Participation Model (the trust evaluation itself)

## Context

BANZA is an open financial protocol. The canonical decision this ADR implements is:

> "BANZA é um protocolo financeiro aberto. A participação de operadores não depende de uma autoridade
> humana central, certificado emitido pela BANZA ou aprovação humana. Operadores independentes
> implementam o protocolo, publicam manifests, expõem endpoints compatíveis e produzem evidência
> verificável de conformidade. O trust do protocolo é baseado em signed protocol metadata, conformance
> evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed."

In English: BANZA is an open financial protocol. Operator participation does not depend on a central
human authority, on any artifact issued by BANZA, or on human approval. Independent operators implement
the protocol, publish manifests, expose compatible endpoints, and produce verifiable conformance
evidence. Protocol trust rests on signed protocol metadata, conformance evidence, the public protocol
registry, the trust root, delegated signing keys, and revocation/fail-closed.

This ADR governs the operator-publishing side of that decision — how an operator publishes and how
conformance is proven. The trust evaluation performed over what is published is the subject of the
companion ADR-038.

## Decision

**An operator implements the protocol, publishes its manifest, publishes its evidence bundle, and
conformance automation verifies it. No party accepts, approves or certifies an operator by central
human decision. The public protocol registry indexes verifiable metadata and evidence; it grants
nothing.**

### 1. The self-publication path

| # | Step | Who acts |
|---|---|---|
| 1 | Implements the Versioned Specifications, in any technology, satisfying the financial invariants | Operator |
| 2 | Publishes its Operator Manifest at an `operator_manifest_url` it controls | Operator |
| 3 | Runs the Conformance Automation against its own implementation, for the `protocol_version` it declares | Operator |
| 4 | Publishes the Evidence Bundle and the hashes that bind it | Operator |
| 5 | Exposes the protocol endpoints for the `capabilities` it declares | Operator |
| 6 | Verifies the published artifacts, independently and without permission | Anyone |
| 7 | Applies revocation/fail-closed to compromised trust material | Any verifier |
| 8 | Answers for its own legal, regulatory, financial and operational standing | Operator |

There is no submission, no queue, no counterparty to contact, no review, no admission and no decision
anywhere on this path. Steps 1–5 are acts of publication, performed unilaterally by the operator on
infrastructure it controls. Step 6 is performed by anyone, over public bytes. Nothing in this path is
granted, and therefore nothing in it can be withheld.

Operator A and Operator B follow the same path and are not ranked, ordered or distinguished by it. The
path is identical for the first operator and the hundredth.

### 2. What "machine-verifiable" means

Conformance is machine-verifiable when a program, given only published bytes, decides it. Concretely,
all five of the following hold:

| Property | What a verifier does | Fails when |
|---|---|---|
| **Schema validation** | Validates the manifest and the evidence bundle against the published JSON Schemas for the declared `protocol_version` | A required field is missing, mistyped, or a removed field is present |
| **Hash match** | Recomputes SHA-256 over the canonical bytes and compares against the published `manifest_hash`, `conformance_report_hash` and `evidence_bundle_hash` | A recomputed digest differs from its published value — the artifact is not the artifact that was attested |
| **Signature verification** | Verifies the operator's signatures against the `public_keys` in the manifest, and verifies `signed_protocol_metadata` through the delegated signing keys up to the trust root | A signature does not verify, or the chain to the trust root does not close |
| **Tool version pinning** | Reads `verified_by_tool_version`, `protocol_version` and `trust_root_version`, and re-runs the same pinned tool version against the same inputs | The pinned versions are absent, or the re-run yields a different `conformance_status` — the result is not reproducible and does not stand |
| **Independent reproducibility** | Performs all of the above without contacting BANZA, without an account, credential, permission or shared secret, and without any BANZA-operated service being available | The verdict cannot be reached from public artifacts alone |

Independent reproducibility is the load-bearing property, and it is a design constraint on everything
else: no input to conformance may be a value only BANZA can produce, and no step may be a call only
BANZA can answer. A verdict that requires BANZA to be reachable, willing or alive is a verdict about
BANZA. If the maintainers disappear, an independent third party must still reach the same
`conformance_status` from the same bytes — the survival criterion in
`docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` §9 is not rhetoric; it is this property.

**What machine-verifiable excludes.** Human judgment, discretion, review, reputation, merit, prestige,
brand, company size, tenure in the network, commercial importance, intent and legal standing are **not**
inputs to conformance. None is decidable by a program over published bytes. Any property that cannot be
so decided is not part of conformance and MUST NOT be introduced into it.

Conformance is therefore always: relative to a concrete `protocol_version`, scoped to the declared
`capabilities`, reproducible by any third party, re-evaluable at any moment, and never a permanent
status. It describes an implementation at a version. It is not a status conferred on an operator.

### 3. The Public Protocol Registry is an index

The registry indexes metadata and evidence that operators have **already published themselves**. It is
a verifiable index and a discovery aid. It is not a gate, not a whitelist, not a licence list, and not
a queue.

The registry's evidential weight is exactly zero on its own. Everything an entry asserts is a pointer to
signed artifacts that the verifier re-verifies for itself under §2. An entry that pointed to artifacts
that failed verification would be worthless, and a verifier that trusted an entry without verifying its
artifacts would be doing the one thing this architecture removes. Registry metadata is an input to the
trust evaluation as *data to be verified*, never as permission that has been granted.

This is why the index holds no power: **it is reproducible**. Anyone may crawl the same public manifests
and build the same index independently, and any verifier may bypass the registry entirely and verify an
operator directly from its `operator_manifest_url`. An index that any party can recompute, and that any
party can route around, cannot function as a gate no matter who publishes it.

It follows that:

- **A registry entry is NOT a licence.** Licences and authorisations are granted by the competent
  regulator to the operator. BANZA does not issue them, and an index of published bytes cannot.
- **A registry entry is NOT human approval.** No person reviews, accepts or approves an entry.
  Indexing is mechanical over artifacts that are already public.
- **A registry entry confers nothing.** It adds no capability, right, status or standing that the
  operator did not already have by publishing verifiable evidence.

### 4. Absence from the registry

**Absence from the registry means exactly one thing: no published verifiable evidence for that operator
is indexed. Nothing more.**

Absence MUST NOT be described, rendered or implemented as a regulatory prohibition. It is not a
sanction, not a denial, not a refusal, not a suspension, and not a statement that the operator may not
operate or is operating improperly. Nothing was requested, so nothing was denied. An operator may be
fully authorised by its competent regulator and absent from the registry; an operator may be indexed and
hold no authorisation from any regulator. The registry is silent on both, because it indexes protocol
evidence and has no standing to speak about authorisation.

Absence has ordinary causes that carry no adverse meaning: the operator has not published yet, has
published but is not yet indexed, publishes its evidence elsewhere, or has simply chosen not to be
indexed.

Absence does have one legitimate protocol consequence, and its scope is narrow. A verifier that finds no
verifiable evidence has, precisely, no evidence — so the evaluation does not produce a positive result,
and the verifier fails closed rather than assuming validity. That is a statement about **the evidence
available to the verifier**, not about the operator's legality, rights or conduct. Fail-closed is a
security posture, never a verdict about a person or a company.

Revocation is subject to the same boundary. It is a protocol **security** signal that withdraws
cryptographic trust from specific compromised material. It is never a regulatory sanction and never a
licence, and it does not remove, suspend or affect any authorisation the operator holds — an
authorisation that was never BANZA's to grant or withdraw.

### 5. The operator's own responsibility

Each independent operator is **solely and entirely responsible** for its own legal, regulatory,
financial and operational standing, including:

- **Authorisation from the competent regulator**, where required to provide financial services. It is
  granted by that regulator to the operator — never by BANZA.
- Legal constitution, capital, solvency and risk control.
- Custody and movement of funds, settlement, and the provision of financial services.
- KYC/KYB, AML/CFT, sanctions screening and data protection.
- Business continuity, incident response, and the relationship with its own end users.

The `regulatory_responsibility_statement` in the manifest is a declaration **by the operator, about the
operator**. BANZA does not validate it, does not endorse it, does not verify it and does not substitute
for it. It is machine-checked for presence and well-formedness only — its truth is the operator's
responsibility and the competent regulator's concern.

**BANZA's boundary is permanent.** BANZA is an open financial protocol. It does not authorise, certify,
accept or approve operators; does not issue licences; does not provide financial services; does not
intermediate, hold or move funds; and is not a payment service provider. Conformance evidence describes
what an implementation does. It never states that an operator is permitted to operate.

## Consequences

### Positive

- **Conformance survives its authors.** A verdict reproducible from public bytes by a pinned tool does
  not depend on BANZA being reachable, solvent, willing or extant. The protocol becomes independent of
  the team that wrote it — which `OPEN_PROTOCOL_GOVERNANCE.md` §9 sets as the criterion of success.
- **Verification is symmetric.** Any operator, counterparty, auditor, regulator or automated system runs
  exactly the same check with exactly the same inputs and reaches exactly the same result. No party has a
  privileged view, and no party can be asked for one.
- **The regulatory boundary becomes structural.** With nothing granted and nothing withheld, no protocol
  artifact can be mistaken for permission to operate, and absence cannot be mistaken for prohibition.
  Authorisation stays entirely with the competent regulator and the operator.
- **Participation stops being rivalrous.** Nobody queues, and no reviewer is a bottleneck, a single point
  of failure or a point of capture. Onboarding the hundredth operator costs what the second cost.
- **Discretion has nowhere to hide.** With human judgment excluded from conformance by construction, it
  cannot re-enter as an undocumented step.

### Negative (accepted)

- **Publication quality is the operator's problem.** An operator that publishes a malformed manifest or
  irreproducible evidence gets a failing result and no reviewer to appeal to. This is intended: the
  remedy is to fix the implementation and republish, which is mechanical and needs nobody's cooperation.
- **The protocol cannot express "trustworthy operator."** It can only express "this implementation, at
  this version, produced this evidence." Anyone wanting a judgment about an operator's soundness must
  look to the competent regulator or perform their own due diligence. This is a correct limit, not a
  gap to be closed later.
- **Reproducibility constrains the tooling.** Pinned tool versions, canonical byte encodings and stable
  hashing become permanent obligations of the Conformance Automation. Non-determinism anywhere in the
  runner is a protocol-level defect, not a test flake.
- **Bad-faith self-declaration is possible, and bounded.** An operator may publish claims that its
  evidence does not support. Because every claim is recomputable, the discrepancy is publicly detectable
  by anyone at any time. The protocol answers false claims with verification, not with a gatekeeper.

### Neutral

- The financial invariants (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`,
  `INV-QR-*`) are untouched. This ADR changes how conformance is proven and published, never what
  correctness means.
- Operator technology neutrality is untouched (ADR-001, ADR-037): an operator may implement the protocol
  in any technology.
- The trust root's scope is unchanged and remains strictly cryptographic: it signs only the Key Manifest that endorses the delegated signing keys;
  protocol metadata, releases and revocations are signed by those delegated keys, never by the root. It does not authorise operators or payments, does not
  create operators, does not issue licences and does not move funds.
- The evaluation performed over the artifacts this ADR governs — Public Registry metadata, signed
  protocol metadata, conformance evidence, manifest compatibility, trust root and delegated signature
  verification, and revocation/fail-closed — is defined by the companion ADR-038, not here.

See `docs/governance/OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md` for the operational flow and field
definitions, and `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` for the canonical governance decision.
