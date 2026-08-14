# ADR-021 — Fees and application settlement

Applications built on BANZA (donations, marketplaces, crowdfunding, ticketing,
delivery, ride-hailing, subscriptions, …) all need to (a) let the operator charge
for using the payment infrastructure, and (b) pay an application's own service fee
to a beneficiary — often **not** at payment time, but when a campaign closes, a
sale completes, or a period ends.

A 2026-06-29 reference audit found these as *unnamed* concepts: there was no
protocol model for "the operator's per-payment fee" nor for "the application's
later settlement to a beneficiary". Per ADR-001 that is the inversion to avoid: a
structural financial concept (how value is split and when it settles) with no
canonical model, no events, nothing to reconcile or certify. This ADR ratifies
the concept **before** any operator or application implements it.

Two financial movements are routinely conflated and must be **separated**:

| | **Operator Fee** | **Application Settlement** |
|---|---|---|
| What | the operator's charge for the infrastructure | the application paying a beneficiary for its service |
| When | every fulfilled payment | when the application decides (now, daily, on campaign close, on delivery, …) |
| Visibility | invisible to the payer; never in public API/UI | a deliberate, auditable movement |
| Determined by | the **operator** alone | the **application's** own rules |
| Reversibility | irreversible (a posted ledger leg) | governed by its own lifecycle |

## Decision

Introduce three **reference-only** protocol concepts and two **financial
primitives**. The protocol carries *references and structure*; it never carries
percentages, money math, or commercial rules.

### Reference concepts (the protocol knows only these)

1. **BusinessCategory** — the economic nature of a transaction. An open,
   extensible enum: `DONATION`, `CROWDFUNDING`, `MARKETPLACE`, `ECOMMERCE`,
   `DELIVERY`, `FOOD_DELIVERY`, `RIDE_HAILING`, `SUBSCRIPTION`, `TICKETING`,
   `DIGITAL_GOODS`, `PHYSICAL_GOODS`, `P2P`, `BILL_PAYMENT`, `NGO`, `GOVERNMENT`.
   The list may grow; categories carry **no** pricing.

2. **PricingProfile** — the commercial-tier reference of the counterparty:
   `STANDARD`, `BUSINESS`, `ENTERPRISE`, `PARTNER`, `NGO`, `GOVERNMENT`, `CUSTOM`.
   A reference only — **never a percentage**.

3. **FeePolicyRef** — an opaque reference to a commercial policy that the operator
   (and only the operator) resolves to a concrete fee. The protocol transports the
   reference and never knows the rule behind it.

> **The protocol contains no `2%`, `5%`, `1.7%`, no tables, no formulas.** Those
> live exclusively in the operator's Pricing Engine (operator policy, not
> protocol). See `BANZA-PROTOCOL-VS-OPERATOR-POLICY`.

### Primitive 1 — Operator Fee

A protocol concept for the operator's per-payment charge.

- Computed **per fulfilled PaymentIntent** (ADR-014), at fulfilment time.
- Computed exclusively by the **operator's Pricing Engine** from
  `{BusinessCategory, PricingProfile, FeePolicyRef, country, currency, contract,
  …}` — inputs the protocol carries, a result the protocol never second-guesses.
- Realized as **one additional ledger leg** in the same double-entry posting the
  fulfilment already produces (ADR-011): the payee is credited the **net**, an
  operator fee account is credited the fee, the posting balances to zero. The fee
  is **irreversible** like any ledger entry — corrected only by a reversal
  posting, never by mutation.
- **Never** returned by any public API, shown in any payer-facing UI, or carried
  in a payer-visible field. Only operator-internal dashboards may read it.

```
PaymentIntent  →  fulfilment  →  Transfer  →  Ledger posting
                                                  ├─ credit payee  (net)
                                                  └─ credit operator-fee account (fee)   ← Operator Fee leg
```

### Primitive 2 — Application Settlement

A protocol concept for an application paying a beneficiary, **decoupled in time**
from the payments that funded it.

- **Optional** and **application-initiated** — the protocol provides the mechanism
  and a lifecycle, never the *when* or the *how much* (those are the application's
  rules, layered as operator/app policy).
- Operates on **net value already settled** into an application-controlled wallet
  (e.g. a campaign wallet fed by donations, or a marketplace seller balance).
- Produces its **own** ledger posting(s) at settlement time — never altering the
  earlier payment postings.
