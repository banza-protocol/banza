# ADR-001 — Open financial protocol: what BANZA is and is not

The generic protocol-level models beneath a payment system — double-entry ledger, wallet/account implementation model, transaction FSM, routing, settlement semantics, QR protocol surface — have value beyond any single commercial deployment. When these models are built privately inside one operator's product, they become tightly coupled to that operator and inaccessible to contributors, researchers, and alternative operators.

That coupling creates:

- Invisible coupling: the protocol-level models are inseparable from a single product
- Contributor barrier: no way to experiment without access to private infrastructure
- Single-operator lock-in: the architecture cannot evolve to support multiple operators
- No external validation: invariants cannot be audited by the community

## Decision

BANZA is defined as an **open financial protocol**: a technology-neutral specification of protocol-level models for financial interoperability, published under Apache 2.0 at `github.com/banza-protocol/banza`.

The protocol is operator-neutral. It defines:
- Financial state-machine models (transactions, wallet/account models, settlement semantics)
- Invariant enforcement (zero-sum ledger, idempotency, atomicity)
- Provider interfaces (acquiring, routing, notification, risk)
- Protocol specifications (QR payload, webhook schemas, OpenAPI contracts)

The analogy is precise:
- BANZA = the open protocol standard
- The reference operator = the first independent implementation
- Future operators = further independent implementations

## Consequences

**Positive:**
- Community contribution is possible without access to private infrastructure
- Financial invariants are publicly auditable
- The architecture supports multiple independent operators
- No single operator is "the only possible implementation" — each operator is one implementation among many
- External trust increases: operators can inspect what they're running

**Negative:**
- Protocol evolution requires careful backwards-compatibility discipline (see ADR-001)
- Provider interfaces must be stable before operators build on them
- Maintaining separate repositories (public protocol + private operator implementations) adds coordination overhead

## Alternatives considered

**Keep everything private:** Rejected. Creates permanent contributor barrier and prevents ecosystem formation.

**Open-source an operator's entire product:** Rejected. An operator's implementation includes operational secrets, compliance rules, and provider credentials that cannot be public.

**Publish contracts only (no conformance suite):** Rejected. The value is in verifiable invariant enforcement and conformance test vectors, not prose specifications alone.

---

## Protocol/Operator Separation

After the protocol extraction (ADR-001), the boundary between "protocol core responsibility" and "operator responsibility" must be made explicit and durable. Without a formal boundary, operators would inevitably depend on undocumented protocol core internals, and the protocol core would accumulate operator-specific assumptions.

The risk is subtle coupling: a protocol core function that hardcodes a country-specific behaviour, an engine that assumes a specific provider, or a configuration value that only makes sense for one operator.

## Decision

The protocol core/operator split is governed by one rule:

> **The protocol core defines interfaces and invariants. Operators implement providers.**

Concretely:

| Protocol core responsibility | Operator responsibility |
|---|---|
| `AcquirerProvider` trait | Operator A's acquirer integrations (e.g. a card network, a mobile-money rail) |
| `RoutingEngine` + `RoutingRule` struct | Operator-specific routing table |
| `NotificationProvider` trait | Operator A's push-notification service |
| `RiskProvider` trait | Operator risk scoring heuristics |
| Ledger zero-sum invariant | Bank integration |
| Transaction state machine | Compliance rules |
| QR payload format | Custom QR branding |

**Forbidden in the protocol core:**
- Hardcoded provider names (specific acquirers, rails, or banks)
- Country-specific or currency-specific behaviour
- Any code that imports operator-specific types
- Business rules that differ by operator

**Required in the protocol core:**
- Every operator integration point is expressed as a trait
- Traits are documented with invariants the operator must uphold
- Illustrative operator implementations are conceptual examples only (see `examples/`), never part of the protocol

## Consequences

**Positive:**
- Multiple operators can build on the same protocol core without forking
- Protocol core evolves independently of operator business logic
- Contributors can understand the protocol core without understanding any operator
- Operator migrations (e.g., changing payment rails) don't require protocol core changes

**Negative:**
- More interface design discipline required upfront
- Some features that "just work" for the reference operator must be expressed as provider traits
- Reference implementations add maintenance overhead

## Alternatives considered

**Monolithic codebase with feature flags:** Rejected. Feature flags encode operator-specific decisions in the protocol core and grow unbounded.

**One protocol core per operator (forks):** Rejected. Defeats the purpose of an open protocol core; diverges immediately.

**Configuration files for operator behaviour:** Rejected for business logic. Config files can express values (TTLs, limits) but not behaviour (routing strategy, risk logic).

---

## Protocol-first product development

ADR-001/ADR-001 established that BANZA is the open protocol and that operators
implement it. The `BANZA-PROTOCOL-VS-OPERATOR-POLICY` determination answers the
**spatial** question — *"is X a protocol rule or an operator policy?"* — with a
litmus test on shared surfaces.

What that determination does **not** state explicitly is the **direction** in
which a *new structural concept* is allowed to travel. In practice, a reference
operator ships fast and is tempted to invent a financial/protocolar
concept directly in an app, then retrofit it into the protocol. A concrete
instance occurred on 2026-06-28: a "split charge" (cobrança dividida) flow was
built app-side as N independent payment links, with the grouping existing only
in the mobile UI. There is no `Collection` concept in the protocol, so the app
was, in effect, defining a payment-structuring behaviour the protocol does not
know about.

