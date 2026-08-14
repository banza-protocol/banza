# ADR-005 — Certification, admission and authorisation do not propagate

## Context

Three determinations exist around BANZA, and they look similar enough from outside to be mistaken for
stages of one process:

- **Technical certification** — an implementation demonstrated conformance against a public profile;
- **Scheme admission** — a scheme accepted an entity as a participant;
- **Regulatory authorisation** — a regulator permitted an entity to conduct regulated financial activity.

The natural reading is a pipeline: pass the tests, join the scheme, become authorised. That reading is
wrong in every direction, and acting on it is expensive — a merchant who believes a certified
implementation is an authorised institution has been misled about who is holding their money.

## Decision

**The three determinations are distinct, have distinct owners and distinct evidence, and none implies,
grants, accelerates or substitutes for another — in either direction.**

| Determination | Decided by | On the evidence of |
|---|---|---|
| Technical certification | The conformance engine, over public profiles | Reproducible vector execution against a specific artifact set |
| Scheme admission | The scheme | Its own due diligence, eligibility rules and contracts |
| Regulatory authorisation | The competent regulator | The applicable legal framework |

Certification never admits anyone to a scheme. Admission is never regulatory authorisation. And nothing
propagates backwards either: an authorised institution is not thereby certified, and a scheme participant
is not thereby conformant.

No surface — site, documentation, interface, registry or record — may present the three as equivalent, as
a single "approved" badge, or as a sequence where one automatically yields the next.

## Rationale

Non-propagation is not a caution; it follows from what each determination measures. Certification is a
statement about a build: run these vectors against this artifact set and observe this result. Admission
is a statement about a commercial relationship. Authorisation is a statement about an entity's legal
standing. None is evidence for another because none is measuring the other's subject — and a valid
certificate for an implementation says nothing about the solvency, conduct or legal standing of whoever
runs it.

Stating this as an architectural rule rather than a disclaimer is what makes it enforceable. A
disclaimer is editorial and can be dropped in a redesign; a rule that no surface may conflate them can
be checked, and is.

Security by construction: the failure mode here is a reader acting on borrowed authority. The
architecture removes the borrowing rather than warning against it.

## Alternatives considered

**A single "BANZA approved" status combining all three.** Rejected, and it is worth naming why it is
tempting: it is simpler for users and it is what users initially ask for. It would also be a claim BANZA
cannot make, since two of the three determinations belong to other parties entirely.

**Certification as a prerequisite that automatically triggers admission.** Rejected. A scheme may
require certification — that is its choice — but automatic admission would move the admission decision
to the conformance engine, which knows nothing about the scheme's obligations.

**Silence — define each separately and never state the relationship.** Rejected: the conflation happens
by default, so the relationship must be stated explicitly to be absent.

## Consequences

- Each determination must be established on its own evidence by its own owner, every time.
- An implementation may be certified and never join any scheme. That is an ordinary outcome, not an
  incomplete one.
- Public surfaces carry more words than a single badge would, permanently.
- The registry publishes certification facts only, and can never be read as a list of authorised
  institutions (ADR-033).

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/production/implementation-record.production.schema.json`](../../contracts/production/implementation-record.production.schema.json)
- [`contracts/production/operator-record.production.schema.json`](../../contracts/production/operator-record.production.schema.json)
