# ADR-040 — BANZA R²S²: the four fundamental principles

## Context

BANZA had no named set of fundamental design principles. It had a great deal of *doctrine* — the
Reference chapter on what the protocol guarantees, the Whitepaper's architectural invariants, the
normative requirements themselves — but nothing that answered the question an architect actually faces:
*by what criteria do we decide?*

In practice a trio was being used informally in review — simple, secure, robust — and it appeared
nowhere in the repository. A criterion that exists only in the heads of the people applying it is not a
criterion; it is a habit, and it dies with the habit.

The gap that made this urgent was **resilience**. Every decision so far had been examined for
correctness under attack and for minimality. None had been systematically examined for what happens when
a dependency fails. The Root Authority work exposed the shape of the problem: `INV-ROOT-009` promised
that losing a seat could not compromise continuity, and nothing implemented it, because "what happens
when this fails?" was not a question the process required anyone to answer.

## Decision

**BANZA has exactly four fundamental principles, and they are named BANZA R²S².**

| | Principle | Formal meaning |
|---|---|---|
| **R** | **Robust** | deterministic and correct under independent implementation, adversarial input and boundary conditions |
| **R** | **Resilient** | contains failures, preserves safe operation where possible and recovers deterministically without weakening protocol guarantees |
| **S** | **Secure** | critical properties are enforced by construction and fail closed when they cannot be established |
| **S** | **Simple** | uses the smallest mechanism sufficient to provide the required property |

The public short form is **R²S²**; the ASCII form, where superscripts are not technically appropriate,
is `R2S2`. The first occurrence in any document expands to *Robust · Resilient · Secure · Simple*. That
order is canonical and does not vary.

**These four are the only thing BANZA calls its fundamental principles.** Three other layers of doctrine
exist, and they are deliberately distinct:

```
R²S² fundamental principles     the criteria by which decisions are made
        ↓
protocol structural properties  what the protocol must possess
        ↓
architectural invariants        structural constraints the architecture may not violate
        ↓
normative requirements          what an implementation must do
        ↓
layered assurance gates         whether any of it is actually demonstrated
```

The Reference chapter that previously carried the title *Princípios Fundamentais* keeps every one of its
properties — financial correctness, neutrality, public and versioned rules, deterministic decision,
evidence and reproducibility, explicit scope, fail-closed, separation of responsibilities — and is
classified as **structural properties**. Nothing was deleted to make room for R²S². The collision was
terminological, not substantive: those items describe what the protocol *has*, and R²S² describes how it
is *built*.

Every architectural decision must answer four questions, and a decision that cannot is reconsidered:

- **Robust** — will independently built implementations still behave correctly and deterministically?
- **Resilient** — what happens when this component or dependency fails?
- **Secure** — can failure, attack or fallback violate trust or protocol invariants?
- **Simple** — is this the smallest mechanism that provides the required properties?

## Rationale

Four is the number that survived. Fewer, and resilience keeps being folded into security, where it
disappears: security asks whether an attacker can break the property, resilience asks what happens when
nothing is attacking and something simply stops. Those are different questions with different answers,
and the second one was the one BANZA was not asking.

Naming the set matters more than it appears. An unnamed criterion cannot be cited in a review, cannot be
guarded, and cannot be pointed at when a decision is contested. `R²S²` is short enough to be used in
practice, which is the only property a name needs.

**Resilience is placed second, and constrained immediately.** Availability is the easiest property to
buy with someone else's safety: continue when trust cannot be established, accept the unsigned copy,
extend the expiry, retry with weaker checks. Each of those makes a system look more available and makes
it worth less. So the principle carries its own boundary — resilience preserves safe operation and
deterministic recovery under failure; it never permits bypassing trust, authorization, integrity or any
other protocol invariant merely to remain available.

**Simple is last, and it is not decoration.** Robust, Resilient and Secure each push toward more
machinery: more validation, more redundancy, more checks. Without a principle pushing back, that ends in
an architecture nobody can independently implement — which loses Robust, the property the other three
exist to protect. Simple is the constraint that keeps the first three from consuming each other.

The four are not independent, and are not meant to be. Trust minimization and separating critical
authority follow from Secure and Resilient together. Decentralizing authority where concentration
creates systemic risk is a derived decision, not a principle. Independent implementability is the
central expression of Robust. None of these becomes a fifth principle: a set of principles that grows
whenever something important is noticed is a list, not a set of criteria.

## Alternatives considered

**Keep three and treat resilience as part of security.** Rejected: it is what BANZA was already doing,
and it produced an invariant that promised continuity with nothing behind it. Security answers "can this
be broken?"; resilience answers "what happens when it stops?". Collapsing them loses the second question.

**Add a fifth principle for decentralization or trust minimization.** Rejected. Both are conclusions
reached by applying Secure and Resilient to a concrete risk, not criteria for reaching conclusions.
Promoting a conclusion to a principle is how a principle set becomes a slogan list, and it would invite
distributing authority where distribution adds complexity without reducing a material risk.

**Rename the Reference chapter's properties as the principles.** Rejected: those are properties the
protocol must possess, not criteria for designing it. They answer "what is true of BANZA?" — R²S²
answers "how do we decide?". Two sets under one name would have made the drift guard meaningless from
the day it was written.

**Leave the principles unnamed and rely on review discipline.** Rejected — this was the status quo, and
it is precisely why resilience went unasked for as long as it did.

## Consequences

- Every future architectural decision must answer the four questions, and the answer to *Resilient* may
  no longer be silence.
- Public surfaces state exactly four fundamental principles in the canonical order. A fifth, or a silent
  removal, is a guard failure rather than an editorial drift.
- The Reference's structural properties and the Whitepaper's architectural invariants continue unchanged
  in substance; only their classification is now explicit.
- Claiming the principles is not claiming the outcomes. That BANZA is *designed around* R²S² does not
  assert demonstrated production fault tolerance, a demonstrated independent implementation, or zero
  downtime; concrete guarantees remain scoped per subsystem and profile.

---

## Normative authority

This record is explanatory. R²S² is a design discipline, not a wire requirement: it constrains how
normative artifacts are written, and it is not itself one. What binds an implementation remains the
artifacts identified by the [Normative Manifest](../../contracts/production/normative-manifest.json).

Whether a property the principles demand has actually been demonstrated is decided by the layered
assurance gates — [ADR-041](ADR-041-layered-assurance-gates.md).
