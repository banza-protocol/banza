# BANZA — Security & Risk Assurance Readiness (BX2.0)

> **Security & Risk Assurance é avaliação interna de segurança e risco.** Não é produção, não é auditoria
> externa, não é certificação, não é licença, não cria operador, não activa integração externa, não activa
> federação, não move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa
> transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por
> operadores autorizados que implementam o protocolo.

This document is the entry point for the BX2.0 assurance baseline. The assurance status is computed **in
Rust** by `engines/banza-security-assurance` and surfaced in the BanzAI Workbench (Conformidade →
*Security & Risk Assurance*) and, optionally, inside the Evidence Bundle.

## What assurance evaluates

The engine reads an assurance package — a risk register summary, a threat model summary, a controls
matrix summary, the L0–L4 readiness reports, the Evidence Bundle report, the trust/BRL report and a
regulatory-boundary confirmation — and computes:

- `critical_risks` / `high_risks` — blocking risks (CRITICAL/HIGH, still open and unmitigated);
- `missing_evidence` — required inputs that are absent;
- `control_gaps` — controls flagged `gap`/`partial`/`missing`;
- `readiness_summary` — whether L0–L4 are all ready;
- `regulatory_boundary_summary` — that BANZA is an open protocol, not a PSP.

## Assurance states (computed in Rust)

| Status | Meaning |
|---|---|
| `ASSURANCE_INVALID` | The package claims BANZA is a PSP / needs a licence / is production-ready / certified — boundary failure. |
| `ASSURANCE_BLOCKED_BY_CRITICAL_RISK` | An open, unmitigated CRITICAL risk. |
| `ASSURANCE_BLOCKED_BY_HIGH_RISK` | An open, unmitigated HIGH risk. |
| `ASSURANCE_BLOCKED_BY_MISSING_EVIDENCE` | No Evidence Bundle in the package. |
| `ASSURANCE_INCOMPLETE` | A required input is missing, or L0–L4 are not all ready. |
| `ASSURANCE_READY_FOR_INTERNAL_REVIEW` | Package structured for **internal** review (test-only). |

`ASSURANCE_READY_FOR_INTERNAL_REVIEW` means *ready for an internal review*, not *reviewed*, not *audited*,
not *certified*, not *licensed*, and never *production*. Every report carries `not_production`,
`not_a_certificate`, `not_an_approval`, `not_a_licence`, `not_a_psp`, `does_not_move_funds`,
`does_not_create_operator`, `does_not_make_banza_a_payment_service_provider`,
`requires_external_audit_before_production_claims`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `llm_calls: 0`,
`external_model_called: false`, `test_only: true`.

## Relation to L0–L4 and Evidence Bundle

- **L0** (conformance execution), **L1** (well-known/trust surface), **L2** (payment flow), **L3**
  (federation) and **L4** (external interoperability) are the technical-preparation ladder. Assurance
  reviews their evidence; it does not replace them and does not change their semantics.
- **Evidence Bundle** minimum readiness (SimB + L0) is unchanged; L1/L2/L3/L4 and the security assurance
  report are additional recommended artifacts. The bundle carries the assurance disclaimer.
- **Protocol boundary** — assurance reaffirms `BANZA_PROTOCOL_BOUNDARY.md` /
  `BANZA_REGULATORY_POSITIONING.md`: any licence/authorisation belongs to the authorised operator.

## Incident-response baseline (initial)

1. **Detect** — health checks on the website container + machine routes; report anomalies.
2. **Contain** — website-only deploy can roll back to the tagged previous image (`banza-website:rollback-*`)
   without touching banzai-api / verification-api / reverse-proxy / postgres.
3. **Eradicate** — fix in a branch, run the full guard + test suite, merge via CI.
4. **Recover** — redeploy website-only from the fixed commit; re-run public validation.
5. **Review** — record the incident; update the risk register and controls matrix.

Open items before this is production-grade: on-call staffing, formal log review, drift automation
(`R-INCID-001`, `R-DEPLOY-001`, `C-DRIFT`, `C-INCIDENT`).

## Audit-readiness checklist (internal → external)

- [x] Risk register documented and machine-consumable summary available.
- [x] Threat model documented (actors/assets/threats/trust boundaries/out-of-scope).
- [x] Security controls matrix documented with gaps.
- [x] L0–L4 readiness tools deterministic and Rust-first.
- [x] Evidence Bundle integrity (SHA-256) and disclaimers.
- [x] Regulatory boundary guarded (`make regulatory-check`), positioning docs published.
- [x] No secrets in repo; mock provider; no external calls by default; `/operators=[]`;
      `production_certificates=false`.
- [ ] SBOM + dependency signing (`C-SBOM`).
- [ ] Deployment-drift automation (`C-DRIFT`).
- [ ] Incident on-call staffing + runbooks (`C-INCIDENT`).
- [ ] **Independent external audit** (`C-EXT-AUDIT`) — required before any production claim.

## Next steps before any production claim

1. Close the open internal items (`C-SBOM`, `C-DRIFT`, `C-INCIDENT`).
2. Commission an **independent external audit**.
3. Run a **controlled pilot** with authorised operators under their own regulatory authorisation.
4. Complete milestones **M2/M3** (root-key ceremony, production certification) under governance.

None of these turns BANZA into a payment service provider. BANZA remains an open protocol; the authorised
operators are responsible for real financial services and their licence/authorisation.

See: [`PHASE_BX2_0_SECURITY_RISK_ASSURANCE_2026_07.md`](PHASE_BX2_0_SECURITY_RISK_ASSURANCE_2026_07.md),
[`RISK_REGISTER.md`](RISK_REGISTER.md), [`THREAT_MODEL.md`](THREAT_MODEL.md),
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`../governance/BANZA_PROTOCOL_BOUNDARY.md`](../governance/BANZA_PROTOCOL_BOUNDARY.md).
