# Financial Invariants

These invariants are mandatory for any BANZA implementation. Any operator implementation that violates them is not a correct BANZA implementation.

This document enumerates invariants under **section-local IDs** (`INV-L0x`, `INV-W0x`,
`INV-T0x`, `INV-S0x`, `INV-R0x`, `INV-A0x`). The **single machine-readable source of
truth** for every protocol invariant is the registry at
[`contracts/invariants.json`](../contracts/invariants.json), enforced by
`make invariant-check` and the `validate-invariants` CI job. The advertised family
names `INV-SETTLE-*` and `INV-RECON-*` are registered **aliases** of the settlement
invariants `INV-STL-*` and the federation-reconciliation invariant `INV-FED-RECON-001`
respectively — those carry the normative statement in the registry. The section-local
IDs below are finer-grained refinements scoped to this document; use the crosswalk to
map between them and the registry's canonical IDs.

## Invariant ID crosswalk

| Local ID | Title | Canonical family / ID |
|----------|-------|-----------------------|
| INV-L01 | Zero-sum balance | `INV-LEDGER-001` (debits = credits) |
| INV-L02 | Immutability | `INV-LEDGER-002` (entries immutable) |
| INV-L03 | Idempotency (postings) | `INV-IDEM-001` (same key → same result) |
| INV-L04 | No orphan entries | Sub-invariant of `INV-LEDGER-004` (atomic postings) |
| INV-W01 | Non-negative available balance | `INV-WALLET-*` (no negative balance) / `INV-SETTLE` no-money-creation |
| INV-W02 | Reserve/release/commit consistency | `INV-WALLET-001` (`balance = available + reserved`) |
| INV-W03 | Balance via ledger | `INV-WALLET-*` (balances are ledger-derived) |
| INV-W04 | Account type consistency | Sub-invariant of `INV-WALLET-*` (ledger account modelling) |
| INV-T01 | Deterministic state transitions | Sub-invariant (transaction FSM; no 1:1 canonical ID) |
| INV-T02 | Replay safety | `INV-IDEM-001` |
| INV-T03 | Atomicity | `INV-LEDGER-004` (partial postings never persist) |
| INV-S01 | Explicit settlement lifecycle | Sub-invariant of `INV-SETTLE-*` (settlement FSM) |
| INV-S02 | No partial settlement mutation | `INV-SETTLE-*` (settlement amount identity / immutability) |
| INV-S03 | Settlement period coverage | Sub-invariant of `INV-SETTLE-*` (non-overlapping periods) |
| INV-R01 | Environment isolation (routing) | Sub-invariant (environment isolation; see ADR-023) |
| INV-R02 | No implicit routing fallback | Sub-invariant (routing safety; no canonical financial ID) |
| INV-A01 | Signature validation before state change | Sub-invariant (acquiring security; see `INV-RECON-*` linkage) |
| INV-A02 | Idempotent callback processing | `INV-IDEM-001` |
| INV-A03 | Wallet credit after confirmation only | Sub-invariant; reconcilable via `INV-RECON-*` posting linkage |

> Invariants outside this document: QR resolution/expiry invariants (`INV-QR-*`) are
> specified in [`contracts/qr/`](../contracts/qr/); external reconcilability
> (`INV-RECON-*`) and settlement identity (`INV-SETTLE-*`) in the registry
> [`contracts/invariants.json`](../contracts/invariants.json); trust/PKI
> invariants (`INV-OTE-*` / `INV-FEDEVAL-*`, `INV-ROOT-*`) in `docs/reference/en/BANZA_REFERENCE.md` and ADR-025.
> The single machine-readable source of truth for every invariant is
> [`contracts/invariants.json`](../contracts/invariants.json).

---

## Ledger invariants

### INV-L01 — Zero-sum balance

Every ledger posting MUST be perfectly balanced: for each currency present, `sum(debits) == sum(credits)` in integer minor units. A posting with a non-zero net MUST be rejected before it is written to storage.

*Reference-implementation note (non-normative):* a reference implementation enforces this at posting-construction time — e.g. a `LedgerPosting::assert_balanced()` check invoked before any database write.

### INV-L02 — Immutability

Ledger entries are append-only. Once posted, a ledger posting and its entries MUST never be modified or deleted. Corrections are made by posting reversing entries.

### INV-L03 — Idempotency

Every posting carries a caller-supplied `idempotency_key`. If the same key is submitted twice, the implementation MUST return the existing posting without creating a duplicate. This is typically enforced with a uniqueness constraint on `idempotency_key` plus an application-level check before inserting.

