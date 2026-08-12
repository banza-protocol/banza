# BANZA / BanzAI — Phase BX2.0: Security and Risk Assurance

**Date:** 2026-07-16
**Branch:** `feat/bx2-0-banzai-security-risk-assurance-2026-07`
**Scope:** The first formal **security & risk assurance** layer for the BANZA protocol and the BanzAI
Workbench, now that the L0→L4 readiness ladder is complete. Evaluate, document, validate and make auditable
the security posture of the protocol, artifacts, tools, trust model, Evidence Bundle and the L0–L4 levels.
**No L5; no real integration.**
**Central rule:** BX2.0 é assurance de segurança e risco. **Não é produção, não é certificação, não é
licença, não cria operador, não activa integração externa, não activa federação, não move fundos e não
transforma BANZA em prestador de serviços de pagamento.** BANZA é um protocolo aberto; os operadores
autorizados prestam os serviços financeiros.

## Architecture decision (Part 5)

**New crate `engines/banza-security-assurance`** (`rlib`+`cdylib`, `wasm` feature; deps serde/serde_json/
sha2 — NO engine deps). It validates the assurance package (risk register / threat model / controls matrix
summaries + L0–L4 reports + Evidence Bundle + trust/BRL + regulatory-boundary confirmation) and computes
the assurance status, the critical/high risk counts, the missing evidence, the control gaps and SHA-256
hashes **entirely in Rust**. Local, no network. Reused by `banza-evidence-bundle` (demo builds a real
assurance report).

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **`banza-security-assurance`** — `validate_assurance` (status + risk/evidence/control accounting + SHA-256 hash, **all in Rust**), `demo_fixtures`, `schema`, `tool_version`. Local, no network. 10 tests. CI job added. |
| Engine (Rust) | `banza-evidence-bundle` accepts `security_assurance` (recommended artifact) + `security_assurance_summary`; demo includes a real assurance report. `banzai-evidence` gains the `security_assurance` intent + `assurance` citation. |
| WASM | `banza_security_assurance*` (only `security_assurance_*` exports); `banza_evidence_bundle*` + `banzai_evidence*` rebuilt. |
| Adapter (TS) | `website/lib/banzaSecurityAssurance.ts` — load+marshal only; `assuranceStatusTone` render-only. |
| UI | Conformidade → **Security & Risk Assurance** section (fixture selector, "Validar assurance", risk/readiness/evidence/regulatory summaries, report, boundary + protocol-stance copy); Evidence Bundle → `Security assurance report`. |
| Docs | `RISK_REGISTER.md`, `THREAT_MODEL.md`, `SECURITY_CONTROLS_MATRIX.md`, `ASSURANCE_READINESS.md` + this phase report (all under `docs/security/`). |

### WASM exports

```
security_assurance_validate_json, security_assurance_demo_fixtures_json,
security_assurance_schema_json, security_assurance_tool_version_json
```

### Report envelope

`status`, `assurance_level`, `required_inputs`, `missing_evidence`, `critical_risks`, `high_risks`,
`control_gaps`, `risk_counts`, `readiness_summary`, `trust_summary`, `evidence_summary`,
`regulatory_boundary_summary`, `warnings`, `next_steps`, `boundary`, `protocol_stance`, `report_id`,
`assurance_report_hash`, and the boundary flags: `not_production`, `not_a_certificate`, `not_an_approval`,
`not_a_licence`, `not_a_psp`, `does_not_move_funds`, `does_not_create_operator`,
`does_not_make_banza_a_payment_service_provider`, `requires_external_audit_before_production_claims`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`, `test_only` (all true),
`llm_calls: 0`, `external_model_called: false`.

### Status values (Rust, precedence order)

`ASSURANCE_INVALID` (PSP/licence/production claim) → `_BLOCKED_BY_CRITICAL_RISK` → `_BLOCKED_BY_HIGH_RISK`
→ `_BLOCKED_BY_MISSING_EVIDENCE` → `ASSURANCE_INCOMPLETE` → `ASSURANCE_READY_FOR_INTERNAL_REVIEW`.

### Fixtures (TEST ONLY — NOT PRODUCTION; no real external audit/certification/production/licence/operator)

`assurance_ready_internal_review` → READY_FOR_INTERNAL_REVIEW · `critical_risk_open` →
BLOCKED_BY_CRITICAL_RISK · `high_risk_missing_mitigation` → BLOCKED_BY_HIGH_RISK ·
`missing_evidence_bundle` → BLOCKED_BY_MISSING_EVIDENCE · `regulatory_boundary_fail` → INVALID.

## Scope / out of scope

- **In scope:** initial threat model, risk register, abuse cases, security controls matrix, trust/key
  risk review, BRL/revocation risk review, Evidence Bundle integrity review, L0–L4 assurance review, data
  exposure review, frontend/workbench safety review, supply-chain review, infra/deployment boundary
  review, incident-response baseline, audit-readiness checklist.
- **Out of scope:** production, real operators, production certificates, regulator approval, real
  federation, real external integration, PSP licensing, external audit (required *before* production).

## Verification (all green)

- Rust: fmt/clippy(-D warnings)/test — security-assurance (10), evidence-bundle (10), banzai-evidence
  (incl. 4 new assurance tests + kb regression). `rust-engine-check` (new crate), `rust-rule-check`,
  `rust-final-closure-check`, `conformance-rs-check`, `simb-rs-check`, `purity-check`, `identity-check`,
  `invariant-check`, `reference-svg-check`, `regulatory-check` ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (84) ✓.
- Sweeps: no "corpus", no public "KB", no "protocolo técnico" as main phrasing, no forbidden
  production/certification/licence/PSP claims — zero.
- Adversarial review (boundary/no-production-audit-licence-PSP · status-in-Rust · no-network): 0 confirmed.
- Live browser E2E: `assurance_ready_internal_review` → ASSURANCE_READY_FOR_INTERNAL_REVIEW;
  `critical_risk_open` → ASSURANCE_BLOCKED_BY_CRITICAL_RISK; Assistente "isto significa que BANZA está
  pronto para produção?" → denial; "BANZA vira PSP com assurance?" → denial; `llm_calls=0`; zero external
  calls; no "corpus".

## Boundary / state preserved

Local validation, no network. `ASSURANCE_READY_FOR_INTERNAL_REVIEW` is an internal-review readiness — not
production, not an external audit, not certification, not a licence; it does not move funds, does not
create an operator, and does not make BANZA a payment service provider. Production requires external audit
+ controlled pilot + authorised operators + M2/M3. `/operators=[]`, `production_certificates=false`,
provider mock, `llm_calls=0`, no M2/M3. Assurance/status computed in Rust, never in TypeScript. Evidence
Bundle minimum readiness (SimB + L0) unchanged; L1/L2/L3/L4 + security assurance are additional layers.

See: [`RISK_REGISTER.md`](RISK_REGISTER.md), [`THREAT_MODEL.md`](THREAT_MODEL.md),
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md), [`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
