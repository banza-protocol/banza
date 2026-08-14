# ADR-020 — Transaction proof and public verification

## Context

A receipt is a screenshot. That is the practical situation across most payment channels: the evidence a
payer gives a payee that money was sent is an image, which is trivially fabricated, and the payee's only
recourse is to wait for the money to appear.

The problem is not the image but the absence of anything to check it against. What is missing is a way
for anyone holding a reference to ask the operator's ledger directly, and get an answer that does not
depend on trusting whoever handed over the reference.

## Decision

**A transaction proof is an immutable, publicly verifiable assertion that a transaction exists in an
operator's ledger, with its real amount, parties and status. Verification is public and needs no
account.**

A proof is identified by a reference that only *locates* a transaction. The reference carries no
financial data, no personal data, and is not a signature — it is a lookup key, and it is
non-enumerable, so holding one grants nothing about any other.

An operator that issues receipts exposes both a human verification surface and a machine verification
API for the same proof, answering from the ledger at the moment of the request rather than from a cached
assertion. The response states what is necessary and nothing more: it exposes no account identifiers, no
balances and no internal structure.

Signature keys are identified so they can rotate, because a verification surface that cannot rotate keys
is a surface that must be rebuilt when a key ages.

Two things the design refuses. A verification result never presents a document as the source of truth —
the ledger is, and the document is a pointer to it. And a verification link carries only the reference:
never an amount, a party, a handle or a signature in a URL, because URLs are logged, shared, and pasted
into places their author did not intend.

## Rationale

Answering from the ledger at request time is what makes the proof worth more than the receipt it
replaces. A cached assertion is a screenshot with better formatting; a live answer reflects reversals,
disputes and corrections, so a proof checked today tells the truth today.

Non-enumerable references are the whole privacy design. If references were sequential, public
verification would be a public index of every transaction, and the feature that gives payees confidence
would give everyone else a ledger dump. Non-enumerability is what lets verification be public without
being an exposure.

Keeping data out of URLs is a small rule with a large effect. Anything in a URL leaks through browser
history, referrer headers, proxies and chat previews, and a reference that must stay opaque cannot be
accompanied by the amount it refers to.

## Alternatives considered

**Signed receipts verified offline.** Attractive, and rejected: an offline signature proves the operator
asserted something once, not that it is still true. A reversed payment keeps a valid signature.

**A shared public transaction index across operators.** Rejected. It would require operators to publish
transaction data centrally, which is both a privacy exposure and a coupling the protocol exists to
avoid.

**Verification requiring an account.** Rejected: the payee receiving an unfamiliar payment is exactly the
party who needs to verify it and is least likely to hold an account with that operator.

## Consequences

- Anyone holding a reference can check a transaction against the issuing operator's ledger, with no
  account.
- The answer reflects current state, so a proof cannot outlive the fact it asserts.
- Operators carry a public verification surface as an obligation of issuing receipts.
- References must be generated non-enumerably, which constrains identifier design permanently.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/proofs/transaction-proof.schema.json`](../../contracts/proofs/transaction-proof.schema.json)
- [`contracts/proofs/verification-response.schema.json`](../../contracts/proofs/verification-response.schema.json)
