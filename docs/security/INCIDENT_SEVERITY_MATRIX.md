# BANZA — Incident Severity Matrix (BX2.3)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

## Purpose

This is the **severity matrix** required by the incident-response track. It classifies incidents that
affect **the protocol project's own** repository, public website (`banza.network`), deployment bundle, CI,
DNS/TLS and secrets. It does **not** classify incidents inside an operator's production systems — those are
the operator's responsibility and are graded under the operator's own scheme. BANZA moves no funds, so no
severity level here corresponds to fund loss.

The [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) requires this matrix to be **present** for the
track to contribute to `DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW`; its absence yields
`DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP` from the Rust engine.

## Severity levels

| Severity | Definition | Examples | Response target (acknowledge / contain) | Escalate to | Who is notified |
|---|---|---|---|---|---|
| **SEV-1** | **Boundary/integrity breach or public-website compromise.** The public surface is defaced, serving altered/harmful content, or a page/route **wrongly implies BANZA is a PSP / is licensed / is certified / an audit is complete**; or protocol-artifact integrity is broken. | Site defaced; a served page states BANZA holds a licence; `/certificates` serves forged certificate content; a WASM chunk is substituted in production; boundary blockquote removed and shipped live. | **15 min / 1 h** | Incident lead immediately; comms on standby | Incident lead, comms, scribe; project owner; public status if user-visible |
| **SEV-2** | Serious but scoped: a confirmed secret leak, a working exploit path, or a high-impact drift/misconfig **not yet** causing harmful public content. | Valid credential leaked in a commit/log; DNS/TLS misconfig exposing the origin; deployment drift where served assets diverge from the bundle; CI runner compromise suspected. | **1 h / 4 h** | Incident lead; comms if external exposure | Incident lead, scribe; comms as needed |
| **SEV-3** | Moderate: degraded but contained; no boundary/integrity impact and no confirmed exposure. | Guard (`identity`/`regulatory`) failing in CI blocking deploys; stale vulnerable dependency flagged; partial site outage; single machine-route returning stale (non-harmful) content. | **4 h / 1 business day** | Incident lead if it risks escalating | Incident lead, scribe |
| **SEV-4** | Low: minor/cosmetic, informational, or a near-miss with no user or boundary impact. | Cosmetic UI glitch; low-risk dependency advisory; a caught-in-review boundary wording issue **before** merge; a monitoring false positive worth recording. | **Next business day / best effort** | None unless it recurs | Scribe (log only) |

## Classification rules

- **Default up on doubt.** If severity is ambiguous between two levels, choose the higher until triage
  proves otherwise.
- **Boundary and public-website incidents are SEV-1 by definition.** Any live content implying BANZA is a
  PSP/licensed/certified, or any compromise of `banza.network`, is SEV-1 regardless of blast radius —
  because the boundary is an absolute integrity guarantee, not a cosmetic one.
- **Scope gate.** Before assigning severity, confirm the incident is in the **protocol project's** scope
  (repo/website/bundle/CI/DNS/secrets). If the root cause is an **operator's** production system, this
  matrix does not apply; hand off to the operator and record the handoff.
- **Re-grade freely.** Severity is a working classification; the incident lead may raise or lower it as
  facts change, with the scribe recording each change and its reason.

## Escalation and notification flow

```
 report → triage assigns SEV → incident lead owns it
   SEV-1 → notify lead+comms+scribe+owner now; public status if user-visible
   SEV-2 → notify lead+scribe; comms if external exposure
   SEV-3 → notify lead+scribe
   SEV-4 → scribe logs; no escalation unless recurring
```

- **Reporter acknowledgement** follows the disclosure policy in `README.md` (within 48h), independent of
  severity.
- **External communication** is factual and boundary-safe: it never states BANZA is production-ready,
  certified, licensed, externally audited, or a PSP. Negated/descriptive statements are acceptable.

## Response-time targets (summary)

| Severity | Acknowledge | Contain | Post-mortem |
|---|---|---|---|
| SEV-1 | 15 min | 1 h | required, ≤ 5 business days |
| SEV-2 | 1 h | 4 h | required, ≤ 5 business days |
| SEV-3 | 4 h | 1 business day | optional (recommended) |
| SEV-4 | next business day | best effort | not required |

Targets are **best-effort** for this pre-production, small-team project. A staffed on-call rotation that
would firm these targets up is a would-be requirement before production and is tracked in
[`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) (`OPS-ONCALL-001`).

## Related documents

- [`INCIDENT_RESPONSE_PLAN.md`](INCIDENT_RESPONSE_PLAN.md) — lifecycle, roles, evidence.
- [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md) — per-event detection/containment/recovery.
- [`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) — standing operational risks.
- [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md) — drift detection and safe recovery.
