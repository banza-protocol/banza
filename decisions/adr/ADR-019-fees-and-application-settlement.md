# ADR-019 — Fees and application settlement

## Context

Two commercial mechanisms must exist without the protocol acquiring commercial opinions.

An operator charges for processing a payment. The rate depends on the merchant's business, the
commercial tier, a negotiated contract, the country and the currency — all of which are the operator's
business and none of which belong in an operator-neutral specification. But the *charge* must appear in
the ledger, because a fee that is not a ledger entry is money that moved without a posting.

Separately, a platform built on an operator pays out to a beneficiary — a marketplace to a seller, a
delivery application to a courier — on its own schedule, decoupled from the payments that funded it. The
protocol needs a mechanism for that without deciding when or how much.

## Decision

**The protocol carries references and structure. It never carries rates, formulas or commercial rules.**

Three reference concepts, all opaque to the protocol: a **business category** naming the economic nature
of a transaction; a **pricing profile** naming the counterparty's commercial tier; and a **fee policy
reference**, an opaque handle the operator alone resolves to a concrete charge. All three are references.
None carries a percentage.

There is no rate anywhere in the protocol — no table, no formula, no default. Those exist only in the
operator's own pricing engine.

**The operator fee** is computed by the operator at fulfilment, from inputs the protocol carries, and is
realised as one additional leg of the same balanced posting the fulfilment already produces: the payee is
credited the net, a fee account is credited the fee, the posting sums to zero. The fee is a ledger entry
like any other — irreversible, corrected only by a reversal posting. It is never payer-facing.

**Application settlement** is an optional, application-initiated payout to a beneficiary, decoupled in
time from the payments that funded it. The protocol defines the mechanism and the lifecycle; the
application decides when and how much.

## Rationale

Realising the fee as a leg of the existing posting rather than as a separate movement is the decision
that carries the weight. One posting means the fee cannot be applied without the payment, cannot be
applied twice, and cannot drift from it. A separate fee transaction would introduce a second thing that
must agree with the first, and every reconciliation problem in payments comes from two records that are
supposed to agree.

Keeping rates out of the protocol is what keeps it operator-neutral in a place where neutrality is easy
to lose. A default rate in a specification is a commercial position; an opaque policy reference is not.
It also means an operator can change pricing without any protocol change, which is the correct
allocation — pricing is not an interoperability concern.

Keeping the fee out of payer-facing surfaces follows from what a payer is owed: the amount they paid. The
split between payee and operator is a commercial arrangement between two other parties.

## Alternatives considered

**Carry the fee rate in the protocol so anyone can verify the split.** Rejected: it makes the protocol a
party to commercial arrangements, and the verification it offers is illusory since the operator computes
the fee regardless.

**Apply the fee as a separate posting after the payment.** Rejected. It creates a window in which the
payment exists without its fee, and two records that must be reconciled forever.

**Deduct the fee at settlement instead of at fulfilment.** Rejected: it detaches the fee from the
transaction that generated it, which makes per-transaction reconciliation impossible.

**Let the protocol define settlement schedules.** Rejected as a product decision — timing is the
application's business, and a protocol-mandated schedule would constrain business models for no
interoperability gain.

## Consequences

- Fees are always balanced, always attributable to one payment, and never silently applied.
- Operators change pricing freely; no protocol change is involved.
- The protocol cannot answer "what was the fee rate?", by design.
- Application settlement exists as a mechanism with a lifecycle, and its policy stays with the
  application.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/fees/`](../../contracts/fees/)
- [`contracts/settlements/`](../../contracts/settlements/)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-STL-*`, `INV-LEDGER-*`
