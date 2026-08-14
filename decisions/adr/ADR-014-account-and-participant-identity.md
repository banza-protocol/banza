# ADR-014 — Account and participant identity

## Context

A payment protocol has to decide what a payment fundamentally *is*, because everything else follows from
it. The dominant model in the industry is card-first: a payment is an authorisation against an
instrument issued by a scheme, and accounts, settlement and disputes are arranged around that.

That model carries assumptions BANZA cannot make. It presumes card issuance, scheme membership and
acquiring relationships as prerequisites for accepting a payment, which excludes most participants in
the markets this protocol is built for, where value moves between people and small merchants without
any card in sight.

The protocol also needs an addressing story. An account identifier is a machine fact; humans need
something they can say aloud and put on a shopfront.

## Decision

**BANZA defines an account-based participant identity model. The canonical payment operation is a ledger
transfer between two participant accounts — not a card transaction.**

Everything derives from that one primitive: consumer to merchant is a payment, consumer to consumer a
transfer, merchant to consumer a refund. There is no separate mechanism per direction.

Two addressing layers sit above it. A **QR payload** encodes an account reference with an optional
amount and description, making initiation work in person and in print. A **handle** — the `@banza`
namespace — is the human-readable identity layer: a handle resolves to an account identifier, and users
exchange handles rather than account numbers. The namespace is permanent and independent of any product
naming.

BANZA itself is not a wallet, does not operate accounts, does not authorise or complete payments, and
does not hold, move or settle funds. The model is what operators implement; the accounts are theirs.

## Rationale

Choosing the transfer as the primitive rather than the authorisation is what makes the protocol
implementable without scheme membership. It also collapses the operation set: a refund is a transfer in
the other direction rather than a separate protocol with its own lifecycle, which removes an entire
class of asymmetry bugs.

Card support is not excluded by this decision — a card rail is an acquiring integration behind the
provider interface (ADR-002), and it settles into the same account model. The decision is about what is
*canonical*, not what is possible.

Handles are a genuine architectural decision rather than presentation. Once an identity layer is public
and permanent, participants build on it and it cannot be withdrawn, so it belongs in the protocol with
its stability stated. Keeping the namespace independent of product naming means a future rebrand of any
product cannot invalidate anyone's address.

## Alternatives considered

**Card-first, aligned with existing scheme infrastructure.** Rejected: it makes scheme membership a
precondition for participation and excludes the majority of intended participants.

**Account numbers only, with no human-readable layer.** Rejected. Payment addresses are exchanged
verbally and in messages, and an unsayable identifier pushes users toward screenshots and copy-paste,
which is where they get defrauded.

**Federated handles resolved through the operator's own domain.** Considered and deferred: it decentralises
naming, and it makes an address depend on an operator's continued control of a domain, which is exactly
the coupling ADR-002 removes.

## Consequences

- One primitive covers payments, transfers and refunds, so there is one lifecycle to specify and to test.
- Participation needs no card issuance or scheme membership.
- The handle namespace is a permanent commitment: it cannot be renamed without breaking every published
  address.
- Card rails remain available as provider integrations, settling into the same accounts.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-IDENT-*`, `INV-WALLET-*`
- [`contracts/qr/`](../../contracts/qr/) — the QR payload contract
- [`contracts/openapi/`](../../contracts/openapi/) — the account and transfer operations
