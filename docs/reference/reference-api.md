# Sandbox Operator API Reference

> **Simulated environment.** All data is in-memory and resets on restart.
> No real funds move. `production_allowed: false` is enforced at the protocol level.

Base URL: `http://localhost:3100`

All request and response bodies are JSON. All timestamps are ISO 8601 UTC.
All monetary values are **minor units** (smallest indivisible currency unit).
For AOA: 1 AOA = 100 minor units.

---

## Health

### `GET /health`

Returns the operator's health status and environment metadata.

**Response**

```json
{
  "status": "ok",
  "environment": "sandbox",
  "operator": "banza-sandbox",
  "simulated": true,
  "production_allowed": false,
  "note": "This is a local development sandbox — not a production system."
}
```

**curl**

```bash
curl http://localhost:3100/health
```

---

## Protocol Capability Manifest

### `GET /.well-known/banza/operator.json`

Returns the operator's capability manifest. This path follows the RFC-0005
operator discovery protocol and is the canonical way for clients to discover
what a Banza operator supports.

**Response**

```json
{
  "operator_id": "banza-sandbox",
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "capabilities": {
    "supports_wallets": true,
    "supports_transfers": true,
    "supports_qr": true,
    "supports_payment_requests": true,
    "supports_settlement_simulation": true,
    "supports_events_sse": true,
    "supports_ledger_inspection": true,
    "cross_operator_routing": false,
    "offline_payments": false
  },
  "providers": {
    "all_simulated": true,
    "acquirer": "FakeAcquirer",
    "settlement": "SimulatedSettlementProvider",
    "notifications": "StdoutNotificationProvider"
  },
  "seed_wallets": [
    "sandbox-consumer-1",
    "sandbox-merchant-1",
    "sandbox-merchant-2",
    "sandbox-government-1"
  ],
  "manifest_version": 1
}
```

**curl**

```bash
curl http://localhost:3100/.well-known/banza/operator.json
```

---

## Wallets

### `GET /wallets`

List all wallets, including seed wallets and any wallets created in the current session.

**Response**

```json
{
  "wallets": [
    {
      "id":            "sandbox-consumer-1",
      "label":         "Sandbox Consumer",
      "currency":      "AOA",
      "balance_minor": 1950000,
      "wallet_type":   "consumer",
      "created_at":    "2026-05-28T10:00:00Z"
    }
  ]
}
```

**curl**

```bash
curl http://localhost:3100/wallets
```

---

### `POST /wallets`

Create a new in-memory wallet.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | yes | Human-readable display name |
| `currency` | string | yes | ISO 4217 currency code (`AOA`, `USD`, `EUR`) |
| `wallet_type` | string | no | `consumer` \| `merchant` \| `government` (default: `consumer`) |

```json
{
  "label":       "My Test Wallet",
  "currency":    "AOA",
  "wallet_type": "merchant"
}
```

**Response** `200 OK`

```json
{
  "id":            "wallet-a1b2c3d4",
  "label":         "My Test Wallet",
  "currency":      "AOA",
  "balance_minor": 0,
  "wallet_type":   "merchant",
  "created_at":    "2026-05-28T10:00:00Z"
}
```

**Error: unknown currency** `400 Bad Request`

```json
{ "error": "unknown currency: XYZ" }
```

**curl**

```bash
curl -X POST http://localhost:3100/wallets \
  -H 'Content-Type: application/json' \
  -d '{"label":"My Test Wallet","currency":"AOA"}'
```

---

### `GET /wallets/{id}`

Retrieve a wallet by ID.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Wallet ID (e.g. `sandbox-consumer-1` or `wallet-a1b2c3d4`) |

**Response** `200 OK`

```json
{
  "id":            "sandbox-consumer-1",
  "label":         "Sandbox Consumer",
  "currency":      "AOA",
  "balance_minor": 1950000,
  "wallet_type":   "consumer",
  "created_at":    "2026-05-28T10:00:00Z"
}
```

