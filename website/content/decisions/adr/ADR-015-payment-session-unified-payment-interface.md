# ADR-015 — Payment Session: the unified payment interface

**Status:** Accepted
**Date:** 2026-06-30
**Author:** BANZA Protocol
**Deciders:** Fidel Monteiro (Founder)
**Supersedes:** None
**Extends:** ADR-014 (Payment Intent), ADR-012 (QR payment system), ADR-013 (Payment Links), ADR-020 (Wallet Accounts), ADR-017 (Wallet/account payments)
**See also:** ADR-005 (Protocol-first), [BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md)

---

## Context

ADR-014 ratified the **PaymentIntent** — the single financial object that means
"an intent to receive a (fixed or open) amount which, when paid, posts a Transfer
to the ledger." But a PaymentIntent today carries exactly **one** `surface`
(`LINK | QR | REQUEST`) and one `surface_ref`.

Real collection needs the **same intent presented through several interfaces at
once**: a fundraiser shares a **payment link** on WhatsApp *and* shows a **dynamic
QR** at an event *and* a **static QR** on a poster *and* a **deep link** in an app —
and every one of them must credit the **same destination** and produce the **same**
receipt, proof and webhook. Without a protocol rule, each interface risks becoming a
separate financial flow, and an application is tempted to stitch the plumbing
itself — exactly what BANZA forbids.

This must be ratified at the **protocol** level: it is not specific to any single operator, not
specific to any app, and not specific to donations.

## Decision

Introduce the **Payment Session** standard. A Payment Session is **a PaymentIntent
(ADR-014) presented through one or more interfaces.** It introduces no new money
object — the PaymentIntent remains *the* financial object; the session is the rule
that binds its interfaces.

```
                         PaymentIntent (ADR-014)
                       the single financial object
                                  │
                 ┌────────────┬────┴────┬─────────────┐
                 ▼            ▼         ▼             ▼
          Payment Link  Dynamic QR  Static QR   Deep Link
                 └────────────┴────┬────┴─────────────┘
                                  ▼
                         one destination
              (payee wallet, MAY be a Wallet Account — ADR-020)
                                  ▼
                    one ledger result · receipt · proof · webhook
```

**Central rule.** A Payment Link is not a separate financial flow. A QR is not a
separate financial flow. A Deep Link is not a separate financial flow. They are
**interfaces** — presentations of one Payment Session. **The payment is always
executed against the session**, never against the interface.

### Interfaces

| Interface | Description |
|---|---|
| `PAYMENT_LINK` | A URL (ADR-013) resolving to the session. |
| `DYNAMIC_QR` | A QR (ADR-012) bound to one session; MAY expire; MAY be fixed-amount; single- or multi-use per policy. |
| `STATIC_QR` | A QR (ADR-012) bound to a permanent session or a session template (campaign, shop, event, @handle); MAY allow an open amount; **the destination is still resolved by the operator** — a static QR never lets an app invent a destination. |
| `DEEP_LINK` | An app deep link resolving to the session. |

All interfaces of a session preserve the **same** `session_id`, financial
destination, currency, fixed amount (when set), expiry, idempotency policy,
metadata context, and financial result.

### Relationship to PaymentIntent (no duplication)

- A Payment Session **is** a PaymentIntent with a set of interfaces. `session_id`
  is the PaymentIntent id; the session reuses the intent's `payee_wallet_id`,
  `amount_minor`, `currency`, `status`, `expires_at`, `metadata`.
- The session **generalizes** `surface` (one) to `interfaces[]` (many). A legacy
  single-surface intent is simply a session with one interface (see Compatibility).
- The session **adds** an optional `destination_account_ref` — the segregated
  **Wallet Account** (ADR-020) to credit (e.g. a campaign account). Absent ⇒ the
  payee wallet's default account, as today.

### States

The session status mirrors the PaymentIntent (ADR-014): `CREATED` → (live) →
`PAID` | `EXPIRED` | `CANCELLED` | `FAILED`, with `PARTIALLY_PAID` reserved for
operators that support partial collection. An **interface MAY carry its own state**
(e.g. a single-use dynamic QR becomes `USED`) but **MUST NOT contradict the
session**: no interface can report `PAID` while the session is not, or change the
session's destination or amount.

