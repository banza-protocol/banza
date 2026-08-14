# BANZA — Abuse Cases (BX2.1)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This catalogue enumerates concrete abuse cases against the BANZA protocol, its official Rust/WASM
readiness engines, the Evidence Bundle, the machine routes, and the BanzAI Workbench (including the
Assistente). It is the abuse-case half of the **THREAT_AND_ABUSE** track consumed by
`engines/banza-security-assurance :: validate_deep_assurance`. Each abuse maps to a protocol/engine
control and an explicit residual owner (protocol or operator).

Everything here is **test-only / pre-production**. No real keys, no real certificate signing, no real
external provider, and no external audit are exercised. Where a control depends on a production activity
(root-key ceremony, external audit, live federation) that activity is **PLANNED / would-be-required
before production**, never asserted as done.

**Coverage values:** `covered` (mitigating control implemented + evidenced) · `partial` (control exists
but a residual portion is operator-side or a pre-production open item) · `uncovered`.

> **Critical-gap rule.** Every abuse marked here as a critical path is `covered` or `partial` — **none is
> `uncovered`**. If any critical abuse path were `uncovered`, the THREAT_AND_ABUSE track of
> `validate_deep_assurance` would return **`DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP`**. See
> [`THREAT_COVERAGE_MATRIX.md`](THREAT_COVERAGE_MATRIX.md) for the critical-gap rule in full.

## Abuse catalogue

| abuse_id | actor | abuse | protocol/engine control | residual owner | coverage |
|---|---|---|---|---|---|
| AB-REPLAY-01 | malicious operator | Replays a payment intent with the same idempotency key to double an effect | L2 idempotency check (same key → consistent response, replay flagged) `C-IDEMPOTENCY`; INV-IDEM-* | operator (runtime enforcement) | partial |
| AB-IDEM-02 | malicious operator | Submits diverging bodies under one idempotency key to force inconsistent state | L2 idempotency-scope + trace linkage; INV-IDEM key-scope | operator | partial |
| AB-MANIFEST-03 | malicious operator | Submits a forged operator manifest to look conformant | Operator Manifest Validator (form + sandbox-safety invariant); trust chain at federation `C-TRACE-LINKAGE`/trust engine | protocol/operator | covered |
| AB-SANDBOX-04 | malicious operator | Crafts a manifest that tries to bypass the sandbox-safety invariant (unsafe capability request) | manifest sandbox-safety invariant → INVALID on unsafe capability; L4 profile validation rejects production/live flags | protocol | covered |
| AB-REVOKED-05 | malicious/federating operator | Routes a federation request to a revoked peer | **BRL fail-closed** (INV-FEDEVAL-002) — a revoked operator blocks in L3/L4 `C-BRL-FAIL-CLOSED` | engine (fail-closed) + operator (fresh BRL ≤ 6h) | covered |
| AB-BRL-STALE-06 | malicious operator | Presents a stale BRL to keep trusting an operator that is now revoked | engine treats missing/expired/invalid BRL as blocking; operators MUST fetch BRL ≤ 6h | operator | partial |
| AB-BRL-FORGE-07 | external attacker | Forges/re-signs a BRL to un-revoke a peer | issuer MUST be BANZA; revocation-domain key separation (ADR-027); signature verification is a trust-engine concern (M2 root ceremony PLANNED) | protocol | partial |
| AB-EVIDENCE-08 | malicious operator / insider | Tampers with an Evidence Bundle after generation to fake evidence | SHA-256 canonical hashing; `validate` recomputes and detects tampering `C-EVIDENCE-HASH`; INV-RECON-* | engine | covered |
| AB-QR-09 | end user / merchant / attacker | Reuses a single-use dynamic QR, or replays an expired QR payload | QR payload spec: unique resolution, single-use dynamic, expiry enforcement (INV-QR-*) | operator (runtime resolution store) | partial |
| AB-FEE-10 | malicious operator | Manipulates settlement fee so `net ≠ gross − fee` to skim the beneficiary | L2/L3 settlement coherence `net = gross − fee`, `net ≥ 0`, linked to intent `C-SETTLEMENT`; INV-SETTLE-* | protocol | covered |
| AB-LEDGER-11 | malicious operator | Submits ledger postings that are not zero-sum / not double-entry | L2 ledger check (double-entry, zero-sum, single-currency, trace link) `C-LEDGER-ZEROSUM`; INV-LEDGER-* | operator (atomic double-entry at runtime) | partial |
| AB-FED-SPOOF-12 | malicious operator | Spoofs a federation intent (impersonates another operator / forges routing envelope) | L4 endpoint contract map + envelope/error mapping; trust chain + BRL at federation | protocol/operator | covered |
| AB-WK-CLAIM-13 | UI content author / attacker | Injects a boundary-breaking claim into Workbench copy ("BANZA is licensed/certified/a PSP") | forbidden-phrases test `C-FORBIDDEN-CLAIMS`; `make regulatory-check` `C-REG-GUARD`; boundary docs | frontend/governance | covered |
| AB-AI-INJECT-14 | end user / attacker | Prompt-injects the Assistente to make it certify/approve/claim authority | refusal intents; deterministic answers; CLI forbidden-claim check; **mock provider only** (`llm_calls=0`, no real model) `C-MOCK-PROVIDER`/`C-LLM-ZERO` | frontend | covered |
| AB-SUPPLY-15 | external attacker / insider | Compromises the WASM bundle or a build dependency in the supply chain | pinned image tags; reproducible bundle; Rust-first engines `C-RUST-FIRST`; SBOM + build signing are a **pre-production open item** `C-SBOM` | infra | partial |
| AB-MACHINE-16 | external attacker | Mutates a read-only machine route (`/operators`, `/certificates`, well-known, revocation list) | machine routes read-only; non-GET → 405 `C-MACHINE-RO`/`C-POST-405`; `/operators=[]`, `production_certificates=false` | infra | covered |
| AB-SECRET-17 | insider / attacker | Extracts secrets from repo, logs, or UI | no secrets in repo; mock provider; local validation; no external calls `C-NO-SECRETS`/`C-NO-EXTERNAL-CALLS`; purity/identity guards | infra | partial |

