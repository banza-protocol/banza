# Contributing to BANZA

Thank you for your interest in contributing to BANZA — the Open Financial Protocol for interoperable payments.

---

## What you can contribute to

| Area | Examples |
|---|---|
| **Contracts** | OpenAPI corrections, webhook schema improvements, QR spec clarifications |
| **Conformance** | New test vectors, edge case coverage, conformance criteria |
| **Documentation** | Translations, examples, guides, ADR discussions |
| **Governance** | ADR proposals, RFC drafts, protocol amendments |
| **Tools** | Conformance validators, schema checkers, identity guards |

## What is out of scope here

- Operator-specific implementation code (wallets, backends, SDKs)
- Operator business logic or product decisions
- Operator-specific integrations (bank adapters, payment rails)
- Production deployment and operational tooling

SDKs, operator implementations, and integrations live in separate repositories.

---

## How to contribute

### 1. Open an issue first

For anything beyond a trivial correction, open an issue to discuss the change before writing code. This prevents wasted effort and aligns with BANZA's protocol governance process.

### 2. Fork and branch

```bash
git clone https://github.com/banza-protocol/banza.git
cd banza
git checkout -b feature/your-change
```

### 3. Make your change

Follow the area-specific guidelines:

**Contracts (`contracts/`)**
- OpenAPI specs must remain valid OpenAPI 3.0+
- Webhook schemas must reference `contracts/webhooks/`
- All changes require an ADR in `decisions/adr/`

**Conformance (`conformance/`)**
- Test vectors must be deterministic and technology-neutral
- New vectors must include a `README.md` describing the invariant tested
- Run: `make conformance-check` (or `cd engines/banza-conformance && cargo run --release -- check-vectors`)

**Documentation (`docs/`)**
- ADRs are append-only historical records — do not retroactively amend
- RFCs are open for comment before an ADR finalises the decision

**Engines (`engines/`) — Rust-first (ADR-038)**
- Official engines (conformance, crypto/trust, BanzAI retrieval/scoring/guards/evals, routing,
  semantic validation) must be **Rust**. TypeScript is UI/glue; Python is temporary legacy.
- New non-Rust engines are blocked by `make rust-rule-check`. If a file is genuinely UI/glue but
  trips the guard, add a justified entry to `docs/governance/rust-first-legacy-allowlist.json`.
- This does **not** affect operators — they remain free to use any technology.

### 4. Verify protocol integrity

```bash
# Identity check — no operator brand contamination
make identity-check

# Repository purity — no non-protocol artifacts
make purity-check

# Rust-first policy — no new non-Rust engine (ADR-038)
make rust-rule-check

# Cryptographic integrity tests (INV-FEDEVAL-005)
make crypto-check

# Required protocol diagrams present
make svg-visual-system-check
```

### 5. Submit a pull request

- Keep PRs focused — one change per PR
- Include a clear description of what changed and why
- Reference any related ADR or RFC

---

## Protocol changes

Changes to `contracts/` (OpenAPI, webhooks, QR, events) require an Architecture Decision Record (ADR) in `decisions/adr/`. Protocol changes affect all operator implementations and must be discussed before merging.

---

## Financial invariants

Any conformance change that touches financial invariants must preserve:

- **Zero-sum**: every ledger posting balances (sum of debits == sum of credits)
- **Immutability**: ledger entries are append-only
- **Idempotency**: same key produces the same result
- **Non-negative balances**: wallet available balance never goes below zero
- **Atomicity**: balance changes are transactional

Invariants are defined in `docs/reference/pt/completa.md §3` and `conformance/vectors/`.

---

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## Open governance

Protocol changes are reviewed publicly through issues, pull requests, ADRs, RFCs, specifications and
releases. Governance is open today through the public GitHub repository — it is not a future promise.
Anyone can propose a change; normative changes require public artifacts (ADR/RFC/spec/release). See
[GOVERNANCE.md](GOVERNANCE.md) and [MAINTAINERS.md](MAINTAINERS.md).

Boundary rules for contributions:

- The protocol/operator boundary holds: no operator-specific product code, no operator business logic.
- BanzAI guides, explains and helps prepare evidence; it does not create protocol rules. New rules enter
  only through the public governance process.
- Contributing does not grant trademark rights. The names/logos BANZA, BanzAI and Banzami are governed
  separately by [TRADEMARKS.md](TRADEMARKS.md).

## Contribution licensing

By contributing to this repository, contributors agree that their contributions are submitted under the
same license as the project ([Apache License 2.0](LICENSE)) unless explicitly stated otherwise in an
accepted contribution agreement or repository policy. See [`docs/governance/licensing.md`](docs/governance/licensing.md).

New source files should carry an SPDX identifier (`SPDX-License-Identifier: Apache-2.0`) where the
repository's per-area convention uses one; do not mass-add headers to existing or generated files.
