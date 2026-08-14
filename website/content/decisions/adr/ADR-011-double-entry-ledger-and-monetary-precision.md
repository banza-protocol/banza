# ADR-011 — Double-entry ledger and monetary precision

BANZA defines the protocol rules, contracts and evidence for operator implementations; it does not move, hold, settle or custody funds. Operators — not BANZA — move money and interact with funds under their own legal, technical and operational responsibilities. In an operator that implements this protocol, every movement — payment, refund, settlement, payout — must be:

- auditable: anyone must be able to reconstruct the full history
- reconcilable: the internal ledger must agree with external statements
- correct: there must be no phantom creation or destruction of value

The question is: what bookkeeping model to use as the foundation of the financial core?

---

## Decision

**Implement double-entry bookkeeping with an immutable, append-only ledger. Represent all monetary amounts as integer minor units.**

Every financial movement creates a `LedgerPosting` — a balanced set of `LedgerEntry` records where the sum of debits equals the sum of credits. No entry is ever updated or deleted. The ledger is the truth.

Money is represented as `i64` minor units (e.g., `1_000_00` = 1,000.00 AOA). Floating-point arithmetic is forbidden anywhere in the financial core.

---

## Architecture

```
Every monetary movement = one LedgerPosting + N LedgerEntries

Example: merchant receives 100 AOA from a captured payment

  LedgerPosting
    id: <uuid>
    idempotency_key: "tx-123-capture"
    posted_at: 2026-05-13T10:00:00Z

  LedgerEntry [1]
    posting_id: <uuid>
    account_id: transit_account     (LIABILITY)
    entry_type: DEBIT
    amount: 100_00 AOA

  LedgerEntry [2]
    posting_id: <uuid>
    account_id: merchant_wallet     (LIABILITY)
    entry_type: CREDIT
    amount: 100_00 AOA

  Invariant: sum(DEBIT) == sum(CREDIT) == 100_00
```

Account types map to standard accounting:

| Type      | Increases with | Decreases with |
|-----------|---------------|----------------|
| ASSET     | DEBIT         | CREDIT         |
| LIABILITY | CREDIT        | DEBIT          |
| EQUITY    | CREDIT        | DEBIT          |
| REVENUE   | CREDIT        | DEBIT          |
| EXPENSE   | DEBIT         | CREDIT         |

---

## Rationale

### Why double-entry and not simple balance columns?

A schema like `wallet.balance = wallet.balance - amount` is irreversible. It answers "what is the balance now?" but not "how did we get here?", "was this transaction applied twice?", or "why does the internal balance differ from the acquirer's statement?".

Double-entry answers all of these because every movement is permanently recorded with full context. A single inconsistency (unbalanced posting) is visible immediately and cannot propagate silently.

### Why immutable entries?

Mutable financial records enable fraud, mask bugs, and destroy audit trails. An immutable ledger means that correcting an error requires posting a reversal entry — which itself leaves a trail. This is how real banks operate.

### Why integer minor units?

IEEE 754 floating-point cannot represent all decimal values exactly. `0.1 + 0.2 = 0.30000000000000004` in most languages. In financial systems, these errors compound across millions of transactions.

Using `i64` minor units (centavos for AOA) means all arithmetic is exact integer arithmetic. The `Money` type in `banza-types` enforces this at the type level — it is impossible to accidentally use a float for a monetary value.

### Why enforce balance at the application layer and not a DB constraint?

A database CHECK constraint like `sum(debits) = sum(credits)` would require a deferred constraint spanning multiple rows. This is complex and database-specific. The application-level `PostingBuilder` enforces balance before any SQL is executed, and the immutability of entries means a balanced posting cannot become unbalanced after the fact.

---

## Consequences

**Positive:**
- Complete audit trail — every Kz is traceable from origin to destination.
- Reconciliation is straightforward — compare ledger totals against external statements.
- Bug detection — an unbalanced posting fails immediately at the application boundary.
- Reversal semantics are natural — mistakes are corrected with a counter-posting, not deletion.

**Negative:**
- Balance queries require summing entries rather than reading a single column. Mitigated by maintaining a denormalised `available_balance` in the `wallets` table as a read optimisation.
- More complex than CRUD balance management. Acceptable given the correctness guarantees.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Mutable balance columns | Irreversible; no audit trail; reconciliation impossible |
| Single-entry bookkeeping | Cannot detect discrepancies; not reconcilable |
| Floating-point money | Precision loss; errors compound; industry-wide known failure mode |
| `DECIMAL` in DB, float in code | DB precision lost the moment values enter application code |

---

## Double-Entry Invariant: Enforcement Strategy

ADR-011 decided that the BANZA protocol mandates double-entry bookkeeping. This ADR specifies where and how the zero-sum invariant is enforced, and what guarantees operators can rely on.

The question: if enforcement is too weak (only application-level), a bug can corrupt the ledger silently. If enforcement is too strict (only database-level), it becomes hard to build and test without a live database.

## Decision

The invariant is enforced at **three independent layers**, each providing a different guarantee. The three-layer strategy is what the protocol defines; the concrete type names below (`PostingBuilder`, `LedgerPosting`) are the reference (Rust) implementation's realization of each layer, and operators may realize the same strategy in any technology that upholds the guarantees.

### Layer 1 — Type system (compile time)

`PostingBuilder` accumulates entries and calls `assert_balanced()` in `build()`. A posting that doesn't balance cannot be constructed — the `build()` call returns `Err`. This is enforced before any database write.

### Layer 2 — Application pre-condition (runtime)

`LedgerPosting::assert_balanced()` verifies that for every currency present, `sum(debits) == sum(credits)` in minor units. This check runs before the posting reaches the repository.

### Layer 3 — Database constraints (persistent)

The `ledger_postings` and `ledger_entries` tables are append-only. No `UPDATE` or `DELETE` is ever issued by the engine. Operators are expected to enforce this at the database level with appropriate permissions.

### Idempotency layer

`ledger_postings.idempotency_key` has a `UNIQUE` database constraint. Duplicate submissions return the existing posting; they do not create a second entry.

## Invariants operators can rely on

- Any posting that reaches the database is balanced (Layer 1 + 2 guarantee)
- No posting is ever modified after writing (Layer 3 + append-only convention)
- Same idempotency key always produces the same posting (idempotency layer)

## Invariants operators must uphold

- Do not issue raw SQL `UPDATE`/`DELETE` against `ledger_entries` or `ledger_postings`
- Do not construct postings that bypass the balancing check (in the reference implementation, do not bypass `PostingBuilder`)
- Do not assume the database enforces zero-sum (it does not — the application does)

## Consequences

**Positive:**
- Invariant violations are caught at the earliest possible point (build time, not database time)
- Tests can verify invariants without a live database
- Multiple enforcement layers mean a single bypass doesn't corrupt the ledger

**Negative:**
- The database does not enforce zero-sum on its own (trusts the application)
- Operators who bypass the application layer can corrupt the ledger

## Alternatives considered

**Database CHECK constraint for zero-sum:** Considered. Would require a database trigger across multiple rows (all entries in a posting), which is complex and not portable across database versions.

**Single application-layer check only:** Rejected as insufficient. Two independent layers catch different categories of bugs.
