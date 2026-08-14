# ADR-009 — Licence, trademark and open governance

## Context

An open protocol created by a company faces a pair of opposite misreadings, and both are damaging. If
attribution is prominent, the protocol reads as one company's asset with an open-source veneer. If
attribution is absent, the origin is obscured and the trademark position is unclear, which invites
someone else to ship a confusingly named implementation and call it BANZA.

Four separate concerns get tangled here: what the licence covers, who created the work, who may use the
names, and who decides what happens next. Answering them in one document guarantees they contaminate
each other — the usual result being a licence with institutional narrative embedded in it, which is no
longer the licence it claims to be.

## Decision

**Four concerns, four artifacts, no overlap.**

| Concern | Artifact | Rule |
|---|---|---|
| Licence | `LICENSE` | Apache 2.0, canonical and unmodified — no added restriction, no narrative inside the licence body |
| Attribution | `NOTICE` | Banzami is the original creator and initial institutional maintainer |
| Marks | `TRADEMARKS.md` | The licence grants no trademark rights; names and logos are governed separately |
| Governance | `GOVERNANCE.md`, `MAINTAINERS.md` | Governance is open **today**, through the public repository |

Two statements hold simultaneously and neither may be dropped: open governance does not imply
unrestricted use of the marks, and control of the marks does not imply private control of protocol
governance.

Governance is described in the present tense. It is not a promise to open something later.

## Rationale

Keeping the licence unmodified is the decision with the most practical value. A modified Apache licence
is a bespoke licence: it must be assessed individually by every legal team that encounters it, which
converts a five-second decision into a procurement question. Everything institutional therefore lives
outside it, where it can be read without changing what the licence means.

Separating marks from licence protects the property that actually matters for a protocol — that "BANZA"
identifies this protocol. A permissive code licence with no trademark grant lets anyone implement
freely while keeping the name meaningful, which is the combination interoperability needs.

Stating governance as a present fact rather than an intention is what makes it checkable. An intention
is unfalsifiable; a claim that governance happens in the public repository can be verified by looking.

## Alternatives considered

**A copyleft licence.** Rejected: operators must be able to implement inside proprietary stacks, and a
copyleft obligation would make the protocol unusable for exactly the participants it needs.

**A custom licence with attribution and trademark clauses.** Rejected. It buys a little tidiness and
costs the "standard licence, no review needed" property, which is worth far more.

**No trademark policy.** Rejected: without one the boundary is implicit, and an implicit boundary is
resolved by whoever acts first.

## Consequences

- Third parties use, study, modify and distribute the covered work under Apache 2.0 without asking
  anyone, while the marks stay protected.
- The four concerns can each change without disturbing the others.
- Attribution is permanent and factual, and cannot be read as continuing private control.
- The wording of these statements is guarded, because their value lies precisely in their being
  unambiguous.

---

## Normative authority

The decision above is explanatory. The binding artifacts are `LICENSE`, `NOTICE` and `TRADEMARKS.md`,
which are listed in
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
