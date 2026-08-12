# ADR-007 — Double-Entry Invariant: Enforcement Strategy

**Status:** Accepted  
**Date:** 2026-05-28  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** None  
**See also:** ADR-006 (original double-entry decision)

---

## Context

ADR-006 decided that the BANZA protocol mandates double-entry bookkeeping. This ADR specifies where and how the zero-sum invariant is enforced, and what guarantees operators can rely on.

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
