# ADR-012 — Double-entry ledger and monetary precision

## Context

A payment system's ledger is where errors become permanent. Two failure modes account for most of them,
and both are avoidable by construction rather than by care.

The first is single-entry accounting: value is recorded as a change to a balance, so an interrupted or
partially applied operation leaves money that exists on one side and not the other, with nothing in the
data able to detect it. The second is floating-point arithmetic: binary floating point cannot represent
most decimal fractions exactly, so repeated arithmetic drifts, and the drift appears in reconciliation
months later as a discrepancy nobody can attribute.

## Decision

**Double-entry bookkeeping over an immutable, append-only ledger, with all monetary amounts as integer
minor units.**

Every monetary movement is one posting composed of entries whose signed amounts sum to zero. There is no
such thing as a movement that debits without crediting. Balances are derived from entries and are never
written directly — a stored balance is a cache of a derivation, never a source of truth.

The ledger is append-only. A mistake is corrected by a compensating posting, not by editing or deleting
the original.

Monetary values are integers in the currency's minor unit throughout: in storage, in arithmetic, on the
wire and in signed artifacts. No floating-point type appears anywhere in the monetary path.

## Rationale

Double entry makes imbalance representable but detectable: any state that violates the zero-sum property
is visibly invalid, so a partially applied operation can be found by inspection rather than inferred
from customer complaints. That is a stronger guarantee than careful code, because it survives the code
being wrong.

Ledger-derived balances remove the one bug that reliably destroys reconciliation — a balance and its
entries disagreeing. If the balance is a derivation, disagreement is not expressible.

Append-only makes history a fact rather than a claim. It is also what makes external reconciliation
possible at all: a counterparty can be shown the postings, and their sum is the answer.

Integer minor units are the smallest sufficient decision. The alternative — a decimal type — is also
correct and requires every implementation to agree on a decimal library and its rounding; integers
require agreement on nothing, which is what a protocol implemented independently in many languages
needs. It also composes with `BCJ/1`, whose profile excludes fractional numbers precisely because this
decision means none are needed.

## Alternatives considered

**Single-entry with balance updates.** Simpler and faster, and rejected because an interrupted operation
is undetectable afterwards. Performance is not the constraint that binds here.

**Decimal fixed-point types.** Correct, and rejected for portability: it requires every independent
implementation to match rounding behaviour exactly, which is a subtle agreement to reach in several
languages at once.

**Mutable ledger with corrections in place.** Rejected. It makes history a function of the last edit and
removes the audit trail that reconciliation depends on.

**Eventual balance reconciliation from an event stream.** Rejected: the window in which a balance is
knowably wrong is a window in which money can be spent twice.

## Consequences

- Every movement is balanced by construction, and imbalance is a detectable state rather than a silent
  one.
- Corrections add entries, so the ledger grows monotonically and never loses its history.
- Amounts cannot be represented in a floating-point field anywhere, including in a convenience API.
- The `BCJ/1` integers-only profile rule follows from this decision rather than constraining it.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-LEDGER-*`, `INV-WALLET-*`, `MON-*`
- [`spec/invariants.md`](../../spec/invariants.md)
