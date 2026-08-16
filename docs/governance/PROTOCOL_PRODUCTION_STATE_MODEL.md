# BANZA — Protocol Production State Model (M2)

> **M2 implementa o protocolo BANZA para produção enquanto protocolo aberto. M2 não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo financeiro aberto.** Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores independentes que implementam o protocolo.

This document defines the **formal state model for producing the BANZA protocol as an open protocol**. It
describes six states, the meaning of each, the transitions that are allowed and the transitions that are
**forbidden**. The state is a property of the *protocol implementation*, not of any financial operation. No
state in this model activates payments, funds movement, or a real operator.

The current state is **`PRE_PRODUCTION`**. The final state, **`M4_PRODUCTION_NETWORK`**, is **future-only** —
declared here for completeness, not activated. M2 status itself is computed in Rust by
`engines/banza-production-gate` (`validate_m2_protocol_gate`); this document is the governance model that the
gate serves.

## 1. The six states

| # | State | Kind |
|---|---|---|
| 0 | `PRE_PRODUCTION` | current |
| 1 | `M2_PROTOCOL_IMPLEMENTATION` | active work |
| 2 | `M2_PROTOCOL_REVIEW` | review |
| 3 | `M2_PROTOCOL_CANDIDATE` | candidate |
| 4 | `M3_OPERATOR_CANDIDATE` | candidate (operator) |
| 5 | `M4_PRODUCTION_NETWORK` | future-only, not activated |

## 2. State meanings

### 0 — `PRE_PRODUCTION` (current)

The protocol exists as a coherent, honest pre-production specification. `/operators` is `[]`, the legacy
`/certificates` route reports `production_certificates=false`, BanzAI is in mock, and L0–L4 readiness are
technical evidence only. This is the current state of the repository.

### 1 — `M2_PROTOCOL_IMPLEMENTATION`

The protocol is being implemented **for production as an open protocol**: governed release workflow, contracts
under release governance, the trust framework (signed protocol metadata, delegated signing keys, pinned Trust
Root, public registry, revocation list) at its specified canonical locations, the operator self-publication path
and the assurance evidence linkage. No production activation occurs here — only implementation of the protocol's
own production readiness.

### 2 — `M2_PROTOCOL_REVIEW`

The implemented protocol is under governed review: contracts are schema-valid, the release process is defined,
the trust model and self-publication path are specified, and assurance evidence has no open CRITICAL/HIGH risk.
Review is a governance act on the **protocol**, not on any operator or payment.

### 3 — `M2_PROTOCOL_CANDIDATE`

The protocol has passed review and is a **candidate for protocol publication** as an open protocol. It is
releasable in principle. This corresponds to the release state `APPROVED_FOR_PROTOCOL_PUBLICATION` in
[`PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md). It is still not an operator activation and
not a payment authorisation.

### 4 — `M3_OPERATOR_CANDIDATE`

An independent operator has **self-published** a manifest and conformance evidence against the published
protocol ([`OPERATOR_MANIFEST_VALIDATION.md`](OPERATOR_MANIFEST_VALIDATION.md),
[`PUBLIC_PROTOCOL_REGISTRY.md`](PUBLIC_PROTOCOL_REGISTRY.md)). Compatibility is demonstrated by verifiable
conformance evidence that any party can re-check — **BANZA does not admit, approve, accept or certify the
operator, add it to `/operators`, or set `production_certificates=true` in this phase.** The operator's legal,
regulatory, financial and operational framing is its own responsibility, satisfied outside the protocol.

### 5 — `M4_PRODUCTION_NETWORK` (future-only, not activated)

The future state in which independent operators run a live network. It is **declared, not activated**. Reaching
it requires M3 completion, each operator's own legal/regulatory framing, a real (planned, gated) Trust Root
ceremony and a recorded governance decision on the protocol. Nothing in M2 activates M4.

## 3. Allowed transitions

```
PRE_PRODUCTION
    → M2_PROTOCOL_IMPLEMENTATION        (begin M2 implementation of the open protocol)
M2_PROTOCOL_IMPLEMENTATION
    → M2_PROTOCOL_REVIEW                (implementation complete, submit to governed review)
    → M2_PROTOCOL_IMPLEMENTATION        (rework in place)
M2_PROTOCOL_REVIEW
    → M2_PROTOCOL_CANDIDATE             (review approved)
    → M2_PROTOCOL_IMPLEMENTATION        (review sends work back)
M2_PROTOCOL_CANDIDATE
    → M3_OPERATOR_CANDIDATE             (published protocol; an operator self-publishes conformance evidence)
    → M2_PROTOCOL_REVIEW               (regression / new change requires re-review)
M3_OPERATOR_CANDIDATE
    → M3_OPERATOR_CANDIDATE             (further self-published operators / iterations, still gated)
    → M4_PRODUCTION_NETWORK            (FUTURE-ONLY; requires all M4 gates)
```

Every forward transition into or beyond `M3_OPERATOR_CANDIDATE` depends on each operator's own legal and
regulatory framing, obtained outside the protocol, and on a recorded governance decision on the protocol. The
transition into `M4_PRODUCTION_NETWORK` is future-only and is not exercised in M2.

## 4. Forbidden transitions

The following transitions are **forbidden** and must be rejected by governance and by the M2 gate engine:

- `PRE_PRODUCTION → M3_OPERATOR_CANDIDATE` or any skip past `M2_PROTOCOL_*` — no phase may be skipped.
- `PRE_PRODUCTION → M4_PRODUCTION_NETWORK` — no jump to a live network.
- Any `M2_*` state → `M4_PRODUCTION_NETWORK` — M4 is never reachable from an M2 state.
- `M3_OPERATOR_CANDIDATE → M4_PRODUCTION_NETWORK` **without** all M4 gates.
- Any transition that activates payments, funds movement, real federation or real external integration.
- Any transition that adds a real operator to `/operators` or sets `production_certificates=true`.

A package asserting a forbidden transition drives the gate to `M2_INVALID_FORBIDDEN_ACTIVATION` (or
`M2_INVALID_REGULATORY_BOUNDARY` when it also claims PSP / licence / payment processing).

## 5. Forbidden in M2 (explicit)

Regardless of the current state, the following are **forbidden in M2** and are treated as boundary failures:

- **Admit, approve, accept or certify a real operator**, or add one to the registry.
- **Set `production_certificates=true`** (it stays `false`; the legacy `/certificates` route persists).
- **Activate `/operators` with a real operator** (it stays `[]`).
- **Activate real payments** — no processing, settlement, holding or movement of funds.
- **Claim operational production** — no assertion that BANZA is live as a financial service.

Every one of these belongs to independent operators and gated M3/M4 steps under each operator's own legal and
regulatory framing — never to the protocol in M2. Humans maintain and evolve the protocol; they do not
authorise, accept, approve or certify operators.

## 6. Machine-route invariants (must hold in all M2 states)

| Route | Expected |
|---|---|
| `GET /operators` | `200 []` |
| `GET /certificates` | `200` · `production_certificates=false` |
| BanzAI | provider `mock`, `llm_calls=0` |

If any of these would change, the transition is forbidden in M2 and requires the M3/M4 gates.

## See also

- [`PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md)
- [`OPERATOR_MANIFEST_VALIDATION.md`](OPERATOR_MANIFEST_VALIDATION.md)
