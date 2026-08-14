# ADR-032 — Certification records and their lifecycle

## Context

Conformance evidence is a measurement at a moment. Something has to hold that measurement over time,
because the useful question is not "did these vectors pass once?" but "does this implementation hold a
current, in-scope demonstration?"

Recording that badly is easy and consequential. If the record names an entity, it becomes a statement
about a company and drifts toward reading as approval. If its standing is a free-form field, states
accumulate — pending, provisional, under review — until nobody can enumerate what a record can be. And
if a state can be set by hand, the record's meaning becomes whoever last edited it.

## Decision

**A certification record binds an implementation to a profile at a version with its evidence, and its
standing is a value of a closed state machine.**

Three objects. A **certified implementation** is the subject: a stable identifier plus the content hash
of the exact artifact set tested — never an entity, brand or company, so a different build is a
different subject needing its own record. A **certification profile** is the public, versioned yardstick.
A **certification record** is the result, hash-bound, scoped and time-limited.

A record means exactly: *this implementation passed this profile at this version with this evidence.* It
confers no status, licence, permission or authorisation.

**Standing is a closed enum.** A record is not certified (the baseline and the fail-closed default),
certified, expired, suspended, revoked, or superseded. The set is closed: an unreadable or unknown state
resolves to not certified.

**Transitions are a fixed table.** The permitted moves are: to certified on a fresh, validated record;
to expired when the validity window ends; suspension and its lifting, only within the window and only
while the evidence still reproduces; revocation from any live state, signed and dated; and supersession
by a newer record for the same implementation and profile line. Renewal is a brand-new record with new
evidence and a new window — never a reopened old one. Every other pair is forbidden.

**Revocation is terminal.** There is no path back to certified; a revoked implementation can only be
certified again through an entirely new record with fresh evidence.

No human, model or configuration effects a transition, and no transition ever manufactures validity
without fresh, reproducible evidence.

## Rationale

Binding the subject to an artifact hash rather than to an entity is what keeps certification a technical
statement. Entities do not pass vectors; builds do. It also removes a whole failure class — a company
cannot inherit its own past certification across a rewrite, because the hash changed.

A closed enum with a fixed table is chosen so the question "what can this record be, and how did it get
there?" has a finite answer that can be checked mechanically. An open status field would be simpler to
implement and impossible to reason about; a state nobody can enumerate cannot be validated, displayed
consistently, or fail closed safely.

Defaulting an unknown state to *not certified* is the fail-closed rule where it matters most: an
unreadable record must never be read as a valid one.

Making renewal a new record rather than an extension is the rule that keeps time-limitation meaningful.
Extending a window would let a record outlive the evidence that justified it, which converts a
measurement into a subscription.

Revocation being terminal reflects why revocation happens: it is used when the evidence was wrong or the
material is compromised, and reinstating the same record would assert that the same evidence is now
sound.

## Alternatives considered

**Certify entities rather than implementations.** Rejected: an entity is not what the vectors measured,
and an entity-level certificate is what would be mistaken for a licence.

**An open status field with documented conventions.** Rejected. Conventions are followed until they are
not, and a status nobody can enumerate cannot fail closed.

**Allow reinstatement after revocation.** Rejected: it would make revocation a temporary measure and
weaken every revocation signal in the system, including the ones a peer relies on to stop routing.

**Indefinite validity.** Rejected. Conformance is a measurement against a version at a moment; without a
window a record would eventually describe a specification that no longer exists.

## Consequences

- A record's meaning is bounded, checkable and identical to every reader.
- Every rebuild that changes the artifact set needs its own record.
- Renewal costs the full evidence path again, deliberately.
- A suspended record can be lifted only while its evidence still reproduces, so suspension cannot be
  used to park a failing implementation.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/certified-implementation.production.schema.json`](../../contracts/production/certified-implementation.production.schema.json)
- [`contracts/production/certification-profile.production.schema.json`](../../contracts/production/certification-profile.production.schema.json)
- [`contracts/production/certification-record.production.schema.json`](../../contracts/production/certification-record.production.schema.json)