That inversion is the failure mode this ADR forbids. An app-level invention that
later "fits into" BANZA produces a concept whose canonical model, invariants,
events and conformance evidence were never designed — the protocol ends up ratifying an
implementation accident instead of specifying a concept.

## Decision

**Structural financial/protocolar concepts originate in the protocol and flow
downward — never upward.** The canonical direction of development is:

```
BANZA Protocol      (defines the canonical concept: model, invariants, events, contracts and conformance evidence)
        ↓
Operator            (implements the concept in its stack; persists state; reconciles; emits events)
        ↓
SDK                 (exposes the operator/protocol capability as typed APIs)
        ↓
Apps                (consume the capability; own UX only)
```

A new **structural concept** (a new financial object, a new way value is
grouped/structured/settled, a new lifecycle/state machine, a new event, a new
wire field) MUST be defined first by an ADR/RFC in `~/banza`, then implemented by
the operator, then exposed through SDKs, then consumed by apps.

Apps and SDKs MUST NOT define new financial/protocolar behaviour on their own.

## Architectural rule

This ADR is the **temporal/origination** companion to the **spatial** boundary in
`BANZA-PROTOCOL-VS-OPERATOR-POLICY`:

- The *policy* answers **where** a thing lives (protocol vs operator).
- This *ADR* answers **where a new concept must start** (protocol first) and the
  order in which it is allowed to reach an app.

The litmus test is unchanged: if the change introduces a new field in a wire
contract, a new manifest capability, a new certification criterion, a new
financial object, or a new value-structuring lifecycle, it is **protocol-first**
and requires an ADR/RFC in `~/banza` before any operator/SDK/app work.

Pure UX, pure presentation, and operator-only policy (KYC tiers, fees within
`INV-STL-001`, onboarding flows, internal authorization) remain operator-local
and need no protocol ADR — see the policy determination.

## Examples

**Allowed (downward flow):**

1. BANZA defines `Collection` (ADR-018). → The reference operator implements a
   Collections service that persists collections and shares. → The operator SDK
   exposes `collections.create(...)`. → The merchant app adds a "split charge"
   screen that calls the SDK. ✅
2. A merchant app adds a nicer animation, copy, or a QR layout. No new concept —
   pure UX. ✅
3. The reference operator tightens its KYC tier thresholds. Operator policy, no protocol ADR. ✅

**Forbidden (upward inversion):**

1. The merchant app invents "split charge" as N links grouped only in the UI,
   and the protocol is later asked to bless it. ❌ (this ADR's triggering case)
2. An SDK adds a `SplitGroup` object with its own `split_group_id` field that no
   protocol contract defines. ❌
3. An operator emits a `collection.completed` webhook that no protocol event
   contract specifies. ❌

## The Collection / Cobrança Dividida case

The 2026-06-28 split-charge flow is the canonical example of the inversion this
ADR prevents. The correct sequencing is:

1. **Protocol:** ADR-018 defines `Collection`, `CollectionShare`, `CollectionRule`,
   their states, events, and relationship to `PaymentIntent` / `Transfer` /
   ledger. (Proposed.)
2. **Operator:** once ADR-018 is Accepted, the reference operator implements
   Collections — persists collections + shares, generates a link/QR per share,
   reconciles share state from real payments, emits the protocol events, issues
   official receipts.
3. **SDK:** the operator SDK exposes the Collections API.
4. **App:** the merchant "split charge" UX is wired to the SDK.

Until step 1 lands, the app-side split-charge flow is **pre-protocol** and MUST
NOT be presented as an official feature. It is to be kept (if at all) behind a
disabled-by-default flag and documented as a prototype that anticipates ADR-018,
not as an implementation of it. (Operator-side classification: the reference operator's ADR-001.)

## Consequences

- New structural concepts incur an ADR/RFC step before code. This is intentional:
  the protocol gets a designed concept (model + invariants + events +
  conformance evidence) instead of a retrofitted implementation accident.
- Operators may still move fast on UX and operator-local policy without friction.
- The protocol remains the single source of truth for *what exists*; operators
  remain the source of truth for *how it is run*; apps remain the source of truth
  for *how it looks*.
- Reviewers (human or agent) have a one-line test: *"Does this introduce a new
  financial/protocolar concept? If yes, it starts in `~/banza`."*

### Forbidden

- An app creating new financial logic with no BANZA model behind it.
- An SDK inventing a protocolar object/field/event not defined by a contract.
- An operator shipping financial behaviour incompatible with, or unknown to, BANZA.
- A mobile/app feature becoming the de-facto "truth" of the protocol.

### Permitted

- Apps owning UX and consuming protocol capabilities the operator exposes.
- Operators implementing capabilities the protocol defines, plus operator-local
  policy (KYC/AML, fees within invariants, onboarding, internal authorization).
- SDKs exposing operator/protocol APIs as typed clients.
- Prototyping an anticipated concept **behind a disabled flag**, clearly marked
  pre-protocol, pending the relevant ADR.
