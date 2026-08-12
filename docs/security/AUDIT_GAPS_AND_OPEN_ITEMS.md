# BANZA — Audit Gaps and Open Items (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

Honesty here is a **feature**. This document lists the known gaps and open items **before** a real external
audit, so a would-be auditor sees them stated up front rather than discovering them. No external audit has
been performed (`external_audit_not_performed = true`;
`requires_external_audit_before_production_claims = true`).

## 1. Open items (must close before any production claim)

| id | open item | why it matters | owner | closing milestone | current state |
|---|---|---|---|---|---|
| G-M2-ROOT | M2 root-key ceremony pending | No production root of trust exists; production certificates cannot be issued | protocol governance | M2 (root-key ceremony under dual control) | **planned, not performed**; procedure in `ROOT_KEY_CEREMONY_PROCEDURE.md` |
| G-M3-CERT | M3 production certification pending | `/operators = []`, `production_certificates = false`; no certified operator exists | protocol governance | M3 (production certification under governance) | not started |
| G-EXT-AUDIT | Independent external audit not engaged | Required before any production claim; this pack is pre-audit only (C-EXT-AUDIT) | protocol governance | external audit engagement | **not engaged** |
| G-LIVE-URL | Live URL / external-integration validation gated | L4 live URL and external integration disabled; only structural readiness prepared (R-INTEROP-001) | protocol governance | future gated phase | disabled by design |
| G-FED | Real federation not activated | Federation is structurally prepared, not activated (R-FED-001) | protocol governance | future gated phase | not activated |
| G-SBOM | SBOM + dependency/build signing not formalised | Supply-chain integrity assurance incomplete (C-SBOM, R-SUPPLY-001) | infra | pre-production hardening | gap |
| G-DRIFT | Deployment-drift automation missing | Config drift detected only by manual runbook (C-DRIFT, R-DEPLOY-001) | infra | pre-production hardening | gap |
| G-INCIDENT | Incident-response on-call not staffed | Baseline documented but roles/rotations unstaffed (C-INCIDENT, R-INCID-001) | infra | pre-production hardening | gap |
| G-CSP | CSP still Report-Only | CSP not yet enforcing (C-SEC-HEADERS) | infra | move CSP to enforce when stable | partial |
| G-LOG-REVIEW | Formal log-review process informal | Audit-log review not yet formalised (R-DATA-001) | infra | pre-production hardening | informal |

## 2. Out-of-scope items (not gaps in BANZA — belong elsewhere)

These are **not** BANZA gaps; they are the responsibility of the authorised operator or a regulator, and
are explicitly out of scope for this pack (see [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md)).

| id | item | responsible party |
|---|---|---|
| O-OP-INFRA | Operator production systems (runtime ledger, idempotency enforcement, availability) | authorised operator |
| O-FUNDS | Real funds / money movement / settlement execution | authorised operator |
| O-LICENCE | Regulatory authorisation / licensing | authorised operator (and its regulator) |
| O-KYC | KYC/AML and end-user onboarding controls | authorised operator |
| O-DATA | End-user / merchant production data protection | authorised operator |

## 3. How gaps interact with deep-assurance states

Readiness is computed **in Rust** (`engines/banza-security-assurance :: validate_deep_assurance`). Open
items map to blocking states as follows:

| Open item | If unresolved, contributes to |
|---|---|
| G-EXT-AUDIT, missing/incomplete evidence index or control map | `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP` |
| G-M2-ROOT, trust-model gap | `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` |
| G-INCIDENT (incident-response track incomplete) | `DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP` |
| An unmitigated CRITICAL threat gap (deep threat track) | `DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP` |
| Any doc claiming BANZA is a PSP / audited / certified / licensed / production | `DEEP_ASSURANCE_INVALID` |
| A required track input simply missing (no hard block) | `DEEP_ASSURANCE_INCOMPLETE` |
| All tracks complete + boundary intact | `DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` (pre-audit, not audited) |

Note: the **audit-evidence** track for BX2.4 is satisfied by [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md)
and [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md). Items G-M2-ROOT, G-M3-CERT, G-EXT-AUDIT,
G-LIVE-URL and G-FED are **milestone/phase** items that do **not** block the audit-evidence track's
document completeness, but each remains a hard prerequisite before any production claim.

## 4. What closing these gaps does and does not do

- Closing G-SBOM / G-DRIFT / G-INCIDENT / G-CSP / G-LOG-REVIEW is **internal security hygiene**. It does
  not certify, licence, or make BANZA a PSP.
- Completing G-M2-ROOT / G-M3-CERT proceeds **under governance** and produces a protocol trust root /
  certification decision — still not a licence, and still not a PSP status.
- Engaging G-EXT-AUDIT would produce an **independent external audit**; only after that (plus a controlled
  pilot with authorised operators under their own authorisation) could any production claim be considered.
- None of these steps transfers any regulatory licence to the protocol. BANZA remains an **open protocol**;
  the authorised operator holds any licence/authorisation and is responsible for real financial services.

See: [`EXTERNAL_AUDIT_READINESS_PACK.md`](EXTERNAL_AUDIT_READINESS_PACK.md), [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md),
[`RISK_REGISTER.md`](RISK_REGISTER.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
