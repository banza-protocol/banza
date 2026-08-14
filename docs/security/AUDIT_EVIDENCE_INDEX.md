# BANZA — Audit Evidence Index (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This is the **`audit_evidence_index`** consumed by the `EXTERNAL_AUDIT_READINESS` track of
`engines/banza-security-assurance :: validate_deep_assurance`. Every claim/control below maps to a concrete
evidence artifact (file path, Rust engine, test, CI job, or machine route). The track requires
`all_evidence_linked = true`: every entry in the `linked` column must read **yes**. A missing or incomplete
index ⇒ `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP`.

All artifacts are internal and **TEST-ONLY / pre-production**. No production key, no signed production
certificate, no external model call, and no external audit are represented here
(`external_audit_not_performed = true`).

## How to read the "how to verify" column

- `make <target>` — a CI/Make guard target run from the repo root.
- `cargo test -p <crate>` — a Rust engine test suite.
- `GET <route>` — a read-only machine route on the public verification surface.
- File paths are repo-relative to `~/banza`.

## Evidence index

| evidence_id | claim / control | artifact | how to verify | linked |
|---|---|---|---|---|
| EV-001 | Official engines are Rust; readiness decided in Rust (C-RUST-FIRST) | `engines/`, ADR-038 | `make rust-rule-check` | yes |
| EV-002 | TypeScript never decides readiness/status (C-NO-TS-READINESS) | adapters (load+marshal+render-only) | `vitest` render-only adapter tests | yes |
| EV-003 | BanzAI uses a mock provider only; `llm_calls = 0` (C-MOCK-PROVIDER, C-LLM-ZERO) | all engine reports | inspect report flags; `cargo test -p banza-security-assurance` | yes |
| EV-004 | No external network calls by default (C-NO-EXTERNAL-CALLS) | local validators; WASM-only | E2E network capture (localhost + WASM only) | yes |
| EV-005 | `/operators = []` — no operator has published conformance evidence (C-OPERATORS-EMPTY) | verification-api machine route | `GET /operators` | yes |
| EV-006 | `production_certificates = false` (C-PROD-CERT-FALSE) | certificates machine route | `GET /certificates` | yes |
| EV-007 | Revoked operator blocks routing — BRL fail-closed (C-BRL-FAIL-CLOSED, INV-FEDEVAL-002) | L3/L4 engines | `cargo test -p banza-l3-readiness`, `-p banza-l4-readiness` | yes |
| EV-008 | Trace/correlation ties intent↔ledger↔settlement (C-TRACE-LINKAGE) | L2/L3 engines | `cargo test -p banza-l2-readiness`, `-p banza-l3-readiness` | yes |
| EV-009 | Idempotency: same key → consistent, replay flagged (C-IDEMPOTENCY) | L2 engine | `cargo test -p banza-l2-readiness` | yes |
| EV-010 | Double-entry + zero-sum ledger (C-LEDGER-ZEROSUM, INV-LEDGER-*) | L2 engine; invariant registry | `cargo test -p banza-l2-readiness`; `make invariant-check` | yes |
| EV-011 | Settlement coherence `net = gross − fee`, ≥ 0 (C-SETTLEMENT, INV-SETTLE-*) | L2/L3 engines | `cargo test -p banza-l2-readiness`, `-p banza-l3-readiness` | yes |
| EV-012 | Evidence Bundle SHA-256 canonical hashing + tamper detect (C-EVIDENCE-HASH, INV-EVID) | evidence-bundle engine | `cargo test -p banza-evidence-bundle` | yes |
| EV-013 | Machine routes read-only; non-GET → 405 (C-MACHINE-RO, C-POST-405) | reverse-proxy | `POST /operators` → 405 (live) | yes |
| EV-014 | Security headers HSTS / X-Frame-Options / CSP (C-SEC-HEADERS; CSP Report-Only) | reverse-proxy config | inspect live response headers | yes |
| EV-015 | No secrets in repo (C-NO-SECRETS) | repo | `make purity-check`, `make identity-check` | yes |
| EV-016 | Regulatory-language guard (C-REG-GUARD, R-REG-001) | public surfaces | `make regulatory-check` | yes |
| EV-017 | No operator-brand contamination (C-IDENTITY-GUARD) | repo | `make identity-check` | yes |
| EV-018 | No non-protocol artifacts (C-PURITY-GUARD) | repo | `make purity-check` | yes |
| EV-019 | Financial invariants machine-checked (C-INVARIANT-GUARD) | invariant registry | `make invariant-check` | yes |
| EV-020 | Workbench forbidden claims blocked (C-FORBIDDEN-CLAIMS, R-UI-001) | Workbench copy | `vitest` FORBIDDEN_PHRASES test | yes |
| EV-021 | No "corpus" / no public "KB" (C-NO-CORPUS-KB) | public UI | `make regulatory-check`; `vitest` | yes |
| EV-022 | BANZA presented as protocol, not PSP (C-PROTOCOL-NOT-PSP) | public copy; Assistente | boundary docs; `make regulatory-check` | yes |
| EV-023 | BanzAI assistant refuses over-claiming authority (R-AI-001) | Assistente boundary intents | `cargo test -p banzai-evidence` boundary/kb tests | yes |
| EV-024 | Domain-separated signing keys (root/cert/revocation) (R-TRUST-001, ADR-025) | trust engine; ceremony docs | `cargo test -p banza-trust`; `ROOT_KEY_CEREMONY_REQUIREMENTS.md` | yes |
| EV-025 | Assurance status computed in Rust (BX2.0) | security-assurance engine | `cargo test -p banza-security-assurance` | yes |
| EV-026 | Deep-assurance status computed in Rust (BX2.4) | `validate_deep_assurance` | `cargo test -p banza-security-assurance` (deep-assurance cases) | yes |
| EV-027 | Reproducible deploy bundle; pinned image tags (R-SUPPLY-001, R-DEPLOY-001) | `infra/banza-network/` | inspect fixed image tags; `infra/banza-network/README.md` | yes |
| EV-028 | Protocol/regulatory boundary documented | `../governance/BANZA_PROTOCOL_BOUNDARY.md`, `../governance/BANZA_REGULATORY_POSITIONING.md` | read boundary docs; `make regulatory-check` | yes |
| EV-029 | Threat model documented (actors/assets/threats/boundaries) | `THREAT_MODEL.md` | read + cross-check controls matrix | yes |
| EV-030 | Risk register documented + machine-consumable summary | `RISK_REGISTER.md` | read; consumed by `validate_assurance` | yes |
| EV-031 | Control ↔ evidence ↔ owner mapping present (control_evidence_map_present) | `CONTROL_EVIDENCE_MAP.md` | read; feeds `EXTERNAL_AUDIT_READINESS` track | yes |
| EV-032 | Audit scope + auditor briefing present | `AUDIT_SCOPE.md`, `AUDITOR_BRIEFING.md` | read; feeds `audit_scope_present`, `auditor_briefing_present` | yes |
| EV-033 | Known gaps disclosed honestly | `AUDIT_GAPS_AND_OPEN_ITEMS.md` | read; cross-check open risks/controls | yes |

## Completeness statement

- Total entries: **33** (≥ 20 required). `all_evidence_linked = true` — every `linked` value is **yes**.
- `audit_evidence_index_present = true`; `control_evidence_map_present = true` (see
  [`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md)).
- No entry above represents a production key, a signed production certificate, an external model call, or a
  completed external audit. All are internal, TEST-ONLY / pre-production.

## Boundary reminder

A fully linked index yields **pre-audit** readiness only. It does not make BANZA production-ready,
certified, licensed, audited, or a PSP, and it does not create an operator or activate federation or
external integration.

See: [`EXTERNAL_AUDIT_READINESS_PACK.md`](EXTERNAL_AUDIT_READINESS_PACK.md),
[`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`RISK_REGISTER.md`](RISK_REGISTER.md), [`THREAT_MODEL.md`](THREAT_MODEL.md).
