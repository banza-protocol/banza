# BANZA — Auditor Briefing (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This is the first document an external auditor would read. **No external audit has been performed**
(`external_audit_not_performed = true`). This briefing orients a would-be auditor to what BANZA is, the
pre-production state, the trust model, where to find evidence, and the explicit boundary of this pack.

## 1. What BANZA is (and is not)

- BANZA is an **open financial protocol**: specifications, contracts, financial invariants, conformance
  vectors, official Rust engines, and governance (ADRs/RFCs). It is operator-neutral by design.
- BANZA is **not** a payment service provider. It does **not** process transactions, liquidate values, or
  move funds. It holds no end-user or merchant production data.
- Real financial services are provided by **authorised operators** who implement the protocol under their
  **own** regulatory authorisation. Any licence/authorisation belongs to the operator, never to BANZA.
- The BanzAI Workbench **explains and runs** Rust/WASM tools. It does **not** certify, approve, decide,
  create an operator, move funds, or activate federation or integration.

## 2. Pre-production state (verifiable)

| Fact | Value | How to verify |
|---|---|---|
| Conformant operators | `/operators = []` | `GET /operators` |
| Production certificates | `production_certificates = false` | `GET /certificates` |
| External model / LLM calls | `llm_calls = 0`, `external_model_called = false` | inspect any engine report |
| Provider | mock provider only | Workbench + Assistente outputs |
| Root-key ceremony (M2) | **planned, not performed** — no production keys | `ROOT_KEY_CEREMONY_REQUIREMENTS.md` (procedure, not a record) |
| Live external integration | disabled / gated to a future phase | `AUDIT_SCOPE.md` §3 |
| External audit | **not performed** | this pack is pre-audit only |

Everything in this pack is **TEST-ONLY / pre-production**. Where production, ceremony, or audit activities
are described, they are **planned / would-be-required-before-production**, not done.

## 3. Trust model (as specified)

- **Domain-separated keys** (ADR-027): distinct keys for the root domain, certificate domain, and
  revocation domain. Using the wrong domain is a trust bypass and is guarded against by the trust engine's
  form checks. The production root ceremony is **planned** (M2), not performed.
- **BRL fail-closed** (INV-FEDEVAL-002): a revoked operator **blocks** in L3/L4 routing. Missing or invalid
  BRL is treated as blocking. Operators must fetch fresh BRL (≤ 6h); the engine is fail-closed.
- **Evidence integrity**: the Evidence Bundle is hashed with canonical SHA-256; `validate` recomputes the
  hash to detect tampering.
- **Readiness is decided in Rust**, deterministically (`engines/banza-security-assurance` and the L0–L4
  engines). TypeScript is render-only and never decides status.

See [`THREAT_MODEL.md`](THREAT_MODEL.md) for actors, assets, threats, and trust boundaries.

## 4. Where to find evidence

| You want to check… | Go to |
|---|---|
| Every claim → its artifact | [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) |
| Control → risk → evidence → owner | [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md) |
| What is in / out of scope | [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md) |
| Risks and their status | [`RISK_REGISTER.md`](RISK_REGISTER.md) |
| Controls and gaps | [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md) |
| Threats and mitigations | [`THREAT_MODEL.md`](THREAT_MODEL.md) |
| Known gaps before a real audit | [`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md) |
| Boundary posture | [`../governance/BANZA_PROTOCOL_BOUNDARY.md`](../governance/BANZA_PROTOCOL_BOUNDARY.md), [`../governance/BANZA_REGULATORY_POSITIONING.md`](../governance/BANZA_REGULATORY_POSITIONING.md) |

Reproduce the engine evidence with the Rust test suites (`cargo test -p <crate>`) and the CI guards
(`make rust-rule-check`, `make invariant-check`, `make regulatory-check`, `make identity-check`,
`make purity-check`). See the "how to verify" column in [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md).

## 5. How deep-assurance readiness is computed

Readiness is computed **in Rust** by `engines/banza-security-assurance :: validate_deep_assurance` across
four tracks (deep threat model, trust model, incident response, external audit evidence). States:
`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW`, `DEEP_ASSURANCE_INCOMPLETE`,
`DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP`, `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP`,
`DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP`, `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP`,
`DEEP_ASSURANCE_INVALID`.

`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` means the pack is **ready for an external auditor to begin**. It
does **not** mean reviewed, audited, certified, licensed, or production.

## 6. Explicit boundary of this pack

- Certification, operator authorisation, licensing, federation activation, and external integration are
  **not** in this pack and are **not** produced by it.
- Reviewing this pack would yield **pre-audit assurance only**. Before any production claim, an
  **independent external audit** would be required, plus a controlled pilot with authorised operators under
  their own regulatory authorisation, plus completion of milestones M2/M3 under governance.
- BANZA is and remains an **open protocol** — not a PSP. This briefing makes no affirmative claim of
  production-readiness, certification, licensing, or a completed audit.

See: [`EXTERNAL_AUDIT_READINESS_PACK.md`](EXTERNAL_AUDIT_READINESS_PACK.md),
[`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md), [`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
