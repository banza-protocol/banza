# BANZA — Open Financial Protocol

> **I am working on the Open Financial Protocol.**  
> The protocol exists independently of any operator.

---

## Ecosystem Identity (ADR-002)

```
BANZA    = Open Financial Protocol        ← THIS REPO
BanzAI   = Protocol Knowledge System      ← consolidated in THIS repo (services/banzai-api + engines/banzai-*, ADR-042)
the reference operator  = Reference operator implementation            ~/banza
```

Read the shared operating rules first: [docs/governance/CLAUDE_BASE.md](docs/governance/CLAUDE_BASE.md)

---

## This Repository's Purpose

`~/banza` is the **open protocol specification**. It defines the rules that all operators must follow. It does not implement any specific operator's product. It is not the reference operator. It is not a wallet app. It is the protocol specification beneath all operators.

**The protocol exists independently of any operator.**  
If the reference operator ceases operations, the BANZA protocol — its specifications, contracts, reference implementations, conformance suite, and certification framework — remains fully available to all operators.

---

## Responsibilities of This Repository

| Area | Description |
|---|---|
| `contracts/` | Canonical protocol contracts — OpenAPI specs, webhook schemas, QR payload spec, event contracts |
| `conformance/` | Conformance suite — certification test vectors for operator compliance |
| `examples/` | Illustrative examples for operators (conceptual only — no SDKs or production code) |
| `decisions/adr/` | Architecture Decision Records governing the protocol |
| `docs/governance/` | Shared operating rules (CLAUDE_BASE.md) |
| `spec/federation/` | Federation protocol documentation |
| `docs/governance/` | PKI trust model documentation |
| `website/` | Protocol website (Next.js) and the `/banzai` public interface |
| `services/banzai-api` | Canonical BanzAI runtime — TypeScript service/glue over the Rust engines (ADR-042) |
| `engines/banzai-*` | BanzAI Rust engines (query-core, api-kb, indexers), compiled to WASM — the deterministic core |

---

## Protocol-Specific Guardrails

**Never introduce product logic into protocol specifications.**

Protocol specifications define rules (what is correct), not operator experiences (how a product looks). If a change is specific to how the reference operator's app works, it belongs in `~/banza`, not here.

**Never make the protocol dependent on a single operator.**

All protocol contracts, invariants, and certification criteria must be operator-agnostic. No operator name (including the reference operator) should appear in protocol specifications as a hard dependency.

**Never weaken a financial invariant for convenience.**

The financial invariants are the protocol's integrity guarantees:
- `INV-LEDGER-*` — double-entry, immutability, precision, atomicity
- `INV-WALLET-*` — no negative balance, ledger-derived balances
- `INV-SETTLE-*` — settlement amount identity, ledger correctness
- `INV-IDEM-*` — replay safety, idempotency key scope
- `INV-RECON-*` — posting linkage, external reconcilability
- `INV-QR-*` — unique resolution, single-use dynamic, expiry enforcement

**Protocol specs ship before operator implementations.**

No operator implementation may reference a feature that has not first been specified in `contracts/`. No feature may exist only in prose documentation (`docs/`) once implementation begins — it must have a corresponding artifact in `contracts/`.

> **Regra absoluta:**
> qualquer conceito financeiro/protocolar novo nasce primeiro no BANZA Protocol, depois é implementado pelo operador de referência, depois exposto no SDK, e só depois usado nas apps.

