# ADR-003 — Protocol-first origination

## Context

ADR-002 answers the *spatial* question — does this belong to the protocol or to an operator? It does not
answer the *temporal* one: where is a genuinely new concept allowed to start?

The pressure runs one way. An operator shipping a product invents a structure because a customer needs
it this week, ships it in an app, and the protocol is later asked to bless what already exists. The
concept then arrives fully formed and badly formed: its state model was never designed, its invariants
were inferred from an implementation, its events are whatever the app happened to emit, and the
protocol ends up ratifying an accident.

## Decision

**A new structural financial concept originates in the protocol and flows downward — never upward.**

```
BANZA Protocol   defines the concept: model, invariants, events, contracts, conformance evidence
      ↓
Operator         implements it, persists state, reconciles, emits the defined events
      ↓
SDK              exposes the capability as a typed client
      ↓
Application      consumes the capability and owns presentation only
```

A **structural concept** is a new financial object, a new way value is grouped or settled, a new
lifecycle, a new event, or a new wire field. It is specified before it is implemented. Applications and
SDKs do not define financial behaviour of their own.

Presentation, and operator-local policy — identity-verification tiers, fees within the invariants,
onboarding, internal authorisation — are outside this rule entirely and need no protocol change.

## Rationale

The direction matters because of what each layer can and cannot see. The protocol layer is the only one
positioned to ask whether a new object is consistent with the ledger invariants, whether it can be
expressed in the wire contracts, and whether an independent implementation could reproduce it. An
application layer can see none of that, so a concept originating there is designed against the one
constraint set that does not include correctness.

Retrofitting is not merely late; it produces a worse artifact. A concept reverse-engineered from a
shipped feature inherits that feature's incidental choices as though they were requirements, and the
conformance vectors then encode an accident permanently.

Simplicity: this decision adds no mechanism at all. It is an ordering rule, and the cost is one
specification step before code.

## Alternatives considered

**Let implementations lead and standardise what survives.** This is how many successful protocols
formed, and it is rejected here for a specific reason: BANZA's certification model binds an
implementation to public vectors, so a concept without designed vectors cannot be certified against
anything. Standardising after the fact would mean certifying against whatever the first implementation
did.

**Allow SDK-level extension with a reserved namespace.** Rejected for structural concepts, accepted
implicitly for reason codes, where a namespaced extension cannot change a verdict (ADR-021). The
difference is that an extension reason code explains an outcome, while a new financial object changes
what outcomes exist.

## Consequences

- A new concept costs a specification step before any code. This is the intended friction.
- Operators keep full speed on presentation and local policy, which is where most of their work is.
- The protocol remains the single answer to *what exists*; operators to *how it is run*; applications to
  *how it looks*.
- A reviewer has one test: does this introduce a new financial concept? If so, it starts in the
  protocol.

---

## Normative authority

The decision above is explanatory. It binds no implementation: it governs the order in which the
protocol's own artifacts are produced. What binds an implementation is the surface indexed by
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json).
