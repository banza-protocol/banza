# ADR-018 — Payment collections

> **Collection is now an official BANZA protocol concept.** It is a protocol
> capability, not a feature of any operator. Every BANZA operator (the reference
> operator and future operators) implements *this* model. The concept was designed in the
> protocol first (ADR-001); operators consume it downward (protocol → operator →
> SDK → apps).

---

## Context

Operators need to collect one logical amount from **multiple payers** — split a
bill, group contributions, shared invoices, tuition, condominium dues, events,
crowdfunding. A 2026-06-28 reference audit found a merchant "split charge" being
approximated app-side as N unrelated payment links grouped only in the UI. That
is the inversion ADR-001 forbids: a structural concept (a group of related
payment intents settling toward one logical target) with no protocol model — no
canonical state machine, no events, nothing to reconcile, certify or refund.

This ADR defines the canonical concept so it is implemented downward.

## Decision

Introduce two protocol aggregates — **Collection** and **CollectionShare** —
governed by a **CollectionRule**. A Collection groups N shares; each share is
settled by its own **PaymentIntent** (ADR-014) → Transfer → Ledger. A Collection
represents a **composite financial obligation — never money**. It holds no
balance and never posts to the ledger.

**Scope (v1): single-operator.** A Collection's shares are created and settled
within the operator that created the Collection. Cross-operator settlement (a
payer on operator B paying a share of a Collection on operator A) is deferred to
a future federation ADR; the model is designed not to preclude it (see
Interoperability).

### Aggregate: Collection (root)

- `id`, `operator_id`
- `creator` (the principal that created it), `owner` (the principal that controls
  it), `merchant_id?` (when the payee is a merchant)
- `title`, `description`
- `currency` (ISO 4217), `total_amount_minor` (integer minor units; meaning
  depends on `rule` — a hard total for closed rules, a target/goal for open rules)
- `status` (state machine below)
- `rule` → CollectionRule
- `expires_at?`, `created_at`, `updated_at`, `closed_at?`
- `metadata`, `version` (optimistic concurrency)
- *derived (never stored as money):* `collected_amount_minor = Σ shares where status=PAID`,
  `remaining_amount_minor`

Immutability: after a Collection leaves `DRAFT` (i.e. once `OPEN`), `currency`,
`rule` and (for closed rules) `total_amount_minor` are immutable.

### Aggregate: CollectionShare (own root)

CollectionShare is its **own aggregate root** (not a child entity), so shares
scale and settle independently (see Scalability). The Collection holds the
composition invariant; each share owns its own lifecycle, payment and `version`.

- `id`, `collection_id`
- `participant?` (the @banza / wallet a share is addressed to, when known; open
  contributions may be anonymous until paid)
- `amount_minor` (integer minor units), `currency`
- `status` (state machine below)
- `payment_intent_id?` (the share's PaymentIntent — ADR-014 — from which its
  link/QR derive), `transfer_id?` (the real Transfer that settled it), `paid_at?`
- `expires_at?`, `metadata`

A share contains **no balance and no ledger reference**. Its only money anchor is
`transfer_id` (a pointer to the real settlement, for reconciliation).

### CollectionRule (extensible strategy)

Modelled as a tagged strategy object (not a flat enum), so new rules are added
without breaking compatibility:

```
{ "type": "<RULE>", ...rule-specific fields }
```

v1 rule types:

| `type` | Meaning | Key fields |
|--------|---------|-----------|
| `EQUAL_SPLIT` | total split equally across N participants | `participants_count`, `divisibility` |
| `FIXED_AMOUNTS` | each share has an explicit amount | `shares: [{amount_minor, participant?}]` |
| `PERCENTAGE` | each share is a percentage of the total | `shares: [{percent, participant?}]` |
| `OPEN_CONTRIBUTION` | open number of shares toward a target/goal | `target_minor?`, `allow_overpay` |
| `MINIMUM_CONTRIBUTION` | open contributions with a per-share floor | `min_minor`, `target_minor?` |

`divisibility`: `EXACT` (default — an `EQUAL_SPLIT` that does not divide evenly in
minor units is **rejected at creation**; **no silent rounding**) or
`REMAINDER_TO_FIRST` (explicit, opt-in: the remainder is assigned to share 1 and
recorded).