### INV-L04 — No orphan entries

Every ledger entry belongs to a ledger posting. Entries are never inserted standalone — they are always part of a balanced posting.

---

## Wallet invariants

### INV-W01 — Non-negative available balance

The available balance of any wallet must never go below zero. The engine enforces this by checking the balance before posting a reserve. Any operation that would result in a negative available balance is rejected with `InsufficientFunds`.

### INV-W02 — Reserve/release/commit consistency

For any sequence of operations on a wallet:

```
available + reserved = total funds credited - total funds settled
```

The reserve operation moves funds from `available` to `reserved`. Release moves them back. Commit (settle) removes them from `reserved` and credits the merchant. No money is created or destroyed.

### INV-W03 — Balance via ledger

Wallet balances are derived from the ledger — there is no separate balance column that can diverge. The implementation sums ledger entry amounts for the wallet's accounts to produce the balance. This means the ledger is the single source of truth.

### INV-W04 — Account type consistency

Wallet accounts are modelled as LIABILITY accounts in the ledger (representing funds owed to the merchant). Credit increases the liability (funds available to merchant). Debit decreases it (funds paid out or reserved). An implementation negates the raw ledger value to produce merchant-facing positive balances.

---

## Transaction invariants

### INV-T01 — Deterministic state transitions

Transaction states follow a strict finite state machine:

```
INITIATED → PENDING → CAPTURED → SETTLED / FAILED / REFUNDED
                ↓
            CANCELLED / EXPIRED
```

Any transition not in the FSM is rejected. The engine validates the state before writing.

### INV-T02 — Replay safety

Processing the same transaction event twice produces the same result. Transaction state transitions are idempotent — if the transaction is already in the target state, the operation is a no-op.

### INV-T03 — Atomicity

All state change operations (status + ledger posting) are executed within a single database transaction. A transaction cannot be captured without a corresponding wallet reserve. A transaction cannot be settled without a corresponding wallet commit.

---

## Settlement invariants

### INV-S01 — Explicit lifecycle states

Settlement batches follow a strict lifecycle:

```
PENDING → PROCESSING → COMPLETED / FAILED
```

No batch is permanently lost — failed batches remain in FAILED state and can be retried.

### INV-S02 — No partial mutation

Settlement batch amounts (gross, fee, net) are computed at creation time and are immutable. The engine never modifies batch amounts after creation. Corrections require creating a new batch.

### INV-S03 — Period coverage

Each settlement batch covers a specific, non-overlapping time period. The scheduler ensures that no two batches for the same merchant + wallet + period can coexist (idempotent creation via `ON CONFLICT DO NOTHING`).

---

## Routing invariants

### INV-R01 — Environment isolation

The routing engine must never route a production payment through a sandbox rail or vice versa. Operators are responsible for configuring separate routing tables per environment. The engine carries no environment enforcement — that is the operator's responsibility at the provider level.

### INV-R02 — No implicit fallback

If no routing rule matches a payment, the implementation MUST return an error. It MUST NOT silently route through a default or fallback provider. Silence would hide misconfiguration.

---

## Acquiring invariants

### INV-A01 — Signature validation before state change

Inbound provider callbacks are HMAC-validated before any state change occurs. An invalid or missing signature causes the request to be rejected before the acquiring payment record is touched.

### INV-A02 — Idempotent callback processing

Duplicate callbacks (same `idempotency_key`) are detected via the `acquiring_callbacks.idempotency_key` unique index. Duplicate callbacks return the current payment state without re-processing.

### INV-A03 — Wallet credit after confirmation only

A merchant wallet is credited only after a payment callback is validated and the acquiring payment is moved to `CONFIRMED`. There is no pre-credit.

---

## Enforcement

These invariants are enforced at multiple layers:

| Layer | Mechanism |
|---|---|
| Strong type system | A strong monetary type prevents unit confusion (e.g., a `Money` type wrapping a 64-bit integer of minor units) |
| Implementation pre-conditions | Checked before database writes |
| Database constraints | `UNIQUE`, `CHECK`, `NOT NULL` on critical columns |
| Idempotency keys | Unique at database level, checked at application level |
| Tests | Unit tests verify invariant properties; property tests for ledger balance |

---

## Violations

If you discover a violation of any invariant — in the specification, in documentation, or in a reference implementation — please open a GitHub issue tagged `financial-invariant`.

Security-sensitive violations (e.g., a way to credit a wallet without a corresponding debit) should be reported via the security policy in [docs/security/README.md](../docs/security/README.md).
