# QR Payment Lifecycle

Version: 1.0 · Status: Stable

Banza QR payments are single-use pull payments. A merchant generates a QR code
(fixed-amount or open-amount), a consumer scans and confirms, and a ledger transfer
is executed. The QR code transitions from `active` to `paid` atomically with the
transfer.

---

## States

```
active  ──pay──▶  paid
   └──expire──▶  expired
```

---

## Flow

```
Merchant
  │
  ├─ POST /qr { merchant_wallet_id, amount_minor?, currency, description }
  │
  ▼
QR created (status: active, trace_id: tr-xxx)
  ├─ payload_data: "BANZA-SBX:{base64}" (sandbox)
  │                "BANZA:{base64}"       (production)
  └─ emit: qr.generated

  │
  Consumer scans, confirms payment
  │
  ├─ POST /qr/{id}/pay { consumer_wallet_id, amount_minor? }
  │
  ▼
Validation
  ├─ QR exists and is active?
  ├─ amount: use QR amount if fixed; require consumer amount if open
  └─ amount > 0?

  │ pass
  ▼
create_transfer(
  from: consumer_wallet_id,
  to:   merchant_wallet_id,
  amount: resolved amount,
  trace_ctx: TraceContext::child(qr.trace_id, qr.trace_id, qr_id)
)
  ├─ DEBIT  consumer
  ├─ CREDIT merchant
  └─ trace_id inherited from QR

  │
  ▼
QR updated (status: paid, transfer_id: txfr-yyy, paid_at: now)
  └─ emit: qr.paid

  │
  Response: updated QrCode object
```

---

## Causal chain

```
qr.trace_id: tr-xxx  (created at POST /qr)
    │
    └── transfer.trace_id: tr-xxx     (inherited)
        transfer.causation_id: qr-uvw (the QR that caused this transfer)
            │
            └── ledger_entry.trace_id: tr-xxx (both DEBIT and CREDIT)
            └── event.trace_id: tr-xxx (payment.sent, payment.received, qr.paid)
```

All of this is queryable via `GET /traces/tr-xxx`.

---

## QR payload format

The sandbox uses:
```
BANZA-SBX:{base64_json}
```

Where the JSON is:
```json
{
  "sandbox": true,
  "v": 1,
  "qr_id": "qr-...",
  "merchant_wallet_id": "sandbox-merchant-1",
  "amount_minor": 50000,
  "currency": "AOA",
  "description": "Table 4"
}
```

Production format is defined in `contracts/qr/`. The prefix changes to `BANZA:`
and the payload is signed. See `contracts/qr/format.md`.

---

## Single-use enforcement

Once a QR is paid, its status is set to `paid` inside the same lock as the
balance update. A second `POST /qr/{id}/pay` receives `422 Unprocessable Entity`
with `"QR code is Paid, not active"`.

---

## Open-amount QR

If `amount_minor` is omitted at generation time, the QR is an open-amount code.
The consumer must supply `amount_minor` at pay time. This is useful for
merchant-controlled totals entered at point of sale.

---

## Sandbox implementation

- `AppState::create_qr()` — generates QR, emits `qr.generated`
- `AppState::pay_qr()` — validates, calls `create_transfer()`, emits `qr.paid`
- `base64_encode()` — stdlib-only base64 for payload encoding
