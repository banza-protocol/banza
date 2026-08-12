# CLAUDE_BASE — Banza Ecosystem Operating Rules

**Version:** 1.0  
**Date:** 2026-05-30  
**Authority:** ADR-002 (Ecosystem Naming Inversion, 2026-05-29)  
**Applies to:** ~/banza (this monorepo — BANZA protocol + the consolidated BanzAI runtime services/banzai-api + engines/banzai-*, ADR-075) · the reference operator repository

This document contains rules shared across all repositories in the `banza-protocol` ecosystem. Every repository-specific CLAUDE.md must be read in conjunction with this base.

---

## Canonical Ecosystem Identity (BINDING — never invert)

```
BANZA
= Open Financial Protocol
= The rules, contracts, certification, federation, and trust model
= Exists independently of any operator

BanzAI
= Native Protocol Agent
= Knowledge and conformance guidance layer for the protocol
= Serves the BANZA ecosystem — not an independent product
= NOT a the reference operator product

the reference operator
= Reference operator
= First commercial implementation built on BANZA
= One operator among many possible operators
= NOT the protocol
= NOT the infrastructure
= NOT the ecosystem
```

### Forbidden assumptions (across all repositories)

The following are architectural errors. Never generate content that implies them:

| Assumption | Why it is wrong |
|---|---|
| "the reference operator is the protocol" | the reference operator is one operator. BANZA is the protocol. |
| "BANZA infrastructure" | Infrastructure belongs to BANZA. |
| "BANZA ecosystem" | The ecosystem is BANZA's. the reference operator participates in it. |
| "BANZA protocol core" | BANZA is the protocol. There is no protocol core — operators implement freely. |
| "BanzAI belongs to operador" | BanzAI is the Native Protocol Agent. It serves BANZA, not any operator. |
| "BANZA is a product" | BANZA is an open protocol specification. |
| "BANZA is a company" | BANZA is an open infrastructure. No single entity controls it. |
| "The protocol dies with BANZA" | The protocol exists independently of any operator. |

---

## Naming Rules

### "BANZA" — use when referring to:
- The Open Financial Protocol
- Protocol specifications and contracts
- The conformance framework and the Trust Root (offline, threshold custody)
- The federation model and trust model
- ADRs and RFCs governing the protocol
- "Built on BANZA" / "powered by the BANZA protocol"

### "the reference operator" — use when referring to:
- The reference operator product
- Consumer wallets and the operator app
- The merchant dashboard and QR infrastructure
- `banza.network` and all operator-facing services
- The commercial entity behind the reference implementation
- "the reference operator is built on BANZA"

### "BanzAI" — use when referring to:
- The Native Protocol Agent
- Conformance and certification tooling
- RAG-based protocol intelligence
- ADR navigation and operator onboarding tools
- Lives at `banza.network/banzai`

### Protected names (ADR-002)
- `@banza` — identity namespace, permanent
- `banza.network` — canonical domain
- `contact@banza.network`, `security@banza.network` — canonical emails

---

## Commit Standards

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `infra`, `validation`, `security`

- Never add `Co-Authored-By: Claude` attribution to commits
- Never bump version numbers in document headers (keep Version: 1.0)
- Commit per logical unit — not one large commit at the end
- Always push to `origin/main` after committing — changes are not done until in production

---

## Documentation Standards

### ADRs
Every major technical decision MUST create an ADR at `decisions/adr/`:
```
ADR-NNN-short-title.md
```
Each ADR MUST include: context, decision, rationale, alternatives, consequences, tradeoffs.

### Domain documentation
Every domain MUST have `docs/domains/<domain-name>/` explaining:
- business purpose, architecture, flows, invariants, failure scenarios, reconciliation logic, security assumptions.

### README rules
README files must remain synchronized with implementation reality. Outdated documentation is a defect.

### Documentation completeness
If documentation is missing, the task is NOT complete.

---

## Security Standards

- Secrets NEVER in repositories, logs, screenshots, or documentation examples
- TLS everywhere. Authentication and authorization on all services
- Audit logging on all financial operations
- Secret key: server SDK only. Publishable key: client SDK only
- No force push to main/master without explicit user instruction
- No `--no-verify` hook bypass without explicit user instruction

---

## Testing Standards

All financial operations require:
- unit tests
- integration tests (real database — no mocks for financial invariant tests)
- financial invariant tests
- idempotency tests

Critical flows additionally require:
- reconciliation tests
- concurrency tests

---

## Financial Correctness (applies wherever money moves)

Double-entry accounting is mandatory. Every monetary movement must be:
- auditable, immutable, traceable, reproducible, reconcilable

INVALID: `wallet.balance -= amount`  
VALID: `Customer Wallet -1000 Kz / Merchant Pending +1000 Kz` (ledger entry pair)

All money movement MUST go through: double-entry accounting + atomic transactions + immutable ledger events.

Floating-point arithmetic is FORBIDDEN for money. Use integer minor units.

---

## Protocol Terminology

| Term | Meaning |
|---|---|
| Open Financial Protocol | BANZA — the public rules, contracts, and conformance framework |
| Operator | Any entity that builds an implementation on BANZA |
| Conformant operator | An operator with verifiable conformance evidence published for the tested level (self-published; not certified or approved by anyone) |
| Reference operator | The canonical first operator implementation built on BANZA |
| Federation | Multiple independent operators interoperating under the BANZA trust model |
| Conformance | The process of verifying operator compliance with the protocol specification |
| Invariant | A financial rule that must hold in all states (INV-LEDGER-*, INV-WALLET-*, etc.) |
| Native Protocol Agent | BanzAI — knowledge, guidance, and conformance tooling for operators |
| Trust Root | The offline threshold-custody root that signs only the Key Manifest; delegated keys sign protocol metadata, releases and revocation lists within their domains — never operators, payments or licences |

---

## Audit Methodology

When auditing naming, content, or code for ADR-002 compliance, classify findings as:

- **FALSE** — factually incorrect under ADR-002 (e.g., "the reference operator is the protocol")
- **MISLEADING** — creates wrong impression (e.g., "BANZA ecosystem")
- **OUTDATED** — was correct pre-ADR-002, not yet updated
- **CONTEXTUAL** — ambiguous, depends on interpretation
- **CORRECT** — correctly applied
- **PROTECTED** — intentionally preserved per ADR-002 (emails, domains, crate names)

---

*This base document is the single source of shared Claude operating rules for the banza-protocol ecosystem.*  
*Repository-specific CLAUDE.md files extend this base with their own responsibilities and guardrails.*
