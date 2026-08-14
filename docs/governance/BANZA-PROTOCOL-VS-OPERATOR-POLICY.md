# BANZA — Protocol vs Operator Policy

**Status:** Determination · **Date:** 2026-06-13 · **Authority:** ADR-001, ADR-001, ADR-035, ADR-035, ADR-001
**Purpose:** A single, citable boundary so the question *"is X a protocol rule or
an operator policy?"* never has to be re-litigated.

---

## The boundary

The BANZA protocol is **specification-level**: it defines behaviour, contracts,
invariants, certification criteria and the federation/trust model. It has no
executable kernel. A conformant operator implements the rules in its own stack
and **honours the wire contracts** (webhook signature, QR payload, events,
federation routing/obligations, operator manifest). This is the intended model
(ADR-001 open protocol, ADR-001 protocol/operator separation, ADR-035/ADR-035
reference operator).

What is **protocol** (lives in `~/banza`, normative):

- Financial invariants (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`)
- Wire contracts in `contracts/` (OpenAPI, webhooks, QR payload, events, federation)
- Certification criteria and capabilities (L0–L4, ADR-030)
- Trust/federation model (ADR-025, ADR-025)

What is **operator policy** (lives in the operator, non-normative to the protocol):

- KYC/AML tiers, identity verification, risk scoring, fraud detection
- Fees and pricing (subject only to `INV-STL-001` `gross = net + fee`)
- Onboarding UX, product surfaces, internal authorization gates
- Choice of language, database, runtime and internal architecture

The protocol already states this explicitly. `docs/reference/pt/completa.md` §3:

> *"Um operador pode ter as suas próprias regras de KYC — mas a imutabilidade
> dos lançamentos no livro-razão é imposta pelo núcleo, não por uma política do
> operador."*

and `docs/governance/README.md` places *Compliance and KYC/AML — identity verification,
risk scoring, fraud detection* in the operator-responsibility column.

## The litmus test

A change made in an operator must be promoted to a protocol ADR/RFC in `~/banza`
**only if** it touches a shared surface:

| If the change introduces… | Then… |
|---|---|
| a new field in a wire contract (webhook / QR / event / federation / manifest) | **ADR/RFC in `~/banza`** |
| a new manifest capability or certification criterion | **ADR in `~/banza`** (ADR-030) |
| a rule another operator must respect to interoperate or federate | **ADR/RFC in `~/banza`** |
| a change to a financial invariant | **ADR in `~/banza`** |
| only internal authorization, product UX, pricing or compliance policy | **stays in the operator — no protocol ADR** |

If a change touches none of the shared surfaces, it is operator policy and does
not belong in the protocol.

## Determination — Progressive KYC (reference operator)

**Outcome: operator-local policy. No protocol ADR required.**

Evidence (reference operator implementation, 2026-06-13):

- Implemented in the operator's `core/compliance/` crate plus internal API gates.
- `consumer_deposits.rs` applies per-tier deposit limits (`max_single`,
  `max_daily` by `kyc_level`) — internal authorization.
- `qr.rs` runs an in-process Progressive-KYC gate before QR payment, surfacing
  only the operator's own API error codes (`KYC_REQUIRED`, `KYC_NOT_APPROVED`,
  `KYC_LIMIT_EXCEEDED`).
- **No** manifest capability (`supports_kyc` or equivalent), **no** certification
  criterion, **no** field added to any wire contract (QR payload, webhook, event,
  federation), **no** invariant change.

Per the litmus test, Progressive KYC touches no shared surface. It is precisely
the "operator's own KYC rules" that `docs/reference/pt/completa.md` §3 reserves to the
operator. It stays in the operator and needs no ADR in `~/banza`.

## Contracts: consumption model

Protocol contracts are **owned by `~/banza/contracts/`** and **consumed** by
operators — never duplicated as a parallel source of truth. An operator has no
local `contracts/` authority. If offline conformance access is needed, an
operator may vendor a read-only, version-pinned mirror, clearly marked as a
copy. (The reference operator's repository layout tool already enforces this —
its `contracts/` zone was removed; canonical home is `~/banza/contracts/`.)

## Direction of development (protocol-first)

The litmus test above answers **where** a thing lives. It does not, on its own,
answer **where a new concept must start**. That is the subject of **ADR-001
(Protocol-first product development)**: a new *structural* financial/protocolar
concept (a new object, a new way value is grouped/structured/settled, a new
lifecycle, a new event or wire field) MUST originate in the protocol and flow
**downward**:

```
BANZA Protocol  →  Operator  →  SDK  →  Apps
```

Apps and SDKs do not define new financial/protocolar behaviour on their own. A
concept invented app-side and retrofitted into BANZA is the inversion ADR-001
forbids. See ADR-001 for the rule and ADR-016 (Payment Collections) for the
worked example.

---

*This determination records an existing boundary; it introduces no new protocol
rule and does not alter the frozen v1.0 specification.*