(See ADR-001 — Protocol-first product development. This protocol repository is
operator-neutral: the rule names the operator *role*, not any operator brand —
the reference operator's own CLAUDE.md states the same rule naming itself.)

---

## Protocol Implementation Guidance (Technology-Neutral for Operators)

The BANZA protocol does not prescribe implementation technology **for operators**. Operators may use any language, database, or runtime that satisfies the protocol invariants. The following requirements apply regardless of technology:

- Monetary values: integer arithmetic, no floating point (e.g., minor units of AOA)
- Ledger writes: synchronous and atomic at the posting step
- Double-entry: mandatory — every debit has a corresponding credit
- Wallet balances: always ledger-derived — never updated directly
- Every financial operation: idempotent (replay-safe via idempotency key)

## Official Engine Implementation (Rust-first — ADR-043)

Operator neutrality above is permanent. It is **orthogonal** to the language of the project's own
**official** implementations. Per **ADR-043**, every official BANZA/BanzAI **engine** — conformance,
crypto/trust/BRL, invariant checking, BanzAI retrieval/scoring/guards/evals, provider routing,
semantic validation, evidence-bundle generation — is **Rust**. TypeScript is UI/glue only; Python is
temporary legacy/compat; Bash orchestrates. New non-Rust engines are blocked by
`engines/rust-rule-guard` (`make rust-rule-check`, the `Rust Rule Guard` CI job). Legacy is tracked in
`docs/governance/rust-first-legacy-allowlist.json` and migrated in phases R2–R6. See
[docs/governance/RUST_FIRST_IMPLEMENTATION_POLICY.md](docs/governance/RUST_FIRST_IMPLEMENTATION_POLICY.md).

---

## ADR Reference

| ADR | Subject |
|---|---|
| ADR-011 | Double-entry ledger |
| ADR-024 | Idempotency and rate limiting |
| ADR-016 | QR payment system |
| ADR-017 | Payment links |
| ADR-012 | Account/participant identity model |
| ADR-001 | Open financial protocol — implementation independence |
| ADR-001 | Operator separation |
| ADR-011 | Double-entry invariant enforcement |
| ADR-002 | Ecosystem naming inversion (canonical) |
| ADR-043 | Rust-first policy for official BANZA/BanzAI engines |

---

## Validation Governance

The the reference operator implementation matrix lives in `~/banza/docs/validation/BANZA_IMPLEMENTATION_MATRIX.json` (the reference operator repo, not this repo). Status changes to that matrix require governed approval per the the reference operator repo's governance model.

This repo (`~/banza`) does not own a validation matrix — it owns protocol specifications in `contracts/`, conformance vectors in `conformance/`, and certification criteria in `docs/governance/certification-boundary.md`.

---

## Deployment

Protocol specification changes (contracts, conformance vectors, certification criteria) are published in this repository. Operator implementations consume these specifications independently. The public website and protocol services are deployed from the reproducible bundle in [`infra/banza-network/`](infra/banza-network/README.md) (bootstrap + `docker compose` with fixed image tags).

---

## Operator Neutrality Principle

**BANZA is an operator-neutral protocol. This is an architectural invariant, not a branding preference.**

### Dependency graph

```
     Operators
         ↑
       BanzAI
         ↑
       BANZA
```

Operators depend on BANZA and BanzAI. BANZA and BanzAI never depend on operators. This direction is permanent and non-negotiable.

### What BANZA must never contain

- Specific operator brands or names
- Operator business logic or product decisions
- Operator ownership or governance claims
- Operator-specific protocol extensions
- Certification rules tied to a specific operator
- Assumptions that only one operator exists

### What BANZA defines

- Protocol rules (invariants, contracts, specs)
- Conformance criteria (what it means to be certified)
- Conformance profiles (L0–L4, operator-agnostic)
- Governance process (ADRs, RFCs — open to all operators)
- Federation model (any certified operator may participate)

### Terminology

| Forbidden | Use instead |
|-----------|-------------|
| *(specific operator name)* | certified operator |
| *(specific operator name)* | reference operator |
| *(specific operator name)* | operator implementation |
| *(specific operator name)* | federation member |
| *(specific operator name)* as subject of protocol claim | any operator, all operators |

Examples must use **Operator A**, **Operator B**, **Operator C** — never real commercial names.

### Automated enforcement: identity-check

**No specific commercial operator brand may appear in this repository.**

BANZA is an open protocol. It must be buildable, understandable, and governable without any knowledge of any specific operator. Use these terms instead:

| Forbidden | Use instead |
|-----------|-------------|
| *(specific operator name)* | certified operator |
| *(specific operator name)* | reference operator |
| *(specific operator name)* | operator implementation |
| *(specific operator name)* | federation member |

**Automated enforcement:** `make identity-check` and the `identity-guard` CI job on every push and pull request.

---

## What This Repository Is NOT

- Not a consumer app
- Not a merchant dashboard
- Not any operator's private implementation
- Not a proprietary product
- Not a wallet interface
- Not a separate BanzAI repository — the BanzAI runtime (services/banzai-api + engines/banzai-*) is consolidated into this monorepo (ADR-042); there is no separate `~/banzai` repository
