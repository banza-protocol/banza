# L3 Readiness — Federation Technical Preparation (BanzAI)

> **L3 Readiness é preparação técnica de federação. Não é federação activa, não é produção, não é
> certificação, não é aprovação, não cria operador e não move fundos.**

L3 readiness is the BanzAI view of the federation preparation an independent operator does to
assemble verifiable conformance evidence. It demonstrates — in a **local/demo/test-only** environment —
that the minimum BANZA federation artifacts **between two simulated operators** are *structured and
internally consistent*. It attains nothing: L3 conformance is **demonstrated by verifiable conformance
evidence that any party can independently reproduce**, never awarded by an authority; production
federation depends on milestone **M3**. No fixture represents a real federation or a real operator;
**no funds move**.

Engine: [`engines/banza-l3-readiness`](../../engines/banza-l3-readiness) (Rust → WASM). Everything below —
the per-artifact verdicts, the federation / cross-operator-trace / trust / BRL / settlement checks, the
aggregate status, readiness and the report hash — is computed in Rust. The TypeScript adapter
(`website/lib/banzaL3Readiness.ts`) only loads the WASM and marshals JSON; it decides nothing, validates
no federation, and reaches no network. All monetary amounts are **integer minor units — never float**.

## Artifacts (required)

A missing artifact → `L3_INCOMPLETE`; an invalid one → a specific blocker.

| Artifact | Source / meaning | Blocker if invalid |
|---|---|---|
| `operator_manifest` | Operator Manifest Validator (VALID) | `L3_BLOCKED_BY_MANIFEST` |
| `simb_pre_review` | SimB pre-review (PASS) | `L3_BLOCKED_BY_SIMB` |
| `conformance_l0` | Conformidade L0 (PASS) | `L3_BLOCKED_BY_L0` |
| `l1_readiness` | L1 Readiness (READY) | `L3_BLOCKED_BY_L1` |
| `l2_readiness` | L2 Readiness (READY) | `L3_BLOCKED_BY_L2` |
| `federation_pair` + `federation_intent` | two simulated operators + routing intent | `L3_BLOCKED_BY_FEDERATION_FLOW` |
| `cross_operator_trace` | trace A + trace B tied by a correlation (INV-TRACE) | `L3_BLOCKED_BY_TRACE` |
| `trust` | key manifest / certificate form (ADR-025) | `L3_BLOCKED_BY_TRUST` |
| `brl` | BanzaRevocationList, fail-closed (INV-FEDEVAL-002) | `L3_BLOCKED_BY_BRL` |
| `settlement` | federation obligation, net = gross − fee (ADR-025) | `L3_BLOCKED_BY_SETTLEMENT` |
| `evidence` | Evidence Bundle reference | (missing → INCOMPLETE) |

## The federation flow (validated in Rust, locally)

- **Federation pair** — two **distinct** simulated operators (test-only), a demo/pre-production
  environment, `production: false`.
- **Federation intent** — ADR-025 routing: `id`, `source_operator`/`target_operator` (distinct),
  `amount.minor` (integer minor units), `currency`, `trace_id`, `idempotency_key`, `status`.
- **Cross-operator trace** — a trace on each side (`trace_a`, `trace_b`) tied by a shared
  `correlation_id`, with the minimum federation lifecycle events (INV-TRACE / INV-RECON).
- **Trust & BRL** — key manifest (and optional certificate) form, plus the **BanzaRevocationList**. The
  BRL is **fail-closed**: it must be well-formed (`issuer: "BANZA"` + a `revoked` array) and **no**
  federation operator may appear on it — a revoked operator blocks all routing (INV-FEDEVAL-002).
- **Federation settlement obligation** — ADR-025: gross/net/fee coherent (`net = gross − fee`, all ≥ 0),
  linked to both operators and to the trace/correlation.
- **Evidence reference** — a technical reference (hash/id) to an Evidence Bundle. Technical evidence, not
  certification.

**No network.** Declared operator federation endpoints/URLs are never contacted; operator-URL / real
federation validation is a future phase and will require explicit confirmation.

## Status (Rust-computed, in precedence order)

| Status | Meaning |
|---|---|
| `L3_INVALID` | An artifact declares an active/real/production federation or fund movement — boundary violation. |
| `L3_BLOCKED_BY_MANIFEST` / `_SIMB` / `_L0` / `_L1` / `_L2` | The corresponding upstream readiness is not satisfied. |
| `L3_BLOCKED_BY_TRUST` | Key manifest / certificate malformed. |
| `L3_BLOCKED_BY_BRL` | BRL malformed, or a federation operator is revoked (fail-closed). |
| `L3_BLOCKED_BY_FEDERATION_FLOW` | Federation pair or intent malformed. |
| `L3_BLOCKED_BY_TRACE` | Cross-operator trace A/B not correlated / events missing. |
| `L3_BLOCKED_BY_SETTLEMENT` | gross/net/fee incoherent. |
| `L3_INCOMPLETE` | A required artifact is missing. |
| `L3_READY_FOR_TECHNICAL_REVIEW` | Minimum federation artifacts present, consistent and non-production. |

`L3_READY_FOR_TECHNICAL_REVIEW` means *ready to be reviewed*, not *reviewed*, not *certified*, and never
*active federation*. Every report carries `not_active_federation: true`, `not_a_payment: true`,
`not_a_certificate: true`, `not_an_approval: true`, `does_not_move_funds: true`,
`does_not_create_operator: true`, `requires_conformance_evidence_review: true`, `llm_calls: 0`,
`external_model_called: false`, `test_only: true`.

## Where it appears

- **Conformidade** — the `Preparação L3 · federação` section: 11-item checklist, fixture selector,
  "Validar readiness L3" and "Usar estado actual" (feeds the live manifest/SimB/L0/L1/L2 reports into the
  aggregator alongside the demo federation artifacts).
- **Programadores** — the `Federação L3` section: operator A/B, federation intent, cross-operator trace,
  trust & BRL, settlement, evidence reference, the relations to L2 / Evidence Bundle / conformance
  evidence, and a disabled real-federation endpoint.
- **Evidence Bundle** — the `L3 readiness report` recommended artifact, plus an `l3_readiness_summary`.
- **Assistente** — the `l3_readiness` knowledge intent explains all of the above.

## Relation to the other levels

SimB PASS + Conformidade L0 PASS remain the **minimum** Evidence Bundle readiness (BX1.5, unchanged). L1,
L2 and L3 readiness are **additional / next-level** readiness — L1 the trust & well-known surface, L2 the
payment flow, L3 the federation between operators. None of them is certification; conformance is
demonstrated by verifiable conformance evidence that any party can independently reproduce, never awarded
by an authority; production federation depends on milestone M3.

See the phase report:
.
