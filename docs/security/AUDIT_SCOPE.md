# BANZA — Audit Scope (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This document defines the **scope** an external auditor would review. No external audit has been performed
(`external_audit_not_performed = true`); this is the scope statement a would-be auditor would receive with
the pack. It feeds the `audit_scope_present` input of the `EXTERNAL_AUDIT_READINESS` track in
`engines/banza-security-assurance :: validate_deep_assurance`.

## 1. Subject of the audit

The **BANZA open financial protocol** repository (`~/banza`): its specifications, contracts, financial
invariants, conformance vectors, official Rust engines, the BanzAI Workbench boundary, and the public
website's security posture. The subject is a **protocol**, not a payment service and not an operator's
production system.

## 2. In scope

| Area | What would be reviewed | Primary evidence |
|---|---|---|
| Protocol specifications | ADRs, invariant definitions, protocol prose vs contracts coherence | `decisions/adr/`, `contracts/`, invariant registry |
| Contracts | OpenAPI specs, webhook/event schemas, QR payload spec | `contracts/` |
| Financial invariants | `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`, `INV-OTE-*`, `INV-FEDEVAL-*`, `INV-ROOT-*` | invariant registry; `make invariant-check` |
| Conformance vectors | Certification test vectors for operator compliance | `conformance/` |
| Rust engines | Determinism + boundary of conformance/trust/L0–L4/evidence-bundle/security-assurance engines | `engines/`; Rust test suites |
| Workbench boundary | That the Workbench explains/runs tools and never certifies/approves/decides | Workbench copy; forbidden-phrases tests |
| Readiness decisioning | That readiness/status is computed in Rust, never in TypeScript | adapters (render-only); `ready_status` logic |
| Public website security | Security headers, read-only machine routes, non-GET → 405 | reverse-proxy config; live header checks |
| Guardrails | Regulatory / identity / purity / invariant / forbidden-claim guards in CI | `make regulatory-check`, `make identity-check`, `make purity-check`, `make invariant-check` |
| Evidence integrity | SHA-256 canonical hashing + tamper detection of the Evidence Bundle | `banza-evidence-bundle` tests |
| Boundary posture | That no artifact claims BANZA is a PSP / licensed / certified / audited / production | boundary docs; regulatory guard |

## 3. Out of scope

| Area | Why out of scope |
|---|---|
| Operator production systems | BANZA does not implement any operator's product; operator infra is the operator's responsibility. |
| Real funds / money movement | BANZA does not move, process, liquidate, or hold funds. There are no funds to audit here. |
| Regulatory authorisation / licensing | Any licence/authorisation belongs to the authorised operator, not to the protocol. |
| Live operator URLs / external integration | Live URL and external-integration validation is disabled and gated to a future phase. |
| Real federation activation | Federation is not activated; only structural readiness is prepared. |
| Production root-key ceremony | The M2 root ceremony is **planned** and has **not** been performed; there are no production keys. |
| Production certificate signing | No production certificate has been signed; `production_certificates = false`. |
| External model / provider behaviour | BanzAI uses a mock provider only; `llm_calls = 0`. No external model is called. |
| End-user / merchant data | The protocol repo holds no end-user or merchant production data. |

## 4. Objectives

1. Confirm that the protocol's **financial invariants** are specified unambiguously and machine-checked.
2. Confirm that **readiness/status decisioning is in Rust** and deterministic, with TypeScript render-only.
3. Confirm the **fail-closed** trust/BRL behaviour and the domain-separated key model (as specified).
4. Confirm **evidence integrity** (canonical hashing + tamper detection).
5. Confirm the **public boundary posture**: no PSP/licence/certification/production/audited claims.
6. Confirm the **guardrail suite** (regulatory/identity/purity/invariant/forbidden-claims) runs in CI.
7. Identify residual gaps that must close **before any production claim**.

## 5. Non-objectives

- **Not** to certify, approve, or licence BANZA or any operator.
- **Not** to authorise an operator, federation, or external integration.
- **Not** to assert production-readiness or that an external audit is complete.
- **Not** to evaluate operator production systems, real funds, or regulatory compliance of an operator.
- **Not** to make BANZA a payment service provider — it is and remains an open protocol.

## 6. Audit method (would-be)

- Static review of specs, contracts, invariants, and guard configuration.
- Execution of the Rust engine test suites and the CI guard jobs.
- Verification of the live public surface (security headers, read-only routes, `/operators=[]`,
  `/certificates` = no production certificates) against the documented posture.
- Trace each in-scope claim through [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) and
  [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md).

## 7. Boundary reminder

Completing this scope would produce **pre-audit assurance only**. It would not, by itself, make BANZA
production-ready, certified, licensed, or a PSP, and it would not create an operator or activate federation
or external integration. Any real financial service and any licence/authorisation belong to the authorised
operator.

See: [`EXTERNAL_AUDIT_READINESS_PACK.md`](EXTERNAL_AUDIT_READINESS_PACK.md),
[`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md), [`AUDITOR_BRIEFING.md`](AUDITOR_BRIEFING.md),
[`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md).
