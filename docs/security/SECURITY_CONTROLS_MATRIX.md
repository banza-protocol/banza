# BANZA — Security Controls Matrix (BX2.0)

> Internal mapping of existing security controls and gaps for the BANZA protocol and the BanzAI
> Workbench. Not an external audit, not certification, not a production claim. Assurance status is
> computed in Rust (`engines/banza-security-assurance`).
>
> **BANZA é um protocolo aberto.** O BANZA não é PSP, não processa, não liquida e não movimenta fundos.

**Status values:** `ok` (implemented + evidenced) · `partial` · `gap` · `missing`.

| control_id | description | coverage | evidence | gap | recommended next action | status |
|---|---|---|---|---|---|---|
| C-RUST-FIRST | All official engines are Rust; readiness decided in Rust | conformance/simb/trust/L1–L4/assurance engines | ADR-038; `make rust-rule-check` | — | keep the rust-first guard | ok |
| C-NO-TS-READINESS | TypeScript never decides readiness/status | adapters are load+marshal + render-only tone | adapter comments; vitest render-only tests | — | keep adapter discipline | ok |
| C-MOCK-PROVIDER | BanzAI uses a mock provider only | Workbench + Assistente | `llm_calls=0` in every report | — | keep mock until an explicit gated phase | ok |
| C-LLM-ZERO | `llm_calls=0` on every tool output | all engine reports | report flags; E2E | — | keep asserting in tests | ok |
| C-NO-EXTERNAL-CALLS | No external network calls by default | all validators local | network capture in E2E (localhost + WASM only) | — | keep no-network default | ok |
| C-OPERATORS-EMPTY | `/operators = []` (no operator has published conformance evidence) | verification-api machine route | live check | — | changes only at M3 under governance | ok |
| C-PROD-CERT-FALSE | `production_certificates = false` | `/certificates` machine route | live check | — | changes only at M2/M3 | ok |
| C-BRL-FAIL-CLOSED | Revoked operator blocks routing | L3/L4 BRL fail-closed | banza-l3/l4 tests (INV-FEDEVAL-002) | fresh-BRL fetch is operator duty | operators fetch fresh BRL ≤ 6h | ok |
| C-TRACE-LINKAGE | Trace/correlation ties intent↔ledger↔settlement | L2/L3 checks | banza-l2/l3 tests | — | keep mandatory | ok |
| C-IDEMPOTENCY | Same key → consistent response; replay flagged | L2 check | banza-l2-readiness tests | runtime enforcement is operator infra | operators enforce at runtime | ok |
| C-LEDGER-ZEROSUM | Double-entry + zero-sum ledger | L2 check | banza-l2-readiness tests | — | keep mandatory | ok |
| C-SETTLEMENT | `net = gross − fee` coherence | L2/L3 checks | banza-l2/l3 tests | — | keep mandatory | ok |
| C-EVIDENCE-HASH | SHA-256 canonical hashing of Evidence Bundle | evidence-bundle validate recomputes hash | banza-evidence-bundle tests | — | keep tamper-detect | ok |
| C-MACHINE-RO | Machine routes read-only | `/operators`, `/certificates`, well-known | POST → 405 (live) | — | keep read-only | ok |
| C-POST-405 | Non-GET on read surfaces → 405 | reverse-proxy | live check | — | keep | ok |
| C-SEC-HEADERS | HSTS / X-Frame-Options / CSP-Report-Only | reverse-proxy | live headers | CSP is Report-Only (by design during hardening) | move CSP to enforce when stable | partial |
| C-NO-SECRETS | No secrets in repo | repo | purity/identity guards; `.env` untouched | — | keep guard | ok |
| C-REG-GUARD | Regulatory-language guard | public surfaces | `make regulatory-check` | continuous review of new copy | keep in CI | ok |
| C-IDENTITY-GUARD | No operator brand contamination | repo | `make identity-check` (banza-repo-guards) | — | keep in CI | ok |
| C-PURITY-GUARD | No non-protocol artifacts in repo | repo | `make purity-check` | — | keep in CI | ok |
| C-INVARIANT-GUARD | Financial invariants machine-checked | invariant registry | `make invariant-check` | — | keep in CI | ok |
| C-FORBIDDEN-CLAIMS | Workbench forbidden claims blocked | Workbench copy | workbench.test.ts FORBIDDEN_PHRASES | — | keep asserting | ok |
| C-NO-CORPUS-KB | No "corpus" / no public "KB" | public UI | regulatory-check + vitest | — | keep guards | ok |
| C-PROTOCOL-NOT-PSP | BANZA presented as protocol, not PSP | public copy + Assistente | boundary docs; regulatory-check; Assistente answers | — | keep positioning | ok |
| C-SBOM | Dependency SBOM + build signing | — | — | not yet formalised | add SBOM + signing before production | gap |
| C-DRIFT | Automated deployment-drift detection | manual runbook | deploy runbook | not automated | automate drift/health checks | gap |
| C-INCIDENT | Incident-response staffing/rotation | baseline documented | ASSURANCE_READINESS.md | roles not staffed | staff on-call + runbooks before production | gap |
| C-EXT-AUDIT | Independent external audit | — | — | not performed | commission external audit before production claims | gap |

## Summary

- **Strong**: Rust-first decisioning, fail-closed trust/BRL, deterministic evidence hashing, machine-route
  read-only surfaces, and a full guardrail suite (regulatory/identity/purity/invariant/forbidden-claims).
- **Gaps (open, pre-production only)**: SBOM+signing (`C-SBOM`), drift automation (`C-DRIFT`), incident
  staffing (`C-INCIDENT`), external audit (`C-EXT-AUDIT`), and moving CSP from Report-Only to enforce
  (`C-SEC-HEADERS`). None of these is a certification or licence item — they are internal hygiene required
  before any production claim.

See: [`RISK_REGISTER.md`](RISK_REGISTER.md), [`THREAT_MODEL.md`](THREAT_MODEL.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
