# ADR-065 — BANZA Technical Registry

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19D
- **Related:** ADR-064 (Conformance & Interoperability Certification model), ADR-066 (closed
  certification-state machine), ADR-059 (three-layer architecture — L2), ADR-060 (Banzami Operational
  Scheme — the L3 participant directory), ADR-061 (certification ≠ admission ≠ authorisation), ADR-038
  (open trust model without a central CA), ADR-039 (operator self-publication)

---

## Context

ADR-064 makes an L2 certification a concrete, hash-bound `CertificationRecord`. Those records need a
**public, verifiable place to live** so that anyone — an operator, an auditor, a regulator, BanzAI — can
answer "is this implementation certified, against what profile, in what scope, until when, and is it still
valid?" **without any BANZA account and without trusting any operator's word**. The protocol already has a
`public-protocol-registry` schema; L2 needs that generalised into the canonical **BANZA Technical Registry**
with a fixed, verifiable contract and a hard boundary from the L3 scheme's participant directory (ADR-060),
so that "listed in the technical registry" is never read as "admitted to a scheme" or "authorised".

## Decision

**The BANZA Technical Registry is the single public, append-mostly, root-verifiable index of L2 artifacts —
implementations, certification profiles, certification records and their revocations — verifiable by any
third party with no account, and strictly independent of any scheme's participant directory (L3).**

| ID | Decision |
|----|----------|
| **D-065-01** | **What the registry holds.** The Technical Registry indexes exactly the L2 objects of ADR-064: published `InteroperabilityCertificationProfile`s (by `profile_id`+`profile_version`+`profile_hash`), `CertificationRecord`s (by `record_id`+`record_hash`), and the **revocation list** (signed, dated). It holds no funds, no accounts, no personal data and no scheme membership — only technical certification facts. |
| **D-065-02** | **Public verification, no account.** Every registry entry is verifiable by any third party with **no BANZA account, no scheme membership and no privileged endpoint**: a reader re-runs the profile's public vectors against the implementation's artifacts and reproduces the record's evidence hashes, and checks the record against **root-signed protocol metadata** (ADR-038). There is no CA and no certificate chain. |
| **D-065-03** | **Registry ≠ scheme directory.** The Technical Registry (L2) is **independent of** the Banzami (or any) scheme's **participant directory** (L3). Presence in the registry means "this implementation holds this certification record" and **never** "this entity is admitted to a scheme" or "authorised by a regulator" (ADR-061 D-061-04/05, ADR-060 D-060-06). The two are separate artifacts with separate owners; neither is derivable from the other. |
| **D-065-04** | **Fail-closed reads.** A registry entry that is missing, unreadable, expired, suspended or revoked is reported as **not a valid certification**, never as valid (ADR-064 D-064-06, ADR-038 INV-OTE-005/006). A verifier that cannot reproduce a record's hashes MUST treat it as invalid, not trusted. |
| **D-065-05** | **Rust-owned, append-mostly, immutable records.** The registry is written only by the Rust engine after it validates a record (ADR-064 D-064-04); no human and no model writes, edits or removes an entry, and no configuration turns an invalid entry valid. A record is **immutable** once published; a change of standing is expressed as a **new** record or a **revocation** entry, never by mutating history (ADR-066). |
| **D-065-06** | **Neutral + operator-agnostic.** The registry lists implementations from **any** legally-eligible party on identical terms; it encodes no operator brand as a privileged entry, no reduced-profile path and no reserved slot (ADR-003, ADR-063). Banzami's own certified implementation, if any, appears through exactly the same public path as any other (ADR-063 conflict-of-interest controls). |
| **D-065-07** | **Baseline is empty and honest.** At v1.0 the production registry contains **no live certification records** and **no admitted participants**; the public state remains `production_certificates = false` and `/operators = []` until real, reproducible evidence exists. The registry never displays a placeholder or aspirational "certified"/"approved" entry. |

## Shape (canonical)

```
TechnicalRegistry
  registry_version · root_metadata_ref (root-signed)
  profiles[]     → InteroperabilityCertificationProfile refs (id·version·hash)
  records[]      → CertificationRecord refs (id·hash·state·issued_at·expires_at)
  revocations[]  → { record_id · reason_code · revoked_at · signature }  (signed, dated, fail-closed)
  verify: reproduce evidence hashes + check root-signed metadata — no account
```

## Boundary

- **L2 Technical Registry** (this) — technical certification facts, public, Rust-written, root-verifiable.
- **L3 scheme participant directory** (ADR-060) — who a *scheme* admits, under the scheme's own rules; a
  separate artifact, never implied by registry presence.
- **Regulatory authorisation** (ADR-062) — the regulator's determination; BANZA is not a party and the
  registry represents none of it.

## Consequences

**Positive.** One canonical, account-free, root-verifiable home for L2 facts; the certification ≠ admission ≠
authorisation separation is made structural (different artifacts, different owners); BanzAI can point to a
record and a reader can independently re-verify it.

**Negative (accepted).** Immutability + reproduce-to-trust means the registry cannot "just mark" something
certified — every entry must carry reproducible evidence. That is the point.

**Untouched.** No financial invariant; the open trust model (ADR-038/040), Rust-sole-authority (ADR-037) and
operator neutrality (ADR-003) all stand.

## Amendment (M2.19G.5C — naming parity)

- **Date:** 2026-08 · **Milestone:** M2.19G.5C
- **Decision:** Fix one canonical name per language for this public, read-only L2 surface: the canonical
  **Portuguese** term is **"Registo Técnico"** (formal "Registo Técnico BANZA"); the canonical **English**
  term is **"Technical Registry"**. PT-facing surfaces must not use the English string, and no active
  surface may present this L2 registry under "Public Protocol Registry" / "Registo Público de Protocolo" /
  "Registry Público" drift. Developer-facing code comments and the deliberate `en:` gloss fields may keep
  the English term; ADR titles remain English-canonical.
- **Source of truth:** the glossary mapping `Registo Técnico ↔ Technical Registry`
  (`website/app/glossario/page.tsx`). Enforced by `technical-registry-naming-parity-check`.
- **Excluded / immutable:** the whitepaper (`website/public/whitepaper/**`), invariants (e.g.
  `INV-FEDEVAL-008` "Public Protocol Registry anchor"), `docs/reports/**`, and this ADR's own English
  title are out of scope and unchanged.
- **Governance note:** the repo-canonicalization framing (this repo's `services/banzai-api` as the
  canonical runtime) is governed separately by ADR-071; this amendment covers naming only.

## References

- ADR-064 (certification model), ADR-066 (state machine), ADR-060 (scheme directory), ADR-061 (separation)
- `contracts/production/public-protocol-registry.production.schema.json` (generalised into the registry contract)
- `docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md`