**Error: not found** `404 Not Found`

```json
{ "error": "wallet not found" }
```

**curl**

```bash
curl http://localhost:3100/wallets/sandbox-consumer-1
```

---

## Transfers

### `GET /transfers`

List all transfers recorded in the current session.

**Response**

```json
{
  "transfers": [
    {
      "id":             "txfr-a1b2c3d4",
      "from_wallet_id": "sandbox-consumer-1",
      "to_wallet_id":   "sandbox-merchant-1",
      "amount_minor":   50000,
      "currency":       "AOA",
      "note":           "Test payment",
      "idempotency_key": null,
      "created_at":     "2026-05-28T10:00:00Z"
    }
  ]
}
```

**curl**

```bash
curl http://localhost:3100/transfers
```

---

### `POST /transfers`

Execute a wallet-to-wallet transfer. Creates two double-entry ledger postings:
a DEBIT on the source wallet and a CREDIT on the destination wallet.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_wallet_id` | string | yes | Source wallet ID |
| `to_wallet_id` | string | yes | Destination wallet ID |
| `amount_minor` | integer | yes | Amount in minor units (must be > 0) |
| `currency` | string | yes | ISO 4217 currency code |
| `note` | string | no | Human-readable note |
| `idempotency_key` | string | no | Client-supplied key for retry safety |

```json
{
  "from_wallet_id":  "sandbox-consumer-1",
  "to_wallet_id":    "sandbox-merchant-1",
  "amount_minor":    50000,
  "currency":        "AOA",
  "note":            "lunch payment",
  "idempotency_key": "order-001-pay"
}
```

**Response** `200 OK`

```json
{
  "id":              "txfr-a1b2c3d4",
  "from_wallet_id":  "sandbox-consumer-1",
  "to_wallet_id":    "sandbox-merchant-1",
  "amount_minor":    50000,
  "currency":        "AOA",
  "note":            "lunch payment",
  "idempotency_key": "order-001-pay",
  "created_at":      "2026-05-28T10:00:00Z"
}
```

**Idempotency:** If the same `idempotency_key` is submitted twice, the second call
returns the original response with the same `id` and makes no balance change.

**Error: insufficient funds** `422 Unprocessable Entity`

```json
{ "error": "insufficient funds" }
```

**Error: wallet not found** `404 Not Found`

```json
{ "error": "wallet not found: nonexistent-wallet" }
```

**curl**

```bash
curl -X POST http://localhost:3100/transfers \
  -H 'Content-Type: application/json' \
  -d '{
    "from_wallet_id": "sandbox-consumer-1",
    "to_wallet_id":   "sandbox-merchant-1",
    "amount_minor":   50000,
    "currency":       "AOA"
  }'
```

---

## Payment Requests

A payment request represents a merchant's request for payment. The consumer
pays by wallet ID (rather than by scanning the request themselves).

### `GET /payment-requests`

List all payment requests in the current session.

**Response**

```json
{
  "payment_requests": [
    {
      "id":           "pr-a1b2c3d4",
      "to_wallet_id": "sandbox-merchant-1",
      "amount_minor": 25000,
      "currency":     "AOA",
      "description":  "Invoice #001",
      "status":       "pending",
      "transfer_id":  null,
      "created_at":   "2026-05-28T10:00:00Z"
    }
  ]
}
```

**curl**

```bash
curl http://localhost:3100/payment-requests
```

---

### `POST /payment-requests`

Create a new payment request.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to_wallet_id` | string | yes | Receiving merchant wallet ID |
| `amount_minor` | integer | yes | Requested amount in minor units |
| `currency` | string | yes | ISO 4217 currency code |
| `description` | string | no | Human-readable description shown to payer |

```json
{
  "to_wallet_id": "sandbox-merchant-1",
  "amount_minor": 25000,
  "currency":     "AOA",
  "description":  "Invoice #001"
}
```

**Response** `200 OK`

