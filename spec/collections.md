# Payment Collections — protocol architecture

**Status:** Canonical · **Authority:** ADR-018 (Collections), ADR-014 (PaymentIntent) · **Capability:** `supports_collections` (Level 2)

Collections is a **BANZA protocol capability**, not an operator feature. Every
operator implements *this* model (protocol → operator → SDK → apps; ADR-001). A
Collection is a **composite financial obligation — never money**: it holds no
balance and never posts to the ledger.

## Domain model

```
            ┌────────────────────────────────────────────┐
            │ Collection  (aggregate root)               │
            │  composite obligation · holds NO money      │
            │  total_amount_minor · rule · status         │
            └───────────────┬────────────────────────────┘
                            │ 1 : N   (composition invariant: closed rules sum to total)
                            ▼
            ┌────────────────────────────────────────────┐
            │ CollectionShare  (own aggregate root)       │
            │  one payer's portion · holds NO money       │
            │  amount_minor · status · payment_intent_id  │
            └───────────────┬────────────────────────────┘
                            │ 1 : 1
                            ▼
                     PaymentIntent (ADR-014)
                            │ fulfilled by a real payer
                            ▼
                        Transfer (ADR-020)
                            │ atomic double-entry
                            ▼
                         Ledger  ◀── never knows Collections
```

- **Collection** — coordinating root: totals, rule, status, composition invariants.
- **CollectionShare** — its **own** aggregate root (independent payment,
  concurrency, `version`) so collections scale to thousands of shares.
- **CollectionRule** — extensible tagged strategy (`EQUAL_SPLIT`, `FIXED_AMOUNTS`,
  `PERCENTAGE`, `OPEN_CONTRIBUTION`, `MINIMUM_CONTRIBUTION`).

Canonical schemas: `contracts/collections/*.json`,
`contracts/payment-intents/payment-intent.schema.json`. API:
`contracts/openapi/collections.yaml`. Events: `contracts/events/types.json`.

## State machines

**Collection**
```
DRAFT ──▶ OPEN ──▶ PARTIALLY_COMPLETED ──▶ COMPLETED   (terminal)
   │        │              │
   │        ├──────────────┴──▶ EXPIRED     (terminal)
   │        └──────────────┴──▶ CANCELLED   (terminal)
   └────────────────────────────▶ CANCELLED (discarded pre-open)
                          (any) ──▶ FAILED    (terminal)
```
**CollectionShare**
```
PENDING ──▶ LINK_CREATED ──▶ PAID   (terminal — no double payment)
   │             ├──▶ EXPIRED
   │             ├──▶ CANCELLED
   └─────────────┴──▶ FAILED
```
Valid transitions are normative in `contracts/collections/state-machine.json`. Any
transition not listed MUST be rejected.

## Sequence — equal split, one share paid

```
Owner        Operator                         Payer
  │  POST /collections (EQUAL_SPLIT, N=3)       │
  │ ───────────────▶ create Collection(OPEN)    │
  │                  create 3 Shares(PENDING)   │
  │                  emit collection.created,   │
  │                       collection.opened,    │
  │                       collection.share.created ×3
  │                                             │
  │                  per share: create PaymentIntent (ADR-014)
  │                  Share -> LINK_CREATED      │
  │                  emit collection.share.payment_requested
  │                                             │
  │                          share link/QR ────▶│ pays (wallet/account)
  │                  PaymentIntent.paid         │
  │                  -> Transfer -> Ledger      │  ◀── money moves HERE, once
  │                  Share -> PAID (transfer_id)│
  │                  emit collection.share.paid,│
  │                       collection.partially_completed
  │                                             │
  │   …all shares paid -> collection.completed  │
```
Money moves **only** at the Transfer step, per share. The Collection never moves
value.

## Event catalogue

