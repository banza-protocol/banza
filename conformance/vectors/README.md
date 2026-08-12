# Canonical Test Vectors

Version: 1.0 · Status: Stable

Test vectors are deterministic, language-neutral JSON descriptions of Banza
protocol operations. Every conformant implementation must produce matching
results for every applicable vector.

---

## Vector fields

Every vector contains:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Immutable, monotonic identifier (e.g., `TRF-001`) |
| `title` | Yes | Human-readable description |
| `certification_level` | Yes | Minimum level required (0–4) |
| `stability` | Yes | `stable`, `experimental`, or `deprecated` |
| `requires_fresh_state` | No | If true, must run against a freshly started operator |
| `setup` | No | HTTP steps to execute before the main request |
| `input` / `trigger` | Yes | HTTP request: `method`, `path`, `body` (`input` or `trigger` depending on suite) |
| `expected` (or assertion field) | Yes | Deterministic expected outcome — see below |
| `invariants` | No | Named invariants that must hold after this operation |
| `notes` | No | Clarifying notes for implementors |

### Expected-outcome fields (determinism)

Every vector carries a **deterministic** expected outcome — there are no
smoke-only vectors. The expected outcome is expressed in one of two equivalent
styles, depending on what the suite asserts:

| Style | Field(s) | Used by |
|-------|----------|---------|
| Response/effect | `expected` | transfers, payment-requests, qr-payloads, settlement-batches, wallet-balances, operator-manifests |
| Targeted assertion | `check_ledger` / `check_ledger_entry_fields` / `expected_events` / `endpoint_check` / `invariant_check` | ledger-postings, event-envelopes |

Both styles specify concrete expected values (counts, kinds, amounts, event
types, required payload fields), so every conformant implementation must produce
matching results.

---

## Invariant names

| Name | Description |
|------|-------------|
| `zero_sum_ledger` | DEBIT amount + CREDIT amount = 0 for this operation |
| `no_negative_balance` | Sender balance never goes below zero |
| `idempotency` | Same idempotency key always returns the same response |
| `trace_id_propagation` | All derived entities carry the same trace_id |
| `causation_id_set` | Derived transfers carry causation_id pointing to the triggering entity |
| `ledger_immutability` | No ledger entry is modified after creation |
| `single_use_qr` | A paid QR rejects further payment attempts |
| `single_use_pr` | A paid payment request rejects further payment attempts |
| `settlement_no_money_creation` | net_minor + fee_minor == gross_minor |
| `settlement_idempotency` | A transfer appears in exactly one settlement batch |

---

## ID prefixes

| Prefix | Domain |
|--------|--------|
| `TRF-` | Transfers |
| `QR-` | QR codes |
| `PR-` | Payment requests |
| `STL-` | Settlement |
| `EVT-` | Events |
| `LED-` | Ledger |
| `WLT-` | Wallets |
| `MAN-` | Operator manifests |
| `CAP-` | Capabilities |