### State machines

**Collection:**
```
DRAFT ──▶ OPEN ──▶ PARTIALLY_COMPLETED ──▶ COMPLETED
   │        │              │
   │        ├──────────────┴──▶ EXPIRED      (deadline passed, not fully collected)
   │        └──────────────┴──▶ CANCELLED    (owner cancels)
   └───────────────────────────▶ CANCELLED   (discarded before opening)
                          (any) ──▶ FAILED    (terminal, unrecoverable error)
```
Valid transitions: `DRAFT→{OPEN,CANCELLED}`, `OPEN→{PARTIALLY_COMPLETED,COMPLETED,EXPIRED,CANCELLED,FAILED}`,
`PARTIALLY_COMPLETED→{COMPLETED,EXPIRED,CANCELLED,FAILED}`. `COMPLETED/EXPIRED/CANCELLED/FAILED` are terminal.

**CollectionShare:**
```
PENDING ──▶ LINK_CREATED ──▶ PAID
   │             │
   ├─────────────┴──▶ EXPIRED
   ├─────────────┴──▶ CANCELLED
   └─────────────┴──▶ FAILED
```
`PENDING→{LINK_CREATED,CANCELLED}`, `LINK_CREATED→{PAID,EXPIRED,CANCELLED,FAILED}`.
A share goes `PAID` **only** on a confirmed settling Transfer. `PAID` is terminal
(no double payment — INV-COLLECTION-006).

### Events (official, versioned, idempotent)

Added to `contracts/events/types.json` (aggregate types `collection`,
`collection_share`):

- `collection.created`, `collection.opened`
- `collection.share.created`, `collection.share.payment_requested`, `collection.share.paid`
- `collection.partially_completed`, `collection.completed`
- `collection.expired`, `collection.cancelled`, `collection.failed`
- `collection.share.expired` / `collection.share.cancelled` / `collection.share.failed`

`collection.share.paid` carries `collection_id`, `share_id`, `payment_intent_id`,
`transfer_id`. All events share the Collection's `trace_id`/`correlation_id`
(INV-TRACE-001), are deduplicated by event `id` (INV-EVENT-001), and consuming
them is idempotent.

### Relationship to PaymentIntent / Transfer / Ledger

```
Collection ──1:N──▶ CollectionShare ──▶ PaymentIntent ──▶ Transfer ──▶ Ledger
   (composite obligation)   (one payer)     (ADR-014)      (ADR-020)   (double-entry)
```
- A share's link/QR derives from its **PaymentIntent** (ADR-014) — Collections
  invents no initiation primitive.
- Settlement of a share is an ordinary wallet/account payment → **Transfer** →
  atomic double-entry **ledger** posting. Collections add **no** ledger primitive
  and hold **no** balance.
- **Forbidden:** `Collection → Ledger`. **Required path:** `Collection →
  CollectionShare → PaymentIntent → Transfer → Ledger`. The Ledger never knows
  Collections.
- Refunds follow ADR-020 **per settled share** (source-aware), never at the
  Collection level.

### Invariants (`INV-COLLECTION-*`)

1. `INV-COLLECTION-001` — A Collection never holds or moves value; no balance, no ledger posting.
2. `INV-COLLECTION-002` — For closed rules (`EQUAL_SPLIT`, `FIXED_AMOUNTS`, `PERCENTAGE`), `Σ shares.amount_minor == total_amount_minor`, exact in integer minor units.
3. `INV-COLLECTION-003` — `EQUAL_SPLIT` with `divisibility=EXACT` rejects a non-divisible total (no silent rounding).
4. `INV-COLLECTION-004` — `collected_amount_minor == Σ shares where status=PAID`.
5. `INV-COLLECTION-005` — A share reaches `PAID` only via a real confirmed Transfer; `transfer_id` is set; `causation_id` of that Transfer equals the share's `payment_intent_id` (INV-TRACE-001).
6. `INV-COLLECTION-006` — A `PAID` share is terminal; it MUST NOT accept further payment (no double payment).
7. `INV-COLLECTION-007` — After `OPEN`, `currency`/`rule`/(closed-rule) `total_amount_minor` are immutable.
8. `INV-COLLECTION-008` — Creation and share-payment are idempotent on the supplied idempotency key.

