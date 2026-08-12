# BANZA — Incident Response Plan (BX2.3)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

## Scope

This plan covers incidents affecting **the protocol project's own assets**:

- the BANZA protocol **repository** (`~/banza` — contracts, conformance vectors, docs, engines);
- the **public website** and machine routes served at **`banza.network`**
  (`/`, `/operators`, `/certificates`, `/.well-known/banza/*`, `/federation/revocation-list.json`,
  `/conformance/evidence`, `/banzai/*`);
- the **deployment bundle** (`infra/banza-network`, fixed image tags) and the origin VM;
- CI/CD, secrets used by the project, and DNS/TLS for `banza.network`.

**Out of scope — explicitly:** any **operator production system**. Operators run real financial services
under their own regulatory authorisation, with their own incident response. A ledger/settlement/fraud
incident inside an operator is that **operator's** responsibility, not the protocol project's. This plan
never claims to respond on an operator's behalf and never moves funds.

Incident status and severity are classified by humans using
[`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md); assurance readiness for this track is
computed **in Rust** by `engines/banza-security-assurance :: validate_deep_assurance`, never in
TypeScript.

## Lifecycle

```
 detect → triage → contain → eradicate → recover → post-mortem
```

| Phase | Goal | Key actions |
|---|---|---|
| **Detect** | Notice the event | Alert/report received (email `security@banza.network`, CI failure, monitoring, external tip), record first-seen timestamp, open an incident record. |
| **Triage** | Classify and assign | Assign severity from [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md), confirm scope is the **protocol project** (not an operator), name the incident lead, start the timeline. |
| **Contain** | Stop the bleeding | Apply the matching runbook in [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md); isolate affected surface (take a page offline, rotate a secret, freeze deploys). Website-only actions never touch operator infra. |
| **Eradicate** | Remove root cause | Revert the offending commit/config, remove leaked secret from history + provider, rebuild from a known-good pinned image tag. |
| **Recover** | Restore verified good state | Redeploy from the git bundle (see [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md)), verify served assets in-container, confirm guards green (`make identity-check`, `make regulatory-check`). |
| **Post-mortem** | Learn | Blameless write-up within 5 business days; feed findings back into [`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) and controls. |

## Roles

| Role | Responsibility |
|---|---|
| **Incident lead** | Owns the incident end-to-end: declares severity, drives phases, decides containment, calls resolution. Single decision-maker at any moment. |
| **Comms** | Owns internal and (if warranted) external communication; drafts a factual status; ensures no message over-claims (never states BANZA is a PSP/certified/licensed). |
| **Scribe** | Maintains the timeline: every action, timestamp, actor, and artifact captured. Produces the evidence set for the post-mortem. |

For small incidents one person may hold multiple roles, but the **incident lead** and **scribe**
responsibilities must both be discharged. Roles are functional, not job titles; the project is small and
pre-production, so on-call is best-effort until staffed (tracked as an open item in
[`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md)).

## Communication

- **Internal:** incident channel + the running timeline maintained by the scribe.
- **Reporter acknowledgement:** within 48h per the disclosure policy in `README.md`.
- **External/public:** only for SEV-1/SEV-2 with user-visible or boundary impact; factual, no speculation,
  reviewed by comms + lead. Public messages must remain boundary-safe.
- **Language discipline:** communication must not assert production-readiness, certification, a completed
  external audit, a licence, or that BANZA is a PSP. Negated/descriptive forms are fine.

## Evidence and record-keeping

Every incident produces:

- an **incident record** (id, severity, scope, lead, timeline start/end);
- the **timeline** (chronological actions with timestamps and actors);
- **artifacts** (offending diff/commit SHA, config snapshot, in-container asset hashes, guard output,
  rotated-secret confirmation with the secret value redacted);
- a **post-mortem** with root cause, corrective actions, and register updates.

These records are the audit-evidence inputs referenced by the audit-evidence track and consumed by the
Rust assurance engine as part of the deep-assurance package.

## Completeness requirement (why a partial plan blocks)

For the incident-response track to contribute to `DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW`, this plan
must be **present AND complete**. "Complete" means it carries, at minimum:

- [x] a lifecycle (detect → … → post-mortem);
- [x] defined roles (incident lead, comms, scribe);
- [x] a **severity matrix** ([`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md));
- [x] **containment** steps per top event type ([`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md));
- [x] an evidence/record-keeping practice.

A plan that is **present but incomplete** — e.g. **missing the severity matrix** or **missing containment**
— causes the Rust engine (`validate_deep_assurance`) to return
**`DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP`**. A structurally invalid package returns
`DEEP_ASSURANCE_INVALID`; other missing inputs return `DEEP_ASSURANCE_INCOMPLETE`.

## Related documents

- [`INCIDENT_SEVERITY_MATRIX.md`](INCIDENT_SEVERITY_MATRIX.md) — SEV-1..SEV-4 classification.
- [`SECURITY_EVENT_RUNBOOK.md`](SECURITY_EVENT_RUNBOOK.md) — concrete containment/recovery per event.
- [`OPERATIONAL_RISK_REGISTER.md`](OPERATIONAL_RISK_REGISTER.md) — standing operational risks.
- [`DEPLOYMENT_DRIFT_PLAYBOOK.md`](DEPLOYMENT_DRIFT_PLAYBOOK.md) — drift detection and safe recovery.
- [`THREAT_MODEL.md`](THREAT_MODEL.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md).
