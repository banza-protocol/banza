# BANZA — Threat Coverage Matrix (BX2.1)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This matrix maps every abuse/threat id from [`ABUSE_CASES.md`](ABUSE_CASES.md) and the scenarios in
[`ATTACK_SCENARIOS.md`](ATTACK_SCENARIOS.md) to a mitigating control (from
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md)), an evidence artifact (engine / test / CI
job), a coverage status, and a residual owner. It is the coverage view consumed by the **THREAT_AND_ABUSE**
track of `engines/banza-security-assurance :: validate_deep_assurance`.

Everything is **test-only / pre-production**. No real keys, certificate signing, external provider, or
external audit are exercised. Production-only anchors (M2 root ceremony, external audit) are **PLANNED /
would-be-required before production**.

**Coverage values:** `covered` · `partial` · `uncovered`.

## Coverage matrix

| abuse/threat id | mitigating control | evidence artifact (engine / test / CI) | coverage | residual owner |
|---|---|---|---|---|
| AB-REPLAY-01 | `C-IDEMPOTENCY` (INV-IDEM-*) | `banza-l2-readiness` tests | partial | operator |
| AB-IDEM-02 | `C-IDEMPOTENCY` + `C-TRACE-LINKAGE` | `banza-l2-readiness` tests | partial | operator |
| AB-MANIFEST-03 | Operator Manifest Validator (form + sandbox-safety) | manifest-validator + trust engine tests | covered | protocol/operator |
| AB-SANDBOX-04 | manifest sandbox-safety invariant; `C-…` profile validation | `banza-l4-readiness` profile tests | covered | protocol |
| AB-REVOKED-05 | `C-BRL-FAIL-CLOSED` (INV-FEDEVAL-002) | `banza-l3`/`banza-l4` BRL tests | covered | engine + operator |
| AB-BRL-STALE-06 | `C-BRL-FAIL-CLOSED` (expiry/staleness blocks) | `banza-l3`/`banza-l4` tests | partial | operator (fresh BRL ≤ 6h) |
| AB-BRL-FORGE-07 | BRL issuer = BANZA; revocation-domain key (ADR-025) | `banza-trust`; ceremony docs (M2 PLANNED) | partial | protocol |
| AB-EVIDENCE-08 | `C-EVIDENCE-HASH` (SHA-256, INV-RECON-*) | `banza-evidence-bundle` tests | covered | engine |
| AB-QR-09 | QR payload spec (unique/single-use/expiry, INV-QR-*) | QR payload conformance vectors | partial | operator |
| AB-FEE-10 | `C-SETTLEMENT` (`net = gross − fee`, INV-SETTLE-*) | `banza-l2`/`banza-l3` tests | covered | protocol |
| AB-LEDGER-11 | `C-LEDGER-ZEROSUM` (INV-LEDGER-*) | `banza-l2-readiness` tests | partial | operator |
| AB-FED-SPOOF-12 | L4 endpoint contract + envelope; trust chain + BRL | `banza-l4-readiness` tests | covered | protocol/operator |
| AB-WK-CLAIM-13 | `C-FORBIDDEN-CLAIMS` + `C-REG-GUARD` | `workbench.test.ts`; `make regulatory-check` (CI) | covered | frontend/governance |
| AB-AI-INJECT-14 | `C-MOCK-PROVIDER`/`C-LLM-ZERO` + refusal intents | BanzAI boundary/kb tests; CLI forbidden-claim check | covered | frontend |
| AB-SUPPLY-15 | `C-RUST-FIRST` + pinned tags; `C-SBOM` (gap) | `make rust-rule-check`; reproducible bundle | partial | infra |
| AB-MACHINE-16 | `C-MACHINE-RO`/`C-POST-405` | live route checks (POST → 405); `/operators=[]` | covered | infra |
| AB-SECRET-17 | `C-NO-SECRETS`/`C-NO-EXTERNAL-CALLS` | purity/identity guards; E2E network capture | partial | infra |

## Scenario → abuse coverage

| scenario | abuse ids exercised | dominant control | coverage |
|---|---|---|---|
| AS-01 replay | AB-REPLAY-01, AB-IDEM-02 | `C-IDEMPOTENCY` | partial |
| AS-02 forged cert/BRL | AB-BRL-STALE-06, AB-BRL-FORGE-07 | `C-BRL-FAIL-CLOSED` | partial |
| AS-03 MITM well-known | AB-MACHINE-16, AB-FED-SPOOF-12 | `C-MACHINE-RO`/`C-SEC-HEADERS` | covered / partial (CSP) |
| AS-04 insider tamper | AB-EVIDENCE-08, AB-SECRET-17 | `C-EVIDENCE-HASH` | covered |
| AS-05 deploy drift | (deployment-drift risk) | `C-DRIFT` (gap) | partial |
| AS-06 boundary claim | AB-WK-CLAIM-13, AB-AI-INJECT-14 | `C-FORBIDDEN-CLAIMS`/`C-REG-GUARD` | covered |

## Critical-gap rule

The THREAT_AND_ABUSE track designates a subset of abuse ids as **critical**: `AB-REVOKED-05`,
`AB-EVIDENCE-08`, `AB-FEE-10`, `AB-SANDBOX-04`, `AB-FED-SPOOF-12`, `AB-WK-CLAIM-13`, `AB-AI-INJECT-14`.

- **Rule.** Every critical abuse id must be `covered` or `partial`. If any critical id is `uncovered` (no
  mitigating control with a real evidence artifact), the engine returns
  **`DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP`**.
- **Current state.** Every critical id above is `covered` or `partial` — **no `uncovered` critical id** —
  so this track does **not** raise a critical threat gap. This is *not* a production-ready or certified
  claim; it means the abuse/attack catalogue is complete and each critical path has a mitigating control
  with evidence, sufficient for **internal pre-audit review only**.
- **Adjacent blocking states** (for completeness; computed in Rust, never in TypeScript):
  `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP`, `DEEP_ASSURANCE_BLOCKED_BY_INCIDENT_RESPONSE_GAP`,
  `DEEP_ASSURANCE_BLOCKED_BY_AUDIT_EVIDENCE_GAP`, `DEEP_ASSURANCE_INCOMPLETE`, and
  `DEEP_ASSURANCE_INVALID` (raised if any input asserts BANZA is a PSP / licensed / certified /
  production-ready). The success state is `DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW` — *ready for a
  pre-audit internal review*, never *audited*, *certified*, *licensed*, or *production*.

## Open items (pre-production only)

The `partial` residuals track existing open items in [`RISK_REGISTER.md`](RISK_REGISTER.md) and
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md): `C-SBOM`, `C-DRIFT`, `C-INCIDENT`,
`C-EXT-AUDIT`, and CSP-enforce (`C-SEC-HEADERS`), plus the M2 root-key ceremony for full trust anchoring.
None is a certification or licence item; all are internal hygiene required **before any production claim**.

See: [`ABUSE_CASES.md`](ABUSE_CASES.md), [`ATTACK_SCENARIOS.md`](ATTACK_SCENARIOS.md),
[`THREAT_MODEL.md`](THREAT_MODEL.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`RISK_REGISTER.md`](RISK_REGISTER.md), [`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
