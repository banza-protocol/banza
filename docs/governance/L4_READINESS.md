# L4 Readiness — External-Interoperability Technical Preparation (BanzAI)

> **L4 Readiness é preparação de interoperabilidade externa. Não é integração externa activa, não é
> produção, não é certificação, não é aprovação, não é licença, não cria operador, não move fundos e não
> transforma BANZA em prestador de serviços de pagamento.**
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa
> transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por
> operadores autorizados que implementam o protocolo.

L4 readiness is the BanzAI view of the external-interoperability preparation an independent
operator does to assemble verifiable conformance evidence. It demonstrates — in a **local/demo/test-only**
environment — that the operator's implementation is *structured to interoperate* with other operators
that implement the BANZA protocol. It attains nothing: L4 conformance is **demonstrated by verifiable
conformance evidence that any party can independently reproduce**, never awarded by an authority;
production and real external integration are the responsibility of the independent operators. No fixture
represents a real integration, a real operator, a real payment, an active federation or a licence; **no
funds move**.

Engine: [`engines/banza-l4-readiness`](../../engines/banza-l4-readiness) (Rust → WASM). Everything below —
the per-artifact verdicts, the profile / version-negotiation / endpoint-contract / capability / envelope /
error-mapping / trust / BRL checks, the aggregate status, readiness and the report hash — is computed in
Rust. The TypeScript adapter (`website/lib/banzaL4Readiness.ts`) only loads the WASM and marshals JSON; it
decides nothing, validates no interoperability, and reaches no network.

## Artifacts (required)

A missing artifact → `L4_INCOMPLETE`; an invalid one → a specific blocker.

| Artifact | Meaning | Blocker if invalid |
|---|---|---|
| `operator_manifest` / `simb_pre_review` / `conformance_l0` | upstream (VALID / PASS / PASS) | `_BY_MANIFEST` / `_BY_SIMB` / `_BY_L0` |
| `l1_readiness` / `l2_readiness` / `l3_readiness` | upstream readiness (READY) | `_BY_L1` / `_BY_L2` / `_BY_L3` |
| `profile` | external interoperability profile | `L4_BLOCKED_BY_PROFILE` |
| `version_negotiation` | protocol version negotiation | `L4_BLOCKED_BY_VERSION_NEGOTIATION` |
| `endpoint_contract` | endpoint contract map | `L4_BLOCKED_BY_ENDPOINT_CONTRACT` |
| `capabilities` | capability matrix | `L4_BLOCKED_BY_CAPABILITIES` |
| `envelope` | request/response envelope | `L4_BLOCKED_BY_ENVELOPE` |
| `error_mapping` | error mapping | `L4_BLOCKED_BY_ERROR_MAPPING` |
| `trust` | key manifest / certificate form | `L4_BLOCKED_BY_TRUST` |
| `brl` | BanzaRevocationList, fail-closed | `L4_BLOCKED_BY_BRL` |
| `evidence` | Evidence Bundle reference | (missing → INCOMPLETE) |

## The external-interoperability surface (validated in Rust, locally)

- **External interoperability profile** — `operator_id`, `environment` (demo/pre-production),
  `protocol_version`, `supported_versions`, `supported_capabilities`, `supported_levels`,
  `production: false`, `external_live_validation: false`.
- **Version negotiation** — the `selected_version` must be in `supported_versions` and either equal the
  `requested_version` or have a declared fallback; an incompatible selection fails.
- **Endpoint contract map** — each endpoint declares `path`, `method`, `content_type`, request/response/
  error schema references and idempotency/trace requirements.
- **Capability matrix** — payments / federation / trust / BRL / evidence / conformance capabilities plus
  the supported readiness levels.
- **Request/response envelope** — `request_id`, `trace_id`, `correlation_id`, `operator_id`,
  `counterpart_operator_id`, `protocol_version`, `timestamp`.
- **Error mapping** — each entry maps a canonical BANZA error code to an operator-local code, with a
  `retryable` flag and a `trace_reference`.
- **Trust & BRL** — key manifest (and optional certificate) form; the **BRL is fail-closed** — a revoked
  interop operator blocks (INV-FEDEVAL-002).
- **Interop evidence reference** — a technical reference (hash/id) to an Evidence Bundle. Technical
  evidence, not a certificate, not an approval and not a licence.

**No network.** Declared operator interoperability endpoints/URLs are never contacted and no external
integration is performed; operator-URL / real external-integration validation is a future phase and will
require explicit confirmation.

## Status (Rust-computed, in precedence order)

`L4_INVALID` (active/real integration, production, active federation, real payment, real operator or
licence claim) → `_BY_MANIFEST` → `_SIMB` → `_L0` → `_L1` → `_L2` → `_L3` → `_BY_PROFILE` →
`_BY_VERSION_NEGOTIATION` → `_BY_ENDPOINT_CONTRACT` → `_BY_CAPABILITIES` → `_BY_ENVELOPE` →
`_BY_ERROR_MAPPING` → `_BY_TRUST` → `_BY_BRL` → `L4_INCOMPLETE` → `L4_READY_FOR_TECHNICAL_REVIEW`.

`L4_READY_FOR_TECHNICAL_REVIEW` means *ready to be reviewed*, not *reviewed*, not *certified*, not
*licensed*, and never *active external integration*. Every report carries `not_external_integration`,
`not_active_federation`, `not_a_payment`, `not_a_certificate`, `not_an_approval`, `not_a_licence`,
`not_a_psp`, `does_not_move_funds`, `does_not_create_operator`,
`does_not_make_banza_a_payment_service_provider`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `requires_conformance_evidence_review`,
`llm_calls: 0`, `external_model_called: false`, `test_only: true` — all `true`/`0`.

## Where it appears

- **Conformidade** — the `Preparação L4 · interoperabilidade externa` section: 14-item checklist, fixture
  selector, "Validar readiness L4" and "Usar estado actual".
- **Programadores** — the `Interoperabilidade L4` section: the profile, version negotiation, endpoint
  contract map, capability matrix, envelope, error mapping, trust & BRL and evidence reference; the
  relations to L3 / Evidence Bundle / authorised operators / conformance evidence (demonstrated, not a
  regulator); a disabled real-integration endpoint; and the reminder that authorised operators provide
  the financial services — **BANZA stays an open protocol, not a PSP**.
- **Evidence Bundle** — the `L4 readiness report` recommended artifact + an `l4_readiness_summary`.
- **Assistente** — the `l4_readiness` knowledge intent.

## Relation to the other levels

SimB PASS + Conformidade L0 PASS remain the **minimum** Evidence Bundle readiness (BX1.5, unchanged). L1,
L2, L3 and L4 readiness are **additional / next-level** readiness — L1 trust & well-known, L2 payment
flow, L3 federation, L4 external interoperability. None of them is certification or a licence; conformance
is demonstrated by verifiable conformance evidence that any party can independently reproduce, never
awarded by an authority, and any real financial service, real integration and its licence/authorisation
belong to the independent operator.

See the phase report:
[`PHASE_BX1_10_BANZAI_L4_EXTERNAL_INTEROPERABILITY_READINESS_2026_07.md`](PHASE_BX1_10_BANZAI_L4_EXTERNAL_INTEROPERABILITY_READINESS_2026_07.md).
Related: [`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md),
[`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md).
