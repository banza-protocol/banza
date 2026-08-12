# ADR-042 — PostgreSQL as Protocol State Store, not a Financial Ledger

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-006, ADR-007, ADR-033, ADR-034, ADR-038, ADR-039, ADR-040, `docs/governance/POSTGRESQL_PROTOCOL_STATE.md`, `infra/banza-network/postgres/init/001_schema.sql`

## 1. Context

BANZA is an open financial protocol. It serves public, signed protocol artifacts (root manifest, key
manifest, operator registry, conformance evidence hashes, revocation list), it indexes its own
reference so the native protocol agent (BanzAI, ADR-041) can explain the protocol, and it keeps a
protocol audit log. ADR-034 already decided that this durable state lives in a **dedicated, internal
PostgreSQL** (with `pgvector`) inside the protocol VM's Docker-internal network, with segregated roles
and encrypted off-VM backups.

What ADR-034 did not state in normative form is **what PostgreSQL is allowed to represent**. Because
BANZA is a *financial* protocol, a reader — or a future contributor — could reasonably assume that the
protocol's own database is where money, balances, wallets or settlement live. It is not, and it must
never become that. This ADR makes the boundary explicit and enforceable.

> **PostgreSQL stores protocol state, not financial value.**

## 2. Problem

- A financial protocol invites the assumption that its database is a financial database.
- Without an explicit, enforced boundary, a well-meaning change could introduce a `balance`,
  `wallet_balance`, `payment_transaction` or `kyc` column into the protocol schema.
- The moment the protocol database can hold funds, balances, real payment transactions, private keys
  or end-user personal data, the protocol stops being operator-neutral and inherits custody,
  settlement and regulatory responsibilities that belong to operators, not to the protocol.
- The financial invariants (ADR-006/007, `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`) govern how an
  **operator's** ledger must behave. They are conformance rules the protocol *defines*; they are not a
  ledger the protocol *operates*.
- The boundary must be stated once, canonically, and checked automatically — not left to prose.

## 3. Decision

The BANZA protocol database is a **verifiable protocol-state store**. It holds the public, mostly
signed artifacts that make the protocol inspectable, the document index that lets the native agent
explain the protocol, and an append-only audit trail. It is deliberately **not** a place where value
is held or moved.

> **The BANZA database is not a payment ledger, wallet ledger, banking core or operator database.**

The double-entry ledger, wallet balances and settlement described by the protocol are **operator
responsibilities**, implemented in each operator's own runtime, subject to the protocol's invariants
and demonstrated through conformance evidence. The protocol database stores the *evidence that an
operator behaves correctly* (hashes, signed metadata, audit records) — never the operator's financial
data itself.

## 4. What the protocol database stores

- **Signed trust artifacts** — root manifest, key manifest (public issuer keys only), signed protocol
  metadata references. Public keys, fingerprints and signatures only; never private key material.
- **Public registry** — operator self-publications and their public protocol-metadata pointers.
  Empty in the current phase (`/operators = []`).
- **Conformance evidence** — report **hashes** (`report_sha256`) and result markers, never the
  operator's underlying financial data. A PASS is technical evidence, not certification.
- **Reference index for the native agent** — the BanzAI document index and `pgvector` embeddings of the
  public protocol reference, so the agent can retrieve and explain published protocol text. Questions,
  answers and source ids only — never secrets, keys or user identifiers.
- **Protocol audit log** — an append-only record of governed writes.
- **Protocol state markers** — phase and milestone flags (e.g. `phase = pre-production`,
  `production_certificates = false`).

## 5. What the protocol database must never store

> **No private key, fund, balance or real payment transaction may be stored in the BANZA protocol database.**

Specifically prohibited: wallet balances or any balance figure; funds or money amounts as value held;
real payment transactions, settlement records, bank accounts, IBANs, card numbers, PAN or CVV; real
end-user, customer or merchant KYC/AML data or personal data; private keys, seed phrases / mnemonics,
root private key material, custodian secrets; `.env` contents, passwords, tokens or private API keys.

These belong — where they exist at all — inside an operator's own regulated runtime, never inside the
operator-neutral protocol database.

## 6. Enforcement

The boundary is not advisory. It is enforced at three layers:

1. **Schema** — `infra/banza-network/postgres/init/001_schema.sql` is the single source of truth and
   contains only the artifact, index, audit and state tables above.
2. **Least-privilege roles** (ADR-034) — `banza_ro` serves public routes read-only; `banza_gov`
   performs audited writes to trust/registry; `banzai_rw` may write **only** the BanzAI document index,
   never trust, registry or certificates. No service role is a superuser.
3. **Automated boundary check** — `make postgres-data-boundary-check` (the `postgres-data-boundary`
   guard, CI job on every push and pull request) scans the active schema for forbidden financial, PII
   and secret column/table names and fails the build if any appear.

> **If a table is introduced that can hold financial or personal data, it must fail governance and boundary checks unless explicitly justified outside the protocol runtime.**

## 7. Consequences

- The protocol stays operator-neutral: it cannot accidentally become a custodian, wallet or bank.
- The financial invariants remain what they are — **rules the protocol defines and verifies**, not a
  ledger it runs.
- Contributors get a mechanical answer to "can I add this column?": if it can hold value, funds,
  balances, real transactions, personal data or secrets, the boundary check blocks it.
- Auditors and operators can reason about protocol risk without reasoning about custody risk.

## 8. Alternatives considered

- **A managed external database (Supabase/Firebase).** Rejected by ADR-034: it makes the protocol
  depend on a specific vendor and undermines self-containment and neutrality.
- **Storing conformance results as full financial datasets.** Rejected: the protocol needs only the
  *hash* of an operator's evidence to make it externally reconcilable (`INV-RECON-*`), never the
  operator's financial data.
- **Leaving the boundary to documentation.** Rejected: prose is not enforceable. The boundary is
  encoded in the schema, the roles and an automated guard.

## 9. Relationship to the financial invariants

`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*` describe how a **conformant
operator's** ledger must behave (double-entry, no negative balance, ledger-derived balances, settlement
identity, idempotency, external reconcilability). They are the yardstick the protocol applies to
operators. This ADR is orthogonal: it states that the yardstick's *own* database is not itself a
ledger. The protocol measures ledgers; it does not keep one.

## 10. References

- ADR-006 — Double-entry ledger; ADR-007 — Double-entry invariant enforcement
- ADR-033 — Dedicated independent infrastructure; ADR-034 — Dedicated PostgreSQL and encrypted backups
- ADR-038/039/040 — Open protocol trust model, operator self-publication, federation trust evaluation
- ADR-041 — BanzAI as native protocol agent
- `docs/governance/POSTGRESQL_PROTOCOL_STATE.md` — canonical data-boundary document
- `docs/governance/M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md` — runtime and schema audit
- `infra/banza-network/postgres/init/001_schema.sql` — schema (single source of truth)
- `tools/check-postgres-data-boundary.sh` — the boundary guard
