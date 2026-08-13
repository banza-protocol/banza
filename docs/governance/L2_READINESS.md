# L2 Readiness — Payment-Flow Technical Preparation (BanzAI)

> **L2 Readiness é preparação técnica de fluxo de pagamento. Não é pagamento real, não é certificação,
> não é aprovação, não cria operador e não move fundos.**

L2 readiness is the BanzAI view of the payment-flow preparation an independent operator does
to assemble verifiable conformance evidence. It demonstrates — in a **local/demo/test-only** environment —
that the minimum BANZA payment-flow artifacts are *structured and internally consistent*. It attains
nothing: L2 conformance is **demonstrated by verifiable conformance evidence that any party can
independently reproduce**, never awarded by an authority. No fixture represents real money; **no funds
move**.

Engine: [`engines/banza-l2-readiness`](../../engines/banza-l2-readiness) (Rust → WASM). Everything below —
the per-artifact verdicts, the payment-flow / idempotency / ledger / trace / settlement checks, the
aggregate status, readiness and the report hash — is computed in Rust. The TypeScript adapter
(`website/lib/banzaL2Readiness.ts`) only loads the WASM and marshals JSON; it decides nothing, validates
no payment flow, and reaches no network. All monetary amounts are **integer minor units — never float**.

## Artifacts (required)

A missing artifact → `L2_INCOMPLETE`; an invalid one → a specific blocker.

| Artifact | Source / meaning | Blocker if invalid |
|---|---|---|
| `operator_manifest` | Operator Manifest Validator (VALID) | `L2_BLOCKED_BY_MANIFEST` |
| `simb_pre_review` | SimB pre-review (PASS) | `L2_BLOCKED_BY_SIMB` |
| `conformance_l0` | Conformidade L0 (PASS) | `L2_BLOCKED_BY_L0` |
| `l1_readiness` | L1 Readiness (READY) | `L2_BLOCKED_BY_L1` |
| `payment_intent` | PaymentIntent (ADR-014) | `L2_BLOCKED_BY_PAYMENT_FLOW` |
| `idempotency` | Idempotency handling (INV-IDEM) | `L2_BLOCKED_BY_IDEMPOTENCY` |
| `ledger` | Double-entry postings (ADR-011 / INV-LEDGER) | `L2_BLOCKED_BY_LEDGER` |
| `trace` | Trace linkage (INV-TRACE) | `L2_BLOCKED_BY_TRACE` |
| `settlement` | Settlement obligation (ADR-021) | `L2_BLOCKED_BY_SETTLEMENT` |
| `evidence` | Evidence Bundle reference | (missing → INCOMPLETE) |

## The payment flow (validated in Rust, locally)

- **Payment intent** — canonical PaymentIntent (ADR-014): `id`, `operator_id`, `payee_wallet_id`,
  `merchant_id`, `amount_minor` (integer minor units, or null for open amounts — never float), `currency`,
  `surface` (QR/LINK/REQUEST), `status`, `transfer_id`, `idempotency_key`, `trace_id`, `created_at`. A
  PaymentIntent never holds or moves money; fulfilment produces exactly one Transfer that posts to the
  ledger.
- **Idempotency** — the same idempotency key must return a consistent response; a replay must be flagged
  (`replay_detected`). Divergent responses for one key are rejected (INV-IDEM).
- **Ledger postings** — double-entry (a DEBIT and a CREDIT), zero-sum (DEBIT total = CREDIT total),
  single currency, every entry linked to the `trace_id` (ADR-011 / INV-LEDGER). Amounts are integer
  minor units.
- **Trace linkage** — one `trace_id` ties the intent, the ledger and the settlement together, with the
  minimum lifecycle events present (INV-TRACE / INV-RECON).
- **Settlement obligation** — gross/net/fee coherent: `net = gross − fee`, all ≥ 0, linked to the
  payment intent (ADR-021).
- **Evidence reference** — a technical reference (hash/id) to an Evidence Bundle. Technical evidence,
  not certification.

**No network.** Declared operator payment endpoints/URLs are never contacted; operator-URL validation is
a future phase and will require explicit confirmation.

## Status (Rust-computed, in precedence order)

| Status | Meaning |
|---|---|
| `L2_INVALID` | An artifact declares a real/production payment or fund movement — boundary violation. |
| `L2_BLOCKED_BY_MANIFEST` | Operator Manifest is invalid. |
| `L2_BLOCKED_BY_SIMB` | SimB pre-review did not PASS. |
| `L2_BLOCKED_BY_L0` | Conformidade L0 did not PASS. |
| `L2_BLOCKED_BY_L1` | L1 Readiness is not ready. |
| `L2_BLOCKED_BY_PAYMENT_FLOW` | Payment intent is malformed (id/currency/status/amount/idempotency/trace). |
| `L2_BLOCKED_BY_IDEMPOTENCY` | The same key returned divergent responses / replay not flagged. |
| `L2_BLOCKED_BY_LEDGER` | Postings are not double-entry / not zero-sum / not trace-linked. |
| `L2_BLOCKED_BY_TRACE` | Intent/ledger/settlement do not share a consistent trace_id, or events missing. |
| `L2_BLOCKED_BY_SETTLEMENT` | gross/net/fee incoherent (net ≠ gross − fee). |
| `L2_INCOMPLETE` | A required artifact is missing. |
| `L2_READY_FOR_TECHNICAL_REVIEW` | Minimum payment-flow artifacts present, consistent and non-production. |

`L2_READY_FOR_TECHNICAL_REVIEW` means *ready to be reviewed*, not *reviewed*, not *certified*, and never
*paid*. Every report carries `not_a_payment: true`, `not_a_certificate: true`, `not_an_approval: true`,
`does_not_move_funds: true`, `does_not_create_operator: true`, `requires_conformance_evidence_review: true`,
`llm_calls: 0`, `external_model_called: false`, `test_only: true`.

## Where it appears

- **Conformidade** — the `Preparação L2 · fluxo de pagamento` section: 10-item checklist, fixture
  selector, "Validar readiness L2" and "Usar estado actual" (feeds the live manifest/SimB/L0/L1 reports
  into the aggregator alongside the demo payment artifacts).
- **Programadores** — the `Fluxo de pagamento L2` section: the expected payment-intent structure,
  idempotency, ledger, trace_id, settlement and evidence reference, the relations to SimB / Evidence
  Bundle / conformance evidence, and a disabled real-payment endpoint (validation by URL is a future phase).
- **Evidence Bundle** — the `L2 readiness report` recommended artifact, plus an `l2_readiness_summary`
  (status, blockers, payment-flow summary, disclaimer).
- **Assistente** — the `l2_readiness` knowledge intent explains all of the above.

## Relation to the other levels

SimB PASS + Conformidade L0 PASS remain the **minimum** Evidence Bundle readiness (BX1.5, unchanged). L1
readiness and L2 readiness are **additional / next-level** readiness — L1 prepares the trust & well-known
surface, L2 prepares the payment flow. None of them is certification; conformance is demonstrated by
verifiable conformance evidence that any party can independently reproduce, never awarded by an authority.

See the phase report:
.
