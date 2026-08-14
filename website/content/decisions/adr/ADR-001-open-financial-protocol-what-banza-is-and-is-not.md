# ADR-001 — Open financial protocol: what BANZA is and is not

## Context

The models beneath any payment system — a double-entry ledger, an account model, a transaction state
machine, settlement semantics, a QR payload — are not commercially distinctive. Every operator needs
them and every operator builds them again. Built privately inside one product, they become inseparable
from that product: nobody outside can audit the invariants, nobody can implement against them, and the
architecture acquires assumptions that only make sense for one company.

The first question this architecture has to answer is therefore not *how* to build a payment system but
*what BANZA is*, and — harder, and more often left vague — where it ends.

## Decision

**BANZA is an open financial protocol: a technology-neutral specification of the protocol-level models
for financial interoperability, published under Apache 2.0.**

It defines financial state models, invariant enforcement, integration interfaces and wire contracts. It
is implemented by operators, who are separate parties, and it does not implement any of them.

What BANZA is **not**, stated as flatly as what it is, because every one of these has been assumed of it
at some point: it is not a bank, a payment service provider, an e-money institution, a wallet or a
financial operator. It does not hold funds, does not move funds, does not settle, does not run client
accounts, does not issue licences, does not authorise anyone to provide financial services, and does not
replace a regulator or a scheme. It assumes none of the participants' financial responsibilities.

## Rationale

BANZA is a specification rather than a service because the properties it exists to provide —
auditability, independent implementation, survival beyond any one company — are properties of published
rules, not of running software. A service can be withdrawn. A specification with public vectors cannot.

The negative half of the definition is load-bearing rather than defensive boilerplate. A protocol that
publishes trust material and conformance results, in the financial domain, will be read as granting
permission unless it says continuously and structurally that it does not. Every later decision about
certification, registries and trust inherits its boundary from this one, and the architecture keeps
returning to it: certification confers no status, the registry vouches for nobody, the root signs no
statement about any operator.

Simplicity: this decision introduces no mechanism at all. It is the smallest possible architectural
statement — a definition and a boundary — and everything mechanical is downstream of it.

## Alternatives considered

**Keep the models private inside one product.** Simplest by a wide margin, and the reason it is rejected
is not openness as a value but reachability: an invariant nobody can inspect cannot be trusted by a
counterparty, and a protocol with one possible implementation is a product with an ambitious name.

**Open-source an operator's entire product.** Rejected: an operator's implementation contains
credentials, compliance policy and commercial rules that cannot be public, and publishing it would
publish one operator's choices as though they were the protocol's.

**Publish prose contracts with no conformance suite.** Rejected. Prose cannot be executed, so
conformance would be a matter of opinion, and a claim of conformance would carry no information.

## Consequences

- Invariants are publicly auditable, and a counterparty can check an implementation rather than trust a
  reputation.
- Multiple independent operators are possible by construction; no implementation holds a privileged
  position, including the reference one.
- Protocol evolution needs compatibility discipline, because published contracts have consumers who did
  not agree to change with them.
- The boundary must be restated on every public surface. This is real, recurring editorial cost, and it
  is the price of not being mistaken for a licensing authority.

---

## Normative authority

The decision above is explanatory. What binds an implementation is the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