```json
{
  "id":           "pr-a1b2c3d4",
  "to_wallet_id": "sandbox-merchant-1",
  "amount_minor": 25000,
  "currency":     "AOA",
  "description":  "Invoice #001",
  "status":       "pending",
  "transfer_id":  null,
  "created_at":   "2026-05-28T10:00:00Z"
}
```

**curl**

```bash
curl -X POST http://localhost:3100/payment-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "to_wallet_id": "sandbox-merchant-1",
    "amount_minor": 25000,
    "currency":     "AOA",
    "description":  "Invoice #001"
  }'
```

---

### `GET /payment-requests/{id}`

Retrieve a payment request by ID.

**Response** `200 OK`

Same structure as the POST response. `status` will be `pending` or `paid`.

**curl**

```bash
curl http://localhost:3100/payment-requests/pr-a1b2c3d4
```

---

### `POST /payment-requests/{id}/pay`

Pay a pending payment request. Creates a transfer from the consumer's wallet
to the merchant's wallet for the exact requested amount.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Payment request ID |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_wallet_id` | string | yes | Consumer wallet paying this request |

```json
{ "from_wallet_id": "sandbox-consumer-1" }
```

**Response** `200 OK`

```json
{
  "id":           "pr-a1b2c3d4",
  "status":       "paid",
  "transfer_id":  "txfr-xyz789",
  "to_wallet_id": "sandbox-merchant-1",
  "amount_minor": 25000,
  "currency":     "AOA"
}
```

**Error: already paid** `422 Unprocessable Entity`

```json
{ "error": "payment request already paid" }
```

**Error: insufficient funds** `422 Unprocessable Entity`

```json
{ "error": "insufficient funds" }
```

**curl**

```bash
curl -X POST http://localhost:3100/payment-requests/pr-a1b2c3d4/pay \
  -H 'Content-Type: application/json' \
  -d '{"from_wallet_id":"sandbox-consumer-1"}'
```

---

## QR Payments

### `POST /qr`

Generate a QR payment code for a merchant. Returns the QR payload in the
canonical `BANZA-SBX:{base64json}` format.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchant_wallet_id` | string | yes | Receiving merchant wallet |
| `currency` | string | yes | ISO 4217 currency code |
| `amount_minor` | integer | no | Fixed amount (omit for open/dynamic QR) |
| `description` | string | no | Shown to the consumer at payment time |

```json
{
  "merchant_wallet_id": "sandbox-merchant-1",
  "amount_minor":       30000,
  "currency":           "AOA",
  "description":        "Table 4"
}
```

**Response** `200 OK`

```json
{
  "id":           "qr-a1b2c3d4",
  "status":       "active",
  "payload_data": "BANZA-SBX:eyJzYW5kYm94Ijp0cnVlLCJxcl9pZCI6InFyLWExYjJjM2Q0IiwibWVyY2hhbnRfd2FsbGV0X2lkIjoic2FuZGJveC1tZXJjaGFudC0xIiwiYW1vdW50X21pbm9yIjozMDAwMCwiY3VycmVuY3kiOiJBT0EifQ==",
  "merchant_wallet_id": "sandbox-merchant-1",
  "amount_minor": 30000,
  "currency":     "AOA",
  "created_at":   "2026-05-28T10:00:00Z"
}
```

The `payload_data` value decodes to:

```json
{
  "sandbox": true,
  "qr_id": "qr-a1b2c3d4",
  "merchant_wallet_id": "sandbox-merchant-1",
  "amount_minor": 30000,
  "currency": "AOA"
}
```

In production, this string is encoded into an actual QR image. The consumer's
app decodes the QR, reads the prefix (`BANZA:` in production), and initiates
payment. See [`contracts/qr/`](../../contracts/qr/) for the production format.

**curl**

```bash
curl -X POST http://localhost:3100/qr \
  -H 'Content-Type: application/json' \
  -d '{
    "merchant_wallet_id": "sandbox-merchant-1",
    "amount_minor": 30000,
    "currency": "AOA"
  }'
