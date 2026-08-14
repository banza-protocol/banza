# ADR-037 — Operator onboarding

## Context

Validation runs against public endpoints and costs real resources — fetches, engine execution, stored
receipts. Exposing that to anonymous callers makes it a free amplification service, and the obvious fix
is an account system with passwords, sessions and recovery flows.

That fix is disproportionate and it is a liability: passwords must be stored, reset flows become the
attack surface, and the protocol acquires custody of credentials it has no need for. It also risks
something worse — an onboarding step that decides who may participate would be the central gate the
trust model exists to remove (ADR-025).

## Decision

**Onboarding is a service of the human interface, not a rule of the protocol, and it closes nothing.**

It exists to do four things: protect the public validation resources from abuse, hold a candidate's
work-in-progress privately, let a candidate resume, and let them request publication in the registry.

Each concern has exactly one job:

> The email authenticates the person. The domain confirms the origin. The endpoints supply the
> artifacts. Engines verify. Receipts fix the results. The registry publishes the verifiable state.

Authentication is passwordless — a one-time code to an address — so no credential is stored and there is
no password to reset, phish or leak. Origin control is proved by publishing a challenge at the origin
being claimed, single-use, so a claim is demonstrated rather than asserted. A candidacy is private until
its holder asks for publication.

The boundary is what matters most: **onboarding never decides conformance.** It gates access to a shared
resource. An implementation that never onboards can still be validated by any third party from its
public endpoints, because everything the evaluation needs is public (ADR-031). Nothing about
participation depends on this service existing.

## Rationale

Passwordless authentication is chosen because of what it removes rather than what it adds. There is no
credential store to breach, no reset flow to abuse, and the recovery path is the same as the login path.
For a service whose only job is rate protection and resumption, storing passwords would be accepting a
permanent liability to solve a temporary problem.

Proving origin control by publication rather than by assertion is the same principle as the rest of the
trust model: a claim that can be checked beats a claim that must be believed. Single use prevents a
published challenge from being replayed by someone who merely observed it.

Keeping candidacies private until publication is requested lets an implementer fail privately. Public
failure as the price of trying is a strong deterrent to trying, and there is no reason the protocol
needs to see incomplete work.

Simplicity: an identity that is an email address and an origin, with no profile, no roles and no
organisation model, cannot grow into an identity platform by accident.

## Alternatives considered

**Open, unauthenticated validation.** Rejected: it makes an outbound-fetching service available to
anyone as an amplifier, with no way to attribute or limit use.

**Accounts with passwords.** Rejected. It solves the same problem while acquiring credential custody and
a reset flow, both of which are larger risks than the one being addressed.

**Federated sign-in through an external identity provider.** Rejected: it makes participation depend on
a third party's continued willingness to serve, which is the coupling the architecture avoids
everywhere else.

**Approve candidates before allowing validation.** Rejected outright — that is the central gate the
trust model removed, reintroduced under an administrative name.

## Consequences

- Public validation resources are protected without the protocol holding credentials.
- Origin control is demonstrated rather than claimed, and cannot be replayed.
- Onboarding can be removed entirely without affecting what conforms or how anything is verified.
- Access to the hosted service depends on receiving email, which is an availability dependency of the
  service and not of the protocol.

---

## Normative authority

The decision above is explanatory, and onboarding is deliberately outside the normative surface: no
conformance path routes through it. What binds an implementation is the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