`payment_intent.created/paid` · `collection.created` · `collection.opened` ·
`collection.share.created` · `collection.share.payment_requested` ·
`collection.share.paid` · `collection.partially_completed` ·
`collection.completed` · `collection.expired` · `collection.cancelled` ·
`collection.failed`. All versioned, idempotent (dedupe by event `id`), and sharing
the Collection `trace_id` (INV-TRACE-001). Full payloads in
`contracts/events/types.json`.

## Relationship to the Ledger (independence)

```
FORBIDDEN:  Collection ──▶ Ledger
REQUIRED:   Collection ──▶ CollectionShare ──▶ PaymentIntent ──▶ Transfer ──▶ Ledger
```
The ledger primitive (ADR-020, double-entry invariants) is untouched. Refunds are
per settled share (source-aware, ADR-020), never at the Collection level.

## Invariants

`INV-COLLECTION-001..008` (ADR-018): no money in a Collection; closed-rule sum ==
total; EXACT divisibility (no silent rounding); `collected == Σ PAID`; PAID only
via a real Transfer with matching causation; PAID terminal (no double payment);
post-OPEN immutability; idempotent create + pay.

## Security

Normative in the OpenAPI + conformance vectors (`conformance/vectors/collections.json`):

| Concern | Rule |
|---|---|
| Ownership | only `owner` may PATCH/close/cancel (403 otherwise) — COL-008 |
| Authorization | per-operation; share payment authorized as an ordinary wallet/account payment |
| Idempotency | create + share-pay idempotent (INV-COLLECTION-008) — COL-005 |
| Replay / tampering | share links are PaymentIntent-backed; tamper/replay rejected as for QR/links |
| Share duplication | a share id is unique; idempotent creation |
| Expired links | expired share/intent rejected |
| Double payment | PAID is terminal; second pay → 409 (INV-COLLECTION-006) — COL-006 |
| Concurrency / races | per-share `version` (optimistic concurrency); only one payment wins |

## Scalability

Designed for 2 → 10,000+ shares — crowdfunding, events, marketplaces, tuition,
condominium dues, fundraising; not only "split a restaurant bill". Shares are
independent aggregate roots: created lazily or streamed, paid concurrently,
read via cursor pagination (`GET /shares`), reconciled per share.
`OPEN_CONTRIBUTION`/`MINIMUM_CONTRIBUTION` allow an unbounded number of shares
without a fixed N.

## Interoperability (v1 single-operator; forward-compatible)

v1 settles shares within the creating operator. The model does not assume a
specific operator. Cross-operator payment (a payer on operator B paying a share on
operator A) is a later federation ADR — the share's **PaymentIntent** is the
federation boundary, so it can be added via `contracts/federation/*` (ADR-031/ADR-027)
without changing the Collection model.

## Compliance

- **Audit trail / event-sourcing:** Collection + Share state is reconstructable
  from `collection.*` events.
- **Receipts:** three read-only Document Engine contracts (below), backed by real
  data — never fabricated.
- **Immutability:** INV-COLLECTION-007.
- **Reconciliation:** per share via `transfer_id`.
- **AML / KYB:** operator policy applied at share payment
  (BANZA-PROTOCOL-VS-OPERATOR-POLICY) — the protocol defines the object + trail,
  not the operator's KYC tiers.
- **Regulatory export:** events + receipts.

## Document Engine contracts (defined, not rendered here)

| Document | Backed by | Purpose |
|---|---|---|
| Collection Receipt | Collection + all PAID shares + their Transfers | Official record of a completed/partly-completed collection |
| Collection Summary | Collection + share states | Live status overview (collected/remaining, per-share) |
| Individual Share Receipt | one PAID share + its Transfer (ADR-020 receipt) | Per-payer proof of payment |

No PDF rendering is specified at the protocol level — only the data contract.
Operators render via their Document Engine using real Collection/Share/Transfer
data; a receipt is evidence, never fabricated.

## Certification

`supports_collections` is **Level 2** and requires `supports_payment_intents`
(`conformance/capabilities/schema.json`). Conformance vectors:
`conformance/vectors/collections.json` (COL-001..010).