```

---

### `GET /qr/{id}`

Retrieve a QR code by ID.

**Response** `200 OK`

Same structure as POST response. `status` is `active` or `paid`.

**curl**

```bash
curl http://localhost:3100/qr/qr-a1b2c3d4
```

---

### `POST /qr/{id}/pay`

Pay a QR code. Creates a transfer from the consumer's wallet to the merchant's
wallet. A QR code can only be paid once.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `consumer_wallet_id` | string | yes | Consumer wallet paying this QR |
| `amount_minor` | integer | no | Required only for open (amount-less) QR codes |

```json
{ "consumer_wallet_id": "sandbox-consumer-1" }
```

**Response** `200 OK`

```json
{
  "id":          "qr-a1b2c3d4",
  "status":      "paid",
  "transfer_id": "txfr-xyz789"
}
```

**Error: already paid** `422 Unprocessable Entity`

```json
{ "error": "QR code already paid" }
```

**curl**

```bash
curl -X POST http://localhost:3100/qr/qr-a1b2c3d4/pay \
  -H 'Content-Type: application/json' \
  -d '{"consumer_wallet_id":"sandbox-consumer-1"}'
```

---

## Ledger

The ledger is the protocol core's source of truth. Balances are always derived from
entries — never stored separately.

### `GET /ledger/{wallet_id}`

Retrieve all ledger entries for a wallet, plus the derived balance.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `wallet_id` | Wallet ID to inspect |

**Response** `200 OK`

```json
{
  "wallet_id":             "sandbox-consumer-1",
  "derived_balance_minor": 1950000,
  "entry_count":           3,
  "entries": [
    {
      "id":           "le-a1b2c3d4",
      "kind":         "DEBIT",
      "amount_minor": 50000,
      "currency":     "AOA",
      "description":  "Transfer to sandbox-merchant-1",
      "reference":    "txfr-xyz789",
      "created_at":   "2026-05-28T10:00:00Z"
    },
    {
      "id":           "le-e5f6g7h8",
      "kind":         "CREDIT",
      "amount_minor": 2000000,
      "currency":     "AOA",
      "description":  "Opening balance",
      "reference":    "seed",
      "created_at":   "2026-05-28T09:00:00Z"
    }
  ]
}
```

**Ledger entry fields**

| Field | Description |
|-------|-------------|
| `id` | Unique entry identifier |
| `kind` | `DEBIT` (funds leaving wallet) or `CREDIT` (funds entering wallet) |
| `amount_minor` | Always positive — sign is indicated by `kind` |
| `description` | Human-readable context |
| `reference` | Transfer ID, seed marker, or other correlation reference |
| `created_at` | ISO 8601 UTC timestamp |

**Derived balance**: `SUM(CREDIT amounts) - SUM(DEBIT amounts)`. The balance is
never stored — it is always computed from entries. This is the double-entry
invariant.

**curl**

```bash
curl http://localhost:3100/ledger/sandbox-consumer-1
```

---

## Settlement

Settlement converts wallet receipts into simulated bank disbursements.

### `GET /settlement/batches`

List all settlement batches in the current session.

**Response**

```json
{
  "batches": [
    {
      "id":           "batch-a1b2c3d4",
      "wallet_id":    "sandbox-merchant-1",
      "status":       "completed",
      "gross_minor":  100000,
      "fee_minor":    1000,
      "net_minor":    99000,
      "tx_count":     2,
      "currency":     "AOA",
      "provider_ref": "SBX-SETTLE-uuid-here",
      "created_at":   "2026-05-28T10:00:00Z"
    }
  ]
}
```

**curl**

```bash
curl http://localhost:3100/settlement/batches
```

---

### `POST /settlement/batches`

Create a settlement batch for all unsettled inbound transfers to a wallet.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet_id` | string | yes | Merchant wallet to settle |

```json
{ "wallet_id": "sandbox-merchant-1" }
```

**Response** `200 OK`