### Protocol APIs (`contracts/openapi/collections.yaml`)

Operator-agnostic surface (no operator specifics):
`POST /collections`, `GET /collections/{id}`, `PATCH /collections/{id}`,
`POST /collections/{id}/shares`, `GET /collections/{id}/shares`,
`POST /collections/{id}/close`, `POST /collections/{id}/cancel`,
`GET /collections/{id}/events`.

### Document Engine contracts (defined, not implemented)

Three read-only document contracts (no PDF rendering specified here): **Collection
Receipt**, **Collection Summary**, **Individual Share Receipt** — each backed by
real Collection/Share/Transfer data, never fabricated. See
[spec/collections.md](../../spec/collections.md).

### Certification

`supports_collections` is a **Level-2** capability (depends on
`supports_payment_intents`, traces, events). Not required for L0/L1.

## Security

Audited surfaces (normative requirements in the OpenAPI + conformance vectors):
ownership (only the owner mutates/closes/cancels), authorization per operation,
idempotency (create + pay), replay/tampering resistance on share links, no share
duplication, expired-link rejection, single-payment-per-share (INV-COLLECTION-006),
double-payment prevention, and concurrency/race safety via per-share `version`.

## Scalability

The model targets 2 → 10,000+ shares (crowdfunding, events, marketplaces,
tuition, condominium, fundraising) — not only "split a restaurant bill". Shares are
independent aggregate roots: created lazily/streamed, paid concurrently, paginated
on read (`GET /shares`), and reconciled per-share. `OPEN_CONTRIBUTION` /
`MINIMUM_CONTRIBUTION` allow an unbounded number of shares without a fixed N.

## Interoperability (v1 single-operator; forward-compatible)

v1 settles shares within the creating operator. The model does not assume a
specific operator and is designed so cross-operator payment (a payer on operator B paying a share on
operator A) can later be added via the federation contracts
(`contracts/federation/*`, ADR-031 federation trust evaluation on the
certificate-free open trust model of ADR-027) **without** changing the Collection
model — the share's PaymentIntent is the federation boundary. That extension is a
separate future ADR.

## Compliance

Audit trail via the event stream; event-sourcing-compatible (the aggregate state
is reconstructable from `collection.*` events); official receipts via the Document
Engine contracts; immutability per INV-COLLECTION-007; reconciliation per-share
via `transfer_id`; AML/KYB remain **operator policy** applied at share payment
(BANZA-PROTOCOL-VS-OPERATOR-POLICY) — the protocol defines the object and trail,
not the operator's KYC tiers; regulatory export via the events + receipts.

## Consequences

- Collection is an official protocol concept implemented identically by all
  operators. Apps consume it (UX only); the protocol owns the canonical model.
- No new settlement primitive; the ledger and Transfer are untouched.
- The reference operator's app-side split prototype (pre-protocol,
  disabled-by-default; the reference operator's ADR-001) is superseded by the
  protocol-first implementation once an operator ships `supports_collections`.

### Forbidden / Permitted (per ADR-001)

- **Forbidden:** an app/SDK inventing Collection objects/fields/events outside this
  contract; a Collection holding a balance or touching the ledger; a share marked
  paid without a real Transfer; silent rounding; fabricated receipts.
- **Permitted:** operators implementing this model + operator policy (KYC/AML,
  fees within `INV-STL-001`); SDKs exposing it; apps consuming it for UX.

## Resolved decisions (from the 2026-06-28 validation)

- **Share settlement** binds to **PaymentIntent** (ADR-014), defined first — not a
  new per-surface invention.
- **Interoperability**: single-operator in v1; cross-operator deferred to a
  federation ADR.
- **CollectionShare** is its own aggregate root (scale).

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/events/types.json`](../../contracts/events/types.json)
- [`contracts/openapi/collections.yaml`](../../contracts/openapi/collections.yaml)
- [`spec/collections.md`](../../spec/collections.md)