## Invariants (normative)

1. An interface **never** changes the session's financial destination.
2. An interface **never** changes the session's amount without operator validation.
3. An interface **never** creates a payment outside the session.
4. A Payment Session **always** resolves at the operator.
5. Applications **never** generate an authoritative financial payload (link/QR/deep
   link). They **display** the artifacts the operator provides.
6. Receipt and proof reference the Payment Session (and its PaymentIntent) when
   applicable.
7. Webhooks include `payment_session_id` when the payment originated from a session.
8. The destination MAY be a Wallet Account (ADR-020); the operator resolves it —
   the interface only carries an opaque session reference, never an account id.

## Contracts

- `contracts/payment-sessions/payment-session.schema.json` — the session aggregate.
- `contracts/payment-sessions/payment-session-interface.schema.json` — one interface.

(Schemas are canonical; prose must not diverge once implementation begins.)

## Webhooks

Events carry `payment_session_id` when applicable:
`payment_session.created`, `payment_session.paid`, `payment_session.expired`,
`payment_session.cancelled`, plus the existing `payment.completed` / `payment.failed`
(which include the session reference when the payment came from a session).

## Worked example (DOA — operator-agnostic shape)

```
Payment Session
  purpose        = DONATION
  reference_type = DOA_CAMPAIGN
  reference_id   = campaign_123
  destination    = the campaign Wallet Account (ADR-020)
  interfaces     = [ PAYMENT_LINK, DYNAMIC_QR, STATIC_QR, DEEP_LINK ]
```
All four interfaces credit the **same** CAMPAIGN wallet account. DOA does not create
a "donation session" of its own — it asks the operator to create a Payment Session
(`purpose=DONATION`, destination = campaign account) and **displays** the returned
link / QR / deep link. The app holds no balance, generates no financial QR, and
computes no destination.

## Operators

Each operator implements Payment Sessions per this standard. The reference operator is the first
(its operator implementation is the reference operator's ADR-017, reframed as the implementation of
this standard). An operator MAY offer a subset of interfaces (link only; link + QR;
static QR; deep link) **provided every interface resolves to a Payment Session**.

## Compatibility

- Existing Payment Links (ADR-013) and QRs (ADR-012) remain valid. A legacy
  link/QR is a **single-interface session** (or a legacy flow) — it resolves
  implicitly to a session or to the pre-session path.
- New implementations MUST use Payment Sessions.

## Security

Signed / unforgeable payloads; non-enumerable `session_id`; expiry; replay
protection; idempotency; rate limits; **no internal account ids exposed**;
destination resolved by the operator; an interface cannot be altered to another
destination; an application cannot create a financial QR/link outside the operator.

## Consequences
- One destination, one reconciliation, one receipt/proof/webhook — across every
  interface. No application stitches financial flows.
- "Collect by link **or** QR **or** deep link" becomes a protocol capability every
  operator app inherits (NGO, ticketing, crowdfunding, streaming, events).
- The PaymentIntent (ADR-014) is unchanged as the money object; this ADR adds the
  multi-interface binding and the segregated-account destination.

## Alternatives considered
- **Independent objects per interface:** rejected — no guaranteed shared
  destination; double reconciliation; invites app-side financial logic.
- **A brand-new financial primitive:** rejected — PaymentIntent already *is* the
  financial object; a session is its multi-interface presentation, not a new money
  object.

## Rollout (protocol-first)
1. **Protocol (this ADR + schemas).**
2. **Operator (reference-operator ADR-017):** `payment_sessions`; bind link + dynamic/static
   QR to a session; route every interface to the session's wallet account; the
   business API; server-side QR rendering.
3. **SDK:** `createPaymentSession` / `getPaymentSession` + interface accessors.
4. **Apps (e.g. DOA):** request a session, display the interfaces.

> **Rule:** *Payment Link, QR and Deep Link are interfaces; the Payment Session
> (a PaymentIntent) is the financial object.*
