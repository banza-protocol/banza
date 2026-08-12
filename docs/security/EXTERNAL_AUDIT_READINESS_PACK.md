# BANZA — External Audit Readiness Pack (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This document is the cover/index of the **External Audit Readiness Pack** for track 4 (EXTERNAL_AUDIT_READINESS)
of the BX2.4 deep-assurance phase. It describes what an external auditor **would** receive, the boundary
under which the pack is prepared, and how the pack maps to the `EXTERNAL_AUDIT_READINESS` track computed in
Rust by `engines/banza-security-assurance :: validate_deep_assurance`.

## Audit status (read this first)

- `external_audit_not_performed = true` — **no external audit has been performed.**
- `requires_external_audit_before_production_claims = true`.
- This pack is a **pre-audit** package. It prepares for a would-be external audit; it does not report the
  result of one, and no auditor engagement has yet been contracted.
- All artifacts are **internal, TEST-ONLY / pre-production**. There are no production keys, no root-key
  ceremony performed, no production certificate signing, and no external provider/model calls
  (`llm_calls = 0`, `external_model_called = false`).

## What an external auditor would receive

| # | Artifact | File | Purpose |
|---|---|---|---|
| 1 | This cover/index | `EXTERNAL_AUDIT_READINESS_PACK.md` | Orientation, boundary, track mapping |
| 2 | Audit scope | [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md) | In-scope / out-of-scope, objectives, non-objectives |
| 3 | Evidence index | [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) | Every claim/control → its evidence artifact |
| 4 | Control ↔ evidence map | [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md) | Each control → risk mitigated, evidence, owner |
| 5 | Auditor briefing | [`AUDITOR_BRIEFING.md`](AUDITOR_BRIEFING.md) | What BANZA is (open protocol, not a PSP) and the pre-production state |
| 6 | Gaps and open items | [`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md) | Honest list of known gaps before a real audit |

Supporting BX2.0 baseline (shared `docs/security/`): [`RISK_REGISTER.md`](RISK_REGISTER.md),
[`THREAT_MODEL.md`](THREAT_MODEL.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md), and the operational risk register
(`OPERATIONAL_RISK_REGISTER.md`, BX2.3) where present.

## How the pack maps to `validate_deep_assurance`

Readiness is computed **in Rust** (`engines/banza-security-assurance :: validate_deep_assurance`), never in
TypeScript. TypeScript is render-only. The `EXTERNAL_AUDIT_READINESS` track reads three inputs from this
pack:

| Track input | Satisfied by | Field |
|---|---|---|
| Audit evidence index present + every entry linked | [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) | `audit_evidence_index_present`, `all_evidence_linked` |
| Control→evidence map present | [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md) | `control_evidence_map_present` |
| Scope + auditor briefing present, boundary intact | [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md), [`AUDITOR_BRIEFING.md`](AUDITOR_BRIEFING.md) | `audit_scope_present`, `auditor_briefing_present` |

### Deep-assurance states (computed in Rust)

| Status | Meaning for this track |
|---|---|
| `DEEP_ASSURANCE_INVALID` | The pack claims BANZA is a PSP / audited / certified / licensed / production-ready — boundary failure. |
| `DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP` | An unmitigated CRITICAL threat gap (deep threat track). |
| `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` | A trust-model gap (keys/BRL/domain-separation) unresolved. |
| `DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP` | Incident-response track incomplete. |
| `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP` | **This track**: audit evidence index missing/incomplete, or not all evidence linked, or the control→evidence map is absent. |
| `DEEP_ASSURANCE_INCOMPLETE` | A required track input is missing but no hard block applies. |
| `DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` | All tracks complete and boundary intact — **pre-audit, not audited**. |

**Rule for this track:** a missing or incomplete audit evidence index (or a missing control→evidence map)
⇒ `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP`. When the audit-evidence track is complete **and** every
other track (deep threat model, trust model, incident response) is complete and the boundary is intact ⇒
`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW`.

`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` means *the pack is structured for an external auditor to begin
review*. It does **not** mean reviewed, audited, certified, licensed, or production. Every report from the
engine carries `not_production`, `not_a_certificate`, `not_an_approval`, `not_a_licence`, `not_a_psp`,
`does_not_move_funds`, `does_not_create_operator`, `external_audit_not_performed: true`,
`requires_external_audit_before_production_claims: true`, `llm_calls: 0`, `external_model_called: false`,
`test_only: true`.

## Boundary of this pack

- The pack prepares for an audit; it is **not** the audit and **not** its findings.
- The pack does **not** cover operator production systems, real funds, or regulatory authorisation —
  those are out of scope (see [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md)).
- Nothing in this pack certifies, approves, or authorises any operator, activates federation or external
  integration, or moves funds.

## Reading order

1. [`AUDITOR_BRIEFING.md`](AUDITOR_BRIEFING.md) — what BANZA is and is not.
2. [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md) — what the audit would and would not cover.
3. [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) — evidence per claim/control.
4. [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md) — control → risk → evidence → owner.
5. [`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md) — honest gaps before a real audit.

See also the shared boundary docs: [`../governance/BANZA_PROTOCOL_BOUNDARY.md`](../governance/BANZA_PROTOCOL_BOUNDARY.md),
[`../governance/BANZA_REGULATORY_POSITIONING.md`](../governance/BANZA_REGULATORY_POSITIONING.md).