- May carry an **application fee** (the app's own service charge), which is itself
  resolved through the same reference concepts (BusinessCategory + PricingProfile
  + FeePolicyRef) and is **distinct** from the Operator Fee.

```
Application wallet (net)  →  Application Settlement  →  posting
                                                          ├─ credit beneficiary (net of app fee)
                                                          └─ credit application-fee account (app fee, optional)
```

### Pricing Engine (operator-owned, NOT protocol)

```
{ BusinessCategory, PricingProfile, FeePolicyRef, country, currency,
  merchant contract, campaign type, promotions }  ──▶  Pricing Engine  ──▶  fee amount (minor units)
```

The protocol **calls** a pricing capability and consumes a resolved amount; it
never implements pricing. An operator with no engine configured charges **zero**
fee (safe default) — the protocol still posts a balanced (fee-less) entry.

## Wire surface (what crosses the protocol boundary)

The public/initiation surface carries only references:

```
PaymentIntent {
  …existing fields (ADR-014)…
  business_category : BusinessCategory      // economic nature
  pricing_profile?  : PricingProfile        // commercial tier (optional)
  fee_policy_ref?   : FeePolicyRef          // opaque operator policy ref (optional)
}
```

It **never** carries `operator_fee`, a percentage, or a commercial rule. The
resolved Operator Fee exists only inside the ledger + operator-internal records.

## Flows (all reuse one mechanism)

- **Donation** — each donation is a PaymentIntent → Transfer → Ledger with
  the Operator Fee leg; the **net** lands in the campaign wallet immediately. When
  the campaign closes, an **Application Settlement** moves the campaign net to the
  beneficiary, minus the application's fee (computed on the **net**, never the
  gross).
- **On-demand commerce (e.g. a delivery application on Operator A)** — identical,
  except the Application Settlement fires **immediately after delivery**.
- **Marketplace** — Application Settlement on sale completion.
- **Crowdfunding** — *Keep-What-You-Raise* → settle immediately; *All-or-Nothing*
  → settle only when the campaign closes successfully (else refund via ADR-020).
- **Subscription** — Application Settlement at period end.

The protocol provides the **mechanism**; each vertical's rules are app/operator
policy. None of them is hard-coded in the protocol.

## Ledger (ADR-011 — unchanged invariants)

- Every PaymentIntent fulfilment still produces a Transfer + balanced postings.
  The Operator Fee is simply **one more leg** in that balanced posting.
- Application Settlement produces a **later, separate** balanced posting.
- **Append-only**: existing entries are never altered or deleted; errors are fixed
  with reversal postings. No `INV-LEDGER-*` invariant changes.

## Events (operator-internal vs protocol)

- `operator.fee.applied` — **operator-internal** (never a payer-facing/protocol
  event; the fee is invisible by design).
- `application.settlement.created | completed | failed` — protocol-level lifecycle
  events for the settlement primitive (no fee amounts of the operator kind; the
  application-fee may appear in operator-internal projections only).

## Security & visibility

The protocol surface, public APIs, SDKs, and app UIs **never** expose: the
Operator Fee, the Pricing Engine, pricing rules, percentages, or commercial
contracts. Applications never choose, compute, or receive the Operator Fee — they
receive only the **net** result. (See `BANZA-PROTOCOL-VS-OPERATOR-POLICY`.)

## Forbidden / Permitted (per ADR-001)

- **Forbidden:** putting percentages, fee tables, or pricing formulas in the
  protocol; an operator inventing a fee/settlement shape no contract defines; an
  app computing or selecting an operator fee; mutating ledger entries to "apply" a
  fee.
- **Permitted:** the protocol defining BusinessCategory/PricingProfile/FeePolicyRef
  + the Operator-Fee and Application-Settlement primitives (references + lifecycle
  only); the operator owning the Pricing Engine and every number; apps consuming
  the net result and initiating Application Settlements.

## Consequences

- One generic mechanism serves every vertical; a donation application is merely
  the first consumer.
- The protocol stays free of commercial rules; operators evolve pricing without a
  protocol change.
- The ledger stays append-only and double-entry; the fee is an ordinary leg.
- A future federation ADR could let operators publish *capability* (not pricing)
  metadata; out of scope here.

## Alternatives considered

- *Fee as a percentage field on PaymentIntent* — rejected: leaks pricing into the
  protocol and the payer surface.
- *Net-only ledger (no fee leg)* — rejected: loses auditability/reconciliation of
  the operator's revenue; double-entry requires the leg.
- *One combined fee* — rejected: conflates the operator's infra charge with the
  application's service fee, which have different actors, timing, and visibility.

## Implementation sequencing (ADR-001, protocol → operator → SDK → apps)

1. **(this ADR)** protocol concepts + contracts.
2. **Operator:** the Pricing Engine (operator policy) + the Operator-Fee ledger leg
   on PaymentIntent fulfilment + the Application-Settlement primitive in the core.
3. **SDK:** expose `business_category` / `pricing_profile` on payment initiation +
   the application-settlement calls — never the fee.
4. **Apps:** a donation application first, then on-demand commerce / marketplace /
   crowdfunding, reusing the mechanism unchanged.
