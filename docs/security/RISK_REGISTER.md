# BANZA — Risk Register (BX2.0)

> **Scope.** Internal security & risk register for the BANZA protocol, its artifacts, the L0–L4 readiness
> tools and the BanzAI Workbench. This is an **internal risk-management document** — it is not an external
> audit, not certification, not a licence, and not a production claim. Severity/assurance are computed in
> Rust (`engines/banza-security-assurance`), never in TypeScript.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa
> transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por
> operadores autorizados que implementam o protocolo.

**Severity scale:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` · `INFO`.
**Status values:** `open` · `mitigated` · `accepted` · `closed`.
A CRITICAL or HIGH risk that is still `open` and unmitigated blocks assurance readiness.

## Register

| risk_id | category | description | impact | prob. | severity | existing controls | evidence | gaps | recommended mitigation | owner | status | level |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-PROTO-001 | protocol design | Ambiguous invariant lets an operator diverge from the spec | correctness drift across operators | LOW | MEDIUM | invariant registry + `make invariant-check`; conformance vectors | invariant guard CI job | none material | keep invariants machine-checked; expand vectors per level | protocol governance | mitigated | L0–L4 |
| R-IDBND-001 | identity/operator boundary | Protocol text mistaken as an operator/PSP claim | regulatory misperception | MEDIUM | HIGH | regulatory-language guard; boundary docs; Assistente boundary answers | `make regulatory-check`; BX1.8A | continuous vigilance on new copy | keep `regulatory-check` in CI; review new public copy | protocol governance | mitigated | all |
| R-REPLAY-001 | replay/idempotency | Duplicate/replayed payment intent accepted | double effect | LOW | HIGH | idempotency validation in L2 (same key → consistent, replay flagged) | banza-l2-readiness tests | operator-side enforcement is out of scope | operators MUST enforce idempotency; L2 checks structure only | operator | mitigated | L2 |
| R-LEDGER-001 | ledger consistency | Ledger postings not zero-sum / not double-entry | balance corruption | LOW | HIGH | L2 ledger check (double-entry, zero-sum, currency, trace link) | banza-l2-readiness tests | production ledger is operator infra | operators run atomic double-entry; L2 checks structure | operator | mitigated | L2 |
| R-TRACE-001 | traceability | Trace tampering / missing correlation across operators | broken reconciliation | LOW | MEDIUM | L2/L3 trace linkage; cross-operator correlation checks | banza-l2/l3 tests | none material | keep trace linkage mandatory in fixtures | protocol governance | mitigated | L2–L4 |
| R-SETTLE-001 | settlement obligation | Incoherent gross/net/fee | wrong beneficiary amount | LOW | MEDIUM | L2/L3 settlement check (`net = gross − fee`, ≥ 0) | banza-l2/l3 tests | none material | keep coherence checks | protocol governance | mitigated | L2–L3 |
| R-FED-001 | federation | Routing to a revoked operator | trust failure | LOW | HIGH | BRL fail-closed (a revoked operator blocks) INV-FEDEVAL-002 | banza-l3/l4 BRL tests | fresh-BRL fetch is operator duty | operators MUST fetch fresh BRL ≤ 6h; engine is fail-closed | operator | mitigated | L3–L4 |
| R-INTEROP-001 | external interoperability | Version/endpoint/envelope mismatch between operators | integration break | LOW | MEDIUM | L4 version negotiation, endpoint contract map, envelope, error mapping | banza-l4-readiness tests | live URL validation is a future phase (gated) | keep URL/integration disabled until explicit phase | protocol governance | mitigated | L4 |
| R-TRUST-001 | trust/key management | Wrong signing-key domain used (root vs cert vs revocation) | trust bypass | LOW | HIGH | domain-separated keys (ADR-038); trust engine form checks | banza-trust; ceremony docs | root ceremony is M2 (pending) | keep domain separation; M2 root ceremony under two-of-three authorization | protocol governance | mitigated | trust |
| R-BRL-001 | BRL/revocation | Stale/forged BRL accepted | revoked op trusted | LOW | HIGH | BRL fail-closed; issuer must be BANZA; revocation-domain key | banza-l3/l4 tests | signature verify is a trust-engine concern | keep fail-closed + signature verification | protocol governance | mitigated | L3–L4 |
| R-EVID-001 | evidence integrity | Evidence Bundle tampered after generation | false evidence | LOW | MEDIUM | SHA-256 canonical hashing (tamper-detect on validate) | banza-evidence-bundle tests | none material | keep hash recompute on validate | protocol governance | mitigated | bundle |
| R-UI-001 | Workbench UI | Public copy implies certification/PSP/production | misperception | LOW | HIGH | forbidden-phrases test; regulatory guard; boundary copy | workbench.test.ts; `make regulatory-check` | new copy needs review | keep guards in CI; review new UI copy | frontend | mitigated | all |
| R-AI-001 | BanzAI assistant boundary | Assistant over-claims authority (certifies/approves) | false authority | LOW | HIGH | refusal intents; CLI forbidden-claim check; boundary answers | banzai-evidence boundary/kb tests | prompt-injection vigilance | keep refusal + deterministic answers; no real provider | frontend | mitigated | all |
| R-SUPPLY-001 | supply chain | Compromised dependency / build tampering | integrity loss | LOW | HIGH | pinned image tags; reproducible bundle; Rust-first engines | infra/banza-network; rust-rule guard | SBOM/signing not yet formalised | add dependency review + SBOM before production | infra | open | infra |
| R-DEPLOY-001 | deployment | Deployment drift (config diverges from repo) | inconsistent prod | LOW | MEDIUM | website-only deploy from fixed commit; rollback image tag | deploy runbook (infra README) | drift detection not automated | add automated drift/health check | infra | open | infra |
| R-DATA-001 | data exposure | Sensitive data leaked via URL/logs/UI | privacy loss | LOW | MEDIUM | no secrets in repo; mock provider; local validation; no external calls | purity/identity guards; `/operators=[]` | log-review process informal | formalise log review; keep no-secrets guard | infra | mitigated | all |
| R-INCID-001 | operational incident | No incident-response baseline | slow response | MEDIUM | MEDIUM | incident baseline in ASSURANCE_READINESS.md | this phase (BX2.0) | roles/rotations not staffed | staff on-call + runbooks before production | infra | open | infra |
| R-REG-001 | regulatory language | Any doc/copy claims BANZA needs a licence / is a PSP | regulatory misperception | LOW | HIGH | regulatory guard; positioning docs | BX1.8A; `make regulatory-check` | none material | keep guard; licence belongs to the operator | protocol governance | mitigated | all |

## Notes

- **Open items** (`R-SUPPLY-001`, `R-DEPLOY-001`, `R-INCID-001`) are the concrete next steps before any
  production claim — none of them is a certification or licence item; they are internal security hygiene.
- Any risk that would require the protocol itself to be licensed is **out of scope by design**: BANZA is
  an open protocol; any licence/authorisation belongs to the operator that provides real financial
  services using the protocol.

See: [`THREAT_MODEL.md`](THREAT_MODEL.md), [`SECURITY_CONTROLS_MATRIX.md`](SECURITY_CONTROLS_MATRIX.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
