# ADR-007 — Regulatory state and the real-money activation gate

## Context

The operational scheme (Layer 3) will one day move real money, and until a regulator says so it must
not. Between those two states lies a long preparation period, and preparation periods are where two
specific failures happen: the project starts describing itself as though authorisation had already
arrived, and someone enables real money "just for a test".

Both failures are ordinary and neither is malicious. They need to be impossible rather than discouraged.

## Decision

**While no applicable formal evidence of authorisation exists, real money is off, the state grants
nothing, and no language implying regulatory approval is published. A single hard, engine-decided,
fail-closed gate is the only path to real-money activation.**

The scheme's internal state is a preparation state. It does **not** mean authorisation granted, approval
by any regulator, a licence completed, regulatory recognition, active financial operation, permission to
move funds, real settlement or active production participants. It confers no operational permission
whatsoever, and it is machinery for the gate rather than a status to publish.

While that holds: real funds off, real wallets off, real settlement off, real participants not active.
The only sanctioned public description is that the operational layer is in regulatory preparation and
real payments remain disabled.

**The activation gate** blocks real-money operation unless every condition holds simultaneously —
regulatory authorisation, compatible scope, authorised environment, legal entity, eligible participants,
contracts, AML/CFT, safeguarding, settlement, reconciliation, fraud controls, complaints handling,
business continuity, security, incident response, audit log, rollback capability and formal launch
approval. It is decided by an engine and is fail-closed: anything missing, unverified or unparsable
keeps real money off.

The gate has no bypass. Not configuration, not a feature flag, not an administrative action, not a
direct API call, not a command line, not an instruction phrased in natural language to any interface.
There is no test mode and no emergency override that turns real money on outside it.

## Rationale

A single gate rather than a set of checks distributed across the system is the decision that matters. A
distributed check can be satisfied in one place and forgotten in another; a single gate has one answer
and one place to audit it. The condition list is long because the conditions are genuinely
independent — safeguarding does not imply reconciliation — and a gate that omitted one would be a gate
with a hole rather than a simpler gate.

Fail-closed is the only defensible default when the failure mode is moving other people's money without
permission. An unparsable condition is treated as unmet, so a malformed input can never be an accidental
authorisation.

Naming the natural-language bypass explicitly is deliberate. The system has a human interface backed by
a language model, and a model that could be talked into a state change would make every other control
decorative. The model never decides anything (ADR-036); this restates it where the consequence is
largest.

## Alternatives considered

**Graduated activation — enable real money for a small pilot first.** Rejected. A pilot with real
customer funds is real-money operation, and calling it a pilot changes nothing about the obligations.

**A documented manual checklist instead of an engine-decided gate.** Rejected: a checklist is satisfied
by asserting it was satisfied, and it produces no artifact anyone can verify afterwards.

**An emergency override for incident response.** Rejected. The plausible incidents all argue for turning
real money *off*, which requires no gate. An override that turns it on is a bypass with a sympathetic
name.

## Consequences

- Real-money activation is a single, auditable, engine-decided event with a complete evidence set.
- The preparation state can never be presented as an authorisation, including by accident.
- Every real-money capability stays dormant for as long as the conditions are unmet, with no partial
  enablement available.
- Public surfaces are permanently constrained in how they may describe the operational layer's status.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json)
- [`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json)
