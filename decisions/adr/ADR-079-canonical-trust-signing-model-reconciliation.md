# ADR-079 — Canonical Trust Signing Model Reconciliation

- **Status:** Accepted
- **Date:** 2026-08
- **Completes:** ADR-038 (Open Protocol Trust Model Without CA), ADR-040 (Federation Trust Evaluation Without Certificates)
- **Relates:** ADR-058 (Trust Invariant Registry Realignment), ADR-061 (Certification / Admission / Authorisation Separation), ADR-057 (Current-Only Canonical ADR Tree)

## Context

BANZA's trust model has always been a chain: an offline **Trust Root** anchors a set of short-lived
**delegated signing keys**, and those delegated keys sign the day-to-day protocol artifacts. This is what
the deterministic trust engine (`engines/banza-trust`) actually implements, and what the critical
invariants `INV-ROOT-004`, `INV-ROOT-005`, `INV-OTE-001` and `INV-FEDEVAL-004` state.

A pre-existing contradiction had, however, spread across the canonical surface. One family of statements —
seeded by the second sentence of `INV-OTE-009` and copied into ADR-038 (D-038-04), ADR-040, both
`FEDERATION_TRUST_MODEL` documents, `BANZA_TRUST_ARCHITECTURE.md` §1, two production schemas,
`federation-trust.json`'s root block, and several diagram footnotes — asserted that **the Trust Root signs
protocol metadata, releases and the revocation list directly** ("Model B"). This contradicts the engine,
`INV-ROOT-004` ("the root signs only Key Manifests… never protocol metadata, conformance evidence, or
revocation lists directly"), `INV-ROOT-005` ("the BRL is signed by the designated revocation-domain
delegated key"), `revocation-list.json` ("NOT the root key"), and Reference §6.

Per the repository's authority order (`contracts/invariants.json` is the machine single-source-of-truth
and governs over prose where they disagree; accepted ADRs are the rule provenance; Rust is the sole
enforcement authority; `contracts/invariants.json:5-6`, `spec/README.md:57-61`, `ADR-058:63`), the engine
and the critical `INV-ROOT-*` invariants are the operative model. "Model B" is residue, not a decision.

This ADR fixes the canonical model as **Model A** and removes the residue from every canonical surface.
It **reverses no decision** of ADR-038 or ADR-040 — those ADRs already carry Model A in their own
evaluation flows (ADR-038 STEP 2 / STEP 6 / ":225 metadata only — never routine artifacts"; ADR-040 body).
It completes them by retiring the contradictory loose wording, in the manner ADR-058 completed ADR-038 by
removing the residue its decisions had left behind.

## Decision

| ID | Decision |
|---|---|
| **D-079-01** | The **Trust Root signs only the Key Manifest** (the root-signed metadata that lists and endorses the delegated signing keys). It signs nothing else directly. |
| **D-079-02** | The Trust Root **never signs, directly**, protocol metadata, protocol releases, the Revocation List (BRL), conformance evidence, receipts, or any statement about an operator's identity, status, eligibility or right to participate. |
| **D-079-03** | The **Key Manifest declares and authorises delegated signing keys within explicit domains**. The canonical domains are **`protocol-metadata`**, **`revocation`** and **`conformance-evidence`**. |
| **D-079-04** | **Domain separation is normative:** a delegated key may sign only artifacts belonging to its domain. A `revocation` key does not sign metadata; a `protocol-metadata` key does not sign evidence; a `conformance-evidence` key does not sign the BRL. |
| **D-079-05** | The **Revocation List (BRL) is signed by the `revocation`-domain delegated key**. The authority of that key is traced to the Trust Root **through the Key Manifest** — the root anchors revocation *indirectly*, and never signs the BRL itself. |
| **D-079-06** | Protocol metadata is signed by the `protocol-metadata`-domain delegated key; conformance evidence by the `conformance-evidence`-domain delegated key. Neither is signed by the root. |
| **D-079-07** | The delegated-key **domains are normative; key-id string formats are an operational naming convention** (e.g. `banza-{domain}-YYYYMM`). Where a schema enforces a name pattern, that is a deployment convenience, not a protocol conformance requirement (Reference §6). |
| **D-079-08** | Root custody: the **durable architectural invariant is threshold custody** (`INV-ROOT-007` — no single entity solely controls the root). A concrete N-of-M is **operational configuration**, normative only where a current decision declares it: the M2 bootstrap configuration approved 2026-06-19 is `dual_hsm_dual_keyholder` / 2-of-2, with 3-of-5 Shamir as the future target (`docs/governance/BANZA_ROOT_CUSTODY_DECISION_REQUIRED.md`, `BANZA_ROOT_CUSTODY_FUTURE_MIGRATION.md`). No specific N-of-M is a protocol invariant. |
| **D-079-09** | This reconciliation restates no new authority for the root. The Trust Root is **not a certificate authority over operators** (ADR-038); a valid trust result is **not** conformance, **not** BANZA Conformance & Interoperability Certification (Layer 2, ADR-061), **not** scheme admission (Layer 3), and **not** regulatory authorisation. These boundaries do not propagate. |

## Invariant impact

- **`INV-OTE-009`** — its second sentence (the Model-B "coverage" clause) is corrected in the registry to
  Model A. Its security intent (the root signs nothing about operators) is preserved verbatim. The ID,
  family, severity and source are unchanged. No invariant is added or removed; the `INV-OTE-*` and
  `INV-FEDEVAL-*` counts are unchanged (ADR-058 realignment intact).
- **`INV-ROOT-004` / `INV-ROOT-005` / `INV-OTE-001` / `INV-FEDEVAL-004`** — affirmed as the canonical
  statements of Model A. No change.
- **`INV-ROOT-007`** — affirmed. Custody is threshold custody; the concrete N-of-M is operational config.

## Consequences

**Reconciled to Model A on the canonical surface:** the registry (`INV-OTE-009`), ADR-038 (D-038-04,
INV-OTE-009 restatement, loose wording), ADR-040, `BANZA_TRUST_ARCHITECTURE.md` §1, both
`FEDERATION_TRUST_MODEL` documents, `contracts/federation/federation-trust.json`, the two production
trust schemas, the `key-manifest.json` example key-id, and the trust diagrams. A new guard,
`check-trust-signing-chain.sh`, protects the chain semantically and asserts registry↔ADR agreement on
`INV-OTE-009` / `INV-ROOT-004`. The `banza-trust` domain primitives gain positive/negative tests proving
the root signs the manifest, the revocation-domain key signs the BRL, and a root-signed BRL is rejected.

**No cryptographic material was created, rotated or re-emitted** (no root ceremony has been performed; all
artifacts are schemas, fixtures and demos). This ADR is normative and documentary.

**Deliberately left for a separate operational-config alignment** (tracked; not a normative contradiction):
the concrete 2-of-3 values still present in the ceremony engine constants
(`engines/banza-root-ceremony`), the production custodian-enum schema, and the trust test fixtures must be
aligned to the approved 2-of-2 when the M2 ceremony is prepared; the divergent delegated-key scope enums
across `contracts/production/*` should be reconciled to the canonical three domains; and the legacy
`certification`-domain / `banza-cert-` shapes in the L3/L4 readiness *test fixtures* are implementation-only
residue. These are configuration/implementation items, out of scope for this normative reconciliation.

## Regra global

A trust chain must read the same way in the contract, the engine, the invariant registry, the ADRs, the
architecture documents, the tests and the Reference: **Trust Root → Key Manifest → delegated key by domain
→ signed artifact → verification.** If a surface tells a different story, the model is not yet reconciled.
