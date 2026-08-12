# contracts/events/

Canonical protocol event specifications for the BANZA protocol.

## Files

| File | Purpose |
|---|---|
| `envelope.schema.json` | JSON Schema for the internal event envelope (SSE stream) |
| `types.json` | Canonical registry of all internal event types with payload schemas |
| `webhook-types.json` | Canonical registry of all outbound webhook event types with payload schemas |

## Two event surfaces

The BANZA protocol defines two distinct event surfaces:

**Internal event stream (SSE)**
- Endpoint: `GET /events`
- History: `GET /events/history`
- Purpose: real-time protocol observation for operators, BanzAI, and tooling
- Envelope type: `BanzaEvent` (see `envelope.schema.json`)
- Event types: see `types.json`

**Outbound webhook delivery**
- Operator-configured HTTPS endpoints
- Purpose: server-to-server notification for merchant/operator integrations
- Envelope type: `WebhookEvent` (see `webhook-types.json`)
- Signed with `Banza-Signature` header (see `contracts/webhooks/`)
- Event types: see `webhook-types.json`

Internal events and webhook events are **distinct namespaces**. An internal `payment.sent` event and a webhook `transaction.completed` event refer to the same payment but are different envelope formats with different consumers.

## Invariants

`INV-TRACE-001`: Every event in the internal stream MUST carry `trace_id` and `correlation_id` matching the operation that generated it.

`INV-EVENT-001`: Event IDs are globally unique and immutable. The same `id` value MUST NOT appear twice in the event stream.

`INV-EVENT-002`: `created_at` is set at emission time on the protocol side. Consumers MUST NOT use it as a processing timestamp — use their own receipt time for that.
