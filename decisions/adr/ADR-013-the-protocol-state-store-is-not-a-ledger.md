# ADR-013 — The protocol state store is not a ledger

## Context

The protocol serves public signed artifacts — key manifests, registry records, revocation entries,
evidence digests — and keeps an audit trail of its own governance events. That needs durable storage,
and durable storage inside a *financial* protocol invites an assumption that has to be refused
explicitly: that this is where the money lives.

The assumption is not far-fetched. The protocol defines a ledger, wallets and settlement in detail, so a
contributor could reasonably add a balance column and believe they were completing the design. The
moment that column exists, the protocol holds financial data, and with it custody, settlement and
regulatory obligations that belong to operators.

## Decision

**The protocol's own state store holds protocol state, never financial value.**

It holds public, mostly signed protocol artifacts, an index of the protocol's own documentation, and an
append-only audit trail. It is not a payment ledger, a wallet ledger, a banking core or an operator
database.

It never holds funds, balances, wallets, accounts, real payment transactions, identity-verification data
or personal data of end users, and it never holds private key material (ADR-027).

The ledger, wallet balances and settlement the protocol *defines* are operator responsibilities,
implemented in each operator's own runtime and demonstrated through evidence. What the protocol stores is
the evidence that an operator behaves correctly — digests, signed metadata, audit records — never the
operator's financial data.

The boundary is checked automatically rather than left to prose, because the failure it prevents arrives
as a well-intentioned schema change.

## Rationale

This is a boundary decision, not a technology decision. What the store may represent is architectural;
which engine implements it is not, and no property here depends on the choice.

Stating the boundary once and enforcing it mechanically is the cheapest way to hold it. The alternative
is that every future schema change requires someone to remember why a balance column would be wrong,
and memory is not a control.

Security by construction: data that is never present cannot leak, cannot be subpoenaed from the wrong
party, and cannot be reconciled against by mistake. Refusing custody of financial and personal data is
also what keeps the protocol operator-neutral in practice — a protocol holding operator balances would
be a participant in every operator's business.

Simplicity: the store's job is small and stays small. A public-artifact store with an audit trail can be
reasoned about completely; a store that might contain money cannot.

## Alternatives considered

**Let the protocol store hold operator balances for convenience, for example to serve dashboards.**
Rejected. It would make the protocol a custodian of operator data, put it inside every operator's
regulatory perimeter, and create a single database whose compromise affects every operator at once.

**No protocol state store; serve static files only.** Genuinely simpler, and rejected because the
registry, revocation and audit trail need queryable, append-only state with segregated write roles that
a file tree does not provide.

**State the boundary in documentation only.** Rejected: the violation is a one-line schema change, and
prose does not fail a build.

## Consequences

- The protocol's blast radius excludes operator funds and end-user data entirely, by construction.
- Operators keep full ownership of their financial data, which is where the regulatory obligations sit.
- Anything needing operator financial data must obtain it from the operator, never from the protocol.
- Schema changes are constrained permanently, and a guard enforces the constraint rather than a
  convention.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json)
- [`docs/governance/POSTGRESQL_PROTOCOL_STATE.md`](../../docs/governance/POSTGRESQL_PROTOCOL_STATE.md) — the enforced data boundary