```json
{
  "id":           "batch-a1b2c3d4",
  "wallet_id":    "sandbox-merchant-1",
  "status":       "completed",
  "gross_minor":  100000,
  "fee_minor":    1000,
  "net_minor":    99000,
  "tx_count":     2,
  "currency":     "AOA",
  "provider_ref": "SBX-SETTLE-3f7a9c12-...",
  "created_at":   "2026-05-28T10:00:00Z"
}
```

**Settlement fee**: 1% of gross, minimum 100 minor units (1.00 AOA).
`net_minor = gross_minor - fee_minor`.

**Error: no unsettled receipts** `422 Unprocessable Entity`

```json
{ "error": "no unsettled receipts for wallet: sandbox-float" }
```

**curl**

```bash
curl -X POST http://localhost:3100/settlement/batches \
  -H 'Content-Type: application/json' \
  -d '{"wallet_id":"sandbox-merchant-1"}'
```

---

### `GET /settlement/batches/{id}`

Retrieve a settlement batch by ID.

**curl**

```bash
curl http://localhost:3100/settlement/batches/batch-a1b2c3d4
```

---

## Events

### `GET /events` — SSE stream

Subscribe to a live event stream using Server-Sent Events. Each event emitted
by the sandbox is forwarded to all active SSE connections.

**Response**: `text/event-stream`

Each event is a named SSE event in the format:

```
id: le-a1b2c3d4
event: payment.sent
data: {"id":"ev-xyz","event_type":"payment.sent","payload":{...},"created_at":"2026-05-28T10:00:00Z"}

```

The server sends a `ping` keep-alive every 15 seconds to keep connections alive.

**Browser usage (EventSource)**

```js
const es = new EventSource('http://localhost:3100/events');
es.addEventListener('payment.sent', (e) => {
  const event = JSON.parse(e.data);
  console.log(event.payload.transfer_id);
});
```

**curl** (streams until interrupted)

```bash
curl -N http://localhost:3100/events
```

---

### `GET /events/history`

Retrieve all events emitted since the sandbox started.

**Response**

```json
{
  "count": 5,
  "events": [
    {
      "id":         "ev-a1b2c3d4",
      "event_type": "payment.sent",
      "payload": {
        "transfer_id":    "txfr-xyz",
        "from_wallet_id": "sandbox-consumer-1",
        "to_wallet_id":   "sandbox-merchant-1",
        "amount_minor":   50000,
        "currency":       "AOA"
      },
      "created_at": "2026-05-28T10:00:00Z"
    }
  ]
}
```

**curl**

```bash
curl http://localhost:3100/events/history
```

---

## Seed wallets

The sandbox starts with four pre-funded wallets. State resets on restart.

| ID | Label | Type | Opening balance |
|----|-------|------|-----------------|
| `sandbox-consumer-1` | Sandbox Consumer | consumer | 20,000.00 AOA (2 000 000 minor) |
| `sandbox-merchant-1` | Sandbox Merchant A | merchant | 100,000.00 AOA (10 000 000 minor) |
| `sandbox-merchant-2` | Sandbox Merchant B | merchant | 50,000.00 AOA (5 000 000 minor) |
| `sandbox-government-1` | Sandbox Government | government | 500,000.00 AOA (50 000 000 minor) |

---

## Error format

All error responses follow a consistent format:

```json
{ "error": "human-readable description" }
```

| HTTP status | When |
|-------------|------|
| `400 Bad Request` | Invalid input (unknown currency, missing required field) |
| `404 Not Found` | Resource does not exist |
| `422 Unprocessable Entity` | Business rule violation (insufficient funds, already paid) |
| `500 Internal Server Error` | Unexpected error in the sandbox |

---

## Minor units reference

| Currency | Subunit | Example: 500.00 |
|----------|---------|-----------------|
| AOA | 1/100 kwanza | `50000` |
| USD | 1/100 cent | `50000` |
| EUR | 1/100 cent | `50000` |
