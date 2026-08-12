# BANZA / BanzAI — Phase BX2.1–BX2.4: Security Assurance Deepening Pack

**Date:** 2026-07-16
**Branch:** `feat/bx2-1-to-bx2-4-security-assurance-deepening-2026-07`
**Scope:** Deepen the BX2.0 security & risk assurance baseline across four internal tracks —
**THREAT_AND_ABUSE (BX2.1)**, **TRUST_AND_CRYPTO_CEREMONY (BX2.2)**,
**OPERATIONAL_RISK_AND_INCIDENT_RESPONSE (BX2.3)** and **EXTERNAL_AUDIT_READINESS (BX2.4)** — and expose a
new Evidence-Bundle artifact, a new Assistente intent and a Workbench card set. **No L5; no real
integration; the existing `banza-security-assurance` crate is extended, not replaced.**

> **Central rule:** BX2.1–BX2.4 é aprofundamento de assurance. **Não é produção, não é auditoria externa
> concluída, não é certificação, não é licença, não cria operador, não activa integração externa, não
> activa federação, não move fundos e não transforma BANZA em prestador de serviços de pagamento.** BANZA é
> um protocolo aberto; os operadores autorizados prestam os serviços financeiros e a licença/autorização
> pertence ao operador.

## Architecture decision

The existing crate `engines/banza-security-assurance` was **extended** (not a new crate): a
`validate_deep_assurance` function computes the **deep-assurance status IN RUST** over the four tracks plus
a regulatory-boundary confirmation — the open critical/high gaps, the missing documents, the per-track
verdict and the SHA-256 report hash. Local, no network. Reused by `banza-evidence-bundle` (the demo builds
a real deep-assurance report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **`banza-security-assurance`** gains `validate_deep_assurance` (deep status + tracks + open gaps + missing docs + SHA-256 hash, **all in Rust**), `deep_demo_fixtures` (7 fixtures — one per state), `deep_schema`, `deep_tool_version`. 13 new tests (23 total in-crate). |
| Engine (Rust) | `banza-evidence-bundle` accepts `security_deep_assurance` (recommended artifact `security_deep_assurance_report`) + `security_deep_assurance_summary`; demo includes a real deep-assurance report. |
| Engine (Rust) | `banzai-evidence` gains the `deep_assurance` intent (placed before the BX2.0 `security_assurance` intent; deep-specific keywords, no kb.rs collision) + 5 tests. |
| WASM | `banza_security_assurance*` gains `security_deep_assurance_*` exports; `banza_evidence_bundle*` + `banzai_evidence*` rebuilt (siblings kept byte-identical). |
| Adapter (TS) | `website/lib/banzaSecurityAssurance.ts` — deep load+marshal only; `deepAssuranceStatusTone` / `deepTrackTone` render-only. `banzaEvidenceBundle.ts` `BundleInput.security_deep_assurance`. |
| UI | Conformidade → **Deep Assurance · Aprofundamento (BX2.1–BX2.4)** card: 4 track cards (Ameaças & Abuso, Cerimónia de Confiança, Resposta a Incidentes, Prontidão p/ Auditoria), deep fixture selector, "Validar deep assurance", pre-audit/regulatory summaries, gaps, boundary copy. Evidence Bundle → `Deep assurance report (BX2.1–BX2.4)`. |
| Docs | BX2.1: `ABUSE_CASES.md`, `ATTACK_SCENARIOS.md`, `THREAT_COVERAGE_MATRIX.md` (+ `THREAT_MODEL.md` deepening). BX2.2: `TRUST_CEREMONY_PLAN.md`, `KEY_MANAGEMENT_POLICY.md`, `ROOT_KEY_CEREMONY_RUNBOOK.md`, `BRL_REVOCATION_PLAYBOOK.md`, `TRUST_TEST_ONLY_BOUNDARY.md`. BX2.3: `INCIDENT_RESPONSE_PLAN.md`, `OPERATIONAL_RISK_REGISTER.md`, `INCIDENT_SEVERITY_MATRIX.md`, `SECURITY_EVENT_RUNBOOK.md`, `DEPLOYMENT_DRIFT_PLAYBOOK.md`. BX2.4: `EXTERNAL_AUDIT_READINESS_PACK.md`, `AUDIT_SCOPE.md`, `AUDIT_EVIDENCE_INDEX.md`, `CONTROL_EVIDENCE_MAP.md`, `AUDITOR_BRIEFING.md`, `AUDIT_GAPS_AND_OPEN_ITEMS.md` + this phase report. |

### WASM exports (deep)

```
security_deep_assurance_validate_json, security_deep_assurance_demo_fixtures_json,
security_deep_assurance_schema_json, security_deep_assurance_tool_version_json
```

### Deep report envelope

`deep_assurance_status`, `pre_audit_readiness`, `required_tracks`, `required_inputs`, `tracks`
(threat_and_abuse / trust_and_crypto_ceremony / operational_risk_and_incident_response /
external_audit_readiness, each `status` ok/gap/missing + documents + gaps), `open_critical_gaps`,
`open_high_gaps`, `missing_documents`, `regulatory_boundary_summary`, `warnings`, `next_steps`,
`report_id`, `deep_assurance_report_hash`, and the boundary flags: `not_production`, `not_a_certificate`,
`not_an_approval`, `not_a_licence`, `not_a_psp`, `does_not_move_funds`, `does_not_create_operator`,
`does_not_activate_federation`, `does_not_activate_external_integration`,
`does_not_make_banza_a_payment_service_provider`, `requires_external_audit_before_production_claims`,
`external_audit_not_performed`, `production_trust_ceremony_not_executed`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `test_only` (all true),
`llm_calls: 0`, `external_model_called: false`.

### Deep status values (Rust, precedence order)

`DEEP_ASSURANCE_INVALID` (PSP/licence/production/"external audit complete" claim) →
`_BLOCKED_BY_CRITICAL_THREAT_GAP` → `_BLOCKED_BY_TRUST_GAP` → `_BLOCKED_BY_INCIDENT_RESPONSE_GAP` →
`_BLOCKED_BY_AUDIT_EVIDENCE_GAP` → `DEEP_ASSURANCE_INCOMPLETE` (missing track document) →
`DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` (all tracks complete, boundary confirmed).

"Pre-audit" means *prepared for review before an audit* — the external audit was **not** performed and the
production trust ceremony (M2) was **not** executed.

## Boundary / status computed in Rust — never in TypeScript

The deep-assurance status, the four track verdicts, the open gaps, the missing documents and the report
hash are all computed by `validate_deep_assurance` (Rust → WASM). The TypeScript adapter only marshals
JSON and maps a Rust-computed status to a render tone (`deepAssuranceStatusTone` / `deepTrackTone`). The
Assistente `deep_assurance` intent is deterministic (`llm_calls = 0`, `external_model_called = false`) and
cites only real internal routes.

## Pre-production state unchanged

`/operators = []`, `production_certificates = false`, provider mock, `llm_calls = 0`,
`external_model_called = false`. No `.env`/VERSION/DNS/TLS/Cloudflare/Postgres/secret changes; website-only
deploy. BanzAI runs and explains Rust/WASM tools; it never certifies, approves, issues certificates,
creates an operator, moves funds, activates federation or activates integration.

## Checks

`cargo test` (banza-security-assurance 23, banza-evidence-bundle 11, banzai-evidence full suite incl.
`kb`), `npm run test` (vitest), `npm run type-check` (tsc), `make identity-check`, `make regulatory-check`,
`make rust-rule-check` — all green. Browser E2E on `/banzai/workbench`. Adversarial multi-agent review.
