# Payment Lifecycle

Version: 1.0 · Status: Stable

A Banza payment flows through five sequential stages. Every stage is
atomic: a failure at any point leaves no partial state.

---

## Stages

```
1. VALIDATION        — inputs checked, wallets verified, balance confirmed
2. RESERVATION       — balance locked on sender wallet (prevents double-spend)
3. LEDGER POSTING    — double-entry entries written (DEBIT + CREDIT)
4. SETTLEMENT SIGNAL — event emitted; settlement provider notified
5. COMPLETION        — status transitions to completed, events emitted
```

---

## Detailed flow — direct transfer

```
Client
  │
  ├─ POST /transfers { from_wallet_id, to_wallet_id, amount_minor, currency }
  │
  ▼
Validation
  ├─ wallet exists? (from + to)
  ├─ same wallet? → reject
  ├─ amount_minor > 0?
  └─ idempotency key already used? → return existing transfer

  │ pass
  ▼
Ledger posting (atomic)
  ├─ DEBIT  sender   amount_minor
  └─ CREDIT receiver amount_minor

  │
  ▼
Events emitted
  ├─ payment.sent    { transfer_id, from_wallet_id, amount_minor }
  └─ payment.received { transfer_id, to_wallet_id, amount_minor }

  │
  ▼
Response: SandboxTransfer { id, trace_id, correlation_id, ... }
```

---

## Financial invariants enforced at each stage

| Invariant | Where enforced |
|-----------|---------------|
| No negative balance | Validation stage — balance check before any posting |
| Double-entry sums to zero | Ledger posting — always one DEBIT + one CREDIT of equal amount |
| Idempotency | Validation stage — idempotency key lookup before any side effects |
| Immutability | Ledger entries are append-only — no updates or deletes |
| Atomicity | Balance change and ledger write happen inside the same lock |

---

## Derived payment surfaces

All payment surfaces in Banza reduce to a ledger transfer:

| Surface | How it creates a transfer |
|---------|--------------------------|
| Direct transfer | User-initiated, `causation_id` absent |
| Payment request | `pay_payment_request()` calls `create_transfer()` with `causation_id = pr_id` |
| QR payment | `pay_qr()` calls `create_transfer()` with `causation_id = qr_id` |
| Payment link | Link lookup resolves to a payment request |

The `trace_id` is created at the first surface-level operation (PR, QR, or direct
transfer) and propagates through all derived operations.

---

## Sandbox implementation

The sandbox implements this lifecycle in `reference/sandbox-operator/src/state.rs`.

Relevant methods:
- `AppState::create_transfer()` — full lifecycle (validation → posting → events)
- `AppState::append_ledger_entry()` — low-level ledger write
- `AppState::emit()` — event emission with trace context
