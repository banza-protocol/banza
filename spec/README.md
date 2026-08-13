# BANZA — Protocol Architecture

## Protocol Identity

BANZA is an **open financial protocol**. This is the foundational architectural constraint from which all design decisions derive.

| What BANZA IS | What BANZA is NOT |
|-----------------|---------------------|
| Open protocol specification | Card processor |
| Rules for interoperable payments | A specific product or app |
| Conformance framework (L0–L4) | Visa/Mastercard gateway |
| Federation model for operators | Financial infrastructure operator |
| Trust model (signed protocol metadata, Open Trust Evaluation) | Any operator's private property |

The canonical protocol-level payment model:

```
Payer account/wallet ──[ledger transfer]──▶ Payee account/wallet
```

The canonical protocol flow: `SCAN QR → CONFIRM → SETTLEMENT (T+0 finality invariant)`

> This is a protocol-level model. BANZA does not operate wallets, move funds, execute settlement, or provide operational latency; those are operator responsibilities.

Reference models: **Pix, WeChat Pay, M-Pesa, UPI** — not Stripe checkout.

See [ADR-012](../decisions/adr/ADR-012-account-participant-identity.md) and [ADR-001](../decisions/adr/ADR-001-open-financial-protocol.md) for the full architectural constraint.

---

## Technology Neutrality

BANZA does not prescribe implementation technology. Operators may use any
language, database, or runtime that satisfies the protocol invariants. The
protocol defines *behaviour*, never *stack*:

- Monetary values: integer arithmetic in minor units — no floating point
- Ledger writes: synchronous and atomic at the posting step
- Double-entry: every debit has a corresponding credit
- Wallet balances: always ledger-derived
- Every financial operation: idempotent and replay-safe

Implementation architectures belong to operators.

---

## Native Protocol Agent (BanzAI)

BANZA is accompanied by a **native protocol agent, BanzAI**. BanzAI guides
operators through implementation, runs the validation journey by invoking the
verifiable deterministic Rust/WASM engines, explains their results, helps correct
failures and prepares evidence. BanzAI is the single human-operator interface
(ADR-042) — it is not an authority, not a normative source and not a fourth layer.
It does not approve, certify, license or decide participation, it does not invent
rules, and it does not replace the BANZA Reference or the deterministic engines.

**Rule provenance.** Active protocol rules come only from the Reference, accepted
ADRs/RFCs, the specifications, contracts, schemas, invariants and releases. BanzAI
may draft proposals for that formal process, but it cannot activate rules — rule
activation happens only through governance.

---

## Protocol Specification Documents

| Document | Subject |
|---|---|
| [invariants.md](invariants.md) | Financial invariants (crosswalk to the machine-readable registry) |
| [payment-lifecycle.md](payment-lifecycle.md) | End-to-end payment flow defined by the protocol |
| [qr-payment-lifecycle.md](qr-payment-lifecycle.md) | QR payment resolution, expiry and single-use rules |
| [collections.md](collections.md) | Payment Collections (splits) — protocol capability |
| [provider-model.md](provider-model.md) | Provider interface abstraction (operator-neutral) |
| [capability-negotiation.md](capability-negotiation.md) | Capability declaration and negotiation |
| [tracing.md](tracing.md) | Causal trace model (`INV-TRACE-001`) |
| [disputes.md](disputes.md) | Minimum protocol obligations for disputes |
| [federation/](federation/) | Federation protocol specification |

The single machine-readable source of truth for every invariant is
[`contracts/invariants.json`](../contracts/invariants.json). The protocol-level
architecture overview is [`spec/overview.md`](overview.md) at the
repository root; diagram registry and standards are in [`docs/reference/`](../docs/reference/).
