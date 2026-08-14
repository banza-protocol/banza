# BANZA Language Policy

**Document ID:** BANZA-LANGUAGE-POLICY-001  
**Date:** 2026-06-01  
**Status:** Official  
**Authority:** ADR-001

---

## Policy Statement

**Portuguese is the canonical language of BANZA v1.0.**

English is the first official translation.

All other translations are derived from the Portuguese canonical.

---

## Rationale

Angola is the founding context of the BANZA protocol. The primary audience — operators, regulators, financial institutions, merchants, and developers — operates within Portuguese-speaking markets. The protocol's founding documents, regulatory context, and initial operator ecosystem are all rooted in Angola.

Protocol languages must serve protocol participants, not abstract universalism. Portuguese is the language of the ecosystem BANZA was designed for.

---

## Canonical Language: Portuguese (pt)

The following are **canonical in Portuguese**:

| Document | Canonical | Location |
|----------|-----------|---------|
| Protocol Reference | `docs/reference/pt/completa.md` | `/` (banza repo root) |
| BanzAI Reference | `BANZAI_REFERENCIA.md` | `/` (banzai repo root) |
| Protocol website | `https://banza.network` | Portuguese content |
| Terminology | `docs/reference/BANZA_TERMINOLOGY_PT.md` | Authoritative |

---

## Official Translation: English (en)

| Document | Translation | Location |
|----------|-------------|---------|
| Protocol Reference | `docs/reference/en/complete.md` | `/` (banza repo root) |
| BanzAI Reference | `BANZAI_REFERENCE.md` | `/` (banzai repo root) |
| Protocol website | `https://banza.network/en/*` | Future — Phase 7 |

The English translation is authoritative only for its own language. In any conflict of interpretation between the Portuguese canonical and the English translation, the Portuguese version prevails.

---

## Translation Governance

### Canonical document authority

The Portuguese canonical is updated first. English (and any future) translations follow.

No translation may alter:
- Protocol semantics
- Financial invariant definitions
- Certification level requirements
- Federation routing rules
- Authority hierarchy (BANZA → BanzAI → Operators)
- ADR or RFC references

### Terminology authority

All terminology decisions are governed by `docs/reference/BANZA_TERMINOLOGY_PT.md`. No translation may coin new protocol terms outside this document.

### Review process

Translation changes follow the same ADR/RFC review cycle as protocol changes. A translation error that changes protocol meaning requires an RFC to resolve.

---

## Conflict Resolution

When Portuguese canonical and English translation conflict:

1. The Portuguese version is authoritative.
2. The English translation must be corrected, not the Portuguese canonical.
3. If the conflict reveals an ambiguity in the Portuguese canonical, an RFC is required.

---

## Identifier Stability

The following identifiers are **language-invariant** and must not be translated:

- `trace_id`, `operator_id`, `issuer_key_id`, `certification_level`
- ADR numbers (ADR-001, ADR-025, etc.)
- RFC numbers (RFC-0001, etc.)
- Invariant codes (INV-LEDGER-001, INV-FEDEVAL-004, etc.)
- SDK package names (`@banza/sdk`, `banza-sdk`)
- API paths (`/.well-known/banza/certificate.json`, etc.)
- Field names in JSON contracts (`amount_minor`, `gross_minor`)
- Container names, infrastructure naming

---

## Technical Terms — Translation Decisions

Some terms have no Portuguese equivalent and are retained in their original form:

| Term | Decision | Reason |
|------|----------|--------|
| Trace ID | Kept as-is | Technical identifier — language-invariant |
| Webhook | Kept as-is | Industry standard term in pt-AO context |
| Sandbox | Kept as-is | Industry standard |
| QR | Kept as-is | Acronym — language-invariant |
| P2P | Kept as-is | Acronym |
| BRL (BANZA Revocation List) | Kept as-is | Identifier code — language-invariant |
| SDK | Kept as-is | Acronym |
| ADR | Kept as-is | Governance identifier |
| RFC | Kept as-is | Governance identifier |
| ed25519 | Kept as-is | Technical identifier |
| AOA | Kept as-is | ISO currency code |

---

## Future Languages

Additional languages may be added via the RFC process. Each new language requires:
1. A complete translation of `docs/reference/pt/completa.md`
2. A terminology freeze document for the new language
3. An RFC documenting the translation governance
4. A designated language maintainer

Candidate languages for future versions: French (West African markets), Spanish (global developer community), English is already v1.0 official translation.
