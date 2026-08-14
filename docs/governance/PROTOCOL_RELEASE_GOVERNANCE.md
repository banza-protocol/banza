# BANZA — Protocol Release Governance (M2)

> **M2 implementa o protocolo BANZA para produção enquanto protocolo aberto. M2 não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo financeiro aberto.** Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores independentes que implementam o protocolo.

This document governs how the **open protocol** is versioned, reviewed, signed and published. It governs the
release of a *specification* — contracts, conformance vectors, invariants, trust framework and governance docs —
not the operation of any financial service.

> **Protocol publication is not payment-service authorisation.**

Publishing a protocol release makes the specification available to operators. It does not authorise, licence,
admit, accept, approve, certify or activate any operator, does not process payments and does not move funds. Any
licence or authorisation belongs to the independent operator that provides real financial services using the
protocol.

## 1. Release states

A protocol release moves through exactly these states:

| State | Meaning |
|---|---|
| `DRAFT` | Change proposed; contracts/docs being written; not yet reviewable. |
| `REVIEW` | Under governed review (schema, conformance, boundary, evidence). |
| `RELEASE_CANDIDATE` | Review passed; frozen candidate; final governance decision pending. |
| `APPROVED_FOR_PROTOCOL_PUBLICATION` | Governance recorded the decision to publish the open protocol release. |
| `PUBLISHED` | Release published in this repository at a tagged version, signed under the trust framework (protocol-metadata delegated key, authority traced to the Trust Root through the Key Manifest). |

**Forbidden release states** — these must never exist in this process, because BANZA is not a payment service
and does not admit, approve, accept, certify or licence operators:

- `APPROVED_FOR_PAYMENTS`
- `APPROVED_FOR_OPERATION`
- `LICENSED`
- `CERTIFIED_OPERATOR`

Any attempt to introduce one of these states is a boundary failure and is rejected. Approving a protocol
*release* is an act on the protocol; it is never an approval, acceptance or certification of any operator.

## 2. Protocol versioning

BANZA follows semantic versioning for the protocol: `MAJOR.MINOR.PATCH` (current `VERSION` `1.0.0`, protocol
**v1.0**).

- **MAJOR** — a breaking change to a contract, invariant or wire format.
- **MINOR** — backward-compatible additions (new optional fields, new endpoints, new conformance vectors).
- **PATCH** — clarifications, security patches and non-breaking corrections.

The `VERSION` file and the contract `schema_version` fields are the source of truth. Every release is tagged.

## 3. Release candidates

A `RELEASE_CANDIDATE` is a **frozen** snapshot: no contract or vector may change while a candidate is open except
to fix a defect found in review, which returns the release to `REVIEW`. A candidate carries the full evidence set
(Section 8) and a reproducible build reference.

## 4. Changelog

Every release records a changelog entry: version, date, state, summary, the contracts/vectors/docs changed,
compatibility classification (MAJOR/MINOR/PATCH), and the recorded governance decision. Security patches note the
advisory reference. The changelog is append-only and auditable.

## 5. Compatibility policy

- MINOR and PATCH releases are backward-compatible: an operator implementing version *N* keeps working on *N.x*.
- Optional fields may be added in MINOR; required fields and semantics may change only in MAJOR.
- Conformance vectors added in a MINOR release are additive; existing vectors are not silently changed.
- A compatibility matrix records which protocol versions interoperate.

## 6. Deprecation policy

- A feature is marked `deprecated` in a MINOR release, with a documented replacement and a removal target.
- Deprecated features remain functional for at least one MAJOR cycle before removal.
- Removal happens only in a MAJOR release and is announced in the changelog and in the affected contracts.

## 7. Security patch policy

- Security fixes ship as PATCH releases where possible and are prioritised over feature work.
- A security advisory accompanies the release, referencing the risk register
  ([`../security/RISK_REGISTER.md`](../security/RISK_REGISTER.md)) and threat model
  ([`../security/THREAT_MODEL.md`](../security/THREAT_MODEL.md)).
- An open CRITICAL or HIGH risk blocks a release from reaching `APPROVED_FOR_PROTOCOL_PUBLICATION` (this mirrors
  the assurance gap in the M2 gate engine).

## 8. Breaking changes

