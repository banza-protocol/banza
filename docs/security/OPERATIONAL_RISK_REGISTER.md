# BANZA — Operational Risk Register (BX2.3)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

## Scope

This register tracks **operational** risks to **the protocol project itself** — its repository, public
website (`banza.network`), deployment bundle, CI, DNS/TLS and secrets. It deliberately does **not** track
the **financial** risks of operators (ledger, settlement, fraud, liquidity, AML). Those belong to each
authorised operator's own risk management, because BANZA does not process transactions, does not settle
value and does not move funds.

For protocol/financial-design risks and the L0–L4 tool risks, see [`RISK_REGISTER.md`](RISK_REGISTER.md).
This document is the **operational** complement to it.

**Severity scale:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW`.
**Status values:** `open` · `mitigated` · `accepted` · `closed`.
Discipline for this track: **every CRITICAL or HIGH risk must be `mitigated`** (or explicitly `accepted`
with a rationale). An open, unmitigated CRITICAL/HIGH operational risk blocks deep-assurance readiness —
the Rust engine (`engines/banza-security-assurance :: validate_deep_assurance`) will not return
`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` while one stands.

## Register

| op_risk_id | category | description | severity | existing control | evidence | owner | status |
|---|---|---|---|---|---|---|---|
| OPS-WEB-001 | website compromise | Public site defaced or a page altered to carry false/harmful content | CRITICAL | website-only deploy from fixed commit; in-container asset verification; guards in CI; SEV-1 runbook | [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md); [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md) | infra | mitigated |
| OPS-BND-001 | boundary/docs regression | A page or doc wrongly implies BANZA is a PSP / is licensed / is certified | CRITICAL | `make regulatory-check` + `make identity-check` in CI; boundary blockquote convention; boundary runbook | `tools/check-regulatory-claims.sh`; BX1.8A guard | protocol governance | mitigated |
| OPS-DRIFT-001 | deployment drift | Served headers/assets diverge from the git bundle (fixed image tags) | HIGH | drift playbook; in-container grep of served assets bypassing CDN; rollback via retagged image | [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md) | infra | mitigated |
| OPS-WASM-001 | WASM supply-chain | Tampered/substituted WASM or JS chunk shipped to browsers | HIGH | pinned image tags; reproducible bundle; Rust-first engines; artifact-tamper runbook; planned SBOM/signing before production | infra/banza-network; rust-rule guard | infra | mitigated |
| OPS-SECRET-001 | secret leakage | A token/key/credential leaked into repo, logs, CI, or a built asset | HIGH | no-secrets convention; mock provider (`llm_calls: 0`); leaked-secret runbook (rotate-first); secret scanning in CI | purity/identity guards; leaked-secret runbook | infra | mitigated |
| OPS-DNS-001 | DNS/TLS misconfig | Wrong DNS record, expired/mis-scoped TLS cert, proxy mode misset for `banza.network` | HIGH | Cloudflare proxied + Full; origin cert on VM; documented cutover topology; DNS/proxy drift check in playbook | [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md); domain state record | infra | mitigated |
| OPS-CI-001 | CI compromise | Compromised workflow/runner tampers with build or exfiltrates secrets | HIGH | least-privilege workflows; pinned actions/images; guards run in CI; deploy from fixed commit only | CI config; infra README | infra | mitigated |
| OPS-DEP-001 | stale dependency | Known-vulnerable/abandoned dependency in site or engines | MEDIUM | pinned versions; periodic dependency review; Rust-first reduces JS surface; planned SBOM before production | infra/banza-network; rust-rule guard | infra | mitigated |
| OPS-DOC-001 | docs contradicting boundary | A doc contradicts the absolute boundary (claims audit done / production / federation active) | MEDIUM | mandatory boundary blockquote; regulatory guard; review of new docs | `make regulatory-check`; this pack's convention | protocol governance | mitigated |
| OPS-ROUTE-001 | machine-route drift | `/operators` or `/certificates` unexpectedly non-empty or serving unintended content | HIGH | routes empty/controlled by design; unexpected-content runbook; in-container verification | [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md); identity guard | protocol governance | mitigated |
| OPS-ONCALL-001 | response readiness | No staffed on-call rotation for a small pre-production project | MEDIUM | incident plan + runbooks documented; best-effort response; staffing tracked as a pre-production requirement | [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) | infra | accepted |
| OPS-BACKUP-001 | recoverability | Loss of origin VM or config without a tested restore | MEDIUM | reproducible git bundle is source of truth; redeploy-from-bundle recovery; periodic restore drill planned | infra/banza-network README | infra | mitigated |

## Notes

- **`accepted` items** carry an explicit rationale. `OPS-ONCALL-001` is accepted for the pre-production
  phase: the project is small and no real funds or operator traffic flow through it; staffing a rotation
  is a **would-be requirement before production**, not a present-state claim.
- No operational risk here would require the **protocol** to be licensed or audited-as-a-PSP. Any such
  requirement lands on the **operator**, by design — BANZA is an open protocol.
- Post-mortems (see [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md)) feed new/updated rows here;
  this register is a living document.

## Relation to assurance

The Rust engine reads a summary of this register as part of the deep-assurance package. An open,
unmitigated CRITICAL/HIGH row yields a blocking state (a critical-threat gap), while a well-formed,
mitigated register lets the operational-risk input pass toward
`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW`. Readiness is never asserted in TypeScript.

See: [`RISK_REGISTER.md`](RISK_REGISTER.md), [`THREAT_MODEL.md`](THREAT_MODEL.md),
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md).
