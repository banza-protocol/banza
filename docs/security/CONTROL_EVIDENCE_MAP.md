# BANZA — Control Evidence Map (BX2.4)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This map links each control in [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md) to **(a)** the
risk it mitigates (in [`RISK_REGISTER.md`](RISK_REGISTER.md), or the operational risk register
`OPERATIONAL_RISK_REGISTER.md` where present, BX2.3), **(b)** its evidence entry in
[`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md), and **(c)** its owner. Its presence sets
`control_evidence_map_present = true`, an input to the `EXTERNAL_AUDIT_READINESS` track of
`engines/banza-security-assurance :: validate_deep_assurance`. A missing map ⇒
`DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP`.

All rows are internal, TEST-ONLY / pre-production. No production key, signed production certificate,
external model call, or external audit is represented (`external_audit_not_performed = true`).

## Map

| control_id | control (short) | mitigates risk | evidence | owner | status |
|---|---|---|---|---|---|
| C-RUST-FIRST | Official engines are Rust; readiness in Rust | R-PROTO-001 | EV-001 | protocol governance | ok |
| C-NO-TS-READINESS | TypeScript never decides readiness/status | R-UI-001 | EV-002 | frontend | ok |
| C-MOCK-PROVIDER | BanzAI uses a mock provider only | R-AI-001, R-DATA-001 | EV-003 | frontend | ok |
| C-LLM-ZERO | `llm_calls = 0` on every report | R-AI-001 | EV-003 | frontend | ok |
| C-NO-EXTERNAL-CALLS | No external network calls by default | R-DATA-001, R-SUPPLY-001 | EV-004 | infra | ok |
| C-OPERATORS-EMPTY | `/operators = []` (no operator has published conformance evidence) | R-IDBND-001, R-FED-001 | EV-005 | protocol governance | ok |
| C-PROD-CERT-FALSE | `production_certificates = false` | R-TRUST-001, R-IDBND-001 | EV-006 | protocol governance | ok |
| C-BRL-FAIL-CLOSED | Revoked operator blocks routing | R-FED-001, R-BRL-001 | EV-007 | engine (fail-closed) | ok |
| C-TRACE-LINKAGE | Trace ties intent↔ledger↔settlement | R-TRACE-001 | EV-008 | protocol governance | ok |
| C-IDEMPOTENCY | Same key → consistent; replay flagged | R-REPLAY-001 | EV-009 | operator (runtime) | ok |
| C-LEDGER-ZEROSUM | Double-entry + zero-sum ledger | R-LEDGER-001 | EV-010 | operator (runtime) | ok |
| C-SETTLEMENT | `net = gross − fee` coherence | R-SETTLE-001 | EV-011 | protocol governance | ok |
| C-EVIDENCE-HASH | SHA-256 canonical hashing of bundle | R-EVID-001 | EV-012 | engine | ok |
| C-MACHINE-RO | Machine routes read-only | R-DATA-001 | EV-013 | infra | ok |
| C-POST-405 | Non-GET on read surfaces → 405 | R-DATA-001 | EV-013 | infra | ok |
| C-SEC-HEADERS | HSTS / X-Frame-Options / CSP-Report-Only | R-DATA-001 | EV-014 | infra | partial |
| C-NO-SECRETS | No secrets in repo | R-DATA-001 | EV-015 | infra | ok |
| C-REG-GUARD | Regulatory-language guard | R-REG-001, R-IDBND-001 | EV-016 | protocol governance | ok |
| C-IDENTITY-GUARD | No operator-brand contamination | R-IDBND-001 | EV-017 | protocol governance | ok |
| C-PURITY-GUARD | No non-protocol artifacts | R-DATA-001 | EV-018 | protocol governance | ok |
| C-INVARIANT-GUARD | Financial invariants machine-checked | R-PROTO-001, R-LEDGER-001 | EV-019 | protocol governance | ok |
| C-FORBIDDEN-CLAIMS | Workbench forbidden claims blocked | R-UI-001 | EV-020 | frontend | ok |
| C-NO-CORPUS-KB | No "corpus" / no public "KB" | R-UI-001, R-REG-001 | EV-021 | frontend | ok |
| C-PROTOCOL-NOT-PSP | BANZA presented as protocol, not PSP | R-REG-001, R-IDBND-001 | EV-022 | protocol governance | ok |
| C-SBOM | Dependency SBOM + build signing | R-SUPPLY-001 | EV-027 | infra | gap |
| C-DRIFT | Automated deployment-drift detection | R-DEPLOY-001 | EV-027 | infra | gap |
| C-INCIDENT | Incident-response staffing/rotation | R-INCID-001 | EV-033 | infra | gap |
| C-EXT-AUDIT | Independent external audit | (cross-cutting; blocks production claim) | EV-033 | protocol governance | gap |

## Trust-model controls (deep-assurance cross-reference)

| control_id | control (short) | mitigates risk | evidence | owner |
|---|---|---|---|---|
| C-KEY-DOMAIN-SEP | Domain-separated keys (root/cert/revocation) | R-TRUST-001 | EV-024 | protocol governance |
| C-BRL-ISSUER | BRL issuer must be BANZA; revocation-domain key | R-BRL-001 | EV-007, EV-024 | protocol governance |

The trust-model controls feed the deep-assurance **trust track**; an unresolved trust gap ⇒
`DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP`. The M2 root-key ceremony is **planned** and has **not** been
performed — see [`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md).

## Ownership legend

- **protocol governance** — owns invariants, contracts, boundary posture, and conformance criteria.
- **engine** — owns deterministic Rust decisioning and fail-closed behaviour.
- **frontend** — owns Workbench copy and render-only adapters (no readiness decisions).
- **infra** — owns deploy, headers, secrets hygiene, drift/incident readiness.
- **operator (runtime)** — the authorised operator enforces idempotency and atomic ledger writes at
  runtime; the protocol checks structure only. Operator-side controls are **out of scope** for this pack
  (see [`AUDIT_SCOPE.md`](AUDIT_SCOPE.md)).

## Coverage note

- Every `ok`/`partial` control above links to an evidence entry (`EV-###`) and an owner.
- `gap` controls (`C-SBOM`, `C-DRIFT`, `C-INCIDENT`, `C-EXT-AUDIT`) are open **pre-production** items,
  disclosed in [`AUDIT_GAPS_AND_OPEN_ITEMS.md`](AUDIT_GAPS_AND_OPEN_ITEMS.md). None is a certification or
  licence item.
- `control_evidence_map_present = true`. This is a pre-audit artifact only; it does not make BANZA
  production-ready, certified, licensed, audited, or a PSP.

See: [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md), [`RISK_REGISTER.md`](RISK_REGISTER.md),
[`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md), [`EXTERNAL_AUDIT_READINESS_PACK.md`](EXTERNAL_AUDIT_READINESS_PACK.md).