## Critical abuse paths

The following are treated as **critical** for the deep-assurance validator. All are `covered` or
`partial` — none `uncovered`:

- **AB-REVOKED-05** — routing to a revoked peer (fail-closed).
- **AB-EVIDENCE-08** — evidence-bundle tampering (hash tamper-detect).
- **AB-FEE-10** — settlement fee manipulation (coherence identity).
- **AB-SANDBOX-04** — manifest sandbox-safety bypass (invalid on unsafe capability).
- **AB-FED-SPOOF-12** — federation intent spoof (contract + trust chain).
- **AB-WK-CLAIM-13 / AB-AI-INJECT-14** — boundary-claim injection / prompt-injection (guards + refusal).

Because every critical path is `covered`/`partial`, the THREAT_AND_ABUSE track does **not** raise a
critical threat gap. A single `uncovered` critical path would flip the engine result to
`DEEP_ASSURANCE_BLOCKED_BY_CRITICAL_THREAT_GAP`.

## Notes on residual ownership

- **Protocol residual** — the protocol owns the *rule and the structural check* (invariant, contract,
  engine). It does not own runtime enforcement inside an operator's infrastructure.
- **Operator residual** — the authorised operator owns runtime enforcement of idempotency, fresh-BRL
  fetching, QR single-use resolution stores, and atomic double-entry ledger writes.
- Partial-coverage residuals (`AB-BRL-STALE-06`, `AB-BRL-FORGE-07`, `AB-SUPPLY-15`, `AB-SECRET-17`) map to
  the **pre-production open items** already tracked in [`RISK_REGISTER.md`](RISK_REGISTER.md)
  (`R-BRL-001`, `R-TRUST-001`, `R-SUPPLY-001`, `R-DATA-001`) and
  [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md) (`C-SBOM`, `C-EXT-AUDIT`). None is a
  certification or licence item; all are internal hygiene required **before any production claim**.

See: [`ATTACK_SCENARIOS.md`](ATTACK_SCENARIOS.md),
[`THREAT_COVERAGE_MATRIX.md`](THREAT_COVERAGE_MATRIX.md), [`THREAT_MODEL.md`](THREAT_MODEL.md),
[`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md), [`RISK_REGISTER.md`](RISK_REGISTER.md).
