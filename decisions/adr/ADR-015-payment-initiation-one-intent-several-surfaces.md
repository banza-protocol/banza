# ADR-015 — Payment initiation: one intent, several surfaces

## Context

A payee asks to be paid in several ways: a link shared in a message, a printed static QR code on a
counter, a dynamic QR generated for one specific amount, a deep link into an application. Each has a
different presentation and a different failure mode, and the obvious design is to model each as its own
object with its own lifecycle.

That design is what creates the mess. Four objects means four state machines, four sets of events, four
idempotency stories and four places where "paid" is decided — and anything that needs to reference *the
thing being paid* generically has nothing to point at, so it invents a fifth object.

## Decision

**Payment initiation is one object — the payment intent — presented through several surfaces. The
surfaces carry no money and have no independent financial lifecycle.**

```
                    PaymentIntent
              the single financial object
                          │
        ┌────────────┬────┴────┬──────────────┐
     Payment Link  Static QR  Dynamic QR   Deep link
        └────────────┴────┬────┴──────────────┘
                     one destination
                          ▼
             one ledger result · receipt · proof
```

A payment intent is an intent to receive value into a payee account, with an amount that may be fixed or
open. It **never holds or moves money**: value moves exactly once, when the intent is fulfilled, through
the transfer and the ledger. The ledger knows nothing of intents or surfaces. An intent reaches its paid
state only on a real, confirmed, settling transfer — never optimistically.

The surfaces differ only in how the intent reaches a payer, and their differences are genuine:

- a **link** is shareable in any text channel and needs no camera and no simultaneous presence;
- a **static QR** is generated once for an account, carries no amount, and persists — the printed card
  on a counter, where the payer enters the amount;
- a **dynamic QR** carries a fixed amount and expires, and is single-use — consumed atomically with the
  transfer it settles;
- a **deep link** hands the intent to an application.

Static and dynamic QR coexist deliberately: choosing one excludes a real use case. Dynamic-only forces
a new code for every payment, which is unusable for informal counter commerce; static-only cannot encode
an amount, which is unusable for invoicing.

The protocol defines the intent, the surface semantics and the payload. It does not define the page an
operator serves, its layout or its branding.

## Rationale

One financial object with several presentations is the smallest model that supports every channel. It
means one lifecycle to specify, one set of events, one idempotency story and one definition of paid,
and anything that needs to reference a payment generically — a collection share, a receipt, a
reconciliation record — points at the intent rather than at whichever surface happened to be used.

It also keeps the ledger primitive untouched. Initiation is a coordination concern; the ledger sees only
the resulting transfer, so adding a future surface adds no risk to the financial core.

Expiry on dynamic codes and single use are security properties, not conveniences: an amount-bearing code
that never expires and can be presented twice is a replay waiting to happen. Marking it consumed
atomically with the transfer is what makes the single-use property real rather than best-effort.

## Alternatives considered

**A separate first-class object per surface.** Rejected: four lifecycles that must agree about "paid",
and no generic way to reference a payment.

**One surface only.** Rejected in both directions — dynamic-only fails counter commerce, static-only
fails invoicing, and link-only fails in-person payment.

**Let the intent hold a balance so it can be partially funded.** Rejected. It would make initiation a
custodial object and put value outside the ledger, which is where reconciliation stops working.

## Consequences

- A future surface is added without a new top-level concept and without touching the ledger.
- Everything downstream references the intent, not a surface.
- An open-amount intent requires the payer to be identified by an operator, so anonymous payment is not
  supported.
- A dynamic code may remain scannable briefly after its expiry instant if expiry is swept periodically,
  so the confirmation step re-checks expiry rather than trusting the sweep.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/payment-intents/`](../../contracts/payment-intents/)
- [`contracts/payment-sessions/`](../../contracts/payment-sessions/)
- [`contracts/qr/`](../../contracts/qr/) — the QR payload and lifecycle
- [`contracts/events/types.json`](../../contracts/events/types.json)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-QR-*`