A breaking change requires a MAJOR version bump, an ADR (or ADR amendment) recording the decision, a migration
note in the changelog, and updated conformance vectors. Breaking changes to a financial invariant
(`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`) additionally require
explicit justification: an invariant is never weakened for convenience.

## 9. Governance decisions

Publication requires a recorded governance decision on the **protocol** by the defined roles, with quorum:

- **Protocol maintainer** — prepares and freezes the release candidate.
- **Reviewer(s)** — verify schema, conformance, boundary and evidence.
- **Delegated release-key operation** — executes the signing of the approved release within its delegated scope; the decision to publish is recorded by the governance process (maintainer + reviewers), never by key custody. Signing implements the recorded decision — it never constitutes it.

The decision is a recorded governance act **on the protocol**. It is never an approval, acceptance,
certification or admission of any operator. The transition to `APPROVED_FOR_PROTOCOL_PUBLICATION` cannot be
automated. See [`OPEN_PROTOCOL_GOVERNANCE.md`](OPEN_PROTOCOL_GOVERNANCE.md) and
[`PROTOCOL_GOVERNANCE_ROLES.md`](PROTOCOL_GOVERNANCE_ROLES.md).

## 10. Required evidence before release

A release may not enter `APPROVED_FOR_PROTOCOL_PUBLICATION` without:

- Schema-valid `contracts/` artifacts and passing conformance vectors.
- The Evidence Bundle for the release ([`EVIDENCE_BUNDLE.md`](EVIDENCE_BUNDLE.md)) with integrity hashes.
- Assurance inputs with no open CRITICAL/HIGH risk
  ([`../security/ASSURANCE_READINESS.md`](../security/ASSURANCE_READINESS.md)).
- A clean regulatory-boundary confirmation (BANZA is an open protocol, not a PSP).
- The changelog entry and the compatibility classification.

## 11. Rollback policy

If a defect is found after `PUBLISHED`, governance may:

- Publish a PATCH superseding the defective release, and
- Mark the defective version `withdrawn` in the changelog with the reason.

Because publication is of a specification (not an operation), rollback is a documentation and re-tag action; no
funds and no operator state are involved. Consumers pin to a tagged version and move forward to the corrected one.

## 12. Artifact signing policy

- Published protocol artifacts and the release manifest are signed by the **protocol-metadata delegated key**
  under the trust framework ([`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md)) — never by the
  root directly.
- The Trust Root signs **only the Key Manifest**; the delegated keys sign protocol metadata and releases
  (protocol-metadata domain) and the Revocation List (revocation domain) — **never operators, payments or
  licences** (INV-ROOT-004/005; ADR-027). Signing here attests **artifact integrity and provenance of the
  protocol release**. It is not a certificate for any operator and not a payment-service authorisation.
- In M2 the signing keys and Trust Root ceremony are **planned and gated** (no real production key is generated
  in M2).

## 13. Publication process

1. Freeze the `RELEASE_CANDIDATE` with its evidence set.
2. Record the governance decision → `APPROVED_FOR_PROTOCOL_PUBLICATION`.
3. Tag the version, sign the release manifest with the protocol-metadata delegated key, and publish in this repository → `PUBLISHED`.
4. Update the changelog and compatibility matrix.

Publication makes the open protocol available to operators. **Protocol publication is not payment-service
authorisation.** Operators consume the published specification independently and carry their own regulatory and
licensing obligations.

## See also

- [`M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md`](M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md)
- [`PROTOCOL_PRODUCTION_STATE_MODEL.md`](PROTOCOL_PRODUCTION_STATE_MODEL.md)
- [`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md)
- [`OPEN_PROTOCOL_GOVERNANCE.md`](OPEN_PROTOCOL_GOVERNANCE.md)
- [`certification-boundary.md`](certification-boundary.md)

---

## Merge method

**Pull requests are integrated with a merge commit.** Squash and rebase are disabled at the repository
level, so the method is not a choice made per merge.

The reason is `main`'s readability as a record: a merge commit preserves the branch's commits and their
messages, which is where the reasoning for a change lives. A squash replaces them with one message, and
the reasoning has to be reconstructed from a diff.

This was established by practice — PRs #5 to #9 were all merge commits — and is written down because it
was broken once: **PR #10 was squash merged in error**. The history is not rewritten; the deviation is
recorded here, and the repository setting now prevents a repeat rather than relying on the person
running the merge to remember.
